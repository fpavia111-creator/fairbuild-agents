import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, exportProfile } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { checkWages, correctionText, PAYROLL_FIELDS, DETERMINATION_FIELDS, WAGE_SETTINGS_SCHEMA } from './wages.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/hudson';
const PAYROLL_PROFILES = [exportProfile('wh347_payroll_lines', { worker: ['Name of Worker', 'Name'], worker_id: ['Identifying Number', 'Last 4 SSN'], classification: 'Work Classification', hours: ['Total Hours', 'Straight Time Hours'], overtime_hours: 'Overtime Hours', rate_paid: 'Rate of Pay', fringe_paid: 'Fringe Benefits', week_ending: 'Week Ending', job: ['Project', 'Project Number'] })];
const props = {
  payroll: { type: 'string', description: 'Certified payroll lines under --root (CSV, Excel or JSON): job, week ending, worker, worker id or last four of SSN, classification, straight and overtime hours, rate paid, fringe paid per hour. A WH-347-style column layout is recognised' },
  rates: { type: 'string', description: 'Wage determination rates for the job: classification, base rate, fringe rate' },
  settings: { type: 'string', description: 'Optional settings JSON (wage_settings schema): ot_multiplier, weekly_ot_after, classification_aliases, tolerance' },
};
const run = (a, ctx) => checkWages({ payrollRows: ctx.records(a.payroll, 'payroll'), rateRows: ctx.records(a.rates, 'rates'), settings: a.settings ? ctx.readJson(a.settings, 'wage_settings') : {} });
const std = standardTools({
  prefix: 'hudson', outDir: OUT, props, required: ['payroll', 'rates'], run,
  check: { title: 'Check certified payroll against wage rates', description: 'Per worker and week: cash plus fringe per hour against base plus fringe for the classification, straight and overtime; straight-time hours past the weekly limit; classifications not on the determination; missing worker ids; full Social Security numbers on the report; lines entered twice. Worker names and ids are masked in what the model sees.' },
  explain: { arg: 'worker', argDoc: 'Worker (the pseudonym shown in hudson_check) or "week worker"', key: (i) => [i.key, i.worker], personal: 'name', title: 'Explain one payroll line',
    description: 'Show one worker-week line against the rate and every finding.',
    describe: (i) => `${i.worker} week ending ${i.week_ending} (${i.classification}): ${i.status}. ${i.hours} straight + ${i.overtime_hours} overtime hour(s) at ${i.rate_paid} + ${i.fringe_paid}; rate ${i.required_rate ?? 'none'} + ${i.required_fringe ?? 'none'}; short ${i.owed}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'hudson-payroll', title: 'Certified payroll against wage rates', description: 'Write the certified payroll worklist',
    row: (i) => ({ job: i.job, week_ending: i.week_ending, worker: i.worker, worker_id: i.worker_id, classification: i.classification, hours: i.hours, overtime_hours: i.overtime_hours, rate_paid: i.rate_paid, fringe_paid: i.fringe_paid, required_rate: i.required_rate ?? '', required_fringe: i.required_fringe ?? '', owed: i.owed, status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['job', 'week_ending', 'worker', 'worker_id', 'classification', 'hours', 'overtime_hours', 'rate_paid', 'fringe_paid', 'required_rate', 'required_fringe', 'owed', 'status', 'findings', 'reasons'],
    htmlColumns: ['week_ending', 'worker', 'classification', 'hours', 'overtime_hours', 'rate_paid', 'fringe_paid', 'owed', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By classification', rows: Object.entries(r.by_classification).map(([classification, v]) => ({ classification, ...v })), columns: ['classification', 'lines', 'hours', 'owed'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'personal', 'Hudson compares cash plus fringe with the rates you supplied. Which determination applies, apprentice rates, fringe credits and overtime rules are for your labor compliance adviser.'] },
});
const pair = draftPair({
  prefix: 'hudson', noun: 'corrections', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person in payroll',
  description: 'Write drafts/corrections-<label>.md: the lines to correct before the certified payroll is signed, with the amount short per line. Marked DRAFT. Sending goes through hudson_request_send (one click). The draft holds real names; keep it in a secure folder.',
  required: ['payroll', 'rates', 'label'],
  args: { ...props, label: { type: 'string', maxLength: 80, description: 'Name for the note, for example "24-102 week ending 2026-11-14"' }, job: { type: 'string', maxLength: 60, description: 'Job number for the heading' }, to: { type: 'string', maxLength: 200, description: 'Payroll contact' }, from: { type: 'string', maxLength: 200, description: 'Your name' } },
  build: (a, ctx) => { const r = run(a, ctx); if (!r.items.some((i) => i.status !== 'ok')) throw new Error('nothing to correct: every line meets the rates'); return { id: a.label, to: a.to || undefined, text: correctionText(r, a), amount: r.owed }; },
});
const refused = refusedTools([
  { name: 'payroll_submit', category: 'binding_send', description: 'Hudson never signs or submits a certified payroll to an agency or owner.' },
  { name: 'payroll_run', category: 'move_money', description: 'Hudson never runs payroll or pays restitution.' },
  { name: 'email_send', category: 'binding_send', description: 'Hudson never sends the correction note; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'hudson-of-wages', version: pkg.version,
  description: 'Checks certified payroll lines against the wage rates of the job\'s determination: cash plus fringe below the rate for the classification, overtime not paid as overtime, classifications with no rate, missing worker ids, full Social Security numbers on the report and lines entered twice. Worker names and ids are masked in what the model sees. Drafts payroll corrections; submitting payroll and paying is a person\'s job.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { wage_settings: WAGE_SETTINGS_SCHEMA },
  sources: {
    payroll: { label: 'Certified payroll lines', args: ['payroll'], fields: PAYROLL_FIELDS, profiles: PAYROLL_PROFILES },
    rates: { label: 'Wage determination rates', args: ['rates'], fields: DETERMINATION_FIELDS },
  },
  prompts: [{
    name: 'certified_payroll_check', title: 'Weekly certified payroll check',
    description: 'Walks the host model through the certified payroll check with Hudson.',
    arguments: [{ name: 'payroll', description: 'Payroll lines', required: true }, { name: 'rates', description: 'Wage determination rates', required: true }],
    text: `You are helping a construction payroll or compliance lead check certified payroll with hudson-of-wages. Payroll: {{payroll}}. Rates: {{rates}}.

Rules: Hudson never submits payroll or pays; payroll_submit, payroll_run and email_send are blocked. Worker names and ids reach you as pseudonyms: use them as given and never ask for real names. This is not legal advice.

1. Call hudson_check. Lead with lines paid below the determination and the amount short, then overtime, then classifications with no rate and id problems.
2. Call hudson_explain for lines the person asks about.
3. Call hudson_write_report and share the paths (the files hold real names).
4. Offer hudson_draft_corrections; only when the person asks, call hudson_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Hudson allowlist.' }] },
});
