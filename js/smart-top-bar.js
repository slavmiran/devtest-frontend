/* One global HUD. Existing settings nodes and profile actions are moved, never cloned. */
(function(){
 'use strict';var menu,bar,backdrop,profile,settings,timer,focus=null,tab='profile',lastTrigger='',frame=0,rotation=0,actor='',profileKey='',quietUntil=0,quietKey='',armedUntil=0;
 function t(k,v){return window.t(k,v||{},window.lang||'ru');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function stats(){return typeof visibilityStats==='object'&&visibilityStats||{};}
 function who(){var u=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initDataUnsafe&&Telegram.WebApp.initDataUnsafe.user||{};return {id:String(u.id||window.userId||'guest'),name:u.first_name||t('hudProfile')};}
 function number(v,compact){return v!=null&&v!==''&&Number.isFinite(Number(v))?new Intl.NumberFormat(window.lang==='ru'?'ru-RU':'en-US',compact?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:2}).format(Number(v)):'—';}
 function openNow(){return !!(menu&&menu.classList.contains('active'));}
 function childrenOpen(){return !!document.querySelector('.modal-overlay.active,.wizard-overlay.active,.protection-center-view.active,#attract-testers-sheet-overlay.active');}
 function logicalTab(next){return next==='settings'?'settings':'profile';}
 function gear(){return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgba(226,232,240,0.72)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>';}
 function button(key,label,classes){return '<button type="button" class="hud-chip '+(classes||'')+'" data-hud-open="'+key+'" aria-expanded="false" aria-controls="system-drop-menu">'+label+'</button>';}
 function init(){if(bar)return true;menu=document.getElementById('system-drop-menu');if(!menu)return false;
  var content=menu.querySelector('.system-drop-content');if(!content)return false;
  var oldTab=menu.querySelector('.system-drop-tab-container'),langNode=document.getElementById('current-lang-label'),dot=document.getElementById('loading-dot');
  bar=document.createElement('header');bar.id='smart-top-bar';bar.className='smart-top-bar';bar.setAttribute('aria-label',t('hudTitle'));
  bar.innerHTML=button('profile','<span class="hud-identity"><span class="hud-name-line"><b data-hud-name></b><small data-hud-reliability></small></span><span class="hud-ticker" data-hud-rotation></span></span>','hud-profile')+button('wallet','<span class="hud-wallet-main"><b data-hud-balance>—</b></span><small>$BUST</small>','hud-wallet')+button('reviews','<span class="hud-review-top"><b data-hud-reviews>—</b><small data-hud-piggy></small></span><span class="hud-review-track"><i data-hud-progress></i></span><small class="hud-review-caption" data-hud-review-label></small>','hud-reviews')+button('settings',gear()+'<span class="hud-language"></span>','hud-settings');
  var language=bar.querySelector('.hud-language');if(langNode)language.appendChild(langNode);if(dot)language.appendChild(dot);if(oldTab)oldTab.remove();
  backdrop=document.createElement('div');backdrop.id='smart-hud-backdrop';backdrop.hidden=true;backdrop.onclick=function(ev){ev.stopPropagation();close();};
  menu.classList.add('smart-hud-drawer');menu.classList.remove('system-drop-menu--projects-tab');menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label',t('hudTitle'));
  var shell=document.createElement('div');shell.className='hud-shell';shell.innerHTML='<header class="hud-drawer-head"><div class="hud-tabs" role="tablist"><button type="button" id="hud-tab-profile" data-hud-tab="profile" role="tab" aria-controls="hud-profile"></button><button type="button" id="hud-tab-settings" data-hud-tab="settings" role="tab" aria-controls="hud-settings"></button></div></header><div class="hud-panels"><section id="hud-profile" role="tabpanel" aria-labelledby="hud-tab-profile"></section><section id="hud-settings" role="tabpanel" aria-labelledby="hud-tab-settings"></section></div><footer class="hud-footer"></footer>';
  profile=shell.querySelector('#hud-profile');settings=shell.querySelector('#hud-settings');
  var oldTitle=content.querySelector('.system-drop-title');if(oldTitle)oldTitle.remove();
  var feedback=content.querySelector('.system-feedback-buttons');if(feedback)shell.querySelector('.hud-footer').appendChild(feedback);
  settings.appendChild(content);menu.appendChild(shell);
  group('hudAutoGroup','#auto-accept-section',true);group('hudProfileGroup','.system-setting-row--device,#settings-email-row,#default-group-joined-row');group('hudNotificationsGroup','.system-language-card,#proof-ping-settings-row');group('hudPrivacyGroup','#blacklist-settings-row,#homescreen-shortcut-row');
  Array.from(content.children).forEach(function(node){if(!node.closest('details')&&node.tagName!=='DETAILS')settings.querySelector('details:last-of-type').appendChild(node);});
  document.body.append(backdrop,bar);document.body.classList.add('smart-hud-enabled');
  function fromChip(ev){var b=ev.target.closest('[data-hud-open]');if(!b)return;ev.preventDefault();ev.stopPropagation();if(ev.type==='click'&&Date.now()<armedUntil)return;if(ev.type!=='click')armedUntil=Date.now()+500;toggle(b.dataset.hudOpen,b);}
  bar.addEventListener('pointerup',function(ev){if(ev.pointerType==='mouse'&&ev.button!==0)return;fromChip(ev);});
  bar.addEventListener('click',fromChip);
  menu.addEventListener('click',function(ev){var b=ev.target.closest('[data-hud-tab]');if(b)setTab(b.dataset.hudTab,true);});
  menu.addEventListener('toggle',function(ev){var d=ev.target;if(d.tagName==='DETAILS'&&d.open&&d.classList.contains('hud-settings-group'))content.querySelectorAll('details.hud-settings-group').forEach(function(other){if(other!==d)other.open=false;});},true);
  menu.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&!childrenOpen()){ev.preventDefault();ev.stopPropagation();close();}if(ev.key==='Tab'&&!childrenOpen()){var nodes=Array.from(menu.querySelectorAll('button,input,select,summary,a[href]')).filter(function(n){return !n.disabled&&n.getClientRects().length;});if(nodes.length&&(ev.shiftKey&&document.activeElement===nodes[0]||!ev.shiftKey&&document.activeElement===nodes.at(-1))){ev.preventDefault();(ev.shiftKey?nodes.at(-1):nodes[0]).focus();}}if(ev.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();setTab(tab==='profile'?'settings':'profile',true);}});
  new MutationObserver(function(){syncOpen();}).observe(menu,{attributes:true,attributeFilter:['class']});
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  timer=setInterval(function(){if(!document.hidden&&!openNow()&&!childrenOpen()&&!bar.matches(':hover,:focus-within')&&!matchMedia('(prefers-reduced-motion: reduce)').matches){rotation++;counts(true);}},5500);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)counts();});
  document.addEventListener('keydown',function(ev){if(ev.key==='Escape'&&!ev.defaultPrevented&&openNow()&&!childrenOpen()){ev.preventDefault();close();}});
  setTab('profile');refresh();syncOpen();return true;
 }
 function group(key,selector,open){var d=document.createElement('details');d.className='hud-settings-group';d.open=!!open;d.innerHTML='<summary data-hud-group="'+key+'"></summary>';settings.querySelector('.system-drop-content').appendChild(d);selector.split(',').forEach(function(part){settings.querySelectorAll(part).forEach(function(node){if(node!==d&&!d.contains(node))d.appendChild(node);});});}
 function setTab(next,focusTab){tab=logicalTab(next);if(!menu)return;menu.querySelectorAll('[data-hud-tab]').forEach(function(b){var selected=b.dataset.hudTab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected&&focusTab)b.focus();});profile.hidden=tab!=='profile';settings.hidden=tab!=='settings';}
 function syncOpen(){if(!bar)return;var open=openNow(),blocked=childrenOpen();backdrop.hidden=!open;menu.setAttribute('aria-hidden',String(!open||blocked));menu.inert=!open||blocked;document.body.classList.toggle('smart-hud-open',open);bar.querySelectorAll('[data-hud-open]').forEach(function(b){b.setAttribute('aria-expanded',String(open&&logicalTab(b.dataset.hudOpen)===tab));});if(window.syncTelegramBackButton)syncTelegramBackButton();}
 function silenced(key){return Date.now()<quietUntil&&(quietKey==='*'||!key||quietKey===key);}
 function silence(key){quietUntil=Date.now()+700;quietKey=key||'*';}
 function open(next,trigger){var key=logicalTab(next||'profile');if(silenced(key))return;if(!init())return;focus=trigger||document.activeElement;lastTrigger=key;setTab(key);menu.classList.add('active');refresh();syncOpen();['populateSettingsEmail','populateDeviceInfoSettings'].forEach(function(name){if(typeof window[name]==='function')window[name]();});if(window.refreshHomeScreenStatus)refreshHomeScreenStatus({force:true});if(window.tg&&tg.HapticFeedback)tg.HapticFeedback.selectionChanged();}
 function close(restore,key){if(!menu)return;silence(key||tab);menu.classList.remove('active');syncOpen();if(restore!==false&&focus&&focus.isConnected&&focus!==document.activeElement)try{focus.focus({preventScroll:true});}catch(_){}}
 function toggle(next,trigger){var key=logicalTab(next||'settings');if(silenced(key))return;if(openNow()&&tab===key){close(false,key);return;}open(next||'settings',trigger);}
 function finite(value){return value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;}
 function reliabilityTone(score){if(score==null)return '';if(score>=80)return '#57d996';if(score>=65)return '#e5b567';if(score>=50)return '#e08c58';return '#e56b6f';}
 function alertTone(kind,value){if(kind==='karma'&&value<0)return value<=-10?'#e56b6f':value<=-3?'#e08c58':'#e5b567';if(kind==='sla'&&value>=24)return value>=36?'#e56b6f':'#e08c58';if(kind==='rate'&&value<50)return value<25?'#e56b6f':'#e08c58';return '';}
 function profileSummary(){
  var s=stats(),c=s.contribution||{},sent=s.feedback_sent_counts||{};
  var values=s.feedback_sent_counts?sent:c;
  var points=s.contribution_score!=null?s.contribution_score:(c.contribution_score!=null?c.contribution_score:(s.contribution_season||{}).score);
  var rate=finite(s.acceptance_rate_pct);if(rate==null)rate=finite(sent.acceptance_rate_pct);
  return {
   closed:t('hudClosedSummary',{tests:number(s.completed_tests||0),grants:number(s.grant_tests_count||0),active:number(s.my_active_tests||0)}),
   quality:t('hudQualityLine',{points:number(points),rate:rate==null?'—':number(rate)+'%'}),
   feedback:t('hudFeedbackSent',{bugs:number(values.bugs_count||0),ideas:number(values.ideas_count||0),reviews:number(values.play_reviews_count||0)})
  };
 }
 function projects(){return typeof myProjects!=='undefined'&&Array.isArray(myProjects)?myProjects:[];}
 function livePulse(){var installs=0,people=0;projects().forEach(function(p){if(!p||p.phase!=='live')return;var m=p.live_metrics||{},eng=m.engagement||{};var today=m.today_installs_utc;if(today==null&&m.installs)today=m.installs.today_installs_utc!=null?m.installs.today_installs_utc:m.installs.today;var active=m.active_users;if(active==null)active=eng.active_testers;installs+=Number(today)||0;people+=Number(active)||0;});return t('hudLivePulse',{installs:number(installs),testers:number(people)});}
 function contribVariants(){var s=stats(),c=s.contribution||{},score=number(s.contribution_score!=null?s.contribution_score:(c.contribution_score!=null?c.contribution_score:(s.contribution_season||{}).score));var bits=['bugs_count','ideas_count','play_reviews_count','five_screens_count','text_reports_count','video_reports_count'].map(function(k,i){return t('mkContribution'+i)+': '+number(c[k]||0);}).join(' · ');var word=t('hudContribWord');return ['⚡ '+word+' '+score+' ( '+bits+' )',word+' '+score+' ( '+bits+' )','⚡ '+score+' ( '+bits+' )'];}
 function tickerSlides(){
  var s=stats(),season=s.contribution_season||{},karma=finite(s.ownerKarma),sla=finite(s.avg_handle_hours),rate=finite(s.acceptance_rate_pct);
  var slides=[{items:[{text:t('hudKarma')+': '+number(s.ownerKarma||0),tone:alertTone('karma',karma==null?0:karma)},{text:t('hudSprint')+': '+(season.rank?'#'+number(season.rank):'—')}]}];
  var discipline=[];
  if(sla!=null&&sla>=0)discipline.push({text:t('hudSla')+': '+t('hudHours',{n:number(sla)}),tone:alertTone('sla',sla)});
  if(rate!=null&&rate>=0&&rate<=100)discipline.push({text:t('hudAcceptance')+': '+number(rate)+'%',tone:alertTone('rate',rate)});
  if(discipline.length)slides.push({items:discipline});
  slides.push({kind:'contrib',variants:contribVariants()});
  var live=!!document.querySelector('#tab-projects.active')&&window.ProjectWorkspace&&ProjectWorkspace.isLiveView&&ProjectWorkspace.isLiveView();
  slides.push(live?{kind:'text',text:livePulse()}:{items:[{text:t('hudTests')+': '+number(s.completed_tests||0)},{text:t('hudGrants')+': '+number(s.grant_tests_count||0)},{text:t('hudActive')+': '+number(s.my_active_tests||0)}]});
  return slides;
 }
 function fitLine(node,variants){if(!node)return variants[0];var limit=node.parentElement?node.parentElement.clientWidth:0,chosen=variants[variants.length-1];for(var i=0;i<variants.length;i++){node.textContent=variants[i];if(!limit||node.scrollWidth<=limit+1){chosen=variants[i];break;}}node.textContent=chosen;return chosen;}
 function paintSlide(node,slide){if(slide.kind==='contrib'){node.innerHTML='<span data-hud-fit></span>';var chosen=fitLine(node.querySelector('[data-hud-fit]'),slide.variants);node.title=slide.variants[0];return chosen;}if(slide.kind==='text'){node.innerHTML='<span>'+e(slide.text)+'</span>';node.title=slide.text;return slide.text;}node.innerHTML=(slide.items||[]).map(function(item){return '<span'+(item.tone?' class="hud-alert" style="color:'+item.tone+'"':'')+'>'+e(item.text)+'</span>';}).join('');node.title=(slide.items||[]).map(function(item){return item.text;}).join(' · ');return node.title;}
 function counts(animate){if(!bar)return;var s=stats(),user=who(),wallet=window.ReviewCredits&&ReviewCredits.get();
  if(actor!==user.id){actor=user.id;rotation=0;profileKey='';}
  var name=bar.querySelector('[data-hud-name]');name.textContent=user.name;name.title=user.name;
  var score=finite(s.reliability_index),tone=reliabilityTone(score),pct=score==null?'—':number(score)+'%';
  var rel=bar.querySelector('[data-hud-reliability]');rel.innerHTML=e(t('hudReliabilityWord'))+' <em'+(tone?' style="color:'+tone+'"':'')+'>'+e(pct)+'</em>';
  var slides=tickerSlides(),rotating=bar.querySelector('[data-hud-rotation]');rotating.dataset.slide=String(rotation%slides.length);
  var before=rotating.innerHTML;paintSlide(rotating,slides[rotation%slides.length]);if(animate&&rotating.innerHTML!==before){rotating.classList.remove('hud-tick');void rotating.offsetWidth;rotating.classList.add('hud-tick');}
  var balance=s.balance_bust==null?'—':number(s.balance_bust,Math.abs(s.balance_bust)>=1000000);
  bar.querySelector('[data-hud-balance]').textContent=balance;bar.querySelector('.hud-wallet').setAttribute('aria-label',t('hudBalance',{n:balance}));
  var available=wallet?number(Math.floor(Number(wallet.available)||0),Math.abs(wallet.available)>=1000):'—';
  var piggy=wallet&&Number.isFinite(Number(wallet.progress))?('+'+number(Math.max(0,Math.min(0.999,Number(wallet.progress))))):'';
  bar.querySelector('[data-hud-reviews]').textContent=available;bar.querySelector('[data-hud-piggy]').textContent=piggy;bar.querySelector('[data-hud-review-label]').textContent=t('hudReviewsShort');bar.querySelector('[data-hud-progress]').style.width=Math.min(100,Math.max(0,(wallet&&wallet.progress||0)*100))+'%';bar.querySelector('.hud-reviews').setAttribute('aria-label',t('hudReviews',{n:available,progress:Math.round((wallet&&wallet.progress||0)*100)}));
 }
 function profileSignature(){return JSON.stringify([who().id,window.lang,stats(),projects().map(function(p){return [p.id||p.app_id,p.phase,p.live_metrics&&p.live_metrics.today_installs_utc,p.live_metrics&&p.live_metrics.active_users,p.live_project_control&&p.live_project_control.reserved_bust];})]);}
 function refresh(){if(!bar){init();return;}counts();var s=stats(),key=profileSignature();if(key!==profileKey&&typeof window.buildDeveloperProfileWidget==='function'&&Object.keys(s).length){profileKey=key;var widget=buildDeveloperProfileWidget();profile.replaceChildren();if(widget)profile.appendChild(widget);else profile.textContent=t('hudLoading');}
  menu.querySelector('#hud-tab-profile').textContent='🏆 '+t('hudProfileWallet');menu.querySelector('#hud-tab-settings').textContent='⚙ '+t('hudSettings');menu.querySelectorAll('[data-hud-group]').forEach(function(n){n.textContent=t(n.dataset.hudGroup);});
  var keys=['hudBug','hudIdea','hudQuestion'];menu.querySelectorAll('.system-feedback-buttons button').forEach(function(b,i){b.removeAttribute('data-i18n');b.textContent=t(keys[i]);});
  counts();
 }
 function schedule(){if(frame)return;frame=requestAnimationFrame(function(){frame=0;if(!bar)return;var blocked=childrenOpen();bar.classList.toggle('is-blocked',blocked);backdrop.classList.toggle('is-blocked',blocked);menu.classList.toggle('has-child-layer',blocked);menu.inert=!openNow()||blocked;menu.setAttribute('aria-hidden',String(!openNow()||blocked));if(profileKey!==profileSignature())refresh();});}
 window.SmartTopBar={profileSummary:profileSummary,tickerSlides:tickerSlides,contribVariants:contribVariants,reliabilityTone:reliabilityTone,alertTone:alertTone,livePulse:livePulse,init:init,refresh:refresh,counts:counts,open:open,toggle:toggle,close:close,onTab:function(){if(openNow())close(false);counts();},isOpen:openNow,logicalTab:logicalTab};
 document.addEventListener('DOMContentLoaded',init);
})();
