// Fairbuild Schedule of Values: schedule of values against billings and field progress, by job and line. Pure functions, no I/O.
import { num, str, round2, pct, jobKey, statusOf, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

export const SOV_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    ahead_pts: { type: 'number', minimum: 0, maximum: 100, description: 'A line billed more than this many points ahead of field percent complete is flagged (default 10)' },
    behind_pts: { type: 'number', minimum: 0, maximum: 100, description: 'A line billed more than this many points behind field percent complete is flagged (default 10)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['sov_not_equal_contract', 'co_not_on_sov', 'duplicate_item', 'billed_on_zero_line', 'billed_ahead', 'billed_behind', 'no_field_percent'];
const itemKey = (v) => str(v).toUpperCase().replace(/\s+/g, '');

export function checkValues({ sovRows, jobRows = null, changeOrderRows = null, settings = {} }) {
  const tol = num(settings.tolerance) ?? 1; const ahead = num(settings.ahead_pts) ?? 10; const behind = num(settings.behind_pts) ?? 10;
  const items = []; const jobs = new Map();
  const seen = new Map();
  for (const r of sovRows) {
    const job = str(r.job) || '(no job)'; const item = str(r.item); if (!item) continue;
    const k = `${jobKey(job)}|${itemKey(item)}`; seen.set(k, (seen.get(k) || 0) + 1);
  }
  for (const r of sovRows) {
    const job = str(r.job) || '(no job)'; const item = str(r.item); if (!item) continue;
    const f = [];
    const C = num(r.scheduled_value) ?? 0;
    const G = num(r.completed_stored) ?? round2((num(r.previous) || 0) + (num(r.this_period) || 0) + (num(r.stored_materials) || 0));
    const fp = num(r.field_percent);
    const bp = pct(G, C, 2);
    if (seen.get(`${jobKey(job)}|${itemKey(item)}`) > 1) f.push(finding('duplicate_item', null, `Item ${item} appears more than once on job ${job}.`));
    if (C <= tol && G > tol) f.push(finding('billed_on_zero_line', G, `${G} billed on a line with no scheduled value. Move it to a priced line or a change order line.`));
    let earned = null;
    if (fp === null) { if (G > tol) f.push(finding('no_field_percent', null, `${G} billed with no field percent complete to compare it with.`)); }
    else if (C > tol) {
      earned = round2(C * fp / 100);
      if (bp - fp > ahead) f.push(finding('billed_ahead', G - earned, `Billed ${round2(bp)}% (${G}) with ${fp}% in place in the field: ${round2(G - earned)} billed ahead of the work.`));
      else if (fp - bp > behind) f.push(finding('billed_behind', earned - G, `${fp}% is in place in the field but ${round2(bp)}% (${G}) is billed: ${round2(earned - G)} not yet billed.`));
    }
    const j = jobs.get(jobKey(job)) || { job, scheduled: 0, billed: 0, earned: 0, ahead: 0, behind: 0, lines: 0, descriptions: [] };
    j.scheduled = round2(j.scheduled + C); j.billed = round2(j.billed + G); j.earned = round2(j.earned + (earned ?? G)); j.lines++; j.descriptions.push(str(r.description).toUpperCase());
    for (const x of f) { if (x.code === 'billed_ahead') j.ahead = round2(j.ahead + x.amount); if (x.code === 'billed_behind') j.behind = round2(j.behind + x.amount); }
    jobs.set(jobKey(job), j);
    const codes = f.map((x) => x.code);
    const status = codes.includes('billed_ahead') ? 'ahead' : codes.includes('billed_behind') ? 'behind' : f.length ? 'review' : 'ok';
    items.push({ key: `${job} ${item}`, job, item, description: str(r.description), scheduled_value: C, billed: G, billed_percent: bp === null ? null : round2(bp), field_percent: fp, earned, status, findings: orderFindings(f, ORDER) });
  }
  const contract = new Map(); if (jobRows) for (const r of jobRows) { const c = num(r.contract_amount); if (c !== null && str(r.job)) contract.set(jobKey(r.job), c); }
  const cos = new Map(); if (changeOrderRows) for (const r of changeOrderRows) { if (statusOf(r.status) !== 'approved' && statusOf(r.status) !== 'closed') continue; const k = jobKey(r.job); if (!cos.has(k)) cos.set(k, []); cos.get(k).push({ no: str(r.change_order), amount: num(r.amount) || 0 }); }
  for (const [k, j] of jobs) {
    const f = [];
    if (contract.has(k) && Math.abs(contract.get(k) - j.scheduled) > tol) f.push(finding('sov_not_equal_contract', contract.get(k) - j.scheduled, `The schedule of values adds up to ${j.scheduled}; the revised contract is ${contract.get(k)}.`));
    for (const co of cos.get(k) || []) if (co.no && !j.descriptions.some((d) => d.includes(co.no.toUpperCase()))) f.push(finding('co_not_on_sov', co.amount, `Approved change order ${co.no} (${co.amount}) has no line on the schedule of values, so it cannot be billed.`));
    if (f.length) items.push({ key: `${j.job} JOB`, job: j.job, item: 'JOB', description: 'Schedule of values as a whole', scheduled_value: j.scheduled, billed: j.billed, billed_percent: pct(j.billed, j.scheduled), field_percent: null, earned: j.earned, status: 'review', findings: orderFindings(f, ORDER) });
  }
  const rank = { ahead: 0, behind: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['job', 1], [(i) => (i.item === 'JOB' ? -1 : Number.isFinite(Number(i.item)) ? Number(i.item) : 1e9), 1], ['item', 1]);
  const byJob = {}; for (const j of [...jobs.values()].sort((a, b) => (a.job < b.job ? -1 : 1))) byJob[j.job] = { lines: j.lines, scheduled: j.scheduled, billed: j.billed, earned: j.earned, billed_ahead: j.ahead, billed_behind: j.behind, net_over_under: round2(j.billed - j.earned) };
  const count = (st) => out.filter((i) => i.status === st).length;
  const sumF = (code) => round2(out.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const r = {
    jobs: jobs.size, lines: out.filter((i) => i.item !== 'JOB').length, scheduled: round2([...jobs.values()].reduce((a, j) => a + j.scheduled, 0)), billed: round2([...jobs.values()].reduce((a, j) => a + j.billed, 0)),
    billed_ahead: sumF('billed_ahead'), billed_behind: sumF('billed_behind'), co_not_on_sov: sumF('co_not_on_sov'),
    ahead: count('ahead'), behind: count('behind'), review: count('review'), ok: count('ok'), settings_used: { ahead_pts: ahead, behind_pts: behind, tolerance: tol },
    by_job: byJob, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.lines} schedule of values line(s) on ${r.jobs} job(s), ${r.billed} billed of ${r.scheduled}. ${r.ahead} line(s) billed ahead of the field (${r.billed_ahead}), ${r.behind} behind it (${r.billed_behind} not yet billed), ${r.review} to review.`;
  return r;
}

/** Markdown body of the memo to one job's project manager. */
export function memoText(items, { job, to, from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  const L = [`# Schedule of values against the field: job ${job}`, '', `**To:** ${to || '[TO CONFIRM project manager]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    'Before the next pay application, please confirm the field percent complete on these lines, or tell us how the billing should change.', '',
    '| Line | Description | Scheduled | Billed | Billed % | Field % | Finding |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.item} | ${i.description} | ${i.scheduled_value} | ${i.billed} | ${i.billed_percent ?? ''} | ${i.field_percent ?? ''} | ${i.findings.map((f) => f.detail).join(' ')} |`),
    '', 'Field percent confirmed by: [TO CONFIRM project manager]'];
  return { text: L.join('\n'), count: rows.length };
}
