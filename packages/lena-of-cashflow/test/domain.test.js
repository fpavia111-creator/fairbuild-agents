// Cash by job: net position, months, slow collections and negative streaks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCashflow } from '../src/index.js';

const cash = (job, date, amount) => ({ job, date, amount });
const run = (receipts, disb, opts = {}) => checkCashflow({ receiptRows: receipts, disbursementRows: disb, billingRows: opts.billings || null, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });

test('more collected than paid out is a positive, clean job', () => {
  const r = run([cash('24-1', '2026-10-05', 1000)], [cash('24-1', '2026-10-20', 600)]);
  assert.equal(r.items[0].net, 400); assert.equal(r.items[0].status, 'ok');
});

test('paid out more than collected is cash negative by the difference', () => {
  assert.deepEqual(run([cash('24-1', '2026-10-05', 500)], [cash('24-1', '2026-10-20', 800)]).items[0].findings.map((f) => [f.code, f.amount]), [['cash_negative', 300]]);
});

test('job numbers match whatever the spacing and case', () => {
  assert.equal(run([cash('24-1a', '2026-10-05', 500)], [cash(' 24-1A ', '2026-10-20', 200)]).jobs, 1);
});

test('net cash is grouped by month across jobs', () => {
  const r = run([cash('A', '2026-09-05', 100), cash('B', '2026-10-05', 50)], [cash('A', '2026-10-10', 80)]);
  assert.deepEqual(r.by_month, { '2026-09': { net: 100 }, '2026-10': { net: -30 } });
});

test('two negative months running are flagged; one is not', () => {
  const two = run([cash('A', '2026-09-05', 1000)], [cash('A', '2026-10-05', 100), cash('A', '2026-11-05', 100)]);
  assert.ok(two.items[0].findings.some((f) => f.code === 'negative_trend'));
  const one = run([cash('A', '2026-09-05', 1000), cash('A', '2026-11-05', 200)], [cash('A', '2026-10-05', 100)]);
  assert.ok(!one.items[0].findings.some((f) => f.code === 'negative_trend'));
});

test('owner invoices unpaid past the collection days are slow; received ones are ignored', () => {
  const billings = [{ job: 'A', invoice: 'I-1', invoice_date: '2026-08-01', amount: 700, received: 'no' }, { job: 'A', invoice: 'I-2', invoice_date: '2026-08-01', amount: 300, received: 'yes' }];
  const r = run([cash('A', '2026-10-05', 100)], [], { billings });
  assert.equal(r.items[0].unpaid_over_days, 700); assert.ok(r.items[0].findings.some((f) => f.code === 'slow_collection'));
  assert.equal(run([cash('A', '2026-10-05', 100)], [], { billings, settings: { collect_days: 120 } }).items[0].unpaid_over_days, 0);
});

test('a job with only billings still shows, with its unpaid amount', () => {
  const r = run([], [], { billings: [{ job: 'Z', invoice: 'I-9', invoice_date: '2026-11-01', amount: 50, received: 'no' }] });
  assert.equal(r.items[0].job, 'Z'); assert.equal(r.items[0].unpaid_billed, 50);
});
