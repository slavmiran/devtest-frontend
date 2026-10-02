/* Personal user-to-user blacklist sheet and dossier actions. */
(function () {
    'use strict';

    var _items = [];
    var _ids = new Set();
    var _showBlockedProjects = false;
    var _loaded = false;
    var _loading = null;
    var _busyIds = new Set();

    function t(key, params) {
        if (typeof window.t === 'function') {
            return window.t(key, params || {}, window.currentLang || window.lang);
        }
        return key;
    }

    function escapeHtml(value) {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(String(value || ''));
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function apiBase() {
        return String(window.API_BASE || '').replace(/\/+$/, '');
    }

    function initPayload(extra) {
        var payload = extra || {};
        if (typeof window.withInitData === 'function') return window.withInitData(payload);
        payload.init_data = (window.tg && window.tg.initData) || '';
        return payload;
    }

    function initQuery() {
        var raw = '';
        if (typeof window.getTelegramInitDataRaw === 'function') raw = window.getTelegramInitDataRaw();
        else raw = (window.tg && window.tg.initData) || '';
        return encodeURIComponent(String(raw || ''));
    }

    function toast(message) {
        if (typeof window.showToast === 'function') window.showToast(message);
    }

    function haptic(kind) {
        var tg = window.tg || (window.Telegram && window.Telegram.WebApp);
        if (tg && tg.HapticFeedback) {
            if (kind === 'success' || kind === 'error' || kind === 'warning') {
                tg.HapticFeedback.notificationOccurred(kind === 'error' ? 'error' : 'success');
            } else {
                tg.HapticFeedback.selectionChanged();
            }
        }
    }

    function confirmAction(message) {
        return new Promise(function (resolve) {
            var tg = window.tg || (window.Telegram && window.Telegram.WebApp);
            if (tg && typeof tg.showConfirm === 'function') {
                tg.showConfirm(message, function (ok) { resolve(!!ok); });
                return;
            }
            resolve(window.confirm(message));
        });
    }

    function applyPayload(payload) {
        _items = Array.isArray(payload && payload.items) ? payload.items.slice() : [];
        _ids = new Set(_items.map(function (item) { return Number(item && item.id); }).filter(function (id) { return id > 0; }));
        _showBlockedProjects = !!(payload && payload.show_blocked_projects);
        _loaded = true;
        var toggle = document.getElementById('blacklist-show-projects-toggle');
        if (toggle) toggle.checked = _showBlockedProjects;
        renderList();
    }

    function currentUserId() {
        return Number(
            (window.App && window.App.userId)
            || window.userId
            || (window.currentUser && window.currentUser.user_id)
            || 0
        );
    }

    async function fetchBlacklist() {
        var response = await fetch(apiBase() + '/user/blacklist?init_data=' + initQuery(), {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
        });
        var payload = null;
        try { payload = await response.json(); } catch (e) { payload = null; }
        if (!response.ok || !payload || payload.status !== 'success') {
            var code = (payload && (payload.code || payload.detail)) || 'err_default_api';
            if (typeof window.handleApiError === 'function') window.handleApiError(code, payload && payload.details);
            throw new Error(String(code));
        }
        applyPayload(payload);
        return payload;
    }

    function ensureUserBlacklistLoaded(force) {
        if (_loaded && !force) return Promise.resolve({ items: _items, show_blocked_projects: _showBlockedProjects });
        if (_loading && !force) return _loading;
        _loading = fetchBlacklist().catch(function (err) {
            _loading = null;
            throw err;
        }).then(function (payload) {
            _loading = null;
            return payload;
        });
        return _loading;
    }

    function isUserBlacklisted(userId) {
        return _ids.has(Number(userId || 0));
    }

    function formatDate(iso) {
        if (!iso) return '';
        var date = new Date(iso);
        if (isNaN(date.getTime())) return '';
        var locale = String(window.currentLang || window.lang || 'ru') === 'en' ? 'en-GB' : 'ru-RU';
        try {
            return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return date.toISOString().slice(0, 10);
        }
    }

    function avatarHtml(item) {
        var url = String((item && (item.photo_url || item.avatar_url)) || '').trim();
        var name = String((item && (item.first_name || item.full_name || item.username)) || '?').replace(/^@/, '');
        var initial = (name.charAt(0) || '?').toUpperCase();
        if (url) {
            return '<img class="blacklist-row__avatar" src="' + escapeHtml(url) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';">' +
                '<div class="blacklist-row__avatar-fallback" style="display:none;">' + escapeHtml(initial) + '</div>';
        }
        return '<div class="blacklist-row__avatar-fallback">' + escapeHtml(initial) + '</div>';
    }

    function renderList() {
        var body = document.getElementById('blacklist-body');
        if (!body) return;
        if (!_items.length) {
            body.innerHTML = '<p class="blacklist-empty">' + escapeHtml(t('blacklistEmpty')) + '</p>';
            return;
        }
        body.innerHTML = '<div class="blacklist-list">' + _items.map(function (item) {
            var id = Number(item && item.id || 0);
            var name = String((item && (item.first_name || item.full_name)) || '').trim() || t('unknownLabel');
            var username = String((item && item.username) || '').trim().replace(/^@+/, '');
            var dateLabel = formatDate(item && item.created_at);
            return '<div class="blacklist-row" data-blocked-id="' + id + '">' +
                '<div class="blacklist-row__left">' +
                    avatarHtml(item) +
                    '<div class="blacklist-row__meta">' +
                        '<div class="blacklist-row__name notranslate">' + escapeHtml(name) + '</div>' +
                        (username ? '<div class="blacklist-row__username notranslate">@' + escapeHtml(username) + '</div>' : '') +
                        (dateLabel ? '<div class="blacklist-row__date">' + escapeHtml(t('blacklistBlockedOn', { date: dateLabel })) + '</div>' : '') +
                    '</div>' +
                '</div>' +
                '<button type="button" class="btn btn-secondary blacklist-row__unblock" onclick="unblockBlacklistUser(' + id + ')">' +
                    escapeHtml(t('blacklistUnblockBtn')) +
                '</button>' +
            '</div>';
        }).join('') + '</div>';
    }

    function removeRow(targetId) {
        _items = _items.filter(function (item) { return Number(item && item.id) !== Number(targetId); });
        _ids.delete(Number(targetId));
        var row = document.querySelector('.blacklist-row[data-blocked-id="' + Number(targetId) + '"]');
        if (!row) {
            renderList();
            return;
        }
        row.classList.add('is-removing');
        setTimeout(function () {
            if (!_items.length) renderList();
            else if (row.parentNode) row.parentNode.removeChild(row);
        }, 220);
    }

    async function blockUser(targetUserId, displayName) {
        var target = Number(targetUserId || 0);
        if (target <= 0 || target === currentUserId()) return false;
        if (_busyIds.has(target)) return false;
        var confirmed = await confirmAction(t('blacklistConfirmBlock', { name: displayName || t('unknownLabel') }));
        if (!confirmed) return false;
        _busyIds.add(target);
        try {
            var response = await fetch(apiBase() + '/user/blacklist/' + target, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initPayload({})),
            });
            var payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            if (!response.ok || !payload || payload.status !== 'success') {
                var code = (payload && payload.code) || 'err_default_api';
                if (typeof window.handleApiError === 'function') window.handleApiError(code, payload && payload.details);
                return false;
            }
            _ids.add(target);
            haptic('success');
            toast(t('blacklistBlockedToast'));
            if (typeof window.loadTasks === 'function') window.loadTasks(false).catch(function () {});
            if (typeof window.loadProjects === 'function') window.loadProjects(true).catch(function () {});
            if (typeof window.loadMutualFeed === 'function') window.loadMutualFeed().catch(function () {});
            if (typeof window.loadBountyFeed === 'function') window.loadBountyFeed().catch(function () {});
            return true;
        } catch (err) {
            if (typeof window.handleApiError === 'function') window.handleApiError('network_error');
            return false;
        } finally {
            _busyIds.delete(target);
        }
    }

    async function unblockUser(targetUserId, displayName, skipConfirm) {
        var target = Number(targetUserId || 0);
        if (target <= 0) return false;
        if (_busyIds.has(target)) return false;
        if (!skipConfirm) {
            var confirmed = await confirmAction(t('blacklistConfirmUnblock', { name: displayName || t('unknownLabel') }));
            if (!confirmed) return false;
        }
        _busyIds.add(target);
        try {
            var response = await fetch(apiBase() + '/user/blacklist/' + target, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initPayload({})),
            });
            var payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            if (!response.ok || !payload || payload.status !== 'success') {
                var code = (payload && payload.code) || 'err_default_api';
                if (typeof window.handleApiError === 'function') window.handleApiError(code, payload && payload.details);
                return false;
            }
            haptic('success');
            toast(t('blacklistUnblockedToast'));
            removeRow(target);
            if (typeof window.loadMutualFeed === 'function') window.loadMutualFeed().catch(function () {});
            if (typeof window.loadBountyFeed === 'function') window.loadBountyFeed().catch(function () {});
            return true;
        } catch (err) {
            if (typeof window.handleApiError === 'function') window.handleApiError('network_error');
            return false;
        } finally {
            _busyIds.delete(target);
        }
    }

    async function setShowBlockedProjects(enabled) {
        var toggle = document.getElementById('blacklist-show-projects-toggle');
        var previous = _showBlockedProjects;
        _showBlockedProjects = !!enabled;
        if (toggle) toggle.checked = _showBlockedProjects;
        try {
            var response = await fetch(apiBase() + '/user/blacklist/preference', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(initPayload({ show_blocked_projects: !!enabled })),
            });
            var payload = null;
            try { payload = await response.json(); } catch (e) { payload = null; }
            if (!response.ok || !payload || payload.status !== 'success') {
                _showBlockedProjects = previous;
                if (toggle) toggle.checked = previous;
                var code = (payload && payload.code) || 'err_default_api';
                if (typeof window.handleApiError === 'function') window.handleApiError(code, payload && payload.details);
                return;
            }
            if (typeof window.loadMutualFeed === 'function') window.loadMutualFeed().catch(function () {});
            if (typeof window.loadBountyFeed === 'function') window.loadBountyFeed().catch(function () {});
        } catch (err) {
            _showBlockedProjects = previous;
            if (toggle) toggle.checked = previous;
            if (typeof window.handleApiError === 'function') window.handleApiError('network_error');
        }
    }

    function openBlacklistModal(event) {
        if (event) event.stopPropagation();
        var overlay = document.getElementById('blacklist-modal');
        if (!overlay) return;
        var menu = document.getElementById('system-drop-menu');
        if (menu) menu.classList.remove('active');
        overlay.classList.add('active');
        if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
        haptic('select');
        var body = document.getElementById('blacklist-body');
        if (body && !_loaded) {
            body.innerHTML = '<p class="blacklist-empty">' + escapeHtml(t('blacklistLoading')) + '</p>';
        } else {
            renderList();
        }
        ensureUserBlacklistLoaded(true).catch(function () {
            if (body) body.innerHTML = '<p class="blacklist-empty">' + escapeHtml(t('blacklistLoadError')) + '</p>';
        });
    }

    function closeBlacklistModal(event) {
        var overlay = document.getElementById('blacklist-modal');
        if (event && event.target && event.target !== overlay) return;
        if (overlay) overlay.classList.remove('active');
        if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
    }

    async function unblockFromList(targetUserId) {
        var item = _items.find(function (row) { return Number(row && row.id) === Number(targetUserId); }) || {};
        var name = String(item.first_name || item.full_name || (item.username ? '@' + item.username : '') || '').trim();
        await unblockUser(targetUserId, name);
    }

    window.openBlacklistModal = openBlacklistModal;
    window.closeBlacklistModal = closeBlacklistModal;
    window.unblockBlacklistUser = unblockFromList;
    window.blockUserOnBlacklist = blockUser;
    window.unblockUserOnBlacklist = unblockUser;
    window.ensureUserBlacklistLoaded = ensureUserBlacklistLoaded;
    window.isUserBlacklisted = isUserBlacklisted;
    window.setBlacklistShowProjects = function (checkbox) {
        setShowBlockedProjects(!!(checkbox && checkbox.checked));
    };
    window.UserBlacklist = {
        ensureLoaded: ensureUserBlacklistLoaded,
        isBlocked: isUserBlacklisted,
        block: blockUser,
        unblock: unblockUser,
        open: openBlacklistModal,
        close: closeBlacklistModal,
    };
})();
