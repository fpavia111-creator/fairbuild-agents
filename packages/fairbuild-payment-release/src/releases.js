// Fairbuild Payment Release: the release check before a subcontractor invoice is paid. Pure functions, no I/O.
import { num, str, round2, isoDate, monthKey, readYesNo, partyKey, jobKey, AP_INVOICE_FIELDS, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const RELEASE_INVOICE_FIELDS = Object.freeze({ ...AP_INVOICE_FIELDS, pm_approved: t(['PM Approved', 'Approved', 'Approved by PM', 'Project Manager Approval'], { type: 'bool' }) });
export const OWNER_PAYMENT_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project'], { required: true }),
  period: t(['Period', 'Month', 'Billing Period', 'Application Period']),
  received: t(['Received', 'Paid', 'Owner Paid', 'Collected'], { type: 'bool' }),
});
export const RELEASE_WAIVER_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Claimant'], { required: true }),
  invoice_number: t(['Invoice Number', 'Invoice', 'Pay App', 'Payment Ref']),
  waiver_type: t(['Waiver Type', 'Type', 'Form']),
  received_date: t(['Received Date', 'Received', 'Date'], { type: 'date' }),
});
export const VENDOR_STATUS_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Company'], { required: true }),
  coi_expires: t(['COI Expires', 'Insurance Expires', 'Certificate Expires', 'Insurance Expiry'], { type: 'date' }),
  w9_on_file: t(['W-9 on File', 'W9 on File', 'W-9', 'W9'], { type: 'bool' }),
  retainage_pct: t(['Retainage %', 'Retainage Percent', 'Retainage Rate'], { type: 'number' }),
});
export const RELEASE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    pay_when_paid: { type: 'boolean', description: 'Hold a subcontractor invoice until the owner has paid that job for the same month (default true when owner payments are given)' },
    require_waiver: { type: 'boolean', description: 'Hold an invoice with no conditional waiver on file (default true when waivers are given)' },
  },
});
const ORDER = ['not_approved', 'owner_not_paid', 'no_conditional_waiver', 'coi_expired', 'no_w9', 'retainage_short'];
const HOLD = new Set(['not_approved', 'owner_not_paid', 'no_conditional_waiver', 'coi_expired', 'no_w9']);

export function checkReleases({ invoiceRows, ownerRows = null, waiverRows = null, vendorRows = null, settings = {}, asOf }) {
  const pwp = ownerRows ? settings.pay_when_paid !== false : false; const needWaiver = waiverRows ? settings.require_waiver !== false : false;
  const owner = new Map(); if (ownerRows) for (const o of ownerRows) { const m = /^\d{4}-\d{2}$/.test(str(o.period)) ? str(o.period) : monthKey(o.period); if (!m) continue; const k = `${jobKey(o.job)}|${m}`; owner.set(k, owner.get(k) || readYesNo(o.received) === true); }
  const waivers = new Set(); if (waiverRows) for (const w of waiverRows) if (!/un-?conditional/i.test(str(w.waiver_type))) waivers.add(`${partyKey(w.vendor)}|${str(w.invoice_number).toUpperCase()}`);
  const vendors = new Map(); if (vendorRows) for (const v of vendorRows) vendors.set(partyKey(v.vendor), { coi: isoDate(v.coi_expires), w9: readYesNo(v.w9_on_file), pct: num(v.retainage_pct) });
  const items = [];
  for (const i of sortBy(invoiceRows.filter((x) => str(x.invoice_number)), [(x) => str(x.vendor), 1], [(x) => str(x.invoice_number), 1])) {
    const f = []; const amount = num(i.amount) ?? 0; const ret = num(i.retainage) ?? 0; const v = vendors.get(partyKey(i.vendor)); const month = monthKey(i.invoice_date);
    if (readYesNo(i.pm_approved) !== true) f.push(finding('not_approved', null, 'The project manager has not approved this invoice.'));
    if (pwp && month && owner.get(`${jobKey(i.job)}|${month}`) !== true) f.push(finding('owner_not_paid', null, `The owner has not paid job ${str(i.job)} for ${month}. Under pay-when-paid this invoice waits.`));
    if (needWaiver && !waivers.has(`${partyKey(i.vendor)}|${str(i.invoice_number).toUpperCase()}`)) f.push(finding('no_conditional_waiver', null, `No conditional waiver on file for ${str(i.invoice_number)}.`));
    if (v && v.coi && v.coi < asOf) f.push(finding('coi_expired', null, `${str(i.vendor)}'s insurance certificate expired on ${v.coi}.`));
    if (v && v.w9 === false) f.push(finding('no_w9', null, `No W-9 on file for ${str(i.vendor)}.`));
    let releasable = round2(amount - ret);
    if (v && v.pct !== null) { const want = round2(amount * v.pct / 100); if (want - ret > 0.005) { f.push(finding('retainage_short', want - ret, `Retainage withheld is ${ret}; ${v.pct}% of ${amount} is ${want}. Release ${round2(amount - want)}, not ${releasable}.`)); releasable = round2(amount - want); } }
    const c = f.map((x) => x.code);
    const status = c.some((x) => HOLD.has(x)) ? 'hold' : f.length ? 'review' : 'release';
    items.push({ invoice_number: str(i.invoice_number), vendor: str(i.vendor), job: str(i.job), commitment: str(i.commitment), invoice_date: isoDate(i.invoice_date), amount, retainage: ret, releasable, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { hold: 0, review: 1, release: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['invoice_number', 1]);
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { invoices: 0, releasable: 0, held: 0 }; v.invoices++; if (i.status === 'hold') v.held = round2(v.held + i.releasable); else v.releasable = round2(v.releasable + i.releasable); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    invoices: out.length, release: count('release'), review: count('review'), hold: count('hold'),
    releasable: round2(out.filter((i) => i.status !== 'hold').reduce((a, i) => a + i.releasable, 0)), held: round2(out.filter((i) => i.status === 'hold').reduce((a, i) => a + i.releasable, 0)),
    as_of: asOf, settings_used: { pay_when_paid: pwp, require_waiver: needWaiver }, by_vendor: byVendor, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.invoices} subcontractor invoice(s): ${r.release} clear to release, ${r.review} to release at a corrected amount, ${r.hold} held. ${r.releasable} can be released, ${r.held} is held for approval, owner payment, waivers, insurance or W-9.`;
  return r;
}

/** Markdown body of a hold notice to one subcontractor. */
export function holdText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'hold');
  const L = [`# Payment status: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'These invoices can go into a payment run once the items below are cleared:', '', '| Invoice | Job | Amount | What is needed |', '| --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.invoice_number} | ${i.job} | ${i.amount} | ${i.findings.filter((f) => HOLD.has(f.code)).map((f) => f.detail).join(' ')} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
