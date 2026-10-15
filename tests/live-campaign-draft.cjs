const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../js/live-campaign-draft.js'),'utf8'),context);
const model=context.window.LiveCampaignDraft;
const project={id:42,live_metrics:{source:'devtesthub_live',boundary_available:true,as_of:'2026-10-15T00:00:00Z',installs:{per_day:10}}};
let draft=model.create(project);assert.equal(model.quote(draft).available,false);
draft=model.applyStrategy(draft,'aso');assert.equal(draft.pacing.dailyInstalls,3);assert.equal(draft.retention.days,14);assert.equal(draft.reviews.enabled,true);
assert.equal(model.quote(draft).totalCommitment,840);assert.equal(model.quote(draft).dailyCommitment,60);
draft=model.change(draft,'checkpoint',7);assert.equal(model.quote(draft).totalCommitment,420);
assert.equal(model.change(draft,'checkpoint',14),draft,'Last paid checkpoint must remain');
assert.equal(model.change(draft,'checkpoint',1),draft,'D1 cannot be disabled');
draft=model.change(draft,'daily',4);assert.equal(model.quote(draft).installs,56);assert.equal(model.quote(draft).totalCommitment,560);
draft=model.change(draft,'retention',7);assert.equal(draft.retention.checkpoints.includes(14),false);
for(const field of ['link','web','keywords'])draft=model.change(draft,field,0);
assert.equal(model.quote(draft).available,false);assert.equal(model.valid(draft,2),false);
draft=model.change(draft,'link',10);assert.equal(model.quote(draft).channels.find(c=>c.key==='link').count,56);
for(const strategy of ['aso','retention','deep','custom']) {
 const preset=model.applyStrategy(model.create(project),strategy),q=model.quote(preset);
 assert.equal(q.channels.reduce((sum,c)=>sum+c.count,0),q.installs);assert.ok(preset.retention.checkpoints.length>=2);
 assert.equal(q.completionDays,preset.pacing.acquisitionDays+preset.retention.days-1);
}
for(const rate of [null,NaN,Infinity,-1,'12']){
 const p={...project,live_metrics:{...project.live_metrics,installs:{per_day:rate}}};
 const empty=model.create(p);assert.equal(empty.baseline.available,false);assert.equal(model.applyStrategy(empty,'aso').pacing.dailyInstalls,1);
}
assert.equal(model.create({...project,live_metrics:{...project.live_metrics,source:'google_play'}}).baseline.available,false);
assert.equal(model.create({...project,live_metrics:{...project.live_metrics,boundary_available:false}}).baseline.available,false);
let deep=model.applyStrategy(model.create(project),'deep');assert.equal(deep.activity.screenshot,true);
deep=model.change(deep,'activity',false);assert.equal(deep.activity.screenshot,false);
const custom=model.applyStrategy(deep,'custom');assert.equal(custom.reviews.enabled,false);assert.equal(custom.activity.enabled,false);
assert.equal(model.change(custom,'daily',Infinity).pacing.dailyInstalls,1);
assert.equal(model.change(custom,'daily',0).pacing.dailyInstalls,1);
assert.equal(model.change(custom,'__proto__',1).strategy,'custom');
assert.equal(project.live_metrics.installs.per_day,10,'Draft never mutates project metrics');
console.log('Live draft: baseline, presets, exact allocations, minimum checkpoint, estimates and invalid input passed.');
