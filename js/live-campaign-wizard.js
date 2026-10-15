/* Fullscreen draft lifecycle. Stage 1 deliberately has no creation/payment API. */
(function () {
    'use strict';
    var session=null;
    function actor() { try { return window.getTelegramInitDataRaw() || ''; } catch (_) { return ''; } }
    function project(id) { return (window.myProjects || []).find(function(p){return Number(p.id || p.app_id)===Number(id) && p.phase==='live';}); }
    function syncBack() { if(window.syncTelegramBackButton)window.syncTelegramBackButton(); }
    function text(key,vars) { return LiveCampaignWizardView.text(key,vars); }
    function accessible(s) { return session===s && s.actor===actor() && !!project(s.draft.appId); }
    function dirty(s) { return JSON.stringify(s.draft)!==s.initial; }
    function dispose(s) {
        if(session!==s)return;
        session=null;s.layer.remove();document.body.style.overflow=s.overflow;
        window.removeEventListener('beforeunload',beforeUnload);
        var focus=s.focus && s.focus.isConnected?s.focus:document.querySelector('[data-live-campaigns="'+s.draft.appId+'"] .lc-create');
        if(focus)focus.focus({preventScroll:true});syncBack();
    }
    function confirm(message) {
        return new Promise(function(resolve){
            var tg=window.Telegram && window.Telegram.WebApp || window.tg;
            try { if(tg && typeof tg.showConfirm==='function') { tg.showConfirm(message,resolve);return; } } catch (_) {}
            resolve(window.confirm(message));
        });
    }
    async function close() {
        var s=session;if(!s || s.confirming)return;
        if(!accessible(s) || !dirty(s)){dispose(s);return;}
        s.confirming=true;
        var accepted=await confirm(text('lcwExit'));
        s.confirming=false;if(session===s && (accepted || !accessible(s)))dispose(s);
    }
    function back() {
        var s=session;if(!s)return false;
        if(!accessible(s)){dispose(s);return true;}
        if(s.confirming)return true;
        if(s.step>1){s.step--;render(s,true);}else close();return true;
    }
    function beforeUnload(e) { if(session && dirty(session)){e.preventDefault();e.returnValue='';} }
    function render(s, changedStep) {
        if(!accessible(s)){dispose(s);return;}
        var body=s.layer.querySelector('.lcw-scroll'), position=body.scrollTop;
        var focused=document.activeElement, focusKey=focused && focused.dataset.lcwFocus, field=focused && focused.dataset.lcwField, value=focused && focused.dataset.value, strategy=focused && focused.dataset.lcwStrategy;
        body.innerHTML=LiveCampaignWizardView.body(s.draft,s.step);
        s.layer.querySelector('.lcw-footer').innerHTML=LiveCampaignWizardView.footer(s.draft,s.step);
        s.layer.querySelector('#lcw-step-count').textContent=text('lcwStep',{n:s.step});
        s.layer.querySelector('[role="progressbar"]').setAttribute('aria-valuenow',s.step);
        s.layer.querySelectorAll('.gtw-progress-step').forEach(function(el,i){el.classList.toggle('active',i<s.step);});
        body.classList.toggle('lcw-enter-a',s.step%2===1);body.classList.toggle('lcw-enter-b',s.step%2===0);
        if(changedStep){body.scrollTop=0;body.querySelector('h2').focus({preventScroll:true});}
        else {
            body.scrollTop=position;
            // Match without constructing a selector from user-controlled values.
            var candidate=Array.from(body.querySelectorAll('button')).find(function(el){return focusKey?el.dataset.lcwFocus===focusKey:strategy?el.dataset.lcwStrategy===strategy:field && el.dataset.lcwField===field && el.dataset.value===value;});
            if(candidate && !candidate.disabled)candidate.focus({preventScroll:true});
        }
    }
    async function click(event) {
        var s=session,button=event.target.closest('button');if(!s || !button || button.disabled)return;
        event.stopPropagation();if(!accessible(s)){dispose(s);return;}
        if(s.confirming)return;
        var action=button.dataset.lcwAction, strategy=button.dataset.lcwStrategy, field=button.dataset.lcwField;
        if(action==='close')return close();
        if(action==='back')return back();
        if(action==='next'){
            if(s.step<5 && LiveCampaignDraft.valid(s.draft,s.step)){s.step++;render(s,true);}return;
        }
        if(strategy){
            if(strategy===s.draft.strategy)return;
            if(s.edited){s.confirming=true;var accepted=await confirm(text('lcwReset'));s.confirming=false;if(!accessible(s)){if(session===s)dispose(s);return;}if(!accepted)return;}
            s.draft=LiveCampaignDraft.applyStrategy(s.draft,strategy);s.edited=false;
        }else if(field){
            var value=button.dataset.value;
            value=value==='true'?true:value==='false'?false:Number(value);
            var next=LiveCampaignDraft.change(s.draft,field,value);
            if(field==='checkpoint' && next===s.draft){if(window.showToast)window.showToast(text('lcwMinimum'));return;}
            s.draft=next;s.edited=true;
        }else return;
        render(s,false);
    }
    function keydown(e) {
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();return;}
        if(e.key!=='Tab' || !session)return;
        var nodes=Array.from(session.layer.querySelectorAll('button:not(:disabled),[tabindex="0"]')).filter(function(n){return n.getClientRects().length;});
        var first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey && (document.activeElement===first || !nodes.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
    function open(id,event) {
        if(event)event.stopPropagation();
        if(session){if(!accessible(session))dispose(session);else return;}
        var p=project(id),signed=actor();if(!p || !signed){if(window.showToast)window.showToast(text('lcwNoAccess'));return;}
        var layer=document.createElement('div');layer.id='live-campaign-wizard';layer.className='modal-overlay active gtw-overlay';
        layer.innerHTML='<section class="lcw-page" role="dialog" aria-modal="true" aria-labelledby="lcw-title"><header class="gtw-header"><button type="button" class="gtw-back-btn" data-lcw-action="back" aria-label="'+text('lcwBack')+'">‹</button><h1 class="gtw-header-title" id="lcw-title">'+text('lcwTitle')+'</h1><p class="gtw-header-subtitle" id="lcw-step-count"></p><div class="gtw-progress-bar" role="progressbar" aria-label="'+text('lcwTitle')+'" aria-valuemin="0" aria-valuemax="5" aria-valuenow="1">'+Array(5).fill('<span class="gtw-progress-step"></span>').join('')+'</div><button type="button" class="gtw-forward-btn" data-lcw-action="close" aria-label="'+text('lcwClose')+'">×</button></header><main class="lcw-scroll gtw-body"></main><footer class="lcw-footer"></footer></section>';
        var draft=LiveCampaignDraft.create(p);
        session={draft:draft,step:1,actor:signed,layer:layer,initial:JSON.stringify(draft),edited:false,confirming:false,focus:event && event.target && event.target.closest('button') || document.activeElement,overflow:document.body.style.overflow};
        document.body.style.overflow='hidden';document.body.appendChild(layer);
        layer.addEventListener('click',click);layer.addEventListener('keydown',keydown);
        window.addEventListener('beforeunload',beforeUnload);
        render(session,true);syncBack();
    }
    window.LiveCampaignWizard={open:open,close:close,back:back};
})();
