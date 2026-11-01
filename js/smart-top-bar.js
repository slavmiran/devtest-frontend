/* One global HUD. Existing settings nodes and profile actions are moved, never cloned. */
(function(){
 'use strict';var menu,bar,backdrop,profile,settings,timer,focus=null,tab='profile',lastTrigger='',frame=0,rotation=0,actor='',profileKey='';
 function t(k,v){return window.t(k,v||{},window.lang||'ru');}
 function e(v){return window.escapeHTML(String(v==null?'':v));}
 function stats(){return typeof visibilityStats==='object'&&visibilityStats||{};}
 function who(){var u=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initDataUnsafe&&Telegram.WebApp.initDataUnsafe.user||{};return {id:String(u.id||window.userId||'guest'),name:u.first_name||t('hudProfile')};}
 function number(v,compact){return v!=null&&v!==''&&Number.isFinite(Number(v))?new Intl.NumberFormat(window.lang==='ru'?'ru-RU':'en-US',compact?{notation:'compact',maximumFractionDigits:1}:{maximumFractionDigits:2}).format(Number(v)):'—';}
 function openNow(){return !!(menu&&menu.classList.contains('active'));}
 function childrenOpen(){return !!document.querySelector('.modal-overlay.active,.wizard-overlay.active,.protection-center-view.active,#attract-testers-sheet-overlay.active');}
 function button(key,label,classes){return '<button type="button" class="hud-chip '+(classes||'')+'" data-hud-open="'+key+'" aria-expanded="false" aria-controls="system-drop-menu">'+label+'</button>';}
 function init(){if(bar)return true;menu=document.getElementById('system-drop-menu');if(!menu)return false;
  var content=menu.querySelector('.system-drop-content');if(!content)return false;
  var oldTab=menu.querySelector('.system-drop-tab-container'),langNode=document.getElementById('current-lang-label'),dot=document.getElementById('loading-dot');
  bar=document.createElement('header');bar.id='smart-top-bar';bar.className='smart-top-bar';bar.setAttribute('aria-label',t('hudTitle'));
  bar.innerHTML=button('profile','<span class="hud-identity"><span class="hud-name-line"><b data-hud-name></b><small data-hud-reliability></small></span><span class="hud-ticker" data-hud-rotation></span></span>','hud-profile')+button('wallet','<span class="hud-wallet-main"><b data-hud-balance>—</b></span><small>$BUST</small>','hud-wallet')+button('reviews','<span class="hud-review-label"><b data-hud-reviews>—</b><small data-hud-review-label></small></span><span class="hud-review-track"><i data-hud-progress></i></span>','hud-reviews')+button('settings','<span aria-hidden="true">⚙</span><span class="hud-language"></span>','hud-settings');
  var language=bar.querySelector('.hud-language');if(langNode)language.appendChild(langNode);if(dot)language.appendChild(dot);if(oldTab)oldTab.remove();
  backdrop=document.createElement('div');backdrop.id='smart-hud-backdrop';backdrop.hidden=true;backdrop.onclick=function(){close();};
  menu.classList.add('smart-hud-drawer');menu.classList.remove('system-drop-menu--projects-tab');menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-label',t('hudTitle'));
  var shell=document.createElement('div');shell.className='hud-shell';shell.innerHTML='<header class="hud-drawer-head"><div class="hud-tabs" role="tablist"><button type="button" id="hud-tab-profile" data-hud-tab="profile" role="tab" aria-controls="hud-profile"></button><button type="button" id="hud-tab-settings" data-hud-tab="settings" role="tab" aria-controls="hud-settings"></button></div><button class="hud-close" type="button" data-hud-close aria-label="'+e(t('hudClose'))+'">×</button></header><div class="hud-panels"><section id="hud-profile" role="tabpanel" aria-labelledby="hud-tab-profile"></section><section id="hud-settings" role="tabpanel" aria-labelledby="hud-tab-settings"></section></div><footer class="hud-footer"></footer>';
  profile=shell.querySelector('#hud-profile');settings=shell.querySelector('#hud-settings');
  var oldTitle=content.querySelector('.system-drop-title');if(oldTitle)oldTitle.remove();
  var feedback=content.querySelector('.system-feedback-buttons');if(feedback)shell.querySelector('.hud-footer').appendChild(feedback);
  settings.appendChild(content);menu.appendChild(shell);
  group('hudAutoGroup','#auto-accept-section',true);group('hudProfileGroup','.system-setting-row--device,#settings-email-row,#default-group-joined-row');group('hudNotificationsGroup','.system-language-card,#proof-ping-settings-row');group('hudPrivacyGroup','#blacklist-settings-row,#homescreen-shortcut-row');
  // Any future setting remains reachable rather than disappearing during grouping.
  Array.from(content.children).forEach(function(node){if(!node.closest('details')&&node.tagName!=='DETAILS')settings.querySelector('details:last-of-type').appendChild(node);});
  document.body.append(backdrop,bar);document.body.classList.add('smart-hud-enabled');
  bar.onclick=function(ev){var b=ev.target.closest('[data-hud-open]');if(b)toggle(b.dataset.hudOpen,b);};
  menu.addEventListener('click',function(ev){var b=ev.target.closest('[data-hud-tab]');if(b)setTab(b.dataset.hudTab,true);if(ev.target.closest('[data-hud-close]'))close();});
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
 function setTab(next,focusTab){tab=next==='settings'?'settings':'profile';if(!menu)return;menu.querySelectorAll('[data-hud-tab]').forEach(function(b){var selected=b.dataset.hudTab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;if(selected&&focusTab)b.focus();});profile.hidden=tab!=='profile';settings.hidden=tab!=='settings';}
 function syncOpen(){if(!bar)return;var open=openNow(),blocked=childrenOpen();backdrop.hidden=!open;menu.setAttribute('aria-hidden',String(!open||blocked));menu.inert=!open||blocked;document.body.classList.toggle('smart-hud-open',open);bar.querySelectorAll('[data-hud-open]').forEach(function(b){b.setAttribute('aria-expanded',String(open&&(b.dataset.hudOpen==='settings'?tab==='settings':tab==='profile')));});if(window.syncTelegramBackButton)syncTelegramBackButton();}
 function open(next,trigger){if(!init())return;focus=trigger||document.activeElement;lastTrigger=next||'profile';setTab(next==='settings'?'settings':'profile');menu.classList.add('active');refresh();syncOpen();['populateSettingsEmail','populateDeviceInfoSettings'].forEach(function(name){if(typeof window[name]==='function')window[name]();});if(window.refreshHomeScreenStatus)refreshHomeScreenStatus({force:true});menu.querySelector('[data-hud-tab="'+tab+'"]').focus();if(window.tg&&tg.HapticFeedback)tg.HapticFeedback.selectionChanged();}
 function close(restore){if(!menu)return;menu.classList.remove('active');syncOpen();if(restore!==false&&focus&&focus.isConnected)focus.focus({preventScroll:true});}
 function toggle(next,trigger){if(openNow()&&lastTrigger===(next||'settings'))close();else open(next||'settings',trigger);}
 function finite(value){return value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;}
 function profileSummary(){
  var s=stats(),c=s.contribution||{};
  var sent=s.feedback_sent_counts,values=sent||c;
  return {
   closed:t('hudClosedSummary',{tests:number(s.completed_tests||0),grants:number(s.grant_tests_count||0),active:number(s.my_active_tests||0)}),
   feedback:t(sent?'hudFeedbackSent':'hudFeedbackAccepted',{bugs:number(values.bugs_count),ideas:number(values.ideas_count),reviews:number(values.play_reviews_count)})
  };
 }
 function tickerSlides(){
  var s=stats(),c=s.contribution||{},season=s.contribution_season||{},wallet=window.ReviewCredits&&ReviewCredits.get();
  var pairs=[['hudKarma',number(s.ownerKarma||0)],['hudSprint',season.rank?'#'+number(season.rank):'—']];
  var slides=[pairs];
  var sla=finite(s.avg_handle_hours),rate=finite(s.acceptance_rate_pct),discipline=[];
  if(sla!=null&&sla>=0)discipline.push(['hudSla',t('hudHours',{n:number(sla)})]);
  if(rate!=null&&rate>=0&&rate<=100)discipline.push(['hudAcceptance',number(rate)+'%']);
  if(discipline.length)slides.push(discipline);
  slides.push([['hudBugs',number(c.bugs_count)],['hudIdeas',number(c.ideas_count)],['hudReviewsShort',number(c.play_reviews_count)],['', '⚡ '+number(s.contribution_score!=null?s.contribution_score:season.score)]]);
  var live=!!document.querySelector('#tab-projects.active')&&window.ProjectWorkspace&&ProjectWorkspace.isLiveView&&ProjectWorkspace.isLiveView();
  var projects=typeof myProjects!=='undefined'&&Array.isArray(myProjects)?myProjects:[];
  slides.push(live?[['hudLive',number(projects.filter(function(p){return p.phase==='live';}).length)],['hudQuotas',(wallet?number(wallet.available):'—')+' ⭐']]:[['hudTests',number(s.completed_tests||0)],['hudGrants',number(s.grant_tests_count||0)],['hudActive',number(s.my_active_tests||0)]]);
  return slides;
 }
 function counts(animate){if(!bar)return;var s=stats(),user=who(),wallet=window.ReviewCredits&&ReviewCredits.get();
  if(actor!==user.id){actor=user.id;rotation=0;profileKey='';}
  var name=bar.querySelector('[data-hud-name]');name.textContent=user.name;name.title=user.name;
  bar.querySelector('[data-hud-reliability]').textContent=t('hudReliability',{n:s.reliability_index==null?'—':number(s.reliability_index)+'%'});
  var slides=tickerSlides(),rotating=bar.querySelector('[data-hud-rotation]');
  rotating.dataset.slide=String(rotation%slides.length);
  var html=slides[rotation%slides.length].map(function(pair){return '<span>'+e(pair[0]?t(pair[0])+': '+pair[1]:pair[1])+'</span>';}).join('');
  if(rotating.innerHTML!==html)rotating.innerHTML=html;
  if(animate){rotating.classList.remove('hud-tick');void rotating.offsetWidth;rotating.classList.add('hud-tick');}
  rotating.title=slides[rotation%slides.length].map(function(pair){return (pair[0]?t(pair[0])+': ':'')+pair[1];}).join(' · ');
  bar.querySelector('[data-hud-balance]').textContent=s.balance_bust==null?'—':number(s.balance_bust,Math.abs(s.balance_bust)>=1000000);bar.querySelector('.hud-wallet').setAttribute('aria-label',t('hudBalance',{n:s.balance_bust==null?'—':number(s.balance_bust)}));
  bar.querySelector('[data-hud-reviews]').textContent=wallet?number(wallet.available,Math.abs(wallet.available)>=1000):'—';bar.querySelector('[data-hud-review-label]').textContent=t('hudReviewsShort');bar.querySelector('[data-hud-progress]').style.width=Math.min(100,Math.max(0,(wallet&&wallet.progress||0)*100))+'%';bar.querySelector('.hud-reviews').setAttribute('aria-label',t('hudReviews',{n:wallet?number(wallet.available):'—',progress:Math.round((wallet&&wallet.progress||0)*100)}));
 }
 function profileSignature(){return JSON.stringify([who().id,window.lang,stats(),(typeof myProjects!=='undefined'&&myProjects||[]).map(function(p){return [p.id||p.app_id,p.live_project_control&&p.live_project_control.reserved_bust];})]);}
 function refresh(){if(!bar){init();return;}counts();var s=stats(),user=who(),key=profileSignature();if(key!==profileKey&&typeof window.buildDeveloperProfileWidget==='function'&&Object.keys(s).length){profileKey=key;var widget=buildDeveloperProfileWidget();profile.replaceChildren();if(widget)profile.appendChild(widget);else profile.textContent=t('hudLoading');}
  menu.querySelector('#hud-tab-profile').textContent='🏆 '+t('hudProfileWallet');menu.querySelector('#hud-tab-settings').textContent='⚙ '+t('hudSettings');menu.querySelectorAll('[data-hud-group]').forEach(function(n){n.textContent=t(n.dataset.hudGroup);});
  var keys=['hudBug','hudIdea','hudQuestion'];menu.querySelectorAll('.system-feedback-buttons button').forEach(function(b,i){b.removeAttribute('data-i18n');b.textContent=t(keys[i]);});
  counts();
 }
 function schedule(){if(frame)return;frame=requestAnimationFrame(function(){frame=0;if(!bar)return;var blocked=childrenOpen();bar.classList.toggle('is-blocked',blocked);backdrop.classList.toggle('is-blocked',blocked);menu.classList.toggle('has-child-layer',blocked);menu.inert=!openNow()||blocked;menu.setAttribute('aria-hidden',String(!openNow()||blocked));var current=stats();if(profileKey!==profileSignature())refresh();});}
 window.SmartTopBar={profileSummary:profileSummary,tickerSlides:tickerSlides,init:init,refresh:refresh,counts:counts,open:open,toggle:toggle,close:close,onTab:function(){if(openNow())close(false);counts();},isOpen:openNow};
 document.addEventListener('DOMContentLoaded',init);
})();
