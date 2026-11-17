/* Internal Phase 2 metrics. Never substitute Play ratings or Phase 1 progress. */
(function () {
    'use strict';
    var cache = new Map(), requests = new Map(), revisions = new Map();
    var copy = {
        ru: { title: 'Метрики', phase: 'Фаза 2', reviews: 'Отзывы', installs: 'Установки', installUnit: 'уст.', day: '/ день',
            speedLabel: 'Скорость:',
            activeLabel: 'Активность', retentionLabel: 'Удержание', updateLabel: 'Обновление', daysUnit: 'дн.',
            keywordLead: 'Ключевики',
            more: 'Открыть Пульс', future: 'Пульс проекта временно недоступен.',
            loading: 'Загружаем метрики…', error: 'Метрики временно недоступны', retry: 'Повторить',
            windows: 'Темп и изменение за неделю считаются по завершённым суткам.',
            activeHint: 'Активных — уникальные пользователи с незакрытым подтверждённым Live-слотом. Это учёт платформы, а не телеметрия устройства.',
            retentionHint: 'Удержание — средняя длительность периодов установки, включая завершённые и текущие.',
            boundary: 'Дата активации Live пока не определена.',
        },
        en: { title: 'Metrics', phase: 'Phase 2', reviews: 'Reviews', installs: 'Installs', installUnit: 'installs', day: '/ day',
            speedLabel: 'Speed:',
            activeLabel: 'Activity', retentionLabel: 'Retention', updateLabel: 'Update', daysUnit: 'd',
            keywordLead: 'Keywords',
            more: 'Open Pulse', future: 'Project Pulse is temporarily unavailable.',
            loading: 'Loading Live metrics…', error: 'Metrics temporarily unavailable', retry: 'Retry',
            windows: 'Pace and weekly change use completed days.',
            activeHint: 'Active means unique users with an open verified Live slot. This is platform bookkeeping, not device telemetry.',
            retentionHint: 'Retention is the average installation duration, including ended and current periods.',
            boundary: 'The Live activation date is not available yet.',
        },
    };
    function t(key) { return copy[window.lang === 'ru' ? 'ru' : 'en'][key]; }
    function tr(key, vars) { return window.t(key, vars || {}, window.lang); }
    function esc(item) { return window.escapeHTML(String(item == null ? '' : item)); }
    function num(item, digits) { return Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 }); }
    function compact(item) { return Math.abs(Number(item)) < 10000 ? num(item) : Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { notation: 'compact', maximumSignificantDigits: 3 }); }
    function bandRetention(value) { return value < 7 ? 'risk' : value < 14 ? 'basic' : value < 21 ? 'good' : value < 31 ? 'excellent' : 'superb'; }
    function bandFreshness(value) { return value <= 30 ? 'fresh' : value <= 60 ? 'aging' : 'stale'; }
    function hintAttrs(hint) { return ' data-live-hint="'+esc(hint)+'" title="'+esc(hint)+'" aria-label="'+esc(hint)+'" onclick="LiveProjectMetrics.explain(event)"'; }
    function trend(metric, paceHint) {
        if (!metric || !metric.trend_available) return '';
        var pct = Number(metric.trend_percent) || 0;
        var direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
        var hint = t('windows');
        var glyph = pct > 0 ? '↗ ' : pct < 0 ? '↘ ' : '→ ';
        hint=(paceHint?paceHint+' ':'')+hint;
        return '<button type="button" class="live-metric-trend is-' + direction + '"'+hintAttrs((pct > 0 ? '+' : '') + num(pct,1) + '% · ' + hint)+'>' + glyph + (pct > 0 ? '+' : '') + esc(Math.abs(pct) < 10000 ? num(pct, 1) : compact(pct)) + '%</button>';
    }
    function metricCard(label, main, metric, paceHint, secondary, storefront) {
        var rate = metric ? esc(num(metric.per_day, Number(metric.per_day) ? 1 : 0)) : '';
        return '<div class="live-metric-card live-metric-row">' +
            '<div class="live-metric-card-head">' +
                '<span class="live-metric-card-label">' + esc(label) + '</span>' +
                trend(metric, paceHint) +
            '</div>' +
            '<div class="live-metric-card-main">' + main + '</div>' +
            (secondary || '') +
            (metric ? '<button type="button" class="live-metric-card-sub"'+hintAttrs(paceHint||t('windows'))+'>' +
                '<span class="live-metric-card-speed-label">' + esc(t('speedLabel')) + '</span> ' +
                '<strong class="live-metric-card-speed-val">' + rate + '</strong> ' +
                '<span class="live-metric-card-speed-unit">' + esc(t('day')) + '</span>' +
            '</button>' : '') + (storefront || '') +
        '</div>';
    }
    function legend() {
        return '<button type="button" class="lm-guide-link" data-lm-learn aria-label="' +
            esc(tr('pulseLearnFull')) + '">' + esc(tr('lmGuide')) + ' ›</button>';
    }
    function campaignKeywords(project) {
        var keys = new Map();
        (project.live_campaign_rows || []).forEach(function (campaign) {
            if (campaign.status === 'archived') return;
            var seen = new Set();
            (campaign.keywords || []).forEach(function (entry) {
                var value = String(entry.keyword || '').trim();
                var key = value.replace(/\s+/g, ' ').toLowerCase();
                if (!key || seen.has(key)) return;
                seen.add(key);
                if (!keys.has(key)) keys.set(key, {keyword: value, installs: 0});
                keys.get(key).installs += Number(entry.installs) || 0;
            });
        });
        return Array.from(keys.values()).sort(function (a, b) { return b.installs - a.installs; });
    }
    function newer(a, b) { return a && (!b || Date.parse(a.as_of) >= Date.parse(b.as_of)) ? a : b; }
    function experience(project) {
        var id = Number(project.id || project.app_id), metrics = newer(project.live_metrics, cache.get(id));
        var feedback = metrics?.reviews;
        var values = feedback?.criteria || [];
        var count = feedback?.basis === 'legacy' ? 0 : Number(feedback?.total || 0);
        var labels = [['🎨','lrdrUsability'], ['⚡','lrdrStability'], ['💡','lrdrValue']];
        return '<section class="lc-participant-experience"><header><strong>⭐ '+esc(tr('lcExperienceTitle'))+
            '</strong><small>'+esc(tr(!metrics?'lmWaiting':count?'lcExperienceCount':'lmNoRatings',{n:num(count)}))+'</small></header>'+
            (values.some(function(value){return value!=null;})?'<div class="lc-experience-criteria">'+labels.map(function(label,index){
                return '<div><span>'+label[0]+' '+esc(tr(label[1]))+'</span><b>'+esc(values[index]==null?tr('lcExperienceNoScore'):num(values[index],1)+' ★')+'</b></div>';
            }).join('')+'</div>':'')+
            '<button type="button" class="pc-results-feedback-link" onclick="event.stopPropagation(); openProjectFeedback('+id+',false,{preferUnprocessed:false,typeFilter:\'project_impression\'});">'+esc(tr('lcExperienceRead'))+' <span aria-hidden="true">›</span></button></section>';
    }
    function render(project, failure) {
        var id = Number(project.id || project.app_id), metrics = newer(project.live_metrics, cache.get(id));
        if (metrics && metrics.source !== 'devtesthub_live') metrics = null;
        var quick=window.LiveGuidance?LiveGuidance.quickStart(project,metrics):'';
        var reviews = metrics && metrics.reviews, installs = metrics && metrics.installs;
        var reviewMain = reviews && reviews.rating > 0
            ? esc(num(reviews.rating, 1)) + ' <span class="live-metric-star">★</span> <span class="live-metric-count">(' + esc(compact(reviews.total)) + ')</span>'
            : '<span class="lm-missing">' + esc(tr(reviews ? (reviews.total ? 'lrdrResponses' : 'lmNoRatings') : 'lmWaiting', {n: reviews ? compact(reviews.total) : 0})) + '</span>';
        var installMain = installs ? esc(compact(installs.total)) + ' <span class="live-metric-unit">' + esc(t('installUnit')) + '</span>'
            : '<span class="lm-missing">' + esc(tr('lmWaiting')) + '</span>';
        var retention = metrics && metrics.avg_retention_days, freshness = metrics && metrics.days_since_update;
        var retentionNote=metrics&&metrics.retention_observed_only_count&&window.LiveHistoryImport?window.t('lhiRetentionLower',{},window.lang==='ru'?'ru':'en'):'';
        var keywords = campaignKeywords(project.live_campaign_rows ? project : owner(id));
        var retentionVal = retention == null ? esc(tr('lmWaiting')) : '~' + esc(num(retention, Number.isInteger(retention) ? 0 : 1)) + ' ' + esc(t('daysUnit'));
        var freshnessBand = freshness == null ? 'unknown' : bandFreshness(freshness);
        var freshnessVal = freshness == null ? tr('lmNoRelease') : tr('lmReleaseAgo', {n:num(freshness)});
        var activeHealth = '<div class="live-health-col live-health-active" title="' + esc(t('activeHint') + (metrics ? ' · ' + num(metrics.active_users) : '')) + '">' +
                '<span class="live-health-label">' + esc(t('activeLabel')) + '</span>' +
                '<strong class="live-health-val">' + (metrics ? esc(compact(metrics.active_users)) : esc(tr('lmWaiting'))) + '</strong>' +
            '</div>';
        var health = '<button type="button" class="live-health-badge live-health-info is-' + (retention == null ? 'unknown' : bandRetention(retention)) + '"'+hintAttrs(t('retentionHint')+(retentionNote?' '+retentionNote:''))+'>' +
                '<span class="live-health-label">' + esc(t('retentionLabel')) + '</span>' +
                '<strong class="live-health-val">' + retentionVal + '</strong>' +
            '</button>' +
            '<button type="button" class="live-health-badge live-health-freshness is-' + freshnessBand + '" data-lm-learn="release">' +
                '<span class="live-health-label">' + esc(t('updateLabel')) + '</span>' +
                '<strong class="live-health-val">' + esc(freshnessVal) + '</strong>' +
                (freshness == null ? '' : '<small>' + esc(tr('lmRelease_' + freshnessBand)) + '</small>') +
            '</button>';
        if (window.LiveMarketUI && metrics && metrics.engagement) {
            activeHealth = LiveMarketUI.engagement(metrics.engagement, true);
        }
        health=activeHealth+health;
        var chips = keywords.map(function (entry) {
            return '<span class="live-keyword-chip" title="' + esc(entry.keyword) + '">' +
                '<span class="live-keyword-hash" aria-hidden="true">#</span>' +
                '<span class="live-keyword-name notranslate">' + esc(entry.keyword) + '</span>' +
                '<span class="live-keyword-divider" aria-hidden="true"></span>' +
                '<strong class="live-keyword-installs">' + esc(num(entry.installs)) + '</strong>' +
            '</span>';
        }).join('');
        var aso = !keywords.length ? '' : '<div class="live-metrics-aso">' +
            '<div class="live-keywords-lead">' +
                '<span class="live-keywords-title">' + esc(t('keywordLead')) + '</span>' +
                (keywords.length ? '<span class="live-keywords-count">' + esc(keywords.length) + '</span>' : '') +
            '</div>' +
            '<div class="live-keywords" tabindex="0">' + chips + '</div>' +
        '</div>';
        var paceNote=window.LiveHistoryImport&&installs?window.LiveHistoryImport.pace(installs):'';
        var radar = window.LiveRadarLayers, storefront = metrics && metrics.storefront;
        var section='<section class="live-metrics" aria-label="' + esc(t('title')) + '"><div class="live-metrics-head"><strong>' + esc(t('title')) + '</strong><span>' + esc(t('phase')) + '</span>' + legend() + '</div>' +
            resultBlock(id, metrics, project) +
            '<div class="live-metrics-grid">' + metricCard(radar ? radar.text('lrdrCardTitle') : t('reviews'), reviewMain, reviews, null,
                radar && reviews ? radar.mini(reviews.criteria) : '', radar ? radar.compact(id, storefront, 'rating') : '') +
                metricCard(t('installs'), installMain, installs, paceNote, '', radar ? radar.compact(id, storefront, 'installs') : '') + '</div>' +
            '<div class="live-metrics-health">' + health + '</div>' + aso +
            (failure || !metrics || !metrics.boundary_available
                ? '<div class="live-metrics-footer"><span class="live-metrics-status" role="status">' + (failure ? esc(t('error')) + ' <button type="button" onclick="LiveProjectMetrics.reload(' + id + ',event)">' + esc(t('retry')) + '</button>' : esc(t(!metrics ? 'loading' : 'boundary'))) + '</span></div>' : '') +
            '</section>';
        return quick+section+(window.LiveHistoryImport&&metrics&&!(window.LiveGuidance&&installs&&installs.total<LiveGuidance.target(metrics))?window.LiveHistoryImport.banner(id,metrics.history_import):'');
    }
    function remember(id, metrics) {
        if(window.LiveMarket)LiveMarket.prefetch();
        cache.set(id, metrics);
        var matches = (window.myProjects || []).concat(window.archivedProjects || []).filter(function (project) { return Number(project.id || project.app_id) === id; });
        matches.forEach(function (project) { project.live_metrics = metrics; });
        var owner = matches.find(function (project) { return project.live_campaign_rows || project.live_pace; }) || matches.find(function (project) { return (window.myProjects || []).indexOf(project) >= 0; }) || matches[0];
        if (owner && window.LiveProjectControl) LiveProjectControl.updateStatus(owner, owner.live_pace, owner.live_campaign_rows);
    }
    function update(id, metrics, failure) {
        if (metrics) remember(id, metrics);
        document.querySelectorAll('.live-metrics-slot[data-app-id="' + id + '"]').forEach(function (slot) {
            slot.innerHTML = render({ id: id }, failure);
        });
        document.querySelectorAll('[data-live-experience="' + id + '"]').forEach(function (slot) {
            slot.innerHTML = experience( { id: id } );
        });
    }
    function endpoint(id, suffix) { return String(window.API_BASE || '/api').replace(/\/$/, '') + '/apps/' + id + '/' + suffix; }
    var healthLoads = new Set();
    function ensureHealth(id) {
        if (healthLoads.has(id)) return;
        var current = cache.get(id);
        if (!current || Object.hasOwn(current,'health_score')) return;
        healthLoads.add(id);
        current.health_pending = true;
        update(id, current);
        (async function () {
            try {
                var response = await fetch(endpoint(id, 'live-metrics/analytics') + '?init_data=' + encodeURIComponent(window.getTelegramInitDataRaw()), { cache: 'no-store' });
                var payload = await response.json();
                var score = payload && payload.analytics && payload.analytics.health_score;
                if (response.ok && payload.analytics && payload.analytics.source === 'devtesthub_live') {
                    var fresh = cache.get(id) || current;
                    update(id, Object.assign({}, fresh, { health_score: score, health_delta: payload.analytics.health_delta, health_pending: false }));
                } else if (cache.get(id)) update(id, Object.assign({}, cache.get(id), { health_pending: false }));
            } catch (_) {
                if (cache.get(id)) update(id, Object.assign({}, cache.get(id), { health_pending: false }));
            } finally { healthLoads.delete(id); }
        })();
    }
    function load(id) {
        if (requests.has(id)) return requests.get(id);
        var revision = revisions.get(id) || 0;
        var request = (async function () {
            await Promise.resolve(); // Register the request even when init_data lookup throws.
            try {
                var response = await fetch(endpoint(id, 'live-metrics') + '?init_data=' + encodeURIComponent(window.getTelegramInitDataRaw()), { cache: 'no-store' });
                var data = await response.json();
                if (!response.ok || !data.metrics || data.metrics.source !== 'devtesthub_live') throw new Error('unavailable');
                if (revision === (revisions.get(id) || 0)) {
                    update(id, data.metrics);
                    ensureHealth(id);
                }
            } catch (_) { if (revision === (revisions.get(id) || 0)) update(id, null, true); }
            finally { requests.delete(id); }
        })();
        requests.set(id, request); return request;
    }
    function owner(id) {
        return (window.myProjects || []).concat(window.archivedProjects || []).find(function (project) { return Number(project.id || project.app_id) === Number(id); }) || {};
    }
    function placeOf(id) {
        var project = owner(id), radar = window.LiveMarket && LiveMarket.cardPosition && LiveMarket.cardPosition(id), stored = project.live_market_score || {};
        return {
            rank: radar && radar.rank != null ? radar.rank : stored.rank,
            tier: radar && radar.tier != null ? radar.tier : stored.tier,
            score: radar && radar.score != null ? radar.score : (stored.market_score != null ? stored.market_score : stored.score),
            rankDelta: radar && radar.rankDelta != null ? radar.rankDelta : stored.rank_delta,
            scoreDelta: radar && radar.scoreDelta != null ? radar.scoreDelta : stored.score_delta
        };
    }
    function resultBlock(id, metrics, project) {
        var place = placeOf(id), saved = owner(id);
        var tier = project.live_tier_event || saved.live_tier_event || saved.live_project_control?.tier_event;
        var promoted = tier && Number(tier.from_tier) > Number(tier.to_tier);
        var rankDelta = Number(place.rankDelta) || 0;
        var position = '<button type="button" class="lm-result-tile" data-lm-position="' + id + '">' +
            '<span class="lm-result-kicker">' + esc(tr('lmCatalog')) + '</span><strong>' +
            esc(place.rank != null && place.tier != null ? tr('lmRankTier', {rank:place.rank,tier:place.tier}) : tr('mkPosEmpty')) + '</strong>' +
            (place.score == null ? '' : '<small>' + esc(tr('lmRankScore',{score:num(place.score)})) + '</small>') +
            (rankDelta ? '<b class="lm-delta is-' + (rankDelta > 0 ? 'up' : 'down') + '">' +
                esc(tr(rankDelta > 0 ? 'lmRankUp' : 'lmRankDown', {n:num(Math.abs(rankDelta))})) + '</b>' : '<small class="lm-result-link">' + esc(tr('lmLeagueLink')) + ' ›</small>') +
            '</button>';
        var score = metrics?.health_score, delta = Number(metrics?.health_delta) || 0;
        var status = score >= 80 ? 'good' : score >= 60 ? 'watch' : 'risk';
        var pulse = '<button type="button" class="lm-result-tile" data-lm-health="' + id + '">' +
            '<span class="lm-result-kicker">' + esc(tr('mkHealthTitle')) + '</span><strong>' +
            esc(score == null ? tr(metrics?.health_pending ? 'lmWaiting' : 'lmCalibrating') : tr('mkHealthScore',{score:score})) + '</strong>' +
            (score == null ? '' : '<small class="lm-score-status is-' + status + '">' + esc(tr('lmHealth_' + status)) + '</small>') +
            (score != null && delta ? '<b class="lm-delta is-' + (delta > 0 ? 'up' : 'down') + '">' +
                esc(tr(delta > 0 ? 'mkHealthUp' : 'mkHealthDown', {delta:num(Math.abs(delta))})) + '</b>' : '<small class="lm-result-link">' + esc(tr('lmPulseLink')) + ' ›</small>') +
            '</button>';
        var tierLine = tier ? '<div class="lm-tier-line' + (promoted ? ' is-up' : ' is-down') + '"><span>' + esc(window.t(promoted ? 'lrTierPromoted' : 'lrTierDemoted', { from: tier.from_tier, to: tier.to_tier, score: tier.score }, window.lang)) + '</span><button type="button" data-lr-tier-ack="' + tier.id + '" data-lr-tier-app="' + id + '">' + esc(window.t('mkTierDismiss', {}, window.lang)) + '</button></div>' : '';
        var lost = metrics && metrics.early_exit_impact && Number(metrics.early_exit_impact.points_lost) || 0;
        var early = lost > 0 ? '<button type="button" class="lm-early-chip" data-lm-early="' + id + '">' + esc(window.t('mkEarlyChip', { n: lost }, window.lang)) + '</button><div class="lm-early-body" data-lm-early-body="' + id + '" hidden><button type="button" data-lm-early-close aria-label="✕">✕</button><p>' + esc(window.t('mkEarlyBody', { n: lost }, window.lang)) + '</p></div>' : '';
        return '<section class="lm-result"><header><strong>' + esc(tr('lmGrowthSummary')) + '</strong><small>' +
            esc(tr('lmGrowthSummaryHint')) + '</small></header>' + position + pulse +
            (tierLine || early ? '<div class="lm-result-events">' + tierLine + early + '</div>' : '') + '</section>';
    }
    function openPosition(id) {
        var previous = document.getElementById('lm-position-sheet'); if (previous) previous.remove();
        var place = placeOf(id);
        var moved = place.rankDelta == null && place.scoreDelta == null ? window.t('mkPosNoCut', {}, window.lang) : window.t('mkPosMoved', { places: place.rankDelta || 0, points: place.scoreDelta || 0 }, window.lang);
        var layer = document.createElement('div'); layer.id = 'lm-position-sheet'; layer.className = 'modal-overlay project-instructions-overlay active';
        layer.innerHTML = '<section class="project-instructions-sheet lm-position-sheet" role="dialog" aria-modal="true"><div class="project-instructions-sheet__handle"></div><header class="project-instructions-sheet__head"><h3>' + esc(tr('lmCatalog')) + '</h3><button type="button" class="meta-chip" data-lm-close>✕</button></header><p>' + esc(tr('mkPosSheet')) + '</p><p>' + esc(moved) + '</p><button type="button" class="btn btn-primary" data-lm-radar-go>' + esc(tr('mkPosOpen')) + '</button></section>';
        document.body.appendChild(layer);
        layer.onclick = function (event) {
            if (event.target === layer || event.target.closest('[data-lm-close]')) layer.remove();
            if (event.target.closest('[data-lm-radar-go]')) { layer.remove(); if (window.LiveMarket && LiveMarket.openRadar) LiveMarket.openRadar(id); else if (window.switchTab) window.switchTab('market'); }
        };
    }
    document.addEventListener('click', function (event) {
        var learn = event.target.closest('[data-lm-learn]');
        if (learn && window.LiveCampaignLearning) {
            event.stopPropagation();
            return LiveCampaignLearning.open(learn.dataset.lmLearn, learn);
        }
        var store = event.target.closest('[data-lrdr-open]');
        if (store) {
            event.stopPropagation();
            var id = Number(store.dataset.lrdrId);
            if (store.dataset.lrdrOpen === 'passport' && window.openPlayStorePassport) return window.openPlayStorePassport(id, event);
            if (window.LiveMetricsAnalytics) return LiveMetricsAnalytics.open(id, 'feedback');
        }
        var early = event.target.closest('[data-lm-early]');
        if (early) { event.stopPropagation(); var body = early.parentElement.querySelector('[data-lm-early-body="' + early.dataset.lmEarly + '"]'); if (body) body.hidden = !body.hidden; return; }
        var close = event.target.closest('[data-lm-early-close]');
        if (close) { event.stopPropagation(); var box = close.closest('.lm-early-body'); if (box) box.hidden = true; return; }
        var health = event.target.closest('[data-lm-health]');
        if (health && window.LiveProjectMetrics) { LiveProjectMetrics.details(Number(health.dataset.lmHealth), event); return; }
        var position = event.target.closest('[data-lm-position]');
        if (position) { event.stopPropagation(); openPosition(Number(position.dataset.lmPosition)); }
    });
    window.LiveProjectMetrics = {
        explain: function(event) { if(event)event.stopPropagation();var control=event&&event.currentTarget;var hint=control&&control.dataset.liveHint;if(hint&&window.showToast)window.showToast(hint,10000); },
        render: render,
        experience: experience,
        repaint: function(id){update(Number(id),cache.get(Number(id)));},
        applyPulse: function (id, score, delta) {
            id = Number(id);
            var current = cache.get(id) || (owner(id).live_metrics);
            if (!current || current.source !== 'devtesthub_live') return;
            var next = Object.assign({}, current, { health_score: score, health_pending: false });
            next.health_delta = delta;
            update(id, next);
        },
        mount: function (card, project) {
            var id = Number(project.id || project.app_id), metrics = newer(project.live_metrics, cache.get(id));
            if (metrics && metrics.source === 'devtesthub_live') { remember(id, metrics); ensureHealth(id); return; }
            load(id);
        },
        reload: function (id, event) { if (event) event.stopPropagation(); load(id); },
        details: function (id, event) {
            if (event) event.stopPropagation();
            window.dispatchEvent(new CustomEvent('live-metrics:details', { detail: { appId: id } }));
            if (!window.LiveMetricsAnalytics && window.showToast) window.showToast(t('future'));
        },
    };
    window.addEventListener('play-store:synced', function (event) {
        var id = Number(event.detail && event.detail.appId);
        if (id && document.querySelector('.live-metrics-slot[data-app-id="' + id + '"]')) load(id);
    });
    window.addEventListener('live-storefront:country',function(event){var id=event.detail.appId;if(cache.has(id))update(id,cache.get(id));});
    window.addEventListener('live-history:imported',function(event){var id=Number(event.detail&&event.detail.appId);if(!id)return;revisions.set(id,(revisions.get(id)||0)+1);Promise.resolve(requests.get(id)).finally(function(){load(id);});});
})();
