/* One campaign = one traffic source. Keyword pools have no per-key quotas. */
(function(){
 'use strict';
 function clone(x){return JSON.parse(JSON.stringify(x));}
 function create(p){
  var m=p.live_metrics,r=m&&m.installs&&m.installs.per_day,title=String(p.play_store_raw&&p.play_store_raw.title||p.name||p.package_name||'');
  return {schemaVersion:4,appId:Number(p.id||p.app_id),appTitle:title,template:'custom',name:'',source:'link',
   baseline:{available:!!(m&&m.source==='devtesthub_live'&&m.boundary_available!==false&&typeof r==='number'&&Number.isFinite(r)&&r>=0),perDay:r||0},
   web:{query:title.slice(0,200),screenshot:null},keywords:[],nextKeywordId:1,
   retention:{days:14,checkpoints:[1,7,14]},activity:{enabled:false,screenshot:false,instructions:''},
   reviews:{enabled:false,delayDays:7,prompt:'soft'},
   volume:{paced:true,dailyInstalls:1,acquisitionDays:14,totalInstalls:14,paceVersion:2,pauseHours:24,rampDays:0,allowContractsDuringPause:true}};
 }
 function total(d){return d.volume.totalInstalls;}
 function counts(d){var c={link:0,web:0,keywords:0};c[d.source]=total(d);return c;}
 function applyStrategy(d,template){
  if(!['aso','retention','deep','custom'].includes(template))return d;
  var n=create({id:d.appId,name:d.appTitle});n.baseline=clone(d.baseline);n.template=template;
  var rate=d.baseline.available?d.baseline.perDay:0;
  if(template==='aso'){
   n.source='keywords';n.reviews.enabled=true;n.volume.rampDays=7;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.3)));
   var phrase=LiveCampaignKeywords.suggest({title:d.appTitle})[0]||LiveCampaignKeywords.clean(d.appTitle).slice(0,80);
   if(phrase)n=addKeyword(n,phrase);
  }else if(template==='retention'){
   n.retention={days:30,checkpoints:[1,7,14,21,30]};n.volume.rampDays=14;n.volume.dailyInstalls=Math.min(500,Math.max(1,Math.round(rate*.1)));
  }else if(template==='deep'){
   n.retention={days:7,checkpoints:[1,7]};n.activity={enabled:true,screenshot:true,instructions:''};n.volume.acquisitionDays=7;
  }
  n.volume.totalInstalls=n.volume.dailyInstalls*n.volume.acquisitionDays;return n;
 }
 function checkpointOptions(days){var list=[1,4,7,10,14,21,28,35].filter(function(n){return n<=days;});if(!list.includes(days))list.push(days);return list.sort(function(a,b){return a-b;});}
 function change(d,f,v){
  var n=clone(d);
  if(f==='source'&&['link','web','keywords'].includes(v))n.source=v;
  else if(f==='name'&&typeof v==='string'&&v.length<=80)n.name=v;
  else if(f==='webQuery'&&typeof v==='string'&&v.length<=200)n.web.query=v;
  else if(f==='instructions'&&typeof v==='string'&&v.length<=5000)n.activity.instructions=v;
  else if(f==='retention'&&Number.isInteger(v)&&v>=7&&v<=35)n.retention={days:v,checkpoints:checkpointOptions(v)};
  else if(f==='checkpoint'){
   if(v===1||!checkpointOptions(n.retention.days).includes(v))return d;
   var ds=n.retention.checkpoints;if(ds.includes(v)){if(ds.length===2)return d;ds.splice(ds.indexOf(v),1);}else ds.push(v);ds.sort(function(a,b){return a-b;});
  }else if(f==='activity'){n.activity.enabled=!!v;if(!v)n.activity.screenshot=false;}
  else if(f==='screenshot'&&n.activity.enabled)n.activity.screenshot=!!v;
  else if(f==='reviews')n.reviews.enabled=!!v;
  else if(f==='paced')n.volume.paced=!!v;
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
  var n=clone(d);n.keywords.push({id:'k'+n.nextKeywordId++,keyword:phrase,position:'',screenshot:null});return n;
 }
 function keyword(d,id,f,v){
  if(!d.keywords.some(function(k){return k.id===id;}))return d;
  var n=clone(d),row=n.keywords.find(function(k){return k.id===id;});
  if(f==='remove')n.keywords=n.keywords.filter(function(k){return k.id!==id;});
  else if(f==='position'&&typeof v==='string'&&v.length<=80)row.position=v;else return d;return n;
 }
 function media(d,key,value){var n=clone(d);if(key==='web')n.web.screenshot=value;else{var row=n.keywords.find(function(k){return 'keyword:'+k.id===key;});if(!row)return d;row.screenshot=value;}return n;}
 function quote(d){
  var installs=total(d),unit=(d.retention.checkpoints.length-1)*10,channels=['link','web','keywords'].map(function(k){return {key:k,count:k===d.source?installs:0,percent:k===d.source?100:0};});
  return {available:installs>0,installs:installs,checkpointUnit:10,perInstall:unit,totalCommitment:installs*unit,dailyCommitment:d.volume.paced?Math.round(unit*LiveCampaignPace.daily(d.volume)*100)/100:null,
   acquisitionDays:null,completionDays:null,channels:channels};
 }
 function valid(d,step){return !!d.source&&(d.source!=='web'||!!d.web.query.trim())&&(d.source!=='keywords'||d.keywords.length>0)&&d.retention.checkpoints.length>=2;}
 async function definition(d,serialize){
  var payload={name:d.name,template:d.template,source:d.source,retention:clone(d.retention),activity:clone(d.activity),reviews:clone(d.reviews),volume:clone(d.volume),web:{query:d.source==='web'?d.web.query:'',screenshot:null},keywords:[]};
  payload.volume.totalInstalls=total(d);
  if(d.source==='web'&&d.web.screenshot)payload.web.screenshot=await serialize('web',d.web.screenshot);
  if(d.source==='keywords')for(var k of d.keywords)payload.keywords.push({keyword:k.keyword,position:k.position,screenshot:k.screenshot?await serialize('keyword:'+k.id,k.screenshot):null});
  return payload;
 }
 window.LiveCampaignDraft={create:create,applyStrategy:applyStrategy,counts:counts,change:change,addKeyword:addKeyword,keyword:keyword,media:media,quote:quote,valid:valid,definition:definition,checkpointOptions:checkpointOptions,maxKeywords:20,limit:100000};
})();
