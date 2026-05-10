/**
 * Workout Mode — focused full-screen workout flow.
 *
 * Public:
 *   WorkoutMode.start(day, log, opts) — opts.onFinish(log)
 *
 * Flow:
 *   exercise[i].set[j] -> 完成本组 -> rest timer -> next set -> ... -> next exercise -> ... -> summary
 */
(function (global) {
  let state = null;

  function root() { return document.getElementById('workout-root'); }

  function start(day, existingLog, opts = {}) {
    const log = existingLog ? deepCopy(existingLog) : {
      dayIndex: day.dayIndex,
      completedExercises: [],
      startedAt: new Date().toISOString(),
    };
    if (!log.startedAt) log.startedAt = new Date().toISOString();

    // 找到第一个未完成的动作 + set
    let exIdx = 0, setIdx = 0;
    for (let i = 0; i < day.exercises.length; i++) {
      const ex = day.exercises[i];
      const done = log.completedExercises.find(e => e.id === ex.id);
      const setsDone = done ? (done.sets || []).length : 0;
      if (setsDone < ex.sets) {
        exIdx = i; setIdx = setsDone;
        break;
      }
      if (i === day.exercises.length - 1) {
        // 全部完成,直接到总结
        exIdx = day.exercises.length;
      }
    }

    state = {
      day, log,
      exIdx, setIdx,
      phase: exIdx >= day.exercises.length ? 'summary' : 'set',
      lastWeight: null,    // 上一组重量(便于预填)
      lastReps: null,
      tickerId: null,
      restRemaining: 0,
      restTotal: 0,
      restPaused: false,
      onFinish: opts.onFinish || (() => {}),
    };

    show();
    startDurationTicker();
    render();
  }

  function show() {
    document.getElementById('tab-bar').classList.add('hidden');
    root().classList.remove('hidden');
  }
  function hide() {
    root().classList.add('hidden');
    root().innerHTML = '';
    document.getElementById('tab-bar').classList.remove('hidden');
    if (state && state.tickerId) clearInterval(state.tickerId);
    state = null;
  }

  function startDurationTicker() {
    if (state.tickerId) clearInterval(state.tickerId);
    state.tickerId = setInterval(() => {
      // 更新顶部计时
      const el = document.getElementById('w-duration');
      if (el) el.textContent = formatDuration(durationSec());
      // 更新休息倒计时
      if (state.phase === 'rest' && !state.restPaused) {
        state.restRemaining--;
        const td = document.getElementById('w-rest-display');
        if (td) td.textContent = Math.max(0, state.restRemaining);
        updateRestRing();
        if (state.restRemaining <= 0) {
          finishRest(true);
        }
      }
    }, 1000);
  }

  function durationSec() {
    if (!state || !state.log.startedAt) return 0;
    return Math.floor((Date.now() - new Date(state.log.startedAt).getTime()) / 1000);
  }

  function render() {
    if (!state) return;
    if (state.phase === 'summary') return renderSummary();
    if (state.phase === 'rest')    return renderRest();
    return renderSet();
  }

  // ---------- SET phase ----------
  function renderSet() {
    const { day, exIdx, setIdx, log } = state;
    const ex = day.exercises[exIdx];
    const exDone = log.completedExercises.find(e => e.id === ex.id) || { sets: [] };
    const totalSets = ex.sets;
    const overallTotal = day.exercises.reduce((s, e) => s + e.sets, 0);
    const overallDone = day.exercises.slice(0, exIdx).reduce((s, e) => {
      const d = log.completedExercises.find(x => x.id === e.id);
      return s + (d ? (d.sets || []).length : 0);
    }, 0) + setIdx;
    const overallPct = (overallDone / overallTotal) * 100;

    const lastSet = exDone.sets[exDone.sets.length - 1];
    const prefillWeight = lastSet ? lastSet.weight : (state.lastWeight ?? '');
    const prefillReps = lastSet ? lastSet.reps : (state.lastReps ?? parseRepsLow(ex.reps));

    root().innerHTML = `
      <div class="w-header">
        <button class="btn btn-icon" data-act="quit"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        <div class="w-progress-strip">
          <div class="w-progress-bar" style="width:${overallPct}%"></div>
        </div>
        <div class="w-duration">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-clock"/></svg>
          <span id="w-duration">${formatDuration(durationSec())}</span>
        </div>
      </div>

      <div class="w-body">
        <div class="w-meta-top">
          <span>动作 ${exIdx + 1} / ${day.exercises.length}</span>
          <span>·</span>
          <span>第 <strong>${setIdx + 1}</strong> 组 / ${totalSets}</span>
        </div>
        <div class="w-exercise-name">${ex.nameZh}</div>
        <div class="w-exercise-en">${ex.nameEn}</div>
        <div class="muscle-tags mt-12">
          ${ex.muscles.map(m => `<span class="muscle-tag">${m}</span>`).join('')}
        </div>

        <div class="w-target">
          <div class="w-target-row"><span>目标</span><strong>${ex.reps} 次</strong></div>
          <div class="w-target-row"><span>组间休息</span><strong>${ex.restSec}s</strong></div>
        </div>

        ${exDone.sets.length > 0 ? `
          <div class="w-history-strip">
            ${exDone.sets.map((s, i) => `
              <div class="w-history-pill">
                <span class="text-xs text-faint">#${i+1}</span>
                ${s.weight ? `<strong>${s.weight}kg</strong>` : ''}
                <span>×${s.reps}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="w-set-input">
          <div class="w-set-input-block">
            <label>重量 (kg)</label>
            <div class="num-stepper">
              <button class="num-btn" data-step="weight:-2.5"><svg viewBox="0 0 24 24"><use href="#i-minus"/></svg></button>
              <input id="w-weight" type="number" inputmode="decimal" step="2.5" min="0" value="${prefillWeight}" placeholder="可选" />
              <button class="num-btn" data-step="weight:+2.5"><svg viewBox="0 0 24 24"><use href="#i-plus"/></svg></button>
            </div>
          </div>
          <div class="w-set-input-block">
            <label>次数</label>
            <div class="num-stepper">
              <button class="num-btn" data-step="reps:-1"><svg viewBox="0 0 24 24"><use href="#i-minus"/></svg></button>
              <input id="w-reps" type="number" inputmode="numeric" step="1" min="0" value="${prefillReps}" />
              <button class="num-btn" data-step="reps:+1"><svg viewBox="0 0 24 24"><use href="#i-plus"/></svg></button>
            </div>
          </div>
        </div>

        <div class="exercise-tips mt-16">
          <ul>${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>

      <div class="w-actions">
        <button class="btn btn-secondary" data-act="skip-ex">跳过此动作</button>
        <button class="btn btn-primary flex-1" data-act="finish-set">
          <svg viewBox="0 0 24 24"><use href="#i-check"/></svg>
          完成本组
        </button>
      </div>
    `;

    bindSetEvents();
  }

  function bindSetEvents() {
    root().querySelector('[data-act="quit"]').addEventListener('click', confirmQuit);
    root().querySelector('[data-act="skip-ex"]').addEventListener('click', skipExercise);
    root().querySelector('[data-act="finish-set"]').addEventListener('click', finishSet);
    root().querySelectorAll('[data-step]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [field, delta] = btn.dataset.step.split(':');
        const input = document.getElementById('w-' + field);
        const cur = Number(input.value) || 0;
        const next = Math.max(0, cur + Number(delta));
        input.value = field === 'weight' ? next : Math.round(next);
      });
    });
  }

  async function finishSet() {
    const weight = Number(document.getElementById('w-weight').value) || null;
    const reps = Math.max(1, Math.round(Number(document.getElementById('w-reps').value) || 0));
    const ex = state.day.exercises[state.exIdx];

    let exLog = state.log.completedExercises.find(e => e.id === ex.id);
    if (!exLog) {
      exLog = { id: ex.id, done: false, sets: [] };
      state.log.completedExercises.push(exLog);
    }
    exLog.sets.push({ reps, weight, at: new Date().toISOString() });
    state.lastWeight = weight;
    state.lastReps = reps;

    if (exLog.sets.length >= ex.sets) {
      exLog.done = true;
    }
    await Storage.saveLog(state.day.date, state.log);

    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}

    // 下一组 / 下一动作 / 总结
    state.setIdx++;
    if (state.setIdx >= ex.sets) {
      // 进入下一动作
      state.exIdx++;
      state.setIdx = 0;
      state.lastWeight = null;
      state.lastReps = null;
      if (state.exIdx >= state.day.exercises.length) {
        // 完成全部
        return await goToSummary();
      }
      // 跳过组间休息?短动作过渡
      enterRest(60);
    } else {
      enterRest(ex.restSec);
    }
  }

  function skipExercise() {
    UI.confirmModal({
      title: '跳过此动作?',
      text: '已记录的组保留。可以稍后回到普通页面手动补做。',
      okLabel: '跳过',
    }).then(ok => {
      if (!ok) return;
      state.exIdx++;
      state.setIdx = 0;
      state.lastWeight = null;
      state.lastReps = null;
      if (state.exIdx >= state.day.exercises.length) {
        goToSummary();
      } else {
        render();
      }
    });
  }

  // ---------- REST phase ----------
  function enterRest(sec) {
    state.phase = 'rest';
    state.restTotal = sec;
    state.restRemaining = sec;
    state.restPaused = false;
    render();
  }

  function renderRest() {
    const ex = state.day.exercises[state.exIdx];
    const nextLabel = state.setIdx === 0 ? `下个动作:${ex.nameZh}` : `下一组 · ${state.setIdx + 1}/${ex.sets}`;
    root().innerHTML = `
      <div class="w-header">
        <button class="btn btn-icon" data-act="quit"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        <div class="w-progress-strip"><div class="w-progress-bar" style="width:${calcOverallPct()}%"></div></div>
        <div class="w-duration">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-clock"/></svg>
          <span id="w-duration">${formatDuration(durationSec())}</span>
        </div>
      </div>
      <div class="w-rest-body">
        <div class="text-dim text-sm" style="letter-spacing:6px">休息中</div>
        <div class="timer-ring-wrap" style="margin: 28px auto;">
          <svg class="timer-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"/>
            <circle id="w-rest-ring" cx="60" cy="60" r="54" fill="none"
              stroke="#E85D24" stroke-width="6" stroke-linecap="round"
              stroke-dasharray="339.292" stroke-dashoffset="0"
              transform="rotate(-90 60 60)"/>
          </svg>
          <div id="w-rest-display" class="timer-display">${state.restRemaining}</div>
        </div>
        <div class="text-dim text-sm">${nextLabel}</div>
        <div class="w-rest-actions mt-24">
          <button class="btn btn-secondary" data-act="rest-pause">${state.restPaused?'继续':'暂停'}</button>
          <button class="btn btn-secondary" data-act="rest-add">+15s</button>
          <button class="btn btn-primary" data-act="rest-skip">
            <svg viewBox="0 0 24 24"><use href="#i-arrow-r"/></svg>
            开始下一组
          </button>
        </div>
      </div>
    `;
    updateRestRing();
    bindRestEvents();
  }

  function bindRestEvents() {
    root().querySelector('[data-act="quit"]').addEventListener('click', confirmQuit);
    root().querySelector('[data-act="rest-pause"]').addEventListener('click', () => {
      state.restPaused = !state.restPaused;
      const btn = root().querySelector('[data-act="rest-pause"]');
      btn.textContent = state.restPaused ? '继续' : '暂停';
    });
    root().querySelector('[data-act="rest-add"]').addEventListener('click', () => {
      state.restRemaining += 15;
      state.restTotal += 15;
      const td = document.getElementById('w-rest-display');
      if (td) td.textContent = state.restRemaining;
      updateRestRing();
    });
    root().querySelector('[data-act="rest-skip"]').addEventListener('click', () => finishRest(false));
  }

  function updateRestRing() {
    const ring = document.getElementById('w-rest-ring');
    if (!ring) return;
    const C = 2 * Math.PI * 54;
    const ratio = state.restTotal > 0 ? Math.max(0, state.restRemaining / state.restTotal) : 0;
    ring.style.strokeDashoffset = (C * (1 - ratio)).toString();
  }

  function finishRest(natural) {
    if (natural) {
      try {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        beep();
      } catch (e) {}
    }
    state.phase = 'set';
    render();
  }

  function calcOverallPct() {
    const overallTotal = state.day.exercises.reduce((s, e) => s + e.sets, 0);
    const overallDone = state.day.exercises.slice(0, state.exIdx).reduce((s, e) => {
      const d = state.log.completedExercises.find(x => x.id === e.id);
      return s + (d ? (d.sets || []).length : 0);
    }, 0) + state.setIdx;
    return (overallDone / overallTotal) * 100;
  }

  // ---------- SUMMARY ----------
  async function goToSummary() {
    state.phase = 'summary';
    state.log.completedAt = new Date().toISOString();
    state.log.durationSec = durationSec();
    await Storage.saveLog(state.day.date, state.log);

    // 计算并保存新成就
    await checkAchievements();

    render();
  }

  async function checkAchievements() {
    try {
      const logs = await Storage.listLogs();
      const plan = await Storage.getPlan();
      const result = Achievements.compute(logs, plan);
      const earnedIds = result.earned.map(a => a.id);
      const settings = await Storage.getSettings();
      const prevIds = settings.achievements || [];
      const newOnes = Achievements.diff(prevIds, earnedIds);
      await Storage.saveSettings({ achievements: earnedIds });
      state.newAchievements = newOnes;
    } catch (e) {
      console.error('achievements check failed', e);
      state.newAchievements = [];
    }
  }

  function renderSummary() {
    const { day, log } = state;
    const totalSets = log.completedExercises.reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
    const totalReps = log.completedExercises.reduce((s, e) => s + (e.sets || []).reduce((a, b) => a + (b.reps || 0), 0), 0);
    const totalVolume = log.completedExercises.reduce((s, e) => s + (e.sets || []).reduce((a, b) => a + (b.weight ? b.weight * b.reps : 0), 0), 0);
    const exCount = log.completedExercises.length;
    const dur = log.durationSec || durationSec();

    const newAchHtml = (state.newAchievements && state.newAchievements.length)
      ? `
        <div class="w-summary-section">
          <div class="section-title" style="margin-top:24px">新成就</div>
          ${state.newAchievements.map(a => `
            <div class="achievement unlocked">
              <div class="achievement-icon"><svg viewBox="0 0 24 24"><use href="#${a.icon}"/></svg></div>
              <div>
                <div class="fw-600">${a.title}</div>
                <div class="text-xs text-dim">${a.desc}</div>
              </div>
              <div class="achievement-new">NEW</div>
            </div>
          `).join('')}
        </div>` : '';

    root().innerHTML = `
      <div class="w-summary">
        <div class="w-summary-hero">
          <div class="celebration-check" style="width:96px;height:96px;margin:24px auto 16px">
            <svg viewBox="0 0 24 24" width="48" height="48"><use href="#i-check"/></svg>
          </div>
          <h1 style="text-align:center; margin-bottom:4px">训练完成</h1>
          <div class="text-dim center">${day.title}</div>
        </div>

        <div class="stat-row mt-24">
          <div class="stat">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg></div>
            <div class="stat-value">${formatDuration(dur)}</div>
            <div class="stat-label">用时</div>
          </div>
          <div class="stat">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-flash"/></svg></div>
            <div class="stat-value">${totalSets}</div>
            <div class="stat-label">总组数</div>
          </div>
          <div class="stat">
            <div class="stat-icon"><svg viewBox="0 0 24 24"><use href="#i-fire"/></svg></div>
            <div class="stat-value">${totalReps}</div>
            <div class="stat-label">总次数</div>
          </div>
        </div>

        ${totalVolume > 0 ? `
          <div class="card mt-12 center">
            <div class="text-xs text-dim">总训练量</div>
            <div class="text-xl text-accent" style="font-variant-numeric: tabular-nums; margin-top: 4px">${formatVolume(totalVolume)} kg</div>
          </div>` : ''}

        <div class="section-title" style="margin-top:24px">动作明细</div>
        ${log.completedExercises.map(e => {
          const def = state.day.exercises.find(x => x.id === e.id);
          if (!def) return '';
          return `
            <div class="card">
              <div class="card-row">
                <strong>${def.nameZh}</strong>
                <span class="text-sm text-dim">${(e.sets || []).length}/${def.sets} 组</span>
              </div>
              <div class="w-history-strip mt-8">
                ${(e.sets || []).map((s, i) => `
                  <div class="w-history-pill">
                    <span class="text-xs text-faint">#${i+1}</span>
                    ${s.weight ? `<strong>${s.weight}kg</strong>` : ''}
                    <span>×${s.reps}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}

        ${newAchHtml}

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block" data-act="done">完成</button>
        </div>
      </div>
    `;

    root().querySelector('[data-act="done"]').addEventListener('click', () => {
      const finishedLog = state.log;
      const onFinish = state.onFinish;
      hide();
      onFinish(finishedLog);
    });
  }

  function confirmQuit() {
    UI.confirmModal({
      title: '退出本次训练?',
      text: '已记录的组会保留。',
      okLabel: '退出',
      danger: true,
    }).then(ok => {
      if (!ok) return;
      const onFinish = state.onFinish;
      const finishedLog = state.log;
      hide();
      onFinish(finishedLog);
    });
  }

  // ---------- helpers ----------
  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  function formatVolume(v) {
    if (v >= 10000) return (v / 1000).toFixed(1) + 'k';
    return Math.round(v).toString();
  }
  function parseRepsLow(repsStr) {
    if (!repsStr) return 8;
    const m = String(repsStr).match(/(\d+)/);
    return m ? Number(m[1]) : 8;
  }
  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
  function beep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch(e){}
  }

  global.WorkoutMode = { start };
})(window);
