// Loire: the work-in-progress schedule by the cost-to-cost method. Pure functions, no I/O.
//
// percent complete = cost to date / estimated total cost (capped at 100%)
// earned revenue   = contract × percent complete
// over / under     = billed to date - earned revenue (positive: billings in excess of earnings)
// loss provision   = on a job whose estimated cost exceeds its contract, the part of the
//                    expected loss not yet recognised: (1 - percent complete) × (estimated cost - contract)
import { num, str, round2, pct, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const WIP_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Job No', 'Project', 'Project Number', 'Contract'], { required: true }),
  job_name: t(['Job Name', 'Project Name', 'Description']),
  contract_amount: t(['Contract Amount', 'Revised Contract', 'Revised Contract Amount', 'Contract Value', 'Current Contract'], { type: 'money' }),
  estimated_cost: t(['Estimated Cost', 'Revised Estimated Cost', 'Total Estimated Cost', 'Estimated Cost at Completion', 'EAC', 'Projected Cost'], { type: 'money' }),
  cost_to_date: t(['Cost to Date', 'Job to Date Cost', 'JTD Cost', 'Actual Cost', 'Costs Incurred'], { type: 'money' }),
  billed_to_date: t(['Billed to Date', 'Billings to Date', 'Total Billed', 'JTD Billed', 'Billed'], { type: 'money' }),
});
export const WIP_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    under_alert_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Under billings above this percent of the contract are flagged for collection follow-up (default 5)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['loss_job', 'no_estimate', 'cost_exceeds_estimate', 'billed_over_contract', 'under_billed_large'];

export function buildWip({ rows, settings = {}, periodEnd }) {
  const tol = num(settings.tolerance) ?? 1; const alert = num(settings.under_alert_pct) ?? 5;
  const byJob = new Map();
  for (const r of rows) { const j = str(r.job); if (!j) continue; const e = byJob.get(j.toUpperCase()) || { job: j, name: str(r.job_name), contract: 0, est: 0, cost: 0, billed: 0, hasEst: false }; e.contract = round2(e.contract + (num(r.contract_amount) || 0)); const est = num(r.estimated_cost); if (est !== null) { e.est = round2(e.est + est); e.hasEst = true; } e.cost = round2(e.cost + (num(r.cost_to_date) || 0)); e.billed = round2(e.billed + (num(r.billed_to_date) || 0)); if (!e.name) e.name = str(r.job_name); byJob.set(j.toUpperCase(), e); }
  const items = [];
  for (const e of byJob.values()) {
    const f = [];
    let percent = null, earned = null, overUnder = null, provision = 0;
    if (!e.hasEst || e.est <= 0) { if (e.cost > tol || e.billed > tol) f.push(finding('no_estimate', null, `Cost ${e.cost} and billings ${e.billed} with no estimated total cost: percent complete cannot be measured. Enter the estimate.`)); }
    else {
      const raw = e.cost / e.est;
      if (raw > 1 + 1e-9) f.push(finding('cost_exceeds_estimate', e.cost - e.est, `Cost to date ${e.cost} is past the estimated total cost ${e.est}. Update the estimate; percent complete is held at 100% until then.`));
      percent = Math.min(1, raw);
      earned = round2(e.contract * percent); overUnder = round2(e.billed - earned);
      if (e.est - e.contract > tol) { provision = round2((1 - percent) * (e.est - e.contract)); f.push(finding('loss_job', provision, `Estimated cost ${e.est} exceeds the contract ${e.contract}: an expected loss of ${round2(e.est - e.contract)}, of which ${round2(percent * (e.est - e.contract))} is already in gross profit to date; ${provision} more is to be recognised now.`)); }
      if (overUnder < -tol && e.contract > 0 && -overUnder / e.contract * 100 > alert) f.push(finding('under_billed_large', -overUnder, `Under billed ${round2(-overUnder)} (${pct(-overUnder, e.contract)}% of the contract): earned ${earned}, billed ${e.billed}. Bill the work in place or check the cost to date for misposted cost.`));
    }
    if (e.billed - e.contract > tol) f.push(finding('billed_over_contract', e.billed - e.contract, `Billed ${e.billed} is more than the contract ${e.contract}. A change order may be missing from the contract amount.`));
    const codes = f.map((x) => x.code);
    const status = codes.includes('loss_job') ? 'loss' : f.length ? 'review' : 'ok';
    items.push({ job: e.job, job_name: e.name, contract_amount: e.contract, estimated_cost: e.hasEst ? e.est : null, estimated_gross_profit: e.hasEst ? round2(e.contract - e.est) : null, cost_to_date: e.cost, percent_complete: percent === null ? null : round2(percent * 100), earned_revenue: earned, billed_to_date: e.billed, over_billed: overUnder !== null && overUnder > 0 ? overUnder : 0, under_billed: overUnder !== null && overUnder < 0 ? -overUnder : 0, gross_profit_to_date: earned === null ? null : round2(earned - e.cost), loss_provision: provision, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { loss: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1]);
  const s = (k) => round2(out.reduce((a, i) => a + (i[k] || 0), 0));
  const r = {
    period_end: periodEnd, jobs: out.length, contract: s('contract_amount'), estimated_cost: s('estimated_cost'), cost_to_date: s('cost_to_date'), earned_revenue: s('earned_revenue'), billed_to_date: s('billed_to_date'),
    over_billings: s('over_billed'), under_billings: s('under_billed'), net_over_under: round2(s('over_billed') - s('under_billed')), loss_provision: s('loss_provision'), gross_profit_to_date: s('gross_profit_to_date'),
    loss: out.filter((i) => i.status === 'loss').length, review: out.filter((i) => i.status === 'review').length, ok: out.filter((i) => i.status === 'ok').length,
    settings_used: { under_alert_pct: alert, tolerance: tol }, by_finding: byFinding(out), items: out,
  };
  r.summary = `WIP at ${periodEnd}: ${r.jobs} job(s), earned ${r.earned_revenue} against billed ${r.billed_to_date}. Over billings ${r.over_billings}, under billings ${r.under_billings} (net ${r.net_over_under}). Loss provision ${r.loss_provision} on ${r.loss} job(s); ${r.review} job(s) to review.`;
  return r;
}

/** Markdown body of the month-end over/under billing journal (draft). */
export function journalText(r, { prepared_by }) {
  const L = [`# Over and under billing journal, period ending ${r.period_end}`, '', `**Prepared by:** ${prepared_by || '[TO CONFIRM your name]'}`, '**Reviewed by:** [TO CONFIRM reviewer]', '',
    'Adjust the balances to the WIP schedule below. Reverse last month\'s entry first if that is how your books carry it [TO CONFIRM reversal method].', '',
    '| Account | Debit | Credit |', '| --- | --- | --- |',
    `| Costs and estimated earnings in excess of billings (asset) | ${r.under_billings} | |`,
    `| Billings in excess of costs and estimated earnings (liability) | | ${r.over_billings} |`,
    `| Contract revenue (net) | ${r.over_billings > r.under_billings ? round2(r.over_billings - r.under_billings) : ''} | ${r.under_billings > r.over_billings ? round2(r.under_billings - r.over_billings) : ''} |`,
    ...(r.loss_provision ? [`| Provision for anticipated losses (cost) | ${r.loss_provision} | |`, `| Accrued loss on contracts (liability) | | ${r.loss_provision} |`] : []),
    '', '| Job | Earned | Billed | Over | Under | Loss provision |', '| --- | --- | --- | --- | --- | --- |',
    ...r.items.map((i) => `| ${i.job} | ${i.earned_revenue ?? 'n/a'} | ${i.billed_to_date} | ${i.over_billed} | ${i.under_billed} | ${i.loss_provision} |`),
    '', 'Account names and numbers: [TO CONFIRM your chart of accounts]. Nothing has been posted.'];
  return L.join('\n');
}
