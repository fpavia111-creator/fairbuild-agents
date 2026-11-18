// Tiber: lien waivers against payments. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, readYesNo, partyKey, jobKey, PAYMENT_FIELDS, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const PAYMENTS_FIELDS = Object.freeze({ ...PAYMENT_FIELDS, final: t(['Final', 'Final Payment', 'Is Final'], { type: 'bool' }) });
export const WAIVER_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Supplier', 'Claimant', 'Company'], { required: true }),
  job: t(['Job', 'Job Number', 'Project', 'Project Number']),
  waiver_type: t(['Waiver Type', 'Type', 'Form', 'Waiver Form', 'Release Type']),
  through_date: t(['Through Date', 'Through', 'Work Through', 'Period Through'], { type: 'date' }),
  amount: t(['Amount', 'Waiver Amount', 'Payment Amount'], { type: 'money' }),
  received_date: t(['Received Date', 'Received', 'Date Received', 'Date'], { type: 'date' }),
  check_number: t(['Check Number', 'Check #', 'Check No', 'Payment Number', 'Payment Ref', 'Reference']),
  signed: t(['Signed', 'Executed', 'Signature'], { type: 'bool' }),
});
export const WAIVER_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    unconditional_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Days after a payment by which the unconditional waiver should be in (default 30)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
const ORDER = ['paid_without_conditional', 'final_waiver_missing', 'unconditional_missing', 'waiver_short', 'unsigned', 'unconditional_pending'];

/** Read a waiver form name: conditional or not, progress (partial) or final. */
export function waiverKind(text) {
  const s = str(text).toLowerCase();
  const unconditional = /\bun-?conditional\b|\bunconditionnel|\bincondicional|\bincondizionat|\bbedingungslos|無条件|无条件|무조건/.test(s);
  const final = /\bfinal\b|\bfinale?\b|\bschluss|最終|最终|최종/.test(s);
  return { conditional: !unconditional, final };
}

export function checkWaivers({ paymentRows, waiverRows, settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const days = num(settings.unconditional_days) ?? 30;
  const waivers = waiverRows.map((w, i) => ({ i, vendor: str(w.vendor), vkey: partyKey(w.vendor), job: jobKey(w.job), ...waiverKind(w.waiver_type), type: str(w.waiver_type), amount: num(w.amount), received: isoDate(w.received_date), through: isoDate(w.through_date), check: str(w.check_number).toUpperCase(), signed: readYesNo(w.signed) }));
  const used = new Set();
  const items = [];
  const payments = sortBy(paymentRows.filter((p) => str(p.check_number) || num(p.amount) !== null), [(p) => isoDate(p.date) || '', 1], [(p) => str(p.check_number), 1]);
  for (const p of payments) {
    const f = [];
    const vkey = partyKey(p.vendor); const job = jobKey(p.job); const amount = num(p.amount) ?? 0; const date = isoDate(p.date); const check = str(p.check_number).toUpperCase(); const isFinal = readYesNo(p.final) === true;
    const mine = waivers.filter((w) => !used.has(w.i) && w.vkey === vkey && (!w.job || !job || w.job === job) && (w.check ? w.check === check : w.amount !== null && Math.abs(w.amount - amount) <= tol));
    const pick = (cond) => sortBy(mine.filter((w) => w.conditional === cond && (!isFinal || w.final)), [(w) => (w.check === check ? 0 : 1), 1], [(w) => w.received || '', 1])[0] || null;
    const cw = pick(true); const uw = pick(false);
    for (const w of [cw, uw]) if (w) used.add(w.i);
    const anyCond = cw || mine.find((w) => w.conditional); const anyUncond = uw || mine.find((w) => !w.conditional);
    if (isFinal && !cw && !uw && (anyCond || anyUncond)) f.push(finding('final_waiver_missing', amount, `${check} is a final payment of ${amount}, but the waivers on file are progress waivers. Get final conditional and unconditional waivers.`));
    else {
      if (!cw && !uw) f.push(finding('paid_without_conditional', amount, `${check} paid ${amount} on ${date} with no conditional waiver on file.`));
      else if (!cw && uw && uw.received && date && uw.received > date) f.push(finding('paid_without_conditional', amount, `${check} paid ${amount} on ${date}; no conditional waiver came before it (the unconditional arrived ${uw.received}).`));
      else if (cw && cw.received && date && cw.received > date) f.push(finding('paid_without_conditional', amount, `${check} paid ${amount} on ${date}; the conditional waiver arrived later, on ${cw.received}.`));
      const since = date ? daysBetween(date, asOf) : null;
      if (!uw && since !== null && since >= 0) f.push(since > days ? finding('unconditional_missing', amount, `No unconditional waiver for ${check} (${amount}) ${since} days after payment.`) : finding('unconditional_pending', null, `Unconditional waiver for ${check} not in yet; ${since} day(s) since payment, due within ${days}.`));
    }
    for (const w of [cw, uw]) if (w && w.amount !== null && amount - w.amount > tol) f.push(finding('waiver_short', amount - w.amount, `The ${w.type.toLowerCase() || 'waiver'} covers ${w.amount}; ${check} paid ${amount}.`));
    for (const w of [cw, uw]) if (w && w.signed === false) f.push(finding('unsigned', null, `The ${w.type.toLowerCase() || 'waiver'} for ${check} is not signed.`));
    const codes = f.map((x) => x.code);
    const status = codes.some((c) => ['paid_without_conditional', 'unconditional_missing', 'final_waiver_missing'].includes(c)) ? 'missing' : codes.some((c) => ['waiver_short', 'unsigned'].includes(c)) ? 'review' : codes.includes('unconditional_pending') ? 'waiting' : 'ok';
    items.push({ check_number: str(p.check_number), vendor: str(p.vendor), job: str(p.job), date, amount, final: isFinal, conditional: cw ? cw.type : null, unconditional: uw ? uw.type : null, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { missing: 0, review: 1, waiting: 2, ok: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['check_number', 1]);
  const vendors = {}; for (const i of out) { const v = vendors[i.vendor] = vendors[i.vendor] || { payments: 0, paid: 0, missing: 0, at_risk: 0 }; v.payments++; v.paid = round2(v.paid + i.amount); if (i.status === 'missing') { v.missing++; v.at_risk = round2(v.at_risk + i.amount); } }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    payments: out.length, paid: round2(out.reduce((a, i) => a + i.amount, 0)), at_risk: round2(out.filter((i) => i.status === 'missing').reduce((a, i) => a + i.amount, 0)), waiting_amount: round2(out.filter((i) => i.status !== 'missing' && i.findings.some((f) => f.code === 'unconditional_pending')).reduce((a, i) => a + i.amount, 0)),
    missing: count('missing'), review: count('review'), waiting: count('waiting'), ok: count('ok'), unmatched_waivers: waivers.filter((w) => !used.has(w.i)).length, as_of: asOf,
    settings_used: { unconditional_days: days, tolerance: tol }, by_vendor: vendors, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.payments} payment(s), ${r.paid} paid: ${r.missing} with waivers missing (${r.at_risk} paid without the waivers it needs), ${r.review} with waiver problems, ${r.waiting} waiting for an unconditional waiver within ${days} days.`;
  return r;
}

/** Markdown body of a waiver request to one vendor. */
export function requestText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status !== 'ok');
  const need = (i) => i.findings.map((f) => ({ paid_without_conditional: 'conditional waiver', unconditional_missing: 'unconditional waiver', unconditional_pending: 'unconditional waiver', final_waiver_missing: 'final conditional and unconditional waivers', waiver_short: 'waiver for the full amount paid', unsigned: 'signed waiver' }[f.code])).filter(Boolean);
  const L = [`# Lien waiver request: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    'Please send the waivers below for payments we have made to you. Use the waiver forms your contract or your state requires [TO CONFIRM form].', '',
    '| Payment | Job | Date | Amount | What we need |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.check_number} | ${i.job} | ${i.date || ''} | ${i.amount} | ${[...new Set(need(i))].join('; ')} |`), '', 'Thank you.'];
  return { text: L.join('\n'), count: rows.length };
}
