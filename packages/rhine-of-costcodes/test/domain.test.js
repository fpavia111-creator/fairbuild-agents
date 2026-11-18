// Job cost against budget: code spellings, cost types, unbudgeted cost, math, ties, progress and overruns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCosts } from '../src/index.js';

const line = (extra = {}) => ({ job: '24-101', cost_code: '03-300', cost_type: 'S', original_budget: 100000, approved_changes: 0, revised_budget: 100000, percent_complete: 50, ...extra });
const cost = (amount, extra = {}) => ({ job: '24-101', cost_code: '03-300', cost_type: 'S', amount, ...extra });
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('cost codes written with spaces, dots or no separator are the same code', () => {
  const r = checkCosts({ budgetRows: [line()], costRows: [cost(20000, { cost_code: '03 300' }), cost(20000, { cost_code: '03.300' }), cost(10000, { cost_code: '03300' })] });
  assert.equal(r.items.length, 1); assert.equal(r.items[0].actual, 50000); assert.equal(r.items[0].status, 'ok');
});

test('cost types are read from words in several languages and from Sage-style numbers', () => {
  const r = checkCosts({ budgetRows: [line({ cost_type: 'Subcontract' }), line({ cost_code: '06-100', cost_type: 'Material' })], costRows: [cost(1000, { cost_type: 'Sous-traitance' }), cost(500, { cost_code: '06-100', cost_type: '2' }), cost(200, { cost_code: '06-100', cost_type: '材料' })] });
  assert.deepEqual(r.items.map((i) => [i.cost_code, i.actual]).sort(), [['03-300', 1000], ['06-100', 700]]);
});

test('a budget line without a cost type takes the typed cost detail of its code', () => {
  const r = checkCosts({ budgetRows: [line({ cost_type: '' })], costRows: [cost(30000, { cost_type: 'L' }), cost(10000, { cost_type: 'M' })] });
  assert.equal(r.items.length, 1); assert.equal(r.items[0].actual, 40000);
});

test('cost on a code with no budget line, and on a job not in the budget, is reported with its amount', () => {
  const r = checkCosts({ budgetRows: [line()], costRows: [cost(5000), cost(750, { cost_code: '31-000' }), cost(300, { job: '24-999' })] });
  assert.equal(r.unbudgeted_cost, 750); assert.equal(r.no_budget_job_cost, 300); assert.equal(r.unbudgeted, 2);
});

test('code aliases from the settings move cost onto the budget code', () => {
  const r = checkCosts({ budgetRows: [line()], costRows: [cost(5000, { cost_code: '3-300' })], settings: { code_aliases: { '3-300': '03-300' } } });
  assert.equal(r.unbudgeted, 0); assert.equal(r.items[0].actual, 5000);
});

test('original plus approved changes must equal the revised budget, within the tolerance', () => {
  assert.deepEqual(codes(checkCosts({ budgetRows: [line({ approved_changes: 5000, revised_budget: 107000 })] })), ['revised_math']);
  assert.equal(checkCosts({ budgetRows: [line({ approved_changes: 5000, revised_budget: 105000.5 })] }).items[0].status, 'ok');
});

test('an overrun found three ways (to date, committed, projected) is counted once at its largest', () => {
  const r = checkCosts({ budgetRows: [line({ committed: 104000, estimate_to_complete: 7000, percent_complete: 95 })], costRows: [cost(102000)] });
  assert.deepEqual(codes(r), ['over_budget', 'committed_over', 'projected_over']);
  assert.equal(r.items[0].overrun, 9000); assert.equal(r.overrun, 9000);
});

test('a small projected overrun under both thresholds is not flagged; the amount threshold alone is enough', () => {
  const small = checkCosts({ budgetRows: [line({ estimate_to_complete: 51000 })], costRows: [cost(50000)] });
  assert.equal(small.items[0].status, 'ok');
  const big = checkCosts({ budgetRows: [line({ estimate_to_complete: 53000 })], costRows: [cost(50000)] });
  assert.deepEqual(codes(big), ['projected_over']);
});

test('spend far ahead of percent complete asks for review; spend matching progress does not', () => {
  assert.deepEqual(codes(checkCosts({ budgetRows: [line({ percent_complete: 20 })], costRows: [cost(40000)] })), ['burn_ahead']);
  assert.equal(checkCosts({ budgetRows: [line({ percent_complete: 35 })], costRows: [cost(40000)] }).items[0].status, 'ok');
});

test('a budget file with no job column takes the job from the settings', () => {
  const r = checkCosts({ budgetRows: [line({ job: '' })], costRows: [cost(1000)], settings: { job: '24-101' } });
  assert.equal(r.items.length, 1); assert.equal(r.items[0].job, '24-101');
});
