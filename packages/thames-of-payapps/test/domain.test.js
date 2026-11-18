// Pay application arithmetic: line columns, percent, balance, retainage, previous application and summary page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPayApp } from '../src/index.js';

const line = (extra = {}) => ({ item: '1', description: 'Work', scheduled_value: 10000, previous: 2000, this_period: 3000, stored_materials: 0, completed_stored: 5000, percent: 50, balance: 5000, retainage: 500, ...extra });
const run = (lines, opts = {}) => checkPayApp({ lines, ...opts });
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('a line whose columns add up is clean', () => {
  assert.equal(run([line()]).items[0].status, 'ok');
});

test('completed and stored is checked against previous + this period + stored', () => {
  assert.deepEqual(run([line({ completed_stored: 5500, balance: 4500, percent: 55, retainage: 550 })]).items[0].findings.map((f) => [f.code, f.amount]), [['line_total_off', 500]]);
});

test('percent within the tolerance passes; a wrong percent or balance is reported', () => {
  assert.equal(run([line({ percent: 50.05 })]).items[0].status, 'ok');
  assert.deepEqual(codes(run([line({ percent: 55, balance: 4000 })])), ['percent_off', 'balance_off']);
});

test('retainage uses separate rates for work completed and stored materials', () => {
  const l = line({ this_period: 1000, stored_materials: 2000, completed_stored: 5000, retainage: 300 + 100 });
  assert.equal(run([l], { settings: { retainage_pct: 10, stored_retainage_pct: 5 } }).items[0].status, 'ok');
  assert.deepEqual(codes(run([l], { settings: { retainage_pct: 10 } })), ['retainage_line_off']);
});

test('billing past the scheduled value is its own status', () => {
  const r = run([line({ this_period: 9000, completed_stored: 11000, percent: 110, balance: -1000, retainage: 1100 })]);
  assert.equal(r.items[0].status, 'over'); assert.equal(r.items[0].findings[0].amount, 1000);
});

test('from previous applications must match the last application, and a line that was not on it must start at zero', () => {
  const prev = [{ item: '1', completed_stored: 2500 }];
  assert.deepEqual(codes(run([line()], { previousLines: prev })), ['previous_mismatch']);
  assert.deepEqual(codes(run([line({ item: '2' })], { previousLines: prev })), ['previous_mismatch']);
});

test('the summary page is checked line by line against the continuation sheet', () => {
  const summary = { original_contract_sum: 10000, net_change_orders: 0, contract_sum_to_date: 10000, total_completed_stored: 5000, total_retainage: 500, total_earned_less_retainage: 4500, less_previous_certificates: 1800, current_payment_due: 2700, balance_to_finish_incl_retainage: 5500 };
  assert.equal(run([line()], { summary }).items.find((i) => i.item === 'G702').status, 'ok');
  const bad = run([line()], { summary: { ...summary, contract_sum_to_date: 10500, current_payment_due: 2900 } }).items.find((i) => i.item === 'G702');
  assert.deepEqual(bad.findings.map((f) => f.code), ['contract_sum_off', 'sov_total_off', 'current_due_off', 'balance_to_finish_off']);
});
