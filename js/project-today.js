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
    var observer = null;
    var expandedOthers = new Set();

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
                    url: index === 0 ? (thumbnailByProofId[proofId] || '') : '',
                    overflow: (index === visible - 1 && total > visible) ? (total - visible) : 0,
                });
            }
            return slots;
        }
        if (FEEDBACK_PROOF_TYPES.indexOf(type) !== -1) {
            return [{ proofId: proofId, mediaIndex: 0, url: '', overflow: 0 }];
        }
        return [];
    }

    function buildRow(item, thumbnailByProofId) {
        var entry = todayEntryFor(item);
        var state = String(entry && entry.state || '');
        var checked = state === 'checked' || state === 'checked_overtime';
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
            } catch (_) {
                row.feedbackStatus = '';
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
                thumbnailByProofId[Number(shot.proof_id || 0)] = mediaUrl(shot.thumbnail_url);
            });

            var control = [];
            var others = [];
            var project = projectById(safeAppId);
            (results[0].items || []).forEach(function (item) {
                if (isExcludedControlTester(project, item)) return;
                var row = buildRow(item, thumbnailByProofId);
                if (row.day <= 0) return;
                if (isControlDay(row.day)) control.push(row);
                else if (row.proofId > 0) others.push(row);
            });

            await attachFeedbackStatuses(control);
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

    async function loadPendingThumbnails(appId) {
        var root = document.getElementById('pc-today-' + Number(appId || 0));
        if (!root || !galleryEnabled()) return;
        Array.prototype.slice.call(root.querySelectorAll('img[data-pc-src]')).forEach(function (image) {
            if (image.getAttribute('src')) return;
            image.setAttribute('src', image.getAttribute('data-pc-src'));
        });
        var pending = Array.prototype.slice.call(root.querySelectorAll('img[data-pc-ticket]')).slice(0, MAX_TICKET_REQUESTS);
        for (var index = 0; index < pending.length; index += 1) {
            var image = pending[index];
            if (image.getAttribute('src')) continue;
            var parts = String(image.getAttribute('data-pc-ticket') || '').split(':');
            try {
                var url = await requestThumbnailTicket(Number(parts[0]), Number(parts[1]));
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
        var source = slot.url
            ? ' data-pc-src="' + esc(slot.url) + '"'
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

    function feedbackActionHtml(appId, row) {
        if (row.feedbackId <= 0) return '';
        if (isProcessed(row)) {
            return '<span class="pc-linkaction is-done">' + esc(text('pcProcessedLabel', 'Processed')) + '</span>';
        }
        return '<button type="button" class="pc-linkaction" onclick="event.stopPropagation(); pcOpenFeedback(' +
            Number(appId) + ',' + Number(row.feedbackId) + ')">' + esc(text('pcProcessBtn', 'Process')) + '</button>';
    }

    function rewardActionHtml(appId, row, context) {
        if (!row.received) {
            return '<button type="button" class="pc-action pc-action--remind" onclick="event.stopPropagation(); pcRemindTester(' +
                Number(appId) + ',' + Number(row.testerId) + ')">' + esc(text('pcRemindBtn', 'Remind')) + '</button>';
        }
        if (context.rewardedTesterIds.indexOf(Number(row.testerId)) !== -1) {
            return '<span class="pc-action pc-action--done">☯️ ' + esc(text('pcRewardedLabel', 'Rewarded')) + '</span>';
        }
        if (context.rewardsLeft <= 0) return '';
        return '<button type="button" class="pc-action pc-action--reward" onclick="event.stopPropagation(); pcRewardTester(' +
            Number(appId) + ',' + Number(row.testerId) + ')">' + esc(text('pcRewardBtn', 'Reward')) + '</button>';
    }

    function controlRowHtml(appId, row, context) {
        return '<li class="pc-row' + (row.received ? ' is-received' : ' is-waiting') + '">' +
            '<div class="pc-row__top">' +
                avatarHtml(row.tester) +
                '<span class="pc-row__ident">' +
                    '<span class="pc-row__name notranslate">' + esc(handleOf(row.tester)) + '</span>' +
                    '<span class="pc-row__meta">' + stateHtml(row) + feedbackActionHtml(appId, row) + '</span>' +
                '</span>' +
                rewardActionHtml(appId, row, context) +
            '</div>' +
            slotsHtml(appId, row) +
        '</li>';
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
                Number(project.id) + ');">' + esc(text('karmaRewards', '☯️ Rewards: {count}', { count: context.rewardsLeft })) + '</button>'
            : '';
        return '<section class="pc-control' + (entry && entry.loading ? ' is-hydrating' : '') + '">' +
            '<header class="pc-control__head">' +
                '<span class="pc-control__mark" aria-hidden="true">🛡</span>' +
                '<span class="pc-control__titles">' +
                    '<span class="pc-control__title">' + esc(text('pcControlTitle', 'Control day today')) + '</span>' +
                    '<span class="pc-control__sub">' + esc(text('pcControlSubtitle', 'Proof is required')) + '</span>' +
                '</span>' +
                '<span class="pc-control__count' + (done >= rows.length ? ' is-complete' : '') + '">' +
                    esc(text('pcControlCount', '{done} of {total}', { done: done, total: rows.length })) +
                '</span>' +
                rewardChip +
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
        var body = expanded
            ? '<div class="pc-others__grid">' + rows.map(function (row) { return gridCardHtml(project.id, row); }).join('') + '</div>' +
              '<button type="button" class="pc-others__deep" onclick="event.stopPropagation(); openTestingControl(' + Number(project.id) + ', { archived: false });">' +
                  esc(text('pcOpenTestingControl', 'Open Testing Control')) + '<span class="pc-others__deep-arrow" aria-hidden="true">→</span>' +
              '</button>'
            : '';
        return '<section class="pc-others' + (expanded ? ' is-open' : '') + '">' +
            '<button type="button" class="pc-others__head" onclick="event.stopPropagation(); pcToggleOthers(' + Number(project.id) + ')">' +
                '<span class="pc-others__mark" aria-hidden="true">🗂</span>' +
                '<span class="pc-others__titles">' +
                    '<span class="pc-others__title">' + esc(text('pcOthersTitle', 'Other reports today')) + ' · ' + rows.length + '</span>' +
                    '<span class="pc-others__sub">' + esc(text('pcOthersSubtitle', 'Outside the control day')) + '</span>' +
                '</span>' +
                '<span class="pc-others__toggle">' + esc(expanded ? text('pcOthersHide', 'Hide') : text('pcOthersShow', 'Show')) + '</span>' +
            '</button>' +
            body +
        '</section>';
    }

    /* ───────────────────────────── public surface ──────────────────────────── */

    function contextFor(project) {
        return {
            rewardsLeft: Math.max(0, Number(project.likes_max || 0) - Number(project.likes_used || 0)),
            rewardedTesterIds: (project.likes || []).map(function (like) { return Number(like.tester_id || 0); }),
        };
    }

    function innerHtml(project) {
        var entry = cache.get(Number(project.id));
        var hydrated = !!(entry && !entry.loading && !entry.error && entry.loadedAt > 0);
        var rows = hydrated ? filterControlRows(project, entry.control) : fallbackControlRows(project);
        var errorHtml = entry && entry.error
            ? '<div class="pc-today__error">' + esc(text('pcTodayLoadError', "Could not load today's reports")) +
                '<button type="button" onclick="event.stopPropagation(); pcRetryToday(' + Number(project.id) + ')">' +
                esc(text('pcTodayRetry', 'Retry')) + '</button></div>'
            : '';
        return controlSectionHtml(project, rows, contextFor(project), entry) +
            (hydrated ? othersSectionHtml(project, entry) : '') +
            errorHtml;
    }

    function paint(appId) {
        var safeAppId = Number(appId || 0);
        var root = document.getElementById('pc-today-' + safeAppId);
        var project = projectById(safeAppId);
        if (!root || !project) return;
        root.innerHTML = innerHtml(project);
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
        if (!window.App || window.App.testingControlEnabled !== true) return;
        var status = String(project.app_status || project.status || 'active').toLowerCase();
        if (status !== 'active' && status !== 'pending_completion') return;
        var root = cardEl && cardEl.querySelector('#pc-today-' + Number(project.id));
        if (!root) return;
        var entry = cache.get(Number(project.id));
        if (entry && !entry.loading && !entry.error && (Date.now() - entry.loadedAt) < CACHE_TTL_MS) {
            loadPendingThumbnails(Number(project.id));
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

    window.pcToggleOthers = function (appId) {
        var safeAppId = Number(appId || 0);
        if (expandedOthers.has(safeAppId)) expandedOthers.delete(safeAppId);
        else expandedOthers.add(safeAppId);
        paint(safeAppId);
        loadPendingThumbnails(safeAppId);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.pcRetryToday = function (appId) {
        cache.delete(Number(appId || 0));
        hydrate(appId);
    };

    window.pcOpenFeedback = function (appId, feedbackId) {
        if (typeof openProjectFeedback !== 'function' || Number(feedbackId || 0) <= 0) return;
        openProjectFeedback(Number(appId || 0), false, { focusFeedbackId: Number(feedbackId) });
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

    window.pcOpenProof = function (appId, proofId) {
        var row = findRow(appId, proofId);
        var type = String(row && row.proofType || '');
        if (FEEDBACK_PROOF_TYPES.indexOf(type) !== -1 && Number(row && row.feedbackId || 0) > 0) {
            window.pcOpenFeedback(appId, row.feedbackId);
            return;
        }
        if (typeof openCheckinProofPreview !== 'function') return;
        openCheckinProofPreview(Number(proofId || 0), 0, {
            imageCount: Number(row && row.imageCount || 1),
            title: row ? handleOf(row.tester) : '',
            subtitle: row ? text('pcDayOf', 'Day {day} / {total}', { day: row.day, total: 14 }) : '',
        });
    };
})();
