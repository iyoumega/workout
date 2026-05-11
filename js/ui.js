/**
 * UI primitives: toast, confirm modal, celebration.
 */
(function (global) {

  // ---------- Toast ----------
  function toast(message, opts = {}) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast ' + (opts.type || 'info');
    el.innerHTML = `
      ${opts.icon ? `<svg class="toast-icon" viewBox="0 0 24 24"><use href="#${opts.icon}"/></svg>` : ''}
      <span>${message}</span>
    `;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    const ttl = opts.ttl || 2200;
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, ttl);
  }

  // ---------- Confirm modal (Promise<boolean>) ----------
  function confirmModal({ title, text, okLabel = '确认', cancelLabel = '取消', danger = false }) {
    return new Promise(resolve => {
      const modal = document.getElementById('modal-root');
      modal.innerHTML = `
        <div class="modal-box" role="dialog" aria-modal="true">
          <div class="modal-title">${title}</div>
          ${text ? `<div class="modal-text">${text}</div>` : ''}
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">${cancelLabel}</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${okLabel}</button>
          </div>
        </div>
      `;
      modal.classList.remove('hidden');
      requestAnimationFrame(() => modal.classList.add('show'));

      const close = (val) => {
        modal.classList.remove('show');
        setTimeout(() => { modal.classList.add('hidden'); modal.innerHTML = ''; }, 200);
        resolve(val);
      };
      modal.querySelector('[data-act="ok"]').addEventListener('click', () => close(true));
      modal.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
      // 点击遮罩关闭 = 取消
      modal.addEventListener('click', e => { if (e.target === modal) close(false); }, { once: true });
    });
  }

  // ---------- Generic modal (custom content) ----------
  function showModal(html, onMount) {
    const modal = document.getElementById('modal-root');
    modal.innerHTML = html;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));
    if (onMount) onMount(modal, () => closeModal());
    return () => closeModal();
  }
  function closeModal() {
    const modal = document.getElementById('modal-root');
    modal.classList.remove('show');
    setTimeout(() => { modal.classList.add('hidden'); modal.innerHTML = ''; }, 200);
  }

  // ---------- Celebration ----------
  function celebrate(subText) {
    const ov = document.getElementById('celebration-overlay');
    const sub = document.getElementById('celebration-sub');
    if (sub) sub.textContent = subText || '';
    ov.classList.remove('hidden');
    requestAnimationFrame(() => ov.classList.add('show'));
    try { if (navigator.vibrate) navigator.vibrate([60, 40, 100]); } catch (e) {}
    // confetti
    spawnConfetti();
    document.getElementById('celebration-close').onclick = () => {
      ov.classList.remove('show');
      setTimeout(() => ov.classList.add('hidden'), 300);
    };
  }

  // 在任意容器内撒纸屑(用于 PR 等小庆祝)
  function spawnConfettiAt(host, count) {
    if (!host) return;
    const colors = ['#E85D24', '#fbbf24', '#4ade80', '#60a5fa', '#ff5b9c', '#a78bfa'];
    const N = count || 20;
    for (let i = 0; i < N; i++) {
      const c = document.createElement('span');
      c.className = 'confetti';
      const size = 5 + Math.random() * 5;
      c.style.width = size + 'px';
      c.style.height = size * 1.6 + 'px';
      c.style.background = colors[i % colors.length];
      c.style.left = (50 + (Math.random() - 0.5) * 40) + '%';
      c.style.animationDelay = (Math.random() * 0.15) + 's';
      c.style.animationDuration = (1.0 + Math.random() * 0.5) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 50) + 'vw');
      c.style.setProperty('--dy', (50 + Math.random() * 30) + 'vh');
      host.appendChild(c);
      setTimeout(() => c.remove(), 1800);
    }
  }

  function spawnConfetti() {
    const ov = document.getElementById('celebration-overlay');
    // 清旧
    ov.querySelectorAll('.confetti').forEach(n => n.remove());
    const colors = ['#E85D24', '#fbbf24', '#4ade80', '#60a5fa', '#f5f5f5'];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const c = document.createElement('span');
      c.className = 'confetti';
      const size = 6 + Math.random() * 6;
      c.style.width = size + 'px';
      c.style.height = size * 1.6 + 'px';
      c.style.background = colors[i % colors.length];
      c.style.left = (50 + (Math.random() - 0.5) * 30) + '%';
      c.style.animationDelay = (Math.random() * 0.2) + 's';
      c.style.animationDuration = (1.4 + Math.random() * 0.8) + 's';
      c.style.transform = `rotate(${Math.random() * 360}deg)`;
      c.style.setProperty('--dx', ((Math.random() - 0.5) * 60) + 'vw');
      c.style.setProperty('--dy', (60 + Math.random() * 30) + 'vh');
      ov.appendChild(c);
      setTimeout(() => c.remove(), 2400);
    }
  }

  // ---------- Loading overlay (独立容器,不与 modal 冲突)----------
  function showLoading(text) {
    const root = document.getElementById('loading-root');
    if (!root) return () => {};
    root.innerHTML = `
      <div class="loading-box">
        <div class="loading-spinner"></div>
        <div class="loading-text">${text || '处理中...'}</div>
      </div>
    `;
    root.classList.remove('hidden');
    requestAnimationFrame(() => root.classList.add('show'));
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      root.classList.remove('show');
      setTimeout(() => {
        if (!closed) return;
        root.classList.add('hidden');
        root.innerHTML = '';
      }, 220);
    };
  }

  // 用教练名格式化 loading 文本(异步,失败 fallback 通用文案)
  async function showLoadingWithCoach(verb) {
    let coachName = '教练';
    try {
      const s = await Storage.getSettings();
      coachName = s.coachName || '教练';
    } catch (e) {}
    return showLoading(`${coachName}${verb || '思考中'}…`);
  }

  // ---------- 成就解锁卡片 ----------
  function unlockAchievement(achievement) {
    if (!achievement) return;
    const root = document.getElementById('app');
    const node = document.createElement('div');
    node.className = 'achievement-pop';
    node.innerHTML = `
      <div class="ap-shine"></div>
      <div class="ap-icon">
        <svg viewBox="0 0 24 24" width="32" height="32"><use href="#${achievement.icon || 'i-trophy'}"/></svg>
      </div>
      <div class="ap-text">
        <div class="ap-tag">新成就解锁</div>
        <div class="ap-title">${achievement.title}</div>
        <div class="ap-desc">${achievement.desc}</div>
      </div>
    `;
    root.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 400);
    }, 3200);
    try { if (navigator.vibrate) navigator.vibrate([60,30,80]); } catch(e){}
    if (typeof AudioCue !== 'undefined') AudioCue.beep(1400, 0.18);
  }

  // ---------- 数字 count-up ----------
  function countUp(el, target, opts) {
    if (!el) return;
    target = Number(target) || 0;
    const dur = (opts && opts.duration) || 800;
    const start = Number(el.dataset.countFrom) || 0;
    const startedAt = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - startedAt) / dur);
      // ease out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const v = Math.round(start + (target - start) * e);
      el.textContent = v;
      if (t < 1) requestAnimationFrame(frame);
      else el.dataset.countFrom = target;
    }
    requestAnimationFrame(frame);
  }
  function applyCountUp(rootEl) {
    const targets = (rootEl || document).querySelectorAll('[data-count-target]');
    targets.forEach(el => {
      const target = Number(el.dataset.countTarget);
      countUp(el, target);
    });
  }

  // ---------- Greeting ----------
  function greeting() {
    const h = new Date().getHours();
    if (h < 5)  return '夜深了';
    if (h < 11) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    if (h < 22) return '晚上好';
    return '晚安';
  }

  global.UI = { toast, confirmModal, showModal, closeModal, celebrate, greeting, showLoading, showLoadingWithCoach, countUp, applyCountUp, spawnConfettiAt, unlockAchievement };
})(window);
