import {parseHorizon,horizonAt,clearance,readProfiles} from './horizon.mjs';
import {bearing, dateAt, plan, observingSessions} from './model.mjs';
import {locations, matchingLocations, regions, sourceDate} from './location-search.mjs';
import {photographyWeek, cloudForWindow} from './photography.mjs';
const $ = id => document.getElementById(id);
let current = null;
let clock = null;
let sessions = [];
let first = true;
const horizonKey='coolcode:nightfinder:horizons:v1';
let profiles=[];try{profiles=readProfiles(localStorage.getItem(horizonKey));}catch{}
let photoWindows = [], cloudHourly = null, cloudRequest = 0;
const fmt = value => clock.format(new Date(value));
const degrees = n => Intl.NumberFormat('en-CA', {maximumFractionDigits: 1}).format(n) + '°';
const span = ([start, end]) => start === end ? fmt(start) + ' (one sample)' : dateAt(new Date(start),current.settings.zone)!==dateAt(new Date(end),current.settings.zone) ? dateAt(new Date(start),current.settings.zone)+' '+fmt(start)+' – '+dateAt(new Date(end),current.settings.zone)+' '+fmt(end) : fmt(start)+'–'+fmt(end);
const status = (message, error = false) => {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
};
function preset() {
  if (!$('site').value || $('site').value === 'custom') return;
  const {lat, lon, zone} = locations[Number($('site').value)];
  if(Number($('lat').value)!==lat||Number($('lon').value)!==lon)$('use-horizon').checked=false;
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
  const name = $('site').value === 'custom' ? 'Custom site' : locations[Number($('site').value)].name;
  const settings = {
    name, zone, date: $('date').value,
    lat: $('lat').valueAsNumber, lon: $('lon').valueAsNumber,
    threshold: Number($('alt').value),
    horizon:$('use-horizon').checked?parseHorizon($('horizon-points').value):[],
    horizonMargin:Number($('horizon-margin').value),
    horizonName:$('horizon-name').value.trim(),
    moonSeparation:Number($('moon-separation').value),
    sensor: $('sensor').value.split(',').map(Number),
    focal: $('focal').valueAsNumber,
  };
  current = plan(globalThis.Astronomy, settings);
  photoWindows = photographyWeek(globalThis.Astronomy, settings);
  cloudHourly = null; cloudRequest++;
  $('cloud-status').textContent = 'Solar windows are calculated locally. Cloud forecasts load only when requested.';
  $('load-clouds').disabled = false;
  renderPhotography();
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
    row.insertCell().textContent = session.moonSeparationFloor===null?'Unavailable':degrees(session.moonSeparationFloor);
    row.insertCell().textContent = degrees(session.clearanceFloor);
    return row;
  });
  $('session-rows').replaceChildren(...rows);
}

function renderPhotography() {
  const format = new Intl.DateTimeFormat('en-CA',{timeZone:current.settings.zone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZoneName:'shortOffset'});
  $('photo-rows').replaceChildren(...photoWindows.map(window=>{
    const row=document.createElement('tr');
    row.insertCell().textContent=window.kind+' · '+window.phase;
    row.insertCell().textContent=format.format(window.start)+' – '+format.format(window.end);
    row.insertCell().textContent=Math.round((window.end-window.start)/60000)+' min';
    const cloud=cloudForWindow(cloudHourly,window);
    row.insertCell().textContent=cloud===null?'No forecast loaded for this window':cloud+'%';
    return row;
  }));
  $('photo-empty').hidden=photoWindows.length>0;
}

$('load-clouds').addEventListener('click',async()=>{
  if(!current)return;
  const token=++cloudRequest;
  $('load-clouds').disabled=true;
  $('cloud-status').textContent='Loading the next seven days of cloud forecasts…';
  try {
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.search=new URLSearchParams({latitude:current.settings.lat,longitude:current.settings.lon,hourly:'cloud_cover',forecast_days:7,timezone:'GMT',timeformat:'unixtime'});
    const response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Forecast service returned HTTP '+response.status);
    const data=await response.json();
    if(!Array.isArray(data.hourly?.time)||!Array.isArray(data.hourly?.cloud_cover))throw Error('Cloud forecast is unavailable.');
    if(token!==cloudRequest)return;
    cloudHourly=data.hourly;renderPhotography();
    $('cloud-status').textContent='Open-Meteo cloud forecast retrieved '+new Date().toISOString()+'. Windows outside the forecast period have no cloud value. Lower cloud cover may help, but does not guarantee clear skies.';
  } catch(error) { if(token===cloudRequest)$('cloud-status').textContent=error.message+' Solar windows remain available.'; }
  finally {if(token===cloudRequest)$('load-clouds').disabled=false;}
});

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
    row.insertCell().textContent = item.id==='Moon'?'Target is the Moon':degrees(item.best.moonSeparation);
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
  for (const [key, color] of [['sun','#a34729'], ['moon','#75509b'], ['target','#326742'],['horizon','#926b25']]) {
    g.strokeStyle = color;
    g.lineWidth = 2;
    g.beginPath();
    points.forEach((row, i) => {
      const py = y(key==='horizon'?horizonAt(current.settings.horizon,target[i].azimuth)+(current.settings.horizon?.length?current.settings.horizonMargin:0):key === 'target' ? target[i].altitude : row[key]);
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
    ' ' + degrees(selected.altitude) + ' ' + bearing(selected.azimuth) + ' · Obstruction ' + degrees(horizonAt(current.settings.horizon,selected.azimuth)) + ' · Clearance above observing cutoff '+degrees(clearance(selected,current.settings))+' · Moon separation '+degrees(selected.moonSeparation);
  const summary=current.targets.find(t=>t.id===$('target').value);
  $('visibility').textContent='Above your obstruction and safety margin: '+(summary.visibleWindows.length?summary.visibleWindows.map(span).join(' · '):'No clear sample in this noon-to-noon period')+'. These geometric visibility windows ignore darkness and your minimum observing altitude. Dark observing windows are listed below.';
}

function showLocations() {
  const previous = $('site').value;
  const matches = matchingLocations($('place-search').value, $('region').value);
  const shown = matches.slice(0, 60);
  const prompt = new Option(matches.length ? 'Choose a matching place' : 'No matching places', '');
  prompt.disabled = true;
  $('site').replaceChildren(prompt, ...shown.map(p => new Option(p.display, p.id)), new Option('Custom coordinates', 'custom'));
  const remembered = shown.some(p => String(p.id) === previous);
  const initial = first && !$('region').value && !$('place-search').value;
  if (remembered) $('site').value = previous;
  else if (matches.length === 1 || initial) $('site').value = String(matches[0].id);
  else $('site').value = '';
  $('match-count').textContent = matches.length > shown.length
    ? 'Showing ' + shown.length + ' of ' + matches.length.toLocaleString('en-CA') + ' places. Narrow the list by name or region.'
    : matches.length ? matches.length + (matches.length === 1 ? ' matching place.' : ' matching places.')
    : 'No matches. Change the search or select custom coordinates.';
  preset();
}

for (const [code, label] of Object.entries(regions)) $('region').add(new Option(label, code));
$('place-search').addEventListener('input', showLocations);
$('region').addEventListener('change', showLocations);
$('edition').textContent = sourceDate;
showLocations();
$('site').addEventListener('change', preset);
for (const field of ['lat','lon','zone']) $(field).addEventListener('input', () => { $('site').value = 'custom';$('use-horizon').checked=false;$('horizon-status').textContent='Location changed. Re-enable or load the appropriate horizon profile for this site.'; });
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
  const record = {settings, photography:photoWindows.map(w=>({...w,cloudCoverPercent:cloudForWindow(cloudHourly,w)})), sessionMinutes: Number($('duration').value), requireMoonBelow: $('moon-rule').value === 'down', sessions, dark, frame, moonPhase, moonLight, targets, timing:'Unix milliseconds, UTC', source:'Astronomy Engine 2.1.19; fixed J2000 object catalogue; optional Open-Meteo forecast'};
  const href = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], {type:'application/json'}));
  const a = Object.assign(document.createElement('a'), {href, download:'nightfinder-' + settings.date + '.json'});
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});
window.addEventListener('load', () => {
  try { build(); } catch (error) {status(error.message, true);}
}, {once:true});

function showProfiles(){const before=$('saved-horizons').value;$('saved-horizons').replaceChildren(new Option('Choose a saved site…',''),...profiles.map((p,i)=>new Option(p.name,String(i))));if(profiles[Number(before)]&&before!=='')$('saved-horizons').value=before;}
function persistProfiles(){try{localStorage.setItem(horizonKey,JSON.stringify(profiles));return true;}catch{$('horizon-status').textContent='Browser storage is unavailable. The active horizon still works for this visit; export the plan to keep it.';return false;}}
$('save-horizon').onclick=()=>{try{parseHorizon($('horizon-points').value);const name=$('horizon-name').value.trim();if(!name)throw Error('Name this horizon profile first.');const lat=$('lat').valueAsNumber,lon=$('lon').valueAsNumber,zone=$('zone').value.trim();const p={name,lat,lon,zone,text:$('horizon-points').value,margin:Number($('horizon-margin').value),moonSeparation:Number($('moon-separation').value)};readProfiles(JSON.stringify([p]));const index=profiles.findIndex(p=>p.name===name);if(index>=0)profiles[index]=p;else{if(profiles.length>=20)throw Error('Remove a saved profile before adding more than 20.');profiles.push(p);}showProfiles();if(persistProfiles())$('horizon-status').textContent='Saved this horizon and observing coordinates only in this browser. A profile with the same name is replaced.';}catch(e){$('horizon-status').textContent=e.message;}};
$('load-horizon').onclick=()=>{if($('saved-horizons').value==='')return;const p=profiles[Number($('saved-horizons').value)];if(!p)return;$('horizon-name').value=p.name;$('horizon-points').value=p.text;$('horizon-margin').value=String(p.margin??2);$('moon-separation').value=String(p.moonSeparation??0);$('lat').value=p.lat;$('lon').value=p.lon;$('zone').value=p.zone;$('site').value='custom';$('use-horizon').checked=true;$('horizon-status').textContent='Loaded '+p.name+'. Calculate sky to apply this saved site and horizon.';};
$('delete-horizon').onclick=()=>{if($('saved-horizons').value==='')return;profiles.splice(Number($('saved-horizons').value),1);showProfiles();if(persistProfiles())$('horizon-status').textContent='Removed the saved profile. The current form is unchanged.';};
showProfiles();
