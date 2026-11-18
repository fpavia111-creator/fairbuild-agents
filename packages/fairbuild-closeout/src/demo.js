import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['closeout_draft_reminder'] });
  process.stdout.write(`Fairbuild Closeout demo (fictional jobs and checklists) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { jobs: 'jobs.csv', checklist: 'checklist.csv', requirements: 'requirements.json', as_of: '2026-11-16' };
  const a = await rt.call('closeout_check', f);
  printStep('Check closeout on completed jobs', a);
  for (const i of a.result.items.filter((x) => x.status !== 'done')) process.stdout.write(`    ${i.job} ${i.item.padEnd(26)} ${i.status.padEnd(9)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain job 23-090 O&M manuals', await rt.call('closeout_explain', { ...f, job: '23-090 O&M manuals' }));
  printStep('Write the worklist', await rt.call('closeout_write_report', f));
  const d = await rt.call('closeout_draft_reminder', { ...f, job: '23-090' });
  printStep('Draft a closeout reminder (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('closeout_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to submit the closeout package itself', await rt.call('closeout_submit', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
