// Materials tax: your rates, use tax, overcharges, other jurisdictions, exempt jobs and ship-to mismatches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSalesTax } from '../src/index.js';

const rates = [{ jurisdiction: 'Example City', tax_rate: 8 }, { jurisdiction: 'Other Town', tax_rate: 6 }];
const line = (extra = {}) => ({ invoice_number: 'I-1', vendor: 'Example Supply', job: '24-1', jurisdiction: 'Example City', amount: 1000, tax: 80, ...extra });
const run = (lines, jobs = null, settings = {}) => checkSalesTax({ lineRows: lines, rateRows: rates, jobRows: jobs, settings });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('tax at your rate is clean', () => {
  assert.equal(run([line()]).items[0].status, 'ok');
});

test('no tax charged is use tax to accrue at your rate', () => {
  const r = run([line({ tax: 0 })]); assert.equal(r.use_tax_to_accrue, 80); assert.equal(r.items[0].status, 'use_tax');
});

test('another jurisdiction\'s rate is named', () => {
  const r = run([line({ tax: 60 })]);
  assert.deepEqual(codes(r), ['tax_undercharged', 'wrong_jurisdiction_rate']); assert.match(r.items[0].findings[1].detail, /Other Town/);
});

test('tax charged on a job you mark exempt is claimed back in full', () => {
  const r = run([line()], [{ job: '24-1', jurisdiction: 'Example City', tax_exempt: 'yes' }]);
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['tax_on_exempt_job', 80]]);
});

test('a line with no jurisdiction takes the job\'s', () => {
  assert.equal(run([line({ jurisdiction: '' })], [{ job: '24-1', jurisdiction: 'Example City', tax_exempt: 'no' }]).items[0].status, 'ok');
});

test('delivery to another jurisdiction than the job is a review item', () => {
  assert.deepEqual(codes(run([line({ jurisdiction: 'Other Town', tax: 60 })], [{ job: '24-1', jurisdiction: 'Example City', tax_exempt: 'no' }])), ['jurisdiction_mismatch']);
});

test('jurisdiction names match whatever the case and spacing; an unknown one has no rate', () => {
  assert.equal(run([line({ jurisdiction: ' example  city ' })]).items[0].status, 'ok');
  assert.deepEqual(codes(run([line({ jurisdiction: 'Nowhere' })])), ['no_rate']);
});
