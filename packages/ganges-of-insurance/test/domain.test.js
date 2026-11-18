// Certificates of insurance: coverage words, dates, limits, endorsements and the work schedule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkInsurance } from '../src/index.js';

const req = { required: ['GL'], coverages: { GL: { each_occurrence: 1000000, aggregate: 2000000, additional_insured: true } }, expiring_days: 30 };
const cert = (extra = {}) => ({ vendor: 'Example Sub LLC', coverage: 'GL', policy_number: 'P-1', expires: '2027-06-01', each_occurrence: 1000000, aggregate: 2000000, additional_insured: 'yes', ...extra });
const run = (certs, opts = {}) => checkInsurance({ certRows: certs, requirements: opts.requirements || req, scheduleRows: opts.schedule || null, asOf: opts.asOf || '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('a certificate that meets every requirement is clear', () => {
  assert.equal(run([cert()]).items[0].status, 'ok');
});

test('coverage names are read from common wording and from your aliases', () => {
  assert.equal(run([cert({ coverage: 'Commercial General Liability' })]).items[0].coverage, 'GL');
  assert.equal(run([cert({ coverage: 'Haftpflicht' })], { requirements: { ...req, coverage_aliases: { Haftpflicht: 'GL' } } }).items[0].status, 'ok');
});

test('expired, expiring and missing coverage are told apart', () => {
  assert.deepEqual(codes(run([cert({ expires: '2026-11-01' })])), ['expired']);
  assert.deepEqual(codes(run([cert({ expires: '2026-12-01' })])), ['expiring_soon']);
  assert.deepEqual(codes(run([], { schedule: [{ vendor: 'Example Sub LLC', end_date: '2027-01-01' }] })), ['coverage_missing']);
});

test('limits below your minimum give the shortfall', () => {
  assert.deepEqual(run([cert({ each_occurrence: 750000, aggregate: 1500000 })]).items[0].findings.map((f) => [f.code, f.amount]), [['limit_low', 250000], ['aggregate_low', 500000]]);
});

test('a missing endorsement is reported only when you require it', () => {
  assert.deepEqual(codes(run([cert({ additional_insured: 'no' })])), ['no_additional_insured']);
  assert.equal(run([cert({ additional_insured: 'no' })], { requirements: { required: ['GL'], coverages: { GL: {} } } }).items[0].status, 'ok');
});

test('a policy that ends before the subcontractor finishes is flagged with the job', () => {
  const r = run([cert({ expires: '2027-02-01' })], { schedule: [{ vendor: 'Example Sub, LLC', job: '24-9', end_date: '2027-03-15' }] });
  assert.deepEqual(codes(r), ['lapse_during_work']); assert.match(r.items[0].findings[0].detail, /24-9/);
});

test('when two certificates exist for one coverage, the later expiry is used', () => {
  assert.equal(run([cert({ expires: '2026-10-01', policy_number: 'OLD' }), cert({ expires: '2027-06-01', policy_number: 'NEW' })]).items[0].policy_number, 'NEW');
});
