/* Shared project policy and distribution: used by the section sheet and wizard step 4. */
(function(){
 'use strict';var session=null;
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 var fields=['manualPlan','mode','paced','dailyInstalls','pauseHours','rampDays','allowContractsDuringPause'];
 function policy(value){var p=value||{},mode=['auto','manual','free'].includes(p.mode)?p.mode:p.paced?'manual':'free';return {manualPlan:p.manualPlan?JSON.parse(JSON.stringify(p.manualPlan)):null,mode:mode,paced:mode!=='free',dailyInstalls:Number(p.dailyInstalls)||4,pauseHours:Number(p.pauseHours)||24,rampDays:Number(p.rampDays)||0,allowContractsDuringPause:p.allowContractsDuringPause!==false};}
 function setup(d,control,rows,editing){
  var c=control||{},p=policy(c.policy);fields.forEach(function(k){d.volume[k]=p[k];});d.volume.paceVersion=2;d.corridor=c.corridor||null;d.autoDailyCost=Number(c.auto_daily_cost_bust)||0;d.manualRuntime=c.manual_runtime||null;d.manualPlanSaved=JSON.stringify(p.manualPlan);
  return {revision:c.revision,policy:p,allocations:(c.allocations||[]).map(function(a){return Object.assign({},a);}),ownId:editing?editing.id:null,ownLimit:editing&&editing.cycle_limit||null,rows:rows||[]};
 }
 function payload(d,c){return {revision:c.revision,policy:policy(d.volume),allocations:c.allocations.filter(function(a){return a.campaign_id!==c.ownId&&(a.status==='active'||a.kind==='closed_bridge'||a.contracts_enabled);}).map(function(a){return {campaign_id:a.campaign_id,limit:a.limit==null?null:Number(a.limit)};}),own_limit:c.ownLimit==null?null:Number(c.ownLimit)};}
 function title(a){return a.kind==='closed_bridge'?t('lcBridge'):a.name||t({keywords:'lcwKeywords',web:'lcwWeb',link:'lcwLink'}[a.source]||'lcCampaign');}
 function allocationSummary(d,all){var active=all.filter(function(a){return a.own||a.status==='active'||a.contracts_enabled;}),sum=active.reduce(function(n,a){return n+(Number(a.limit)||0);},0),unlimited=active.some(function(a){return a.limit==null;}),p=d.volume.manualPlan,quota=p?d.manualRuntime&&d.manualPlanSaved===JSON.stringify(p)?d.manualRuntime.quota:LiveManualPlan.quota(p,1):d.volume.dailyInstalls;return {warn:d.volume.paced&&!unlimited&&sum!==quota,text:t(!d.volume.paced?'lpcCapsDormant':unlimited?'lpcCapsShared':sum<quota?'lpcUnusedCapacity':sum>quota?'lpcCompetitiveCaps':'lpcBalancedCaps',{n:Math.max(0,quota-sum),sum:sum,total:quota})};}
 function rows(d,c,includeOwn){var all=c.allocations.filter(function(a){return a.campaign_id!==c.ownId&&(a.status==='active'||a.kind==='closed_bridge');});if(includeOwn)all.push({campaign_id:'own',name:d.name||t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[d.source]),limit:c.ownLimit,own:true});return all;}
 function distribution(d,c,controls,includeOwn){
  if(d.volume.mode==='auto')return '<p class="gtw-helper-text">'+e(t('lpcAutoShared'))+'</p>';
  if(!c)return '<p class="lc-note" role="status">'+e(t('lpcLoading'))+'</p>';
  var all=rows(d,c,includeOwn),note=allocationSummary(d,all);
  return '<section class="lcw-panel lpc-distribution"><h3>'+e(t('lpcDistribution'))+'</h3><p class="gtw-helper-text">'+e(t('lpcDistributionHint'))+'</p>'+all.map(function(a){var key=a.own?'own':a.campaign_id;return '<div class="lpc-allocation"><span>'+e(title(a))+(a.own?'<small>'+e(t('lpcThisCampaign'))+'</small>':a.status!=='active'&&!a.contracts_enabled?'<small>'+e(t('lcOff'))+'</small>':'')+'</span><div><button class="meta-chip lcw-chip" type="button" data-lpc-unlimited="'+key+'" aria-pressed="'+(a.limit==null)+'">'+e(t('lpcUnlimited'))+'</button>'+(a.limit==null?'<button type="button" class="meta-chip lcw-chip" data-lpc-cap="'+key+'">'+e(t('lpcSetCap'))+'</button>':controls.counter('cap:'+key,Number(a.limit),1,500))+'</div></div>';}).join('')+'<p data-lpc-allocation-summary class="gtw-helper-text'+(note.warn?' is-warn':'')+'">'+e(note.text)+'</p></section>';
 }
 function refresh(root,d,c,includeOwn){LiveCampaignPaceView.refreshWarning(root,d);var save=root.querySelector('[data-lpc-save]');if(save)save.disabled=!LiveManualPlan.valid(d.volume.manualPlan)||!!root.querySelector('[aria-invalid="true"]');if(!c)return;var note=allocationSummary(d,rows(d,c,includeOwn)),node=root.querySelector('[data-lpc-allocation-summary]');if(node){node.textContent=note.text;node.classList.toggle('is-warn',note.warn);}}
 function change(c,key,value){if(key==='own')c.ownLimit=value;else{var a=c.allocations.find(function(a){return String(a.campaign_id)===String(key);});if(a)a.limit=value;}}
 function status(p,pace,rows){
  if(!rows)return {key:'lpcStatusLoading',tone:'neutral'};
  var active=rows.some(function(c){return c.status==='active'||c.contracts&&c.contracts.enabled;});
  if(!active)return {key:'lpcStatusIdle',tone:'neutral'};
  if(pace&&Date.parse(pace.pause_until)>Date.now())return {key:'lpcStatusPaused',tone:'paused',vars:{time:new Date(pace.pause_until).toLocaleTimeString(window.lang==='ru'?'ru-RU':'en-US',{hour:'2-digit',minute:'2-digit'})}};
  if(pace&&pace.accepting===false||!pace&&p.is_accepting_new_testers===false)return {key:'lpcStatusClosed',tone:'neutral'};
  if(pace&&pace.paced&&pace.needed>0&&Date.now()-Date.parse(pace.cycle_started_at)>18*3600000)return {key:'lpcStatusDeficit',tone:'warning',vars:{n:pace.needed}};
  if(pace&&pace.paced)return {key:'lpcStatusOpen',tone:'active',vars:{used:pace.admitted||0,total:pace.quota}};
  return {key:'lpcStatusFree',tone:'active'};
 }
 function statusHTML(p){var s=status(p,p.live_pace,p.live_campaign_rows);return '<span class="live-project-status is-'+s.tone+'" data-live-project-status="'+Number(p.id||p.app_id)+'">'+e(t(s.key,s.vars))+'</span>';}
 function updateStatus(p,pace,rows){p.live_pace=pace;p.live_campaign_rows=rows;document.querySelectorAll('[data-live-project-status="'+Number(p.id||p.app_id)+'"]').forEach(function(n){n.outerHTML=statusHTML(p);});}
 function close(){if(!session)return;if(session.busy)return;var s=session;session=null;s.layer.remove();document.body.style.overflow=s.overflow;if(s.focus&&s.focus.isConnected)s.focus.focus({preventScroll:true});if(window.syncTelegramBackButton)window.syncTelegramBackButton();}
 function open(adapter,trigger,mode){
  if(session||!adapter.get())return;var data=adapter.get(),d=LiveCampaignDraft.create(adapter.project?adapter.project():{id:adapter.appId}),c=setup(d,data,adapter.rows(),null),layer=document.createElement('div');
  if(mode==='auto')d=LiveCampaignDraft.change(d,'mode','auto');
  layer.id='live-project-pace-modal';layer.className='modal-overlay active project-instructions-overlay';layer.innerHTML='<section class="project-instructions-sheet lpc-pace-sheet" role="dialog" aria-modal="true" aria-labelledby="lpc-pace-title"><div class="project-instructions-sheet__handle"></div><header class="project-instructions-sheet__head"><h3 id="lpc-pace-title">'+e(t('lpcPaceTitle'))+'</h3><button type="button" class="meta-chip" data-lpc-close aria-label="'+e(t('lcClose'))+'">×</button></header><div data-lpc-content></div><p class="project-instructions-error" data-lpc-error role="alert" hidden></p><button type="button" class="btn btn-primary" data-lpc-save>'+e(t('lpcApply'))+'</button></section>';
  session={layer:layer,draft:d,control:c,adapter:adapter,focus:trigger,overflow:document.body.style.overflow,busy:false,request:null};document.body.style.overflow='hidden';document.body.appendChild(layer);
  function render(){layer.querySelector('[data-lpc-content]').innerHTML=LiveCampaignPaceView.policy(d,LiveCampaignWizardView.controls)+distribution(d,c,LiveCampaignWizardView.controls,false);}
  function edit(field,value){if(field.indexOf('cap:')===0)change(c,field.slice(4),value);else{d=LiveCampaignDraft.change(d,field,value);session.draft=d;}session.request=null;refresh(layer,d,c,false);var chart=layer.querySelector('[data-lcw-pace-preview]');if(chart)chart.innerHTML=LiveCampaignPaceView.preview(d);}
  layer.onclick=async function(event){var s=session;if(!s||s.busy)return;if(!adapter.get())return close();var b=event.target.closest('button');if(event.target===layer||b&&b.hasAttribute('data-lpc-close'))return close();if(!b||b.disabled)return;
   if(b.dataset.lcwAction==='learn')return LiveCampaignLearning.open('pace',b);
   if(b.hasAttribute('data-lpc-unlimited')){change(c,b.dataset.lpcUnlimited,null);s.request=null;render();return;}
   if(b.hasAttribute('data-lpc-cap')){change(c,b.dataset.lpcCap,1);s.request=null;render();return;}
   if(b.dataset.lcwField){var v=b.dataset.value;edit(b.dataset.lcwField,(b.dataset.lcwField==='mode'||LiveManualPlan.textField(b.dataset.lcwField))?v:v==='true'?true:v==='false'?false:Number(v));render();return;}
   if(b.hasAttribute('data-lpc-save')){
    if(layer.querySelector('[aria-invalid="true"]'))return;s.busy=true;b.disabled=true;s.request=s.request||LiveCampaigns.requestKey();
    try{var ok=await adapter.save(payload(d,c),s.request);s.busy=false;if(ok)close();else{var err=layer.querySelector('[data-lpc-error]');err.hidden=false;err.textContent=t('lpcSaveConflict');}}
    finally{if(session===s){s.busy=false;b.disabled=false;}}return;
   }
  };
  layer.oninput=function(event){var n=event.target,f=n.dataset.lcwInput;if(!f||!session||session.busy)return;var v=Number(n.value),ok=/^\d+$/.test(n.value)&&Number.isInteger(v)&&v>=Number(n.min)&&v<=Number(n.max);n.setAttribute('aria-invalid',String(!ok));if(!ok)return;edit(f,v);if(f==='pauseHours')LiveCampaignPaceView.refreshHours(layer,d.volume);var box=n.closest('.lcw-counter');if(box){var buttons=box.querySelectorAll('button');buttons[0].dataset.value=v-1;buttons[0].disabled=v<=Number(n.min);buttons[1].dataset.value=v+1;buttons[1].disabled=v>=Number(n.max);}};
  layer.onkeydown=function(event){if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){var nodes=Array.from(layer.querySelectorAll('button:not(:disabled),input:not(:disabled)')).filter(function(n){return n.getClientRects().length;});if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}}};
  render();layer.querySelector('[data-lpc-close]').focus();if(window.syncTelegramBackButton)window.syncTelegramBackButton();
 }
 window.LiveProjectControl={policy:policy,setup:setup,payload:payload,distribution:distribution,refresh:refresh,change:change,status:status,statusHTML:statusHTML,updateStatus:updateStatus,open:open,close:close};
})();
