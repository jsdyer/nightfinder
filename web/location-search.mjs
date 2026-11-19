import {sites} from './model.mjs';
import {places, sourceDate} from './geonames.mjs';

export {sourceDate};
export const regions = {
  AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
  NL: 'Newfoundland and Labrador', NT: 'Northwest Territories', NS: 'Nova Scotia',
  NU: 'Nunavut', ON: 'Ontario', PE: 'Prince Edward Island', QC: 'Quebec',
  SK: 'Saskatchewan', YT: 'Yukon',
};

const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[.’']/g, '').replace(/[-\s]+/g, ' ').trim();
const normal = sites.map(([label, lat, lon, zone]) => {
  const [name, province] = label.split(', ');
  return [name, province, lat, lon, zone];
});
// Keep the coordinates already used by the original six presets.
const known = new Set(normal.map(([name, province]) => name + ', ' + province));
const options = [...normal, ...places.filter(([name, province]) => !known.has(name + ', ' + province))];
const counts = new Map();
for (const [name, province] of options) {
  const label = name + ', ' + province;
  counts.set(label, (counts.get(label) || 0) + 1);
}
export const locations = options.map(([name, province, lat, lon, zone], id) => {
  const label = name + ', ' + province;
  const display = counts.get(label) > 1 ? label + ' (' + lat + ', ' + lon + ')' : label;
  return {id, name: label, display, province, lat, lon, zone, search: fold(name)};
});

export function matchingLocations(query, province) {
  const term = fold(query);
  const groups = [[], [], []];
  for (const place of locations) {
    if (province && place.province !== province) continue;
    if (!place.search.includes(term)) continue;
    const rank = place.search === term ? 0 : place.search.startsWith(term) ? 1 : 2;
    groups[rank].push(place);
  }
  return groups.flat();
}
