import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, elapsed, remaining, toggleWork, toggleDay, validState, format } from './timer.js';
test('stopwatch survives closing, pauses without counting break, resumes', () => {
  let s = initialState(); toggleWork(s, 1000);
  s = JSON.parse(JSON.stringify(s)); assert.equal(elapsed(s.work, 61000), 60000);
  toggleWork(s, 61000); assert.equal(elapsed(s.work, 120000), 60000);
  toggleWork(s, 120000); assert.equal(elapsed(s.work, 150000), 90000);
});
test('day runs independently of stopwatch and restores after closing', () => {
  let s = initialState(); toggleDay(s, 1000); toggleWork(s, 1000); toggleWork(s, 61000);
  s = JSON.parse(JSON.stringify(s)); assert.equal(elapsed(s.work, 121000), 60000); assert.equal(remaining(s.day, 121000), s.day.duration - 120000);
  assert.equal(remaining(s.day, 100000000), 0);
});
test('day pause, resume, restart after completion', () => {
  const s = initialState(); s.day.duration = s.day.remaining = 60000;
  toggleDay(s, 1000); toggleDay(s, 31000); assert.equal(remaining(s.day, 100000), 30000);
  toggleDay(s, 100000); assert.equal(remaining(s.day, 130000), 0);
  toggleDay(s, 130000); toggleDay(s, 140000); assert.equal(remaining(s.day, 150000), 50000);
});
test('backward clock does not subtract accrued time; supports long durations', () => {
  const s = initialState(); toggleWork(s, 2000); assert.equal(elapsed(s.work, 1000), 0);
  assert.equal(format(25 * 3600000 + 61000), '25:01:01'); assert.equal(format(1, true), '00:00:01');
});
test('import rejects invalid data', () => {
  assert.ok(validState(initialState()));
  for (const value of [null, {}, { ...initialState(), version: 2 }, { ...initialState(), work: { elapsed: -1, startedAt: null } }, { ...initialState(), day: { duration: 0, remaining: 0, startedAt: null, announced: false } }]) assert.ok(!validState(value));
});
