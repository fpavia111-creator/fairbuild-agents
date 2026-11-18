// Delivery tickets: quantities across invoices, prices, extensions, missing tickets and accruals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTickets } from '../src/index.js';

const tk = (extra = {}) => ({ ticket: 'T-1', supplier: 'Example Supply LLC', job: '24-1', date: '2026-11-01', material: 'Gravel', quantity: 10, uom: 'TON', ...extra });
const line = (extra = {}) => ({ invoice_number: 'I-1', supplier: 'Example Supply', job: '24-1', ticket: 'T-1', material: 'Gravel', quantity: 10, unit_price: 20, amount: 200, invoice_date: '2026-11-02', ...extra });
const run = (tickets, lines, opts = {}) => checkTickets({ ticketRows: tickets, lineRows: lines, priceRows: opts.prices || null, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('a line that matches its ticket and price is clean', () => {
  assert.equal(run([tk()], [line()], { prices: [{ supplier: 'Example Supply LLC', material: 'gravel', unit_price: 20 }] }).items[0].status, 'ok');
});

test('a ticket can be billed across two invoices, but not past its quantity', () => {
  const r = run([tk()], [line({ quantity: 6, amount: 120 }), line({ invoice_number: 'I-2', quantity: 6, amount: 120, invoice_date: '2026-11-03' })]);
  const second = r.items.find((i) => i.invoice_number === 'I-2');
  assert.deepEqual(second.findings.map((f) => [f.code, f.amount]), [['qty_over_ticket', 40]]);
});

test('a ticket billed in full and then again is a second bill for its whole amount', () => {
  const r = run([tk()], [line(), line({ invoice_number: 'I-2', invoice_date: '2026-11-05' })]);
  assert.deepEqual(r.items.find((i) => i.invoice_number === 'I-2').findings.map((f) => [f.code, f.amount]), [['ticket_billed_twice', 200]]);
});

test('a price over the agreed price is priced on the quantity billed', () => {
  assert.deepEqual(run([tk()], [line({ unit_price: 21, amount: 210 })], { prices: [{ supplier: 'Example Supply', material: 'Gravel', unit_price: 20 }] }).items[0].findings.map((f) => [f.code, f.amount]), [['price_over_agreed', 10]]);
});

test('an extension that does not add up is reported by the difference', () => {
  assert.deepEqual(run([tk()], [line({ amount: 220 })]).items[0].findings.map((f) => [f.code, f.amount]), [['extension_off', 20]]);
});

test('a line with no ticket suggests the matching one, and that ticket is not accrued as well', () => {
  const r = run([tk()], [line({ ticket: '' })]);
  assert.deepEqual(codes(r), ['no_ticket']); assert.match(r.items[0].findings[0].detail, /T-1 matches/);
  assert.equal(r.tickets_not_invoiced, 0);
});

test('a delivered ticket with no invoice is accrued after the waiting days at the agreed price', () => {
  const prices = [{ supplier: 'Example Supply', material: 'Gravel', unit_price: 20 }];
  assert.equal(run([tk()], [], { prices, asOf: '2026-11-03' }).tickets_not_invoiced, 0);
  const r = run([tk()], [], { prices });
  assert.equal(r.tickets_not_invoiced, 1); assert.equal(r.to_accrue, 200);
});
