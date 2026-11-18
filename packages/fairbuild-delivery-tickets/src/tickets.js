// Fairbuild Delivery Tickets: supplier invoice lines against delivery tickets and agreed prices. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, partyKey, jobKey, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const TICKET_FIELDS = Object.freeze({
  ticket: t(['Ticket', 'Ticket Number', 'Delivery Ticket', 'Delivery Note', 'Packing Slip', 'BOL'], { required: true }),
  supplier: t(['Supplier', 'Vendor', 'Vendor Name']),
  job: t(['Job', 'Job Number', 'Project']),
  date: t(['Date', 'Delivery Date', 'Delivered', 'Received Date'], { type: 'date' }),
  material: t(['Material', 'Item', 'Product', 'Description', 'Mix']),
  quantity: t(['Quantity', 'Qty', 'Qty Delivered', 'Delivered Qty'], { type: 'number' }),
  uom: t(['UOM', 'Unit', 'Units']),
});
export const INVOICE_LINE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No', 'Inv #'], { required: true }),
  supplier: t(['Supplier', 'Vendor', 'Vendor Name']),
  job: t(['Job', 'Job Number', 'Project']),
  ticket: t(['Ticket', 'Ticket Number', 'Delivery Ticket', 'Delivery Note', 'Reference']),
  material: t(['Material', 'Item', 'Product', 'Description']),
  quantity: t(['Quantity', 'Qty', 'Qty Billed'], { type: 'number' }),
  unit_price: t(['Unit Price', 'Price', 'Rate'], { type: 'money' }),
  amount: t(['Amount', 'Extended', 'Line Total', 'Extension'], { type: 'money' }),
  invoice_date: t(['Invoice Date', 'Date'], { type: 'date' }),
});
export const PRICE_FIELDS = Object.freeze({
  supplier: t(['Supplier', 'Vendor'], { required: true }),
  material: t(['Material', 'Item', 'Product', 'Description'], { required: true }),
  unit_price: t(['Unit Price', 'Price', 'Agreed Price', 'Contract Price'], { type: 'money' }),
});
export const TICKET_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    accrue_after_days: { type: 'integer', minimum: 0, maximum: 365, description: 'A delivered ticket with no invoice after this many days is listed to accrue (default 5)' },
    price_tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Unit price differences up to this are ignored (default 0.005)' },
    tolerance: { type: 'number', minimum: 0, maximum: 1000, description: 'Amount differences up to this are rounding (default 1.00)' },
  },
});
const ORDER = ['ticket_billed_twice', 'qty_over_ticket', 'price_over_agreed', 'extension_off', 'no_ticket', 'ticket_not_invoiced'];
const mkey = (s) => str(s).toLowerCase().replace(/\s+/g, ' ');
const tkey = (s) => str(s).toUpperCase().replace(/\s+/g, '');

export function checkTickets({ ticketRows, lineRows, priceRows = null, settings = {}, asOf }) {
  const tol = num(settings.tolerance) ?? 1; const ptol = num(settings.price_tolerance) ?? 0.005; const accrueDays = num(settings.accrue_after_days) ?? 5;
  const tickets = new Map();
  for (const r of ticketRows) { const k = `${tkey(r.ticket)}|${mkey(r.material)}`; const e = tickets.get(k) || { ticket: str(r.ticket), supplier: str(r.supplier), job: str(r.job), date: isoDate(r.date), material: str(r.material), quantity: 0, uom: str(r.uom) }; e.quantity = round2(e.quantity + (num(r.quantity) || 0)); tickets.set(k, e); }
  const prices = new Map(); if (priceRows) for (const p of priceRows) prices.set(`${partyKey(p.supplier)}|${mkey(p.material)}`, num(p.unit_price));
  const lines = sortBy(lineRows.filter((l) => str(l.invoice_number)), [(l) => isoDate(l.invoice_date) || '', 1], [(l) => str(l.invoice_number), 1], [(l) => str(l.ticket), 1], [(l) => str(l.material), 1]);
  const billed = new Map(); const probable = new Set(); const items = [];
  let bySupMat = null;
  for (const l of lines) {
    const f = []; const q = num(l.quantity) ?? 0; const p = num(l.unit_price); const amt = num(l.amount) ?? (p !== null ? round2(q * p) : 0);
    const agreed = prices.get(`${partyKey(l.supplier)}|${mkey(l.material)}`) ?? null; const price = p ?? (q ? round2(amt / q) : null);
    const tk = `${tkey(l.ticket)}|${mkey(l.material)}`; const ticket = str(l.ticket) ? tickets.get(tk) : null;
    if (p !== null && Math.abs(round2(q * p) - amt) > tol) f.push(finding('extension_off', amt - round2(q * p), `${q} × ${p} is ${round2(q * p)}; the line says ${amt}.`));
    if (agreed !== null && price !== null && price - agreed > ptol) f.push(finding('price_over_agreed', round2((price - agreed) * q), `Billed ${price} a unit; the agreed price for ${str(l.material)} is ${agreed}.`));
    if (!str(l.ticket) || !ticket) {
      // Candidates come from an index by supplier and material, in ticket order (a scan of every ticket per line took 36 s at 10,000 rows).
      if (!bySupMat) { bySupMat = new Map(); for (const x of tickets.values()) { const k2 = `${partyKey(x.supplier)}|${mkey(x.material)}`; if (!bySupMat.has(k2)) bySupMat.set(k2, []); bySupMat.get(k2).push(x); } }
      const guess = (bySupMat.get(`${partyKey(l.supplier)}|${mkey(l.material)}`) || []).find((x) => Math.abs(x.quantity - q) < 0.001 && (!str(l.job) || jobKey(x.job) === jobKey(l.job)));
      if (guess) probable.add(`${tkey(guess.ticket)}|${mkey(guess.material)}`);
      f.push(finding('no_ticket', null, `${str(l.ticket) ? `Ticket ${str(l.ticket)} for ${str(l.material)} is not in the delivery tickets` : 'No delivery ticket on this line'}${guess ? `; ticket ${guess.ticket} matches by supplier, material and quantity` : ''}. Get the signed ticket before approving.`));
    } else {
      const before = billed.get(tk) || { qty: 0, invoices: [] };
      if (before.qty >= ticket.quantity - 0.001) f.push(finding('ticket_billed_twice', amt, `Ticket ${ticket.ticket} (${ticket.quantity} ${ticket.uom}) was already billed on ${before.invoices.join(', ')}.`));
      else if (before.qty + q - ticket.quantity > 0.001) { const over = round2(before.qty + q - ticket.quantity); f.push(finding('qty_over_ticket', round2(over * (price ?? 0)), `Billed ${q} ${ticket.uom}${before.qty ? ` (after ${before.qty} already billed)` : ''}; ticket ${ticket.ticket} shows ${ticket.quantity} delivered: ${over} over.`)); }
      billed.set(tk, { qty: round2(before.qty + q), invoices: [...before.invoices, str(l.invoice_number)] });
    }
    const c = f.map((x) => x.code);
    const status = c.some((x) => ['ticket_billed_twice', 'qty_over_ticket', 'price_over_agreed', 'extension_off'].includes(x)) ? 'overbilled' : f.length ? 'review' : 'ok';
    items.push({ key: `${str(l.invoice_number)} ${str(l.ticket)} ${str(l.material)}`.replace(/\s+/g, ' ').trim(), kind: 'invoice_line', invoice_number: str(l.invoice_number), ticket: str(l.ticket), supplier: str(l.supplier), job: str(l.job), material: str(l.material), quantity: q, unit_price: price, agreed_price: agreed, amount: amt, status, findings: orderFindings(f, ORDER) });
  }
  for (const [k, tk] of tickets) {
    if (billed.has(k) || probable.has(k)) continue; // a ticket that probably matches a line with no ticket is not accrued twice
    const age = tk.date ? daysBetween(tk.date, asOf) : null; if (age === null || age < accrueDays) continue;
    const agreed = prices.get(`${partyKey(tk.supplier)}|${mkey(tk.material)}`); const est = agreed !== undefined && agreed !== null ? round2(agreed * tk.quantity) : null;
    items.push({ key: `${tk.ticket} ${tk.material}`, kind: 'ticket', invoice_number: '', ticket: tk.ticket, supplier: tk.supplier, job: tk.job, material: tk.material, quantity: tk.quantity, unit_price: agreed ?? null, agreed_price: agreed ?? null, amount: est ?? 0, status: 'review', findings: [finding('ticket_not_invoiced', est, `Delivered ${tk.date} (${tk.quantity} ${tk.uom}), not invoiced after ${age} days.${est !== null ? ` Accrue about ${est} at the agreed price.` : ''}`)] });
  }
  const rank = { overbilled: 0, review: 1, ok: 2 };
  const out = sortBy(items, [(i) => rank[i.status]], ['supplier', 1], ['invoice_number', 1], ['ticket', 1], ['material', 1]);
  const over = round2(out.flatMap((i) => i.findings).filter((x) => ['ticket_billed_twice', 'qty_over_ticket', 'price_over_agreed', 'extension_off'].includes(x.code)).reduce((a, x) => a + Math.max(0, x.amount || 0), 0));
  const bySupplier = {}; for (const i of out) { const s = bySupplier[i.supplier] = bySupplier[i.supplier] || { lines: 0, billed: 0, overbilled: 0 }; if (i.kind === 'invoice_line') { s.lines++; s.billed = round2(s.billed + i.amount); } s.overbilled = round2(s.overbilled + i.findings.filter((x) => ['ticket_billed_twice', 'qty_over_ticket', 'price_over_agreed', 'extension_off'].includes(x.code)).reduce((a, x) => a + Math.max(0, x.amount || 0), 0)); }
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    invoice_lines: out.filter((i) => i.kind === 'invoice_line').length, billed: round2(out.filter((i) => i.kind === 'invoice_line').reduce((a, i) => a + i.amount, 0)), overbilled: over,
    to_accrue: round2(out.filter((i) => i.kind === 'ticket').reduce((a, i) => a + i.amount, 0)), tickets_not_invoiced: out.filter((i) => i.kind === 'ticket').length,
    overbilled_count: count('overbilled'), review: count('review'), ok: count('ok'), as_of: asOf, settings_used: { accrue_after_days: accrueDays, price_tolerance: ptol, tolerance: tol },
    by_supplier: bySupplier, by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.invoice_lines} invoice line(s), ${r.billed} billed: ${r.overbilled_count} overbilled by ${r.overbilled} against tickets and agreed prices, ${r.review} to review. ${r.tickets_not_invoiced} delivered ticket(s) not invoiced (about ${r.to_accrue} to accrue).`;
  return r;
}

/** Markdown body of a credit request to one supplier. */
export function creditText(items, { supplier, contact, from }) {
  const rows = items.filter((i) => i.status === 'overbilled');
  const credit = (i) => round2(i.findings.reduce((s, f) => s + Math.max(0, f.amount || 0), 0));
  const total = round2(rows.reduce((a, i) => a + credit(i), 0));
  const L = [`# Material invoice credit request: ${supplier}`, '', `**To:** ${contact || '[TO CONFIRM supplier billing contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `We checked your invoices against the signed delivery tickets and our agreed prices, and request a credit of ${total}.`, '',
    '| Invoice | Ticket | Material | Credit | Reason |', '| --- | --- | --- | --- | --- |',
    ...rows.map((i) => `| ${i.invoice_number} | ${i.ticket} | ${i.material} | ${credit(i)} | ${i.findings.map((f) => f.detail).join(' ')} |`), '', 'Tickets: [ATTACH signed delivery tickets]'];
  return { text: L.join('\n'), total, count: rows.length };
}
