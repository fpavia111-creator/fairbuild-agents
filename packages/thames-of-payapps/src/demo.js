import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['thames_draft_corrections'] });
  process.stdout.write(`Thames of Pay Apps demo (a fictional application 7 on job 24-101) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { lines: 'app-07-lines.csv', summary: 'app-07-summary.json', previous: 'app-06-lines.csv', settings: 'settings.json' };
  const a = await rt.call('thames_check', f);
  printStep('Check application 7 against its summary page and application 6', a);
  for (const i of a.result.items) process.stdout.write(`    ${String(i.item).padEnd(5)} ${i.description.padEnd(30)} ${String(i.completed_stored ?? '').padStart(7)}  ${i.status.padEnd(6)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain line 4', await rt.call('thames_explain', { ...f, item: '4' }));
  printStep('Write the check', await rt.call('thames_write_report', f));
  const d = await rt.call('thames_draft_corrections', { ...f, label: '24-101 application 7', to: 'Billing desk (fictional)' });
  printStep('Draft the correction note (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('thames_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to submit the pay application itself', await rt.call('payapp_submit', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
