// Fairbuild Change Orders: the change order log by job. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, statusOf, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

export const CO_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    pending_days: { type: 'integer', minimum: 1, maximum: 3650, description: 'A pending change order older than this many days since it was submitted is flagged (default 30)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['duplicate_number', 'billed_not_approved', 'over_billed', 'approved_unbilled', 'negative_margin', 'pending_aging', 'no_price', 'rejected_with_cost'];
const stateOf = (raw) => { const s = statusOf(raw); return s === 'approved' || s === 'closed' ? 'approved' : s === 'rejected' || s === 'void' ? 'rejected' : 'pending'; };

export function checkChangeOrders({ rows, settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const pendingDays = num(settings.pending_days) ?? 30;
  const groups = new Map();
  for (const r of rows) {
    const no = str(r.change_order); if (!no) continue;
    const k = `${jobKey(r.job)}|${no.toUpperCase().replace(/\s+/g, '')}`;
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r);
  }
  const items = [];
  for (const list of groups.values()) {
    const sorted = sortBy(list, [(x) => str(x.description), 1], [(x) => str(x.approved_date), 1], [(x) => num(x.amount) ?? -1, 1]);
    const r = sorted[0]; const f = [];
    const state = stateOf(r.status); const amount = num(r.amount); const cost = num(r.cost); const billed = num(r.billed) ?? 0;
    const submitted = isoDate(r.submitted_date); const age = submitted ? daysBetween(submitted, asOf) : null;
    if (sorted.length > 1) f.push(finding('duplicate_number', null, `${str(r.change_order)} appears ${sorted.length} times on job ${str(r.job)} (${sorted.map((x) => `"${str(x.description)}" ${num(x.amount) ?? ''}`).join(', ')}). Only the first is counted; correct the log.`));
    if (state !== 'approved' && billed > tol) f.push(finding('billed_not_approved', billed, `${billed} has been billed on ${str(r.change_order)}, which is ${str(r.status).toLowerCase() || 'not approved'}. Owners usually reject billing on unapproved changes.`));
    if (state === 'approved' && amount !== null && billed - amount > tol) f.push(finding('over_billed', billed - amount, `Billed ${billed} is more than the approved ${amount}.`));
    if (state === 'approved' && amount !== null && amount - billed > tol) f.push(finding('approved_unbilled', amount - billed, `Approved for ${amount}${r.approved_date ? ` on ${isoDate(r.approved_date)}` : ''}; ${billed} billed so far, ${round2(amount - billed)} not yet on a pay application.`));
    if (state !== 'rejected' && amount !== null && cost !== null && cost - amount > tol) f.push(finding('negative_margin', cost - amount, `Priced at ${amount} against an estimated cost of ${cost}: ${round2(cost - amount)} below cost.`));
    if (state === 'pending' && age !== null && age > pendingDays) f.push(finding('pending_aging', null, `Pending ${age} days since ${submitted}${amount !== null ? ` for ${amount}` : ''}. Follow up with the owner for a decision.`));
    if (state === 'pending' && (amount === null || amount === 0)) f.push(finding('no_price', null, `Pending with no price${cost !== null ? ` (estimated cost ${cost})` : ''}. Price it and submit it.`));
    if (state === 'rejected' && cost !== null && cost > tol) f.push(finding('rejected_with_cost', cost, `Rejected, with ${cost} of estimated cost. Decide whether to absorb it, rework the pricing or pursue a claim.`));
    const codes = f.map((x) => x.code);
    const status = codes.some((c) => ['billed_not_approved', 'over_billed'].includes(c)) ? 'billing_error' : codes.includes('approved_unbilled') ? 'unbilled' : f.length ? 'review' : 'ok';
    items.push({ change_order: str(r.change_order), job: str(r.job), co_type: str(r.co_type), state, status_raw: str(r.status), description: str(r.description), amount, cost, billed, unbilled: state === 'approved' && amount !== null ? round2(Math.max(0, amount - billed)) : 0, submitted, approved: isoDate(r.approved_date), age_days: state === 'pending' ? age : null, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { billing_error: 0, unbilled: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1], ['change_order', 1]);
  const jobs = {}; const states = {};
  for (const i of out) {
    const j = jobs[i.job] = jobs[i.job] || { change_orders: 0, approved: 0, pending: 0, billed: 0, unbilled: 0 };
    j.change_orders++; if (i.state === 'approved') j.approved = round2(j.approved + (i.amount || 0)); if (i.state === 'pending') j.pending = round2(j.pending + (i.amount || 0)); j.billed = round2(j.billed + i.billed); j.unbilled = round2(j.unbilled + i.unbilled);
    const s = states[i.state] = states[i.state] || { count: 0, amount: 0 }; s.count++; s.amount = round2(s.amount + (i.amount || 0));
  }
  const tot = (fn) => round2(out.reduce((a, i) => a + fn(i), 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    change_orders: out.length, approved: tot((i) => (i.state === 'approved' ? i.amount || 0 : 0)), pending: tot((i) => (i.state === 'pending' ? i.amount || 0 : 0)), billed: tot((i) => i.billed), unbilled: tot((i) => i.unbilled),
    billing_error: count('billing_error'), unbilled_count: count('unbilled'), review: count('review'), ok: count('ok'),
    pending_over_days: out.filter((i) => i.findings.some((f) => f.code === 'pending_aging')).length, as_of: asOf, settings_used: { pending_days: pendingDays, tolerance: tol },
    by_job: jobs, by_status: states, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.change_orders} change order(s): ${r.approved} approved, ${r.pending} pending (${r.pending_over_days} waiting more than ${pendingDays} days), ${r.unbilled} approved but not billed. ${r.billing_error} with billing errors, ${r.review} to review.`;
  return r;
}

/** Markdown body of a follow-up to the owner about one job's pending change orders. */
export function followupText(items, { job, to, from }) {
  const rows = items.filter((i) => i.state === 'pending');
  const total = round2(rows.reduce((a, i) => a + (i.amount || 0), 0));
  const L = [`# Pending change orders: job ${job}`, '', `**To:** ${to || '[TO CONFIRM owner or owner representative]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `The change orders below are waiting for your decision, ${total} in total. Please approve, reject or tell us what you need to decide.`, '',
    '| Change order | Description | Amount | Submitted | Days waiting |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.change_order} | ${i.description} | ${i.amount ?? '[TO CONFIRM price]'} | ${i.submitted || ''} | ${i.age_days ?? ''} |`),
    '', 'Backup for each change order: [ATTACH pricing and backup]'];
  return { text: L.join('\n'), count: rows.length, total };
}
