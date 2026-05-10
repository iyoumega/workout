/**
 * Me view — profile, photos, weight tracking, achievements, PRs, settings.
 */
(function (global) {

  function root() { return document.getElementById('view-me'); }

  async function render() {
    const profile = await Storage.getProfile();
    const photos = await Storage.getPhotos();
    const logs = await Storage.listLogs();
    const plan = await Storage.getPlan();
    const weights = await Storage.getWeights();
    const settings = await Storage.getSettings();

    if (!profile) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-me"/></svg></div>
          <div class="empty-title">没有档案</div>
        </div>`;
      return;
    }

    const stats = computeStats(logs, plan);
    const ach = Achievements.compute(logs, plan);
    const prs = computePRs(logs);
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
          ${(profile.focusAreas && profile.focusAreas.length) ? `
            <div class="profile-info-line" style="margin-top:6px">
              ${profile.focusAreas.map(id => {
                const g = ExerciseLib.FOCUS_GROUPS.find(x => x.id === id);
                return g ? `<span class="muscle-tag" style="margin-right:4px">${g.label}</span>` : '';
              }).join('')}
            </div>` : ''}
        </div>
        <button class="btn btn-icon" data-act="settings" title="设置">
          <svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-settings"/></svg>
        </button>
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

      <div class="section-title row between" style="align-items:baseline">
        <span>体重追踪</span>
        <button class="btn btn-sm btn-ghost" data-act="add-weight">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-plus"/></svg>记录
        </button>
      </div>
      ${renderWeightCard(weights)}

      <div class="section-title row between" style="align-items:baseline">
        <span>成就</span>
        <span class="text-xs text-dim">${ach.earned.length} / ${ach.all.length}</span>
      </div>
      ${renderAchievements(ach)}

      ${prs.length > 0 ? `
        <div class="section-title">个人最佳</div>
        <div class="card">
          ${prs.slice(0, 5).map(pr => `
            <div class="pr-row">
              <strong>${pr.name}</strong>
              <span class="text-accent fw-600">${pr.weight}kg × ${pr.reps}</span>
            </div>
          `).join('')}
        </div>` : ''}

      <div class="section-title row between" style="align-items:baseline">
        <span>最近 13 周</span>
        <span class="text-xs text-dim">点击查看当天</span>
      </div>
      ${renderHeatmap(logs)}

      <div class="section-title">体态照片</div>
      ${renderPhotos(photos)}

      <div class="section-title">教练</div>
      <div class="list-item" data-act="open-chat">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-chat"/></svg></span>
        <span class="label">和教练聊天</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="open-journal">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-book"/></svg></span>
        <span class="label">本周日记</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>

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
      <div class="list-item" data-act="ai-regen-plan">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-sparkles"/></svg></span>
        <span class="label">用 AI 重新生成计划</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="regen-plan">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-refresh"/></svg></span>
        <span class="label">规则生成计划</span>
        <span class="chev"><svg viewBox="0 0 24 24"><use href="#i-chev"/></svg></span>
      </div>
      <div class="list-item" data-act="custom-exercises">
        <span class="icon"><svg viewBox="0 0 24 24"><use href="#i-plus"/></svg></span>
        <span class="label">自定义动作</span>
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
        v0.3 · 数据仅保存在本机浏览器
      </div>
    `;

    bindEvents();
  }

  function renderWeightCard(weights) {
    const entries = (weights && weights.entries) || [];
    if (entries.length === 0) {
      return `
        <div class="card center">
          <div class="text-dim text-sm mb-12">还没有体重记录</div>
          <button class="btn btn-sm btn-secondary" data-act="add-weight">
            <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-plus"/></svg>添加第一次
          </button>
        </div>`;
    }
    const latest = entries[entries.length - 1];
    const start = entries[0];
    const change = latest.kg - start.kg;
    const changeStr = change === 0 ? '持平' : (change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1));
    const changeColor = change === 0 ? 'var(--text-dim)' : (change < 0 ? 'var(--success)' : 'var(--warning)');
    return `
      <div class="card">
        <div class="card-row">
          <div>
            <div class="text-xl fw-600" style="font-variant-numeric: tabular-nums">${latest.kg.toFixed(1)} <span class="text-sm text-dim">kg</span></div>
            <div class="text-xs text-dim mt-4">最近一次 · ${latest.date}</div>
          </div>
          <div class="text-sm" style="color:${changeColor}; text-align:right">
            ${changeStr} kg
            <div class="text-xs text-faint">较起始</div>
          </div>
        </div>
        ${entries.length >= 2 ? renderWeightChart(entries) : ''}
      </div>`;
  }

  function renderWeightChart(entries) {
    // SVG line chart, 320×80 nominal, scales to width
    const W = 320, H = 80, pad = 6;
    const ks = entries.map(e => e.kg);
    const min = Math.min(...ks), max = Math.max(...ks);
    const range = max - min || 1;
    const xs = entries.map((_, i) => pad + (i / (entries.length - 1)) * (W - 2 * pad));
    const ys = ks.map(k => H - pad - ((k - min) / range) * (H - 2 * pad));
    const path = entries.map((_, i) => (i === 0 ? 'M' : 'L') + xs[i].toFixed(1) + ',' + ys[i].toFixed(1)).join(' ');
    const fill = path + ` L ${xs[xs.length-1].toFixed(1)},${H-pad} L ${xs[0].toFixed(1)},${H-pad} Z`;
    return `
      <div class="weight-chart-wrap mt-12">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="weight-chart">
          <defs>
            <linearGradient id="wg-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#E85D24" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#E85D24" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="${fill}" fill="url(#wg-fill)"/>
          <path d="${path}" fill="none" stroke="#E85D24" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
          ${entries.map((_, i) => `<circle cx="${xs[i].toFixed(1)}" cy="${ys[i].toFixed(1)}" r="2.5" fill="#E85D24"/>`).join('')}
        </svg>
        <div class="row between text-xs text-faint mt-4">
          <span>${entries[0].date}</span>
          <span>${entries[entries.length-1].date}</span>
        </div>
      </div>
    `;
  }

  function renderAchievements(ach) {
    const earnedSet = new Set(ach.earned.map(a => a.id));
    return `
      <div class="achievement-grid">
        ${ach.all.map(a => {
          const earned = earnedSet.has(a.id);
          return `
            <div class="achievement ${earned ? 'unlocked' : 'locked'}">
              <div class="achievement-icon"><svg viewBox="0 0 24 24"><use href="#${a.icon}"/></svg></div>
              <div class="achievement-title">${a.title}</div>
              <div class="achievement-desc">${a.desc}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
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
      <div class="text-xs text-faint center mb-12">点击放大查看</div>
      <div class="row gap mb-12">
        <button class="btn btn-secondary flex-1" data-act="ai-analyze-photos">
          <svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-sparkles"/></svg>
          AI 体态分析
        </button>
        <button class="btn btn-secondary flex-1" data-act="photo-timeline">
          <svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-clock"/></svg>
          历史对比
        </button>
      </div>
    `;
  }

  function renderHeatmap(logs) {
    const today = new Date(); today.setHours(0,0,0,0);
    const weeks = 13;
    const todayKey = Planner.toDateKey(today);
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
        cells.push({ key, lv, isFuture, isToday, hasLog: !!(log && log.completedAt) });
      }
    }

    // 行优先重排
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
      const clickable = !c.isFuture;
      return `<div class="${cls.join(' ')}" ${clickable?`data-day="${c.key}"`:''} title="${c.key}"></div>`;
    }).join('');

    return `
      <div class="heatmap" id="heatmap-grid">${html}</div>
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

    let weekDone = 0, weekTotal = 0;
    if (plan) plan.days.forEach(d => { if (d.type !== 'rest') weekTotal++; });
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
      if (log && log.completedAt) streak++;
      else if (dayInPlan && dayInPlan.type === 'rest') {}
      else if (i === 0) {}
      else break;
      cursor.setDate(cursor.getDate()-1);
    }

    const totalSessions = Object.values(logs).filter(l => l && l.completedAt).length;
    const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const thisMonth = Object.entries(logs).filter(([k, l]) => k.startsWith(ym) && l.completedAt).length;

    return { weekDone, weekTotal, streak, totalSessions, thisMonth };
  }

  function computePRs(logs) {
    // 每个动作的最大单次重量(取出现过的最大 weight × reps,以 weight 为主)
    const byEx = {};
    Object.values(logs).forEach(log => {
      if (!log || !log.completedExercises) return;
      log.completedExercises.forEach(e => {
        (e.sets || []).forEach(s => {
          if (!s.weight || !s.reps) return;
          const cur = byEx[e.id];
          if (!cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps)) {
            byEx[e.id] = { weight: s.weight, reps: s.reps };
          }
        });
      });
    });
    return Object.entries(byEx).map(([id, pr]) => {
      const def = ExerciseLib.findById(id);
      return { id, name: def ? def.nameZh : id, weight: pr.weight, reps: pr.reps };
    }).sort((a, b) => b.weight - a.weight);
  }

  function bindEvents() {
    const handlers = {
      'settings': () => SettingsView.open(),
      'open-chat': () => ChatView.open(),
      'open-journal': () => openJournal(),
      'custom-exercises': () => openCustomExercises(),
      'edit-profile': async () => {
        const profile = await Storage.getProfile();
        const settings = await Storage.getSettings();
        App.startOnboarding(true, profile, { name: settings.coachName, tone: settings.coachTone });
      },
      'update-photos': openPhotoUpdater,
      'add-weight': openWeightAdder,
      'regen-plan': async () => {
        const ok = await UI.confirmModal({
          title: '规则重新生成?',
          text: '基于当前档案、用规则选动作。已完成的打卡记录会保留。',
          okLabel: '重新生成',
        });
        if (!ok) return;
        const profile = await Storage.getProfile();
        await Storage.savePlan(Planner.generate(profile));
        UI.toast('计划已更新', { type: 'success', icon: 'i-check' });
        render();
      },
      'ai-regen-plan': async () => {
        const ok = await UI.confirmModal({
          title: '用 AI 生成新计划?',
          text: 'AI 会根据你的档案、重点部位重新设计,可能需要 5-15 秒。',
          okLabel: '开始生成',
        });
        if (!ok) return;
        const profile = await Storage.getProfile();
        const closeLoading = UI.showLoading('AI 教练设计中...');
        try {
          const newPlan = await AIPlanner.generate(profile);
          await Storage.savePlan(newPlan);
          closeLoading();
          if (newPlan.generatorVersion === 'ai-v1') {
            UI.toast('AI 计划已生成', { type: 'success', icon: 'i-sparkles' });
          } else {
            UI.toast('AI 暂时不可用,已回退到规则计划', { type: 'error', ttl: 3500 });
          }
          render();
        } catch (e) {
          closeLoading();
          UI.toast('生成失败:' + e.message, { type: 'error', ttl: 3500 });
        }
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
      'photo-timeline': () => openPhotoTimeline(),
      'ai-analyze-photos': async () => {
        const profile = await Storage.getProfile();
        const photos = await Storage.getPhotos();
        if (!photos || (!photos.front && !photos.side && !photos.back)) {
          UI.toast('需要先上传体态照片', { type: 'error' });
          return;
        }
        const closeLoading = UI.showLoading('AI 分析中(约 8-15 秒)...');
        try {
          const result = await AIPlanner.analyzePhysique(photos, profile);
          closeLoading();
          UI.showModal(`
            <div class="sheet">
              <div class="sheet-header">
                <h2 style="margin:0">AI 体态分析</h2>
                <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
              </div>
              <div class="sheet-body">
                <div class="ai-result">${result.text.replace(/\n/g, '<br/>')}</div>
                <div class="text-xs text-faint mt-16">基于${({front:'正面',side:'侧面',back:'背面'})[result.photoUsed]}照片 · qwen-vl-max</div>
                <div class="text-xs text-faint mt-8">仅供参考,不构成医学建议。</div>
              </div>
            </div>
          `, (modal, close) => {
            modal.querySelector('[data-act="close"]').addEventListener('click', close);
            modal.addEventListener('click', e => { if (e.target === modal) close(); });
          });
        } catch (e) {
          closeLoading();
          UI.toast('分析失败:' + e.message, { type: 'error', ttl: 3500 });
        }
      },
      'clear': async () => {
        const ok = await UI.confirmModal({
          title: '清除全部数据?',
          text: '档案、计划、打卡记录、照片、体重记录会全部删除,无法恢复。建议先导出备份。',
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

    // 热力图点击 → 打开历史详情
    root().querySelectorAll('#heatmap-grid [data-day]').forEach(el => {
      el.addEventListener('click', () => {
        HistoryView.open(el.dataset.day);
      });
    });
  }

  function openWeightAdder() {
    UI.showModal(`
      <div class="modal-box">
        <div class="modal-title">记录体重</div>
        <div class="modal-text">输入今日体重(kg)</div>
        <div class="num-stepper big">
          <button class="num-btn" data-act="step-down"><svg viewBox="0 0 24 24"><use href="#i-minus"/></svg></button>
          <input id="weight-input" type="number" inputmode="decimal" step="0.1" min="20" max="250" />
          <button class="num-btn" data-act="step-up"><svg viewBox="0 0 24 24"><use href="#i-plus"/></svg></button>
        </div>
        <div class="modal-actions mt-16">
          <button class="btn btn-secondary" data-act="cancel">取消</button>
          <button class="btn btn-primary" data-act="save">保存</button>
        </div>
      </div>
    `, async (modal, close) => {
      const profile = await Storage.getProfile();
      const weights = await Storage.getWeights();
      const last = weights.entries.length ? weights.entries[weights.entries.length-1].kg : profile.basics.weight;
      const input = modal.querySelector('#weight-input');
      input.value = Number(last).toFixed(1);
      setTimeout(() => input.focus(), 50);

      modal.querySelector('[data-act="step-down"]').addEventListener('click', () => {
        input.value = (Number(input.value) - 0.1).toFixed(1);
      });
      modal.querySelector('[data-act="step-up"]').addEventListener('click', () => {
        input.value = (Number(input.value) + 0.1).toFixed(1);
      });
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const kg = Number(input.value);
        if (!(kg > 20 && kg < 250)) {
          UI.toast('请输入合理的体重', { type: 'error' });
          return;
        }
        await Storage.addWeight(kg);
        close();
        UI.toast('体重已记录', { type: 'success', icon: 'i-check' });
        render();
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
        if (Object.keys(updates).length === 0) { close(); return; }
        const cur = (await Storage.getPhotos()) || {};
        await Storage.savePhotos({ ...cur, ...updates });
        close();
        UI.toast('照片已更新', { type: 'success', icon: 'i-check' });
        render();
      });
    });
  }

  // ---------- 周报 ----------
  async function openJournal() {
    const profile = await Storage.getProfile();
    if (!profile) return;
    const weekStart = Planner.toDateKey(Planner.getMonday());
    const cached = await Storage.getJournals();
    const existing = cached.items[weekStart];

    const showJournal = (text, fresh) => {
      UI.showModal(`
        <div class="sheet">
          <div class="sheet-header">
            <h2 style="margin:0">本周日记</h2>
            <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
          </div>
          <div class="sheet-body">
            <div class="text-xs text-faint mb-12">${weekStart} 起 · ${fresh?'刚生成':'已生成'}</div>
            <div class="journal-text">${text.replace(/\n/g, '<br/>')}</div>
            <button class="btn btn-secondary btn-block mt-16" data-act="regen-journal">
              <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-refresh"/></svg>重新生成
            </button>
          </div>
        </div>
      `, (modal, close) => {
        modal.querySelector('[data-act="close"]').addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        modal.querySelector('[data-act="regen-journal"]').addEventListener('click', async () => {
          close();
          await fetchJournal();
        });
      });
    };

    const fetchJournal = async () => {
      const closeLoading = UI.showLoading('AI 教练正在写日记...');
      try {
        const result = await AIPlanner.weeklyJournal(weekStart);
        await Storage.saveJournal(weekStart, result.text);
        closeLoading();
        showJournal(result.text, true);
      } catch (e) {
        closeLoading();
        UI.toast('生成失败:' + e.message, { type: 'error' });
      }
    };

    if (existing) {
      showJournal(existing.text, false);
    } else {
      await fetchJournal();
    }
  }

  // ---------- 自定义动作 ----------
  async function openCustomExercises() {
    const data = await Storage.getCustomExercises();
    const items = data.items || [];

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">自定义动作</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          ${items.length === 0
            ? '<div class="empty"><div class="empty-sub">还没有自定义动作。点下方按钮添加一个。</div></div>'
            : items.map(it => `
              <div class="card">
                <div class="card-row">
                  <div>
                    <div class="fw-600">${escapeHtml(it.nameZh)}</div>
                    <div class="text-xs text-dim">${(it.muscles||[]).join(' · ')}</div>
                  </div>
                  <button class="btn btn-icon" data-del="${it.id}" title="删除">
                    <svg viewBox="0 0 24 24"><use href="#i-trash"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          <button class="btn btn-primary btn-block mt-16" data-act="add">
            <svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-plus"/></svg>
            新建动作
          </button>
        </div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      modal.querySelector('[data-act="add"]').addEventListener('click', () => {
        close();
        openAddCustomExercise();
      });
      modal.querySelectorAll('[data-del]').forEach(b => {
        b.addEventListener('click', async () => {
          const ok = await UI.confirmModal({
            title: '删除动作?',
            text: '已存在的训练记录不受影响,但计划中如使用了此动作将变得不可用。',
            okLabel: '删除', danger: true,
          });
          if (!ok) return;
          await Storage.removeCustomExercise(b.dataset.del);
          const fresh = await Storage.getCustomExercises();
          ExerciseLib.setCustom(fresh.items || []);
          close();
          openCustomExercises();
        });
      });
    });
  }

  function openAddCustomExercise() {
    const muscleOptions = [
      { k: 'chest', l: '胸' }, { k: 'back', l: '背' }, { k: 'shoulders', l: '肩' },
      { k: 'biceps', l: '二头' }, { k: 'triceps', l: '三头' },
      { k: 'quads', l: '股四头' }, { k: 'hamstrings', l: '腘绳' }, { k: 'glutes', l: '臀' },
      { k: 'calves', l: '小腿' }, { k: 'core', l: '核心' },
    ];
    const venueOptions = [
      { k: 'gym', l: '健身房' }, { k: 'home_dumbbell', l: '哑铃' }, { k: 'home_bodyweight', l: '徒手' },
    ];
    const selected = { muscles: new Set(), venues: new Set() };

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">新建动作</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="field">
            <label>动作名 (中文)</label>
            <input id="cx-name" type="text" maxlength="20" placeholder="如 哑铃绕环" />
          </div>
          <div class="field">
            <label>英文名 (可选)</label>
            <input id="cx-name-en" type="text" maxlength="40" placeholder="如 Dumbbell Around the World" />
          </div>
          <div class="field">
            <label>主要肌群</label>
            <div class="chip-grid">
              ${muscleOptions.map(m => `<button class="chip" data-muscle="${m.k}">${m.l}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>适用场地</label>
            <div class="chip-grid" style="grid-template-columns: 1fr 1fr 1fr">
              ${venueOptions.map(v => `<button class="chip" data-venue="${v.k}">${v.l}</button>`).join('')}
            </div>
          </div>
          <div class="field">
            <label>类型</label>
            <div class="seg-control" data-key="compound">
              <button data-value="true" class="active">复合(多关节)</button>
              <button data-value="false">孤立(单关节)</button>
            </div>
          </div>
          <div class="field">
            <label>动作要点(每行一条)</label>
            <textarea id="cx-tips" rows="3" placeholder="如:核心绷紧&#10;动作慢做&#10;呼吸均匀"></textarea>
          </div>
          <div class="modal-actions mt-16">
            <button class="btn btn-secondary" data-act="cancel">取消</button>
            <button class="btn btn-primary" data-act="save">保存</button>
          </div>
        </div>
      </div>
    `, (modal, close) => {
      let isCompound = true;
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelectorAll('[data-muscle]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.muscle;
          if (selected.muscles.has(k)) { selected.muscles.delete(k); btn.classList.remove('selected'); }
          else { selected.muscles.add(k); btn.classList.add('selected'); }
        });
      });
      modal.querySelectorAll('[data-venue]').forEach(btn => {
        btn.addEventListener('click', () => {
          const k = btn.dataset.venue;
          if (selected.venues.has(k)) { selected.venues.delete(k); btn.classList.remove('selected'); }
          else { selected.venues.add(k); btn.classList.add('selected'); }
        });
      });
      modal.querySelectorAll('[data-key="compound"] button').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('[data-key="compound"] button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          isCompound = btn.dataset.value === 'true';
        });
      });
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const name = modal.querySelector('#cx-name').value.trim();
        if (!name) { UI.toast('请填写动作名', { type: 'error' }); return; }
        if (selected.muscles.size === 0) { UI.toast('请选至少一个肌群', { type: 'error' }); return; }
        if (selected.venues.size === 0) { UI.toast('请选至少一个场地', { type: 'error' }); return; }

        const muscleLabels = { chest:'胸',back:'背',shoulders:'肩',biceps:'二头',triceps:'三头',quads:'股四头',hamstrings:'腘绳',glutes:'臀',calves:'小腿',core:'核心' };
        const tips = modal.querySelector('#cx-tips').value.trim().split(/\r?\n/).filter(t => t).slice(0, 5);
        const ex = {
          nameZh: name,
          nameEn: modal.querySelector('#cx-name-en').value.trim() || name,
          muscles: [...selected.muscles].map(k => muscleLabels[k] || k),
          muscleKeys: [...selected.muscles],
          venues: [...selected.venues],
          isCompound,
          weightProfile: null,
          tips: tips.length ? tips : ['(用户自定义动作)'],
          imageUrl: null,
        };
        await Storage.addCustomExercise(ex);
        const fresh = await Storage.getCustomExercises();
        ExerciseLib.setCustom(fresh.items || []);
        UI.toast('动作已添加', { type: 'success', icon: 'i-check' });
        close();
        openCustomExercises();
      });
    });
  }

  function escapeHtml(s) {
    return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  }

  // ---------- 照片时间序列 ----------
  async function openPhotoTimeline() {
    const data = await Storage.getPhotoSessions();
    const sessions = (data.sessions || []).sort((a, b) => b.date.localeCompare(a.date));

    if (sessions.length === 0) {
      UI.toast('还没有归档的体态照片', { type: 'error' });
      return;
    }

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">体态变化</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="text-dim text-sm mb-12">${sessions.length} 组照片 · 最近的在最上面</div>
          ${sessions.map(s => `
            <div class="timeline-session">
              <div class="row between mb-8">
                <strong>${s.date}</strong>
                <button class="btn btn-icon" data-del-session="${s.date}" title="删除这组">
                  <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-trash"/></svg>
                </button>
              </div>
              <div class="timeline-photos">
                ${['front','side','back'].map(k => s[k]
                  ? `<img src="${s[k]}" data-view="${s[k]}" />`
                  : '<div class="timeline-photo-empty"></div>'
                ).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      modal.querySelectorAll('[data-view]').forEach(img => {
        img.addEventListener('click', () => showImageModal(img.dataset.view));
      });
      modal.querySelectorAll('[data-del-session]').forEach(b => {
        b.addEventListener('click', async () => {
          const ok = await UI.confirmModal({
            title: '删除这组照片?',
            text: `${b.dataset.delSession} 那天的体态照片会被删除。`,
            okLabel: '删除', danger: true,
          });
          if (!ok) return;
          await Storage.removePhotoSession(b.dataset.delSession);
          close();
          openPhotoTimeline();
        });
      });
    });
  }

  global.MeView = { render };
})(window);
