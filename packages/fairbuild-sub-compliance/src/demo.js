import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['sub_compliance_draft_request'] });
  process.stdout.write(`Fairbuild Sub Compliance demo (fictional subcontractors and documents) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { documents: 'documents.csv', requirements: 'requirements.json', vendors: 'vendors.csv', as_of: '2026-11-16' };
  const a = await rt.call('sub_compliance_check', f);
  printStep('Check five active subcontractors against your document list', a);
  for (const i of a.result.items.filter((x) => x.status !== 'ok')) process.stdout.write(`    ${i.vendor.padEnd(22)} ${i.document.padEnd(22)} ${i.status.padEnd(9)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain Test Drywall', await rt.call('sub_compliance_explain', { ...f, vendor: 'Test Drywall Co EMR letter' }));
  printStep('Write the worklist', await rt.call('sub_compliance_write_report', f));
  const d = await rt.call('sub_compliance_draft_request', { ...f, vendor: 'Sample Painting Co' });
  printStep('Draft a document request (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('sub_compliance_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to approve the vendor itself', await rt.call('vendor_approve', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
