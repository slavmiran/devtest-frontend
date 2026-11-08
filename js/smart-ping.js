/* Paid targeted reminder sheet: Smart Ping. */
(function () {
    'use strict';

    var COST = 10;
    var COOLDOWN_MS = 6 * 60 * 60 * 1000;
    var LEFT_STATUSES = ['abandoned', 'justified_exit', 'dropped', 'kicked_by_owner', 'canceled_neutral'];
    var CONTROL_DAYS = [1, 4, 7, 10, 14];
    var SECTION_ORDER = ['both', 'attention', 'control', 'rhythm'];
    var pendingMemory = {};
    var state = {
        appId: 0,
        filter: 'risk',
        recipients: [],
        sending: false,
        generation: 0,
        view: 'select',
        delivery: null,
        pending: null,
        checking: false,
        pollTimer: null,
        request: null,
        pollUntil: 0,
        errorCode: '',
    };

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var value = window.t(key, params || {}, typeof lang !== 'undefined' ? lang : undefined);
            if (value && value !== key) return value;
        }
        var out = fallback || key;
        Object.keys(params || {}).forEach(function (name) {
            out = String(out).split('{' + name + '}').join(params[name]);
        });
        return out;
    }
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }
    function projects() {
        return typeof myProjects !== 'undefined' && Array.isArray(myProjects) ? myProjects : [];
    }
    function projectById(id) {
        return projects().find(function (project) {
            return Number(project.id || project.app_id) === Number(id);
        });
    }
    function initData() {
        return typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
    }
    function balance() {
        return Math.max(0, Number((typeof visibilityStats !== 'undefined' && visibilityStats && visibilityStats.balance_bust) || 0) || 0);
    }
    function formatBust(value) {
        var amount = Math.max(0, Number(value || 0));
        return (Math.round(amount * 10) / 10).toFixed(1);
    }
    function currentFilter(appId) {
        var folder = document.querySelector('#pc-today-' + Number(appId || 0) + ' [data-active-filter]');
        return folder ? String(folder.getAttribute('data-active-filter') || '') : '';
    }
    function isHotFilter(filter) {
        return filter === 'attention' || filter === 'control';
    }
    function isArmed(appId) {
        return isHotFilter(currentFilter(appId));
    }
    function sync(appId, filter) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return;
        var project = projectById(safeId);
        var wait = cooldownRemaining(project);
        var isCooldown = wait > 0;
        var armed = !isCooldown && (arguments.length > 1 ? isHotFilter(filter) : isArmed(safeId));
        document.querySelectorAll('[data-smart-ping="' + safeId + '"]').forEach(function (btn) {
            btn.classList.toggle('is-armed', armed);
            btn.classList.toggle('is-cooldown', isCooldown);
            if (isCooldown) {
                btn.title = text('smartPingCooldownTitle', 'Smart Ping: кулдаун (повторно через {time})', { time: formatCooldown(wait) });
            } else {
                btn.title = text('smartPingAria', 'Smart Ping');
            }
        });
    }
    function arm(appId) {
        sync(appId, 'attention');
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
    function testerIdOf(source, fallback) {
        return Number((source && (source.testerId || source.tester_id || source.id)) || fallback || 0);
    }
    function testerDay(tester, row) {
        if (row && Number(row.day || 0) > 0) return Number(row.day);
        return Number((tester && (tester.testing_days || tester.current_day)) || 0);
    }
    function isControlDay(day) {
        if (window.ProjectToday && typeof window.ProjectToday.isControlDay === 'function') {
            return window.ProjectToday.isControlDay(day);
        }
        return CONTROL_DAYS.indexOf(Number(day || 0)) !== -1;
    }
    function skipsCount(tester) {
        if (typeof calculateConsecutiveSkips === 'function') {
            return Math.max(0, Number(calculateConsecutiveSkips(tester) || 0));
        }
        return Math.max(0, Number(tester && tester.consecutive_skips || 0));
    }
    function skipsLabel(count) {
        var n = Number(count || 0);
        return text('pcAttentionSkips', '{count} дн. без тестирования подряд', { count: n });
    }
    function hasLeft(item, tester) {
        if (!tester) return true;
        if (tester.is_left_soft || tester.is_guest_tester || tester.is_external) return true;
        var status = String(tester.status || '').trim().toLowerCase();
        if (LEFT_STATUSES.indexOf(status) !== -1) return true;
        return (item && item.reasons || []).some(function (reason) {
            return String(reason && reason.code || '') === 'tester_left';
        });
    }
    function reasonCodes(item) {
        return (item && item.reasons || []).map(function (reason) {
            return String(reason && reason.code || '');
        });
    }
    function assessmentOf(row, tester, project) {
        if (row && row.activityAssessment) return row.activityAssessment;
        if (tester && tester.activityAssessment) return tester.activityAssessment;
        if (typeof calculateTesterControlActivityAssessment === 'function') {
            return calculateTesterControlActivityAssessment(row || tester, project) || { riskScore: 0 };
        }
        return { riskScore: 0 };
    }
    function signalScore(assessment) {
        return Math.max(0, Math.min(4, Number(assessment && assessment.riskScore || 0)));
    }
    function signalFactors(assessment) {
        var factors = [];
        if (!assessment) return factors;
        if (assessment.yesterday && assessment.yesterday.risk) factors.push(text('pcSignalFactorYesterday', 'вчера'));
        if (assessment.skips && assessment.skips.risk) factors.push(text('pcSignalFactorSkips', 'пропуски'));
        if (assessment.rhythm && assessment.rhythm.risk) factors.push(text('pcSignalFactorRhythm', 'ритм'));
        if (assessment.profile && assessment.profile.risk) factors.push(text('pcSignalFactorProfile', 'профиль'));
        return factors;
    }
    function signalDetail(assessment) {
        var score = signalScore(assessment);
        var factors = signalFactors(assessment);
        if (score <= 0) return '';
        if (score === 1) return text('smartPingSignalsOne', '1 сигнал: {factor}', { factor: factors[0] || '' });
        if (score === 2) return text('smartPingSignalsTwo', '2 сигнала: {f1} + {f2}', { f1: factors[0] || '', f2: factors[1] || '' });
        if (score === 3) return text('smartPingSignalsThree', '3 сигнала: {f1} + {f2} + {f3}', { f1: factors[0] || '', f2: factors[1] || '', f3: factors[2] || '' });
        return text('smartPingSignalsAll', '4 сигнала: все факторы');
    }
    function signalsCountLabel(score) {
        var n = Number(score || 0);
        if (n <= 0) return '';
        if (n === 1) return text('smartPingSignalsCountOne', '1 сигнал');
        if (n === 2) return text('smartPingSignalsCountTwo', '2 сигнала');
        if (n === 3) return text('smartPingSignalsCountThree', '3 сигнала');
        return text('smartPingSignalsCountAll', '4 сигнала');
    }
    function isNeverOpened(tester, reasons) {
        if ((reasons || []).some(function (reason) {
            return String(reason && reason.code || '') === 'not_opened';
        })) return true;
        if (!tester) return false;
        if (String(tester.last_check_date || '').trim()) return false;
        var checkins = Number(tester.checkins_count);
        if (Number.isFinite(checkins) && checkins > 0) return false;
        return true;
    }
    function notOpenedDaysLabel(days) {
        var n = Math.max(1, Number(days || 1));
        var mod10 = n % 10;
        var mod100 = n % 100;
        var key = 'smartPingNotOpenedDaysMany';
        if (mod100 >= 11 && mod100 <= 19) key = 'smartPingNotOpenedDaysMany';
        else if (mod10 === 1) key = 'smartPingNotOpenedDaysOne';
        else if (mod10 >= 2 && mod10 <= 4) key = 'smartPingNotOpenedDaysFew';
        return text(key, '{count} дней без первого запуска', { count: n });
    }
    function formatKarmaAmount(value) {
        var amount = Number(value);
        if (!Number.isFinite(amount)) return '';
        if (amount > 0) return '+' + amount;
        return String(amount);
    }
    function profileChildLabel(assessment, tester) {
        var profile = (assessment && assessment.profile) || {};
        if (!profile.risk) return '';
        var reliability = profile.reliability;
        if (reliability == null && tester && tester.reliability_index != null) {
            reliability = Math.round(Number(tester.reliability_index));
        }
        var karma = profile.karma;
        if (karma == null && tester && tester.karma != null) karma = Number(tester.karma);
        var lowRel = profile.lowReliability === true
            || (profile.lowReliability == null && reliability != null && Number(reliability) < 60);
        var karmaNeg = profile.karmaNegative === true
            || (profile.karmaNegative == null && karma != null && Number(karma) < 0);
        var details = [];
        if (lowRel && reliability != null && Number.isFinite(Number(reliability))) {
            details.push(text('smartPingChildReliability', 'Надёжность {reliability}', {
                reliability: Math.round(Number(reliability)),
            }));
        }
        if (karmaNeg && karma != null && Number.isFinite(Number(karma))) {
            details.push(text('smartPingChildKarma', 'Карма {karma}', { karma: formatKarmaAmount(karma) }));
        }
        if (!details.length) return text('smartPingChildLowRepPlain', 'Низкая репутация');
        return text('smartPingChildLowRep', 'Низкая репутация ({details})', { details: details.join(') (') });
    }
    function rhythmChildLabel(assessment) {
        var rhythm = (assessment && assessment.rhythm) || {};
        if (!rhythm.risk) return '';
        var time = String(rhythm.habitualTime || rhythm.deadlineTime || '').trim();
        if (time) return text('smartPingChildRhythmOffTime', 'Ритм активности сбит {time}', { time: time });
        return text('smartPingChildRhythmOff', 'Ритм активности сбит');
    }
    function skipsAccumulatedLabel(assessment, tester) {
        var skips = (assessment && assessment.skips) || {};
        if (!skips.risk) return '';
        var count = Number(skips.count);
        if (!Number.isFinite(count) || count <= 0) {
            count = Number(tester && (tester.skips_count != null ? tester.skips_count : tester.consecutive_skips) || 0);
        }
        if (count < 3) return '';
        return text('smartPingChildSkipsAccumulated', 'накоплено {count} пропусков', { count: count });
    }
    function pushMarker(list, value, isChild, extra) {
        var label = String(value || '').trim();
        if (!label) return;
        var child = !!isChild;
        if (list.some(function (item) { return item.text === label && !!item.child === child; })) return;
        var marker = { text: label, child: child };
        if (extra) {
            Object.keys(extra).forEach(function (key) {
                marker[key] = extra[key];
            });
        }
        list.push(marker);
    }
    function pushSignalChildren(list, assessment, tester) {
        if (assessment && assessment.yesterday && assessment.yesterday.risk) {
            pushMarker(list, text('smartPingChildMissedYesterday', 'пропуск вчера'), true);
        }
        pushMarker(list, skipsAccumulatedLabel(assessment, tester), true);
        pushMarker(list, rhythmChildLabel(assessment), true);
        pushMarker(list, profileChildLabel(assessment, tester), true);
    }
    function debtMarker(skips) {
        var n = Math.max(1, Number(skips || 1));
        if (n <= 1) return text('smartPingMarkerDebtOne', 'Долг с пропуском');
        return text('smartPingMarkerDebtMany', 'Долг с {count} пропусками', { count: n });
    }
    function extraReasonLabel(reason) {
        var code = String(reason && reason.code || '').toLowerCase();
        if (code === 'direct_invite') {
            return text('smartPingReasonInvite', 'Прямой инвайт · {count}', { count: Math.max(1, Number(reason.skips || 1)) });
        }
        if (code === 'missed_control') return '';
        if (code === 'broken_link') return text('smartPingReasonBroken', 'Связь разорвана');
        if (code === 'not_opened') return reason.label || text('smartPingReasonNotOpened', 'Ещё не открыл приложение');
        return String((reason && reason.label) || '').trim();
    }
    function markersFor(row) {
        var list = [];
        var neverOpenedReason = (row.reasons || []).find(function (reason) {
            return String(reason && reason.code || '') === 'not_opened';
        });
        if (neverOpenedReason || isNeverOpened(row.tester, row.reasons)) {
            pushMarker(list, extraReasonLabel(neverOpenedReason || { code: 'not_opened' }), false);
            pushMarker(list, notOpenedDaysLabel((neverOpenedReason && neverOpenedReason.days) || testerDay(row.tester, row)), true);
            (row.reasons || []).forEach(function (reason) {
                var code = String(reason && reason.code || '');
                if (code === 'not_opened' || code === 'skips' || code === 'debt' || code === 'tester_left' || code === 'missed_control') return;
                pushMarker(list, extraReasonLabel(reason), false);
            });
            appendCatchupWaitingMarkers(list, row.reasons);
            return list;
        }

        var skipsReason = (row.reasons || []).find(function (r) {
            return String(r && r.code || '') === 'skips';
        });
        var consecutiveSkips = Math.max(
            skipsReason ? Number(skipsReason.skips || 0) : 0,
            skipsCount(row.tester)
        );

        if (row.controlDay > 0) {
            pushMarker(list, text('smartPingMarkerControlToday', 'Сегодня Контрольный день {day}', { day: row.controlDay }), false);
        }
        if (!row.hasDebt && (consecutiveSkips >= 2 || skipsReason)) {
            pushMarker(list, skipsLabel(Math.max(2, consecutiveSkips)), false);
        }
        if (row.signals > 0) {
            pushMarker(list, signalsCountLabel(row.signals), false);
            pushSignalChildren(list, row.assessment, row.tester);
        }
        var skips = skipsCount(row.tester);
        if (row.hasDebt) pushMarker(list, debtMarker(skips), false);
        (row.reasons || []).forEach(function (reason) {
            var code = String(reason && reason.code || '');
            if (code === 'skips' || code === 'debt' || code === 'tester_left' || code === 'not_opened' || code === 'missed_control') return;
            var label = extraReasonLabel(reason);
            if (!label) return;
            pushMarker(list, label, false);
        });
        appendCatchupWaitingMarkers(list, row.reasons);
        return list;
    }

    function catchupStatus(reason) {
        if (reason && reason.proofReceived) return 'received';
        return reason && reason.proofRequested ? 'waiting' : 'will_send';
    }

    // Catch-ups that are already waiting stay in the diagnostic list as plain
    // text. Planned requests and received proofs have their own, clearer level
    // below the list and never compete with the tester's risk signals.
    function appendCatchupWaitingMarkers(list, reasons) {
        (reasons || []).forEach(function (reason) {
            if (String(reason && reason.code || '') !== 'missed_control') return;
            if (catchupStatus(reason) !== 'waiting') return;
            var day = Number(reason && reason.missedDay || 0);
            if (day <= 0) return;
            pushMarker(list, text('smartPingCatchupWaitingLine', 'Control report for day {day} — awaiting a response', { day: day }), false);
        });
    }

    function catchupLabelsFor(row) {
        return (row.reasons || []).filter(function (reason) {
            return String(reason && reason.code || '') === 'missed_control' && Number(reason.missedDay || 0) > 0;
        }).map(function (reason) {
            var day = Number(reason.missedDay || 0);
            return {
                day: day,
                status: catchupStatus(reason),
            };
        }).sort(function (left, right) { return left.day - right.day; });
    }

    function handleCatchupReview(button) {
        var day = Number(button.getAttribute('data-catchup-day') || 0);
        var testerId = Number(button.getAttribute('data-smart-ping-label-tester') || 0);
        var appId = state.appId;
        close();
        if (window.ProjectToday && typeof window.ProjectToday.focusAttentionCatchup === 'function') {
            window.ProjectToday.focusAttentionCatchup(appId, testerId, day);
        } else if (typeof window.pcFocusAttentionCatchup === 'function') {
            window.pcFocusAttentionCatchup(appId, testerId, day);
        }
    }
    function isRisk(row) {
        if (row.section === 'both' || row.section === 'attention') return true;
        return (row.section === 'control' || row.section === 'rhythm') && row.signals >= 3;
    }

    function hasPingReason(row) {
        if ((row.markers || []).length > 0) return true;
        // Some Attention reasons, such as accumulated skips, intentionally do
        // not repeat their title in the compact diagnostic list. They remain
        // valid ping reasons. A received catch-up is the only missed-control
        // state that is deliberately excluded from sending.
        var hasNonCatchupReason = (row.reasons || []).some(function (reason) {
            return String(reason && reason.code || '') !== 'missed_control';
        });
        if (hasNonCatchupReason) return true;
        return (row.catchupLabels || []).some(function (label) {
            return label.status !== 'received';
        });
    }

    function collectRecipients(project) {
        var attention = (window.ProjectToday && typeof window.ProjectToday.collectAttention === 'function')
            ? (window.ProjectToday.collectAttention(project) || [])
            : [];
        var data = (window.ProjectToday && typeof window.ProjectToday.activityCounts === 'function')
            ? window.ProjectToday.activityCounts(project)
            : { controlRows: [] };
        var pendingById = {};
        (data.controlRows || []).forEach(function (row) {
            if (!row || row.received) return;
            var tester = row.tester || {};
            var testerId = testerIdOf(row, tester.tester_id || tester.id);
            if (testerId > 0) pendingById[testerId] = row;
        });

        var used = {};
        var rows = [];

        function pushRow(partial) {
            var testerId = Number(partial.testerId || 0);
            if (testerId <= 0 || used[testerId] || hasLeft(partial.item, partial.tester)) return;
            used[testerId] = true;
            var row = {
                testerId: testerId,
                tester: partial.tester || {},
                section: partial.section,
                reasons: partial.reasons || [],
                assessment: partial.assessment || { riskScore: 0 },
                signals: Math.max(0, Number(partial.signals || 0)),
                controlDay: Math.max(0, Number(partial.controlDay || 0)),
                hasDebt: !!(partial.hasDebt),
                checked: false,
            };
            row.markers = markersFor(row);
            row.catchupLabels = catchupLabelsFor(row);
            row.hasPingReason = hasPingReason(row);
            // A proof already submitted by the tester is a review task, not a
            // reason to charge them for a new ping.
            row.risk = row.hasPingReason && isRisk(row);
            row.checked = row.risk;
            rows.push(row);
        }

        attention.forEach(function (item) {
            var tester = item.tester || {};
            var testerId = testerIdOf(item, tester.tester_id || tester.id);
            if (testerId <= 0 || hasLeft(item, tester)) return;
            var pending = pendingById[testerId];
            var neverOpened = isNeverOpened(tester, item.reasons);
            var assessment = neverOpened ? { riskScore: 0 } : assessmentOf(pending, tester, project);
            var codes = reasonCodes(item);
            pushRow({
                testerId: testerId,
                tester: tester,
                item: item,
                section: (pending && !neverOpened) ? 'both' : 'attention',
                reasons: item.reasons || [],
                assessment: assessment,
                signals: neverOpened ? 0 : signalScore(assessment),
                controlDay: (pending && !neverOpened) ? testerDay(tester, pending) : 0,
                hasDebt: !neverOpened && codes.indexOf('debt') !== -1,
            });
        });

        Object.keys(pendingById).forEach(function (id) {
            var pending = pendingById[id];
            var tester = pending.tester || {};
            var testerId = Number(id);
            if (isNeverOpened(tester, [])) return;
            var assessment = assessmentOf(pending, tester, project);
            pushRow({
                testerId: testerId,
                tester: tester,
                item: pending,
                section: 'control',
                reasons: [],
                assessment: assessment,
                signals: signalScore(assessment),
                controlDay: testerDay(tester, pending),
                hasDebt: false,
            });
        });

        (project && project.testers || []).forEach(function (tester) {
            var testerId = testerIdOf(tester);
            if (testerId <= 0 || used[testerId] || hasLeft(null, tester)) return;
            if (isNeverOpened(tester, [])) return;
            if (isControlDay(testerDay(tester))) return;
            var assessment = assessmentOf(null, tester, project);
            var signals = signalScore(assessment);
            if (signals < 1) return;
            pushRow({
                testerId: testerId,
                tester: tester,
                item: { tester: tester },
                section: 'rhythm',
                reasons: [],
                assessment: assessment,
                signals: signals,
                controlDay: 0,
                hasDebt: false,
            });
        });

        return rows;
    }
    function getLastPing(appId) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return null;
        var cached = null;
        try {
            var raw = localStorage.getItem('pc_smart_ping_last_' + safeId);
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object' && parseSentAt(parsed.sentAt)) {
                    // Older clients cached selected IDs as if already sent.
                    // Keep their cooldown timestamp, never their delivery claim.
                    cached = parsed.completed === true && Number.isSafeInteger(parsed.deliveryId)
                        ? parsed : { sentAt: parsed.sentAt, count: 0, testerIds: [] };
                }
            }
        } catch (_) {}
        var project = projectById(safeId);
        if (project && parseSentAt(project.smart_ping_sent_at) > parseSentAt(cached && cached.sentAt)) {
            return {
                sentAt: project.smart_ping_sent_at,
                count: 0,
                testerIds: [],
            };
        }
        return cached;
    }

    function setLastPing(appId, data) {
        var safeId = Number(appId || 0);
        if (safeId <= 0 || !data) return;
        try {
            localStorage.setItem('pc_smart_ping_last_' + safeId, JSON.stringify(data));
        } catch (_) {}
    }

    function isTesterPinged(appId, testerId) {
        var safeId = Number(appId || 0);
        var tId = Number(testerId || 0);
        if (safeId <= 0 || tId <= 0) return false;
        var ping = getLastPing(safeId);
        if (!ping || !ping.sentAt) return false;
        var sentMs = parseSentAt(ping.sentAt);
        if (!sentMs || Date.now() - sentMs > COOLDOWN_MS) return false;
        // A cooldown/queue receipt does not prove delivery to any tester.
        return Array.isArray(ping.testerIds) && ping.testerIds.map(Number).indexOf(tId) !== -1;
    }

    function getTesterPingTime(appId, testerId) {
        var safeId = Number(appId || 0);
        var ping = getLastPing(safeId);
        if (!ping || !ping.sentAt) return '';
        var d = new Date(parseSentAt(ping.sentAt));
        if (isNaN(d.getTime())) return '';
        var locale = (typeof lang !== 'undefined' && lang === 'ru') ? 'ru-RU' : 'en-GB';
        return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }

    function applyFilter(filter) {
        state.filter = filter;
        state.recipients.forEach(function (row) {
            if (!row.hasPingReason || isTesterPinged(state.appId, row.testerId)) {
                row.checked = false;
            } else if (filter === 'all') {
                row.checked = true;
            } else if (filter === 'none') {
                row.checked = false;
            } else {
                row.checked = !!row.risk;
            }
        });
    }
    function selected() {
        return state.recipients.filter(function (row) {
            return row.hasPingReason && row.checked && !isTesterPinged(state.appId, row.testerId);
        });
    }
    function parseSentAt(value) {
        var raw = String(value || '').trim();
        if (!raw) return 0;
        if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) raw = raw.replace(' ', 'T') + 'Z';
        var ms = Date.parse(raw);
        return Number.isFinite(ms) ? ms : 0;
    }
    function cooldownRemaining(project) {
        var safeId = Number(project && (project.id || project.app_id) || 0);
        var last = getLastPing(safeId);
        var lastSent = last && last.sentAt ? parseSentAt(last.sentAt) : 0;
        var projectSent = parseSentAt(project && project.smart_ping_sent_at);
        var sentAt = Math.max(lastSent, projectSent);
        if (!sentAt) return 0;
        return Math.max(0, sentAt + COOLDOWN_MS - Date.now());
    }
    function formatCooldown(ms) {
        var totalMin = Math.ceil(ms / 60000);
        var hours = Math.floor(totalMin / 60);
        var minutes = totalMin % 60;
        if (hours <= 0) return minutes + 'м';
        return hours + 'ч ' + (minutes < 10 ? '0' : '') + minutes + 'м';
    }
    var countdownInterval = null;
    function startCountdownTimer() {
        stopCountdownTimer();
        countdownInterval = setInterval(function () {
            var project = projectById(state.appId);
            var node = overlay();
            if (!node || !project) {
                stopCountdownTimer();
                return;
            }
            var wait = cooldownRemaining(project);
            var footer = node.querySelector('.smart-ping-sheet__send');
            if (footer && !state.sending && state.view === 'select') {
                var next = footerState(project);
                footer.disabled = next.disabled;
                footer.textContent = next.label;
            }
            if (wait <= 0) {
                stopCountdownTimer();
                render();
            }
        }, 1000);
    }
    function stopCountdownTimer() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
    }
    function overlay() {
        return document.getElementById('smart-ping-modal');
    }
    function close(force) {
        state.generation += 1;
        clearTimeout(state.pollTimer);
        if (state.request) state.request.abort();
        state.request = null;
        state.checking = false;
        stopCountdownTimer();
        var node = overlay();
        if (document.body) document.body.style.overflow = '';
        if (node) {
            node.classList.remove('active');
            if (node.parentNode) node.parentNode.removeChild(node);
        }
        state.appId = 0;
        state.sending = false;
    }
    function footerState(project) {
        var count = selected().length;
        var cost = count * COST;
        var funds = balance();
        var wait = cooldownRemaining(project);
        if (wait > 0) {
            return { disabled: true, label: text('smartPingCooldown', 'Повторно через {time}', { time: formatCooldown(wait) }) };
        }
        if (count === 0) {
            return { disabled: true, label: text('smartPingPickOne', 'Выберите хотя бы одного тестера') };
        }
        if (funds < cost) {
            return {
                disabled: true,
                label: text('smartPingNeedFunds', 'Недостаточно $BUST (Нужно {cost}, у вас {balance})', {
                    cost: formatBust(cost),
                    balance: formatBust(funds),
                }),
            };
        }
        return {
            disabled: state.checking,
            label: text('smartPingSend', '⚡ Отправить напоминания • {cost} $BUST', { cost: formatBust(cost) }),
        };
    }
    function catchupCameraIcon() {
        return '<svg class="smart-ping-catchup-plan__icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>';
    }

    function catchupPlanHtml(label) {
        return '<div class="smart-ping-catchup-plan" data-smart-ping-catchup-planned data-catchup-day="' + label.day + '">' +
            catchupCameraIcon() +
            '<span>' + esc(text('smartPingCatchupWillSendLine', 'A catch-up report will be created for day {day}', { day: label.day })) + '</span>' +
        '</div>';
    }

    function catchupReceivedHtml(label, testerId) {
        var description = text('smartPingCatchupReceivedLine', 'Report for day {day} was submitted by the tester', { day: label.day });
        var review = text('smartPingCatchupReview', 'Review');
        return '<div class="smart-ping-catchup-received" data-smart-ping-catchup-received data-catchup-day="' + label.day + '">' +
            '<span class="smart-ping-catchup-received__text"><span aria-hidden="true">ℹ</span><span>' + esc(description) + '</span></span>' +
            '<span class="smart-ping-catchup-received__separator" aria-hidden="true">·</span>' +
            '<button type="button" class="smart-ping-catchup-review" data-smart-ping-catchup-review data-catchup-day="' + label.day + '" data-smart-ping-label-tester="' + testerId + '">' + esc(review) + '</button>' +
        '</div>';
    }

    function rowHtml(row) {
        var isPinged = isTesterPinged(state.appId, row.testerId);
        var badge = row.risk
            ? '<span class="smart-ping-risk-badge"><i class="smart-ping-risk-dot" aria-hidden="true"></i>' + esc(text('smartPingRiskBadge', 'Риск')) + '</span>'
            : '';
        var reasons = (row.markers || []).map(function (marker) {
            var item = marker && typeof marker === 'object' ? marker : { text: marker, child: false };
            return '<li' + (item.child ? ' class="is-child"' : '') + '>' + esc(item.text || '') + '</li>';
        }).join('');
        var planned = (row.catchupLabels || []).filter(function (label) { return label.status === 'will_send'; })
            .map(catchupPlanHtml).join('');
        var received = (row.catchupLabels || []).filter(function (label) { return label.status === 'received'; })
            .map(function (label) { return catchupReceivedHtml(label, row.testerId); }).join('');
        var serviceRows = planned || received
            ? '<div class="smart-ping-row__catchups">' + planned + received + '</div>'
            : '';
        var pickControlHtml = isPinged
            ? '<span class="smart-ping-row__notified-chip" title="' + esc(text('smartPingNotifiedTip', 'Уведомление уже отправлено в рамках текущего пинга')) + '">✓ ' + esc(text('smartPingNotified', 'Оповещён')) + '</span>'
            : '<input type="checkbox" data-smart-ping-tester="' + row.testerId + '"' + (row.checked ? ' checked' : '') + (!row.hasPingReason ? ' disabled' : '') + '>';

        return '<div class="smart-ping-row' + (row.risk ? ' is-risk' : '') + (!row.hasPingReason ? ' is-service-only' : '') + (isPinged ? ' is-notified' : '') + '">' +
            '<label class="smart-ping-row__pick">' +
                pickControlHtml +
                avatarHtml(row.tester) +
                '<span class="smart-ping-row__meta">' +
                    '<span class="smart-ping-row__name"><strong>' + esc(handleOf(row.tester)) + '</strong>' + badge + '</span>' +
                    (reasons ? '<ul class="smart-ping-row__reasons">' + reasons + '</ul>' : '') +
                '</span>' +
            '</label>' +
            serviceRows +
        '</div>';
    }
    function sectionTitle(section) {
        if (section === 'both') return text('smartPingSectionBoth', '⚡ Внимание + Отчёт');
        if (section === 'attention') return text('smartPingSectionAttention', '⚠️ Зона внимания (Вкладка «Внимание»)');
        if (section === 'control') return text('smartPingSectionControl', '📸 Контрольные отчёты (Вкладка «Отчёт»)');
        return text('smartPingSectionRhythm', '📉 Сбился ритм (Обычные дни)');
    }
    function sectionHtml(section, rows) {
        if (!rows.length) return '';
        return '<section class="smart-ping-section" data-smart-ping-section="' + section + '">' +
            '<h4>' + esc(sectionTitle(section)) + ' <span>' + rows.length + '</span></h4>' +
            rows.map(rowHtml).join('') +
        '</section>';
    }
    function render() {
        var node = overlay();
        var project = projectById(state.appId);
        if (!node || !project) return;
        if (state.view !== 'select') {
            renderDelivery(node);
            return;
        }
        var body = node.querySelector('.smart-ping-sheet__body');
        var footer = node.querySelector('.smart-ping-sheet__send');
        var balanceEl = node.querySelector('.smart-ping-sheet__balance');
        node.querySelectorAll('[data-smart-ping-filter]').forEach(function (btn) {
            btn.classList.toggle('is-active', btn.getAttribute('data-smart-ping-filter') === state.filter);
        });
        if (balanceEl) {
            balanceEl.textContent = text('smartPingBalance', 'Баланс: {balance} $BUST', { balance: formatBust(balance()) });
        }
        if (body) {
            if (!state.recipients.length) {
                body.innerHTML = '<div class="smart-ping-empty">' + esc(text('smartPingEmpty', 'Нет получателей для Smart Ping')) + '</div>';
            } else {
                body.innerHTML = SECTION_ORDER.map(function (section) {
                    return sectionHtml(section, state.recipients.filter(function (row) { return row.section === section; }));
                }).join('');
            }
        }
        if (footer) {
            var next = footerState(project);
            footer.disabled = next.disabled || state.sending;
            if (state.sending) {
                footer.classList.add('is-loading');
                footer.innerHTML = '<span class="smart-ping-spinner" aria-hidden="true"></span>' +
                    esc(text('smartPingSending', 'Отправка сигналов...'));
            } else {
                footer.classList.remove('is-loading');
                footer.textContent = next.label;
            }
        }
        var lastPing = getLastPing(state.appId);
        var lastStatusEl = node.querySelector('.smart-ping-sheet__last-status');
        var sentMs = parseSentAt(lastPing && lastPing.sentAt);
        var now = new Date();
        lastStatusEl.hidden = !sentMs || sentMs > now.getTime() + 60000;
        lastStatusEl.setAttribute('aria-busy', String(state.checking));
        if (!lastStatusEl.hidden) {
            var pingDate = new Date(sentMs);
            var isToday = pingDate.toDateString() === now.toDateString();
            var yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            var dateStr = isToday ? text('smartPingToday', 'сегодня')
                : pingDate.toDateString() === yesterday.toDateString() ? text('smartPingYesterday', 'вчера')
                : pingDate.toLocaleDateString((typeof lang !== 'undefined' && lang === 'ru') ? 'ru-RU' : 'en-GB');
            var params = { date: dateStr, time: getTesterPingTime(state.appId, 0), count: Number(lastPing.count || 0) };
            var label = lastPing.completed
                ? text('smartPingLastDate', '⚡ Последний пинг: {date} в {time} (отправлено: {count})', params)
                : text('smartPingLastDateNoCount', '⚡ Последний пинг: {date} в {time}', params);
            lastStatusEl.firstElementChild.textContent = state.checking ? text('smartPingLastResultLoading') : label;
        }
    }
    function bindSwipe(node) {
        var sheet = node.querySelector('.smart-ping-sheet');
        if (!sheet || sheet._hasSwipeListener) return;
        sheet._hasSwipeListener = true;
        var startY = 0;
        var currentY = 0;
        var dragging = false;

        function isSwipeHandle(target) {
            if (!target) return false;
            return !!(target.closest('.sheet-handle') || (target.closest('.smart-ping-sheet__head') && !target.closest('button, input, a')));
        }

        sheet.addEventListener('touchstart', function (event) {
            if (state.sending) return;
            if (!isSwipeHandle(event.target)) return;
            startY = event.touches[0].clientY;
            currentY = startY;
            dragging = true;
        }, { passive: true });
        sheet.addEventListener('touchmove', function (event) {
            if (state.sending) return;
            if (!dragging) return;
            currentY = event.touches[0].clientY;
            var delta = currentY - startY;
            if (delta > 0) {
                sheet.style.transform = 'translateY(' + delta + 'px)';
            }
        }, { passive: true });
        sheet.addEventListener('touchend', function () {
            if (state.sending) return;
            if (!dragging) return;
            dragging = false;
            var delta = currentY - startY;
            sheet.style.transform = '';
            if (delta > 90) close();
        });
    }
    function bind(node) {
        node.addEventListener('click', function (event) {
            var action = event.target.closest && event.target.closest('[data-smart-ping-action]');
            if (action) {
                event.preventDefault();
                var command = action.getAttribute('data-smart-ping-action');
                if (command === 'close') close();
                if (command === 'last-result') openLastResult(context());
                if (command === 'check' && !state.checking) {
                    state.pollUntil = Date.now() + 150000;
                    checkDelivery(context());
                }
                if (command === 'back' && !state.checking && (state.view === 'rejected' || state.view === 'not-found')) {
                    // Explicitly abandon only a rejected request or an attempt
                    // absent from a successful latest lookup. Never auto-repost.
                    clearTimeout(state.pollTimer);
                    savePending(context(), null);
                    state.delivery = null;
                    state.view = 'select';
                    state.sending = false;
                    node.querySelector('.smart-ping-sheet__filters').hidden = false;
                    render();
                }
                if (command === 'manual') manualReminder(Number(action.getAttribute('data-tester-id')));
                return;
            }
            var catchupReview = event.target && event.target.closest && event.target.closest('[data-smart-ping-catchup-review]');
            if (catchupReview) {
                event.preventDefault();
                event.stopPropagation();
                handleCatchupReview(catchupReview);
                return;
            }
            if (event.target === node) {
                close();
            }
        });
        node.addEventListener('touchmove', function (event) {
            if (event.target === node) {
                event.preventDefault();
            }
        }, { passive: false });
        node.querySelectorAll('[data-smart-ping-filter]').forEach(function (btn) {
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                if (state.view !== 'select') return;
                applyFilter(btn.getAttribute('data-smart-ping-filter'));
                render();
            });
        });
        node.addEventListener('change', function (event) {
            var input = event.target;
            if (!input || !input.matches || !input.matches('[data-smart-ping-tester]')) return;
            if (input.disabled) return;
            if (state.view !== 'select') return;
            var testerId = Number(input.getAttribute('data-smart-ping-tester') || 0);
            state.recipients.forEach(function (row) {
                if (row.testerId === testerId) row.checked = !!input.checked;
            });
            state.filter = '';
            render();
        });
        var send = node.querySelector('.smart-ping-sheet__send');
        if (send) send.addEventListener('click', function (event) {
            event.preventDefault();
            if (state.view === 'select') submit();
            else close();
        });
        bindSwipe(node);
    }
    // POST reserves funds once. Only authenticated GET receipts establish
    // delivery/refunds. Persist the in-flight receipt separately from last ping;
    // closing/reloading never starts another paid request or a client refund.
    function actorId() {
        return Number((typeof userId !== 'undefined' && userId) || (window.App && window.App.userId)
            || (window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user && window.tg.initDataUnsafe.user.id) || 0);
    }
    function context() {
        return { generation: state.generation, appId: state.appId, actor: actorId() };
    }
    function isCurrent(ctx) {
        return ctx.generation === state.generation && ctx.appId === state.appId && ctx.actor === actorId();
    }
    function pendingKey(ctx) { return 'pc_smart_ping_pending_' + ctx.actor + '_' + ctx.appId; }
    function savePending(ctx, value) {
        if (isCurrent(ctx)) state.pending = value;
        if (!(ctx.actor > 0)) return;
        if (value) pendingMemory[pendingKey(ctx)] = value;
        else delete pendingMemory[pendingKey(ctx)];
        try {
            if (value) localStorage.setItem(pendingKey(ctx), JSON.stringify(value));
            else localStorage.removeItem(pendingKey(ctx));
        } catch (_) {}
    }
    function readPending(ctx) {
        var value = pendingMemory[pendingKey(ctx)] || null;
        try {
            value = JSON.parse(localStorage.getItem(pendingKey(ctx)) || 'null') || value;
        } catch (_) {}
        if (value && Number.isFinite(value.startedAt) && Array.isArray(value.recipients)
            && (value.deliveryId === null || Number.isSafeInteger(value.deliveryId) && value.deliveryId > 0)) return value;
        return null;
    }
    function updateBalance(amount) {
        if (amount != null && Number.isFinite(Number(amount)) && typeof visibilityStats !== 'undefined' && visibilityStats) {
            visibilityStats.balance_bust = Number(amount);
        }
    }
    function apiBase() {
        return (typeof API_BASE !== 'undefined' && API_BASE) || (window.App && window.App.API_BASE) || '/api';
    }
    async function requestJson(url, options, ctx) {
        var controller = new AbortController();
        if (isCurrent(ctx)) state.request = controller;
        var timeout = setTimeout(function () { controller.abort(); }, 15000);
        try {
            var response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
            var payload = await response.json().catch(function () { return null; });
            return { response: response, payload: payload };
        } finally {
            clearTimeout(timeout);
            if (state.request === controller) state.request = null;
        }
    }
    async function fetchDelivery(ctx, id) {
        var result = await requestJson(apiBase() + '/project/' + ctx.appId + '/smart-ping/' + (id || 'latest') +
            '?init_data=' + encodeURIComponent(initData()), { method: 'GET', cache: 'no-store' }, ctx);
        if (!result.response.ok || !result.payload || result.payload.status !== 'success') throw new Error('status_unavailable');
        return result.payload.delivery;
    }
    async function openLastResult(ctx) {
        var last = getLastPing(ctx.appId);
        if (!last || state.view !== 'select' || state.checking) return;
        state.checking = true;
        render();
        var notice = '';
        try {
            var raw = await fetchDelivery(ctx);
            if (!isCurrent(ctx)) return;
            var receipt = raw === null ? null : checkedDelivery(raw);
            if (!receipt || parseSentAt(receipt.sent_at) < parseSentAt(last.sentAt)) {
                notice = 'smartPingLastResultMissing';
            } else if (receipt.state === 'queued') {
                notice = 'smartPingLastResultQueued';
            } else {
                stopCountdownTimer();
                state.delivery = receipt;
                state.view = 'completed';
            }
        } catch (_) {
            notice = 'smartPingLastResultError';
        } finally {
            if (isCurrent(ctx)) {
                state.checking = false;
                render();
                if (notice && typeof window.showToast === 'function') window.showToast(text(notice));
                var heading = overlay() && overlay().querySelector('.smart-ping-result h4');
                if (heading && state.view === 'completed') heading.focus();
            }
        }
    }
    function reminderContext(row) {
        var reasons = row.reasons || [];
        var missed = reasons.find(function (reason) { return reason.code === 'missed_control'; });
        var reason = missed ? 'missed_control' : row.controlDay > 0 ? 'control' :
            ['not_opened', 'debt', 'skips'].find(function (code) { return reasons.some(function (item) { return item.code === code; }); }) || 'regular';
        var extra = { skips: skipsCount(row.tester) };
        var day = Number(missed && missed.missedDay || row.controlDay || 0);
        if (day > 0) extra.day = day;
        return { testerId: row.testerId, name: handleOf(row.tester), reason: reason,
            extra: extra };
    }
    function recipientInfo(testerId) {
        var saved = (state.pending && state.pending.recipients || []).find(function (row) { return Number(row.testerId) === testerId; });
        if (saved) return saved;
        var row = state.recipients.find(function (item) { return item.testerId === testerId; });
        if (row) return reminderContext(row);
        var project = projectById(state.appId);
        var tester = (project && project.testers || []).find(function (item) { return testerIdOf(item) === testerId; });
        return { testerId: testerId, name: handleOf(tester || { tester_id: testerId }), reason: 'regular', extra: {} };
    }
    function manualReminder(testerId) {
        if (state.view !== 'completed' || typeof window.pcRemindTester !== 'function') return;
        var result = state.delivery.results.find(function (item) { return item.tester_id === testerId; });
        if (!result || delivered(result)) return;
        // The legacy preview helper has a send fallback when its markup is
        // absent. Do not enter that fallback from the delivery receipt.
        if (!document.getElementById('bell-remind-overlay')) {
            if (typeof window.showToast === 'function') window.showToast(text('smartPingManualUnavailable'));
            return;
        }
        var info = recipientInfo(testerId);
        var appId = state.appId;
        close();
        // This existing function opens the preview; the user chooses whether
        // and how to send. Never invoke a Telegram send API from this sheet.
        window.pcRemindTester(appId, testerId, info.reason, info.extra);
    }
    function delivered(row) { return row.status === 'sent' || row.status === 'catchup'; }
    function checkedDelivery(raw, expectedId) {
        if (!raw || !Number.isSafeInteger(raw.id) || raw.id <= 0 || (expectedId && raw.id !== expectedId)
            || ['queued', 'completed'].indexOf(raw.state) === -1 || !parseSentAt(raw.sent_at)
            || !Number.isInteger(raw.requested_count) || raw.requested_count < 0
            || !Number.isFinite(raw.total_cost) || raw.total_cost < 0) throw new Error('invalid_receipt');
        if (raw.state === 'completed') {
            if (!Number.isInteger(raw.sent_count) || raw.sent_count < 0 || raw.sent_count > raw.requested_count
                || !Number.isFinite(raw.charged_cost) || raw.charged_cost < 0
                || !Number.isFinite(raw.refunded_cost) || raw.refunded_cost < 0
                || !Array.isArray(raw.results)) throw new Error('invalid_receipt');
            var seen = {};
            if (raw.results.some(function (row) {
                if (!row || !Number.isSafeInteger(row.tester_id) || row.tester_id <= 0 || seen[row.tester_id]) return true;
                seen[row.tester_id] = true;
                return false;
            }) || raw.results.length !== raw.requested_count
                || raw.results.filter(delivered).length !== raw.sent_count
                || Math.abs(raw.charged_cost + raw.refunded_cost - raw.total_cost) > 0.01) throw new Error('invalid_receipt');
        }
        return raw;
    }
    function statusExplanation(status) {
        var keys = {
            sent: 'smartPingResultSent', catchup: 'smartPingResultCatchup', unavailable: 'smartPingResultUnavailable',
            failed: 'smartPingResultFailed', uncertain: 'smartPingResultUncertain',
            rate_limited: 'smartPingResultRateLimited', not_attempted: 'smartPingResultNotAttempted',
        };
        return text(keys[status] || 'smartPingResultUnknown');
    }
    function actionButton(command, label, testerId) {
        return '<button type="button" class="smart-ping-result__action" data-smart-ping-action="' + command + '"' +
            (testerId ? ' data-tester-id="' + testerId + '"' : '') + '>' + esc(label) + '</button>';
    }
    function metric(label, value, tone) {
        return '<div class="smart-ping-result__metric' + (tone ? ' is-' + tone : '') + '"><strong>' + esc(value) +
            '</strong><span>' + esc(text(label)) + '</span></div>';
    }
    function renderDelivery(node) {
        node.querySelector('.smart-ping-sheet__filters').hidden = true;
        var last = node.querySelector('.smart-ping-sheet__last-status');
        if (last) last.hidden = true;
        var balanceEl = node.querySelector('.smart-ping-sheet__balance');
        balanceEl.textContent = text('smartPingBalance', '', { balance: formatBust(balance()) });
        var complete = state.view === 'completed';
        var partial = complete && state.delivery.sent_count < state.delivery.requested_count;
        var busy = state.view === 'submitting' || state.checking || state.view === 'queued';
        var title = text(complete ? 'smartPingResultTitle' : state.view === 'rejected' ? 'smartPingFailed' : busy ? 'smartPingProcessingTitle'
            : state.view === 'not-found' ? 'smartPingAttemptNotFoundTitle' : 'smartPingStatusUnknownTitle');
        var description = text(complete ? 'smartPingResultHint' : state.view === 'rejected' ? rejectionKey(state.errorCode) : busy ? 'smartPingProcessingHint'
            : state.view === 'not-found' ? 'smartPingAttemptNotFoundHint' : 'smartPingStatusUnknownHint');
        var html = '<div class="smart-ping-result" data-state="' + state.view + '">' +
            '<div class="smart-ping-result__intro" role="status"><span class="smart-ping-result__symbol' +
            (busy ? ' is-processing' : complete && !partial ? ' is-complete' : ' is-warning') + '" aria-hidden="true">' +
            (busy ? '<span class="smart-ping-spinner"></span>' : complete && !partial ? '✓' : '!') + '</span>' +
            '<h4 tabindex="-1">' + esc(title) + '</h4><p>' + esc(description) + '</p></div>';
        if (complete) {
            var receipt = state.delivery;
            html += '<div class="smart-ping-result__metrics">' + metric('smartPingResultDelivered', receipt.sent_count, 'sent') +
                metric('smartPingResultUndelivered', receipt.requested_count - receipt.sent_count, 'muted') + '</div>' +
                '<dl class="smart-ping-result__money"><div><dt>' + esc(text('smartPingResultCharged')) + '</dt><dd>' +
                esc(formatBust(receipt.charged_cost)) + ' $BUST</dd></div><div><dt>' + esc(text('smartPingResultRefunded')) +
                '</dt><dd>' + esc(formatBust(receipt.refunded_cost)) + ' $BUST</dd></div></dl>';
            var failures = receipt.results.filter(function (item) { return !delivered(item); });
            html += '<h5>' + esc(text(failures.length ? 'smartPingResultNeedsAttention' : 'smartPingResultAllDelivered')) + '</h5>';
            html += '<div class="smart-ping-result__recipients">' + receipt.results.slice().sort(function (a, b) {
                return Number(delivered(a)) - Number(delivered(b));
            }).map(function (item) {
                var success = delivered(item);
                return '<article class="smart-ping-result__recipient' + (success ? ' is-sent' : '') + '" data-result-tester="' + item.tester_id +
                    '"><div class="smart-ping-result__recipient-head"><strong>' + esc(recipientInfo(item.tester_id).name) + '</strong><span aria-hidden="true">' +
                    (success ? '✓' : '·') + '</span></div><p>' + esc(statusExplanation(item.status)) + '</p>' +
                    (!success && typeof window.pcRemindTester === 'function' ? actionButton('manual', text('smartPingManualReminder'), item.tester_id) : '') + '</article>';
            }).join('') + '</div>';
        } else if (state.view !== 'rejected') {
            var reserved = state.delivery ? state.delivery.total_cost : state.pending && state.pending.totalCost;
            html += '<div class="smart-ping-result__reserve">' + esc(text(state.delivery ? 'smartPingReserved' : 'smartPingRequestedReserve', '', {
                cost: formatBust(reserved),
            })) + '</div>';
        }
        if (!state.checking && (state.view === 'status-error' || state.view === 'unknown' || state.view === 'not-found')) html += actionButton('check', text('smartPingCheckStatus'));
        if (!state.checking && (state.view === 'rejected' || state.view === 'not-found')) html += actionButton('back', text('smartPingBackToSelection'));
        html += '</div>';
        var body = node.querySelector('.smart-ping-sheet__body');
        body.innerHTML = html;
        var footer = node.querySelector('.smart-ping-sheet__send');
        footer.disabled = false;
        footer.classList.remove('is-loading', 'is-success');
        footer.textContent = text(complete || state.view === 'rejected' ? 'smartPingClose' : 'smartPingCloseAndCheckLater');
    }
    function rejectionKey(code) {
        return { insufficient_bust_balance: 'smartPingRejectBalance', smart_ping_cooldown: 'smartPingRejectCooldown',
            forbidden: 'smartPingRejectAccess', not_app_owner: 'smartPingRejectAccess',
            no_recipients: 'smartPingRejectRecipients', smart_ping_no_recipients: 'smartPingRejectRecipients' }[code] || 'smartPingRejectGeneric';
    }
    function acceptDelivery(raw, ctx) {
        var pending = state.pending;
        var receipt = checkedDelivery(raw, pending && pending.deliveryId);
        state.delivery = receipt;
        updateBalance(receipt.balance_bust);
        if (pending) {
            pending.deliveryId = receipt.id;
            savePending(ctx, pending);
        }
        if (receipt.state === 'completed') {
            var ids = receipt.results.filter(delivered).map(function (row) { return row.tester_id; });
            setLastPing(ctx.appId, { sentAt: receipt.sent_at, count: ids.length, testerIds: ids, completed: true, deliveryId: receipt.id });
            var project = projectById(ctx.appId);
            if (project) project.smart_ping_sent_at = receipt.sent_at;
            // Keep names/reason context in memory for the result, but remove
            // the persistent pending marker only after a verified completion.
            savePending(ctx, null);
            state.pending = pending;
            state.sending = false;
            state.view = 'completed';
            sync(ctx.appId);
            if (window.ProjectToday && typeof window.ProjectToday.invalidate === 'function') window.ProjectToday.invalidate(ctx.appId);
        } else {
            state.view = 'queued';
        }
    }
    async function checkDelivery(ctx) {
        if (!isCurrent(ctx) || state.checking || !state.pending) return;
        clearTimeout(state.pollTimer);
        state.checking = true;
        render();
        try {
            var pending = state.pending;
            var id = pending.deliveryId;
            var receipt = await fetchDelivery(ctx, id);
            if (!isCurrent(ctx)) return;
            if (!id) {
                // Recover a lost POST reply only when latest belongs to this
                // attempt. Never attach an older cooldown receipt to a new send.
                if (receipt === null) {
                    state.view = 'not-found';
                    return;
                }
                receipt = checkedDelivery(receipt);
                var sentMs = parseSentAt(receipt.sent_at);
                if (sentMs < pending.startedAt - 5000) {
                    state.view = 'not-found';
                    return;
                }
                var recipientIds = pending.recipients.map(function (item) { return Number(item.testerId); });
                if (sentMs > pending.startedAt + 120000
                    || receipt.requested_count !== recipientIds.length
                    || Array.isArray(receipt.results) && receipt.results.some(function (item) { return recipientIds.indexOf(Number(item.tester_id)) === -1; })) {
                    state.view = 'unknown';
                    return;
                }
            }
            acceptDelivery(receipt, ctx);
            if (state.view === 'queued') {
                if (Date.now() < state.pollUntil) state.pollTimer = setTimeout(function () { checkDelivery(ctx); }, 2500);
                else state.view = 'status-error';
            }
        } catch (_) {
            if (isCurrent(ctx)) state.view = 'status-error';
        } finally {
            if (isCurrent(ctx)) {
                state.checking = false;
                render();
            }
        }
    }
    async function submit() {
        var project = projectById(state.appId);
        var picked = selected();
        if (!project || footerState(project).disabled || state.view !== 'select' || state.sending || !picked.length) return;
        var ctx = context();
        var pending = { deliveryId: null, startedAt: Date.now(), totalCost: picked.length * COST, recipients: picked.map(reminderContext) };
        savePending(ctx, pending);
        state.sending = true;
        state.view = 'submitting';
        state.pollUntil = Date.now() + 150000;
        stopCountdownTimer();
        render();
        try {
            var result = await requestJson(apiBase() + '/project/smart-ping', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ init_data: initData(), project_id: ctx.appId,
                    tester_ids: picked.map(function (row) { return row.testerId; }) }),
            }, ctx);
            if (!isCurrent(ctx)) return;
            var payload = result.payload;
            if (!result.response.ok || !payload || payload.status !== 'success') {
                // Only an explicit application rejection is safe to retry.
                // HTTP 5xx, broken JSON and lost responses may follow a debit.
                if (result.response.status < 500 && payload && payload.status === 'error') {
                    state.errorCode = String(payload.code || payload.error || '');
                    updateBalance(payload.details && payload.details.balance_bust);
                    if (state.errorCode === 'smart_ping_cooldown' && payload.details && payload.details.sent_at) {
                        project.smart_ping_sent_at = payload.details.sent_at;
                    }
                    savePending(ctx, null);
                    state.sending = false;
                    state.view = 'rejected';
                    render();
                    return;
                }
                throw new Error('post_result_unknown');
            }
            updateBalance(payload.balance_bust);
            if (Number.isSafeInteger(payload.delivery_id) && payload.delivery_id > 0) {
                pending.deliveryId = payload.delivery_id;
                savePending(ctx, pending);
                state.delivery = Number.isFinite(payload.total_cost) && payload.total_cost >= 0 ? { total_cost: payload.total_cost } : null;
                if (typeof window.pcApplySmartPingCatchups === 'function') window.pcApplySmartPingCatchups(ctx.appId, payload.catchup_requests || []);
            }
            state.view = 'queued';
        } catch (_) {
            if (!isCurrent(ctx)) return;
            state.view = 'unknown';
        }
        if (isCurrent(ctx)) checkDelivery(ctx);
    }
    function open(appId) {
        var project = projectById(appId);
        if (!project) return;
        close(true);
        state.appId = Number(project.id || project.app_id);
        state.filter = 'risk';
        state.sending = false;
        state.view = 'select';
        state.delivery = null;
        state.pending = readPending(context());
        if (state.pending) state.view = 'queued';
        state.recipients = collectRecipients(project);
        applyFilter('risk');
        var html = '<div id="smart-ping-modal" class="modal-overlay smart-ping-overlay active" role="presentation">' +
            '<section class="smart-ping-sheet" role="dialog" aria-modal="true" aria-labelledby="smart-ping-title">' +
                '<div class="sheet-handle" aria-hidden="true"></div>' +
                '<header class="smart-ping-sheet__head">' +
                    '<h3 id="smart-ping-title">' + esc(text('smartPingTitle', '⚡ Smart Ping')) + '</h3>' +
                    '<p class="smart-ping-sheet__balance"></p>' +
                    '<button type="button" class="smart-ping-sheet__close" data-smart-ping-action="close" aria-label="' + esc(text('smartPingClose')) + '">×</button>' +
                '</header>' +
                '<div class="smart-ping-sheet__filters" role="group">' +
                    '<button type="button" class="is-active" data-smart-ping-filter="risk">' + esc(text('smartPingFilterRisk', 'Группа риска')) + '</button>' +
                    '<button type="button" data-smart-ping-filter="all">' + esc(text('smartPingFilterAll', 'Выбрать всех')) + '</button>' +
                    '<button type="button" data-smart-ping-filter="none">' + esc(text('smartPingFilterNone', 'Сбросить')) + '</button>' +
                '</div>' +
                '<div class="smart-ping-sheet__body"></div>' +
                '<footer class="smart-ping-sheet__foot">' +
                    '<button type="button" class="smart-ping-sheet__last-status" data-smart-ping-action="last-result" hidden>' +
                        '<span></span><span aria-hidden="true">›</span>' +
                    '</button>' +
                    '<button type="button" class="smart-ping-sheet__send"></button>' +
                '</footer>' +
            '</section>' +
        '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        if (document.body) document.body.style.overflow = 'hidden';
        var node = overlay();
        bind(node);
        render();
        if (state.pending) {
            state.pollUntil = Date.now() + 150000;
            checkDelivery(context());
        } else if (cooldownRemaining(project) > 0) {
            startCountdownTimer();
        }
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    }
    function buttonHtml(appId) {
        var project = projectById(appId);
        var wait = cooldownRemaining(project);
        var isCooldown = wait > 0;
        var armed = !isCooldown && isArmed(appId);
        var btnClass = 'pc-smart-ping-btn' + (armed ? ' is-armed' : '') + (isCooldown ? ' is-cooldown' : '');
        var title = isCooldown
            ? text('smartPingCooldownTitle', 'Smart Ping: кулдаун (повторно через {time})', { time: formatCooldown(wait) })
            : text('smartPingAria', 'Smart Ping');
        return '<button type="button" class="' + btnClass + '" data-smart-ping="' + Number(appId) +
            '" onclick="event.stopPropagation(); if(window.SmartPing) SmartPing.open(' + Number(appId) + ')" aria-label="' +
            esc(title) + '" title="' + esc(title) + '">' +
            '<span class="pc-smart-ping-btn__bolt" aria-hidden="true">⚡</span>' +
            '<span class="pc-smart-ping-btn__full">' + esc(text('smartPingLabelFull', 'Smart Ping')) + '</span>' +
            '<span class="pc-smart-ping-btn__short">' + esc(text('smartPingLabelShort', 'Ping')) + '</span>' +
            (isCooldown ? '<span class="pc-smart-ping-btn__cooldown-dot" aria-hidden="true"></span>' : '') +
        '</button>';
    }

    window.SmartPing = {
        open: open,
        close: close,
        arm: arm,
        sync: sync,
        isArmed: isArmed,
        buttonHtml: buttonHtml,
        collectRecipients: collectRecipients,
        getLastPing: getLastPing,
        setLastPing: setLastPing,
        isTesterPinged: isTesterPinged,
        getTesterPingTime: getTesterPingTime,
        cooldownRemaining: cooldownRemaining,
        COST: COST,
    };
})();
