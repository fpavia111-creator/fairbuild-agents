import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkSubmittals, reminderText, SUBMITTAL_FIELDS, SPEC_FIELDS, SUBMITTAL_PROFILES, SUBMITTAL_SETTINGS_SCHEMA } from './submittals.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/oder';
const props = {
  submittals: { type: 'string', description: 'Submittal register under --root (CSV, Excel or JSON): number, revision, spec section, title, responsible contractor, status, ball in court, submitted and returned dates, required on-site date, lead time days, review days. Procore submittal log exports are recognised' },
  specs: { type: 'string', description: 'Optional list of spec sections that need submittals, to find sections with none' },
  settings: { type: 'string', description: 'Optional settings JSON (submittal_settings schema): review_days, resubmit_days, loop_revision' },
  as_of: { type: 'string', maxLength: 30, description: 'Date the register is judged on, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkSubmittals({ submittalRows: ctx.records(a.submittals, 'submittals'), specRows: a.specs ? ctx.records(a.specs, 'specs') : null, settings: a.settings ? ctx.readJson(a.settings, 'submittal_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'oder', outDir: OUT, props, required: ['submittals'], run,
  check: { title: 'Check the submittal register against site dates', description: 'Per submittal (latest revision): order-by and latest submit dates worked back from the required on-site date, lead time and review time; not submitted in time; review running over; revise-and-resubmit not resubmitted; third or later submission; approved after the order-by date. Spec sections with no submittal. Ball-in-court aging.' },
  explain: { arg: 'submittal', argDoc: 'Submittal number from oder_check (or "section <spec section>")', key: (i) => [i.key, i.submittal, i.spec_section], title: 'Explain one submittal',
    description: 'Show one submittal\'s dates, ball in court and every finding.',
    describe: (i) => `${i.submittal || 'No submittal'} ${i.spec_section} ${i.title} (${i.vendor || 'no contractor'}): ${i.status}${i.ball_in_court ? `, with ${i.ball_in_court} ${i.days_in_court ?? '?'} day(s)` : ''}. Needed on site ${i.required_on_site || 'n/a'}, order by ${i.order_by || 'n/a'}, submit by ${i.submit_by || 'n/a'}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'oder-submittals', title: (r) => `Submittal register as of ${r.as_of}`, description: 'Write the submittal worklist',
    row: (i) => ({ submittal: i.submittal, revision: i.revision ?? '', spec_section: i.spec_section, title: i.title, vendor: i.vendor, ball_in_court: i.ball_in_court, days_in_court: i.days_in_court ?? '', required_on_site: i.required_on_site || '', order_by: i.order_by || '', submit_by: i.submit_by || '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['submittal', 'revision', 'spec_section', 'title', 'vendor', 'ball_in_court', 'days_in_court', 'required_on_site', 'order_by', 'submit_by', 'status', 'findings', 'reasons'],
    htmlColumns: ['submittal', 'spec_section', 'title', 'ball_in_court', 'days_in_court', 'order_by', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By ball in court', rows: Object.entries(r.by_ball_in_court).map(([party, v]) => ({ party, ...v })), columns: ['party', 'open', 'oldest_days'] },
      { title: 'By spec section', rows: Object.entries(r.by_spec_section).map(([spec_section, v]) => ({ spec_section, ...v })), columns: ['spec_section', 'submittals', 'late'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice', 'Lead times and review periods are the ones in your register; Oder does not know a supplier\'s real lead time. It does not read the submittal documents or the reviewer\'s comments.'] },
});
const pair = draftPair({
  prefix: 'oder', noun: 'reminder', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/reminder-<party>.md: the late submittals sitting with one party (architect, engineer or subcontractor), with the dates material is needed on site. Marked DRAFT. Sending goes through oder_request_send (one click).',
  required: ['submittals', 'party'],
  args: { ...props, party: { type: 'string', maxLength: 200, description: 'Ball-in-court party or responsible contractor' }, to: { type: 'string', maxLength: 200, description: 'Contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => (i.ball_in_court && sameParty(i.ball_in_court, a.party)) || (i.vendor && sameParty(i.vendor, a.party)));
    if (!items.length) throw new Error(`no submittals with or from "${a.party}"`);
    const t = reminderText(items, { ...a, party: String(a.party).trim() });
    if (!t.count) throw new Error(`nothing late with ${a.party}`);
    return { id: String(a.party).trim(), to: a.to || undefined, text: t.text, extra: { submittals: t.count } };
  },
});
const refused = refusedTools([
  { name: 'submittal_approve', category: 'production_deploy', description: 'Oder never approves, returns or changes a submittal.' },
  { name: 'procore_update', category: 'production_deploy', description: 'Oder never writes to your project management system.' },
  { name: 'email_send', category: 'binding_send', description: 'Oder never sends the reminder; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'oder-of-submittals', version: pkg.version,
  description: 'Works the submittal register back from the date material is needed on site: submittals not submitted by their latest submit date, reviews over their allowed days, revise-and-resubmit not resubmitted, third and later revisions, approvals after the order-by date and spec sections with no submittal, with ball-in-court aging. Drafts reminders. Approving submittals is the design team\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { submittal_settings: SUBMITTAL_SETTINGS_SCHEMA },
  sources: {
    submittals: { label: 'Submittal register', args: ['submittals'], fields: SUBMITTAL_FIELDS, profiles: SUBMITTAL_PROFILES },
    specs: { label: 'Spec sections needing submittals', args: ['specs'], fields: SPEC_FIELDS },
  },
  prompts: [{
    name: 'submittal_review', title: 'Weekly submittal review',
    description: 'Walks the host model through the submittal register with Oder.',
    arguments: [{ name: 'submittals', description: 'Submittal register', required: true }, { name: 'specs', description: 'Spec sections (optional)', required: false }],
    text: `You are helping a project engineer manage submittals with oder-of-submittals. Register: {{submittals}}. Specs: {{specs}}.

Rules: Oder never approves submittals, writes to the project system or sends; submittal_approve, procore_update and email_send are blocked.

1. Call oder_check. Lead with submittals late against site dates (earliest order-by first), then reviews and resubmittals overdue by ball in court, then loops, late approvals and missing sections.
2. Call oder_explain for submittals the person asks about.
3. Call oder_write_report and share the paths.
4. Offer oder_draft_reminder per party; only when the person asks, call oder_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Oder allowlist.' }] },
});
