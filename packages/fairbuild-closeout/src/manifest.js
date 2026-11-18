import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, jobKey } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkCloseout, reminderText, CLOSEOUT_JOB_FIELDS, CHECKLIST_FIELDS, CLOSEOUT_REQUIREMENTS_SCHEMA } from './closeout.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/closeout';
const props = {
  jobs: { type: 'string', description: 'Jobs under --root (CSV, Excel or JSON) with their substantial completion date; jobs not yet complete are skipped' },
  checklist: { type: 'string', description: 'Closeout checklist: job, item, status, due date, received date' },
  requirements: { type: 'string', description: 'Your closeout requirements JSON (closeout_requirements schema): required items, grace_days, item_aliases' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the checklist is judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkCloseout({ jobRows: ctx.records(a.jobs, 'jobs'), checklistRows: ctx.records(a.checklist, 'checklist'), requirements: ctx.readJson(a.requirements, 'closeout_requirements'), asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'closeout', outDir: OUT, props, required: ['jobs', 'checklist', 'requirements'], run,
  check: { title: 'Check job closeout', description: 'Per completed job and required closeout item: on the checklist, received or complete, rejected, overdue, or still open long after completion. Per job: share done and whether it is ready for final billing.' },
  explain: { arg: 'job', argDoc: 'Job number from closeout_check, or "job item" for one item', key: (i) => [i.key, i.job], title: 'Explain one job or item',
    description: 'Show one closeout item with every finding.',
    describe: (i) => `${i.job} ${i.item}: ${i.status}. ${i.item_status ? `Checklist status ${i.item_status}. ` : ''}${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'closeout', title: 'Job closeout checklist', description: 'Write the closeout worklist',
    row: (i) => ({ job: i.job, item: i.item, item_status: i.item_status, due_date: i.due_date || '', received_date: i.received_date || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'item', 'item_status', 'due_date', 'received_date', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'item', 'item_status', 'due_date', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'completed', 'days_since', 'items', 'done', 'percent', 'ready_for_final_billing'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice', 'Your contract decides what closeout requires; Fairbuild Closeout checks the items you list against the checklist you keep.'] },
});
const pair = draftPair({
  prefix: 'closeout', noun: 'reminder', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/reminder-<job>.md: the closeout items still missing, rejected or overdue on one job, for its project manager. Marked DRAFT. Sending goes through closeout_request_send (one click).',
  required: ['jobs', 'checklist', 'requirements', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Project manager' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => jobKey(i.job) === jobKey(a.job));
    if (!items.length) throw new Error(`job "${a.job}" is not a completed job in the files`);
    const j = r.by_job[items[0].job]; const t = reminderText(items, { name: items[0].job, ...j }, a);
    if (!t.count) throw new Error(`job ${items[0].job} is fully closed out`);
    return { id: items[0].job, to: a.to || undefined, text: t.text, extra: { items: t.count } };
  },
});
const refused = refusedTools([
  { name: 'closeout_submit', category: 'binding_send', description: 'Fairbuild Closeout never submits a closeout package to an owner or architect.' },
  { name: 'invoice_create', category: 'binding_send', description: 'Fairbuild Closeout never creates a final invoice or retainage bill.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Closeout never sends the reminder; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-closeout', version: pkg.version,
  description: 'Checks the closeout checklist of completed jobs against the items you require (final lien waivers, warranties, O&M manuals, as-builts, punch list, occupancy, final pay application and others you name): items missing, rejected, overdue or open long after completion, and which jobs are ready for final billing. Drafts reminders. Submitting closeout and billing is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { closeout_requirements: CLOSEOUT_REQUIREMENTS_SCHEMA },
  sources: {
    jobs: { label: 'Jobs and completion dates', args: ['jobs'], fields: CLOSEOUT_JOB_FIELDS },
    checklist: { label: 'Closeout checklist', args: ['checklist'], fields: CHECKLIST_FIELDS },
  },
  prompts: [{
    name: 'closeout_review', title: 'Monthly closeout review',
    description: 'Walks the host model through job closeout with Fairbuild Closeout.',
    arguments: [{ name: 'jobs', description: 'Jobs', required: true }, { name: 'checklist', description: 'Closeout checklist', required: true }, { name: 'requirements', description: 'Requirements JSON', required: true }],
    text: `You are helping a construction project coordinator close out completed jobs with fairbuild-closeout. Jobs: {{jobs}}. Checklist: {{checklist}}. Requirements: {{requirements}}.

Rules: Fairbuild Closeout never submits closeout, bills or sends; closeout_submit, invoice_create and email_send are blocked.

1. Call closeout_check. Lead with jobs ready for final billing, then missing, rejected and overdue items per job.
2. Call closeout_explain for jobs or items the person asks about.
3. Call closeout_write_report and share the paths.
4. Offer closeout_draft_reminder per job; only when the person asks, call closeout_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Closeout allowlist.' }] },
});
