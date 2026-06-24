/* Phase 5.3 — js/app-actions.js (structural split from app.js) */
/* checkin/timer flow, UI control, offers decisions, karma, feedback actions */
/* Depends on globals from js/app-config.js and js/app-api.js. */
function countGrantSkips(app) {
    var timeline = String(app && app.daily_timeline || '');
    if (timeline) {
        return Math.max(0, (timeline.substring(0, 14).match(/[03]/g) || []).length);
    }
    return Math.max(0, Number(app && app.skips_count || 0));
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
    confirmStart(appId);
    openOwnerCheckpointChat(resolvedOwnerUsername, buildCheckpointReportPrefill(appId));
}

function syncAutoAcceptToggleUi() {
    var toggle = document.getElementById('auto-accept-mutual-toggle');
    if (!toggle) return;
    toggle.checked = !!_autoAcceptMutualEnabled;
    toggle.disabled = !!_autoAcceptToggleInFlight;
}

function showAutoAcceptMutualInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('autoAcceptMutualInfoToast', {}, lang));
}

async function handleAutoAcceptMutualToggle(input) {
    if (!input || _autoAcceptToggleInFlight) {
        syncAutoAcceptToggleUi();
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
            syncAutoAcceptToggleUi();
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }

        _autoAcceptMutualEnabled = !!result.auto_accept_mutual;
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
                };
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
        _timerReadyState[key] = {
            isScreenshot: !!isScreenshot,
            ownerUsername: String(ownerUsername || ''),
            localDate: getLocalDate(),
        };
    } else {
        delete _timerReadyState[key];
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
        var payload = _timerReadyState[key];
        _setTimerButtonReady(appId, !!(payload && payload.isScreenshot), (payload && payload.ownerUsername) || '');
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
    btn.style.backgroundColor = 'var(--success-color)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    if (isScreenshot) {
        if (isExternalTest) {
            btn.innerText = isFirstDayScreenshot
                ? window.t('screenshotBtn', {}, lang)
                : '✅ ' + window.t('completeControlDayBtn', {}, lang);
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
            : '✅ ' + window.t('completeControlDayBtn', {}, lang);
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
                btn.className = 'btn btn-success split-btn-main';
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
            '<button id="btn-confirm-' + finishedId + '" class="' + (isExternalTest ? 'btn btn-success split-btn-main external-tests-confirm-btn external-tests-confirm-ready' : 'btn btn-success split-btn-main') + '" onclick="' + (isExternalTest
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
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    return true;
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

    test.isGrantAvailableTomorrow = !!(canEverClaim && !isArchivedOrCompleted && !isPendingCompletion && testingDays === 14 && isTestedToday);
    test.isReadyToClaim = !!(canEverClaim && (testingDays >= 15 || (isArchivedOrCompleted && testingDays >= 14)));
    test.isEarlyFinish = !!(isArchivedOrCompleted && !test.grant_claimed && !test.isReadyToClaim && !test.isGrantAvailableTomorrow && testingDays >= 5 && skipsCount <= 1);
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
    return canTogglePlayReview(test)
        && !test.play_feedback_submitted
        && Number(test.testing_days || 0) >= 7
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function canTogglePlayReview(test) {
    if (!test) return false;
    return !!test.request_reviews
        && String(test.app_status || 'active').toLowerCase() === 'active'
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function isPlayReviewMarked(testOrAppId) {
    var test = typeof testOrAppId === 'object'
        ? testOrAppId
        : getMyTestById(testOrAppId);
    if (test && test.rewards_summary && test.rewards_summary.review_rejected) {
        return false;
    }
    return !!(test && (test.play_feedback_submitted || test.play_feedback_submitted_pending));
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

    var issueBtn = document.getElementById('btn-issue-' + id);
    if (issueBtn) {
        issueBtn.style.display = 'inline-flex';
        issueBtn.disabled = !!test.issue_reported_at && !test.issue_fixed_at;
        issueBtn.style.opacity = issueBtn.disabled ? '0.55' : '1';
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
            body: JSON.stringify({ user_id: userId })
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
            body: JSON.stringify({
                owner_id: targetOwnerId,
                target_app_id: targetAppId,
                proposer_id: userId,
                proposer_app_id: proposerAppId
            }),
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

function startTimer(id, pkg, isScreenshotDay = false, ownerUsername = '', durationSeconds = 15) {
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
        _persistActiveTimer();
        _startActiveTimerInterval(activeTimerAppId);
    }
}
window._restoreActiveTimer = _restoreActiveTimer;

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

function handleFirstDownload(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    setFirstDayScreenshotVisible(id, true);
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);
    setTimeout(() => {
        const screenshotBox = document.getElementById(`new-screenshot-box-${id}`);
        if (screenshotBox) screenshotBox.style.display = 'block';
    }, 1000);
}

async function handleScreenshotAndConfirm(id, ownerUsername) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (window.openScreenshotGuardModal) {
        window.openScreenshotGuardModal(id, ownerUsername);
        return;
    }
    openReportModal(id, ownerUsername);
}

async function submitIssueReport(appId) {
    if (!appId) return;
    var test = myTests.find(function(item) { return Number(item.id) === Number(appId); });
    if (!test) return;

    var reasonEl = document.getElementById('issue-report-text');
    var emailEl = document.getElementById('issue-report-email');
    var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
    var email = emailEl ? String(emailEl.value || '').trim() : '';

    if (email && !isValidEmail(email)) {
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
            body: JSON.stringify({ tester_id: userId, issue_reason: reason, email: email })
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
        confirmStart(appId);
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
    const socialStatus = document.getElementById('earn-social-status');
    if (_socialBonusStatus === 'approved') {
        socialStatus.innerHTML = `<span class="meta-chip accent-green">✅ ${t.earnSocialApproved}</span>`;
    } else if (_socialBonusStatus === 'pending') {
        socialStatus.innerHTML = `<button class="btn btn-secondary" style="width:100%; opacity:0.6;" disabled>⏳ ${t.earnSocialPending}</button>`;
    } else {
        socialStatus.innerHTML = `<button class="btn btn-primary" style="width:100%;" onclick="openSocialModal()">🎁 ${t.earnSocialBtn}</button>`;
    }
}

async function openEarnBustModal() {
    document.getElementById('earn-bust-modal').classList.add('active');
    try {
        const response = await fetch(`${API_BASE}/referral-stats/${userId}`);
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
        renderEarnBustDynamic();
    } catch (error) {
        console.error('Failed to load referral stats:', error);
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
    applyTestFeedbackCheckinPendingUi(normalizedId);
}

function clearTestFeedbackCheckinPending(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;
    delete _pendingFeedbackCheckinAppIds[normalizedId];
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
        confirmBtn.textContent = pendingLabel;
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
    if (options.checkinContext) {
        markTestFeedbackCheckinPending(appId);
    }
    try {
        const response = await fetch(`${API_BASE}/feedback/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                app_id: appId,
                checkin_context: options.checkinContext || null,
            })
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
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(options.checkinContext ? 'feedbackBotRedirectCheckinToast' : 'feedbackBotRedirectToast', {}, lang));
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
                chip.classList.toggle('is-disabled', remaining <= 0);
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
        const response = await fetch(`${API_BASE}/projects/${appId}/feedback?owner_id=${userId}`);
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
            body: JSON.stringify({ owner_id: userId })
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

async function submitFeedbackReward() {
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

    try {
        const response = await fetch(`${API_BASE}/feedback/${_feedbackRewardTargetId}/reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                bust_amount: bustAmount,
                karma_amount: _feedbackRewardKarma,
                reply_text: replyText,
            })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackRewardSuccessToast', {}, lang));
        closeFeedbackRewardModal();
        await Promise.all([loadProjects(true), loadArchivedProjects()]);
        await openProjectFeedback(_activeProjectFeedbackAppId, _activeProjectFeedbackArchived);
    } catch (error) {
        console.error('Feedback reward error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
            body: JSON.stringify({
                user_id: userId,
                type: _feedbackType,
                text
            })
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

async function sendKarmaReward(appId, testerId, rewardType) {
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: testerId, type: rewardType })
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

async function confirmStart(id) {
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

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
        btn.innerText = t.confirmed;
        btn.style.backgroundColor = '#2e7d32';
        btn.style.color = '#ffffff';
        btn.disabled = true;
    }

    if (!card) return false;
    card.classList.add('removing');

    try {
        const response = await fetch(`${API_BASE}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                app_id: id,
                local_date: getLocalDate(),
                play_feedback_submitted: shouldSubmitPlayFeedback,
            })
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
                btn.innerText = t.confirmStart;
                btn.style.backgroundColor = 'var(--success-color)';
                btn.disabled = false;
            }

            if (result && typeof result === 'object') {
                var errorCode = getBackendErrorCode(result);
                if (errorCode === 'testing_not_found'
                    || errorCode === 'app_not_found'
                    || errorCode === 'test_or_app_not_found'
                    || errorCode === 'project_pending_completion') {
                    _handleInactiveCheckinCard(id, errorCode);
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
        const rewardBust = Number(result.reward_bust || result.earned_bust || 0);
        if (result.already_checked_today) {
            showToast(t.checkinAlreadyDone);
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

        var updatedTest = myTests.find(function(test) {
            return Number(test.id) === Number(id);
        });
        if (updatedTest) {
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
            btn.style.backgroundColor = 'var(--success-color)';
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
            body: JSON.stringify({ tester_id: userId })
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
            body: JSON.stringify({ tester_id: userId })
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
        var formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', String(window.App && window.App.userId || window.userId || 0));

        var apiBase = (window.App && window.App.API_BASE) || '';
        var resp = await fetch(apiBase + '/upload-icon', { method: 'POST', body: formData });
        var data = await resp.json();

        if (data && data.status === 'success' && data.url) {
            targetField.value = data.url;
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

window.isTestFeedbackCheckinPending = isTestFeedbackCheckinPending;
window.markTestFeedbackCheckinPending = markTestFeedbackCheckinPending;
window.applyTestFeedbackCheckinPendingUi = applyTestFeedbackCheckinPendingUi;
window.reapplyAllFeedbackCheckinPendingUi = reapplyAllFeedbackCheckinPendingUi;
window.getFeedbackCheckinPendingLabel = getFeedbackCheckinPendingLabel;