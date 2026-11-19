// Fairbuild Permits: permits and inspections by job, and a calendar of what is coming. Pure functions, no I/O.
import { num, str, isoDate, daysBetween, statusOf, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PERMIT_FIELDS = Object.freeze({
  permit_number: t(['Permit Number', 'Permit', 'Permit No', 'Permit #'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  type: t(['Type', 'Permit Type', 'Trade', 'Discipline']),
  jurisdiction: t(['Jurisdiction', 'Authority', 'City', 'County', 'Issuing Authority', 'AHJ']),
  issued: t(['Issued', 'Issue Date', 'Issued Date', 'Date Issued'], { type: 'date' }),
  expires: t(['Expires', 'Expiration', 'Expiration Date', 'Expiry', 'Valid Until'], { type: 'date' }),
  status: t(['Status', 'Permit Status']),
});
export const INSPECTION_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  permit_number: t(['Permit Number', 'Permit', 'Permit No', 'Permit #']),
  inspection_type: t(['Inspection Type', 'Inspection', 'Type', 'Description'], { required: true }),
  scheduled_date: t(['Scheduled Date', 'Scheduled', 'Inspection Date', 'Date', 'Requested Date'], { type: 'date' }),
  result: t(['Result', 'Outcome', 'Status', 'Inspection Result']),
  completed_date: t(['Completed Date', 'Completed', 'Result Date', 'Inspected On'], { type: 'date' }),
});
export const PERMIT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    expiring_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A permit expiring within this many days is flagged (default 30)' },
    upcoming_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Inspections within this many days are listed as coming up (default 14)' },
    latest_per_job_and_type: { type: 'boolean', description: 'When the same job has several permits of the same type, only the one that expires last is checked for expiry; the others are treated as replaced by a renewal (default true)' },
    reminder_days: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 90 }, maxItems: 5, description: 'Calendar reminders, days before each event (default [7, 1])' },
  },
});
const ORDER = ['permit_expired', 'permit_missing', 'failed_no_reinspection', 'inspection_overdue', 'permit_expiring', 'inspection_upcoming'];
const resultOf = (v) => { const s = str(v).toLowerCase(); if (!s) return null; if (/^(pass|passed|approved|ok|ja|bestanden|conforme|aprobad|aprovad|approvat|合格|通过|합격)/.test(s)) return 'pass'; if (/(fail|reject|correction|not approved|nicht bestanden|non conforme|rechaz|reprov|respint|不合格|不通过|불합격)/.test(s)) return 'fail'; if (/partial|teil|parcial|parzial/.test(s)) return 'partial'; if (/cancel|void|annul|取消|취소/.test(s)) return 'cancelled'; return null; };

export function checkPermits({ permitRows, inspectionRows = [], settings = {}, asOf }) {
  const soonDays = num(settings.expiring_days) ?? 30; const upDays = num(settings.upcoming_days) ?? 14;
  const permits = new Map(); for (const p of permitRows) { const k = str(p.permit_number).toUpperCase(); if (k) permits.set(k, p); }
  const items = []; const events = [];
  // Renewals: many jurisdictions issue a new permit row when a permit is renewed. Per job and permit
  // type only the row that expires last is checked (found on NYC DOB public data, where older rows of
  // renewed permits were flagged as expired). A setting turns this off.
  const latestOnly = settings.latest_per_job_and_type !== false; const latest = new Map();
  const gk = (p) => `${jobKey(p.job)}|${str(p.type).toLowerCase()}|${str(p.jurisdiction).toLowerCase()}`;
  if (latestOnly) for (const p of permits.values()) { const e = isoDate(p.expires); if (str(p.job) && e && (!latest.has(gk(p)) || e > latest.get(gk(p)))) latest.set(gk(p), e); }
  for (const [k, p] of permits) {
    const f = []; const exp = isoDate(p.expires); const st = statusOf(p.status);
    // A permit that is finaled, withdrawn or aborted needs no renewal (found on City of Austin public data:
    // 736 finaled permits were flagged as expired). The core reads "final" as approved, so it is named here.
    const closed = st === 'closed' || st === 'void' || /^\s*(final(ed)?|withdrawn|aborted)\b/i.test(str(p.status)); // only a status that starts with the word: "Pending Final Inspection" is still open
    const superseded = latestOnly && exp && str(p.job) && latest.get(gk(p)) > exp;
    if (exp && !closed && !superseded) { const left = daysBetween(asOf, exp); if (left < 0) f.push(finding('permit_expired', null, `${str(p.type)} permit ${str(p.permit_number)} expired on ${exp} and is not closed out. Renew it or close it out with ${str(p.jurisdiction) || 'the jurisdiction'}.`)); else if (left <= soonDays) f.push(finding('permit_expiring', null, `${str(p.type)} permit ${str(p.permit_number)} expires on ${exp}, in ${left} day(s).`)); if (left >= 0) events.push({ date: exp, summary: `Permit ${str(p.permit_number)} expires (${str(p.type)}, job ${str(p.job)})`, description: `${str(p.jurisdiction)}`, categories: ['permit'] }); }
    items.push({ kind: 'permit', key: str(p.permit_number), job: str(p.job), permit_number: str(p.permit_number), type: str(p.type), jurisdiction: str(p.jurisdiction), date: exp, result: null, status: '', superseded: !!superseded, findings: orderFindings(f, ORDER) });
  }
  const insp = sortBy(inspectionRows.filter((i) => str(i.inspection_type)), [(i) => isoDate(i.scheduled_date) || '', 1], [(i) => str(i.inspection_type), 1]);
  for (const [n, i] of insp.entries()) {
    const f = []; const d = isoDate(i.scheduled_date); const res = resultOf(i.result); const pk = str(i.permit_number).toUpperCase();
    if (pk && !permits.has(pk)) f.push(finding('permit_missing', null, `Inspection "${str(i.inspection_type)}" is on permit ${str(i.permit_number)}, which is not in your permit log. Check the permit was pulled.`));
    if (res === 'fail' || res === 'partial') {
      const later = insp.slice(n + 1).some((x) => str(x.inspection_type).toLowerCase() === str(i.inspection_type).toLowerCase() && jobKey(x.job) === jobKey(i.job) && resultOf(x.result) !== 'cancelled');
      if (!later) f.push(finding('failed_no_reinspection', null, `${str(i.inspection_type)} on job ${str(i.job)} ${res === 'fail' ? 'failed' : 'partly passed'} on ${isoDate(i.completed_date) || d} and no re-inspection is booked.`));
    }
    if (!res && d) { const left = daysBetween(asOf, d); if (left < 0) f.push(finding('inspection_overdue', null, `${str(i.inspection_type)} was scheduled for ${d} and has no result ${-left} day(s) later. Record the result or rebook it.`)); else { events.push({ date: d, summary: `${str(i.inspection_type)} inspection, job ${str(i.job)}`, description: `Permit ${str(i.permit_number)}`, categories: ['inspection'] }); if (left <= upDays) f.push(finding('inspection_upcoming', null, `${str(i.inspection_type)} on ${d}, in ${left} day(s).`)); } }
    items.push({ kind: 'inspection', key: `${str(i.job)} ${str(i.inspection_type)} ${d || ''}`.trim(), job: str(i.job), permit_number: str(i.permit_number), type: str(i.inspection_type), jurisdiction: '', date: d, result: res, status: '', findings: orderFindings(f, ORDER) });
  }
  for (const it of items) { const c = it.findings.map((x) => x.code); it.status = c.some((x) => ['permit_expired', 'permit_missing', 'failed_no_reinspection', 'inspection_overdue'].includes(x)) ? 'action' : c.length ? 'soon' : 'ok'; }
  const rank = { action: 0, soon: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1], ['date', 1], ['key', 1]);
  const byJob = {}; for (const i of out) { const j = byJob[i.job || '(none)'] = byJob[i.job || '(none)'] || { permits: 0, inspections: 0, action: 0 }; if (i.kind === 'permit') j.permits++; else j.inspections++; if (i.status === 'action') j.action++; }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    permits: permits.size, inspections: insp.length, action: count('action'), soon: count('soon'), ok: count('ok'), as_of: asOf, calendar_events: events.length,
    settings_used: { expiring_days: soonDays, upcoming_days: upDays }, by_job: byJob, by_finding: byFinding(out), items: out,
    events: sortBy(events, ['date', 1], ['summary', 1]),
  };
  r.summary = `${r.permits} permit(s) and ${r.inspections} inspection(s) as of ${asOf}: ${r.action} need action (expired permits, failed inspections not rebooked, overdue results, unknown permits), ${r.soon} coming up. ${r.calendar_events} calendar event(s).`;
  return r;
}

/** Markdown body of a notice to one job's project manager. */
export function noticeText(items, { job, to, from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  const L = [`# Permits and inspections: job ${job}`, '', `**To:** ${to || '[TO CONFIRM project manager]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Please act on these before work continues on the affected scope:', '', '| Item | Date | What is needed |', '| --- | --- | --- |',
    ...rows.map((i) => `| ${i.kind === 'permit' ? `Permit ${i.permit_number} (${i.type})` : `${i.type} inspection`} | ${i.date || ''} | ${i.findings.map((f) => f.detail).join(' ')} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
