/**
 * Safe LocalStorage wrapper to prevent crashes in private browsing or restricted environments.
 */

export const safeStorage = {
  get: (key, defaultValue = null) => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.warn(`[storage] Could not read "${key}" from localStorage:`, err);
      return defaultValue;
    }
  },

  set: (key, value) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn(`[storage] Could not write "${key}" to localStorage:`, err);
      return false;
    }
  },

  remove: (key) => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.warn(`[storage] Could not remove "${key}" from localStorage:`, err);
      return false;
    }
  },

  clear: () => {
    try {
      window.localStorage.clear();
      return true;
    } catch (err) {
      console.warn("[storage] Could not clear localStorage:", err);
      return false;
    }
  },
};

export default safeStorage;
