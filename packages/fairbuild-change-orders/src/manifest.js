import { defineManifest, MODEL_PIN, CHANGE_ORDER_FIELDS, CHANGE_ORDER_PROFILES, standardTools, draftPair, refusedTools, asOfDate, jobKey } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkChangeOrders, followupText, CO_SETTINGS_SCHEMA } from './changeorders.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/change-orders';
const props = {
  change_orders: { type: 'string', description: 'Change order log under --root (CSV, Excel or JSON): job, number, type, status, description, price, estimated cost, submitted and approved dates, billed to date. Buildertrend and Procore change order exports are recognised' },
  settings: { type: 'string', description: 'Optional settings JSON (co_settings schema): pending_days, tolerance' },
  as_of: { type: 'string', maxLength: 30, description: 'Date pending change orders are aged to, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkChangeOrders({ rows: ctx.records(a.change_orders, 'change_orders'), settings: a.settings ? ctx.readJson(a.settings, 'co_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'change_orders', outDir: OUT, props, required: ['change_orders'], run,
  check: { title: 'Check the change order log', description: 'Per change order: pending and how long, approved and not yet billed, billed while unapproved or past the approved amount, priced below its estimated cost, rejected with cost behind it, with no price, or entered twice. Totals approved, pending, billed and unbilled by job.' },
  explain: { arg: 'change_order', argDoc: 'Change order number from change_orders_check (for example CO-002 or PCO-003)', key: (i) => [i.change_order, `${i.job} ${i.change_order}`], title: 'Explain one change order',
    description: 'Show one change order\'s state, price, cost, billing and every finding.',
    describe: (i) => `${i.change_order} on job ${i.job} (${i.description}): ${i.status_raw || i.state}, ${i.status}. Amount ${i.amount ?? 'none'}, cost ${i.cost ?? 'n/a'}, billed ${i.billed}, unbilled ${i.unbilled}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'change-orders', title: 'Change order log', description: 'Write the change order worklist',
    row: (i) => ({ job: i.job, change_order: i.change_order, description: i.description, state: i.state, amount: i.amount ?? '', cost: i.cost ?? '', billed: i.billed, unbilled: i.unbilled, age_days: i.age_days ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'change_order', 'description', 'state', 'amount', 'cost', 'billed', 'unbilled', 'age_days', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'change_order', 'description', 'state', 'amount', 'billed', 'unbilled', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'change_orders', 'approved', 'pending', 'billed', 'unbilled'] },
      { title: 'By status', rows: Object.entries(r.by_status).map(([state, v]) => ({ state, ...v })), columns: ['state', 'count', 'amount'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Whether a change is owed under your contract is not decided here; Fairbuild Change Orders reads the status and amounts your log records.'] },
});
const pair = draftPair({
  prefix: 'change_orders', noun: 'followup', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/followup-<job>.md: a note to the owner listing one job\'s pending change orders, their amounts and days waiting. Marked DRAFT, with [ATTACH] for the backup. Sending goes through change_orders_request_send (one click).',
  required: ['change_orders', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Owner or owner representative' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => jobKey(i.job) === jobKey(a.job));
    if (!items.length) throw new Error(`job "${a.job}" is not in the change order log; jobs: ${Object.keys(r.by_job).join(', ')}`);
    const t = followupText(items, { ...a, job: items[0].job });
    if (!t.count) throw new Error(`job ${items[0].job} has no pending change orders to follow up`);
    return { id: items[0].job, to: a.to || undefined, text: t.text, amount: t.total, extra: { change_orders: t.count } };
  },
});
const refused = refusedTools([
  { name: 'change_order_approve', category: 'production_deploy', description: 'Fairbuild Change Orders never approves, rejects or changes a change order in your system.' },
  { name: 'invoice_create', category: 'binding_send', description: 'Fairbuild Change Orders never creates or submits a pay application or invoice.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Change Orders never sends the follow-up; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-change-orders', version: pkg.version,
  description: 'Reads the change order log by job: pending change orders waiting too long or with no price, approved change orders not yet billed, billing on unapproved changes or past the approved amount, changes priced below cost, rejected changes that left cost behind, and numbers entered twice. Drafts owner follow-ups. Approving and billing change orders is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { co_settings: CO_SETTINGS_SCHEMA },
  sources: { change_orders: { label: 'Change order log', args: ['change_orders'], fields: CHANGE_ORDER_FIELDS, profiles: CHANGE_ORDER_PROFILES } },
  prompts: [{
    name: 'change_order_review', title: 'Weekly change order review',
    description: 'Walks the host model through the change order log with Fairbuild Change Orders.',
    arguments: [{ name: 'change_orders', description: 'Change order log under --root', required: true }],
    text: `You are helping a project manager or project accountant review the change order log with fairbuild-change-orders. Log: {{change_orders}}.

Rules: Fairbuild Change Orders never approves, bills or sends; change_order_approve, invoice_create and email_send are blocked. Whether a change is owed is the person's call.

1. Call change_orders_check. Lead with billing errors, then approved change orders not yet billed, then pending ones waiting too long.
2. Call change_orders_explain for change orders the person asks about.
3. Call change_orders_write_report and share the paths.
4. Offer change_orders_draft_followup per job with pending change orders; only when the person asks, call change_orders_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Change Orders allowlist.' }] },
});
