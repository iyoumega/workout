/**
 * Storage layer — async API over localStorage.
 * Replace internals with Supabase later; keep method signatures stable.
 *
 * Keys (all prefixed with `workout:`):
 *   profile, photos, plan, settings, log:<YYYY-MM-DD>
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

    // ---------- photos ----------
    async getPhotos() { return readJSON(k('photos')); },
    async savePhotos(photos) {
      const value = { ...photos, updatedAt: new Date().toISOString() };
      await writeJSON(k('photos'), value);
      return value;
    },
    async clearPhotos() { await remove(k('photos')); },

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

    // ---------- settings ----------
    async getSettings() {
      const v = await readJSON(k('settings'));
      return v || { onboarded: false, theme: 'dark', unit: 'metric' };
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
