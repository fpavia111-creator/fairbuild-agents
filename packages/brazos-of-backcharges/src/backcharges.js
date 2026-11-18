// Brazos: backcharges to subcontractors from notice to recovery. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, readYesNo, partyKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const BACKCHARGE_FIELDS = Object.freeze({
  backcharge: t(['Backcharge', 'Backcharge Number', 'Number', 'ID', 'Back Charge'], { required: true }),
  job: t(['Job', 'Job Number', 'Project']),
  vendor: t(['Vendor', 'Subcontractor', 'Charged To', 'Contract Company']),
  date: t(['Date', 'Incurred', 'Date Incurred', 'Created'], { type: 'date' }),
  description: t(['Description', 'Reason', 'Work Performed']),
  amount: t(['Amount', 'Backcharge Amount', 'Cost'], { type: 'money' }),
  status: t(['Status', 'State']),
  notice_date: t(['Notice Date', 'Notified', 'Date Notified', 'Notice Sent'], { type: 'date' }),
  deducted_amount: t(['Deducted Amount', 'Deducted', 'Recovered', 'Amount Recovered'], { type: 'money' }),
  backup: t(['Backup', 'Backup Attached', 'Support', 'Documentation'], { type: 'bool' }),
});
export const SUB_BALANCE_FIELDS = Object.freeze({
  vendor: t(['Vendor', 'Subcontractor', 'Contract Company'], { required: true }),
  revised_amount: t(['Revised Amount', 'Revised Contract Amount', 'Contract Amount'], { type: 'money' }),
  paid: t(['Paid', 'Paid to Date', 'Payments Issued'], { type: 'money' }),
  retainage_held: t(['Retainage Held', 'Retainage'], { type: 'money' }),
});
export const BACKCHARGE_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    notice_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Days your subcontracts allow between the work and the backcharge notice (default 7)' },
    deduct_days: { type: 'integer', minimum: 0, maximum: 365, description: 'An agreed backcharge not deducted within this many days is flagged (default 30)' },
    dispute_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A dispute open longer than this is flagged (default 30)' },
  },
});
const ORDER = ['unrecoverable', 'not_deducted', 'late_notice', 'no_notice', 'deducted_mismatch', 'dispute_aging', 'no_backup'];
const state = (s) => { const v = str(s).toLowerCase(); if (/deduct|recover|closed|paid/.test(v)) return 'deducted'; if (/agree|accept|approved/.test(v)) return 'agreed'; if (/disput|reject/.test(v)) return 'disputed'; if (/notif|sent|issued/.test(v)) return 'notified'; if (/void|withdrawn|cancel/.test(v)) return 'void'; return 'proposed'; };

export function checkBackcharges({ backchargeRows, balanceRows = null, settings = {}, asOf }) {
  const noticeDays = num(settings.notice_days) ?? 7; const deductDays = num(settings.deduct_days) ?? 30; const disputeDays = num(settings.dispute_days) ?? 30;
  const bal = new Map(); if (balanceRows) for (const b of balanceRows) { const k = partyKey(b.vendor); const e = bal.get(k) || { left: 0, held: 0 }; e.left = round2(e.left + Math.max(0, (num(b.revised_amount) || 0) - (num(b.paid) || 0))); e.held = round2(e.held + (num(b.retainage_held) || 0)); bal.set(k, e); }
  const rows = sortBy(backchargeRows.filter((b) => str(b.backcharge)), [(b) => isoDate(b.date) || '', 1], [(b) => str(b.backcharge), 1]);
  const openByVendor = new Map(); for (const b of rows) { const st = state(b.status); if (st === 'deducted' || st === 'void') continue; const k = partyKey(b.vendor); openByVendor.set(k, round2((openByVendor.get(k) || 0) + (num(b.amount) || 0) - (num(b.deducted_amount) || 0))); }
  const items = []; const running = new Map();
  for (const b of rows) {
    const f = []; const st = state(b.status); const amount = num(b.amount) ?? 0; const deducted = num(b.deducted_amount) ?? 0; const d = isoDate(b.date); const notice = isoDate(b.notice_date); const open = round2(amount - deducted);
    if (st !== 'void') {
      if (notice && d && daysBetween(d, notice) > noticeDays) f.push(finding('late_notice', null, `Notice sent ${notice}, ${daysBetween(d, notice)} days after the work on ${d}; your subcontracts allow ${noticeDays}. The subcontractor may reject it as late.`));
      else if (!notice && d && daysBetween(d, asOf) > noticeDays) f.push(finding('no_notice', null, `No notice sent ${daysBetween(d, asOf)} days after the work on ${d}.`));
      if (st === 'agreed' && open > 0 && notice && daysBetween(notice, asOf) > deductDays) f.push(finding('not_deducted', open, `Agreed, and ${open} has not been deducted from a payment ${daysBetween(notice, asOf)} days after notice.`));
      if (st === 'deducted' && Math.abs(open) > 0.005) f.push(finding('deducted_mismatch', open, `${deducted} was deducted against a backcharge of ${amount}.`));
      if (st === 'disputed' && notice && daysBetween(notice, asOf) > disputeDays) f.push(finding('dispute_aging', null, `Disputed for ${daysBetween(notice, asOf)} days.`));
      if (readYesNo(b.backup) === false) f.push(finding('no_backup', null, 'No backup (photos, time and material tickets) recorded.'));
      const v = balanceRows ? bal.get(partyKey(b.vendor)) : null;
      // The room left on a subcontractor is used by its open backcharges in date order, so a shortfall is counted once.
      if (balanceRows && st !== 'deducted' && open > 0) { const room = v ? round2(v.left + v.held) : 0; const owed = openByVendor.get(partyKey(b.vendor)) || 0; const cum = round2((running.get(partyKey(b.vendor)) || 0) + open); running.set(partyKey(b.vendor), cum); const risk = round2(Math.max(0, Math.min(open, cum - room))); if (risk > 0) f.push(finding('unrecoverable', risk, `Open backcharges on ${str(b.vendor)} total ${owed}; you still owe or hold ${room} on its subcontracts. Recover the rest another way.`)); }
    }
    const c = f.map((x) => x.code);
    const status = st === 'void' ? 'closed' : c.includes('unrecoverable') ? 'at_risk' : c.some((x) => ['not_deducted', 'late_notice', 'no_notice', 'deducted_mismatch'].includes(x)) ? 'action' : f.length ? 'review' : st === 'deducted' ? 'closed' : 'open';
    items.push({ backcharge: str(b.backcharge), job: str(b.job), vendor: str(b.vendor), date: d, description: str(b.description), amount, deducted, open_amount: st === 'void' ? 0 : Math.max(0, open), state: st, status, findings: orderFindings(f, ORDER) });
  }
  const rank = { at_risk: 0, action: 1, review: 2, open: 3, closed: 4 };
  const out = sortBy(items, [(i) => rank[i.status]], ['vendor', 1], ['backcharge', 1]);
  const byVendor = {}; for (const i of out) { const v = byVendor[i.vendor] = byVendor[i.vendor] || { backcharges: 0, amount: 0, recovered: 0, open: 0 }; v.backcharges++; v.amount = round2(v.amount + i.amount); v.recovered = round2(v.recovered + i.deducted); v.open = round2(v.open + i.open_amount); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    backcharges: out.length, amount: round2(out.reduce((a, i) => a + i.amount, 0)), recovered: round2(out.reduce((a, i) => a + i.deducted, 0)), open_amount: round2(out.reduce((a, i) => a + i.open_amount, 0)),
    at_risk_amount: round2(out.flatMap((i) => i.findings).filter((x) => x.code === 'unrecoverable').reduce((a, x) => a + (x.amount || 0), 0)),
    at_risk: count('at_risk'), action: count('action'), review: count('review'), open: count('open'), closed: count('closed'), as_of: asOf, settings_used: { notice_days: noticeDays, deduct_days: deductDays, dispute_days: disputeDays },
    by_vendor: byVendor, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.backcharges} backcharge(s), ${r.amount} charged, ${r.recovered} recovered, ${r.open_amount} still open. ${r.at_risk} larger than what you still owe or hold (${r.at_risk_amount} at risk), ${r.action} needing action (notice, deduction or a wrong amount), ${r.review} to review.`;
  return r;
}

/** Markdown body of a backcharge notice to one subcontractor. */
export function noticeText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.open_amount > 0 && ['proposed', 'notified', 'agreed', 'disputed'].includes(i.state));
  const total = round2(rows.reduce((a, i) => a + i.open_amount, 0));
  const L = [`# Backcharge notice: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM subcontractor contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `Under your subcontract [TO CONFIRM clause], we are backcharging the costs below, ${total} in total. They will be deducted from your next payment unless you respond with your reasons within [TO CONFIRM days].`, '',
    '| Backcharge | Job | Date | Work | Amount |', '| --- | --- | --- | --- | --- |', ...rows.map((i) => `| ${i.backcharge} | ${i.job} | ${i.date} | ${i.description} | ${i.open_amount} |`), '',
    'Backup: [ATTACH photos and time and material tickets]'];
  return { text: L.join('\n'), total, count: rows.length };
}
