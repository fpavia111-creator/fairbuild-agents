import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['payment_release_draft_notice'] });
  process.stdout.write(`Fairbuild Payment Release demo (fictional subcontractor invoices) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { invoices: 'invoices.csv', owner_payments: 'owner-payments.csv', waivers: 'waivers.csv', vendors: 'vendors.csv', settings: 'settings.json', as_of: '2026-11-16' };
  const a = await rt.call('payment_release_check', f);
  printStep('Check six invoices before the payment run', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.invoice_number.padEnd(8)} ${i.vendor.padEnd(22)} ${String(i.amount).padStart(6)} releasable ${String(i.releasable).padStart(6)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain SP-13', await rt.call('payment_release_explain', { ...f, invoice_number: 'SP-13' }));
  printStep('Write the worklist', await rt.call('payment_release_write_report', f));
  const d = await rt.call('payment_release_draft_notice', { ...f, vendor: 'Sample Painting Co' });
  printStep('Draft a payment status notice (Auto is opted in for drafts here)', d);
  printStep('Approve releasing EC-2231: one named click, even in Auto', await rt.call('payment_release_request_release', { ...f, invoice_number: 'EC-2231', amount: 36000 }));
  printStep('Agent tries to pay the invoice itself', await rt.call('ap_pay_invoice', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
