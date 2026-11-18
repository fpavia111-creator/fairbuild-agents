import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['oder_draft_reminder'] });
  process.stdout.write(`Oder of Submittals demo (a fictional submittal register) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { submittals: 'submittals.csv', specs: 'specs.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('oder_check', f);
  printStep('Check the submittal register against site dates', a);
  for (const i of a.result.items) process.stdout.write(`    ${(i.submittal || '-').padEnd(12)} ${i.spec_section.padEnd(9)} ${i.title.padEnd(32)} order by ${String(i.order_by ?? '').padEnd(10)} ${i.status.padEnd(11)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the coiling doors', await rt.call('oder_explain', { ...f, submittal: 'S-083323-01' }));
  printStep('Write the worklist', await rt.call('oder_write_report', f));
  const d = await rt.call('oder_draft_reminder', { ...f, party: 'Architect' });
  printStep('Draft a reminder to the architect (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('oder_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to approve a submittal itself', await rt.call('submittal_approve', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
