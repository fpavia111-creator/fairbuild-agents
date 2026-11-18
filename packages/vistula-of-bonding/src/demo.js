import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['vistula_draft_summary'] });
  process.stdout.write(`Vistula of Bonding demo (fictional jobs, limits and bids) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { jobs: 'jobs.csv', limits: 'limits.json', pipeline: 'pipeline.csv' };
  const a = await rt.call('vistula_check', f);
  printStep('Summarise bonding capacity', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.kind.padEnd(8)} ${i.key.padEnd(22)} ${i.bonded ? 'bonded' : '      '} ${String(i.backlog).padStart(10)}  ${i.status.padEnd(8)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the Example Library Annex bid', await rt.call('vistula_explain', { ...f, key: 'Example Library Annex' }));
  printStep('Write the summary', await rt.call('vistula_write_report', f));
  const d = await rt.call('vistula_draft_summary', { ...f, label: 'Q4 2026' });
  printStep('Draft the broker summary (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('vistula_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to request a bond itself', await rt.call('bond_request', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
