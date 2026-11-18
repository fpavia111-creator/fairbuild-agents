// Fairbuild Certified Payroll: certified payroll lines against the wage determination for the job. Pure functions, no I/O.
//
// Per hour, the rate for the classification (base + fringe) can be met by any mix of cash
// and fringe paid, so the check is on the total: straight time (rate paid + fringe paid)
// against (base + fringe); overtime (rate paid × multiplier + fringe paid) against
// (base × multiplier + fringe). This is the common reading; your determination, contract
// and counsel decide what applies. Worker names and ids are masked before results reach a model.
import { num, str, round2, isoDate, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PAYROLL_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number', 'Contract']),
  week_ending: t(['Week Ending', 'Week End', 'Period Ending', 'Pay Period End', 'W/E'], { type: 'date' }),
  worker: t(['Worker', 'Employee', 'Employee Name', 'Name', 'Name of Worker'], { required: true }),
  worker_id: t(['Worker ID', 'Employee ID', 'Employee Number', 'Last 4 SSN', 'SSN Last 4', 'ID', 'Identifying Number']),
  classification: t(['Classification', 'Work Classification', 'Craft', 'Trade', 'Job Class']),
  hours: t(['Hours', 'Straight Time Hours', 'ST Hours', 'Regular Hours', 'Total Hours'], { type: 'number' }),
  overtime_hours: t(['Overtime Hours', 'OT Hours', 'Overtime'], { type: 'number' }),
  rate_paid: t(['Rate Paid', 'Rate of Pay', 'Hourly Rate', 'Base Rate Paid', 'Rate'], { type: 'money' }),
  fringe_paid: t(['Fringe Paid', 'Fringe', 'Fringe Benefits', 'Fringes per Hour', 'Fringe Rate Paid'], { type: 'money' }),
});
export const DETERMINATION_FIELDS = Object.freeze({
  classification: t(['Classification', 'Craft', 'Work Classification', 'Trade'], { required: true }),
  base_rate: t(['Base Rate', 'Rate', 'Basic Hourly Rate', 'Hourly Rate'], { type: 'money' }),
  fringe_rate: t(['Fringe Rate', 'Fringe', 'Fringe Benefits', 'Fringes'], { type: 'money' }),
});
export const WAGE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    ot_multiplier: { type: 'number', minimum: 1, maximum: 3, description: 'Overtime multiplier on the base rate (default 1.5)' },
    weekly_ot_after: { type: 'number', minimum: 0, maximum: 168, description: 'Straight-time hours in one week past this are owed as overtime (default 40)' },
    classification_aliases: { type: 'object', additionalProperties: { type: 'string', maxLength: 80 }, description: 'Your words for a classification on the determination, e.g. {"Roofer Journeyman": "Roofer"}' },
    tolerance: { type: 'number', minimum: 0, maximum: 100, description: 'Differences up to this amount per line are rounding (default 0.05)' },
  },
});
const ORDER = ['underpaid', 'ot_not_paid', 'no_rate', 'duplicate_line', 'full_ssn_on_report', 'missing_worker_id'];
const norm = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');

export function checkWages({ payrollRows, rateRows, settings = {} }) {
  const mult = num(settings.ot_multiplier) ?? 1.5; const otAfter = num(settings.weekly_ot_after) ?? 40; const tol = num(settings.tolerance) ?? 0.05;
  const alias = Object.fromEntries(Object.entries(settings.classification_aliases || {}).map(([k, v]) => [norm(k), norm(v)]));
  const rates = new Map(); for (const r of rateRows) { const c = norm(r.classification); if (c) rates.set(c, { name: str(r.classification), base: num(r.base_rate) ?? 0, fringe: num(r.fringe_rate) ?? 0 }); }
  const groups = new Map();
  for (const p of payrollRows) {
    const worker = str(p.worker); if (!worker) continue;
    const k = [str(p.job).toUpperCase(), isoDate(p.week_ending) || '', worker.toLowerCase(), norm(p.classification)].join('|');
    if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p);
  }
  const items = [];
  for (const list of groups.values()) {
    const p = sortBy(list, [(x) => num(x.hours) ?? 0, -1], [(x) => num(x.rate_paid) ?? 0, -1])[0]; const f = [];
    const cls = norm(p.classification); const rate = rates.get(alias[cls] || cls);
    const hours = num(p.hours) ?? 0; const ot = num(p.overtime_hours) ?? 0; const paid = num(p.rate_paid) ?? 0; const fringePaid = num(p.fringe_paid) ?? 0;
    const id = str(p.worker_id); const digits = id.replace(/\D/g, '');
    if (list.length > 1) f.push(finding('duplicate_line', null, `${str(p.worker)} appears ${list.length} times for the week ending ${isoDate(p.week_ending)} in the same classification. Only one line is counted; correct the payroll.`));
    if (!id) f.push(finding('missing_worker_id', null, `No identifying number for ${str(p.worker)}. The report needs the worker's id or the last four digits of the SSN.`));
    else if (digits.length >= 9) f.push(finding('full_ssn_on_report', null, `The worker id for ${str(p.worker)} looks like a full Social Security number. Use only the last four digits or an employee id on a certified payroll.`));
    let owed = 0;
    if (!rate) f.push(finding('no_rate', null, `"${str(p.classification)}" is not on the wage determination you supplied. Use the determination's classification, or add a conformance rate.`));
    else {
      const stShort = round2((rate.base + rate.fringe) - (paid + fringePaid)); const otShort = round2((rate.base * mult + rate.fringe) - (paid * mult + fringePaid));
      const under = round2(Math.max(0, stShort) * hours + Math.max(0, otShort) * ot);
      if (under > tol) { owed = round2(owed + under); f.push(finding('underpaid', under, `Paid ${paid} + ${fringePaid} fringe per hour; the determination for ${rate.name} is ${rate.base} + ${rate.fringe}${ot ? ` (overtime ${round2(rate.base * mult)} + ${rate.fringe})` : ''}. Short ${under} for ${hours} straight${ot ? ` and ${ot} overtime` : ''} hour(s).`)); }
      if (hours > otAfter) { const extra = round2(hours - otAfter); const due = round2(extra * rate.base * (mult - 1)); owed = round2(owed + due); f.push(finding('ot_not_paid', due, `${hours} straight-time hours in one week: ${extra} hour(s) past ${otAfter} are overtime, ${due} short at ${mult} times the base rate.`)); }
    }
    const codes = f.map((x) => x.code);
    const status = codes.some((x) => ['underpaid', 'ot_not_paid'].includes(x)) ? 'underpaid' : f.length ? 'review' : 'ok';
    items.push({ key: `${isoDate(p.week_ending)} ${str(p.worker)}`, job: str(p.job), week_ending: isoDate(p.week_ending), worker: str(p.worker), worker_id: id, classification: str(p.classification), hours, overtime_hours: ot, rate_paid: paid, fringe_paid: fringePaid, required_rate: rate ? rate.base : null, required_fringe: rate ? rate.fringe : null, owed, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { underpaid: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['week_ending', 1], ['worker', 1], ['classification', 1]);
  const byClass = {}; for (const i of out) { const c = byClass[i.classification] = byClass[i.classification] || { lines: 0, hours: 0, owed: 0 }; c.lines++; c.hours = round2(c.hours + i.hours + i.overtime_hours); c.owed = round2(c.owed + i.owed); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    lines: out.length, workers: new Set(out.map((i) => i.worker.toLowerCase())).size, weeks: new Set(out.map((i) => i.week_ending)).size, hours: round2(out.reduce((a, i) => a + i.hours + i.overtime_hours, 0)),
    owed: round2(out.reduce((a, i) => a + i.owed, 0)), underpaid: count('underpaid'), review: count('review'), ok: count('ok'),
    settings_used: { ot_multiplier: mult, weekly_ot_after: otAfter, tolerance: tol }, by_classification: byClass, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.lines} payroll line(s), ${r.workers} worker(s), ${r.weeks} week(s), ${r.hours} hour(s): ${r.underpaid} line(s) paid below the determination (${r.owed} short), ${r.review} to review.`;
  return r;
}

/** Markdown body of the correction note to payroll (internal). */
export function correctionText(r, { to, from, job }) {
  const rows = r.items.filter((i) => i.status !== 'ok');
  const L = [`# Certified payroll corrections${job ? `: job ${job}` : ''}`, '', `**To:** ${to || '[TO CONFIRM payroll]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    `Before the certified payroll is signed and submitted, please review these ${rows.length} line(s). Amounts short are restitution to confirm, not a calculation of what the law requires [TO CONFIRM with your labor compliance adviser].`, '',
    '| Week ending | Worker | Classification | Short | Problem |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.week_ending} | ${i.worker} | ${i.classification} | ${i.owed} | ${i.findings.map((f) => f.detail).join(' ')} |`), '',
    `Total short: ${r.owed}.`];
  return L.join('\n');
}
