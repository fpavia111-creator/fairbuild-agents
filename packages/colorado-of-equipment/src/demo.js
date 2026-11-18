import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['colorado_draft_credit'] });
  process.stdout.write(`Colorado of Equipment demo (fictional rentals and usage) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { rentals: 'rentals.csv', usage: 'usage.csv', settings: 'settings.json' };
  const a = await rt.call('colorado_check', f);
  printStep('Check six rental invoices against rates, off-rent dates and usage', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.invoice_number} ${i.equipment_id} ${i.description.padEnd(18)} ${String(i.amount).padStart(6)} fair ${String(i.fair_amount ?? '').padStart(6)}  ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the scissor lift invoice', await rt.call('colorado_explain', { ...f, invoice_number: 'RI-9002' }));
  printStep('Write the worklist', await rt.call('colorado_write_report', f));
  const d = await rt.call('colorado_draft_credit', { ...f, vendor: 'Example Lift Rentals' });
  printStep('Draft a credit request to Example Lift Rentals (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('colorado_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to call the rental off itself', await rt.call('rental_call_off', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
