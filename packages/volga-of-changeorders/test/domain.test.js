// Change orders: states in several languages, billing against approval, margin, aging, duplicates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChangeOrders } from '../src/index.js';

const co = (extra = {}) => ({ job: '24-101', change_order: 'CO-1', status: 'Approved', description: 'Extra work', amount: 1000, cost: 800, submitted_date: '2026-10-01', approved_date: '2026-10-10', billed: 1000, ...extra });
const run = (rows, settings = {}) => checkChangeOrders({ rows, settings, asOf: '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('an approved, fully billed change order above cost is clean', () => {
  assert.equal(run([co()]).items[0].status, 'ok');
});

test('status words are read in other languages: genehmigt, en attente, rechazado', () => {
  const r = run([co({ status: 'genehmigt' }), co({ change_order: 'CO-2', status: 'en attente', billed: 0, submitted_date: '2026-11-10' }), co({ change_order: 'CO-3', status: 'Rechazado', billed: 0 })]);
  assert.deepEqual(r.items.map((i) => [i.change_order, i.state]).sort(), [['CO-1', 'approved'], ['CO-2', 'pending'], ['CO-3', 'rejected']]);
});

test('approved and partly billed shows the unbilled balance; billed past approval is an error', () => {
  const part = run([co({ billed: 400 })]);
  assert.deepEqual(codes(part), ['approved_unbilled']); assert.equal(part.unbilled, 600);
  assert.deepEqual(run([co({ billed: 1300 })]).items[0].findings.map((f) => [f.code, f.amount]), [['over_billed', 300]]);
});

test('billing on a pending change order is an error even when it is recent', () => {
  assert.deepEqual(codes(run([co({ status: 'Submitted', billed: 500, submitted_date: '2026-11-10' })])), ['billed_not_approved']);
});

test('a pending change order is aged from its submitted date against pending_days', () => {
  assert.deepEqual(codes(run([co({ status: 'Pending', billed: 0, submitted_date: '2026-10-01' })])), ['pending_aging']);
  assert.equal(run([co({ status: 'Pending', billed: 0, submitted_date: '2026-10-01' })], { pending_days: 60 }).items[0].status, 'ok');
});

test('a price below the estimated cost is flagged by the difference; a rejected change keeps its cost visible', () => {
  assert.deepEqual(run([co({ cost: 1250 })]).items[0].findings.map((f) => [f.code, f.amount]), [['negative_margin', 250]]);
  assert.deepEqual(codes(run([co({ status: 'Void', billed: 0, cost: 600 })])), ['rejected_with_cost']);
});

test('the same number twice on one job is one change order, whichever row comes first; on two jobs it is two', () => {
  const rows = [co({ description: 'B second entry', billed: 0 }), co({ description: 'A first entry' })];
  const a = run(rows), b = run([...rows].reverse());
  assert.equal(a.change_orders, 1); assert.deepEqual(a.items[0], b.items[0]); assert.equal(a.items[0].billed, 1000);
  assert.equal(run([co(), co({ job: '24-102' })]).change_orders, 2);
});
