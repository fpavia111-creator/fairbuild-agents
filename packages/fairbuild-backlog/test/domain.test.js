// Backlog and fade: margins across periods, loss forecasts, gains, stale estimates and backlog.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBacklog } from '../src/index.js';

const row = (period, est, cost, extra = {}) => ({ job: '24-1', period, contract_amount: 100000, estimated_cost: est, cost_to_date: cost, ...extra });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('a steady margin is clean and backlog is the contract less earned revenue', () => {
  const r = checkBacklog({ rows: [row('2026-09', 80000, 20000), row('2026-10', 80500, 40000)] });
  assert.equal(r.items[0].status, 'ok'); assert.equal(r.items[0].backlog, 50310.56);
});

test('periods are read from dates and sorted, whatever the row order', () => {
  const r = checkBacklog({ rows: [row('2026-10-31', 90000, 40000), row('2026-08-31', 80000, 10000)] });
  assert.equal(r.items[0].first_period, '2026-08'); assert.equal(r.items[0].latest_margin_pct, 10);
  assert.deepEqual(codes(r), ['margin_fade']);
});

test('fade is reported in points and in gross profit lost', () => {
  const f = checkBacklog({ rows: [row('2026-08', 80000, 10000), row('2026-10', 85000, 40000)] }).items[0].findings[0];
  assert.equal(f.code, 'margin_fade'); assert.equal(f.amount, 5000); assert.match(f.detail, /20% \(2026-08\) to 15% \(2026-10\), 5 points/);
});

test('fade since last period is reported separately from fade since the start', () => {
  const r = checkBacklog({ rows: [row('2026-08', 80000, 10000), row('2026-09', 80000, 20000), row('2026-10', 84000, 40000)] });
  assert.deepEqual(codes(r), ['margin_fade', 'fade_since_last']);
});

test('a loss forecast is reported with the estimated loss', () => {
  const r = checkBacklog({ rows: [row('2026-10', 105000, 50000)] });
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['loss_forecast', -5000]]);
});

test('a sharp margin gain is a review, not good news', () => {
  assert.deepEqual(codes(checkBacklog({ rows: [row('2026-08', 85000, 10000), row('2026-10', 78000, 40000)] })), ['margin_gain']);
});

test('an estimate unchanged for three periods while progress moved is flagged; a new job is not', () => {
  assert.deepEqual(codes(checkBacklog({ rows: [row('2026-08', 80000, 0), row('2026-09', 80000, 10000), row('2026-10', 80000, 30000)] })), ['estimate_not_updated']);
  assert.equal(checkBacklog({ rows: [row('2026-10', 80000, 0)] }).items[0].status, 'ok');
});
