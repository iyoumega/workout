/**
 * AI plan generator — calls AI with profile + exercise library, gets back
 * day-type + exercise-id picks, then materializes into a full Plan
 * (sets/reps/rest from rules, suggestedWeight from WeightRef, names/tips
 * from local exercise library).
 *
 * Falls back to rule-based Planner.generate() if AI fails or returns
 * unparseable / invalid output.
 *
 * Public:
 *   AIPlanner.generate(profile, opts) -> plan  (same shape as Planner.generate)
 *   AIPlanner.coach(profile, recentLogs) -> { text }
 */
(function (global) {

  const TYPE_TITLES = {
    push: '推日 · 胸肩三头', pull: '拉日 · 背二头', legs: '腿日 · 股四/腘绳/臀',
    upper: '上肢日', lower: '下肢日', fullbody: '全身日', rest: '休息日',
  };

  async function generate(profile, opts = {}) {
    try {
      const aiResult = await callPlanAI(profile, opts);
      const plan = materializePlan(aiResult, profile);
      validatePlan(plan, profile);
      return plan;
    } catch (e) {
      console.warn('AIPlanner failed, falling back to rule planner:', e);
      const fallback = Planner.generate(profile);
      fallback.generatorVersion = 'rule-v1-fallback';
      fallback._aiError = e.message;
      return fallback;
    }
  }

  // 教练人设
  async function getCoachIdentity() {
    const settings = await Storage.getSettings();
    const name = settings.coachName || '小橙';
    const tone = settings.coachTone || 'friendly'; // friendly | strict | playful | gentle
    const toneDesc = ({
      friendly: '语气温和、亲切、专业,像可靠的朋友',
      strict: '语气直接、严格、不啰嗦,像严师',
      playful: '语气幽默、俏皮、有梗,但不失专业',
      gentle: '语气温柔、耐心、鼓励性强,像陪伴者',
    })[tone] || '语气温和、专业';
    return { name, tone, toneDesc };
  }

  async function callPlanAI(profile, opts) {
    const venue = profile.venue;
    const lib = ExerciseLib.byVenue(venue).map(e => ({
      id: e.id,
      name: e.nameZh,
      muscles: e.muscleKeys.join(','),
      compound: e.isCompound,
    }));

    const focusLabels = (profile.focusAreas || []).map(id => {
      const g = ExerciseLib.FOCUS_GROUPS.find(x => x.id === id);
      return g ? g.label : id;
    });

    const goalText = ({
      fat_loss: '减脂(降体脂、保留肌肉)',
      muscle_gain: '增肌(肌肉量、力量提升)',
      shape: '塑形(紧致线条、轻度减脂)',
      maintain: '维持现状',
    })[profile.goal] || profile.goal;

    const expText = ({
      beginner: '新手(系统训练 < 6 个月)',
      intermediate: '有基础(6 个月以上)',
      advanced: '高级(2 年以上)',
    })[profile.experience] || profile.experience;

    const venueText = ({
      gym: '健身房(全器械)',
      home_dumbbell: '家里(只有哑铃)',
      home_bodyweight: '家里(纯徒手)',
    })[venue] || venue;

    const coach = await getCoachIdentity();
    const sys = `你是用户的私教"${coach.name}"。${coach.toneDesc}。根据用户档案,从给定的动作库里选动作,生成 7 天训练计划。

硬性规则:
- 训练日数量必须等于用户的"每周训练天数"
- 训练日和休息日合计 7 天,以周一为第 0 天
- 每个训练日 4-6 个动作,复合动作排在前面,孤立动作在后
- type 只能是: push / pull / legs / upper / lower / fullbody / rest
- 新手优先 fullbody 或 upper/lower 分化(避免推/拉/腿这种细分)
- 重点部位的肌群,在相关日多排 1 个动作
- 只能从动作库选,exerciseIds 用动作的 id
- 同一周内同部位不要在连续两天

输出严格 JSON,结构:
{
  "days": [
    { "dayIndex": 0, "type": "push", "title": "推日 · 胸肩三头", "exerciseIds": ["bench_press", "..."] },
    { "dayIndex": 1, "type": "rest", "title": "休息日", "exerciseIds": [] },
    ...总共 7 天
  ],
  "rationale": "一句话说明你的安排思路(50字内)"
}`;

    const user = `用户档案:
- 性别/年龄/身高/体重: ${profile.basics.gender === 'female' ? '女' : '男'} / ${profile.basics.age}岁 / ${profile.basics.height}cm / ${profile.basics.weight}kg
- 训练目标: ${goalText}
- 训练经验: ${expText}
- 每周训练天数: ${profile.daysPerWeek} 天
- 训练场地: ${venueText}
- 重点想练: ${focusLabels.length ? focusLabels.join('、') : '全身均衡'}

可用动作库 (共 ${lib.length} 个,id|名称|肌群|是否复合):
${lib.map(e => `${e.id}|${e.name}|${e.muscles}|${e.compound?'复合':'孤立'}`).join('\n')}

请输出 JSON 格式的 7 天计划。`;

    return await AI.json(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { model: opts.model || 'deepseek-chat', temperature: 0.4, maxTokens: 2200 }
    );
  }

  function materializePlan(aiResult, profile) {
    if (!aiResult || !Array.isArray(aiResult.days)) {
      throw new Error('AI 返回结构错误');
    }

    const start = Planner.getMonday();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const aiDay = aiResult.days.find(d => d.dayIndex === i) || aiResult.days[i] || { dayIndex: i, type: 'rest' };
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateKey = Planner.toDateKey(date);
      const type = aiDay.type;
      const title = aiDay.title || TYPE_TITLES[type] || '训练日';
      const isTraining = type !== 'rest';

      let exercises = [];
      if (isTraining && Array.isArray(aiDay.exerciseIds)) {
        const focusMuscles = new Set(ExerciseLib.focusToMuscleKeys(profile.focusAreas || []));
        const seen = new Set();
        aiDay.exerciseIds.forEach(id => {
          if (seen.has(id)) return;
          const ex = ExerciseLib.findById(id);
          if (!ex) return; // 丢弃 AI 编造的不存在 id
          if (!ex.venues.includes(profile.venue)) return; // 场地不匹配
          seen.add(id);
          const isFocus = ex.muscleKeys.some(k => focusMuscles.has(k));
          const sets = setsForExperience(profile.experience, ex.isCompound) + (isFocus && !ex.isCompound ? 1 : 0);
          const suggestedWeight = WeightRef.suggest(ex.id, profile);
          exercises.push({
            id: ex.id,
            nameZh: ex.nameZh,
            nameEn: ex.nameEn,
            muscles: ex.muscles,
            sets,
            reps: repsForGoal(profile.goal, ex.isCompound),
            restSec: restForGoal(profile.goal, ex.isCompound),
            suggestedWeight,
            isFocus,
            tips: ex.tips,
            imageUrl: ex.imageUrl,
          });
        });

        // compounds first
        exercises.sort((a, b) => {
          const ad = ExerciseLib.findById(a.id);
          const bd = ExerciseLib.findById(b.id);
          if (ad.isCompound === bd.isCompound) return 0;
          return ad.isCompound ? -1 : 1;
        });
      }

      const nutrition = Nutrition.calcMacros(profile, isTraining);

      days.push({
        dayIndex: i,
        date: dateKey,
        type,
        title,
        exercises,
        nutrition,
      });
    }

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      generatorVersion: 'ai-v1',
      generatorModel: 'deepseek-chat',
      profileSnapshot: JSON.parse(JSON.stringify(profile)),
      weekStartDate: Planner.toDateKey(start),
      days,
      rationale: aiResult.rationale || '',
    };
  }

  function validatePlan(plan, profile) {
    const trainingDays = plan.days.filter(d => d.type !== 'rest').length;
    if (trainingDays === 0) {
      throw new Error('AI 生成的计划没有训练日');
    }
    // 容差:目标天数 ±1 都接受
    if (Math.abs(trainingDays - profile.daysPerWeek) > 1) {
      throw new Error(`AI 计划训练日数 ${trainingDays} 与目标 ${profile.daysPerWeek} 偏差太大`);
    }
    // 每个训练日都得有动作
    const emptyDay = plan.days.find(d => d.type !== 'rest' && d.exercises.length === 0);
    if (emptyDay) {
      throw new Error('AI 生成的训练日没有动作');
    }
  }

  // 复用 planner.js 里的强度规则
  function repsForGoal(goal, isCompound) {
    if (goal === 'muscle_gain') return isCompound ? '6-10' : '10-12';
    if (goal === 'fat_loss')    return isCompound ? '10-12' : '12-15';
    if (goal === 'shape')       return isCompound ? '8-12' : '12-15';
    return isCompound ? '8-12' : '10-12';
  }
  function setsForExperience(experience, isCompound) {
    if (experience === 'beginner')   return isCompound ? 3 : 2;
    if (experience === 'intermediate') return isCompound ? 4 : 3;
    return isCompound ? 4 : 3;
  }
  function restForGoal(goal, isCompound) {
    if (goal === 'fat_loss') return isCompound ? 75 : 45;
    if (goal === 'muscle_gain') return isCompound ? 120 : 75;
    if (goal === 'shape') return isCompound ? 90 : 60;
    return isCompound ? 90 : 60;
  }

  // ---------- 教练点评(用 coach 人设)----------
  async function coach(profile, recentLogs) {
    const id = await getCoachIdentity();
    const sys = `你是用户的私教"${id.name}"。${id.toneDesc}。给用户一句简短的训练建议或鼓励(中文,40-80 字,不要 markdown,不要 emoji)。可以表扬、提醒、或针对最近表现给具体建议。`;

    const goalText = ({ fat_loss:'减脂', muscle_gain:'增肌', shape:'塑形', maintain:'维持' })[profile.goal];
    const recentSummary = summarizeRecent(recentLogs);

    const user = `用户:${profile.basics.gender==='female'?'女':'男'}, ${profile.basics.age}岁, ${profile.basics.weight}kg, 目标${goalText}, 每周${profile.daysPerWeek}天.
最近 7 天训练: ${recentSummary}

请用一句话给个建议或鼓励。`;

    const result = await AI.chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { model: 'deepseek-chat', temperature: 0.7, maxTokens: 200 }
    );
    return { text: (result.text || '').trim() };
  }

  function summarizeRecent(logs, days) {
    const today = new Date();
    const cutoff = new Date(today); cutoff.setDate(today.getDate() - (days || 7));
    const recent = Object.entries(logs || {})
      .filter(([k, l]) => l && l.completedAt && new Date(k) >= cutoff)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!recent.length) return '最近没有完成的训练';
    return recent.map(([date, log]) => {
      const sets = (log.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
      return `${date}(${sets}组)`;
    }).join(', ');
  }

  // ---------- 全功能聊天(带上下文)----------
  async function chat(messages) {
    const profile = await Storage.getProfile();
    const plan = await Storage.getPlan();
    const logs = await Storage.listLogs();
    const weights = await Storage.getWeights();
    const coach = await getCoachIdentity();

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayDay = plan ? Planner.getDayByDate(plan, todayKey) : null;
    const recentLogSummary = summarizeRecent(logs, 7);
    const latestWeight = (weights.entries && weights.entries.length) ? weights.entries[weights.entries.length-1].kg : null;

    const sysContent = `你是用户的专属健身教练,名字叫"${coach.name}"。${coach.toneDesc}。

用户档案:
- 性别/年龄: ${profile.basics.gender==='female'?'女':'男'} / ${profile.basics.age}岁
- 身高/体重: ${profile.basics.height}cm / ${profile.basics.weight}kg${latestWeight && Math.abs(latestWeight-profile.basics.weight)>0.5 ? ' (最近称重 ' + latestWeight + 'kg)' : ''}
- 目标: ${profile.goal}, 经验: ${profile.experience}, 每周 ${profile.daysPerWeek} 天, 场地: ${profile.venue}
- 重点部位: ${(profile.focusAreas||[]).join('、') || '无特别偏好'}

今天的训练: ${todayDay ? (todayDay.type === 'rest' ? '休息日' : todayDay.title + '(' + todayDay.exercises.map(e=>e.nameZh).join('、') + ')') : '未排'}

最近 7 天: ${recentLogSummary}

回复要求:
- 中文,简洁直接,通常 1-3 段,80-200 字之间
- 不用 markdown,不用列表符号,自然语句
- 给具体建议,不空泛
- 鼓励但不油腻
- 如果用户问的是计划调整(换动作、加重量、休息),给出明确的回答
- 不要每次都问候开场,直接给内容`;

    const aiMessages = [
      { role: 'system', content: sysContent },
      ...messages.slice(-12).map(m => ({ role: m.role, content: m.content })),
    ];

    const result = await AI.chat(aiMessages, {
      model: 'deepseek-chat',
      temperature: 0.7,
      maxTokens: 600,
    });
    return { text: (result.text || '').trim() };
  }

  // ---------- 周报(长篇叙事)----------
  async function weeklyJournal(weekStartDate) {
    const profile = await Storage.getProfile();
    const plan = await Storage.getPlan();
    const allLogs = await Storage.listLogs();
    const weights = await Storage.getWeights();
    const coach = await getCoachIdentity();

    const start = new Date(weekStartDate);
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d.toISOString().slice(0,10));
    }
    const weekLogs = dates.map(d => ({ date: d, log: allLogs[d] }));
    const weekWeights = (weights.entries || []).filter(e => dates.includes(e.date));

    const summary = weekLogs.map(({ date, log }) => {
      if (!log || !log.completedAt) {
        const dayInPlan = plan ? Planner.getDayByDate(plan, date) : null;
        return `${date}: ${dayInPlan ? (dayInPlan.type==='rest'?'休息日':'未完成 ' + dayInPlan.title) : '无计划'}`;
      }
      const sets = (log.completedExercises || []).reduce((s,e) => s+(e.sets?e.sets.length:0), 0);
      const reps = (log.completedExercises || []).reduce((s,e) => s+(e.sets||[]).reduce((a,b)=>a+(b.reps||0),0), 0);
      const dur = log.durationSec ? Math.round(log.durationSec/60) + '分钟' : '';
      return `${date}: 完成 ${sets}组 ${reps}次 ${dur}`;
    }).join('\n');

    const weightChange = weekWeights.length >= 2
      ? `本周体重 ${weekWeights[0].kg}kg → ${weekWeights[weekWeights.length-1].kg}kg`
      : (weekWeights.length === 1 ? `本周体重 ${weekWeights[0].kg}kg` : '');

    const sys = `你是用户的私教"${coach.name}"。${coach.toneDesc}。

请为用户写一篇本周训练日记,300-500 字,中文,自然散文体,不要 markdown。

要求:
- 真诚地描述这一周用户做了什么、有什么亮点、有什么遗憾
- 不要列条目,要像朋友写信
- 给一个本周的高光时刻
- 一句下周的鼓励或具体建议
- 称呼用户用"你"`;

    const user = `用户档案: ${profile.basics.gender==='female'?'女':'男'}, ${profile.basics.age}岁, 目标${profile.goal}, ${profile.experience}水平
本周(从 ${weekStartDate} 起)训练记录:
${summary}
${weightChange}

请写一篇本周日记。`;

    const result = await AI.chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { model: 'deepseek-chat', temperature: 0.75, maxTokens: 900 }
    );
    return { text: (result.text || '').trim() };
  }

  // ---------- 当日心情 → 计划调整建议 ----------
  async function moodAdvice(profile, day, mood) {
    const coach = await getCoachIdentity();
    const moodLabels = {
      great: '精力充沛、状态很好',
      ok: '一般、还行',
      tired: '有些疲惫',
      sore: '昨天的训练还在酸痛',
      low: '心情低落、动力不足',
    };
    const moodLabel = moodLabels[mood] || mood;

    const sys = `你是私教"${coach.name}"。${coach.toneDesc}。
根据用户今天的状态,给出 60-100 字的中文建议(不用 markdown)。如果状态不佳,可以建议:减少组数/重量/换轻松动作/改成休息。如果状态很好,可以鼓励冲击 PR 或加点强度。要具体、有建设性。`;

    const exercises = (day && day.exercises) ? day.exercises.map(e => e.nameZh).join('、') : '';
    const user = `今天计划是: ${day ? day.title : '休息'} (${exercises})
用户感觉: ${moodLabel}
目标: ${profile.goal}, 经验: ${profile.experience}

请给一句具体的训练建议。`;

    const result = await AI.chat(
      [{ role: 'system', content: sys }, { role: 'user', content: user }],
      { model: 'deepseek-chat', temperature: 0.6, maxTokens: 250 }
    );
    return { text: (result.text || '').trim() };
  }

  // ---------- 体态分析 ----------
  async function analyzePhysique(photos, profile) {
    const validPhotos = ['front', 'side', 'back']
      .filter(k => photos && photos[k])
      .map(k => ({ key: k, src: photos[k] }));
    if (!validPhotos.length) throw new Error('需要至少一张体态照片');

    const goalText = ({ fat_loss:'减脂', muscle_gain:'增肌', shape:'塑形', maintain:'维持' })[profile.goal];
    const labelMap = { front: '正面', side: '侧面', back: '背面' };
    const prompt = `这是一名${profile.basics.gender==='female'?'女性':'男性'}用户的体态照片(${validPhotos.map(p=>labelMap[p.key]).join(',')})。
基础信息: 身高 ${profile.basics.height}cm, 体重 ${profile.basics.weight}kg, 训练目标:${goalText}.

请进行简短的体态评估(中文, 200 字以内, 不要 markdown):
1. 整体观察(体型、姿态)
2. 主要优点
3. 可改善方向(2-3 点具体建议)

语气专业但友善, 鼓励性。不要做医疗诊断。`;

    // qwen-vl-max 当前只支持单张图,选第一张
    const first = validPhotos[0];
    const result = await AI.vision(first.src, prompt, { model: 'qwen-vl-max', maxTokens: 600 });
    return { text: (result.text || '').trim(), photoUsed: first.key };
  }

  global.AIPlanner = { generate, coach, chat, weeklyJournal, moodAdvice, analyzePhysique, getCoachIdentity };
})(window);
