/* Shared fullscreen controls: entry + four focused campaign setup steps. */
(function(){
 'use strict';
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function n(v){return Number(v).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:1});}
 function hint(k){return '<p class="gtw-helper-text">'+e(t(k))+'</p>';}
 function chip(f,v,label,on,disabled){return '<button type="button" class="meta-chip lcw-chip '+(on?'accent-blue':'')+'" data-lcw-field="'+f+'" data-value="'+v+'" aria-pressed="'+!!on+'"'+(disabled?' disabled':'')+'>'+e(label)+'</button>';}
 function counter(f,v,min,max){
  return '<div class="lcw-counter"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':minus" data-value="'+(v-1)+'"'+(v<=min?' disabled':'')+'>−</button><input class="gtw-input lcw-quantity" type="number" inputmode="numeric" min="'+min+'" max="'+max+'" value="'+v+'" data-lcw-input="'+f+'" aria-label="'+e(t(f.indexOf('plan:')===0?'lpField_'+f.slice(5):f.indexOf('cap:')===0?'lpcCampaignCap':{daily:'lcpUsers',period:'lcwDuration',target:'lcgTarget',retention:'lcwRetentionLabel',pauseHours:'lcpPauseHours'}[f]))+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':plus" data-value="'+(v+1)+'"'+(v>=max?' disabled':'')+'>+</button></div>';
 }
 function toggle(f,k,on,disabled){return '<button type="button" class="pc-project-param lcw-toggle" role="switch" aria-checked="'+!!on+'" data-lcw-field="'+f+'" data-lcw-focus="'+f+'" data-value="'+!on+'"'+(disabled?' disabled':'')+'><span>'+e(t(k))+'</span><span class="meta-chip '+(on?'accent-blue':'')+'">'+e(t(on?'pcParamsOn':'pcParamsOff'))+'</span></button>';}
 function retention(d){
  return '<section class="lcw-panel"><div class="lcw-source"><h3>'+e(t('lcwRetentionLabel'))+'</h3>'+''+'</div><div class="lcw-chips">'+[7,14,21,28,35].map(function(day){return chip('retention',day,t('lcwDays',{n:day}),day===d.retention.days);}).join('')+'</div></section><section class="lcw-panel"><h3>'+e(t('lcwCheckpoints'))+'</h3><div class="lcw-chips">'+LiveCampaignDraft.checkpointOptions(d.retention.days).map(function(day){return chip('checkpoint',day,t(day===1?'lcwD1':'lcwDay',{n:day}),d.retention.checkpoints.includes(day),day===1);}).join('')+'</div>'+hint('lcwCheckpointHint')+'</section>';
 }
 function scenarios(d){
  return toggle('activity','lcwActivity',d.activity.enabled)+(d.activity.enabled?'<label class="gtw-label" for="lcw-instructions">'+e(t('lcgScenarioText'))+'</label><div class="gtw-input-wrapper gtw-input-wrapper--multiline"><textarea id="lcw-instructions" class="gtw-textarea" data-lcw-input="instructions" maxlength="5000">'+e(d.activity.instructions)+'</textarea></div>':'')+toggle('screenshot','lcwScreenshot',d.activity.screenshot,!d.activity.enabled)+(window.ReviewCredits?'<div class="rv-config-summary"><span>'+e(t(d.reviews.enabled?'pcParamsOn':'pcParamsOff'))+' · '+e(t('rvDay',{n:d.reviews.config&&d.reviews.config.day||d.reviews.delayDays||7}))+'</span><button type="button" class="meta-chip" data-lcw-action="review-settings">'+e(t('rvConfigure'))+'</button></div>':toggle('reviews','lcwReviews',d.reviews.enabled)+hint('requestReviewsHint')+hint('lcwSoft'));
 }
 function budget(d,c){return LiveCampaignPaceView.body(d,c,{counter:counter,toggle:toggle,hint:hint,chip:chip});}
 function body(d,step,c){return step===0?LiveCampaignEntry.body(d,c):[null,LiveCampaignSourcesView.body,retention,scenarios,budget][step](d,c);}
 function summary(d,step){
  if(step===1)return t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[d.source])+(d.source==='keywords'?' · '+d.keywords.length:'')+(d.country?' · '+t('lcGeoTag',{country:d.country}):'');
  if(step===2)return t('lcwRetentionSummary',{n:d.retention.days,days:d.retention.checkpoints.join('/')});
  if(step===3)return t('lcwActivitySummary',{scenario:t(d.activity.enabled?'pcParamsOn':'pcParamsOff'),reviews:t(d.reviews.enabled?'pcParamsOn':'pcParamsOff')});
  if(d.volume.paced&&d.volume.manualPlan){var p=d.volume.manualPlan;return t('lpSummary',{n:p.strategy==='wave'?p.minInstalls+'–'+p.maxInstalls:p.startInstalls+'→'+p.targetInstalls});}
  return d.volume.paced?t('lcpQuotaSummary',{n:Math.min(d.volume.dailyInstalls,d.volume.totalInstalls),total:d.volume.totalInstalls}):t('lcwInstalls',{n:d.volume.totalInstalls});
 }
 function header(d,step,unlocked,editing){
  if(step===0)return '<h1 class="gtw-header-title" id="lcw-title">'+e(t('lcwTitle'))+'</h1>';
  return '<button type="button" class="lcw-heading" data-lcw-action="outline" aria-expanded="false" aria-controls="lcw-outline"><span id="lcw-title">'+e(t('lcwStep',{n:step}))+' · '+e(t('lcwStep'+step))+' ▾</span><span class="gtw-progress-bar" aria-hidden="true">'+[1,2,3,4].map(function(i){return '<i class="gtw-progress-step'+(i<=step?' active':'')+'"></i>';}).join('')+'</span></button><nav id="lcw-outline" class="lcw-outline" hidden>'+[1,2,3,4].map(function(i){return '<button type="button" data-lcw-action="step" data-step="'+i+'"'+(i>unlocked?' disabled':'')+(i===step?' aria-current="step"':'')+'><b>'+i+'</b><span><strong>'+e(t('lcwStep'+i))+'</strong><small>'+e(i<=unlocked?summary(d,i):t('lcwStepLocked'))+'</small></span></button>';}).join('')+(editing?'':'<button type="button" data-lcw-action="entry">↺ '+e(t('lcgChangeTemplate'))+'</button>')+'</nav>';
 }
 function footer(d,step,expanded,c){
  if(step===0)return '';
  var q=LiveCampaignDraft.quote(d),short=function(x){return Number(x).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{notation:x>=10000?'compact':'standard',maximumFractionDigits:1});};
  if(d.volume.mode!=='auto'&&d.volume.paced&&c.projectControl&&c.projectControl.ownLimit)q.dailyCommitment=Math.min(q.dailyCommitment,c.projectControl.ownLimit*24/d.volume.pauseHours*q.perInstall);
  var active=!!(c.capacity&&c.capacity.active<c.capacity.limit);
  return '<button type="button" class="lcw-estimate-line" data-lcw-action="estimate" aria-expanded="'+!!expanded+'" aria-controls="lcw-cost-details"><span>⚡ <b data-lcw-installs>'+short(q.installs)+'</b> '+e(t('lcwInstallUnit'))+' · '+(q.dailyCommitment==null?e(t('lcgByReports')):'~<b data-lcw-daily>'+short(q.dailyCommitment)+'</b> '+e(t('lcwBustDay')))+' · '+e(t('lcwTotalLabel'))+' <b data-lcw-total>'+short(q.totalCommitment)+'</b> $BUST</span><span class="lcw-details-label">'+e(t('lcwDetails'))+' '+(expanded?'▾':'▴')+'</span></button><section class="lcw-cost-details" id="lcw-cost-details"'+(expanded?'':' hidden')+'><p>'+e(t('lcwCostCheckpoint',{days:d.retention.checkpoints.length-1,unit:10,price:q.perInstall}))+'</p><p>'+e(t(d.volume.manualPlan&&d.volume.mode==='manual'?'lpCostDuration':'lcpCostDuration',{retention:d.retention.days}))+'</p><small>'+e(t('lcgOnlyCheckpoints'))+'</small></section><div class="lcw-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="'+(step===4?'save':'next')+'"'+(!LiveCampaignDraft.valid(d,step)||c.saving||step===4&&!c.projectControl?' disabled':'')+'>'+e(t(c.saving?'lcgSaving':step===4?(c.editing?'lceSave':active?'lcwLaunch':'lcgCreatePaused'):'lcwNext'))+'</button></div>';
 }
 window.LiveCampaignWizardView={body:body,header:header,summary:summary,footer:footer,text:t,number:n,controls:{counter:counter,chip:chip,toggle:toggle}};
})();
