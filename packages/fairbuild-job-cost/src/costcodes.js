// Fairbuild Job Cost: job cost against budget by job, cost code and cost type. Pure functions, no I/O.
import { num, str, round2, pct, jobKey, codeKey, costType, COST_TYPES, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

export const COST_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    variance_pct: { type: 'number', minimum: 0, maximum: 1000, description: 'A projected overrun is flagged when it is at least this percent of the revised budget (default 5)' },
    variance_amount: { type: 'number', minimum: 0, description: 'A projected overrun is flagged when it is at least this amount (default 2500). Either threshold is enough' },
    burn_gap_pts: { type: 'number', minimum: 0, maximum: 100, description: 'Spend running ahead of progress: flagged when percent spent exceeds percent complete by more than this many points (default 15)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
    code_aliases: { type: 'object', additionalProperties: { type: 'string', maxLength: 60 }, description: 'Cost codes in the cost file that mean a budget code, e.g. {"3-300": "03-300"}' },
    job: { type: 'string', maxLength: 60, description: 'Job number for budget files that have no job column (one job per file)' },
  },
});

export const DEFAULTS = Object.freeze({ variance_pct: 5, variance_amount: 2500, burn_gap_pts: 15, tolerance: 1 });
const ORDER = ['revised_math', 'over_budget', 'committed_over', 'projected_over', 'burn_ahead', 'detail_does_not_tie', 'unbudgeted_cost', 'no_budget_job', 'credit_balance'];

const typeLabel = (t) => (t && COST_TYPES[t] ? COST_TYPES[t].label : '');
const label = (job, code, type) => `${job} ${code}${type ? ` ${type}` : ''}`;

/**
 * Compare budget lines with cost to date.
 * budgetRows: BUDGET_FIELDS rows. costRows: COST_FIELDS rows or null (then the budget's actual column is used).
 * commitmentRows: optional COMMITMENT_FIELDS rows, used for committed cost when the budget has none.
 */
export function checkCosts({ budgetRows, costRows = null, commitmentRows = null, settings = {} }) {
  const s = { ...DEFAULTS, ...settings };
  const tol = num(s.tolerance) ?? 1;
  const alias = new Map(Object.entries(s.code_aliases || {}).map(([k, v]) => [codeKey(k), codeKey(v)]));
  const codeOf = (c) => alias.get(codeKey(c)) || codeKey(c);
  const defaultJob = str(s.job);

  // Budget lines, one per job|code|type (rows repeating a line are added up).
  const lines = new Map();
  for (const r of budgetRows) {
    const job = str(r.job) || defaultJob; const code = str(r.cost_code); if (!code) continue;
    const t = costType(r.cost_type) || (str(r.cost_type) ? str(r.cost_type).toUpperCase() : '');
    const k = `${jobKey(job)}|${codeOf(code)}|${t}`;
    let l = lines.get(k);
    if (!l) { l = { key: k, job: job || '(no job)', cost_code: code, cost_type: t, name: str(r.cost_code_name), original: 0, changes: null, revised: null, committed: null, actual_budget: null, etc: null, projected_given: null, percent_complete: null, rows: 0 }; lines.set(k, l); }
    l.rows++;
    l.original = round2(l.original + (num(r.original_budget) || 0));
    const add = (f, v) => { const n = num(v); if (n !== null) l[f] = round2((l[f] || 0) + n); };
    add('changes', r.approved_changes); add('revised', r.revised_budget); add('committed', r.committed); add('actual_budget', r.actual); add('etc', r.estimate_to_complete); add('projected_given', r.projected);
    if (num(r.percent_complete) !== null) l.percent_complete = num(r.percent_complete);
    if (!l.name && str(r.cost_code_name)) l.name = str(r.cost_code_name);
  }
  const jobsInBudget = new Set([...lines.values()].map((l) => jobKey(l.job)));
  const byJobCode = new Map();
  for (const l of lines.values()) { const k = `${jobKey(l.job)}|${codeOf(l.cost_code)}`; if (!byJobCode.has(k)) byJobCode.set(k, []); byJobCode.get(k).push(l); }

  // Cost detail, attached to its budget line, or kept aside when it has none.
  const detail = new Map(); const orphans = new Map();
  if (costRows) for (const r of costRows) {
    const amt = num(r.amount); if (amt === null) continue;
    const job = str(r.job) || defaultJob; const code = str(r.cost_code); const t = costType(r.cost_type) || (str(r.cost_type) ? str(r.cost_type).toUpperCase() : '');
    let k = `${jobKey(job)}|${codeOf(code)}|${t}`;
    if (!lines.has(k)) { const same = byJobCode.get(`${jobKey(job)}|${codeOf(code)}`) || []; if (same.length === 1 && (!same[0].cost_type || !t)) k = same[0].key; }
    if (lines.has(k)) { const d = detail.get(k) || { amount: 0, rows: 0 }; d.amount = round2(d.amount + amt); d.rows++; detail.set(k, d); continue; }
    const ok = `${jobKey(job)}|${codeOf(code)}`;
    const o = orphans.get(ok) || { job: job || '(no job)', cost_code: code || '(no code)', cost_type: t, amount: 0, rows: 0, job_known: jobsInBudget.has(jobKey(job)) };
    o.amount = round2(o.amount + amt); o.rows++; orphans.set(ok, o);
  }
  // Committed cost from the commitment list when the budget has no committed column.
  const commit = new Map();
  if (commitmentRows) for (const c of commitmentRows) {
    const job = str(c.job) || defaultJob; const t = costType(c.cost_type) || '';
    let k = `${jobKey(job)}|${codeOf(c.cost_code)}|${t}`;
    if (!lines.has(k)) { const same = byJobCode.get(`${jobKey(job)}|${codeOf(c.cost_code)}`) || []; if (same.length === 1) k = same[0].key; else continue; }
    const amt = num(c.revised_amount) ?? round2((num(c.original_amount) || 0) + (num(c.approved_changes) || 0));
    commit.set(k, round2((commit.get(k) || 0) + amt));
  }

  const items = [];
  for (const l of lines.values()) {
    const f = [];
    const computed = round2(l.original + (l.changes || 0));
    const revised = l.revised ?? computed;
    if (l.revised !== null && l.changes !== null && Math.abs(l.revised - computed) > tol) f.push(finding('revised_math', l.revised - computed, `Original ${l.original} plus approved changes ${l.changes} is ${computed}; the revised budget says ${l.revised}.`));
    const d = detail.get(l.key);
    const actual = d ? d.amount : (l.actual_budget ?? 0);
    if (d && l.actual_budget !== null && Math.abs(d.amount - l.actual_budget) > tol) f.push(finding('detail_does_not_tie', null, `Cost detail adds up to ${d.amount} (${d.rows} row(s)); the budget report shows ${l.actual_budget} to date. Check for costs posted after the budget report was run, or coded to this line by mistake.`));
    const committed = l.committed ?? commit.get(l.key) ?? null;
    const projected = l.projected_given ?? (l.etc !== null ? round2(actual + l.etc) : null);
    if (actual - revised > tol) f.push(finding('over_budget', actual - revised, `Cost to date ${actual} is over the revised budget ${revised} by ${round2(actual - revised)}.`));
    if (committed !== null && committed - revised > tol) f.push(finding('committed_over', committed - revised, `Committed cost ${committed} is over the revised budget ${revised} by ${round2(committed - revised)}.`));
    if (projected !== null && projected - revised > tol) {
      const over = round2(projected - revised); const p = pct(over, revised);
      if (over >= s.variance_amount || (p !== null && p >= s.variance_pct) || revised === 0) f.push(finding('projected_over', over, `Projected cost ${projected} is over the revised budget ${revised} by ${over}${p !== null ? ` (${p}%)` : ''}.`));
    }
    const spent = pct(actual, revised);
    if (l.percent_complete !== null && spent !== null && spent - l.percent_complete > s.burn_gap_pts && !f.some((x) => x.code === 'over_budget')) f.push(finding('burn_ahead', null, `${spent}% of the budget is spent at ${l.percent_complete}% complete, ${round2(spent - l.percent_complete)} points ahead of progress. Ask the project manager for the cost to complete.`));
    if (actual < -tol) f.push(finding('credit_balance', null, `Cost to date is a credit (${actual}). Check for a reversed or mis-coded entry.`));
    const overrun = round2(Math.max(0, ...f.filter((x) => ['over_budget', 'committed_over', 'projected_over'].includes(x.code)).map((x) => x.amount)));
    const status = overrun > 0 ? 'over' : f.length ? 'review' : 'ok';
    items.push({ line: label(l.job, l.cost_code, l.cost_type), job: l.job, cost_code: l.cost_code, cost_type: l.cost_type, cost_type_name: typeLabel(l.cost_type), name: l.name, original_budget: l.original, approved_changes: l.changes ?? 0, revised_budget: revised, committed, actual, projected, percent_spent: spent, percent_complete: l.percent_complete, overrun, status, findings: orderFindings(f, ORDER) });
  }
  for (const o of orphans.values()) {
    const f = [o.job_known
      ? finding('unbudgeted_cost', o.amount, `${o.amount} of cost (${o.rows} row(s)) is coded to ${o.cost_code} on job ${o.job}, which has no budget line for that code. Recode it or add the code to the budget.`)
      : finding('no_budget_job', o.amount, `${o.amount} of cost (${o.rows} row(s)) is coded to job ${o.job}, which is not in the budget file. Check the job number.`)];
    items.push({ line: label(o.job, o.cost_code, o.cost_type), job: o.job, cost_code: o.cost_code, cost_type: o.cost_type, cost_type_name: typeLabel(o.cost_type), name: '', original_budget: 0, approved_changes: 0, revised_budget: 0, committed: null, actual: o.amount, projected: null, percent_spent: null, percent_complete: null, overrun: 0, status: 'unbudgeted', findings: f });
  }
  const rankStatus = { over: 0, unbudgeted: 1, review: 2, ok: 3 };
  const sorted = sortBy(items, [(i) => rankStatus[i.status]], ['overrun', -1], ['job', 1], ['cost_code', 1], ['cost_type', 1]);
  const jobs = {};
  for (const i of sorted) { const j = jobs[i.job] = jobs[i.job] || { lines: 0, revised_budget: 0, actual: 0, committed: 0, projected: 0, overrun: 0 }; j.lines++; j.revised_budget = round2(j.revised_budget + i.revised_budget); j.actual = round2(j.actual + i.actual); j.committed = round2(j.committed + (i.committed || 0)); j.projected = round2(j.projected + (i.projected ?? i.actual)); j.overrun = round2(j.overrun + i.overrun); }
  const count = (st) => sorted.filter((i) => i.status === st).length;
  const sumF = (code) => round2(sorted.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const r = {
    lines: lines.size, jobs: jobsInBudget.size, revised_budget: round2(sorted.reduce((a, i) => a + i.revised_budget, 0)), actual: round2(sorted.reduce((a, i) => a + i.actual, 0)),
    over: count('over'), review: count('review'), unbudgeted: count('unbudgeted'), ok: count('ok'),
    overrun: round2(sorted.reduce((a, i) => a + i.overrun, 0)), unbudgeted_cost: sumF('unbudgeted_cost'), no_budget_job_cost: sumF('no_budget_job'),
    actual_from: costRows ? 'cost detail' : 'budget file', settings_used: { variance_pct: s.variance_pct, variance_amount: s.variance_amount, burn_gap_pts: s.burn_gap_pts, tolerance: tol },
    by_job: jobs, by_finding: byFinding(sorted), items: sorted,
  };
  const ahead = sorted.filter((i) => i.findings.some((x) => x.code === 'burn_ahead')).length;
  const math = sorted.filter((i) => i.findings.some((x) => x.code === 'revised_math')).length;
  r.summary = `${r.lines} budget line(s) on ${r.jobs} job(s): ${r.over} over or projected over budget (overrun ${r.overrun}), ${ahead} running ahead of progress, ${math} with budget math errors, ${r.unbudgeted_cost} on codes with no budget, ${r.no_budget_job_cost} on jobs not in the budget.`;
  return r;
}

/** Markdown body of the cost review memo for one job. */
export function memoText(r, job, { to, from } = {}) {
  const items = r.items.filter((i) => jobKey(i.job) === jobKey(job));
  const j = r.by_job[items[0].job];
  const flagged = items.filter((i) => i.status !== 'ok');
  const L = [
    `# Cost review: job ${items[0].job}`, '',
    `**To:** ${to || '[TO CONFIRM project manager]'}`,
    `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    `Revised budget ${j.revised_budget}, cost to date ${j.actual}, projected ${j.projected}, projected overrun ${j.overrun} across ${j.lines} line(s). The lines below need your cost to complete or an explanation before the month closes.`, '',
    '| Line | Budget | To date | Projected | % spent | % complete | Finding |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...flagged.map((i) => `| ${i.line} ${i.name} | ${i.revised_budget} | ${i.actual} | ${i.projected ?? ''} | ${i.percent_spent ?? ''} | ${i.percent_complete ?? ''} | ${i.findings.map((x) => x.detail).join(' ')} |`),
    '', 'Explanation and cost to complete per line: [TO CONFIRM project manager]', '',
    'No budget or cost record was changed. Budget transfers and recodes are entered by accounting after review.',
  ];
  return L.join('\n');
}
