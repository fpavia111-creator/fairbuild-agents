// Elbe: punch list items by job, trade and subcontractor. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, statusOf, partyKey, exportProfile, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PUNCH_FIELDS = Object.freeze({
  item: t(['Item', 'Item Number', 'Punch Item', '#', 'Number', 'ID'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  location: t(['Location', 'Area', 'Room']),
  description: t(['Description', 'Name', 'Title', 'Issue']),
  trade: t(['Trade', 'Category', 'Discipline']),
  vendor: t(['Vendor', 'Assignee', 'Assigned To', 'Responsible Contractor', 'Ball In Court', 'Subcontractor']),
  created: t(['Created', 'Created At', 'Date Created', 'Opened'], { type: 'date' }),
  due_date: t(['Due Date', 'Due', 'Required By'], { type: 'date' }),
  status: t(['Status', 'State']),
  closed_date: t(['Closed Date', 'Closed At', 'Closed', 'Completed'], { type: 'date' }),
});
export const PAYABLE_STATUS_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Contract Company'], { required: true }),
  retainage_remaining: t(['Retainage Remaining', 'Retainage Held', 'Retainage Balance', 'Retainage'], { type: 'money' }),
  balance_remaining: t(['Balance Remaining', 'Remaining', 'Open Balance', 'Unpaid'], { type: 'money' }),
});
export const PUNCH_PROFILES = Object.freeze([exportProfile('procore_punch_list', { item: ['#', 'Number'], job: ['Project', 'Project Number'], location: 'Location', description: ['Name', 'Title'], trade: 'Trade', vendor: ['Ball In Court', 'Assignee'], created: 'Created At', due_date: 'Due Date', status: 'Status', closed_date: 'Closed At' })]);
export const PUNCH_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: { aging_days: { type: 'integer', minimum: 0, maximum: 365, description: 'An item open longer than this many days is flagged (default 30)' } },
});
const ORDER = ['sub_paid_in_full', 'past_due', 'reopened', 'open_too_long', 'no_assignee'];

export function checkPunch({ punchRows, payableRows = null, settings = {}, asOf }) {
  const aging = num(settings.aging_days) ?? 30;
  const pay = new Map(); if (payableRows) for (const p of payableRows) pay.set(partyKey(p.vendor), { retainage: num(p.retainage_remaining), balance: num(p.balance_remaining) });
  const items = [];
  for (const p of punchRows) {
    const id = str(p.item); if (!id) continue;
    const f = []; const raw = str(p.status); const st = statusOf(raw); const closed = (st === 'closed' && !/reopen/i.test(raw)) || (!!isoDate(p.closed_date) && !/reopen|open/i.test(raw));
    const created = isoDate(p.created); const due = isoDate(p.due_date); const vendor = str(p.vendor); const age = created ? daysBetween(created, asOf) : null;
    if (!closed) {
      const v = vendor ? pay.get(partyKey(vendor)) : null;
      if (v && (v.retainage ?? 1) <= 0 && (v.balance ?? 0) <= 0) f.push(finding('sub_paid_in_full', null, `${vendor} has been paid in full with no retainage left, and this item is still open. You have no money held to make sure it gets done.`));
      if (due && due < asOf) f.push(finding('past_due', null, `Due ${due}, ${daysBetween(due, asOf)} day(s) ago.`));
      if (/reopen/i.test(raw)) f.push(finding('reopened', null, 'Reopened after it was marked done.'));
      if (age !== null && age > aging) f.push(finding('open_too_long', null, `Open ${age} days since ${created}.`));
      if (!vendor) f.push(finding('no_assignee', null, 'No one is assigned.'));
    }
    const c = f.map((x) => x.code);
    const status = closed ? 'closed' : c.includes('sub_paid_in_full') ? 'risk' : c.includes('past_due') ? 'past_due' : f.length ? 'review' : 'open';
    items.push({ key: `${str(p.job)} ${id}`.trim(), item: id, job: str(p.job), location: str(p.location), description: str(p.description), trade: str(p.trade), vendor, created, due_date: due, age_days: closed ? null : age, open: !closed, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { risk: 0, past_due: 1, review: 2, open: 3, closed: 4 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1], ['item', 1]);
  const byTrade = {}; const byJob = {};
  for (const i of out) { const tr = byTrade[i.vendor || '(unassigned)'] = byTrade[i.vendor || '(unassigned)'] || { trade: i.trade, open: 0, past_due: 0 }; if (i.open) tr.open++; if (i.findings.some((f) => f.code === 'past_due')) tr.past_due++; const j = byJob[i.job || '(none)'] = byJob[i.job || '(none)'] || { items: 0, open: 0, past_due: 0 }; j.items++; if (i.open) j.open++; if (i.findings.some((f) => f.code === 'past_due')) j.past_due++; }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    items_total: out.length, open: out.filter((i) => i.open).length, closed: count('closed'), past_due: out.filter((i) => i.findings.some((f) => f.code === 'past_due')).length, risk: count('risk'), review: count('review'),
    as_of: asOf, settings_used: { aging_days: aging }, by_trade: byTrade, by_job: byJob, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.items_total} punch item(s) as of ${asOf}: ${r.open} open, ${r.past_due} past due, ${r.risk} open on subcontractors already paid in full, ${r.review} other item(s) to review.`;
  return r;
}

/** Markdown body of a punch notice to one subcontractor. */
export function noticeText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.open);
  const L = [`# Open punch list items: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'Please complete these items and tell us when they are ready for inspection. [TO CONFIRM date you need them done by]', '',
    '| Item | Job | Location | Description | Due |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.item} | ${i.job} | ${i.location} | ${i.description} | ${i.due_date || ''} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
