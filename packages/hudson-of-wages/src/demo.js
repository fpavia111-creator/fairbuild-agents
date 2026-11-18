import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['hudson_draft_corrections'] });
  process.stdout.write(`Hudson of Wages demo (fictional workers and rates; names are masked in results) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { payroll: 'payroll.csv', rates: 'rates.csv', settings: 'settings.json' };
  const a = await rt.call('hudson_check', f);
  printStep('Check two weeks of certified payroll against the determination', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.week_ending} ${i.worker.padEnd(16)} ${i.classification.padEnd(19)} short ${String(i.owed).padStart(6)}  ${i.status.padEnd(9)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain one line by its masked key', await rt.call('hudson_explain', { ...f, worker: a.result.items[0].key }));
  printStep('Write the worklist (the files keep the real names)', await rt.call('hudson_write_report', f));
  const d = await rt.call('hudson_draft_corrections', { ...f, label: '24-102 November', job: '24-102' });
  printStep('Draft the payroll corrections (Auto is opted in for drafts here)', d);
  printStep('Approve sending them: one named click, even in Auto', await rt.call('hudson_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to submit the certified payroll itself', await rt.call('payroll_submit', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
