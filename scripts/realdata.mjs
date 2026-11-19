#!/usr/bin/env node
// Real-data test on public data in its real published format (Kurt's final pass).
// Downloads public building-permit records from two city open-data portals into _realdata/ (git-ignored,
// never committed), runs fairbuild-permits on them with the column mapping a customer would set in
// fairbuild-sources.json, and writes counts only (no addresses, no names) to realdata/results.json.
// Only the permit columns are requested: the portals also publish contractor and applicant names
// and phones, which this test does not download.
//   node scripts/realdata.mjs [--refresh]
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, mkdtempSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { AgentRuntime, parseCsv, statusOf } from '../packages/fairbuild-core/src/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RAW = join(ROOT, '_realdata'); const OUT = join(ROOT, 'realdata');
mkdirSync(RAW, { recursive: true }); mkdirSync(OUT, { recursive: true });
const refresh = process.argv.includes('--refresh');
const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const SOURCES = [
  {
    name: 'austin-issued-construction-permits',
    title: 'City of Austin, Issued Construction Permits',
    page: 'https://data.austintexas.gov/Building-and-Development/Issued-Construction-Permits/3syk-w9eu',
    meta: 'https://data.austintexas.gov/api/views/3syk-w9eu.json',
    url: `https://data.austintexas.gov/resource/3syk-w9eu.csv?${q({ $select: 'permit_number,permit_type_desc,issue_date,expiresdate,status_current,original_address1,jurisdiction', $where: "issue_date >= '2025-05-01T00:00:00'", $order: 'issue_date DESC', $limit: '5000' })}`,
    columns: { permit_number: 'permit_number', job: 'original_address1', type: 'permit_type_desc', jurisdiction: 'jurisdiction', issued: 'issue_date', expires: 'expiresdate', status: 'status_current' },
    statusCol: 'status_current',
  },
  {
    name: 'nyc-dob-permit-issuance',
    title: 'NYC Department of Buildings, DOB Permit Issuance',
    page: 'https://data.cityofnewyork.us/Housing-Development/DOB-Permit-Issuance/ipu4-2q9a',
    meta: 'https://data.cityofnewyork.us/api/views/ipu4-2q9a.json',
    url: `https://data.cityofnewyork.us/resource/ipu4-2q9a.csv?${q({ $select: 'job__,permit_si_no,permit_type,permit_status,issuance_date,expiration_date,borough', $where: "issuance_date like '%/2026'", $order: ':id DESC', $limit: '5000' })}`,
    columns: { permit_number: 'permit_si_no', job: 'job__', type: 'permit_type', jurisdiction: 'borough', issued: 'issuance_date', expires: 'expiration_date', status: 'permit_status' },
    statusCol: 'permit_status',
  },
];

const { manifest } = await import(pathToFileURL(join(ROOT, 'packages', 'fairbuild-permits', 'src', 'index.js')).href);
const results = [];
for (const s of SOURCES) {
  const file = join(RAW, `${s.name}.csv`); const metaFile = join(RAW, `${s.name}.meta.json`);
  if (refresh || !existsSync(file)) {
    const r = await fetch(s.url); if (!r.ok) throw new Error(`${s.name}: HTTP ${r.status}`);
    writeFileSync(file, await r.text());
    const m = await (await fetch(s.meta)).json();
    writeFileSync(metaFile, JSON.stringify({ downloaded: new Date().toISOString(), license: m.license || null, attribution: m.attribution || null, rowsUpdatedAt: m.rowsUpdatedAt ? new Date(m.rowsUpdatedAt * 1000).toISOString() : null }, null, 2));
  }
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const asOf = meta.downloaded.slice(0, 10);
  const raw = parseCsv(readFileSync(file, 'utf8'));
  const root = mkdtempSync(join(tmpdir(), 'fairbuild-real-'));
  copyFileSync(file, join(root, 'permits.csv'));
  writeFileSync(join(root, 'fairbuild-sources.json'), JSON.stringify({ files: { 'permits.csv': { columns: s.columns } } }, null, 2));
  const rt = new AgentRuntime(manifest, { root, stateDir: join(root, '.fairbuild'), audit: false, memory: false });
  const out = await rt.call('permits_check', { permits: 'permits.csv', as_of: asOf });
  rmSync(root, { recursive: true, force: true });
  if (out.status !== 'executed') throw new Error(`${s.name}: ${out.reason}`);
  const items = out.result.items.filter((i) => i.kind === 'permit');
  const byCode = {}; const statusByCode = {};
  for (const i of items) for (const f of i.findings) {
    byCode[f.code] = (byCode[f.code] || 0) + 1;
    const st = String(raw.find((r) => String(r[s.columns.permit_number]) === i.permit_number)?.[s.statusCol] ?? '').trim() || '(blank)';
    (statusByCode[f.code] ||= {})[st] = (statusByCode[f.code][st] || 0) + 1;
  }
  const statuses = {}; for (const r of raw) { const st = String(r[s.statusCol] ?? '').trim() || '(blank)'; statuses[st] = (statuses[st] || 0) + 1; }
  const read = { rows: raw.length, permits: items.length, with_expiry: items.filter((i) => i.date).length, closed_by_status: raw.filter((r) => ['closed', 'void'].includes(statusOf(r[s.statusCol]))).length };
  results.push({ source: s.title, page: s.page, downloaded: meta.downloaded, data_updated: meta.rowsUpdatedAt, license: meta.license ? meta.license.name : 'no licence in the portal metadata; NYC Open Data terms of use', attribution: meta.attribution, as_of: asOf, read, findings: byCode, raw_status_of_flagged: statusByCode, raw_statuses: statuses, warnings: (out.warnings || []).slice(0, 5), sources: (out.result.sources || []).map((x) => ({ kind: x.kind, recognised_by: x.recognised_by, mapped: x.mapped, warnings: x.warnings })) });
  console.log(`${s.name}: ${read.rows} rows, ${read.permits} permits (${read.with_expiry} with an expiry date); findings ${JSON.stringify(byCode)}`);
}
writeFileSync(join(OUT, 'results.json'), JSON.stringify({ ran_at: new Date().toISOString(), agent: 'fairbuild-permits', note: 'Counts only. The downloaded files stay in _realdata/ (git-ignored).', results }, null, 2) + '\n');
console.log('realdata/results.json written');
