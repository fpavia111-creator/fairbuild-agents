// WIP by cost to cost: earned revenue, over and under billing, loss provision, estimates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWip } from '../src/index.js';

const job = (extra = {}) => ({ job: '24-1', contract_amount: 100000, estimated_cost: 80000, cost_to_date: 40000, billed_to_date: 50000, ...extra });
const run = (rows, settings = {}) => buildWip({ rows, settings, periodEnd: '2026-10-31' });

test('half the cost spent earns half the contract; billing exactly that is neither over nor under', () => {
  const i = run([job()]).items[0];
  assert.equal(i.percent_complete, 50); assert.equal(i.earned_revenue, 50000); assert.equal(i.over_billed, 0); assert.equal(i.under_billed, 0); assert.equal(i.gross_profit_to_date, 10000);
});

test('billing above earned revenue is over billing; below is under billing', () => {
  assert.equal(run([job({ billed_to_date: 60000 })]).over_billings, 10000);
  assert.equal(run([job({ billed_to_date: 47000 })]).under_billings, 3000);
});

test('large under billings are flagged against the alert percent of the contract', () => {
  assert.deepEqual(run([job({ billed_to_date: 40000 })]).items[0].findings.map((f) => f.code), ['under_billed_large']);
  assert.equal(run([job({ billed_to_date: 40000 })], { under_alert_pct: 15 }).items[0].status, 'ok');
});

test('a loss job recognises the rest of the expected loss now', () => {
  const i = run([job({ estimated_cost: 110000, cost_to_date: 44000, billed_to_date: 40000 })]).items[0];
  // 40% complete, expected loss 10000, 4000 already in gross profit to date, 6000 to recognise.
  assert.equal(i.status, 'loss'); assert.equal(i.loss_provision, 6000); assert.equal(i.gross_profit_to_date, -4000);
});

test('cost past the estimate holds percent complete at 100% and asks for a new estimate', () => {
  const i = run([job({ cost_to_date: 90000, billed_to_date: 100000 })]).items[0];
  assert.equal(i.percent_complete, 100); assert.deepEqual(i.findings.map((f) => f.code), ['cost_exceeds_estimate']);
});

test('a job with cost but no estimate is not given a percent complete', () => {
  const i = run([job({ estimated_cost: '' })]).items[0];
  assert.equal(i.percent_complete, null); assert.equal(i.earned_revenue, null); assert.deepEqual(i.findings.map((f) => f.code), ['no_estimate']);
});

test('rows for one job are added together, and billing past the contract is flagged', () => {
  const r = run([job({ cost_to_date: 20000, billed_to_date: 60000 }), job({ cost_to_date: 20000, billed_to_date: 50000, contract_amount: 0, estimated_cost: 0 })]);
  assert.equal(r.jobs, 1); assert.equal(r.items[0].billed_to_date, 110000);
  assert.ok(r.items[0].findings.some((f) => f.code === 'billed_over_contract'));
});
