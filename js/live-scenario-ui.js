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
 async function create(parent,app,maxDay){
  var who=U.auth(), request=LiveCampaigns.requestKey(), activity={enabled:true,screenshot:true,instructions:'',steps:[]};
  var media=LiveCampaignWizardMedia.create(),layer=U.sheet(t('lrAddScenario'),'<div data-lrs-editor></div>'+
    '<button class="lm-action lm-action-primary" data-lrs-save>'+e(t('lrScenarioCreate'))+'</button>'+
    '<p class="lm-error" role="alert"></p>',{onclose:function(){media.clear();}});
  var save=layer.querySelector('[data-lrs-save]'), error=layer.querySelector('[role=alert]');
  function validate(){save.disabled=!LiveScenarioEditor.valid(activity,maxDay)||!!layer.querySelector('[aria-invalid="true"]');}
  function paint(){layer.querySelector('[data-lrs-editor]').innerHTML=LiveScenarioEditor.body(activity,maxDay);LiveScenarioEditor.refresh(activity,layer);validate();}
  addInherited(layer.querySelector('[data-lrs-editor]'),app);
  paint();
  layer.addEventListener('input',function(ev){
   var el=ev.target;
   if(el.dataset.lcwInput==='scenarioTitle')activity.title=el.value;
   else if(el.dataset.lcwInput==='scenarioLimit'){
    var value=el.value===''?null:Number(el.value), ok=!el.validity.badInput&&(value===null||Number.isInteger(value)&&value>=1&&value<=100000);
    el.setAttribute('aria-invalid',String(!ok));
    if(ok)activity.execution_limit=value;
   }else if(!LiveScenarioEditor.input(activity,el))return;
   if(el.tagName==='SELECT'||el.type==='checkbox')paint();
   else {LiveScenarioEditor.refresh(activity,layer);validate();}
  });
  layer.addEventListener('change',async function(ev){
   var input=ev.target,key=input.dataset.lcwFile;
   if(!key||!input.files[0])return;
   try{
    var ref=await media.attach(key,input.files[0],function(){return layer.isConnected&&who===U.auth()&&activity.steps.some(s=>'step:'+s._key===key);});
    if(ref){LiveScenarioEditor.set(activity,key,ref);paint();}
   }catch(_){error.textContent=t('lcwInvalidImage');}
  });
  layer.addEventListener('click',function(ev){
   var b=ev.target.closest('.lse-editor button');
   if(b&&LiveScenarioEditor.click(activity,b,media))paint();
  });
  save.onclick=async function(){
   if(save.disabled)return;
   save.disabled=true;
   try{
    var payload=Object.assign({},activity,{title:(activity.title||'').trim(),
      steps:await LiveScenarioEditor.serialize(activity,media.serialize)});
    await U.api('/live-campaigns/'+parent+'/scenario-branches','POST',{request_key:request,activity:payload});
    if(who!==U.auth())return;
    U.close(layer);
    window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:app}}));
   }catch(_){if(layer.isConnected){error.textContent=t('lcgSaveFailed');validate();}}
  };
 }
 var modelBrands={samsung:'Samsung',xiaomi:'Xiaomi / Redmi / POCO',google:'Google Pixel',bbk:'Realme / OPPO / Vivo',
  huawei:'Honor / Huawei',oneplus:'OnePlus',motorola:'Motorola'};
 function brandLabel(state) {
  if(!state||state.mode==='any')return t('lseBrandAny');
  return t(state.mode==='allow'?'lseBrandOnly':'lseBrandExclude')+' · '+state.brands.map(b=>modelBrands[b]).filter(Boolean).join(', ');
 }
 async function addInherited(host,app){
  var who=U.auth(), existing=host.parentElement.querySelector('[data-lrs-inherited]');
  if(existing)return;
  var info=document.createElement('small');
  info.dataset.lrsInherited='';
  host.before(info);
  try{
   var result=await U.api('/apps/'+app+'/live-device-brands');
   if(who===U.auth()&&info.isConnected)info.textContent=t('lseInheritedBrands',{brands:brandLabel(result.result)})+' · '+t('lseLanguageHint');
  }catch(_){info.remove();}
 }
 async function brandSettings(app){
  var who=U.auth(), layer=U.sheet(t('lseBrandFilter'),'<div data-lrs-brands></div><small class="lm-error" role="alert"></small>');
  var root=layer.querySelector('[data-lrs-brands]'), error=layer.querySelector('[role=alert]');
  try{
   var state=(await U.api('/apps/'+app+'/live-device-brands')).result;
   if(who!==U.auth()||!layer.isConnected)return;
   root.innerHTML='<div class="lr-round"><label>'+e(t('lseBrandFilter'))+'<select class="gtw-input">'+
    Object.entries({any:'lseBrandAny',deny:'lseBrandExclude',allow:'lseBrandOnly'}).map(([v,label])=>
     '<option value="'+v+'"'+(state.mode===v?' selected':'')+'>'+e(t(label))+'</option>').join('')+'</select></label>'+
    '<fieldset><legend>'+e(t('lseBrandFilter'))+'</legend>'+Object.entries(modelBrands).map(([v,label])=>
     '<label><input type="checkbox" value="'+v+'"'+(state.brands.includes(v)?' checked':'')+'> '+e(label)+'</label>').join('')+
    '</fieldset><small>'+e(t('lseBrandHint'))+'</small><button type="button" class="lm-action lm-action-primary">'+e(t('lmSave'))+'</button></div>';
   var select=root.querySelector('select'),fieldset=root.querySelector('fieldset'),save=root.querySelector('button');
   var selected=()=>Array.from(fieldset.querySelectorAll(':checked'),el=>el.value);
   function sync(){fieldset.hidden=select.value==='any';save.disabled=select.value!=='any'&&!selected().length;}
   root.addEventListener('change',sync);
   sync();
   save.onclick=async function(){
    save.disabled=true;
    try{
     await U.api('/apps/'+app+'/live-device-brands','PATCH',{mode:select.value,brands:select.value==='any'?[]:selected()});
     if(who!==U.auth()||!layer.isConnected)return;
     U.close(layer);
     window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:app}}));
    }catch(_){error.textContent=t('lcgSaveFailed');sync();}
   };
  }catch(_){error.textContent=t('lmUnavailable');}
 }
 function uploadLabel(step,video,saved){
  return '<label class="lm-action lse-upload"><span>'+e(t(saved?'lseProofSaved':step?'lseStepProof':'lseFinalProof'))+'</span>'+
    '<input type="file" data-growth-proof data-lrs-proof-step="'+step+'"'+(saved?' data-lrs-proof-saved':'')+
    ' accept="'+(video?'video/mp4,video/webm':'image/png,image/jpeg,image/webp')+'"></label>';
 }
 function answerField(question,step,round){
  if(!question)return '';
  if(question.kind==='choice')return '<fieldset class="lr-round-answer"><legend>'+e(question.prompt)+'</legend>'+
   question.options.map((v,i)=>'<label><input type="radio" name="lrs-'+round+'-'+step+'" data-lrs-answer="'+step+'" value="'+i+'"> '+e(v)+'</label>').join('')+'</fieldset>';
  return '<label class="lr-round-answer">'+e(question.prompt)+'<textarea class="gtw-input" data-lrs-answer="'+step+'" minlength="2" maxlength="300"></textarea></label>';
 }
 function renderRound(host,c,title){
  var key=c.progress_id+':'+c.round+':'+c.open;
  if(host.dataset.lrsRoundKey===key){
   (c.proof_steps||[]).forEach(function(step){
    var input=host.querySelector('[data-lrs-proof-step="'+step+'"]');
    if(input){input.dataset.lrsProofSaved='';input.parentElement.querySelector('span').textContent=t('lseProofSaved');}
   });
   return;
  }
  host.dataset.lrsRoundKey=key;
  host.dataset.lrsRound=c.round;
  if(!c.open){
   host.innerHTML=title+'<small>'+e(t('lseAwaitNext',{n:c.round, day:c.round_day}))+'</small>';
   return;
  }
  var a=c.scenario,steps=a.steps||[],saved=c.proof_steps||[],video=a.proof_mode==='video';
  host.innerHTML='<section class="lr-round">'+title+'<small>'+e(t('lseIterationNumber',{n:c.round,total:c.rounds,day:c.round_day}))+'</small>'+
   (window.LiveRouteUI?LiveRouteUI.scenario(Object.assign({},a,{enabled:true,title:''}),c.campaign_id,true):'')+
   steps.map((s,i)=>s.require_proof||s.question?'<section class="lr-round-step"><strong>'+
      e(t('lseStep',{n:i+1})+' · '+s.text)+'</strong>'+(s.require_proof?uploadLabel(i+1,false,saved.includes(i+1)):'')+
      answerField(s.question,i+1,c.progress_id)+'</section>':'').join('')+
   uploadLabel(0,video,saved.includes(0))+(video?'<small>'+e(t('growthVideoHint'))+'</small>':'')+
   '<button type="button" class="lm-action lm-action-primary" data-lrs-round-submit>'+e(t('lseSendIteration'))+'</button>'+
   '<small class="lm-error" data-lrs-error role="alert"></small></section>';
 }
 function evidenceSlot(id) {
  return '<details class="lr-round-evidence" data-lrs-evidence="'+Number(id)+'"><summary>'+e(t('lseEvidence'))+'</summary><div></div></details>';
 }
 document.addEventListener('toggle',async function(ev){
  var panel=ev.target;
  if(!panel.matches?.('[data-lrs-evidence]')||!panel.open||panel.dataset.loaded)return;
  panel.dataset.loaded='true';
  var content=panel.querySelector('div'), signed=U.auth(), id=Number(panel.dataset.lrsEvidence);
  try{
   var url='/live-scenarios/feedback/'+id+'/rounds', result=(await U.api(url)).result||[];
   if(signed!==U.auth()||!panel.isConnected)return;
   if(!result.length){panel.remove();return;}
   var base=String(window.API_BASE||'/api').replace(/\/$/,'');
   content.innerHTML=result.map(r=>'<section class="lr-round-evidence"><strong>'+e(t('lseRoundEvidence',{n:r.round,day:r.day}))+'</strong>'+
    Object.entries(r.answers||{}).map(([i,answer])=>'<p>'+e(t('lseStep',{n:i})+' · '+answer.prompt)+'<br><strong>'+
      e(answer.answer)+'</strong>'+('correct' in answer?' · '+e(t(answer.correct?'lseAnswerCorrect':'lseAnswerIncorrect')):'')+'</p>').join('')+
    r.proofs.map(m=>{
     var label=t(m.step?'lseStepProofLabel':'lseFinalProof',{n:m.step});
     var href=e(base+url+'/'+r.round+'/proof/'+m.step+'?init_data='+encodeURIComponent(signed));
     return '<figure><figcaption>'+e(label)+'</figcaption>'+(m.mime.startsWith('video/')?
      '<video class="growth-proof-video" controls preload="none" src="'+href+'"></video>':
      '<a href="'+href+'" target="_blank" rel="noopener noreferrer"><img class="growth-proof-video" loading="lazy" src="'+href+'" alt="'+e(label)+'"></a>')+'</figure>';
    }).join('')+'</section>').join('');
  }catch(_){delete panel.dataset.loaded;content.textContent=t('lmUnavailable');}
 },true);
 document.addEventListener('input',function(ev){
  if(ev.target.hasAttribute('data-lrs-answer'))ev.target.closest('[data-lrs-task]').querySelector('[data-lrs-error]').textContent='';
 });
 document.addEventListener('click',async function(ev){
  var button=ev.target.closest('[data-lrs-round-submit]');
  if(!button||identity!==U.auth()||button.disabled)return;
  var host=button.closest('[data-lrs-task]'), error=host.querySelector('[data-lrs-error]');
  var answers={}, inputs=Array.from(host.querySelectorAll('[data-lrs-answer]'));
  for(var input of inputs){
   if(input.type==='radio'){if(input.checked)answers[input.dataset.lrsAnswer]=Number(input.value);}
   else if(Array.from(input.value.trim()).length>=2)answers[input.dataset.lrsAnswer]=input.value.trim();
  }
  if(inputs.some(input=>!(input.dataset.lrsAnswer in answers))){error.textContent=t('lseAnswerRequired');return;}
  if(host.querySelector('[data-lrs-proof-step]:not([data-lrs-proof-saved])')){error.textContent=t('lseMissingProof');return;}
  var signed=U.auth();
  button.disabled=true;error.textContent='';
  try{
   await U.api('/live-scenarios/'+Number(host.dataset.lrsTask)+'/rounds/'+Number(host.dataset.lrsRound)+'/submit','POST',{answers:answers});
   if(signed!==U.auth())return;
   if(window.showToast)showToast(t('lseIterationSent'));
   await mount();
  }catch(_){error.textContent=t('growthProofError');button.disabled=false;}
 });
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
    delete host.dataset.lrsRoundKey;
    host.innerHTML=title+'<small>'+e(t('lrScenarioPending'))+'</small>';
    return;
   }
   if(c.economy_version===2){renderRound(host,c,title);return;}
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
   var v2=input.hasAttribute('data-lrs-proof-step');
   var path='/live-scenarios/'+Number(host.dataset.lrsTask)+(v2?
     '/rounds/'+Number(host.dataset.lrsRound)+'/proof/'+Number(input.dataset.lrsProofStep):'/proof');
   var response=await fetch(base+path,{method:'POST',body:data});
   if(!response.ok)throw Error('scenario video');
   if(signed!==U.auth())return;
   if(v2){
    host.querySelector('[data-lrs-error]').textContent='';
    input.dataset.lrsProofSaved='';
    input.parentElement.querySelector('span').textContent=t('lseProofSaved');
    return;
   }
   if(window.showToast)showToast(t('lrScenarioSent'));
   await mount();
  }catch(_){if(signed===U.auth()&&window.showToast)showToast(t('growthProofError'));}
  finally{input.disabled=false;input.value='';}
 });
 async function mount(){if(loading||!U.auth())return;loading=true;var who=U.auth();try{var value=await U.api('/live-scenarios');if(who!==U.auth())return;identity=who;items=value.result||[];render();}finally{loading=false;}}
 document.addEventListener('click',async function(ev){var priority=ev.target.closest('[data-lrs-priority]');if(priority){ev.stopPropagation();priority.disabled=true;try{await U.api('/live-campaigns/'+priority.dataset.lrsPriority+'/priority','PATCH',{enabled:priority.dataset.lrsPriorityOn==='true'});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(priority.dataset.lrsApp)}}));}catch(_){priority.disabled=false;if(window.showToast)showToast(t('lmUnavailable'));}return;}var remove=ev.target.closest('[data-lrs-remove]');if(remove){ev.stopPropagation();if(!await new Promise(function(resolve){if(window.tg&&tg.showConfirm)tg.showConfirm(t('lrRemoveConfirm'),resolve);else resolve(window.confirm(t('lrRemoveConfirm')));}))return;try{await U.api('/live-campaigns/'+remove.dataset.lrsRemove+'/scenario-remove','POST',{});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(remove.dataset.lrsApp)}}));}catch(_){if(window.showToast)showToast(t('lmUnavailable'));}return;}var add=ev.target.closest('[data-lrs-add]');if(add){ev.stopPropagation();return create(Number(add.dataset.lrsAdd),Number(add.dataset.lrsApp),Number(add.dataset.lrsMaxDay)||14);}var b=ev.target.closest('[data-lrs-submit]');if(!b||identity!==U.auth())return;ev.stopPropagation();var c=items.find(function(x){return Number(x.progress_id)===Number(b.dataset.lrsSubmit);});if(!c)return;b.disabled=true;try{await U.api('/live-scenarios/'+c.progress_id+'/submit','POST',{proof_id:c.proof_id,message:c.scenario.title||t('lrScenario')});if(window.showToast)showToast(t('lrScenarioSent'));await mount();}catch(_){if(window.showToast)showToast(t('lmUnavailable'));b.disabled=false;}});
 window.addEventListener('live-market:changed',function(){if(document.querySelector('#tab-tests.active'))mount().catch(function(){});});
 window.LiveScenarioUI={create:create,info:info,mount:mount,render:render,evidenceSlot:evidenceSlot,brandSettings:brandSettings,addInherited:addInherited};
 document.addEventListener('click',async function(ev){var b=ev.target.closest('[data-lr-tier-ack]');if(!b)return;ev.stopPropagation();b.disabled=true;try{await U.api('/live-tier-events/'+b.dataset.lrTierAck+'/ack','POST',{});window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:Number(b.dataset.lrTierApp)}}));}catch(_){b.disabled=false;}});
})();
