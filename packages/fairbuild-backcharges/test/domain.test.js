// Backcharges: notice timing, deduction, mismatches, disputes, backup and recoverability.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkBackcharges } from '../src/index.js';

const bc = (id, extra = {}) => ({ backcharge: id, job: '24-1', vendor: 'Example Sub LLC', date: '2026-11-01', description: 'Cleanup', amount: 1000, status: 'Notified', notice_date: '2026-11-03', deducted_amount: 0, backup: 'yes', ...extra });
const run = (rows, opts = {}) => checkBackcharges({ backchargeRows: rows, balanceRows: opts.balances || null, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('a timely notice with backup is simply open', () => {
  assert.equal(run([bc('A')]).items[0].status, 'open');
});

test('a notice later than the notice days, or none at all, needs action', () => {
  assert.deepEqual(codes(run([bc('A', { notice_date: '2026-11-12' })])), ['late_notice']);
  assert.deepEqual(codes(run([bc('A', { notice_date: '', status: 'Proposed' })])), ['no_notice']);
});

test('an agreed backcharge not deducted after the deduct days is flagged with its open amount', () => {
  assert.deepEqual(run([bc('A', { status: 'Agreed', notice_date: '2026-10-01', date: '2026-09-30' })]).items[0].findings.map((f) => [f.code, f.amount]), [['not_deducted', 1000]]);
});

test('a deduction for a different amount is reported by the difference', () => {
  assert.deepEqual(run([bc('A', { status: 'Deducted', deducted_amount: 800 })]).items[0].findings.map((f) => [f.code, f.amount]), [['deducted_mismatch', 200]]);
  assert.equal(run([bc('A', { status: 'Deducted', deducted_amount: 1000 })]).items[0].status, 'closed');
});

test('a long dispute and missing backup are review items', () => {
  assert.deepEqual(codes(run([bc('A', { status: 'Disputed', notice_date: '2026-10-01', date: '2026-09-30' })])), ['dispute_aging']);
  assert.deepEqual(codes(run([bc('A', { backup: 'no' })])), ['no_backup']);
});

test('open backcharges larger than the balance owed plus retainage held are at risk by the shortfall', () => {
  const balances = [{ vendor: 'Example Sub, LLC', revised_amount: 10000, paid: 9800, retainage_held: 300 }];
  const r = run([bc('A'), bc('B', { amount: 400 })], { balances });
  assert.equal(r.at_risk_amount, 900); assert.ok(r.items.every((i) => i.status === 'at_risk'));
});

test('a voided backcharge counts for nothing', () => {
  const r = run([bc('A', { status: 'Withdrawn' })]);
  assert.equal(r.open_amount, 0); assert.equal(r.items[0].status, 'closed');
});
