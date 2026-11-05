/* One pace editor and a read-only 14-day planning preview. Admission stays server-owned. */
(function(){
 'use strict';
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(s){return window.escapeHTML(String(s==null?'':s));}
 function autoGap(c){var q=Math.max(1,Number(c&&c.U_opt)||1);return {min:Math.max(1,Math.min(30,Math.floor(1080/q))),max:Math.max(1,Math.min(90,Math.floor(1440/q)))};}
 function forecast(d){
  var v=d.volume,mode=v.mode||(v.paced?'manual':'free'),c=d.corridor,p=v.manualPlan,values=[],source='plan';
  var corridor=c&&Number.isFinite(c.L_floor)&&Number.isFinite(c.U_opt)&&c.U_opt>=c.L_floor&&c.L_floor>=0?c:null;
  if(mode==='auto'){
   source='illustration';var wave=[.7,.85,.8,.9,.75,1,.85,.9,.8,.95,.85,1,.9,.85];
   values=wave.map(function(x){return corridor?Math.round(c.L_floor+(c.U_opt-c.L_floor)*x):null;});
  }else if(mode==='free')values=Array(14).fill(null);
  else if(p){
   var plan=LiveManualPlan.preview(d);values=plan.values;source=plan.source;
  }else{
   source='legacy';values=Array.from({length:14},function(_,i){return Math.max(1,Math.round(LiveCampaignPace.quota(v.dailyInstalls,v.rampDays,i+1)*24/v.pauseHours));});
  }
  var targets=values.slice(),ceiling=Number.isFinite(d.paceCampaignCapacity)?d.paceCampaignCapacity:Infinity,goals=targets.map(function(n){return Number.isFinite(n)?Math.min(n,ceiling):n;}),recoveryUntil=0,gap=mode==='auto'?autoGap(c):p?{min:p.gapMinMinutes,max:p.gapMaxMinutes}:null;
  values=goals;
  if(gap&&mode!=='free')values=goals.map(function(goal,i){
   if(!Number.isFinite(goal))return null;
   var at=Math.max(i*1440,recoveryUntil),end=(i+1)*1440,count=0,spacing=mode==='auto'?'interval':p.spacing,batch=p&&p.batchSize||1,minutes=(gap.min+gap.max)/2;
   while(count<goal&&at<end){count++;if(count===goal){if(mode==='manual')recoveryUntil=at+(p.pauseMinHours+p.pauseMaxHours)/2*60;break;}if(spacing==='interval'||spacing==='micro'&&count%batch===0)at+=Math.max(1,minutes);}
   return count;
  });
  var numbers=values.filter(Number.isFinite),min=numbers.length?Math.min(...numbers):null,max=numbers.length?Math.max(...numbers):null;
  return {values:values,targets:targets,mode:mode,corridor:corridor,source:source,min:min,max:max,quota:mode==='free'?null:mode==='auto'?corridor&&corridor.U_opt:targets[0],above:!!corridor&&numbers.some(function(x){return x>c.U_opt;}),below:!!corridor&&numbers.some(function(x){return x<c.L_floor;}),campaignLimited:targets.some(function(x){return Number.isFinite(x)&&x>ceiling;}),spacingLimited:values.some(function(x,i){return Number.isFinite(x)&&x<goals[i];})};
 }
 function summary(d,f){
  var p=d.volume.manualPlan,c=f.corridor,gap=f.mode==='auto'?autoGap(c):p?{min:p.gapMinMinutes,max:p.gapMaxMinutes}:null;
  var rate=f.mode==='free'?t('lppOpenCeiling'):f.min==null?t('lpcCorridorLoading'):t('lppRate',{min:f.min,max:f.max});
  var hours=p&&p.spacing==='micro'&&gap.min%60===0&&gap.max%60===0;
  var spacing=f.mode==='free'?'':gap?t(f.mode==='auto'||p.spacing==='interval'?'lppDripSummary':p.spacing==='micro'?hours?'lppMicroHours':'lppMicroSummary':'lppBurstSummary',{min:hours?gap.min/60:gap.min,max:hours?gap.max/60:gap.max,n:p&&p.batchSize}):t('lppLegacySummary');
  var risk=f.mode==='free'?t('lppFreeRisk'):!c?t('lppUnknown'):f.above&&f.below?t('lppBothRisk'):f.above?t('lppAbove'):f.below?t('lppBelow'):t('lppWithin');
  return [rate,spacing,risk].filter(Boolean).join(' · ');
 }
 function preview(d){
  var f=forecast(d),c=f.corridor,upper=c?c.U_opt:0,lower=c?c.L_floor:0,scale=Math.max(1,upper,f.max||0)*1.2,base=140,height=108,left=31,step=26;
  function y(n){return base-Math.max(0,n)/scale*height;}
  var svg='<svg class="lpp-chart" viewBox="0 0 406 166" role="img" aria-label="'+e(t('lppForecast')+' · '+summary(d,f))+'">';
  if(c)svg+='<rect class="lpp-corridor-band" x="27" y="'+y(upper)+'" width="373" height="'+Math.max(2,(upper-lower)/scale*height)+'" rx="5"/><path class="lpp-corridor-line" d="M27 '+y(upper)+' H400 M27 '+y(lower)+' H400"/><text class="lpp-axis" x="23" y="'+(y(upper)-3)+'" text-anchor="end">'+upper+'</text><text class="lpp-axis" x="23" y="'+(y(lower)+10)+'" text-anchor="end">'+lower+'</text>';
  svg+='<path class="lpp-zero" d="M27 140 H400"/>';
  f.values.forEach(function(n,i){var x=left+i*step,day=t('lppDay',{n:i+1});svg+='<g data-lpp-day="'+(i+1)+'" data-value="'+(n==null?'':n)+'"><title>'+e(day+' · '+(n==null?t(f.mode==='free'?'lppOpenCeiling':'lppUnknown'):n+' '+t('lcwInstallUnit')))+'</title>';
   if(n==null)svg+=f.mode==='free'?'<path class="lpp-open-bar" d="M'+(x+8)+' 138 V47 m-4 5 4-5 4 5"/>':'<path class="lpp-zero" d="M'+x+' 138 h17"/>';
   else{
    var below=c&&n<lower,within=Math.min(n,c?upper:n);
    svg+='<rect class="lpp-bar '+(below?'is-low':'is-normal')+'" x="'+x+'" y="'+y(within)+'" width="17" height="'+Math.max(1,base-y(within))+'" rx="3"/>';
    if(c&&n>upper)svg+='<rect class="lpp-bar is-high" x="'+x+'" y="'+y(n)+'" width="17" height="'+(y(upper)-y(n))+'" rx="3"/>';
    svg+='<text class="lpp-value" x="'+(x+8)+'" y="'+Math.max(12,y(n)-5)+'" text-anchor="middle">'+n+'</text>';
   }
   svg+='<text class="lpp-day" x="'+(x+8)+'" y="157" text-anchor="middle">'+e(day)+'</text></g>';
  });
  return '<header class="lpp-forecast-head"><h4>'+e(t('lppForecast'))+'</h4><span>UTC</span></header>'+(c?'<p class="lpp-corridor-label">'+e(t('lppCorridor',{min:lower,max:upper,base:c.B_t}))+'</p>':'<p class="gtw-helper-text">'+e(t('lpcCorridorLoading'))+'</p>')+svg+'</svg><p class="lpp-summary" data-lpp-summary>'+e(summary(d,f))+'</p>'+(f.campaignLimited?'<p class="lpp-capacity-note">'+e(t('lppCampaignCapacity'))+'</p>':'')+(f.spacingLimited?'<p class="lpp-capacity-note">'+e(t('lppSpacingCapacity'))+'</p>':'')+'<details class="lpp-explain" data-lpc-open="forecast"><summary>'+e(t('lppForecastInfo'))+'</summary><p>'+e(t('lppForecastHint'))+'</p><p>'+e(t(f.source==='server'?'lppServerPreview':f.source==='legacy'?'lppLegacyPreview':f.source==='illustration'?'lppExamplePreview':'lppPlanPreview'))+'</p><div class="lpp-legend"><span class="is-normal">'+e(t('lppWithin'))+'</span><span class="is-high">'+e(t('lppAbove'))+'</span><span class="is-low">'+e(t('lppBelow'))+'</span></div></details>';
 }
 function thermal(d){return window.LiveMarketUI?LiveMarketUI.phase(d.thermalPhase):'';}
 function warning(d){var f=forecast(d);return f.above||f.below?'<p class="lcp-note is-warn">'+e(t(f.above&&f.below?'lppBothRisk':f.above?'lppAbove':'lppBelow'))+'</p>':'';}
 function policy(d,V){
  var mode=d.volume.mode||(d.volume.paced?'manual':'free'),c=d.corridor;
  return '<div class="lpc-global-policy"><section class="lpp-forecast" data-lcw-pace-preview>'+preview(d)+'</section><div class="lcp-modes" role="group" aria-label="'+e(t('lcpMode'))+'">'+['auto','manual','free'].map(function(key){return '<button type="button" class="pc-project-param '+(mode===key?'is-selected':'')+'" data-lcw-field="mode" data-value="'+key+'" aria-pressed="'+(mode===key)+'">'+e(t({auto:'lppAuto',manual:'lppManual',free:'lppFree'}[key]))+'</button>';}).join('')+'</div>'+
   (mode==='auto'?'<section class="lcw-panel lcp-auto"><strong>'+e(t('lpcAutoDaily',{n:c?c.U_opt:'—'}))+'</strong><p>'+e(t('lppAutoHint'))+'</p><small>'+e(t(d.autoDailyCost?'lpcAutoPrice':'lpcAutoFree',{n:d.autoDailyCost}))+'</small></section>':mode==='free'?'<p class="lcp-note is-warn">'+e(t('lppFreeHint'))+'</p>':d.volume.manualPlan?LiveManualPlan.body(d,V):'<aside class="lcw-panel lpp-legacy-notice"><strong>'+e(t('lppLegacyActive'))+'</strong><p>'+e(t('lpLegacyHint'))+'</p>'+V.chip('dailyPlan',1,t('lppUseDaily'),false)+'</aside>')+'</div>';
 }
 function hours(v,V){return '<label class="lmp-field"><span>'+e(t('lcpPauseHours'))+'</span>'+V.counter('pauseHours',v.pauseHours,6,48)+'</label><div class="lcw-chips">'+[6,12,24,36,48].map(function(h){return V.chip('pauseHours',h,h+' '+t('lcpHours'),h===v.pauseHours);}).join('')+'</div><p class="gtw-helper-text" data-lcw-pause-hint>'+e(t(v.pauseHours>24?'lpLongRecovery':'lcpShortPause'))+'</p>';}
 function advanced(d,V){
  var v=d.volume,p=v.manualPlan,mode=v.mode||(v.paced?'manual':'free');if(mode!=='manual')return '';
  function field(k){return '<label class="lmp-field"><span>'+e(t('lpField_'+k))+'</span>'+V.counter('plan:'+k,p[k],6,48)+'</label>';}
  var recovery=p?'<h4>'+e(t('lpRecovery'))+'</h4><div class="lcw-chips">'+[[6,12],[12,24],[36,48]].map(function(r){return V.chip('plan:pausePreset',r.join('_'),r.join('–')+' '+t('lcpHours'),p.pauseMinHours===r[0]&&p.pauseMaxHours===r[1]);}).join('')+'</div><div class="lmp-range">'+field('pauseMinHours')+field('pauseMaxHours')+'</div><p class="gtw-helper-text" data-lmp-pause-hint>'+e(t(p.pauseMaxHours>24?'lpLongRecovery':'lpRecoveryHint'))+'</p>':'<h4>'+e(t('lppLegacyActive'))+'</h4><label class="lmp-field"><span>'+e(t('lcpUsers'))+'</span>'+V.counter('daily',v.dailyInstalls,1,500)+'</label><div class="lcw-chips">'+[0,7,10,14].map(function(n){return V.chip('rampDays',n,t(n?'lcwDays':'lcpNoRamp',{n:n}),v.rampDays===n);}).join('')+'</div>'+hours(v,V);
  return '<details class="lpp-advanced lcw-panel" data-lpc-open="advanced"><summary>'+e(t('lppAdvanced'))+'</summary><div class="lpp-advanced-body">'+recovery+'<h4>'+e(t('lppContractExceptions'))+'</h4>'+V.toggle('allowContractsDuringPause','lcpContractsException',v.allowContractsDuringPause)+(v.allowContractsDuringPause?'<div class="lcw-chips">'+[2,5,0].map(function(n){return V.chip('contractsDuringPauseLimit',n,t(n?'lppContractCap':'lppNoCap',{n:n}),(v.contractsDuringPauseLimit||0)===n);}).join('')+'</div><p class="gtw-helper-text">'+e(t('lppExceptionHint'))+'</p>':'')+'<p class="gtw-helper-text">'+e(t('lpSpacingHint'))+'</p><div data-lpc-thermal-phase>'+thermal(d)+'</div>'+(p?'<button type="button" class="lh-link lpp-legacy-link" data-lcw-field="plan:strategy" data-value="legacy">'+e(t('lpLegacyReturn'))+'</button>':'')+'</div></details>';
 }
 function editor(d,c,V,includeOwn){LiveProjectControl.prepareForecast(d,c,includeOwn);return policy(d,V)+LiveProjectControl.distribution(d,c,V,includeOwn)+advanced(d,V);}
 function body(d,c,V){
  return editor(d,c.projectControl,V,true)+'<section class="lcw-panel lpp-campaign-budget"><label class="gtw-label" for="lcw-campaign-name">'+e(t('lcgCampaignName'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-campaign-name" maxlength="80" data-lcw-input="name" value="'+e(d.name)+'" placeholder="'+e(t('lcgOptional'))+'"></div><div class="lcw-chips" role="group" aria-label="'+e(t('lpcIcon'))+'">'+Object.keys(LiveCampaignGrowthCard.icons).map(function(k){return '<button class="meta-chip lcw-chip" type="button" data-lcw-icon="'+k+'" aria-pressed="'+(d.icon===k)+'">'+LiveCampaignGrowthCard.icons[k]+'</button>';}).join('')+'<button class="meta-chip lcw-chip" type="button" data-lcw-icon="none">'+e(t('lpcNoIcon'))+'</button></div><p class="lcw-input-error" data-lpc-display-error>'+e(!d.icon&&!d.name.trim()?t('lpcDisplayRequired'):'')+'</p><h3>'+e(t('lbVolume'))+'</h3><div class="lcw-chips">'+V.chip('limit_mode','budget',t('lbBudget'),d.volume.limit_mode==='budget')+V.chip('limit_mode','installs',t('lbFinite'),d.volume.limit_mode!=='budget')+'</div>'+(d.volume.limit_mode==='budget'?'<p class="gtw-helper-text">'+e(t('lbBudgetHint'))+'</p>':V.counter('target',d.volume.totalInstalls,1,100000))+'</section><p class="lcw-input-error" role="status">'+e(c.saveError||'')+'</p>';
 }
 function refreshWarning(root,d){var n=root.querySelector('[data-lpc-corridor-warning]');if(n)n.innerHTML=warning(d);var error=root.querySelector('[data-lmp-validation]');if(error)error.textContent=LiveManualPlan.valid(d.volume.manualPlan)&&!root.querySelector('[aria-invalid="true"]')?'':t('lpInvalid');var pause=root.querySelector('[data-lmp-pause-hint]');if(pause&&d.volume.manualPlan)pause.textContent=t(d.volume.manualPlan.pauseMaxHours>24?'lpLongRecovery':'lpRecoveryHint');}
 function refreshHours(root,v){root.querySelectorAll('[data-lcw-input="pauseHours"]').forEach(function(input){input.value=v.pauseHours;});var hint=root.querySelector('[data-lcw-pause-hint]');if(hint)hint.textContent=t(v.pauseHours>24?'lpLongRecovery':'lcpShortPause');}
 window.LiveCampaignPaceView={body:body,editor:editor,policy:policy,advanced:advanced,thermal:thermal,preview:preview,forecast:forecast,summary:summary,warning:warning,autoGap:autoGap,refreshHours:refreshHours,refreshWarning:refreshWarning};
})();
