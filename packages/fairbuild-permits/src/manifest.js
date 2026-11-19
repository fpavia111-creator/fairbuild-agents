import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, jobKey, toIcs, filesHash } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { checkPermits, noticeText, PERMIT_FIELDS, INSPECTION_FIELDS, PERMIT_SETTINGS_SCHEMA } from './permits.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/permits';
const props = {
  permits: { type: 'string', description: 'Permit log under --root (CSV, Excel or JSON): permit number, job, type, jurisdiction, issued, expires, status' },
  inspections: { type: 'string', description: 'Optional inspection log: job, permit, inspection type, scheduled date, result, completed date. Procore inspection exports are recognised by their columns' },
  settings: { type: 'string', description: 'Optional settings JSON (permit_settings schema): expiring_days, upcoming_days, reminder_days, latest_per_job_and_type' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the log is judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkPermits({ permitRows: ctx.records(a.permits, 'permits'), inspectionRows: a.inspections ? ctx.records(a.inspections, 'inspections') : [], settings: a.settings ? ctx.readJson(a.settings, 'permit_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'permits', outDir: OUT, props, required: ['permits'], run,
  check: { title: 'Check permits and inspections', description: 'Per permit: expired or expiring. Per inspection: failed with no re-inspection booked, past its date with no result, on a permit not in your log, or coming up. Lists calendar events for permit expirations and booked inspections.' },
  explain: { arg: 'item', argDoc: 'Permit number, or an inspection as "job type date", from permits_check', key: (i) => [i.key, i.permit_number], title: 'Explain one permit or inspection',
    description: 'Show one permit or inspection with every finding.',
    describe: (i) => `${i.kind} ${i.key} (job ${i.job}): ${i.status}. ${i.date ? `Date ${i.date}. ` : ''}${i.result ? `Result ${i.result}. ` : ''}${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'permits', title: (r) => `Permits and inspections as of ${r.as_of}`, description: 'Write the permit and inspection worklist',
    row: (i) => ({ kind: i.kind, job: i.job, permit_number: i.permit_number, type: i.type, jurisdiction: i.jurisdiction, date: i.date || '', result: i.result || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['kind', 'job', 'permit_number', 'type', 'jurisdiction', 'date', 'result', 'status', 'findings', 'reasons'],
    htmlColumns: ['kind', 'job', 'permit_number', 'type', 'date', 'result', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Calendar', rows: r.events.map((e) => ({ date: e.date, event: e.summary })), columns: ['date', 'event'] },
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'permits', 'inspections', 'action'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice', 'Fairbuild Permits reads your permit and inspection logs. It does not check a jurisdiction\'s portal; a permit can expire on other rules (no inspection in a set time) that only the jurisdiction knows.', 'When a job has several permits of the same type, only the one that expires last is checked and the others count as replaced by a renewal; set latest_per_job_and_type to false if a job really holds several permits of one type.'] },
});
const calendar = {
  name: 'permits_write_calendar', kind: 'report', title: 'Write the permit and inspection calendar',
  description: 'Write permits-calendar.ics into out_dir (default fairbuild-out/permits): one all-day event per permit expiration and per booked inspection without a result, with reminders. Import it into any calendar app; nothing is sent.',
  inputSchema: { type: 'object', additionalProperties: false, required: ['permits'], properties: { ...props, out_dir: { type: 'string', description: 'Folder under --root for the file (default fairbuild-out/permits).' } } },
  handler: async (a, ctx) => {
    const r = run(a, ctx); const s = a.settings ? ctx.readJson(a.settings, 'permit_settings') : {};
    const reminders = s.reminder_days || [7, 1];
    const f = ctx.writeFile(ctx.outDir(a.out_dir || OUT), 'permits-calendar.ics', toIcs(r.events.map((e) => ({ ...e, reminders })), { calName: 'Permits and inspections' }));
    return { summary: `Calendar written with ${r.events.length} event(s). Nothing was sent.`, events: r.events.length, files: [relative(ctx.root, f).split('\\').join('/')], output_sha256: filesHash([f]) };
  },
};
const pair = draftPair({
  prefix: 'permits', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<job>.md: a notice to one job\'s project manager listing permits to renew or close and inspections to rebook or record. Marked DRAFT. Sending goes through permits_request_send (one click).',
  required: ['permits', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Project manager' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => jobKey(i.job) === jobKey(a.job));
    if (!items.length) throw new Error(`job "${a.job}" has no permits or inspections in the logs`);
    const t = noticeText(items, { ...a, job: items[0].job });
    if (!t.count) throw new Error(`nothing to raise on job ${items[0].job}`);
    return { id: items[0].job, to: a.to || undefined, text: t.text, extra: { items: t.count } };
  },
});
const refused = refusedTools([
  { name: 'permit_portal_submit', category: 'binding_send', description: 'Fairbuild Permits never applies for, renews or closes a permit with a jurisdiction.' },
  { name: 'inspection_schedule', category: 'binding_send', description: 'Fairbuild Permits never books or cancels an inspection.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Permits never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-permits', version: pkg.version,
  description: 'Keeps permits and inspections by job in view: permits expired or expiring, failed inspections with no re-inspection booked, inspections past their date with no result, inspections on permits you have no record of, and what is coming up. Writes a calendar file and drafts notices to the project manager. Dealing with the jurisdiction is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { permit_settings: PERMIT_SETTINGS_SCHEMA },
  sources: {
    permits: { label: 'Permit log', args: ['permits'], fields: PERMIT_FIELDS },
    inspections: { label: 'Inspection log', args: ['inspections'], fields: INSPECTION_FIELDS },
  },
  prompts: [{
    name: 'permit_review', title: 'Weekly permit and inspection review',
    description: 'Walks the host model through the permit and inspection review with Fairbuild Permits.',
    arguments: [{ name: 'permits', description: 'Permit log', required: true }, { name: 'inspections', description: 'Inspection log (optional)', required: false }],
    text: `You are helping a project coordinator keep permits and inspections in order with fairbuild-permits. Permits: {{permits}}. Inspections: {{inspections}}.

Rules: Fairbuild Permits never deals with a jurisdiction or sends; permit_portal_submit, inspection_schedule and email_send are blocked.

1. Call permits_check. Lead with expired permits, failed inspections not rebooked and overdue results, then what is coming up.
2. Call permits_explain for anything the person asks about.
3. Call permits_write_report and permits_write_calendar and share the paths.
4. Offer permits_draft_notice per job; only when the person asks, call permits_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, calendar, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, { tool: 'permits_write_calendar', decision: 'allow' }, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Permits allowlist.' }] },
});
