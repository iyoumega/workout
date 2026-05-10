/**
 * History detail — show one day's workout breakdown.
 * Public:
 *   HistoryView.open(dateKey)
 */
(function (global) {

  async function open(dateKey) {
    const log = await Storage.getLog(dateKey);
    const plan = await Storage.getPlan();
    const dayInPlan = plan ? Planner.getDayByDate(plan, dateKey) : null;

    const date = new Date(dateKey);
    const dows = ['周日','周一','周二','周三','周四','周五','周六'];
    const dateLabel = `${date.getMonth()+1}月${date.getDate()}日 · ${dows[date.getDay()]}`;

    let body = '';
    if (!log || !log.completedAt) {
      body = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg></div>
          <div class="empty-title">这一天没有训练记录</div>
          ${dayInPlan ? `<div class="empty-sub">${dayInPlan.title}</div>` : ''}
        </div>
      `;
    } else {
      const totalSets = (log.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
      const totalReps = (log.completedExercises || []).reduce((s, e) => s + (e.sets || []).reduce((a, b) => a + (b.reps || 0), 0), 0);
      const totalVolume = (log.completedExercises || []).reduce((s, e) => s + (e.sets || []).reduce((a, b) => a + (b.weight ? b.weight * b.reps : 0), 0), 0);
      const dur = log.durationSec || 0;

      const exerciseRows = (log.completedExercises || []).map(e => {
        const def = dayInPlan ? dayInPlan.exercises.find(x => x.id === e.id) : null;
        const name = def ? def.nameZh : (ExerciseLib.findById(e.id)?.nameZh || e.id);
        const sets = e.sets || [];
        if (!sets.length) {
          return `<div class="card"><strong>${name}</strong> <span class="text-dim text-sm">已勾选</span></div>`;
        }
        return `
          <div class="card">
            <div class="card-row"><strong>${name}</strong><span class="text-sm text-dim">${sets.length} 组</span></div>
            <div class="w-history-strip mt-8">
              ${sets.map((s, i) => `
                <div class="w-history-pill">
                  <span class="text-xs text-faint">#${i+1}</span>
                  ${s.weight ? `<strong>${s.weight}kg</strong>` : ''}
                  <span>×${s.reps}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');

      body = `
        ${dayInPlan ? `<div class="text-dim text-sm mb-12">${dayInPlan.title}</div>` : ''}
        <div class="stat-row">
          <div class="stat">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg></div>
            <div class="stat-value">${dur ? formatDur(dur) : '—'}</div>
            <div class="stat-label">用时</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalSets}</div>
            <div class="stat-label">组数</div>
          </div>
          <div class="stat">
            <div class="stat-value">${totalReps}</div>
            <div class="stat-label">次数</div>
          </div>
        </div>
        ${totalVolume > 0 ? `
          <div class="card center">
            <div class="text-xs text-dim">总训练量</div>
            <div class="text-xl text-accent" style="margin-top:4px">${Math.round(totalVolume)} kg</div>
          </div>` : ''}
        <div class="section-title">动作明细</div>
        ${exerciseRows || '<div class="empty"><div class="empty-sub">没有动作明细</div></div>'}
      `;
    }

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">${dateLabel}</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">${body}</div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
    });
  }

  function formatDur(sec) {
    const m = Math.floor(sec / 60); const s = sec % 60;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  global.HistoryView = { open };
})(window);
