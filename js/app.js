/**
 * App bootstrap + tab router.
 */
(function (global) {
  let currentTab = 'today';

  async function boot() {
    try {
      // 注册 Service Worker(只在生产环境才会真生效)
      registerServiceWorker();
      bindConnectivity();

      // 把自定义动作合并到动作库
      const custom = await Storage.getCustomExercises();
      ExerciseLib.setCustom(custom.items || []);

      const settings = await Storage.getSettings();
      AudioCue.setQuiet(!!settings.quietMode);
      const profile = await Storage.getProfile();

      if (!settings.onboarded || !profile) {
        startOnboarding(false);
      } else {
        await enterMain();
      }

      bindTabs();
      bindStorageWarning();
      checkCapacity();
      maybeShowA2HS();
    } catch (e) {
      console.error('boot failed', e);
      UI.toast('启动出错,请刷新', { type: 'error' });
    } finally {
      hideSplash();
    }
  }

  // 添加到主屏幕(iOS)提示 — 仅在 iOS Safari、未 standalone、未关闭过提示时显示
  async function maybeShowA2HS() {
    const settings = await Storage.getSettings();
    if (settings.a2hsDismissed) return;
    const isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;
    const ua = navigator.userAgent;
    const isIOSSafari = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (!isIOSSafari) return;

    setTimeout(() => {
      const banner = document.createElement('div');
      banner.className = 'a2hs-banner';
      banner.innerHTML = `
        <div class="a2hs-text">
          <strong>添加到主屏幕</strong>
          <div class="text-xs text-dim">点 <span style="display:inline-block;vertical-align:middle">↑</span> 然后选"添加到主屏幕",像 App 一样使用</div>
        </div>
        <button class="btn btn-icon" data-act="dismiss-a2hs"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
      `;
      document.body.appendChild(banner);
      requestAnimationFrame(() => banner.classList.add('show'));
      banner.querySelector('[data-act="dismiss-a2hs"]').addEventListener('click', async () => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 250);
        await Storage.saveSettings({ a2hsDismissed: true });
      });
    }, 4000);
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            UI.toast('新版本已就绪,刷新使用', { type: 'success', icon: 'i-refresh', ttl: 4000 });
          }
        });
      });
    }).catch(e => console.warn('SW register failed:', e));
  }

  function bindConnectivity() {
    const update = () => {
      const online = navigator.onLine;
      document.getElementById('offline-pill')?.classList.toggle('hidden', online);
      if (!online) {
        UI.toast('已离线,AI 功能暂不可用', { type: 'error', ttl: 2500 });
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
  }

  async function showFirstLaunchTip() {
    const settings = await Storage.getSettings();
    if (settings.firstLaunchTipShown) return;
    await Storage.saveSettings({ firstLaunchTipShown: true });
    const fab = document.getElementById('chat-fab');
    if (!fab) return;
    // 加临时光晕 + 提示泡
    fab.classList.add('fab-tip-pulse');
    const tip = document.createElement('div');
    tip.className = 'fab-tip-bubble';
    const coach = (settings.coachName || '教练');
    tip.textContent = `有问题随时问 ${coach},点这里聊一聊`;
    document.body.appendChild(tip);
    requestAnimationFrame(() => tip.classList.add('show'));
    setTimeout(() => {
      tip.classList.remove('show');
      setTimeout(() => tip.remove(), 300);
      fab.classList.remove('fab-tip-pulse');
    }, 5500);
  }

  function hideSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => {
      splash.classList.add('fading');
      setTimeout(() => splash.remove(), 400);
    }, 300);
  }

  function startOnboarding(isEdit, preset, coachPreset) {
    document.getElementById('main-root').classList.add('hidden');
    document.getElementById('tab-bar').classList.add('hidden');
    document.getElementById('chat-fab')?.classList.add('hidden');

    OnboardingView.start(async (profile, photos, coach) => {
      try {
        await Storage.saveProfile(profile);
        if (coach && coach.name) {
          await Storage.saveSettings({ coachName: coach.name, coachTone: coach.tone || 'friendly' });
        }
        const hasAnyPhoto = photos && (photos.front || photos.side || photos.back);
        if (hasAnyPhoto) {
          const cur = (await Storage.getPhotos()) || {};
          await Storage.savePhotos({ ...cur, ...photos });
        }

        const existingPlan = await Storage.getPlan();
        if (isEdit && existingPlan) {
          const ok = await UI.confirmModal({
            title: '档案已更新',
            text: '是否基于新档案重新生成本周计划?',
            okLabel: '重新生成',
            cancelLabel: '保持原计划',
          });
          if (ok) {
            await Storage.savePlan(Planner.generate(profile));
            UI.toast('计划已更新', { type: 'success', icon: 'i-check' });
          }
        } else {
          await Storage.savePlan(Planner.generate(profile));
        }

        await Storage.saveSettings({ onboarded: true });
        await enterMain();
        checkCapacity();
        if (!isEdit) {
          UI.toast('计划已生成,开练吧', { type: 'success', icon: 'i-flash' });
          // 首次进主界面,2 秒后提示 FAB
          setTimeout(() => showFirstLaunchTip(), 2200);
        }
      } catch (e) {
        console.error(e);
        UI.toast('保存出错', { type: 'error' });
      }
    }, { isEdit, preset, coach: coachPreset });
  }

  async function enterMain() {
    document.getElementById('main-root').classList.remove('hidden');
    document.getElementById('tab-bar').classList.remove('hidden');
    document.getElementById('chat-fab')?.classList.remove('hidden');
    await switchTab(currentTab || 'today');
  }

  function bindTabs() {
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    document.getElementById('chat-fab')?.addEventListener('click', () => {
      ChatView.open();
    });
  }

  async function switchTab(name) {
    currentTab = name;
    document.querySelectorAll('.tab[data-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    ['today','plan','me'].forEach(n => {
      const el = document.getElementById('view-' + n);
      el.classList.toggle('hidden', n !== name);
      if (n === name) {
        // 重启进入动画
        el.classList.remove('view-anim');
        void el.offsetWidth;
        el.classList.add('view-anim');
      }
    });
    if (name === 'today') await TodayView.render();
    if (name === 'plan')  await PlanView.render();
    if (name === 'me')    await MeView.render();
    window.scrollTo(0, 0);
  }

  function bindStorageWarning() {
    document.querySelector('[data-action="dismiss-warning"]')?.addEventListener('click', () => {
      document.getElementById('storage-warning').classList.add('hidden');
    });
  }

  function checkCapacity() {
    const info = Storage.capacityInfo();
    if (info.warn) {
      document.getElementById('storage-warning').classList.remove('hidden');
    }
  }

  global.App = { boot, startOnboarding, switchTab, enterMain };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
