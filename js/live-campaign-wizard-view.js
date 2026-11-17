/* Shared fullscreen controls: entry + four focused campaign setup steps. */
(function(){
 'use strict';
 function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function n(v,digits=1){return Number(v).toLocaleString(window.lang==='ru'?'ru-RU':'en-US',{maximumFractionDigits:digits});}
 function hint(k){return '<p class="gtw-helper-text">'+e(t(k))+'</p>';}
 function chip(f,v,label,on,disabled){return '<button type="button" class="meta-chip lcw-chip '+(on?'accent-blue':'')+'" data-lcw-field="'+f+'" data-value="'+v+'" aria-pressed="'+!!on+'"'+(disabled?' disabled':'')+'>'+e(label)+'</button>';}
 function counter(f,v,min,max,step){step=step||1;
  return '<div class="lcw-counter" data-increment="'+step+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':minus" data-value="'+Math.max(min,v-step)+'"'+(v<=min?' disabled':'')+'>−</button><input class="gtw-input lcw-quantity" type="number" inputmode="numeric" min="'+min+'" max="'+max+'" value="'+v+'" data-lcw-input="'+f+'" aria-label="'+e(t(f.indexOf('plan:')===0?'lpField_'+f.slice(5):f.indexOf('cap:')===0?'lpcCampaignCap':{minDays:'ldMinDays',maxDays:'ldMaxDays',checkpointCount:'ldCheckpointCount',checkpointInterval:'ldCheckpointInterval',daily:'lcpUsers',period:'lcwDuration',target:'lcgTarget',retention:'lcwRetentionLabel',pauseHours:'lcpPauseHours'}[f]))+'"><button type="button" class="meta-chip lcw-chip" data-lcw-field="'+f+'" data-lcw-focus="'+f+':plus" data-value="'+Math.min(max,v+step)+'"'+(v>=max?' disabled':'')+'>+</button></div>';
 }
 function toggle(f,k,on,disabled){return '<button type="button" class="pc-project-param lcw-toggle" role="switch" aria-checked="'+!!on+'" data-lcw-field="'+f+'" data-lcw-focus="'+f+'" data-value="'+!on+'"'+(disabled?' disabled':'')+'><span>'+e(t(k))+'</span><span class="meta-chip '+(on?'accent-blue':'')+'">'+e(t(on?'pcParamsOn':'pcParamsOff'))+'</span></button>';}
 function days(d){var r=d.retention;return [r.min_days||r.days,r.max_days||r.days];}
 function chooseDays(d){
  var r=d.retention,[min,max]=days(d),choices=[7,14,21,28,35].filter(function(day){return min<=day&&day<=max;});
  if(!choices.includes(r.days))choices.push(r.days);
  return '<div class="lcw-chips bp-days">'+choices.sort(function(a,b){return a-b;}).map(function(day){
   return chip('retention',day,(day===r.days?'⭐ ':'')+t('lcwDays',{n:day}),day===r.days);
  }).join('')+'</div>';
 }
 function opening(d){
  var config=d.impression, end=d.retention.days;
  return config&&config.mode!=='off'?Math.min(end,config.day||Math.max(2,end-4)):null;
 }
 function timeline(d, compact){
  var r=d.retention, entries=new Map(), day=opening(d);
  function mark(at,label,kind){if(!entries.has(at))entries.set(at,[]);entries.get(at).push([label,kind]);}
  r.checkpoints.forEach(function(at){mark(at,at===1?'bpStart':at===r.days?'bpFinal':'bpCheck',at===1?'start':at===r.days?'final':'check');});
  var scenario=d.activity.enabled?Math.min(r.days,d.activity.open_day||1):null;
  if(scenario)mark(scenario,'bpScenarioMarker','scenario');
  if(day)mark(day,'bpFeedbackMarker','feedback');
  var nodes=Array.from(entries).sort(function(a,b){return a[0]-b[0];});
  if(compact&&nodes.length>5)nodes=nodes.filter(function(node,i){return i<2||i===nodes.length-1||node[0]===scenario||node[0]===day;});
  return '<ol class="bp-timeline'+(compact?' is-mini':'')+'">'+nodes.map(function([at,markers]){
    return '<li><b>D'+at+'</b>'+markers.map(function([label,kind]){
      return '<span class="bp-mark is-'+kind+'">'+e(t(label))+'</span>';
    }).join('')+'</li>';
  }).join('')+'</ol>';
 }
 function retention(d){
  var r=d.retention,[min,max]=days(d);
  return '<section class="lcw-panel bp-retention"><header><h3>'+e(t('bpRangeTitle'))+'</h3><span>'+e(t('bpRangeBadge'))+'</span></header>'+
   hint('bpRangeHelp')+'<div class="lcw-chips">'+[[7,14],[7,28],[14,35]].map(function([a,b]){
    return '<button type="button" class="meta-chip lcw-chip" data-lcw-range="'+a+':'+b+'" aria-pressed="'+(min===a&&max===b)+'">'+e(t('lcwDays',{n:a+'–'+b}))+'</button>';
   }).join('')+'<button type="button" class="meta-chip lcw-chip" data-lcw-range="fixed" aria-pressed="'+(min===max)+'">'+e(t('bpFixed'))+'</button></div>'+
   '<div class="ld-range-grid"><label>'+e(t('ldMinDays'))+counter('minDays',min,3,60)+'</label><label>'+e(t('ldMaxDays'))+counter('maxDays',max,3,60)+'</label></div>'+
   '<label class="gtw-label">⭐ '+e(t('ldPreferredDays'))+'</label>'+chooseDays(d)+counter('retention',r.days,min,max)+hint('bpPreferredHelp')+'</section>'+
   '<section class="lcw-panel"><h3>'+e(t('lcwCheckpoints'))+'</h3><label>'+e(t('ldCheckpointCount'))+counter('checkpointCount',r.checkpoint_count||r.checkpoints.length-1,1,59)+'</label>'+
   '<details data-bp-checkpoint-interval><summary>'+e(t('ldCheckpointInterval'))+'</summary>'+counter('checkpointInterval',r.checkpoint_interval||7,1,59)+'</details>'+hint('ldCheckpointsHint')+'</section>'+
   '<section class="lcw-panel" data-bp-timeline><h3>'+e(t('bpSchedule'))+'</h3>'+timeline(d,false)+'<p>'+e(t('bpSummaryKD',{n:r.checkpoints.length,price:(r.checkpoints.length-1)*10}))+'</p></section>';
 }
 function scenarios(d){
  var refs=d.activity.screenshots||[];
  var gallery=refs.length?'<details class="lr-scenario-preview"><summary>'+e(t('lseLegacyMedia'))+'</summary>'+Array.from({length:refs.length},function(_,i){return LiveCampaignSourcesView.screenshot('scenario:'+i,refs[i]);}).join('')+'</details>':'';
  return toggle('activity','lcwActivity',d.activity.enabled)+(d.activity.enabled?LiveScenarioEditor.body(d.activity,d.retention.min_days||d.retention.days)+gallery:'');
 }
 function campaignVolume(d,c){return '<section class="lcw-panel lpp-campaign-budget"><label class="gtw-label" for="lcw-campaign-name">'+e(t('lcgCampaignName'))+'</label><div class="gtw-input-wrapper"><input class="gtw-input" id="lcw-campaign-name" maxlength="80" data-lcw-input="name" value="'+e(d.name)+'" placeholder="'+e(t('lcgOptional'))+'"></div><div class="lcw-chips" role="group" aria-label="'+e(t('lpcIcon'))+'">'+Object.keys(LiveCampaignGrowthCard.icons).map(function(k){return '<button class="meta-chip lcw-chip" type="button" data-lcw-icon="'+k+'" aria-pressed="'+(d.icon===k)+'">'+LiveCampaignGrowthCard.icons[k]+'</button>';}).join('')+'<button class="meta-chip lcw-chip" type="button" data-lcw-icon="none">'+e(t('lpcNoIcon'))+'</button></div><p class="lcw-input-error" data-lpc-display-error>'+e(!d.icon&&!d.name.trim()?t('lpcDisplayRequired'):'')+'</p><h3>'+e(t('lbVolume'))+'</h3><div class="lcw-chips">'+chip('limit_mode','budget',t('lbBudget'),d.volume.limit_mode==='budget')+chip('limit_mode','installs',t('lbFinite'),d.volume.limit_mode!=='budget')+'</div>'+(d.volume.limit_mode==='budget'?'<p class="gtw-helper-text">'+e(t('lbBudgetHint'))+'</p>':counter('target',d.volume.totalInstalls,1,100000))+'</section>'+toggle('routePriority','bpRoutePriority',!!d.routePriority)+'<p class="gtw-helper-text">'+e(t('lcwPaceNote'))+'</p>'+(window.LiveContracts?LiveContracts.ownerSettings(d):'')+'<p class="lcw-input-error" role="status">'+e((c&&c.saveError)||'')+'</p>';}
 function action(step,label,cls){
  return '<button type="button" class="'+(cls||'meta-chip')+'" data-lcw-action="step" data-step="'+step+'">'+e(label)+'</button>';
 }
 function heading(step,key){
  return '<header><h2><b>'+step+'</b> '+e(t(key))+'</h2>'+action(step,t('bpEdit')+' ✎')+'</header>';
 }
 function cardTitle(template){
  return t({aso:'bpSearch',retention:'bpLong',deep:'bpFeature',custom:'bpReset'}[template]);
 }
 function templateStrip(){
  return '<section class="bp-templates"><strong>'+e(t('bpTemplates'))+'</strong><div class="bp-template-rail">'+['aso','retention','deep','custom'].map(function(key){
    return '<button type="button" class="meta-chip" data-lcw-template="'+key+'">'+e(cardTitle(key))+'</button>';
  }).join('')+'</div></section>';
 }
 function sources(d){
  var allowed=LiveCampaignDraft.allowed(d);
  return allowed.map(function(source){
    var label={link:'🔗 '+t('lcwLink')+' · 0 ⚡',web:'🌐 '+t('lcwWeb')+' · '+n(d.web.mode==='web_brand'?0:.15,2)+' ⚡',
        keywords:'🔍 '+t('lcwKeywords')+' · '+n(.25,2)+' ⚡'}[source];
    return allowed.length>1&&!d.parentCampaignId?
      '<button class="meta-chip lcw-chip" type="button" data-lcw-field="preferredSource" data-value="'+source+'" aria-pressed="'+(d.source===source)+'" aria-label="'+e(t('bpPickDefault',{name:label}))+'"'+(d.source===source?' title="'+e(t('bpPreferred'))+'"':'')+'>'+(d.source===source?'⭐ ':'☆ ')+e(label)+'</button>':
      '<span class="meta-chip">'+e(label)+'</span>';
  }).join('');
 }
 function feedbackSummary(d){
  var v=d.impression, day=opening(d);
  if(!v)return t('bpLocalDefault');
  return (window.ProjectFeedback&&ProjectFeedback.badgeLabel(v)||t('pfMode_'+v.mode))+(day?' · '+t('bpWithDay',{day:day}):'');
 }
 function subcard(step,label,detail,preview){
  return '<button type="button" class="bp-subcard" data-lcw-action="step" data-step="'+step+'"><strong>'+e(label)+'</strong><span>'+e(detail)+'</span>'+
   (preview?'<small>'+e(preview)+'</small>':'')+'</button>';
 }
 function blueprint(d,c){
  var [min,max]=days(d),a=d.activity,steps=a.steps||[],keys=LiveCampaignDraft.allowed(d).includes('keywords');
  var missingKey=keys&&!d.keywords.some(function(k){return k.enabled!==false&&!k.is_fallback;});
  var missingWeb=LiveCampaignDraft.allowed(d).includes('web')&&d.web.mode!=='web_brand'&&!d.web.query.trim();
  var contract=d.contracts&&d.contracts.enabled,price=contract&&window.LiveContracts?LiveContracts.range(d):null;
  var quota=d.volume.limit_mode==='budget'?t('lbBudget'):'🎯 '+t('lcwInstalls',{n:d.volume.totalInstalls});
  var country=(window.COUNTRY_CATALOG||[]).find(function(row){return row.code===d.country;});
  var geo=country?(country.flag+' '+(window.lang==='ru'?country.name_ru:country.name)):d.country||t('lcGeoAny');
  return (c.editing?'':templateStrip())+'<div class="bp-route">'+
   '<section class="bp-node">'+heading('1','bpSource')+'<p>🌍 '+e(geo)+'</p><div class="lcw-chips">'+sources(d)+'</div>'+
   (missingKey||missingWeb?'<p class="bp-warning">'+e(t(missingKey?'bpMissingKey':'bpMissingWeb'))+'</p>':'')+'</section>'+
   '<section class="bp-node">'+heading('2','bpTrack')+'<p>'+e(min===max?t('lcwDays',{n:min}):t('bpRange',{min:min,max:max}))+'</p>'+
   (d.parentCampaignId?'':chooseDays(d))+timeline(d,true)+'</section>'+
   '<section class="bp-node"><header><h2><b>3</b> '+e(t('bpExperience'))+'</h2></header><div class="bp-experience">'+
   subcard('3',t('growthScenario'),a.enabled?t('bpScenarioSummary',{n:steps.length,day:a.open_day||1})+' · '+LiveScenarioEditor.feeLabel(a):t('pcParamsOff'),a.enabled?steps.map(function(s){return s.text;}).filter(Boolean).slice(0,2).join(' · '):'')+
   subcard('feedback','⭐ '+t('pfModule'),feedbackSummary(d))+'</div></section>'+
   '<section class="bp-node">'+heading('4','bpLaunch')+'<p>'+e(((LiveCampaignGrowthCard.icons[d.icon]||'')+' '+d.name).trim()||t('bpSetup'))+'</p><p>'+e(quota)+'</p>'+
   '<p>'+e(price?t('bpContractOn',{rate:d.contracts.daily_rate_bust,price:price.min===price.max?price.min:price.min+'–'+price.max}):t('bpContractOff'))+'</p>'+
   toggle('routePriority','bpRoutePriority',!!d.routePriority)+'</section></div>';
 }
 function title(step){return t({1:'bpSource',2:'bpTrack',3:'growthScenario',feedback:'pfModule',4:'bpLaunch'}[step]||'bpTitle');}
 function body(d,step,c){
  if(d.parentCampaignId&&(step===1||step===2))return '<section class="lcw-panel"><p>'+e(t('lrInherited'))+'</p>'+LiveRouteUI.route(d)+'</section>';
  if(step==='feedback')return window.ProjectFeedback?ProjectFeedback.configFields(d.impression,d.retention.max_days||d.retention.days,true):'';
  return [blueprint,LiveCampaignSourcesView.body,retention,scenarios,campaignVolume][step](d,c);
 }
 function header(){return '<h1 id="lcw-title" class="gtw-header-title">'+e(t('bpTitle'))+'</h1>';}
 function footer(d,step,expanded,c){
  if(step!==0){
   var next={1:2,2:3,3:'feedback',feedback:4}[step];
   return '<div class="bp-sheet-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="done">'+e(t('bpDone'))+'</button>'+
    (next?'<button type="button" class="meta-chip" data-lcw-action="next" data-step="'+next+'">'+e(t(next==='feedback'?'bpNextFeedback':'bpNext',{n:next}))+'</button>':'')+'</div>';
  }
  var paid=d.retention.checkpoints.length-1, unit=paid*10;
  var active=!!(c.capacity&&c.capacity.active<c.capacity.limit);
  return '<button type="button" class="lcw-estimate-line" data-lcw-action="estimate" aria-expanded="'+!!expanded+'" aria-controls="lcw-cost-details">'+
   '<span>'+e(t('lbPerTrack'))+' <b>'+e(n(unit))+'</b> $BUST</span><span class="lcw-details-label">'+e(t('lcwDetails'))+' '+(expanded?'▾':'▴')+'</span></button>'+
   '<section class="lcw-cost-details" id="lcw-cost-details"'+(expanded?'':' hidden')+'><p>'+e(t('lcwCostCheckpoint',{days:paid,unit:10,price:unit}))+'</p></section>'+
   (c.saveError?'<p class="lcw-input-error" role="alert">'+e(c.saveError)+'</p>':'')+'<div class="lcw-nav"><button type="button" class="gtw-continue-btn" data-lcw-action="save"'+
   (!LiveCampaignDraft.valid(d,4)||c.saving||!c.projectControl?' disabled':'')+'>'+e(t(c.saving?'lcgSaving':c.editing?'lceSave':active?'lcwLaunch':'lcgCreatePaused'))+'</button></div>';
 }
 window.LiveCampaignWizardView={body:body,header:header,title:title,timeline:timeline,text:t,number:n,footer:footer,controls:{counter:counter,chip:chip,toggle:toggle}};
})();
