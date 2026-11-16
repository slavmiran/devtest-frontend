/* One learning sheet serves the campaign block and every pace information button. */
(function(){
 'use strict';var layer=null,focus=null;function t(k){return window.t(k,{},window.lang==='ru'?'ru':'en');}function e(s){return window.escapeHTML(s);}
 function close(){if(!layer)return;layer.remove();layer=null;if(focus&&focus.isConnected)focus.focus({preventScroll:true});if(window.syncTelegramBackButton)window.syncTelegramBackButton();}
 function open(topic,trigger){if(layer)close();focus=trigger||document.activeElement;layer=document.createElement('div');layer.id='live-campaign-learning';layer.className='modal-overlay active project-instructions-overlay';
  var topics=[
   ['rank','pulseLearnRank','pulseLearnRankBody','pulseLearnRankFactors'],
   ['pace','pulseLearnPace','pulseLearnPaceBody','pulseLearnWindows'],
   ['sources','pulseLearnSources','pulseLearnSourcesBody'],
   ['release','pulseLearnRelease','pulseLearnReleaseBody'],
   ['reviews','pulseLearnFeedback','pulseLearnFeedbackBody','pulseLearnReviewPolicy']
  ];
  var googleLinks=[
   ['https://developer.android.com/guide/playcore/in-app-review','Google Play In-App Review'],
   ['https://support.google.com/googleplay/android-developer/answer/138230',t('pulseLearnGoogleRatings')],
   ['https://support.google.com/googleplay/android-developer/answer/9898684',t('lcpGooglePolicy')]
  ];
  layer.innerHTML='<section class="project-instructions-sheet lcp-learning" role="dialog" aria-modal="true" aria-labelledby="lcp-learning-title">'+
   '<header class="project-instructions-sheet__head"><h3 id="lcp-learning-title">📚 '+e(t('lcpLearn'))+'</h3>'+
   '<button type="button" class="meta-chip" data-learn-close aria-label="'+e(t('lcwClose'))+'">×</button></header>'+
   '<div class="lcp-learning-topics">'+topics.map(function([id,title,...paragraphs]){
    return '<section id="lcp-topic-'+id+'"><h4>'+e(t(title))+'</h4>'+paragraphs.map(function(key){
     return '<p>'+e(t(key))+'</p>';
    }).join('')+(id==='pace'?'<small>'+e(t('lcpEvidence'))+'</small>':'')+
    (id==='reviews'?'<ul>'+googleLinks.map(function([href,label]){
     return '<li><a href="'+href+'" target="_blank" rel="noopener noreferrer">'+e(label)+' ↗</a></li>';
    }).join('')+'</ul>':'')+'</section>';
   }).join('')+'</div></section>';
  layer.onclick=function(ev){if(ev.target===layer||ev.target.closest('[data-learn-close]'))close();};
  layer.addEventListener('keydown',function(ev){
   if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation();close();return;}
   if(ev.key!=='Tab')return;
   var controls=Array.from(layer.querySelectorAll('button,a'));
   var next=ev.shiftKey&&document.activeElement===controls[0] ? controls.at(-1)
    : !ev.shiftKey&&document.activeElement===controls.at(-1) ? controls[0] : null;
   if(next){ev.preventDefault();next.focus();}
  });
  document.body.append(layer);
  layer.querySelector('button').focus({preventScroll:true});
  var target={spikes:'pace',stabilize:'pace',ramp:'pace',isolation:'pace'}[topic]||topic;
  if(topics.some(function(row){return row[0]===target;}))layer.querySelector('#lcp-topic-'+target).scrollIntoView({block:'start'});
  if(window.syncTelegramBackButton)window.syncTelegramBackButton();
 }
 window.LiveCampaignLearning={open:open,close:close};
})();
