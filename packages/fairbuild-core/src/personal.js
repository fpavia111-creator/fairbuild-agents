// Personal-data masking. Every Fairbuild tool result passes through here before it
// leaves the runtime, so the AI model that called the tool sees stable pseudonyms
// (PERSON-3f2a9c1d, WKR-...) instead of worker names, worker ids, Social Security
// numbers and homeowner contact details. Files the tools write on this machine
// (worklists, drafts, certified payroll checks) keep the real values, because the
// people doing payroll, compliance and service need them.
//
// What it is, honestly:
//   - It removes the direct identifiers below from what the model sees. It is not
//     anonymisation: job numbers, cost codes, dates, hours and amounts still reach the
//     model. "strict" also cuts ZIP codes to three digits and hides a named worker's
//     hourly pay.
//   - It works from column and field names plus a few text patterns (SSN, e-mail,
//     phone). A name typed into a free-text column the agent does not know about can
//     get through. Company names (vendors, subcontractors, owners) are not masked.
//
// Pseudonyms are HMAC-SHA256 of the value with a per-installation key
// (<stateDir>/personal.key, created on first use, never returned), so the same worker
// gets the same pseudonym in every result, and a pseudonym cannot be reversed without
// the key. A tool argument may be a pseudonym; tools match it with personal.same().

import { createHmac, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const PERSONAL_MODES = Object.freeze(['mask', 'strict', 'off']);
export const PERSONAL_KEY_FILE = 'personal.key';

/** Keys whose values describe the file's columns (field → header), never personal data. Free-text scrubbing still applies. */
const META_KEYS = new Set(['mapped', 'unmapped', 'missing', 'translated', 'columns', 'recognised_by', 'signature']);
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const keys = (kind, list) => list.map((k) => [norm(k), kind]);

// Field names (any case or punctuation) → kind. Kinds marked strict are masked only in strict mode.
// Names of companies (vendors, subcontractors, owners, general contractors) are business data and
// are not masked; the people below are: workers on a payroll or timecard, technicians, homeowners
// and the contacts of a residential service call or warranty claim.
const KEY_KIND = new Map([
  ...keys('name', ['worker', 'worker_name', 'employee', 'employee_name', 'technician', 'tech', 'tech_name', 'technician_name', 'homeowner', 'homeowner_name', 'contact_name', 'first_name', 'last_name', 'middle_name', 'caller', 'caller_name', 'resident', 'resident_name']),
  ...keys('worker_id', ['worker_id', 'employee_id', 'employee_number', 'badge', 'badge_number', 'payroll_id', 'person_id', 'emp_id']),
  ...keys('ssn', ['ssn', 'social_security_number', 'social_security', 'worker_ssn', 'ssn_last4', 'sin', 'national_id']),
  ...keys('address', ['home_address', 'service_address', 'homeowner_address', 'worker_address', 'street', 'street_address', 'address1', 'address2', 'address_line_1', 'address_line_2']),
  ...keys('phone', ['phone', 'phone_number', 'home_phone', 'mobile_phone', 'mobile', 'cell_phone', 'telephone', 'homeowner_phone', 'contact_phone']),
  ...keys('email', ['email', 'email_address', 'homeowner_email', 'contact_email', 'worker_email']),
  ...keys('zip', ['zip', 'zip_code', 'postal_code', 'service_zip', 'zipcode']),
  ...keys('birth', ['dob', 'date_of_birth', 'birth_date', 'birthdate']),
  ...keys('wage_rate', ['pay_rate', 'hourly_rate', 'base_rate', 'paid_rate', 'wage', 'wage_rate']),
]);
// Strict mode also hides ZIP codes (cut to three digits) and the hourly pay of a named worker.
const STRICT_ONLY = new Set(['zip', 'wage_rate']);
const PREFIX = { name: 'PERSON', worker_id: 'WKR' };
const FIXED = { ssn: '[SSN]', address: '[ADDRESS]', phone: '[PHONE]', email: '[EMAIL]', birth: '[BIRTH DATE]' };
// Minimum length before a registered value is also searched for inside free text.
const MIN_TEXT = { name: 4, worker_id: 4 };

const TEXT_PATTERNS = [
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
  [/(?<![\d-])\(?\b\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g, '[PHONE]'],
];

// A value that is already a pseudonym or placeholder is left alone (results pass the masker more than once).
const ALREADY = /^((PERSON|WKR)-[0-9a-f]{8}|\[(SSN|ADDRESS|PHONE|EMAIL|BIRTH DATE|ZIP|WAGE)\]|\d{3}XX)$/;

/** Kind of a field name, or null. */
export const personalKindOf = (key, mode = 'mask') => { const k = KEY_KIND.get(norm(key)); return !k || (STRICT_ONLY.has(k) && mode !== 'strict') ? null : k; };

/** Name variants a person's name appears as in text: as given, "First Last" and "Last, First". */
function nameVariants(raw) {
  const s = String(raw).trim(); if (!s) return [];
  const out = new Set([s]);
  const m = /^([^,]+),\s*(.+)$/.exec(s);
  if (m) out.add(`${m[2]} ${m[1]}`.trim());
  else { const p = s.split(/\s+/); if (p.length >= 2) out.add(`${p.at(-1)}, ${p.slice(0, -1).join(' ')}`); }
  return [...out];
}
const nameKey = (s) => String(s).toLowerCase().split(/[^a-z0-9À-￿]+/).filter(Boolean).sort().join(' ');

/** Read or create the per-installation pseudonym key. */
export function loadPersonalKey(stateDir) {
  if (!stateDir) return randomBytes(32);
  const f = join(stateDir, PERSONAL_KEY_FILE);
  if (existsSync(f)) { const h = readFileSync(f, 'utf8').trim(); if (/^[0-9a-f]{64}$/.test(h)) return Buffer.from(h, 'hex'); throw new Error(`${PERSONAL_KEY_FILE} in the state folder is not a 64-character hex key; restore it from backup or delete it (pseudonyms will change)`); }
  mkdirSync(dirname(f), { recursive: true });
  const k = randomBytes(32);
  writeFileSync(f, k.toString('hex') + '\n', { mode: 0o600 });
  try { chmodSync(f, 0o600); } catch { /* Windows */ }
  return k;
}

export class PersonalMasker {
  constructor({ mode = 'mask', key = null } = {}) {
    if (!PERSONAL_MODES.includes(mode)) throw new Error(`personal mode must be one of ${PERSONAL_MODES.join(', ')}`);
    this.mode = mode;
    this.key = key || randomBytes(32);
    this.reset();
  }

  /** Forget the values registered for the last call. */
  reset() { this.seen = new Map(); this.counts = {}; this.index = null; }

  get on() { return this.mode !== 'off'; }

  /** Stable pseudonym for a value of one kind. */
  token(kind, value) {
    const v = kind === 'name' ? nameKey(value) : String(value).trim().toUpperCase();
    return `${PREFIX[kind] || 'ID'}-${createHmac('sha256', this.key).update(`${kind}|${v}`).digest('hex').slice(0, 8)}`;
  }

  /** What the model sees for one value of one kind. */
  maskValue(kind, value) {
    if (value === null || value === undefined || value === '' || !this.on) return value;
    if (Array.isArray(value)) return value.map((v) => this.maskValue(kind, v));
    if (typeof value === 'object') return value;
    const s = String(value);
    if (ALREADY.test(s)) return value;
    this.counts[kind] = (this.counts[kind] || 0) + 1;
    if (FIXED[kind]) { this.register(kind, s); return FIXED[kind]; }
    if (kind === 'zip') { const d = s.replace(/\D/g, ''); return d.length >= 3 ? `${d.slice(0, 3)}XX` : '[ZIP]'; }
    if (kind === 'wage_rate') return '[WAGE]';
    this.register(kind, s);
    return this.token(kind, s);
  }

  /** Remember a raw value so it is also replaced where it appears inside other text. */
  register(kind, raw) {
    if (!this.on || raw === null || raw === undefined) return;
    if (STRICT_ONLY.has(kind)) return;
    const vals = kind === 'name' ? nameVariants(raw) : [String(raw).trim()];
    const rep = FIXED[kind] || this.token(kind, raw);
    for (const v of vals) if (v.length >= (MIN_TEXT[kind] || 4) && !this.seen.has(v.toLowerCase())) { this.seen.set(v.toLowerCase(), { value: v, rep }); this.index = null; }
  }

  /** Register every personal field of plain records (used when a tool reads a source file). */
  registerRecords(rows, fieldKinds = {}) {
    if (!this.on || !Array.isArray(rows)) return;
    const cols = new Map();
    for (const r of rows.slice(0, 1)) if (r && typeof r === 'object') for (const k of Object.keys(r)) { const kind = fieldKinds[k] || personalKindOf(k, this.mode); if (kind) cols.set(k, kind); }
    if (!cols.size) return;
    for (const r of rows) if (r && typeof r === 'object') for (const [k, kind] of cols) if (r[k] !== null && r[k] !== undefined && r[k] !== '') this.register(kind, r[k]);
  }

  // Index: first word → value length → exact value. At each word of a text, one lookup per distinct
  // length (longest first) instead of a scan of every value with that first word, which was
  // quadratic with thousands of homeowners sharing first names (a minute at 10,000 rows).
  #buildIndex() {
    const idx = new Map();
    for (const [low, e] of this.seen) {
      const first = (/[a-z0-9À-￿]+/.exec(low) || [low])[0];
      if (!idx.has(first)) idx.set(first, { lens: [], byLen: new Map() });
      const b = idx.get(first);
      if (!b.byLen.has(low.length)) { b.byLen.set(low.length, new Map()); b.lens.push(low.length); }
      b.byLen.get(low.length).set(low, { low, ...e });
    }
    for (const b of idx.values()) b.lens.sort((x, y) => y - x);
    this.index = idx;
  }

  /** Replace registered values and SSN/e-mail/phone patterns inside free text. */
  maskText(s) {
    if (!this.on || typeof s !== 'string' || !s) return s;
    let out = s;
    for (const [re, rep] of TEXT_PATTERNS) out = out.replace(re, (m) => { this.counts.pattern = (this.counts.pattern || 0) + 1; return rep; });
    if (!this.seen.size) return out;
    if (!this.index) this.#buildIndex();
    const low = out.toLowerCase(); let res = ''; let i = 0;
    const word = /[a-z0-9À-￿]+/g; let m;
    while ((m = word.exec(low))) {
      if (m.index < i) continue;
      const before = m.index === 0 || !/[a-z0-9À-￿]/.test(low[m.index - 1]);
      const b = before ? this.index.get(m[0]) : null;
      if (b) {
        let hit = null;
        for (const L of b.lens) { const c = b.byLen.get(L).get(low.substr(m.index, L)); if (c && !/[a-z0-9À-￿]/.test(low[m.index + L] || ' ')) { hit = c; break; } }
        if (hit) { res += out.slice(i, m.index) + hit.rep; i = m.index + hit.low.length; word.lastIndex = i; this.counts.text = (this.counts.text || 0) + 1; continue; }
      }
    }
    return res + out.slice(i);
  }

  /** Masked deep copy of a tool result: personal fields first, then free text everywhere. */
  maskResult(value) {
    // Column-mapping reports ({ mapped: { worker: "Employee" } }) name columns, not people: their values are headers.
    if (!this.on) return value;
    const byKey = (v, key, depth) => {
      if (depth > 40) return v;
      const kind = key === null ? null : personalKindOf(key, this.mode);
      if (Array.isArray(v)) return v.map((x) => (kind && (typeof x !== 'object' || x === null) ? this.maskValue(kind, x) : byKey(x, kind ? null : key, depth + 1)));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = META_KEYS.has(k) ? x : byKey(x, k, depth + 1); return o; }
      // Counts and flags under a personal key (by_check.worker: 3) are not identifiers; long numbers may be.
      if (kind && (typeof v === 'boolean' || (typeof v === 'number' && Math.abs(v) < 100000))) return v;
      return kind ? this.maskValue(kind, v) : v;
    };
    const keyed = byKey(value, null, 0);
    const text = (v, depth) => {
      if (depth > 40) return v;
      if (typeof v === 'string') return this.maskText(v);
      if (Array.isArray(v)) return v.map((x) => text(x, depth + 1));
      if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[this.maskText(k)] = text(x, depth + 1); return o; }
      return v;
    };
    return text(keyed, 0);
  }

  /**
   * Does a value the model passed back (a pseudonym or the raw value) name this raw value?
   * Used by tools that take a worker or homeowner pseudonym as an argument.
   */
  same(raw, given, kind = 'name') {
    const r = String(raw ?? '').trim(), g = String(given ?? '').trim();
    if (!r || !g) return false;
    if (r.toLowerCase() === g.toLowerCase()) return true;
    return this.on && PREFIX[kind] && g.toUpperCase().startsWith(`${PREFIX[kind]}-`) && this.token(kind, r).toLowerCase() === g.toLowerCase();
  }

  /** Summary of what was masked in the last result (counts by kind, no values). */
  report() { return { mode: this.mode, masked: { ...this.counts } }; }
}
