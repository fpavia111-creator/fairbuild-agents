import { defineManifest, MODEL_PIN, COMMITMENT_FIELDS, COMMITMENT_PROFILES, AP_INVOICE_FIELDS, AP_PROFILES, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkCommitments, letterText, COMMITMENT_SETTINGS_SCHEMA } from './commitments.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/danube';
const props = {
  commitments: { type: 'string', description: 'Subcontracts and purchase orders under --root (CSV, Excel or JSON): number, job, vendor, original amount, approved changes, revised amount, invoiced, paid, retainage, status, executed. Procore and Buildertrend layouts are recognised' },
  invoices: { type: 'string', description: 'Optional AP invoice register with the commitment each invoice is billed against. When given, invoiced to date comes from it and is tied to the commitment report' },
  settings: { type: 'string', description: 'Optional settings JSON (commitment_settings schema): stale_days, tolerance, retainage_check' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the open balances are judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkCommitments({ commitmentRows: ctx.records(a.commitments, 'commitments'), invoiceRows: a.invoices ? ctx.records(a.invoices, 'invoices') : null, settings: a.settings ? ctx.readJson(a.settings, 'commitment_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'danube', outDir: OUT, props, required: ['commitments'], run,
  check: { title: 'Check commitments and open POs', description: 'Per subcontract and PO: value (original plus approved changes), invoiced, paid and still open; billed or paid past its value; billing on an unsigned commitment; retainage held at the wrong rate; closed with a balance; open with no invoice for a long time; invoices that name no commitment.' },
  explain: { arg: 'commitment', argDoc: 'Commitment number from danube_check (subcontract or PO)', key: (i) => i.commitment, title: 'Explain one commitment',
    description: 'Show one commitment\'s value, invoiced, paid, open balance and every finding.',
    describe: (i) => `${i.commitment} ${i.vendor} (job ${i.job}): ${i.status}. Value ${i.revised}, invoiced ${i.invoiced}, paid ${i.paid ?? 'n/a'}, open ${i.open}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'danube-commitments', title: 'Commitments and open purchase orders', description: 'Write the commitments worklist',
    row: (i) => ({ commitment: i.commitment, job: i.job, vendor: i.vendor, cost_code: i.cost_code, revised: i.revised, invoiced: i.invoiced, paid: i.paid ?? '', open_amount: i.open, last_invoice: i.last_invoice || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['commitment', 'job', 'vendor', 'cost_code', 'revised', 'invoiced', 'paid', 'open_amount', 'last_invoice', 'status', 'findings', 'reasons'],
    htmlColumns: ['commitment', 'job', 'vendor', 'revised', 'invoiced', 'open_amount', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'commitments', 'revised', 'invoiced', 'open'] },
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'commitments', 'revised', 'invoiced', 'open'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice'] },
});
const pair = draftPair({
  prefix: 'danube', noun: 'letter', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/letter-<vendor>.md: one letter to one vendor listing its commitments that need an answer (a credit or change order for over-billing, the signed subcontract, a final invoice for a stale PO). Marked DRAFT. Sending goes through danube_request_send (one click).',
  required: ['commitments', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Vendor name as it appears in the commitment list' }, contact: { type: 'string', maxLength: 200, description: 'Vendor contact (name or e-mail)' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no commitments for vendor "${a.vendor}"; vendors in the file: ${Object.keys(r.by_vendor).join(', ')}`);
    const l = letterText(items, { ...a, vendor: items[0].vendor });
    if (!l.count) throw new Error(`nothing to ask ${items[0].vendor}: its commitments need no answer from the vendor`);
    return { id: items[0].vendor, to: a.contact || undefined, text: l.text, extra: { commitments: l.count } };
  },
});
const refused = refusedTools([
  { name: 'po_close', category: 'production_deploy', description: 'Danube never closes or reduces a commitment in your accounting system; a person does after the vendor confirms.' },
  { name: 'po_change', category: 'production_deploy', description: 'Danube never issues or changes a subcontract, PO or change order.' },
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Danube never pays vendors.' },
  { name: 'email_send', category: 'binding_send', description: 'Danube never sends letters; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'danube-of-commitments', version: pkg.version,
  description: 'Checks subcontracts and purchase orders against AP invoices and payments: committed cost still open, commitments billed or paid past their value, billing on unsigned subcontracts, retainage held at the wrong rate, closed commitments with a balance, stale open POs and invoices that name no commitment. Drafts vendor letters. Closing or changing a commitment is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { commitment_settings: COMMITMENT_SETTINGS_SCHEMA },
  sources: {
    commitments: { label: 'Subcontracts and purchase orders', args: ['commitments'], fields: COMMITMENT_FIELDS, profiles: COMMITMENT_PROFILES },
    invoices: { label: 'AP invoices', args: ['invoices'], fields: AP_INVOICE_FIELDS, profiles: AP_PROFILES },
  },
  prompts: [{
    name: 'commitment_review', title: 'Monthly commitment review',
    description: 'Walks the host model through the commitment review with Danube.',
    arguments: [{ name: 'commitments', description: 'Commitment list under --root', required: true }, { name: 'invoices', description: 'AP invoice register (optional)', required: false }],
    text: `You are helping a project accountant review subcontracts and POs with danube-of-commitments. Commitments: {{commitments}}. Invoices: {{invoices}}.

Rules: Danube never closes, changes or pays anything; po_close, po_change, ap_pay_invoice and email_send are blocked.

1. Call danube_check. Lead with commitments billed or paid past their value, then billing on unsigned commitments, then invoices that name no commitment, then stale and closed balances.
2. Call danube_explain for any commitment the person asks about.
3. Call danube_write_report and share the paths.
4. Offer danube_draft_letter per vendor; only when the person asks, call danube_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Danube allowlist.' }] },
});
