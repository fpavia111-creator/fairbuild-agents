import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkTickets, creditText, TICKET_FIELDS, INVOICE_LINE_FIELDS, PRICE_FIELDS, TICKET_SETTINGS_SCHEMA } from './tickets.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/mekong';
const props = {
  tickets: { type: 'string', description: 'Signed delivery tickets under --root (CSV, Excel or JSON): ticket, supplier, job, date, material, quantity delivered, unit' },
  invoices: { type: 'string', description: 'Supplier invoice lines: invoice, supplier, job, ticket referenced, material, quantity, unit price, amount' },
  prices: { type: 'string', description: 'Optional agreed prices by supplier and material (quote, PO or price list)' },
  settings: { type: 'string', description: 'Optional settings JSON (ticket_settings schema): accrue_after_days, price_tolerance, tolerance' },
  as_of: { type: 'string', maxLength: 30, description: 'Date for aging tickets not invoiced, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkTickets({ ticketRows: ctx.records(a.tickets, 'tickets'), lineRows: ctx.records(a.invoices, 'invoices'), priceRows: a.prices ? ctx.records(a.prices, 'prices') : null, settings: a.settings ? ctx.readJson(a.settings, 'ticket_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'mekong', outDir: OUT, props, required: ['tickets', 'invoices'], run,
  check: { title: 'Match supplier invoices to delivery tickets', description: 'Per invoice line: quantity billed against the signed ticket (including what earlier invoices already billed on it), price against the agreed price, quantity times price against the amount, lines with no ticket (and the ticket that probably matches), and tickets delivered but not invoiced, to accrue.' },
  explain: { arg: 'line', argDoc: 'Invoice line from mekong_check as "invoice ticket material", or a ticket number', key: (i) => [i.key, i.invoice_number, i.ticket], title: 'Explain one line or ticket',
    description: 'Show one invoice line or ticket and every finding.',
    describe: (i) => `${i.key} (${i.supplier}, job ${i.job}): ${i.status}. ${i.quantity} at ${i.unit_price ?? 'n/a'} (agreed ${i.agreed_price ?? 'n/a'}) = ${i.amount}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'mekong-tickets', title: 'Delivery tickets against supplier invoices', description: 'Write the ticket matching worklist',
    row: (i) => ({ kind: i.kind, invoice_number: i.invoice_number, ticket: i.ticket, supplier: i.supplier, job: i.job, material: i.material, quantity: i.quantity, unit_price: i.unit_price ?? '', agreed_price: i.agreed_price ?? '', amount: i.amount, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['kind', 'invoice_number', 'ticket', 'supplier', 'job', 'material', 'quantity', 'unit_price', 'agreed_price', 'amount', 'status', 'findings', 'reasons'],
    htmlColumns: ['invoice_number', 'ticket', 'supplier', 'material', 'quantity', 'unit_price', 'amount', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By supplier', rows: Object.entries(r.by_supplier).map(([supplier, v]) => ({ supplier, ...v })), columns: ['supplier', 'lines', 'billed', 'overbilled'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Mekong compares the quantities and prices in your files. It does not read scanned tickets; tickets typed with the wrong quantity give wrong results.'] },
});
const pair = draftPair({
  prefix: 'mekong', noun: 'credit', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/credit-<supplier>.md: a credit request to one supplier for every overbilled line, with [ATTACH] for the signed tickets. Marked DRAFT. Sending goes through mekong_request_send (one click).',
  required: ['tickets', 'invoices', 'supplier'],
  args: { ...props, supplier: { type: 'string', maxLength: 200, description: 'Supplier name' }, contact: { type: 'string', maxLength: 200, description: 'Supplier billing contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.supplier, a.supplier));
    if (!items.length) throw new Error(`no invoice lines from "${a.supplier}"; suppliers: ${Object.keys(r.by_supplier).join(', ')}`);
    const t = creditText(items, { ...a, supplier: items[0].supplier });
    if (!t.count) throw new Error(`nothing to claim from ${items[0].supplier}: no overbilled line`);
    return { id: items[0].supplier, to: a.contact || undefined, text: t.text, amount: t.total };
  },
});
const refused = refusedTools([
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Mekong never pays or approves a supplier invoice for payment.' },
  { name: 'receiving_update', category: 'production_deploy', description: 'Mekong never changes receiving or ticket records.' },
  { name: 'email_send', category: 'binding_send', description: 'Mekong never sends the credit request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'mekong-of-tickets', version: pkg.version,
  description: 'Matches supplier invoice lines for materials to the signed delivery tickets and your agreed prices: quantities billed past what was delivered, prices above the agreed price, extensions that do not add up, tickets billed twice, lines with no ticket, and tickets not yet invoiced to accrue. Drafts supplier credit requests. Paying is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { ticket_settings: TICKET_SETTINGS_SCHEMA },
  sources: {
    tickets: { label: 'Delivery tickets', args: ['tickets'], fields: TICKET_FIELDS },
    invoices: { label: 'Supplier invoice lines', args: ['invoices'], fields: INVOICE_LINE_FIELDS },
    prices: { label: 'Agreed prices', args: ['prices'], fields: PRICE_FIELDS },
  },
  prompts: [{
    name: 'ticket_matching', title: 'Weekly material invoice matching',
    description: 'Walks the host model through matching supplier invoices to delivery tickets with Mekong.',
    arguments: [{ name: 'tickets', description: 'Delivery tickets', required: true }, { name: 'invoices', description: 'Supplier invoice lines', required: true }],
    text: `You are helping a construction AP clerk or project accountant match material invoices to delivery tickets with mekong-of-tickets. Tickets: {{tickets}}. Invoices: {{invoices}}.

Rules: Mekong never pays, changes receiving or sends; ap_pay_invoice, receiving_update and email_send are blocked.

1. Call mekong_check. Lead with tickets billed twice and quantities over the ticket, then prices over the agreed price and extension errors, then lines with no ticket and tickets to accrue.
2. Call mekong_explain for lines the person asks about.
3. Call mekong_write_report and share the paths.
4. Offer mekong_draft_credit per supplier; only when the person asks, call mekong_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Mekong allowlist.' }] },
});
