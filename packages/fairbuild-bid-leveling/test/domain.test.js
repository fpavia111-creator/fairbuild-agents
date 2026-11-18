// Bid leveling: plugs, responsiveness, outliers, ranking and package names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelBids } from '../src/index.js';

const bid = (bidder, base, extra = {}) => ({ bid_package: 'Roofing', bidder, base_bid: base, includes: 'membrane;flashing', exclusions: '', bond: 'yes', addenda_acknowledged: 1, received_at: '2026-11-10T10:00', ...extra });
const scope = [{ bid_package: 'Roofing', item: 'membrane', plug_value: 50000 }, { bid_package: 'Roofing', item: 'flashing', plug_value: 8000 }];
const run = (bids, settings = {}) => levelBids({ bidRows: bids, scopeRows: scope, settings });
const one = (r, bidder) => r.items.find((i) => i.bidder === bidder);

test('a complete, on-time bid is ranked on its base price', () => {
  const r = run([bid('A Co', 100000), bid('B Co', 105000)]);
  assert.equal(one(r, 'A Co').rank, 1); assert.equal(one(r, 'A Co').status, 'ok');
});

test('a missing scope item is added at its plug and can change the ranking', () => {
  const r = run([bid('A Co', 100000, { includes: 'membrane' }), bid('B Co', 105000)]);
  assert.equal(one(r, 'A Co').leveled_bid, 108000); assert.equal(one(r, 'B Co').rank, 1);
});

test('scope item names match whatever the case and spacing', () => {
  assert.equal(one(run([bid('A Co', 100000, { includes: ' Membrane ;FLASHING' })]), 'A Co').plugs, 0);
});

test('late, unbonded or short of addenda is not responsive and is not ranked', () => {
  const settings = { require_bond: true, addenda_required: 2, due_at: '2026-11-10T09:00' };
  const r = run([bid('A Co', 90000, { bond: 'no' })], settings);
  assert.deepEqual(one(r, 'A Co').findings.map((f) => f.code), ['late_bid', 'no_bond', 'missing_addenda']);
  assert.equal(one(r, 'A Co').rank, null);
});

test('a bid far below the median is flagged for a scope check', () => {
  const r = run([bid('A Co', 100000), bid('B Co', 102000), bid('C Co', 70000)]);
  assert.ok(one(r, 'C Co').findings.some((f) => f.code === 'low_outlier'));
  assert.ok(!one(r, 'A Co').findings.some((f) => f.code === 'low_outlier'));
});

test('packages are kept apart and named as in the file', () => {
  const r = run([bid('A Co', 100000), bid('A Co', 50000, { bid_package: 'Siding', includes: '' })]);
  assert.deepEqual(Object.keys(r.by_package).sort(), ['Roofing', 'Siding']);
});

test('the spread is between the lowest and highest responsive leveled bids', () => {
  const r = run([bid('A Co', 100000), bid('B Co', 110000)]);
  assert.equal(r.by_package.Roofing.spread_pct, 10);
});
