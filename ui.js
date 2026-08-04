/* Phase 4.4 — ui.js facade (re-exports for backward compatibility) */
/* All functions are now defined in ui/ui-*.js modules. */
/* This file exists only for Object.assign(window, {...}) re-exports. */

var _lastSystemErrorReport = 0;
var SYSTEM_ERROR_THROTTLE_MS = 10000;

window.reportSystemError = function(message, details) {
    var now = Date.now();
    if (now - _lastSystemErrorReport < SYSTEM_ERROR_THROTTLE_MS) return;
    _lastSystemErrorReport = now;

    var payload = {
        message: String(message || 'unknown error').substring(0, 500),
        stack_trace: String(details || '').substring(0, 1000),
        user_id: (window.userId || 0),
        source: 'frontend'
    };

    try {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', (window.API_BASE || '') + '/log-error', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
    } catch (e) {}
};

Object.assign(window, {
    showSkeleton,
    showRetry,
    formatTimeAgo,
    getAvatar,
    renderIcon,
    formatOfferRemaining,
    renderProjects,
    openOvertimeModal,
    closeOvertimeModal,
    overtimeContactOwner,
    openKickTesterModal,
    closeKickTesterModal,
    toggleKickReasonOther,
    toggleKickUnlinkHint,
    openSyncModal,
    closeSyncModal,
    openProtectionCenter,
    closeProtectionCenter,
    _ppcUpdateCalculations,
    _ppcChangeTip,
    _ppcAddTip,
    _ppcSwitchToEditMode,
    _renderProtectionCenterState1,
    _renderProtectionCenterState2,
    renderArchivedProjects,
    toggleArchive,
    showScreenshotDayAlert,
    showVisibilityToast,
    renderVisibilityModeModal,
    openVisibilityModeModal,
    closeVisibilityModeModal,
    applyVisibilityModeFromModal,
    handleMassInviteAction,
    openInviteModal,
    setInviteMode,
    escapeForAttr,
    copyAndAction,
    publishProjectToMarketAction,
    closeInviteModal,
    openDeleteModal,
    closeDeleteModal,
    openModal,
    closeModal,
    switchGroupTab,
    closeEmailWarningModal,
    showReadonlyAlert,
    openEditModal,
    openRestartArchivedModal,
    isEditModalRestartMode,
    closeEditModal,
    openImageZoom,
    closeImageZoom,
    escapeHTML: window.escapeHTML,
    copyEmail,
    openProjectDetailsModal,
    closeProjectDetailsModal,
});

Object.assign(window.ui, {
    showLoading,
    hideLoading,
    showGuestTestsInfoAlert,
    triggerGuestShowcaseNavigation,
});