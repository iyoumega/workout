/**
 * Storage layer — async API over localStorage.
 * Replace internals with Supabase later; keep method signatures stable.
 *
 * Keys (all prefixed with `workout:`):
 *   profile, photos, plan, settings, weights,
 *   log:<YYYY-MM-DD>
 */
(function (global) {
  const PREFIX = 'workout:';
  const LOG_PREFIX = PREFIX + 'log:';
  const CAPACITY_WARN_BYTES = 4 * 1024 * 1024; // 4MB

  function k(name) { return PREFIX + name; }

  async function readJSON(key) {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    try { return JSON.parse(raw); }
    catch (e) { console.warn('storage parse fail', key, e); return null; }
  }

  async function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('storage write fail', key, e);
      throw e;
    }
  }

  async function remove(key) { localStorage.removeItem(key); }

  function totalBytes() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      const v = localStorage.getItem(key) || '';
      total += key.length + v.length;
    }
    return total * 2; // utf-16
  }

  const Storage = {
    // ---------- profile ----------
    async getProfile() { return readJSON(k('profile')); },
    async saveProfile(profile) {
      const now = new Date().toISOString();
      const merged = {
        version: 1,
        createdAt: profile.createdAt || now,
        ...profile,
        updatedAt: now,
      };
      await writeJSON(k('profile'), merged);
      return merged;
    },

    // ---------- photos (latest, for compatibility) ----------
    async getPhotos() { return readJSON(k('photos')); },
    async savePhotos(photos) {
      const value = { ...photos, updatedAt: new Date().toISOString() };
      await writeJSON(k('photos'), value);
      // 同时把当前照片归档到时间序列
      try { await this.archivePhotos(value); } catch (e) {}
      return value;
    },
    async clearPhotos() { await remove(k('photos')); },

    // ---------- photo sessions (time series) ----------
    async getPhotoSessions() {
      const v = await readJSON(k('photo_sessions'));
      return v || { sessions: [] };
    },
    async archivePhotos(photoSet) {
      const data = await this.getPhotoSessions();
      const dateKey = new Date().toISOString().slice(0, 10);
      // 同一天覆盖
      data.sessions = (data.sessions || []).filter(s => s.date !== dateKey);
      data.sessions.push({
        date: dateKey,
        front: photoSet.front || null,
        side: photoSet.side || null,
        back: photoSet.back || null,
        at: new Date().toISOString(),
      });
      data.sessions.sort((a, b) => a.date.localeCompare(b.date));
      await writeJSON(k('photo_sessions'), data);
      return data;
    },
    async removePhotoSession(dateKey) {
      const data = await this.getPhotoSessions();
      data.sessions = (data.sessions || []).filter(s => s.date !== dateKey);
      await writeJSON(k('photo_sessions'), data);
      return data;
    },

    // ---------- plan ----------
    async getPlan() { return readJSON(k('plan')); },
    async savePlan(plan) {
      await writeJSON(k('plan'), plan);
      return plan;
    },
    async clearPlan() { await remove(k('plan')); },

    // ---------- logs ----------
    async getLog(dateKey) { return readJSON(LOG_PREFIX + dateKey); },
    async saveLog(dateKey, log) {
      await writeJSON(LOG_PREFIX + dateKey, log);
      return log;
    },
    async listLogs() {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LOG_PREFIX)) continue;
        const dateKey = key.slice(LOG_PREFIX.length);
        try { out[dateKey] = JSON.parse(localStorage.getItem(key)); }
        catch (e) { /* skip */ }
      }
      return out;
    },

    // ---------- custom exercises ----------
    async getCustomExercises() {
      const v = await readJSON(k('custom_exercises'));
      return v || { items: [] };
    },
    async addCustomExercise(ex) {
      const data = await this.getCustomExercises();
      const id = ex.id || ('custom_' + Date.now());
      const item = { ...ex, id, custom: true, createdAt: new Date().toISOString() };
      data.items = data.items.filter(e => e.id !== id);
      data.items.push(item);
      await writeJSON(k('custom_exercises'), data);
      return item;
    },
    async removeCustomExercise(id) {
      const data = await this.getCustomExercises();
      data.items = data.items.filter(e => e.id !== id);
      await writeJSON(k('custom_exercises'), data);
      return data;
    },

    // ---------- chat history ----------
    async getChatHistory() {
      const v = await readJSON(k('chat'));
      return v || { messages: [] };
    },
    async saveChatHistory(messages) {
      // 限制最近 60 条
      const trimmed = (messages || []).slice(-60);
      await writeJSON(k('chat'), { messages: trimmed, updatedAt: new Date().toISOString() });
      return trimmed;
    },
    async clearChatHistory() { await remove(k('chat')); },

    // ---------- weekly journals ----------
    async getJournals() {
      const v = await readJSON(k('journals'));
      return v || { items: {} };
    },
    async saveJournal(weekStartDate, text) {
      const data = await this.getJournals();
      data.items[weekStartDate] = { text, at: new Date().toISOString() };
      await writeJSON(k('journals'), data);
      return data;
    },

    // ---------- weights (body weight time series) ----------
    async getWeights() {
      const v = await readJSON(k('weights'));
      return v || { entries: [] };
    },
    async addWeight(kg, dateKey) {
      const data = await this.getWeights();
      const date = dateKey || new Date().toISOString().slice(0, 10);
      // 同一天覆盖最新值
      data.entries = data.entries.filter(e => e.date !== date);
      data.entries.push({ date, kg: Number(kg), at: new Date().toISOString() });
      data.entries.sort((a, b) => a.date.localeCompare(b.date));
      await writeJSON(k('weights'), data);
      return data;
    },
    async removeWeight(dateKey) {
      const data = await this.getWeights();
      data.entries = data.entries.filter(e => e.date !== dateKey);
      await writeJSON(k('weights'), data);
      return data;
    },

    // ---------- settings ----------
    async getSettings() {
      const v = await readJSON(k('settings'));
      return {
        onboarded: false,
        theme: 'dark',
        unit: 'metric',
        sound: true,
        vibration: true,
        weekStart: 1,           // 1 = Monday
        achievements: [],       // earned achievement ids
        ...(v || {}),
      };
    },
    async saveSettings(s) {
      const cur = await this.getSettings();
      const merged = { ...cur, ...s };
      await writeJSON(k('settings'), merged);
      return merged;
    },

    // ---------- bulk ----------
    async clearAll() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(PREFIX)) keys.push(key);
      }
      keys.forEach(key => localStorage.removeItem(key));
    },

    async exportAll() {
      const dump = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(PREFIX)) continue;
        dump[key] = localStorage.getItem(key);
      }
      return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data: dump }, null, 2);
    },

    async importAll(jsonStr) {
      const obj = JSON.parse(jsonStr);
      if (!obj.data) throw new Error('invalid backup');
      await this.clearAll();
      for (const [key, value] of Object.entries(obj.data)) {
        localStorage.setItem(key, value);
      }
    },

    // ---------- capacity ----------
    capacityInfo() {
      const used = totalBytes();
      return { used, warn: used > CAPACITY_WARN_BYTES, limit: CAPACITY_WARN_BYTES };
    },
  };

  global.Storage = Storage;
})(window);
