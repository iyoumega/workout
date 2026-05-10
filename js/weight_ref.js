/**
 * Weight reference — suggest a starting weight (kg) for an exercise based on
 * user's body weight, gender, and experience.
 *
 * Public:
 *   WeightRef.suggest(exerciseId, profile) -> number | null
 *   WeightRef.format(kg, exercise) -> string  e.g. "20 kg / 手"  for dumbbell-per-hand
 *
 * Reference multipliers are *rough* benchmarks for healthy adults, not strict
 * targets. Female users get a 0.75× adjustment.
 */
(function (global) {

  // multiplier of body weight (kg). For dumbbells: per-hand.
  const PROFILES = {
    // 杠铃复合
    squat:        { beginner: 0.80, intermediate: 1.20, advanced: 1.60 },
    leg_press:    { beginner: 1.50, intermediate: 2.50, advanced: 3.50 },
    deadlift:     { beginner: 1.00, intermediate: 1.50, advanced: 2.00 },
    rdl:          { beginner: 0.70, intermediate: 1.10, advanced: 1.50 },
    bench:        { beginner: 0.60, intermediate: 0.90, advanced: 1.30 },
    incline_bench:{ beginner: 0.50, intermediate: 0.75, advanced: 1.10 },
    ohp:          { beginner: 0.40, intermediate: 0.60, advanced: 0.90 },
    row:          { beginner: 0.50, intermediate: 0.80, advanced: 1.10 },
    curl_bb:      { beginner: 0.20, intermediate: 0.30, advanced: 0.45 },
    hip_thrust:   { beginner: 0.80, intermediate: 1.40, advanced: 2.20 },

    // 哑铃(每只手的重量)
    db_bench:     { beginner: 0.20, intermediate: 0.32, advanced: 0.50 },
    db_ohp:       { beginner: 0.15, intermediate: 0.25, advanced: 0.40 },
    db_row:       { beginner: 0.20, intermediate: 0.30, advanced: 0.45 },
    db_squat:     { beginner: 0.25, intermediate: 0.40, advanced: 0.60 }, // goblet 单铃
    db_split:     { beginner: 0.10, intermediate: 0.20, advanced: 0.35 },
    db_fly:       { beginner: 0.10, intermediate: 0.18, advanced: 0.28 },
    db_curl:      { beginner: 0.08, intermediate: 0.13, advanced: 0.20 },
    lateral:      { beginner: 0.04, intermediate: 0.07, advanced: 0.12 },
    rear_delt:    { beginner: 0.03, intermediate: 0.06, advanced: 0.10 },
    oh_tri:       { beginner: 0.10, intermediate: 0.18, advanced: 0.28 },
    kb_swing:     { beginner: 0.20, intermediate: 0.30, advanced: 0.45 },

    // 绳索 / 器械
    cable_pull:   { beginner: 0.40, intermediate: 0.65, advanced: 0.95 },
    cable_push:   { beginner: 0.20, intermediate: 0.32, advanced: 0.48 },
    face_pull:    { beginner: 0.15, intermediate: 0.25, advanced: 0.38 },
    leg_curl:     { beginner: 0.25, intermediate: 0.40, advanced: 0.60 },
    calf:         { beginner: 0.20, intermediate: 0.40, advanced: 0.70 }, // 站姿提踵(单铃负重)
  };

  // 哪些 profile 是"按只哑铃记"
  const PER_HAND_PROFILES = new Set([
    'db_bench', 'db_ohp', 'db_row', 'db_split', 'db_fly', 'db_curl',
    'lateral', 'rear_delt',
  ]);

  function suggest(exerciseId, profile) {
    if (!profile || !profile.basics) return null;
    const ex = ExerciseLib.findById(exerciseId);
    if (!ex || !ex.weightProfile) return null;
    const p = PROFILES[ex.weightProfile];
    if (!p) return null;
    const mult = p[profile.experience];
    if (mult == null) return null;
    let kg = mult * profile.basics.weight;
    if (profile.basics.gender === 'female') kg *= 0.75;
    // 取整:杠铃按 2.5 步进,小哑铃按 1 步进
    if (PER_HAND_PROFILES.has(ex.weightProfile)) {
      kg = Math.max(2, Math.round(kg));
    } else {
      kg = Math.max(5, Math.round(kg / 2.5) * 2.5);
    }
    return kg;
  }

  function isPerHand(exerciseId) {
    const ex = ExerciseLib.findById(exerciseId);
    return ex && PER_HAND_PROFILES.has(ex.weightProfile);
  }

  function format(kg, exerciseId) {
    if (kg == null) return null;
    return isPerHand(exerciseId) ? `${kg}kg / 只` : `${kg}kg`;
  }

  /**
   * Progression hint: 根据最近一次该动作的完成情况,建议下次重量调整。
   * @param {string} exerciseId
   * @param {Object} allLogs - { dateKey: log }
   * @param {Object} thisExLog - 当前动作日志(可空,表示尚未做过当次)
   * @returns {Object|null} { lastWeight, lastReps, suggestedWeight, message }
   */
  function progressionHint(exerciseId, allLogs, thisExLog) {
    // 找最近一次有 weight 数据的同动作日志
    const dates = Object.keys(allLogs || {}).sort((a,b) => b.localeCompare(a));
    let lastSets = null;
    let lastDate = null;
    for (const d of dates) {
      const log = allLogs[d];
      if (!log || !log.completedExercises) continue;
      const entry = log.completedExercises.find(e => e.id === exerciseId && e.sets && e.sets.length);
      if (!entry) continue;
      const withWeight = entry.sets.filter(s => s.weight && s.weight > 0);
      if (!withWeight.length) continue;
      lastSets = entry.sets;
      lastDate = d;
      break;
    }
    if (!lastSets) return null;

    const lastWeight = lastSets[0].weight;
    const lastRepsArr = lastSets.map(s => s.reps).filter(r => r);
    const avgReps = lastRepsArr.length ? Math.round(lastRepsArr.reduce((a,b)=>a+b,0) / lastRepsArr.length) : null;

    // 简单判断:如果所有组都达到了 8+ 次,建议加重;如果都低于 6 次,建议减;否则持平
    let suggestedWeight = lastWeight;
    let message = '';
    if (avgReps != null) {
      if (avgReps >= 10) {
        suggestedWeight = lastWeight + (lastWeight >= 50 ? 5 : 2.5);
        message = `上次 ${lastWeight}kg×${avgReps},今天可以试 ${suggestedWeight}kg`;
      } else if (avgReps < 6) {
        suggestedWeight = Math.max(lastWeight - 2.5, 0);
        message = `上次 ${lastWeight}kg×${avgReps},强度有点大,降到 ${suggestedWeight}kg 再冲一下`;
      } else {
        message = `上次 ${lastWeight}kg×${avgReps},今天保持`;
      }
    }
    return { lastWeight, lastReps: avgReps, suggestedWeight, message, lastDate };
  }

  global.WeightRef = { suggest, format, isPerHand, PROFILES, progressionHint };
})(window);
