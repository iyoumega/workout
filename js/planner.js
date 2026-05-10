/**
 * Planner: rule-based 7-day plan generator.
 *
 * Public:
 *   Planner.generate(profile, weekStartDate?) -> plan
 *
 * To swap to AI later, replace generate() to call API and emit the same shape.
 */
(function (global) {

  // ---- Day-type patterns by daysPerWeek (Mon..Sun) ----
  // beginner is forced to whole-body / upper-lower style
  const SPLITS = {
    beginner: {
      3: ['fullbody','rest','fullbody','rest','fullbody','rest','rest'],
      4: ['upper','lower','rest','upper','lower','rest','rest'],
      5: ['upper','lower','rest','upper','lower','fullbody','rest'],
      6: ['upper','lower','fullbody','upper','lower','fullbody','rest'],
    },
    intermediate: {
      3: ['fullbody','rest','fullbody','rest','fullbody','rest','rest'],
      4: ['upper','lower','rest','upper','lower','rest','rest'],
      5: ['push','pull','legs','rest','upper','lower','rest'],
      6: ['push','pull','legs','push','pull','legs','rest'],
    },
    advanced: {
      3: ['push','pull','rest','legs','rest','rest','rest'],
      4: ['upper','lower','rest','upper','lower','rest','rest'],
      5: ['push','pull','legs','upper','lower','rest','rest'],
      6: ['push','pull','legs','push','pull','legs','rest'],
    },
  };

  const TYPE_TITLES = {
    push:    '推日 · 胸肩三头',
    pull:    '拉日 · 背二头',
    legs:    '腿日 · 股四/腘绳/臀',
    upper:   '上肢日',
    lower:   '下肢日',
    fullbody:'全身日',
    rest:    '休息日',
  };

  // ---- Reps/sets profile by goal & experience ----
  function repsForGoal(goal, isCompound) {
    if (goal === 'muscle_gain') return isCompound ? '6-10' : '10-12';
    if (goal === 'fat_loss')    return isCompound ? '10-12' : '12-15';
    if (goal === 'shape')       return isCompound ? '8-12' : '12-15';
    return isCompound ? '8-12' : '10-12'; // maintain
  }
  function setsForExperience(experience, isCompound) {
    if (experience === 'beginner')   return isCompound ? 3 : 2;
    if (experience === 'intermediate') return isCompound ? 4 : 3;
    return isCompound ? 4 : 3; // advanced (could be 5 but keep volume sane)
  }
  function restForGoal(goal, isCompound) {
    if (goal === 'fat_loss') return isCompound ? 75 : 45;
    if (goal === 'muscle_gain') return isCompound ? 120 : 75;
    if (goal === 'shape') return isCompound ? 90 : 60;
    return isCompound ? 90 : 60;
  }

  // ---- Pick exercises for a day type ----
  function pickExercises(dayType, profile) {
    const venue = profile.venue;
    const all = ExerciseLib.byDayType(dayType, venue);
    if (!all.length) return [];

    // Group by muscleKey for balanced coverage.
    const targetMuscles = ExerciseLib.TYPE_TO_MUSCLES[dayType] || [];
    const buckets = {};
    targetMuscles.forEach(m => buckets[m] = []);
    all.forEach(ex => {
      ex.muscleKeys.forEach(m => { if (buckets[m]) buckets[m].push(ex); });
    });

    // Pick: 1 compound + 1 isolation per muscle group (capped by total count).
    const targetCount = (() => {
      if (dayType === 'fullbody') return profile.experience === 'beginner' ? 4 : 5;
      if (dayType === 'upper' || dayType === 'lower') return 5;
      return 5; // push/pull/legs
    })();

    const chosen = [];
    const seen = new Set();

    // 1st pass: compound for each target muscle
    for (const m of targetMuscles) {
      const compounds = (buckets[m] || []).filter(e => e.isCompound && !seen.has(e.id));
      if (compounds.length) {
        const pick = compounds[hash(profile, dayType, m) % compounds.length];
        chosen.push(pick); seen.add(pick.id);
        if (chosen.length >= targetCount) break;
      }
    }
    // 2nd pass: isolation to fill
    for (const m of targetMuscles) {
      if (chosen.length >= targetCount) break;
      const isos = (buckets[m] || []).filter(e => !e.isCompound && !seen.has(e.id));
      if (isos.length) {
        const pick = isos[hash(profile, dayType, m, 'iso') % isos.length];
        chosen.push(pick); seen.add(pick.id);
      }
    }
    // 3rd pass: anything else
    for (const ex of all) {
      if (chosen.length >= targetCount) break;
      if (!seen.has(ex.id)) { chosen.push(ex); seen.add(ex.id); }
    }

    // Compounds before isolations, otherwise preserve insertion order
    chosen.sort((a, b) => {
      if (a.isCompound === b.isCompound) return 0;
      return a.isCompound ? -1 : 1;
    });

    // Materialize with sets/reps/rest
    return chosen.map(ex => ({
      id: ex.id,
      nameZh: ex.nameZh,
      nameEn: ex.nameEn,
      muscles: ex.muscles,
      sets: setsForExperience(profile.experience, ex.isCompound),
      reps: repsForGoal(profile.goal, ex.isCompound),
      restSec: restForGoal(profile.goal, ex.isCompound),
      tips: ex.tips,
      imageUrl: ex.imageUrl,
    }));
  }

  // Stable-ish "hash" so repeated generations give same picks for same profile.
  function hash(profile, ...parts) {
    const s = [profile.goal, profile.experience, profile.venue, profile.daysPerWeek, ...parts].join('|');
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  // ---- Date helpers ----
  function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function getMonday(d = new Date()) {
    const date = new Date(d);
    date.setHours(0,0,0,0);
    const dow = date.getDay(); // 0 Sun..6 Sat
    const diff = dow === 0 ? -6 : 1 - dow;
    date.setDate(date.getDate() + diff);
    return date;
  }

  // ---- Generate ----
  function generate(profile, weekStartDate) {
    const start = weekStartDate ? new Date(weekStartDate) : getMonday();
    const splitTable = SPLITS[profile.experience] || SPLITS.intermediate;
    const pattern = splitTable[profile.daysPerWeek] || splitTable[3];

    const days = pattern.map((type, idx) => {
      const date = new Date(start);
      date.setDate(start.getDate() + idx);
      const dateKey = toDateKey(date);
      const isTraining = type !== 'rest';
      const exercises = isTraining ? pickExercises(type, profile) : [];
      const nutrition = Nutrition.calcMacros(profile, isTraining);
      return {
        dayIndex: idx,
        date: dateKey,
        type,
        title: TYPE_TITLES[type],
        exercises,
        nutrition,
      };
    });

    return {
      version: 1,
      generatedAt: new Date().toISOString(),
      generatorVersion: 'rule-v1',
      profileSnapshot: JSON.parse(JSON.stringify(profile)),
      weekStartDate: toDateKey(start),
      days,
    };
  }

  // Get day from plan by date (string YYYY-MM-DD)
  function getDayByDate(plan, dateKey) {
    if (!plan) return null;
    return plan.days.find(d => d.date === dateKey) || null;
  }

  // Check whether plan covers the given date
  function planCoversDate(plan, dateKey) {
    if (!plan) return false;
    return !!plan.days.find(d => d.date === dateKey);
  }

  global.Planner = {
    generate, getDayByDate, planCoversDate,
    toDateKey, getMonday, TYPE_TITLES, SPLITS,
  };
})(window);
