// Lien waivers: kinds of waiver, matching, timing, amounts, signatures and final payments.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkWaivers, waiverKind } from '../src/index.js';

const pay = (extra = {}) => ({ check_number: 'CK-1', vendor: 'Example Sub LLC', job: '24-1', date: '2026-10-01', amount: 1000, final: 'no', ...extra });
const w = (type, extra = {}) => ({ vendor: 'Example Sub, LLC', job: '24-1', waiver_type: type, amount: 1000, received_date: '2026-09-30', check_number: 'CK-1', signed: 'yes', ...extra });
const run = (payments, waivers, settings = {}, asOf = '2026-11-16') => checkWaivers({ paymentRows: payments, waiverRows: waivers, settings, asOf });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('waiver kinds are read from the form name in several languages', () => {
  assert.deepEqual(waiverKind('Unconditional Waiver and Release on Progress Payment'), { conditional: false, final: false });
  assert.deepEqual(waiverKind('Conditional final'), { conditional: true, final: true });
  assert.deepEqual(waiverKind('Renuncia incondicional final'), { conditional: false, final: true });
});

test('both waivers in time is clean; the vendor legal form does not matter', () => {
  assert.equal(run([pay()], [w('Conditional progress'), w('Unconditional progress', { received_date: '2026-10-10' })]).items[0].status, 'ok');
});

test('no waivers at all, or a conditional that came after the money, is a payment without a conditional', () => {
  assert.ok(codes(run([pay()], [])).includes('paid_without_conditional'));
  assert.ok(codes(run([pay()], [w('Conditional progress', { received_date: '2026-10-05' })])).includes('paid_without_conditional'));
});

test('the unconditional waiver is pending inside the window and missing after it', () => {
  assert.deepEqual(codes(run([pay()], [w('Conditional progress')], {}, '2026-10-20')), ['unconditional_pending']);
  assert.deepEqual(codes(run([pay()], [w('Conditional progress')], {}, '2026-11-16')), ['unconditional_missing']);
});

test('a waiver without a payment number matches by vendor, job and amount', () => {
  const r = run([pay()], [w('Conditional progress', { check_number: '' }), w('Unconditional progress', { check_number: '', received_date: '2026-10-10' })]);
  assert.equal(r.items[0].status, 'ok'); assert.equal(r.unmatched_waivers, 0);
});

test('a short or unsigned waiver is reported', () => {
  const r = run([pay()], [w('Conditional progress', { amount: 900 }), w('Unconditional progress', { amount: 900, received_date: '2026-10-10', signed: 'no' })]);
  assert.deepEqual(codes(r), ['waiver_short', 'waiver_short', 'unsigned']);
});

test('a final payment needs final waivers; progress waivers do not count', () => {
  const progress = run([pay({ final: 'yes' })], [w('Conditional progress'), w('Unconditional progress', { received_date: '2026-10-10' })]);
  assert.deepEqual(codes(progress), ['final_waiver_missing']);
  const finals = run([pay({ final: 'yes' })], [w('Conditional final'), w('Unconditional final', { received_date: '2026-10-10' })]);
  assert.equal(finals.items[0].status, 'ok');
});
