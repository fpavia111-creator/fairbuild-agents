// Fairbuild Timecards: field timecards against crew assignments, job status and budget cost codes. Pure functions, no I/O.
import { num, str, round2, isoDate, weekday, statusOf, jobKey, codeKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const TIMECARD_FIELDS = Object.freeze({
  worker: t(['Worker', 'Employee', 'Employee Name', 'Name'], { required: true }),
  worker_id: t(['Worker ID', 'Employee ID', 'Employee Number', 'Emp #']),
  date: t(['Date', 'Work Date', 'Day', 'Timecard Date'], { type: 'date' }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  cost_code: t(['Cost Code', 'Phase', 'Phase Code', 'Task']),
  hours: t(['Hours', 'Regular Hours', 'Total Hours', 'Hrs'], { type: 'number' }),
  overtime_hours: t(['Overtime Hours', 'OT Hours', 'Overtime'], { type: 'number' }),
});
export const ASSIGNMENT_FIELDS = Object.freeze({
  worker: t(['Worker', 'Employee', 'Employee Name', 'Name', 'Crew Member'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  start_date: t(['Start Date', 'Start', 'From', 'Assigned From'], { type: 'date' }),
  end_date: t(['End Date', 'End', 'To', 'Assigned To', 'Until'], { type: 'date' }),
});
export const JOB_STATUS_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  status: t(['Status', 'Job Status', 'Project Status']),
  completion_date: t(['Completion Date', 'Closed Date', 'Completed', 'Finish Date'], { type: 'date' }),
});
export const BUDGET_CODE_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  cost_code: t(['Cost Code', 'Phase', 'Phase Code', 'Budget Code'], { required: true }),
});
export const TIMECARD_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    max_daily_hours: { type: 'number', minimum: 1, maximum: 24, description: 'A worker-day with more hours than this across all jobs is flagged (default 14)' },
    flag_weekends: { type: 'boolean', description: 'Flag Saturday and Sunday hours for review (default true)' },
  },
});
const ORDER = ['closed_job', 'not_assigned', 'invalid_cost_code', 'duplicate_entry', 'long_day', 'weekend'];
const misallocation = new Set(['closed_job', 'not_assigned', 'invalid_cost_code']);

export function checkTimecards({ timecardRows, assignmentRows = null, jobRows = null, budgetRows = null, settings = {} }) {
  const maxDay = num(settings.max_daily_hours) ?? 14; const weekends = settings.flag_weekends !== false;
  const assign = new Map(); if (assignmentRows) for (const a of assignmentRows) { const w = str(a.worker).toLowerCase(); if (!w) continue; if (!assign.has(w)) assign.set(w, []); assign.get(w).push({ job: jobKey(a.job), from: isoDate(a.start_date), to: isoDate(a.end_date) }); }
  const jobs = new Map(); if (jobRows) for (const j of jobRows) { const s = statusOf(j.status); jobs.set(jobKey(j.job), { closed: s === 'closed' || s === 'void', done: isoDate(j.completion_date) }); }
  const codes = new Map(); if (budgetRows) for (const b of budgetRows) { const k = jobKey(b.job); if (!codes.has(k)) codes.set(k, new Set()); codes.get(k).add(codeKey(b.cost_code)); }
  const days = new Map();
  for (const r of timecardRows) {
    const w = str(r.worker); const d = isoDate(r.date); if (!w || !d) continue;
    const k = `${d}|${w.toLowerCase()}`; const day = days.get(k) || { worker: w, worker_id: str(r.worker_id), date: d, entries: new Map() };
    const ek = `${jobKey(r.job)}|${codeKey(r.cost_code)}|${num(r.hours) ?? 0}|${num(r.overtime_hours) ?? 0}`;
    const e = day.entries.get(ek) || { job: str(r.job), cost_code: str(r.cost_code), hours: num(r.hours) ?? 0, overtime_hours: num(r.overtime_hours) ?? 0, times: 0 };
    e.times++; day.entries.set(ek, e); days.set(k, day);
  }
  const items = [];
  for (const day of days.values()) {
    const f = []; let misHours = 0; const entries = sortBy([...day.entries.values()], ['job', 1], ['cost_code', 1], ['hours', 1]);
    for (const e of entries) {
      const total = round2(e.hours + e.overtime_hours); const where = `${e.job} ${e.cost_code}`.trim(); let mis = false;
      const j = jobs.get(jobKey(e.job));
      if (j && (j.closed || (j.done && day.date > j.done))) { f.push(finding('closed_job', total, `${total} hour(s) on ${where}, a job that is closed${j.done ? ` (completed ${j.done})` : ''}.`)); mis = true; }
      if (assignmentRows) { const a = (assign.get(day.worker.toLowerCase()) || []).some((x) => x.job === jobKey(e.job) && (!x.from || day.date >= x.from) && (!x.to || day.date <= x.to)); if (!a) { f.push(finding('not_assigned', total, `${day.worker} was not assigned to job ${e.job} on ${day.date}; ${total} hour(s) charged to it.`)); mis = true; } }
      if (budgetRows && e.cost_code && codes.has(jobKey(e.job)) && !codes.get(jobKey(e.job)).has(codeKey(e.cost_code))) { f.push(finding('invalid_cost_code', total, `Cost code ${e.cost_code} has no budget on job ${e.job}; ${total} hour(s) charged to it.`)); mis = true; }
      if (e.times > 1) f.push(finding('duplicate_entry', null, `${where} ${e.hours} hour(s) is entered ${e.times} times on ${day.date}; counted once.`));
      if (mis) misHours = round2(misHours + total);
    }
    const hours = round2(entries.reduce((a, e) => a + e.hours + e.overtime_hours, 0));
    if (hours > maxDay) f.push(finding('long_day', null, `${hours} hours on ${day.date} across ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}, more than ${maxDay}. Check for a typing error or a missing split.`));
    if (weekends && weekday(day.date) >= 5) f.push(finding('weekend', null, `${hours} hour(s) on a ${weekday(day.date) === 5 ? 'Saturday' : 'Sunday'} (${day.date}). Confirm the work was authorised.`));
    const c = f.map((x) => x.code);
    const status = c.some((x) => misallocation.has(x)) ? 'misallocated' : f.length ? 'review' : 'ok';
    items.push({ key: `${day.date} ${day.worker}`, date: day.date, worker: day.worker, worker_id: day.worker_id, entries: entries.map((e) => `${e.job} ${e.cost_code} ${round2(e.hours + e.overtime_hours)}h`.replace(/\s+/g, ' ')), jobs: [...new Set(entries.map((e) => e.job))], hours, misallocated_hours: misHours, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { misallocated: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['date', 1], ['worker', 1]);
  const byWorker = {}; for (const i of out) { const w = byWorker[i.worker] = byWorker[i.worker] || { days: 0, hours: 0, misallocated_hours: 0, flagged_days: 0 }; w.days++; w.hours = round2(w.hours + i.hours); w.misallocated_hours = round2(w.misallocated_hours + i.misallocated_hours); if (i.status !== 'ok') w.flagged_days++; }
  const byJob = {}; for (const d of days.values()) for (const e of d.entries.values()) { const j = byJob[e.job || '(none)'] = byJob[e.job || '(none)'] || { hours: 0 }; j.hours = round2(j.hours + e.hours + e.overtime_hours); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    worker_days: out.length, workers: Object.keys(byWorker).length, hours: round2(out.reduce((a, i) => a + i.hours, 0)), misallocated_hours: round2(out.reduce((a, i) => a + i.misallocated_hours, 0)),
    misallocated: count('misallocated'), review: count('review'), ok: count('ok'), settings_used: { max_daily_hours: maxDay, flag_weekends: weekends },
    by_worker: byWorker, by_job: byJob, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.worker_days} worker-day(s) for ${r.workers} worker(s), ${r.hours} hour(s): ${r.misallocated} with hours on the wrong job, a closed job or an unbudgeted code (${r.misallocated_hours} hour(s)), ${r.review} to review.`;
  return r;
}

/** Markdown body of a recode request to payroll or the project manager. */
export function recodeText(r, { to, from, label }) {
  const rows = r.items.filter((i) => i.status !== 'ok');
  const L = [`# Timecard recode request${label ? `: ${label}` : ''}`, '', `**To:** ${to || '[TO CONFIRM payroll or project manager]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Please confirm the right job and cost code for these entries before payroll closes, and correct them in the timekeeping system.', '',
    '| Date | Worker | Entries | Problem | Correct job and code |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.date} | ${i.worker} | ${i.entries.join('; ')} | ${i.findings.map((f) => f.detail).join(' ')} | [TO CONFIRM] |`), ''];
  return L.join('\n');
}
