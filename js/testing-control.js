/* Phase 4 — owner Testing Control (tester timeline only; no media requests). */

(function () {
    'use strict';

    var state = {
        appId: 0,
        archived: false,
        project: null,
        items: [],
        nextCursor: null,
        loading: false,
        focusProgressId: 0,
    };

    function enabled() {
        return !!(window.App && window.App.testingControlEnabled === true);
    }

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var translated = window.t(key, params || {}, typeof lang !== 'undefined' ? lang : undefined);
            if (translated && translated !== key) return translated;
        }
        return fallback;
    }

    function escape(value) {
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    function projectFromCache(appId) {
        var active = (typeof myProjects !== 'undefined' ? myProjects : []).find(function (item) {
            return Number(item && (item.id || item.app_id)) === Number(appId);
        });
        if (active) return { project: active, archived: false };
        var archived = (typeof archivedProjects !== 'undefined' ? archivedProjects : []).find(function (item) {
            return Number(item && (item.app_id || item.id)) === Number(appId);
        });
        return archived ? { project: archived, archived: true } : null;
    }

    function buildTestingControlEntryButton(appId, isArchived) {
        if (!enabled()) return '';
        return '<button type="button" class="btn btn-secondary testing-control-entry" ' +
            'onclick="openTestingControl(' + Number(appId || 0) + ', { archived: ' + (!!isArchived) + ' }); event.stopPropagation();">' +
            '<span class="testing-control-entry__icon" aria-hidden="true">◎</span>' +
            '<span>' + escape(text('testingControlEntry', 'Testing Control')) + '</span>' +
        '</button>';
    }

    function proofLabel(type) {
        var labels = {
            screenshot: text('testingControlProofScreenshot', 'Screenshot'),
            bug: text('testingControlProofBug', 'Bug'),
            idea: text('testingControlProofIdea', 'Idea'),
            play_review: text('testingControlProofReview', 'Play Review'),
            legacy: text('testingControlProofLegacy', 'Proof was not recorded'),
            unavailable: text('testingControlProofUnavailable', 'Proof unavailable'),
        };
        return labels[type] || labels.unavailable;
    }

    function proofGlyph(type) {
        return ({ screenshot: '▣', bug: 'B', idea: 'I', play_review: 'R', legacy: '·', unavailable: '!' })[type] || '!';
    }

    function stateLabel(day) {
        var stateName = String(day && day.state || 'future');
        if (stateName === 'checked' || stateName === 'checked_overtime') return text('testingControlStateChecked', 'Checked');
        if (stateName === 'skipped' || stateName === 'skipped_overtime') return text('testingControlStateSkipped', 'Skipped');
        if (stateName === 'pending') return text('testingControlStatePending', 'Pending');
        if (stateName === 'paused') return text('testingControlStatePaused', 'Paused');
        return text('testingControlStateFuture', 'Upcoming');
    }

    function renderDay(day, appId) {
        var proof = day && day.proof;
        var proofType = String(proof && proof.type || '');
        var stateName = String(day && day.state || 'future');
        var classes = 'testing-control-day is-' + escape(stateName);
        if (proofType) classes += ' has-proof proof-' + escape(proofType);
        var title = text('testingControlDayAria', 'Day {day}: {state}', {
            day: Number(day && day.day || 0),
            state: stateLabel(day),
        });
        var action = '';
        if (proof && proofType !== 'legacy') {
            action = ' onclick="openTestingControlProof(' + Number(appId || 0) + ', ' + Number(proof.id || 0) + ')"';
        }
        return '<button type="button" class="' + classes + '" title="' + escape(title) + '"' + action + '>' +
            '<span class="testing-control-day__number">' + Number(day && day.day || 0) + '</span>' +
            (proofType ? '<span class="testing-control-day__proof" aria-label="' + escape(proofLabel(proofType)) + '">' + escape(proofGlyph(proofType)) + '</span>' : '') +
        '</button>';
    }

    function deviceLine(device) {
        var parts = ['android_version', 'brand', 'model'].map(function (key) {
            return String(device && device[key] || '').trim();
        }).filter(Boolean);
        return parts.join(' • ');
    }

    function testerLabel(item) {
        var tester = item && item.tester || {};
        var fullName = String(tester.name || '').trim();
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        return fullName || (username ? '@' + username : text('idLabel', 'ID {id}', { id: Number(tester.id || 0) }));
    }

    function testerSubLabel(item) {
        var tester = item && item.tester || {};
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        var fullName = String(tester.name || '').trim();
        if (fullName && username) return '@' + username;
        return text('testingControlStarted', 'Started {date}', { date: item.start_date || '—' });
    }

    function avatarHtml(item) {
        var tester = item && item.tester || {};
        var avatarUrl = String(tester.avatar_url || '').trim();
        if (avatarUrl) {
            return '<img class="testing-control-avatar" src="' + escape(avatarUrl) + '" loading="lazy" alt="">';
        }
        var label = testerLabel(item).replace(/^@/, '').trim();
        return '<span class="testing-control-avatar testing-control-avatar--fallback">' + escape((label.charAt(0) || '?').toUpperCase()) + '</span>';
    }

    function renderTester(item) {
        var tester = item && item.tester || {};
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        var safeUsername = typeof escapeInlineJsString === 'function' ? escapeInlineJsString(username) : username.replace(/'/g, "\\'");
        var timeline = (item.timeline || []).map(function (day) {
            return renderDay(day, state.appId);
        }).join('');
        var device = deviceLine(item.device);
        var currentDay = Number(item.current_day || 0);
        var dayChip = currentDay > 0
            ? '<span class="testing-control-current-day">' + escape(text('testingControlCurrentDay', 'Day {day}', { day: currentDay })) + '</span>'
            : '';
        return '<article class="testing-control-tester" data-progress-id="' + Number(item.progress_id || 0) + '">' +
            '<button type="button" class="testing-control-tester__head" onclick="openDossierModal(\'' + safeUsername + '\', ' + Number(tester.id || 0) + ', ' + Number(state.appId || 0) + ')">' +
                avatarHtml(item) +
                '<span class="testing-control-tester__identity">' +
                    '<span class="testing-control-tester__name notranslate">' + escape(testerLabel(item)) + '</span>' +
                    '<span class="testing-control-tester__sub notranslate">' + escape(testerSubLabel(item)) + '</span>' +
                '</span>' +
                dayChip +
                '<span class="testing-control-chevron">›</span>' +
            '</button>' +
            (device ? '<div class="testing-control-device">' + escape(device) + '</div>' : '') +
            '<div class="testing-control-timeline" role="list" aria-label="' + escape(text('testingControlTimeline', 'Check-in timeline')) + '">' + timeline + '</div>' +
            (Number(item.timeline_overflow_count || 0) > 0
                ? '<div class="testing-control-overflow">+' + Number(item.timeline_overflow_count) + '</div>'
                : '') +
        '</article>';
    }

    function render() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        var project = state.project || {};
        var appName = String(project.name || '').trim() || text('unknownLabel', 'Project');
        var itemsHtml = state.items.length
            ? state.items.map(renderTester).join('')
            : '<div class="testing-control-empty">' + escape(text('testingControlEmpty', 'No testers in this run yet.')) + '</div>';
        var loadMore = state.nextCursor
            ? '<button type="button" class="btn btn-secondary testing-control-more" onclick="loadMoreTestingControl()">' + escape(text('testingControlLoadMore', 'Load more')) + '</button>'
            : '';
        body.innerHTML = '<div class="testing-control-header">' +
                '<button type="button" class="testing-control-back" onclick="closeTestingControl()" aria-label="' + escape(text('back', 'Back')) + '">‹</button>' +
                '<div class="testing-control-heading">' +
                    '<div class="testing-control-title">' + escape(appName) + '</div>' +
                    '<div class="testing-control-subtitle">' + escape(text('testingControlTitle', 'Testing Control')) + ' · ' + escape(text('testingControlTestersTab', 'Testers')) + '</div>' +
                '</div>' +
                '<span class="testing-control-run">R' + Number(project.run_iteration || 1) + '</span>' +
            '</div>' +
            '<div id="testing-control-proof-meta" class="testing-control-proof-meta" hidden></div>' +
            '<div class="testing-control-list">' + itemsHtml + '</div>' +
            loadMore;
    }

    function renderLoading() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        body.innerHTML = '<div class="testing-control-header">' +
                '<button type="button" class="testing-control-back" onclick="closeTestingControl()" aria-label="Back">‹</button>' +
                '<div class="testing-control-heading"><div class="testing-control-title">' + escape(text('testingControlTitle', 'Testing Control')) + '</div></div>' +
            '</div>' +
            '<div class="testing-control-loading" role="status"><span></span><span></span><span></span></div>';
    }

    function renderError() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        body.innerHTML = '<div class="testing-control-header">' +
                '<button type="button" class="testing-control-back" onclick="closeTestingControl()" aria-label="Back">‹</button>' +
                '<div class="testing-control-heading"><div class="testing-control-title">' + escape(text('testingControlTitle', 'Testing Control')) + '</div></div>' +
            '</div>' +
            '<div class="testing-control-error">' +
                '<div>' + escape(text('testingControlLoadError', 'Could not load testing progress.')) + '</div>' +
                '<button type="button" class="btn btn-secondary" onclick="retryTestingControl()">' + escape(text('retry', 'Retry')) + '</button>' +
            '</div>';
    }

    async function requestPage(cursor) {
        var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var url = API_BASE + '/projects/' + Number(state.appId) + '/testing-control/testers?limit=50&init_data=' + encodeURIComponent(initData);
        if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
        var response = await fetchWithRetry(url, { timeoutMs: 25000 }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success') {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return payload;
    }

    async function loadPage(options) {
        options = options || {};
        if (state.loading) return;
        state.loading = true;
        if (!options.append) renderLoading();
        try {
            var payload = await requestPage(options.append ? state.nextCursor : '');
            state.project = payload.project || state.project;
            state.items = options.append ? state.items.concat(payload.items || []) : (payload.items || []);
            state.nextCursor = payload.next_cursor || null;

            if (state.focusProgressId > 0 && !state.items.some(function (item) {
                return Number(item.progress_id) === Number(state.focusProgressId);
            })) {
                var guard = 0;
                while (state.nextCursor && guard < 9) {
                    guard += 1;
                    var next = await requestPage(state.nextCursor);
                    state.items = state.items.concat(next.items || []);
                    state.nextCursor = next.next_cursor || null;
                    if (state.items.some(function (item) {
                        return Number(item.progress_id) === Number(state.focusProgressId);
                    })) break;
                }
            }
            render();
            focusTesterWhenReady();
        } catch (error) {
            console.error('Testing Control load failed:', error);
            if (!options.append) renderError();
            else if (typeof showToast === 'function') showToast(text('testingControlLoadError', 'Could not load testing progress.'));
        } finally {
            state.loading = false;
        }
    }

    function focusTesterWhenReady() {
        if (state.focusProgressId <= 0) return;
        setTimeout(function () {
            var card = document.querySelector('.testing-control-tester[data-progress-id="' + Number(state.focusProgressId) + '"]');
            if (!card) return;
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('is-focused');
            setTimeout(function () { card.classList.remove('is-focused'); }, 2200);
        }, 80);
    }

    async function openTestingControl(appId, options) {
        options = options || {};
        if (!enabled()) return false;
        var safeAppId = Number(appId || 0);
        if (safeAppId <= 0) return false;
        var cached = projectFromCache(safeAppId);
        state.appId = safeAppId;
        state.archived = Object.prototype.hasOwnProperty.call(options, 'archived') ? !!options.archived : !!(cached && cached.archived);
        state.project = cached && cached.project || { name: text('testingControlTitle', 'Testing Control') };
        state.items = [];
        state.nextCursor = null;
        state.focusProgressId = Number(options.focusProgressId || 0);
        var modal = document.getElementById('testing-control-modal');
        if (!modal) return false;
        modal.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        await loadPage({ append: false });
        return true;
    }

    function closeTestingControl(event) {
        var modal = document.getElementById('testing-control-modal');
        if (event && event.target !== modal) return;
        if (modal) modal.classList.remove('active');
        state.focusProgressId = 0;
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }

    function findProof(proofId) {
        var safeId = Number(proofId || 0);
        for (var i = 0; i < state.items.length; i++) {
            var timeline = state.items[i].timeline || [];
            for (var j = 0; j < timeline.length; j++) {
                var proof = timeline[j].proof;
                if (proof && Number(proof.id || 0) === safeId) {
                    return { proof: proof, day: timeline[j].day, item: state.items[i] };
                }
            }
        }
        return null;
    }

    function openTestingControlProof(appId, proofId) {
        var found = findProof(proofId);
        if (!found) return;
        var proof = found.proof || {};
        var type = String(proof.type || 'unavailable');
        var feedbackId = Number(proof.source_feedback_id || 0);
        if ((type === 'bug' || type === 'idea' || type === 'play_review') && feedbackId > 0) {
            closeTestingControl();
            if (typeof openProjectFeedback === 'function') {
                openProjectFeedback(Number(appId || state.appId), state.archived, { focusFeedbackId: feedbackId });
            }
            return;
        }

        var meta = document.getElementById('testing-control-proof-meta');
        if (!meta) return;
        var media = proof.media || {};
        var dimensions = media.width && media.height ? media.width + '×' + media.height : '';
        var device = deviceLine(found.item && found.item.device);
        var lines = [
            '<strong>' + escape(proofLabel(type)) + ' · ' + escape(text('testingControlCurrentDay', 'Day {day}', { day: found.day })) + '</strong>',
            device ? '<span>' + escape(device) + '</span>' : '',
            dimensions ? '<span>' + escape(dimensions) + '</span>' : '',
            '<span>' + escape(text('testingControlScreenshotPhase5', 'Preview will be available in Gallery.')) + '</span>',
        ].filter(Boolean);
        meta.innerHTML = '<button type="button" class="testing-control-proof-meta__close" onclick="closeTestingControlProofMeta()">×</button>' + lines.join('');
        meta.hidden = false;
        meta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closeTestingControlProofMeta() {
        var meta = document.getElementById('testing-control-proof-meta');
        if (meta) meta.hidden = true;
    }

    window.buildTestingControlEntryButton = buildTestingControlEntryButton;
    window.openTestingControl = openTestingControl;
    window.closeTestingControl = closeTestingControl;
    window.retryTestingControl = function () { return loadPage({ append: false }); };
    window.loadMoreTestingControl = function () { return loadPage({ append: true }); };
    window.openTestingControlProof = openTestingControlProof;
    window.closeTestingControlProofMeta = closeTestingControlProofMeta;
})();
