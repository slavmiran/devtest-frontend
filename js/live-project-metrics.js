/* Internal Phase 2 metrics. Never substitute Play ratings or Phase 1 progress. */
(function () {
    'use strict';
    var cache = new Map(), requests = new Map(), revisions = new Map();
    var copy = {
        ru: { title: 'Метрики', phase: 'Фаза 2', reviews: 'Отзывы', installs: 'Установки', installUnit: 'уст.', day: '/ день',
            speedLabel: 'Скорость:',
            activeLabel: 'Активность', retentionLabel: 'Удержание', updateLabel: 'Обновление', daysUnit: 'дн.',
            keywordLead: 'Ключевики',
            active: 'Активных', update: 'дн. с апдейта', unknownUpdate: 'Нет даты апдейта',
            keyword: 'Ключевики ASO', add: 'Добавить ключевик для ASO', more: 'Подробнее', future: 'Графики Live-метрик появятся здесь позже.',
            loading: 'Загружаем Live-метрик…', error: 'Метрики временно недоступны', retry: 'Повторить',
            save: 'Добавить', cancel: 'Отмена', placeholder: 'Например, калькулятор', saving: 'Сохраняем…',
            saveError: 'Не удалось сохранить ключевик. Попробуйте ещё раз.', limit: 'Можно добавить не больше 20 ключевиков.',
            invalid: 'Введите ключевик длиной от 1 до 80 символов.',
            baseline: 'Нет базы сравнения: WMA предыдущей недели равна нулю.', history: 'Для сравнения нужны 14 полных дней Live.',
            windows: 'WMA: две полные недели UTC, веса от 1 до 7. Сегодня не входит в скорость и тренд.',
            retention: 'Удержание', fresh: 'Свежесть', risk: 'риск', basic: 'минимум', good: 'хорошо', excellent: 'отлично', superb: 'превосходно',
            legend: 'Как читать метрики', source: 'Установки, отзывы и активность — только DevTestHub, Фаза 2. Оценки Google Play сюда не входят.',
            activeHint: 'Активных — уникальные пользователи с незакрытым подтверждённым Live-слотом. Это учёт платформы, а не телеметрия устройства.',
            retentionHint: 'Удержание — средняя длительность периодов установки, включая завершённые и текущие.',
            boundary: 'Дата активации Live пока не определена.',
        },
        en: { title: 'Metrics', phase: 'Phase 2', reviews: 'Reviews', installs: 'Installs', installUnit: 'installs', day: '/ day',
            speedLabel: 'Speed:',
            activeLabel: 'Activity', retentionLabel: 'Retention', updateLabel: 'Update', daysUnit: 'd',
            keywordLead: 'Keywords',
            active: 'Active', update: 'days since update', unknownUpdate: 'No update date',
            keyword: 'ASO keywords', add: 'Add an ASO keyword', more: 'Details', future: 'Live metrics charts will be available here later.',
            loading: 'Loading Live metrics…', error: 'Metrics temporarily unavailable', retry: 'Retry',
            save: 'Add', cancel: 'Cancel', placeholder: 'For example, calculator', saving: 'Saving…',
            saveError: 'Could not save the keyword. Please try again.', limit: 'You can add up to 20 keywords.',
            invalid: 'Enter a keyword between 1 and 80 characters.',
            baseline: 'No comparison baseline: the previous week’s WMA is zero.', history: 'A comparison needs 14 completed Live days.',
            windows: 'WMA: two completed UTC weeks, weighted from 1 to 7. Today is excluded from rate and trend.',
            retention: 'Retention', fresh: 'Freshness', risk: 'risk', basic: 'minimum', good: 'good', excellent: 'excellent', superb: 'superb',
            legend: 'How to read metrics', source: 'Installs, reviews and activity come only from DevTestHub Phase 2. Google Play ratings are excluded.',
            activeHint: 'Active means unique users with an open verified Live slot. This is platform bookkeeping, not device telemetry.',
            retentionHint: 'Retention is the average installation duration, including ended and current periods.',
            boundary: 'The Live activation date is not available yet.',
        },
    };
    function t(key) { return copy[window.lang === 'ru' ? 'ru' : 'en'][key]; }
    function esc(item) { return window.escapeHTML(String(item == null ? '' : item)); }
    function num(item, digits) { return Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 }); }
    function compact(item) { return Math.abs(Number(item)) < 10000 ? num(item) : Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { notation: 'compact', maximumSignificantDigits: 3 }); }
    function bandRetention(value) { return value < 7 ? 'risk' : value < 14 ? 'basic' : value < 21 ? 'good' : value < 31 ? 'excellent' : 'superb'; }
    function bandFreshness(value) { return value <= 30 ? 'fresh' : value <= 60 ? 'aging' : 'stale'; }
    function hintAttrs(hint) { return ' data-live-hint="'+esc(hint)+'" title="'+esc(hint)+'" aria-label="'+esc(hint)+'" onclick="LiveProjectMetrics.explain(event)"'; }
    function trend(metric, paceHint) {
        var pct = metric && metric.trend_available ? Number(metric.trend_percent) || 0 : 0;
        var direction = pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral';
        var hint = metric && metric.trend_reason === 'zero_baseline' ? t('baseline') : metric && metric.trend_reason === 'insufficient_history' ? t('history') : t('windows');
        var glyph = pct > 0 ? '↗ ' : pct < 0 ? '↘ ' : '→ ';
        hint=(paceHint?paceHint+' ':'')+hint;
        return '<button type="button" class="live-metric-trend is-' + direction + '"'+hintAttrs((pct > 0 ? '+' : '') + num(pct,1) + '% · ' + hint)+'>' + glyph + (pct > 0 ? '+' : '') + esc(Math.abs(pct) < 10000 ? num(pct, 1) : compact(pct)) + '%</button>';
    }
    function metricCard(label, main, metric, paceHint) {
        var rate = metric ? esc(num(metric.per_day, 1)) : '—';
        return '<div class="live-metric-card live-metric-row">' +
            '<div class="live-metric-card-head">' +
                '<span class="live-metric-card-label">' + esc(label) + '</span>' +
                trend(metric, paceHint) +
            '</div>' +
            '<div class="live-metric-card-main">' + main + '</div>' +
            '<button type="button" class="live-metric-card-sub"'+hintAttrs(paceHint||t('windows'))+'>' +
                '<span class="live-metric-card-speed-label">' + esc(t('speedLabel')) + '</span> ' +
                '<strong class="live-metric-card-speed-val">' + rate + '</strong> ' +
                '<span class="live-metric-card-speed-unit">' + esc(t('day')) + '</span>' +
            '</button>' +
        '</div>';
    }
    function legend() {
        return '<details class="live-metrics-legend"><summary aria-label="' + esc(t('legend')) + '" title="' + esc(t('legend')) + '">ⓘ</summary><div class="live-metrics-legend-body"><p>' + esc(t('source')) + '</p><p>' + esc(t('windows')) + '</p><p>' + esc(t('activeHint')) + '</p><p>' + esc(t('retentionHint')) + '</p>' +
            '<strong>' + esc(t('retention')) + '</strong><div class="live-metrics-legend-bands">' + ['risk', 'basic', 'good', 'excellent', 'superb'].map(function (band, i) {
                return '<span class="live-health-badge is-' + band + '">' + ['<7d', '7–13d', '14–20d', '21–30d', '31d+'][i].replace('<', '&lt;') + ' · ' + esc(t(band)) + '</span>';
            }).join('') + '</div><strong>' + esc(t('fresh')) + '</strong><div class="live-metrics-legend-bands"><span class="live-health-badge is-fresh">≤30d</span><span class="live-health-badge is-aging">31–60d</span><span class="live-health-badge is-stale">61d+</span></div></div></details>';
    }
    function newer(a, b) { return a && (!b || Date.parse(a.as_of) >= Date.parse(b.as_of)) ? a : b; }
    function render(project, failure) {
        var id = Number(project.id || project.app_id), metrics = newer(project.live_metrics, cache.get(id));
        if (metrics && metrics.source !== 'devtesthub_live') metrics = null;
        var quick=window.LiveGuidance?LiveGuidance.quickStart(project,metrics):'';
        var reviews = metrics && metrics.reviews, installs = metrics && metrics.installs;
        var rating = reviews && reviews.rating != null ? num(reviews.rating, 1) : '—';
        var reviewMain = esc(rating) + '&nbsp;<span class="live-metric-star" aria-hidden="true">★</span>&nbsp;<span class="live-metric-count">(' + (reviews ? esc(compact(reviews.total)) : '—') + ')</span>';
        var installMain = (installs ? esc(compact(installs.total)) : '—') + '&nbsp;<span class="live-metric-unit">' + esc(t('installUnit')) + '</span>';
        var retention = metrics && metrics.avg_retention_days, freshness = metrics && metrics.days_since_update;
        var retentionNote=metrics&&metrics.retention_observed_only_count&&window.LiveHistoryImport?window.t('lhiRetentionLower',{},window.lang==='ru'?'ru':'en'):'';
        var keywords = (metrics && metrics.keywords || []).filter(function(entry){return Number(entry.installs)>0;});
        var retentionVal = retention == null ? '—d' : '~' + esc(num(retention, Number.isInteger(retention) ? 0 : 1)) + 'd';
        var freshnessVal = freshness == null ? '—' : esc(num(freshness)) + '&nbsp;' + esc(t('daysUnit'));
        var activeHealth = '<div class="live-health-col live-health-active" title="' + esc(t('activeHint') + (metrics ? ' · ' + num(metrics.active_users) : '')) + '">' +
                '<span class="live-health-label">' + esc(t('activeLabel')) + '</span>' +
                '<strong class="live-health-val">' + (metrics ? esc(compact(metrics.active_users)) : '—') + '</strong>' +
            '</div>';
        var health = '<button type="button" class="live-health-badge live-health-info is-' + (retention == null ? 'unknown' : bandRetention(retention)) + '"'+hintAttrs(t('retentionHint')+(retentionNote?' '+retentionNote:''))+'>' +
                '<span class="live-health-label">' + esc(t('retentionLabel')) + '</span>' +
                '<strong class="live-health-val">' + retentionVal + '</strong>' +
            '</button>' +
            '<div class="live-health-badge live-health-freshness is-' + (freshness == null ? 'unknown' : bandFreshness(freshness)) + '" title="' + esc(freshness == null ? t('unknownUpdate') : esc(num(freshness)) + ' ' + esc(t('update'))) + '">' +
                '<span class="live-health-label">' + esc(t('updateLabel')) + '</span>' +
                '<strong class="live-health-val">' + freshnessVal + '</strong>' +
            '</div>';
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
        chips += '<button type="button" class="live-keyword-add" onclick="LiveProjectMetrics.addKeyword(' + id + ',event)" aria-label="' + esc(t('add')) + '">+ ' + (keywords.length ? '' : esc(t('add'))) + '</button>';
        var aso = '<div class="live-metrics-aso">' +
            '<div class="live-keywords-lead">' +
                '<span class="live-keywords-title">' + esc(t('keywordLead')) + '</span>' +
                (keywords.length ? '<span class="live-keywords-count">' + esc(keywords.length) + '</span>' : '') +
            '</div>' +
            '<div class="live-keywords" tabindex="0">' + chips + '</div>' +
        '</div>';
        var paceNote=window.LiveHistoryImport&&installs?window.LiveHistoryImport.pace(installs):'';
        var section='<section class="live-metrics" aria-label="' + esc(t('title')) + '"><div class="live-metrics-head"><strong>' + esc(t('title')) + '</strong><span>' + esc(t('phase')) + '</span>' + legend() + '</div>' +
            resultBlock(id, metrics) +
            '<div class="live-metrics-grid">' + metricCard(t('reviews'), reviewMain, reviews) + metricCard(t('installs'), installMain, installs, paceNote) + '</div>' +
            '<div class="live-metrics-health">' + health + '</div>' + aso +
            '<div class="live-metrics-footer"><span class="live-metrics-status" role="status">' + (failure ? esc(t('error')) + ' <button type="button" onclick="LiveProjectMetrics.reload(' + id + ',event)">' + esc(t('retry')) + '</button>' : !metrics ? esc(t('loading')) : !metrics.boundary_available ? esc(t('boundary')) : '') + '</span><button type="button" class="live-metrics-more" onclick="LiveProjectMetrics.details(' + id + ',event)">' + esc(t('more')) + ' ↗</button></div></section>';
        if(quick)section='<details class="lm-fold"><summary><span>'+esc(window.t('lmMetricsFold',{},window.lang))+'</span></summary>'+section+'</details>';
        return quick+(window.LiveTopic?LiveTopic.buttons(id):'')+section+(window.LiveHistoryImport&&metrics&&!(window.LiveGuidance&&installs&&installs.total<LiveGuidance.target(metrics))?window.LiveHistoryImport.banner(id,metrics.history_import):'');
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
            var open = !!slot.querySelector('.lm-fold[open]');
            slot.innerHTML = render({ id: id }, failure);
            if (open) { var fold = slot.querySelector('.lm-fold'); if (fold) fold.open = true; }
        });
    }
    function endpoint(id, suffix) { return String(window.API_BASE || '/api').replace(/\/$/, '') + '/apps/' + id + '/' + suffix; }
    var healthLoads = new Set();
    function ensureHealth(id) {
        if (healthLoads.has(id)) return;
        var current = cache.get(id);
        if (!current || current.health_score != null) return;
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
                if (revision === (revisions.get(id) || 0)) update(id, data.metrics);
                try {
                    var analyticsResponse = await fetch(endpoint(id, 'live-metrics/analytics') + '?init_data=' + encodeURIComponent(window.getTelegramInitDataRaw()), { cache: 'no-store' });
                    var analyticsPayload = await analyticsResponse.json();
                    if (analyticsResponse.ok && analyticsPayload.analytics && revision === (revisions.get(id) || 0)) {
                        data.metrics.health_score = analyticsPayload.analytics.health_score;
                        data.metrics.health_delta = analyticsPayload.analytics.health_delta;
                        update(id, data.metrics);
                    }
                } catch (_) {}
            } catch (_) { if (revision === (revisions.get(id) || 0)) update(id, null, true); }
            finally { requests.delete(id); }
        })();
        requests.set(id, request); return request;
    }
    function addKeyword(id, event) {
        if (event) event.stopPropagation();
        var previous = document.getElementById('live-keyword-dialog'); if (previous) previous.remove();
        var dialog = document.createElement('dialog'); dialog.id = 'live-keyword-dialog'; dialog.className = 'live-keyword-dialog';
        dialog.innerHTML = '<form><h2>' + esc(t('add')) + '</h2><label for="live-keyword-input">' + esc(t('keyword')) + '</label><input id="live-keyword-input" name="keyword" maxlength="80" required autocomplete="off" placeholder="' + esc(t('placeholder')) + '"><p role="alert" hidden></p><div><button type="button" data-cancel>' + esc(t('cancel')) + '</button><button type="submit">' + esc(t('save')) + '</button></div></form>';
        document.body.appendChild(dialog); dialog.showModal();
        dialog.querySelector('[data-cancel]').onclick = function () { dialog.close(); };
        dialog.onclose = function () { dialog.remove(); };
        dialog.querySelector('form').onsubmit = async function (e) {
            e.preventDefault();
            var input = dialog.querySelector('input'), keyword = input.value.trim().replace(/\s+/g, ' ');
            var error = dialog.querySelector('p'), button = dialog.querySelector('[type="submit"]');
            if (!keyword || keyword.length > 80) { error.textContent = t('invalid'); error.hidden = false; return; }
            button.disabled = true; button.textContent = t('saving'); error.hidden = true;
            try {
                var response = await fetch(endpoint(id, 'live-keywords'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ init_data: window.getTelegramInitDataRaw(), keyword: keyword }) });
                var data = await response.json();
                if (!response.ok || !data.metrics) throw new Error(data.error || 'saveError');
                revisions.set(id, (revisions.get(id) || 0) + 1); update(id, data.metrics); dialog.close();
            } catch (err) {
                error.textContent = t(err.message === 'keyword_limit' ? 'limit' : err.message === 'invalid_keyword' ? 'invalid' : 'saveError'); error.hidden = false;
            } finally { button.disabled = false; button.textContent = t('save'); }
        };
        dialog.querySelector('input').focus();
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
    function moveLabel(places, points) {
        if (places == null && points == null) return '<b class="lm-delta is-flat">' + esc(window.t('mkPosUnknown', {}, window.lang)) + '</b>';
        var shift = Number(places) || 0, score = Number(points) || 0;
        if (!shift && !score) return '<b class="lm-delta is-flat">' + esc(window.t('mkPosFlat', {}, window.lang)) + '</b>';
        var up = shift > 0 || (!shift && score > 0);
        return '<b class="lm-delta ' + (up ? 'is-up' : 'is-down') + '">' + esc(window.t(up ? 'mkPosUp' : 'mkPosDown', { places: Math.abs(shift), points: Math.abs(score) }, window.lang)) + '</b>';
    }
    function resultBlock(id, metrics) {
        var place = placeOf(id), project = owner(id);
        var tier = project.live_tier_event || project.live_project_control && project.live_project_control.tier_event;
        var promoted = tier && Number(tier.from_tier) > Number(tier.to_tier);
        var position = '<button type="button" class="lm-result-tile" data-lm-position="' + id + '"><span class="lm-result-kicker">' + esc(window.t('mkPosTitle', {}, window.lang)) + '</span><strong>' + (place.rank != null && place.tier != null ? esc(window.t('mkPosPlace', { rank: place.rank, tier: place.tier }, window.lang)) : esc(window.t('mkPosEmpty', {}, window.lang))) + '</strong><small>' + (place.score != null ? esc(window.t('mkPosScore', { score: place.score }, window.lang)) : '') + '</small>' + moveLabel(place.rankDelta, place.scoreDelta) + '</button>';
        var healthScore = metrics && metrics.health_score, healthDelta = metrics && metrics.health_delta, healthKnown = healthScore != null && healthScore !== '';
        var healthWait = !!(metrics && metrics.health_pending && !healthKnown);
        var healthMove = healthDelta == null ? '<b class="lm-delta is-flat">' + esc(window.t('mkPosUnknown', {}, window.lang)) + '</b>' : !Number(healthDelta) ? '<b class="lm-delta is-flat">' + esc(window.t('mkPosFlat', {}, window.lang)) + '</b>' : '<b class="lm-delta ' + (healthDelta > 0 ? 'is-up' : 'is-down') + '">' + esc(window.t(healthDelta > 0 ? 'mkHealthUp' : 'mkHealthDown', { delta: Math.abs(healthDelta) }, window.lang)) + '</b>';
        var healthValue = healthWait ? '<i class="lm-health-skel" aria-hidden="true"></i>' : healthKnown ? esc(window.t('mkHealthScore', { score: healthScore }, window.lang)) : '—';
        var healthHint = !healthKnown && !healthWait && !(metrics && metrics.installs && Number(metrics.installs.total) > 0) ? '<small>' + esc(window.t('mkHealthEmpty', {}, window.lang)) + '</small>' : '';
        var pulse = '<button type="button" class="lm-result-tile" data-lm-health="' + id + '"><span class="lm-result-kicker">' + esc(window.t('mkHealthTitle', {}, window.lang)) + '</span><strong>' + healthValue + '</strong>' + healthHint + healthMove + '</button>';
        var tierLine = tier ? '<div class="lm-tier-line' + (promoted ? ' is-up' : ' is-down') + '"><span>' + esc(window.t(promoted ? 'lrTierPromoted' : 'lrTierDemoted', { from: tier.from_tier, to: tier.to_tier, score: tier.score }, window.lang)) + '</span><button type="button" data-lr-tier-ack="' + tier.id + '" data-lr-tier-app="' + id + '">' + esc(window.t('mkTierDismiss', {}, window.lang)) + '</button></div>' : '';
        var lost = metrics && metrics.early_exit_impact && Number(metrics.early_exit_impact.points_lost) || 0;
        var early = lost > 0 ? '<button type="button" class="lm-early-chip" data-lm-early="' + id + '">' + esc(window.t('mkEarlyChip', { n: lost }, window.lang)) + '</button><div class="lm-early-body" data-lm-early-body="' + id + '" hidden><button type="button" data-lm-early-close aria-label="✕">✕</button><p>' + esc(window.t('mkEarlyBody', { n: lost }, window.lang)) + '</p></div>' : '';
        return '<div class="lm-result">' + position + pulse + tierLine + early + '</div>';
    }
    function openPosition(id) {
        var previous = document.getElementById('lm-position-sheet'); if (previous) previous.remove();
        var place = placeOf(id);
        var moved = place.rankDelta == null && place.scoreDelta == null ? window.t('mkPosNoCut', {}, window.lang) : window.t('mkPosMoved', { places: place.rankDelta || 0, points: place.scoreDelta || 0 }, window.lang);
        var layer = document.createElement('div'); layer.id = 'lm-position-sheet'; layer.className = 'modal-overlay project-instructions-overlay active';
        layer.innerHTML = '<section class="project-instructions-sheet lm-position-sheet" role="dialog" aria-modal="true"><div class="project-instructions-sheet__handle"></div><header class="project-instructions-sheet__head"><h3>' + esc(window.t('mkPosTitle', {}, window.lang)) + '</h3><button type="button" class="meta-chip" data-lm-close>✕</button></header><p>' + esc(window.t('mkPosSheet', {}, window.lang)) + '</p><p>' + esc(moved) + '</p><button type="button" class="btn btn-primary" data-lm-radar-go>' + esc(window.t('mkPosOpen', {}, window.lang)) + '</button></section>';
        document.body.appendChild(layer);
        layer.onclick = function (event) {
            if (event.target === layer || event.target.closest('[data-lm-close]')) layer.remove();
            if (event.target.closest('[data-lm-radar-go]')) { layer.remove(); if (window.LiveMarket && LiveMarket.openRadar) LiveMarket.openRadar(id); else if (window.switchTab) window.switchTab('market'); }
        };
    }
    document.addEventListener('click', function (event) {
        var early = event.target.closest('[data-lm-early]');
        if (early) { event.stopPropagation(); var body = early.parentElement.querySelector('[data-lm-early-body="' + early.dataset.lmEarly + '"]'); if (body) body.hidden = !body.hidden; return; }
        var close = event.target.closest('[data-lm-early-close]');
        if (close) { event.stopPropagation(); var box = close.closest('.lm-early-body'); if (box) box.hidden = true; return; }
        var health = event.target.closest('[data-lm-health]');
        if (health && window.LiveProjectMetrics) { LiveProjectMetrics.details(health.dataset.lmHealth, event); return; }
        var position = event.target.closest('[data-lm-position]');
        if (position) { event.stopPropagation(); openPosition(Number(position.dataset.lmPosition)); }
    });
    window.LiveProjectMetrics = {
        explain: function(event) { if(event)event.stopPropagation();var control=event&&event.currentTarget;var hint=control&&control.dataset.liveHint;if(hint&&window.showToast)window.showToast(hint,10000); },
        render: render,
        repaint: function(id){update(Number(id),cache.get(Number(id)));},
        applyPulse: function (id, score, delta) {
            id = Number(id);
            var current = cache.get(id) || (owner(id).live_metrics);
            if (!current || current.source !== 'devtesthub_live') return;
            var next = Object.assign({}, current, { health_score: score, health_pending: false });
            if (delta != null) next.health_delta = delta;
            update(id, next);
        },
        mount: function (card, project) {
            var id = Number(project.id || project.app_id), metrics = newer(project.live_metrics, cache.get(id));
            if (metrics && metrics.source === 'devtesthub_live') { remember(id, metrics); if (metrics.health_score == null) ensureHealth(id); return; }
            load(id);
        },
        reload: function (id, event) { if (event) event.stopPropagation(); load(id); },
        addKeyword: addKeyword,
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
    window.addEventListener('live-history:imported',function(event){var id=Number(event.detail&&event.detail.appId);if(!id)return;revisions.set(id,(revisions.get(id)||0)+1);Promise.resolve(requests.get(id)).finally(function(){load(id);});});
})();
