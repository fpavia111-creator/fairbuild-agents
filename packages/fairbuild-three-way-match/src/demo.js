import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['three_way_match_draft_notice'] });
  process.stdout.write(`Fairbuild Three-Way Match demo (fictional invoices, commitments and approvals) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { invoices: 'invoices.csv', commitments: 'commitments.csv', approvals: 'approvals.csv', settings: 'settings.json' };
  const a = await rt.call('three_way_match_check', f);
  printStep('Three-way match eight invoices', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.invoice_number.padEnd(9)} ${i.vendor.padEnd(22)} ${String(i.amount).padStart(7)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain EE-5501', await rt.call('three_way_match_explain', { ...f, invoice_number: 'EE-5501' }));
  printStep('Write the worklist', await rt.call('three_way_match_write_report', f));
  const d = await rt.call('three_way_match_draft_notice', { ...f, vendor: 'Sample Lumber Supply' });
  printStep('Draft a hold notice (Auto is opted in for drafts here)', d);
  printStep('Approve paying EC-2231 less retainage: one named click, even in Auto', await rt.call('three_way_match_request_approval', { ...f, invoice_number: 'EC-2231', amount: 36000 }));
  printStep('Agent tries to pay the invoice itself', await rt.call('ap_pay_invoice', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
