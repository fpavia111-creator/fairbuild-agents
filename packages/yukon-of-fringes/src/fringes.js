// Yukon: union fringe remittances by local, fund and month. Pure functions, no I/O.
import { num, str, round2, isoDate, monthKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const HOURS_FIELDS = Object.freeze({
  union: t(['Union', 'Local', 'Union Local', 'Local Union'], { required: true }),
  worker: t(['Worker', 'Employee', 'Employee Name', 'Name']),
  worker_id: t(['Worker ID', 'Employee ID', 'Employee Number']),
  month: t(['Month', 'Work Month', 'Period', 'Pay Period', 'Date', 'Week Ending']),
  hours: t(['Hours', 'Hours Worked', 'Total Hours', 'Reportable Hours'], { type: 'number' }),
});
export const FUND_RATE_FIELDS = Object.freeze({
  union: t(['Union', 'Local', 'Union Local'], { required: true }),
  union_fund: t(['Fund', 'Fund Name', 'Benefit', 'Benefit Fund'], { required: true }),
  rate: t(['Rate', 'Rate per Hour', 'Contribution Rate', 'Hourly Rate'], { type: 'money' }),
});
export const REMITTANCE_FIELDS = Object.freeze({
  union: t(['Union', 'Local', 'Union Local'], { required: true }),
  union_fund: t(['Fund', 'Fund Name', 'Benefit']),
  month: t(['Month', 'Work Month', 'Period', 'Contribution Month']),
  hours_reported: t(['Hours Reported', 'Hours', 'Reported Hours'], { type: 'number' }),
  amount: t(['Amount', 'Amount Remitted', 'Remitted', 'Contribution', 'Paid'], { type: 'money' }),
  remitted_date: t(['Remitted Date', 'Date Paid', 'Paid Date', 'Date Remitted', 'Payment Date'], { type: 'date' }),
});
export const FRINGE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    due_day: { type: 'integer', minimum: 1, maximum: 31, description: 'Remittances are due on this day of the month after the work month (default 15)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['not_remitted', 'under_remitted', 'no_rate', 'hours_mismatch', 'over_remitted', 'late'];
const k = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');
const monthOf = (v) => { const s = str(v); if (/^\d{4}-\d{2}$/.test(s)) return s; return monthKey(s); };
const dueDate = (month, day) => { const [y, m] = month.split('-').map(Number); const nm = m === 12 ? 1 : m + 1; const ny = m === 12 ? y + 1 : y; const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate(); return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(day, last)).padStart(2, '0')}`; };

export function checkFringes({ hourRows, rateRows, remittanceRows, settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const dueDay = num(settings.due_day) ?? 15;
  const hours = new Map(); const workers = new Map();
  for (const h of hourRows) { const u = str(h.union); const m = monthOf(h.month); if (!u || !m) continue; const key = `${k(u)}|${m}`; const e = hours.get(key) || { union: u, month: m, hours: 0 }; e.hours = round2(e.hours + (num(h.hours) || 0)); hours.set(key, e); const w = workers.get(key) || new Set(); w.add(k(h.worker || h.worker_id)); workers.set(key, w); }
  const funds = new Map(); for (const r of rateRows) { const u = k(r.union); if (!u) continue; if (!funds.has(u)) funds.set(u, []); funds.get(u).push({ fund: str(r.union_fund), rate: num(r.rate) ?? 0 }); }
  const remit = new Map(); for (const r of remittanceRows) { const m = monthOf(r.month); if (!m) continue; const key = `${k(r.union)}|${k(r.union_fund)}|${m}`; const e = remit.get(key) || { amount: 0, hours: null, date: null }; e.amount = round2(e.amount + (num(r.amount) || 0)); const hr = num(r.hours_reported); if (hr !== null) e.hours = round2((e.hours || 0) + hr); const d = isoDate(r.remitted_date); if (d && (!e.date || d > e.date)) e.date = d; remit.set(key, e); }
  const items = [];
  for (const [hk, h] of hours) {
    const list = funds.get(k(h.union));
    const nWorkers = (workers.get(hk) || new Set()).size;
    if (!list) { items.push({ key: `${h.union} ${h.month}`, union: h.union, fund: '', month: h.month, workers: nWorkers, hours: h.hours, rate: null, due: null, remitted: 0, hours_reported: null, due_date: dueDate(h.month, dueDay), remitted_date: null, difference: 0, status: 'review', findings: [finding('no_rate', null, `${h.hours} hour(s) for ${h.union} in ${h.month} and no fund rates for this local. Add its rates to check the remittance.`)] }); continue; }
    for (const fnd of list) {
      const f = []; const due = round2(h.hours * fnd.rate); const rkey = `${k(h.union)}|${k(fnd.fund)}|${h.month}`; const r = remit.get(rkey); const dd = dueDate(h.month, dueDay);
      if (!r) { if (asOf > dd) f.push(finding('not_remitted', due, `Nothing remitted to ${fnd.fund} for ${h.month}: ${h.hours} hours at ${fnd.rate} is ${due}, due ${dd}.`)); }
      else {
        if (due - r.amount > tol) f.push(finding('under_remitted', due - r.amount, `Remitted ${r.amount}; ${h.hours} hours at ${fnd.rate} is ${due}.`));
        else if (r.amount - due > tol) f.push(finding('over_remitted', r.amount - due, `Remitted ${r.amount}; ${h.hours} hours at ${fnd.rate} is ${due}. Ask the fund for a credit or apply it to next month.`));
        if (r.hours !== null && Math.abs(r.hours - h.hours) > 0.01) f.push(finding('hours_mismatch', null, `The remittance reports ${r.hours} hours; payroll shows ${h.hours}.`));
        if (r.date && r.date > dd) f.push(finding('late', null, `Remitted ${r.date}, after the due date ${dd}. Check the agreement for liquidated damages or interest.`));
      }
      const codes = f.map((x) => x.code);
      const status = codes.some((x) => ['not_remitted', 'under_remitted'].includes(x)) ? 'short' : f.length ? 'review' : r || asOf > dd ? 'ok' : 'not_due';
      items.push({ key: `${h.union} ${fnd.fund} ${h.month}`, union: h.union, fund: fnd.fund, month: h.month, workers: nWorkers, hours: h.hours, rate: fnd.rate, due, remitted: r ? r.amount : 0, hours_reported: r ? r.hours : null, due_date: dd, remitted_date: r ? r.date : null, difference: round2((r ? r.amount : 0) - due), status, findings: orderFindings(f, ORDER) });
    }
  }
  const rank = { short: 0, review: 1, not_due: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['union', 1], ['fund', 1], ['month', 1]);
  const byFund = {}; for (const i of out) { const key = `${i.union} ${i.fund}`.trim(); const e = byFund[key] = byFund[key] || { months: 0, due: 0, remitted: 0, short: 0 }; e.months++; e.due = round2(e.due + (i.due || 0)); e.remitted = round2(e.remitted + i.remitted); if (i.status === 'short') e.short = round2(e.short + (i.due || 0) - i.remitted); }
  const sumF = (code) => round2(out.flatMap((i) => i.findings).filter((x) => x.code === code).reduce((a, x) => a + (x.amount || 0), 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    remittances: out.length, unions: new Set(out.map((i) => k(i.union))).size, due: round2(out.reduce((a, i) => a + (i.due || 0), 0)), remitted: round2(out.reduce((a, i) => a + i.remitted, 0)),
    short: round2(sumF('under_remitted') + sumF('not_remitted')), over: sumF('over_remitted'), short_count: count('short'), review: count('review'), not_due: count('not_due'), ok: count('ok'), as_of: asOf,
    settings_used: { due_day: dueDay, tolerance: tol }, by_fund: byFund, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.remittances} fund-month(s) for ${r.unions} local(s): ${r.due} due, ${r.remitted} remitted. ${r.short_count} short by ${r.short} in total, ${r.over} over, ${r.review} to review.`;
  return r;
}

/** Markdown body of a letter to one fund administrator. */
export function letterText(items, { union, fund, to, from }) {
  const rows = items.filter((i) => i.status !== 'ok' && i.status !== 'not_due');
  const L = [`# Fringe remittance: ${union}${fund ? ` ${fund}` : ''}`, '', `**To:** ${to || '[TO CONFIRM fund administrator]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'We reconciled our remittances with our payroll hours and found the differences below. [TO CONFIRM how the difference will be settled: a corrected report, a payment, or a credit]', '',
    '| Fund | Month | Hours | Rate | Due | Remitted | Difference |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.fund} | ${i.month} | ${i.hours} | ${i.rate ?? ''} | ${i.due ?? ''} | ${i.remitted} | ${i.difference} |`), ''];
  return { text: L.join('\n'), count: rows.length };
}
