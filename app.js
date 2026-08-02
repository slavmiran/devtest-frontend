/* app.js — thin bootstrap/facade (after Phase 5.1-5.4 split). */
/* Contains only: DOMContentLoaded bootstrap + window / window.App re-exports. */
/* All logic lives in js/app-config.js, app-api.js, app-actions.js, app-features.js. */

document.addEventListener('DOMContentLoaded', () => {
    if (ensureLanguageRuntimeConsistency()) {
        return;
    }

    if (localStorage.getItem('hideBanner') === 'true') {
        const banner = document.getElementById('main-banner');
        if (banner) banner.style.display = 'none';
    }

    refreshLanguageUi();
    if (typeof initHomeScreenPromo === 'function') {
        initHomeScreenPromo();
    }
    if (!hasTelegramUsername()) {
        showNoUsernameOverlay();
        return;
    }
    var runtimeConfigPromise = loadRuntimeConfig();
    var bootstrapProfileSyncPromise = syncTelegramProfile();
    loadUserProfilePreferences().catch(function() {});

    syncUserTimezone(false).catch(() => {});

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _pendingScreenshotReminderUsername !== null) {
            const username = _pendingScreenshotReminderUsername;
            _pendingScreenshotReminderUsername = null;
            setTimeout(() => showScreenshotCompleteModal(username), 300);
        }
        if (!document.hidden) {
            _syncActiveTimerState();
            if (typeof hasPendingFeedbackCheckins === 'function' && hasPendingFeedbackCheckins()) {
                _lastFetchTimes.tests = 0;
            }
            if (typeof refreshHomeScreenStatus === 'function') {
                refreshHomeScreenStatus({ force: true });
            }
            renderTests(true);
            loadTasks(true).catch(() => {});
            loadIncomingOffers({ background: true }).catch(() => {});
            loadReliabilitySummary(true).catch(() => {});
        }
    });

    window.addEventListener('focus', function() {
        _syncActiveTimerState();
        if (typeof hasPendingFeedbackCheckins === 'function' && hasPendingFeedbackCheckins()) {
            _lastFetchTimes.tests = 0;
            loadTasks(true).catch(function() {});
        }
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
    if (typeof initTelegramBackButton === 'function') {
        initTelegramBackButton();
    }

    (async function() {
        console.log('[DEBUG] bootstrap IIFE started');
        var profileSyncResult = await bootstrapProfileSyncPromise;
        console.log('[DEBUG] bootstrap: profileSync done, ok=', profileSyncResult && profileSyncResult.ok);
        await bootstrapInterfaceLanguage({ profileSyncResult: profileSyncResult });
        await runtimeConfigPromise;
        var guestIntent = _parseGuestClaimIntent();
        if (guestIntent) {
            await _handleGuestClaimIntent(guestIntent);
        } else {
            var mutualIntent = _parseMutualInviteIntent();
            if (mutualIntent) {
                await _handleMutualInviteIntent(mutualIntent);
            }
        }

        loadTasks().catch(function(e) { console.error('Bootstrap loadTasks error:', e); });
        loadReliabilitySummary().catch(function(e) { console.error('Bootstrap loadReliabilitySummary error:', e); });
        loadReliabilityBreakdown(true).catch(function(e) { console.error('Bootstrap loadReliabilityBreakdown error:', e); });
        loadIncomingOffers().catch(function(e) { console.error('Bootstrap loadIncomingOffers error:', e); });
        try { startOffersPolling(); } catch (e) { console.error('Bootstrap startOffersPolling error:', e); }
        try { startMarketPolling(); } catch (e) { console.error('Bootstrap startMarketPolling error:', e); }
        loadEvents().catch(function(e) { console.error('Bootstrap loadEvents error:', e); });
        loadExternalCounts().catch(function(e) { console.error('Bootstrap loadExternalCounts error:', e); });
        if (typeof loadGuestApps === 'function') {
            loadGuestApps().catch(function(e) { console.error('Bootstrap loadGuestApps error:', e); });
        }
        try { scheduleDeferredBootstrap(); } catch (e) { console.error('Bootstrap deferred error:', e); }
        console.log('[DEBUG] bootstrap: all fire-and-forget launched, calling _handleInitialRoute');
        await _handleInitialRoute();
        console.log('[DEBUG] bootstrap IIFE completed successfully');
    })().catch(function(error) {
        console.error('Initial bootstrap failed:', error);
    });
});

Object.assign(window, {
    GUEST_CLAIM_COMMUNITY_URL,
    resolveInterfaceLanguage,
    applyInterfaceLanguageFromServer,
    bootstrapInterfaceLanguage,
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
    initHomeScreenPromo,
    syncHomeScreenUi,
    refreshHomeScreenStatus,
    addDevTestHubToHomeScreen,
    dismissHomeScreenBanner,
    applyLanguage,
    showAutoAcceptMutualInfo,
    handleAutoAcceptMutualToggle,
    showDeviceProfileInfo,
    openDeviceInfoEditorModal,
    closeDeviceInfoEditorModal,
    saveDeviceInfoFromModal,
    openSettingsEmailModal,
    closeSettingsEmailModal,
    saveSettingsEmail,
    deleteSettingsEmail,
    populateSettingsEmail,
    syncSettingsEmailRowUi,
    detectAndroidVersionInModal,
    openDeviceProfileFromPrompt,
    closeDeviceProfileBanner,
    populateDeviceInfoSettings,
    applyDeviceInfoFromProfile,
    syncDeviceProfileUi,
    renderFeedbackDeviceInfoBlock,
    copyFeedbackCardContent,
    formatDeviceInfoForCopy,
    buildPublicDeviceLine,
    parseDeviceInfoData,
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
    openJoinBountyConfirmModal,
    closeJoinBountyConfirmModal,
    confirmJoinBounty,
    registerJoinBountyContext,
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
    buildGuestClaimStartappValue,
    _canUserClaimGuestApp,
    _loadGuestAppPreview,
    _executeGuestClaimIntent,
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
    hasPendingFeedbackCheckins,
    isTestFeedbackCheckinPending,
    markTestFeedbackCheckinPending,
    clearTestFeedbackCheckinPending,
    applyTestFeedbackCheckinPendingUi,
    clearCompletedPendingFeedbackCheckins,
    openProjectFeedback,
    sendProjectFeedbackMedia,
    openFeedbackRewardModal,
    closeFeedbackRewardModal,
    canPromptPlayReview,
    canTogglePlayReview,
    getPlayReviewStatus,
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
    fetchContributionStats,
    fetchContributionCurrent,
    fetchContributionHistory,
    claimContributionPrize,
    sendKarmaReward,
    confirmStart,
    showCheckinRewardToasts,
    handleClaimGrantClick,
    claimEarlyFinishBonus,
    deleteTester,
    resolveAccessError,
    contactAccessTester,
    deleteAccessTester,
    assertOwnerCanTakeForeignTests,
    ownerHasPendingAccessIssue,
    updateOwnerAccessIssueBanner,
    openOwnerAccessIssueProject,
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
    confirmRestartFromSettings,
    restartArchivedProject,
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
    attachDeviceInfoToBugs: _attachDeviceInfoToBugs,
    deviceInfo: _deviceInfo,
    deviceProfileComplete: _deviceProfileComplete,
    deviceProfileRewardClaimed: _deviceProfileRewardClaimed,
    getProjectVisibilityMode: getProjectVisibilityMode,
    getState: () => ({
        lang,
        appLang,
        userEmail: _userEmail,
        autoAcceptMutual: _autoAcceptMutualEnabled,
    attachDeviceInfoToBugs: _attachDeviceInfoToBugs,
    deviceInfo: _deviceInfo,
    deviceProfileComplete: _deviceProfileComplete,
    deviceProfileRewardClaimed: _deviceProfileRewardClaimed,
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