// Limpopo: backlog and margin fade from month-end job history. Pure functions, no I/O.
//
// Per job and period: estimated gross profit = contract - estimated cost, margin % = GP / contract.
// Fade = margin at the first period on file minus margin at the latest (percentage points).
// Backlog = contract - earned revenue (cost to cost) at the latest period.
import { num, str, round2, pct, monthKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const HISTORY_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  period: t(['Period', 'Month', 'Period End', 'As Of', 'Fiscal Period'], { required: true }),
  contract_amount: t(['Contract Amount', 'Revised Contract', 'Contract Value'], { type: 'money' }),
  estimated_cost: t(['Estimated Cost', 'Revised Estimated Cost', 'Estimated Cost at Completion', 'EAC'], { type: 'money' }),
  cost_to_date: t(['Cost to Date', 'JTD Cost', 'Actual Cost'], { type: 'money' }),
});
export const FADE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    fade_pts: { type: 'number', minimum: 0, maximum: 100, description: 'Margin drop, in percentage points, that counts as fade (default 2)' },
    gain_pts: { type: 'number', minimum: 0, maximum: 100, description: 'Margin rise, in points, worth a second look (default 4)' },
    stale_move_pts: { type: 'number', minimum: 0, maximum: 100, description: 'An estimate unchanged for three periods while percent complete moved more than this many points is flagged (default 20)' },
  },
});
const ORDER = ['loss_forecast', 'margin_fade', 'fade_since_last', 'margin_gain', 'estimate_not_updated'];
const periodOf = (v) => { const s = str(v); return /^\d{4}-\d{2}$/.test(s) ? s : monthKey(s); };

export function checkBacklog({ rows, settings = {} }) {
  const fadePts = num(settings.fade_pts) ?? 2; const gainPts = num(settings.gain_pts) ?? 4; const stalePts = num(settings.stale_move_pts) ?? 20;
  const jobs = new Map();
  for (const r of rows) { const j = str(r.job); const p = periodOf(r.period); if (!j || !p) continue; if (!jobs.has(j.toUpperCase())) jobs.set(j.toUpperCase(), { job: j, periods: new Map() }); jobs.get(j.toUpperCase()).periods.set(p, { period: p, contract: num(r.contract_amount) ?? 0, est: num(r.estimated_cost), cost: num(r.cost_to_date) ?? 0 }); }
  const items = [];
  for (const j of jobs.values()) {
    const ps = [...j.periods.values()].sort((a, b) => (a.period < b.period ? -1 : 1));
    const first = ps[0], last = ps.at(-1), prev = ps.length > 1 ? ps.at(-2) : null;
    const m = (x) => (x && x.est !== null && x.contract ? pct(x.contract - x.est, x.contract, 2) : null);
    const gp = (x) => (x && x.est !== null ? round2(x.contract - x.est) : null);
    const pc = (x) => (x && x.est ? Math.min(1, x.cost / x.est) : null);
    const f = []; const mf = m(first), ml = m(last), mp = m(prev);
    if (ml !== null && ml < 0) f.push(finding('loss_forecast', gp(last), `Forecast at a loss: estimated cost ${last.est} on a contract of ${last.contract} (${ml}%).`));
    if (mf !== null && ml !== null && mf - ml > fadePts) f.push(finding('margin_fade', round2(gp(first) - gp(last)), `Margin has faded from ${mf}% (${first.period}) to ${ml}% (${last.period}), ${round2(mf - ml)} points: estimated gross profit down ${round2(gp(first) - gp(last))}.`));
    if (mp !== null && ml !== null && mp - ml > fadePts && prev !== first) f.push(finding('fade_since_last', round2(gp(prev) - gp(last)), `Down ${round2(mp - ml)} points since ${prev.period} alone.`));
    if (mf !== null && ml !== null && ml - mf > gainPts) f.push(finding('margin_gain', null, `Margin has risen from ${mf}% to ${ml}%, ${round2(ml - mf)} points. Check the estimate to complete is real and no cost is missing or misposted.`));
    if (ps.length >= 3) { const last3 = ps.slice(-3); if (last3.every((x) => x.est === last3[0].est) && pc(last3[2]) !== null && (pc(last3[2]) - pc(last3[0])) * 100 > stalePts) f.push(finding('estimate_not_updated', null, `Estimated cost has stayed at ${last3[0].est} for three periods while the job went from ${round2(pc(last3[0]) * 100)}% to ${round2(pc(last3[2]) * 100)}% complete. Ask for a reforecast.`)); }
    const pcl = pc(last); const earned = pcl === null ? null : round2(last.contract * pcl); const backlog = earned === null ? last.contract : round2(last.contract - earned);
    const remainingGp = pcl === null || gp(last) === null ? null : round2((1 - pcl) * gp(last));
    const codes = f.map((x) => x.code);
    const status = codes.some((x) => ['loss_forecast', 'margin_fade', 'fade_since_last'].includes(x)) ? 'fade' : f.length ? 'review' : 'ok';
    items.push({ job: j.job, periods: ps.length, first_period: first.period, latest_period: last.period, contract_amount: last.contract, estimated_cost: last.est, first_margin_pct: mf, latest_margin_pct: ml, fade_pts: mf !== null && ml !== null ? round2(mf - ml) : null, percent_complete: pcl === null ? null : round2(pcl * 100), earned_revenue: earned, backlog, backlog_gross_profit: remainingGp, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { fade: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], [(i) => -(i.fade_pts ?? 0), 1], ['job', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const s = (k) => round2(out.reduce((a, i) => a + (i[k] || 0), 0));
  const latest = out.reduce((a, i) => (i.latest_period > a ? i.latest_period : a), '');
  const r = {
    jobs: out.length, latest_period: latest, backlog: s('backlog'), backlog_gross_profit: s('backlog_gross_profit'), backlog_margin_pct: pct(s('backlog_gross_profit'), s('backlog')),
    fade_amount: round2(out.flatMap((i) => i.findings).filter((x) => x.code === 'margin_fade').reduce((a, x) => a + (x.amount || 0), 0)), fade: count('fade'), review: count('review'), ok: count('ok'),
    settings_used: { fade_pts: fadePts, gain_pts: gainPts, stale_move_pts: stalePts }, by_finding: byFinding(out), items: out,
  };
  r.summary = `Backlog at ${latest}: ${r.backlog} on ${r.jobs} job(s), ${r.backlog_gross_profit} gross profit in it (${r.backlog_margin_pct}%). ${r.fade} job(s) with margin fade or a loss forecast (${r.fade_amount} of estimated gross profit lost), ${r.review} to review.`;
  return r;
}

/** Markdown body of the backlog memo. */
export function memoText(r, { to, from }) {
  const L = [`# Backlog and margin fade, ${r.latest_period}`, '', `**To:** ${to || '[TO CONFIRM owner or CFO]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    `Backlog ${r.backlog} with ${r.backlog_gross_profit} of gross profit in it (${r.backlog_margin_pct}%). Estimated gross profit lost to fade since the first estimate: ${r.fade_amount}.`, '',
    '| Job | First margin % | Latest margin % | Fade (points) | Backlog | Finding |', '| --- | --- | --- | --- | --- | --- |',
    ...r.items.filter((i) => i.status !== 'ok').map((i) => `| ${i.job} | ${i.first_margin_pct ?? ''} | ${i.latest_margin_pct ?? ''} | ${i.fade_pts ?? ''} | ${i.backlog} | ${i.findings.map((f) => f.detail).join(' ')} |`),
    '', 'Cause of fade per job (from the project managers): [TO CONFIRM]'];
  return L.join('\n');
}
