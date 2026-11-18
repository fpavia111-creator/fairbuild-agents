// Closeout: required items, names, statuses, due dates, grace period and readiness for final billing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkCloseout } from '../src/index.js';

const req = { required: ['Warranties', 'As-built drawings'], grace_days: 30 };
const jobs = [{ job: '24-1', completion_date: '2026-10-01' }];
const item = (name, extra = {}) => ({ job: '24-1', item: name, status: 'Received', received_date: '2026-10-10', ...extra });
const run = (rows, opts = {}) => checkCloseout({ jobRows: opts.jobs || jobs, checklistRows: rows, requirements: opts.requirements || req, asOf: opts.asOf || '2026-11-16' });
const st = (r, name) => r.items.find((i) => i.item === name).status;

test('every item received means the job is ready for final billing', () => {
  const r = run([item('Warranties'), item('As-built drawings')]);
  assert.equal(r.jobs_ready, 1); assert.equal(r.by_job['24-1'].percent, 100);
});

test('item names match whatever the punctuation and case', () => {
  assert.equal(st(run([item('WARRANTIES'), item('As built drawings')]), 'As-built drawings'), 'done');
});

test('a required item not on the checklist is missing', () => {
  assert.equal(st(run([item('Warranties')]), 'As-built drawings'), 'missing');
});

test('rejected items need resubmitting, whatever language the status is in', () => {
  assert.equal(st(run([item('Warranties'), item('As-built drawings', { status: 'Abgelehnt' })]), 'As-built drawings'), 'rejected');
});

test('an open item is overdue after its due date, or after the grace days with no due date', () => {
  assert.equal(st(run([item('Warranties'), item('As-built drawings', { status: 'Pending', received_date: '', due_date: '2026-11-01' })]), 'As-built drawings'), 'overdue');
  assert.equal(st(run([item('Warranties'), item('As-built drawings', { status: 'Pending', received_date: '' })]), 'As-built drawings'), 'overdue');
  assert.equal(st(run([item('Warranties'), item('As-built drawings', { status: 'Pending', received_date: '' })], { asOf: '2026-10-15' }), 'As-built drawings'), 'open');
});

test('jobs not yet complete are skipped', () => {
  assert.equal(run([], { jobs: [{ job: '24-9', completion_date: '' }, { job: '24-8', completion_date: '2026-12-31' }] }).jobs, 0);
});

test('aliases map your words onto a required item', () => {
  const r = run([item('Warranty binder'), item('As-built drawings')], { requirements: { ...req, item_aliases: { 'Warranty binder': 'Warranties' } } });
  assert.equal(r.jobs_ready, 1);
});
