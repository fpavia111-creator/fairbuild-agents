// Timecards: assignments by date, closed jobs, budget codes, long days, weekends and duplicates.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTimecards } from '../src/index.js';

const tc = (extra = {}) => ({ worker: 'Avery Example', date: '2026-11-10', job: '24-1', cost_code: '01-500', hours: 8, ...extra });
const assignments = [{ worker: 'Avery Example', job: '24-1', start_date: '2026-11-01', end_date: '2026-11-12' }];
const codes = (r, i = 0) => r.items[i].findings.map((f) => f.code);

test('an assigned worker on an open job and a budgeted code is clean', () => {
  const r = checkTimecards({ timecardRows: [tc()], assignmentRows: assignments, jobRows: [{ job: '24-1', status: 'Open' }], budgetRows: [{ job: '24-1', cost_code: '01 500' }] });
  assert.equal(r.items[0].status, 'ok');
});

test('an assignment counts only inside its dates', () => {
  assert.deepEqual(codes(checkTimecards({ timecardRows: [tc({ date: '2026-11-13' })], assignmentRows: assignments })), ['not_assigned']);
});

test('a closed job, or one past its completion date, takes no hours', () => {
  assert.deepEqual(codes(checkTimecards({ timecardRows: [tc()], jobRows: [{ job: '24-1', status: 'Closed' }] })), ['closed_job']);
  assert.deepEqual(codes(checkTimecards({ timecardRows: [tc()], jobRows: [{ job: '24-1', status: 'Open', completion_date: '2026-11-01' }] })), ['closed_job']);
});

test('a cost code is checked only on jobs the budget file covers', () => {
  const budgetRows = [{ job: '24-1', cost_code: '03-300' }];
  assert.deepEqual(codes(checkTimecards({ timecardRows: [tc()], budgetRows })), ['invalid_cost_code']);
  assert.equal(checkTimecards({ timecardRows: [tc({ job: '24-9' })], budgetRows }).items[0].status, 'ok');
});

test('a long day is counted across jobs, and the limit can be raised', () => {
  const rows = [tc({ hours: 9 }), tc({ job: '24-2', hours: 7 })];
  assert.deepEqual(codes(checkTimecards({ timecardRows: rows })), ['long_day']);
  assert.equal(checkTimecards({ timecardRows: rows, settings: { max_daily_hours: 16 } }).items[0].status, 'ok');
});

test('weekend hours are flagged unless turned off', () => {
  assert.deepEqual(codes(checkTimecards({ timecardRows: [tc({ date: '2026-11-15' })] })), ['weekend']);
  assert.equal(checkTimecards({ timecardRows: [tc({ date: '2026-11-15' })], settings: { flag_weekends: false } }).items[0].status, 'ok');
});

test('the same entry twice is counted once and reported', () => {
  const r = checkTimecards({ timecardRows: [tc(), tc()] });
  assert.equal(r.hours, 8); assert.deepEqual(codes(r), ['duplicate_entry']);
});
