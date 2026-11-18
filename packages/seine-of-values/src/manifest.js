import { defineManifest, MODEL_PIN, SOV_FIELDS, JOB_FIELDS, CHANGE_ORDER_FIELDS, CHANGE_ORDER_PROFILES, standardTools, draftPair, refusedTools, jobKey } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkValues, memoText, SOV_SETTINGS_SCHEMA } from './values.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/seine';
const props = {
  sov: { type: 'string', description: 'Schedule of values with billing to date under --root (CSV, Excel or JSON): job, item, description, scheduled value, completed and stored to date (or previous + this period + stored), and the field percent complete from the project manager' },
  jobs: { type: 'string', description: 'Optional job list with the revised contract amount, to check the schedule of values adds up to the contract' },
  change_orders: { type: 'string', description: 'Optional change order log; approved change orders must have a line on the schedule of values (matched by change order number in the description)' },
  settings: { type: 'string', description: 'Optional settings JSON (sov_settings schema): ahead_pts, behind_pts, tolerance' },
};
const run = (a, ctx) => checkValues({ sovRows: ctx.records(a.sov, 'sov'), jobRows: a.jobs ? ctx.records(a.jobs, 'jobs') : null, changeOrderRows: a.change_orders ? ctx.records(a.change_orders, 'change_orders') : null, settings: a.settings ? ctx.readJson(a.settings, 'sov_settings') : {} });
const std = standardTools({
  prefix: 'seine', outDir: OUT, props, required: ['sov'], run,
  check: { title: 'Compare the schedule of values with billings and the field', description: 'Per line: percent billed against field percent complete (billed ahead or behind beyond your thresholds, with the amount), billing on zero-value lines, items entered twice. Per job: schedule of values against the revised contract, and approved change orders that have no line.' },
  explain: { arg: 'line', argDoc: 'Line from seine_check as "job item" (for example "24-101 4"), or "job JOB" for the job-level checks', key: (i) => i.key, title: 'Explain one line',
    description: 'Show one line\'s scheduled value, billing, field percent and every finding.',
    describe: (i) => `${i.key} ${i.description}: ${i.status}. Scheduled ${i.scheduled_value}, billed ${i.billed} (${i.billed_percent ?? '?'}%), field ${i.field_percent ?? '?'}%. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'seine-sov', title: 'Schedule of values against billings', description: 'Write the schedule of values worklist',
    row: (i) => ({ job: i.job, item: i.item, description: i.description, scheduled_value: i.scheduled_value, billed: i.billed, billed_percent: i.billed_percent ?? '', field_percent: i.field_percent ?? '', earned: i.earned ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'item', 'description', 'scheduled_value', 'billed', 'billed_percent', 'field_percent', 'earned', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'item', 'description', 'scheduled_value', 'billed', 'billed_percent', 'field_percent', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'lines', 'scheduled', 'billed', 'earned', 'billed_ahead', 'billed_behind', 'net_over_under'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Field percent complete is the project manager\'s estimate as given in the file; Seine does not measure progress.'] },
});
const pair = draftPair({
  prefix: 'seine', noun: 'memo', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/memo-<job>.md: the lines of one job billed ahead or behind the field, for the project manager to confirm before the next pay application. Marked DRAFT. Sending goes through seine_request_send (one click).',
  required: ['sov', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Project manager' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => jobKey(i.job) === jobKey(a.job));
    if (!items.length) throw new Error(`job "${a.job}" is not in the schedule of values; jobs: ${Object.keys(r.by_job).join(', ')}`);
    const m = memoText(items, { ...a, job: items[0].job });
    if (!m.count) throw new Error(`nothing to confirm on job ${items[0].job}: every line is in step with the field`);
    return { id: items[0].job, to: a.to || undefined, text: m.text, extra: { lines: m.count } };
  },
});
const refused = refusedTools([
  { name: 'billing_update', category: 'production_deploy', description: 'Seine never changes a billing, a schedule of values or a pay application.' },
  { name: 'payapp_submit', category: 'binding_send', description: 'Seine never submits a pay application.' },
  { name: 'email_send', category: 'binding_send', description: 'Seine never sends the memo; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'seine-of-values', version: pkg.version,
  description: 'Compares the schedule of values line by line with billing to date and the field percent complete: lines billed ahead of progress, lines billed behind it, a schedule of values that does not add up to the contract, approved change orders with no line, billing on zero-value lines and items entered twice. Drafts the project manager memo. Changing a billing is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { sov_settings: SOV_SETTINGS_SCHEMA },
  sources: {
    sov: { label: 'Schedule of values with billing', args: ['sov'], fields: SOV_FIELDS },
    jobs: { label: 'Jobs and contract amounts', args: ['jobs'], fields: JOB_FIELDS },
    change_orders: { label: 'Change order log', args: ['change_orders'], fields: CHANGE_ORDER_FIELDS, profiles: CHANGE_ORDER_PROFILES },
  },
  prompts: [{
    name: 'sov_review', title: 'Schedule of values review before billing',
    description: 'Walks the host model through the schedule of values review with Seine.',
    arguments: [{ name: 'sov', description: 'Schedule of values with billing', required: true }],
    text: `You are helping a project accountant compare the schedule of values with billing and field progress using seine-of-values. File: {{sov}}.

Rules: Seine never changes a billing or sends anything; billing_update, payapp_submit and email_send are blocked. Field percent is the PM's estimate.

1. Call seine_check. Lead with lines billed ahead of the field, then lines billed behind it, then job-level problems.
2. Call seine_explain for lines the person asks about.
3. Call seine_write_report and share the paths.
4. Offer seine_draft_memo per job; only when the person asks, call seine_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Seine allowlist.' }] },
});
