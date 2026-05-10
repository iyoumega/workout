/**
 * Today view — renders today's workout. Entry to Workout Mode.
 */
(function (global) {
  let timerState = { remaining: 0, total: 90, intervalId: null, paused: false };
  const TIMER_RING_CIRCUMFERENCE = 2 * Math.PI * 54;

  function root() { return document.getElementById('view-today'); }

  async function render() {
    const todayKey = Planner.toDateKey(new Date());
    let plan = await Storage.getPlan();
    const profile = await Storage.getProfile();

    if (!plan || !Planner.planCoversDate(plan, todayKey)) {
      if (profile) {
        plan = Planner.generate(profile);
        await Storage.savePlan(plan);
      }
    }

    if (!plan || !profile) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-dumbbell"/></svg></div>
          <div class="empty-title">还没有训练计划</div>
          <div class="empty-sub">完成档案后会自动生成</div>
        </div>`;
      return;
    }

    const day = Planner.getDayByDate(plan, todayKey);
    if (!day) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-plan"/></svg></div>
          <div class="empty-title">今天不在计划范围内</div>
        </div>`;
      return;
    }

    const log = (await Storage.getLog(todayKey)) || { dayIndex: day.dayIndex, completedExercises: [] };
    const completedSet = new Set((log.completedExercises || []).map(e => typeof e === 'string' ? e : e.id));
    const dateLabel = formatDateLabel(new Date());

    if (day.type === 'rest') {
      root().innerHTML = `
        <div class="today-header">
          <div>
            <div class="greeting">${UI.greeting()}</div>
            <div class="today-date">${dateLabel}</div>
            <div class="today-title">今天休息</div>
            <div class="today-badge">
              <svg viewBox="0 0 24 24"><use href="#i-clock"/></svg>恢复日
            </div>
          </div>
        </div>
        <div class="card">
          <h3 class="mb-8">好好放松一下</h3>
          <p class="text-dim text-sm">充足睡眠和营养是肌肉生长的关键。可以做些轻度活动:散步、拉伸、瑜伽。</p>
        </div>
        ${nutritionCard(day.nutrition)}
      `;
      return;
    }

    const completed = day.exercises.filter(e => completedSet.has(e.id)).length;
    const total = day.exercises.length;
    const allDone = completed === total && total > 0;
    const pct = total ? (completed / total) * 100 : 0;
    const alreadyFinished = !!log.completedAt;
    const partiallyStarted = (log.completedExercises || []).some(e => e.sets && e.sets.length > 0) && !alreadyFinished;

    // Hero block: "开始训练" / "继续训练" / "今日已完成"
    let heroBlock = '';
    if (alreadyFinished) {
      const totalSets = (log.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
      const dur = log.durationSec ? formatDuration(log.durationSec) : '';
      heroBlock = `
        <div class="today-hero done">
          <div class="today-hero-icon"><svg viewBox="0 0 24 24"><use href="#i-check"/></svg></div>
          <div class="flex-1">
            <div class="fw-600">今日训练已完成</div>
            <div class="text-xs text-dim">${dur} · ${totalSets} 组 · 干得漂亮</div>
          </div>
        </div>
      `;
    } else {
      heroBlock = `
        <button class="today-hero-btn" id="start-workout">
          <div class="today-hero-text">
            <div class="today-hero-label">${partiallyStarted ? '继续训练' : '开始训练'}</div>
            <div class="today-hero-sub">${total} 个动作 · 预计 ${estimateDuration(day)} 分钟</div>
          </div>
          <div class="today-hero-icon-r">
            <svg viewBox="0 0 24 24"><use href="#i-play"/></svg>
          </div>
        </button>
      `;
    }

    const exercisesHtml = day.exercises.map((ex, idx) => {
      const exLog = (log.completedExercises || []).find(e => e.id === ex.id);
      const setsLogged = exLog ? (exLog.sets || []).length : 0;
      const done = completedSet.has(ex.id) || setsLogged >= ex.sets;
      const weightHint = ex.suggestedWeight != null ? WeightRef.format(ex.suggestedWeight, ex.id) : null;
      return `
        <div class="card exercise-card ${done?'done':''}" data-ex-id="${ex.id}">
          <div class="card-row">
            <div>
              <div class="exercise-name">
                ${ex.nameZh}
                ${ex.isFocus ? '<span class="focus-badge">重点</span>' : ''}
              </div>
              <div class="exercise-name-en">${ex.nameEn}</div>
            </div>
            <div class="text-faint text-xs">${idx+1}/${day.exercises.length}</div>
          </div>
          <div class="muscle-tags">
            ${ex.muscles.map(m => `<span class="muscle-tag">${m}</span>`).join('')}
          </div>
          <div class="exercise-meta">
            <div class="exercise-meta-item"><strong>${ex.sets}</strong>组</div>
            <div class="exercise-meta-item"><strong>${ex.reps}</strong>次</div>
            <div class="exercise-meta-item">休息<strong style="margin-left:4px">${ex.restSec}</strong>s</div>
            ${weightHint ? `<div class="exercise-meta-item weight-hint">建议<strong style="margin-left:4px">${weightHint}</strong></div>` : ''}
          </div>
          ${setsLogged > 0 ? `
            <div class="w-history-strip mt-8">
              ${(exLog.sets || []).map((s, i) => `
                <div class="w-history-pill small">
                  <span class="text-xs text-faint">#${i+1}</span>
                  ${s.weight ? `<strong>${s.weight}kg</strong>` : ''}
                  <span>×${s.reps}</span>
                </div>
              `).join('')}
            </div>` : ''}
          <div class="exercise-toggle" data-toggle="${ex.id}">
            <svg viewBox="0 0 24 24"><use href="#i-chev"/></svg> 动作要点
          </div>
          <div class="exercise-tips hidden" data-tips="${ex.id}">
            <ul>${ex.tips.map(t => `<li>${t}</li>`).join('')}</ul>
          </div>
          <div class="exercise-actions">
            <button class="btn btn-icon" data-act="rest" data-rest="${ex.restSec}" title="开始休息">
              <svg viewBox="0 0 24 24"><use href="#i-clock"/></svg>
            </button>
            <button class="btn btn-icon" data-act="bili" data-name="${ex.nameZh}" title="看示范">
              <svg viewBox="0 0 24 24"><use href="#i-link"/></svg>
            </button>
            <button class="btn btn-sm ${done?'btn-secondary':'btn-primary'}" data-act="toggle" data-id="${ex.id}">
              ${done ? '<svg viewBox="0 0 24 24"><use href="#i-check"/></svg>已完成' : '标记完成'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    root().innerHTML = `
      <div class="today-header">
        <div>
          <div class="greeting">${UI.greeting()}</div>
          <div class="today-date">${dateLabel}</div>
          <div class="today-title">${day.title}</div>
          <div class="today-badge">
            <svg viewBox="0 0 24 24"><use href="#i-flash"/></svg>
            ${completed}/${total} 已完成
          </div>
        </div>
      </div>
      ${heroBlock}
      <div class="day-progress">
        <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
      ${exercisesHtml}
      ${nutritionCard(day.nutrition)}
      ${!alreadyFinished ? `
        <div class="finish-bar">
          <button class="btn btn-secondary btn-block" id="finish-day" ${allDone ? '' : 'disabled'}>
            ${allDone ? '<svg viewBox="0 0 24 24"><use href="#i-check"/></svg>标记今日完成' : '勾选所有动作后完成'}
          </button>
        </div>` : ''}
    `;

    bindEvents(day, log, plan);
  }

  function nutritionCard(nutrition) {
    return `
      <div class="card nutrition-card">
        <div class="card-row">
          <h3>今日饮食</h3>
          <div class="text-dim text-sm">${nutrition.calories} kcal</div>
        </div>
        <div class="text-xs text-faint mt-4">${nutrition.isTrainingDay?'训练日':'休息日'} · 三大营养素</div>
        <div class="macro-row">
          <div class="macro">
            <div class="macro-value">${nutrition.protein}g</div>
            <div class="macro-label">蛋白质</div>
          </div>
          <div class="macro">
            <div class="macro-value">${nutrition.carbs}g</div>
            <div class="macro-label">碳水</div>
          </div>
          <div class="macro">
            <div class="macro-value">${nutrition.fat}g</div>
            <div class="macro-label">脂肪</div>
          </div>
        </div>
        <div class="text-xs text-dim mb-4">食物示例:</div>
        <div class="food-examples">
          ${nutrition.examples.map(e => `· ${e}`).join('<br/>')}
        </div>
      </div>
    `;
  }

  function bindEvents(day, log, plan) {
    const todayKey = Planner.toDateKey(new Date());

    document.getElementById('start-workout')?.addEventListener('click', () => {
      WorkoutMode.start(day, log, {
        onFinish: async (finishedLog) => {
          // 重新渲染本视图
          await render();
          // 如果完成了全部,显示庆祝并触发新成就提示
          if (finishedLog.completedAt) {
            const totalSets = (finishedLog.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
            UI.celebrate(`${day.title} · ${totalSets} 组 · 干得漂亮`);
          }
        },
      });
    });

    root().querySelectorAll('[data-act="toggle"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const set = new Set((log.completedExercises || []).map(e => typeof e === 'string' ? e : e.id));
        const wasDone = set.has(id);
        if (wasDone) set.delete(id); else set.add(id);
        // 保留 sets 数据
        const map = new Map((log.completedExercises || []).map(e => [e.id, e]));
        log.completedExercises = [...set].map(eid => {
          const existing = map.get(eid);
          return existing ? existing : { id: eid, done: true, sets: [] };
        });
        log.updatedAt = new Date().toISOString();
        await Storage.saveLog(todayKey, log);
        if (!wasDone) {
          try { if (navigator.vibrate) navigator.vibrate(20); } catch(e){}
        }
        render();
      });
    });

    root().querySelectorAll('[data-act="bili"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(btn.dataset.name + ' 标准动作')}`;
        window.open(url, '_blank');
      });
    });

    root().querySelectorAll('[data-act="rest"]').forEach(btn => {
      btn.addEventListener('click', () => startTimer(Number(btn.dataset.rest)));
    });

    root().querySelectorAll('[data-toggle]').forEach(t => {
      t.addEventListener('click', () => {
        const id = t.dataset.toggle;
        const panel = root().querySelector(`[data-tips="${id}"]`);
        const open = !panel.classList.contains('hidden');
        if (open) { panel.classList.add('hidden'); t.classList.remove('open'); }
        else { panel.classList.remove('hidden'); t.classList.add('open'); }
      });
    });

    const finishBtn = document.getElementById('finish-day');
    if (finishBtn && !log.completedAt) {
      finishBtn.addEventListener('click', async () => {
        log.completedAt = new Date().toISOString();
        await Storage.saveLog(todayKey, log);
        // 检查新成就
        const logs = await Storage.listLogs();
        const settings = await Storage.getSettings();
        const result = Achievements.compute(logs, plan);
        const earnedIds = result.earned.map(a => a.id);
        const newOnes = Achievements.diff(settings.achievements || [], earnedIds);
        await Storage.saveSettings({ achievements: earnedIds });

        const subText = `${day.title} · ${day.exercises.length} 个动作`;
        UI.celebrate(subText);

        if (newOnes.length) {
          setTimeout(() => {
            UI.toast(`新成就:${newOnes[0].title}`, { type: 'success', icon: 'i-trophy', ttl: 3000 });
          }, 800);
        }

        setTimeout(() => render(), 600);
      });
    }
  }

  function estimateDuration(day) {
    let secs = 0;
    day.exercises.forEach(ex => {
      const repsLow = parseRepsLow(ex.reps);
      // 每组 ~ (repsLow * 3 秒动作) + restSec 休息
      secs += ex.sets * (repsLow * 3 + ex.restSec);
    });
    return Math.round(secs / 60);
  }

  function parseRepsLow(repsStr) {
    if (!repsStr) return 8;
    const m = String(repsStr).match(/(\d+)/);
    return m ? Number(m[1]) : 8;
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ===== 单独的休息计时(从动作卡上的小时钟按钮触发) =====
  function startTimer(seconds) {
    timerState.total = seconds;
    timerState.remaining = seconds;
    timerState.paused = false;
    showTimer();
    updateRing();
    if (timerState.intervalId) clearInterval(timerState.intervalId);
    timerState.intervalId = setInterval(tick, 1000);
  }
  function showTimer() {
    const overlay = document.getElementById('timer-overlay');
    overlay.classList.remove('hidden');
    document.getElementById('timer-display').textContent = timerState.remaining;
    document.getElementById('timer-pause').textContent = '暂停';
    bindTimerOnce();
  }
  function tick() {
    if (timerState.paused) return;
    timerState.remaining--;
    const display = document.getElementById('timer-display');
    if (display) display.textContent = Math.max(0, timerState.remaining);
    updateRing();
    if (timerState.remaining <= 0) {
      stopTimer();
      try {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        beep();
      } catch (e) {}
      hideTimer();
      UI.toast('休息结束,继续下一组', { type: 'success', icon: 'i-check' });
      return;
    }
  }
  function updateRing() {
    const ring = document.getElementById('timer-ring-fg');
    if (!ring) return;
    const ratio = Math.max(0, timerState.remaining / timerState.total);
    ring.style.strokeDashoffset = (TIMER_RING_CIRCUMFERENCE * (1 - ratio)).toString();
  }
  function stopTimer() {
    if (timerState.intervalId) clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
  function hideTimer() {
    document.getElementById('timer-overlay').classList.add('hidden');
  }
  let timerBound = false;
  function bindTimerOnce() {
    if (timerBound) return;
    timerBound = true;
    document.getElementById('timer-pause').addEventListener('click', () => {
      timerState.paused = !timerState.paused;
      document.getElementById('timer-pause').textContent = timerState.paused ? '继续' : '暂停';
    });
    document.getElementById('timer-add').addEventListener('click', () => {
      timerState.remaining += 15;
      timerState.total += 15;
      document.getElementById('timer-display').textContent = timerState.remaining;
      updateRing();
    });
    document.getElementById('timer-skip').addEventListener('click', () => {
      stopTimer(); hideTimer();
    });
  }
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

  function formatDateLabel(d) {
    const dows = ['周日','周一','周二','周三','周四','周五','周六'];
    return `${d.getMonth()+1}月${d.getDate()}日 · ${dows[d.getDay()]}`;
  }

  global.TodayView = { render };
})(window);
