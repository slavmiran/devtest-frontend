/* Compact campaign summaries. Expanded controls retain the shared switches and frames. */
(function(){
 'use strict';function t(k,v){return window.t(k,v||{},window.lang==='ru'?'ru':'en');}function e(x){return window.escapeHTML(String(x==null?'':x));}
 var chevron='<svg class="lc-card-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
 var icons={rocket:'🚀',search:'🔍',globe:'🌐',link:'🔗',chart:'📈',target:'🎯'};
 function capTag(c){return c.cycle_limit&&c.project_paced?t(c.cycle_used>=c.cycle_limit?'lpcCycleWaiting':'lpcCapTag',{n:c.cycle_limit,used:c.cycle_used||0}):'';}
 function summary(c,tags){return '<details class="lc-card-details" data-lc-card="'+Number(c.id)+'"><summary><span class="lc-card-tags">'+e(tags)+'</span><span class="lc-card-disclose">'+e(t('lpcDetails'))+chevron+'</span></summary>';}
 function build(c,busy){
  var d=c.definition,q=d.volume,sources=d.allowed_sources||[d.source],
   total=q.paced&&q.paceVersion!==2?q.dailyInstalls*q.acquisitionDays:q.totalInstalls,unit=(d.retention.checkpoints.length-1)*10;
  var sourceLabels={link:'lcwLink',web:'lcwWeb',web_brand:'lcwWeb',web_custom:'lcwWeb',keywords:'lcwKeywords'};
  var sourceChips={link:'🔗 '+t('lcChipLink'),web:'🌐 '+t('lcChipWeb'),web_brand:'🌐 '+t('lcChipWeb'),
   web_custom:'🌐 '+t('lcChipWeb'),keywords:'🔍 '+t('lcChipKeywords')};
  var generated=sources.map(function(src){return t(sourceLabels[src]);}).join(' / ');
  var name=String(c.name||'').trim();
  if(!name||name===generated)name=sources.length>1?t('lcMultiEntry',{n:c.id}):t('lcCustomName',{n:c.id});
  var chips=[d.country?'🌍 '+d.country:t('lrGeoAll')].concat(Array.from(new Set(sources.map(function(src){return sourceChips[src];}).filter(Boolean))));
  var active=(c.keywords||[]).filter(function(k){return k.enabled;}).length;
  function action(name,label,cls){return '<button type="button" class="lc-action '+(cls||'')+'" data-lc-action="'+name+'" data-campaign="'+c.id+'"'+(busy?' disabled':'')+'>'+e(label)+'</button>';}
  var r=d.retention,lo=r.min_days||r.days,hi=r.max_days||r.days,kd=function(day){return ['count','interval'].includes(r.checkpoint_mode)?LiveCampaignDraft.checkpoints(day,r.checkpoint_count,r.checkpoint_mode==='interval'?r.checkpoint_interval:null).length:r.checkpoints.length;},klo=kd(lo),khi=kd(hi),cap=capTag(c),tags=(d.activity.enabled?(window.LiveRouteUI?LiveRouteUI.badge(d.activity):t('lrScenario'))+(d.activity.title?' · '+d.activity.title:'')+' · ':'')+(window.ProjectFeedback&&ProjectFeedback.badgeLabel(d.impression)?ProjectFeedback.badgeLabel(d.impression)+' · ':'')+'D'+(lo===hi?lo:lo+'–'+hi)+' · 📸 '+(klo===khi?klo:klo+'–'+khi)+' '+t('lrCheckpointsShort')+' · '+Number(c.confirmed_installs||0)+'/'+(q.limit_mode==='budget'?'∞':total)+' '+t('lcwInstallUnit')+(cap?' · '+cap:'');
  var contracts=window.LiveContracts;
  var toggle=LiveCampaignControls.toggle('toggle-status',t(c.contracts_enabled?'ctMutuals':'lcCampaignToggle'),c,busy,c.status==='active');
  return '<article class="card lc-campaign lc-growth" data-campaign-id="'+c.id+'"><header class="lc-campaign__head"><div><strong>'+
    (d.icon===null?'':icons[d.icon]||icons.rocket)+' '+e(name)+'</strong><div class="lc-campaign-chips">'+chips.map(function(chip){return '<span>'+e(chip)+'</span>';}).join('')+'</div></div>'+
    '<div class="lc-bridge-channels">'+toggle+(contracts&&c.contracts_enabled?contracts.ownerToggle(c):'')+'</div></header>'+
    summary(c,tags)+'<div class="lc-card-expanded">'+(contracts&&c.contracts_enabled?contracts.ownerCard(c):'')+
    '<div class="lc-campaign__section lc-growth-budget"><span>'+e(t(c.contracts_enabled?'ctMutualRate':'lpcRate',{n:unit,days:d.retention.checkpoints.length-1}))+'</span>'+
    (contracts&&!c.contracts_enabled?action('edit-contracts','💎 '+t('lcContractsConfigure'),'lc-contract-shortcut'):'')+'</div>'+
    '<div class="lc-campaign__section lc-campaign-actions">'+action('edit',t('lceEdit'),'lc-edit')+
    '<button type="button" class="lc-action" data-lrs-priority="'+c.id+'" data-lrs-app="'+c.app_id+'" data-lrs-priority-on="'+!c.route_priority+'" title="'+e(t(c.route_priority?'ldxPriorityUnset':'ldxPrioritySet'))+'">⭐ '+e(t(c.route_priority?'lcPriorityUnset':'lcPrioritySet'))+'</button>'+
    action('delete','🗑️ '+t('lcDelete'),'lc-delete')+'</div>'+
    '<div class="lc-campaign__section"><small class="lc-note">📸 '+e(d.retention.checkpoints.join(' · '))+'</small><small class="lc-note">'+e(t('lcwActivity'))+': '+e(t(d.activity.enabled?'pcParamsOn':'pcParamsOff'))+'</small>'+(d.activity.enabled&&window.LiveRouteUI?LiveRouteUI.scenario(d.activity,c.id):'')+'</div>'+
   ((d.allowed_sources||[d.source]).includes('keywords')?'<details class="lc-growth-keys" data-growth-keys="'+c.id+'"><summary>'+e(t('lcgCampaignKeys'))+'</summary>'+(c.keywords||[]).map(function(k){return '<div class="lc-growth-key"><span>'+e(k.keyword)+' <small>'+e(t('lcwInstalls',{n:Number(k.installs||0)}))+'</small></span>'+LiveCampaignControls.toggle('keyword',k.keyword,c,busy||(c.status==='active'&&k.enabled&&active===1),k.enabled,'data-keyword="'+k.id+'" data-enabled="'+!k.enabled+'"'+(c.status==='active'&&k.enabled&&active===1?' title="'+e(t('lcgLastKey'))+'"':''))+'</div>';}).join('')+'</details>':'')+'</div></details></article>';
 }
 window.LiveCampaignGrowthCard={build:build,summary:summary,capTag:capTag,chevron:chevron,icons:icons};
})();
