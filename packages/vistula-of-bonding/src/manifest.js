import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkBonding, summaryText, BOND_JOB_FIELDS, PIPELINE_FIELDS, BONDING_SCHEMA } from './bonding.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/vistula';
const props = {
  jobs: { type: 'string', description: 'Job list under --root (CSV, Excel or JSON): job, contract amount, estimated cost, cost to date, bonded yes or no' },
  limits: { type: 'string', description: 'Your bonding limits JSON (bonding_limits schema): single_limit and aggregate_limit from your surety, near_pct, and working capital and net worth to show' },
  pipeline: { type: 'string', description: 'Optional bids you are chasing: bid, amount, bond required' },
};
const run = (a, ctx) => checkBonding({ jobRows: ctx.records(a.jobs, 'jobs'), limits: ctx.readJson(a.limits, 'bonding_limits'), pipelineRows: a.pipeline ? ctx.records(a.pipeline, 'pipeline') : null });
const std = standardTools({
  prefix: 'vistula', outDir: OUT, props, required: ['jobs', 'limits'], run,
  check: { title: 'Summarise bonding capacity', description: 'Backlog per job by cost to cost; bonded backlog against your aggregate limit; bonded contracts over your single-job limit; bonded jobs forecast at a loss; and, for the bids you list, whether each bonded bid still fits in what is left.' },
  explain: { arg: 'key', argDoc: 'Job number, bid name or PROGRAM from vistula_check', key: (i) => i.key, title: 'Explain one job or bid',
    description: 'Show one job, bid or the program with every finding.',
    describe: (i) => `${i.kind} ${i.key}${i.name && i.name !== i.key ? ` (${i.name})` : ''}: ${i.status}. ${i.bonded ? 'Bonded' : 'Not bonded'}, contract ${i.contract_amount ?? 'n/a'}, backlog ${i.backlog}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'vistula-bonding', title: 'Bonding capacity summary', description: 'Write the bonding summary',
    row: (i) => ({ kind: i.kind, key: i.key, name: i.name, bonded: i.bonded ? 'yes' : 'no', contract_amount: i.contract_amount ?? '', percent_complete: i.percent_complete ?? '', backlog: i.backlog, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['kind', 'key', 'name', 'bonded', 'contract_amount', 'percent_complete', 'backlog', 'status', 'findings', 'reasons'],
    htmlColumns: ['kind', 'key', 'bonded', 'contract_amount', 'backlog', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Capacity', rows: r.capacity, columns: ['single_limit', 'aggregate_limit', 'bonded_backlog', 'aggregate_used_pct', 'aggregate_left'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'advice', 'The limits are the ones you supply from your surety. Vistula does not estimate bonding capacity or predict what a surety will approve.'] },
});
const pair = draftPair({
  prefix: 'vistula', noun: 'summary', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/summary-<label>.md: the bonding capacity summary for your surety broker, with [ATTACH] for the financials and WIP. Marked DRAFT. Sending goes through vistula_request_send (one click).',
  required: ['jobs', 'limits', 'label'],
  args: { ...props, label: { type: 'string', maxLength: 80, description: 'Name for the summary, for example "Q4 2026"' }, to: { type: 'string', maxLength: 200, description: 'Surety broker' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => ({ id: a.label, to: a.to || undefined, text: summaryText(run(a, ctx), a) }),
});
const refused = refusedTools([
  { name: 'bond_request', category: 'binding_send', description: 'Vistula never requests a bid, performance or payment bond.' },
  { name: 'surety_submit', category: 'binding_send', description: 'Vistula never sends financial statements or WIP to a surety or broker.' },
  { name: 'email_send', category: 'binding_send', description: 'Vistula never sends the summary; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'vistula-of-bonding', version: pkg.version,
  description: 'Summarises bonding capacity from your job list and the single and aggregate limits your surety gave you: bonded backlog against the aggregate, contracts over the single-job limit, bonded jobs forecast at a loss, and whether the bonded bids you are chasing fit in what is left. Drafts the summary for your broker. Not surety advice; requesting bonds is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { bonding_limits: BONDING_SCHEMA },
  sources: {
    jobs: { label: 'Jobs and bonding', args: ['jobs'], fields: BOND_JOB_FIELDS },
    pipeline: { label: 'Bids being chased', args: ['pipeline'], fields: PIPELINE_FIELDS },
  },
  prompts: [{
    name: 'bonding_review', title: 'Quarterly bonding capacity review',
    description: 'Walks the host model through the bonding capacity summary with Vistula.',
    arguments: [{ name: 'jobs', description: 'Job list', required: true }, { name: 'limits', description: 'Bonding limits JSON', required: true }, { name: 'pipeline', description: 'Bids (optional)', required: false }],
    text: `You are helping a construction CFO prepare for a surety conversation with vistula-of-bonding. Jobs: {{jobs}}. Limits: {{limits}}. Pipeline: {{pipeline}}.

Rules: Vistula never requests bonds or sends financials; bond_request, surety_submit and email_send are blocked. Never predict what a surety will approve.

1. Call vistula_check. Lead with bonded backlog against the aggregate limit and what is left, then contracts over the single limit, then bids that would not fit and loss jobs.
2. Call vistula_explain for anything the person asks about.
3. Call vistula_write_report and share the paths.
4. Offer vistula_draft_summary; only when the person asks, call vistula_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Vistula allowlist.' }] },
});
