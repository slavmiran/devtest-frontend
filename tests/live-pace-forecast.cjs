const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const scope={console};scope.window=scope;scope.LiveCampaignPaceView={autoGap:c=>({min:Math.max(1,Math.min(30,Math.floor(1080/c.U_opt))),max:Math.max(1,Math.min(90,Math.floor(1440/c.U_opt)))})};vm.createContext(scope);
for(const name of ['live-manual-plan','live-pace-forecast'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),scope);
const f=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/live-pace-forecast.json'))),M=scope.LivePaceForecast;
const d={volume:{mode:'manual',manualPlan:f.plan,corridorProfile:'standard'},forecastContext:f.context,corridor:f.points[0].canonical};
const result=M.forecast(d);
for(let i=0;i<14;i++){
 assert.equal(result.targets[i],f.points[i].target,'SQL/JS target D'+(i+1));assert.equal(result.values[i],f.points[i].value,'SQL/JS capacity D'+(i+1));
 for(const k of ['B_t','L_floor','U_opt'])assert(Math.abs(result.corridors[i][k]-f.points[i].corridor[k])<1e-9,'SQL/JS '+k+' D'+(i+1));
}
assert(result.corridors[13].B_t>result.corridors[0].B_t);
const altered=structuredClone(d);altered.volume.manualPlan.targetInstalls=80;const changed=M.forecast(altered);assert.equal(changed.corridors[0].B_t,result.corridors[0].B_t,'No look-ahead');assert.equal(changed.corridors[1].B_t,result.corridors[1].B_t);assert(changed.corridors[13].B_t>result.corridors[13].B_t);
const landing=structuredClone(d);Object.assign(landing.volume.manualPlan,{strategy:'landing',startInstalls:12,targetInstalls:2,days:7,afterGoal:'wave'});const down=M.forecast(landing);assert(down.corridors[13].B_t<down.corridors[0].B_t);assert(new Set(down.targets.slice(7)).size>1);assert(down.targets.slice(7).every(n=>n>=1&&n<=4));
const expanded=structuredClone(d);expanded.volume.corridorProfile='expanded';assert(M.forecast(expanded).corridors[0].U_opt>result.corridors[0].U_opt);assert.equal(M.forecast(expanded).canonical[0].U_opt,result.canonical[0].U_opt);
const capped=structuredClone(d);capped.paceCampaignCapacity=2;assert(M.forecast(capped).values.every(n=>n<=2));assert(M.forecast(capped).corridors[13].B_t<result.corridors[13].B_t,'Caps feed tomorrow\'s history');
const auto=structuredClone(d);auto.volume.mode='auto';const wave=M.forecast(auto);assert(wave.targets.every((n,i)=>n<=wave.canonical[i].U_opt));assert(new Set(wave.targets).size>2);assert(wave.targets.some((n,i)=>n<wave.canonical[i].U_opt-2),'Auto does not hug ceiling');
const noHistory={volume:{mode:'auto'},corridor:null};assert(M.forecast(noHistory).values.every(n=>n===null));
assert.equal(M.windowFor([1,1,1,1,1,1,1]).B_t,1);
console.log('SQL/JS golden parity, recursive history, no look-ahead, landing, plateau wave, auto wave, profile isolation and capacity passed.');

const spike=M.windowFor(Array(25).fill(0).concat(1000,0,0));const narrow=M.target(spike,"conservative");assert(narrow.U_opt>=narrow.L_floor,"Conservative band preserves anti-cliff floor");

const reordered=Object.fromEntries(Object.entries(f.plan).reverse());assert(M.sameVolume(f.plan,reordered),"JSON key order does not restart the forecast");
