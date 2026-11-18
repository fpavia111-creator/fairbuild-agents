// Submittals: dates worked back from site, reviews, resubmittals, loops, late approvals and spec sections.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubmittals } from '../src/index.js';

const s = (extra = {}) => ({ submittal: 'S-1', revision: 0, spec_section: '05 12 00', title: 'Structural steel', vendor: 'Example Steel LLC', status: 'Open', ball_in_court: 'Subcontractor', required_on_site: '2027-03-01', lead_time_days: 60, review_days: 14, ...extra });
const run = (rows, opts = {}) => checkSubmittals({ submittalRows: rows, specRows: opts.specs || null, settings: opts.settings || {}, asOf: opts.asOf || '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('order-by and submit-by dates are worked back from the site date', () => {
  const i = run([s()]).items[0];
  assert.equal(i.order_by, '2026-12-31'); assert.equal(i.submit_by, '2026-12-17'); assert.equal(i.status, 'in_progress');
});

test('not submitted after the submit-by date is late', () => {
  assert.deepEqual(codes(run([s()], { asOf: '2026-12-20' })), ['submit_late']);
});

test('a review longer than its allowed days is overdue; the default applies when a row gives none', () => {
  assert.deepEqual(codes(run([s({ status: 'Submitted', submitted_date: '2026-10-20', review_days: '' })])), ['review_overdue']);
  assert.equal(run([s({ status: 'Submitted', submitted_date: '2026-10-20', review_days: '' })], { settings: { review_days: 60 } }).items[0].status, 'in_progress');
});

test('only the latest revision counts, whatever the row order', () => {
  const rows = [s({ revision: 1, status: 'Approved', returned_date: '2026-11-01' }), s({ revision: 0, status: 'Revise and resubmit', returned_date: '2026-09-01' })];
  assert.equal(run(rows).items[0].status, 'done'); assert.equal(run([...rows].reverse()).items[0].revision, 1);
});

test('revise and resubmit sitting too long, and a third submission, are flagged', () => {
  assert.deepEqual(codes(run([s({ revision: 2, status: 'Revise & Resubmit', returned_date: '2026-10-01' })])), ['resubmit_overdue', 'resubmittal_loop']);
});

test('an approval after the order-by date is flagged even though it is approved', () => {
  assert.deepEqual(codes(run([s({ status: 'Approved as noted', returned_date: '2027-01-10' })])), ['approved_too_late']);
});

test('spec sections with no submittal are listed; spacing in section numbers does not matter', () => {
  const r = run([s()], { specs: [{ spec_section: '051200', title: 'Structural steel' }, { spec_section: '07 92 00', title: 'Joint sealants' }] });
  assert.equal(r.sections_without_submittal, 1); assert.equal(r.items.find((i) => !i.submittal).spec_section, '07 92 00');
});
