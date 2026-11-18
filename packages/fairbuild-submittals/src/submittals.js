// Fairbuild Submittals: the submittal register worked back from the date material is needed on site. Pure functions, no I/O.
//
//   order-by date        = required on site - lead time
//   latest submit date   = order-by date - review days
// A submittal not submitted by its latest submit date, or approved after its order-by
// date, puts the delivery date at risk.
import { num, str, round2, isoDate, daysBetween, addDays, exportProfile, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const SUBMITTAL_FIELDS = Object.freeze({
  submittal: t(['Submittal', 'Submittal Number', 'Number', '#', 'Submittal #'], { required: true }),
  revision: t(['Revision', 'Rev', 'Revision Number'], { type: 'number' }),
  spec_section: t(['Spec Section', 'Specification Section', 'Spec', 'Section']),
  title: t(['Title', 'Description', 'Name']),
  vendor: t(['Vendor', 'Responsible Contractor', 'Subcontractor', 'Submitted By']),
  status: t(['Status', 'Submittal Status', 'Response', 'Action']),
  ball_in_court: t(['Ball In Court', 'Ball in Court', 'With', 'Current Reviewer']),
  submitted_date: t(['Submitted Date', 'Submitted', 'Date Submitted', 'Sent Date'], { type: 'date' }),
  returned_date: t(['Returned Date', 'Returned', 'Response Date', 'Date Returned'], { type: 'date' }),
  required_on_site: t(['Required On-Site Date', 'Required On Site', 'Required On-Site', 'Need By', 'Required Date'], { type: 'date' }),
  lead_time_days: t(['Lead Time', 'Lead Time Days', 'Lead Time (days)', 'Fabrication Days'], { type: 'number' }),
  review_days: t(['Review Days', 'Review Time', 'Design Team Review Time', 'Allowed Review Days'], { type: 'number' }),
});
export const SPEC_FIELDS = Object.freeze({
  spec_section: t(['Spec Section', 'Specification Section', 'Section'], { required: true }),
  title: t(['Title', 'Section Title', 'Name']),
});
export const SUBMITTAL_PROFILES = Object.freeze([exportProfile('procore_submittals', { submittal: ['#', 'Number'], revision: ['Revision', 'Rev'], spec_section: 'Spec Section', title: 'Title', vendor: 'Responsible Contractor', status: 'Status', ball_in_court: 'Ball In Court', submitted_date: ['Submitted Date', 'Sent Date'], returned_date: ['Returned Date', 'Received Date'], required_on_site: 'Required On-Site Date', lead_time_days: 'Lead Time', review_days: 'Design Team Review Time' })]);
export const SUBMITTAL_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    review_days: { type: 'integer', minimum: 0, maximum: 180, description: 'Review days allowed when a submittal gives none (default 10)' },
    resubmit_days: { type: 'integer', minimum: 0, maximum: 180, description: 'A revise-and-resubmit not resubmitted within this many days is flagged (default 14)' },
    loop_revision: { type: 'integer', minimum: 1, maximum: 20, description: 'Revision number from which a submittal is in a resubmittal loop (default 2: the third submission)' },
  },
});
const ORDER = ['submit_late', 'review_overdue', 'resubmit_overdue', 'approved_too_late', 'resubmittal_loop', 'no_submittal_for_section'];
const kind = (s) => { const v = str(s).toLowerCase(); if (/revise|resubmit|r&r|rejected|not approved/.test(v)) return 'returned_bad'; if (/approved|reviewed|no exception|accepted/.test(v)) return 'approved'; if (/submitted|in review|under review|pending review/.test(v)) return 'in_review'; if (/void|closed|cancel/.test(v)) return 'closed'; return 'open'; };
const secKey = (s) => str(s).replace(/\s+/g, '');

export function checkSubmittals({ submittalRows, specRows = null, settings = {}, asOf }) {
  const defReview = num(settings.review_days) ?? 10; const resubmitDays = num(settings.resubmit_days) ?? 14; const loopRev = num(settings.loop_revision) ?? 2;
  const latest = new Map(); for (const s of submittalRows) { const base = str(s.submittal); if (!base) continue; const k = base.toUpperCase(); const rev = num(s.revision) ?? 0; const cur = latest.get(k); if (!cur || rev > (num(cur.revision) ?? 0)) latest.set(k, s); }
  const items = []; const sections = new Set();
  for (const s of latest.values()) {
    const f = []; const st = kind(s.status); const rev = num(s.revision) ?? 0; sections.add(secKey(s.spec_section));
    const need = isoDate(s.required_on_site); const lead = num(s.lead_time_days) ?? 0; const review = num(s.review_days) ?? defReview;
    const orderBy = need ? addDays(need, -lead) : null; const submitBy = orderBy ? addDays(orderBy, -review) : null;
    const sub = isoDate(s.submitted_date); const ret = isoDate(s.returned_date); const bic = str(s.ball_in_court);
    if (st === 'open' && submitBy && submitBy < asOf) f.push(finding('submit_late', null, `Not submitted yet; to have it on site by ${need} with ${lead} day(s) lead time and ${review} review day(s), it had to be submitted by ${submitBy}.`));
    if (st === 'in_review' && sub && daysBetween(sub, asOf) > review) f.push(finding('review_overdue', null, `With ${bic || 'the reviewer'} for ${daysBetween(sub, asOf)} days since ${sub}; ${review} review day(s) allowed.${orderBy ? ` Order-by date is ${orderBy}.` : ''}`));
    if (st === 'returned_bad' && ret && daysBetween(ret, asOf) > resubmitDays) f.push(finding('resubmit_overdue', null, `Returned "${str(s.status)}" on ${ret} and not resubmitted after ${daysBetween(ret, asOf)} days.`));
    if (st === 'approved' && ret && orderBy && ret > orderBy) f.push(finding('approved_too_late', null, `Approved ${ret}, after the order-by date ${orderBy}: with ${lead} day(s) lead time it cannot be on site by ${need}. Check the delivery date with ${str(s.vendor) || 'the supplier'}.`));
    if (rev >= loopRev && st !== 'approved') f.push(finding('resubmittal_loop', null, `Revision ${rev}: this is submission ${rev + 1}. Meet with the reviewer and ${str(s.vendor) || 'the subcontractor'} to settle the comments.`));
    const c = f.map((x) => x.code);
    const status = c.some((x) => ['submit_late', 'review_overdue', 'resubmit_overdue'].includes(x)) ? 'late' : f.length ? 'review' : st === 'approved' || st === 'closed' ? 'done' : 'in_progress';
    items.push({ key: str(s.submittal), submittal: str(s.submittal), revision: rev, spec_section: str(s.spec_section), title: str(s.title), vendor: str(s.vendor), state: st, ball_in_court: st === 'approved' || st === 'closed' ? '' : bic, days_in_court: (st === 'in_review' && sub) ? daysBetween(sub, asOf) : (st === 'returned_bad' && ret) ? daysBetween(ret, asOf) : null, required_on_site: need, order_by: orderBy, submit_by: submitBy, status, findings: orderFindings(f, ORDER) });
  }
  if (specRows) for (const sp of specRows) { const k = secKey(sp.spec_section); if (!k || sections.has(k)) continue; sections.add(k); items.push({ key: `section ${str(sp.spec_section)}`, submittal: '', revision: null, spec_section: str(sp.spec_section), title: str(sp.title), vendor: '', state: 'none', ball_in_court: '', days_in_court: null, required_on_site: null, order_by: null, submit_by: null, status: 'review', findings: [finding('no_submittal_for_section', null, `Spec section ${str(sp.spec_section)} ${str(sp.title)} has no submittal in the register.`)] }); }
  const rank = { late: 0, review: 1, in_progress: 2, done: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], [(i) => i.submit_by || i.order_by || '9999', 1], ['spec_section', 1], ['submittal', 1]);
  const byCourt = {}; for (const i of out.filter((x) => x.ball_in_court)) { const b = byCourt[i.ball_in_court] = byCourt[i.ball_in_court] || { open: 0, oldest_days: 0 }; b.open++; b.oldest_days = Math.max(b.oldest_days, i.days_in_court || 0); }
  const bySection = {}; for (const i of out) { const s = bySection[i.spec_section || '(none)'] = bySection[i.spec_section || '(none)'] || { submittals: 0, late: 0 }; if (i.submittal) s.submittals++; if (i.status === 'late') s.late++; }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    submittals: latest.size, sections_without_submittal: out.filter((i) => !i.submittal).length, late: count('late'), review: count('review'), in_progress: count('in_progress'), done: count('done'),
    as_of: asOf, settings_used: { review_days: defReview, resubmit_days: resubmitDays, loop_revision: loopRev }, by_ball_in_court: byCourt, by_spec_section: bySection, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.submittals} submittal(s) as of ${asOf}: ${r.late} late against the site dates (not submitted in time, reviews or resubmittals overdue), ${r.review} to review, ${r.in_progress} in progress, ${r.done} done. ${r.sections_without_submittal} spec section(s) with no submittal.`;
  return r;
}

/** Markdown body of a reminder to whoever holds the ball. */
export function reminderText(items, { party, to, from }) {
  const rows = items.filter((i) => i.status === 'late' || i.status === 'review');
  const L = [`# Submittals waiting on ${party}`, '', `**To:** ${to || `[TO CONFIRM contact at ${party}]`}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'These submittals are holding up material that is needed on site. Please act on them or tell us when you will.', '',
    '| Submittal | Spec section | Title | Needed on site | Order by | What is late |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.submittal} rev ${i.revision} | ${i.spec_section} | ${i.title} | ${i.required_on_site || ''} | ${i.order_by || ''} | ${i.findings.map((f) => f.detail).join(' ')} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
