/**
 * Exercise library.
 *
 * Schema:
 *   id            stable string id
 *   nameZh        中文名
 *   nameEn        English name
 *   muscles       primary muscle groups (Chinese tags)
 *   muscleKeys    internal keys: chest|back|shoulders|biceps|triceps|quads|hamstrings|glutes|calves|core
 *   venues        gym | home_dumbbell | home_bodyweight
 *   isCompound    multi-joint compound?
 *   weightProfile key in WEIGHT_PROFILES (or null for bodyweight-only)
 *   tips          short cues
 *   imageUrl      null for now (reserved)
 */
(function (global) {

  const EXERCISES = [
    // ===== 胸 chest =====
    {
      id: 'bench_press', nameZh: '杠铃卧推', nameEn: 'Barbell Bench Press',
      muscles: ['胸大肌', '三头肌', '前束'], muscleKeys: ['chest', 'triceps', 'shoulders'],
      venues: ['gym'], isCompound: true, weightProfile: 'bench',
      tips: ['肩胛后收下沉,胸椎挺起拱背', '杠铃下放至乳头连线,小臂始终垂直地面', '推起时不要锁死肘关节'],
      imageUrl: null
    },
    {
      id: 'incline_bench_press', nameZh: '上斜杠铃卧推', nameEn: 'Incline Barbell Press',
      muscles: ['上胸', '前束'], muscleKeys: ['chest', 'shoulders'],
      venues: ['gym'], isCompound: true, weightProfile: 'incline_bench',
      tips: ['椅背 30-45 度,角度太大会变成肩推', '下放至锁骨下方', '想象把胸部送向杠铃'],
      imageUrl: null
    },
    {
      id: 'dumbbell_bench_press', nameZh: '哑铃卧推', nameEn: 'Dumbbell Bench Press',
      muscles: ['胸大肌', '三头肌'], muscleKeys: ['chest', 'triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_bench',
      tips: ['手腕保持中立不外翻', '顶端两哑铃靠近但不相撞', '行程比杠铃更深,但不要过度拉伸肩'],
      imageUrl: null
    },
    {
      id: 'dumbbell_fly', nameZh: '哑铃飞鸟', nameEn: 'Dumbbell Fly',
      muscles: ['胸大肌'], muscleKeys: ['chest'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_fly',
      tips: ['肘关节微屈固定,做"画半圆"运动', '感受胸部张力,不是手臂在用力', '下放到与胸同高即可'],
      imageUrl: null
    },
    {
      id: 'pushup', nameZh: '俯卧撑', nameEn: 'Push-Up',
      muscles: ['胸大肌', '三头肌', '核心'], muscleKeys: ['chest', 'triceps', 'core'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: null,
      tips: ['身体一条直线,核心绷紧不塌腰', '手肘与身体约 45 度夹角', '胸部贴近地面,不要只下沉头部'],
      imageUrl: null
    },
    {
      id: 'decline_pushup', nameZh: '上斜俯卧撑', nameEn: 'Decline Push-Up',
      muscles: ['上胸', '前束'], muscleKeys: ['chest', 'shoulders'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['脚搭高物 30-50cm 起步', '下放轨迹瞄准下巴前方', '不要塌腰借力'],
      imageUrl: null
    },

    // ===== 背 back =====
    {
      id: 'pullup', nameZh: '引体向上', nameEn: 'Pull-Up',
      muscles: ['背阔肌', '二头肌'], muscleKeys: ['back', 'biceps'],
      venues: ['gym'], isCompound: true, weightProfile: null,
      tips: ['肩胛先下沉再发力上拉', '下颌过杠,不要靠摆动借力', '下落控制,不要直接松开'],
      imageUrl: null
    },
    {
      id: 'lat_pulldown', nameZh: '高位下拉', nameEn: 'Lat Pulldown',
      muscles: ['背阔肌', '二头肌'], muscleKeys: ['back', 'biceps'],
      venues: ['gym'], isCompound: true, weightProfile: 'cable_pull',
      tips: ['略后仰 15 度,把杠拉到锁骨', '感受是用背把手臂"带下来"', '回程缓慢,顶端充分伸展背阔'],
      imageUrl: null
    },
    {
      id: 'barbell_row', nameZh: '杠铃划船', nameEn: 'Barbell Row',
      muscles: ['背阔肌', '中背', '后束'], muscleKeys: ['back', 'shoulders'],
      venues: ['gym'], isCompound: true, weightProfile: 'row',
      tips: ['髋部前屈约 60 度,背挺直不弓', '杠铃拉向小腹,不是胸口', '顶端肩胛后收挤压'],
      imageUrl: null
    },
    {
      id: 'dumbbell_row', nameZh: '单臂哑铃划船', nameEn: 'One-Arm Dumbbell Row',
      muscles: ['背阔肌', '中背'], muscleKeys: ['back'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_row',
      tips: ['一手一膝撑凳,后背平行地面', '哑铃拉向腰侧,肘部贴身', '顶端停 1 秒挤压背部'],
      imageUrl: null
    },
    {
      id: 'inverted_row', nameZh: '反向划船', nameEn: 'Inverted Row',
      muscles: ['背阔肌', '中背', '二头肌'], muscleKeys: ['back', 'biceps'],
      venues: ['home_bodyweight', 'gym'], isCompound: true, weightProfile: null,
      tips: ['用桌沿/低单杠,身体一条直线', '胸口拉向杠,不是脖子', '越水平越难,可调节难度'],
      imageUrl: null
    },
    {
      id: 'face_pull', nameZh: '面拉', nameEn: 'Face Pull',
      muscles: ['后束', '中背'], muscleKeys: ['shoulders', 'back'],
      venues: ['gym'], isCompound: false, weightProfile: 'face_pull',
      tips: ['绳索高于面部,拉向额头', '顶端外旋手臂,大臂分开', '重量轻,慢做'],
      imageUrl: null
    },

    // ===== 肩 shoulders =====
    {
      id: 'overhead_press', nameZh: '杠铃肩推', nameEn: 'Overhead Press',
      muscles: ['三角肌', '三头肌'], muscleKeys: ['shoulders', 'triceps'],
      venues: ['gym'], isCompound: true, weightProfile: 'ohp',
      tips: ['核心绷紧,不要顶髋借力', '杠铃路径垂直,从锁骨推过头', '顶端肩胛上回旋,微微耸肩'],
      imageUrl: null
    },
    {
      id: 'dumbbell_shoulder_press', nameZh: '哑铃肩推', nameEn: 'Dumbbell Shoulder Press',
      muscles: ['三角肌', '三头肌'], muscleKeys: ['shoulders', 'triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_ohp',
      tips: ['坐姿背贴椅,腰别拱', '哑铃下放到耳侧,肘略前于身体', '推起两哑铃靠近不撞'],
      imageUrl: null
    },
    {
      id: 'lateral_raise', nameZh: '侧平举', nameEn: 'Dumbbell Lateral Raise',
      muscles: ['三角肌中束'], muscleKeys: ['shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'lateral',
      tips: ['用肩,不是用斜方借力', '肘略屈,手腕略低于肘', '抬至与肩平,不要过高'],
      imageUrl: null
    },
    {
      id: 'rear_delt_fly', nameZh: '俯身后束飞鸟', nameEn: 'Rear Delt Fly',
      muscles: ['三角肌后束'], muscleKeys: ['shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'rear_delt',
      tips: ['髋部前屈,背挺直', '想象用大臂"画弧"打开,不是耸肩', '小重量,感受后束发力'],
      imageUrl: null
    },
    {
      id: 'pike_pushup', nameZh: '俯身肩推(Pike)', nameEn: 'Pike Push-Up',
      muscles: ['三角肌前束', '三头肌'], muscleKeys: ['shoulders', 'triceps'],
      venues: ['home_bodyweight'], isCompound: true, weightProfile: null,
      tips: ['臀部高耸成倒 V 字', '头顶轨迹下放至地面', '想象在做手倒立肩推的低阶版'],
      imageUrl: null
    },

    // ===== 三头 triceps =====
    {
      id: 'tricep_pushdown', nameZh: '绳索下压', nameEn: 'Tricep Pushdown',
      muscles: ['三头肌'], muscleKeys: ['triceps'],
      venues: ['gym'], isCompound: false, weightProfile: 'cable_push',
      tips: ['大臂夹紧身体不动,只动小臂', '底部停顿挤压三头', '肘别向前飘'],
      imageUrl: null
    },
    {
      id: 'overhead_tricep_extension', nameZh: '过顶臂屈伸', nameEn: 'Overhead Tricep Extension',
      muscles: ['三头肌长头'], muscleKeys: ['triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'oh_tri',
      tips: ['双手握一只哑铃,大臂贴耳', '感受三头被充分拉伸', '别用腰借力'],
      imageUrl: null
    },
    {
      id: 'narrow_pushup', nameZh: '窄距俯卧撑', nameEn: 'Diamond Push-Up',
      muscles: ['三头肌', '胸大肌'], muscleKeys: ['triceps', 'chest'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['双手在胸下并拢成菱形', '肘贴身体下放', '不行可跪姿降级'],
      imageUrl: null
    },

    // ===== 二头 biceps =====
    {
      id: 'barbell_curl', nameZh: '杠铃弯举', nameEn: 'Barbell Curl',
      muscles: ['二头肌'], muscleKeys: ['biceps'],
      venues: ['gym'], isCompound: false, weightProfile: 'curl_bb',
      tips: ['大臂夹紧不动,小臂发力', '顶端不要靠手腕', '下放控制,不要靠惯性'],
      imageUrl: null
    },
    {
      id: 'dumbbell_curl', nameZh: '哑铃弯举', nameEn: 'Dumbbell Curl',
      muscles: ['二头肌'], muscleKeys: ['biceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_curl',
      tips: ['可交替做,顶端旋外手腕(锤变正握)', '肘部不要前飘', '慢离心,顶端挤压'],
      imageUrl: null
    },
    {
      id: 'hammer_curl', nameZh: '锤式弯举', nameEn: 'Hammer Curl',
      muscles: ['二头肌', '肱肌', '前臂'], muscleKeys: ['biceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_curl',
      tips: ['全程虎口朝上(锤握)', '主练肱肌,让二头看起来更厚', '可双臂同时,也可交替'],
      imageUrl: null
    },

    // ===== 腿 quads/hamstrings/glutes =====
    {
      id: 'back_squat', nameZh: '杠铃深蹲', nameEn: 'Barbell Back Squat',
      muscles: ['股四头肌', '臀大肌', '腘绳肌'], muscleKeys: ['quads', 'glutes', 'hamstrings'],
      venues: ['gym'], isCompound: true, weightProfile: 'squat',
      tips: ['杠铃放上背,核心绷紧', '下蹲到大腿与地面平行或更低', '膝盖方向与脚尖一致,不内扣'],
      imageUrl: null
    },
    {
      id: 'goblet_squat', nameZh: '高脚杯深蹲', nameEn: 'Goblet Squat',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_squat',
      tips: ['哑铃捧在胸前,肘抵膝内侧', '保持躯干直立', '蹲到底再起,感受臀腿同时发力'],
      imageUrl: null
    },
    {
      id: 'deadlift', nameZh: '硬拉', nameEn: 'Conventional Deadlift',
      muscles: ['腘绳肌', '臀大肌', '竖脊肌'], muscleKeys: ['hamstrings', 'glutes', 'back'],
      venues: ['gym'], isCompound: true, weightProfile: 'deadlift',
      tips: ['杠铃贴近小腿,背挺直不弓', '伸髋伸膝同步,不是先抬髋再起', '锁定时收紧臀,不要过度后仰'],
      imageUrl: null
    },
    {
      id: 'romanian_deadlift', nameZh: '罗马尼亚硬拉', nameEn: 'Romanian Deadlift',
      muscles: ['腘绳肌', '臀大肌'], muscleKeys: ['hamstrings', 'glutes'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'rdl',
      tips: ['膝微屈固定,主要靠髋折叠', '杠铃贴大腿下滑至膝下', '感受腘绳肌被拉伸'],
      imageUrl: null
    },
    {
      id: 'lunge', nameZh: '哑铃箭步蹲', nameEn: 'Dumbbell Lunge',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_split',
      tips: ['前脚踩稳,后膝近地不触地', '前膝不超过脚尖太多', '可原地交替,也可走步'],
      imageUrl: null
    },
    {
      id: 'bulgarian_split_squat', nameZh: '保加利亚分腿蹲', nameEn: 'Bulgarian Split Squat',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_split',
      tips: ['后脚搭凳,前脚距凳约一大步', '前侧大腿与地面平行', '感受前腿单侧发力'],
      imageUrl: null
    },
    {
      id: 'hip_thrust', nameZh: '臀冲', nameEn: 'Hip Thrust',
      muscles: ['臀大肌'], muscleKeys: ['glutes'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'hip_thrust',
      tips: ['上背靠凳,杠铃/哑铃压髋部', '顶峰夹紧臀部,身体一条直线', '不要靠腰过度伸展'],
      imageUrl: null
    },
    {
      id: 'glute_bridge', nameZh: '臀桥', nameEn: 'Glute Bridge',
      muscles: ['臀大肌', '腘绳肌'], muscleKeys: ['glutes', 'hamstrings'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['仰卧屈膝,脚后跟发力顶髋', '顶端夹紧臀部停 1 秒', '腰别过度后伸'],
      imageUrl: null
    },
    {
      id: 'leg_curl', nameZh: '腿弯举', nameEn: 'Leg Curl',
      muscles: ['腘绳肌'], muscleKeys: ['hamstrings'],
      venues: ['gym'], isCompound: false, weightProfile: 'leg_curl',
      tips: ['脚踝勾住器械垫', '慢起慢落,感受腘绳肌发力', '臀部别离开垫子'],
      imageUrl: null
    },
    {
      id: 'air_squat', nameZh: '徒手深蹲', nameEn: 'Air Squat',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['home_bodyweight'], isCompound: true, weightProfile: null,
      tips: ['脚比肩稍宽,脚尖略外八', '蹲到大腿平行或更低', '想象坐到一把矮凳上'],
      imageUrl: null
    },
    {
      id: 'jump_squat', nameZh: '跳深蹲', nameEn: 'Jump Squat',
      muscles: ['股四头肌', '臀大肌', '小腿'], muscleKeys: ['quads', 'glutes', 'calves'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['下蹲到位再爆发起跳', '落地缓冲,膝不内扣', '体重大者请轻做或省略'],
      imageUrl: null
    },
    {
      id: 'standing_calf_raise', nameZh: '站姿提踵', nameEn: 'Standing Calf Raise',
      muscles: ['小腿三头肌'], muscleKeys: ['calves'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: false, weightProfile: 'calf',
      tips: ['前脚掌踩台阶边,脚跟悬空下沉', '顶端踮到最高停 1 秒', '可单脚做以加大强度'],
      imageUrl: null
    },

    // ===== 核心 core =====
    {
      id: 'plank', nameZh: '平板支撑', nameEn: 'Plank',
      muscles: ['核心', '腹横肌'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['前臂支地,身体一条直线', '臀别翘别塌,核心收紧', '一组按时间算(秒数)'],
      imageUrl: null
    },
    {
      id: 'hanging_leg_raise', nameZh: '悬垂举腿', nameEn: 'Hanging Leg Raise',
      muscles: ['下腹', '髋屈肌'], muscleKeys: ['core'],
      venues: ['gym'], isCompound: false, weightProfile: null,
      tips: ['悬挂单杠,主动下沉肩胛', '用腹部把腿"卷"起来,不是甩', '可先从屈膝版本开始'],
      imageUrl: null
    },
    {
      id: 'crunch', nameZh: '卷腹', nameEn: 'Crunch',
      muscles: ['上腹'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['只抬肩胛,腰始终贴地', '想象把胸口拉向骨盆', '别用手抱头硬拽脖子'],
      imageUrl: null
    },
    {
      id: 'mountain_climber', nameZh: '登山跑', nameEn: 'Mountain Climber',
      muscles: ['核心', '心肺'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['俯撑姿,左右腿快速交替提膝', '臀别上翘,核心绷紧', '一组按时间算'],
      imageUrl: null
    },

    // ===== 全身 / 爆发 =====
    {
      id: 'burpee', nameZh: '波比跳', nameEn: 'Burpee',
      muscles: ['全身'], muscleKeys: ['chest', 'quads', 'core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['下蹲撑地→跳成俯撑→俯卧撑→收腿→起跳', '节奏稳定优先于求快', '膝不舒服可去掉跳跃'],
      imageUrl: null
    },
    {
      id: 'kb_swing', nameZh: '壶铃摆荡(哑铃替代)', nameEn: 'Kettlebell/Dumbbell Swing',
      muscles: ['臀大肌', '腘绳肌', '核心'], muscleKeys: ['glutes', 'hamstrings', 'core'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'kb_swing',
      tips: ['髋部铰链,不是深蹲', '靠伸髋甩起,不是靠手抬', '到肩高即可,核心始终绷紧'],
      imageUrl: null
    },
  ];

  // ----- 检索 helpers -----
  function byVenue(venue) {
    return EXERCISES.filter(e => e.venues.includes(venue));
  }
  function byMuscleKeys(keys, venue) {
    const set = new Set(keys);
    return byVenue(venue).filter(e => e.muscleKeys.some(k => set.has(k)));
  }
  function findById(id) {
    return EXERCISES.find(e => e.id === id) || null;
  }

  const TYPE_TO_MUSCLES = {
    push:    ['chest', 'shoulders', 'triceps'],
    pull:    ['back', 'biceps'],
    legs:    ['quads', 'hamstrings', 'glutes', 'calves'],
    upper:   ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    lower:   ['quads', 'hamstrings', 'glutes', 'calves'],
    fullbody:['chest', 'back', 'shoulders', 'quads', 'hamstrings', 'glutes', 'core'],
  };
  function byDayType(type, venue) {
    if (type === 'rest') return [];
    return byMuscleKeys(TYPE_TO_MUSCLES[type] || [], venue);
  }

  // 用户友好的"重点部位"分组
  const FOCUS_GROUPS = [
    { id: 'chest',     label: '胸',   muscleKeys: ['chest'] },
    { id: 'back',      label: '背',   muscleKeys: ['back'] },
    { id: 'shoulders', label: '肩',   muscleKeys: ['shoulders'] },
    { id: 'arms',      label: '手臂', muscleKeys: ['biceps', 'triceps'] },
    { id: 'legs',      label: '腿',   muscleKeys: ['quads', 'hamstrings', 'calves'] },
    { id: 'glutes',    label: '臀',   muscleKeys: ['glutes'] },
    { id: 'core',      label: '核心', muscleKeys: ['core'] },
  ];
  function focusToMuscleKeys(focusIds) {
    const set = new Set();
    (focusIds || []).forEach(id => {
      const g = FOCUS_GROUPS.find(x => x.id === id);
      if (g) g.muscleKeys.forEach(k => set.add(k));
    });
    return [...set];
  }

  global.ExerciseLib = {
    EXERCISES, byVenue, byMuscleKeys, byDayType, findById,
    TYPE_TO_MUSCLES, FOCUS_GROUPS, focusToMuscleKeys,
  };
})(window);
