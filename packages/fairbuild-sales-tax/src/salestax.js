// Fairbuild Sales Tax: tax on material invoices against the rates you supply per jurisdiction. Pure functions, no I/O.
// The rates and which jobs are exempt come from you; Fairbuild Sales Tax does not know any tax law.
import { num, str, round2, readYesNo, jobKey, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const TAX_LINE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No'], { required: true }),
  vendor: t(['Vendor', 'Supplier', 'Vendor Name']),
  job: t(['Job', 'Job Number', 'Project']),
  jurisdiction: t(['Jurisdiction', 'Ship To Jurisdiction', 'Tax Jurisdiction', 'Delivery Jurisdiction', 'Tax Code', 'Tax Area']),
  amount: t(['Taxable Amount', 'Amount', 'Material Amount', 'Subtotal', 'Net Amount'], { type: 'money' }),
  tax: t(['Tax', 'Sales Tax', 'Tax Charged', 'Tax Amount'], { type: 'money' }),
});
export const RATE_FIELDS = Object.freeze({
  jurisdiction: t(['Jurisdiction', 'Tax Jurisdiction', 'Tax Code', 'Tax Area'], { required: true }),
  tax_rate: t(['Tax Rate', 'Rate', 'Rate %', 'Combined Rate'], { type: 'number' }),
});
export const TAX_JOB_FIELDS = Object.freeze({
  job: t(['Job', 'Job Number', 'Project'], { required: true }),
  jurisdiction: t(['Jurisdiction', 'Tax Jurisdiction', 'Tax Code', 'Tax Area']),
  tax_exempt: t(['Tax Exempt', 'Exempt', 'Exemption'], { type: 'bool' }),
});
export const TAX_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    tolerance: { type: 'number', minimum: 0, maximum: 100, description: 'Tax differences up to this amount per line are rounding (default 0.05)' },
  },
});
const ORDER = ['tax_on_exempt_job', 'tax_overcharged', 'tax_undercharged', 'wrong_jurisdiction_rate', 'jurisdiction_mismatch', 'no_rate'];
const jk = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');

export function checkSalesTax({ lineRows, rateRows, jobRows = null, settings = {} }) {
  const tol = num(settings.tolerance) ?? 0.05;
  const rates = new Map(); for (const r of rateRows) { const k = jk(r.jurisdiction); const v = num(r.tax_rate); if (k && v !== null) rates.set(k, { name: str(r.jurisdiction), rate: v }); }
  const jobs = new Map(); if (jobRows) for (const j of jobRows) if (str(j.job)) jobs.set(jobKey(j.job), { jurisdiction: str(j.jurisdiction), exempt: readYesNo(j.tax_exempt) === true });
  const items = [];
  for (const l of sortBy(lineRows.filter((x) => str(x.invoice_number)), [(x) => str(x.invoice_number), 1], [(x) => str(x.job), 1])) {
    const f = []; const amount = num(l.amount) ?? 0; const tax = num(l.tax) ?? 0; const job = jobs.get(jobKey(l.job));
    const where = str(l.jurisdiction) || (job ? job.jurisdiction : ''); const rate = rates.get(jk(where));
    const charged = amount ? round2((tax / amount) * 100) : null;
    let expected = null;
    if (job && job.exempt) { expected = 0; if (tax > tol) f.push(finding('tax_on_exempt_job', tax, `Job ${str(l.job)} is marked exempt, but ${tax} of tax was charged. Send the vendor the exemption certificate and ask for a credit.`)); }
    else if (!rate) f.push(finding('no_rate', null, `No rate on file for "${where || 'no jurisdiction'}".`));
    else {
      expected = round2(amount * rate.rate / 100);
      if (expected - tax > tol) f.push(finding('tax_undercharged', expected - tax, `Charged ${tax} (${charged ?? 0}%); ${rate.rate}% of ${amount} in ${rate.name} is ${expected}. Accrue the difference as use tax unless the purchase is exempt.`));
      else if (tax - expected > tol) f.push(finding('tax_overcharged', tax - expected, `Charged ${tax} (${charged}%); ${rate.rate}% of ${amount} in ${rate.name} is ${expected}.`));
      if (charged !== null && Math.abs(charged - rate.rate) > 0.01 && tax > tol) { const other = [...rates.values()].find((x) => x !== rate && Math.abs(x.rate - charged) <= 0.01); if (other) f.push(finding('wrong_jurisdiction_rate', null, `The ${charged}% charged is the ${other.name} rate; the delivery was to ${rate.name}.`)); }
    }
    if (job && job.jurisdiction && str(l.jurisdiction) && jk(job.jurisdiction) !== jk(l.jurisdiction)) f.push(finding('jurisdiction_mismatch', null, `Delivered to ${str(l.jurisdiction)}, but job ${str(l.job)} is in ${job.jurisdiction}. Check the ship-to address.`));
    const c = f.map((x) => x.code);
    const status = c.some((x) => ['tax_on_exempt_job', 'tax_overcharged'].includes(x)) ? 'refund' : c.includes('tax_undercharged') ? 'use_tax' : f.length ? 'review' : 'ok';
    items.push({ key: `${str(l.invoice_number)} ${str(l.job)}`.trim(), invoice_number: str(l.invoice_number), vendor: str(l.vendor), job: str(l.job), jurisdiction: rate ? rate.name : where, amount, tax, rate_charged_pct: charged, rate_pct: rate ? rate.rate : null, expected_tax: expected, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { refund: 0, use_tax: 1, review: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['invoice_number', 1]);
  const byJur = {}; for (const i of out) { const j = byJur[i.jurisdiction || '(none)'] = byJur[i.jurisdiction || '(none)'] || { lines: 0, taxable: 0, tax_charged: 0, tax_expected: 0 }; j.lines++; j.taxable = round2(j.taxable + i.amount); j.tax_charged = round2(j.tax_charged + i.tax); j.tax_expected = round2(j.tax_expected + (i.expected_tax ?? 0)); }
  const sumF = (codes) => round2(out.flatMap((i) => i.findings).filter((x) => codes.includes(x.code)).reduce((a, x) => a + (x.amount || 0), 0));
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    lines: out.length, taxable: round2(out.reduce((a, i) => a + i.amount, 0)), tax_charged: round2(out.reduce((a, i) => a + i.tax, 0)), use_tax_to_accrue: sumF(['tax_undercharged']), overcharged: sumF(['tax_overcharged', 'tax_on_exempt_job']),
    refund: count('refund'), use_tax: count('use_tax'), review: count('review'), ok: count('ok'), settings_used: { tolerance: tol },
    by_jurisdiction: byJur, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.lines} material invoice line(s), ${r.taxable} taxable, ${r.tax_charged} tax charged: ${r.use_tax_to_accrue} undercharged (use tax to accrue on ${r.use_tax} line(s)), ${r.overcharged} overcharged or charged on exempt jobs (${r.refund} line(s)), ${r.review} to review.`;
  return r;
}

/** Markdown body of a tax refund request to one vendor. */
export function refundText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'refund');
  const total = round2(rows.reduce((a, i) => a + i.findings.filter((f) => ['tax_overcharged', 'tax_on_exempt_job'].includes(f.code)).reduce((s, f) => s + f.amount, 0), 0));
  const L = [`# Sales tax credit request: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor billing contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `We ask for a credit of ${total} for tax charged on the invoices below.`, '', '| Invoice | Job | Amount | Tax charged | Reason |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.invoice_number} | ${i.job} | ${i.amount} | ${i.tax} | ${i.findings.filter((f) => ['tax_overcharged', 'tax_on_exempt_job'].includes(f.code)).map((f) => f.detail).join(' ')} |`), '',
    'Exemption certificate: [ATTACH certificate where the job is exempt]'];
  return { text: L.join('\n'), total, count: rows.length };
}
