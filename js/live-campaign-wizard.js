/* Fullscreen campaign setup; actor-scoped reads and session-owned attachments. */
(function () {
    'use strict';
    var session=null;
    function actor(){try{return window.getTelegramInitDataRaw() || '';}catch(_){return '';}}
    function project(id){return (window.myProjects || []).find(function(p){return Number(p.id || p.app_id)===Number(id) && p.phase==='live';});}
    function text(k,v){return LiveCampaignWizardView.text(k,v);}
    function syncBack(){if(window.syncTelegramBackButton)window.syncTelegramBackButton();}
    function accessible(s){return session===s && s.actor===actor() && !!project(s.draft.appId);}
    function fingerprint(d){var copy=JSON.parse(JSON.stringify(d));delete copy.appTitle;delete copy.baseline;delete copy.thermalPhase;delete copy.forecastContext;delete copy.paceCampaignCapacity;delete copy.paceOwnCapacity;return JSON.stringify(copy);}
    function dirty(s){return fingerprint(s.draft)!==s.initial || !!s.context.manualKey || !!s.context.allocationEdited;}
    window.addEventListener('project-feedback:settings',function(event){var s=session;if(s&&accessible(s)&&s.step==='feedback'&&Number(event.detail.appId)===s.draft.appId)render(s,false);});
    window.addEventListener('live-campaigns:data',function(event){var s=session;if(!s||!accessible(s)||Number(event.detail.appId)!==Number(s.draft.appId))return;LiveProjectControl.refreshPhase(s.layer,s.draft,event.detail.control);});
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
        if(s.saving){toast('lcgSaving');return true;}
        if(s.step!==0){finishSheet(s);return true;}
        close();return true;
    }
    function beforeUnload(e){if(session && dirty(session)){e.preventDefault();e.returnValue='';}}
    function invalid(s){return !!s.layer.querySelector('.bp-sheet-body [aria-invalid="true"]');}
    function shell(s){
        var view=LiveCampaignWizardView,body=s.layer.querySelector('.lcw-scroll');
        var drawer=s.layer.querySelector('.bp-sheet'),page=s.layer.querySelector('.lcw-page');
        drawer.hidden=s.step===0;
        page.inert=s.step!==0;
        drawer.querySelector('h2').textContent=view.title(s.step);
        drawer.querySelector('footer').innerHTML=s.step===0?'':view.footer(s.draft,s.step,false,s.context);
        page.querySelector('.lcw-footer').innerHTML=view.footer(s.draft,0,s.estimateOpen,s.context);
        var wallet=window.ReviewCredits&&ReviewCredits.get(),quota=page.querySelector('[data-bp-wallet]');
        quota.textContent='⚡ '+(wallet&&Number.isFinite(Number(wallet.available))?view.number(wallet.available,2):'…');
        s.layer.setAttribute('aria-busy',String(!!s.saving));
        var next=drawer.querySelector('[data-lcw-action="next"]');
        if(next)next.disabled=invalid(s)||(s.step===1&&!LiveCampaignDraft.valid(s.draft,1));
        if(!s.step&&body.firstChild==null)body.innerHTML=view.body(s.draft,0,s.context);
    }
    function finishSheet(s){
        if(invalid(s)){toast('bpUnsaved');return;}
        var ref=s.returnStep||s.step;
        s.step=0;render(s,true);
        s.layer.querySelector('.bp-route [data-step="'+ref+'"]')?.focus({preventScroll:true});
    }
    function showSheet(s,step){
        if(![1,2,3,'feedback',4].includes(step)||invalid(s))return;
        if(s.step===0)s.returnStep=step;
        s.step=step;
        if(step==='feedback'&&window.ProjectFeedback){
            ProjectFeedback.fetchSettings(s.draft.appId).then(function(){if(accessible(s)&&s.step==='feedback')render(s,false);}).catch(function(){toast('lcFailed');});
        }
        if(step===1){
            if(!s.context.sourceBaseline)readData(s,'sources');
            if(!s.context.market)readData(s,'market');
            if(!s.context.geoStats&&!s.context.geoError)readGeo(s,false);
        }
        render(s,true);
    }
    function refresh(s){
        if(!accessible(s)){if(session===s)dispose(s);return;}
        LiveProjectControl.prepareForecast(s.draft,s.context.projectControl,true);
        if(window.LiveScenarioEditor)LiveScenarioEditor.refresh(s.draft.activity,s.layer);
        shell(s);
        LiveProjectControl.refresh(s.layer,s.draft,s.context.projectControl,true);
        var contractPrice=s.layer.querySelector('[data-ct-price]');if(contractPrice&&window.LiveContracts){var cost=LiveContracts.range(s.draft);contractPrice.textContent=cost.min.toLocaleString(window.lang==='ru'?'ru-RU':'en-US')+(cost.min===cost.max?'':'–'+cost.max.toLocaleString(window.lang==='ru'?'ru-RU':'en-US'))+' $BUST';}
        var displayError=s.layer.querySelector('[data-lpc-display-error]');if(displayError)displayError.textContent=!s.draft.icon&&!s.draft.name.trim()?text('lpcDisplayRequired'):'';
        var balance=s.layer.querySelector('[data-lcw-balance]');if(balance)balance.innerHTML=LiveCampaignSourcesView.balance(s.draft,s.context);
        var timeline=s.layer.querySelector('.bp-sheet-body .bp-timeline');if(timeline)timeline.outerHTML=LiveCampaignWizardView.timeline(s.draft,false);
        var checkpoints=s.layer.querySelector('[data-bp-timeline] > p');if(checkpoints){var n=s.draft.retention.checkpoints.length;checkpoints.textContent=text('bpSummaryKD',{n:n,price:(n-1)*10});}
        var validation=s.layer.querySelector('[data-lcw-validation]');
        if(validation)validation.textContent=invalid(s)?text('lcwInvalidCount'):!LiveCampaignDraft.valid(s.draft,1)?text(LiveCampaignDraft.allowed(s.draft).includes('keywords')&&!s.draft.keywords.length?'lcgNeedKey':'lcwQueryRequired'):'';
    }
    function render(s,changedStep){
        if(!accessible(s)){dispose(s);return;}
        var canvas=s.layer.querySelector('.lcw-scroll'),panel=s.layer.querySelector('.bp-sheet-body');
        var body=s.step===0?canvas:panel,position=body.scrollTop,focused=document.activeElement;
        var attrs=['lcwFocus','lcwInput','lcwAction','lcwField','value','step','keyword','lseKey','lseField','lseQuestion','lseOption','lseSetting','pfField','pfCampaignMutual'];
        var identity=attrs.map(function(k){return focused&&focused.dataset[k];});
        var start=focused&&focused.selectionStart,end=focused&&focused.selectionEnd;
        s.context.descriptionOpen=!!panel.querySelector('.lcw-description[open]');
        var interval=!!panel.querySelector('[data-bp-checkpoint-interval][open]');
        canvas.innerHTML=LiveCampaignWizardView.body(s.draft,0,s.context);
        panel.innerHTML=s.step===0?'':LiveCampaignWizardView.body(s.draft,s.step,s.context);
        if(interval&&s.step===2)panel.querySelector('[data-bp-checkpoint-interval]').open=true;
        if(window.LiveScenarioEditor)LiveScenarioEditor.refresh(s.draft.activity,panel);
        if(window.LiveScenarioUI&&panel.querySelector('.lse-editor'))LiveScenarioUI.addInherited(panel.querySelector('.lse-editor'),s.draft.appId);
        shell(s);
        body.scrollTop=changedStep&&s.step!==0?0:position;
        if(changedStep&&s.step!==0){s.layer.querySelector('.bp-sheet h2').focus({preventScroll:true});return;}
        var candidate=Array.from(body.querySelectorAll('button,input,select,textarea')).find(function(el){
            return identity.some(Boolean)&&attrs.every(function(k,i){return el.dataset[k]===identity[i];});
        });
        if(candidate&&!candidate.disabled){
            candidate.focus({preventScroll:true});
            if(typeof start==='number'&&candidate.setSelectionRange&&candidate.type!=='number')candidate.setSelectionRange(start,end);
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
                if(data.project_control?.feedback_settings&&window.ProjectFeedback)ProjectFeedback.rememberSettings(s.draft.appId,data.project_control.feedback_settings);
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
                if(kind==='market' && s.step===1 || kind==='campaigns' && s.step===0)render(s,false);
            }else if(session===s)dispose(s);
        }
    }
    async function readGeo(s,force){
        if(s.context.geoLoading||!window.ShowcaseGeo)return;s.context.geoLoading=true;s.context.geoError=false;
        try{var data=await ShowcaseGeo.getStats(force);if(accessible(s))s.context.geoStats=data;}
        catch(_){if(accessible(s))s.context.geoError=true;}
        finally{if(accessible(s)){s.context.geoLoading=false;if(s.step===1)render(s,false);}}
    }
    function mediaExists(s,key){return key==='web' || /^scenario:[0-4]$/.test(key) || (key.startsWith('step:')&&(s.draft.activity.steps||[]).some(function(x){return 'step:'+x._key===key;})) || s.draft.keywords.some(function(k){return 'keyword:'+k.id===key;});}
    async function fileInput(s,input){
        var key=input.dataset.lcwFile,file=input.files[0];if(!file)return;
        try{
            var result=await s.media.attach(key,file,function(){return accessible(s) && mediaExists(s,key);});
            if(result && accessible(s)){s.draft=LiveCampaignDraft.media(s.draft,key,result);s.edited=true;render(s,false);}
        }catch(_){if(accessible(s))toast(key.startsWith('step:')?'lseInvalidMedia':'lcwInvalidImage');}
        input.value='';
    }
    function input(event){
        var s=session,el=event.target;if(!s)return;if(!accessible(s)){dispose(s);return;}
        if(s.confirming||s.saving)return;
        if(el.dataset.ctField){var name=el.dataset.ctField,value=Number(el.value),ok=el.value.trim()!==''&&Number.isInteger(value)&&value>=Number(el.min)&&value<=Number(el.max);el.setAttribute('aria-invalid',String(!ok));if(ok){if(name.startsWith('source_'))s.draft.contracts.source_bonus_bust[name.slice(7)]=value;else s.draft.contracts[name]=value;s.edited=true;}refresh(s);return;}
        if(el.hasAttribute('data-pf-campaign-mutual')){
            s.draft.impression_mutual=el.checked;s.edited=true;refresh(s);return;
        }
        if(el.dataset.pfField&&window.ProjectFeedback){
            var config=ProjectFeedback.configValue(el),bonus=el.closest('.pf-config').querySelector('[data-pf-field="bonus"]');
            var validBonus=config?.mode!=='voluntary'||bonus.checkValidity();
            bonus.setAttribute('aria-invalid',String(!validBonus));
            if(validBonus){s.draft.impression=config;s.edited=true;}
            refresh(s);return;
        }
        if(window.LiveScenarioEditor&&LiveScenarioEditor.input(s.draft.activity,el)){s.edited=true;if(el.tagName==='SELECT'||el.type==='checkbox')render(s,false);else refresh(s);return;}var field=el.dataset.lcwInput;if(!field)return;
        if(field==='scenarioLimit'){var limit=el.value===''?null:Number(el.value),valid=limit===null||Number.isInteger(limit)&&limit>=1&&limit<=100000;el.setAttribute('aria-invalid',String(!valid));if(valid){s.draft=LiveCampaignDraft.change(s.draft,field,limit);s.edited=true;}refresh(s);return;}
        if(field==='scenarioTitle'){s.draft=LiveCampaignDraft.change(s.draft,field,el.value);s.edited=true;refresh(s);return;}
        if(field==='manualKey'){s.context.manualKey=el.value;return;}
        if(['daily','period','target','retention','minDays','maxDays','checkpointCount','checkpointInterval','pauseHours'].includes(field)||field.indexOf('cap:')===0||field.indexOf('plan:')===0){
            var min=Number(el.min),max=Number(el.max),value=Number(el.value);
            var ok=/^\d+$/.test(el.value) && Number.isSafeInteger(value) && value>=min && value<=max;
            el.setAttribute('aria-invalid',String(!ok));el.setCustomValidity(ok?'':text('lcwInvalidCount'));
            if(field==='pauseHours'&&ok){s.draft=LiveCampaignDraft.change(s.draft,field,value);s.edited=true;LiveCampaignPaceView.refreshHours(s.layer,s.draft.volume);refresh(s);return;}
            if(!ok){refresh(s);return;}
            if(field.indexOf('cap:')===0){LiveProjectControl.change(s.context.projectControl,field.slice(4),value);s.context.allocationEdited=true;}else s.draft=LiveCampaignDraft.change(s.draft,field,value);
            // Keep adjacent +/- buttons current while typing without replacing the input/keyboard.
            var buttons=el.parentElement.querySelectorAll('button');
            buttons[0].dataset.value=Math.max(min,value-Number(el.parentElement.dataset.increment||1));buttons[0].disabled=value<=min;buttons[1].dataset.value=Math.min(max,value+Number(el.parentElement.dataset.increment||1));buttons[1].disabled=value>=max;
        }else if(field==='webQuery'){s.draft=LiveCampaignDraft.change(s.draft,field,el.value);s.webEdited=true;}
        else if(field==='name'||field==='instructions')s.draft=LiveCampaignDraft.change(s.draft,field,el.value);
        else if(field==='position')s.draft=LiveCampaignDraft.keyword(s.draft,el.dataset.keyword,'position',el.value);
        else return;
        s.edited=true;refresh(s);
    }
    async function click(event){
        var s=session;if(!s)return;if(!accessible(s)){event.preventDefault();dispose(s);return;}
        if(LiveProjectControl.toggleDisclosure(event))return;
        if(event.target.matches('.bp-sheet')){finishSheet(s);return;}
        var button=event.target.closest('button');if(!button || button.disabled)return;event.stopPropagation();if(s.confirming||s.saving)return;
        var action=button.dataset.lcwAction,field=button.dataset.lcwField,id=button.dataset.keyword;if(window.LiveScenarioEditor&&LiveScenarioEditor.click(s.draft.activity,button,s.media)){s.edited=true;render(s,false);return;}
        if(button.hasAttribute('data-ct-enable')){s.draft.contracts.enabled=!s.draft.contracts.enabled;s.edited=true;render(s,false);return;}
        if(button.dataset.ctMode){s.draft.contracts.payout_mode=button.dataset.ctMode;s.edited=true;render(s,false);return;}
        if(action==='key-geo'){var row=s.draft.keywords.find(function(k){return k.id===id;});if(!row)return;ShowcaseGeo.openPicker({value:null,titleKey:'kwGeo',hintKey:'kwGeoHint',anyKey:'lcGeoAny',onChoose:function(code){if(!accessible(s))return;var countries=code?Array.from(new Set((row.geo_countries||[]).concat(code))).slice(0,50):[];s.draft=LiveCampaignDraft.keyword(s.draft,id,'geo_countries',countries);s.edited=true;render(s,false);}});return;}
        if(action==='key-geo-remove'){var row=s.draft.keywords.find(function(k){return k.id===id;});s.draft=LiveCampaignDraft.keyword(s.draft,id,'geo_countries',(row.geo_countries||[]).filter(function(code){return code!==button.dataset.country;}));s.edited=true;render(s,false);return;}
        if(action==='key-fallback'){var row=s.draft.keywords.find(function(k){return k.id===id;});s.draft=LiveCampaignDraft.keyword(s.draft,id,'is_fallback',!row.is_fallback);s.edited=true;render(s,false);return;}
        if(button.dataset.lcwIcon){s.draft.icon=button.dataset.lcwIcon==='none'?null:button.dataset.lcwIcon;s.edited=true;render(s,false);return;}
        if(button.hasAttribute('data-lpc-reset')){if(!s.context.projectControl)return;s.context.projectControl.allocations.forEach(function(a){a.limit=null;});s.context.projectControl.ownLimit=null;s.context.allocationEdited=true;render(s,false);return;}
        if(button.hasAttribute('data-lpc-unlimited')||button.hasAttribute('data-lpc-cap')){if(!s.context.projectControl)return;LiveProjectControl.change(s.context.projectControl,button.dataset.lpcUnlimited||button.dataset.lpcCap,button.hasAttribute('data-lpc-cap')?'cap':null);s.context.allocationEdited=true;render(s,false);return;}
        if(action==='learn'){window.LiveCampaignLearning.open(button.dataset.topic||'pace',button);return;}
        if(action==='geo'){ShowcaseGeo.openPicker({value:s.draft.country,titleKey:'lcGeoTitle',hintKey:'lcGeoPickerHint',anyKey:'lcGeoAny',onChoose:function(code){if(!accessible(s))return;s.draft=LiveCampaignDraft.change(s.draft,'country',code);s.edited=true;render(s,false);var choice=s.layer.querySelector('[data-lcw-action="geo"]');if(choice)choice.focus({preventScroll:true});}});return;}
        if(action==='geo-community'){ShowcaseGeo.openCommunityList();return;}
        if(action==='geo-retry'){readGeo(s,true);return;}
        if(action==='close')return close();if(action==='back')return back();
        if(action==='wallet'){if(window.ReviewCredits)ReviewCredits.openBalance().finally(function(){if(accessible(s))shell(s);});return;}
        if(action==='estimate'){s.estimateOpen=!s.estimateOpen;shell(s);s.layer.querySelector('[data-lcw-action="estimate"]').focus();return;}
        if(action==='step'||action==='next')return showSheet(s,button.dataset.step==='feedback'?'feedback':Number(button.dataset.step));
        if(action==='done')return finishSheet(s);
        if(button.dataset.lcwRange){
            var range=button.dataset.lcwRange==='fixed'?[s.draft.retention.days,s.draft.retention.days]:button.dataset.lcwRange.split(':').map(Number);
            s.draft=LiveCampaignDraft.change(s.draft,'minDays',range[0]);
            s.draft=LiveCampaignDraft.change(s.draft,'maxDays',range[1]);
            s.edited=true;render(s,false);return;
        }
        if(action==='save')return save(s,s.editing?s.editing.status:s.context.capacity&&s.context.capacity.active<s.context.capacity.limit?'active':'paused');
        if(action==='aso'){s.context.asoOpen=!s.context.asoOpen;render(s,false);return;}
        if(action==='retry-data'){readData(s,'sources');if(s.context.campaignsError)readData(s,'campaigns');if(!s.context.market)readData(s,'market');return;}
        if(action==='attach'){
            var input=Array.from(s.layer.querySelectorAll('[data-lcw-file]')).find(function(n){return n.dataset.lcwFile===button.dataset.asset;});if(input)input.click();return;
        }
        if(action==='remove-media'){s.media.remove(button.dataset.asset);s.draft=LiveCampaignDraft.media(s.draft,button.dataset.asset,null);s.edited=true;render(s,false);return;}
        if(action==='copy-query'||action==='web-search'){
            var queryText=s.draft.web.mode==='web_brand'?LiveCampaignDraft.brandQuery(s.draft):s.draft.web.query;
            var copying;try{copying=navigator.clipboard.writeText(queryText);}catch(error){copying=Promise.reject(error);}
            if(action==='web-search'&&accessible(s)){var url='https://www.google.com/search?q='+encodeURIComponent(queryText);var tg=window.Telegram&&window.Telegram.WebApp||window.tg;if(tg&&tg.openLink)tg.openLink(url);else window.open(url,'_blank','noopener,noreferrer');}
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
            if(s.editing)return;
            s.media.clear();
            var projectPolicy=Object.assign({},s.draft.volume);
            s.draft=LiveCampaignDraft.applyStrategy(s.draft,template);
            if(s.context.projectControl)Object.assign(s.draft.volume,LiveProjectControl.policy(projectPolicy));
            s.draft.name=template==='custom'?'':text({aso:'lcwAso',retention:'lcwRetention',deep:'lcwDeep'}[template]);
            if(template==='deep'){
                s.draft.activity.instructions=text('lcgDefaultScenario');
                LiveScenarioEditor.load(s.draft.activity,function(){return null;});
            }
            s.edited=false;s.webEdited=false;s.context.manualKey='';render(s,false);return;
        }
        if(field){
            var value=button.dataset.value;value=(['source','mode','allowedSource','preferredSource','limit_mode','webMode'].includes(field)||LiveManualPlan.textField(field))?value:value==='true'?true:value==='false'?false:Number(value);
            if(field.indexOf('cap:')===0){if(!s.context.projectControl)return;LiveProjectControl.change(s.context.projectControl,field.slice(4),value);s.context.allocationEdited=true;render(s,false);return;}
            var next=LiveCampaignDraft.change(s.draft,field,value);
            if(field==='checkpoint' && next===s.draft){toast('lcwMinimum');return;}s.draft=next;s.edited=true;
        }else return;
        render(s,false);
    }
    async function save(s,status){
        if(s.saving||!accessible(s)||invalid(s)||!LiveCampaignDraft.valid(s.draft,4))return;
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
            var appId=s.draft.appId,campaignId=data.campaign.id,edited=!!s.editing,wantPriority=!!s.draft.routePriority;
            var priorityFailed=false;
            if((wantPriority||!!s.editing?.route_priority)&&window.LiveMarketUI){
                try{await LiveMarketUI.api('/live-campaigns/'+campaignId+'/priority','PATCH',{enabled:wantPriority});}
                catch(_){priorityFailed=true;}
            }
            dispose(s);window.dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:appId,campaignId:campaignId,reveal:true}}));toast(priorityFailed?'bpPriorityError':edited?'lceSaved':status==='paused'?'lcgCreatedPaused':'lcgCreated');
        }catch(error){if(accessible(s)){var code={active_campaign_limit:'lcgLimitReached',invalid_campaign_image:'lcwInvalidImage',campaign_conflict:'lceConflict',campaign_source_locked:'lceSourceLocked',campaign_volume_below_confirmed:'lceVolumeLow',last_active_keyword:'lcgLastKey'}[error.message]||'lcgSaveFailed';s.context.saveError=text(code);toast(code);if(error.message==='active_campaign_limit'&&!s.editing){s.quickStatus='paused';s.createAttempt=null;}readData(s,'campaigns');}}
        finally{if(accessible(s)){s.saving=false;s.context.saving=false;render(s,false);}}
    }
    function keydown(e){
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();back();return;}
        if(e.key==='Enter' && e.target.dataset.lcwInput==='manualKey'){e.preventDefault();session.layer.querySelector('[data-lcw-action="add-key"]').click();return;}
        if(e.key!=='Tab' || !session)return;
        var scope=session.layer.querySelector(session.step===0?'.lcw-page':'.bp-sheet');
        var nodes=Array.from(scope.querySelectorAll('button:not(:disabled),a[href],input:not([type="file"]),select,textarea,summary')).filter(function(n){return n.getClientRects().length;});
        if(!nodes.length)return;
        var first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey && (document.activeElement===first || !nodes.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();}
    }
    function open(id,event,campaign){
        if(event)event.stopPropagation();if(session){if(!accessible(session))dispose(session);else return;}
        var p=project(id),signed=actor();if(!p || !signed){toast('lcwNoAccess');return;}
        var layer=document.createElement('div');layer.id='live-campaign-wizard';layer.className='modal-overlay active gtw-overlay';
        layer.innerHTML='<section class="lcw-page" role="dialog" aria-modal="true" aria-labelledby="lcw-title"><header class="gtw-header"><button type="button" class="gtw-back-btn" data-lcw-action="back" aria-label="'+text('lcwBack')+'">‹</button><div class="lcw-header-center">'+LiveCampaignWizardView.header()+'</div><div class="lcw-header-actions"><button type="button" class="meta-chip bp-wallet" data-lcw-action="wallet" data-bp-wallet aria-label="'+text('growthWallet')+'"></button><button type="button" class="gtw-forward-btn lcw-learn-btn" data-lcw-action="learn" data-topic="spikes" aria-haspopup="dialog" aria-label="'+text('lcpLearn')+'" title="'+text('lcpLearn')+'"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v16M12 5C9 3 5 3 2 4v15c3-1 7-1 10 2 3-3 7-3 10-2V4c-3-1-7-1-10 1Z"/></svg></button><button type="button" class="gtw-forward-btn" data-lcw-action="close" aria-label="'+text('lcwClose')+'">×</button></div></header><main class="lcw-scroll gtw-body"></main><footer class="lcw-footer"></footer></section><div class="bp-sheet" hidden><section role="dialog" aria-modal="true" aria-labelledby="bp-sheet-title" class="bp-sheet-dialog"><header><h2 id="bp-sheet-title" tabindex="-1"></h2><button type="button" class="meta-chip" data-lcw-action="done" aria-label="'+text('lcwClose')+'">×</button></header><div class="bp-sheet-body"></div><footer></footer></section></div>';
        function asset(assetId){return assetId?{assetId:assetId,name:text('lcwReference'),url:String(window.API_BASE||'/api').replace(/\/$/,'')+'/apps/'+Number(id)+'/campaigns/'+Number(campaign.id)+'/assets/'+Number(assetId)+'?init_data='+encodeURIComponent(signed)}:null;}
        var draft=campaign?LiveCampaignDraft.fromCampaign(p,campaign,asset):LiveCampaignDraft.create(p);
        session={draft:draft,editing:campaign||null,step:0,actor:signed,layer:layer,initial:fingerprint(draft),edited:false,webEdited:!!campaign,confirming:false,estimateOpen:false,
            context:{editing:!!campaign,confirmedInstalls:campaign?campaign.confirmed_installs:0,sourceLocked:false,metrics:p.live_metrics||{},market:p.play_store_raw || null,sourceBaseline:LiveCampaignTraffic.baseline(p.live_analytics_snapshot) || LiveCampaignTraffic.baseline(p.live_metrics),asoOpen:false,manualKey:''},
            readers:[],media:LiveCampaignWizardMedia.create(),focus:event && event.target && event.target.closest('button') || document.activeElement,overflow:document.body.style.overflow};
        document.body.style.overflow='hidden';document.body.appendChild(layer);
        layer.addEventListener('click',click);layer.addEventListener('input',input);
        layer.addEventListener('change',function(e){var s=session;if(!s)return;if(!accessible(s)){dispose(s);return;}if(e.target.dataset.lcwFile)fileInput(s,e.target);else if(['retention','minDays','maxDays','checkpointCount','checkpointInterval'].includes(e.target.dataset.lcwInput)&&!invalid(s))render(s,false);});
        layer.addEventListener('keydown',keydown);
        window.addEventListener('beforeunload',beforeUnload);render(session,true);syncBack();
        var s=session;s.campaignRead=readData(s,'campaigns');
        if(window.ReviewCredits&&!ReviewCredits.get())ReviewCredits.refresh().catch(function(){}).finally(function(){if(accessible(s))shell(s);});
        layer.querySelector('[data-lcw-action="back"]').focus({preventScroll:true});
    }
    function openSource(id,source){open(id);var s=session;if(!s||s.draft.appId!==Number(id)||s.editing)return false;s.draft=LiveCampaignDraft.change(s.draft,'source',source);s.context.asoOpen=source==='keywords';s.initial=fingerprint(s.draft);showSheet(s,1);return true;}
    window.addEventListener('live-project:pool-saved',function(event){var s=session;if(!s||!accessible(s)||s.draft.appId!==event.detail.appId)return;var control=event.detail.control;s.context.poolAvailable=control.pool_available;if(s.context.projectControl)s.context.projectControl.revision=control.revision;render(s,false);});
    function editAt(id,campaign,step){open(id,null,campaign);var s=session;if(!s||!s.editing||s.editing.id!==campaign.id)return false;showSheet(s,[3,4].includes(step)?step:1);return true;}
    function scenario(id){if(!openSource(id,'link'))return false;session.draft=LiveCampaignDraft.change(session.draft,'activity',true);session.draft=LiveCampaignDraft.change(session.draft,'screenshot',true);showSheet(session,3);return true;}
    window.LiveCampaignWizard={editAt:editAt,scenario:scenario,openSource:openSource,open:open,edit:function(id,campaign,event){return open(id,event,campaign);},close:close,back:back};
})();
