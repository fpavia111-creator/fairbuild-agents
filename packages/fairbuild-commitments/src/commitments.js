// Fairbuild Commitments: subcontracts and purchase orders against AP invoices and payments. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, statusOf, readYesNo, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

export const COMMITMENT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    stale_days: { type: 'integer', minimum: 1, maximum: 3650, description: 'An open commitment with no invoice for this many days is flagged to close or confirm (default 90)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
    retainage_check: { type: 'boolean', description: 'Check retainage held against retainage % times invoiced (default true)' },
  },
});
const ORDER = ['revised_math', 'over_invoiced', 'paid_over_invoiced', 'not_executed', 'invoiced_does_not_tie', 'retainage_off', 'closed_with_balance', 'stale_open', 'unknown_commitment'];
const key = (v) => str(v).toUpperCase().replace(/\s+/g, '');

export function checkCommitments({ commitmentRows, invoiceRows = null, settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const staleDays = num(settings.stale_days) ?? 90; const retCheck = settings.retainage_check !== false;
  const byId = new Map();
  for (const r of commitmentRows) {
    const id = str(r.commitment); if (!id) continue;
    let c = byId.get(key(id));
    if (!c) { c = { commitment: id, type: str(r.commitment_type), job: str(r.job), vendor: str(r.vendor), cost_code: str(r.cost_code), description: str(r.description), date: isoDate(r.date), status_raw: str(r.status), original: 0, changes: null, revised: null, invoiced: null, paid: null, retainage_held: null, retainage_pct: num(r.retainage_pct), executed: readYesNo(r.executed) }; byId.set(key(id), c); }
    const add = (f, v) => { const n = num(v); if (n !== null) c[f] = round2((c[f] || 0) + n); };
    c.original = round2(c.original + (num(r.original_amount) || 0)); add('changes', r.approved_changes); add('revised', r.revised_amount); add('invoiced', r.invoiced); add('paid', r.paid); add('retainage_held', r.retainage_held);
  }
  const inv = new Map(); const orphans = new Map();
  if (invoiceRows) for (const r of invoiceRows) {
    const amt = num(r.amount); if (amt === null) continue;
    const k = key(r.commitment); const c = k ? byId.get(k) : null;
    if (!c) { const ok = `${k}|${partyKey(r.vendor)}`; const o = orphans.get(ok) || { commitment: str(r.commitment) || '(none)', vendor: str(r.vendor), job: str(r.job), amount: 0, invoices: [] }; o.amount = round2(o.amount + amt); o.invoices.push(str(r.invoice_number)); orphans.set(ok, o); continue; }
    const e = inv.get(k) || { amount: 0, retainage: 0, count: 0, last: null };
    e.amount = round2(e.amount + amt); e.retainage = round2(e.retainage + (num(r.retainage) || 0)); e.count++;
    const d = isoDate(r.invoice_date); if (d && (!e.last || d > e.last)) e.last = d;
    inv.set(k, e);
  }
  const items = [];
  for (const [k, c] of byId) {
    const f = [];
    const computed = round2(c.original + (c.changes || 0));
    const revised = c.revised ?? computed;
    if (c.revised !== null && c.changes !== null && Math.abs(c.revised - computed) > tol) f.push(finding('revised_math', c.revised - computed, `Original ${c.original} plus approved changes ${c.changes} is ${computed}; the commitment says ${c.revised}.`));
    const e = inv.get(k);
    const invoiced = e ? e.amount : (c.invoiced ?? 0);
    if (e && c.invoiced !== null && Math.abs(e.amount - c.invoiced) > tol) f.push(finding('invoiced_does_not_tie', null, `AP invoices against ${c.commitment} add up to ${e.amount} (${e.count}); the commitment report shows ${c.invoiced} invoiced.`));
    if (invoiced - revised > tol) f.push(finding('over_invoiced', invoiced - revised, `Invoiced ${invoiced} is more than the commitment's value ${revised} by ${round2(invoiced - revised)}. Look for an unissued change order or a bill coded to the wrong commitment.`));
    if (c.paid !== null && c.paid - invoiced > tol) f.push(finding('paid_over_invoiced', c.paid - invoiced, `Paid ${c.paid} is more than invoiced ${invoiced} by ${round2(c.paid - invoiced)}.`));
    if (c.executed === false && invoiced > tol) f.push(finding('not_executed', null, `${invoiced} has been invoiced against ${c.commitment}, which is not marked executed. Get the signed subcontract or PO before paying more.`));
    const held = c.retainage_held ?? (e ? e.retainage : null);
    if (retCheck && c.retainage_pct !== null && held !== null) { const want = round2(invoiced * c.retainage_pct / 100); if (Math.abs(want - held) > tol) f.push(finding('retainage_off', want - held, `Retainage held is ${held}; ${c.retainage_pct}% of ${invoiced} invoiced is ${want}.`)); }
    const st = statusOf(c.status_raw); const closed = st === 'closed' || st === 'void';
    const open = closed ? 0 : round2(Math.max(0, revised - invoiced));
    if (closed && revised - invoiced > tol) f.push(finding('closed_with_balance', revised - invoiced, `${c.commitment} is ${c.status_raw.toLowerCase()} with ${round2(revised - invoiced)} not invoiced. If the work is finished, reduce the commitment so committed cost is not overstated.`));
    const last = (e && e.last) || c.date; const idle = last && asOf ? daysBetween(last, asOf) : null;
    if (!closed && open > tol && idle !== null && idle > staleDays) f.push(finding('stale_open', null, `${open} is still open on ${c.commitment} with no invoice for ${idle} days (since ${last}). Ask the vendor whether more is coming or close it.`));
    const status = f.some((x) => ['over_invoiced', 'paid_over_invoiced'].includes(x.code)) ? 'over' : f.length ? 'review' : 'ok';
    items.push({ commitment: c.commitment, type: c.type, job: c.job, vendor: c.vendor, cost_code: c.cost_code, description: c.description, revised, invoiced, paid: c.paid, open, retainage_held: held, executed: c.executed, last_invoice: (e && e.last) || null, days_idle: idle, status, findings: orderFindings(f, ORDER) });
  }
  for (const o of orphans.values()) items.push({ commitment: o.commitment, type: '', job: o.job, vendor: o.vendor, cost_code: '', description: '', revised: 0, invoiced: o.amount, paid: null, open: 0, retainage_held: null, executed: null, last_invoice: null, days_idle: null, status: 'unmatched', findings: [finding('unknown_commitment', o.amount, `Invoice(s) ${o.invoices.sort().join(', ')} from ${o.vendor || 'an unnamed vendor'} (${o.amount}) name commitment "${o.commitment}", which is not in the commitment list.`)] });
  const rank = { over: 0, unmatched: 1, review: 2, ok: 3 };
  const sorted = sortBy(items, [(i) => rank[i.status]], ['job', 1], ['commitment', 1]);
  const vendors = {}; const jobs = {};
  for (const i of sorted.filter((x) => x.status !== 'unmatched')) {
    const v = vendors[i.vendor] = vendors[i.vendor] || { commitments: 0, revised: 0, invoiced: 0, open: 0 }; v.commitments++; v.revised = round2(v.revised + i.revised); v.invoiced = round2(v.invoiced + i.invoiced); v.open = round2(v.open + i.open);
    const j = jobs[i.job] = jobs[i.job] || { commitments: 0, revised: 0, invoiced: 0, open: 0 }; j.commitments++; j.revised = round2(j.revised + i.revised); j.invoiced = round2(j.invoiced + i.invoiced); j.open = round2(j.open + i.open);
  }
  const sumCode = (code) => round2(sorted.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const count = (st) => sorted.filter((i) => i.status === st).length;
  const r = {
    commitments: byId.size, revised: round2([...sorted].filter((i) => i.status !== 'unmatched').reduce((a, i) => a + i.revised, 0)), invoiced: round2(sorted.filter((i) => i.status !== 'unmatched').reduce((a, i) => a + i.invoiced, 0)),
    open_balance: round2(sorted.reduce((a, i) => a + i.open, 0)), over: count('over'), review: count('review'), unmatched: count('unmatched'), ok: count('ok'),
    over_invoiced: sumCode('over_invoiced'), overpaid: sumCode('paid_over_invoiced'), unmatched_invoices: sumCode('unknown_commitment'), as_of: asOf,
    settings_used: { stale_days: staleDays, tolerance: tol, retainage_check: retCheck }, by_vendor: vendors, by_job: jobs, by_finding: byFinding(sorted), items: sorted,
  };
  r.summary = `${r.commitments} commitment(s): ${r.open_balance} still open of ${r.revised} committed. ${r.over} billed or paid past their value (${r.over_invoiced} over-invoiced, ${r.overpaid} overpaid), ${r.review} to review, ${r.unmatched} invoice group(s) naming no commitment (${r.unmatched_invoices}).`;
  return r;
}

/** Markdown body of a letter to one vendor about its commitments that need its answer. */
export function letterText(items, { vendor, from, contact }) {
  const rows = items.filter((i) => i.findings.some((f) => ['over_invoiced', 'not_executed', 'stale_open', 'closed_with_balance', 'unknown_commitment', 'invoiced_does_not_tie'].includes(f.code)));
  const ask = { over_invoiced: 'a credit memo or the change order that covers the extra billing', not_executed: 'the signed subcontract or PO', stale_open: 'whether more will be invoiced, or a final invoice so the commitment can be closed', closed_with_balance: 'confirmation that no more will be invoiced', unknown_commitment: 'the subcontract or PO number these invoices belong to', invoiced_does_not_tie: 'a statement of everything invoiced to date' };
  const L = [`# Commitments: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `We are reconciling our subcontracts and purchase orders with ${vendor}. Please reply on each item below.`, '',
    '| Commitment | Job | Value | Invoiced | What we need from you |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.commitment} | ${i.job} | ${i.revised} | ${i.invoiced} | ${[...new Set(i.findings.map((f) => ask[f.code]).filter(Boolean))].join('; ')} |`),
    '', 'Nothing here changes a payment that is already approved. Thank you.'];
  return { text: L.join('\n'), count: rows.length };
}
