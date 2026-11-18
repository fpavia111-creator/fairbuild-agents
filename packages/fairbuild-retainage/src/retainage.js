// Fairbuild Retainage: retainage receivable (owners hold from you) and payable (you hold from subcontractors). Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, statusOf, jobKey, COMMITMENT_FIELDS, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
/** Retainage receivable: one row per job (prime contract). */
export const RECEIVABLE_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number', 'Contract'], { required: true }),
  client: t(['Owner', 'Customer', 'Client', 'Customer Name']),
  contract_amount: t(['Contract Amount', 'Revised Contract', 'Contract Value'], { type: 'money' }),
  billed_to_date: t(['Billed to Date', 'Total Billed', 'Completed and Stored to Date', 'Billed'], { type: 'money' }),
  retainage_pct: t(['Retainage Percent', 'Retainage Rate', 'Retention Rate', 'Retainage %'], { type: 'number' }),
  retainage_held: t(['Retainage Held', 'Retainage', 'Retention', 'Retainage Balance', 'Retainage Receivable'], { type: 'money' }),
  stop_at_percent: t(['Retainage Stops At', 'Stop At Percent', 'Retainage Cap Percent'], { type: 'number' }),
  retainage_billed: t(['Retainage Billed', 'Release Billed', 'Retainage Invoiced'], { type: 'money' }),
  retainage_collected: t(['Retainage Collected', 'Retainage Received', 'Release Received'], { type: 'money' }),
  completion_date: t(['Completion Date', 'Substantial Completion', 'Final Completion', 'Completed'], { type: 'date' }),
  percent_complete: t(['Percent Complete', '% Complete', 'Pct Complete'], { type: 'number' }),
});
/** Retainage payable: subcontracts with what you hold and what you have released. */
export const PAYABLE_FIELDS = Object.freeze({ ...COMMITMENT_FIELDS, retainage_released: t(['Retainage Released', 'Retainage Paid', 'Released'], { type: 'money' }) });

export const RETAINAGE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    release_days: { type: 'integer', minimum: 0, maximum: 3650, description: 'Retainage on a completed job not billed within this many days of completion is overdue (default 60)' },
    collect_days: { type: 'integer', minimum: 0, maximum: 3650, description: 'A billed release not collected within this many days of completion is flagged (default 90)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['rate_off', 'over_withheld', 'release_overdue', 'release_due', 'release_unpaid', 'released_before_owner', 'release_owed_to_sub'];

export function checkRetainage({ receivableRows = [], payableRows = [], settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const releaseDays = num(settings.release_days) ?? 60; const collectDays = num(settings.collect_days) ?? 90;
  const jobs = new Map();
  const items = [];
  for (const r of receivableRows) {
    const job = str(r.job); if (!job) continue;
    const f = [];
    const contract = num(r.contract_amount); const billed = num(r.billed_to_date) ?? 0; const p = num(r.retainage_pct); const held = num(r.retainage_held) ?? 0;
    const relBilled = num(r.retainage_billed) ?? 0; const collected = num(r.retainage_collected) ?? 0; const stop = num(r.stop_at_percent);
    const done = isoDate(r.completion_date); const since = done ? daysBetween(done, asOf) : null;
    if (p !== null) {
      const base = stop !== null && contract !== null ? Math.min(billed, contract * stop / 100) : billed;
      const want = round2(base * p / 100);
      if (held - want > tol) f.push(finding('over_withheld', held - want, `The owner holds ${held}; ${p}% of ${round2(base)}${stop !== null ? ` (retainage stops at ${stop}% of the contract)` : ''} is ${want}. Ask for the difference on the next pay application.`));
      else if (want - held > tol) f.push(finding('rate_off', want - held, `Retainage recorded is ${held}; ${p}% of ${round2(base)} billed is ${want}. Check the pay applications or the contract rate.`));
    }
    const outstanding = round2(held - collected);
    if (since !== null && since >= 0 && held - relBilled > tol) f.push(since > releaseDays ? finding('release_overdue', held - relBilled, `Completed ${done}, ${since} days ago; ${round2(held - relBilled)} of retainage has not been billed for release.`) : finding('release_due', held - relBilled, `Completed ${done}; ${round2(held - relBilled)} of retainage can be billed for release once the closeout documents are in.`));
    if (relBilled - collected > tol && since !== null && since > collectDays) f.push(finding('release_unpaid', relBilled - collected, `${relBilled} of retainage was billed for release and ${collected} collected; ${since} days since completion.`));
    jobs.set(jobKey(job), { job, collected_all: held > 0 && collected >= held - tol, collected, held });
    items.push({ side: 'receivable', key: job, job, party: str(r.client), base: billed, retainage_pct: p, held, released: collected, outstanding, completion: done, status: '', findings: orderFindings(f, ORDER) });
  }
  for (const r of payableRows) {
    const id = str(r.commitment); if (!id) continue;
    const f = [];
    const inv = num(r.invoiced) ?? 0; const p = num(r.retainage_pct); const held = num(r.retainage_held) ?? 0; const released = num(r.retainage_released) ?? 0;
    const st = statusOf(r.status); const closed = st === 'closed';
    if (p !== null) { const want = round2(inv * p / 100); if (Math.abs(want - held) > tol) f.push(finding('rate_off', held - want, `You hold ${held} from ${str(r.vendor)}; ${p}% of ${inv} invoiced is ${want}.`)); }
    const owner = jobs.get(jobKey(r.job));
    if (released > tol && owner && !owner.collected_all) f.push(finding('released_before_owner', null, `${released} of retainage was released to ${str(r.vendor)} while the owner still holds ${round2(owner.held - owner.collected)} on job ${owner.job}. Check the subcontract's pay-when-paid terms; this is cash out ahead of cash in.`));
    if (closed && held - released > tol && owner && owner.collected_all) f.push(finding('release_owed_to_sub', held - released, `The owner has paid the retainage on job ${owner.job} and ${str(r.vendor)}'s subcontract is closed; ${round2(held - released)} of their retainage is still held.`));
    items.push({ side: 'payable', key: id, job: str(r.job), party: str(r.vendor), base: inv, retainage_pct: p, held, released, outstanding: round2(held - released), completion: null, status: '', findings: orderFindings(f, ORDER) });
  }
  for (const i of items) {
    const c = i.findings.map((x) => x.code);
    i.status = c.some((x) => ['release_overdue', 'release_due', 'release_unpaid'].includes(x)) ? 'collect' : c.includes('release_owed_to_sub') ? 'pay' : c.length ? 'review' : 'ok';
  }
  const rank = { collect: 0, pay: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['side', -1], ['job', 1], ['key', 1]);
  const recv = {}; const pay = {};
  for (const i of out) {
    if (i.side === 'receivable') recv[i.job] = { client: i.party, held: i.held, collected: i.released, outstanding: i.outstanding };
    else { const v = pay[i.party] = pay[i.party] || { subcontracts: 0, held: 0, released: 0, outstanding: 0 }; v.subcontracts++; v.held = round2(v.held + i.held); v.released = round2(v.released + i.released); v.outstanding = round2(v.outstanding + i.outstanding); }
  }
  const sumF = (code) => round2(out.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const receivable = round2(out.filter((i) => i.side === 'receivable').reduce((a, i) => a + i.outstanding, 0));
  const payable = round2(out.filter((i) => i.side === 'payable').reduce((a, i) => a + i.outstanding, 0));
  const r = {
    jobs: out.filter((i) => i.side === 'receivable').length, subcontracts: out.filter((i) => i.side === 'payable').length,
    receivable, payable, net: round2(receivable - payable), to_bill: round2(sumF('release_overdue') + sumF('release_due')), to_collect: sumF('release_unpaid'), owed_to_subs: sumF('release_owed_to_sub'), over_withheld: sumF('over_withheld'),
    collect: count('collect'), pay: count('pay'), review: count('review'), ok: count('ok'), as_of: asOf, settings_used: { release_days: releaseDays, collect_days: collectDays, tolerance: tol },
    receivable_by_job: recv, payable_by_vendor: pay, by_finding: byFinding(out), items: out,
  };
  r.summary = `Owners hold ${r.receivable} of your retainage on ${r.jobs} job(s); you hold ${r.payable} from ${r.subcontracts} subcontract(s) (net ${r.net}). ${r.to_bill} can be billed for release, ${r.to_collect} billed and not collected, ${r.owed_to_subs} now owed to subcontractors, ${r.review} to review.`;
  return r;
}

/** Markdown body of a retainage release request to the owner of one job. */
export function releaseText(i, { to, from }) {
  const due = round2((i.findings.find((f) => ['release_overdue', 'release_due'].includes(f.code)) || { amount: 0 }).amount);
  const L = [`# Retainage release request: job ${i.job}`, '', `**To:** ${to || i.party || '[TO CONFIRM owner]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `The work on job ${i.job} reached completion on ${i.completion}. Under the contract, we request release of the retainage held: ${due}.`, '',
    `Billed to date: ${i.base}. Retainage rate: ${i.retainage_pct ?? '[TO CONFIRM]'}%. Retainage held: ${i.held}.`, '',
    'Enclosed: [ATTACH final lien waivers, warranties, O&M manuals and as-builts required by the contract]', '',
    'Please confirm the release date or tell us what is still needed.'];
  return { text: L.join('\n'), amount: due };
}
