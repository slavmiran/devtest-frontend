/* One-time owner-confirmed import. The server owns all events, counts and dates. */
(function(){
 'use strict';var current=null,completed=new Map(),disclosureSequence=0;
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(x){return window.escapeHTML(String(x==null?'':x));}
 function n(x){return x==null?'—':Number(x).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:2});}
 function scope(id){return String(window.userId||'owner')+':'+id;}
 function key(id){return 'live-history-hidden:'+scope(id);}
 function status(id,h){return completed.get(scope(id))||h||{};}
 function hidden(id){try{return localStorage.getItem(key(id))==='1';}catch(_){return false;}}
 var chevron='<svg class="lh-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 function infoButton(target,label,warning){
  return '<button type="button" class="lh-info-button'+(warning?' is-warning':'')+'" data-lh-disclosure="'+target+'" aria-controls="'+target+'" aria-expanded="false" aria-label="'+e(t(label))+'" title="'+e(t(label))+'"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/>'+(warning?'<path d="M10 6.5v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="13.3" r=".8" fill="currentColor"/>':'<circle cx="10" cy="6.5" r=".8" fill="currentColor"/><path d="M10 9v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>')+'</svg></button>';
 }
 function summary(row,beforeImport){
  var prefix='lh-info-'+(++disclosureSequence),accuracyId=prefix+'-accuracy',noticeId=prefix+'-source';
  var notes=[['observed_only_count','lhiObserved'],['date_only_count','lhiDateOnly'],['unrated_reviews','lhiUnrated'],['excluded_sessions','lhiExcluded']].filter(function(pair){return row[pair[0]];});
  return '<div class="lh-sources"><div><span class="lh-eyebrow">'+e(t('lhiSource'))+'</span><strong>'+e(t('lhiRunsCount',{n:n(row.runs_count)}))+'</strong></div><div class="lh-runs" aria-label="'+e(t('lhiSource'))+'">'+(row.run_numbers||[]).map(function(r){return '<span>Run #'+e(r)+'</span>';}).join('')+'</div></div>'+
   '<section class="lh-summary" aria-label="'+e(t('lhiTotals'))+'"><p class="lh-caption">'+e(t('lhiTotals'))+'</p><dl class="lh-totals">'+
   [['lhiInstalls',n(row.installs)],['lhiReviews',n(row.reviews)],['lhiRetention',row.avg_retention_days==null?'—':t('lhiRetentionValue',{n:n(row.avg_retention_days)})]].map(function(metric){var warning=metric[0]==='lhiInstalls'&&beforeImport&&row.installs>0?infoButton(noticeId,'lhiSourceHint',true):'',help=metric[0]==='lhiRetention'&&row.observed_only_count?infoButton(accuracyId,'lhiRetentionHint',false):'';return '<div><dt><span>'+e(t(metric[0]))+'</span>'+help+'</dt><dd><span>'+e(metric[1])+'</span>'+warning+'</dd></div>';}).join('')+'</dl></section>'+
   (beforeImport&&row.installs>0?'<aside class="lh-notice" id="'+noticeId+'" hidden><strong>'+e(t('lhiDirectTitle'))+'</strong><p>'+e(t('lhiDirect'))+'</p></aside>':'')+
   '<details class="lh-accuracy" id="'+accuracyId+'"><summary><span>'+e(t('lhiAccuracy'))+'</span>'+chevron+'</summary><ul>'+notes.map(function(pair){return '<li>'+e(t(pair[1],{n:n(row[pair[0]])}))+'</li>';}).join('')+'<li>'+e(t('lhiDates'))+'</li></ul></details>';
 }
 function runPicker(s){
  return '<div class="lh-run-field"><span id="lh-run-label" class="lh-run-label">'+e(t('lhiSelect'))+'</span><details class="lh-run-picker"><summary id="lh-run" class="lh-run-trigger" aria-labelledby="lh-run-label lh-run-value"><span id="lh-run-value">Run #'+e(s.from)+'</span>'+chevron+'</summary><div class="android-version-picker-list lh-run-options" role="group" aria-labelledby="lh-run-label"><button type="button" class="android-version-option lh-run-excluded" disabled><span>'+e(t('lhiRun1'))+'</span></button>'+(s.data.options||[]).map(function(item){var selected=s.from===item.from_run_number;return '<button type="button" class="android-version-option'+(selected?' is-selected':'')+'" data-lh-action="choose-run" data-lh-run-number="'+Number(item.from_run_number)+'" aria-pressed="'+selected+'"><span>Run #'+e(item.from_run_number)+'</span><span class="android-version-option__mark" aria-hidden="true">'+(selected?'✓':'')+'</span></button>';}).join('')+'</div></details></div>';
 }
 function banner(id,h){
  h=status(id,h);if(!h.available||h.imported||hidden(id))return '';
  return '<aside class="lh-banner" data-lh-banner="'+id+'"><button type="button" class="lh-close" data-lh-dismiss="'+id+'" aria-label="'+e(t('lhiClose'))+'">×</button><span class="lh-eyebrow">'+e(t('lhiPastRuns'))+'</span><strong>'+e(t('lhiTitle'))+'</strong><p>'+e(t('lhiIntro'))+'</p><div class="lh-banner-actions"><button type="button" class="btn btn-primary" data-lh-open="'+id+'">'+e(t('lhiChoose'))+'</button><button type="button" class="btn lh-secondary" data-lh-dismiss="'+id+'">'+e(t('lhiKeepEmpty'))+'</button></div><p class="lh-note lh-later">'+e(t('lhiLater'))+'</p></aside>';
 }
 function footer(id,h,epoch){h=status(id,h);if(h.imported){var row=h.imported,date=new Date(row.imported_at).toLocaleDateString(window.lang==='ru'?'ru-RU':'en-US');return '<details class="lh-passport" id="la-import-passport"><summary>'+e(t('lhiDone',{date:date,run:row.from_run_number}))+'</summary>'+summary(row)+(epoch&&Date.parse(epoch)!==Date.parse(row.live_activated_at)?'<p>'+e(t('lhiOlderPeriod'))+'</p>':'')+'</details>';}
  return h.available?'<div class="lh-entry"><button type="button" class="lh-link" data-lh-open="'+id+'">'+e(t('lhiEntry'))+'</button></div>':'';
 }
 function pace(metric){var b=metric&&metric.baseline;if(!b)return '';return t(!b.available?'lhiNoPace':b.days===28?'lhiMonthly':'lhiWeek',{n:n(b.days===28?b.per_day:metric.per_day),m:n(metric.per_day_28d)});}
 function api(id){return String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+id+'/live-history-import';}
 function remember(id,h){completed.set(scope(id),h);document.querySelectorAll('[data-lh-banner="'+id+'"]').forEach(function(el){el.remove();});window.dispatchEvent(new CustomEvent('live-history:imported',{detail:{appId:id,history:h}}));}
 function chosen(s){return s.data&&(s.data.options||[]).find(function(row){return row.from_run_number===s.from;});}
 function render(){
  var s=current;if(!s)return;var root=s.root,row=chosen(s),focused=root.contains(document.activeElement)?document.activeElement:null,focusAction=focused&&focused.dataset.lhAction,focusId=focused&&focused.id;root.innerHTML='<section class="lh-dialog" role="dialog" aria-modal="true" aria-labelledby="lh-title"><div class="sheet-handle lh-handle" aria-hidden="true"></div><header><div><span class="lh-eyebrow">'+e(t('lhiPastRuns'))+'</span><h2 id="lh-title">'+e(t(s.stage==='confirm'?'lhiConfirmTitle':'lhiSheetTitle'))+'</h2></div><button type="button" class="lh-close" data-lh-action="close" aria-label="'+e(t('lhiClose'))+'"'+(s.posting?' disabled':'')+'>×</button></header><div class="lh-body" aria-busy="'+(s.loading||s.posting)+'">'+
   (s.loading?'<p class="lh-loading" role="status">'+e(t('lhiLoading'))+'</p>':s.data&&s.data.imported?summary(s.data.imported):row?
    (s.stage==='confirm'?'<p class="lh-once">'+e(t('lhiOnce'))+'</p>':'')+(s.stage==='choose'?runPicker(s):'')+summary(row,true)+'<p class="lh-note lh-dates">'+e(t('lhiNoCharge'))+'</p>':
    '<p>'+e(t('lhiEmpty'))+'</p>')+(s.error?'<p class="lh-error" role="alert">'+e(t(s.error))+'</p>':'')+'</div><footer>'+
   (s.data&&s.data.imported?'<button type="button" class="btn btn-primary" data-lh-action="close">'+e(t('lhiClose'))+'</button>':
    '<button type="button" class="btn btn-primary" data-lh-action="'+(s.error&&!row?'retry':s.stage==='confirm'?'submit':'preview')+'"'+(s.loading||s.posting||row&&row.installs===0?' disabled':'')+'>'+e(t(s.posting?'lhiSaving':s.error&&!row?'lhiRetry':s.stage==='confirm'?'lhiConfirm':'lhiContinue'))+'</button><button type="button" class="btn lh-secondary" data-lh-action="'+(s.stage==='confirm'?'back':'close')+'"'+(s.posting?' disabled':'')+'>'+e(t(s.stage==='confirm'?'lhiBack':'lhiCancel'))+'</button>')+'</footer></section>';
  var next=focusId&&root.querySelector('#'+focusId)||focusAction&&root.querySelector('[data-lh-action="'+focusAction+'"]');if(next&&!next.disabled)next.focus({preventScroll:true});else if(focused){var dialog=root.querySelector('[role=dialog]');dialog.tabIndex=-1;dialog.focus({preventScroll:true});}
 }
 async function read(confirm){var s=current;if(!s||s.loading||s.posting)return;s.loading=true;s.error=null;render();
  try{var response=await fetch(api(s.id)+'?init_data='+encodeURIComponent(s.initData),{cache:'no-store'}),payload=await response.json();if([401,403,404].includes(response.status))s.data=null;if(!response.ok||!payload.history)throw Error();
   if(current!==s)return;s.data=payload.history;if(s.data.imported)remember(s.id,s.data);if(!chosen(s))s.from=s.data.options&&s.data.options[0]&&s.data.options[0].from_run_number;
   s.stage=confirm&&chosen(s)?'confirm':'choose';
  }catch(_){if(current===s)s.error='lhiError';}finally{if(current===s){s.loading=false;render();}}
 }
 async function submit(){var s=current,row=s&&chosen(s);if(!s||s.posting||s.loading||s.stage!=='confirm'||!row||!row.installs)return;s.posting=true;s.error=null;render();
  try{var response=await fetch(api(s.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({init_data:s.initData,from_run_number:s.from,preview_token:row.preview_token})}),payload=await response.json();
   if(current!==s)return;if(!response.ok||!payload.history||!payload.history.imported){if(payload.error==='history_preview_changed'||payload.error==='history_already_imported'){s.posting=false;s.stage='choose';await read(false);if(!s.data||!s.data.imported)s.error='lhiChanged';render();return;}throw Error();}
   remember(s.id,payload.history);
   if(window.showToast)window.showToast(t('lhiSuccess'));s.posting=false;close();
  }catch(_){if(current===s)s.error='lhiSaveError';}finally{if(current===s){s.posting=false;render();}}
 }
 function close(){var s=current;if(!s||s.posting)return;current=null;s.root.remove();document.body.style.overflow=s.overflow;if(s.focus&&s.focus.isConnected)s.focus.focus({preventScroll:true});if(window.syncTelegramBackButton)window.syncTelegramBackButton();}
 function open(id){id=Number(id);if(!id)return;if(current){if(current.posting)return;close();}var raw;try{raw=window.getTelegramInitDataRaw();}catch(_){raw='';}
  var root=document.createElement('div');root.id='live-history-modal';root.className='modal-overlay active lh-overlay';current={id:id,root:root,initData:raw,stage:'choose',loading:false,posting:false,from:null,data:null,error:null,focus:document.activeElement,overflow:document.body.style.overflow};
  document.body.style.overflow='hidden';document.body.appendChild(root);root.onclick=function(event){event.stopPropagation();if(event.target===root){close();return;}var button=event.target.closest('[data-lh-action]');if(!button)return;var action=button.dataset.lhAction;if(action==='close')close();else if(action==='choose-run'){if(current.loading||current.posting)return;var from=Number(button.dataset.lhRunNumber);if(!(current.data.options||[]).some(function(item){return item.from_run_number===from;}))return;current.from=from;render();root.querySelector('#lh-run').focus({preventScroll:true});}else if(action==='preview')read(true);else if(action==='submit')submit();else if(action==='retry')read(false);else if(action==='back'){current.stage='choose';render();}};
  root.onkeydown=function(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();var picker=root.querySelector('.lh-run-picker[open]');if(picker){picker.open=false;picker.querySelector('summary').focus({preventScroll:true});}else close();}if(event.key==='Tab'){var nodes=Array.from(root.querySelectorAll('button:not(:disabled),summary')).filter(function(el){return el.checkVisibility?el.checkVisibility():el.getClientRects().length;});if(!nodes.length){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}}};
  render();root.querySelector('button').focus();read(false);if(window.syncTelegramBackButton)window.syncTelegramBackButton();
 }
 document.addEventListener('click',function(event){var button=event.target.closest('[data-lh-open],[data-lh-dismiss]');if(!button)return;event.preventDefault();event.stopPropagation();if(button.hasAttribute('data-lh-open'))open(button.dataset.lhOpen);else{var id=Number(button.dataset.lhDismiss);try{localStorage.setItem(key(id),'1');}catch(_){}button.closest('[data-lh-banner]').remove();}},true);
 document.addEventListener('click',function(event){var button=event.target.closest('[data-lh-disclosure]');if(!button)return;var target=document.getElementById(button.dataset.lhDisclosure);if(!target)return;event.preventDefault();event.stopPropagation();var expanded=target.tagName==='DETAILS'?!target.open:target.hidden;if(target.tagName==='DETAILS')target.open=expanded;else target.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));},true);
 document.addEventListener('toggle',function(event){var target=event.target;if(!target.matches('.lh-accuracy'))return;document.querySelectorAll('[data-lh-disclosure="'+target.id+'"]').forEach(function(button){button.setAttribute('aria-expanded',String(target.open));});},true);
 window.LiveHistoryImport={banner:banner,footer:footer,open:open,close:close,pace:pace};window.closeLiveHistoryImport=close;
})();
