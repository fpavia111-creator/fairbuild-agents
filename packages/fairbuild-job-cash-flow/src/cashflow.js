// Fairbuild Job Cash Flow: cash flow by job from receipts, disbursements and owner billings. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, monthKey, readYesNo, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CASH_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  date: t(['Date', 'Deposit Date', 'Check Date', 'Payment Date', 'Cleared'], { type: 'date' }),
  amount: t(['Amount', 'Deposit', 'Payment', 'Check Amount', 'Total'], { type: 'money' }),
  party: t(['Vendor', 'Payee', 'Customer', 'Payer', 'Owner', 'Name']),
});
export const OWNER_BILLING_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project', 'Project Number'], { required: true }),
  invoice: t(['Invoice', 'Invoice Number', 'Pay App', 'Application']),
  invoice_date: t(['Invoice Date', 'Date', 'Billed Date'], { type: 'date' }),
  amount: t(['Amount', 'Invoice Amount', 'Net Due', 'Amount Due'], { type: 'money' }),
  received: t(['Received', 'Paid', 'Collected'], { type: 'bool' }),
});
export const CASH_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    collect_days: { type: 'integer', minimum: 0, maximum: 365, description: 'An owner invoice unpaid longer than this is flagged (default 60)' },
    negative_months: { type: 'integer', minimum: 2, maximum: 12, description: 'Months in a row with negative net cash that are flagged (default 2)' },
  },
});
const ORDER = ['cash_negative', 'slow_collection', 'negative_trend'];

export function checkCashflow({ receiptRows, disbursementRows, billingRows = null, settings = {}, asOf }) {
  const collect = num(settings.collect_days) ?? 60; const runMonths = num(settings.negative_months) ?? 2;
  const jobs = new Map(); const job = (j) => { const k = jobKey(j); if (!jobs.has(k)) jobs.set(k, { job: str(j), cash_in: 0, cash_out: 0, months: new Map(), unpaid: [] }); return jobs.get(k); };
  const month = (e, d, delta) => { const m = monthKey(d); if (!m) return; e.months.set(m, round2((e.months.get(m) || 0) + delta)); };
  for (const r of receiptRows) { if (!str(r.job)) continue; const e = job(r.job); const a = num(r.amount) || 0; e.cash_in = round2(e.cash_in + a); month(e, r.date, a); }
  for (const r of disbursementRows) { if (!str(r.job)) continue; const e = job(r.job); const a = num(r.amount) || 0; e.cash_out = round2(e.cash_out + a); month(e, r.date, -a); }
  if (billingRows) for (const b of billingRows) { if (!str(b.job) || readYesNo(b.received) === true) continue; const e = job(b.job); e.unpaid.push({ invoice: str(b.invoice), date: isoDate(b.invoice_date), amount: num(b.amount) || 0 }); }
  const items = []; const monthsAll = new Set();
  for (const e of jobs.values()) {
    const f = []; const net = round2(e.cash_in - e.cash_out);
    const months = [...e.months.entries()].sort(([a], [b]) => (a < b ? -1 : 1)); months.forEach(([m]) => monthsAll.add(m));
    const old = e.unpaid.filter((u) => u.date && daysBetween(u.date, asOf) > collect); const oldAmt = round2(old.reduce((a, u) => a + u.amount, 0));
    if (net < 0) f.push(finding('cash_negative', -net, `Paid out ${e.cash_out} and collected ${e.cash_in}: the job is ${round2(-net)} cash negative${oldAmt ? `, with ${oldAmt} billed and unpaid for more than ${collect} days` : ''}.`));
    if (old.length) f.push(finding('slow_collection', oldAmt, `${old.map((u) => `${u.invoice || 'invoice'} (${u.amount}, ${daysBetween(u.date, asOf)} days)`).sort().join(', ')} unpaid past ${collect} days.`));
    let streak = 0, worst = 0; for (const [, v] of months) { streak = v < 0 ? streak + 1 : 0; worst = Math.max(worst, streak); }
    const tail = months.slice(-runMonths); if (tail.length === runMonths && tail.every(([, v]) => v < 0)) f.push(finding('negative_trend', round2(-tail.reduce((a, [, v]) => a + v, 0)), `Net cash was negative in each of the last ${runMonths} months (${tail.map(([m, v]) => `${m} ${v}`).join(', ')}).`));
    const c = f.map((x) => x.code);
    items.push({ job: e.job, cash_in: e.cash_in, cash_out: e.cash_out, net, unpaid_billed: round2(e.unpaid.reduce((a, u) => a + u.amount, 0)), unpaid_over_days: oldAmt, months: Object.fromEntries(months), status: c.includes('cash_negative') ? 'negative' : f.length ? 'review' : 'ok', findings: orderFindings(f, ORDER) });
  }
  const rank = { negative: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['net', 1], ['job', 1]);
  const byMonth = {}; for (const m of [...monthsAll].sort()) byMonth[m] = { net: round2(out.reduce((a, i) => a + (i.months[m] || 0), 0)) };
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    jobs: out.length, cash_in: round2(out.reduce((a, i) => a + i.cash_in, 0)), cash_out: round2(out.reduce((a, i) => a + i.cash_out, 0)), net: round2(out.reduce((a, i) => a + i.net, 0)),
    negative: count('negative'), review: count('review'), ok: count('ok'), unpaid_over_days: round2(out.reduce((a, i) => a + i.unpaid_over_days, 0)), as_of: asOf,
    settings_used: { collect_days: collect, negative_months: runMonths }, by_month: byMonth, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.jobs} job(s): ${r.cash_in} collected, ${r.cash_out} paid out, net ${r.net}. ${r.negative} job(s) cash negative, ${r.unpaid_over_days} billed and unpaid past ${collect} days, ${r.review} other job(s) to review.`;
  return r;
}

/** Markdown body of a collection letter to the owner of one job. */
export function collectionText(item, unpaid, { to, from, collect }) {
  const L = [`# Payment request: job ${item.job}`, '', `**To:** ${to || '[TO CONFIRM owner accounts payable]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `The invoices below are past ${collect} days. Please let us know when payment will be made, or what you need from us to release it.`, '',
    '| Invoice | Date | Amount |', '| --- | --- | --- |', ...unpaid.map((u) => `| ${u.invoice} | ${u.date} | ${u.amount} |`), '',
    `Total past due: ${round2(unpaid.reduce((a, u) => a + u.amount, 0))}. Copies: [ATTACH invoices and approved pay applications]`];
  return L.join('\n');
}
