/**
 * Safe LocalStorage & SessionStorage wrapper to prevent crashes in private browsing,
 * SSR, quota exceeded, or restricted iframe environments.
 */

function createStorageWrapper(type) {
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

  return {
    get: (key, defaultValue = null) => {
      try {
        if (typeof window === "undefined" || !window[type]) return defaultValue;
        const item = window[type].getItem(key);
        if (item === null) return defaultValue;
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      } catch (err) {
        console.warn(`[${type}] Could not read "${key}":`, err);
        return defaultValue;
      }
    },

    set: (key, value) => {
      try {
        if (typeof window === "undefined" || !window[type]) return false;
        if (value === undefined) {
          window[type].removeItem(key);
          return true;
        }
        const serialized = typeof value === "string" ? value : JSON.stringify(value);
        window[type].setItem(key, serialized);
        return true;
      } catch (err) {
        console.warn(`[${type}] Could not write "${key}":`, err);
        return false;
      }
    },

    has: (key) => {
      try {
        if (typeof window === "undefined" || !window[type]) return false;
        return window[type].getItem(key) !== null;
      } catch {
        return false;
      }
    },

    remove: (key) => {
      try {
        if (typeof window === "undefined" || !window[type]) return false;
        window[type].removeItem(key);
        return true;
      } catch (err) {
        console.warn(`[${type}] Could not remove "${key}":`, err);
        return false;
      }
    },

    clear: () => {
      try {
        if (typeof window === "undefined" || !window[type]) return false;
        window[type].clear();
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

