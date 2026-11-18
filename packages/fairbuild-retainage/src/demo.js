import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['retainage_draft_release'] });
  process.stdout.write(`Fairbuild Retainage demo (fictional jobs, owners and subcontractors) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { receivable: 'receivable.csv', payable: 'payable.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('retainage_check', f);
  printStep('Check retainage receivable and payable', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.side.padEnd(10)} ${i.key.padEnd(7)} ${i.party.padEnd(26)} ${String(i.outstanding).padStart(7)}  ${i.status.padEnd(7)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain job 24-103 (retainage stops at 50%)', await rt.call('retainage_explain', { ...f, key: '24-103' }));
  printStep('Write the worklist', await rt.call('retainage_write_report', f));
  const d = await rt.call('retainage_draft_release', { ...f, job: '23-090', from: 'Dana Example, controller (fictional)' });
  printStep('Draft the release request for job 23-090 (Auto is opted in for drafts here)', d);
  printStep('Approve releasing Example Paving retainage: one named click, even in Auto', await rt.call('retainage_request_payment', { ...f, commitment: 'SC-401', amount: 8000 }));
  printStep('Agent tries to pay the retainage itself', await rt.call('ap_pay_retainage', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
