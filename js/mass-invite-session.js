/* Mass Invite session store — last blast candidates + offer statuses.
 * Used by WOW overlay/BottomSheet. Does not change send mechanics.
 * Depends on: localStorage, optional formatOfferRemaining from ui-helpers.js
 */
(function (global) {
    'use strict';

    var STORAGE_PREFIX = 'mass_invite_session_v1_';
    var RESPONSE_WINDOW_MS = 5 * 60 * 60 * 1000;
    var SCHEMA_VERSION = 1;

    function _key(appId) {
        return STORAGE_PREFIX + String(appId || 0);
    }

    function _nowIso() {
        return new Date().toISOString();
    }

    function _safeParse(raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function _normalizeCandidate(raw, defaults) {
        var src = raw || {};
        var base = defaults || {};
        var ownerId = Number(src.owner_id || src.target_owner_id || base.owner_id || 0);
        var appId = Number(src.app_id || src.target_app_id || base.app_id || 0);
        var uiStatus = String(src.ui_status || src.status || base.ui_status || 'selected').toLowerCase();
        if (uiStatus === 'accepted') uiStatus = 'accepted';
        else if (uiStatus === 'rejected') uiStatus = 'rejected';
        else if (uiStatus === 'expired') uiStatus = 'expired';
        else if (uiStatus === 'pending' || uiStatus === 'auto_accepted' || uiStatus === 'sent') {
            uiStatus = uiStatus === 'auto_accepted' ? 'accepted' : (uiStatus === 'pending' ? 'sent' : uiStatus);
        }
        return {
            app_id: appId,
            owner_id: ownerId,
            name: String(src.name || base.name || ''),
            icon_url: src.icon_url || base.icon_url || '',
            owner_username: src.owner_username || base.owner_username || '',
            owner_full_name: src.owner_full_name || base.owner_full_name || '',
            owner_avatar_url: src.owner_avatar_url || base.owner_avatar_url || '',
            reliability_index: Number(src.reliability_index != null ? src.reliability_index : (base.reliability_index || 0)),
            offer_id: src.offer_id != null ? Number(src.offer_id) : (base.offer_id != null ? Number(base.offer_id) : null),
            outcome: src.outcome || base.outcome || null,
            ui_status: uiStatus,
            created_at: src.created_at || base.created_at || null,
            responded_at: src.responded_at || base.responded_at || null,
        };
    }

    function _emptyStats() {
        return { sent: 0, accepted: 0, rejected: 0, pending: 0, expired: 0, failed: 0 };
    }

    function computeStats(candidates) {
        var stats = _emptyStats();
        (candidates || []).forEach(function (item) {
            var status = String((item && item.ui_status) || '').toLowerCase();
            if (status === 'accepted') stats.accepted += 1;
            else if (status === 'rejected') stats.rejected += 1;
            else if (status === 'expired') stats.expired += 1;
            else if (status === 'error' || status === 'failed' || status === 'skipped') stats.failed += 1;
            else if (status === 'sent' || status === 'sending' || status === 'pending') stats.pending += 1;

            if (status === 'accepted' || status === 'rejected' || status === 'expired' || status === 'sent' || status === 'pending') {
                stats.sent += 1;
            }
        });
        return stats;
    }

    function load(appId) {
        if (!appId) return null;
        try {
            var raw = localStorage.getItem(_key(appId));
            if (!raw) return null;
            var data = _safeParse(raw);
            if (!data || Number(data.app_id) !== Number(appId)) return null;
            data.candidates = (data.candidates || []).map(function (c) { return _normalizeCandidate(c); });
            data.stats = computeStats(data.candidates);
            return data;
        } catch (e) {
            console.warn('MassInviteSession.load failed', e);
            return null;
        }
    }

    function save(appId, session) {
        if (!appId || !session) return null;
        var payload = {
            v: SCHEMA_VERSION,
            app_id: Number(appId),
            sent_at: session.sent_at || null,
            sent_count: Number(session.sent_count || 0),
            response_window_hours: Number(session.response_window_hours || 5),
            candidates: (session.candidates || []).map(function (c) { return _normalizeCandidate(c); }),
            updated_at: _nowIso(),
        };
        payload.stats = computeStats(payload.candidates);
        try {
            localStorage.setItem(_key(appId), JSON.stringify(payload));
        } catch (e) {
            console.warn('MassInviteSession.save failed', e);
        }
        return payload;
    }

    function clear(appId) {
        try {
            localStorage.removeItem(_key(appId));
        } catch (e) { /* ignore */ }
    }

    function createFromPlan(appId, candidates) {
        var list = (candidates || []).map(function (c) {
            return _normalizeCandidate(c, { ui_status: 'selected' });
        });
        return save(appId, {
            sent_at: null,
            sent_count: 0,
            response_window_hours: 5,
            candidates: list,
        });
    }

    function _updateCandidate(appId, ownerId, patch) {
        var session = load(appId);
        if (!session) return null;
        var found = false;
        session.candidates = (session.candidates || []).map(function (c) {
            if (Number(c.owner_id) !== Number(ownerId)) return c;
            found = true;
            return _normalizeCandidate(Object.assign({}, c, patch || {}));
        });
        if (!found && patch) {
            session.candidates.push(_normalizeCandidate(patch, { owner_id: ownerId, ui_status: 'selected' }));
        }
        return save(appId, session);
    }

    function markSending(appId, ownerId) {
        return _updateCandidate(appId, ownerId, { ui_status: 'sending' });
    }

    function markSent(appId, ownerId, meta) {
        var info = meta || {};
        var outcome = String(info.outcome || 'pending').toLowerCase();
        var uiStatus = 'sent';
        if (outcome === 'auto_accepted') uiStatus = 'accepted';
        else if (outcome === 'pending') uiStatus = 'sent';
        return _updateCandidate(appId, ownerId, {
            ui_status: uiStatus,
            outcome: outcome,
            offer_id: info.offer_id != null ? Number(info.offer_id) : null,
            created_at: info.created_at || _nowIso(),
        });
    }

    function markFailed(appId, ownerId, code) {
        return _updateCandidate(appId, ownerId, {
            ui_status: 'error',
            outcome: 'error',
            code: code || null,
        });
    }

    function finalize(appId, meta) {
        var session = load(appId);
        if (!session) return null;
        var info = meta || {};
        session.sent_at = info.sent_at || session.sent_at || _nowIso();
        session.sent_count = Number(info.sent_count != null ? info.sent_count : session.sent_count || 0);
        return save(appId, session);
    }

    function mergeServerOffers(appId, serverPayload) {
        var payload = serverPayload || {};
        var serverOffers = payload.offers || [];
        var session = load(appId) || {
            app_id: Number(appId),
            sent_at: payload.last_mass_invite_at || null,
            sent_count: Number(payload.last_mass_invite_sent_count || 0),
            response_window_hours: Number(payload.response_window_hours || 5),
            candidates: [],
        };

        if (payload.last_mass_invite_at) {
            session.sent_at = payload.last_mass_invite_at;
        }
        if (payload.last_mass_invite_sent_count != null) {
            session.sent_count = Number(payload.last_mass_invite_sent_count || 0);
        }
        if (payload.response_window_hours) {
            session.response_window_hours = Number(payload.response_window_hours);
        }

        var byOwner = {};
        (session.candidates || []).forEach(function (c) {
            byOwner[Number(c.owner_id)] = c;
        });

        serverOffers.forEach(function (offer) {
            var ownerId = Number(offer.target_owner_id || offer.owner_id || 0);
            if (!ownerId) return;
            var status = String(offer.status || 'pending').toLowerCase();
            var uiStatus = status;
            if (status === 'pending') uiStatus = 'sent';
            var prev = byOwner[ownerId] || {};
            byOwner[ownerId] = _normalizeCandidate(Object.assign({}, prev, offer, {
                owner_id: ownerId,
                app_id: Number(offer.target_app_id || offer.app_id || prev.app_id || 0),
                ui_status: uiStatus,
                offer_id: offer.offer_id,
            }));
        });

        session.candidates = Object.keys(byOwner).map(function (k) { return byOwner[k]; });
        return save(appId, session);
    }

    function getResponseRemaining(session) {
        if (!session || !session.sent_at) return null;
        if (typeof formatOfferRemaining === 'function') {
            var remaining = formatOfferRemaining(session.sent_at);
            if (!remaining) return null;
            var leftMs = remaining.expiresAt
                ? Math.max(0, remaining.expiresAt.getTime() - Date.now())
                : 0;
            var totalSeconds = Math.floor(leftMs / 1000);
            var hours = Math.floor(totalSeconds / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;
            return {
                expiresAt: remaining.expiresAt,
                hours: hours,
                minutes: minutes,
                seconds: seconds,
                text: String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0'),
            };
        }
        var created = new Date(session.sent_at);
        if (Number.isNaN(created.getTime())) return null;
        var expiresAt = new Date(created.getTime() + RESPONSE_WINDOW_MS);
        var left = expiresAt.getTime() - Date.now();
        if (left <= 0) return null;
        var totalSec = Math.floor(left / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return {
            expiresAt: expiresAt,
            hours: h,
            minutes: m,
            seconds: s,
            text: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'),
        };
    }

    async function refreshFromServer(appId, ownerId, apiBase) {
        if (!appId || !ownerId || !apiBase) return load(appId);
        try {
            var response = await fetch(apiBase + '/projects/' + appId + '/mass_invite/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withInitData({ owner_id: Number(ownerId) })),
            });
            var data = await response.json();
            if (!response.ok || data.status !== 'success') {
                return load(appId);
            }
            return mergeServerOffers(appId, data);
        } catch (e) {
            console.warn('MassInviteSession.refreshFromServer failed', e);
            return load(appId);
        }
    }

    global.MassInviteSession = {
        RESPONSE_WINDOW_MS: RESPONSE_WINDOW_MS,
        load: load,
        save: save,
        clear: clear,
        createFromPlan: createFromPlan,
        markSending: markSending,
        markSent: markSent,
        markFailed: markFailed,
        finalize: finalize,
        mergeServerOffers: mergeServerOffers,
        computeStats: computeStats,
        getResponseRemaining: getResponseRemaining,
        refreshFromServer: refreshFromServer,
    };
})(window);
