// Certified payroll: total package per hour, overtime, classifications, ids, duplicates and masking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { AgentRuntime } from 'fairbuild-core';
import { checkWages, manifest } from '../src/index.js';

const rates = [{ classification: 'Roofer', base_rate: 30, fringe_rate: 10 }];
const line = (extra = {}) => ({ job: '24-1', week_ending: '2026-11-07', worker: 'Avery Example', worker_id: '1234', classification: 'Roofer', hours: 40, overtime_hours: 0, rate_paid: 30, fringe_paid: 10, ...extra });
const run = (rows, settings = {}) => checkWages({ payrollRows: rows, rateRows: rates, settings });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('paying the rate exactly is clean', () => {
  assert.equal(run([line()]).items[0].status, 'ok');
});

test('cash can make up for fringe: the total per hour is what counts', () => {
  assert.equal(run([line({ rate_paid: 40, fringe_paid: 0 })]).items[0].status, 'ok');
  assert.deepEqual(run([line({ rate_paid: 35, fringe_paid: 0 })]).items[0].findings.map((f) => [f.code, f.amount]), [['underpaid', 200]]);
});

test('overtime is checked at the multiplier on the base rate, with fringe not multiplied', () => {
  // Required overtime: 45 + 10 = 55; paid 29 x 1.5 + 10 = 53.5, short 1.5 x 4 = 6; straight time short 1 x 40 = 40.
  assert.deepEqual(run([line({ rate_paid: 29, fringe_paid: 10, overtime_hours: 4 })]).items[0].findings.map((f) => [f.code, f.amount]), [['underpaid', 46]]);
});

test('straight-time hours past the weekly limit are owed as overtime premium', () => {
  assert.deepEqual(run([line({ hours: 44 })]).items[0].findings.map((f) => [f.code, f.amount]), [['ot_not_paid', 60]]);
  assert.equal(run([line({ hours: 44 })], { weekly_ot_after: 48 }).items[0].status, 'ok');
});

test('a classification not on the determination is reported, or read through an alias', () => {
  assert.deepEqual(codes(run([line({ classification: 'Roofer Journeyman' })])), ['no_rate']);
  assert.equal(run([line({ classification: 'Roofer Journeyman' })], { classification_aliases: { 'Roofer Journeyman': 'Roofer' } }).items[0].status, 'ok');
});

test('a missing id, a full SSN and a duplicated line are review items', () => {
  assert.deepEqual(codes(run([line({ worker_id: '' })])), ['missing_worker_id']);
  assert.deepEqual(codes(run([line({ worker_id: '900-12-3456' })])), ['full_ssn_on_report']);
  const dup = run([line(), line()]); assert.equal(dup.lines, 1); assert.deepEqual(codes(dup), ['duplicate_line']);
});

test('worker names and ids are masked in what the model sees, and the files keep them', async () => {
  const root = fileURLToPath(new URL('../fixtures', import.meta.url));
  const r = await new AgentRuntime(manifest, { root, audit: false }).call('hudson_check', { payroll: 'payroll.csv', rates: 'rates.csv' });
  const txt = JSON.stringify(r);
  assert.doesNotMatch(txt, /Jordan Example|900-12-3456/); assert.match(txt, /PERSON-[0-9a-f]{8}/);
  assert.ok(r.personal_data.masked.name > 0);
});
