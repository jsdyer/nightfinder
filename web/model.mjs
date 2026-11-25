import {horizonAt,clearance,separation,moonAllowed} from './horizon.mjs';
const minute = 60_000;
const rad = Math.PI / 180;
const entries = [
  ['Andromeda Galaxy', 'M31', 0.7123, 41.269, 190, 60, 'Galaxy'],
  ['Triangulum Galaxy', 'M33', 1.5641, 30.660, 71, 42, 'Galaxy'],
  ['Whirlpool Galaxy', 'M51', 13.4979, 47.195, 11, 7, 'Galaxy'],
  ['Bode’s Galaxy', 'M81', 9.9259, 69.065, 27, 14, 'Galaxy'],
  ['Orion Nebula', 'M42', 5.5881, -5.391, 65, 60, 'Nebula'],
  ['North America Nebula', 'NGC 7000', 20.9881, 44.529, 120, 100, 'Nebula'],
  ['Rosette Nebula', 'NGC 2237', 6.5333, 4.983, 80, 60, 'Nebula'],
  ['Lagoon Nebula', 'M8', 18.0629, -24.386, 90, 40, 'Nebula'],
  ['Ring Nebula', 'M57', 18.8931, 33.029, 1.4, 1, 'Nebula'],
  ['Pleiades', 'M45', 3.79, 24.117, 110, 110, 'Cluster'],
  ['Hercules Cluster', 'M13', 16.695, 36.461, 20, 20, 'Cluster'],
  ['Double Cluster', 'NGC 869/884', 2.344, 57.136, 60, 30, 'Cluster'],
];
const planets = ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
export const targets = [
  ...planets.map(name => ({name, category: 'Solar system', id: name})),
  ...entries.map(([name, id, ra, dec, width, height, category]) =>
    ({name, id, ra, dec, width: width / 60, height: height / 60, category})),
];

export const sites = [
  ['Langley, BC', 49.105, -122.658, 'America/Vancouver'],
  ['Vancouver, BC', 49.283, -123.121, 'America/Vancouver'],
  ['Aldergrove, BC', 49.055, -122.472, 'America/Vancouver'],
  ['Halifax, NS', 44.649, -63.575, 'America/Halifax'],
  ['Kejimkujik, NS', 44.393, -65.221, 'America/Halifax'],
  ['Whitehorse, YT', 60.721, -135.056, 'America/Whitehorse'],
];

const parts = (date, zone) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
}).formatToParts(date).map(item => [item.type, item.value]));

export function dateAt(date, zone) {
  const p = parts(date, zone);
  return [p.year, p.month, p.day].join('-');
}

function noon(local, zone) {
  let guess = local;
  for (let trial = 0; trial < 4; trial++) {
    const p = parts(new Date(guess), zone);
    const observed = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    const delta = local - observed;
    if (!delta) return guess;
    guess += delta;
  }
  throw new Error('Local noon is unavailable on that date in this time zone.');
}

export function nightBounds(date, zone) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < '1900-01-01' || date > '2100-12-30') {
    throw new Error('Choose a date from 1900 to 2100.');
  }
  const day = new Date(date + 'T12:00:00Z');
  if (day.toISOString().slice(0, 10) !== date) throw new Error('Choose a valid date.');
  return [noon(+day, zone), noon(+day + 86_400_000, zone)];
}

export function frame(degrees, focalLength) {
  const [width, height] = degrees.map(mm => 2 * Math.atan(mm / (2 * focalLength)) / rad);
  return {width, height};
}

export function bearing(azimuth) {
  const names = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return names[Math.round(((azimuth % 360 + 360) % 360) / 22.5) % 16];
}

function position(engine, target, date, observer, rotation) {
  let eq;
  if (target.ra != null) {
    const direction = new engine.Spherical(target.dec, target.ra * 15, 1);
    const vector = engine.VectorFromSphere(direction, date);
    eq = engine.EquatorFromVector(engine.RotateVector(rotation, vector));
  } else {
    eq = engine.Equator(target.name, date, observer, true, true);
  }
  const horizontal = engine.Horizon(date, observer, eq.ra, eq.dec);
  return { altitude: horizontal.altitude, azimuth: horizontal.azimuth, distance: eq.dist };
}

function darkIntervals(samples) {
  const intervals = [];
  let open = samples[0].sun < -18 ? samples[0].t : null;
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1], b = samples[i];
    if ((a.sun < -18) === (b.sun < -18)) continue;
    const t = a.t + (b.t - a.t) * ((-18 - a.sun) / (b.sun - a.sun));
    if (a.sun < -18) {
      intervals.push([open, t]);
      open = null;
    } else open = t;
  }
  if (open != null) intervals.push([open, samples.at(-1).t]);
  return intervals;
}

const maxAltitude = rows => rows.reduce((best, row) => row.altitude > best.altitude ? row : best);

function targetSummary(samples, points, settings, target) {
  const darkPoints = points.filter((row, i) => samples[i].sun < -18);
  const usable = points.filter((row,i)=>samples[i].sun < -18 && clearance(row,settings)>=0 && moonAllowed(row,samples[i],settings.moonSeparation,target.id));
  const best = maxAltitude(usable.length ? usable : darkPoints.length ? darkPoints : points);
  const windows = [];
  let start = null;
  for (let i = 0; i < points.length; i++) {
    const eligible = samples[i].sun < -18 && clearance(points[i],settings)>=0 && moonAllowed(points[i],samples[i],settings.moonSeparation,target.id);
    if (eligible && start == null) start = i;
    if (start != null && (!eligible || i === points.length - 1)) {
      const finish = eligible ? i : i - 1;
      windows.push([points[start].t, points[finish].t]);
      start = null;
    }
  }
  let width = target.width;
  let height = target.height;
  if (target.name === 'Moon') {
    width = 2 * Math.asin(1737.4 / (best.distance * 149_597_870.7)) / rad;
    height = width;
  }
  const visibleWindows=[];start=null;
  for(let i=0;i<points.length;i++){
    const eligible=points[i].altitude>=horizonAt(settings.horizon,points[i].azimuth)+(settings.horizon?.length?settings.horizonMargin||0:0);
    if(eligible&&start===null)start=i;
    if(start!==null&&(!eligible||i===points.length-1)){const finish=eligible?i:i-1;visibleWindows.push([points[start].t,points[finish].t]);start=null;}
  }
  return {...target, width, height, best, windows, visibleWindows};
}

export function plan(engine, settings) {
  const {date, zone, lat, lon, threshold, sensor, focal} = settings;
  const [start, end] = nightBounds(date, zone);
  const observer = new engine.Observer(lat, lon, 0);
  const samples = [];
  const paths = Object.fromEntries(targets.map(target => [target.id, []]));
  for (let t = start; ; t = Math.min(t + 6 * minute, end)) {
    const time = new Date(t);
    const rotation = engine.Rotation_EQJ_EQD(time);
    const solar = position(engine, {name: 'Sun'}, time, observer, rotation);
    for (const target of targets) paths[target.id].push({t, ...position(engine, target, time, observer, rotation)});
    const moon=paths.Moon.at(-1);for(const target of targets){const point=paths[target.id].at(-1);point.moonSeparation=separation(point,moon);point.horizon=horizonAt(settings.horizon,point.azimuth);}
    samples.push({t, sun: solar.altitude, moon: moon.altitude});
    if (t === end) break;
  }
  const middle = new Date((start + end) / 2);
  const moonPhase = engine.MoonPhase(middle);
  const moonLight = engine.Illumination('Moon', middle).phase_fraction;
  const summary = targets.map(target => targetSummary(samples, paths[target.id], settings, target));
  summary.sort((a,b) => Number(Boolean(b.windows.length)) - Number(Boolean(a.windows.length)) || b.best.altitude - a.best.altitude);
  return {settings, samples, paths, dark: darkIntervals(samples), frame: frame(sensor, focal), moonPhase, moonLight, targets: summary};
}

export function observingSessions(sky, duration, moonBelow) {
  const steps = duration / 6;
  if (!Number.isInteger(steps) || steps <= 0) return [];
  const sessions = [];
  for (const target of sky.targets) {
    const path = sky.paths[target.id];
    let best = null;
    for (let start = 0; start + steps < path.length; start++) {
      const end = start + steps;
      if (path[end].t - path[start].t !== duration * minute) continue;
      let floor = Infinity, moonHigh = -Infinity, clearanceFloor=Infinity, moonSeparationFloor=Infinity;
      for (let i = start; i <= end; i++) {
        const {sun, moon} = sky.samples[i];
        if (sun >= -18 || (moonBelow && moon >= 0) || clearance(path[i],sky.settings)<0 || !moonAllowed(path[i],sky.samples[i],sky.settings.moonSeparation,target.id)) {
          floor = -Infinity;
          break;
        }
        floor = Math.min(floor, path[i].altitude);
        clearanceFloor=Math.min(clearanceFloor,clearance(path[i],sky.settings));
        if(Number.isFinite(path[i].moonSeparation))moonSeparationFloor=Math.min(moonSeparationFloor,path[i].moonSeparation);
        moonHigh = Math.max(moonHigh, moon);
      }
      if (Number.isFinite(floor) && (!best || clearanceFloor > best.clearanceFloor)) {
        best = {id: target.id, name: target.name, start: path[start].t, end: path[end].t,
          startIndex: start, altitude: path[start].altitude, azimuth: path[start].azimuth, floor, moonHigh, clearanceFloor, moonSeparationFloor:Number.isFinite(moonSeparationFloor)?moonSeparationFloor:null};
      }
    }
    if (best) sessions.push(best);
  }
  return sessions.sort((a, b) => b.clearanceFloor - a.clearanceFloor || a.name.localeCompare(b.name));
}
