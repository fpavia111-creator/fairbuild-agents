import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['danube_draft_letter'] });
  process.stdout.write(`Danube of Commitments demo (fictional jobs, vendors and commitments) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { commitments: 'commitments.csv', invoices: 'invoices.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('danube_check', f);
  printStep('Check eight subcontracts and POs against the AP invoices', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.commitment.padEnd(7)} ${i.vendor.padEnd(22)} ${String(i.revised).padStart(8)} ${String(i.invoiced).padStart(8)}  ${i.status.padEnd(9)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the lumber PO', await rt.call('danube_explain', { ...f, commitment: 'PO-201' }));
  printStep('Write the worklist', await rt.call('danube_write_report', f));
  const d = await rt.call('danube_draft_letter', { ...f, vendor: 'Sample Lumber Supply', from: 'Dana Example, project accountant (fictional)' });
  printStep('Draft a letter to Sample Lumber Supply (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('danube_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to close the PO itself', await rt.call('po_close', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
