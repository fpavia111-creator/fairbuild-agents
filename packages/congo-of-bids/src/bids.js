// Congo: subcontractor bid tabulation and leveling by bid package. Pure functions, no I/O.
//
// Leveled bid = base bid + your plug value for every scope item the bidder did not include.
// A bid is responsive when it acknowledges every addendum, carries a bond where one is
// required and arrived on time; the lowest responsive leveled bid is shown for review.
import { num, str, round2, readYesNo, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const BID_FIELDS = Object.freeze({
  bid_package: t(['Bid Package', 'Package', 'Trade', 'Scope Package', 'Division'], { required: true }),
  bidder: t(['Bidder', 'Subcontractor', 'Company', 'Vendor'], { required: true }),
  base_bid: t(['Base Bid', 'Bid Amount', 'Bid', 'Amount', 'Price'], { type: 'money' }),
  includes: t(['Includes', 'Included Scope', 'Scope Included', 'Inclusions']),
  exclusions: t(['Exclusions', 'Excludes', 'Qualifications']),
  bond: t(['Bond', 'Bid Bond', 'Bond Included'], { type: 'bool' }),
  addenda_acknowledged: t(['Addenda Acknowledged', 'Addenda', 'Addenda Received'], { type: 'number' }),
  received_at: t(['Received At', 'Received', 'Submitted At', 'Time Received'], { type: 'datetime' }),
});
export const SCOPE_FIELDS = Object.freeze({
  bid_package: t(['Bid Package', 'Package', 'Trade'], { required: true }),
  item: t(['Item', 'Scope Item', 'Scope'], { required: true }),
  plug_value: t(['Plug Value', 'Plug', 'Estimate', 'Allowance'], { type: 'money' }),
});
export const BID_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    addenda_required: { type: 'integer', minimum: 0, maximum: 100, description: 'Number of addenda every bid must acknowledge (default 0)' },
    require_bond: { type: 'boolean', description: 'A bid bond is required (default false)' },
    due_at: { type: 'string', maxLength: 40, description: 'Bid due date and time, YYYY-MM-DDTHH:MM (optional)' },
    outlier_pct: { type: 'number', minimum: 0, maximum: 100, description: 'A base bid more than this percent below or above the package median is flagged (default 15)' },
  },
});
const ORDER = ['late_bid', 'no_bond', 'missing_addenda', 'scope_gap', 'low_outlier', 'high_outlier', 'has_exclusions'];
const norm = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : null; };
const stamp = (v) => { const s = str(v).replace(' ', 'T'); return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? s.slice(0, 16) : null; };

export function levelBids({ bidRows, scopeRows = null, settings = {} }) {
  const addenda = num(settings.addenda_required) ?? 0; const bondReq = settings.require_bond === true; const due = stamp(settings.due_at); const out_pct = num(settings.outlier_pct) ?? 15;
  const scope = new Map(); if (scopeRows) for (const s of scopeRows) { const p = norm(s.bid_package); if (!p || !str(s.item)) continue; if (!scope.has(p)) scope.set(p, []); scope.get(p).push({ item: str(s.item), plug: num(s.plug_value) ?? 0 }); }
  const packages = new Map(); for (const b of bidRows) { const p = norm(b.bid_package); if (!p || !str(b.bidder)) continue; if (!packages.has(p)) packages.set(p, { name: str(b.bid_package), bids: [] }); packages.get(p).bids.push(b); }
  const items = []; const byPackage = {};
  for (const [p, pk] of packages) {
    const med = median(pk.bids.map((b) => num(b.base_bid)).filter((x) => x !== null));
    const list = [];
    for (const b of pk.bids) {
      const f = []; const base = num(b.base_bid) ?? 0;
      const inc = new Set(str(b.includes).split(/[;,|]/).map(norm).filter(Boolean)); const missing = (scope.get(p) || []).filter((s) => !inc.has(norm(s.item)));
      const plugs = round2(missing.reduce((a, s) => a + s.plug, 0));
      if (missing.length) f.push(finding('scope_gap', plugs, `Does not include ${missing.map((s) => `${s.item} (plug ${s.plug})`).join(', ')}; leveled bid is ${round2(base + plugs)}.`));
      const ack = num(b.addenda_acknowledged) ?? 0; if (ack < addenda) f.push(finding('missing_addenda', null, `Acknowledges ${ack} of ${addenda} addenda.`));
      if (bondReq && readYesNo(b.bond) !== true) f.push(finding('no_bond', null, 'No bid bond with the bid.'));
      const at = stamp(b.received_at); if (due && at && at > due) f.push(finding('late_bid', null, `Received ${at.replace('T', ' ')}, after the due time ${due.replace('T', ' ')}.`));
      if (med && base && base < med * (1 - out_pct / 100)) f.push(finding('low_outlier', null, `Base bid ${base} is ${round2((1 - base / med) * 100)}% below the package median ${med}. Confirm the bidder's scope and quantities before relying on it.`));
      if (med && base > med * (1 + out_pct / 100)) f.push(finding('high_outlier', null, `Base bid ${base} is ${round2((base / med - 1) * 100)}% above the package median ${med}.`));
      if (str(b.exclusions)) f.push(finding('has_exclusions', null, `Exclusions: ${str(b.exclusions)}.`));
      const codes = f.map((x) => x.code); const responsive = !codes.some((c) => ['late_bid', 'no_bond', 'missing_addenda'].includes(c));
      const status = !responsive ? 'non_responsive' : codes.includes('scope_gap') ? 'leveled' : codes.some((c) => ['low_outlier', 'high_outlier', 'has_exclusions'].includes(c)) ? 'review' : 'ok';
      list.push({ key: `${pk.name} ${str(b.bidder)}`, bid_package: pk.name, bidder: str(b.bidder), base_bid: base, plugs, leveled_bid: round2(base + plugs), responsive, rank: null, status, findings: orderFindings(f, ORDER) });
    }
    const ranked = sortBy(list.filter((x) => x.responsive), ['leveled_bid', 1], ['bidder', 1]); ranked.forEach((x, i) => { x.rank = i + 1; });
    const lowBase = sortBy(list, ['base_bid', 1], ['bidder', 1])[0];
    byPackage[pk.name] = { bidders: list.length, responsive: ranked.length, low_base: lowBase ? `${lowBase.bidder} ${lowBase.base_bid}` : '', low_leveled: ranked[0] ? `${ranked[0].bidder} ${ranked[0].leveled_bid}` : 'none responsive', spread_pct: ranked.length > 1 ? round2((ranked.at(-1).leveled_bid / ranked[0].leveled_bid - 1) * 100) : 0 };
    items.push(...list);
  }
  const rank = { non_responsive: 0, leveled: 1, review: 2, ok: 3 };
  const out = sortBy(items, ['bid_package', 1], [(i) => i.rank ?? 99, 1], [(i) => rank[i.status], 1], ['bidder', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    packages: packages.size, bids: out.length, responsive: out.filter((i) => i.responsive).length, non_responsive: count('non_responsive'), leveled: count('leveled'), review: count('review'), ok: count('ok'),
    plugs_added: round2(out.reduce((a, i) => a + i.plugs, 0)), settings_used: { addenda_required: addenda, require_bond: bondReq, due_at: due, outlier_pct: out_pct },
    by_package: byPackage, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.bids} bid(s) on ${r.packages} package(s): ${r.responsive} responsive, ${r.non_responsive} not responsive (late, no bond or missing addenda), ${r.leveled} leveled for scope gaps (${r.plugs_added} in plugs). Lowest responsive leveled: ${Object.entries(byPackage).map(([k, v]) => `${k}: ${v.low_leveled}`).join('; ')}.`;
  return r;
}

/** Markdown body of a scope clarification letter to one bidder. */
export function clarificationText(items, { bidder, contact, from }) {
  const rows = items.filter((i) => i.findings.some((f) => ['scope_gap', 'has_exclusions', 'missing_addenda', 'low_outlier'].includes(f.code)));
  const L = [`# Bid clarification: ${bidder}`, '', `**To:** ${contact || '[TO CONFIRM bidder contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'Thank you for your bid. Before we can compare it, please confirm the points below in writing.', '', '| Package | Base bid | Please confirm |', '| --- | --- | --- |',
    ...rows.map((i) => `| ${i.bid_package} | ${i.base_bid} | ${i.findings.filter((f) => ['scope_gap', 'has_exclusions', 'missing_addenda', 'low_outlier'].includes(f.code)).map((f) => f.code === 'scope_gap' ? `whether your price includes ${f.detail.replace(/^Does not include /, '').replace(/; leveled bid.*$/, '')}` : f.code === 'missing_addenda' ? 'that you received and priced every addendum' : f.code === 'low_outlier' ? 'your scope and quantities' : `the exclusions (${f.detail.replace(/^Exclusions: /, '')})`).join('; ')} |`),
    '', 'This letter does not award or reject any bid.'];
  return { text: L.join('\n'), count: rows.length };
}
