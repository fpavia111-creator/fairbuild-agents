// Fairbuild Insurance Certificates: subcontractor certificates of insurance against your requirements. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, readYesNo, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const CERTIFICATE_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Insured', 'Named Insured', 'Company'], { required: true }),
  coverage: t(['Coverage', 'Policy Type', 'Type of Insurance', 'Line of Coverage', 'Type']),
  insurer: t(['Insurer', 'Insurance Company', 'Carrier', 'Insurer Name']),
  policy_number: t(['Policy Number', 'Policy No', 'Policy #', 'Policy']),
  effective: t(['Effective', 'Effective Date', 'Policy Effective', 'Start'], { type: 'date' }),
  expires: t(['Expires', 'Expiration', 'Expiration Date', 'Expiry', 'Policy Expiration', 'End'], { type: 'date' }),
  each_occurrence: t(['Each Occurrence', 'Per Occurrence', 'Each Accident', 'Limit', 'Each Occurrence Limit', 'Combined Single Limit'], { type: 'money' }),
  aggregate: t(['Aggregate', 'General Aggregate', 'Aggregate Limit'], { type: 'money' }),
  additional_insured: t(['Additional Insured', 'Addl Insured', 'AI', 'Addl Insd'], { type: 'bool' }),
  waiver_of_subrogation: t(['Waiver of Subrogation', 'Subrogation Waived', 'WOS', 'Subr Wvd'], { type: 'bool' }),
  primary_noncontributory: t(['Primary and Non-Contributory', 'Primary Non-Contributory', 'Primary', 'PNC'], { type: 'bool' }),
});
export const SCHEDULE_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Company'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  start_date: t(['Start Date', 'Start', 'Mobilization', 'On Site From'], { type: 'date' }),
  end_date: t(['End Date', 'Finish', 'Finish Date', 'On Site Until', 'Completion'], { type: 'date' }),
});
const COV = { type: 'object', additionalProperties: false, properties: { each_occurrence: { type: 'number', minimum: 0 }, aggregate: { type: 'number', minimum: 0 }, additional_insured: { type: 'boolean' }, waiver_of_subrogation: { type: 'boolean' }, primary_noncontributory: { type: 'boolean' } } };
export const REQUIREMENTS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['coverages'],
  properties: {
    required: { type: 'array', items: { type: 'string', maxLength: 40 }, description: 'Coverages every subcontractor must carry (default: every coverage listed under coverages)' },
    coverages: { type: 'object', additionalProperties: COV, description: 'Minimum limits and endorsements per coverage, e.g. {"GL": {"each_occurrence": 1000000, "additional_insured": true}}' },
    expiring_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A policy ending within this many days is flagged (default 30)' },
    coverage_aliases: { type: 'object', additionalProperties: { type: 'string', maxLength: 40 }, description: 'Your words for a coverage, e.g. {"CGL": "GL", "Workers Compensation": "WC"}' },
  },
});
const WORDS = { gl: 'GL', cgl: 'GL', 'general liability': 'GL', 'commercial general liability': 'GL', auto: 'Auto', 'automobile liability': 'Auto', 'auto liability': 'Auto', 'business auto': 'Auto', wc: 'WC', 'workers compensation': 'WC', "workers' compensation": 'WC', "workers comp": 'WC', 'workers comp': 'WC', umbrella: 'Umbrella', excess: 'Umbrella', 'umbrella liability': 'Umbrella', 'excess liability': 'Umbrella' };
const ORDER = ['coverage_missing', 'expired', 'limit_low', 'aggregate_low', 'no_additional_insured', 'no_waiver_of_subrogation', 'not_primary', 'lapse_during_work', 'expiring_soon'];

export function checkInsurance({ certRows, requirements, scheduleRows = null, asOf }) {
  const covs = requirements.coverages || {}; const required = requirements.required || Object.keys(covs); const soon = num(requirements.expiring_days) ?? 30;
  const alias = Object.fromEntries(Object.entries(requirements.coverage_aliases || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const covOf = (v) => { const s = str(v).toLowerCase().replace(/\s+/g, ' '); return alias[s] || WORDS[s] || Object.keys(covs).find((k) => k.toLowerCase() === s) || str(v); };
  const work = new Map(); if (scheduleRows) for (const s of scheduleRows) { const k = partyKey(s.vendor); const e = isoDate(s.end_date); const w = work.get(k) || { end: null, jobs: [] }; if (e && (!w.end || e > w.end)) w.end = e; if (str(s.job)) w.jobs.push(str(s.job)); work.set(k, w); }
  const vendors = new Map();
  for (const c of certRows) { const k = partyKey(c.vendor); if (!k) continue; const v = vendors.get(k) || { vendor: str(c.vendor), certs: new Map() }; const cov = covOf(c.coverage); const prev = v.certs.get(cov); const exp = isoDate(c.expires); if (!prev || (exp && (!prev.exp || exp > prev.exp))) v.certs.set(cov, { row: c, exp }); vendors.set(k, v); }
  if (scheduleRows) for (const s of scheduleRows) { const k = partyKey(s.vendor); if (k && !vendors.has(k)) vendors.set(k, { vendor: str(s.vendor), certs: new Map() }); }
  const items = [];
  for (const [k, v] of vendors) {
    const w = work.get(k);
    const list = [...new Set([...required, ...v.certs.keys()])];
    for (const cov of list) {
      const f = []; const req = covs[cov] || {}; const c = v.certs.get(cov);
      if (!c) { if (required.includes(cov)) f.push(finding('coverage_missing', null, `No ${cov} certificate on file for ${v.vendor}.`)); }
      else {
        const r = c.row; const exp = c.exp; const left = exp ? daysBetween(asOf, exp) : null;
        if (exp && left < 0) f.push(finding('expired', null, `${cov} policy ${str(r.policy_number)} expired on ${exp}.`));
        else if (exp && left <= soon) f.push(finding('expiring_soon', null, `${cov} policy ${str(r.policy_number)} expires on ${exp}, in ${left} day(s).`));
        const occ = num(r.each_occurrence), agg = num(r.aggregate);
        if (req.each_occurrence && (occ === null || occ < req.each_occurrence)) f.push(finding('limit_low', occ === null ? null : req.each_occurrence - occ, `${cov} each-occurrence limit is ${occ ?? 'not shown'}; you require ${req.each_occurrence}.`));
        if (req.aggregate && (agg === null || agg < req.aggregate)) f.push(finding('aggregate_low', agg === null ? null : req.aggregate - agg, `${cov} aggregate is ${agg ?? 'not shown'}; you require ${req.aggregate}.`));
        if (req.additional_insured && readYesNo(r.additional_insured) !== true) f.push(finding('no_additional_insured', null, `${cov} does not show you as additional insured.`));
        if (req.waiver_of_subrogation && readYesNo(r.waiver_of_subrogation) !== true) f.push(finding('no_waiver_of_subrogation', null, `${cov} does not show a waiver of subrogation.`));
        if (req.primary_noncontributory && readYesNo(r.primary_noncontributory) !== true) f.push(finding('not_primary', null, `${cov} is not shown as primary and non-contributory.`));
        if (w && w.end && exp && exp >= asOf && exp < w.end) f.push(finding('lapse_during_work', null, `${cov} ends ${exp}, before ${v.vendor} finishes work on ${w.end}${w.jobs.length ? ` (${[...new Set(w.jobs)].sort().join(', ')})` : ''}. Ask for the renewal certificate.`));
      }
      const codes = f.map((x) => x.code);
      const status = codes.some((x) => ['coverage_missing', 'expired'].includes(x)) ? 'expired' : codes.some((x) => ['limit_low', 'aggregate_low', 'no_additional_insured', 'no_waiver_of_subrogation', 'not_primary'].includes(x)) ? 'deficient' : f.length ? 'expiring' : 'ok';
      items.push({ key: `${v.vendor} ${cov}`, vendor: v.vendor, coverage: cov, insurer: c ? str(c.row.insurer) : '', policy_number: c ? str(c.row.policy_number) : '', expires: c ? c.exp : null, each_occurrence: c ? num(c.row.each_occurrence) : null, aggregate: c ? num(c.row.aggregate) : null, work_ends: w ? w.end : null, status, findings: orderFindings(f, ORDER) });
    }
  }
  const rank = { expired: 0, deficient: 1, expiring: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['coverage', 1]);
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { coverages: 0, problems: 0, worst: 'ok' }; v.coverages++; if (i.status !== 'ok') v.problems++; if (rank[i.status] < rank[v.worst]) v.worst = i.status; }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    vendors: vendors.size, certificates: out.filter((i) => i.policy_number || i.expires).length, expired: count('expired'), deficient: count('deficient'), expiring: count('expiring'), ok: count('ok'),
    vendors_clear: Object.values(byVendor).filter((v) => !v.problems).length, as_of: asOf, settings_used: { required, expiring_days: soon }, by_vendor: byVendor, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.vendors} subcontractor(s), ${out.length} coverage(s) checked as of ${asOf}: ${r.expired} missing or expired, ${r.deficient} below your requirements, ${r.expiring} expiring or ending before the work does. ${r.vendors_clear} subcontractor(s) fully clear.`;
  return r;
}

/** Markdown body of a certificate request to one subcontractor. */
export function requestText(items, { vendor, contact, from, holder }) {
  const rows = items.filter((i) => i.status !== 'ok');
  const L = [`# Certificate of insurance request: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor or their insurance agent]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `Please have your agent send an updated certificate naming ${holder || '[TO CONFIRM certificate holder]'} as certificate holder, covering:`, '',
    '| Coverage | What we need |', '| --- | --- |', ...rows.map((i) => `| ${i.coverage} | ${i.findings.map((f) => f.detail).join(' ')} |`), '',
    'Work and payments continue under your subcontract terms; this request does not change them.'];
  return { text: L.join('\n'), count: rows.length };
}
