import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { buildWip, journalText, WIP_FIELDS, WIP_SETTINGS_SCHEMA } from './wip.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/wip-schedule';
const props = {
  wip: { type: 'string', description: 'Job list for the period under --root (CSV, Excel or JSON): job, revised contract amount, revised estimated total cost, cost to date and billed to date' },
  period_end: { type: 'string', maxLength: 30, description: 'Period end date for the schedule, YYYY-MM-DD (default today)' },
  settings: { type: 'string', description: 'Optional settings JSON (wip_settings schema): under_alert_pct, tolerance' },
};
const run = (a, ctx) => buildWip({ rows: ctx.records(a.wip, 'wip'), settings: a.settings ? ctx.readJson(a.settings, 'wip_settings') : {}, periodEnd: asOfDate(a.period_end, 'period_end') });
const std = standardTools({
  prefix: 'wip', outDir: OUT, props, required: ['wip'], run,
  check: { title: 'Build the WIP schedule', description: 'Per job by the cost-to-cost method: percent complete, earned revenue, over or under billed, gross profit to date and the anticipated loss to recognise on a loss job. Flags cost past the estimate, jobs with no estimate, billing past the contract and large under billings.' },
  explain: { arg: 'job', argDoc: 'Job number from wip_check', key: (i) => i.job, title: 'Explain one job',
    description: 'Show one job\'s WIP line and every finding.',
    describe: (i) => `${i.job} ${i.job_name}: ${i.status}. Contract ${i.contract_amount}, estimated cost ${i.estimated_cost ?? 'none'}, cost to date ${i.cost_to_date} (${i.percent_complete ?? '?'}% complete), earned ${i.earned_revenue ?? 'n/a'}, billed ${i.billed_to_date}: over ${i.over_billed}, under ${i.under_billed}, loss provision ${i.loss_provision}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'wip-schedule', title: (r) => `Work in progress, period ending ${r.period_end}`, description: 'Write the WIP schedule',
    row: (i) => ({ job: i.job, job_name: i.job_name, contract_amount: i.contract_amount, estimated_cost: i.estimated_cost ?? '', cost_to_date: i.cost_to_date, percent_complete: i.percent_complete ?? '', earned_revenue: i.earned_revenue ?? '', billed_to_date: i.billed_to_date, over_billed: i.over_billed, under_billed: i.under_billed, loss_provision: i.loss_provision, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'job_name', 'contract_amount', 'estimated_cost', 'cost_to_date', 'percent_complete', 'earned_revenue', 'billed_to_date', 'over_billed', 'under_billed', 'loss_provision', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'contract_amount', 'estimated_cost', 'cost_to_date', 'percent_complete', 'earned_revenue', 'billed_to_date', 'over_billed', 'under_billed', 'loss_provision', 'status'],
    sections: (r) => [
      { title: 'Totals', rows: [{ contract: r.contract, estimated_cost: r.estimated_cost, cost_to_date: r.cost_to_date, earned_revenue: r.earned_revenue, billed_to_date: r.billed_to_date, over_billings: r.over_billings, under_billings: r.under_billings, loss_provision: r.loss_provision }], columns: ['contract', 'estimated_cost', 'cost_to_date', 'earned_revenue', 'billed_to_date', 'over_billings', 'under_billings', 'loss_provision'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'The cost-to-cost method assumes cost to date measures progress; uninstalled materials or front-loaded costs distort it. Your accountant decides the method and the entries.'] },
});
const pair = draftPair({
  prefix: 'wip', noun: 'journal', verb: 'post', category: 'production_deploy', outDir: OUT, actor: 'your accountant',
  description: 'Write drafts/journal-<period_end>.md: the over/under billing and loss provision entry from the WIP schedule, with the per-job table and [TO CONFIRM] for accounts and reviewer. Marked DRAFT. Approval to post goes through wip_request_post (one click); a person posts it.',
  required: ['wip'],
  args: { ...props, prepared_by: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => { const r = run(a, ctx); if (!r.jobs) throw new Error('the WIP file has no jobs'); return { id: r.period_end, text: journalText(r, a), amount: r.net_over_under }; },
});
const refused = refusedTools([
  { name: 'gl_post', category: 'production_deploy', description: 'Fairbuild WIP Schedule never posts journal entries; your accountant posts the reviewed entry.' },
  { name: 'estimate_update', category: 'production_deploy', description: 'Fairbuild WIP Schedule never changes a job\'s estimate or contract amount.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild WIP Schedule never sends the schedule or the journal.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-wip-schedule', version: pkg.version,
  description: 'Builds the month-end work-in-progress schedule by the cost-to-cost method: percent complete, earned revenue, over and under billings by job, the anticipated loss to recognise on loss jobs, cost past the estimate and jobs with no estimate. Drafts the over/under billing journal. Posting it is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { wip_settings: WIP_SETTINGS_SCHEMA },
  sources: { wip: { label: 'Jobs for the WIP schedule', args: ['wip'], fields: WIP_FIELDS } },
  prompts: [{
    name: 'month_end_wip', title: 'Month-end WIP schedule',
    description: 'Walks the host model through the WIP schedule with Fairbuild WIP Schedule.',
    arguments: [{ name: 'wip', description: 'Job list for the period', required: true }, { name: 'period_end', description: 'Period end date', required: false }],
    text: `You are helping a construction controller build the month-end WIP schedule with fairbuild-wip-schedule. Jobs: {{wip}}. Period end: {{period_end}}.

Rules: Fairbuild WIP Schedule never posts or changes estimates; gl_post, estimate_update and email_send are blocked. The method and entries are the accountant's call.

1. Call wip_check. Lead with loss jobs and the provision, then jobs with no estimate or cost past the estimate, then over and under billings.
2. Call wip_explain for jobs the person asks about.
3. Call wip_write_report and share the paths.
4. Offer wip_draft_journal; only when the person asks, call wip_request_post. It needs one named human click, and a person posts the entry.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild WIP Schedule allowlist.' }] },
});
