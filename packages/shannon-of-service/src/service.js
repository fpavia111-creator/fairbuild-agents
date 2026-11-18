// Shannon: service tickets and technician utilisation. Pure functions, no I/O.
//
// Utilisation = timesheet hours on codes that count as working on a job / all paid hours.
// Recall rate = recall tickets / completed tickets, per technician.
import { num, str, round2, pct, isoDate, statusOf, readYesNo, exportProfile, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const TICKET_FIELDS = Object.freeze({
  ticket: t(['Ticket', 'Job #', 'Job Number', 'Work Order', 'Ticket Number', 'Call Number'], { required: true }),
  technician: t(['Technician', 'Tech', 'Assigned Technician', 'Primary Technician']),
  date: t(['Date', 'Completed Date', 'Completion Date', 'Scheduled Date'], { type: 'date' }),
  business_unit: t(['Business Unit', 'Department', 'Division']),
  job_type: t(['Job Type', 'Type', 'Call Type']),
  status: t(['Status', 'Job Status']),
  invoice_total: t(['Invoice Total', 'Total', 'Jobs Total', 'Revenue', 'Amount'], { type: 'money' }),
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice #']),
  recall_of: t(['Recall Of', 'Recall For', 'Original Job', 'Callback Of']),
  is_recall: t(['Recall', 'Is Recall', 'Callback'], { type: 'bool' }),
  warranty: t(['Warranty', 'Is Warranty', 'Warranty Job'], { type: 'bool' }),
});
export const TIMESHEET_FIELDS = Object.freeze({
  technician: t(['Technician', 'Tech', 'Employee'], { required: true }),
  date: t(['Date', 'Work Date'], { type: 'date' }),
  code: t(['Code', 'Timesheet Code', 'Activity', 'Time Type']),
  hours: t(['Hours', 'Duration', 'Paid Hours'], { type: 'number' }),
});
export const TICKET_PROFILES = Object.freeze([exportProfile('servicetitan_jobs', { ticket: 'Job #', technician: ['Technician', 'Primary Technician'], business_unit: 'Business Unit', job_type: 'Job Type', status: 'Status', date: ['Completed Date', 'Completion Date'], invoice_total: ['Jobs Total', 'Total'], invoice_number: 'Invoice #', recall_of: 'Recall For', warranty: 'Warranty' })]);
export const TIMESHEET_PROFILES = Object.freeze([exportProfile('servicetitan_timesheets', { technician: 'Technician', date: 'Date', code: 'Timesheet Code', hours: 'Hours' })]);
export const SERVICE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    working_codes: { type: 'array', items: { type: 'string', maxLength: 40 }, description: 'Timesheet codes that count as working on a job (default ["working", "on job", "job"])' },
    utilisation_target: { type: 'number', minimum: 0, maximum: 100, description: 'Utilisation below this percent is flagged (default 60)' },
    recall_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Recall rate above this percent is flagged (default 10)' },
  },
});
const ORDER = ['completed_not_invoiced', 'zero_invoice', 'low_utilisation', 'high_recall_rate'];

export function checkService({ ticketRows, timesheetRows = null, settings = {} }) {
  const working = (settings.working_codes || ['working', 'on job', 'job']).map((w) => w.toLowerCase()); const target = num(settings.utilisation_target) ?? 60; const recallMax = num(settings.recall_pct) ?? 10;
  const techs = new Map(); const tech = (name) => { const k = str(name).toLowerCase() || '(none)'; if (!techs.has(k)) techs.set(k, { technician: str(name) || '(none)', completed: 0, recalls: 0, revenue: 0, paid: 0, working: 0, unbilled: 0 }); return techs.get(k); };
  const items = [];
  for (const r of sortBy(ticketRows.filter((x) => str(x.ticket)), [(x) => isoDate(x.date) || '', 1], [(x) => str(x.ticket), 1])) {
    const st = statusOf(r.status); if (st === 'void' || /cancel/i.test(str(r.status))) continue;
    const done = st === 'closed' || /complet/i.test(str(r.status)); const total = num(r.invoice_total) ?? 0; const recall = !!str(r.recall_of) || readYesNo(r.is_recall) === true || /recall|callback/i.test(str(r.job_type)); const warranty = readYesNo(r.warranty) === true;
    const tc = tech(r.technician); if (done) { tc.completed++; tc.revenue = round2(tc.revenue + total); if (recall) tc.recalls++; }
    const f = [];
    if (done && !str(r.invoice_number) && total > 0) { f.push(finding('completed_not_invoiced', total, `Completed ${isoDate(r.date)} for ${total} with no invoice number.`)); tc.unbilled = round2(tc.unbilled + total); }
    if (done && total === 0 && !recall && !warranty) f.push(finding('zero_invoice', null, `Completed ${isoDate(r.date)} with a zero total and not marked recall or warranty. Was the work billed?`));
    if (f.length) items.push({ kind: 'ticket', key: str(r.ticket), technician: tc.technician, business_unit: str(r.business_unit), job_type: str(r.job_type), date: isoDate(r.date), revenue: total, utilisation_pct: null, recall_rate_pct: null, status: 'unbilled', findings: orderFindings(f, ORDER) });
  }
  if (timesheetRows) for (const r of timesheetRows) { const tc = tech(r.technician); const h = num(r.hours) || 0; tc.paid = round2(tc.paid + h); if (working.includes(str(r.code).toLowerCase())) tc.working = round2(tc.working + h); }
  for (const tc of techs.values()) {
    const f = []; const util = timesheetRows && tc.paid ? pct(tc.working, tc.paid) : null; const rr = tc.completed ? pct(tc.recalls, tc.completed) : null;
    if (util !== null && util < target) f.push(finding('low_utilisation', null, `${tc.working} working hour(s) of ${tc.paid} paid: ${util}% utilisation, below ${target}%.`));
    if (rr !== null && rr > recallMax) f.push(finding('high_recall_rate', null, `${tc.recalls} recall(s) on ${tc.completed} completed ticket(s): ${rr}%, above ${recallMax}%.`));
    items.push({ kind: 'technician', key: tc.technician, technician: tc.technician, business_unit: '', job_type: '', date: null, revenue: tc.revenue, completed: tc.completed, paid_hours: tc.paid, working_hours: tc.working, utilisation_pct: util, revenue_per_paid_hour: tc.paid ? round2(tc.revenue / tc.paid) : null, recall_rate_pct: rr, status: f.length ? 'review' : 'ok', findings: orderFindings(f, ORDER) });
  }
  const rank = { unbilled: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['kind', -1], ['key', 1]);
  const all = [...techs.values()]; const paid = round2(all.reduce((a, x) => a + x.paid, 0)); const work = round2(all.reduce((a, x) => a + x.working, 0));
  const byTech = {}; for (const i of out.filter((x) => x.kind === 'technician')) byTech[i.technician] = { completed: i.completed, revenue: i.revenue, paid_hours: i.paid_hours, utilisation_pct: i.utilisation_pct, revenue_per_paid_hour: i.revenue_per_paid_hour, recall_rate_pct: i.recall_rate_pct };
  const r = {
    technicians: all.length, completed: all.reduce((a, x) => a + x.completed, 0), revenue: round2(all.reduce((a, x) => a + x.revenue, 0)), unbilled: round2(all.reduce((a, x) => a + x.unbilled, 0)),
    tickets_flagged: out.filter((i) => i.kind === 'ticket').length, utilisation_pct: timesheetRows && paid ? pct(work, paid) : null, technicians_flagged: out.filter((i) => i.kind === 'technician' && i.status !== 'ok').length,
    settings_used: { utilisation_target: target, recall_pct: recallMax, working_codes: working }, by_technician: byTech, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.completed} completed ticket(s) by ${r.technicians} technician(s), ${r.revenue} invoiced or due: ${r.tickets_flagged} ticket(s) not billed or billed at zero (${r.unbilled} unbilled). Utilisation ${r.utilisation_pct ?? 'n/a'}%; ${r.technicians_flagged} technician(s) below target or with a high recall rate.`;
  return r;
}

/** Markdown body of a billing follow-up to the office. */
export function followupText(r, { to, from }) {
  const rows = r.items.filter((i) => i.kind === 'ticket');
  const L = ['# Service billing follow-up', '', `**To:** ${to || '[TO CONFIRM billing office]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Please invoice or explain the tickets below.', '', '| Ticket | Technician | Date | Total | Problem |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.key} | ${i.technician} | ${i.date} | ${i.revenue} | ${i.findings.map((f) => f.detail).join(' ')} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
