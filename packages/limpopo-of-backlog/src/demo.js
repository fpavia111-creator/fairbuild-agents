import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['limpopo_draft_memo'] });
  process.stdout.write(`Limpopo of Backlog demo (six fictional jobs, three months) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { history: 'history.csv', settings: 'settings.json' };
  const a = await rt.call('limpopo_check', f);
  printStep('Measure backlog and fade', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.job}  ${String(i.first_margin_pct).padStart(6)}% -> ${String(i.latest_margin_pct).padStart(6)}%  backlog ${String(i.backlog).padStart(9)}  ${i.status.padEnd(6)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain job 24-103', await rt.call('limpopo_explain', { ...f, job: '24-103' }));
  printStep('Write the worklist', await rt.call('limpopo_write_report', f));
  const d = await rt.call('limpopo_draft_memo', { ...f, to: 'Owner (fictional)' });
  printStep('Draft the backlog memo (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('limpopo_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to change an estimate itself', await rt.call('estimate_update', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
