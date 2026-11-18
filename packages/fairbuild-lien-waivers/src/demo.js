import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['lien_waivers_draft_request'] });
  process.stdout.write(`Fairbuild Lien Waivers demo (fictional payments and waivers) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { payments: 'payments.csv', waivers: 'waivers.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('lien_waivers_check', f);
  printStep('Match seven payments to their lien waivers', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.check_number} ${i.vendor.padEnd(22)} ${String(i.amount).padStart(7)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the final payment to Sample Sheet Metal', await rt.call('lien_waivers_explain', { ...f, check_number: 'CK-5007' }));
  printStep('Write the worklist', await rt.call('lien_waivers_write_report', f));
  const d = await rt.call('lien_waivers_draft_request', { ...f, vendor: 'Example Electric Inc', from: 'Dana Example, AP lead (fictional)' });
  printStep('Draft a waiver request to Example Electric (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('lien_waivers_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to file a lien itself', await rt.call('lien_file', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
