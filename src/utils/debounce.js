/**
 * Debounce a function so it only runs after a delay has elapsed since the last call.
 * @param {Function} fn
 * @param {number} delay - delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timerId;
  let lastArgs;
  let lastThis;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      timerId = null;
      fn.apply(lastThis, lastArgs);
    }, delay);
  };

  debounced.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  debounced.flush = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
      fn.apply(lastThis, lastArgs);
    }
  };

  return debounced;
}

/**
 * Throttle a function so it only runs once per interval.
 * @param {Function} fn
 * @param {number} interval - interval in milliseconds
 * @returns {Function}
 */
export function throttle(fn, interval = 200) {
  let lastTime = 0;
  let timerId = null;

  const throttled = function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };

  throttled.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return throttled;
}
