// Orinoco: duplicate vendors in the vendor master and duplicate AP invoices. Pure functions, no I/O.
import { num, str, round2, isoDate, daysBetween, partyKey, partySimilarity, statusOf, levenshtein, normalizeAddress, finding, orderFindings, byFinding, sortBy } from 'fairbuild-core';

const t = (aliases, extra = {}) => ({ aliases, ...extra });
export const VENDOR_MASTER_FIELDS = Object.freeze({
  vendor_id: t(['Vendor ID', 'Vendor Number', 'Vendor No', 'Vendor Code', 'ID'], { required: true }),
  name: t(['Name', 'Vendor', 'Vendor Name', 'Company']),
  tax_id: t(['Tax ID', 'TIN', 'EIN', 'Federal ID', 'Tax Number']),
  address: t(['Address', 'Street', 'Address 1', 'Remit Address']),
  city: t(['City']),
  phone: t(['Phone', 'Phone Number', 'Telephone']),
  email: t(['Email', 'E-mail', 'Remit Email']),
  bank_last4: t(['Bank Last 4', 'Account Last 4', 'Bank Account Last 4', 'ACH Last 4']),
});
export const DUP_INVOICE_FIELDS = Object.freeze({
  invoice_number: t(['Invoice Number', 'Invoice', 'Invoice No', 'Bill #', 'Num'], { required: true }),
  vendor_id: t(['Vendor ID', 'Vendor Number', 'Vendor Code']),
  vendor: t(['Vendor', 'Vendor Name', 'Payee', 'Supplier']),
  invoice_date: t(['Invoice Date', 'Date', 'Bill Date'], { type: 'date' }),
  amount: t(['Amount', 'Invoice Amount', 'Total'], { type: 'money' }),
  status: t(['Status', 'Payment Status', 'Paid']),
  paid_date: t(['Paid Date', 'Payment Date', 'Check Date'], { type: 'date' }),
});
export const DUP_SETTINGS_SCHEMA = Object.freeze({
  type: 'object', additionalProperties: false,
  properties: {
    name_threshold: { type: 'number', minimum: 0.5, maximum: 1, description: 'Vendor names at least this similar (legal forms set aside) are compared (default 0.92)' },
    near_days: { type: 'integer', minimum: 0, maximum: 365, description: 'Invoices for the same amount within this many days are compared for near-identical numbers (default 7)' },
  },
});
const ORDER = ['same_tax_id', 'same_bank', 'same_address', 'same_phone', 'same_name', 'same_number', 'same_amount_near_number'];
const digitsOf = (v) => str(v).replace(/\D/g, '').replace(/^0+/, '');
const numKey = (v) => str(v).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+/, '');
const isPaid = (s) => { const st = statusOf(s); return st === 'closed' || /^paid$/i.test(str(s)) || /^(yes|y)$/i.test(str(s)); };

export function findDuplicates({ vendorRows = null, invoiceRows = null, settings = {} }) {
  const th = num(settings.name_threshold) ?? 0.92; const near = num(settings.near_days) ?? 7;
  const vendors = (vendorRows || []).filter((v) => str(v.vendor_id)).map((v) => ({ id: str(v.vendor_id), name: str(v.name), tax: digitsOf(v.tax_id), bank: str(v.bank_last4), addr: normalizeAddress(`${str(v.address)} ${str(v.city)}`), phone: digitsOf(v.phone) }));
  const items = []; const parent = new Map(vendors.map((v) => [v.id, v.id]));
  const root = (x) => { while (parent.get(x) !== x) x = parent.get(x); return x; };
  for (let i = 0; i < vendors.length; i++) for (let j = i + 1; j < vendors.length; j++) {
    const [a, b] = [vendors[i], vendors[j]].sort((p, q) => (p.id < q.id ? -1 : 1)); const f = [];
    const sim = partySimilarity(a.name, b.name);
    if (a.tax && a.tax === b.tax) f.push(finding('same_tax_id', null, `Both have tax id ending ${a.tax.slice(-4)}.`));
    if (a.bank && a.bank === b.bank && (sim >= 0.8 || (a.addr && a.addr === b.addr))) f.push(finding('same_bank', null, `Both pay to a bank account ending ${a.bank}.`));
    if (a.addr && a.addr.length > 6 && a.addr === b.addr) f.push(finding('same_address', null, 'Same address.'));
    if (a.phone && a.phone.length >= 7 && a.phone === b.phone) f.push(finding('same_phone', null, 'Same phone number.'));
    if (sim >= th) f.push(finding('same_name', null, `Names "${a.name}" and "${b.name}" match once legal forms and punctuation are set aside (${Math.round(sim * 100)}%).`));
    const strong = f.some((x) => ['same_tax_id', 'same_bank'].includes(x.code)) || f.length >= 2;
    if (!f.length || (!strong && !f.some((x) => x.code === 'same_name'))) continue;
    if (strong) parent.set(root(b.id), root(a.id));
    items.push({ kind: 'vendor_pair', key: `${a.id} ${b.id}`, vendor_ids: [a.id, b.id], vendors: [a.name, b.name], invoices: [], amount: 0, paid_twice: 0, status: strong ? 'merge' : 'review', findings: orderFindings(f, ORDER) });
  }
  const group = (inv) => { const id = str(inv.vendor_id); if (id && parent.has(id)) return root(id); return `name:${partyKey(inv.vendor)}`; };
  const invs = sortBy((invoiceRows || []).filter((i) => str(i.invoice_number)), [(i) => isoDate(i.invoice_date) || '', 1], [(i) => str(i.invoice_number), 1], [(i) => str(i.vendor_id), 1]);
  const used = new Set();
  for (let i = 0; i < invs.length; i++) {
    if (used.has(i)) continue;
    const a = invs[i]; const same = [i]; const f = [];
    for (let j = i + 1; j < invs.length; j++) {
      if (used.has(j)) continue; const b = invs[j];
      if (group(a) !== group(b)) continue;
      const amtA = num(a.amount), amtB = num(b.amount);
      if (numKey(a.invoice_number) === numKey(b.invoice_number) || (digitsOf(a.invoice_number).length >= 4 && digitsOf(a.invoice_number) === digitsOf(b.invoice_number) && amtA === amtB)) { same.push(j); if (!f.some((x) => x.code === 'same_number')) f.push(finding('same_number', null, `Invoice number ${str(a.invoice_number)} is entered ${str(b.invoice_number) !== str(a.invoice_number) ? `also as ${str(b.invoice_number)}` : 'more than once'}${str(a.vendor_id) !== str(b.vendor_id) ? ` under vendor records ${str(a.vendor_id)} and ${str(b.vendor_id)}` : ''}.`)); continue; }
      const d = daysBetween(a.invoice_date, b.invoice_date);
      if (amtA !== null && amtA === amtB && d !== null && Math.abs(d) <= near && levenshtein(numKey(a.invoice_number), numKey(b.invoice_number)) <= 2) { same.push(j); f.push(finding('same_amount_near_number', null, `${str(a.invoice_number)} and ${str(b.invoice_number)} are for the same amount ${amtA}, ${Math.abs(d)} day(s) apart, with near-identical numbers.`)); }
    }
    if (same.length < 2) continue;
    same.forEach((k) => used.add(k));
    const rows = same.map((k) => invs[k]); const paid = rows.filter((r) => isPaid(r.status) || isoDate(r.paid_date)); const amount = num(a.amount) ?? 0;
    const paidTwice = paid.length >= 2 ? round2(amount * (paid.length - 1)) : 0; const open = rows.length - paid.length;
    const status = paidTwice > 0 ? 'paid_twice' : open > 0 && paid.length >= 1 ? 'stop' : open > 1 ? 'stop' : 'review';
    const sure = f.some((x) => x.code === 'same_number');
    items.push({ kind: 'invoice_dup', key: rows.map((r) => str(r.invoice_number)).join(' '), vendor_ids: [...new Set(rows.map((r) => str(r.vendor_id)))], vendors: [...new Set(rows.map((r) => str(r.vendor)))], invoices: rows.map((r) => `${str(r.invoice_number)} ${isoDate(r.invoice_date) || ''} ${num(r.amount) ?? ''} ${isPaid(r.status) || isoDate(r.paid_date) ? 'paid' : 'open'}`.replace(/\s+/g, ' ')), amount, paid_twice: paidTwice, likely: sure ? 'likely' : 'possible', status, findings: orderFindings(f, ORDER) });
  }
  const rank = { paid_twice: 0, stop: 1, merge: 2, review: 3 };
  const out = sortBy(items, [(i) => rank[i.status]], ['kind', 1], ['key', 1]);
  const count = (st) => out.filter((i) => i.status === st).length;
  const r = {
    vendors: vendors.length, invoices: invs.length, vendor_pairs: out.filter((i) => i.kind === 'vendor_pair').length, invoice_groups: out.filter((i) => i.kind === 'invoice_dup').length,
    paid_twice: round2(out.reduce((a, i) => a + i.paid_twice, 0)), to_stop: round2(out.filter((i) => i.status === 'stop').reduce((a, i) => a + i.amount, 0)),
    paid_twice_count: count('paid_twice'), stop: count('stop'), merge: count('merge'), review: count('review'), settings_used: { name_threshold: th, near_days: near },
    duplicate_vendors: out.filter((i) => i.kind === 'vendor_pair').map((i) => ({ vendor_ids: i.vendor_ids.join(' + '), names: i.vendors.join(' / '), status: i.status })), by_finding: byFinding(out), items: out,
  };
  r.summary = `${r.vendors} vendor record(s), ${r.invoices} invoice(s): ${r.vendor_pairs} likely duplicate vendor pair(s), ${r.invoice_groups} duplicate invoice group(s). ${r.paid_twice} paid twice (${r.paid_twice_count} group(s)), ${r.to_stop} in open duplicates to stop before payment.`;
  return r;
}

/** Markdown body of a recovery letter to a vendor paid twice. */
export function recoveryText(items, { vendor, contact, from }) {
  const rows = items.filter((i) => i.status === 'paid_twice');
  const total = round2(rows.reduce((a, i) => a + i.paid_twice, 0));
  const L = [`# Duplicate payment recovery: ${vendor}`, '', `**To:** ${contact || '[TO CONFIRM vendor accounts receivable contact]'}`, `**From:** ${from || '[TO CONFIRM your name and company]'}`, '',
    `Our records show these invoices were paid more than once, ${total} in total. Please refund it or confirm a credit against open invoices. [TO CONFIRM: check both payments cleared before sending]`, '',
    '| Invoices | Amount | Paid twice |', '| --- | --- | --- |', ...rows.map((i) => `| ${i.invoices.join('; ')} | ${i.amount} | ${i.paid_twice} |`), ''];
  return { text: L.join('\n'), total, count: rows.length };
}
