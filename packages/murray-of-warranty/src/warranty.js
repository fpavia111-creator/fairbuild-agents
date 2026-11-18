// Murray: warranty callbacks by job, trade and subcontractor. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, statusOf, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CALLBACK_FIELDS = Object.freeze({
  callback_id: t(['Callback ID', 'Callback', 'Ticket', 'Service Request', 'Warranty Request', 'ID'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Lot']),
  homeowner: t(['Homeowner', 'Owner', 'Customer', 'Caller', 'Contact Name']),
  contact_phone: t(['Contact Phone', 'Phone', 'Homeowner Phone']),
  date_reported: t(['Date Reported', 'Reported', 'Date', 'Opened', 'Created'], { type: 'date' }),
  trade: t(['Trade', 'Category', 'Item', 'Type']),
  vendor: t(['Vendor', 'Subcontractor', 'Responsible', 'Responsible Party', 'Assigned To']),
  description: t(['Description', 'Issue', 'Problem', 'Notes']),
  cost: t(['Cost', 'Repair Cost', 'Amount', 'Total Cost'], { type: 'money' }),
  status: t(['Status', 'State']),
  closed_date: t(['Closed Date', 'Closed', 'Completed', 'Resolved'], { type: 'date' }),
});
export const WARRANTY_JOB_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Lot'], { required: true }),
  completion_date: t(['Completion Date', 'Closing Date', 'Substantial Completion', 'Handover'], { type: 'date' }),
  warranty_months: t(['Warranty Months', 'Warranty Term', 'Warranty'], { type: 'number' }),
});
export const WARRANTY_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    warranty_months: { type: 'integer', minimum: 0, maximum: 240, description: 'Your warranty term when the job list gives none (default 12)' },
    repeat_days: { type: 'integer', minimum: 0, maximum: 730, description: 'The same trade called back on the same job within this many days is a repeat (default 90)' },
    response_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A callback open longer than this is flagged (default 7)' },
    self_performed: { type: 'array', items: { type: 'string', maxLength: 80 }, description: 'Words in the vendor column that mean your own crews (default ["self", "in-house", "own crew"])' },
  },
});
const ORDER = ['out_of_warranty', 'backcharge_candidate', 'repeat_callback', 'open_too_long', 'no_responsible_party'];
const addMonths = (d, m) => { const x = new Date(`${d}T00:00:00Z`); const day = x.getUTCDate(); x.setUTCMonth(x.getUTCMonth() + m); if (x.getUTCDate() < day) x.setUTCDate(0); return x.toISOString().slice(0, 10); };

export function checkWarranty({ callbackRows, jobRows = null, settings = {}, asOf }) {
  const months = num(settings.warranty_months) ?? 12; const repeatDays = num(settings.repeat_days) ?? 90; const respDays = num(settings.response_days) ?? 7;
  const selfWords = (settings.self_performed || ['self', 'in-house', 'own crew']).map((w) => w.toLowerCase());
  const jobs = new Map(); if (jobRows) for (const j of jobRows) { const d = isoDate(j.completion_date); if (!str(j.job) || !d) continue; jobs.set(jobKey(j.job), { completion: d, ends: addMonths(d, num(j.warranty_months) ?? months) }); }
  const rows = sortBy(callbackRows.filter((c) => str(c.callback_id)), [(c) => isoDate(c.date_reported) || '', 1], [(c) => str(c.callback_id), 1]);
  const items = [];
  for (const [n, c] of rows.entries()) {
    const f = []; const rep = isoDate(c.date_reported); const cost = num(c.cost) ?? 0; const vendor = str(c.vendor); const own = !vendor || selfWords.some((w) => vendor.toLowerCase().includes(w));
    const j = jobs.get(jobKey(c.job)); const closed = statusOf(c.status) === 'closed' || !!isoDate(c.closed_date);
    if (j && rep && rep > j.ends) f.push(finding('out_of_warranty', cost, `Reported ${rep}; the warranty on job ${str(c.job)} ended ${j.ends}. The repair may be billable to the owner.`));
    else if (!own && cost > 0) f.push(finding('backcharge_candidate', cost, `${vendor} did the ${str(c.trade).toLowerCase() || 'work'}; ${cost} of callback cost to recover under its subcontract warranty.`));
    const earlier = rows.slice(0, n).filter((x) => jobKey(x.job) === jobKey(c.job) && str(x.trade).toLowerCase() === str(c.trade).toLowerCase() && str(c.trade) && rep && isoDate(x.date_reported) && daysBetween(isoDate(x.date_reported), rep) <= repeatDays);
    if (earlier.length) f.push(finding('repeat_callback', null, `The same trade was called back on job ${str(c.job)} ${daysBetween(isoDate(earlier.at(-1).date_reported), rep)} day(s) earlier (${earlier.map((x) => str(x.callback_id)).join(', ')}). The first repair may not have fixed it.`));
    if (!closed && rep) { const open = daysBetween(rep, asOf); if (open > respDays) f.push(finding('open_too_long', null, `Open ${open} days since ${rep}.`)); }
    if (!str(c.trade) || (!vendor && !own)) f.push(finding('no_responsible_party', null, 'No trade or responsible party recorded.'));
    else if (!vendor) f.push(finding('no_responsible_party', null, `No one recorded as responsible for the ${str(c.trade).toLowerCase()} repair.`));
    const codes = f.map((x) => x.code);
    const status = codes.includes('out_of_warranty') ? 'billable' : codes.includes('backcharge_candidate') ? 'backcharge' : f.length ? 'review' : 'ok';
    items.push({ callback_id: str(c.callback_id), job: str(c.job), homeowner: str(c.homeowner), contact_phone: str(c.contact_phone), date_reported: rep, trade: str(c.trade), vendor, description: str(c.description), cost, open: !closed, warranty_ends: j ? j.ends : null, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { billable: 0, backcharge: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1], ['date_reported', 1], ['callback_id', 1]);
  const byJob = {}; const byTrade = {};
  for (const i of out) { const j = byJob[i.job || '(none)'] = byJob[i.job || '(none)'] || { callbacks: 0, cost: 0, open: 0 }; j.callbacks++; j.cost = round2(j.cost + i.cost); if (i.open) j.open++; const tr = byTrade[i.trade || '(none)'] = byTrade[i.trade || '(none)'] || { callbacks: 0, cost: 0 }; tr.callbacks++; tr.cost = round2(tr.cost + i.cost); }
  const sumF = (code) => round2(out.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    callbacks: out.length, cost: round2(out.reduce((a, i) => a + i.cost, 0)), open: out.filter((i) => i.open).length, to_backcharge: sumF('backcharge_candidate'), possibly_billable: sumF('out_of_warranty'),
    billable: count('billable'), backcharge: count('backcharge'), review: count('review'), ok: count('ok'), as_of: asOf, settings_used: { warranty_months: months, repeat_days: repeatDays, response_days: respDays },
    by_job: byJob, by_trade: byTrade, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.callbacks} warranty callback(s), ${r.cost} in cost, ${r.open} open: ${r.to_backcharge} to recover from subcontractors, ${r.possibly_billable} reported after the warranty ended, ${r.review} to review.`;
  return r;
}

/** Markdown body of a backcharge notice to one subcontractor. */
export function noticeText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'backcharge');
  const total = round2(rows.reduce((a, i) => a + i.cost, 0));
  const L = [`# Warranty callbacks: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `Under the warranty in your subcontract, we ask you to cover the repairs below, ${total} in total, or to tell us why they are not yours. [TO CONFIRM subcontract warranty clause]`, '',
    '| Callback | Job | Reported | Problem | Cost |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.callback_id} | ${i.job} | ${i.date_reported} | ${i.description} | ${i.cost} |`), '',
    'Photos and repair tickets: [ATTACH]'];
  return { text: L.join('\n'), total, count: rows.length };
}
