// Fairbuild Sub Compliance: subcontractor compliance documents against your list. Pure functions, no I/O.
import { num, str, isoDate, daysBetween, statusOf, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const VENDOR_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Company', 'Vendor Name', 'Name'], { required: true }),
  trade: t(['Trade', 'Scope', 'Category', 'Type', 'Vendor Type']),
  status: t(['Status', 'Vendor Status', 'Active']),
});
export const DOCUMENT_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Company', 'Vendor Name'], { required: true }),
  document_type: t(['Document Type', 'Document', 'Type', 'Requirement', 'Item']),
  status: t(['Status', 'Review Status', 'Approval Status']),
  received_date: t(['Received Date', 'Received', 'Date Received', 'Uploaded', 'Submitted'], { type: 'date' }),
  expires: t(['Expires', 'Expiration', 'Expiration Date', 'Expiry', 'Valid Until'], { type: 'date' }),
  value: t(['Value', 'Rating', 'EMR', 'Experience Modifier', 'Score'], { type: 'number' }),
});
export const DOC_REQUIREMENTS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false, required: ['required'],
  properties: {
    required: { type: 'array', items: { type: 'string', maxLength: 80 }, description: 'Documents every active subcontractor must have' },
    by_trade: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string', maxLength: 80 } }, description: 'Extra documents per trade, e.g. {"Electrical": ["Electrical license"]}' },
    expiring_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A document expiring within this many days is flagged (default 30)' },
    review_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A document received but not approved for this many days is flagged (default 30)' },
    max_emr: { type: 'number', minimum: 0, maximum: 10, description: 'Highest experience modification rate you accept, read from the value column of the EMR document (optional)' },
    emr_document: { type: 'string', maxLength: 80, description: 'Name of the document that carries the EMR (default "EMR letter")' },
    document_aliases: { type: 'object', additionalProperties: { type: 'string', maxLength: 80 }, description: 'Your words for a document, e.g. {"W9": "W-9"}' },
  },
});
const ORDER = ['document_missing', 'document_expired', 'document_rejected', 'emr_high', 'not_reviewed', 'document_expiring'];
// Document names match whatever the punctuation or spacing: 'W9', 'W-9' and 'w 9' are one document.
const norm = (s) => str(s).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

export function checkCompliance({ vendorRows = null, docRows, requirements, asOf }) {
  const soon = num(requirements.expiring_days) ?? 30; const reviewDays = num(requirements.review_days) ?? 30; const maxEmr = num(requirements.max_emr); const emrDoc = norm(requirements.emr_document || 'EMR letter');
  const alias = Object.fromEntries(Object.entries(requirements.document_aliases || {}).map(([k, v]) => [norm(k), norm(v)]));
  const docKey = (d) => alias[norm(d)] || norm(d);
  const byTrade = Object.fromEntries(Object.entries(requirements.by_trade || {}).map(([k, v]) => [norm(k), v]));
  const vendors = new Map();
  if (vendorRows) for (const v of vendorRows) { const k = partyKey(v.vendor); if (!k) continue; const st = statusOf(v.status); const inactive = st === 'closed' || st === 'void' || /^(inactive|no|false|terminated)$/i.test(str(v.status)); vendors.set(k, { vendor: str(v.vendor), trade: str(v.trade), active: !inactive }); }
  const docs = new Map();
  for (const d of docRows) {
    const k = partyKey(d.vendor); if (!k) continue;
    if (!vendors.has(k)) { if (vendorRows) continue; vendors.set(k, { vendor: str(d.vendor), trade: '', active: true }); }
    const m = docs.get(k) || new Map(); const dk = docKey(d.document_type); const exp = isoDate(d.expires); const prev = m.get(dk);
    const better = !prev || (statusOf(d.status) === 'approved' && statusOf(prev.status) !== 'approved') || ((exp || '') > (prev.exp || '') && statusOf(d.status) === statusOf(prev.status));
    if (better) m.set(dk, { type: str(d.document_type), status: str(d.status), received: isoDate(d.received_date), exp, value: num(d.value) });
    docs.set(k, m);
  }
  const items = [];
  for (const [k, v] of vendors) {
    if (!v.active) continue;
    const need = [...new Set([...requirements.required, ...(byTrade[norm(v.trade)] || [])])];
    for (const name of need) {
      const f = []; const d = (docs.get(k) || new Map()).get(docKey(name));
      if (!d) f.push(finding('document_missing', null, `${v.vendor} has no ${name} on file.`));
      else {
        const st = statusOf(d.status);
        if (st === 'rejected' || st === 'void') f.push(finding('document_rejected', null, `${name} was ${d.status.toLowerCase()}; a new one is needed.`));
        if (d.exp) { const left = daysBetween(asOf, d.exp); if (left < 0) f.push(finding('document_expired', null, `${name} expired on ${d.exp}.`)); else if (left <= soon) f.push(finding('document_expiring', null, `${name} expires on ${d.exp}, in ${left} day(s).`)); }
        if (st !== 'approved' && st !== 'rejected' && st !== 'void' && d.received) { const wait = daysBetween(d.received, asOf); if (wait > reviewDays) f.push(finding('not_reviewed', null, `${name} was received ${d.received} and is still ${d.status.toLowerCase() || 'not reviewed'} after ${wait} days.`)); }
        if (maxEmr !== null && docKey(name) === emrDoc && d.value !== null && d.value > maxEmr) f.push(finding('emr_high', null, `Experience modification rate ${d.value} is above your limit of ${maxEmr}.`));
      }
      const codes = f.map((x) => x.code);
      const status = codes.some((x) => ['document_missing', 'document_expired', 'document_rejected'].includes(x)) ? 'missing' : codes.some((x) => ['not_reviewed', 'emr_high'].includes(x)) ? 'review' : f.length ? 'expiring' : 'ok';
      items.push({ key: `${v.vendor} ${name}`, vendor: v.vendor, trade: v.trade, document: name, doc_status: d ? d.status : '', received: d ? d.received : null, expires: d ? d.exp : null, value: d ? d.value : null, status, findings: orderFindings(f, ORDER) });
    }
  }
  const rank = { missing: 0, review: 1, expiring: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['document', 1]);
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { trade: i.trade, documents: 0, problems: 0 }; v.documents++; if (i.status !== 'ok') v.problems++; }
  const byDoc = {}; for (const i of out) { const d = byDoc[i.document] = byDoc[i.document] || { vendors: 0, problems: 0 }; d.vendors++; if (i.status !== 'ok') d.problems++; }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    vendors: Object.keys(byVendor).length, inactive_skipped: [...vendors.values()].filter((v) => !v.active).length, documents: out.length,
    missing: count('missing'), review: count('review'), expiring: count('expiring'), ok: count('ok'), vendors_compliant: Object.values(byVendor).filter((v) => !v.problems).length,
    as_of: asOf, settings_used: { required: requirements.required, expiring_days: soon, review_days: reviewDays, max_emr: maxEmr }, by_vendor: byVendor, by_document: byDoc, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.vendors} active subcontractor(s), ${r.documents} required document(s) as of ${asOf}: ${r.missing} missing, expired or rejected, ${r.review} to review, ${r.expiring} expiring soon. ${r.vendors_compliant} subcontractor(s) fully compliant.`;
  return r;
}

/** Markdown body of a document request to one subcontractor. */
export function requestText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  const L = [`# Compliance documents: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'To keep your file current, please send:', '', '| Document | Why |', '| --- | --- |', ...rows.map((i) => `| ${i.document} | ${i.findings.map((f) => f.detail).join(' ')} |`), '', 'Thank you.'];
  return { text: L.join('\n'), count: rows.length };
}
