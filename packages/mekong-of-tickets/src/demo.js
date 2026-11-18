import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['mekong_draft_credit'] });
  process.stdout.write(`Mekong of Tickets demo (fictional suppliers, tickets and invoices) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { tickets: 'tickets.csv', invoices: 'invoices.csv', prices: 'prices.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('mekong_check', f);
  printStep('Match supplier invoices to delivery tickets', a);
  for (const i of a.result.items) process.stdout.write(`    ${(i.invoice_number || '-').padEnd(9)} ${(i.ticket || '-').padEnd(7)} ${i.material.padEnd(18)} ${String(i.amount).padStart(6)}  ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the second bill for ticket DT-504', await rt.call('mekong_explain', { ...f, line: 'SL-88342' }));
  printStep('Write the worklist', await rt.call('mekong_write_report', f));
  const d = await rt.call('mekong_draft_credit', { ...f, supplier: 'Sample Lumber Supply' });
  printStep('Draft a credit request (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('mekong_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to pay the supplier itself', await rt.call('ap_pay_invoice', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
