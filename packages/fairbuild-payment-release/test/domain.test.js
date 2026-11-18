// Releases: approval, pay-when-paid, waivers, insurance, W-9 and retainage before a subcontractor is paid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkReleases } from '../src/index.js';

const inv = (n, extra = {}) => ({ invoice_number: n, vendor: 'Example Sub LLC', job: '24-1', commitment: 'SC-1', invoice_date: '2026-11-10', amount: 10000, retainage: 1000, pm_approved: 'yes', ...extra });
const vendor = (extra = {}) => ({ vendor: 'Example Sub, LLC', coi_expires: '2027-01-01', w9_on_file: 'yes', retainage_pct: 10, ...extra });
const run = (rows, o = {}) => checkReleases({ invoiceRows: rows, ownerRows: o.owner || null, waiverRows: o.waivers || null, vendorRows: o.vendors || null, settings: o.settings || {}, asOf: o.asOf || '2026-11-16' });
const codes = (r) => r.items[0].findings.map((f) => f.code);

test('an approved invoice with retainage at the rate is released net of retainage', () => {
  const r = run([inv('A')], { vendors: [vendor()] });
  assert.equal(r.items[0].status, 'release'); assert.equal(r.releasable, 9000);
});

test('an invoice without project manager approval is held', () => {
  assert.deepEqual(codes(run([inv('A', { pm_approved: 'no' })])), ['not_approved']);
  assert.equal(run([inv('A', { pm_approved: '' })]).items[0].status, 'hold');
});

test('pay-when-paid holds an invoice until the owner paid that job for the same month, and can be turned off', () => {
  const owner = [{ job: '24-1', period: '2026-10', received: 'yes' }];
  assert.deepEqual(codes(run([inv('A')], { owner })), ['owner_not_paid']);
  assert.equal(run([inv('A')], { owner: [{ job: '24-1', period: '2026-11', received: 'yes' }] }).items[0].status, 'release');
  assert.equal(run([inv('A')], { owner, settings: { pay_when_paid: false } }).items[0].status, 'release');
});

test('only a conditional waiver for the same invoice clears the waiver check', () => {
  assert.deepEqual(codes(run([inv('A')], { waivers: [{ vendor: 'Example Sub LLC', invoice_number: 'A', waiver_type: 'Unconditional progress' }] })), ['no_conditional_waiver']);
  assert.equal(run([inv('A')], { waivers: [{ vendor: 'EXAMPLE SUB LLC', invoice_number: 'a', waiver_type: 'Conditional progress' }] }).items[0].status, 'release');
});

test('an expired certificate or no W-9 holds the invoice; a certificate expiring on the run date is still current', () => {
  assert.deepEqual(codes(run([inv('A')], { vendors: [vendor({ coi_expires: '2026-11-15' })] })), ['coi_expired']);
  assert.equal(run([inv('A')], { vendors: [vendor({ coi_expires: '2026-11-16' })] }).items[0].status, 'release');
  assert.deepEqual(codes(run([inv('A')], { vendors: [vendor({ w9_on_file: 'no' })] })), ['no_w9']);
});

test('retainage short of the rate is a review item released at the corrected amount', () => {
  const r = run([inv('A', { retainage: 500 })], { vendors: [vendor()] });
  assert.equal(r.items[0].status, 'review'); assert.equal(r.items[0].releasable, 9000);
  assert.deepEqual(r.items[0].findings.map((f) => [f.code, f.amount]), [['retainage_short', 500]]);
  assert.equal(run([inv('A', { retainage: 1500 })], { vendors: [vendor()] }).items[0].status, 'release');
});

test('held amounts and releasable amounts are totalled apart and by vendor', () => {
  const r = run([inv('A'), inv('B', { pm_approved: 'no', amount: 2000, retainage: 200 })], { vendors: [vendor()] });
  assert.equal(r.releasable, 9000); assert.equal(r.held, 1800);
  assert.deepEqual(r.by_vendor['Example Sub LLC'], { invoices: 2, releasable: 9000, held: 1800 });
});
