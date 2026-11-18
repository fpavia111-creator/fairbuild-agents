import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkSalesTax, refundText, TAX_LINE_FIELDS, RATE_FIELDS, TAX_JOB_FIELDS, TAX_SETTINGS_SCHEMA } from './salestax.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/sales-tax';
const props = {
  lines: { type: 'string', description: 'Material invoice lines under --root (CSV, Excel or JSON): invoice, vendor, job, delivery jurisdiction, taxable amount, tax charged' },
  rates: { type: 'string', description: 'Your tax rate table: jurisdiction and combined rate in percent. You maintain it; Fairbuild Sales Tax does not look rates up' },
  jobs: { type: 'string', description: 'Optional job list with jurisdiction and whether you treat the job as tax exempt' },
  settings: { type: 'string', description: 'Optional settings JSON (tax_settings schema): tolerance' },
};
const run = (a, ctx) => checkSalesTax({ lineRows: ctx.records(a.lines, 'lines'), rateRows: ctx.records(a.rates, 'rates'), jobRows: a.jobs ? ctx.records(a.jobs, 'jobs') : null, settings: a.settings ? ctx.readJson(a.settings, 'tax_settings') : {} });
const std = standardTools({
  prefix: 'sales_tax', outDir: OUT, props, required: ['lines', 'rates'], run,
  check: { title: 'Check tax on material invoices', description: 'Per invoice line, against your rate for the delivery jurisdiction: tax not charged (use tax to accrue), overcharged, charged at another jurisdiction\'s rate, charged on a job you mark exempt, delivered to a jurisdiction other than the job\'s, or no rate on file. Totals by jurisdiction.' },
  explain: { arg: 'line', argDoc: 'Invoice number (or "invoice job") from sales_tax_check', key: (i) => [i.key, i.invoice_number], title: 'Explain one invoice line',
    description: 'Show one line\'s amount, tax, rates and every finding.',
    describe: (i) => `${i.invoice_number} ${i.vendor} (job ${i.job}, ${i.jurisdiction}): ${i.status}. ${i.amount} taxable, ${i.tax} tax (${i.rate_charged_pct ?? 'n/a'}%), your rate ${i.rate_pct ?? 'n/a'}%, expected ${i.expected_tax ?? 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'sales-tax', title: 'Sales tax on materials', description: 'Write the sales tax worklist',
    row: (i) => ({ invoice_number: i.invoice_number, vendor: i.vendor, job: i.job, jurisdiction: i.jurisdiction, amount: i.amount, tax: i.tax, rate_charged_pct: i.rate_charged_pct ?? '', rate_pct: i.rate_pct ?? '', expected_tax: i.expected_tax ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['invoice_number', 'vendor', 'job', 'jurisdiction', 'amount', 'tax', 'rate_charged_pct', 'rate_pct', 'expected_tax', 'status', 'findings', 'reasons'],
    htmlColumns: ['invoice_number', 'vendor', 'job', 'jurisdiction', 'amount', 'tax', 'expected_tax', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By jurisdiction', rows: Object.entries(r.by_jurisdiction).map(([jurisdiction, v]) => ({ jurisdiction, ...v })), columns: ['jurisdiction', 'lines', 'taxable', 'tax_charged', 'tax_expected'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Fairbuild Sales Tax applies the rates and exemptions you supply. Whether materials, a job or a contract type are taxable, and how use tax is reported, is for your tax adviser.'] },
});
const pair = draftPair({
  prefix: 'sales_tax', noun: 'refund', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/refund-<vendor>.md: a credit request to one vendor for tax overcharged or charged on exempt jobs, with [ATTACH] for the exemption certificate. Marked DRAFT. Sending goes through sales_tax_request_send (one click).',
  required: ['lines', 'rates', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Vendor name' }, contact: { type: 'string', maxLength: 200, description: 'Vendor billing contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no invoice lines from "${a.vendor}"`);
    const t = refundText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to claim back from ${items[0].vendor}`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const refused = refusedTools([
  { name: 'tax_return_file', category: 'binding_send', description: 'Fairbuild Sales Tax never prepares or files a sales or use tax return.' },
  { name: 'gl_post', category: 'production_deploy', description: 'Fairbuild Sales Tax never posts a use tax accrual or any entry.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Sales Tax never sends the request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-sales-tax', version: pkg.version,
  description: 'Checks tax charged on material invoices against the rates you supply for each jurisdiction: tax not charged (use tax to accrue), charged at another jurisdiction\'s rate, overcharged, charged on jobs you mark exempt, and deliveries to a different jurisdiction than the job. Drafts vendor refund requests. Not tax advice; filing and posting are a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { tax_settings: TAX_SETTINGS_SCHEMA },
  sources: {
    lines: { label: 'Material invoice lines', args: ['lines'], fields: TAX_LINE_FIELDS },
    rates: { label: 'Tax rate table', args: ['rates'], fields: RATE_FIELDS },
    jobs: { label: 'Jobs, jurisdictions and exemptions', args: ['jobs'], fields: TAX_JOB_FIELDS },
  },
  prompts: [{
    name: 'materials_tax_review', title: 'Monthly materials tax review',
    description: 'Walks the host model through the materials tax review with Fairbuild Sales Tax.',
    arguments: [{ name: 'lines', description: 'Material invoice lines', required: true }, { name: 'rates', description: 'Rate table', required: true }],
    text: `You are helping a construction accountant review tax on material invoices with fairbuild-sales-tax. Lines: {{lines}}. Rates: {{rates}}.

Rules: Fairbuild Sales Tax never files returns, posts or sends; tax_return_file, gl_post and email_send are blocked. It is not tax advice: never say what is taxable, only what the person's rates and exemptions give.

1. Call sales_tax_check. Lead with tax to claim back (overcharged, exempt jobs), then use tax to accrue, then jurisdiction problems.
2. Call sales_tax_explain for lines the person asks about.
3. Call sales_tax_write_report and share the paths.
4. Offer sales_tax_draft_refund per vendor; only when the person asks, call sales_tax_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Sales Tax allowlist.' }] },
});
