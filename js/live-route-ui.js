/* A single parameter order for cards, accepted routes and owner queue rows. */
(function(){
 'use strict';var U=LiveMarketUI,t=U.t,e=U.e;
 function phase(p){var s=p.market||p.scoring||{},tier=s.tier||p.tier;return '<span class="lr-phase">'+e(p.phase==='live'?t('lrLivePhase',{tier:tier||'—'}):t('lrClosedPhase'))+'</span>';}
 function sourceLabel(s){var icon={link:'🔗',web:'🌐',keywords:'🔍'}[s]||'🔗';return icon+' '+t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[s]||'lcwLink');}
 function reviewChip(mode){if(mode==='required')return '⭐ '+t('mkOfferRevRequired');if(mode==='voluntary')return '⭐ '+t('mkOfferRevVoluntary');return t('ldReview_off');}
 function offer(o){
  var low=o.min_days||o.duration_days||14,high=o.max_days||low,kmin=o.control_day_min||o.control_day_count||0,kmax=o.control_day_max||kmin,rmin=o.reward_min||o.reward_bust,rmax=o.reward_max||rmin;
  var kind=o.offer_type==='contract'?t(rmin?'mkTaskContractBust':'mkTaskContract',{n:rmin&&rmax&&rmax!==rmin?U.n(rmin,0)+'–'+U.n(rmax,0):U.n(rmin,0)}):(o.closed_test_compatible||o.kind==='closed_bridge')?t('mkTaskBridge'):t('mkTaskLive');
  var act=o.activity&&o.activity.enabled?o.activity:null,steps=(act&&act.steps||[]).length,imgs=act&&((act.screenshots||[]).length>0||(act.steps||[]).some(function(s){return s.media&&s.media.kind==='image';})),vids=act&&(act.steps||[]).some(function(s){return s.media&&s.media.kind==='video';});
  var scChip=act?(steps?t('mkTaskScenarioSteps',{n:steps}):t('lrScenario'))+(imgs?' 🖼️':'')+(vids?' 🎬':''):'';
  return '<div class="lr-task-card"><div class="lr-task-badges"><span class="lr-task-type">'+e(kind)+'</span>'+(o.preferred_track?'<span class="lr-task-pref">'+e(t('mkTaskPreferred'))+'</span>':'')+'</div>'+
   '<div class="lr-task-row"><strong>'+e(sourceLabel(o.source))+'</strong>'+(o.country?'<span class="lr-task-geo">'+e(t('mkTaskGeo',{c:o.country}))+'</span>':'')+'</div>'+
   '<div class="lr-task-bar"><span>📅 '+e(t('mkTaskTerm',{d:'D'+(low===high?low:low+'–'+high)}))+'</span>'+(kmin?'<span>📸 '+e(t('mkTaskKd',{n:kmin===kmax?kmin:kmin+'–'+kmax}))+'</span>':'')+'</div>'+
   '<div class="lr-task-pills">'+(scChip?'<span>'+e(scChip)+'</span>':'')+'<span>'+e(reviewChip(o.review_mode||'off'))+'</span></div>'+scenario(o.activity,o.campaign_id)+'</div>';
 }
 function scenario(a,campaign){if(!a||!a.enabled)return '';return '<details class="lr-scenario-preview"><summary>'+e(t('lrViewScenario'))+(a.title?' · '+e(a.title):'')+'</summary><p class="lr-scenario-copy">'+e(a.instructions||'')+'</p><div class="lr-scenario-gallery">'+(a.screenshots||[]).map(function(img){var url=String(window.API_BASE||'/api').replace(/\/$/,'')+'/live-campaigns/'+Number(campaign)+'/scenario-assets/'+Number(img.asset_id)+'?init_data='+encodeURIComponent(U.auth());return '<a href="'+e(url)+'" target="_blank" rel="noopener"><img src="'+e(url)+'" alt="'+e(t('lcwReference'))+'" loading="lazy"></a>';}).join('')+'</div></details>';}
 function route(terms){terms=terms||{};var d=terms.queue_definition||terms,act=d.activity||{},r=d.retention||{},days=terms.duration_days||r.days,source=terms.install_source||d.source||'link',reviews=terms.reviews||d.reviews&&d.reviews.config||{},cp=terms.control_days||r.checkpoints||[];
  var values=[d.country?'🌍 '+d.country:t('lrGeoAll'),'① '+t({link:'lcwLink',web:'lcwWeb',keywords:'lcwKeywords'}[source]),'② '+(act.enabled?(act.title||t('lrScenario')):t('lrNoScenario')),'③ '+t('ldReview_'+(reviews.mode||'off')),'④ '+t('lcwDays',{n:days||14}),'⑤ 📸 '+cp.length];
  return '<details class="lr-route"><summary>'+e(t('lrRoute'))+' · '+e(values.slice(0,2).join(' · '))+'</summary><p>'+e(values.join(' → '))+'</p>'+(act.enabled?scenario(act,terms.campaign_id):'')+'</details>';
 }
 function receipts(row){return (row.closure_receipts||[]).map(function(r){return '<details class="lr-closure"><summary>'+e(t('lrClosed_'+r.cause))+'</summary><small>'+e(t('mkEarlyLossHint'))+'</small></details>';}).join('');}
 function badge(a){if(!a||!a.enabled)return '';var steps=a.steps||[],images=(a.screenshots||[]).length>0||steps.some(function(s){return s.media&&s.media.kind==='image';}),videos=steps.some(function(s){return s.media&&s.media.kind==='video';});return t('lrScenario')+(steps.length?' · '+t('lseStepCount',{n:steps.length}):'')+(images?' · 🖼️':'')+(videos?' · 🎬':'');}
 function media(a,campaign){if(!a||!a.asset||!campaign)return '';var url=String(window.API_BASE||'/api').replace(/\/$/,'')+'/live-campaigns/'+Number(campaign)+'/scenario-assets/'+Number(a.asset.asset_id)+'?init_data='+encodeURIComponent(U.auth());return a.kind==='video'?'<video controls preload="none" src="'+e(url)+'"></video>':'<img src="'+e(url)+'" alt="'+e(t('lcwReference'))+'" loading="lazy">';}
 var legacyScenario=scenario;scenario=function(a,campaign){if(!a||!a.enabled)return '';if(!(a.steps||[]).length)return legacyScenario(a,campaign);return '<details class="lr-scenario-preview"><summary>👁 '+e(badge(a))+(a.title?' · '+e(a.title):'')+'</summary><ol class="lr-scenario-steps">'+a.steps.map(function(s){return '<li><strong>'+e(s.text)+'</strong>'+(s.description?'<p>'+e(s.description)+'</p>':'')+media(s.media,campaign)+'</li>';}).join('')+'</ol></details>';};
 function mutualOffers(offers){return (offers||[]).filter(function(o){return o&&o.offer_type!=='contract'&&o.available!==false;});}
 function termKey(o){return [Number(o.min_days||o.duration_days||14),Number(o.max_days||o.duration_days||o.min_days||o.duration_days||14),Number(o.control_day_min||o.control_day_count||0),Number(o.control_day_max||o.control_day_count||o.control_day_min||0)].join(':');}
 function sceneId(o){var act=o.activity&&o.activity.enabled?o.activity:null;return act?'s:'+(act.title||'')+':'+(act.steps||[]).length:'none';}
 function reviewId(o){return o.review_mode||'off';}
 function termLabel(o){var p=termKey(o).split(':').map(Number),days=p[0]===p[1]?'D'+p[0]:'D'+p[0]+'–'+p[1],kd=p[2]?(p[2]===p[3]?p[2]:p[2]+'–'+p[3]):'';return '📅 '+days+(kd?' · 📸 '+kd+' '+t('lrCheckpointsShort'):'');}
 function sceneLabel(o){var act=o.activity&&o.activity.enabled?o.activity:null;if(!act)return t('mkNoScenario');var steps=(act.steps||[]).length;return t('mkScenarioChip',{name:act.title||t('lrScenario'),n:steps||1});}
 function reviewLabel(mode){return t(mode==='required'?'mkOfferRevRequired':mode==='voluntary'?'mkOfferRevVoluntary':'mkRevOff');}
 function resolveRoute(offers,sel){
  var list=mutualOffers(offers);if(!list.length)return null;sel=sel||{};
  var preferred=list.find(function(o){return o.preferred_track;})||null;
  if(sel.preset&&preferred)return {list:list,preferred:preferred,offer:preferred,source:preferred.source||'link',term:termKey(preferred),scene:sceneId(preferred),review:reviewId(preferred)};
  var source=sel.source||(preferred&&preferred.source)||list[0].source||'link';
  var byS=list.filter(function(o){return (o.source||'link')===source;});
  if(!byS.length){source=list[0].source||'link';byS=list.filter(function(o){return (o.source||'link')===source;});}
  var term=sel.term||termKey(byS.find(function(o){return o.preferred_track;})||byS[0]);
  var byT=byS.filter(function(o){return termKey(o)===term;});
  if(!byT.length){term=termKey(byS[0]);byT=byS.filter(function(o){return termKey(o)===term;});}
  var scene=sel.scene||sceneId(byT.find(function(o){return o.preferred_track;})||byT[0]);
  var bySc=byT.filter(function(o){return sceneId(o)===scene;});
  if(!bySc.length){scene=sceneId(byT[0]);bySc=byT.filter(function(o){return sceneId(o)===scene;});}
  var review=sel.review||reviewId(bySc.find(function(o){return o.preferred_track;})||bySc[0]);
  var offer=bySc.find(function(o){return reviewId(o)===review;})||bySc[0];
  return {list:list,preferred:preferred,offer:offer,source:offer.source||source,term:termKey(offer),scene:sceneId(offer),review:reviewId(offer)};
 }
 function stepChips(attr,rows,current,label){var seen={};return '<div class="mk-step"><p class="mk-step-label">'+e(label)+'</p><div class="mk-step-row">'+rows.map(function(row){var key=row[0];if(seen[key])return '';seen[key]=1;return '<button type="button" class="meta-chip mk-step-chip'+(key===current?' accent-blue':'')+'" '+attr+'="'+e(key)+'" aria-pressed="'+(key===current)+'">'+e(row[1])+'</button>';}).join('')+'</div></div>';}
 function builder(offers,sel){
  var route=resolveRoute(offers,sel);if(!route)return '';
  var list=route.list,offer=route.offer,byS=list.filter(function(o){return (o.source||'link')===(offer.source||'link');}),byT=byS.filter(function(o){return termKey(o)===termKey(offer);});
  var sources=[],terms=[],scenes=[],reviews=[];
  function sourceChip(s){return t({link:'mkSrcLink',keywords:'mkSrcKeys',key:'mkSrcKeys',web:'mkSrcWeb',browser:'mkSrcWeb'}[s]||'mkSrcLink');}
  list.forEach(function(o){sources.push([o.source||'link',sourceChip(o.source)]);});
  byS.forEach(function(o){terms.push([termKey(o),termLabel(o)]);});
  byT.forEach(function(o){scenes.push([sceneId(o),sceneLabel(o)]);});
  byT.filter(function(o){return sceneId(o)===sceneId(offer);}).forEach(function(o){reviews.push([reviewId(o),reviewLabel(reviewId(o))]);});
  var preset=route.preferred?'<button type="button" class="mk-preset" data-mk-preset aria-pressed="'+(Number(route.preferred.campaign_id)===Number(offer.campaign_id))+'">⭐ '+e(t('mkPresetRoute'))+'</button>':'';
  var preview=offer.activity&&offer.activity.enabled?scenario(offer.activity,offer.campaign_id):'';
  return '<section class="mk-route-builder lm-task" data-mk-builder><h3>'+e(t('mkDealTitle'))+'</h3><div class="mk-deal-modes"><p>'+e(t('mkModeClosed'))+'</p><p>'+e(t('mkModeLive',{n:list.length}))+'</p></div>'+preset+stepChips('data-mk-source',sources,offer.source||'link',t('mkStepSource'))+stepChips('data-mk-term',terms,termKey(offer),t('mkStepTerm'))+stepChips('data-mk-scene',scenes,sceneId(offer),t('mkStepScene'))+stepChips('data-mk-review',reviews,reviewId(offer),t('mkStepReview'))+preview+'<button type="button" class="lm-action lm-action-primary" data-mk-propose data-mk-instant="'+(offer.instant_install?1:0)+'">'+e(t(offer.instant_install?'mkStartNow':'mkProposeMutual'))+'</button></section>';
 }
 window.LiveRouteUI={phase:phase,route:route,receipts:receipts,scenario:scenario,offer:offer,badge:badge,builder:builder,resolveRoute:resolveRoute};
})();
