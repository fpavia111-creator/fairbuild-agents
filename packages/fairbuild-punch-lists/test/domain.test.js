// Punch lists: open and closed, due dates, aging, reopened, assignee and subcontractors paid in full.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPunch } from '../src/index.js';

const p = (extra = {}) => ({ item: 'P-1', job: '24-1', location: 'Room 1', description: 'Touch-up', trade: 'Painting', vendor: 'Example Painting LLC', created: '2026-11-01', due_date: '2026-11-30', status: 'Open', ...extra });
const run = (rows, opts = {}) => checkPunch({ punchRows: rows, payableRows: opts.payables || null, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('an open item on time is open, a closed item is closed', () => {
  assert.equal(run([p()]).items[0].status, 'open');
  assert.equal(run([p({ status: 'Closed', closed_date: '2026-11-10' })]).items[0].status, 'closed');
});

test('closed is read in other languages', () => {
  assert.equal(run([p({ status: 'Erledigt' })]).items[0].status, 'closed');
});

test('past due and open too long are separate findings', () => {
  assert.deepEqual(codes(run([p({ due_date: '2026-11-10' })])), ['past_due']);
  assert.deepEqual(codes(run([p({ created: '2026-09-01' })])), ['open_too_long']);
  assert.equal(run([p({ created: '2026-09-01' })], { settings: { aging_days: 120 } }).items[0].status, 'open');
});

test('a reopened item stays open even with a closed date', () => {
  const r = run([p({ status: 'Reopened', closed_date: '2026-11-05' })]);
  assert.equal(r.items[0].open, true); assert.deepEqual(codes(r), ['reopened']);
});

test('an item with no one assigned is a review item', () => {
  assert.deepEqual(codes(run([p({ vendor: '' })])), ['no_assignee']);
});

test('an open item on a subcontractor with no retainage and no balance left is a risk; one with money held is not', () => {
  assert.equal(run([p()], { payables: [{ vendor: 'Example Painting, LLC', retainage_remaining: 0, balance_remaining: 0 }] }).items[0].status, 'risk');
  assert.equal(run([p()], { payables: [{ vendor: 'Example Painting LLC', retainage_remaining: 500, balance_remaining: 0 }] }).items[0].status, 'open');
});

test('counts by subcontractor include past due items', () => {
  const r = run([p(), p({ item: 'P-2', due_date: '2026-11-01' })]);
  assert.deepEqual(r.by_trade['Example Painting LLC'], { trade: 'Painting', open: 2, past_due: 1 });
});
