import { defineManifest, MODEL_PIN, AP_PROFILES, standardTools, draftPair, requestTool, refusedTools, asOfDate, sameParty, round2 } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkReleases, holdText, RELEASE_INVOICE_FIELDS, OWNER_PAYMENT_FIELDS, RELEASE_WAIVER_FIELDS, VENDOR_STATUS_FIELDS, RELEASE_SETTINGS_SCHEMA } from './releases.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/platte';
const props = {
  invoices: { type: 'string', description: 'Subcontractor invoices waiting for payment under --root (CSV, Excel or JSON): invoice, subcontractor, job, commitment, date, amount, retainage withheld, project manager approval' },
  owner_payments: { type: 'string', description: 'Optional owner payments by job and month (period YYYY-MM, received yes or no), for pay-when-paid' },
  waivers: { type: 'string', description: 'Optional lien waiver log: subcontractor, invoice, waiver type, received date' },
  vendors: { type: 'string', description: 'Optional subcontractor status: insurance certificate expiry, W-9 on file, retainage rate' },
  settings: { type: 'string', description: 'Optional settings JSON (release_settings schema): pay_when_paid, require_waiver' },
  as_of: { type: 'string', maxLength: 30, description: 'Date of the payment run, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkReleases({ invoiceRows: ctx.records(a.invoices, 'invoices'), ownerRows: a.owner_payments ? ctx.records(a.owner_payments, 'owner_payments') : null, waiverRows: a.waivers ? ctx.records(a.waivers, 'waivers') : null, vendorRows: a.vendors ? ctx.records(a.vendors, 'vendors') : null, settings: a.settings ? ctx.readJson(a.settings, 'release_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'platte', outDir: OUT, props, required: ['invoices'], run,
  check: { title: 'Check subcontractor invoices before release', description: 'Per invoice: project manager approval, the owner paid that job for the month (pay-when-paid), a conditional waiver on file, a current insurance certificate, a W-9 on file and retainage at the subcontract rate. Each invoice is clear to release, to release at a corrected amount, or held with its reasons.' },
  explain: { arg: 'invoice_number', argDoc: 'Invoice number from platte_check', key: (i) => i.invoice_number, title: 'Explain one invoice',
    description: 'Show one invoice\'s release check with every finding.',
    describe: (i) => `${i.invoice_number} ${i.vendor} (job ${i.job}) ${i.amount}: ${i.status}; releasable ${i.releasable} after retainage. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'platte-releases', title: 'Subcontractor payment releases', description: 'Write the release worklist',
    row: (i) => ({ invoice_number: i.invoice_number, vendor: i.vendor, job: i.job, commitment: i.commitment, invoice_date: i.invoice_date || '', amount: i.amount, retainage: i.retainage, releasable: i.releasable, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['invoice_number', 'vendor', 'job', 'commitment', 'invoice_date', 'amount', 'retainage', 'releasable', 'status', 'findings', 'reasons'],
    htmlColumns: ['invoice_number', 'vendor', 'job', 'amount', 'releasable', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'invoices', 'releasable', 'held'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Whether pay-when-paid or a waiver requirement applies is set by your subcontracts and state law; Platte applies the rules you turn on.'] },
});
const pair = draftPair({
  prefix: 'platte', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<vendor>.md: a payment status notice to one subcontractor listing its held invoices and what clears them. Marked DRAFT. Sending goes through platte_request_send (one click).',
  required: ['invoices', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no invoices from "${a.vendor}"`);
    const t = holdText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`no invoice from ${items[0].vendor} is held`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { invoices: t.count } };
  },
});
const release = requestTool({
  prefix: 'platte', verb: 'release', category: 'move_money', outDir: OUT, file: 'release-approvals.csv', actor: 'accounts payable',
  title: 'Approve releasing a subcontractor payment (one click)',
  description: 'After one named human click (even in Auto), record in release-approvals.csv that accounts payable may pay one subcontractor invoice, up to its releasable amount. Refused for a held invoice. Platte never pays.',
  props: { ...props, invoice_number: { type: 'string', maxLength: 80, description: 'Invoice number from platte_check' }, amount: { type: 'number', minimum: 0, description: 'Amount to release; at most the releasable amount' } },
  required: ['invoices', 'invoice_number', 'amount'], run,
  columns: ['invoice_number', 'vendor', 'job', 'releasable', 'approved_amount'],
  pick: (a, r) => {
    const i = r.items.find((x) => x.invoice_number.toUpperCase() === String(a.invoice_number).trim().toUpperCase());
    if (!i) throw new Error(`invoice ${a.invoice_number} not found; pass one from platte_check`);
    if (i.status === 'hold') throw new Error(`invoice ${i.invoice_number} is held (${i.findings.map((f) => f.code).join(', ')})`);
    if (a.amount > i.releasable + 0.005) throw new Error(`amount ${a.amount} is more than the releasable ${i.releasable}`);
    return { invoice_number: i.invoice_number, vendor: i.vendor, job: i.job, releasable: i.releasable, approved_amount: round2(a.amount) };
  },
  summary: (row) => `Release of ${row.approved_amount} on invoice ${row.invoice_number} (${row.vendor}) approved.`,
});
const refused = refusedTools([
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Platte never pays; accounts payable pays after a recorded release approval.' },
  { name: 'payment_batch_release', category: 'move_money', description: 'Platte never releases a payment batch in your accounting or banking system.' },
  { name: 'email_send', category: 'binding_send', description: 'Platte never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'platte-of-releases', version: pkg.version,
  description: 'Checks each subcontractor invoice before it is paid: project manager approval, the owner paid for that month (pay-when-paid, when you use it), a conditional lien waiver, a current insurance certificate, a W-9 on file and retainage at the subcontract rate. Clears or holds each invoice with its reasons and records payment releases only after one named person\'s click. Paying is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { release_settings: RELEASE_SETTINGS_SCHEMA },
  sources: {
    invoices: { label: 'Subcontractor invoices', args: ['invoices'], fields: RELEASE_INVOICE_FIELDS, profiles: AP_PROFILES },
    owner_payments: { label: 'Owner payments by job and month', args: ['owner_payments'], fields: OWNER_PAYMENT_FIELDS },
    waivers: { label: 'Lien waiver log', args: ['waivers'], fields: RELEASE_WAIVER_FIELDS },
    vendors: { label: 'Subcontractor status', args: ['vendors'], fields: VENDOR_STATUS_FIELDS },
  },
  prompts: [{
    name: 'payment_run', title: 'Weekly subcontractor payment run',
    description: 'Walks the host model through the release check with Platte.',
    arguments: [{ name: 'invoices', description: 'Subcontractor invoices', required: true }],
    text: `You are helping a construction AP lead prepare the subcontractor payment run with platte-of-releases. Invoices: {{invoices}}.

Rules: Platte never pays; ap_pay_invoice, payment_batch_release and email_send are blocked. Pay-when-paid and waiver rules are the person's to set.

1. Call platte_check. Lead with the total that can be released, then held invoices by reason, then corrected retainage.
2. Call platte_explain for invoices the person asks about.
3. Call platte_write_report and share the paths.
4. Offer platte_draft_notice for subcontractors with holds. Only when the person asks, call platte_request_send or platte_request_release; both need one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...release.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...release.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Platte allowlist.' }] },
});
