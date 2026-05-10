/**
 * App bootstrap + tab router.
 */
(function (global) {
  let currentTab = 'today';

  async function boot() {
    try {
      const settings = await Storage.getSettings();
      const profile = await Storage.getProfile();

      if (!settings.onboarded || !profile) {
        startOnboarding(false);
      } else {
        await enterMain();
      }

      bindTabs();
      bindStorageWarning();
      checkCapacity();
    } catch (e) {
      console.error('boot failed', e);
      UI.toast('启动出错,请刷新', { type: 'error' });
    } finally {
      hideSplash();
    }
  }

  function hideSplash() {
    const splash = document.getElementById('splash');
    if (!splash) return;
    setTimeout(() => {
      splash.classList.add('fading');
      setTimeout(() => splash.remove(), 400);
    }, 300);
  }

  function startOnboarding(isEdit, preset) {
    document.getElementById('main-root').classList.add('hidden');
    document.getElementById('tab-bar').classList.add('hidden');

    OnboardingView.start(async (profile, photos) => {
      try {
        await Storage.saveProfile(profile);
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
          UI.toast('计划已生成,开练吧!', { type: 'success', icon: 'i-flash' });
        }
      } catch (e) {
        console.error(e);
        UI.toast('保存出错', { type: 'error' });
      }
    }, { isEdit, preset });
  }

  async function enterMain() {
    document.getElementById('main-root').classList.remove('hidden');
    document.getElementById('tab-bar').classList.remove('hidden');
    await switchTab(currentTab || 'today');
  }

  function bindTabs() {
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
      tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
  }

  async function switchTab(name) {
    currentTab = name;
    document.querySelectorAll('.tab[data-tab]').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === name);
    });
    ['today','plan','me'].forEach(n => {
      document.getElementById('view-' + n).classList.toggle('hidden', n !== name);
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
