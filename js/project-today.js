/* Project card — owner's daily dashboard: today's control day and other reports.
   Renders instantly from the /api/projects/{owner_id} payload, then hydrates
   proof details lazily from Testing Control when the block enters the viewport. */
(function () {
    'use strict';

    var MANDATORY_DAYS = [1, 4, 7, 10, 14];
    var CATCHUP_CONTROL_DAYS = [4, 7, 10, 14];
    var MAX_SLOTS = 3;
    var CACHE_TTL_MS = 90000;
    var MAX_TICKET_REQUESTS = 8;
    var MAX_DETAIL_LOOKUPS = 6;
    var PROCESSED_STATUSES = ['accepted', 'approved', 'processed', 'tipped', 'rewarded', 'rejected', 'expired', 'closed', 'resolved', 'done'];
    var FEEDBACK_PROOF_TYPES = ['bug', 'idea', 'play_review'];

    /* appId -> { loadedAt, loading, error, control[], others[], catchupByProgress{} } */
    var cache = new Map();
    var thumbnailCache = new Map();
    var controlReminderStates = new Map();
    var controlReminderSending = new Set();
    var observer = null;
    var expandedOthers = new Set();
    var expandedReceived = new Set();
    var lastSeenReceivedCounts = new Map();
    var sheetState = { appId: 0, mode: '', testersTab: 'state', historyLoaded: false };
    var PREFS_PREFIX = 'pc_activity_prefs_v2_';
    var ACTIVITY_CACHE_PREFIX = 'pc_activity_cache_v2_';
    var ACTIVITY_FILTERS = ['testers', 'contribution', 'attention', 'control'];
    var optimisticFeedbackBustByTester = {};
    if (typeof window !== 'undefined') {
        window._optimisticFeedbackBustByTester = optimisticFeedbackBustByTester;
        if (typeof window.openDossierModal !== 'function') {
            window.openDossierModal = function (username, testerId, appId) {
                console.log('[DOSSIER STUB]', username, testerId, appId);
            };
        }
    }

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

    function isCatchupControlDay(day) {
        return CATCHUP_CONTROL_DAYS.indexOf(Number(day || 0)) !== -1;
    }

    function todayString() {
        return typeof getLocalDate === 'function' ? getLocalDate() : new Date().toISOString().slice(0, 10);
    }

    function thumbKey(proofId, mediaIndex) {
        return Number(proofId || 0) + ':' + Number(mediaIndex || 0);
    }

    function getCacheEntry(appId) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return null;
        if (cache.has(safeId)) return cache.get(safeId);
        try {
            var raw = localStorage.getItem(ACTIVITY_CACHE_PREFIX + safeId);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.control)) {
                if (parsed.date && parsed.date !== todayString()) {
                    parsed.loadedAt = 0;
                }
                cache.set(safeId, parsed);
                (parsed.control || []).concat(parsed.others || []).forEach(function (row) {
                    (row.slots || []).forEach(function (slot) {
                        if (slot && slot.url && slot.proofId) {
                            thumbnailCache.set(thumbKey(slot.proofId, slot.mediaIndex || 0), slot.url);
                        }
                    });
                });
                return parsed;
            }
        } catch (_) {}
        return null;
    }

    function setCacheEntry(appId, entry) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return;
        cache.set(safeId, entry);
        if (!entry || entry.error) return;
        try {
            var toStore = {
                loadedAt: entry.loadedAt || Date.now(),
                control: entry.control || [],
                others: entry.others || [],
                catchupByProgress: entry.catchupByProgress || {},
                date: todayString(),
            };
            localStorage.setItem(ACTIVITY_CACHE_PREFIX + safeId, JSON.stringify(toStore));
        } catch (e) {
            try {
                localStorage.removeItem('market_cache_v1');
                localStorage.removeItem('incoming_offers_cache_v1');
                localStorage.removeItem('guest_projects_cache_v2');
                localStorage.setItem(ACTIVITY_CACHE_PREFIX + safeId, JSON.stringify(toStore));
            } catch (_) {}
        }
    }

    function deleteCacheEntry(appId) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return;
        cache.delete(safeId);
        try {
            localStorage.removeItem(ACTIVITY_CACHE_PREFIX + safeId);
        } catch (_) {}
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

    function catchupStateFor(project, tester) {
        var entry = getCacheEntry(Number(project && project.id || 0));
        if (!entry || !entry.catchupByProgress) return null;
        return entry.catchupByProgress[Number(tester && tester.progress_id || 0)] || null;
    }

    function catchupRequestForDay(catchup, day) {
        var targetDay = Number(day || 0);
        var requests = catchup && Array.isArray(catchup.requests) ? catchup.requests : [];
        for (var index = 0; index < requests.length; index += 1) {
            if (Number(requests[index] && requests[index].missed_testing_day || 0) === targetDay) {
                return requests[index];
            }
        }
        return null;
    }

    function requestedProofLabel(day, requestedAt) {
        var requestTime = Date.parse(String(requestedAt || ''));
        var elapsedDays = Number.isFinite(requestTime)
            ? Math.max(0, Math.floor((Date.now() - requestTime) / 86400000))
            : 0;
        if (elapsedDays <= 0) {
            return text('pcAttentionProofRequestedWaiting', 'Proof for day {day} requested · awaiting', { day: Number(day || 0) });
        }
        return text('pcAttentionProofRequestedAge', 'Proof for day {day} requested · {days} d.', {
            day: Number(day || 0),
            days: elapsedDays,
        });
    }

    function filterControlRows(project, rows) {
        if (!project || project.status === 'pending_completion' || project.app_status === 'pending_completion') {
            return [];
        }
        if (!rows || !rows.length) return rows || [];
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


    window.pcOpenTesterTelegram = function (username) {
        var clean = String(username || '').replace(/^@+/, '').trim();
        if (!clean) return;
        var url = 'https://t.me/' + encodeURIComponent(clean);
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(url);
        } else if (window.tg && typeof window.tg.openTelegramLink === 'function') {
            window.tg.openTelegramLink(url);
        } else {
            window.open(url, '_blank');
        }
    };

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
        topic: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>',
        remind: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>',
        reward: (typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : '<svg viewBox="-40 -40 80 80" aria-hidden="true"><circle r="38" fill="#000000" stroke="#ffffff" stroke-width="2"></circle><path fill="#ffffff" d="M0,38a38,38 0 0 1 0,-76a19,19 0 0 1 0,38a19,19 0 0 0 0,38"></path><circle r="5.5" cy="19" fill="#ffffff"></circle><circle r="5.5" cy="-19" fill="#000000"></circle></svg>'),
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
        direct_invite: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
        tester_left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.09 15.59 11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59ZM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2Z"/></svg>',
        broken_link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 7h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1 0 1.43-.98 2.63-2.31 2.98l1.46 1.46C20.88 15.61 22 13.95 22 12c0-2.76-2.24-5-5-5zm-1 4h-2.19l2 2H16v-2zm-7.6 1H7c-1.71 0-3.1-1.39-3.1-3.1 0-1.59 1.2-2.9 2.74-3.07L4.85 4.04C2.56 4.79 1 6.97 1 9.5 1 12.26 3.24 14.5 6 14.5h4v-1.9H8.4zm-6.04-8.86l1.27-1.27L21.49 19.13l-1.27 1.27-3.23-3.23H13v-1.9h2.09L7.54 7.68 2.36 2.5z"/></svg>',
    };

    function iconAct(kind, label, onclick, opts) {
        opts = opts || {};
        var title = opts.title || label || '';
        var labelHtml = label ? '<span class="pc-iconact__label">' + esc(label) + '</span>' : '';
        if (opts.done) {
            return '<span class="pc-iconact pc-iconact--done" title="' + esc(title) + '">' +
                ICONS.done + labelHtml + '</span>';
        }
        return '<button type="button" class="pc-iconact pc-iconact--' + esc(kind) + '" title="' + esc(title) + '" aria-label="' + esc(title) + '"' +
            ' onclick="event.stopPropagation(); ' + onclick + '">' +
            (ICONS[kind] || '') +
            labelHtml +
            '</button>';
    }

    function getTesterAwardedBust(context, testerId, item) {
        var safeTesterId = Number(testerId || 0);
        if (safeTesterId <= 0) return 0;
        var total = 0;

        if (item && Array.isArray(item.reasons)) {
            item.reasons.forEach(function (reason) {
                if (reason && Number(reason.rewardBust || 0) > 0) {
                    total += Number(reason.rewardBust);
                }
            });
        }

        var feedbackItems = (typeof window !== 'undefined' && Array.isArray(window._activeProjectFeedbackItems))
            ? window._activeProjectFeedbackItems
            : [];
        var activeFeedbackBust = 0;
        feedbackItems.forEach(function (fb) {
            if (Number(fb && fb.tester_id || 0) === safeTesterId) {
                var st = String(fb.status || '').toLowerCase();
                if (st === 'closed' || st === 'accepted' || st === 'processed' || st === 'rewarded') {
                    activeFeedbackBust += Number(fb.reward_bust || 0);
                }
            }
        });

        var optimisticBust = Number(optimisticFeedbackBustByTester[safeTesterId] || 0);

        var rosterBust = 0;
        var project = context && context.project;
        if (project && Array.isArray(project.testers)) {
            var found = project.testers.find(function (t) {
                return Number(t && t.tester_id || 0) === safeTesterId;
            });
            if (found && found.rewards_summary) {
                rosterBust = Number(found.rewards_summary.feedback_bust || found.rewards_summary.total_bust || 0);
            }
        }

        var contextBust = Number(context && context.rewardBustByTester && context.rewardBustByTester[safeTesterId] || 0);
        return Math.max(total, activeFeedbackBust, optimisticBust, rosterBust, contextBust);
    }

    function getTesterBoostBust(context, testerId, item) {
        var safeTesterId = Number(testerId || 0);
        if (safeTesterId <= 0) return 0;

        var proofBoost = 0;
        if (item && Array.isArray(item.reasons)) {
            item.reasons.forEach(function (reason) {
                if (reason && Number(reason.boostBust || 0) > 0) {
                    proofBoost = Math.max(proofBoost, Number(reason.boostBust));
                }
            });
        }
        if (proofBoost > 0) return proofBoost;

        var project = context && context.project;
        var campaign = (project && project.screenshot_boost_campaign) || (context && context.screenshotBoostCampaign) || null;
        if (campaign && (campaign.enabled === true || campaign.is_active === true || campaign.enabled == null)) {
            var campaignReward = Math.max(0, Number(campaign.reward_bust || campaign.bonus_bust || 0));
            if (campaignReward > 0) {
                var hasThreeScreenshots = item && Number(item.screenshotCount || 0) >= 3;
                var hasMediaFeedback = item && Array.isArray(item.reasons) && item.reasons.some(function (r) {
                    return Boolean(r.hasMedia || Number(r.imageCount || 0) > 0);
                });
                if (hasThreeScreenshots || hasMediaFeedback) {
                    return campaignReward;
                }
            }
        }

        var contextBoost = Number(context && context.boostBustByTester && context.boostBustByTester[safeTesterId] || 0);
        return contextBoost;
    }

    function boostRewardBadgeHtml(amount) {
        var val = Number(amount || 0);
        if (val <= 0) return '';
        var title = text('pcBoostRewardBonusTitle', 'Бонус за доп. отчёт: +{amount} $BUST', { amount: val });
        return '<button type="button" class="pc-award-badge pc-award-badge--boost" onclick="event.stopPropagation(); pcShowBoostBonusToast();" title="' + esc(title) + '">' +
            '<span class="pc-award-badge__value">$BUST ' + esc(val) + ' 🎁</span>' +
        '</button>';
    }

    function awardedRewardBadgeHtml(context, testerId, item) {
        var rewards = (context && context.rewardTypesByTester && context.rewardTypesByTester[Number(testerId)]) || [];
        var karmaIcon = typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : '<span class="rewards-icon-glyph">☯</span>';
        var amounts = rewards.map(function (type) {
            if (type === 'good') return '+1.5';
            if (type === 'bug') return '+3.0';
            if (type === 'overtime') return '+2.0';
            return '';
        }).filter(Boolean);
        var amountStr = amounts.length ? amounts.join(' · ') : '+1.5';
        var karmaTitle = text('pcAwardBadgeLabel', 'Награда:') + ' ' + amountStr;
        var karmaHtml = '<span class="pc-award-badge pc-award-badge--karma" title="' + esc(karmaTitle) + '">' +
            karmaIcon +
            '<span class="pc-award-badge__value">' + esc(amountStr) + '</span>' +
        '</span>';

        var ticketBust = getTesterAwardedBust(context, testerId, item);
        var ticketBustHtml = '';
        if (ticketBust > 0) {
            var bustTitle = text('pcTicketRewardTitle', 'Награда за тикет: +{amount} $BUST', { amount: ticketBust });
            ticketBustHtml = '<span class="pc-award-badge pc-award-badge--bust" title="' + esc(bustTitle) + '">' +
                '<span class="pc-award-badge__value">$BUST ' + esc(ticketBust) + '</span>' +
            '</span>';
        }

        return karmaHtml + ticketBustHtml;
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

    function formatDeviceInfo(device) {
        if (!device) return '';
        if (typeof device === 'string') return device.trim();
        var brand = String(device.brand || '').trim();
        var model = String(device.model || '').trim();
        if (brand && model) {
            var brandLower = brand.toLowerCase();
            var modelLower = model.toLowerCase();
            if (modelLower.indexOf(brandLower) === 0) {
                var stripped = model.slice(brand.length).trim();
                if (stripped) {
                    model = stripped;
                }
            }
        }
        var android = String(device.android_version || '').trim();
        if (android) {
            if (!/^android/i.test(android)) {
                android = 'Android ' + android;
            }
        }
        var parts = [];
        if (brand && model && brand.toLowerCase() !== model.toLowerCase()) {
            parts.push(brand);
            parts.push(model);
        } else if (brand || model) {
            parts.push(brand || model);
        }
        if (android) parts.push(android);
        return parts.join(' · ');
    }

    function testerReliabilityLabel(tester) {
        if (!tester) return '';
        var relName = text('metricReliability', 'Reliability');
        if (tester.reliability_status === 'newbie') {
            return relName + ' · ' + text('bountyAppReliabilityNewbieShort', 'Newbie');
        }
        if (tester.reliability_index != null && !isNaN(Number(tester.reliability_index))) {
            var pct = Math.round(Number(tester.reliability_index));
            return relName + ' ' + pct + '%';
        }
        if (tester.total_expected_checkins != null && typeof getDossierReliabilityState === 'function') {
            var relState = getDossierReliabilityState(tester);
            return relState.isNewbie ? relName + ' · ' + text('bountyAppReliabilityNewbieShort', 'Newbie')
                : relName + ' ' + relState.reliabilityPct + '%';
        }
        return relName + ' · ' + workspaceText('нет данных', 'unavailable');
    }

    function formatTesterKarmaAmount(tester) {
        if (!tester || tester.karma == null || tester.karma === '') return '';
        var value = Number(tester.karma);
        if (!Number.isFinite(value)) return '';
        if (typeof formatUiAmount === 'function') return formatUiAmount(value, 1);
        var rounded = Number(value.toFixed(1));
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    }

    function testerKarmaMetaHtml(tester) {
        var amount = formatTesterKarmaAmount(tester);
        if (!amount) return '';
        var icon = typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : '☯️';
        return '<span class="pc-person__karma" title="' + esc(text('dossierKarma', 'Karma: {karma}', { karma: amount })) + '">' +
            icon + '<span>' + esc(amount) + '</span></span>';
    }

    function skipsLabel(count) {
        var n = Number(count || 0);
        var mod10 = n % 10;
        var mod100 = n % 100;
        var key = 'pcAttentionSkips';
        if (mod100 >= 11 && mod100 <= 19) {
            key = 'pcAttentionSkipsMany';
        } else if (mod10 === 1) {
            key = 'pcAttentionSkipsOne';
        } else if (mod10 >= 2 && mod10 <= 4) {
            key = 'pcAttentionSkipsFew';
        } else {
            key = 'pcAttentionSkipsMany';
        }
        return text(key, '{count} consecutive skips', { count: n });
    }

    function isTesterRemindedToday(appId, testerId) {
        try {
            var key = 'pc_control_reminded_' + Number(appId) + '_' + todayString();
            var val = localStorage.getItem(key);
            var list = val ? JSON.parse(val) : [];
            return Array.isArray(list) && list.indexOf(Number(testerId)) !== -1;
        } catch (_) {
            return false;
        }
    }

    function markTesterRemindedToday(appId, testerId) {
        try {
            var key = 'pc_control_reminded_' + Number(appId) + '_' + todayString();
            var val = localStorage.getItem(key);
            var list = val ? JSON.parse(val) : [];
            if (!Array.isArray(list)) list = [];
            if (list.indexOf(Number(testerId)) === -1) {
                list.push(Number(testerId));
                localStorage.setItem(key, JSON.stringify(list));
            }
        } catch (_) {}
    }

    function isMutualOfferPending(testerId) {
        var idStr = String(testerId || '');
        if (typeof _blockedOfferProjectsByOwner !== 'undefined' && _blockedOfferProjectsByOwner && _blockedOfferProjectsByOwner[idStr]) {
            return true;
        }
        if (Array.isArray(window.myOffers)) {
            var found = window.myOffers.some(function (o) {
                var pId = Number(o.responder_id || o.target_id || o.partner_id || 0);
                return pId === Number(testerId) && (o.status === 'pending' || o.status === 'sent');
            });
            if (found) return true;
        }
        return false;
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
        if (codes.not_opened || codes.direct_invite) return 'sky';
        return 'neutral';
    }

    /**
     * Status-dot is a visual summary of already-known states, not new logic.
     * sky = waiting / expected action; amber = stalling risk; green = done.
     */
    function personRowHtml(opts) {
        var tester = opts.tester || {};
        var project = projectById(opts.appId);
        var testerId = Number(tester.tester_id || tester.id || 0);
        var rosterTester = ((project && project.testers) || []).find(function (person) {
            return Number(person.tester_id || person.id || 0) === testerId;
        });
        tester = Object.assign({}, rosterTester || {}, tester);
        var fullName = String(tester.full_name || tester.name || '').trim();
        var tone = opts.tone || 'neutral';
        var extra = opts.extraHtml || '';
        var identityAvatar = window.ProjectActivityRows
            ? window.ProjectActivityRows.avatarHtml(tester, projectById(opts.appId))
            : '<span class="pc-person__avatar">' + avatarHtml(tester) + '</span>';
        var stateCls = opts.received ? ' is-received' : (opts.waiting ? ' is-waiting' : '');
        var rowCls = opts.rowClass ? ' ' + String(opts.rowClass) : '';
        var timeAgoHtml = opts.timeAgoText
            ? '<span class="pc-person__time-ago">' + esc(opts.timeAgoText) + '</span>'
            : '';
        var rawUsername = String(tester.username || '').trim().replace(/^@+/, '');
        var nameHtml = '';
        // Activity tabs keep the identity compact: the first tap reveals the
        // Telegram handle, and only the second tap (on that handle) opens DM.
        // A username is also the fallback primary label for legacy profiles
        // that have not supplied a Telegram full name yet.
        var primaryName = fullName || rawUsername || handleOf(tester);
        if (rawUsername) {
            nameHtml = '<span class="pc-person__identity">' +
                '<button type="button" class="pc-person__fullname pc-person__fullname-main pc-person__fullname--reveal" ' +
                    'onclick="window.pcRevealTesterNickname(this, event)" aria-expanded="false">' + esc(primaryName) + '</button>' +
                '<button type="button" class="pc-person__handle pc-person__handle--link pc-person__handle--reveal" ' +
                    'onclick="event.stopPropagation(); window.pcOpenTesterTelegram(\'' + esc(rawUsername) + '\')" ' +
                    'title="Написать в Telegram" tabindex="-1">@' + esc(rawUsername) + '</button>' +
                timeAgoHtml +
                (opts.nameSuffixHtml || '') +
            '</span>';
            timeAgoHtml = '';
        } else {
            nameHtml = '<span class="pc-person__fullname pc-person__fullname-main">' + esc(primaryName) + '</span>';
            if (opts.nameSuffixHtml) {
                nameHtml += opts.nameSuffixHtml;
            }
        }

        if (timeAgoHtml) {
            nameHtml += timeAgoHtml;
        }

        return '<li class="pc-person is-' + esc(tone) + stateCls + rowCls + '"' +
            ' onclick="' + dossierClick(opts.appId, tester) + '">' +
            '<div class="pc-person__top">' +
                identityAvatar +
                '<div class="pc-person__copy">' +
                    '<span class="pc-person__name notranslate">' + nameHtml + '</span>' +
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

    function cachedThumb(proofId, mediaIndex) {
        return thumbnailCache.get(thumbKey(proofId, mediaIndex)) || '';
    }

    function rememberThumb(proofId, mediaIndex, url, appId) {
        var value = String(url || '').trim();
        if (!value) return;
        thumbnailCache.set(thumbKey(proofId, mediaIndex), value);
        var entry = getCacheEntry(Number(appId || 0));
        if (!entry) return;
        var touched = false;
        [entry.control, entry.others].forEach(function (rows) {
            (rows || []).forEach(function (row) {
                (row.slots || []).forEach(function (slot) {
                    if (Number(slot.proofId) === Number(proofId) && Number(slot.mediaIndex) === Number(mediaIndex)) {
                        slot.url = value;
                        touched = true;
                    }
                });
            });
        });
        if (touched) setCacheEntry(Number(appId || 0), entry);
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

    function resolveCachedFeedbackRejection(feedbackId) {
        var fid = Number(feedbackId || 0);
        if (fid <= 0) return '';
        try {
            var items = (typeof _activeProjectFeedbackItems !== 'undefined' && Array.isArray(_activeProjectFeedbackItems))
                ? _activeProjectFeedbackItems
                : (window._activeProjectFeedbackItems || []);
            var found = items.find(function(it) {
                return Number(it && (it.id || it.feedback_id) || 0) === fid;
            });
            if (found) {
                return String(found.rejection_reason || found.reject_reason || found.decline_reason || '').trim();
            }
        } catch (e) {}
        return '';
    }

    function buildProofRow(item, proof, thumbnailByProofId) {
        var isScreenshot = String(proof && proof.type || '') === 'screenshot';
        var hasProofMedia = Boolean(proof && (proof.has_media || (proof.image_count && Number(proof.image_count) > 0) || (proof.feedback && proof.feedback.has_media)));
        var totalImages = isScreenshot
            ? Math.max(1, Math.min(5, Number(proof.image_count || 1)))
            : (hasProofMedia ? Math.max(1, Number(proof && proof.image_count || 1)) : 0);
        var proofFb = proof && proof.feedback;
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
            feedbackStatus: String(proofFb && (proofFb.status || proofFb.feedback_status) || (proof && proof.feedback_status) || '').toLowerCase(),
            hasMedia: hasProofMedia,
            feedbackText: String(proofFb && (proofFb.message_text || proofFb.text || proofFb.summary || proofFb.title) || ''),
            rewardBust: Number(proofFb && (proofFb.reward_bust || proofFb.rewardBust) || (proof && proof.reward_bust) || 0),
            rewardKarma: Number(proofFb && (proofFb.reward_karma || proofFb.rewardKarma) || (proof && proof.reward_karma) || 0),
            boostBust: Number(proof && (proof.boost_bust || proof.screenshot_boost_bust || proof.bonus_bust) || 0),
            rejectionReason: String(
                proofFb && (proofFb.rejection_reason || proofFb.reject_reason || proofFb.decline_reason)
                || (proof && (proof.rejection_reason || proof.reject_reason))
                || resolveCachedFeedbackRejection(proof && proof.source_feedback_id)
                || ''
            ).trim(),
            slots: buildSlots(proof, thumbnailByProofId),
        };
    }

    function buildRow(item, thumbnailByProofId) {
        var entry = todayEntryFor(item);
        var state = String(entry && entry.state || '');
        var checked = state === 'checked' || state === 'checked_overtime' || state === 'external_checked';
        var proof = checked && entry.proof && entry.proof.type !== 'legacy' ? entry.proof : null;
        var isScreenshot = String(proof && proof.type || '') === 'screenshot';
        var hasProofMedia = Boolean(proof && (proof.has_media || (proof.image_count && Number(proof.image_count) > 0) || (proof.feedback && proof.feedback.has_media)));
        var totalImages = isScreenshot
            ? Math.max(1, Math.min(5, Number(proof.image_count || 1)))
            : (hasProofMedia ? Math.max(1, Number(proof && proof.image_count || 1)) : 0);
        var proofFb = proof && proof.feedback;
        return {
            progressId: Number(item.progress_id || 0),
            testerId: Number(item.tester && item.tester.id || 0),
            tester: item.tester || {},
            day: Number(item.current_day || 0),
            device: item.device || null,
            received: !!checked,
            proofId: Number(proof && proof.id || 0),
            proofType: String(proof && proof.type || ''),
            createdAt: String(proof && proof.created_at || ''),
            imageCount: totalImages,
            feedbackId: Number(proof && proof.source_feedback_id || 0),
            feedbackStatus: String(proofFb && (proofFb.status || proofFb.feedback_status) || (proof && proof.feedback_status) || '').toLowerCase(),
            hasMedia: hasProofMedia,
            feedbackText: String(proofFb && (proofFb.message_text || proofFb.text || proofFb.summary || proofFb.title) || ''),
            rewardBust: Number(proofFb && (proofFb.reward_bust || proofFb.rewardBust) || (proof && proof.reward_bust) || 0),
            rewardKarma: Number(proofFb && (proofFb.reward_karma || proofFb.rewardKarma) || (proof && proof.reward_karma) || 0),
            boostBust: Number(proof && (proof.boost_bust || proof.screenshot_boost_bust || proof.bonus_bust) || 0),
            rejectionReason: String(
                proofFb && (proofFb.rejection_reason || proofFb.reject_reason || proofFb.decline_reason)
                || (proof && (proof.rejection_reason || proof.reject_reason))
                || resolveCachedFeedbackRejection(proof && proof.source_feedback_id)
                || ''
            ).trim(),
            rewardsSummary: item.rewards_summary || (item.tester && item.tester.rewards_summary) || null,
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
                var fb = proof && proof.feedback;
                if (fb && fb.status) {
                    row.feedbackStatus = String(fb.status).toLowerCase();
                }
                if (fb) {
                    if (fb.has_media != null) row.hasMedia = Boolean(fb.has_media);
                    if (fb.reward_bust != null) row.rewardBust = Number(fb.reward_bust);
                    if (fb.reward_karma != null) row.rewardKarma = Number(fb.reward_karma);
                    row.feedbackText = String(fb.message_text || fb.text || fb.summary || fb.title || '').replace(/\s+/g, ' ').trim();
                    if (fb.rejection_reason || fb.reject_reason || fb.decline_reason) {
                        row.rejectionReason = String(fb.rejection_reason || fb.reject_reason || fb.decline_reason).trim();
                    }
                }
                if (proof && proof.image_count != null) {
                    row.imageCount = Number(proof.image_count);
                    if (row.imageCount > 0) row.hasMedia = true;
                }
                if (proof && proof.boost_bust != null) {
                    row.boostBust = Number(proof.boost_bust);
                }
                row.feedbackTitle = String(
                    (fb && (fb.title || fb.summary || fb.text || fb.message_text)) || ''
                ).replace(/\s+/g, ' ').trim().slice(0, 80);
            } catch (_) {
                // Preserve existing row properties
            }
        }));
    }

    async function hydrate(appId) {
        var safeAppId = Number(appId || 0);
        var current = getCacheEntry(safeAppId);
        if (current && current.loading) return;
        if (current && !current.error && (Date.now() - current.loadedAt) < CACHE_TTL_MS) return;
        var previous = current && !current.error ? current : null;
        cache.set(safeAppId, {
            loadedAt: previous ? previous.loadedAt : 0,
            loading: true,
            error: false,
            control: previous ? previous.control : [],
            others: previous ? previous.others : [],
            catchupByProgress: previous ? previous.catchupByProgress : {},
        });
        if (!previous) {
            try {
                paint(safeAppId);
            } catch (error) {
                console.warn('Project today paint failed:', error);
            }
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
                var catchupByProgress = {};
                var seenOtherProofIds = {};
                var project = projectById(safeAppId);
                (results[0].items || []).forEach(function (item) {
                    catchupByProgress[Number(item.progress_id || 0)] = {
                        requestableMissedDay: Number(item.catchup_proof && item.catchup_proof.requestable_missed_day || 0),
                        requestedDays: Array.isArray(item.catchup_proof && item.catchup_proof.requested_days)
                            ? item.catchup_proof.requested_days.map(Number)
                            : (Array.isArray(item.catchup_proof && item.catchup_proof.pending_days)
                                ? item.catchup_proof.pending_days.map(Number)
                                : []),
                        requests: Array.isArray(item.catchup_proof && item.catchup_proof.requests)
                            ? item.catchup_proof.requests
                            : [],
                        states: item.catchup_proof && typeof item.catchup_proof.states === 'object'
                            ? item.catchup_proof.states
                            : {},
                    };
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
            var contentChanged = !previous
                || JSON.stringify(previous.control || []) !== JSON.stringify(control)
                || JSON.stringify(previous.others || []) !== JSON.stringify(others)
                || JSON.stringify(previous.catchupByProgress || {}) !== JSON.stringify(catchupByProgress);
            setCacheEntry(safeAppId, {
                loadedAt: Date.now(), loading: false, error: false,
                control: control, others: others, catchupByProgress: catchupByProgress,
            });
            if (contentChanged) paint(safeAppId);
        } catch (error) {
            console.warn('Project today hydration failed:', error);
            cache.set(safeAppId, previous
                ? {
                    loadedAt: previous.loadedAt,
                    loading: false,
                    error: false,
                    control: previous.control || [],
                    others: previous.others || [],
                    catchupByProgress: previous.catchupByProgress || {},
                }
                : { loadedAt: Date.now(), loading: false, error: true, control: [], others: [] });
            if (!previous) paint(safeAppId);
        }
        loadPendingThumbnails(safeAppId);
    }

    function findRow(appId, proofId) {
        var entry = getCacheEntry(Number(appId || 0));
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
        if (!row) return false;
        var st = String(row.feedbackStatus || row.status || '').toLowerCase();
        if (st && PROCESSED_STATUSES.indexOf(st) !== -1) return true;
        if (Number(row.rewardBust || row.reward_bust || 0) > 0 || Number(row.rewardKarma || row.reward_karma || 0) > 0) {
            return true;
        }
        return false;
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

    function activityCardHtml(appId, item, opts) {
        opts = opts || {};
        var safeAppId = Number(appId || 0);
        var type = String(item && (item.kind || item.proofType) || '');
        if (type === 'screenshots') type = 'screenshot';
        if (!type && item && item.proofId > 0) type = 'screenshot';
        var proofId = Number(item && item.proofId || 0);
        var feedbackId = Number(item && item.feedbackId || 0);
        var imageCount = Number(item && item.imageCount || 0);
        var hasMedia = item && item.hasMedia != null ? Boolean(item.hasMedia) : (type === 'screenshot' ? imageCount > 0 : false);

        var iconSvg = ICONS.image;
        var iconMod = 'screenshot';
        var subBadgeHtml = '';

        if (type === 'bug') {
            iconSvg = CONTRIBUTION_ICONS.bug;
            iconMod = 'bug';
            if (hasMedia) {
                subBadgeHtml = '<span class="pc-proof-album-launch__sub-badge" aria-hidden="true">' + ICONS.image + '</span>';
            }
        } else if (type === 'idea') {
            iconSvg = CONTRIBUTION_ICONS.idea;
            iconMod = 'idea';
            if (hasMedia) {
                subBadgeHtml = '<span class="pc-proof-album-launch__sub-badge" aria-hidden="true">' + ICONS.image + '</span>';
            }
        } else if (type === 'play_review') {
            iconSvg = CONTRIBUTION_ICONS.play_review;
            iconMod = 'play_review';
        } else {
            iconSvg = ICONS.image;
            iconMod = 'screenshot';
            if (imageCount > 1) {
                subBadgeHtml = '<b>' + imageCount + '</b>';
            }
        }

        var title = '';
        if (type === 'bug') {
            title = text('pcBugDetected', 'Обнаружен баг');
        } else if (type === 'idea') {
            title = text('pcContributionIdea', 'Рекомендация');
        } else if (type === 'play_review') {
            title = text('pcProofReview', 'Отзыв');
        } else {
            title = imageCount > 1
                ? text('pcScreenshotSet', 'Серия скриншотов')
                : text('pcScreenshotSingle', 'Скриншот');
        }

        var subtitle = '';
        if (type === 'screenshot') {
            subtitle = text('pcProofAlbumOverview', 'Quick overview of all images');
        } else {
            var rawText = String(item && (item.feedbackText || item.feedbackTitle || item.label || '')).trim();
            if (rawText === text('pcProofBug', 'Bug') || rawText === text('pcContributionIdea', 'Recommendation') || rawText === text('pcProofReview', 'Review')) {
                rawText = '';
            }
            if (rawText) {
                subtitle = rawText.length > 90 ? (rawText.slice(0, 87) + '...') : rawText;
            } else {
                if (type === 'bug') subtitle = text('pcBugDetailsHint', 'Нажмите для обработки бага');
                else if (type === 'idea') subtitle = text('pcIdeaDetailsHint', 'Нажмите для обработки рекомендации');
                else if (type === 'play_review') subtitle = text('pcReviewDetailsHint', 'Нажмите для просмотра отзыва');
                else subtitle = text('pcProofAlbumOverview', 'Quick overview of all images');
            }
        }

        var itemKarma = Number(item && (item.rewardKarma || item.reward_karma) || 0);
        var itemBust = Number(item && (item.rewardBust || item.reward_bust) || 0);
        if (feedbackId > 0 && (!itemKarma || !itemBust) && Array.isArray(window._activeProjectFeedbackItems)) {
            var fbMatch = window._activeProjectFeedbackItems.find(function (f) {
                return Number(f && f.id) === feedbackId;
            });
            if (fbMatch) {
                if (!itemKarma && Number(fbMatch.reward_karma || 0) > 0) itemKarma = Number(fbMatch.reward_karma);
                if (!itemBust && Number(fbMatch.reward_bust || 0) > 0) itemBust = Number(fbMatch.reward_bust);
            }
        }
        var targetTesterId = Number((item && item.testerId) || (opts && opts.testerId) || 0);
        // A reward belongs to one feedback record, not to every later report
        // from the same tester. Do not infer it from the tester's reward history:
        // that showed yesterday's reward on today's new ticket.

        var boostBust = Number(item && (item.boostBust || item.boost_bust) || 0);
        if (!boostBust && targetTesterId > 0 && opts && opts.context) {
            var testerBoost = getTesterBoostBust(opts.context, targetTesterId, opts.item || { reasons: opts.reasons });
            if (testerBoost > 0) {
                var hasTicketWithBust = Array.isArray(opts && opts.reasons) && opts.reasons.some(function (r) {
                    var rType = String(r && (r.kind || r.proofType) || '');
                    var rFbId = Number(r && (r.feedbackId || (r.feedback && r.feedback.id)) || 0);
                    var rBust = Number(r && (r.rewardBust || r.reward_bust) || 0);
                    return (rType === 'bug' || rType === 'idea' || rFbId > 0) && rBust > 0;
                });
                if (itemBust > 0) {
                    boostBust = testerBoost;
                } else if (!hasTicketWithBust && type === 'screenshot') {
                    boostBust = testerBoost;
                }
            }
        }

        var mainClick = '';
        if (feedbackId > 0) {
            mainClick = 'pcOpenFeedback(' + safeAppId + ',' + feedbackId + ')';
        } else if (proofId > 0) {
            mainClick = 'pcOpenProofOverview(' + safeAppId + ',' + proofId + (imageCount ? ',' + imageCount : '') + ')';
        }

        var feedbackStatus = String(item && (item.feedbackStatus || item.status) || '').toLowerCase();
        var isRejected = feedbackStatus === 'rejected';
        var rejectionReason = String(item && (item.rejectionReason || item.rejection_reason || item.reject_reason || item.decline_reason) || '').trim();
        if ((!rejectionReason || !isRejected) && feedbackId > 0 && Array.isArray(window._activeProjectFeedbackItems)) {
            var fbMatch = window._activeProjectFeedbackItems.find(function (f) {
                return Number(f && f.id) === feedbackId;
            });
            if (fbMatch) {
                if (!isRejected && String(fbMatch.status || '').toLowerCase() === 'rejected') {
                    isRejected = true;
                }
                if (!rejectionReason) {
                    rejectionReason = String(fbMatch.rejection_reason || fbMatch.reject_reason || fbMatch.decline_reason || '').trim();
                }
            }
        }

        var awardsRowHtml = '';
        if (isRejected) {
            var rReason = typeof resolveFeedbackRejectReasonLabel === 'function'
                ? resolveFeedbackRejectReasonLabel(rejectionReason)
                : (rejectionReason || '');
            var rejectText = text('projectFeedbackRejectedBadge', 'Отклонён');
            var chipLabel = rReason ? ('❌ ' + rejectText + ': ' + rReason) : ('❌ ' + rejectText);
            var badgeContentHtml = rReason
                ? '<span class="pc-award-badge__label">❌ ' + esc(rejectText) + ':</span> <span class="pc-award-badge__reason">' + esc(rReason) + '</span>'
                : '<span class="pc-award-badge__label">❌ ' + esc(rejectText) + '</span>';
            awardsRowHtml = '<div class="pc-proof-album-card__awards-row pc-proof-album-card__awards-row--rejected"' +
                (mainClick ? ' onclick="event.stopPropagation(); ' + mainClick + '"' : '') +
                '>' +
                '<span class="pc-award-badge pc-award-badge--rejected" title="' + esc(chipLabel) + '">' +
                    badgeContentHtml +
                '</span>' +
            '</div>';
        } else if (itemKarma > 0 || itemBust > 0 || boostBust > 0) {
            var kBadge = '';
            if (itemKarma > 0) {
                var kVal = '+' + (itemKarma % 1 === 0 ? itemKarma.toFixed(1) : itemKarma.toFixed(1));
                var kTitle = text('pcAwardBadgeLabel', 'Награда:') + ' ' + kVal;
                var kIcon = typeof window.karmaIconHtml === 'function'
                    ? window.karmaIconHtml('karma-yin-icon--inline')
                    : '<span class="rewards-icon-glyph">☯</span>';
                kBadge = '<span class="pc-award-badge pc-award-badge--karma" title="' + esc(kTitle) + '">' +
                    kIcon +
                    '<span class="pc-award-badge__value">' + esc(kVal) + '</span>' +
                '</span>';
            }
            var bBadge = '';
            if (boostBust > 0 && itemBust > 0) {
                var bTitle = text('pcTicketRewardTitle', 'Награда за тикет: +{amount} $BUST', { amount: itemBust }) +
                    ' | ' + text('pcBoostRewardBonusTitle', 'Бонус за доп. отчёт: +{amount} $BUST', { amount: boostBust });
                bBadge = '<button type="button" class="pc-award-badge pc-award-badge--bust" onclick="event.stopPropagation(); pcShowBoostBonusToast();" title="' + esc(bTitle) + '">' +
                    '<span class="pc-award-badge__value">$BUST ' + esc(itemBust) + ' +' + esc(boostBust) + '🎁</span>' +
                '</button>';
            } else if (boostBust > 0) {
                var bTitle = text('pcBoostRewardBonusTitle', 'Бонус за доп. отчёт: +{amount} $BUST', { amount: boostBust });
                bBadge = '<button type="button" class="pc-award-badge pc-award-badge--bust" onclick="event.stopPropagation(); pcShowBoostBonusToast();" title="' + esc(bTitle) + '">' +
                    '<span class="pc-award-badge__value">$BUST ' + esc(boostBust) + ' 🎁</span>' +
                '</button>';
            } else if (itemBust > 0) {
                var bTitle = text('pcTicketRewardTitle', 'Награда за тикет: +{amount} $BUST', { amount: itemBust });
                bBadge = '<span class="pc-award-badge pc-award-badge--bust" title="' + esc(bTitle) + '">' +
                    '<span class="pc-award-badge__value">$BUST ' + esc(itemBust) + '</span>' +
                '</span>';
            }
            awardsRowHtml = '<div class="pc-proof-album-card__awards-row"' +
                (mainClick ? ' onclick="event.stopPropagation(); ' + mainClick + '"' : '') +
                '>' + kBadge + bBadge + '</div>';
        }

        var topHtml = '<button type="button" class="pc-proof-album-card__main" onclick="event.stopPropagation(); ' + mainClick + '">' +
            '<span class="pc-proof-album-launch__icon pc-proof-album-launch__icon--' + esc(iconMod) + '" aria-hidden="true">' +
                iconSvg +
                subBadgeHtml +
            '</span>' +
            '<span class="pc-proof-album-card__info">' +
                '<strong>' + esc(title) + '</strong>' +
                '<small>' + esc(subtitle) + '</small>' +
            '</span>' +
            '<span class="pc-proof-album-card__chev" aria-hidden="true">›</span>' +
        '</button>';

        var bottomHtml = '';
        if (type !== 'play_review' && proofId > 0) {
            var verbText = text('pcProofOpenVerb', 'Открыть');
            var targetText = text('pcProofOpenTopicTail', 'в топике');
            bottomHtml = '<div class="pc-proof-album-card__divider" aria-hidden="true"></div>' +
                '<button type="button" class="pc-proof-album-card__topic-btn" onclick="event.stopPropagation(); openCheckinProofOriginal(' + proofId + ',0,event)">' +
                    ICONS.topic +
                    '<span class="pc-proof-album-card__topic-label">' +
                        '<span class="pc-proof-album-card__topic-verb">' + esc(verbText) + '</span> ' +
                        '<span class="pc-proof-album-card__topic-target">' + esc(targetText) + '</span>' +
                    '</span>' +
                '</button>';
        }

        return '<div class="pc-proof-album-card pc-proof-album-launch pc-proof-album-card--' + esc(iconMod) + '">' +
            topHtml +
            awardsRowHtml +
            bottomHtml +
        '</div>';
    }

    var sessionReviewedItems = new Set();

    function isItemActionDone(item) {
        if (!item) return false;
        var type = String(item.kind || item.proofType || '');
        if (type === 'screenshots') type = 'screenshot';
        if (type === 'screenshot') {
            return true;
        }
        var feedbackId = Number(item.feedbackId || item.source_feedback_id || (item.feedback && item.feedback.id) || 0);
        if (feedbackId > 0 && sessionReviewedItems.has('fb:' + feedbackId)) {
            return true;
        }
        if (item.proofId > 0 && sessionReviewedItems.has('proof:' + item.proofId)) {
            return true;
        }
        return isProcessed(item);
    }

    function activityTimelineHtml(appId, items, opts) {
        opts = opts || {};
        var list = Array.isArray(items) ? items : [items];
        list = list.filter(Boolean);
        if (!list.length) return '';
        var stepOpts = Object.assign({}, opts, { reasons: opts.reasons || list });
        var stepsHtml = list.map(function (item) {
            var type = String(item && (item.kind || item.proofType) || '');
            if (type === 'screenshots') type = 'screenshot';
            if (!type && item && item.proofId > 0) type = 'screenshot';
            if (!type) type = 'screenshot';
            var isDone = isItemActionDone(item);
            var cardHtml = activityCardHtml(appId, item, stepOpts);
            var nodeIcon = isDone
                ? '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                : '';
            return '<div class="pc-activity-timeline-step pc-activity-timeline-step--' + esc(type) +
                (isDone ? ' is-completed' : ' is-pending') + '">' +
                '<span class="pc-activity-timeline-node" aria-hidden="true">' + nodeIcon + '</span>' +
                cardHtml +
            '</div>';
        }).join('');

        return '<div class="pc-contribution-cards pc-activity-timeline-group">' + stepsHtml + '</div>';
    }

    function controlActionsHtml(appId, row, context) {
        var html = '';
        if (!row.received) {
            return iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(row.testerId) + ', \'control\', { day: ' + Number(row.day || 0) + ' })');
        }
        if (row.proofId <= 0 && row.feedbackId > 0 && !isProcessed(row)) {
            html += iconAct('process', '',
                'pcOpenFeedback(' + Number(appId) + ',' + Number(row.feedbackId) + ')',
                { title: text('pcProcessBtn', 'Process') });
        }
        return html;
    }

    function controlRowHtml(appId, row, context) {
        var devText = formatDeviceInfo(row.device);
        var meta = '';
        if (devText) {
            meta += '<span class="pc-person__device">' + esc(devText) + '</span>';
        }
        var dayNum = Number(row && row.day || 0);
        var dayHtml = '';
        if (dayNum > 0) {
            var dayClass = 'pc-person__day pc-person__day--control is-control-accent';
            dayHtml = '<span class="' + dayClass + '">' +
                esc(text('testingControlCurrentDay', 'Day {day}', { day: dayNum })) +
            '</span>';
        }
        var typeLabel = row.received ? proofTypeLabel(row.proofType) : '';
        if (typeLabel) {
            meta += (meta ? ' ' : '') + '<span class="pc-tag pc-tag--' + esc(row.proofType) + '">' + esc(typeLabel) + '</span>';
        }
        var receipts = controlReminderStates.get(Number(appId));
        var receipt = receipts && (receipts.items || []).find(function(item) {
            return Number(item.tester_id) === Number(row.testerId) && Number(item.day) === dayNum;
        });
        if (!row.received && receipt && receipt.status !== 'ready' && receipt.status !== 'sent') {
            meta += '<span class="pc-reminder-receipt is-unavailable">' +
                esc(text(receipt.status === 'reserved' || receipt.status === 'uncertain' ? 'pcReminderUnconfirmed' : 'pcReminderUnavailable', 'Delivery unavailable')) + '</span>';
        }
        if (!row.received && receipt && receipt.personal_dm_opened_at) {
            meta += '<span class="pc-reminder-receipt is-personal">' +
                esc(text('pcReminderPersonalOpenedAt', 'Personal DM opened in Telegram at {time}', { time: reminderTime(receipt.personal_dm_opened_at) })) +
            '</span>';
        }
        var extraHtml = '';
        if (row.received && row.proofId > 0) {
            extraHtml = activityTimelineHtml(appId, [row]);
        }
        return personRowHtml({
            appId: appId,
            tester: row.tester,
            tone: row.received ? 'green' : 'sky',
            received: !!row.received,
            waiting: !row.received,
            metaHtml: meta,
            nameSuffixHtml: dayHtml,
            actionsHtml: controlActionsHtml(appId, row, context),
            extraHtml: extraHtml,
        });
    }

    /* ───────────────────────── control block rendering ─────────────────────── */

    function fallbackControlRows(project) {
        if (!project || project.status === 'pending_completion' || project.app_status === 'pending_completion') {
            return [];
        }
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
                device: tester.device || null,
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

    // Same source order as the roster day badge in ui-projects.js:
    // exchange_state.left.metrics.testing_days → tester.testing_days → start_date.
    var TESTING_CYCLE_DAYS = 14;

    function testerDayNumber(tester) {
        var exchange = tester && tester.exchange_state && Number(tester.exchange_state.version || 0) >= 1
            ? tester.exchange_state
            : null;
        var metrics = exchange && exchange.left && exchange.left.metrics || null;
        if (metrics && Number(metrics.testing_days || 0) > 0) {
            return Number(metrics.testing_days);
        }
        var day = Number(tester && tester.testing_days || 0);
        if (day > 0) return day;
        if (tester && tester.start_date && typeof getUserTestingDay === 'function') {
            return Number(getUserTestingDay(tester.start_date, tester.testing_days) || 0);
        }
        return 0;
    }

    function testerDaysRemaining(tester) {
        return Math.max(0, TESTING_CYCLE_DAYS - testerDayNumber(tester));
    }

    function daysSince(date) {
        if (!date || !Number.isFinite(date.getTime())) return null;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var then = new Date(date.getTime());
        then.setHours(0, 0, 0, 0);
        return Math.round((today.getTime() - then.getTime()) / 86400000);
    }

    function dossierUsername(tester) {
        return String(tester && tester.username || '').trim().replace(/^@+/, '');
    }

    function isValuableRow(row) {
        var type = String(row && row.proofType || '');
        if (FEEDBACK_PROOF_TYPES.indexOf(type) !== -1) return true;
        return type === 'screenshot' && Number(row.imageCount || 0) >= 3;
    }

    function collectContribution(control, others, project) {
        var byTester = {};
        var order = [];
        (control || []).concat(others || []).forEach(function (row) {
            if (!isValuableRow(row)) return;
            var testerId = Number(row.testerId || 0);
            if (testerId <= 0) return;
            if (!byTester[testerId]) {
                var rosterTester = null;
                if (project && Array.isArray(project.testers)) {
                    rosterTester = project.testers.find(function (t) {
                        return Number(t && (t.tester_id || t.id) || 0) === testerId;
                    });
                }
                var cachedProfile = (typeof _dossierProfilesCache !== 'undefined' && _dossierProfilesCache && _dossierProfilesCache[String(testerId)]) || null;
                var testerObj = Object.assign({}, cachedProfile || {}, rosterTester || {}, row.tester || {});
                byTester[testerId] = {
                    testerId: testerId,
                    tester: testerObj,
                    screenshotCount: 0,
                    screenshotSeriesCount: 0,
                    screenshotRow: null,
                    bug: null,
                    idea: null,
                    play_review: null,
                    latestCreatedAt: row.createdAt || (row.tester && row.tester.last_check_date) || (rosterTester && rosterTester.last_check_date) || '',
                };
                order.push(testerId);
            }
            var item = byTester[testerId];
            if (row.createdAt) {
                if (!item.latestCreatedAt || new Date(row.createdAt) > new Date(item.latestCreatedAt)) {
                    item.latestCreatedAt = row.createdAt;
                }
            } else if (row.tester && row.tester.last_check_date) {
                if (!item.latestCreatedAt || new Date(row.tester.last_check_date) > new Date(item.latestCreatedAt)) {
                    item.latestCreatedAt = row.tester.last_check_date;
                }
            }
            if (row.proofType === 'screenshot') {
                if (Number(row.imageCount || 0) >= 3) {
                    item.screenshotSeriesCount = (item.screenshotSeriesCount || 0) + 1;
                }
                if (Number(row.screenshotSeriesCount || 0) > 0) {
                    item.screenshotSeriesCount = Math.max(item.screenshotSeriesCount || 0, Number(row.screenshotSeriesCount));
                }
                if (Number(row.imageCount || 0) > item.screenshotCount) {
                    item.screenshotCount = Number(row.imageCount || 0);
                    item.screenshotRow = row;
                }
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
                    imageCount: item.screenshotCount,
                    feedbackId: 0,
                    boostBust: Number(item.screenshotRow.boostBust || 0),
                    rejectionReason: '',
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
                    feedbackText: item.bug.feedbackText || item.bug.feedbackTitle || '',
                    hasMedia: Boolean(item.bug.hasMedia || Number(item.bug.imageCount || 0) > 0),
                    imageCount: Number(item.bug.imageCount || 0),
                    rewardBust: Number(item.bug.rewardBust || 0),
                    rewardKarma: Number(item.bug.rewardKarma || 0),
                    boostBust: Number(item.bug.boostBust || 0),
                    rejectionReason: item.bug.rejectionReason || item.bug.rejection_reason || item.bug.reject_reason || resolveCachedFeedbackRejection(item.bug.feedbackId) || '',
                });
            }
            if (item.idea) {
                reasons.push({
                    kind: 'idea',
                    label: text('pcContributionIdea', 'Recommendation'),
                    proofId: item.idea.proofId,
                    feedbackId: item.idea.feedbackId,
                    feedbackStatus: item.idea.feedbackStatus,
                    feedbackText: item.idea.feedbackText || item.idea.feedbackTitle || '',
                    hasMedia: Boolean(item.idea.hasMedia || Number(item.idea.imageCount || 0) > 0),
                    imageCount: Number(item.idea.imageCount || 0),
                    rewardBust: Number(item.idea.rewardBust || 0),
                    rewardKarma: Number(item.idea.rewardKarma || 0),
                    boostBust: Number(item.idea.boostBust || 0),
                    rejectionReason: item.idea.rejectionReason || item.idea.rejection_reason || item.idea.reject_reason || resolveCachedFeedbackRejection(item.idea.feedbackId) || '',
                });
            }
            if (item.play_review) {
                reasons.push({
                    kind: 'play_review',
                    label: text('pcProofReview', 'Review'),
                    proofId: item.play_review.proofId,
                    feedbackId: item.play_review.feedbackId,
                    feedbackStatus: item.play_review.feedbackStatus,
                    feedbackText: item.play_review.feedbackText || item.play_review.feedbackTitle || '',
                    hasMedia: Boolean(item.play_review.hasMedia || Number(item.play_review.imageCount || 0) > 0),
                    imageCount: Number(item.play_review.imageCount || 0),
                    rewardBust: Number(item.play_review.rewardBust || 0),
                    rewardKarma: Number(item.play_review.rewardKarma || 0),
                    boostBust: Number(item.play_review.boostBust || 0),
                    rejectionReason: item.play_review.rejectionReason || item.play_review.rejection_reason || item.play_review.reject_reason || resolveCachedFeedbackRejection(item.play_review.feedbackId) || '',
                });
            }
            item.reasons = reasons;
            return item;
        });
    }

    function formatContributionTimeAgo(dateStr) {
        if (!dateStr) return '';
        var eventDate = new Date(dateStr);
        if (isNaN(eventDate.getTime())) return '';
        var diffMs = Date.now() - eventDate.getTime();
        var minutes = Math.max(0, Math.floor(diffMs / 60000));
        if (minutes < 1) return text('timeJustNow', 'сейчас');
        if (minutes < 60) return text('timeMinAgo', '{count}м').replace('{count}', minutes);
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return text('timeHourAgo', '{count}ч').replace('{count}', hours);
        var days = Math.floor(hours / 24);
        return text('timeDayAgo', '{count}д').replace('{count}', days);
    }

    function attentionPriority(item) {
        var reasons = item && item.reasons || [];
        var hasActionable = reasons.some(function (r) {
            if (r.code === 'not_opened' || r.code === 'skips') return true;
            if (r.code === 'missed_control') {
                return !r.proofRequested || r.proofReceived;
            }
            return false;
        });
        if (hasActionable) return 1;

        var hasPendingCatchup = reasons.some(function (r) {
            return r.code === 'missed_control' && r.proofRequested && !r.proofReceived;
        });
        if (hasPendingCatchup) return 2;

        return 3;
    }

    function collectAttention(project) {
        var isBuffer = project && (project.status === 'pending_completion' || project.app_status === 'pending_completion');
        var yesterday = shiftDateString(todayString(), -1);
        var items = [];
        var hasRealIssue = false;

        (project && project.testers || []).forEach(function (tester) {
            if (!tester || tester.is_left_soft || tester.is_guest_tester || tester.is_external) return;
            var reasons = [];
            var catchup = catchupStateFor(project, tester);
            var requestableMissedDay = Number(catchup && catchup.requestableMissedDay || 0);
            var requestedDays = (catchup && catchup.requestedDays || []).map(Number);
            var yesterdayDay = testerDayNumber(tester) - 1;
            var requestedCatchupDay = requestedDays.filter(isCatchupControlDay).sort(function (left, right) {
                return right - left;
            })[0] || 0;
            var candidateMissedDay = requestableMissedDay || requestedCatchupDay || yesterdayDay;
            var candidateState = String(catchup && catchup.states && catchup.states[String(candidateMissedDay)] || '').toLowerCase();
            var candidateRequest = catchupRequestForDay(catchup, candidateMissedDay);
            var proofRequested = candidateState === 'requested'
                || candidateState === 'pending'
                || requestedDays.indexOf(candidateMissedDay) !== -1;
            var proofReceived = candidateState === 'proof_received' || candidateState === 'completed';
            var catchupResolved = candidateState === 'owner_closed' || candidateState === 'closed';

            // Real issue: not_opened (only before buffer)
            var neverOpened = !isBuffer && !tester.last_check_date;
            if (neverOpened) {
                reasons.push({
                    code: 'not_opened',
                    label: text('statusNotOpened', 'Not opened yet'),
                });
                hasRealIssue = true;
            }

            // Real issue: missed_control
            if (!catchupResolved && (requestableMissedDay > 0 || requestedCatchupDay > 0 || (yesterday && isCatchupControlDay(yesterdayDay) && String(tester.last_check_date || '') !== yesterday))) {
                reasons.push({
                    code: 'missed_control',
                    label: proofReceived
                        ? text('pcAttentionProofReceived', 'Proof for day {day} received ✓', { day: candidateMissedDay })
                        : (proofRequested
                            ? requestedProofLabel(candidateMissedDay, candidateRequest && candidateRequest.requested_at)
                            : text('pcAttentionMissedControlDay', 'Control proof for day {day} was not received', { day: candidateMissedDay })),
                    missedDay: candidateMissedDay,
                    proofRequested: proofRequested,
                    proofReceived: proofReceived,
                    proofRequestId: Number(candidateRequest && candidateRequest.id || 0),
                    completedProofId: Number(candidateRequest && candidateRequest.completed_proof_id || 0),
                    requestedAt: candidateRequest && candidateRequest.requested_at,
                });
                hasRealIssue = true;
            }

            // Real issue: skips >= 3 (only before buffer)
            var skips = (typeof calculateConsecutiveSkips === 'function')
                ? Number(calculateConsecutiveSkips(tester) || 0)
                : Number(tester.consecutive_skips || 0);
            if (!isBuffer && skips >= 3) {
                reasons.push({
                    code: 'skips',
                    label: skipsLabel(skips),
                    skips: skips,
                });
                hasRealIssue = true;
            }

            // Secondary state: debt
            var joinType = String(tester.join_type || '').toLowerCase();
            if ((joinType === 'mutual' || joinType === 'prelaunch') && tester.is_mutual_debt) {
                reasons.push({
                    code: 'debt',
                    label: text('pcAttentionDebtLabel', 'Your project still needs to be tested'),
                });
            }

            // Secondary state: direct_invite (only before buffer)
            var isDirectInvite = !isBuffer && (joinType === 'invite' || joinType === 'direct' || !joinType)
                && !tester.reciprocal_app_id;
            if (isDirectInvite) {
                reasons.push({
                    code: 'direct_invite',
                    label: text('pcAttentionDirectInvite', 'Direct testing · No mutual obligation'),
                });
            }

            if (!reasons.length) return;

            items.push({
                tester: tester,
                testerId: Number(tester.tester_id || 0),
                reasons: reasons,
            });
        });

        if (window.ProjectActivityAttention) {
            return window.ProjectActivityAttention.augment(project, items, {
                lang: typeof lang !== 'undefined' && lang === 'ru' ? 'ru' : 'en',
            });
        }

        // Compatibility fallback when the attention helper is unavailable.
        if (!hasRealIssue) {
            return [];
        }

        // Sorting priority:
        // 1) Actionable issues for owner (skips, not_opened, unrequested or proof-received missed_control)
        // 2) Pending tester catch-up (missed_control requested & awaiting proof)
        // 3) Preventive states (direct_invite, debt)
        items.sort(function (left, right) {
            return attentionPriority(left) - attentionPriority(right);
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

    function contributionPriority(item, context) {
        var reasons = item && item.reasons || [];
        var hasUnprocessed = reasons.some(function (r) {
            return r.feedbackId > 0 && !isProcessed(r);
        });
        if (hasUnprocessed) return 1;

        var isRewarded = context && context.rewardedTesterIds && context.rewardedTesterIds.indexOf(Number(item.testerId)) !== -1;
        var hasFeedback = reasons.some(function (r) { return r.feedbackId > 0; });
        var allFeedbackProcessed = hasFeedback && reasons.every(function (r) {
            return r.feedbackId > 0 ? isProcessed(r) : true;
        });

        if (isRewarded || allFeedbackProcessed) return 3;
        return 2;
    }

    var SPARKLE_MODES = ['is-mode-orbit', 'is-mode-reverse', 'is-mode-figure8', 'is-mode-spiral'];
    var karmaSparkleTimers = new Map();

    function stopKarmaSparkle(appId) {
        var safeAppId = Number(appId || 0);
        if (safeAppId > 0) {
            var timer = karmaSparkleTimers.get(safeAppId);
            if (timer) {
                clearTimeout(timer);
                karmaSparkleTimers.delete(safeAppId);
            }
            var root = document.getElementById('pc-today-' + safeAppId);
            if (root) {
                root.querySelectorAll('.pc-reward-accent-btn__orbit').forEach(function (el) { el.remove(); });
            }
        } else {
            karmaSparkleTimers.forEach(function (t) { clearTimeout(t); });
            karmaSparkleTimers.clear();
            document.querySelectorAll('.pc-reward-accent-btn__orbit').forEach(function (el) { el.remove(); });
        }
    }

    function scheduleNextKarmaSparkle(appId, delayMs) {
        var safeAppId = Number(appId || 0);
        if (!safeAppId || prefersReducedMotion()) return;
        var existingTimer = karmaSparkleTimers.get(safeAppId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            karmaSparkleTimers.delete(safeAppId);
        }
        var delay = typeof delayMs === 'number' ? delayMs : (2500 + Math.floor(Math.random() * 1500));
        var timer = setTimeout(function () {
            karmaSparkleTimers.delete(safeAppId);
            launchKarmaSparkle(safeAppId);
        }, delay);
        karmaSparkleTimers.set(safeAppId, timer);
    }

    function launchKarmaSparkle(appId) {
        var safeAppId = Number(appId || 0);
        if (!safeAppId || prefersReducedMotion()) return;
        var root = document.getElementById('pc-today-' + safeAppId);
        if (!root) return;

        var shell = root.querySelector('.pc-activity');
        var folderBody = shell && shell.querySelector('.pc-activity__folder-body');
        var activeFilter = folderBody ? folderBody.getAttribute('data-active-filter') : '';
        if (activeFilter && activeFilter !== 'contribution') {
            stopKarmaSparkle(safeAppId);
            return;
        }

        var list = root.querySelector('.pc-act-list');
        if (!list) return;
        var buttons = Array.from(list.querySelectorAll('.pc-reward-accent-btn:not(.is-tester-rewarded-today)'));
        if (!buttons.length) {
            stopKarmaSparkle(safeAppId);
            return;
        }

        root.querySelectorAll('.pc-reward-accent-btn__orbit').forEach(function (el) { el.remove(); });

        var targetBtn = buttons[Math.floor(Math.random() * buttons.length)];
        var chosenMode = SPARKLE_MODES[Math.floor(Math.random() * SPARKLE_MODES.length)];
        var durationSec = (3.4 + Math.random() * 0.8).toFixed(2);
        var tiltDeg = (Math.floor(Math.random() * 48) - 24) + 'deg';

        var orbit = document.createElement('span');
        orbit.className = 'pc-reward-accent-btn__orbit';
        orbit.setAttribute('aria-hidden', 'true');
        orbit.style.setProperty('--orbit-tilt', tiltDeg);

        var sparkle = document.createElement('span');
        sparkle.className = 'pc-reward-accent-btn__sparkle ' + chosenMode;
        sparkle.style.animationDuration = durationSec + 's';

        var star = document.createElement('span');
        star.className = 'pc-sparkle-glyph pc-sparkle-glyph--star';
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '✦';

        var plus = document.createElement('span');
        plus.className = 'pc-sparkle-glyph pc-sparkle-glyph--plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';

        sparkle.appendChild(star);
        sparkle.appendChild(plus);
        orbit.appendChild(sparkle);

        var handled = false;
        function onComplete() {
            if (handled) return;
            handled = true;
            orbit.remove();
            scheduleNextKarmaSparkle(safeAppId);
        }

        sparkle.addEventListener('animationend', function (e) {
            if (e.target === sparkle) onComplete();
        });

        setTimeout(onComplete, (parseFloat(durationSec) * 1000) + 1200);

        targetBtn.appendChild(orbit);
    }

    function initKarmaSparkleCycle(appId) {
        var safeAppId = Number(appId || 0);
        if (!safeAppId || prefersReducedMotion()) return;
        var root = document.getElementById('pc-today-' + safeAppId);
        if (!root) return;
        var existingSparkle = root.querySelector('.pc-reward-accent-btn__sparkle');
        if (existingSparkle) {
            var existingOrbit = existingSparkle.closest('.pc-reward-accent-btn__orbit');
            var done = false;
            function onExistingDone() {
                if (done) return;
                done = true;
                if (existingOrbit) existingOrbit.remove();
                scheduleNextKarmaSparkle(safeAppId);
            }
            existingSparkle.addEventListener('animationend', function (e) {
                if (e.target === existingSparkle) onExistingDone();
            });
            setTimeout(onExistingDone, 4500);
        } else {
            scheduleNextKarmaSparkle(safeAppId, 1000);
        }
    }

    function rewardAccentButtonHtml(appId, testerId, opts) {
        opts = opts || {};
        var karmaIcon = typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : (ICONS.reward || '<span class="rewards-icon-glyph">☯</span>');
        var orbitHtml = '';
        if (opts.hasSparkle) {
            var mode = opts.mode || SPARKLE_MODES[Math.floor(Math.random() * SPARKLE_MODES.length)];
            var ang = opts.tilt || ((Math.floor(Math.random() * 40) - 20) + 'deg');
            var dur = opts.duration || '3.8s';
            var style = 'style="animation-duration:' + dur + ';"';
            orbitHtml = '<span class="pc-reward-accent-btn__orbit" aria-hidden="true" style="--orbit-tilt:' + ang + ';">' +
                '<span class="pc-reward-accent-btn__sparkle ' + esc(mode) + '" ' + style + '>' +
                    '<span class="pc-sparkle-glyph pc-sparkle-glyph--star" aria-hidden="true">✦</span>' +
                    '<span class="pc-sparkle-glyph pc-sparkle-glyph--plus" aria-hidden="true">+</span>' +
                '</span>' +
            '</span>';
        }
        var rewardedToday = !!opts.rewardedToday;
        var label = rewardedToday
            ? text('pcRewardTesterRewardedToday', 'A reward has already been issued to this tester today')
            : text('pcRewardBtn', 'Reward');
        var completeMarkHtml = rewardedToday
            ? '<span class="pc-reward-accent-btn__complete" aria-hidden="true">✓</span>'
            : '';
        return '<button type="button" class="pc-reward-accent-btn pc-iconact pc-iconact--reward' + (rewardedToday ? ' is-tester-rewarded-today' : '') + '" ' +
            'title="' + esc(label) + '" ' +
            'aria-label="' + esc(label) + '" ' +
            'onclick="event.stopPropagation(); pcRewardTester(' + Number(appId) + ',' + Number(testerId) + ')">' +
            '<span class="pc-reward-accent-btn__core">' + karmaIcon + '</span>' +
            completeMarkHtml +
            orbitHtml +
        '</button>';
    }

    function pluralizePoints(score) {
        var n = Math.abs(Math.round(Number(score || 0))) % 100;
        var r = n % 10;
        if (n > 10 && n < 20) return text('countPointsWord_many', 'баллов');
        if (r > 1 && r < 5) return text('countPointsWord_few', 'балла');
        if (r === 1) return text('countPointsWord_one', 'балл');
        return text('countPointsWord_many', 'баллов');
    }

    function pluralizeSeries(count) {
        var n = Math.abs(Math.round(Number(count || 0))) % 100;
        var r = n % 10;
        if (n > 10 && n < 20) return text('pcContribStatSeries_many', 'серий');
        if (r > 1 && r < 5) return text('pcContribStatSeries_few', 'серии');
        if (r === 1) return text('pcContribStatSeries_one', 'серия');
        return text('pcContribStatSeries_many', 'серий');
    }

    function contributionTesterStatsChipHtml(appId, tester, item, context) {
        var t = tester || (item && item.tester) || {};
        var testerId = Number(t.tester_id || t.id || (item && item.testerId) || 0);

        // 1. Вклад за всё время
        var score = Math.round(Number(
            t.contribution_lifetime_score != null
                ? t.contribution_lifetime_score
                : (t.all_time_contribution != null
                    ? t.all_time_contribution
                    : (t.contribution_score != null ? t.contribution_score : 0))
        ));

        // 2. Процент принятия фидбеков (0..100)
        var rawRate = t.acceptance_rate_pct != null ? t.acceptance_rate_pct : t.acceptance_rate;
        var acceptanceRate = (rawRate != null && rawRate !== '' && !isNaN(Number(rawRate)))
            ? Number(rawRate)
            : null;

        // Число проверенных репортов (accepted + rejected)
        var acceptedTotal = Number(t.feedback_accepted_total != null ? t.feedback_accepted_total : (t.accepted_total || 0));
        var rejectedTotal = Number(t.feedback_rejected_total != null ? t.feedback_rejected_total : (t.rejected_total || 0));
        var verifiedTotal = acceptedTotal + rejectedTotal;
        var submittedTotal = Number(t.feedback_submitted_total != null ? t.feedback_submitted_total : (t.submitted_total || 0));
        if (verifiedTotal === 0 && submittedTotal > 0 && acceptanceRate !== null) {
            verifiedTotal = submittedTotal;
        }

        // Репорты на проверке за сегодня / всего
        var reasons = (item && item.reasons) || [];
        var pendingToday = reasons.filter(function (r) {
            if (!r || r.kind === 'screenshots') return false;
            var st = String(r.feedbackStatus || '').toLowerCase();
            return !st || st === 'pending' || st === 'sent' || PROCESSED_STATUSES.indexOf(st) === -1;
        }).length;
        var pendingCount = Math.max(pendingToday, Number(t.pending_feedbacks_count || 0));

        // Были ли текстовые репорты сегодня (баг, рекомендация, отзыв)?
        var hasFeedbackToday = reasons.some(function (r) {
            return r && (r.kind === 'bug' || r.kind === 'idea' || r.kind === 'play_review');
        });

        // Серии скриншотов (3+ скринов)
        var seriesCount = Number((item && item.screenshotSeriesCount) || 0);
        if (seriesCount <= 0) {
            seriesCount = reasons.filter(function (r) {
                return r && (r.kind === 'screenshots' || Number(r.imageCount || 0) >= 3);
            }).length;
        }
        if (seriesCount <= 0 && item && Number(item.screenshotCount || 0) >= 3) {
            seriesCount = 1;
        }

        var seriesTotal = Number(
            t.screenshot_series_total != null
                ? t.screenshot_series_total
                : (t.screenshot_series_count != null ? t.screenshot_series_count : 0)
        );
        var isRegularScreenshoter = seriesTotal >= 10 || (seriesCount >= 10) || Boolean(t.is_screenshot_regular);

        // 3. Достижения в спринтах (Топ-5 / Топ-10)
        var top5 = Number(t.contribution_top5_count || t.top5_count || 0);
        var top10 = Number(t.contribution_top10_count || t.top10_count || 0);
        var bestRank = t.contribution_best_rank != null ? Number(t.contribution_best_rank) : (t.best_rank != null ? Number(t.best_rank) : null);
        var seasonRank = t.season_rank != null ? Number(t.season_rank) : null;
        var topBadgeText = '';
        if (top5 > 0 || (bestRank && bestRank <= 5) || (seasonRank && seasonRank <= 5)) {
            topBadgeText = text('pcContribStatTop5', 'Топ-5');
        } else if (top10 > 0 || (bestRank && bestRank <= 10) || (seasonRank && seasonRank <= 10)) {
            topBadgeText = text('pcContribStatTop10', 'Топ-10');
        }

        // Текст вклада: короткое и ёмкое "Вклад: {X}"
        var pointsLabel = text('pcContribStatScoreVal', 'Вклад: {score}', { score: score });

        var toneClass = '';
        var parts = [];

        // Сценарий 4: Постоянный скриншотер (от 10 серий)
        // Правило: Если у тестера разовая акция (1-2 серии) — в чипе про скриншоты НЕ пишем вообще!
        if (isRegularScreenshoter && seriesCount > 0 && !hasFeedbackToday) {
            toneClass = ' pc-contrib-stat-chip--screenshots';
            parts.push({ text: pointsLabel, cls: 'pc-contrib-stat-chip__seg--score' });
            var displaySeriesCount = (seriesCount >= 3) ? seriesCount : (seriesTotal >= 10 ? seriesTotal : seriesCount);
            var seriesLabel = text('pcContribStatScreenshots', '{count} {series_word} скринов', {
                count: displaySeriesCount,
                series_word: pluralizeSeries(displaySeriesCount),
            });
            parts.push({ text: seriesLabel, cls: 'pc-contrib-stat-chip__seg--series' });
        }
        // Сценарий 1: Новичок или отчеты ждут подтверждения разработчика
        // Правило: НИКОГДА не писать "0% принятия"
        else if (pendingCount > 0 || verifiedTotal < 3 || acceptanceRate === null || acceptanceRate === 0) {
            // Если у тестера разовая акция со скриншотами (1-2 серии) без текста и без отчётов на проверке
            if (seriesCount > 0 && !hasFeedbackToday && pendingCount === 0 && verifiedTotal === 0) {
                parts.push({ text: pointsLabel, cls: 'pc-contrib-stat-chip__seg--score' });
            } else {
                toneClass = ' pc-contrib-stat-chip--pending';
                parts.push({ text: pointsLabel, cls: 'pc-contrib-stat-chip__seg--score' });
                var nPending = pendingCount > 0 ? pendingCount : Math.max(1, pendingToday);
                var pendingLabel = text('pcContribStatPending', '{count} на проверке', { count: nPending });
                parts.push({ text: pendingLabel, cls: 'pc-contrib-stat-chip__seg--pending' });
            }
        }
        // Сценарий 3: Низкий процент (<40% при 3+ отчетах), нейтральный спокойный стиль
        else if (acceptanceRate < 40) {
            toneClass = ' pc-contrib-stat-chip--warn';
            parts.push({ text: pointsLabel, cls: 'pc-contrib-stat-chip__seg--score' });
            var warnLabel = text('pcContribStatWarn', '{pct}% принято', { pct: Math.round(acceptanceRate) });
            parts.push({ text: warnLabel, cls: 'pc-contrib-stat-chip__seg--warn' });
            if (topBadgeText) {
                parts.push({ text: topBadgeText, cls: 'pc-contrib-stat-chip__seg--top pc-contrib-stat-chip__top-badge' });
            }
        }
        // Сценарий 2: Опытный с хорошей историей (>=40% при 3+ отчетах)
        else {
            toneClass = ' pc-contrib-stat-chip--good';
            parts.push({ text: pointsLabel, cls: 'pc-contrib-stat-chip__seg--score' });
            var acceptLabel = text('pcContribStatAccepted', '{pct}% принято', { pct: Math.round(acceptanceRate) });
            parts.push({ text: acceptLabel, cls: 'pc-contrib-stat-chip__seg--rate' });
            if (topBadgeText) {
                parts.push({ text: topBadgeText, cls: 'pc-contrib-stat-chip__seg--top pc-contrib-stat-chip__top-badge' });
            }
        }

        var tooltip = text('pcContribStatTooltip', 'Статистика участника · Нажмите, чтобы открыть досье');
        var clickAttr = 'event.stopPropagation(); ' + dossierClick(appId, t);

        var segmentsHtml = parts.map(function (p) {
            var textVal = (typeof p === 'object' && p !== null) ? p.text : p;
            var extraCls = (typeof p === 'object' && p !== null && p.cls) ? (' ' + p.cls) : '';
            return '<span class="pc-contrib-stat-chip__seg' + extraCls + '">' + esc(textVal) + '</span>';
        }).join('<span class="pc-contrib-stat-chip__sep" aria-hidden="true">•</span>');

        var arrowSvg = '<svg class="pc-contrib-stat-chip__arrow" viewBox="0 0 10 6" width="7" height="5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1L5 5L9 1"/></svg>';

        return '<button type="button" class="pc-contrib-stat-chip' + toneClass + '"' +
            ' onclick="' + clickAttr + '"' +
            ' title="' + esc(tooltip) + '">' +
            segmentsHtml +
            arrowSvg +
        '</button>';
    }

    function contributionSheetHtml(appId, items, context) {
        if (!items.length) return emptySheetHtml(text('pcContributionEmpty', 'No extra contribution today'));

        var sorted = items.slice().sort(function (left, right) {
            return contributionPriority(left, context) - contributionPriority(right, context);
        });

        var eligibleTesters = sorted.filter(function (it) {
            return rewardStateForTester(context, it.testerId).canReward;
        });
        var initialSparkleTesterId = 0;
        var initialSparkleMode = SPARKLE_MODES[Math.floor(Math.random() * SPARKLE_MODES.length)];
        var initialSparkleTilt = (Math.floor(Math.random() * 40) - 20) + 'deg';
        if (eligibleTesters.length > 0) {
            var startIdx = Math.floor(Math.random() * eligibleTesters.length);
            initialSparkleTesterId = Number(eligibleTesters[startIdx].testerId);
        }

        return '<ul class="pc-act-list">' + sorted.map(function (item) {
            var rewardState = rewardStateForTester(context, item.testerId);
            var headerActionsHtml = '';
            var boostBust = getTesterBoostBust(context, item.testerId, item);
            var boostBustHtml = boostRewardBadgeHtml(boostBust);
            if (rewardState.canReward || rewardState.rewardedToday) {
                var isInitialTarget = rewardState.canReward && Number(item.testerId) === initialSparkleTesterId;
                headerActionsHtml = rewardAccentButtonHtml(appId, item.testerId, {
                    hasSparkle: isInitialTarget,
                    mode: initialSparkleMode,
                    tilt: initialSparkleTilt,
                    duration: '3.8s',
                    rewardedToday: rewardState.rewardedToday,
                });
            }

            var subrowsHtml = activityTimelineHtml(appId, item.reasons, { testerId: item.testerId, context: context, reasons: item.reasons, item: item });
            var timeAgo = formatContributionTimeAgo(item.latestCreatedAt || (item.tester && item.tester.last_check_date) || '');

            return personRowHtml({
                appId: appId,
                tester: item.tester,
                tone: rewardState.rewardedToday ? 'green' : 'sky',
                rowClass: 'pc-person--contribution',
                metaHtml: contributionTesterStatsChipHtml(appId, item.tester, item, context),
                actionsHtml: headerActionsHtml,
                avatarMarkerHtml: contributionAvatarMarkerHtml(item.reasons),
                extraHtml: subrowsHtml,
                timeAgoText: timeAgo,
            });
        }).join('') + '</ul>';
    }

    var expandedAttentionReasons = new Set();

    function formatAttentionDate(dateStr) {
        if (!dateStr) return '';
        var d = new Date(String(dateStr).trim());
        if (isNaN(d.getTime())) return String(dateStr);
        var isRu = typeof lang !== 'undefined' && lang === 'ru';
        try {
            return d.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' });
        } catch (_) {
            return String(dateStr).slice(0, 10);
        }
    }

    function formatAttentionDateTime(dateStr) {
        if (!dateStr) return '';
        var d = new Date(String(dateStr).trim());
        if (isNaN(d.getTime())) return String(dateStr);
        var isRu = typeof lang !== 'undefined' && lang === 'ru';
        try {
            return d.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' }) + ' ' +
                d.toLocaleTimeString(isRu ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' });
        } catch (_) {
            return String(dateStr).slice(0, 16);
        }
    }

    function parseDayDate(value) {
        var raw = String(value || '').trim();
        if (!raw) return null;
        var iso = raw.length >= 10 ? raw.slice(0, 10) : raw;
        var parsed = new Date(iso + 'T00:00:00');
        return Number.isFinite(parsed.getTime()) ? parsed : null;
    }

    function dateFromCycleMetrics(metrics) {
        metrics = metrics || {};
        var start = parseDayDate(metrics.start_date);
        var days = Math.max(0, Number(metrics.testing_days || 0));
        if (start && days > 0) {
            var end = new Date(start.getTime());
            end.setDate(end.getDate() + days - 1);
            return end;
        }
        return parseDayDate(metrics.last_check_date);
    }

    function isCompletedExchangeSide(side) {
        if (!side) return false;
        var app = String(side.app_status || '').toLowerCase();
        var leg = String(side.leg_status || '').toLowerCase();
        return !!side.done || app === 'completed' || app === 'archived' || leg === 'completed';
    }

    function reciprocalProjectFinishedDate(tester) {
        var exchange = tester && tester.exchange_state && Number(tester.exchange_state.version || 0) >= 1
            ? tester.exchange_state
            : null;
        if (!exchange) return null;
        var left = exchange.left || {};
        var right = exchange.right || {};
        // Partner/right is the owner testing the reciprocal app; that freeze
        // date is the closest available "project finished" day.
        var sides = [];
        if (isCompletedExchangeSide(right)) sides.push(right);
        if (isCompletedExchangeSide(left)) sides.push(left);
        for (var i = 0; i < sides.length; i++) {
            var at = dateFromCycleMetrics(sides[i].metrics);
            if (at) return at;
        }
        return null;
    }

    function getAttentionReasonMeta(reason, tester, appId, testerId) {
        var code = String(reason && reason.code || '').toLowerCase();
        var reasonIcon = ATTENTION_ICONS[code] || ATTENTION_ICONS.not_opened;
        var subKey = reason.missedDay ? ('_' + reason.missedDay) : (reason.feedbackId ? ('_' + reason.feedbackId) : '');
        var key = String(testerId) + '_' + code + subKey;
        var title = '';
        var summaryHtml = '';
        var desc = '';
        var bodyHtml = '';
        var actionHtml = '';

        if (reason.action === 'left_status' || reason.action === 'link_status') {
            reasonIcon = ATTENTION_ICONS[code] || ATTENTION_ICONS.direct_invite;
            actionHtml = iconAct('process', reason.actionLabel || workspaceText('Подробнее', 'Details'),
                (reason.action === 'left_status' ? 'openLeftTesterLinkStatus' : 'openTesterLinkStatusFromRow') +
                '(' + Number(appId) + ',' + Number(testerId) + ', event)');
            if (code === 'tester_left') {
                title = workspaceText('Участник вышел из проекта', 'Participant left project');
                summaryHtml = '<span class="pc-att-tag pc-att-tag--danger">' + esc(workspaceText('Тестер вышел', 'Tester left')) + '</span>';
                desc = workspaceText('Тестировщик прервал или закончил участие. Примите решение по освободившемуся месту.', 'Participant ended participation. Review the slot to reassign or close.');
            } else {
                title = workspaceText('Связь взаимного теста нарушена', 'Mutual link broken');
                summaryHtml = '<span class="pc-att-tag pc-att-tag--warn">' + esc(workspaceText('Связь разорвана', 'Link broken')) + '</span>';
                desc = workspaceText('Связь между проектами прервана из-за удаления проекта или выхода участника.', 'Connection was interrupted due to project cancellation or leave.');
            }
        } else if (code === 'skips') {
            var skips = Number(reason.skips || tester.consecutive_skips || 0);
            title = workspaceText('Пропуски активности', 'Inactivity skips');
            summaryHtml = '<span class="pc-att-tag pc-att-tag--skips">' + esc(workspaceText(skips + ' дн. подряд', skips + ' days missed')) + '</span>';
            var lastDate = tester && tester.last_check_date ? formatAttentionDate(tester.last_check_date) : '';
            desc = workspaceText('Тестировщик не заходил уже ' + skips + ' дн. подряд.', 'Tester has skipped ' + skips + ' days consecutively.');
            if (lastDate) {
                desc += ' ' + workspaceText('Последний вход: ' + lastDate + '.', 'Last active: ' + lastDate + '.');
            } else {
                desc += ' ' + workspaceText('Входов в приложение не зафиксировано.', 'No app activity recorded.');
            }
            desc += ' ' + workspaceText('Напомните о необходимости запускать приложение для зачёта Google Play.', 'Remind the tester to launch the app for Google Play requirements.');
            actionHtml = iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(testerId) + ', \'skips\', { skips: ' + skips + ' })');
        } else if (code === 'not_opened') {
            var curDay = testerDayNumber(tester);
            title = workspaceText('Приложение не запущено', 'App not launched');
            summaryHtml = '<span class="pc-att-tag pc-att-tag--not_opened">' + esc(workspaceText('День ' + curDay + ' · Не запускал', 'Day ' + curDay + ' · Not launched')) + '</span>';
            desc = workspaceText('С момента добавления прошло уже ' + curDay + ' дн., но приложение ни разу не открывалось. Тестирование фактически не начато.', 'Already ' + curDay + ' days in project, but app was never launched. Testing has not started.');
            actionHtml = iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(testerId) + ', \'not_opened\')');
        } else if (code === 'missed_control') {
            var missedDay = Number(reason.missedDay || 0);
            if (reason.proofReceived) {
                title = workspaceText('Контрольный отчёт (день ' + missedDay + ')', 'Control proof (day ' + missedDay + ')');
                summaryHtml = '<span class="pc-att-tag pc-att-tag--success">' + esc(workspaceText('Скриншот получен ✓', 'Proof received ✓')) + '</span>';
                desc = workspaceText('Тестировщик прикрепил скриншот за контрольный день ' + missedDay + '. Ознакомьтесь со скриншотом и подтвердите проверку.', 'Tester submitted screenshot for day ' + missedDay + '. Please review the proof.');
                if (reason.completedProofId > 0) {
                    actionHtml += iconAct('image', text('pcViewProof', 'View proof'),
                        'pcOpenProof(' + Number(appId) + ',' + Number(reason.completedProofId) + ',0)');
                }
                if (reason.proofRequestId > 0) {
                    actionHtml += iconAct('done', text('pcCloseProofRequest', 'Done'),
                        'pcCloseCatchupProofRequest(' + Number(appId) + ',' + Number(reason.proofRequestId) + ')');
                }
            } else if (reason.proofRequested) {
                title = workspaceText('Контрольный отчёт (день ' + missedDay + ')', 'Control proof (day ' + missedDay + ')');
                summaryHtml = '<span class="pc-att-tag pc-att-tag--pending">' + esc(workspaceText('Запрос отправлен · Ожидание', 'Requested · Pending')) + '</span>';
                var reqTime = reason.requestedAt ? formatAttentionDateTime(reason.requestedAt) : '';
                desc = workspaceText('Запрос подтверждения за день ' + missedDay + ' отправлен' + (reqTime ? ' (' + reqTime + ')' : '') + '. Ожидаем скриншот от тестировщика.', 'Verification request for day ' + missedDay + ' sent' + (reqTime ? ' (' + reqTime + ')' : '') + '. Awaiting screenshot.');
                actionHtml = '<span class="pc-iconact pc-iconact--done" title="' + esc(text('pcProofRequested', 'Requested')) + '">' +
                    ICONS.done + '<span class="pc-iconact__label">' + esc(text('pcProofRequested', 'Requested')) + '</span></span>';
            } else {
                title = text('pcAttentionMissedReportTitle', 'Пропущен обязательный отчёт');
                summaryHtml = '<span class="pc-att-tag pc-att-tag--warn">' + esc(workspaceText('Контрольный день ' + missedDay, 'Control day ' + missedDay)) + '</span>';
                desc = workspaceText('В обязательный контрольный день ' + missedDay + ' не был отправлен подтверждающий скриншот.', 'Mandatory control proof was not submitted for day ' + missedDay + '.');
                if (isCatchupControlDay(missedDay)) {
                    actionHtml = iconAct('image', text('pcRequestProof', 'Request'),
                        'pcRequestCatchupProof(' + Number(appId) + ',' + Number(testerId) + ')');
                }
            }
        } else if (code === 'debt') {
            title = text('pcAttentionDebtTitle', 'Partner finished their project.');
            summaryHtml = '<span class="pc-attention-tile__subtitle">' +
                esc(text('pcAttentionDebtSubtitle', 'Must finish testing your app')) + '</span>';
            var projectName = String(tester && tester.reciprocal_app_name || '').trim()
                || workspaceText('Ответный тест', 'Reciprocal test');
            var finishedDaysAgo = daysSince(reciprocalProjectFinishedDate(tester));
            var statusLine = finishedDaysAgo == null
                ? workspaceText('Завершён', 'Finished')
                : (finishedDaysAgo <= 0
                    ? text('pcAttentionDebtProjectStatusToday', 'Finished today')
                    : text('pcAttentionDebtProjectStatus', 'Finished {days} d. ago', { days: finishedDaysAgo }));
            var debtDay = testerDayNumber(tester);
            var remainingDays = testerDaysRemaining(tester);
            bodyHtml = '<div class="pc-attention-debt">' +
                '<div class="pc-attention-debt__project">' +
                    '<div class="pc-attention-debt__name">' + esc(projectName) + '</div>' +
                    '<div class="pc-attention-debt__meta">' + esc(statusLine) + '</div>' +
                    '<div class="pc-attention-debt__meta">' + esc(text(
                        'pcAttentionDebtTimeline',
                        'Still need to test you: {remaining} d. (day {day} of 14)',
                        { remaining: remainingDays, day: debtDay }
                    )) + '</div>' +
                '</div>' +
                '<p class="pc-attention-tile__desc">' + esc(text(
                    'pcAttentionDebtDesc',
                    'The partner no longer has a direct reciprocal incentive — testing continues under mutual-obligation rules. Watch check-ins and send reminders on time.'
                )) + '</p>' +
                '<p class="pc-attention-tile__desc pc-attention-debt__warn">' + esc(text(
                    'pcAttentionDebtWarn',
                    'Most important — do not let them uninstall the app: if the tester removes it and the active tester base drops below 12 people, Google Play will reset the project\'s entire 14-day progress.'
                )) + '</p>' +
            '</div>';
            actionHtml = iconAct('remind', text('pcRemindBtn', 'Remind'),
                'pcRemindTester(' + Number(appId) + ',' + Number(testerId) + ', \'debt\')');
            actionHtml += iconAct('process', workspaceText('Связь', 'Link'),
                'openTesterLinkStatusFromRow(' + Number(appId) + ',' + Number(testerId) + ', event)');
        } else if (code === 'direct_invite') {
            title = workspaceText('Прямое тестирование', 'Direct testing');
            summaryHtml = '<span class="pc-att-tag pc-att-tag--neutral">' + esc(workspaceText('Без взаимки', 'No mutual')) + '</span>';
            desc = workspaceText('Тестер выполняет проверку без ответного обязательства. Вы можете предложить протестировать его приложение взаимно.', 'Tester joined via direct link without reciprocal obligation. You can offer a mutual exchange.');
            var isPending = isMutualOfferPending(testerId);
            if (isPending) {
                actionHtml = '<span class="pc-btn-pending" title="' + esc(text('pcAttentionOfferPending', 'Awaiting reply')) + '">' +
                    esc(text('pcAttentionOfferPending', 'Awaiting reply')) + '</span>';
            } else {
                actionHtml = '<button type="button" class="pc-btn-mutual-offer" onclick="event.stopPropagation(); pcOfferMutual(' +
                    Number(appId) + ',' + Number(testerId) + ', event)">' +
                    esc(text('pcAttentionDirectInviteAction', 'Offer mutual')) + '</button>';
            }
        } else {
            title = esc(reason.label || workspaceText('Требуется внимание', 'Attention needed'));
            summaryHtml = '<span class="pc-att-tag pc-att-tag--warn">' + esc(reason.label || workspaceText('Внимание', 'Attention')) + '</span>';
            desc = esc(reason.description || reason.label || '');
            if (reason.actionHtml) actionHtml = reason.actionHtml;
        }

        return {
            key: key,
            code: code,
            icon: reasonIcon,
            title: title,
            summaryHtml: summaryHtml,
            desc: desc,
            bodyHtml: bodyHtml,
            actionHtml: actionHtml,
        };
    }

    window.pcToggleAttentionReason = function (el, event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        var tile = el && el.closest ? el.closest('.pc-attention-tile') : null;
        if (!tile) return;
        var key = tile.getAttribute('data-reason-key');
        var isExpanded = tile.classList.toggle('is-expanded');
        if (key) {
            if (isExpanded) {
                expandedAttentionReasons.add(key);
            } else {
                expandedAttentionReasons.delete(key);
            }
        }
        tile.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
    };

    function attentionSheetHtml(appId, items) {
        if (!items.length) return emptySheetHtml(text('pcAttentionEmpty', 'Nobody needs attention right now'));
        var monitoringShown = false;
        return '<ul class="pc-act-list">' + items.map(function (item) {
            var tester = item.tester || {};
            var currentDay = testerDayNumber(tester);
            var linkedIcon = String(tester.reciprocal_app_icon_url || '').trim();
            var avatarMarkerHtml = linkedIcon
                ? '<img class="pc-person__avatar-linked" src="' + esc(linkedIcon) + '" alt="" loading="lazy">'
                : '<span class="pc-person__dot" aria-hidden="true"></span>';

            var metaHtml = '<span class="pc-person__reliability">' + esc(testerReliabilityLabel(tester)) + '</span>' +
                testerKarmaMetaHtml(tester) +
                '<span class="pc-person__day">' + esc(workspaceText('День ', 'Day ') + currentDay) + '</span>';

            var safeTesterId = Number(item.testerId || tester.tester_id || 0);

            var tilesHtml = '<div class="pc-attention-tiles">' + (item.reasons || []).map(function (reason) {
                var meta = getAttentionReasonMeta(reason, tester, appId, safeTesterId);
                var isExpanded = expandedAttentionReasons.has(meta.key);
                return '<div class="pc-attention-tile pc-attention-tile--' + esc(meta.code) + (isExpanded ? ' is-expanded' : '') + '" data-reason-key="' + esc(meta.key) + '" onclick="event.stopPropagation()">' +
                    '<div class="pc-attention-tile__header" onclick="pcToggleAttentionReason(this, event)">' +
                        '<div class="pc-attention-tile__info">' +
                            '<span class="pc-attention-tile__icon" aria-hidden="true">' + meta.icon + '</span>' +
                            '<div class="pc-attention-tile__text">' +
                                '<div class="pc-attention-tile__title">' + esc(meta.title) + '</div>' +
                                (meta.summaryHtml ? '<div class="pc-attention-tile__summary">' + meta.summaryHtml + '</div>' : '') +
                            '</div>' +
                        '</div>' +
                        '<div class="pc-attention-tile__toggle" aria-hidden="true">' +
                            '<svg class="pc-attention-tile__chevron" viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>' +
                        '</div>' +
                    '</div>' +
                    '<div class="pc-attention-tile__drawer">' +
                        '<div class="pc-attention-tile__drawer-inner">' +
                            '<div class="pc-attention-tile__content">' +
                                (meta.bodyHtml || (meta.desc ? '<p class="pc-attention-tile__desc">' + esc(meta.desc) + '</p>' : '')) +
                                (meta.actionHtml ? '<div class="pc-attention-tile__action">' + meta.actionHtml + '</div>' : '') +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            }).join('') + '</div>';

            var sectionLabel = '';
            if (!monitoringShown && Number(item.priority) >= 4) {
                monitoringShown = true;
                sectionLabel = '<li class="pc-attention-section-label" role="presentation">' + esc(workspaceText('Наблюдение', 'Monitoring')) + '</li>';
            }
            return sectionLabel + personRowHtml({
                appId: appId,
                tester: tester,
                tone: attentionTone(item),
                rowClass: 'pc-person--attention',
                metaHtml: metaHtml,
                actionsHtml: '',
                avatarMarkerHtml: avatarMarkerHtml,
                extraHtml: tilesHtml,
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
        var pendingRows = rows.filter(function (row) { return !row.received; });
        var receivedRows = rows.filter(function (row) { return row.received; });
        var pendingCount = pendingRows.length;
        var receivedCount = receivedRows.length;

        var bulkRemindHtml = '';
        var reminderState = controlReminderStates.get(Number(appId));
        var sending = controlReminderSending.has(Number(appId));
        var readyCount = reminderState && reminderState.ready_count != null ? Number(reminderState.ready_count) : pendingCount;
        var showBulkRemind = rows.length > 1 && pendingCount > 0;
        if (showBulkRemind) {
            if (readyCount > 0 || sending) {
                var remindLabel = sending
                    ? text('pcRemindersSending', 'Sending DMs…')
                    : text('pcControlRemindAll', 'Remind everyone');
                var remindCountHtml = (!sending && readyCount > 0)
                    ? '<span class="pc-control-remind-all-count' + (String(readyCount).length <= 1 ? ' is-circle' : '') + '" aria-hidden="true">' + readyCount + '</span>'
                    : '';
                bulkRemindHtml = '<button type="button" class="pc-control-remind-all-btn' + (sending ? ' is-sending' : '') + '"' + (sending ? ' disabled aria-busy="true"' : '') + ' aria-label="' + esc(remindLabel) + (sending || readyCount < 1 ? '' : ' ' + readyCount) + '" onclick="event.stopPropagation(); pcRemindAllPendingControl(' + Number(appId) + ')">' +
                    ICONS.remind + '<span class="pc-control-remind-all-label">' + esc(remindLabel) + '</span>' + remindCountHtml + '</button>';
            } else {
                bulkRemindHtml = '<button type="button" class="pc-control-remind-all-btn is-done" disabled>' +
                    esc(text('pcRemindersAttempted', 'Reminders processed')) +
                '</button>';
            }
        }

        var summaryHtml = showBulkRemind ? '<section class="pc-control-reminder-panel" aria-label="' + esc(text('pcControlRemindAll', 'Remind everyone')) + '">' +
            bulkRemindHtml +
            '<div class="pc-control-reminder-feedback" role="status" aria-live="polite">' + controlReminderFeedbackHtml(reminderState) + '</div>' +
            '<p class="pc-control-reminder-hint">' + esc(text('pcRemindersHint', 'One bot reminder per milestone. Personal reminders remain separate.')) + '</p></section>' : '';

        var pendingSectionHtml = '';
        if (pendingRows.length > 0) {
            pendingSectionHtml = '<div class="pc-control-section pc-control-section--pending">' +
                '<div class="pc-control-section-title">' +
                    '<span>' + esc(text('pcControlSectionPending', 'Pending')) + '</span>' +
                    '<span class="pc-control-section-badge pc-control-section-count' + (String(pendingRows.length).length <= 1 ? ' is-circle' : '') + '">' + pendingRows.length + '</span>' +
                '</div>' +
                '<ul class="pc-act-list pc-activity-control">' +
                    pendingRows.map(function (row) { return controlRowHtml(appId, row, context); }).join('') +
                '</ul>' +
            '</div>';
        }

        var receivedSectionHtml = '';
        if (receivedRows.length > 0) {
            var isReceivedExpanded = expandedReceived.has(Number(appId));
            if (isReceivedExpanded) {
                lastSeenReceivedCounts.set(Number(appId), receivedCount);
            }
            var lastSeen = lastSeenReceivedCounts.get(Number(appId));
            var hasNewReceived = !isReceivedExpanded && receivedCount > 0 && (lastSeen == null ? true : receivedCount > lastSeen);

            receivedSectionHtml = '<div class="pc-control-section pc-control-section--received' + (isReceivedExpanded ? ' is-expanded' : ' is-collapsed') + '">' +
                '<button type="button" class="pc-control-section-title pc-control-section-toggle" onclick="event.stopPropagation(); pcToggleReceivedSection(' + Number(appId) + ')" aria-expanded="' + isReceivedExpanded + '">' +
                    '<span class="pc-control-section-toggle__left">' +
                        '<span>' + esc(text('pcControlSectionReceived', 'Received')) + '</span>' +
                        '<span class="pc-control-section-badge pc-control-section-count' + (String(receivedCount).length <= 1 ? ' is-circle' : '') + (hasNewReceived ? ' is-highlight' : '') + '">' + receivedCount + '</span>' +
                    '</span>' +
                    '<span class="pc-control-section-chevron' + (isReceivedExpanded ? ' is-expanded' : '') + '" aria-hidden="true">' +
                        '<svg viewBox="0 0 12 12" width="10" height="10"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="m2.5 4.5 3.5 3.5 3.5-3.5"/></svg>' +
                    '</span>' +
                '</button>' +
                '<ul class="pc-act-list pc-activity-control"' + (isReceivedExpanded ? '' : ' hidden style="display:none"') + '>' +
                    receivedRows.map(function (row) { return controlRowHtml(appId, row, context); }).join('') +
                '</ul>' +
            '</div>';
        }

        return pendingSectionHtml + summaryHtml + receivedSectionHtml;
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
        var entry = getCacheEntry(Number(project.id));
        // A background refresh keeps the last complete snapshot in `control` /
        // `others`. Continue using it until the new response is complete: the
        // activity filters must not briefly disappear while a card is refreshed.
        var hydrated = !!(entry && !entry.error && entry.loadedAt > 0);
        var controlRows = hydrated ? filterControlRows(project, entry.control) : fallbackControlRows(project);
        return {
            entry: entry,
            hydrated: hydrated,
            loading: !!(entry && entry.loading),
            error: !!(entry && entry.error),
            rosterCount: (project && project.testers || []).filter(function (tester) {
                return tester && !tester.is_left_soft && !tester.is_guest_tester && !tester.is_external;
            }).length,
            controlRows: controlRows,
            controlDone: controlRows.filter(function (row) { return row.received; }).length,
            contribution: collectContribution(
                hydrated ? (entry.control || []) : [],
                hydrated ? (entry.others || []) : [],
                project
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
        var list = ['testers'];
        if (data.contribution && data.contribution.length) list.push('contribution');
        if (data.attention && data.attention.length) list.push('attention');
        if (data.controlRows && data.controlRows.length) list.push('control');
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
            return workspaceText(
                'Сначала — 3 и более пропуска подряд, выход тестера и пропущенные действия. Ниже — ожидание доказательства, долг, прямая ссылка и разорванная взаимная связь. Долг и отсутствие взаимки сами по себе не означают нарушение.',
                'First: 3 or more consecutive skips, departed testers and missed actions. Then: pending proof, test debt, direct links and broken mutual links. Debt or no mutual link alone does not mean a violation.'
            );
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
        return Math.max(0, Number(data && data.rosterCount || 0));
    }

    function filterIcon(key) {
        var paths = {
            testers: '<circle cx="8" cy="9" r="3"/><circle cx="16.5" cy="8" r="2.5"/><path d="M2.8 19c.4-3.4 2.2-5.2 5.2-5.2s4.8 1.8 5.2 5.2M13 14.2c1-.9 2.2-1.3 3.6-1.3 2.6 0 4.1 1.7 4.5 4.6"/>',
            contribution: '<path d="M13.2 2.8 5.9 13h5.5l-.7 8.2L18.2 10h-5.6z"/>',
            attention: '<path d="M12 3.2 21 19H3z"/><path d="M12 8.3v5.3M12 16.9h.01"/>',
            control: '<rect x="5" y="4.5" width="14" height="16" rx="2.3"/><path d="M9 4.5v-1h6v1M8.5 10h7M8.5 14h4.5"/><path d="m14.5 17 1.3 1.3 2.7-3"/>',
        };
        return '<svg class="pc-activity__filter-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[key] + '</svg>';
    }

    var lastSeenTabSignatures = new Map();

    function computeTabSignature(key, data) {
        if (!data) return '';
        if (key === 'contribution') {
            var items = data.contribution || [];
            return items.length + ':' + items.map(function (item) {
                return (item.testerId || 0) + '-' + (item.reasons || []).map(function (r) {
                    return (r.kind || '') + (r.proofId || 0) + (r.feedbackId || 0);
                }).join(',');
            }).join(';');
        }
        if (key === 'attention') {
            var items = data.attention || [];
            return items.length + ':' + items.map(function (item) {
                return (item.tester_id || 0) + '-' + (item.reasons || []).map(function (r) {
                    return r.code || '';
                }).join(',');
            }).join(';');
        }
        if (key === 'control') {
            var control = data.control || [];
            var received = control.filter(function (r) { return r.received; });
            return control.length + ':' + received.length + ':' + received.map(function (r) {
                return (r.testerId || 0) + '-' + (r.proofId || 0);
            }).join(',');
        }
        return '';
    }

    function markTabSeen(appId, key, data) {
        var sig = computeTabSignature(key, data);
        lastSeenTabSignatures.set(Number(appId) + ':' + key, sig);
    }

    function filtersHtml(appId, visible, active, data) {
        visible = visible && visible.length ? visible : ['testers'];
        var labels = {
            contribution: text('pcFilterContribution', 'Contribution'),
            attention: text('pcFilterAttention', 'Attention'),
            control: workspaceText('Контроль', 'Control'),
            testers: text('pcFilterAll', 'All'),
        };
        return '<div class="pc-activity__filters tabs-row" role="tablist" aria-label="' + esc(workspaceText('Участники тестирования', 'Test participants')) + '">' +
            visible.map(function (key) {
                var count = filterCount(key, data || {});
                var isActive = key === active;
                if (isActive) {
                    markTabSeen(appId, key, data);
                }
                var hasUnread = false;
                if (key !== 'testers' && !isActive && count > 0) {
                    var tabKey = Number(appId) + ':' + key;
                    if (!lastSeenTabSignatures.has(tabKey)) {
                        hasUnread = true;
                    } else {
                        var prevSig = lastSeenTabSignatures.get(tabKey);
                        var curSig = computeTabSignature(key, data);
                        if (prevSig !== curSig) {
                            hasUnread = true;
                        }
                    }
                }
                var countHtml = '<span class="pc-activity__count' + (key === 'attention' ? ' is-warn' : '') + (hasUnread ? ' has-unread' : '') + '">' + count + '</span>';
                return '<button type="button" class="tab-item pc-activity__filter' + (isActive ? ' is-active' : '') +
                    '" data-activity-filter="' + key +
                    '" role="tab" aria-controls="pc-activity-list-' + Number(appId) + '" aria-selected="' + (isActive ? 'true' : 'false') +
                    '" aria-label="' + esc(labels[key] + ' ' + count) +
                    '" onclick="event.stopPropagation(); pcSetActivityFilter(' + Number(appId) + ', \'' + key + '\')">' +
                    filterIcon(key) +
                    '<span class="pc-activity__filter-label">' + esc(labels[key]) + '</span>' +
                    countHtml +
                    '</button>';
            }).join('') +
        '</div>';
    }

    function karmaButtonHtml(project) {
        var appId = Number(project && project.id || 0);
        var avail = karmaAvailability(project);
        var karmaMax = avail.max;
        var karmaAvail = avail.available;
        var karmaIcon = typeof window.karmaIconHtml === 'function'
            ? window.karmaIconHtml('karma-yin-icon--inline')
            : '<span class="rewards-icon-glyph">☯</span>';

        return '<button type="button" class="rewards-chip-btn pc-activity__karma" ' +
            'title="' + esc(workspaceText('Наградить тестера', 'Reward a tester')) + '" ' +
            'aria-label="' + esc(workspaceText('Наградить тестера. Доступно ', 'Reward a tester. Available ') + karmaAvail + '/' + karmaMax) + '" ' +
            'onclick="event.stopPropagation(); ' +
            (typeof openKarmaDistribution === 'function'
                ? ('openKarmaDistribution(' + appId + ')')
                : 'void 0') +
            '">' +
            '<span class="rewards-icon">' + karmaIcon + '</span>' +
            '<span class="rewards-text"><b>' + karmaAvail + '/' + karmaMax + '</b></span>' +
            '<span class="rewards-arrow" aria-hidden="true">↗</span>' +
        '</button>';
    }

    function filterbarHtml(appId, visible, active, data, project) {
        return '<div class="pc-activity__filterbar">' +
            filtersHtml(appId, visible, active, data) +
            karmaButtonHtml(project) +
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

    function workspaceText(ru, en) {
        return typeof lang !== 'undefined' && lang === 'ru' ? ru : en;
    }

    function captionHtml(appId, filter, mode, project) {
        var historyOn = mode === 'history';

        var histBtn = '<div class="pc-activity__mode pc-activity__mode-pill" role="group" aria-label="' + esc(workspaceText('Период просмотра', 'View period')) + '">' +
            ['now', 'history'].map(function (key) {
                return '<button type="button" aria-pressed="' + (mode === key) + '" class="mode-pill-btn pc-activity__mode-btn' + (mode === key ? ' is-active' : '') +
                    '" onclick="event.stopPropagation(); pcSetActivityMode(' + Number(appId) + ',\'' + key + '\')">' +
                    esc(key === 'now' ? workspaceText('Сейчас', 'Now') : workspaceText('История', 'History')) + '</button>';
            }).join('') + '</div>';

        var hints = {
            contribution: workspaceText('Больше обычного чекина', 'Beyond a regular check-in'),
            attention: workspaceText('Требуется ваше решение', 'Needs your decision'),
            control: workspaceText('Контрольные отчёты сегодня', 'Control reports today'),
            testers: workspaceText('Текущий состав команды', 'Current team'),
        };
        var hintText = historyOn ? workspaceText('Выбранная категория за всё время', 'Selected category over time') : hints[filter];
        var hintHtml = hintText ? (
            '<div class="pc-activity__hint-wrap">' +
                '<div class="pc-activity__hint-scroll" tabindex="0">' +
                    '<span class="pc-activity__hint-text">' + esc(hintText) + '</span>' +
                    '<button type="button" class="pc-activity__info" aria-label="' +
                        esc(text('pcHintInfoAria', 'Filter criteria')) +
                        '" onclick="event.stopPropagation(); pcShowFilterCriteria(\'' + filter + '\')"><svg viewBox="0 0 16 16" width="11" height="11"><circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M7.25 5a.75.75 0 1 1 1.5 0 .75.75 0 0 1-1.5 0ZM8.5 11.5h-1V7h1v4.5Z"/></svg></button>' +
                '</div>' +
            '</div>'
        ) : '<div class="pc-activity__hint-wrap"></div>';

        return '<div class="pc-activity__caption pc-activity__subbar">' +
            hintHtml +
            '<div class="pc-activity__actions">' +
                histBtn +
            '</div>' +
        '</div>';
    }

    function workspaceListHtml(project, filter, mode, data, context) {
        var safeId = Number(project.id);
        return '<div class="pc-activity__list" id="pc-activity-list-' + safeId + '" role="tabpanel">' +
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
        if (mode === 'history') {
            loadFilterHistory(appId, filter, data);
            stopKarmaSparkle(Number(appId));
        } else if (filter === 'control') {
            loadControlReminderStatus(Number(appId));
            stopKarmaSparkle(Number(appId));
        } else if (filter === 'contribution') {
            initKarmaSparkleCycle(Number(appId));
        } else {
            stopKarmaSparkle(Number(appId));
        }
    }

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function flashActivityList(appId) {
        var listEl = document.getElementById('pc-activity-list-' + Number(appId || 0));
        if (!listEl || prefersReducedMotion()) return;
        listEl.classList.remove('pc-activity__list--swap');
        void listEl.offsetWidth;
        listEl.classList.add('pc-activity__list--swap');
    }

    function refreshActivityWorkspace(appId, options) {
        var safeAppId = Number(appId || 0);
        var animate = !!(options && options.animate);
        var root = document.getElementById('pc-today-' + safeAppId);
        var project = projectById(safeAppId);
        if (!root || !project) return;
        var shell = root.querySelector('.pc-activity');
        var insetCard = shell && shell.querySelector('.participants-inset-card');
        if (!shell || !insetCard) {
            root.innerHTML = innerHtml(project);
            afterPaint(safeAppId);
            if (animate) flashActivityList(safeAppId);
            return;
        }
        var data = activityCounts(project);
        var prefs = readPrefs(safeAppId);
        var filter = resolvedFilter(prefs, data);
        var mode = prefs.modes[filter] || 'now';
        var context = contextFor(project);

        var filterbarEl = shell.querySelector('.pc-activity__filterbar');
        var folderBodyEl = shell.querySelector('.pc-activity__folder-body');
        var captionEl = shell.querySelector('.pc-activity__caption');
        var nowEl = document.getElementById('pc-activity-now-' + safeAppId);
        var histEl = document.getElementById('pc-activity-history-' + safeAppId);
        var visible = visibleFilters(data);
        var newFilterbarMarkup = filterbarHtml(safeAppId, visible, filter, data, project);
        if (filterbarEl) {
            var nextFilterbar = document.createElement('div');
            nextFilterbar.innerHTML = newFilterbarMarkup;
            if (nextFilterbar.firstChild) filterbarEl.replaceWith(nextFilterbar.firstChild);
        }
        if (folderBodyEl) folderBodyEl.setAttribute('data-active-filter', filter);
        if (captionEl) {
            var nextCaption = document.createElement('div');
            nextCaption.innerHTML = captionHtml(safeAppId, filter, mode, project);
            if (nextCaption.firstChild) {
                captionEl.replaceWith(nextCaption.firstChild);
            }
        }
        if (nowEl) {
            nowEl.hidden = mode !== 'now';
            if (mode === 'now') nowEl.innerHTML = nowHtmlForFilter(project, filter, data, context);
        }
        if (histEl) histEl.hidden = mode !== 'history';
        afterPaint(safeAppId);
        if (animate) flashActivityList(safeAppId);
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
        var rewardedTodayTesterIds = Array.isArray(project.rewarded_today_tester_ids)
            ? project.rewarded_today_tester_ids.map(function (id) { return Number(id || 0); }).filter(function (id) { return id > 0; })
            : [];
        var rewardBustByTester = {};
        var likes = Array.isArray(project.likes) ? project.likes : [];
        likes.forEach(function (like) {
            var testerId = Number(like && like.tester_id || 0);
            var type = String(like && like.type || '').toLowerCase();
            if (!testerId) return;
            if (!rewardTypesByTester[testerId]) rewardTypesByTester[testerId] = [];
            if (type && rewardTypesByTester[testerId].indexOf(type) === -1) {
                rewardTypesByTester[testerId].push(type);
            }
        });
        (project.testers || []).forEach(function (tester) {
            var testerId = Number(tester && tester.tester_id || 0);
            if (!testerId) return;
            if (tester.rewards_summary) {
                var bust = Number(tester.rewards_summary.feedback_bust || tester.rewards_summary.total_bust || 0);
                if (bust > 0) rewardBustByTester[testerId] = bust;
            }
        });
        var fallbackThanksUsed = likes.filter(function (like) {
            return String(like && like.type || '').toLowerCase() === 'good';
        }).length;
        var fallbackSpecialUsed = likes.filter(function (like) {
            return String(like && like.type || '').toLowerCase() === 'bug';
        }).length;
        var thanksMax = project.thanks_max != null ? Number(project.thanks_max || 0) : 2;
        var specialMax = project.special_max != null ? Number(project.special_max || 0) : 1;
        var thanksUsed = project.thanks_used != null ? Number(project.thanks_used || 0) : fallbackThanksUsed;
        var specialUsed = project.special_used != null ? Number(project.special_used || 0) : fallbackSpecialUsed;
        return {
            project: project,
            rewardsLeft: Math.max(0, Number(project.likes_max || 0) - Number(project.likes_used || 0)),
            rewardedTesterIds: (project.likes || []).map(function (like) { return Number(like.tester_id || 0); }),
            rewardTypesByTester: rewardTypesByTester,
            rewardedTodayTesterIds: rewardedTodayTesterIds,
            rewardBustByTester: rewardBustByTester,
            thanksLeft: Math.max(0, thanksMax - thanksUsed),
            specialLeft: Math.max(0, specialMax - specialUsed),
            screenshotBoostCampaign: project.screenshot_boost_campaign || null,
        };
    }

    function rewardStateForTester(context, testerId) {
        var safeTesterId = Number(testerId || 0);
        var rewardedToday = !!(context && context.rewardedTodayTesterIds && context.rewardedTodayTesterIds.indexOf(safeTesterId) !== -1);
        var canGiveThanks = !rewardedToday && Number(context && context.thanksLeft || 0) > 0;
        var canGiveSpecial = !rewardedToday && Number(context && context.specialLeft || 0) > 0;
        return {
            canReward: canGiveThanks || canGiveSpecial,
            rewardedToday: rewardedToday,
        };
    }

    function innerHtml(project) {
        var data = activityCounts(project);
        var prefs = readPrefs(project.id);
        var filter = resolvedFilter(prefs, data);
        var mode = prefs.modes[filter] || 'now';
        var context = contextFor(project);
        var errorHtml = data.error
            ? '<div class="pc-today__error">' + esc(text('pcTodayLoadError', "Could not load today's reports")) +
                '<button type="button" onclick="event.stopPropagation(); pcRetryToday(' + Number(project.id) + ')">' +
                esc(text('pcTodayRetry', 'Retry')) + '</button></div>'
            : '';
        return '<section class="pc-activity pc-activity--workspace' + (data.loading ? ' is-hydrating' : '') + '">' +
            '<div class="participants-inset-card">' +
                filterbarHtml(project.id, visibleFilters(data), filter, data, project) +
                '<div class="pc-activity__folder-body" data-active-filter="' + filter + '">' +
                    captionHtml(project.id, filter, mode, project) +
                    workspaceListHtml(project, filter, mode, data, context) +
                    errorHtml +
                '</div>' +
            '</div>' +
        '</section>';
    }

    function paint(appId) {
        var safeAppId = Number(appId || 0);
        if (typeof window.deferUntilProjectsScrollIdle === 'function' && window.deferUntilProjectsScrollIdle(
            'project-activity-' + safeAppId,
            function() { paint(safeAppId); }
        )) return;
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
        var entry = getCacheEntry(Number(project.id));
        if (entry && !entry.loading && !entry.error && (Date.now() - entry.loadedAt) < CACHE_TTL_MS) {
            loadPendingThumbnails(Number(project.id), { scope: '.pc-activity__list' });
            return;
        }
        ensureObserver();
        if (observer) observer.observe(root);
        else hydrate(Number(project.id));
    }

    function recordFeedbackReward(appId, feedbackId, extra) {
        var safeAppId = Number(appId || 0);
        var safeFeedbackId = Number(feedbackId || 0);
        var rewardBust = Number((extra && (extra.reward_bust || extra.rewardBust)) || 0);
        var testerId = Number((extra && (extra.tester_id || extra.user_id || extra.author_id)) || 0);

        if (!testerId && safeFeedbackId && Array.isArray(window._activeProjectFeedbackItems)) {
            var found = window._activeProjectFeedbackItems.find(function (item) {
                return Number(item && item.id) === safeFeedbackId;
            });
            if (found) {
                testerId = Number(found.user_id || found.tester_id || found.author_id || 0);
            }
        }

        if (testerId && rewardBust > 0) {
            optimisticFeedbackBustByTester[testerId] = (Number(optimisticFeedbackBustByTester[testerId]) || 0) + rewardBust;
        }

        if (safeAppId) {
            refreshActivityWorkspace(safeAppId);
        }
    }

    window.ProjectToday = {
        buildSection: buildSection,
        mount: mount,
        isControlDay: isControlDay,
        getCacheEntry: getCacheEntry,
        recordFeedbackReward: recordFeedbackReward,
        invalidate: function (appId) {
            var safeAppId = Number(appId || 0);
            var current = cache.get(safeAppId);
            if (current && current.loading) return;
            deleteCacheEntry(safeAppId);
        },
        refresh: function (appId, options) {
            var safeAppId = Number(appId || 0);
            if (!safeAppId) return;
            if (!window.App || window.App.testingControlEnabled !== true) return;
            var project = projectById(safeAppId);
            var status = String(project && (project.app_status || project.status) || 'active').toLowerCase();
            if (!project || (status !== 'active' && status !== 'pending_completion')) return;
            var current = getCacheEntry(safeAppId);
            if (current && current.loading) return;
            var maxAgeMs = Math.max(0, Number(options && options.maxAgeMs || 0));
            if (current && !current.error && maxAgeMs > 0 && (Date.now() - current.loadedAt) < maxAgeMs) return;
            var root = document.getElementById('pc-today-' + safeAppId);
            if (!root) return;
            ensureObserver();
            if (observer) observer.observe(root);
            else hydrate(safeAppId);
        },
    };

    window.pcShowBoostBonusToast = function () {
        var msg = text('pcBoostBonusToast', 'Today, a tester received a bonus from your rewards pool for submitting additional reports.');
        if (typeof showToast === 'function') {
            showToast(msg);
        }
    };

    window.pcRevealTesterNickname = function (trigger, event) {
        if (event) event.stopPropagation();
        var identity = trigger && trigger.closest ? trigger.closest('.pc-person__identity') : null;
        if (!identity) return;
        var revealed = identity.classList.toggle('is-nickname-revealed');
        trigger.setAttribute('aria-expanded', revealed ? 'true' : 'false');
        var handle = identity.querySelector('.pc-person__handle--reveal');
        if (handle) {
            if (revealed) handle.removeAttribute('tabindex');
            else handle.setAttribute('tabindex', '-1');
        }
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcSetActivityFilter = function (appId, filter) {
        var prefs = readPrefs(appId);
        prefs.filter = ACTIVITY_FILTERS.indexOf(filter) !== -1 ? filter : 'testers';
        if (prefs.filter === 'contribution') {
            prefs.modes.contribution = 'now';
        }
        writePrefs(appId, prefs);
        var entry = getCacheEntry(appId);
        if (entry) {
            markTabSeen(appId, prefs.filter, {
                control: entry.control || [],
                others: entry.others || [],
                contribution: collectContribution(entry.control, entry.others, projectById(appId)),
                attention: collectAttention(projectById(appId)),
            });
        }
        refreshActivityWorkspace(appId, { animate: true });
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
        refreshActivityWorkspace(appId, { animate: true });
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
        deleteCacheEntry(Number(appId || 0));
        hydrate(appId);
    };

    window.pcOpenFeedback = function (appId, feedbackId) {
        var fid = Number(feedbackId || 0);
        if (fid > 0) {
            sessionReviewedItems.add('fb:' + fid);
            var btn = document.querySelector('[onclick*="pcOpenFeedback(' + Number(appId) + ',' + fid + ')"]');
            if (btn) {
                var step = btn.closest('.pc-activity-timeline-step');
                if (step) {
                    step.classList.remove('is-pending');
                    step.classList.add('is-completed');
                }
            }
        }
        if (typeof openProjectFeedback !== 'function' || fid <= 0) return;
        openProjectFeedback(Number(appId || 0), false, {
            focusFeedbackId: fid,
            preferUnprocessed: false,
        });
    };

    window.getTesterTodayBoost = function (appId, testerId) {
        var safeAppId = Number(appId || 0);
        var safeTesterId = Number(testerId || 0);
        if (safeAppId <= 0 || safeTesterId <= 0) return 0;
        var project = projectById(safeAppId);
        if (!project) return 0;
        var context = contextFor(project);
        var counts = activityCounts(project);
        var item = (counts && counts.contribution || []).find(function (c) {
            return Number(c.testerId) === safeTesterId;
        });
        return getTesterBoostBust(context, safeTesterId, item);
    };

    window.pcRewardTester = function (appId, testerId) {
        if (typeof openKarmaSelectPopup === 'function') openKarmaSelectPopup(Number(appId || 0), Number(testerId || 0));
        else if (typeof openKarmaDistribution === 'function') openKarmaDistribution(Number(appId || 0));
    };

    window.pcRemindTester = function (appId, testerId, reasonCode, extraData) {
        var safeAppId = Number(appId || 0);
        var safeTesterId = Number(testerId || 0);
        var project = projectById(safeAppId);
        var tester = project && (project.testers || []).find(function (item) {
            return Number(item && item.tester_id) === safeTesterId;
        });
        if (!tester || typeof openBellRemindPreview !== 'function') return;
        var skips = extraData && extraData.skips != null
            ? Number(extraData.skips)
            : Number(tester.consecutive_skips || 0);
        var day = extraData && extraData.day != null
            ? Number(extraData.day)
            : Number(tester.current_day || tester.testing_days || 0);

        openBellRemindPreview({
            username: String(tester.username || '').replace(/^@+/, ''),
            fullName: tester.full_name || '',
            avatarUrl: tester.avatar_url || '',
            testerId: safeTesterId,
            remindAppId: safeAppId,
            remindAppName: project.name || '',
            remindReason: reasonCode || 'regular',
            consecutiveSkips: skips,
            controlDay: day,
            onSent: function (target) {
                markTesterRemindedToday(safeAppId, safeTesterId);
                if (target !== 'dm') {
                    refreshActivityWorkspace(safeAppId);
                    return;
                }
                fetch(API_BASE + '/projects/' + safeAppId + '/testing-control/personal-reminder-opened', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ init_data: initData(), tester_id: safeTesterId }),
                }).then(function (response) {
                    if (!response.ok) throw new Error('personal_reminder_failed');
                    return response.json();
                }).then(function (payload) {
                    if (!payload || payload.status !== 'success' || !payload.personal_dm_opened_at) {
                        throw new Error('personal_reminder_failed');
                    }
                    var state = controlReminderStates.get(safeAppId);
                    if (state && Array.isArray(state.items)) {
                        state.items.forEach(function (item) {
                            if (Number(item.tester_id) === safeTesterId) item.personal_dm_opened_at = payload.personal_dm_opened_at;
                        });
                        controlReminderStates.set(safeAppId, state);
                    }
                    refreshActivityWorkspace(safeAppId);
                }).catch(function () {
                    // Do not show a receipt when its durable write was not confirmed.
                    refreshActivityWorkspace(safeAppId);
                });
            },
        });
    };

    function reminderTime(value) {
        if (!value) return '—';
        return new Date(value).toLocaleTimeString(typeof lang !== 'undefined' && lang === 'ru' ? 'ru-RU' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    function controlReminderFeedbackHtml(state) {
        if (!state) return '';
        if (state.error) return '<span class="is-error">' + esc(text('pcRemindersFailed', 'Could not send reminders. Please retry.')) + '</span>';
        var items = state.items || [];
        var sent = items.filter(function(item) { return item.status === 'sent'; });
        var unavailable = items.filter(function(item) { return ['unavailable', 'failed', 'rate_limited'].indexOf(item.status) !== -1; });
        var uncertain = items.filter(function(item) { return ['reserved', 'uncertain'].indexOf(item.status) !== -1; });
        var at = sent.map(function(item) { return item.sent_at || ''; }).sort().pop();
        return (sent.length ? '<span class="is-sent">' + esc(text('pcRemindersSentCount', 'Reminders sent via bot: {count} · {time}', { count: sent.length, time: reminderTime(at) })) + '</span>' : '') +
            (unavailable.length ? '<span class="is-error">' + esc(text('pcRemindersUnavailableCount', 'Not delivered: {count}', { count: unavailable.length })) + '</span>' : '') +
            (uncertain.length ? '<span>' + esc(text('pcRemindersUnconfirmedCount', 'Delivery unconfirmed: {count}', { count: uncertain.length })) + '</span>' : '');
    }

    async function loadControlReminderStatus(appId, force) {
        var previous = controlReminderStates.get(Number(appId));
        if (!force && previous && (previous.loading || Date.now() - previous.loadedAt < CACHE_TTL_MS)) return;
        controlReminderStates.set(Number(appId), Object.assign({}, previous, { loading: true }));
        try {
            var payload = await requestJson(API_BASE + '/projects/' + Number(appId) + '/testing-control/reminders?init_data=' + encodeURIComponent(initData()));
            controlReminderStates.set(Number(appId), Object.assign({}, payload, { loadedAt: Date.now(), loading: false }));
            refreshActivityWorkspace(appId);
        } catch (_) {
            controlReminderStates.set(Number(appId), Object.assign({}, previous, { loadedAt: Date.now(), loading: false }));
        }
    }

    function playBellRemindAnimation(appId) {
        var safeAppId = Number(appId || 0);
        var container = document.getElementById('pc-today-' + safeAppId) || document.getElementById('project-card-' + safeAppId);
        if (!container) return;
        var existing = container.querySelector('.pc-bell-anim-overlay');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

        var overlay = document.createElement('div');
        overlay.className = 'pc-bell-anim-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="pc-bell-anim-card">' +
            '<div class="pc-bell-anim-ripple"></div>' +
            '<div class="pc-bell-anim-ripple pc-bell-anim-ripple--2"></div>' +
            '<div class="pc-bell-anim-icon">' +
                '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>' +
            '</div>' +
            '<span class="pc-bell-anim-text">' + esc(text('pcControlRemindAllSuccess', 'Reminders sent')) + '</span>' +
        '</div>';
        if (!container.style.position) container.style.position = 'relative';
        container.appendChild(overlay);

        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
            setTimeout(function () {
                if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
            }, 180);
            setTimeout(function () {
                if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
            }, 360);
        }

        setTimeout(function () {
            overlay.classList.add('is-fade-out');
            setTimeout(function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 360);
        }, 1400);
    }

    window.pcToggleReceivedSection = function (appId) {
        var safeAppId = Number(appId || 0);
        if (expandedReceived.has(safeAppId)) {
            expandedReceived.delete(safeAppId);
        } else {
            expandedReceived.add(safeAppId);
            var data = cache.get(safeAppId);
            var count = (data && data.controlRows || []).filter(function (r) { return r.received; }).length;
            lastSeenReceivedCounts.set(safeAppId, count);
        }
        refreshActivityWorkspace(safeAppId);
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.selectionChanged();
        }
    };

    window.pcRemindAllPendingControl = async function (appId) {
        var safeAppId = Number(appId || 0);
        var project = projectById(safeAppId);
        if (!project || controlReminderSending.has(safeAppId)) return;
        controlReminderSending.add(safeAppId);
        refreshActivityWorkspace(safeAppId);
        try {
            var response = await fetch(API_BASE + '/projects/' + safeAppId + '/testing-control/reminders', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ init_data: initData() }),
            });
            var payload = await response.json();
            if (!response.ok || payload.status !== 'success') throw new Error('reminders_failed');
            controlReminderStates.set(safeAppId, Object.assign({}, payload, { loadedAt: Date.now() }));
            playBellRemindAnimation(safeAppId);
            if (typeof showToast === 'function') showToast(text('pcRemindersResultToast', 'DMs sent: {count}', { count: Number(payload.sent_count || 0) }));
        } catch (_) {
            var previous = controlReminderStates.get(safeAppId) || {};
            controlReminderStates.set(safeAppId, Object.assign({}, previous, { error: true }));
        } finally {
            controlReminderSending.delete(safeAppId);
            refreshActivityWorkspace(safeAppId);
        }
    };

    window.pcOfferMutual = function (appId, testerId, event) {
        if (event && event.stopPropagation) event.stopPropagation();
        var safeAppId = Number(appId || 0);
        var safeTesterId = Number(testerId || 0);
        var project = projectById(safeAppId);
        var tester = project && (project.testers || []).find(function (item) {
            return Number(item && item.tester_id) === safeTesterId;
        });
        var username = String(tester && (tester.username || '')).replace(/^@+/, '');
        if (typeof openDossierModal === 'function') {
            openDossierModal(username, safeTesterId, safeAppId);
        }
    };

    function removeCatchupProofRequestDialog() {
        var dialog = document.getElementById('pc-catchup-proof-request-dialog');
        if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    function openCatchupProofRequestDialog(appId, testerId) {
        removeCatchupProofRequestDialog();
        var project = projectById(appId);
        var tester = project && (project.testers || []).find(function (item) {
            return Number(item && item.tester_id || 0) === Number(testerId || 0);
        });
        if (!project || !tester) return;
        var catchup = catchupStateFor(project, tester);
        var day = Number(catchup && catchup.requestableMissedDay || 0);
        if (!isCatchupControlDay(day)) {
            var yesterdayDay = testerDayNumber(tester) - 1;
            day = isCatchupControlDay(yesterdayDay) ? yesterdayDay : 0;
        }
        if (!isCatchupControlDay(day)) return;
        var html = '<div id="pc-catchup-proof-request-dialog" class="modal-overlay pc-catchup-request-modal" role="presentation" onclick="if (event.target === this) pcCloseCatchupProofRequestDialog()">' +
            '<section class="modal-content pc-catchup-request-sheet" role="dialog" aria-modal="true" aria-labelledby="pc-catchup-request-title">' +
                '<div class="sheet-handle" aria-hidden="true"></div>' +
                '<div class="pc-catchup-request-sheet__head">' +
                    '<div class="pc-catchup-request-sheet__icon" aria-hidden="true">' + ICONS.image + '</div>' +
                    '<div><h3 id="pc-catchup-request-title">' + esc(text('pcCatchupRequestTitle', 'Catch-up control proof')) + '</h3>' +
                    '<p>' + esc(text('pcCatchupRequestDay', 'Control day {day}', { day: day })) + '</p></div>' +
                '</div>' +
                '<div class="pc-catchup-request-sheet__tester">' + avatarHtml(tester) +
                    '<span>' + esc(handleOf(tester)) + '</span></div>' +
                '<p class="pc-catchup-request-sheet__lead">' +
                    esc(text('pcCatchupRequestLead', 'The control proof for day {day} was missed. Send a request to complete it?', { day: day })) +
                '</p>' +
                '<ul class="pc-catchup-request-sheet__facts">' +
                    '<li>' + esc(text('pcCatchupRequestFactRegular', 'One screenshot, Bug, or Idea with a screenshot on the next regular day will close the request.')) + '</li>' +
                    '<li>' + esc(text('pcCatchupRequestFactBothWays', 'A catch-up report also completes today\'s test. Conversely, today\'s test with a screenshot closes one catch-up request.')) + '</li>' +
                    '<li>' + esc(text('pcCatchupRequestFactPenalty', 'Karma changes only if the test ends while this request is still open.')) + '</li>' +
                '</ul>' +
                '<div class="pc-catchup-request-sheet__actions">' +
                    '<button type="button" class="btn btn-secondary" onclick="pcCloseCatchupProofRequestDialog()">' +
                        esc(text('pcCancel', 'Cancel')) + '</button>' +
                    '<button id="pc-catchup-request-submit" type="button" class="btn btn-primary" onclick="pcSubmitCatchupProofRequest(' + Number(appId) + ',' + Number(testerId) + ')">' +
                        esc(text('pcRequestProof', 'Request proof')) + '</button>' +
                '</div>' +
            '</section>' +
        '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var dialog = document.getElementById('pc-catchup-proof-request-dialog');
        window.requestAnimationFrame(function () {
            if (dialog) dialog.classList.add('active');
        });
    }

    window.pcCloseCatchupProofRequestDialog = function () {
        var dialog = document.getElementById('pc-catchup-proof-request-dialog');
        if (!dialog) return;
        dialog.classList.remove('active');
        window.setTimeout(removeCatchupProofRequestDialog, 220);
    };

    window.pcRequestCatchupProof = function (appId, testerId) {
        openCatchupProofRequestDialog(Number(appId), Number(testerId));
    };

    window.pcSubmitCatchupProofRequest = async function (appId, testerId) {
        var submit = document.getElementById('pc-catchup-request-submit');
        if (submit && submit.disabled) return;
        if (submit) {
            submit.disabled = true;
            submit.setAttribute('aria-busy', 'true');
            submit.classList.add('is-loading');
            submit.textContent = text('pcCatchupRequestSending', 'Sending…');
        }
        try {
            var response = await fetch(API_BASE + '/projects/' + Number(appId) + '/testing-control/catchup-proof-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ init_data: initData(), tester_id: Number(testerId) }),
            });
            var payload = await response.json();
            if (!response.ok || payload.status !== 'success') throw new Error(payload.error || payload.detail || 'catchup_request_failed');
            if (typeof showToast === 'function') showToast(text('pcCatchupRequestSent', 'Proof request sent'));
            window.pcCloseCatchupProofRequestDialog();
            deleteCacheEntry(Number(appId));
            hydrate(appId);
        } catch (_) {
            if (typeof showToast === 'function') showToast(text('pcCatchupRequestFailed', 'Could not request proof'));
            if (submit) {
                submit.disabled = false;
                submit.removeAttribute('aria-busy');
                submit.classList.remove('is-loading');
                submit.textContent = text('pcRequestProof', 'Request');
            }
        }
    };

    window.pcCloseCatchupProofRequest = async function (appId, requestId) {
        if (Number(requestId || 0) <= 0) return;
        try {
            var response = await fetch(API_BASE + '/projects/' + Number(appId) + '/testing-control/catchup-proof-requests/' + Number(requestId) + '/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ init_data: initData() }),
            });
            var payload = await response.json();
            if (!response.ok || payload.status !== 'success') throw new Error(payload.error || payload.detail || 'catchup_close_failed');
            if (typeof showToast === 'function') showToast(text('pcCatchupClosed', 'Proof request closed'));
            deleteCacheEntry(Number(appId));
            hydrate(appId);
        } catch (_) {
            if (typeof showToast === 'function') showToast(text('pcCatchupCloseFailed', 'Could not close proof request'));
        }
    };

    window.pcOpenProof = function (appId, proofId, mediaIndex) {
        var row = findRow(appId, proofId);
        if (typeof openCheckinProofPreview !== 'function') return;
        openCheckinProofPreview(Number(proofId || 0), Number(mediaIndex || 0), {
            imageCount: Number(row && row.imageCount || 1),
            title: row ? handleOf(row.tester) : '',
            subtitle: row ? workspaceText('День ', 'Day ') + row.day : '',
        });
    };

    window.pcOpenProofOverview = function(appId, proofId, fallbackCount) {
        var pid = Number(proofId || 0);
        if (pid > 0) {
            sessionReviewedItems.add('proof:' + pid);
            var btn = document.querySelector('[onclick*="pcOpenProofOverview(' + Number(appId) + ',' + pid + '"]');
            if (btn) {
                var step = btn.closest('.pc-activity-timeline-step');
                if (step) {
                    step.classList.remove('is-pending');
                    step.classList.add('is-completed');
                }
            }
        }
        var row = findRow(appId, proofId);
        if (typeof openCheckinProofOverview !== 'function') return;
        openCheckinProofOverview(Number(proofId), {
            imageCount: Number(row && row.imageCount || fallbackCount || 1),
            title: row ? handleOf(row.tester) : '',
            subtitle: row ? workspaceText('День ', 'Day ') + row.day : '',
        });
    };
})();
