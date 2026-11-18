import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['loire_draft_journal'] });
  process.stdout.write(`Loire of WIP demo (seven fictional jobs) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { wip: 'wip.csv', settings: 'settings.json', period_end: '2026-10-31' };
  const a = await rt.call('loire_check', f);
  printStep('Build the WIP schedule for October', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.job.padEnd(7)} ${String(i.percent_complete ?? '').padStart(6)}%  earned ${String(i.earned_revenue ?? '').padStart(9)}  over ${String(i.over_billed).padStart(7)}  under ${String(i.under_billed).padStart(8)}  ${i.status.padEnd(6)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the loss job', await rt.call('loire_explain', { ...f, job: '24-103' }));
  printStep('Write the WIP schedule', await rt.call('loire_write_report', f));
  const d = await rt.call('loire_draft_journal', { ...f, prepared_by: 'Dana Example, controller (fictional)' });
  printStep('Draft the over/under billing journal (Auto is opted in for drafts here)', d);
  printStep('Approve the journal for posting: one named click, even in Auto', await rt.call('loire_request_post', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to post to the ledger itself', await rt.call('gl_post', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
