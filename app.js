/* Phase 5.1 — app.js remainder (after config/init/routing extracted to js/app-config.js) */
/* Contains: API fetchers, actions, features, bootstrap */


function _highlightProjectCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('project-card-' + normalizedId) || document.querySelector('[data-project-id="' + normalizedId + '"]');
    if (!card) return false;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-pulse');
    void card.offsetWidth;
    card.classList.add('highlight-pulse');
    setTimeout(function() {
        card.classList.remove('highlight-pulse');
    }, 2200);
    return true;
}

function _highlightArchivedProjectCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('archive-card-' + normalizedId) || document.querySelector('[data-archive-project-id="' + normalizedId + '"]');
    if (!card) return false;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-pulse');
    void card.offsetWidth;
    card.classList.add('highlight-pulse');
    setTimeout(function() {
        card.classList.remove('highlight-pulse');
    }, 2200);
    return true;
}

function openProjectDuplicateSupport() {
    var addModal = document.getElementById('add-modal');
    if (addModal) {
        addModal.classList.remove('active');
    }
    sendFeedback('question');
}

async function _focusAppInMiniApp(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;

    switchTab('tests');
    await loadTasks(true);
    _highlightTestCardWhenReady(normalizedId, 10);

    await new Promise(function(resolve) { setTimeout(resolve, 520); });
    if (_highlightTestCard(normalizedId)) {
        return true;
    }

    switchTab('projects');
    await Promise.allSettled([
        loadProjects(true),
        loadArchivedProjects({ silent: true })
    ]);

    await new Promise(function(resolve) { setTimeout(resolve, 260); });
    if (_highlightProjectCard(normalizedId)) {
        return true;
    }

    var hasArchivedProject = (archivedProjects || []).some(function(item) {
        return Number(item && item.app_id) === normalizedId;
    });
    if (hasArchivedProject) {
        var archiveList = document.getElementById('archive-list');
        if (archiveList && archiveList.classList.contains('is-collapsed') && typeof window.toggleArchive === 'function') {
            window.toggleArchive();
        }
        await new Promise(function(resolve) { setTimeout(resolve, 160); });
        if (_highlightArchivedProjectCard(normalizedId)) {
            return true;
        }
    }

    switchTab('market');
    if (typeof window.loadMarketData === 'function') {
        await window.loadMarketData(true);
    }
    await new Promise(function(resolve) { setTimeout(resolve, 320); });
    var marketCard = document.querySelector('[data-app-id="' + normalizedId + '"]');
    if (marketCard) {
        marketCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        marketCard.classList.add('highlight-pulse');
        setTimeout(function() { marketCard.classList.remove('highlight-pulse'); }, 2200);
        return true;
    }
    return false;
}

async function _handleGuestClaimIntent(intent) {
    if (!intent || !intent.guestAppId || intent.inviterId <= 0) {
        return false;
    }

    if (_isGuestClaimHandled(intent.rawStartParam)) {
        _clearStartappQueryParam();
        return true;
    }

    if (window.ui && typeof window.ui.showLoading === 'function') {
        window.ui.showLoading(window.t('guestClaimLoading', {}, lang));
    }

    var hideLoading = function() {
        if (window.ui && typeof window.ui.hideLoading === 'function') {
            window.ui.hideLoading();
        }
    };

    try {
        var response = await fetchWithRetry(`${API_BASE}/guest-apps/${encodeURIComponent(intent.guestAppId)}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inviter_id: intent.inviterId,
                init_data: tg.initData || '',
            }),
            timeoutMs: 25000,
        }, 2);

        var payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }

        var detail = String(payload && (payload.detail || payload.code) || '').trim();
        var isSuccessPayload = !!(payload && payload.status === 'success');

        if (!response.ok || !isSuccessPayload) {
            if (detail === 'own_link') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                showToast(window.t('guestClaimOwnLinkToast', {}, lang));
                return true;
            }
            if (detail === 'already_claimed') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                showToast(window.t('guestClaimAlreadyClaimedToast', {}, lang));
                return true;
            }
            if (detail === 'not_owner') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                if (typeof window.showGuestClaimStatusModal === 'function') {
                    window.showGuestClaimStatusModal({ variant: 'not-owner' });
                } else {
                    showToast(window.t('guestClaimNotOwnerTitle', {}, lang));
                }
                return true;
            }
            if (detail === 'invalid_init_data') {
                hideLoading();
                showToast(window.t('guestClaimAuthErrorToast', {}, lang));
                return true;
            }

            hideLoading();
            if (detail) {
                handleApiError(detail, payload && payload.details ? payload.details : {});
            } else {
                showToast(getApiErrorMessage(payload, 'networkError'));
            }
            return true;
        }

        _markGuestClaimHandled(intent.rawStartParam);
        _clearStartappQueryParam();

        await Promise.allSettled([
            loadTasks(true),
            loadProjects(true),
            loadIncomingOffers({ background: true }),
            loadArchivedProjects({ silent: true })
        ]);

        hideLoading();
        switchTab('tests');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (typeof window.showGuestClaimStatusModal === 'function') {
            window.showGuestClaimStatusModal({
                variant: 'success',
                appId: Number(payload && payload.new_app_id || 0),
            });
        }
        return true;
    } catch (error) {
        console.error('Guest claim intent error:', error);
        hideLoading();
        var message = String(error && error.message || '').trim();
        if (/^HTTP (500|502|503|504|520|522|524)$/.test(message)) {
            handleApiError('database_error');
        } else if (/^HTTP \d+$/.test(message) || message === 'Request timeout') {
            showToast(window.t('networkError', {}, lang));
        } else {
            showToast(getApiErrorMessage(message, 'networkError'));
        }
        return false;
    } finally {
        hideLoading();
    }
}

function scheduleDeferredBootstrap() {
    if (_deferredBootstrapStarted) return;
    _deferredBootstrapStarted = true;

    setTimeout(function() {
        runWhenIdle(function() {
            if (!isTabCurrentlyActive('projects')) {
                loadProjects(true).catch(function() {});
                loadArchivedProjects({ background: true, silent: true }).catch(function() {});
            }
        }, 1200);
    }, 250);

    setTimeout(function() {
        runWhenIdle(function() {
            if (!isTabCurrentlyActive('market')) {
                loadMutualFeed().catch(function() {});
                loadBountyFeed().catch(function() {});
            }
        }, 1600);
    }, 700);
}

function resetGuestProjectsPagination() {
    _guestProjectsVisibleCount = GUEST_PROJECTS_PAGE_SIZE;
}

function isGuestProjectAlreadyTracked(guest) {
    if (!guest) {
        return false;
    }

    var guestId = String(guest.id || '').trim();
    var guestPackageName = String(guest.package_name || guest.name || '').trim().toLowerCase();

    return Array.isArray(myTests) && myTests.some(function(test) {
        if (!test || !test.is_external) {
            return false;
        }

        var trackedGuestId = String(test.external_guest_app_id || '').trim();
        var trackedPackageName = String(test.external_package_name || test.package || '').trim().toLowerCase();
        if (guestId && trackedGuestId && guestId === trackedGuestId) {
            return true;
        }
        return !!guestPackageName && trackedPackageName === guestPackageName;
    });
}

function getFilteredGuestProjects() {
    if (!Array.isArray(guestProjects) || !guestProjects.length) {
        return [];
    }
    return guestProjects.filter(function(guest) {
        return !isGuestProjectAlreadyTracked(guest);
    });
}

function getVisibleGuestProjects() {
    var filteredGuestProjects = getFilteredGuestProjects();
    if (!filteredGuestProjects.length) {
        return [];
    }
    return filteredGuestProjects.slice(0, Math.max(GUEST_PROJECTS_PAGE_SIZE, Number(_guestProjectsVisibleCount || GUEST_PROJECTS_PAGE_SIZE)));
}

function canShowMoreGuestProjects() {
    return getFilteredGuestProjects().length > getVisibleGuestProjects().length;
}

function showMoreGuestProjects() {
    var filteredGuestProjects = getFilteredGuestProjects();
    if (!filteredGuestProjects.length || filteredGuestProjects.length <= _guestProjectsVisibleCount) {
        return;
    }
    _guestProjectsVisibleCount = Math.min(filteredGuestProjects.length, Number(_guestProjectsVisibleCount || GUEST_PROJECTS_PAGE_SIZE) + GUEST_PROJECTS_PAGE_SIZE);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
}

function normalizeGuestInviteLanguage(inviteLang, fallbackLang) {
    const fallback = String(fallbackLang || lang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en';
    const normalized = String(inviteLang || '').trim().toLowerCase();
    return normalized === 'ru' || normalized === 'en' ? normalized : fallback;
}

function getDefaultGuestInviteLanguage(guestLang) {
    const normalizedGuestLang = String(guestLang || '').trim().toUpperCase();
    if (normalizedGuestLang === 'RU' || normalizedGuestLang === 'EN') {
        return normalizedGuestLang.toLowerCase();
    }
    return normalizeGuestInviteLanguage(lang);
}

function buildGuestInviteDeepLink(guestAppId, inviterId, inviteLang, startappValue) {
    const normalizedLang = normalizeGuestInviteLanguage(inviteLang);
    const params = new URLSearchParams();
    params.set('startapp', String(startappValue || `guest_${guestAppId}_${inviterId}`));
    params.set('lang', normalizedLang);
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || TELEGRAM_RUNTIME_BOT_USERNAME || BOT_USERNAME);
    return `https://t.me/${botUsername}/${WEBAPP_SHORTNAME}?${params.toString()}`;
}

function buildProjectReferralStartLink(projectId) {
    var normalizedProjectId = Number(projectId || 0);
    var normalizedInviterId = Number(userId || 0);
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || BOT_USERNAME);
    if (normalizedProjectId <= 0 || normalizedInviterId <= 0) {
        return `https://t.me/${botUsername}?start=mutual_${normalizedProjectId}`;
    }
    return `https://t.me/${botUsername}?start=ref_mutual_${normalizedInviterId}_${normalizedProjectId}`;
}

function buildExternalClaimStartLink(packageName) {
    var normalizedPackage = String(packageName || '').trim();
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || BOT_USERNAME);
    var normalizedInviterId = Number(userId || 0);
    if (!normalizedPackage || normalizedInviterId <= 0) {
        return `https://t.me/${botUsername}?start=claim_app_${encodeURIComponent(normalizedPackage)}`;
    }
    return `https://t.me/${botUsername}?start=ref_claim_${normalizedInviterId}_${encodeURIComponent(normalizedPackage)}`;
}

function extractPackageNameFromPlayUrl(playUrl) {
    var normalizedUrl = String(playUrl || '').trim();
    if (!normalizedUrl || normalizedUrl.indexOf('id=') === -1) {
        return '';
    }

    try {
        var parsedUrl = new URL(normalizedUrl);
        return String(parsedUrl.searchParams.get('id') || '').trim();
    } catch (error) {
        console.error('Manual external Play URL parse error:', error);
        return '';
    }
}

async function submitManualExternalTrack(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    var form = document.getElementById('manual-external-add-form');
    if (form && typeof form.reportValidity === 'function' && !form.reportValidity()) {
        return false;
    }

    var sourceProjectInput = document.getElementById('manual-external-source-project-id');
    var appNameInput = document.getElementById('manual-external-app-name');
    var playUrlInput = document.getElementById('manual-external-play-url');
    var ownerUsernameInput = document.getElementById('manual-external-owner-username');
    var groupUrlInput = document.getElementById('manual-external-group-url');
    var testingDayInput = document.getElementById('manual-external-testing-day');
    var mutualCheckbox = document.getElementById('manual-external-is-mutual');

    var sourceProjectId = Number(sourceProjectInput && sourceProjectInput.value || 0);
    if (!sourceProjectId) {
        showToast(window.t('manualExternalProjectMissing', {}, lang));
        return false;
    }

    var playUrl = String(playUrlInput && playUrlInput.value || '').trim();
    var appName = String(appNameInput && appNameInput.value || '').trim();
    if (playUrl.indexOf('id=') === -1) {
        showToast(window.t('invalidPlayLink', {}, lang));
        return false;
    }

    var packageName = extractPackageNameFromPlayUrl(playUrl);
    if (!packageName) {
        showToast(window.t('invalidPlayLink', {}, lang));
        return false;
    }

    if (typeof window.normalizeManualExternalOwnerNicknameInput === 'function') {
        window.normalizeManualExternalOwnerNicknameInput(ownerUsernameInput);
    }
    var ownerUsername = String(ownerUsernameInput && ownerUsernameInput.value || '').trim();
    if (!ownerUsername || ownerUsername === '@') {
        showToast(window.t('manualExternalInvalidOwnerUsername', {}, lang));
        if (ownerUsernameInput && typeof ownerUsernameInput.focus === 'function') {
            ownerUsernameInput.focus();
        }
        return false;
    }

    var groupUrl = String(groupUrlInput && groupUrlInput.value || '').trim();
    if (groupUrl && !isValidGoogleGroupUrl(groupUrl)) {
        handleApiError('invalid_google_group_url');
        return false;
    }

    var testingDay = Math.max(1, Math.min(14, Number(testingDayInput && testingDayInput.value || 1) || 1));
    if (typeof window.updateManualExternalTestingDayValue === 'function') {
        window.updateManualExternalTestingDayValue(testingDay);
    }

    var isMutual = !!(mutualCheckbox && mutualCheckbox.checked);

    try {
        var response = await fetchWithRetry(`${API_BASE}/external-tracks/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                source_app_id: sourceProjectId,
                app_name: appName || null,
                play_store_url: playUrl,
                package_name: packageName,
                owner_username: ownerUsername,
                google_group_url: groupUrl || null,
                testing_day: testingDay,
                is_mutual: isMutual,
            })
        }, 1);
        var result = await response.json();
        if (!response.ok || !result || result.status !== 'success') {
            var backendCode = getBackendErrorCode(result);
            if (backendCode === 'user_already_registered' || Number(response.status || 0) === 409) {
                var registeredOwnerMessage = window.t('manualExternalOwnerAlreadyRegisteredAlert', {}, lang);
                if (window.tg && typeof window.tg.showAlert === 'function') {
                    window.tg.showAlert(registeredOwnerMessage);
                } else if (typeof window.showCustomAlert === 'function') {
                    window.showCustomAlert(registeredOwnerMessage);
                } else {
                    alert(registeredOwnerMessage);
                }
                if (ownerUsernameInput && typeof ownerUsernameInput.focus === 'function') {
                    ownerUsernameInput.focus();
                }
                return false;
            }
            handleApiError(backendCode, result && result.details ? result.details : {});
            return false;
        }

        if (typeof window.closeManualExternalAddModal === 'function') {
            window.closeManualExternalAddModal();
        }
        if (typeof window.resetManualExternalAddForm === 'function') {
            window.resetManualExternalAddForm();
        }
        showToast(window.t('manualExternalAddedToast', {}, lang));
        await refreshGuestProjectSlices();
        return true;
    } catch (error) {
        console.error('Manual external track submit failed:', error);
        showToast(window.t('networkError', {}, lang));
        return false;
    }
}

async function refreshGuestProjectSlices() {
    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
}

function applyEditedGuestProjectToLocalState(result) {
    var normalizedPackage = String(result && result.package_name || '').trim();
    var appName = String(result && result.app_name || '').trim();
    var displayName = appName || normalizedPackage;
    var ownerUsername = String(result && result.owner_username || '').trim().replace(/^@+/, '');
    var groupUrl = String(result && result.google_group_url || '').trim();
    var playStoreUrl = String(result && result.play_store_url || '').trim();
    var addedByTesterId = Number(result && result.added_by_tester_id || 0);

    myTests.forEach(function(test) {
        var testPackage = String(test && (test.external_package_name || test.package) || '').trim();
        if (!test || !test.is_external || testPackage !== normalizedPackage) {
            return;
        }
        test.name = displayName;
        test.owner_username = ownerUsername;
        test.google_group_url = groupUrl;
        test.play_store_url = playStoreUrl;
        test.added_by_tester_id = addedByTesterId;
        if (Number(result && result.owner_telegram_id || 0) > 0) {
            test.owner_id = Number(result.owner_telegram_id || 0);
            test.external_owner_telegram_id = Number(result.owner_telegram_id || 0);
        }
    });

    guestProjects = (Array.isArray(guestProjects) ? guestProjects : []).map(function(project) {
        var projectPackage = String(project && (project.package_name || project.name) || '').trim();
        if (!project || projectPackage !== normalizedPackage) {
            return project;
        }
        return {
            ...project,
            name: displayName,
            app_name: appName,
            owner_username: ownerUsername,
            google_group_url: groupUrl,
            play_store_url: playStoreUrl,
            added_by_tester_id: addedByTesterId,
            owner_telegram_id: Number(result && result.owner_telegram_id || project.owner_telegram_id || 0),
            owner_id: Number(result && result.owner_telegram_id || project.owner_id || 0),
        };
    });

    persistTestsCacheSnapshot();
    renderTests(true);
    if (typeof renderGuestProjectsSection === 'function') {
        renderGuestProjectsSection(true);
    }
    refreshOpenModals();
}

async function submitEditGuestProject(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }

    var form = document.getElementById('edit-guest-project-form');
    if (form && typeof form.reportValidity === 'function' && !form.reportValidity()) {
        return false;
    }

    var packageInput = document.getElementById('edit-guest-project-package-name');
    var appNameInput = document.getElementById('edit-guest-project-app-name');
    var playUrlInput = document.getElementById('edit-guest-project-play-url');
    var ownerUsernameInput = document.getElementById('edit-guest-project-owner-username');
    var groupUrlInput = document.getElementById('edit-guest-project-group-url');
    var testIdInput = document.getElementById('edit-guest-project-test-id');

    var packageName = String(packageInput && packageInput.value || '').trim();
    if (!packageName) {
        handleApiError('guest_app_not_found');
        return false;
    }

    var playUrl = String(playUrlInput && playUrlInput.value || '').trim();
    var appName = String(appNameInput && appNameInput.value || '').trim();
    if (playUrl.indexOf('id=') === -1 || extractPackageNameFromPlayUrl(playUrl) !== packageName) {
        showToast(window.t('invalidPlayLink', {}, lang));
        return false;
    }

    if (typeof window.normalizeManualExternalOwnerNicknameInput === 'function') {
        window.normalizeManualExternalOwnerNicknameInput(ownerUsernameInput);
    }
    var ownerUsername = String(ownerUsernameInput && ownerUsernameInput.value || '').trim();
    if (!ownerUsername || ownerUsername === '@') {
        showToast(window.t('manualExternalInvalidOwnerUsername', {}, lang));
        return false;
    }

    var groupUrl = String(groupUrlInput && groupUrlInput.value || '').trim();
    if (groupUrl && !isValidGoogleGroupUrl(groupUrl)) {
        handleApiError('invalid_google_group_url');
        return false;
    }

    try {
        var response = await fetchWithRetry(`${API_BASE}/guest-apps/${encodeURIComponent(packageName)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                app_name: appName || null,
                owner_username: ownerUsername,
                google_group_url: groupUrl || null,
                play_store_url: playUrl,
            })
        }, 1);
        var result = await response.json();
        if (!response.ok || !result || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return false;
        }

        applyEditedGuestProjectToLocalState(result);
        if (typeof window.closeEditGuestProjectModal === 'function') {
            window.closeEditGuestProjectModal();
        }
        if (typeof window.resetEditGuestProjectForm === 'function') {
            window.resetEditGuestProjectForm();
        }
        showToast(window.t('guestProjectEditSaveToast', {}, lang));
        await refreshGuestProjectSlices();
        var editedTestId = Number(testIdInput && testIdInput.value || 0);
        if (editedTestId) {
            var detailsModal = document.getElementById('project-details-modal');
            if (detailsModal) {
                detailsModal.dataset.appId = String(editedTestId);
            }
        }
        return true;
    } catch (error) {
        console.error('Guest project edit submit failed:', error);
        showToast(window.t('networkError', {}, lang));
        return false;
    }
}

async function startExternalTrackingSession(payload) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    return result;
}

async function submitExternalTrackingProof(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId, local_date: getLocalDate() })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    var test = myTests.find(function(item) { return Number(item.id) === Number(testId); });
    if (test) {
        setTimerReadyForConfirm(testId, false, false, '');
        test.last_check_date = result.last_check_date || getLocalDate();
        test.checkins_count = Number(result.checkins_count || test.checkins_count || 0);
        test.daily_timeline = String(result.daily_timeline || test.daily_timeline || '');
        test.testing_days = Math.max(Number(test.testing_days || 0), Number(result.testing_day || 0));
        recomputeLocalTestState(test);
        persistTestsCacheSnapshot();
        renderTests(true);
    }

    return result;
}

async function submitExternalDailyCheckin(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId, local_date: getLocalDate() })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    var test = myTests.find(function(item) { return Number(item.id) === Number(testId); });
    if (test) {
        setTimerReadyForConfirm(testId, false, false, '');
        test.last_check_date = result.last_check_date || getLocalDate();
        test.testing_days = Math.max(Number(test.testing_days || 0), Number(result.testing_day || 0));
        recomputeLocalTestState(test);
        persistTestsCacheSnapshot();
        renderTests(true);
    }

    return result;
}

async function cancelExternalTracking(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    myTests = (Array.isArray(myTests) ? myTests : []).filter(function(item) {
        return Number(item.id) !== Number(testId);
    });
    persistTestsCacheSnapshot();

    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (window.renderTests) {
        window.renderTests(true);
    }

    return result;
}

async function unlinkGuestRelationship(progressId, options) {
    options = options || {};
    var safeProgressId = Number(progressId || 0);
    if (safeProgressId <= 0) {
        return null;
    }

    var requestBody = {
        user_id: userId,
        remove_from_my_tests: options.removeFromMyTests !== false,
        remove_from_my_testers: options.removeFromMyTesters !== false,
        source_app_id: Number(options.sourceAppId || 0) || null,
    };

    const response = await fetchWithRetry(`${API_BASE}/guest-links/${safeProgressId}/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    if (requestBody.remove_from_my_tests) {
        myTests = (Array.isArray(myTests) ? myTests : []).filter(function(item) {
            return Number(item.progress_id || 0) !== safeProgressId;
        });
        persistTestsCacheSnapshot();
    }

    if (requestBody.remove_from_my_testers) {
        var sourceAppId = Number(requestBody.source_app_id || 0);
        myProjects = (Array.isArray(myProjects) ? myProjects : []).map(function(project) {
            if (sourceAppId > 0 && Number(project.id || 0) !== sourceAppId) {
                return project;
            }
            var currentTesters = Array.isArray(project.testers) ? project.testers : [];
            var nextTesters = currentTesters.filter(function(tester) {
                return Number(tester.progress_id || 0) !== safeProgressId;
            });
            if (nextTesters.length === currentTesters.length) {
                return project;
            }
            return Object.assign({}, project, { testers: nextTesters });
        });
    }

    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
    if (typeof refreshOpenModals === 'function') {
        refreshOpenModals();
    }
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (window.renderTests) {
        window.renderTests(true);
    }
    if (window.renderProjects) {
        window.renderProjects(true);
    }

    return result;
}

async function toggleGuestProjectsAccordion(forceExpanded) {
    const nextExpanded = typeof forceExpanded === 'boolean'
        ? forceExpanded
        : !_guestProjectsExpanded;
    _guestProjectsExpanded = !!nextExpanded;
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (_guestProjectsExpanded) {
        await loadGuestApps({ force: !_guestProjectsLoadedOnce });
    }
}

function _clearGuestProjectTargetHighlights() {
    if (_guestProjectTargetHighlightTimer) {
        clearTimeout(_guestProjectTargetHighlightTimer);
        _guestProjectTargetHighlightTimer = null;
    }
    document.querySelectorAll('#guest-projects-list .guest-project-cta-btn.highlight-target').forEach(function(button) {
        button.classList.remove('highlight-target');
    });
}

function _applyGuestProjectTargetHighlights() {
    const section = document.getElementById('guest-projects-section');
    const list = document.getElementById('guest-projects-list');
    const firstCard = list ? list.querySelector('[data-guest-app-id]') : null;
    const targetButtons = list ? Array.from(list.querySelectorAll('.guest-project-cta-btn')) : [];
    const scrollTarget = firstCard || section || list;

    if (!scrollTarget) {
        return false;
    }

    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!targetButtons.length) {
        _clearGuestProjectTargetHighlights();
        return true;
    }

    _clearGuestProjectTargetHighlights();
    targetButtons.forEach(function(button) {
        button.classList.add('highlight-target');
    });
    _guestProjectTargetHighlightTimer = setTimeout(function() {
        targetButtons.forEach(function(button) {
            button.classList.remove('highlight-target');
        });
        _guestProjectTargetHighlightTimer = null;
    }, 2600);
    return true;
}

function _focusGuestProjectSearchTargets(attempt) {
    const nextAttempt = Number(attempt || 0);
    const list = document.getElementById('guest-projects-list');
    const hasCards = !!(list && list.querySelector('[data-guest-app-id]'));

    if (!hasCards && nextAttempt < 6) {
        setTimeout(function() {
            _focusGuestProjectSearchTargets(nextAttempt + 1);
        }, 140);
        return;
    }

    if (_applyGuestProjectTargetHighlights() && nextAttempt < 2) {
        setTimeout(function() {
            _applyGuestProjectTargetHighlights();
        }, 420 * (nextAttempt + 1));
    }
}

async function openGuestProjectsTesterSearch(projectId) {
    const sourceProjectId = Number(projectId || 0);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        if (typeof window.switchTab === 'function') {
            window.switchTab('market');
        }
        if (typeof window.switchMarketSubTab === 'function') {
            window.switchMarketSubTab('seeking');
        }

        await toggleGuestProjectsAccordion(true);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _focusGuestProjectSearchTargets(0);
            });
        });
    } catch (error) {
        console.error('Open guest projects tester search failed sourceProject=' + sourceProjectId + ':', error);
        if (typeof window.showToast === 'function') {
            window.showToast(window.t('guestProjectsLoadError', {}, lang));
        }
    }
}

async function updateGuestProjectsFilter(field, value) {
    const normalizedField = String(field || '').trim();
    if (normalizedField !== 'lang' && normalizedField !== 'category') {
        return;
    }
    _guestProjectsFilters[normalizedField] = normalizedField === 'lang'
        ? normalizeGuestProjectsFilterLang(value)
        : String(value || 'ALL').toUpperCase();
    resetGuestProjectsPagination();
    _guestProjectsLoadError = false;
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (_guestProjectsExpanded) {
        await loadGuestApps({ force: true });
    }
}

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
    if (joinType === 'direct') return window.t('testerSourceDirectFull', {}, resolvedLang);
    return window.t('testerSourceInviteFull', {}, resolvedLang);
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

function isValidEmail(value) {
    var email = String(value || '').trim();
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidGoogleGroupUrl(value) {
    var url = String(value || '').trim();
    if (!url) return false;
    return /^https:\/\/groups\.google\.com(?:\/u\/\d+)?\/g\/[A-Za-z0-9._-]+\/?$/.test(url);
}

function rerenderReliabilityUi() {
    if (typeof window.renderReliabilitySummaryWidget === 'function') {
        window.renderReliabilitySummaryWidget(true);
    }
    if (typeof window.renderReliabilityAlphaModal === 'function') {
        window.renderReliabilityAlphaModal();
    } else if (typeof window.renderReliabilityDashboard === 'function') {
        window.renderReliabilityDashboard();
    }
}

function getLocalDate() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function getRuDaysWord(days) {
    const d10 = days % 10;
    const d100 = days % 100;
    if (d10 === 1 && d100 !== 11) return 'день';
    if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'дня';
    return 'дней';
}

function formatEditProjectCreatedAt(project) {
    if (!project || !project.created_at) return '';
    const createdDate = new Date(project.created_at);
    if (Number.isNaN(createdDate.getTime())) return '';

    const msInDay = 1000 * 60 * 60 * 24;
    const todayDate = new Date(getLocalDate());
    const createdOnlyDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const daysAgo = Math.max(0, Math.floor((todayDate - createdOnlyDate) / msInDay));

    if (lang === 'ru') {
        const formattedDate = new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(createdDate).replace(/\s?г\.?$/, '');
        return t.editAddedToPlatform
            .replace('{date}', formattedDate)
            .replace('{days}', daysAgo)
            .replace('{days_word}', getRuDaysWord(daysAgo));
    }

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(createdDate);
    return t.editAddedToPlatform
        .replace('{date}', formattedDate)
        .replace('{days}', daysAgo);
}

function formatAmountValue(value, digits) {
    const numeric = Number(value || 0);
    const precision = typeof digits === 'number' ? digits : 1;
    if (!Number.isFinite(numeric)) return '0';
    const rounded = Number(numeric.toFixed(precision));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(precision);
}

function formatBustAmount(value) {
    return `${formatAmountValue(value, 1)} $BUST`;
}

function getProjectFormConfig(formKey) {
    return formKey === 'edit'
        ? {
            modeInput: 'edit-mode',
            mutualInput: 'edit-limit-mutual',
            bountyInput: 'edit-limit-bounty',
            rewardInput: 'edit-bounty-per-tester',
            mutualPanel: 'edit-mutual-settings',
            bountyPanel: 'edit-bounty-settings',
            calcPerTester: 'edit-calc-per-tester',
            calcDaily: 'edit-calc-daily',
            calcHold: 'edit-calc-hold',
            calcTotal: 'edit-calc-total',
            balanceBadge: 'edit-balance-badge-value',
            modeButtons: {
                mutual: 'edit-mode-mutual',
                bounty: 'edit-mode-bounty',
                hybrid: 'edit-mode-hybrid'
            }
        }
        : {
            modeInput: 'app-mode',
            mutualInput: 'app-limit-mutual',
            bountyInput: 'app-limit-bounty',
            rewardInput: 'app-bounty-per-tester',
            mutualPanel: 'add-mutual-settings',
            bountyPanel: 'add-bounty-settings',
            calcPerTester: 'add-calc-per-tester',
            calcDaily: 'add-calc-daily',
            calcHold: 'add-calc-hold',
            calcTotal: 'add-calc-total',
            balanceBadge: 'add-balance-badge-value',
            modeButtons: {
                mutual: 'add-mode-mutual',
                bounty: 'add-mode-bounty',
                hybrid: 'add-mode-hybrid'
            }
        };
}

function getProjectPricingState(formKey) {
    const config = getProjectFormConfig(formKey);
    const mode = document.getElementById(config.modeInput).value || 'mutual';
    const mutualInput = document.getElementById(config.mutualInput);
    const bountyInput = document.getElementById(config.bountyInput);
    const rewardInput = document.getElementById(config.rewardInput);
    const limitMutual = mutualInput && mutualInput.value !== '' && Number.isFinite(mutualInput.valueAsNumber)
        ? Math.trunc(mutualInput.valueAsNumber)
        : 0;
    const limitBounty = bountyInput && bountyInput.value !== '' && Number.isFinite(bountyInput.valueAsNumber)
        ? Math.trunc(bountyInput.valueAsNumber)
        : 0;
    const bountyPerTester = rewardInput && rewardInput.value !== '' && Number.isFinite(rewardInput.valueAsNumber)
        ? Math.trunc(rewardInput.valueAsNumber)
        : 0;
    return { mode, limitMutual, limitBounty, bountyPerTester };
}

function setProjectMode(formKey, mode) {
    const config = getProjectFormConfig(formKey);
    document.getElementById(config.modeInput).value = mode;
    Object.entries(config.modeButtons).forEach(([key, id]) => {
        document.getElementById(id).classList.toggle('active', key === mode);
    });
    updateProjectPricing(formKey);
}

function updateProjectPricing(formKey) {
    const config = getProjectFormConfig(formKey);
    const state = getProjectPricingState(formKey);
    const showMutual = state.mode === 'mutual' || state.mode === 'hybrid';
    const showBounty = state.mode === 'bounty' || state.mode === 'hybrid';
    const mutualPanel = document.getElementById(config.mutualPanel);
    const bountyPanel = document.getElementById(config.bountyPanel);
    mutualPanel.classList.toggle('active', showMutual);
    bountyPanel.classList.toggle('active', showBounty);

    const rewardPerTester = showBounty ? state.bountyPerTester : 0;
    const dailyShare = rewardPerTester * 0.65;
    const holdBonus = rewardPerTester * 0.35;
    const totalCost = showBounty ? state.limitBounty * rewardPerTester : 0;
    const bustBalance = visibilityStats && typeof visibilityStats.balance_bust !== 'undefined'
        ? visibilityStats.balance_bust
        : 0;

    document.getElementById(config.calcPerTester).innerText = formatBustAmount(rewardPerTester);
    document.getElementById(config.calcDaily).innerText = formatBustAmount(dailyShare);
    document.getElementById(config.calcHold).innerText = formatBustAmount(holdBonus);
    document.getElementById(config.calcTotal).innerText = formatBustAmount(totalCost);
    document.getElementById(config.balanceBadge).innerText = formatBustAmount(bustBalance);
}

function resetProjectForms() {
    document.getElementById('app-mode').value = 'mutual';
    document.getElementById('app-target-lang').value = 'ALL';
    document.getElementById('app-limit-mutual').value = '12';
    document.getElementById('app-limit-bounty').value = '12';
    document.getElementById('app-bounty-per-tester').value = '100';
    document.getElementById('app-request-reviews').checked = false;
    document.getElementById('edit-mode').value = 'mutual';
    document.getElementById('edit-target-lang').value = 'ALL';
    document.getElementById('edit-limit-mutual').value = '12';
    document.getElementById('edit-limit-bounty').value = '12';
    document.getElementById('edit-bounty-per-tester').value = '100';
    document.getElementById('edit-request-reviews').checked = true;
    setProjectMode('add', 'mutual');
    setProjectMode('edit', 'mutual');
    setProjectTargetLang('add', 'ALL');
    setProjectTargetLang('edit', 'ALL');
}

function setProjectTargetLang(formKey, targetLang) {
    const normalized = ['RU', 'EN', 'ALL'].includes(String(targetLang || '').toUpperCase())
        ? String(targetLang).toUpperCase()
        : 'ALL';
    const input = document.getElementById(`${formKey}-target-lang`);
    if (input) {
        input.value = normalized;
    }
    ['ru', 'en', 'all'].forEach((code) => {
        const button = document.getElementById(`${formKey}-target-lang-${code}`);
        if (button) {
            button.classList.toggle('active', code.toUpperCase() === normalized);
        }
    });
}

function validateProjectPricing(formKey) {
    const { mode, limitMutual, limitBounty, bountyPerTester } = getProjectPricingState(formKey);
    if (!['mutual', 'bounty', 'hybrid'].includes(mode)) return t.invalidModeSelection;
    if ((mode === 'mutual' || mode === 'hybrid') && limitMutual < 1) return t.mutualLimitInvalid;
    if ((mode === 'bounty' || mode === 'hybrid') && limitBounty < 1) return t.bountyLimitInvalid;
    if ((mode === 'bounty' || mode === 'hybrid') && bountyPerTester < 100) return t.bountyPerTesterInvalid;
    return null;
}

function buildProjectPricingPayload(formKey) {
    const error = validateProjectPricing(formKey);
    if (error) {
        if (tg.showAlert) tg.showAlert(error);
        else alert(error);
        return null;
    }
    const { mode, limitMutual, limitBounty, bountyPerTester } = getProjectPricingState(formKey);
    return {
        mode,
        limit_mutual: mode === 'bounty' ? 0 : limitMutual,
        limit_bounty: mode === 'bounty' || mode === 'hybrid' ? limitBounty : 0,
        bounty_per_tester: mode === 'bounty' || mode === 'hybrid' ? bountyPerTester : 0
    };
}

function refreshLanguageUi() {
    var selectedLanguage = getSelectedAppLanguage();
    applyDocumentLanguageSettings(selectedLanguage);

    if (window.updateTranslations) {
        window.updateTranslations(lang);
    }

    renderAutoTranslateLanguageOptions();

    updateProjectPricing('add');
    updateProjectPricing('edit');
    renderEditCreatedAtMeta();

    // Update language label in system menu tab
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) {
        langLabel.innerText = getLanguageShortLabel(selectedLanguage);
    }

    // Update active language button in segmented control
    const langBtnRu = document.getElementById('lang-btn-ru');
    const langBtnEn = document.getElementById('lang-btn-en');
    if (langBtnRu && langBtnEn) {
        langBtnRu.classList.toggle('active', selectedLanguage === 'ru');
        langBtnEn.classList.toggle('active', selectedLanguage === 'en');
    }

    const chipTexts = [
        window.t('chipBrowse', {}, lang),
        window.t('chipScreenshot3', {}, lang),
        window.t('chipJustOpen', {}, lang),
        window.t('chipTryFeatures', {}, lang),
        window.t('chipLeaveReview', {}, lang)
    ];
    const renderChips = (containerId, textareaId) => {
        const element = document.getElementById(containerId);
        if (!element) return;
        element.innerHTML = chipTexts
            .map(chipText => `<button type="button" class="chip" onclick="insertChip('${textareaId}', this.dataset.text)" data-text="${chipText.replace(/"/g, '&quot;')}">${chipText}</button>`)
            .join('');
    };
    renderChips('chips-instructions', 'app-instructions');
    renderChips('chips-edit-instructions', 'edit-description');

    const toggleBtn = document.getElementById('events-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = eventsExpanded ? window.t('pulseCollapse', {}, lang) : window.t('pulseExpand', {}, lang);
    }

    const select = document.getElementById('attach-project-select');
    if (select && select.options.length > 0 && !select.value) {
        select.options[0].text = window.t('contactSelectPlaceholder', {}, lang);
    }

    syncAutoAcceptToggleUi();
}

function syncAutoAcceptToggleUi() {
    var toggle = document.getElementById('auto-accept-mutual-toggle');
    if (!toggle) return;
    toggle.checked = !!_autoAcceptMutualEnabled;
    toggle.disabled = !!_autoAcceptToggleInFlight;
}

async function loadUserProfilePreferences() {
    try {
        var response = await fetchWithRetry(API_BASE + '/users/' + userId + '/profile');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var profile = await response.json();
        _autoAcceptMutualEnabled = !!profile.auto_accept_mutual;
        syncAutoAcceptToggleUi();
        window.App.autoAcceptMutual = _autoAcceptMutualEnabled;
    } catch (error) {
        console.error('Profile preferences load error:', error);
        syncAutoAcceptToggleUi();
    }
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

function toggleSystemMenu() {
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        menu.classList.toggle('active');
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function applyLanguage(newLang, options) {
    var normalizedLang = normalizeAppLanguage(newLang);
    var settings = options || {};
    var previousSelectedLanguage = getSelectedAppLanguage();
    var hadAutoTranslate = isAutoTranslatedLanguage(previousSelectedLanguage) || hasGoogleTranslateCookie();

    if (!normalizedLang) {
        refreshLanguageUi();
        return;
    }
    if (!settings.force && normalizedLang === previousSelectedLanguage) {
        refreshLanguageUi();
        return;
    }

    persistLanguageSelection(normalizedLang);

    if (!settings.skipServerSync) {
        sendLanguagePreferenceToServer(getServerSafeLanguage(normalizedLang));
    }

    if (isAutoTranslatedLanguage(normalizedLang)) {
        setGoogleTranslateCookie(normalizedLang);
        refreshLanguageUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        window.location.reload();
        return;
    }

    clearGoogleTranslateCookies();

    if (hadAutoTranslate) {
        refreshLanguageUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        window.location.reload();
        return;
    }

    refreshLanguageUi();
    rerenderDynamicUi();
    refreshActiveTabData();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function getUserSystemTimezone() {
    try {
        var resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var normalized = String(resolved || '').trim();
        return normalized || 'UTC';
    } catch (error) {
        console.warn('Timezone detection failed:', error);
        return 'UTC';
    }
}

async function syncUserTimezone(force) {
    var detectedTimezone = getUserSystemTimezone();
    var cachedTimezone = String(localStorage.getItem(USER_TIMEZONE_STORAGE_KEY) || '').trim();
    if (!force && cachedTimezone === detectedTimezone) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/timezone`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timezone: detectedTimezone })
        });
        if (!response.ok) {
            return;
        }
        localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, detectedTimezone);
    } catch (error) {
        console.warn('Timezone sync failed:', error);
    }
}

async function syncTelegramProfile() {
    if (!tg || !tg.initData || !hasTelegramUsername()) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/users/me/profile/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: tg.initData || '' })
        });

        var result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok || !result || result.status !== 'success') {
            if (getBackendErrorCode(result) === 'username_required') {
                showNoUsernameOverlay();
            }
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Telegram profile sync failed:', error);
        return false;
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

function _openBotDm() {
    try {
        if (tg.openTelegramLink) {
            tg.openTelegramLink(BOT_CHAT_URL);
            return true;
        }
    } catch (error) {}
    try {
        if (tg.openLink) {
            tg.openLink(BOT_CHAT_URL);
            return true;
        }
    } catch (error) {}
    try {
        window.location.href = BOT_CHAT_URL;
        return true;
    } catch (error) {}
    return false;
}

function redirectToBotDmAndClose() {
    var opened = _openBotDm();
    // Allow Telegram to process deep-link before closing Mini App.
    setTimeout(function() {
        try {
            if (tg.close) tg.close();
        } catch (error) {}
    }, opened ? 700 : 1000);
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
        var payload = _timerReadyState[key];
        _setTimerButtonReady(Number(key), !!(payload && payload.isScreenshot), (payload && payload.ownerUsername) || '');
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
        var remaining = Math.ceil((_timerEndTimestamp - Date.now()) / 1000);
        var liveBtn = document.getElementById('btn-confirm-' + id);
        if (remaining <= 0) {
            _syncActiveTimerState();
            return;
        }
        if (liveBtn) {
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

function refreshMarketAfterMassInvite() {
    resetMarketFeedStates();
    resetMarketFetchThrottle();
    setMarketCache(null);
}

async function startMassInvite(projectId) {
    if (!projectId) return null;

    var actionKey = 'mass_invite_start_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    var btn = document.getElementById('mass-invite-btn');
    var originalLabel = btn ? btn.textContent : '';
    if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
    }

    _apiStart();
    try {
        var response = await fetch(`${API_BASE}/projects/${projectId}/mass_invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data && data.details ? data.details : {});
            return null;
        }

        var sentCount = Number(data.sent_count || 0);
        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project && sentCount > 0) {
            project.last_mass_invite_at = data.last_mass_invite_at || new Date().toISOString();
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (sentCount > 0) {
            showToast(window.t('massInviteLaunchSuccess', { count: sentCount }, lang));
            renderProjects(true);
            refreshOpenModals();
            await loadProjects(true);
            refreshMarketAfterMassInvite();
            await Promise.all([loadMutualFeed(), loadBountyFeed()]);
        } else {
            showToast(window.t('massInviteNoCandidates', {}, lang));
            await loadProjects(true);
        }
        return data;
    } catch (error) {
        console.error('Mass invite launch error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        if (btn) {
            btn.classList.remove('is-loading');
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function resetMassInviteCooldown(projectId) {
    if (!projectId) return null;

    var actionKey = 'mass_invite_reset_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    _apiStart();
    try {
        var response = await fetch(`${API_BASE}/projects/${projectId}/mass_invite/reset_cooldown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data && data.details ? data.details : {});
            return null;
        }

        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project) {
            project.last_mass_invite_at = null;
        }
        if (typeof data.balance_bust !== 'undefined') {
            visibilityStats.balance_bust = Number(data.balance_bust || 0);
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('massInviteResetSuccess', {}, lang));
        renderProjects(true);
        refreshOpenModals();
        loadProjects(true).catch(function() {});
        return data;
    } catch (error) {
        console.error('Mass invite cooldown reset error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
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
    const eligible = typeof window.getAvailableMutualProjectsForOwner === 'function'
        ? window.getAvailableMutualProjectsForOwner(targetOwnerId)
        : myProjects.filter(function(project) {
            return project && (project.mode === 'mutual' || project.mode === 'hybrid') && project.id;
        });
    const blockedProjects = await fetchBlockedOfferProjects(targetOwnerId, true);
    showProjectSelectModal(eligible, targetAppId, targetOwnerId, {
        sourceButton: sourceButton,
        targetAppId: targetAppId,
        targetOwnerId: targetOwnerId,
        blockedProjects: blockedProjects,
    });
}

async function joinDirect(appId) {
    var actionKey = 'joinDirect_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    const rollback = [...mutualSeeking];
    mutualSeeking = mutualSeeking.filter(function(card) { return card.app_id !== appId; });
    renderMutualFeed();
    closeProjectSelectModal();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, allow_over_limit: false, join_type: 'direct' })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            mutualSeeking = rollback;
            renderMutualFeed();
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadMutualFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join direct error:', error);
        mutualSeeking = rollback;
        renderMutualFeed();
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
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
            switchTab('tests');
            await Promise.allSettled([
                loadTasks(true),
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

async function joinMutual(appId, allowOverLimit = false) {
    var actionKey = 'joinMutual_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    // Optimistic UI: remove card immediately, rollback on error
    const rollback = [...mutualSeeking];
    const rollbackPrelaunch = [...mutualPrelaunch];
    const rollbackReturns = [...mutualReturns];
    mutualSeeking = mutualSeeking.filter(c => c.app_id !== appId);
    mutualPrelaunch = mutualPrelaunch.filter(c => c.app_id !== appId);
    mutualReturns = mutualReturns.filter(c => c.app_id !== appId);
    renderMutualFeed();
    if (window.renderMutualReturns) {
        window.renderMutualReturns(mutualReturns, true);
    }
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, allow_over_limit: allowOverLimit })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            mutualSeeking = rollback;
            mutualPrelaunch = rollbackPrelaunch;
            mutualReturns = rollbackReturns;
            renderMutualFeed();
            if (window.renderMutualReturns) {
                window.renderMutualReturns(mutualReturns, true);
            }
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadMutualFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join mutual error:', error);
        mutualSeeking = rollback;
        mutualPrelaunch = rollbackPrelaunch;
        mutualReturns = rollbackReturns;
        renderMutualFeed();
        if (window.renderMutualReturns) {
            window.renderMutualReturns(mutualReturns, true);
        }
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function joinBounty(appId) {
    var actionKey = 'joinBounty_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    // Optimistic UI: remove card immediately, rollback on error
    const rollback = [...bountyContracts];
    bountyContracts = bountyContracts.filter(c => c.app_id !== appId);
    renderBountyFeed();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/bounty/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            bountyContracts = rollback;
            renderBountyFeed();
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadBountyFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join bounty error:', error);
        bountyContracts = rollback;
        renderBountyFeed();
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
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

async function confirmDropTest() {
    if (!_dropTestAppId) return;
    try {
        const response = await fetch(`${API_BASE}/tests/${_dropTestAppId}/drop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        closeDropTestModal({ target: document.getElementById('drop-test-modal') });
        await Promise.all([loadTasks(), loadProjects(true)]);
    } catch (error) {
        console.error('Drop test error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function _buildLeaveReasonPayload(prefix, freeformText) {
    var safePrefix = String(prefix || '').trim();
    var safeFreeform = String(freeformText || '').trim();
    if (safePrefix && safeFreeform) {
        return safePrefix + ': ' + safeFreeform;
    }
    return safePrefix || safeFreeform;
}

function _removeLocalTest(appId) {
    myTests = (myTests || []).filter(function(test) {
        return Number(test.id) !== Number(appId);
    });
}

function _handleInactiveCheckinCard(appId, errorCode) {
    var normalizedCode = String(errorCode || '').trim().toLowerCase();
    var alertKey = normalizedCode === 'project_pending_completion'
        ? 'projectPendingCompletionAlert'
        : 'archivedNoCheckinAlert';

    if (normalizedCode === 'project_pending_completion') {
        var pendingTest = getMyTestById(appId);
        if (pendingTest) {
            pendingTest.app_status = 'pending_completion';
            pendingTest.is_pending_completion = true;
            recomputeLocalTestState(pendingTest);
        }
    } else {
        _removeLocalTest(appId);
    }

    persistTestsCacheSnapshot();
    if (typeof window.renderTests === 'function') {
        window.renderTests(true);
    }

    if (tg.showAlert) {
        tg.showAlert(window.t(alertKey, {}, lang));
    } else if (typeof window.showToast === 'function') {
        window.showToast(window.t(alertKey, {}, lang));
    }

    loadTasks(true).catch(function() {});
}

function _removeLocalTesterFromProject(appId, testerId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(appId);
    });
    if (!project || !Array.isArray(project.testers)) {
        return;
    }
    project.testers = project.testers.filter(function(item) {
        return Number(item.tester_id) !== Number(testerId);
    });
}

async function confirmLeaveMutual(isJustified) {
    if (!_leaveMutualAppId) return;

    var reasonSelect = document.getElementById('leave-reason-select');
    var reasonOther = document.getElementById('leave-reason-other');
    var reasonText = reasonSelect ? reasonSelect.value : '';
    var reasonPayload = _buildLeaveReasonPayload(reasonText, reasonOther ? reasonOther.value : '');
    var appId = _leaveMutualAppId;
    var previousTests = Array.isArray(myTests) ? myTests.slice() : [];

    try {
        _removeLocalTest(appId);
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }

        var response = await fetch(`${API_BASE}/tests/${appId}/leave_mutual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                leave_reason: reasonPayload,
                is_justified: !!isJustified,
            })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            var errorCode = getBackendErrorCode(data);
            if (errorCode === 'testing_not_found' || errorCode === 'app_not_found' || errorCode === 'project_pending_completion') {
                closeLeaveMutualModal({ target: document.getElementById('leave-mutual-modal') });
                loadTasks(true).catch(function() {});
                loadProjects(true).catch(function() {});
                return;
            }
            myTests = previousTests;
            if (typeof window.renderTests === 'function') {
                window.renderTests(true);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (data.exit_status === 'abandoned') {
            showToast(window.t('leaveSuccessAbandoned', {
                karma: formatUiAmount(data.karma_burned || 0, 1)
            }, lang));
        } else {
            showToast(window.t('leaveSuccessJustified', {}, lang));
        }

        closeLeaveMutualModal({ target: document.getElementById('leave-mutual-modal') });
        await Promise.all([loadTasks(true), loadProjects(true)]);
    } catch (error) {
        console.error('Leave mutual error:', error);
        myTests = previousTests;
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function confirmKickTester() {
    if (!_kickTarget || !_kickTarget.appId || !_kickTarget.testerId) return;

    var reasonSelect = document.getElementById('kick-reason-select');
    var reasonOther = document.getElementById('kick-reason-other');
    var reasonText = reasonSelect ? reasonSelect.value : '';
    var reasonPayload = _buildLeaveReasonPayload(reasonText, reasonOther ? reasonOther.value : '');
    var target = {
        appId: _kickTarget.appId,
        testerId: _kickTarget.testerId,
    };
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(target.appId);
    });
    var previousTesters = project && Array.isArray(project.testers) ? project.testers.slice() : null;

    try {
        _removeLocalTesterFromProject(target.appId, target.testerId);
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }

        var response = await fetch(`${API_BASE}/projects/${target.appId}/kick/${target.testerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                leave_reason: reasonPayload,
            })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            if (project && previousTesters) {
                project.testers = previousTesters;
            }
            if (typeof window.renderProjects === 'function') {
                window.renderProjects(true);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('kickSuccessMsg', {}, lang));
        closeKickTesterModal({ target: document.getElementById('kick-modal') });
        closeDossierModal();
        await loadProjects(true);
    } catch (error) {
        console.error('Kick tester error:', error);
        if (project && previousTesters) {
            project.testers = previousTesters;
        }
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function confirmOvertimeLeave() {
    if (!_overtimeTest) return;
    try {
        const response = await fetch(`${API_BASE}/tests/${_overtimeTest.id}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        closeOvertimeModal({ target: document.getElementById('overtime-modal') });
        await Promise.all([loadTasks(), loadProjects(true)]);
    } catch (error) {
        console.error('Overtime leave error:', error);
        showToast(getApiErrorMessage(error && error.message, 'loadError'));
    }
}

function renderEarnBustDynamic() {
    const referralCountChip = document.getElementById('earn-referrals-count');
    const referralCount = Number(referralCountChip && referralCountChip.dataset ? referralCountChip.dataset.count || 0 : 0);
    if (referralCountChip) {
        referralCountChip.innerText = `👥 ${window.t('earnReferralCountChip', { count: referralCount }, lang)}`;
    }
    document.getElementById('earn-referral-bust').innerText = `💎 ${formatBustAmount(_earnReferralBust)}`;
    document.getElementById('earn-guest-status').innerHTML = `
        <span class="meta-chip accent-green">🤝 ${window.escapeHTML(window.t('earnGuestInviteCountChip', { count: _earnGuestInviteCount }, lang))}</span>
        <span class="meta-chip accent-blue">💎 ${window.escapeHTML(window.t('earnGuestInviteBustChip', { amount: formatAmountValue(_earnGuestInviteBust, 1) }, lang))}</span>
    `;
    document.getElementById('earn-grant-status').innerHTML = `
        <span class="meta-chip accent-green">🏆 ${window.t('earnGrantTestsLabel', {}, lang)}: ${_earnGrantCount}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnGrantBust)}</span>
    `;
    document.getElementById('earn-early-finish-status').innerHTML = `
        <span class="meta-chip accent-green">⚡ ${window.escapeHTML(window.t('earnEarlyFinishCountChip', { count: _earnEarlyFinishCount }, lang))}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnEarlyFinishBust)}</span>
    `;
    document.getElementById('earn-feedback-status').innerHTML = `
        <span class="meta-chip accent-green">🐞 ${window.t('earnFeedbackCountChip', { count: _earnFeedbackCount }, lang)}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnFeedbackBust)}</span>
    `;
    var playReviewStatus = document.getElementById('earn-play-review-status');
    if (playReviewStatus) {
        playReviewStatus.innerHTML = `
            <span class="meta-chip accent-green">⭐ ${window.escapeHTML(window.t('earnPlayReviewCountChip', { count: _earnPlayReviewCount }, lang))}</span>
            <span class="meta-chip accent-yellow">☯️ ${window.escapeHTML(window.t('earnPlayReviewKarmaChip', { amount: formatAmountValue(_earnPlayReviewKarma, 1) }, lang))}</span>
        `;
    }
    document.getElementById('earn-exchange-status').innerHTML = `<span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnExchangeBust)}</span>`;
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
        _earnGuestInviteCount = Number(data.guest_invites_count || 0);
        _earnGuestInviteBust = Number(data.guest_invites_earned || 0);
        _earnExchangeBust = Number(data.exchange_bust_earned || 0);
        _earnEarlyFinishCount = Number(data.early_finish_count || 0);
        _earnEarlyFinishBust = Number(data.early_finish_bust_earned || 0);
        _earnFeedbackCount = Number(data.feedback_sent_count || 0);
        _earnFeedbackBust = Number(data.feedback_bust_earned || 0);
        _earnPlayReviewCount = Number(data.play_review_count || 0);
        _earnPlayReviewKarma = Number(data.play_review_karma_earned || 0);
        _socialBonusStatus = data.social_bonus_status || 'none';
        renderEarnBustDynamic();
    } catch (error) {
        console.error('Failed to load referral stats:', error);
    }
}

async function initiateProjectFeedback(appId, options) {
    options = options || {};
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
                var chipVal = code === '15' ? 1.5 : 3.0;
                chip.classList.toggle('is-disabled', chipVal > remaining);
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

async function submitSocialLink() {
    const url = document.getElementById('social-url-input').value.trim();
    if (!url.startsWith('http')) return;
    try {
        const response = await fetch(`${API_BASE}/social-bonus/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, url })
        });
        const data = await response.json();
        if (response.ok) {
            _socialBonusStatus = 'pending';
            renderEarnBustDynamic();
            closeSocialModal();
            showToast(t.earnSocialSubmitted || 'Ссылка отправлена!');
        } else {
            showToast(getApiErrorMessage(data, 'socialSubmitError'));
        }
    } catch (error) {
        console.error('Social bonus submit error:', error);
        showToast(getApiErrorMessage(error && error.message, 'socialSubmitError'));
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

function _clearProjectPackageError() {
    var errorEl = document.getElementById('package-error');
    if (!errorEl) return;
    errorEl.innerHTML = '';
    errorEl.style.display = 'none';
}

function _showProjectPackageError(messageKey, options) {
    var errorEl = document.getElementById('package-error');
    if (!errorEl) return;

    var opts = options || {};
    var message = window.t(messageKey, {}, lang);
    var html = '<div>' + window.escapeHTML(message) + '</div>';
    if (opts.actionLabelKey) {
        html += '<button type="button" id="package-error-action-btn" class="btn btn-secondary" style="width:100%; margin-top:10px; background: rgba(255,255,255,0.08); color: var(--text-color); border: 1px solid rgba(255,255,255,0.14);">' + window.escapeHTML(window.t(opts.actionLabelKey, {}, lang)) + '</button>';
    }
    errorEl.innerHTML = html;
    errorEl.style.display = 'block';

    if (opts.actionLabelKey && typeof opts.onAction === 'function') {
        var actionBtn = document.getElementById('package-error-action-btn');
        if (actionBtn) {
            actionBtn.onclick = function(event) {
                event.preventDefault();
                opts.onAction();
            };
        }
    }
}

function _handleProjectCreateConflict(code) {
    var normalizedCode = String(code || '').trim();
    if (normalizedCode === 'ALREADY_OWNED') {
        _showProjectPackageError('ALREADY_OWNED', {
            actionLabelKey: 'projectPackageContactSupportBtn',
            onAction: openProjectDuplicateSupport,
        });
        return true;
    }
    if (normalizedCode === 'ALREADY_ACTIVE' || normalizedCode === 'NEEDS_RESTART') {
        _showProjectPackageError(normalizedCode);
        return true;
    }
    return false;
}

function _findTransferProject(projectId) {
    var normalizedProjectId = Number(projectId || 0);
    if (!normalizedProjectId) {
        return null;
    }

    var activeProject = (myProjects || []).find(function(project) {
        return Number(project && project.id) === normalizedProjectId;
    });
    if (activeProject) {
        return {
            app_id: normalizedProjectId,
            name: String(activeProject.name || '').trim(),
            package_name: String(activeProject.package || '').trim(),
            source: 'active'
        };
    }

    var archivedProject = (archivedProjects || []).find(function(project) {
        return Number(project && project.app_id) === normalizedProjectId;
    });
    if (archivedProject) {
        return {
            app_id: normalizedProjectId,
            name: String(archivedProject.name || '').trim(),
            package_name: String(archivedProject.package_name || '').trim(),
            source: 'archived'
        };
    }

    return null;
}

function _renderProjectTransferTargetUser() {
    var resultEl = document.getElementById('transfer-user-result');
    var generateBtn = document.getElementById('transfer-generate-btn');
    if (!resultEl) {
        return;
    }

    if (!_transferTargetUser) {
        resultEl.innerHTML = '';
        resultEl.classList.remove('active');
        if (generateBtn) {
            generateBtn.disabled = true;
        }
        return;
    }

    var username = String(_transferTargetUser.username || '').trim().replace(/^@+/, '');
    var fullName = String(_transferTargetUser.full_name || '').trim();
    var displayName = fullName || ('@' + username);

    resultEl.innerHTML = ''
        + '<div class="transfer-result-title">' + window.escapeHTML(window.t('transferRecipientFoundLabel', {}, lang)) + '</div>'
        + '<div class="transfer-result-name notranslate">' + window.escapeHTML(displayName) + '</div>'
        + '<div class="transfer-result-username notranslate">@' + window.escapeHTML(username) + '</div>'
        + '<div class="transfer-result-note">' + window.escapeHTML(window.t('transferRecipientCardHint', {}, lang)) + '</div>';
    resultEl.classList.add('active');
    if (generateBtn) {
        generateBtn.disabled = false;
    }
}

function _syncProjectTransferModalUi(project) {
    var projectEl = document.getElementById('transfer-project-name');
    var inputEl = document.getElementById('transfer-username-input');
    var searchBtn = document.getElementById('transfer-search-btn');
    var generateBtn = document.getElementById('transfer-generate-btn');
    var statusEl = document.getElementById('transfer-link-status');

    if (projectEl) {
        projectEl.textContent = (project && project.name) ? project.name : window.t('unknownLabel', {}, lang);
    }
    if (inputEl) {
        inputEl.value = '';
    }
    if (searchBtn) {
        searchBtn.disabled = false;
        searchBtn.textContent = window.t('transferSearchBtn', {}, lang);
    }
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = window.t('transferGenerateBtn', {}, lang);
    }
    if (statusEl) {
        statusEl.textContent = window.t('transferExpiryHint', { minutes: 15 }, lang);
        statusEl.classList.add('active');
    }

    _renderProjectTransferTargetUser();
}

function resetProjectTransferRecipient() {
    _transferTargetUser = null;
    _renderProjectTransferTargetUser();
}

function _clearProjectTransferState() {
    _transferProjectId = null;
    _transferTargetUser = null;

    var inputEl = document.getElementById('transfer-username-input');
    var statusEl = document.getElementById('transfer-link-status');
    var projectEl = document.getElementById('transfer-project-name');
    if (inputEl) {
        inputEl.value = '';
    }
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.classList.remove('active');
    }
    if (projectEl) {
        projectEl.textContent = '';
    }
    _renderProjectTransferTargetUser();
}

function openProjectTransferModal(projectId) {
    var project = _findTransferProject(projectId);
    var modal = document.getElementById('project-transfer-modal');
    if (!project || !modal) {
        handleApiError('app_not_found');
        return;
    }

    _transferProjectId = Number(project.app_id || 0);
    _transferTargetUser = null;
    _syncProjectTransferModalUi(project);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    } catch (error) {}

    if (typeof window.closeEditModal === 'function') {
        var editModal = document.getElementById('edit-project-modal');
        if (editModal && editModal.classList.contains('active')) {
            window.closeEditModal();
        }
    }

    modal.classList.add('active');
}

function closeProjectTransferModal(event) {
    var modal = document.getElementById('project-transfer-modal');
    if (!modal) {
        return;
    }
    if (event && event.target !== modal) {
        return;
    }
    modal.classList.remove('active');
    setTimeout(_clearProjectTransferState, 180);
}

async function searchProjectTransferUser() {
    var inputEl = document.getElementById('transfer-username-input');
    var searchBtn = document.getElementById('transfer-search-btn');
    var normalizedUsername = String(inputEl && inputEl.value || '').trim().replace(/^@+/, '');

    if (!normalizedUsername) {
        showToast(window.t('transferSearchEmpty', {}, lang));
        return null;
    }

    var actionKey = 'project_transfer_search';
    if (_pendingActions.has(actionKey)) {
        return null;
    }
    _pendingActions.add(actionKey);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    } catch (error) {}

    _apiStart();
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.textContent = '...';
    }

    try {
        var params = new URLSearchParams({
            username: normalizedUsername,
            init_data: tg.initData || ''
        });
        var response = await fetchWithRetry(`${API_BASE}/users/search?${params.toString()}`, {
            timeoutMs: 15000
        }, 1);
        var payload = await _readJsonResponseSafely(response, 'Transfer search');
        if (!response.ok || !payload || payload.status !== 'success') {
            handleApiError(getBackendErrorCode(payload) || 'user_not_found', payload && payload.details ? payload.details : {});
            return null;
        }

        _transferTargetUser = payload.user || null;
        _renderProjectTransferTargetUser();
        return _transferTargetUser;
    } catch (error) {
        console.error('Transfer recipient search error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = window.t('transferSearchBtn', {}, lang);
        }
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function generateProjectTransferLink() {
    if (!_transferProjectId || !_transferTargetUser || !_transferTargetUser.user_id) {
        handleApiError('user_not_found');
        return null;
    }

    var generateBtn = document.getElementById('transfer-generate-btn');
    var actionKey = 'project_transfer_generate_' + Number(_transferProjectId || 0);
    if (_pendingActions.has(actionKey)) {
        return null;
    }
    _pendingActions.add(actionKey);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    } catch (error) {}

    _apiStart();
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.textContent = '...';
    }

    try {
        var response = await fetchWithRetry(`${API_BASE}/projects/${Number(_transferProjectId)}/transfer/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient_id: Number(_transferTargetUser.user_id || 0),
                init_data: tg.initData || ''
            }),
            timeoutMs: 15000
        }, 1);
        var payload = await _readJsonResponseSafely(response, 'Transfer generate');
        if (!response.ok || !payload || payload.status !== 'success') {
            handleApiError(getBackendErrorCode(payload) || 'transfer_generate_failed', payload && payload.details ? payload.details : {});
            return null;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('transferSentByBotToast', {}, lang));
        closeProjectTransferModal();
        return payload;
    } catch (error) {
        console.error('Transfer generate error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        if (generateBtn) {
            generateBtn.disabled = !_transferTargetUser;
            generateBtn.textContent = window.t('transferGenerateBtn', {}, lang);
        }
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function restartArchivedProject(appId) {
    var normalizedAppId = Number(appId || 0);
    if (!normalizedAppId || !userId) return null;

    var actionKey = 'restart_archived_' + normalizedAppId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    _apiStart();
    try {
        const response = await fetch(`${API_BASE}/apps/${normalizedAppId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return null;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await loadProjects();
        if (typeof window.switchTab === 'function') {
            window.switchTab('projects');
        }
        if (typeof window.renderArchivedProjects === 'function') {
            window.renderArchivedProjects(true);
        }
        showToast(window.t('archiveRestartSuccess', { count: Number(result.run_iteration || 1) }, lang));
        setTimeout(function() {
            _highlightProjectCard(result.app_id);
        }, 140);
        loadArchivedProjects({ background: true, silent: true }).catch(function() {});
        return result;
    } catch (error) {
        console.error('Restart archived project error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
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
        if (result.already_checked_today) {
            showToast(t.checkinAlreadyDone);
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

async function deleteTester(appId, testerId, testerName) {
    const confirmed = await new Promise(resolve => {
        const message = t.deleteTesterConfirm.replace('{name}', testerName);
        if (tg.showConfirm) {
            tg.showConfirm(message, ok => resolve(ok));
        } else {
            resolve(confirm(message));
        }
    });
    if (!confirmed) return;
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/testers/${testerId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'ok') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            loadProjects();
        } else if (tg.showAlert) {
            tg.showAlert(getApiErrorMessage(result, 'deleteTesterError'));
        }
    } catch (error) {
        console.error('Delete tester error:', error);
        const message = getApiErrorMessage(error && error.message, 'networkError');
        if (tg.showAlert) tg.showAlert(message);
        else alert(message);
    }
}

async function _postResolveAccessError(projectId, progressId) {
    var response = await fetch(`${API_BASE}/projects/${projectId}/resolve_access_issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: userId, progress_id: progressId })
    });
    var result = await response.json();
    return {
        ok: !!(response.ok && result && result.status === 'success'),
        result: result,
    };
}

async function resolveAccessError(projectId, progressId) {
    if (!projectId || !progressId) return;
    var actionKey = 'resolve_access_error_' + projectId + '_' + progressId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        var request = await _postResolveAccessError(projectId, progressId);
        if (!request.ok) {
            handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
            return;
        }
        _markProjectAccessIssueResolved(projectId, progressId);
        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t('accessOverlayResolveDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Resolve access error failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function resolveAllAccessErrors(projectId, progressIds) {
    if (!projectId || !Array.isArray(progressIds)) return;
    var normalizedIds = Array.from(new Set(progressIds.map(function(id) {
        return Number(id || 0);
    }).filter(function(id) {
        return id > 0;
    })));
    if (!normalizedIds.length) return;

    var actionKey = 'resolve_access_error_all_' + projectId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        var request = await _postResolveAccessError(projectId, normalizedIds[0]);
        if (!request.ok) {
            handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
            loadProjects(true).catch(function() {});
            return;
        }

        for (var index = 0; index < normalizedIds.length; index++) {
            _markProjectAccessIssueResolved(projectId, normalizedIds[index]);
        }

        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t(normalizedIds.length > 1 ? 'accessOverlayResolveAllDone' : 'accessOverlayResolveDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Resolve all access errors failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

function contactAccessTester(username) {
    var clean = String(username || '').trim().replace(/^@+/, '');
    if (!clean) {
        if (tg.showAlert) tg.showAlert(window.t('accessOverlayNoTesterUsername', {}, lang));
        return;
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/${clean}`);
    } else {
        window.open(`https://t.me/${clean}`, '_blank');
    }
}

function _syncProjectsUiAfterOptimisticChange() {
    setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
    if (window.renderProjects) window.renderProjects(true);
    refreshOpenModals();
}

function _recomputeProjectAccessErrorState(project) {
    if (!project) return;
    var testers = Array.isArray(project.testers) ? project.testers : [];
    var hasAccessError = testers.some(function(tester) {
        return !!tester.issue_reported_at && !tester.issue_fixed_at;
    });
    if (hasAccessError) {
        project.status = 'access_error';
    } else if (String(project.status || '').toLowerCase() === 'access_error') {
        project.status = 'active';
    }
}

function _markProjectAccessIssueResolved(projectId, progressId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project || !Array.isArray(project.testers)) return false;

    var updated = false;
    project.testers = project.testers.map(function(tester) {
        if (Number(tester.progress_id) !== Number(progressId)) {
            return tester;
        }
        updated = true;
        return Object.assign({}, tester, {
            issue_fixed_at: new Date().toISOString(),
        });
    });
    _recomputeProjectAccessErrorState(project);
    return updated;
}

function _removeProjectAccessTester(projectId, progressId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project || !Array.isArray(project.testers)) return false;

    var beforeCount = project.testers.length;
    project.testers = project.testers.filter(function(tester) {
        return Number(tester.progress_id) !== Number(progressId);
    });
    var updated = project.testers.length !== beforeCount;
    _recomputeProjectAccessErrorState(project);
    return updated;
}

async function deleteAccessTester(projectId, progressId, testerLabel) {
    if (!projectId || !progressId) return;
    var actionKey = 'delete_access_tester_' + projectId + '_' + progressId;
    if (_pendingActions.has(actionKey)) return;
    var confirmMessage = window.t('accessOverlayDeleteConfirm', {
        name: testerLabel || window.t('unknownLabel', {}, lang)
    }, lang);
    var confirmed = await new Promise(function(resolve) {
        if (tg.showConfirm) {
            tg.showConfirm(confirmMessage, function(ok) { resolve(!!ok); });
        } else {
            resolve(confirm(confirmMessage));
        }
    });
    if (!confirmed) return;

    _pendingActions.add(actionKey);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        var response = await fetch(`${API_BASE}/projects/${projectId}/delete_access_tester`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId, progress_id: progressId })
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        _removeProjectAccessTester(projectId, progressId);
        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t('accessOverlayDeleteDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Delete access tester failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (ensureLanguageRuntimeConsistency()) {
        return;
    }

    if (localStorage.getItem('hideBanner') === 'true') {
        const banner = document.getElementById('main-banner');
        if (banner) banner.style.display = 'none';
    }

    refreshLanguageUi();
    if (!hasTelegramUsername()) {
        showNoUsernameOverlay();
        return;
    }
    var runtimeConfigPromise = loadRuntimeConfig();
    var bootstrapProfileSyncPromise = syncTelegramProfile();
    loadUserProfilePreferences().catch(function() {});

    fetch(`${API_BASE}/users/${userId}/language`)
        .then(response => response.json())
        .then(data => {
            var serverLanguage = normalizeNativeLanguageCode(data.language);
            var selectedLanguage = getSelectedAppLanguage();
            if (isAutoTranslatedLanguage(selectedLanguage)) {
                if (getServerSafeLanguage(selectedLanguage) !== serverLanguage) {
                    sendLanguagePreferenceToServer(getServerSafeLanguage(selectedLanguage));
                }
                return;
            }
            if (serverLanguage && serverLanguage !== lang) {
                applyLanguage(serverLanguage, { skipServerSync: true, force: true });
            }
        })
        .catch(() => {});

    syncUserTimezone(false).catch(() => {});

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _pendingScreenshotReminderUsername !== null) {
            const username = _pendingScreenshotReminderUsername;
            _pendingScreenshotReminderUsername = null;
            setTimeout(() => showScreenshotCompleteModal(username), 300);
        }
        if (!document.hidden) {
            _syncActiveTimerState();
            renderTests(true);
            loadTasks(true).catch(() => {});
            loadIncomingOffers({ background: true }).catch(() => {});
            loadReliabilitySummary(true).catch(() => {});
        }
    });

    window.addEventListener('focus', function() {
        _syncActiveTimerState();
        if (window.renderTests) window.renderTests(true);
    });

    window.addEventListener('pageshow', function() {
        _syncActiveTimerState();
        if (window.renderTests) window.renderTests(true);
    });

    document.addEventListener('pointerdown', (event) => {
        const menu = document.getElementById('system-drop-menu');
        if (!menu || !menu.classList.contains('active')) return;
        if (!menu.contains(event.target)) {
            menu.classList.remove('active');
        }
    });

    _loadFirstDayScreenshotState();
    _loadTimerReadyState();
    _loadPersistedActiveTimer();

    (async function() {
        await bootstrapProfileSyncPromise;
        await runtimeConfigPromise;
        var guestIntent = _parseGuestClaimIntent();
        if (guestIntent) {
            await _handleGuestClaimIntent(guestIntent);
        }

        loadTasks();
        loadReliabilitySummary();
        loadReliabilityBreakdown(true);
        loadIncomingOffers();
        startOffersPolling();
        startMarketPolling();
        loadEvents();
        loadExternalCounts();
        scheduleDeferredBootstrap();
        await _handleInitialRoute();
    })().catch(function(error) {
        console.error('Initial bootstrap failed:', error);
    });
});

Object.assign(window, {
    fetchWithRetry,
    markMutualOfferPendingUi,
    loadAllData,
    hasMarketCache,
    hydrateMarketFromCache,
    getMarketFeedState,
    resetMarketFeedStates,
    setMarketForceSkeleton,
    refreshLanguageUi,
    syncAutoAcceptToggleUi,
    applyLanguage,
    showAutoAcceptMutualInfo,
    handleAutoAcceptMutualToggle,
    toggleLanguage,
    loadTasks,
    loadIncomingOffers,
    loadMutualFeed,
    loadGuestApps,
    loadBountyFeed,
    loadEvents,
    loadProjects,
    forceRefreshMarket,
    getLocalDate,
    getRuDaysWord,
    formatEditProjectCreatedAt,
    getOfferApiError,
    decideOffer,
    createMutualOffer,
    sendMutualOffer,
    joinMutual,
    joinDirect,
    joinBounty,
    startTimer,
    openPlay,
    handleFirstDownload,
    handleScreenshotAndConfirm,
    submitIssueReport,
    sendReport,
    toggleVisibility,
    getProjectVisibilityMode,
    setProjectVisibilityMode,
    confirmDropTest,
    confirmLeaveMutual,
    confirmKickTester,
    confirmOvertimeLeave,
    openEarnBustModal,
    toggleGuestProjectsAccordion,
    openGuestProjectsTesterSearch,
    loadExternalCounts,
    getExternalCounts,
    updateGuestProjectsFilter,
    showMoreGuestProjects,
    getGuestProjectsPageSize,
    getFilteredGuestProjects,
    getVisibleGuestProjects,
    canShowMoreGuestProjects,
    getGuestProjectAvailableLangs,
    normalizeGuestInviteLanguage,
    getDefaultGuestInviteLanguage,
    buildGuestInviteDeepLink,
    buildProjectReferralStartLink,
    buildExternalClaimStartLink,
    submitManualExternalTrack,
    startExternalTrackingSession,
    submitExternalTrackingProof,
    submitExternalDailyCheckin,
    cancelExternalTracking,
    unlinkGuestRelationship,
    getDefaultCheckpointReportLanguage,
    getDefaultCheckpointReportLanguage,
    buildCheckpointReportPrefill,
    sendCheckpointScreenshotAndConfirm,
    initiateProjectFeedback,
    openProjectFeedback,
    sendProjectFeedbackMedia,
    openFeedbackRewardModal,
    closeFeedbackRewardModal,
    canPromptPlayReview,
    canTogglePlayReview,
    isPlayReviewMarked,
    getPlayReviewUrl,
    setPlayReviewSubmittedPending,
    setFeedbackRewardBust,
    setFeedbackRewardKarma,
    submitFeedbackReward,
    sendFeedback,
    submitFeedback,
    submitSocialLink,
    saveProjectSync,
    loadArchivedProjects,
    loadReliabilitySummary,
    loadReliabilityBreakdown,
    confirmHardDelete,
    fetchKarmaBreakdown,
    sendKarmaReward,
    confirmStart,
    handleClaimGrantClick,
    claimEarlyFinishBonus,
    deleteTester,
    resolveAccessError,
    contactAccessTester,
    deleteAccessTester,
    confirmDeleteProject,
    formatAmountValue,
    formatBustAmount,
    setProjectMode,
    updateProjectPricing,
    setProjectTargetLang,
    getApiErrorMessage,
    startMassInvite,
    resetMassInviteCooldown,
    getReliabilityState,
    rerenderDynamicUi,
    refreshActiveTabData,
    saveProject,
    confirmEmailWarning,
    saveProjectEdit,
    openProjectTransferModal,
    closeProjectTransferModal,
    resetProjectTransferRecipient,
    searchProjectTransferUser,
    generateProjectTransferLink,
    publishProjectToMarket,
    showFeedbackRewardKarmaInfo,
    isFirstDayScreenshotVisible,
    setFirstDayScreenshotVisible
});

Object.assign(window.App, {
    tg,
    API_BASE,
    userId,
    userEmail: _userEmail,
    autoAcceptMutual: _autoAcceptMutualEnabled,
    getProjectVisibilityMode: getProjectVisibilityMode,
    getState: () => ({
        lang,
        appLang,
        userEmail: _userEmail,
        autoAcceptMutual: _autoAcceptMutualEnabled,
        myTests,
        incomingOffers,
        myProjects,
        guestProjects,
        mutualSeeking,
        mutualPrelaunch,
        bountyContracts,
        communityEvents,
        eventsExpanded,
        externalCounts: getExternalCounts(),
        visibilityStats,
        reliabilitySummary,
        reliabilityBreakdown,
        archivedProjects,
        activeProjectFeedbackAppId: _activeProjectFeedbackAppId,
        activeProjectFeedbackItems: _activeProjectFeedbackItems,
    }),
    refreshLanguageUi,
    applyLanguage,
    loadTasks,
    loadProjects,
    loadEvents,
    loadMutualFeed,
    loadBountyFeed,
    loadArchivedProjects,
    loadReliabilitySummary,
    loadReliabilityBreakdown,
    saveProject,
    setProjectTargetLang,
    saveProjectEdit,
    openProjectTransferModal,
    closeProjectTransferModal,
    searchProjectTransferUser,
    generateProjectTransferLink,
    publishProjectToMarket,
    startMassInvite,
    resetMassInviteCooldown,
    loadExternalCounts,
    getExternalCounts,
    joinDirect,
    buildProjectReferralStartLink,
    submitManualExternalTrack,
    startExternalTrackingSession,
    submitExternalTrackingProof,
    submitExternalDailyCheckin,
    cancelExternalTracking,
    buildExternalClaimStartLink
});
