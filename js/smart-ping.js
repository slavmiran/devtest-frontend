/* Paid targeted reminder sheet: Smart Ping. */
(function () {
    'use strict';

    var COST = 10;
    var COOLDOWN_MS = 6 * 60 * 60 * 1000;
    var LEFT_STATUSES = ['abandoned', 'justified_exit', 'dropped', 'kicked_by_owner', 'canceled_neutral'];
    var CONTROL_DAYS = [1, 4, 7, 10, 14];
    var SECTION_ORDER = ['both', 'attention', 'control', 'rhythm'];
    var state = {
        appId: 0,
        filter: 'risk',
        recipients: [],
        sending: false,
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
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
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
        var armed = arguments.length > 1 ? isHotFilter(filter) : isArmed(safeId);
        document.querySelectorAll('[data-smart-ping="' + safeId + '"]').forEach(function (btn) {
            btn.classList.toggle('is-armed', armed);
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
        var mod10 = n % 10;
        var mod100 = n % 100;
        var key = 'pcAttentionSkipsMany';
        if (mod100 >= 11 && mod100 <= 19) key = 'pcAttentionSkipsMany';
        else if (mod10 === 1) key = 'pcAttentionSkipsOne';
        else if (mod10 >= 2 && mod10 <= 4) key = 'pcAttentionSkipsFew';
        return text(key, '{count} consecutive skips', { count: n });
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
        if (code === 'missed_control') {
            return reason.label || text('pcAttentionMissedControlDay', 'Control proof for day {day} was not received', { day: reason.missedDay || '' });
        }
        if (code === 'broken_link') return text('smartPingReasonBroken', 'Связь разорвана');
        if (code === 'not_opened') return reason.label || text('smartPingReasonNotOpened', 'Ещё не открыл приложение');
        return String((reason && reason.label) || '').trim();
    }
    function markersFor(row) {
        var list = [];
        var skips = skipsCount(row.tester);
        if (skips >= 1) list.push(skipsLabel(skips));
        if (row.controlDay > 0) {
            var detail = signalDetail(row.assessment);
            list.push(detail
                ? text('smartPingMarkerControlSignals', 'Контрольный день {day} ({detail})', { day: row.controlDay, detail: detail })
                : text('smartPingMarkerControl', 'Контрольный день {day}', { day: row.controlDay }));
        } else if (row.signals > 0) {
            var onlySignals = signalDetail(row.assessment);
            if (onlySignals) list.push(onlySignals);
        }
        if (row.hasDebt) list.push(debtMarker(skips));
        (row.reasons || []).forEach(function (reason) {
            var code = String(reason && reason.code || '');
            if (code === 'skips' || code === 'debt' || code === 'tester_left') return;
            var label = extraReasonLabel(reason);
            if (label && list.indexOf(label) === -1) list.push(label);
        });
        return list.filter(Boolean);
    }
    function isRisk(row) {
        if (row.section === 'both' || row.section === 'attention') return true;
        return (row.section === 'control' || row.section === 'rhythm') && row.signals >= 3;
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
            row.risk = isRisk(row);
            row.checked = row.risk;
            rows.push(row);
        }

        attention.forEach(function (item) {
            var tester = item.tester || {};
            var testerId = testerIdOf(item, tester.tester_id || tester.id);
            if (testerId <= 0 || hasLeft(item, tester)) return;
            var pending = pendingById[testerId];
            var assessment = assessmentOf(pending, tester, project);
            var codes = reasonCodes(item);
            pushRow({
                testerId: testerId,
                tester: tester,
                item: item,
                section: pending ? 'both' : 'attention',
                reasons: item.reasons || [],
                assessment: assessment,
                signals: signalScore(assessment),
                controlDay: pending ? testerDay(tester, pending) : 0,
                hasDebt: codes.indexOf('debt') !== -1,
            });
        });

        Object.keys(pendingById).forEach(function (id) {
            var pending = pendingById[id];
            var tester = pending.tester || {};
            var testerId = Number(id);
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
    function applyFilter(filter) {
        state.filter = filter;
        state.recipients.forEach(function (row) {
            if (filter === 'all') row.checked = true;
            else if (filter === 'none') row.checked = false;
            else row.checked = !!row.risk;
        });
    }
    function selected() {
        return state.recipients.filter(function (row) { return row.checked; });
    }
    function parseSentAt(value) {
        var raw = String(value || '').trim();
        if (!raw) return 0;
        var ms = Date.parse(raw);
        return Number.isFinite(ms) ? ms : 0;
    }
    function cooldownRemaining(project) {
        var sentAt = parseSentAt(project && project.smart_ping_sent_at);
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
    function overlay() {
        return document.getElementById('smart-ping-modal');
    }
    function close() {
        var node = overlay();
        if (!node) return;
        node.classList.remove('active');
        if (node.parentNode) node.parentNode.removeChild(node);
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
            disabled: false,
            label: text('smartPingSend', '⚡ Отправить напоминания • {cost} $BUST', { cost: formatBust(cost) }),
        };
    }
    function rowHtml(row) {
        var badge = row.risk
            ? '<span class="smart-ping-risk-badge"><i class="smart-ping-risk-dot" aria-hidden="true"></i>' + esc(text('smartPingRiskBadge', 'Риск')) + '</span>'
            : '';
        var reasons = (row.markers || []).map(function (marker) {
            return '<li>' + esc(marker) + '</li>';
        }).join('');
        return '<label class="smart-ping-row' + (row.risk ? ' is-risk' : '') + '">' +
            '<input type="checkbox" data-smart-ping-tester="' + row.testerId + '"' + (row.checked ? ' checked' : '') + '>' +
            avatarHtml(row.tester) +
            '<span class="smart-ping-row__meta">' +
                '<span class="smart-ping-row__name"><strong>' + esc(handleOf(row.tester)) + '</strong>' + badge + '</span>' +
                (reasons ? '<ul class="smart-ping-row__reasons">' + reasons + '</ul>' : '') +
            '</span>' +
        '</label>';
    }
    function sectionTitle(section) {
        if (section === 'both') return text('smartPingSectionBoth', '⚡ Внимание + Контроль');
        if (section === 'attention') return text('smartPingSectionAttention', '⚠️ Зона внимания (Вкладка «Внимание»)');
        if (section === 'control') return text('smartPingSectionControl', '📸 Контрольные отчёты (Вкладка «Контроль»)');
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
            footer.textContent = state.sending ? text('smartPingSending', 'Отправка…') : next.label;
        }
    }
    function bindSwipe(node) {
        var sheet = node.querySelector('.smart-ping-sheet');
        var body = node.querySelector('.smart-ping-sheet__body');
        if (!sheet || sheet._hasSwipeListener) return;
        sheet._hasSwipeListener = true;
        var startY = 0;
        var currentY = 0;
        var dragging = false;
        sheet.addEventListener('touchstart', function (event) {
            if (body && body.scrollTop > 5) return;
            startY = event.touches[0].clientY;
            currentY = startY;
            dragging = true;
        }, { passive: true });
        sheet.addEventListener('touchmove', function (event) {
            if (!dragging) return;
            currentY = event.touches[0].clientY;
            var delta = currentY - startY;
            if (delta > 0 && (!body || body.scrollTop <= 0)) {
                sheet.style.transform = 'translateY(' + delta + 'px)';
            }
        }, { passive: true });
        sheet.addEventListener('touchend', function () {
            if (!dragging) return;
            dragging = false;
            var delta = currentY - startY;
            sheet.style.transform = '';
            if (delta > 90) close();
        });
    }
    function bind(node) {
        node.addEventListener('click', function (event) {
            if (event.target === node) close();
        });
        node.querySelectorAll('[data-smart-ping-filter]').forEach(function (btn) {
            btn.addEventListener('click', function (event) {
                event.preventDefault();
                applyFilter(btn.getAttribute('data-smart-ping-filter'));
                render();
            });
        });
        node.addEventListener('change', function (event) {
            var input = event.target;
            if (!input || !input.matches || !input.matches('[data-smart-ping-tester]')) return;
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
            submit();
        });
        bindSwipe(node);
    }
    async function submit() {
        var project = projectById(state.appId);
        var picked = selected();
        var next = footerState(project);
        if (!project || next.disabled || state.sending || !picked.length) return;
        state.sending = true;
        render();
        try {
            var apiBase = (typeof API_BASE !== 'undefined' && API_BASE) || (window.App && window.App.API_BASE) || '/api';
            var response = await fetch(apiBase + '/project/smart-ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    init_data: initData(),
                    project_id: Number(project.id || project.app_id),
                    tester_ids: picked.map(function (row) { return row.testerId; }),
                }),
            });
            var payload = await response.json().catch(function () { return {}; });
            if (!response.ok || payload.status !== 'success') {
                var code = String(payload.code || payload.error || '');
                if (code === 'insufficient_bust_balance') {
                    if (visibilityStats && payload.details && payload.details.balance_bust != null) {
                        visibilityStats.balance_bust = Number(payload.details.balance_bust);
                    }
                }
                if (code === 'smart_ping_cooldown' && payload.details && payload.details.sent_at) {
                    project.smart_ping_sent_at = payload.details.sent_at;
                }
                throw new Error(code || 'smart_ping_failed');
            }
            if (visibilityStats && payload.balance_bust != null) {
                visibilityStats.balance_bust = Number(payload.balance_bust);
            }
            project.smart_ping_sent_at = payload.sent_at || new Date().toISOString();
            if (typeof showToast === 'function') {
                showToast(text('smartPingSent', 'Напоминания поставлены в очередь: {count}', {
                    count: Number(payload.charged_count || picked.length),
                }));
            }
            close();
        } catch (_) {
            state.sending = false;
            render();
            if (typeof showToast === 'function') showToast(text('smartPingFailed', 'Не удалось отправить Smart Ping'));
        }
    }
    function open(appId) {
        var project = projectById(appId);
        if (!project) return;
        close();
        state.appId = Number(project.id || project.app_id);
        state.filter = 'risk';
        state.sending = false;
        state.recipients = collectRecipients(project);
        applyFilter('risk');
        var html = '<div id="smart-ping-modal" class="modal-overlay smart-ping-overlay active" role="presentation">' +
            '<section class="smart-ping-sheet" role="dialog" aria-modal="true" aria-labelledby="smart-ping-title">' +
                '<div class="sheet-handle" aria-hidden="true"></div>' +
                '<header class="smart-ping-sheet__head">' +
                    '<h3 id="smart-ping-title">' + esc(text('smartPingTitle', '⚡ Smart Ping')) + '</h3>' +
                    '<p class="smart-ping-sheet__balance"></p>' +
                '</header>' +
                '<div class="smart-ping-sheet__filters" role="group">' +
                    '<button type="button" class="is-active" data-smart-ping-filter="risk">' + esc(text('smartPingFilterRisk', 'Группа риска')) + '</button>' +
                    '<button type="button" data-smart-ping-filter="all">' + esc(text('smartPingFilterAll', 'Выбрать всех')) + '</button>' +
                    '<button type="button" data-smart-ping-filter="none">' + esc(text('smartPingFilterNone', 'Сбросить')) + '</button>' +
                '</div>' +
                '<div class="smart-ping-sheet__body"></div>' +
                '<footer class="smart-ping-sheet__foot">' +
                    '<button type="button" class="smart-ping-sheet__send"></button>' +
                '</footer>' +
            '</section>' +
        '</div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var node = overlay();
        bind(node);
        render();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    }
    function buttonHtml(appId) {
        var armed = isArmed(appId);
        return '<button type="button" class="pc-smart-ping-btn' + (armed ? ' is-armed' : '') + '" data-smart-ping="' + Number(appId) +
            '" onclick="event.stopPropagation(); if(window.SmartPing) SmartPing.open(' + Number(appId) + ')" aria-label="' +
            esc(text('smartPingAria', 'Smart Ping')) + '" title="' + esc(text('smartPingAria', 'Smart Ping')) + '">' +
            '<span class="pc-smart-ping-btn__bolt" aria-hidden="true">⚡</span>' +
            '<span class="pc-smart-ping-btn__full">' + esc(text('smartPingLabelFull', 'Smart Ping')) + '</span>' +
            '<span class="pc-smart-ping-btn__short">' + esc(text('smartPingLabelShort', 'Ping')) + '</span>' +
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
        COST: COST,
    };
})();
