/* Resolve against the authoritative workspace before offering a new campaign. */
(function(){
 'use strict';
 function t(k,v){return LiveGuidance.text(k,v);}function e(s){return escapeHTML(String(s||''));}
 function project(id){if(window.switchTab)switchTab('projects');var card=document.getElementById('project-card-'+id);if(!card&&window.renderProjects){renderProjects(true);card=document.getElementById('project-card-'+id);}if(card&&card.classList.contains('card-collapsed')&&window.toggleProjectCard)toggleProjectCard(id);return card;}
 function highlight(node){if(!node)return false;node.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});node.classList.remove('lg-target');void node.offsetWidth;node.classList.add('lg-target');setTimeout(function(){node.classList.remove('lg-target');},3000);var focus=node.matches('button')?node:node.querySelector('summary,button');if(focus)focus.focus({preventScroll:true});return true;}
 function reveal(id,c){project(id);var panel=document.querySelector('[data-live-campaigns="'+Number(id)+'"]'),node=c&&panel&&panel.querySelector('[data-campaign-id="'+Number(c.id)+'"]');if(node){var details=node.querySelector('[data-lc-card]');if(details)details.open=true;var keys=node.querySelector('[data-growth-keys]');if(keys)keys.open=true;}return highlight(node||panel);}
 function choose(id,rows,kind,open,create){
  var html='<p class="lm-caption">'+e(t('lgExistingHint'))+'</p><div class="lg-route-list">'+rows.map(function(c){var d=c.definition;return '<button type="button" class="lm-action" data-lg-existing="'+c.id+'"><strong>'+e(c.name||t(d&&d.source==='keywords'?'lcwKeywords':d&&d.source==='web'?'lcwWeb':'lcBridge'))+'</strong><small>'+e(t(c.status==='active'?'lcActive':'lcOff'))+(d?' · D'+d.retention.days:'')+'</small></button>';}).join('')+(create?'<button type="button" class="lm-action" data-lg-new>'+e(t(kind==='scenario'?'lgNewScenario':'lgNewKeys'))+'</button>':'')+'</div>';
  var layer=LiveMarketUI.sheet(t(kind==='reviews'?'lgReviewCampaign':kind==='scenario'?'lgScenarioCampaign':'lgTrafficCampaign'),html);
  layer.addEventListener('click',function(ev){var b=ev.target.closest('[data-lg-existing],[data-lg-new]');if(!b)return;var row=rows.find(function(r){return r.id===Number(b.dataset.lgExisting);});LiveMarketUI.closeTop();if(row)open(row);else if(create)create();});return true;
 }
 async function route(id,kind){
  var data=await LiveCampaigns.workspace(id);if(!data)return false;
  var rows=data.rows,custom=rows.filter(function(c){return !!c.definition;}),active=custom.filter(function(c){return c.status==='active';});
  if(kind==='reviews'){
   project(id);
   if(data.control.parameters.request_reviews===false)return LiveCampaigns.openParameters(id);
   var candidates=active.length?active:custom;
   function review(c){project(id);return LiveCampaignWizard.editAt(id,c,3);}
   if(candidates.length===1)return review(candidates[0]);
   if(candidates.length>1)return choose(id,candidates,kind,review,null);
   reveal(id,rows.find(function(c){return c.kind==='closed_bridge';}));if(window.showToast)showToast(t('lgReviewsAlreadyOn'),7000);return true;
  }
  if(kind==='keys'){
   var candidates=custom.filter(function(c){return ['keywords','web'].includes(c.definition.source);}).sort(function(a,b){return Number(b.status==='active')-Number(a.status==='active');});
   function create(){return LiveCampaignWizard.openSource(id,'keywords');}
   if(!candidates.length)return create();
   if(candidates.length===1&&candidates[0].definition.source==='keywords')return reveal(id,candidates[0]);
   return choose(id,candidates,kind,function(c){reveal(id,c);},create);
  }
  if(kind==='scenario'){
   function open(c){project(id);return LiveCampaignWizard.editAt(id,c,3);}
   if(active.length===1)return open(active[0]);
   if(active.length>1)return choose(id,active,kind,open,function(){return LiveCampaignWizard.scenario(id);});
   if(custom.length)return choose(id,custom,kind,open,function(){return LiveCampaignWizard.scenario(id);});
   return LiveCampaignWizard.scenario(id);
  }
  return false;
 }
 window.LiveGuidanceRouting={route:route,reveal:reveal,highlight:highlight};
})();
