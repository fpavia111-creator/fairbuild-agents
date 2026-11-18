import { fileURLToPath } from 'node:url';
import { demoRuntime, printStep } from 'fairbuild-core';

export async function demo(manifest) {
  const rt = demoRuntime(manifest, fileURLToPath(new URL('../fixtures', import.meta.url)), { mode: 'auto', autoActions: ['bid_leveling_draft_clarification'] });
  process.stdout.write(`Fairbuild Bid Leveling demo (fictional bidders and packages) in ${rt.root}, Auto mode on for drafts\n`);
  const f = { bids: 'bids.csv', scope: 'scope.csv', settings: 'settings.json' };
  const a = await rt.call('bid_leveling_check', f);
  printStep('Level six bids on two packages', a);
  for (const i of a.result.items) process.stdout.write(`    ${i.bid_package.padEnd(14)} ${i.bidder.padEnd(22)} ${String(i.base_bid).padStart(7)} ${String(i.leveled_bid).padStart(7)} rank ${String(i.rank ?? '-').padEnd(2)} ${i.status.padEnd(15)} ${i.findings.map((x) => x.code).join(', ')}\n`);
  printStep('Explain the Sample Power bid', await rt.call('bid_leveling_explain', { ...f, bid: 'Sample Power Co' }));
  printStep('Write the tabulation', await rt.call('bid_leveling_write_report', f));
  const d = await rt.call('bid_leveling_draft_clarification', { ...f, bidder: 'Sample Power Co' });
  printStep('Draft a clarification letter (Auto is opted in for drafts here)', d);
  printStep('Approve sending it: one named click, even in Auto', await rt.call('bid_leveling_request_send', { draft: d.result.draft, draft_sha256: d.result.draft_sha256 }));
  printStep('Agent tries to award the contract itself', await rt.call('award_contract', {}));
  process.stdout.write(`\nAudit log: ${rt.stateDir}/audit.jsonl\n`);
}
