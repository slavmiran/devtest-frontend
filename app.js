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
    buildGuestClaimStartappValue,
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
