// Warranty callbacks: warranty end, subcontractor recovery, own crews, repeats, open callbacks and masking.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { AgentRuntime } from 'fairbuild-core';
import { checkWarranty, manifest } from '../src/index.js';

const cb = (id, extra = {}) => ({ callback_id: id, job: '24-1', homeowner: 'Sam Example', date_reported: '2026-11-01', trade: 'Roofing', vendor: 'Example Roofing LLC', description: 'Leak', cost: 500, status: 'Closed', closed_date: '2026-11-02', ...extra });
const jobs = [{ job: '24-1', completion_date: '2026-01-31', warranty_months: 12 }];
const run = (rows, opts = {}) => checkWarranty({ callbackRows: rows, jobRows: opts.jobs === undefined ? jobs : opts.jobs, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });
const codes = (r, id) => r.items.find((i) => i.callback_id === id).findings.map((f) => f.code);

test('a subcontractor callback inside the warranty is a cost to recover from that subcontractor', () => {
  const r = run([cb('A')]); assert.deepEqual(codes(r, 'A'), ['backcharge_candidate']); assert.equal(r.to_backcharge, 500);
});

test('the warranty end is the completion date plus the term, month-end safe', () => {
  const r = run([cb('A', { date_reported: '2027-02-01' })]);
  assert.equal(r.items[0].warranty_ends, '2027-01-31'); assert.deepEqual(codes(r, 'A'), ['out_of_warranty']);
});

test('your own crews are not backcharged', () => {
  assert.equal(run([cb('A', { vendor: 'In-house crew' })]).items[0].status, 'ok');
});

test('the same trade back on the same job inside the repeat window is a repeat, in date order whatever the rows say', () => {
  const r = run([cb('B', { date_reported: '2026-11-10' }), cb('A')]);
  assert.ok(codes(r, 'B').includes('repeat_callback')); assert.ok(!codes(r, 'A').includes('repeat_callback'));
  assert.ok(!codes(run([cb('B', { date_reported: '2026-11-10' }), cb('A')], { settings: { repeat_days: 5 } }), 'B').includes('repeat_callback'));
});

test('an open callback is flagged after the response days', () => {
  assert.ok(codes(run([cb('A', { status: 'Open', closed_date: '' })]), 'A').includes('open_too_long'));
  assert.ok(!codes(run([cb('A', { status: 'Open', closed_date: '' })], { asOf: '2026-11-05' }), 'A').includes('open_too_long'));
});

test('a callback with no trade is flagged as having no responsible party', () => {
  assert.ok(codes(run([cb('A', { trade: '', vendor: '' })]), 'A').includes('no_responsible_party'));
});

test('homeowner names and phone numbers are masked in what the model sees', async () => {
  const r = await new AgentRuntime(manifest, { root: fileURLToPath(new URL('../fixtures', import.meta.url)), audit: false }).call('murray_check', { callbacks: 'callbacks.csv', as_of: '2026-11-16' });
  const txt = JSON.stringify(r); assert.doesNotMatch(txt, /Avery Example|555-0111/); assert.ok(r.personal_data.masked.name > 0);
});
