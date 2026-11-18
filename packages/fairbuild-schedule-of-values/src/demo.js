import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['sov_draft_memo'] });
  process.stdout.write(`Fairbuild Schedule of Values demo (fictional jobs and schedule of values) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { sov: 'sov.csv', jobs: 'jobs.csv', change_orders: 'change-orders.csv', settings: 'settings.json' };
  const a = await rt.call('sov_check', f);
  printStep('Compare two schedules of values with billing and the field', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.key.padEnd(11)} ${i.description.padEnd(30)} ${String(i.billed_percent ?? '').padStart(6)} ${String(i.field_percent ?? '').padStart(4)}  ${i.status.padEnd(7)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the drywall line', await rt.call('sov_explain', { ...f, line: '24-101 4' }));
  printStep('Write the worklist', await rt.call('sov_write_report', f));
  const d = await rt.call('sov_draft_memo', { ...f, job: '24-101', to: 'Pat Example, project manager (fictional)' });
  printStep('Draft the memo for job 24-101 (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('sov_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to change the billing itself', await rt.call('billing_update', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
