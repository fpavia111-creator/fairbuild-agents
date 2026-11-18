import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, exportProfile } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkTimecards, recodeText, TIMECARD_FIELDS, ASSIGNMENT_FIELDS, JOB_STATUS_FIELDS, BUDGET_CODE_FIELDS, TIMECARD_SETTINGS_SCHEMA } from './timecards.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/timecards';
const TIMECARD_PROFILES = [exportProfile('sage300_timecards', { worker: 'Employee', worker_id: ['Employee ID', 'Emp #'], date: ['Date', 'Work Date'], job: 'Job', cost_code: 'Cost Code', hours: 'Regular Hours', overtime_hours: 'Overtime Hours' })];
const props = {
  timecards: { type: 'string', description: 'Timecard entries under --root (CSV, Excel or JSON): worker, date, job, cost code, hours, overtime hours. Sage 300 timecard entry exports are recognised' },
  assignments: { type: 'string', description: 'Optional crew assignments: worker, job, from and to dates' },
  jobs: { type: 'string', description: 'Optional job list with status and completion date, to catch hours on closed jobs' },
  budget: { type: 'string', description: 'Optional budget (job and cost code) to catch hours on codes with no budget' },
  settings: { type: 'string', description: 'Optional settings JSON (timecard_settings schema): max_daily_hours, flag_weekends' },
};
const run = (a, ctx) => checkTimecards({ timecardRows: ctx.records(a.timecards, 'timecards'), assignmentRows: a.assignments ? ctx.records(a.assignments, 'assignments') : null, jobRows: a.jobs ? ctx.records(a.jobs, 'jobs') : null, budgetRows: a.budget ? ctx.records(a.budget, 'budget') : null, settings: a.settings ? ctx.readJson(a.settings, 'timecard_settings') : {} });
const std = standardTools({
  prefix: 'timecards', outDir: OUT, props, required: ['timecards'], run,
  check: { title: 'Check timecards against assignments', description: 'Per worker and day: hours on a job the worker was not assigned to that day, on a closed job, or on a cost code with no budget on the job; days over your limit; weekend hours; entries made twice. Worker names are masked in what the model sees.' },
  explain: { arg: 'worker_day', argDoc: 'Worker-day from timecards_check, as "date worker" (the worker as shown, which may be a pseudonym)', key: (i) => [i.key, i.worker], personal: 'name', title: 'Explain one worker-day',
    description: 'Show one worker-day\'s entries and every finding.',
    describe: (i) => `${i.worker} on ${i.date}: ${i.status}. ${i.hours} hour(s): ${i.entries.join('; ')}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'timecards', title: 'Timecards against job assignments', description: 'Write the timecard worklist',
    row: (i) => ({ date: i.date, worker: i.worker, worker_id: i.worker_id, entries: i.entries.join('; '), hours: i.hours, misallocated_hours: i.misallocated_hours, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['date', 'worker', 'worker_id', 'entries', 'hours', 'misallocated_hours', 'status', 'findings', 'reasons'],
    htmlColumns: ['date', 'worker', 'entries', 'hours', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By worker', rows: Object.entries(r.by_worker).map(([worker, v]) => ({ worker, ...v })), columns: ['worker', 'days', 'hours', 'misallocated_hours', 'flagged_days'] },
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'hours'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'personal', 'Fairbuild Timecards compares entries with the assignments you supply. It does not know whether a worker was sent to another job for the day; the foreman does.'] },
});
const pair = draftPair({
  prefix: 'timecards', noun: 'recode', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person in payroll',
  description: 'Write drafts/recode-<label>.md: the timecard entries to recode before payroll closes, with [TO CONFIRM] for the right job and code. Marked DRAFT; it holds real names. Sending goes through timecards_request_send (one click).',
  required: ['timecards', 'label'],
  args: { ...props, label: { type: 'string', maxLength: 80, description: 'Name for the request, for example "week ending 2026-11-14"' }, to: { type: 'string', maxLength: 200, description: 'Payroll or project manager' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => { const r = run(a, ctx); if (!r.items.some((i) => i.status !== 'ok')) throw new Error('nothing to recode: every entry checks out'); return { id: a.label, to: a.to || undefined, text: recodeText(r, a) }; },
});
const refused = refusedTools([
  { name: 'timecard_edit', category: 'production_deploy', description: 'Fairbuild Timecards never edits, approves or deletes a timecard.' },
  { name: 'payroll_run', category: 'move_money', description: 'Fairbuild Timecards never runs payroll.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Timecards never sends the request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-timecards', version: pkg.version,
  description: 'Checks field timecards against crew assignments, job status and the cost codes in each job budget: hours on a job the worker was not assigned to that day, on a closed job or on an unbudgeted code, days over your limit, weekend hours and entries made twice. Worker names are masked in what the model sees. Drafts recode requests; editing timecards is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { timecard_settings: TIMECARD_SETTINGS_SCHEMA },
  sources: {
    timecards: { label: 'Timecard entries', args: ['timecards'], fields: TIMECARD_FIELDS, profiles: TIMECARD_PROFILES },
    assignments: { label: 'Crew assignments', args: ['assignments'], fields: ASSIGNMENT_FIELDS },
    jobs: { label: 'Job status', args: ['jobs'], fields: JOB_STATUS_FIELDS },
    budget: { label: 'Budget cost codes', args: ['budget'], fields: BUDGET_CODE_FIELDS },
  },
  prompts: [{
    name: 'timecard_review', title: 'Weekly timecard review before payroll',
    description: 'Walks the host model through the timecard review with Fairbuild Timecards.',
    arguments: [{ name: 'timecards', description: 'Timecard entries', required: true }, { name: 'assignments', description: 'Crew assignments (optional)', required: false }],
    text: `You are helping a payroll lead or project accountant review timecards with fairbuild-timecards. Timecards: {{timecards}}. Assignments: {{assignments}}.

Rules: Fairbuild Timecards never edits timecards or runs payroll; timecard_edit, payroll_run and email_send are blocked. Worker names reach you as pseudonyms: use them as given.

1. Call timecards_check. Lead with hours on closed jobs, unassigned jobs and unbudgeted codes, then long days, duplicates and weekend hours.
2. Call timecards_explain for worker-days the person asks about.
3. Call timecards_write_report and share the paths (the files hold real names).
4. Offer timecards_draft_recode; only when the person asks, call timecards_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Timecards allowlist.' }] },
});
