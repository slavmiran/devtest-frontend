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

function _formatBountyReliabilityChip(application) {
    var status = String(application && application.applicant_reliability_status || 'newbie').toLowerCase();
    var index = application && application.applicant_reliability_index;
    var emoji = application && application.applicant_reliability_emoji || '⚪';
    if (status === 'newbie' || index == null || index === '') {
        return window.escapeHTML(window.t('bountyAppReliabilityNewbie', {}, lang));
    }
    var value = Number(index);
    if (!Number.isFinite(value)) {
        return window.escapeHTML(window.t('bountyAppReliabilityNewbie', {}, lang));
    }
    return window.escapeHTML(window.t('bountyAppReliabilityValue', {
        pct: Math.round(value),
        emoji: emoji,
    }, lang));
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
        var displayName = window.escapeHTML(username
            ? ('@' + username)
            : (app.applicant_full_name || window.t('idLabel', { id: app.applicant_id }, lang)));
        var remain = formatBountyApplicationRemaining(app.created_at);
        var leftTimeText = window.t('offerTimeLeftValue', {
            hours: remain ? remain.hours : 0,
            minutes: remain ? remain.minutes : 0,
        }, lang);
        var expireText = remain
            ? window.t('bountyAppTimeLeft', { time: leftTimeText }, lang)
            : window.t('offerTimeUnknown', {}, lang);
        var appName = app.app_name || window.t('unknownLabel', {}, lang);
        var bountyVal = typeof formatAmountValue === 'function'
            ? formatAmountValue(app.bounty_per_tester || 0, 1)
            : String(app.bounty_per_tester || 0);
        var karmaVal = typeof formatAmountValue === 'function'
            ? formatAmountValue(app.applicant_karma || 0, 1)
            : String(app.applicant_karma || 0);
        var fullCycles = Number(app.applicant_completed_full_cycles || 0);

        return '' +
            '<div class="offer-card bounty-app-card" data-application-id="' + app.application_id + '">' +
                '<div class="offer-top">' +
                    '<button class="offer-user" onclick="openTesterDossier(\'' + safeUsername + '\', ' + Number(app.applicant_id || 0) + ', ' + Number(app.app_id || 0) + '); event.stopPropagation();">' + displayName + '</button>' +
                    '<span class="meta-chip accent-purple notranslate">💎 ' + window.escapeHTML(window.t('bountyAppContractChip', {}, lang)) + '</span>' +
                '</div>' +
                '<div class="offer-sub">' + window.escapeHTML(window.t('bountyAppForProject', { app: appName }, lang)) + '</div>' +
                '<div class="offer-sub notranslate">💎 ' + bountyVal + ' $BUST</div>' +
                '<div class="bounty-app-stats">' +
                    '<span class="meta-chip accent-yellow">☯️ ' + karmaVal + '</span>' +
                    '<span class="meta-chip">' + _formatBountyReliabilityChip(app) + '</span>' +
                '</div>' +
                '<div class="offer-sub">' + window.escapeHTML(window.t('bountyAppFullCycles', { count: fullCycles }, lang)) + '</div>' +
                '<div class="offer-expire">' + expireText + '</div>' +
                '<div class="action-row" style="margin-top: 10px;">' +
                    '<button class="btn btn-success" style="flex: 1;" onclick="decideBountyApplication(' + app.application_id + ', \'accept\', event)">' + window.escapeHTML(window.t('bountyAppAcceptBtn', {}, lang)) + '</button>' +
                    '<button class="btn" style="flex: 1; background-color: rgba(255,59,48,0.12); color: #ff3b30;" onclick="decideBountyApplication(' + app.application_id + ', \'reject\', event)">' + window.escapeHTML(window.t('bountyAppRejectBtn', {}, lang)) + '</button>' +
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
        var response = await fetch(API_BASE + '/bounty-applications/' + normalizedId + '/' + decision, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(typeof withInitData === 'function' ? withInitData({ user_id: userId }) : { user_id: userId, init_data: (tg && tg.initData) || '' }),
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
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
    var meta = document.getElementById('auto-accept-bounty-meta');
    var label = document.getElementById('auto-accept-bounty-label');
    toggle.disabled = !!_bountyAppsToggleInFlight;
    toggle.checked = !!window._autoAcceptBountyEnabled && available;
    toggle.setAttribute('aria-disabled', available ? 'false' : 'true');
    if (meta) meta.textContent = window.t('autoAcceptBountyMeta', {}, lang);
    if (label) {
        var baseLabel = window.t('autoAcceptBountyLabel', {}, lang);
        label.textContent = available ? baseLabel : ('🔒 ' + baseLabel);
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
