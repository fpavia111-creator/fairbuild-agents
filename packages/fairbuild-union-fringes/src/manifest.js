import { defineManifest, MODEL_PIN, standardTools, draftPair, requestTool, refusedTools, asOfDate, round2 } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkFringes, letterText, HOURS_FIELDS, FUND_RATE_FIELDS, REMITTANCE_FIELDS, FRINGE_SETTINGS_SCHEMA } from './fringes.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/union-fringes';
const props = {
  hours: { type: 'string', description: 'Union hours from payroll under --root (CSV, Excel or JSON): local, worker, month (YYYY-MM or any date in the month), hours' },
  rates: { type: 'string', description: 'Contribution rates per hour by local and fund' },
  remittances: { type: 'string', description: 'Remittances sent: local, fund, month, hours reported, amount, date remitted' },
  settings: { type: 'string', description: 'Optional settings JSON (fringe_settings schema): due_day, tolerance' },
  as_of: { type: 'string', maxLength: 30, description: 'Date remittances are judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkFringes({ hourRows: ctx.records(a.hours, 'hours'), rateRows: ctx.records(a.rates, 'rates'), remittanceRows: ctx.records(a.remittances, 'remittances'), settings: a.settings ? ctx.readJson(a.settings, 'fringe_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'fringes', outDir: OUT, props, required: ['hours', 'rates', 'remittances'], run,
  check: { title: 'Reconcile union fringe remittances', description: 'Per local, fund and month: payroll hours times the contribution rate against what was remitted; short, not remitted after the due date, over, late, hours reported that differ from payroll, and hours for a local with no rates. Worker names in the hours file are masked in what the model sees.' },
  explain: { arg: 'fund_month', argDoc: 'Fund and month from fringes_check, as "local fund month" (for example "Local 100 Pension 2026-10")', key: (i) => i.key, title: 'Explain one fund-month',
    description: 'Show one fund-month\'s hours, rate, due, remitted and every finding.',
    describe: (i) => `${i.key}: ${i.status}. ${i.hours} hours by ${i.workers} worker(s) at ${i.rate ?? 'no rate'} = ${i.due ?? 'n/a'} due ${i.due_date}; remitted ${i.remitted}${i.remitted_date ? ` on ${i.remitted_date}` : ''}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'union-fringes', title: 'Union fringe remittances', description: 'Write the remittance worklist',
    row: (i) => ({ union: i.union, fund: i.fund, month: i.month, workers: i.workers, hours: i.hours, rate: i.rate ?? '', due: i.due ?? '', remitted: i.remitted, difference: i.difference, due_date: i.due_date, remitted_date: i.remitted_date || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['union', 'fund', 'month', 'workers', 'hours', 'rate', 'due', 'remitted', 'difference', 'due_date', 'remitted_date', 'status', 'findings', 'reasons'],
    htmlColumns: ['union', 'fund', 'month', 'hours', 'due', 'remitted', 'difference', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By fund', rows: Object.entries(r.by_fund).map(([fund, v]) => ({ fund, ...v })), columns: ['fund', 'months', 'due', 'remitted', 'short'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Rates, due dates and late charges come from your collective bargaining agreements; Fairbuild Union Fringes uses only the rates and due day you supply.'] },
});
const pair = draftPair({
  prefix: 'fringes', noun: 'letter', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/letter-<local>.md: a letter to one local\'s fund administrator listing each fund-month that is short, over, late or reported with the wrong hours. Marked DRAFT. Sending goes through fringes_request_send (one click).',
  required: ['hours', 'rates', 'remittances', 'union'],
  args: { ...props, union: { type: 'string', maxLength: 120, description: 'Local, as in the files (for example "Local 100")' }, to: { type: 'string', maxLength: 200, description: 'Fund administrator' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => i.union.toLowerCase() === String(a.union).trim().toLowerCase());
    if (!items.length) throw new Error(`no remittances for "${a.union}"; locals: ${[...new Set(r.items.map((i) => i.union))].join(', ')}`);
    const t = letterText(items, { ...a, union: items[0].union });
    if (!t.count) throw new Error(`nothing to raise with ${items[0].union}: every fund-month reconciles`);
    return { id: items[0].union, to: a.to || undefined, text: t.text, extra: { fund_months: t.count } };
  },
});
const pay = requestTool({
  prefix: 'fringes', verb: 'payment', category: 'move_money', outDir: OUT, file: 'fringe-payment-approvals.csv', actor: 'accounts payable',
  title: 'Approve paying a fund shortfall (one click)',
  description: 'After one named human click (even in Auto), record in fringe-payment-approvals.csv that accounts payable may pay a fund the shortfall Fairbuild Union Fringes found for one fund-month, up to that shortfall. Fairbuild Union Fringes never pays.',
  props: { ...props, fund_month: { type: 'string', maxLength: 200, description: 'Fund-month from fringes_check, as "local fund month"' }, amount: { type: 'number', minimum: 0, description: 'Amount to pay; at most the shortfall' } },
  required: ['hours', 'rates', 'remittances', 'fund_month', 'amount'], run,
  columns: ['fund_month', 'due', 'remitted', 'approved_amount'],
  pick: (a, r) => {
    const i = r.items.find((x) => x.key.toLowerCase() === String(a.fund_month).trim().toLowerCase());
    if (!i) throw new Error(`fund-month "${a.fund_month}" not found; pass one from fringes_check`);
    const short = round2((i.due || 0) - i.remitted);
    if (short <= 0) throw new Error(`${i.key} is not short`);
    if (a.amount > short + 0.005) throw new Error(`amount ${a.amount} is more than the ${short} shortfall on ${i.key}`);
    return { fund_month: i.key, due: i.due, remitted: i.remitted, approved_amount: round2(a.amount) };
  },
  summary: (row) => `Payment of ${row.approved_amount} to ${row.fund_month} approved.`,
});
const refused = refusedTools([
  { name: 'fund_portal_submit', category: 'binding_send', description: 'Fairbuild Union Fringes never logs in to or files with a fund portal.' },
  { name: 'ach_pay', category: 'move_money', description: 'Fairbuild Union Fringes never pays a fund; accounts payable pays after a recorded approval.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Union Fringes never sends the letter; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-union-fringes', version: pkg.version,
  description: 'Reconciles union fringe benefit remittances by local, fund and month against payroll hours and the contribution rates you supply: funds paid short or not at all, paid over, paid late, hours reported that differ from payroll and hours for a local with no rates. Drafts fund letters and records one-click approvals to pay a shortfall. Paying a fund is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { fringe_settings: FRINGE_SETTINGS_SCHEMA },
  sources: {
    hours: { label: 'Union hours from payroll', args: ['hours'], fields: HOURS_FIELDS },
    rates: { label: 'Fund contribution rates', args: ['rates'], fields: FUND_RATE_FIELDS },
    remittances: { label: 'Remittances sent', args: ['remittances'], fields: REMITTANCE_FIELDS },
  },
  prompts: [{
    name: 'fringe_reconciliation', title: 'Monthly union fringe reconciliation',
    description: 'Walks the host model through the fringe remittance reconciliation with Fairbuild Union Fringes.',
    arguments: [{ name: 'hours', description: 'Union hours', required: true }, { name: 'rates', description: 'Contribution rates', required: true }, { name: 'remittances', description: 'Remittances', required: true }],
    text: `You are helping a construction payroll lead reconcile union fringe remittances with fairbuild-union-fringes. Hours: {{hours}}. Rates: {{rates}}. Remittances: {{remittances}}.

Rules: Fairbuild Union Fringes never pays or files; fund_portal_submit, ach_pay and email_send are blocked. Agreements decide rates and late charges.

1. Call fringes_check. Lead with funds short or not remitted, then hours mismatches, over-remittances and late payments.
2. Call fringes_explain for fund-months the person asks about.
3. Call fringes_write_report and share the paths.
4. Offer fringes_draft_letter per local. Only when the person asks, call fringes_request_send or fringes_request_payment; both need one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...pay.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...pay.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Union Fringes allowlist.' }] },
});
