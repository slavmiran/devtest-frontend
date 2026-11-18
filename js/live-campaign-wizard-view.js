/* Shared fullscreen controls: route overview + focused campaign setup sheets. */
(function(){
 'use strict';
 var ORDER=[1,'geo',2,3,'feedback',4];
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function n(v,digits=1){return Number(v).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:digits});}
 function hint(k){return '<p class="gtw-helper-text">'+e(t(k))+'</p>';}
 function chip(f,v,label,on,disabled){return '<button type="button" class="meta-chip lcw-chip '+(on?'accent-blue':'')+'" data-lcw-field="'+f+'" data-value="'+v+'" aria-pressed="'+!!on+'"'+(disabled?' disabled':'')+'>'+e(label)+'</button>';}
 function seg(f,v,label,on,disabled){return '<button type="button" class="lcw-seg-btn" data-lcw-field="'+f+'" data-value="'+v+'" aria-pressed="'+!!on+'"'+(disabled?' disabled':'')+'>'+e(label)+'</button>';}
 function segGroup(label,items){return '<div class="lcw-seg" role="group" aria-label="'+e(label)+'">'+items.join('')+'</div>';}
 function counter(f,v,min,max,step){step=step||1;
  return '<div class="lcw-counter" data-increment="'+step+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':minus" data-value="'+Math.max(min,v-step)+'"'+(v<=min?' disabled':'')+'>−</button><input class="gtw-input lcw-quantity" type="number" inputmode="numeric" min="'+min+'" max="'+max+'" value="'+v+'" data-lcw-input="'+f+'" aria-label="'+e(t(f.indexOf('plan:')===0?'lpField_'+f.slice(5):f.indexOf('cap:')===0?'lpcCampaignCap':{minDays:'ldMinDays',maxDays:'ldMaxDays',checkpointCount:'ldCheckpointCount',checkpointInterval:'ldCheckpointInterval',daily:'lcpUsers',period:'lcwDuration',target:'lcgTarget',retention:'lcwRetentionLabel',pauseHours:'lcpPauseHours'}[f]))+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':plus" data-value="'+Math.min(max,v+step)+'"'+(v>=max?' disabled':'')+'>+</button></div>';
 }
 function format(fmt,v){return fmt==='count'?t('bpCountValue',{n:v}):fmt==='every'?t('bpEveryDays',{n:v}):t('lcwDays',{n:v});}
 function percent(v,min,max){return max>min?Math.round((v-min)*1000/(max-min))/10:100;}
 function slider(f,v,min,max,labelKey,fmt){
  v=Math.min(max,Math.max(min,v));
  return '<div class="lcw-slider"><div class="lcw-slider-head"><span>'+e(t(labelKey))+'</span><output>'+e(format(fmt,v))+'</output></div>'+
   '<input type="range" class="lcw-range" data-lcw-input="'+f+'" data-lcw-fmt="'+(fmt||'days')+'" min="'+min+'" max="'+max+'" step="1" value="'+v+'" aria-label="'+e(t(labelKey))+'"'+(min>=max?' disabled':'')+' style="--p:'+percent(v,min,max)+'%">'+
   '<div class="lcw-slider-scale" aria-hidden="true"><span>'+e(format(fmt,min))+'</span><span>'+e(format(fmt,max))+'</span></div></div>';
 }
 function sliderValues(d){
  var r=d.retention,days=r.days,limit=Math.max(1,Math.min(59,days-1));
  return {retention:[r.days,r.min_days||r.days,r.max_days||r.days],minDays:[r.min_days||r.days,3,60],maxDays:[r.max_days||r.days,3,60],
   checkpointCount:[r.checkpoint_count||r.checkpoints.length-1,1,limit],checkpointInterval:[r.checkpoint_interval||7,1,limit]};
 }
 function syncRanges(root,d){
  var values=sliderValues(d);
  root.querySelectorAll('input.lcw-range[data-lcw-input]').forEach(function(el){
   var row=values[el.dataset.lcwInput];if(!row)return;
   el.min=row[1];el.max=row[2];el.disabled=row[1]>=row[2];
   if(document.activeElement!==el)el.value=row[0];
   var value=Number(el.value);
   el.style.setProperty('--p',percent(value,row[1],row[2])+'%');
   var out=el.closest('.lcw-slider')?.querySelector('output');if(out)out.textContent=format(el.dataset.lcwFmt,value);
  });
 }
 function toggle(f,k,on,disabled,hintKey){return '<button type="button" class="pc-project-param lcw-toggle" role="switch" aria-checked="'+!!on+'" data-lcw-field="'+f+'" data-lcw-focus="'+f+'" data-value="'+!on+'"'+(disabled?' disabled':'')+'><span class="lcw-toggle-copy"><strong>'+e(t(k))+'</strong>'+(hintKey?'<small>'+e(t(hintKey))+'</small>':'')+'</span><span class="meta-chip '+(on?'accent-blue':'')+'">'+e(t(on?'pcParamsOn':'pcParamsOff'))+'</span></button>';}
 function section(title,body,aside,attrs){return '<section class="lcw-panel bp-sec"'+(attrs||'')+'><header class="bp-sec-head"><h3>'+title+'</h3>'+(aside?'<span>'+aside+'</span>':'')+'</header>'+body+'</section>';}
 function days(d){var r=d.retention;return [r.min_days||r.days,r.max_days||r.days];}
 function rangeLabel(d){var [min,max]=days(d);return min===max?t('lcwDays',{n:min}):t('bpRange',{min:min,max:max});}
 function chooseDays(d){
  var r=d.retention,[min,max]=days(d),choices=[7,14,21,28,35].filter(function(day){return min<=day&&day<=max;});
  if(!choices.includes(r.days))choices.push(r.days);
  return segGroup(t('ldPreferredDays'),choices.sort(function(a,b){return a-b;}).map(function(day){
   return seg('retention',day,(day===r.days?'⭐ ':'')+t('lcwDays',{n:day}),day===r.days);
  }));
 }
 function opening(d){
  var config=window.ProjectFeedback?.cachedSettings(d.appId)?.impression, end=d.retention.days;
  return config&&config.mode!=='off'?Math.min(end,config.day||Math.max(2,end-4)):null;
 }
 function timeline(d, compact){
  var r=d.retention,length=Math.max(2,r.days),points=new Map(),day=opening(d);
  function mark(at,kind){if(!points.has(at))points.set(at,[]);points.get(at).push(kind);}
  r.checkpoints.forEach(function(at){mark(at,at===1?'start':at===r.days?'final':'check');});
  var scenario=d.activity.enabled?Math.min(r.days,d.activity.open_day||1):null;
  if(scenario)Array.from({length:d.activity.iterations_count||1},function(_,i){return scenario+i*(d.activity.iterations_interval_days||1);}).filter(function(v){return v<=r.days;}).forEach(function(v){mark(v,'scenario');});
  if(day)mark(day,'feedback');
  function pos(at){return Math.round((at-1)*1000/(length-1))/10;}
  var sorted=Array.from(points.keys()).sort(function(a,b){return a-b;}),gap=compact?17:13,first=sorted[0],last=sorted[sorted.length-1],kept=[first];
  sorted.slice(1,-1).forEach(function(at){
   if(pos(at)-pos(kept[kept.length-1])>=gap&&pos(last)-pos(at)>=gap)kept.push(at);
  });
  if(last!==first)kept.push(last);
  var dots=sorted.map(function(at){
   var kinds=points.get(at),base=kinds.find(function(k){return ['start','check','final'].includes(k);});
   return (base?'<span class="bp-tl-dot is-'+base+'" style="left:'+pos(at)+'%"></span>':'')+kinds.filter(function(k){return k==='scenario'||k==='feedback';}).map(function(k,j){
    return '<span class="bp-tl-flag is-'+k+'" style="left:'+pos(at)+'%;--row:'+j+'">'+(k==='scenario'?'🎯':'⭐')+'</span>';
   }).join('');
  }).join('');
  var labels=kept.map(function(at,i){
   var kinds=points.get(at),paid=kinds.some(function(k){return k==='check'||k==='final';});
   return '<span class="'+(i===0?'is-first':i===kept.length-1?'is-last':'')+'" style="left:'+pos(at)+'%"><b>D'+at+'</b>'+(!compact&&kinds.some(function(k){return ['start','check','final'].includes(k);})?'<small>'+e(paid?'10 $BUST':t('bpFree'))+'</small>':'')+'</span>';
  }).join('');
  var legend=compact?'':'<ul class="bp-tl-legend"><li><i class="is-start"></i>'+e(t('bpLegendStart'))+'</li><li><i class="is-check"></i>'+e(t('bpLegendCheck'))+'</li>'+
   (scenario?'<li><i class="is-scenario"></i>'+e(t('bpScenarioMarker'))+'</li>':'')+(day?'<li><i class="is-feedback"></i>'+e(t('bpFeedbackMarker'))+'</li>':'')+'</ul>';
  return '<div class="bp-timeline'+(compact?' is-mini':'')+'" role="img" aria-label="'+e(sorted.map(function(at){return 'D'+at;}).join(', '))+'"><div class="bp-tl-track"><i></i>'+dots+'</div><div class="bp-tl-labels">'+labels+'</div>'+legend+'</div>';
 }
 function retention(d){
  var r=d.retention,[min,max]=days(d),presets=[[7,14],[7,28],[14,35]];
  var interval=r.checkpoint_mode==='interval',values=sliderValues(d);
  ['checkpointCount','checkpointInterval'].forEach(function(k){values[k][0]=Math.min(values[k][0],values[k][2]);});
  var duration=section(e(t('bpDurationTitle')),
   '<p class="bp-sec-lead">'+e(t('bpRangeHelp'))+'</p>'+
   '<div class="lcw-seg" role="group" aria-label="'+e(t('bpPresets'))+'">'+presets.map(function([a,b]){
    return '<button type="button" class="lcw-seg-btn" data-lcw-range="'+a+':'+b+'" aria-pressed="'+(min===a&&max===b)+'">'+e(a+'–'+b)+'</button>';
   }).join('')+'<button type="button" class="lcw-seg-btn" data-lcw-range="fixed" aria-pressed="'+(min===max)+'">'+e(t('bpFixed'))+'</button></div>'+
   slider('minDays',min,3,60,'ldMinDays')+slider('maxDays',max,3,60,'ldMaxDays'),
   e(rangeLabel(d)));
  var preferred=section('⭐ '+e(t('bpPreferredTitle')),
   (min===max?'<p class="bp-sec-lead">'+e(t('lcwDays',{n:r.days}))+'</p>':slider('retention',r.days,min,max,'ldPreferredDays'))+
   '<p class="bp-sec-note">'+e(t('bpPreferredHelp'))+'</p>');
  var paid=r.checkpoints.length-1;
  var checkpoints=section(e(t('lcwCheckpoints')),
   segGroup(t('lcwCheckpoints'),[seg('checkpointCount',values.checkpointCount[0],t('bpByCount'),!interval),seg('checkpointInterval',values.checkpointInterval[0],t('bpByInterval'),interval)])+
   (interval?slider('checkpointInterval',values.checkpointInterval[0],1,values.checkpointInterval[2],'ldCheckpointInterval','every'):slider('checkpointCount',values.checkpointCount[0],1,values.checkpointCount[2],'ldCheckpointCount','count'))+
   timeline(d,false)+'<p class="bp-kd-summary">'+e(t('bpSummaryKD',{n:r.checkpoints.length,price:paid*10}))+'</p><small class="bp-sec-note">'+e(t('ldCheckpointsHint'))+'</small>',
   e(t('bpCountValue',{n:paid})),' data-bp-timeline');
  return duration+preferred+checkpoints;
 }
 function scenarios(d){
  var refs=d.activity.screenshots||[];
  var gallery=refs.length?'<details class="lr-scenario-preview"><summary>'+e(t('lseLegacyMedia'))+'</summary>'+Array.from({length:refs.length},function(_,i){return LiveCampaignSourcesView.screenshot('scenario:'+i,refs[i]);}).join('')+'</details>':'';
  return toggle('activity','lcwActivity',d.activity.enabled,false,'bpScenarioHint')+(d.activity.enabled?LiveScenarioEditor.body(d.activity,d.retention.min_days||d.retention.days)+gallery:'');
 }
 function campaignVolume(d,c){
  var icons=Object.keys(LiveCampaignGrowthCard.icons).map(function(k){return '<button class="bp-icon-tile" type="button" data-lcw-icon="'+k+'" aria-pressed="'+(d.icon===k)+'">'+LiveCampaignGrowthCard.icons[k]+'</button>';}).join('')+
   '<button class="bp-icon-tile is-none" type="button" data-lcw-icon="none" aria-pressed="'+(!d.icon)+'">'+e(t('lpcNoIcon'))+'</button>';
  var card=section(e(t('bpCardTitle')),
   '<label class="gtw-label" for="lcw-campaign-name">'+e(t('lcgCampaignName'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-campaign-name" maxlength="80" data-lcw-input="name" value="'+e(d.name)+'" placeholder="'+e(t('lcgOptional'))+'"></div>'+
   '<span class="gtw-label">'+e(t('lpcIcon'))+'</span><div class="bp-icon-grid" role="group" aria-label="'+e(t('lpcIcon'))+'">'+icons+'</div>'+
   '<p class="lcw-input-error" data-lpc-display-error>'+e(!d.icon&&!d.name.trim()?t('lpcDisplayRequired'):'')+'</p>');
  var finite=d.volume.limit_mode!=='budget';
  var volume=section(e(t('lbVolume')),
   segGroup(t('lbVolume'),[seg('limit_mode','budget',t('lbBudget'),!finite),seg('limit_mode','installs',t('lbFinite'),finite)])+
   (finite?'<div class="bp-target"><span class="gtw-label">'+e(t('lcgTarget'))+'</span>'+counter('target',d.volume.totalInstalls,1,100000)+'</div><div class="lcw-chips bp-quick">'+[50,100,250,500,1000].map(function(v){return chip('target',v,n(v,0),d.volume.totalInstalls===v);}).join('')+'</div>':'<p class="bp-sec-note">'+e(t('lbBudgetHint'))+'</p>'));
  return card+volume+toggle('routePriority','bpRoutePriority',!!d.routePriority,false,'bpRoutePriorityHint')+'<p class="bp-sec-note bp-pace-note">'+e(t('lcwPaceNote'))+'</p>'+(window.LiveContracts?LiveContracts.ownerSettings(d):'')+'<p class="lcw-input-error" role="status">'+e((c&&c.saveError)||'')+'</p>';
 }
 var TEMPLATES={aso:'🔍',retention:'🛡️',deep:'🎯',custom:'↺'};
 function templateStrip(d){
  return '<section class="bp-templates"><div class="bp-templates-head"><strong>'+e(t('bpTemplates'))+'</strong><small>'+e(t('bpTemplatesHint'))+'</small></div><div class="bp-template-grid">'+Object.keys(TEMPLATES).map(function(key){
    return '<button type="button" class="bp-template'+(key==='custom'?' is-reset':'')+'" data-lcw-template="'+key+'"'+(key!=='custom'?' aria-pressed="'+(d.template===key)+'"':'')+'><span class="bp-template-icon" aria-hidden="true">'+TEMPLATES[key]+'</span><span><strong>'+e(t('bpTpl_'+key))+'</strong><small>'+e(t('bpTplHint_'+key))+'</small></span></button>';
  }).join('')+'</div></section>';
 }
 function sourceLabel(d,source){return {link:'🔗 '+t('lcwLink'),web:'🌐 '+t('lcwWeb'),keywords:'🔍 '+t('lcwKeywords')}[source];}
 function sourcePrice(d,source){var v=source==='keywords'?.25:source==='web'&&d.web.mode!=='web_brand'?.15:0;return v?t('bpPerInstall',{n:n(v,2)}):t('bpFree');}
 function feedbackSummary(d){
  var v=window.ProjectFeedback?.cachedSettings(d.appId)?.impression, day=opening(d);
  if(v&&v.mode!=='off'&&d.impression_mutual)v=Object.assign({},v,{mode:'mutual',bonus:0});
  if(!v)return t('bpLocalDefault');
  return (window.ProjectFeedback&&ProjectFeedback.badgeLabel(v)||t('pfMode_'+v.mode))+(day?' · '+t('bpWithDay',{day:day}):'');
 }
 function status(warn){return '<span class="bp-status is-'+(warn?'warn':'ok')+'" role="img" aria-label="'+e(t(warn?'bpStatusWarn':'bpStatusOk'))+'">'+(warn?'!':'✓')+'</span>';}
 function subcard(step,label,detail,preview,warn){
  return '<button type="button" class="bp-subcard'+(warn?' is-warn':'')+'" data-lcw-action="step" data-step="'+step+'"><span class="bp-subcard-top"><strong>'+e(label)+'</strong><span class="bp-chev" aria-hidden="true">›</span></span><span>'+e(detail)+'</span>'+
   (preview?'<small>'+e(preview)+'</small>':'')+'</button>';
 }
 function nodeHead(num,titleKey,summary,step,warn){
  var inner='<b class="bp-num">'+num+'</b><span class="bp-node-title"><strong>'+e(t(titleKey))+'</strong>'+(summary?'<small>'+e(summary)+'</small>':'')+'</span>'+(warn==null?'':status(warn));
  return step?'<button type="button" class="bp-node-head" data-lcw-action="step" data-step="'+step+'">'+inner+'<span class="bp-chev" aria-hidden="true">›</span></button>':'<div class="bp-node-head">'+inner+'</div>';
 }
 function blueprint(d,c){
  var r=d.retention,[min,max]=days(d),a=d.activity,steps=a.steps||[],allowed=LiveCampaignDraft.allowed(d),keys=allowed.includes('keywords');
  var missingKey=keys&&!d.keywords.some(function(k){return k.enabled!==false&&!k.is_fallback;});
  var missingWeb=allowed.includes('web')&&d.web.mode!=='web_brand'&&!d.web.query.trim();
  var contract=d.contracts&&d.contracts.enabled,price=contract&&window.LiveContracts?LiveContracts.range(d):null;
  var quota=d.volume.limit_mode==='budget'?t('lbBudget'):'🎯 '+t('lcwInstalls',{n:d.volume.totalInstalls});
  var geo=window.LiveCampaignGeo?LiveCampaignGeo.label(d.country):d.country||t('lcGeoAny');
  var sourceDetail=allowed.map(function(src){return (allowed.length>1&&src===d.source?'⭐ ':'')+sourceLabel(d,src);}).join(' · ');
  var display=((LiveCampaignGrowthCard.icons[d.icon]||'')+' '+d.name).trim();
  return (c.editing?'':templateStrip(d))+'<div class="bp-route">'+
   '<section class="bp-node'+(missingKey||missingWeb?' is-warn':'')+'">'+nodeHead(1,'bpSource','',null,missingKey||missingWeb)+'<div class="bp-experience">'+
    subcard(1,t('bpSourcesCard'),sourceDetail,missingKey||missingWeb?t(missingKey?'bpMissingKey':'bpMissingWeb'):allowed.map(function(src){return sourcePrice(d,src);}).join(' · '),missingKey||missingWeb)+
    subcard('geo',t('lcGeoTitle'),geo,d.country?'':t('lcGeoOptional'))+'</div></section>'+
   '<section class="bp-node">'+nodeHead(2,'bpTrack',t('bpTrackSummary',{range:rangeLabel(d),days:r.days,n:r.checkpoints.length-1}),2,false)+
    '<div class="bp-node-body">'+(d.parentCampaignId||min===max?'':chooseDays(d))+timeline(d,true)+'</div></section>'+
   '<section class="bp-node">'+nodeHead(3,'bpExperience','',null,null)+'<div class="bp-experience">'+
    subcard('3',t('growthScenario'),a.enabled?t('bpScenarioSummary',{n:steps.length,day:a.open_day||1})+' · '+LiveScenarioEditor.feeLabel(a):t('pcParamsOff'),a.enabled?steps.map(function(s){return s.text;}).filter(Boolean).slice(0,2).join(' · '):'')+
    subcard('feedback','⭐ '+t('pfModule'),feedbackSummary(d))+'</div></section>'+
   '<section class="bp-node">'+nodeHead(4,'bpLaunch',display||t('bpSetup'),4,!d.icon&&!d.name.trim())+
    '<div class="bp-node-body"><ul class="bp-facts"><li>'+e(quota)+'</li><li>'+e(price?t('bpContractOn',{rate:d.contracts.daily_rate_bust,price:price.min===price.max?price.min:price.min+'–'+price.max}):t('bpContractOff'))+'</li></ul>'+
    toggle('routePriority','bpRoutePriority',!!d.routePriority)+'</div></section></div>';
 }
 var TITLES={1:'bpSourcesCard',geo:'lcGeoTitle',2:'bpTrack',3:'growthScenario',feedback:'pfModule',4:'bpLaunch'};
 function title(step){return t(TITLES[step]||'bpTitle');}
 function body(d,step,c){
  if(d.parentCampaignId&&(step===1||step===2||step==='geo'))return '<section class="lcw-panel"><p>'+e(t('lrInherited'))+'</p>'+LiveRouteUI.route(d)+'</section>';
  if(step==='feedback')return window.ProjectFeedback?ProjectFeedback.campaignFields(d):'';
  if(step==='geo')return LiveCampaignGeo.body(d,c);
  return [blueprint,LiveCampaignSourcesView.body,retention,scenarios,campaignVolume][step](d,c);
 }
 function progress(step){
  var current=ORDER.indexOf(step);
  return '<small class="bp-sheet-kicker">'+e(t('bpStepOf',{n:current+1,total:ORDER.length}))+'</small><div class="bp-progress">'+ORDER.map(function(s,i){
   return '<button type="button" class="'+(i<current?'is-done':i===current?'is-current':'')+'" data-lcw-action="step" data-step="'+s+'" aria-label="'+e(title(s))+'"'+(i===current?' aria-current="step"':'')+'></button>';
  }).join('')+'</div>';
 }
 function header(){return '<h1 id="lcw-title" class="gtw-header-title">'+e(t('bpTitle'))+'</h1>';}
 function footer(d,step,expanded,c){
  if(step!==0){
   var next=ORDER[ORDER.indexOf(step)+1];
   return '<div class="bp-sheet-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="done">'+e(t('bpDone'))+'</button>'+
    (next?'<button type="button" class="bp-next-btn" data-lcw-action="next" data-step="'+next+'">'+e(t('bpNextTo',{name:t('bpShort_'+next)}))+'</button>':'')+'</div>';
  }
  var paid=d.retention.checkpoints.length-1, unit=paid*10;
  var active=!!(c.capacity&&c.capacity.active<c.capacity.limit);
  return '<button type="button" class="lcw-estimate-line" data-lcw-action="estimate" aria-expanded="'+!!expanded+'" aria-controls="lcw-cost-details">'+
   '<span>'+e(t('lbPerTrack'))+' <b>'+e(n(unit))+' $BUST</b></span><span class="lcw-details-label">'+e(t('lcwDetails'))+' '+(expanded?'▾':'▴')+'</span></button>'+
   '<section class="lcw-cost-details" id="lcw-cost-details"'+(expanded?'':' hidden')+'><p>'+e(t('lcwCostCheckpoint',{days:paid,unit:10,price:unit}))+'</p></section>'+
   (c.saveError?'<p class="lcw-input-error" role="alert">'+e(c.saveError)+'</p>':'')+'<div class="lcw-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="save"'+
   (!LiveCampaignDraft.valid(d,4)||c.saving||!c.projectControl?' disabled':'')+'>'+e(t(c.saving?'lcgSaving':c.editing?'lceSave':active?'lcwLaunch':'lcgCreatePaused'))+'</button></div>';
 }
 window.LiveCampaignWizardView={body:body,header:header,title:title,timeline:timeline,progress:progress,syncRanges:syncRanges,order:ORDER,sourceLabel:sourceLabel,sourcePrice:sourcePrice,section:section,segGroup:segGroup,seg:seg,text:t,number:n,footer:footer,controls:{counter:counter,chip:chip,toggle:toggle,seg:seg,slider:slider}};
})();
