import test from 'node:test';
import assert from 'node:assert/strict';
import {locations, matchingLocations, regions} from '../web/location-search.mjs';
import {nightBounds} from '../web/model.mjs';

test('searches every province and territory offline and handles accented place names', () => {
  assert.deepEqual(new Set(locations.map(place => place.province)), new Set(Object.keys(regions)));
  assert.ok(locations.length > 3000);
  assert.equal(matchingLocations('montreal', 'QC')[0].name, 'Montréal, QC');
  assert.equal(matchingLocations('St Johns', 'NL')[0].name, "St. John's, NL");
  assert.equal(matchingLocations('st. john’s', 'NL')[0].zone, 'America/St_Johns');
  assert.equal(matchingLocations('YELLOWKNIFE', 'NT')[0].name, 'Yellowknife, NT');
  assert.equal(matchingLocations('Yellowknife', 'PE').length, 0);
  assert.equal(matchingLocations('Aldergrove', 'BC')[0].lat, 49.055);
});

test('local noons respect Newfoundland half hours, DST transitions and territorial differences', () => {
  const bounds = (name, region, date) => nightBounds(date, matchingLocations(name, region)[0].zone);
  assert.equal(new Date(bounds('St Johns', 'NL', '2026-01-15')[0]).toISOString(), '2026-01-15T15:30:00.000Z');
  const [start, end] = bounds('St Johns', 'NL', '2026-10-31');
  assert.equal(end - start, 25 * 3600000);
  assert.equal(new Date(bounds('Whitehorse', 'YT', '2026-01-15')[0]).getUTCHours(), 19);
  assert.equal(new Date(bounds('Iqaluit', 'NU', '2026-01-15')[0]).getUTCHours(), 17);
  assert.equal(new Date(bounds('Cambridge Bay', 'NU', '2026-01-15')[0]).getUTCHours(), 19);
});
