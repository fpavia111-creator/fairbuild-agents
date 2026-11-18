import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, jobKey, daysBetween, isoDate, readYesNo, num, str } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkCashflow, collectionText, CASH_FIELDS, OWNER_BILLING_FIELDS, CASH_SETTINGS_SCHEMA } from './cashflow.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/lena';
const props = {
  receipts: { type: 'string', description: 'Cash received by job under --root (CSV, Excel or JSON): job, date, amount, payer' },
  disbursements: { type: 'string', description: 'Cash paid out by job: job, date, amount, payee' },
  billings: { type: 'string', description: 'Optional owner invoices: job, invoice, date, amount, received yes or no, to age what is unpaid' },
  settings: { type: 'string', description: 'Optional settings JSON (cash_settings schema): collect_days, negative_months' },
  as_of: { type: 'string', maxLength: 30, description: 'Date for aging unpaid invoices, YYYY-MM-DD (default today)' },
};
const read = (a, ctx) => ({ receiptRows: ctx.records(a.receipts, 'receipts'), disbursementRows: ctx.records(a.disbursements, 'disbursements'), billingRows: a.billings ? ctx.records(a.billings, 'billings') : null, settings: a.settings ? ctx.readJson(a.settings, 'cash_settings') : {}, asOf: asOfDate(a.as_of) });
const run = (a, ctx) => checkCashflow(read(a, ctx));
const std = standardTools({
  prefix: 'lena', outDir: OUT, props, required: ['receipts', 'disbursements'], run,
  check: { title: 'Measure cash flow by job', description: 'Per job: cash collected, cash paid out and the net position; jobs cash negative; owner invoices unpaid past your collection days; months in a row with negative net cash. Net cash by month across all jobs.' },
  explain: { arg: 'job', argDoc: 'Job number from lena_check', key: (i) => i.job, title: 'Explain one job',
    description: 'Show one job\'s cash in, cash out, months and every finding.',
    describe: (i) => `${i.job}: ${i.status}. Collected ${i.cash_in}, paid out ${i.cash_out}, net ${i.net}; unpaid billed ${i.unpaid_billed}. By month: ${Object.entries(i.months).map(([m, v]) => `${m} ${v}`).join(', ')}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'lena-cashflow', title: 'Cash flow by job', description: 'Write the cash flow worklist',
    row: (i) => ({ job: i.job, cash_in: i.cash_in, cash_out: i.cash_out, net: i.net, unpaid_billed: i.unpaid_billed, unpaid_over_days: i.unpaid_over_days, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'cash_in', 'cash_out', 'net', 'unpaid_billed', 'unpaid_over_days', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'cash_in', 'cash_out', 'net', 'unpaid_over_days', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By month', rows: Object.entries(r.by_month).map(([month, v]) => ({ month, ...v })), columns: ['month', 'net'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Cash is matched to jobs by the job column of your receipts and disbursements; overhead and unassigned cash are not shown.'] },
});
const pair = draftPair({
  prefix: 'lena', noun: 'collection', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/collection-<job>.md: a payment request to the owner of one job listing its invoices unpaid past your collection days. Marked DRAFT. Sending goes through lena_request_send (one click).',
  required: ['receipts', 'disbursements', 'billings', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Owner accounts payable contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const input = read(a, ctx); const r = checkCashflow(input); const item = r.items.find((i) => jobKey(i.job) === jobKey(a.job));
    if (!item) throw new Error(`job "${a.job}" is not in the files`);
    const collect = r.settings_used.collect_days;
    const unpaid = (input.billingRows || []).filter((b) => jobKey(b.job) === jobKey(a.job) && readYesNo(b.received) !== true && isoDate(b.invoice_date) && daysBetween(isoDate(b.invoice_date), r.as_of) > collect).map((b) => ({ invoice: str(b.invoice), date: isoDate(b.invoice_date), amount: num(b.amount) || 0 }));
    if (!unpaid.length) throw new Error(`job ${item.job} has no owner invoice unpaid past ${collect} days`);
    return { id: item.job, to: a.to || undefined, text: collectionText(item, unpaid, { ...a, collect }), amount: item.unpaid_over_days };
  },
});
const refused = refusedTools([
  { name: 'bank_transfer', category: 'move_money', description: 'Lena never moves money between accounts or jobs.' },
  { name: 'ap_hold_payments', category: 'production_deploy', description: 'Lena never holds or releases payments in your accounting system.' },
  { name: 'email_send', category: 'binding_send', description: 'Lena never sends the collection letter; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'lena-of-cashflow', version: pkg.version,
  description: 'Measures cash flow by job from receipts and disbursements: the net cash position per job, jobs where you have paid out more than you collected, owner invoices unpaid past your collection days, and jobs negative two months running, with net cash by month. Drafts collection letters. Moving money is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { cash_settings: CASH_SETTINGS_SCHEMA },
  sources: {
    receipts: { label: 'Cash received by job', args: ['receipts'], fields: CASH_FIELDS },
    disbursements: { label: 'Cash paid out by job', args: ['disbursements'], fields: CASH_FIELDS },
    billings: { label: 'Owner invoices', args: ['billings'], fields: OWNER_BILLING_FIELDS },
  },
  prompts: [{
    name: 'job_cash_review', title: 'Weekly job cash review',
    description: 'Walks the host model through cash flow by job with Lena.',
    arguments: [{ name: 'receipts', description: 'Receipts', required: true }, { name: 'disbursements', description: 'Disbursements', required: true }, { name: 'billings', description: 'Owner invoices (optional)', required: false }],
    text: `You are helping a construction controller review cash by job with lena-of-cashflow. Receipts: {{receipts}}. Disbursements: {{disbursements}}. Billings: {{billings}}.

Rules: Lena never moves money, holds payments or sends; bank_transfer, ap_hold_payments and email_send are blocked.

1. Call lena_check. Lead with jobs that are cash negative and why, then slow collections, then negative months.
2. Call lena_explain for jobs the person asks about.
3. Call lena_write_report and share the paths.
4. Offer lena_draft_collection for jobs with old unpaid invoices; only when the person asks, call lena_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Lena allowlist.' }] },
});
