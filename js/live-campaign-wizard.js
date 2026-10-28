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
    function dirty(s){return fingerprint(s.draft)!==s.initial || !!s.context.manualKey || !!s.context.allocationEdited;}
    function toast(key){if(window.showToast)window.showToast(text(key));}
    function dispose(s){
        if(session!==s)return;
        session=null;clearInterval(s.hudTimer);s.readers.forEach(function(c){c.abort();});s.media.clear();s.layer.remove();document.body.style.overflow=s.overflow;
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
        var s=session;if(!s || s.confirming)return;if(s.saving){toast('lcgSaving');return;}
        if(!accessible(s) || !dirty(s)){dispose(s);return;}
        s.confirming=true;var accepted=await confirm(text('lcwExit'));s.confirming=false;
        if(session===s && (accepted || !accessible(s)))dispose(s);
    }
    function back(){
        var s=session;if(!s)return false;if(!accessible(s)){dispose(s);return true;}if(s.confirming)return true;
        if(s.outlineOpen){s.outlineOpen=false;shell(s);return true;}
        if(s.saving){toast('lcgSaving');return true;}if(s.editing&&s.step===1){close();return true;}if(s.step>0){s.step--;render(s,true);}else close();return true;
    }
    function beforeUnload(e){if(session && dirty(session)){e.preventDefault();e.returnValue='';}}
    function unlocked(s){return LiveCampaignDraft.valid(s.draft,1)?s.unlocked:Math.min(s.unlocked,1);}
    function invalid(s){return !!s.layer.querySelector('[aria-invalid="true"]');}
    function shell(s){
        var active=document.activeElement,action=active && active.dataset.lcwAction,step=active && active.dataset.step;
        var restore=action && (active.closest('.gtw-header') || active.closest('.lcw-footer'));
        s.layer.querySelector('.lcw-header-center').innerHTML=LiveCampaignWizardView.header(s.draft,s.step,unlocked(s),!!s.editing);
        var outline=s.layer.querySelector('#lcw-outline');if(outline)outline.hidden=!s.outlineOpen;
        var heading=s.layer.querySelector('.lcw-heading');if(heading)heading.setAttribute('aria-expanded',String(s.outlineOpen));
        s.layer.querySelector('.lcw-footer').innerHTML=LiveCampaignWizardView.footer(s.draft,s.step,s.estimateOpen,s.context);
        s.layer.querySelector('.lcw-footer').hidden=s.step===0;
        var advance=s.layer.querySelector('[data-lcw-action="next"],[data-lcw-action="save"]');if(advance && invalid(s))advance.disabled=true;
        s.layer.setAttribute('aria-busy',String(!!s.saving));
        if(restore){var node=Array.from(s.layer.querySelectorAll('[data-lcw-action]')).find(function(n){return n.dataset.lcwAction===action && n.dataset.step===step;});if(node && !node.disabled)node.focus({preventScroll:true});}
    }
    function refresh(s){
        if(!accessible(s)){if(session===s)dispose(s);return;}
        shell(s);
        LiveProjectControl.refresh(s.layer,s.draft,s.context.projectControl,true);
        var displayError=s.layer.querySelector('[data-lpc-display-error]');if(displayError)displayError.textContent=!s.draft.icon&&!s.draft.name.trim()?text('lpcDisplayRequired'):'';
        var balance=s.layer.querySelector('[data-lcw-balance]');if(balance)balance.innerHTML=LiveCampaignSourcesView.balance(s.draft,s.context);
        var preview=s.layer.querySelector('[data-lcw-pace-preview]');if(preview)preview.innerHTML=LiveCampaignPaceView.preview(s.draft);
        var hud=s.layer.querySelector('[data-lcw-entry-hud]');if(hud)hud.innerHTML=LiveCampaignEntry.hud(s.draft,s.context);
        var validation=s.layer.querySelector('[data-lcw-validation]');
        if(validation)validation.textContent=invalid(s)?text('lcwInvalidCount'):!LiveCampaignDraft.valid(s.draft,1)?text(s.draft.source==='keywords'?'lcgNeedKey':'lcwQueryRequired'):'';
    }
    function render(s,changedStep){
        if(!accessible(s)){dispose(s);return;}
        var body=s.layer.querySelector('.lcw-scroll'),position=body.scrollTop,focused=document.activeElement;
        var attrs=['lcwFocus','lcwInput','keyword','lcwStrategy'],identity=attrs.map(function(k){return focused && focused.dataset[k];});
        var start=focused && focused.selectionStart,end=focused && focused.selectionEnd;
        s.context.descriptionOpen=!!body.querySelector('.lcw-description[open]');
        body.innerHTML=LiveCampaignWizardView.body(s.draft,s.step,s.context)+(s.step===1&&s.draft.source==='keywords'&&s.context.poolAvailable===0?'<aside class="lcp-note"><p>'+window.escapeHTML(text('lgEmptyPool'))+'</p><button type="button" class="meta-chip lg-action" data-live-action="pool" data-live-app="'+s.draft.appId+'">'+window.escapeHTML(text('lgPool'))+'</button></aside>':'');shell(s);
        body.classList.toggle('lcw-enter-a',s.step%2===1);body.classList.toggle('lcw-enter-b',s.step%2===0);
        if(changedStep){body.scrollTop=0;var target=s.layer.querySelector('.lcw-heading')||body.querySelector('button');if(target)target.focus({preventScroll:true});}
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
            var path=kind==='sources'?'live-metrics/analytics':kind==='campaigns'?'campaigns':'play-store-data';
            var url=String(window.API_BASE || '/api').replace(/\/$/,'')+'/apps/'+s.draft.appId+'/'+path+'?init_data='+encodeURIComponent(s.actor);
            var response=await fetch(url,{cache:'no-store',signal:c.signal}),data=await response.json();
            if(!accessible(s))return;
            if([401,403,404].includes(response.status)){toast('lcwNoAccess');dispose(s);return;}
            if(!response.ok)throw new Error('read_failed');
            if(kind==='sources'){
                var base=LiveCampaignTraffic.baseline(data.analytics);if(!base)throw new Error('invalid_snapshot');
                s.context.sourceBaseline=base;s.context.sourcesError=false;
                var analytics=data.analytics;s.context.metrics={installs:analytics.install_velocity,reviews:{per_day:analytics.reviews_health&&analytics.reviews_health.per_day},avg_retention_days:analytics.retention&&analytics.retention.avg_days};
                var b=analytics.install_velocity.baseline,rate=b?b.per_day:analytics.install_velocity.per_day;s.draft.baseline={available:(!b||b.available)&&typeof rate==='number'&&Number.isFinite(rate)&&rate>=0,perDay:rate||0,days:b&&b.days||7};
            }else if(kind==='campaigns'){s.context.capacity=data.capacity||{active:0,limit:3};s.context.hud=data.hud||null;s.context.campaignsError=false;
                if(data.project_control)s.context.poolAvailable=data.project_control.pool_available;
                if(data.project_control&&!s.context.projectControl){var pristine=!dirty(s);s.context.projectControl=LiveProjectControl.setup(s.draft,data.project_control,data.campaigns,s.editing);if(pristine)s.initial=fingerprint(s.draft);}
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
                if(kind==='market' && s.step===1||kind==='campaigns'&&[1,4].includes(s.step))render(s,false);
            }else if(session===s)dispose(s);
        }
    }
    async function readGeo(s,force){
        if(s.context.geoLoading||!window.ShowcaseGeo)return;s.context.geoLoading=true;s.context.geoError=false;
        try{var data=await ShowcaseGeo.getStats(force);if(accessible(s))s.context.geoStats=data;}
        catch(_){if(accessible(s))s.context.geoError=true;}
        finally{if(accessible(s)){s.context.geoLoading=false;if(s.step===1)render(s,false);}}
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
        if(s.confirming||s.saving)return;
        var field=el.dataset.lcwInput;if(!field)return;
        if(field==='manualKey'){s.context.manualKey=el.value;return;}
        if(['daily','period','target','retention','pauseHours'].includes(field)||field.indexOf('cap:')===0||field.indexOf('plan:')===0){
            var min=Number(el.min),max=Number(el.max),value=Number(el.value);
            var ok=/^\d+$/.test(el.value) && Number.isSafeInteger(value) && value>=min && value<=max;
            el.setAttribute('aria-invalid',String(!ok));el.setCustomValidity(ok?'':text('lcwInvalidCount'));
            if(field==='pauseHours'&&ok){s.draft=LiveCampaignDraft.change(s.draft,field,value);s.edited=true;LiveCampaignPaceView.refreshHours(s.layer,s.draft.volume);refresh(s);return;}
            if(!ok){refresh(s);return;}
            if(field.indexOf('cap:')===0){LiveProjectControl.change(s.context.projectControl,field.slice(4),value);s.context.allocationEdited=true;}else s.draft=LiveCampaignDraft.change(s.draft,field,value);
            // Keep adjacent +/- buttons current while typing without replacing the input/keyboard.
            var buttons=el.parentElement.querySelectorAll('button');
            buttons[0].dataset.value=value-1;buttons[0].disabled=value<=min;buttons[1].dataset.value=value+1;buttons[1].disabled=value>=max;
        }else if(field==='webQuery'){s.draft=LiveCampaignDraft.change(s.draft,field,el.value);s.webEdited=true;}
        else if(field==='name'||field==='instructions')s.draft=LiveCampaignDraft.change(s.draft,field,el.value);
        else if(field==='position')s.draft=LiveCampaignDraft.keyword(s.draft,el.dataset.keyword,'position',el.value);
        else return;
        s.edited=true;refresh(s);
    }
    async function click(event){
        var s=session;if(!s)return;if(!accessible(s)){event.preventDefault();dispose(s);return;}
        if(s.outlineOpen && !event.target.closest('.gtw-header')){s.outlineOpen=false;shell(s);}
        var button=event.target.closest('button');if(!button || button.disabled)return;event.stopPropagation();if(s.confirming||s.saving)return;
        var action=button.dataset.lcwAction,field=button.dataset.lcwField,id=button.dataset.keyword;
        if(button.dataset.lcwIcon){s.draft.icon=button.dataset.lcwIcon==='none'?null:button.dataset.lcwIcon;s.edited=true;render(s,false);return;}
        if(button.hasAttribute('data-lpc-unlimited')||button.hasAttribute('data-lpc-cap')){if(!s.context.projectControl)return;LiveProjectControl.change(s.context.projectControl,button.dataset.lpcUnlimited||button.dataset.lpcCap,button.hasAttribute('data-lpc-cap')?1:null);s.context.allocationEdited=true;render(s,false);return;}
        if(action==='learn'){window.LiveCampaignLearning.open(button.dataset.topic||'pace',button);return;}
        if(action==='geo'){ShowcaseGeo.openPicker({value:s.draft.country,titleKey:'lcGeoTitle',hintKey:'lcGeoPickerHint',anyKey:'lcGeoAny',onChoose:function(code){if(!accessible(s))return;s.draft=LiveCampaignDraft.change(s.draft,'country',code);s.edited=true;render(s,false);var choice=s.layer.querySelector('[data-lcw-action="geo"]');if(choice)choice.focus({preventScroll:true});}});return;}
        if(action==='geo-community'){ShowcaseGeo.openCommunityList();return;}
        if(action==='geo-retry'){readGeo(s,true);return;}
        if(action==='close')return close();if(action==='back')return back();
        if(action==='outline'){s.outlineOpen=!s.outlineOpen;shell(s);return;}
        if(action==='estimate'){s.estimateOpen=!s.estimateOpen;shell(s);return;}
        if(action==='step'){
            var step=Number(button.dataset.step);if(step>unlocked(s) || step<1 || step>4 || invalid(s) && step>1)return;
            s.step=step;s.outlineOpen=false;render(s,true);return;
        }
        if(action==='next'){
            if(s.step<4 && !invalid(s) && LiveCampaignDraft.valid(s.draft,s.step)){s.step++;s.unlocked=Math.max(s.unlocked,s.step);s.outlineOpen=false;render(s,true);}return;
        }
        if(action==='entry'){if(s.editing)return;s.step=0;s.outlineOpen=false;render(s,true);return;}
        if(action==='manual'){s.step=1;s.unlocked=Math.max(1,s.unlocked);render(s,true);return;}
        if(action==='save')return save(s,s.editing?s.editing.status:s.context.capacity&&s.context.capacity.active<s.context.capacity.limit?'active':'paused');
        if(action==='retry-template')return save(s,s.quickStatus);
        if(action==='aso'){s.context.asoOpen=!s.context.asoOpen;render(s,false);return;}
        if(action==='retry-data'){readData(s,'sources');if(s.context.campaignsError)readData(s,'campaigns');if(!s.context.market)readData(s,'market');return;}
        if(action==='attach'){
            var input=Array.from(s.layer.querySelectorAll('[data-lcw-file]')).find(function(n){return n.dataset.lcwFile===button.dataset.asset;});if(input)input.click();return;
        }
        if(action==='remove-media'){s.media.remove(button.dataset.asset);s.draft=LiveCampaignDraft.media(s.draft,button.dataset.asset,null);s.edited=true;render(s,false);return;}
        if(action==='copy-query'||action==='web-search'){
            var copying;try{copying=navigator.clipboard.writeText(s.draft.web.query);}catch(error){copying=Promise.reject(error);}
            if(action==='web-search'&&accessible(s)){var url='https://www.google.com/search?q='+encodeURIComponent(s.draft.web.query);var tg=window.Telegram&&window.Telegram.WebApp||window.tg;if(tg&&tg.openLink)tg.openLink(url);else window.open(url,'_blank','noopener,noreferrer');}
            try{await copying;if(accessible(s))toast('lcwCopied');}
            catch(_){if(accessible(s)){var query=s.layer.querySelector('#lcw-web-query');if(query){query.focus();query.select();}toast('lcwCopyFailed');}}return;
        }
        if(action==='add-key' || action==='suggestion'){
            var phrase=action==='suggestion'?button.dataset.keywordText:s.context.manualKey,next=LiveCampaignDraft.addKeyword(s.draft,phrase);
            if(next===s.draft){toast('lcwKeyInvalid');return;}s.draft=next;s.context.manualKey='';s.edited=true;render(s,false);return;
        }
        if(action==='remove-key'){s.media.remove('keyword:'+id);s.draft=LiveCampaignDraft.keyword(s.draft,id,'remove');s.edited=true;render(s,false);return;}
        var template=button.dataset.lcwTemplate;
        if(template){
            if(s.edited){s.confirming=true;var accepted=await confirm(text('lcwReset'));s.confirming=false;if(!accepted||!accessible(s))return;}
            if(s.editing)return;s.media.clear();var projectPolicy=Object.assign({},s.draft.volume);s.draft=LiveCampaignDraft.applyStrategy(s.draft,template);if(s.context.projectControl)Object.assign(s.draft.volume,LiveProjectControl.policy(projectPolicy));s.draft.name=text({aso:'lcwAso',retention:'lcwRetention',deep:'lcwDeep'}[template]);if(template==='deep')s.draft.activity.instructions=text('lcgDefaultScenario');s.edited=false;s.webEdited=false;s.context.manualKey='';s.quickStatus='paused';return save(s,s.quickStatus);
        }
        if(field){
            var value=button.dataset.value;value=(['source','mode'].includes(field)||LiveManualPlan.textField(field))?value:value==='true'?true:value==='false'?false:Number(value);
            if(field.indexOf('cap:')===0){if(!s.context.projectControl)return;LiveProjectControl.change(s.context.projectControl,field.slice(4),value);s.context.allocationEdited=true;render(s,false);return;}
            var next=LiveCampaignDraft.change(s.draft,field,value);
            if(field==='checkpoint' && next===s.draft){toast('lcwMinimum');return;}s.draft=next;s.edited=true;
        }else return;
        render(s,false);
    }
    async function save(s,status){
        if(s.saving||!accessible(s)||!LiveCampaignDraft.valid(s.draft,4))return;
        s.saving=true;s.context.saving=true;s.context.saveError='';refresh(s);if(s.step===0)render(s,false);
        try{
            if(!s.context.projectControl){await s.campaignRead;if(!s.context.projectControl)throw new Error('project_control_unavailable');}
            if(!s.editing&&s.quickStatus&&!s.createAttempt)status=s.quickStatus;
            var payload=await LiveCampaignDraft.definition(s.draft,s.media.serialize);
            if(!accessible(s))return;
            var control=LiveProjectControl.payload(s.draft,s.context.projectControl);
            var key=JSON.stringify([payload,control])+(s.editing?s.editing.revision:'create');if(!s.createAttempt||s.createAttempt.key!==key)s.createAttempt={key:key,id:window.LiveCampaigns.requestKey(),status:status};status=s.createAttempt.status;
            var url=String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+s.draft.appId+'/campaigns'+(s.editing?'/'+s.editing.id+'/definition':'');
            var body=Object.assign({init_data:s.actor,request_key:s.createAttempt.id,definition:payload,project_control:control},s.editing?{revision:s.editing.revision}:{status:status});
            var response=await fetch(url,{method:s.editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
            var data=await response.json();if(!accessible(s))return;
            if(!response.ok||data.status!=='success')throw new Error(data.code||'save_failed');
            var appId=s.draft.appId,campaignId=data.campaign.id,edited=!!s.editing;dispose(s);window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:appId,campaignId:campaignId,reveal:true}}));toast(edited?'lceSaved':status==='paused'?'lcgCreatedPaused':'lcgCreated');
        }catch(error){if(accessible(s)){var code={active_campaign_limit:'lcgLimitReached',invalid_campaign_image:'lcwInvalidImage',campaign_conflict:'lceConflict',campaign_source_locked:'lceSourceLocked',campaign_volume_below_confirmed:'lceVolumeLow',last_active_keyword:'lcgLastKey'}[error.message]||'lcgSaveFailed';s.context.saveError=text(code);toast(code);if(error.message==='active_campaign_limit'&&!s.editing){s.quickStatus='paused';s.createAttempt=null;}readData(s,'campaigns');}}
        finally{if(accessible(s)){s.saving=false;s.context.saving=false;render(s,false);}}
    }
    function keydown(e){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();return;}
        if(e.key==='Enter' && e.target.dataset.lcwInput==='manualKey'){e.preventDefault();session.layer.querySelector('[data-lcw-action="add-key"]').click();return;}
        if(e.key!=='Tab' || !session)return;
        var nodes=Array.from(session.layer.querySelectorAll('button:not(:disabled),a[href],input:not([type="file"]),summary')).filter(function(n){return n.getClientRects().length;});
        var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey && (document.activeElement===first || !nodes.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
    function open(id,event,campaign){
        if(event)event.stopPropagation();if(session){if(!accessible(session))dispose(session);else return;}
        var p=project(id),signed=actor();if(!p || !signed){toast('lcwNoAccess');return;}
        var layer=document.createElement('div');layer.id='live-campaign-wizard';layer.className='modal-overlay active gtw-overlay';
        layer.innerHTML='<section class="lcw-page" role="dialog" aria-modal="true" aria-labelledby="lcw-title"><header class="gtw-header"><button type="button" class="gtw-back-btn" data-lcw-action="back" aria-label="'+text('lcwBack')+'">‹</button><div class="lcw-header-center"></div><div class="lcw-header-actions"><button type="button" class="gtw-forward-btn lcw-learn-btn" data-lcw-action="learn" data-topic="spikes" aria-haspopup="dialog" aria-label="'+text('lcpLearn')+'" title="'+text('lcpLearn')+'"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/></svg></button><button type="button" class="gtw-forward-btn" data-lcw-action="close" aria-label="'+text('lcwClose')+'">×</button></div></header><main class="lcw-scroll gtw-body"></main><footer class="lcw-footer"></footer></section>';
        function asset(assetId){return assetId?{assetId:assetId,name:text('lcwReference'),url:String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+Number(id)+'/campaigns/'+Number(campaign.id)+'/assets/'+Number(assetId)+'?init_data='+encodeURIComponent(signed)}:null;}
        var draft=campaign?LiveCampaignDraft.fromCampaign(p,campaign,asset):LiveCampaignDraft.create(p);
        session={draft:draft,editing:campaign||null,step:campaign?1:0,unlocked:campaign?4:1,actor:signed,layer:layer,initial:fingerprint(draft),edited:false,webEdited:!!campaign,confirming:false,outlineOpen:false,estimateOpen:false,
            context:{editing:!!campaign,confirmedInstalls:campaign?campaign.confirmed_installs:0,sourceLocked:!!(campaign&&campaign.confirmed_installs>0),metrics:p.live_metrics||{},market:p.play_store_raw || null,sourceBaseline:LiveCampaignTraffic.baseline(p.live_analytics_snapshot) || LiveCampaignTraffic.baseline(p.live_metrics),asoOpen:false,manualKey:''},
            readers:[],media:LiveCampaignWizardMedia.create(),focus:event && event.target && event.target.closest('button') || document.activeElement,overflow:document.body.style.overflow};
        document.body.style.overflow='hidden';document.body.appendChild(layer);
        layer.addEventListener('click',click);layer.addEventListener('input',input);
        layer.addEventListener('change',function(e){var s=session;if(!s)return;if(!accessible(s)){dispose(s);return;}if(e.target.dataset.lcwFile)fileInput(s,e.target);else if(e.target.dataset.lcwInput==='retention'&&!invalid(s))render(s,false);});
        layer.addEventListener('keydown',keydown);
        window.addEventListener('beforeunload',beforeUnload);render(session,true);syncBack();
        session.hudTimer=setInterval(function(){if(session&&session.layer===layer)refresh(session);},60000);session.campaignRead=readData(session,'campaigns');readData(session,'sources');if(!session.context.market)readData(session,'market');readGeo(session,false);
    }
    function openSource(id,source){open(id);var s=session;if(!s||s.draft.appId!==Number(id)||s.editing)return false;s.draft=LiveCampaignDraft.change(s.draft,'source',source);s.step=1;s.unlocked=1;s.context.asoOpen=source==='keywords';s.initial=fingerprint(s.draft);render(s,true);return true;}
    window.addEventListener('live-project:pool-saved',function(event){var s=session;if(!s||!accessible(s)||s.draft.appId!==event.detail.appId)return;var control=event.detail.control;s.context.poolAvailable=control.pool_available;if(s.context.projectControl)s.context.projectControl.revision=control.revision;render(s,false);});
    function editAt(id,campaign,step){open(id,null,campaign);var s=session;if(!s||!s.editing||s.editing.id!==campaign.id)return false;s.step=step===3?3:1;render(s,true);return true;}
    function scenario(id){if(!openSource(id,'link'))return false;session.draft=LiveCampaignDraft.change(session.draft,'activity',true);session.draft=LiveCampaignDraft.change(session.draft,'screenshot',true);session.step=3;session.unlocked=3;render(session,true);return true;}
    window.LiveCampaignWizard={editAt:editAt,scenario:scenario,openSource:openSource,open:open,edit:function(id,campaign,event){return open(id,event,campaign);},close:close,back:back};
})();
