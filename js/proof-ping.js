/* Proof ping — "@nickname" mention for control-day screenshots.
   One switch per project, rendered as three states inside the owner card and
   mirrored by a master switch in "Settings & support". */
(function () {
    'use strict';

    var DISMISS_PREFIX = 'pc_ping_dismissed_';
    var PENDING_PREFIX = 'pc_ping_pending_';
    var FALLBACK_GROUP_URL = 'https://t.me/googleplay_console_12testers';

    function uiLang() {
        return typeof lang !== 'undefined' ? lang : 'ru';
    }

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var value = window.t(key, params || {}, uiLang());
            if (value && value !== key) return value;
        }
        return fallback;
    }

    function esc(value) {
        return typeof window.escapeHTML === 'function'
            ? window.escapeHTML(String(value == null ? '' : value))
            : String(value == null ? '' : value);
    }

    function projects() {
        return Array.isArray(window.myProjects) ? window.myProjects : [];
    }

    function projectById(appId) {
        var safeId = Number(appId || 0);
        return projects().find(function (item) {
            return Number(item && (item.id || item.app_id) || 0) === safeId;
        }) || null;
    }

    function topicUrl() {
        return (window.App && window.App.proofsTopicUrl)
            || (window.App && window.App.publicGroupUrl)
            || FALLBACK_GROUP_URL;
    }

    /* ── switch state ────────────────────────────────────────────────────────
       The server value wins, except while an optimistic write is in flight. */

    function pendingValue(appId) {
        try {
            var raw = sessionStorage.getItem(PENDING_PREFIX + Number(appId || 0));
            if (raw === '1') return true;
            if (raw === '0') return false;
        } catch (_) {}
        return null;
    }

    function rememberPending(appId, value) {
        try {
            if (value === null) sessionStorage.removeItem(PENDING_PREFIX + Number(appId || 0));
            else sessionStorage.setItem(PENDING_PREFIX + Number(appId || 0), value ? '1' : '0');
        } catch (_) {}
    }

    function isEnabled(project) {
        if (!project) return true;
        var appId = Number(project.id || project.app_id || 0);
        var pending = pendingValue(appId);
        if (pending !== null) return pending;
        return project.proof_ping_enabled !== false;
    }

    function isDismissed(appId) {
        try {
            return localStorage.getItem(DISMISS_PREFIX + Number(appId || 0)) === '1';
        } catch (_) {
            return false;
        }
    }

    function rememberDismissed(appId) {
        try {
            localStorage.setItem(DISMISS_PREFIX + Number(appId || 0), '1');
        } catch (_) {}
    }

    function testerCount(project) {
        var testers = Array.isArray(project && project.testers) ? project.testers : [];
        return testers.filter(function (tester) {
            return tester && !tester.is_left_soft;
        }).length;
    }

    /** 'expanded' while the project is empty, 'compact' once testers arrive,
        'mini' after the owner hides the bar. */
    function stateFor(project) {
        if (!project) return 'mini';
        if (testerCount(project) < 1) return 'expanded';
        return isDismissed(project.id || project.app_id) ? 'mini' : 'compact';
    }

    /* ── icons ──────────────────────────────────────────────────────────── */

    var TELEGRAM_ICON = '<svg class="pc-ping__glyph" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>' +
        '</svg>';

    var BELL_ICON = '<svg class="pc-ping__glyph" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4a1.5 1.5 0 0 0-3 0v.68C7.64 5.36 6 7.92 6 11v5l-1.71 1.71A1 1 0 0 0 5 19.4h14a1 1 0 0 0 .71-1.7L18 16z"/>' +
        '</svg>';

    function switchHtml(appId, enabled, extraClass) {
        return '<label class="toggle-switch' + (extraClass ? ' ' + extraClass : '') + '" onclick="event.stopPropagation();">' +
            '<input type="checkbox"' + (enabled ? ' checked' : '') +
            ' aria-label="' + esc(text('pcPingToggleAria', 'Screenshot notifications')) + '"' +
            ' onchange="pcProofPingToggle(' + Number(appId) + ', this)">' +
            '<span class="toggle-slider"></span>' +
        '</label>';
    }

    function ctaHtml(modifier) {
        var label = modifier === 'sm'
            ? text('pcPingChatCtaShort', 'Community')
            : text('pcPingChatCta', 'Testing Proofs');
        return '<button type="button" class="pc-ping__cta' + (modifier ? ' pc-ping__cta--' + modifier : '') + '"' +
            ' aria-label="' + esc(text('pcPingOpenAria', 'Open the Testing Proofs topic')) + '"' +
            ' onclick="pcProofPingOpenChat(event)">' +
            TELEGRAM_ICON +
            '<span class="pc-ping__cta-label">' + esc(label) + '</span>' +
        '</button>';
    }

    /* ── card markup ────────────────────────────────────────────────────── */

    function expandedHtml(project) {
        var appId = Number(project.id || project.app_id || 0);
        return '<section class="pc-ping pc-ping--expanded" data-pc-ping="' + appId + '" onclick="event.stopPropagation();">' +
            '<div class="pc-ping__head">' +
                '<span class="pc-ping__mark">' + BELL_ICON + '</span>' +
                '<div class="pc-ping__titles">' +
                    '<h3 class="pc-ping__title">' + esc(text('pcPingTitle', 'Proof ping in chat')) + '</h3>' +
                    '<p class="pc-ping__desc">' + esc(text('pcPingDesc', '')) + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="pc-ping__controls">' +
                '<div class="pc-ping__switch-row">' +
                    '<span class="pc-ping__switch-label">' + esc(text('pcPingToggleLabel', 'Screenshot notifications')) + '</span>' +
                    switchHtml(appId, isEnabled(project)) +
                '</div>' +
                ctaHtml('') +
            '</div>' +
            '<p class="pc-ping__note">' + esc(text('pcPingNote', '')) + '</p>' +
        '</section>';
    }

    function compactHtml(project) {
        var appId = Number(project.id || project.app_id || 0);
        return '<section class="pc-ping pc-ping--compact" data-pc-ping="' + appId + '" onclick="event.stopPropagation();">' +
            '<span class="pc-ping__mark pc-ping__mark--sm">' + BELL_ICON + '</span>' +
            '<span class="pc-ping__compact-label">' + esc(text('pcPingCompactLabel', 'Screenshot ping')) + '</span>' +
            switchHtml(appId, isEnabled(project), 'toggle-switch--sm') +
            ctaHtml('sm') +
            '<button type="button" class="pc-ping__close" aria-label="' + esc(text('pcPingHide', 'Hide')) + '"' +
                ' onclick="pcProofPingDismiss(' + appId + ', event)">' +
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71 12 12.01l-6.3-6.3-1.4 1.41 6.29 6.3-6.3 6.29 1.42 1.42 6.29-6.3 6.3 6.3 1.41-1.42-6.3-6.29 6.3-6.3z"/></svg>' +
            '</button>' +
        '</section>';
    }

    /** State 3 lives in the project status row and keeps the Telegram icon as
        the visual bridge between all three states. */
    function miniHtml(project) {
        var appId = Number(project.id || project.app_id || 0);
        return '<button type="button" class="pc-ping-mini" data-pc-ping-mini="' + appId + '"' +
            ' aria-label="' + esc(text('pcPingOpenAria', 'Open the Testing Proofs topic')) + '"' +
            ' onclick="pcProofPingOpenChat(event)">' + TELEGRAM_ICON + '</button>';
    }

    function blockHtml(project) {
        var state = stateFor(project);
        if (state === 'expanded') return expandedHtml(project);
        if (state === 'compact') return compactHtml(project);
        return '';
    }

    /* ── actions ────────────────────────────────────────────────────────── */

    function apiBase() {
        return typeof API_BASE !== 'undefined' ? API_BASE : '/api';
    }

    function initData() {
        if (typeof getTelegramInitDataRaw === 'function') return getTelegramInitDataRaw();
        return (window.tg && window.tg.initData) || '';
    }

    async function persist(appId, enabled) {
        var safeId = Number(appId || 0);
        rememberPending(safeId, enabled);
        try {
            var response = await fetch(apiBase() + '/projects/' + safeId + '/proof-ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !!enabled, init_data: initData() }),
            });
            var payload = await response.json().catch(function () { return {}; });
            if (!response.ok || !payload || payload.status !== 'success') {
                throw new Error('proof_ping_save_failed');
            }
            var project = projectById(safeId);
            if (project) project.proof_ping_enabled = !!enabled;
            rememberPending(safeId, null);
            return true;
        } catch (error) {
            rememberPending(safeId, null);
            if (typeof window.showToast === 'function') {
                window.showToast(text('settingsProofPingSaveError', 'Could not save the setting'));
            }
            return false;
        }
    }

    function syncSwitches(appId, enabled) {
        var safeId = Number(appId || 0);
        var selectors = [
            '[data-pc-ping="' + safeId + '"] input[type="checkbox"]',
            '[data-pc-ping-row="' + safeId + '"] input[type="checkbox"]',
        ];
        selectors.forEach(function (selector) {
            Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (input) {
                input.checked = !!enabled;
            });
        });
        syncMasterSwitch();
    }

    async function setEnabled(appId, enabled) {
        var safeId = Number(appId || 0);
        syncSwitches(safeId, enabled);
        var saved = await persist(safeId, enabled);
        if (!saved) {
            var project = projectById(safeId);
            syncSwitches(safeId, project ? project.proof_ping_enabled !== false : true);
        }
    }

    /* ── settings sheet ─────────────────────────────────────────────────── */

    function ownedProjects() {
        return projects().filter(function (project) {
            var status = String(project && (project.app_status || project.status) || 'active').toLowerCase();
            return status === 'active' || status === 'pending_completion';
        });
    }

    function masterState() {
        var list = ownedProjects();
        if (!list.length) return true;
        return list.some(function (project) { return isEnabled(project); });
    }

    function syncMasterSwitch() {
        var master = document.getElementById('proof-ping-master-toggle');
        if (master) master.checked = masterState();
        var settingsRow = document.getElementById('settings-proof-ping-toggle');
        if (settingsRow) settingsRow.checked = masterState();
    }

    function sheetRowsHtml() {
        var list = ownedProjects();
        if (!list.length) {
            return '<p class="proof-ping-sheet__empty">' + esc(text('settingsProofPingEmpty', 'No active projects yet.')) + '</p>';
        }
        return '<ul class="proof-ping-sheet__list">' + list.map(function (project) {
            var appId = Number(project.id || project.app_id || 0);
            var name = project.name || project.package || project.package_name || ('#' + appId);
            return '<li class="proof-ping-sheet__row" data-pc-ping-row="' + appId + '">' +
                '<span class="proof-ping-sheet__name notranslate">' + esc(name) + '</span>' +
                switchHtml(appId, isEnabled(project), 'toggle-switch--sm') +
            '</li>';
        }).join('') + '</ul>';
    }

    function fillSheet() {
        var body = document.getElementById('proof-ping-sheet-body');
        if (!body) return;
        body.innerHTML = sheetRowsHtml();
        var title = document.getElementById('proof-ping-sheet-title');
        if (title) title.textContent = text('settingsProofPingSheetTitle', 'Screenshot notifications');
        var hint = document.getElementById('proof-ping-sheet-hint');
        if (hint) hint.textContent = text('settingsProofPingSheetHint', '');
        var masterLabel = document.getElementById('proof-ping-master-label');
        if (masterLabel) masterLabel.textContent = text('settingsProofPingMaster', 'All projects');
        syncMasterSwitch();
    }

    window.pcProofPingToggle = function (appId, input) {
        var enabled = !!(input && input.checked);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        setEnabled(appId, enabled);
    };

    window.pcProofPingMasterToggle = function (input) {
        var enabled = !!(input && input.checked);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        ownedProjects().forEach(function (project) {
            if (isEnabled(project) === enabled) return;
            setEnabled(Number(project.id || project.app_id || 0), enabled);
        });
    };

    window.pcProofPingOpenChat = function (event) {
        if (event) event.stopPropagation();
        var url = topicUrl();
        if (window.tg && typeof window.tg.openTelegramLink === 'function') {
            window.tg.openTelegramLink(url);
            return;
        }
        window.open(url, '_blank');
    };

    /** Collapse the compact bar into the Telegram icon pinned to the status row. */
    window.pcProofPingDismiss = function (appId, event) {
        if (event) event.stopPropagation();
        var safeId = Number(appId || 0);
        rememberDismissed(safeId);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');

        var bar = document.querySelector('.pc-ping--compact[data-pc-ping="' + safeId + '"]');
        var card = document.getElementById('project-card-' + safeId);
        var slot = card && card.querySelector('[data-pc-ping-slot="' + safeId + '"]');
        var project = projectById(safeId);

        function finish() {
            if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
            if (slot && project && !slot.querySelector('.pc-ping-mini')) {
                slot.innerHTML = miniHtml(project);
                var mini = slot.querySelector('.pc-ping-mini');
                if (mini) mini.classList.add('is-landing');
            }
        }

        if (!bar) {
            finish();
            return;
        }
        bar.style.height = bar.offsetHeight + 'px';
        // Force layout so the height transition has a measured start value.
        void bar.offsetHeight;
        bar.classList.add('is-collapsing');
        bar.style.height = '0px';
        var done = false;
        function onEnd() {
            if (done) return;
            done = true;
            bar.removeEventListener('transitionend', onEnd);
            finish();
        }
        bar.addEventListener('transitionend', onEnd);
        setTimeout(onEnd, 420);
    };

    window.openProofPingSettingsSheet = function (event) {
        if (event) event.stopPropagation();
        var overlay = document.getElementById('proof-ping-sheet');
        if (!overlay) return;
        fillSheet();
        overlay.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    };

    window.closeProofPingSettingsSheet = function (event) {
        var overlay = document.getElementById('proof-ping-sheet');
        if (event && event.target !== overlay) return;
        if (overlay) overlay.classList.remove('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    };

    window.ProofPing = {
        blockHtml: blockHtml,
        miniHtml: miniHtml,
        stateFor: stateFor,
        isEnabled: isEnabled,
        isDismissed: isDismissed,
        syncMasterSwitch: syncMasterSwitch,
    };
})();
