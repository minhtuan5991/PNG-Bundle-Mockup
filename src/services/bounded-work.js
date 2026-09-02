'use strict';

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  let firstError = null;
  async function worker() {
    while (!firstError) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      try {
        results[index] = await mapper(items[index], index);
      } catch (error) {
        firstError ||= error;
      }
    }
  }
  const workerCount = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (firstError) throw firstError;
  return results;
}

function createConcurrencyLimiter(concurrency) {
  let activeCount = 0;
  const queue = [];
  function drain() {
    while (activeCount < concurrency && queue.length > 0) {
      const entry = queue.shift();
      activeCount += 1;
      Promise.resolve()
        .then(entry.task)
        .then(entry.resolve, entry.reject)
        .finally(() => {
          activeCount -= 1;
          drain();
        });
    }
  }
  return (task) => new Promise((resolve, reject) => {
    queue.push({ task, resolve, reject });
    drain();
  });
}

function memoizeBounded(cache, key, factory, maximumEntries = 64) {
  if (cache.has(key)) {
    const cached = cache.get(key);
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }
  const promise = Promise.resolve().then(factory);
  cache.set(key, promise);
  promise.catch(() => {
    if (cache.get(key) === promise) cache.delete(key);
  });
  while (cache.size > maximumEntries) {
    cache.delete(cache.keys().next().value);
  }
  return promise;
}

module.exports = {
  mapWithConcurrency,
  createConcurrencyLimiter,
  memoizeBounded,
};
