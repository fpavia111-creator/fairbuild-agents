// Construction back-office helpers shared by the Fairbuild agents. Pure functions, no I/O.
//
// Nothing here is a rule of law, a union agreement, a surety's underwriting rule or a
// tax rate. Retainage percentages, thresholds, wage rates and tax rates always come
// from the settings or files the contractor supplies; each agent says what it assumed.
import { normalizeName, nameSimilarity } from './text.js';
import { readNumber } from './intl.js';
import { round2 } from './util.js';

export { round2 };
export const num = (v) => { if (v === null || v === undefined || v === '') return null; if (typeof v === 'number') return Number.isFinite(v) ? v : null; const n = readNumber(v); return Number.isFinite(n) ? n : null; };
export const sum = (xs) => round2(xs.reduce((s, x) => s + (Number(x) || 0), 0));
export const str = (v) => String(v ?? '').trim();
/** Percentage of part in whole, rounded to one decimal; null when whole is 0 or missing. */
export const pct = (part, whole, digits = 1) => { const p = Number(part), w = Number(whole); if (!Number.isFinite(p) || !Number.isFinite(w) || w === 0) return null; const f = 10 ** digits; return Math.round((p / w) * 100 * f) / f; };

// ------------------------------------------------------------------- dates ----

const DAY = 86400000;
const toMs = (v) => { const s = str(v); if (!s) return NaN; const iso = /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00Z` : /[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? s : `${s.replace(' ', 'T')}Z`; return Date.parse(iso); };
export const isoDate = (v) => { const t = toMs(v); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };
export function daysBetween(a, b) { const x = toMs(a), y = toMs(b); return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / DAY) : null; }
export function addDays(d, n) { const t = toMs(d); return Number.isFinite(t) ? new Date(t + n * DAY).toISOString().slice(0, 10) : null; }
export const inWindow = (d, from, to) => { const x = isoDate(d); return !!x && (!from || x >= isoDate(from)) && (!to || x <= isoDate(to)); };
export const monthKey = (d) => { const x = isoDate(d); return x ? x.slice(0, 7) : null; };
/** Monday of the ISO week a date falls in (YYYY-MM-DD). */
export function weekStart(d) { const x = isoDate(d); if (!x) return null; const t = Date.parse(`${x}T00:00:00Z`); const dow = (new Date(t).getUTCDay() + 6) % 7; return new Date(t - dow * DAY).toISOString().slice(0, 10); }
/** Day of the week, 0 = Monday ... 6 = Sunday. */
export const weekday = (d) => { const x = isoDate(d); return x ? (new Date(`${x}T00:00:00Z`).getUTCDay() + 6) % 7 : null; };

/**
 * The as_of date of a call: the argument when given (YYYY-MM-DD or any date the core
 * reads), else today. Throws a readable error for a date it cannot read.
 */
export function asOfDate(v, name = 'as_of') {
  if (v === undefined || v === null || v === '') return new Date().toISOString().slice(0, 10);
  const d = isoDate(v);
  if (!d) throw new Error(`${name} must be a date as YYYY-MM-DD`);
  return d;
}

export const AGING_BUCKETS = Object.freeze(['0-30', '31-60', '61-90', '91-120', '120+']);
export function agingBucket(days) { const d = Number(days); if (!Number.isFinite(d) || d <= 30) return '0-30'; if (d <= 60) return '31-60'; if (d <= 90) return '61-90'; if (d <= 120) return '91-120'; return '120+'; }

// -------------------------------------------------------- jobs and codes ----

/** Canonical job number for matching across files: "24-101", " 24-101 " and "24-101." are one job; case is ignored. */
export const jobKey = (v) => str(v).toUpperCase().replace(/\s+/g, '').replace(/[.]+$/, '');

/**
 * Canonical cost code: separators (space, dot, dash, slash, underscore) are dropped and
 * letters upper-cased, so "03-300", "03 300", "03.300" and "03300" are one code. Leading
 * zeros are kept ("3-300" stays a different code from "03-300" only if your system
 * really has both; most do not, and settings can alias them).
 */
export const codeKey = (v) => str(v).toUpperCase().replace(/[\s.\-/_]+/g, '');
export const sameCode = (a, b) => !!codeKey(a) && codeKey(a) === codeKey(b);

/** Cost types (categories) used across systems: L labour, M material, S subcontract, E equipment, O other. */
export const COST_TYPES = Object.freeze({
  L: { label: 'Labor', words: ['l', 'lab', 'labor', 'labour', 'payroll', 'wages', 'lohn', 'löhne', 'lohnkosten', 'personal', "main d'oeuvre", "main-d'oeuvre", "main d'œuvre", 'mano de obra', 'mão de obra', 'mao de obra', 'manodopera', '労務費', '労務', '人件費', '人工费', '人工', '노무비', '노무', '인건비'] },
  M: { label: 'Material', words: ['m', 'mat', 'material', 'materials', 'matl', 'material kosten', 'materialkosten', 'matériaux', 'materiaux', 'fournitures', 'materiales', 'materiais', 'materiali', '材料費', '材料', '材料费', '자재비', '자재', '재료비'] },
  S: { label: 'Subcontract', words: ['s', 'sub', 'subs', 'subcontract', 'subcontracts', 'subcontractor', 'subcontractors', 'nachunternehmer', 'subunternehmer', 'fremdleistung', 'fremdleistungen', 'sous-traitance', 'sous traitance', 'subcontrato', 'subcontratos', 'subempreitada', 'subappalto', 'subappalti', '外注費', '外注', '分包', '分包费', '외주비', '외주', '하도급'] },
  E: { label: 'Equipment', words: ['e', 'eq', 'equip', 'equipment', 'geräte', 'geraete', 'gerätekosten', 'maschinen', 'matériel', 'materiel', 'engins', 'equipo', 'equipos', 'maquinaria', 'equipamento', 'equipamentos', 'attrezzature', 'macchinari', '機械費', '機械', '设备', '机械费', '장비비', '장비'] },
  O: { label: 'Other', words: ['o', 'oth', 'other', 'others', 'misc', 'miscellaneous', 'general', 'sonstige', 'sonstiges', 'autres', 'divers', 'otros', 'outros', 'altri', 'varie', 'その他', '经费', '其他', '기타', '경비'] },
});
const TYPE_WORD = new Map();
for (const [k, v] of Object.entries(COST_TYPES)) for (const w of v.words) TYPE_WORD.set(w.normalize('NFKC').toLowerCase(), k);
/** Cost type letter (L, M, S, E, O) for a cost type cell, or null when it is not one of the known words. */
export function costType(v) {
  const s = str(v).normalize('NFKC').toLowerCase().replace(/[.\s]+$/, '');
  if (!s) return null;
  if (TYPE_WORD.has(s)) return TYPE_WORD.get(s);
  const n = /^\d+$/.test(s) ? Number(s) : null; // Sage and Vista number their cost types: 1 labor, 2 material, 3 subcontract, 4 equipment, 5 other
  if (n !== null && n >= 1 && n <= 5) return 'LMSEO'[n - 1];
  const first = s.split(/[\s/-]+/)[0];
  return TYPE_WORD.get(first) || null;
}
/** Key for one budget line: job | code | type (type optional). */
export const lineKey = (job, code, type = '') => `${jobKey(job)}|${codeKey(code)}|${costType(type) || codeKey(type)}`;

// ---------------------------------------------------- vendors and people ----

/** Canonical vendor or subcontractor name: legal forms dropped ("Example Electric, LLC" = "Example Electric"). */
export const partyKey = (v) => normalizeName(str(v)) || str(v).toLowerCase();
export const sameParty = (a, b) => !!partyKey(a) && partyKey(a) === partyKey(b);
/** Similarity of two company names, 0..1 (legal forms and punctuation ignored). */
export const partySimilarity = (a, b) => nameSimilarity(str(a), str(b));

// ---------------------------------------------------------------- words ----

// Status words in the nine report languages, folded to one of: approved, pending, rejected, void, open, closed.
const STATUS = {
  approved: ['approved', 'approve', 'executed', 'signed', 'accepted', 'final', 'genehmigt', 'freigegeben', 'angenommen', 'approuvé', 'approuve', 'validé', 'valide', 'accepté', 'aprobado', 'aprobada', 'aceptado', 'aprovado', 'aprovada', 'aceito', 'approvato', 'approvata', 'accettato', '承認', '承認済', '承認済み', '批准', '已批准', '已审批', '승인', '승인됨'],
  pending: ['pending', 'submitted', 'in review', 'under review', 'proposed', 'draft', 'pricing', 'requested', 'awaiting', 'offen eingereicht', 'eingereicht', 'in prüfung', 'ausstehend', 'beantragt', 'en attente', 'soumis', 'en cours', 'pendiente', 'enviado', 'en revisión', 'pendente', 'em análise', 'enviado', 'in attesa', 'inviato', 'in revisione', '申請中', '承認待ち', '保留', '待审批', '审批中', '대기', '검토중', '제출'],
  rejected: ['rejected', 'declined', 'denied', 'abgelehnt', 'refusé', 'refuse', 'rechazado', 'rejeitado', 'recusado', 'respinto', '却下', '否認', '拒绝', '已拒绝', '반려', '거절'],
  void: ['void', 'voided', 'cancelled', 'canceled', 'deleted', 'storniert', 'annulliert', 'annulé', 'annule', 'anulado', 'cancelado', 'annullato', '取消', '無効', '作废', '已取消', '취소', '무효'],
  open: ['open', 'active', 'in progress', 'ongoing', 'offen', 'aktiv', 'laufend', 'ouvert', 'actif', 'abierto', 'activo', 'aberto', 'ativo', 'aperto', 'attivo', '未完了', '進行中', 'オープン', '进行中', '未完成', '진행', '진행중', '미완료'],
  closed: ['closed', 'complete', 'completed', 'done', 'resolved', 'paid', 'billed', 'geschlossen', 'erledigt', 'abgeschlossen', 'fermé', 'ferme', 'terminé', 'cerrado', 'completado', 'fechado', 'concluído', 'chiuso', 'completato', '完了', '済', '完成', '已完成', '已关闭', '완료', '종료'],
};
const STATUS_WORD = new Map();
for (const [k, list] of Object.entries(STATUS)) for (const w of list) STATUS_WORD.set(w.normalize('NFKC').toLowerCase(), k);
/** One of approved, pending, rejected, void, open, closed, or null for a status the list does not know. */
export function statusOf(v) {
  const s = str(v).normalize('NFKC').toLowerCase().replace(/[.!]+$/, '');
  if (!s) return null;
  if (STATUS_WORD.has(s)) return STATUS_WORD.get(s);
  for (const part of s.split(/[\s/,-]+/)) if (STATUS_WORD.has(part)) return STATUS_WORD.get(part);
  return null;
}

/** Group rows by a key function; returns a Map in first-seen order. */
export function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) { const k = typeof key === 'function' ? key(r) : r[key]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
  return m;
}

/** Sort items by a list of [key, direction] pairs; ties keep a stable, row-order-free order by the final key. */
export function sortBy(items, ...keys) {
  return [...items].sort((a, b) => {
    for (const [k, dir = 1] of keys) {
      const x = typeof k === 'function' ? k(a) : a[k], y = typeof k === 'function' ? k(b) : b[k];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * dir;
    }
    return 0;
  });
}

/** Totals of findings by code: { code: { count, amount } }, codes in first-seen order. */
export function byFinding(items) {
  const out = {};
  for (const i of items) for (const f of i.findings || []) { const e = out[f.code] = out[f.code] || { count: 0, amount: 0 }; e.count++; e.amount = round2(e.amount + (Number(f.amount) || 0)); }
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** A finding: { code, amount (null when the agent cannot price it), detail }. */
export const finding = (code, amount, detail) => ({ code, amount: amount === null || amount === undefined ? null : round2(amount), detail });

/** Sort a list of findings by an order of codes, then by detail, so reports do not change with row order. */
export function orderFindings(list, order) {
  const rank = (c) => { const i = order.indexOf(c); return i < 0 ? order.length : i; };
  return [...list].sort((a, b) => rank(a.code) - rank(b.code) || (a.detail < b.detail ? -1 : a.detail > b.detail ? 1 : 0));
}
