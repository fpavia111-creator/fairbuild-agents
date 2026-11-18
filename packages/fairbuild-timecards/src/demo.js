import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['timecards_draft_recode'] });
  process.stdout.write(`Fairbuild Timecards demo (fictional workers and jobs; names are masked in results) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { timecards: 'timecards.csv', assignments: 'assignments.csv', jobs: 'jobs.csv', budget: 'budget.csv', settings: 'settings.json' };
  const a = await rt.call('timecards_check', f);
  printStep('Check a week of timecards', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.date} ${i.worker.padEnd(16)} ${String(i.hours).padStart(4)}h  ${i.status.padEnd(13)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the first worker-day', await rt.call('timecards_explain', { ...f, worker_day: a.result.items[0].key }));
  printStep('Write the worklist (the files keep the real names)', await rt.call('timecards_write_report', f));
  const d = await rt.call('timecards_draft_recode', { ...f, label: 'week ending 2026-11-14' });
  printStep('Draft the recode request (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('timecards_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to edit a timecard itself', await rt.call('timecard_edit', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
