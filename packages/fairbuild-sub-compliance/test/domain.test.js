// Compliance documents: names, trades, status, dates, review time and EMR.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCompliance } from '../src/index.js';

const req = { required: ['W-9', 'Signed subcontract'], expiring_days: 30, review_days: 30 };
const doc = (type, extra = {}) => ({ vendor: 'Example Sub LLC', document_type: type, status: 'Approved', received_date: '2026-10-01', ...extra });
const run = (docs, opts = {}) => checkCompliance({ vendorRows: opts.vendors || null, docRows: docs, requirements: opts.requirements || req, asOf: opts.asOf || '2026-11-16' });
const find = (r, d) => r.items.find((i) => i.document === d);

test('a complete file is compliant', () => {
  const r = run([doc('W-9'), doc('Signed subcontract')]);
  assert.equal(r.vendors_compliant, 1); assert.equal(r.ok, 2);
});

test('document names match whatever the punctuation, and through your aliases', () => {
  assert.equal(find(run([doc('w 9'), doc('SIGNED-SUBCONTRACT')]), 'W-9').status, 'ok');
  const r = run([doc('Taxpayer ID form'), doc('Signed subcontract')], { requirements: { ...req, document_aliases: { 'Taxpayer ID form': 'W-9' } } });
  assert.equal(find(r, 'W-9').status, 'ok');
});

test('a trade adds its own documents', () => {
  const r = run([doc('W-9'), doc('Signed subcontract')], { vendors: [{ vendor: 'Example Sub LLC', trade: 'Electrical', status: 'Active' }], requirements: { ...req, by_trade: { electrical: ['Electrical license'] } } });
  assert.equal(find(r, 'Electrical license').findings[0].code, 'document_missing');
});

test('expired, expiring and rejected documents are reported; status words in other languages are read', () => {
  assert.equal(find(run([doc('W-9', { expires: '2026-11-01' }), doc('Signed subcontract')]), 'W-9').findings[0].code, 'document_expired');
  assert.equal(find(run([doc('W-9', { expires: '2026-12-01' }), doc('Signed subcontract')]), 'W-9').findings[0].code, 'document_expiring');
  assert.equal(find(run([doc('W-9', { status: 'Abgelehnt' }), doc('Signed subcontract')]), 'W-9').findings[0].code, 'document_rejected');
});

test('a document waiting for review is flagged only after review_days', () => {
  assert.equal(find(run([doc('W-9', { status: 'Submitted', received_date: '2026-11-10' }), doc('Signed subcontract')]), 'W-9').status, 'ok');
  assert.equal(find(run([doc('W-9', { status: 'Submitted', received_date: '2026-09-10' }), doc('Signed subcontract')]), 'W-9').findings[0].code, 'not_reviewed');
});

test('the EMR is checked against your limit only when you set one', () => {
  const docs = [doc('W-9'), doc('Signed subcontract'), doc('EMR letter', { value: 1.4 })];
  const requirements = { ...req, required: [...req.required, 'EMR letter'] };
  assert.equal(find(run(docs, { requirements }), 'EMR letter').status, 'ok');
  assert.equal(find(run(docs, { requirements: { ...requirements, max_emr: 1.2 } }), 'EMR letter').findings[0].code, 'emr_high');
});

test('inactive subcontractors are skipped, and an active one with no documents is reported', () => {
  const r = run([doc('W-9', { vendor: 'Old Sub Co' })], { vendors: [{ vendor: 'Old Sub Co', status: 'Inactive' }, { vendor: 'New Sub Co', status: 'Active' }] });
  assert.equal(r.inactive_skipped, 1); assert.equal(r.vendors, 1); assert.equal(r.missing, 2);
});
