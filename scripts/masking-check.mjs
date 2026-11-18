#!/usr/bin/env node
// Masking check. In a copy of each agent's fixtures, every value in a personal column (worker
// and technician names, worker ids, Social Security numbers, homeowner names, phones, emails and
// addresses) is replaced by a made-up canary, the same canary for the same value in every file
// so joins still work. Every eval case is then run in the default masking mode (one-click
// requests are approved, so approval previews and results are both seen) and everything the
// agent returns to the model (result, reason, warnings, preview) is searched for the canaries.
// A canary found there is a leak. The files the agents write locally keep real values by design
// and are not searched. CSV fixtures only (fixtures/intl/ is skipped: legacy encodings).
//
//   node scripts/masking-check.mjs [agent ...]
//   node scripts/masking-check.mjs --off     # self-test: masking off, so every agent must show leaks
//
// Exit code 1 on any leak.
import { readdirSync, readFileSync, writeFileSync, cpSync, mkdtempSync, existsSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, parseCsv, toCsv, personalKindOf } from '../packages/fairbuild-core/src/index.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const OFF = process.argv.includes('--off');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const norm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
const walk = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)])) : []);
const CANARY = {
  name: (i) => `Quentin Canaryfield${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ''}`,
  worker_id: (i) => `CNY${70000 + i}`,
  ssn: (i) => `900-55-${String(1000 + i).padStart(4, '0')}`,
  phone: (i) => `(555) 014-${String(1000 + i).padStart(4, '0')}`,
  email: (i) => `canary${i}@example.test`,
  address: (i) => `${100 + i} Canary Lane`,
  birth: (i) => `1990-01-${String(10 + (i % 18)).padStart(2, '0')}`,
};

let agentsWith = 0, planted = 0, calls = 0; const leaks = [];
for (const n of readdirSync(PK).filter((x) => /^fairbuild-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const cases = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases.filter((c) => !c.id.startsWith('intl-'));
  // Personal headers for this agent: personal field names and every English alias of them.
  const personal = new Map();
  for (const def of Object.values(manifest.sources || {})) for (const [field, fd] of Object.entries(def.fields || {})) {
    const kind = personalKindOf(field); if (!kind) continue;
    for (const h of [field, ...(fd.aliases || [])]) personal.set(norm(h), kind);
  }
  const parent = mkdtempSync(join(tmpdir(), 'fairbuild-masking-')); const root = join(parent, 'root');
  cpSync(join(PK, n), root, { recursive: true, filter: (s) => !/node_modules|[\\/]\.fairbuild|fairbuild-out/.test(s.slice(join(PK, n).length)) });
  const map = new Map(); const counter = {};
  for (const f of walk(join(root, 'fixtures')).filter((x) => x.endsWith('.csv') && !/[\\/]intl[\\/]/.test(x))) {
    let rows; try { rows = parseCsv(readFileSync(f, 'utf8')); } catch { continue; }
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]); let changed = false;
    for (const c of cols) {
      const kind = personal.get(norm(c)) || personalKindOf(c); if (!kind || !CANARY[kind]) continue;
      for (const r of rows) {
        const v = String(r[c] ?? '').trim(); if (!v) continue;
        const key = `${kind}|${v}`;
        if (!map.has(key)) { counter[kind] = (counter[kind] || 0) + 1; map.set(key, CANARY[kind](counter[kind] - 1)); }
        r[c] = map.get(key); changed = true;
      }
    }
    if (changed) writeFileSync(f, toCsv(rows, cols, { raw: true }));
  }
  const canaries = [...new Set(map.values())];
  if (!canaries.length) { rmSync(parent, { recursive: true, force: true }); continue; }
  agentsWith++; planted += canaries.length;
  for (const c of cases) {
    const rt = new AgentRuntime(manifest, { root, stateDir: join(root, '.fairbuild'), mode: c.mode === 'review' ? 'review' : 'assist', personal: OFF ? 'off' : 'mask', caps: { maxSteps: 100000, maxSpendUsd: 1e9 } });
    const seen = [];
    let out = await rt.call(c.tool, c.args || {}); calls++; seen.push(out);
    if (out.status === 'needs_approval') { rt.approvals.approve(out.approval_id, 'Masking Check'); out = await rt.call(c.tool, c.args || {}); calls++; seen.push(out); }
    const text = JSON.stringify(seen);
    for (const k of canaries) if (text.includes(k)) leaks.push(`${n} ${c.id}: "${k}" reached the model`);
  }
  console.error(`${n}: ${canaries.length} canary value(s) planted (${Object.entries(counter).map(([k, v]) => `${v} ${k}`).join(', ')}), ${cases.length} case(s) run`);
  rmSync(parent, { recursive: true, force: true });
}
for (const l of leaks.slice(0, 60)) console.log(`  LEAK ${l}`);
console.log(`\n${agentsWith} agent(s) with personal columns, ${planted} canary value(s) planted, ${calls} call(s), ${leaks.length} leak(s).`);
process.exitCode = leaks.length ? 1 : 0;
