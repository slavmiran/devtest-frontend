const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{}};context.window.window=context.window;
for(const name of ['live-campaign-keywords','live-campaign-draft','live-campaign-traffic']){
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/'+name+'.js'),'utf8'),context.window);
}
const model=context.window.LiveCampaignDraft,ideas=context.window.LiveCampaignKeywords,traffic=context.window.LiveCampaignTraffic;
const project={id:42,name:'Family Budget Planner',live_metrics:{source:'devtesthub_live',boundary_available:true,installs:{per_day:10}}};
let d=model.applyStrategy(model.create(project),'aso'),q=model.quote(d);
assert.equal(q.installs,42);assert.deepEqual(JSON.parse(JSON.stringify(model.counts(d))),{link:4,web:9,keywords:29});
assert.equal(q.totalCommitment,840);assert.equal(q.dailyCommitment,60);
d=model.change(d,'link',11);assert.equal(model.quote(d).installs,49);assert.equal(d.pacing.acquisitionDays,17);
d=model.keyword(d,d.keywords[0].id,'installs',2);assert.equal(model.quote(d).installs,22);
d=model.change(d,'daily',5);assert.equal(model.quote(d).installs,22);assert.equal(model.quote(d).acquisitionDays,5);
assert.equal(model.quote(d).totalCommitment,440);
d=model.change(d,'checkpoint',7);assert.equal(model.quote(d).totalCommitment,220);
assert.equal(model.change(d,'checkpoint',14),d);assert.equal(model.change(d,'checkpoint',1),d);
const row=d.keywords[0];assert.equal(model.keyword(d,row.id,'installs',0),d);
let added=model.addKeyword(d,'  Travel  TAXI ');assert.equal(model.quote(added).installs,23);
assert.equal(model.addKeyword(added,'travel taxi'),added);assert.equal(model.addKeyword(added,'x'.repeat(81)),added);
assert.equal(model.addKeyword(added,'\u0000bad'),added);
assert.equal(model.change(d,'web',-1),d);assert.equal(model.change(d,'link',1.5),d);
assert.equal(model.change(d,'link',100001),d);
assert.equal(model.change(d,'daily',Infinity),d);
d=model.change(d,'webQuery','');assert.equal(model.valid(d,2),false);
d=model.change(d,'web',0);assert.equal(model.valid(d,2),true);
for(const key of d.keywords)d=model.keyword(d,key.id,'remove');
d=model.change(d,'link',0);assert.equal(model.quote(d).available,false);assert.equal(model.valid(d,5),false);
const base=traffic.baseline({source:'devtesthub_live',is_demo:false,install_velocity:{source_counts:{link:90,browser:5,key:5,unknown:0}}});
const balanced=traffic.mix(model.applyStrategy(model.create(project),'aso'),base);
assert.equal(balanced.total,142);assert.equal(balanced.status,'balanced');
const custom=model.applyStrategy(model.create(project),'custom');assert.equal(traffic.mix(custom,null).status,'warning');
assert.equal(traffic.baseline({source:'devtesthub_live',is_demo:true,source_counts:{link:90,browser:5,key:5}}),null);
const unknown=traffic.baseline({source:'devtesthub_live',source_counts:{link:0,browser:0,key:0,unknown:100}});
assert.equal(traffic.mix(custom,unknown).status,'uncertain');assert.equal(traffic.mix(custom,unknown).total,107);
const exact80=traffic.baseline({source:'devtesthub_live',source_counts:{link:80,browser:20,key:0}});
const zero=model.change(custom,'link',0);assert.equal(traffic.mix(zero,exact80).dominant,true);
const keys=ideas.suggest({title:'Family Budget Planner',summary:'Track family budget and travel expenses',description:'<script>evil script()</script> Family budget for everyone.'});
assert.ok(keys.includes('family budget'));assert.equal(keys.some(k=>k.includes('evil')),false);
assert.ok(keys.every(k=>k.split(' ').length<=3));assert.equal(keys.includes('and'),false);
for(const rate of [null,NaN,Infinity,-1,'12']){
 const p={...project,live_metrics:{...project.live_metrics,installs:{per_day:rate}}};
 const empty=model.create(p);assert.equal(empty.baseline.available,false);assert.equal(model.applyStrategy(empty,'aso').pacing.dailyInstalls,1);
}
for(const strategy of ['aso','retention','deep','custom']){
 const preset=model.applyStrategy(model.create(project),strategy),quote=model.quote(preset);
 assert.equal(quote.channels.reduce((sum,c)=>sum+c.count,0),quote.installs);
 assert.ok(preset.retention.checkpoints.length>=2);
}
console.log('Live setup model: exact counts, preserved totals vs pacing, budget, attribution incl unknown/demo, safe keyword ideas, duplicates and bounds passed.');
