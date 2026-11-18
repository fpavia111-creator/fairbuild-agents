import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkCompliance, requestText, VENDOR_FIELDS, DOCUMENT_FIELDS, DOC_REQUIREMENTS_SCHEMA } from './compliance.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/sub-compliance';
const props = {
  documents: { type: 'string', description: 'Compliance document log under --root (CSV, Excel or JSON): vendor, document type, status, received date, expiration date, and a value column for ratings such as an EMR' },
  requirements: { type: 'string', description: 'Your document requirements JSON (document_requirements schema): required documents, extra documents by trade, expiring_days, review_days, max_emr, document_aliases' },
  vendors: { type: 'string', description: 'Optional subcontractor list with trade and status; only active ones are checked, and an active one with no documents is reported' },
  as_of: { type: 'string', maxLength: 30, description: 'Date documents are judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkCompliance({ vendorRows: a.vendors ? ctx.records(a.vendors, 'vendors') : null, docRows: ctx.records(a.documents, 'documents'), requirements: ctx.readJson(a.requirements, 'document_requirements'), asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'sub_compliance', outDir: OUT, props, required: ['documents', 'requirements'], run,
  check: { title: 'Check subcontractor compliance documents', description: 'Per active subcontractor and required document (your list plus the extra documents its trade needs): on file, approved, not expired or expiring, not waiting too long for review, and an EMR within your limit.' },
  explain: { arg: 'vendor', argDoc: 'Subcontractor name from sub_compliance_check, or "name document"', key: (i) => [i.key, i.vendor], title: 'Explain one subcontractor',
    description: 'Show one subcontractor document and every finding.',
    describe: (i) => `${i.vendor} (${i.trade || 'no trade'}) ${i.document}: ${i.status}. Status ${i.doc_status || 'none'}, received ${i.received || 'n/a'}, expires ${i.expires || 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'sub-compliance', title: (r) => `Subcontractor compliance documents as of ${r.as_of}`, description: 'Write the compliance worklist',
    row: (i) => ({ vendor: i.vendor, trade: i.trade, document: i.document, doc_status: i.doc_status, received: i.received || '', expires: i.expires || '', value: i.value ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['vendor', 'trade', 'document', 'doc_status', 'received', 'expires', 'value', 'status', 'findings', 'reasons'],
    htmlColumns: ['vendor', 'trade', 'document', 'doc_status', 'expires', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'trade', 'documents', 'problems'] },
      { title: 'By document', rows: Object.entries(r.by_document).map(([document, v]) => ({ document, ...v })), columns: ['document', 'vendors', 'problems'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice', 'Fairbuild Sub Compliance checks what your document log records. Whether a licence or document is valid is for the issuing body or your compliance lead to confirm.'] },
});
const pair = draftPair({
  prefix: 'sub_compliance', noun: 'request', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/request-<vendor>.md: one request to one subcontractor for every document that is missing, expired, rejected or expiring. Marked DRAFT. Sending goes through sub_compliance_request_send (one click).',
  required: ['documents', 'requirements', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no active subcontractor "${a.vendor}"; subcontractors: ${Object.keys(r.by_vendor).join(', ')}`);
    const t = requestText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to request from ${items[0].vendor}: its file is complete`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { documents: t.count } };
  },
});
const refused = refusedTools([
  { name: 'vendor_approve', category: 'production_deploy', description: 'Fairbuild Sub Compliance never approves a subcontractor or changes its status in your systems.' },
  { name: 'vendor_block', category: 'production_deploy', description: 'Fairbuild Sub Compliance never blocks a vendor or holds payments.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Sub Compliance never sends the request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-sub-compliance', version: pkg.version,
  description: 'Checks each active subcontractor\'s compliance documents against your list and the extra ones its trade needs: missing, expired, expiring, rejected, waiting too long for review, and safety ratings above your limit. Drafts document requests. Approving or blocking a vendor is a person\'s decision.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { document_requirements: DOC_REQUIREMENTS_SCHEMA },
  sources: {
    documents: { label: 'Compliance document log', args: ['documents'], fields: DOCUMENT_FIELDS },
    vendors: { label: 'Subcontractor list', args: ['vendors'], fields: VENDOR_FIELDS },
  },
  prompts: [{
    name: 'compliance_review', title: 'Monthly subcontractor compliance review',
    description: 'Walks the host model through the compliance document review with Fairbuild Sub Compliance.',
    arguments: [{ name: 'documents', description: 'Document log', required: true }, { name: 'requirements', description: 'Requirements JSON', required: true }],
    text: `You are helping a construction compliance lead review subcontractor documents with fairbuild-sub-compliance. Documents: {{documents}}. Requirements: {{requirements}}.

Rules: Fairbuild Sub Compliance never approves or blocks vendors and never sends; vendor_approve, vendor_block and email_send are blocked.

1. Call sub_compliance_check. Lead with missing, expired and rejected documents, then documents waiting for review and ratings over your limit, then expiring ones.
2. Call sub_compliance_explain for subcontractors the person asks about.
3. Call sub_compliance_write_report and share the paths.
4. Offer sub_compliance_draft_request per subcontractor; only when the person asks, call sub_compliance_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Sub Compliance allowlist.' }] },
});
