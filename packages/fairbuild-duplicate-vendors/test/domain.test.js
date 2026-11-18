// Duplicates: vendor evidence, invoice numbers, near numbers, paid twice and open duplicates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates } from '../src/index.js';

const v = (id, name, extra = {}) => ({ vendor_id: id, name, tax_id: '', address: '', city: '', phone: '', bank_last4: '', ...extra });
const inv = (n, extra = {}) => ({ invoice_number: n, vendor_id: 'A', vendor: 'Example Co', invoice_date: '2026-11-01', amount: 500, status: 'Open', ...extra });

test('one shared tax id or bank account with a similar name is enough to call two vendors the same', () => {
  const r = findDuplicates({ vendorRows: [v('A', 'Example Co', { tax_id: '11-2223334' }), v('B', 'Different Name Inc', { tax_id: '112223334' })] });
  assert.equal(r.items[0].status, 'merge'); assert.deepEqual(r.items[0].findings.map((f) => f.code), ['same_tax_id']);
});

test('a name match alone is a review, and different companies with similar names are not paired', () => {
  assert.equal(findDuplicates({ vendorRows: [v('A', 'Example Paving Co'), v('B', 'Example Paving Company')] }).items[0].status, 'review');
  assert.equal(findDuplicates({ vendorRows: [v('A', 'Example Electric Inc'), v('B', 'Example Electrical Contractors')] }).vendor_pairs, 0);
});

test('invoice numbers match whatever the punctuation, case or leading zeros', () => {
  const r = findDuplicates({ vendorRows: [v('A', 'Example Co')], invoiceRows: [inv('inv-0042'), inv('INV42')] });
  assert.equal(r.invoice_groups, 1); assert.equal(r.items.find((i) => i.kind === 'invoice_dup').status, 'stop');
});

test('the same invoice under two vendor records of one vendor is one group', () => {
  const r = findDuplicates({ vendorRows: [v('A', 'Example Co', { tax_id: '1' }), v('B', 'Example Co LLC', { tax_id: '1' })], invoiceRows: [inv('77', { status: 'Paid' }), inv('77', { vendor_id: 'B', status: 'Paid' })] });
  const g = r.items.find((i) => i.kind === 'invoice_dup');
  assert.equal(g.status, 'paid_twice'); assert.equal(g.paid_twice, 500);
});

test('near-identical numbers count only for the same amount within near_days', () => {
  const rows = [inv('1001'), inv('1010', { invoice_date: '2026-11-03' })];
  assert.equal(findDuplicates({ vendorRows: [v('A', 'Example Co')], invoiceRows: rows }).invoice_groups, 1);
  assert.equal(findDuplicates({ vendorRows: [v('A', 'Example Co')], invoiceRows: [inv('1001'), inv('1010', { amount: 501 })] }).invoice_groups, 0);
  assert.equal(findDuplicates({ vendorRows: [v('A', 'Example Co')], invoiceRows: rows, settings: { near_days: 1 } }).invoice_groups, 0);
});

test('three payments of one invoice are paid twice by two amounts', () => {
  const r = findDuplicates({ vendorRows: [v('A', 'Example Co')], invoiceRows: [inv('5', { status: 'Paid' }), inv('5', { status: 'Paid' }), inv('5', { status: 'Paid' })] });
  assert.equal(r.paid_twice, 1000);
});

test('invoices for different vendors with the same number are not duplicates', () => {
  const r = findDuplicates({ vendorRows: [v('A', 'Example Co'), v('B', 'Other Supply')], invoiceRows: [inv('9'), inv('9', { vendor_id: 'B', vendor: 'Other Supply' })] });
  assert.equal(r.invoice_groups, 0);
});
