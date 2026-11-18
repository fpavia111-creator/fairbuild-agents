// Commitments: value math, over-billing, unsigned subcontracts, retainage, stale and closed balances, unknown commitments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCommitments } from '../src/index.js';

const c = (extra = {}) => ({ commitment: 'SC-1', job: '24-101', vendor: 'Example Sub LLC', original_amount: 10000, approved_changes: 0, revised_amount: 10000, invoiced: 4000, paid: 3600, retainage_held: 400, retainage_pct: 10, executed: 'yes', status: 'Open', date: '2026-10-01', ...extra });
const inv = (n, amount, extra = {}) => ({ invoice_number: n, vendor: 'Example Sub LLC', commitment: 'SC-1', invoice_date: '2026-11-01', amount, retainage: amount / 10, ...extra });
const run = (rows, invoices = null, settings = {}) => checkCommitments({ commitmentRows: rows, invoiceRows: invoices, settings, asOf: '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('a clean commitment is clean and its open balance is value minus invoiced', () => {
  const r = run([c()]); assert.equal(r.items[0].status, 'ok'); assert.equal(r.open_balance, 6000);
});

test('commitment numbers match across files whatever the spacing or case', () => {
  const r = run([c({ commitment: 'sc-1' })], [inv('A', 4000, { commitment: ' SC-1 ' })]);
  assert.equal(r.unmatched, 0); assert.equal(r.items[0].invoiced, 4000);
});

test('invoices past the value are over-invoiced by the difference; a paid amount over invoiced is overpaid', () => {
  assert.deepEqual(run([c({ invoiced: 12500, paid: 11250, retainage_held: 1250 })]).items[0].findings.map((f) => [f.code, f.amount]), [['over_invoiced', 2500]]);
  assert.deepEqual(run([c({ paid: 4500, retainage_held: 400 })]).items[0].findings.map((f) => [f.code, f.amount]), [['paid_over_invoiced', 500]]);
});

test('billing on a commitment not marked executed asks for the signed contract; an unsigned one with nothing billed does not', () => {
  assert.deepEqual(codes(run([c({ executed: 'no' })])), ['not_executed']);
  assert.equal(run([c({ executed: 'no', invoiced: 0, paid: 0, retainage_held: 0 })]).items[0].status, 'ok');
});

test('retainage is checked at the commitment rate on what was invoiced, and can be turned off', () => {
  assert.deepEqual(codes(run([c({ retainage_held: 200 })])), ['retainage_off']);
  assert.equal(run([c({ retainage_held: 200 })], null, { retainage_check: false }).items[0].status, 'ok');
});

test('a closed commitment with value left is flagged and counts nothing as open', () => {
  const r = run([c({ status: 'Closed' })]);
  assert.deepEqual(codes(r), ['closed_with_balance']); assert.equal(r.open_balance, 0);
});

test('an open commitment idle past stale_days is flagged from its last invoice, not its start date', () => {
  assert.deepEqual(codes(run([c({ date: '2026-01-01' })])), ['stale_open']);
  assert.equal(run([c({ date: '2026-01-01' })], [inv('A', 4000, { invoice_date: '2026-10-30' })]).items[0].status, 'ok');
});

test('invoices naming no known commitment are grouped by commitment and vendor with their numbers', () => {
  const r = run([c()], [inv('A', 4000), inv('B', 700, { commitment: 'SC-9' }), inv('C', 300, { commitment: 'SC-9' })]);
  const u = r.items.find((i) => i.status === 'unmatched');
  assert.equal(u.invoiced, 1000); assert.match(u.findings[0].detail, /B, C/); assert.equal(r.unmatched_invoices, 1000);
});
