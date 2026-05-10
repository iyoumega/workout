/**
 * Settings sheet — sound, vibration, week start, etc.
 * Public:
 *   SettingsView.open()
 */
(function (global) {

  async function open() {
    const s = await Storage.getSettings();

    UI.showModal(`
      <div class="sheet">
        <div class="sheet-header">
          <h2 style="margin:0">设置</h2>
          <button class="btn btn-icon" data-act="close"><svg viewBox="0 0 24 24"><use href="#i-x"/></svg></button>
        </div>
        <div class="sheet-body">
          <div class="section-title" style="margin-top:0">通知与反馈</div>
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
