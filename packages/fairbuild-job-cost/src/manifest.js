import { defineManifest, MODEL_PIN, BUDGET_FIELDS, BUDGET_PROFILES, COST_FIELDS, COST_PROFILES, COMMITMENT_FIELDS, COMMITMENT_PROFILES, standardTools, draftPair, refusedTools, jobKey } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkCosts, memoText, COST_SETTINGS_SCHEMA } from './costcodes.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/job-cost';
const props = {
  budget: { type: 'string', description: 'Budget by job and cost code under --root (CSV, Excel or JSON): original budget, approved changes, revised budget, and optionally committed, cost to date, cost to complete, projected cost and percent complete. Procore, Vista and QuickBooks budget layouts are recognised' },
  costs: { type: 'string', description: 'Optional job cost detail (one row per cost transaction): job, cost code, cost type, amount. Sage 300, Sage 100 Contractor, Foundation and Vista layouts are recognised. When given, cost to date comes from it and is tied to the budget report' },
  commitments: { type: 'string', description: 'Optional subcontract and PO list, used for committed cost when the budget file has no committed column' },
  settings: { type: 'string', description: 'Optional settings JSON (cost_settings schema): variance_pct, variance_amount, burn_gap_pts, tolerance, code_aliases, job' },
};
const run = (a, ctx) => checkCosts({
  budgetRows: ctx.records(a.budget, 'budget'),
  costRows: a.costs ? ctx.records(a.costs, 'costs') : null,
  commitmentRows: a.commitments ? ctx.records(a.commitments, 'commitments') : null,
  settings: a.settings ? ctx.readJson(a.settings, 'cost_settings') : {},
});
const std = standardTools({
  prefix: 'job_cost', outDir: OUT, props, required: ['budget'], run,
  check: { title: 'Compare job cost with the budget', description: 'Per job, cost code and cost type: cost to date, committed and projected cost against the revised budget; spend running ahead of percent complete; cost on codes or jobs with no budget; budget math (original plus approved changes against revised); cost detail that does not tie to the budget report.' },
  explain: { arg: 'line', argDoc: 'Budget line from job_cost_check, as "job code type" (for example "24-101 06-100 M") or the cost code alone', key: (i) => [i.line, `${i.job} ${i.cost_code}`, i.cost_code], title: 'Explain one budget line',
    description: 'Show one budget line\'s budget, committed, to-date and projected cost with every finding.',
    describe: (i) => `${i.line} ${i.name}: ${i.status}. Revised budget ${i.revised_budget}, committed ${i.committed ?? 'n/a'}, to date ${i.actual}, projected ${i.projected ?? 'n/a'}, ${i.percent_spent ?? '?'}% spent at ${i.percent_complete ?? '?'}% complete. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'job-cost', title: 'Job cost against budget', description: 'Write the job cost worklist',
    row: (i) => ({ job: i.job, cost_code: i.cost_code, cost_type: i.cost_type, name: i.name, revised_budget: i.revised_budget, committed: i.committed ?? '', actual: i.actual, projected: i.projected ?? '', overrun: i.overrun, percent_spent: i.percent_spent ?? '', percent_complete: i.percent_complete ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'cost_code', 'cost_type', 'name', 'revised_budget', 'committed', 'actual', 'projected', 'overrun', 'percent_spent', 'percent_complete', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'cost_code', 'cost_type', 'revised_budget', 'actual', 'projected', 'overrun', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'lines', 'revised_budget', 'committed', 'actual', 'projected', 'overrun'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Projected cost is the budget file\'s own projection, or cost to date plus the cost to complete it gives. Fairbuild Job Cost does not estimate cost to complete itself.'] },
});
const pair = draftPair({
  prefix: 'job_cost', noun: 'memo', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/memo-<job>.md: the cost review memo for one job to its project manager, with every line over, projected over or running ahead of progress, and [TO CONFIRM] where the PM\'s explanation goes. Marked DRAFT. Sending goes through job_cost_request_send (one click).',
  required: ['budget', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number as it appears in the budget' }, to: { type: 'string', maxLength: 200, description: 'Project manager the memo is for' }, from: { type: 'string', maxLength: 200, description: 'Your name and role' } },
  build: (a, ctx) => {
    const r = run(a, ctx);
    if (!r.items.some((i) => jobKey(i.job) === jobKey(a.job))) throw new Error(`job "${a.job}" is not in the budget; jobs in the file: ${Object.keys(r.by_job).join(', ')}`);
    return { id: String(a.job), to: a.to || undefined, text: memoText(r, a.job, a) };
  },
});
const refused = refusedTools([
  { name: 'budget_update', category: 'production_deploy', description: 'Fairbuild Job Cost never changes a budget or moves budget between cost codes; accounting enters approved budget transfers.' },
  { name: 'cost_recode', category: 'production_deploy', description: 'Fairbuild Job Cost never recodes or reverses job cost entries.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Job Cost never sends the memo; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-job-cost', version: pkg.version,
  description: 'Compares job cost with the budget by job, cost code and cost type: lines over or projected over budget, committed cost over budget, spend running ahead of percent complete, cost on codes or jobs with no budget, and budget math. Writes a worklist and drafts the cost review memo. Changing budgets and job cost is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { cost_settings: COST_SETTINGS_SCHEMA },
  sources: {
    budget: { label: 'Budget by cost code', args: ['budget'], fields: BUDGET_FIELDS, profiles: BUDGET_PROFILES },
    costs: { label: 'Job cost detail', args: ['costs'], fields: COST_FIELDS, profiles: COST_PROFILES },
    commitments: { label: 'Subcontracts and purchase orders', args: ['commitments'], fields: COMMITMENT_FIELDS, profiles: COMMITMENT_PROFILES },
  },
  prompts: [{
    name: 'job_cost_review', title: 'Monthly job cost review',
    description: 'Walks the host model through the monthly job cost review with Fairbuild Job Cost: compare, explain, report and the PM memo.',
    arguments: [{ name: 'budget', description: 'Budget file under --root', required: true }, { name: 'costs', description: 'Job cost detail (optional)', required: false }],
    text: `You are helping a construction controller or project accountant review job cost against budget with fairbuild-job-cost. Budget: {{budget}}. Cost detail: {{costs}}.

Rules: Fairbuild Job Cost never changes budgets or job cost; budget_update, cost_recode and email_send are blocked. Never invent a cost to complete or an explanation; ask the project manager.

1. Call job_cost_check. Lead with the projected overrun by job, then lines over budget, then cost on codes or jobs with no budget, then budget math errors.
2. Call job_cost_explain for lines the person asks about.
3. Call job_cost_write_report and share the paths.
4. Offer job_cost_draft_memo per job; only when the person asks, call job_cost_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Job Cost allowlist.' }] },
});
