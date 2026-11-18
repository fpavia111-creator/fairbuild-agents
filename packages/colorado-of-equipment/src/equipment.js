// Colorado: equipment rental invoices against rates, off-rent dates and usage. Pure functions, no I/O.
//
// A rental period of D days is billed at most the cheapest of: D × day rate,
// ceil(D / 7) × week rate, ceil(D / 28) × month rate (the rates on the invoice or
// the rental agreement). Days after the off-rent date are not billable.
import { num, str, round2, isoDate, daysBetween, addDays, jobKey, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const RENTAL_FIELDS = Object.freeze({
  equipment_id: t(['Equipment ID', 'Equipment', 'Unit', 'Unit Number', 'Asset', 'Asset ID', 'Serial'], { required: true }),
  description: t(['Description', 'Equipment Description', 'Item', 'Class']),
  vendor: t(['Vendor', 'Rental Company', 'Supplier']),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No', 'Contract']),
  period_from: t(['Period From', 'Billed From', 'From', 'Start', 'Bill Start'], { type: 'date' }),
  period_to: t(['Period To', 'Billed To', 'To', 'End', 'Bill End'], { type: 'date' }),
  off_rent_date: t(['Off Rent Date', 'Off Rent', 'Called Off', 'Return Date', 'Off-Rent'], { type: 'date' }),
  amount: t(['Amount', 'Rental Amount', 'Total', 'Billed'], { type: 'money' }),
  day_rate: t(['Day Rate', 'Daily Rate', 'Daily'], { type: 'money' }),
  week_rate: t(['Week Rate', 'Weekly Rate', 'Weekly'], { type: 'money' }),
  month_rate: t(['Month Rate', 'Monthly Rate', '4 Week Rate', 'Monthly'], { type: 'money' }),
});
export const USAGE_FIELDS = Object.freeze({
  equipment_id: t(['Equipment ID', 'Equipment', 'Unit', 'Asset', 'Asset ID'], { required: true }),
  date: t(['Date', 'Work Date', 'Log Date'], { type: 'date' }),
  job: t(['Job', 'Job Number', 'Project']),
  hours: t(['Hours', 'Hours Used', 'Run Hours', 'Engine Hours', 'Meter Hours'], { type: 'number' }),
});
export const EQUIPMENT_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    idle_hours_per_week: { type: 'number', minimum: 0, maximum: 168, description: 'A rental used fewer hours per week than this over its billing period is flagged idle (default 8)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['billed_after_off_rent', 'overlap', 'rate_over', 'no_job', 'idle'];

/** Cheapest charge for d days at the given rates (null when no rate is known). */
export function cheapest(d, { day, week, month }) {
  const opts = []; if (day) opts.push(d * day); if (week) opts.push(Math.ceil(d / 7) * week); if (month) opts.push(Math.ceil(d / 28) * month);
  if (day && week) opts.push(Math.floor(d / 7) * week + Math.min((d % 7) * day, week));
  return opts.length ? round2(Math.min(...opts)) : null;
}

export function checkRentals({ rentalRows, usageRows = null, settings = {} }) {
  const tol = num(settings.tolerance) ?? 1; const idleWeek = num(settings.idle_hours_per_week) ?? 8;
  const usage = new Map(); if (usageRows) for (const u of usageRows) { const k = str(u.equipment_id).toUpperCase(); if (!k) continue; if (!usage.has(k)) usage.set(k, []); usage.get(k).push({ date: isoDate(u.date), job: str(u.job), hours: num(u.hours) || 0 }); }
  const rentals = sortBy(rentalRows.filter((r) => str(r.equipment_id)), [(r) => str(r.equipment_id).toUpperCase(), 1], [(r) => isoDate(r.period_from) || '', 1], [(r) => str(r.invoice_number), 1]);
  const items = []; const lastTo = new Map();
  for (const r of rentals) {
    const f = []; const eq = str(r.equipment_id).toUpperCase(); const from = isoDate(r.period_from), to = isoDate(r.period_to); const off = isoDate(r.off_rent_date);
    const rates = { day: num(r.day_rate), week: num(r.week_rate), month: num(r.month_rate) }; const amount = num(r.amount) ?? 0;
    const days = from && to ? daysBetween(from, to) + 1 : null;
    let fair = days ? cheapest(days, rates) : null;
    if (off && to && from && to > off) { const billable = Math.max(0, daysBetween(from, off) + 1); const ok = billable ? cheapest(billable, rates) : 0; if (ok !== null && amount - ok > tol) f.push(finding('billed_after_off_rent', amount - ok, `Called off ${off} but billed through ${to}: ${daysBetween(off, to)} day(s) after off-rent. ${billable} billable day(s) cost at most ${ok}.`)); fair = ok; }
    else if (fair !== null && amount - fair > tol) f.push(finding('rate_over', amount - fair, `${days} day(s) billed ${amount}; the cheapest of the day, week and month rates (${[rates.day, rates.week, rates.month].map((x) => x ?? '-').join(' / ')}) is ${fair}.`));
    const prev = lastTo.get(eq);
    if (prev && from && prev.to >= from) { const ov = daysBetween(from, prev.to < to ? prev.to : to) + 1; const c = cheapest(ov, rates); f.push(finding('overlap', c, `${ov} day(s) from ${from} were already billed on invoice ${prev.invoice} (through ${prev.to}).`)); }
    if (to && (!prev || to > prev.to)) lastTo.set(eq, { to, invoice: str(r.invoice_number) });
    const used = (usage.get(eq) || []).filter((u) => (!from || !u.date || u.date >= from) && (!to || !u.date || u.date <= (off && off < to ? off : to)));
    const hours = round2(used.reduce((a, u) => a + u.hours, 0));
    if (!str(r.job)) { const jobs = [...new Set(used.map((u) => u.job).filter(Boolean))].sort(); f.push(finding('no_job', null, `Invoice ${str(r.invoice_number)} has no job${jobs.length ? `; the usage log puts this machine on ${jobs.join(', ')}` : ''}.`)); }
    const onSite = off && to && from && to > off ? Math.max(1, daysBetween(from, off) + 1) : days;
    if (usageRows && onSite) { const weeks = Math.max(1, onSite / 7); if (hours / weeks < idleWeek) f.push(finding('idle', null, `${hours} hour(s) logged over ${onSite} day(s) on rent (${round2(hours / weeks)} a week, below ${idleWeek}). Call it off or move it to a job that needs it.`)); }
    const c = f.map((x) => x.code);
    const status = c.some((x) => ['billed_after_off_rent', 'overlap', 'rate_over'].includes(x)) ? 'overbilled' : f.length ? 'review' : 'ok';
    items.push({ invoice_number: str(r.invoice_number), equipment_id: str(r.equipment_id), description: str(r.description), vendor: str(r.vendor), job: str(r.job), period_from: from, period_to: to, off_rent_date: off, days, amount, fair_amount: fair, hours_used: usageRows ? hours : null, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { overbilled: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['equipment_id', 1], ['period_from', 1], ['invoice_number', 1]);
  const overbilled = round2(out.flatMap((i) => i.findings).filter((x) => ['billed_after_off_rent', 'overlap', 'rate_over'].includes(x.code)).reduce((a, x) => a + (x.amount || 0), 0));
  const byJob = {}; for (const i of out) { const j = byJob[i.job || '(no job)'] = byJob[i.job || '(no job)'] || { invoices: 0, billed: 0, hours_used: 0 }; j.invoices++; j.billed = round2(j.billed + i.amount); j.hours_used = round2(j.hours_used + (i.hours_used || 0)); }
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { invoices: 0, billed: 0, overbilled: 0 }; v.invoices++; v.billed = round2(v.billed + i.amount); v.overbilled = round2(v.overbilled + i.findings.filter((x) => ['billed_after_off_rent', 'overlap', 'rate_over'].includes(x.code)).reduce((a, x) => a + (x.amount || 0), 0)); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    invoices: out.length, billed: round2(out.reduce((a, i) => a + i.amount, 0)), overbilled, idle_cost: round2(out.filter((i) => i.findings.some((x) => x.code === 'idle')).reduce((a, i) => a + i.amount, 0)),
    overbilled_count: count('overbilled'), review: count('review'), ok: count('ok'), settings_used: { idle_hours_per_week: idleWeek, tolerance: tol },
    by_job: byJob, by_vendor: byVendor, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.invoices} rental invoice(s), ${r.billed} billed: ${r.overbilled_count} overbilled by ${r.overbilled} in total, ${r.review} to review (${r.idle_cost} on idle rentals).`;
  return r;
}

/** Markdown body of a credit request to one rental vendor. */
export function creditText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'overbilled');
  const total = round2(rows.reduce((a, i) => a + i.findings.filter((f) => f.amount).reduce((s, f) => s + f.amount, 0), 0));
  const L = [`# Rental credit request: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor billing contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `We reviewed your rental invoices against the agreed rates and off-rent dates and request a credit of ${total}.`, '',
    '| Invoice | Equipment | Period | Billed | Credit | Reason |', '| --- | --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.invoice_number} | ${i.equipment_id} ${i.description} | ${i.period_from} to ${i.period_to} | ${i.amount} | ${round2(i.findings.reduce((s, f) => s + (f.amount || 0), 0))} | ${i.findings.map((f) => f.detail).join(' ')} |`),
    '', 'Off-rent confirmations: [ATTACH call-off numbers]'];
  return { text: L.join('\n'), total, count: rows.length };
}
