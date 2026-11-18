/* Allowed source pools and preferred Live tracks. Keyword pools have no per-key quotas. */
(function(){
 'use strict';
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function create(p){
  var m=p.live_metrics,b=m&&m.installs&&m.installs.baseline,r=b?b.per_day:m&&m.installs&&m.installs.per_day,title=String(p.play_store_raw&&p.play_store_raw.title||p.name||p.package_name||'');
  return {schemaVersion:6,appId:Number(p.id||p.app_id),appTitle:title,template:'custom',name:'',icon:'rocket',source:'link',allowedSources:['link'],country:null,
   baseline:{available:!!(m&&m.source==='devtesthub_live'&&m.boundary_available!==false&&(!b||b.available)&&typeof r==='number'&&Number.isFinite(r)&&r>=0),perDay:r||0,days:b&&b.days||7},
   web:{query:title.slice(0,200),screenshot:null,mode:'web_brand'},
   developerName:String(p.play_store_raw&&(p.play_store_raw.developer||p.play_store_raw.developer_name)||''),keywords:[],nextKeywordId:1,
   retention:{days:14,min_days:7,max_days:14,checkpoint_mode:'count',checkpoint_count:2,checkpoints:[1,8,14]},activity:{enabled:false,screenshot:false,instructions:''},
   reviews:{enabled:false,delayDays:7,prompt:'soft'},contracts:{enabled:false,limit:10,daily_rate_bust:10,kd_rate_bust:10,source_bonus_bust:{link:0,web:20,keywords:40},scenario_bonus_bust:30,required_review_bonus_bust:70,payout_mode:'daily'},
   volume:{limit_mode:'budget',paced:true,dailyInstalls:1,acquisitionDays:14,totalInstalls:14,paceVersion:2,pauseHours:24,rampDays:0,allowContractsDuringPause:true},routePriority:false};
 }
 function total(d){return d.volume.totalInstalls;}
 function allowed(d){return d.allowedSources||[d.source];}
 function brandQuery(d){
  var name=Array.from(d.appTitle.trim().replace(/"/g,'')).slice(0,115).join('');
  var developer=Array.from((d.developerName||'').trim()).slice(0,55).join('');
  return 'скачать "'+name+'"'+(developer?' '+developer:'')+' Google Play';
 }
 function counts(d){var c={link:0,web:0,keywords:0};c[allowed(d).length>1?'unknown':d.source]=total(d);return c;}
 function checkpoints(days,count,interval){if(interval)return Array.from(new Set(Array.from({length:Math.ceil(days/interval)},function(_,i){return 1+i*interval;}).filter(function(d){return d<=days;}).concat([days]))).sort(function(a,b){return a-b;});count=Math.min(days-1,count||3);return [1].concat(Array.from({length:count},function(_,i){return 1+Math.ceil((i+1)*(days-1)/count);}));}
 function applyStrategy(d,template){
  if(!['aso','retention','deep','custom'].includes(template))return d;
  var n=create({id:d.appId,name:d.appTitle});n.developerName=d.developerName;n.baseline=clone(d.baseline);n.corridor=d.corridor;n.thermalPhase=d.thermalPhase;n.autoDailyCost=d.autoDailyCost;n.template=template;
  var rate=d.baseline.available?d.baseline.perDay:0;
  if(template==='aso'){
   n.source='keywords';n.volume.rampDays=7;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.3)));
   var phrase=LiveCampaignKeywords.suggest({title:d.appTitle})[0]||LiveCampaignKeywords.clean(d.appTitle).slice(0,80);
   if(phrase)n=addKeyword(n,phrase);
  }else if(template==='retention'){
   n.retention={days:28,min_days:14,max_days:35,checkpoints:[1,7,14,21,28]};n.volume.rampDays=14;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.1)));
  }else if(template==='deep'){
   n.retention={days:7,min_days:7,max_days:14,checkpoints:[1,7]};n.activity={enabled:true,screenshot:true,instructions:''};n.volume.acquisitionDays=7;
  }
  n.allowedSources=[n.source];n.retention.checkpoint_mode='count';n.retention.checkpoint_count=n.retention.checkpoints.length-1;n.retention.checkpoints=checkpoints(n.retention.days,n.retention.checkpoint_count);n.volume.totalInstalls=n.volume.dailyInstalls*n.volume.acquisitionDays;return n;
 }
 function checkpointOptions(days){var list=[1,4,7,10,14,21,28,35].filter(function(n){return n<=days;});if(!list.includes(days))list.push(days);return list.sort(function(a,b){return a-b;});}
 function change(d,f,v){
  var n=clone(d);
  if(['daily','target','paced','pauseHours','rampDays','allowContractsDuringPause'].includes(f))n.volume.paceVersion=2;
  if(f.indexOf('plan:')===0)LiveManualPlan.change(n.volume,f,v,n.corridor);
  else if(f==='source'&&['link','web','keywords'].includes(v)){n.source=v;n.allowedSources=[v];}
  else if(f==='allowedSource'&&['link','web','keywords'].includes(v)){n.allowedSources=allowed(n).slice();if(n.allowedSources.includes(v)){if(n.allowedSources.length===1)return d;n.allowedSources=n.allowedSources.filter(function(s){return s!==v;});}else n.allowedSources.push(v);if(!n.allowedSources.includes(n.source))n.source=n.allowedSources[0];}
  else if(f==='preferredSource'&&allowed(n).includes(v))n.source=v;
  else if(f==='country'&&(v===null||typeof v==='string'&&/^[A-Z]{2}$/.test(v)))n.country=v;
  else if(f==='name'&&typeof v==='string'&&v.length<=80)n.name=v;
  else if(f==='webQuery'&&typeof v==='string'&&v.length<=200)n.web.query=v;
  else if(f==='webMode'&&['web_brand','web_custom'].includes(v))n.web.mode=v;
  else if(f==='instructions'&&typeof v==='string'&&v.length<=5000)n.activity.instructions=v;
  else if(f==='scenarioTitle'&&typeof v==='string'&&v.length<=80)n.activity.title=v;
  else if(f==='scenarioLimit'&&(v===null||Number.isInteger(v)&&v>=1&&v<=100000))n.activity.execution_limit=v;
  else if(['retention','minDays','maxDays','checkpointCount','checkpointInterval'].includes(f)&&Number.isInteger(v)){
   var r=n.retention;if(f==='retention'&&v>=(r.min_days||r.days)&&v<=(r.max_days||r.days)){r.days=v;}
   else if(f==='minDays'&&v>=3&&v<=60){r.min_days=v;r.max_days=Math.max(r.max_days||v,v);r.days=Math.max(r.days,v);}
   else if(f==='maxDays'&&v>=3&&v<=60){r.max_days=v;r.min_days=Math.min(r.min_days||v,v);r.days=Math.min(r.days,v);}
   else if(f==='checkpointCount'&&v>=1&&v<=59){r.checkpoint_mode='count';r.checkpoint_count=v;}
   else if(f==='checkpointInterval'&&v>=1&&v<=59){r.checkpoint_mode='interval';r.checkpoint_interval=v;}
   else return d;
   if(!r.checkpoint_mode||r.checkpoint_mode==='manual'){r.checkpoint_mode='count';r.checkpoint_count=Math.max(1,r.checkpoints.length-1);}
   r.checkpoints=checkpoints(r.days,r.checkpoint_count,r.checkpoint_mode==='interval'?r.checkpoint_interval:null);
   if(n.impression?.day)n.impression.day=Math.min(n.impression.day,r.max_days||r.days);
   if(n.activity.open_day)n.activity.open_day=Math.min(n.activity.open_day,r.min_days||r.days);
  }
  else if(f==='checkpoint'){
   if(v===1||!checkpointOptions(n.retention.days).includes(v))return d;
   var ds=n.retention.checkpoints;if(ds.includes(v)){if(ds.length===2)return d;ds.splice(ds.indexOf(v),1);}else ds.push(v);ds.sort(function(a,b){return a-b;});
  }else if(f==='limit_mode'&&['budget','installs'].includes(v))n.volume.limit_mode=v;else if(f==='activity'){n.activity.enabled=!!v;n.activity.screenshot=!!v&&n.activity.proof_mode!=='video';}
  else if(f==='screenshot'&&n.activity.enabled)n.activity.screenshot=!!v;
  else if(f==='reviews')n.reviews.enabled=!!v;
  else if(f==='routePriority')n.routePriority=!!v;
  else if(f==='mode'&&['auto','manual','free'].includes(v)){n.volume.mode=v;n.volume.paced=v!=='free';if(v!=='manual'&&!LiveManualPlan.valid(n.volume.manualPlan)){var previous;try{previous=JSON.parse(n.manualPlanSaved||'null');}catch(_){}n.volume.manualPlan=LiveManualPlan.valid(previous)?previous:null;}if(v==='manual'&&!n.volume.manualPlan)n.volume.manualPlan=LiveManualPlan.create(n.volume,n.corridor);}
  else if(f==='corridorProfile'&&['standard','expanded','conservative'].includes(v))n.volume.corridorProfile=v;
  else if(f==='contractPauseRule'){n.volume.allowContractsDuringPause=v!=='off';n.volume.contractsDuringPauseLimit=['2','5'].includes(v)?Number(v):null;}
  else if(f==='contractsDuringPauseLimit'&&[0,2,5].includes(v))n.volume.contractsDuringPauseLimit=v||null;
  else if(f==='dailyPlan'){n.volume.mode='manual';n.volume.paced=true;n.volume.manualPlan=LiveManualPlan.create(n.volume,n.corridor);}
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
  else if(f==='position'&&typeof v==='string'&&v.length<=80)row.position=v;
  else if(f==='geo_countries'&&Array.isArray(v))row.geo_countries=v;
  else if(f==='is_fallback'&&typeof v==='boolean')row.is_fallback=v;
  else return d;return n;
 }
 function media(d,key,value){var n=clone(d);if(key.startsWith('step:'))LiveScenarioEditor.set(n.activity,key,value);else if(key==='web')n.web.screenshot=value;else if(key.startsWith('scenario:')){n.activity.screenshots=n.activity.screenshots||[];n.activity.screenshots[Number(key.split(':')[1])]=value;}else{var row=n.keywords.find(function(k){return 'keyword:'+k.id===key;});if(!row)return d;row.screenshot=value;}return n;}
 function quote(d){
  var installs=d.volume.limit_mode==='budget'?Infinity:total(d),r=d.retention,schedule=['count','interval'].includes(r.checkpoint_mode)?checkpoints(r.max_days||r.days,r.checkpoint_count,r.checkpoint_mode==='interval'?r.checkpoint_interval:null):r.checkpoints,unit=d.contracts&&d.contracts.enabled&&window.LiveContracts?LiveContracts.range(d).max:(schedule.length-1)*10,distribution=counts(d),channels=['link','web','keywords','unknown'].map(function(k){return {key:k,count:distribution[k]||0,percent:installs?(distribution[k]||0)*100/installs:0};});
  var goal=d.volume.mode==='auto'?Math.min(installs,d.corridor&&d.corridor.U_opt||0):d.volume.manualPlan?Math.min(installs,LiveManualPlan.preview(d).values[0]):LiveCampaignPace.daily(d.volume);
  if(Number.isFinite(d.paceOwnCapacity))goal=Math.min(goal,d.paceOwnCapacity);
  return {available:installs>0,installs:installs,checkpointUnit:10,paidCheckpoints:schedule.length-1,perInstall:unit,totalCommitment:installs*unit,dailyCommitment:d.volume.paced?Math.round(unit*goal*100)/100:null,
   acquisitionDays:null,completionDays:null,channels:channels};
 }
 function valid(d,step){return (!window.LiveManualPlan||LiveManualPlan.valid(d.volume.manualPlan))&&!!d.source&&(!allowed(d).includes('web')||d.web.mode==='web_brand'||!!d.web.query.trim())&&(!allowed(d).includes('keywords')||d.keywords.some(function(k){return k.enabled!==false&&!k.is_fallback;}))&&d.retention.checkpoints.length>=2&&(step<3||(!window.LiveScenarioEditor||LiveScenarioEditor.valid(d.activity,d.retention.min_days||d.retention.days))&&(!!d.icon||!!d.name.trim()));}
 async function definition(d,serialize){
  var sources=allowed(d),web=sources.includes('web'),custom=web&&d.web.mode!=='web_brand';
  var payload={name:d.name,icon:d.icon===null?null:d.icon||'rocket',template:d.template,source:d.source,retention:clone(d.retention),activity:clone(d.activity),reviews:{enabled:false,delayDays:7,prompt:'soft'},volume:clone(d.volume),web:{query:custom?d.web.query:'',screenshot:null},keywords:[]};
  if(web)payload.web.mode=d.web.mode||'web_custom';
  if(d.allowedSources){payload.allowed_sources=sources.slice();payload.preferred_track={source:d.source,days:d.retention.days};}
  if(d.contracts)payload.contracts=clone(d.contracts);
  payload.impression_mutual=!!d.impression_mutual;
  if(d.country)payload.country=d.country;
  payload.volume.totalInstalls=total(d);if(window.LiveScenarioEditor&&d.activity.steps)payload.activity.steps=await LiveScenarioEditor.serialize(d.activity,serialize);
  if(d.activity.screenshots){payload.activity.screenshots=[];for(var i=0;i<d.activity.screenshots.length;i++)if(d.activity.screenshots[i])payload.activity.screenshots.push(await serialize('scenario:'+i,d.activity.screenshots[i]));}
  // Project control is saved separately in the same transaction. Legacy volume fields no longer gate intake.
  payload.volume.paced=false;payload.volume.paceVersion=2;['mode','manualPlan','dailyCampaignCaps','contractsDuringPauseLimit','corridorProfile'].forEach(function(k){delete payload.volume[k];});
  if(custom&&d.web.screenshot)payload.web.screenshot=await serialize('web',d.web.screenshot);
  if(sources.includes('keywords'))for(var k of d.keywords)payload.keywords.push({keyword:k.keyword,position:k.position,enabled:k.enabled!==false,geo_countries:k.geo_countries||[],is_fallback:!!k.is_fallback,screenshot:k.screenshot?await serialize('keyword:'+k.id,k.screenshot):null});
  return payload;
 }
 function fromCampaign(p,c,asset){
  var d=create(p),saved=clone(c.definition);d.impression_mutual=!!saved.impression_mutual||saved.impression?.mode==='mutual';['name','icon','template','source','retention','activity','impression'].forEach(function(k){if(saved[k]!=null)d[k]=saved[k];});
  if(saved.preferred_track){
   var track=saved.preferred_track,r=d.retention;
   if((saved.allowed_sources||[saved.source]).includes(track.source))d.source=track.source;
   if(track.days>=(r.min_days||r.days)&&track.days<=(r.max_days||r.days)&&track.days!==r.days)
    d=change(d,'retention',track.days);
  }
  if(saved.icon===null)d.icon=null;
  d.routePriority=c.route_priority===true;
  d.parentCampaignId=c.parent_campaign_id||null;
  if(window.LiveScenarioEditor)LiveScenarioEditor.load(d.activity,asset);d.activity.screenshots=(saved.activity.screenshots||[]).map(function(img){return asset(img.asset_id);});
  d.country=saved.country||null;if(saved.contracts)d.contracts=Object.assign(d.contracts,saved.contracts);
  d.volume=Object.assign(d.volume,{limit_mode:'installs'},saved.volume);if(d.volume.paced&&saved.volume.paceVersion!==2)d.volume.totalInstalls=d.volume.dailyInstalls*d.volume.acquisitionDays;d.volume.paceVersion=saved.volume.paceVersion||1;
  d.allowedSources=saved.allowed_sources?saved.allowed_sources.slice():null;
  d.web={query:saved.web.query||d.appTitle,screenshot:asset(saved.web.asset_id),mode:saved.web.mode||'web_custom'};
  d.keywords=(c.keywords||[]).map(function(k,i){return {id:'k'+(i+1),keyword:k.keyword,position:k.position||'',enabled:k.enabled!==false,geo_countries:k.geo_countries||[],is_fallback:!!k.is_fallback,screenshot:asset(k.asset_id)};});d.nextKeywordId=d.keywords.length+1;return d;
 }
 window.LiveCampaignDraft={create:create,fromCampaign:fromCampaign,applyStrategy:applyStrategy,counts:counts,allowed:allowed,brandQuery:brandQuery,checkpoints:checkpoints,change:change,addKeyword:addKeyword,keyword:keyword,media:media,quote:quote,valid:valid,definition:definition,checkpointOptions:checkpointOptions,maxKeywords:20,limit:100000};
})();
