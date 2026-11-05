/* Pending Live exchanges: one project pair, one current state, one server clock. */
(function () {
    'use strict';
    var U=LiveMarketUI,t=U.t,e=U.e,n=U.n,rows=[],actor='',loading=false,loaded=false,error=false,readAt=0,busy=new Set(),actionErrors=new Map(),requestSequence=0,reloadAfter=false,refreshDue=new Set();
    function D(){return window.LiveDealUI;}
    function text(key,args){return D().text(key,args);}
    function own(r){return (r.legs||[]).find(function(l){return l.mine;});}
    function other(r){return (r.legs||[]).find(function(l){return !l.mine;});}
    function terminal(r){return ['canceled','cancelled','expired','completed'].includes(r.status);}
    function installed(l){return !!l&&(l.state==='INSTALLED'||l.state==='COMPLETED'||!!l.confirmed_at);}
    function running(r){return !terminal(r)&&installed(own(r))&&installed(other(r));}
    function owner(r){return D().targetOwner(r);}
    function serverNow(r){var at=Date.parse(r.as_of);return Number.isFinite(at)?at+Math.max(0,performance.now()-(r._received||performance.now())):NaN;}
    function username(r){var p=r.partner&&r.partner.owner||{};return p.username?'@'+String(p.username).replace(/^@/,''):p.full_name||text('partnerFallback');}
    function windowLeft(r,l){
        if(!l)return NaN;
        if(l.state==='SCHEDULED_COOLDOWN')return Math.ceil((Date.parse(l.unlock_at)-serverNow(r))/1000);
        if(!['READY','STARTED'].includes(l.state))return NaN;
        var elapsed=Math.max(0,(serverNow(r)-Date.parse(r.as_of))/1000);
        return Math.ceil(Number(l.install_window_seconds||Number(l.install_window_hours||24)*3600)-Number(l.sla_active_seconds||0)-elapsed);
    }
    function phase(p){
        var s=p.market||p.scoring||{},tier=s.tier||p.tier;
        return p.phase==='live'?text(tier?'liveTier':'live',{n:tier}):text(p.day?'closedDay':'closed',{n:p.day});
    }
    function icon(p){
        var url=p.icon_url||'',safe=/^(https?:\/\/|\/?images\/)/i.test(url);
        return '<span class="lx-app-icon" aria-hidden="true">'+(safe?'<img src="'+e(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':e(String(p.name||'?').trim().slice(0,1)))+'</span>';
    }
    function header(r){
        var p=D().projectPair(r);
        return '<div class="lx-pair">'+[{p:p.mine,label:'mine'},{p:p.partner,label:'partner'}].map(function(v,i){
            return (i?'<span class="lx-pair-link" aria-hidden="true">⇄</span>':'')+'<div class="lx-project">'+icon(v.p)+'<div><small>'+e(text(v.label))+'</small><h3 title="'+e(v.p.name)+'">'+e(v.p.name)+'</h3><span class="lx-phase">'+e(phase(v.p))+'</span></div></div>';
        }).join('')+'</div>';
    }
    function partnerLine(r){
        var o=r.partner&&r.partner.owner||{},p=D().projectPair(r).partner;
        return '<div class="lx-partner-line"><span>'+e(username(r))+'</span><span>🛡 '+e(o.reliability_index==null?'—':text('reliability',{n:n(o.reliability_index,0)}))+'</span><span>⚡ '+e(text('contribution',{n:n(o.contribution_score||0,0)}))+'</span>'+
            (p.package_name?'<a href="https://play.google.com/store/apps/details?id='+e(encodeURIComponent(p.package_name))+'" target="_blank" rel="noopener noreferrer">'+e(text('play'))+'</a>':'')+'</div>';
    }
    function details(r){
        var p=r.partner&&r.partner.owner||{},tracks=D().tracks(r);
        return '<details class="lx-more" data-lx-open="partner"><summary>'+e(text('more'))+'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7 5 5 5-5"/></svg></summary><div class="lx-more-body">'+
            (window.LivePartnerUI?LivePartnerUI.contribution(p):'')+
            [{v:tracks.mine,label:'ldYourTask'},{v:tracks.partner,label:'ldPartnerTask'}].map(function(v){
                var a=v.v.activity,raw=v.v.raw,review=raw.reviews||{},day=raw.review_unlock_day||review.assigned_day||review.day,bonus=raw.review_bonus_bust||review.bonus_bust;
                var content=(v.v.country?'<p>🌍 '+e(v.v.country)+'</p>':'')+(raw.instructions?'<p class="lx-instructions">'+e(raw.instructions)+'</p>':'')+
                    (v.v.review!=='off'&&day?'<p>⭐ '+e(t('rvDay',{n:day}))+(bonus?' · +'+e(n(bonus,0))+' $BUST':'')+'</p>':'')+
                    (a&&a.enabled&&window.LiveRouteUI?LiveRouteUI.scenario(a,raw.campaign_id):'');
                return content?'<section><h4>'+e(t(v.label))+'</h4>'+content+'</section>':'';
            }).join('')+
            (window.LiveRouteUI?LiveRouteUI.receipts(r):'')+'</div></details>';
    }
    function canCancel(r){
        if(r.status==='pending')return true;
        if(terminal(r))return false;
        var l=own(r),p=other(r);
        return !(r.legs||[]).some(installed)||!!(installed(l)&&p&&p.dropoff_risk&&p.dropoff_risk.cancel_allowed);
    }
    function status(r){
        var l=own(r),p=other(r),name=username(r);
        if(terminal(r))return {title:r.status==='completed'?text('finished'):t(r.status==='expired'?'lxExpired':'lxCancelled'),tone:'muted'};
        if(r.status==='pending')return {title:text(r.deal?r.deal.can_accept?'pending':'pendingOut':owner(r)?'pending':'pendingOut'),tone:'pending'};
        if(!l)return {title:text('checking'),tone:'muted'};
        if(installed(l)){
            if(installed(p))return {title:text('allStarted'),tone:'success'};
            var v={title:text('installed'),subtitle:text('await',{name:name}),tone:'success',leg:p,peer:true};
            if(p&&p.state==='SCHEDULED_COOLDOWN'){
                v.label=text('peerQueued');v.clockLabel=text('peerClock');v.wait=true;
                if(['manual_isolation','campaign_paused'].includes(p.blocked_reason)){v.note=text('freeze');v.leg=null;}
            }else if(p&&['READY','STARTED'].includes(p.state)){
                v.label=text('peerReady');v.clockLabel=text('peerRemaining');
            }else if(p&&p.state==='KEYWORD_ASSIST_PENDING'){
                v.label=text('assist');v.note=text('assistFrozen');v.leg=null;
            }else {if(p&&p.state==='EXPIRED')v.label=text('expired');v.leg=null;}
            return v;
        }
        if(l.state==='SCHEDULED_COOLDOWN'){
            if(['manual_isolation','campaign_paused'].includes(l.blocked_reason))return {title:text(l.blocked_reason==='campaign_paused'?'pausedCampaign':'paused'),tone:'muted',note:text('freeze')};
            return {title:text('queued'),tone:'queued',leg:l,wait:true,clockLabel:text('queueClock'),freeze:true};
        }
        if(l.state==='KEYWORD_ASSIST_PENDING')return {title:text('assist'),tone:'queued',note:text('assistFrozen')};
        if(['READY','STARTED'].includes(l.state))return {title:text('ready'),tone:'ready',leg:l,clockLabel:text('readyClock'),partnerInstalled:installed(p)};
        return {title:text('checking'),tone:'muted'};
    }
    function timeText(r,v){
        var left=windowLeft(r,v.leg);
        if(!Number.isFinite(left))return '—';
        if(left<=0)return text(v.wait?'checking':'expired');
        if(v.wait)return String(Math.floor(left/3600)).padStart(2,'0')+':'+String(Math.floor(left%3600/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
        var minutes=Math.ceil(left/60);
        return text('hours',{h:Math.floor(minutes/60),m:minutes%60});
    }
    function dateText(r,v){
        var l=v.leg;if(!l)return '';
        var at=serverNow(r),due=v.wait?l.unlock_at:l.install_due_at||(Number.isFinite(windowLeft(r,l))?new Date(at+Math.max(0,windowLeft(r,l))*1000).toISOString():null);
        if(!due||!Number.isFinite(at))return '';
        var value=window.LiveQueueUI?LiveQueueUI.shortDate(due,l.timezone||'UTC',new Date(at).toISOString()):'';
        return v.wait?value:text('deadline',{date:value});
    }
    function statusHtml(r){
        var v=status(r);
        return (v.partnerInstalled?'<strong class="lx-partner-installed">'+e(text('partnerInstalled',{name:username(r)}))+'</strong><button type="button" class="lq-ticker lx-ticker" data-lq-hint="'+e(text('ticker'))+'"><span>'+e(text('ticker'))+'</span></button>':'')+
            '<section class="lx-stage is-'+v.tone+'"><strong>'+e(v.title)+'</strong>'+(v.subtitle?'<p>'+e(v.subtitle)+'</p>':'')+(v.label?'<small>'+e(v.label)+'</small>':'')+
            (v.leg?'<div class="lx-clock"><span>'+e(v.clockLabel)+'</span><b data-lx-clock="'+Number(r.offer_id)+'">'+e(timeText(r,v))+'</b></div><small class="lx-clock-date" data-lx-date="'+Number(r.offer_id)+'">'+e(dateText(r,v))+'</small>':'')+
            (v.freeze?'<details class="lx-clock-help" data-lx-open="clock"><summary>'+e(text('freeze'))+' <span aria-hidden="true">ⓘ</span></summary><p>'+e(text('freezeInfo'))+'</p></details>':'')+
            (v.note?'<small>'+e(v.note)+'</small>':'')+'</section>';
    }
    function button(r,action,key,disabled,primary){
        return '<button type="button" class="lm-action'+(primary?' lm-action-primary':'')+'" data-lx-action="'+action+'" data-offer="'+Number(r.offer_id)+'"'+(disabled?' disabled':'')+'>'+e(key)+'</button>';
    }
    function actions(r){
        var l=own(r),p=other(r),disabled=busy.has(r.offer_id),pending=r.status==='pending',incoming=pending&&(r.deal?r.deal.can_accept:owner(r)),html='';
        if(terminal(r))return '';
        if(incoming)html+='<div class="lx-actions">'+button(r,'accept',text('accept'),disabled,true)+button(r,'cancel',text('decline'),disabled)+'</div>';
        else {
            if(l&&['READY','STARTED'].includes(l.state))html+=button(r,l.state==='READY'?'start':'proof',text(l.state==='READY'?'start':'proof'),disabled||windowLeft(r,l)<=0,true);
            if(l&&['STARTED','KEYWORD_ASSIST_PENDING'].includes(l.state)&&l.terms&&l.terms.install_source==='keywords')html+=button(r,'keyword-help',t('kwHelp'),disabled);
            if(installed(l)&&p&&p.state==='SCHEDULED_COOLDOWN'&&p.early_start_allowed&&p.early_start_owner)html+='<button type="button" class="lm-action lx-owner-early" data-lq-early="'+Number(p.id)+'" data-lq-owner="1"'+(disabled?' disabled':'')+'>'+e(text('allow'))+'</button>';
            if(canCancel(r))html+=button(r,'cancel',text(installed(l)&&p&&p.dropoff_risk&&p.dropoff_risk.cancel_allowed?'cancelFree':'lxCancel'),disabled);
        }
        if(pending&&r.deal)html+='<button type="button" class="lx-change-terms" data-lx-action="counter" data-offer="'+Number(r.offer_id)+'"'+(disabled?' disabled':'')+'>'+e(text('change'))+'</button>';
        return html;
    }
    function card(r){
        return '<article class="lx-card lx-card-v2" data-lx-id="'+Number(r.offer_id)+'" tabindex="-1">'+header(r)+partnerLine(r)+(r.deal||(r.legs||[]).length?D().comparison(r):'')+statusHtml(r)+details(r)+'<div class="lx-card-actions">'+actions(r)+'</div><p class="lm-error" role="alert" data-lx-error="'+Number(r.offer_id)+'">'+e(actionErrors.get(r.offer_id)||'')+'</p></article>';
    }
    function render(){
        if(actor&&actor!==U.auth()){rows=[];loaded=false;readAt=0;actionErrors.clear();}
        var root=document.getElementById('live-exchanges-slot');if(!root)return;
        var opened=new Set(Array.from(root.querySelectorAll('.lx-card details[open][data-lx-open]')).map(function(d){return d.closest('[data-lx-id]').dataset.lxId+':'+d.dataset.lxOpen;}));
        var historyOpen=root.querySelector('[data-lx-history]')?.open,active=rows.filter(function(r){return !terminal(r)&&!running(r);}),history=rows.filter(terminal);
        root.innerHTML='<section class="lx-section"><header class="lx-head"><h2>'+e(t('lxTitle'))+(active.length?' · '+active.length:'')+'</h2><button type="button" class="lm-icon" data-lx-refresh aria-label="'+e(t('lmRefresh'))+'"'+(loading?' disabled':'')+'>↻</button></header>'+
            (error?'<p class="lm-error" role="alert">'+e(t('lmError'))+'</p>':'')+
            (active.length?active.map(card).join(''):'<p class="lm-caption" role="status">'+e(t(loading?'lmLoading':'lxNoItems'))+'</p>')+
            (history.length?'<details data-lx-history'+(historyOpen?' open':'')+'><summary>'+e(t('lxHistory'))+' · '+history.length+'</summary>'+history.map(card).join('')+'</details>':'')+'</section>';
        root.querySelectorAll('.lx-card details[data-lx-open]').forEach(function(d){if(opened.has(d.closest('[data-lx-id]').dataset.lxId+':'+d.dataset.lxOpen))d.open=true;});
    }
    async function load(force){
        var auth=U.auth();if(!auth)return;
        if(auth!==actor){actor=auth;rows=[];loaded=false;readAt=0;requestSequence++;loading=false;reloadAfter=false;refreshDue.clear();actionErrors.clear();}
        if(loading){if(force)reloadAfter=true;return;}
        if(!force&&Date.now()-readAt<30000)return;
        var seq=++requestSequence;loading=true;readAt=Date.now();error=false;render();
        try{var value=await U.api('/live-exchanges');if(seq!==requestSequence||auth!==U.auth())return;rows=(value.result||[]).map(function(r){r._received=performance.now();return r;});loaded=true;readAt=Date.now();if(typeof window.renderIncomingOffers==='function')window.renderIncomingOffers(true);}
        catch(err){if(seq===requestSequence){error=true;if([401,403].includes(err.status)){rows=[];loaded=false;}}}
        finally{if(seq===requestSequence){loading=false;render();if(typeof window.renderIncomingOffers==='function')window.renderIncomingOffers(true);if(reloadAfter){reloadAfter=false;load(true);}}}
    }
    async function refreshTests(){if(typeof window.refreshMyTestsNow==='function')await window.refreshMyTestsNow();window.dispatchEvent(new CustomEvent('live-market:changed'));}
    function proof(l,guide){
        if(!l)return;
        if(guide&&window.LiveContracts&&l.terms&&l.terms.install_source){LiveContracts.install(l);return;}
        if(typeof window.openCheckinProofUploadModal==='function')window.openCheckinProofUploadModal(Number(l.app_id));
        else if(window.showToast)window.showToast(t('lxProofUnavailable'));
    }
    async function action(r,kind,leave){
        if(busy.has(r.offer_id))return;
        var auth=U.auth(),l=own(r);actionErrors.delete(r.offer_id);busy.add(r.offer_id);render();
        try{
            var path=kind==='start'?'/live-exchange-legs/'+l.id+'/start':'/live-exchanges/'+r.offer_id+'/'+kind;
            await U.api(path,'POST',kind==='cancel'?{leave_installed:!!leave}:kind==='accept'&&r.deal?{revision:r.deal.revision}:{});
            if(auth!==U.auth())return;
            await load(true);await refreshTests();
            if(kind==='start')proof(own(rows.find(function(x){return x.offer_id===r.offer_id;})||r),true);
        }catch(err){
            if(auth!==U.auth())return;
            await load(true);if(auth!==U.auth())return;
            var key='ldErr_'+err.message,known=t(key);actionErrors.set(r.offer_id,[401,403].includes(err.status)?t('lxNoPermission'):known!==key?known:text('unavailable'));
        }finally{busy.delete(r.offer_id);render();}
    }
    function cancel(r){
        var l=own(r),hasInstall=installed(l),layer=U.sheet(t('lxCancelTitle'),'<p>'+e(t('lxCancelHint'))+'</p>'+
            (hasInstall?'<p>'+e(t('lxKeepHint'))+'</p><label><input type="radio" name="lx-leave" value="keep" checked> '+e(t('lxKeep'))+'</label><label><input type="radio" name="lx-leave" value="leave"> '+e(t('lxLeave'))+'</label>':'')+
            '<button type="button" class="lm-action" data-lx-confirm>'+e(t('lxCancel'))+'</button>');
        layer.querySelector('[data-lx-confirm]').onclick=function(){var leave=hasInstall&&layer.querySelector('[name="lx-leave"]:checked').value==='leave';U.close(layer);action(r,'cancel',leave);};
    }
    // Keep deep links/API consumers, but take them to the real card rather than a duplicate modal.
    async function detail(id){
        var auth=U.auth();
        try{
            var result=await U.api('/live-exchanges/'+id);if(auth!==U.auth())return;
            var r=result.result;r._received=performance.now();var i=rows.findIndex(function(x){return x.offer_id===Number(id);});
            if(i>=0)rows[i]=r;else rows.push(r);
            if(window.switchTab)window.switchTab('tests');render();
            var node=document.querySelector('[data-lx-id="'+Number(id)+'"]');
            if(node){var more=node.querySelector('.lx-more');if(more)more.open=true;node.scrollIntoView({block:'center',behavior:'smooth'});node.focus({preventScroll:true});}
            else {var l=own(r),task=l&&document.getElementById('test-card-'+l.app_id);if(task)task.scrollIntoView({block:'center',behavior:'smooth'});else if(window.showToast)showToast(text('allStarted'));}
        }catch(_){if(window.showToast)showToast(t('lmError'));}
    }
    function bind(root){
        if(root.dataset.lxBound)return;root.dataset.lxBound='1';
        root.addEventListener('click',function(ev){
            var b=ev.target.closest('button');if(!b)return;
            if(b.hasAttribute('data-lx-refresh'))return load(true);
            if(!b.dataset.lxAction||b.disabled)return;
            var r=rows.find(function(r){return r.offer_id===Number(b.dataset.offer);});if(!r)return;
            if(b.dataset.lxAction==='counter'&&D()){
                D().open({target_app_id:r.target_app_id,proposer_app_id:r.proposer_app_id,campaign_id:r.deal.target.campaign_id,offer:r}).then(function(result){if(result)load(true);}).catch(function(){if(window.showToast)showToast(t('lmUnavailable'));});return;
            }
            if(b.dataset.lxAction==='keyword-help'&&window.LiveContracts)return LiveContracts.help(own(r).id);
            if(b.dataset.lxAction==='cancel')return cancel(r);
            if(b.dataset.lxAction==='proof')return proof(own(r),false);
            action(r,b.dataset.lxAction);
        });
    }
    function mount(){
        var root=document.getElementById('live-exchanges-slot');if(!root)return;
        bind(root);render();load(false);
        if(window.LiveContracts)LiveContracts.mount();
        if(window.LiveScenarioUI)LiveScenarioUI.mount().catch(function(){});
        if(window.LiveRetentionUI)LiveRetentionUI.mount().catch(function(){});
    }
    setInterval(function(){
        if(document.hidden||!document.querySelector('#tab-tests.active'))return;
        document.querySelectorAll('[data-lx-clock]').forEach(function(node){
            var r=rows.find(function(r){return r.offer_id===Number(node.dataset.lxClock);});if(!r)return;
            var v=status(r);node.textContent=timeText(r,v);
            var date=node.parentElement.parentElement.querySelector('[data-lx-date]');if(date)date.textContent=dateText(r,v);
            if(windowLeft(r,v.leg)<=0&&!refreshDue.has(r.offer_id)){refreshDue.add(r.offer_id);load(true);}
        });
        if(Date.now()-readAt>30000)load(false);
    },1000);
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&document.querySelector('#tab-tests.active'))load(true);});
    window.LiveExchanges={legacyReady:function(){return loaded||error||!U.auth();},mount:mount,load:load,detail:detail,managed:function(id){return rows.some(function(r){return r.offer_id===Number(id);});},waitingFor:function(app){return rows.some(function(r){var l=own(r);return l&&Number(l.app_id)===Number(app)&&['SCHEDULED_COOLDOWN','READY'].includes(l.state);});},isLoaded:function(){return loaded;}};
})();
