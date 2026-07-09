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

var PIPELINE_COLLAPSE_SCROLL_Y = 56;

function resolvePipelineProjectPhase(project) {
    if (!project || typeof project !== 'object') return 'testing';
    var phase = String(project.phase == null ? '' : project.phase).trim().toLowerCase();
    if (phase === 'moderation' || phase === 'live') return phase;
    var status = String(project.app_status || project.status || '').trim().toLowerCase();
    if (status === 'completed' || status === 'pending_completion') return 'moderation';
    return 'testing';
}

function projectNeedsPipelineAttention(project) {
    if (!project) return false;
    var projectStatus = String(project.app_status || project.status || 'active').toLowerCase();
    var isPendingCompletion = projectStatus === 'pending_completion';
    var platformDays = typeof getProjectPlatformDay === 'function'
        ? getProjectPlatformDay(project.created_at)
        : 0;
    var syncDay = Number(project.google_sync_day || 0);
    var needsSyncAttention = isPendingCompletion || (platformDays >= 7 && syncDay < 1);
    var hasNewFeedback = Number(project.feedback_new_count || 0) > 0;
    var pendingIssueTesters = (Array.isArray(project.testers) ? project.testers : []).filter(function(tester) {
        return !!tester.issue_reported_at && !tester.issue_fixed_at;
    });
    var hasAccessOverlay = project.status === 'access_error' && pendingIssueTesters.length > 0;
    return needsSyncAttention || hasNewFeedback || hasAccessOverlay;
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
    var alertProjectId = null;
    for (var i = 0; i < projects.length; i++) {
        if (projectNeedsPipelineAttention(projects[i])) {
            alertProjectId = Number(projects[i].id || projects[i].app_id || 0) || null;
            break;
        }
    }
    return {
        count: projects.length,
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
            meta.hasAlert ? 'has-alert' : '',
        ].filter(Boolean).join(' ');

        parts.push(
            '<button type="button" class="' + classes + '" data-phase="' + phaseKey + '" onclick="handlePipelinePhaseNav(\'' + phaseKey + '\', event)">' +
                '<span class="pipeline-phase__icon" aria-hidden="true">' + _pipelinePhaseIcon(phaseKey) + '</span>' +
                (compact ? '' : '<span class="pipeline-phase__label">' + window.escapeHTML(_pipelinePhaseLabel(phaseKey)) + '</span>') +
                '<span class="pipeline-phase__badge">' + window.escapeHTML(String(meta.count)) + '</span>' +
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

function syncSystemDropTabForActiveTab(activeTabId) {
    var menu = document.getElementById('system-drop-menu');
    if (!menu) return;
    var isProjects = activeTabId === 'tab-projects' || activeTabId === 'projects';
    menu.classList.toggle('system-drop-menu--projects-tab', isProjects);
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

function _onPipelineWindowScroll() {
    var header = document.getElementById('pipeline-header');
    if (!header || typeof isTabVisible !== 'function' || !isTabVisible('projects')) return;
    header.classList.toggle('is-collapsed', window.scrollY > PIPELINE_COLLAPSE_SCROLL_Y);
    document.querySelectorAll('.pipeline-section').forEach(function(section) {
        section.classList.toggle('is-collapsed-header-target', window.scrollY > PIPELINE_COLLAPSE_SCROLL_Y);
    });
}

function initPipelineHeader() {
    if (_pipelineScrollBound) return;
    window.addEventListener('scroll', _onPipelineWindowScroll, { passive: true });
    _pipelineScrollBound = true;
    updatePipelineHeader();
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
window.resolvePipelineProjectPhase = resolvePipelineProjectPhase;
window.projectNeedsPipelineAttention = projectNeedsPipelineAttention;

document.addEventListener('DOMContentLoaded', function() {
    var activeTab = document.querySelector('.tab-content.active');
    if (activeTab && typeof syncSystemDropTabForActiveTab === 'function') {
        syncSystemDropTabForActiveTab(activeTab.id);
    }
    if (activeTab && activeTab.id === 'tab-projects' && typeof initPipelineHeader === 'function') {
        initPipelineHeader();
    }
});
