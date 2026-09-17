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
        sent: '',
        accepted: '✓',
        rejected: '✕',
        expired: '⏱',
        access_issue: '!',
        error: '!',
        failed: '!',
        skipped: '!',
    };

    var RING_SVG = (
        '<svg class="mi-ring" viewBox="0 0 48 48" aria-hidden="true">' +
            '<circle class="mi-ring-track" cx="24" cy="24" r="21"></circle>' +
            '<circle class="mi-ring-arc" cx="24" cy="24" r="21"></circle>' +
        '</svg>'
    );

    var LETTER_SVG = (
        '<span class="mi-letter-fly" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24">' +
                '<rect x="3.2" y="6" width="17.6" height="12" rx="2.2"></rect>' +
                '<path d="M4.2 7.4 L12 13.2 L19.8 7.4"></path>' +
            '</svg>' +
        '</span>'
    );

    var HOURGLASS_HTML = (
        '<span class="mi-hourglass" aria-hidden="true">' +
            '<svg viewBox="0 0 16 16">' +
                '<path d="M3.4 2.2h9.2v1.65L9.2 8l3.4 4.15v1.65H3.4v-1.65L6.8 8 3.4 3.85z" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"></path>' +
                '<path d="M5.15 3.45h5.7M5.15 12.55h5.7" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"></path>' +
                '<path d="M6.45 11.2h3.1L8 9z" fill="currentColor" opacity="0.55"></path>' +
            '</svg>' +
        '</span>'
    );

    function remainingForCreatedAt(createdAt) {
        if (typeof MassInviteSession !== 'undefined' && MassInviteSession.getOfferRemaining) {
            return MassInviteSession.getOfferRemaining(createdAt);
        }
        var created = new Date(createdAt || '');
        if (Number.isNaN(created.getTime())) return null;
        var left = created.getTime() + (5 * 60 * 60 * 1000) - Date.now();
        if (left <= 0) return null;
        var totalSec = Math.floor(left / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return { text: h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') };
    }

    function waitClockHtml(createdAt) {
        var remaining = remainingForCreatedAt(createdAt);
        var digits = remaining ? remaining.text : '0:00:00';
        return (
            '<span class="mi-wait-clock">' +
                HOURGLASS_HTML +
                '<span class="mi-wait-digits">' + _esc(digits) + '</span>' +
            '</span>'
        );
    }

    function renderLabelHtml(status, item, currentLang, sessionView) {
        if (status === 'sent' && sessionView) {
            return _esc(window.t ? window.t('massInviteStatusSent', {}, currentLang || _lang()) : 'Sent');
        }
        if (status === 'sent') {
            return waitClockHtml(item && (item.created_at || item.wait_created_at));
        }
        return _esc(statusLabel(status, currentLang));
    }

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
        var createdAt = item.created_at || '';
        var sessionView = !!opts.sessionView;
        var labelHtml = renderLabelHtml(status, item, opts.lang || _lang(), sessionView);
        var interactiveClass = interactive ? ' is-interactive' : '';
        var sessionClass = sessionView ? ' is-session' : '';
        var clickAttr = interactive
            ? ' onclick="MassInviteCards.openDossierFromEl(this)"'
            : '';
        var createdAttr = createdAt ? ' data-created-at="' + _esc(createdAt) + '"' : '';
        var sentAria = sessionView && status === 'sent'
            ? (window.t ? window.t('massInviteStatusSent', {}, opts.lang || _lang()) : 'Sent')
            : statusLabel(status, opts.lang || _lang());

        return (
            '<button type="button" class="mi-candidate-card' + interactiveClass + sessionClass + '"' +
            ' data-status="' + _esc(status) + '"' +
            ' data-owner-id="' + _esc(ownerId) + '"' +
            ' data-username="' + _esc(username) + '"' +
            ' data-source-app-id="' + _esc(sourceAppId) + '"' +
            createdAttr +
            (sessionView ? ' data-session-view="1"' : '') +
            ' aria-label="' + _esc(ownerName + ' — ' + sentAria) + '"' +
            clickAttr +
            '>' +
                '<span class="mi-candidate-pair" aria-hidden="true">' +
                    RING_SVG +
                    '<span class="mi-candidate-avatar-wrap">' +
                        _iconHtml(ownerName, item.owner_avatar_url || '') +
                    '</span>' +
                    LETTER_SVG +
                    '<span class="mi-candidate-app">' +
                        _iconHtml(appName, item.icon_url || '') +
                    '</span>' +
                    (badge
                        ? '<span class="mi-candidate-badge">' + _esc(badge) + '</span>'
                        : '') +
                '</span>' +
                '<span class="mi-candidate-label">' + labelHtml + '</span>' +
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

    function updateCardStatus(container, ownerId, status, meta) {
        if (!container) return false;
        var card = container.querySelector('.mi-candidate-card[data-owner-id="' + String(ownerId) + '"]');
        if (!card) return false;
        var info = meta || {};
        var next = normalizeStatus(status);
        var prev = String(card.getAttribute('data-status') || '');
        if (next === 'delivered' && prev === 'delivered') {
            card.classList.remove('is-filling');
            void card.offsetWidth;
        }
        card.setAttribute('data-status', next);
        if (next === 'delivered') {
            card.classList.add('is-filling');
        } else {
            card.classList.remove('is-filling');
        }
        if (next !== 'delivered') {
            card.classList.remove('is-letter-fly');
        }

        var createdAt = info.created_at || card.getAttribute('data-created-at') || '';
        if (next === 'sent' || next === 'delivered') {
            if (!createdAt) createdAt = new Date().toISOString();
            card.setAttribute('data-created-at', createdAt);
        } else if (next !== 'accepted') {
            card.removeAttribute('data-created-at');
            createdAt = '';
        }

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
        var sessionView = card.classList.contains('is-session') || card.getAttribute('data-session-view') === '1';
        if (labelEl) {
            if (next === 'sent' && sessionView) {
                labelEl.textContent = window.t ? window.t('massInviteStatusSent', {}, _lang()) : 'Sent';
            } else if (next === 'sent') {
                labelEl.innerHTML = waitClockHtml(createdAt);
            } else {
                labelEl.textContent = statusLabel(next);
            }
        }
        var name = _displayName({
            owner_full_name: card.getAttribute('aria-label') || '',
            owner_username: card.getAttribute('data-username') || '',
        });
        var ariaStatus = (next === 'sent' && sessionView)
            ? (window.t ? window.t('massInviteStatusSent', {}, _lang()) : 'Sent')
            : (next === 'sent'
                ? ((remainingForCreatedAt(createdAt) || {}).text || statusLabel(next))
                : statusLabel(next));
        card.setAttribute('aria-label', name + ' — ' + ariaStatus);
        return true;
    }

    function flyLetter(container, ownerId) {
        if (!container) return false;
        var card = container.querySelector('.mi-candidate-card[data-owner-id="' + String(ownerId) + '"]');
        if (!card) return false;
        card.classList.remove('is-letter-fly');
        void card.offsetWidth;
        card.classList.add('is-letter-fly');
        return true;
    }

    function tickWaitClocks(container) {
        var root = container || document;
        var cards = root.querySelectorAll('.mi-candidate-card[data-status="sent"]:not(.is-session)');
        cards.forEach(function (card) {
            if (card.getAttribute('data-session-view') === '1') return;
            var createdAt = card.getAttribute('data-created-at');
            if (!createdAt) return;
            var remaining = remainingForCreatedAt(createdAt);
            var digitsEl = card.querySelector('.mi-wait-digits');
            var nextText = remaining ? remaining.text : '0:00:00';
            if (digitsEl && digitsEl.textContent !== nextText) {
                digitsEl.textContent = nextText;
            }
            if (!remaining) {
                card.setAttribute('data-status', 'expired');
                var labelEl = card.querySelector('.mi-candidate-label');
                if (labelEl) labelEl.textContent = statusLabel('expired');
            }
        });
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
            sessionView: true,
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
        flyLetter: flyLetter,
        tickWaitClocks: tickWaitClocks,
        waitClockHtml: waitClockHtml,
        setInteractive: setInteractive,
        openDossier: openDossier,
        openDossierFromEl: openDossierFromEl,
        renderSessionBlock: renderSessionBlock,
        formatResponseTimerText: formatResponseTimerText,
        buildStatsLine: buildStatsLine,
    };
})(window);
