// Service: billing of completed tickets, recalls, warranty, utilisation and recall rate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkService } from '../src/index.js';

const tk = (n, extra = {}) => ({ ticket: n, technician: 'Avery Example', date: '2026-11-10', job_type: 'Repair', status: 'Completed', invoice_total: 300, invoice_number: `I-${n}`, ...extra });
const ts = (code, hours) => ({ technician: 'Avery Example', date: '2026-11-09', code, hours });
const tickets = (r) => r.items.filter((i) => i.kind === 'ticket');
const tech = (r) => r.items.find((i) => i.kind === 'technician');

test('a completed, invoiced ticket is not flagged', () => {
  assert.equal(tickets(checkService({ ticketRows: [tk('1')] })).length, 0);
});

test('completed with no invoice is unbilled by its total', () => {
  const r = checkService({ ticketRows: [tk('1', { invoice_number: '' })] });
  assert.equal(r.unbilled, 300); assert.equal(tickets(r)[0].findings[0].code, 'completed_not_invoiced');
});

test('a zero ticket is flagged unless it is a recall or warranty', () => {
  assert.equal(tickets(checkService({ ticketRows: [tk('1', { invoice_total: 0, invoice_number: '' })] }))[0].findings[0].code, 'zero_invoice');
  assert.equal(tickets(checkService({ ticketRows: [tk('1', { invoice_total: 0, invoice_number: '', recall_of: '0' })] })).length, 0);
  assert.equal(tickets(checkService({ ticketRows: [tk('1', { invoice_total: 0, invoice_number: '', warranty: 'yes' })] })).length, 0);
});

test('canceled tickets count for nothing', () => {
  const r = checkService({ ticketRows: [tk('1', { status: 'Canceled', invoice_number: '' })] });
  assert.equal(r.completed, 0); assert.equal(r.unbilled, 0);
});

test('utilisation counts only the working codes', () => {
  const rows = [ts('Working', 24), ts('Driving', 8), ts('Idle', 8)];
  assert.equal(tech(checkService({ ticketRows: [tk('1')], timesheetRows: rows })).utilisation_pct, 60);
  assert.equal(tech(checkService({ ticketRows: [tk('1')], timesheetRows: rows, settings: { working_codes: ['working', 'driving'] } })).utilisation_pct, 80);
});

test('utilisation below target and a high recall rate are flagged on the technician', () => {
  const r = checkService({ ticketRows: [tk('1'), tk('2', { recall_of: '1', invoice_total: 0, invoice_number: '' })], timesheetRows: [ts('Working', 10), ts('Idle', 30)] });
  assert.deepEqual(tech(r).findings.map((f) => f.code), ['low_utilisation', 'high_recall_rate']);
});

test('revenue per paid hour divides completed revenue by paid hours', () => {
  assert.equal(tech(checkService({ ticketRows: [tk('1', { invoice_total: 800 })], timesheetRows: [ts('Working', 40)] })).revenue_per_paid_hour, 20);
});
