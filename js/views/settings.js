/**
 * Settings sheet — sound, vibration, week start, etc.
 * Public:
 *   SettingsView.open()
 */
(function (global) {

  async function open() {
    const s = await Storage.getSettings();

    const coachName = s.coachName || '小橙';
    const coachTone = s.coachTone || 'friendly';
    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">设置</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="section-title" style="margin-top:0">教练</div>
          <div class="setting-row column-stack">
            <span class="label">教练昵称</span>
            <input class="setting-input" type="text" data-key="coachName" maxlength="10" placeholder="小橙" value="${coachName.replace(/"/g,'&quot;')}" />
          </div>
          <div class="setting-row column-stack">
            <span class="label">教练语气</span>
            <div class="seg-control" data-key="coachTone">
              <button data-value="friendly" class="${coachTone==='friendly'?'active':''}">亲和</button>
              <button data-value="strict" class="${coachTone==='strict'?'active':''}">严师</button>
              <button data-value="playful" class="${coachTone==='playful'?'active':''}">俏皮</button>
              <button data-value="gentle" class="${coachTone==='gentle'?'active':''}">温柔</button>
            </div>
          </div>

          <div class="section-title">通知与反馈</div>
          <div class="setting-row">
            <span class="label">安静模式</span>
            <label class="switch">
              <input type="checkbox" data-key="quietMode" ${s.quietMode?'checked':''} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row column-stack">
            <span class="label">公共场合一键静音 — 关闭所有提示音、语音、节拍器(振动可单独控)</span>
          </div>
          <div class="setting-row">
            <span class="label">提示音</span>
            <label class="switch">
              <input type="checkbox" data-key="sound" ${s.sound?'checked':''} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row">
            <span class="label">振动</span>
            <label class="switch">
              <input type="checkbox" data-key="vibration" ${s.vibration?'checked':''} />
              <span class="slider"></span>
            </label>
          </div>

          <div class="section-title">日历</div>
          <div class="setting-row column-stack">
            <span class="label">每周起始日</span>
            <div class="seg-control" data-key="weekStart">
              <button data-value="1" class="${s.weekStart===1?'active':''}">周一</button>
              <button data-value="0" class="${s.weekStart===0?'active':''}">周日</button>
            </div>
          </div>

          <div class="section-title">单位</div>
          <div class="setting-row column-stack">
            <span class="label">重量 / 长度</span>
            <div class="seg-control" data-key="unit">
              <button data-value="metric" class="${s.unit==='metric'?'active':''}">公制 (kg/cm)</button>
              <button data-value="imperial" class="${s.unit==='imperial'?'active':''}">英制 (lb/in)</button>
            </div>
          </div>

          <div class="section-title">AI 教练</div>
          <div class="setting-row">
            <span class="label">今日页 AI 点评</span>
            <label class="switch">
              <input type="checkbox" data-key-invert="aiTipDisabled" ${!s.aiTipDisabled?'checked':''} />
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-row column-stack">
            <span class="label">每次 AI 点评会调用一次接口生成个性化建议,关闭后今日页不再显示该模块</span>
          </div>

          <div class="section-title">关于</div>
          <div class="setting-row">
            <span class="label">版本</span>
            <span class="text-dim">v0.3</span>
          </div>
          <div class="setting-row">
            <span class="label">数据存储</span>
            <span class="text-dim">本地浏览器</span>
          </div>

          <p class="text-xs text-faint center mt-16">设置变更立即生效</p>
        </div>
      </div>
    `, (modal, close) => {
      modal.querySelector('[data-act="close"]').addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });

      // toggle switches
      modal.querySelectorAll('input[type=checkbox][data-key]').forEach(input => {
        input.addEventListener('change', async () => {
          await Storage.saveSettings({ [input.dataset.key]: input.checked });
          // 安静模式即时同步到 AudioCue
          if (input.dataset.key === 'quietMode' && typeof AudioCue !== 'undefined') {
            AudioCue.setQuiet(input.checked);
          }
          UI.toast('已保存', { type: 'success', icon: 'i-check', ttl: 1200 });
        });
      });
      // inverted toggles (true means disabled)
      modal.querySelectorAll('input[type=checkbox][data-key-invert]').forEach(input => {
        input.addEventListener('change', async () => {
          await Storage.saveSettings({ [input.dataset.keyInvert]: !input.checked });
          UI.toast('已保存', { type: 'success', icon: 'i-check', ttl: 1200 });
        });
      });
      // text inputs (debounced save on blur)
      modal.querySelectorAll('input[type=text][data-key]').forEach(input => {
        input.addEventListener('blur', async () => {
          const val = input.value.trim() || '小橙';
          await Storage.saveSettings({ [input.dataset.key]: val });
          UI.toast('已保存', { type: 'success', icon: 'i-check', ttl: 1200 });
        });
      });
      // segmented controls
      modal.querySelectorAll('.seg-control[data-key]').forEach(seg => {
        seg.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', async () => {
            seg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            let val = btn.dataset.value;
            if (seg.dataset.key === 'weekStart') val = Number(val);
            await Storage.saveSettings({ [seg.dataset.key]: val });
            UI.toast('已保存', { type: 'success', icon: 'i-check', ttl: 1200 });
          });
        });
      });
    });
  }

  global.SettingsView = { open };
})(window);
