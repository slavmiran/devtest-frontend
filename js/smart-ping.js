/* Paid targeted reminder sheet: Smart Ping. */
(function () {
    'use strict';

    var COST = 10;
    var COOLDOWN_MS = 6 * 60 * 60 * 1000;
    var ARMED_PREFIX = 'pc_smart_ping_armed_';
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
    function armedKey(appId) {
        return ARMED_PREFIX + Number(appId || 0);
    }
    function isArmed(appId) {
        try {
            return sessionStorage.getItem(armedKey(appId)) === '1';
        } catch (_) {
            return false;
        }
    }
    function arm(appId) {
        var safeId = Number(appId || 0);
        if (safeId <= 0) return;
        try {
            sessionStorage.setItem(armedKey(safeId), '1');
        } catch (_) {}
        document.querySelectorAll('[data-smart-ping="' + safeId + '"]').forEach(function (btn) {
            btn.classList.add('is-armed');
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
    function primaryReason(item) {
        var reasons = (item && item.reasons) || [];
        var order = ['tester_left', 'broken_link', 'missed_control', 'skips', 'debt', 'direct_invite'];
        for (var i = 0; i < order.length; i += 1) {
            var match = reasons.find(function (reason) { return String(reason && reason.code || '') === order[i]; });
            if (match) return match;
        }
        return reasons[0] || null;
    }
    function attentionSubtitle(item) {
        var reason = primaryReason(item);
        var code = String(reason && reason.code || '').toLowerCase();
        var tester = item && item.tester || {};
        var skips = Number((reason && reason.skips) || skipsCount(tester) || 0);
        if (code === 'debt') return text('smartPingReasonDebt', 'Долг {count}д', { count: Math.max(1, skips) });
        if (code === 'skips') return skipsLabel(skips);
        if (code === 'direct_invite') return text('smartPingReasonInvite', 'Прямой инвайт · {count}', { count: Math.max(1, skips) });
        if (code === 'missed_control') {
            return reason.label || text('pcAttentionMissedControlDay', 'Control proof for day {day} was not received', { day: reason.missedDay || '' });
        }
        if (code === 'tester_left') return text('pcAttentionLeftTitle', 'Тестер прервал участие');
        if (code === 'broken_link') return text('smartPingReasonBroken', 'Связь разорвана');
        return String((reason && reason.label) || '').trim();
    }
    function controlSubtitle(assessment) {
        var score = Math.max(0, Math.min(4, Number(assessment && assessment.riskScore || 0)));
        var factors = [];
        if (assessment) {
            if (assessment.yesterday && assessment.yesterday.risk) factors.push(text('pcSignalFactorYesterday', 'вчера'));
            if (assessment.skips && assessment.skips.risk) factors.push(text('pcSignalFactorSkips', 'пропуски'));
            if (assessment.rhythm && assessment.rhythm.risk) factors.push(text('pcSignalFactorRhythm', 'ритм'));
            if (assessment.profile && assessment.profile.risk) factors.push(text('pcSignalFactorProfile', 'профиль'));
        }
        if (score <= 0) return text('pcSignalChipZero', 'В графике (всё стабильно)');
        if (score === 1) return text('pcSignalChipOne', '1 сигнал ({factor})', { factor: factors[0] || '' });
        if (score === 2) return text('pcSignalChipTwo', '2 сигнала ({f1} + {f2})', { f1: factors[0] || '', f2: factors[1] || '' });
        if (score === 3) return text('pcSignalChipThree', '3 сигнала ({f1} + {f2} + {f3})', { f1: factors[0] || '', f2: factors[1] || '', f3: factors[2] || '' });
        return text('pcSignalChipAll', '4 сигнала (все факторы)');
    }
    function collectRecipients(project) {
        var attention = (window.ProjectToday && typeof window.ProjectToday.collectAttention === 'function')
            ? (window.ProjectToday.collectAttention(project) || [])
            : [];
        var data = (window.ProjectToday && typeof window.ProjectToday.activityCounts === 'function')
            ? window.ProjectToday.activityCounts(project)
            : { controlRows: [] };
        var attentionIds = {};
        var sectionA = attention.map(function (item) {
            var tester = item.tester || {};
            var testerId = Number(item.testerId || tester.tester_id || tester.id || 0);
            attentionIds[testerId] = true;
            return {
                testerId: testerId,
                tester: tester,
                section: 'attention',
                subtitle: attentionSubtitle(item),
                signals: 1,
                checked: true,
            };
        }).filter(function (row) { return row.testerId > 0; });

        var pending = (data.controlRows || []).filter(function (row) { return row && !row.received; });
        var sectionB = pending.map(function (row) {
            var tester = row.tester || {};
            var testerId = Number(row.testerId || tester.tester_id || tester.id || 0);
            if (!testerId || attentionIds[testerId]) return null;
            var assessment = row.activityAssessment
                || (typeof calculateTesterControlActivityAssessment === 'function'
                    ? calculateTesterControlActivityAssessment(row, project)
                    : { riskScore: 0 });
            var signals = Math.max(0, Number(assessment && assessment.riskScore || 0));
            return {
                testerId: testerId,
                tester: tester,
                section: 'control',
                subtitle: controlSubtitle(assessment),
                signals: signals,
                checked: signals > 0,
            };
        }).filter(Boolean);

        return sectionA.concat(sectionB);
    }
    function applyFilter(filter) {
        state.filter = filter;
        state.recipients.forEach(function (row) {
            if (filter === 'all') row.checked = true;
            else if (filter === 'none') row.checked = false;
            else row.checked = row.section === 'attention' || row.signals > 0;
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
        return '<label class="smart-ping-row">' +
            '<input type="checkbox" data-smart-ping-tester="' + row.testerId + '"' + (row.checked ? ' checked' : '') + '>' +
            avatarHtml(row.tester) +
            '<span class="smart-ping-row__meta">' +
                '<strong>' + esc(handleOf(row.tester)) + '</strong>' +
                '<small>' + esc(row.subtitle || '') + '</small>' +
            '</span>' +
        '</label>';
    }
    function sectionHtml(title, rows) {
        if (!rows.length) return '';
        return '<section class="smart-ping-section">' +
            '<h4>' + esc(title) + ' <span>' + rows.length + '</span></h4>' +
            rows.map(rowHtml).join('') +
        '</section>';
    }
    function render() {
        var node = overlay();
        var project = projectById(state.appId);
        if (!node || !project) return;
        var attentionRows = state.recipients.filter(function (row) { return row.section === 'attention'; });
        var controlRows = state.recipients.filter(function (row) { return row.section === 'control'; });
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
                body.innerHTML = '<div class="smart-ping-empty">' + esc(text('smartPingEmpty', 'Нет получателей в зоне внимания и контроле')) + '</div>';
            } else {
                body.innerHTML =
                    sectionHtml(text('smartPingSectionAttention', '⚠️ Зона внимания (Вкладка «Внимание»)'), attentionRows) +
                    sectionHtml(text('smartPingSectionControl', '🕒 Контрольные отчёты (Вкладка «Контроль»)'), controlRows);
            }
        }
        if (footer) {
            var next = footerState(project);
            footer.disabled = next.disabled || state.sending;
            footer.textContent = state.sending ? text('smartPingSending', 'Отправка…') : next.label;
        }
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
        var dismiss = node.querySelector('.smart-ping-sheet__close');
        if (dismiss) dismiss.addEventListener('click', function (event) {
            event.preventDefault();
            close();
        });
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
                    '<div>' +
                        '<h3 id="smart-ping-title">' + esc(text('smartPingTitle', '⚡ Smart Ping')) + '</h3>' +
                        '<p class="smart-ping-sheet__balance"></p>' +
                    '</div>' +
                    '<button type="button" class="smart-ping-sheet__close" aria-label="' + esc(text('pcCloseDialog', 'Close')) + '">×</button>' +
                '</header>' +
                '<div class="smart-ping-sheet__filters" role="group">' +
                    '<button type="button" class="is-active" data-smart-ping-filter="risk">' + esc(text('smartPingFilterRisk', 'Только группа риска')) + '</button>' +
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
        isArmed: isArmed,
        buttonHtml: buttonHtml,
        collectRecipients: collectRecipients,
        COST: COST,
    };
})();
