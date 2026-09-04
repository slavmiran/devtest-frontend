/* Project card — owner's daily dashboard: today's control day and other reports.
   Renders instantly from the /api/projects/{owner_id} payload, then hydrates
   proof details lazily from Testing Control when the block enters the viewport. */
(function () {
    'use strict';

    var MANDATORY_DAYS = [1, 4, 7, 10, 14];
    var MAX_SLOTS = 3;
    var CACHE_TTL_MS = 90000;
    var MAX_TICKET_REQUESTS = 8;
    var MAX_DETAIL_LOOKUPS = 6;
    var PROCESSED_STATUSES = ['accepted', 'approved', 'processed', 'tipped', 'rewarded', 'rejected', 'expired'];
    var FEEDBACK_PROOF_TYPES = ['bug', 'idea', 'play_review'];

    /* appId -> { loadedAt, loading, error, control[], others[] } */
    var cache = new Map();
    var thumbnailCache = new Map();
    var observer = null;
    var expandedOthers = new Set();
    var sheetState = { appId: 0, mode: '', testersTab: 'state', historyLoaded: false };
    var PREFS_PREFIX = 'pc_activity_prefs_v2_';
    var ACTIVITY_FILTERS = ['contribution', 'attention', 'control', 'testers'];

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var value = window.t(key, params || {}, typeof lang !== 'undefined' ? lang : undefined);
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function esc(value) {
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    function galleryEnabled() {
        return !!(window.App && window.App.testingControlEnabled === true && window.App.checkinProofGalleryEnabled === true);
    }

    function isControlDay(day) {
        return MANDATORY_DAYS.indexOf(Number(day || 0)) !== -1;
    }

    function todayString() {
        return typeof getLocalDate === 'function' ? getLocalDate() : new Date().toISOString().slice(0, 10);
    }

    function shiftDateString(iso, days) {
        var match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '';
        var date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!Number.isFinite(date.getTime())) return '';
        date.setDate(date.getDate() + Number(days || 0));
        var month = date.getMonth() + 1;
        var day = date.getDate();
        return date.getFullYear() + '-' + (month < 10 ? '0' : '') + month + '-' + (day < 10 ? '0' : '') + day;
    }

    function mediaUrl(path) {
        var value = String(path || '').trim();
        if (!value) return '';
        if (/^https:\/\//i.test(value)) return value;
        var base = String(typeof API_BASE !== 'undefined' ? API_BASE : '').replace(/\/api\/?$/i, '').replace(/\/$/, '');
        return base + (value.charAt(0) === '/' ? value : '/' + value);
    }

    function initData() {
        return typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
    }

    function projectById(appId) {
        var list = (typeof myProjects !== 'undefined' && Array.isArray(myProjects)) ? myProjects : [];
        var safeId = Number(appId || 0);
        for (var index = 0; index < list.length; index += 1) {
            if (Number(list[index] && list[index].id) === safeId) return list[index];
        }
        return null;
    }

    function isExcludedControlTester(project, item) {
        if (!project || !item) return true;
        var testerId = Number(item.tester && item.tester.id || 0);
        var progressId = Number(item.progress_id || 0);
        var roster = project.testers || [];
        for (var index = 0; index < roster.length; index += 1) {
            var rosterTester = roster[index];
            if (Number(rosterTester.tester_id || 0) !== testerId && Number(rosterTester.progress_id || 0) !== progressId) {
                continue;
            }
            if (rosterTester.is_left_soft) return true;
            if (rosterTester.is_guest_tester || rosterTester.is_external) return true;
            return false;
        }
        return false;
    }

    function filterControlRows(project, rows) {
        if (!project || !rows || !rows.length) return rows || [];
        return rows.filter(function (row) {
            var roster = project.testers || [];
            for (var index = 0; index < roster.length; index += 1) {
                var rosterTester = roster[index];
                if (Number(rosterTester.tester_id || 0) !== Number(row.testerId || 0)
                    && Number(rosterTester.progress_id || 0) !== Number(row.progressId || 0)) {
                    continue;
                }
                return !rosterTester.is_left_soft
                    && !rosterTester.is_guest_tester
                    && !rosterTester.is_external;
            }
            return true;
        });
    }


    function handleOf(source) {
        var username = String(source && source.username || '').trim().replace(/^@+/, '');
        if (username) return '@' + username;
        var fullName = String(source && (source.full_name || source.name) || '').trim();
        if (fullName) return fullName;
        return text('idLabel', 'ID {id}', { id: Number(source && (source.tester_id || source.id) || 0) });
    }

    function avatarHtml(source) {
        var url = String(source && source.avatar_url || '').trim();
        if (url) return '<img class="pc-avatar" src="' + esc(url) + '" loading="lazy" alt="">';
        var label = handleOf(source).replace(/^@/, '').trim();
        return '<span class="pc-avatar pc-avatar--letter">' + esc((label.charAt(0) || '?').toUpperCase()) + '</span>';
    }

    /* Compact Material-style glyphs for filtered-tab actions. */
    var ICONS = {
        remind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
        reward: (typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : '<svg viewBox="-40 -40 80 80" aria-hidden="true"><circle r="39" fill="currentColor"/><path fill="#fff" fill-opacity="0.92" d="M0,38a38,38 0 0 1 0,-76a19,19 0 0 1 0,38a19,19 0 0 0 0,38"/><circle r="5" cy="19" fill="#fff" fill-opacity="0.92"/><circle r="5" cy="-19" fill="currentColor"/></svg>'),
        link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
        image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
        process: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14H6v-2h6v2zm4-4H6v-2h10v2zm0-4H6V7h10v2z"/></svg>',
        done: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    };

    var CONTRIBUTION_ICONS = {
        bug: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 8h-2.3a6.4 6.4 0 0 0-1.55-1.55L16.5 5.1 15.1 3.7l-1.45 1.45A6.4 6.4 0 0 0 12 5c-.57 0-1.12.08-1.65.22L8.9 3.7 7.5 5.1l1.35 1.35A6.4 6.4 0 0 0 7.3 8H5v2h1.42c-.16.63-.24 1.3-.24 2s.08 1.37.24 2H5v2h2.3a6.4 6.4 0 0 0 1.55 1.55L7.5 18.9l1.4 1.4 1.45-1.45c.53.14 1.08.22 1.65.22s1.12-.08 1.65-.22l1.45 1.45 1.4-1.4-1.35-1.35A6.4 6.4 0 0 0 16.7 16H19v-2h-1.42c.16-.63.24-1.3.24-2s-.08-1.37-.24-2H19V8Zm-7 9a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm-2-7h4v2h-4v-2Zm0 3h4v2h-4v-2Z"/></svg>',
        idea: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19a7 7 0 0 0-4.5 12.36c.93.78 1.5 1.92 1.5 3.14V18h6v-.5c0-1.22.57-2.36 1.5-3.14A7 7 0 0 0 12 2Zm2.2 10.83c-.78.66-1.37 1.49-1.7 2.42h-1c-.33-.93-.92-1.76-1.7-2.42A4.98 4.98 0 1 1 14.2 12.83Z"/></svg>',
        play_review: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 2 2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 16.47 6.34 19.44l1.08-6.31L2.83 8.66l6.34-.92L12 2Z"/></svg>',
        screenshots: ICONS.image,
    };

    // Reasons in Attention are shown directly on the avatar, just like a
    // contribution source. They only visualize the reasons already calculated
    // below; the selection rules themselves stay untouched.
    var ATTENTION_ICONS = {
        debt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13ZM6.5 5a.5.5 0 0 0-.5.5v2h12v-2a.5.5 0 0 0-.5-.5h-11ZM6 10v8.5c0 .28.22.5.5.5h11a.5.5 0 0 0 .5-.5V10H6Zm3 2h6v2H9v-2Zm0 3h4v2H9v-2Z"/></svg>',
        skips: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 1.7 20.5h20.6L12 3Zm1 13h-2V9h2v7Zm0 3h-2v-2h2v2Z"/></svg>',
        missed_control: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 2h10v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm2 2h6V3H9v1Zm11 4H4v12h16V8Zm-8 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm1 1v2.59l1.7 1.7-1.4 1.41L11 14v-3h2Z"/></svg>',
        not_opened: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c5.3 0 9.27 4.11 10.5 7-1.23 2.89-5.2 7-10.5 7S2.73 14.89 1.5 12C2.73 9.11 6.7 5 12 5Zm0 2c-3.96 0-7.16 2.86-8.39 5 1.23 2.14 4.43 5 8.39 5s7.16-2.86 8.39-5C19.16 9.86 15.96 7 12 7Zm0 2.25A2.75 2.75 0 1 1 9.25 12 2.75 2.75 0 0 1 12 9.25Zm-7.7 9.34L18.6 4.3l1.41 1.41L5.71 20 4.3 18.59Z"/></svg>',
    };

    function iconAct(kind, label, onclick, opts) {
        opts = opts || {};
        var title = opts.title || label || '';
        var labelHtml = label ? '<span class="pc-iconact__label">' + esc(label) + '</span>' : '';
        if (opts.done) {
            return '<span class="pc-iconact pc-iconact--done" title="' + esc(title) + '">' +
                ICONS.done + labelHtml + '</span>';
        }
        return '<button type="button" class="pc-iconact pc-iconact--' + esc(kind) + '" title="' + esc(title) + '"' +
            ' onclick="event.stopPropagation(); ' + onclick + '">' +
            (ICONS[kind] || '') +
            labelHtml +
            '</button>';
    }

    function awardedRewardBadgeHtml(context, testerId) {
        var rewards = (context && context.rewardTypesByTester && context.rewardTypesByTester[Number(testerId)]) || [];
        var tokens = rewards.map(function (type) {
            if (type === 'good') return '👍 +1.5';
            if (type === 'bug') return '💎 +3.0';
            if (type === 'overtime') return '⏱ +2.0';
            return '☯️';
        });
        if (!tokens.length) tokens.push('☯️');
        var value = tokens.join(' · ');
        return '<span class="pc-award-badge" title="' + esc(value) + '">' +
            '<span class="pc-award-badge__value">' + esc(value) + '</span>' +
        '</span>';
    }

    function contributionAvatarMarkerHtml(reasons) {
        var items = Array.isArray(reasons) ? reasons : [];
        var primary = items.some(function (reason) { return reason.kind === 'bug'; }) ? 'bug'
            : items.some(function (reason) { return reason.kind === 'idea'; }) ? 'idea'
                : items.some(function (reason) { return reason.kind === 'play_review'; }) ? 'play_review'
                    : 'screenshots';
        return '<span class="pc-contribution-marker is-' + esc(primary) + '" aria-hidden="true">' +
            (CONTRIBUTION_ICONS[primary] || CONTRIBUTION_ICONS.screenshots) +
            (items.length > 1 ? '<b>+</b>' : '') +
        '</span>';
    }

    function attentionAvatarMarkerHtml(reasons) {
        var items = Array.isArray(reasons) ? reasons : [];
        var primary = items.some(function (reason) { return reason.code === 'debt'; }) ? 'debt'
            : items.some(function (reason) { return reason.code === 'skips'; }) ? 'skips'
                : items.some(function (reason) { return reason.code === 'missed_control'; }) ? 'missed_control'
                    : 'not_opened';
        return '<span class="pc-attention-marker is-' + esc(primary) + '" aria-hidden="true">' +
            (ATTENTION_ICONS[primary] || ATTENTION_ICONS.not_opened) +
            (items.length > 1 ? '<b>+</b>' : '') +
        '</span>';
    }

    function contributionProcessActionHtml(appId, feedbackId) {
        return '<button type="button" class="pc-iconact pc-iconact--process pc-iconact--feedback"' +
            ' title="' + esc(text('pcProcessBtn', 'Process')) + '"' +
            ' onclick="event.stopPropagation(); pcOpenFeedback(' + Number(appId) + ',' + Number(feedbackId) + ')">' +
            '<img class="pc-iconact__img" src="./images/Icons/select-multiple-svgrepo-com.svg" alt="" aria-hidden="true">' +
            '<span class="pc-iconact__label">' + esc(text('pcProcessBtn', 'Process')) + '</span>' +
        '</button>';
    }

    function contributionScreenshotsLabel(count) {
        var amount = Math.max(0, Number(count || 0));
        var key = 'pcContributionScreenshotsMany';
        if (typeof lang === 'undefined' || lang !== 'ru') {
            key = amount === 1 ? 'pcContributionScreenshotsOne' : 'pcContributionScreenshotsMany';
        } else {
            var lastTwo = amount % 100;
            var lastOne = amount % 10;
            if (lastTwo < 11 || lastTwo > 14) {
                if (lastOne === 1) key = 'pcContributionScreenshotsOne';
                else if (lastOne >= 2 && lastOne <= 4) key = 'pcContributionScreenshotsFew';
            }
        }
        return text(key, '{count} screenshots', { count: amount });
    }

    function dossierClick(appId, tester) {
        var username = dossierUsername(tester);
        var safeUser = typeof escapeInlineJsString === 'function' ? escapeInlineJsString(username) : username.replace(/'/g, "\\'");
        return 'openDossierModal(\'' + safeUser + '\', ' + Number(tester && (tester.tester_id || tester.id) || 0) + ', ' + Number(appId) + ')';
    }

    function attentionTone(item) {
        var codes = {};
        (item && item.reasons || []).forEach(function (reason) {
            codes[String(reason.code || '')] = true;
        });
        if (codes.skips || codes.missed_control || codes.debt) return 'amber';
        if (codes.not_opened) return 'sky';
        return 'amber';
    }

    /**
     * Status-dot is a visual summary of already-known states, not new logic.
     * sky = waiting / expected action; amber = stalling risk; green = done.
     */
    function personRowHtml(opts) {
        var tester = opts.tester || {};
        var tone = opts.tone || 'neutral';
        var extra = opts.extraHtml || '';
        var avatarMarker = opts.avatarMarkerHtml || '<span class="pc-person__dot" aria-hidden="true"></span>';
        var stateCls = opts.received ? ' is-received' : (opts.waiting ? ' is-waiting' : '');
        var rowCls = opts.rowClass ? ' ' + String(opts.rowClass) : '';
        return '<li class="pc-person is-' + esc(tone) + stateCls + rowCls + '"' +
            ' onclick="' + dossierClick(opts.appId, tester) + '">' +
            '<div class="pc-person__top">' +
                '<span class="pc-person__avatar">' +
                    avatarHtml(tester) +
                    avatarMarker +
                '</span>' +
                '<div class="pc-person__copy">' +
                    '<span class="pc-person__name notranslate">' + esc(handleOf(tester)) + '</span>' +
                    '<span class="pc-person__meta">' + (opts.metaHtml || '') + '</span>' +
                '</div>' +
                '<div class="pc-person__actions">' + (opts.actionsHtml || '') + '</div>' +
                '<span class="pc-person__chev" aria-hidden="true">›</span>' +
            '</div>' +
            extra +
        '</li>';
    }

    function proofTypeLabel(type) {
        if (type === 'bug') return text('pcProofBug', 'Bug');
        if (type === 'idea') return text('pcProofIdea', 'Idea');
        if (type === 'play_review') return text('pcProofReview', 'Review');
        return '';
    }

    function timeLabel(value) {
        var date = new Date(String(value || ''));
        if (!Number.isFinite(date.getTime())) return '';
        try {
            return date.toLocaleTimeString(typeof lang !== 'undefined' && lang === 'ru' ? 'ru-RU' : 'en-US', {
                hour: '2-digit', minute: '2-digit',
            });
        } catch (_) {
            return String(value || '').slice(11, 16);
        }
    }

    /* ───────────────────────────── data loading ───────────────────────────── */

    async function requestJson(url) {
        var response = await fetchWithRetry(url, { timeoutMs: 25000 }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success') {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return payload;
    }

    async function requestThumbnailTicket(proofId, mediaIndex) {
        var response = await fetchWithRetry(API_BASE + '/checkin-proofs/' + Number(proofId || 0) + '/media-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: initData(), variant: 'thumbnail', media_index: Number(mediaIndex || 0) }),
            timeoutMs: 20000,
        }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success' || !payload.url) throw new Error('ticket_failed');
        return mediaUrl(payload.url);
    }

    async function requestProofDetails(proofId) {
        var payload = await requestJson(
            API_BASE + '/checkin-proofs/' + Number(proofId || 0) + '/details?init_data=' + encodeURIComponent(initData())
        );
        return payload.proof || null;
    }

    function todayEntryFor(item) {
        var day = Number(item && item.current_day || 0);
        if (day <= 0) return null;
        var timeline = (item && item.timeline) || [];
        for (var index = 0; index < timeline.length; index += 1) {
            if (Number(timeline[index].day) === day) return timeline[index];
        }
        return null;
    }

    function thumbKey(proofId, mediaIndex) {
        return Number(proofId || 0) + ':' + Number(mediaIndex || 0);
    }

    function cachedThumb(proofId, mediaIndex) {
        return thumbnailCache.get(thumbKey(proofId, mediaIndex)) || '';
    }

    function rememberThumb(proofId, mediaIndex, url, appId) {
        var value = String(url || '').trim();
        if (!value) return;
        thumbnailCache.set(thumbKey(proofId, mediaIndex), value);
        var entry = cache.get(Number(appId || 0));
        if (!entry) return;
        [entry.control, entry.others].forEach(function (rows) {
            (rows || []).forEach(function (row) {
                (row.slots || []).forEach(function (slot) {
                    if (Number(slot.proofId) === Number(proofId) && Number(slot.mediaIndex) === Number(mediaIndex)) {
                        slot.url = value;
                    }
                });
            });
        });
    }

    function buildSlots(proof, thumbnailByProofId) {
        var proofId = Number(proof && proof.id || 0);
        if (proofId <= 0) return [];
        var type = String(proof.type || '');
        if (type === 'screenshot') {
            var total = Math.max(1, Math.min(5, Number(proof.image_count || 1)));
            var visible = Math.min(MAX_SLOTS, total);
            var slots = [];
            for (var index = 0; index < visible; index += 1) {
                slots.push({
                    proofId: proofId,
                    mediaIndex: index,
                    url: (index === 0 ? (thumbnailByProofId[proofId] || '') : '') || cachedThumb(proofId, index),
                    overflow: (index === visible - 1 && total > visible) ? (total - visible) : 0,
                });
            }
            return slots;
        }
        if (FEEDBACK_PROOF_TYPES.indexOf(type) !== -1) {
            return [{ proofId: proofId, mediaIndex: 0, url: cachedThumb(proofId, 0), overflow: 0 }];
        }
        return [];
    }

    function buildProofRow(item, proof, thumbnailByProofId) {
        var totalImages = String(proof && proof.type || '') === 'screenshot'
            ? Math.max(1, Math.min(5, Number(proof.image_count || 1)))
            : (proof ? 1 : 0);
        return {
            progressId: Number(item.progress_id || 0),
            testerId: Number(item.tester && item.tester.id || 0),
            tester: item.tester || {},
            day: Number(item.current_day || 0),
            received: true,
            proofId: Number(proof && proof.id || 0),
            proofType: String(proof && proof.type || ''),
            createdAt: String(proof && proof.created_at || ''),
            imageCount: totalImages,
            feedbackId: Number(proof && proof.source_feedback_id || 0),
            feedbackStatus: '',
            slots: buildSlots(proof, thumbnailByProofId),
        };
    }

    function buildRow(item, thumbnailByProofId) {
        var entry = todayEntryFor(item);
        var state = String(entry && entry.state || '');
        var checked = state === 'checked' || state === 'checked_overtime' || state === 'external_checked';
        var proof = checked && entry.proof && entry.proof.type !== 'legacy' ? entry.proof : null;
        var totalImages = String(proof && proof.type || '') === 'screenshot'
            ? Math.max(1, Math.min(5, Number(proof.image_count || 1)))
            : (proof ? 1 : 0);
        return {
            progressId: Number(item.progress_id || 0),
            testerId: Number(item.tester && item.tester.id || 0),
            tester: item.tester || {},
            day: Number(item.current_day || 0),
            received: !!checked,
            proofId: Number(proof && proof.id || 0),
            proofType: String(proof && proof.type || ''),
            createdAt: String(proof && proof.created_at || ''),
            imageCount: totalImages,
            feedbackId: Number(proof && proof.source_feedback_id || 0),
            feedbackStatus: '',
            slots: buildSlots(proof, thumbnailByProofId),
        };
    }

    async function attachFeedbackStatuses(rows) {
        var targets = rows.filter(function (row) {
            return row.feedbackId > 0 && row.proofId > 0;
        }).slice(0, MAX_DETAIL_LOOKUPS);
        if (!targets.length || !galleryEnabled()) return;
        await Promise.all(targets.map(async function (row) {
            try {
                var proof = await requestProofDetails(row.proofId);
                row.feedbackStatus = String(proof && proof.feedback && proof.feedback.status || '').toLowerCase();
                row.feedbackTitle = String(
                    (proof && proof.feedback && (proof.feedback.title || proof.feedback.summary || proof.feedback.text)) || ''
                ).replace(/\s+/g, ' ').trim().slice(0, 80);
            } catch (_) {
                row.feedbackStatus = '';
                row.feedbackTitle = '';
            }
        }));
    }

    async function hydrate(appId) {
        var safeAppId = Number(appId || 0);
        var current = cache.get(safeAppId);
        if (current && current.loading) return;
        if (current && !current.error && (Date.now() - current.loadedAt) < CACHE_TTL_MS) return;
        cache.set(safeAppId, { loadedAt: 0, loading: true, error: false, control: [], others: [] });
        try {
            paint(safeAppId);
        } catch (error) {
            console.warn('Project today paint failed:', error);
        }

        try {
            var testersPromise = requestJson(
                API_BASE + '/projects/' + safeAppId + '/testing-control/testers?limit=50&init_data=' + encodeURIComponent(initData())
            );
            var screenshotsPromise = galleryEnabled()
                ? requestJson(
                    API_BASE + '/projects/' + safeAppId + '/testing-control/screenshots?limit=50&init_data=' + encodeURIComponent(initData())
                ).catch(function () { return { items: [] }; })
                : Promise.resolve({ items: [] });

            var results = await Promise.all([testersPromise, screenshotsPromise]);
            var thumbnailByProofId = {};
            (results[1].items || []).forEach(function (shot) {
                var proofId = Number(shot.proof_id || 0);
                var url = mediaUrl(shot.thumbnail_url);
                thumbnailByProofId[proofId] = url;
                if (url) thumbnailCache.set(thumbKey(proofId, 0), url);
            });

            var control = [];
            var others = [];
            var seenOtherProofIds = {};
            var project = projectById(safeAppId);
            (results[0].items || []).forEach(function (item) {
                if (isExcludedControlTester(project, item)) return;
                var row = buildRow(item, thumbnailByProofId);
                if (row.day <= 0) return;
                if (isControlDay(row.day)) control.push(row);
                else if (row.proofId > 0) {
                    others.push(row);
                    seenOtherProofIds[row.proofId] = true;
                }
                (item.extra_proofs || []).forEach(function (proof) {
                    var extra = buildProofRow(item, proof, thumbnailByProofId);
                    if (extra.proofId <= 0 || seenOtherProofIds[extra.proofId]) return;
                    seenOtherProofIds[extra.proofId] = true;
                    others.push(extra);
                });
            });
            others.sort(function (left, right) {
                return String(right.createdAt || '').localeCompare(String(left.createdAt || ''));
            });

            await attachFeedbackStatuses(control.concat(others));
            cache.set(safeAppId, { loadedAt: Date.now(), loading: false, error: false, control: control, others: others });
        } catch (error) {
            console.warn('Project today hydration failed:', error);
            cache.set(safeAppId, { loadedAt: Date.now(), loading: false, error: true, control: [], others: [] });
        }
        paint(safeAppId);
        loadPendingThumbnails(safeAppId);
    }

    function findRow(appId, proofId) {
        var entry = cache.get(Number(appId || 0));
        if (!entry) return null;
        var match = function (row) { return Number(row.proofId) === Number(proofId || 0); };
        return entry.control.find(match) || entry.others.find(match) || null;
    }

    /* ─────────────────────────── thumbnail delivery ────────────────────────── */

    async function loadPendingThumbnails(appId, options) {
        var root = document.getElementById('pc-today-' + Number(appId || 0));
        if (!root || !galleryEnabled()) return;
        var scope = (options && options.scope) ? (root.querySelector(options.scope) || root) : root;
        Array.prototype.slice.call(scope.querySelectorAll('img[data-pc-src]')).forEach(function (image) {
            if (image.getAttribute('src')) return;
            image.setAttribute('src', image.getAttribute('data-pc-src'));
        });
        var pending = Array.prototype.slice.call(scope.querySelectorAll('img[data-pc-ticket]')).filter(function (image) {
            if (image.getAttribute('src')) return false;
            var others = image.closest('.pc-others');
            if (others && !others.classList.contains('is-open') && !(options && options.scope === '.pc-others')) {
                return false;
            }
            return true;
        }).slice(0, MAX_TICKET_REQUESTS);
        for (var index = 0; index < pending.length; index += 1) {
            var image = pending[index];
            if (image.getAttribute('src')) continue;
            var parts = String(image.getAttribute('data-pc-ticket') || '').split(':');
            try {
                var url = await requestThumbnailTicket(Number(parts[0]), Number(parts[1]));
                rememberThumb(Number(parts[0]), Number(parts[1]), url, appId);
                if (!image.isConnected) continue;
                image.setAttribute('src', url);
            } catch (_) {
                var slot = image.closest('.pc-slot');
                if (slot) slot.classList.add('is-error');
            }
        }
    }

    /* ───────────────────────────── row rendering ───────────────────────────── */

    function slotHtml(appId, slot, overflow) {
        var cached = String(slot.url || cachedThumb(slot.proofId, slot.mediaIndex) || '').trim();
        var source = cached
            ? ' src="' + esc(cached) + '"'
            : ' data-pc-ticket="' + Number(slot.proofId) + ':' + Number(slot.mediaIndex) + '"';
        var overflowHtml = overflow > 0
            ? '<span class="pc-slot__more">' + esc(text('pcMoreImages', '+{count}', { count: overflow })) + '</span>'
            : '';
        return '<button type="button" class="pc-slot is-filled" ' +
                'onclick="event.stopPropagation(); pcOpenProof(' + Number(appId) + ',' + Number(slot.proofId) + ',' + Number(slot.mediaIndex) + ')">' +
                '<img alt="" loading="lazy"' + source +
                    ' onload="this.closest(\'.pc-slot\').classList.add(\'is-loaded\')"' +
                    ' onerror="this.closest(\'.pc-slot\').classList.add(\'is-error\')">' +
                overflowHtml +
            '</button>';
    }

    function emptySlotHtml() {
        return '<span class="pc-slot is-empty" aria-hidden="true"></span>';
    }

    function slotsHtml(appId, row) {
        var cells = row.slots.map(function (slot) { return slotHtml(appId, slot, slot.overflow); });
        while (cells.length < MAX_SLOTS) cells.push(emptySlotHtml());
        return '<div class="pc-slots">' + cells.join('') + '</div>';
    }

    function isProcessed(row) {
        return PROCESSED_STATUSES.indexOf(String(row.feedbackStatus || '')) !== -1;
    }

    function stateHtml(row) {
        if (!row.received) {
            return '<span class="pc-pstate is-pending">' + esc(text('pcControlPending', 'Pending')) + '</span>';
        }
        var typeLabel = proofTypeLabel(row.proofType);
        var received = '<span class="pc-pstate is-received">' + esc(text('pcControlReceived', 'Received')) + '</span>';
        if (!typeLabel) return received;
        return received + '<span class="pc-tag pc-tag--' + esc(row.proofType) + '">' + esc(typeLabel) + '</span>';
    }

    function controlActionsHtml(appId, row, context) {
        var html = '';
        if (!row.received) {
            return iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(row.testerId) + ')');
        }
        if (row.proofId > 0) {
            html += iconAct('image', '',
                'pcOpenProof(' + Number(appId) + ',' + Number(row.proofId) + ',0)',
                { title: controlProofLabel(row) });
        }
        if (row.feedbackId > 0 && !isProcessed(row)) {
            html += iconAct('process', '',
                'pcOpenFeedback(' + Number(appId) + ',' + Number(row.feedbackId) + ')',
                { title: text('pcProcessBtn', 'Process') });
        }
        if (context.rewardedTesterIds.indexOf(Number(row.testerId)) !== -1) {
            html += awardedRewardBadgeHtml(context, row.testerId);
        } else if (context.rewardsLeft > 0) {
            html += iconAct('reward', text('pcRewardBtn', 'Reward'),
                'pcRewardTester(' + Number(appId) + ',' + Number(row.testerId) + ')');
        }
        return html;
    }

    function controlRowHtml(appId, row, context) {
        var dayNum = Number(row && row.day || 0);
        var meta = '<span class="pc-pstate ' + (row.received ? 'is-received' : 'is-pending') + '">' +
            esc(row.received ? text('pcControlReceived', 'Received') : text('pcControlPending', 'Pending')) +
            '</span>';
        if (dayNum > 0) {
            meta += '<span class="pc-person__day">• ' +
                esc(text('testingControlCurrentDay', 'Day {day}', { day: dayNum })) +
            '</span>';
        }
        var typeLabel = row.received ? proofTypeLabel(row.proofType) : '';
        if (typeLabel) {
            meta += '<span class="pc-tag pc-tag--' + esc(row.proofType) + '">' + esc(typeLabel) + '</span>';
        }
        return personRowHtml({
            appId: appId,
            tester: row.tester,
            tone: row.received ? 'green' : 'sky',
            received: !!row.received,
            waiting: !row.received,
            metaHtml: meta,
            actionsHtml: controlActionsHtml(appId, row, context),
            extraHtml: row.received && row.slots && row.slots.length ? slotsHtml(appId, row) : '',
        });
    }

    /* ───────────────────────── control block rendering ─────────────────────── */

    function fallbackControlRows(project) {
        var today = todayString();
        return (project.testers || []).filter(function (tester) {
            if (tester.is_left_soft || tester.is_guest_tester || tester.is_external) return false;
            return isControlDay(Number(tester.testing_days || 0));
        }).map(function (tester) {
            return {
                progressId: Number(tester.progress_id || 0),
                testerId: Number(tester.tester_id || 0),
                tester: tester,
                day: Number(tester.testing_days || 0),
                received: tester.last_check_date === today,
                proofId: 0,
                proofType: '',
                createdAt: '',
                imageCount: 0,
                feedbackId: 0,
                feedbackStatus: '',
                slots: [],
            };
        });
    }

    function controlSectionHtml(project, rows, context, entry) {
        if (!rows.length) return '';
        var done = rows.filter(function (row) { return row.received; }).length;
        var rewardChip = context.rewardsLeft > 0
            ? '<button type="button" class="pc-reward-chip" onclick="event.stopPropagation(); openKarmaDistribution(' +
                Number(project.id) + ');">' +
                (typeof window.withKarmaIcon === 'function'
                    ? window.withKarmaIcon(esc(text('karmaRewards', 'Rewards: {count}', { count: context.rewardsLeft })))
                    : esc(text('karmaRewards', 'Rewards: {count}', { count: context.rewardsLeft }))) +
              '</button>'
            : '';
        var ringHtml = typeof window.buildProjectDailyProgressRingHtml === 'function'
            ? window.buildProjectDailyProgressRingHtml(project)
            : '';
        return '<section class="pc-control' + (entry && entry.loading ? ' is-hydrating' : '') + '">' +
            '<header class="pc-control__head">' +
                '<span class="pc-control__mark" aria-hidden="true">🛡</span>' +
                '<span class="pc-control__titles">' +
                    '<span class="pc-control__title">' + esc(text('pcControlTitle', 'Control day today')) + '</span>' +
                    '<span class="pc-control__sub' + (done >= rows.length ? ' is-complete' : '') + '">' +
                        esc(text('pcControlReportsSubtitle', '{done} of {total} reports', { done: done, total: rows.length })) +
                    '</span>' +
                '</span>' +
                rewardChip +
                ringHtml +
            '</header>' +
            '<ul class="pc-control__rows">' +
                rows.map(function (row) { return controlRowHtml(project.id, row, context); }).join('') +
            '</ul>' +
        '</section>';
    }

    /* ────────────────────── other reports today rendering ──────────────────── */

    function gridCardHtml(appId, row) {
        var slot = row.slots[0];
        var typeLabel = proofTypeLabel(row.proofType);
        var extra = Math.max(0, Number(row.imageCount || 0) - 1);
        var media = slot ? slotHtml(appId, slot, extra) : emptySlotHtml();
        var stamp = timeLabel(row.createdAt);
        return '<article class="pc-grid-card">' +
            '<div class="pc-grid-card__media">' + media +
                (typeLabel ? '<span class="pc-tag pc-tag--' + esc(row.proofType) + ' pc-tag--overlay">' + esc(typeLabel) + '</span>' : '') +
            '</div>' +
            '<div class="pc-grid-card__meta">' +
                '<span class="pc-grid-card__name notranslate">' + esc(handleOf(row.tester)) + '</span>' +
                (stamp ? '<span class="pc-grid-card__time">' + esc(stamp) + '</span>' : '') +
            '</div>' +
        '</article>';
    }

    function othersSectionHtml(project, entry) {
        var rows = (entry && entry.others) || [];
        if (!rows.length) return '';
        var expanded = expandedOthers.has(Number(project.id));
        return '<section class="pc-others' + (expanded ? ' is-open' : '') + '">' +
            '<button type="button" class="pc-others__head" onclick="event.stopPropagation(); pcToggleOthers(' + Number(project.id) + ')">' +
                '<span class="pc-others__mark" aria-hidden="true">🗂</span>' +
                '<span class="pc-others__titles">' +
                    '<span class="pc-others__title">' + esc(text('pcOthersTitle', 'Other reports today')) + ' · ' + rows.length + '</span>' +
                    '<span class="pc-others__sub">' + esc(text('pcOthersSubtitle', 'Extra reports from today')) + '</span>' +
                '</span>' +
                '<span class="pc-others__toggle">' + esc(expanded ? text('pcOthersHide', 'Hide') : text('pcOthersShow', 'Show')) + '</span>' +
            '</button>' +
            '<div class="pc-others__body">' +
                '<div class="pc-others__grid">' + rows.map(function (row) { return gridCardHtml(project.id, row); }).join('') + '</div>' +
                '<button type="button" class="pc-others__deep" onclick="event.stopPropagation(); openTestingControl(' + Number(project.id) + ', { archived: false });">' +
                    esc(text('pcOpenTestingControl', 'Open Testing Control')) + '<span class="pc-others__deep-arrow" aria-hidden="true">→</span>' +
                '</button>' +
            '</div>' +
        '</section>';
    }

    /* ────────────────── activity block: contribution / attention ──────────── */

    function testerDayNumber(tester) {
        var day = Number(tester && tester.testing_days || 0);
        if (day > 0) return day;
        if (tester && tester.start_date && typeof getUserTestingDay === 'function') {
            return Number(getUserTestingDay(tester.start_date, tester.testing_days) || 0);
        }
        return 0;
    }

    function dossierUsername(tester) {
        return String(tester && tester.username || '').trim().replace(/^@+/, '');
    }

    function isValuableRow(row) {
        var type = String(row && row.proofType || '');
        if (FEEDBACK_PROOF_TYPES.indexOf(type) !== -1) return true;
        return type === 'screenshot' && Number(row.imageCount || 0) >= 3;
    }

    function collectContribution(control, others) {
        var byTester = {};
        var order = [];
        (control || []).concat(others || []).forEach(function (row) {
            if (!isValuableRow(row)) return;
            var testerId = Number(row.testerId || 0);
            if (testerId <= 0) return;
            if (!byTester[testerId]) {
                byTester[testerId] = {
                    testerId: testerId,
                    tester: row.tester,
                    screenshotCount: 0,
                    screenshotRow: null,
                    bug: null,
                    idea: null,
                    play_review: null,
                };
                order.push(testerId);
            }
            var item = byTester[testerId];
            if (row.proofType === 'screenshot' && Number(row.imageCount || 0) > item.screenshotCount) {
                item.screenshotCount = Number(row.imageCount || 0);
                item.screenshotRow = row;
            }
            if (row.proofType === 'bug' && !item.bug) item.bug = row;
            if (row.proofType === 'idea' && !item.idea) item.idea = row;
            if (row.proofType === 'play_review' && !item.play_review) item.play_review = row;
        });
        return order.map(function (testerId) {
            var item = byTester[testerId];
            var reasons = [];
            if (item.screenshotCount >= 3 && item.screenshotRow) {
                reasons.push({
                    kind: 'screenshots',
                    label: contributionScreenshotsLabel(item.screenshotCount),
                    proofId: item.screenshotRow.proofId,
                    feedbackId: 0,
                });
            }
            if (item.bug) {
                reasons.push({
                    kind: 'bug',
                    label: item.bug.feedbackTitle
                        ? (text('pcProofBug', 'Bug') + ' · ' + item.bug.feedbackTitle)
                        : text('pcProofBug', 'Bug'),
                    proofId: item.bug.proofId,
                    feedbackId: item.bug.feedbackId,
                    feedbackStatus: item.bug.feedbackStatus,
                });
            }
            if (item.idea) {
                reasons.push({
                    kind: 'idea',
                    label: text('pcContributionIdea', 'Recommendation'),
                    proofId: item.idea.proofId,
                    feedbackId: item.idea.feedbackId,
                    feedbackStatus: item.idea.feedbackStatus,
                });
            }
            if (item.play_review) {
                reasons.push({
                    kind: 'play_review',
                    label: text('pcProofReview', 'Review'),
                    proofId: item.play_review.proofId,
                    feedbackId: item.play_review.feedbackId,
                    feedbackStatus: item.play_review.feedbackStatus,
                });
            }
            item.reasons = reasons;
            return item;
        });
    }

    function collectAttention(project) {
        var yesterday = shiftDateString(todayString(), -1);
        var items = [];
        (project && project.testers || []).forEach(function (tester) {
            if (!tester || tester.is_left_soft || tester.is_guest_tester || tester.is_external) return;
            var reasons = [];
            var neverOpened = !tester.last_check_date;
            if (neverOpened) {
                reasons.push({
                    code: 'not_opened',
                    label: text('statusNotOpened', 'Not opened yet'),
                });
            } else {
                var yesterdayDay = testerDayNumber(tester) - 1;
                if (yesterday && isControlDay(yesterdayDay) && String(tester.last_check_date || '') !== yesterday) {
                    reasons.push({
                        code: 'missed_control',
                        label: text('pcAttentionMissedControl', 'Control proof was not received yesterday'),
                    });
                }
            }
            var skips = (typeof calculateConsecutiveSkips === 'function')
                ? Number(calculateConsecutiveSkips(tester) || 0)
                : Number(tester.consecutive_skips || 0);
            if (skips >= 3) {
                reasons.push({
                    code: 'skips',
                    label: text('pcAttentionSkips', '{count} consecutive skips', { count: skips }),
                });
            }
            var joinType = String(tester.join_type || '').toLowerCase();
            if ((joinType === 'mutual' || joinType === 'prelaunch') && tester.is_mutual_debt) {
                reasons.push({
                    code: 'debt',
                    label: text('pcAttentionDebt', 'Still owes finishing your project'),
                });
            }
            if (!reasons.length) return;
            items.push({ tester: tester, testerId: Number(tester.tester_id || 0), reasons: reasons });
        });
        return items;
    }

    function controlProofLabel(row) {
        if (!row || !row.received) return text('pcControlPending', 'Pending');
        if (row.proofType === 'screenshot') return text('testingControlProofScreenshot', 'Screenshot');
        return proofTypeLabel(row.proofType) || text('pcControlReceivedMark', 'Received');
    }

    function emptySheetHtml(message) {
        return '<div class="pc-activity-empty">' + esc(message) + '</div>';
    }

    function contributionSheetHtml(appId, items, context) {
        if (!items.length) return emptySheetHtml(text('pcContributionEmpty', 'No extra contribution today'));
        return '<ul class="pc-act-list">' + items.map(function (item) {
            var reasonHtml = item.reasons.map(function (reason) {
                var handler = reason.feedbackId > 0
                    ? 'pcOpenFeedback(' + Number(appId) + ',' + Number(reason.feedbackId) + ')'
                    : (reason.proofId > 0
                        ? 'pcOpenProof(' + Number(appId) + ',' + Number(reason.proofId) + ',0)'
                        : '');
                if (!handler) return '<span class="pc-act-reason">' + esc(reason.label) + '</span>';
                return '<button type="button" class="pc-act-reason" onclick="event.stopPropagation(); ' + handler + '">' +
                    esc(reason.label) + '</button>';
            }).join('<span class="pc-act-reason-sep"> · </span>');
            var rewarded = context.rewardedTesterIds.indexOf(Number(item.testerId)) !== -1;
            var feedbackReasons = item.reasons.filter(function (reason) {
                return ['bug', 'idea', 'play_review'].indexOf(reason.kind) !== -1;
            });
            var pendingFeedback = feedbackReasons.find(function (reason) {
                return Number(reason.feedbackId || 0) > 0 && !isProcessed(reason);
            });
            // A feedback-only contribution is handled through its ticket. When there
            // is another contribution too, its regular karma action remains available.
            var mayRewardHere = !feedbackReasons.length || item.reasons.length > 1;
            var actionsHtml = '';
            if (pendingFeedback) {
                actionsHtml += contributionProcessActionHtml(appId, pendingFeedback.feedbackId);
            }
            // Keep the reward (or its issued summary) to the right of ticket handling.
            if (rewarded) {
                actionsHtml += awardedRewardBadgeHtml(context, item.testerId);
            } else if (mayRewardHere && context.rewardsLeft > 0) {
                actionsHtml += iconAct('reward', text('pcRewardBtn', 'Reward'),
                    'pcRewardTester(' + Number(appId) + ',' + Number(item.testerId) + ')');
            }
            return personRowHtml({
                appId: appId,
                tester: item.tester,
                tone: rewarded ? 'green' : 'sky',
                metaHtml: reasonHtml,
                actionsHtml: actionsHtml,
                avatarMarkerHtml: contributionAvatarMarkerHtml(item.reasons),
            });
        }).join('') + '</ul>';
    }

    function attentionSheetHtml(appId, items) {
        if (!items.length) return emptySheetHtml(text('pcAttentionEmpty', 'Nobody needs attention right now'));
        return '<ul class="pc-act-list">' + items.map(function (item) {
            var hasDebt = item.reasons.some(function (reason) { return reason.code === 'debt'; });
            // Remind stays rightmost; debt/link (if any) sits to its left.
            var actions = '';
            if (hasDebt && typeof openTesterLinkStatusFromRow === 'function') {
                actions += iconAct('link', text('pcDebtShort', 'Debt'),
                    'openTesterLinkStatusFromRow(' + Number(appId) + ',' + Number(item.testerId) + ', event)',
                    { title: text('linkedBadgeDebt', 'Mutual debt') });
            }
            actions += iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(item.testerId) + ')');
            var metaHtml = item.reasons.map(function (reason) {
                return '<span class="pc-person__reason">• ' + esc(reason.label) + '</span>';
            }).join('');
            return personRowHtml({
                appId: appId,
                tester: item.tester,
                tone: attentionTone(item),
                rowClass: 'pc-person--reasons',
                metaHtml: metaHtml,
                actionsHtml: actions,
                avatarMarkerHtml: attentionAvatarMarkerHtml(item.reasons),
            });
        }).join('') + '</ul>';
    }

    function compactControlSheetHtml(appId, rows, context) {
        if (!rows.length) return emptySheetHtml(text('pcControlEmpty', 'No control day today'));
        return '<ul class="pc-act-list">' +
            rows.map(function (row) { return controlRowHtml(appId, row, context); }).join('') +
        '</ul>';
    }

    function rosterSourceHtml(appId) {
        var source = document.getElementById('pc-roster-source-' + Number(appId || 0));
        return source ? source.innerHTML : '';
    }

    function testersNowHtml(project) {
        var html = rosterSourceHtml(project && project.id);
        if (html) return html;
        // First paint of the card happens before the hidden roster node is in
        // the document. Leave the pane blank; mount() fills it on the same tick.
        return '';
    }

    function controlNowHtml(appId, rows, context) {
        if (!rows.length) return emptySheetHtml(text('pcControlEmpty', 'No control day today'));
        return '<ul class="pc-act-list pc-activity-control">' +
            rows.map(function (row) { return controlRowHtml(appId, row, context); }).join('') +
        '</ul>';
    }

    function nowHtmlForFilter(project, filter, data, context) {
        if (filter === 'contribution') return contributionSheetHtml(project.id, data.contribution, context);
        if (filter === 'attention') return attentionSheetHtml(project.id, data.attention, context);
        if (filter === 'control') return controlNowHtml(project.id, data.controlRows, context);
        return testersNowHtml(project);
    }

    function testersSheetHtml(project) {
        var roster = rosterSourceHtml(project && project.id) || emptySheetHtml(text('pcAllTestersHint', 'No testers yet'));
        return '<div id="pc-activity-state-pane" class="pc-activity-pane">' + roster + '</div>' +
            '<div id="pc-activity-history" class="pc-activity-history" hidden></div>';
    }

    function activityCounts(project) {
        var entry = cache.get(Number(project.id));
        var hydrated = !!(entry && !entry.loading && !entry.error && entry.loadedAt > 0);
        var controlRows = hydrated ? filterControlRows(project, entry.control) : fallbackControlRows(project);
        return {
            entry: entry,
            hydrated: hydrated,
            loading: !!(entry && entry.loading),
            error: !!(entry && entry.error),
            controlRows: controlRows,
            controlDone: controlRows.filter(function (row) { return row.received; }).length,
            contribution: collectContribution(
                hydrated ? (entry.control || []) : [],
                hydrated ? (entry.others || []) : []
            ),
            attention: collectAttention(project),
        };
    }

    function emptyModes() {
        return { contribution: 'now', attention: 'now', control: 'now', testers: 'now' };
    }

    function defaultActivityPrefs() {
        return { filter: 'testers', modes: emptyModes(), touched: false };
    }

    function readPrefs(appId) {
        var key = PREFS_PREFIX + Number(appId || 0);
        var raw = '';
        try {
            raw = localStorage.getItem(key) || '';
        } catch (_) {
            return defaultActivityPrefs();
        }
        if (!raw) return defaultActivityPrefs();
        var parsed = {};
        try {
            parsed = JSON.parse(raw) || {};
        } catch (_) {
            return defaultActivityPrefs();
        }
        if (parsed.touched !== true) return defaultActivityPrefs();
        var modes = emptyModes();
        var stored = parsed.modes && typeof parsed.modes === 'object' ? parsed.modes : {};
        ACTIVITY_FILTERS.forEach(function (modeKey) {
            modes[modeKey] = stored[modeKey] === 'history' ? 'history' : 'now';
        });
        return {
            filter: ACTIVITY_FILTERS.indexOf(parsed.filter) !== -1 ? parsed.filter : 'testers',
            modes: modes,
            touched: true,
        };
    }

    function writePrefs(appId, prefs) {
        try {
            localStorage.setItem(PREFS_PREFIX + Number(appId || 0), JSON.stringify({
                filter: prefs.filter,
                modes: prefs.modes,
                touched: true,
            }));
        } catch (_) {}
    }

    function visibleFilters(data) {
        var list = [];
        if (data.contribution && data.contribution.length) list.push('contribution');
        if (data.attention && data.attention.length) list.push('attention');
        if (data.controlRows && data.controlRows.length) list.push('control');
        list.push('testers');
        return list;
    }

    function resolvedFilter(prefs, data) {
        var visible = visibleFilters(data);
        if (visible.indexOf(prefs.filter) !== -1) return prefs.filter;
        return 'testers';
    }

    function scopeForFilter(filter, data) {
        if (filter === 'testers') return { testerIds: null, progressIds: null };
        var rows = filter === 'contribution'
            ? (data.contribution || [])
            : (filter === 'attention' ? (data.attention || []) : (data.controlRows || []));
        var testerIds = [];
        var progressIds = [];
        rows.forEach(function (item) {
            var testerId = Number(item.testerId || (item.tester && (item.tester.tester_id || item.tester.id)) || 0);
            var progressId = Number(item.progressId || (item.tester && item.tester.progress_id) || 0);
            if (testerId > 0) testerIds.push(testerId);
            if (progressId > 0) progressIds.push(progressId);
        });
        // A filtered card can be rendered before its tester mapping has been
        // hydrated. Passing two empty arrays to Testing Control then filters
        // every loaded row out and leaves the History pane blank. In that
        // transient case show the project history instead of an empty pane.
        return {
            testerIds: testerIds.length ? testerIds : null,
            progressIds: progressIds.length ? progressIds : null,
        };
    }

    function hintForFilter(filter) {
        if (filter === 'contribution') {
            return text('pcHintContribution', 'Today they did more than a regular check-in: reports, bugs, recommendations, or 3+ screenshots.');
        }
        if (filter === 'attention') {
            return text('pcHintAttention', 'These testers may stall the test or need an action from you.');
        }
        if (filter === 'control') {
            return text('pcHintControl', 'Today they must confirm testing with a control report.');
        }
        return text('pcHintAll', 'Everyone in the current test.');
    }

    function criteriaForFilter(filter) {
        if (filter === 'contribution') {
            return text('pcHintCriteriaContribution', 'Value: testers who sent a bug, idea, review, or 3+ screenshots today.');
        }
        if (filter === 'attention') {
            return text('pcHintCriteriaAttention', 'Attention: testers who have not opened the app, missed yesterday\'s control proof, skipped 3+ days, or still owe a mutual test.');
        }
        if (filter === 'control') {
            return text('pcHintCriteriaControl', 'Control: testers whose today is a mandatory proof day (1, 4, 7, 10, 14).');
        }
        return text('pcHintCriteriaAll', 'All: the full current roster of this test.');
    }

    function filterCount(key, data) {
        if (key === 'contribution') return (data && data.contribution || []).length;
        if (key === 'attention') return (data && data.attention || []).length;
        if (key === 'control') return (data && data.controlRows || []).length;
        return 0;
    }

    function filtersHtml(appId, visible, active, data) {
        var labels = {
            contribution: text('pcFilterContribution', 'Contribution'),
            attention: text('pcFilterAttention', 'Attention'),
            control: text('pcFilterControl', 'Control'),
            testers: text('pcFilterAll', 'All'),
        };
        return '<div class="pc-activity__filters" role="tablist">' +
            visible.map(function (key) {
                var count = filterCount(key, data || {});
                var countHtml = key === 'testers' || count <= 0
                    ? ''
                    : '<span class="pc-activity__count' + (key === 'attention' ? ' is-warn' : '') + '">' + count + '</span>';
                return '<button type="button" class="pc-activity__filter' + (key === active ? ' is-active' : '') +
                    '" role="tab" aria-selected="' + (key === active ? 'true' : 'false') +
                    '" onclick="event.stopPropagation(); pcSetActivityFilter(' + Number(appId) + ', \'' + key + '\')">' +
                    '<span class="pc-activity__filter-label">' + esc(labels[key]) + '</span>' +
                    countHtml +
                    '</button>';
            }).join('') +
        '</div>';
    }

    function karmaAvailability(project) {
        if (typeof window.getProjectKarmaPools === 'function') {
            var pools = window.getProjectKarmaPools(project) || {};
            return {
                available: Math.max(0, Number(pools.thanksAvailable || 0) + Number(pools.specialAvailable || 0)),
                max: Math.max(0, Number(pools.thanksMax || 0) + Number(pools.specialMax || 0)),
            };
        }
        var max = Math.max(0, Number(project && project.likes_max || 0));
        var used = Math.max(0, Number(project && project.likes_used || 0));
        return {
            available: Math.max(0, max - used),
            max: max,
        };
    }

    function captionHtml(appId, filter, mode, project) {
        var historyOn = mode === 'history';
        var trailing;
        if (filter === 'contribution') {
            var avail = karmaAvailability(project || projectById(appId));
            var label = text('pcKarmaAvailableShort', 'Available {available}/{max}', {
                available: avail.available,
                max: avail.max,
            });
            trailing = '<button type="button" class="pc-activity__karma" ' +
                'onclick="event.stopPropagation(); ' +
                (typeof openKarmaDistribution === 'function'
                    ? ('openKarmaDistribution(' + Number(appId) + ')')
                    : 'void 0') +
                '">' +
                (typeof window.karmaIconHtml === 'function' ? window.karmaIconHtml('karma-yin-icon--inline') : '') +
                '<span>' + esc(label) + '</span>' +
            '</button>';
        } else {
            trailing = '<button type="button" class="pc-activity__hist' + (historyOn ? ' is-on' : '') +
                '" aria-pressed="' + (historyOn ? 'true' : 'false') +
                '" onclick="event.stopPropagation(); pcToggleActivityHistory(' + Number(appId) + ')">' +
                '<span class="pc-activity__hist-dot" aria-hidden="true"></span>' +
                esc(text('pcModeHistory', 'History')) +
            '</button>';
        }
        return '<div class="pc-activity__caption">' +
            '<p class="pc-activity__hint">' +
                esc(hintForFilter(filter)) +
                '<button type="button" class="pc-activity__info" aria-label="' +
                    esc(text('pcHintInfoAria', 'Filter criteria')) +
                    '" onclick="event.stopPropagation(); pcShowFilterCriteria(\'' + filter + '\')">ⓘ</button>' +
            '</p>' +
            trailing +
        '</div>';
    }

    function workspaceListHtml(project, filter, mode, data, context) {
        var safeId = Number(project.id);
        return '<div class="pc-activity__list">' +
            '<div class="pc-activity__now" id="pc-activity-now-' + safeId + '"' + (mode === 'now' ? '' : ' hidden') + '>' +
                nowHtmlForFilter(project, filter, data, context) +
            '</div>' +
            '<div class="pc-activity-history" id="pc-activity-history-' + safeId + '"' + (mode === 'history' ? '' : ' hidden') + '></div>' +
        '</div>';
    }

    async function loadFilterHistory(appId, filter, data) {
        var pane = document.getElementById('pc-activity-history-' + Number(appId));
        if (!pane) return;
        var scope = scopeForFilter(filter, data);
        if (typeof window.renderTestingControlHistoryInto === 'function') {
            pane.innerHTML = '<div class="pc-activity-empty">' + esc(text('pcActivityHistoryLoading', 'Loading history…')) + '</div>';
            try {
                var loaded = await window.renderTestingControlHistoryInto(pane, appId, {
                    archived: false,
                    testerIds: scope.testerIds,
                    progressIds: scope.progressIds,
                });
                // The feature may be temporarily unavailable while the card is
                // already visible. Keep a useful empty state rather than a blank
                // History pane.
                if (loaded === false && pane.isConnected) {
                    pane.innerHTML = '<div class="pc-activity-empty">' + esc(text('testingControlEmpty', 'There are no testers in this run yet.')) + '</div>';
                }
            } catch (_) {
                if (pane.isConnected) {
                    pane.innerHTML = '<div class="pc-activity-empty">' + esc(text('testingControlLoadError', 'Could not load testing progress.')) + '</div>';
                }
            }
        } else {
            pane.innerHTML = '<div class="pc-activity-empty">' + esc(text('testingControlEmpty', 'There are no testers in this run yet.')) + '</div>';
        }
    }

    function afterPaint(appId) {
        var project = projectById(appId);
        if (!project) return;
        var data = activityCounts(project);
        var prefs = readPrefs(appId);
        var filter = resolvedFilter(prefs, data);
        var mode = prefs.modes[filter] || 'now';
        if (filter === 'contribution') mode = 'now';
        if (mode === 'history') {
            loadFilterHistory(appId, filter, data);
        } else if (filter === 'control') {
            loadPendingThumbnails(Number(appId), { scope: '.pc-activity__list' });
        }
    }

    function refreshActivityWorkspace(appId) {
        var safeAppId = Number(appId || 0);
        var root = document.getElementById('pc-today-' + safeAppId);
        var project = projectById(safeAppId);
        if (!root || !project) return;
        var shell = root.querySelector('.pc-activity');
        if (!shell) {
            root.innerHTML = innerHtml(project);
            afterPaint(safeAppId);
            return;
        }
        var data = activityCounts(project);
        var prefs = readPrefs(safeAppId);
        var filter = resolvedFilter(prefs, data);
        var mode = prefs.modes[filter] || 'now';
        if (filter === 'contribution') mode = 'now';
        var context = contextFor(project);
        var filtersEl = shell.querySelector('.pc-activity__filters');
        var captionEl = shell.querySelector('.pc-activity__caption');
        var nowEl = document.getElementById('pc-activity-now-' + safeAppId);
        var histEl = document.getElementById('pc-activity-history-' + safeAppId);
        shell.classList.toggle('is-hydrating', !!data.loading);
        if (filtersEl) {
            var nextFilters = document.createElement('div');
            nextFilters.innerHTML = filtersHtml(safeAppId, visibleFilters(data), filter, data);
            filtersEl.replaceWith(nextFilters.firstChild);
        }
        if (captionEl) {
            var nextCaption = document.createElement('div');
            nextCaption.innerHTML = captionHtml(safeAppId, filter, mode, project);
            captionEl.replaceWith(nextCaption.firstChild);
        }
        if (nowEl) {
            nowEl.hidden = mode !== 'now';
            if (mode === 'now') nowEl.innerHTML = nowHtmlForFilter(project, filter, data, context);
        }
        if (histEl) histEl.hidden = mode !== 'history';
        afterPaint(safeAppId);
    }

    function sheetIsOpen() {
        var overlay = document.getElementById('pc-activity-sheet');
        return !!(overlay && overlay.classList.contains('active'));
    }

    function fillActivitySheet() {
        var project = projectById(sheetState.appId);
        var overlay = document.getElementById('pc-activity-sheet');
        var titleEl = document.getElementById('pc-activity-sheet-title');
        var tabsEl = document.getElementById('pc-activity-sheet-tabs');
        var bodyEl = document.getElementById('pc-activity-sheet-body');
        if (!project || !overlay || !bodyEl) return;
        var data = activityCounts(project);
        var context = contextFor(project);
        var titles = {
            contribution: text('pcContributionTitle', 'Valuable contribution'),
            attention: text('pcAttentionTitle', 'Needs attention'),
            control: text('pcControlTodayTitle', 'Control today'),
            testers: text('pcAllTestersEntry', 'All testers'),
        };
        if (titleEl) titleEl.textContent = titles[sheetState.mode] || '';
        if (tabsEl) tabsEl.hidden = sheetState.mode !== 'testers';
        if (sheetState.mode === 'contribution') {
            bodyEl.innerHTML = contributionSheetHtml(project.id, data.contribution, context);
        } else if (sheetState.mode === 'attention') {
            bodyEl.innerHTML = attentionSheetHtml(project.id, data.attention);
        } else if (sheetState.mode === 'control') {
            bodyEl.innerHTML = compactControlSheetHtml(project.id, data.controlRows, context);
        } else if (sheetState.mode === 'testers') {
            bodyEl.innerHTML = testersSheetHtml(project);
            applyAllTestersTab(sheetState.testersTab || 'state');
        }
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    }

    function applyAllTestersTab(tab) {
        sheetState.testersTab = tab === 'history' ? 'history' : 'state';
        var stateBtn = document.getElementById('pc-activity-tab-state');
        var historyBtn = document.getElementById('pc-activity-tab-history');
        var statePane = document.getElementById('pc-activity-state-pane');
        var historyPane = document.getElementById('pc-activity-history');
        if (stateBtn) stateBtn.classList.toggle('is-active', sheetState.testersTab === 'state');
        if (historyBtn) historyBtn.classList.toggle('is-active', sheetState.testersTab === 'history');
        if (statePane) statePane.hidden = sheetState.testersTab !== 'state';
        if (historyPane) historyPane.hidden = sheetState.testersTab !== 'history';
        if (sheetState.testersTab === 'history' && historyPane && !sheetState.historyLoaded) {
            sheetState.historyLoaded = true;
            historyPane.innerHTML = '<div class="pc-activity-empty">' + esc(text('pcActivityHistoryLoading', 'Loading history…')) + '</div>';
            if (typeof window.renderTestingControlHistoryInto === 'function') {
                window.renderTestingControlHistoryInto(historyPane, sheetState.appId, { archived: false });
            } else if (typeof openTestingControl === 'function') {
                openTestingControl(sheetState.appId, { archived: false });
            }
        }
        if (stateBtn) stateBtn.textContent = text('pcAllTestersStateTab', 'Status');
        if (historyBtn) historyBtn.textContent = text('pcAllTestersHistoryTab', 'History');
    }

    function compactEntryHtml(appId, mode, title, meta, count, tone, extraClass) {
        var countHtml = (count === '' || count == null)
            ? ''
            : '<span class="pc-act-row__count' + (tone ? ' is-' + tone : '') + '">' + esc(String(count)) + '</span>';
        return '<button type="button" class="pc-act-row' + (extraClass ? ' ' + extraClass : '') + '" onclick="event.stopPropagation(); pcOpenActivitySheet(' +
            Number(appId) + ', \'' + mode + '\')">' +
            '<span class="pc-act-row__text">' +
                '<span class="pc-act-row__title">' + esc(title) + (meta ? ' · ' + esc(meta) : '') + '</span>' +
            '</span>' +
            countHtml +
            '<span class="pc-act-row__chev" aria-hidden="true">→</span>' +
        '</button>';
    }

    /* ───────────────────────────── public surface ──────────────────────────── */

    function contextFor(project) {
        var rewardTypesByTester = {};
        (project.likes || []).forEach(function (like) {
            var testerId = Number(like && like.tester_id || 0);
            var type = String(like && like.type || '').toLowerCase();
            if (!testerId) return;
            if (!rewardTypesByTester[testerId]) rewardTypesByTester[testerId] = [];
            if (type && rewardTypesByTester[testerId].indexOf(type) === -1) {
                rewardTypesByTester[testerId].push(type);
            }
        });
        return {
            rewardsLeft: Math.max(0, Number(project.likes_max || 0) - Number(project.likes_used || 0)),
            rewardedTesterIds: (project.likes || []).map(function (like) { return Number(like.tester_id || 0); }),
            rewardTypesByTester: rewardTypesByTester,
        };
    }

    function innerHtml(project) {
        var data = activityCounts(project);
        var prefs = readPrefs(project.id);
        var filter = resolvedFilter(prefs, data);
        var mode = prefs.modes[filter] || 'now';
        if (filter === 'contribution') mode = 'now';
        var context = contextFor(project);
        var errorHtml = data.error
            ? '<div class="pc-today__error">' + esc(text('pcTodayLoadError', "Could not load today's reports")) +
                '<button type="button" onclick="event.stopPropagation(); pcRetryToday(' + Number(project.id) + ')">' +
                esc(text('pcTodayRetry', 'Retry')) + '</button></div>'
            : '';
        return '<section class="pc-activity' + (data.loading ? ' is-hydrating' : '') + '">' +
            '<header class="pc-activity__head">' +
                '<h3 class="pc-activity__title">' + esc(text('pcActivityTitle', 'Testers activity')) + '</h3>' +
            '</header>' +
            filtersHtml(project.id, visibleFilters(data), filter, data) +
            captionHtml(project.id, filter, mode, project) +
            workspaceListHtml(project, filter, mode, data, context) +
            errorHtml +
        '</section>';
    }

    function paint(appId) {
        var safeAppId = Number(appId || 0);
        var root = document.getElementById('pc-today-' + safeAppId);
        var project = projectById(safeAppId);
        if (!root || !project) return;
        if (root.querySelector('.pc-activity')) {
            refreshActivityWorkspace(safeAppId);
        } else {
            root.innerHTML = innerHtml(project);
            afterPaint(safeAppId);
        }
        if (sheetIsOpen() && Number(sheetState.appId) === safeAppId && sheetState.mode !== 'testers') {
            fillActivitySheet();
        }
    }

    function buildSection(project) {
        return '<div class="pc-today" id="pc-today-' + Number(project.id) + '" data-pc-app="' + Number(project.id) + '">' +
            innerHtml(project) +
        '</div>';
    }

    function ensureObserver() {
        if (observer || !('IntersectionObserver' in window)) return;
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (item) {
                if (!item.isIntersecting) return;
                observer.unobserve(item.target);
                hydrate(Number(item.target.getAttribute('data-pc-app') || 0));
            });
        }, { rootMargin: '220px 0px' });
    }

    function mount(cardEl, project) {
        var root = cardEl && cardEl.querySelector('#pc-today-' + Number(project.id));
        if (!root) return;
        // The card is in the document now, so the hidden roster source exists.
        // Re-paint "All / Now" from it — the first innerHtml() ran too early.
        refreshActivityWorkspace(Number(project.id));
        if (!window.App || window.App.testingControlEnabled !== true) return;
        var status = String(project.app_status || project.status || 'active').toLowerCase();
        if (status !== 'active' && status !== 'pending_completion') return;
        var entry = cache.get(Number(project.id));
        if (entry && !entry.loading && !entry.error && (Date.now() - entry.loadedAt) < CACHE_TTL_MS) {
            loadPendingThumbnails(Number(project.id), { scope: '.pc-activity__list' });
            return;
        }
        ensureObserver();
        if (observer) observer.observe(root);
        else hydrate(Number(project.id));
    }

    window.ProjectToday = {
        buildSection: buildSection,
        mount: mount,
        isControlDay: isControlDay,
        invalidate: function (appId) { cache.delete(Number(appId || 0)); },
    };

    window.pcSetActivityFilter = function (appId, filter) {
        var prefs = readPrefs(appId);
        prefs.filter = ACTIVITY_FILTERS.indexOf(filter) !== -1 ? filter : 'testers';
        if (prefs.filter === 'contribution') {
            prefs.modes.contribution = 'now';
        }
        writePrefs(appId, prefs);
        refreshActivityWorkspace(appId);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcToggleActivityHistory = function (appId) {
        var project = projectById(appId);
        var prefs = readPrefs(appId);
        var filter = resolvedFilter(prefs, activityCounts(project || { testers: [] }));
        var next = prefs.modes[filter] === 'history' ? 'now' : 'history';
        window.pcSetActivityMode(appId, next);
    };

    window.pcShowFilterCriteria = function (filter) {
        var message = criteriaForFilter(filter);
        if (typeof showToast === 'function') showToast(message, 4500);
    };

    window.pcSetActivityMode = function (appId, mode) {
        var project = projectById(appId);
        var prefs = readPrefs(appId);
        var filter = resolvedFilter(prefs, activityCounts(project || { testers: [] }));
        prefs.modes[filter] = mode === 'history' ? 'history' : 'now';
        writePrefs(appId, prefs);
        refreshActivityWorkspace(appId);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcOpenActivitySheet = function (appId, mode) {
        sheetState.appId = Number(appId || 0);
        sheetState.mode = String(mode || 'testers');
        sheetState.testersTab = 'state';
        sheetState.historyLoaded = false;
        var overlay = document.getElementById('pc-activity-sheet');
        if (!overlay) return;
        fillActivitySheet();
        overlay.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcCloseActivitySheet = function (event) {
        var overlay = document.getElementById('pc-activity-sheet');
        if (event && event.target !== overlay) return;
        if (overlay) overlay.classList.remove('active');
        sheetState.historyLoaded = false;
        var liveHistory = document.querySelector('[id^="pc-activity-history-"]:not([hidden])');
        if (!liveHistory && typeof window.clearTestingControlHistoryEmbed === 'function') {
            window.clearTestingControlHistoryEmbed();
        }
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    };

    window.pcSetAllTestersTab = function (tab) {
        applyAllTestersTab(tab);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcToggleOthers = function (appId) {
        var safeAppId = Number(appId || 0);
        var opening = !expandedOthers.has(safeAppId);
        if (opening) expandedOthers.add(safeAppId);
        else expandedOthers.delete(safeAppId);
        var root = document.getElementById('pc-today-' + safeAppId);
        var section = root && root.querySelector('.pc-others');
        if (section) {
            section.classList.toggle('is-open', opening);
            var toggle = section.querySelector('.pc-others__toggle');
            if (toggle) toggle.textContent = opening ? text('pcOthersHide', 'Hide') : text('pcOthersShow', 'Show');
            if (opening) loadPendingThumbnails(safeAppId, { scope: '.pc-others' });
        } else {
            paint(safeAppId);
            if (opening) loadPendingThumbnails(safeAppId, { scope: '.pc-others' });
        }
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcRetryToday = function (appId) {
        cache.delete(Number(appId || 0));
        hydrate(appId);
    };

    window.pcOpenFeedback = function (appId, feedbackId) {
        if (typeof openProjectFeedback !== 'function' || Number(feedbackId || 0) <= 0) return;
        openProjectFeedback(Number(appId || 0), false, {
            focusFeedbackId: Number(feedbackId),
            preferUnprocessed: true,
        });
    };

    window.pcRewardTester = function (appId, testerId) {
        if (typeof openKarmaSelectPopup === 'function') openKarmaSelectPopup(Number(appId || 0), Number(testerId || 0));
        else if (typeof openKarmaDistribution === 'function') openKarmaDistribution(Number(appId || 0));
    };

    window.pcRemindTester = function (appId, testerId) {
        var project = projectById(appId);
        var tester = project && (project.testers || []).find(function (item) {
            return Number(item && item.tester_id) === Number(testerId || 0);
        });
        if (!tester || typeof openBellRemindPreview !== 'function') return;
        openBellRemindPreview({
            username: String(tester.username || '').replace(/^@+/, ''),
            fullName: tester.full_name || '',
            avatarUrl: tester.avatar_url || '',
            testerId: Number(tester.tester_id || 0),
            remindAppId: Number(project.id),
            remindAppName: project.name || '',
        });
    };

    window.pcOpenProof = function (appId, proofId, mediaIndex) {
        var row = findRow(appId, proofId);
        if (typeof openCheckinProofPreview !== 'function') return;
        openCheckinProofPreview(Number(proofId || 0), Number(mediaIndex || 0), {
            imageCount: Number(row && row.imageCount || 1),
            title: row ? handleOf(row.tester) : '',
            subtitle: row ? text('pcDayOf', 'Day {day} / {total}', { day: row.day, total: 14 }) : '',
        });
    };
})();
