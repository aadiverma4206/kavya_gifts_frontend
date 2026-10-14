/**
 * Safe LocalStorage & SessionStorage wrapper to prevent crashes in private browsing,
 * SSR, quota exceeded, or restricted iframe environments.
 * Includes in-memory Map fallback and TTL (time-to-live) expiration support.
 */

function createStorageWrapper(type) {
  // In-memory fallback dictionary if storage is disabled or quota is breached
  const memoryFallback = new Map();

  const isAvailable = () => {
    try {
      if (typeof window === "undefined") return false;
      const storage = window[type];
      if (!storage) return false;
      const testKey = "__storage_test__";
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };

  const hasStorage = isAvailable();

  return {
    get: (key, defaultValue = null) => {
      try {
        if (!hasStorage || typeof window === "undefined" || !window[type]) {
          return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
        }
        const item = window[type].getItem(key);
        if (item === null) {
          return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
        }
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      } catch (err) {
        console.warn(`[${type}] Could not read "${key}":`, err);
        return memoryFallback.has(key) ? memoryFallback.get(key) : defaultValue;
      }
    },

    set: (key, value) => {
      try {
        if (value === undefined) {
          memoryFallback.delete(key);
          if (hasStorage && window[type]) window[type].removeItem(key);
          return true;
        }
        memoryFallback.set(key, value);
        if (hasStorage && window[type]) {
          const serialized = typeof value === "string" ? value : JSON.stringify(value);
          window[type].setItem(key, serialized);
        }
        return true;
      } catch (err) {
        console.warn(`[${type}] Storage write failed, caching in memory for "${key}":`, err);
        memoryFallback.set(key, value);
        return true;
      }
    },

    setWithExpiry: (key, value, ttlMs = 86400000) => {
      const itemWithExpiry = {
        value,
        expiry: Date.now() + ttlMs,
      };
      return createStorageWrapper(type).set(key, itemWithExpiry);
    },

    getWithExpiry: (key, defaultValue = null) => {
      const raw = createStorageWrapper(type).get(key, null);
      if (!raw || typeof raw !== "object" || !raw.expiry) {
        return raw !== null ? raw : defaultValue;
      }
      if (Date.now() > raw.expiry) {
        createStorageWrapper(type).remove(key);
        return defaultValue;
      }
      return raw.value;
    },

    has: (key) => {
      if (memoryFallback.has(key)) return true;
      try {
        if (!hasStorage || typeof window === "undefined" || !window[type]) return false;
        return window[type].getItem(key) !== null;
      } catch {
        return false;
      }
    },

    remove: (key) => {
      memoryFallback.delete(key);
      try {
        if (hasStorage && window[type]) {
          window[type].removeItem(key);
        }
        return true;
      } catch (err) {
        console.warn(`[${type}] Could not remove "${key}":`, err);
        return false;
      }
    },

    clear: () => {
      memoryFallback.clear();
      try {
        if (hasStorage && window[type]) {
          window[type].clear();
        }
        return true;
      } catch (err) {
        console.warn(`[${type}] Could not clear:`, err);
        return false;
      }
    },

    isAvailable,
  };
}

export const safeStorage = createStorageWrapper("localStorage");
export const safeSessionStorage = createStorageWrapper("sessionStorage");

export default safeStorage;
