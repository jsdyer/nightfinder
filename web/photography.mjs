import {nightBounds} from './model.mjs';
const bands = [{name:'Golden light',low:-4,high:6},{name:'Blue hour',low:-6,high:-4}];
export function lightWindows(samples) {
  const result = [];
  for (const band of bands) {
    let open = null;
    for (let i=1;i<samples.length;i++) {
      const a=samples[i-1],b=samples[i],delta=b.sun-a.sun;
      let lo=0,hi=1;
      if (delta === 0) { if (a.sun<band.low || a.sun>band.high) continue; }
      else {
        const crossings=[(band.low-a.sun)/delta,(band.high-a.sun)/delta].sort((x,y)=>x-y);
        lo=Math.max(0,crossings[0]);hi=Math.min(1,crossings[1]);
        if(hi<=lo) continue;
      }
      const start=a.t+(b.t-a.t)*lo,end=a.t+(b.t-a.t)*hi;
      if(open && Math.abs(open.end-start)<1) open.end=end;
      else {open={kind:band.name,start,end,phase:delta>0?'Morning':delta<0?'Evening':'Continuous'};result.push(open);}
    }
  }
  return result.sort((a,b)=>a.start-b.start);
}
export function photographyWeek(engine, settings) {
  const observer=new engine.Observer(settings.lat,settings.lon,0),windows=[];
  for(let day=0;day<7;day++){
    const date=new Date(settings.date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+day);
    if(date.toISOString().slice(0,10)>'2100-12-30') break;
    const [start,end]=nightBounds(date.toISOString().slice(0,10),settings.zone),samples=[];
    for(let t=start;;t=Math.min(t+180000,end)){
      const time=new Date(t),equator=engine.Equator('Sun',time,observer,true,true);
      samples.push({t,sun:engine.Horizon(time,observer,equator.ra,equator.dec).altitude});
      if(t===end)break;
    }
    windows.push(...lightWindows(samples));
  }
  return windows;
}
// Hourly values represent a nearest-hour band. Require uninterrupted coverage of the
// full requested window; never average a partial forecast into an apparent clear night.
export function cloudSummary(hourly, window) {
 if(!Number.isFinite(window.start)||!Number.isFinite(window.end)||window.end<=window.start)return null;
 const points=(hourly?.time??[]).map((t,i)=>({t:t*1000,v:hourly.cloud_cover?.[i]})).filter(p=>Number.isFinite(p.t)).sort((a,b)=>a.t-b.t);
 let covered=window.start,weighted=0,total=0,maximum=0;
 for(const p of points){const start=Math.max(window.start,p.t-1800000),end=Math.min(window.end,p.t+1800000);if(end<=start||end<=covered)continue;
  if(start>covered+1||typeof p.v!=='number'||!Number.isFinite(p.v)||p.v<0||p.v>100)return null;
  const weight=end-Math.max(start,covered);weighted+=p.v*weight;total+=weight;maximum=Math.max(maximum,p.v);covered=end;
  if(covered>=window.end)return {mean:Math.round(weighted/total),maximum};
 }
 return null;
}
export function cloudForWindow(hourly, window){return cloudSummary(hourly,window)?.mean??null;}
