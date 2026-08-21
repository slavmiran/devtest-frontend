/* Mass Invite candidate cards — render + dossier open.
 * Depends on: window.escapeHTML, renderIcon/getAvatar, openTesterDossier, window.t
 */
(function (global) {
    'use strict';

    var STATUS_I18N = {
        selected: 'massInviteStatusSelected',
        sending: 'massInviteStatusSending',
        delivered: 'massInviteStatusSent',
        sent: 'massInviteStatusWaiting',
        accepted: 'massInviteStatusAccepted',
        rejected: 'massInviteStatusRejected',
        expired: 'massInviteStatusExpired',
        access_issue: 'massInviteStatusAccessIssue',
        error: 'massInviteStatusError',
        failed: 'massInviteStatusError',
        skipped: 'massInviteStatusError',
    };

    var STATUS_BADGE = {
        selected: '',
        sending: '…',
        delivered: '✓',
        sent: '…',
        accepted: '✓',
        rejected: '✕',
        expired: '⏱',
        access_issue: '!',
        error: '!',
        failed: '!',
        skipped: '!',
    };

    function _lang() {
        return (typeof lang !== 'undefined' && lang) || 'ru';
    }

    function _esc(value) {
        if (typeof window.escapeHTML === 'function') {
            return window.escapeHTML(String(value == null ? '' : value));
        }
        return String(value == null ? ''
            : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function _displayName(candidate) {
        var full = String((candidate && candidate.owner_full_name) || '').trim();
        if (full) return full.split(/\s+/)[0] || full;
        var username = String((candidate && candidate.owner_username) || '').trim().replace(/^@+/, '');
        if (username) return '@' + username;
        return window.t ? window.t('unknownLabel', {}, _lang()) : 'User';
    }

    function _iconHtml(name, iconUrl) {
        if (typeof renderIcon === 'function') {
            return renderIcon(name || '?', iconUrl || '');
        }
        if (typeof getAvatar === 'function') {
            return getAvatar(name || '?');
        }
        var letter = String(name || '?').charAt(0).toUpperCase();
        return '<div class="avatar" style="background-color:#8e8e93;">' + _esc(letter) + '</div>';
    }

    function normalizeStatus(status) {
        var value = String(status || 'selected').toLowerCase();
        if (value === 'pending') return 'sent';
        if (value === 'auto_accepted') return 'accepted';
        if (value === 'owner_has_access_issue' || value === 'target_owner_has_access_issue') {
            return 'access_issue';
        }
        if (value === 'failed') return 'error';
        if (value === 'skipped') return 'error';
        return value;
    }

    function statusLabel(status, currentLang) {
        var key = STATUS_I18N[normalizeStatus(status)] || STATUS_I18N.selected;
        if (window.t) return window.t(key, {}, currentLang || _lang());
        return normalizeStatus(status);
    }

    function renderCandidateCard(candidate, options) {
        var opts = options || {};
        var item = candidate || {};
        var status = normalizeStatus(item.ui_status || item.status || 'selected');
        var interactive = !!opts.interactive;
        var sourceAppId = Number(opts.sourceAppId || opts.source_app_id || 0);
        var ownerId = Number(item.owner_id || item.target_owner_id || 0);
        var username = String(item.owner_username || '').trim().replace(/^@+/, '');
        var ownerName = _displayName(item);
        var appName = String(item.name || '');
        var badge = STATUS_BADGE[status] || '';
        var label = statusLabel(status, opts.lang || _lang());
        var interactiveClass = interactive ? ' is-interactive' : '';
        var clickAttr = interactive
            ? ' onclick="MassInviteCards.openDossierFromEl(this)"'
            : '';

        return (
            '<button type="button" class="mi-candidate-card' + interactiveClass + '"' +
            ' data-status="' + _esc(status) + '"' +
            ' data-owner-id="' + _esc(ownerId) + '"' +
            ' data-username="' + _esc(username) + '"' +
            ' data-source-app-id="' + _esc(sourceAppId) + '"' +
            ' aria-label="' + _esc(ownerName + ' — ' + label) + '"' +
            clickAttr +
            '>' +
                '<span class="mi-candidate-pair" aria-hidden="true">' +
                    '<span class="mi-candidate-avatar-wrap">' +
                        _iconHtml(ownerName, item.owner_avatar_url || '') +
                    '</span>' +
                    '<span class="mi-candidate-app">' +
                        _iconHtml(appName, item.icon_url || '') +
                    '</span>' +
                    (badge
                        ? '<span class="mi-candidate-badge">' + _esc(badge) + '</span>'
                        : '') +
                '</span>' +
                '<span class="mi-candidate-label">' + _esc(label) + '</span>' +
            '</button>'
        );
    }

    function renderCandidateStrip(candidates, options) {
        var opts = options || {};
        var list = Array.isArray(candidates) ? candidates : [];
        if (!list.length) {
            return '<div class="mi-candidates-strip" id="' + _esc(opts.id || '') + '" hidden></div>';
        }
        var cards = list.map(function (c) {
            return renderCandidateCard(c, opts);
        }).join('');
        var idAttr = opts.id ? ' id="' + _esc(opts.id) + '"' : '';
        var extraClass = opts.extraClass ? ' ' + opts.extraClass : '';
        return (
            '<div class="mi-candidates-strip is-visible' + extraClass + '"' + idAttr + '>' +
                '<div class="mi-candidates-strip-inner">' + cards + '</div>' +
            '</div>'
        );
    }

    function mountStrip(container, candidates, options) {
        if (!container) return null;
        var opts = options || {};
        var list = Array.isArray(candidates) ? candidates : [];
        var card = container.closest ? container.closest('.mi-progress-card') : null;

        if (!list.length) {
            container.classList.remove('is-visible');
            container.innerHTML = '';
            container.hidden = true;
            if (card) card.classList.remove('has-candidates');
            return container;
        }

        container.hidden = false;
        container.classList.add('is-visible');
        container.innerHTML = '<div class="mi-candidates-strip-inner">' +
            list.map(function (c) { return renderCandidateCard(c, opts); }).join('') +
            '</div>';
        if (card) card.classList.add('has-candidates');
        return container;
    }

    function updateCardStatus(container, ownerId, status) {
        if (!container) return false;
        var card = container.querySelector('.mi-candidate-card[data-owner-id="' + String(ownerId) + '"]');
        if (!card) return false;
        var next = normalizeStatus(status);
        card.setAttribute('data-status', next);
        var badgeEl = card.querySelector('.mi-candidate-badge');
        var badge = STATUS_BADGE[next] || '';
        if (badge) {
            if (!badgeEl) {
                badgeEl = document.createElement('span');
                badgeEl.className = 'mi-candidate-badge';
                var pair = card.querySelector('.mi-candidate-pair');
                if (pair) pair.appendChild(badgeEl);
            }
            badgeEl.textContent = badge;
        } else if (badgeEl) {
            badgeEl.remove();
        }
        var labelEl = card.querySelector('.mi-candidate-label');
        if (labelEl) labelEl.textContent = statusLabel(next);
        var name = _displayName({
            owner_full_name: card.getAttribute('aria-label') || '',
            owner_username: card.getAttribute('data-username') || '',
        });
        card.setAttribute('aria-label', name + ' — ' + statusLabel(next));
        return true;
    }

    function setInteractive(container, enabled) {
        if (!container) return;
        var cards = container.querySelectorAll('.mi-candidate-card');
        cards.forEach(function (card) {
            if (enabled) {
                card.classList.add('is-interactive');
                card.setAttribute('onclick', 'MassInviteCards.openDossierFromEl(this)');
            } else {
                card.classList.remove('is-interactive');
                card.removeAttribute('onclick');
            }
        });
    }

    function openDossier(candidate, sourceAppId) {
        var item = candidate || {};
        var ownerId = Number(item.owner_id || item.target_owner_id || 0);
        if (!ownerId) return;
        var username = String(item.owner_username || '').trim().replace(/^@+/, '');
        var appId = Number(sourceAppId || 0);
        if (typeof openTesterDossier === 'function') {
            openTesterDossier(username, ownerId, appId);
            return;
        }
        if (typeof openDossierModal === 'function') {
            openDossierModal(username, ownerId, appId);
        }
    }

    function openDossierFromEl(el) {
        if (!el) return;
        // Avoid opening dossier while the progress overlay is still "busy" sending.
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (overlay && overlay.classList.contains('active') && overlay.getAttribute('aria-busy') === 'true') {
            return;
        }
        if (window.tg && tg.HapticFeedback) {
            try { tg.HapticFeedback.impactOccurred('light'); } catch (e) { /* ignore */ }
        }

        var status = String(el.getAttribute('data-status') || '').toLowerCase();
        if (status === 'access_issue') {
            var hint = window.t
                ? window.t('massInviteAccessIssueHint', {}, _lang())
                : 'Active access issue — invite was skipped.';
            try {
                if (window.tg && typeof tg.showPopup === 'function') {
                    tg.showPopup({
                        title: window.t ? window.t('massInviteStatusAccessIssue', {}, _lang()) : 'Access issue',
                        message: hint,
                        buttons: [{ type: 'close' }],
                    });
                    return;
                }
                if (window.tg && typeof tg.showAlert === 'function') {
                    tg.showAlert(hint);
                    return;
                }
            } catch (e) { /* fall through to dossier */ }
            if (typeof showToast === 'function') {
                showToast(hint);
                return;
            }
            window.alert(hint);
            return;
        }

        // Overlay sits above dossier modal — close it first so the profile is visible.
        if (overlay && overlay.classList.contains('active') && typeof MassInviteProgressOverlay !== 'undefined') {
            MassInviteProgressOverlay.hide();
        }
        openDossier({
            owner_id: Number(el.getAttribute('data-owner-id') || 0),
            owner_username: el.getAttribute('data-username') || '',
        }, Number(el.getAttribute('data-source-app-id') || 0));
    }

    function formatResponseTimerText(session, currentLang) {
        if (!session || !session.sent_at) return '';
        var remaining = null;
        if (typeof MassInviteSession !== 'undefined' && MassInviteSession.getResponseRemaining) {
            remaining = MassInviteSession.getResponseRemaining(session);
        }
        if (!remaining) {
            return window.t ? window.t('massInviteSessionWindowClosed', {}, currentLang || _lang()) : '';
        }
        var timeText = remaining.text;
        if (!timeText) {
            var h = Number(remaining.hours || 0);
            var m = Number(remaining.minutes || 0);
            var s = Number(remaining.seconds || 0);
            if (!s && remaining.expiresAt) {
                var left = Math.max(0, remaining.expiresAt.getTime() - Date.now());
                s = Math.floor((left / 1000) % 60);
            }
            timeText = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }
        return window.t
            ? window.t('massInviteSessionWaiting', { time: timeText }, currentLang || _lang())
            : timeText;
    }

    function buildStatsLine(stats, currentLang) {
        var s = stats || {};
        var accepted = Number(s.accepted || 0);
        var rejected = Number(s.rejected || 0);
        var pending = Number(s.pending || 0);
        if (accepted + rejected + pending <= 0) {
            return window.t ? window.t('massInviteSessionStatsZero', {}, currentLang || _lang()) : '';
        }
        return window.t
            ? window.t('massInviteSessionStats', {
                accepted: accepted,
                rejected: rejected,
                pending: pending,
            }, currentLang || _lang())
            : (accepted + '/' + rejected + '/' + pending);
    }

    function renderSessionBlock(session, options) {
        var opts = options || {};
        var currentLang = opts.lang || _lang();
        var sourceAppId = Number(opts.sourceAppId || (session && session.app_id) || 0);
        var fallbackCount = Number(opts.fallbackSentCount || 0);

        if (!session || !(session.candidates || []).length) {
            if (fallbackCount > 0) {
                return (
                    '<div class="mi-session-block">' +
                        '<div class="mi-session-head">' +
                            '<div class="mi-session-title">' + _esc(window.t ? window.t('massInviteSessionTitle', {}, currentLang) : 'Last blast') + '</div>' +
                            '<div class="mi-session-sent">' + _esc(String(fallbackCount)) + '</div>' +
                        '</div>' +
                        '<div class="mi-session-stats">' + _esc(window.t ? window.t('massInviteLastSentSummary', { count: fallbackCount }, currentLang) : '') + '</div>' +
                    '</div>'
                );
            }
            return (
                '<div class="mi-session-block is-empty">' +
                    '<div class="mi-session-empty">' + _esc(window.t ? window.t('massInviteSessionEmpty', {}, currentLang) : '') + '</div>' +
                '</div>'
            );
        }

        var stats = (typeof MassInviteSession !== 'undefined' && MassInviteSession.computeStats)
            ? MassInviteSession.computeStats(session.candidates)
            : (session.stats || {});
        var sentCount = Number(session.sent_count || stats.sent || (session.candidates || []).length || 0);
        var timerText = formatResponseTimerText(session, currentLang);
        var timerDone = !timerText || (window.t && timerText === window.t('massInviteSessionWindowClosed', {}, currentLang));
        var stripHtml = renderCandidateStrip(session.candidates, {
            sourceAppId: sourceAppId,
            interactive: true,
            lang: currentLang,
            id: 'mi-session-strip',
        });

        return (
            '<div class="mi-session-block" id="mi-session-block" data-app-id="' + _esc(sourceAppId) + '">' +
                '<div class="mi-session-head">' +
                    '<div class="mi-session-title">' + _esc(window.t ? window.t('massInviteSessionTitle', {}, currentLang) : 'Last blast') + '</div>' +
                    '<div class="mi-session-sent" id="mi-session-sent-count">' + _esc(String(sentCount)) + '</div>' +
                '</div>' +
                '<div class="mi-session-stats" id="mi-session-stats">' + _esc(buildStatsLine(stats, currentLang)) + '</div>' +
                '<div class="mi-session-timer' + (timerDone ? ' is-done' : '') + '" id="mi-session-response-timer">' +
                    _esc(timerText) +
                '</div>' +
                stripHtml +
            '</div>'
        );
    }

    global.MassInviteCards = {
        normalizeStatus: normalizeStatus,
        statusLabel: statusLabel,
        renderCandidateCard: renderCandidateCard,
        renderCandidateStrip: renderCandidateStrip,
        mountStrip: mountStrip,
        updateCardStatus: updateCardStatus,
        setInteractive: setInteractive,
        openDossier: openDossier,
        openDossierFromEl: openDossierFromEl,
        renderSessionBlock: renderSessionBlock,
        formatResponseTimerText: formatResponseTimerText,
        buildStatsLine: buildStatsLine,
    };
})(window);
