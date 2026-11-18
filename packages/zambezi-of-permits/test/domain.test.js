// Permits and inspections: expiry windows, results in several languages, rebooking, overdue and the calendar file.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AgentRuntime, validateIcs } from 'fairbuild-core';
import { checkPermits, manifest } from '../src/index.js';

const permit = (extra = {}) => ({ permit_number: 'P-1', job: '24-1', type: 'Building', jurisdiction: 'Example City', expires: '2027-06-01', status: 'Active', ...extra });
const insp = (extra = {}) => ({ job: '24-1', permit_number: 'P-1', inspection_type: 'Framing', scheduled_date: '2026-11-01', result: 'Pass', ...extra });
const run = (permits, inspections = [], settings = {}) => checkPermits({ permitRows: permits, inspectionRows: inspections, settings, asOf: '2026-11-16' });
const find = (r, kind) => r.items.find((i) => i.kind === kind);

test('an active permit far from expiry with passed inspections is clean', () => {
  assert.equal(run([permit()], [insp()]).action, 0);
});

test('expired and expiring permits; a closed permit is not chased', () => {
  assert.equal(find(run([permit({ expires: '2026-11-01' })]), 'permit').findings[0].code, 'permit_expired');
  assert.equal(find(run([permit({ expires: '2026-12-01' })]), 'permit').findings[0].code, 'permit_expiring');
  assert.equal(find(run([permit({ expires: '2026-11-01', status: 'Closed' })]), 'permit').status, 'ok');
});

test('results are read in several languages', () => {
  assert.equal(find(run([permit()], [insp({ result: 'Nicht bestanden' })]), 'inspection').findings[0].code, 'failed_no_reinspection');
  assert.equal(find(run([permit()], [insp({ result: '合格' })]), 'inspection').status, 'ok');
});

test('a failed inspection followed by another of the same type is not chased again', () => {
  const r = run([permit()], [insp({ result: 'Fail' }), insp({ scheduled_date: '2026-11-20', result: '' })]);
  assert.equal(r.items.find((i) => i.date === '2026-11-01').status, 'ok');
});

test('a booked inspection with no result is overdue after its date, upcoming before it', () => {
  assert.equal(find(run([permit()], [insp({ result: '', scheduled_date: '2026-11-10' })]), 'inspection').findings[0].code, 'inspection_overdue');
  assert.equal(find(run([permit()], [insp({ result: '', scheduled_date: '2026-11-20' })]), 'inspection').findings[0].code, 'inspection_upcoming');
});

test('an inspection on a permit not in the log is reported', () => {
  assert.equal(find(run([permit()], [insp({ permit_number: 'P-9' })]), 'inspection').findings[0].code, 'permit_missing');
});

test('the calendar file is valid iCalendar with one event per expiry and booked inspection', async () => {
  const root = mkdtempSync(join(tmpdir(), 'zambezi-')); cpSync(fileURLToPath(new URL('../fixtures', import.meta.url)), root, { recursive: true });
  const r = await new AgentRuntime(manifest, { root, audit: false }).call('zambezi_write_calendar', { permits: 'permits.csv', inspections: 'inspections.csv', as_of: '2026-11-16' });
  const ics = readFileSync(join(root, r.result.files[0]), 'utf8');
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 5); const v = validateIcs(ics); assert.deepEqual(v.errors, []); assert.equal(v.ok, true);
});
