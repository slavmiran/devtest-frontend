/* ==========================================================================
   Project Results & Coverage Mechanics (DevTestHub)
   ========================================================================== */

(function () {
    'use strict';

    // ── Local Seen State Management ──

    function _getSeenStorageKey(appId) {
        return 'results_seen_' + String(appId || 0);
    }

    function getProjectResultsSeenState(appId) {
        if (!appId) return { seen_tuples: [], seen_countries: [] };
        try {
            var raw = localStorage.getItem(_getSeenStorageKey(appId));
            if (!raw) return { seen_tuples: [], seen_countries: [] };
            var parsed = JSON.parse(raw);
            return {
                seen_tuples: Array.isArray(parsed.seen_tuples) ? parsed.seen_tuples : [],
                seen_countries: Array.isArray(parsed.seen_countries) ? parsed.seen_countries : []
            };
        } catch (e) {
            return { seen_tuples: [], seen_countries: [] };
        }
    }

    function saveProjectResultsSeenState(appId, state) {
        if (!appId) return;
        try {
            localStorage.setItem(_getSeenStorageKey(appId), JSON.stringify({
                seen_tuples: Array.isArray(state.seen_tuples) ? state.seen_tuples : [],
                seen_countries: Array.isArray(state.seen_countries) ? state.seen_countries : []
            }));
        } catch (e) {}
    }

    function markProjectCoverageSeen(appId, coverageSummaryOrData) {
        if (!appId || !coverageSummaryOrData) return;
        var current = getProjectResultsSeenState(appId);
        var seenTuplesMap = {};
        current.seen_tuples.forEach(function (t) {
            seenTuplesMap[String(t[0]) + '::' + String(t[1])] = true;
        });
        var seenCountriesMap = {};
        current.seen_countries.forEach(function (c) {
            seenCountriesMap[String(c).toUpperCase()] = true;
        });

        // 1. From coverage tuples
        var tuples = coverageSummaryOrData.coverage_tuples;
        if (Array.isArray(tuples)) {
            tuples.forEach(function (t) {
                var key = String(t[0]) + '::' + String(t[1]);
                if (!seenTuplesMap[key]) {
                    seenTuplesMap[key] = true;
                    current.seen_tuples.push(t);
                }
            });
        }

        // 2. From models list (if full coverage payload)
        if (Array.isArray(coverageSummaryOrData.models)) {
            coverageSummaryOrData.models.forEach(function (m) {
                var mKey = m.model_key || (m.model_name || '').toLowerCase();
                (m.android_major_versions || []).forEach(function (v) {
                    var key = mKey + '::' + String(v);
                    if (!seenTuplesMap[key]) {
                        seenTuplesMap[key] = true;
                        current.seen_tuples.push([mKey, v]);
                    }
                });
            });
        }

        // 3. From countries list
        var countries = coverageSummaryOrData.countries_list;
        if (Array.isArray(countries)) {
            countries.forEach(function (c) {
                var cUpper = String(c).toUpperCase();
                if (!seenCountriesMap[cUpper]) {
                    seenCountriesMap[cUpper] = true;
                    current.seen_countries.push(cUpper);
                }
            });
        }
        if (Array.isArray(coverageSummaryOrData.countries)) {
            coverageSummaryOrData.countries.forEach(function (c) {
                if (c && c.code && c.code !== 'unknown') {
                    var cUpper = String(c.code).toUpperCase();
                    if (!seenCountriesMap[cUpper]) {
                        seenCountriesMap[cUpper] = true;
                        current.seen_countries.push(cUpper);
                    }
                }
            });
        }

        saveProjectResultsSeenState(appId, current);

        // Refresh Results blocks on visible project card
        var card = document.getElementById('project-card-' + appId);
        if (card && typeof window.myProjects !== 'undefined') {
            var prj = window.myProjects.find(function (p) {
                return Number(p.app_id || p.id) === Number(appId);
            });
            if (prj) {
                var expandedBlock = card.querySelector('.pc-results-block-slot');
                if (expandedBlock) {
                    expandedBlock.innerHTML = buildProjectResultsBlock(prj);
                }
                var collapsedBlock = card.querySelector('.pc-results-collapsed-slot');
                if (collapsedBlock) {
                    collapsedBlock.innerHTML = buildProjectResultsCollapsed(prj);
                }
            }
        }
    }

    function getProjectCoverageUnseenCounts(project) {
        var appId = Number(project.app_id || project.id || 0);
        var summary = project.results_summary || {};
        var seen = getProjectResultsSeenState(appId);

        var seenTuplesMap = {};
        seen.seen_tuples.forEach(function (t) {
            seenTuplesMap[String(t[0]) + '::' + String(t[1])] = true;
        });
        var seenCountriesMap = {};
        seen.seen_countries.forEach(function (c) {
            seenCountriesMap[String(c).toUpperCase()] = true;
        });

        var currentTuples = Array.isArray(summary.coverage_tuples) ? summary.coverage_tuples : [];
        var unseenCoverageCount = 0;
        currentTuples.forEach(function (t) {
            var key = String(t[0]) + '::' + String(t[1]);
            if (!seenTuplesMap[key]) {
                unseenCoverageCount++;
            }
        });

        var currentCountries = Array.isArray(summary.countries_list) ? summary.countries_list : [];
        var unseenCountriesCount = 0;
        currentCountries.forEach(function (c) {
            var cUpper = String(c).toUpperCase();
            if (!seenCountriesMap[cUpper]) {
                unseenCountriesCount++;
            }
        });

        var newBugs = Number(project.bugs_new_count || summary.bugs_new_count || 0);
        var newIdeas = Number(project.ideas_new_count || summary.ideas_new_count || 0);
        var newReviews = Number(project.reviews_new_count || summary.reviews_new_count || 0);

        var totalNew = unseenCoverageCount + unseenCountriesCount + newBugs + newIdeas + newReviews;

        return {
            newCoverage: unseenCoverageCount,
            newCountries: unseenCountriesCount,
            newBugs: newBugs,
            newIdeas: newIdeas,
            newReviews: newReviews,
            hasNew: totalNew > 0
        };
    }

    // ── Pluralization and Format Helpers ──

    function formatPluralRu(n, one, few, many) {
        n = Math.abs(n) % 100;
        var n1 = n % 10;
        if (n > 10 && n < 20) return many;
        if (n1 > 1 && n1 < 5) return few;
        if (n1 === 1) return one;
        return many;
    }

    function formatCalmSummary(summary, lang) {
        var parts = [];
        var mCount = Number(summary.models_count || 0);
        if (mCount > 0) {
            var mWord = lang === 'ru'
                ? formatPluralRu(mCount, 'модель', 'модели', 'моделей')
                : (mCount === 1 ? 'model' : 'models');
            parts.push(mCount + ' ' + mWord);
        }
        if (summary.android_range) {
            parts.push(summary.android_range);
        }
        var cCount = Number(summary.countries_count || 0);
        if (cCount > 0) {
            var cWord = lang === 'ru'
                ? formatPluralRu(cCount, 'страна', 'страны', 'стран')
                : (cCount === 1 ? 'country' : 'countries');
            parts.push(cCount + ' ' + cWord);
        }
        return parts.join(' · ');
    }

    // ── Card Results Block Builder (Expanded Card) ──

    function buildProjectResultsBlock(project) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        var appId = Number(project.app_id || project.id || 0);
        var summary = project.results_summary || {};
        var modelsCount = Number(summary.models_count || 0);
        var totalFeedback = Number(project.feedback_total_count || 0);

        // 1. Early / Empty State (project just started, no data yet)
        if (modelsCount === 0 && totalFeedback === 0) {
            return (
                '<div class="pc-results-block pc-results-block--empty" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                    '<span class="pc-results-empty-icon" aria-hidden="true">📊</span>' +
                    '<span class="pc-results-empty-text">' +
                        window.escapeHTML(window.t('pcResultsEmpty', {}, lang) || 'Результаты появятся по мере тестирования') +
                    '</span>' +
                '</div>'
            );
        }

        var unseen = getProjectCoverageUnseenCounts(project);

        // 2. Active New Events State (new coverage, new countries, bugs, ideas, reviews)
        if (unseen.hasNew) {
            var chips = [];
            if (unseen.newCoverage > 0) {
                chips.push(
                    '<button type="button" class="pc-results-chip pc-results-chip--coverage" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');" title="' + window.escapeHTML(window.t('pcResultsChipCoverageTitle', {}, lang) || 'Новое покрытие устройствами') + '">' +
                        '<span class="pc-results-chip__icon" aria-hidden="true">📱</span>' +
                        '<span class="pc-results-chip__val">+' + unseen.newCoverage + '</span>' +
                        '<span class="pc-results-chip__label">' + window.escapeHTML(window.t('pcResultsChipCoverage', {}, lang) || 'Покрытие') + '</span>' +
                    '</button>'
                );
            }
            if (unseen.newCountries > 0) {
                chips.push(
                    '<button type="button" class="pc-results-chip pc-results-chip--country" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ', \'countries\');" title="' + window.escapeHTML(window.t('pcResultsChipCountryTitle', {}, lang) || 'Новые страны тестирования') + '">' +
                        '<span class="pc-results-chip__icon" aria-hidden="true">🌍</span>' +
                        '<span class="pc-results-chip__val">+' + unseen.newCountries + '</span>' +
                        '<span class="pc-results-chip__label">' + window.escapeHTML(window.t('pcResultsChipCountry', {}, lang) || 'Страна') + '</span>' +
                    '</button>'
                );
            }
            if (unseen.newBugs > 0) {
                chips.push(
                    '<button type="button" class="pc-results-chip pc-results-chip--bug" onclick="event.stopPropagation(); openProjectResultsFeedback(' + appId + ', \'bug\');" title="' + window.escapeHTML(window.t('pcResultsChipBugsTitle', {}, lang) || 'Новые баги') + '">' +
                        '<span class="pc-results-chip__icon" aria-hidden="true">🐞</span>' +
                        '<span class="pc-results-chip__val">+' + unseen.newBugs + '</span>' +
                        '<span class="pc-results-chip__label">' + window.escapeHTML(window.t('pcResultsChipBug', {}, lang) || 'Баг') + '</span>' +
                    '</button>'
                );
            }
            if (unseen.newIdeas > 0) {
                chips.push(
                    '<button type="button" class="pc-results-chip pc-results-chip--idea" onclick="event.stopPropagation(); openProjectResultsFeedback(' + appId + ', \'idea\');" title="' + window.escapeHTML(window.t('pcResultsChipIdeasTitle', {}, lang) || 'Новые предложения и идеи') + '">' +
                        '<span class="pc-results-chip__icon" aria-hidden="true">💡</span>' +
                        '<span class="pc-results-chip__val">+' + unseen.newIdeas + '</span>' +
                        '<span class="pc-results-chip__label">' + window.escapeHTML(window.t('pcResultsChipIdea', {}, lang) || 'Идеи') + '</span>' +
                    '</button>'
                );
            }
            if (unseen.newReviews > 0) {
                chips.push(
                    '<button type="button" class="pc-results-chip pc-results-chip--review" onclick="event.stopPropagation(); openProjectResultsFeedback(' + appId + ', \'google_play\');" title="' + window.escapeHTML(window.t('pcResultsChipReviewsTitle', {}, lang) || 'Новые отзывы Google Play') + '">' +
                        '<span class="pc-results-chip__icon" aria-hidden="true">★</span>' +
                        '<span class="pc-results-chip__val">+' + unseen.newReviews + '</span>' +
                        '<span class="pc-results-chip__label">' + window.escapeHTML(window.t('pcResultsChipReview', {}, lang) || 'Отзыв') + '</span>' +
                    '</button>'
                );
            }

            return '<div class="pc-results-block pc-results-block--badges">' + chips.join('') + '</div>';
        }

        // 3. Calm Summary State (all seen, calm overview)
        var calmText = formatCalmSummary(summary, lang) || (window.t('pcResultsEmpty', {}, lang) || 'Результаты появятся по мере тестирования');
        return (
            '<button type="button" class="pc-results-block pc-results-block--calm" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                '<span class="pc-results-calm__text">' + window.escapeHTML(calmText) + '</span>' +
                '<svg class="pc-results-calm__chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
            '</button>'
        );
    }

    // ── Collapsed Card Results Builder (Ultra-compact) ──

    function buildProjectResultsCollapsed(project) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        var appId = Number(project.app_id || project.id || 0);
        var summary = project.results_summary || {};
        var modelsCount = Number(summary.models_count || 0);
        var totalFeedback = Number(project.feedback_total_count || 0);

        if (modelsCount === 0 && totalFeedback === 0) {
            return (
                '<button type="button" class="pc-results-collapsed" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                    '<span class="pc-results-collapsed__text">' +
                        window.escapeHTML(window.t('pcResultsEmpty', {}, lang) || 'Результаты появятся по мере тестирования') +
                    '</span>' +
                '</button>'
            );
        }

        var unseen = getProjectCoverageUnseenCounts(project);
        if (unseen.hasNew) {
            var items = [];
            if (unseen.newCoverage > 0) items.push('<span class="pc-results-collapsed__item">📱 +' + unseen.newCoverage + '</span>');
            if (unseen.newCountries > 0) items.push('<span class="pc-results-collapsed__item">🌍 +' + unseen.newCountries + '</span>');
            if (unseen.newBugs > 0) items.push('<span class="pc-results-collapsed__item">🐞 +' + unseen.newBugs + '</span>');
            if (unseen.newIdeas > 0) items.push('<span class="pc-results-collapsed__item">💡 +' + unseen.newIdeas + '</span>');
            if (unseen.newReviews > 0) items.push('<span class="pc-results-collapsed__item">★ +' + unseen.newReviews + '</span>');

            return (
                '<button type="button" class="pc-results-collapsed pc-results-collapsed--badges" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                    items.join('<span class="pc-results-collapsed__sep">·</span>') +
                '</button>'
            );
        }

        var calmParts = [];
        if (modelsCount > 0) {
            var mWord = lang === 'ru'
                ? formatPluralRu(modelsCount, 'модель', 'модели', 'моделей')
                : (modelsCount === 1 ? 'model' : 'models');
            calmParts.push(modelsCount + ' ' + mWord);
        }
        if (summary.android_range) calmParts.push(summary.android_range);

        var calmLine = calmParts.join(' · ') || (window.t('pcResultsEmpty', {}, lang) || 'Результаты появятся по мере тестирования');
        return (
            '<button type="button" class="pc-results-collapsed" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                '<span class="pc-results-collapsed__text">' + window.escapeHTML(calmLine) + '</span>' +
            '</button>'
        );
    }

    // ── Open Feedback filtered from Results block ──

    function openProjectResultsFeedback(appId, typeFilter) {
        if (typeof window.openProjectFeedback === 'function') {
            window.openProjectFeedback(appId, false, {
                preferUnprocessed: true,
                typeFilter: typeFilter
            });
        }
        if (typeof window.filterFeedback === 'function') {
            setTimeout(function () {
                window.filterFeedback(typeFilter);
            }, 60);
        }
    }

    // ── Full Coverage Screen State & Modal ──

    var _activeCoverageAppId = 0;
    var _activeCoverageScope = 'current';
    var _activeCoverageTab = 'models';
    var _activeCoverageData = null;
    var _expandedModelKeys = {};
    var _coverageMemoryCache = {}; // key: appId + ':' + scope -> { data: ..., timestamp: ... }

    function _getCoverageMediaUrl(fileIdOrPath) {
        if (!fileIdOrPath || typeof fileIdOrPath !== 'string') return '';
        var trimmed = fileIdOrPath.trim();
        if (!trimmed) return '';
        if (trimmed.indexOf('blob:') === 0 || /^https?:\/\//i.test(trimmed)) return trimmed;

        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : '');
        var cleanBase = String(apiBase || '').trim().replace(/\/+$/, '');
        if (!cleanBase) cleanBase = '/api';

        var fileId = trimmed;
        var marker = 'telegram-media/';
        var idx = fileId.indexOf(marker);
        if (idx >= 0) {
            fileId = fileId.slice(idx + marker.length).replace(/^\/+/, '');
        } else {
            fileId = fileId.replace(/^\/+/, '');
        }

        if (/\/api$/i.test(cleanBase)) {
            return cleanBase + '/telegram-media/' + encodeURIComponent(fileId);
        }
        return cleanBase + '/api/telegram-media/' + encodeURIComponent(fileId);
    }

    async function fetchProjectCoverage(appId, scope) {
        var queryScope = (scope === 'all') ? 'all' : 'current';
        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : '');
        var cleanBase = String(apiBase || '').trim().replace(/\/+$/, '');
        if (!cleanBase) {
            cleanBase = '/api';
        }
        var url = cleanBase + '/projects/' + Number(appId) + '/coverage?scope=' + encodeURIComponent(queryScope);

        var initData = typeof window.getTelegramInitDataRaw === 'function'
            ? window.getTelegramInitDataRaw()
            : ((typeof getTelegramInitDataRaw === 'function')
                ? getTelegramInitDataRaw()
                : ((window.tg && window.tg.initData) || (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || ''));

        if (initData) {
            url += (url.indexOf('?') >= 0 ? '&' : '?') + 'init_data=' + encodeURIComponent(initData);
        }

        var headers = {
            'Accept': 'application/json'
        };
        if (initData) {
            headers['X-Telegram-Init-Data'] = initData;
        }

        var response;
        if (typeof fetchWithRetry === 'function') {
            response = await fetchWithRetry(url, { headers: headers, timeoutMs: 15000 }, 1);
        } else {
            response = await fetch(url, { headers: headers });
        }

        if (!response.ok) {
            var errorDetail = '';
            try {
                var errJson = await response.json();
                errorDetail = (errJson && (errJson.detail || errJson.message || errJson.code)) || '';
            } catch (_) {}
            throw new Error((errorDetail ? errorDetail + ' ' : '') + '(HTTP ' + response.status + ')');
        }

        var data = await response.json();
        if (data.status !== 'ok' || !data.coverage) {
            throw new Error(data.message || data.detail || 'Invalid coverage response');
        }
        return data.coverage;
    }

    async function openProjectCoverage(appId, initialTab, options) {
        var targetAppId = Number(appId || 0);
        if (targetAppId <= 0) return;
        if (targetAppId !== _activeCoverageAppId) {
            _activeCoverageScope = 'current';
        }
        _activeCoverageAppId = targetAppId;

        if (initialTab && (initialTab === 'countries' || initialTab === 'android' || initialTab === 'models')) {
            _activeCoverageTab = initialTab;
        } else {
            _activeCoverageTab = 'models';
        }

        var modal = document.getElementById('project-coverage-modal');
        var body = document.getElementById('project-coverage-body');
        if (!modal || !body) return;

        modal.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();

        // Mark seen in local storage right upon opening
        var project = (typeof myProjects !== 'undefined' ? myProjects : []).find(function (p) {
            return Number(p.app_id || p.id) === _activeCoverageAppId;
        });
        if (project && project.results_summary) {
            markProjectCoverageSeen(_activeCoverageAppId, project.results_summary);
        }

        var cacheKey = String(_activeCoverageAppId) + ':' + String(_activeCoverageScope);
        var cached = _coverageMemoryCache[cacheKey];
        var forceReload = !!(options && options.forceReload);

        if (cached && cached.data) {
            _activeCoverageData = cached.data;
            markProjectCoverageSeen(_activeCoverageAppId, cached.data);
            renderCoverageScreen(body, cached.data);

            var ageMs = Date.now() - (cached.timestamp || 0);
            if (ageMs < 60000 && !forceReload) {
                return;
            }

            // Stale-While-Revalidate: background refresh without flicker
            fetchProjectCoverage(_activeCoverageAppId, _activeCoverageScope).then(function (fresh) {
                _coverageMemoryCache[cacheKey] = { data: fresh, timestamp: Date.now() };
                if (_activeCoverageAppId === targetAppId) {
                    _activeCoverageData = fresh;
                    markProjectCoverageSeen(_activeCoverageAppId, fresh);
                    renderCoverageScreen(body, fresh);
                }
            }).catch(function (e) {
                console.warn('Background coverage revalidation failed:', e);
            });
            return;
        }

        renderCoverageLoading(body);

        try {
            var coverage = await fetchProjectCoverage(_activeCoverageAppId, _activeCoverageScope);
            _coverageMemoryCache[cacheKey] = { data: coverage, timestamp: Date.now() };
            _activeCoverageData = coverage;
            markProjectCoverageSeen(_activeCoverageAppId, coverage);
            renderCoverageScreen(body, coverage);
        } catch (err) {
            console.error('Failed to load project coverage:', err);
            renderCoverageError(body, err);
        }
    }

    function closeProjectCoverageModal(event) {
        if (event && event.target && event.target !== document.getElementById('project-coverage-modal')) return;
        var modal = document.getElementById('project-coverage-modal');
        if (modal) modal.classList.remove('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }

    function renderCoverageLoading(container) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        container.innerHTML = (
            '<div class="coverage-header">' +
                '<div class="coverage-header__top">' +
                    '<div class="coverage-header__brand">' +
                        '<button type="button" class="coverage-header__back-btn" onclick="closeProjectCoverageModal()" aria-label="Back">←</button>' +
                        '<div class="coverage-header__title-wrap">' +
                            '<div class="coverage-header__title">' + window.escapeHTML(window.t('coverageTitle', {}, lang) || 'Покрытие проекта') + '</div>' +
                            '<div class="coverage-header__subtitle">' + window.escapeHTML(window.t('coverageLoading', {}, lang) || 'Загрузка…') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" class="coverage-header__close" onclick="closeProjectCoverageModal()" aria-label="Close">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="coverage-body">' +
                '<div class="coverage-skeleton">' +
                    '<div class="coverage-skeleton-card"></div>' +
                    '<div class="coverage-skeleton-card"></div>' +
                    '<div class="coverage-skeleton-card"></div>' +
                '</div>' +
            '</div>'
        );
    }

    function renderCoverageError(container, error) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        var errMsg = error && (error.message || error.statusText || String(error));
        container.innerHTML = (
            '<div class="coverage-header">' +
                '<div class="coverage-header__top">' +
                    '<div class="coverage-header__brand">' +
                        '<button type="button" class="coverage-header__back-btn" onclick="closeProjectCoverageModal()" aria-label="Back">←</button>' +
                        '<div class="coverage-header__title-wrap">' +
                            '<div class="coverage-header__title">' + window.escapeHTML(window.t('coverageTitle', {}, lang) || 'Покрытие проекта') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" class="coverage-header__close" onclick="closeProjectCoverageModal()" aria-label="Close">✕</button>' +
                '</div>' +
            '</div>' +
            '<div class="coverage-body" style="text-align: center; padding: 40px 16px;">' +
                '<div style="font-size: 32px; margin-bottom: 12px;">⚠️</div>' +
                '<div style="font-size: 15px; font-weight: 600; color: #f87171; margin-bottom: 8px;">' +
                    window.escapeHTML(window.t('coverageLoadError', {}, lang) || 'Не удалось загрузить данные покрытия') +
                '</div>' +
                (errMsg ? '<div style="font-size: 12px; color: #94a3b8; margin-bottom: 16px; word-break: break-all;">' + window.escapeHTML(errMsg) + '</div>' : '') +
                '<button type="button" class="btn btn-secondary" onclick="openProjectCoverage(' + _activeCoverageAppId + ', null, {forceReload: true})">' +
                    window.escapeHTML(window.t('coverageRetry', {}, lang) || 'Повторить') +
                '</button>' +
            '</div>'
        );
    }

    function renderCoverageScreen(container, data) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        var stats = data.stats || {};
        var models = data.models || [];
        var androidVersions = data.android_versions || [];
        var countries = data.countries || [];

        // Stat bar line
        var statParts = [];
        var mCount = stats.models_count || 0;
        var mWord = lang === 'ru'
            ? formatPluralRu(mCount, 'модель', 'модели', 'моделей')
            : (mCount === 1 ? 'model' : 'models');
        statParts.push(mCount + ' ' + mWord);

        if (stats.android_range) statParts.push(stats.android_range);

        var cCount = stats.countries_count || 0;
        var cWord = lang === 'ru'
            ? formatPluralRu(cCount, 'страна', 'страны', 'стран')
            : (cCount === 1 ? 'country' : 'countries');
        statParts.push(cCount + ' ' + cWord);

        var sCount = stats.screenshots_count || 0;
        var sWord = lang === 'ru'
            ? formatPluralRu(sCount, 'скриншот', 'скриншота', 'скриншотов')
            : (sCount === 1 ? 'screenshot' : 'screenshots');
        statParts.push(sCount + ' ' + sWord);

        var statBarHtml = statParts.join(' <span class="coverage-stat-bar__sep">·</span> ');

        var iconUrl = data.icon_url ? (typeof resolveIconUrl === 'function' ? resolveIconUrl(data.icon_url) : _getCoverageMediaUrl(data.icon_url)) : '';
        var firstLetter = window.escapeHTML(String(data.name || 'P').charAt(0).toUpperCase());
        var iconHtml = (
            '<div style="position:relative; width:34px; height:34px; flex-shrink:0;">' +
                (iconUrl
                    ? '<img class="coverage-header__icon" src="' + window.escapeHTML(iconUrl) + '" alt="" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';">'
                    : '') +
                '<div class="coverage-header__icon coverage-header__icon--fallback" style="display:' + (iconUrl ? 'none' : 'flex') + ';">' + firstLetter + '</div>' +
            '</div>'
        );

        container.innerHTML = (
            '<div class="coverage-header">' +
                '<div class="coverage-header__top">' +
                    '<div class="coverage-header__brand">' +
                        '<button type="button" class="coverage-header__back-btn" onclick="closeProjectCoverageModal()" aria-label="Back">←</button>' +
                        iconHtml +
                        '<div class="coverage-header__title-wrap">' +
                            '<div class="coverage-header__title notranslate">' + window.escapeHTML(data.name || 'Project') + '</div>' +
                            '<div class="coverage-header__subtitle">' + window.escapeHTML(window.t('coverageTitle', {}, lang) || 'Покрытие проекта') + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" class="coverage-header__close" onclick="closeProjectCoverageModal()" aria-label="Close">✕</button>' +
                '</div>' +
                '<div class="coverage-scope-switcher">' +
                    '<button type="button" class="coverage-scope-btn ' + (_activeCoverageScope === 'current' ? 'is-active' : '') + '" onclick="toggleCoverageScope(\'current\')">' +
                        window.escapeHTML(window.t('coverageScopeCurrent', {}, lang) || 'Текущая итерация') +
                    '</button>' +
                    '<button type="button" class="coverage-scope-btn ' + (_activeCoverageScope === 'all' ? 'is-active' : '') + '" onclick="toggleCoverageScope(\'all\')">' +
                        window.escapeHTML(window.t('coverageScopeAll', {}, lang) || 'За всё время') +
                    '</button>' +
                '</div>' +
                '<div class="coverage-stat-bar">' + statBarHtml + '</div>' +
            '</div>' +
            '<div class="coverage-tabs">' +
                '<button type="button" id="cov-tab-btn-models" class="coverage-tab-btn ' + (_activeCoverageTab === 'models' ? 'is-active' : '') + '" onclick="switchCoverageTab(\'models\')">' +
                    window.escapeHTML(window.t('coverageTabModels', {}, lang) || 'Модели') +
                    ' <span class="coverage-tab-badge">' + models.length + '</span>' +
                '</button>' +
                '<button type="button" id="cov-tab-btn-android" class="coverage-tab-btn ' + (_activeCoverageTab === 'android' ? 'is-active' : '') + '" onclick="switchCoverageTab(\'android\')">' +
                    'Android <span class="coverage-tab-badge">' + androidVersions.length + '</span>' +
                '</button>' +
                '<button type="button" id="cov-tab-btn-countries" class="coverage-tab-btn ' + (_activeCoverageTab === 'countries' ? 'is-active' : '') + '" onclick="switchCoverageTab(\'countries\')">' +
                    window.escapeHTML(window.t('coverageTabCountries', {}, lang) || 'Страны') +
                    ' <span class="coverage-tab-badge">' + countries.length + '</span>' +
                '</button>' +
            '</div>' +
            '<div class="coverage-body">' +
                '<div id="coverage-tab-panel-models" class="coverage-tab-panel" style="display:' + (_activeCoverageTab === 'models' ? 'block' : 'none') + ';">' +
                    renderModelsTab(models, lang) +
                '</div>' +
                '<div id="coverage-tab-panel-android" class="coverage-tab-panel" style="display:' + (_activeCoverageTab === 'android' ? 'block' : 'none') + ';">' +
                    renderAndroidTab(androidVersions, lang) +
                '</div>' +
                '<div id="coverage-tab-panel-countries" class="coverage-tab-panel" style="display:' + (_activeCoverageTab === 'countries' ? 'block' : 'none') + ';">' +
                    renderCountriesTab(countries, lang) +
                '</div>' +
            '</div>'
        );
    }

    function toggleCoverageScope(scope) {
        _activeCoverageScope = scope;
        openProjectCoverage(_activeCoverageAppId);
    }

    function switchCoverageTab(tab) {
        _activeCoverageTab = tab;
        var tabs = ['models', 'android', 'countries'];
        tabs.forEach(function (t) {
            var panel = document.getElementById('coverage-tab-panel-' + t);
            if (panel && panel.style) panel.style.display = (t === tab ? 'block' : 'none');
            var btn = document.getElementById('cov-tab-btn-' + t);
            if (btn) {
                if (t === tab) btn.classList.add('is-active');
                else btn.classList.remove('is-active');
            }
        });
    }

    function toggleCoverageModelExpand(modelKey) {
        _expandedModelKeys[modelKey] = !_expandedModelKeys[modelKey];
        var card = document.getElementById('cov-model-' + modelKey);
        if (card) {
            card.classList.toggle('is-expanded');
        } else {
            var body = document.getElementById('project-coverage-body');
            if (body && _activeCoverageData) {
                renderCoverageScreen(body, _activeCoverageData);
            }
        }
    }

    // ── Tab 1: Models Tab Builder ──

    function renderModelsTab(models, lang) {
        if (!models || models.length === 0) {
            return (
                '<div style="text-align: center; padding: 40px 16px; color: var(--text-secondary);">' +
                    '<div style="font-size: 36px; margin-bottom: 10px;">📱</div>' +
                    '<div style="font-size: 15px; font-weight: 700; color: var(--text-color); margin-bottom: 6px;">' +
                        window.escapeHTML(window.t('coverageEmptyTitle', {}, lang) || 'Покрытие ещё формируется') +
                    '</div>' +
                    '<div style="font-size: 12.5px; line-height: 1.4;">' +
                        window.escapeHTML(window.t('coverageEmptyDesc', {}, lang) || 'Данные об устройствах появятся по мере активности тестеров.') +
                    '</div>' +
                '</div>'
            );
        }

        var cards = models.map(function (m) {
            var isExpanded = !!_expandedModelKeys[m.model_key];

            // Badges in head
            var osChips = (m.android_versions || []).map(function (v) {
                var short = String(v).replace(/^Android\s+/i, 'A');
                return '<span class="coverage-os-chip">' + window.escapeHTML(short) + '</span>';
            }).join(' ');

            var fbBadges = [];
            if (m.bugs_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--bug">🐞 ' + m.bugs_count + '</span>');
            if (m.ideas_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--idea">💡 ' + m.ideas_count + '</span>');
            if (m.reviews_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--review">★ ' + m.reviews_count + '</span>');

            var currentBadge = m.in_current_iteration
                ? '<span class="coverage-badge-current">' + window.escapeHTML(window.t('coverageCurrentBadge', {}, lang) || 'Текущая') + '</span>'
                : '';

            // Testers HTML
            var testersHtml = (m.testers || []).map(function (t) {
                var flag = (t.country && t.country.flag) ? t.country.flag : '🌐';
                var cName = (t.country && (lang === 'ru' ? t.country.name_ru : t.country.name)) || '';
                return (
                    '<div class="coverage-tester-row">' +
                        '<div class="coverage-tester-row__left">' +
                            (t.avatar_url
                                ? '<img class="coverage-tester-avatar" src="' + window.escapeHTML(t.avatar_url) + '" alt="">'
                                : '<div class="coverage-tester-avatar" style="display:flex;align-items:center;justify-content:center;font-size:11px;">👤</div>') +
                            '<span class="coverage-tester-name notranslate">' + window.escapeHTML(t.username || t.full_name || 'Tester #' + t.tester_id) + '</span>' +
                        '</div>' +
                        '<div class="coverage-tester-row__right">' +
                            '<span>' + flag + ' ' + window.escapeHTML(cName) + '</span>' +
                            (t.android_version ? '<span>· ' + window.escapeHTML(t.android_version) + '</span>' : '') +
                        '</div>' +
                    '</div>'
                );
            }).join('');

            // Screenshots Gallery HTML
            var galleryHtml = '';
            var screenshotsCount = (m.screenshots && m.screenshots.length) || 0;
            if (screenshotsCount > 0) {
                var thumbs = m.screenshots.map(function (s) {
                    var proofId = Number(s.id);
                    var imgCount = Number(s.image_count || 1);
                    var thumbFileId = '';
                    if (s.media_items && s.media_items[0] && s.media_items[0].thumb_file_id) {
                        thumbFileId = s.media_items[0].thumb_file_id;
                    } else if (s.media_items && s.media_items[0] && s.media_items[0].file_id) {
                        thumbFileId = s.media_items[0].file_id;
                    }
                    var thumbUrl = thumbFileId ? _getCoverageMediaUrl(thumbFileId) : '';
                    var thumbImgHtml = thumbUrl
                        ? '<img class="coverage-gallery-thumb__img" src="' + window.escapeHTML(thumbUrl) + '" loading="lazy" alt="" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';">' +
                          '<div class="coverage-gallery-thumb__fallback" style="display:none;"><span style="font-size:22px;">📱</span><span style="font-size:10px; font-weight:700; margin-top:2px;">D' + s.day + '</span></div>'
                        : '<div class="coverage-gallery-thumb__fallback"><span style="font-size:22px;">📱</span><span style="font-size:10px; font-weight:700; margin-top:2px;">D' + s.day + '</span></div>';

                    return (
                        '<div class="coverage-gallery-thumb" onclick="event.stopPropagation(); openCoverageScreenshotPreview(' + proofId + ', ' + imgCount + ', event);">' +
                            thumbImgHtml +
                            '<span class="coverage-gallery-thumb__day">D' + s.day + '</span>' +
                            (s.has_bug ? '<span class="coverage-gallery-thumb__bug">🐞</span>' : '') +
                            (imgCount > 1 ? '<span class="coverage-gallery-thumb__count">+' + imgCount + '</span>' : '') +
                        '</div>'
                    );
                }).join('');

                galleryHtml = (
                    '<div class="coverage-section-title">📱 ' + window.escapeHTML(window.t('coverageScreenshotsGallery', {}, lang) || 'Скриншоты интерфейса') + ' (' + screenshotsCount + ')</div>' +
                    '<div class="coverage-section-subtitle">' + window.escapeHTML(window.t('coverageScreenshotsSubtitle', {}, lang) || 'Как приложение выглядит на этой модели') + '</div>' +
                    '<div class="coverage-gallery-grid">' + thumbs + '</div>'
                );
            } else {
                galleryHtml = (
                    '<div class="coverage-section-title">📱 ' + window.escapeHTML(window.t('coverageScreenshotsGallery', {}, lang) || 'Скриншоты интерфейса') + ' (0)</div>' +
                    '<div class="coverage-section-subtitle">' + window.escapeHTML(window.t('coverageScreenshotsSubtitle', {}, lang) || 'Как приложение выглядит на этой модели') + '</div>' +
                    '<div style="font-size:11.5px; color:var(--text-secondary,#9ca3af); font-style:italic; padding:4px 0 8px 0;">' + window.escapeHTML(window.t('coverageScreenshotsEmpty', {}, lang) || 'Скриншоты интерфейса ещё не загружены') + '</div>'
                );
            }

            // Linked Feedback HTML
            var feedbackHtml = '';
            if (m.feedback_items && m.feedback_items.length > 0) {
                var fbRows = m.feedback_items.map(function (fb) {
                    var typeClass = fb.type === 'bug' ? 'bug' : (fb.type === 'idea' ? 'idea' : 'review');
                    var typeLabel = fb.type === 'bug' ? '🐞 Баг' : (fb.type === 'idea' ? '💡 Идея' : '★ Отзыв');
                    return (
                        '<div class="coverage-fb-item-row" onclick="event.stopPropagation(); openProjectResultsFeedback(' + _activeCoverageAppId + ', \'' + fb.type + '\');">' +
                            '<div class="coverage-fb-item-head">' +
                                '<span class="coverage-fb-item-type coverage-fb-item-type--' + typeClass + '">' + typeLabel + '</span>' +
                                '<span style="font-size:10.5px; opacity:0.6;">' + (fb.status || 'new') + '</span>' +
                            '</div>' +
                            (fb.title ? '<div style="font-weight:600; font-size:12px;">' + window.escapeHTML(fb.title) + '</div>' : '') +
                            '<div class="coverage-fb-item-text">' + window.escapeHTML(fb.text || '') + '</div>' +
                        '</div>'
                    );
                }).join('');

                feedbackHtml = (
                    '<div class="coverage-section-title">💬 ' + window.escapeHTML(window.t('coverageFeedbackFound', {}, lang) || 'Найденный фидбэк') + ' (' + m.feedback_items.length + ')</div>' +
                    '<div class="coverage-fb-items-list">' + fbRows + '</div>'
                );
            }

            // Iterations Badges
            var iterationsHtml = '';
            if (m.iterations && m.iterations.length > 0) {
                var itChips = m.iterations.map(function (it) {
                    return '<span class="coverage-meta-pill">Run #' + it + '</span>';
                }).join(' ');
                iterationsHtml = '<div style="margin-top: 10px; display:flex; gap:6px; align-items:center;"><span style="font-size:11px; opacity:0.6;">Итерации:</span> ' + itChips + '</div>';
            }

            return (
                '<div id="cov-model-' + window.escapeHTML(m.model_key) + '" class="coverage-model-card ' + (isExpanded ? 'is-expanded' : '') + '">' +
                    '<div class="coverage-model-card__head" onclick="toggleCoverageModelExpand(\'' + window.escapeHTML(m.model_key) + '\')">' +
                        '<div class="coverage-model-card__head-left">' +
                            '<div class="coverage-model-card__name-row">' +
                                '<span class="coverage-model-card__name notranslate">' + window.escapeHTML(m.model_name) + '</span>' +
                                currentBadge +
                            '</div>' +
                            '<div class="coverage-model-card__meta-row">' +
                                osChips +
                                (m.testing_days_count > 0 ? '<span class="coverage-meta-pill">📅 ' + m.testing_days_count + ' дн.</span>' : '') +
                                (m.screenshots_count > 0 ? '<span class="coverage-meta-pill">📷 ' + m.screenshots_count + '</span>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="coverage-model-card__head-right">' +
                            '<div class="coverage-model-feedback-badges">' + fbBadges.join('') + '</div>' +
                            '<svg class="coverage-model-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                        '</div>' +
                    '</div>' +
                    '<div class="coverage-model-card__details">' +
                        '<div class="coverage-section-title">👥 ' + window.escapeHTML(window.t('coverageTesterTitle', {}, lang) || 'Тестеры') + ' (' + (m.testers || []).length + ')</div>' +
                        '<div class="coverage-testers-list">' + testersHtml + '</div>' +
                        galleryHtml +
                        feedbackHtml +
                        iterationsHtml +
                    '</div>' +
                '</div>'
            );
        }).join('');

        return '<div class="coverage-models-list">' + cards + '</div>';
    }

    // ── Tab 2: Android Versions Tab Builder ──

    function renderAndroidTab(versions, lang) {
        if (!versions || versions.length === 0) {
            return '<div style="text-align:center; padding: 40px 16px; color: var(--text-secondary);">Нет данных по версиям Android</div>';
        }

        var cards = versions.map(function (v) {
            var modelChips = (v.models || []).map(function (m) {
                return '<span class="coverage-android-model-chip notranslate">' + window.escapeHTML(m) + '</span>';
            }).join(' ');

            return (
                '<div class="coverage-android-card">' +
                    '<div class="coverage-android-card__head">' +
                        '<span class="coverage-android-version-title">' + window.escapeHTML(v.version) + '</span>' +
                        '<span class="coverage-android-pct">' + v.percentage + '%</span>' +
                    '</div>' +
                    '<div class="coverage-android-bar-wrap">' +
                        '<div class="coverage-android-bar-fill" style="width: ' + Math.min(100, Math.max(4, v.percentage)) + '%;"></div>' +
                    '</div>' +
                    '<div style="font-size:11.5px; color: var(--text-secondary); margin-bottom: 6px;">' +
                        v.models_count + ' ' + (lang === 'ru' ? formatPluralRu(v.models_count, 'модель', 'модели', 'моделей') : (v.models_count === 1 ? 'model' : 'models')) +
                        ' · ' + v.testers_count + ' ' + (lang === 'ru' ? formatPluralRu(v.testers_count, 'тестер', 'тестера', 'тестеров') : (v.testers_count === 1 ? 'tester' : 'testers')) +
                    '</div>' +
                    '<div class="coverage-android-models-chips">' + modelChips + '</div>' +
                '</div>'
            );
        }).join('');

        return '<div class="coverage-android-list">' + cards + '</div>';
    }

    // ── Tab 3: Countries Tab Builder ──

    function renderCountriesTab(countries, lang) {
        if (!countries || countries.length === 0) {
            return '<div style="text-align:center; padding: 40px 16px; color: var(--text-secondary);">Нет данных по странам</div>';
        }

        var cards = countries.map(function (c) {
            var cName = (lang === 'ru' ? c.name_ru : c.name) || c.code;
            var flag = c.flag || '🌐';
            var modelChips = (c.models || []).map(function (m) {
                return '<span class="coverage-android-model-chip notranslate">' + window.escapeHTML(m) + '</span>';
            }).join(' ');

            return (
                '<div class="coverage-country-card">' +
                    '<div class="coverage-country-head">' +
                        '<div class="coverage-country-name-row">' +
                            '<span class="coverage-country-flag" aria-hidden="true">' + flag + '</span>' +
                            '<span class="coverage-country-name">' + window.escapeHTML(cName) + '</span>' +
                        '</div>' +
                        '<span class="coverage-country-testers-count">' +
                            c.testers_count + ' ' + (lang === 'ru' ? formatPluralRu(c.testers_count, 'тестер', 'тестера', 'тестеров') : (c.testers_count === 1 ? 'tester' : 'testers')) +
                        '</span>' +
                    '</div>' +
                    '<div class="coverage-android-models-chips">' + modelChips + '</div>' +
                '</div>'
            );
        }).join('');

        return '<div class="coverage-countries-list">' + cards + '</div>';
    }

    // ── Open Screenshot Proof Previewer ──

    function openCoverageScreenshotPreview(proofId, imageCount, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        if (typeof window.openCheckinProofOverview === 'function') {
            window.openCheckinProofOverview(Number(proofId), { imageCount: Number(imageCount || 1) });
        } else if (typeof window.openCheckinProofPreview === 'function') {
            window.openCheckinProofPreview(Number(proofId), 0);
        }
    }

    // ── Public API exports on window ──

    window.ProjectResults = {
        buildBlock: buildProjectResultsBlock,
        buildCollapsed: buildProjectResultsCollapsed,
        openCoverage: openProjectCoverage,
        markSeen: markProjectCoverageSeen,
        getUnseenCounts: getProjectCoverageUnseenCounts
    };

    window.buildProjectResultsBlock = buildProjectResultsBlock;
    window.buildProjectResultsCollapsed = buildProjectResultsCollapsed;
    window.openProjectCoverage = openProjectCoverage;
    window.closeProjectCoverageModal = closeProjectCoverageModal;
    window.openProjectResultsFeedback = openProjectResultsFeedback;
    window.toggleCoverageScope = toggleCoverageScope;
    window.switchCoverageTab = switchCoverageTab;
    window.toggleCoverageModelExpand = toggleCoverageModelExpand;
    window.openCoverageScreenshotPreview = openCoverageScreenshotPreview;

})();
