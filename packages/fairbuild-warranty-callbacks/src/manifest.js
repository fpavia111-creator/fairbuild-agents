import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkWarranty, noticeText, CALLBACK_FIELDS, WARRANTY_JOB_FIELDS, WARRANTY_SETTINGS_SCHEMA } from './warranty.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/warranty-callbacks';
const props = {
  callbacks: { type: 'string', description: 'Warranty callback log under --root (CSV, Excel or JSON): id, job, homeowner, phone, date reported, trade, responsible vendor, description, cost, status, closed date' },
  jobs: { type: 'string', description: 'Optional job list with completion date and warranty months, to find callbacks after the warranty ended' },
  settings: { type: 'string', description: 'Optional settings JSON (warranty_settings schema): warranty_months, repeat_days, response_days, self_performed' },
  as_of: { type: 'string', maxLength: 30, description: 'Date open callbacks are aged to, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkWarranty({ callbackRows: ctx.records(a.callbacks, 'callbacks'), jobRows: a.jobs ? ctx.records(a.jobs, 'jobs') : null, settings: a.settings ? ctx.readJson(a.settings, 'warranty_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'warranty', outDir: OUT, props, required: ['callbacks'], run,
  check: { title: 'Review warranty callbacks', description: 'Per callback: cost to recover from the responsible subcontractor, reported after your warranty ended (possibly billable), the same trade back on the same job within your repeat window, open too long, and no responsible party. Cost by job and trade. Homeowner names and contacts are masked in what the model sees.' },
  explain: { arg: 'callback_id', argDoc: 'Callback id from warranty_check', key: (i) => i.callback_id, title: 'Explain one callback',
    description: 'Show one callback with every finding.',
    describe: (i) => `${i.callback_id} job ${i.job} (${i.trade || 'no trade'}, ${i.vendor || 'no vendor'}) reported ${i.date_reported}: ${i.status}. ${i.description}; cost ${i.cost}${i.open ? ', open' : ''}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'warranty-callbacks', title: 'Warranty callbacks', description: 'Write the warranty worklist',
    row: (i) => ({ callback_id: i.callback_id, job: i.job, homeowner: i.homeowner, date_reported: i.date_reported || '', trade: i.trade, vendor: i.vendor, description: i.description, cost: i.cost, open: i.open ? 'yes' : 'no', warranty_ends: i.warranty_ends || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['callback_id', 'job', 'homeowner', 'date_reported', 'trade', 'vendor', 'description', 'cost', 'open', 'warranty_ends', 'status', 'findings', 'reasons'],
    htmlColumns: ['callback_id', 'job', 'date_reported', 'trade', 'vendor', 'cost', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'callbacks', 'cost', 'open'] },
      { title: 'By trade', rows: Object.entries(r.by_trade).map(([trade, v]) => ({ trade, ...v })), columns: ['trade', 'callbacks', 'cost'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'personal', 'Whether a repair is covered by your warranty or a subcontractor\'s is decided by the contracts; Fairbuild Warranty Callbacks only reads the dates and parties in your files.'] },
});
const pair = draftPair({
  prefix: 'warranty', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<vendor>.md: a notice to one subcontractor asking it to cover its warranty callbacks, with [ATTACH] for photos and tickets. Marked DRAFT. Sending goes through warranty_request_send (one click).',
  required: ['callbacks', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => i.vendor && sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no callbacks for "${a.vendor}"`);
    const t = noticeText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to recover from ${items[0].vendor}`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const refused = refusedTools([
  { name: 'backcharge_post', category: 'production_deploy', description: 'Fairbuild Warranty Callbacks never posts a backcharge or deducts from a subcontractor payment.' },
  { name: 'homeowner_contact', category: 'binding_send', description: 'Fairbuild Warranty Callbacks never contacts a homeowner or an owner.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Warranty Callbacks never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-warranty-callbacks', version: pkg.version,
  description: 'Reviews warranty callbacks by job, trade and subcontractor: cost a subcontractor should cover under its warranty, callbacks after your warranty ended that may be billable, repeat callbacks, callbacks open too long and callbacks with no one responsible. Homeowner names and contacts are masked in what the model sees. Drafts subcontractor notices; charging anyone is a person\'s decision.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { warranty_settings: WARRANTY_SETTINGS_SCHEMA },
  sources: {
    callbacks: { label: 'Warranty callback log', args: ['callbacks'], fields: CALLBACK_FIELDS },
    jobs: { label: 'Jobs and warranty terms', args: ['jobs'], fields: WARRANTY_JOB_FIELDS },
  },
  prompts: [{
    name: 'warranty_review', title: 'Monthly warranty callback review',
    description: 'Walks the host model through the warranty review with Fairbuild Warranty Callbacks.',
    arguments: [{ name: 'callbacks', description: 'Callback log', required: true }, { name: 'jobs', description: 'Jobs and warranty terms (optional)', required: false }],
    text: `You are helping a builder's warranty manager review callbacks with fairbuild-warranty-callbacks. Callbacks: {{callbacks}}. Jobs: {{jobs}}.

Rules: Fairbuild Warranty Callbacks never posts backcharges, contacts homeowners or sends; backcharge_post, homeowner_contact and email_send are blocked. Homeowner names reach you as pseudonyms.

1. Call warranty_check. Lead with cost to recover from subcontractors, then callbacks after the warranty, then repeats and callbacks open too long.
2. Call warranty_explain for callbacks the person asks about.
3. Call warranty_write_report and share the paths (the files hold real names).
4. Offer warranty_draft_notice per subcontractor; only when the person asks, call warranty_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Warranty Callbacks allowlist.' }] },
});
