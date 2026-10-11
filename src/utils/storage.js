/**
 * Safe LocalStorage wrapper to prevent crashes in private browsing or restricted environments.
 */

export const safeStorage = {
  get: (key, defaultValue = null) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return defaultValue;
      const item = window.localStorage.getItem(key);
      if (item === null) return defaultValue;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    } catch (err) {
      console.warn(`[storage] Could not read "${key}" from localStorage:`, err);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      window.localStorage.setItem(key, serialized);
      return true;
    } catch (err) {
      console.warn(`[storage] Could not write "${key}" to localStorage:`, err);
      return false;
    }
  },

  remove: (key) => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[storage] Could not remove "${key}" from localStorage:`, err);
      return false;
    }
  },

  clear: () => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return false;
      window.localStorage.clear();
      return true;
    } catch (err) {
      console.warn("[storage] Could not clear localStorage:", err);
      return false;
    }
  },
};

export default safeStorage;
