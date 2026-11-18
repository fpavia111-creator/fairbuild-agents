// Bonding capacity: backlog, single and aggregate limits, loss jobs and the bid pipeline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBonding } from '../src/index.js';

const job = (id, contract, extra = {}) => ({ job: id, contract_amount: contract, estimated_cost: contract * 0.8, cost_to_date: 0, bonded: 'yes', ...extra });
const limits = { single_limit: 1000000, aggregate_limit: 3000000 };
const run = (jobs, opts = {}) => checkBonding({ jobRows: jobs, limits: opts.limits || limits, pipelineRows: opts.pipeline || null });

test('bonded backlog counts only bonded jobs, at contract less earned revenue', () => {
  const r = run([job('A', 1000000, { cost_to_date: 400000 }), job('B', 500000, { bonded: 'no' })]);
  assert.equal(r.bonded_backlog, 500000); assert.equal(r.total_backlog, 1000000); assert.equal(r.aggregate_left, 2500000);
});

test('a bonded contract over the single limit is flagged by the excess; an unbonded one is not', () => {
  assert.deepEqual(run([job('A', 1200000)]).items.find((i) => i.key === 'A').findings.map((f) => [f.code, f.amount]), [['single_over', 200000]]);
  assert.equal(run([job('A', 1200000, { bonded: 'no' })]).items[0].status, 'ok');
});

test('near and over the aggregate limit are program findings', () => {
  assert.equal(run([job('A', 900000), job('B', 900000), job('C', 900000)]).items.find((i) => i.key === 'PROGRAM').findings[0].code, 'near_aggregate');
  assert.equal(run([job('A', 900000), job('B', 900000), job('C', 900000), job('D', 900000)]).items.find((i) => i.key === 'PROGRAM').findings[0].code, 'over_aggregate');
});

test('a bonded job forecast at a loss is a review item', () => {
  assert.deepEqual(run([job('A', 500000, { estimated_cost: 550000 })]).items[0].findings.map((f) => [f.code, f.amount]), [['bonded_loss', 50000]]);
});

test('bonded bids fill the room that is left in name order; an unbonded bid uses none', () => {
  const r = run([job('A', 1000000)], { pipeline: [{ bid: 'B second', amount: 900000, bond_required: 'yes' }, { bid: 'A first', amount: 900000, bond_required: 'yes' }, { bid: 'C open', amount: 5000000, bond_required: 'no' }] });
  assert.equal(r.items.find((i) => i.key === 'A first').status, 'ok');
  assert.deepEqual(r.items.find((i) => i.key === 'B second').findings.map((f) => [f.code, f.amount]), [['pipeline_exceeds', 800000]]);
  assert.equal(r.items.find((i) => i.key === 'C open').status, 'ok');
});

test('a bid over the single limit is flagged even when the aggregate has room', () => {
  const r = run([], { pipeline: [{ bid: 'Big', amount: 1500000, bond_required: 'yes' }] });
  assert.deepEqual(r.items.find((i) => i.key === 'Big').findings.map((f) => f.code), ['single_over']);
});

test('working capital and net worth are carried through, not used to compute limits', () => {
  const r = run([job('A', 100000)], { limits: { ...limits, working_capital: 250000, net_worth: 900000 } });
  assert.equal(r.working_capital, 250000); assert.equal(r.aggregate_limit, 3000000);
});
