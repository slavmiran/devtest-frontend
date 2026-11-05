/* Conditional projection only: append each forecast day AFTER calculating its corridor. */
(function(){
 'use strict';
 var defaults={recent_min_installs:2,active_month_weight:.5,floor_base:.35,floor_yesterday:.3,floor_peak:.2,peak_threshold:6,opt_growth:1.3,opt_sigma:1.5,opt_offset:1.5};
 function windowFor(history,config){
  var c=Object.assign({},defaults,config),h=Array(28).fill(0).concat(history).slice(-28),week=h.slice(-7),sum=week.reduce(function(a,b){return a+b;},0),b=Math.max(1,week.reduce(function(a,n,i){return a+n*(i+1);},0)/28,sum/7,h.reduce(function(a,b){return a+b;},0)/28*(sum>=c.recent_min_installs?c.active_month_weight:1)),peak=Math.max.apply(null,h.slice(-3));
  return {B_t:b,L_floor:Math.max(Math.floor(c.floor_base*b),peak>=c.peak_threshold?Math.max(Math.floor(c.floor_yesterday*h[27]),Math.floor(c.floor_peak*peak),1):0),U_opt:Math.ceil(c.opt_growth*b+c.opt_sigma*Math.sqrt(b)+c.opt_offset)};
 }
 function target(c,profile,config){var x=Object.assign({},c),k=Object.assign({},defaults,config);if(profile==='expanded')x.U_opt=Math.ceil(1.5*c.B_t+k.opt_sigma*Math.sqrt(c.B_t)+k.opt_offset);if(profile==='conservative'){x.L_floor=Math.max(c.L_floor,Math.floor(.85*c.B_t));x.U_opt=Math.max(x.L_floor,Math.ceil(1.15*c.B_t+k.opt_sigma*Math.sqrt(c.B_t)+k.opt_offset));}return x;}
 function pick(hex,lo,hi,index){var range=hi-lo+1,rem=0;if(hex){String(hex).split('').forEach(function(ch){rem=(rem*16+parseInt(ch,16))%range;});return lo+rem;}return lo+Math.round((hi-lo)*[.25,.85,.45,1,0,.65,.35][index%7]);}
 function autoQuota(c,draw,i){var b=c.B_t,lo=Math.max(c.L_floor,Math.round(b*(b>=8?.8:1))),hi=Math.max(lo,Math.min(c.U_opt,Math.ceil(b>=8?1.25*b:b+Math.sqrt(b)+1)));return pick(draw,lo,hi,i);}
 function sameVolume(a,b){function clean(p){p=Object.assign({},p);['spacing','gapMinMinutes','gapMaxMinutes','batchSize','pauseMinHours','pauseMaxHours','afterGoal'].forEach(function(k){delete p[k];});return JSON.stringify(Object.keys(p).sort().map(function(k){return [k,p[k]];}));}return clean(a)===clean(b);}
 function forecast(d){
  var v=d.volume,p=v.manualPlan,mode=v.mode||(v.paced?'manual':'free'),ctx=d.forecastContext,h=ctx&&Array.isArray(ctx.history)?ctx.history.slice():null,c=d.corridor,source='plan',saved;try{saved=JSON.parse(d.manualPlanSaved||'null');}catch(_){}
  var unchanged=p&&saved&&sameVolume(p,saved),offset=unchanged&&d.manualRuntime?Math.max(0,d.manualRuntime.day_index-1):0,values=[],targets=[],corridors=[],canonical=[],dayModes=[],goals=[],rest=0,ceiling=Number.isFinite(d.paceCampaignCapacity)?d.paceCampaignCapacity:Infinity;
  for(var i=0;i<14;i++){
   var raw=h?windowFor(h,ctx.config):c,day=i+offset+1,auto=mode==='auto'||mode==='manual'&&p&&p.strategy!=='wave'&&p.afterGoal==='auto'&&day>p.days,band=raw&&target(raw,mode==='manual'&&!auto?v.corridorProfile:'standard',ctx&&ctx.config),n=null;
   if(mode!=='free'){
    if(auto){n=raw?autoQuota(raw,ctx&&ctx.draws&&ctx.draws[i],i):null;source='illustration';}
    else if(p){if(p.strategy==='wave')n=pick(ctx&&ctx.draws&&ctx.draws[i],p.minInstalls,p.maxInstalls,i);else if(day>p.days&&p.afterGoal==='wave')n=Math.max(1,Math.min(500,p.targetInstalls+pick(ctx&&ctx.plateau_draws&&ctx.plateau_draws[i],-2,2,i)));else n=LiveManualPlan.quota(p,day);
     if(!ctx&&unchanged&&d.manualRuntime&&Array.isArray(d.manualRuntime.preview)&&!p.afterGoal){n=d.manualRuntime.preview[i];source='server';}
    }else{source='legacy';n=Math.max(1,Math.round(LiveCampaignPace.quota(v.dailyInstalls,v.rampDays,i+1)*24/v.pauseHours));}
   }
   targets.push(n);var goal=Number.isFinite(n)?Math.min(n,ceiling):n;goals.push(goal);
   if(Number.isFinite(goal)&&(auto||p)){
    var gap=auto?LiveCampaignPaceView.autoGap(raw):{min:p.gapMinMinutes,max:p.gapMaxMinutes},at=Math.max(i*1440,rest),end=(i+1)*1440,count=0,spacing=auto?'interval':p.spacing,batch=p&&p.batchSize||1;
    while(count<goal&&at<end){count++;if(count===goal){if(!auto)rest=at+(p.pauseMinHours+p.pauseMaxHours)/2*60;break;}if(spacing==='interval'||spacing==='micro'&&count%batch===0)at+=Math.max(1,(gap.min+gap.max)/2);}n=count;
   }else n=goal;
   values.push(n);corridors.push(band);canonical.push(raw);dayModes.push(auto?'auto':mode);
   if(h&&Number.isFinite(n))h=h.concat(n).slice(-28);
  }
  var nums=values.filter(Number.isFinite);return {values:values,targets:targets,corridors:corridors,canonical:canonical,dayModes:dayModes,dynamic:!!h&&mode!=='free',mode:mode,corridor:corridors[0],source:source,min:nums.length?Math.min.apply(null,nums):null,max:nums.length?Math.max.apply(null,nums):null,quota:mode==='free'?null:dayModes[0]==='auto'?canonical[0]&&canonical[0].U_opt:targets[0],above:values.some(function(n,i){return corridors[i]&&n!=null&&n>corridors[i].U_opt;}),below:values.some(function(n,i){return corridors[i]&&n!=null&&n<corridors[i].L_floor;}),campaignLimited:targets.some(function(n){return n>ceiling;}),spacingLimited:values.some(function(n,i){return n!=null&&n<goals[i];})};
 }
 window.LivePaceForecast={windowFor:windowFor,target:target,autoQuota:autoQuota,forecast:forecast,sameVolume:sameVolume};
})();
