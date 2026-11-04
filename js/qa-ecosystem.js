/* Test-only controller; every command is authenticated and rechecked by the DB. */
(function(){
 'use strict';
 var U,state=null,busy=false,lastActor='',keys=new Map();
 function t(k,v){return U.t('qa'+k,v);}function e(v){return U.e(v);}
 var groups=[['Resources',['resources']],['Partners',['incoming','incoming_pro','incoming_closed','partner_d1','report']],['Time',['ready','advance','day3','day7','day12','day13','finish','early_tester','early_owner','cancel_unstarted','tier']],['Keywords',['keyword_video','keyword_extend','keyword_request_extend','keyword_confirm_extend','keyword_reject_extend','keyword_link']],['Reviews',['extension','review_four_star']],['Reset',['restore_case','refresh_dates','refresh_all','pause','resume']]];
 var days={day3:3,day7:7,day12:12,day13:13,finish:0};
 function caseName(o){var key=o.key,known={'task:ready':'Ready','task:queued':'Queued','keyword:waiting':'Keyword','review:required:d13':'Review','scenario:submitted':'Scenario','contract_daily:task':'Daily','contract_hold:task':'Hold','contract_keywords:task':'ContractKeyword'};return known[key]?t('Case'+known[key]):key.startsWith('flagship:participant:')?t('CaseParticipant',{n:key.split(':').pop()}):key;}
 function statusName(s){var translated=t('State_'+s);return translated==='qaState_'+s?s:translated;}
 function requestKey(){if(crypto.randomUUID)return crypto.randomUUID();var bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;return Array.from(bytes,function(b,i){return ([4,6,8,10].includes(i)?'-':'')+b.toString(16).padStart(2,'0');}).join('');}
 async function read(){var v=await U.api('/qa-ecosystem');state=v.result;return state;}
 function legs(){return (state.objects||[]).filter(function(o){return o.kind==='leg'||o.kind==='contract_template';});}
 function render(layer){
  var oldSelect=layer.querySelector('[data-qa-key]'),selected=oldSelect&&oldSelect.value,restoreFocus=layer.contains(document.activeElement);
  layer.querySelector('[data-qa-body]').innerHTML='<p class="qa-notice">'+e(t('Notice'))+'</p><div class="qa-overview"><strong>'+e(t(state.paused?'Paused':state.enabled?'Enabled':'Disabled'))+'</strong><span>'+e(t('Generation',{n:state.generation}))+'</span></div>'+
   (state.restoration_conflicts?'<p role="status" class="qa-warning">'+e(t('Conflicts',{n:state.restoration_conflicts}))+'</p>':'')+
   '<label class="qa-selector">'+e(t('Participant'))+'<select data-qa-key>'+legs().map(function(o){return '<option value="'+e(o.key)+'">'+e(caseName(o)+' · '+(o.state?statusName(o.state):t('Template'))+(o.day?' · D'+o.day:''))+'</option>';}).join('')+'</select></label><p class="qa-notice">'+e(t('ReplayHint'))+'</p>'+
   groups.map(function(g){return '<section class="qa-group"><h3>'+e(t(g[0]))+'</h3><div>'+g[1].map(function(a){var main=a.startsWith('incoming')?'incoming':a;return '<button type="button" class="lm-action'+(['disable','reset','early_tester','early_owner'].includes(a)?' qa-sensitive':'')+'" data-qa-action="'+a+'"'+(!state.enabled&&a!=='reset'?' disabled':'')+'>'+e(t('Action_'+a))+'</button>';}).join('')+'</div></section>';}).join('')+
   '<details class="qa-manifest"><summary>'+e(t('Projects',{n:(state.objects||[]).filter(function(o){return o.kind==='app';}).length}))+'</summary>'+ (state.objects||[]).filter(function(o){return ['app','order','guest'].includes(o.kind);}).map(function(o){return '<div><b>'+e(o.name||o.key)+'</b><small>'+e(o.key+' · '+(o.phase||o.kind)+' · #'+o.id)+'</small></div>';}).join('')+'</details><div data-qa-message role="status" aria-live="polite"></div>';
  var nextSelect=layer.querySelector('[data-qa-key]');if(selected&&Array.from(nextSelect.options).some(function(o){return o.value===selected;}))nextSelect.value=selected;if(restoreFocus)nextSelect.focus({preventScroll:true});
 }
 async function refreshApp(){window.dispatchEvent(new CustomEvent('live-market:changed'));window.dispatchEvent(new CustomEvent('live-campaigns:refresh'));if(window.refreshMyTestsNow)refreshMyTestsNow();if(window.loadProjects)loadProjects();if(window.LiveMarket)LiveMarket.mount(true);}
 async function open(){U=window.LiveMarketUI;if(!U)return;await read();var layer=U.sheet(t('Title'),'<div class="qa-panel" data-qa-body></div>');render(layer);
  layer.addEventListener('click',async function(ev){var b=ev.target.closest('[data-qa-action]');if(!b||b.disabled||busy)return;var action=b.dataset.qaAction,key=layer.querySelector('[data-qa-key]').value;
   if(['pause','early_tester','early_owner'].includes(action)&&!await confirmAction(action))return;
   var apiAction=action,apiKey=key,data={};if(action.startsWith('incoming')){apiAction='incoming';apiKey=action==='incoming_pro'?'pro':action==='incoming_closed'?'closed':'normal';}if(Object.hasOwn(days,action)){apiAction='advance_to';data.day=days[action];}
   var fingerprint=apiAction+':'+apiKey+':'+JSON.stringify(data),token=keys.get(fingerprint)||requestKey();keys.set(fingerprint,token);busy=true;layer.querySelectorAll('[data-qa-action]').forEach(function(x){x.disabled=true;});
   var message=layer.querySelector('[data-qa-message]');message.textContent=t('Working');
   try{var v=await U.api('/qa-ecosystem','POST',{action:apiAction,key:apiKey,data:data,request_key:token});await read();keys.delete(fingerprint);render(layer);layer.querySelector('[data-lm-close]').focus({preventScroll:true});receipt(layer,v.result);await refreshApp();}
   catch(err){message.textContent=t(err.message==='qa_case_not_ready'?'CaseNotReady':err.message==='qa_no_outgoing_offer'?'NoOutgoing':'Failed');layer.querySelectorAll('[data-qa-action]').forEach(function(x){x.disabled=false;});}
   finally{busy=false;}
  });return layer;
 }
 function receipt(layer,result){var r=result||{},parts=[t('Done')],paid=r.receipt||{};if(r.day)parts.push(t('ReachedDay',{n:r.day}));if(paid.buffer_released)parts.push(t('BufferReleased',{n:paid.buffer_released}));if(r.history_preserved)parts.push(t('HistoryPreserved'));layer.querySelector('[data-qa-message]').innerHTML='<strong>'+e(parts.join(' '))+'</strong><details><summary>'+e(t('Receipt'))+'</summary><pre>'+e(JSON.stringify(r,null,2))+'</pre></details>';}
 async function confirmAction(action){if(window.Swal){var v=await Swal.fire({title:t('Confirm'),text:t(action==='pause'?'DisableHint':'EarlyHint'),icon:'warning',showCancelButton:true,confirmButtonText:t('Continue'),cancelButtonText:U.t('cancel')});return v.isConfirmed;}return window.confirm(t('Confirm'));}
 async function discover(){U=window.LiveMarketUI;if(!U||!U.auth()||busy)return;var actor=U.auth();if(actor===lastActor)return;lastActor=actor;
  try{await read();var host=document.querySelector('#hud-settings .system-drop-content')||document.querySelector('#system-drop-menu .system-drop-content');if(!host){lastActor='';return;}if(document.getElementById('qa-ecosystem-open'))return;
   var b=document.createElement('button');b.type='button';b.id='qa-ecosystem-open';b.className='qa-entry';b.setAttribute('data-i18n','qaEntry');b.textContent=t('Entry');b.onclick=function(){open().catch(function(){if(window.showToast)showToast(t('Failed'));});};host.appendChild(b);
  }catch(err){if(!['qa_unavailable','invalid_init_data','init_data_expired'].includes(err.message))lastActor='';/* Retry transient Test failures; unauthorized actors have no controls. */}
 }
 window.QAEcosystem={open:open,discover:discover};
 window.addEventListener('DOMContentLoaded',function(){var attempts=0;var timer=setInterval(function(){discover();if(++attempts>=30)clearInterval(timer);},1000);});
 window.addEventListener('languageChanged',function(){var b=document.getElementById('qa-ecosystem-open');if(b&&U)b.textContent=t('Entry');});
})();
