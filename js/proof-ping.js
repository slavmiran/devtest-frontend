/* Proof ping — "@nickname" mention for control-day screenshots.
   One switch per project, rendered as three states inside the owner card and
   mirrored by a master switch in "Settings & support". */
(function () {
    'use strict';

    var DISMISS_PREFIX = 'pc_ping_dismissed_';
    var PENDING_PREFIX = 'pc_ping_pending_';
    var MASTER_STORAGE_KEY = 'pc_ping_master_v1';
    var FALLBACK_GROUP_URL = 'https://t.me/googleplay_console_12testers';
    var masterEnabled = true;
    var masterReady = false;

    function uiLang() {
        return typeof lang !== 'undefined' ? lang : 'ru';
    }

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var value = window.t(key, params || {}, uiLang());
            if (value && value !== key) return value;
        }
        var raw = fallback;
        if (params && typeof raw === 'string') {
            Object.keys(params).forEach(function (name) {
                raw = raw.replace(new RegExp('\\{' + name + '\\}', 'g'), String(params[name]));
            });
        }
        return raw;
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

    function isInviteTelegramUrl(url) {
        return /t\.me\/\+|t\.me\/joinchat\//i.test(String(url || ''));
    }

    function communityUrl() {
        var configured = String((window.App && window.App.publicGroupUrl) || '').trim().replace(/\/+$/, '');
        if (configured && !isInviteTelegramUrl(configured)) return configured;
        return FALLBACK_GROUP_URL;
    }

    function proofsTopicUrl() {
        var community = communityUrl();
        var configured = String((window.App && window.App.proofsTopicUrl) || '').trim().replace(/\/+$/, '');
        if (configured && !isInviteTelegramUrl(configured)) return configured;
        var match = configured.match(/\/(\d+)$/);
        if (match) return community + '/' + match[1];
        return community;
    }

    function openTelegramUrl(url) {
        var target = String(url || communityUrl()).trim();
        if (!target) return;
        if (window.tg && typeof window.tg.openTelegramLink === 'function') {
            try {
                window.tg.openTelegramLink(target);
                return;
            } catch (_) {}
        }
        window.open(target, '_blank');
    }

    function ownerHandle() {
        var raw = '';
        try {
            if (typeof telegramUsername !== 'undefined' && telegramUsername) raw = String(telegramUsername);
            else if (window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user) {
                raw = String(window.tg.initDataUnsafe.user.username || '');
            }
        } catch (_) {}
        raw = String(raw || '').trim().replace(/^@+/, '');
        return raw || 'nickname';
    }

    function readStoredMaster() {
        try {
            var raw = localStorage.getItem(MASTER_STORAGE_KEY);
            if (raw === '0') return false;
            if (raw === '1') return true;
        } catch (_) {}
        return true;
    }

    function writeStoredMaster(value) {
        try {
            localStorage.setItem(MASTER_STORAGE_KEY, value ? '1' : '0');
        } catch (_) {}
    }

    function isMasterEnabled() {
        return masterEnabled !== false;
    }

    function setMasterLocal(value) {
        masterEnabled = value !== false;
        masterReady = true;
        writeStoredMaster(masterEnabled);
        if (window.App) window.App.proofPingMasterEnabled = masterEnabled;
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

    function notificationIconHtml(appId, enabled) {
        var src = enabled
            ? './images/Icons/notification-new-svgrepo-com.svg'
            : './images/Icons/notification-off-svgrepo-com.svg';
        return '<img class="pc-ping-svg-ico pc-ping-notification-icon" data-pc-ping-icon="' + Number(appId || 0) +
            '" src="' + src + '" alt="" aria-hidden="true">';
    }

    var TELEGRAM_ICON = '<svg class="pc-ping__glyph" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path fill="currentColor" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>' +
        '</svg>';

    function switchHtml(appId, enabled, extraClass) {
        return '<label class="toggle-switch pc-ping-switch' + (extraClass ? ' ' + extraClass : '') + '" onclick="event.stopPropagation();">' +
            '<input type="checkbox"' + (enabled ? ' checked' : '') +
            ' aria-label="' + esc(text('pcPingToggleAria', 'Screenshot notifications')) + '"' +
            ' onchange="pcProofPingToggle(' + Number(appId) + ', this)">' +
            '<span class="toggle-slider"></span>' +
        '</label>';
    }

    function dotSwitchHtml(appId, enabled) {
        return '<button type="button" class="pc-dotswitch' + (enabled ? ' is-on' : '') + '"' +
            ' aria-pressed="' + (enabled ? 'true' : 'false') + '"' +
            ' aria-label="' + esc(text('pcPingToggleAria', 'Screenshot notifications')) + '"' +
            ' onclick="event.stopPropagation(); pcProofPingToggleDot(' + Number(appId) + ', this)">' +
            '<span class="pc-dotswitch__dot" aria-hidden="true"></span>' +
        '</button>';
    }

    function descHtml() {
        var mention = '<span class="pc-ping__mention">' +
            esc(text('pcPingMention', '@mention')) + '</span>';
        var parts = String(text(
            'pcPingDesc',
            'Control-day screenshots land in the shared “Testing Proofs” topic. The bot tags you with an {mention}.'
        )).split('{mention}');
        return esc(parts[0] || '') + mention + esc(parts[1] || '');
    }

    function ctaHtml(modifier) {
        var isCommunity = modifier === 'sm';
        var label = isCommunity
            ? text('pcPingChatCtaShort', 'Community')
            : text('pcPingChatCta', 'Testing Proofs');
        var opener = isCommunity ? 'pcProofPingOpenCommunity(event)' : 'pcProofPingOpenChat(event)';
        var aria = isCommunity
            ? text('pcPingCommunityAria', 'Open Community Chat')
            : text('pcPingOpenAria', 'Open the Testing Proofs topic');
        return '<button type="button" class="pc-ping__link' + (modifier ? ' pc-ping__link--' + modifier : '') + '"' +
            ' aria-label="' + esc(aria) + '"' +
            ' onclick="' + opener + '">' +
            TELEGRAM_ICON +
            '<span class="pc-ping__link-label">' + esc(label) + '</span>' +
        '</button>';
    }

    function chatEntryHtml() {
        return '<button type="button" class="pc-ping__chat" onclick="pcProofPingOpenChat(event)">' +
            '<span class="pc-ping__chat-row">' +
                TELEGRAM_ICON +
                '<span class="pc-ping__chat-label">' + esc(text('pcPingChatCta', 'Testing Proofs')) + '</span>' +
                '<span class="pc-ping__chat-chev" aria-hidden="true">›</span>' +
            '</span>' +
            '<span class="pc-ping__chat-note">' + esc(text('pcPingNote', '')) + '</span>' +
        '</button>';
    }

    /* ── card markup ────────────────────────────────────────────────────── */

    function expandedHtml(project) {
        var appId = Number(project.id || project.app_id || 0);
        var enabled = isEnabled(project);
        return '<section class="pc-ping pc-ping--expanded' + (enabled ? ' is-on' : ' is-off') +
            '" data-pc-ping="' + appId + '" onclick="event.stopPropagation();">' +
            '<div class="pc-ping__head">' +
                '<div class="pc-ping__titles">' +
                    '<h3 class="pc-ping__title">' + esc(text('pcPingTitle', 'Notifications')) + '</h3>' +
                    '<p class="pc-ping__desc">' + descHtml() + '</p>' +
                '</div>' +
                dotSwitchHtml(appId, enabled) +
            '</div>' +
            '<div class="pc-ping__foot">' +
                chatEntryHtml() +
            '</div>' +
        '</section>';
    }

    function compactHtml(project) {
        var appId = Number(project.id || project.app_id || 0);
        var enabled = isEnabled(project);
        return '<section class="pc-ping pc-ping--compact' + (enabled ? ' is-on' : ' is-off') +
            '" data-pc-ping="' + appId + '" onclick="event.stopPropagation();">' +
            '<button type="button" class="pc-ping-icon-btn' + (enabled ? ' is-on' : ' is-off') + '"' +
                ' aria-pressed="' + (enabled ? 'true' : 'false') + '"' +
                ' aria-label="' + esc(text('pcPingToggleAria', 'Screenshot notifications')) + '"' +
                ' onclick="event.stopPropagation(); pcProofPingToggleDot(' + Number(appId) + ', this)">' +
                notificationIconHtml(appId, enabled) +
            '</button>' +
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
        var on = !!enabled;
        var selectors = [
            '[data-pc-ping="' + safeId + '"] input[type="checkbox"]',
            '[data-pc-ping-row="' + safeId + '"] input[type="checkbox"]',
            '#project-drawer-ping-' + safeId,
        ];
        selectors.forEach(function (selector) {
            Array.prototype.slice.call(document.querySelectorAll(selector)).forEach(function (input) {
                input.checked = on;
            });
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-pc-ping="' + safeId + '"]')).forEach(function (block) {
            block.classList.toggle('is-on', on);
            block.classList.toggle('is-off', !on);
            Array.prototype.slice.call(block.querySelectorAll('.pc-dotswitch, .pc-ping-icon-btn')).forEach(function (btn) {
                btn.classList.toggle('is-on', on);
                btn.classList.toggle('is-off', !on);
                btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-pc-ping-icon="' + safeId + '"]')).forEach(function (icon) {
            icon.src = on
                ? './images/Icons/notification-new-svgrepo-com.svg'
                : './images/Icons/notification-off-svgrepo-com.svg';
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-pc-ping-drawer="' + safeId + '"]')).forEach(function (tile) {
            tile.classList.toggle('is-on', on);
            tile.classList.toggle('is-off', !on);
            tile.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-pc-ping-drawer-icon="' + safeId + '"]')).forEach(function (icon) {
            icon.src = on
                ? './images/Icons/notification-new-svgrepo-com.svg'
                : './images/Icons/notification-off-svgrepo-com.svg';
        });
        Array.prototype.slice.call(document.querySelectorAll('[data-pc-ping-drawer-status="' + safeId + '"]')).forEach(function (status) {
            status.classList.toggle('is-on', on);
            status.classList.toggle('is-off', !on);
            status.textContent = text(
                on ? 'pcQuickSettingsNotificationsOn' : 'pcQuickSettingsNotificationsOff',
                on ? 'Enabled' : 'Disabled'
            );
        });
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

    function syncMasterSwitch() {
        var on = isMasterEnabled();
        var master = document.getElementById('proof-ping-master-toggle');
        if (master) master.checked = on;
        var settingsRow = document.getElementById('settings-proof-ping-toggle');
        if (settingsRow) settingsRow.checked = on;
        var sheet = document.getElementById('proof-ping-sheet');
        if (sheet) {
            sheet.classList.toggle('is-master-off', !on);
            var banner = sheet.querySelector('.proof-ping-sheet__banner');
            if (banner) banner.hidden = on;
        }
    }

    function syncSettingsRow() {
        var labelText = document.getElementById('settings-proof-ping-label-text');
        if (labelText) {
            labelText.textContent = text('settingsProofPingLabelText', 'Notifications');
        } else {
            var label = document.getElementById('settings-proof-ping-label');
            if (label) label.textContent = text('settingsProofPingLabel', 'Notifications');
        }
        var meta = document.getElementById('settings-proof-ping-meta');
        if (meta) {
            meta.textContent = text(
                'settingsProofPingMeta',
                'Mention @{username} in the Testing Proofs topic',
                { username: ownerHandle() }
            );
        }
        var chatLabel = document.getElementById('settings-proof-ping-chat-label');
        if (chatLabel) chatLabel.textContent = text('settingsProofPingCommunity', 'Community Chat');
        syncMasterSwitch();
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
        if (title) title.textContent = text('settingsProofPingSheetTitle', 'Notifications');
        var hint = document.getElementById('proof-ping-sheet-hint');
        if (hint) hint.textContent = text('settingsProofPingSheetHint', '');
        var masterLabel = document.getElementById('proof-ping-master-label');
        if (masterLabel) masterLabel.textContent = text('settingsProofPingMaster', 'All notifications');
        var banner = document.getElementById('proof-ping-sheet-banner');
        if (banner) banner.textContent = text('settingsProofPingMasterOff', 'Global mute is on: no @mentions are sent.');
        var chatLabel = document.getElementById('proof-ping-sheet-chat-label');
        if (chatLabel) chatLabel.textContent = text('settingsProofPingCommunity', 'Community Chat');
        syncMasterSwitch();
    }

    async function persistMaster(enabled) {
        try {
            var response = await fetch(apiBase() + '/users/me/proof-ping-master', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !!enabled, init_data: initData() }),
            });
            var payload = await response.json().catch(function () { return {}; });
            if (!response.ok || !payload || payload.status !== 'success') {
                throw new Error((payload && payload.code) || 'proof_ping_master_save_failed');
            }
            return true;
        } catch (error) {
            if (typeof window.showToast === 'function') {
                window.showToast(text('settingsProofPingSaveError', 'Could not save the setting'));
            }
            return false;
        }
    }

    async function setMasterEnabled(enabled) {
        var previous = isMasterEnabled();
        setMasterLocal(enabled);
        syncMasterSwitch();
        var saved = await persistMaster(enabled);
        if (!saved) {
            setMasterLocal(previous);
            syncMasterSwitch();
        }
    }

    window.pcProofPingToggle = function (appId, input) {
        var enabled = !!(input && input.checked);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        setEnabled(appId, enabled);
    };

    window.pcProofPingToggleDot = function (appId, button) {
        var enabled = !(button && button.classList.contains('is-on'));
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        setEnabled(appId, enabled);
    };

    window.pcProofPingMasterToggle = function (input) {
        var enabled = !!(input && input.checked);
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        setMasterEnabled(enabled);
    };

    window.pcProofPingOpenChat = function (event) {
        if (event) event.stopPropagation();
        openTelegramUrl(proofsTopicUrl());
    };

    window.pcProofPingOpenCommunity = function (event) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        openTelegramUrl(communityUrl());
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
        isMasterEnabled: isMasterEnabled,
        applyMasterFromProfile: function (value) {
            setMasterLocal(value !== false);
            syncSettingsRow();
        },
        syncMasterSwitch: syncMasterSwitch,
        syncSettingsRow: syncSettingsRow,
    };

    setMasterLocal(readStoredMaster());
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncSettingsRow);
    } else {
        syncSettingsRow();
    }
})();
