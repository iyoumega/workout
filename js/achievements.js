/**
 * Achievements engine — pure function based on logs.
 *
 * Public:
 *   Achievements.compute(logs, plan) -> { earned: [{id,title,desc,date}], all: [...] }
 *   Achievements.diff(prevIds, currentIds) -> [newly earned achievement objects]
 */
(function (global) {

  // 定义池
  const POOL = [
    { id: 'first_workout',    title: '迈出第一步', desc: '完成第一次训练',         icon: 'i-flash' },
    { id: 'first_week',       title: '坚持一周',   desc: '7 天内完成 3 次训练',    icon: 'i-fire' },
    { id: 'streak_3',         title: '连续 3 天',  desc: '连续打卡 3 天',          icon: 'i-fire' },
    { id: 'streak_7',         title: '连续 7 天',  desc: '连续打卡 7 天',          icon: 'i-fire' },
    { id: 'streak_30',        title: '连续 30 天', desc: '连续打卡 30 天',         icon: 'i-fire' },
    { id: 'total_10',         title: '十次',       desc: '完成 10 次训练',         icon: 'i-flash' },
    { id: 'total_30',         title: '三十次',     desc: '完成 30 次训练',         icon: 'i-flash' },
    { id: 'total_100',        title: '百次达成',   desc: '完成 100 次训练',        icon: 'i-flash' },
    { id: 'all_splits',       title: '全身覆盖',   desc: '完成过推/拉/腿三种训练', icon: 'i-dumbbell' },
    { id: 'morning_bird',     title: '晨练勇士',   desc: '在 8 点前完成一次训练',  icon: 'i-today' },
    { id: 'late_warrior',     title: '夜战士',     desc: '在 22 点后完成一次训练', icon: 'i-clock' },
    { id: 'perfect_week',     title: '完美一周',   desc: '一周内所有训练日全部打卡', icon: 'i-check' },
  ];

  function compute(logs, plan) {
    const completedLogs = Object.entries(logs)
      .filter(([_, l]) => l && l.completedAt)
      .map(([date, l]) => ({ date, ...l }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const total = completedLogs.length;

    // streak (longest historical streak)
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate = null;
    completedLogs.forEach(l => {
      if (!prevDate) { currentStreak = 1; }
      else {
        const diff = dayDiff(prevDate, l.date);
        if (diff <= 2) currentStreak++; // 允许跨休息日
        else currentStreak = 1;
      }
      longestStreak = Math.max(longestStreak, currentStreak);
      prevDate = l.date;
    });

    const splitsCovered = new Set();
    let morningBird = false;
    let lateWarrior = false;

    completedLogs.forEach(l => {
      // 通过 dayIndex / 计划类型判断
      if (plan && plan.days) {
        const day = plan.days.find(d => d.date === l.date);
        if (day) {
          if (['push', 'upper', 'fullbody'].includes(day.type)) splitsCovered.add('push');
          if (['pull', 'upper', 'fullbody'].includes(day.type)) splitsCovered.add('pull');
          if (['legs', 'lower', 'fullbody'].includes(day.type)) splitsCovered.add('legs');
        }
      }
      if (l.completedAt) {
        const h = new Date(l.completedAt).getHours();
        if (h < 8) morningBird = true;
        if (h >= 22) lateWarrior = true;
      }
    });

    // first week: 3+ workouts in first 7 days from earliest log
    let firstWeek = false;
    if (completedLogs.length >= 3) {
      const start = completedLogs[0].date;
      const cutoff = addDays(start, 6);
      const inFirstWeek = completedLogs.filter(l => l.date <= cutoff).length;
      firstWeek = inFirstWeek >= 3;
    }

    // perfect week: any week (Mon-Sun) where all planned non-rest days are checked
    let perfectWeek = false;
    if (plan && plan.days) {
      const planTrainingDates = plan.days.filter(d => d.type !== 'rest').map(d => d.date);
      if (planTrainingDates.length > 0) {
        const allDone = planTrainingDates.every(d => logs[d] && logs[d].completedAt);
        if (allDone) perfectWeek = true;
      }
    }

    const earned = [];
    function check(id, condition) {
      if (!condition) return;
      const def = POOL.find(p => p.id === id);
      if (!def) return;
      // earned date = 满足条件的最早日期(用最近 log 近似)
      const date = completedLogs.length ? completedLogs[completedLogs.length - 1].date : null;
      earned.push({ ...def, date });
    }
    check('first_workout', total >= 1);
    check('first_week',    firstWeek);
    check('streak_3',      longestStreak >= 3);
    check('streak_7',      longestStreak >= 7);
    check('streak_30',     longestStreak >= 30);
    check('total_10',      total >= 10);
    check('total_30',      total >= 30);
    check('total_100',     total >= 100);
    check('all_splits',    splitsCovered.size >= 3);
    check('morning_bird',  morningBird);
    check('late_warrior',  lateWarrior);
    check('perfect_week',  perfectWeek);

    return {
      earned,
      all: POOL,
      stats: { total, longestStreak, splitsCovered: [...splitsCovered] },
    };
  }

  function diff(prevIds, currentIds) {
    const prev = new Set(prevIds || []);
    const newOnes = (currentIds || []).filter(id => !prev.has(id));
    return newOnes.map(id => POOL.find(p => p.id === id)).filter(Boolean);
  }

  function dayDiff(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  global.Achievements = { compute, diff, POOL };
})(window);
