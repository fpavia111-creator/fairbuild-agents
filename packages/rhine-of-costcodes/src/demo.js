import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['rhine_draft_memo'] });
  process.stdout.write(`Rhine of Cost Codes demo (fictional jobs, vendors and costs) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { budget: 'budget.csv', costs: 'costs.csv', settings: 'settings.json' };
  const a = await rt.call('rhine_check', f);
  printStep('Compare job cost with the budget on two jobs', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.line.padEnd(20)} ${String(i.revised_budget).padStart(8)} ${String(i.actual).padStart(8)}  ${i.status.padEnd(10)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the rough carpentry line', await rt.call('rhine_explain', { ...f, line: '24-101 06-100' }));
  printStep('Read the same budget from a Procore export', await rt.call('rhine_check', { budget: 'exports/procore-budget.csv', settings: 'settings.json' }));
  printStep('Write the worklist', await rt.call('rhine_write_report', f));
  const d = await rt.call('rhine_draft_memo', { ...f, job: '24-101', to: 'Pat Example, project manager (fictional)', from: 'Dana Example, controller (fictional)' });
  printStep('Draft the cost review memo for job 24-101 (Auto is opted in for drafts here)', d);
  const s = await rt.call('rhine_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256, accept_open_issues: true, note: 'PM will fill in the cost to complete' });
  printStep('Approve sending the memo: one named click, even in Auto', s);
  printStep('Agent tries to change the budget itself', await rt.call('budget_update', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
