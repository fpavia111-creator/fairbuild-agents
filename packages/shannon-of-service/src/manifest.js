import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkService, followupText, TICKET_FIELDS, TIMESHEET_FIELDS, TICKET_PROFILES, TIMESHEET_PROFILES, SERVICE_SETTINGS_SCHEMA } from './service.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/shannon';
const props = {
  tickets: { type: 'string', description: 'Service tickets under --root (CSV, Excel or JSON): ticket, technician, date, business unit, job type, status, invoice total, invoice number, recall of, warranty. ServiceTitan job report exports are recognised' },
  timesheets: { type: 'string', description: 'Optional technician timesheets: technician, date, timesheet code, hours. ServiceTitan timesheet exports are recognised' },
  settings: { type: 'string', description: 'Optional settings JSON (service_settings schema): working_codes, utilisation_target, recall_pct' },
};
const run = (a, ctx) => checkService({ ticketRows: ctx.records(a.tickets, 'tickets'), timesheetRows: a.timesheets ? ctx.records(a.timesheets, 'timesheets') : null, settings: a.settings ? ctx.readJson(a.settings, 'service_settings') : {} });
const std = standardTools({
  prefix: 'shannon', outDir: OUT, props, required: ['tickets'], run,
  check: { title: 'Check service tickets and technician utilisation', description: 'Per ticket: completed with no invoice, or completed at zero and not marked recall or warranty. Per technician: utilisation (working hours over paid hours), revenue per paid hour and recall rate against your targets. Technician names are masked in what the model sees.' },
  explain: { arg: 'key', argDoc: 'Ticket number, or a technician as shown by shannon_check (a pseudonym)', key: (i) => i.key, personal: 'name', title: 'Explain one ticket or technician',
    description: 'Show one ticket or technician with every finding.',
    describe: (i) => i.kind === 'ticket' ? `Ticket ${i.key} (${i.technician}, ${i.job_type}) ${i.date}: ${i.status}, ${i.revenue}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() : `${i.technician}: ${i.status}. ${i.completed} completed, ${i.revenue} revenue, ${i.paid_hours} paid hour(s), utilisation ${i.utilisation_pct ?? 'n/a'}%, recall rate ${i.recall_rate_pct ?? 'n/a'}%. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'shannon-service', title: 'Service tickets and technician utilisation', description: 'Write the service worklist',
    row: (i) => ({ kind: i.kind, key: i.key, technician: i.technician, date: i.date || '', revenue: i.revenue, utilisation_pct: i.utilisation_pct ?? '', recall_rate_pct: i.recall_rate_pct ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['kind', 'key', 'technician', 'date', 'revenue', 'utilisation_pct', 'recall_rate_pct', 'status', 'findings', 'reasons'],
    htmlColumns: ['kind', 'key', 'technician', 'revenue', 'utilisation_pct', 'recall_rate_pct', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By technician', rows: Object.entries(r.by_technician).map(([technician, v]) => ({ technician, ...v })), columns: ['technician', 'completed', 'revenue', 'paid_hours', 'utilisation_pct', 'revenue_per_paid_hour', 'recall_rate_pct'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'personal', 'Utilisation depends on which timesheet codes you count as working; the codes used are listed in the result.'] },
});
const pair = draftPair({
  prefix: 'shannon', noun: 'followup', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person in the office',
  description: 'Write drafts/followup-<label>.md: the tickets to invoice or explain, for the billing office. Marked DRAFT; it holds real technician names. Sending goes through shannon_request_send (one click).',
  required: ['tickets', 'label'],
  args: { ...props, label: { type: 'string', maxLength: 80, description: 'Name for the follow-up, for example "week of 2026-11-09"' }, to: { type: 'string', maxLength: 200, description: 'Billing office' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => { const r = run(a, ctx); const t = followupText(r, a); if (!t.count) throw new Error('every completed ticket is invoiced'); return { id: a.label, to: a.to || undefined, text: t.text, amount: r.unbilled }; },
});
const refused = refusedTools([
  { name: 'invoice_create', category: 'binding_send', description: 'Shannon never creates or sends a customer invoice.' },
  { name: 'payroll_run', category: 'move_money', description: 'Shannon never runs payroll or changes technician pay.' },
  { name: 'email_send', category: 'binding_send', description: 'Shannon never sends the follow-up; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'shannon-of-service', version: pkg.version,
  description: 'Checks service and trade tickets with technician timesheets: utilisation per technician from working against paid hours, revenue per paid hour, recall rate, completed tickets not invoiced and zero-dollar tickets. ServiceTitan layouts are recognised; technician names are masked in what the model sees. Drafts billing follow-ups; invoicing is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { service_settings: SERVICE_SETTINGS_SCHEMA },
  sources: {
    tickets: { label: 'Service tickets', args: ['tickets'], fields: TICKET_FIELDS, profiles: TICKET_PROFILES },
    timesheets: { label: 'Technician timesheets', args: ['timesheets'], fields: TIMESHEET_FIELDS, profiles: TIMESHEET_PROFILES },
  },
  prompts: [{
    name: 'service_review', title: 'Weekly service review',
    description: 'Walks the host model through the service ticket and utilisation review with Shannon.',
    arguments: [{ name: 'tickets', description: 'Service tickets', required: true }, { name: 'timesheets', description: 'Timesheets (optional)', required: false }],
    text: `You are helping a service manager review tickets and technician utilisation with shannon-of-service. Tickets: {{tickets}}. Timesheets: {{timesheets}}.

Rules: Shannon never invoices, runs payroll or sends; invoice_create, payroll_run and email_send are blocked. Technician names reach you as pseudonyms. Do not rank people for discipline; report the numbers.

1. Call shannon_check. Lead with completed tickets not invoiced and the amount, then zero-dollar tickets, then technicians below target or with a high recall rate.
2. Call shannon_explain for anything the person asks about.
3. Call shannon_write_report and share the paths.
4. Offer shannon_draft_followup; only when the person asks, call shannon_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Shannon allowlist.' }] },
});
