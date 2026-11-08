/* Unified store presentation. Admissions remain in the established Live/Closed/Guest handlers. */
(function () {
    'use strict';
    var U = window.LiveMarketUI, data = null, root = null, frame = 0, searchTimer;
    var view = {section:'all', search:'', content:'', country:'', reviews:false, instant:false, scenario:false, source:'', term:'', league:'', tier:''};
    var author = {reliability:'', karma:'', contribution:'', activity:''};
    var inactiveFilter='',inactiveOpen=false,radarOpen=false,actor='',condensed=false,searchOpen=false,contributionKeys=['bugs_count','ideas_count','play_reviews_count','five_screens_count','text_reports_count','video_reports_count'];
    var CHEV='<svg class="mk-chevron" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5L6 8L9.5 4.5"/></svg>';
    function t(key,vars) { return window.t(key,vars||{},window.lang||'ru'); }
    function e(value) { return window.escapeHTML(String(value==null?'':value)); }
    function money(value) { return U.n(value,0); }
    function array(name) { return Array.isArray(window[name])?window[name]:[]; }
    function id(row) { return Number(row.app_id||row.id)||0; }
    function publishedLive(item){return String(item.phase||item.app_phase||'').toLowerCase()==='live'||!!item.live_activated_at||!!item.live_bridge;}
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
        if(view.tier&&row._kind==='live'&&Number(row.scoring&&row.scoring.tier)!==Number(view.tier))return false;
        if(view.search&&!text.includes(view.search.toLocaleLowerCase()))return false;
        var content=p.content_type||((row.category||'').toUpperCase()==='GAME'?'game':(row.category||'').toUpperCase()==='APP'?'app':'');
        if(view.content&&content!==view.content)return false;
        if(view.country&&!offers(row).some(function(o){return !o.country||o.country===view.country;}))return false;
        if(view.reviews&&!offers(row).some(function(o){return o.reviews_available;}))return false;
        if(view.instant&&!offers(row).some(function(o){return o.instant_install;}))return false;
        if(view.scenario&&!offers(row).some(function(o){return o.scenario_enabled;})&&!row.instructions)return false;
        if(view.source&&!offers(row).some(function(o){return (o.allowed_sources||[o.source]).includes(view.source);} ))return false;
        if(view.term&&!offers(row).some(function(o){var min=o.min_days||o.duration_days,max=o.max_days||o.duration_days;return view.term==='28+'?max>=28:min<=Number(view.term)&&max>=Number(view.term);} ))return false;
        var person=owner(row),status=row.owner_activity&&row.owner_activity.status,seenAt=row.last_seen_at||row.last_owner_activity;
        if(!status&&seenAt){var hours=(Date.now()-Date.parse(seenAt))/3600000;if(Number.isFinite(hours))status=hours<5?'online':hours<24?'today':hours<48?'yesterday':'away';}
        if(author.reliability&&!(Number(person.reliability_index)>=Number(author.reliability)))return false;
        if(author.karma&&!(Number(person.karma)>=Number(author.karma)))return false;
        if(author.contribution&&!(Number(person.contribution_score)>=Number(author.contribution)))return false;
        if(author.activity==='online'&&status!=='online')return false;
        if(author.activity==='day'&&status!=='online'&&status!=='today')return false;
        return true;
    }
    function allRows() {
        var rows=[],seen=new Set();
        function add(values,kind){(values||[]).forEach(function(item){var rowKind=kind;if(rowKind!=='guest'&&rowKind!=='live'&&publishedLive(item))rowKind='live';var ident=rowKind==='guest'?String(item.id||item.package_name||''):id(item),key=(rowKind==='guest'?'guest:':'app:')+ident;if(!ident)return;var row=Object.assign({},item,{_kind:rowKind,_key:key});if(seen.has(key)){
            var prior=rows.find(function(x){return x._key===key;});if(rowKind==='bounty'){prior._contract=item;prior._hasContract=true;}if(rowKind==='returns')prior._return=true;if((kind==='mutual-seeking'||kind==='mutual-prelaunch')&&prior&&prior._kind==='bounty')prior._mutual=Object.assign({},item,{_kind:kind});return;}
            seen.add(key);if(rowKind==='bounty')row._hasContract=true;if(rowKind==='returns')row._return=true;rows.push(row);});}
        Object.values(data&&data.leaguePreviews||{}).forEach(function(rows){add(rows,'live');});
        add(data?data.inactivePreviews:[],'live');add(data?data.ranking:[],'live');add(data?data.queue:[],'live');
        var clean=typeof window._showcaseAvailableFeedItems==='function'?window._showcaseAvailableFeedItems:function(x){return x||[];};
        add(clean(array('mutualReturns')),'returns');add(clean(array('mutualSeeking')),'mutual-seeking');add(clean(array('bountyContracts')),'bounty');add(clean(array('mutualPrelaunch')),'mutual-prelaunch');add(array('guestProjects'),'guest');add(array('mutualIsolated'),'isolated');
        return rows.filter(visible);
    }
    function dormant(row){var a=row.owner_activity;if(a&&a.hours_ago!=null)return a.hours_ago>=168;var stamp=Date.parse(row.last_seen_at||row.last_owner_activity);return Number.isFinite(stamp)&&Date.now()-stamp>=7*86400000;}
    function inactiveShelf(rows){if(!rows.length)return '';var selected=rows.filter(function(r){var tier=r.scoring&&r.scoring.tier;return !inactiveFilter||inactiveFilter==='instant'&&offers(r).some(function(o){return o.instant_install;})||inactiveFilter==='high'&&tier<=3||inactiveFilter==='low'&&tier>=4||inactiveFilter==='sandbox'&&r._kind!=='live';});return '<details class="mk-inactive" data-mk-shelf="inactive" '+(inactiveOpen?'open':'')+'><summary>'+e(t('mkInactive',{n:Math.max(rows.length,data&&data.inactiveTotal||0)}))+'</summary><div class="mk-leagues">'+[['','mkAll'],['instant','mkInstant'],['high','mkHighTiers'],['low','mkLowTiers'],['sandbox','mkSandbox']].map(function(v){return '<button type="button" data-mk-inactive="'+v[0]+'" aria-pressed="'+(inactiveFilter===v[0])+'">'+e(t(v[1]))+'</button>';}).join('')+'</div><div class="mk-carousel">'+pages(selected,2)+'</div>'+((data&&data.inactiveOffset||12)<(data&&data.inactiveTotal||0)?'<button class="lm-action" data-mk-inactive-more>'+e(t('lmMore'))+'</button>':'')+'</details>';}
    function sourceText(source) {return t({keywords:'lmKeywords',key:'lmKeywords',web:'lmWeb',browser:'lmWeb',link:'lmLink'}[source]||'lmLink');}
    function card(row) {
        var p=row.passport||{},o=owner(row),sc=row.scoring||{},tasks=offers(row),tier=sc.tier;
        var icon=U.safeImage?U.safeImage(row.icon_url||p.icon_url):/^https:\/\//.test(row.icon_url||p.icon_url||'');
        var chosen=data&&((data.radar||[]).find(function(p){return Number(p.app_id)===Number(data.radarId);})||(!data.radarId?(data.radar||[])[0]:null)),priority=row.own&&chosen&&id(chosen)===id(row);
        var tags=[];var bridge=tasks.find(function(o){return o.closed_test_compatible&&o.ready;});if(bridge){tags.push(t('mkTakesClosed'));if(bridge.control_day_count<5)tags.push(t('mkFewerReports',{n:bridge.control_day_count}));}if(row.own)tags.push(t(priority?'lmPriorityOwn':'lmOwnRank',{rank:row.rank}));
        if(available(row))tags.push(t(tasks.some(function(x){return x.instant_install;})?'mkInstant':'mkSuitable'));
        var sources=[],minDay=null,maxDay=null;tasks.forEach(function(task){var label=sourceText(task.source);if(sources.indexOf(label)<0)sources.push(label);var min=Number(task.min_days||task.duration_days||14),max=Number(task.max_days||task.duration_days||min);if(minDay==null||min<minDay)minDay=min;if(maxDay==null||max>maxDay)maxDay=max;});if(sources.length)tags.push(sources.join(' · '));if(minDay!=null)tags.push('D'+(minDay===maxDay?minDay:minDay+'–'+maxDay));
        var contract=tasks.find(function(x){return x.offer_type==='contract';});if(contract||row._hasContract){var reward=contract&&(contract.reward_min||contract.reward_bust)||row.bounty_per_tester||row._contract&&row._contract.bounty_per_tester,max=contract&&contract.reward_max;tags.push('💎 '+(reward?money(reward)+(max&&max!==reward?'–'+money(max):'')+' $BUST':t('lmContracts')));if(contract&&contract.schemaVersion===6)tags.push(t('mkStartBuffer'));}
        if(tasks.some(function(x){return x.reviews_available;}))tags.push(t('mkReviewTag'));
        if(row.instructions||tasks.some(function(x){return x.scenario_enabled;}))tags.push(window.LiveRouteUI&&tasks.find(function(x){return x.activity&&x.activity.enabled;})?LiveRouteUI.badge(tasks.find(function(x){return x.activity&&x.activity.enabled;}).activity):t('mkScenario'));
        var geo=tasks.map(function(x){return x.country;}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i;}).join(', ');
        var mark=tier?'T'+tier:(publishedLive(row)?'L':row._kind==='guest'?'👽':'🧪');
        return '<button type="button" class="mk-card'+(row.own?' is-own':'')+(priority?' is-priority':'')+(!available(row)?' is-unavailable':'')+'" data-mk-project="'+e(row._key)+'"><span class="mk-app-icon">'+(icon?'<img src="'+e(row.icon_url||p.icon_url)+'" loading="lazy" referrerpolicy="no-referrer" alt="">':'📱')+'<small>'+e(mark)+'</small></span><span class="mk-card-copy"><strong class="notranslate">'+e(row.name||p.title||row.package_name||t('lmProject'))+'</strong><span class="mk-owner-mini">'+activity(row,true)+'<span>🛡 '+e(o.reliability_index==null?'—':money(o.reliability_index)+'%')+'</span><span>⚡ '+e(money(o.contribution_score||0))+'</span><span>'+e(t('mkKarma',{n:o.karma==null?'—':U.n(o.karma)}))+'</span>'+(row.rank?'<span>#'+e(row.rank)+'</span>':'')+'</span>'+(metadata(row)||geo?'<small class="mk-meta">'+e([metadata(row),geo].filter(Boolean).join(' · '))+'</small>':'')+'<span class="mk-tags">'+tags.slice(0,8).map(function(tag){return '<i>'+e(tag)+'</i>';}).join('')+'</span></span></button>';
    }
    function pages(rows,height) {var html='',size=(height||3)*(matchMedia('(min-width:760px)').matches?2:1);for(var i=0;i<rows.length;i+=size)html+='<div class="mk-page">'+rows.slice(i,i+size).map(card).join('')+'</div>';return html;}
    function shelf(key,rows,title) {
        if(!rows.length&&key==='returns')return '';
        var total=rows.length;
        if(data&&data.sectionTotals&&data.sectionTotals[key]!=null)total=Math.max(total,data.sectionTotals[key]+rows.filter(function(r){return r._kind!=='live';}).length);
        else if(data&&key==='live'&&!view.search&&!view.league)total=Math.max(total,data.totals.ranking||0);
        var heading=key==='recommended'?recommendedHeading():t(title);
        return '<section class="mk-shelf" data-mk-shelf="'+key+'"><header><h2>'+e(heading)+'</h2><button type="button" data-mk-all="'+key+'">'+e(t('mkSeeAll',{n:total}))+' ›</button></header>'+(key==='recommended'?ownPills():'')+(key==='live'?leagueTabs():'')+'<div class="mk-carousel" tabindex="0" aria-label="'+e(heading)+'">'+(rows.length?pages(rows):(data&&data.loading?'':'<p class="mk-empty">'+e(t('mkNoResults'))+'</p>'))+'</div></section>';
    }
    function liveShelves(rows){
        return '<section class="mk-live-leagues"><h2 class="mk-live-heading">'+e(t('mkLive'))+'</h2>'+[['1',[1],'mkTier1'],['2',[2],'mkTier2'],['3',[3],'mkTier3'],['4',[4],'mkTier4'],['5',[5,null],'mkTier5']].map(function(group){
            if(view.tier&&view.tier!==group[0])return '';
            var projects=rows.filter(function(p){return group[1].includes(p.scoring&&p.scoring.tier||null);}),total=data&&data.leagueTotals&&data.leagueTotals[group[0]];
            if(!projects.length&&!total)return '';
            return '<section class="mk-shelf mk-league is-'+group[0]+'" data-mk-shelf="'+group[0]+'"><header><span class="mk-league-emblem" aria-hidden="true">'+({1:'♜',2:'◆',3:'ϟ',4:'↗',5:'◦'}[group[0]])+'</span><h2>'+e(t(group[2]))+'</h2><button type="button" data-mk-league-all="'+group[0]+'">'+e(t('mkSeeAll',{n:total==null?projects.length:total}))+' ›</button></header><div class="mk-carousel" style="--mk-rows:'+({1:5,2:4,3:3,4:2,5:2}[group[0]])+'" tabindex="0" aria-label="'+e(t(group[2]))+'">'+pages(projects,{1:5,2:4,3:3,4:2,5:2}[group[0]])+'</div></section>';
        }).join('')+'</section>';
    }
    function leagueTabs(){return '<div class="mk-leagues">'+[['','mkAll'],['leaders','mkLeaders'],['flow','mkFlow'],['start','mkStart']].map(function(v){return '<button type="button" data-mk-league="'+v[0]+'" aria-pressed="'+(view.league===v[0])+'">'+e(t(v[1]))+'</button>';}).join('')+'</div>';}
    function menu(name,options){var current=options.filter(function(v){return String(view[name])===String(v[0]);})[0]||options[0];return '<button type="button" data-mk-menu="'+name+'" aria-haspopup="dialog" aria-label="'+e(t('mkFilter'+name))+'">'+e(t(current[1]))+'</button>';}
    function focusName(){if(!data||data.radarAll)return '';var live=(data.radar||[]).find(function(r){return Number(r.app_id)===Number(data.radarId);});if(live)return live.name;var closed=((data.sandbox||{}).own_projects||[]).find(function(p){return Number(p.app_id)===Number(data.radarId);});return closed?closed.name:'';}
    function recommendedHeading(){var name=focusName();return name?t('mkRecommendedFor',{name:name}):t('mkRecommended');}
    function myProjects(){var live=(data&&data.radar||[]).map(function(p){return {id:p.app_id,name:p.name,phase:'live',icon:p.icon_url,score:p.scoring&&p.scoring.market_score,tier:p.scoring&&p.scoring.tier,rank:p.rank};});var closed=((data&&data.sandbox||{}).own_projects||[]).filter(function(p){return !live.some(function(item){return Number(item.id)===Number(p.app_id);});}).map(function(p){return {id:p.app_id,name:p.name,phase:'testing',day:p.day,team:p.team};});return live.concat(closed);}
    function ownPills(){var items=myProjects();if(items.length<2)return '';return '<div class="mk-own-pills">'+items.map(function(p){var on=!data.radarAll&&Number(data.radarId)===Number(p.id);return '<button type="button" data-mk-pick="'+e(p.id)+'" aria-pressed="'+on+'">'+(p.phase==='live'?'🚀 ':'🧪 ')+e(p.name)+'</button>';}).join('')+'<button type="button" data-mk-pick="all" aria-pressed="'+(!!data.radarAll)+'">'+e(t('mkAllMine'))+'</button></div>';}
    function miniProject(){if(!data||data.radarAll)return '<button type="button" class="mk-mini" data-mk-radar-pick><span>'+e(t('mkAllMine'))+'</span>'+CHEV+'</button>';var live=(data.radar||[]).find(function(r){return Number(r.app_id)===Number(data.radarId);}),closed=((data.sandbox||{}).own_projects||[]).find(function(p){return Number(p.app_id)===Number(data.radarId);}),icon=live&&/^https:\/\//.test(live.icon_url||'')?'<img src="'+e(live.icon_url)+'" alt="" referrerpolicy="no-referrer">':'<b>'+(live?'🚀':'🧪')+'</b>',label=live?money(live.scoring.market_score):(closed?'D'+(closed.day||'—'):'—');return '<button type="button" class="mk-mini" data-mk-radar-pick>'+icon+'<span>'+e(label)+'</span>'+CHEV+'</button>';}
    function controls() {
        var authorCount=['reliability','karma','contribution','activity'].filter(function(key){return author[key];}).length;
        return '<div class="mk-controls"><div class="mk-main-filters"><div class="mk-sticky-tools"><button type="button" class="mk-icon-btn" data-mk-search-toggle aria-label="'+e(t('mkSearch'))+'"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>'+miniProject()+'</div><label class="mk-search"><span aria-hidden="true">⌕</span><input type="search" maxlength="100" data-mk-search value="'+e(view.search)+'" placeholder="'+e(t('mkSearch'))+'" aria-label="'+e(t('mkSearch'))+'"></label><div class="mk-sections" role="group" aria-label="'+e(t('mkSections'))+'">'+[['all','mkAllSections'],['recommended','mkRecommended'],['contracts','mkContracts'],['live','mkLive'],['sandbox','mkSandbox']].map(function(v){return '<button type="button" data-mk-section="'+v[0]+'" aria-pressed="'+(view.section===v[0])+'">'+e(t(v[1]))+'</button>';}).join('')+'</div></div><div class="mk-subfilters">'+menu('content',[['','mkAllContent'],['app','mkApps'],['game','mkGames']])+'<button type="button" data-mk-geo>🌍 '+e(view.country||t('mkAllGeo'))+'</button>'+['reviews','instant','scenario'].map(function(k){return '<button type="button" data-mk-toggle="'+k+'" aria-pressed="'+!!view[k]+'">'+e(t({reviews:'mkReviewTag',instant:'mkInstant',scenario:'mkScenario'}[k]))+'</button>';}).join('')+menu('source',[['','lmSource'],['link','lmLink'],['web','lmWeb'],['keywords','lmKeywords']])+menu('tier',[['','lmTierFilter'],[1,'mkT1'],[2,'mkT2'],[3,'mkT3'],[4,'mkT4'],[5,'mkT5']])+menu('term',[['','lmTerm'],[7,'mkD7'],[14,'mkD14'],[21,'mkD21'],['28+','mkD28']])+'<button type="button" data-mk-author aria-haspopup="dialog">'+e(t('mkAuthor'))+(authorCount?'<b>'+authorCount+'</b>':'')+'</button></div></div>';
    }
    function update(node,snapshot) {
        root=node;data=snapshot;
        var who=U.auth();if(actor!==who){actor=who;radarOpen=false;searchOpen=false;condensed=false;author={reliability:'',karma:'',contribution:'',activity:''};view={section:'all',search:'',content:'',country:'',reviews:false,instant:false,scenario:false,source:'',term:'',league:'',tier:''};}
        var radar=root.querySelector('.lm-radar');
        if(radar){var chosen=(data.radar||[]).find(function(r){return Number(r.app_id)===Number(data.radarId);}),closed=((data.sandbox||{}).own_projects||[]).find(function(p){return Number(p.app_id)===Number(data.radarId);}),capsule=document.createElement('details');capsule.className='mk-radar-capsule';capsule.open=radarOpen;
            var title=data.radarAll?t('mkAllMine'):chosen?t('lmRadar')+': '+chosen.name:closed?closed.name:t('lmRadar');
            var count=closed?Number(closed.team)||0:0,meta=data.radarAll?t('mkPickProject'):chosen?'Tier '+(chosen.scoring.tier||'—')+' · #'+chosen.rank+' / '+chosen.out_of+' · '+money(chosen.scoring.market_score)+'/1000':closed?t(count<12?'mkTeamMinimum':'mkTeamReserve',{day:closed.day,n:count,left:Math.max(0,(count<12?12:20)-count)}):t('lmNoLiveRadar');
            capsule.innerHTML='<summary><span class="mk-radar-symbol">'+(closed&&!chosen?'🧪':'◎')+'</span><button type="button" data-mk-radar-pick><strong class="notranslate">'+e(title)+'</strong><small>'+e(meta)+'</small></button><span class="mk-radar-next">'+e(chosen&&chosen.next_rank_score!=null?t('mkNextRank',{n:chosen.rank-1,diff:money(chosen.points_to_next_rank)}):'')+'</span>'+CHEV+'</summary>';
            radar.replaceWith(capsule);capsule.appendChild(radar);capsule.addEventListener('toggle',function(){radarOpen=capsule.open;});}
        root.classList.add('mk-enabled');
        var host=document.createElement('div');host.id='market-storefront';root.appendChild(host);paint();
        document.querySelectorAll('[data-market-radar]').forEach(function(b){var r=(data.radar||[]).find(function(row){return Number(row.app_id)===Number(b.dataset.marketRadar);});if(r)b.textContent=t('mkRadarBadge',{tier:r.scoring.tier||'—',rank:r.rank});});
    }
    function paint() {
        if(!root)return;var host=root.querySelector('#market-storefront');if(!host)return;
        var active=document.activeElement,searchFocused=active&&active.hasAttribute('data-mk-search'),cursor=searchFocused?active.selectionStart:null;
        var combined=allRows(),inactive=combined.filter(dormant),rows=combined.filter(function(p){return !dormant(p);}),groups={returns:rows.filter(function(p){return p._return;}),recommended:rows.filter(function(p){return available(p)&&!p.own&&!p.is_own_project;}),contracts:rows.filter(function(p){return !p.own&&!p.is_own_project&&(p._hasContract||offers(p).some(function(o){return o.offer_type==='contract';}));}),live:rows.filter(function(p){return p._kind==='live';}),sandbox:rows.filter(function(p){return p._kind!=='live'&&!publishedLive(p);})};
        var priority=new Map((data&&data.queue||[]).map(function(p,i){return [id(p),i];}));groups.recommended.sort(function(a,b){return (priority.has(id(a))?priority.get(id(a)):100000)-(priority.has(id(b))?priority.get(id(b)):100000);});
        groups.live.sort(function(a,b){return (a.rank||1e9)-(b.rank||1e9);});
        if(view.league)groups.live=groups.live.filter(function(p){var tier=p.scoring&&p.scoring.tier;return view.league==='leaders'?tier<=2:view.league==='flow'?tier===3:!tier||tier>=4;});
        var fullTitle=view.section==='recommended'?recommendedHeading():t({recommended:'mkRecommended',contracts:'mkEarn',live:'mkLive',sandbox:'mkSandbox',returns:'mkReturns'}[view.section]);
        var visibleRows=groups[view.section]||[],emptyNote=data&&data.loading?'':'<p class="mk-empty">'+e(t('mkNoResults'))+'</p>';
        host.innerHTML='<header class="mk-title"><h1>'+e(t('tabMarket'))+'</h1><button type="button" class="lm-icon" data-lm-model aria-label="'+e(t('lmModelInfo'))+'">ⓘ</button><button type="button" class="lm-icon" data-lm-refresh aria-label="'+e(t('lmRefresh'))+'">↻</button></header>'+controls()+(view.section==='live'&&!view.league?liveShelves(groups.live):view.section==='all'?shelf('returns',groups.returns,'mkReturns')+shelf('recommended',groups.recommended,'mkRecommended')+shelf('contracts',groups.contracts,'mkEarn')+liveShelves(groups.live)+shelf('sandbox',groups.sandbox,'mkSandbox'):'<section class="mk-full-list"><h2>'+e(fullTitle)+'</h2>'+(view.section==='recommended'?ownPills():'')+(view.section==='live'?leagueTabs():'')+visibleRows.map(card).join('')+(visibleRows.length?'':emptyNote)+'</section>') +inactiveShelf(inactive)+(data&&data.error?'<p role="alert" class="lm-error">'+e(t('lmError'))+'</p>':'')+(data&&data.loading?'<p role="status" class="mk-sync">'+e(t('mkSyncing'))+'</p>':'')+(data&&Math.max(data.totals.ranking||0,data.totals.queue||0)>data.offset?'<button type="button" class="lm-action" data-mk-more>'+e(t('lmMore'))+'</button>':'');
        host.classList.toggle('is-condensed',condensed);host.classList.toggle('is-search-open',searchOpen);
        if(searchFocused){var input=host.querySelector('[data-mk-search]');if(input){input.focus({preventScroll:true});if(cursor!=null)input.setSelectionRange(cursor,cursor);}}
    }
    function refreshQuery(){var pending;if(window.LiveMarket&&LiveMarket.filter)pending=LiveMarket.filter({source:view.source,term:view.term,country:view.country,instant:view.instant,reviews:view.reviews,contracts:view.section==='contracts',search:view.search,content:view.content,scenario:view.scenario,league:view.league,tier:view.tier,minReliability:author.reliability,minKarma:author.karma,minContribution:author.contribution,ownerActivity:author.activity});paint();return pending;}
    function about(row) {
        var p=row.passport||{},o=owner(row),url=row.package_name?'https://play.google.com/store/apps/details?id='+encodeURIComponent(row.package_name):null;
        return '<section class="mk-passport"><div class="mk-passport-heading">'+(/^https:\/\//.test(row.icon_url||'')?'<img src="'+e(row.icon_url)+'" alt="" referrerpolicy="no-referrer">':'')+'<strong class="notranslate">'+e(row.name||p.title)+'</strong></div><div class="mk-passport-owner">'+e(o.username?'@'+o.username:row.owner_username?'@'+row.owner_username:o.full_name||row.owner_full_name||'')+' '+activity(row,false)+'<span>🛡 '+e(o.reliability_index==null?'—':money(o.reliability_index)+'%')+'</span></div>'+contribution(row)+(url?'<a class="lm-action" href="'+e(url)+'" target="_blank" rel="noopener noreferrer">'+e(t('mkOpenPlay'))+' ↗</a>':'')+'<div class="mk-passport-stats"><span>'+e(metadata(row)||t('mkMetadataUnknown'))+'</span><span>'+e(row.scoring?'Tier '+(row.scoring.tier||'—'):t('mkClosedTest'))+'</span><span>'+e(p.rating!=null?U.n(p.rating)+' ★'+(p.ratings!=null?' · '+money(p.ratings):''):t('mkNoStoreRating'))+'</span></div><div class="mk-gallery">'+(p.screenshots_preview||[]).filter(function(src){return /^https:\/\//.test(src);}).map(function(src,index){return '<button type="button" class="mk-shot" data-mk-shot="'+index+'" data-mk-src="'+e(src)+'"><img src="'+e(src)+'" alt="'+e(t('mkStoreScreenshot'))+'" loading="lazy" referrerpolicy="no-referrer"></button>';}).join('')+'</div>'+(p.description?'<details><summary>'+e(t('mkDescription'))+'</summary><p class="mk-description">'+e(p.description)+'</p></details>':'')+'</section>';
    }
    function feedBlock(item,kind){return typeof window.renderFeedCard==='function'?renderFeedCard(item,kind):'';}
    function open(key) {
        var row=allRows().find(function(p){return p._key===key;});if(!row){if(String(key).indexOf('app:')===0){var missing=Number(String(key).slice(4));if(LiveMarket.open(missing)===false&&LiveMarket.openFromLink)LiveMarket.openFromLink(missing);}return;}
        if(row._kind==='live'||publishedLive(row)){if(LiveMarket.open(id(row))===false&&LiveMarket.openFromLink)LiveMarket.openFromLink(id(row));return;}
        var body=about(row);
        if(row._kind==='guest'&&typeof window.renderGuestProjectCard==='function')body+=renderGuestProjectCard(row);
        else {
            var mutual=row._mutual||(row._kind!=='bounty'?row:null),contract=row._contract||(row._kind==='bounty'?row:null),preferContract=view.section==='contracts'&&contract;
            var mutualKind=(mutual&&mutual._kind)==='mutual-prelaunch'||row._kind==='mutual-prelaunch'?'mutual-prelaunch':'mutual-seeking';
            var first=preferContract?contract:mutual,second=preferContract?mutual:contract,firstKind=preferContract?'bounty':mutualKind,secondKind=preferContract?mutualKind:'bounty';
            if(first)body+=feedBlock(first,firstKind);
            if(second&&second!==first)body+='<h3 class="mk-also">'+e(t(preferContract?'mkAlsoMutual':'mkAlsoContract'))+'</h3>'+feedBlock(second,secondKind);
        }
        var layer=U.sheet(t('mkAbout'),body);
        // Hand off before an original inline handler opens its legacy modal.
        // Keeping the About sheet would cover that modal with a higher z-index.
        layer.addEventListener('click',function(ev){var shot=ev.target.closest('[data-mk-shot]');if(shot&&typeof window.openFeedbackImageSlider==='function'){var urls=Array.from(layer.querySelectorAll('[data-mk-src]')).map(function(node){return node.dataset.mkSrc;});window.feedbackMediaRegistry=window.feedbackMediaRegistry||{};window.feedbackMediaRegistry.market=urls;openFeedbackImageSlider('market',Number(shot.dataset.mkShot)||0);return;}var action=ev.target.closest('.market-card button[onclick]');if(action&&!action.disabled)U.close(layer);},true);
    }
    function show(section){view.section=section;return refreshQuery();}
    function menus(){return {content:[['','mkAllContent'],['app','mkApps'],['game','mkGames']],source:[['','lmSource'],['link','lmLink'],['web','lmWeb'],['keywords','lmKeywords']],tier:[['','lmTierFilter'],[1,'mkT1'],[2,'mkT2'],[3,'mkT3'],[4,'mkT4'],[5,'mkT5']],term:[['','lmTerm'],[7,'mkD7'],[14,'mkD14'],[21,'mkD21'],['28+','mkD28']]};}
    function openMenu(name){var options=menus()[name]||[];var layer=U.sheet(t('mkFilter'+name),'<div class="mk-pick-list">'+options.map(function(v){return '<button type="button" data-mk-choice="'+e(v[0])+'" aria-pressed="'+(String(view[name])===String(v[0]))+'">'+e(t(v[1]))+'</button>';}).join('')+'</div>');layer.addEventListener('click',function(ev){var choice=ev.target.closest('[data-mk-choice]');if(!choice)return;view[name]=choice.dataset.mkChoice;U.close(layer);refreshQuery();});}
    function counted(next){var saved=author;author=next;var total=allRows().filter(function(p){return !dormant(p);}).length;author=saved;return total;}
    function openAuthor(){var draft=Object.assign({},author);function group(key,label,options){return '<div class="mk-author-group"><p>'+e(label)+'</p>'+options.map(function(v){return '<button type="button" data-mk-author-choice="'+key+'" data-mk-value="'+e(v[0])+'" aria-pressed="'+(String(draft[key])===String(v[0]))+'">'+e(t(v[1]))+'</button>';}).join('')+'</div>';}var layer=U.sheet(t('mkAuthor'),group('reliability',t('mkReliability'),[['','mkAny'],['70','mkRel70'],['85','mkRel85'],['95','mkRel95']])+group('karma',t('mkKarmaFilter'),[['','mkAnyKarma'],['50','mkKarma50'],['100','mkKarma100'],['250','mkKarma250']])+group('contribution',t('mkContributionFilter'),[['','mkAnyContribution'],['25','mkContrib25'],['100','mkContrib100']])+group('activity',t('mkActivityFilter'),[['','mkAll'],['online','mkOnline'],['day','mkSeenDay']])+'<p class="lm-caption">'+e(t('mkAuthorHint'))+'</p><div class="mk-author-actions"><button type="button" data-mk-author-reset>'+e(t('mkReset'))+'</button><button type="button" class="lm-action" data-mk-author-apply>'+e(t('mkShowCount',{n:counted(draft)}))+'</button></div>');function paintApply(){layer.querySelectorAll('[data-mk-author-choice]').forEach(function(node){node.setAttribute('aria-pressed',String(draft[node.dataset.mkAuthorChoice])===String(node.dataset.mkValue));});var apply=layer.querySelector('[data-mk-author-apply]');if(apply)apply.textContent=t('mkShowCount',{n:counted(draft)});};layer.addEventListener('click',function(ev){var choice=ev.target.closest('[data-mk-author-choice]');if(choice){draft[choice.dataset.mkAuthorChoice]=choice.dataset.mkValue;paintApply();return;}if(ev.target.closest('[data-mk-author-reset]')){draft={reliability:'',karma:'',contribution:'',activity:''};paintApply();return;}if(ev.target.closest('[data-mk-author-apply]')){author=draft;U.close(layer);refreshQuery();}}); }
    function openPicker(){var items=myProjects();U.sheet(t('mkPickProject'),'<div class="mk-pick-list">'+items.map(function(p){var on=!!(data&&!data.radarAll&&Number(data.radarId)===Number(p.id));return '<button type="button" data-mk-pick="'+e(p.id)+'" aria-pressed="'+on+'"><strong class="notranslate">'+(p.phase==='live'?'🚀 ':'🧪 ')+e(p.name)+'</strong><small>'+e(p.phase==='live'?t('mkLiveShort',{tier:p.tier||'—',score:money(p.score)}):t('mkClosedDay',{day:p.day||'—'}))+'</small></button>';}).join('')+'<button type="button" data-mk-pick="all" aria-pressed="'+(!!(data&&data.radarAll))+'"><strong>🌐 '+e(t('mkAllMine'))+'</strong></button></div>');}
    document.addEventListener('click',function(ev){var pick=ev.target.closest('[data-mk-radar-pick]');if(!pick)return;ev.preventDefault();ev.stopPropagation();openPicker();},true);
    document.addEventListener('click',function(ev){var b=ev.target.closest('[data-mk-section],[data-mk-all],[data-mk-toggle],[data-mk-league],[data-mk-league-all],[data-mk-geo],[data-mk-project],[data-market-radar],[data-mk-more],[data-mk-inactive],[data-mk-inactive-more],[data-mk-menu],[data-mk-author],[data-mk-pick],[data-mk-search-toggle],[data-mk-suitable]');if(!b)return;
        if(b.hasAttribute('data-mk-inactive-more')){LiveMarket.loadDormant(true);return;}
        if(b.hasAttribute('data-mk-inactive')){inactiveFilter=b.dataset.mkInactive;inactiveOpen=true;paint();return;}
        if(b.hasAttribute('data-market-radar')){ev.preventDefault();LiveMarket.openRadar(Number(b.dataset.marketRadar));return;}
        if(b.hasAttribute('data-mk-project'))return open(b.dataset.mkProject);
        if(b.hasAttribute('data-mk-section'))return show(b.dataset.mkSection);
        if(b.hasAttribute('data-mk-all'))return show(b.dataset.mkAll);
        if(b.hasAttribute('data-mk-more'))return LiveMarket.more();
        if(b.hasAttribute('data-mk-league-all')){view.section='live';view.league='';view.tier=b.dataset.mkLeagueAll;refreshQuery();return;}
        if(b.hasAttribute('data-mk-league')){view.league=b.dataset.mkLeague;refreshQuery();return;}
        if(b.hasAttribute('data-mk-toggle')){view[b.dataset.mkToggle]=!view[b.dataset.mkToggle];refreshQuery();return;}
        if(b.hasAttribute('data-mk-geo')&&window.ShowcaseGeo)ShowcaseGeo.openPicker({value:view.country,titleKey:'lmGeo',anyKey:'lmAll',onChoose:function(code){view.country=code||'';refreshQuery();}});
        if(b.hasAttribute('data-mk-menu'))return openMenu(b.dataset.mkMenu);
        if(b.hasAttribute('data-mk-author'))return openAuthor();
        if(b.hasAttribute('data-mk-pick')){LiveMarket.selectPriority(b.dataset.mkPick);var sheet=b.closest('.lm-sheet-overlay');if(sheet)U.close(sheet);return;}
        if(b.hasAttribute('data-mk-search-toggle')){searchOpen=true;var host=document.getElementById('market-storefront');if(host){host.classList.add('is-search-open');var input=host.querySelector('[data-mk-search]');if(input)input.focus();}return;}
        if(b.hasAttribute('data-mk-suitable')){view.section='recommended';refreshQuery();var shelf=document.querySelector('[data-mk-shelf="recommended"]');if(shelf)shelf.scrollIntoView({block:'start',behavior:'smooth'});}
    });
    document.addEventListener('focusout',function(ev){if(!ev.target.hasAttribute||!ev.target.hasAttribute('data-mk-search')||ev.target.value)return;searchOpen=false;var host=document.getElementById('market-storefront');if(host)host.classList.remove('is-search-open');});
    document.addEventListener('scroll',function(){var cap=document.querySelector('#live-market-slot .mk-radar-capsule');if(!cap)return;var top=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--smart-top-height'))||0;var next=cap.getBoundingClientRect().bottom<top+8;if(next===condensed)return;condensed=next;if(!next)searchOpen=false;var host=document.getElementById('market-storefront');if(host){host.classList.toggle('is-condensed',condensed);host.classList.toggle('is-search-open',searchOpen);}},true);
    document.addEventListener('toggle',function(ev){if(ev.target.classList&&ev.target.classList.contains('mk-inactive')){inactiveOpen=ev.target.open;if(inactiveOpen&&window.LiveMarket)LiveMarket.loadDormant(false);}},true);
    document.addEventListener('input',function(ev){if(ev.target.hasAttribute('data-mk-search')){view.search=ev.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(refreshQuery,300);}});
    document.addEventListener('change',function(ev){if(ev.target.dataset&&ev.target.dataset.mkFilter){view[ev.target.dataset.mkFilter]=ev.target.value;refreshQuery();}});
    document.addEventListener('DOMContentLoaded',function(){var sources=document.getElementById('live-market-legacy');if(sources){var observer=new MutationObserver(function(){if(frame)return;frame=requestAnimationFrame(function(){frame=0;paint();});});observer.observe(sources,{childList:true,subtree:true});}});
    window.MarketStorefront={update:update,about:about,show:show,showGuests:async function(){await show('sandbox');var guest=root&&root.querySelector('[data-mk-project^="guest:"]');if(guest)guest.scrollIntoView({block:'center',behavior:'smooth'});},selectTier:function(tier){view.section='live';view.league='';view.tier=String(tier||'');},openRadar:function(){radarOpen=true;var details=root&&root.querySelector('.mk-radar-capsule');if(details){details.open=true;details.scrollIntoView({block:'start',behavior:'smooth'});}}};
})();
