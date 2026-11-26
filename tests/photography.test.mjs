import test from 'node:test';
import assert from 'node:assert/strict';
import {lightWindows,cloudForWindow} from '../web/photography.mjs';
test('interpolates golden and blue boundaries in both directions without bridging night',()=>{
  const rows=lightWindows([{t:0,sun:10},{t:100,sun:0},{t:200,sun:-10},{t:300,sun:0},{t:400,sun:10}]);
  assert.deepEqual(rows.map(x=>[x.kind,x.start,x.end,x.phase]),[['Golden light',40,140,'Evening'],['Blue hour',140,160,'Evening'],['Blue hour',240,260,'Morning'],['Golden light',260,360,'Morning']]);
});
test('polar daylight has no invented twilight and missing clouds stay missing',()=>{
  assert.deepEqual(lightWindows([{t:0,sun:20},{t:100,sun:30}]),[]);
  assert.equal(cloudForWindow({time:[0],cloud_cover:[null]},{start:0,end:1000}),null);
  assert.equal(cloudForWindow({time:[0],cloud_cover:[0]},{start:0,end:1000}),0);
});
test('cloud summaries require complete, valid and continuous forecast coverage',async()=>{const {cloudSummary}=await import('../web/photography.mjs');const hour=3600000,window={start:0,end:hour*2};assert.deepEqual(cloudSummary({time:[0,3600,7200],cloud_cover:[0,20,40]},window),{mean:20,maximum:40});for(const h of [{time:[0,7200],cloud_cover:[0,0]},{time:[0,3600,7200],cloud_cover:[0,null,0]},{time:[0,3600,7200],cloud_cover:[0,-1,0]},{time:[0],cloud_cover:[0]}])assert.equal(cloudSummary(h,window),null)});
