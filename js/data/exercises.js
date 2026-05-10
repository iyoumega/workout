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

    // ===== 扩展:更多胸 =====
    {
      id: 'incline_db_bench', nameZh: '上斜哑铃卧推', nameEn: 'Incline Dumbbell Press',
      muscles: ['上胸', '前束'], muscleKeys: ['chest', 'shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_bench',
      tips: ['椅背 30-45 度', '哑铃下放到锁骨与乳头之间', '别让重量靠肩借力'],
      imageUrl: null
    },
    {
      id: 'decline_db_bench', nameZh: '下斜哑铃卧推', nameEn: 'Decline Dumbbell Press',
      muscles: ['下胸', '三头肌'], muscleKeys: ['chest', 'triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_bench',
      tips: ['椅背向下 15-30 度', '下放至下胸位置', '动作幅度比平板小'],
      imageUrl: null
    },
    {
      id: 'cable_crossover', nameZh: '绳索夹胸', nameEn: 'Cable Crossover',
      muscles: ['胸大肌内侧'], muscleKeys: ['chest'],
      venues: ['gym'], isCompound: false, weightProfile: 'cable_push',
      tips: ['略前倾,肘微屈固定', '想象用胸夹合双手', '顶峰停顿 1 秒挤压'],
      imageUrl: null
    },
    {
      id: 'machine_chest_press', nameZh: '坐姿器械推胸', nameEn: 'Machine Chest Press',
      muscles: ['胸大肌'], muscleKeys: ['chest', 'triceps'],
      venues: ['gym'], isCompound: true, weightProfile: 'bench',
      tips: ['坐稳贴背垫,胸挺起', '握把对应乳头位置', '推起时不锁肘'],
      imageUrl: null
    },
    {
      id: 'dips_chest', nameZh: '双杠臂屈伸(胸版)', nameEn: 'Chest Dips',
      muscles: ['下胸', '三头肌'], muscleKeys: ['chest', 'triceps'],
      venues: ['gym', 'home_bodyweight'], isCompound: true, weightProfile: null,
      tips: ['身体略前倾发力胸', '肘外开 45 度', '下放至大臂与地面平行'],
      imageUrl: null
    },
    {
      id: 'db_pullover', nameZh: '哑铃仰卧上拉', nameEn: 'Dumbbell Pullover',
      muscles: ['胸大肌', '背阔肌'], muscleKeys: ['chest', 'back'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_fly',
      tips: ['仰卧凳上,头部略悬', '双手捧哑铃过头划弧', '感受胸腔被打开'],
      imageUrl: null
    },
    {
      id: 'kneeling_pushup', nameZh: '跪姿俯卧撑', nameEn: 'Knee Push-Up',
      muscles: ['胸大肌', '三头肌'], muscleKeys: ['chest', 'triceps'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['新手版,膝盖跪地', '保持躯干一条直线(不算腿)', '动作要点同标准俯卧撑'],
      imageUrl: null
    },

    // ===== 扩展:更多背 =====
    {
      id: 'tbar_row', nameZh: 'T 杠划船', nameEn: 'T-Bar Row',
      muscles: ['背阔肌', '中背', '后束'], muscleKeys: ['back', 'shoulders'],
      venues: ['gym'], isCompound: true, weightProfile: 'row',
      tips: ['髋部铰链 60 度', '杠铃拉向腹部下侧', '顶端肩胛挤压'],
      imageUrl: null
    },
    {
      id: 'cable_row', nameZh: '坐姿绳索划船', nameEn: 'Seated Cable Row',
      muscles: ['背阔肌', '中背'], muscleKeys: ['back'],
      venues: ['gym'], isCompound: true, weightProfile: 'cable_pull',
      tips: ['坐姿挺胸,膝微屈', '把柄拉向腹部', '不要靠后仰借力'],
      imageUrl: null
    },
    {
      id: 'straight_arm_pulldown', nameZh: '直臂下压', nameEn: 'Straight-Arm Pulldown',
      muscles: ['背阔肌'], muscleKeys: ['back'],
      venues: ['gym'], isCompound: false, weightProfile: 'cable_push',
      tips: ['手臂全程保持伸直微屈', '只动肩关节,小臂不参与', '感受背阔下沉收紧'],
      imageUrl: null
    },
    {
      id: 'chinup', nameZh: '反握引体', nameEn: 'Chin-Up',
      muscles: ['背阔肌', '二头肌'], muscleKeys: ['back', 'biceps'],
      venues: ['gym'], isCompound: true, weightProfile: null,
      tips: ['掌心朝向自己,握距与肩同宽', '比正握引体偏二头', '下颌过杠'],
      imageUrl: null
    },
    {
      id: 'superman', nameZh: '小燕飞', nameEn: 'Superman Hold',
      muscles: ['竖脊肌', '臀大肌'], muscleKeys: ['back', 'glutes'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['俯卧地面同时抬手抬脚', '顶端停 2 秒', '不需大幅度,感受腰背收紧'],
      imageUrl: null
    },

    // ===== 扩展:更多肩 =====
    {
      id: 'arnold_press', nameZh: '阿诺德推举', nameEn: 'Arnold Press',
      muscles: ['三角肌全束', '三头肌'], muscleKeys: ['shoulders', 'triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: 'db_ohp',
      tips: ['起始掌心朝自己', '推起过程旋转手腕到掌心朝前', '全肩三束都参与'],
      imageUrl: null
    },
    {
      id: 'cable_lateral', nameZh: '绳索侧平举', nameEn: 'Cable Lateral Raise',
      muscles: ['三角肌中束'], muscleKeys: ['shoulders'],
      venues: ['gym'], isCompound: false, weightProfile: 'face_pull',
      tips: ['绳索从对侧拉过身体侧面', '比哑铃更恒定的张力', '不要过肩'],
      imageUrl: null
    },
    {
      id: 'front_raise', nameZh: '前平举', nameEn: 'Dumbbell Front Raise',
      muscles: ['三角肌前束'], muscleKeys: ['shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'lateral',
      tips: ['交替或同时举起', '抬至与肩同高即可', '用肩,不要靠摆动借力'],
      imageUrl: null
    },
    {
      id: 'shrug', nameZh: '哑铃耸肩', nameEn: 'Dumbbell Shrug',
      muscles: ['斜方肌上部'], muscleKeys: ['shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_row',
      tips: ['两手持铃自然下垂', '肩胛骨向上提', '不要前后转动肩膀'],
      imageUrl: null
    },
    {
      id: 'upright_row', nameZh: '直立划船', nameEn: 'Upright Row',
      muscles: ['三角肌中束', '斜方肌'], muscleKeys: ['shoulders'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'curl_bb',
      tips: ['肘高于手腕', '杠铃拉至胸口下方,不要过肩', '有肩痛史避开此动作'],
      imageUrl: null
    },

    // ===== 扩展:更多手臂 =====
    {
      id: 'preacher_curl', nameZh: '牧师凳弯举', nameEn: 'Preacher Curl',
      muscles: ['二头肌'], muscleKeys: ['biceps'],
      venues: ['gym'], isCompound: false, weightProfile: 'curl_bb',
      tips: ['大臂完全贴垫,只动小臂', '下放时不完全伸直,保持张力', '能孤立二头'],
      imageUrl: null
    },
    {
      id: 'concentration_curl', nameZh: '集中弯举', nameEn: 'Concentration Curl',
      muscles: ['二头肌'], muscleKeys: ['biceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_curl',
      tips: ['坐姿,肘抵大腿内侧', '单臂集中收缩', '顶峰停 1 秒'],
      imageUrl: null
    },
    {
      id: 'cable_curl', nameZh: '绳索弯举', nameEn: 'Cable Curl',
      muscles: ['二头肌'], muscleKeys: ['biceps'],
      venues: ['gym'], isCompound: false, weightProfile: 'cable_push',
      tips: ['用低位绳索,恒定张力', '肘部紧贴身体两侧', '回程慢离心'],
      imageUrl: null
    },
    {
      id: 'skullcrusher', nameZh: '仰卧臂屈伸', nameEn: 'Skullcrusher',
      muscles: ['三头肌'], muscleKeys: ['triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'curl_bb',
      tips: ['仰卧,大臂垂直地面不动', '小臂下放至额头侧', '只用三头发力'],
      imageUrl: null
    },
    {
      id: 'tricep_dips', nameZh: '凳上臂屈伸', nameEn: 'Bench Dips',
      muscles: ['三头肌'], muscleKeys: ['triceps'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['手撑凳沿,腿伸直或屈膝', '下放至大臂平行地面', '别耸肩'],
      imageUrl: null
    },
    {
      id: 'tricep_kickback', nameZh: '哑铃俯身臂屈伸', nameEn: 'Tricep Kickback',
      muscles: ['三头肌'], muscleKeys: ['triceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_curl',
      tips: ['俯身,大臂贴身平行地面', '只动小臂向后伸直', '顶端停留挤压'],
      imageUrl: null
    },
    {
      id: 'wrist_curl', nameZh: '腕弯举', nameEn: 'Wrist Curl',
      muscles: ['前臂屈肌'], muscleKeys: ['biceps'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'db_curl',
      tips: ['前臂搭凳,手腕悬空', '小重量,大幅度', '上下卷曲手腕'],
      imageUrl: null
    },

    // ===== 扩展:更多腿 =====
    {
      id: 'leg_press', nameZh: '腿举', nameEn: 'Leg Press',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym'], isCompound: true, weightProfile: 'leg_press',
      tips: ['脚距与肩同宽', '下放至大腿贴近躯干', '推起不锁膝'],
      imageUrl: null
    },
    {
      id: 'hack_squat', nameZh: 'Hack 深蹲', nameEn: 'Hack Squat',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym'], isCompound: true, weightProfile: 'squat',
      tips: ['背靠斜板', '比自由深蹲对腰更友好', '蹲到大腿平行'],
      imageUrl: null
    },
    {
      id: 'leg_extension', nameZh: '腿屈伸', nameEn: 'Leg Extension',
      muscles: ['股四头肌'], muscleKeys: ['quads'],
      venues: ['gym'], isCompound: false, weightProfile: 'leg_curl',
      tips: ['脚踝勾住前垫', '伸直腿到顶部停 1 秒', '专门孤立股四'],
      imageUrl: null
    },
    {
      id: 'walking_lunge', nameZh: '行走弓步', nameEn: 'Walking Lunge',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_split',
      tips: ['每步前迈一大步下蹲', '后膝近地不触地', '一组按总步数算(每腿 N 步)'],
      imageUrl: null
    },
    {
      id: 'sumo_squat', nameZh: '相扑深蹲', nameEn: 'Sumo Squat',
      muscles: ['股四头肌', '臀大肌', '内收肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_squat',
      tips: ['脚距宽于肩,脚尖外八', '下蹲膝盖跟脚尖方向', '感受臀和大腿内侧'],
      imageUrl: null
    },
    {
      id: 'step_up', nameZh: '哑铃上箱步', nameEn: 'Dumbbell Step-Up',
      muscles: ['股四头肌', '臀大肌'], muscleKeys: ['quads', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_split',
      tips: ['踩稳箱面再发力', '后腿不借助',  '一组按每腿 N 次算'],
      imageUrl: null
    },
    {
      id: 'single_leg_rdl', nameZh: '单腿罗马尼亚硬拉', nameEn: 'Single-Leg RDL',
      muscles: ['腘绳肌', '臀大肌'], muscleKeys: ['hamstrings', 'glutes'],
      venues: ['gym', 'home_dumbbell', 'home_bodyweight'], isCompound: true, weightProfile: 'db_split',
      tips: ['单脚站立,另一脚后伸保持平衡', '髋部铰链,背挺直', '感受单侧腘绳和臀'],
      imageUrl: null
    },
    {
      id: 'seated_calf_raise', nameZh: '坐姿提踵', nameEn: 'Seated Calf Raise',
      muscles: ['比目鱼肌'], muscleKeys: ['calves'],
      venues: ['gym', 'home_dumbbell'], isCompound: false, weightProfile: 'calf',
      tips: ['膝盖弯 90 度,主要练比目鱼肌', '前脚掌踩台阶', '幅度要充分'],
      imageUrl: null
    },
    {
      id: 'wall_sit', nameZh: '靠墙静蹲', nameEn: 'Wall Sit',
      muscles: ['股四头肌'], muscleKeys: ['quads'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['背靠墙,大腿与地面平行', '膝盖正上方是脚踝', '一组按时间算(秒数)'],
      imageUrl: null
    },

    // ===== 扩展:更多臀 =====
    {
      id: 'cable_kickback', nameZh: '绳索后踢腿', nameEn: 'Cable Glute Kickback',
      muscles: ['臀大肌'], muscleKeys: ['glutes'],
      venues: ['gym'], isCompound: false, weightProfile: 'face_pull',
      tips: ['脚踝套绳,身体略前倾', '伸髋向后,顶端夹紧臀', '不要靠腰借力'],
      imageUrl: null
    },
    {
      id: 'donkey_kick', nameZh: '俯撑后踢腿', nameEn: 'Donkey Kick',
      muscles: ['臀大肌'], muscleKeys: ['glutes'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['四足支撑,屈膝向上踢', '感受臀肌挤压', '一组按每腿 N 次算'],
      imageUrl: null
    },
    {
      id: 'fire_hydrant', nameZh: '消防栓', nameEn: 'Fire Hydrant',
      muscles: ['臀中肌', '臀大肌'], muscleKeys: ['glutes'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['四足支撑,大腿外展抬起', '骨盆保持稳定', '感受臀外侧'],
      imageUrl: null
    },
    {
      id: 'frog_pump', nameZh: '青蛙泵', nameEn: 'Frog Pump',
      muscles: ['臀大肌'], muscleKeys: ['glutes'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['仰卧脚掌相对,膝盖外展', '伸髋顶起骨盆', '高频快节奏,顶端夹臀'],
      imageUrl: null
    },
    {
      id: 'sumo_deadlift', nameZh: '相扑硬拉', nameEn: 'Sumo Deadlift',
      muscles: ['臀大肌', '腘绳肌', '内收肌'], muscleKeys: ['glutes', 'hamstrings'],
      venues: ['gym'], isCompound: true, weightProfile: 'deadlift',
      tips: ['脚距宽,脚尖外八', '比传统硬拉腰更友好', '更多臀腿参与'],
      imageUrl: null
    },
    {
      id: 'curtsy_lunge', nameZh: '后交叉弓步', nameEn: 'Curtsy Lunge',
      muscles: ['臀中肌', '股四头肌'], muscleKeys: ['glutes', 'quads'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: 'db_split',
      tips: ['一脚向后斜方向迈步', '前膝不超过脚尖', '感受臀外侧'],
      imageUrl: null
    },

    // ===== 扩展:更多核心 =====
    {
      id: 'russian_twist', nameZh: '俄罗斯转体', nameEn: 'Russian Twist',
      muscles: ['腹斜肌'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: 'db_fly',
      tips: ['坐姿仰角 45 度,脚抬起或踩地', '左右转体触地', '可徒手或持哑铃'],
      imageUrl: null
    },
    {
      id: 'dead_bug', nameZh: '死虫式', nameEn: 'Dead Bug',
      muscles: ['核心', '腹横肌'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['仰卧,异侧手脚伸出', '腰始终贴地不弓', '适合腹部基础训练'],
      imageUrl: null
    },
    {
      id: 'bird_dog', nameZh: '鸟狗式', nameEn: 'Bird Dog',
      muscles: ['核心', '竖脊肌'], muscleKeys: ['core', 'back'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['四足支撑,异侧手脚伸出', '保持骨盆稳定', '顶端停 2 秒'],
      imageUrl: null
    },
    {
      id: 'side_plank', nameZh: '侧平板', nameEn: 'Side Plank',
      muscles: ['腹斜肌', '核心'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['一前臂支地,身体侧线一直', '臀别下沉', '一组按时间算,左右各做'],
      imageUrl: null
    },
    {
      id: 'hollow_hold', nameZh: '空心支撑', nameEn: 'Hollow Hold',
      muscles: ['腹直肌', '核心'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['仰卧抬起肩胛和双腿', '腰紧贴地面', '一组按时间算'],
      imageUrl: null
    },
    {
      id: 'ab_wheel', nameZh: '健腹轮', nameEn: 'Ab Wheel Rollout',
      muscles: ['腹直肌', '核心'], muscleKeys: ['core'],
      venues: ['gym', 'home_dumbbell'], isCompound: true, weightProfile: null,
      tips: ['跪姿向前滚出', '不要塌腰,核心绷紧', '新手从短距离开始'],
      imageUrl: null
    },
    {
      id: 'leg_raise_lying', nameZh: '仰卧举腿', nameEn: 'Lying Leg Raise',
      muscles: ['下腹'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['仰卧,腿伸直缓慢上抬', '下放到接近地面但不触', '腰别离地'],
      imageUrl: null
    },
    {
      id: 'bicycle_crunch', nameZh: '自行车卷腹', nameEn: 'Bicycle Crunch',
      muscles: ['腹直肌', '腹斜肌'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['仰卧,异侧肘膝相碰', '慢做胜过快做', '腰始终贴地'],
      imageUrl: null
    },

    // ===== 扩展:有氧 / HIIT =====
    {
      id: 'jumping_jack', nameZh: '开合跳', nameEn: 'Jumping Jack',
      muscles: ['全身', '心肺'], muscleKeys: ['core', 'quads'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['跳起同时手脚同步开合', '常用作热身', '一组按时间或次数'],
      imageUrl: null
    },
    {
      id: 'high_knee', nameZh: '高抬腿', nameEn: 'High Knees',
      muscles: ['股四头肌', '心肺', '核心'], muscleKeys: ['quads', 'core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['原地快速交替提膝过腰', '前脚掌着地', '一组按时间算'],
      imageUrl: null
    },
    {
      id: 'jump_rope', nameZh: '跳绳', nameEn: 'Jump Rope',
      muscles: ['小腿', '心肺'], muscleKeys: ['calves'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['手腕发力转绳', '前脚掌轻跳', '一组按时间或次数'],
      imageUrl: null
    },
    {
      id: 'squat_thrust', nameZh: '深蹲撑跳', nameEn: 'Squat Thrust',
      muscles: ['全身', '心肺'], muscleKeys: ['quads', 'chest', 'core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: true, weightProfile: null,
      tips: ['像 burpee 但去掉俯卧撑', '节奏稳定', '比 burpee 缓和'],
      imageUrl: null
    },

    // ===== 扩展:热身 / 拉伸 =====
    {
      id: 'cat_cow', nameZh: '猫牛式', nameEn: 'Cat-Cow',
      muscles: ['脊柱'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['四足支撑,呼气拱背、吸气塌腰', '动作慢,跟着呼吸', '热身/恢复都适合'],
      imageUrl: null
    },
    {
      id: 'world_greatest_stretch', nameZh: '世界上最伟大的拉伸', nameEn: 'World\'s Greatest Stretch',
      muscles: ['全身'], muscleKeys: ['core'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['弓步 + 同侧肘触地 + 转体伸臂', '左右交替', '训前热身首选'],
      imageUrl: null
    },
    {
      id: 'leg_swing', nameZh: '腿摆动', nameEn: 'Leg Swing',
      muscles: ['髋'], muscleKeys: ['quads', 'hamstrings'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['扶墙单腿前后摆', '左右各 10-15 次', '腿训前必做'],
      imageUrl: null
    },
    {
      id: 'shoulder_dislocate', nameZh: '肩部绕环', nameEn: 'Shoulder Pass-Through',
      muscles: ['肩'], muscleKeys: ['shoulders'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['宽握拉伸带或木棍', '从前向后慢慢绕过头', '改善肩部活动度'],
      imageUrl: null
    },
    {
      id: 'hip_flexor_stretch', nameZh: '髋屈肌拉伸', nameEn: 'Hip Flexor Stretch',
      muscles: ['髋屈肌'], muscleKeys: ['quads'],
      venues: ['home_bodyweight', 'home_dumbbell', 'gym'], isCompound: false, weightProfile: null,
      tips: ['弓步姿势,后腿膝盖跪地', '骨盆向前推', '感受后腿前侧拉伸'],
      imageUrl: null
    },
  ];

  // ----- 自定义动作合并 -----
  let _customCache = [];
  function setCustom(items) {
    _customCache = items || [];
  }
  function all() {
    return EXERCISES.concat(_customCache);
  }

  // ----- 检索 helpers -----
  function byVenue(venue) {
    return all().filter(e => e.venues.includes(venue));
  }
  function byMuscleKeys(keys, venue) {
    const set = new Set(keys);
    return byVenue(venue).filter(e => e.muscleKeys.some(k => set.has(k)));
  }
  function findById(id) {
    return all().find(e => e.id === id) || null;
  }

  // 替代动作:同一肌群、同场地、不是 self
  function alternatives(exerciseId, venue) {
    const ex = findById(exerciseId);
    if (!ex) return [];
    const keys = new Set(ex.muscleKeys);
    return byVenue(venue || (ex.venues && ex.venues[0]))
      .filter(e => e.id !== exerciseId)
      .filter(e => e.muscleKeys.some(k => keys.has(k)))
      .filter(e => e.isCompound === ex.isCompound) // 同类型替换(复合<->复合,孤立<->孤立)
      .slice(0, 12);
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
    setCustom, all, alternatives,
  };
})(window);
