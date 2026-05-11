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

  async function start(day, existingLog, opts = {}) {
    const log = existingLog ? deepCopy(existingLog) : {
      dayIndex: day.dayIndex,
      completedExercises: [],
      startedAt: new Date().toISOString(),
    };
    if (!log.startedAt) log.startedAt = new Date().toISOString();

    const settings = await Storage.getSettings();

    // 预加载所有 logs,用于 progression hint
    const allLogs = await Storage.listLogs().catch(() => ({}));

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

    // 第一组之前 + 用户没禁用 → 进 warmup 阶段
    const noProgressYet = (log.completedExercises || []).every(e => !(e.sets || []).length);
    const skipWarmup = opts.skipWarmup || settings.warmupDisabled || !noProgressYet;
    const initialPhase = exIdx >= day.exercises.length ? 'summary'
      : (skipWarmup ? 'set' : 'warmup');

    state = {
      day, log,
      exIdx, setIdx,
      phase: initialPhase,
      lastWeight: null,
      lastReps: null,
      tickerId: null,
      restRemaining: 0,
      restTotal: 0,
      restPaused: false,
      warmupRemaining: 60,
      warmupTotal: 60,
      allLogs,
      onFinish: opts.onFinish || (() => {}),
    };

    show();
    startDurationTicker();
    render();
    // 进入训练时打个招呼(warmup 阶段会有自己的语音)
    if (initialPhase === 'set') {
      AudioCue.isVoiceEnabled().then(on => {
        if (on) AudioCue.speak('开始训练', { rate: 1.0 });
      });
    } else if (initialPhase === 'warmup') {
      AudioCue.isVoiceEnabled().then(on => {
        if (on) AudioCue.speak('先热身一下', { rate: 1.0 });
      });
    }
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
    AudioCue.tickStop();
    AudioCue.stopSpeak();
    state = null;
  }

  function startDurationTicker() {
    if (state.tickerId) clearInterval(state.tickerId);
    state.tickerId = setInterval(() => {
      // 更新顶部计时
      const el = document.getElementById('w-duration');
      if (el) el.textContent = formatDuration(durationSec());
      // 热身倒计时
      if (state.phase === 'warmup') {
        state.warmupRemaining = Math.max(0, state.warmupRemaining - 1);
        const wd = document.getElementById('w-warmup-display');
        if (wd) wd.textContent = state.warmupRemaining;
        if (state.warmupRemaining <= 0) {
          state.phase = 'set';
          AudioCue.isVoiceEnabled().then(on => {
            if (on) AudioCue.speak('开始训练', { rate: 1.0 });
          });
          render();
        }
      }
      // 更新休息倒计时
      if (state.phase === 'rest' && !state.restPaused) {
        state.restRemaining--;
        const td = document.getElementById('w-rest-display');
        if (td) td.textContent = Math.max(0, state.restRemaining);
        updateRestRing();
        // 剩最后 3 秒时报数 + 短哔
        if (state.restRemaining === 3 || state.restRemaining === 2 || state.restRemaining === 1) {
          AudioCue.beep(700, 0.06);
          AudioCue.isVoiceEnabled().then(on => {
            if (on) AudioCue.speak(String(state.restRemaining), { rate: 1.2 });
          });
        }
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
    if (state.phase === 'warmup')  return renderWarmup();
    return renderSet();
  }

  function renderWarmup() {
    // 选 3-4 个热身动作(基于今日肌群)
    const muscleSet = new Set();
    state.day.exercises.forEach(e => {
      const def = ExerciseLib.findById(e.id);
      if (def) (def.muscleKeys || []).forEach(k => muscleSet.add(k));
    });
    const warmupPool = [
      { id: 'jumping_jack',   match: ['core','quads'] },
      { id: 'cat_cow',        match: ['back','core'] },
      { id: 'leg_swing',      match: ['quads','hamstrings','glutes'] },
      { id: 'shoulder_dislocate', match: ['shoulders','chest'] },
      { id: 'world_greatest_stretch', match: ['shoulders','quads','core'] },
      { id: 'high_knee',      match: ['quads','core'] },
      { id: 'hip_flexor_stretch', match: ['quads','glutes'] },
    ];
    const picked = warmupPool
      .filter(p => p.match.some(m => muscleSet.has(m)))
      .map(p => ExerciseLib.findById(p.id))
      .filter(Boolean)
      .slice(0, 4);

    root().innerHTML = `
      <div class="w-header">
        <button class="btn btn-icon" data-act="quit"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        <div class="w-progress-strip"><div class="w-progress-bar" style="width:0%"></div></div>
        <div class="w-duration">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-clock"/></svg>
          <span id="w-duration">${formatDuration(durationSec())}</span>
        </div>
      </div>
      <div class="w-body">
        <div class="warmup-hero">
          <div class="text-dim text-sm" style="letter-spacing:6px">热身阶段</div>
          <div class="text-xl mt-8">动起来,身体先醒一下</div>
          <div class="warmup-timer">
            <div class="warmup-display" id="w-warmup-display">${state.warmupRemaining}</div>
            <div class="text-sm text-dim">秒</div>
          </div>
        </div>
        ${picked.length ? `
          <div class="text-dim text-sm mb-8">建议做这几个(每个 15 秒):</div>
          ${picked.map(p => `
            <div class="card recovery-item">
              <div class="card-row">
                <div>
                  <div class="fw-600">${p.nameZh}</div>
                  <div class="text-xs text-dim">${(p.tips||[])[0] || ''}</div>
                </div>
              </div>
            </div>
          `).join('')}` : ''}
      </div>
      <div class="w-action-secondary">
        <button class="btn btn-sm btn-ghost" data-act="warmup-skip">跳过热身</button>
        <button class="btn btn-sm btn-ghost" data-act="warmup-disable">永不显示</button>
      </div>
      <div class="w-actions">
        <button class="btn btn-primary btn-block" data-act="warmup-done">
          <svg viewBox="0 0 24 24"><use href="#i-check"/></svg>
          准备好了,开始
        </button>
      </div>
    `;

    root().querySelector('[data-act="quit"]').addEventListener('click', confirmQuit);
    root().querySelector('[data-act="warmup-skip"]').addEventListener('click', () => {
      state.phase = 'set'; render();
    });
    root().querySelector('[data-act="warmup-done"]').addEventListener('click', () => {
      state.phase = 'set'; render();
    });
    root().querySelector('[data-act="warmup-disable"]').addEventListener('click', async () => {
      await Storage.saveSettings({ warmupDisabled: true });
      state.phase = 'set'; render();
      UI.toast('已关闭热身提示,可在设置里重新开启', { ttl: 2000 });
    });
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

    // progression hint: 仅在第 1 组、当前没有 lastSet 时计算
    const progression = (setIdx === 0 && !lastSet)
      ? (WeightRef.progressionHint(ex.id, state.allLogs || {}, exDone) || null)
      : null;

    const prefillWeight = lastSet
      ? lastSet.weight
      : (state.lastWeight != null ? state.lastWeight
         : (progression ? progression.suggestedWeight
            : (ex.suggestedWeight != null ? ex.suggestedWeight : '')));
    const prefillReps = lastSet ? lastSet.reps : (state.lastReps != null ? state.lastReps : parseRepsLow(ex.reps));
    const weightHint = ex.suggestedWeight != null ? WeightRef.format(ex.suggestedWeight, ex.id) : null;

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
          ${exIdx === 0 && setIdx === 0 ? `<span class="bpm-hint">${suggestBpm(day.type)}</span>` : ''}
        </div>
        <div class="set-dots">
          ${Array.from({length: totalSets}, (_, i) => {
            const cls = i < setIdx ? 'done' : (i === setIdx ? 'current' : '');
            return `<span class="set-dot ${cls}"></span>`;
          }).join('')}
          <span class="set-dot-label">第 ${setIdx + 1} / ${totalSets} 组</span>
        </div>
        <div class="w-exercise-name">
          ${ex.nameZh}
          ${ex.isFocus ? '<span class="focus-badge">重点</span>' : ''}
        </div>
        <div class="w-exercise-en">${ex.nameEn}</div>
        <div class="muscle-tags mt-12">
          ${ex.muscles.map(m => `<span class="muscle-tag">${m}</span>`).join('')}
        </div>
        ${renderActiveMuscle(ex)}

        <div class="w-target">
          <div class="w-target-row"><span>目标</span><strong>${ex.reps} 次</strong></div>
          <div class="w-target-row"><span>组间休息</span><strong>${ex.restSec}s</strong></div>
          ${weightHint ? `<div class="w-target-row"><span>建议重量</span><strong style="color:var(--accent)">${weightHint}</strong></div>` : ''}
        </div>
        ${progression && progression.message ? `
          <div class="progression-hint mt-12">
            <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-flash"/></svg>
            ${progression.message}
          </div>` : ''}

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

      <div class="w-action-secondary">
        <button class="btn btn-sm btn-ghost" data-act="swap-ex">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-swap"/></svg>换一个
        </button>
        <button class="btn btn-sm btn-ghost ${AudioCue.isTicking()?'metro-on':''}" data-act="metronome">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-clock"/></svg>${AudioCue.isTicking()?'节拍 ON':'节拍'}
        </button>
        <button class="btn btn-sm btn-ghost" data-act="skip-ex">跳过</button>
      </div>
      <div class="w-actions">
        <button class="btn btn-primary btn-block" data-act="finish-set">
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
    root().querySelector('[data-act="swap-ex"]')?.addEventListener('click', swapCurrentExercise);
    root().querySelector('[data-act="finish-set"]').addEventListener('click', finishSet);
    root().querySelector('[data-act="metronome"]')?.addEventListener('click', toggleMetronome);
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

  function toggleMetronome() {
    if (AudioCue.isTicking()) {
      AudioCue.tickStop();
      UI.toast('节拍器关闭', { ttl: 1200 });
    } else {
      AudioCue.tickStart(60); // 60 BPM = 每秒 1 拍,适合 2-1-2 配速
      UI.toast('节拍器 60 BPM,2 秒离心 / 1 秒停 / 1 秒向心', { ttl: 2200 });
    }
    render(); // 更新按钮态
  }

  async function swapCurrentExercise() {
    const ex = state.day.exercises[state.exIdx];
    const profile = await Storage.getProfile();
    const alts = ExerciseLib.alternatives(ex.id, profile.venue);
    if (!alts.length) {
      UI.toast('没有合适的替代动作', { type: 'error' });
      return;
    }
    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">换一个</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="text-dim text-sm mb-12">把 <strong>${ex.nameZh}</strong> 换成:</div>
          ${alts.map(a => {
            const w = WeightRef.suggest(a.id, profile);
            return `
              <div class="card swap-option" data-pick="${a.id}">
                <div class="card-row">
                  <div>
                    <div class="fw-600">${a.nameZh}</div>
                    <div class="text-xs text-dim">${(a.muscles||[]).join(' · ')}</div>
                  </div>
                  ${w != null ? `<div class="text-sm" style="color:var(--accent); font-weight:600">${WeightRef.format(w, a.id)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });
      modal.querySelectorAll('[data-pick]').forEach(opt => {
        opt.addEventListener('click', async () => {
          const newId = opt.dataset.pick;
          const newEx = ExerciseLib.findById(newId);
          // 替换计划里这个位置
          const plan = await Storage.getPlan();
          const planDay = plan.days.find(d => d.date === state.day.date);
          const idx = planDay.exercises.findIndex(e => e.id === ex.id);
          const orig = planDay.exercises[idx];
          planDay.exercises[idx] = {
            id: newEx.id,
            nameZh: newEx.nameZh,
            nameEn: newEx.nameEn,
            muscles: newEx.muscles,
            sets: orig.sets,
            reps: orig.reps,
            restSec: orig.restSec,
            suggestedWeight: WeightRef.suggest(newEx.id, profile),
            isFocus: orig.isFocus,
            tips: newEx.tips,
            imageUrl: newEx.imageUrl,
          };
          await Storage.savePlan(plan);
          // 同步内存中的 day
          state.day.exercises = planDay.exercises;
          // 当前 ex 的 log 清掉(还没做)
          if (state.log.completedExercises) {
            state.log.completedExercises = state.log.completedExercises.filter(e => e.id !== ex.id);
            await Storage.saveLog(state.day.date, state.log);
          }
          state.setIdx = 0;
          state.lastWeight = null;
          state.lastReps = null;
          close();
          UI.toast(`换成 ${newEx.nameZh}`, { type: 'success', icon: 'i-check' });
          render();
        });
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

    // 跟上次同序号的组对比
    showCompareToast(ex.id, state.setIdx, weight, reps);
    // PR 检测
    detectAndCelebratePR(ex, weight, reps);

    if (exLog.sets.length >= ex.sets) {
      exLog.done = true;
    }
    await Storage.saveLog(state.day.date, state.log);

    try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) {}

    // 语音鼓励
    AudioCue.isVoiceEnabled().then(on => {
      if (!on) return;
      const remaining = ex.sets - exLog.sets.length;
      let line;
      if (remaining === 0) {
        line = `${ex.nameZh}完成,准备下一个动作`;
      } else if (remaining === 1) {
        line = '还剩最后一组,坚持';
      } else {
        line = `第${exLog.sets.length}组完成,休息`;
      }
      AudioCue.speak(line, { rate: 1.0 });
    });

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
      AudioCue.isVoiceEnabled().then(on => {
        if (on) AudioCue.speak('开始', { rate: 1.0 });
      });
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
    // 异步加载 AI 寄语
    fetchPostWorkoutMessage();
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

  function detectAndCelebratePR(ex, weight, reps) {
    if (!weight || !reps) return;
    const allLogs = state.allLogs || {};
    let bestWeight = 0, bestRepsAtBest = 0;
    Object.entries(allLogs).forEach(([d, log]) => {
      if (d === state.day.date) return;
      if (!log || !log.completedExercises) return;
      const entry = log.completedExercises.find(e => e.id === ex.id);
      if (!entry) return;
      (entry.sets || []).forEach(s => {
        if (!s.weight || !s.reps) return;
        if (s.weight > bestWeight || (s.weight === bestWeight && s.reps > bestRepsAtBest)) {
          bestWeight = s.weight;
          bestRepsAtBest = s.reps;
        }
      });
    });
    if (bestWeight === 0) return; // 第一次有重量,不算 PR
    if (weight > bestWeight || (weight === bestWeight && reps > bestRepsAtBest)) {
      try { if (navigator.vibrate) navigator.vibrate([60,30,60,30,150]); } catch(e){}
      AudioCue.beep(1200, 0.18);
      AudioCue.isVoiceEnabled().then(on => {
        if (on) AudioCue.speak(`新纪录,${ex.nameZh} ${weight}公斤`, { rate: 1.0 });
      });
      UI.toast(`🏆 新 PR · ${ex.nameZh} ${weight}kg×${reps}`, { type: 'success', icon: 'i-trophy', ttl: 3500 });
      // 在 root 上撒少量彩纸
      UI.spawnConfettiAt(root(), 20);
    }
  }

  function showCompareToast(exId, setIndex, weight, reps) {
    const allLogs = state.allLogs || {};
    // 找最近一次有该动作记录的日期(不是今天)
    const todayKey = state.day.date;
    const dates = Object.keys(allLogs).sort((a,b) => b.localeCompare(a));
    let lastSet = null;
    for (const d of dates) {
      if (d === todayKey) continue;
      const log = allLogs[d];
      if (!log || !log.completedExercises) continue;
      const entry = log.completedExercises.find(e => e.id === exId);
      if (!entry || !entry.sets || !entry.sets.length) continue;
      lastSet = entry.sets[setIndex] || entry.sets[entry.sets.length - 1];
      if (lastSet) break;
    }
    if (!lastSet) return;

    let parts = [];
    if (weight && lastSet.weight) {
      const dW = weight - lastSet.weight;
      if (dW > 0) parts.push(`+${dW}kg 比上次重`);
      else if (dW === 0) parts.push('同重量');
    }
    if (reps && lastSet.reps) {
      const dR = reps - lastSet.reps;
      if (dR > 0) parts.push(`多做 ${dR} 次`);
      else if (dR === 0 && weight && lastSet.weight && weight > lastSet.weight) parts.push('次数稳住');
    }
    if (parts.length) {
      UI.toast(parts.join(' · '), { type: 'success', icon: 'i-flash', ttl: 2200 });
    }
  }

  async function fetchPostWorkoutMessage() {
    try {
      const profile = await Storage.getProfile();
      const result = await AIPlanner.postWorkout(profile, state.day, state.log);
      state.postMessage = result.text;
      // 重渲染 summary 中的寄语
      const el = document.getElementById('w-coach-message');
      if (el && state.postMessage) el.textContent = state.postMessage;
    } catch (e) { /* silent */ }
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
          <div class="w-coach-message" id="w-coach-message">${state.postMessage || ''}</div>
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

        ${cooldownSection(day)}

        <div class="onboarding-actions">
          <button class="btn btn-primary btn-block" data-act="done">完成</button>
        </div>
      </div>
    `;

    root().querySelector('[data-act="done"]').addEventListener('click', () => {
      const finishedLog = state.log;
      const onFinish = state.onFinish;
      const newAch = (state.newAchievements || []).slice();
      hide();
      onFinish(finishedLog);
      // 依次弹解锁动画
      newAch.forEach((a, i) => {
        setTimeout(() => UI.unlockAchievement(a), 600 + i * 3500);
      });
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

  function suggestBpm(dayType) {
    const map = {
      push: '🎵 130-145 BPM',
      pull: '🎵 130-145 BPM',
      legs: '🎵 140-160 BPM 推荐高燃',
      upper: '🎵 130-145 BPM',
      lower: '🎵 140-160 BPM',
      fullbody: '🎵 140-160 BPM',
    };
    return map[dayType] || '';
  }

  function renderActiveMuscle(ex) {
    const def = ExerciseLib.findById(ex.id);
    if (!def || !def.muscleKeys || !def.muscleKeys.length) return '';
    if (typeof BodyMap === 'undefined') return '';
    return `<div class="w-bodymap">${BodyMap.render(def.muscleKeys)}</div>`;
  }

  function cooldownSection(day) {
    // 根据当天涉及的肌群挑 2-3 个轻拉伸
    const muscleSet = new Set();
    (day.exercises || []).forEach(e => {
      const def = ExerciseLib.findById(e.id);
      if (def) (def.muscleKeys || []).forEach(k => muscleSet.add(k));
    });
    const stretchPool = [
      { id: 'cat_cow', match: ['back','core'] },
      { id: 'world_greatest_stretch', match: ['shoulders','quads','core'] },
      { id: 'leg_swing', match: ['quads','hamstrings','glutes'] },
      { id: 'shoulder_dislocate', match: ['shoulders','chest'] },
      { id: 'hip_flexor_stretch', match: ['quads','glutes'] },
      { id: 'child_pose', match: ['back'] },
    ];
    const picked = stretchPool
      .filter(p => p.match.some(m => muscleSet.has(m)))
      .map(p => ExerciseLib.findById(p.id))
      .filter(Boolean)
      .slice(0, 3);
    if (!picked.length) return '';
    return `
      <div class="section-title">练完顺手拉伸</div>
      ${picked.map(s => `
        <div class="card recovery-item">
          <div class="card-row">
            <div>
              <div class="fw-600">${s.nameZh}</div>
              <div class="text-xs text-dim">${(s.muscles||[]).join(' · ')}</div>
            </div>
          </div>
          <div class="text-sm text-dim mt-8">${(s.tips||[]).join(' · ')}</div>
        </div>
      `).join('')}
    `;
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
