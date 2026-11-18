import { defineManifest, MODEL_PIN, standardTools, draftPair, refusedTools, sameParty } from 'fairbuild-core';
import { readFileSync } from 'node:fs';
import { levelBids, clarificationText, BID_FIELDS, SCOPE_FIELDS, BID_SETTINGS_SCHEMA } from './bids.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const OUT = 'fairbuild-out/congo';
const props = {
  bids: { type: 'string', description: 'Bids received under --root (CSV, Excel or JSON): bid package, bidder, base bid, scope included (items separated by ;), exclusions, bid bond, addenda acknowledged, time received' },
  scope: { type: 'string', description: 'Optional scope checklist: bid package, scope item, your plug value for it' },
  settings: { type: 'string', description: 'Optional settings JSON (bid_settings schema): addenda_required, require_bond, due_at, outlier_pct' },
};
const run = (a, ctx) => levelBids({ bidRows: ctx.records(a.bids, 'bids'), scopeRows: a.scope ? ctx.records(a.scope, 'scope') : null, settings: a.settings ? ctx.readJson(a.settings, 'bid_settings') : {} });
const std = standardTools({
  prefix: 'congo', outDir: OUT, props, required: ['bids'], run,
  check: { title: 'Tabulate and level bids', description: 'Per bid package and bidder: scope items not included, priced at your plug values into a leveled bid; addenda not acknowledged, no bid bond, late; base bids far below or above the package median; exclusions. Ranks responsive bids by leveled price.' },
  explain: { arg: 'bid', argDoc: 'Bid from congo_check as "package bidder", or the bidder name', key: (i) => [i.key, i.bidder], title: 'Explain one bid',
    description: 'Show one bid\'s base, plugs, leveled price, rank and every finding.',
    describe: (i) => `${i.bidder} on ${i.bid_package}: ${i.status}${i.rank ? `, rank ${i.rank}` : ''}. Base ${i.base_bid}, plugs ${i.plugs}, leveled ${i.leveled_bid}. ${i.findings.map((f) => f.detail).join(' ')}`.trim() },
  report: { base: 'congo-bids', title: 'Bid tabulation', description: 'Write the bid tabulation',
    row: (i) => ({ bid_package: i.bid_package, bidder: i.bidder, base_bid: i.base_bid, plugs: i.plugs, leveled_bid: i.leveled_bid, rank: i.rank ?? '', responsive: i.responsive ? 'yes' : 'no', status: i.status, findings: i.findings.map((f) => f.code).join(' '), reasons: i.findings.map((f) => f.detail).join(' ') }),
    columns: ['bid_package', 'bidder', 'base_bid', 'plugs', 'leveled_bid', 'rank', 'responsive', 'status', 'findings', 'reasons'],
    htmlColumns: ['bid_package', 'bidder', 'base_bid', 'plugs', 'leveled_bid', 'rank', 'status', 'reasons'],
    sections: (r) => [
      { title: 'By bid package', rows: Object.entries(r.by_package).map(([trade_package, v]) => ({ trade_package, ...v })), columns: ['trade_package', 'bidders', 'responsive', 'low_base', 'low_leveled', 'spread_pct'] },
      { title: 'By finding', rows: Object.entries(r.by_finding).map(([code, v]) => ({ code, ...v })), columns: ['code', 'count', 'amount'] },
    ],
    limits: ['files', 'settings', 'advice', 'Plug values are your estimates, not the bidders\' prices. The lowest leveled bid is a starting point for review, not an award recommendation.'] },
});
const pair = draftPair({
  prefix: 'congo', noun: 'clarification', verb: 'send', category: 'binding_send', outDir: OUT, actor: 'a person on your team',
  description: 'Write drafts/clarification-<bidder>.md: a letter asking one bidder to confirm scope gaps, exclusions, addenda or a low price. Marked DRAFT; it does not award or reject. Sending goes through congo_request_send (one click).',
  required: ['bids', 'bidder'],
  args: { ...props, bidder: { type: 'string', maxLength: 200, description: 'Bidder name' }, contact: { type: 'string', maxLength: 200, description: 'Bidder contact' }, from: { type: 'string', maxLength: 200, description: 'Your name and company' } },
  build: (a, ctx) => {
    const r = run(a, ctx); const items = r.items.filter((i) => sameParty(i.bidder, a.bidder));
    if (!items.length) throw new Error(`no bids from "${a.bidder}"`);
    const t = clarificationText(items, { ...a, bidder: items[0].bidder });
    if (!t.count) throw new Error(`nothing to clarify with ${items[0].bidder}`);
    return { id: items[0].bidder, to: a.contact || undefined, text: t.text, extra: { packages: t.count } };
  },
});
const refused = refusedTools([
  { name: 'award_contract', category: 'binding_send', description: 'Congo never awards a bid or issues a subcontract.' },
  { name: 'bid_reject_notice', category: 'binding_send', description: 'Congo never rejects or notifies a bidder.' },
  { name: 'email_send', category: 'binding_send', description: 'Congo never sends the clarification; a person sends the approved draft.' },
]);

export const manifest = defineManifest({
  name: 'congo-of-bids', version: pkg.version,
  description: 'Tabulates and levels subcontractor bids by bid package: scope items a bidder left out priced at your plug values, bids missing addenda or a bid bond, late bids, and bids far below or above the others; shows the lowest responsive leveled bid per package. Drafts clarification letters. Awarding is a person\'s decision.',
  model: MODEL_PIN,
  caps: { maxSteps: 60, maxSpendUsd: 0 },
  configSchemas: { bid_settings: BID_SETTINGS_SCHEMA },
  sources: {
    bids: { label: 'Bids received', args: ['bids'], fields: BID_FIELDS },
    scope: { label: 'Scope checklist and plugs', args: ['scope'], fields: SCOPE_FIELDS },
  },
  prompts: [{
    name: 'bid_leveling', title: 'Bid day leveling',
    description: 'Walks the host model through bid leveling with Congo.',
    arguments: [{ name: 'bids', description: 'Bids received', required: true }, { name: 'scope', description: 'Scope checklist (optional)', required: false }],
    text: `You are helping an estimator level subcontractor bids with congo-of-bids. Bids: {{bids}}. Scope: {{scope}}.

Rules: Congo never awards, rejects or sends; award_contract, bid_reject_notice and email_send are blocked. The lowest leveled bid is for review, not an award.

1. Call congo_check. Per package, lead with the lowest responsive leveled bid, then non-responsive bids and why, then scope gaps and outliers.
2. Call congo_explain for bids the person asks about.
3. Call congo_write_report and share the paths.
4. Offer congo_draft_clarification for bidders with gaps; only when the person asks, call congo_request_send. It needs one named human click.`,
  }],
  tools: [...std.tools, ...pair.tools, ...refused.tools],
  policy: { rules: [...std.rules, ...pair.rules, ...refused.rules, { tool: '*', decision: 'block', reason: 'Not on the Congo allowlist.' }] },
});
