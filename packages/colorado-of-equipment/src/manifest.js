import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkRentals, creditText, RENTAL_FIELDS, USAGE_FIELDS, EQUIPMENT_SETTINGS_SCHEMA } from './equipment.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/colorado';
const props = {
  rentals: { type: 'string', description: 'Equipment rental invoices under --root (CSV, Excel or JSON): equipment, vendor, job, invoice, billing period, off-rent date, amount, and the day, week and month rates' },
  usage: { type: 'string', description: 'Optional equipment usage log (equipment, date, job, hours) from daily reports or telematics, to catch idle rentals and rentals with no job' },
  settings: { type: 'string', description: 'Optional settings JSON (equipment_settings schema): idle_hours_per_week, tolerance' },
};
const run = (a, ctx) => checkRentals({ rentalRows: ctx.records(a.rentals, 'rentals'), usageRows: a.usage ? ctx.records(a.usage, 'usage') : null, settings: a.settings ? ctx.readJson(a.settings, 'equipment_settings') : {} });
const std = standardTools({
  prefix: 'colorado', outDir: OUT, props, required: ['rentals'], run,
  check: { title: 'Check equipment rental invoices', description: 'Per rental invoice: billed above the cheapest day, week and month combination, billed after the off-rent date, days already billed on another invoice for the same machine, no job on the invoice, and hours used per week below your idle threshold.' },
  explain: { arg: 'invoice_number', argDoc: 'Rental invoice number from colorado_check', key: (i) => [i.invoice_number, i.equipment_id], title: 'Explain one rental invoice',
    description: 'Show one rental invoice\'s period, rates, usage and every finding.',
    describe: (i) => `${i.invoice_number} ${i.equipment_id} ${i.description} (${i.vendor}, job ${i.job || 'none'}): ${i.status}. ${i.days} day(s) ${i.period_from} to ${i.period_to}${i.off_rent_date ? `, off rent ${i.off_rent_date}` : ''}; billed ${i.amount}, fair ${i.fair_amount ?? 'n/a'}, ${i.hours_used ?? 'n/a'} hour(s) used. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'colorado-equipment', title: 'Equipment hours and rental costs', description: 'Write the rental worklist',
    row: (i) => ({ invoice_number: i.invoice_number, equipment_id: i.equipment_id, description: i.description, vendor: i.vendor, job: i.job, period_from: i.period_from || '', period_to: i.period_to || '', off_rent_date: i.off_rent_date || '', days: i.days ?? '', amount: i.amount, fair_amount: i.fair_amount ?? '', hours_used: i.hours_used ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['invoice_number', 'equipment_id', 'description', 'vendor', 'job', 'period_from', 'period_to', 'off_rent_date', 'days', 'amount', 'fair_amount', 'hours_used', 'status', 'findings', 'reasons'],
    htmlColumns: ['invoice_number', 'equipment_id', 'vendor', 'job', 'days', 'amount', 'fair_amount', 'hours_used', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'invoices', 'billed', 'hours_used'] },
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'invoices', 'billed', 'overbilled'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Rate tiers follow the common rule that a rental is billed at the cheapest combination of its rates; your rental agreement may differ (minimum charges, damage waiver, fuel, delivery).'] },
});
const pair = draftPair({
  prefix: 'colorado', noun: 'credit', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/credit-<vendor>.md: a credit request to one rental vendor for every overbilled invoice, with [ATTACH] for off-rent confirmations. Marked DRAFT. Sending goes through colorado_request_send (one click).',
  required: ['rentals', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Rental vendor name' }, contact: { type: 'string', maxLength: 200, description: 'Vendor billing contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no rental invoices from "${a.vendor}"; vendors: ${Object.keys(r.by_vendor).join(', ')}`);
    const t = creditText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to claim from ${items[0].vendor}: no overbilled invoice`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const refused = refusedTools([
  { name: 'rental_call_off', category: 'binding_send', description: 'Colorado never calls a rental off with the vendor; a person does.' },
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Colorado never pays rental invoices.' },
  { name: 'email_send', category: 'binding_send', description: 'Colorado never sends the credit request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'colorado-of-equipment', version: pkg.version,
  description: 'Checks equipment rental invoices against the day, week and month rates, the off-rent date and the hours the machine was used: billed above the cheapest rate combination, billed after it was called off, the same days billed twice, idle rentals and rentals with no job. Drafts credit requests. Calling a rental off and paying are a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { equipment_settings: EQUIPMENT_SETTINGS_SCHEMA },
  sources: {
    rentals: { label: 'Equipment rental invoices', args: ['rentals'], fields: RENTAL_FIELDS },
    usage: { label: 'Equipment usage log', args: ['usage'], fields: USAGE_FIELDS },
  },
  prompts: [{
    name: 'rental_review', title: 'Monthly equipment rental review',
    description: 'Walks the host model through the rental invoice review with Colorado.',
    arguments: [{ name: 'rentals', description: 'Rental invoices', required: true }, { name: 'usage', description: 'Usage log (optional)', required: false }],
    text: `You are helping an equipment manager or project accountant review rental invoices with colorado-of-equipment. Rentals: {{rentals}}. Usage: {{usage}}.

Rules: Colorado never calls rentals off, pays or sends; rental_call_off, ap_pay_invoice and email_send are blocked.

1. Call colorado_check. Lead with overbilled invoices and the total, then idle rentals and invoices with no job.
2. Call colorado_explain for invoices the person asks about.
3. Call colorado_write_report and share the paths.
4. Offer colorado_draft_credit per vendor; only when the person asks, call colorado_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Colorado allowlist.' }] },
});
