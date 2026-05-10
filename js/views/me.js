/**
 * Me view — profile, photos, progress, settings.
 */
(function (global) {

  function root() { return document.getElementById('view-me'); }

  async function render() {
    const profile = await Storage.getProfile();
    const photos = await Storage.getPhotos();
    const logs = await Storage.listLogs();
    const plan = await Storage.getPlan();

    if (!profile) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-me"/></svg></div>
          <div class="empty-title">没有档案</div>
        </div>`;
      return;
    }

    const stats = computeStats(logs, plan);
    const goalLabels = { fat_loss:'减脂', muscle_gain:'增肌', shape:'塑形', maintain:'维持' };
    const venueLabels = { gym:'健身房', home_dumbbell:'家里·哑铃', home_bodyweight:'家里·徒手' };
    const expLabels = { beginner:'新手', intermediate:'有基础', advanced:'高级' };
    const initials = (profile.basics.gender === 'female' ? 'F' : 'M');

    root().innerHTML = `
      <div class="profile-header">
        <div class="avatar">${initials}</div>
        <div class="flex-1">
          <h2 style="margin:0">${goalLabels[profile.goal]} · ${expLabels[profile.experience]}</h2>
          <div class="profile-info-line">
            ${profile.basics.gender==='female'?'女':'男'} · ${profile.basics.age}岁 ·
            ${profile.basics.height}cm · ${profile.basics.weight}kg
          </div>
          <div class="profile-info-line">
            每周 ${profile.daysPerWeek} 天 · ${venueLabels[profile.venue]}
          </div>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-fire"/></svg></div>
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">连续打卡</div>
        </div>
        <div class="stat">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-flash"/></svg></div>
          <div class="stat-value">${stats.totalSessions}</div>
          <div class="stat-label">总训练</div>
        </div>
        <div class="stat">
          <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg></div>
          <div class="stat-value">${stats.thisMonth}</div>
          <div class="stat-label">本月</div>
        </div>
      </div>

      <div class="section-title">本周进度</div>
      <div class="card">
        <div class="progress-text">
          <span class="text-sm">本周完成</span>
          <span class="text-sm fw-600">${stats.weekDone} / ${stats.weekTotal}</span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${stats.weekTotal?stats.weekDone/stats.weekTotal*100:0}%"></div></div>
      </div>

      <div class="section-title">最近 13 周</div>
      ${renderHeatmap(logs)}

      <div class="section-title">体态照片</div>
      ${renderPhotos(photos)}

      <div class="section-title">操作</div>
      <div class="list-item" data-act="edit-profile">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-edit"/></svg></span>
        <span class="label">编辑档案</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="update-photos">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg></span>
        <span class="label">更新体态照片</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="regen-plan">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-refresh"/></svg></span>
        <span class="label">重新生成本周计划</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="export">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-download"/></svg></span>
        <span class="label">导出数据备份</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="import">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-upload"/></svg></span>
        <span class="label">导入备份</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item danger" data-act="clear">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-trash"/></svg></span>
        <span class="label">清除全部数据</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <input type="file" id="import-file" accept="application/json" hidden />

      <div class="text-faint text-xs center mt-24" style="margin-bottom: 16px">
        v0.2 · 数据仅保存在本机浏览器
      </div>
    `;

    bindEvents();
  }

  function renderPhotos(photos) {
    if (!photos || (!photos.front && !photos.side && !photos.back)) {
      return `
        <div class="card center">
          <div class="text-dim text-sm mb-12">还没有体态照片</div>
          <button class="btn btn-sm btn-secondary" data-act="update-photos">现在添加</button>
        </div>`;
    }
    const slot = (key, label) => `
      <div class="photo-slot" data-photo-view="${key}">
        ${photos[key]
          ? `<img src="${photos[key]}" alt="${label}" />`
          : `<span class="photo-slot-add"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg>${label}</span>`}
        <span class="photo-slot-label">${label}</span>
      </div>`;
    return `
      <div class="photo-grid">
        ${slot('front','正面')}
        ${slot('side','侧面')}
        ${slot('back','背面')}
      </div>
      <div class="text-xs text-faint center">点击放大查看</div>
    `;
  }

  function renderHeatmap(logs) {
    // 13 周 × 7 行(周一为第一行)
    const today = new Date(); today.setHours(0,0,0,0);
    const weeks = 13;
    const totalCells = weeks * 7;
    const todayKey = Planner.toDateKey(today);

    // 起始日期 = 13 周前的周一
    const start = Planner.getMonday(new Date(today));
    start.setDate(start.getDate() - (weeks - 1) * 7);

    const cells = [];
    for (let col = 0; col < weeks; col++) {
      for (let row = 0; row < 7; row++) {
        const d = new Date(start);
        d.setDate(start.getDate() + col * 7 + row);
        const key = Planner.toDateKey(d);
        const log = logs[key];
        const isFuture = d > today;
        const isToday = key === todayKey;
        let lv = 0;
        if (log && log.completedAt) {
          const c = (log.completedExercises || []).length;
          if (c >= 5) lv = 3;
          else if (c >= 3) lv = 2;
          else if (c >= 1) lv = 1;
        }
        cells.push({ key, lv, isFuture, isToday });
      }
    }

    // 重新排成 7 行 × 13 列(便于 css grid-auto-flow:column)
    // 我们用 grid-template-columns: 13 列,顺序是按列输入,所以需要按行优先
    // 简单做法:cells 当前是按"列优先",改成行优先
    const grid = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < weeks; col++) {
        grid.push(cells[col * 7 + row]);
      }
    }

    const html = grid.map(c => {
      const cls = ['cell'];
      if (c.lv) cls.push('lv' + c.lv);
      if (c.isFuture) cls.push('future');
      if (c.isToday) cls.push('today');
      return `<div class="${cls.join(' ')}" title="${c.key}"></div>`;
    }).join('');

    return `
      <div class="heatmap">${html}</div>
      <div class="heatmap-legend">
        <span>少</span>
        <div class="cell"></div>
        <div class="cell lv1"></div>
        <div class="cell lv2"></div>
        <div class="cell lv3"></div>
        <span>多</span>
      </div>
    `;
  }

  function computeStats(logs, plan) {
    const today = new Date();
    const weekStart = Planner.getMonday(today);
    const weekKeys = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate()+i);
      weekKeys.push(Planner.toDateKey(d));
    }

    let weekDone = 0;
    let weekTotal = 0;
    if (plan) {
      plan.days.forEach(d => { if (d.type !== 'rest') weekTotal++; });
    }
    weekKeys.forEach(k => {
      const log = logs[k];
      if (log && log.completedAt) weekDone++;
    });

    let streak = 0;
    const cursor = new Date(today);
    for (let i = 0; i < 90; i++) {
      const k = Planner.toDateKey(cursor);
      const dayInPlan = plan ? Planner.getDayByDate(plan, k) : null;
      const log = logs[k];
      if (log && log.completedAt) { streak++; }
      else if (dayInPlan && dayInPlan.type === 'rest') { /* 不打断 */ }
      else if (i === 0) { /* 今天还没完成,不打断 */ }
      else break;
      cursor.setDate(cursor.getDate()-1);
    }

    const totalSessions = Object.values(logs).filter(l => l && l.completedAt).length;
    const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const thisMonth = Object.entries(logs).filter(([k, l]) => k.startsWith(ym) && l.completedAt).length;

    return { weekDone, weekTotal, streak, totalSessions, thisMonth };
  }

  function bindEvents() {
    const handlers = {
      'edit-profile': async () => {
        const profile = await Storage.getProfile();
        App.startOnboarding(true, profile);
      },
      'update-photos': openPhotoUpdater,
      'regen-plan': async () => {
        const ok = await UI.confirmModal({
          title: '重新生成本周计划?',
          text: '会基于当前档案重新选动作。已完成的打卡记录会保留。',
          okLabel: '重新生成',
        });
        if (!ok) return;
        const profile = await Storage.getProfile();
        await Storage.savePlan(Planner.generate(profile));
        UI.toast('计划已更新', { type: 'success', icon: 'i-check' });
        render();
      },
      'export': async () => {
        const json = await Storage.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workout-backup-${Planner.toDateKey(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        UI.toast('备份已下载', { type: 'success', icon: 'i-download' });
      },
      'import': () => document.getElementById('import-file').click(),
      'clear': async () => {
        const ok = await UI.confirmModal({
          title: '清除全部数据?',
          text: '档案、计划、打卡记录、照片会全部删除,无法恢复。建议先导出备份。',
          okLabel: '清除',
          danger: true,
        });
        if (!ok) return;
        await Storage.clearAll();
        location.reload();
      },
    };

    root().querySelectorAll('[data-act]').forEach(el => {
      el.addEventListener('click', () => {
        const act = el.dataset.act;
        if (handlers[act]) handlers[act]();
      });
    });

    document.getElementById('import-file')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const text = await file.text();
      const ok = await UI.confirmModal({
        title: '导入备份?',
        text: '会覆盖当前所有数据。',
        okLabel: '导入',
        danger: true,
      });
      if (!ok) { e.target.value = ''; return; }
      try {
        await Storage.importAll(text);
        location.reload();
      } catch (err) {
        UI.toast('导入失败:' + err.message, { type: 'error' });
      }
    });

    root().querySelectorAll('[data-photo-view]').forEach(el => {
      el.addEventListener('click', async () => {
        const photos = await Storage.getPhotos();
        const src = photos && photos[el.dataset.photoView];
        if (src) showImageModal(src);
      });
    });
  }

  function showImageModal(src) {
    UI.showModal(`
      <div style="text-align:center; max-width:100%">
        <img src="${src}" style="max-width:90vw; max-height:80vh; border-radius:14px"/>
        <div class="mt-16"><button class="btn btn-secondary" data-act="close">关闭</button></div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); }, { once: true });
    });
  }

  function openPhotoUpdater() {
    const labels = { front: '正面', side: '侧面', back: '背面' };
    const updates = {};

    UI.showModal(`
      <div class="modal-box" role="dialog" aria-modal="true">
        <div class="modal-title">更新体态照片</div>
        <div class="modal-text">选择 1-3 张替换。未选择的会保留原图。</div>
        <div class="photo-grid">
          ${['front','side','back'].map(k => `
            <label class="photo-slot">
              <span class="photo-slot-add"><svg viewBox="0 0 24 24"><use href="#i-camera"/></svg>${labels[k]}</span>
              <span class="photo-slot-label">${labels[k]}</span>
              <input type="file" accept="image/*" data-key="${k}" />
            </label>
          `).join('')}
        </div>
        <div class="modal-actions mt-16">
          <button class="btn btn-secondary" data-act="cancel">取消</button>
          <button class="btn btn-primary" data-act="save">保存</button>
        </div>
      </div>
    `, (modal, close) => {
      modal.addEventListener('change', async (e) => {
        const input = e.target.closest('input[type=file][data-key]');
        if (!input || !input.files[0]) return;
        const key = input.dataset.key;
        try {
          updates[key] = await OnboardingView.compressImage(input.files[0], 800, 0.75);
          const slot = input.closest('.photo-slot');
          slot.innerHTML =
            `<img src="${updates[key]}"/>` +
            `<span class="photo-slot-label">${labels[key]}</span>` +
            `<input type="file" accept="image/*" data-key="${key}" />`;
        } catch (err) {
          UI.toast('图片处理失败', { type: 'error' });
        }
      });
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        if (Object.keys(updates).length === 0) {
          close();
          return;
        }
        const cur = (await Storage.getPhotos()) || {};
        await Storage.savePhotos({ ...cur, ...updates });
        close();
        UI.toast('照片已更新', { type: 'success', icon: 'i-check' });
        render();
      });
    });
  }

  global.MeView = { render };
})(window);
