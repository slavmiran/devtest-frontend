/* Allowed source pools and preferred Live tracks. Keyword pools have no per-key quotas. */
(function(){
 'use strict';
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function create(p){
  var m=p.live_metrics,b=m&&m.installs&&m.installs.baseline,r=b?b.per_day:m&&m.installs&&m.installs.per_day,title=String(p.play_store_raw&&p.play_store_raw.title||p.name||p.package_name||'');
  return {schemaVersion:6,appId:Number(p.id||p.app_id),appTitle:title,template:'custom',name:'',icon:'rocket',source:'link',allowedSources:['link'],country:null,
   baseline:{available:!!(m&&m.source==='devtesthub_live'&&m.boundary_available!==false&&(!b||b.available)&&typeof r==='number'&&Number.isFinite(r)&&r>=0),perDay:r||0,days:b&&b.days||7},
   web:{query:title.slice(0,200),screenshot:null},keywords:[],nextKeywordId:1,
   retention:{days:14,min_days:14,max_days:14,checkpoint_mode:'count',checkpoint_count:2,checkpoints:[1,8,14]},activity:{enabled:false,screenshot:false,instructions:''},
   reviews:{enabled:false,delayDays:7,prompt:'soft'},
   volume:{paced:true,dailyInstalls:1,acquisitionDays:14,totalInstalls:14,paceVersion:2,pauseHours:24,rampDays:0,allowContractsDuringPause:true}};
 }
 function total(d){return d.volume.totalInstalls;}
 function allowed(d){return d.allowedSources||[d.source];}
 function counts(d){var c={link:0,web:0,keywords:0};c[allowed(d).length>1?'unknown':d.source]=total(d);return c;}
 function checkpoints(days,count,interval){if(interval)return Array.from(new Set(Array.from({length:Math.ceil(days/interval)},function(_,i){return 1+i*interval;}).filter(function(d){return d<=days;}).concat([days]))).sort(function(a,b){return a-b;});count=Math.min(days-1,count||3);return [1].concat(Array.from({length:count},function(_,i){return 1+Math.ceil((i+1)*(days-1)/count);}));}
 function applyStrategy(d,template){
  if(!['aso','retention','deep','custom'].includes(template))return d;
  var n=create({id:d.appId,name:d.appTitle});n.baseline=clone(d.baseline);n.corridor=d.corridor;n.thermalPhase=d.thermalPhase;n.autoDailyCost=d.autoDailyCost;n.template=template;
  var rate=d.baseline.available?d.baseline.perDay:0;
  if(template==='aso'){
   n.source='keywords';n.reviews.enabled=true;n.volume.rampDays=7;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.3)));
   var phrase=LiveCampaignKeywords.suggest({title:d.appTitle})[0]||LiveCampaignKeywords.clean(d.appTitle).slice(0,80);
   if(phrase)n=addKeyword(n,phrase);
  }else if(template==='retention'){
   n.retention={days:28,checkpoints:[1,7,14,21,28]};n.volume.rampDays=14;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.1)));
  }else if(template==='deep'){
   n.retention={days:7,checkpoints:[1,7]};n.activity={enabled:true,screenshot:true,instructions:''};n.volume.acquisitionDays=7;
  }
  n.allowedSources=[n.source];n.retention.min_days=n.retention.days;n.retention.max_days=n.retention.days;n.retention.checkpoint_mode='count';n.retention.checkpoint_count=n.retention.checkpoints.length-1;n.retention.checkpoints=checkpoints(n.retention.days,n.retention.checkpoint_count);n.volume.totalInstalls=n.volume.dailyInstalls*n.volume.acquisitionDays;return n;
 }
 function checkpointOptions(days){var list=[1,4,7,10,14,21,28,35].filter(function(n){return n<=days;});if(!list.includes(days))list.push(days);return list.sort(function(a,b){return a-b;});}
 function change(d,f,v){
  var n=clone(d);
  if(['daily','target','paced','pauseHours','rampDays','allowContractsDuringPause'].includes(f))n.volume.paceVersion=2;
  if(f.indexOf('plan:')===0)LiveManualPlan.change(n.volume,f,v);
  else if(f==='source'&&['link','web','keywords'].includes(v)){n.source=v;n.allowedSources=[v];}
  else if(f==='allowedSource'&&['link','web','keywords'].includes(v)){n.allowedSources=allowed(n).slice();if(n.allowedSources.includes(v)){if(n.allowedSources.length===1)return d;n.allowedSources=n.allowedSources.filter(function(s){return s!==v;});}else n.allowedSources.push(v);if(!n.allowedSources.includes(n.source))n.source=n.allowedSources[0];}
  else if(f==='preferredSource'&&allowed(n).includes(v))n.source=v;
  else if(f==='country'&&(v===null||typeof v==='string'&&/^[A-Z]{2}$/.test(v)))n.country=v;
  else if(f==='name'&&typeof v==='string'&&v.length<=80)n.name=v;
  else if(f==='webQuery'&&typeof v==='string'&&v.length<=200)n.web.query=v;
  else if(f==='instructions'&&typeof v==='string'&&v.length<=5000)n.activity.instructions=v;
  else if(['retention','minDays','maxDays','checkpointCount','checkpointInterval'].includes(f)&&Number.isInteger(v)){
   var r=n.retention;if(f==='retention'&&v>=3&&v<=60){r.days=v;r.min_days=Math.min(r.min_days||v,v);r.max_days=Math.max(r.max_days||v,v);}
   else if(f==='minDays'&&v>=3&&v<=60){r.min_days=v;r.max_days=Math.max(r.max_days||v,v);r.days=Math.max(r.days,v);}
   else if(f==='maxDays'&&v>=3&&v<=60){r.max_days=v;r.min_days=Math.min(r.min_days||v,v);r.days=Math.min(r.days,v);}
   else if(f==='checkpointCount'&&v>=1&&v<=59){r.checkpoint_mode='count';r.checkpoint_count=v;}
   else if(f==='checkpointInterval'&&v>=1&&v<=59){r.checkpoint_mode='interval';r.checkpoint_interval=v;}
   else return d;
   if(!r.checkpoint_mode||r.checkpoint_mode==='manual'){r.checkpoint_mode='count';r.checkpoint_count=Math.max(1,r.checkpoints.length-1);}
   r.checkpoints=checkpoints(r.days,r.checkpoint_count,r.checkpoint_mode==='interval'?r.checkpoint_interval:null);
   if(n.reviews.config){n.reviews.config.day=Math.min(n.reviews.config.day,r.max_days||r.days);n.reviews.delayDays=n.reviews.config.day;}
  }
  else if(f==='checkpoint'){
   if(v===1||!checkpointOptions(n.retention.days).includes(v))return d;
   var ds=n.retention.checkpoints;if(ds.includes(v)){if(ds.length===2)return d;ds.splice(ds.indexOf(v),1);}else ds.push(v);ds.sort(function(a,b){return a-b;});
  }else if(f==='activity'){n.activity.enabled=!!v;if(!v)n.activity.screenshot=false;}
  else if(f==='screenshot'&&n.activity.enabled)n.activity.screenshot=!!v;
  else if(f==='reviews')n.reviews.enabled=!!v;
  else if(f==='mode'&&['auto','manual','free'].includes(v)){n.volume.mode=v;n.volume.paced=v!=='free';}
  else if(f==='paced'){n.volume.paced=!!v;n.volume.mode=v?'manual':'free';}
  else if(f==='pauseHours'&&Number.isInteger(v)&&v>=6&&v<=48)n.volume.pauseHours=v;
  else if(f==='rampDays'&&[0,7,10,14].includes(v))n.volume.rampDays=v;
  else if(f==='allowContractsDuringPause')n.volume.allowContractsDuringPause=!!v;
  else if(f==='daily'&&Number.isInteger(v)&&v>=1&&v<=500)n.volume.dailyInstalls=v;
  else if(f==='period'&&Number.isInteger(v)&&v>=1&&v<=90)n.volume.acquisitionDays=v;
  else if(f==='target'&&Number.isInteger(v)&&v>=1&&v<=100000)n.volume.totalInstalls=v;
  else return d;
  return n;
 }
 function addKeyword(d,value){
  var phrase=LiveCampaignKeywords.clean(value);
  if(!phrase||phrase.length>80||/[\p{Cc}]/u.test(phrase)||d.keywords.length>=20||d.keywords.some(function(k){return LiveCampaignKeywords.identity(k.keyword)===LiveCampaignKeywords.identity(phrase);}))return d;
  var n=clone(d);n.keywords.push({id:'k'+n.nextKeywordId++,keyword:phrase,position:'',enabled:true,screenshot:null});return n;
 }
 function keyword(d,id,f,v){
  if(!d.keywords.some(function(k){return k.id===id;}))return d;
  var n=clone(d),row=n.keywords.find(function(k){return k.id===id;});
  if(f==='remove')n.keywords=n.keywords.filter(function(k){return k.id!==id;});
  else if(f==='position'&&typeof v==='string'&&v.length<=80)row.position=v;else return d;return n;
 }
 function media(d,key,value){var n=clone(d);if(key==='web')n.web.screenshot=value;else{var row=n.keywords.find(function(k){return 'keyword:'+k.id===key;});if(!row)return d;row.screenshot=value;}return n;}
 function quote(d){
  var installs=total(d),r=d.retention,schedule=['count','interval'].includes(r.checkpoint_mode)?checkpoints(r.max_days||r.days,r.checkpoint_count,r.checkpoint_mode==='interval'?r.checkpoint_interval:null):r.checkpoints,unit=(schedule.length-1)*10,distribution=counts(d),channels=['link','web','keywords','unknown'].map(function(k){return {key:k,count:distribution[k]||0,percent:installs?(distribution[k]||0)*100/installs:0};});
  return {available:installs>0,installs:installs,checkpointUnit:10,paidCheckpoints:schedule.length-1,perInstall:unit,totalCommitment:installs*unit,dailyCommitment:d.volume.paced?Math.round(unit*(d.volume.mode==='auto'?Math.min(installs,d.corridor&&d.corridor.U_opt||0):d.volume.manualPlan?Math.min(installs,d.manualRuntime&&d.manualPlanSaved===JSON.stringify(d.volume.manualPlan)?d.manualRuntime.quota:LiveManualPlan.quota(d.volume.manualPlan,1)):LiveCampaignPace.daily(d.volume))*100)/100:null,
   acquisitionDays:null,completionDays:null,channels:channels};
 }
 function valid(d,step){return (!window.LiveManualPlan||LiveManualPlan.valid(d.volume.manualPlan))&&!!d.source&&(!allowed(d).includes('web')||!!d.web.query.trim())&&(!allowed(d).includes('keywords')||d.keywords.length>0)&&d.retention.checkpoints.length>=2&&(step!==4||!!d.icon||!!d.name.trim());}
 async function definition(d,serialize){
  var sources=allowed(d),payload={name:d.name,icon:d.icon===null?null:d.icon||'rocket',template:d.template,source:d.source,retention:clone(d.retention),activity:clone(d.activity),reviews:clone(d.reviews),volume:clone(d.volume),web:{query:sources.includes('web')?d.web.query:'',screenshot:null},keywords:[]};
  if(d.allowedSources){payload.allowed_sources=sources.slice();payload.preferred_track={source:d.source,days:d.retention.days};}
  if(d.country)payload.country=d.country;
  payload.volume.totalInstalls=total(d);
  // Project control is saved separately in the same transaction. Legacy volume fields no longer gate intake.
  payload.volume.paced=false;payload.volume.paceVersion=2;delete payload.volume.mode;delete payload.volume.manualPlan;
  if(sources.includes('web')&&d.web.screenshot)payload.web.screenshot=await serialize('web',d.web.screenshot);
  if(sources.includes('keywords'))for(var k of d.keywords)payload.keywords.push({keyword:k.keyword,position:k.position,enabled:k.enabled!==false,screenshot:k.screenshot?await serialize('keyword:'+k.id,k.screenshot):null});
  return payload;
 }
 function fromCampaign(p,c,asset){
  var d=create(p),saved=clone(c.definition);['name','icon','template','source','retention','activity','reviews'].forEach(function(k){if(saved[k]!=null)d[k]=saved[k];});
  if(saved.icon===null)d.icon=null;
  d.country=saved.country||null;
  d.volume=Object.assign(d.volume,saved.volume);if(d.volume.paced&&saved.volume.paceVersion!==2)d.volume.totalInstalls=d.volume.dailyInstalls*d.volume.acquisitionDays;d.volume.paceVersion=saved.volume.paceVersion||1;
  d.allowedSources=saved.allowed_sources?saved.allowed_sources.slice():null;
  d.web={query:saved.web.query||d.appTitle,screenshot:asset(saved.web.asset_id)};
  d.keywords=(c.keywords||[]).map(function(k,i){return {id:'k'+(i+1),keyword:k.keyword,position:k.position||'',enabled:k.enabled!==false,screenshot:asset(k.asset_id)};});d.nextKeywordId=d.keywords.length+1;return d;
 }
 window.LiveCampaignDraft={create:create,fromCampaign:fromCampaign,applyStrategy:applyStrategy,counts:counts,allowed:allowed,checkpoints:checkpoints,change:change,addKeyword:addKeyword,keyword:keyword,media:media,quote:quote,valid:valid,definition:definition,checkpointOptions:checkpointOptions,maxKeywords:20,limit:100000};
})();
