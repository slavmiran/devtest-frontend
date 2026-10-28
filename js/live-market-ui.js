/* Shared presentation for the educational market, owner analytics and queue. */
(function () {
    'use strict';
    var sheets = [], serial = 0;
    function t(key, vars) { return window.t(key, vars || {}, window.lang === 'ru' ? 'ru' : 'en'); }
    function e(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function n(value, digits) { return value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', {maximumFractionDigits: digits == null ? 1 : digits}); }
    function clamp(value, max) { return Math.max(0, Math.min(max || 100, Number(value) || 0)); }
    function tone(value) { return value == null ? 'unknown' : value < 50 ? 'risk' : value < 75 ? 'watch' : 'good'; }
    function report(g) { var h = g && g.hours_since_last_report; return h == null ? t('lmNoReport') : t(h >= 48 ? 'lmDaysAgo' : 'lmReportAgo', {n: n(h >= 48 ? h / 24 : h)}); }
    function engagement(g, compact) {
        g = g || {}; var status = g.available ? tone(g.score) : 'unknown';
        if (compact) return '<div class="live-health-col live-health-active lm-activity is-' + status + '" title="' + e(t('lmEngagementHint')) + '"><span class="live-health-label">' + e(t('lmEngagement')) + '</span><strong class="live-health-val">' + e(g.discipline_percent == null ? '—' : n(g.discipline_percent) + '%') + '</strong><small>' + e(t('lmActive', {n: n(g.active_testers, 0)})) + '</small><small>' + e(report(g)) + '</small>' + (g.provisional ? '<small class="lm-provisional">' + e(t('lmProvisional')) + '</small>' : '') + '</div>';
        return '<div class="lm-engagement is-' + status + '"><div class="lm-inline"><strong>' + e(t('lmDiscipline')) + '</strong><b>' + e(g.discipline_percent == null ? '—' : n(g.discipline_percent) + '%') + '</b></div><p>' + e(report(g)) + ' · ' + e(t('lmActive', {n: n(g.active_testers, 0)})) + '</p>' + (g.provisional ? '<p class="lm-provisional">' + e(t('lmProvisional')) + '</p>' : '') + '<p>' + e(t('lmDepth')) + ': ' + e(n(g.depth_score)) + ' / 100 · ' + e(t('lmScenario', {value: g.scenario_evidence ? t('lmScenarioEvidence') : '—'})) + '</p><small>' + e(t('lmEngagementHint')) + '</small></div>';
    }
    function factors(score) {
        return '<div class="lm-equalizer">' + (score.factors || []).map(function (f) {
            var v = f.available ? f.score : null;
            return '<div class="lm-factor"><span>' + e(t('lmFactor_' + f.code)) + '</span><div class="lm-factor-track"' + (v == null ? ' role="img" aria-label="' + e(t('lmFactor_' + f.code) + ': ' + t('lmUnknown')) + '"' : ' role="meter" aria-label="' + e(t('lmFactor_' + f.code)) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + clamp(v) + '"') + '><i class="is-' + tone(v) + '" style="width:' + clamp(v) + '%"></i></div><b>' + e(n(v, 0)) + '</b></div>';
        }).join('') + '</div>';
    }
    function thermalStatus(th, compact) {
        if (!th || th.T_t == null) return '';
        var v = Math.max(-100, Math.min(100, Number(th.T_t) || 0));
        return '<div class="lm-temperature' + (compact ? ' is-compact' : '') + '"><div class="lm-inline"><span>' + e(t('lmTemperature')) + '</span><b>' + (v > 0 ? '+' : '') + e(n(v)) + '°</b></div><div class="lm-temperature-track" role="meter" aria-label="' + e(t('lmTemperature')) + '" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="' + v + '"><i style="left:' + ((v + 100) / 2) + '%"></i></div><div class="lm-temp-labels"><span>−100°</span><span>0°</span><span>+100°</span></div><small>' + e(t('lmThermalMultiplier', {n: n(th.K_thermal, 3)})) + '</small>' + (th.cliff ? '<p class="lm-warning">' + e(t('lmCliff')) + '</p>' : '') + '</div>';
    }
    function impulse(market) {
        var p = market && market.today_impulse;
        if (!p || !(p.installs > 0 || p.yesterday_deficit > 0)) return '';
        return '<div class="lm-impulse' + (p.L_floor > 0 && p.floor_met ? ' is-met' : '') + '" role="status"><strong>' + e(t('lmToday', {n:n(p.installs,0)})) + '</strong><span>' + e(t(p.L_floor > 0 ? 'lmTodayFloor' : 'lmTodayPending', {n:n(p.installs,0),floor:n(p.L_floor,0)})) + '</span>' + (p.L_floor > 0 && p.floor_met ? '<small>' + e(t('lmTodayMet')) + '</small>' : '') + '</div>';
    }
    function tierBadge(score) {
        var tier=score && score.tier;
        return tier>=1 && tier<=5 ? '<span class="lm-tier-badge is-tier'+tier+'">'+e(t('lmTier',{n:tier}))+'</span>' : '';
    }
    function competition(row, data, own, sandbox, expanded) {
        data=data||{};own=own||[];sandbox=sandbox||{};
        if(!Array.isArray(data.bins)||data.bins.length!==20)return '';
        var bins=data.bins,counts=data.tier_counts||[],total=data.total||0,max=Math.max(1,...bins), selected=row && row.bin_index;
        var selectedTier=row && row.scoring.tier;
        function height(c){return c>0?8+56*Math.sqrt(c)/Math.sqrt(max):2;}
        function x(i){return 8+(i+.5)*14.4;}
        var target=row?(row.next_rank_score==null?t(row.prev_rank_score==null?'lmSoleLeader':'lmLeaderGap',{n:n(row.lead_over_prev_rank,0)}):t('lmNextGap',{rank:n(row.rank-1,0),n:n(row.points_to_next_rank,0)})):'';
        var markers={};own.forEach(function(p){if(row&&p.app_id===row.app_id||p.bin_index==null)return;(markers[p.bin_index]||(markers[p.bin_index]=[])).push(p);});
        var label=row&&selected!=null?t('lmYouTier',{rank:n(row.rank,0),tier:selectedTier}):'';
        var labelX=selected==null?152:x(selected),anchor=labelX>220?'end':labelX<100?'start':'middle';
        var detail='';
        if(expanded>=1&&expanded<=5){
            var count=counts[5-expanded]||0,low=(5-expanded)*200,high=expanded===1?1000:low+199;
            detail='<div class="lm-tier-detail" id="lm-tier-detail"><strong>'+e(t('lmTier',{n:expanded})+' · '+t('lmTierName'+expanded))+'</strong><p>'+e(t('lmTierStats',{min:low,max:high,n:n(count,0),percent:n(total?count/total*100:0)}))+'</p>'+(row&&selectedTier===expanded?'<small>'+e(t('lmTierOwnPosition',{rank:n(row.tier_rank,0),total:n(row.tier_total,0)}))+'</small>':'')+'<button type="button" class="lm-action lm-action-primary" data-lm-tier-show="'+expanded+'">'+e(t('lmTierShow',{n:expanded}))+'</button></div>';
        }
        return '<section class="lm-competition"><button type="button" class="lm-sandbox" data-lm-sandbox>🌱 '+e(t('lmSandbox',{n:n(sandbox.phase1_active_total||0,0),m:n(sandbox.phase1_graduating_soon||0,0)}))+'</button><header><strong>'+e(t('lmCompetition',{n:n(total,0)}))+'</strong><span>'+e(target)+'</span></header><svg viewBox="0 0 304 128" role="img" aria-label="'+e(t('lmDensityA11y',{n:n(total,0)}))+'">'+bins.map(function(c,i){var h=height(c),tier=5-Math.floor(i/4);return '<rect x="'+(8+i*14.4+1).toFixed(2)+'" y="'+(96-h).toFixed(2)+'" width="12.4" height="'+h.toFixed(2)+'" rx="2" class="lm-density-bar is-tier'+tier+(c?'':' is-empty')+'"><title>'+e(t('lmDensityBin',{min:i*50,max:i===19?1000:i*50+49,n:n(c,0)}))+'</title></rect>';}).join('')+Object.keys(markers).map(function(i){var group=markers[i];return '<circle cx="'+x(Number(i)).toFixed(2)+'" cy="104" r="3" class="lm-secondary-marker"><title>'+e(group.map(function(p){return t('lmOtherOwn',{name:p.name,rank:n(p.rank,0)});}).join(' · '))+'</title></circle>';}).join('')+(selected!=null?'<rect x="'+(8+selected*14.4).toFixed(2)+'" y="'+(93-height(bins[selected])).toFixed(2)+'" width="14.4" height="'+(height(bins[selected])+6).toFixed(2)+'" rx="3" class="lm-density-selected"/><path d="M '+(x(selected)-3).toFixed(2)+' '+(84-height(bins[selected])).toFixed(2)+' l 6 0 l -3 5 z" class="lm-skyline-marker"/><text x="'+labelX.toFixed(2)+'" y="16" text-anchor="'+anchor+'" class="lm-skyline-label">'+e(label)+'</text>':'')+'<text x="8" y="123">0</text><text x="296" y="123" text-anchor="end">1000</text></svg><div class="lm-tier-segments">'+[5,4,3,2,1].map(function(tier){return '<button type="button" class="is-tier'+tier+(tier===selectedTier?' is-mine':'')+'" data-lm-tier="'+tier+'" aria-expanded="'+(Number(expanded)===tier)+'" aria-controls="lm-tier-detail" aria-label="'+e(t('lmTier',{n:tier})+': '+n(counts[5-tier]||0,0))+'">T'+tier+'<b>'+e(n(counts[5-tier]||0,0))+'</b></button>';}).join('')+'</div><small class="lm-density-caption">'+e(t('lmDensityHint'))+'</small>'+detail+(row&&row.points_to_next_tier!=null?'<p class="lm-tier-goal">'+e(t('lmNextTier',{tier:selectedTier-1,n:n(row.points_to_next_tier,0)}))+'</p>':'')+(row&&row.next_rank_score!=null?'<small>'+e(t(row.points_to_overtake==null?'lmScoreCeiling':'lmOvertake',{n:n(row.points_to_overtake,0)}))+'</small>':'')+(own.length>1?'<div class="lm-own-legend">'+own.filter(function(p){return !row||p.app_id!==row.app_id;}).map(function(p){return '<span>◦ '+e(t('lmOtherOwn',{name:p.name,rank:n(p.rank,0)}))+'</span>';}).join('')+'</div>':'')+((sandbox.own_projects||[]).length?'<details class="lm-phase1-own"><summary>'+e(t('lmOwnPhase1',{n:sandbox.own_projects.length}))+'</summary>'+sandbox.own_projects.map(function(p){return '<span>'+e(p.name)+' · '+e(t('lmPhase1Day',{n:n(p.day,0)}))+(p.public?'':' · '+e(t('lmPhase1Hidden')))+'</span>';}).join('')+'</details>':'')+'</section>';
    }
    function thermal(market) {
        if (!market || !Array.isArray(market.thermal_week) || !market.thermal_week.length) return '';
        var days = market.thermal_week.slice(-7), ceiling = Math.max(1, ...days.map(function (d) { return Math.max(d.C_t || 0, d.U_crit || 0, d.U_opt || 0); }));
        var y = function (v) { return +(112 - clamp(v, ceiling) / ceiling * 96).toFixed(2); };
        var x = function (i) { return 20 + i * 44; };
        function line(key) { return days.map(function (d, i) { return x(i) + ',' + y(d[key]); }).join(' '); }
        var area = line('U_opt') + ' ' + days.map(function (d, i) { return x(i) + ',' + y(d.L_floor); }).reverse().join(' ');
        return '<section class="lm-thermal"><header class="lm-inline"><h2>' + e(t('lmThermal')) + '</h2><small>' + e(t('lmUTC')) + '</small></header>' + impulse(market) + '<svg class="lm-week-chart" viewBox="0 0 304 142" role="img" aria-label="' + e(t('lmThermal') + ' · ' + t('lmUTC')) + '"><polygon points="' + area + '" class="lm-corridor"/><polyline points="' + line('B_t') + '" class="lm-baseline"/><polyline points="' + line('U_opt') + '" class="lm-upper"/><polyline points="' + line('U_crit') + '" class="lm-critical"/><polyline points="' + line('C_t') + '" class="lm-actual"/>' + days.map(function (d, i) { return '<circle cx="' + x(i) + '" cy="' + y(d.C_t) + '" r="3"/><text x="' + x(i) + '" y="133" text-anchor="middle">' + e(String(d.day || '').slice(5)) + '</text>'; }).join('') + '</svg><div class="lm-chart-legend"><span class="lm-key-actual">' + e(t('lmActual')) + '</span><span class="lm-key-base">' + e(t('lmBaseline')) + '</span><span class="lm-key-upper">' + e(t('lmCorridor')) + '</span></div>' + thermalStatus(market.thermal) + '<details><summary>' + e(t('lmDetails')) + '</summary><p>' + e(t('lmThermalHint')) + '</p><div class="lm-week-data">' + days.map(function (d) { return '<div><time>' + e(d.day) + '</time><span>C ' + e(n(d.C_t)) + ' · B ' + e(n(d.B_t)) + ' · L ' + e(n(d.L_floor)) + ' · Uopt ' + e(n(d.U_opt)) + ' · Ucrit ' + e(n(d.U_crit)) + ' · P₃d ' + e(n(d.P_3d)) + '</span></div>'; }).join('') + '</div></details><p class="lm-caption">' + e(t('lmSimulation')) + '</p></section>';
    }
    function lever(scoring, appId) {
        var code = scoring.growth_lever && scoring.growth_lever.code;
        var key = code ? code.replace(/^MARKET_/, '').toLowerCase() : '';
        if (/^THERMAL_/.test(code || '')) key = code;
        return '<div class="lm-lever"><strong>' + e(t('lmLever')) + '</strong><span>' + e(t(key ? 'lmLever_' + key : 'lmLeverNone')) + '</span>'+(appId&&window.LiveGuidance?LiveGuidance.forMarket(appId,scoring):'')+'</div>';
    }
    function closeTop() { var s = sheets.pop(); if (!s) return; s.node.remove(); document.body.style.overflow = s.overflow; if (s.focus && s.focus.isConnected) s.focus.focus({preventScroll: true}); if (s.onclose) s.onclose(); if (window.syncTelegramBackButton) window.syncTelegramBackButton(); }
    function sheet(title, body, options) {
        options = options || {}; var layer = document.createElement('div'), id = 'lm-sheet-' + (++serial);
        layer.id = id; layer.className = 'modal-overlay active lm-sheet-overlay'; layer.style.zIndex = Math.max(10000, ...Array.from(document.querySelectorAll('.modal-overlay.active')).map(function(el){return parseInt(getComputedStyle(el).zIndex,10)||0;})) + 10;
        layer.innerHTML = '<section class="project-instructions-sheet lm-sheet" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title"><div class="project-instructions-sheet__handle"></div><header class="lm-sheet-header"><h2 id="' + id + '-title">' + e(title) + '</h2><button type="button" class="lm-icon" data-lm-close aria-label="' + e(t('lmClose')) + '">×</button></header><div class="lm-sheet-body">' + body + '</div></section>';
        sheets.push({node: layer, overflow: document.body.style.overflow, focus: document.activeElement, onclose: options.onclose}); document.body.style.overflow = 'hidden'; document.body.appendChild(layer);
        layer.addEventListener('click', function (ev) { if (ev.target === layer || ev.target.closest('[data-lm-close]')) closeTop(); });
        layer.addEventListener('keydown', function (ev) {
            if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); closeTop(); return; }
            if (ev.key !== 'Tab') return;
            var nodes = Array.from(layer.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),summary,a[href]')).filter(function (el) { return el.getClientRects().length; });
            if (!nodes.length) return;
            if (ev.shiftKey && document.activeElement === nodes[0]) { ev.preventDefault(); nodes[nodes.length - 1].focus(); }
            else if (!ev.shiftKey && document.activeElement === nodes[nodes.length - 1]) { ev.preventDefault(); nodes[0].focus(); }
        });
        layer.querySelector('[data-lm-close]').focus(); if (window.syncTelegramBackButton) window.syncTelegramBackButton(); return layer;
    }
    function auth() { try { return window.getTelegramInitDataRaw() || ''; } catch (_) { return ''; } }
    function api(path, method, body) {
        var base = String(window.API_BASE || '/api').replace(/\/$/, ''), actor = auth();
        if(!actor)return Promise.reject(Object.assign(new Error('unauthorized'),{status:401}));
        return fetch(base + path + (method && method !== 'GET' ? '' : (path.includes('?')?'&':'?')+'init_data=' + encodeURIComponent(actor)), method && method !== 'GET' ? {method: method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(Object.assign({init_data: actor}, body)), cache: 'no-store'} : {cache: 'no-store'}).then(async function (response) {
            var value = await response.json(); if (!response.ok) { var error = new Error(value.code || value.error || 'unavailable'); error.status = response.status; throw error; } return value;
        });
    }
    window.LiveMarketUI = {t:t,e:e,n:n,clamp:clamp,tone:tone,report:report,engagement:engagement,factors:factors,thermal:thermal,thermalStatus:thermalStatus,impulse:impulse,competition:competition,tierBadge:tierBadge,lever:lever,sheet:sheet,closeTop:closeTop,api:api,auth:auth};
})();
