/**
 * Audio module — 语音(Speech Synthesis)+ 节拍器(Web Audio).
 *
 * 公开:
 *   AudioCue.speak(text, opts)         — 文字转语音(中文)
 *   AudioCue.beep(freq, duration)      — 单次哔
 *   AudioCue.tickStart(bpm)            — 启动节拍器,每拍滴答
 *   AudioCue.tickStop()                — 停节拍器
 *   AudioCue.countdown(secs, onTick)   — 启动倒计时人声(3,2,1,开始)
 *   AudioCue.isVoiceEnabled()          — 看 settings 是否开启
 */
(function (global) {
  let ctx = null;
  let tickInterval = null;
  let voicesCache = null;

  function ensureCtx() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return ctx;
  }

  function beep(freq, duration) {
    const c = ensureCtx();
    if (!c) return;
    try { if (c.state === 'suspended') c.resume(); } catch(e){}
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.frequency.value = freq || 880;
    osc.type = 'sine';
    osc.connect(gain); gain.connect(c.destination);
    const dur = (duration || 0.12);
    const now = c.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  }

  // 启动节拍器,bpm 每分钟拍数。重音(每 4 拍一次)用更高频。
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

  // 语音(优先选中文音色)
  function getZhVoice() {
    if (!('speechSynthesis' in window)) return null;
    if (voicesCache) return voicesCache;
    const list = window.speechSynthesis.getVoices() || [];
    const zh = list.find(v => /zh|cmn|chinese/i.test(v.lang)) || list[0];
    voicesCache = zh || null;
    return voicesCache;
  }

  // 一些设备上 voices 是异步加载的
  if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCache = null;
      getZhVoice();
    };
  }

  function speak(text, opts = {}) {
    if (!('speechSynthesis' in window)) return;
    if (!text) return;
    try {
      window.speechSynthesis.cancel(); // 别让多个堆积
      const u = new SpeechSynthesisUtterance(text);
      const v = getZhVoice();
      if (v) u.voice = v;
      u.lang = 'zh-CN';
      u.rate = opts.rate ?? 1.0;
      u.pitch = opts.pitch ?? 1.0;
      u.volume = opts.volume ?? 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) { /* silent */ }
  }

  function stopSpeak() {
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch(e){}
  }

  async function isVoiceEnabled() {
    const s = await Storage.getSettings();
    return s.voice !== false; // 默认开
  }
  async function isMetronomeEnabled() {
    const s = await Storage.getSettings();
    return s.metronome === true; // 默认关
  }

  // 倒计时:3,2,1,开始
  async function countdown(secs, onTick) {
    if (!('speechSynthesis' in window)) return;
    const enabled = await isVoiceEnabled();
    if (!enabled) return;
    for (let i = secs; i > 0; i--) {
      speak(String(i), { rate: 1.1 });
      if (onTick) onTick(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    speak('开始', { rate: 1.0 });
  }

  global.AudioCue = {
    beep, tickStart, tickStop, isTicking,
    speak, stopSpeak, countdown,
    isVoiceEnabled, isMetronomeEnabled,
  };
})(window);
