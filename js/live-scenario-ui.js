/* Branches use the ordinary campaign editor and the existing Feedback Center. */
(function(){
 'use strict';var U=LiveMarketUI,t=U.t,e=U.e,items=[],identity='',loading=false;
 function info(c) {
  var d=c.definition||{}, a=d.activity||{}, stats=c.scenario||{};
  if(!a.enabled) return '';
  var views=Number(stats.scenario_views_count)||0, claims=Number(stats.claims)||0;
  var pct=views?Math.round(100*claims/views):0;
  return '<details class="lr-scenario-funnel"><summary>'+e(t('lrScenarioProgress',{
   n:stats.completed||0,limit:a.execution_limit||t('lrUnlimited'),held:stats.reserved||0
  }))+'</summary><p>'+e(t('growthFunnel',{views:views,claims:claims,pct:pct}))+'</p>'+
   (views>=10&&claims/views<.15?'<p class="lr-funnel-hint">'+e(t('growthFunnelHint'))+'</p>':'')+'</details>';
 }
 async function create(parent,app,maxDay){var who=U.auth(),request=LiveCampaigns.requestKey(),activity={enabled:true,screenshot:true,instructions:'',steps:[]},media=LiveCampaignWizardMedia.create(),layer=U.sheet(t('lrAddScenario'),'<label>'+e(t('lrScenarioTitle'))+'<input class="gtw-input" data-lrs-title maxlength="80"></label><div data-lrs-editor></div><label>'+e(t('lrScenarioLimit'))+'<input class="gtw-input" data-lrs-limit type="number" min="1" max="100000" placeholder="'+e(t('lrUnlimited'))+'"></label><button class="lm-action lm-action-primary" data-lrs-save>'+e(t('lrScenarioCreate'))+'</button><p class="lm-error" role="alert"></p>',{onclose:function(){media.clear();}});function paint(){layer.querySelector('[data-lrs-editor]').innerHTML=LiveScenarioEditor.body(activity,maxDay);LiveScenarioEditor.refresh(activity,layer);}paint();layer.addEventListener('input',function(ev){if(!LiveScenarioEditor.input(activity,ev.target))return;
 if(['dose','open_day'].includes(ev.target.dataset.lseSetting))paint();
 else LiveScenarioEditor.refresh(activity,layer);});layer.addEventListener('change',async function(ev){var input=ev.target,key=input.dataset.lcwFile;if(!key||!input.files[0])return;try{var ref=await media.attach(key,input.files[0],function(){return layer.isConnected&&who===U.auth()&&(activity.steps||[]).some(function(s){return 'step:'+s._key===key;});});if(ref){LiveScenarioEditor.set(activity,key,ref);paint();}}catch(_){layer.querySelector('[role=alert]').textContent=t('lcwInvalidImage');}});layer.addEventListener('click',function(ev){var b=ev.target.closest('button');if(b&&LiveScenarioEditor.click(activity,b,media))paint();});layer.querySelector('[data-lrs-save]').onclick=async function(){var title=layer.querySelector('[data-lrs-title]').value.trim(),raw=layer.querySelector('[data-lrs-limit]').value,limit=raw===''?null:Number(raw);if(!LiveScenarioEditor.valid(activity,maxDay)||limit!==null&&(!Number.isInteger(limit)||limit<1||limit>100000))return;this.disabled=true;try{await U.api('/live-campaigns/'+parent+'/scenario-branches','POST',{request_key:request,activity:{enabled:true,screenshot:activity.proof_mode!=='video',open_day:activity.open_day||1,jitter_days:activity.jitter_days||0,scenario_share_pct:activity.scenario_share_pct||100,proof_mode:activity.proof_mode||'screenshot',instructions:activity.instructions,title:title,execution_limit:limit,steps:await LiveScenarioEditor.serialize(activity,media.serialize)}});if(who!==U.auth())return;U.close(layer);window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:app}}));}catch(_){if(layer.isConnected){layer.querySelector('[role=alert]').textContent=t('lcgSaveFailed');this.disabled=false;}}};}
 function render() {
  var present=new Set(items.filter(function(c){return !c.owner;}).map(function(c){return String(c.progress_id);}));
  document.querySelectorAll('[data-lrs-task]').forEach(function(host){if(!present.has(host.dataset.lrsTask))host.remove();});
  items.filter(function(c){return !c.owner;}).forEach(function(c){
   var card=document.getElementById('test-card-'+c.app_id);
   if(!card)return;
   var host=card.querySelector('[data-lrs-task]');
   if(!host){
    host=document.createElement('section');
    host.className='lr-task';
    card.append(host);
   }
   host.dataset.lrsTask=c.progress_id;
   var title='<strong>'+e(c.scenario.title||t('lrScenario'))+'</strong>';
   if(c.state==='submitted'){
    host.innerHTML=title+'<small>'+e(t('lrScenarioPending'))+'</small>';
    return;
   }
   if(c.open===false){
    host.innerHTML=title+'<small>'+e(t('growthScenarioLocked',{n:c.scenario.assigned_day||1}))+'</small>';
    return;
   }
   var video=c.scenario.proof_mode==='video';
   host.innerHTML=(window.LiveRouteUI?LiveRouteUI.scenario(Object.assign({enabled:true},c.scenario),c.campaign_id,true):title)+
    '<label class="lm-action lse-upload">'+e(t(video?'growthUploadVideo':'growthUploadScreenshot'))+
    '<input type="file" data-growth-proof accept="'+(video?'video/mp4,video/webm':'image/png,image/jpeg,image/webp')+'"></label>'+
    (video?'<small>'+e(t('growthVideoHint'))+'</small>':c.proof_id?
     '<button class="lm-action" data-lrs-submit="'+c.progress_id+'">'+e(t('growthUseCheckin'))+'</button>':'');
  });
 }
 document.addEventListener('change',async function(event){
  var input=event.target;
  if(!input.hasAttribute('data-growth-proof')||!input.files.length||identity!==U.auth())return;
  var host=input.closest('[data-lrs-task]'), file=input.files[0], signed=U.auth();
  input.disabled=true;
  try{
   if(file.size>5242880)throw Error('invalid_scenario_video');
   var data=new FormData();
   data.set('init_data',signed);
   data.set('file',file);
   var base=String(window.API_BASE||'/api').replace(/\/$/,'');
   var response=await fetch(base+'/live-scenarios/'+Number(host.dataset.lrsTask)+'/proof',{method:'POST',body:data});
   if(!response.ok)throw Error('scenario video');
   if(signed!==U.auth())return;
   if(window.showToast)showToast(t('lrScenarioSent'));
   await mount();
  }catch(_){if(signed===U.auth()&&window.showToast)showToast(t('growthProofError'));}
  finally{input.disabled=false;input.value='';}
 });
 async function mount(){if(loading||!U.auth())return;loading=true;var who=U.auth();try{var value=await U.api('/live-scenarios');if(who!==U.auth())return;identity=who;items=value.result||[];render();}finally{loading=false;}}
 document.addEventListener('click',async function(ev){var priority=ev.target.closest('[data-lrs-priority]');if(priority){ev.stopPropagation();priority.disabled=true;try{await U.api('/live-campaigns/'+priority.dataset.lrsPriority+'/priority','PATCH',{enabled:priority.dataset.lrsPriorityOn==='true'});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(priority.dataset.lrsApp)}}));}catch(_){priority.disabled=false;if(window.showToast)showToast(t('lmUnavailable'));}return;}var remove=ev.target.closest('[data-lrs-remove]');if(remove){ev.stopPropagation();if(!await new Promise(function(resolve){if(window.tg&&tg.showConfirm)tg.showConfirm(t('lrRemoveConfirm'),resolve);else resolve(window.confirm(t('lrRemoveConfirm')));}))return;try{await U.api('/live-campaigns/'+remove.dataset.lrsRemove+'/scenario-remove','POST',{});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(remove.dataset.lrsApp)}}));}catch(_){if(window.showToast)showToast(t('lmUnavailable'));}return;}var add=ev.target.closest('[data-lrs-add]');if(add){ev.stopPropagation();return create(Number(add.dataset.lrsAdd),Number(add.dataset.lrsApp),Number(add.dataset.lrsMaxDay)||14);}var b=ev.target.closest('[data-lrs-submit]');if(!b||identity!==U.auth())return;ev.stopPropagation();var c=items.find(function(x){return Number(x.progress_id)===Number(b.dataset.lrsSubmit);});if(!c)return;b.disabled=true;try{await U.api('/live-scenarios/'+c.progress_id+'/submit','POST',{proof_id:c.proof_id,message:c.scenario.title||t('lrScenario')});if(window.showToast)showToast(t('lrScenarioSent'));await mount();}catch(_){if(window.showToast)showToast(t('lmUnavailable'));b.disabled=false;}});
 window.addEventListener('live-market:changed',function(){if(document.querySelector('#tab-tests.active'))mount().catch(function(){});});
 window.LiveScenarioUI={create:create,info:info,mount:mount,render:render};
 document.addEventListener('click',async function(ev){var b=ev.target.closest('[data-lr-tier-ack]');if(!b)return;ev.stopPropagation();b.disabled=true;try{await U.api('/live-tier-events/'+b.dataset.lrTierAck+'/ack','POST',{});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(b.dataset.lrTierApp)}}));}catch(_){b.disabled=false;}});
})();
