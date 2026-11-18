import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['ganges_draft_request'] });
  process.stdout.write(`Ganges of Insurance demo (fictional subcontractors and certificates) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { certificates: 'certificates.csv', requirements: 'requirements.json', schedule: 'schedule.csv', as_of: '2026-11-16' };
  const a = await rt.call('ganges_check', f);
  printStep('Check five subcontractors against your requirements', a);
  for (const i of a.result.items.filter((x) => x.status !== 'ok')) process.stdout.write(`    ${i.vendor.padEnd(22)} ${i.coverage.padEnd(9)} ${String(i.expires ?? '').padEnd(11)} ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain Example Electric', await rt.call('ganges_explain', { ...f, vendor: 'Example Electric Inc WC' }));
  printStep('Write the worklist', await rt.call('ganges_write_report', f));
  const d = await rt.call('ganges_draft_request', { ...f, vendor: 'Example Electric Inc', holder: 'Example Builders Inc (fictional)' });
  printStep('Draft a certificate request (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('ganges_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to block the vendor itself', await rt.call('vendor_block', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
