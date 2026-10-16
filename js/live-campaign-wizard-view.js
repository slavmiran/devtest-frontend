/* Shared fullscreen controls: entry + four focused campaign setup steps. */
(function(){
 'use strict';
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function n(v){return Number(v).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:1});}
 function hint(k){return '<p class="gtw-helper-text">'+e(t(k))+'</p>';}
 function chip(f,v,label,on,disabled){return '<button type="button" class="meta-chip lcw-chip '+(on?'accent-blue':'')+'" data-lcw-field="'+f+'" data-value="'+v+'" aria-pressed="'+!!on+'"'+(disabled?' disabled':'')+'>'+e(label)+'</button>';}
 function counter(f,v,min,max){
  return '<div class="lcw-counter"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':minus" data-value="'+(v-1)+'"'+(v<=min?' disabled':'')+'>−</button><input class="gtw-input lcw-quantity" type="number" inputmode="numeric" min="'+min+'" max="'+max+'" value="'+v+'" data-lcw-input="'+f+'" aria-label="'+e(t({daily:'lcwDaily',period:'lcwDuration',target:'lcgTarget',retention:'lcwRetentionLabel'}[f]))+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':plus" data-value="'+(v+1)+'"'+(v>=max?' disabled':'')+'>+</button></div>';
 }
 function toggle(f,k,on,disabled){return '<button type="button" class="pc-project-param lcw-toggle" role="switch" aria-checked="'+!!on+'" data-lcw-field="'+f+'" data-lcw-focus="'+f+'" data-value="'+!on+'"'+(disabled?' disabled':'')+'><span>'+e(t(k))+'</span><span class="meta-chip '+(on?'accent-blue':'')+'">'+e(t(on?'pcParamsOn':'pcParamsOff'))+'</span></button>';}
 function retention(d){
  return '<section class="lcw-panel"><div class="lcw-source"><h3>'+e(t('lcwRetentionLabel'))+'</h3>'+counter('retention',d.retention.days,7,35)+'</div><div class="lcw-chips">'+[7,14,21,30,35].map(function(day){return chip('retention',day,t('lcwDays',{n:day}),day===d.retention.days);}).join('')+'</div></section><section class="lcw-panel"><h3>'+e(t('lcwCheckpoints'))+'</h3><div class="lcw-chips">'+LiveCampaignDraft.checkpointOptions(d.retention.days).map(function(day){return chip('checkpoint',day,t(day===1?'lcwD1':'lcwDay',{n:day}),d.retention.checkpoints.includes(day),day===1);}).join('')+'</div>'+hint('lcwCheckpointHint')+'</section>';
 }
 function scenarios(d){
  return toggle('activity','lcwActivity',d.activity.enabled)+(d.activity.enabled?'<label class="gtw-label" for="lcw-instructions">'+e(t('lcgScenarioText'))+'</label><div class="gtw-input-wrapper gtw-input-wrapper--multiline"><textarea id="lcw-instructions" class="gtw-textarea" data-lcw-input="instructions" maxlength="5000">'+e(d.activity.instructions)+'</textarea></div>':'')+toggle('screenshot','lcwScreenshot',d.activity.screenshot,!d.activity.enabled)+toggle('reviews','lcwReviews',d.reviews.enabled)+hint('requestReviewsHint')+hint('lcwSoft');
 }
 function budget(d,c){
  var v=d.volume,q=LiveCampaignDraft.quote(d),safe=d.baseline.available?Math.max(1,Math.round(d.baseline.perDay*.3)):1;
  return '<label class="gtw-label" for="lcw-campaign-name">'+e(t('lcgCampaignName'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-campaign-name" maxlength="80" data-lcw-input="name" value="'+e(d.name)+'" placeholder="'+e(t('lcgOptional'))+'"></div>'+toggle('paced','lcgDailyLimit',v.paced)+
   (v.paced?'<section class="lcw-panel"><div class="lcw-source"><strong>'+e(t('lcwDaily'))+'</strong>'+counter('daily',v.dailyInstalls,1,500)+'</div><p class="gtw-helper-text">'+e(t('lcgCorridor',{n:safe}))+'</p><div class="lcw-source"><strong>'+e(t('lcwDuration'))+'</strong>'+counter('period',v.acquisitionDays,1,90)+'</div></section>':'<section class="lcw-panel lcw-source"><strong>'+e(t('lcgTarget'))+'</strong>'+counter('target',v.totalInstalls,1,100000)+'</section>'+hint('lcgUnpacedHint'))+
   '<section class="lcw-panel lcw-plan"><h3>'+e(t('lcwSummary'))+'</h3><strong>'+e(t('lcwInstalls',{n:n(q.installs)}))+'</strong><p>'+e(t('lcwTotal',{n:n(q.totalCommitment)}))+'</p>'+hint('lcgOnlyCheckpoints')+'</section>'+
   (c.capacity&&c.capacity.active>=c.capacity.limit?hint('lcgSavePaused'):'')+'<p class="lcw-input-error" role="status">'+e(c.saveError||'')+'</p>';
 }
 function body(d,step,c){return step===0?LiveCampaignEntry.body(d,c):[null,LiveCampaignSourcesView.body,retention,scenarios,budget][step](d,c);}
 function summary(d,step){
  if(step===1)return t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[d.source])+(d.source==='keywords'?' · '+d.keywords.length:'');
  if(step===2)return t('lcwRetentionSummary',{n:d.retention.days,days:d.retention.checkpoints.join('/')});
  if(step===3)return t('lcwActivitySummary',{scenario:t(d.activity.enabled?'pcParamsOn':'pcParamsOff'),reviews:t(d.reviews.enabled?'pcParamsOn':'pcParamsOff')});
  return d.volume.paced?t('lcwPaceSummary',{n:d.volume.dailyInstalls,days:d.volume.acquisitionDays}):t('lcwInstalls',{n:d.volume.totalInstalls});
 }
 function header(d,step,unlocked){
  if(step===0)return '<h1 class="gtw-header-title" id="lcw-title">'+e(t('lcwTitle'))+'</h1>';
  return '<button type="button" class="lcw-heading" data-lcw-action="outline" aria-expanded="false" aria-controls="lcw-outline"><span id="lcw-title">'+e(t('lcwStep',{n:step}))+' · '+e(t('lcwStep'+step))+' ▾</span><span class="gtw-progress-bar" aria-hidden="true">'+[1,2,3,4].map(function(i){return '<i class="gtw-progress-step'+(i<=step?' active':'')+'"></i>';}).join('')+'</span></button><nav id="lcw-outline" class="lcw-outline" hidden>'+[1,2,3,4].map(function(i){return '<button type="button" data-lcw-action="step" data-step="'+i+'"'+(i>unlocked?' disabled':'')+(i===step?' aria-current="step"':'')+'><b>'+i+'</b><span><strong>'+e(t('lcwStep'+i))+'</strong><small>'+e(i<=unlocked?summary(d,i):t('lcwStepLocked'))+'</small></span></button>';}).join('')+'<button type="button" data-lcw-action="entry">↺ '+e(t('lcgChangeTemplate'))+'</button></nav>';
 }
 function footer(d,step,expanded,c){
  if(step===0)return '';
  var q=LiveCampaignDraft.quote(d),short=function(x){return Number(x).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{notation:x>=10000?'compact':'standard',maximumFractionDigits:1});};
  var active=!!(c.capacity&&c.capacity.active<c.capacity.limit);
  return '<button type="button" class="lcw-estimate-line" data-lcw-action="estimate" aria-expanded="'+!!expanded+'" aria-controls="lcw-cost-details"><span>⚡ <b data-lcw-installs>'+short(q.installs)+'</b> '+e(t('lcwInstallUnit'))+' · '+(q.dailyCommitment==null?e(t('lcgByReports')):'~<b data-lcw-daily>'+short(q.dailyCommitment)+'</b> '+e(t('lcwBustDay')))+' · '+e(t('lcwTotalLabel'))+' <b data-lcw-total>'+short(q.totalCommitment)+'</b> $BUST</span><span class="lcw-details-label">'+e(t('lcwDetails'))+' '+(expanded?'▾':'▴')+'</span></button><section class="lcw-cost-details" id="lcw-cost-details"'+(expanded?'':' hidden')+'><p>'+e(t('lcwCostCheckpoint',{days:d.retention.checkpoints.length-1,unit:10,price:q.perInstall}))+'</p><p>'+e(t('lcwCostDuration',{acquisition:q.acquisitionDays==null?'∞':q.acquisitionDays,retention:d.retention.days}))+'</p><small>'+e(t('lcgOnlyCheckpoints'))+'</small></section><div class="lcw-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="'+(step===4?'save':'next')+'"'+(!LiveCampaignDraft.valid(d,step)||c.saving?' disabled':'')+'>'+e(t(c.saving?'lcgSaving':step===4?(active?'lcwLaunch':'lcgCreatePaused'):'lcwNext'))+'</button></div>';
 }
 window.LiveCampaignWizardView={body:body,header:header,summary:summary,footer:footer,text:t,number:n};
})();
