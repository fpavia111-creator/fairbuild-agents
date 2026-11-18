// Retainage: rates, stop points, release timing, collection and the subcontractor side.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRetainage } from '../src/index.js';

const job = (extra = {}) => ({ job: '24-1', client: 'Example Owner', contract_amount: 100000, billed_to_date: 50000, retainage_pct: 10, retainage_held: 5000, retainage_billed: 0, retainage_collected: 0, ...extra });
const sub = (extra = {}) => ({ commitment: 'SC-1', job: '24-1', vendor: 'Example Sub LLC', invoiced: 20000, retainage_pct: 10, retainage_held: 2000, retainage_released: 0, status: 'Open', ...extra });
const run = (receivableRows, payableRows = [], settings = {}, asOf = '2026-11-16') => checkRetainage({ receivableRows, payableRows, settings, asOf });
const codes = (r, side = 'receivable') => r.items.find((i) => i.side === side).findings.map((f) => f.code);

test('retainage at the contract rate on what was billed is clean', () => {
  assert.equal(run([job()]).items[0].status, 'ok');
});

test('less recorded than the rate gives is a rate problem; more than the rate is money the owner over-holds', () => {
  assert.deepEqual(run([job({ retainage_held: 4000 })]).items[0].findings.map((f) => [f.code, f.amount]), [['rate_off', 1000]]);
  assert.deepEqual(run([job({ retainage_held: 6000 })]).items[0].findings.map((f) => [f.code, f.amount]), [['over_withheld', 1000]]);
});

test('a stop-at percent caps retainage at that share of the contract', () => {
  assert.equal(run([job({ billed_to_date: 80000, retainage_held: 5000, stop_at_percent: 50 })]).items[0].status, 'ok');
  assert.deepEqual(codes(run([job({ billed_to_date: 80000, retainage_held: 8000, stop_at_percent: 50 })])), ['over_withheld']);
});

test('a completed job is due to bill, then overdue after release_days', () => {
  assert.deepEqual(codes(run([job({ completion_date: '2026-11-01' })])), ['release_due']);
  assert.deepEqual(codes(run([job({ completion_date: '2026-08-01' })])), ['release_overdue']);
  assert.deepEqual(codes(run([job({ completion_date: '2026-08-01' })], [], { release_days: 120 })), ['release_due']);
  assert.equal(run([job({ completion_date: '2026-12-01' })]).items[0].status, 'ok', 'a completion date in the future is not due yet');
});

test('a billed release not collected long after completion is flagged by what is missing', () => {
  const r = run([job({ completion_date: '2026-05-01', retainage_billed: 5000, retainage_collected: 1000 })]);
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['release_unpaid', 4000]]);
});

test('releasing a subcontractor before the owner pays is flagged; after the owner pays, a closed sub is owed', () => {
  assert.deepEqual(codes(run([job()], [sub({ retainage_released: 2000 })]), 'payable'), ['released_before_owner']);
  const paid = run([job({ retainage_billed: 5000, retainage_collected: 5000, completion_date: '2026-06-01' })], [sub({ status: 'Closed' })]);
  assert.deepEqual(paid.items.find((i) => i.side === 'payable').findings.map((f) => [f.code, f.amount]), [['release_owed_to_sub', 2000]]);
});

test('the net position is what owners hold from you minus what you hold from subs', () => {
  const r = run([job(), job({ job: '24-2', retainage_held: 5000, retainage_collected: 1000 })], [sub(), sub({ commitment: 'SC-2', retainage_released: 500 })]);
  assert.equal(r.receivable, 9000); assert.equal(r.payable, 3500); assert.equal(r.net, 5500);
});
