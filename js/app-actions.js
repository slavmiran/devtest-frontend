/* Phase 5.3 — js/app-actions.js (structural split from app.js) */
/* checkin/timer flow, UI control, offers decisions, karma, feedback actions */
/* Depends on globals from js/app-config.js and js/app-api.js. */
function countGrantSkips(app) {
    if (app && app.skips_count != null && app.skips_count !== '') {
        var fromApi = Number(app.skips_count);
        if (Number.isFinite(fromApi)) return Math.max(0, Math.floor(fromApi));
    }
    var timeline = String(app && app.daily_timeline || '');
    if (timeline) {
        return Math.max(0, (timeline.substring(0, 14).match(/[03]/g) || []).length);
    }
    return 0;
}

function buildCheckpointTestLink(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return '';
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || TELEGRAM_RUNTIME_BOT_USERNAME || BOT_USERNAME);
    return `https://t.me/${botUsername}/${WEBAPP_SHORTNAME}?startapp=app_focus_${normalizedId}`;
}

function buildCheckpointGooglePlayLink(packageName, explicitUrl) {
    var normalizedUrl = String(explicitUrl || '').trim();
    if (normalizedUrl) return normalizedUrl;
    var normalizedPackage = String(packageName || '').trim();
    if (!normalizedPackage) return '';
    return 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(normalizedPackage);
}

function buildCheckpointReciprocalAppLink(test) {
    if (!test || typeof test !== 'object') return '';
    var reciprocalAppId = Number(test.reciprocal_app_id || 0);
    var reciprocalStatus = String(test.reciprocal_app_status || '').trim().toLowerCase();
    if (reciprocalAppId > 0 && (!reciprocalStatus || reciprocalStatus === 'active')) {
        return buildCheckpointTestLink(reciprocalAppId);
    }
    return buildCheckpointGooglePlayLink(
        test.reciprocal_app_package_name,
        test.reciprocal_app_play_store_url
    );
}

function getCheckpointJoinSourceLabel(test, messageLang) {
    var resolvedLang = typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(messageLang, lang)
        : lang;
    var joinType = String(test && test.join_type || 'invite').trim().toLowerCase();
    if (joinType === 'mutual') return window.t('testerSourceMutualFull', {}, resolvedLang);
    if (joinType === 'bounty') return window.t('testerSourceBountyFull', {}, resolvedLang);
    if (joinType === 'prelaunch') return window.t('testerSourcePrelaunchFull', {}, resolvedLang);
    if (joinType === 'direct' || joinType === 'invite') {
        return window.t('testerSourceInviteNoMutualFull', {}, resolvedLang);
    }
    return window.t('testerSourceInviteNoMutualFull', {}, resolvedLang);
}

function getDefaultCheckpointReportLanguage(appId) {
    var test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    var ownerLanguage = String(test && test.owner_language || '').trim().toLowerCase();
    if (ownerLanguage === 'ru' || ownerLanguage === 'en') {
        return ownerLanguage;
    }
    var targetLanguage = String(test && test.target_lang || '').trim().toUpperCase();
    if (targetLanguage === 'RU' || targetLanguage === 'EN') {
        return targetLanguage.toLowerCase();
    }
    return typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(lang, lang)
        : (String(lang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en');
}

function buildCheckpointReportPrefill(appId, messageLang) {
    var resolvedLang = typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(messageLang, getDefaultCheckpointReportLanguage(appId))
        : getDefaultCheckpointReportLanguage(appId);
    var prefill = window.t('reportPrefill', {}, resolvedLang);
    var test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    if (!test) {
        return prefill;
    }
    var blocks = [prefill.trim()];
    var testedAppName = String(test.name || test.package || '').trim();
    if (testedAppName) {
        blocks.push(window.t('reportPrefillTestedAppLine', {
            app_name: testedAppName
        }, resolvedLang));
    }

    var reciprocalAppName = String(test.reciprocal_app_name || test.reciprocal_app_package_name || '').trim();
    var reciprocalAppLink = buildCheckpointReciprocalAppLink(test);
    if (reciprocalAppName && reciprocalAppLink) {
        blocks.push(window.t('reportPrefillMyAppLinkLine', {
            app_name: reciprocalAppName,
            app_link: reciprocalAppLink
        }, resolvedLang));
    } else {
        blocks.push(window.t('reportPrefillSourceLine', {
            source: getCheckpointJoinSourceLabel(test, resolvedLang)
        }, resolvedLang));
    }
    return blocks.filter(function(item) {
        return String(item || '').trim() !== '';
    }).join('\n\n') + '\n\n';
}

function openOwnerCheckpointChat(ownerUsername, text) {
    var normalizedUsername = String(ownerUsername || '').replace('@', '').trim();
    if (!normalizedUsername) return false;

    var messageText = String(text || '').trim();
    if (messageText) {
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(messageText).then(function() {
                    showToast(window.t('checkpointReportCopied', {
                        username: '@' + normalizedUsername,
                    }, lang));
                }).catch(function() {});
            }
        } catch (error) {}
    }

    const encodedText = encodeURIComponent(messageText);
    try {
        tg.openTelegramLink('https://t.me/' + normalizedUsername + '?text=' + encodedText);
    } catch (error) {
        try {
            tg.openLink('https://t.me/' + normalizedUsername + '?text=' + encodedText);
        } catch (fallbackError) {
            window.location.href = 'https://t.me/' + normalizedUsername + '?text=' + encodedText;
        }
    }
    _pendingScreenshotReminderUsername = normalizedUsername;
    return true;
}

function sendCheckpointScreenshotAndConfirm(appId, ownerUsername) {
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(appId, ownerUsername);
    confirmStart(appId, { proofKind: 'checkpoint_screenshot' });
    openOwnerCheckpointChat(resolvedOwnerUsername, buildCheckpointReportPrefill(appId));
}

function _isAutoAcceptMutualAvailable() {
    if (typeof _autoAcceptMutualAvailable === 'undefined') return true;
    return !!_autoAcceptMutualAvailable;
}

function _isAutoAcceptSectionAvailable() {
    var mutualOk = _isAutoAcceptMutualAvailable();
    var bountyOk = (typeof _isAutoAcceptBountyAvailable === 'function')
        ? _isAutoAcceptBountyAvailable()
        : (typeof window._autoAcceptBountyAvailable === 'undefined' ? true : !!window._autoAcceptBountyAvailable);
    return mutualOk && bountyOk;
}

function _showAutoAcceptLockedFeedback() {
    var message = window.t('autoAcceptMutualLockedToast', {}, lang);
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
    if (tg.showAlert) {
        tg.showAlert(message);
    } else if (typeof showToast === 'function') {
        showToast(message);
    }
}

function syncAutoAcceptSectionUi() {
    var sectionLabel = document.getElementById('auto-accept-section-label');
    var sectionMeta = document.getElementById('auto-accept-section-meta');
    var available = _isAutoAcceptSectionAvailable();
    if (sectionMeta) {
        sectionMeta.textContent = window.t(
            available ? 'autoAcceptSectionMeta' : 'autoAcceptSectionLockedMeta',
            {},
            lang
        );
    }
    if (sectionLabel) {
        var baseLabel = window.t('autoAcceptSectionLabel', {}, lang);
        // Lock icon only on the section title — do not repeat on meta/subrows.
        sectionLabel.textContent = available ? baseLabel : ('🔒 ' + baseLabel);
    }
}

function syncAutoAcceptToggleUi() {
    var toggle = document.getElementById('auto-accept-mutual-toggle');
    if (!toggle) return;
    var available = _isAutoAcceptMutualAvailable();
    var label = document.getElementById('auto-accept-mutual-label');

    // Keep input clickable when locked — disabled checkboxes swallow taps and show no feedback.
    toggle.disabled = !!_autoAcceptToggleInFlight;
    toggle.checked = !!_autoAcceptMutualEnabled && available;
    toggle.setAttribute('aria-disabled', available ? 'false' : 'true');

    if (label) {
        label.textContent = window.t('autoAcceptMutualLabel', {}, lang);
    }
    syncAutoAcceptSectionUi();
}

function showAutoAcceptSectionInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (!_isAutoAcceptSectionAvailable()) {
        _showAutoAcceptLockedFeedback();
        return;
    }
    showToast(window.t('autoAcceptSectionInfoToast', {}, lang));
}

function showAutoAcceptMutualInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (!_isAutoAcceptMutualAvailable()) {
        _showAutoAcceptLockedFeedback();
        return;
    }
    showToast(window.t('autoAcceptMutualInfoToast', {}, lang));
}

function isDefaultGoogleGroupUrl(url) {
    var candidate = String(url || '').trim();
    if (!candidate) return true;
    if (window.AccessSetupManager && typeof window.AccessSetupManager.isDefaultGroup === 'function') {
        return !!window.AccessSetupManager.isDefaultGroup(candidate);
    }
    var normalize = function(value) {
        return String(value || '').trim().replace(/\/+$/, '').toLowerCase();
    };
    var defaultUrl = normalize(window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test');
    return normalize(candidate) === defaultUrl;
}

function _persistDefaultGroupJoined() {
    try {
        localStorage.setItem(_defaultGroupJoinedStorageKey, JSON.stringify({
            userId: Number(userId) || 0,
            joined: !!_defaultGroupJoined,
            updatedAt: Date.now(),
        }));
        _defaultGroupJoinedReady = true;
        window.App.defaultGroupJoined = !!_defaultGroupJoined;
    } catch (error) {}
}

function _hydrateDefaultGroupJoinedFromCache() {
    try {
        var raw = localStorage.getItem(_defaultGroupJoinedStorageKey);
        if (!raw) return false;
        var payload = JSON.parse(raw);
        if (!payload || Number(payload.userId || 0) !== Number(userId || 0)) return false;
        _defaultGroupJoined = !!payload.joined;
        _defaultGroupJoinedReady = true;
        window.App.defaultGroupJoined = _defaultGroupJoined;
        return true;
    } catch (error) {
        return false;
    }
}

function syncDefaultGroupJoinedUi() {
    var statusBtn = document.getElementById('settings-default-group-status');
    if (statusBtn) {
        var connected = !!_defaultGroupJoined;
        statusBtn.textContent = connected
            ? window.t('settingsDefaultGroupConnected', {}, lang)
            : window.t('settingsDefaultGroupNotConnected', {}, lang);
        statusBtn.classList.toggle('is-connected', connected);
        statusBtn.classList.toggle('is-missing', !connected);
    }
    var label = document.getElementById('settings-default-group-label');
    if (label) {
        label.textContent = window.t('settingsDefaultGroupLabel', {}, lang);
    }
    var confirmCheckbox = document.getElementById('default-group-confirm-checkbox');
    if (confirmCheckbox) {
        confirmCheckbox.checked = !!_defaultGroupJoined;
        confirmCheckbox.disabled = !!_defaultGroupJoinedInFlight;
    }
}

_hydrateDefaultGroupJoinedFromCache();
if (typeof window !== 'undefined') {
    window._hydrateDefaultGroupJoinedFromCache = _hydrateDefaultGroupJoinedFromCache;
    window._persistDefaultGroupJoined = _persistDefaultGroupJoined;
}

async function markDefaultGroupJoined(options) {
    var settings = options || {};
    if (_defaultGroupJoined && !settings.force) {
        syncDefaultGroupJoinedUi();
        return true;
    }
    if (_defaultGroupJoinedInFlight) return false;

    var previousValue = !!_defaultGroupJoined;
    _defaultGroupJoinedInFlight = true;
    _defaultGroupJoined = true;
    window.App.defaultGroupJoined = true;
    _persistDefaultGroupJoined();
    syncDefaultGroupJoinedUi();

    try {
        var response = await fetch(API_BASE + '/users/me/default-group-joined', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ joined: true })),
        });
        var result = await response.json();
        if (!response.ok || !result || result.status !== 'success') {
            _defaultGroupJoined = previousValue;
            window.App.defaultGroupJoined = previousValue;
            _persistDefaultGroupJoined();
            syncDefaultGroupJoinedUi();
            if (!settings.silent) {
                handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            }
            return false;
        }
        _defaultGroupJoined = !!result.default_group_joined;
        window.App.defaultGroupJoined = _defaultGroupJoined;
        _persistDefaultGroupJoined();
        syncDefaultGroupJoinedUi();
        if (settings.rerender !== false && typeof window.renderTests === 'function') {
            window.renderTests(true);
        }
        return true;
    } catch (error) {
        console.error('default_group_joined update error:', error);
        _defaultGroupJoined = previousValue;
        window.App.defaultGroupJoined = previousValue;
        _persistDefaultGroupJoined();
        syncDefaultGroupJoinedUi();
        if (!settings.silent) {
            handleApiError('network_error');
        }
        return false;
    } finally {
        _defaultGroupJoinedInFlight = false;
        syncDefaultGroupJoinedUi();
    }
}

function openDefaultGoogleGroupLink() {
    var groupUrl = String(window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    try {
        if (tg && typeof tg.openLink === 'function') {
            tg.openLink(groupUrl, { try_browser: 'chrome' });
        } else {
            window.open(groupUrl, '_blank', 'noopener');
        }
    } catch (err) {
        console.error('Failed to open default Google Group:', err);
        window.open(groupUrl, '_blank', 'noopener');
    }
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function handleJoinGoogleGroupClick(appId, groupUrl, options) {
    var settings = options || {};
    var resolvedUrl = String(groupUrl || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    try {
        if (tg && typeof tg.openLink === 'function') {
            tg.openLink(resolvedUrl, { try_browser: 'chrome' });
        } else {
            window.open(resolvedUrl, '_blank', 'noopener');
        }
    } catch (err) {
        console.error('Failed to open Google Group link:', err);
        window.open(resolvedUrl, '_blank', 'noopener');
    }
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (isDefaultGoogleGroupUrl(resolvedUrl)) {
        // Keep accordion open across re-render after marking the default group joined.
        markDefaultGroupJoined({
            silent: true,
            rerender: settings.rerender !== false,
        });
        return;
    }
    // Custom groups have no server-side membership flag, so completion is tracked locally.
    markCustomGroupJoined(appId);
    startCustomGroupAccessWait(appId);
    if (settings.rerender !== false && typeof renderTests === 'function') {
        renderTests(true);
    }
}

function handleGroupStatusChipClick(appId, groupUrl) {
    var resolvedUrl = String(groupUrl || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    handleJoinGoogleGroupClick(appId, resolvedUrl);
}

function openDefaultGroupSettingsModal() {
    var modal = document.getElementById('default-group-modal');
    if (!modal) return;
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    var title = document.getElementById('t-defaultGroupModalTitle');
    var subtitle = document.getElementById('t-defaultGroupModalSubtitle');
    var joinBtn = document.getElementById('t-defaultGroupModalJoin');
    var confirmLabel = document.getElementById('t-defaultGroupModalConfirm');
    var linkText = document.getElementById('default-group-modal-link-text');
    var groupUrl = String(window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    if (title) title.textContent = window.t('defaultGroupModalTitle', {}, lang);
    if (subtitle) subtitle.textContent = window.t('defaultGroupModalSubtitle', {}, lang);
    if (joinBtn) joinBtn.textContent = window.t('defaultGroupModalJoinBtn', {}, lang);
    if (confirmLabel) confirmLabel.textContent = window.t('defaultGroupModalConfirm', {}, lang);
    if (linkText) linkText.textContent = groupUrl;
    syncDefaultGroupJoinedUi();
    modal.classList.add('active');
}

function closeDefaultGroupSettingsModal(event) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
        return;
    }
    var modal = document.getElementById('default-group-modal');
    if (modal) modal.classList.remove('active');
}

function copyDefaultGroupModalLink() {
    var groupUrl = String(window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    var done = function() {
        showToast(window.t('copied', {}, lang));
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(groupUrl).then(done).catch(function() {
            showToast(groupUrl);
        });
        return;
    }
    showToast(groupUrl);
}

function handleDefaultGroupModalJoin() {
    openDefaultGoogleGroupLink();
    markDefaultGroupJoined({ silent: true, rerender: true });
}

async function handleDefaultGroupConfirmCheckbox(input) {
    if (!input) return;
    if (!input.checked) {
        // Flag is one-way confirmation; unchecking does not revoke membership.
        input.checked = !!_defaultGroupJoined;
        syncDefaultGroupJoinedUi();
        return;
    }
    var ok = await markDefaultGroupJoined({ silent: false, rerender: true });
    if (!ok) {
        input.checked = !!_defaultGroupJoined;
    } else if (tg && tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function setAccessProblemAccordionOpen(appId, isOpen) {
    var id = Number(appId || 0);
    if (!id) return;
    if (!(_openAccessProblemAppIds instanceof Set)) {
        _openAccessProblemAppIds = new Set();
    }
    if (isOpen) {
        _openAccessProblemAppIds.add(id);
    } else {
        _openAccessProblemAppIds.delete(id);
    }
    var panel = document.getElementById('access-problem-panel-' + id);
    var toggle = document.getElementById('access-problem-toggle-' + id);
    if (panel) {
        panel.classList.toggle('is-open', !!isOpen);
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }
    if (toggle) {
        toggle.classList.toggle('is-open', !!isOpen);
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    if (typeof syncCustomGroupAccessWaitUi === 'function') {
        syncCustomGroupAccessWaitUi();
    }
}

function isAccessProblemAccordionOpen(appId) {
    var id = Number(appId || 0);
    return !!id && (_openAccessProblemAppIds instanceof Set) && _openAccessProblemAppIds.has(id);
}

function toggleAccessProblemAccordion(appId) {
    var nextOpen = !isAccessProblemAccordionOpen(appId);
    setAccessProblemAccordionOpen(appId, nextOpen);
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function restoreAccessProblemAccordions() {
    if ((_openAccessProblemAppIds instanceof Set) && _openAccessProblemAppIds.size) {
        _openAccessProblemAppIds.forEach(function(id) {
            setAccessProblemAccordionOpen(id, true);
        });
    }
    if (typeof syncCustomGroupAccessWaitUi === 'function') {
        syncCustomGroupAccessWaitUi();
    }
}

function openAccessProblemGroupLink(appId) {
    // Persist open state before leave/re-render so accordion stays expanded on return.
    setAccessProblemAccordionOpen(appId, true);
    var test = (typeof myTests !== 'undefined' ? myTests : []).find(function(item) {
        return Number(item.id) === Number(appId);
    });
    var groupUrl = String((test && (test.google_group_url || test.group_url)) || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    handleJoinGoogleGroupClick(appId, groupUrl, { rerender: true });
}

async function handleAutoAcceptMutualToggle(input) {
    if (!input || _autoAcceptToggleInFlight) {
        syncAutoAcceptToggleUi();
        return;
    }

    if (!_isAutoAcceptMutualAvailable()) {
        input.checked = false;
        syncAutoAcceptToggleUi();
        _showAutoAcceptLockedFeedback();
        return;
    }

    var previousValue = !!_autoAcceptMutualEnabled;
    var nextValue = !!input.checked;
    if (nextValue === previousValue) {
        syncAutoAcceptToggleUi();
        return;
    }

    _autoAcceptToggleInFlight = true;
    _autoAcceptMutualEnabled = nextValue;
    syncAutoAcceptToggleUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    try {
        var response = await fetch(API_BASE + '/users/me/auto-accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: (tg && tg.initData) ? tg.initData : '', enabled: nextValue })
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            _autoAcceptMutualEnabled = previousValue;
            if (typeof result.auto_accept_available !== 'undefined') {
                _autoAcceptMutualAvailable = !!result.auto_accept_available;
            }
            syncAutoAcceptToggleUi();
            var errorCode = getBackendErrorCode(result);
            if (errorCode === 'auto_accept_reliability_required' || !_isAutoAcceptMutualAvailable()) {
                _showAutoAcceptLockedFeedback();
                return;
            }
            handleApiError(errorCode, result && result.details ? result.details : {});
            return;
        }

        _autoAcceptMutualEnabled = !!result.auto_accept_mutual;
        if (typeof result.auto_accept_available !== 'undefined') {
            _autoAcceptMutualAvailable = !!result.auto_accept_available;
        }
        window.App.autoAcceptMutual = _autoAcceptMutualEnabled;
        syncAutoAcceptToggleUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(_autoAcceptMutualEnabled ? 'autoAcceptMutualEnabledToast' : 'autoAcceptMutualDisabledToast', {}, lang));
    } catch (error) {
        console.error('Auto-accept toggle error:', error);
        _autoAcceptMutualEnabled = previousValue;
        syncAutoAcceptToggleUi();
        handleApiError('network_error');
    } finally {
        _autoAcceptToggleInFlight = false;
        syncAutoAcceptToggleUi();
    }
}

function _ensureTestCardExpanded(card) {
    if (!card) return;
    var doneList = document.getElementById('done-list');
    var doneSection = document.getElementById('done-section');
    if (!doneList || !doneSection || !doneList.contains(card)) return;
    if (!doneSection.classList.contains('active') && typeof window.toggleAccordion === 'function') {
        window.toggleAccordion();
    }
}

function _highlightTestCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('test-card-' + normalizedId);
    if (!card) return false;

    _ensureTestCardExpanded(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('test-card-highlight-pulse');
    void card.offsetWidth;
    card.classList.add('test-card-highlight-pulse');
    if (_highlightTestTimerId) {
        clearTimeout(_highlightTestTimerId);
    }
    _highlightTestTimerId = setTimeout(function() {
        card.classList.remove('test-card-highlight-pulse');
        _highlightTestTimerId = null;
    }, 3600);
    return true;
}

function _highlightTestCardWhenReady(appId, attemptsLeft) {
    var remaining = Number.isFinite(attemptsLeft) ? attemptsLeft : 8;
    if (_highlightTestCard(appId)) {
        _pendingInitialHighlightTestId = null;
        return;
    }
    if (remaining <= 0) return;
    setTimeout(function() {
        _highlightTestCardWhenReady(appId, remaining - 1);
    }, 180);
}

function _expandProjectCardWhenReady(projectId, attemptsLeft) {
    var normalizedId = Number(projectId || 0);
    if (normalizedId <= 0) return false;
    var card = document.getElementById('project-card-' + normalizedId);
    if (card) {
        if (card.classList.contains('card-collapsed')) {
            card.classList.remove('card-collapsed');
            localStorage.setItem('project_card_collapsed_' + normalizedId, 'false');
            var chevron = card.querySelector('.card-expand-chevron');
            if (chevron) chevron.classList.remove('is-collapsed');
        }
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-pulse');
        setTimeout(function() {
            card.classList.remove('highlight-pulse');
        }, 2000);
        return true;
    }
    var remaining = Number.isFinite(attemptsLeft) ? attemptsLeft : 10;
    if (remaining <= 0) return false;
    setTimeout(function() {
        _expandProjectCardWhenReady(normalizedId, remaining - 1);
    }, 220);
    return false;
}

function toggleSystemMenu() {
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        const willOpen = !menu.classList.contains('active');
        menu.classList.toggle('active');
        if (willOpen && typeof window.populateSettingsEmail === 'function') {
            window.populateSettingsEmail();
        }
        if (willOpen && typeof window.populateDeviceInfoSettings === 'function') {
            window.populateDeviceInfoSettings();
        }
        if (willOpen && typeof window.refreshHomeScreenStatus === 'function') {
            window.refreshHomeScreenStatus({ force: true });
        }
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function sendFeedback(type) {
    const typeKeyMap = {
        bug: 'feedbackTypeBug',
        idea: 'feedbackTypeIdea',
        question: 'feedbackTypeQuestion'
    };
    _feedbackType = (type === 'idea' || type === 'question') ? type : 'bug';
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        menu.classList.remove('active');
    }
    openFeedbackModal(typeKeyMap[_feedbackType]);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

/** Writes a confirm-button caption without destroying step-row markup. */
function _setConfirmButtonLabel(btn, text) {
    if (!btn) return;
    var label = btn.querySelector('.tstep__label');
    if (label) {
        label.textContent = text;
        return;
    }
    btn.innerText = text;
}

function _setAccessProblemStepLabel(btn, text) {
    if (!btn) return;
    var label = btn.querySelector('.apstep__label');
    if (label) {
        label.textContent = text;
        return;
    }
    btn.textContent = text;
}

function _loadCustomGroupJoinedState() {
    try {
        var raw = localStorage.getItem(_customGroupJoinedStateKey);
        var parsed = raw ? JSON.parse(raw) : null;
        _customGroupJoinedState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        _customGroupJoinedState = {};
    }
}

function markCustomGroupJoined(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    _customGroupJoinedState[key] = true;
    try {
        localStorage.setItem(_customGroupJoinedStateKey, JSON.stringify(_customGroupJoinedState));
    } catch (error) {}
}

function isCustomGroupJoined(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return false;
    return !!(_customGroupJoinedState && _customGroupJoinedState[key]);
}

function _loadCustomGroupWaitState() {
    try {
        var raw = localStorage.getItem(_customGroupWaitStateKey);
        var parsed = raw ? JSON.parse(raw) : null;
        _customGroupWaitState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        _customGroupWaitState = {};
    }
    var waitMs = Number(CUSTOM_GROUP_ACCESS_WAIT_MS) || (15 * 60 * 1000);
    var now = Date.now();
    var cleaned = {};
    Object.keys(_customGroupWaitState || {}).forEach(function(key) {
        var startedAt = Number(_customGroupWaitState[key] || 0);
        if (startedAt > 0 && (now - startedAt) < waitMs) {
            cleaned[key] = startedAt;
        }
    });
    _customGroupWaitState = cleaned;
}

function _persistCustomGroupWaitState() {
    try {
        localStorage.setItem(_customGroupWaitStateKey, JSON.stringify(_customGroupWaitState || {}));
    } catch (error) {}
}

function startCustomGroupAccessWait(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    var waitMs = Number(CUSTOM_GROUP_ACCESS_WAIT_MS) || (15 * 60 * 1000);
    var existing = Number((_customGroupWaitState && _customGroupWaitState[key]) || 0);
    if (existing > 0 && (Date.now() - existing) < waitMs) {
        if (typeof syncCustomGroupAccessWaitUi === 'function') syncCustomGroupAccessWaitUi();
        return;
    }
    if (!_customGroupWaitState || typeof _customGroupWaitState !== 'object') {
        _customGroupWaitState = {};
    }
    _customGroupWaitState[key] = Date.now();
    _persistCustomGroupWaitState();
    if (typeof syncCustomGroupAccessWaitUi === 'function') syncCustomGroupAccessWaitUi();
}

function getCustomGroupAccessWaitRemainingMs(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return 0;
    var startedAt = Number((_customGroupWaitState && _customGroupWaitState[key]) || 0);
    if (startedAt <= 0) return 0;
    var waitMs = Number(CUSTOM_GROUP_ACCESS_WAIT_MS) || (15 * 60 * 1000);
    return Math.max(0, waitMs - (Date.now() - startedAt));
}

function formatCustomGroupAccessWaitClock(remainingMs) {
    var totalSeconds = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function _clearCustomGroupWaitTicker() {
    if (_customGroupWaitTimerId) {
        clearInterval(_customGroupWaitTimerId);
        _customGroupWaitTimerId = null;
    }
}

function syncCustomGroupAccessWaitUi() {
    var nodes = document.querySelectorAll('[data-custom-group-wait]');
    var anyActive = false;
    Array.prototype.forEach.call(nodes, function(wrap) {
        var appId = Number(wrap.getAttribute('data-custom-group-wait') || 0);
        var remaining = getCustomGroupAccessWaitRemainingMs(appId);
        var clock = wrap.querySelector('[data-custom-group-wait-clock]');
        if (remaining <= 0) {
            wrap.hidden = true;
            return;
        }
        wrap.hidden = false;
        if (clock) clock.textContent = formatCustomGroupAccessWaitClock(remaining);
        var panel = wrap.closest('.access-problem-panel');
        if (panel && panel.classList.contains('is-open')) {
            anyActive = true;
        }
    });
    if (!anyActive) {
        _clearCustomGroupWaitTicker();
        return;
    }
    if (_customGroupWaitTimerId) return;
    _customGroupWaitTimerId = setInterval(syncCustomGroupAccessWaitUi, 1000);
}

function _loadFirstDayScreenshotState() {
    try {
        var raw = localStorage.getItem(_firstDayScreenshotStateKey);
        if (!raw) {
            _firstDayScreenshotState = {};
            return;
        }
        var parsed = JSON.parse(raw);
        _firstDayScreenshotState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        _firstDayScreenshotState = {};
    }
}

function _persistFirstDayScreenshotState() {
    try {
        localStorage.setItem(_firstDayScreenshotStateKey, JSON.stringify(_firstDayScreenshotState || {}));
    } catch (error) {}
}

function setFirstDayScreenshotVisible(appId, isVisible) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    if (isVisible) {
        _firstDayScreenshotState[key] = true;
    } else {
        delete _firstDayScreenshotState[key];
    }
    _persistFirstDayScreenshotState();
}

function isFirstDayScreenshotVisible(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return false;
    return !!_firstDayScreenshotState[key];
}

function _persistActiveTimer() {
    try {
        if (!activeTimerAppId || !_timerEndTimestamp) {
            localStorage.removeItem(_timerStorageKey);
            return;
        }
        localStorage.setItem(_timerStorageKey, JSON.stringify({
            appId: activeTimerAppId,
            endTimestamp: _timerEndTimestamp,
            isScreenshot: !!_timerIsScreenshot,
            ownerUsername: _timerOwnerUsername || '',
            localDate: _timerLocalDate || getLocalDate(),
        }));
    } catch (error) {
        console.warn('Failed to persist active timer:', error);
    }
}

function _loadTimerReadyState() {
    try {
        var raw = localStorage.getItem(_timerReadyStateKey);
        if (!raw) {
            _timerReadyState = {};
            return;
        }
        var parsed = JSON.parse(raw);
        var today = getLocalDate();
        var nextState = {};
        if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(function(key) {
                var payload = parsed[key];
                if (!payload || typeof payload !== 'object') return;
                if (String(payload.localDate || '') !== today) return;
                nextState[key] = {
                    isScreenshot: !!payload.isScreenshot,
                    ownerUsername: String(payload.ownerUsername || ''),
                    localDate: today,
                    openToken: String(payload.openToken || ''),
                    readyAtMs: Number(payload.readyAtMs || 0) || 0,
                    expiresAtMs: Number(payload.expiresAtMs || 0) || 0,
                    progressId: Number(payload.progressId || 0) || 0,
                };
                if (nextState[key].openToken) {
                    _checkinOpenTokenState[key] = {
                        token: nextState[key].openToken,
                        readyAtMs: nextState[key].readyAtMs,
                        expiresAtMs: nextState[key].expiresAtMs,
                        progressId: nextState[key].progressId,
                        localDate: today,
                    };
                }
            });
        }
        _timerReadyState = nextState;
    } catch (error) {
        _timerReadyState = {};
    }
}

function _persistTimerReadyState() {
    try {
        localStorage.setItem(_timerReadyStateKey, JSON.stringify(_timerReadyState || {}));
    } catch (error) {}
}

function setTimerReadyForConfirm(appId, isReady, isScreenshot, ownerUsername) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    if (isReady) {
        var openMeta = (_checkinOpenTokenState && _checkinOpenTokenState[key]) || {};
        _timerReadyState[key] = {
            isScreenshot: !!isScreenshot,
            ownerUsername: String(ownerUsername || ''),
            localDate: getLocalDate(),
            openToken: String(openMeta.token || ''),
            readyAtMs: Number(openMeta.readyAtMs || 0) || 0,
            expiresAtMs: Number(openMeta.expiresAtMs || 0) || 0,
            progressId: Number(openMeta.progressId || 0) || 0,
        };
    } else {
        delete _timerReadyState[key];
        if (_checkinOpenTokenState) delete _checkinOpenTokenState[key];
    }
    _persistTimerReadyState();
    _syncExternalTimerReadyVisual(appId, isReady);
}

function _syncExternalTimerReadyVisual(appId, isReady) {
    var btn = document.getElementById('btn-confirm-' + Number(appId || 0));
    if (!btn || !btn.classList.contains('external-tests-confirm-btn')) return;
    btn.classList.toggle('external-tests-confirm-ready', !!isReady);
    if (isReady) {
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
    }
}

function _getTimerReadyPayload(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return null;
    var payload = _timerReadyState[key];
    if (!payload || typeof payload !== 'object') return null;
    if (String(payload.localDate || '') !== getLocalDate()) {
        delete _timerReadyState[key];
        _persistTimerReadyState();
        return null;
    }
    return {
        isScreenshot: !!payload.isScreenshot,
        ownerUsername: String(payload.ownerUsername || '')
    };
}

function _applyPersistedReadyTimerButtons() {
    var keys = Object.keys(_timerReadyState || {});
    if (!keys.length) return;
    keys.forEach(function(key) {
        var appId = Number(key);
        if (isTestFeedbackCheckinPending(appId)) {
            applyTestFeedbackCheckinPendingUi(appId);
            return;
        }
        // Revalidate localDate on every render — prevents Confirm lighting up after midnight.
        var payload = _getTimerReadyPayload(appId);
        if (!payload) return;
        _setTimerButtonReady(appId, !!payload.isScreenshot, payload.ownerUsername || '');
    });
}

function _clearPersistedActiveTimer() {
    _timerLocalDate = '';
    try {
        localStorage.removeItem(_timerStorageKey);
    } catch (error) {
        console.warn('Failed to clear active timer state:', error);
    }
}

function clearActiveTimerForApp(appId) {
    if (!appId || Number(activeTimerAppId) !== Number(appId)) return false;
    if (_timerIntervalId) clearInterval(_timerIntervalId);
    _timerIntervalId = null;
    _timerEndTimestamp = null;
    activeTimerAppId = null;
    _timerIsScreenshot = false;
    _timerOwnerUsername = '';
    _timerLocalDate = '';
    _clearPersistedActiveTimer();
    if (typeof window.syncCheckinOptionsJustConfirmTimer === 'function') {
        window.syncCheckinOptionsJustConfirmTimer(appId, 0);
    }
    return true;
}
window.clearActiveTimerForApp = clearActiveTimerForApp;

function _resolveCheckpointOwnerUsername(appId, ownerUsername) {
    var normalized = String(ownerUsername || '').trim().replace(/^@+/, '');
    if (normalized) {
        return normalized;
    }

    var test = typeof getMyTestById === 'function' ? getMyTestById(appId) : null;
    if (!test) {
        return '';
    }

    return String(test.owner_username || '').trim().replace(/^@+/, '');
}

function _setTimerButtonReady(finishedId, isScreenshot, ownerUsername) {
    if (isTestFeedbackCheckinPending(finishedId)) {
        applyTestFeedbackCheckinPendingUi(finishedId);
        return true;
    }
    const btn = document.getElementById('btn-confirm-' + finishedId);
    if (!btn) return false;
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(finishedId, ownerUsername);

    // Check if test has an unresolved issue — keep button disabled
    var test = myTests.find(function(item) { return Number(item.id) === Number(finishedId); });
    var isExternalTest = !!(test && test.is_external);
    var testingDay = test && typeof window.getUserTestingDay === 'function'
        ? window.getUserTestingDay(test.start_date, test.testing_days)
        : null;
    var isFirstDayScreenshot = !!(isScreenshot && Number(testingDay || 0) === 1);
    if (test && test.issue_reported_at && !test.issue_fixed_at) {
        btn.classList.remove('external-tests-confirm-ready');
        btn.disabled = true;
        btn.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        btn.style.color = 'var(--hint-color)';
        btn.style.cursor = 'not-allowed';
        btn.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
            ? window.getIssueAwaitingFixLabel(test)
            : window.t('issueAwaitingFix', {}, lang);
        return true;
    }

    btn.disabled = false;
    btn.style.backgroundColor = '';
    btn.style.color = '';
    btn.style.borderColor = '';
    btn.style.cursor = 'pointer';
    btn.classList.add('btn-success', 'btn-confirm-ready');
    if (isScreenshot) {
        if (isExternalTest) {
            btn.innerText = isFirstDayScreenshot
                ? window.t('screenshotBtn', {}, lang)
                : window.t('completeControlDayBtn', {}, lang);
            btn.onclick = function(event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                if (isFirstDayScreenshot) {
                    if (typeof window.sendExternalScreenshotAndConfirmFromUi === 'function') {
                        window.sendExternalScreenshotAndConfirmFromUi(finishedId, resolvedOwnerUsername || '', event);
                    }
                    return;
                }
                if (typeof window.openExternalCheckinOptionsModal === 'function') {
                    window.openExternalCheckinOptionsModal(finishedId, resolvedOwnerUsername || '', event);
                }
            };
            return true;
        }
        btn.innerText = isFirstDayScreenshot
            ? window.t('screenshotBtn', {}, lang)
            : window.t('completeControlDayBtn', {}, lang);
        btn.onclick = function() {
            if (isFirstDayScreenshot) {
                handleScreenshotAndConfirm(finishedId, resolvedOwnerUsername || '');
                return;
            }
            openCheckinOptionsModal(finishedId, resolvedOwnerUsername || '');
        };
    } else {
        var existingSplitGroup = btn.parentNode && btn.parentNode.classList && btn.parentNode.classList.contains('split-btn-group')
            ? btn.parentNode
            : null;
        if (isExternalTest) {
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.style.borderColor = '';
        }
        if (existingSplitGroup) {
            if (isExternalTest) {
                btn.className = 'btn btn-success split-btn-main external-tests-confirm-btn external-tests-confirm-ready';
                btn.textContent = window.t('externalProjectCheckinBtn', {}, lang);
                btn.onclick = function(event) {
                    if (event) {
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    if (typeof window.sendExternalDailyCheckinFromUi === 'function') {
                        window.sendExternalDailyCheckinFromUi(finishedId, event);
                    }
                };
            } else {
                btn.className = 'btn btn-success btn-confirm-ready split-btn-main';
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.style.borderColor = '';
                btn.textContent = window.t('confirmTest', {}, lang);
                btn.onclick = function() {
                    confirmStart(finishedId);
                };
            }

            var existingOptionsBtn = existingSplitGroup.querySelector('.split-btn-options');
            if (!existingOptionsBtn) {
                existingOptionsBtn = document.createElement('button');
                existingOptionsBtn.className = 'btn btn-success split-btn-options';
                existingSplitGroup.appendChild(existingOptionsBtn);
            }
            existingOptionsBtn.className = isExternalTest
                ? 'btn btn-success split-btn-options external-tests-attach-btn'
                : 'btn btn-success split-btn-options';
            existingOptionsBtn.textContent = '📎';
            existingOptionsBtn.title = window.t('checkinOptionsTitle', {}, lang);
            existingOptionsBtn.setAttribute('aria-label', window.t('checkinOptionsTitle', {}, lang));
            existingOptionsBtn.onclick = function(event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                if (isExternalTest) {
                    openExternalCheckinOptionsModal(finishedId, resolvedOwnerUsername || '', event);
                    return;
                }
                openCheckinOptionsModal(finishedId, resolvedOwnerUsername || '');
            };
            existingSplitGroup.style.flex = '2';
            return true;
        }

        // Replace single button with split button group
        var safeOwner = window.escapeInlineJsString ? window.escapeInlineJsString(resolvedOwnerUsername || '') : (resolvedOwnerUsername || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var splitWrapper = document.createElement('div');
        splitWrapper.className = isExternalTest ? 'split-btn-group external-tests-confirm-group' : 'split-btn-group';
        splitWrapper.style.flex = '2';
        splitWrapper.innerHTML =
            '<button id="btn-confirm-' + finishedId + '" class="' + (isExternalTest ? 'btn btn-success btn-confirm-ready split-btn-main external-tests-confirm-btn external-tests-confirm-ready' : 'btn btn-success btn-confirm-ready split-btn-main') + '" onclick="' + (isExternalTest
                ? 'sendExternalDailyCheckinFromUi(' + finishedId + ', event)'
                : 'confirmStart(' + finishedId + ')') + '">' +
            window.escapeHTML(window.t(isExternalTest ? 'externalProjectCheckinBtn' : 'confirmTest', {}, lang)) +
            '</button>' +
            '<button class="btn btn-success split-btn-options' + (isExternalTest ? ' external-tests-attach-btn' : '') + '" onclick="' + (isExternalTest
                ? 'openExternalCheckinOptionsModal(' + finishedId + ', \'' + safeOwner + '\', event)'
                : 'openCheckinOptionsModal(' + finishedId + ', \'' + safeOwner + '\')') + '" title="' + window.escapeHTML(window.t('checkinOptionsTitle', {}, lang)) + '">' +
            '📎' +
            '</button>';
        btn.parentNode.replaceChild(splitWrapper, btn);
    }
    return true;
}

function isCheckinTimerActiveForApp(appId) {
    return !!(activeTimerAppId
        && Number(activeTimerAppId) === Number(appId)
        && _timerEndTimestamp
        && Date.now() < _timerEndTimestamp);
}

function getCheckinTimerRemainingSeconds(appId) {
    if (!isCheckinTimerActiveForApp(appId)) return 0;
    return Math.max(0, Math.ceil((_timerEndTimestamp - Date.now()) / 1000));
}

function _ensureEarlyPaperclipSplit(appId, ownerUsername) {
    if (isTestFeedbackCheckinPending(appId)) return false;
    var btn = document.getElementById('btn-confirm-' + appId);
    if (!btn) return false;

    var test = myTests.find(function(item) { return Number(item.id) === Number(appId); });
    if (test && test.is_external) return false;
    if (test && test.issue_reported_at && !test.issue_fixed_at) return false;

    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(appId, ownerUsername);
    var safeOwner = window.escapeInlineJsString
        ? window.escapeInlineJsString(resolvedOwnerUsername || '')
        : String(resolvedOwnerUsername || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var optionsTitle = window.t('checkinOptionsTitle', {}, lang);
    var optionsTitleSafe = window.escapeHTML(optionsTitle);
    var timerLabel = btn.innerText || '';

    var existingSplitGroup = btn.parentNode && btn.parentNode.classList
        && btn.parentNode.classList.contains('split-btn-group')
        ? btn.parentNode
        : null;

    if (existingSplitGroup) {
        btn.disabled = true;
        btn.className = 'btn split-btn-main';
        btn.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        btn.style.color = 'var(--hint-color)';
        btn.style.cursor = 'not-allowed';
        btn.onclick = null;

        var optionsBtn = existingSplitGroup.querySelector('.split-btn-options');
        if (!optionsBtn) {
            optionsBtn = document.createElement('button');
            existingSplitGroup.appendChild(optionsBtn);
        }
        optionsBtn.disabled = false;
        optionsBtn.className = 'btn btn-success split-btn-options';
        optionsBtn.textContent = '📎';
        optionsBtn.title = optionsTitle;
        optionsBtn.setAttribute('aria-label', optionsTitle);
        optionsBtn.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            openCheckinOptionsModal(appId, resolvedOwnerUsername || '');
        };
        existingSplitGroup.style.flex = '2';
        return true;
    }

    var splitWrapper = document.createElement('div');
    splitWrapper.className = 'split-btn-group';
    splitWrapper.style.flex = '2';
    splitWrapper.innerHTML =
        '<button id="btn-confirm-' + appId + '" class="btn split-btn-main" disabled ' +
        'style="background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;">' +
        window.escapeHTML(timerLabel) +
        '</button>' +
        '<button class="btn btn-success split-btn-options" onclick="openCheckinOptionsModal(' + appId + ', \'' + safeOwner + '\')" ' +
        'title="' + optionsTitleSafe + '" aria-label="' + optionsTitleSafe + '">📎</button>';
    btn.parentNode.replaceChild(splitWrapper, btn);
    return true;
}

function _startActiveTimerInterval(id) {
    if (_timerIntervalId) clearInterval(_timerIntervalId);
    _timerIntervalId = setInterval(() => {
        if (isTestFeedbackCheckinPending(id)) {
            applyTestFeedbackCheckinPendingUi(id);
            return;
        }
        var remaining = Math.ceil((_timerEndTimestamp - Date.now()) / 1000);
        var liveBtn = document.getElementById('btn-confirm-' + id);
        if (remaining <= 0) {
            _syncActiveTimerState();
            return;
        }
        if (liveBtn && !liveBtn.getAttribute('data-feedback-pending')) {
            liveBtn.innerText = t.timerRemaining.replace('{sec}', remaining);
        }
        if (typeof window.syncCheckinOptionsJustConfirmTimer === 'function') {
            window.syncCheckinOptionsJustConfirmTimer(id, remaining);
        }
    }, 1000);
}

function _syncActiveTimerState() {
    if (!activeTimerAppId || !_timerEndTimestamp) return false;
    if (_timerLocalDate && _timerLocalDate !== getLocalDate()) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
        return false;
    }
    if (Date.now() < _timerEndTimestamp) {
        _persistActiveTimer();
        return false;
    }

    const finishedId = activeTimerAppId;
    const wasScreenshot = !!_timerIsScreenshot;
    const savedOwnerUsername = _timerOwnerUsername || '';

    if (!_setTimerButtonReady(finishedId, wasScreenshot, savedOwnerUsername)) {
        // Keep expired timer state until the button is rendered after app restore.
        _persistActiveTimer();
        return false;
    }

    setTimerReadyForConfirm(finishedId, true, wasScreenshot, savedOwnerUsername);

    if (_timerIntervalId) clearInterval(_timerIntervalId);
    _timerIntervalId = null;
    _timerEndTimestamp = null;
    activeTimerAppId = null;
    _timerIsScreenshot = false;
    _timerOwnerUsername = '';
    _timerLocalDate = '';

    _clearPersistedActiveTimer();
    if (typeof window.syncCheckinOptionsJustConfirmTimer === 'function') {
        window.syncCheckinOptionsJustConfirmTimer(finishedId, 0);
    }
    notifyCheckinTimerFinished();
    return true;
}

/**
 * Timer-finished feedback. Telegram's HapticFeedback is missing on some clients
 * (older Android builds, desktop), so fall back to the Vibration API.
 */
function notifyCheckinTimerFinished() {
    try {
        if (tg && tg.HapticFeedback && typeof tg.HapticFeedback.notificationOccurred === 'function') {
            tg.HapticFeedback.notificationOccurred('success');
            return;
        }
    } catch (error) {}
    try {
        if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate([18, 55, 28]);
        }
    } catch (error) {}
}

function _loadPersistedActiveTimer() {
    try {
        const raw = localStorage.getItem(_timerStorageKey);
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (!payload || !payload.appId || !payload.endTimestamp) {
            _clearPersistedActiveTimer();
            return;
        }
        activeTimerAppId = Number(payload.appId) || null;
        _timerEndTimestamp = Number(payload.endTimestamp) || null;
        _timerIsScreenshot = !!payload.isScreenshot;
        _timerOwnerUsername = String(payload.ownerUsername || '');
        _timerLocalDate = String(payload.localDate || '');
        _syncActiveTimerState();
    } catch (error) {
        console.warn('Failed to load persisted active timer:', error);
        _clearPersistedActiveTimer();
    }
}

function rerenderDynamicUi() {
    renderEvents(true);
    renderTests(true);
    renderIncomingOffers(true);
    renderProjects(true);
    renderMutualFeed(true);
    renderMutualReturns(null, true);
    renderBountyFeed(true);
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    renderArchivedProjects(true);
    refreshOpenModals();
}

function refreshOpenModals() {
    const earnModal = document.getElementById('earn-bust-modal');
    if (earnModal && earnModal.classList.contains('active')) {
        renderEarnBustDynamic();
    }
    const inviteModal = document.getElementById('invite-modal');
    if (inviteModal && inviteModal.classList.contains('active') && _inviteProjectId) {
        openInviteModal(_inviteProjectId);
    }
    const visibilityModal = document.getElementById('visibility-mode-modal');
    if (visibilityModal && visibilityModal.classList.contains('active') && window.renderVisibilityModeModal) {
        window.renderVisibilityModeModal();
    }
    const guestInviteModal = document.getElementById('guest-invite-modal');
    if (guestInviteModal && guestInviteModal.classList.contains('active') && window.renderGuestInviteModal) {
        window.renderGuestInviteModal();
    }
    const reliabilityInfoModal = document.getElementById('reliability-info-modal');
    if (reliabilityInfoModal && reliabilityInfoModal.classList.contains('active') && window.showReliabilityInfo) {
        window.showReliabilityInfo();
    }
    const contributionInfoModal = document.getElementById('contribution-info-modal');
    if (contributionInfoModal && contributionInfoModal.classList.contains('active') && window.showContributionInfo) {
        window.showContributionInfo();
    }
    const checkinOptionsModal = document.getElementById('checkin-options-modal');
    if (checkinOptionsModal && checkinOptionsModal.classList.contains('active') && window.renderCheckinReviewOptions) {
        window.renderCheckinReviewOptions();
    }
    const playReviewModal = document.getElementById('play-review-modal');
    if (playReviewModal && playReviewModal.classList.contains('active') && window.renderPlayReviewModal) {
        window.renderPlayReviewModal();
    }
    const massInviteModal = document.getElementById('mass-invite-modal');
    if (massInviteModal && massInviteModal.classList.contains('active') && typeof window.renderMassInviteModalContent === 'function') {
        window.renderMassInviteModalContent();
    }
    const projectDetailsModal = document.getElementById('project-details-modal');
    if (projectDetailsModal && projectDetailsModal.classList.contains('active') && window.openProjectDetailsModal) {
        const activeProjectId = Number(projectDetailsModal.dataset.appId || 0);
        if (activeProjectId !== 0) {
            window.openProjectDetailsModal(activeProjectId);
        }
    }
    const reliabilityAlphaModal = document.getElementById('reliability-alpha-modal');
    if (reliabilityAlphaModal && reliabilityAlphaModal.classList.contains('active')) {
        if (window.renderReliabilityAlphaModal) {
            window.renderReliabilityAlphaModal();
        } else if (window.renderReliabilityDashboard) {
            window.renderReliabilityDashboard();
        }
    }
    // Refresh protection center if open (re-opens with latest project data)
    const protectionCenter = document.getElementById('protection-center');
    if (protectionCenter && protectionCenter.classList.contains('active') && window._syncProjectId) {
        if (typeof window.openProtectionCenter === 'function') {
            // Re-render body without slide animation
            const project = (window.myProjects || []).find(function(item) {
                return Number(item.id) === Number(window._syncProjectId);
            });
            if (project) {
                const platformDay = getProjectPlatformDay(project.created_at);
                const isSynced = typeof isProjectSynced === 'function' && isProjectSynced(project);
                const googleDay = (isSynced && typeof getProjectCurrentGoogleDay === 'function')
                    ? getProjectCurrentGoogleDay(project, platformDay) : 0;
                const body = document.getElementById('protection-center-body');
                if (body) {
                    if (isSynced && typeof window._renderProtectionCenterState2 === 'function') {
                        body.innerHTML = window._renderProtectionCenterState2(project, platformDay, googleDay);
                    } else if (!isSynced && typeof window._renderProtectionCenterState1 === 'function') {
                        body.innerHTML = window._renderProtectionCenterState1(project, platformDay);
                        if (typeof window._ppcUpdateCalculations === 'function') window._ppcUpdateCalculations();
                    }
                }
            }
        }
    }
}

function refreshActiveTabData() {
    const activeTab = document.querySelector('.tab-content.active');
    const activeTabId = activeTab ? activeTab.id : '';

    if (activeTabId === 'tab-tests') {
        loadTasks().catch(error => console.error('Language refresh tasks error:', error));
        loadEvents().catch(error => console.error('Language refresh events error:', error));
        loadReliabilitySummary(true).catch(error => console.error('Language refresh reliability summary error:', error));
        loadReliabilityBreakdown(true).catch(error => console.error('Language refresh reliability breakdown error:', error));
        return;
    }

    if (activeTabId === 'tab-projects') {
        loadProjects(true).catch(error => console.error('Language refresh projects error:', error));
        loadArchivedProjects().catch(error => console.error('Language refresh archive error:', error));
        return;
    }

    if (activeTabId === 'tab-market') {
        loadMutualFeed().catch(error => console.error('Language refresh mutual error:', error));
        loadBountyFeed().catch(error => console.error('Language refresh bounty error:', error));
        return;
    }
}

function toggleLanguage() {
    applyLanguage(lang === 'ru' ? 'en' : 'ru');
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function recomputeLocalTestState(test) {
    if (!test) return test;
    var today = getLocalDate();
    var nextStatus = 'new';
    if (test.last_check_date === today) {
        nextStatus = 'done';
    } else if (test.last_check_date && test.last_check_date < today) {
        nextStatus = 'daily';
    } else if (test.last_check_date === null) {
        nextStatus = 'new';
    }

    var progressStatus = String(test.progress_status || 'active').toLowerCase();
    var appStatus = String(test.app_status || 'active').toLowerCase();
    var isExternal = !!test.is_external;
    var isPendingCompletion = !isExternal && appStatus === 'pending_completion';
    var isArchivedOrCompleted = !isExternal && ((appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active');
    if (test.status === 'opened' && nextStatus !== 'done' && !isArchivedOrCompleted && !isPendingCompletion) {
        nextStatus = 'opened';
    }

    var isTestedToday = nextStatus === 'done';
    var testingDays = Number(test.testing_days || 0);
    var skipsCount = countGrantSkips(test);
    var canEverClaim = !isExternal && !test.grant_claimed && skipsCount <= 3 && test.progress_id;

    var isAppClosed = !isExternal && (appStatus !== 'active' && !isPendingCompletion);
    var isTestClosed = !isExternal && (progressStatus !== 'active');
    var actualCheckins = testingDays - skipsCount;

    test.isGrantAvailableTomorrow = !!(canEverClaim && !isArchivedOrCompleted && !isPendingCompletion && testingDays === 14 && isTestedToday);
    test.isReadyToClaim = !!(canEverClaim && (testingDays >= 15 || (isArchivedOrCompleted && testingDays >= 14)));
    test.isEarlyFinish = !!((isAppClosed || isTestClosed) && !test.grant_claimed && !test.isReadyToClaim && !test.isGrantAvailableTomorrow && testingDays < 14 && actualCheckins >= 3 && skipsCount <= 3);
    test.is_pending_completion = isPendingCompletion;
    test.external_control_day_due = !!(isExternal && isMandatoryScreenshotDay(testingDays));

    if (isArchivedOrCompleted && !test.isReadyToClaim && !test.isGrantAvailableTomorrow) {
        nextStatus = 'done';
    }

    test.status = nextStatus;
    return test;
}

function getMyTestById(appId) {
    return (myTests || []).find(function(item) {
        return Number(item.id) === Number(appId);
    }) || null;
}

function canPromptPlayReview(test) {
    if (!test) return false;
    var reviewStatus = getPlayReviewStatus(test);
    return canTogglePlayReview(test)
        && !test.play_feedback_submitted
        && reviewStatus !== 'pending'
        && reviewStatus !== 'approved'
        && Number(test.testing_days || 0) >= 7
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function canTogglePlayReview(test) {
    if (!test) return false;
    return !!test.request_reviews
        && String(test.app_status || 'active').toLowerCase() === 'active'
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function getPlayReviewStatus(testOrAppId) {
    var test = typeof testOrAppId === 'object'
        ? testOrAppId
        : getMyTestById(testOrAppId);
    if (!test) return 'none';
    var status = String(test.play_review_status || '').trim().toLowerCase();
    if (status === 'pending' || status === 'approved') return status;
    if (status === 'rejected' || status === 'declined' || (test.rewards_summary && test.rewards_summary.review_rejected)) return 'rejected';
    if (test.play_feedback_submitted) return 'pending';
    return 'none';
}

function isPlayReviewMarked(testOrAppId) {
    var test = typeof testOrAppId === 'object'
        ? testOrAppId
        : getMyTestById(testOrAppId);
    var status = getPlayReviewStatus(test);
    return status === 'pending' || status === 'approved';
}

function getPlayReviewUrl(appId) {
    var test = getMyTestById(appId);
    var pkg = String(test && test.package || '').trim();
    if (!pkg) return '';
    return 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(pkg);
}

async function confirmPlayReviewMarking() {
    return new Promise(function(resolve) {
        var modal = document.getElementById('play-review-confirm-modal');
        var title = document.getElementById('t-playReviewConfirmTitle');
        var text = document.getElementById('t-playReviewConfirmText');
        var cancelBtn = document.getElementById('t-playReviewConfirmCancel');
        var sendBtn = document.getElementById('t-playReviewConfirmSend');

        if (!modal || !title || !text || !cancelBtn || !sendBtn) {
            var message = window.t('playReviewConfirmPenalty', {}, lang);
            if (tg && typeof tg.showConfirm === 'function') {
                tg.showConfirm(message, function(ok) { resolve(!!ok); });
                return;
            }
            resolve(confirm(message));
            return;
        }

        title.innerText = window.t('playReviewConfirmModalTitle', {}, lang);
        text.innerText = window.t('playReviewConfirmPenalty', {}, lang);
        cancelBtn.innerText = window.t('playReviewConfirmModalCancel', {}, lang);
        sendBtn.innerText = window.t('playReviewConfirmModalSendDm', {}, lang);

        function cleanup() {
            modal.classList.remove('active');
            modal.onclick = null;
            cancelBtn.onclick = null;
            sendBtn.onclick = null;
        }

        modal.onclick = function(event) {
            if (event && event.target !== modal) return;
            cleanup();
            resolve(false);
        };
        cancelBtn.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            cleanup();
            resolve(false);
        };
        sendBtn.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            cleanup();
            resolve(true);
        };

        modal.classList.add('active');
    });
}

function openPlayReviewOwnerDm(appId) {
    var test = getMyTestById(appId);
    if (!test) return false;
    var ownerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    if (!ownerUsername) {
        if (tg && typeof tg.showAlert === 'function') {
            tg.showAlert(window.t('playReviewMissingOwnerLink', {}, lang));
        } else {
            alert(window.t('playReviewMissingOwnerLink', {}, lang));
        }
        return false;
    }
    var message = window.t('playReviewDmTemplate', {
        app_name: String(test.name || window.t('unknownLabel', {}, lang)),
    }, lang);
    var dmUrl = `https://t.me/${ownerUsername}?text=${encodeURIComponent(message)}`;
    try {
        if (tg && typeof tg.openTelegramLink === 'function') {
            tg.openTelegramLink(dmUrl);
        } else if (tg && typeof tg.openLink === 'function') {
            tg.openLink(dmUrl);
        } else {
            window.open(dmUrl, '_blank', 'noopener');
        }
        return true;
    } catch (error) {
        console.error('openPlayReviewOwnerDm error:', error);
        return false;
    }
}

async function setPlayReviewSubmittedPending(appId, nextValue) {
    var test = getMyTestById(appId);
    if (!test) return false;

    var normalized = !!nextValue;
    if (normalized && !canTogglePlayReview(test)) {
        return false;
    }

    if (normalized && !isPlayReviewMarked(test)) {
        var confirmed = await confirmPlayReviewMarking();
        if (!confirmed) {
            refreshOpenModals();
            return false;
        }
        if (!openPlayReviewOwnerDm(appId)) {
            refreshOpenModals();
            return false;
        }
    }

    test.play_feedback_submitted_pending = normalized || !!test.play_feedback_submitted;
    if (test.rewards_summary && normalized) {
        test.rewards_summary.review_rejected = false;
    }
    persistTestsCacheSnapshot();
    if (typeof window.renderTests === 'function') {
        window.renderTests(true);
    }
    refreshOpenModals();
    return true;
}

function _setIssueUiState(id, blocked) {
    var btnConfirm = document.getElementById('btn-confirm-' + id);
    if (!btnConfirm) return;
    if (blocked) {
        var test = myTests.find(function(item) { return Number(item.id) === Number(id); });
        btnConfirm.disabled = true;
        btnConfirm.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
            ? window.getIssueAwaitingFixLabel(test)
            : window.t('issueAwaitingFix', {}, lang);
        btnConfirm.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        btnConfirm.style.color = 'var(--hint-color)';
    }
}

function _onStoreLinkClickedForIssueFlow(id) {
    var test = myTests.find(function(item) { return Number(item.id) === Number(id); });
    if (!test) return;
    test.has_clicked_store = true;

    var issueWrap = document.getElementById('access-problem-wrap-' + id);
    if (issueWrap) {
        issueWrap.style.display = 'block';
    }
    var issueBtn = document.getElementById('btn-issue-' + id);
    if (issueBtn) {
        issueBtn.style.display = 'inline-flex';
        issueBtn.disabled = !!test.issue_reported_at && !test.issue_fixed_at;
        issueBtn.style.opacity = issueBtn.disabled ? '0.55' : '1';
    }
    var freezeBtn = document.getElementById('access-problem-freeze-' + id);
    if (freezeBtn) {
            freezeBtn.disabled = !!test.issue_reported_at && !test.issue_fixed_at;
            freezeBtn.style.opacity = freezeBtn.disabled ? '0.55' : '1';
            if (freezeBtn.disabled) {
                _setAccessProblemStepLabel(
                    freezeBtn,
                    typeof window.getIssueAwaitingFixLabel === 'function'
                        ? window.getIssueAwaitingFixLabel(test)
                        : window.t('issueAwaitingFix', {}, lang)
                );
        }
    }

    persistTestsCacheSnapshot();
}

async function decideOffer(offerId, action, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!offerId) return;

    try {
        const response = await fetch(`${API_BASE}/offers/${offerId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ user_id: userId }))
        });
        const result = await response.json();
        if (result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await Promise.all([loadTasks(), loadIncomingOffers({ background: true })]);
        loadProjects(true).catch(() => {});
    } catch (error) {
        console.error('Offer decision error:', error);
        handleApiError('network_error');
    }
}

function markMutualOfferPendingUi(targetAppId, targetOwnerId, sourceButton) {
    if (sourceButton && sourceButton.classList) {
        sourceButton.textContent = window.t('offerPending');
        sourceButton.classList.add('pending');
        sourceButton.classList.add('disabled');
        sourceButton.disabled = true;
    }

    const selector = 'button[data-offer-target-app="' + targetAppId + '"][data-offer-target-owner="' + targetOwnerId + '"]';
    const relatedButtons = document.querySelectorAll(selector);
    relatedButtons.forEach(function(button) {
        button.textContent = window.t('offerPending');
        button.classList.add('pending');
        button.classList.add('disabled');
        button.disabled = true;
    });
}

async function createMutualOffer(targetAppId, targetOwnerId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }
    var sourceButton = event && event.currentTarget ? event.currentTarget : null;
    if (myProjectsLoadError) {
        if (tg.showAlert) tg.showAlert(window.t('projectsLoadingAlert'));
        else alert(window.t('projectsLoadingAlert'));
        loadProjects(true).catch(function() {});
        return;
    }

    // Interceptor (Task 1): the target uses Email-list testing and the current user has no email yet.
    var target = (typeof window.getMarketCandidateByAppId === 'function') ? window.getMarketCandidateByAppId(targetAppId) : null;
    var targetIsEmailList = !!(target && target.test_mode === 'email_list');
    var currentEmail = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : String((window.App && window.App.userEmail) || '').trim();
    if (targetIsEmailList && !currentEmail && typeof window.openEmailCollectModal === 'function') {
        window.openEmailCollectModal({
            title: window.t('emailGateOfferTitle', {}, lang),
            text: window.t('emailGateOfferText', {}, lang),
            primaryLabel: window.t('emailGateSaveContinue', {}, lang),
            onSave: function() { _continueMutualOffer(targetAppId, targetOwnerId, sourceButton); },
        });
        return;
    }

    await _continueMutualOffer(targetAppId, targetOwnerId, sourceButton);
}

async function openPrelaunchJoinModal(targetAppId, targetOwnerId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }

    var target = (typeof window.getMarketCandidateByAppId === 'function') ? window.getMarketCandidateByAppId(targetAppId) : null;
    var targetIsEmailList = !!(target && target.test_mode === 'email_list');
    var currentEmail = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : String((window.App && window.App.userEmail) || '').trim();
    if (targetIsEmailList && !currentEmail && typeof window.openEmailCollectModal === 'function') {
        window.openEmailCollectModal({
            title: window.t('emailGateOfferTitle', {}, lang),
            text: window.t('emailGateOfferText', {}, lang),
            primaryLabel: window.t('emailGateSaveContinue', {}, lang),
            onSave: function() { openPrelaunchJoinModal(targetAppId, targetOwnerId); },
        });
        return;
    }

    if (typeof window.showProjectSelectModal === 'function') {
        window.showProjectSelectModal([], targetAppId, targetOwnerId, {
            is_prelaunch: true,
            targetAppName: target && target.name ? String(target.name) : '',
            targetOwnerHasEmail: !!(target && target.owner_has_email),
        });
    }
}

async function _continueMutualOffer(targetAppId, targetOwnerId, sourceButton) {
    if (myProjectsLoadError) {
        if (tg.showAlert) tg.showAlert(window.t('projectsLoadingAlert'));
        loadProjects(true).catch(function() {});
        return;
    }
    const projectChoices = typeof window.getMutualOfferProjectChoicesForOwner === 'function'
        ? window.getMutualOfferProjectChoicesForOwner(targetOwnerId)
        : (typeof window.getAvailableMutualProjectsForOwner === 'function'
            ? window.getAvailableMutualProjectsForOwner(targetOwnerId)
            : myProjects.filter(function(project) {
                return project && (project.mode === 'mutual' || project.mode === 'hybrid') && project.id;
            }));
    const blockedProjects = await fetchBlockedOfferProjects(targetOwnerId, true);
    var target = (typeof window.getMarketCandidateByAppId === 'function') ? window.getMarketCandidateByAppId(targetAppId) : null;
    var targetOwnerHasEmail = !!(target && target.owner_has_email);
    showProjectSelectModal(projectChoices, targetAppId, targetOwnerId, {
        sourceButton: sourceButton,
        targetAppId: targetAppId,
        targetOwnerId: targetOwnerId,
        targetAppName: target && target.name ? String(target.name) : '',
        blockedProjects: blockedProjects,
        targetOwnerHasEmail: targetOwnerHasEmail,
    });
}

async function sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, uiContext) {
    var actionKey = 'sendOffer_' + targetAppId + '_' + proposerAppId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                owner_id: targetOwnerId,
                target_app_id: targetAppId,
                proposer_id: userId,
                proposer_app_id: proposerAppId
            })),
            timeoutMs: 20000,
        });

        let result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok) {
            const code = getBackendErrorCode(result) || 'err_default_api';
            const details = result && result.details ? result.details : {};
            handleApiError(code, details);
            return;
        }

        if (!result || result.status !== 'success') {
            const code = getBackendErrorCode(result) || 'err_default_api';
            const details = result && result.details ? result.details : {};
            handleApiError(code, details);
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (result.mode === 'auto_accepted') {
            closeProjectSelectModal();
            showToast(window.t('offerStartedInstantly', {}, lang));
            if (typeof applyOptimisticMyTestJoin === 'function') {
                applyOptimisticMyTestJoin(targetAppId, { join_type: 'mutual' });
            }
            switchTab('tests');
            await Promise.allSettled([
                typeof refreshMyTestsNow === 'function' ? refreshMyTestsNow() : loadTasks(false),
                loadProjects(true),
                loadIncomingOffers({ background: true })
            ]);
            return;
        }
        if (uiContext && uiContext.targetOwnerId) {
            var ownerKey = String(uiContext.targetOwnerId);
            var ownerLocks = _blockedOfferProjectsByOwner[ownerKey] || {};
            ownerLocks[String(proposerAppId)] = {
                proposer_app_id: proposerAppId,
                target_app_id: targetAppId,
                target_app_name: '',
                created_at: new Date().toISOString(),
            };
            _blockedOfferProjectsByOwner[ownerKey] = ownerLocks;
        }
        markMutualOfferPendingUi(targetAppId, targetOwnerId, uiContext && uiContext.sourceButton);
        showToast(window.t('offerSentSuccess'));
        closeProjectSelectModal();
    } catch (error) {
        console.error('Create offer error:', error);
        handleApiError('network_error');
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

function _getCheckinOpenToken(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return '';
    var readyPayload = _timerReadyState[key];
    if (readyPayload && String(readyPayload.localDate || '') === getLocalDate() && readyPayload.openToken) {
        return String(readyPayload.openToken || '');
    }
    var live = _checkinOpenTokenState[key];
    if (live && String(live.localDate || '') === getLocalDate() && live.token) {
        return String(live.token || '');
    }
    return '';
}

async function _requestCheckinOpenToken(appId) {
    var test = (Array.isArray(myTests) ? myTests : []).find(function(item) {
        return Number(item && item.id) === Number(appId);
    });
    var response = await fetch(API_BASE + '/checkin/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withInitData({
            app_id: Number(appId) || 0,
            progress_id: Number(test && test.progress_id || 0) || 0,
        })),
    });
    var result = null;
    try {
        result = await response.json();
    } catch (e) {
        result = null;
    }
    if (!response.ok || !result || result.status !== 'success') {
        var code = getBackendErrorCode(result) || 'database_error';
        handleApiError(code, (result && result.details) || {});
        return null;
    }
    var key = String(Number(appId) || 0);
    if (result.required === false) {
        if (_checkinOpenTokenState) delete _checkinOpenTokenState[key];
        return result;
    }
    _checkinOpenTokenState[key] = {
        token: String(result.token || ''),
        readyAtMs: Number(result.ready_at_ms || 0) || 0,
        expiresAtMs: Number(result.expires_at_ms || 0) || 0,
        progressId: Number(result.progress_id || 0) || 0,
        localDate: getLocalDate(),
        serverNowMs: Number(result.server_now_ms || 0) || Date.now(),
    };
    return result;
}

function startTimer(id, pkg, isScreenshotDay = false, ownerUsername = '', durationSeconds = 15) {
    _startTimerAsync(id, pkg, isScreenshotDay, ownerUsername, durationSeconds).catch(function(err) {
        console.error('startTimer failed:', err);
        handleApiError('network_error');
    });
}

async function _startTimerAsync(id, pkg, isScreenshotDay = false, ownerUsername = '', durationSeconds = 15) {
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(id, ownerUsername);
    var resolvedDurationSeconds = Number(durationSeconds || 15);
    if (!Number.isFinite(resolvedDurationSeconds) || resolvedDurationSeconds < 1) {
        resolvedDurationSeconds = 15;
    }
    // Clean up stale timer (tab suspension / cache restoration scenario)
    if (activeTimerAppId !== null && _timerLocalDate && _timerLocalDate !== getLocalDate()) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
    } else if (activeTimerAppId !== null && _timerEndTimestamp && Date.now() > _timerEndTimestamp + 2000) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
    }

    if (activeTimerAppId === id) {
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        _onStoreLinkClickedForIssueFlow(id);
        return;
    }

    var readyPayload = _getTimerReadyPayload(id);
    if (readyPayload) {
        _setTimerButtonReady(id, readyPayload.isScreenshot, readyPayload.ownerUsername || resolvedOwnerUsername);
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        _onStoreLinkClickedForIssueFlow(id);
        return;
    }

    if (activeTimerAppId !== null && activeTimerAppId !== id) {
        showCustomAlert(t.antiFraudAlert);
        return;
    }

    var openPayload = await _requestCheckinOpenToken(id);
    if (!openPayload) {
        return;
    }
    if (openPayload.required === false) {
        // Day 15+ should not use Open timer, but if we got here — unlock Confirm.
        setTimerReadyForConfirm(id, true, isScreenshotDay, resolvedOwnerUsername);
        _setTimerButtonReady(id, !!isScreenshotDay, resolvedOwnerUsername);
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        _onStoreLinkClickedForIssueFlow(id);
        return;
    }

    var serverWaitMs = Math.max(
        1000,
        Number(openPayload.ready_at_ms || 0) - Number(openPayload.server_now_ms || Date.now())
    );
    resolvedDurationSeconds = Math.max(1, Math.ceil(serverWaitMs / 1000));

    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);

    const btn = document.getElementById(`btn-confirm-${id}`);
    if (!btn || !btn.disabled) return;

    activeTimerAppId = id;
    _timerEndTimestamp = Date.now() + (resolvedDurationSeconds * 1000);
    _timerIsScreenshot = isScreenshotDay;
    _timerOwnerUsername = resolvedOwnerUsername;
    _timerLocalDate = getLocalDate();
    _persistActiveTimer();
    btn.innerText = t.timerRemaining.replace('{sec}', resolvedDurationSeconds);
    // Normal days: show green active 📎 immediately while confirm stays on the countdown.
    if (!isScreenshotDay) {
        _ensureEarlyPaperclipSplit(id, resolvedOwnerUsername);
    }
    _startActiveTimerInterval(id);
}

function _restoreActiveTimer() {
    _applyPersistedReadyTimerButtons();
    if (!activeTimerAppId || !_timerEndTimestamp) return;
    if (_syncActiveTimerState()) return;
    var remaining = Math.ceil((_timerEndTimestamp - Date.now()) / 1000);
    var btn = document.getElementById('btn-confirm-' + activeTimerAppId);
    if (!btn) return;
    if (remaining <= 0) {
        _syncActiveTimerState();
    } else {
        btn.innerText = window.t('timerRemaining', {}, lang).replace('{sec}', remaining);
        if (!_timerIsScreenshot) {
            _ensureEarlyPaperclipSplit(activeTimerAppId, _timerOwnerUsername || '');
        }
        _persistActiveTimer();
        _startActiveTimerInterval(activeTimerAppId);
    }
}
window._restoreActiveTimer = _restoreActiveTimer;
window.isCheckinTimerActiveForApp = isCheckinTimerActiveForApp;
window.getCheckinTimerRemainingSeconds = getCheckinTimerRemainingSeconds;

function openPlay(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);
    const test = myTests.find(item => item.id === id);
    if (test) {
        test.status = 'opened';
        renderTests();
    }
}

function advanceFirstDayStepsAfterDownload(id) {
    const flow = document.getElementById(`tstep-flow-${id}`);
    if (!flow) return;
    const downloadStep = flow.querySelector('[data-step-key="download"]');
    if (downloadStep) {
        downloadStep.classList.remove('is-current', 'is-next');
        downloadStep.classList.add('is-done');
    }
    const screenshotStep = flow.querySelector('[data-step-key="screenshot"]');
    if (screenshotStep) {
        screenshotStep.classList.remove('is-locked', 'is-next');
        screenshotStep.classList.add('is-current');
    }
    const confirmBtn = document.getElementById(`btn-confirm-${id}`);
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.removeAttribute('aria-disabled');
    }
}

function handleFirstDownload(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    setFirstDayScreenshotVisible(id, true);
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);
    setTimeout(() => {
        advanceFirstDayStepsAfterDownload(id);
    }, 600);
}

async function handleScreenshotAndConfirm(id, ownerUsername) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (typeof openReportModal === 'function') {
        openReportModal(id, ownerUsername);
        return;
    }
    if (window.openReportModal) {
        window.openReportModal(id, ownerUsername);
    }
}

async function submitIssueReport(appId) {
    if (!appId) return;
    var test = myTests.find(function(item) { return Number(item.id) === Number(appId); });
    if (!test) return;

    var reasonEl = document.getElementById('issue-report-text');
    var emailEl = document.getElementById('issue-report-email');
    var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
    var email = emailEl ? String(emailEl.value || '').trim() : '';

    if (typeof isIssueReportChecklistComplete === 'function' && !isIssueReportChecklistComplete()) {
        showToast(window.t('reportIssueChecklistIncomplete', {}, lang));
        return;
    }

    if (!email) {
        showToast(window.t('reportIssueEmailRequired', {}, lang));
        if (emailEl && typeof emailEl.focus === 'function') {
            emailEl.focus();
        }
        return;
    }

    if (!isValidEmail(email)) {
        showToast(window.t('reportIssueInvalidEmail', {}, lang));
        if (emailEl && typeof emailEl.focus === 'function') {
            emailEl.focus();
        }
        return;
    }

    try {
        var response = await fetch(`${API_BASE}/projects/${appId}/report_issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId, issue_reason: reason, email: email, account_match_confirmed: true }))
        });
        var result = await response.json();
        if (!response.ok || !result || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }

        test.issue_reported_at = result.issue_reported_at || new Date().toISOString();
        test.issue_reason = reason;
        test.issue_fixed_at = null;
        _userEmail = String(result.email || email || _userEmail || '').trim();
        window.App.userEmail = _userEmail;
        _setIssueUiState(appId, true);

        var issueBtn = document.getElementById('btn-issue-' + appId);
        if (issueBtn) {
            issueBtn.disabled = true;
            issueBtn.style.opacity = '0.55';
            issueBtn.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
                ? window.getIssueAwaitingFixLabel(test)
                : window.t('issueAwaitingFix', {}, lang);
        }
        var freezeBtn = document.getElementById('access-problem-freeze-' + appId);
        if (freezeBtn) {
            freezeBtn.disabled = true;
            freezeBtn.style.opacity = '0.55';
            _setAccessProblemStepLabel(
                freezeBtn,
                typeof window.getIssueAwaitingFixLabel === 'function'
                    ? window.getIssueAwaitingFixLabel(test)
                    : window.t('issueAwaitingFix', {}, lang)
            );
        }

        persistTestsCacheSnapshot();
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }
        if (window.closeIssueReportModal) window.closeIssueReportModal();
        showToast(window.t('reportIssueSuccess', {}, lang));
    } catch (error) {
        console.error('Report issue error:', error);
        handleApiError('network_error');
    }
}

async function sendReport() {
    const text = document.getElementById('report-text').value.trim();
    const ownerUsername = (_reportOwnerUsername || '').replace('@', '').trim();
    const appId = _reportAppId;

    _reportAppId = null;
    _reportOwnerUsername = null;
    document.getElementById('report-modal').classList.remove('active');

    if (appId) {
        confirmStart(appId, { proofKind: 'checkpoint_screenshot' });
    }
    if (ownerUsername) {
        openOwnerCheckpointChat(ownerUsername, text);
    }
}

function renderEarnBustDynamic() {
    const referralCountChip = document.getElementById('earn-referrals-count');
    const referralCount = Number(referralCountChip && referralCountChip.dataset ? referralCountChip.dataset.count || 0 : 0);
    if (referralCountChip) {
        referralCountChip.innerText = `👥 ${window.t('earnReferralCountChip', { count: referralCount }, lang)}`;
    }
    document.getElementById('earn-referral-bust').innerText = `💎 ${formatBustAmount(_earnReferralBust)}`;
    document.getElementById('earn-grant-status').innerHTML = `
        <span class="meta-chip accent-green">🏆 ${window.t('earnGrantTestsLabel', {}, lang)}: ${_earnGrantCount}</span>
        <span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnGrantBust)}</span>
    `;
    document.getElementById('earn-early-finish-status').innerHTML = `
        <span class="meta-chip accent-green">⚡ ${window.escapeHTML(window.t('earnEarlyFinishCountChip', { count: _earnEarlyFinishCount }, lang))}</span>
        <span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnEarlyFinishBust)}</span>
    `;
    document.getElementById('earn-feedback-status').innerHTML = `
        <span class="meta-chip accent-green">🐞 ${window.t('earnFeedbackCountChip', { count: _earnFeedbackCount }, lang)}</span>
        <span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnFeedbackBust)}</span>
    `;
    var playReviewStatus = document.getElementById('earn-play-review-status');
    if (playReviewStatus) {
        playReviewStatus.innerHTML = `
            <span class="meta-chip accent-green">⭐ ${window.escapeHTML(window.t('earnPlayReviewCountChip', { count: _earnPlayReviewCount }, lang))}</span>
            <span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnPlayReviewBust)}</span>
        `;
    }
    document.getElementById('earn-exchange-status').innerHTML = `<span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnExchangeBust)}</span>`;
    document.getElementById('earn-retention-status').innerHTML = `<span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnRetentionBust)}</span>`;
    const sprintJoinedEl = document.getElementById('earn-sprint-joined');
    const sprintBustEl = document.getElementById('earn-sprint-bust');
    if (sprintJoinedEl) {
        sprintJoinedEl.innerText = `🏁 ${window.t('earnSprintJoinedChip', { count: Number(_earnSprintJoined || 0) }, lang)}`;
    }
    if (sprintBustEl) {
        sprintBustEl.innerText = `💎 ${window.t('earnSprintBustChip', { amount: formatBustAmount(_earnSprintBust) }, lang)}`;
    }
    const socialStatus = document.getElementById('earn-social-status');
    if (_socialBonusStatus === 'approved') {
        socialStatus.innerHTML = `<span class="meta-chip accent-green">✅ ${t.earnSocialApproved}</span>`;
    } else if (_socialBonusStatus === 'pending') {
        socialStatus.innerHTML = `<button class="btn btn-secondary" style="width:100%; opacity:0.6;" disabled>⏳ ${t.earnSocialPending}</button>`;
    } else {
        socialStatus.innerHTML = `<button class="btn btn-primary" style="width:100%;" onclick="openSocialModal()">🎁 ${t.earnSocialBtn}</button>`;
    }
    const deviceProfileStatus = document.getElementById('earn-device-profile-status');
    if (deviceProfileStatus) {
        if (_deviceProfileRewardClaimed || Number(_deviceProfileBustEarned || 0) > 0) {
            deviceProfileStatus.innerHTML = `<span class="meta-chip accent-green">✅ ${window.escapeHTML(window.t('earnDeviceProfileClaimedChip', { amount: 30 }, lang))}</span>`;
        } else {
            deviceProfileStatus.innerHTML = `
                <button type="button" class="btn btn-primary" style="width:100%; margin-bottom:8px;" onclick="openDeviceProfileFromPrompt()"> ${window.escapeHTML(window.t('deviceProfilePrepareBtn', {}, lang))}</button>
                <div style="font-size:13px; color:var(--hint-color); text-align:center;">${window.escapeHTML(window.t('earnDeviceProfileRewardHint', { amount: 30 }, lang))}</div>
            `;
        }
    }
}

async function openEarnBustModal() {
    document.getElementById('earn-bust-modal').classList.add('active');
    try {
        const initQ = 'init_data=' + encodeURIComponent(getTelegramInitDataRaw());
        const response = await fetch(`${API_BASE}/referral-stats/${userId}?${initQ}`);
        if (!response.ok) return;
        const data = await response.json();
        const referralsCount = Number(data.referrals_count || 0);
        document.getElementById('earn-referrals-count').dataset.count = String(referralsCount);
        document.getElementById('earn-referrals-count').innerText = `👥 ${window.t('earnReferralCountChip', { count: referralsCount }, lang)}`;
        _earnGrantCount = data.grant_tests_count || 0;
        _earnGrantBust = Number(data.grant_bust_earned || 0);
        _earnReferralBust = Number(data.referral_bust_earned || 0);
        _earnExchangeBust = Number(data.exchange_bust_earned || 0);
        _earnRetentionBust = Number(data.retention_bust_earned || 0);
        _earnEarlyFinishCount = Number(data.early_finish_count || 0);
        _earnEarlyFinishBust = Number(data.early_finish_bust_earned || 0);
        _earnFeedbackCount = Number(data.feedback_sent_count || 0);
        _earnFeedbackBust = Number(data.feedback_bust_earned || 0);
        _earnPlayReviewCount = Number(data.play_review_count || 0);
        _earnPlayReviewBust = Number(data.play_review_bust_earned || 0);
        _socialBonusStatus = data.social_bonus_status || 'none';
        _deviceProfileRewardClaimed = !!data.device_profile_reward_claimed;
        _deviceProfileBustEarned = Number(data.device_profile_bust_earned || 0);
        if (typeof syncDeviceProfileUi === 'function') {
            syncDeviceProfileUi();
        }
        renderEarnBustDynamic();
    } catch (error) {
        console.error('Failed to load referral stats:', error);
    }

    // Sprint chips: reuse history endpoint (no backend changes).
    try {
        if (typeof fetchContributionHistory === 'function') {
            const history = await fetchContributionHistory();
            if (history && history.status === 'success') {
                const seasons = Array.isArray(history.seasons) ? history.seasons : [];
                let joined = 0;
                let bustEarned = 0;
                seasons.forEach(function(season) {
                    const score = Number(season && season.contribution_score || 0);
                    const prize = Number(season && season.prize_amount || 0);
                    if (score > 0 || prize > 0 || (season && season.final_rank != null)) {
                        joined += 1;
                    }
                    if (prize > 0) bustEarned += prize;
                });
                _earnSprintJoined = joined;
                _earnSprintBust = bustEarned;
                renderEarnBustDynamic();
            }
        }
    } catch (sprintErr) {
        console.error('Failed to load sprint earn stats:', sprintErr);
    }
}

function hasPendingFeedbackCheckins() {
    return Object.keys(_pendingFeedbackCheckinAppIds || {}).length > 0;
}

function isTestFeedbackCheckinPending(appId) {
    return !!(_pendingFeedbackCheckinAppIds && _pendingFeedbackCheckinAppIds[Number(appId || 0)]);
}

function markTestFeedbackCheckinPending(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;
    _pendingFeedbackCheckinAppIds[normalizedId] = Date.now();
    try {
        localStorage.setItem('pending_feedback_checkins_v1', JSON.stringify(_pendingFeedbackCheckinAppIds));
    } catch (e) {}
    // Stop the visible countdown, but KEEP open_token / Confirm-ready state.
    // If bot auto-checkin fails or wait-state is lost, the tester must not be forced
    // through Open → timer again with no explanation.
    clearActiveTimerForApp(normalizedId);
    applyTestFeedbackCheckinPendingUi(normalizedId);
}

function restoreCheckinReadyAfterFeedbackPending(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return false;
    var card = document.getElementById('test-card-' + normalizedId);
    if (card) {
        card.classList.remove('card-feedback-pending');
        var splitBtn = card.querySelector('.split-btn-options');
        if (splitBtn) {
            splitBtn.disabled = false;
            splitBtn.style.pointerEvents = '';
            splitBtn.style.opacity = '';
        }
    }
    var payload = typeof _getTimerReadyPayload === 'function' ? _getTimerReadyPayload(normalizedId) : null;
    var hasOpenToken = !!(typeof _getCheckinOpenToken === 'function' && _getCheckinOpenToken(normalizedId));
    if (payload || hasOpenToken) {
        var isScreenshot = !!(payload && payload.isScreenshot);
        var ownerUsername = (payload && payload.ownerUsername) || '';
        if (typeof _setTimerButtonReady === 'function') {
            _setTimerButtonReady(normalizedId, isScreenshot, ownerUsername);
        } else if (typeof setTimerReadyForConfirm === 'function') {
            setTimerReadyForConfirm(normalizedId, true, isScreenshot, ownerUsername);
        }
        return true;
    }
    return false;
}
window.restoreCheckinReadyAfterFeedbackPending = restoreCheckinReadyAfterFeedbackPending;

function clearTestFeedbackCheckinPending(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;
    delete _pendingFeedbackCheckinAppIds[normalizedId];
    try {
        localStorage.setItem('pending_feedback_checkins_v1', JSON.stringify(_pendingFeedbackCheckinAppIds));
    } catch (e) {}
    var confirmBtn = document.getElementById('btn-confirm-' + normalizedId);
    if (confirmBtn) {
        confirmBtn.removeAttribute('data-feedback-pending');
    }
}

function getFeedbackCheckinPendingLabel() {
    return window.t('feedbackCheckinPendingBtn', {}, lang);
}

function applyTestFeedbackCheckinPendingUi(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0 || !isTestFeedbackCheckinPending(normalizedId)) return;

    var card = document.getElementById('test-card-' + normalizedId);
    if (card) {
        card.classList.add('card-feedback-pending');
    }

    var pendingLabel = getFeedbackCheckinPendingLabel();
    var confirmBtn = document.getElementById('btn-confirm-' + normalizedId)
        || (card ? card.querySelector('#btn-confirm-' + normalizedId) : null)
        || (card ? card.querySelector('.split-btn-main') : null);
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.setAttribute('data-feedback-pending', '1');
        confirmBtn.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        confirmBtn.style.color = 'var(--hint-color)';
        confirmBtn.style.cursor = 'not-allowed';
        confirmBtn.classList.remove('btn-success', 'external-tests-confirm-ready');
        _setConfirmButtonLabel(confirmBtn, pendingLabel);
        confirmBtn.onclick = null;
        confirmBtn.removeAttribute('onclick');
    }

    if (!card) return;
    var splitBtn = card.querySelector('.split-btn-options');
    if (splitBtn) {
        splitBtn.disabled = true;
        splitBtn.style.pointerEvents = 'none';
        splitBtn.style.opacity = '0.55';
    }
}

function reapplyAllFeedbackCheckinPendingUi() {
    Object.keys(_pendingFeedbackCheckinAppIds || {}).forEach(function(key) {
        applyTestFeedbackCheckinPendingUi(Number(key));
    });
}

/**
 * Sync MiniApp "waiting for bot feedback" buttons with server wait-state.
 * Clears stuck pending UI after user cancels via bot inline Cancel (or wait TTL expires / server restart).
 */
async function syncPendingFeedbackCheckinsFromServer() {
    if (!hasPendingFeedbackCheckins()) {
        return false;
    }
    var apiBase = (typeof API_BASE !== 'undefined' && API_BASE) || (window.App && window.App.API_BASE) || '';
    if (!apiBase) {
        return false;
    }
    var initData = (typeof getTelegramInitDataRaw === 'function')
        ? getTelegramInitDataRaw()
        : ((typeof tg !== 'undefined' && tg && tg.initData) || '');
    if (!initData) {
        return false;
    }

    try {
        var response = await fetch(
            apiBase + '/feedback/waiting?init_data=' + encodeURIComponent(initData),
            { method: 'GET' }
        );
        if (!response.ok) {
            return false;
        }
        var data = await response.json();
        if (!data || data.status !== 'success') {
            return false;
        }

        var waitingAppId = data.waiting ? Number(data.app_id || 0) : 0;
        var clearedIds = [];
        var today = typeof getLocalDate === 'function' ? getLocalDate() : '';
        Object.keys(_pendingFeedbackCheckinAppIds || {}).forEach(function(key) {
            var appId = Number(key);
            if (appId > 0 && appId !== waitingAppId) {
                clearTestFeedbackCheckinPending(appId);
                clearedIds.push(appId);
            }
        });
        if (!clearedIds.length) {
            return false;
        }

        var restoredReady = false;
        var unfinishedCleared = false;
        clearedIds.forEach(function(appId) {
            var test = (myTests || []).find(function(item) {
                return Number(item.id) === appId;
            });
            var doneToday = !!(test && test.status === 'done' && String(test.last_check_date || '') === today);
            if (!doneToday) {
                unfinishedCleared = true;
                if (restoreCheckinReadyAfterFeedbackPending(appId)) {
                    restoredReady = true;
                }
            }
        });

        if (typeof renderTests === 'function') {
            renderTests(true);
        }
        if (typeof window.renderShowcaseActiveTests === 'function') {
            window.renderShowcaseActiveTests(true);
        }
        if (typeof _applyPersistedReadyTimerButtons === 'function') {
            _applyPersistedReadyTimerButtons();
        }
        if (unfinishedCleared) {
            showToast(window.t(
                restoredReady ? 'feedbackCheckinPendingRestoredToast' : 'feedbackCheckinPendingClearedToast',
                {},
                lang
            ));
        }
        return true;
    } catch (error) {
        console.warn('syncPendingFeedbackCheckinsFromServer failed:', error);
        return false;
    }
}
window.syncPendingFeedbackCheckinsFromServer = syncPendingFeedbackCheckinsFromServer;

function clearCompletedPendingFeedbackCheckins() {
    if (!hasPendingFeedbackCheckins()) return false;

    var today = getLocalDate();
    var completingIds = [];
    Object.keys(_pendingFeedbackCheckinAppIds).forEach(function(key) {
        var appId = Number(key);
        var test = (myTests || []).find(function(item) {
            return Number(item.id) === appId;
        });
        if (test && test.status === 'done' && String(test.last_check_date || '') === today) {
            completingIds.push(appId);
        }
    });
    if (!completingIds.length) return false;

    var hasVisibleCard = completingIds.some(function(appId) {
        return !!document.getElementById('test-card-' + appId);
    });

    completingIds.forEach(function(appId) {
        var card = document.getElementById('test-card-' + appId);
        if (card) card.classList.add('card-feedback-completing');
        clearTestFeedbackCheckinPending(appId);

        var test = (myTests || []).find(function(item) {
            return Number(item.id) === appId;
        });
        if (test) {
            var testingDay = Number(test.testing_days || 0);
            var isOvertime = testingDay >= 15;
            var earnedKarma = isOvertime ? 0.5 : 0.1;
            var earnedBust = typeof test.exact_daily_reward !== 'undefined' ? Number(test.exact_daily_reward) : (test.join_type === 'bounty' ? test.bounty_per_tester * 0.65 / 14 : 0);
            
            if (earnedBust > 0 && earnedKarma > 0) {
                showToast(window.t('checkinEarnBustAndKarma', {
                    bust: formatAmountValue(earnedBust, 1),
                    karma: formatAmountValue(earnedKarma, 1)
                }, lang));
            } else if (earnedBust > 0) {
                showToast(t.checkinEarnBust.replace('{amount}', formatAmountValue(earnedBust, 1)));
            } else if (earnedKarma > 0) {
                showToast(t.checkinEarnKarma.replace('{amount}', formatAmountValue(earnedKarma, 1)));
            } else {
                showToast(t.successCheckin);
            }
        }
    });

    var rerender = function() {
        if (typeof renderTests === 'function') renderTests(true);
        if (typeof window.renderShowcaseActiveTests === 'function') window.renderShowcaseActiveTests(true);
    };

    if (hasVisibleCard) {
        setTimeout(rerender, 300);
    } else {
        rerender();
    }
    return true;
}

async function initiateProjectFeedback(appId, options) {
    options = options || {};
    var feedbackType = String(options.feedbackType || 'bug').toLowerCase();
    if (feedbackType !== 'bug' && feedbackType !== 'idea') {
        feedbackType = 'bug';
    }
    var test = typeof getMyTestById === 'function' ? getMyTestById(appId) : null;
    var isEligibleForCheckin = test && (test.status === 'new' || test.status === 'daily' || test.status === 'opened');
    
    if (!options.checkinContext && isEligibleForCheckin) {
        var testingDay = typeof window.getUserTestingDay === 'function' ? window.getUserTestingDay(test.start_date) : null;
        var localDate = typeof getLocalDate === 'function' ? getLocalDate() : '';
        if (testingDay && localDate) {
            options.checkinContext = { day: Number(testingDay), local_date: localDate };
        }
    }

    try {
        const response = await fetch(`${API_BASE}/feedback/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                user_id: userId,
                app_id: appId,
                checkin_context: options.checkinContext || null,
                feedback_type: feedbackType,
            }))
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            if (options.checkinContext) {
                clearTestFeedbackCheckinPending(appId);
                if (typeof renderTests === 'function') renderTests(true);
            }
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        if (options.checkinContext) {
            markTestFeedbackCheckinPending(appId);
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        var toastKey = 'feedbackBotRedirect' + (feedbackType === 'idea' ? 'Idea' : 'Bug') + 'Toast';
        if (options.checkinContext) {
            toastKey = 'feedbackBotRedirectCheckin' + (feedbackType === 'idea' ? 'Idea' : 'Bug') + 'Toast';
        }
        showToast(window.t(toastKey, {}, lang));
        if (window.closeProjectDetailsModal) {
            window.closeProjectDetailsModal();
        }
        if (options.confirmCheckin && !options.checkinContext) {
            confirmStart(appId);
            _openBotDm();
            return;
        }
        if (options.checkinContext) {
            _openBotDm();
            return;
        }
        setTimeout(redirectToBotDmAndClose, 250);
    } catch (error) {
        console.error('Feedback initiate error:', error);
        if (options.checkinContext) {
            clearTestFeedbackCheckinPending(appId);
            if (typeof renderTests === 'function') renderTests(true);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function setFeedbackRewardBust(amount) {
    _feedbackRewardBust = Number(amount || 0);
    const input = document.getElementById('feedback-reward-bust-input');
    if (input) {
        input.value = _feedbackRewardBust > 0 ? String(_feedbackRewardBust) : '';
    }
    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    [5, 10, 25, 50, 100].forEach(function(value) {
        const chip = document.getElementById(`feedback-bust-chip-${value}`);
        if (chip) {
            chip.classList.toggle('is-active', Number(value) === _feedbackRewardBust);
            chip.classList.toggle('is-disabled', Number(value) > balance);
        }
    });
    _updateFeedbackRewardSubmitState();
}

function setFeedbackRewardKarma(amount) {
    var item = getFeedbackRewardItem();
    var isKarmaAvailable = item ? (item.project_karma_available !== false) : true;
    var isTesterAlreadyRewarded = item ? !!item.tester_already_rewarded_karma : false;
    var isKarmaLocked = !isKarmaAvailable || isTesterAlreadyRewarded;

    if (isKarmaLocked) {
        amount = 0;
    }

    _feedbackRewardKarma = Number(amount || 0);
    var project = getFeedbackRewardProject();
    var likesUsed = (project && project.likes_used) || 0;
    var likesMax = (project && project.likes_max) || 1;
    var remaining = Math.max(0, likesMax - likesUsed);
    var mapping = { 0: '0', 1.5: '15', 3: '30' };
    ['0', '15', '30'].forEach(function(code) {
        var chip = document.getElementById('feedback-karma-chip-' + code);
        if (chip) {
            chip.classList.toggle('is-active', code === mapping[_feedbackRewardKarma]);
            if (code !== '0') {
                var disabled = isKarmaLocked || (remaining <= 0);
                chip.classList.toggle('is-disabled', disabled);
                chip.disabled = disabled;
            } else {
                chip.classList.remove('is-disabled');
                chip.disabled = false;
            }
        }
    });
    _updateFeedbackRewardSubmitState();
}

function getFeedbackRewardProject() {
    var activeProject = myProjects.find(function(p) { return Number(p.id) === Number(_activeProjectFeedbackAppId); });
    if (activeProject) return activeProject;
    return archivedProjects.find(function(p) { return Number(p.app_id) === Number(_activeProjectFeedbackAppId); }) || null;
}

function getFeedbackRewardItem() {
    return (_activeProjectFeedbackItems || []).find(function(item) {
        return Number(item.id) === Number(_feedbackRewardTargetId);
    }) || null;
}

function getFeedbackRewardProjectAgeDays(project) {
    if (!project || !project.created_at) return null;
    var created = new Date(project.created_at);
    if (Number.isNaN(created.getTime())) return null;
    return Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1);
}

function buildFeedbackRewardKarmaMeta(project) {
    var likesUsed = Number(project && project.likes_used || 0);
    var likesMax = Number(project && project.likes_max || 1);
    var remaining = Math.max(0, likesMax - likesUsed);
    var ageDays = getFeedbackRewardProjectAgeDays(project);
    var statusLabel = window.t('feedbackRewardKarmaUsage', { used: likesUsed, max: likesMax }, lang);
    var toastText = '';

    if (remaining > 0) {
        toastText = window.t('feedbackRewardKarmaReadyToast', { count: remaining }, lang);
    } else if (ageDays !== null && ageDays < 7) {
        var daysLeft = Math.max(0, 7 - ageDays);
        var unlockDate = new Date();
        unlockDate.setHours(0, 0, 0, 0);
        unlockDate.setDate(unlockDate.getDate() + daysLeft);
        toastText = window.t('feedbackRewardKarmaNextToast', {
            count: daysLeft,
            date: unlockDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')
        }, lang);
    } else {
        toastText = window.t('feedbackRewardKarmaLimitToast', {}, lang);
    }

    return {
        statusLabel: statusLabel,
        toastText: toastText
    };
}

function updateFeedbackRewardKarmaStatus(project) {
    var karmaEl = document.getElementById('feedback-karma-status');
    if (!karmaEl) return;
    var meta = buildFeedbackRewardKarmaMeta(project);
    karmaEl.textContent = meta.statusLabel;
    karmaEl.dataset.toast = meta.toastText || '';
}

function showFeedbackRewardKarmaInfo() {
    var karmaEl = document.getElementById('feedback-karma-status');
    if (!karmaEl) return;
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    showToast(karmaEl.dataset.toast || window.t('feedbackRewardKarmaLimitToast', {}, lang));
}

async function openProjectFeedback(appId, isArchived) {
    const project = (isArchived ? archivedProjects : myProjects).find(function(item) {
        return Number(item.app_id || item.id) === Number(appId);
    });
    if (!project) return;

    _activeProjectFeedbackAppId = Number(appId);
    _activeProjectFeedbackArchived = !!isArchived;
    _activeProjectFeedbackItems = [];

    if (window.showProjectFeedbackModalLoading) {
        window.showProjectFeedbackModalLoading(project);
    }

    try {
        const initQ = 'init_data=' + encodeURIComponent(getTelegramInitDataRaw());
        const response = await fetch(`${API_BASE}/projects/${appId}/feedback?owner_id=${userId}&${initQ}`);
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            if (window.showProjectFeedbackModalError) {
                window.showProjectFeedbackModalError(project);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        _activeProjectFeedbackItems = data.feedback || [];
        if (window.showProjectFeedbackModal) {
            window.showProjectFeedbackModal(project, _activeProjectFeedbackItems);
        }
    } catch (error) {
        console.error('Load project feedback error:', error);
        if (window.showProjectFeedbackModalError) {
            window.showProjectFeedbackModalError(project);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function sendProjectFeedbackMedia(feedbackId) {
    try {
        const response = await fetch(`${API_BASE}/feedback/${feedbackId}/send_media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ owner_id: userId }))
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackMediaSentToast', {}, lang));
    } catch (error) {
        console.error('Send feedback media error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function openFeedbackRewardModal(appId, feedbackId) {
    _activeProjectFeedbackAppId = Number(appId);
    _feedbackRewardTargetId = Number(feedbackId);
    _feedbackRewardBust = 0;
    _feedbackRewardKarma = 0;

    var project = getFeedbackRewardProject();
    var item = getFeedbackRewardItem();

    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    var balanceEl = document.getElementById('feedback-owner-balance');
    if (balanceEl) balanceEl.textContent = window.t('feedbackRewardBustStatus', { amount: formatBustAmount(balance) }, lang);

    var targetNameEl = document.getElementById('feedback-reward-target-name');
    var targetMetaEl = document.getElementById('feedback-reward-target-meta');
    if (targetNameEl) {
        var fullName = (item && item.tester_full_name) || '';
        var username = item && item.tester_username ? '@' + String(item.tester_username).replace(/^@+/, '') : '';
        var fallback = window.t('idLabel', { id: item && item.tester_id ? item.tester_id : 0 }, lang);
        targetNameEl.textContent = fullName || username || fallback;
    }
    if (targetMetaEl) {
        var usernameText = item && item.tester_username ? '@' + String(item.tester_username).replace(/^@+/, '') : '';
        var fullNameText = (item && item.tester_full_name) || '';
        var parts = [];
        if (fullNameText && usernameText) parts.push(usernameText);
        if (item && item.message_text) parts.push(window.t('feedbackRewardTargetHint', {}, lang));
        targetMetaEl.textContent = parts.join(' • ') || window.t('feedbackRewardTargetHint', {}, lang);
    }

    // Evaluate limits
    var isKarmaAvailable = item ? (item.project_karma_available !== false) : true;
    var isTesterAlreadyRewarded = item ? !!item.tester_already_rewarded_karma : false;
    var warningEl = document.getElementById('feedback-reward-karma-warning');
    if (warningEl) {
        if (!isKarmaAvailable) {
            warningEl.textContent = window.t('feedbackRewardKarmaLimitReachedWarning', {}, lang);
            warningEl.style.display = 'block';
        } else if (isTesterAlreadyRewarded) {
            warningEl.textContent = window.t('feedbackRewardTesterAlreadyRewardedWarning', {}, lang);
            warningEl.style.display = 'block';
        } else {
            warningEl.style.display = 'none';
        }
    }

    updateFeedbackRewardKarmaStatus(project);

    if (window.openFeedbackRewardModalUi) {
        window.openFeedbackRewardModalUi();
    }
    setFeedbackRewardBust(0);
    setFeedbackRewardKarma(0);
    const input = document.getElementById('feedback-reward-bust-input');
    const reply = document.getElementById('feedback-reward-reply');
    if (input) {
        input.value = '';
        input.oninput = function() {
            _feedbackRewardBust = Number(input.value || 0);
            [5, 10, 25, 50, 100].forEach(function(value) {
                const chip = document.getElementById(`feedback-bust-chip-${value}`);
                if (chip) {
                    chip.classList.toggle('is-active', Number(value) === _feedbackRewardBust);
                    chip.classList.toggle('is-disabled', Number(value) > balance);
                }
            });
            _updateFeedbackRewardSubmitState();
        };
    }
    if (reply) {
        reply.value = '';
        reply.oninput = function() { _updateFeedbackRewardSubmitState(); };
    }
    _updateFeedbackRewardSubmitState();
}

function closeFeedbackRewardModal() {
    _feedbackRewardTargetId = null;
    _feedbackRewardBust = 0;
    _feedbackRewardKarma = 0;
    if (window.closeFeedbackRewardModalUi) {
        window.closeFeedbackRewardModalUi();
    }
}

function _updateFeedbackRewardSubmitState() {
    var btn = document.getElementById('feedback-reward-submit-btn');
    if (!btn) return;
    var reply = document.getElementById('feedback-reward-reply');
    var hasReply = reply && reply.value && reply.value.trim().length > 0;
    var hasReward = _feedbackRewardBust > 0 || _feedbackRewardKarma > 0;
    var enabled = hasReward || hasReply;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
}

var _feedbackRewardSubmitting = false;

function _setFeedbackRewardSubmitLoading(isLoading) {
    var btn = document.getElementById('feedback-reward-submit-btn');
    if (!btn) return;
    if (isLoading) {
        if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span> ' +
            (window.t('feedbackRewardSubmitting', {}, lang) || (lang === 'ru' ? 'Отправляем…' : 'Submitting…'));
    } else {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        if (btn.dataset.originalHtml) {
            btn.innerHTML = btn.dataset.originalHtml;
            delete btn.dataset.originalHtml;
        }
    }
}

async function submitFeedbackReward() {
    if (_feedbackRewardSubmitting) return;
    if (!_feedbackRewardTargetId || !_activeProjectFeedbackAppId) return;

    const bustInput = document.getElementById('feedback-reward-bust-input');
    const replyInput = document.getElementById('feedback-reward-reply');
    const bustAmount = Math.max(0, Number((bustInput && bustInput.value) || _feedbackRewardBust || 0));
    const replyText = (replyInput && replyInput.value ? replyInput.value : '').trim();

    // Client-side validation: bust cannot exceed balance
    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    if (bustAmount > balance) {
        if (tg && tg.showAlert) tg.showAlert(window.t('feedbackRewardInsufficientBust', {}, lang));
        return;
    }

    // Must have at least reward or reply text
    if (bustAmount <= 0 && _feedbackRewardKarma <= 0 && !replyText) {
        return;
    }

    _feedbackRewardSubmitting = true;
    _setFeedbackRewardSubmitLoading(true);

    try {
        const response = await fetch(`${API_BASE}/feedback/${_feedbackRewardTargetId}/reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                owner_id: userId,
                bust_amount: bustAmount,
                karma_amount: _feedbackRewardKarma,
                reply_text: replyText,
            }))
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            _setFeedbackRewardSubmitLoading(false);
            handleApiError(getBackendErrorCode(data), data.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        var processedFeedbackId = Number(_feedbackRewardTargetId || 0);
        var rewardedBust = Number(bustAmount || 0);
        var rewardedKarma = Number(_feedbackRewardKarma || 0);
        _setFeedbackRewardSubmitLoading(false);
        closeFeedbackRewardModal();
        if (typeof window.removeFeedbackCardOptimistic === 'function') {
            window.removeFeedbackCardOptimistic(processedFeedbackId, 'accepted', { reward_bust: rewardedBust, reward_karma: rewardedKarma });
        }
        if (typeof window.triggerFeedbackAutoAdvance === 'function') {
            window.triggerFeedbackAutoAdvance(processedFeedbackId);
        } else if (typeof loadProjects === 'function') {
            Promise.resolve()
                .then(function() { return loadProjects(true); })
                .catch(function() { /* ignore */ });
        }
        showToast(window.t('feedbackRewardSuccessToast', {}, lang));
    } catch (error) {
        console.error('Feedback reward error:', error);
        _setFeedbackRewardSubmitLoading(false);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    } finally {
        _feedbackRewardSubmitting = false;
    }
}

async function submitFeedback() {
    const input = document.getElementById('feedback-text-input');
    const rawText = input ? input.value : '';
    const text = (rawText || '').trim();
    if (text.length < 3) {
        showToast(window.t('feedbackValidationError', {}, lang));
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/send_to_topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                user_id: userId,
                type: _feedbackType,
                text
            }))
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            showToast(getApiErrorMessage(result, 'genericError'));
            return;
        }
        closeFeedbackModal();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackBotRedirectToast', {}, lang));
        setTimeout(redirectToBotDmAndClose, 250);
    } catch (error) {
        console.error('Send feedback error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function fetchKarmaBreakdown(targetUserId) {
    const resolvedUserId = Number(targetUserId || userId || 0);
    if (!resolvedUserId) {
        return {
            status: 'error',
            code: 'invalid_user_id',
            total: Number((visibilityStats && visibilityStats.ownerKarma) || 0),
            breakdown: []
        };
    }

    try {
        const response = await fetchWithRetry(`${API_BASE}/users/${resolvedUserId}/karma/breakdown`, {
            timeoutMs: 10000
        }, 1);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();

        const total = Number(payload && payload.total);
        const safeTotal = Number.isFinite(total)
            ? total
            : Number((visibilityStats && visibilityStats.ownerKarma) || 0);

        const apiBreakdown = payload && Array.isArray(payload.breakdown) ? payload.breakdown : [];
        let normalizedBreakdown = apiBreakdown.map((item) => {
            const sourceType = String(item && item.source_type ? item.source_type : 'unknown').toLowerCase();
            const countRaw = Number(item && item.count);
            const amountRaw = Number(item && (item.amount ?? item.karma ?? item.points));
            return {
                source_type: sourceType,
                count: Number.isFinite(countRaw) ? countRaw : 0,
                amount: Number.isFinite(amountRaw) ? amountRaw : 0,
            };
        }).filter((item) => item.count !== 0 || item.amount !== 0);

        // Backward compatibility for old backend shape: { total, good, bug }
        if (!normalizedBreakdown.length) {
            const goodCount = Number(payload && payload.good);
            const bugCount = Number(payload && payload.bug);
            if (Number.isFinite(goodCount) && goodCount > 0) {
                normalizedBreakdown.push({
                    source_type: 'good',
                    count: goodCount,
                    amount: goodCount * 1.5,
                });
            }
            if (Number.isFinite(bugCount) && bugCount > 0) {
                normalizedBreakdown.push({
                    source_type: 'bug',
                    count: bugCount,
                    amount: bugCount * 3,
                });
            }
        }

        return {
            status: 'success',
            code: null,
            total: safeTotal,
            breakdown: normalizedBreakdown,
        };
    } catch (error) {
        console.error('Karma breakdown load error:', error);
        return {
            status: 'error',
            code: 'network_error',
            total: Number((visibilityStats && visibilityStats.ownerKarma) || 0),
            breakdown: []
        };
    }
}

async function fetchContributionStats(targetUserId) {
    const resolvedUserId = Number(targetUserId || userId || 0);
    const cached = (visibilityStats && visibilityStats.contribution) || {};
    const fallback = {
        contribution_score: Number(
            (cached.contribution_score != null
                ? cached.contribution_score
                : (visibilityStats && visibilityStats.contribution_score)) || 0
        ),
        bugs_count: Number(cached.bugs_count || 0),
        ideas_count: Number(cached.ideas_count || 0),
        play_reviews_count: Number(cached.play_reviews_count || 0),
    };
    if (!resolvedUserId) {
        return { status: 'error', code: 'invalid_user_id', ...fallback };
    }

    try {
        const response = await fetchWithRetry(`${API_BASE}/users/${resolvedUserId}/contribution`, {
            timeoutMs: 10000
        }, 1);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();
        return {
            status: 'success',
            code: null,
            contribution_score: Number(payload && payload.contribution_score) || 0,
            bugs_count: Number(payload && payload.bugs_count) || 0,
            ideas_count: Number(payload && payload.ideas_count) || 0,
            play_reviews_count: Number(payload && payload.play_reviews_count) || 0,
            weights: (payload && payload.weights) || null,
        };
    } catch (error) {
        console.error('Contribution stats load error:', error);
        return { status: 'error', code: 'network_error', ...fallback };
    }
}

function _getTelegramInitDataRaw() {
    try {
        return String((tg && tg.initData) || '').trim();
    } catch (_) {
        return '';
    }
}

async function fetchContributionCurrent() {
    const initData = _getTelegramInitDataRaw();
    if (!initData) {
        return { status: 'error', code: 'invalid_init_data', season: null, me: null, gap_to_top5: 0, leaderboard: [] };
    }
    try {
        const url = `${API_BASE}/contribution/current?init_data=${encodeURIComponent(initData)}`;
        const response = await fetchWithRetry(url, { timeoutMs: 12000 }, 1);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || (payload && payload.status === 'error')) {
            return {
                status: 'error',
                code: (payload && (payload.code || payload.detail)) || `http_${response.status}`,
                details: (payload && payload.details) || null,
            };
        }
        return {
            status: 'success',
            season: payload.season || null,
            me: payload.me || null,
            gap_to_top5: Number(payload.gap_to_top5 || 0),
            leaderboard: Array.isArray(payload.leaderboard) ? payload.leaderboard : [],
            leaderboard_total: Number(payload.leaderboard_total || 0),
            pending_details: Array.isArray(payload.pending_details) ? payload.pending_details : [],
            moderation_details: Array.isArray(payload.moderation_details) ? payload.moderation_details : [],
            accepted_details: Array.isArray(payload.accepted_details) ? payload.accepted_details : [],
            rejected_details: Array.isArray(payload.rejected_details) ? payload.rejected_details : [],
        };
    } catch (error) {
        console.error('Contribution current load error:', error);
        return { status: 'error', code: 'network_error' };
    }
}

async function fetchContributionHistory() {
    const initData = _getTelegramInitDataRaw();
    if (!initData) {
        return {
            status: 'error',
            code: 'invalid_init_data',
            lifetime: null,
            seasons: [],
            claimable: [],
            has_claimable_prize: false,
        };
    }
    try {
        const url = `${API_BASE}/contribution/history?init_data=${encodeURIComponent(initData)}`;
        const response = await fetchWithRetry(url, { timeoutMs: 12000 }, 1);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || (payload && payload.status === 'error')) {
            return {
                status: 'error',
                code: (payload && (payload.code || payload.detail)) || `http_${response.status}`,
                details: (payload && payload.details) || null,
            };
        }
        return {
            status: 'success',
            lifetime: payload.lifetime || null,
            seasons: Array.isArray(payload.seasons) ? payload.seasons : [],
            claimable: Array.isArray(payload.claimable) ? payload.claimable : [],
            has_claimable_prize: Boolean(payload.has_claimable_prize),
        };
    } catch (error) {
        console.error('Contribution history load error:', error);
        return { status: 'error', code: 'network_error' };
    }
}

async function claimContributionPrize(seasonId) {
    const initData = _getTelegramInitDataRaw();
    const safeSeasonId = Number(seasonId || 0);
    if (!initData) {
        return { status: 'error', code: 'invalid_init_data' };
    }
    if (!safeSeasonId) {
        return { status: 'error', code: 'season_not_found' };
    }
    try {
        const response = await fetchWithRetry(`${API_BASE}/contribution/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                init_data: initData,
                season_id: safeSeasonId,
            }),
            timeoutMs: 15000,
        }, 1);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || (payload && payload.status === 'error')) {
            const code = (payload && (payload.code || payload.detail)) || `http_${response.status}`;
            return {
                status: 'error',
                code: typeof code === 'string' ? code : 'claim_failed',
                details: (payload && payload.details) || null,
            };
        }
        return {
            status: 'success',
            season_id: Number(payload.season_id || safeSeasonId),
            prize_amount: Number(payload.prize_amount || 0),
            claim_status: payload.claim_status || 'claimed',
            claimed_at: payload.claimed_at || null,
            claim_transaction_id: payload.claim_transaction_id || null,
            new_balance: payload.new_balance != null ? Number(payload.new_balance) : null,
            final_rank: payload.final_rank != null ? Number(payload.final_rank) : null,
        };
    } catch (error) {
        console.error('Contribution claim error:', error);
        return { status: 'error', code: 'network_error' };
    }
}

async function sendKarmaReward(appId, testerId, rewardType) {
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: testerId,
                type: rewardType,
                init_data: (typeof getTelegramInitDataRaw === 'function') ? getTelegramInitDataRaw() : ((tg && tg.initData) || ''),
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            showToast(t.karmaToast);
            const project = myProjects.find(item => item.id === appId);
            if (project) {
                if (project.likes) project.likes.push({ tester_id: testerId, type: rewardType });
                project.likes_used = (project.likes_used || 0) + 1;
            }
            renderProjects();
            if (window._karmaDistributionProjectId === appId && window.openKarmaDistribution) {
                window.openKarmaDistribution(appId);
            }
        } else {
            const message = result.code === 'karma_limit_reached'
                ? t.karmaLimitReached
                : getApiErrorMessage(result, 'karmaAlreadyLiked');
            showToast(message);
        }
    } catch (error) {
        console.error('Karma error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function showCheckinRewardToasts(result) {
    result = result || {};
    if (result.already_checked_today) {
        showToast(window.t('checkinAlreadyDone', {}, lang));
        return;
    }

    var earnedBust = Number(result.earned_bust != null ? result.earned_bust : result.bust_earned || 0);
    var earnedKarma = Number(result.earned_karma != null ? result.earned_karma : result.karma_earned || 0);
    var sourceType = String(result.source_type || '').toLowerCase();
    var rewardBust = Number(result.reward_bust != null ? result.reward_bust : earnedBust);
    var holdBonusEarned = Number(result.hold_bonus_earned || 0);
    var holdBonusForfeited = !!result.hold_bonus_forfeited;
    var dailyOnlyBust = Math.max(0, earnedBust - (holdBonusEarned > 0 ? holdBonusEarned : 0));

    if (sourceType === 'overtime_checkin' && rewardBust > 0) {
        var karmaVal = formatAmountValue(earnedKarma || 0.5, 1);
        var bustVal = formatAmountValue(rewardBust, 1);
        showToast(lang === 'ru'
            ? ('Чекин успешен! +' + karmaVal + ' ☯️ Кармы и +' + bustVal + '💎$BUST')
            : ('Check-in successful! +' + karmaVal + ' ☯️ Karma and +' + bustVal + '💎$BUST'));
    } else if (sourceType === 'overtime_checkin' && earnedKarma > 0) {
        showToast(window.t('checkinEarnOvertimeKarma', { amount: formatAmountValue(earnedKarma, 1) }, lang));
    } else if (dailyOnlyBust > 0 && earnedKarma > 0) {
        showToast(window.t('checkinEarnBustAndKarma', {
            bust: formatAmountValue(dailyOnlyBust, 1),
            karma: formatAmountValue(earnedKarma, 1)
        }, lang));
    } else if (earnedBust > 0 && earnedKarma > 0 && holdBonusEarned <= 0) {
        showToast(window.t('checkinEarnBustAndKarma', {
            bust: formatAmountValue(earnedBust, 1),
            karma: formatAmountValue(earnedKarma, 1)
        }, lang));
    } else if (dailyOnlyBust > 0) {
        showToast(window.t('checkinEarnBust', { amount: formatAmountValue(dailyOnlyBust, 1) }, lang));
    } else if (earnedBust > 0 && holdBonusEarned <= 0) {
        showToast(window.t('checkinEarnBust', { amount: formatAmountValue(earnedBust, 1) }, lang));
    } else if (earnedKarma > 0) {
        showToast(window.t('checkinEarnKarma', { amount: formatAmountValue(earnedKarma, 1) }, lang));
    } else if (holdBonusEarned <= 0 && !holdBonusForfeited) {
        showToast(window.t('successCheckin', {}, lang));
    }

    if (holdBonusEarned > 0) {
        setTimeout(function() {
            showToast(window.t('holdBonusCreditedToast', {
                amount: formatAmountValue(holdBonusEarned, 1)
            }, lang));
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        }, 700);
    } else if (holdBonusForfeited) {
        setTimeout(function() {
            showToast(window.t('holdBonusForfeitedToast', {
                count: Number(result.missed_days || result.skips_count || 0)
            }, lang));
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }, 700);
    }
}

async function confirmStart(id, options) {
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    var proofKind = String((options && options.proofKind) || 'open_token').trim().toLowerCase();
    if (proofKind !== 'checkpoint_screenshot') {
        proofKind = 'open_token';
    }

    const actionKey = 'checkin_' + id;
    if (_pendingActions.has(actionKey)) return false;
    _pendingActions.add(actionKey);

    const test = myTests.find(function(item) { return Number(item.id) === Number(id); });
    const shouldSubmitPlayFeedback = !!(test && canTogglePlayReview(test) && !test.play_feedback_submitted && test.play_feedback_submitted_pending);
    if (test) {
        var appStatus = String(test.app_status || 'active').toLowerCase();
        var progressStatus = String(test.progress_status || 'active').toLowerCase();
        var isPendingCompletion = appStatus === 'pending_completion';
        var isArchivedOrCompleted = (appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active';
        if (isPendingCompletion) {
            _pendingActions.delete(actionKey);
            _handleInactiveCheckinCard(id, 'project_pending_completion');
            return false;
        }
        if (isArchivedOrCompleted) {
            // Grant-tomorrow state is invalid for archived/completed projects and can keep stale active cards.
            test.isGrantAvailableTomorrow = false;
            _pendingActions.delete(actionKey);
            _handleInactiveCheckinCard(id, 'app_not_found');
            return false;
        }
    }

    const card = document.getElementById(`test-card-${id}`);
    const btn = document.getElementById(`btn-confirm-${id}`);

    if (btn) {
        _setConfirmButtonLabel(btn, t.confirmed);
        btn.classList.add('is-confirming');
        btn.disabled = true;
    }

    if (!card) return false;
    card.classList.add('removing');

    try {
        const response = await fetch(`${API_BASE}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                tester_id: userId,
                app_id: id,
                local_date: getLocalDate(),
                play_feedback_submitted: shouldSubmitPlayFeedback,
                open_token: _getCheckinOpenToken(id),
                proof_kind: proofKind,
            }))
        });

        let result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok || !result || result.status !== 'success') {
            card.classList.remove('removing');
            if (btn) {
                btn.classList.remove('is-confirming');
                if (btn.classList.contains('tstep__row')) {
                    // Step rows keep their own caption; only the busy state is undone.
                    _setConfirmButtonLabel(btn, window.t('stepSendScreenshot', {}, lang));
                } else {
                    _setConfirmButtonLabel(btn, t.confirmStart);
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    btn.classList.add('btn-success', 'btn-confirm-ready');
                }
                btn.disabled = false;
            }

            if (result && typeof result === 'object') {
                var errorCode = getBackendErrorCode(result);
                if (errorCode === 'testing_not_found'
                    || errorCode === 'app_not_found'
                    || errorCode === 'test_or_app_not_found'
                    || errorCode === 'project_pending_completion') {
                    _handleInactiveCheckinCard(id, errorCode);
                } else if (
                    errorCode === 'open_required'
                    || errorCode === 'open_invalid'
                    || errorCode === 'open_mismatch'
                    || errorCode === 'open_expired'
                    || errorCode === 'open_not_ready'
                    || errorCode === 'day_boundary_moved'
                ) {
                    // Screenshot-during-timer must not wipe the Open session.
                    if (!(proofKind === 'checkpoint_screenshot' && errorCode === 'open_not_ready')) {
                        setTimerReadyForConfirm(id, false);
                        clearActiveTimerForApp(id);
                        if (typeof window.renderTests === 'function') {
                            window.renderTests(true);
                        }
                    }
                    handleApiError(errorCode, result.details || {});
                } else {
                    handleApiError(errorCode, result.details || {});
                }
            } else {
                handleApiError('network_error');
            }
            return false;
        }

        const earnedBust = Number(result.earned_bust || 0);
        const earnedKarma = Number(result.earned_karma || 0);
        const sourceType = String(result.source_type || '').toLowerCase();
        setFirstDayScreenshotVisible(id, false);
        setTimerReadyForConfirm(id, false, false, '');
        clearActiveTimerForApp(id);
        const rewardBust = Number(result.reward_bust || result.earned_bust || 0);
        if (result.already_checked_today) {
            showToast(t.checkinAlreadyDone);
        } else {
            if (typeof showCheckinRewardToasts === 'function') {
                showCheckinRewardToasts(result);
            } else if (sourceType === 'overtime_checkin' && rewardBust > 0) {
                const karmaVal = formatAmountValue(earnedKarma || 0.5, 1);
                const bustVal = formatAmountValue(rewardBust, 1);
                if (lang === 'ru') {
                    showToast(`Чекин успешен! +${karmaVal} ☯️ Кармы и +${bustVal}💎$BUST`);
                } else {
                    showToast(`Check-in successful! +${karmaVal} ☯️ Karma and +${bustVal}💎$BUST`);
                }
            } else if (sourceType === 'overtime_checkin' && earnedKarma > 0) {
                showToast(window.t('checkinEarnOvertimeKarma', { amount: formatAmountValue(earnedKarma, 1) }, lang));
            } else if (earnedBust > 0 && earnedKarma > 0) {
                showToast(window.t('checkinEarnBustAndKarma', {
                    bust: formatAmountValue(earnedBust, 1),
                    karma: formatAmountValue(earnedKarma, 1)
                }, lang));
            } else if (earnedBust > 0) {
                showToast(t.checkinEarnBust.replace('{amount}', formatAmountValue(earnedBust, 1)));
            } else if (earnedKarma > 0) {
                showToast(t.checkinEarnKarma.replace('{amount}', formatAmountValue(earnedKarma, 1)));
            } else {
                showToast(t.successCheckin);
            }
        }

        var updatedTest = myTests.find(function(test) {
            return Number(test.id) === Number(id);
        });
        if (updatedTest) {
            var wasFirstCheckin = Number(updatedTest.checkins_count || 0) <= 0
                || String(updatedTest.status || '') === 'new';
            updatedTest.last_check_date = result.last_check_date || getLocalDate();
            updatedTest.checkins_count = Math.max(0, Number(result.checkins_count || updatedTest.checkins_count || 0));
            updatedTest.skips_count = Math.max(0, Number(result.skips_count || 0));
            updatedTest.daily_timeline = result.daily_timeline || updatedTest.daily_timeline || '';
            updatedTest.testing_days = Math.max(Number(updatedTest.testing_days || 0), Number(result.testing_day || 0));
            updatedTest.status = 'done';
            updatedTest.play_feedback_submitted = Object.prototype.hasOwnProperty.call(result, 'play_feedback_submitted')
                ? !!result.play_feedback_submitted
                : (!!updatedTest.play_feedback_submitted || shouldSubmitPlayFeedback);
            updatedTest.play_feedback_submitted_pending = !!updatedTest.play_feedback_submitted;

            // Recalculate isGrantAvailableTomorrow after optimistic update
            var skipsAfter = countGrantSkips(updatedTest);
            var canEverClaim = !updatedTest.grant_claimed && skipsAfter <= 3 && updatedTest.progress_id;
            if (canEverClaim && updatedTest.testing_days === 14) {
                updatedTest.isGrantAvailableTomorrow = true;
                window.tg.showAlert(window.t('grantAvailableTomorrowAlert', {}, lang));
            }
            if (wasFirstCheckin && !result.already_checked_today) {
                markDefaultGroupJoined({ silent: true, rerender: false });
            }
        }

        setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
        renderTests(true);
        refreshOpenModals();

        setTimeout(() => {
            loadTasks(true).catch(function() {});
            loadProjects(true).catch(function() {});
        }, 250);
        return true;
    } catch (error) {
        console.error('Checkin error:', error);
        card.classList.remove('removing');
        if (btn) {
            btn.innerText = t.confirmStart;
            btn.style.backgroundColor = '';
            btn.style.color = '';
            btn.classList.add('btn-success', 'btn-confirm-ready');
            btn.disabled = false;
        }
        handleApiError('network_error');
        return false;
    } finally {
        _pendingActions.delete(actionKey);
    }
}

function handleClaimGrantClick(progressId, appId) {
    const test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    const skipsCount = countGrantSkips(test);
    if (skipsCount > 3) {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showToast(window.t('claimGrantMissedToast', { count: skipsCount }, lang));
        return;
    }
    claimGrant(progressId, appId);
}

async function claimGrant(progressId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const btn = document.getElementById(`btn-claim-${appId}`);
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    try {
        const response = await fetch(`${API_BASE}/testing/${progressId}/claim_grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId }))
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            handleApiError(getBackendErrorCode(result), result.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        const amount = Number(result.amount || 0);
        const test = myTests.find(t => t.id === appId);
        if (test) {
            test.grant_claimed = true;
            test.isReadyToClaim = false;
            test.isGrantAvailableTomorrow = false;
            test.isEarlyFinish = false;
        }
        const isActive = test && test.app_status === 'active';
        if (isActive) {
            showToast(window.t('claimGrantOvertimeToast', { amount: amount.toFixed(1) }));
        } else {
            showToast(window.t('claimGrantToast', { amount: amount.toFixed(1) }));
            myTests = (myTests || []).filter(function(item) {
                return Number(item.id) !== Number(appId);
            });
        }
        if (btn) btn.style.display = 'none';
        persistTestsCacheSnapshot();
        if (window.renderTests) window.renderTests(true);
        loadProjects(true);
    } catch (error) {
        console.error('Claim grant error:', error);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        handleApiError('network_error');
    }
}

async function claimEarlyFinishBonus(progressId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const btn = document.getElementById('btn-early-finish-' + appId);
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    try {
        const response = await fetch(`${API_BASE}/testing/${progressId}/claim_early_finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId }))
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            handleApiError(getBackendErrorCode(result), result.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        const test = myTests.find(t => Number(t.id) === Number(appId));
        if (test) {
            test.grant_claimed = true;
            test.isReadyToClaim = false;
            test.isGrantAvailableTomorrow = false;
            test.isEarlyFinish = false;
        }
        myTests = (myTests || []).filter(function(item) {
            return Number(item.id) !== Number(appId);
        });
        persistTestsCacheSnapshot();
        if (result.qualified) {
            if (result.already_awarded) {
                showToast(window.t('earlyFinishAlreadyToast', {}, lang));
            } else {
                showToast(window.t('earlyFinishClaimedToast', { amount: result.amount }, lang));
            }
        } else {
            showToast(window.t('earlyFinishNoBonus', {}, lang));
        }
        if (window.renderTests) window.renderTests(true);
    } catch (error) {
        console.error('Claim early finish error:', error);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        handleApiError('network_error');
    }
}

function _iconUploadPending(active) {
    document.querySelectorAll('.icon-upload-btn').forEach(function(btn) {
        btn.disabled = !!active;
        btn.style.opacity = active ? '0.5' : '';
    });
}

async function handleIconUpload(fileInput, targetFieldId) {
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;
    var targetField = document.getElementById(targetFieldId);
    if (!targetField) return;

    var uploadBtn = fileInput.nextElementSibling;
    if (!uploadBtn || uploadBtn.tagName !== 'BUTTON') {
        uploadBtn = fileInput.parentNode && fileInput.parentNode.querySelector('button');
    }
    var btnOrigText = uploadBtn ? uploadBtn.innerHTML : '';
    var origPlaceholder = targetField.placeholder || '';

    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="icon-upload-spinner"></span>';
    }
    targetField.placeholder = 'Uploading...';
    targetField.value = '';

    try {
        var userId = (window.App && window.App.userId) || window.userId || 0;
        var tgUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
        if (tgUser && tgUser.id) userId = tgUser.id;
        if (!userId || userId <= 0) {
            alert('Cannot identify user — please reload the app');
            targetField.placeholder = '';
            return;
        }
        var formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', String(userId));
        formData.append('init_data', getTelegramInitDataRaw());

        var apiBase = (window.App && window.App.API_BASE) || '';
        var resp = await fetch(apiBase + '/upload-icon', { method: 'POST', body: formData });
        var data = await resp.json();

        if (data && data.status === 'success' && data.url) {
            targetField.value = data.url;
            if (typeof updateIconPreview === 'function') {
                updateIconPreview(targetFieldId, targetFieldId.indexOf('edit-') === 0 ? 'edit-icon-preview' : 'app-icon-preview');
            }
        } else {
            alert(data && data.message ? data.message : 'Upload failed');
        }
    } catch (e) {
        console.error('Icon upload error:', e);
        alert('Upload failed: network error');
    } finally {
        fileInput.value = '';
        targetField.placeholder = origPlaceholder;
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = btnOrigText;
        }
    }
}

window.handleIconUpload = handleIconUpload;

async function handleReviewScreenshotUpload(fileInput, appId) {
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file || !appId) return;

    var uploadBtn = fileInput.nextElementSibling;
    if (!uploadBtn || uploadBtn.tagName !== 'BUTTON') {
        uploadBtn = fileInput.parentNode && fileInput.parentNode.querySelector('button');
    }
    var btnOrigText = uploadBtn ? uploadBtn.innerHTML : '';

    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="icon-upload-spinner"></span>';
    }

    var uploadZone = document.getElementById('play-review-upload-zone');
    if (uploadZone) {
        uploadZone.classList.add('is-uploading');
        uploadZone.style.pointerEvents = 'none';
        var textEl = uploadZone.querySelector('.upload-zone-text');
        if (textEl) {
            textEl.innerHTML = '<span class="icon-upload-spinner"></span>';
        }
    }

    try {
        var userId = (window.App && window.App.userId) || window.userId || 0;
        var tgUser = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user;
        if (tgUser && tgUser.id) userId = tgUser.id;
        if (!userId || userId <= 0) {
            alert('Cannot identify user — please reload the app');
            return;
        }

        var apiBase = (window.App && window.App.API_BASE) || '';
        var formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', String(userId));
        formData.append('init_data', getTelegramInitDataRaw());

        var resp = await fetch(apiBase + '/projects/' + appId + '/play-review/upload', {
            method: 'PUT',
            body: formData
        });
        var data = await resp.json();

        if (data && data.status === 'success' && data.url) {
            var test = typeof getMyTestById === 'function' ? getMyTestById(appId) : null;
            if (test) {
                test.play_review_screenshot_url = data.url;
                // Keep rejected/none status until explicit Submit; only refresh if API returns pending/approved.
                var nextStatus = String(data.play_review_status || '').trim().toLowerCase();
                if (nextStatus === 'pending' || nextStatus === 'approved') {
                    test.play_review_status = nextStatus;
                }
                try { persistTestsCacheSnapshot(); } catch (persistErr) {}
            }
            // Persist across Telegram openLink suspend + myTests refresh.
            window._playReviewStep1Done = true;
            try {
                var key = 'playReviewRetry:' + String(Number(appId) || 0);
                var prev = {};
                try { prev = JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch (e) { prev = {}; }
                sessionStorage.setItem(key, JSON.stringify({
                    step1Done: true,
                    screenshotUrl: String(data.url || ''),
                }));
            } catch (e) {}
            if (typeof window._savePlayReviewSession === 'function') {
                window._savePlayReviewSession(appId, { step1Done: true, screenshotUrl: data.url });
            }
            if (typeof window.renderPlayReviewModal === 'function') {
                window.renderPlayReviewModal();
            } else if (typeof renderPlayReviewModal === 'function') {
                renderPlayReviewModal();
            }
            // Hard-enable submit immediately even if a later re-render races.
            var submitBtn = document.getElementById('play-review-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.removeAttribute('disabled');
                submitBtn.classList.remove('btn-disabled');
                submitBtn.classList.add('btn-primary');
            }
            console.log('[handleReviewScreenshotUpload] success, url=' + data.url);
        } else {
            alert(data && data.message ? data.message : 'Upload failed');
        }
    } catch (e) {
        console.error('Review screenshot upload error:', e);
        alert('Upload failed: network error');
    } finally {
        fileInput.value = '';
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = btnOrigText;
        }
        var uploadZoneFinally = document.getElementById('play-review-upload-zone');
        if (uploadZoneFinally) {
            uploadZoneFinally.classList.remove('is-uploading');
            uploadZoneFinally.style.pointerEvents = '';
        }
    }
}

window.handleReviewScreenshotUpload = handleReviewScreenshotUpload;

function updateIconPreview(inputId, previewId) {
    var input = document.getElementById(inputId);
    var preview = document.getElementById(previewId);
    if (!input || !preview) return;
    var url = (input.value || '').trim();
    if (!url) { preview.style.display = 'none'; preview.src = ''; return; }
    if (typeof resolveIconUrl === 'function') url = resolveIconUrl(url);
    preview.src = url;
    preview.style.display = 'block';
}

let _feedbackAcceptLongPressTimeout = null;
let _feedbackAcceptLongPressActive = false;
let _feedbackAcceptLongPressStart = 0;
let _feedbackAcceptLongPressPulse = null;

function startFeedbackAcceptLongPress(btnEl, feedbackId, projectId, event) {
    if (_feedbackAcceptLongPressActive) return;
    if (event && event.type === 'touchstart') {
        // Keep scroll possible until hold engages; do not preventDefault here.
    }

    _feedbackAcceptLongPressActive = true;
    _feedbackAcceptLongPressStart = Date.now();
    if (btnEl) btnEl.classList.add('fb-action-btn--holding');

    const progressEl = btnEl && btnEl.querySelector('.fb-btn-accept-progress');
    if (progressEl) {
        progressEl.style.transition = 'width 0.8s linear';
        progressEl.getBoundingClientRect();
        progressEl.style.width = '100%';
    }

    if (window.tg && window.tg.HapticFeedback) {
        window.tg.HapticFeedback.impactOccurred('medium');
    } else if (navigator.vibrate) {
        navigator.vibrate(30);
    }

    if (_feedbackAcceptLongPressPulse) clearInterval(_feedbackAcceptLongPressPulse);
    _feedbackAcceptLongPressPulse = setInterval(function() {
        if (navigator.vibrate) navigator.vibrate(12);
    }, 220);

    _feedbackAcceptLongPressTimeout = setTimeout(async function() {
        _feedbackAcceptLongPressActive = false;
        if (_feedbackAcceptLongPressPulse) {
            clearInterval(_feedbackAcceptLongPressPulse);
            _feedbackAcceptLongPressPulse = null;
        }
        if (btnEl) btnEl.classList.remove('fb-action-btn--holding');
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
        } else if (navigator.vibrate) {
            navigator.vibrate([20, 40, 20]);
        }

        await submitQuickFeedbackAccept(feedbackId, projectId, btnEl);

        if (progressEl) {
            progressEl.style.transition = 'none';
            progressEl.style.width = '0';
        }
    }, 800);
}

function cancelFeedbackAcceptLongPress(btnEl, event) {
    if (!_feedbackAcceptLongPressActive) return;
    _feedbackAcceptLongPressActive = false;

    clearTimeout(_feedbackAcceptLongPressTimeout);
    if (_feedbackAcceptLongPressPulse) {
        clearInterval(_feedbackAcceptLongPressPulse);
        _feedbackAcceptLongPressPulse = null;
    }
    if (btnEl) btnEl.classList.remove('fb-action-btn--holding');

    const progressEl = btnEl && btnEl.querySelector('.fb-btn-accept-progress');
    if (progressEl) {
        progressEl.style.transition = 'width 0.15s ease-out';
        progressEl.style.width = '0';
    }
}

function handleFeedbackAcceptClick(projectId, feedbackId, btnEl, event) {
    const duration = Date.now() - _feedbackAcceptLongPressStart;
    if (duration >= 800) {
        if (event) {
            event.stopPropagation();
            event.preventDefault();
        }
        return;
    }

    cancelFeedbackAcceptLongPress(btnEl, event);
    openFeedbackRewardModal(projectId, feedbackId);
}

async function submitQuickFeedbackAccept(feedbackId, projectId, btnEl) {
    // Long-press = instant accept with 0 $BUST (and no karma).
    const targetBust = 0;
    const targetKarma = 0;

    if (typeof window.removeFeedbackCardOptimistic === 'function') {
        window.removeFeedbackCardOptimistic(feedbackId, 'accepted', { reward_bust: targetBust });
    }

    if (typeof window.triggerFeedbackAutoAdvance === 'function') {
        window.triggerFeedbackAutoAdvance(feedbackId);
    }

    try {
        const response = await fetch(`${API_BASE}/feedback/${feedbackId}/reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({
                owner_id: userId,
                bust_amount: targetBust,
                karma_amount: targetKarma,
                reply_text: "",
            }))
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        showToast(window.t('feedbackQuickAcceptToast', {}, lang) || (lang === 'ru' ? '✅ Принято' : '✅ Accepted'));
    } catch (error) {
        console.error('Quick accept error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function triggerFeedbackAutoAdvance(currentFeedbackId) {
    setTimeout(function() {
        const list = document.querySelector('#project-feedback-body .feedback-list');
        if (!list) return;
        const cards = Array.from(list.querySelectorAll('.fb-card:not(.fb-card--hidden):not(.fb-card--processed)'));

        const currentIndex = cards.findIndex(function(card) {
            return Number(card.getAttribute('data-feedback-id')) === Number(currentFeedbackId);
        });

        let nextCard = null;
        for (let i = Math.max(currentIndex, 0) + 1; i < cards.length; i++) {
            const card = cards[i];
            if (card.classList.contains('fb-card--collapsed')) {
                nextCard = card;
                break;
            }
        }
        if (!nextCard) {
            for (let i = 0; i < cards.length; i++) {
                const card = cards[i];
                if (Number(card.getAttribute('data-feedback-id')) === Number(currentFeedbackId)) continue;
                if (card.classList.contains('fb-card--collapsed')) {
                    nextCard = card;
                    break;
                }
            }
        }

        if (nextCard) {
            nextCard.classList.remove('fb-card--collapsed');
            nextCard.classList.add('fb-card--expanded');
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (typeof feedbackScheduleClampMeasure === 'function') {
                feedbackScheduleClampMeasure();
            }
            if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        }
    }, 320);
}
window.triggerFeedbackAutoAdvance = triggerFeedbackAutoAdvance;

window.startFeedbackAcceptLongPress = startFeedbackAcceptLongPress;
window.cancelFeedbackAcceptLongPress = cancelFeedbackAcceptLongPress;
window.handleFeedbackAcceptClick = handleFeedbackAcceptClick;
window.submitQuickFeedbackAccept = submitQuickFeedbackAccept;

window.updateIconPreview = updateIconPreview;

window.isTestFeedbackCheckinPending = isTestFeedbackCheckinPending;
window.markTestFeedbackCheckinPending = markTestFeedbackCheckinPending;
window.applyTestFeedbackCheckinPendingUi = applyTestFeedbackCheckinPendingUi;
window.reapplyAllFeedbackCheckinPendingUi = reapplyAllFeedbackCheckinPendingUi;
window.getFeedbackCheckinPendingLabel = getFeedbackCheckinPendingLabel;