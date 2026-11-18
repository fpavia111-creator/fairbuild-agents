// Fairbuild Pay Applications: the arithmetic of a pay application in the G702/G703 layout. Pure functions, no I/O.
// Columns follow the continuation sheet: C scheduled value, D from previous applications,
// E this period, F materials presently stored, G completed and stored to date (D+E+F),
// G/C percent, H balance to finish (C-G), I retainage.
import { num, str, round2, pct, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

export const PAYAPP_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    retainage_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Retainage on work completed (D+E), percent (default 10)' },
    stored_retainage_pct: { type: 'number', minimum: 0, maximum: 100, description: 'Retainage on materials presently stored (F), percent (default: the same as retainage_pct)' },
    percent_tolerance: { type: 'number', minimum: 0, maximum: 5, description: 'Allowed difference in the G/C percent column, in points (default 0.1)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Differences up to this amount are rounding (default 1.00)' },
  },
});
export const SUMMARY_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    application: { type: ['string', 'integer'] }, period_to: { type: 'string' }, job: { type: 'string' },
    original_contract_sum: { type: 'number' }, net_change_orders: { type: 'number' }, contract_sum_to_date: { type: 'number' },
    total_completed_stored: { type: 'number' }, total_retainage: { type: 'number' }, total_earned_less_retainage: { type: 'number' },
    less_previous_certificates: { type: 'number' }, current_payment_due: { type: 'number' }, balance_to_finish_incl_retainage: { type: 'number' },
  },
});
const ORDER = ['line_total_off', 'over_100', 'percent_off', 'balance_off', 'retainage_line_off', 'previous_mismatch', 'contract_sum_off', 'sov_total_off', 'completed_total_off', 'retainage_total_off', 'earned_off', 'previous_certificates_off', 'current_due_off', 'balance_to_finish_off'];
const itemKey = (v) => str(v).toUpperCase().replace(/\s+/g, '');

export function checkPayApp({ lines, summary = null, previousLines = null, settings = {} }) {
  const tol = num(settings.tolerance) ?? 1; const rp = num(settings.retainage_pct) ?? 10; const rs = num(settings.stored_retainage_pct) ?? rp; const ptol = num(settings.percent_tolerance) ?? 0.1;
  const prev = new Map(); if (previousLines) for (const p of previousLines) { const g = num(p.completed_stored) ?? round2((num(p.previous) || 0) + (num(p.this_period) || 0) + (num(p.stored_materials) || 0)); prev.set(itemKey(p.item), { g, ret: num(p.retainage) }); }
  const items = []; const T = { C: 0, D: 0, E: 0, F: 0, G: 0, I: 0, I_want: 0 };
  for (const r of lines) {
    const item = str(r.item); if (!item) continue;
    const f = [];
    const C = num(r.scheduled_value) ?? 0, D = num(r.previous) ?? 0, E = num(r.this_period) ?? 0, F = num(r.stored_materials) ?? 0;
    const sumDEF = round2(D + E + F); const G = num(r.completed_stored) ?? sumDEF;
    if (num(r.completed_stored) !== null && Math.abs(G - sumDEF) > tol) f.push(finding('line_total_off', G - sumDEF, `Completed and stored to date says ${G}; previous ${D} + this period ${E} + stored ${F} is ${sumDEF}.`));
    if (G - C > tol) f.push(finding('over_100', G - C, `Completed and stored ${G} is more than the scheduled value ${C} by ${round2(G - C)}. Move the overage to a change order line or reduce the billing.`));
    const pWant = pct(G, C, 2); const pGiven = num(r.percent);
    if (pGiven !== null && pWant !== null && Math.abs(pGiven - pWant) > ptol) f.push(finding('percent_off', null, `The percent column says ${pGiven}; ${G} / ${C} is ${round2(pWant)}%.`));
    const H = num(r.balance);
    if (H !== null && Math.abs(H - round2(C - G)) > tol) f.push(finding('balance_off', H - round2(C - G), `Balance to finish says ${H}; ${C} - ${G} is ${round2(C - G)}.`));
    const iWant = round2((G - F) * rp / 100 + F * rs / 100); const I = num(r.retainage);
    if (I !== null && Math.abs(I - iWant) > tol) f.push(finding('retainage_line_off', I - iWant, `Retainage says ${I}; ${rp}% of work completed ${round2(G - F)}${F ? ` plus ${rs}% of stored ${F}` : ''} is ${iWant}.`));
    const p = prev.get(itemKey(item));
    if (previousLines && p && Math.abs(p.g - D) > tol) f.push(finding('previous_mismatch', D - p.g, `From previous applications says ${D}; the last application showed ${p.g} completed and stored on this line.`));
    if (previousLines && !p && D > tol) f.push(finding('previous_mismatch', D, `From previous applications says ${D}, but this line is not on the last application.`));
    T.C += C; T.D += D; T.E += E; T.F += F; T.G += G; T.I += I ?? iWant; T.I_want += iWant;
    const st = f.some((x) => x.code === 'over_100') ? 'over' : f.length ? 'error' : 'ok';
    items.push({ item, description: str(r.description), scheduled_value: C, previous: D, this_period: E, stored: F, completed_stored: G, percent: pWant === null ? null : round2(pWant), balance: round2(C - G), retainage: I ?? iWant, status: st, findings: orderFindings(f, ORDER) });
  }
  for (const k of Object.keys(T)) T[k] = round2(T[k]);
  if (summary) {
    const f = []; const s = summary; const v = (k) => (typeof s[k] === 'number' ? s[k] : null);
    const chk = (code, given, want, label) => { if (given !== null && want !== null && Math.abs(given - want) > tol) f.push(finding(code, given - want, `${label}: the summary says ${given}; it should be ${round2(want)}.`)); };
    chk('contract_sum_off', v('contract_sum_to_date'), v('original_contract_sum') !== null && v('net_change_orders') !== null ? v('original_contract_sum') + v('net_change_orders') : null, 'Line 3 contract sum to date (line 1 + line 2)');
    chk('sov_total_off', v('contract_sum_to_date'), T.C, 'Line 3 against the continuation sheet scheduled values');
    chk('completed_total_off', v('total_completed_stored'), T.G, 'Line 4 total completed and stored (column G total)');
    chk('retainage_total_off', v('total_retainage'), T.I, 'Line 5 total retainage (column I total)');
    const g4 = v('total_completed_stored') ?? T.G; const r5 = v('total_retainage') ?? T.I;
    chk('earned_off', v('total_earned_less_retainage'), g4 - r5, 'Line 6 total earned less retainage (line 4 - line 5)');
    if (previousLines) { const pg = round2([...prev.values()].reduce((a, x) => a + x.g, 0)); const pr = round2([...prev.values()].reduce((a, x) => a + (x.ret ?? x.g * rp / 100), 0)); chk('previous_certificates_off', v('less_previous_certificates'), pg - pr, 'Line 7 previous certificates (last application\'s line 6)'); }
    const e6 = v('total_earned_less_retainage') ?? round2(g4 - r5);
    chk('current_due_off', v('current_payment_due'), v('less_previous_certificates') !== null ? e6 - v('less_previous_certificates') : null, 'Line 8 current payment due (line 6 - line 7)');
    chk('balance_to_finish_off', v('balance_to_finish_incl_retainage'), v('contract_sum_to_date') !== null ? v('contract_sum_to_date') - e6 : null, 'Line 9 balance to finish including retainage (line 3 - line 6)');
    items.push({ item: 'G702', description: 'Summary page', scheduled_value: v('contract_sum_to_date'), previous: null, this_period: null, stored: null, completed_stored: v('total_completed_stored'), percent: null, balance: null, retainage: v('total_retainage'), status: f.length ? 'error' : 'ok', findings: orderFindings(f, ORDER) });
  }
  const rank = { error: 0, over: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], [(i) => (i.item === 'G702' ? 0 : 1), 1], [(i) => { const n = Number(i.item); return Number.isFinite(n) ? n : Infinity; }, 1], ['item', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const due = summary && typeof summary.current_payment_due === 'number' ? summary.current_payment_due : null;
  const r = {
    lines: out.filter((i) => i.item !== 'G702').length, scheduled_value: T.C, completed_stored: T.G, this_period: T.E, stored: T.F, retainage: T.I, retainage_at_rates: T.I_want,
    percent_complete: pct(T.G, T.C), errors: count('error'), over: count('over'), ok: count('ok'), current_payment_due: due,
    application: summary ? summary.application ?? null : null, settings_used: { retainage_pct: rp, stored_retainage_pct: rs, percent_tolerance: ptol, tolerance: tol },
    by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.lines} line(s), ${r.scheduled_value} scheduled, ${r.completed_stored} completed and stored (${r.percent_complete}%), retainage ${r.retainage} (${r.retainage_at_rates} at your rates). ${r.errors} item(s) with arithmetic errors, ${r.over} line(s) billed past their scheduled value${summary ? '; summary page checked' : ''}${previousLines ? '; checked against the last application' : ''}.`;
  return r;
}

/** Markdown body of a correction note to the person who prepared the pay application. */
export function correctionText(r, { to, from, label }) {
  const bad = r.items.filter((i) => i.status !== 'ok');
  const L = [`# Pay application corrections${label ? `: ${label}` : ''}`, '', `**To:** ${to || '[TO CONFIRM who prepared the pay application]'}`, `**From:** ${from || '[TO CONFIRM your name]'}`, '',
    `Before this pay application goes out or is approved, please correct the ${bad.length} item(s) below.`, '',
    '| Line | Description | Problem |', '| --- | --- | --- |',
    ...bad.map((i) => `| ${i.item} | ${i.description} | ${i.findings.map((f) => f.detail).join(' ')} |`), '',
    'Send the corrected application for a second check.'];
  return L.join('\n');
}
