/**
 * Plan view — 7-day overview + per-day detail.
 */
(function (global) {
  let openDay = null;

  function root() { return document.getElementById('view-plan'); }

  async function render() {
    const profile = await Storage.getProfile();
    let plan = await Storage.getPlan();
    const logs = await Storage.listLogs();

    if (!plan && profile) {
      plan = Planner.generate(profile);
      await Storage.savePlan(plan);
    }

    if (!plan) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-plan"/></svg></div>
          <div class="empty-title">没有计划</div>
        </div>`;
      return;
    }

    const todayKey = Planner.toDateKey(new Date());
    const dows = ['一','二','三','四','五','六','日'];

    const strip = plan.days.map(d => {
      const isToday = d.date === todayKey;
      const date = new Date(d.date);
      const log = logs[d.date];
      const isDone = !!(log && log.completedAt);
      return `
        <div class="day-pill ${isToday?'today':''} ${isDone?'done':''}" data-day="${d.dayIndex}">
          <div class="dow">周${dows[d.dayIndex]}</div>
          <div class="date">${date.getMonth()+1}/${date.getDate()}</div>
          <div class="type ${d.type==='rest'?'rest':''}">${shortType(d.type)}</div>
          ${isDone ? '<div class="check">✓</div>' : ''}
        </div>
      `;
    }).join('');

    const blocks = plan.days.map(d => renderDayBlock(d, todayKey, logs[d.date])).join('');

    const weekStart = new Date(plan.weekStartDate);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate()+6);
    const rangeLabel = `${weekStart.getMonth()+1}/${weekStart.getDate()} - ${weekEnd.getMonth()+1}/${weekEnd.getDate()}`;

    root().innerHTML = `
      <div class="card-row mb-16">
        <div>
          <h1 style="font-size:22px; margin-bottom:2px">本周计划</h1>
          <div class="text-dim text-sm">${rangeLabel}</div>
        </div>
        <button class="btn btn-icon" id="regen" title="重新生成">
          <svg viewBox="0 0 24 24" width="18" height="18"><use href="#i-refresh"/></svg>
        </button>
      </div>
      <div class="week-strip">${strip}</div>
      ${blocks}
    `;

    bindEvents();
  }

  function shortType(t) {
    return ({push:'推',pull:'拉',legs:'腿',upper:'上',lower:'下',fullbody:'全',rest:'休'})[t] || '';
  }

  function renderDayBlock(d, todayKey, log) {
    const isOpen = openDay === d.dayIndex;
    const isToday = d.date === todayKey;
    const isDone = !!(log && log.completedAt);
    const date = new Date(d.date);
    const dateStr = `${date.getMonth()+1}月${date.getDate()}日`;

    if (d.type === 'rest') {
      return `
        <div class="day-block">
          <div class="day-block-head">
            <div>
              <strong>${dateStr}</strong>
              <span class="text-dim text-sm" style="margin-left:8px">${d.title}</span>
            </div>
            ${isToday?'<span class="today-badge" style="font-size:11px;padding:2px 8px">今天</span>':''}
          </div>
          <div class="text-dim text-sm mt-4">休息日 · 注意恢复和补水</div>
        </div>`;
    }

    const exList = isOpen
      ? d.exercises.map(ex => `
          <div class="day-detail-row">
            <div class="card-row">
              <div>
                <div class="fw-500">${ex.nameZh}</div>
                <div class="text-xs text-dim">${ex.muscles.join(' · ')}</div>
              </div>
              <div class="text-sm" style="color:var(--accent); font-weight:600">${ex.sets}×${ex.reps}</div>
            </div>
          </div>
        `).join('')
      : `<div class="ex-list">${d.exercises.map(e => e.nameZh).join('  ·  ')}</div>`;

    return `
      <div class="day-block" data-block="${d.dayIndex}">
        <div class="day-block-head has-detail" data-expand="${d.dayIndex}">
          <div>
            <strong>${dateStr}</strong>
            <span class="text-dim text-sm" style="margin-left:8px">${d.title}</span>
          </div>
          <div class="row gap">
            <span class="meta">${d.exercises.length} 个</span>
            ${isDone ? '<span style="color:var(--success); font-size:12px;">✓</span>' : ''}
            ${isToday?'<span class="today-badge" style="font-size:11px;padding:2px 8px;margin-top:0">今天</span>':''}
          </div>
        </div>
        ${exList}
      </div>`;
  }

  function bindEvents() {
    root().querySelectorAll('[data-day]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.day);
        openDay = idx;
        render();
        setTimeout(() => {
          const block = root().querySelector(`[data-block="${idx}"]`);
          block?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      });
    });
    root().querySelectorAll('[data-expand]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.dataset.expand);
        openDay = (openDay === idx) ? null : idx;
        render();
      });
    });
    document.getElementById('regen')?.addEventListener('click', async () => {
      const ok = await UI.confirmModal({
        title: '重新生成本周计划?',
        text: '基于当前档案重新选动作,已完成的打卡记录会保留。',
        okLabel: '重新生成',
      });
      if (!ok) return;
      const profile = await Storage.getProfile();
      await Storage.savePlan(Planner.generate(profile));
      UI.toast('计划已更新', { type: 'success', icon: 'i-check' });
      render();
    });
  }

  global.PlanView = { render };
})(window);
