import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['zambezi_draft_notice'] });
  process.stdout.write(`Zambezi of Permits demo (fictional permits and inspections) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { permits: 'permits.csv', inspections: 'inspections.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('zambezi_check', f);
  printStep('Check permits and inspections on two jobs', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.kind.padEnd(10)} ${i.key.padEnd(38)} ${i.status.padEnd(6)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the roofing permit', await rt.call('zambezi_explain', { ...f, item: 'RP-2026-0090' }));
  printStep('Write the worklist', await rt.call('zambezi_write_report', f));
  printStep('Write the calendar file', await rt.call('zambezi_write_calendar', f));
  const d = await rt.call('zambezi_draft_notice', { ...f, job: '24-102' });
  printStep('Draft a notice for job 24-102 (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('zambezi_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to book an inspection itself', await rt.call('inspection_schedule', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
