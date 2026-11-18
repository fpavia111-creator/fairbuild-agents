import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, asOfDate, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkPunch, noticeText, PUNCH_FIELDS, PAYABLE_STATUS_FIELDS, PUNCH_PROFILES, PUNCH_SETTINGS_SCHEMA } from './punchlists.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/elbe';
const props = {
  punch: { type: 'string', description: 'Punch list under --root (CSV, Excel or JSON): item, job, location, description, trade, assignee, created, due, status, closed date. Procore punch list exports are recognised' },
  payables: { type: 'string', description: 'Optional subcontractor balances: vendor, retainage remaining, balance remaining, to find open items on subcontractors already paid in full' },
  settings: { type: 'string', description: 'Optional settings JSON (punch_settings schema): aging_days' },
  as_of: { type: 'string', maxLength: 30, description: 'Date items are aged to, YYYY-MM-DD (default today)' },
};
const run = (a, ctx) => checkPunch({ punchRows: ctx.records(a.punch, 'punch'), payableRows: a.payables ? ctx.records(a.payables, 'payables') : null, settings: a.settings ? ctx.readJson(a.settings, 'punch_settings') : {}, asOf: asOfDate(a.as_of) });
const std = standardTools({
  prefix: 'elbe', outDir: OUT, props, required: ['punch'], run,
  check: { title: 'Check the punch list', description: 'Per open punch item: past due, open longer than your aging days, reopened, no one assigned, and open on a subcontractor you have already paid in full with no retainage left. Counts by subcontractor and job.' },
  explain: { arg: 'item', argDoc: 'Punch item number from elbe_check (or "job item")', key: (i) => [i.key, i.item], title: 'Explain one punch item',
    description: 'Show one punch item with every finding.',
    describe: (i) => `${i.item} on job ${i.job} (${i.location}, ${i.trade}, ${i.vendor || 'unassigned'}): ${i.status}. ${i.description}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'elbe-punch', title: (r) => `Punch list as of ${r.as_of}`, description: 'Write the punch list worklist',
    row: (i) => ({ job: i.job, item: i.item, location: i.location, description: i.description, trade: i.trade, vendor: i.vendor, created: i.created || '', due_date: i.due_date || '', age_days: i.age_days ?? '', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'item', 'location', 'description', 'trade', 'vendor', 'created', 'due_date', 'age_days', 'status', 'findings', 'reasons'],
    htmlColumns: ['job', 'item', 'location', 'description', 'vendor', 'due_date', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By trade', rows: Object.entries(r.by_trade).map(([vendor, v]) => ({ vendor, ...v })), columns: ['vendor', 'trade', 'open', 'past_due'] },
      { title: 'By job', rows: Object.entries(r.by_job).map(([job, v]) => ({ job, ...v })), columns: ['job', 'items', 'open', 'past_due'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count'] },
    ],
    limits: ['files', 'settings', 'advice'] },
});
const pair = draftPair({
  prefix: 'elbe', noun: 'notice', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/notice-<vendor>.md: one subcontractor\'s open punch items with locations and due dates. Marked DRAFT. Sending goes through elbe_request_send (one click).',
  required: ['punch', 'vendor'],
  args: { ...props, vendor: { type: 'string', maxLength: 200, description: 'Subcontractor name' }, contact: { type: 'string', maxLength: 200, description: 'Subcontractor contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => i.vendor && sameParty(i.vendor, a.vendor));
    if (!items.length) throw new Error(`no punch items assigned to "${a.vendor}"`);
    const t = noticeText(items, { ...a, vendor: items[0].vendor });
    if (!t.count) throw new Error(`${items[0].vendor} has no open punch items`);
    return { id: items[0].vendor, to: a.contact || undefined, text: t.text, extra: { items: t.count } };
  },
});
const refused = refusedTools([
  { name: 'punch_close', category: 'production_deploy', description: 'Elbe never closes, reassigns or edits a punch item.' },
  { name: 'backcharge_post', category: 'production_deploy', description: 'Elbe never charges a subcontractor for punch work.' },
  { name: 'email_send', category: 'binding_send', description: 'Elbe never sends the notice; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'elbe-of-punchlists', version: pkg.version,
  description: 'Checks punch list items by job, trade and subcontractor: items past due, open too long, reopened, with no one assigned, and open items on subcontractors you have already paid in full. Procore punch list exports are recognised. Drafts punch notices; closing items and charging subcontractors is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { punch_settings: PUNCH_SETTINGS_SCHEMA },
  sources: {
    punch: { label: 'Punch list', args: ['punch'], fields: PUNCH_FIELDS, profiles: PUNCH_PROFILES },
    payables: { label: 'Subcontractor balances', args: ['payables'], fields: PAYABLE_STATUS_FIELDS },
  },
  prompts: [{
    name: 'punch_review', title: 'Weekly punch list review',
    description: 'Walks the host model through the punch list with Elbe.',
    arguments: [{ name: 'punch', description: 'Punch list', required: true }, { name: 'payables', description: 'Subcontractor balances (optional)', required: false }],
    text: `You are helping a superintendent or project manager work the punch list with elbe-of-punchlists. Punch list: {{punch}}. Balances: {{payables}}.

Rules: Elbe never closes items, charges subcontractors or sends; punch_close, backcharge_post and email_send are blocked.

1. Call elbe_check. Lead with open items on subcontractors already paid in full, then past-due items by subcontractor, then the rest.
2. Call elbe_explain for items the person asks about.
3. Call elbe_write_report and share the paths.
4. Offer elbe_draft_notice per subcontractor; only when the person asks, call elbe_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Elbe allowlist.' }] },
});
