import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['orinoco_draft_recovery'] });
  process.stdout.write(`Orinoco of Vendors demo (fictional vendors and invoices) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { vendors: 'vendors.csv', invoices: 'invoices.csv', settings: 'settings.json' };
  const a = await rt.call('orinoco_check', f);
  printStep('Look for duplicate vendors and invoices', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.kind.padEnd(12)} ${i.key.padEnd(18)} ${String(i.paid_twice).padStart(6)}  ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the concrete duplicate', await rt.call('orinoco_explain', { ...f, key: 'EC-2210' }));
  printStep('Write the worklist', await rt.call('orinoco_write_report', f));
  const d = await rt.call('orinoco_draft_recovery', { ...f, vendor: 'Example Concrete LLC' });
  printStep('Draft a recovery letter (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('orinoco_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to merge the vendors itself', await rt.call('vendor_merge', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
