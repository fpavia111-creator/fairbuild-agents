import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkInsurance, requestText, CERTIFICATE_FIELDS, SCHEDULE_FIELDS, REQUIREMENTS_SCHEMA } from './insurance.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/insurance-certificates';
const props = {
  certificates: { type: 'string', description: 'Certificate log under --root (CSV, Excel or JSON), one row per subcontractor and coverage: insurer, policy number, effective and expiration dates, limits, additional insured, waiver of subrogation, primary and non-contributory' },
  requirements: { type: 'string', description: 'Your insurance requirements JSON (insurance_requirements schema): required coverages, minimum limits and endorsements per coverage, expiring_days, coverage_aliases' },
  schedule: { type: 'string', description: 'Optional subcontractor schedule (vendor, job, start, end) to flag policies that end before the work does; a subcontractor on it with no certificate is reported' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the certificates are judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkInsurance({ certRows: ctx.records(a.certificates, 'certificates'), requirements: ctx.readJson(a.requirements, 'insurance_requirements'), scheduleRows: a.schedule ? ctx.records(a.schedule, 'schedule') : null, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'coi', outDir: OUT, props, required: ['certificates', 'requirements'], run,
  check: { title: 'Check subcontractor insurance certificates', description: 'Per subcontractor and coverage: required coverage on file, expired or expiring, each-occurrence and aggregate limits against your minimums, additional insured, waiver of subrogation, primary and non-contributory, and policies that end before the subcontractor\'s work does.' },
  explain: { arg: 'vendor', argDoc: 'Subcontractor name from coi_check, or "name coverage" for one coverage', key: (i) => [i.key, i.vendor], title: 'Explain one subcontractor',
    description: 'Show one subcontractor\'s coverage and every finding.',
    describe: (i) => `${i.vendor} ${i.coverage}: ${i.status}. Insurer ${i.insurer || 'none'}, policy ${i.policy_number || 'none'}, expires ${i.expires || 'n/a'}, each occurrence ${i.each_occurrence ?? 'n/a'}, aggregate ${i.aggregate ?? 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'insurance-certificates', title: (r) => `Subcontractor insurance certificates as of ${r.as_of}`, description: 'Write the certificate worklist',
    row: (i) => ({ vendor: i.vendor, coverage: i.coverage, insurer: i.insurer, policy_number: i.policy_number, expires: i.expires || '', each_occurrence: i.each_occurrence ?? '', aggregate: i.aggregate ?? '', work_ends: i.work_ends || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['vendor', 'coverage', 'insurer', 'policy_number', 'expires', 'each_occurrence', 'aggregate', 'work_ends', 'status', 'findings', 'reasons'],
    htmlColumns: ['vendor', 'coverage', 'expires', 'each_occurrence', 'aggregate', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By vendor', rows: Object.entries(r.by_vendor).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'coverages', 'problems', 'worst'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Fairbuild Insurance Certificates reads the certificate data you entered; a certificate is evidence of insurance, not the policy. Endorsements and exclusions are for your insurance agent to confirm.'] },
});
const pair = draftPair({
  prefix: 'coi', noun: 'request', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/request-<vendor>.md: a certificate request to one subcontractor (or its insurance agent) listing every coverage that is missing, expired, short or missing an endorsement. Marked DRAFT. Sending goes through coi_request_send (one click).',
  required: ['certificates', 'requirements', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor or agent contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' }, holder: { type: 'string', maxLength: 200, description: 'Certificate holder name and address' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no certificates for "${a.vendor}"; subcontractors: ${Object.keys(r.by_vendor).join(', ')}`);
    const t = requestText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`nothing to request from ${items[0].vendor}: every coverage meets your requirements`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { coverages: t.count } };
  },
});
const refused = refusedTools([
  { name: 'vendor_block', category: 'production_deploy', description: 'Fairbuild Insurance Certificates never blocks a vendor or holds payments in your accounting system; a person decides.' },
  { name: 'insurer_contact', category: 'binding_send', description: 'Fairbuild Insurance Certificates never contacts an insurer or an agent.' },
  { name: 'email_send', category: 'binding_send', description: 'Fairbuild Insurance Certificates never sends the request; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'fairbuild-insurance-certificates', version: pkg.version,
  description: 'Checks subcontractor certificates of insurance against your requirements: required coverages missing, policies expired or expiring, limits below your minimums, missing additional insured, waiver of subrogation or primary and non-contributory, and policies that end before the subcontractor\'s work does. Drafts certificate requests. Blocking a vendor or holding payment is a person\'s decision.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { insurance_requirements: REQUIREMENTS_SCHEMA },
  sources: {
    certificates: { label: 'Certificate of insurance log', args: ['certificates'], fields: CERTIFICATE_FIELDS },
    schedule: { label: 'Subcontractor schedule', args: ['schedule'], fields: SCHEDULE_FIELDS },
  },
  prompts: [{
    name: 'coi_review', title: 'Monthly certificate of insurance review',
    description: 'Walks the host model through the certificate review with Fairbuild Insurance Certificates.',
    arguments: [{ name: 'certificates', description: 'Certificate log', required: true }, { name: 'requirements', description: 'Requirements JSON', required: true }],
    text: `You are helping a construction compliance or AP lead review subcontractor insurance certificates with fairbuild-insurance-certificates. Certificates: {{certificates}}. Requirements: {{requirements}}.

Rules: Fairbuild Insurance Certificates never blocks vendors, contacts insurers or sends; vendor_block, insurer_contact and email_send are blocked. It is not insurance advice.

1. Call coi_check. Lead with missing and expired coverage, then limits and endorsements below your requirements, then policies expiring or ending before the work.
2. Call coi_explain for subcontractors the person asks about.
3. Call coi_write_report and share the paths.
4. Offer coi_draft_request per subcontractor; only when the person asks, call coi_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Fairbuild Insurance Certificates allowlist.' }] },
});
