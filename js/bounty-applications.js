/* Bounty / $BUST contract applications — owner moderation UI (parallel to mutual offers). */

var bountyApplications = [];
var _bountyAppsInFlight = null;
var _bountyAppsLoadedOnce = false;
var _bountyAppsLoadError = false;
var _bountyAppsTimerId = null;
var _bountyAppsPollId = null;
var _bountyAppsToggleInFlight = false;
var BOUNTY_APPLICATION_TTL_HOURS = 48;
var BOUNTY_APPS_FETCH_THROTTLE_MS = 15000;
var BOUNTY_APPS_CACHE_KEY = 'devtest_bounty_applications_v1';

function getBountyAppsCache() {
    try {
        var raw = localStorage.getItem(BOUNTY_APPS_CACHE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
        return null;
    }
}

function setBountyAppsCache(list) {
    try {
        localStorage.setItem(BOUNTY_APPS_CACHE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch (e) {}
}

function formatBountyApplicationRemaining(createdAt) {
    var rawValue = createdAt;
    if (rawValue instanceof Date) rawValue = rawValue.toISOString();
    var normalized = String(rawValue || '').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
        normalized = normalized.replace(' ', 'T');
    }
    if (normalized && !/([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized)) {
        normalized += 'Z';
    }
    var created = new Date(normalized || '');
    if (Number.isNaN(created.getTime()) && createdAt) created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return null;
    var expiresAt = new Date(created.getTime() + (BOUNTY_APPLICATION_TTL_HOURS * 60 * 60 * 1000));
    if (Date.now() > expiresAt.getTime()) return null;
    var leftMs = Math.max(0, expiresAt.getTime() - Date.now());
    var totalMinutes = Math.floor(leftMs / 60000);
    return {
        expiresAt: expiresAt,
        hours: Math.floor(totalMinutes / 60),
        minutes: totalMinutes % 60,
    };
}

function _bountyReliabilityTone(application) {
    var status = String(application && application.applicant_reliability_status || 'newbie').toLowerCase();
    var index = application && application.applicant_reliability_index;
    if (status === 'newbie' || index == null || index === '') return 'neutral';
    var value = Number(index);
    if (!Number.isFinite(value)) return 'neutral';
    if (status === 'expert' || status === 'active' || value >= 85) return 'good';
    if (status === 'basic' || status === 'minimal' || value >= 65) return 'warn';
    return 'bad';
}

function _formatBountyReliabilityLabel(application) {
    var status = String(application && application.applicant_reliability_status || 'newbie').toLowerCase();
    var index = application && application.applicant_reliability_index;
    if (status === 'newbie' || index == null || index === '') {
        return window.t('bountyAppReliabilityNewbieShort', {}, lang);
    }
    var value = Number(index);
    if (!Number.isFinite(value)) {
        return window.t('bountyAppReliabilityNewbieShort', {}, lang);
    }
    var statusKey = 'reliabilityDashStatus_' + status;
    var statusLabel = window.t(statusKey, {}, lang);
    if (!statusLabel || statusLabel === statusKey) {
        statusLabel = status;
    }
    return window.t('bountyAppReliabilityCompact', {
        pct: Math.round(value),
        status: statusLabel,
    }, lang);
}

function _bountyApplicantAvatarHtml(application) {
    var name = String(
        (application && (application.applicant_full_name || application.applicant_username)) ||
        ('#' + (application && application.applicant_id || 0))
    ).trim();
    var avatarUrl = application && application.applicant_avatar_url;
    if (typeof renderIcon === 'function') {
        return renderIcon(name, avatarUrl || '');
    }
    if (typeof getAvatar === 'function') {
        return getAvatar(name);
    }
    var letter = name.charAt(0).toUpperCase() || '?';
    return '<div class="avatar">' + window.escapeHTML(letter) + '</div>';
}

function _bountyDossierIconSvg() {
    return '' +
        '<svg class="bounty-app-dossier-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            '<path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v1c0 .55.45 1 1 1h14c.55 0 1-.45 1-1v-1c0-2.66-5.33-4-8-4z"/>' +
        '</svg>';
}

function _formatBountyReliabilityChip(application) {
    return window.escapeHTML(_formatBountyReliabilityLabel(application));
}

function applyIncomingBountyApplications(list, options) {
    var opts = options || {};
    bountyApplications = Array.isArray(list) ? list.slice() : [];
    setBountyAppsCache(bountyApplications);
    _bountyAppsLoadedOnce = true;
    _bountyAppsLoadError = false;
    if (window._lastFetchTimes) _lastFetchTimes.bountyApps = Date.now();
    if (opts.render !== false) {
        renderBountyApplications(!!opts.forceRender || true);
    }
    return bountyApplications;
}

function findPendingBountyApplicationForTester(testerId, appId) {
    var normalizedTesterId = Number(testerId || 0);
    var normalizedAppId = Number(appId || 0);
    if (normalizedTesterId <= 0) return null;
    var list = bountyApplications || [];
    var match = null;
    for (var i = 0; i < list.length; i += 1) {
        var item = list[i];
        if (!item || item.status !== 'pending') continue;
        if (Number(item.applicant_id || 0) !== normalizedTesterId) continue;
        if (normalizedAppId > 0 && Number(item.app_id || 0) !== normalizedAppId) continue;
        match = item;
        break;
    }
    if (match) return match;
    // Fallback: any pending contract application from this tester.
    for (var j = 0; j < list.length; j += 1) {
        var row = list[j];
        if (!row || row.status !== 'pending') continue;
        if (Number(row.applicant_id || 0) === normalizedTesterId) return row;
    }
    return null;
}

function syncIncomingApplicationsSection() {
    var section = document.getElementById('offers-section');
    var countEl = document.getElementById('offers-count');
    if (!section || !countEl) return;

    var mutualPending = (typeof incomingOffers !== 'undefined' && Array.isArray(incomingOffers))
        ? incomingOffers.filter(function(offer) { return !!offer && offer.status === 'pending'; }).length
        : 0;
    var bountyPending = (bountyApplications || []).filter(function(item) {
        return !!item && item.status === 'pending';
    }).length;
    var total = mutualPending + bountyPending;

    var mutualBootstrapping = (typeof _offersInFlight !== 'undefined' && !!_offersInFlight && typeof _offersLoadedOnce !== 'undefined' && !_offersLoadedOnce)
        || (typeof _offersLoadError !== 'undefined' && !!_offersLoadError && typeof _offersLoadedOnce !== 'undefined' && !_offersLoadedOnce);
    var bountyBootstrapping = (!!_bountyAppsInFlight && !_bountyAppsLoadedOnce)
        || (!!_bountyAppsLoadError && !_bountyAppsLoadedOnce);

    if (typeof window.t === 'function') {
        countEl.innerText = window.t('offersCount', { count: total }, lang);
    } else if (typeof t !== 'undefined' && t.offersCount) {
        countEl.innerText = String(t.offersCount).replace('{count}', total);
    } else {
        countEl.innerText = String(total);
    }

    section.style.display = (total > 0 || mutualBootstrapping || bountyBootstrapping) ? '' : 'none';
}

function renderBountyApplications(force) {
    if (!force && typeof isTabVisible === 'function' && !isTabVisible('tests')) {
        if (_bountyAppsTimerId) {
            clearInterval(_bountyAppsTimerId);
            _bountyAppsTimerId = null;
        }
        return;
    }
    var section = document.getElementById('offers-section');
    var carousel = document.getElementById('bounty-apps-carousel');
    if (!carousel) return;

    if (_bountyAppsTimerId) {
        clearInterval(_bountyAppsTimerId);
        _bountyAppsTimerId = null;
    }

    var pending = (bountyApplications || []).filter(function(item) {
        return !!item && item.status === 'pending';
    });
    var isLoading = !!_bountyAppsInFlight;

    if (!pending.length) {
        if (isLoading && !_bountyAppsLoadedOnce) {
            if (typeof showSkeleton === 'function') showSkeleton('bounty-apps-carousel');
            syncIncomingApplicationsSection();
            return;
        }
        if (_bountyAppsLoadError && !_bountyAppsLoadedOnce) {
            if (typeof showRetry === 'function') showRetry('bounty-apps-carousel', 'loadBountyApplications()');
            syncIncomingApplicationsSection();
            return;
        }
        carousel.innerHTML = '';
        syncIncomingApplicationsSection();
        return;
    }

    carousel.innerHTML = pending.map(function(app) {
        var username = String(app.applicant_username || '').replace(/@/g, '');
        var safeUsername = typeof escapeInlineJsString === 'function' ? escapeInlineJsString(username) : username;
        var fullName = String(app.applicant_full_name || '').trim();
        var handle = username ? ('@' + username) : '';
        var primaryName = window.escapeHTML(fullName || handle || window.t('idLabel', { id: app.applicant_id }, lang));
        var secondaryName = (fullName && handle)
            ? ('<div class="bounty-app-handle notranslate">' + window.escapeHTML(handle) + '</div>')
            : '';
        var remain = formatBountyApplicationRemaining(app.created_at);
        var leftTimeText = window.t('offerTimeLeftValue', {
            hours: remain ? remain.hours : 0,
            minutes: remain ? remain.minutes : 0,
        }, lang);
        var expireText = remain
            ? window.t('bountyAppTimeLeftShort', { time: leftTimeText }, lang)
            : window.t('offerTimeUnknown', {}, lang);
        var appName = app.app_name || window.t('unknownLabel', {}, lang);
        var bountyVal = typeof formatAmountValue === 'function'
            ? formatAmountValue(app.bounty_per_tester || 0, 1)
            : String(app.bounty_per_tester || 0);
        var karmaVal = typeof formatAmountValue === 'function'
            ? formatAmountValue(app.applicant_karma || 0, 1)
            : String(app.applicant_karma || 0);
        var fullCycles = Number(app.applicant_completed_full_cycles || 0);
        var skipRate = app.applicant_skip_rate_pct;
        var skipLabel = (skipRate == null || skipRate === '')
            ? '—'
            : (String(Math.round(Number(skipRate))) + '%');
        var tone = _bountyReliabilityTone(app);
        var reliabilityLabel = _formatBountyReliabilityLabel(app);
        var dossierLabel = window.escapeHTML(window.t('bountyAppOpenDossier', {}, lang));

        return '' +
            '<div class="offer-card bounty-app-card" data-application-id="' + app.application_id + '">' +
                '<div class="bounty-app-head">' +
                    '<div class="bounty-app-badge">' +
                        '<span class="bounty-app-badge-label">' + window.escapeHTML(window.t('bountyAppContractChip', {}, lang)) + '</span>' +
                        '<span class="bounty-app-badge-reward notranslate">' + bountyVal + ' $BUST</span>' +
                    '</div>' +
                    '<div class="bounty-app-ttl offer-expire">' + window.escapeHTML(expireText) + '</div>' +
                '</div>' +
                '<div class="bounty-app-identity">' +
                    '<div class="bounty-app-avatar-wrap" role="button" tabindex="0" aria-label="' + dossierLabel + '" ' +
                        'onclick="openTesterDossier(\'' + safeUsername + '\', ' + Number(app.applicant_id || 0) + ', ' + Number(app.app_id || 0) + '); event.stopPropagation();">' +
                        _bountyApplicantAvatarHtml(app) +
                    '</div>' +
                    '<div class="bounty-app-identity-main" role="button" tabindex="0" ' +
                        'onclick="openTesterDossier(\'' + safeUsername + '\', ' + Number(app.applicant_id || 0) + ', ' + Number(app.app_id || 0) + '); event.stopPropagation();">' +
                        '<div class="bounty-app-name notranslate">' + primaryName + '</div>' +
                        secondaryName +
                        '<div class="bounty-app-signal bounty-app-signal--' + tone + '">' +
                            '<span class="bounty-app-signal-dot" aria-hidden="true"></span>' +
                            '<span>' + window.escapeHTML(reliabilityLabel) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<button type="button" class="bounty-app-dossier-btn" title="' + dossierLabel + '" aria-label="' + dossierLabel + '" ' +
                        'onclick="openTesterDossier(\'' + safeUsername + '\', ' + Number(app.applicant_id || 0) + ', ' + Number(app.app_id || 0) + '); event.stopPropagation();">' +
                        _bountyDossierIconSvg() +
                    '</button>' +
                '</div>' +
                '<div class="bounty-app-metrics">' +
                    '<div class="bounty-app-metric">' +
                        '<div class="bounty-app-metric-label">' + window.escapeHTML(window.t('bountyAppMetricKarma', {}, lang)) + '</div>' +
                        '<div class="bounty-app-metric-value notranslate">' + window.escapeHTML(karmaVal) + '</div>' +
                    '</div>' +
                    '<div class="bounty-app-metric">' +
                        '<div class="bounty-app-metric-label">' + window.escapeHTML(window.t('bountyAppMetricTests', {}, lang)) + '</div>' +
                        '<div class="bounty-app-metric-value notranslate">' + fullCycles + '</div>' +
                    '</div>' +
                    '<div class="bounty-app-metric">' +
                        '<div class="bounty-app-metric-label">' + window.escapeHTML(window.t('bountyAppMetricSkips', {}, lang)) + '</div>' +
                        '<div class="bounty-app-metric-value notranslate">' + window.escapeHTML(skipLabel) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="bounty-app-project-row">' +
                    '<span class="bounty-app-project-label">' + window.escapeHTML(window.t('bountyAppProjectLabel', {}, lang)) + '</span>' +
                    '<span class="bounty-app-project-name notranslate">' + window.escapeHTML(appName) + '</span>' +
                '</div>' +
                '<div class="action-row bounty-app-actions">' +
                    '<button type="button" class="btn bounty-app-accept-btn" onclick="decideBountyApplication(' + app.application_id + ', \'accept\', event)">' +
                        window.escapeHTML(window.t('bountyAppAcceptBtn', {}, lang)) +
                    '</button>' +
                    '<button type="button" class="btn bounty-app-reject-btn" onclick="decideBountyApplication(' + app.application_id + ', \'reject\', event)">' +
                        window.escapeHTML(window.t('bountyAppRejectBtn', {}, lang)) +
                    '</button>' +
                '</div>' +
            '</div>';
    }).join('');

    syncIncomingApplicationsSection();

    _bountyAppsTimerId = setInterval(function() {
        var liveSection = document.getElementById('offers-section');
        if (!liveSection || liveSection.style.display === 'none') {
            clearInterval(_bountyAppsTimerId);
            _bountyAppsTimerId = null;
            return;
        }
        var hasExpired = false;
        pending.forEach(function(app) {
            var card = liveSection.querySelector('.bounty-app-card[data-application-id="' + app.application_id + '"]');
            if (!card) return;
            var expireEl = card.querySelector('.offer-expire');
            var remain = formatBountyApplicationRemaining(app.created_at);
            if (!remain) {
                hasExpired = true;
                if (expireEl) expireEl.textContent = window.t('offerTimeUnknown', {}, lang);
                return;
            }
            if (expireEl) {
                var left = window.t('offerTimeLeftValue', { hours: remain.hours, minutes: remain.minutes }, lang);
                expireEl.textContent = window.t('bountyAppTimeLeft', { time: left }, lang);
            }
        });
        if (hasExpired) {
            clearInterval(_bountyAppsTimerId);
            _bountyAppsTimerId = null;
            loadBountyApplications({ background: true }).catch(function() {});
        }
    }, 1000);
}

function highlightBountyApplicationCard(applicationId) {
    var normalizedId = Number(applicationId || 0);
    if (normalizedId <= 0) return false;
    var card = document.querySelector('.bounty-app-card[data-application-id="' + normalizedId + '"]');
    if (!card) return false;
    try {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
        try { card.scrollIntoView(); } catch (e2) {}
    }
    card.classList.remove('highlight-pulse');
    void card.offsetWidth;
    card.classList.add('highlight-pulse');
    setTimeout(function() {
        card.classList.remove('highlight-pulse');
    }, 2200);
    return true;
}

function highlightBountyApplicationWhenReady(applicationId, attemptsLeft) {
    var normalizedId = Number(applicationId || 0);
    var left = typeof attemptsLeft === 'number' ? attemptsLeft : 12;
    if (normalizedId <= 0) return;
    if (highlightBountyApplicationCard(normalizedId)) return;
    if (left <= 0) return;
    setTimeout(function() {
        highlightBountyApplicationWhenReady(normalizedId, left - 1);
    }, 250);
}

async function focusIncomingBountyApplication(applicationId) {
    var normalizedId = Number(applicationId || 0);
    if (normalizedId <= 0) return;
    if (typeof switchTab === 'function') switchTab('tests');
    try {
        await loadBountyApplications({ background: false });
    } catch (e) {}
    if (typeof renderBountyApplications === 'function') renderBountyApplications(true);
    highlightBountyApplicationWhenReady(normalizedId, 16);
}

async function loadBountyApplications(options) {
    var opts = options || {};
    var background = !!opts.background;
    if (_bountyAppsInFlight) return _bountyAppsInFlight;

    var cached = getBountyAppsCache();
    if (!_bountyAppsLoadedOnce && Array.isArray(cached)) {
        bountyApplications = cached;
        _bountyAppsLoadedOnce = true;
        _bountyAppsLoadError = false;
        renderBountyApplications();
    }

    if (background && _bountyAppsLoadedOnce && (Date.now() - (window._lastFetchTimes && _lastFetchTimes.bountyApps || 0)) < BOUNTY_APPS_FETCH_THROTTLE_MS) {
        return;
    }

    var shouldMarkBackgroundSync = background || _bountyAppsLoadedOnce || Array.isArray(cached);
    var requestPromise = (async function() {
        if (shouldMarkBackgroundSync && typeof beginBackgroundSync === 'function') {
            beginBackgroundSync('tests');
        }
        if (typeof _apiStart === 'function') _apiStart();
        try {
            var response = await fetchWithRetry(API_BASE + '/bounty-applications/incoming', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(typeof withInitData === 'function' ? withInitData({}) : { init_data: (tg && tg.initData) || '' }),
            });
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var data = await response.json();
            if (data && data.status && data.status !== 'success') {
                throw new Error(data.code || data.message || 'bounty_applications_load_failed');
            }
            applyIncomingBountyApplications(data.applications || [], { forceRender: true });
        } catch (error) {
            console.error('Error loading bounty applications:', error);
            // Do not poison cache with empty list on transient errors.
            _bountyAppsLoadError = true;
            if (!_bountyAppsLoadedOnce && Array.isArray(cached) && cached.length) {
                bountyApplications = cached;
                _bountyAppsLoadedOnce = true;
            }
            renderBountyApplications(true);
            if (!background && (!bountyApplications || bountyApplications.length === 0)
                && typeof _showNonCriticalLoaderToast === 'function'
                && typeof getApiErrorMessage === 'function') {
                _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'bounty_applications');
            }
        } finally {
            if (typeof _apiEnd === 'function') _apiEnd();
            if (shouldMarkBackgroundSync && typeof endBackgroundSync === 'function') {
                endBackgroundSync('tests');
            }
        }
    })();

    _bountyAppsInFlight = requestPromise;
    renderBountyApplications();
    try {
        await requestPromise;
    } finally {
        if (_bountyAppsInFlight === requestPromise) _bountyAppsInFlight = null;
        renderBountyApplications();
    }
}

function startBountyApplicationsPolling() {
    if (_bountyAppsPollId) clearInterval(_bountyAppsPollId);
    _bountyAppsPollId = setInterval(function() {
        if (!document.hidden) {
            loadBountyApplications({ background: true }).catch(function() {});
        }
    }, 30000);
}

async function decideBountyApplication(applicationId, action, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var normalizedId = Number(applicationId || 0);
    var decision = String(action || '').toLowerCase() === 'accept' ? 'accept' : 'reject';
    if (normalizedId <= 0) return;

    var actionKey = 'bountyApp_' + decision + '_' + normalizedId;
    if (typeof _pendingActions !== 'undefined' && _pendingActions.has(actionKey)) return;
    if (typeof _pendingActions !== 'undefined') _pendingActions.add(actionKey);

    var rollback = bountyApplications.slice();
    bountyApplications = bountyApplications.filter(function(item) {
        return Number(item && item.application_id) !== normalizedId;
    });
    renderBountyApplications(true);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    try {
        var payload = typeof withInitData === 'function'
            ? withInitData({ user_id: Number(userId || 0) || 0 })
            : { user_id: Number(userId || 0) || 0, init_data: (tg && tg.initData) || '' };
        var response = await fetch(API_BASE + '/bounty-applications/' + normalizedId + '/' + decision, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        var result = {};
        try {
            result = await response.json();
        } catch (parseError) {
            result = {};
        }
        // Backend used to return application status (accepted/rejected) under `status`,
        // overwriting API `success`. Treat those as OK when HTTP succeeded.
        var apiStatus = String(result && result.status || '').toLowerCase();
        var decisionOk = response.ok && (
            apiStatus === 'success' ||
            apiStatus === decision ||
            apiStatus === 'accepted' ||
            apiStatus === 'rejected'
        );
        if (!decisionOk) {
            bountyApplications = rollback;
            renderBountyApplications(true);
            if (typeof handleApiError === 'function') {
                handleApiError(typeof getBackendErrorCode === 'function' ? getBackendErrorCode(result) : 'unexpected_error', result.details || {});
            }
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(decision === 'accept' ? 'bountyAppAcceptedToast' : 'bountyAppRejectedToast', {}, lang));
        setBountyAppsCache(bountyApplications);
        if (typeof loadProjects === 'function') loadProjects(true);
        if (decision === 'accept') {
            if (typeof refreshMyTestsNow === 'function') refreshMyTestsNow();
            else if (typeof loadTasks === 'function') loadTasks(false);
        }
        loadBountyApplications({ background: true }).catch(function() {});
    } catch (error) {
        console.error('decideBountyApplication error:', error);
        bountyApplications = rollback;
        renderBountyApplications(true);
        if (typeof handleApiError === 'function') handleApiError('network_error');
    } finally {
        if (typeof _pendingActions !== 'undefined') _pendingActions.delete(actionKey);
    }
}

function _isAutoAcceptBountyAvailable() {
    return !!window._autoAcceptBountyAvailable;
}

function syncAutoAcceptBountyToggleUi() {
    var toggle = document.getElementById('auto-accept-bounty-toggle');
    if (!toggle) return;
    var available = _isAutoAcceptBountyAvailable();
    var label = document.getElementById('auto-accept-bounty-label');
    toggle.disabled = !!_bountyAppsToggleInFlight;
    toggle.checked = !!window._autoAcceptBountyEnabled && available;
    toggle.setAttribute('aria-disabled', available ? 'false' : 'true');
    if (label) {
        label.textContent = window.t('autoAcceptBountyLabel', {}, lang);
    }
    if (typeof syncAutoAcceptSectionUi === 'function') {
        syncAutoAcceptSectionUi();
    }
}

function showAutoAcceptBountyInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (!_isAutoAcceptBountyAvailable()) {
        showToast(window.t('autoAcceptBountyLockedToast', {}, lang));
        return;
    }
    showToast(window.t('autoAcceptBountyInfoToast', {}, lang));
}

async function handleAutoAcceptBountyToggle(input) {
    if (!input || _bountyAppsToggleInFlight) {
        syncAutoAcceptBountyToggleUi();
        return;
    }
    if (!_isAutoAcceptBountyAvailable()) {
        input.checked = false;
        syncAutoAcceptBountyToggleUi();
        showToast(window.t('autoAcceptBountyLockedToast', {}, lang));
        return;
    }
    var previousValue = !!window._autoAcceptBountyEnabled;
    var nextValue = !!input.checked;
    if (nextValue === previousValue) {
        syncAutoAcceptBountyToggleUi();
        return;
    }
    _bountyAppsToggleInFlight = true;
    window._autoAcceptBountyEnabled = nextValue;
    syncAutoAcceptBountyToggleUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    try {
        var response = await fetch(API_BASE + '/users/me/auto-accept-bounty', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: (tg && tg.initData) ? tg.initData : '', enabled: nextValue }),
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            window._autoAcceptBountyEnabled = previousValue;
            if (typeof result.auto_accept_bounty_available !== 'undefined') {
                window._autoAcceptBountyAvailable = !!result.auto_accept_bounty_available;
            }
            syncAutoAcceptBountyToggleUi();
            if (typeof handleApiError === 'function') {
                handleApiError(typeof getBackendErrorCode === 'function' ? getBackendErrorCode(result) : 'unexpected_error', result.details || {});
            }
            return;
        }
        window._autoAcceptBountyEnabled = !!result.auto_accept_bounty;
        if (typeof result.auto_accept_bounty_available !== 'undefined') {
            window._autoAcceptBountyAvailable = !!result.auto_accept_bounty_available;
        }
        syncAutoAcceptBountyToggleUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(window._autoAcceptBountyEnabled ? 'autoAcceptBountyEnabledToast' : 'autoAcceptBountyDisabledToast', {}, lang));
    } catch (error) {
        console.error('Auto-accept bounty toggle error:', error);
        window._autoAcceptBountyEnabled = previousValue;
        syncAutoAcceptBountyToggleUi();
        if (typeof handleApiError === 'function') handleApiError('network_error');
    } finally {
        _bountyAppsToggleInFlight = false;
        syncAutoAcceptBountyToggleUi();
    }
}

Object.assign(window, {
    bountyApplications: bountyApplications,
    loadBountyApplications: loadBountyApplications,
    renderBountyApplications: renderBountyApplications,
    startBountyApplicationsPolling: startBountyApplicationsPolling,
    decideBountyApplication: decideBountyApplication,
    syncAutoAcceptBountyToggleUi: syncAutoAcceptBountyToggleUi,
    showAutoAcceptBountyInfo: showAutoAcceptBountyInfo,
    handleAutoAcceptBountyToggle: handleAutoAcceptBountyToggle,
    formatBountyApplicationRemaining: formatBountyApplicationRemaining,
    syncIncomingApplicationsSection: syncIncomingApplicationsSection,
    applyIncomingBountyApplications: applyIncomingBountyApplications,
    findPendingBountyApplicationForTester: findPendingBountyApplicationForTester,
    highlightBountyApplicationCard: highlightBountyApplicationCard,
    highlightBountyApplicationWhenReady: highlightBountyApplicationWhenReady,
    focusIncomingBountyApplication: focusIncomingBountyApplication,
});
