import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['service_draft_followup'] });
  process.stdout.write(`Fairbuild Service Tickets demo (fictional technicians and tickets; names are masked in results) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { tickets: 'tickets.csv', timesheets: 'timesheets.csv', settings: 'settings.json' };
  const a = await rt.call('service_check', f);
  printStep('Check a week of service tickets and timesheets', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.kind.padEnd(10)} ${i.key.padEnd(16)} ${String(i.revenue).padStart(6)} util ${String(i.utilisation_pct ?? '').padStart(5)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain ticket ST-9005', await rt.call('service_explain', { ...f, key: 'ST-9005' }));
  printStep('Write the worklist', await rt.call('service_write_report', f));
  const d = await rt.call('service_draft_followup', { ...f, label: 'week of 2026-11-09' });
  printStep('Draft the billing follow-up (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('service_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to invoice the customer itself', await rt.call('invoice_create', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
