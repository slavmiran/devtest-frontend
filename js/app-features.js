/* Phase 5.4 — js/app-features.js (structural split from app.js) */
/* guest/external, market join, sync/overtime, transfers, mass-invite, archive, */
/* social bonus, access-issues, project forms + misc feature flows. */
/* Depends on globals from app-config.js, app-api.js, app-actions.js. */
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

const GUEST_CLAIM_COMMUNITY_URL = (window.App && window.App.publicGroupUrl) || 'https://t.me/googleplay_console_12testers';

function _normalizeTelegramUsernameForClaim(username) {
    return String(username || '').trim().replace(/\s+/g, '').replace(/^@+/, '').toLowerCase();
}

function _canUserClaimGuestApp(guest) {
    if (!guest || typeof guest !== 'object') {
        return false;
    }
    var ownerId = Number(guest.owner_id || guest.owner_telegram_id || 0);
    var ownerUsername = _normalizeTelegramUsernameForClaim(guest.owner_username);
    var actualUsername = _normalizeTelegramUsernameForClaim(telegramUsername);
    if (ownerId > 0) {
        return Number(userId) === ownerId;
    }
    if (ownerUsername) {
        return !!actualUsername && actualUsername === ownerUsername;
    }
    return true;
}

async function _loadGuestAppPreview(guestAppId) {
    var normalizedGuestAppId = String(guestAppId || '').trim();
    if (!normalizedGuestAppId) {
        return null;
    }
    var requestUrl = `${API_BASE}/guest-apps/${encodeURIComponent(normalizedGuestAppId)}`;
    if (tg && tg.initData) {
        requestUrl += `?init_data=${encodeURIComponent(tg.initData)}`;
    }
    var response = await fetchWithRetry(requestUrl, {
        method: 'GET',
        timeoutMs: 20000,
    }, 2);
    var payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }
    var responseStatus = String(payload && payload.status || '').trim();
    var claimState = String(payload && payload.claim_state || '').trim();
    if (!response.ok || responseStatus === 'error') {
        return {
            item: null,
            claimState: 'error',
            status: 'error',
            message: String(payload && (payload.message || payload.detail) || '').trim(),
            alreadyClaimed: false,
            canClaim: false,
            ownedAppId: 0,
        };
    }
    if (!payload || responseStatus !== 'success') {
        return {
            item: null,
            claimState: 'error',
            status: 'error',
            message: '',
            alreadyClaimed: false,
            canClaim: false,
            ownedAppId: 0,
        };
    }
    if (claimState === 'already_owned') {
        return {
            item: payload.item || null,
            claimState: 'already_owned',
            status: 'already_owned',
            message: String(payload.message || '').trim(),
            alreadyClaimed: true,
            canClaim: false,
            ownedAppId: Number(payload.owned_app_id || 0),
        };
    }
    if (claimState === 'not_owner' || claimState === 'not_found') {
        return {
            item: payload.item || null,
            claimState: 'error',
            status: 'error',
            message: String(payload.message || '').trim(),
            alreadyClaimed: false,
            canClaim: false,
            ownedAppId: 0,
        };
    }
    return {
        item: payload.item || null,
        claimState: claimState || 'ready',
        status: 'success',
        message: String(payload.message || '').trim(),
        alreadyClaimed: !!payload.already_claimed,
        canClaim: !!payload.can_claim,
        ownedAppId: Number(payload.owned_app_id || 0),
    };
}

async function _bindReferralInviter(inviterId) {
    var normalizedInviterId = Number(inviterId || 0);
    if (!normalizedInviterId || normalizedInviterId === Number(userId || 0)) {
        return;
    }
    try {
        await fetchWithRetry(`${API_BASE}/users/me/referral/bind`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                init_data: tg.initData || '',
                inviter_id: normalizedInviterId,
            }),
        }, 1);
    } catch (error) {
        console.warn('Referral bind failed:', error);
    }
}

async function _handleMutualInviteIntent(intent) {
    if (!intent || intent.targetAppId <= 0) {
        return false;
    }

    if (intent.inviterId > 0 && intent.inviterId === Number(userId || 0)) {
        _clearStartappQueryParam();
        showToast(window.t('guestClaimOwnLinkToast', {}, lang));
        return true;
    }

    if (intent.inviterId > 0) {
        await _bindReferralInviter(intent.inviterId);
    }

    _clearStartappQueryParam();

    if (typeof joinMutual === 'function') {
        await joinMutual(intent.targetAppId, false);
        return true;
    }

    switchTab('market');
    return true;
}

async function _handleGuestClaimIntent(intent) {
    if (!intent || !intent.guestAppId || intent.inviterId <= 0) {
        return false;
    }

    if (_isGuestClaimHandled(intent.rawStartParam)) {
        _clearStartappQueryParam();
        if (typeof window.showGuestClaimWelcomeScreen === 'function') {
            await window.showGuestClaimWelcomeScreen(intent);
        }
        return true;
    }

    if (Number(intent.inviterId) === Number(userId)) {
        _markGuestClaimHandled(intent.rawStartParam);
        _clearStartappQueryParam();
        showToast(window.t('guestClaimOwnLinkToast', {}, lang));
        return true;
    }

    if (typeof window.showGuestClaimWelcomeScreen === 'function') {
        await window.showGuestClaimWelcomeScreen(intent);
        return true;
    }

    return _executeGuestClaimIntent(intent);
}

async function _executeGuestClaimIntent(intent) {
    if (!intent || !intent.guestAppId || intent.inviterId <= 0) {
        return false;
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
        var response = await fetchWithRetry(`${API_BASE}/projects/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: intent.guestAppId,
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
                if (typeof window.closeGuestClaimWelcomeScreen === 'function') {
                    window.closeGuestClaimWelcomeScreen();
                }
                showToast(window.t('guestClaimAlreadyClaimedToast', {}, lang));
                return true;
            }
            if (detail === 'not_owner' || detail === 'guest_claim_wrong_owner') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                if (typeof window.closeGuestClaimWelcomeScreen === 'function') {
                    window.closeGuestClaimWelcomeScreen();
                }
                if (typeof window.showGuestClaimStatusModal === 'function') {
                    window.showGuestClaimStatusModal({ variant: 'not-owner' });
                } else {
                    showToast(window.t('guestClaimWrongOwner', {}, lang));
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
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('guestClaimSuccessText', {}, lang));

        if (typeof window.closeGuestClaimWelcomeScreen === 'function') {
            window.closeGuestClaimWelcomeScreen();
        }

        switchTab('projects');
        var newAppId = Number(payload && payload.new_app_id || 0);
        if (newAppId > 0 && typeof window.openEditModal === 'function') {
            window.openEditModal(newAppId);
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
            if (typeof loadGuestApps === 'function' && _guestProjectsExpanded && !_guestProjectsLoadedOnce) {
                loadGuestApps().catch(function() {});
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
    const cisCountries = ['RU', 'BY', 'KZ', 'KG', 'MD', 'AM', 'AZ', 'TJ', 'UZ', 'TM'];
    const normalizedGuestLang = String(guestLang || '').trim().toUpperCase();
    if (cisCountries.includes(normalizedGuestLang)) {
        return 'ru';
    }
    return 'en';
}

function buildGuestClaimStartappValue(guestAppId, inviterId) {
    return `claim_${String(guestAppId || '').trim()}_${Number(inviterId || 0)}`;
}

function buildGuestInviteDeepLink(guestAppId, inviterId, inviteLang, startappValue) {
    const normalizedLang = normalizeGuestInviteLanguage(inviteLang);
    const params = new URLSearchParams();
    params.set('startapp', String(startappValue || buildGuestClaimStartappValue(guestAppId, inviterId)));
    params.set('lang', normalizedLang);
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || TELEGRAM_RUNTIME_BOT_USERNAME || BOT_USERNAME);
    var webappShortname = String((window.App && window.App.webappShortname) || WEBAPP_SHORTNAME || 'app').trim();
    return `https://t.me/${botUsername}/${webappShortname}?${params.toString()}`;
}

function buildProjectReferralStartLink(projectId) {
    var normalizedProjectId = Number(projectId || 0);
    var normalizedInviterId = Number(userId || 0);
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || TELEGRAM_RUNTIME_BOT_USERNAME || BOT_USERNAME);
    var webappShortname = String((window.App && window.App.webappShortname) || WEBAPP_SHORTNAME || 'app').trim();
    if (normalizedProjectId <= 0 || normalizedInviterId <= 0) {
        return `https://t.me/${botUsername}/${webappShortname}?startapp=mutual_${normalizedProjectId}`;
    }
    return `https://t.me/${botUsername}/${webappShortname}?startapp=ref_mutual_${normalizedInviterId}_${normalizedProjectId}`;
}

function buildExternalClaimStartLink(packageName, guestAppId) {
    var botUsername = _normalizeBotUsername((window.App && window.App.botUsername) || TELEGRAM_RUNTIME_BOT_USERNAME || BOT_USERNAME);
    var webappShortname = String((window.App && window.App.webappShortname) || WEBAPP_SHORTNAME || 'app').trim();
    var normalizedInviterId = Number(userId || 0);
    var appIdParam = String(guestAppId || packageName || '').trim();
    if (!appIdParam || normalizedInviterId <= 0) {
        return `https://t.me/${botUsername}/${webappShortname}?startapp=claim_${encodeURIComponent(appIdParam)}_0`;
    }
    return `https://t.me/${botUsername}/${webappShortname}?startapp=${buildGuestClaimStartappValue(appIdParam, normalizedInviterId)}`;
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
            body: JSON.stringify(withInitData({
                tester_id: userId,
                source_app_id: sourceProjectId,
                app_name: appName || null,
                play_store_url: playUrl,
                package_name: packageName,
                owner_username: ownerUsername,
                google_group_url: groupUrl || null,
                testing_day: testingDay,
                is_mutual: isMutual,
            }))
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
            body: JSON.stringify(withInitData({
                tester_id: userId,
                app_name: appName || null,
                owner_username: ownerUsername,
                google_group_url: groupUrl || null,
                play_store_url: playUrl,
            }))
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
        body: JSON.stringify(withInitData(payload))
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
        body: JSON.stringify(withInitData({ tester_id: userId, local_date: getLocalDate() }))
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
        body: JSON.stringify(withInitData({ tester_id: userId, local_date: getLocalDate() }))
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
        body: JSON.stringify(withInitData({ tester_id: userId }))
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

    var requestBody = withInitData({
        user_id: userId,
        remove_from_my_tests: options.removeFromMyTests !== false,
        remove_from_my_testers: options.removeFromMyTesters !== false,
        source_app_id: Number(options.sourceAppId || 0) || null,
    });

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

function sanitizeSingleEmailInputValue(value) {
    return String(value || '').replace(/[\s,;]+/g, '').trim();
}

function getEmailValidationErrorCode(value, required) {
    var raw = String(value || '');
    if (!raw.trim()) return required ? 'invalid_email_format' : '';
    if (/[\s]/.test(raw)) return 'invalid_email_spaces';
    if (/[,;]/.test(raw)) return 'invalid_email_commas';
    var email = raw.trim();
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return 'invalid_email_format';
    return '';
}

function getEmailValidationMessage(code) {
    var normalized = String(code || '').trim();
    if (normalized === 'invalid_email_commas') return window.t('invalidEmailCommas', {}, lang);
    if (normalized === 'invalid_email_spaces') return window.t('invalidEmailSpaces', {}, lang);
    return window.t('invalidEmail', {}, lang);
}

function isValidEmail(value) {
    return !getEmailValidationErrorCode(value, true);
}

if (!window.__singleEmailInputGuardBound) {
    window.__singleEmailInputGuardBound = true;
    document.addEventListener('input', function(event) {
        var target = event && event.target;
        if (!target || String(target.tagName || '').toLowerCase() !== 'input') return;
        if (String(target.type || '').toLowerCase() !== 'email') return;
        var sanitized = sanitizeSingleEmailInputValue(target.value);
        if (sanitized !== target.value) {
            target.value = sanitized;
        }
    });
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

    if (typeof syncAutoAcceptToggleUi === 'function') {
        syncAutoAcceptToggleUi();
    }
    if (typeof syncDefaultGroupJoinedUi === 'function') {
        syncDefaultGroupJoinedUi();
    }
    if (typeof syncHomeScreenUi === 'function') {
        syncHomeScreenUi();
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



    const select = document.getElementById('attach-project-select');
    if (select && select.options.length > 0 && !select.value) {
        select.options[0].text = window.t('contactSelectPlaceholder', {}, lang);
    }

    syncAutoAcceptToggleUi();
    if (typeof syncDefaultGroupJoinedUi === 'function') {
        syncDefaultGroupJoinedUi();
    }
    if (typeof syncHomeScreenUi === 'function') {
        syncHomeScreenUi();
    }
    if (typeof syncDeviceProfileUi === 'function') {
        syncDeviceProfileUi();
    }
    if (typeof updateOwnerAccessIssueBanner === 'function') {
        updateOwnerAccessIssueBanner();
    }
}

async function loadUserProfilePreferences() {
    try {
        var response = await fetchWithRetry(API_BASE + '/users/' + userId + '/profile');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var profile = await response.json();
        _autoAcceptMutualEnabled = !!profile.auto_accept_mutual;
        _autoAcceptMutualAvailable = (typeof profile.auto_accept_available === 'undefined')
            ? true
            : !!profile.auto_accept_available;
        if (!_autoAcceptMutualAvailable) {
            _autoAcceptMutualEnabled = false;
        }
        _defaultGroupJoined = !!profile.default_group_joined;
        syncAutoAcceptToggleUi();
        if (typeof syncDefaultGroupJoinedUi === 'function') syncDefaultGroupJoinedUi();
        window.App.autoAcceptMutual = _autoAcceptMutualEnabled;
        window.App.defaultGroupJoined = _defaultGroupJoined;
        if (typeof applyDeviceInfoFromProfile === 'function') {
            applyDeviceInfoFromProfile(profile);
        } else {
            _deviceProfileBannerReady = true;
            if (typeof syncDeviceProfileBanner === 'function') syncDeviceProfileBanner();
        }
    } catch (error) {
        console.error('Profile preferences load error:', error);
        syncAutoAcceptToggleUi();
        if (typeof syncDefaultGroupJoinedUi === 'function') syncDefaultGroupJoinedUi();
        _deviceProfileBannerReady = true;
        if (typeof syncDeviceProfileBanner === 'function') syncDeviceProfileBanner();
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
            body: JSON.stringify(withInitData({ timezone: detectedTimezone }))
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
        return { ok: false };
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
            return { ok: false };
        }

        return {
            ok: true,
            interface_language: normalizeNativeLanguageCode(result.interface_language) || '',
        };
    } catch (error) {
        console.warn('Telegram profile sync failed:', error);
        return { ok: false };
    }
}

async function bootstrapInterfaceLanguage(options) {
    var settings = options || {};
    var selectedLanguage = getSelectedAppLanguage();
    if (isAutoTranslatedLanguage(selectedLanguage)) {
        return getServerSafeLanguage(selectedLanguage);
    }

    var profileLanguage = normalizeNativeLanguageCode(
        settings.profileSyncResult && settings.profileSyncResult.interface_language
    );
    if (profileLanguage) {
        applyInterfaceLanguageFromServer(profileLanguage);
        return profileLanguage;
    }

    var serverLanguage = '';
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/language`);
        const data = await response.json();
        serverLanguage = normalizeNativeLanguageCode(data && data.language);
    } catch (error) {
        serverLanguage = '';
    }

    if (serverLanguage) {
        applyInterfaceLanguageFromServer(serverLanguage);
        return serverLanguage;
    }

    var detectedLanguage = resolveInterfaceLanguage(langCode);
    try {
        await sendLanguagePreferenceToServer(detectedLanguage);
    } catch (error) {}
    applyInterfaceLanguageFromServer(detectedLanguage);
    return detectedLanguage;
}

async function saveTesterEmail(email) {
    var candidate = sanitizeSingleEmailInputValue(email);
    var emailValidationCode = getEmailValidationErrorCode(candidate, false);
    if (emailValidationCode) {
        return { ok: false, code: emailValidationCode, message: getEmailValidationMessage(emailValidationCode) };
    }
    try {
        var response = await fetch(`${API_BASE}/users/me/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: tg.initData || '', email: candidate })
        });
        var result = null;
        try { result = await response.json(); } catch (e) { result = null; }
        if (!response.ok || !result || result.status !== 'success') {
            var backendCode = getBackendErrorCode(result) || 'database_error';
            var backendMessage = String((result && result.details && result.details.message) || result && result.detail || '').trim();
            return { ok: false, code: backendCode, message: backendMessage || getEmailValidationMessage(backendCode) };
        }
        _userEmail = String(result.email || candidate).trim();
        window.App.userEmail = _userEmail;
        if (window.App && window.App.state) {
            try { window.App.state._userEmail = _userEmail; } catch (e) {}
        }
        return { ok: true, email: _userEmail };
    } catch (error) {
        console.warn('Save tester email failed:', error);
        return { ok: false, code: 'network_error' };
    }
}

function _updateSettingsEmailValidIcon() {
    var input = document.getElementById('settings-tester-email');
    var icon = document.getElementById('settings-email-valid-icon');
    if (!input || !icon) return;
    input.value = sanitizeSingleEmailInputValue(input.value);
    var value = (input.value || '').trim();
    var valid = !!value && isValidEmail(value);
    icon.classList.toggle('is-valid', valid);
    input.classList.toggle('input-valid', valid);
}

function onSettingsEmailInput() {
    _updateSettingsEmailValidIcon();
}

function syncSettingsEmailRowUi() {
    var previewText = document.getElementById('settings-email-preview-text');
    var editBtn = document.getElementById('settings-email-edit-btn');
    var deleteBtn = document.getElementById('settings-email-delete');
    var current = getCurrentUserEmail();
    var hasEmail = !!current;

    if (previewText) {
        previewText.classList.toggle('is-set', hasEmail);
        previewText.classList.toggle('is-missing', !hasEmail);
        if (hasEmail) {
            previewText.textContent = current;
            previewText.removeAttribute('data-i18n');
        } else {
            previewText.setAttribute('data-i18n', 'settingsEmailNotSet');
            previewText.textContent = window.t('settingsEmailNotSet', {}, lang);
        }
    }
    if (editBtn) {
        editBtn.setAttribute('aria-label', window.t('settingsEmailEditAria', {}, lang));
        if (hasEmail) editBtn.removeAttribute('hidden');
        else editBtn.setAttribute('hidden', '');
    }
    if (deleteBtn) {
        if (hasEmail) deleteBtn.removeAttribute('hidden');
        else deleteBtn.setAttribute('hidden', '');
    }
}

function populateSettingsEmail() {
    syncSettingsEmailRowUi();
    var input = document.getElementById('settings-tester-email');
    if (!input) return;
    var current = getCurrentUserEmail();
    input.value = current || '';
    _updateSettingsEmailValidIcon();
}

function openSettingsEmailModal() {
    var modal = document.getElementById('settings-email-modal');
    if (!modal) return;
    populateSettingsEmail();
    modal.classList.add('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    var input = document.getElementById('settings-tester-email');
    if (input) {
        try { setTimeout(function() { input.focus(); input.select && input.select(); }, 50); } catch (e) {}
    }
}

function closeSettingsEmailModal(event) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
    var modal = document.getElementById('settings-email-modal');
    if (modal) modal.classList.remove('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
}

async function saveSettingsEmail() {
    var input = document.getElementById('settings-tester-email');
    var btn = document.getElementById('settings-email-save');
    if (!input) return;
    var value = sanitizeSingleEmailInputValue(input.value);
    input.value = value;
    var validationCode = getEmailValidationErrorCode(value, true);
    if (validationCode) {
        if (typeof window.showToast === 'function') window.showToast(getEmailValidationMessage(validationCode));
        try { input.focus(); } catch (e) {}
        return;
    }
    if (btn) btn.classList.add('is-loading');
    var res = await saveTesterEmail(value);
    if (btn) btn.classList.remove('is-loading');
    if (res && res.ok) {
        syncSettingsEmailRowUi();
        _updateSettingsEmailValidIcon();
        closeSettingsEmailModal();
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (typeof window.showToast === 'function') window.showToast(window.t('settingsEmailSaved', {}, lang));
    } else {
        var errorMessage = String(res && res.message || '').trim();
        if (!errorMessage) {
            errorMessage = getEmailValidationMessage(res && res.code);
        }
        if (!errorMessage) {
            errorMessage = window.t('emailSaveFailed', {}, lang);
        }
        if (typeof window.showToast === 'function') window.showToast(errorMessage);
    }
}

async function deleteSettingsEmail() {
    var btn = document.getElementById('settings-email-delete');
    var input = document.getElementById('settings-tester-email');
    if (!getCurrentUserEmail()) {
        syncSettingsEmailRowUi();
        return;
    }
    if (btn) btn.classList.add('is-loading');
    var res = await saveTesterEmail('');
    if (btn) btn.classList.remove('is-loading');
    if (res && res.ok) {
        if (input) input.value = '';
        syncSettingsEmailRowUi();
        _updateSettingsEmailValidIcon();
        closeSettingsEmailModal();
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (typeof window.showToast === 'function') window.showToast(window.t('settingsEmailDeleted', {}, lang));
    } else {
        var errorMessage = String(res && res.message || '').trim();
        if (!errorMessage) {
            errorMessage = window.t('emailSaveFailed', {}, lang);
        }
        if (typeof window.showToast === 'function') window.showToast(errorMessage);
    }
}

async function fetchMassInvitePreviewEmails(projectId) {
    try {
        var response = await fetch(`${API_BASE}/projects/${Number(projectId)}/mass_invite/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: tg.initData || '' })
        });
        var result = null;
        try { result = await response.json(); } catch (e) { result = null; }
        if (!response.ok || !result || result.status !== 'success') {
            return { ok: false, emails: [], code: getBackendErrorCode(result) || 'database_error' };
        }
        return {
            ok: true,
            emails: Array.isArray(result.emails) ? result.emails.filter(Boolean) : [],
            found: Number(result.found_count || 0),
            total: Number(result.total_count || 0),
        };
    } catch (error) {
        console.warn('Mass invite preview failed:', error);
        return { ok: false, emails: [], code: 'network_error' };
    }
}

async function fetchOfferEmailPreview(targetAppId, proposerAppId) {
    try {
        var response = await fetch(`${API_BASE}/offers/email-preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                init_data: tg.initData || '',
                target_app_id: Number(targetAppId),
                proposer_app_id: Number(proposerAppId)
            })
        });
        var result = null;
        try { result = await response.json(); } catch (e) { result = null; }
        if (!response.ok || !result || result.status !== 'success') {
            return { ok: false, emails: [], code: getBackendErrorCode(result) || 'database_error' };
        }
        return { ok: true, emails: Array.isArray(result.emails) ? result.emails.filter(Boolean) : [] };
    } catch (error) {
        console.warn('Offer email preview failed:', error);
        return { ok: false, emails: [], code: 'network_error' };
    }
}

function getCurrentUserEmail() {
    try {
        if (window.App && typeof window.App.getState === 'function') {
            var st = window.App.getState();
            if (st && st.userEmail) return String(st.userEmail).trim();
        }
    } catch (e) {}
    if (window.App && window.App.userEmail) return String(window.App.userEmail).trim();
    return String(typeof _userEmail !== 'undefined' ? _userEmail : '').trim();
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

function refreshMarketAfterMassInvite() {
    resetMarketFeedStates();
    resetMarketFetchThrottle();
    setMarketCache(null);
}

// ── Mass Invite Processing Overlay ────────────────────────────
var MassInviteProgressOverlay = (function () {
    var _rotateInterval = null;
    var _longTimer = null;
    var _returnTimer = null;
    var _autoCloseInterval = null;
    var _autoCloseEndsAt = 0;
    var _currentIndex = 0;
    var _phase = 'collecting';
    var _sourceAppId = 0;
    var RESULT_AUTO_CLOSE_MS = 120000;
    var COLLECT_STATUS_KEYS = [
        'massInviteProgressStatus1',
        'massInviteProgressStatus2',
        'massInviteProgressStatus3',
    ];

    function _t(key, params, currentLang) {
        if (window.t) return window.t(key, params || {}, currentLang || lang);
        return key;
    }

    function _formatAutoClose(ms) {
        var totalSec = Math.max(0, Math.ceil(ms / 1000));
        var mins = Math.floor(totalSec / 60);
        var secs = totalSec % 60;
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
    }

    function _setAutoCloseVisible(visible, currentLang) {
        var box = document.getElementById('mi-auto-close');
        var labelEl = document.getElementById('mi-auto-close-label');
        var timeEl = document.getElementById('mi-auto-close-time');
        if (!box) return;
        if (!visible) {
            box.hidden = true;
            if (timeEl) timeEl.textContent = '';
            return;
        }
        box.hidden = false;
        if (labelEl) labelEl.textContent = _t('massInviteAutoCloseHint', {}, currentLang);
        if (timeEl) timeEl.textContent = _formatAutoClose(_autoCloseEndsAt - Date.now());
    }

    function _clearAutoClose() {
        if (_autoCloseInterval !== null) {
            clearInterval(_autoCloseInterval);
            _autoCloseInterval = null;
        }
        _autoCloseEndsAt = 0;
        _setAutoCloseVisible(false);
    }

    function _startAutoClose(currentLang) {
        _clearAutoClose();
        _autoCloseEndsAt = Date.now() + RESULT_AUTO_CLOSE_MS;
        _setAutoCloseVisible(true, currentLang);
        _autoCloseInterval = setInterval(function () {
            var remaining = _autoCloseEndsAt - Date.now();
            var timeEl = document.getElementById('mi-auto-close-time');
            if (timeEl) timeEl.textContent = _formatAutoClose(remaining);
            if (remaining <= 0) {
                finishAndReturn();
            }
        }, 250);
    }

    function _clearTimers() {
        if (_rotateInterval !== null) { clearInterval(_rotateInterval); _rotateInterval = null; }
        if (_longTimer !== null) { clearTimeout(_longTimer); _longTimer = null; }
        if (_returnTimer !== null) { clearTimeout(_returnTimer); _returnTimer = null; }
        _clearAutoClose();
    }

    function _setStatus(text, fade) {
        var el = document.getElementById('mi-progress-status');
        if (!el) return;
        if (fade === false) {
            el.textContent = text;
            el.classList.remove('mi-progress-status--fade');
            return;
        }
        el.classList.add('mi-progress-status--fade');
        setTimeout(function () {
            el.textContent = text;
            el.classList.remove('mi-progress-status--fade');
        }, 220);
    }

    function _setResultHero(visible, payload) {
        var hero = document.getElementById('mi-result-hero');
        if (!hero) return;
        if (!visible) {
            hero.hidden = true;
            hero.classList.remove('is-visible', 'is-empty');
            return;
        }
        var data = payload || {};
        var countEl = document.getElementById('mi-result-count');
        var labelEl = document.getElementById('mi-result-label');
        var metaEl = document.getElementById('mi-result-meta');
        var isEmpty = !!data.empty;
        hero.hidden = false;
        hero.classList.add('is-visible');
        hero.classList.toggle('is-empty', isEmpty);
        if (countEl) countEl.textContent = isEmpty ? '—' : String(data.sentCount != null ? data.sentCount : 0);
        if (labelEl) {
            labelEl.textContent = isEmpty
                ? _t('massInviteResultEmpty', {}, data.lang)
                : _t('massInviteResultSentLabel', {}, data.lang);
        }
        if (metaEl) {
            if (!isEmpty && Number(data.failedCount || 0) > 0) {
                metaEl.textContent = _t('massInviteResultFailedMeta', { count: data.failedCount }, data.lang);
            } else if (!isEmpty) {
                metaEl.textContent = _t('massInvitePhaseResultSubtitle', {}, data.lang);
            } else {
                metaEl.textContent = '';
            }
        }
    }

    function setPhase(phase, currentLang) {
        var next = String(phase || 'collecting');
        _phase = next;
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (overlay) overlay.setAttribute('data-phase', next);

        var titleEl = document.getElementById('t-miProgressTitle');
        var subEl = document.getElementById('t-miProgressSubtitle');
        var spinner = document.querySelector('#mass-invite-progress-overlay .mi-progress-spinner');
        var closeBtn = document.getElementById('mi-progress-close-btn');

        if (next === 'collecting') {
            if (titleEl) titleEl.textContent = _t('massInvitePhaseCollectTitle', {}, currentLang);
            if (subEl) subEl.textContent = _t('massInvitePhaseCollectSubtitle', {}, currentLang);
            if (spinner) spinner.style.display = 'block';
            _setResultHero(false);
            if (closeBtn) closeBtn.style.display = 'none';
            enableCandidateInteraction(false);
        } else if (next === 'sending') {
            if (titleEl) titleEl.textContent = _t('massInvitePhaseSendTitle', {}, currentLang);
            if (subEl) subEl.textContent = _t('massInvitePhaseSendSubtitle', {}, currentLang);
            if (spinner) spinner.style.display = 'none';
            _setResultHero(false);
            if (closeBtn) closeBtn.style.display = 'none';
            enableCandidateInteraction(false);
            if (_rotateInterval !== null) { clearInterval(_rotateInterval); _rotateInterval = null; }
            if (_longTimer !== null) { clearTimeout(_longTimer); _longTimer = null; }
            var longNotice = document.getElementById('mi-progress-long-notice');
            if (longNotice) longNotice.classList.remove('mi-progress-long-notice--visible');
        } else if (next === 'result') {
            if (titleEl) titleEl.textContent = _t('massInvitePhaseResultTitle', {}, currentLang);
            if (subEl) subEl.textContent = _t('massInvitePhaseResultSubtitle', {}, currentLang);
            if (spinner) spinner.style.display = 'none';
            if (_rotateInterval !== null) { clearInterval(_rotateInterval); _rotateInterval = null; }
            if (_longTimer !== null) { clearTimeout(_longTimer); _longTimer = null; }
            var longNotice2 = document.getElementById('mi-progress-long-notice');
            if (longNotice2) longNotice2.classList.remove('mi-progress-long-notice--visible');
        }
    }

    function show(currentLang) {
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (!overlay) return;
        _clearTimers();
        _currentIndex = 0;
        _sourceAppId = 0;

        var noticeEl = document.getElementById('t-miProgressLongNotice');
        var noticeDetailEl = document.getElementById('t-miProgressLongNoticeDetail');
        if (noticeEl) noticeEl.textContent = _t('massInviteProgressLongNotice', {}, currentLang);
        if (noticeDetailEl) noticeDetailEl.textContent = _t('massInviteProgressLongNoticeDetail', {}, currentLang);

        var longNotice = document.getElementById('mi-progress-long-notice');
        if (longNotice) longNotice.classList.remove('mi-progress-long-notice--visible');

        clearCandidates();
        setPhase('collecting', currentLang);
        _setStatus(_t(COLLECT_STATUS_KEYS[0], {}, currentLang), false);

        overlay.classList.add('active');
        overlay.setAttribute('aria-busy', 'true');

        _rotateInterval = setInterval(function () {
            if (_phase !== 'collecting') return;
            _currentIndex = (_currentIndex + 1) % COLLECT_STATUS_KEYS.length;
            _setStatus(_t(COLLECT_STATUS_KEYS[_currentIndex], {}, currentLang));
        }, 1800);

        _longTimer = setTimeout(function () {
            if (_phase !== 'collecting') return;
            if (longNotice) longNotice.classList.add('mi-progress-long-notice--visible');
        }, 10000);
    }

    function hide() {
        _clearTimers();
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            overlay.setAttribute('aria-busy', 'true');
            overlay.setAttribute('data-phase', 'collecting');
        }
        clearCandidates();
        _setResultHero(false);
        var closeBtn = document.getElementById('mi-progress-close-btn');
        if (closeBtn) closeBtn.style.display = 'none';
        _currentIndex = 0;
        _phase = 'collecting';
        _sourceAppId = 0;
    }

    function scrollToOwner(ownerId) {
        var strip = document.getElementById('mi-candidates-strip');
        if (!strip) return;
        strip.querySelectorAll('.mi-candidate-card.is-active-send').forEach(function (el) {
            el.classList.remove('is-active-send');
        });
        var card = strip.querySelector('.mi-candidate-card[data-owner-id="' + String(ownerId) + '"]');
        if (!card) return;
        card.classList.add('is-active-send');
        try {
            card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch (e) {
            card.scrollIntoView();
        }
    }

    function updateProgress(current, total, currentLang) {
        if (_phase !== 'sending') setPhase('sending', currentLang);
        var text = _t('massInviteProgressSending', {
            current: current,
            total: total,
        }, currentLang);
        _setStatus(text, false);
    }

    function showFinalState(statusText, currentLang, details) {
        var info = details || {};
        if (info.sourceAppId) _sourceAppId = Number(info.sourceAppId) || _sourceAppId;
        setPhase('result', currentLang);
        _setResultHero(true, {
            sentCount: info.sentCount != null ? info.sentCount : 0,
            failedCount: info.failedCount || 0,
            empty: !!info.empty,
            lang: currentLang,
        });
        _setStatus(statusText || _t('massInviteReturnHint', {}, currentLang), false);
        enableCandidateInteraction(true);

        var closeBtn = document.getElementById('mi-progress-close-btn');
        if (closeBtn) {
            closeBtn.style.display = 'block';
            closeBtn.textContent = _t('inviteClose', {}, currentLang);
        }

        // Keep result phase open with a clear 2-minute auto-close countdown.
        // Waiting is optional — blast is already finished.
        if (info.autoReturn !== false) {
            _startAutoClose(currentLang);
        }
    }

    function finishAndReturn() {
        if (_returnTimer !== null) {
            clearTimeout(_returnTimer);
            _returnTimer = null;
        }
        _clearAutoClose();
        var projectId = _sourceAppId;
        hide();
        // Prefer refreshing the mass-invite modal if it is still open.
        var modal = document.getElementById('mass-invite-modal');
        if (modal && modal.classList.contains('active') && typeof renderMassInviteModalContent === 'function') {
            renderMassInviteModalContent();
            return;
        }
        if (projectId && typeof openMassInviteModal === 'function') {
            openMassInviteModal(projectId);
        }
    }

    function clearCandidates() {
        var strip = document.getElementById('mi-candidates-strip');
        if (typeof MassInviteCards !== 'undefined' && MassInviteCards.mountStrip) {
            MassInviteCards.mountStrip(strip, [], {});
        } else if (strip) {
            strip.innerHTML = '';
            strip.hidden = true;
            strip.classList.remove('is-visible');
        }
        var card = document.querySelector('#mass-invite-progress-overlay .mi-progress-card');
        if (card) card.classList.remove('has-candidates');
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (overlay) overlay.setAttribute('aria-busy', 'true');
    }

    function setCandidates(candidates, sourceAppId, options) {
        var opts = options || {};
        _sourceAppId = Number(sourceAppId || 0);
        var strip = document.getElementById('mi-candidates-strip');
        if (!strip || typeof MassInviteCards === 'undefined') return;
        var list = candidates || [];
        if (list.length && _phase === 'collecting') setPhase('sending', opts.lang || lang);
        MassInviteCards.mountStrip(strip, list, {
            sourceAppId: sourceAppId,
            interactive: !!opts.interactive,
            lang: opts.lang || lang,
        });
    }

    function setCandidateStatus(ownerId, status) {
        var strip = document.getElementById('mi-candidates-strip');
        if (!strip || typeof MassInviteCards === 'undefined') return false;
        var ok = MassInviteCards.updateCardStatus(strip, ownerId, status);
        if (String(status) === 'sending') scrollToOwner(ownerId);
        return ok;
    }

    function enableCandidateInteraction(enabled) {
        var strip = document.getElementById('mi-candidates-strip');
        var overlay = document.getElementById('mass-invite-progress-overlay');
        if (overlay) overlay.setAttribute('aria-busy', enabled ? 'false' : 'true');
        if (!strip || typeof MassInviteCards === 'undefined') return;
        MassInviteCards.setInteractive(strip, !!enabled);
    }

    return {
        show: show,
        hide: hide,
        setPhase: setPhase,
        updateProgress: updateProgress,
        showFinalState: showFinalState,
        setCandidates: setCandidates,
        setCandidateStatus: setCandidateStatus,
        clearCandidates: clearCandidates,
        enableCandidateInteraction: enableCandidateInteraction,
        finishAndReturn: finishAndReturn,
        scrollToOwner: scrollToOwner,
    };
}());

async function startMassInvite(projectId) {
    if (!projectId) return null;
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return null;
    }

    var actionKey = 'mass_invite_start_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    var btn = document.getElementById('mass-invite-btn');
    var originalLabel = btn ? btn.textContent : '';
    if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
    }
    MassInviteProgressOverlay.show(lang);

    var shouldKeepOverlay = false;
    _apiStart();
    try {
        var planResponse = await fetch(`${API_BASE}/projects/${projectId}/mass_invite/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ owner_id: Number(userId) }))
        });
        var planData = await planResponse.json();
        if (!planResponse.ok || planData.status !== 'success') {
            handleApiError(getBackendErrorCode(planData), planData && planData.details ? planData.details : {});
            return null;
        }

        shouldKeepOverlay = true;

        var candidates = planData.candidates || [];
        var totalCount = candidates.length;

        if (typeof MassInviteSession !== 'undefined') {
            MassInviteSession.createFromPlan(projectId, candidates);
        }

        if (totalCount === 0) {
            var noCandidatesText = (window.t ? window.t('massInviteNoCandidates', {}, lang) : 'No candidates found');
            MassInviteProgressOverlay.showFinalState(noCandidatesText, lang, { empty: true, sentCount: 0, failedCount: 0, sourceAppId: projectId });
            await loadProjects(true);
            return planData;
        }

        if (typeof MassInviteProgressOverlay !== 'undefined' && MassInviteProgressOverlay.setCandidates) {
            MassInviteProgressOverlay.setCandidates(candidates, projectId, { interactive: false, lang: lang });
        }
        if (typeof MassInviteProgressOverlay.setPhase === 'function') {
            MassInviteProgressOverlay.setPhase('sending', lang);
        }

        var successCount = 0;
        var failedCount = 0;

        for (var i = 0; i < totalCount; i++) {
            var candidate = candidates[i];
            MassInviteProgressOverlay.updateProgress(i + 1, totalCount, lang);
            if (typeof MassInviteSession !== 'undefined') {
                MassInviteSession.markSending(projectId, candidate.owner_id);
            }
            if (typeof MassInviteProgressOverlay !== 'undefined' && MassInviteProgressOverlay.setCandidateStatus) {
                MassInviteProgressOverlay.setCandidateStatus(candidate.owner_id, 'sending');
            }
            await new Promise(function(resolve) { setTimeout(resolve, 150); });

            try {
                var sendResponse = await fetch(`${API_BASE}/projects/${projectId}/mass_invite/send_one`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(withInitData({
                        owner_id: Number(userId),
                        target_app_id: Number(candidate.app_id),
                        target_owner_id: Number(candidate.owner_id)
                    }))
                });
                var sendData = await sendResponse.json();
                if (sendResponse.ok && sendData.status === 'success' && sendData.sent) {
                    successCount++;
                    if (typeof MassInviteSession !== 'undefined') {
                        MassInviteSession.markSent(projectId, candidate.owner_id, {
                            offer_id: sendData.offer_id,
                            outcome: sendData.outcome || 'pending'
                        });
                    }
                    if (typeof MassInviteProgressOverlay !== 'undefined' && MassInviteProgressOverlay.setCandidateStatus) {
                        if (sendData.outcome === 'auto_accepted') {
                            MassInviteProgressOverlay.setCandidateStatus(candidate.owner_id, 'accepted');
                        } else {
                            // Brief green "delivered" flash, then yellow waiting ring.
                            MassInviteProgressOverlay.setCandidateStatus(candidate.owner_id, 'delivered');
                            (function (ownerId) {
                                setTimeout(function () {
                                    MassInviteProgressOverlay.setCandidateStatus(ownerId, 'sent');
                                }, 700);
                            })(candidate.owner_id);
                        }
                    }
                } else {
                    failedCount++;
                    if (typeof MassInviteSession !== 'undefined') {
                        MassInviteSession.markFailed(projectId, candidate.owner_id, sendData && sendData.code);
                    }
                    if (typeof MassInviteProgressOverlay !== 'undefined' && MassInviteProgressOverlay.setCandidateStatus) {
                        MassInviteProgressOverlay.setCandidateStatus(candidate.owner_id, 'error');
                    }
                }
            } catch (err) {
                console.error('Failed sending single mass invite:', err);
                failedCount++;
                if (typeof MassInviteSession !== 'undefined') {
                    MassInviteSession.markFailed(projectId, candidate.owner_id, 'network_error');
                }
                if (typeof MassInviteProgressOverlay !== 'undefined' && MassInviteProgressOverlay.setCandidateStatus) {
                    MassInviteProgressOverlay.setCandidateStatus(candidate.owner_id, 'error');
                }
            }
        }

        var lastMassInviteAt = null;

        if (successCount > 0) {
            try {
                var finResponse = await fetch(`${API_BASE}/projects/${projectId}/mass_invite/finalize`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(withInitData({
                        owner_id: Number(userId),
                        sent_count: Number(successCount)
                    }))
                });
                var finData = await finResponse.json();
                if (finResponse.ok && finData.status === 'success') {
                    lastMassInviteAt = finData.last_mass_invite_at;
                }
            } catch (err) {
                console.error('Failed finalising mass invite stats:', err);
            }
            if (typeof MassInviteSession !== 'undefined') {
                MassInviteSession.finalize(projectId, {
                    sent_at: lastMassInviteAt || new Date().toISOString(),
                    sent_count: successCount
                });
            }
        }

        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project && successCount > 0) {
            project.last_mass_invite_at = lastMassInviteAt || new Date().toISOString();
            project.last_mass_invite_sent_count = successCount;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        var finalStatusText = window.t
            ? window.t('massInviteLaunchSuccess', { count: successCount }, lang)
            : ('Sent: ' + successCount);
        if (failedCount > 0 && window.t) {
            finalStatusText += ' · ' + window.t('massInviteResultFailedMeta', { count: failedCount }, lang);
        }
        MassInviteProgressOverlay.showFinalState(finalStatusText, lang, {
            sentCount: successCount,
            failedCount: failedCount,
            empty: successCount <= 0,
            autoReturn: true,
            sourceAppId: projectId
        });

        if (successCount > 0) {
            renderProjects(true);
            refreshOpenModals();
            await loadProjects(true, true);
            refreshMarketAfterMassInvite();
            await Promise.all([loadMutualFeed(), loadBountyFeed()]);
        } else {
            await loadProjects(true, true);
        }

        return {
            status: 'success',
            sent_count: successCount,
            failed_count: failedCount
        };
    } catch (error) {
        console.error('Mass invite launch error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        if (!shouldKeepOverlay) {
            MassInviteProgressOverlay.hide();
        }
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
            body: JSON.stringify(withInitData({ owner_id: userId }))
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
            project.last_mass_invite_sent_count = null;
        }
        if (typeof data.balance_bust !== 'undefined') {
            visibilityStats.balance_bust = Number(data.balance_bust || 0);
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('massInviteResetSuccess', {}, lang));
        renderProjects(true);
        refreshOpenModals();
        loadProjects(true, true).catch(function() {});
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

async function joinDirect(appId) {
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }
    var actionKey = 'joinDirect_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    const rollback = [...mutualSeeking];
    mutualSeeking = mutualSeeking.filter(function(card) { return card.app_id !== appId; });
    renderMutualFeed();
    closeProjectSelectModal();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    if (typeof applyOptimisticMyTestJoin === 'function') {
        applyOptimisticMyTestJoin(appId, { join_type: 'direct' });
    }
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId, allow_over_limit: false, join_type: 'direct' }))
        });
        const result = await response.json();
        if (result.status !== 'success') {
            mutualSeeking = rollback;
            renderMutualFeed();
            if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        if (typeof refreshMyTestsNow === 'function') refreshMyTestsNow();
        else loadTasks(false);
        loadMutualFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join direct error:', error);
        mutualSeeking = rollback;
        renderMutualFeed();
        if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function joinMutual(appId, allowOverLimit = false) {
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }
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
    if (typeof applyOptimisticMyTestJoin === 'function') {
        applyOptimisticMyTestJoin(appId, { join_type: 'mutual' });
    }
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId, allow_over_limit: allowOverLimit }))
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
            if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        if (typeof refreshMyTestsNow === 'function') refreshMyTestsNow();
        else loadTasks(false);
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
        if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

var _pendingJoinBountyAppId = null;
var _joinBountyContextByApp = {};

function registerJoinBountyContext(item) {
    if (!item) return;
    var appId = Number(item.app_id != null ? item.app_id : item.id) || 0;
    if (appId <= 0) return;
    _joinBountyContextByApp[appId] = {
        app_id: appId,
        name: item.name || '',
        package_name: item.package_name || item.package || '',
        icon_url: item.icon_url || '',
        bounty_per_tester: Number(item.bounty_per_tester || 0),
    };
}

function _findJoinBountyContract(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return null;
    var candidate = null;
    if (typeof _findFeedItemForOptimisticJoin === 'function') {
        candidate = _findFeedItemForOptimisticJoin(normalizedId);
    }
    if ((!candidate || !Number(candidate.bounty_per_tester)) && Array.isArray(bountyContracts)) {
        var fromPool = bountyContracts.find(function(item) {
            return Number(item && item.app_id) === normalizedId;
        });
        if (fromPool) candidate = fromPool;
    }
    var ctx = _joinBountyContextByApp[normalizedId];
    if (ctx) {
        if (!candidate) {
            candidate = ctx;
        } else if (!Number(candidate.bounty_per_tester) && Number(ctx.bounty_per_tester)) {
            candidate = Object.assign({}, candidate, {
                bounty_per_tester: ctx.bounty_per_tester,
                name: candidate.name || ctx.name,
                package_name: candidate.package_name || ctx.package_name,
                icon_url: candidate.icon_url || ctx.icon_url,
            });
        }
    }
    return candidate;
}

function _buildJoinBountyGrantPreviewHtml(grant) {
    grant = grant || (typeof getGrantEstimateData === 'function'
        ? getGrantEstimateData({ skips_count: 0, daily_timeline: '' })
        : { base: 50, karmaBonus: 0, perfectBonus: 50, skips: 0, total: 100 });
    var formatAmount = typeof formatBustAmount === 'function'
        ? formatBustAmount
        : function(value) { return String(value) + ' $BUST'; };
    var skipIndicator = Array.from({ length: 3 }, function() {
        return '<span class="skip-dot available"></span>';
    }).join('');
    var T = function(key, vars) {
        return window.t(key, vars || {}, lang) || key;
    };
    var esc = function(value) {
        return typeof window.escapeHTML === 'function' ? window.escapeHTML(value) : String(value || '');
    };

    return '<div class="grant-dashboard-block">' +
        '<div class="grant-dashboard-header">' +
            '<div class="grant-dashboard-heading">' +
                '<div class="grant-dashboard-title">' + esc(T('grantGoldTesterTitle')) + '</div>' +
                '<div class="grant-dashboard-subtitle">' + esc(T('joinBountyGrantSubtitle')) + '</div>' +
            '</div>' +
            '<div class="grant-dashboard-total notranslate">' + esc(T('grantTotalEstimateValue', { amount: formatAmount(grant.total) })) + '</div>' +
        '</div>' +
        '<div class="grant-dashboard-skips-row">' +
            '<span class="grant-skip-text">' + esc(T('grantSkipsLabel', { used: 0, max: 3 })) + '</span>' +
            '<span class="grant-dashboard-skips">' + skipIndicator + '</span>' +
        '</div>' +
        '<div class="grant-reward-grid">' +
            '<div class="grant-reward-card">' +
                '<div class="grant-reward-label">' + esc(T('grantBaseLabel')) + '</div>' +
                '<div class="grant-reward-value notranslate">' + esc(T('grantBaseValue', { amount: formatAmount(grant.base || 50) })) + '</div>' +
                '<div class="grant-reward-status is-active">' + esc(T('grantCardActive')) + '</div>' +
            '</div>' +
            '<div class="grant-reward-card">' +
                '<div class="grant-reward-label">' + esc(T('grantPerfectLabel')) + '</div>' +
                '<div class="grant-reward-value notranslate">' + esc(T('grantPerfectValue', { amount: formatAmount(50) })) + '</div>' +
                '<div class="grant-reward-status is-active">' + esc(T('grantCardActive')) + '</div>' +
            '</div>' +
            '<div class="grant-reward-card">' +
                '<div class="grant-reward-label">' + esc(T('grantKarmaBonusLabel')) + '</div>' +
                '<div class="grant-reward-value notranslate">' + esc(T('grantKarmaValue', { amount: formatAmount(grant.karmaBonus || 0) })) + '</div>' +
                '<div class="grant-reward-status is-active">' + esc(T('grantCardActive')) + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="join-bounty-confirm-grant-note">' + esc(T('joinBountyGrantNote')) + '</div>' +
    '</div>';
}

function openJoinBountyConfirmModal(appId) {
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;

    var contract = _findJoinBountyContract(normalizedId) || { app_id: normalizedId };
    var bounty = Number(contract.bounty_per_tester || 0);
    var checkinsReward = Math.round(bounty * 0.65);
    var holdReward = Math.round(bounty * 0.35);
    var formatAmount = typeof formatBustAmount === 'function'
        ? formatBustAmount
        : function(value) { return String(value) + ' $BUST'; };
    var T = function(key, vars) {
        return window.t(key, vars || {}, lang) || key;
    };

    _pendingJoinBountyAppId = normalizedId;

    var projectEl = document.getElementById('join-bounty-confirm-project');
    if (projectEl) {
        var safeName = (typeof window.escapeHTML === 'function'
            ? window.escapeHTML(contract.name || T('unknownLabel'))
            : String(contract.name || ''));
        var safePackage = (typeof window.escapeHTML === 'function'
            ? window.escapeHTML(contract.package_name || '')
            : String(contract.package_name || ''));
        var iconHtml = typeof renderIcon === 'function'
            ? renderIcon(contract.name || '', contract.icon_url)
            : '';
        projectEl.innerHTML = iconHtml +
            '<div class="card-info">' +
                '<div class="card-title notranslate">' + safeName + '</div>' +
                (safePackage ? '<div class="card-subtitle notranslate">' + safePackage + '</div>' : '') +
            '</div>';
    }

    var totalEl = document.getElementById('join-bounty-confirm-total');
    if (totalEl) totalEl.textContent = formatAmount(bounty);
    var checkinsEl = document.getElementById('join-bounty-confirm-checkins');
    if (checkinsEl) checkinsEl.textContent = formatAmount(checkinsReward);
    var holdEl = document.getElementById('join-bounty-confirm-hold');
    if (holdEl) holdEl.textContent = formatAmount(holdReward);

    var grant = typeof getGrantEstimateData === 'function'
        ? getGrantEstimateData({ skips_count: 0, daily_timeline: '' })
        : { base: 50, karmaBonus: 0, perfectBonus: 50, skips: 0, total: 100 };
    var grantTotal = Number(grant.total || 0);
    var grandTotal = bounty + grantTotal;

    var grantEl = document.getElementById('join-bounty-confirm-grant');
    if (grantEl) grantEl.innerHTML = _buildJoinBountyGrantPreviewHtml(grant);

    var grandTotalEl = document.getElementById('join-bounty-confirm-grand-total');
    if (grandTotalEl) grandTotalEl.textContent = '~' + formatAmount(grandTotal);
    var breakdownEl = document.getElementById('join-bounty-confirm-total-breakdown');
    if (breakdownEl) {
        breakdownEl.innerHTML =
            T('joinBountyContractPart') + ' <span class="jb-total-part notranslate">' + formatAmount(bounty) + '</span>' +
            ' + ' +
            T('joinBountyGrantPart') + ' <span class="jb-total-part notranslate">~' + formatAmount(grantTotal) + '</span>';
    }

    var setText = function(selector, key) {
        var el = document.querySelector(selector);
        if (el) el.textContent = T(key);
    };
    setText('#join-bounty-confirm-title', 'joinBountyConfirmTitle');
    setText('#join-bounty-confirm-intro', 'joinBountyConfirmIntro');
    setText('#join-bounty-confirm-modal .jb-total-label', 'joinBountyTotalLabel');
    setText('#join-bounty-confirm-modal .jb-section-title[data-i18n="joinBountyOwnerBlockTitle"]', 'joinBountyOwnerBlockTitle');
    setText('#join-bounty-confirm-modal .jb-section-tag[data-i18n="joinBountyOwnerBlockTag"]', 'joinBountyOwnerBlockTag');
    setText('#join-bounty-confirm-modal .jb-section-title[data-i18n="joinBountyGrantBlockTitle"]', 'joinBountyGrantBlockTitle');
    setText('#join-bounty-confirm-modal .jb-section-tag[data-i18n="joinBountyGrantBlockTag"]', 'joinBountyGrantBlockTag');
    setText('#join-bounty-confirm-modal .join-bounty-reward-title', 'joinBountyRewardLabel');
    setText('#join-bounty-confirm-modal .join-bounty-reward-row span[data-i18n="joinBountyCheckinsLabel"]', 'joinBountyCheckinsLabel');
    setText('#join-bounty-confirm-modal .join-bounty-reward-row span[data-i18n="joinBountyHoldLabel"]', 'joinBountyHoldLabel');
    setText('#join-bounty-confirm-modal .join-bounty-reward-hint', 'joinBountyHoldAutoHint');
    setText('#join-bounty-confirm-modal .join-bounty-confirm-warning span', 'bountyModalWarningText');
    setText('#join-bounty-confirm-btn', 'joinBountyConfirmBtn');
    setText('#join-bounty-confirm-cancel', 'btnCancel');

    var modal = document.getElementById('join-bounty-confirm-modal');
    if (modal) {
        modal.classList.add('active');
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function closeJoinBountyConfirmModal(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    _pendingJoinBountyAppId = null;
    var modal = document.getElementById('join-bounty-confirm-modal');
    if (modal) modal.classList.remove('active');
}

function joinBounty(appId) {
    openJoinBountyConfirmModal(appId);
}

async function confirmJoinBounty() {
    var appId = Number(_pendingJoinBountyAppId || 0);
    if (appId <= 0) return;
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        closeJoinBountyConfirmModal();
        return;
    }

    var actionKey = 'joinBounty_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    closeJoinBountyConfirmModal();

    // Optimistic UI: remove card immediately, rollback on error
    const rollback = [...bountyContracts];
    bountyContracts = bountyContracts.filter(c => c.app_id !== appId);
    renderBountyFeed();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    if (typeof applyOptimisticMyTestJoin === 'function') {
        applyOptimisticMyTestJoin(appId, { join_type: 'bounty', isBounty: true });
    }
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/bounty/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId }))
        });
        const result = await response.json();
        if (result.status !== 'success') {
            bountyContracts = rollback;
            renderBountyFeed();
            if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        if (typeof refreshMyTestsNow === 'function') refreshMyTestsNow();
        else loadTasks(false);
        loadBountyFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join bounty error:', error);
        bountyContracts = rollback;
        renderBountyFeed();
        if (typeof removeOptimisticMyTest === 'function') removeOptimisticMyTest(appId);
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function confirmDropTest() {
    if (!_dropTestAppId) return;
    try {
        const response = await fetch(`${API_BASE}/tests/${_dropTestAppId}/drop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ tester_id: userId }))
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
            body: JSON.stringify(withInitData({
                tester_id: userId,
                leave_reason: reasonPayload,
                is_justified: !!isJustified,
            }))
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
            body: JSON.stringify(withInitData({
                owner_id: userId,
                leave_reason: reasonPayload,
            }))
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
            body: JSON.stringify(withInitData({ tester_id: userId }))
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

async function submitSocialLink() {
    const url = document.getElementById('social-url-input').value.trim();
    if (!url.startsWith('http')) return;
    try {
        const response = await fetch(`${API_BASE}/social-bonus/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ user_id: userId, url }))
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

async function restartArchivedProject(appId, settingsPayload) {
    var normalizedAppId = Number(appId || 0);
    if (!normalizedAppId || !userId) return null;

    var actionKey = 'restart_archived_' + normalizedAppId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    var requestBody = Object.assign({
        owner_id: userId,
        init_data: (typeof getTelegramInitDataRaw === 'function') ? getTelegramInitDataRaw() : ((tg && tg.initData) || ''),
    }, settingsPayload || {});

    _apiStart();
    try {
        const response = await fetch(`${API_BASE}/apps/${normalizedAppId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
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
        const response = await fetch(`${API_BASE}/projects/${appId}/testers/${testerId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                init_data: (typeof getTelegramInitDataRaw === 'function') ? getTelegramInitDataRaw() : ((tg && tg.initData) || ''),
            }),
        });
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
        body: JSON.stringify(withInitData({ owner_id: userId, progress_id: progressId }))
    });
    var result = await response.json();
    return {
        ok: !!(response.ok && result && result.status === 'success'),
        result: result,
    };
}

async function resolveAccessError(projectId, progressId) {
    if (!projectId) return;
    var safeProgressId = Number(progressId || 0);
    var actionKey = 'resolve_access_error_' + projectId + '_' + safeProgressId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        var request = await _postResolveAccessError(projectId, safeProgressId);
        if (!request.ok) {
            handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
            loadProjects(true).catch(function() {});
            return;
        }
        if (safeProgressId > 0) {
            _markProjectAccessIssueResolved(projectId, safeProgressId);
        } else {
            _markAllProjectAccessIssuesResolved(projectId);
        }
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
    if (!projectId) return;
    var normalizedIds = Array.from(new Set((Array.isArray(progressIds) ? progressIds : []).map(function(id) {
        return Number(id || 0);
    }).filter(function(id) {
        return id > 0;
    })));

    var actionKey = 'resolve_access_error_all_' + projectId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        // Backend resolves by app_id; progress_id is optional context only.
        var request = await _postResolveAccessError(projectId, normalizedIds[0] || 0);
        if (!request.ok) {
            handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
            loadProjects(true).catch(function() {});
            return;
        }

        if (normalizedIds.length) {
            for (var index = 0; index < normalizedIds.length; index++) {
                _markProjectAccessIssueResolved(projectId, normalizedIds[index]);
            }
        } else {
            _markAllProjectAccessIssuesResolved(projectId);
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
    if (typeof window.updateOwnerAccessIssueBanner === 'function') {
        window.updateOwnerAccessIssueBanner();
    }
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

function projectHasPendingAccessIssue(project) {
    if (!project) return false;
    if (String(project.status || '').toLowerCase() === 'access_error') return true;
    var testers = Array.isArray(project.testers) ? project.testers : [];
    return testers.some(function(tester) {
        return !!tester.issue_reported_at && !tester.issue_fixed_at;
    });
}

function getOwnerPendingAccessIssueProjects() {
    return (myProjects || []).filter(projectHasPendingAccessIssue);
}

function ownerHasPendingAccessIssue() {
    return getOwnerPendingAccessIssueProjects().length > 0;
}

function assertOwnerCanTakeForeignTests() {
    if (!ownerHasPendingAccessIssue()) return true;
    showToast(window.t('ownerAccessIssueBlockToast', {}, lang));
    if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    return false;
}

function openOwnerAccessIssueProject(projectId) {
    var normalizedId = Number(projectId || 0);
    if (normalizedId <= 0) return;
    if (typeof switchTab === 'function') switchTab('projects');
    var expand = function() {
        if (typeof _expandProjectCardWhenReady === 'function') {
            _expandProjectCardWhenReady(normalizedId);
        }
    };
    if (typeof loadProjects === 'function') {
        loadProjects(true, true).then(expand).catch(expand);
    } else {
        expand();
    }
}

function updateOwnerAccessIssueBanner() {
    var banner = document.getElementById('owner-access-issue-banner');
    var titleEl = document.getElementById('owner-access-issue-banner-title');
    var itemsEl = document.getElementById('owner-access-issue-banner-items');
    if (!banner || !titleEl || !itemsEl) return;

    var pending = getOwnerPendingAccessIssueProjects();
    if (!pending.length) {
        banner.style.display = 'none';
        return;
    }

    banner.style.display = 'flex';
    titleEl.textContent = window.t('ownerAccessIssueBannerTitle', {}, lang);
    itemsEl.innerHTML = pending.map(function(project) {
        var projectName = String(project.name || ('#' + project.id));
        var testers = Array.isArray(project.testers) ? project.testers : [];
        var affectedTesters = testers.filter(function(tester) {
            return !!tester.issue_reported_at && !tester.issue_fixed_at;
        });
        if (!affectedTesters.length) affectedTesters = [null];

        var messages = affectedTesters.map(function(tester) {
            var username = String(tester && tester.username || '').trim().replace(/^@+/, '');
            var marker = '__ACCESS_TESTER__';
            var message = window.escapeHTML(window.t('ownerAccessIssueBannerMessage', {
                tester: marker,
                name: projectName
            }, lang));
            var testerHtml = window.escapeHTML(window.t('ownerAccessIssueBannerUnknownTester', {}, lang));
            if (username) {
                testerHtml = '<button type="button" class="owner-access-issue-banner__tester notranslate" ' +
                    'onclick="event.stopPropagation(); contactAccessTester(\'' + escapeInlineJsString(username) + '\')">@' +
                    window.escapeHTML(username) + '</button>';
            }
            return '<p>' + message.replace(marker, testerHtml) + '</p>';
        }).join('');

        return '<div class="owner-access-issue-banner__item">' +
            messages +
            '<span class="owner-access-issue-banner__continuity">' +
                window.escapeHTML(window.t('ownerAccessIssueBannerContinuity', {}, lang)) +
            '</span>' +
            '<button type="button" class="owner-access-issue-banner__project-link" ' +
                'onclick="openOwnerAccessIssueProject(' + Number(project.id) + ')">' +
                window.escapeHTML(window.t('ownerAccessIssueBannerOpenProject', {}, lang)) +
                '<span aria-hidden="true">→</span>' +
            '</button>' +
        '</div>';
    }).join('');
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

function _markAllProjectAccessIssuesResolved(projectId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project || !Array.isArray(project.testers)) return false;

    var updated = false;
    var nowIso = new Date().toISOString();
    project.testers = project.testers.map(function(tester) {
        if (!(tester && tester.issue_reported_at) || tester.issue_fixed_at) {
            return tester;
        }
        updated = true;
        return Object.assign({}, tester, {
            issue_fixed_at: nowIso,
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
    if (!projectId) return;
    var safeProgressId = Number(progressId || 0);
    var actionKey = 'delete_access_tester_' + projectId + '_' + safeProgressId;
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
        if (safeProgressId <= 0) {
            // Stale UI without progress_id: refresh and clear local freeze markers.
            _markAllProjectAccessIssuesResolved(projectId);
            _syncProjectsUiAfterOptimisticChange();
            loadProjects(true).catch(function() {});
            showToast(window.t('accessOverlayDeleteDone', {}, lang));
            return;
        }
        var response = await fetch(`${API_BASE}/projects/${projectId}/delete_access_tester`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({ owner_id: userId, progress_id: safeProgressId }))
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            loadProjects(true).catch(function() {});
            return;
        }
        _removeProjectAccessTester(projectId, safeProgressId);
        var projectAfterDelete = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        _recomputeProjectAccessErrorState(projectAfterDelete);
        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t(
            projectHasPendingAccessIssue(projectAfterDelete)
                ? 'accessOverlayDeleteDoneRemaining'
                : 'accessOverlayDeleteDoneUnfrozen',
            {},
            lang
        ));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Delete access tester failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

