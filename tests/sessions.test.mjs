import test from 'node:test';
import assert from 'node:assert/strict';
import {observingSessions} from '../web/model.mjs';

function night(altitudes, moon, sun) {
  const paths = altitudes.map((altitude, i) => ({t: 360000 * i, altitude, azimuth: 90}));
  return {settings: {threshold: 30}, targets: [{id: 'M31', name: 'Andromeda'}], paths: {M31: paths},
    samples: paths.map((_, i) => ({sun: sun?.[i] ?? -20, moon: moon?.[i] ?? -10}))};
}

test('selects the full-length block with the highest altitude floor', () => {
  const [block] = observingSessions(night([33, 46, 53, 65, 64, 59, 47, 35]), 30, true);
  assert.equal(block.startIndex, 1);
  assert.equal(block.end - block.start, 1800000);
  assert.equal(block.floor, 46);
  assert.equal(block.azimuth, 90);
});

test('a Moon rise or daylight inside the block splits eligibility; both endpoints count', () => {
  const altitudes = [40, 40, 40, 40, 40, 40];
  const sky = night(altitudes, [-2, -2, 0, -2, -2, -2]);
  assert.equal(observingSessions(sky, 30, true).length, 0);
  assert.equal(observingSessions(sky, 30, false).length, 1);
  assert.equal(observingSessions(night(altitudes, null, [-20,-20,-20,-20,-20,-18]), 30, false).length, 0);
  assert.equal(observingSessions(night([40,40,40,29,40,40]), 30, false).length, 0);
});
