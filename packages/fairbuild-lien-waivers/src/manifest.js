import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkWaivers, requestText, PAYMENTS_FIELDS, WAIVER_FIELDS, WAIVER_SETTINGS_SCHEMA } from './waivers.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/lien-waivers';
const props = {
  payments: { type: 'string', description: 'Payments to subcontractors and suppliers under --root (CSV, Excel or JSON): check or payment number, vendor, job, date, amount, and whether it is a final payment' },
  waivers: { type: 'string', description: 'Lien waiver log: vendor, job, waiver type (conditional or unconditional, progress or final), through date, amount, received date, the payment it covers, signed' },
  settings: { type: 'string', description: 'Optional settings JSON (waiver_settings schema): unconditional_days, tolerance' },
  as_of: { type: 'string', maxLength: 30, description: 'Date waivers are judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkWaivers({ paymentRows: ctx.records(a.payments, 'payments'), waiverRows: ctx.records(a.waivers, 'waivers'), settings: a.settings ? ctx.readJson(a.settings, 'waiver_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'lien_waivers', outDir: OUT, props, required: ['payments', 'waivers'], run,
  check: { title: 'Match lien waivers to payments', description: 'Per payment: a conditional waiver on file before the money went out, the unconditional waiver within your window after it, waivers for the full amount paid, signed waivers, and final waivers for a final payment. Waivers are matched by payment number, else by vendor, job and amount.' },
  explain: { arg: 'check_number', argDoc: 'Check or payment number from lien_waivers_check', key: (i) => i.check_number, title: 'Explain one payment',
    description: 'Show one payment\'s waivers and every finding.',
    describe: (i) => `${i.check_number} to ${i.vendor} (job ${i.job}) ${i.amount} on ${i.date}: ${i.status}. Conditional: ${i.conditional || 'none'}; unconditional: ${i.unconditional || 'none'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'lien-waivers', title: 'Lien waivers against payments', description: 'Write the waiver worklist',
    row: (i) => ({ check_number: i.check_number, vendor: i.vendor, job: i.job, date: i.date || '', amount: i.amount, final: i.final ? 'yes' : 'no', conditional: i.conditional || '', unconditional: i.unconditional || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['check_number', 'vendor', 'job', 'date', 'amount', 'final', 'conditional', 'unconditional', 'status', 'findings', 'reasons'],
    htmlColumns: ['check_number', 'vendor', 'job', 'date', 'amount', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'payments', 'paid', 'missing', 'at_risk'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Lien and waiver rules differ by state and contract; Fairbuild Lien Waivers checks what your files record against the window you set. It does not read the waiver documents themselves.'] },
});
const pair = draftPair({
  prefix: 'lien_waivers', noun: 'request', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/request-<vendor>.md: one request to one vendor for every waiver still missing, short or unsigned on its payments. Marked DRAFT. Sending goes through lien_waivers_request_send (one click).',
  required: ['payments', 'waivers', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Vendor name as in the payment file' }, contact: { type: 'string', maxLength: 200, description: 'Vendor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no payments to "${a.vendor}"; vendors: ${Object.keys(r.by_vendor).join(', ')}`);
    const t = requestText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to request from ${items[0].vendor}: every payment has its waivers`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { payments: t.count } };
  },
});
const refused = refusedTools([
  { name: 'lien_file', category: 'binding_send', description: 'Fairbuild Lien Waivers never files, records or releases a lien or a bond claim.' },
  { name: 'ap_pay_invoice', category: 'move_money', description: 'Fairbuild Lien Waivers never pays or holds a payment itself; a person decides.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Lien Waivers never sends the request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-lien-waivers', version: pkg.version,
  description: 'Matches every payment to a subcontractor or supplier with its lien waivers: payments made without a conditional waiver, unconditional waivers missing after the payment cleared, waivers for less than was paid, unsigned waivers and final payments without final waivers. Drafts waiver requests. Never files or releases a lien and never pays.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { waiver_settings: WAIVER_SETTINGS_SCHEMA },
  sources: {
    payments: { label: 'Payments to vendors', args: ['payments'], fields: PAYMENTS_FIELDS },
    waivers: { label: 'Lien waiver log', args: ['waivers'], fields: WAIVER_FIELDS },
  },
  prompts: [{
    name: 'waiver_review', title: 'Weekly lien waiver review',
    description: 'Walks the host model through the waiver review with Fairbuild Lien Waivers.',
    arguments: [{ name: 'payments', description: 'Payment register', required: true }, { name: 'waivers', description: 'Waiver log', required: true }],
    text: `You are helping a construction AP lead match lien waivers to payments with fairbuild-lien-waivers. Payments: {{payments}}. Waivers: {{waivers}}.

Rules: Fairbuild Lien Waivers never files a lien, pays or sends; lien_file, ap_pay_invoice and email_send are blocked. Waiver rules differ by state and contract: say so, and do not give legal advice.

1. Call lien_waivers_check. Lead with payments that went out without the waivers they need, then short or unsigned waivers, then unconditional waivers still within their window.
2. Call lien_waivers_explain for payments the person asks about.
3. Call lien_waivers_write_report and share the paths.
4. Offer lien_waivers_draft_request per vendor; only when the person asks, call lien_waivers_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Lien Waivers allowlist.' }] },
});
