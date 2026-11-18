import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['punch_list_draft_notice'] });
  process.stdout.write(`Fairbuild Punch Lists demo (fictional punch items) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { punch: 'punch.csv', payables: 'payables.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('punch_list_check', f);
  printStep('Check eight punch items on two jobs', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.job} ${i.item.padEnd(4)} ${i.description.padEnd(30)} ${i.status.padEnd(9)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain P-5', await rt.call('punch_list_explain', { ...f, item: 'P-5' }));
  printStep('Write the worklist', await rt.call('punch_list_write_report', f));
  const d = await rt.call('punch_list_draft_notice', { ...f, vendor: 'Example Roofing LLC' });
  printStep('Draft a punch notice to the roofer (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('punch_list_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to close the item itself', await rt.call('punch_close', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
