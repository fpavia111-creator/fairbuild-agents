#!/usr/bin/env node
// Accuracy check (Kurt's final review question 1), per agent and for the family:
//
// 1. Planted set: the agent's "every-planted-issue" eval case (fictional fixtures with problems
//    planted on purpose when the agent was built). Recall = planted problem types found / planted
//    problem types listed in that case. Findings with any other code are listed as "other" for review.
// 2. Clean set: the same files with every row the agent flagged removed (rows are linked to result
//    items by the column below), rerun on their own. Every finding there is counted as a false positive.
// 3. Mutations: one clean row changed in one place (or a few fields of one row) so it carries a
//    known problem; the agent must report that problem's code.
//
// Personal-data masking is off here because rows are matched to results by name; nothing leaves the
// machine. Results: fairbuild-out/accuracy/accuracy.json and a table on stdout.
//   node scripts/accuracy.mjs [agent ...]
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, parseCsv, toCsv } from '../packages/fairbuild-core/src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'); const PK = join(ROOT, 'packages');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const n0 = (v) => Number(v) || 0;
// link: [input column, result item field]; drop: file arguments left out of the clean rerun because
// they describe the whole set (a contract total, a G702 summary, a spec list) and no longer tie once rows go.
// mut: [file argument, change to its first clean row, expected code].
const C = {
  'fairbuild-backcharges': { link: [['backcharge', 'backcharge']], mut: [['backcharges', { date: '2026-01-05', notice_date: '2026-03-01', status: 'Notified' }, 'late_notice'], ['backcharges', { backup: 'no' }, 'no_backup']] },
  'fairbuild-backlog': { link: [['job', 'job']], mut: [['history', (r, rows) => { const last = rows.filter((x) => x.job === r.job).sort((a, b) => (a.period < b.period ? 1 : -1))[0]; last.estimated_cost = String(n0(last.contract_amount) * 1.2); }, 'loss_forecast']] },
  'fairbuild-bid-leveling': { link: [['bidder', 'bidder']], mut: [['bids', { bond: 'no' }, 'no_bond'], ['bids', { addenda_acknowledged: '0' }, 'missing_addenda']] },
  'fairbuild-bonding-capacity': { link: [['job', 'key'], ['bid', 'key']], mut: [['jobs', { contract_amount: '999999999', bonded: 'yes' }, 'single_over']] },
  'fairbuild-certified-payroll': { link: [['worker', 'worker']], mut: [['payroll', { worker_id: '123-45-6789' }, 'full_ssn_on_report'], ['payroll', { rate_paid: '1' }, 'underpaid']] },
  'fairbuild-change-orders': { link: [['change_order', 'change_order']], mut: [['change_orders', { status: 'Pending', submitted_date: '2026-01-05', approved_date: '', billed: '0' }, 'pending_aging'], ['change_orders', (r) => { r.cost = String(n0(r.amount) * 3 || 9000); if (!n0(r.amount)) r.amount = '3000'; }, 'negative_margin']] },
  'fairbuild-closeout': { link: [['job', 'job']], mut: [['checklist', { status: 'Rejected' }, 'item_rejected']] },
  'fairbuild-commitments': { link: [['commitment', 'commitment']], mut: [['invoices', { amount: '99999999' }, 'over_invoiced']] },
  'fairbuild-delivery-tickets': { link: [['ticket', 'ticket'], ['invoice_number', 'invoice_number']], after: (f) => { const used = new Set(f.invoices.rows.map((r) => r.ticket)); f.tickets.rows = f.tickets.rows.filter((r) => used.has(r.ticket)); }, mut: [['invoices', (r) => { r.quantity = String(n0(r.quantity) * 3); r.amount = String(n0(r.quantity) * n0(r.unit_price)); }, 'qty_over_ticket']] },
  'fairbuild-duplicate-vendors': { link: [['vendor_id', 'vendor_ids']], mut: [['vendors', (r, rows) => { if (!r.tax_id) r.tax_id = '12-3456789'; rows.push({ ...r, vendor_id: 'V-MUT-1', name: 'Mutation Test Supply Co', address: '', phone: '', email: '', bank_last4: '' }); }, 'same_tax_id']] },
  'fairbuild-equipment-rentals': { link: [['invoice_number', 'invoice_number']], mut: [['rentals', { job: '' }, 'no_job'], ['rentals', (r) => { r.off_rent_date = r.period_from; }, 'billed_after_off_rent']] },
  'fairbuild-insurance-certificates': { link: [['vendor', 'vendor']], mut: [['certificates', { additional_insured: 'no' }, 'no_additional_insured'], ['certificates', { expires: '2020-01-01' }, 'expired']] },
  'fairbuild-job-cash-flow': { link: [['job', 'job']], mut: [['receipts', { amount: '0' }, 'cash_negative']] },
  'fairbuild-job-cost': { link: [['cost_code', 'cost_code']], mut: [['costs', { amount: '99999999' }, 'over_budget']] },
  'fairbuild-lien-waivers': { link: [['check_number', 'check_number']], mut: [['waivers', { amount: '1' }, 'waiver_short'], ['waivers', { signed: 'no' }, 'unsigned']] },
  'fairbuild-pay-applications': { link: [['item', 'item']], drop: ['summary', 'previous'], mut: [['lines', (r) => { r.completed_stored = String(n0(r.completed_stored) + 100); }, 'line_total_off']] },
  'fairbuild-payment-release': { link: [['invoice_number', 'invoice_number']], mut: [['invoices', { retainage: '0' }, 'retainage_short'], ['invoices', { pm_approved: 'no' }, 'not_approved']] },
  'fairbuild-permits': { link: [['permit_number', 'permit_number']], mut: [['permits', (r) => { r.expires = '2026-11-25'; }, 'permit_expiring'], ['permits', { expires: '2020-01-01' }, 'permit_expired']] },
  'fairbuild-punch-lists': { link: [['item', 'item']], mut: [['punch', { vendor: '', trade: '' }, 'no_assignee'], ['punch', { due_date: '2020-01-01', status: 'Open', closed_date: '' }, 'past_due']] },
  'fairbuild-retainage': { link: [['job', 'job']], mut: [['receivable', (r) => { r.retainage_held = String(n0(r.billed_to_date) * 0.5); }, 'over_withheld']] },
  'fairbuild-sales-tax': { link: [['invoice_number', 'invoice_number']], mut: [['lines', { tax: '0' }, 'tax_undercharged'], ['lines', (r) => { r.tax = String(n0(r.amount) * 0.5); }, 'tax_overcharged']] },
  'fairbuild-schedule-of-values': { link: [['item', 'item']], drop: ['jobs', 'change_orders'], mut: [['sov', (r) => { r.completed_stored = r.scheduled_value; r.field_percent = '10'; }, 'billed_ahead']] },
  'fairbuild-service-tickets': { link: [['technician', 'technician']], mut: [['tickets', { status: 'Completed', invoice_total: '450', invoice_number: '' }, 'completed_not_invoiced']] },
  'fairbuild-sub-compliance': { link: [['vendor', 'vendor']], mut: [['documents', { status: 'Rejected' }, 'document_rejected'], ['documents', { expires: '2020-01-01' }, 'document_expired']] },
  'fairbuild-submittals': { link: [['submittal', 'submittal']], drop: ['specs'], mut: [['submittals', { required_on_site: '2026-11-20', lead_time_days: '60', status: 'Open', submitted_date: '', returned_date: '' }, 'submit_late']] },
  'fairbuild-three-way-match': { link: [['invoice_number', 'invoice_number']], mut: [['invoices', { commitment: 'NO-SUCH-1' }, 'no_commitment'], ['invoices', { amount: '99999999' }, 'over_commitment']] },
  'fairbuild-timecards': { link: [['worker', 'worker']], mut: [['timecards', { date: '2026-11-14' }, 'weekend'], ['timecards', { hours: '20' }, 'long_day']] },
  'fairbuild-union-fringes': { link: [['union', 'union']], mut: [['remittances', { amount: '1' }, 'under_remitted']] },
  'fairbuild-warranty-callbacks': { link: [['callback_id', 'callback_id']], mut: [['callbacks', { vendor: 'Mutation Plumbing LLC', cost: '500' }, 'backcharge_candidate'], ['callbacks', { vendor: '' }, 'no_responsible_party']] },
  'fairbuild-wip-schedule': { link: [['job', 'job']], mut: [['wip', (r) => { r.estimated_cost = ''; }, 'no_estimate'], ['wip', (r) => { r.estimated_cost = String(n0(r.contract_amount) * 1.5); }, 'loss_job']] },
};

const findingsOf = (result) => (result.items || []).flatMap((i) => (i.findings || []).map((f) => ({ item: i, code: f.code })));
const vals = (v) => (Array.isArray(v) ? v.map(String) : v === undefined || v === null ? [] : [String(v)]);
async function run(manifest, root, tool, args) {
  const r = await new AgentRuntime(manifest, { root, stateDir: join(root, '.fairbuild'), audit: false, memory: false, personal: 'off' }).call(tool, args);
  if (r.status !== 'executed') throw new Error(`${tool}: ${r.status} ${r.reason || ''}`);
  return r.result;
}

const report = []; const T = { agents: 0, planted_total: 0, planted_found: 0, other_on_planted: 0, clean_rows: 0, clean_false_positives: 0, mutation_cases: 0, mutation_caught: 0 };
for (const n of readdirSync(PK).filter((x) => /^fairbuild-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const cfg = C[n]; if (!cfg) { console.log(`${n}: no accuracy config`); continue; }
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const c = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases.find((x) => x.id === 'every-planted-issue');
  const planted = c.expect.contains;
  const tmp = mkdtempSync(join(tmpdir(), 'fairbuild-acc-')); cpSync(join(PK, n, 'fixtures'), join(tmp, 'fixtures'), { recursive: true });
  // 1. planted
  const p = await run(manifest, tmp, c.tool, c.args); const pf = findingsOf(p); const codes = new Set(pf.map((x) => x.code));
  const found = planted.filter((x) => codes.has(x)); const other = pf.filter((x) => !planted.includes(x.code));
  // 2. clean: drop every row linked to a flagged item
  const flagged = new Map(cfg.link.map(([, field]) => [field, new Set()]));
  for (const { item } of pf) for (const [, field] of cfg.link) for (const v of vals(item[field])) flagged.get(field).add(v);
  const csvArgs = Object.entries(c.args).filter(([, v]) => typeof v === 'string' && v.endsWith('.csv'));
  const files = {}; for (const [a, f] of csvArgs) files[a] = { f, rows: parseCsv(readFileSync(join(tmp, f), 'utf8')) };
  for (const [a, x] of Object.entries(files)) {
    const cols = x.rows.length ? Object.keys(x.rows[0]) : [];
    x.cols = cols; x.rows = x.rows.filter((r) => !cfg.link.some(([col, field]) => cols.includes(col) && flagged.get(field).has(String(r[col]))));
  }
  // A ticket whose invoice line was removed with a flagged invoice would look not invoiced: drop it too.
  if (cfg.after) cfg.after(files);
  const cleanArgs = Object.fromEntries(Object.entries(c.args).filter(([a]) => !(cfg.drop || []).includes(a)));
  const write = () => { for (const x of Object.values(files)) writeFileSync(join(tmp, x.f), toCsv(x.rows, x.cols, { raw: true })); };
  write();
  const primary = csvArgs[0][0]; const cleanRows = files[primary].rows.length;
  let cleanFp = []; if (cleanRows) cleanFp = findingsOf(await run(manifest, tmp, c.tool, cleanArgs));
  // 3. mutations on the clean files
  const muts = [];
  for (const [arg, change, expect] of cfg.mut || []) {
    let x = files[arg];
    if (!x || !x.rows.length) {
      // No clean row: change a planted row whose result does not already carry this code, on the planted files.
      const pr = parseCsv(readFileSync(join(PK, n, c.args[arg]), 'utf8')); const [col, field] = cfg.link[0];
      const hasCode = (v) => pf.some((y) => y.code === expect && vals(y.item[field]).includes(String(v)));
      const r0 = pr.find((r) => !hasCode(r[col])); if (!r0) { muts.push({ arg, expect, caught: null, note: 'no row to change' }); continue; }
      const tmp2 = mkdtempSync(join(tmpdir(), 'fairbuild-acc-')); cpSync(join(PK, n, 'fixtures'), join(tmp2, 'fixtures'), { recursive: true });
      if (typeof change === 'function') change(r0, pr); else Object.assign(r0, change);
      writeFileSync(join(tmp2, c.args[arg]), toCsv(pr, Object.keys(pr[0]), { raw: true }));
      const got = findingsOf(await run(manifest, tmp2, c.tool, c.args)).filter((y) => vals(y.item[field]).includes(String(r0[col]))).map((y) => y.code);
      rmSync(tmp2, { recursive: true, force: true });
      muts.push({ arg, expect, caught: got.includes(expect), on: 'planted row (no clean row in the fixtures)' }); continue;
    }
    const saved = x.rows.map((r) => ({ ...r })); const r0 = x.rows[0];
    if (typeof change === 'function') change(r0, x.rows); else Object.assign(r0, change);
    write();
    const got = findingsOf(await run(manifest, tmp, c.tool, cleanArgs)).map((y) => y.code);
    muts.push({ arg, expect, caught: got.includes(expect), also: [...new Set(got.filter((y) => y !== expect))] });
    x.rows = saved; write();
  }
  rmSync(tmp, { recursive: true, force: true });
  const row = { agent: n, planted_total: planted.length, planted_found: found.length, missed: planted.filter((x) => !codes.has(x)), findings_on_planted: pf.length, other_codes: [...new Set(other.map((x) => x.code))], clean_rows: cleanRows, clean_false_positives: cleanFp.length, clean_fp_codes: [...new Set(cleanFp.map((x) => x.code))], mutations: muts };
  report.push(row);
  T.agents++; T.planted_total += row.planted_total; T.planted_found += row.planted_found; T.other_on_planted += other.length; T.clean_rows += cleanRows; T.clean_false_positives += cleanFp.length;
  T.mutation_cases += muts.filter((m) => m.caught !== null).length; T.mutation_caught += muts.filter((m) => m.caught).length;
  console.log(`${n.padEnd(34)} planted ${row.planted_found}/${row.planted_total}${row.missed.length ? ` missed ${row.missed}` : ''}${row.other_codes.length ? ` other ${row.other_codes}` : ''} | clean rows ${cleanRows}, false positives ${cleanFp.length}${cleanFp.length ? ` (${row.clean_fp_codes})` : ''} | mutations ${muts.map((m) => `${m.expect}:${m.caught === null ? 'n/a' : m.caught ? 'caught' : 'MISSED'}`).join(' ')}`);
}
console.log(`\n${T.agents} agents: planted problem types found ${T.planted_found}/${T.planted_total}; ${T.other_on_planted} finding(s) with a code outside the planted list; clean rows ${T.clean_rows}, false positives ${T.clean_false_positives}; mutations caught ${T.mutation_caught}/${T.mutation_cases}.`);
const out = join(ROOT, 'fairbuild-out', 'accuracy'); mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'accuracy.json'), JSON.stringify({ ran_at: new Date().toISOString(), node: process.version, totals: T, agents: report }, null, 2) + '\n');
process.exitCode = T.planted_found < T.planted_total || T.clean_false_positives || T.mutation_caught < T.mutation_cases ? 1 : 0;
