#!/usr/bin/env node
// Writes sample-reports/: every agent's report (HTML page and CSV worklist) on its own
// fictional fixtures, in English, plus an index page. The arguments are the agent's own
// write_report eval case, so the sample is the same run the evals check.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, htmlPage, escapeHtml, DEMO_PERSONAL_KEY } from '../packages/fairbuild-core/src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PK = join(ROOT, 'packages'); const OUT = join(ROOT, 'sample-reports');
mkdirSync(OUT, { recursive: true });
const rows = [];
for (const n of readdirSync(PK).filter((x) => /^fairbuild-(?!core$)/.test(x)).sort()) {
  const { manifest } = await import(pathToFileURL(join(PK, n, 'src', 'index.js')).href);
  const prefix = ((t) => (t ? t.name.slice(0, -6) : manifest.tools[0].name.split('_')[0]))(manifest.tools.find((t) => /_check$/.test(t.name))); // the job prefix may be several words (payment_release)
  const cases = JSON.parse(readFileSync(join(PK, n, 'evals', 'cases.json'), 'utf8')).cases;
  const c = cases.find((x) => x.tool === `${prefix}_write_report` && !x.mode && !x.id.startsWith('policy-'));
  if (!c) { console.error(`${n}: no write_report eval case to take arguments from`); process.exitCode = 1; continue; }
  const root = mkdtempSync(join(tmpdir(), `${n}-sample-`)); cpSync(join(PK, n), root, { recursive: true, filter: (s) => !/node_modules|[\/]\.fairbuild|fairbuild-out/.test(s.slice(join(PK, n).length)) });
  const r = await new AgentRuntime(manifest, { root, audit: false, memory: false, personalKey: DEMO_PERSONAL_KEY }).call(`${prefix}_write_report`, c.args);
  if (r.status !== 'executed') { console.error(`${n}: ${r.reason || r.error}`); process.exitCode = 1; rmSync(root, { recursive: true, force: true }); continue; }
  const short = n.replace(/^fairbuild-/, '');
  for (const f of r.result.files) { const ext = f.split('.').pop(); writeFileSync(join(OUT, `${short}.${ext}`), readFileSync(join(root, f))); }
  rmSync(root, { recursive: true, force: true });
  const title = manifest.tools.find((t) => t.name === `${prefix}_write_report`).title || n;
  rows.push({ n, short, title, summary: String(r.result.summary || '').replace(/^[^:]+ written: /, '') });
  console.log(`${n}: sample report written`);
}
const body = `<h1>Fairbuild sample reports</h1><p class="mut">Every report below was written by the agent on its own fictional fixture files (no real contractor, owner, subcontractor, worker or homeowner). Worker and homeowner names in the files are made up; the agents mask them in what they return to an AI model, so the pages here may show them as written in the file.</p><table><thead><tr><th>Agent</th><th>Report</th><th>Summary</th><th>Files</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${escapeHtml(x.n)}</td><td>${escapeHtml(x.title)}</td><td>${escapeHtml(x.summary)}</td><td><a href="${x.short}.html">HTML</a> · <a href="${x.short}.csv">CSV</a></td></tr>`).join('')}</tbody></table>`;
writeFileSync(join(OUT, 'index.html'), htmlPage({ title: 'Fairbuild sample reports', bodyHtml: body, footer: 'Fictional data. Written by the Fairbuild agents; nothing was sent, paid, filed or submitted.', lang: 'en' }));
console.log(`${rows.length} sample report(s) in sample-reports/`);
