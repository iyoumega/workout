/**
 * Audio module — 只保留蜂鸣和节拍器,语音功能已移除。
 *
 * 公开:
 *   AudioCue.beep(freq, duration)      — 单次哔
 *   AudioCue.tickStart(bpm)            — 节拍器
 *   AudioCue.tickStop()                — 停节拍器
 *   AudioCue.isTicking()
 *   AudioCue.setQuiet(bool)            — 一键静音
 *   AudioCue.isMetronomeEnabled()
 */
(function (global) {
  let ctx = null;
  let tickInterval = null;
  let quietMode = false;

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return ctx;
  }

  function setQuiet(v) { quietMode = !!v; if (v) tickStop(); }

  function beep(freq, duration) {
    if (quietMode) return;
    const c = ensureCtx();
    if (!c) return;
    try { if (c.state === 'suspended') c.resume(); } catch (e) {}
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = freq || 880;
    osc.type = 'sine';
    osc.connect(gain); gain.connect(c.destination);
    const dur = duration || 0.12;
    const now = c.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  function tickStart(bpm) {
    tickStop();
    const interval = 60000 / Math.max(40, Math.min(180, bpm || 60));
    let beat = 0;
    const tick = () => {
      beat++;
      const accent = (beat % 4 === 1);
      beep(accent ? 1200 : 700, 0.05);
    };
    tick();
    tickInterval = setInterval(tick, interval);
  }
  function tickStop() {
    if (tickInterval) clearInterval(tickInterval);
    tickInterval = null;
  }
  function isTicking() { return !!tickInterval; }

  async function isMetronomeEnabled() {
    const s = await Storage.getSettings();
    if (s.quietMode) return false;
    return s.metronome === true;
  }

  // 向后兼容:其他代码可能还在调这两个 — 静默返回
  function speak() {}
  function stopSpeak() {}
  async function isVoiceEnabled() { return false; }

  global.AudioCue = {
    beep, tickStart, tickStop, isTicking,
    setQuiet, isMetronomeEnabled,
    // 兼容空函数
    speak, stopSpeak, isVoiceEnabled,
  };
})(window);
