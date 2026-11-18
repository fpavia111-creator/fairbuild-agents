// Yangtze: three-way match of AP invoices with commitments and approved receipts. Pure functions, no I/O.
import { num, str, round2, isoDate, partyKey, sameParty, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const APPROVAL_FIELDS = Object.freeze({
  commitment: t(['Commitment', 'PO', 'PO Number', 'Subcontract', 'Contract Number'], { required: true }),
  date: t(['Date', 'Approved Date', 'Receipt Date', 'Received Date', 'Period'], { type: 'date' }),
  approved_to_date: t(['Approved to Date', 'Approved Amount', 'Received Value', 'Work in Place', 'Received to Date', 'Approved'], { type: 'money' }),
  approved_by: t(['Approved By', 'Approver', 'Received By']),
});
export const MATCH_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    tolerance: { type: 'number', minimum: 0, maximum: 10000, description: 'Billing over the commitment or the approval by up to this amount is allowed (default 1.00)' },
    require_approval: { type: 'boolean', description: 'Hold invoices with no receipt or approval on file (default false: they go to review)' },
  },
});
const ORDER = ['no_commitment', 'vendor_mismatch', 'over_commitment', 'over_approved', 'job_mismatch', 'retainage_missing', 'no_receipt'];
const HOLD = new Set(['no_commitment', 'vendor_mismatch', 'over_commitment', 'over_approved']);
const ckey = (v) => str(v).toUpperCase().replace(/\s+/g, '');

export function matchInvoices({ invoiceRows, commitmentRows, approvalRows = null, settings = {} }) {
  const tol = num(settings.tolerance) ?? 1; const requireApproval = settings.require_approval === true;
  const commits = new Map(); for (const c of commitmentRows) { const k = ckey(c.commitment); if (!k) continue; const value = num(c.revised_amount) ?? round2((num(c.original_amount) || 0) + (num(c.approved_changes) || 0)); commits.set(k, { id: str(c.commitment), vendor: str(c.vendor), job: str(c.job), value, retainage_pct: num(c.retainage_pct) }); }
  const approved = new Map(); if (approvalRows) for (const a of approvalRows) { const k = ckey(a.commitment); const v = num(a.approved_to_date); if (!k || v === null) continue; const prev = approved.get(k); const d = isoDate(a.date) || ''; if (!prev || d > prev.date || (d === prev.date && v > prev.value)) approved.set(k, { value: v, date: d }); }
  const invoices = sortBy(invoiceRows.filter((i) => str(i.invoice_number)), [(i) => isoDate(i.invoice_date) || '', 1], [(i) => str(i.invoice_number), 1]);
  const cum = new Map(); const items = [];
  for (const i of invoices) {
    const f = []; const amt = num(i.amount) ?? 0; const k = ckey(i.commitment); const c = k ? commits.get(k) : null;
    if (!c) f.push(finding('no_commitment', amt, `${str(i.commitment) ? `Commitment "${str(i.commitment)}" is not in the commitment list` : 'No subcontract or PO on this invoice'}. Get the commitment issued or coded before approving.`));
    else {
      if (str(i.vendor) && !sameParty(i.vendor, c.vendor)) f.push(finding('vendor_mismatch', amt, `Billed by ${str(i.vendor)}, but ${c.id} is with ${c.vendor}.`));
      if (str(i.job) && c.job && jobKey(i.job) !== jobKey(c.job)) f.push(finding('job_mismatch', null, `Invoice is coded to job ${str(i.job)}; ${c.id} is on job ${c.job}.`));
      const before = cum.get(k) || 0; const after = round2(before + amt); cum.set(k, after);
      if (c.value !== null && after - c.value > tol) f.push(finding('over_commitment', Math.min(amt, after - c.value), `With this invoice ${c.id} is billed ${after} against its value of ${c.value}.`));
      const ap = approved.get(k);
      if (ap) { if (after - ap.value > tol) f.push(finding('over_approved', Math.min(amt, after - ap.value), `With this invoice ${c.id} is billed ${after}; ${ap.value} was approved as received or in place (${ap.date || 'undated'}).`)); }
      else if (approvalRows) f.push(finding('no_receipt', null, `No receipt or approval on file for ${c.id}. Ask the project manager to confirm the work or delivery.`));
      if (c.retainage_pct && amt > 0 && !(num(i.retainage) > 0)) f.push(finding('retainage_missing', round2(amt * c.retainage_pct / 100), `${c.id} carries ${c.retainage_pct}% retainage and none was withheld on this invoice.`));
    }
    const codes = f.map((x) => x.code);
    const hold = codes.some((x) => HOLD.has(x)) || (requireApproval && codes.includes('no_receipt'));
    const status = hold ? 'hold' : f.length ? 'review' : 'matched';
    items.push({ invoice_number: str(i.invoice_number), vendor: str(i.vendor), job: str(i.job), commitment: str(i.commitment), invoice_date: isoDate(i.invoice_date), amount: amt, retainage: num(i.retainage) ?? 0, commitment_value: c ? c.value : null, billed_with_this: c ? cum.get(k) : null, approved_to_date: c && approved.get(k) ? approved.get(k).value : null, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { hold: 0, review: 1, matched: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['invoice_date', 1], ['invoice_number', 1]);
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { invoices: 0, amount: 0, on_hold: 0 }; v.invoices++; v.amount = round2(v.amount + i.amount); if (i.status === 'hold') v.on_hold = round2(v.on_hold + i.amount); }
  const sumBy = (st) => round2(out.filter((i) => i.status === st).reduce((a, i) => a + i.amount, 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    invoices: out.length, amount: round2(out.reduce((a, i) => a + i.amount, 0)), matched: count('matched'), review: count('review'), hold: count('hold'),
    matched_amount: sumBy('matched'), review_amount: sumBy('review'), hold_amount: sumBy('hold'), settings_used: { tolerance: tol, require_approval: requireApproval },
    by_vendor: byVendor, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.invoices} invoice(s), ${r.amount}: ${r.matched} matched (${r.matched_amount}), ${r.review} to review (${r.review_amount}), ${r.hold} on hold (${r.hold_amount}) for no commitment, the wrong vendor, or billing past the commitment or the approved work.`;
  return r;
}

/** Markdown body of a hold notice to one vendor. */
export function holdText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'hold');
  const L = [`# Invoices on hold: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'The invoices below cannot be approved yet. Please send what is listed so we can process them.', '',
    '| Invoice | Commitment | Amount | Why it is held |', '| --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.invoice_number} | ${i.commitment || 'none'} | ${i.amount} | ${i.findings.filter((f) => HOLD.has(f.code)).map((f) => f.detail).join(' ')} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
