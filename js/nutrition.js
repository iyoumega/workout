/**
 * Nutrition: rule-based macro calculator.
 * Inputs: profile (basics + goal), isTrainingDay (bool)
 * Output: { calories, protein, carbs, fat, examples[] }
 *
 * Method:
 *   1. BMR via Mifflin-St Jeor.
 *   2. TDEE = BMR * activity factor (depends on daysPerWeek).
 *   3. Adjust for goal (cut / bulk / maintain).
 *   4. Set protein g/kg by goal; fat ~25-30% kcal; carbs from remaining.
 *   5. Rest day: carbs *0.8, fat *1.1 to keep calories close.
 */
(function (global) {

  const PROTEIN_PER_KG = {
    fat_loss:    2.0,
    muscle_gain: 1.8,
    shape:       1.8,
    maintain:    1.6,
  };
  const GOAL_KCAL_DELTA = {
    fat_loss:    -400,
    muscle_gain: +300,
    shape:       -150,
    maintain:    0,
  };

  function activityFactor(daysPerWeek) {
    if (daysPerWeek <= 3) return 1.45;
    if (daysPerWeek <= 4) return 1.55;
    if (daysPerWeek <= 5) return 1.65;
    return 1.75;
  }

  function bmr({ gender, age, height, weight }) {
    // Mifflin-St Jeor
    const base = 10 * weight + 6.25 * height - 5 * age;
    return gender === 'female' ? base - 161 : base + 5;
  }

  function calcMacros(profile, isTrainingDay = true) {
    const { basics, goal, daysPerWeek } = profile;
    const tdee = bmr(basics) * activityFactor(daysPerWeek);
    const targetKcal = Math.round(tdee + (GOAL_KCAL_DELTA[goal] || 0));

    const proteinG = Math.round(basics.weight * (PROTEIN_PER_KG[goal] || 1.6));
    let fatPct = 0.27;
    let carbAdj = 1.0;
    if (!isTrainingDay) { carbAdj = 0.8; fatPct = 0.30; }

    const fatG = Math.round((targetKcal * fatPct) / 9);
    const remainingKcal = targetKcal - proteinG * 4 - fatG * 9;
    const carbsG = Math.max(50, Math.round((remainingKcal / 4) * carbAdj));

    const calories = proteinG * 4 + carbsG * 4 + fatG * 9;

    return {
      calories,
      protein: proteinG,
      carbs: carbsG,
      fat: fatG,
      isTrainingDay,
      examples: foodExamples(goal, isTrainingDay),
    };
  }

  function foodExamples(goal, isTrainingDay) {
    const proteins = [
      '鸡胸肉 150g (~33g 蛋白)',
      '鸡蛋 2 个 + 蛋白 2 个 (~24g)',
      '希腊酸奶 200g (~20g)',
      '牛瘦肉 120g (~26g)',
      '虾仁 150g (~27g)',
      '三文鱼 120g (~25g)',
    ];
    const carbsTrain = [
      '糙米饭 1 碗 (~45g 碳水)',
      '红薯 200g (~40g)',
      '燕麦 60g 干 (~36g)',
      '全麦面包 2 片 (~30g)',
      '香蕉 1 根 (~27g)',
    ];
    const carbsRest = [
      '糙米饭 半碗 (~22g)',
      '蔬菜沙拉一大碗 (~10g)',
      '燕麦 40g 干 (~24g)',
      '苹果 1 个 (~20g)',
    ];
    const fats = [
      '牛油果半个 (~15g 脂肪)',
      '坚果一小把 (~12g)',
      '橄榄油 1 汤匙 (~14g)',
    ];
    const out = [];
    out.push(proteins[Math.floor(Math.random() * proteins.length)]);
    out.push(proteins[Math.floor(Math.random() * proteins.length)]);
    const carbList = isTrainingDay ? carbsTrain : carbsRest;
    out.push(carbList[Math.floor(Math.random() * carbList.length)]);
    out.push(fats[Math.floor(Math.random() * fats.length)]);
    if (goal === 'muscle_gain' && isTrainingDay) {
      out.push(carbsTrain[Math.floor(Math.random() * carbsTrain.length)]);
    }
    // 去重
    return [...new Set(out)];
  }

  global.Nutrition = { calcMacros, bmr };
})(window);
