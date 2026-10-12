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

  debounced.isPending = () => Boolean(timerId);

  return debounced;
}

/**
 * Throttle a function so it only runs once per interval, with trailing-edge guarantee.
 * @param {Function} fn
 * @param {number} interval - interval in milliseconds
 * @returns {Function}
 */
export function throttle(fn, interval = 200) {
  let lastTime = 0;
  let timerId = null;
  let lastArgs = null;
  let lastThis = null;

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = interval - (now - lastTime);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > interval) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastTime = now;
      fn.apply(lastThis, lastArgs);
    } else if (!timerId) {
      timerId = setTimeout(() => {
        lastTime = Date.now();
        timerId = null;
        fn.apply(lastThis, lastArgs);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  throttled.isPending = () => Boolean(timerId);

  return throttled;
}
