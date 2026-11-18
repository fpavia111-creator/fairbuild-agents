import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['fringes_draft_letter'] });
  process.stdout.write(`Fairbuild Union Fringes demo (fictional locals, funds and hours) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { hours: 'hours.csv', rates: 'rates.csv', remittances: 'remittances.csv', settings: 'settings.json', as_of: '2026-11-20' };
  const a = await rt.call('fringes_check', f);
  printStep('Reconcile October fringe remittances', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.key.padEnd(36)} due ${String(i.due ?? '').padStart(7)} remitted ${String(i.remitted).padStart(7)}  ${i.status.padEnd(7)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the Local 100 Pension month', await rt.call('fringes_explain', { ...f, fund_month: 'Local 100 Pension 2026-10' }));
  printStep('Write the worklist', await rt.call('fringes_write_report', f));
  const d = await rt.call('fringes_draft_letter', { ...f, union: 'Local 100' });
  printStep('Draft a letter to the Local 100 funds (Auto is opted in for drafts here)', d);
  printStep('Approve paying the Training shortfall: one named click, even in Auto', await rt.call('fringes_request_payment', { ...f, fund_month: 'Local 100 Training 2026-10', amount: 375 }));
  printStep('Agent tries to pay the fund itself', await rt.call('ach_pay', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
