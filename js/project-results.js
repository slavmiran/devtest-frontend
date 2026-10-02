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
        var screenshotsCount = Number(summary.screenshots_count || 0);
        var checkinsCount = Number(summary.checkins_count || project.checkins_count || 0);
        if (!checkinsCount && Array.isArray(project.testers)) {
            checkinsCount = project.testers.reduce(function (total, tester) {
                return total + Number(tester && tester.checkins_count || 0);
            }, 0);
        }
        var screenshotsShortLabel = window.t('pcResultsScreenshotsShort', {}, lang);
        var checkinsShortLabel = window.t('pcResultsCheckinsShort', {}, lang);
        var evidenceHtml = (screenshotsCount > 0 || checkinsCount > 0)
            ? '<div class="pc-results-evidence-summary" aria-label="' + window.escapeHTML(
                screenshotsCount + ' ' + screenshotsShortLabel + ' · ' + checkinsCount + ' ' + checkinsShortLabel
            ) + '">' +
                '<span class="pc-results-evidence-summary__item" title="' + window.escapeHTML(screenshotsShortLabel) + '">' +
                    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"></rect><circle cx="9" cy="10" r="2"></circle><path d="m20 15-3.2-3.2a1.7 1.7 0 0 0-2.4 0L7 19"></path></svg>' +
                    '<strong>' + screenshotsCount + '</strong><span>' + window.escapeHTML(screenshotsShortLabel) + '</span>' +
                '</span>' +
                '<span class="pc-results-evidence-summary__item" title="' + window.escapeHTML(checkinsShortLabel) + '">' +
                    '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16"></path><rect x="4" y="5" width="16" height="15" rx="2.5"></rect><path d="m8.5 14 2.1 2.1 4.9-5"></path></svg>' +
                    '<strong>' + checkinsCount + '</strong><span>' + window.escapeHTML(checkinsShortLabel) + '</span>' +
                '</span>' +
            '</div>'
            : '';

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
                action: (newModels > 0)
                    ? ('openContinuousCoverageGallery(' + appId + ', { onlyNew: true });')
                    : ('openProjectCoverage(' + appId + ', \'models\');')
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
                '<div class="pc-results-footer">' +
                    evidenceHtml +
                    '<button type="button" class="pc-results-feedback-link" onclick="event.stopPropagation(); openProjectFeedback(' + appId + ', false, { preferUnprocessed: false, typeFilter: \'all\' });">' +
                        '<span>' + window.escapeHTML(allFeedbackLabel) + '</span>' +
                        (feedbackNew > 0 ? '<span class="pc-results-feedback-link__badge is-new">+' + feedbackNew + '</span>' : (feedbackTotal > 0 ? '<span class="pc-results-feedback-link__badge">' + feedbackTotal + '</span>' : '')) +
                        '<span class="pc-results-feedback-link__arrow" aria-hidden="true">›</span>' +
                    '</button>' +
                '</div>' +
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
    var _activeCoverageModelFilter = 'all';
    var _activeCoverageData = null;
    var _expandedModelKeys = {};
    var _coverageMemoryCache = {}; // key: appId + ':' + scope -> { data: ..., timestamp: ... }
    var _activeBrandFilter = 'all';
    var _isBrandFilterExpanded = false;

    // ── Screenshot UI Defects & Tagging Helpers ──

    function getProjectScreenshotDefects(appId) {
        if (!appId) return {};
        try {
            var raw = localStorage.getItem('pc_screenshot_defects_' + appId);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveProjectScreenshotDefects(appId, map) {
        if (!appId) return;
        try {
            localStorage.setItem('pc_screenshot_defects_' + appId, JSON.stringify(map || {}));
        } catch (e) {}
    }

    function isScreenshotDefect(appId, proofId, mediaIndex) {
        var defects = getProjectScreenshotDefects(appId);
        var key = String(proofId) + '_' + String(mediaIndex || 0);
        return !!defects[key];
    }

    function toggleScreenshotDefect(appId, proofId, mediaIndex) {
        var defects = getProjectScreenshotDefects(appId);
        var key = String(proofId) + '_' + String(mediaIndex || 0);
        if (defects[key]) {
            delete defects[key];
        } else {
            defects[key] = true;
        }
        saveProjectScreenshotDefects(appId, defects);
        return !!defects[key];
    }

    function getProjectDefectsCount(appId, covData) {
        if (!appId || !covData || !Array.isArray(covData.models)) return 0;
        var defects = getProjectScreenshotDefects(appId);
        var count = 0;
        covData.models.forEach(function (m) {
            (m.screenshots || []).forEach(function (s) {
                var pId = Number(s.id || 0);
                var mItems = (s.media_items && s.media_items.length) ? s.media_items : [1];
                mItems.forEach(function (item, mIdx) {
                    var realIndex = item && item.media_index != null ? Number(item.media_index) : mIdx;
                    if (defects[String(pId) + '_' + String(realIndex)]) count++;
                });
            });
        });
        return count;
    }

    function tagCoverageNewModels(appId, covData) {
        if (!covData || !Array.isArray(covData.models)) return;
        var seenState = getProjectResultsSeenState(appId);
        var seenTuplesMap = {};
        (seenState.seen_tuples || []).forEach(function (t) {
            seenTuplesMap[String(t[0]) + '::' + String(t[1])] = true;
        });
        covData.models.forEach(function (m) {
            var mKey = String(m.model_key || m.model_name || '');
            var versions = m.android_versions || [];
            var isNew = false;
            if (versions.length > 0) {
                isNew = versions.some(function (v) { return !seenTuplesMap[mKey + '::' + v]; });
            } else {
                isNew = !seenTuplesMap[mKey + '::all'];
            }
            if (isNew) {
                m.is_new = true;
            }
        });
    }

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
            _activeBrandFilter = 'all';
            _isBrandFilterExpanded = false;
            _activeCoverageModelFilter = 'all';
        }
        _activeCoverageAppId = targetAppId;
        if (typeof window !== 'undefined') {
            window._activeCoverageAppId = targetAppId;
        }

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

        function applyNewModelFocus(container) {
            if (!options || !options.focusNewModel || !container) return;
            setTimeout(function () {
                var firstNewCard = container.querySelector('.coverage-device-card.is-new-model');
                if (!firstNewCard) return;
                var modelKey = firstNewCard.id ? firstNewCard.id.replace(/^cov-model-/, '') : '';
                if (modelKey) expandCoverageModelCard(modelKey, true);
                firstNewCard = document.getElementById('cov-model-' + modelKey) || firstNewCard;
                firstNewCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstNewCard.classList.add('is-new-highlight');
                setTimeout(function () {
                    firstNewCard.classList.remove('is-new-highlight');
                }, 3200);
            }, 80);
        }

        var cacheKey = String(_activeCoverageAppId) + ':' + String(_activeCoverageScope);
        var cached = _coverageMemoryCache[cacheKey];
        var forceReload = !!(options && options.forceReload);

        if (cached && cached.data) {
            tagCoverageNewModels(_activeCoverageAppId, cached.data);
            _activeCoverageData = cached.data;
            renderCoverageScreen(body, cached.data);
            applyNewModelFocus(body);
            markProjectCoverageSeen(_activeCoverageAppId, cached.data);

            var ageMs = Date.now() - (cached.timestamp || 0);
            if (ageMs < 60000 && !forceReload) {
                return;
            }

            // Stale-While-Revalidate: background refresh without flicker
            fetchProjectCoverage(_activeCoverageAppId, _activeCoverageScope).then(function (fresh) {
                _coverageMemoryCache[cacheKey] = { data: fresh, timestamp: Date.now() };
                if (_activeCoverageAppId === targetAppId) {
                    tagCoverageNewModels(_activeCoverageAppId, fresh);
                    _activeCoverageData = fresh;
                    renderCoverageScreen(body, fresh);
                    markProjectCoverageSeen(_activeCoverageAppId, fresh);
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
            tagCoverageNewModels(_activeCoverageAppId, coverage);
            _activeCoverageData = coverage;
            renderCoverageScreen(body, coverage);
            applyNewModelFocus(body);
            markProjectCoverageSeen(_activeCoverageAppId, coverage);
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
                            '<div class="coverage-header__title">' + window.escapeHTML(window.t('coverageDevicesScreensTitle', {}, lang) || 'Устройства и экраны') + '</div>' +
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
                            '<div class="coverage-header__title">' + window.escapeHTML(window.t('coverageDevicesScreensTitle', {}, lang) || 'Устройства и экраны') + '</div>' +
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

    // ── Device Brand Extractor & Stack Aggregator ──

    function extractDeviceBrand(modelName) {
        if (!modelName || typeof modelName !== 'string') return 'Other';
        var clean = modelName.trim();
        if (!clean) return 'Other';

        if (/^samsung|^galaxy\b/i.test(clean)) return 'Samsung';
        if (/^xiaomi/i.test(clean)) return 'Xiaomi';
        if (/^redmi/i.test(clean)) return 'Redmi';
        if (/^poco\b/i.test(clean)) return 'Poco';
        if (/^google|^pixel\b/i.test(clean)) return 'Google';
        if (/^oneplus/i.test(clean)) return 'OnePlus';
        if (/^realme/i.test(clean)) return 'Realme';
        if (/^huawei/i.test(clean)) return 'Huawei';
        if (/^honor/i.test(clean)) return 'Honor';
        if (/^oppo/i.test(clean)) return 'Oppo';
        if (/^vivo\b|^iqoo\b/i.test(clean)) return 'Vivo';
        if (/^motorola|^moto\b/i.test(clean)) return 'Motorola';
        if (/^sony|^xperia\b/i.test(clean)) return 'Sony';
        if (/^asus|^rog\b/i.test(clean)) return 'Asus';
        if (/^nothing/i.test(clean)) return 'Nothing';
        if (/^infinix/i.test(clean)) return 'Infinix';
        if (/^tecno/i.test(clean)) return 'Tecno';
        if (/^zte|^nubia\b/i.test(clean)) return 'ZTE';

        var firstWord = clean.split(/\s+/)[0];
        if (firstWord && firstWord.length > 1) {
            return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
        }
        return 'Other';
    }

    function aggregateModelStacks(modelsList) {
        if (!Array.isArray(modelsList)) return [];
        var map = {};
        var order = [];
        modelsList.forEach(function (m) {
            if (!m || !m.model_name) return;
            var key = String(m.model_key || m.model_name).trim().toLowerCase();
            if (!map[key]) {
                map[key] = {
                    model_name: m.model_name,
                    model_key: m.model_key || key,
                    brand: m.brand || extractDeviceBrand(m.model_name),
                    android_versions: [],
                    android_major_versions: [],
                    testers: [],
                    screenshots: [],
                    screenshots_count: 0,
                    bugs_count: 0,
                    ideas_count: 0,
                    reviews_count: 0,
                    feedback_items: [],
                    iterations: [],
                    in_current_iteration: !!m.in_current_iteration,
                    is_new: !!m.is_new
                };
                order.push(key);
            }
            var entry = map[key];
            if (m.in_current_iteration) entry.in_current_iteration = true;
            if (m.is_new) entry.is_new = true;
            entry.bugs_count += Number(m.bugs_count || 0);
            entry.ideas_count += Number(m.ideas_count || 0);
            entry.reviews_count += Number(m.reviews_count || 0);

            (m.iterations || []).forEach(function (it) {
                if (entry.iterations.indexOf(it) < 0) entry.iterations.push(it);
            });

            (m.testers || []).forEach(function (t) {
                if (!t) return;
                var tid = Number(t.tester_id || 0);
                var existingT = entry.testers.find(function (x) { return Number(x.tester_id || 0) === tid; });
                if (!existingT) {
                    entry.testers.push(t);
                }
            });

            (m.screenshots || []).forEach(function (s) {
                if (!s) return;
                var sid = Number(s.id || 0);
                var existingS = entry.screenshots.find(function (x) { return Number(x.id || 0) === sid; });
                if (!existingS) {
                    entry.screenshots.push(s);
                }
            });
            entry.screenshots_count = entry.screenshots.length
                ? entry.screenshots.reduce(function (total, shot) { return total + Math.max(1, Number(shot.image_count || 1)); }, 0)
                : Number(m.screenshots_count || 0);

            (m.feedback_items || []).forEach(function (fb) {
                if (!fb) return;
                var fbid = Number(fb.id || 0);
                var existingFb = entry.feedback_items.find(function (x) { return Number(x.id || 0) === fbid; });
                if (!existingFb) {
                    entry.feedback_items.push(fb);
                }
            });

            (m.android_versions || []).forEach(function (v) {
                if (entry.android_versions.indexOf(v) < 0) entry.android_versions.push(v);
            });
        });

        return order.map(function (k) { return map[k]; });
    }

    // ── Summary Cockpit (Google Play Overview) ──

    var ANDROID_PALETTE = ['#38bdf8', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#14b8a6'];

    function renderCoverageCockpit(data, lang) {
        var versions = data.android_versions || [];
        var countries = (data.countries || []).filter(function (c) { return c && c.code && c.code !== 'unknown'; });

        var segmentsHtml = versions.map(function (v, idx) {
            var color = ANDROID_PALETTE[idx % ANDROID_PALETTE.length];
            var pct = Math.max(0, Math.min(100, Number(v.percentage || 0)));
            if (pct <= 0) return '';
            var label = (v.version || ('Android ' + v.major_version)) + ': ' + pct + '% (' + (v.testers_count || 0) + ')';
            return '<div class="coverage-android-segment" style="width:' + pct + '%; background-color:' + color + ';" title="' + window.escapeHTML(label) + '"></div>';
        }).join('');

        var chipsHtml = versions.map(function (v, idx) {
            var color = ANDROID_PALETTE[idx % ANDROID_PALETTE.length];
            var major = v.major_version || String(v.version || '').replace(/^Android\s*/i, '');
            var count = Number(v.testers_count || (v.models && v.models.length) || 0);
            return '<span class="coverage-cockpit-chip" style="--chip-accent:' + color + ';">' +
                '<strong style="color:' + color + ';">' + androidIconSvg('coverage-cockpit-chip__android') + window.escapeHTML(major) + ':</strong> ' + v.percentage + '% ' +
                '<span class="coverage-cockpit-chip__count">(' + count + ')</span>' +
            '</span>';
        }).join('');

        var countriesLineHtml = '';
        if (countries.length > 0) {
            var countryPills = countries.map(function (c) {
                var cName = (lang === 'ru' ? c.name_ru : c.name) || c.code;
                return '<span class="coverage-country-pill" title="' + window.escapeHTML(cName + ' (' + c.testers_count + ')') + '">' +
                    '<span class="coverage-country-flag" aria-hidden="true">' + (c.flag || '🌐') + '</span> ' +
                    '<strong>' + window.escapeHTML(c.code) + '</strong>' +
                '</span>';
            }).join('<span class="coverage-country-sep">·</span>');

            var cCount = Number((data.stats && data.stats.countries_count) || countries.length);
            var cWord = lang === 'ru'
                ? formatPluralRu(cCount, 'страна', 'страны', 'стран')
                : (cCount === 1 ? 'country' : 'countries');

            countriesLineHtml = (
                '<div class="coverage-cockpit-countries">' +
                    '<div class="coverage-cockpit-countries__list">' + countryPills + '</div>' +
                    '<span class="coverage-cockpit-countries__badge">🌐 ' + cCount + ' ' + window.escapeHTML(cWord) + '</span>' +
                '</div>'
            );
        }

        if (!segmentsHtml && !chipsHtml && !countriesLineHtml) return '';

        return (
            '<div class="coverage-cockpit">' +
                (segmentsHtml ? '<div class="coverage-android-segment-bar" role="progressbar" aria-label="Android versions">' + segmentsHtml + '</div>' : '') +
                (chipsHtml ? '<div class="coverage-cockpit-chips">' + chipsHtml + '</div>' : '') +
                countriesLineHtml +
            '</div>'
        );
    }

    // ── Adaptive Brand Filter ──

    function renderCoverageBrandFilter(models, lang) {
        if (!models || models.length === 0) return '';
        var brandMap = {};
        models.forEach(function (m) {
            var b = m.brand || extractDeviceBrand(m.model_name);
            brandMap[b] = (brandMap[b] || 0) + 1;
        });

        var brandNames = Object.keys(brandMap).sort(function (a, b) {
            if (a.toLowerCase() === 'other') return 1;
            if (b.toLowerCase() === 'other') return -1;
            return brandMap[b] - brandMap[a] || a.localeCompare(b);
        });

        var totalChips = brandNames.length + 1;
        var expandedRows = 2;
        if (totalChips <= 6) expandedRows = 2;
        else if (totalChips <= 10) expandedRows = 3;
        else if (totalChips <= 16) expandedRows = 4;
        else expandedRows = 5;

        var currentRows = _isBrandFilterExpanded ? expandedRows : 1;

        var allChips = [];
        var allActive = (_activeBrandFilter === 'all' || !brandMap[_activeBrandFilter]);
        if (allActive) _activeBrandFilter = 'all';

        var allBrandsLabel = window.t('coverageFilterAllBrands', {}, lang) || (lang === 'ru' ? 'Все бренды' : 'All brands');
        allChips.push(
            '<button type="button" class="coverage-brand-chip ' + (allActive ? 'is-active' : '') + '" data-brand="all" onclick="selectCoverageBrand(\'all\')">' +
                '<span class="coverage-brand-chip__text">' + window.escapeHTML(allBrandsLabel) + '</span> ' +
                '<span class="coverage-brand-chip__count">(' + models.length + ')</span>' +
            '</button>'
        );

        brandNames.forEach(function (b) {
            var isActive = (_activeBrandFilter === b);
            allChips.push(
                '<button type="button" class="coverage-brand-chip ' + (isActive ? 'is-active' : '') + '" data-brand="' + window.escapeHTML(b) + '" onclick="selectCoverageBrand(\'' + window.escapeHTML(b) + '\')">' +
                    '<span class="coverage-brand-chip__text">' + window.escapeHTML(b) + '</span> ' +
                    '<span class="coverage-brand-chip__count">(' + brandMap[b] + ')</span>' +
                '</button>'
            );
        });

        var expandBtnHtml = '';
        if (totalChips > 2) {
            var expandTitle = _isBrandFilterExpanded
                ? (window.t('coverageBrandFilterCollapse', {}, lang) || 'Свернуть фильтр брендов')
                : (window.t('coverageBrandFilterExpand', {}, lang) || 'Развернуть фильтр брендов');
            expandBtnHtml = (
                '<button type="button" class="brand-filter-expand-btn ' + (_isBrandFilterExpanded ? 'is-expanded' : '') + '" onclick="toggleCoverageBrandFilter()" title="' + window.escapeHTML(expandTitle) + '" aria-label="' + window.escapeHTML(expandTitle) + '">' +
                    (_isBrandFilterExpanded
                        ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
                        : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>') +
                '</button>'
            );
        }

        var brandsTitle = window.t('coverageBrandsLabel', {}, lang) || (lang === 'ru' ? 'Бренды:' : 'Brands:');

        return (
            '<div class="coverage-brands-panel" id="coverage-brands-panel">' +
                '<div class="coverage-brands-panel__head">' +
                    '<span class="coverage-brands-panel__title">' +
                        '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>' +
                        '<span>' + window.escapeHTML(brandsTitle) + '</span>' +
                    '</span>' +
                    '<span class="coverage-brands-panel__count">' + brandNames.length + '</span>' +
                '</div>' +
                '<div class="coverage-brand-filter-wrapper ' + (_isBrandFilterExpanded ? 'is-expanded' : '') + '" id="coverage-brand-filter-wrapper">' +
                    '<div class="coverage-brand-filter-track" style="--brand-filter-rows: ' + currentRows + ';">' +
                        allChips.join('') +
                    '</div>' +
                    expandBtnHtml +
                '</div>' +
            '</div>'
        );
    }

    function selectCoverageBrand(brand) {
        _activeBrandFilter = brand;
        var wrapper = document.getElementById('coverage-brand-filter-wrapper');
        if (wrapper) {
            wrapper.querySelectorAll('.coverage-brand-chip').forEach(function (btn) {
                var bAttr = btn.getAttribute('data-brand') || '';
                btn.classList.toggle('is-active', bAttr === brand);
            });
        }
        var cardList = document.querySelectorAll('.coverage-device-card');
        var visibleCount = 0;
        cardList.forEach(function (card) {
            var cardBrand = card.getAttribute('data-brand') || '';
            var show = (brand === 'all' || cardBrand === brand);
            card.classList.toggle('is-brand-hidden', !show);
            if (show) visibleCount++;
        });
        var emptyNotice = document.getElementById('coverage-brand-empty-notice');
        if (emptyNotice) {
            emptyNotice.style.display = (visibleCount === 0) ? 'block' : 'none';
        }
    }

    function toggleCoverageBrandFilter() {
        _isBrandFilterExpanded = !_isBrandFilterExpanded;
        var wrapper = document.getElementById('coverage-brand-filter-wrapper');
        if (!wrapper) return;
        var track = wrapper.querySelector('.coverage-brand-filter-track');
        var btn = wrapper.querySelector('.brand-filter-expand-btn');
        var totalChips = wrapper.querySelectorAll('.coverage-brand-chip').length;
        var expandedRows = 2;
        if (totalChips <= 6) expandedRows = 2;
        else if (totalChips <= 10) expandedRows = 3;
        else if (totalChips <= 16) expandedRows = 4;
        else expandedRows = 5;

        var rows = _isBrandFilterExpanded ? expandedRows : 1;
        wrapper.classList.toggle('is-expanded', _isBrandFilterExpanded);
        if (track) track.style.setProperty('--brand-filter-rows', rows);
        if (btn) {
            btn.classList.toggle('is-expanded', _isBrandFilterExpanded);
            btn.innerHTML = _isBrandFilterExpanded
                ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
                : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>';
        }
    }

    // ── Aggregated Device Cards (Стопки моделей) ──

    function renderCoverageDeviceCards(models, lang) {
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

        var filteredModels = models;
        if (_activeCoverageModelFilter === 'new') {
            filteredModels = models.filter(function (m) { return m.is_new; });
        } else if (_activeCoverageModelFilter === 'defects') {
            filteredModels = models.filter(function (m) {
                return (m.screenshots || []).some(function (s) {
                    var sProofId = Number(s.id || 0);
                    return (s.media_items || []).some(function (item, index) {
                        return isScreenshotDefect(_activeCoverageAppId, sProofId, item && item.media_index != null ? item.media_index : index);
                    });
                });
            });
        }

        if (_activeCoverageModelFilter === 'defects' && filteredModels.length === 0) {
            return (
                '<div class="coverage-defects-empty">' +
                    '<div class="coverage-defects-empty__icon">🛡️</div>' +
                    '<div class="coverage-defects-empty__title">' +
                        window.escapeHTML(lang === 'ru' ? 'Дефекты не отмечены' : 'No defects reported') +
                    '</div>' +
                    '<div class="coverage-defects-empty__desc">' +
                        window.escapeHTML(window.t('coverageNoDefectsEmpty', {}, lang) || (lang === 'ru'
                            ? 'Дефектов интерфейса пока не отмечено. Вы можете пометить скриншот дефектом в режиме полноэкранного просмотра кнопкой [⚠️ Дефект].'
                            : 'No UI defects reported yet. You can flag a screenshot as a defect in fullscreen view using the [⚠️ Defect] button.')) +
                    '</div>' +
                '</div>'
            );
        }

        if (_activeCoverageModelFilter === 'new' && filteredModels.length === 0) {
            return (
                '<div style="text-align: center; padding: 40px 16px; color: var(--text-secondary);">' +
                    '<div style="font-size: 36px; margin-bottom: 10px;">✨</div>' +
                    '<div style="font-size: 15px; font-weight: 700; color: var(--text-color); margin-bottom: 6px;">' +
                        window.escapeHTML(lang === 'ru' ? 'Новых устройств пока нет' : 'No new devices') +
                    '</div>' +
                '</div>'
            );
        }

        var cardsHtml = filteredModels.map(function (m) {
            var isExpanded = !!_expandedModelKeys[m.model_key];
            var brand = m.brand || extractDeviceBrand(m.model_name);
            var isBrandHidden = (_activeBrandFilter !== 'all' && _activeBrandFilter !== brand);

            // 1. Stack badge
            var tCount = (m.testers || []).length;
            var stackBadgeHtml = '';
            if (tCount > 1) {
                var tWord = lang === 'ru'
                    ? formatPluralRu(tCount, 'тестер', 'тестера', 'тестеров')
                    : (tCount === 1 ? 'tester' : 'testers');
                stackBadgeHtml = '<span class="coverage-device-stack-badge">👥 ' + tCount + ' ' + window.escapeHTML(tWord) + '</span>';
            } else if (tCount === 1) {
                var singleWord = lang === 'ru' ? '1 тестер' : '1 tester';
                stackBadgeHtml = '<span class="coverage-device-stack-badge coverage-device-stack-badge--single">👤 ' + window.escapeHTML(singleWord) + '</span>';
            }

            // Feedback and status stay in the header; device details live with
            // each tester and screenshot below, where they belong.
            var fbBadges = [];
            if (m.bugs_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--bug">🐞 ' + m.bugs_count + '</span>');
            if (m.ideas_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--idea">💡 ' + m.ideas_count + '</span>');
            if (m.reviews_count > 0) fbBadges.push('<span class="coverage-fb-badge coverage-fb-badge--review">★ ' + m.reviews_count + '</span>');

            var currentBadge = m.in_current_iteration
                ? '<span class="coverage-badge-current">' + window.escapeHTML(window.t('coverageCurrentBadge', {}, lang) || 'Текущая') + '</span>'
                : '';
            var newBadge = m.is_new
                ? '<span class="coverage-badge-new">+NEW</span>'
                : '';

            // Inline screenshot gallery
            var galleryHtml = '';
            var screenshots = m.screenshots || [];
            if (isExpanded && screenshots.length > 0) {
                var thumbs = screenshots.map(function (s) {
                    var proofId = Number(s.id);
                    var imgCount = Number(s.image_count || 1);
                    var firstMedia = Array.isArray(s.media_items) ? s.media_items[0] : null;
                    var firstMediaIndex = firstMedia && firstMedia.media_index != null ? Number(firstMedia.media_index) : 0;
                    var isDefect = isScreenshotDefect(_activeCoverageAppId, proofId, firstMediaIndex);
                    if (_activeCoverageModelFilter === 'defects' && !isDefect) {
                        return '';
                    }

                    var tObj = (m.testers || []).find(function (t) { return Number(t.tester_id || 0) === Number(s.tester_id || 0); }) || ((m.testers || []).length === 1 ? m.testers[0] : {});
                    var rawAv = s.android_version || tObj.android_version || '';
                    var matchAv = String(rawAv).match(/(?:android\s*)?(\d+)/i);
                    var osPart = matchAv ? matchAv[1] : String(rawAv).replace(/^Android\s*/i, '').trim();
                    var authorName = s.tester_name || tObj.username || tObj.full_name || '';
                    if (authorName && !/^@/.test(authorName)) {
                        authorName = '@' + authorName;
                    }
                    var dateMatch = String(s.created_at || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
                    var dateLabel = dateMatch ? dateMatch[3] + '.' + dateMatch[2] : '';
                    var width = Number(firstMedia && firstMedia.width || 0);
                    var height = Number(firstMedia && firstMedia.height || 0);
                    var resolutionLabel = width > 0 && height > 0 ? width + '×' + height : '';
                    var screenshotTitle = [dateLabel, rawAv, resolutionLabel, authorName].filter(Boolean).join(' · ');

                    var isBug = !!(s.has_bug || s.proof_type === 'bug');
                    var isIdea = !isBug && !!(s.has_idea || s.proof_type === 'idea');
                    var isReview = !isBug && !isIdea && (s.proof_type === 'play_review' || s.proof_type === 'review');

                    var typeBadgeHtml = '';
                    if (isBug) {
                        var bugWord = window.t('coverageBadgeBug', {}, lang) || (lang === 'ru' ? 'Баг' : 'Bug');
                        typeBadgeHtml = '<span class="coverage-gallery-thumb__type-badge coverage-gallery-thumb__type-badge--bug" title="' + window.escapeHTML(bugWord) + '">🐞 ' + window.escapeHTML(bugWord) + '</span>';
                    } else if (isIdea) {
                        var ideaWord = window.t('coverageBadgeIdea', {}, lang) || (lang === 'ru' ? 'Идея' : 'Idea');
                        typeBadgeHtml = '<span class="coverage-gallery-thumb__type-badge coverage-gallery-thumb__type-badge--idea" title="' + window.escapeHTML(ideaWord) + '">💡 ' + window.escapeHTML(ideaWord) + '</span>';
                    } else if (isReview) {
                        var reviewWord = window.t('coverageBadgeReview', {}, lang) || (lang === 'ru' ? 'Отзыв' : 'Review');
                        typeBadgeHtml = '<span class="coverage-gallery-thumb__type-badge coverage-gallery-thumb__type-badge--review" title="' + window.escapeHTML(reviewWord) + '">★ ' + window.escapeHTML(reviewWord) + '</span>';
                    }

                    var itemClasses = ['coverage-gallery-item'];
                    if (isDefect) itemClasses.push('has-defect');
                    if (isBug) itemClasses.push('has-bug');
                    if (isIdea) itemClasses.push('has-idea');

                    var thumbImgHtml = '<img class="coverage-gallery-thumb__img" data-proof-id="' + proofId + '" data-media-index="' + firstMediaIndex + '" loading="lazy" decoding="async" alt="" onload="if(this.nextElementSibling)this.nextElementSibling.style.display=\'none\'" onerror="this.style.display=\'none\'; if(this.nextElementSibling) this.nextElementSibling.style.display=\'flex\';">' +
                        '<div class="coverage-gallery-thumb__fallback"><span style="font-size:22px;">📱</span></div>' +
                        (isDefect ? '<span class="coverage-gallery-thumb__defect-icon" title="' + window.escapeHTML(lang === 'ru' ? 'Дефект UI' : 'UI Defect') + '">⚠️</span>' : '');

                    return (
                        '<button type="button" class="' + itemClasses.join(' ') + '" data-proof-id="' + proofId + '" data-media-index="' + firstMediaIndex + '" onclick="openCoverageModelGallery(this.closest(\'.coverage-device-card\').getAttribute(\'data-model-key\'), ' + proofId + ', ' + firstMediaIndex + ');" title="' + window.escapeHTML(screenshotTitle) + '" aria-label="' + window.escapeHTML(screenshotTitle || (lang === 'ru' ? 'Открыть скриншот' : 'Open screenshot')) + '">' +
                            '<div class="coverage-gallery-thumb">' +
                                thumbImgHtml +
                                typeBadgeHtml +
                                (imgCount > 1 ? '<span class="coverage-gallery-thumb__count">+' + (imgCount - 1) + '</span>' : '') +
                                (dateLabel ? '<span class="coverage-gallery-thumb__date">' + window.escapeHTML(dateLabel) + '</span>' : '') +
                                '<span class="coverage-gallery-thumb__meta">' +
                                    (authorName ? '<span class="coverage-gallery-thumb__author notranslate">' + window.escapeHTML(authorName) + '</span>' : '') +
                                    ((osPart || resolutionLabel) ? '<span class="coverage-gallery-thumb__specs">' +
                                        (osPart ? '<span>' + androidIconSvg('coverage-gallery-thumb__android') + window.escapeHTML(osPart) + '</span>' : '') +
                                        ((osPart && resolutionLabel) ? '<span class="coverage-gallery-thumb__sep" aria-hidden="true">·</span>' : '') +
                                        (resolutionLabel ? '<span>' + window.escapeHTML(resolutionLabel) + '</span>' : '') +
                                    '</span>' : '') +
                                '</span>' +
                            '</div>' +
                        '</button>'
                    );
                }).join('');
                galleryHtml = '<div class="coverage-device-gallery"><div class="coverage-device-gallery-scroller">' + thumbs + '</div></div>';
            } else if (isExpanded) {
                galleryHtml = '<div class="coverage-device-gallery"><div class="coverage-device-gallery-empty">' + window.escapeHTML(window.t('coverageScreenshotsEmpty', {}, lang) || 'Скриншоты интерфейса ещё не загружены') + '</div></div>';
            }

            // Accordion Details: Testers HTML
            var testersHtml = isExpanded ? (m.testers || []).map(function (t) {
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
            }).join('') : '';

            // Accordion Details: Feedback HTML
            var feedbackHtml = '';
            if (isExpanded && m.feedback_items && m.feedback_items.length > 0) {
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
            } else if (isExpanded) {
                feedbackHtml = (
                    '<div class="coverage-section-title">💬 ' + window.escapeHTML(window.t('coverageFeedbackFound', {}, lang) || 'Найденный фидбэк') + ' (0)</div>' +
                    '<div class="coverage-fb-empty-note">' + window.escapeHTML(window.t('coverageNoIssuesOnDevice', {}, lang) || 'Замечаний на этой модели не зафиксировано') + '</div>'
                );
            }

            // Iterations
            var iterationsHtml = '';
            if (isExpanded && m.iterations && m.iterations.length > 0) {
                var itChips = m.iterations.map(function (it) {
                    return '<span class="coverage-meta-pill">Run #' + it + '</span>';
                }).join(' ');
                iterationsHtml = '<div class="coverage-model-iterations"><span>' + window.escapeHTML(lang === 'ru' ? 'Итерации:' : 'Runs:') + '</span>' + itChips + '</div>';
            }

            var firstScreenshot = _activeCoverageModelFilter === 'defects'
                ? screenshots.find(function (shot) {
                    var proofId = Number(shot.id || 0);
                    return (shot.media_items || []).some(function (item, index) {
                        return isScreenshotDefect(_activeCoverageAppId, proofId, item && item.media_index != null ? item.media_index : index);
                    });
                }) || screenshots[0]
                : screenshots[0];
            var coverProofId = firstScreenshot ? Number(firstScreenshot.id || 0) : 0;
            var coverMedia = firstScreenshot && Array.isArray(firstScreenshot.media_items) ? firstScreenshot.media_items[0] : null;
            var coverMediaIndex = coverMedia && coverMedia.media_index != null ? Number(coverMedia.media_index) : 0;
            var androidLabels = (m.android_versions || []).map(function (v) {
                var found = String(v || '').match(/(?:android\s*)?(\d+)/i);
                return found ? found[1] : String(v || '').replace(/^Android\s*/i, '').trim();
            }).filter(Boolean).sort(function (a, b) { return Number(a) - Number(b); });
            var androidText = androidLabels.length > 1 ? androidLabels[0] + '–' + androidLabels[androidLabels.length - 1] : (androidLabels[0] || '—');
            var testerWord = lang === 'ru' ? formatPluralRu(tCount, 'тестер', 'тестера', 'тестеров') : (tCount === 1 ? 'tester' : 'testers');
            var coverHtml = !isExpanded && coverProofId > 0
                ? '<img class="pc-model-card__cover coverage-gallery-thumb__img" data-proof-id="' + coverProofId + '" data-media-index="' + coverMediaIndex + '" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\'">'
                : (isExpanded ? '' : '<span class="pc-model-card__empty" aria-hidden="true">' + androidIconSvg('pc-model-card__android') + '</span>');
            return (
                '<div id="cov-model-' + window.escapeHTML(m.model_key) + '" class="coverage-device-card pc-model-card' + (m.is_new ? ' is-new-model' : '') + ' ' + (isExpanded ? 'is-expanded' : '') + (isBrandHidden ? ' is-brand-hidden' : '') + '" data-brand="' + window.escapeHTML(brand) + '" data-model-key="' + window.escapeHTML(m.model_key) + '">' +
                    '<button type="button" class="pc-model-card__screen" ' + (coverProofId > 0 ? 'onclick="openCoverageModelGallery(this.closest(\'.coverage-device-card\').getAttribute(\'data-model-key\'), ' + coverProofId + ', ' + coverMediaIndex + ');"' : 'disabled') + ' aria-label="' + window.escapeHTML((lang === 'ru' ? 'Смотреть скриншоты: ' : 'View screenshots: ') + m.model_name) + '">' +
                        coverHtml +
                        '<span class="pc-model-card__screen-shade" aria-hidden="true"></span>' +
                        (m.is_new ? '<span class="pc-model-card__new">+NEW</span>' : '') +
                        '<span class="pc-model-card__count">▧ ' + Number(m.screenshots_count || 0) + '</span>' +
                        (coverProofId > 0 ? '<span class="pc-model-card__play" aria-hidden="true">▶</span>' : '') +
                    '</button>' +
                    '<button type="button" class="pc-model-card__footer" onclick="toggleCoverageModelExpand(this.closest(\'.coverage-device-card\').getAttribute(\'data-model-key\'))" aria-expanded="false">' +
                        '<span class="pc-model-card__footer-copy"><strong class="notranslate">' + window.escapeHTML(m.model_name) + '</strong><small>👤 ' + tCount + ' ' + window.escapeHTML(testerWord) + ' · Android ' + window.escapeHTML(androidText) + '</small></span>' +
                        '<span class="pc-model-card__footer-chevron" aria-hidden="true">⌄</span>' +
                    '</button>' +
                    (isExpanded ? '<button type="button" class="coverage-device-card__head" onclick="toggleCoverageModelExpand(this.closest(\'.coverage-device-card\').getAttribute(\'data-model-key\'))" aria-expanded="true">' +
                        '<div class="coverage-device-card__head-left">' +
                            '<div class="coverage-device-card__title-row">' +
                                '<span class="coverage-device-name notranslate">' + window.escapeHTML(m.model_name) + '</span>' +
                                stackBadgeHtml +
                                currentBadge +
                                newBadge +
                            '</div>' +
                        '</div>' +
                        '<div class="coverage-device-card__head-right">' +
                            (m.screenshots_count > 0 ? '<span class="coverage-model-evidence" title="' + window.escapeHTML(lang === 'ru' ? 'Скриншоты интерфейса' : 'Interface screenshots') + '"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="m20 15-3.2-3.2a1.7 1.7 0 0 0-2.4 0L7 19"/></svg><strong>' + m.screenshots_count + '</strong></span>' : '') +
                            '<div class="coverage-model-feedback-badges">' + fbBadges.join('') + '</div>' +
                            '<svg class="coverage-model-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>' +
                        '</div>' +
                    '</button>' +
                    galleryHtml +
                    '<div class="coverage-device-card__details">' +
                        '<div class="coverage-section-title">👥 ' + window.escapeHTML(window.t('coverageTesterTitle', {}, lang) || 'Тестеры') + ' (' + (m.testers || []).length + ')</div>' +
                        '<div class="coverage-testers-list">' + testersHtml + '</div>' +
                        feedbackHtml +
                        iterationsHtml +
                    '</div>' : '') +
                '</div>'
            );
        }).join('');

        var emptyNoticeHtml = '<div id="coverage-brand-empty-notice" style="display:none; text-align:center; padding: 24px 16px; color: var(--text-secondary);">' +
            window.escapeHTML(lang === 'ru' ? 'Нет устройств выбранного бренда' : 'No devices for selected brand') +
        '</div>';

        return '<div class="coverage-models-list" id="coverage-device-cards-list">' + cardsHtml + emptyNoticeHtml + '</div>';
    }

    function renderCoverageArchive(items, lang) {
        if (!items || !items.length) {
            return '<div class="coverage-archive-empty">' + window.escapeHTML(lang === 'ru'
                ? 'Архив пока пуст. Снимки можно отправить сюда из просмотрщика.'
                : 'The archive is empty. Move screenshots here from the viewer.') + '</div>';
        }
        return '<div class="coverage-archive-grid">' + items.map(function (item) {
            var proofId = Number(item.proof_id || 0);
            var mediaIndex = Number(item.media_index || 0);
            var dateMatch = String(item.created_at || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
            var dateLabel = dateMatch ? dateMatch[3] + '.' + dateMatch[2] + '.' + dateMatch[1] : '';
            var modelName = item.model_name || (lang === 'ru' ? 'Неизвестная модель' : 'Unknown model');
            return '<button type="button" class="coverage-archive-item" onclick="openContinuousCoverageGallery(' + Number(_activeCoverageAppId) + ', { archive: true, initialProofId: ' + proofId + ', initialMediaIndex: ' + mediaIndex + ' })" aria-label="' + window.escapeHTML(modelName + (dateLabel ? ' · ' + dateLabel : '')) + '">' +
                '<span class="coverage-archive-item__image">' +
                    '<img class="coverage-gallery-thumb__img" data-proof-id="' + proofId + '" data-media-index="' + mediaIndex + '" loading="lazy" decoding="async" alt="" onerror="this.style.display=\'none\'">' +
                    '<span class="coverage-archive-item__marker" aria-hidden="true">📦</span>' +
                '</span>' +
                '<span class="coverage-archive-item__info"><strong class="notranslate">' + window.escapeHTML(modelName) + '</strong><small>' + window.escapeHTML(dateLabel) + '</small></span>' +
            '</button>';
        }).join('') + '</div>';
    }

    // ── Main Coverage Screen Renderer ──

    function renderCoverageScreen(container, data) {
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
        if (container && container.classList) container.classList.remove('is-header-compact');
        var stats = data.stats || {};
        var models = data.models || [];

        // Summary metric dimensions
        var dimensionParts = [];
        var mCount = stats.models_count || models.length || 0;
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
            '</div><div class="coverage-stat-bar__evidence" title="' + window.escapeHTML(lang === 'ru' ? 'Скриншоты интерфейса' : 'Interface screenshots') + '">' +
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

        var currentRun = Number(data.current_iteration || 1);
        var currentRunText = window.t('coverageScopeCurrentRun', { run: currentRun }, lang) || (lang === 'ru' ? ('Текущий запуск (№' + currentRun + ')') : ('Current run (#' + currentRun + ')'));
        var allTimeLabel = window.t('coverageScopeAll', {}, lang) || 'За всё время';

        var aggregatedModels = aggregateModelStacks(models);
        var cockpitHtml = renderCoverageCockpit(data, lang);
        var defectCount = getProjectDefectsCount(_activeCoverageAppId, data);
        var archiveCount = Number(data.archived_count || (data.archived_screenshots || []).length || 0);
        var filterPillsHtml = (
            '<div class="coverage-status-filter-bar">' +
                '<div class="coverage-filter-pills" role="tablist" aria-label="' + window.escapeHTML(lang === 'ru' ? 'Фильтры' : 'Filters') + '">' +
                    '<button type="button" class="coverage-filter-pill ' + (_activeCoverageModelFilter === 'all' ? 'is-active' : '') + '" onclick="selectCoverageModelFilter(\'all\')">' +
                        window.escapeHTML(window.t('coverageFilterAll', {}, lang) || (lang === 'ru' ? 'Все' : 'All')) +
                    '</button>' +
                    '<button type="button" class="coverage-filter-pill ' + (_activeCoverageModelFilter === 'new' ? 'is-active' : '') + '" onclick="selectCoverageModelFilter(\'new\')">' +
                        window.escapeHTML(window.t('coverageFilterNew', {}, lang) || (lang === 'ru' ? 'Новые' : 'New')) +
                    '</button>' +
                    '<button type="button" class="coverage-filter-pill coverage-filter-pill--defects ' + (_activeCoverageModelFilter === 'defects' ? 'is-active' : '') + '" onclick="selectCoverageModelFilter(\'defects\')">' +
                        '⚠️ ' + window.escapeHTML(window.t('coverageFilterDefects', {}, lang) || (lang === 'ru' ? 'С дефектами' : 'With defects')) +
                        ' <span class="coverage-filter-pill__count">(' + defectCount + ')</span>' +
                    '</button>' +
                    '<button type="button" class="coverage-filter-pill coverage-filter-pill--archive ' + (_activeCoverageModelFilter === 'archive' ? 'is-active' : '') + '" onclick="selectCoverageModelFilter(\'archive\')">' +
                        '📦 ' + window.escapeHTML(lang === 'ru' ? 'Архив' : 'Archive') + ' <span class="coverage-filter-pill__count">(' + archiveCount + ')</span>' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
        var brandFilterHtml = _activeCoverageModelFilter === 'archive' ? '' : renderCoverageBrandFilter(aggregatedModels, lang);
        var deviceCardsHtml = _activeCoverageModelFilter === 'archive'
            ? renderCoverageArchive(data.archived_screenshots || [], lang)
            : renderCoverageDeviceCards(aggregatedModels, lang);

        container.innerHTML = (
            '<div class="coverage-header">' +
                '<div class="coverage-header__top">' +
                    '<div class="coverage-header__brand">' +
                        '<button type="button" class="coverage-header__back-btn" onclick="closeProjectCoverageModal()" aria-label="Back">←</button>' +
                        iconHtml +
                        '<div class="coverage-header__title-wrap">' +
                            '<div class="coverage-header__title notranslate">' + window.escapeHTML(data.name || 'Project') + '</div>' +
                            '<div class="coverage-header__subtitle">' + window.escapeHTML(window.t('coverageDevicesScreensTitle', {}, lang) || 'Устройства и экраны') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="coverage-scope-switcher">' +
                    '<button type="button" class="coverage-scope-btn ' + (_activeCoverageScope === 'current' ? 'is-active' : '') + '" onclick="toggleCoverageScope(\'current\')">' +
                        window.escapeHTML(currentRunText) +
                    '</button>' +
                    '<button type="button" class="coverage-scope-btn ' + (_activeCoverageScope === 'all' ? 'is-active' : '') + '" onclick="toggleCoverageScope(\'all\')">' +
                        window.escapeHTML(allTimeLabel) +
                    '</button>' +
                '</div>' +
                '<div class="coverage-stat-bar">' + statBarHtml + '</div>' +
            '</div>' +
            '<div class="coverage-body">' +
                '<div id="coverage-tab-panel" class="coverage-tab-panel is-unified-view">' +
                    cockpitHtml +
                    filterPillsHtml +
                    brandFilterHtml +
                    deviceCardsHtml +
                '</div>' +
            '</div>'
        );
        var header = container.querySelector('.coverage-header');
        if (header && container.style) {
            container.style.setProperty('--coverage-header-height', header.offsetHeight + 'px');
        }
        bindCoverageScrollHeader(container);
        hydrateCoverageThumbnails(container);
    }

    function selectCoverageModelFilter(filter) {
        _activeCoverageModelFilter = filter || 'all';
        if (typeof window !== 'undefined') {
            window._activeCoverageModelFilter = _activeCoverageModelFilter;
        }
        var body = document.getElementById('project-coverage-body');
        if (body && _activeCoverageData) {
            renderCoverageScreen(body, _activeCoverageData);
        }
    }

    function toggleCoverageScope(scope) {
        _activeCoverageScope = scope;
        openProjectCoverage(_activeCoverageAppId);
    }

    function switchCoverageTab(tab) {
        _activeCoverageTab = tab || 'overview';
        var body = document.getElementById('project-coverage-body');
        if (body && _activeCoverageData) renderCoverageScreen(body, _activeCoverageData);
    }

    function renderCoverageTabContent(data, lang, tab) {
        var aggregated = aggregateModelStacks(data.models || []);
        return renderCoverageDeviceCards(aggregated, lang);
    }

    function bindCoverageScrollHeader(container) {
        var scroller = container && container.querySelector ? container.querySelector('.coverage-body') : null;
        if (!scroller) return;
        var compact = !!(container.classList && container.classList.contains('is-header-compact'));
        var animationFrame = 0;
        var scheduleFrame = typeof window.requestAnimationFrame === 'function'
            ? window.requestAnimationFrame.bind(window)
            : function (callback) { return setTimeout(callback, 0); };
        function updateHeaderState() {
            animationFrame = 0;
            // The header is an overlay, so toggling it does not change scroll
            // height. Keep it hidden until the reader returns to the top.
            var top = Math.max(0, Number(scroller.scrollTop || 0));
            var shouldCompact = compact ? top > 0 : top > 18;
            if (shouldCompact === compact) return;
            compact = shouldCompact;
            container.classList.toggle('is-header-compact', compact);
        }
        scroller.addEventListener('scroll', function () {
            if (animationFrame) return;
            animationFrame = scheduleFrame(updateHeaderState);
        }, { passive: true });
    }

    function androidIconSvg(className) {
        var cls = 'coverage-android-icon' + (className ? ' ' + className : '');
        return '<svg class="' + cls + '" viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M17.523 15.341a1 1 0 0 1 0-1.999 1 1 0 0 1 0 1.999m-11.046 0a1 1 0 0 1 0-1.999 1 1 0 0 1 0 1.999m11.405-6.02 1.997-3.46a.416.416 0 0 0-.72-.415L17.137 8.95A12.2 12.2 0 0 0 12 7.85c-1.853 0-3.59.394-5.137 1.1L4.841 5.447a.416.416 0 0 0-.72.415l1.997 3.46C2.688 11.186.343 14.658 0 18.76h24c-.344-4.102-2.69-7.574-6.118-9.44"/></svg>';
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

    function expandCoverageModelCard(modelKey, expanded) {
        modelKey = String(modelKey || '');
        _expandedModelKeys[modelKey] = !!expanded;
        var card = document.getElementById('cov-model-' + modelKey);
        var model = _activeCoverageData && aggregateModelStacks(_activeCoverageData.models || []).find(function (m) {
            return String(m.model_key) === modelKey;
        });
        if (card && model) {
            var holder = document.createElement('div');
            holder.innerHTML = renderCoverageDeviceCards([model], (typeof currentLang !== 'undefined' ? currentLang : 'ru'));
            var replacement = holder.querySelector('.coverage-device-card');
            if (replacement) {
                card.replaceWith(replacement);
                hydrateCoverageThumbnails(replacement);
            }
        } else if (_activeCoverageData) {
            var body = document.getElementById('project-coverage-body');
            if (body) renderCoverageScreen(body, _activeCoverageData);
        }
    }

    function toggleCoverageModelExpand(modelKey) {
        expandCoverageModelCard(modelKey, !_expandedModelKeys[String(modelKey || '')]);
    }

    function openCoverageModelGallery(modelKey, initialProofId, initialMediaIndex) {
        openContinuousCoverageGallery(_activeCoverageAppId, {
            modelKey: String(modelKey || ''),
            initialProofId: Number(initialProofId || 0),
            initialMediaIndex: Number(initialMediaIndex || 0)
        });
    }

    function openCoverageModel(modelKey) {
        expandCoverageModelCard(modelKey, true);
        var card = document.getElementById('cov-model-' + String(modelKey || ''));
        if (card) {
            if (typeof card.scrollIntoView === 'function') {
                card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        } else {
            var body = document.getElementById('project-coverage-body');
            if (body && _activeCoverageData) {
                renderCoverageScreen(body, _activeCoverageData);
                setTimeout(function () {
                    var c = document.getElementById('cov-model-' + String(modelKey || ''));
                    if (c && typeof c.scrollIntoView === 'function') c.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 30);
            }
        }
    }

    // ── Fullscreen Coverage Screenshot Viewer ──

    function _getCoverageMediaUrl(fileId) {
        if (!fileId) return '';
        return '/api/telegram-media/' + encodeURIComponent(fileId);
    }

    var _coverageViewerState = {
        isOpen: false,
        isContinuous: false,
        isArchiveViewer: false,
        archiveBusy: false,
        appId: 0,
        proofId: 0,
        items: [],
        images: [],
        currentIndex: 0,
        day: 0,
        modelName: '',
        testerName: '',
        hasBug: false
    };

    function _coverageViewerAuthorHtml(item, author) {
        var username = String(item.testerUsername || '').replace(/^@/, '');
        if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) return window.escapeHTML(author);
        return '<button type="button" class="coverage-screenshot-tester-link notranslate" onclick="openCoverageTesterChat(event)" aria-label="Open chat with @' + window.escapeHTML(username) + '">@' + window.escapeHTML(username) + '</button>';
    }

    function openCoverageTesterChat(event) {
        if (event && event.stopPropagation) event.stopPropagation();
        var item = (_coverageViewerState.items || [])[Number(_coverageViewerState.currentIndex || 0)] || {};
        var username = String(item.testerUsername || '').replace(/^@/, '');
        if (!/^[A-Za-z0-9_]{5,32}$/.test(username)) return;
        var url = 'https://t.me/' + username;
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(url);
        } else if (window.tg && typeof window.tg.openTelegramLink === 'function') {
            window.tg.openTelegramLink(url);
        } else {
            window.open(url, '_blank', 'noopener');
        }
    }

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
                            '<button type="button" id="coverage-screenshot-archive-btn" class="coverage-screenshot-archive-btn" onclick="toggleCurrentCoverageArchive(event)"></button>' +
                            '<button type="button" id="coverage-screenshot-defect-btn" class="coverage-screenshot-defect-btn" onclick="toggleCurrentCoverageDefect(event)" title="Пометить дефект интерфейса">' +
                                '⚠️ <span>Дефект</span>' +
                            '</button>' +
                            '<span id="coverage-screenshot-counter" class="coverage-screenshot-counter" style="display:none;"></span>' +
                            '<button type="button" class="coverage-screenshot-btn" onclick="closeCoverageScreenshotModal()" aria-label="Close">✕</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="coverage-screenshot-stage" id="coverage-screenshot-stage">' +
                        '<button type="button" id="coverage-screenshot-prev" class="coverage-screenshot-nav coverage-screenshot-nav--prev" onclick="stepCoverageScreenshot(-1)" aria-label="Previous" style="display:none;">‹</button>' +
                        '<div class="coverage-screenshot-img-wrap" onclick="toggleCoverageScreenshotZoom()">' +
                            '<img id="coverage-screenshot-img" class="coverage-screenshot-img" src="" alt="" loading="eager">' +
                            '<div id="coverage-screenshot-defect-badge" class="coverage-screenshot-defect-badge" style="display:none;">⚠️ ДЕФЕКТ UI</div>' +
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
        var list = (s.items && s.items.length > 0) ? s.items : (s.images || []);
        if (!list || list.length === 0) return;
        var cur = list[s.currentIndex] || {};
        var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');

        var titleEl = document.getElementById('coverage-screenshot-title');
        var subtitleEl = document.getElementById('coverage-screenshot-subtitle');
        var counterEl = document.getElementById('coverage-screenshot-counter');
        var imgEl = document.getElementById('coverage-screenshot-img');
        var spinnerEl = document.getElementById('coverage-screenshot-spinner');
        var prevBtn = document.getElementById('coverage-screenshot-prev');
        var nextBtn = document.getElementById('coverage-screenshot-next');
        var dotsEl = document.getElementById('coverage-screenshot-dots');
        var defectBtn = document.getElementById('coverage-screenshot-defect-btn');
        var archiveBtn = document.getElementById('coverage-screenshot-archive-btn');
        var defectBadge = document.getElementById('coverage-screenshot-defect-badge');
        var imgWrap = imgEl ? (typeof imgEl.closest === 'function' ? imgEl.closest('.coverage-screenshot-img-wrap') : (imgEl.parentElement || null)) : null;

        // Title: {Manufacturer} {Model} · Android {OS} (e.g. Samsung Galaxy S23 · A14)
        if (titleEl) {
            titleEl.textContent = cur.deviceTitle || cur.modelName || s.modelName || (cur.day ? 'D' + cur.day : (lang === 'ru' ? 'Скриншот' : 'Screenshot'));
        }

        // Subtitle:
        // Progress: Устройство {X} из {Y} · фото {A}/{B}
        if (subtitleEl) {
            if (cur.totalDevices && cur.totalDevices > 1) {
                var progressText = window.t('coverageGalleryProgress', {
                    deviceIndex: cur.deviceIndex || 1,
                    totalDevices: cur.totalDevices || 1,
                    photoIndex: cur.photoIndex || (s.currentIndex + 1),
                    totalPhotos: cur.totalPhotos || list.length,
                    deviceCurrent: cur.deviceIndex || 1,
                    deviceTotal: cur.totalDevices || 1,
                    photoCurrent: cur.photoIndex || (s.currentIndex + 1),
                    photoTotal: cur.totalPhotos || list.length
                }, lang);
                if (!progressText || progressText === 'coverageGalleryProgress') {
                    progressText = (lang === 'ru'
                        ? ('Устройство ' + (cur.deviceIndex || 1) + ' из ' + (cur.totalDevices || 1) + ' · фото ' + (cur.photoIndex || (s.currentIndex + 1)) + '/' + (cur.totalPhotos || list.length))
                        : ('Device ' + (cur.deviceIndex || 1) + ' of ' + (cur.totalDevices || 1) + ' · photo ' + (cur.photoIndex || (s.currentIndex + 1)) + '/' + (cur.totalPhotos || list.length)));
                }
                var subParts = [progressText];
                var author = cur.testerName || s.testerName;
                if (author) subParts.push(_coverageViewerAuthorHtml(cur, author));
                if (cur.hasBug || s.hasBug || cur.proofType === 'bug') {
                    subParts.push('<span style="color:#f87171;font-weight:700;">🐞 ' + (lang === 'ru' ? 'Баг' : 'Bug') + '</span>');
                } else if (cur.hasIdea || s.hasIdea || cur.proofType === 'idea') {
                    subParts.push('<span style="color:#fbbf24;font-weight:700;">💡 ' + (lang === 'ru' ? 'Идея' : 'Idea') + '</span>');
                } else if (cur.proofType === 'play_review' || cur.proofType === 'review') {
                    subParts.push('<span style="color:#c084fc;font-weight:700;">★ ' + (lang === 'ru' ? 'Отзыв' : 'Review') + '</span>');
                }
                subtitleEl.innerHTML = subParts.join(' · ');
            } else {
                var subParts = [];
                var totalOnDev = cur.totalPhotos || list.length;
                if (cur.totalStacks > 1) {
                    subParts.push((lang === 'ru' ? 'Серия ' : 'Series ') + cur.stackIndex + '/' + cur.totalStacks + ' · ' + (lang === 'ru' ? 'фото ' : 'photo ') + cur.photoInStack + '/' + cur.photosInStack);
                } else if (totalOnDev > 1) {
                    subParts.push((lang === 'ru' ? 'Фото ' : 'Photo ') + (cur.photoIndex || (s.currentIndex + 1)) + '/' + totalOnDev);
                } else if (cur.day || s.day) {
                    subParts.push('D' + (cur.day || s.day));
                }
                var author = cur.testerName || s.testerName;
                if (author) subParts.push(_coverageViewerAuthorHtml(cur, author));
                if (cur.hasBug || s.hasBug || cur.proofType === 'bug') {
                    subParts.push('<span style="color:#f87171;font-weight:700;">🐞 ' + (lang === 'ru' ? 'Баг' : 'Bug') + '</span>');
                } else if (cur.hasIdea || s.hasIdea || cur.proofType === 'idea') {
                    subParts.push('<span style="color:#fbbf24;font-weight:700;">💡 ' + (lang === 'ru' ? 'Идея' : 'Idea') + '</span>');
                } else if (cur.proofType === 'play_review' || cur.proofType === 'review') {
                    subParts.push('<span style="color:#c084fc;font-weight:700;">★ ' + (lang === 'ru' ? 'Отзыв' : 'Review') + '</span>');
                }
                subtitleEl.innerHTML = subParts.join(' · ');
            }
        }

        // Counter
        if (counterEl) {
            if (list.length > 1) {
                counterEl.style.display = 'inline-block';
                counterEl.textContent = (s.currentIndex + 1) + ' / ' + list.length;
            } else {
                counterEl.style.display = 'none';
            }
        }

        // Defect status
        var curAppId = cur.appId || s.appId || _activeCoverageAppId;
        var proofId = cur.proofId || s.proofId || 0;
        var mediaIndex = cur.mediaIndex != null ? cur.mediaIndex : 0;
        var hasDefect = isScreenshotDefect(curAppId, proofId, mediaIndex);

        if (archiveBtn) {
            archiveBtn.style.display = curAppId > 0 && proofId > 0 ? 'inline-flex' : 'none';
            archiveBtn.disabled = !!s.archiveBusy;
            archiveBtn.textContent = cur.isArchived
                ? (lang === 'ru' ? '↩️ Вернуть' : '↩️ Restore')
                : (lang === 'ru' ? '📦 В архив' : '📦 Archive');
            if (typeof archiveBtn.setAttribute === 'function') {
                archiveBtn.setAttribute('aria-label', cur.isArchived
                    ? (lang === 'ru' ? 'Вернуть скриншот из архива' : 'Restore screenshot from archive')
                    : (lang === 'ru' ? 'Переместить скриншот в архив' : 'Move screenshot to archive'));
            }
        }

        if (defectBtn) {
            if (defectBtn.classList && typeof defectBtn.classList.toggle === 'function') {
                defectBtn.classList.toggle('is-defect-active', hasDefect);
            } else if (defectBtn.classList) {
                if (hasDefect) defectBtn.classList.add('is-defect-active');
                else defectBtn.classList.remove('is-defect-active');
            }
            if (typeof defectBtn.setAttribute === 'function') {
                defectBtn.setAttribute('aria-pressed', hasDefect ? 'true' : 'false');
            }
            var defectLabel = window.t('coverageDefectBtn', {}, lang) || (lang === 'ru' ? 'Дефект' : 'Defect');
            defectBtn.innerHTML = '⚠️ <span>' + window.escapeHTML(defectLabel) + '</span>';
        }
        if (defectBadge) {
            defectBadge.style.display = hasDefect ? 'inline-flex' : 'none';
            var badgeText = window.t('coverageDefectBadge', {}, lang) || (lang === 'ru' ? '⚠️ ДЕФЕКТ UI' : '⚠️ UI DEFECT');
            defectBadge.textContent = badgeText;
        }
        if (imgWrap && imgWrap.classList) {
            if (typeof imgWrap.classList.toggle === 'function') {
                imgWrap.classList.toggle('has-defect', hasDefect);
            } else {
                if (hasDefect) imgWrap.classList.add('has-defect');
                else imgWrap.classList.remove('has-defect');
            }
        }

        // Navigation buttons
        if (prevBtn) {
            prevBtn.style.display = list.length > 1 ? 'flex' : 'none';
            prevBtn.style.opacity = s.currentIndex > 0 ? '1' : '0.25';
            prevBtn.style.pointerEvents = s.currentIndex > 0 ? 'auto' : 'none';
        }
        if (nextBtn) {
            nextBtn.style.display = list.length > 1 ? 'flex' : 'none';
            nextBtn.style.opacity = s.currentIndex < list.length - 1 ? '1' : '0.25';
            nextBtn.style.pointerEvents = s.currentIndex < list.length - 1 ? 'auto' : 'none';
        }

        // Dots (render only if <= 10 items)
        if (dotsEl) {
            if (list.length > 1 && list.length <= 10) {
                dotsEl.style.display = 'flex';
                var dotsHtml = '';
                for (var d = 0; d < list.length; d++) {
                    dotsHtml += '<div class="coverage-screenshot-dot ' + (d === s.currentIndex ? 'is-active' : '') + '"></div>';
                }
                dotsEl.innerHTML = dotsHtml;
            } else {
                dotsEl.style.display = 'none';
            }
        }

        // Image loading
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
            if (targetSrc) imgEl.src = targetSrc;
            else imgEl.removeAttribute('src');

            // Show the signed thumbnail immediately, then swap in the medium image.
            // Both requests are bound to the active slide so rapid swipes cannot paint stale media.
            var slideIdx = s.currentIndex;
            var slideItem = cur;
            var isCurrentSlide = function () {
                return _coverageViewerState.currentIndex === slideIdx &&
                    ((_coverageViewerState.items || _coverageViewerState.images || [])[slideIdx] || null) === slideItem;
            };
            if (proofId > 0 && !targetSrc && typeof window.loadCheckinProofPreviewThumbnail === 'function') {
                window.loadCheckinProofPreviewThumbnail(proofId, mediaIndex).then(function (src) {
                    if (isCurrentSlide() && src && !imgEl.getAttribute('src')) imgEl.src = src;
                }).catch(function () {});
            }
            if (proofId > 0 && typeof window.loadCheckinProofPreviewMedium === 'function') {
                window.loadCheckinProofPreviewMedium(proofId, mediaIndex).then(function (src) {
                    if (isCurrentSlide() && src) {
                        imgEl.src = src;
                    }
                }).catch(function () {});
            }
        }
    }

    function stepCoverageScreenshot(delta) {
        var s = _coverageViewerState;
        var list = (s.items && s.items.length > 0) ? s.items : (s.images || []);
        if (!s.isOpen || !list || list.length <= 1) return;
        var nextIdx = s.currentIndex + delta;
        if (nextIdx < 0 || nextIdx >= list.length) return;
        s.currentIndex = nextIdx;
        _renderCoverageViewerCurrentSlide();
    }

    function toggleCoverageScreenshotZoom() {
        var imgEl = document.getElementById('coverage-screenshot-img');
        if (imgEl) {
            imgEl.classList.toggle('is-zoomed');
        }
    }

    function toggleCurrentCoverageDefect(event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var s = _coverageViewerState;
        var list = (s.items && s.items.length > 0) ? s.items : (s.images || []);
        if (!s.isOpen || !list || list.length === 0) return;
        var cur = list[s.currentIndex];
        if (!cur) return;
        var appId = cur.appId || s.appId || _activeCoverageAppId;
        var proofId = cur.proofId || s.proofId || 0;
        var mediaIndex = cur.mediaIndex != null ? cur.mediaIndex : 0;
        if (!appId || !proofId) return;

        var newState = toggleScreenshotDefect(appId, proofId, mediaIndex);

        // Update viewer UI
        var defectBtn = document.getElementById('coverage-screenshot-defect-btn');
        var defectBadge = document.getElementById('coverage-screenshot-defect-badge');
        var imgEl = document.getElementById('coverage-screenshot-img');
        var imgWrap = imgEl ? (typeof imgEl.closest === 'function' ? imgEl.closest('.coverage-screenshot-img-wrap') : (imgEl.parentElement || null)) : null;

        if (defectBtn) {
            if (defectBtn.classList && typeof defectBtn.classList.toggle === 'function') {
                defectBtn.classList.toggle('is-defect-active', newState);
            } else if (defectBtn.classList) {
                if (newState) defectBtn.classList.add('is-defect-active');
                else defectBtn.classList.remove('is-defect-active');
            }
            if (typeof defectBtn.setAttribute === 'function') {
                defectBtn.setAttribute('aria-pressed', newState ? 'true' : 'false');
            }
        }
        if (defectBadge) {
            defectBadge.style.display = newState ? 'inline-flex' : 'none';
        }
        if (imgWrap && imgWrap.classList) {
            if (typeof imgWrap.classList.toggle === 'function') {
                imgWrap.classList.toggle('has-defect', newState);
            } else {
                if (newState) imgWrap.classList.add('has-defect');
                else imgWrap.classList.remove('has-defect');
            }
        }

        // Reflect in coverage modal thumbnails if visible
        if (typeof document.querySelectorAll === 'function') {
            var selector = '.coverage-gallery-item[data-proof-id="' + proofId + '"][data-media-index="' + mediaIndex + '"], .coverage-gallery-item[data-proof-id="' + proofId + '"]';
            document.querySelectorAll(selector).forEach(function (thumbBtn) {
                if (thumbBtn && thumbBtn.classList) {
                    if (typeof thumbBtn.classList.toggle === 'function') thumbBtn.classList.toggle('has-defect', newState);
                    else if (newState) thumbBtn.classList.add('has-defect');
                    else thumbBtn.classList.remove('has-defect');
                }
                var thumbWrap = thumbBtn.querySelector ? thumbBtn.querySelector('.coverage-gallery-thumb') : null;
                if (thumbWrap) {
                    var icon = thumbWrap.querySelector ? thumbWrap.querySelector('.coverage-gallery-thumb__defect-icon') : null;
                    if (newState) {
                        if (!icon && typeof thumbWrap.insertAdjacentHTML === 'function') {
                            var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
                            thumbWrap.insertAdjacentHTML('beforeend', '<span class="coverage-gallery-thumb__defect-icon" title="' + window.escapeHTML(lang === 'ru' ? 'Дефект UI' : 'UI Defect') + '">⚠️</span>');
                        }
                    } else {
                        if (icon && typeof icon.remove === 'function') icon.remove();
                    }
                }
            });
        }

        // Update defects count in filter pills if coverage screen is rendered
        if (_activeCoverageData) {
            var newCount = getProjectDefectsCount(appId, _activeCoverageData);
            var pillCountEl = document.querySelector('.coverage-filter-pill--defects .coverage-filter-pill__count');
            if (pillCountEl) {
                pillCountEl.textContent = '(' + newCount + ')';
            }
        }
    }

    function _coverageArchiveToast(message, undo) {
        var toast = document.getElementById('coverage-archive-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'coverage-archive-toast';
            toast.className = 'coverage-archive-toast';
            document.body.appendChild(toast);
        }
        if (toast._dismissTimer) clearTimeout(toast._dismissTimer);
        toast.replaceChildren();
        var label = document.createElement('span');
        label.textContent = message;
        toast.appendChild(label);
        if (undo) {
            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Undo' : 'Отмена';
            button.onclick = function () { undo(); toast.remove(); };
            toast.appendChild(button);
        }
        toast.classList.add('is-visible');
        toast._dismissTimer = setTimeout(function () { toast.remove(); }, undo ? 5500 : 3000);
    }

    async function _saveCoverageArchive(appId, proofId, mediaIndex, isArchived, scope) {
        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : '');
        var cleanBase = String(apiBase || '/api').trim().replace(/\/+$/, '');
        var initData = typeof window.getTelegramInitDataRaw === 'function'
            ? window.getTelegramInitDataRaw()
            : ((window.tg && window.tg.initData) || (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '');
        if (!initData) throw new Error('auth_required');
        var response = await fetch(cleanBase + '/projects/' + Number(appId) + '/coverage/screenshot-archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
            body: JSON.stringify({
                proof_id: Number(proofId), media_index: Number(mediaIndex),
                is_archived: !!isArchived, scope: scope === 'all' ? 'all' : 'current', init_data: initData
            })
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'ok') throw new Error(result.code || 'archive_save_failed');
        return result;
    }

    function _applyCoverageArchiveResult(appId, scope, coverage) {
        Object.keys(_coverageMemoryCache).forEach(function (key) {
            if (key.indexOf(String(appId) + ':') === 0) delete _coverageMemoryCache[key];
        });
        if (coverage) {
            _coverageMemoryCache[String(appId) + ':' + String(scope || 'current')] = { data: coverage, timestamp: Date.now() };
            if (Number(_activeCoverageAppId) === Number(appId) && _activeCoverageScope === scope) {
                _activeCoverageData = coverage;
                var body = document.getElementById('project-coverage-body');
                if (body && document.getElementById('project-coverage-modal')?.classList.contains('active')) {
                    renderCoverageScreen(body, coverage);
                }
            }
        }
        if (typeof window.loadProjects === 'function') window.loadProjects(true);
    }

    function _reindexCoverageViewerItems(items) {
        var byModel = {};
        items.forEach(function (item) {
            if (item.isArchived) return;
            var modelKey = String(item.modelKey || item.modelName || 'unknown');
            var group = byModel[modelKey] || (byModel[modelKey] = { items: [], stacks: {} });
            group.items.push(item);
            var stackKey = String(item.proofId || 0);
            (group.stacks[stackKey] || (group.stacks[stackKey] = [])).push(item);
        });
        var modelKeys = Object.keys(byModel);
        modelKeys.forEach(function (modelKey, modelIndex) {
            var group = byModel[modelKey];
            var stackKeys = Object.keys(group.stacks);
            group.items.forEach(function (item, index) {
                item.photoIndex = index + 1;
                item.totalPhotos = group.items.length;
                item.deviceIndex = modelIndex + 1;
                item.totalDevices = modelKeys.length;
            });
            stackKeys.forEach(function (stackKey, stackIndex) {
                var stack = group.stacks[stackKey];
                stack.forEach(function (item, index) {
                    item.stackIndex = stackIndex + 1;
                    item.totalStacks = stackKeys.length;
                    item.photoInStack = index + 1;
                    item.photosInStack = stack.length;
                });
            });
        });
        items.filter(function (item) { return item.isArchived; }).forEach(function (item, index, archived) {
            item.photoIndex = index + 1;
            item.totalPhotos = archived.length;
        });
    }

    async function toggleCurrentCoverageArchive(event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        var state = _coverageViewerState;
        if (!state.isOpen || state.archiveBusy) return;
        var items = state.items && state.items.length ? state.items : (state.images || []);
        var current = items[state.currentIndex];
        if (!current || !current.proofId) return;
        var appId = Number(current.appId || state.appId);
        var proofId = Number(current.proofId);
        var mediaIndex = Number(current.mediaIndex || 0);
        var nextArchived = !current.isArchived;
        var scope = state.scope || 'current';
        state.archiveBusy = true;
        _renderCoverageViewerCurrentSlide();
        try {
            var result = await _saveCoverageArchive(appId, proofId, mediaIndex, nextArchived, scope);
            _applyCoverageArchiveResult(appId, scope, result.coverage);
            // Remove only this media slot; the next active slide retains its index.
            var removeIndex = items.findIndex(function (item) {
                return Number(item.proofId) === proofId && Number(item.mediaIndex || 0) === mediaIndex;
            });
            if (removeIndex >= 0) items.splice(removeIndex, 1);
            _reindexCoverageViewerItems(items);
            if (!items.length) {
                closeCoverageScreenshotModal();
            } else {
                state.currentIndex = Math.min(Math.max(removeIndex, 0), items.length - 1);
                _renderCoverageViewerCurrentSlide();
            }
            var lang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
            if (nextArchived) {
                _coverageArchiveToast(lang === 'ru' ? 'Скриншот перемещён в архив' : 'Screenshot moved to archive', async function () {
                    try {
                        var undoResult = await _saveCoverageArchive(appId, proofId, mediaIndex, false, scope);
                        _applyCoverageArchiveResult(appId, scope, undoResult.coverage);
                    } catch (_) {
                        _coverageArchiveToast(lang === 'ru' ? 'Не удалось восстановить скриншот' : 'Could not restore screenshot');
                    }
                });
            } else {
                _coverageArchiveToast(lang === 'ru' ? 'Скриншот возвращён из архива' : 'Screenshot restored');
            }
        } catch (_) {
            var errorLang = (typeof currentLang !== 'undefined' ? currentLang : 'ru');
            _coverageArchiveToast(errorLang === 'ru' ? 'Не удалось изменить архив' : 'Could not update archive');
        } finally {
            state.archiveBusy = false;
            if (state.isOpen) _renderCoverageViewerCurrentSlide();
        }
    }

    function openContinuousCoverageGallery(appId, options) {
        options = options || {};
        var safeAppId = Number(appId || _activeCoverageAppId || (typeof window !== 'undefined' && window._activeCoverageAppId) || 0);
        if (safeAppId <= 0) return;

        function launchViewerWithData(covData) {
            if (!covData) return;
            tagCoverageNewModels(safeAppId, covData);

            var flatItems = [];
            if (options.archive) {
                var archived = Array.isArray(covData.archived_screenshots) ? covData.archived_screenshots : [];
                archived.forEach(function (item, index) {
                    flatItems.push({
                        appId: safeAppId,
                        proofId: Number(item.proof_id || 0),
                        mediaIndex: Number(item.media_index || 0),
                        modelKey: item.model_key || '',
                        modelName: item.model_name || '',
                        deviceTitle: item.model_name || '',
                        photoIndex: index + 1,
                        totalPhotos: archived.length,
                        testerName: item.tester_name || '',
                        testerUsername: item.tester_username || '',
                        day: item.day || 0,
                        isArchived: true,
                        createdAt: item.created_at || '',
                        fullUrl: '',
                        thumbUrl: ''
                    });
                });
            } else {
            var models = Array.isArray(covData.models) ? covData.models : [];
            var aggregated = aggregateModelStacks(models);

            if (options.modelKey) {
                aggregated = aggregated.filter(function (m) { return String(m.model_key) === String(options.modelKey); });
            }

            if (options.onlyNew) {
                aggregated = aggregated.filter(function (m) {
                    if (options.initialProofId && (m.screenshots || []).some(function (s) { return Number(s.id) === Number(options.initialProofId); })) return true;
                    return !!m.is_new;
                });
            } else if (options.onlyDefects) {
                aggregated = aggregated.filter(function (m) {
                    if (options.initialProofId && (m.screenshots || []).some(function (s) { return Number(s.id) === Number(options.initialProofId); })) return true;
                    return (m.screenshots || []).some(function (s) {
                        return (s.media_items || []).some(function (item, index) {
                            return isScreenshotDefect(safeAppId, Number(s.id), item && item.media_index != null ? item.media_index : index);
                        });
                    });
                });
            }

            // Filter to models that actually have screenshots
            var modelsWithScreenshots = aggregated.filter(function (m) {
                return Array.isArray(m.screenshots) && m.screenshots.length > 0;
            });

            if (modelsWithScreenshots.length === 0) {
                openProjectCoverage(safeAppId, 'models');
                return;
            }

            var totalDevices = modelsWithScreenshots.length;
            modelsWithScreenshots.forEach(function (m, devIdx) {
                var deviceIndex = devIdx + 1; // 1-based
                var brand = m.brand || extractDeviceBrand(m.model_name);
                var rawAv = (m.android_versions && m.android_versions[0]) || '';
                var matchAv = String(rawAv).match(/(?:android\s*)?(\d+)/i);
                var osPart = matchAv ? ('Android ' + matchAv[1]) : (rawAv ? ('Android ' + String(rawAv).replace(/^Android\s*/i, '').trim()) : '');

                var devTitle = m.model_name || '';
                if (brand && devTitle.toLowerCase().indexOf(brand.toLowerCase()) === -1) {
                    devTitle = brand + ' ' + devTitle;
                }
                if (osPart) {
                    devTitle = devTitle + ' · ' + osPart;
                }

                var devScreenshots = m.screenshots || [];
                var devTotalPhotos = 0;
                devScreenshots.forEach(function (s) {
                    var count = Number(s.image_count || (s.media_items && s.media_items.length) || 1);
                    devTotalPhotos += count;
                });

                var currentPhotoOnDevice = 0;
                devScreenshots.forEach(function (s, stackIdx) {
                    var proofId = Number(s.id);
                    var imgCount = Number(s.image_count || (s.media_items && s.media_items.length) || 1);
                    var mediaItems = Array.isArray(s.media_items) ? s.media_items : [];
                    var tester = (m.testers || []).find(function (t) { return Number(t.tester_id || 0) === Number(s.tester_id || 0); }) || {};

                    for (var mi = 0; mi < imgCount; mi++) {
                        currentPhotoOnDevice++;
                        var itemMedia = mediaItems[mi] || {};
                        var originalMediaIndex = itemMedia.media_index != null ? Number(itemMedia.media_index) : mi;

                        flatItems.push({
                            appId: safeAppId,
                            proofId: proofId,
                            mediaIndex: originalMediaIndex,
                            modelKey: m.model_key,
                            modelName: m.model_name,
                            brand: brand,
                            androidVersion: rawAv,
                            deviceTitle: devTitle,
                            deviceIndex: deviceIndex,
                            totalDevices: totalDevices,
                            photoIndex: currentPhotoOnDevice,
                            totalPhotos: devTotalPhotos,
                            stackIndex: stackIdx + 1,
                            totalStacks: devScreenshots.length,
                            photoInStack: mi + 1,
                            photosInStack: imgCount,
                            overallIndex: flatItems.length,
                            testerName: s.tester_name || tester.full_name || tester.username || '',
                            testerUsername: tester.username || s.tester_username || (/^@[A-Za-z0-9_]{5,32}$/.test(String(s.tester_name || '')) ? s.tester_name : ''),
                            day: s.day || 0,
                            hasBug: !!(s.has_bug || s.proof_type === 'bug'),
                            hasIdea: !!(s.has_idea || s.proof_type === 'idea'),
                            proofType: s.proof_type || (s.has_bug ? 'bug' : (s.has_idea ? 'idea' : 'screenshot')),
                            feedbackId: s.feedback_id || null,
                            fullUrl: itemMedia.file_id ? _getCoverageMediaUrl(itemMedia.file_id) : '',
                            thumbUrl: itemMedia.thumb_file_id ? _getCoverageMediaUrl(itemMedia.thumb_file_id) : ''
                        });
                    }
                });
            });
            }

            if (flatItems.length === 0) {
                openProjectCoverage(safeAppId, 'models');
                return;
            }

            var startIdx = 0;
            if (options.initialProofId) {
                var foundIdx = flatItems.findIndex(function (it) {
                    return Number(it.proofId) === Number(options.initialProofId) && Number(it.mediaIndex || 0) === Number(options.initialMediaIndex || 0);
                });
                if (foundIdx >= 0) startIdx = foundIdx;
            }

            _coverageViewerState.isOpen = true;
            _coverageViewerState.isContinuous = true;
            _coverageViewerState.isArchiveViewer = !!options.archive;
            _coverageViewerState.scope = covData.scope || 'current';
            _coverageViewerState.appId = safeAppId;
            _coverageViewerState.items = flatItems;
            _coverageViewerState.images = flatItems;
            _coverageViewerState.currentIndex = startIdx;

            _ensureCoverageScreenshotModal();
            _renderCoverageViewerCurrentSlide();

            var modal = document.getElementById('coverage-screenshot-modal');
            if (modal) {
                modal.classList.add('active');
                if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
            }

            markProjectCoverageSeen(safeAppId, covData);
        }

        var cacheKey = String(safeAppId) + ':' + String(_activeCoverageScope || 'current');
        var cached = _coverageMemoryCache && _coverageMemoryCache[cacheKey];
        if (_activeCoverageData && Number(_activeCoverageAppId) === safeAppId) {
            launchViewerWithData(_activeCoverageData);
        } else if (cached && cached.data) {
            launchViewerWithData(cached.data);
        } else {
            fetchProjectCoverage(safeAppId).then(function (data) {
                launchViewerWithData(data);
            }).catch(function () {
                openProjectCoverage(safeAppId, 'models');
            });
        }
    }

    function closeCoverageScreenshotModal(event) {
        if (event && event.target && event.target !== document.getElementById('coverage-screenshot-modal')) return;
        var modal = document.getElementById('coverage-screenshot-modal');
        if (modal) modal.classList.remove('active');
        var wasContinuous = _coverageViewerState.isContinuous;
        var curAppId = _coverageViewerState.appId || _activeCoverageAppId;
        _coverageViewerState.isOpen = false;
        _coverageViewerState.isContinuous = false;
        _coverageViewerState.isArchiveViewer = false;
        _coverageViewerState.items = [];
        _coverageViewerState.images = [];
        var imgEl = document.getElementById('coverage-screenshot-img');
        if (imgEl) {
            imgEl.classList.remove('is-zoomed');
            imgEl.src = '';
        }
        if (curAppId && _activeCoverageData) {
            markProjectCoverageSeen(curAppId, _activeCoverageData);
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

        var day = foundScreenshot ? (foundScreenshot.day || 0) : 0;
        var testerName = foundScreenshot ? (foundScreenshot.tester_name || '') : '';
        var hasBug = foundScreenshot ? !!foundScreenshot.has_bug : false;
        var modelName = foundModel ? (foundModel.model_name || '') : '';

        var tObj = (foundModel && (foundModel.testers || []).find(function (t) {
            return Number(t.tester_id || 0) === Number(foundScreenshot && foundScreenshot.tester_id || 0);
        })) || (foundModel && (foundModel.testers || []).length === 1 ? foundModel.testers[0] : {});
        var rawAv = (foundScreenshot && foundScreenshot.android_version) || tObj.android_version || (foundModel && foundModel.android_versions && foundModel.android_versions[0]) || '';
        var matchAv = String(rawAv).match(/(?:android\s*)?(\d+)/i);
        var osPart = matchAv ? ('A' + matchAv[1]) : (rawAv ? String(rawAv).trim() : '');

        var subParts = [day ? ('D' + day) : '', osPart, testerName].filter(Boolean);

        // If openCheckinProofOverview is available and not in coverage screenshot mode
        if (typeof window.openCheckinProofOverview === 'function' && !document.getElementById('coverage-screenshot-modal')) {
            window.openCheckinProofOverview(targetProofId, {
                imageCount: Number(imageCount || 1),
                modelName: modelName,
                title: modelName || (testerName || (day ? ('D' + day) : 'Скриншот')),
                subtitle: subParts.join(' · ')
            });
            return;
        }

        var images = [];
        if (foundScreenshot) {
            day = foundScreenshot.day || 0;
            testerName = foundScreenshot.tester_name || '';
            hasBug = !!foundScreenshot.has_bug;
            var mediaList = foundScreenshot.media_items || [];
            if (mediaList.length > 0) {
                images = mediaList.map(function (item, idx) {
                    var fullFileId = item.file_id || item.thumb_file_id || '';
                    var thumbFileId = item.thumb_file_id || item.file_id || '';
                    return {
                        appId: _activeCoverageAppId,
                        proofId: targetProofId,
                        mediaIndex: item.media_index != null ? Number(item.media_index) : idx,
                        fullUrl: _getCoverageMediaUrl(fullFileId),
                        thumbUrl: _getCoverageMediaUrl(thumbFileId),
                        width: item.width,
                        height: item.height,
                        day: day,
                        testerName: testerName,
                        hasBug: hasBug,
                        modelName: modelName,
                        totalPhotos: mediaList.length,
                        photoIndex: idx + 1,
                        totalDevices: 1,
                        deviceIndex: 1
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
        _coverageViewerState.isContinuous = false;
        _coverageViewerState.isArchiveViewer = false;
        _coverageViewerState.scope = _activeCoverageScope || 'current';
        _coverageViewerState.appId = _activeCoverageAppId;
        _coverageViewerState.proofId = targetProofId;
        _coverageViewerState.items = images;
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
        getUnseenCounts: getProjectCoverageUnseenCounts,
        openContinuousGallery: openContinuousCoverageGallery,
        toggleDefect: toggleScreenshotDefect,
        isDefect: isScreenshotDefect
    };

    window.buildProjectResultsBlock = buildProjectResultsBlock;
    window.buildProjectResultsCollapsed = buildProjectResultsCollapsed;
    window.openProjectCoverage = openProjectCoverage;
    window.closeProjectCoverageModal = closeProjectCoverageModal;
    window.openProjectResultsFeedback = openProjectResultsFeedback;
    window.toggleCoverageScope = toggleCoverageScope;
    window.switchCoverageTab = switchCoverageTab;
    window.selectCoverageBrand = selectCoverageBrand;
    window.toggleCoverageBrandFilter = toggleCoverageBrandFilter;
    window.toggleCoverageModelExpand = toggleCoverageModelExpand;
    window.openCoverageModel = openCoverageModel;
    window.openCoverageModelGallery = openCoverageModelGallery;
    window.openCoverageTesterChat = openCoverageTesterChat;
    window.openCoverageScreenshotPreview = openCoverageScreenshotPreview;
    window.closeCoverageScreenshotModal = closeCoverageScreenshotModal;
    window.stepCoverageScreenshot = stepCoverageScreenshot;
    window.toggleCoverageScreenshotZoom = toggleCoverageScreenshotZoom;
    window.openContinuousCoverageGallery = openContinuousCoverageGallery;
    window.toggleCurrentCoverageDefect = toggleCurrentCoverageDefect;
    window.toggleCurrentCoverageArchive = toggleCurrentCoverageArchive;
    window.selectCoverageModelFilter = selectCoverageModelFilter;
    window.isScreenshotDefect = isScreenshotDefect;
    window.markProjectCoverageSeen = markProjectCoverageSeen;

})();
