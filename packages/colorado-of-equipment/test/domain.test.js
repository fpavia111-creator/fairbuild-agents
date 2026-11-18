// Equipment rentals: rate tiers, off-rent dates, overlapping periods, idle machines and missing jobs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkRentals, cheapest } from '../src/index.js';

const rent = (extra = {}) => ({ equipment_id: 'EQ-1', description: 'Lift', vendor: 'Example Rentals', job: '24-1', invoice_number: 'R-1', period_from: '2026-10-01', period_to: '2026-10-07', amount: 300, day_rate: 100, week_rate: 300, month_rate: 800, ...extra });
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('the cheapest combination of day, week and month rates', () => {
  assert.equal(cheapest(3, { day: 100, week: 300, month: 800 }), 300);
  assert.equal(cheapest(9, { day: 100, week: 300, month: 800 }), 500); // one week + two days
  assert.equal(cheapest(25, { day: 100, week: 300, month: 800 }), 800);
  assert.equal(cheapest(5, {}), null);
});

test('a week billed at the week rate is clean; billed at daily rates it is over', () => {
  assert.equal(checkRentals({ rentalRows: [rent()] }).items[0].status, 'ok');
  assert.deepEqual(checkRentals({ rentalRows: [rent({ amount: 700 })] }).items[0].findings.map((f) => [f.code, f.amount]), [['rate_over', 400]]);
});

test('days after the off-rent date are not billable', () => {
  const r = checkRentals({ rentalRows: [rent({ period_to: '2026-10-14', off_rent_date: '2026-10-07', amount: 600 })] });
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['billed_after_off_rent', 300]]);
});

test('the same days on two invoices for one machine are an overlap, whatever the row order', () => {
  const rows = [rent({ invoice_number: 'R-2', period_from: '2026-10-05', period_to: '2026-10-11' }), rent()];
  const r = checkRentals({ rentalRows: rows });
  const second = r.items.find((i) => i.invoice_number === 'R-2');
  assert.deepEqual(second.findings.map((f) => [f.code, f.amount]), [['overlap', 300]]);
  assert.equal(r.items.find((i) => i.invoice_number === 'R-1').status, 'ok');
});

test('a machine used less than the idle threshold is flagged only when there is a usage log', () => {
  assert.equal(checkRentals({ rentalRows: [rent()] }).items[0].status, 'ok');
  assert.deepEqual(codes(checkRentals({ rentalRows: [rent()], usageRows: [{ equipment_id: 'EQ-1', date: '2026-10-02', hours: 3 }] })), ['idle']);
  assert.equal(checkRentals({ rentalRows: [rent()], usageRows: [{ equipment_id: 'eq-1', date: '2026-10-02', hours: 9 }] }).items[0].status, 'ok');
});

test('usage outside the billing period does not count', () => {
  assert.deepEqual(codes(checkRentals({ rentalRows: [rent()], usageRows: [{ equipment_id: 'EQ-1', date: '2026-10-20', hours: 30 }] })), ['idle']);
});

test('an invoice with no job is reported, with the job the usage log shows', () => {
  const r = checkRentals({ rentalRows: [rent({ job: '' })], usageRows: [{ equipment_id: 'EQ-1', date: '2026-10-02', job: '24-7', hours: 10 }] });
  assert.deepEqual(codes(r), ['no_job']); assert.match(r.items[0].findings[0].detail, /24-7/);
});
