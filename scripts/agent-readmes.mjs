#!/usr/bin/env node
// Writes the hand-kept top and bottom of each agent's README.md: title, what it does, what it
// needs, the checks it runs (with a real example of each from its fictional fixtures) and its
// limits. The middle (demo run, tools, columns, install, modes) comes from readme-sections.mjs.
// An existing README is left alone unless --force is given.
// usage: node scripts/agent-readmes.mjs [--force] [agent ...]
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, LIMITS, DEMO_PERSONAL_KEY } from '../packages/fairbuild-core/src/index.js';

const PK = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages');
const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// Display title: the package description starts with it ("Fairbuild WIP Schedule: ..."), acronyms kept.
const titleOf = (n) => JSON.parse(readFileSync(join(PK, n, 'package.json'), 'utf8')).description.split(':')[0].trim();
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function findings(x, out = new Map()) {
  if (Array.isArray(x)) { for (const v of x) findings(v, out); return out; }
  if (x && typeof x === 'object') {
    if (typeof x.code === 'string' && typeof x.detail === 'string' && /^[a-z0-9_]+$/.test(x.code)) { if (!out.has(x.code)) out.set(x.code, x.detail); return out; }
    for (const v of Object.values(x)) findings(v, out);
  }
  return out;
}

for (const n of readdirSync(PK).filter((x) => /^fairbuild-(?!core$)/.test(x) && (!only.length || only.includes(x))).sort()) {
  const dir = join(PK, n); const file = join(dir, 'README.md');
  if (existsSync(file) && !force) { console.log(`${n}: README.md kept`); continue; }
  const { manifest: m } = await import(pathToFileURL(join(dir, 'src', 'index.js')).href);
  const prefix = ((t) => (t ? t.name.slice(0, -6) : m.tools[0].name.split('_')[0]))(m.tools.find((t) => /_check$/.test(t.name))); // the job prefix may be several words (payment_release)
  const check = m.tools.find((t) => t.name === `${prefix}_check`);
  const cases = JSON.parse(readFileSync(join(dir, 'evals', 'cases.json'), 'utf8')).cases;
  // Every check case that runs (richest first), so codes only one settings file turns on are shown too.
  const runs = cases.filter((x) => x.tool === check.name && !x.mode && !x.id.startsWith('intl-') && !x.id.startsWith('policy-') && (x.expect || {}).status !== 'error').sort((a, b) => Object.keys(b.args).length - Object.keys(a.args).length);
  const c = runs[0];
  const root = mkdtempSync(join(tmpdir(), `${n}-readme-`));
  cpSync(dir, root, { recursive: true, filter: (s) => !/node_modules|[\\/]\.fairbuild|fairbuild-out/.test(s.slice(dir.length)) });
  const rt = new AgentRuntime(m, { root, audit: false, memory: false, personalKey: DEMO_PERSONAL_KEY });
  const codes = new Map();
  for (const x of runs) {
    const r = await rt.call(check.name, x.args);
    if (r.status !== 'executed') throw new Error(`${n}: ${check.name} did not run on ${x.id}: ${r.reason || r.error}`);
    findings(r.result, codes);
  }
  rmSync(root, { recursive: true, force: true });
  const src = readFileSync(join(dir, 'src', 'manifest.js'), 'utf8');
  const lim = (src.match(/limits:\s*\[([\s\S]*?)\]\s*\}/) || [])[1] || '';
  const keys = [...lim.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1].replace(/\\'/g, "'"));
  const limits = [...keys.filter((k) => !LIMITS[k]), ...keys.filter((k) => LIMITS[k]).map((k) => LIMITS[k])];
  if (!keys.includes('advice')) limits.push(LIMITS.advice);
  const props = check.inputSchema.properties; const req = new Set(check.inputSchema.required || []);
  const inputs = Object.entries(props).filter(([k]) => !['as_of', 'out_dir', 'lang'].includes(k));
  const L = [
    `# ${titleOf(n)} (\`${n}\`)`, '',
    m.description, '',
    'MIT · Node 20 or newer · local files only · built on [`fairbuild-core`](../fairbuild-core) · part of [Fairbuild](../../README.md)', '',
    '```bash', `npx -y ${n} demo`, `npx -y ${n} mcp --root ./exports`, '```', '',
    '## What it needs', '',
    '| Argument | What to give it |', '|---|---|',
    ...inputs.map(([k, v]) => `| \`${k}\`${req.has(k) ? ' (required)' : ''} | ${esc(v.description)} |`), '',
    `Only ${[...req].map((k) => `\`${k}\``).join(' and ')} ${req.size > 1 ? 'are' : 'is'} required. Each optional file turns on the checks that need it.`, '',
    '## Checks', '',
    `What \`${check.name}\` flags, each with the first example it finds in the fictional fixtures (eval case \`${c.id}\`):`, '',
    '| Code | Example from the fixtures |', '|---|---|',
    ...[...codes].map(([code, detail]) => `| \`${code}\` | ${esc(detail)} |`), '',
    '## Limits', '',
    ...limits.map((l) => `- ${l}`), '',
  ];
  writeFileSync(file, L.join('\n'));
  console.log(`${n}: README.md written (${codes.size} check code(s))`);
}
