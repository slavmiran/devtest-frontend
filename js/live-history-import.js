/* One-time owner-confirmed import. The server owns all events, counts and dates. */
(function(){
 'use strict';var current=null,completed=new Map();
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(x){return window.escapeHTML(String(x==null?'':x));}
 function n(x){return x==null?'—':Number(x).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:2});}
 function scope(id){return String(window.userId||'owner')+':'+id;}
 function key(id){return 'live-history-hidden:'+scope(id);}
 function status(id,h){return completed.get(scope(id))||h||{};}
 function hidden(id){try{return localStorage.getItem(key(id))==='1';}catch(_){return false;}}
 var chevron='<svg class="lh-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 function summary(row){
  var notes=[['observed_only_count','lhiObserved'],['date_only_count','lhiDateOnly'],['unrated_reviews','lhiUnrated'],['excluded_sessions','lhiExcluded']].filter(function(pair){return row[pair[0]];});
  return '<div class="lh-sources"><div><span class="lh-eyebrow">'+e(t('lhiSource'))+'</span><strong>'+e(t('lhiRunsCount',{n:n(row.runs_count)}))+'</strong></div><div class="lh-runs" aria-label="'+e(t('lhiSource'))+'">'+(row.run_numbers||[]).map(function(r){return '<span>Run #'+e(r)+'</span>';}).join('')+'</div></div>'+
   '<section class="lh-summary" aria-label="'+e(t('lhiTotals'))+'"><p class="lh-caption">'+e(t('lhiTotals'))+'</p><dl class="lh-totals">'+
   [['lhiInstalls',n(row.installs)],['lhiReviews',n(row.reviews)],['lhiRetention',row.avg_retention_days==null?'—':t('lhiRetentionValue',{n:n(row.avg_retention_days)})]].map(function(metric){return '<div><dt>'+e(t(metric[0]))+'</dt><dd>'+e(metric[1])+'</dd></div>';}).join('')+'</dl>'+
   (row.observed_only_count?'<p class="lh-note lh-estimate">'+e(t('lhiEstimate'))+'</p>':'')+'</section>'+
   (notes.length?'<details class="lh-accuracy"><summary><span>'+e(t('lhiAccuracy'))+'</span>'+chevron+'</summary><ul>'+notes.map(function(pair){return '<li>'+e(t(pair[1],{n:n(row[pair[0]])}))+'</li>';}).join('')+'</ul></details>':'');
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
    (s.stage==='confirm'?'<p class="lh-once">'+e(t('lhiOnce'))+'</p>':'')+(s.stage==='choose'?'<div class="lh-run-field"><label for="lh-run">'+e(t('lhiSelect'))+'</label><select id="lh-run" class="lh-select"><option disabled>'+e(t('lhiRun1'))+'</option>'+(s.data.options||[]).map(function(item){return '<option value="'+item.from_run_number+'"'+(s.from===item.from_run_number?' selected':'')+'>Run #'+item.from_run_number+'</option>';}).join('')+'</select></div>':'')+summary(row)+'<aside class="lh-notice"><strong>'+e(t('lhiDirectTitle'))+'</strong><p>'+e(t('lhiDirect'))+'</p></aside><p class="lh-note lh-dates">'+e(t('lhiDates'))+'</p>':
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
  document.body.style.overflow='hidden';document.body.appendChild(root);root.onclick=function(event){event.stopPropagation();if(event.target===root){close();return;}var button=event.target.closest('[data-lh-action]');if(!button)return;var action=button.dataset.lhAction;if(action==='close')close();else if(action==='preview')read(true);else if(action==='submit')submit();else if(action==='retry')read(false);else if(action==='back'){current.stage='choose';render();}};
  root.onchange=function(event){if(event.target.id==='lh-run'){current.from=Number(event.target.value);render();}};
  root.onkeydown=function(event){if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){var nodes=Array.from(root.querySelectorAll('button:not(:disabled),select,summary')).filter(function(el){return el.getClientRects().length;});if(!nodes.length){event.preventDefault();return;}if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes[nodes.length-1].focus();}else if(!event.shiftKey&&document.activeElement===nodes[nodes.length-1]){event.preventDefault();nodes[0].focus();}}};
  render();root.querySelector('button').focus();read(false);if(window.syncTelegramBackButton)window.syncTelegramBackButton();
 }
 document.addEventListener('click',function(event){var button=event.target.closest('[data-lh-open],[data-lh-dismiss]');if(!button)return;event.preventDefault();event.stopPropagation();if(button.hasAttribute('data-lh-open'))open(button.dataset.lhOpen);else{var id=Number(button.dataset.lhDismiss);try{localStorage.setItem(key(id),'1');}catch(_){}button.closest('[data-lh-banner]').remove();}},true);
 window.LiveHistoryImport={banner:banner,footer:footer,open:open,close:close,pace:pace};window.closeLiveHistoryImport=close;
})();
