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

        var newBugs = Number(project.bugs_new_count != null ? project.bugs_new_count : (summary.bugs_new_count || 0));
        var newIdeas = Number(project.ideas_new_count != null ? project.ideas_new_count : (summary.ideas_new_count || 0));
        var newReviews = Number(project.reviews_new_count != null ? project.reviews_new_count : (summary.reviews_new_count || 0));

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
        var unseen = getProjectCoverageUnseenCounts(project);

        var modelsTotal = Number(summary.models_count || 0);
        var countriesTotal = Number(summary.countries_count || 0);
        var bugsTotal = Number(project.bugs_total_count || summary.bugs_total_count || project.bugs_count || summary.bugs_count || 0);
        var ideasTotal = Number(project.ideas_total_count || summary.ideas_total_count || project.ideas_count || summary.ideas_count || 0);
        var reviewsTotal = Number(project.reviews_total_count || summary.reviews_total_count || project.reviews_count || summary.reviews_count || 0);

        var newModels = Number(unseen.newCoverage || 0);
        var newCountries = Number(unseen.newCountries || 0);
        var newBugs = Number(unseen.newBugs || 0);
        var newIdeas = Number(unseen.newIdeas || 0);
        var newReviews = Number(unseen.newReviews || 0);

        var totalWord = window.t('pcResultsTotalShort', {}, lang) || (lang === 'ru' ? 'всего' : 'total');
        var resultsTitle = lang === 'ru' ? 'Результаты тестирования' : 'Testing results';
        var resultsSubtitle = lang === 'ru' ? 'Покрытие и полезные находки' : 'Coverage and useful findings';
        var overviewLabel = lang === 'ru' ? 'Сводка' : 'Overview';
        var allFeedbackLabel = window.t('pcResultsAllFeedback', {}, lang);
        var feedbackTotal = Number(project.feedback_total_count || 0);
        var feedbackNew = Number(project.feedback_new_count || 0);

        var indicators = [
            {
                key: 'models',
                type: 'coverage',
                iconSvg: '<svg class="pc-results-tile__glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>',
                label: window.t('pcResultsModels', {}, lang) || (lang === 'ru' ? 'Модели' : 'Models'),
                newCount: newModels,
                totalCount: modelsTotal,
                detail: summary.android_range || '',
                title: window.t('pcResultsChipCoverageTitle', {}, lang) || 'Модели устройств',
                action: 'openProjectCoverage(' + appId + ', \'models\');'
            },
            {
                key: 'countries',
                type: 'country',
                iconSvg: '<svg class="pc-results-tile__glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
                label: window.t('pcResultsCountry', {}, lang) || (lang === 'ru' ? 'Страна' : 'Country'),
                newCount: newCountries,
                totalCount: countriesTotal,
                detail: (Array.isArray(summary.countries_list) ? summary.countries_list.slice(0, 3).join(' · ') : ''),
                title: window.t('pcResultsChipCountryTitle', {}, lang) || 'Страны тестирования',
                action: 'openProjectCoverage(' + appId + ', \'countries\');'
            },
            {
                key: 'bugs',
                type: 'bug',
                iconSvg: '<svg class="pc-results-tile__glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"></path><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"></path><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M21 21c0-2.1-1.7-3.9-3.8-4"></path></svg>',
                label: window.t('pcResultsBug', {}, lang) || (lang === 'ru' ? 'Баг' : 'Bug'),
                newCount: newBugs,
                totalCount: bugsTotal,
                detail: '',
                title: window.t('pcResultsChipBugsTitle', {}, lang) || 'Баги',
                action: 'openProjectResultsFeedback(' + appId + ', \'bug\', 0, ' + (newBugs > 0) + ');'
            },
            {
                key: 'ideas',
                type: 'idea',
                iconSvg: '<svg class="pc-results-tile__glyph" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14c.18-1 .65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8a6 6 0 0 0-12 0c0 1.3.5 2.5 1.5 3.5.76.76 1.23 1.5 1.41 2.5"></path></svg>',
                label: window.t('pcResultsIdea', {}, lang) || (lang === 'ru' ? 'Идеи' : 'Ideas'),
                newCount: newIdeas,
                totalCount: ideasTotal,
                detail: '',
                title: window.t('pcResultsChipIdeasTitle', {}, lang) || 'Идеи и рекомендации',
                action: 'openProjectResultsFeedback(' + appId + ', \'idea\', 0, ' + (newIdeas > 0) + ');'
            },
            {
                key: 'reviews',
                type: 'review',
                iconSvg: '<svg class="pc-results-tile__glyph" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>',
                label: window.t('pcResultsReview', {}, lang) || (lang === 'ru' ? 'Отзыв' : 'Review'),
                newCount: newReviews,
                totalCount: reviewsTotal,
                detail: '',
                title: window.t('pcResultsChipReviewsTitle', {}, lang) || 'Отзывы Google Play',
                action: 'openProjectResultsFeedback(' + appId + ', \'google_play\', 0, ' + (newReviews > 0) + ');'
            }
        ];

        var visibleIndicators = indicators.filter(function (ind) {
            return Number(ind.newCount || 0) > 0 || Number(ind.totalCount || 0) > 0;
        });
        var tilesHtml = visibleIndicators.map(function (ind) {
            var hasNew = ind.newCount > 0;
            var isZero = !hasNew && ind.totalCount === 0;

            var valClass = 'pc-results-tile__val';
            if (hasNew) valClass += ' is-new is-accent';
            else if (isZero) valClass += ' is-zero';

            var valText = hasNew ? ('+' + ind.newCount) : String(ind.totalCount);
            var detailText = hasNew ? (ind.totalCount + ' ' + totalWord) : String(ind.detail || '');
            var subHtml = detailText
                ? ('<span class="pc-results-tile__sub">' + window.escapeHTML(detailText) + '</span>')
                : '<span class="pc-results-tile__sub" aria-hidden="true">&nbsp;</span>';

            return (
                '<button type="button" class="pc-results-tile pc-results-tile--' + ind.key + ' pc-results-chip--' + ind.type + (isZero ? ' is-zero' : '') + (hasNew ? ' has-new' : '') + '" ' +
                    'onclick="event.stopPropagation(); ' + ind.action + '" ' +
                    'title="' + window.escapeHTML(ind.title) + '" ' +
                    'aria-label="' + window.escapeHTML(ind.title + ': ' + valText) + '">' +
                    '<span class="pc-results-tile__icon-wrap">' + ind.iconSvg + '</span>' +
                    '<span class="' + valClass + '">' + window.escapeHTML(valText) + '</span>' +
                    '<span class="pc-results-tile__label">' + window.escapeHTML(ind.label) + '</span>' +
                    subHtml +
                '</button>'
            );
        }).join('');

        return (
            '<section class="pc-results-card" data-app-id="' + appId + '" aria-label="' + window.escapeHTML(resultsTitle) + '">' +
                '<div class="pc-results-header" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');" role="button" tabindex="0" title="' + window.escapeHTML(resultsTitle) + '">' +
                    '<span class="pc-results-header__copy">' +
                        '<span class="pc-results-title">' + window.escapeHTML(resultsTitle) + '</span>' +
                        '<span class="pc-results-subtitle">' + window.escapeHTML(resultsSubtitle) + '</span>' +
                    '</span>' +
                    '<span class="pc-results-header__action">' + window.escapeHTML(overviewLabel) +
                        '<svg class="pc-results-header__chevron" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>' +
                    '</span>' +
                '</div>' +
                '<div class="pc-results-grid' + (visibleIndicators.length ? '' : ' is-empty') + '" style="--pc-result-count:' + Math.max(1, visibleIndicators.length) + '">' +
                    (tilesHtml || '<button type="button" class="pc-results-grid__empty" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                        '<span>' + window.escapeHTML(lang === 'ru' ? 'Данные появятся после первых отчётов' : 'Data will appear after the first reports') + '</span>' +
                        '<span aria-hidden="true">→</span></button>') +
                '</div>' +
                '<button type="button" class="pc-results-feedback-link" onclick="event.stopPropagation(); openProjectFeedback(' + appId + ', false, { preferUnprocessed: false, typeFilter: \'all\' });">' +
                    '<span>' + window.escapeHTML(allFeedbackLabel) + '</span>' +
                    (feedbackNew > 0 ? '<span class="pc-results-feedback-link__badge is-new">+' + feedbackNew + '</span>' : (feedbackTotal > 0 ? '<span class="pc-results-feedback-link__badge">' + feedbackTotal + '</span>' : '')) +
                    '<span class="pc-results-feedback-link__arrow" aria-hidden="true">›</span>' +
                '</button>' +
            '</section>'
        );
    }

    // ── Collapsed Card Results Builder (Ultra-compact) ──

    function resultMiniIcon(key) {
        var paths = {
            models: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/>',
            countries: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
            bugs: '<path d="M9 7V5.5a3 3 0 0 1 6 0V7M8 4 6.5 2.5M16 4l1.5-1.5M6 10H3M21 10h-3M6 15H3M21 15h-3"/><rect x="6" y="7" width="12" height="13" rx="6"/><path d="M12 8v11"/>',
            ideas: '<path d="M9 18h6"/><path d="M10 21.2h4"/><path d="M15.09 14c.18-1 .65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8a6 6 0 0 0-12 0c0 1.3.5 2.5 1.5 3.5.76.76 1.23 1.5 1.41 2.5"/>',
            reviews: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
        };
        return '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[key] || paths.models) + '</svg>';
    }

    function resultCollapsedMetric(key, value, isNew) {
        return '<span class="pc-results-collapsed__metric is-' + key + (isNew ? ' has-new' : '') + '">' +
            resultMiniIcon(key) + '<strong>' + (isNew ? '+' : '') + Number(value || 0) + '</strong>' +
        '</span>';
    }

    function buildProjectResultsCollapsed(project) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        var appId = Number(project.app_id || project.id || 0);
        var summary = project.results_summary || {};
        var modelsCount = Number(summary.models_count || 0);
        var countriesCount = Number(summary.countries_count || 0);
        var totalFeedback = Number(project.feedback_total_count || 0);
        var collapsedTitle = lang === 'ru' ? 'Итоги' : 'Results';
        var openLabel = lang === 'ru' ? 'Открыть сводку' : 'Open overview';

        if (modelsCount === 0 && totalFeedback === 0) {
            return (
                '<button type="button" class="pc-results-collapsed" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                    '<span class="pc-results-collapsed__label">' + window.escapeHTML(collapsedTitle) + '</span>' +
                    '<span class="pc-results-collapsed__text">' +
                        window.escapeHTML(window.t('pcResultsEmpty', {}, lang) || 'Результаты появятся по мере тестирования') +
                    '</span><span class="pc-results-collapsed__arrow" aria-hidden="true">›</span>' +
                '</button>'
            );
        }

        var unseen = getProjectCoverageUnseenCounts(project);
        if (unseen.hasNew) {
            var items = [];
            if (unseen.newCoverage > 0) items.push(resultCollapsedMetric('models', unseen.newCoverage, true));
            if (unseen.newCountries > 0) items.push(resultCollapsedMetric('countries', unseen.newCountries, true));
            if (unseen.newBugs > 0) items.push(resultCollapsedMetric('bugs', unseen.newBugs, true));
            if (unseen.newIdeas > 0) items.push(resultCollapsedMetric('ideas', unseen.newIdeas, true));
            if (unseen.newReviews > 0) items.push(resultCollapsedMetric('reviews', unseen.newReviews, true));

            return (
                '<button type="button" class="pc-results-collapsed pc-results-collapsed--badges" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');">' +
                    '<span class="pc-results-collapsed__label">' + window.escapeHTML(collapsedTitle) + '</span>' +
                    '<span class="pc-results-collapsed__metrics">' + items.join('') + '</span>' +
                    '<span class="pc-results-collapsed__arrow" aria-hidden="true">›</span>' +
                '</button>'
            );
        }

        var calmMetrics = [];
        if (modelsCount > 0) calmMetrics.push(resultCollapsedMetric('models', modelsCount, false));
        if (countriesCount > 0) calmMetrics.push(resultCollapsedMetric('countries', countriesCount, false));
        if (totalFeedback > 0) calmMetrics.push(resultCollapsedMetric('ideas', totalFeedback, false));
        return (
            '<button type="button" class="pc-results-collapsed pc-results-collapsed--badges" onclick="event.stopPropagation(); openProjectCoverage(' + appId + ');" aria-label="' + window.escapeHTML(openLabel) + '">' +
                '<span class="pc-results-collapsed__label">' + window.escapeHTML(collapsedTitle) + '</span>' +
                '<span class="pc-results-collapsed__metrics">' + calmMetrics.join('') + '</span>' +
                '<span class="pc-results-collapsed__arrow" aria-hidden="true">›</span>' +
            '</button>'
        );
    }

    // ── Open Feedback filtered from Results block ──

    function openProjectResultsFeedback(appId, typeFilter, feedbackId, hasNewInCategory) {
        if (typeof window.openProjectFeedback === 'function') {
            window.openProjectFeedback(appId, false, {
                preferUnprocessed: hasNewInCategory === true,
                typeFilter: typeFilter,
                focusFeedbackId: Number(feedbackId || 0) || undefined
            });
        }
    }

    // ── Full Coverage Screen State & Modal ──

    var _activeCoverageAppId = 0;
    var _activeCoverageScope = 'current';
    var _activeCoverageTab = 'overview';
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

        if (initialTab && (initialTab === 'overview' || initialTab === 'countries' || initialTab === 'android' || initialTab === 'models')) {
            _activeCoverageTab = initialTab;
        } else {
            _activeCoverageTab = 'overview';
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
        if (container && container.classList) container.classList.remove('is-header-compact');
        var stats = data.stats || {};
        var models = data.models || [];
        var androidVersions = data.android_versions || [];
        var countries = data.countries || [];

        // Coverage dimensions and evidence are intentionally separated:
        // screenshots are proof material, not another device characteristic.
        var dimensionParts = [];
        var mCount = stats.models_count || 0;
        var mWord = lang === 'ru'
            ? formatPluralRu(mCount, 'модель', 'модели', 'моделей')
            : (mCount === 1 ? 'model' : 'models');
        dimensionParts.push('<span class="coverage-stat-bar__item">' + window.escapeHTML(mCount + ' ' + mWord) + '</span>');

        if (stats.android_range) {
            dimensionParts.push('<span class="coverage-stat-bar__item">' + window.escapeHTML(stats.android_range) + '</span>');
        }

        var cCount = stats.countries_count || 0;
        var cWord = lang === 'ru'
            ? formatPluralRu(cCount, 'страна', 'страны', 'стран')
            : (cCount === 1 ? 'country' : 'countries');
        dimensionParts.push('<span class="coverage-stat-bar__item">' + window.escapeHTML(cCount + ' ' + cWord) + '</span>');

        var sCount = stats.screenshots_count || 0;
        var sWord = lang === 'ru'
            ? formatPluralRu(sCount, 'скриншот', 'скриншота', 'скриншотов')
            : (sCount === 1 ? 'screenshot' : 'screenshots');
        var statBarHtml = '<div class="coverage-stat-bar__dimensions">' +
            dimensionParts.join('<span class="coverage-stat-bar__sep">·</span>') +
            '</div><div class="coverage-stat-bar__evidence" title="' + window.escapeHTML(lang === 'ru' ? 'Визуальные подтверждения интерфейса' : 'Visual interface evidence') + '">' +
                '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m20 15-3.2-3.2a1.7 1.7 0 0 0-2.4 0L7 19"/></svg>' +
                '<strong>' + sCount + '</strong><span>' + window.escapeHTML(sWord) + '</span>' +
            '</div>';

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
                '<button type="button" id="cov-tab-btn-overview" class="coverage-tab-btn ' + (_activeCoverageTab === 'overview' ? 'is-active' : '') + '" onclick="switchCoverageTab(\'overview\')">' +
                    window.escapeHTML(lang === 'ru' ? 'Обзор' : 'Overview') +
                '</button>' +
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
                '<div id="coverage-tab-panel" class="coverage-tab-panel is-view-' + _activeCoverageTab + '">' +
                    renderCoverageTabContent(data, lang, _activeCoverageTab) +
                '</div>' +
            '</div>'
        );
        bindCoverageScrollHeader(container);
        hydrateCoverageThumbnails(container);
    }

    function toggleCoverageScope(scope) {
        _activeCoverageScope = scope;
        openProjectCoverage(_activeCoverageAppId);
    }

    function switchCoverageTab(tab) {
        if (['overview', 'models', 'android', 'countries'].indexOf(tab) < 0) tab = 'overview';
        _activeCoverageTab = tab;
        var body = document.getElementById('project-coverage-body');
        if (body && _activeCoverageData) renderCoverageScreen(body, _activeCoverageData);
    }

    function renderCoverageTabContent(data, lang, tab) {
        if (tab === 'models') return renderModelsTab(data.models || [], lang, 'models');
        if (tab === 'android') return renderAndroidTab(data.android_versions || [], lang);
        if (tab === 'countries') return renderCountriesTab(data.countries || [], lang);
        return renderCoverageOverview(data, lang);
    }

    function bindCoverageScrollHeader(container) {
        var scroller = container && container.querySelector ? container.querySelector('.coverage-body') : null;
        if (!scroller) return;
        var compact = false;
        scroller.addEventListener('scroll', function () {
            var shouldCompact = scroller.scrollTop > (compact ? 24 : 56);
            if (shouldCompact === compact) return;
            compact = shouldCompact;
            container.classList.toggle('is-header-compact', compact);
        }, { passive: true });
    }

    function androidIconSvg(className) {
        return '<svg class="' + (className || 'coverage-android-icon') + '" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M17.523 15.341a1 1 0 0 1 0-1.999 1 1 0 0 1 0 1.999m-11.046 0a1 1 0 0 1 0-1.999 1 1 0 0 1 0 1.999m11.405-6.02 1.997-3.46a.416.416 0 0 0-.72-.415L17.137 8.95A12.2 12.2 0 0 0 12 7.85c-1.853 0-3.59.394-5.137 1.1L4.841 5.447a.416.416 0 0 0-.72.415l1.997 3.46C2.688 11.186.343 14.658 0 18.76h24c-.344-4.102-2.69-7.574-6.118-9.44"/></svg>';
    }

    function hydrateCoverageThumbnails(container) {
        if (!container || !container.querySelectorAll || typeof window.loadCheckinProofPreviewThumbnail !== 'function') return;
        container.querySelectorAll('.coverage-gallery-thumb__img[data-proof-id]').forEach(function (img) {
            var proofId = Number(img.getAttribute('data-proof-id') || 0);
            var mediaIndex = Number(img.getAttribute('data-media-index') || 0);
            if (proofId <= 0 || img.getAttribute('src')) return;
            window.loadCheckinProofPreviewThumbnail(proofId, mediaIndex).then(function (source) {
                if (!img.isConnected || !source) return;
                img.src = source;
            }).catch(function () {
                if (!img.isConnected) return;
                img.style.display = 'none';
            });
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

    function openCoverageModel(modelKey) {
        _expandedModelKeys[String(modelKey || '')] = true;
        _activeCoverageTab = 'models';
        var body = document.getElementById('project-coverage-body');
        if (body && _activeCoverageData) {
            renderCoverageScreen(body, _activeCoverageData);
            setTimeout(function () {
                var card = document.getElementById('cov-model-' + String(modelKey || ''));
                if (card && typeof card.scrollIntoView === 'function') card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 30);
        }
    }

    // ── Overview: cross-dimensional device cards ──

    function renderCoverageOverview(data, lang) {
        var models = data.models || [];
        if (!models.length) return renderModelsTab(models, lang, 'overview');
        var intro = lang === 'ru'
            ? 'Устройства, версии Android, география и полезные находки — без дублирования экранов.'
            : 'Devices, Android versions, geography, and useful findings without duplicated screens.';
        var cards = models.map(function (m) {
            var countries = [];
            var countrySeen = {};
            (m.testers || []).forEach(function (tester) {
                var country = tester && tester.country;
                var code = String(country && country.code || '').toUpperCase();
                if (!code || countrySeen[code]) return;
                countrySeen[code] = true;
                countries.push(country);
            });
            var android = (m.android_versions || []).slice(0, 3).map(function (version) {
                return '<span class="coverage-overview-chip is-android">' + androidIconSvg() + '<span>' + window.escapeHTML(String(version).replace(/^Android\s+/i, '')) + '</span></span>';
            }).join('');
            var geography = countries.slice(0, 3).map(function (country) {
                return '<span class="coverage-overview-chip is-country"><span>' + (country.flag || '🌐') + '</span><span>' + window.escapeHTML(country.code || '') + '</span></span>';
            }).join('');
            var findings = Number(m.bugs_count || 0) + Number(m.ideas_count || 0) + Number(m.reviews_count || 0);
            var token = encodeURIComponent(String(m.model_key || '')).replace(/'/g, '%27');
            return '<button type="button" class="coverage-overview-device" onclick="openCoverageModel(decodeURIComponent(\'' + token + '\'))">' +
                '<span class="coverage-overview-device__top"><span class="coverage-overview-device__name notranslate">' + window.escapeHTML(m.model_name) + '</span><span class="coverage-overview-device__arrow">›</span></span>' +
                '<span class="coverage-overview-device__chips">' + android + geography + '</span>' +
                '<span class="coverage-overview-device__stats">' +
                    '<span><strong>' + (m.testers || []).length + '</strong>' + window.escapeHTML(lang === 'ru' ? 'тестеров' : 'testers') + '</span>' +
                    '<span><strong>' + Number(m.screenshots_count || 0) + '</strong>' + window.escapeHTML(lang === 'ru' ? 'скриншотов' : 'screenshots') + '</span>' +
                    '<span><strong>' + findings + '</strong>' + window.escapeHTML(lang === 'ru' ? 'находок' : 'findings') + '</span>' +
                '</span>' +
            '</button>';
        }).join('');
        return '<div class="coverage-overview-intro">' + window.escapeHTML(intro) + '</div><div class="coverage-overview-grid">' + cards + '</div>';
    }

    // ── Models: detailed expandable model cards ──

    function renderCoverageFocusBar(data, lang, focus) {
        var stats = data.stats || {};
        var title = '';
        var description = '';
        var facets = [];
        if (focus === 'android') {
            title = lang === 'ru' ? 'Фокус: версии Android' : 'Focus: Android versions';
            description = lang === 'ru'
                ? 'Версия выделена в каждой карточке устройства — состав тестирования остаётся перед глазами.'
                : 'The version is emphasized on every device card, while the test composition stays visible.';
            facets = (data.android_versions || []).map(function (item) {
                return '<span class="coverage-focus-chip is-android"><strong>' + window.escapeHTML(item.version) + '</strong><span>' +
                    item.models_count + ' ' + window.escapeHTML(lang === 'ru'
                        ? formatPluralRu(item.models_count, 'модель', 'модели', 'моделей')
                        : (item.models_count === 1 ? 'model' : 'models')) + '</span></span>';
            });
        } else if (focus === 'countries') {
            title = lang === 'ru' ? 'Фокус: география тестирования' : 'Focus: testing geography';
            description = lang === 'ru'
                ? 'Страны выделены в карточках моделей — видно и географию, и устройство конкретного тестера.'
                : 'Countries are emphasized inside model cards, keeping geography tied to each tester’s device.';
            facets = (data.countries || []).map(function (item) {
                var name = (lang === 'ru' ? item.name_ru : item.name) || item.code;
                return '<span class="coverage-focus-chip is-country"><span aria-hidden="true">' + (item.flag || '🌐') + '</span><strong>' +
                    window.escapeHTML(name) + '</strong><span>' + item.testers_count + '</span></span>';
            });
        } else {
            title = lang === 'ru' ? 'Устройства текущего покрытия' : 'Devices in current coverage';
            description = lang === 'ru'
                ? 'Каждая карточка объединяет модель, Android, страну, тестеров, скриншоты и найденные замечания.'
                : 'Each card connects the model, Android version, country, testers, screenshots, and findings.';
            if (stats.android_range) {
                facets.push('<span class="coverage-focus-chip is-neutral"><strong>' + window.escapeHTML(stats.android_range) + '</strong></span>');
            }
        }
        return '<div class="coverage-focus-bar">' +
            '<div class="coverage-focus-bar__copy"><strong>' + window.escapeHTML(title) + '</strong><span>' + window.escapeHTML(description) + '</span></div>' +
            (facets.length ? '<div class="coverage-focus-bar__facets">' + facets.join('') + '</div>' : '') +
        '</div>';
    }

    function renderModelsTab(models, lang, focus) {
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
            var modelCountries = [];
            var seenCountryCodes = {};
            (m.testers || []).forEach(function (tester) {
                var country = tester && tester.country;
                var code = String(country && country.code || '').toUpperCase();
                if (!code || seenCountryCodes[code]) return;
                seenCountryCodes[code] = true;
                modelCountries.push(country);
            });

            // Badges in head
            var osChips = (m.android_versions || []).map(function (v) {
                var version = String(v).replace(/^Android\s+/i, '');
                return '<span class="coverage-os-chip">' + androidIconSvg('coverage-os-chip__icon') + '<span>' + window.escapeHTML(version) + '</span></span>';
            }).join(' ');
            var countryChips = modelCountries.map(function (country) {
                var countryName = (lang === 'ru' ? country.name_ru : country.name) || country.code;
                return '<span class="coverage-model-country-chip" title="' + window.escapeHTML(countryName) + '">' +
                    '<span aria-hidden="true">' + (country.flag || '🌐') + '</span><span>' + window.escapeHTML(country.code || countryName) + '</span></span>';
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
                                ? '<img class="coverage-tester-avatar" src="' + window.escapeHTML(t.avatar_url) + '" alt="" loading="lazy" decoding="async">'
                                : '<div class="coverage-tester-avatar" style="display:flex;align-items:center;justify-content:center;font-size:11px;">👤</div>') +
                            '<span class="coverage-tester-name notranslate">' + window.escapeHTML(t.username || t.full_name || 'Tester #' + t.tester_id) + '</span>' +
                        '</div>' +
                        '<div class="coverage-tester-row__right">' +
                            '<span class="coverage-tester-country">' + flag + ' ' + window.escapeHTML(cName) + '</span>' +
                            (t.android_version ? '<span class="coverage-tester-android">' + window.escapeHTML(t.android_version) + '</span>' : '') +
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
                    var firstMedia = (s.media_items && s.media_items[0]) || {};
                    var width = Number(firstMedia.width || 0);
                    var height = Number(firstMedia.height || 0);
                    var resolution = width > 0 && height > 0 ? (width + '×' + height) : '';
                    var thumbImgHtml = '<img class="coverage-gallery-thumb__img" data-proof-id="' + proofId + '" data-media-index="0" loading="lazy" decoding="async" alt="" onload="if(this.nextElementSibling)this.nextElementSibling.style.display=\'none\'" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';">' +
                        '<div class="coverage-gallery-thumb__fallback"><span style="font-size:22px;">📱</span><span style="font-size:10px; font-weight:700; margin-top:2px;">D' + s.day + '</span></div>';

                    return (
                        '<div class="coverage-gallery-thumb" onclick="event.stopPropagation(); openCoverageScreenshotPreview(' + proofId + ', ' + imgCount + ', event);">' +
                            thumbImgHtml +
                            '<span class="coverage-gallery-thumb__day">D' + s.day + '</span>' +
                            '<span class="coverage-gallery-thumb__resolution"' + (resolution ? '' : ' hidden') + '>' + window.escapeHTML(resolution) + '</span>' +
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
                    var typeLabel = fb.type === 'bug'
                        ? (lang === 'ru' ? 'Баг' : 'Bug')
                        : (fb.type === 'idea' ? (lang === 'ru' ? 'Идея' : 'Idea') : (lang === 'ru' ? 'Отзыв' : 'Review'));
                    return (
                        '<button type="button" class="coverage-fb-item-row' + (fb.has_media ? ' has-media' : ' is-text-only') + '" onclick="event.stopPropagation(); openProjectResultsFeedback(' + _activeCoverageAppId + ', \'' + fb.type + '\', ' + Number(fb.id || 0) + ');">' +
                            '<div class="coverage-fb-item-head">' +
                                '<span class="coverage-fb-item-type coverage-fb-item-type--' + typeClass + '">' + (fb.type === 'bug' ? '🐞 ' : (fb.type === 'idea' ? '💡 ' : '★ ')) + window.escapeHTML(typeLabel) + '</span>' +
                                (fb.has_media ? '<span class="coverage-fb-item-media" title="' + window.escapeHTML(lang === 'ru' ? 'Есть изображение' : 'Image attached') + '">▧</span>' : '') +
                                '<span style="font-size:10.5px; opacity:0.6;">' + (fb.status || 'new') + '</span>' +
                            '</div>' +
                            (fb.title ? '<div style="font-weight:600; font-size:12px;">' + window.escapeHTML(fb.title) + '</div>' : '') +
                            '<div class="coverage-fb-item-text">' + window.escapeHTML(fb.text || '') + '</div>' +
                        '</button>'
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
                iterationsHtml = '<div class="coverage-model-iterations"><span>' + window.escapeHTML(lang === 'ru' ? 'Итерации:' : 'Runs:') + '</span>' + itChips + '</div>';
            }

            return (
                '<div id="cov-model-' + window.escapeHTML(m.model_key) + '" class="coverage-model-card is-focus-' + (focus || 'models') + ' ' + (isExpanded ? 'is-expanded' : '') + '">' +
                    '<div class="coverage-model-card__head" onclick="toggleCoverageModelExpand(\'' + window.escapeHTML(m.model_key) + '\')">' +
                        '<div class="coverage-model-card__head-left">' +
                            '<div class="coverage-model-card__name-row">' +
                                '<span class="coverage-model-card__name notranslate">' + window.escapeHTML(m.model_name) + '</span>' +
                                currentBadge +
                            '</div>' +
                            '<div class="coverage-model-card__meta-row">' +
                                '<span class="coverage-model-meta-group coverage-model-meta-group--android">' + osChips + '</span>' +
                                (countryChips ? '<span class="coverage-model-meta-group coverage-model-meta-group--countries">' + countryChips + '</span>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="coverage-model-card__head-right">' +
                            (m.screenshots_count > 0 ? '<span class="coverage-model-evidence" title="' + window.escapeHTML(lang === 'ru' ? 'Скриншоты интерфейса' : 'Interface screenshots') + '"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m20 15-3.2-3.2a1.7 1.7 0 0 0-2.4 0L7 19"/></svg><strong>' + m.screenshots_count + '</strong></span>' : '') +
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
            return '<div style="text-align:center; padding: 40px 16px; color: var(--text-secondary);">' + window.escapeHTML(lang === 'ru' ? 'Нет данных по версиям Android' : 'No Android version data yet') + '</div>';
        }

        var cards = versions.map(function (v) {
            var modelChips = (v.models || []).map(function (m) {
                return '<span class="coverage-android-model-chip notranslate">' + window.escapeHTML(m) + '</span>';
            }).join(' ');

            return (
                '<div class="coverage-android-card">' +
                    '<div class="coverage-android-card__head">' +
                        '<span class="coverage-android-version-title">' + androidIconSvg('coverage-android-version-icon') + window.escapeHTML(v.version) + '</span>' +
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
            return '<div style="text-align:center; padding: 40px 16px; color: var(--text-secondary);">' + window.escapeHTML(lang === 'ru' ? 'Нет данных по странам' : 'No country data yet') + '</div>';
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

    // ── Fullscreen Coverage Screenshot Viewer ──

    var _coverageViewerState = {
        isOpen: false,
        proofId: 0,
        images: [],
        currentIndex: 0,
        day: 0,
        modelName: '',
        testerName: '',
        hasBug: false
    };

    function _ensureCoverageScreenshotModal() {
        if (document.getElementById('coverage-screenshot-modal')) return;
        var modalHtml = (
            '<div id="coverage-screenshot-modal" class="modal-overlay coverage-screenshot-modal" onclick="closeCoverageScreenshotModal(event)">' +
                '<div class="modal-content coverage-screenshot-shell" onclick="event.stopPropagation()">' +
                    '<div class="coverage-screenshot-header">' +
                        '<button type="button" class="coverage-screenshot-btn" onclick="closeCoverageScreenshotModal()" aria-label="Back">←</button>' +
                        '<div class="coverage-screenshot-meta">' +
                            '<div id="coverage-screenshot-title" class="coverage-screenshot-title"></div>' +
                            '<div id="coverage-screenshot-subtitle" class="coverage-screenshot-subtitle"></div>' +
                        '</div>' +
                        '<div class="coverage-screenshot-actions">' +
                            '<span id="coverage-screenshot-counter" class="coverage-screenshot-counter" style="display:none;"></span>' +
                            '<button type="button" class="coverage-screenshot-btn" onclick="closeCoverageScreenshotModal()" aria-label="Close">✕</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="coverage-screenshot-stage" id="coverage-screenshot-stage">' +
                        '<button type="button" id="coverage-screenshot-prev" class="coverage-screenshot-nav coverage-screenshot-nav--prev" onclick="stepCoverageScreenshot(-1)" aria-label="Previous" style="display:none;">‹</button>' +
                        '<div class="coverage-screenshot-img-wrap" onclick="toggleCoverageScreenshotZoom()">' +
                            '<img id="coverage-screenshot-img" class="coverage-screenshot-img" src="" alt="" loading="eager">' +
                            '<div id="coverage-screenshot-spinner" class="coverage-screenshot-spinner" style="display:none;"></div>' +
                        '</div>' +
                        '<button type="button" id="coverage-screenshot-next" class="coverage-screenshot-nav coverage-screenshot-nav--next" onclick="stepCoverageScreenshot(1)" aria-label="Next" style="display:none;">›</button>' +
                        '<div id="coverage-screenshot-dots" class="coverage-screenshot-dots" style="display:none;"></div>' +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        _initCoverageViewerTouch();
    }

    function _initCoverageViewerTouch() {
        var stage = document.getElementById('coverage-screenshot-stage');
        if (!stage || stage._touchBound) return;
        stage._touchBound = true;
        var startX = 0;
        var startY = 0;
        stage.addEventListener('touchstart', function (e) {
            if (e.touches && e.touches.length === 1) {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            }
        }, { passive: true });
        stage.addEventListener('touchend', function (e) {
            if (e.changedTouches && e.changedTouches.length === 1) {
                var diffX = e.changedTouches[0].clientX - startX;
                var diffY = e.changedTouches[0].clientY - startY;
                if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX < 0) {
                        stepCoverageScreenshot(1);
                    } else {
                        stepCoverageScreenshot(-1);
                    }
                }
            }
        }, { passive: true });
    }

    function _renderCoverageViewerCurrentSlide() {
        var s = _coverageViewerState;
        if (!s.images || s.images.length === 0) return;
        var cur = s.images[s.currentIndex] || {};

        var titleEl = document.getElementById('coverage-screenshot-title');
        var subtitleEl = document.getElementById('coverage-screenshot-subtitle');
        var counterEl = document.getElementById('coverage-screenshot-counter');
        var imgEl = document.getElementById('coverage-screenshot-img');
        var spinnerEl = document.getElementById('coverage-screenshot-spinner');
        var prevBtn = document.getElementById('coverage-screenshot-prev');
        var nextBtn = document.getElementById('coverage-screenshot-next');
        var dotsEl = document.getElementById('coverage-screenshot-dots');

        if (titleEl) {
            titleEl.textContent = (s.day ? 'D' + s.day : 'Скриншот') + (s.modelName ? ' · ' + s.modelName : '');
        }
        if (subtitleEl) {
            var subParts = [];
            if (s.testerName) subParts.push(window.escapeHTML(s.testerName));
            if (s.hasBug) subParts.push('<span style="color:#f87171;font-weight:700;">🐞 Баг</span>');
            subtitleEl.innerHTML = subParts.join(' · ');
        }

        if (counterEl) {
            if (s.images.length > 1) {
                counterEl.style.display = 'inline-block';
                counterEl.textContent = (s.currentIndex + 1) + ' / ' + s.images.length;
            } else {
                counterEl.style.display = 'none';
            }
        }

        if (prevBtn) {
            prevBtn.style.display = s.images.length > 1 ? 'flex' : 'none';
            prevBtn.style.opacity = s.currentIndex > 0 ? '1' : '0.25';
            prevBtn.style.pointerEvents = s.currentIndex > 0 ? 'auto' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = s.images.length > 1 ? 'flex' : 'none';
            nextBtn.style.opacity = s.currentIndex < s.images.length - 1 ? '1' : '0.25';
            nextBtn.style.pointerEvents = s.currentIndex < s.images.length - 1 ? 'auto' : 'none';
        }

        if (dotsEl) {
            if (s.images.length > 1) {
                dotsEl.style.display = 'flex';
                var dotsHtml = '';
                for (var d = 0; d < s.images.length; d++) {
                    dotsHtml += '<div class="coverage-screenshot-dot ' + (d === s.currentIndex ? 'is-active' : '') + '"></div>';
                }
                dotsEl.innerHTML = dotsHtml;
            } else {
                dotsEl.style.display = 'none';
            }
        }

        if (imgEl) {
            imgEl.classList.remove('is-zoomed');
            var targetSrc = cur.fullUrl || cur.thumbUrl || '';
            if (spinnerEl) spinnerEl.style.display = 'block';
            imgEl.style.opacity = '0.35';

            imgEl.onload = function () {
                if (spinnerEl) spinnerEl.style.display = 'none';
                imgEl.style.opacity = '1';
            };
            imgEl.onerror = function () {
                if (cur.thumbUrl && imgEl.src !== cur.thumbUrl) {
                    imgEl.src = cur.thumbUrl;
                } else {
                    if (spinnerEl) spinnerEl.style.display = 'none';
                    imgEl.style.opacity = '1';
                }
            };
            imgEl.src = targetSrc;
        }
    }

    function stepCoverageScreenshot(delta) {
        var s = _coverageViewerState;
        if (!s.isOpen || !s.images || s.images.length <= 1) return;
        var nextIdx = s.currentIndex + delta;
        if (nextIdx < 0 || nextIdx >= s.images.length) return;
        s.currentIndex = nextIdx;
        _renderCoverageViewerCurrentSlide();
    }

    function toggleCoverageScreenshotZoom() {
        var imgEl = document.getElementById('coverage-screenshot-img');
        if (imgEl) {
            imgEl.classList.toggle('is-zoomed');
        }
    }

    function closeCoverageScreenshotModal(event) {
        if (event && event.target && event.target !== document.getElementById('coverage-screenshot-modal')) return;
        var modal = document.getElementById('coverage-screenshot-modal');
        if (modal) modal.classList.remove('active');
        _coverageViewerState.isOpen = false;
        var imgEl = document.getElementById('coverage-screenshot-img');
        if (imgEl) {
            imgEl.classList.remove('is-zoomed');
            imgEl.src = '';
        }
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }

    function openCoverageScreenshotPreview(proofId, imageCount, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var targetProofId = Number(proofId || 0);
        if (targetProofId <= 0) return;

        // The shared proof viewer already owns secure media tickets, progressive
        // thumbnail/medium loading, swipe navigation, and Telegram originals.
        // Coverage previously bypassed it with raw Telegram file IDs.
        if (typeof window.openCheckinProofOverview === 'function') {
            window.openCheckinProofOverview(targetProofId, { imageCount: Number(imageCount || 1) });
            return;
        }

        // Find proof in _activeCoverageData
        var foundScreenshot = null;
        var foundModel = null;
        if (_activeCoverageData && Array.isArray(_activeCoverageData.models)) {
            for (var mIdx = 0; mIdx < _activeCoverageData.models.length; mIdx++) {
                var m = _activeCoverageData.models[mIdx];
                if (Array.isArray(m.screenshots)) {
                    for (var sIdx = 0; sIdx < m.screenshots.length; sIdx++) {
                        if (Number(m.screenshots[sIdx].id) === targetProofId) {
                            foundScreenshot = m.screenshots[sIdx];
                            foundModel = m;
                            break;
                        }
                    }
                }
                if (foundScreenshot) break;
            }
        }

        var images = [];
        var day = 0;
        var testerName = '';
        var hasBug = false;
        var modelName = foundModel ? foundModel.model_name : '';

        if (foundScreenshot) {
            day = foundScreenshot.day || 0;
            testerName = foundScreenshot.tester_name || '';
            hasBug = !!foundScreenshot.has_bug;
            var mediaList = foundScreenshot.media_items || [];
            if (mediaList.length > 0) {
                images = mediaList.map(function (item) {
                    var fullFileId = item.file_id || item.thumb_file_id || '';
                    var thumbFileId = item.thumb_file_id || item.file_id || '';
                    return {
                        fullUrl: _getCoverageMediaUrl(fullFileId),
                        thumbUrl: _getCoverageMediaUrl(thumbFileId),
                        width: item.width,
                        height: item.height
                    };
                });
            }
        }

        // If no images found in coverage payload, fallback to legacy viewer if available
        if (images.length === 0) {
            if (typeof window.openCheckinProofOverview === 'function') {
                window.openCheckinProofOverview(targetProofId, { imageCount: Number(imageCount || 1) });
                return;
            } else if (typeof window.openCheckinProofPreview === 'function') {
                window.openCheckinProofPreview(targetProofId, 0);
                return;
            }
            return;
        }

        _coverageViewerState.isOpen = true;
        _coverageViewerState.proofId = targetProofId;
        _coverageViewerState.images = images;
        _coverageViewerState.currentIndex = 0;
        _coverageViewerState.day = day;
        _coverageViewerState.modelName = modelName;
        _coverageViewerState.testerName = testerName;
        _coverageViewerState.hasBug = hasBug;

        _ensureCoverageScreenshotModal();
        _renderCoverageViewerCurrentSlide();

        var modal = document.getElementById('coverage-screenshot-modal');
        if (modal) {
            modal.classList.add('active');
            if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
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
    window.openCoverageModel = openCoverageModel;
    window.openCoverageScreenshotPreview = openCoverageScreenshotPreview;
    window.closeCoverageScreenshotModal = closeCoverageScreenshotModal;
    window.stepCoverageScreenshot = stepCoverageScreenshot;
    window.toggleCoverageScreenshotZoom = toggleCoverageScreenshotZoom;

})();
