import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['warranty_draft_notice'] });
  process.stdout.write(`Fairbuild Warranty Callbacks demo (fictional homes and callbacks; homeowners are masked in results) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { callbacks: 'callbacks.csv', jobs: 'jobs.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('warranty_check', f);
  printStep('Review six warranty callbacks', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.callback_id} ${i.job} ${i.trade.padEnd(10)} ${String(i.cost).padStart(5)}  ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the repeat leak', await rt.call('warranty_explain', { ...f, callback_id: 'CB-102' }));
  printStep('Write the worklist', await rt.call('warranty_write_report', f));
  const d = await rt.call('warranty_draft_notice', { ...f, vendor: 'Example Roofing LLC' });
  printStep('Draft a notice to the roofer (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('warranty_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to post a backcharge itself', await rt.call('backcharge_post', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
