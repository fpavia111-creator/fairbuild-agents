import { defineManifest, MODEL_PIN, SOV_FIELDS, standardTools, draftPair, refusedTools } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkPayApp, correctionText, PAYAPP_SETTINGS_SCHEMA, SUMMARY_SCHEMA } from './payapps.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/thames';
const props = {
  lines: { type: 'string', description: 'Continuation sheet (G703 layout) of the pay application under --root (CSV, Excel or JSON): item, description, scheduled value, from previous applications, this period, materials stored, completed and stored to date, percent, balance to finish, retainage' },
  summary: { type: 'string', description: 'Optional summary page (G702 layout) as JSON (payapp_summary schema): original contract sum, net change orders, contract sum to date, total completed and stored, total retainage, total earned less retainage, less previous certificates, current payment due, balance to finish' },
  previous: { type: 'string', description: 'Optional continuation sheet of the last application, to check "from previous applications" and previous certificates' },
  settings: { type: 'string', description: 'Optional settings JSON (payapp_settings schema): retainage_pct, stored_retainage_pct, percent_tolerance, tolerance' },
};
const run = (a, ctx) => checkPayApp({ lines: ctx.records(a.lines, 'lines'), summary: a.summary ? ctx.readJson(a.summary, 'payapp_summary') : null, previousLines: a.previous ? ctx.records(a.previous, 'previous') : null, settings: a.settings ? ctx.readJson(a.settings, 'payapp_settings') : {} });
const std = standardTools({
  prefix: 'thames', outDir: OUT, props, required: ['lines'], run,
  check: { title: 'Check pay application arithmetic', description: 'Every continuation sheet line: completed and stored = previous + this period + stored, percent = G / C, balance = C - G, retainage at your rates on work and on stored materials, billing past the scheduled value, and previous work against the last application. The summary page: contract sum, totals, retainage, earned less retainage, previous certificates, payment due and balance to finish.' },
  explain: { arg: 'item', argDoc: 'Line item number from thames_check, or G702 for the summary page', key: (i) => i.item, title: 'Explain one line',
    description: 'Show one line\'s columns and every arithmetic finding.',
    describe: (i) => `Line ${i.item} ${i.description}: ${i.status}. Scheduled ${i.scheduled_value}, previous ${i.previous ?? ''}, this period ${i.this_period ?? ''}, stored ${i.stored ?? ''}, completed and stored ${i.completed_stored}, retainage ${i.retainage}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'thames-payapp', title: 'Pay application check', description: 'Write the pay application check',
    row: (i) => ({ item: i.item, description: i.description, scheduled_value: i.scheduled_value ?? '', previous: i.previous ?? '', this_period: i.this_period ?? '', stored: i.stored ?? '', completed_stored: i.completed_stored ?? '', percent: i.percent ?? '', retainage: i.retainage ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['item', 'description', 'scheduled_value', 'previous', 'this_period', 'stored', 'completed_stored', 'percent', 'retainage', 'status', 'findings', 'reasons'],
    htmlColumns: ['item', 'description', 'scheduled_value', 'completed_stored', 'retainage', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Summary (G702)', rows: [{ scheduled_value: r.scheduled_value, completed_stored: r.completed_stored, this_period: r.this_period, stored: r.stored, retainage: r.retainage, retainage_at_rates: r.retainage_at_rates, current_payment_due: r.current_payment_due ?? '' }], columns: ['scheduled_value', 'completed_stored', 'this_period', 'stored', 'retainage', 'retainage_at_rates', 'current_payment_due'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Thames checks arithmetic and consistency. Whether the work billed is in place is for the architect, owner or your project manager to confirm.'] },
});
const pair = draftPair({
  prefix: 'thames', noun: 'corrections', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/corrections-<label>.md: a note to whoever prepared the pay application (your biller or a subcontractor) listing every line that does not add up. Marked DRAFT. Sending goes through thames_request_send (one click).',
  required: ['lines', 'label'],
  args: { ...props, label: { type: 'string', maxLength: 80, description: 'Name for the note, for example "24-101 application 7"' }, to: { type: 'string', maxLength: 200, description: 'Who prepared the application' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => {
    const r = run(a, ctx);
    if (!r.items.some((i) => i.status !== 'ok')) throw new Error('nothing to correct: every line and the summary add up');
    return { id: a.label, to: a.to || undefined, text: correctionText(r, a) };
  },
});
const refused = refusedTools([
  { name: 'payapp_submit', category: 'binding_send', description: 'Thames never submits a pay application to an owner or a portal.' },
  { name: 'payapp_approve', category: 'move_money', description: 'Thames never approves a subcontractor pay application for payment.' },
  { name: 'email_send', category: 'binding_send', description: 'Thames never sends the correction note; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'thames-of-payapps', version: pkg.version,
  description: 'Checks the arithmetic of a pay application in the G702/G703 layout, yours or a subcontractor\'s: each line\'s completed and stored total, percent and balance, retainage at your rates, lines billed past their scheduled value, previous work against the last application, and the summary page down to the payment due. Drafts a correction note. Submitting and approving pay applications is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { payapp_settings: PAYAPP_SETTINGS_SCHEMA, payapp_summary: SUMMARY_SCHEMA },
  sources: {
    lines: { label: 'Continuation sheet (G703 layout)', args: ['lines'], fields: SOV_FIELDS },
    previous: { label: 'Last application\'s continuation sheet', args: ['previous'], fields: SOV_FIELDS },
  },
  prompts: [{
    name: 'pay_application_check', title: 'Check a pay application before it goes out',
    description: 'Walks the host model through a pay application check with Thames.',
    arguments: [{ name: 'lines', description: 'Continuation sheet', required: true }, { name: 'summary', description: 'Summary page JSON (optional)', required: false }, { name: 'previous', description: 'Last application (optional)', required: false }],
    text: `You are helping a project accountant check a pay application with thames-of-payapps. Lines: {{lines}}. Summary: {{summary}}. Previous: {{previous}}.

Rules: Thames never submits or approves; payapp_submit, payapp_approve and email_send are blocked. It checks arithmetic, not whether the work is in place.

1. Call thames_check. Lead with lines that do not add up and lines billed past their scheduled value, then the summary page.
2. Call thames_explain for any line the person asks about.
3. Call thames_write_report and share the paths.
4. Offer thames_draft_corrections; only when the person asks, call thames_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Thames allowlist.' }] },
});
