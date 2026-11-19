import {bearing, dateAt, plan, sites, observingSessions} from './model.mjs';
const $ = id => document.getElementById(id);
let current = null;
let clock = null;
let sessions = [];
let first = true;
const fmt = value => clock.format(new Date(value));
const degrees = n => Intl.NumberFormat('en-CA', {maximumFractionDigits: 1}).format(n) + '°';
const span = ([start, end]) => start === end ? fmt(start) + ' (one sample)' : fmt(start) + '–' + fmt(end);
const status = (message, error = false) => {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
};
function preset() {
  if ($('site').value === 'custom') return;
  const [name, lat, lon, zone] = sites[Number($('site').value)];
  $('lat').value = lat;
  $('lon').value = lon;
  $('zone').value = zone;
  if (first || !$('date').value) $('date').value = dateAt(new Date(), zone);
  first = false;
}

function build() {
  if (!globalThis.Astronomy) throw new Error('Astronomy Engine did not load. Reload this page.');
  const zone = $('zone').value.trim();
  try {
    clock = new Intl.DateTimeFormat('en-CA', {timeZone: zone, hour:'2-digit', minute:'2-digit', hourCycle:'h23'});
  } catch {
    throw new Error('Enter a valid IANA time zone, such as America/Halifax.');
  }
  const name = $('site').value === 'custom' ? 'Custom site' : sites[Number($('site').value)][0];
  const settings = {
    name, zone, date: $('date').value,
    lat: $('lat').valueAsNumber, lon: $('lon').valueAsNumber,
    threshold: Number($('alt').value),
    sensor: $('sensor').value.split(',').map(Number),
    focal: $('focal').valueAsNumber,
  };
  current = plan(globalThis.Astronomy, settings);
  const craterLink = new URL('https://coolcode.ca/otherworldnames/crater-light/');
  craterLink.searchParams.set('feature', '1296');
  const craterSite = {'Langley, BC': 'langley', 'Halifax, NS': 'halifax'}[name];
  if (craterSite) {
    craterLink.searchParams.set('site', craterSite);
    craterLink.searchParams.set('date', settings.date);
  }
  $('crater-light').href = craterLink.href;
  const moonPhases = ['New', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
  $('dark').textContent = current.dark.length ? current.dark.map(span).join(' · ') : 'No astronomical darkness';
  $('moon').textContent = moonPhases[Math.round(current.moonPhase / 45) % 8] + ' · ' + Math.round(100 * current.moonLight) + '% lit';
  $('fov').textContent = degrees(current.frame.width) + ' × ' + degrees(current.frame.height);
  $('target').replaceChildren(...current.targets.map(item => new Option(item.name, item.id)));
  $('results').hidden = false;
  const firstDark = current.samples.findIndex(item => item.sun < -18);
  $('time').max = current.samples.length - 1;
  $('time').value = firstDark < 0 ? Math.floor(current.samples.length / 2) : firstDark;
  status(name + ' · ' + zone + ' · six-minute samples');
  renderTargets();
  renderSessions();
  graph();
}

function renderSessions() {
  if (!current) return;
  const duration = Number($('duration').value), moonBelow = $('moon-rule').value === 'down';
  sessions = observingSessions(current, duration, moonBelow);
  const stamp = new Intl.DateTimeFormat('en-CA', {timeZone: current.settings.zone, month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'shortOffset'});
  $('session-status').textContent = sessions.length
    ? sessions.length + ' targets have a continuous ' + duration + '-minute window. Select a target to inspect its start on the chart.'
    : 'No target has a continuous ' + duration + '-minute window with these settings. Try a shorter session, a different Moon constraint or another night.';
  const rows = sessions.map(session => {
    const row = document.createElement('tr'), button = document.createElement('button');
    button.type = 'button'; button.textContent = session.name;
    button.addEventListener('click', () => {
      $('target').value = session.id;
      $('time').value = session.startIndex;
      renderTargets(); graph();
      $('time').focus();
    });
    row.insertCell().append(button);
    row.insertCell().textContent = stamp.format(session.start) + ' – ' + stamp.format(session.end);
    row.insertCell().textContent = bearing(session.azimuth) + ' ' + degrees(session.azimuth) + ' · ' + degrees(session.altitude) + ' high';
    row.insertCell().textContent = degrees(session.floor);
    row.insertCell().textContent = degrees(session.moonHigh);
    return row;
  });
  $('session-rows').replaceChildren(...rows);
}

function framing(item) {
  if (!item.width) return 'Point / small disk';
  const widest = Math.max(item.width, item.height);
  const narrowest = Math.min(item.width, item.height);
  if (widest > current.frame.width || narrowest > current.frame.height) return 'Larger than frame';
  return 'Fits · ' + Math.max(1, Math.round(100 * widest / current.frame.width)) + '% of width';
}

function renderTargets() {
  if (!current) return;
  const selected = $('target').value;
  const category = $('category').value;
  $('targets').replaceChildren(...current.targets.filter(item => category === 'all' || item.category === category).map(item => {
    const row = document.createElement('tr');
    if (item.id === selected) row.classList.add('picked');
    const name = row.insertCell();
    const control = document.createElement('button');
    control.type = 'button';
    control.textContent = item.name;
    control.setAttribute('aria-pressed', String(item.id === selected));
    control.addEventListener('click', () => {
      $('target').value = item.id;
      renderTargets();
      graph();
      $('target').focus();
    });
    const type = document.createElement('small');
    type.textContent = item.ra != null ? item.id + ' · ' + item.category : item.category;
    name.append(control, type);
    row.insertCell().textContent = fmt(item.best.t) + ' · ' + bearing(item.best.azimuth) + ' ' + degrees(item.best.azimuth);
    row.insertCell().textContent = degrees(item.best.altitude);
    row.insertCell().textContent = item.windows.map(span).join(', ') || 'Below cutoff or no darkness';
    row.insertCell().textContent = framing(item);
    return row;
  }));
}

function graph() {
  if (!current) return;
  const canvas = $('graph');
  const rect = canvas.getBoundingClientRect(), w = rect.width, h = rect.height;
  if (!w || !h) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  const g = canvas.getContext('2d');
  g.scale(ratio, ratio);
  const left = 41, right = w - 12, top = 14, bottom = h - 27;
  const points = current.samples;
  const start = points[0].t, end = points.at(-1).t;
  const x = t => left + (t - start) / (end - start) * (right - left);
  const y = angle => top + (90 - Math.max(-90, Math.min(90, angle))) / 180 * (bottom - top);
  g.fillStyle = '#e4edda';
  for (const [a,b] of current.dark) g.fillRect(x(a), top, x(b) - x(a), bottom - top);
  g.font = '11px monospace';
  for (const line of [-90, -45, 0, 45, 90]) {
    g.strokeStyle = line ? '#d7dbce' : '#808b78';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(left, y(line)); g.lineTo(right, y(line)); g.stroke();
    g.fillStyle = '#4a5b4d'; g.fillText(line + '°', 4, y(line) + 4);
  }
  g.textAlign = 'center';
  const tickCount = w < 480 ? 4 : 6;
  for (let tick = 0; tick <= tickCount; tick++) {
    const t = start + (end - start) * tick / tickCount;
    g.fillText(fmt(t), Math.max(left, Math.min(right - 15, x(t))), h - 6);
  }
  const target = current.paths[$('target').value];
  for (const [key, color] of [['sun','#a34729'], ['moon','#75509b'], ['target','#326742']]) {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    points.forEach((row, i) => {
      const py = y(key === 'target' ? target[i].altitude : row[key]);
      if (i) g.lineTo(x(row.t), py);
      else g.moveTo(x(row.t), py);
    });
    g.stroke();
  }
  const index = Number($('time').value);
  const p = points[index], selected = target[index];
  g.strokeStyle = '#425540';
  g.lineWidth = 1;
  g.setLineDash([4,3]);
  g.beginPath(); g.moveTo(x(p.t), top); g.lineTo(x(p.t), bottom); g.stroke();
  $('time').setAttribute('aria-valuetext', fmt(p.t));
  $('values').textContent = fmt(p.t) + ' · Sun ' + degrees(p.sun) +
    ' · Moon ' + degrees(p.moon) + ' · ' + $('target').selectedOptions[0].text +
    ' ' + degrees(selected.altitude) + ' ' + bearing(selected.azimuth);
}

$('site').append(...sites.map((site, index) => new Option(site[0], index)), new Option('Custom coordinates', 'custom'));
$('site').addEventListener('change', preset);
for (const field of ['lat','lon','zone']) $(field).addEventListener('input', () => { $('site').value = 'custom'; });
$('planner').addEventListener('submit', event => {
  event.preventDefault();
  try { build(); } catch (error) { status(error.message, true); $('results').hidden = true; }
});
$('target').addEventListener('change', () => {renderTargets(); graph();});
$('category').addEventListener('change', renderTargets);
for (const id of ['duration','moon-rule']) $(id).addEventListener('change', renderSessions);
$('time').addEventListener('input', graph);
new ResizeObserver(graph).observe($('graph'));
$('export').addEventListener('click', () => {
  const {settings, dark, frame, moonPhase, moonLight, targets} = current;
  const record = {settings, sessionMinutes: Number($('duration').value), requireMoonBelow: $('moon-rule').value === 'down', sessions, dark, frame, moonPhase, moonLight, targets, timing:'Unix milliseconds, UTC', source:'Astronomy Engine 2.1.19; fixed J2000 object catalogue'};
  const href = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type:'application/json'}));
  const a = Object.assign(document.createElement('a'), {href, download:'nightfinder-' + settings.date + '.json'});
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});
preset();
window.addEventListener('load', () => {
  try { build(); } catch (error) {status(error.message, true);}
}, {once:true});
