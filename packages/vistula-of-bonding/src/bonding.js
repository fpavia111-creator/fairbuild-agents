// Vistula: bonding capacity from the job list and the limits your surety gave you. Pure functions, no I/O.
//
// Backlog per job = contract - earned revenue (cost to cost). Bonded backlog counts bonded
// jobs only and is compared with your aggregate limit; each bonded contract with your
// single-job limit. Limits are yours to supply; Vistula does not estimate them.
import { num, str, round2, pct, readYesNo, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const BOND_JOB_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  job_name: t(['Job Name', 'Project Name']),
  contract_amount: t(['Contract Amount', 'Revised Contract', 'Contract Value'], { type: 'money' }),
  estimated_cost: t(['Estimated Cost', 'Revised Estimated Cost', 'EAC'], { type: 'money' }),
  cost_to_date: t(['Cost to Date', 'JTD Cost', 'Actual Cost'], { type: 'money' }),
  bonded: t(['Bonded', 'Bond', 'P&P Bond', 'Performance Bond'], { type: 'bool' }),
});
export const PIPELINE_FIELDS = Object.freeze({
  bid: t(['Bid', 'Bid Name', 'Project', 'Opportunity', 'Job Name'], { required: true }),
  amount: t(['Amount', 'Bid Amount', 'Contract Amount', 'Value'], { type: 'money' }),
  bond_required: t(['Bond Required', 'Bonded', 'Bond'], { type: 'bool' }),
});
export const BONDING_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['single_limit', 'aggregate_limit'],
  properties: {
    single_limit: { type: 'number', minimum: 0, description: 'Largest single bonded contract your surety has approved' },
    aggregate_limit: { type: 'number', minimum: 0, description: 'Largest bonded backlog your surety has approved' },
    near_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Bonded backlog above this percent of the aggregate limit is flagged (default 85)' },
    working_capital: { type: 'number', description: 'Working capital from your latest financial statement (shown, not used to compute limits)' },
    net_worth: { type: 'number', description: 'Net worth from your latest financial statement (shown, not used to compute limits)' },
    as_of: { type: 'string', maxLength: 30, description: 'Date of the limits letter or financial statement' },
  },
});
const ORDER = ['over_aggregate', 'near_aggregate', 'single_over', 'pipeline_exceeds', 'bonded_loss'];

export function checkBonding({ jobRows, limits, pipelineRows = null }) {
  const single = num(limits.single_limit); const aggregate = num(limits.aggregate_limit); const nearPct = num(limits.near_pct) ?? 85;
  const items = []; let bondedBacklog = 0; let totalBacklog = 0;
  for (const j of sortBy(jobRows.filter((x) => str(x.job)), [(x) => str(x.job), 1])) {
    const f = []; const contract = num(j.contract_amount) ?? 0; const est = num(j.estimated_cost); const cost = num(j.cost_to_date) ?? 0; const bonded = readYesNo(j.bonded) === true;
    const pc = est ? Math.min(1, cost / est) : 0; const backlog = round2(contract - contract * pc);
    totalBacklog = round2(totalBacklog + backlog); if (bonded) bondedBacklog = round2(bondedBacklog + backlog);
    if (bonded && single !== null && contract > single) f.push(finding('single_over', contract - single, `Bonded contract ${contract} is over your single-job limit of ${single} by ${round2(contract - single)}. Confirm your surety approved it.`));
    if (bonded && est !== null && est > contract) f.push(finding('bonded_loss', round2(est - contract), `Bonded job forecast at a loss of ${round2(est - contract)}. Sureties watch loss jobs; expect questions.`));
    const c = f.map((x) => x.code);
    items.push({ kind: 'job', key: str(j.job), name: str(j.job_name), bonded, contract_amount: contract, percent_complete: round2(pc * 100), backlog, status: c.includes('single_over') ? 'over' : f.length ? 'review' : 'ok', findings: orderFindings(f, ORDER) });
  }
  const room = aggregate !== null ? round2(aggregate - bondedBacklog) : null; const used = aggregate ? pct(bondedBacklog, aggregate) : null;
  const pf = [];
  if (aggregate !== null && bondedBacklog > aggregate) pf.push(finding('over_aggregate', bondedBacklog - aggregate, `Bonded backlog ${bondedBacklog} is over your aggregate limit of ${aggregate}.`));
  else if (used !== null && used >= nearPct) pf.push(finding('near_aggregate', null, `Bonded backlog ${bondedBacklog} is ${used}% of your aggregate limit of ${aggregate}; ${room} left.`));
  if (pf.length) items.push({ kind: 'program', key: 'PROGRAM', name: 'Bonding program', bonded: true, contract_amount: null, percent_complete: null, backlog: bondedBacklog, status: pf.some((x) => x.code === 'over_aggregate') ? 'over' : 'review', findings: pf });
  let cum = bondedBacklog;
  if (pipelineRows) for (const b of sortBy(pipelineRows.filter((x) => str(x.bid)), [(x) => str(x.bid), 1])) {
    const f = []; const amount = num(b.amount) ?? 0; const need = readYesNo(b.bond_required) === true;
    if (need) {
      if (single !== null && amount > single) f.push(finding('single_over', amount - single, `Bid ${amount} is over your single-job limit of ${single}.`));
      const before = cum; cum = round2(cum + amount);
      if (aggregate !== null && cum > aggregate) f.push(finding('pipeline_exceeds', Math.min(amount, round2(cum - aggregate)), `With this bid (and the bonded bids listed before it) bonded backlog would be ${cum}, ${round2(cum - aggregate)} over your aggregate limit; ${round2(Math.max(0, aggregate - before))} was left.`));
    }
    items.push({ kind: 'bid', key: str(b.bid), name: str(b.bid), bonded: need, contract_amount: amount, percent_complete: 0, backlog: amount, status: f.length ? 'exceeds' : 'ok', findings: orderFindings(f, ORDER) });
  }
  const rank = { over: 0, exceeds: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['kind', -1], ['key', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    jobs: out.filter((i) => i.kind === 'job').length, bonded_jobs: out.filter((i) => i.kind === 'job' && i.bonded).length, total_backlog: totalBacklog, bonded_backlog: bondedBacklog,
    single_limit: single, aggregate_limit: aggregate, aggregate_used_pct: used, aggregate_left: room, largest_bonded_contract: Math.max(0, ...out.filter((i) => i.kind === 'job' && i.bonded).map((i) => i.contract_amount)),
    bonded_bids: round2(out.filter((i) => i.kind === 'bid' && i.bonded).reduce((a, i) => a + i.contract_amount, 0)), working_capital: num(limits.working_capital), net_worth: num(limits.net_worth), limits_as_of: limits.as_of || null,
    over: count('over'), exceeds: count('exceeds'), review: count('review'), ok: count('ok'),
    capacity: [{ single_limit: single, aggregate_limit: aggregate, bonded_backlog: bondedBacklog, aggregate_used_pct: used, aggregate_left: room }],
    by_finding: byFinding(out), items: out,
  };
  r.summary = `Bonded backlog ${bondedBacklog} on ${r.bonded_jobs} job(s) is ${used ?? '?'}% of your ${aggregate ?? '?'} aggregate limit (${room ?? '?'} left). ${r.over} over a limit, ${r.exceeds} bid(s) that would not fit, ${r.review} to review.`;
  return r;
}

/** Markdown body of the bonding summary for your surety broker. */
export function summaryText(r, { to, from }) {
  const L = ['# Bonding capacity summary', '', `**To:** ${to || '[TO CONFIRM surety broker]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `Bonded backlog: ${r.bonded_backlog} on ${r.bonded_jobs} job(s); total backlog ${r.total_backlog}. Aggregate limit ${r.aggregate_limit}, single-job limit ${r.single_limit}${r.limits_as_of ? ` (as of ${r.limits_as_of})` : ''}.`, '',
    `Working capital: ${r.working_capital ?? '[TO CONFIRM from the financial statement]'}. Net worth: ${r.net_worth ?? '[TO CONFIRM from the financial statement]'}.`, '',
    '| Item | Contract | Backlog | Note |', '| --- | --- | --- | --- |', ...r.items.filter((i) => i.bonded).map((i) => `| ${i.kind} ${i.key} | ${i.contract_amount ?? ''} | ${i.backlog} | ${i.findings.map((f) => f.detail).join(' ')} |`), '',
    'Financial statements and WIP schedule: [ATTACH]'];
  return L.join('\n');
}
