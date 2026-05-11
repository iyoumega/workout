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
          <div class="empty-title">先聊一下吧</div>
          <div class="empty-sub">填一份档案,就给你做计划</div>
        </div>`;
      return;
    }

    const day = Planner.getDayByDate(plan, todayKey);
    if (!day) {
      root().innerHTML = `
        <div class="empty">
          <div class="empty-icon"><svg viewBox="0 0 24 24"><use href="#i-plan"/></svg></div>
          <div class="empty-title">这一天还没排</div>
          <div class="empty-sub">去"计划"重新生成下一周</div>
        </div>`;
      return;
    }

    const log = (await Storage.getLog(todayKey)) || { dayIndex: day.dayIndex, completedExercises: [] };
    const completedSet = new Set((log.completedExercises || []).map(e => typeof e === 'string' ? e : e.id));
    const dateLabel = formatDateLabel(new Date());

    if (day.type === 'rest') {
      // 选 3 个轻度恢复动作
      const recoveryIds = ['cat_cow', 'world_greatest_stretch', 'leg_swing', 'shoulder_dislocate', 'hip_flexor_stretch', 'plank', 'glute_bridge'];
      const recoveryItems = recoveryIds
        .map(id => ExerciseLib.findById(id))
        .filter(e => e && e.venues.includes(profile.venue))
        .slice(0, 4);

      // 用日期作种子选 3 条恢复 tips
      const tipsPool = [
        '今天给身体一个修整的机会 — 真正的进步发生在休息时',
        '睡满 7-8 小时,蛋白质达标,水充足。这就是今天的训练',
        '可以散步 30 分钟,或做点轻度拉伸',
        '泡热水澡或做泡沫轴放松,缓解延迟性酸痛',
        '别让"必须练"的执念逼着你训练 — 听身体的',
      ];
      const seed = (new Date().getDate() + day.dayIndex) % tipsPool.length;
      const todayTip = tipsPool[seed];

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
          <div class="row gap mb-8">
            <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent); flex:0 0 18px"><use href="#i-fire"/></svg>
            <h3 style="margin:0">${todayTip}</h3>
          </div>
        </div>
        ${recoveryItems.length ? `
          <div class="section-title">轻度恢复(可选)</div>
          ${recoveryItems.map(it => `
            <div class="card recovery-item">
              <div class="card-row">
                <div>
                  <div class="fw-600">${it.nameZh}</div>
                  <div class="text-xs text-dim">${(it.muscles||[]).join(' · ')}</div>
                </div>
                <button class="btn btn-icon" data-bili-rec="${it.nameZh}" title="看示范">
                  <svg viewBox="0 0 24 24"><use href="#i-link"/></svg>
                </button>
              </div>
              <div class="text-sm text-dim mt-8">${(it.tips||[]).join(' · ')}</div>
            </div>
          `).join('')}` : ''}
        ${nutritionCard(day.nutrition)}
      `;
      // 看示范跳转 B 站
      root().querySelectorAll('[data-bili-rec]').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(btn.dataset.biliRec + ' 标准动作')}`;
          window.open(url, '_blank');
        });
      });
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
          <button class="btn-ghost-mini" data-act="undo-day">撤销</button>
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

    const moodForToday = log.mood || null;
    const moodBlock = !alreadyFinished ? `
      <div class="mood-block">
        <div class="mood-prompt">${moodForToday ? '今天感觉:' : '今天感觉怎么样?'}</div>
        <div class="mood-options">
          <button class="mood-opt ${moodForToday==='great'?'selected':''}" data-mood="great">
            <svg viewBox="0 0 24 24"><use href="#i-mood-great"/></svg><span>状态好</span>
          </button>
          <button class="mood-opt ${moodForToday==='ok'?'selected':''}" data-mood="ok">
            <svg viewBox="0 0 24 24"><use href="#i-mood-ok"/></svg><span>一般</span>
          </button>
          <button class="mood-opt ${moodForToday==='tired'?'selected':''}" data-mood="tired">
            <svg viewBox="0 0 24 24"><use href="#i-mood-low"/></svg><span>疲惫</span>
          </button>
          <button class="mood-opt ${moodForToday==='sore'?'selected':''}" data-mood="sore">
            <svg viewBox="0 0 24 24"><use href="#i-mood-low"/></svg><span>酸痛</span>
          </button>
          <button class="mood-opt ${moodForToday==='low'?'selected':''}" data-mood="low">
            <svg viewBox="0 0 24 24"><use href="#i-mood-low"/></svg><span>低落</span>
          </button>
        </div>
        ${log.moodAdvice ? `<div class="mood-advice"><strong>${log.moodAdvice.coach||'教练'}:</strong>${log.moodAdvice.text}</div>` : ''}
        <div class="mood-freeform">
          <input id="mood-free-input" placeholder="或者直接说:我今天背还酸..." />
          <button class="btn btn-icon" data-act="mood-send" aria-label="发送">
            <svg viewBox="0 0 24 24" width="16" height="16"><use href="#i-arrow-r"/></svg>
          </button>
        </div>
      </div>
    ` : '';

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
            <div class="exercise-meta-item"><strong>${ex.reps}</strong>${ex.timeBased ? '' : '次'}</div>
            <div class="exercise-meta-item">休息<strong style="margin-left:4px">${ex.restSec}</strong>s</div>
            ${weightHint && !ex.timeBased ? `<div class="exercise-meta-item weight-hint">建议<strong style="margin-left:4px">${weightHint}</strong></div>` : ''}
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
            <button class="btn btn-icon" data-act="swap" data-id="${ex.id}" title="换一个">
              <svg viewBox="0 0 24 24"><use href="#i-swap"/></svg>
            </button>
            <button class="btn btn-icon" data-act="note" data-id="${ex.id}" title="备注">
              <svg viewBox="0 0 24 24"><use href="#i-note"/></svg>
            </button>
            <button class="btn btn-icon" data-act="bili" data-name="${ex.nameZh}" title="看示范">
              <svg viewBox="0 0 24 24"><use href="#i-link"/></svg>
            </button>
            <button class="btn btn-sm ${done?'btn-secondary':'btn-primary'}" data-act="toggle" data-id="${ex.id}">
              ${done ? '撤销' : '标记完成'}
            </button>
          </div>
        </div>
      `;
    }).join('');

    const dayCountText = computeJourneyDay(profile);
    root().innerHTML = `
      <div class="today-header">
        <div>
          <div class="greeting">${UI.greeting()}${dayCountText ? ` · ${dayCountText}` : ''}</div>
          <div class="today-date">${dateLabel}</div>
          <div class="today-title">${day.title}</div>
          <div class="today-badge">
            <svg viewBox="0 0 24 24"><use href="#i-flash"/></svg>
            ${completed}/${total} 已完成
          </div>
        </div>
      </div>
      ${heroBlock}
      ${quoteBlock()}
      ${moodBlock}
      ${bodyMapBlock(day)}
      <div id="ai-tip-slot"></div>
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
    renderAITip(profile, todayKey);
    maybeOfferAdaptation(plan, profile, todayKey);
    maybeOfferJournal(todayKey);
    maybeOfferWeightCheckin(todayKey);
  }

  // 每 7 天提一次体重(若上次记录超过 7 天)
  async function maybeOfferWeightCheckin(todayKey) {
    const settings = await Storage.getSettings();
    if (settings.weightPromptDismissedFor === todayKey) return;
    const weights = await Storage.getWeights();
    const entries = (weights && weights.entries) || [];
    if (entries.length === 0) return; // 没记过的不打扰
    const last = entries[entries.length - 1];
    const diffDays = (new Date(todayKey) - new Date(last.date)) / 86400000;
    if (diffDays < 7) return;

    const slot = document.getElementById('ai-tip-slot');
    if (!slot) return;
    const card = document.createElement('div');
    card.className = 'card adapt-card';
    card.innerHTML = `
      <div class="row gap mb-8">
        <svg viewBox="0 0 24 24" width="16" height="16" style="color:var(--accent); flex:0 0 16px"><use href="#i-flash"/></svg>
        <strong>记一下体重?</strong>
      </div>
      <div class="text-sm text-dim mb-12">上次是 ${last.date},${Math.round(diffDays)} 天前。趋势数据会更准。</div>
      <div class="row gap">
        <button class="btn btn-sm btn-secondary flex-1" data-w="dismiss">下次再说</button>
        <button class="btn btn-sm btn-primary flex-1" data-w="go">去记一下</button>
      </div>
    `;
    slot.appendChild(card);
    card.querySelector('[data-w="dismiss"]').addEventListener('click', async () => {
      await Storage.saveSettings({ weightPromptDismissedFor: todayKey });
      card.remove();
    });
    card.querySelector('[data-w="go"]').addEventListener('click', async () => {
      await Storage.saveSettings({ weightPromptDismissedFor: todayKey });
      card.remove();
      await App.switchTab('me');
      setTimeout(() => {
        const addBtn = document.querySelector('[data-act="add-weight"]');
        addBtn?.click();
      }, 250);
    });
  }

  // 周日提示生成本周日记
  async function maybeOfferJournal(todayKey) {
    const today = new Date();
    if (today.getDay() !== 0) return; // 仅周日
    const settings = await Storage.getSettings();
    if (settings.journalPromptShownFor === todayKey) return;
    const journals = await Storage.getJournals();
    const weekStart = Planner.toDateKey(Planner.getMonday(today));
    if (journals.items[weekStart]) return; // 已有日记

    const slot = document.getElementById('ai-tip-slot');
    if (!slot) return;
    const card = document.createElement('div');
    card.className = 'card adapt-card';
    card.innerHTML = `
      <div class="row gap mb-8">
        <svg viewBox="0 0 24 24" width="16" height="16" style="color:var(--accent); flex:0 0 16px"><use href="#i-book"/></svg>
        <strong>本周训练总结</strong>
      </div>
      <div class="text-sm text-dim mb-12">让教练帮你写一篇本周训练日记?</div>
      <div class="row gap">
        <button class="btn btn-sm btn-secondary flex-1" data-journal="dismiss">下次再说</button>
        <button class="btn btn-sm btn-primary flex-1" data-journal="open">看一下</button>
      </div>
    `;
    slot.appendChild(card);
    card.querySelector('[data-journal="dismiss"]').addEventListener('click', async () => {
      await Storage.saveSettings({ journalPromptShownFor: todayKey });
      card.remove();
    });
    card.querySelector('[data-journal="open"]').addEventListener('click', async () => {
      await Storage.saveSettings({ journalPromptShownFor: todayKey });
      card.remove();
      await App.switchTab('me');
      // 模拟点击周报项
      setTimeout(() => {
        document.querySelector('[data-act="open-journal"]')?.click();
      }, 200);
    });
  }

  // 检查昨天有未完成训练日,如果有则提示是否将其顺移
  async function maybeOfferAdaptation(plan, profile, todayKey) {
    if (!plan) return;
    const settings = await Storage.getSettings();
    if (settings.adaptDismissedFor === todayKey) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yKey = Planner.toDateKey(yesterday);
    const yDay = Planner.getDayByDate(plan, yKey);
    if (!yDay || yDay.type === 'rest') return;
    const yLog = await Storage.getLog(yKey);
    if (yLog && yLog.completedAt) return;
    // 有未完成训练日

    // 找未来 3 天里的休息日,询问是否把昨天的搬到那里
    let restDay = null;
    for (let i = 0; i < 4; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const k = Planner.toDateKey(d);
      const day = Planner.getDayByDate(plan, k);
      if (day && day.type === 'rest') { restDay = day; break; }
    }
    if (!restDay) return;

    // 显示一次性提示
    const slot = document.getElementById('ai-tip-slot');
    if (!slot) return;
    const card = document.createElement('div');
    card.className = 'card adapt-card';
    card.innerHTML = `
      <div class="row gap mb-8">
        <svg viewBox="0 0 24 24" width="16" height="16" style="color:var(--accent); flex:0 0 16px"><use href="#i-refresh"/></svg>
        <strong>昨天的训练没完成</strong>
      </div>
      <div class="text-sm text-dim mb-12">把"${yDay.title}"挪到 ${restDay.date}(原本休息日)?</div>
      <div class="row gap">
        <button class="btn btn-sm btn-secondary flex-1" data-adapt="dismiss">这周就算了</button>
        <button class="btn btn-sm btn-primary flex-1" data-adapt="apply">挪一下</button>
      </div>
    `;
    slot.appendChild(card);
    card.querySelector('[data-adapt="dismiss"]').addEventListener('click', async () => {
      await Storage.saveSettings({ adaptDismissedFor: todayKey });
      card.remove();
    });
    card.querySelector('[data-adapt="apply"]').addEventListener('click', async () => {
      const yIdx = plan.days.findIndex(d => d.date === yKey);
      const rIdx = plan.days.findIndex(d => d.date === restDay.date);
      if (yIdx === -1 || rIdx === -1) return;
      // 交换 type / title / exercises / nutrition (保留 date 不变)
      const tmp = {
        type: plan.days[yIdx].type,
        title: plan.days[yIdx].title,
        exercises: plan.days[yIdx].exercises,
        nutrition: plan.days[yIdx].nutrition,
      };
      plan.days[yIdx].type = 'rest';
      plan.days[yIdx].title = Planner.TYPE_TITLES.rest;
      plan.days[yIdx].exercises = [];
      // 营养调整为休息日
      plan.days[yIdx].nutrition = Nutrition.calcMacros(profile, false);

      plan.days[rIdx].type = tmp.type;
      plan.days[rIdx].title = tmp.title;
      plan.days[rIdx].exercises = tmp.exercises;
      plan.days[rIdx].nutrition = Nutrition.calcMacros(profile, true);

      await Storage.savePlan(plan);
      await Storage.saveSettings({ adaptDismissedFor: todayKey });
      UI.toast('计划已调整', { type: 'success', icon: 'i-check' });
      render();
    });
  }

  // 显示 AI 教练点评卡;每天最多调一次 API,缓存在 settings.aiTip
  async function renderAITip(profile, todayKey) {
    const slot = document.getElementById('ai-tip-slot');
    if (!slot) return;
    const settings = await Storage.getSettings();
    const cached = settings.aiTip || {};
    if (cached.date === todayKey && cached.text) {
      slot.innerHTML = aiTipCard(cached.text, false);
      bindAITipCard(profile, todayKey);
      return;
    }
    if (settings.aiTipDisabled) return;

    // 显示初始按钮(用户主动触发,避免无声调用 API)
    slot.innerHTML = `
      <div class="card ai-tip-stub">
        <div class="row gap" style="align-items:center">
          <svg viewBox="0 0 24 24" width="18" height="18" style="color:var(--accent); flex:0 0 18px"><use href="#i-sparkles"/></svg>
          <div class="flex-1 text-sm text-dim">让 AI 教练给一句今日建议?</div>
          <button class="btn btn-sm btn-secondary" id="ai-tip-fetch">来一句</button>
        </div>
      </div>
    `;
    document.getElementById('ai-tip-fetch')?.addEventListener('click', async () => {
      const btn = document.getElementById('ai-tip-fetch');
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const logs = await Storage.listLogs();
        const result = await AIPlanner.coach(profile, logs);
        await Storage.saveSettings({ aiTip: { date: todayKey, text: result.text, at: new Date().toISOString() } });
        slot.innerHTML = aiTipCard(result.text, true);
        bindAITipCard(profile, todayKey);
      } catch (e) {
        UI.toast('AI 暂不可用:' + e.message, { type: 'error', ttl: 3000 });
        btn.disabled = false;
        btn.textContent = '重试';
      }
    });
  }

  function aiTipCard(text, fresh) {
    return `
      <div class="card ai-tip-card">
        <div class="row gap mb-8">
          <svg viewBox="0 0 24 24" width="16" height="16" style="color:var(--accent); flex:0 0 16px"><use href="#i-sparkles"/></svg>
          <span class="text-xs text-dim">AI 教练 · ${fresh?'刚刚':'今日'}</span>
          <span class="flex-1"></span>
          <button class="btn btn-icon" data-act="ai-tip-refresh" title="重新生成" style="width:28px;height:28px">
            <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-refresh"/></svg>
          </button>
        </div>
        <div class="ai-tip-text">${text}</div>
      </div>
    `;
  }

  function bindAITipCard(profile, todayKey) {
    document.querySelector('[data-act="ai-tip-refresh"]')?.addEventListener('click', async () => {
      const btn = document.querySelector('[data-act="ai-tip-refresh"]');
      btn.disabled = true;
      try {
        const logs = await Storage.listLogs();
        const result = await AIPlanner.coach(profile, logs);
        await Storage.saveSettings({ aiTip: { date: todayKey, text: result.text, at: new Date().toISOString() } });
        const slot = document.getElementById('ai-tip-slot');
        slot.innerHTML = aiTipCard(result.text, true);
        bindAITipCard(profile, todayKey);
      } catch (e) {
        UI.toast('生成失败', { type: 'error' });
        btn.disabled = false;
      }
    });
  }

  function computeJourneyDay(profile) {
    if (!profile || !profile.createdAt) return '';
    const start = new Date(profile.createdAt);
    if (isNaN(start.getTime())) return '';
    const now = new Date();
    const diffDays = Math.floor((now - start) / 86400000) + 1;
    if (diffDays <= 0) return '';
    return `第 ${diffDays} 天`;
  }

  function quoteBlock() {
    if (!global.Quotes) return '';
    const q = Quotes.today();
    return `
      <div class="quote-card" id="quote-card">
        <button class="quote-refresh" data-act="quote-refresh" title="换一句">
          <svg viewBox="0 0 24 24" width="14" height="14"><use href="#i-refresh"/></svg>
        </button>
        <div class="quote-mark">"</div>
        <div class="quote-text" id="quote-text">${q.text}</div>
        <div class="quote-by" id="quote-by">— ${q.by}</div>
      </div>
    `;
  }

  function bodyMapBlock(day) {
    const muscles = new Set();
    (day.exercises || []).forEach(e => (e.muscles || []).forEach(() => {}));
    // 用 muscleKeys 而不是中文 muscles
    (day.exercises || []).forEach(e => {
      const def = ExerciseLib.findById(e.id);
      if (def) (def.muscleKeys || []).forEach(k => muscles.add(k));
    });
    if (muscles.size === 0) return '';
    return BodyMap.render([...muscles]);
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

    // 撤销今日完成
    root().querySelector('[data-act="undo-day"]')?.addEventListener('click', async () => {
      const ok = await UI.confirmModal({
        title: '撤销今日完成?',
        text: '记录中的"已完成"标记会被移除,但已记录的组数据保留。',
        okLabel: '撤销',
        danger: false,
      });
      if (!ok) return;
      delete log.completedAt;
      delete log.durationSec;
      await Storage.saveLog(todayKey, log);
      UI.toast('已撤销', { icon: 'i-refresh', ttl: 1500 });
      render();
    });

    document.getElementById('start-workout')?.addEventListener('click', async () => {
      const choice = await chooseTimeBudget(day);
      if (choice === null) return; // 用户取消
      const useDay = choice === 'full' ? day : compressDayToBudget(day, choice);
      await WorkoutMode.start(useDay, log, {
        onFinish: async (finishedLog) => {
          await render();
          if (finishedLog.completedAt) {
            const totalSets = (finishedLog.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
            UI.celebrate(`${day.title} · ${totalSets} 组完成`);
            // AI 寄语异步替换
            try {
              const profile = await Storage.getProfile();
              const res = await AIPlanner.postWorkout(profile, day, finishedLog);
              const sub = document.getElementById('celebration-sub');
              if (sub && res.text) sub.textContent = res.text;
            } catch (e) {}
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

    // 金句刷新
    root().querySelector('[data-act="quote-refresh"]')?.addEventListener('click', () => {
      const q = Quotes.random();
      const t = document.getElementById('quote-text');
      const b = document.getElementById('quote-by');
      if (t) t.textContent = q.text;
      if (b) b.textContent = '— ' + q.by;
      const card = document.getElementById('quote-card');
      if (card) {
        card.classList.remove('quote-flash');
        void card.offsetWidth;
        card.classList.add('quote-flash');
      }
    });

    // 自由输入心情/反馈
    const moodSendBtn = root().querySelector('[data-act="mood-send"]');
    const moodInput = root().querySelector('#mood-free-input');
    if (moodSendBtn && moodInput) {
      const sendFree = async () => {
        const text = moodInput.value.trim();
        if (!text) return;
        moodInput.value = '';
        moodInput.blur();
        const profile = await Storage.getProfile();
        const closeLoading = await UI.showLoadingWithCoach('在听你说');
        try {
          // 复用 chat 流程,让 AI 基于一句话给建议
          const reply = await AIPlanner.chat([{ role: 'user', content: '我今天:' + text }]);
          const coach = await AIPlanner.getCoachIdentity();
          log.moodAdvice = { mood: 'free', text: reply.text, coach: coach.name, freeText: text, at: new Date().toISOString() };
          await Storage.saveLog(todayKey, log);
          closeLoading();
          render();
        } catch (e) {
          closeLoading();
          UI.toast('暂时联不上,稍后再说', { type: 'error' });
        }
      };
      moodSendBtn.addEventListener('click', sendFree);
      moodInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); sendFree(); }
      });
    }

    // 心情打卡
    root().querySelectorAll('[data-mood]').forEach(b => {
      b.addEventListener('click', async () => {
        const mood = b.dataset.mood;
        const wasMood = log.mood;
        log.mood = mood;
        await Storage.saveLog(todayKey, log);
        if (mood !== wasMood) {
          // 调 AI 给建议
          try {
            const profile = await Storage.getProfile();
            const closeLoading = await UI.showLoadingWithCoach('在听你说');
            const advice = await AIPlanner.moodAdvice(profile, day, mood);
            const coach = await AIPlanner.getCoachIdentity();
            log.moodAdvice = { mood, text: advice.text, coach: coach.name, at: new Date().toISOString() };
            await Storage.saveLog(todayKey, log);
            closeLoading();
          } catch (e) {
            // ignore
          }
        }
        render();
      });
    });

    // 换一个动作
    root().querySelectorAll('[data-act="swap"]').forEach(btn => {
      btn.addEventListener('click', () => openSwapPicker(btn.dataset.id, day, log, todayKey));
    });

    // 备注
    root().querySelectorAll('[data-act="note"]').forEach(btn => {
      btn.addEventListener('click', () => openExerciseNote(btn.dataset.id, log, todayKey));
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
        // 成就
        const logs = await Storage.listLogs();
        const settings = await Storage.getSettings();
        const result = Achievements.compute(logs, plan);
        const earnedIds = result.earned.map(a => a.id);
        const newOnes = Achievements.diff(settings.achievements || [], earnedIds);
        await Storage.saveSettings({ achievements: earnedIds });

        // 庆祝(默认文案,异步替换为 AI)
        const profile = await Storage.getProfile();
        const subText = `${day.title} · ${day.exercises.length} 个动作`;
        UI.celebrate(subText);

        AIPlanner.postWorkout(profile, day, log).then(res => {
          const sub = document.getElementById('celebration-sub');
          if (sub && res.text) sub.textContent = res.text;
        }).catch(()=>{});

        if (newOnes.length) {
          // 依次解锁多个
          newOnes.forEach((a, i) => {
            setTimeout(() => UI.unlockAchievement(a), 900 + i * 3500);
          });
        }

        setTimeout(() => render(), 600);
      });
    }
  }

  function chooseTimeBudget(day) {
    const fullMin = estimateDuration(day);
    return new Promise(resolve => {
      UI.showModal(`
        <div class="modal-box">
          <div class="modal-title">今天有多少时间?</div>
          <div class="modal-text">完整计划约需 ${fullMin} 分钟。时间紧也可以挑一个,系统会压缩。</div>
          <div class="budget-grid">
            <button class="budget-opt" data-budget="full">
              <div class="budget-min">${fullMin}</div>
              <div class="budget-label">完整</div>
            </button>
            <button class="budget-opt" data-budget="45">
              <div class="budget-min">45</div>
              <div class="budget-label">中等</div>
            </button>
            <button class="budget-opt" data-budget="30">
              <div class="budget-min">30</div>
              <div class="budget-label">压缩</div>
            </button>
            <button class="budget-opt" data-budget="20">
              <div class="budget-min">20</div>
              <div class="budget-label">极简</div>
            </button>
          </div>
          <div class="modal-actions mt-16">
            <button class="btn btn-secondary btn-block" data-act="cancel">取消</button>
          </div>
        </div>
      `, (modal, close) => {
        modal.querySelectorAll('[data-budget]').forEach(b => {
          b.addEventListener('click', () => {
            const v = b.dataset.budget;
            close();
            resolve(v === 'full' ? 'full' : Number(v));
          });
        });
        modal.querySelector('[data-act="cancel"]').addEventListener('click', () => {
          close();
          resolve(null);
        });
      });
    });
  }

  function compressDayToBudget(day, budgetMin) {
    // 深拷贝
    const copy = JSON.parse(JSON.stringify(day));
    // 策略:从末尾(往往是孤立动作)开始,删 → 减组,直到估算时长 ≤ 预算
    let it = 0;
    while (it++ < 30) {
      const cur = estimateDuration(copy);
      if (cur <= budgetMin) break;
      // 优先削减末尾孤立动作的组数,再考虑删除
      const last = copy.exercises[copy.exercises.length - 1];
      if (!last) break;
      const def = ExerciseLib.findById(last.id);
      const isIsolation = def && !def.isCompound;
      if (last.sets > 2) {
        last.sets -= 1;
      } else if (isIsolation) {
        copy.exercises.pop();
      } else if (last.sets > 2) {
        last.sets -= 1;
      } else {
        copy.exercises.pop();
      }
    }
    // 至少保留 2 个动作
    if (copy.exercises.length < 2 && day.exercises.length >= 2) {
      copy.exercises = day.exercises.slice(0, 2).map(e => ({ ...e, sets: Math.max(2, e.sets - 1) }));
    }
    copy._compressedFrom = day.exercises.length;
    copy._budgetMin = budgetMin;
    copy.title = day.title + ` · ${budgetMin}分钟版`;
    return copy;
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

  // ---------- 动作替换 ----------
  async function openSwapPicker(exId, day, log, todayKey) {
    const profile = await Storage.getProfile();
    const alts = ExerciseLib.alternatives(exId, profile.venue);
    const current = ExerciseLib.findById(exId);

    if (alts.length === 0) {
      UI.toast('没有合适的替代动作', { type: 'error' });
      return;
    }

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">换一个动作</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="text-dim text-sm mb-12">把 <strong>${current.nameZh}</strong> 换成同肌群的:</div>
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
          // 替换计划当天的这个动作
          const plan = await Storage.getPlan();
          const planDay = plan.days.find(d => d.date === todayKey);
          const idx = planDay.exercises.findIndex(e => e.id === exId);
          if (idx === -1) { UI.toast('未找到原动作', { type: 'error' }); return; }
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
          // 清掉那条动作的 log(因为换了)
          if (log.completedExercises) {
            log.completedExercises = log.completedExercises.filter(e => e.id !== exId);
            await Storage.saveLog(todayKey, log);
          }
          UI.toast(`已替换为 ${newEx.nameZh}`, { type: 'success', icon: 'i-check' });
          close();
          render();
        });
      });
    });
  }

  // ---------- 动作备注 ----------
  async function openExerciseNote(exId, log, todayKey) {
    const def = ExerciseLib.findById(exId);
    const exLog = (log.completedExercises || []).find(e => e.id === exId);
    const existing = (exLog && exLog.note) || '';

    UI.showModal(`
      <div class="modal-box">
        <div class="modal-title">${def ? def.nameZh : exId} · 备注</div>
        <div class="modal-text">记录这次的感受 — 比如"今天偏重"、"动作变形"、"姿势找到了"。</div>
        <textarea id="ex-note-input" rows="4" placeholder="写下你的感受..." style="width:100%;background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:12px;outline:none;resize:none">${existing.replace(/[<>&"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c])}</textarea>
        <div class="modal-actions mt-16">
          <button class="btn btn-secondary" data-act="cancel">取消</button>
          <button class="btn btn-primary" data-act="save">保存</button>
        </div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="cancel"]').addEventListener('click', close);
      modal.querySelector('[data-act="save"]').addEventListener('click', async () => {
        const text = modal.querySelector('#ex-note-input').value.trim();
        let entry = (log.completedExercises || []).find(e => e.id === exId);
        if (!entry) {
          entry = { id: exId, done: false, sets: [], note: text };
          log.completedExercises = log.completedExercises || [];
          log.completedExercises.push(entry);
        } else {
          entry.note = text;
        }
        await Storage.saveLog(todayKey, log);
        close();
        UI.toast('备注已保存', { type: 'success', icon: 'i-check' });
        render();
      });
      setTimeout(() => modal.querySelector('#ex-note-input').focus(), 80);
    });
  }

  global.TodayView = { render };
})(window);
