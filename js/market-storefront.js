/* Unified store presentation. Admissions remain in the established Live/Closed/Guest handlers. */
(function () {
    'use strict';
    var U = window.LiveMarketUI, data = null, root = null, frame = 0, searchTimer;
    var view = {section:'all', search:'', content:'', country:'', reviews:false, instant:false, scenario:false, source:'', term:'', league:''};
    var radarOpen = false, actor = '', contributionKeys = ['bugs_count','ideas_count','play_reviews_count','five_screens_count','text_reports_count','video_reports_count'];
    function t(key,vars) { return window.t(key,vars||{},window.lang||'ru'); }
    function e(value) { return window.escapeHTML(String(value==null?'':value)); }
    function money(value) { return U.n(value,0); }
    function array(name) { return Array.isArray(window[name])?window[name]:[]; }
    function id(row) { return Number(row.app_id||row.id)||0; }
    function owner(row) { return row.owner_public||{reliability_index:row.owner_reliability_index,karma:row.owner_karma,contribution_score:row.owner_contribution_score}; }
    function activity(row,short) {
        var a=row.owner_activity,stamp=row.last_seen_at||row.last_owner_activity;
        if(!a&&stamp){var hours=Math.max(0,(Date.now()-Date.parse(stamp))/3600000);if(Number.isFinite(hours))a={status:hours<5?'online':hours<24?'today':hours<48?'yesterday':'away',hours_ago:hours};}
        if(!a||a.hours_ago==null)return '<span class="mk-online is-unknown">'+e(t('mkUnknownActivity'))+'</span>';
        var text=t(a.status==='online'?'mkOnline':a.status==='yesterday'?'mkYesterday':a.status==='away'?'mkDaysAgo':'mkHoursAgo',{n:Math.max(1,Math.floor(a.hours_ago/(a.status==='away'?24:1)))});
        return '<span class="mk-online is-'+e(a.status)+'" title="'+e(text)+'"><i aria-hidden="true"></i>'+e(short&&a.status==='today'?t('mkHoursShort',{n:Math.floor(a.hours_ago)}):text)+'</span>';
    }
    function contribution(row) {
        var o=owner(row);
        return '<details class="mk-contribution"><summary>⚡ '+e(t('mkContribution',{n:money(o.contribution_score||0)}))+'</summary><div>'+contributionKeys.map(function(key,i){return '<span>'+e(t('mkContribution'+i))+': <b>'+e(money(o[key]||0))+'</b></span>';}).join('')+'</div></details>';
    }
    function metadata(row) {
        var p=row.passport||{},category=String(row.category||''),knownType=['APP','GAME'].includes(category.toUpperCase()),type=p.content_type||(knownType?(category.toUpperCase()==='GAME'?'game':'app'):'');
        return [type?t(type==='game'?'mkGames':'mkApps'):'',p.category||(!knownType?category:''),p.subcategory||row.subcategory,p.app_size_text||row.app_size_text].filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(' · ');
    }
    function offers(row) {
        if(row.offers)return row.offers;
        return [{source:'link',duration_days:14,offer_type:row._kind==='bounty'?'contract':'exchange',instant_install:row.can_join_directly===true,reviews_available:!!row.request_reviews,scenario_enabled:!!row.instructions}];
    }
    function available(row) {
        if(row.own||row.is_own_project)return false;
        if(row.showcase_read_only||row.blocked_by_me||row.blocked_by_owner||row.has_access_issue)return false;
        if(!row.offers&&typeof window.getStoredAndroidMajorVersion==='function'&&Number(row.min_android_version)>getStoredAndroidMajorVersion())return false;
        if(!row.offers&&typeof window.getMutualFeedJoinUnavailableLabel==='function'&&row._kind!=='guest'&&getMutualFeedJoinUnavailableLabel(row))return false;
        return row.offers?row.offers.some(function(o){return o.available!==false&&(o.ready||o.request_queue||o.instant_install);}):!row.is_own_project;
    }
    function visible(row) {
        var p=row.passport||{},text=[row.name,p.title,p.category,p.subcategory].join(' ').toLocaleLowerCase();
        if(view.search&&!text.includes(view.search.toLocaleLowerCase()))return false;
        var content=p.content_type||((row.category||'').toUpperCase()==='GAME'?'game':(row.category||'').toUpperCase()==='APP'?'app':'');
        if(view.content&&content!==view.content)return false;
        if(view.country&&!offers(row).some(function(o){return !o.country||o.country===view.country;}))return false;
        if(view.reviews&&!offers(row).some(function(o){return o.reviews_available;}))return false;
        if(view.instant&&!offers(row).some(function(o){return o.instant_install;}))return false;
        if(view.scenario&&!offers(row).some(function(o){return o.scenario_enabled;})&&!row.instructions)return false;
        if(view.source&&!offers(row).some(function(o){return (o.allowed_sources||[o.source]).includes(view.source);} ))return false;
        if(view.term&&!offers(row).some(function(o){var min=o.min_days||o.duration_days,max=o.max_days||o.duration_days;return view.term==='28+'?max>=28:min<=Number(view.term)&&max>=Number(view.term);} ))return false;
        return true;
    }
    function allRows() {
        var rows=[],seen=new Set();
        function add(values,kind){(values||[]).forEach(function(item){var ident=kind==='guest'?String(item.id||item.package_name||''):id(item),key=(kind==='guest'?'guest:':'app:')+ident;if(!ident)return;var row=Object.assign({},item,{_kind:kind,_key:key});if(seen.has(key)){
            var prior=rows.find(function(x){return x._key===key;});if(kind==='bounty'){prior._contract=item;prior._hasContract=true;}if(kind==='returns')prior._return=true;return;}
            seen.add(key);if(kind==='bounty')row._hasContract=true;if(kind==='returns')row._return=true;rows.push(row);});}
        add(data?data.ranking:[],'live');add(data?data.queue:[],'live');
        var clean=typeof window._showcaseAvailableFeedItems==='function'?window._showcaseAvailableFeedItems:function(x){return x||[];};
        add(clean(array('mutualReturns')),'returns');add(clean(array('mutualSeeking')),'mutual-seeking');add(clean(array('bountyContracts')),'bounty');add(clean(array('mutualPrelaunch')),'mutual-prelaunch');add(array('guestProjects'),'guest');add(array('mutualIsolated'),'isolated');
        return rows.filter(visible);
    }
    function sourceText(source) {return t({keywords:'lmKeywords',key:'lmKeywords',web:'lmWeb',browser:'lmWeb',link:'lmLink'}[source]||'lmLink');}
    function card(row) {
        var p=row.passport||{},o=owner(row),sc=row.scoring||{},tasks=offers(row),tier=sc.tier;
        var icon=U.safeImage?U.safeImage(row.icon_url||p.icon_url):/^https:\/\//.test(row.icon_url||p.icon_url||'');
        var chosen=data&&((data.radar||[]).find(function(p){return Number(p.app_id)===Number(data.radarId);})||(data.radar||[])[0]),priority=row.own&&chosen&&id(chosen)===id(row);
        var tags=[];if(row.own)tags.push(t(priority?'lmPriorityOwn':'lmOwnRank',{rank:row.rank}));
        if(available(row))tags.push(t(tasks.some(function(x){return x.instant_install;})?'mkInstant':'mkSuitable'));
        var task=tasks[0];if(task)tags.push(sourceText(task.source)+' · D'+(task.min_days&&task.min_days!==task.max_days?task.min_days+'–'+task.max_days:task.duration_days||14));
        var contract=tasks.find(function(x){return x.offer_type==='contract';});if(contract||row._hasContract){var reward=contract&&(contract.reward_min||contract.reward_bust)||row.bounty_per_tester||row._contract&&row._contract.bounty_per_tester,max=contract&&contract.reward_max;tags.push('💎 '+(reward?money(reward)+(max&&max!==reward?'–'+money(max):'')+' $BUST':t('lmContracts')));if(contract&&contract.schemaVersion===6)tags.push(t('mkStartBuffer'));}
        if(tasks.some(function(x){return x.reviews_available;}))tags.push(t('mkReviewTag'));
        if(row.instructions||tasks.some(function(x){return x.scenario_enabled;}))tags.push(t('mkScenario'));
        var geo=tasks.map(function(x){return x.country;}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(', ');
        return '<button type="button" class="mk-card'+(row.own?' is-own':'')+(priority?' is-priority':'')+(!available(row)?' is-unavailable':'')+'" data-mk-project="'+e(row._key)+'"><span class="mk-app-icon">'+(icon?'<img src="'+e(row.icon_url||p.icon_url)+'" loading="lazy" referrerpolicy="no-referrer" alt="">':'📱')+'<small>'+e(tier?'T'+tier:row._kind==='guest'?'👽':'🧪')+'</small></span><span class="mk-card-copy"><strong class="notranslate">'+e(row.name||p.title||row.package_name||t('lmProject'))+'</strong><span class="mk-owner-mini">'+activity(row,true)+'<span>🛡 '+e(o.reliability_index==null?'—':money(o.reliability_index)+'%')+'</span><span>⚡ '+e(money(o.contribution_score||0))+'</span><span>'+e(t('mkKarma',{n:o.karma==null?'—':U.n(o.karma)}))+'</span>'+(row.rank?'<span>#'+e(row.rank)+'</span>':'')+'</span>'+(metadata(row)||geo?'<small class="mk-meta">'+e([metadata(row),geo].filter(Boolean).join(' · '))+'</small>':'')+'<span class="mk-tags">'+tags.slice(0,6).map(function(tag){return '<i>'+e(tag)+'</i>';}).join('')+'</span></span></button>';
    }
    function pages(rows) {var html='',size=matchMedia('(min-width:760px)').matches?6:3;for(var i=0;i<rows.length;i+=size)html+='<div class="mk-page">'+rows.slice(i,i+size).map(card).join('')+'</div>';return html;}
    function shelf(key,rows,title) {
        if(!rows.length&&key==='returns')return '';
        var total=rows.length;
        if(data&&data.sectionTotals&&data.sectionTotals[key]!=null)total=Math.max(total,data.sectionTotals[key]+rows.filter(function(r){return r._kind!=='live';}).length);
        else if(data&&key==='live'&&!view.search&&!view.league)total=Math.max(total,data.totals.ranking||0);
        return '<section class="mk-shelf" data-mk-shelf="'+key+'"><header><h2>'+e(t(title))+'</h2><button type="button" data-mk-all="'+key+'">'+e(t('mkSeeAll',{n:total}))+' ›</button></header>'+(key==='live'?leagueTabs():'')+'<div class="mk-carousel" tabindex="0" aria-label="'+e(t(title))+'">'+(rows.length?pages(rows):'<p class="mk-empty">'+e(t('mkNoResults'))+'</p>')+'</div></section>';
    }
    function leagueTabs(){return '<div class="mk-leagues">'+[['','mkAll'],['leaders','mkLeaders'],['flow','mkFlow'],['start','mkStart']].map(function(v){return '<button type="button" data-mk-league="'+v[0]+'" aria-pressed="'+(view.league===v[0])+'">'+e(t(v[1]))+'</button>';}).join('')+'</div>';}
    function select(name,options){return '<select data-mk-filter="'+name+'" aria-label="'+e(t('mkFilter'+name))+'">'+options.map(function(v){return '<option value="'+e(v[0])+'"'+(String(view[name])===String(v[0])?' selected':'')+'>'+e(t(v[1]))+'</option>';}).join('')+'</select>';}
    function controls() {
        return '<div class="mk-controls"><div class="mk-main-filters"><label class="mk-search"><span aria-hidden="true">⌕</span><input type="search" maxlength="100" data-mk-search value="'+e(view.search)+'" placeholder="'+e(t('mkSearch'))+'" aria-label="'+e(t('mkSearch'))+'"></label><div class="mk-sections" role="group" aria-label="'+e(t('mkSections'))+'">'+[['all','mkAllSections'],['recommended','mkRecommended'],['contracts','mkContracts'],['live','mkLive'],['sandbox','mkSandbox']].map(function(v){return '<button type="button" data-mk-section="'+v[0]+'" aria-pressed="'+(view.section===v[0])+'">'+e(t(v[1]))+'</button>';}).join('')+'</div></div><div class="mk-subfilters">'+select('content',[['','mkAllContent'],['app','mkApps'],['game','mkGames']])+'<button type="button" data-mk-geo>🌍 '+e(view.country||t('mkAllGeo'))+'</button>'+['reviews','instant','scenario'].map(function(k){return '<button type="button" data-mk-toggle="'+k+'" aria-pressed="'+!!view[k]+'">'+e(t({reviews:'mkReviewTag',instant:'mkInstant',scenario:'mkScenario'}[k]))+'</button>';}).join('')+select('source',[['','lmSource'],['link','lmLink'],['web','lmWeb'],['keywords','lmKeywords']])+select('term',[['','lmTerm'],[7,'mkD7'],[14,'mkD14'],[21,'mkD21'],['28+','mkD28']])+'</div></div>';
    }
    function update(node,snapshot) {
        root=node;data=snapshot;
        var who=U.auth();if(actor!==who){actor=who;radarOpen=false;view={section:'all',search:'',content:'',country:'',reviews:false,instant:false,scenario:false,source:'',term:'',league:''};}
        var radar=root.querySelector('.lm-radar');
        if(radar){var chosen=(data.radar||[]).find(function(r){return Number(r.app_id)===Number(data.radarId);})||(data.radar||[])[0],capsule=document.createElement('details');capsule.className='mk-radar-capsule';capsule.open=radarOpen;
            capsule.innerHTML='<summary><span class="mk-radar-symbol">◎</span><span><strong>'+e(t('lmRadar'))+(chosen?': '+e(chosen.name):'')+'</strong><small>'+e(chosen?'Tier '+(chosen.scoring.tier||'—')+' · #'+chosen.rank+' / '+chosen.out_of+' · '+money(chosen.scoring.market_score)+'/1000':t('lmNoLiveRadar'))+'</small></span><span class="mk-radar-next">'+e(chosen&&chosen.next_rank_score!=null?t('mkNextRank',{n:chosen.rank-1,diff:money(chosen.points_to_next_rank)}):'')+'</span><i aria-hidden="true">⌄</i></summary>';
            radar.replaceWith(capsule);capsule.appendChild(radar);capsule.addEventListener('toggle',function(){radarOpen=capsule.open;});}
        root.classList.add('mk-enabled');
        var host=document.createElement('div');host.id='market-storefront';root.appendChild(host);paint();
        document.querySelectorAll('[data-market-radar]').forEach(function(b){var r=(data.radar||[]).find(function(row){return Number(row.app_id)===Number(b.dataset.marketRadar);});if(r)b.textContent=t('mkRadarBadge',{tier:r.scoring.tier||'—',rank:r.rank});});
    }
    function paint() {
        if(!root)return;var host=root.querySelector('#market-storefront');if(!host)return;
        var active=document.activeElement,searchFocused=active&&active.hasAttribute('data-mk-search'),cursor=searchFocused?active.selectionStart:null;
        var rows=allRows(),groups={returns:rows.filter(function(p){return p._return;}),recommended:rows.filter(function(p){return available(p)&&!p.own&&!p.is_own_project;}),contracts:rows.filter(function(p){return !p.own&&!p.is_own_project&&(p._hasContract||offers(p).some(function(o){return o.offer_type==='contract';}));}),live:rows.filter(function(p){return p._kind==='live';}),sandbox:rows.filter(function(p){return p._kind!=='live';})};
        var priority=new Map((data&&data.queue||[]).map(function(p,i){return [id(p),i];}));groups.recommended.sort(function(a,b){return (priority.has(id(a))?priority.get(id(a)):100000)-(priority.has(id(b))?priority.get(id(b)):100000);});
        if(view.league)groups.live=groups.live.filter(function(p){var tier=p.scoring&&p.scoring.tier;return view.league==='leaders'?tier<=2:view.league==='flow'?tier===3:tier>=4;});
        host.innerHTML='<header class="mk-title"><h1>'+e(t('tabMarket'))+'</h1><button type="button" class="lm-icon" data-lm-model aria-label="'+e(t('lmModelInfo'))+'">ⓘ</button><button type="button" class="lm-icon" data-lm-refresh aria-label="'+e(t('lmRefresh'))+'">↻</button></header>'+controls()+(view.section==='all'?shelf('returns',groups.returns,'mkReturns')+shelf('recommended',groups.recommended,'mkRecommended')+shelf('contracts',groups.contracts,'mkEarn')+shelf('live',groups.live,'mkLive')+shelf('sandbox',groups.sandbox,'mkSandbox'):'<section class="mk-full-list"><h2>'+e(t({recommended:'mkRecommended',contracts:'mkEarn',live:'mkLive',sandbox:'mkSandbox',returns:'mkReturns'}[view.section]))+'</h2>'+(view.section==='live'?leagueTabs():'')+(groups[view.section]||[]).map(card).join('')+(!(groups[view.section]||[]).length?'<p class="mk-empty">'+e(t('mkNoResults'))+'</p>':'')+'</section>')+(data&&data.error?'<p role="alert" class="lm-error">'+e(t('lmError'))+'</p>':'')+(data&&data.loading?'<p role="status" class="mk-empty">'+e(t('lmLoading'))+'</p>':'')+(data&&Math.max(data.totals.ranking||0,data.totals.queue||0)>data.offset?'<button type="button" class="lm-action" data-mk-more>'+e(t('lmMore'))+'</button>':'');
        if(searchFocused){var input=host.querySelector('[data-mk-search]');input.focus({preventScroll:true});if(cursor!=null)input.setSelectionRange(cursor,cursor);}
    }
    function refreshQuery(){var pending;if(window.LiveMarket&&LiveMarket.filter)pending=LiveMarket.filter({source:view.source,term:view.term,country:view.country,instant:view.instant,reviews:view.reviews,contracts:view.section==='contracts',search:view.search,content:view.content,scenario:view.scenario,league:view.league});paint();return pending;}
    function about(row) {
        var p=row.passport||{},o=owner(row),url=row.package_name?'https://play.google.com/store/apps/details?id='+encodeURIComponent(row.package_name):null;
        return '<section class="mk-passport"><div class="mk-passport-heading">'+(/^https:\/\//.test(row.icon_url||'')?'<img src="'+e(row.icon_url)+'" alt="" referrerpolicy="no-referrer">':'')+'<strong class="notranslate">'+e(row.name||p.title)+'</strong></div><div class="mk-passport-owner">'+e(o.username?'@'+o.username:row.owner_username?'@'+row.owner_username:o.full_name||row.owner_full_name||'')+' '+activity(row,false)+'<span>🛡 '+e(o.reliability_index==null?'—':money(o.reliability_index)+'%')+'</span></div>'+contribution(row)+(url?'<a class="lm-action" href="'+e(url)+'" target="_blank" rel="noopener noreferrer">'+e(t('mkOpenPlay'))+' ↗</a>':'')+'<div class="mk-passport-stats"><span>'+e(metadata(row)||t('mkMetadataUnknown'))+'</span><span>'+e(row.scoring?'Tier '+(row.scoring.tier||'—'):t('mkClosedTest'))+'</span><span>'+e(p.rating!=null?U.n(p.rating)+' ★'+(p.ratings!=null?' · '+money(p.ratings):''):t('mkNoStoreRating'))+'</span></div><div class="mk-gallery">'+(p.screenshots_preview||[]).filter(function(src){return /^https:\/\//.test(src);}).map(function(src){return '<img src="'+e(src)+'" alt="'+e(t('mkStoreScreenshot'))+'" loading="lazy" referrerpolicy="no-referrer">';}).join('')+'</div>'+(p.description?'<details><summary>'+e(t('mkDescription'))+'</summary><p class="mk-description">'+e(p.description)+'</p></details>':'')+'</section>';
    }
    function open(key) {
        var row=allRows().find(function(p){return p._key===key;});if(!row)return;
        if(row._kind==='live'){LiveMarket.open(id(row));return;}
        var body=about(row),kind=row._kind==='bounty'?'bounty':row._kind==='mutual-prelaunch'?'mutual-prelaunch':'mutual-seeking';
        if(row._kind==='guest'&&typeof window.renderGuestProjectCard==='function')body+=renderGuestProjectCard(row);
        else if(typeof window.renderFeedCard==='function')body+=renderFeedCard(row._contract&&view.section==='contracts'?row._contract:row,row._contract&&view.section==='contracts'?'bounty':kind);
        var layer=U.sheet(t('mkAbout'),body);
        // Hand off before an original inline handler opens its legacy modal.
        // Keeping the About sheet would cover that modal with a higher z-index.
        layer.addEventListener('click',function(ev){var action=ev.target.closest('.market-card button[onclick]');if(action&&!action.disabled)U.close(layer);},true);
    }
    function show(section){view.section=section;return refreshQuery();}
    document.addEventListener('click',function(ev){var b=ev.target.closest('[data-mk-section],[data-mk-all],[data-mk-toggle],[data-mk-league],[data-mk-geo],[data-mk-project],[data-market-radar],[data-mk-more]');if(!b)return;
        if(b.hasAttribute('data-market-radar')){ev.preventDefault();LiveMarket.openRadar(Number(b.dataset.marketRadar));return;}
        if(b.hasAttribute('data-mk-project'))return open(b.dataset.mkProject);
        if(b.hasAttribute('data-mk-section'))return show(b.dataset.mkSection);
        if(b.hasAttribute('data-mk-all'))return show(b.dataset.mkAll);
        if(b.hasAttribute('data-mk-more'))return LiveMarket.more();
        if(b.hasAttribute('data-mk-league')){view.league=b.dataset.mkLeague;refreshQuery();return;}
        if(b.hasAttribute('data-mk-toggle')){view[b.dataset.mkToggle]=!view[b.dataset.mkToggle];refreshQuery();return;}
        if(b.hasAttribute('data-mk-geo')&&window.ShowcaseGeo)ShowcaseGeo.openPicker({value:view.country,titleKey:'lmGeo',anyKey:'lmAll',onChoose:function(code){view.country=code||'';refreshQuery();}});
    });
    document.addEventListener('input',function(ev){if(ev.target.hasAttribute('data-mk-search')){view.search=ev.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(refreshQuery,300);}});
    document.addEventListener('change',function(ev){if(ev.target.dataset.mkFilter){view[ev.target.dataset.mkFilter]=ev.target.value;refreshQuery();}});
    document.addEventListener('DOMContentLoaded',function(){var sources=document.getElementById('live-market-legacy');if(sources){var observer=new MutationObserver(function(){if(frame)return;frame=requestAnimationFrame(function(){frame=0;paint();});});observer.observe(sources,{childList:true,subtree:true});}});
    window.MarketStorefront={update:update,about:about,show:show,showGuests:async function(){await show('sandbox');var guest=root&&root.querySelector('[data-mk-project^="guest:"]');if(guest)guest.scrollIntoView({block:'center',behavior:'smooth'});},selectTier:function(tier){view.section='live';view.league='';},openRadar:function(){radarOpen=true;var details=root&&root.querySelector('.mk-radar-capsule');if(details){details.open=true;details.scrollIntoView({block:'start',behavior:'smooth'});}}};
})();
