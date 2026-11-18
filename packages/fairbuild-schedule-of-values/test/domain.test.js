// Schedule of values: billed against field progress, thresholds, zero lines, contract and change orders.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkValues } from '../src/index.js';

const line = (extra = {}) => ({ job: '24-1', item: '1', description: 'Work', scheduled_value: 10000, completed_stored: 5000, field_percent: 50, ...extra });
const run = (rows, opts = {}) => checkValues({ sovRows: rows, ...opts });
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('billing in step with the field is clean', () => {
  assert.equal(run([line()]).items[0].status, 'ok');
});

test('billed ahead of the field gives the amount billed ahead of the work', () => {
  const r = run([line({ completed_stored: 7000 })]);
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['billed_ahead', 2000]]);
});

test('billed behind the field gives the amount not yet billed', () => {
  assert.deepEqual(run([line({ completed_stored: 3000 })]).items[0].findings.map((f) => [f.code, f.amount]), [['billed_behind', 2000]]);
});

test('the thresholds are points of percent complete and can be widened', () => {
  assert.equal(run([line({ completed_stored: 5900 })]).items[0].status, 'ok', '9 points is inside the default 10');
  assert.equal(run([line({ completed_stored: 7000 })], { settings: { ahead_pts: 25 } }).items[0].status, 'ok');
});

test('billing computed from previous + this period + stored when there is no completed column', () => {
  const r = run([{ job: '24-1', item: '1', scheduled_value: 10000, previous: 3000, this_period: 2000, stored_materials: 2000, field_percent: 50 }]);
  assert.equal(r.items[0].billed, 7000); assert.deepEqual(codes(r), ['billed_ahead']);
});

test('billing on a zero-value line and an item entered twice are reported', () => {
  assert.deepEqual(codes(run([line({ scheduled_value: 0, completed_stored: 800, field_percent: null })])), ['billed_on_zero_line', 'no_field_percent']);
  const dup = run([line(), line({ description: 'Work again' })]);
  assert.ok(dup.items.every((i) => i.findings.some((f) => f.code === 'duplicate_item')));
});

test('the schedule must add up to the contract, and every approved change order needs a line', () => {
  const r = run([line(), line({ item: '2', description: 'CO-7 extra paving', scheduled_value: 2000, completed_stored: 0, field_percent: 0 })], {
    jobRows: [{ job: '24-1', contract_amount: 13000 }],
    changeOrderRows: [{ job: '24-1', change_order: 'CO-7', status: 'Approved', amount: 2000 }, { job: '24-1', change_order: 'CO-8', status: 'Approved', amount: 1000 }, { job: '24-1', change_order: 'CO-9', status: 'Pending', amount: 500 }],
  });
  const j = r.items.find((i) => i.item === 'JOB');
  assert.deepEqual(j.findings.map((f) => [f.code, f.amount]), [['sov_not_equal_contract', 1000], ['co_not_on_sov', 1000]]);
});
