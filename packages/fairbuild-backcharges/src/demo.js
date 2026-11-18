import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['backcharges_draft_notice'] });
  process.stdout.write(`Fairbuild Backcharges demo (fictional backcharges and balances) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { backcharges: 'backcharges.csv', balances: 'balances.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('backcharges_check', f);
  printStep('Track six backcharges', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.backcharge} ${i.vendor.padEnd(24)} ${String(i.amount).padStart(5)} open ${String(i.open_amount).padStart(5)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain BC-03', await rt.call('backcharges_explain', { ...f, backcharge: 'BC-03' }));
  printStep('Write the worklist', await rt.call('backcharges_write_report', f));
  const d = await rt.call('backcharges_draft_notice', { ...f, vendor: 'Example Electric Inc' });
  printStep('Draft a backcharge notice (Auto is opted in for drafts here)', d);
  printStep('Approve deducting BC-01: one named click, even in Auto', await rt.call('backcharges_request_deduction', { ...f, backcharge: 'BC-01', amount: 1200 }));
  printStep('Agent tries to deduct from a payment itself', await rt.call('ap_deduct_payment', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
