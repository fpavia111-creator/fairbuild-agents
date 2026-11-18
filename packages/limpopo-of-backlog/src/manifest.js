import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkBacklog, memoText, HISTORY_FIELDS, FADE_SETTINGS_SCHEMA } from './backlog.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/limpopo';
const props = {
  history: { type: 'string', description: 'Month-end job history under --root (CSV, Excel or JSON), one row per job and period: job, period (YYYY-MM or a date), contract amount, estimated cost, cost to date. Past WIP schedules stacked together work' },
  settings: { type: 'string', description: 'Optional settings JSON (fade_settings schema): fade_pts, gain_pts, stale_move_pts' },
};
const run = (a, ctx) => checkBacklog({ rows: ctx.records(a.history, 'history'), settings: a.settings ? ctx.readJson(a.settings, 'fade_settings') : {} });
const std = standardTools({
  prefix: 'limpopo', outDir: OUT, props, required: ['history'], run,
  check: { title: 'Measure backlog and margin fade', description: 'Per job across periods: estimated margin at the first and latest period and the fade between them, fade since last period, loss forecasts, margins that rose sharply, estimates not updated while the job moved, and the backlog (contract less earned revenue) with the gross profit still in it.' },
  explain: { arg: 'job', argDoc: 'Job number from limpopo_check', key: (i) => i.job, title: 'Explain one job',
    description: 'Show one job\'s margin history, backlog and every finding.',
    describe: (i) => `${i.job}: ${i.status}. Margin ${i.first_margin_pct ?? '?'}% (${i.first_period}) to ${i.latest_margin_pct ?? '?'}% (${i.latest_period}); ${i.percent_complete ?? '?'}% complete; backlog ${i.backlog} with ${i.backlog_gross_profit ?? 'n/a'} gross profit. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'limpopo-backlog', title: 'Backlog and margin fade', description: 'Write the backlog and fade worklist',
    row: (i) => ({ job: i.job, periods: i.periods, first_period: i.first_period, latest_period: i.latest_period, contract_amount: i.contract_amount, first_margin_pct: i.first_margin_pct ?? '', latest_margin_pct: i.latest_margin_pct ?? '', fade_pts: i.fade_pts ?? '', percent_complete: i.percent_complete ?? '', backlog: i.backlog, backlog_gross_profit: i.backlog_gross_profit ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'periods', 'first_period', 'latest_period', 'contract_amount', 'first_margin_pct', 'latest_margin_pct', 'fade_pts', 'percent_complete', 'backlog', 'backlog_gross_profit', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'contract_amount', 'first_margin_pct', 'latest_margin_pct', 'fade_pts', 'backlog', 'backlog_gross_profit', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Totals', rows: [{ jobs: r.jobs, backlog: r.backlog, backlog_gross_profit: r.backlog_gross_profit, backlog_margin_pct: r.backlog_margin_pct, fade_amount: r.fade_amount }], columns: ['jobs', 'backlog', 'backlog_gross_profit', 'backlog_margin_pct', 'fade_amount'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Fade is measured on the estimates in your history file. Limpopo does not know why a margin moved; the project managers do.'] },
});
const pair = draftPair({
  prefix: 'limpopo', noun: 'memo', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/memo-<period>.md: the backlog and fade memo for the owner or CFO, with [TO CONFIRM] for each job\'s cause. Marked DRAFT. Sending goes through limpopo_request_send (one click).',
  required: ['history'],
  args: { ...props, to: { type: 'string', maxLength: 200, description: 'Owner or CFO' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => { const r = run(a, ctx); if (!r.jobs) throw new Error('the history file has no jobs'); return { id: r.latest_period, to: a.to || undefined, text: memoText(r, a), amount: r.backlog }; },
});
const refused = refusedTools([
  { name: 'estimate_update', category: 'production_deploy', description: 'Limpopo never changes an estimate or a forecast.' },
  { name: 'gl_post', category: 'production_deploy', description: 'Limpopo never posts to the ledger.' },
  { name: 'email_send', category: 'binding_send', description: 'Limpopo never sends the memo; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'limpopo-of-backlog', version: pkg.version,
  description: 'Measures backlog and margin fade from month-end job history: the work left to earn and the gross profit in it, jobs whose estimated margin has faded since the first estimate or since last month, loss forecasts, margins that rose sharply and estimates not updated while the job moved. Drafts the backlog memo. Changing estimates is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { fade_settings: FADE_SETTINGS_SCHEMA },
  sources: { history: { label: 'Month-end job history', args: ['history'], fields: HISTORY_FIELDS } },
  prompts: [{
    name: 'backlog_review', title: 'Monthly backlog and fade review',
    description: 'Walks the host model through backlog and fade with Limpopo.',
    arguments: [{ name: 'history', description: 'Month-end job history', required: true }],
    text: `You are helping a construction CFO or controller review backlog and margin fade with limpopo-of-backlog. History: {{history}}.

Rules: Limpopo never changes estimates or posts; estimate_update, gl_post and email_send are blocked. Do not guess why a margin moved.

1. Call limpopo_check. Lead with total backlog and its gross profit, then loss forecasts and fade, then sharp gains and stale estimates.
2. Call limpopo_explain for jobs the person asks about.
3. Call limpopo_write_report and share the paths.
4. Offer limpopo_draft_memo; only when the person asks, call limpopo_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Limpopo allowlist.' }] },
});
