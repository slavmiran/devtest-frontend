/* Fullscreen campaign setup; actor-scoped reads and session-owned attachments. */
(function () {
    'use strict';
    var session=null;
    function actor(){try{return window.getTelegramInitDataRaw() || '';}catch(_){return '';}}
    function project(id){return (window.myProjects || []).find(function(p){return Number(p.id || p.app_id)===Number(id) && p.phase==='live';});}
    function text(k,v){return LiveCampaignWizardView.text(k,v);}
    function syncBack(){if(window.syncTelegramBackButton)window.syncTelegramBackButton();}
    function accessible(s){return session===s && s.actor===actor() && !!project(s.draft.appId);}
    function fingerprint(d){var copy=JSON.parse(JSON.stringify(d));delete copy.appTitle;delete copy.baseline;return JSON.stringify(copy);}
    function dirty(s){return fingerprint(s.draft)!==s.initial || !!s.context.manualKey;}
    function toast(key){if(window.showToast)window.showToast(text(key));}
    function dispose(s){
        if(session!==s)return;
        session=null;s.readers.forEach(function(c){c.abort();});s.media.clear();s.layer.remove();document.body.style.overflow=s.overflow;
        window.removeEventListener('beforeunload',beforeUnload);
        var focus=s.focus && s.focus.isConnected?s.focus:document.querySelector('[data-live-campaigns="'+s.draft.appId+'"] .lc-create');
        if(focus)focus.focus({preventScroll:true});syncBack();
    }
    function confirm(message){return new Promise(function(resolve){
        var tg=window.Telegram && window.Telegram.WebApp || window.tg;
        try{if(tg && typeof tg.showConfirm==='function'){tg.showConfirm(message,resolve);return;}}catch(_){}
        resolve(window.confirm(message));
    });}
    async function close(){
        var s=session;if(!s || s.confirming)return;
        if(!accessible(s) || !dirty(s)){dispose(s);return;}
        s.confirming=true;var accepted=await confirm(text('lcwExit'));s.confirming=false;
        if(session===s && (accepted || !accessible(s)))dispose(s);
    }
    function back(){
        var s=session;if(!s)return false;if(!accessible(s)){dispose(s);return true;}if(s.confirming)return true;
        if(s.outlineOpen){s.outlineOpen=false;shell(s);return true;}
        if(s.step>1){s.step--;render(s,true);}else close();return true;
    }
    function beforeUnload(e){if(session && dirty(session)){e.preventDefault();e.returnValue='';}}
    function unlocked(s){return LiveCampaignDraft.valid(s.draft,2)?s.unlocked:Math.min(s.unlocked,2);}
    function invalid(s){return !!s.layer.querySelector('[aria-invalid="true"]');}
    function shell(s){
        var active=document.activeElement,action=active && active.dataset.lcwAction,step=active && active.dataset.step;
        var restore=action && (active.closest('.gtw-header') || active.closest('.lcw-footer'));
        s.layer.querySelector('.lcw-header-center').innerHTML=LiveCampaignWizardView.header(s.draft,s.step,unlocked(s));
        var outline=s.layer.querySelector('#lcw-outline');outline.hidden=!s.outlineOpen;
        s.layer.querySelector('.lcw-heading').setAttribute('aria-expanded',String(s.outlineOpen));
        s.layer.querySelector('.lcw-footer').innerHTML=LiveCampaignWizardView.footer(s.draft,s.step,s.estimateOpen);
        if(invalid(s))s.layer.querySelector('[data-lcw-action="next"]').disabled=true;
        if(restore){var node=Array.from(s.layer.querySelectorAll('[data-lcw-action]')).find(function(n){return n.dataset.lcwAction===action && n.dataset.step===step;});if(node && !node.disabled)node.focus({preventScroll:true});}
    }
    function refresh(s){
        if(!accessible(s)){if(session===s)dispose(s);return;}
        shell(s);
        var balance=s.layer.querySelector('[data-lcw-balance]');if(balance)balance.innerHTML=LiveCampaignSourcesView.balance(s.draft,s.context);
        var web=s.layer.querySelector('.lcw-web-settings');if(web)web.hidden=s.draft.sources.web===0;
        var amount=s.layer.querySelector('[data-lcw-keyword-total]');if(amount)amount.textContent=text('lcwInstalls',{n:LiveCampaignDraft.counts(s.draft).keywords});
        var validation=s.layer.querySelector('[data-lcw-validation]');
        if(validation)validation.textContent=invalid(s)?text('lcwInvalidCount'):!LiveCampaignDraft.quote(s.draft).installs?text('lcwNoSources'):s.draft.sources.web && !s.draft.web.query.trim()?text('lcwQueryRequired'):'';
    }
    function render(s,changedStep){
        if(!accessible(s)){dispose(s);return;}
        var body=s.layer.querySelector('.lcw-scroll'),position=body.scrollTop,focused=document.activeElement;
        var attrs=['lcwFocus','lcwInput','keyword','lcwStrategy'],identity=attrs.map(function(k){return focused && focused.dataset[k];});
        var start=focused && focused.selectionStart,end=focused && focused.selectionEnd;
        s.context.descriptionOpen=!!body.querySelector('.lcw-description[open]');
        body.innerHTML=LiveCampaignWizardView.body(s.draft,s.step,s.context);shell(s);
        body.classList.toggle('lcw-enter-a',s.step%2===1);body.classList.toggle('lcw-enter-b',s.step%2===0);
        if(changedStep){body.scrollTop=0;s.layer.querySelector('.lcw-heading').focus({preventScroll:true});}
        else{
            body.scrollTop=position;
            var candidate=Array.from(body.querySelectorAll('button,input')).find(function(el){return identity.some(Boolean) && attrs.every(function(k,i){return el.dataset[k]===identity[i];});});
            if(candidate && !candidate.disabled){candidate.focus({preventScroll:true});if(typeof start==='number' && candidate.type!=='number')candidate.setSelectionRange(start,end);}
        }
    }
    async function readData(s,kind){
        if(s.context[kind+'Loading'])return;
        var c=new AbortController();s.readers.push(c);s.context[kind+'Loading']=true;
        try{
            var path=kind==='sources'?'live-metrics/analytics':'play-store-data';
            var url=String(window.API_BASE || '/api').replace(/\/$/,'')+'/apps/'+s.draft.appId+'/'+path+'?init_data='+encodeURIComponent(s.actor);
            var response=await fetch(url,{cache:'no-store',signal:c.signal}),data=await response.json();
            if(!accessible(s))return;
            if([401,403,404].includes(response.status)){toast('lcwNoAccess');dispose(s);return;}
            if(!response.ok)throw new Error('read_failed');
            if(kind==='sources'){
                var base=LiveCampaignTraffic.baseline(data.analytics);if(!base)throw new Error('invalid_snapshot');
                s.context.sourceBaseline=base;s.context.sourcesError=false;
            }else{
                s.context.market=data.play_store_raw || null;
                if(s.context.market && s.context.market.title){
                    var pristine=!dirty(s);s.draft.appTitle=String(s.context.market.title);
                    if(!s.webEdited)s.draft.web.query=s.draft.appTitle.slice(0,200);
                    if(pristine)s.initial=fingerprint(s.draft);
                }
            }
        }catch(error){if(error.name!=='AbortError' && accessible(s))s.context[kind+'Error']=true;}
        finally{
            s.readers=s.readers.filter(function(r){return r!==c;});
            if(accessible(s)){s.context[kind+'Loading']=false;refresh(s);
                if(kind==='market' && s.step===2)render(s,false);
            }else if(session===s)dispose(s);
        }
    }
    function mediaExists(s,key){return key==='web' || s.draft.keywords.some(function(k){return 'keyword:'+k.id===key;});}
    async function fileInput(s,input){
        var key=input.dataset.lcwFile,file=input.files[0];if(!file)return;
        try{
            var result=await s.media.attach(key,file,function(){return accessible(s) && mediaExists(s,key);});
            if(result && accessible(s)){s.draft=LiveCampaignDraft.media(s.draft,key,result);s.edited=true;render(s,false);}
        }catch(_){if(accessible(s))toast('lcwInvalidImage');}
        input.value='';
    }
    function input(event){
        var s=session,el=event.target;if(!s)return;if(!accessible(s)){dispose(s);return;}
        if(s.confirming)return;
        var field=el.dataset.lcwInput;if(!field)return;
        if(field==='manualKey'){s.context.manualKey=el.value;return;}
        if(['link','web','keywordInstalls'].includes(field)){
            var min=field==='keywordInstalls'?1:0,value=Number(el.value);
            var ok=/^\d+$/.test(el.value) && Number.isSafeInteger(value) && value>=min && value<=LiveCampaignDraft.limit;
            el.setAttribute('aria-invalid',String(!ok));el.setCustomValidity(ok?'':text('lcwInvalidCount'));
            if(!ok){refresh(s);return;}
            s.draft=field==='keywordInstalls'?LiveCampaignDraft.keyword(s.draft,el.dataset.keyword,'installs',value):LiveCampaignDraft.change(s.draft,field,value);
            // Keep adjacent +/- buttons current while typing without replacing the input/keyboard.
            var buttons=el.parentElement.querySelectorAll('button');
            buttons[0].dataset.value=value-1;buttons[0].disabled=value<=min;buttons[1].dataset.value=value+1;buttons[1].disabled=value>=LiveCampaignDraft.limit;
        }else if(field==='webQuery'){s.draft=LiveCampaignDraft.change(s.draft,field,el.value);s.webEdited=true;}
        else if(field==='position')s.draft=LiveCampaignDraft.keyword(s.draft,el.dataset.keyword,'position',el.value);
        else return;
        s.edited=true;refresh(s);
    }
    async function click(event){
        var s=session;if(!s)return;if(!accessible(s)){event.preventDefault();dispose(s);return;}
        if(s.outlineOpen && !event.target.closest('.gtw-header')){s.outlineOpen=false;shell(s);}
        var button=event.target.closest('button');if(!button || button.disabled)return;event.stopPropagation();if(s.confirming)return;
        var action=button.dataset.lcwAction,field=button.dataset.lcwField,strategy=button.dataset.lcwStrategy,id=button.dataset.keyword;
        if(action==='close')return close();if(action==='back')return back();
        if(action==='outline'){s.outlineOpen=!s.outlineOpen;shell(s);return;}
        if(action==='estimate'){s.estimateOpen=!s.estimateOpen;shell(s);return;}
        if(action==='step'){
            var step=Number(button.dataset.step);if(step>unlocked(s) || step<1 || step>5 || invalid(s) && step>2)return;
            s.step=step;s.outlineOpen=false;render(s,true);return;
        }
        if(action==='next'){
            if(s.step<5 && !invalid(s) && LiveCampaignDraft.valid(s.draft,s.step)){s.step++;s.unlocked=Math.max(s.unlocked,s.step);s.outlineOpen=false;render(s,true);}return;
        }
        if(action==='aso'){s.context.asoOpen=!s.context.asoOpen;render(s,false);return;}
        if(action==='retry-data'){readData(s,'sources');if(!s.context.market)readData(s,'market');return;}
        if(action==='attach'){
            var input=Array.from(s.layer.querySelectorAll('[data-lcw-file]')).find(function(n){return n.dataset.lcwFile===button.dataset.asset;});if(input)input.click();return;
        }
        if(action==='remove-media'){s.media.remove(button.dataset.asset);s.draft=LiveCampaignDraft.media(s.draft,button.dataset.asset,null);s.edited=true;render(s,false);return;}
        if(action==='copy-query'){
            try{await navigator.clipboard.writeText(s.draft.web.query);if(accessible(s))toast('lcwCopied');}
            catch(_){if(accessible(s)){var query=s.layer.querySelector('#lcw-web-query');if(query){query.focus();query.select();}toast('lcwCopyFailed');}}return;
        }
        if(action==='add-key' || action==='suggestion'){
            var phrase=action==='suggestion'?button.dataset.keywordText:s.context.manualKey,next=LiveCampaignDraft.addKeyword(s.draft,phrase);
            if(next===s.draft){toast('lcwKeyInvalid');return;}s.draft=next;s.context.manualKey='';s.edited=true;render(s,false);return;
        }
        if(action==='remove-key'){s.media.remove('keyword:'+id);s.draft=LiveCampaignDraft.keyword(s.draft,id,'remove');s.edited=true;render(s,false);return;}
        if(strategy){
            if(strategy===s.draft.strategy)return;
            if(s.edited){s.confirming=true;var accepted=await confirm(text('lcwReset'));s.confirming=false;if(!accessible(s)){if(session===s)dispose(s);return;}if(!accepted)return;}
            s.media.clear();s.draft=LiveCampaignDraft.applyStrategy(s.draft,strategy);s.edited=false;s.webEdited=false;s.unlocked=1;s.context.manualKey='';
        }else if(field){
            var value=button.dataset.value;value=value==='true'?true:value==='false'?false:Number(value);
            var next=field==='keywordInstalls'?LiveCampaignDraft.keyword(s.draft,id,'installs',value):LiveCampaignDraft.change(s.draft,field,value);
            if(field==='checkpoint' && next===s.draft){toast('lcwMinimum');return;}s.draft=next;s.edited=true;
        }else return;
        render(s,false);
    }
    function keydown(e){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();return;}
        if(e.key==='Enter' && e.target.dataset.lcwInput==='manualKey'){e.preventDefault();session.layer.querySelector('[data-lcw-action="add-key"]').click();return;}
        if(e.key!=='Tab' || !session)return;
        var nodes=Array.from(session.layer.querySelectorAll('button:not(:disabled),a[href],input:not([type="file"]),summary')).filter(function(n){return n.getClientRects().length;});
        var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey && (document.activeElement===first || !nodes.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
    function open(id,event){
        if(event)event.stopPropagation();if(session){if(!accessible(session))dispose(session);else return;}
        var p=project(id),signed=actor();if(!p || !signed){toast('lcwNoAccess');return;}
        var layer=document.createElement('div');layer.id='live-campaign-wizard';layer.className='modal-overlay active gtw-overlay';
        layer.innerHTML='<section class="lcw-page" role="dialog" aria-modal="true" aria-labelledby="lcw-title"><header class="gtw-header"><button type="button" class="gtw-back-btn" data-lcw-action="back" aria-label="'+text('lcwBack')+'">‹</button><div class="lcw-header-center"></div><button type="button" class="gtw-forward-btn" data-lcw-action="close" aria-label="'+text('lcwClose')+'">×</button></header><main class="lcw-scroll gtw-body"></main><footer class="lcw-footer"></footer></section>';
        var draft=LiveCampaignDraft.create(p);
        session={draft:draft,step:1,unlocked:1,actor:signed,layer:layer,initial:fingerprint(draft),edited:false,webEdited:false,confirming:false,outlineOpen:false,estimateOpen:false,
            context:{market:p.play_store_raw || null,sourceBaseline:LiveCampaignTraffic.baseline(p.live_analytics_snapshot) || LiveCampaignTraffic.baseline(p.live_metrics),asoOpen:false,manualKey:''},
            readers:[],media:LiveCampaignWizardMedia.create(),focus:event && event.target && event.target.closest('button') || document.activeElement,overflow:document.body.style.overflow};
        document.body.style.overflow='hidden';document.body.appendChild(layer);
        layer.addEventListener('click',click);layer.addEventListener('input',input);
        layer.addEventListener('change',function(e){var s=session;if(!s)return;if(!accessible(s)){dispose(s);return;}if(e.target.dataset.lcwFile)fileInput(s,e.target);});
        layer.addEventListener('keydown',keydown);
        window.addEventListener('beforeunload',beforeUnload);render(session,true);syncBack();
        readData(session,'sources');if(!session.context.market)readData(session,'market');
    }
    window.LiveCampaignWizard={open:open,close:close,back:back};
})();
