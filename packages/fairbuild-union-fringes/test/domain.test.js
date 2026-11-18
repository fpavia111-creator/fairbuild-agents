// Union fringes: hours times rate, short, over, late, missing, hours mismatch and months.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkFringes } from '../src/index.js';

const hours = (h = 100, extra = {}) => ({ union: 'Local 9', worker: 'Avery Example', month: '2026-10', hours: h, ...extra });
const rates = [{ union: 'Local 9', union_fund: 'Pension', rate: 5 }];
const remit = (amount, extra = {}) => ({ union: 'Local 9', union_fund: 'Pension', month: '2026-10', hours_reported: 100, amount, remitted_date: '2026-11-10', ...extra });
const run = (h, r, settings = {}, asOf = '2026-11-20') => checkFringes({ hourRows: h, rateRows: rates, remittanceRows: r, settings, asOf });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('hours times the rate, paid on time, is clean', () => {
  assert.equal(run([hours()], [remit(500)]).items[0].status, 'ok');
});

test('dates in the month are read as the month', () => {
  assert.equal(run([hours(60, { month: '2026-10-07' }), hours(40, { month: '2026-10-28' })], [remit(500)]).items[0].hours, 100);
});

test('short, over and not remitted give their amounts', () => {
  assert.deepEqual(run([hours()], [remit(450)]).items[0].findings.map((f) => [f.code, f.amount]), [['under_remitted', 50]]);
  assert.deepEqual(run([hours()], [remit(520)]).items[0].findings.map((f) => [f.code, f.amount]), [['over_remitted', 20]]);
  assert.deepEqual(run([hours()], []).items[0].findings.map((f) => [f.code, f.amount]), [['not_remitted', 500]]);
});

test('nothing is overdue before the due day of the next month', () => {
  assert.equal(run([hours()], [], {}, '2026-11-10').items[0].status, 'not_due');
  assert.equal(run([hours()], [], { due_day: 5 }, '2026-11-10').items[0].status, 'short');
});

test('late payment and hours reported differently are review items', () => {
  assert.deepEqual(codes(run([hours()], [remit(500, { remitted_date: '2026-11-20' })])), ['late']);
  assert.deepEqual(codes(run([hours()], [remit(500, { hours_reported: 96 })])), ['hours_mismatch']);
});

test('December work is due in January of the next year', () => {
  const r = run([hours(100, { month: '2026-12' })], [], {}, '2027-01-20');
  assert.equal(r.items[0].due_date, '2027-01-15'); assert.equal(r.items[0].status, 'short');
});

test('a local with hours and no rates is reported, not skipped', () => {
  const r = run([hours(), hours(30, { union: 'Local 77' })], [remit(500)]);
  assert.equal(r.items.find((i) => i.union === 'Local 77').findings[0].code, 'no_rate');
});
