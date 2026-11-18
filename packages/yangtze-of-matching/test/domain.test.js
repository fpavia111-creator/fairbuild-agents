// Three-way match: commitment, vendor, job, cumulative billing, approvals and retainage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchInvoices } from '../src/index.js';

const commit = (extra = {}) => ({ commitment: 'SC-1', vendor: 'Example Sub LLC', job: '24-1', revised_amount: 10000, retainage_pct: 0, ...extra });
const inv = (n, amount, extra = {}) => ({ invoice_number: n, vendor: 'Example Sub, LLC', job: '24-1', commitment: 'SC-1', invoice_date: '2026-11-01', amount, retainage: 0, ...extra });
const run = (invoices, opts = {}) => matchInvoices({ invoiceRows: invoices, commitmentRows: opts.commitments || [commit()], approvalRows: opts.approvals || null, settings: opts.settings || {} });
const codes = (r, n) => r.items.find((i) => i.invoice_number === n).findings.map((f) => f.code);

test('an invoice within its commitment, from its vendor, on its job, is matched', () => {
  assert.equal(run([inv('A', 4000)]).items[0].status, 'matched');
});

test('billing is cumulative in invoice date order, whatever the row order', () => {
  const rows = [inv('B', 7000, { invoice_date: '2026-11-10' }), inv('A', 6000)];
  const r = run(rows);
  assert.equal(r.items.find((i) => i.invoice_number === 'A').status, 'matched');
  assert.deepEqual(r.items.find((i) => i.invoice_number === 'B').findings.map((f) => [f.code, f.amount]), [['over_commitment', 3000]]);
});

test('another vendor billing against the commitment, or no commitment at all, is held', () => {
  assert.deepEqual(codes(run([inv('A', 100, { vendor: 'Other Co' })]), 'A'), ['vendor_mismatch']);
  assert.deepEqual(codes(run([inv('A', 100, { commitment: '' })]), 'A'), ['no_commitment']);
});

test('billing past the approved work is held by the amount past it', () => {
  const r = run([inv('A', 5000)], { approvals: [{ commitment: 'SC-1', date: '2026-10-30', approved_to_date: 4500 }] });
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['over_approved', 500]]);
});

test('the latest approval is the one used', () => {
  const approvals = [{ commitment: 'SC-1', date: '2026-10-01', approved_to_date: 1000 }, { commitment: 'SC-1', date: '2026-10-30', approved_to_date: 6000 }];
  assert.equal(run([inv('A', 5000)], { approvals }).items[0].status, 'matched');
});

test('no receipt goes to review, or to hold when approval is required', () => {
  const approvals = [{ commitment: 'SC-9', approved_to_date: 1 }];
  assert.equal(run([inv('A', 100)], { approvals }).items[0].status, 'review');
  assert.equal(run([inv('A', 100)], { approvals, settings: { require_approval: true } }).items[0].status, 'hold');
});

test('retainage not withheld on a commitment that carries it is a review item with the amount', () => {
  const r = run([inv('A', 2000)], { commitments: [commit({ retainage_pct: 10 })] });
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['retainage_missing', 200]]); assert.equal(r.items[0].status, 'review');
});
