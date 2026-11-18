import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['volga_draft_followup'] });
  process.stdout.write(`Volga of Change Orders demo (fictional jobs and change orders) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { change_orders: 'change-orders.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('volga_check', f);
  printStep('Check the change order log on two jobs', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.job} ${i.change_order.padEnd(8)} ${i.state.padEnd(9)} ${String(i.amount ?? '').padStart(6)} ${String(i.billed).padStart(6)}  ${i.status.padEnd(14)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the soffit framing change', await rt.call('volga_explain', { ...f, change_order: 'CO-005' }));
  printStep('Write the worklist', await rt.call('volga_write_report', f));
  const d = await rt.call('volga_draft_followup', { ...f, job: '24-101', from: 'Pat Example, project manager (fictional)' });
  printStep('Draft the owner follow-up for job 24-101 (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('volga_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to bill a change order itself', await rt.call('invoice_create', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
