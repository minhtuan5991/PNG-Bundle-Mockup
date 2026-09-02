'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  mapWithConcurrency,
  createConcurrencyLimiter,
  memoizeBounded,
} = require('../src/services/bounded-work');

test('mapWithConcurrency giữ thứ tự kết quả và không vượt giới hạn', async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([30, 5, 15, 1], 2, async (delay, index) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, delay));
    active -= 1;
    return index * 2;
  });
  assert.deepEqual(results, [0, 2, 4, 6]);
  assert.equal(peak, 2);
});

test('mapWithConcurrency chờ tác vụ đang chạy kết thúc rồi mới báo lỗi', async () => {
  const events = [];
  await assert.rejects(
    mapWithConcurrency(['slow', 'fail', 'queued'], 2, async (item) => {
      events.push(`start:${item}`);
      if (item === 'slow') {
        await new Promise((resolve) => setTimeout(resolve, 25));
        events.push('done:slow');
        return item;
      }
      if (item === 'fail') throw new Error('expected');
      events.push('unexpected:queued');
      return item;
    }),
    /expected/,
  );
  assert.ok(events.includes('done:slow'));
  assert.ok(!events.includes('unexpected:queued'));
});

test('limiter và cache chia sẻ đúng một phép tính đồng thời', async () => {
  const limiter = createConcurrencyLimiter(1);
  const cache = new Map();
  let calls = 0;
  const factory = () => limiter(async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return Buffer.from('same');
  });
  const [first, second] = await Promise.all([
    memoizeBounded(cache, 'design', factory, 2),
    memoizeBounded(cache, 'design', factory, 2),
  ]);
  assert.equal(calls, 1);
  assert.deepEqual(first, second);
});
