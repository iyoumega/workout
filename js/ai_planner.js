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

    const sys = `你是一名经验丰富的私人健身教练。根据用户档案,从给定的动作库里选动作,生成 7 天训练计划。

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

  // ---------- 教练点评 ----------
  async function coach(profile, recentLogs) {
    const sys = `你是一名亲和的私人健身教练。给用户一句简短的训练建议或鼓励(中文,40-80 字,不要 markdown)。语气真诚、专业、不啰嗦。可以表扬、提醒、或针对最近表现给具体建议。`;

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

  function summarizeRecent(logs) {
    const today = new Date();
    const cutoff = new Date(today); cutoff.setDate(today.getDate() - 7);
    const recent = Object.entries(logs || {})
      .filter(([k, l]) => l && l.completedAt && new Date(k) >= cutoff)
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (!recent.length) return '最近 7 天没有完成的训练';
    return recent.map(([date, log]) => {
      const sets = (log.completedExercises || []).reduce((s, e) => s + (e.sets ? e.sets.length : 0), 0);
      return `${date}(${sets}组)`;
    }).join(', ');
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

  global.AIPlanner = { generate, coach, analyzePhysique };
})(window);
