/* Campaign orchestration; ProjectParameters owns the shared tiles and editors. */
(function () {
    'use strict';
    var states = new Map(), scopeSequence = 0;
    function tr(key, vars) { return window.t(key, vars || {}, typeof lang === 'undefined' ? 'en' : lang); }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function amount(value) { return Number(value || 0).toLocaleString(typeof lang !== 'undefined' && lang === 'ru' ? 'ru-RU' : 'en-US'); }
    function actor() { try { return window.getTelegramInitDataRaw(); } catch (_) { return ''; } }
    function uuid() {
        if (crypto.randomUUID) return crypto.randomUUID();
        var bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
        return Array.from(bytes, function (b, i) { return ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0'); }).join('');
    }
    function state(id) {
        var key = Number(id) + ':' + actor();
        if (!states.has(key)) states.set(key, { id:Number(id), actor:actor(), scope:++scopeSequence, project:null,
            rows:null, pending:new Set(), requests:new Map(), error:false, loaded:false, readAt:0, seq:0 });
        return states.get(key);
    }
    function current(s, id) { return s.actor === actor() && s.rows && s.rows.find(function (row) { return row.id === Number(id); }); }
    function endpoint(id, path) { return String(window.API_BASE || '/api').replace(/\/$/, '') + '/apps/' + Number(id) + '/campaigns' + (path || ''); }
    var errors = { insufficient_bust_balance:'lcBalanceLow', campaign_conflict:'lcConflict', campaign_price_changed:'lcConflict',
        pool_reserved:'lcReservedError', request_key_reused:'lcKeyError', not_owner:'lcNoAccess', app_not_found:'lcNoAccess', invalid_init_data:'lcNoAccess',
        slot_limit_reached:'lcSlotLimit', bridge_fixed_terms:'lcTermsFixed', campaign_budget_insufficient:'lcBudgetInsufficient', campaign_paused:'lcPausedError',
        campaign_screenshot_required:'lcScreenshotRequired', campaign_test_complete:'lcSessionClosed', bridge_requires_mutual_offer:'lcBridgeOffer',
        campaign_language_mismatch:'lcFilterMismatch', campaign_android_mismatch:'lcFilterMismatch' };
    function toastCode(code) { if (window.showToast) window.showToast(tr(errors[code] || 'lcFailed')); }
    async function parse(response) {
        var data = await response.json();
        if (!response.ok || data.status !== 'success') { var error = new Error(data.code || 'failed'); error.status = response.status; throw error; }
        return data;
    }
    function button(action, label, c, busy, classes, extra) {
        return '<button type="button" class="lc-action ' + (classes || '') + '" data-lc-action="' + action + '"' +
            (c ? ' data-campaign="' + Number(c.id) + '"' : '') + (busy ? ' disabled' : '') + ' ' + (extra || '') + '>' + esc(label) + '</button>';
    }
    function project(s) {
        var list = typeof myProjects !== 'undefined' ? myProjects : [];
        return list.find(function (p) { return Number(p.id || p.app_id) === s.id; }) || s.project || {};
    }
    function settings(c) {
        return { revision:c.revision, duration_days:14, install_source:'link', control_days:c.control_days,
            request_reviews:c.request_reviews, target_lang:c.target_lang, min_android_version:c.min_android_version,
            instructions:c.instructions || '', additional_reports:c.additional_reports || [] };
    }
    function controls(c, s) {
        return '<div class="pc-project-param pc-project-param--boost lc-checkpoints">' +
            '<span class="pc-project-param__label">' + ProjectParameters.icon('camera') + '<span>' + esc(tr('lcControlTitle')) + '</span></span>' +
            '<div class="lc-checkpoint-row">' + [1,4,7,10,14].map(function (day) {
                var selected = c.control_days.includes(day);
                return button('day', (selected ? '✓ ' : '') + tr(day === 1 ? 'lcFirstChip' : 'lcDayCompact', {n:day}), c,
                    day === 1 || s.pending.has(c.id), 'lc-checkpoint' + (selected ? ' is-selected' : ''),
                    'data-day="' + day + '" aria-pressed="' + selected + '" title="' + esc(tr(day === 1 ? 'lcDayOne' : 'lcDay', {n:day})) + '"');
            }).join('') + '</div><small class="lc-note">' + esc(tr('lcControlCost')) + '</small><small class="lc-note">' + esc(tr('lcFutureTerms')) + '</small></div>';
    }
    function parameters(c, s) {
        var ref = 'campaign-' + s.id + '-' + c.id;
        ProjectParameters.registerTarget(ref, {
            key:ref + ':scope-' + s.scope, appId:s.id, titleKey:'lcParams', reviewOnKey:'lcReviewOnCompact',
            hideActions:true, instructionsMax:5000,
            get:function () { var value=current(s,c.id); return value && Object.assign({},project(s),value,{id:s.id,test_mode:'google_group'}); },
            busy:function () { return s.pending.has(c.id); },
            save:function (field,value) { var row=current(s,c.id); if(!row)return false; var payload=settings(row);payload[field]=value;return mutate(s,row,'settings','PATCH',payload); },
            openBoost:function (event) { return window.openScreenshotBoostSettings(s.id,event); },
            onChange:function () { repaint(s); },
            extraHtml:function () { var row=current(s,c.id);return row ? controls(row,s) : ''; },
            activeCount:function (value) {
                var boost=value.screenshot_boost_campaign || {};
                return Number(value.request_reviews) + Number(value.target_lang !== 'ALL') + Number(value.min_android_version > 0) +
                    Number(!!String(value.instructions || '').trim()) + Number(boost.enabled && boost.pool_remaining >= boost.reward_bust && boost.reward_bust > 0);
            }
        });
        return ProjectParameters.buildTarget(ref);
    }
    function campaign(c,s) {
        var busy=s.pending.has(c.id), cost=Number(c.overlimit_cost || 0), covered=cost ? Math.floor(c.pool_available/cost) : null;
        return '<article class="card lc-campaign" data-campaign-id="' + Number(c.id) + '">' +
            '<header class="lc-campaign__head"><div><strong>🤝 ' + esc(c.kind==='closed_bridge' ? tr('lcBridge') : c.name || tr('lcCampaign')) +
            '</strong><small class="lc-note">' + esc(tr('lcBadge')) + '</small></div>' +
            button('status','● '+tr(c.status==='active'?'lcActive':'lcOff')+' ▾',c,busy,'lc-status'+(c.status==='active'?' is-on':''),'aria-haspopup="dialog"')+'</header>'+
            '<div class="lc-campaign__section"><div class="lc-slot-line"><span>'+esc(tr('lcSlots'))+'</span><strong>'+
            esc(tr('lcOccupied',{used:amount(c.free_occupied),total:c.total_slots}))+'</strong></div>'+
            '<small class="lc-note">'+esc(tr('lcFreeHint'))+'</small>'+
            (c.next_slot ? button('buy','+ '+tr('lcBuy',{n:c.next_slot,price:amount(c.next_slot_price)}),c,busy,'lc-buy') : '<small class="lc-note">'+esc(tr('lcMaxSlots'))+'</small>')+
            (c.paid_active ? '<small class="lc-note">'+esc(tr('lcPaidActive',{n:amount(c.paid_active)}))+'</small>' : '')+'</div>'+
            '<div class="lc-campaign__section lc-budget"><strong>'+esc(tr('lcOver',{price:amount(cost)}))+'</strong>'+
            '<div class="lc-pool-line"><span>'+esc(tr('lcPool'))+': <b>'+esc(amount(c.pool_available))+' $BUST</b> <small>'+
            esc(covered==null ? tr('lcNoCost') : tr('lcPoolTesters',{n:amount(covered)}))+'</small></span>'+
            button('pool',tr('lcTopup'),c,busy,'lc-link','aria-haspopup="dialog"')+'</div>'+
            (c.allow_wallet_spending ? '<span class="lc-wallet-badge">✓ '+esc(tr('lcWalletEnabled'))+'</span>' : '')+
            (c.reserved_bust ? '<small class="lc-note">'+esc(tr('lcReserved',{n:amount(c.reserved_bust)}))+'</small>' : '')+'</div>'+
            parameters(c,s)+'</article>';
    }
    function content(s) {
        var rows=s.rows || [], active=rows.filter(function(c){return c.status==='active';});
        var visible=rows.filter(function(c){return c.kind==='closed_bridge'||c.status==='active';});
        var paused=rows.filter(function(c){return c.kind!=='closed_bridge'&&c.status!=='active';});
        return '<div class="lc-section-head"><h3>'+esc(tr('lcTitle'))+'</h3><small>'+esc(s.rows ? tr('lcActiveCount',{n:active.length}) : '—')+'</small>'+
            button('create','+',null,false,'lc-create','aria-label="'+esc(tr('lcCreate'))+'"')+'</div>'+
            (s.error ? '<p class="lc-error" role="alert">'+esc(tr('lcError'))+' '+button('retry',tr('lcRetry'))+'</p>' : '')+
            (!s.rows ? '<p class="lc-note" role="status">'+esc(tr('lcLoading'))+'</p>' : visible.map(function(c){return campaign(c,s);}).join('')+
                (paused.length ? '<details class="lc-paused"><summary>'+esc(tr('lcPaused',{n:paused.length}))+'</summary>'+paused.map(function(c){return campaign(c,s);}).join('')+'</details>' : ''));
    }
    function build(p) { var s=state(p.id||p.app_id);s.project=p;return '<section class="lc-section" data-live-campaigns="'+s.id+'">'+content(s)+'</section>'; }
    function repaint(s) {
        if(s.actor!==actor())return;
        var panel=document.querySelector('[data-live-campaigns="'+s.id+'"]');if(!panel)return;
        var focus=panel.contains(document.activeElement)?document.activeElement:null;
        var selector=focus && focus.dataset.projectParam ? '[data-campaign-id="'+focus.closest('[data-campaign-id]').dataset.campaignId+'"] [data-project-param="'+focus.dataset.projectParam+'"]' : null;
        var pausedOpen=panel.querySelector('.lc-paused[open]');panel.innerHTML=content(s);
        if(pausedOpen && panel.querySelector('.lc-paused'))panel.querySelector('.lc-paused').open=true;
        if(selector){var next=panel.querySelector(selector);if(next&&!next.disabled)next.focus({preventScroll:true});}
    }
    async function read(s) {
        if(s.pending.size)return;
        var seq=++s.seq;if(s.controller)s.controller.abort();var controller=s.controller=new AbortController();
        try {
            var data=await parse(await fetch(endpoint(s.id)+'?init_data='+encodeURIComponent(s.actor),{cache:'no-store',signal:controller.signal}));
            if(seq!==s.seq||s.actor!==actor())return;
            s.rows=data.campaigns;s.error=false;s.loaded=true;s.readAt=Date.now();
        } catch(error) {
            if(error.name==='AbortError'||seq!==s.seq)return;
            s.error=true;if([401,403,404].includes(error.status)){s.rows=null;s.loaded=false;}
        } finally {if(s.controller===controller)s.controller=null;if(seq===s.seq)repaint(s);}
    }
    async function mutate(s,c,path,method,data,financial) {
        if(s.pending.has(c.id)||s.actor!==actor())return false;
        var key=JSON.stringify([c.id,path,data]),request=s.requests.get(key);
        if(financial&&!request){request=uuid();s.requests.set(key,request);}
        s.pending.add(c.id);++s.seq;if(s.controller){s.controller.abort();s.controller=null;}repaint(s);
        try {
            var response=await parse(await fetch(endpoint(s.id,'/'+c.id+'/'+path),{method:method,headers:{'Content-Type':'application/json'},
                body:JSON.stringify(Object.assign({init_data:s.actor},data,financial?{request_key:request}:{}))}));
            if(s.actor!==actor())return false;
            s.rows=s.rows.map(function(row){return row.id===c.id?response.campaign:row;});s.error=false;s.requests.delete(key);s.readAt=Date.now();
            if(typeof visibilityStats!=='undefined'&&visibilityStats&&Number.isFinite(response.campaign.wallet_balance))visibilityStats.balance_bust=response.campaign.wallet_balance;
            window.dispatchEvent(new CustomEvent('live-campaigns:changed',{detail:{appId:s.id,campaignId:c.id}}));return true;
        } catch(error) {
            toastCode(error.message);if([401,403,404].includes(error.status)){s.rows=null;s.loaded=false;}
            if(error.status===409){s.pending.delete(c.id);await read(s);}return false;
        } finally {s.pending.delete(c.id);repaint(s);}
    }
    async function confirmBuy(message) { return new Promise(function(resolve){if(window.tg&&window.tg.showConfirm)window.tg.showConfirm(message,resolve);else resolve(window.confirm(message));}); }
    function mount(card,p) {
        if(p.phase!=='live')return;
        var s=state(p.id||p.app_id);s.project=p;var panel=card.querySelector('[data-live-campaigns]');if(!panel)return;
        panel.onclick=async function(event) {
            var control=event.target.closest('[data-lc-action]');if(!control)return;
            event.stopPropagation();var action=control.dataset.lcAction,c=current(s,control.dataset.campaign);
            if(action==='create'){window.dispatchEvent(new CustomEvent('live-campaign:create',{detail:{appId:s.id}}));if(window.showToast)window.showToast(tr('lcSoon'));return;}
            if(action==='retry')return read(s);
            if(!c||s.pending.has(c.id))return;
            if(action==='status')return window.LiveCampaignWallet.openStatus({get:function(){return current(s,c.id);},change:function(value){var row=current(s,c.id);return row&&mutate(s,row,'status','PATCH',{revision:row.revision,status:value});}},control);
            if(action==='buy'){if(await confirmBuy(tr('lcBuyConfirm',{price:amount(c.next_slot_price)})))return mutate(s,c,'buy-slot','POST',{expected_slot:c.next_slot,expected_price:c.next_slot_price},true);return;}
            if(action==='pool')return window.LiveCampaignWallet.open({get:function(){return current(s,c.id);},change:function(data){var row=current(s,c.id);return row&&mutate(s,row,'pool','POST',data,true);}},control);
            if(action==='day') {
                var day=Number(control.dataset.day);if(day===1||![4,7,10,14].includes(day))return;
                var days=new Set(c.control_days);if(days.has(day))days.delete(day);else days.add(day);
                var payload=settings(c);payload.control_days=Array.from(days).sort(function(a,b){return a-b;});return mutate(s,c,'settings','PATCH',payload);
            }
        };
        if(!s.controller&&(!s.loaded||Date.now()-s.readAt>30000))read(s);else repaint(s);
    }

 function marketBadges(item){if(!item.live_bridge)return '';var days=item.live_bridge.control_days||[1,4,7,10,14];return '<button type="button" class="meta-chip lc-market-live" data-lc-hint="live">Live</button>'+(days.length<5?'<button type="button" class="meta-chip lc-market-days" data-lc-hint="days" data-days="'+days.join(' · ')+'">📸 '+days.join(' · ')+'</button>':'');}
 document.addEventListener('click',function(event){var target=event.target.closest('[data-lc-hint]');if(!target)return;event.stopPropagation();if(window.showToast)window.showToast(tr(target.dataset.lcHint==='live'?'lcLiveHint':'lcDaysHint',{days:target.dataset.days||''}));});
 function normalActions(test,day) {
    var id=Number(test.id||test.app_id),user=esc(String(test.owner_username||'').replace(/[^A-Za-z0-9_]/g,''));
    if(day>14)return '<p class="lc-note">'+esc(tr('lcComplete'))+'</p><button type="button" class="btn" onclick="openCheckinOptionsModal('+id+',\''+user+'\')">📎 '+esc(tr('checkinOptionsTitle'))+'</button>';
    var offer=typeof getScreenshotBoostOffer==='function'?getScreenshotBoostOffer(test,day):null;
    var clip=typeof getScreenshotBoostPaperclipContent==='function'&&typeof myTests!=='undefined'?getScreenshotBoostPaperclipContent(id):'📎';
    return '<div class="action-row"><div class="split-btn-group" style="width:100%"><button id="btn-confirm-'+id+'" class="btn btn-success split-btn-main" onclick="confirmStart('+id+', {})">'+esc(tr('lcConfirm'))+'</button><button class="btn btn-success split-btn-options'+(offer?' has-screenshot-boost':'')+'" onclick="openCheckinOptionsModal('+id+',\''+user+'\')" aria-label="'+esc(tr('checkinOptionsTitle'))+'">'+clip+'</button></div></div>';
 }
 function reports(test){var values=test.live_bridge&&test.live_bridge.additional_reports||[];return values.length?'<details class="lc-report-tasks"><summary>'+esc(tr('lcReportsTask'))+'</summary><ul>'+values.map(function(v){return '<li>'+esc(v)+'</li>';}).join('')+'</ul></details>':'';}

 window.LiveCampaigns={build:build,mount:mount,toastCode:toastCode,marketBadges:marketBadges,normalActions:normalActions,reports:reports,isControl:function(test,day){return !!(test&&test.live_bridge&&(test.live_bridge.control_days||[]).includes(Number(day)));}};
})();
