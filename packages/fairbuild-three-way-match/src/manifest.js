import { defineManifest, MODEL_PIN, AP_INVOICE_FIELDS, AP_PROFILES, COMMITMENT_FIELDS, COMMITMENT_PROFILES, standardTools, draftPair, requestTool, refusedTools, sameParty, round2 } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { matchInvoices, holdText, APPROVAL_FIELDS, MATCH_SETTINGS_SCHEMA } from './matching.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/three-way-match';
const props = {
  invoices: { type: 'string', description: 'AP invoices under --root (CSV, Excel or JSON): invoice, vendor, job, the commitment billed against, date, amount, retainage withheld. Sage 300 and Buildertrend layouts are recognised' },
  commitments: { type: 'string', description: 'Subcontracts and POs: number, vendor, job, value (revised amount), retainage rate. Procore and Buildertrend layouts are recognised' },
  approvals: { type: 'string', description: 'Optional receipts and project manager approvals: commitment, date, amount approved as received or in place to date' },
  settings: { type: 'string', description: 'Optional settings JSON (match_settings schema): tolerance, require_approval' },
};
const run = (a, ctx) => matchInvoices({ invoiceRows: ctx.records(a.invoices, 'invoices'), commitmentRows: ctx.records(a.commitments, 'commitments'), approvalRows: a.approvals ? ctx.records(a.approvals, 'approvals') : null, settings: a.settings ? ctx.readJson(a.settings, 'match_settings') : {} });
const std = standardTools({
  prefix: 'three_way_match', outDir: OUT, props, required: ['invoices', 'commitments'], run,
  check: { title: 'Three-way match AP invoices', description: 'Per invoice in date order: a commitment on file for the same vendor and job, cumulative billing within the commitment value and within the amount approved as received or in place, a receipt or approval on file, and retainage withheld where the commitment carries it. Each invoice is matched, to review, or on hold.' },
  explain: { arg: 'invoice_number', argDoc: 'Invoice number from three_way_match_check', key: (i) => i.invoice_number, title: 'Explain one invoice',
    description: 'Show one invoice against its commitment and approval with every finding.',
    describe: (i) => `${i.invoice_number} ${i.vendor} (${i.commitment || 'no commitment'}, job ${i.job}) ${i.amount}: ${i.status}. Commitment value ${i.commitment_value ?? 'n/a'}, billed with this ${i.billed_with_this ?? 'n/a'}, approved to date ${i.approved_to_date ?? 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'three-way-match', title: 'Three-way match', description: 'Write the matching worklist',
    row: (i) => ({ invoice_number: i.invoice_number, vendor: i.vendor, job: i.job, commitment: i.commitment, invoice_date: i.invoice_date || '', amount: i.amount, commitment_value: i.commitment_value ?? '', billed_with_this: i.billed_with_this ?? '', approved_to_date: i.approved_to_date ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['invoice_number', 'vendor', 'job', 'commitment', 'invoice_date', 'amount', 'commitment_value', 'billed_with_this', 'approved_to_date', 'status', 'findings', 'reasons'],
    htmlColumns: ['invoice_number', 'vendor', 'commitment', 'amount', 'billed_with_this', 'approved_to_date', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'invoices', 'amount', 'on_hold'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice'] },
});
const pair = draftPair({
  prefix: 'three_way_match', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<vendor>.md: a notice to one vendor listing its invoices on hold and why. Marked DRAFT. Sending goes through three_way_match_request_send (one click).',
  required: ['invoices', 'commitments', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Vendor name' }, contact: { type: 'string', maxLength: 200, description: 'Vendor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no invoices from "${a.vendor}"; vendors: ${Object.keys(r.by_vendor).join(', ')}`);
    const t = holdText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`no invoice from ${items[0].vendor} is on hold`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { invoices: t.count } };
  },
});
const approve = requestTool({
  prefix: 'three_way_match', verb: 'approval', category: 'move_money', outDir: OUT, file: 'payment-approvals.csv', actor: 'accounts payable',
  title: 'Approve an invoice for payment (one click)',
  description: 'After one named human click (even in Auto), record in payment-approvals.csv that accounts payable may pay one invoice, up to its amount less retainage. Refused for an invoice on hold. Fairbuild Three-Way Match never pays.',
  props: { ...props, invoice_number: { type: 'string', maxLength: 80, description: 'Invoice number from three_way_match_check' }, amount: { type: 'number', minimum: 0, description: 'Amount to pay; at most the invoice amount less retainage' } },
  required: ['invoices', 'commitments', 'invoice_number', 'amount'], run,
  columns: ['invoice_number', 'vendor', 'commitment', 'invoice_amount', 'retainage', 'approved_amount', 'match_status'],
  pick: (a, r) => {
    const i = r.items.find((x) => x.invoice_number.toUpperCase() === String(a.invoice_number).trim().toUpperCase());
    if (!i) throw new Error(`invoice ${a.invoice_number} not found; pass one from three_way_match_check`);
    if (i.status === 'hold') throw new Error(`invoice ${i.invoice_number} is on hold (${i.findings.map((f) => f.code).join(', ')}); resolve it first`);
    const max = round2(i.amount - i.retainage);
    if (a.amount > max + 0.005) throw new Error(`amount ${a.amount} is more than ${max} (invoice ${i.amount} less retainage ${i.retainage})`);
    return { invoice_number: i.invoice_number, vendor: i.vendor, commitment: i.commitment, invoice_amount: i.amount, retainage: i.retainage, approved_amount: round2(a.amount), match_status: i.status };
  },
  summary: (row) => `Payment of ${row.approved_amount} on invoice ${row.invoice_number} (${row.vendor}) approved.`,
});
const refused = refusedTools([
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Fairbuild Three-Way Match never pays; accounts payable pays after a recorded approval.' },
  { name: 'invoice_post', category: 'production_deploy', description: 'Fairbuild Three-Way Match never posts or codes invoices in your accounting system.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Three-Way Match never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-three-way-match', version: pkg.version,
  description: 'Three-way match for construction: each AP invoice against its subcontract or PO and the work or delivery the project manager approved. Flags invoices with no commitment, the wrong vendor or job, cumulative billing past the commitment or past the approved work, no receipt or approval, and retainage not withheld. Records one-click payment approvals; paying is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { match_settings: MATCH_SETTINGS_SCHEMA },
  sources: {
    invoices: { label: 'AP invoices', args: ['invoices'], fields: AP_INVOICE_FIELDS, profiles: AP_PROFILES },
    commitments: { label: 'Subcontracts and purchase orders', args: ['commitments'], fields: COMMITMENT_FIELDS, profiles: COMMITMENT_PROFILES },
    approvals: { label: 'Receipts and approvals', args: ['approvals'], fields: APPROVAL_FIELDS },
  },
  prompts: [{
    name: 'invoice_approval_run', title: 'Weekly invoice approval run',
    description: 'Walks the host model through the three-way match with Fairbuild Three-Way Match.',
    arguments: [{ name: 'invoices', description: 'AP invoices', required: true }, { name: 'commitments', description: 'Commitments', required: true }, { name: 'approvals', description: 'Receipts and approvals (optional)', required: false }],
    text: `You are helping a construction AP lead run the three-way match with fairbuild-three-way-match. Invoices: {{invoices}}. Commitments: {{commitments}}. Approvals: {{approvals}}.

Rules: Fairbuild Three-Way Match never pays or posts; ap_pay_invoice, invoice_post and email_send are blocked.

1. Call three_way_match_check. Lead with invoices on hold and why, then invoices to review, then the matched total.
2. Call three_way_match_explain for invoices the person asks about.
3. Call three_way_match_write_report and share the paths.
4. Offer three_way_match_draft_notice for vendors with holds. Only when the person asks, call three_way_match_request_send or three_way_match_request_approval; both need one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...approve.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...approve.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Three-Way Match allowlist.' }] },
});
