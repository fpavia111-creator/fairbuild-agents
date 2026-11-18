import { defineManifest, MODEL_PIN, COMMITMENT_PROFILES, standardTools, draftPair, requestTool, refusedTools, asOfDate, jobKey, round2 } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkRetainage, releaseText, RECEIVABLE_FIELDS, PAYABLE_FIELDS, RETAINAGE_SETTINGS_SCHEMA } from './retainage.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/nile';
const props = {
  receivable: { type: 'string', description: 'Retainage receivable by job under --root (CSV, Excel or JSON): job, owner, contract, billed to date, retainage rate, retainage held, optional stop-at percent, release billed, release collected, completion date' },
  payable: { type: 'string', description: 'Optional subcontracts with retainage you hold: commitment, job, vendor, invoiced, retainage rate, retainage held, retainage released, status. Procore commitment exports are recognised' },
  settings: { type: 'string', description: 'Optional settings JSON (retainage_settings schema): release_days, collect_days, tolerance' },
  as_of: { type: 'string', maxLength: 30, description: 'Date retainage is judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => {
  if (!a.receivable && !a.payable) throw new Error('give receivable, payable or both');
  return checkRetainage({ receivableRows: a.receivable ? ctx.records(a.receivable, 'receivable') : [], payableRows: a.payable ? ctx.records(a.payable, 'payable') : [], settings: a.settings ? ctx.readJson(a.settings, 'retainage_settings') : {}, asOf: asOfDate(a.as_of) });
};
const std = standardTools({
  prefix: 'nile', outDir: OUT, props, required: ['receivable'], run,
  check: { title: 'Check retainage both ways', description: 'Per job: retainage the owner holds against the contract rate (and a stop-at percent), completed jobs whose retainage is due or overdue to bill, releases billed and not collected. Per subcontract: retainage you hold against its rate, retainage released before the owner paid yours, and retainage now owed to a subcontractor. Net position.' },
  explain: { arg: 'key', argDoc: 'Job number (receivable) or commitment number (payable) from nile_check', key: (i) => [i.key, `${i.side} ${i.key}`], title: 'Explain one job or subcontract',
    description: 'Show one job\'s or subcontract\'s retainage and every finding.',
    describe: (i) => `${i.side} ${i.key} (${i.party}, job ${i.job}): ${i.status}. Base ${i.base}, rate ${i.retainage_pct ?? '?'}%, held ${i.held}, released ${i.released}, outstanding ${i.outstanding}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'nile-retainage', title: 'Retainage receivable and payable', description: 'Write the retainage worklist',
    row: (i) => ({ side: i.side, key: i.key, job: i.job, party: i.party, base: i.base, retainage_pct: i.retainage_pct ?? '', held: i.held, released: i.released, outstanding: i.outstanding, completion: i.completion || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['side', 'key', 'job', 'party', 'base', 'retainage_pct', 'held', 'released', 'outstanding', 'completion', 'status', 'findings', 'reasons'],
    htmlColumns: ['side', 'key', 'party', 'held', 'released', 'outstanding', 'status', 'reasons'],
    sections: (r) => [
      { title: 'Receivable by job', rows: Object.entries(r.receivable_by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'client', 'held', 'collected', 'outstanding'] },
      { title: 'Payable by vendor', rows: Object.entries(r.payable_by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'subcontracts', 'held', 'released', 'outstanding'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Release terms (completion, closeout documents, pay-when-paid) come from your contracts; Nile uses only the dates and amounts in your files.'] },
});
const pair = draftPair({
  prefix: 'nile', noun: 'release', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/release-<job>.md: a retainage release request to the owner of one completed job, with [ATTACH] for the closeout documents. Marked DRAFT. Sending goes through nile_request_send (one click).',
  required: ['receivable', 'job'],
  args: { ...props, job: { type: 'string', maxLength: 60, description: 'Job number' }, to: { type: 'string', maxLength: 200, description: 'Owner contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const i = r.items.find((x) => x.side === 'receivable' && jobKey(x.job) === jobKey(a.job));
    if (!i) throw new Error(`job "${a.job}" is not in the receivable file`);
    if (!i.findings.some((f) => ['release_overdue', 'release_due'].includes(f.code))) throw new Error(`job ${i.job} has no retainage ready to bill for release (no completion date, or the release is already billed)`);
    const t = releaseText(i, a);
    return { id: i.job, to: a.to || undefined, text: t.text, amount: t.amount };
  },
});
const pay = requestTool({
  prefix: 'nile', verb: 'payment', category: 'move_money', outDir: OUT, file: 'retainage-release-approvals.csv', actor: 'accounts payable',
  title: 'Approve releasing a subcontractor\'s retainage (one click)',
  description: 'After one named human click (even in Auto), record in retainage-release-approvals.csv that a subcontractor\'s held retainage may be released, up to what Nile shows as owed. Nile never pays; AP pays after this record.',
  props: { ...props, payable: { type: 'string', description: props.payable.description }, commitment: { type: 'string', maxLength: 60, description: 'Commitment number from nile_check' }, amount: { type: 'number', minimum: 0, description: 'Amount to release; at most what is still held' } },
  required: ['receivable', 'payable', 'commitment', 'amount'], run,
  columns: ['commitment', 'vendor', 'job', 'held', 'released_before', 'approved_amount'],
  pick: (a, r) => {
    const i = r.items.find((x) => x.side === 'payable' && x.key.toUpperCase() === String(a.commitment).trim().toUpperCase());
    if (!i) throw new Error(`commitment ${a.commitment} is not in the payable file`);
    if (a.amount > i.outstanding + 0.005) throw new Error(`amount ${a.amount} is more than the ${i.outstanding} still held on ${i.key}`);
    return { commitment: i.key, vendor: i.party, job: i.job, held: i.held, released_before: i.released, approved_amount: round2(a.amount) };
  },
  summary: (row) => `Release of ${row.approved_amount} of retainage to ${row.vendor} (${row.commitment}) approved.`,
});
const refused = refusedTools([
  { name: 'ap_pay_retainage', category: 'move_money', description: 'Nile never pays a subcontractor; AP pays after a recorded approval.' },
  { name: 'invoice_create', category: 'binding_send', description: 'Nile never creates or submits a retainage invoice.' },
  { name: 'email_send', category: 'binding_send', description: 'Nile never sends the release request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'nile-of-retainage', version: pkg.version,
  description: 'Tracks retainage both ways: what owners hold from you by job and what you hold from subcontractors. Flags retainage at the wrong rate or past a stop point, completed jobs whose retainage is due or overdue to bill, releases billed and not collected, subcontractor retainage released before the owner paid yours, and retainage now owed to a subcontractor. Drafts release requests; releasing money is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { retainage_settings: RETAINAGE_SETTINGS_SCHEMA },
  sources: {
    receivable: { label: 'Retainage receivable by job', args: ['receivable'], fields: RECEIVABLE_FIELDS },
    payable: { label: 'Subcontract retainage payable', args: ['payable'], fields: PAYABLE_FIELDS, profiles: COMMITMENT_PROFILES },
  },
  prompts: [{
    name: 'retainage_review', title: 'Monthly retainage review',
    description: 'Walks the host model through retainage receivable and payable with Nile.',
    arguments: [{ name: 'receivable', description: 'Retainage receivable by job', required: true }, { name: 'payable', description: 'Subcontract retainage (optional)', required: false }],
    text: `You are helping a construction controller review retainage with nile-of-retainage. Receivable: {{receivable}}. Payable: {{payable}}.

Rules: Nile never bills, pays or sends; ap_pay_retainage, invoice_create and email_send are blocked.

1. Call nile_check. Lead with retainage ready to bill for release, then releases billed and not collected, then retainage now owed to subcontractors, then rate problems.
2. Call nile_explain for anything the person asks about.
3. Call nile_write_report and share the paths.
4. Offer nile_draft_release for completed jobs. Only when the person asks, call nile_request_send or nile_request_payment; both need one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...pay.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...pay.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Nile allowlist.' }] },
});
