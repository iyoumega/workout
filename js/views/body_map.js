/**
 * Body map — simple SVG visualization of which muscles today's plan hits.
 *
 * Public:
 *   BodyMap.render(muscleKeys) -> HTML string
 */
(function (global) {

  function render(activeMuscleKeys) {
    const active = new Set(activeMuscleKeys || []);
    const a = (key) => active.has(key) ? 'var(--accent)' : 'rgba(255,255,255,0.06)';
    const aMid = (key) => active.has(key) ? 'rgba(232,93,36,0.55)' : 'rgba(255,255,255,0.04)';

    return `
      <div class="bodymap-card card">
        <div class="text-xs text-dim mb-8">今日激活肌群</div>
        <div class="bodymap-row">
          <svg viewBox="0 0 110 220" class="bodymap-svg">
            <!-- 头 -->
            <ellipse cx="55" cy="18" rx="13" ry="15" fill="rgba(255,255,255,0.06)"/>
            <!-- 颈 -->
            <rect x="48" y="32" width="14" height="8" fill="rgba(255,255,255,0.08)" rx="2"/>
            <!-- 肩 -->
            <ellipse cx="30" cy="48" rx="14" ry="10" fill="${a('shoulders')}"/>
            <ellipse cx="80" cy="48" rx="14" ry="10" fill="${a('shoulders')}"/>
            <!-- 胸 -->
            <path d="M30 50 Q55 50 80 50 Q80 80 55 80 Q30 80 30 50 Z" fill="${a('chest')}"/>
            <!-- 腹 -->
            <rect x="42" y="80" width="26" height="40" fill="${a('core')}" rx="3"/>
            <!-- 二头(上臂) -->
            <ellipse cx="20" cy="70" rx="9" ry="20" fill="${a('biceps')}"/>
            <ellipse cx="90" cy="70" rx="9" ry="20" fill="${a('biceps')}"/>
            <!-- 三头(被二头遮一部分,通过深色侧条体现) -->
            <rect x="11" y="56" width="6" height="28" fill="${aMid('triceps')}" rx="2"/>
            <rect x="93" y="56" width="6" height="28" fill="${aMid('triceps')}" rx="2"/>
            <!-- 前臂 -->
            <ellipse cx="18" cy="105" rx="6" ry="14" fill="rgba(255,255,255,0.06)"/>
            <ellipse cx="92" cy="105" rx="6" ry="14" fill="rgba(255,255,255,0.06)"/>
            <!-- 股四 -->
            <rect x="38" y="120" width="14" height="50" fill="${a('quads')}" rx="5"/>
            <rect x="58" y="120" width="14" height="50" fill="${a('quads')}" rx="5"/>
            <!-- 小腿 -->
            <rect x="40" y="172" width="11" height="38" fill="${a('calves')}" rx="4"/>
            <rect x="59" y="172" width="11" height="38" fill="${a('calves')}" rx="4"/>
          </svg>
          <svg viewBox="0 0 110 220" class="bodymap-svg">
            <!-- 后视:头 -->
            <ellipse cx="55" cy="18" rx="13" ry="15" fill="rgba(255,255,255,0.06)"/>
            <rect x="48" y="32" width="14" height="8" fill="rgba(255,255,255,0.08)" rx="2"/>
            <!-- 后肩 -->
            <ellipse cx="30" cy="48" rx="14" ry="10" fill="${a('shoulders')}"/>
            <ellipse cx="80" cy="48" rx="14" ry="10" fill="${a('shoulders')}"/>
            <!-- 背阔 -->
            <path d="M28 52 Q55 56 82 52 L78 100 Q55 102 32 100 Z" fill="${a('back')}"/>
            <!-- 三头(后视清晰) -->
            <ellipse cx="20" cy="70" rx="8" ry="18" fill="${a('triceps')}"/>
            <ellipse cx="90" cy="70" rx="8" ry="18" fill="${a('triceps')}"/>
            <!-- 臀 -->
            <ellipse cx="44" cy="125" rx="13" ry="15" fill="${a('glutes')}"/>
            <ellipse cx="66" cy="125" rx="13" ry="15" fill="${a('glutes')}"/>
            <!-- 腘绳 -->
            <rect x="38" y="140" width="14" height="40" fill="${a('hamstrings')}" rx="5"/>
            <rect x="58" y="140" width="14" height="40" fill="${a('hamstrings')}" rx="5"/>
            <!-- 小腿 -->
            <rect x="40" y="180" width="11" height="32" fill="${a('calves')}" rx="4"/>
            <rect x="59" y="180" width="11" height="32" fill="${a('calves')}" rx="4"/>
          </svg>
        </div>
        <div class="bodymap-tags">
          ${[...active].map(k => `<span class="muscle-tag highlight">${muscleLabel(k)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function muscleLabel(k) {
    return ({
      chest:'胸', back:'背', shoulders:'肩', biceps:'二头', triceps:'三头',
      quads:'股四头', hamstrings:'腘绳', glutes:'臀', calves:'小腿', core:'核心',
    })[k] || k;
  }

  global.BodyMap = { render, muscleLabel };
})(window);
