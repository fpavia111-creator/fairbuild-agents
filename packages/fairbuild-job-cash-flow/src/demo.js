import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['cash_flow_draft_collection'] });
  process.stdout.write(`Fairbuild Job Cash Flow demo (fictional jobs and cash) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { receipts: 'receipts.csv', disbursements: 'disbursements.csv', billings: 'billings.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('cash_flow_check', f);
  printStep('Measure cash by job', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.job}  in ${String(i.cash_in).padStart(7)}  out ${String(i.cash_out).padStart(7)}  net ${String(i.net).padStart(7)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain job 24-102', await rt.call('cash_flow_explain', { ...f, job: '24-102' }));
  printStep('Write the worklist', await rt.call('cash_flow_write_report', f));
  const d = await rt.call('cash_flow_draft_collection', { ...f, job: '24-102' });
  printStep('Draft a collection letter (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('cash_flow_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to move money itself', await rt.call('bank_transfer', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
