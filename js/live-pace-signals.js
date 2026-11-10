/* Pace stays on the header and inside the pace bar. The old pre-metrics banner is not rendered. */
(function(){'use strict';var U=LiveMarketUI,t=U.t,e=U.e;
 function active(p){return !!(p&&(p.below_floor||p.trend_percent<0));}
 function human(p){
  if(!p)return '';
  var deficit=Math.max(0,Number(p.deficit_installs)||0),recover=Math.max(0,Number(p.recovery_installs)||0),need=deficit||recover;
  if(p.trend_percent<0)return t('lpsHuman',{x:Math.abs(Number(p.trend_percent)).toFixed(0),rank:t('lpsRankHold'),deficit:need});
  if(p.below_floor)return t('lpsHumanFloor',{deficit:deficit});
  return '';
 }
 function inline(p,paused){
  if(!active(p)&&!paused)return {badge:'',panel:''};
  var parts=[];
  if(paused)parts.push(t('lpsPauseBadge'));
  if(p&&p.below_floor)parts.push(t('lpsBadgeShort',{count:p.deficit_installs||0}));
  if(p&&p.trend_percent<0)parts.push(t('lpsBadgeDrop',{n:Math.abs(Number(p.trend_percent)).toFixed(0)}));
  var body=[human(p),paused?t('lpsPauseBody'):''].filter(Boolean).join(' ');
  return {badge:'<span class="lps-inline-toggle" role="button" tabindex="0" data-lps-toggle>⚠️ '+e(parts.join(' · '))+' ▾</span>',
   panel:'<div class="lps-inline-body" data-lps-detail hidden><p>'+e(body)+'</p><div class="lps-actions"><button type="button" class="lm-action" data-lc-action="showcase">'+e(t('lpsMarket'))+'</button><button type="button" class="lm-action" data-lc-action="guests">'+e(t('lpsGuests'))+'</button></div></div>'};
 }
 function html(){return '';}
 window.LivePaceSignals={html:html,inline:inline};
})();
