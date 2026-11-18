#!/usr/bin/env node
// Column words check: inside one source (one file an agent reads), no translated column word may
// belong to two of its fields, or a German or French export would put one column into two fields
// (that is how "Caisse" ended up as both the union local and the union fund in the union fringes agent).
// Exit code 1 on any clash.
// usage: node scripts/column-words-check.mjs
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FIELD_CONCEPTS, translatedNames } from '../packages/fairbuild-core/src/i18n/columns.js';
import { normHeader } from '../packages/fairbuild-core/src/intl.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
let clashes = 0, sources = 0;
for (const n of readdirSync(PK).filter((x) => /^fairbuild-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  for (const [kind, def] of Object.entries(manifest.sources || {})) {
    sources++;
    const owner = new Map();
    for (const field of Object.keys(def.fields || {})) {
      const english = new Set([field, ...(def.fields[field].aliases || [])].map((a) => normHeader(a).toLowerCase()));
      for (const { lang, word } of translatedNames(FIELD_CONCEPTS[field] || field)) {
        const k = normHeader(word).toLowerCase();
        if (english.has(k)) continue;
        if (owner.has(k) && owner.get(k).field !== field) { clashes++; console.log(`${n} ${kind}: "${word}" (${lang}) is a word for both ${owner.get(k).field} and ${field}`); }
        else owner.set(k, { field });
      }
    }
  }
}
console.log(`${sources} source(s) checked, ${clashes} clash(es)`);
process.exitCode = clashes ? 1 : 0;
