/**
 * 每日金句 — 精挑细选,不要那种鸡汤口号。
 * 偏运动员、教练、哲学家、作家关于纪律 / 持续 / 身体的真话。
 *
 * 公开:
 *   Quotes.today(seed?) -> { text, by }
 */
(function (global) {
  const POOL = [
    { text: '每天我醒来,都和昨天的自己拳击。', by: '海明威' },
    { text: '冠军不是在健身房里诞生的,他们在内心里诞生 — 那种渴望、梦想、远见。', by: '阿里' },
    { text: '我从不去想已经做了多少,只想还差多少。', by: '罗纳尔多' },
    { text: '身体是灵魂的图像。', by: '列夫·托尔斯泰' },
    { text: '困难是设计来让我们更强壮的。', by: '塞涅卡' },
    { text: '不要害怕慢,只要害怕站着不动。', by: '中国谚语' },
    { text: '动作的优雅来自于无数次重复。', by: '李小龙' },
    { text: '今天的你和昨天的你,差距就是一组深蹲。', by: '匿名' },
    { text: '当你举起重量,你也举起了一个更好的自己。', by: 'Mark Rippetoe' },
    { text: '健身不是惩罚 — 是一种你能给自己的礼物。', by: '匿名' },
    { text: '你不是在锻炼肌肉,你在锻炼意志。', by: 'Arnold Schwarzenegger' },
    { text: '我恨每一分钟的训练,但我说"别放弃,现在受苦,余生当王者"。', by: '阿里' },
    { text: '如果你想要不曾拥有的东西,就要去做不曾做过的事。', by: '托马斯·杰斐逊' },
    { text: '你最大的对手是昨天的自己。', by: '匿名' },
    { text: '坚持下去 — 不是因为容易,而是因为值得。', by: '匿名' },
    { text: '拒绝是一种力量。拒绝懒惰,拒绝借口,拒绝半途而废。', by: '匿名' },
    { text: '所谓自律,是你对自己未来的温柔。', by: '匿名' },
    { text: '没有人在举重时会担心明天的烦恼。', by: 'Henry Rollins' },
    { text: '你不需要完美,只需要继续。', by: '匿名' },
    { text: '强壮不是一种状态,是一种选择。', by: '匿名' },
    { text: '让今天的你,为半年后的你骄傲。', by: '匿名' },
    { text: '没有捷径,只有路径。', by: '匿名' },
    { text: '休息是训练的一部分,不是它的对立面。', by: '匿名' },
    { text: '坚持的人不一定赢,但放弃的人一定不赢。', by: '匿名' },
    { text: '大象不是用爪子建造的,是一步一步走出来的。', by: '非洲谚语' },
    { text: '汗水会消失,但更好的形状会留下来。', by: '匿名' },
    { text: '比起把目标定得太高然后放弃,不如定得低一点 — 然后做完。', by: '匿名' },
    { text: '你的对手在练,你不练。', by: '匿名' },
    { text: '动起来 — 心情就改变了。', by: '匿名' },
    { text: '健身房里没有运气,只有选择。', by: '匿名' },
  ];

  // 用日期生成稳定 seed,同一天看到同一句
  function todaySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate();
  }

  function today(seedOverride) {
    const seed = seedOverride ?? todaySeed();
    return POOL[seed % POOL.length];
  }

  function random() {
    return POOL[Math.floor(Math.random() * POOL.length)];
  }

  global.Quotes = { today, random, POOL };
})(window);
