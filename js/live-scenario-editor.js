/* Shared scenario editor for the campaign wizard and its branches. */
(function () {
    'use strict';
    var sequence = 0;
    var limits = {text: 90, description: 220, quick_copy: 100};
    function t(key, values) { return window.t(key, values || {}, window.lang); }
    function e(value) { return window.escapeHTML(String(value ?? '')); }
    function chars(value) { return Array.from(value || ''); }
    function split(value, notes) {
        return value.trim().split(/(?:^|\r?\n|\s+(?=(?:\d+[.)]|[•–])\s))\s*(?:\d+[.)]|[•–-])?\s*/u)
            .filter(Boolean).flatMap(function (row) {
                var remaining = chars(row.trim()), steps = [];
                while (remaining.length) {
                    var take = remaining.length <= 90 ? remaining.length : remaining.slice(0, 90).lastIndexOf(' ');
                    var text = remaining.splice(0, take > 40 ? take : 90).join('').trim();
                    var description = notes ? remaining.splice(0, 220).join('').trim() : '';
                    if (text) steps.push({text: text, description: description});
                }
                return steps;
            });
    }
    function normalize(activity) {
        if (!activity.steps?.length) activity.steps = split(activity.instructions || '', true);
        if (!activity.steps.length) activity.steps.push({text: ''});
        activity.steps.forEach(function (step) { if (!step._key) step._key = 's' + (++sequence); });
        return activity.steps;
    }
    function iterations(activity) { return Number(activity.iterations_count || 1); }
    function lastDay(activity) {
        return Number(activity.open_day || 1) + (iterations(activity)-1)*Number(activity.iterations_interval_days || 1);
    }
    function cost(activity) {
        if (activity.enabled === false) return {quota:0, artifacts:0,total:0,suggested:0};
        var steps=activity.steps||[], screenshots=steps.filter(s=>s.require_proof).length, questions=steps.filter(s=>s.question).length;
        var video=activity.proof_mode==='video', n=iterations(activity);
        var artifacts=n*(10*screenshots+10*questions+(video?15:0));
        return {proofs:screenshots,questions:questions,rounds:n,video:video,quota:n*(50+20*screenshots+15*questions+(video?25:0)), artifacts:artifacts,
            total:artifacts+Number(activity.owner_bonus_bust||0),
            suggested:steps.length>3||artifacts||n>1?20:0};
    }
    function feeLabel(activity) {
        return t('growthScenarioFee',{price:(cost(activity).quota/100).toLocaleString(window.lang==='ru'?'ru':'en',{
            minimumFractionDigits:2,maximumFractionDigits:2})});
    }
    function validQuestion(q) {
        if(!q)return true;
        if(chars((q.prompt||'').trim()).length<2||chars(q.prompt).length>220)return false;
        if(q.kind==='text')return true;
        var values=q.options.map(value=>value.trim().toLowerCase());
        return values.length>=2&&values.length<=4&&values.every(v=>v&&chars(v).length<=100)&&new Set(values).size===values.length&&
            (q.correct_index==null||q.correct_index>=0&&q.correct_index<values.length);
    }
    function valid(activity, maxDay) {
        if(!activity.enabled)return true;
        var steps=activity.steps||[], bonus=Number(activity.owner_bonus_bust||0), share=Number(activity.scenario_share_pct??100);
        return steps.length>=1&&steps.length<=12&&steps.filter(s=>s.require_proof).length<=5&&
            steps.every(step=>step.text.trim()&&Object.keys(limits).every(key=>chars(step[key]).length<=limits[key])&&validQuestion(step.question))&&
            lastDay(activity)<=(maxDay||14)&&Number.isInteger(bonus)&&bonus>=0&&bonus<=300&&
            (share===100||Number.isInteger(share)&&share>=5&&share<=95);
    }
    function opt(values,selected,label) {
        return values.map(v=>'<option value="'+e(v)+'"'+(v===selected?' selected':'')+'>'+e(label(v))+'</option>').join('');
    }
    function select(label,attributes,items) {
        return '<label>'+e(label)+'<select class="gtw-input" '+attributes+'>'+items+'</select></label>';
    }
    function settings(activity,maxDay) {
        var day=activity.open_day||1, n=iterations(activity), interval=activity.iterations_interval_days||1, allowed=maxDay||14;
        var lastOpen=Math.max(day,Math.min(14,allowed)), share=activity.scenario_share_pct??100;
        function setting(key,label,values,current,format){return select(t(label),'data-lse-setting="'+key+'"',opt(values,current,format));}
        return '<div class="lse-settings">'+
            setting('open_day','growthOpenDay',Array.from({length:lastOpen},(_,i)=>i+1),day,v=>'D'+v)+
            (day>1?setting('jitter_days','growthJitter',[0,1,2,3],activity.jitter_days||0,v=>v?'±'+v:'0'):'')+
            setting('iterations_count','lseIterations',[1,2,3,4],n,v=>v===1?t('lseOnce'):t('lseRepeat',{n:v}))+
            (n>1?setting('iterations_interval_days','lseInterval',Array.from({length:Math.max(interval,Math.floor((allowed-day)/(n-1)))},(_,i)=>i+1),
                interval,v=>t('lseEveryDays',{n:v})):'')+
            '<small'+(lastDay(activity)>allowed?' class="lse-error"':'')+'>'+e(t(lastDay(activity)>allowed?'lseOutsideRetention':'lseCalendar',
                {day:lastDay(activity),limit:allowed}))+'</small>'+
            setting('proof_mode','growthProofMode',['screenshot','video'],activity.proof_mode||'screenshot',v=>t(v==='video'?'growthVideo':'growthScreenshot'))+
            '<label class="lse-checkbox"><input type="checkbox" data-lse-setting="dose"'+(share<100?' checked':'')+'> '+e(t('growthDose'))+'</label>'+
            (share<100?'<div class="lse-dose"><div class="lse-options">'+[10,15,25,35,50].map(v=>'<button type="button" class="meta-chip" data-lse-dose="'+v+'">'+v+'%</button>').join('')+
                '</div><label>'+e(t('growthShare'))+'<input class="gtw-input" type="number" min="5" max="95" data-lse-setting="scenario_share_pct" value="'+e(share)+'"></label></div>':
                '<small>'+e(t('growthAllFlow'))+'</small>')+'</div>';
    }
    function questionEditor(step) {
        var q=step.question, key=' data-lse-key="'+step._key+'" data-lse-question="';
        return '<div class="lse-question"><label>'+e(t('lseQuestion'))+'<input class="gtw-input" maxlength="220"'+key+'prompt" value="'+e(q.prompt)+'"></label>'+
            select(t('lseAnswerType'),key+'kind"',opt(['text','choice'],q.kind,v=>t(v==='text'?'lseFreeText':'lseChoice')))+
            (q.kind==='choice'?q.options.map((v,i)=>'<label>'+e(t('lseChoiceNumber',{n:i+1}))+'<input class="gtw-input" maxlength="100"'+key+i+'" value="'+e(v)+'"></label>').join('')+
                '<div class="lse-options"><button type="button" class="meta-chip" data-lse-choice="add" data-lse-key="'+step._key+'"'+(q.options.length>=4?' disabled':'')+'>+ '+e(t('lseChoice'))+'</button>'+
                (q.options.length>2?'<button type="button" class="meta-chip" data-lse-choice="remove" data-lse-key="'+step._key+'">− '+e(t('lseChoice'))+'</button>':'')+'</div>'+
                select(t('lseCorrect'),key+'correct_index"',opt([''].concat(q.options.map((_,i)=>i)),q.correct_index??'',
                    v=>v===''?t('lseSurvey'):t('lseChoiceNumber',{n:v+1}))):'')+'</div>';
    }
    function stepHtml(step,index,count,proofCount) {
        var key=step._key, field=' data-lse-key="'+key+'" data-lse-field="', media=step.media?.asset, open=step._open||{};
        function chip(type,label,on,disabled){
            return '<button type="button" class="meta-chip" data-lse-option="'+type+'" data-lse-key="'+key+'" aria-pressed="'+!!on+'"'+
                (disabled?' disabled':'')+'>'+(on?'✓ ':'+ ')+e(label)+'</button>';
        }
        var showDesc=open.description??!!step.description, showCopy=open.quick_copy??!!step.quick_copy, showMedia=open.media??!!media;
        return '<article class="lse-step"><header><strong>'+e(t('lseStep',{n:index+1}))+'</strong>'+
            '<input class="gtw-input" maxlength="90" aria-label="'+e(t('lseText'))+'" placeholder="'+e(t('lseActionHint'))+'"'+field+'text" value="'+e(step.text)+'">'+
            '<button type="button" class="meta-chip" data-lse-remove="'+key+'" aria-label="'+e(t('lseRemove'))+'"'+(count===1?' disabled':'')+'>×</button></header>'+
            '<div class="lse-options">'+chip('description','📝 '+t('lseExplanation'),showDesc)+chip('quick_copy','📋 '+t('lseCopy'),showCopy)+chip('media','🖼️ '+t('lseSample'),showMedia)+
            chip('require_proof','📸 '+t('lseStepProof'),step.require_proof,proofCount>=5&&!step.require_proof)+chip('question','❓ '+t('lseQuestion'),step.question)+'</div>'+
            (showDesc?'<label>'+e(t('lseDescription'))+'<textarea class="gtw-textarea" maxlength="220"'+field+'description">'+e(step.description)+'</textarea></label>':'')+
            (showCopy?'<label>'+e(t('growthQuickCopy'))+'<input class="gtw-input" maxlength="100"'+field+'quick_copy" value="'+e(step.quick_copy)+'"></label>':'')+
            (showMedia?(media?'<div class="lse-media">'+(step.media.kind==='video'?'<video controls preload="none" src="'+e(media.url)+'"></video>':
                '<img src="'+e(media.url)+'" alt="'+e(t('lcwReference'))+'">')+'<button type="button" class="meta-chip" data-lse-media-remove="'+key+'">'+e(t('lseRemoveMedia'))+'</button></div>':'')+
                '<label class="meta-chip lse-upload">🖼️ / 🎬 '+e(t('lseAttach'))+'<input type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" data-lcw-file="step:'+key+'"></label>':'')+
            (step.question?questionEditor(step):'')+'</article>';
    }
    function body(activity,maxDay) {
        activity.economy_version=2;
        var steps=normalize(activity), proofs=steps.filter(step=>step.require_proof).length;
        return '<section class="lse-editor"><header><strong>'+e(t('growthScenario'))+'</strong><span data-lse-fee aria-live="polite">'+e(feeLabel(activity))+'</span></header>'+
            '<details class="lse-import"><summary>📋 '+e(t('lseImport'))+'</summary><textarea class="gtw-textarea" maxlength="5000" aria-label="'+e(t('lseImport'))+'" placeholder="'+e(t('lseImportHint'))+'" data-lse-import-text></textarea>'+
            '<button type="button" class="meta-chip" data-lse-import>'+e(t('lseImportAdd'))+'</button><small data-lse-import-error class="lse-error" role="alert"></small></details>'+
            '<div class="lse-meta-fields"><label>'+e(t('lrScenarioTitle'))+'<input class="gtw-input" data-lcw-input="scenarioTitle" maxlength="80" value="'+e(activity.title)+'"></label>'+
            '<label>'+e(t('lrScenarioLimit'))+'<input class="gtw-input" data-lcw-input="scenarioLimit" type="number" min="1" max="100000" placeholder="'+e(t('lrUnlimited'))+'" value="'+e(activity.execution_limit||'')+'"></label></div>'+
            steps.map((step,i)=>stepHtml(step,i,steps.length,proofs)).join('')+
            '<button type="button" class="lm-action" data-lse-add'+(steps.length>=12?' disabled':'')+'>'+e(t('lseAdd'))+'</button>'+settings(activity,maxDay)+
            '<div class="lse-bonus"><label>'+e(t('lseBonus'))+'<input class="gtw-input" type="number" min="0" max="300" inputmode="numeric" data-lse-setting="owner_bonus_bust" value="'+e(activity.owner_bonus_bust||0)+'"></label>'+
            '<div class="lse-options">'+[0,15,30,50].map(n=>'<button type="button" class="meta-chip" data-lse-bonus="'+n+'">'+(n?'+':'')+n+' $BUST</button>').join('')+
            '</div><small>'+e(t('lseBonusOnce'))+'</small><small data-lse-reward aria-live="polite"></small><small data-lse-suggestion></small>'+
            '<details class="lse-cost"><summary>'+e(t('lseCostDetails'))+'</summary><p data-lse-cost></p></details></div></section>';
    }
    function syncText(activity) {
        activity.instructions=activity.steps.map((s,i)=>(i+1)+'. '+s.text+(s.description?'\n'+s.description:'')).join('\n\n');
    }
    function refresh(activity,root) {
        var editor=root.querySelector('.lse-editor');
        if(!editor)return;
        var price=cost(activity);
        editor.querySelector('[data-lse-fee]').textContent=feeLabel(activity);
        editor.querySelector('[data-lse-reward]').textContent=t('lseReward',{n:price.total,artifacts:price.artifacts});
        editor.querySelector('[data-lse-cost]').textContent=t('lseQuotaBreakdown',{proofs:price.proofs,questions:price.questions,
            video:price.video?(window.lang==='ru'?'0,25':'0.25'):'0',rounds:price.rounds,
            quota:(price.quota/100).toLocaleString(window.lang==='ru'?'ru':'en',{minimumFractionDigits:2,maximumFractionDigits:2})});
        editor.querySelector('[data-lse-suggestion]').textContent=price.suggested?t('lseSuggested',{n:price.suggested}):'';
    }
    function input(activity,element) {
        var key=element.dataset.lseField, setting=element.dataset.lseSetting, question=element.dataset.lseQuestion;
        if(!key&&!setting&&question===undefined)return false;
        if(setting) {
            if(setting==='dose')activity.scenario_share_pct=element.checked?25:100;
            else {
                if(element.type==='number') {
                    var validNumber=element.value!==''&&Number.isInteger(Number(element.value))&&element.checkValidity();
                    element.setAttribute('aria-invalid',String(!validNumber));
                    if(!validNumber)return true;
                }
                activity[setting]=setting==='proof_mode'?element.value:Number(element.value);
            }
            if(setting==='proof_mode')activity.screenshot=element.value==='screenshot';
            return true;
        }
        var step=normalize(activity).find(item=>item._key===element.dataset.lseKey);
        if(!step)return false;
        if(question===undefined)step[key]=element.value;
        else if(question==='kind')step.question={kind:element.value,prompt:step.question.prompt,options:element.value==='choice'?['','']:[],correct_index:null};
        else if(question==='prompt')step.question.prompt=element.value;
        else if(question==='correct_index')step.question.correct_index=element.value===''?null:Number(element.value);
        else step.question.options[Number(question)]=element.value;
        syncText(activity);
        return true;
    }
    function click(activity,button,media) {
        var d=button.dataset;
        if(!['lseAdd','lseImport','lseDose','lseBonus','lseOption','lseChoice','lseRemove','lseMediaRemove'].some(name=>name in d))return false;
        var steps=normalize(activity), key=d.lseKey||d.lseRemove||d.lseMediaRemove;
        var step=steps.find(item=>item._key===key);
        if(d.lseAdd!==undefined) { if(steps.length<12)steps.push({text:''}); }
        else if(d.lseImport!==undefined) {
            var panel=button.closest('.lse-import'), imported=split(panel.querySelector('[data-lse-import-text]').value);
            var existing=steps.filter(s=>s.text.trim()||s.description||s.quick_copy||s.media||s.question||s.require_proof);
            if(!imported.length||existing.length+imported.length>12) {
                panel.querySelector('[data-lse-import-error]').textContent=t('lseImportLimit');
                return false;
            }
            activity.steps=existing.concat(imported);
        } else if(d.lseDose)activity.scenario_share_pct=Number(d.lseDose);
        else if(d.lseBonus!==undefined)activity.owner_bonus_bust=Number(d.lseBonus);
        else if(d.lseOption&&step) {
            var option=d.lseOption;
            if(option==='require_proof')step.require_proof=!step.require_proof;
            else if(option==='question')step.question=step.question?null:{prompt:'',kind:'text',options:[],correct_index:null};
            else {
                step._open=step._open||{};
                step._open[option]=!(step._open[option]??!!step[option]);
            }
        } else if(d.lseChoice&&step?.question) {
            if(d.lseChoice==='add'&&step.question.options.length<4)step.question.options.push('');
            else if(d.lseChoice==='remove'&&step.question.options.length>2) {
                step.question.options.pop();
                if(step.question.correct_index>=step.question.options.length)step.question.correct_index=null;
            }
        } else if(step) {
            media.remove('step:'+key);
            if(d.lseRemove)activity.steps=steps.filter(item=>item!==step);
            else step.media=null;
        } else return false;
        syncText(activity);
        return true;
    }
    function set(activity,key,value) {
        var step=normalize(activity).find(item=>'step:'+item._key===key);
        if(step)step.media={kind:String(value.type||'').startsWith('video/')?'video':'image',asset:value};
    }
    async function serialize(activity,save) {
        var out=[];
        for(var step of activity.steps||[]){
            if(!activity.enabled&&!step.text.trim())continue;
            out.push({text:step.text.trim(),description:(step.description||'').trim(),quick_copy:(step.quick_copy||'').trim(),
            require_proof:!!step.require_proof,question:!activity.enabled&&!validQuestion(step.question)?null:step.question||null,
            media:step.media?.asset?{kind:step.media.kind,asset:await save('step:'+step._key,step.media.asset)}:null});
        }
        return out;
    }
    function load(activity,asset) {
        (activity.enabled?normalize(activity):activity.steps||[]).forEach(function(step){
            if(!step._key)step._key='s'+(++sequence);
            if(!step.media?.asset)return;
            step.media.asset=asset(step.media.asset.asset_id);
            if(step.media.asset)step.media.asset.type=step.media.kind==='video'?'video/mp4':'image/png';
        });
    }
    window.LiveScenarioEditor={body:body,input:input,click:click,set:set,refresh:refresh,feeLabel:feeLabel,valid:valid,
        fee:activity=>cost(activity).quota,cost:cost,split:split,serialize:serialize,load:load};
})();
