import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['tagus_draft_refund'] });
  process.stdout.write(`Tagus of Sales Tax demo (fictional jurisdictions, rates and invoices) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { lines: 'lines.csv', rates: 'rates.csv', jobs: 'jobs.csv', settings: 'settings.json' };
  const a = await rt.call('tagus_check', f);
  printStep('Check tax on seven material invoice lines', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.invoice_number.padEnd(9)} ${i.jurisdiction.padEnd(14)} ${String(i.amount).padStart(6)} tax ${String(i.tax).padStart(7)} expected ${String(i.expected_tax ?? '').padStart(7)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain SRM-7701', await rt.call('tagus_explain', { ...f, line: 'SRM-7701' }));
  printStep('Write the worklist', await rt.call('tagus_write_report', f));
  const d = await rt.call('tagus_draft_refund', { ...f, vendor: 'Sample Glass Co' });
  printStep('Draft a tax credit request (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('tagus_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to file a tax return itself', await rt.call('tax_return_file', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
