import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { findDuplicates, recoveryText, VENDOR_MASTER_FIELDS, DUP_INVOICE_FIELDS, DUP_SETTINGS_SCHEMA } from './vendors.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/orinoco';
const props = {
  vendors: { type: 'string', description: 'Vendor master under --root (CSV, Excel or JSON): vendor id, name, tax id, address, city, phone, e-mail, last four of the bank account' },
  invoices: { type: 'string', description: 'Optional AP invoices with vendor id, invoice number, date, amount and payment status' },
  settings: { type: 'string', description: 'Optional settings JSON (duplicate_settings schema): name_threshold, near_days' },
};
const run = (a, ctx) => findDuplicates({ vendorRows: ctx.records(a.vendors, 'vendors'), invoiceRows: a.invoices ? ctx.records(a.invoices, 'invoices') : null, settings: a.settings ? ctx.readJson(a.settings, 'duplicate_settings') : {} });
const std = standardTools({
  prefix: 'orinoco', outDir: OUT, props, required: ['vendors'], run,
  check: { title: 'Find duplicate vendors and invoices', description: 'Vendor pairs that share a tax id, bank account, address or phone, or whose names match once legal forms are set aside. Invoices entered twice: the same number (punctuation and leading zeros aside), across duplicate vendor records, or the same amount within days under a near-identical number. Says which were paid twice and which are still open.' },
  explain: { arg: 'key', argDoc: 'Vendor pair ("V100 V101") or invoice group (its invoice numbers) from orinoco_check, or one invoice number', key: (i) => [i.key, ...i.vendor_ids, ...i.invoices.map((x) => x.split(' ')[0])], title: 'Explain one duplicate',
    description: 'Show one duplicate vendor pair or invoice group with every finding.',
    describe: (i) => `${i.kind === 'vendor_pair' ? 'Vendors' : 'Invoices'} ${i.key} (${i.vendors.join(' / ')}): ${i.status}. ${i.invoices.length ? `${i.invoices.join('; ')}. ` : ''}${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'orinoco-duplicates', title: 'Duplicate vendors and invoices', description: 'Write the duplicates worklist',
    row: (i) => ({ kind: i.kind, key: i.key, vendor_ids: i.vendor_ids.join(' '), vendors: i.vendors.join(' / '), invoices: i.invoices.join('; '), amount: i.amount, paid_twice: i.paid_twice, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['kind', 'key', 'vendor_ids', 'vendors', 'invoices', 'amount', 'paid_twice', 'status', 'findings', 'reasons'],
    htmlColumns: ['kind', 'vendors', 'invoices', 'amount', 'paid_twice', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Duplicate vendors', rows: r.duplicate_vendors, columns: ['vendor_ids', 'names', 'status'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice', 'A duplicate here is a likely duplicate: confirm with the invoices, the bank and the vendor before stopping or recovering a payment.'] },
});
const pair = draftPair({
  prefix: 'orinoco', noun: 'recovery', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/recovery-<vendor>.md: a refund or credit request to one vendor for invoices paid twice. Marked DRAFT, with [TO CONFIRM] to check both payments cleared. Sending goes through orinoco_request_send (one click).',
  required: ['vendors', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Vendor name as on the invoices' }, contact: { type: 'string', maxLength: 200, description: 'Vendor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => i.kind === 'invoice_dup' && i.vendors.some((v) => sameParty(v, a.vendor)));
    if (!items.length) throw new Error(`no duplicate invoices for "${a.vendor}"`);
    const t = recoveryText(items, { ...a, vendor: items[0].vendors[0] });
    if (!t.count) throw new Error(`nothing was paid twice to ${items[0].vendors[0]}; stop the open duplicates instead`);
    return { id: items[0].vendors[0], to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const refused = refusedTools([
  { name: 'vendor_merge', category: 'production_deploy', description: 'Orinoco never merges, deactivates or edits vendor records.' },
  { name: 'payment_void', category: 'move_money', description: 'Orinoco never voids, stops or reissues a payment.' },
  { name: 'email_send', category: 'binding_send', description: 'Orinoco never sends the recovery letter; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'orinoco-of-vendors', version: pkg.version,
  description: 'Finds duplicates in the vendor master and AP invoices: vendors entered twice (same tax id, bank account, address, phone or name once legal forms are set aside), invoices entered under two numbers, two vendor records or twice for one vendor, duplicates already paid twice and duplicates still open. Drafts recovery letters. Merging vendors and stopping payments is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { duplicate_settings: DUP_SETTINGS_SCHEMA },
  sources: {
    vendors: { label: 'Vendor master', args: ['vendors'], fields: VENDOR_MASTER_FIELDS },
    invoices: { label: 'AP invoices', args: ['invoices'], fields: DUP_INVOICE_FIELDS },
  },
  prompts: [{
    name: 'duplicate_review', title: 'Quarterly duplicate vendor and invoice review',
    description: 'Walks the host model through the duplicate review with Orinoco.',
    arguments: [{ name: 'vendors', description: 'Vendor master', required: true }, { name: 'invoices', description: 'AP invoices (optional)', required: false }],
    text: `You are helping a construction AP lead look for duplicate vendors and payments with orinoco-of-vendors. Vendors: {{vendors}}. Invoices: {{invoices}}.

Rules: Orinoco never merges vendors, voids payments or sends; vendor_merge, payment_void and email_send are blocked. Every duplicate is a likely one until the person confirms it.

1. Call orinoco_check. Lead with invoices paid twice, then open duplicates to stop before payment, then vendor records to merge.
2. Call orinoco_explain for anything the person asks about.
3. Call orinoco_write_report and share the paths.
4. Offer orinoco_draft_recovery for vendors paid twice; only when the person asks, call orinoco_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Orinoco allowlist.' }] },
});
