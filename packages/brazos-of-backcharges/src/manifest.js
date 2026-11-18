import { defineManifest, MODEL_PIN, standardTools, draftPair, requestTool, refusedTools, asOfDate, sameParty, round2 } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkBackcharges, noticeText, BACKCHARGE_FIELDS, SUB_BALANCE_FIELDS, BACKCHARGE_SETTINGS_SCHEMA } from './backcharges.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/brazos';
const props = {
  backcharges: { type: 'string', description: 'Backcharge log under --root (CSV, Excel or JSON): number, job, subcontractor, date of the work, description, amount, status, notice date, amount deducted, backup on file' },
  balances: { type: 'string', description: 'Optional subcontract balances: subcontractor, revised amount, paid to date, retainage held, to see whether a backcharge can still be recovered from payments' },
  settings: { type: 'string', description: 'Optional settings JSON (backcharge_settings schema): notice_days, deduct_days, dispute_days' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the log is judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkBackcharges({ backchargeRows: ctx.records(a.backcharges, 'backcharges'), balanceRows: a.balances ? ctx.records(a.balances, 'balances') : null, settings: a.settings ? ctx.readJson(a.settings, 'backcharge_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'brazos', outDir: OUT, props, required: ['backcharges'], run,
  check: { title: 'Track backcharges to recovery', description: 'Per backcharge: notice sent late or not at all against your notice days, agreed and never deducted, deducted at a different amount, disputed for too long, no backup, and open backcharges on a subcontractor larger than what you still owe or hold on its subcontracts.' },
  explain: { arg: 'backcharge', argDoc: 'Backcharge number from brazos_check', key: (i) => i.backcharge, title: 'Explain one backcharge',
    description: 'Show one backcharge with every finding.',
    describe: (i) => `${i.backcharge} ${i.vendor} (job ${i.job}) ${i.date}: ${i.status}. ${i.description}; ${i.amount} charged, ${i.deducted} deducted, ${i.open_amount} open, ${i.state}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'brazos-backcharges', title: 'Backcharges to subcontractors', description: 'Write the backcharge worklist',
    row: (i) => ({ backcharge: i.backcharge, job: i.job, vendor: i.vendor, date: i.date || '', description: i.description, amount: i.amount, deducted: i.deducted, open_amount: i.open_amount, state: i.state, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['backcharge', 'job', 'vendor', 'date', 'description', 'amount', 'deducted', 'open_amount', 'state', 'status', 'findings', 'reasons'],
    htmlColumns: ['backcharge', 'job', 'vendor', 'description', 'amount', 'open_amount', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'backcharges', 'amount', 'recovered', 'open'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Notice and deduction rights come from your subcontracts; Brazos checks dates and amounts against the days you set, not the contract language.'] },
});
const pair = draftPair({
  prefix: 'brazos', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<vendor>.md: a backcharge notice to one subcontractor for its open backcharges, with [TO CONFIRM] for the clause and response days and [ATTACH] for backup. Marked DRAFT. Sending goes through brazos_request_send (one click).',
  required: ['backcharges', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no backcharges for "${a.vendor}"`);
    const t = noticeText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`no open backcharges for ${items[0].vendor}`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const deduct = requestTool({
  prefix: 'brazos', verb: 'deduction', category: 'move_money', outDir: OUT, file: 'deduction-approvals.csv', actor: 'accounts payable',
  title: 'Approve deducting a backcharge from a payment (one click)',
  description: 'After one named human click (even in Auto), record in deduction-approvals.csv that accounts payable may deduct an agreed backcharge from the subcontractor\'s next payment, up to its open amount. Brazos never changes a payment.',
  props: { ...props, backcharge: { type: 'string', maxLength: 80, description: 'Backcharge number from brazos_check' }, amount: { type: 'number', minimum: 0, description: 'Amount to deduct; at most the open amount' } },
  required: ['backcharges', 'backcharge', 'amount'], run,
  columns: ['backcharge', 'vendor', 'job', 'open_amount', 'approved_amount'],
  pick: (a, r) => {
    const i = r.items.find((x) => x.backcharge.toUpperCase() === String(a.backcharge).trim().toUpperCase());
    if (!i) throw new Error(`backcharge ${a.backcharge} not found`);
    if (i.state !== 'agreed') throw new Error(`backcharge ${i.backcharge} is ${i.state}, not agreed; only an agreed backcharge is deducted`);
    if (a.amount > i.open_amount + 0.005) throw new Error(`amount ${a.amount} is more than the ${i.open_amount} still open on ${i.backcharge}`);
    return { backcharge: i.backcharge, vendor: i.vendor, job: i.job, open_amount: i.open_amount, approved_amount: round2(a.amount) };
  },
  summary: (row) => `Deduction of ${row.approved_amount} for backcharge ${row.backcharge} (${row.vendor}) approved.`,
});
const refused = refusedTools([
  { name: 'ap_deduct_payment', category: 'move_money', description: 'Brazos never changes or reduces a payment; accounts payable deducts after a recorded approval.' },
  { name: 'backcharge_post', category: 'production_deploy', description: 'Brazos never posts a backcharge in your accounting system.' },
  { name: 'email_send', category: 'binding_send', description: 'Brazos never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'brazos-of-backcharges', version: pkg.version,
  description: 'Tracks backcharges to subcontractors from notice to recovery: notices late or missing, agreed backcharges never deducted, deductions that differ from what was agreed, disputes dragging on, backcharges with no backup, and backcharges larger than what you still owe or hold. Drafts notices and records one-click deduction approvals; changing a payment is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { backcharge_settings: BACKCHARGE_SETTINGS_SCHEMA },
  sources: {
    backcharges: { label: 'Backcharge log', args: ['backcharges'], fields: BACKCHARGE_FIELDS },
    balances: { label: 'Subcontract balances', args: ['balances'], fields: SUB_BALANCE_FIELDS },
  },
  prompts: [{
    name: 'backcharge_review', title: 'Monthly backcharge review',
    description: 'Walks the host model through backcharges with Brazos.',
    arguments: [{ name: 'backcharges', description: 'Backcharge log', required: true }, { name: 'balances', description: 'Subcontract balances (optional)', required: false }],
    text: `You are helping a construction project accountant recover backcharges with brazos-of-backcharges. Log: {{backcharges}}. Balances: {{balances}}.

Rules: Brazos never deducts, posts or sends; ap_deduct_payment, backcharge_post and email_send are blocked. Backcharge rights depend on the subcontract: do not give legal advice.

1. Call brazos_check. Lead with backcharges at risk (more than you still owe or hold), then agreed and not deducted, late notices and wrong deductions.
2. Call brazos_explain for backcharges the person asks about.
3. Call brazos_write_report and share the paths.
4. Offer brazos_draft_notice per subcontractor. Only when the person asks, call brazos_request_send or brazos_request_deduction; both need one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...deduct.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...deduct.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Brazos allowlist.' }] },
});
