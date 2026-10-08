/**
 * Debounce a function so it only runs after a delay has elapsed since the last call.
 * @param {Function} fn
 * @param {number} delay - delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timerId;
  return function (...args) {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle a function so it only runs once per interval.
 * @param {Function} fn
 * @param {number} interval - interval in milliseconds
 * @returns {Function}
 */
export function throttle(fn, interval = 200) {
  let lastTime = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}
