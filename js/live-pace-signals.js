/* Recovery hints are backed exclusively by completed UTC-day observations. */
(function(){'use strict';var U=LiveMarketUI,t=U.t,e=U.e;
 function html(p,app,compact){if(!p||!p.below_floor&&!(p.trend_percent<0))return '';var lead=p.below_floor?t('lpsBelow',{n:p.below_floor_days,count:p.deficit_installs}):t('lpsWeek',{n:U.n(Math.abs(p.trend_percent))});
  return '<aside class="lps-signal" data-pace-completed="'+e(p.completed_through)+'"><strong>'+e(lead)+'</strong><small>'+e(t('lpsCompleted',{date:p.completed_through}))+'</small>'+(!compact&&p.trend_percent<0?'<p>'+e(t('lpsRecovery',{n:p.recovery_installs}))+'</p>':'')+(!compact?'<div class="lps-slices">'+(p.slices||[]).filter(function(s){return s.deficit>0;}).map(function(s){return '<span>'+e(t('lpsSlice',{n:s.days,count:s.deficit}))+'</span>';}).join('')+'</div>':'')+'<div class="lps-actions"><button type="button" class="lm-action" data-live-action="queue" data-live-app="'+Number(app)+'">'+e(t('lpsMarket'))+'</button><button type="button" class="lm-action" data-live-action="guests" data-live-app="'+Number(app)+'">'+e(t('lpsGuests'))+'</button></div></aside>';
 }
 window.LivePaceSignals={html:html};
})();
