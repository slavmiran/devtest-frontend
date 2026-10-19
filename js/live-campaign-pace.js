/* Pace preview mirrors server integer quotas. It never decides admission. */
(function(){
 'use strict';
 function quota(rate,ramp,day){return Math.max(1,Math.ceil(rate*(ramp?Math.min(day,ramp)/ramp:1)));}
 function chart(volume){return Array.from({length:volume.rampDays||7},function(_,i){return quota(volume.dailyInstalls,volume.rampDays,i+1);});}
 function risk(hours){return hours<24?'risk':hours<36?'caution':hours<48?'steady':'buffer';}
 function growth(rate,baseline){return typeof baseline==='number'&&Number.isFinite(baseline)&&baseline>0?rate/baseline*100:null;}
 function daily(volume){return Math.min(volume.totalInstalls,volume.dailyInstalls*(volume.paceVersion===2?24/volume.pauseHours:1));}
 window.LiveCampaignPace={quota:quota,chart:chart,risk:risk,growth:growth,daily:daily};
})();
