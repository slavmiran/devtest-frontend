/* Owner-only navigation. Suggestions never save policy or spend funds. */
(function(){
 'use strict';
 function text(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function own(id){return (window.myProjects||[]).find(function(p){return Number(p.id||p.app_id)===Number(id)&&p.phase==='live';});}
 function button(id,action,key){return '<button type="button" class="lg-action meta-chip'+(key==='lgPassportReady'?' is-done':'')+'" data-live-action="'+action+'" data-live-app="'+Number(id)+'">'+e(text(key))+'</button>';}
 function actions(id,kind){
  if(!own(id)||!kind)return '';
  var items={pace:[['queue','lgQueue'],['guests','lgGuests']],hot:[['auto','lgAuto']],keys:[['keys','lgKeys']],people:[['people','lgPeople']],scenario:[['scenario','lgScenario']],reviews:[['reviews','lgReviews']],passport:[['passport','lgPassport']]};
  return '<div class="lg-actions">'+(items[kind]||[]).map(function(a){return button(id,a[0],a[1]);}).join('')+'</div>'+(kind==='passport'?'<small class="lg-help">'+e(text('lgReleaseHint'))+'</small>':'');
 }
 function forSignal(id,code){return actions(id,({INSTALL_TREND_DOWN:'pace',THERMAL_SOFT_LANDING:'pace',THERMAL_RESTORE_PACE:'pace',THERMAL_COOL_DOWN:'hot',SOURCE_IMBALANCE:'keys',SOURCE_CONCENTRATION:'keys',ENGAGEMENT_DISCIPLINE_LOW:'people',ENGAGEMENT_STALE_REPORT:'people',ENGAGEMENT_IDLE:'people',ENGAGEMENT_DEPTH_LOW:'scenario',EARLY_DROPOFFS:'people',ACTIVE_SLOTS_LOW:'people',REVIEW_TREND_DOWN:'reviews',UPDATE_AGING:'passport',UPDATE_STALE:'passport'})[code]);}
 function forMarket(id,s){
  var th=s.thermal||{},code=s.growth_lever&&s.growth_lever.code||'';
  var g=s.engagement||{},healthyActivity=g.available&&g.active_testers>0&&g.discipline_percent>=75&&g.hours_since_last_report!=null&&g.hours_since_last_report<=96;
  if(th.T_t>75)return actions(id,'hot');
  if(th.T_t < -35||th.K_thermal<.95)return actions(id,'pace');
  if(code==='MARKET_USER_ENGAGEMENT'&&healthyActivity&&g.depth_score<50)return actions(id,'scenario');
  return actions(id,({install_momentum:'pace',retention_quality:'people',rating_health:'reviews',aso_source_diversity:'keys',release_freshness:'passport',user_engagement:'people'})[code.replace(/^MARKET_/,'').toLowerCase()]);
 }
 function hideKey(p,m){var user=window.userId||window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initDataUnsafe&&Telegram.WebApp.initDataUnsafe.user&&Telegram.WebApp.initDataUnsafe.user.id||'owner';return 'live-quick-start:'+user+':'+Number(p.id||p.app_id)+':'+(m.live_activated_at||p.live_activated_at||'live');}
 function target(m){return m&&m.calibration&&Number(m.calibration.working_sample_installs)||20;}
 function quickStart(p,m){
  if(!m||!m.installs||m.installs.total>=target(m))return '';
  p=own(p.id||p.app_id)||p;if(p.phase&&p.phase!=='live')return '';
  var key=hideKey(p,m);try{if(localStorage.getItem(key)==='1')return '';}catch(_){}
  var goal=target(m),id=Number(p.id||p.app_id),n=Number(m.installs.total)||0,raw=p.play_store_raw,ready=!!(raw&&Object.keys(raw).length),h=m.history_import||{},flow=(p.live_campaign_rows||[]).some(function(c){return c.status==='active'||c.contracts&&c.contracts.enabled;});
  return '<aside class="lg-start" data-live-start="'+id+'"><header><strong>'+e(text('lgStart'))+'</strong><button type="button" class="meta-chip" data-live-start-hide="'+id+'" aria-label="'+e(text('lgHide'))+'">×</button></header><p class="lg-calibration">'+e(text('lgCalibration',{n:n,target:goal}))+'</p><div class="lg-progress" role="progressbar" aria-label="'+e(text('lgCalibration',{n:n,target:goal}))+'" aria-valuemin="0" aria-valuemax="'+goal+'" aria-valuenow="'+n+'"><i style="width:'+Math.min(100,n/goal*100)+'%"></i></div><details class="lg-start-steps" open><summary>'+e(text('lgFold'))+'</summary><p class="lg-help">'+e(text('lgCalibrationHint',{target:goal}))+'</p><details class="lg-start-info"><summary>ⓘ</summary><p>'+e(text('lgCalibrationDetails'))+'</p></details><section><strong>'+e(text('lgStepPassport'))+'</strong>'+button(id,ready?'passport':'passport-load',ready?'lgPassportReady':'lgPassportLoad')+'</section>'+(h.available&&!h.imported?'<section><strong>'+e(text('lgStepHistory'))+'</strong>'+button(id,'history','lgImport')+'</section>':'')+'<section><strong>'+(flow?'✓ ':'')+e(text('lgStepFlow'))+'</strong><div class="lg-start-options"><div><b>'+e(text('lgBridgeTitle'))+'</b><p>'+e(text('lgBridgeHint'))+'</p>'+button(id,'queue','lgQueue')+'</div><div><b>'+e(text('lgKeysTitle'))+'</b><p>'+e(text('lgKeysHint'))+'</p>'+button(id,'keys','lgKeysSetup')+'</div></div></section></details></aside>';
 }
 function leave(){if(window.LiveMetricsAnalytics)LiveMetricsAnalytics.close();}
 async function run(id,action,trigger){
  var p=own(id);if(!p)return false;leave();
  if(action==='queue'){if(window.LiveMarket)await LiveMarket.openQueue(id);return true;}
  if(action==='guests'){
   if(window.switchTab)switchTab('market');if(window.switchMarketSubTab)switchMarketSubTab('seeking');
   var legacy=document.getElementById('live-market-legacy');if(legacy)legacy.open=true;
   var guests=document.getElementById('guest-projects-section');if(guests){if(!guests.classList.contains('expanded')&&window.toggleGuestProjectsAccordion)toggleGuestProjectsAccordion();guests.scrollIntoView({behavior:'smooth',block:'start'});}return true;
  }
  if(action==='auto')return LiveCampaigns.openPace(id,trigger,'auto');
  if(['reviews','keys','scenario'].includes(action)&&window.LiveGuidanceRouting)return LiveGuidanceRouting.route(id,action);
  if(action==='pool')return LiveCampaigns.openPool(id,trigger);
  if(action==='keys'){
   var opened=LiveCampaignWizard.openSource(id,'keywords');
   if(opened&&!(p.live_project_control&&p.live_project_control.pool_available>0)&&window.showToast)showToast(text('lgEmptyPool'),8000);
   return opened;
  }
  if(action==='people'){if(window.switchTab)switchTab('projects');if(!window.pcSelectSpecialTabAndExpand)return false;pcSelectSpecialTabAndExpand(id,'attention');var people=document.getElementById('pc-today-'+id);if(people)people.scrollIntoView({block:'start',behavior:'smooth'});return true;}
  if(action==='history'){if(window.LiveHistoryImport)LiveHistoryImport.open(id);return true;}
  if(action==='passport-load'){if(window.loadPlayStorePassport)await loadPlayStorePassport(id);return true;}
  if(action==='passport'){if(window.openPlayStorePassport)openPlayStorePassport(id);return true;}
  return false;
 }
 document.addEventListener('click',async function(event){
  var hide=event.target.closest('[data-live-start-hide]');if(hide){event.preventDefault();event.stopPropagation();var p=own(hide.dataset.liveStartHide);if(p)try{localStorage.setItem(hideKey(p,p.live_metrics||{}),'1');}catch(_){}hide.closest('[data-live-start]').remove();return;}
  var b=event.target.closest('[data-live-action]');if(!b||b.disabled)return;event.preventDefault();event.stopPropagation();b.disabled=true;
  try{var ok=await run(Number(b.dataset.liveApp),b.dataset.liveAction,b);if(!ok&&window.showToast)showToast(text('lgUnavailable'));}catch(_){if(window.showToast)showToast(text('lgUnavailable'));}finally{if(b.isConnected)b.disabled=false;}
 },true);
 window.addEventListener('play-store:synced',function(event){var id=Number(event.detail&&event.detail.appId);if(window.LiveProjectMetrics)LiveProjectMetrics.repaint(id);});
 window.LiveGuidance={target:target,text:text,forSignal:forSignal,forMarket:forMarket,quickStart:quickStart,run:run};
})();
