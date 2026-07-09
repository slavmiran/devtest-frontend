/* ============================================================
   ui/ui-projects-pipeline-header.js
   Morphing collapsible sticky header for My Projects tab
   ============================================================ */

var _pipelineScrollBound = false;
var _pipelineHeaderState = {
    testing: { count: 0, hasAlert: false, alertProjectId: null },
    moderation: { count: 0, hasAlert: false, alertProjectId: null },
    live: { count: 0, hasAlert: false, alertProjectId: null },
};

var PIPELINE_COLLAPSE_AT = 72;
var PIPELINE_EXPAND_AT = 48;
var _pipelineCollapsed = false;
var _pipelineScrollRaf = 0;
var _pipelineScreenLockObserverBound = false;

var PIPELINE_SCREEN_LOCK_SELECTORS = '.modal-overlay, .protection-center-view, #attract-testers-sheet-overlay, .wizard-overlay';

function resolvePipelineProjectPhase(project) {
    if (!project || typeof project !== 'object') return 'testing';
    var phase = String(project.phase == null ? '' : project.phase).trim().toLowerCase();
    if (phase === 'moderation' || phase === 'live') return phase;
    var status = String(project.app_status || project.status || '').trim().toLowerCase();
    if (status === 'completed' || status === 'pending_completion') return 'moderation';
    return 'testing';
}

function getProjectPipelineAlertType(project) {
    if (!project) return null;
    var pendingIssueTesters = (Array.isArray(project.testers) ? project.testers : []).filter(function(tester) {
        return !!tester.issue_reported_at && !tester.issue_fixed_at;
    });
    if (project.status === 'access_error' && pendingIssueTesters.length > 0) return 'danger';
    if (Number(project.feedback_new_count || 0) > 0) return 'feedback';
    var projectStatus = String(project.app_status || project.status || 'active').toLowerCase();
    var isPendingCompletion = projectStatus === 'pending_completion';
    var platformDays = typeof getProjectPlatformDay === 'function'
        ? getProjectPlatformDay(project.created_at)
        : 0;
    var syncDay = Number(project.google_sync_day || 0);
    if (isPendingCompletion || (platformDays >= 7 && syncDay < 1)) return 'sync';
    return null;
}

function projectNeedsPipelineAttention(project) {
    return getProjectPipelineAlertType(project) !== null;
}

function collectPipelineProjectsByPhase() {
    var testing = [];
    var moderation = [];
    var live = [];

    (myProjects || []).forEach(function(project) {
        var phase = resolvePipelineProjectPhase(project);
        if (phase === 'moderation') moderation.push(project);
        else if (phase === 'live') live.push(project);
        else testing.push(project);
    });

    (typeof archivedProjects !== 'undefined' ? archivedProjects : []).forEach(function(project) {
        if (resolvePipelineProjectPhase(project) !== 'moderation') return;
        moderation.push({
            id: project.app_id || project.id,
            app_status: project.status || 'completed',
            status: project.status || 'completed',
            phase: 'moderation',
            name: project.name,
            package: project.package_name || project.package || '',
            feedback_new_count: project.feedback_new_count || 0,
            feedback_total_count: project.feedback_total_count || 0,
            testers: project.testers || [],
            created_at: project.created_at || null,
            google_sync_day: project.google_sync_day || 0,
        });
    });

    return { testing: testing, moderation: moderation, live: live };
}

function buildPipelinePhaseMeta(projects) {
    var hasFeedbackAlert = false;
    var hasDangerAlert = false;
    var alertProjectId = null;
    var alertPriority = -1;
    var priorityMap = { danger: 3, feedback: 2, sync: 1 };

    for (var i = 0; i < projects.length; i++) {
        var alertType = getProjectPipelineAlertType(projects[i]);
        if (!alertType) continue;
        if (alertType === 'danger') hasDangerAlert = true;
        if (alertType === 'feedback') hasFeedbackAlert = true;
        var priority = priorityMap[alertType] || 0;
        if (priority > alertPriority) {
            alertPriority = priority;
            alertProjectId = Number(projects[i].id || projects[i].app_id || 0) || null;
        }
    }

    return {
        count: projects.length,
        hasFeedbackAlert: hasFeedbackAlert,
        hasDangerAlert: hasDangerAlert,
        hasAlert: alertProjectId !== null,
        alertProjectId: alertProjectId,
    };
}

function refreshPipelineHeaderState() {
    var grouped = collectPipelineProjectsByPhase();
    _pipelineHeaderState = {
        testing: buildPipelinePhaseMeta(grouped.testing),
        moderation: buildPipelinePhaseMeta(grouped.moderation),
        live: buildPipelinePhaseMeta(grouped.live),
    };
    return _pipelineHeaderState;
}

function _pipelinePhaseLabel(phaseKey) {
    var map = {
        testing: 'pipelinePhaseTesting',
        moderation: 'pipelinePhaseModeration',
        live: 'pipelinePhaseLive',
    };
    return window.t(map[phaseKey] || 'pipelinePhaseTesting', {}, typeof lang !== 'undefined' ? lang : 'ru');
}

function _pipelinePhaseIcon(phaseKey) {
    if (phaseKey === 'moderation') return '🛂';
    if (phaseKey === 'live') return '🚀';
    return '🧪';
}

function _renderPipelineTrackHtml(trackClass, compact) {
    var phases = ['testing', 'moderation', 'live'];
    var parts = ['<div class="pipeline-track ' + (compact ? 'pipeline-track--compact' : '') + '">'];

    phases.forEach(function(phaseKey, index) {
        if (index > 0) {
            var prev = _pipelineHeaderState[phases[index - 1]];
            var current = _pipelineHeaderState[phaseKey];
            var thin = (prev.count === 0 && current.count === 0) || (phaseKey === 'moderation' && current.count === 0);
            parts.push('<span class="pipeline-connector' + (thin ? ' is-thin' : '') + '" aria-hidden="true"></span>');
        }

        var meta = _pipelineHeaderState[phaseKey] || { count: 0, hasAlert: false };
        var isEmpty = meta.count === 0 && phaseKey === 'moderation';
        var classes = [
            'pipeline-phase',
            'pipeline-phase--' + phaseKey,
            isEmpty ? 'is-empty' : '',
            meta.hasDangerAlert ? 'has-danger-alert' : '',
        ].filter(Boolean).join(' ');
        var badgeClass = 'pipeline-phase__badge' + (meta.hasFeedbackAlert ? ' has-feedback-alert' : '');

        parts.push(
            '<button type="button" class="' + classes + '" data-phase="' + phaseKey + '" onclick="handlePipelinePhaseNav(\'' + phaseKey + '\', event)">' +
                '<span class="pipeline-phase__icon" aria-hidden="true">' + _pipelinePhaseIcon(phaseKey) + '</span>' +
                (compact ? '' : '<span class="pipeline-phase__label">' + window.escapeHTML(_pipelinePhaseLabel(phaseKey)) + '</span>') +
                '<span class="' + badgeClass + '">' + window.escapeHTML(String(meta.count)) + '</span>' +
            '</button>'
        );
    });

    parts.push('</div>');
    return parts.join('');
}

function updatePipelineHeader() {
    var header = document.getElementById('pipeline-header');
    if (!header) return;

    refreshPipelineHeaderState();

    var expandedTrack = document.getElementById('pipeline-track-expanded');
    var compactTrack = document.getElementById('pipeline-track-compact');
    if (expandedTrack) expandedTrack.innerHTML = _renderPipelineTrackHtml('', false);
    if (compactTrack) compactTrack.innerHTML = _renderPipelineTrackHtml('pipeline-track--compact', true);
}

function _setSystemMenuInstantTransition(menu, enabled) {
    if (!menu) return;
    menu.classList.toggle('system-drop-menu--instant', !!enabled);
}

function syncSystemDropTabForActiveTab(activeTabId) {
    var menu = document.getElementById('system-drop-menu');
    if (!menu) return;
    var isProjects = activeTabId === 'tab-projects' || activeTabId === 'projects';

    _setSystemMenuInstantTransition(menu, true);
    menu.classList.toggle('system-drop-menu--projects-tab', isProjects);
    if (isProjects) {
        menu.classList.remove('active');
    }
    void menu.offsetWidth;
    window.requestAnimationFrame(function() {
        _setSystemMenuInstantTransition(menu, false);
    });
}

function isPipelineFullscreenBlockerOpen() {
    if (document.querySelector('.modal-overlay.active')) return true;
    if (document.querySelector('.protection-center-view.active')) return true;
    if (document.querySelector('.wizard-overlay.active')) return true;
    var attractSheet = document.getElementById('attract-testers-sheet-overlay');
    return !!(attractSheet && attractSheet.classList.contains('active'));
}

function syncPipelineHeaderVisibility() {
    var header = document.getElementById('pipeline-header');
    if (!header) return;
    var projectsTab = document.getElementById('tab-projects');
    var onProjects = !!(projectsTab && projectsTab.classList.contains('active'));
    var blocked = onProjects && isPipelineFullscreenBlockerOpen();
    header.classList.toggle('pipeline-header--screen-locked', blocked);
}

function initPipelineHeaderScreenLockObserver() {
    if (_pipelineScreenLockObserverBound || typeof MutationObserver === 'undefined') return;
    _pipelineScreenLockObserverBound = true;

    document.querySelectorAll(PIPELINE_SCREEN_LOCK_SELECTORS).forEach(function(element) {
        var observer = new MutationObserver(function() {
            syncPipelineHeaderVisibility();
        });
        observer.observe(element, { attributes: true, attributeFilter: ['class', 'style'] });
    });

    syncPipelineHeaderVisibility();
}

function _getPipelineScrollOffset() {
    var header = document.getElementById('pipeline-header');
    return (header ? header.offsetHeight : 0) + 10;
}

function _scrollToPipelineTarget(targetEl) {
    if (!targetEl) return;
    var top = window.scrollY + targetEl.getBoundingClientRect().top - _getPipelineScrollOffset();
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function _pulsePipelineCard(projectId) {
    var card = document.getElementById('project-card-' + projectId);
    if (!card) return;
    card.classList.remove('pipeline-card-pulse');
    void card.offsetWidth;
    card.classList.add('pipeline-card-pulse');
    window.setTimeout(function() {
        card.classList.remove('pipeline-card-pulse');
    }, 1000);
}

function handlePipelinePhaseNav(phaseKey, event) {
    if (event) event.stopPropagation();
    if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();

    var meta = _pipelineHeaderState[phaseKey] || {};
    if (meta.hasAlert && meta.alertProjectId) {
        var alertCard = document.getElementById('project-card-' + meta.alertProjectId);
        if (alertCard) {
            var viewportCenter = window.scrollY + (window.innerHeight / 2);
            var cardCenter = window.scrollY + alertCard.getBoundingClientRect().top + (alertCard.offsetHeight / 2);
            var top = window.scrollY + (cardCenter - viewportCenter);
            window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
            window.setTimeout(function() { _pulsePipelineCard(meta.alertProjectId); }, 280);
            return;
        }
    }

    var section = document.getElementById('pipeline-section-' + phaseKey);
    if (section) {
        _scrollToPipelineTarget(section);
        return;
    }

    var projectsList = document.getElementById('projects-list');
    if (projectsList) _scrollToPipelineTarget(projectsList);
}

function _applyPipelineCollapsedState(header, collapsed) {
    _pipelineCollapsed = collapsed;
    header.classList.toggle('is-collapsed', collapsed);
    document.querySelectorAll('.pipeline-section').forEach(function(section) {
        section.classList.toggle('is-collapsed-header-target', collapsed);
    });
}

function _onPipelineWindowScroll() {
    if (_pipelineScrollRaf) return;
    _pipelineScrollRaf = window.requestAnimationFrame(function() {
        _pipelineScrollRaf = 0;
        var header = document.getElementById('pipeline-header');
        if (!header || typeof isTabVisible !== 'function' || !isTabVisible('projects')) return;

        var scrollY = window.scrollY || window.pageYOffset || 0;
        if (!_pipelineCollapsed && scrollY > PIPELINE_COLLAPSE_AT) {
            _applyPipelineCollapsedState(header, true);
        } else if (_pipelineCollapsed && scrollY < PIPELINE_EXPAND_AT) {
            _applyPipelineCollapsedState(header, false);
        }
    });
}

function syncPipelineHeaderScrollState() {
    _onPipelineWindowScroll();
}

function resetPipelineHeaderCollapse() {
    _pipelineCollapsed = false;
    var header = document.getElementById('pipeline-header');
    if (header) header.classList.remove('is-collapsed');
    document.querySelectorAll('.pipeline-section').forEach(function(section) {
        section.classList.remove('is-collapsed-header-target');
    });
}

function initPipelineHeader() {
    if (_pipelineScrollBound) return;
    window.addEventListener('scroll', _onPipelineWindowScroll, { passive: true });
    _pipelineScrollBound = true;
    initPipelineHeaderScreenLockObserver();
    updatePipelineHeader();
    syncPipelineHeaderScrollState();
    syncSystemDropTabForActiveTab(
        document.getElementById('tab-projects') && document.getElementById('tab-projects').classList.contains('active')
            ? 'tab-projects'
            : ''
    );
}

window.initPipelineHeader = initPipelineHeader;
window.updatePipelineHeader = updatePipelineHeader;
window.handlePipelinePhaseNav = handlePipelinePhaseNav;
window.syncSystemDropTabForActiveTab = syncSystemDropTabForActiveTab;
window.resetPipelineHeaderCollapse = resetPipelineHeaderCollapse;
window.syncPipelineHeaderScrollState = syncPipelineHeaderScrollState;
window.syncPipelineHeaderVisibility = syncPipelineHeaderVisibility;
window.resolvePipelineProjectPhase = resolvePipelineProjectPhase;
window.getProjectPipelineAlertType = getProjectPipelineAlertType;
window.projectNeedsPipelineAttention = projectNeedsPipelineAttention;

document.addEventListener('DOMContentLoaded', function() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && typeof syncSystemDropTabForActiveTab === 'function') {
        syncSystemDropTabForActiveTab(activeTab.id);
    }
    if (typeof initPipelineHeaderScreenLockObserver === 'function') {
        initPipelineHeaderScreenLockObserver();
    }
    if (activeTab && activeTab.id === 'tab-projects' && typeof initPipelineHeader === 'function') {
        initPipelineHeader();
    }
});
