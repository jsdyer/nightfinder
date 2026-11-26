const rad=Math.PI/180;
export function parseHorizon(text){
 const rows=String(text).trim().split(/\n|;/).filter(x=>x.trim());if(!rows.length)throw Error('Enter at least one azimuth, altitude pair.');if(rows.length>72)throw Error('Use at most 72 horizon points.');
 const points=new Map();for(const row of rows){const values=row.trim().split(/[\s,]+/);if(values.length!==2)throw Error('Use one azimuth, altitude pair per line, such as 90, 35.');let [az,alt]=values.map(Number);if(!Number.isFinite(az)||!Number.isFinite(alt)||az<0||az>360||alt<0||alt>90)throw Error('Azimuth must be 0–360° and obstruction altitude 0–90°.');az%=360;if(points.has(az)&&points.get(az)!==alt)throw Error('Use one obstruction altitude per azimuth (0° and 360° are the same direction).');points.set(az,alt);}
 return [...points].sort((a,b)=>a[0]-b[0]);
}
export function horizonAt(points,azimuth){
 if(!points?.length)return 0;if(points.length===1)return points[0][1];
 const az=((azimuth%360)+360)%360;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];const end=i===points.length-1?b[0]+360:b[0];const t=az<a[0]&&i===points.length-1?az+360:az;if(t>=a[0]&&t<=end)return a[1]+(b[1]-a[1])*(t-a[0])/(end-a[0]);}return 0;
}
export function separation(a,b){const c=Math.sin(a.altitude*rad)*Math.sin(b.altitude*rad)+Math.cos(a.altitude*rad)*Math.cos(b.altitude*rad)*Math.cos((a.azimuth-b.azimuth)*rad);return Math.acos(Math.max(-1,Math.min(1,c)))/rad;}
export function clearance(point,settings){return point.altitude-Math.max(settings.threshold,horizonAt(settings.horizon,point.azimuth)+(settings.horizon?.length?settings.horizonMargin||0:0));}
export function moonAllowed(point,sample,minimum=0,targetId=''){return targetId==='Moon'||sample.moon<0||!minimum||Number.isFinite(point.moonSeparation)&&point.moonSeparation>=minimum;}
export function readProfiles(raw){
 const input=JSON.parse(raw||'[]');if(!Array.isArray(input)||input.length>20)throw Error('Invalid saved horizon profiles.');
 return input.map(p=>{if(!p||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lon)||Math.abs(p.lon)>180||typeof p.zone!=='string'||p.zone.length>80||typeof p.text!=='string')throw Error('Invalid saved horizon profile.');if(p.margin!==undefined&&![0,2,5,10].includes(p.margin)||p.moonSeparation!==undefined&&![0,20,30,45,60].includes(p.moonSeparation))throw Error('Invalid saved horizon constraints.');if(p.enabled!==undefined&&typeof p.enabled!=='boolean')throw Error('Invalid horizon enabled setting.');parseHorizon(p.text);new Intl.DateTimeFormat('en',{timeZone:p.zone});return p;});
}
