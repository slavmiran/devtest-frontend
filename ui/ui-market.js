/* Phase 4.4 — ui/ui-market.js (structural split from ui.js + reliability cleanup from ui-tests.js) */

console.log('[DEBUG] ui-market.js START');
window.feedbackMediaRegistry = window.feedbackMediaRegistry || {};
window.feedbackCaptionRegistry = window.feedbackCaptionRegistry || {};

/* === Reliability / dossier / guest helpers (moved from ui-tests.js) === */
function getGuestProjectFreshness(createdAt) {
    const createdDate = parseLocalDateOnly(createdAt);
    const today = parseLocalDateOnly(getLocalDate());
    if (!createdDate || !today) return null;
    const diffDays = Math.max(0, Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 0) {
        return {
            label: window.t('guestFreshnessToday', {}, lang),
            tone: 'today'
        };
    }
    if (diffDays === 1) {
        return {
            label: window.t('guestFreshnessYesterday', {}, lang),
            tone: 'yesterday'
        };
    }
    return {
        label: window.t('guestFreshnessDaysAgo', { count: diffDays }, lang),
        tone: 'older'
    };
}

function openTesterDossier(username, testerId, appId) {
    return openDossierModal(username || '', testerId, appId || 0);
}

function formatDeveloperOwnerLine(fullName, username, fallbackId) {
    const name = String(fullName || '').trim();
    const nick = String(username || '').trim().replace(/^@+/, '');
    if (name && nick) return name + ' • @' + nick;
    if (nick) return '@' + nick;
    if (name) return name;
    return window.t('idLabel', { id: fallbackId || 0 }, lang);
}

function _isDossierFlagFalse(value) {
    if (value === false || value === 0 || value === '0') return true;
    return String(value || '').trim().toLowerCase() === 'false';
}

function _isDossierEmailTestProject(project) {
    if (!project) return false;
    const mode = String(project.test_mode || project.testing_mode || 'google_group').trim().toLowerCase();
    return mode === 'email_list' || mode === 'email' || project.is_email_test === true;
}

function _resolveDossierOwnerProfile(testerId, appId, username, tester, marketCandidate) {
    const normalizedTesterId = Number(testerId || 0);
    const cleanUsername = String(username || '').trim().replace(/^@+/, '');
    let ownerUsername = cleanUsername;
    let ownerFullName = '';

    if (marketCandidate) {
        ownerFullName = String(marketCandidate.owner_full_name || '').trim();
        if (!ownerUsername) {
            ownerUsername = String(marketCandidate.owner_username || '').trim().replace(/^@+/, '');
        }
    }

    if (!ownerFullName) {
        const feedSources = [mutualSeeking, mutualPrelaunch, bountyContracts];
        for (let i = 0; i < feedSources.length; i += 1) {
            const feed = feedSources[i];
            if (!Array.isArray(feed)) continue;
            const hit = feed.find(function(item) {
                return Number(item && item.owner_id) === normalizedTesterId;
            });
            if (hit && hit.owner_full_name) {
                ownerFullName = String(hit.owner_full_name).trim();
                if (!ownerUsername) {
                    ownerUsername = String(hit.owner_username || '').trim().replace(/^@+/, '');
                }
                break;
            }
        }
    }

    if (!ownerFullName && tester && tester.full_name) {
        ownerFullName = String(tester.full_name).trim();
    }
    if (!ownerUsername && tester && tester.username) {
        ownerUsername = String(tester.username).trim().replace(/^@+/, '');
    }

    return {
        owner_id: normalizedTesterId,
        owner_username: ownerUsername,
        owner_full_name: ownerFullName,
    };
}

function getMarketCandidateByAppId(appId, testerId) {
    const normalizedAppId = Number(appId || 0);
    const normalizedTesterId = Number(testerId || 0);
    if (!normalizedAppId && !normalizedTesterId) return null;

    if (normalizedTesterId > 0 && normalizedAppId > 0) {
        const returnsCandidate = (Array.isArray(mutualReturns) ? mutualReturns : []).find(function(item) {
            const contextProjectId = Number(item && (item.my_project_id || item.app_id) || 0);
            return Number(item && item.owner_id) === normalizedTesterId && contextProjectId === normalizedAppId;
        });
        if (returnsCandidate) {
            return Object.assign({ market_kind: 'mutual-return' }, returnsCandidate);
        }
    }

    const seekingCandidate = (Array.isArray(mutualSeeking) ? mutualSeeking : []).find(function(item) {
        return Number(item && item.app_id) === normalizedAppId;
    });
    if (seekingCandidate) {
        return Object.assign({ market_kind: 'mutual-seeking' }, seekingCandidate);
    }

    const prelaunchCandidate = (Array.isArray(mutualPrelaunch) ? mutualPrelaunch : []).find(function(item) {
        return Number(item && item.app_id) === normalizedAppId;
    });
    if (prelaunchCandidate) {
        return Object.assign({ market_kind: 'mutual-prelaunch' }, prelaunchCandidate);
    }

    return null;
}

function getReliabilityStatusMeta(status) {
    var normalized = String(status || 'newbie').toLowerCase();
    var map = {
        newbie: { label: window.t('reliabilityDashStatus_newbie', {}, lang), badgeClass: 'is-newbie' },
        bad: { label: window.t('reliabilityDashStatus_bad', {}, lang), badgeClass: 'is-bad' },
        minimal: { label: window.t('reliabilityDashStatus_minimal', {}, lang), badgeClass: 'is-minimal' },
        basic: { label: window.t('reliabilityDashStatus_basic', {}, lang), badgeClass: 'is-basic' },
        active: { label: window.t('reliabilityDashStatus_active', {}, lang), badgeClass: 'is-active' },
        expert: { label: window.t('reliabilityDashStatus_expert', {}, lang), badgeClass: 'is-expert' },
    };
    return map[normalized] || map.newbie;
}

function getReliabilityUiState() {
    if (window.getReliabilityState) {
        return window.getReliabilityState();
    }
    return {
        summary: null,
        breakdown: null,
        summaryLoading: false,
        breakdownLoading: false,
        summaryLoadedOnce: false,
        breakdownLoadedOnce: false,
        summaryError: false,
        breakdownError: false,
    };
}

function formatReliabilityIndex(value) {
    var safe = Number(value);
    if (!Number.isFinite(safe)) return '0.0';
    return safe.toFixed(1);
}

function formatReliabilityDate(dateValue) {
    if (!dateValue) return window.t('reliabilityDashGrantUnknownDate', {}, lang);
    var parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return window.t('reliabilityDashGrantUnknownDate', {}, lang);
    return parsed.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildReliabilitySummarySkeleton() {
    return `
        <div class="reliability-summary-card reliability-summary-card-loading">
            <div class="reliability-summary-header">
                <div>
                    <div class="skeleton skeleton-line short"></div>
                    <div class="skeleton skeleton-line medium" style="margin-bottom: 0;"></div>
                </div>
                <div class="skeleton skeleton-line short" style="width: 92px; margin-bottom: 0;"></div>
            </div>
            <div class="reliability-summary-grid">
                <div class="skeleton-card reliability-mini-skeleton"></div>
                <div class="skeleton-card reliability-mini-skeleton"></div>
                <div class="skeleton-card reliability-mini-skeleton"></div>
                <div class="skeleton-card reliability-mini-skeleton"></div>
            </div>
        </div>
    `;
}

function buildReliabilityGrantText(lastGrant) {
    if (!lastGrant || !lastGrant.has_grant) {
        return window.t('reliabilityDashGrantEmpty', {}, lang);
    }
    var amount = Number(lastGrant.amount_bust || 0).toFixed(1);
    var appName = window.escapeHTML(lastGrant.app_name || window.t('unknownLabel', {}, lang));
    var dateLabel = window.escapeHTML(formatReliabilityDate(lastGrant.granted_at));
    return window.t('reliabilityDashGrantSummary', { amount: amount, app: appName, date: dateLabel }, lang);
}

function renderReliabilitySummaryWidget(force) {
    return;
}

function getReliabilityAlphaStatusMeta(status) {
    var normalized = String(status || 'newbie').toLowerCase();
    if (normalized === 'expert') return { label: window.t('reliabilityDashStatusExpertFull', {}, lang), badgeClass: 'badge-good' };
    if (normalized === 'active') return { label: window.t('reliabilityDashStatusActiveFull', {}, lang), badgeClass: 'badge-good' };
    if (normalized === 'basic') return { label: window.t('reliabilityDashStatusBasicFull', {}, lang), badgeClass: 'badge-mid' };
    if (normalized === 'minimal') return { label: window.t('reliabilityDashStatusMinimalFull', {}, lang), badgeClass: 'badge-bad' };
    if (normalized === 'bad') return { label: window.t('reliabilityDashStatusBadFull', {}, lang), badgeClass: 'badge-bad' };
    return { label: window.t('reliabilityDashStatusNewbieFull', {}, lang), badgeClass: 'badge-neutral' };
}

function getReliabilityAlphaProjectTabLabel(filterKey) {
    if (filterKey === 'current') return window.t('reliabilityDashTabCurrent', {}, lang);
    if (filterKey === 'completed') return window.t('reliabilityDashTabCompleted', {}, lang);
    if (filterKey === 'archive') return window.t('reliabilityDashTabArchive', {}, lang);
    return window.t('reliabilityDashTabAll', {}, lang);
}

function getReliabilityAlphaAvatar(name) {
    var safeName = String(name || '').trim();
    return window.escapeHTML((safeName.charAt(0) || 'T').toUpperCase());
}

function getReliabilityAlphaProjects(filterKey, projects) {
    var list = Array.isArray(projects) ? projects.slice() : [];
    if (filterKey === 'current') {
        return list.filter(function(project) {
            return String(project.leave_status || project.status || '').toLowerCase() === 'active';
        });
    }
    if (filterKey === 'completed') {
        return list.filter(function(project) {
            var leaveStatus = String(project.leave_status || project.status || '').toLowerCase();
            var participation = String(project.participation_type || '').toLowerCase();
            return leaveStatus !== 'active' && participation !== 'abandoned' && participation !== 'unfair_kick';
        });
    }
    if (filterKey === 'archive') {
        return list.filter(function(project) {
            var leaveStatus = String(project.leave_status || project.status || '').toLowerCase();
            var participation = String(project.participation_type || '').toLowerCase();
            return participation === 'abandoned' || participation === 'unfair_kick' || leaveStatus === 'kicked_by_owner' || leaveStatus === 'abandoned';
        });
    }
    return list;
}

function getReliabilityAlphaProjectSourceMeta(project) {
    if (project && project.is_used_in_formula) {
        return {
            chipClass: 'chip-used',
            chipLabel: window.t('reliabilityDashProjectChipUsed', {}, lang),
            noteKey: 'reliabilityDashProjectNoteCounted'
        };
    }
    if (project && project.is_counted_in_reliability) {
        return {
            chipClass: 'chip-history',
            chipLabel: window.t('reliabilityDashProjectChipHistory', {}, lang),
            noteKey: 'reliabilityDashProjectNoteHistorical'
        };
    }
    return {
        chipClass: 'chip-skipped',
        chipLabel: window.t('reliabilityDashProjectChipSkipped', {}, lang),
        noteKey: 'reliabilityDashProjectNoteSkipped'
    };
}

function buildReliabilityAlphaGuideCard(title, accentClass, contentHtml, footnote) {
    return `
        <section class="guide-card ${accentClass}">
          <div class="guide-card-title">${window.escapeHTML(title)}</div>
          <div class="guide-card-body">${contentHtml}</div>
          <div class="guide-card-footnote">${window.escapeHTML(footnote)}</div>
        </section>
    `;
}

function buildReliabilityAlphaSkeleton() {
    return `
        <div class="page reliability-alpha-page">
            <section class="card reliability-alpha-card">
                <div class="header">
                    <div class="user-main">
                        <div class="avatar skeleton"></div>
                        <div class="user-info" style="flex: 1;">
                            <div class="skeleton skeleton-line medium"></div>
                            <div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div>
                        </div>
                    </div>
                    <div class="skeleton skeleton-line short" style="width: 140px; margin-bottom: 0;"></div>
                </div>
                <div class="summary-grid">
                    <div class="summary-item"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></div>
                    <div class="summary-item"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></div>
                    <div class="summary-item"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></div>
                    <div class="summary-item"><div class="skeleton skeleton-line short"></div><div class="skeleton skeleton-line medium"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></div>
                </div>
            </section>
            <div class="layout-2">
                <section class="card reliability-alpha-card"><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></section>
                <section class="card reliability-alpha-card"><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line long"></div><div class="skeleton skeleton-line long" style="margin-bottom: 0;"></div></section>
            </div>
        </div>
    `;
}

function buildReliabilityAlphaProjectCard(project) {
    var statusMeta = getReliabilityAlphaStatusMeta(project.project_status);
    var title = window.escapeHTML(project.title || window.t('unknownLabel', {}, lang));
    var typeLabel = window.escapeHTML(window.t('reliabilityDashProjectType_' + (project.join_type || project.type || 'invite'), {}, lang));
    var skips = String(project.skips_count || 0);
    var overtimeDays = Number(project.overtime_checkin_days || 0);
    var overtimeBonus = formatReliabilityIndex(project.overtime_bonus_index || 0);
    var participationKey = 'reliabilityDashParticipationType_' + (project.participation_type || 'short_run');
    var exitKey = 'reliabilityDashExitType_' + (project.leave_status || project.status || 'active');
        var sourceMeta = getReliabilityAlphaProjectSourceMeta(project);
        var note = window.escapeHTML(window.t(sourceMeta.noteKey, {
        value: formatReliabilityIndex(project.weighted_contribution || project.effective_project_index || 0),
        karma: formatReliabilityIndex(overtimeDays > 0 ? overtimeDays * 0.5 : 0)
    }, lang));

    return `
        <div class="project-card">
          <div class="proj-header">
            <div class="proj-title">${title} · ${typeLabel}</div>
            <span class="badge-status ${statusMeta.badgeClass}">${window.escapeHTML(statusMeta.label)}</span>
          </div>
                    <div class="project-chips"><span class="project-chip ${sourceMeta.chipClass}">${window.escapeHTML(sourceMeta.chipLabel)}</span></div>
          <div class="proj-row"><span>${window.escapeHTML(window.t('reliabilityDashProjectMandatoryPeriod', {}, lang))}</span><span>${window.escapeHTML(window.t('reliabilityDashProjectMandatoryValue', { actual: project.actual_checkins || 0, total: project.mandatory_days || 14, skips: skips }, lang))}</span></div>
          <div class="proj-row"><span>${window.escapeHTML(window.t('reliabilityDashProjectIndexLabel', {}, lang))}</span><span>${window.escapeHTML(window.t('reliabilityDashProjectIndexValue', { value: formatReliabilityIndex(project.effective_project_index || 0), status: statusMeta.label }, lang))}</span></div>
          <div class="proj-row"><span>${window.escapeHTML(window.t('reliabilityDashProjectOvertimeLabel', {}, lang))}</span><span>${window.escapeHTML(window.t('reliabilityDashProjectOvertimeValue', { days: overtimeDays, bonus: overtimeBonus }, lang))}</span></div>
          <div class="proj-row"><span>${window.escapeHTML(window.t('reliabilityDashProjectParticipationLabel', {}, lang))}</span><span>${window.escapeHTML(window.t(participationKey, {}, lang))}</span></div>
          <div class="proj-row"><span>${window.escapeHTML(window.t('reliabilityDashProjectExitLabel', {}, lang))}</span><span>${window.escapeHTML(window.t(exitKey, { fairness: window.t('reliabilityDashFairness_' + (project.leave_fairness || 'neutral'), {}, lang) }, lang))}</span></div>
          <div class="proj-note">${note}</div>
          <div class="link-more">${window.escapeHTML(window.t('reliabilityDashProjectDetailsLink', {}, lang))}</div>
        </div>
    `;
}

function renderReliabilityAlphaModal() {
    var modal = document.getElementById('reliability-alpha-modal');
    var body = document.getElementById('reliability-alpha-body');
    if (!modal || !body || !modal.classList.contains('active')) return;

    var state = getReliabilityUiState();
    var summary = state.summary;
    var breakdown = state.breakdown;

    if ((state.summaryLoading && !summary) || (state.breakdownLoading && !breakdown)) {
        body.innerHTML = buildReliabilityAlphaSkeleton();
        return;
    }

    if (!summary || !breakdown) {
        body.innerHTML = `<div class="page reliability-alpha-page"><section class="card reliability-alpha-card"><div class="reliability-dashboard-empty">${window.escapeHTML(window.t('reliabilityDashModalError', {}, lang))}</div></section></div>`;
        return;
    }

    var overallStatus = getReliabilityAlphaStatusMeta(summary.reliability_status);
    var projects = Array.isArray(breakdown.projects_full_history)
        ? breakdown.projects_full_history
        : (Array.isArray(breakdown.projects_used) ? breakdown.projects_used : []);
    var visibleProjects = getReliabilityAlphaProjects(_reliabilityDashboardFilter, projects);
    var projectsHtml = visibleProjects.length
        ? visibleProjects.map(buildReliabilityAlphaProjectCard).join('')
        : `<div class="project-card"><div class="proj-note">${window.escapeHTML(window.t('reliabilityDashProjectsEmpty', {}, lang))}</div></div>`;
    var grant = summary.last_grant || {};
    var grantText = grant.has_grant
        ? window.t('reliabilityDashSummaryGrantValue', {
            amount: formatReliabilityIndex(grant.amount_bust || 0),
            base: formatReliabilityIndex(grant.base_bonus || 0),
            perfect: formatReliabilityIndex(grant.perfect_bonus || 0),
            karma: formatKarmaValue(grant.karma_at_moment || 0),
            karma_bonus: formatReliabilityIndex(grant.karma_component || 0)
        }, lang)
        : window.t('reliabilityDashSummaryGrantEmptyLong', {}, lang);
    var fullLabel = window.t('reliabilityDashSummaryParticipationValue', {
        full: String(summary.completed_full_tests || 0),
        early: String(summary.completed_early_tests || 0)
    }, lang);
    var activeProjectsPill = window.t('reliabilityDashActiveProjectsPill', { count: String(summary.active_projects_count || 0) }, lang);
    var tabs = [
        { key: 'all', label: getReliabilityAlphaProjectTabLabel('all') },
        { key: 'current', label: getReliabilityAlphaProjectTabLabel('current') },
        { key: 'completed', label: getReliabilityAlphaProjectTabLabel('completed') },
        { key: 'archive', label: getReliabilityAlphaProjectTabLabel('archive') }
    ];
    var guideCardsHtml = [
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock1Title', {}, lang),
            'accent-blue',
            `
                <div class="guide-rows">
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row1Label', {}, lang))}</span><span class="guide-value danger">${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row1Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row2Label', {}, lang))}</span><span class="guide-value warning">${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row2Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row3Label', {}, lang))}</span><span class="guide-value neutral">${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row3Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row4Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row4Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row5Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock1Row5Value', {}, lang))}</span></div>
                </div>
            `,
            window.t('reliabilityDashGuideBlock1Mini', {}, lang)
        ),
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock2Title', {}, lang),
            'accent-cyan',
            `
                <div class="guide-rows">
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row1Label', {}, lang))}</span><span class="guide-value neutral">${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row1Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row2Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row2Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row3Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock2Row3Value', {}, lang))}</span></div>
                </div>
            `,
            window.t('reliabilityDashGuideBlock2Mini', {}, lang)
        ),
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock3Title', {}, lang),
            'accent-indigo',
            `
                <div class="guide-rows">
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row1Label', {}, lang))}</span><span class="guide-value neutral">${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row1Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row2Label', {}, lang))}</span><span class="guide-value neutral">${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row2Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row3Label', {}, lang))}</span><span class="guide-value danger">${window.escapeHTML(window.t('reliabilityDashGuideBlock3Row3Value', {}, lang))}</span></div>
                </div>
            `,
            window.t('reliabilityDashGuideBlock3Mini', {}, lang)
        ),
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock4Title', {}, lang),
            'accent-red',
            `
                <ol class="guide guide-list">
                  <li>${window.escapeHTML(window.t('reliabilityDashGuideBlock4Item1', {}, lang))}</li>
                  <li>${window.escapeHTML(window.t('reliabilityDashGuideBlock4Item2', {}, lang))}</li>
                  <li>${window.escapeHTML(window.t('reliabilityDashGuideBlock4Item3', {}, lang))}</li>
                  <li>${window.escapeHTML(window.t('reliabilityDashGuideBlock4Item4', {}, lang))}</li>
                </ol>
            `,
            window.t('reliabilityDashGuideBlock4Mini', {}, lang)
        ),
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock5Title', {}, lang),
            'accent-gold',
            `
                <div class="guide-rows">
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row1Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row1Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row2Label', {}, lang))}</span><span class="guide-value good">${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row2Value', {}, lang))}</span></div>
                  <div class="guide-row"><span>${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row3Label', {}, lang))}</span><span class="guide-value gold">${window.escapeHTML(window.t('reliabilityDashGuideBlock5Row3Value', {}, lang))}</span></div>
                </div>
            `,
            window.t('reliabilityDashGuideBlock5Mini', {}, lang)
        ),
        buildReliabilityAlphaGuideCard(
            window.t('reliabilityDashGuideBlock6Title', {}, lang),
            'accent-green',
            `
                <div class="guide-tags">
                  <span class="guide-tag">${window.escapeHTML(window.t('reliabilityDashGuideBlock6Tag1', {}, lang))}</span>
                  <span class="guide-tag">${window.escapeHTML(window.t('reliabilityDashGuideBlock6Tag2', {}, lang))}</span>
                  <span class="guide-tag">${window.escapeHTML(window.t('reliabilityDashGuideBlock6Tag3', {}, lang))}</span>
                  <span class="guide-tag">${window.escapeHTML(window.t('reliabilityDashGuideBlock6Tag4', {}, lang))}</span>
                  <span class="guide-tag">${window.escapeHTML(window.t('reliabilityDashGuideBlock6Tag5', {}, lang))}</span>
                </div>
            `,
            window.t('reliabilityDashGuideBlock6Mini', {}, lang)
        )
    ].join('');

    body.innerHTML = `
        <div class="page reliability-alpha-page">
          <section class="card reliability-alpha-card">
            <div class="header">
              <div class="user-main">
                <div class="avatar">${getReliabilityAlphaAvatar(summary.display_name)}</div>
                <div class="user-info">
                  <div class="user-name">${window.escapeHTML(summary.display_name || window.t('reliabilityDashSummaryDefaultName', {}, lang))}</div>
                  <div class="user-label">${window.escapeHTML(window.t('reliabilityDashSummaryUserLabel', { total: String(summary.completed_tests || 0), full: String(summary.completed_full_tests || 0), early: String(summary.completed_early_tests || 0) }, lang))}</div>
                </div>
              </div>
              <div class="pill">${window.escapeHTML(activeProjectsPill)}</div>
            </div>

            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">${window.escapeHTML(window.t('reliabilityDashSummaryReliabilityLabel', {}, lang))}</div>
                <div class="summary-value">${window.escapeHTML(window.t('reliabilityDashSummaryReliabilityValue', { value: formatReliabilityIndex(summary.reliability_overall), status: overallStatus.label }, lang))}</div>
                <div class="summary-extra">${window.escapeHTML(summary.reliability_comment || breakdown.formula_comment || '')}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">${window.escapeHTML(window.t('reliabilityDashSummaryKarmaLabel', {}, lang))}</div>
                <div class="summary-value">${window.escapeHTML(formatKarmaValue(summary.karma))}</div>
                <div class="summary-extra">${window.escapeHTML(window.t('reliabilityDashSummaryKarmaExtra', {}, lang))}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">${window.escapeHTML(window.t('reliabilityDashSummaryGrantLabel', {}, lang))}</div>
                <div class="summary-value">${window.escapeHTML(grant.has_grant ? formatReliabilityIndex(grant.amount_bust || 0) + ' $BUST' : window.t('reliabilityDashGrantEmptyShort', {}, lang))}</div>
                <div class="summary-extra">${window.escapeHTML(grantText)}</div>
                ${grant.has_grant ? `<div class="grant-badge">${window.escapeHTML(window.t('reliabilityDashSummaryGrantBadge', {}, lang))}</div>` : ''}
              </div>
              <div class="summary-item">
                <div class="summary-label">${window.escapeHTML(window.t('reliabilityDashSummaryParticipationLabel', {}, lang))}</div>
                <div class="summary-value">${window.escapeHTML(fullLabel)}</div>
                <div class="summary-extra">${window.escapeHTML(window.t('reliabilityDashSummaryParticipationExtra', {}, lang))}</div>
              </div>
            </div>

            <div class="link-main" onclick="document.getElementById('reliability-alpha-guide').scrollIntoView({ behavior: 'smooth', block: 'start' })">${window.escapeHTML(window.t('reliabilityDashLinkMain', {}, lang))}</div>

            <div class="tabs">
              ${tabs.map(function(tab) {
                return `<button type="button" class="tab ${_reliabilityDashboardFilter === tab.key ? 'active' : ''}" onclick="setReliabilityDashboardFilter('${tab.key}')">${window.escapeHTML(tab.label)}</button>`;
              }).join('')}
            </div>
          </section>

          <div class="layout-2">
            <section class="card reliability-alpha-card" id="reliability-alpha-guide">
              <div class="section-title">${window.escapeHTML(window.t('reliabilityDashProjectsSectionTitle', {}, lang))}</div>
                            <div class="section-copy">${window.escapeHTML(window.t('reliabilityDashProjectsHistoryHint', {}, lang))}</div>
              <div class="projects-grid">
                ${projectsHtml}
              </div>
            </section>

            <section class="card reliability-alpha-card">
              <div class="section-title">${window.escapeHTML(window.t('reliabilityDashGuideSectionTitle', {}, lang))}</div>
                            <div class="guide-cards">
                                ${guideCardsHtml}
                            </div>
            </section>
          </div>
        </div>
    `;
}

function renderReliabilityDashboard() {
    renderReliabilityAlphaModal();
}

function openReliabilityAlphaModal() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var modal = document.getElementById('reliability-alpha-modal');
    var body = document.getElementById('reliability-alpha-body');
    if (!modal || !body) return;

    _reliabilityDashboardFilter = 'all';
    body.innerHTML = buildReliabilityAlphaSkeleton();
    modal.classList.add('active');

    if (window.loadReliabilitySummary) {
        window.loadReliabilitySummary(false).catch(function() {});
    }
    if (window.loadReliabilityBreakdown) {
        window.loadReliabilityBreakdown(false).catch(function() {});
    }
    renderReliabilityAlphaModal();
}

function closeReliabilityAlphaModal(event) {
    var modal = document.getElementById('reliability-alpha-modal');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('active');
}

function openReliabilityDashboard() {
    openReliabilityAlphaModal();
}

function closeReliabilityDashboard(event) {
    closeReliabilityAlphaModal(event);
}

function setReliabilityDashboardFilter(filterKey) {
    _reliabilityDashboardFilter = ['all', 'current', 'completed', 'archive'].indexOf(filterKey) >= 0 ? filterKey : 'all';
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    renderReliabilityAlphaModal();
}


/* === Market / guest / external / modals (moved from ui.js) === */
function getLangBadge(targetLang) {
    const langCode = String(targetLang || 'ALL').toUpperCase();
    if (langCode === 'RU') return `<button type="button" class="lang-badge notranslate" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('RU'))}')">🇷🇺</button>`;
    if (langCode === 'EN') return `<button type="button" class="lang-badge notranslate" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('EN'))}')">🇬🇧</button>`;
    return '';
}

function renderFeedCard(item, kind) {
    const ownerDisplay = window.escapeHTML(formatDeveloperOwnerLine(item.owner_full_name, item.owner_username, item.owner_id));
    const safeOwner = escapeInlineJsString(item.owner_username || '');
    const langBadge = (item.target_lang && item.target_lang !== 'ALL') ? getLangBadge(item.target_lang) : '';
    const syncChip = isProjectSynced(item)
        ? `<span class="meta-chip accent-green">${window.escapeHTML(formatCompactSyncLabel(item))}</span>`
        : '';
    const emailChip = String(item.test_mode || 'google_group') === 'email_list'
        ? `<span class="meta-chip accent-orange">📧 ${window.escapeHTML(window.t('emailTestBadge', {}, lang))}</span>`
        : '';
    const bountyChip = kind === 'bounty'
        ? `<span class="meta-chip accent-purple notranslate">💎 ${item.bounty_per_tester || 0} $BUST</span>`
        : '';
    const kindChip = kind === 'mutual-prelaunch'
        ? `<span class="meta-chip accent-blue">${window.t('tabPreLaunch', {}, lang)}</span>`
        : '';
    const testerChipCount = kind === 'bounty'
        ? Number(item.bounty_testers_count || 0)
        : Number(item.mutual_testers_count || 0);
    const testerChipLimit = kind === 'bounty'
        ? Number(item.limit_bounty || 0)
        : Number(item.limit_mutual || 0);

    let buttonText = window.t('mutualJoinBtn', {}, lang);
    let clickAction = `createMutualOffer(${item.app_id}, ${item.owner_id}, event)`;
    let buttonClass = 'btn btn-primary';
    let buttonDisabledAttr = '';
    let buttonExtraAttrs = `data-offer-target-app="${item.app_id}" data-offer-target-owner="${item.owner_id}"`;
    const isOwnProject = !!item.is_own_project;

    if (kind === 'mutual-seeking' && !isOwnProject) {
        const hasAvailableMutual = typeof window.getAvailableMutualProjectsForOwner === 'function'
            ? window.getAvailableMutualProjectsForOwner(item.owner_id).length > 0
            : true;
        if (!hasAvailableMutual) {
            buttonText = window.t('takeDirectBtn', {}, lang);
            buttonClass = 'btn btn-secondary';
            clickAction = `createMutualOffer(${item.app_id}, ${item.owner_id}, event)`;
            buttonExtraAttrs = `data-offer-target-app="${item.app_id}" data-offer-target-owner="${item.owner_id}"`;
        }
    }

    const hasPendingOffer = !!item.has_pending_offer;
    const incomingFromOwnerOffers = (incomingOffers || []).filter((offer) => {
        if (!offer || offer.status !== 'pending') return false;
        if (Number(offer.proposer_id) !== Number(item.owner_id)) return false;
        return true;
    });
    const hasIncomingFromOwner = incomingFromOwnerOffers.length > 0;
    const singleIncomingOffer = incomingFromOwnerOffers.length === 1 ? incomingFromOwnerOffers[0] : null;
    const pendingOfferRemaining = hasPendingOffer ? formatOfferRemaining(item.pending_offer_created_at) : null;
    const pendingOfferMeta = pendingOfferRemaining
        ? window.t('offerTimeLeft', {
            time: window.t('offerTimeLeftValue', {
                hours: pendingOfferRemaining.hours,
                minutes: pendingOfferRemaining.minutes,
            }, lang)
        }, lang)
        : '';

    if (kind === 'mutual-seeking' && singleIncomingOffer) {
        buttonText = window.t('offerAcceptDirectBtn', {}, lang);
        clickAction = `decideOffer(${singleIncomingOffer.offer_id}, 'accept', event)`;
        buttonClass = 'btn btn-secondary';
        buttonExtraAttrs = '';
    } else if (kind === 'mutual-seeking' && hasIncomingFromOwner) {
        buttonText = window.t('offerReviewOwnerOffersBtn', {}, lang);
        clickAction = `switchTab('tests')`;
        buttonClass = 'btn btn-secondary';
        buttonExtraAttrs = '';
    } else if (kind === 'mutual-seeking' && hasPendingOffer) {
        buttonText = window.t('offerPending', {}, lang);
        clickAction = 'void(0)';
        buttonClass = 'btn pending disabled';
        buttonDisabledAttr = 'disabled';
    }

    if (kind === 'mutual-prelaunch') {
        buttonText = window.t('prelaunchJoinBtn', {}, lang);
        clickAction = `openPrelaunchJoinModal(${item.app_id}, ${item.owner_id}, event)`;
        buttonExtraAttrs = '';
    }
    if (kind === 'bounty') {
        buttonText = window.t('bountyTakeBtn', {}, lang);
        clickAction = `joinBounty(${item.app_id})`;
        buttonExtraAttrs = '';
    }
    if (isOwnProject) {
        buttonText = window.t('ownProjectCta', {}, lang);
        clickAction = 'void(0)';
        buttonClass = 'btn btn-secondary disabled';
        buttonDisabledAttr = 'disabled';
        buttonExtraAttrs = '';
    }

    return `
        <div class="market-card${isOwnProject ? ' market-card-own' : ''}" data-app-id="${item.app_id}">
            <div class="market-top">
                <div>
                    <div class="card-title notranslate">${window.escapeHTML(item.name || window.t('unknownLabel', {}, lang))}</div>
                    <div class="market-owner notranslate" onclick="openTesterDossier('${safeOwner}', ${item.owner_id}, ${item.app_id}); event.stopPropagation();">${ownerDisplay}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${langBadge}
                    <span class="meta-chip accent-yellow">☯️ ${item.owner_karma || 0}</span>
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                <span class="meta-chip">👥 ${testerChipCount}/${testerChipLimit || 12}</span>
                ${kindChip}
                ${emailChip}
                ${bountyChip}
                ${syncChip}
            </div>
            <button class="${buttonClass}" ${buttonDisabledAttr} ${buttonExtraAttrs} onclick="${clickAction}">${buttonText}</button>
            ${(kind === 'mutual-seeking' && pendingOfferMeta) ? `<div class="market-offer-note">${window.escapeHTML(pendingOfferMeta)}</div>` : ''}
        </div>
    `;
}

function renderMutualReturns(apps, force) {
    if (!force && !isTabVisible('market')) return;
    const items = Array.isArray(apps) ? apps : (Array.isArray(mutualReturns) ? mutualReturns : []);
    const container = document.getElementById('mutual-returns-container');
    const list = document.getElementById('mutual-returns-list');
    const titleEl = document.getElementById('t-mutualReturnsSectionTitle');
    const subtitleEl = document.getElementById('t-mutualReturnsSubtitle');
    if (!container || !list) return;

    if (titleEl) {
        titleEl.textContent = window.t('mutualReturnsSectionTitle', {}, lang);
    }
    if (subtitleEl) {
        subtitleEl.textContent = window.t('mutualReturnsSubtitle', {}, lang);
    }

    const isLoading = !!(window._marketInFlight && window._marketInFlight.mutual);
    if ((!items || items.length === 0) && isLoading && !window._marketLoadedOnce) {
        container.style.display = '';
        if (window._marketForceSkeleton) showSkeleton('mutual-returns-list');
        else showMarketLoading('mutual-returns-list');
        return;
    }

    if (!items || items.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = '';
    list.innerHTML = items.map(function(app) {
        const ownerUsername = (app.owner_username || '').replace('@', '');
        const safeOwnerUsername = escapeInlineJsString(ownerUsername);
        const displayOwner = window.escapeHTML(ownerUsername ? '@' + ownerUsername : window.t('idLabel', { id: app.owner_id }, lang));
        const myProjectId = Number(app.my_project_id || app.app_id || 0);
        const myProjectNameRaw = app.my_project_name || '';
        const profileText = window.escapeHTML(window.t('mutualReturnProfileText', {
            username: ownerUsername ? '@' + ownerUsername : window.t('idLabel', { id: app.owner_id }, lang),
            project: myProjectNameRaw,
        }, lang));
        const hasPendingOffer = !!app.has_pending_offer;
        const returnBtnText = window.escapeHTML(window.t(hasPendingOffer ? 'offerPending' : 'mutualReturnBtn', {}, lang));
        const btnClass = hasPendingOffer ? 'btn pending disabled' : 'btn btn-primary';
        const btnDisabled = hasPendingOffer ? 'disabled' : '';
        const pendingOfferRemaining = hasPendingOffer ? formatOfferRemaining(app.pending_offer_created_at) : null;
        const pendingOfferMeta = pendingOfferRemaining
            ? window.escapeHTML(window.t('offerTimeLeft', {
                time: window.t('offerTimeLeftValue', {
                    hours: pendingOfferRemaining.hours,
                    minutes: pendingOfferRemaining.minutes,
                }, lang)
            }, lang))
            : '';
        const btnClick = hasPendingOffer
            ? 'void(0)'
            : `if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); openTesterDossier('${safeOwnerUsername}', ${app.owner_id}, ${myProjectId}); event.stopPropagation();`;
        return `
            <div class="horizontal-card mutual-return-card mutual-return-profile-card">
                <div class="mutual-return-profile-text notranslate">${profileText}</div>
                <button class="${btnClass}" ${btnDisabled} style="width:100%;" data-offer-context-project="${myProjectId}" data-offer-target-owner="${app.owner_id}" onclick="${btnClick}">${returnBtnText}</button>
                ${pendingOfferMeta ? `<div class="market-offer-note">${pendingOfferMeta}</div>` : ''}
            </div>
        `;
    }).join('');
}

function renderMutualFeed(force) {
    if (!force && !isTabVisible('market')) return;
    const seekingEl = document.getElementById('mutual-seeking-list');
    const prelaunchEl = document.getElementById('mutual-prelaunch-list');
    if (!seekingEl || !prelaunchEl) return;

    const isLoading = !!(window._marketInFlight && (window._marketInFlight.mutual));
    const feedState = window.getMarketFeedState ? window.getMarketFeedState('mutual') : { confirmedEmpty: false };

    if (!mutualSeeking.length) {
        if (isLoading || !feedState.confirmedEmpty) {
            if (window._marketForceSkeleton) showSkeleton('mutual-seeking-list');
            else showMarketLoading('mutual-seeking-list');
        } else seekingEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        seekingEl.innerHTML = mutualSeeking.map((item) => renderFeedCard(item, 'mutual-seeking')).join('');
    }

    if (!mutualPrelaunch.length) {
        if (isLoading || !feedState.confirmedEmpty) {
            if (window._marketForceSkeleton) showSkeleton('mutual-prelaunch-list');
            else showMarketLoading('mutual-prelaunch-list');
        } else prelaunchEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        prelaunchEl.innerHTML = mutualPrelaunch.map((item) => renderFeedCard(item, 'mutual-prelaunch')).join('');
    }

    renderGuestProjectsSection(true);
    if (typeof renderShowcaseActiveTests === 'function') renderShowcaseActiveTests(true);
}

function renderGuestProjectCard(item) {
    const packageName = String(item.package_name || item.name || '').trim();
    const appName = window.escapeHTML(packageName || window.t('unknownLabel', {}, lang));
    const ownerUsername = String(item.owner_username || '').trim().replace(/^@+/, '');
    const ownerLabel = ownerUsername
        ? '@' + ownerUsername
        : window.t('idLabel', { id: Number(item.owner_telegram_id || item.owner_id || 0) }, lang);
    const description = String(item.instructions || '').trim();
    const safeGuestId = escapeInlineJsString(String(item.id || ''));
    const safeDescription = description
        ? escapeHtmlWithBreaks(description)
        : window.escapeHTML(window.t('guestCardNoInstructions', {}, lang));
    const langChip = getGuestLanguageDisplayParts(item.language || item.lang, item.user_lang).length
        ? renderGuestLanguageBadge(item.language || item.lang, item.user_lang)
        : '';
    const categoryKey = String(item.category || 'app').toLowerCase() === 'game'
        ? 'guestFilterCategoryGame'
        : 'guestFilterCategoryApp';
    const freshness = getGuestProjectFreshness(item.created_at);
    const freshnessChip = freshness
        ? `<span class="guest-freshness-chip guest-freshness-chip-${window.escapeHTML(freshness.tone)}">${window.escapeHTML(freshness.label)}</span>`
        : '';

    return `
        <div class="market-card guest-market-card" data-guest-app-id="${window.escapeHTML(String(item.id || ''))}">
            <div class="market-top guest-market-top">
                <div class="guest-market-title-wrap">
                    <div class="guest-market-headline">
                        <div class="card-title guest-market-title notranslate">${appName}</div>
                        <span class="guest-market-badge">${window.escapeHTML(window.t('guestCardBadge', {}, lang))}</span>
                        ${freshnessChip}
                    </div>
                    <div class="market-owner notranslate">${window.escapeHTML(ownerLabel)}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
                    ${langChip}
                    <span class="meta-chip">${window.escapeHTML(window.t(categoryKey, {}, lang))}</span>
                    <span class="meta-chip accent-blue">📨 ${window.escapeHTML(window.t('guestCardInvitesSent', { count: Number(item.invites_sent || 0) }, lang))}</span>
                </div>
            </div>
            <div class="guest-market-desc">${safeDescription}</div>
            <div class="guest-project-cta-stack">
                <button class="btn btn-primary guest-project-cta-btn guest-project-cta-fast" style="width:100%;" onclick="openExternalTrackModal('${safeGuestId}', event)">${window.escapeHTML(window.t('externalTrackGuestBtn', {}, lang))}</button>
                <button class="btn btn-secondary guest-project-cta-btn" style="width:100%;" onclick="openGuestInviteModal('${safeGuestId}', event)">${window.escapeHTML(window.t('guestInviteBtn', {}, lang))}</button>
            </div>
        </div>
    `;
}

function renderGuestProjectsSection(force) {
    if (!force && !isTabVisible('market')) return;
    const section = document.getElementById('guest-projects-section');
    const body = document.getElementById('guest-projects-body');
    const toggleBtn = document.getElementById('guest-projects-toggle');
    const toggleText = document.getElementById('guest-projects-toggle-text');
    const toggleIcon = document.getElementById('guest-projects-toggle-icon');
    const langLabel = document.getElementById('guest-filter-lang-label');
    const categoryLabel = document.getElementById('guest-filter-category-label');
    const langSelect = document.getElementById('guest-filter-lang');
    const categorySelect = document.getElementById('guest-filter-category');
    const list = document.getElementById('guest-projects-list');
    const optionCategoryAll = document.getElementById('guest-filter-category-all');
    const optionCategoryGame = document.getElementById('guest-filter-category-game');
    const optionCategoryApp = document.getElementById('guest-filter-category-app');

    if (!section || !body || !toggleBtn || !toggleText || !toggleIcon || !list) return;

    toggleText.textContent = window.t('guestProjectsAccordionTitle', {}, lang);
    toggleBtn.setAttribute('aria-expanded', _guestProjectsExpanded ? 'true' : 'false');
    toggleIcon.textContent = _guestProjectsExpanded ? '−' : '+';
    section.classList.toggle('expanded', !!_guestProjectsExpanded);

    if (langLabel) langLabel.textContent = window.t('guestFilterLangLabel', {}, lang);
    if (categoryLabel) categoryLabel.textContent = window.t('guestFilterCategoryLabel', {}, lang);
    renderGuestLanguageFilterOptions(langSelect, (_guestProjectsFilters && _guestProjectsFilters.lang) || 'ALL');
    if (categorySelect) categorySelect.value = String((_guestProjectsFilters && _guestProjectsFilters.category) || 'ALL').toUpperCase();
    if (optionCategoryAll) optionCategoryAll.textContent = window.t('guestFilterCategoryAll', {}, lang);
    if (optionCategoryGame) optionCategoryGame.textContent = window.t('guestFilterCategoryGame', {}, lang);
    if (optionCategoryApp) optionCategoryApp.textContent = window.t('guestFilterCategoryApp', {}, lang);

    if (!_guestProjectsExpanded) {
        return;
    }

    if (_guestProjectsInFlight && !_guestProjectsLoadedOnce && (!Array.isArray(guestProjects) || !guestProjects.length)) {
        showMarketLoading('guest-projects-list');
        return;
    }

    const rawGuestProjects = Array.isArray(guestProjects) ? guestProjects : [];
    const availableItems = typeof window.getFilteredGuestProjects === 'function'
        ? window.getFilteredGuestProjects()
        : rawGuestProjects;

    if (!rawGuestProjects.length) {
        const emptyKey = _guestProjectsLoadError ? 'guestProjectsLoadError' : 'guestProjectsEmpty';
        list.innerHTML = `<p class="no-testers">${window.escapeHTML(window.t(emptyKey, {}, lang))}</p>`;
        return;
    }

    if (!availableItems.length) {
        list.innerHTML = `<p class="no-testers">${window.escapeHTML(window.t('guestProjectsTrackedOnly', {}, lang))}</p>`;
        return;
    }

    const visibleItems = typeof window.getVisibleGuestProjects === 'function'
        ? window.getVisibleGuestProjects()
        : availableItems;
    const remaining = Math.max(0, availableItems.length - visibleItems.length);
    const nextCount = Math.min(
        typeof window.getGuestProjectsPageSize === 'function' ? window.getGuestProjectsPageSize() : 5,
        remaining
    );

    list.innerHTML = visibleItems.map(renderGuestProjectCard).join('');
    if (typeof window.canShowMoreGuestProjects === 'function' && window.canShowMoreGuestProjects()) {
        list.innerHTML += `
            <div class="guest-projects-more-wrap">
                <button type="button" class="btn btn-secondary guest-projects-more-btn" onclick="showMoreGuestProjects()">${window.escapeHTML(window.t('guestProjectsShowMore', { count: nextCount || 5 }, lang))}</button>
            </div>
        `;
    }
}

function renderGuestInviteModal() {
    const modal = document.getElementById('guest-invite-modal');
    const title = document.getElementById('t-guestInviteModalTitle');
    const closeBtn = document.getElementById('t-guestInviteClose');
    const body = document.getElementById('guest-invite-modal-body');
    if (!modal || !title || !closeBtn || !body) return;

    title.textContent = window.t('guestInviteModalTitle', {}, lang);
    closeBtn.textContent = window.t('inviteClose', {}, lang);

    const guest = (Array.isArray(guestProjects) ? guestProjects : []).find(function(item) {
        return String(item.id || '') === String(_guestInviteGuestId || '');
    });
    if (!guest) {
        body.innerHTML = `<div class="guest-invite-note">${window.escapeHTML(window.t('guestProjectsLoadError', {}, lang))}</div>`;
        return;
    }

    const ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    const guestDisplayName = getGuestDisplayName(guest);
    const langChip = getGuestLanguageDisplayParts(guest.language || guest.lang, guest.user_lang).length
        ? renderGuestLanguageBadge(guest.language || guest.lang, guest.user_lang)
        : '';
    const selectedInviteLang = resolveGuestInviteLanguage(guest);
    const inviteLink = typeof window.buildGuestInviteDeepLink === 'function'
        ? window.buildGuestInviteDeepLink(String(guest.id || ''), userId, selectedInviteLang)
        : '';
    const previewText = getGuestInvitePreviewText(guest, selectedInviteLang, inviteLink);
    const previewHtml = escapeHtmlWithBreaks(previewText);
    const inviterProjects = (Array.isArray(myProjects) ? myProjects : []).filter(function(project) {
        const mode = String(project && project.mode || 'mutual').toLowerCase();
        return !!project && (mode === 'mutual' || mode === 'hybrid');
    });
    const hasEligibleProject = inviterProjects.length > 0;
    const hasOwnerUsername = !!ownerUsername;
    const disabled = _guestInviteSending || !hasOwnerUsername;
    const noteKey = !hasOwnerUsername
        ? 'guestInviteNoUsername'
        : (!hasEligibleProject ? 'guestInviteNeedsProject' : 'guestInviteReady');

    body.innerHTML = `
        <div class="guest-invite-note notranslate">${window.escapeHTML(window.t('guestInviteModalDesc', { owner_username: ownerUsername ? '@' + ownerUsername : window.t('unknownLabel', {}, lang) }, lang))}</div>
        <div class="guest-invite-card">
            <div class="guest-invite-app-row">
                ${renderIcon(guestDisplayName || '', null)}
                <div class="guest-invite-app-meta">
                    <div class="card-title guest-invite-app-title notranslate">${window.escapeHTML(guestDisplayName || window.t('unknownLabel', {}, lang))}</div>
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:2px;">
                        <span class="market-owner notranslate">${window.escapeHTML(ownerUsername ? '@' + ownerUsername : window.t('guestInviteOwnerMissing', {}, lang))}</span>
                        ${langChip}
                    </div>
                </div>
            </div>
            <div class="guest-invite-language-row">
                <div class="guest-invite-language-label">${window.escapeHTML(window.t('guestInviteLanguageLabel', {}, lang))}</div>
                <div class="segmented-control guest-invite-language-toggle">
                    <button type="button" class="seg-btn ${selectedInviteLang === 'ru' ? 'active' : ''}" onclick="setGuestInviteLanguage('ru')">${window.escapeHTML(window.t('guestInviteLanguageRu', {}, lang))}</button>
                    <button type="button" class="seg-btn ${selectedInviteLang === 'en' ? 'active' : ''}" onclick="setGuestInviteLanguage('en')">${window.escapeHTML(window.t('guestInviteLanguageEn', {}, lang))}</button>
                </div>
            </div>
            <div class="guest-invite-preview-head">
                <div class="guest-invite-preview-title">${window.escapeHTML(window.t('guestInvitePreviewTitle', {}, lang))}</div>
                <div class="guest-invite-preview-caption">${window.escapeHTML(window.t('guestInvitePreviewCaption', {}, lang))}</div>
            </div>
            <div class="guest-invite-preview-shell">
                <div class="guest-invite-preview-text notranslate">${previewHtml}</div>
            </div>
            <div class="guest-invite-help">${window.escapeHTML(window.t(noteKey, {}, lang))}</div>
            <button class="btn ${disabled ? 'btn-secondary disabled' : 'btn-primary'}" ${disabled ? 'disabled' : ''} style="width:100%;" onclick="sendGuestProjectInvite()">${window.escapeHTML(window.t(_guestInviteSending ? 'guestInviteSending' : 'guestInviteSendBtn', {}, lang))}</button>
        </div>
    `;
}

function openGuestInviteModal(guestAppId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _guestInviteGuestId = String(guestAppId || '');
    const guest = (Array.isArray(guestProjects) ? guestProjects : []).find(function(item) {
        return String(item.id || '') === _guestInviteGuestId;
    });
    _guestInviteLang = typeof window.getDefaultGuestInviteLanguage === 'function'
        ? window.getDefaultGuestInviteLanguage(guest && (guest.language || guest.lang))
        : null;
    _guestInviteSending = false;
    renderGuestInviteModal();
    const modal = document.getElementById('guest-invite-modal');
    if (modal) {
        modal.classList.add('active');
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeGuestInviteModal(event) {
    if (event && event.target !== document.getElementById('guest-invite-modal')) return;
    const modal = document.getElementById('guest-invite-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    _guestInviteGuestId = null;
    _guestInviteLang = null;
    _guestInviteSending = false;
}

function setGuestInviteLanguage(nextLang) {
    _guestInviteLang = typeof window.normalizeGuestInviteLanguage === 'function'
        ? window.normalizeGuestInviteLanguage(nextLang, lang)
        : String(nextLang || 'en');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    renderGuestInviteModal();
}

async function sendGuestProjectInvite() {
    const guest = (Array.isArray(guestProjects) ? guestProjects : []).find(function(item) {
        return String(item.id || '') === String(_guestInviteGuestId || '');
    });
    if (!guest || _guestInviteSending) return;

    const ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    if (!ownerUsername) {
        showToast(window.t('guestInviteNoUsername', {}, lang));
        return;
    }

    const inviterProjects = (Array.isArray(myProjects) ? myProjects : []).filter(function(project) {
        const mode = String(project && project.mode || 'mutual').toLowerCase();
        return !!project && (mode === 'mutual' || mode === 'hybrid');
    });
    if (!inviterProjects.length) {
        if (window.tg && typeof window.tg.showAlert === 'function') {
            window.tg.showAlert(window.t('guestInviteNeedsProject', {}, lang));
        } else {
            showToast(window.t('guestInviteNeedsProject', {}, lang));
        }
        return;
    }

    _guestInviteSending = true;
    renderGuestInviteModal();
    try {
        const selectedInviteLang = resolveGuestInviteLanguage(guest);
        const response = await fetch(`${API_BASE}/guest-apps/${encodeURIComponent(String(guest.id || ''))}/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inviter_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }

        const inviteStartapp = String(
            data.startapp
            || (typeof window.buildGuestClaimStartappValue === 'function'
                ? window.buildGuestClaimStartappValue(String(guest.id || ''), userId)
                : `claim_${guest.id}_${userId}`)
        ).trim();
        const inviteLink = typeof window.buildGuestInviteDeepLink === 'function'
            ? window.buildGuestInviteDeepLink(String(guest.id || ''), userId, selectedInviteLang, inviteStartapp)
            : String(data.invite_link || '').trim();
        const messageText = getGuestInvitePreviewText(guest, selectedInviteLang, inviteLink);
        const encodedText = encodeURIComponent(messageText);

        guest.invites_sent = Number(data.invites_sent || guest.invites_sent || 0);
        if (typeof _syncGuestProjectsCache === 'function') {
            _syncGuestProjectsCache();
        }
        renderGuestProjectsSection(true);
        closeGuestInviteModal();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        tg.openTelegramLink(`https://t.me/${ownerUsername}?text=${encodedText}`);
    } catch (error) {
        console.error('Guest invite send error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    } finally {
        _guestInviteSending = false;
        if (_guestInviteGuestId) {
            renderGuestInviteModal();
        }
    }
}

function buildProjectInviteStartLink(projectId) {
    if (typeof window.buildProjectReferralStartLink === 'function') {
        return window.buildProjectReferralStartLink(projectId);
    }
    var botUsername = String((window.App && window.App.botUsername) || window.__BOT_USERNAME__ || 'Android12TestersBot').trim().replace(/^@+/, '');
    return 'https://t.me/' + botUsername + '?start=mutual_' + Number(projectId || 0);
}

function buildGuestTesterPlatformInviteLink(project, tester) {
    var guestAppId = String((tester && tester.external_guest_app_id) || '').trim();
    var packageName = String((tester && tester.external_package_name) || '').trim();
    var isGuestTester = !!(tester && (tester.is_guest_tester || tester.is_external));
    if (isGuestTester && (guestAppId || packageName)) {
        if (typeof window.buildGuestInviteDeepLink === 'function') {
            return window.buildGuestInviteDeepLink(guestAppId || packageName, Number(userId || 0), lang);
        }
        if (typeof window.buildExternalClaimStartLink === 'function') {
            return window.buildExternalClaimStartLink(packageName, guestAppId);
        }
    }
    return buildProjectInviteStartLink(project && project.id);
}

function openTelegramPrefilledMessage(username, text) {
    var cleanUsername = String(username || '').trim().replace(/^@+/, '');
    if (!cleanUsername) {
        return false;
    }
    var url = 'https://t.me/' + cleanUsername + '?text=' + encodeURIComponent(String(text || ''));
    try {
        tg.openTelegramLink(url);
    } catch (error) {
        try {
            tg.openLink(url);
        } catch (fallbackError) {
            window.open(url, '_blank', 'noopener');
        }
    }
    return true;
}

function copyTextWithToast(text, toastKey) {
    if (!navigator.clipboard || !String(text || '').trim()) {
        return;
    }
    navigator.clipboard.writeText(String(text)).then(function() {
        showToast(window.t(toastKey || 'copied', {}, lang));
    }).catch(function(error) {
        console.error('Copy failed', error);
    });
}

function getExternalTrackGuest() {
    return (Array.isArray(guestProjects) ? guestProjects : []).find(function(item) {
        return String(item.id || '') === String(_externalTrackGuestId || '');
    }) || null;
}

function getEligibleExternalTrackProjects() {
    return (Array.isArray(myProjects) ? myProjects : []).filter(function(project) {
        if (!project) return false;
        var mode = String(project.mode || 'mutual').toLowerCase();
        var status = String(project.app_status || project.status || 'active').toLowerCase();
        return project.is_visible !== false && status === 'active' && (mode === 'mutual' || mode === 'hybrid');
    });
}

function getSelectedExternalTrackProject() {
    var projects = getEligibleExternalTrackProjects();
    return projects.find(function(project) {
        return Number(project.id) === Number(_externalTrackProjectId || 0);
    }) || (projects.length ? projects[0] : null);
}

function getGuestTesterRecord(projectId, progressId) {
    var project = (Array.isArray(myProjects) ? myProjects : []).find(function(item) {
        return Number(item.id) === Number(projectId || 0);
    }) || null;
    var tester = project && Array.isArray(project.testers)
        ? project.testers.find(function(item) {
            return Number(item.progress_id || 0) === Number(progressId || 0);
        })
        : null;
    return { project: project, tester: tester || null };
}

function getExternalTesterStatusMeta(tester) {
    var lastCompletedDay = Number(tester && tester.external_last_completed_control_day || 0);
    var daysSinceLastCompleted = tester && tester.external_days_since_last_completed;
    if (!lastCompletedDay) {
        return {
            tone: 'waiting',
            label: window.t('guestTesterStatusWaiting', {}, lang)
        };
    }
    if (daysSinceLastCompleted === null || typeof daysSinceLastCompleted === 'undefined') {
        return {
            tone: 'active',
            label: window.t('guestTesterStatusCurrent', { day: lastCompletedDay }, lang)
        };
    }
    var gap = Number(daysSinceLastCompleted || 0);
    if (gap <= 1) {
        return {
            tone: 'active',
            label: window.t('guestTesterStatusCurrent', { day: lastCompletedDay }, lang)
        };
    }
    if (gap <= 3) {
        return {
            tone: 'warm',
            label: window.t('guestTesterStatusLagging', { day: lastCompletedDay, count: gap }, lang)
        };
    }
    return {
        tone: 'late',
        label: window.t('guestTesterStatusStalled', { day: lastCompletedDay, count: gap }, lang)
    };
}

function getExternalTesterControlMeta(tester) {
    var meta = getNextExternalControlDayMeta(tester);
    if (!meta.nextControlDay) {
        return {
            tone: 'soft',
            label: window.t('guestTesterControlDone', {}, lang)
        };
    }
    if (meta.daysLeft <= 0) {
        return {
            tone: 'green',
            label: window.t('guestTesterControlToday', {}, lang)
        };
    }
    if (meta.daysLeft === 1) {
        return {
            tone: 'yellow',
            label: window.t('guestTesterControlTomorrow', {}, lang)
        };
    }
    return {
        tone: 'soft',
        label: window.t('guestTesterControlInDays', { count: meta.daysLeft }, lang)
    };
}

function formatExternalSourceLabel(source) {
    var normalized = String(source || '').trim().toLowerCase();
    if (normalized === 'fast_track') {
        return window.t('externalSourceFastTrack', {}, lang);
    }
    if (normalized === 'manual') {
        return window.t('externalSourceManual', {}, lang);
    }
    return window.t('externalSourceGeneric', {}, lang);
}

function getGuestOriginType(source) {
    return String(source || '').trim().toLowerCase() === 'manual' ? 'manual' : 'showcase';
}

function getGuestOriginMeta(source) {
    var originType = getGuestOriginType(source);
    if (originType === 'manual') {
        return {
            chipIcon: '✍️',
            listIcon: '✍️',
            label: window.t('guestOriginManualChip', {}, lang),
            className: 'accent-yellow'
        };
    }
    return {
        chipIcon: '🌍',
        listIcon: '🌍',
        label: window.t('guestOriginShowcaseChip', {}, lang),
        className: 'accent-blue'
    };
}

function renderGuestOriginChip(source) {
    var meta = getGuestOriginMeta(source);
    return `<span class="meta-chip ${meta.className}">${window.escapeHTML(meta.chipIcon + ' ' + meta.label)}</span>`;
}

function hasGuestLinkRelationship(test) {
    if (!test) return false;
    return !!test.is_external || !!String(test.external_source || '').trim() || Number(test.external_source_app_id || 0) > 0;
}

function shouldShowGuestOriginChip(test) {
    if (!test) return false;
    return !!test.is_external && !!String(test.external_source || '').trim();
}

function isGuestOriginTest(test) {
    return hasGuestLinkRelationship(test);
}

function shouldKeepExternalTestInVoluntarySection(test) {
    if (!test || !test.is_external) return false;
    return !isExternalControlDayDue(test) || String(test.status || '') === 'done';
}

function getExternalTrackPlayUrl(guest) {
    var explicitPlayUrl = String(guest && guest.play_store_url || '').trim();
    if (explicitPlayUrl) {
        return explicitPlayUrl;
    }
    var packageName = String(guest && (guest.package_name || guest.name) || '').trim();
    return packageName ? ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(packageName)) : '';
}

function renderManualExternalLinkedProjectOptions(preferredProjectId) {
    var checkbox = document.getElementById('manual-external-is-mutual');
    var sourceInput = document.getElementById('manual-external-source-project-id');
    var projects = getEligibleExternalTrackProjects();
    var resolvedSourceProjectId = Number(preferredProjectId || (sourceInput && sourceInput.value) || 0);
    var hasEligibleSource = projects.some(function(project) {
        return Number(project.id) === resolvedSourceProjectId;
    });

    if (checkbox) {
        checkbox.disabled = !hasEligibleSource;
        if (!hasEligibleSource) {
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
        }
    }
    updateManualExternalMutualState();
}

function updateManualExternalMutualState() {
    var checkbox = document.getElementById('manual-external-is-mutual');
    var select = document.getElementById('manual-external-linked-project');
    var group = document.getElementById('manual-external-linked-project-group');
    var sourceInput = document.getElementById('manual-external-source-project-id');
    var sourceProjectId = Number(sourceInput && sourceInput.value || 0);
    var hasEligibleSource = getEligibleExternalTrackProjects().some(function(project) {
        return Number(project.id) === sourceProjectId;
    });
    if (group) {
        group.classList.add('is-hidden');
    }
    if (checkbox) {
        checkbox.disabled = !hasEligibleSource;
        if (!hasEligibleSource) {
            checkbox.checked = false;
        }
    }
    if (select) {
        select.disabled = true;
    }
}

function toggleManualExternalMutualFields(event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    updateManualExternalMutualState();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openExternalAppLink(url, event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    var targetUrl = String(url || '').trim();
    if (!targetUrl) {
        return false;
    }
    try {
        if (window.tg && typeof window.tg.openLink === 'function') {
            window.tg.openLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    } catch (error) {
        window.location.href = targetUrl;
    }
    try {
        if (window.tg && window.tg.HapticFeedback && typeof window.tg.HapticFeedback.impactOccurred === 'function') {
            window.tg.HapticFeedback.impactOccurred('light');
        }
    } catch (error) {}
    return false;
}

function getExternalTrackFormElements() {
    var body = document.getElementById('external-track-modal-body');
    if (!body) {
        return { select: null, checkbox: null, submitBtn: null };
    }
    return {
        select: body.querySelector('#external-track-project-select'),
        checkbox: body.querySelector('#external-track-ack'),
        submitBtn: body.querySelector('#external-track-submit-btn'),
    };
}

function isExternalTrackFormValid() {
    var elements = getExternalTrackFormElements();
    return !!(
        elements.checkbox
        && elements.checkbox.checked === true
        && elements.select
        && String(elements.select.value || '').trim() !== ''
    );
}

function updateExternalTrackSubmitState() {
    var elements = getExternalTrackFormElements();
    var submitBtn = elements.submitBtn;
    if (!submitBtn) {
        return;
    }
    var guest = getExternalTrackGuest() || {};
    var ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    var disabled = _externalTrackSending || !ownerUsername || !isExternalTrackFormValid();
    submitBtn.disabled = disabled;
    submitBtn.classList.toggle('btn-primary', !disabled);
    submitBtn.classList.toggle('btn-secondary', disabled);
    submitBtn.classList.toggle('disabled', disabled);
}

function showExternalTrackInfoClick(event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    showExternalTrackInfo();
    return false;
}

function showExternalTrackInfo() {
    var message = window.t('externalTrackExplainAlert', {}, lang);
    if (typeof window.showCustomAlert === 'function') {
        window.showCustomAlert(message);
        return;
    }
    var telegram = window.tg || window.Telegram && window.Telegram.WebApp || (typeof tg !== 'undefined' ? tg : null);
    if (telegram && typeof telegram.showAlert === 'function') {
        telegram.showAlert(message);
        return;
    }
    alert(message);
}

function renderExternalTrackModal() {
    var modal = document.getElementById('external-track-modal');
    var body = document.getElementById('external-track-modal-body');
    if (!modal || !body) return;

    var guest = getExternalTrackGuest();
    if (!guest) {
        body.innerHTML = `<div class="guest-invite-note">${window.escapeHTML(window.t('guestProjectsLoadError', {}, lang))}</div>`;
        return;
    }

    var ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    var guestDisplayName = getGuestDisplayName(guest);
    var safePackageName = window.escapeHTML(guestDisplayName || window.t('unknownLabel', {}, lang));
    var langChip = getGuestLanguageDisplayParts(guest.language || guest.lang, guest.user_lang).length
        ? renderGuestLanguageBadge(guest.language || guest.lang, guest.user_lang)
        : '';
    var checkboxLabelHtml = window.t('externalTrackCheckboxLabel', {
        appName: safePackageName,
    }, lang);
    var selectedProject = getSelectedExternalTrackProject();
    if (!_externalTrackProjectId && selectedProject) {
        _externalTrackProjectId = Number(selectedProject.id || 0);
    }
    var projects = getEligibleExternalTrackProjects();
    var groupUrl = String(guest.google_group_url || 'https://groups.google.com/g/google-play-dev-test').trim();
    var playUrl = getExternalTrackPlayUrl(guest);
    var optionsHtml = projects.length
        ? projects.map(function(project) {
            var selected = Number(project.id) === Number(_externalTrackProjectId || selectedProject && selectedProject.id || 0);
            return `<option value="${window.escapeHTML(String(project.id || ''))}"${selected ? ' selected' : ''}>${window.escapeHTML(project.name || window.t('unknownLabel', {}, lang))}</option>`;
        }).join('')
        : '';

    if (_externalTrackStep === 2) {
        var claimLink = typeof window.buildExternalClaimStartLink === 'function'
            ? window.buildExternalClaimStartLink(guest.package_name || guest.name || '', guest.id)
            : '';
        var myGroupLink = String(selectedProject ? (selectedProject.google_group_url || window.DEFAULT_GOOGLE_GROUP_URL || '') : '').trim();
        var myPackage = String(selectedProject ? (selectedProject.package || selectedProject.package_name || '') : '').trim();
        var myPlayLink = myPackage ? ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(myPackage)) : '';
        var messageText = window.t('externalTrackInviteMessageTemplate', {
            app_name: getGuestDisplayName(guest) || window.t('unknownLabel', {}, lang),
            claim_link: claimLink,
            play_link: myPlayLink,
            group_link: myGroupLink,
        }, _externalTrackLang);

        var previewHtml = escapeHtmlWithBreaks(messageText);

        body.innerHTML = `
            <div class="external-track-hero">
                <div class="external-track-hero-badge">${window.escapeHTML(window.t('externalTrackBadge', {}, lang))}</div>
                <div class="external-track-hero-title notranslate" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    ${safePackageName}
                    ${langChip}
                </div>
                <div class="external-track-hero-subtitle notranslate">@${ownerUsername}</div>
            </div>
            <div class="guest-invite-card external-track-card">
                <div class="guest-invite-language-row">
                    <div class="guest-invite-language-label">${window.escapeHTML(window.t('guestInviteLanguageLabel', {}, lang))}</div>
                    <div class="segmented-control guest-invite-language-toggle">
                        <button type="button" class="seg-btn ${_externalTrackLang === 'ru' ? 'active' : ''}" onclick="setExternalTrackLanguage('ru', event)">${window.escapeHTML(window.t('guestInviteLanguageRu', {}, lang))}</button>
                        <button type="button" class="seg-btn ${_externalTrackLang === 'en' ? 'active' : ''}" onclick="setExternalTrackLanguage('en', event)">${window.escapeHTML(window.t('guestInviteLanguageEn', {}, lang))}</button>
                    </div>
                </div>
                <div class="guest-invite-preview-head">
                    <div class="guest-invite-preview-title">${window.escapeHTML(window.t('guestInvitePreviewTitle', {}, lang))}</div>
                    <div class="guest-invite-preview-caption">${window.escapeHTML(window.t('guestInvitePreviewCaption', {}, lang))}</div>
                </div>
                <div class="guest-invite-preview-shell">
                    <div class="guest-invite-preview-text notranslate">${previewHtml}</div>
                </div>
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="btn btn-secondary" style="flex:1;" onclick="setExternalTrackStep(1, event)">${window.escapeHTML(window.t('backLabel', {}, lang) || 'Назад')}</button>
                    <button id="external-track-submit-btn" class="btn btn-primary" style="flex:2;" onclick="sendExternalTrackInvite()">${window.escapeHTML(window.t(_externalTrackSending ? 'externalTrackSending' : 'externalTrackSendBtn', {}, lang))}</button>
                </div>
            </div>
        `;
        return;
    }

    body.innerHTML = `
        <div class="external-track-hero">
            <div class="external-track-hero-badge">${window.escapeHTML(window.t('externalTrackBadge', {}, lang))}</div>
            <div class="external-track-hero-title notranslate" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                ${safePackageName}
                ${langChip}
            </div>
            <div class="external-track-hero-subtitle">${window.escapeHTML(window.t('externalTrackModalDesc', { owner_username: ownerUsername ? '@' + ownerUsername : window.t('guestInviteOwnerMissing', {}, lang) }, lang))}</div>
        </div>
        <div class="external-track-steps">
            <button class="btn btn-secondary" style="width:100%;" onclick="return openExternalAppLink('${escapeInlineJsString(groupUrl)}', event)">${window.escapeHTML(window.t('externalTrackJoinGroupBtn', {}, lang))}</button>
            <button class="btn btn-secondary" style="width:100%;" onclick="return openExternalAppLink('${escapeInlineJsString(playUrl)}', event)" ${playUrl ? '' : 'disabled'}>${window.escapeHTML(window.t('externalTrackOpenPlayBtn', {}, lang))}</button>
        </div>
        <div class="guest-invite-card external-track-card">
            <div class="guest-invite-language-row external-track-select-row">
                <div class="guest-invite-language-label">${window.escapeHTML(window.t('externalTrackSelectProjectLabel', {}, lang))}</div>
                <select id="external-track-project-select" class="form-input" onchange="setExternalTrackProject(this.value, event)">${optionsHtml || `<option value="">${window.escapeHTML(window.t('externalTrackNeedsProject', {}, lang))}</option>`}</select>
            </div>
            <div class="external-track-check">
                <label class="external-track-check-main">
                    <input id="external-track-ack" type="checkbox" ${_externalTrackAcknowledged ? 'checked' : ''} onchange="toggleExternalTrackAcknowledged(this, event)">
                    <span class="external-track-check-text">${checkboxLabelHtml}</span>
                </label>
                <button id="external-track-info-btn" type="button" class="external-track-info-btn" onclick="return showExternalTrackInfoClick(event)">${window.escapeHTML(window.t('externalTrackInfoBtn', {}, lang))}</button>
            </div>
            <button id="external-track-submit-btn" class="btn btn-secondary disabled" disabled style="width:100%;" onclick="sendExternalTrackInvite()">${window.escapeHTML(window.t(_externalTrackSending ? 'externalTrackSending' : 'externalTrackSendBtn', {}, lang))}</button>
        </div>
    `;
    updateExternalTrackSubmitState();
}

function resetManualExternalAddForm() {
    var form = document.getElementById('manual-external-add-form');
    var sourceInput = document.getElementById('manual-external-source-project-id');
    var mutualCheckbox = document.getElementById('manual-external-is-mutual');
    if (form) form.reset();
    if (sourceInput) sourceInput.value = '';
    if (mutualCheckbox) {
        mutualCheckbox.checked = true;
        mutualCheckbox.disabled = false;
    }
    renderManualExternalLinkedProjectOptions(0);
    updateManualExternalTestingDayValue(1);
}

function updateManualExternalTestingDayValue(value) {
    var dayNode = document.getElementById('manual-external-testing-day-value');
    var rangeInput = document.getElementById('manual-external-testing-day');
    var dotNodes = document.querySelectorAll('.manual-external-day-dot');
    var numericValue = Number(value || (rangeInput && rangeInput.value) || 1);
    if (!Number.isFinite(numericValue)) numericValue = 1;
    numericValue = Math.max(1, Math.min(14, numericValue));
    if (rangeInput) rangeInput.value = String(numericValue);
    if (dayNode) dayNode.textContent = String(numericValue);
    if (dotNodes && dotNodes.length) {
        dotNodes.forEach(function(dotNode, index) {
            dotNode.classList.toggle('is-active', index < numericValue);
        });
    }
}

function normalizeManualExternalOwnerNicknameInput(eventOrInput) {
    var input = eventOrInput && eventOrInput.target ? eventOrInput.target : eventOrInput;
    if (!input) {
        input = document.getElementById('manual-external-owner-username');
    }
    if (!input) return '';

    var rawValue = String(input.value || '').trim().replace(/\s+/g, '');
    if (!rawValue) {
        input.value = '';
        return '';
    }

    var normalizedValue = '@' + rawValue.replace(/^@+/, '');
    input.value = normalizedValue;
    return normalizedValue;
}

function openManualExternalAddModal(projectId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    resetManualExternalAddForm();
    var modal = document.getElementById('manual-external-add-modal');
    var sourceInput = document.getElementById('manual-external-source-project-id');
    if (sourceInput) sourceInput.value = String(Number(projectId || 0) || 0);
    renderManualExternalLinkedProjectOptions(projectId);
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var appNameInput = document.getElementById('manual-external-app-name');
    if (appNameInput && typeof appNameInput.focus === 'function') {
        appNameInput.focus();
    }
}

function closeManualExternalAddModal(event) {
    var modal = document.getElementById('manual-external-add-modal');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('active');
}

function resetEditGuestProjectForm() {
    var form = document.getElementById('edit-guest-project-form');
    var packageInput = document.getElementById('edit-guest-project-package-name');
    var testIdInput = document.getElementById('edit-guest-project-test-id');
    if (form) form.reset();
    if (packageInput) packageInput.value = '';
    if (testIdInput) testIdInput.value = '';
}

function openEditGuestProjectModal(testId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    var targetTest = (Array.isArray(myTests) ? myTests : []).find(function(test) {
        return Number(test.id) === Number(testId || 0);
    }) || null;
    if (!targetTest || !targetTest.is_external) {
        return;
    }

    resetEditGuestProjectForm();
    var packageInput = document.getElementById('edit-guest-project-package-name');
    var testIdInput = document.getElementById('edit-guest-project-test-id');
    var appNameInput = document.getElementById('edit-guest-project-app-name');
    var playUrlInput = document.getElementById('edit-guest-project-play-url');
    var ownerInput = document.getElementById('edit-guest-project-owner-username');
    var groupUrlInput = document.getElementById('edit-guest-project-group-url');
    var packageName = String(targetTest.external_package_name || targetTest.package || '').trim();
    var currentDisplayName = String(targetTest.name || '').trim();
    if (packageInput) packageInput.value = packageName;
    if (testIdInput) testIdInput.value = String(Number(targetTest.id || 0) || 0);
    if (appNameInput) appNameInput.value = currentDisplayName && currentDisplayName !== packageName ? currentDisplayName : '';
    if (playUrlInput) playUrlInput.value = getExternalTrackPlayUrl(targetTest);
    if (ownerInput) ownerInput.value = targetTest.owner_username ? ('@' + String(targetTest.owner_username).trim().replace(/^@+/, '')) : '';
    if (groupUrlInput) groupUrlInput.value = String(targetTest.google_group_url || '').trim();

    var modal = document.getElementById('edit-guest-project-modal');
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (appNameInput && typeof appNameInput.focus === 'function') {
        appNameInput.focus();
    }
}

function closeEditGuestProjectModal(event) {
    var modal = document.getElementById('edit-guest-project-modal');
    if (!modal) return;
    if (event && event.target && event.target !== modal) return;
    modal.classList.remove('active');
}

function openExternalTrackModal(guestAppId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _externalTrackGuestId = String(guestAppId || '');
    _externalTrackSending = false;
    _externalTrackAcknowledged = false;
    _externalTrackStep = 1;
    var selectedProject = getSelectedExternalTrackProject();
    _externalTrackProjectId = selectedProject ? Number(selectedProject.id || 0) : 0;

    var guest = getExternalTrackGuest();
    _externalTrackLang = typeof window.getDefaultGuestInviteLanguage === 'function'
        ? window.getDefaultGuestInviteLanguage(guest && (guest.language || guest.lang))
        : 'en';

    renderExternalTrackModal();
    var modal = document.getElementById('external-track-modal');
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeExternalTrackModal(event) {
    var modal = document.getElementById('external-track-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _externalTrackGuestId = null;
    _externalTrackSending = false;
    _externalTrackProjectId = 0;
    _externalTrackAcknowledged = false;
    _externalTrackStep = 1;
    _externalTrackLang = null;
}

function setExternalTrackProject(projectId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _externalTrackProjectId = Number(projectId || 0);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateExternalTrackSubmitState();
}

function setExternalTrackLanguage(nextLang, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _externalTrackLang = String(nextLang || 'en');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    renderExternalTrackModal();
}

function setExternalTrackStep(nextStep, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _externalTrackStep = Number(nextStep || 1);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    renderExternalTrackModal();
}

function toggleExternalTrackAcknowledged(input, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    var wasAcknowledged = !!_externalTrackAcknowledged;
    _externalTrackAcknowledged = !!(input && input.checked);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (_externalTrackAcknowledged && !wasAcknowledged) {
        showExternalTrackInfo();
    }
    updateExternalTrackSubmitState();
}

async function sendExternalTrackInvite() {
    var guest = getExternalTrackGuest();
    if (!guest || _externalTrackSending) return;

    var elements = getExternalTrackFormElements();
    var selectedProjectId = Number(elements.select && elements.select.value || _externalTrackProjectId || 0);
    _externalTrackProjectId = selectedProjectId;

    if (_externalTrackStep === 1) {
        _externalTrackAcknowledged = !!(elements.checkbox && elements.checkbox.checked === true);
        var selectedProject = getSelectedExternalTrackProject();
        if (!selectedProject) {
            showToast(window.t('externalTrackNeedsProject', {}, lang));
            return;
        }

        var ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
        if (!ownerUsername) {
            showToast(window.t('guestInviteNoUsername', {}, lang));
            return;
        }
        if (!isExternalTrackFormValid()) {
            var telegram = window.tg || window.Telegram && window.Telegram.WebApp || (typeof tg !== 'undefined' ? tg : null);
            if (telegram && typeof telegram.showAlert === 'function') telegram.showAlert(window.t('externalTrackNeedConfirm', {}, lang));
            else showToast(window.t('externalTrackNeedConfirm', {}, lang));
            return;
        }

        _externalTrackStep = 2;
        renderExternalTrackModal();
        return;
    }

    var selectedProject = getSelectedExternalTrackProject();
    if (!selectedProject) {
        showToast(window.t('externalTrackNeedsProject', {}, lang));
        return;
    }

    var ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    if (!ownerUsername) {
        showToast(window.t('guestInviteNoUsername', {}, lang));
        return;
    }

    _externalTrackSending = true;
    renderExternalTrackModal();
    try {
        var result = await window.startExternalTrackingSession({
            tester_id: userId,
            guest_app_id: guest.id,
            source_app_id: selectedProject.id,
            package_name: String(guest.package_name || guest.name || '').trim(),
            owner_telegram_id: Number(guest.owner_telegram_id || guest.owner_id || 0) || null,
            owner_username: ownerUsername || null,
            google_group_url: String(guest.google_group_url || window.DEFAULT_GOOGLE_GROUP_URL || '').trim() || null,
            instructions: String(guest.instructions || '').trim() || null,
            target_lang: String(guest.target_lang || guest.lang || 'ALL').trim().toUpperCase(),
            category: String(guest.category || 'APP').trim().toUpperCase(),
        });
        if (!result) return;

        var claimLink = typeof window.buildExternalClaimStartLink === 'function'
            ? window.buildExternalClaimStartLink(guest.package_name || guest.name || '', guest.id)
            : '';
        var myGroupLink = String(selectedProject.google_group_url || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
        var myPackage = String(selectedProject.package || selectedProject.package_name || '').trim();
        var myPlayLink = myPackage ? ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(myPackage)) : '';
        var messageText = window.t('externalTrackInviteMessageTemplate', {
            app_name: getGuestDisplayName(guest) || window.t('unknownLabel', {}, lang),
            claim_link: claimLink,
            play_link: myPlayLink,
            group_link: myGroupLink,
        }, _externalTrackLang);

        copyTextWithToast(messageText, 'externalTrackCopied');
        closeExternalTrackModal();
        var telegramSuccess = window.tg || window.Telegram && window.Telegram.WebApp || (typeof tg !== 'undefined' ? tg : null);
        if (telegramSuccess && telegramSuccess.HapticFeedback && typeof telegramSuccess.HapticFeedback.notificationOccurred === 'function') {
            telegramSuccess.HapticFeedback.notificationOccurred('success');
        }
        openTelegramPrefilledMessage(ownerUsername, messageText);
    } catch (error) {
        console.error('External track send error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    } finally {
        _externalTrackSending = false;
        if (_externalTrackGuestId) {
            renderExternalTrackModal();
        }
    }
}

function renderGuestTesterDetailsModal() {
    var modal = document.getElementById('guest-tester-modal');
    var body = document.getElementById('guest-tester-modal-body');
    if (!modal || !body) return;

    var record = getGuestTesterRecord(_guestTesterProjectId, _guestTesterProgressId);
    var project = record.project;
    var tester = record.tester;
    if (!project || !tester) {
        body.innerHTML = `<div class="guest-invite-note">${window.escapeHTML(window.t('guestProjectsLoadError', {}, lang))}</div>`;
        return;
    }

    var cleanUsername = String(tester.username || '').trim().replace(/^@+/, '');
    var testerLabel = cleanUsername
        ? '@' + cleanUsername
        : window.t('idLabel', { id: Number(tester.tester_id || 0) }, lang);
    var statusMeta = getExternalTesterStatusMeta(tester);
    var currentDay = tester.start_date ? getUserTestingDay(tester.start_date) : Number(tester.external_last_completed_control_day || 0);
    var inviteText = window.t('guestTesterInvitePlatformMessage', {
        app_name: project.name || window.t('unknownLabel', {}, lang),
        invite_link: buildGuestTesterPlatformInviteLink(project, tester),
    }, lang);
    var originChipHtml = renderGuestOriginChip(tester.external_source);
    var sourcePackage = String(tester.external_package_name || '').trim();
    var sourcePackageHtml = sourcePackage
        ? `<div class="guest-tester-detail-line notranslate">${window.escapeHTML(window.t('guestTesterDetailPackage', { package: sourcePackage }, lang))}</div>`
        : '';

    body.innerHTML = `
        <div class="guest-tester-detail-card">
            <div class="guest-tester-detail-head">
                <div class="guest-tester-detail-title notranslate">${window.escapeHTML(testerLabel)}</div>
                <span class="guest-tester-status-chip is-${window.escapeHTML(statusMeta.tone)}">${window.escapeHTML(statusMeta.label)}</span>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">${originChipHtml}</div>
            <div class="guest-tester-detail-line">${window.escapeHTML(window.t('guestTesterDetailCurrentDay', { day: Number(currentDay || 0) }, lang))}</div>
            ${sourcePackageHtml}
            <div class="guest-tester-detail-line">${window.escapeHTML(window.t('guestTesterDetailLastControlDay', { day: Number(tester.external_last_completed_control_day || 0) }, lang))}</div>
            <div class="guest-tester-detail-line">${window.escapeHTML(window.t('guestTesterDetailSource', { source: formatExternalSourceLabel(tester.external_source) }, lang))}</div>
            <div class="guest-tester-detail-actions">
                <button class="btn btn-secondary" style="width:100%;" onclick="return openTelegramProfile('${escapeInlineJsString(cleanUsername)}', event)" ${cleanUsername ? '' : 'disabled'}>${window.escapeHTML(window.t('guestTesterContactBtn', {}, lang))}</button>
                <button class="btn btn-primary" style="width:100%;" onclick="copyTextWithToast('${escapeInlineJsString(inviteText)}', 'externalTrackCopied'); openTelegramPrefilledMessage('${escapeInlineJsString(cleanUsername)}', '${escapeInlineJsString(inviteText)}'); if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');" ${cleanUsername ? '' : 'disabled'}>${window.escapeHTML(window.t('guestTesterInvitePlatformBtn', {}, lang))}</button>
                <button class="btn" style="width:100%; background-color: rgba(255, 59, 48, 0.12); color: #ff6b63; border: 1px solid rgba(255, 59, 48, 0.32);" onclick="openGuestLinkRemoveModalFromTester(${Number(project.id || 0)}, ${Number(tester.progress_id || 0)}, event)">${window.escapeHTML(window.t('guestLinkRemoveBtn', {}, lang))}</button>
            </div>
        </div>
    `;
}

function openGuestTesterDetailsModal(projectId, progressId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _guestTesterProjectId = Number(projectId || 0);
    _guestTesterProgressId = Number(progressId || 0);
    renderGuestTesterDetailsModal();
    var modal = document.getElementById('guest-tester-modal');
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeGuestTesterDetailsModal(event) {
    var modal = document.getElementById('guest-tester-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _guestTesterProjectId = 0;
    _guestTesterProgressId = 0;
}

function ensureGuestLinkRemoveModal() {
    var modal = document.getElementById('guest-link-remove-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'guest-link-remove-modal';
    modal.className = 'modal-overlay';
    modal.onclick = function(event) { closeGuestLinkRemoveModal(event); };
    modal.innerHTML = '<div class="modal-content" onclick="event.stopPropagation()"><div id="guest-link-remove-modal-body"></div></div>';
    document.body.appendChild(modal);
    return modal;
}

function renderGuestLinkRemoveModal() {
    var modal = ensureGuestLinkRemoveModal();
    var body = document.getElementById('guest-link-remove-modal-body');
    if (!modal || !body || !_guestLinkRemoveState) return;

    var state = _guestLinkRemoveState;
    var canSubmit = !!(state.removeFromMyTests || state.removeFromMyTesters);
    var appNameHtml = state.appName
        ? `<div class="guest-link-remove-meta">${window.escapeHTML(state.appName)}</div>`
        : '';
    var testerLabelHtml = state.testerLabel
        ? `<div class="guest-link-remove-meta notranslate">${window.escapeHTML(state.testerLabel)}</div>`
        : '';

    body.innerHTML = `
        <div class="guest-link-remove-sheet">
            <div class="detail-section-title">${window.escapeHTML(window.t('guestLinkRemoveTitle', {}, lang))}</div>
            <div class="guest-link-remove-text">${window.escapeHTML(window.t('guestLinkRemoveText', {}, lang))}</div>
            ${appNameHtml}
            ${testerLabelHtml}
            <label class="guest-link-remove-option">
                <input type="checkbox" ${state.removeFromMyTests ? 'checked' : ''} onchange="toggleGuestLinkRemoveOption('removeFromMyTests', this.checked)">
                <span class="guest-link-remove-copy">
                    <span class="guest-link-remove-option-title">${window.escapeHTML(window.t('guestLinkRemoveMyTestsLabel', {}, lang))}</span>
                    <span class="guest-link-remove-option-hint">${window.escapeHTML(window.t('guestLinkRemoveMyTestsHint', {}, lang))}</span>
                </span>
            </label>
            <label class="guest-link-remove-option">
                <input type="checkbox" ${state.removeFromMyTesters ? 'checked' : ''} onchange="toggleGuestLinkRemoveOption('removeFromMyTesters', this.checked)">
                <span class="guest-link-remove-copy">
                    <span class="guest-link-remove-option-title">${window.escapeHTML(window.t('guestLinkRemoveMyTestersLabel', {}, lang))}</span>
                    <span class="guest-link-remove-option-hint">${window.escapeHTML(window.t('guestLinkRemoveMyTestersHint', {}, lang))}</span>
                </span>
            </label>
            <div class="action-row" style="margin-top: 16px;">
                <button class="btn btn-secondary" style="flex: 1;" onclick="closeGuestLinkRemoveModal()">${window.escapeHTML(window.t('btnCancel', {}, lang))}</button>
                <button class="btn" style="flex: 1; ${(!canSubmit || state.isSubmitting) ? 'background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;' : ''}" ${(!canSubmit || state.isSubmitting) ? 'disabled' : ''} onclick="confirmGuestLinkRemove(event)">${window.escapeHTML(window.t('guestLinkRemoveConfirmBtn', {}, lang))}</button>
            </div>
        </div>
    `;
}

function openGuestLinkRemoveModal(context, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _guestLinkRemoveState = Object.assign({
        progressId: 0,
        sourceAppId: 0,
        appName: '',
        testerLabel: '',
        removeFromMyTests: true,
        removeFromMyTesters: true,
        isSubmitting: false,
    }, context || {});
    renderGuestLinkRemoveModal();
    var modal = ensureGuestLinkRemoveModal();
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function openGuestLinkRemoveModalFromTest(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = (Array.isArray(myTests) ? myTests : []).find(function(item) {
        return Number(item.id) === Number(testId || 0);
    }) || null;
    if (!test || !isGuestOriginTest(test)) return;

    var ownerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    openGuestLinkRemoveModal({
        progressId: Number(test.progress_id || 0),
        sourceAppId: Number(test.external_source_app_id || 0),
        appName: test.name || test.package || window.t('unknownLabel', {}, lang),
        testerLabel: ownerUsername ? '@' + ownerUsername : '',
        removeFromMyTests: true,
        removeFromMyTesters: false,
    });
}

function openGuestLinkRemoveModalFromTester(projectId, progressId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var record = getGuestTesterRecord(projectId, progressId);
    if (!record || !record.project || !record.tester) return;

    var tester = record.tester;
    var cleanUsername = String(tester.username || '').trim().replace(/^@+/, '');
    var testerLabel = cleanUsername
        ? '@' + cleanUsername
        : window.t('idLabel', { id: Number(tester.tester_id || 0) }, lang);

    openGuestLinkRemoveModal({
        progressId: Number(tester.progress_id || 0),
        sourceAppId: Number(projectId || 0),
        appName: record.project.name || window.t('unknownLabel', {}, lang),
        testerLabel: testerLabel,
        removeFromMyTests: false,
        removeFromMyTesters: true,
    });
}

function toggleGuestLinkRemoveOption(field, checked) {
    if (!_guestLinkRemoveState) return;
    _guestLinkRemoveState[field] = !!checked;
    renderGuestLinkRemoveModal();
}

async function confirmGuestLinkRemove(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!_guestLinkRemoveState) return;
    if (!_guestLinkRemoveState.removeFromMyTests && !_guestLinkRemoveState.removeFromMyTesters) {
        showToast(window.t('guestLinkRemoveSelectionRequired', {}, lang));
        return;
    }
    if (_guestLinkRemoveState.isSubmitting) {
        return;
    }

    _guestLinkRemoveState.isSubmitting = true;
    renderGuestLinkRemoveModal();
    try {
        var result = await window.unlinkGuestRelationship(_guestLinkRemoveState.progressId, {
            sourceAppId: _guestLinkRemoveState.sourceAppId,
            removeFromMyTests: _guestLinkRemoveState.removeFromMyTests,
            removeFromMyTesters: _guestLinkRemoveState.removeFromMyTesters,
        });
        if (!result) return;

        closeGuestLinkRemoveModal();
        closeGuestTesterDetailsModal();
        closeProjectDetailsModal();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('guestLinkRemoveSuccess', {}, lang));
    } catch (error) {
        console.error('Guest link unlink error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    } finally {
        if (_guestLinkRemoveState) {
            _guestLinkRemoveState.isSubmitting = false;
        }
        renderGuestLinkRemoveModal();
    }
}

function closeGuestLinkRemoveModal(event) {
    var modal = document.getElementById('guest-link-remove-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _guestLinkRemoveState = null;
}

async function sendExternalTrackingProofFromUi(testId, ownerUsername, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = (Array.isArray(myTests) ? myTests : []).find(function(item) {
        return Number(item.id) === Number(testId || 0);
    }) || null;
    if (!test) return;

    var cleanUsername = String(ownerUsername || test.owner_username || '').trim().replace(/^@+/, '');
    if (!cleanUsername) {
        showToast(window.t('playReviewMissingOwnerLink', {}, lang));
        return;
    }

    var result = await window.submitExternalTrackingProof(test.progress_id, test.id);
    if (!result) return;

    var proofText = window.t('externalTrackProofMessageTemplate', {
        app_name: test.name || window.t('unknownLabel', {}, lang),
        day: Number(result.testing_day || test.testing_days || 0),
        claim_link: typeof window.buildExternalClaimStartLink === 'function'
            ? window.buildExternalClaimStartLink(test.external_package_name || test.package || '', test.external_guest_app_id)
            : '',
    }, lang);
    copyTextWithToast(proofText, 'externalTrackCopied');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    openTelegramPrefilledMessage(cleanUsername, proofText);
}

function getExternalProjectTest(testId) {
    return (Array.isArray(myTests) ? myTests : []).find(function(item) {
        return Number(item.id) === Number(testId || 0) && !!item.is_external;
    }) || null;
}

async function sendExternalDailyCheckinFromUi(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(testId);
    if (!test || typeof window.submitExternalDailyCheckin !== 'function') return;

    var result = await window.submitExternalDailyCheckin(test.progress_id, test.id);
    if (!result) return null;

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    var modal = document.getElementById('project-details-modal');
    if (modal && modal.classList.contains('active') && String(modal.dataset.appId || '') === String(test.id)) {
        openProjectDetailsModal(test.id);
    }
    return result;
}

async function submitExternalGuestActivityFromUi(testId) {
    var test = getExternalProjectTest(testId);
    if (!test) return null;

    if (!isExternalControlDayDue(test)) {
        return sendExternalDailyCheckinFromUi(testId);
    }
    if (typeof window.submitExternalTrackingProof !== 'function') return null;

    var result = await window.submitExternalTrackingProof(test.progress_id, test.id);
    if (!result) return null;

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    var modal = document.getElementById('project-details-modal');
    if (modal && modal.classList.contains('active') && String(modal.dataset.appId || '') === String(test.id)) {
        openProjectDetailsModal(test.id);
    }
    return result;
}

async function sendExternalScreenshotAndConfirmFromUi(testId, ownerUsername, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(testId);
    if (!test) return;

    var cleanOwnerUsername = String(ownerUsername || test.owner_username || '').trim().replace(/^@+/, '');
    if (!cleanOwnerUsername) {
        showToast(window.t('externalProjectOwnerMissing', {}, lang));
        return;
    }

    var result = await submitExternalGuestActivityFromUi(testId);
    if (!result) return;

    var messageText = window.t('externalProjectScreenshotMessageTemplate', getExternalProjectOwnerMessageParams(test), lang);
    copyTextWithToast(messageText, 'externalTrackCopied');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    openTelegramPrefilledMessage(cleanOwnerUsername, messageText);
}

function getExternalProjectOwnerMessageParams(test) {
    var rawAppName = String(test && test.name || '').trim();
    var packageName = String(test && (test.package || test.external_package_name) || '').trim();
    var fallbackName = window.t('unknownLabel', {}, lang);
    var appNameDisplay = rawAppName || packageName || fallbackName;

    if (rawAppName && packageName && rawAppName.toLowerCase() !== packageName.toLowerCase()) {
        appNameDisplay = rawAppName + ' (' + packageName + ')';
    } else if (packageName) {
        appNameDisplay = packageName;
    }

    return {
        app_name_display: appNameDisplay,
        package_name: packageName || appNameDisplay,
        day: getExternalCurrentTestingDay(test),
        claim_link: typeof window.buildExternalClaimStartLink === 'function'
            ? window.buildExternalClaimStartLink(packageName, test.external_guest_app_id)
            : '',
    };
}

async function sendExternalBugReportFromUi(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(testId);
    if (!test) return;

    var cleanOwnerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    if (!cleanOwnerUsername) {
        showToast(window.t('externalProjectOwnerMissing', {}, lang));
        return;
    }

    var result = await submitExternalGuestActivityFromUi(testId);
    if (!result) return;

    var messageText = window.t('externalProjectBugReportMessageTemplate', getExternalProjectOwnerMessageParams(test), lang);
    copyTextWithToast(messageText, 'externalTrackCopied');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    openTelegramPrefilledMessage(cleanOwnerUsername, messageText);
}

function inviteExternalProjectOwnerToPlatform(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(testId);
    if (!test) return;

    var cleanOwnerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    if (!cleanOwnerUsername) {
        showToast(window.t('externalProjectOwnerMissing', {}, lang));
        return;
    }

    var messageText = window.t('externalProjectInvitePlatformMessage', {
        app_name: test.name || window.t('unknownLabel', {}, lang),
        claim_link: typeof window.buildExternalClaimStartLink === 'function'
            ? window.buildExternalClaimStartLink(test.external_package_name || test.package || '', test.external_guest_app_id)
            : '',
    }, lang);
    copyTextWithToast(messageText, 'externalTrackCopied');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    openTelegramPrefilledMessage(cleanOwnerUsername, messageText);
}

function cancelExternalTestingFromUi(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    openGuestLinkRemoveModalFromTest(testId, event);
}

function renderExternalProjectDetailsModal(test, body) {
    var safeName = window.escapeHTML(test.name || test.package || window.t('unknownLabel', {}, lang));
    var safePackage = window.escapeHTML(test.package || test.external_package_name || '');
    var safePackageInline = escapeInlineJsString(test.package || test.external_package_name || '');
    var cleanOwnerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    var canEditGuestProject = Number(test.added_by_tester_id || 0) === Number(userId || 0);
    var editButtonLabel = window.t('guestProjectEditBtn', {}, lang);
    var ownerLabel = cleanOwnerUsername
        ? '@' + cleanOwnerUsername
        : window.t('externalProjectOwnerMissing', {}, lang);
    var statusMeta = getExternalStatusPresentation(test);
    var currentDay = getExternalDisplayTestingDay(test);
    var playUrl = getExternalTrackPlayUrl(test);
    var safePlayUrl = escapeInlineJsString(playUrl);
    var groupUrl = String(test.google_group_url || '').trim();
    var safeGroupUrl = escapeInlineJsString(groupUrl);
    var isDoneToday = statusMeta.isDoneToday;
    var isControlDayDue = isExternalControlDayDue(test);
    var isContinuedExternal = isExternalContinueModeEnabled(test);
    var showPost14Choice = statusMeta.isPostControlWindow && !isContinuedExternal && !isDoneToday;
    var originChipHtml = shouldShowGuestOriginChip(test) ? renderGuestOriginChip(test.external_source) : '';
    var primaryActionDisabled = !!isDoneToday;
    var primaryActionLabel = isDoneToday
        ? window.t('externalProjectCheckedTodayBtn', {}, lang)
        : (statusMeta.isPostControlWindow && !isContinuedExternal
            ? window.t('externalProjectContinueBtn', {}, lang)
            : (isControlDayDue
            ? window.t('externalTrackProofBtn', {}, lang)
            : window.t('externalProjectCheckinBtn', {}, lang)));
    var primaryActionClick = statusMeta.isPostControlWindow && !isContinuedExternal
        ? `activateExternalContinueModeFromUi(${Number(test.id || 0)}, event)`
        : (isControlDayDue
        ? `sendExternalTrackingProofFromUi(${Number(test.id || 0)}, '${escapeInlineJsString(cleanOwnerUsername)}', event)`
        : `sendExternalDailyCheckinFromUi(${Number(test.id || 0)}, event)`);
    var attachButtonHtml = statusMeta.isPostControlWindow && !isContinuedExternal
        ? ''
        : `<button class="btn external-tests-attach-btn split-btn-options" onclick="openExternalCheckinOptionsModal(${Number(test.id || 0)}, '${escapeInlineJsString(cleanOwnerUsername)}', event)" aria-label="${window.escapeHTML(window.t('externalProjectAttachmentAria', {}, lang))}" ${primaryActionDisabled ? 'disabled' : ''}>${window.escapeHTML(window.t('externalProjectAttachmentBtn', {}, lang))}</button>`;
    var primaryActionsHtml = showPost14Choice
        ? renderExternalPost14ChoiceBlock(test)
        : `<div class="action-row external-tests-actions external-tests-actions--detail" style="margin-top: 0; margin-bottom: 8px;">
                <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="event.stopPropagation(); openExternalAppLink('${safePlayUrl}', event)">
                    ${window.escapeHTML(window.t('externalProjectOpenPlayBtn', {}, lang))}
                </button>
                <div class="${statusMeta.isPostControlWindow && !isContinuedExternal ? 'external-tests-confirm-group' : 'split-btn-group external-tests-confirm-group'}" onclick="event.stopPropagation();">
                    <button class="${getExternalConfirmButtonClasses(test, !(statusMeta.isPostControlWindow && !isContinuedExternal))}" ${primaryActionDisabled ? 'disabled' : ''} onclick="${primaryActionClick}">
                        ${window.escapeHTML(primaryActionLabel)}
                    </button>
                    ${attachButtonHtml}
                </div>
            </div>`;
    var groupBlockHtml = groupUrl
        ? '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('detailGoogleGroup', {}, lang)) + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div class="notranslate" style="flex:1;font-size:13px;color:var(--link-color);cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" onclick="event.stopPropagation(); tg.openLink(\'' + safeGroupUrl + '\')">' + window.escapeHTML(groupUrl) + '</div>' +
                '<button class="btn-icon" style="width:32px;height:32px;font-size:14px;border-radius:8px;flex-shrink:0;" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + safeGroupUrl + '\');if(tg.HapticFeedback)tg.HapticFeedback.notificationOccurred(\'success\');showToast(\'' + escapeInlineJsString(window.t('detailGoogleGroupCopied', {}, lang)) + '\')">📋</button>' +
            '</div>' +
        '</div>'
        : '';

    body.innerHTML = `
        <div class="card-header card-header--with-action" style="margin-bottom: 14px;">
            ${renderIcon(test.name || test.package || window.t('unknownLabel', {}, lang), test.icon_url)}
            <div class="card-info card-info--grow">
                <div class="card-title notranslate">${safeName}</div>
                <div class="card-subtitle notranslate">${safePackage}</div>
            </div>
            ${canEditGuestProject ? `<button type="button" class="guest-project-edit-btn" onclick="openEditGuestProjectModal(${Number(test.id || 0)}, event)" aria-label="${window.escapeHTML(editButtonLabel)}" title="${window.escapeHTML(editButtonLabel)}">✏️</button>` : ''}
        </div>
        <div class="details-block">
            <div class="detail-section-title">${window.escapeHTML(window.t('externalProjectDetailTitle', {}, lang))}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">${originChipHtml}</div>
            <div class="guest-tester-detail-line">${window.escapeHTML(window.t('externalProjectDayProgress', { day: currentDay }, lang))}</div>
            <div class="guest-tester-detail-line notranslate">${window.escapeHTML(ownerLabel)}</div>
            ${showPost14Choice ? '' : `<div class="guest-tester-detail-line">${window.escapeHTML(statusMeta.statusText)}</div>`}
            ${showPost14Choice || !statusMeta.substatusText ? '' : `<div class="guest-tester-detail-line">${window.escapeHTML(statusMeta.substatusText)}</div>`}
            <div class="guest-tester-detail-line">${window.escapeHTML(window.t('externalProjectNoEconomyNote', {}, lang))}</div>
        </div>
        ${groupBlockHtml}
        <div class="details-block">
            ${primaryActionsHtml}
            <div class="action-row" style="margin-top: 0; margin-bottom: 8px;">
                <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="sendExternalBugReportFromUi(${Number(test.id || 0)}, event)" ${cleanOwnerUsername ? '' : 'disabled'}>
                    ${window.escapeHTML(window.t('externalProjectReportBugBtn', {}, lang))}
                </button>
                <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="return openTelegramProfile('${escapeInlineJsString(cleanOwnerUsername)}', event)" ${cleanOwnerUsername ? '' : 'disabled'}>
                    ${window.escapeHTML(window.t('externalProjectContactOwnerBtn', {}, lang))}
                </button>
            </div>
            <button class="btn" style="width: 100%; margin-bottom: 8px;" onclick="inviteExternalProjectOwnerToPlatform(${Number(test.id || 0)}, event)" ${cleanOwnerUsername ? '' : 'disabled'}>
                ${window.escapeHTML(window.t('externalProjectInvitePlatformBtn', {}, lang))}
            </button>
            <button class="btn" style="width: 100%; background-color: rgba(255, 59, 48, 0.12); color: #ff6b63; border: 1px solid rgba(255, 59, 48, 0.32);" onclick="cancelExternalTestingFromUi(${Number(test.id || 0)}, event)">
                ${window.escapeHTML(window.t('guestLinkRemoveBtn', {}, lang))}
            </button>
        </div>
        <button class="btn btn-secondary" style="width: 100%; margin-top: 8px; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="closeProjectDetailsModal()">
            ${window.escapeHTML(window.t('inviteClose', {}, lang))}
        </button>
    `;
}

function switchMarketSubTab(tab) {
    const panels = {
        seeking: document.getElementById('market-subtab-seeking'),
        bounty: document.getElementById('market-subtab-bounty'),
        prelaunch: document.getElementById('market-subtab-prelaunch'),
    };
    const btns = {
        seeking: document.getElementById('market-sub-seeking'),
        bounty: document.getElementById('market-sub-bounty'),
        prelaunch: document.getElementById('market-sub-prelaunch'),
    };
    const descs = {
        seeking: document.getElementById('market-seeking-desc'),
        bounty: document.getElementById('market-bounty-desc'),
        prelaunch: document.getElementById('market-prelaunch-desc'),
    };
    for (const key of Object.keys(panels)) {
        const active = key === tab;
        if (panels[key]) panels[key].style.display = active ? '' : 'none';
        if (btns[key]) btns[key].classList.toggle('active', active);
        if (descs[key]) descs[key].style.display = active ? '' : 'none';
    }
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function renderBountyFeed(force) {
    if (!force && !isTabVisible('market')) return;
    const bountyEl = document.getElementById('bounty-list');
    if (!bountyEl) return;
    const isLoading = !!(window._marketInFlight && (window._marketInFlight.bounty));
    const feedState = window.getMarketFeedState ? window.getMarketFeedState('bounty') : { confirmedEmpty: false };
    if (!bountyContracts.length) {
        if (isLoading || !feedState.confirmedEmpty) {
            if (window._marketForceSkeleton) showSkeleton('bounty-list');
            else showMarketLoading('bounty-list');
        } else bountyEl.innerHTML = `<p class="no-testers" style="margin-top: 10px;">${t.bountyEmpty}</p>`;
        return;
    }
    bountyEl.innerHTML = bountyContracts.map((item) => renderFeedCard(item, 'bounty')).join('');
}

function toggleDetailsWithAnimation(detailsEl) {
    if (!detailsEl || detailsEl.dataset.animating === '1') return;
    const summary = detailsEl.querySelector(':scope > summary');
    if (!summary) return;

    const startHeight = detailsEl.offsetHeight;
    const isOpen = detailsEl.open;
    if (!isOpen) {
        detailsEl.open = true;
    }
    const endHeight = isOpen ? summary.offsetHeight : detailsEl.offsetHeight;

    detailsEl.dataset.animating = '1';
    detailsEl.style.overflow = 'hidden';
    detailsEl.style.height = `${startHeight}px`;

    const animation = detailsEl.animate(
        [{ height: `${startHeight}px` }, { height: `${endHeight}px` }],
        { duration: 220, easing: 'ease' }
    );

    animation.onfinish = () => {
        if (isOpen) {
            detailsEl.open = false;
        }
        detailsEl.style.height = '';
        detailsEl.style.overflow = '';
        detailsEl.dataset.animating = '0';
    };
}

function calculateReliability(expected, actual) {
    if (expected < 42) {
        return { text: t.reliabilityNewbie, percent: null, color: 'var(--hint-color)' };
    }
    const percent = Math.round((actual / expected) * 100);
    if (percent >= 95) return { text: t.reliabilityExcellent, percent, color: '#34c759' };
    if (percent >= 80) return { text: t.reliabilityGood, percent, color: '#ffcc00' };
    if (percent >= 65) return { text: t.reliabilityRisky, percent, color: '#ff9500' };
    return { text: t.reliabilityUnreliable, percent, color: '#ff3b30' };
}

function pluralizeTestWord(count) {
    const value = Math.abs(Number(count) || 0);
    if (lang !== 'ru') return window.t(value === 1 ? 'countTestWord_one' : 'countTestWord_many', {}, lang);
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return window.t('countTestWord_one', {}, lang);
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return window.t('countTestWord_few', {}, lang);
    return window.t('countTestWord_many', {}, lang);
}

function pluralizeGrantWord(count) {
    const value = Math.abs(Number(count) || 0);
    if (lang !== 'ru') return window.t(value === 1 ? 'countGrantWord_one' : 'countGrantWord_many', {}, lang);
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return window.t('countGrantWord_one', {}, lang);
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return window.t('countGrantWord_few', {}, lang);
    return window.t('countGrantWord_many', {}, lang);
}

function formatDeveloperAchievements(completedTests, goldenCount, totalGrants) {
    const testsWord = pluralizeTestWord(completedTests);
    if (totalGrants > 0 && goldenCount > 0) {
        return window.t('developerAchievementsWithGrantFull', {
            tests_count: completedTests,
            tests_word: testsWord,
            grants_count: totalGrants,
            grants_word: pluralizeGrantWord(totalGrants),
            golden_count: goldenCount,
            golden_word: pluralizeGrantWord(goldenCount),
            grant_tag: window.t('developerGrantTag', {}, lang)
        }, lang);
    }
    if (totalGrants > 0) {
        return window.t('developerAchievementsWithGrant', {
            tests_count: completedTests,
            tests_word: testsWord,
            grants_count: totalGrants,
            grants_word: pluralizeGrantWord(totalGrants)
        }, lang);
    }
    return window.t('developerAchievementsNoGrant', {
        tests_count: completedTests,
        tests_word: testsWord
    }, lang);
}

function buildProjectFeedbackBadge(feedbackTotalCount, feedbackNewCount) {
    const totalCount = Number(feedbackTotalCount || 0);
    const newCount = Number(feedbackNewCount || 0);
    if (newCount > 0) return ' <span class="feedback-btn-badge">' + window.escapeHTML(String(newCount)) + '</span>';
    if (totalCount > 0) return ' <span class="feedback-btn-badge feedback-btn-badge-total">' + window.escapeHTML(String(totalCount)) + '</span>';
    return '';
}

function buildProjectFeedbackButton(projectId, feedbackTotalCount, feedbackNewCount, isArchived, extraStyle) {
    const totalCount = Number(feedbackTotalCount || 0);
    const newCount = Number(feedbackNewCount || 0);
    const accentClass = newCount > 0 ? ' btn-feedback-alert' : '';
    const badgeHtml = buildProjectFeedbackBadge(totalCount, newCount);
    const baseStyle = 'width: 100%; margin-bottom: 8px; background-color: rgba(10, 132, 255, 0.12); color: var(--text-color); border: 1px solid rgba(10, 132, 255, 0.22);';
    return '<button class="btn btn-secondary project-feedback-btn' + accentClass + '" style="' + (extraStyle || baseStyle) + '" onclick="openProjectFeedback(' + projectId + ', ' + (isArchived ? 'true' : 'false') + ')">' +
        '<span class="project-feedback-btn-inner">' + window.escapeHTML(window.t('projectFeedbackButtonShort', {}, lang)) + badgeHtml + '</span>' +
    '</button>';
}

function formatCompactSyncLabel(project) {
    var currentGoogleDay = getProjectCurrentGoogleDay(project, 0);
    var day = Math.max(1, currentGoogleDay || 1);
    return window.t('syncDayProgress', { day: day }, lang);
}

function buildTesterReminderDeepLink(appId) {
    var botUsername = String((window.App && window.App.botUsername) || window.__BOT_USERNAME__ || 'Android12TestersBot').trim().replace(/^@+/, '');
    var webappShortname = String((window.App && window.App.webappShortname) || 'app').trim().replace(/^\/+|\/+$/g, '');
    return 'https://t.me/' + botUsername + '/' + webappShortname + '?startapp=test_' + Number(appId || 0);
}

function showScreenshotCompleteModal(ownerUsername) {
    const actionEl = document.getElementById('screenshot-complete-action');
    const titleEl = document.getElementById('t-screenshotCompleteTitle');
    const textEl = document.getElementById('t-screenshotCompleteText');
    const closeEl = document.getElementById('t-screenshotCompleteClose');
    if (titleEl) {
        titleEl.innerText = t.screenshotCompleteTitle || t.screenshotReminderTitle;
    }
    if (textEl) {
        textEl.innerText = t.screenshotCompleteText || t.screenshotReminderText;
    }
    if (closeEl) {
        closeEl.innerText = t.screenshotCompleteClose || t.btnClose;
    }
    if (ownerUsername) {
        const safe = escapeInlineJsString(ownerUsername || '');
        actionEl.innerHTML = `<button class="btn" style="width: 100%; background-color: var(--button-color, #007aff); color: var(--button-text-color, #fff); border: none; margin-bottom: 8px;" onclick="openTelegramProfile('${safe}', event); closeScreenshotCompleteModal();">${t.screenshotReminderBtn}</button>`;
    } else {
        actionEl.innerHTML = '';
    }
    document.getElementById('screenshot-complete-modal').classList.add('active');
}

function closeScreenshotCompleteModal(event) {
    if (event && event.target !== document.getElementById('screenshot-complete-modal')) return;
    document.getElementById('screenshot-complete-modal').classList.remove('active');
}

function openScreenshotGuardModal(appId, ownerUsername) {
    window._screenshotGuardAppId = appId;
    window._screenshotGuardOwner = ownerUsername || '';
    const modal = document.getElementById('screenshot-guard-modal');
    if (!modal) {
        openReportModal(appId, ownerUsername || '');
        return;
    }
    const title = document.getElementById('t-screenshotGuardTitle');
    const yesBtn = document.getElementById('t-screenshotGuardYes');
    const cancelBtn = document.getElementById('t-screenshotGuardCancel');
    if (title) title.innerText = window.t('screenshotGuardTitle', {}, lang);
    if (yesBtn) yesBtn.innerText = window.t('screenshotGuardYes', {}, lang);
    if (cancelBtn) cancelBtn.innerText = window.t('screenshotGuardCancel', {}, lang);
    modal.classList.add('active');
}

function closeScreenshotGuardModal(event) {
    const modal = document.getElementById('screenshot-guard-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
}

function confirmScreenshotGuard() {
    const appId = window._screenshotGuardAppId;
    const owner = window._screenshotGuardOwner || '';
    closeScreenshotGuardModal();
    openReportModal(appId, owner);
}

// === CHECKIN OPTIONS MODAL ===
var _checkinOptionsAppId = null;
var _checkinOptionsOwner = '';
var _checkinOptionsIsControlDay = false;
var _checkinOptionsFlow = 'regular';
var _playReviewModalAppId = null;

function renderCheckinReviewOptions() {
    var mount = document.getElementById('checkin-review-options');
    if (!mount) return;
    if (_checkinOptionsFlow === 'external') {
        mount.innerHTML = '';
        mount.style.display = 'none';
        return;
    }
    var test = typeof window.getMyTestById === 'function' ? window.getMyTestById(_checkinOptionsAppId) : null;
    var canToggle = _checkinOptionsIsControlDay && typeof window.canPromptPlayReview === 'function'
        ? window.canPromptPlayReview(test)
        : false;
    var isMarked = typeof window.isPlayReviewMarked === 'function' ? window.isPlayReviewMarked(test) : false;
    var reviewRejected = !!(test && test.rewards_summary && test.rewards_summary.review_rejected);
    if (!canToggle && !isMarked) {
        mount.innerHTML = '';
        mount.style.display = 'none';
        return;
    }
    var reviewUrl = typeof window.getPlayReviewUrl === 'function' ? window.getPlayReviewUrl(test.id) : '';
    mount.style.display = 'block';
    mount.innerHTML = `
        <div class="details-block" style="margin: 0;">
            <div class="detail-section-title">${window.escapeHTML(window.t('playReviewCheckinTitle', {}, lang))}</div>
            <div style="font-size: 13px; line-height: 1.6; color: var(--text-color); margin-bottom: 10px;">${window.escapeHTML(window.t('playReviewCheckinHint', {}, lang))}</div>
            <button type="button" class="btn btn-secondary" style="width: 100%;" onclick="checkinOptionsOpenReviewStore(event)" ${reviewUrl ? '' : 'disabled'}>
                ${window.escapeHTML(window.t('playReviewOpenStoreBtn', {}, lang))}
            </button>
            <label class="review-checkbox-row" style="margin-top: 10px;">
                <input type="checkbox" ${isMarked ? 'checked' : ''} onchange="toggleCheckinReviewCheckbox(this)">
                <span>${window.escapeHTML(window.t('playReviewCheckboxLabel', {}, lang))}</span>
            </label>
            <div style="font-size: 12px; color: var(--hint-color); margin-top: 6px;">${window.escapeHTML(window.t('playReviewRequiresScreenshotHint', {}, lang))}</div>
            ${isMarked ? `<div style="font-size: 12px; color: #34c759; margin-top: 4px;">${window.escapeHTML(window.t('playReviewMarked', {}, lang))}</div>` : ''}
            ${reviewRejected ? `<div style="font-size: 12px; color: #ff6b6b; margin-top: 4px;">${window.escapeHTML(window.t('playReviewRejectedWarning', {}, lang))}</div>` : ''}
        </div>
    `;
}

function renderPlayReviewModal() {
    var body = document.getElementById('play-review-modal-body');
    if (!body) return;
    var test = typeof window.getMyTestById === 'function' ? window.getMyTestById(_playReviewModalAppId) : null;
    if (!test) {
        body.innerHTML = `<div class="feedback-empty">${window.escapeHTML(window.t('unexpectedError', {}, lang))}</div>`;
        return;
    }
    var isMarked = typeof window.isPlayReviewMarked === 'function' ? window.isPlayReviewMarked(test) : false;
    var reviewRejected = !!(test.rewards_summary && test.rewards_summary.review_rejected);
    var reviewUrl = typeof window.getPlayReviewUrl === 'function' ? window.getPlayReviewUrl(test.id) : '';
    var safeAppName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
    body.innerHTML = `
        <div class="review-modal-card">
            <div class="review-modal-title">⭐ ${window.escapeHTML(window.t('playReviewModalTitle', {}, lang))}</div>
            <div class="review-modal-app">${safeAppName}</div>
            <div class="review-modal-text">${window.escapeHTML(window.t('playReviewModalText', {}, lang))}</div>
            <div class="review-modal-note">${window.escapeHTML(window.t('playReviewConfirmPenalty', {}, lang))}</div>
            <label class="review-checkbox-row review-checkbox-row-modal">
                <input id="play-review-modal-checkbox" type="checkbox" ${isMarked ? 'checked' : ''} onchange="togglePlayReviewModalCheckbox(this)">
                <span>${window.escapeHTML(window.t('playReviewCheckboxLabel', {}, lang))}</span>
            </label>
            <div style="font-size: 12px; color: var(--hint-color); margin-top: 4px;">${window.escapeHTML(window.t('playReviewRequiresScreenshotHint', {}, lang))}</div>
            ${reviewRejected ? `<div style="font-size: 12px; color: #ff6b6b; margin-top: 6px;">${window.escapeHTML(window.t('playReviewRejectedWarning', {}, lang))}</div>` : ''}
            <button type="button" class="btn" onclick="openPlayReviewStore()" ${reviewUrl ? '' : 'disabled'}>
                ${window.escapeHTML(window.t('playReviewOpenStoreBtn', {}, lang))}
            </button>
        </div>
    `;
}

function openCheckinOptionsModal(appId, ownerUsername) {
    _checkinOptionsAppId = appId;
    _checkinOptionsOwner = ownerUsername || '';
    _checkinOptionsFlow = 'regular';
    var test = typeof window.getMyTestById === 'function' ? window.getMyTestById(appId) : null;
    var testingDay = test ? getResolvedTestingDay(test) : null;
    _checkinOptionsIsControlDay = !!(testingDay && isMandatoryScreenshotDay(testingDay));
    if (_checkinOptionsIsControlDay && isScreenshotOnlyControlDay(testingDay)) {
        handleScreenshotAndConfirm(appId, ownerUsername || '');
        return;
    }
    const modal = document.getElementById('checkin-options-modal');
    if (!modal) return;
    const titleEl = document.getElementById('t-checkinOptionsTitle');
    const subtitleEl = document.getElementById('t-checkinOptionsSubtitle');
    const screenshotBtn = document.getElementById('t-checkinOptionsSendScreenshot');
    const ideaBtn = document.getElementById('t-checkinOptionsSendIdea');
    const confirmBtn = document.getElementById('t-checkinOptionsJustConfirm');
    if (titleEl) titleEl.innerText = window.t(_checkinOptionsIsControlDay ? 'controlDayCheckinTitle' : 'checkinOptionsTitle', {}, lang);
    if (subtitleEl) subtitleEl.innerText = window.t(_checkinOptionsIsControlDay ? 'controlDayCheckinSubtitle' : 'checkinOptionsSubtitle', {}, lang);
    if (screenshotBtn) screenshotBtn.innerText = window.t('checkinOptionsSendScreenshot', {}, lang);
    if (ideaBtn) ideaBtn.innerText = window.t('checkinOptionsSendIdea', {}, lang);
    if (confirmBtn) {
        confirmBtn.innerText = window.t('checkinOptionsJustConfirm', {}, lang);
        confirmBtn.style.display = _checkinOptionsIsControlDay ? 'none' : 'block';
    }
    renderCheckinReviewOptions();
    modal.classList.add('active');
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function openExternalCheckinOptionsModal(appId, ownerUsername, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(appId);
    _checkinOptionsAppId = appId;
    _checkinOptionsOwner = ownerUsername || '';
    _checkinOptionsIsControlDay = !!(test && isExternalControlDayDue(test));
    _checkinOptionsFlow = 'external';
    const modal = document.getElementById('checkin-options-modal');
    if (!modal) return;
    const titleEl = document.getElementById('t-checkinOptionsTitle');
    const subtitleEl = document.getElementById('t-checkinOptionsSubtitle');
    const screenshotBtn = document.getElementById('t-checkinOptionsSendScreenshot');
    const ideaBtn = document.getElementById('t-checkinOptionsSendIdea');
    const confirmBtn = document.getElementById('t-checkinOptionsJustConfirm');
    if (titleEl) titleEl.innerText = window.t(_checkinOptionsIsControlDay ? 'controlDayCheckinTitle' : 'checkinOptionsTitle', {}, lang);
    if (subtitleEl) subtitleEl.innerText = window.t(_checkinOptionsIsControlDay ? 'controlDayCheckinSubtitle' : 'checkinOptionsSubtitle', {}, lang);
    if (screenshotBtn) screenshotBtn.innerText = window.t('checkinOptionsSendScreenshot', {}, lang);
    if (ideaBtn) ideaBtn.innerText = window.t('checkinOptionsSendIdea', {}, lang);
    if (confirmBtn) {
        confirmBtn.innerText = window.t('checkinOptionsJustConfirm', {}, lang);
        confirmBtn.style.display = _checkinOptionsIsControlDay ? 'none' : 'block';
    }
    renderCheckinReviewOptions();
    modal.classList.add('active');
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function closeCheckinOptionsModal(event) {
    const modal = document.getElementById('checkin-options-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _checkinOptionsFlow = 'regular';
}

function _closeCheckinOptionsModalImmediate() {
    const modal = document.getElementById('checkin-options-modal');
    if (modal) modal.classList.remove('active');
    _checkinOptionsFlow = 'regular';
}

function checkinOptionsScreenshot() {
    const appId = _checkinOptionsAppId;
    const owner = _checkinOptionsOwner;
    const flow = _checkinOptionsFlow;
    _closeCheckinOptionsModalImmediate();
    if (appId == null) return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    if (flow === 'external') {
        sendExternalScreenshotAndConfirmFromUi(appId, owner);
        return;
    }
    sendCheckpointScreenshotAndConfirm(appId, owner);
}

function checkinOptionsIdea() {
    const appId = _checkinOptionsAppId;
    const flow = _checkinOptionsFlow;
    var test = typeof window.getMyTestById === 'function' ? window.getMyTestById(appId) : null;
    var testingDay = test && typeof window.getUserTestingDay === 'function' ? window.getUserTestingDay(test.start_date) : null;
    var localDate = typeof getLocalDate === 'function' ? getLocalDate() : '';
    var checkinContext = _checkinOptionsIsControlDay && testingDay && localDate
        ? { day: Number(testingDay), local_date: localDate }
        : null;
    if (flow !== 'external' && checkinContext) {
        markTestFeedbackCheckinPending(appId);
    }
    _closeCheckinOptionsModalImmediate();
    if (appId == null) return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    if (flow === 'external') {
        sendExternalBugReportFromUi(appId);
        return;
    }
    initiateProjectFeedback(appId, checkinContext ? { checkinContext: checkinContext } : null);
}

function checkinOptionsConfirm() {
    const appId = _checkinOptionsAppId;
    const flow = _checkinOptionsFlow;
    _closeCheckinOptionsModalImmediate();
    if (appId == null) return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    if (flow === 'external') {
        sendExternalDailyCheckinFromUi(appId);
        return;
    }
    if (typeof confirmStart === 'function') confirmStart(appId);
}

function checkinOptionsOpenReviewStore(event) {
    if (_checkinOptionsAppId == null) return false;
    return openPlayReviewStoreByAppId(_checkinOptionsAppId, event);
}

async function toggleCheckinReviewCheckbox(input) {
    if (!_checkinOptionsAppId || typeof window.setPlayReviewSubmittedPending !== 'function') return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    var normalized = !!(input && input.checked);
    var marked = await window.setPlayReviewSubmittedPending(_checkinOptionsAppId, normalized);
    renderCheckinReviewOptions();
    if (!marked || !normalized) return;
    _closeCheckinOptionsModalImmediate();
    if (typeof confirmStart === 'function') confirmStart(_checkinOptionsAppId);
}

async function togglePlayReviewModalCheckbox(input) {
    if (!_playReviewModalAppId || typeof window.setPlayReviewSubmittedPending !== 'function') return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    await window.setPlayReviewSubmittedPending(_playReviewModalAppId, !!(input && input.checked));
}

async function toggleProjectDetailsReviewCheckbox(input, appId) {
    if (!appId || typeof window.setPlayReviewSubmittedPending !== 'function') return;
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    await window.setPlayReviewSubmittedPending(appId, !!(input && input.checked));
}

function openPlayReviewModal(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    _playReviewModalAppId = appId;
    renderPlayReviewModal();
    var modal = document.getElementById('play-review-modal');
    if (modal) modal.classList.add('active');
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function openPlayReviewModalFromCheckinOptions(event) {
    if (_checkinOptionsAppId == null) return;
    openPlayReviewModal(_checkinOptionsAppId, event);
}

function closePlayReviewModal(event) {
    if (event && event.target !== document.getElementById('play-review-modal')) return;
    var modal = document.getElementById('play-review-modal');
    if (modal) modal.classList.remove('active');
}

function openPlayReviewStore() {
    if (_playReviewModalAppId == null || typeof window.getPlayReviewUrl !== 'function') return;
    var url = window.getPlayReviewUrl(_playReviewModalAppId);
    if (!url) {
        if (window.tg && typeof window.tg.showAlert === 'function') {
            window.tg.showAlert(window.t('playReviewMissingLink', {}, lang));
        } else {
            alert(window.t('playReviewMissingLink', {}, lang));
        }
        return;
    }
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('medium');
    if (window.tg && typeof window.tg.openLink === 'function') {
        window.tg.openLink(url);
        return;
    }
    window.open(url, '_blank', 'noopener');
}

function openPlayReviewStoreByAppId(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (typeof window.getPlayReviewUrl !== 'function') return false;
    var url = window.getPlayReviewUrl(appId);
    if (!url) {
        if (window.tg && typeof window.tg.showAlert === 'function') {
            window.tg.showAlert(window.t('playReviewMissingLink', {}, lang));
        } else {
            alert(window.t('playReviewMissingLink', {}, lang));
        }
        return false;
    }
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    if (window.tg && typeof window.tg.openLink === 'function') {
        window.tg.openLink(url);
        return true;
    }
    window.open(url, '_blank', 'noopener');
    return true;
}

function openIssueReportModal(appId) {
    _issueReportAppId = appId;
    const modal = document.getElementById('issue-report-modal');
    if (!modal) return;
    const title = document.getElementById('t-issueReportTitle');
    const hint = document.getElementById('t-issueReportHint');
    const sendBtn = document.getElementById('t-issueReportSend');
    const cancelBtn = document.getElementById('t-issueReportCancel');
    const emailInput = document.getElementById('issue-report-email');
    if (title) title.innerText = window.t('reportIssueModalTitle', {}, lang);
    if (hint) hint.innerText = window.t('reportIssueModalInfo', {}, lang);
    if (sendBtn) sendBtn.innerText = window.t('reportIssueSendBtn', {}, lang);
    if (cancelBtn) cancelBtn.innerText = window.t('reportIssueCancelBtn', {}, lang);
    if (emailInput) {
        const appState = window.App && typeof window.App.getState === 'function' ? window.App.getState() : {};
        emailInput.value = String(appState && appState.userEmail || window.App.userEmail || '').trim();
        emailInput.placeholder = window.t('reportIssueEmailPlaceholder', {}, lang);
    }
    const textarea = document.getElementById('issue-report-text');
    if (textarea) {
        textarea.value = '';
        textarea.placeholder = window.t('reportIssueCommentPlaceholder', {}, lang);
    }
    modal.classList.add('active');
}

function closeIssueReportModal(event) {
    const modal = document.getElementById('issue-report-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _issueReportAppId = null;
}

function submitIssueReportFromModal() {
    if (!_issueReportAppId) return;
    submitIssueReport(_issueReportAppId);
}

function renderReportLanguageToggle() {
    const toggle = document.getElementById('report-language-toggle');
    if (!toggle) return;
    const selectedLang = typeof window.normalizeGuestInviteLanguage === 'function'
        ? window.normalizeGuestInviteLanguage(_reportMessageLang, lang)
        : (String(_reportMessageLang || lang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en');
    toggle.innerHTML = `
        <div class="report-language-label">${window.escapeHTML(window.t('reportLanguageLabel', {}, lang))}</div>
        <div class="segmented-control" style="margin-bottom: 0;">
            <button type="button" class="seg-btn ${selectedLang === 'ru' ? 'active' : ''}" onclick="setReportMessageLanguage('ru')">${window.escapeHTML(window.t('guestInviteLanguageRu', {}, lang))}</button>
            <button type="button" class="seg-btn ${selectedLang === 'en' ? 'active' : ''}" onclick="setReportMessageLanguage('en')">${window.escapeHTML(window.t('guestInviteLanguageEn', {}, lang))}</button>
        </div>
    `;
}

function updateReportModalPrefill() {
    const textarea = document.getElementById('report-text');
    if (!textarea || !_reportAppId) return;
    textarea.value = typeof window.buildCheckpointReportPrefill === 'function'
        ? window.buildCheckpointReportPrefill(_reportAppId, _reportMessageLang)
        : t.reportPrefill;
}

function setReportMessageLanguage(nextLang) {
    _reportMessageLang = typeof window.normalizeGuestInviteLanguage === 'function'
        ? window.normalizeGuestInviteLanguage(nextLang, _reportMessageLang || lang)
        : (String(nextLang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en');
    renderReportLanguageToggle();
    updateReportModalPrefill();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openReportModal(appId, ownerUsername) {
    _reportAppId = appId;
    _reportOwnerUsername = ownerUsername;
    _reportMessageLang = typeof window.getDefaultCheckpointReportLanguage === 'function'
        ? window.getDefaultCheckpointReportLanguage(appId)
        : (typeof window.normalizeGuestInviteLanguage === 'function' ? window.normalizeGuestInviteLanguage(lang, lang) : lang);
    renderReportLanguageToggle();
    updateReportModalPrefill();
    document.getElementById('t-reportModalTitle').innerText = t.reportModalTitle;
    document.getElementById('t-reportModalHint').innerText = t.reportModalHint;
    document.getElementById('t-reportBtnSend').innerText = t.reportBtnSend;
    const chips = [t.reportChipBug, t.reportChipIdea, t.reportChipGood];
    const chipsEl = document.getElementById('chips-report');
    chipsEl.innerHTML = chips.map((chip) => `<button type="button" class="chip" onclick="insertReportChip(this.dataset.text)" data-text="${chip.replace(/"/g, '&quot;')}">${chip}</button>`).join('');
    document.getElementById('report-modal').classList.add('active');
}

function closeReportModal(event) {
    if (event && event.target !== document.getElementById('report-modal')) return;
    document.getElementById('report-modal').classList.remove('active');
    setTimeout(() => {
        _reportAppId = null;
        _reportOwnerUsername = null;
        _reportMessageLang = null;
    }, 300);
}

function insertReportChip(chipText) {
    const textarea = document.getElementById('report-text');
    if (textarea.value.length > 0 && !textarea.value.endsWith('\n')) {
        textarea.value += '\n';
    }
    textarea.value += chipText + ' ';
    textarea.focus();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openDropTestModal(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    _dropTestAppId = appId;
    document.getElementById('drop-test-modal').classList.add('active');
}

function closeDropTestModal(event) {
    if (event && event.target !== document.getElementById('drop-test-modal')) return;
    document.getElementById('drop-test-modal').classList.remove('active');
    _dropTestAppId = null;
}

async function openLeaveMutualModal(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const modal = document.getElementById('leave-mutual-modal');
    const body = document.getElementById('leave-mutual-body');
    const justifiedBtn = document.getElementById('leave-justified-btn');
    const reasonSelect = document.getElementById('leave-reason-select');
    const reasonOther = document.getElementById('leave-reason-other');
    if (!modal || !body) return;

    _leaveMutualAppId = appId;
    _leaveMutualStats = null;
    if (reasonSelect) reasonSelect.value = 'inactive_partner';
    if (reasonOther) {
        reasonOther.value = '';
        reasonOther.style.display = 'none';
    }
    if (justifiedBtn) justifiedBtn.style.display = 'none';
    body.innerHTML = `<p style="text-align:center; color: var(--hint-color);">${window.escapeHTML(window.t('leaveLoadingStats', {}, lang))}</p>`;
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_BASE}/tests/${appId}/partner_stats/${userId}`);
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            body.innerHTML = `<div class="details-block"><div style="color: var(--hint-color);">${window.escapeHTML(getApiErrorMessage(data, 'stats_not_available'))}</div></div>`;
            return;
        }

        _leaveMutualStats = data;
        const justifiedAllowed = !!data.partner_left || Number(data.partner_skips || 0) >= 3;
        const karmaBurn = Math.min(14, Number(data.my_testing_days || 0)) * 0.1;
        const partnerLabel = data.partner_username
            ? window.t('leavePartnerUsername', { username: (data.partner_username || '').replace('@', '') }, lang)
            : window.t('idLabel', { id: data.partner_id || 0 }, lang);
        const partnerActiveLine = data.partner_left
            ? window.t('leavePartnerLeft', {}, lang)
            : window.t('leavePartnerLastActive', { date: formatLastActiveLabel(data.partner_last_active) }, lang);
        const waitWarning = justifiedAllowed
            ? ''
            : `<div class="details-block" style="border-color: rgba(255,149,0,0.22);"><div style="color:#ff9500; font-size:13px; line-height:1.5;">${window.escapeHTML(window.t('leaveSafeWaitWarning', { count: Math.max(0, 3 - Number(data.partner_skips || 0)) }, lang))}</div></div>`;

        body.innerHTML = '' +
            `<div class="details-block">` +
                `<div class="detail-section-title">${window.escapeHTML(window.t('leavePartnerTitle', {}, lang))}</div>` +
                `<div style="font-size:13px; line-height:1.7; color: var(--text-color);">` +
                    `<div>${window.escapeHTML(partnerLabel)}</div>` +
                    `<div>${window.escapeHTML(window.t('leavePartnerDays', { days: data.partner_testing_days || 0 }, lang))}</div>` +
                    `<div>${window.escapeHTML(window.t('leavePartnerSkips', { skips: data.partner_skips || 0 }, lang))}</div>` +
                    `<div>${window.escapeHTML(partnerActiveLine)}</div>` +
                `</div>` +
            `</div>` +
            `<div class="details-block">` +
                `<div class="detail-section-title">${window.escapeHTML(window.t('leaveMyStatsTitle', {}, lang))}</div>` +
                `<div style="font-size:13px; line-height:1.7; color: var(--text-color);">` +
                    `<div>${window.escapeHTML(window.t('leaveMyDays', { days: data.my_testing_days || 0 }, lang))}</div>` +
                    `<div>${window.escapeHTML(window.t('leaveMySkips', { skips: data.my_skips || 0 }, lang))}</div>` +
                `</div>` +
            `</div>` +
            waitWarning +
            `<div class="details-block" style="border-color: ${justifiedAllowed ? 'rgba(52,199,89,0.22)' : 'rgba(255,59,48,0.22)'};">` +
                `<div class="detail-section-title">${window.escapeHTML(justifiedAllowed ? window.t('leaveJustifiedTitle', {}, lang) : window.t('leaveAbandonedTitle', {}, lang))}</div>` +
                `<div style="font-size:13px; line-height:1.6; color: var(--text-color);">${window.escapeHTML(justifiedAllowed ? window.t('leaveJustifiedDesc', {}, lang) : window.t('leaveAbandonedDesc', { karma: formatUiAmount(karmaBurn, 1) }, lang))}</div>` +
                `${justifiedAllowed ? '' : `<div style="margin-top:8px; font-size:12px; color:#ff9500; line-height:1.5;">${window.escapeHTML(window.t('leaveAbandonedWarning', { karma: formatUiAmount(karmaBurn, 1) }, lang))}</div>`}` +
            `</div>`;

        if (justifiedBtn) justifiedBtn.style.display = justifiedAllowed ? '' : 'none';
    } catch (error) {
        console.error('Leave mutual stats error:', error);
        body.innerHTML = `<div class="details-block"><div style="color: var(--hint-color);">${window.escapeHTML(getApiErrorMessage(error && error.message, 'networkError'))}</div></div>`;
    }
}

function closeLeaveMutualModal(event) {
    const modal = document.getElementById('leave-mutual-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _leaveMutualAppId = null;
    _leaveMutualStats = null;
}

function toggleLeaveReasonOther() {
    const select = document.getElementById('leave-reason-select');
    const other = document.getElementById('leave-reason-other');
    if (!select || !other) return;
    other.style.display = select.value === 'other' ? 'block' : 'none';
    if (select.value !== 'other') {
        other.value = '';
    }
}

function closeEarnBustModal(event) {
    if (event && event.target !== document.getElementById('earn-bust-modal')) return;
    document.getElementById('earn-bust-modal').classList.remove('active');
}

function openSocialModal() {
    document.getElementById('social-link-modal').classList.add('active');
    const input = document.getElementById('social-url-input');
    const button = document.getElementById('send-social-link-btn');
    input.value = '';
    button.disabled = true;
    input.oninput = () => {
        button.disabled = !input.value.trim().startsWith('http');
    };
}

function closeSocialModal(event) {
    if (event && event.target !== document.getElementById('social-link-modal')) return;
    document.getElementById('social-link-modal').classList.remove('active');
}

function openFeedbackModal(typeLabelKey) {
    document.getElementById('feedback-modal').classList.add('active');
    const input = document.getElementById('feedback-text-input');
    const button = document.getElementById('send-feedback-btn');
    const typeLabel = document.getElementById('t-feedbackModalTypeLabel');

    input.value = '';
    button.disabled = true;
    typeLabel.textContent = window.t(typeLabelKey || 'feedbackTypeBug', {}, lang);

    input.oninput = () => {
        button.disabled = input.value.trim().length < 3;
    };
}

function closeFeedbackModal(event) {
    if (event && event.target !== document.getElementById('feedback-modal')) return;
    document.getElementById('feedback-modal').classList.remove('active');
}

function formatFeedbackDate(createdAt) {
    if (!createdAt) return '—';
    const value = new Date(createdAt);
    if (Number.isNaN(value.getTime())) return '—';
    return value.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getProjectFeedbackHeader(project) {
    const safeName = window.escapeHTML((project && (project.name || project.package_name)) || window.t('unknownLabel', {}, lang));
    const totalCount = Number(project && project.feedback_total_count || 0);
    const newCount = Number(project && project.feedback_new_count || 0);
    return `
        <div class="detail-header" style="margin-bottom: 10px;">
            ${renderIcon((project && (project.name || project.package_name)) || '', project && project.icon_url)}
            <div class="card-info">
                <div class="card-title notranslate">${safeName}</div>
                <div class="card-subtitle">${window.escapeHTML(window.t('projectFeedbackTitle', {}, lang))}</div>
            </div>
        </div>
        <div class="feedback-modal-summary">
            <span class="meta-chip accent-blue">💬 ${window.t('projectFeedbackTotalChip', { count: totalCount }, lang)}</span>
            <span class="meta-chip accent-green">🆕 ${window.t('projectFeedbackNewChip', { count: newCount }, lang)}</span>
        </div>
    `;
}

function feedbackOnImageError(imgEl) {
    imgEl.onerror = null;
    imgEl.style.display = 'none';
    const parent = imgEl.parentNode;
    if (parent) {
        parent.classList.add('fb-media-thumb--mock');
        let mock = parent.querySelector('.fb-media-mock');
        if (!mock) {
            mock = document.createElement('div');
            mock.className = 'fb-media-mock';
            mock.innerHTML = '<span class="fb-media-mock-icon">🖼️</span><span class="fb-media-mock-text">' + window.escapeHTML(window.t('projectFeedbackImageUnavailable', {}, lang)) + '</span>';
            parent.appendChild(mock);
        }
    }
}

function feedbackResolveMediaUrl(url) {
    if (!url) return '';
    // If it starts with /telegram-media or telegram-media, resolve absolutely
    if (url.startsWith('/telegram-media') || url.startsWith('telegram-media')) {
        var apiBase = String((window.App && window.App.API_BASE) || window.API_BASE || '');
        apiBase = apiBase.replace(/\/+$/, '');
        var path = url.startsWith('/') ? url : '/' + url;
        return apiBase + path;
    }
    return url;
}

function feedbackScheduleClampMeasure() {
    window.requestAnimationFrame(function() {
        window.requestAnimationFrame(feedbackMeasureClampedText);
    });
}

function feedbackMeasureClampedText() {
    document.querySelectorAll('.fb-text[data-feedback-clamp="1"]').forEach(function(el) {
        var id = el.getAttribute('data-feedback-id');
        var link = id ? document.getElementById('fbtl-' + id) : null;
        if (!link) return;
        var isOverflowing = el.scrollHeight > el.clientHeight + 1;
        link.style.display = isOverflowing ? 'inline-flex' : 'none';
        if (!isOverflowing) {
            el.classList.remove('fb-text--clamped');
        }
    });
}

function renderProjectFeedbackCards(project, items) {
    if (!items || !items.length) {
        return `<div class="feedback-empty">${window.escapeHTML(window.t('projectFeedbackEmpty', {}, lang))}</div>`;
    }
    const projectId = Number(project && (project.id || project.app_id) || 0);

    return `<div class="feedback-list">${items.map(function(item) {
        const feedbackType = String(item.type || 'general').toLowerCase();
        const isReviewTicket = feedbackType.indexOf('google_play_review') === 0;
        const username = (item.tester_username || '').replace('@', '');
        const safeUsername = escapeInlineJsString(username);
        const fullName = window.escapeHTML(item.tester_full_name || '');
        const usernameLabel = username ? '@' + window.escapeHTML(username) : '';
        const displayName = fullName || usernameLabel || window.escapeHTML(window.t('idLabel', { id: item.tester_id }, lang));
        const isNew = item.status === 'new';

        // ── Avatar initials ──
        const initials = window.escapeHTML(
            (item.tester_full_name || item.tester_username || '?')
                .trim().replace('@', '').substring(0, 2).toUpperCase()
        );
        // Generate a stable pastel hue from tester_id
        const avatarHue = ((Number(item.tester_id || 0) * 73 + 17) % 360);
        const avatarHtml = `<div class="fb-avatar" style="--av-hue:${avatarHue}">${initials}</div>`;

        // ── Header ──
        let nameHtml = '';
        let subHtml = '';
        if (fullName) {
            nameHtml = `<span class="fb-name notranslate">${fullName}</span>`;
            if (username) {
                subHtml = `<a href="javascript:void(0);" class="fb-username notranslate" onclick="return openTelegramProfile('${safeUsername}', event)">@${window.escapeHTML(username)}</a>`;
            }
        } else if (username) {
            nameHtml = `<a href="javascript:void(0);" class="fb-name-link notranslate" onclick="return openTelegramProfile('${safeUsername}', event)">@${window.escapeHTML(username)}</a>`;
        } else {
            nameHtml = `<span class="fb-name notranslate">${window.escapeHTML(window.t('idLabel', { id: item.tester_id }, lang))}</span>`;
        }
        const statusBadge = item.status === 'declined'
            ? window.escapeHTML(window.t('projectFeedbackRejectedBadge', {}, lang))
            : window.escapeHTML(window.t('projectFeedbackProcessedBadge', {}, lang));
        const newBadge = isNew ? `<span class="fb-status fb-status--new">NEW</span>` : `<span class="fb-status">${statusBadge}</span>`;
        const headerHtml = `
            <div class="fb-header">
                ${avatarHtml}
                <div class="fb-header-info">
                    <div class="fb-name-row">
                        ${nameHtml}
                        <span class="fb-date">· ${window.escapeHTML(formatFeedbackDate(item.created_at))}</span>
                    </div>
                    ${subHtml}
                </div>
                ${newBadge}
            </div>`;

        // ── Body text — only show "show all" when genuinely long ──
        var textBodyHtml = '';
        if (isReviewTicket) {
            textBodyHtml = `<div class="fb-text"><span class="feedback-review-ticket">⭐ ${window.escapeHTML(window.t('projectFeedbackReviewTicketText', {}, lang))}</span></div>`;
        } else if (item.message_text) {
            const escapedText = escapeHtmlWithBreaks(item.message_text);
            const showAllLabel = window.escapeHTML(window.t('feedbackShowAllBtn', {}, lang));
            textBodyHtml = `<div class="fb-text fb-text--clamped" id="fbt-${item.id}" data-feedback-clamp="1" data-feedback-id="${item.id}">${escapedText}</div><a href="javascript:void(0);" class="fb-show-all" id="fbtl-${item.id}" style="display:none;" onclick="feedbackExpandText(${item.id})">${showAllLabel}</a>`;
        } else {
            textBodyHtml = `<div class="fb-text fb-text--muted">${window.escapeHTML(window.t('projectFeedbackNoText', {}, lang))}</div>`;
        }

        // ── Media thumbnails — with correct URL proxy ──
        var mediaUrls = (Array.isArray(item.media_urls) && item.media_urls.length > 0)
            ? item.media_urls
            : (Array.isArray(item.tg_file_ids) && item.tg_file_ids.length > 0
                ? item.tg_file_ids
                : (item.tg_file_id ? [item.tg_file_id] : []));
        const resolvedMediaUrls = (mediaUrls || []).map(feedbackResolveMediaUrl).filter(Boolean);
        window.feedbackMediaRegistry[item.id] = resolvedMediaUrls;
        window.feedbackCaptionRegistry[item.id] = item.message_text || '';

        var mediaHtml = '';
        if (resolvedMediaUrls.length > 0) {
            const total = resolvedMediaUrls.length;
            const MAX_THUMB = 3;
            const shown = Math.min(total, MAX_THUMB);
            var thumbsHtml = '';
            for (var ti = 0; ti < shown; ti++) {
                var url = resolvedMediaUrls[ti];
                if (url) {
                    const resolvedSrc = window.escapeHTML(url);
                    const isOverflow = ti === MAX_THUMB - 1 && total > MAX_THUMB;
                    const extra = total - MAX_THUMB + 1;
                    const overlay = isOverflow
                        ? `<div class="fb-media-overlay">+${extra}</div>`
                        : '';
                    thumbsHtml += `<div class="fb-media-thumb" onclick="openFeedbackImageSlider(${item.id}, ${ti})">
                        <img src="${resolvedSrc}" loading="lazy" onerror="feedbackOnImageError(this)">
                        ${overlay}
                    </div>`;
                }
            }
            if (thumbsHtml) {
                mediaHtml = `<div class="fb-media-grid${total === 1 ? ' fb-media-grid--single' : ''}">${thumbsHtml}</div>`;
            }
        }

        // ── Reward summary chips ──
        const rewardBust = Number(item.reward_bust || 0);
        const rewardKarma = Number(item.reward_karma || 0);
        const rewardSummary = item.status !== 'new'
            ? `<div class="fb-reward-summary">
                    <span class="fb-reward-state">${statusBadge}</span>
                    ${rewardBust > 0 ? `<span class="meta-chip accent-purple notranslate">💎 ${formatBustAmount(rewardBust)}</span>` : ''}
                    ${rewardKarma > 0 ? `<span class="meta-chip accent-yellow notranslate">☯️ ${rewardKarma.toFixed(1)}</span>` : ''}
               </div>`
            : '';

        // ── Developer reply ──
        const replyHtml = item.developer_reply
            ? `<div class="feedback-card-reply">${window.escapeHTML(window.t('feedbackRewardReplyCard', {}, lang))}: ${escapeHtmlWithBreaks(item.developer_reply)}</div>`
            : '';

        // ── Footer action line ──
        var hasTopicLink = !!(item.telegram_message_id && Number(item.telegram_message_id) > 0);
        const hasDm = !!username;
        var actionChips = '';
        if (hasDm || hasTopicLink) {
            const dmChip = hasDm
                ? `<button class="fb-link-action" onclick="return openTelegramProfile('${safeUsername}', event)">${window.escapeHTML(window.t('feedbackDmBtn', {}, lang)).replace('👤 ', '')}</button>`
                : '';
            const topicChip = hasTopicLink
                ? `<button class="fb-link-action" onclick="openFeedbackTopicLink(${item.telegram_message_id})">${window.escapeHTML(window.t('projectFeedbackOpenTopicBtn', {}, lang))}</button>`
                : '';
            actionChips = `<div class="fb-actions-left">${dmChip}${topicChip}</div>`;
        }

        // ── Primary CTA — only for new items ──
        const primaryBtn = isNew
            ? `<button class="fb-primary-btn" onclick="openFeedbackRewardModal(${projectId}, ${item.id})">${window.escapeHTML(window.t('projectFeedbackRewardBtn', {}, lang))}</button>`
            : '';

        const hasFooter = actionChips || primaryBtn;
        const cardMod = (isNew ? ' fb-card--new' : '') + (item.status === 'declined' ? ' fb-card--rejected' : '');
        return `<div class="fb-card${cardMod}">
            ${headerHtml}
            <div class="fb-message">
                ${textBodyHtml}
                ${mediaHtml}
                ${rewardSummary}
                ${replyHtml}
            </div>
            ${hasFooter ? `<div class="fb-footer">${actionChips}${primaryBtn}</div>` : ''}
        </div>`;
    }).join('')}</div>`;
}

var _feedbackSliderImages = [];
var _feedbackSliderIndex = 0;

function feedbackExpandText(feedbackId) {
    var el = document.getElementById('fbt-' + feedbackId);
    var link = document.getElementById('fbtl-' + feedbackId);
    if (el) el.classList.remove('fb-text--clamped');
    if (el) el.classList.add('fb-text--expanded');
    if (link) link.style.display = 'none';
}


var _feedbackSliderCaption = '';

function openFeedbackImageSlider(feedbackId, startIndex) {
    var mediaUrls = window.feedbackMediaRegistry[feedbackId] || [];
    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
        console.warn('[openFeedbackImageSlider] no media for id=' + feedbackId);
        return;
    }
    _feedbackSliderImages = mediaUrls.slice();
    _feedbackSliderIndex = Math.max(0, Math.min(startIndex || 0, _feedbackSliderImages.length - 1));
    _feedbackSliderCaption = (window.feedbackCaptionRegistry && window.feedbackCaptionRegistry[feedbackId]) || '';
    renderFeedbackImageSlider();
}

function feedbackSliderStep(delta) {
    var total = _feedbackSliderImages.length;
    if (total <= 1) return;
    _feedbackSliderIndex = (_feedbackSliderIndex + delta + total) % total;
    renderFeedbackImageSlider();
}

function feedbackSliderGoTo(i) {
    if (i < 0 || i >= _feedbackSliderImages.length) return;
    _feedbackSliderIndex = i;
    renderFeedbackImageSlider();
}

function _feedbackSliderKeyHandler(e) {
    if (e.key === 'Escape') closeFeedbackImageSlider();
    else if (e.key === 'ArrowLeft') feedbackSliderStep(-1);
    else if (e.key === 'ArrowRight') feedbackSliderStep(1);
}

function closeFeedbackImageSlider() {
    var overlay = document.getElementById('feedback-image-overlay');
    if (overlay) {
        overlay.classList.add('is-closing');
        setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 160);
    }
    document.removeEventListener('keydown', _feedbackSliderKeyHandler);
    _feedbackSliderImages = [];
    _feedbackSliderIndex = 0;
    _feedbackSliderCaption = '';
}

function renderFeedbackImageSlider() {
    var existing = document.getElementById('feedback-image-overlay');
    if (existing) existing.remove();
    if (_feedbackSliderImages.length === 0) return;

    var overlay = document.createElement('div');
    overlay.id = 'feedback-image-overlay';
    overlay.className = 'feedback-image-overlay';
    overlay.onclick = function(e) { if (e.target === overlay || e.target.classList.contains('fb-slider-stage')) closeFeedbackImageSlider(); };

    var total = _feedbackSliderImages.length;
    var currentUrl = feedbackResolveMediaUrl(_feedbackSliderImages[_feedbackSliderIndex]);
    var unavailable = window.escapeHTML(window.t('projectFeedbackImageUnavailable', {}, lang));

    var counterHtml = total > 1
        ? '<span class="fb-slider-counter">' + (_feedbackSliderIndex + 1) + ' / ' + total + '</span>'
        : '<span></span>';

    var arrowsHtml = '';
    if (total > 1) {
        arrowsHtml =
            '<button class="fb-slider-arrow fb-slider-arrow--prev" aria-label="Previous" onclick="event.stopPropagation(); feedbackSliderStep(-1);">&#8249;</button>' +
            '<button class="fb-slider-arrow fb-slider-arrow--next" aria-label="Next" onclick="event.stopPropagation(); feedbackSliderStep(1);">&#8250;</button>';
    }

    var captionHtml = _feedbackSliderCaption
        ? '<div class="fb-slider-caption">' + escapeHtmlWithBreaks(_feedbackSliderCaption) + '</div>'
        : '';

    var dotsHtml = '';
    if (total > 1) {
        dotsHtml = '<div class="fb-slider-dots">' + _feedbackSliderImages.map(function(_, i) {
            return '<span class="fb-slider-dot' + (i === _feedbackSliderIndex ? ' active' : '') + '" onclick="event.stopPropagation(); feedbackSliderGoTo(' + i + ');"></span>';
        }).join('') + '</div>';
    }

    overlay.innerHTML =
        '<div class="fb-slider-topbar">' +
            counterHtml +
            '<button class="fb-slider-close" aria-label="Close" onclick="event.stopPropagation(); closeFeedbackImageSlider();">&times;</button>' +
        '</div>' +
        '<div class="fb-slider-stage">' +
            arrowsHtml +
            "<img class='fb-slider-image' src='" + window.escapeHTML(currentUrl) + "' alt='Screenshot' onclick='event.stopPropagation();' onerror=\"this.onerror=null;this.style.display='none';var fb=this.parentNode.querySelector('.fb-slider-fallback');if(fb)fb.style.display='flex';\">" +
            '<div class="fb-slider-fallback" style="display:none;"><span class="fb-slider-fallback-icon">🖼️</span><span>' + unavailable + '</span></div>' +
        '</div>' +
        '<div class="fb-slider-bottom">' +
            captionHtml +
            dotsHtml +
        '</div>';

    document.body.appendChild(overlay);

    // Touch swipe navigation
    var stage = overlay.querySelector('.fb-slider-stage');
    if (stage && total > 1) {
        var startX = 0, startY = 0, tracking = false;
        stage.addEventListener('touchstart', function(e) {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX; startY = e.touches[0].clientY; tracking = true;
        }, { passive: true });
        stage.addEventListener('touchend', function(e) {
            if (!tracking) return;
            tracking = false;
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
                feedbackSliderStep(dx < 0 ? 1 : -1);
            }
        }, { passive: true });
    }

    document.removeEventListener('keydown', _feedbackSliderKeyHandler);
    document.addEventListener('keydown', _feedbackSliderKeyHandler);
}

function openFeedbackTopicLink(telegramMessageId) {
    if (!telegramMessageId) return;
    var groupId = (window.App && window.App.frontendGroupId) || '';
    var url;
    if (groupId) {
        url = 'https://t.me/c/' + groupId + '/' + telegramMessageId;
    } else {
        var base = (window.FEEDBACK_PUBLIC_LINK_BASE || (window.App && window.App.publicGroupUrl) || 'https://t.me/googleplay_console_12testers').replace(/\/+$/, '');
        url = base + '/' + telegramMessageId;
    }
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
    } else {
        window.open(url, '_blank');
    }
}

function showProjectFeedbackModalLoading(project) {
    const body = document.getElementById('project-feedback-body');
    if (!body) return;
    body.innerHTML = getProjectFeedbackHeader(project) + '<div id="project-feedback-list"></div>';
    showSkeleton('project-feedback-list');
    document.getElementById('project-feedback-modal').classList.add('active');
}

function showProjectFeedbackModalError(project) {
    const body = document.getElementById('project-feedback-body');
    if (!body) return;
    const projectId = Number(project && (project.id || project.app_id) || 0);
    const archivedFlag = project && Object.prototype.hasOwnProperty.call(project, 'app_id') ? 'true' : 'false';
    body.innerHTML = getProjectFeedbackHeader(project) + '<div id="project-feedback-list"></div>';
    showRetry('project-feedback-list', `openProjectFeedback(${projectId}, ${archivedFlag})`);
    document.getElementById('project-feedback-modal').classList.add('active');
}

function showProjectFeedbackModal(project, items) {
    const body = document.getElementById('project-feedback-body');
    if (!body) return;
    body.innerHTML = getProjectFeedbackHeader(project) + renderProjectFeedbackCards(project, items);
    document.getElementById('project-feedback-modal').classList.add('active');
    feedbackScheduleClampMeasure();
}

function closeProjectFeedbackModal(event) {
    if (event && event.target !== document.getElementById('project-feedback-modal')) return;
    document.getElementById('project-feedback-modal').classList.remove('active');
}

function openFeedbackRewardModalUi() {
    document.getElementById('feedback-reward-modal').classList.add('active');
}

function closeFeedbackRewardModalUi(event) {
    if (event && event.target !== document.getElementById('feedback-reward-modal')) return;
    document.getElementById('feedback-reward-modal').classList.remove('active');
}

function getKarmaSourceLabel(sourceType) {
    const normalized = String(sourceType || '').toLowerCase();
    const keyMap = {
        checkin: 'karmaSrc_checkin',
        overtime_checkin: 'karmaSrc_overtime_checkin',
        good_test: 'karmaSrc_good_test',
        bug_report: 'karmaSrc_bug_report',
        overtime_reward: 'karmaSrc_overtime_reward',
        owner_bonus: 'karmaSrc_owner_bonus',
        play_review: 'karmaSrc_play_review',
        platform_feedback: 'karmaSrc_platform_feedback',
        penalty: 'karmaSrc_penalty',
        other: 'karmaSrc_other',
        good: 'karmaSrc_good_test',
        bug: 'karmaSrc_bug_report',
        overtime: 'karmaSrc_overtime_reward',
    };
    const key = keyMap[normalized] || 'karmaSrc_other';
    return window.t(key, {}, lang);
}

function formatKarmaAmount(amount) {
    const num = Number(amount || 0);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)} ☯️`;
}

function closeKarmaInfoModal(event) {
    if (event && event.target && event.target.id !== 'karma-info-modal') return;
    const modal = document.getElementById('karma-info-modal');
    if (modal) modal.classList.remove('active');
}

async function showKarmaInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    const modal = document.getElementById('karma-info-modal');
    const totalEl = document.getElementById('karma-balance-value');
    const breakdownSection = document.getElementById('karma-stats-container');
    const breakdownEl = document.getElementById('karma-stats-list');
    if (!modal || !totalEl || !breakdownSection || !breakdownEl) return;

    const fallbackTotal = Number((visibilityStats && visibilityStats.ownerKarma) || 0);
    totalEl.textContent = window.t('karmaInfoBalanceValue', {
        amount: fallbackTotal.toFixed(1),
    });
    breakdownEl.innerHTML = '';
    breakdownSection.style.display = 'none';

    let result = {
        status: 'error',
        code: 'network_error',
        total: fallbackTotal,
        breakdown: []
    };

    if (window.fetchKarmaBreakdown) {
        result = await window.fetchKarmaBreakdown(userId);
    }

    const safeTotal = Number.isFinite(Number(result && result.total))
        ? Number(result.total)
        : fallbackTotal;
    totalEl.textContent = window.t('karmaInfoBalanceValue', {
        amount: safeTotal.toFixed(1),
    });

    const rows = (Array.isArray(result && result.breakdown) ? result.breakdown : [])
        .filter((item) => Number(item && item.count) !== 0 || Number(item && item.amount) !== 0)
        .map((item) => {
            const sourceLabel = window.escapeHTML(getKarmaSourceLabel(item.source_type));
            const amount = Number(item && item.amount) || 0;
            const amountText = window.escapeHTML(formatKarmaAmount(amount));
            return `<div class="dashboard-row"><span class="dashboard-label">${sourceLabel}</span><span class="dashboard-label" style="font-weight:700;">${amountText}</span></div>`;
        });

    if (rows.length > 0) {
        breakdownEl.innerHTML = rows.join('');
        breakdownSection.style.display = '';
    } else {
        breakdownEl.innerHTML = '';
        breakdownSection.style.display = 'none';
    }

    if (!result || result.status !== 'success') {
        showToast(window.t('karmaInfoNetworkFallbackToast', {}, lang));
    }

    modal.classList.add('active');
}

function showReliabilityInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    document.getElementById('t-reliabilityInfoTitle').innerHTML = t.reliabilityInfoTitle;
    document.getElementById('t-reliabilityInfoText').innerHTML = t.reliabilityInfoText;
    document.getElementById('t-reliabilityAlphaBtn').innerText = t.reliabilityAlphaBtn;
    document.getElementById('t-btnClose').innerText = t.btnClose;
    document.getElementById('reliability-info-modal').classList.add('active');
}

function closeReliabilityInfo(event) {
    if (event && event.target !== document.getElementById('reliability-info-modal')) return;
    document.getElementById('reliability-info-modal').classList.remove('active');
}

function showRankPopup() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const thresholds = visibilityStats.top_thresholds || {};
    const msg = t.rankPopupText
        .replace('{rank}', visibilityStats.rank || '?')
        .replace('{total}', visibilityStats.total_developers || '?')
        .replace('{t1}', thresholds['1'] || 0)
        .replace('{t2}', thresholds['2'] || 0)
        .replace('{t3}', thresholds['3'] || 0)
        .replace('{t4}', thresholds['4'] || 0)
        .replace('{t5}', thresholds['5'] || 0)
        .replace('{my}', visibilityStats.my_active_tests || 0);
    if (tg.showAlert) tg.showAlert(msg);
    else alert(msg);
}

function showTestDayPopup(day) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    let msg = t.testDayExplain.replace('{days}', day);
    const projectId = window._karmaDistributionProjectId;
    if (projectId) {
        const project = myProjects.find((item) => item.id === projectId);
        const tester = project ? (project.testers || []).find((item) => item.tester_id === day) : null;
        if (tester) {
            const testerDay = tester.start_date ? (getDayDiffFromToday(tester.start_date) + 1) : 0;
            const actualSkips = Math.max(0, (testerDay - 1) - (tester.checkins_count || 0));
            msg = window.t('karmaDistributionTesterStats', {
                day: testerDay,
                checkins: tester.checkins_count || 0,
                skips: actualSkips,
            });
        }
    }
    if (tg.showAlert) tg.showAlert(msg);
    else alert(msg);
}

function showNewBadgeToast() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(t.newBadgeToast);
}

function insertChip(textareaId, chipText) {
    const textarea = document.getElementById(textareaId);
    if (!textarea) return;
    if (textarea.value.length > 0 && !textarea.value.endsWith('\n')) {
        textarea.value += '\n';
    }
    textarea.value += chipText;
    textarea.focus();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function buildKarmaDistributionTesterStats(tester, feedbackCountByTester) {
    const testerDay = tester.start_date ? (getDayDiffFromToday(tester.start_date) + 1) : 0;
    const actualSkips = Math.max(0, (testerDay - 1) - (tester.checkins_count || 0));
    let stats = window.t('karmaDistributionTesterStats', {
        day: testerDay,
        checkins: tester.checkins_count || 0,
        skips: actualSkips,
    }, lang);
    const feedbackCount = Number(feedbackCountByTester[Number(tester.tester_id)] || 0);
    stats += window.t('karmaDistributionTesterFeedback', { count: feedbackCount }, lang);
    return window.escapeHTML(stats);
}

function renderKarmaDistributionModal(project, feedbackCountByTester) {
    const body = document.getElementById('karma-distribution-body');
    if (!body || !project) return;

    const likesAvailable = Math.max(0, (project.likes_max || 0) - (project.likes_used || 0));
    const testers = project.testers || [];
    const rowsHtml = testers.map((tester) => {
        const liked = (project.likes || []).find((like) => like.tester_id === tester.tester_id);
        const name = tester.username
            ? '@' + window.escapeHTML(tester.username.replace('@', ''))
            : tester.full_name
                ? window.escapeHTML(tester.full_name)
            : window.escapeHTML(window.t('idLabel', { id: tester.tester_id }));
        const stats = buildKarmaDistributionTesterStats(tester, feedbackCountByTester || {});
        const amountByType = liked ? (liked.type === 'bug' ? '3.0' : liked.type === 'overtime' ? '2.0' : '1.5') : '';
        const actionHtml = liked
            ? `<span class="karma-dist-btn disabled">${window.escapeHTML(window.t('karmaDistributionUsed', { amount: amountByType }))}</span>`
            : likesAvailable <= 0
                ? '<span class="karma-dist-btn disabled">+☯️</span>'
                : `<button class="karma-dist-btn" onclick="event.stopPropagation(); openKarmaSelectPopup(${project.id}, ${tester.tester_id})">+☯️</button>`;

        return `<div class="karma-dist-tester">
            <div>
                <button type="button" class="karma-dist-name-btn" onclick="showTestDayPopup(${tester.tester_id})"><span class="tester-name">${name}</span></button>
                <span class="karma-dist-meta">${stats}</span>
            </div>
            ${actionHtml}
        </div>`;
    }).join('');

    body.innerHTML = `
        <h3>${window.escapeHTML(t.karmaDistributionTitle)}</h3>
        <p style="font-size:13px;color:var(--hint-color);margin-bottom:14px;">${window.escapeHTML(t.karmaDistributionDesc)}</p>
        <div class="delete-info-block karma-dist" style="margin-bottom:12px;">
            <div style="font-weight:600;margin-bottom:6px;">${window.escapeHTML(window.t('karmaDistributionGuideTitle', {}, lang))}</div>
            <div style="font-size:13px;color:var(--hint-color);line-height:1.55;">${window.escapeHTML(window.t('karmaDistributionGuideText', {}, lang))}</div>
            <div class="delete-chip-row" style="margin-top:8px;">
                <span class="meta-chip accent-green">${window.escapeHTML(window.t('karmaDistributionGuideStatus', { available: likesAvailable, total: 2 }, lang))}</span>
            </div>
        </div>
        <div>${rowsHtml}</div>
        <button class="btn btn-secondary" style="width:100%;margin-top:14px;" onclick="closeKarmaDistribution()">${window.escapeHTML(t.inviteClose)}</button>
    `;
}

async function openKarmaDistribution(projectId) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const project = myProjects.find((item) => item.id === projectId);
    const body = document.getElementById('karma-distribution-body');
    if (!body) return;

    window._karmaDistributionProjectId = projectId;

    if (!project) {
        body.innerHTML = `<h3>${window.escapeHTML(t.karmaDistributionTitle)}</h3><p style="color:var(--hint-color);">${window.escapeHTML(t.karmaDistNoTesters)}</p>`;
        document.getElementById('karma-distribution-modal').classList.add('active');
        return;
    }

    const testers = project.testers || [];
    if (!testers.length) {
        body.innerHTML = `<h3>${window.escapeHTML(t.karmaDistributionTitle)}</h3><p style="color:var(--hint-color);">${window.escapeHTML(t.karmaDistNoTesters)}</p>`;
        document.getElementById('karma-distribution-modal').classList.add('active');
        return;
    }

    document.getElementById('karma-distribution-modal').classList.add('active');
    renderKarmaDistributionModal(project, {});

    try {
        const response = await fetch(`${API_BASE}/projects/${projectId}/feedback?owner_id=${userId}`);
        const data = await response.json();
        if (response.ok && data.status === 'success' && Array.isArray(data.feedback)) {
            const feedbackCountByTester = {};
            data.feedback.forEach(function(item) {
                const testerId = Number(item.tester_id || 0);
                if (testerId > 0) {
                    feedbackCountByTester[testerId] = (feedbackCountByTester[testerId] || 0) + 1;
                }
            });
            if (window._karmaDistributionProjectId === projectId) {
                renderKarmaDistributionModal(project, feedbackCountByTester);
            }
        }
    } catch (error) {
        console.warn('Failed to load feedback counts for karma distribution:', error);
    }
}

function closeKarmaDistribution(event) {
    if (event && event.target && event.target.id !== 'karma-distribution-modal') return;
    document.getElementById('karma-distribution-modal').classList.remove('active');
    window._karmaDistributionProjectId = null;
}

function showKarmaPopup(appId, testerId) {
    openKarmaSelectPopup(appId, testerId);
}

function showCustomAlert(text, options) {
    const overlay = document.getElementById('custom-alert-overlay');
    const textNode = document.getElementById('custom-alert-text');
    const allowHtml = !!(options && options.html);
    if (!overlay || !textNode) return;
    textNode.classList.toggle('custom-alert-text--html', allowHtml);
    if (allowHtml) {
        textNode.innerHTML = text;
    } else {
        textNode.innerText = text;
    }
    overlay.classList.add('active');
}

function _getGuestTestsInfoCounts() {
    var state = window.App && typeof window.App.getState === 'function'
        ? window.App.getState()
        : null;
    var externalCounts = typeof window.getExternalCounts === 'function'
        ? window.getExternalCounts()
        : (state && state.externalCounts) || null;
    var guestCount = 0;
    if (typeof window.getFilteredGuestProjects === 'function') {
        try {
            var filteredGuestProjects = window.getFilteredGuestProjects();
            if (Array.isArray(filteredGuestProjects)) {
                guestCount = filteredGuestProjects.length;
            }
        } catch (error) {
            console.warn('Guest projects count lookup failed:', error);
        }
    }
    if (!guestCount && state && Array.isArray(state.guestProjects)) {
        guestCount = state.guestProjects.length;
    }
    if (!guestCount && Array.isArray(window.guestProjects)) {
        guestCount = window.guestProjects.length;
    }
    if (!guestCount && externalCounts) {
        guestCount = Math.max(0, Number(externalCounts.guest_projects_count || 0));
    }

    var leadsCountCandidates = [
        externalCounts && externalCounts.leads_count,
        state && state.externalCounts && state.externalCounts.leads_count,
        state && state.leadsCount,
        state && state.offerCounts && state.offerCounts.leadsCount,
        state && state.visibilityStats && state.visibilityStats.leads_count,
        state && state.visibilityStats && state.visibilityStats.raw_leads_count,
        window.visibilityStats && window.visibilityStats.leads_count,
        window.visibilityStats && window.visibilityStats.raw_leads_count,
        window.rawLeadsCount,
        window.__guestTestsLeadsCount,
    ];
    var leadsCount = 0;
    for (var index = 0; index < leadsCountCandidates.length; index += 1) {
        var parsed = Number(leadsCountCandidates[index]);
        if (Number.isFinite(parsed) && parsed >= 0) {
            leadsCount = parsed;
            break;
        }
    }

    return {
        guestCount: Math.max(0, Number(guestCount || 0)),
        leadsCount: Math.max(0, Number(leadsCount || 0)),
    };
}

async function showGuestTestsInfoAlert() {
    var counts = _getGuestTestsInfoCounts();
    var shouldAwaitExternalCounts = counts.guestCount <= 0 || counts.leadsCount <= 0;
    if (typeof window.loadExternalCounts === 'function') {
        try {
            if (shouldAwaitExternalCounts) {
                await window.loadExternalCounts({ force: true });
            } else {
                window.loadExternalCounts().catch(function(error) {
                    console.warn('Background external counts refresh failed:', error);
                });
            }
            counts = _getGuestTestsInfoCounts();
        } catch (error) {
            console.warn('Guest tests info counts refresh failed:', error);
            counts = _getGuestTestsInfoCounts();
        }
    }
    var infoHtml = String(window.t('guestTestsFullInfo', {
        guest_count: counts.guestCount,
        leads_count: counts.leadsCount,
    }, lang) || '').replace(/\n/g, '<br>');
    var actionBtnHtml = `<button type="button" class="popup-action-btn" onclick="window.ui.triggerGuestShowcaseNavigation()">${window.escapeHTML(window.t('guestTestsActionBtn', {}, lang))}</button>`;
    showCustomAlert(infoHtml + actionBtnHtml, { html: true });
}

function showPendingReleaseInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    showCustomAlert(
        window.t('pendingReleaseModalTitle', {}, lang) + '\n\n' +
        window.t('pendingReleaseModalText', {}, lang)
    );
}

function closeCustomAlert(event) {
    if (event && event.target && event.target.id !== 'custom-alert-overlay') {
        return;
    }
    var overlay = document.getElementById('custom-alert-overlay');
    var textNode = document.getElementById('custom-alert-text');
    if (textNode) {
        textNode.classList.remove('custom-alert-text--html');
        textNode.innerHTML = '';
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

async function triggerGuestShowcaseNavigation() {
    closeCustomAlert();
    if (typeof window.openGuestProjectsTesterSearch === 'function') {
        await window.openGuestProjectsTesterSearch(0);
        return;
    }
    if (typeof window.switchTab === 'function') {
        window.switchTab('market');
    }
    if (typeof window.switchMarketSubTab === 'function') {
        window.switchMarketSubTab('seeking');
    }
    if (typeof window.toggleGuestProjectsAccordion === 'function') {
        await window.toggleGuestProjectsAccordion(true);
    }
}

function ensureGuestClaimLoadingOverlay() {
    var overlay = document.getElementById('guest-claim-loading-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'guest-claim-loading-overlay';
    overlay.className = 'guest-claim-loading-overlay';
    overlay.innerHTML = `
        <div class="guest-claim-loading-box">
            <div class="guest-claim-loading-spinner"></div>
            <div id="guest-claim-loading-text" class="guest-claim-loading-text"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function showLoading(message) {
    var overlay = ensureGuestClaimLoadingOverlay();
    var textEl = document.getElementById('guest-claim-loading-text');
    if (textEl) {
        textEl.textContent = String(message || window.t('guestClaimLoading', {}, lang));
    }
    overlay.classList.add('active');
}

function hideLoading() {
    var overlay = document.getElementById('guest-claim-loading-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function ensureGuestClaimStatusModal() {
    var overlay = document.getElementById('guest-claim-status-modal');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'guest-claim-status-modal';
    overlay.className = 'modal-overlay guest-claim-status-modal';
    overlay.onclick = function(event) {
        closeGuestClaimStatusModal(event);
    };
    overlay.innerHTML = `
        <div class="modal-content guest-claim-status-content" onclick="event.stopPropagation()">
            <div id="guest-claim-status-body" class="guest-claim-status-body"></div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function showGuestClaimStatusModal(options) {
    var config = options || {};
    var overlay = ensureGuestClaimStatusModal();
    var body = document.getElementById('guest-claim-status-body');
    if (!body) return;

    var isSuccess = config.variant === 'success';
    var titleKey = isSuccess ? 'guestClaimSuccessTitle' : 'guestClaimNotOwnerTitle';
    var textKey = isSuccess ? 'guestClaimSuccessText' : 'guestClaimNotOwnerText';
    var primaryAction = isSuccess
        ? `<button class="btn btn-primary" onclick="openGuestClaimEditFlow(${Number(config.appId || 0)})">${window.escapeHTML(window.t('guestClaimEditProjectBtn', {}, lang))}</button>`
        : `<button class="btn btn-primary" onclick="openGuestClaimSupportFromModal()">${window.escapeHTML(window.t('guestClaimContactSupportBtn', {}, lang))}</button>`;

    body.innerHTML = `
        <div class="guest-claim-status-icon">${isSuccess ? '🎉' : '⚠️'}</div>
        <div class="guest-claim-status-title">${window.escapeHTML(window.t(titleKey, {}, lang))}</div>
        <div class="guest-claim-status-text">${escapeHtmlWithBreaks(window.t(textKey, {}, lang))}</div>
        <div class="guest-claim-status-actions">
            ${primaryAction}
            <button class="btn btn-secondary" onclick="closeGuestClaimStatusModal()">${window.escapeHTML(window.t('inviteClose', {}, lang))}</button>
        </div>
    `;

    overlay.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(isSuccess ? 'success' : 'warning');
}

function closeGuestClaimStatusModal(event) {
    var overlay = document.getElementById('guest-claim-status-modal');
    if (!overlay) return;
    if (event && event.target && event.target !== overlay) {
        return;
    }
    overlay.classList.remove('active');
}

function openGuestClaimSupportFromModal() {
    closeGuestClaimStatusModal();
    if (typeof window.sendFeedback === 'function') {
        window.sendFeedback('question');
    }
}

function openGuestClaimEditFlow(appId) {
    var targetAppId = Number(appId || 0);
    closeGuestClaimStatusModal();
    if (typeof window.switchTab === 'function') {
        window.switchTab('projects');
    }
    Promise.resolve(typeof window.loadProjects === 'function' ? window.loadProjects(true) : null)
        .finally(function() {
            if (targetAppId > 0 && typeof window.openEditModal === 'function') {
                window.openEditModal(targetAppId);
            }
        });
}

var _guestClaimWelcomeState = null;
var _guestClaimWelcomeSubmitting = false;

function ensureGuestClaimWelcomeOverlay() {
    var overlay = document.getElementById('guest-claim-welcome-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'guest-claim-welcome-overlay';
    overlay.className = 'guest-claim-welcome-overlay';
    overlay.innerHTML = '<div class="guest-claim-welcome-shell" id="guest-claim-welcome-shell"></div>';
    document.body.appendChild(overlay);
    return overlay;
}

function renderGuestClaimWelcomeCard(guest) {
    var packageName = String(guest.package_name || guest.app_id || '').trim();
    var displayName = String(guest.app_name || guest.name || guest.title || '').trim();
    var titleText = displayName || window.t('guestClaimWelcomeNoTitle', {}, lang);
    var ownerUsername = String(guest.owner_username || '').trim().replace(/^@+/, '');
    var ownerLabel = ownerUsername
        ? '@' + ownerUsername
        : window.t('idLabel', { id: Number(guest.owner_telegram_id || guest.owner_id || 0) }, lang);
    var description = String(guest.instructions || '').trim();
    var safeDescription = description
        ? escapeHtmlWithBreaks(description)
        : window.escapeHTML(window.t('guestCardNoInstructions', {}, lang));
    var langChip = getGuestLanguageDisplayParts(guest.language || guest.lang, guest.user_lang).length
        ? renderGuestLanguageBadge(guest.language || guest.lang, guest.user_lang)
        : '';
    var categoryKey = String(guest.category || 'app').toLowerCase() === 'game'
        ? 'guestFilterCategoryGame'
        : 'guestFilterCategoryApp';
    var freshness = getGuestProjectFreshness(guest.created_at);
    var freshnessChip = freshness
        ? `<span class="guest-freshness-chip guest-freshness-chip-${window.escapeHTML(freshness.tone)}">${window.escapeHTML(freshness.label)}</span>`
        : '';
    var packageLine = packageName
        ? `<div class="guest-claim-welcome-package notranslate">${window.escapeHTML(packageName)}</div>`
        : '';

    return `
        <div class="market-card guest-market-card guest-claim-welcome-card">
            <div class="market-top guest-market-top">
                <div class="guest-market-title-wrap">
                    <div class="guest-market-headline">
                        <div class="guest-claim-welcome-app-title notranslate">${window.escapeHTML(titleText)}</div>
                        <span class="guest-market-badge">${window.escapeHTML(window.t('guestCardBadge', {}, lang))}</span>
                        ${freshnessChip}
                    </div>
                    ${packageLine}
                    <div class="market-owner notranslate">${window.escapeHTML(ownerLabel)}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
                    ${langChip}
                    <span class="meta-chip">${window.escapeHTML(window.t(categoryKey, {}, lang))}</span>
                </div>
            </div>
            <div class="guest-market-desc">${safeDescription}</div>
        </div>
    `;
}

function renderGuestClaimWelcomeBody() {
    var shell = document.getElementById('guest-claim-welcome-shell');
    if (!shell) return;

    var state = _guestClaimWelcomeState || {};
    var communityUrl = String(
        (typeof window.GUEST_CLAIM_COMMUNITY_URL === 'string' && window.GUEST_CLAIM_COMMUNITY_URL)
        || 'https://t.me/googleplay_console_12testers'
    ).trim();

    if (state.loading) {
        shell.innerHTML = `
            <div class="guest-claim-welcome-title">${window.escapeHTML(window.t('guestClaimWelcomeTitle', {}, lang))}</div>
            <div class="guest-claim-welcome-loading">
                <div class="guest-claim-loading-spinner"></div>
                <div>${window.escapeHTML(window.t('guestClaimWelcomeLoading', {}, lang))}</div>
            </div>
        `;
        return;
    }

    var guest = state.guest || null;
    var claimState = String(state.claimState || '').trim();
    var loadFailed = !!state.loadFailed;
    var isReady = claimState === 'ready';
    var isNotOwner = claimState === 'not_owner';
    var isAlreadyOwned = claimState === 'already_owned';
    var isNotFound = claimState === 'not_found' || loadFailed;
    var screenTitle = isAlreadyOwned
        ? window.t('guestClaimWelcomeAlreadyOwnedTitle', {}, lang)
        : window.t('guestClaimWelcomeTitle', {}, lang);
    var statusClass = isReady || isAlreadyOwned ? 'is-success' : 'is-error';
    var statusText = isReady
        ? window.t('guestClaimWelcomeOwnerOk', {}, lang)
        : (isAlreadyOwned
            ? window.t('guestClaimWelcomeAlreadyOwnedText', {}, lang)
            : (isNotOwner
                ? window.t('guestClaimWelcomeOwnerFail', {}, lang)
                : window.t('guestClaimWelcomeNotFound', {}, lang)));
    var primaryAction = '';
    if (isReady) {
        primaryAction = `<button type="button" class="btn btn-primary" ${_guestClaimWelcomeSubmitting ? 'disabled' : ''} onclick="handleGuestClaimWelcomeContinue()">${
            _guestClaimWelcomeSubmitting
                ? window.escapeHTML(window.t('guestClaimLoading', {}, lang))
                : window.escapeHTML(window.t('guestClaimWelcomeContinueBtn', {}, lang))
        }</button>`;
    } else if (isAlreadyOwned) {
        primaryAction = `<button type="button" class="btn btn-primary" onclick="handleGuestClaimWelcomeGoToDashboard()">${window.escapeHTML(window.t('guestClaimWelcomeGoToDashboardBtn', {}, lang))}</button>`;
    }
    var supportBtn = isNotOwner
        ? `<button type="button" class="btn btn-secondary" onclick="openGuestClaimSupportFromWelcome()">${window.escapeHTML(window.t('guestClaimContactSupportBtn', {}, lang))}</button>`
        : '';
    var infoBlock = (isNotFound || isAlreadyOwned)
        ? ''
        : `<div class="guest-claim-welcome-info">${window.escapeHTML(window.t('guestClaimWelcomeInfo', {}, lang))}</div>`;
    var safeCommunityUrl = escapeInlineJsString(communityUrl);

    shell.innerHTML = `
        <div class="guest-claim-welcome-title">${window.escapeHTML(screenTitle)}</div>
        <div class="guest-claim-welcome-card-wrap">
            ${guest ? renderGuestClaimWelcomeCard(guest) : `<div class="guest-claim-welcome-info">${window.escapeHTML(window.t('guestClaimWelcomeNotFound', {}, lang))}</div>`}
        </div>
        ${infoBlock}
        <div class="guest-claim-welcome-status ${statusClass}">${window.escapeHTML(statusText)}</div>
        <div class="guest-claim-welcome-actions">
            ${primaryAction}
            ${supportBtn}
        </div>
        <div class="guest-claim-welcome-community">
            <a href="javascript:void(0)" onclick="tg.openTelegramLink('${safeCommunityUrl}')">${window.escapeHTML(window.t('guestClaimWelcomeCommunityLink', {}, lang))}</a>
        </div>
    `;
}

async function showGuestClaimWelcomeScreen(intent) {
    if (!intent || !intent.guestAppId) {
        return false;
    }

    _guestClaimWelcomeState = {
        intent: intent,
        guest: null,
        claimState: 'loading',
        canClaim: false,
        alreadyClaimed: false,
        ownedAppId: 0,
        loadFailed: false,
        loading: true,
    };
    _guestClaimWelcomeSubmitting = false;

    var overlay = ensureGuestClaimWelcomeOverlay();
    overlay.classList.add('active');
    renderGuestClaimWelcomeBody();

    try {
        var preview = typeof window._loadGuestAppPreview === 'function'
            ? await window._loadGuestAppPreview(intent.guestAppId)
            : null;
        if (!preview || !preview.item) {
            _guestClaimWelcomeState = {
                intent: intent,
                guest: null,
                claimState: 'not_found',
                canClaim: false,
                alreadyClaimed: false,
                ownedAppId: 0,
                loadFailed: true,
                loading: false,
            };
        } else {
            var claimState = String(preview.claimState || '').trim() || 'not_found';
            _guestClaimWelcomeState = {
                intent: intent,
                guest: preview.item,
                claimState: claimState,
                canClaim: claimState === 'ready',
                alreadyClaimed: !!preview.alreadyClaimed,
                ownedAppId: Number(preview.ownedAppId || 0),
                loadFailed: false,
                loading: false,
            };
        }
    } catch (error) {
        console.error('Guest claim welcome load error:', error);
        _guestClaimWelcomeState = {
            intent: intent,
            guest: null,
            claimState: 'not_found',
            canClaim: false,
            alreadyClaimed: false,
            ownedAppId: 0,
            loadFailed: true,
            loading: false,
        };
    }

    renderGuestClaimWelcomeBody();
    return true;
}

function closeGuestClaimWelcomeScreen() {
    var overlay = document.getElementById('guest-claim-welcome-overlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
    _guestClaimWelcomeState = null;
    _guestClaimWelcomeSubmitting = false;
}

function openGuestClaimSupportFromWelcome() {
    if (typeof window.sendFeedback === 'function') {
        window.sendFeedback('question');
    } else if (typeof openGuestClaimSupportFromModal === 'function') {
        openGuestClaimSupportFromModal();
    }
}

async function handleGuestClaimWelcomeContinue() {
    var state = _guestClaimWelcomeState;
    if (!state || state.claimState !== 'ready' || !state.canClaim || !state.intent || _guestClaimWelcomeSubmitting) {
        return;
    }

    _guestClaimWelcomeSubmitting = true;
    renderGuestClaimWelcomeBody();

    if (typeof window._executeGuestClaimIntent === 'function') {
        await window._executeGuestClaimIntent(state.intent);
    }

    _guestClaimWelcomeSubmitting = false;
    if (_guestClaimWelcomeState) {
        renderGuestClaimWelcomeBody();
    }
}

function handleGuestClaimWelcomeGoToDashboard() {
    var state = _guestClaimWelcomeState;
    if (!state || state.claimState !== 'already_owned') {
        return;
    }

    if (state.intent && state.intent.rawStartParam) {
        if (typeof _markGuestClaimHandled === 'function') {
            _markGuestClaimHandled(state.intent.rawStartParam);
        }
        if (typeof _clearStartappQueryParam === 'function') {
            _clearStartappQueryParam();
        }
    }

    closeGuestClaimWelcomeScreen();

    if (typeof window.switchTab === 'function') {
        window.switchTab('projects');
    }
    if (typeof window.loadProjects === 'function') {
        window.loadProjects(true);
    }
}

function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.cssText = 'position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translate3d(0,0,0); background: var(--text-color); color: var(--bg-color); padding: 10px 20px; border-radius: 12px; font-size: 14px; z-index: 9999; opacity: 0; transition: opacity 0.3s ease; pointer-events: none; text-align: center; max-width: 85%;';
        document.body.appendChild(toast);
    }
    toast.innerText = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

function switchTab(tabId, navElement) {
    const normalizedTab = (tabId || '').replace(/^tab-/, '');
    const finalTab = normalizedTab === 'my-tests' ? 'tests' : normalizedTab;

    document.querySelectorAll('.nav-item').forEach((element) => element.classList.remove('active'));
    if (navElement && navElement.classList) {
        navElement.classList.add('active');
    } else {
        const map = { tests: 0, projects: 1, market: 2 };
        const idx = map[finalTab];
        const navItems = document.querySelectorAll('.nav-item');
        if (typeof idx === 'number' && navItems[idx]) {
            navItems[idx].classList.add('active');
        }
    }

    document.querySelectorAll('.tab-content').forEach((element) => element.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${finalTab}`);
    if (tabEl) tabEl.classList.add('active');

    const doneSection = document.getElementById('done-section');
    if (doneSection && finalTab !== 'tests') {
        doneSection.style.display = 'none';
    }

    if (finalTab === 'tests') {
        renderEvents(true);
        renderIncomingOffers(true);
        renderTests(true);
    }

    if (finalTab === 'market') {
        if (window.hydrateMarketFromCache) {
            window.hydrateMarketFromCache();
        }
        renderMutualFeed(true);
        renderMutualReturns(null, true);
        renderBountyFeed(true);
    }

    if (finalTab === 'projects') {
        renderProjects(true);
        renderArchivedProjects(true);
    }

    if (finalTab === 'market') {
        loadMutualFeed();
        loadBountyFeed();
    }

    if (finalTab === 'tests') {
        if (window.loadTasks) {
            window.loadTasks(true).catch(function() {});
        }
        if (window.loadIncomingOffers) {
            window.loadIncomingOffers({ background: true }).catch(function() {});
        }
        if (window.loadReliabilitySummary) {
            window.loadReliabilitySummary(true).catch(function() {});
        }
        if (window.loadReliabilityBreakdown) {
            window.loadReliabilityBreakdown(true).catch(function() {});
        }
    }

    if (finalTab === 'projects') {
        if (window.loadProjects) {
            window.loadProjects(true).catch(function() {});
        }
        if (window.loadArchivedProjects) {
            window.loadArchivedProjects({ background: true, silent: true }).catch(function() {});
        }
    }

    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
}

function toggleAccordion() {
    const accordion = document.getElementById('done-section');
    if (!accordion) return;
    const willOpen = !accordion.classList.contains('active');
    accordion.classList.toggle('active', willOpen);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function closeBanner() {
    const banner = document.getElementById('main-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('hideBanner', 'true');
}

var _dossierProjectsCache = {};
var _dossierProfilesCache = {};

function getDossierReliabilityState(profile) {
    var expected = Number(profile && profile.total_expected_checkins || 0);
    var actual = Number(profile && profile.total_actual_checkins || 0);
    var reliabilityPct = 0;
    var reliabilityText = window.t('dossierNewbie', {}, lang);

    if (expected >= 42) {
        reliabilityPct = Math.round((actual / Math.max(1, expected)) * 100);
        if (reliabilityPct >= 95) reliabilityText = window.t('reliabilityExcellent', {}, lang);
        else if (reliabilityPct >= 80) reliabilityText = window.t('reliabilityGood', {}, lang);
        else if (reliabilityPct >= 65) reliabilityText = window.t('reliabilityRisky', {}, lang);
        else reliabilityText = window.t('reliabilityUnreliable', {}, lang);
    }

    return {
        expected: expected,
        actual: actual,
        reliabilityPct: reliabilityPct,
        reliabilityText: reliabilityText,
    };
}

function getProjectModeText(mode) {
    var normalized = String(mode || 'mutual').toLowerCase();
    if (normalized === 'bounty') return window.t('modeBounty', {}, lang);
    if (normalized === 'hybrid') return window.t('modeHybrid', {}, lang);
    return window.t('modeMutual', {}, lang);
}

function openTesterOwnedProjectFromDossier(testerId, projectId) {
    var numericProjectId = Number(projectId || 0);
    if (numericProjectId <= 0) return;

    var existingTest = (myTests || []).find(function(item) {
        return Number(item.id) === numericProjectId;
    });

    closeDossierModal();
    if (existingTest) {
        setTimeout(function() {
            openProjectDetailsModal(numericProjectId);
        }, 40);
        return;
    }

    var cacheKey = String(testerId || '');
    var project = (_dossierProjectsCache[cacheKey] || []).find(function(item) {
        return Number(item.app_id) === numericProjectId;
    });
    var profile = _dossierProfilesCache[cacheKey] || {};
    if (!project) {
        showToast(window.t('loadError', {}, lang));
        return;
    }

    setTimeout(function() {
        openTesterOwnedProjectPreviewModal(project, profile, testerId);
    }, 40);
}

function openTesterOwnedProjectPreviewModal(project, profile, testerId) {
    if (!project) return;
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    var body = document.getElementById('project-details-body');
    if (!body) return;

    var safeName = window.escapeHTML(project.name || window.t('unknownLabel', {}, lang));
    var safePackage = window.escapeHTML(project.package_name || '');
    var ownerUsername = String(project.owner_username || profile.owner_username || '').trim().replace(/^@+/, '');
    var ownerFullName = String(project.owner_full_name || profile.owner_full_name || '').trim();
    var safeOwnerUsername = escapeInlineJsString(ownerUsername);
    var ownerDisplay = window.escapeHTML(formatDeveloperOwnerLine(ownerFullName, ownerUsername, testerId));
    var platformDays = getProjectPlatformDay(project.created_at);
    var currentGoogleDay = isProjectSynced(project) ? getProjectCurrentGoogleDay(project, platformDays) : platformDays;
    var leftDays = Math.max(0, 14 - currentGoogleDay);
    var finishDate = parseLocalDateOnly(getLocalDate()) || new Date();
    finishDate.setDate(finishDate.getDate() + leftDays);
    var hasSync = isProjectSynced(project);
    var ownerActivity = getOwnerActivityMeta(project.last_owner_activity);
    var reliabilityState = getDossierReliabilityState(profile || {});
    var reliabilityLine = reliabilityState.expected >= 42
        ? window.t('dossierOwnerReliability', { pct: reliabilityState.reliabilityPct, status: reliabilityState.reliabilityText }, lang)
        : window.t('dossierOwnerReliabilityNewbie', {}, lang);
    var joinBlocked = _isDossierProjectJoinBlocked(project);
    var takeAction = String(project.mode || 'mutual').toLowerCase() === 'bounty'
        ? 'closeProjectDetailsModal(); joinBounty(' + Number(project.app_id) + ')'
        : 'closeProjectDetailsModal(); joinMutual(' + Number(project.app_id) + ', false)';
    var dossierMetaChipsHtml = _buildDossierProjectMetaChips(project);
    var contactButtonHtml = safeOwnerUsername
        ? '<button class="btn" style="background:var(--button-color);color:var(--button-text-color);" onclick="closeProjectDetailsModal(); openTelegramProfile(\'' + safeOwnerUsername + '\')">' + window.escapeHTML(window.t('detail_contact_btn', {}, lang)) + '</button>'
        : '<button class="btn" style="background:rgba(142,142,147,0.18);color:var(--hint-color);" disabled>' + window.escapeHTML(window.t('usernameUnavailable', {}, lang)) + '</button>';

    var syncHtml = hasSync
        ? '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('projectSyncedTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);line-height:1.6;">' +
                window.escapeHTML(window.t('syncOfficialDay', { day: currentGoogleDay }, lang)) + '<br>' +
                window.escapeHTML(window.t('syncEstimatedFinish', { date: formatDdMmYyyy(finishDate) }, lang)) + '<br>' +
                window.escapeHTML(window.t('timelineApproxRemaining', { count: leftDays }, lang)) +
            '</div>' +
            (project.sync_message
                ? '<div style="font-size:13px;color:var(--text-color);margin-top:8px;line-height:1.5;">' + escapeHtmlWithBreaks(project.sync_message) + '</div>'
                : '') +
        '</div>'
        : '<div class="details-block"><div class="detail-section-title">' + window.escapeHTML(window.t('syncBtn', {}, lang)) + '</div><div style="font-size:13px;color:var(--hint-color);">' + window.escapeHTML(window.t('dossierOwnedProjectSyncMissing', {}, lang)) + '</div></div>';

    var instructionsHtml = '<div class="details-block"><div class="detail-section-title">' + window.escapeHTML(window.t('devInfo', {}, lang)) + '</div><div class="detail-instruction-body">' + (project.instructions ? escapeHtmlWithBreaks(project.instructions) : '—') + '</div></div>';
    var economicsHtml = '';
    if (Number(project.bounty_per_tester || 0) > 0) {
        var perTester = Number(project.bounty_per_tester || 0);
        var dailyReward = perTester * 0.65 / 14;
        var holdBonus = perTester * 0.35;
        economicsHtml = '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('contractEconomicsTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px;line-height:1.7;color:var(--text-color);">' +
                '<div>' + window.escapeHTML(window.t('contractDailyReward', { amount: formatUiAmount(dailyReward, 1) }, lang)) + '</div>' +
                '<div style="margin-top:6px;">' + window.escapeHTML(window.t('contractHoldBonus', { amount: formatUiAmount(holdBonus, 1) }, lang)) + '</div>' +
            '</div>' +
        '</div>';
    }

    body.innerHTML =
        '<div class="detail-header">' +
            renderIcon(project.name || '', project.icon_url) +
            '<div class="card-info">' +
                '<div class="card-title notranslate">' + safeName + '</div>' +
                '<div class="card-subtitle notranslate">' + safePackage + '</div>' +
                dossierMetaChipsHtml +
            '</div>' +
        '</div>' +
        '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('dossierOwnedProjectsTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px;line-height:1.7;color:var(--text-color);">' +
                window.escapeHTML(window.t('dossierOwnedProjectAdded', { date: createdDate ? formatDdMmYyyy(createdDate) : '—' }, lang)) + '<br>' +
                window.escapeHTML(window.t('dossierOwnedProjectEta', { count: leftDays }, lang)) + '<br>' +
                window.escapeHTML(getProjectModeText(project.mode)) + '<br>' +
                window.escapeHTML(window.t('detail_testers_label', { count: project.active_testers_count || 0 }, lang)) + '<br>' +
                window.escapeHTML(getProjectVisibilityMeta(project).label) +
            '</div>' +
        '</div>' +
        syncHtml +
        '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('detail_owner_label', {}, lang)) + '</div>' +
            '<div class="detail-owner-row">' +
                getAvatar(ownerUsername || '?') +
                '<div>' +
                    '<div class="detail-owner-name notranslate">' + ownerDisplay + '</div>' +
                    '<div class="detail-owner-status ' + ownerActivity.detailClass + '" style="cursor:pointer;" onclick="showOwnerLastSeenToast(\'' + escapeInlineJsString(project.last_owner_activity || '') + '\')">' +
                        window.escapeHTML(ownerActivity.label) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.escapeHTML(reliabilityLine) + '</div>' +
        '</div>' +
        instructionsHtml +
        economicsHtml +
        '<div class="detail-actions">' +
            contactButtonHtml +
            '<button class="btn" style="background:rgba(52,199,89,0.14);color:#34c759;" onclick="tg.openLink(\'' + escapeInlineJsString(project.package_name || '') + '\')">' + window.escapeHTML(window.t('openGooglePlay', {}, lang)) + '</button>' +
            (joinBlocked
                ? '<button class="btn disabled" style="background:rgba(142,142,147,0.18);color:var(--hint-color);" disabled>' + window.escapeHTML(window.t('dossierBtnTakeTestBlocked', {}, lang)) + '</button>'
                : '<button class="btn" style="background:rgba(0,122,255,0.16);color:var(--button-color);" onclick="' + takeAction + '">' + window.escapeHTML(window.t('dossierBtnTakeTest', {}, lang)) + '</button>') +
        '</div>';

    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.dataset.appId = '';
        modal.classList.add('active');
    }
}

function _normalizeDossierVisibilityProject(raw) {
    if (!raw) return { is_visible: true, is_accepting_new_testers: true, visibility_mode: 'visible' };
    const explicitMode = String(raw.visibility_mode || raw._legacy_visibility_mode || '').trim().toLowerCase();
    let visibilityMode = '';

    if (explicitMode === 'full_isolation' || explicitMode === 'isolated') {
        visibilityMode = 'full_isolation';
    } else if (explicitMode === 'hidden_from_showcase' || explicitMode === 'hidden_manual') {
        visibilityMode = 'hidden_from_showcase';
    } else if (explicitMode === 'visible' || explicitMode === 'public') {
        visibilityMode = 'visible';
    }

    if (!visibilityMode) {
        const visibleFalse = _isDossierFlagFalse(raw.is_visible);
        const acceptsFalse = _isDossierFlagFalse(raw.is_accepting_new_testers);
        if (visibleFalse && acceptsFalse) {
            visibilityMode = 'full_isolation';
        } else if (visibleFalse) {
            visibilityMode = 'hidden_from_showcase';
        } else {
            visibilityMode = 'visible';
        }
    }

    const legacyMode = visibilityMode === 'full_isolation'
        ? 'isolated'
        : (visibilityMode === 'hidden_from_showcase' ? 'hidden_manual' : 'public');
    return {
        is_visible: visibilityMode === 'visible',
        is_accepting_new_testers: visibilityMode !== 'full_isolation',
        visibility_mode: visibilityMode,
        _legacy_visibility_mode: legacyMode,
    };
}

function _buildDossierProjectMetaChips(ownedProject) {
    if (!ownedProject) return '';
    const status = String(ownedProject.status || '').toLowerCase();
    const isArchivedLike = status === 'completed' || status === 'archived';
    
    const visibilitySnapshot = _normalizeDossierVisibilityProject(ownedProject);
    const chips = [];
    
    if (isArchivedLike) {
        chips.push('<span class="dossier-project-meta-chip dossier-project-meta-chip-completed" style="background: rgba(52, 199, 89, 0.14); color: #30d158;">' + window.escapeHTML(window.t('dossierOwnedProjectCompleted', {}, lang)) + '</span>');
    }
    if (visibilitySnapshot.visibility_mode === 'hidden_from_showcase') {
        chips.push('<span class="dossier-project-meta-chip dossier-project-meta-chip-hidden">' + window.escapeHTML(window.t('dossierVisibilityHidden', {}, lang)) + '</span>');
    } else if (visibilitySnapshot.visibility_mode === 'full_isolation') {
        chips.push('<span class="dossier-project-meta-chip dossier-project-meta-chip-isolated">' + window.escapeHTML(window.t('dossierVisibilityIsolated', {}, lang)) + '</span>');
    }
    if (_isDossierEmailTestProject(ownedProject) || (ownedProject && ownedProject.test_mode === 'email_list')) {
        chips.push('<span class="dossier-project-meta-chip dossier-project-meta-chip-email">📧 ' + window.escapeHTML(window.t('emailTestBadge', {}, lang)) + '</span>');
    }
    if (!chips.length) return '';
    return '<div class="dossier-project-meta-chips">' + chips.join('') + '</div>';
}

function _isDossierProjectJoinBlocked(ownedProject) {
    return _normalizeDossierVisibilityProject(ownedProject).visibility_mode === 'full_isolation';
}

function _normalizeDossierOwnedProjectRow(raw) {
    const appId = Number(raw && (raw.app_id != null ? raw.app_id : raw.id) || 0);
    if (appId <= 0) return null;
    const status = String(raw.status || raw.app_status || 'active').toLowerCase() || 'active';
    const linkType = String(raw.link_type || 'none').toLowerCase() || 'none';
    const daysLeftRaw = raw.days_left;
    const daysLeft = daysLeftRaw == null || daysLeftRaw === ''
        ? null
        : Math.max(0, Number(daysLeftRaw) || 0);
    const direction = String(raw.direction || 'none').toLowerCase();
    const visibilitySnapshot = _normalizeDossierVisibilityProject(raw);
    return {
        app_id: appId,
        name: String(raw.name || '').trim(),
        package_name: String(raw.package_name || raw.package || '').trim(),
        icon_url: raw.icon_url || '',
        instructions: raw.instructions || '',
        status: status,
        mode: String(raw.mode || 'mutual').toLowerCase() || 'mutual',
        created_at: raw.created_at || null,
        finished_at: raw.finished_at || null,
        google_sync_day: Number(raw.google_sync_day || 0),
        last_sync_date: raw.last_sync_date || null,
        last_owner_activity: raw.last_owner_activity || null,
        bounty_per_tester: Number(raw.bounty_per_tester || 0),
        active_testers_count: Number(raw.active_testers_count || 0),
        sync_message: raw.sync_message || '',
        is_visible: visibilitySnapshot.is_visible,
        is_accepting_new_testers: visibilitySnapshot.is_accepting_new_testers,
        visibility_mode: visibilitySnapshot.visibility_mode,
        test_mode: _isDossierEmailTestProject(raw) ? 'email_list' : 'google_group',
        link_type: linkType,
        direction: direction,
        linked_my_app_name: String(raw.linked_my_app_name || '').trim(),
        days_left: daysLeft,
    };
}

function _normalizeDossierProjectsList(apiProjects) {
    return (apiProjects || [])
        .map(_normalizeDossierOwnedProjectRow)
        .filter(Boolean);
}

function _buildDossierProjectLinkSubtitle(ownedProject, options) {
    options = options || {};
    const linkType = String(
        ownedProject && ownedProject.link_type || options.fallbackLinkType || 'none'
    ).toLowerCase();
    const direction = String(
        ownedProject && ownedProject.direction || options.fallbackDirection || 'none'
    ).toLowerCase();
    const status = String(ownedProject && ownedProject.status || 'active').toLowerCase();
    const linkedName = String(
        ownedProject && ownedProject.linked_my_app_name || options.fallbackLinkedMyAppName || ''
    ).trim();

    const isArchivedLike = status === 'completed' || status === 'archived';

    if (linkType === 'mutual') {
        if (linkedName) {
            return isArchivedLike
                ? window.t('dossierLinkMutualArchived', { app: linkedName }, lang)
                : window.t('dossierLinkMutual', { app: linkedName }, lang);
        }
        return window.t('dossierLinkMutualBare', {}, lang);
    }
    if (linkType === 'direct') {
        if (direction === 'i_test_them') return window.t('dossierLinkDirectITestThem', {}, lang);
        if (direction === 'they_test_me') return window.t('dossierLinkDirectTheyTestMe', {}, lang);
        return window.t('dossierLinkDirect', {}, lang);
    }
    if (linkType === 'contract') {
        if (direction === 'i_test_them') return window.t('dossierLinkContractITestThem', {}, lang);
        if (direction === 'they_test_me') return window.t('dossierLinkContractTheyTestMe', {}, lang);
        return window.t('dossierLinkContract', {}, lang);
    }
    return window.t('dossierLinkNone', {}, lang);
}

function _getDossierProjectDisplayName(ownedProject) {
    return String(
        ownedProject && (ownedProject.name || ownedProject.package_name) || window.t('unknownLabel', {}, lang)
    ).trim() || window.t('unknownLabel', {}, lang);
}

function _resolveDossierOwnedProjects(tester, testerProjects) {
    const reciprocalOwnedProjectId = Number(tester && tester.reciprocal_app_id || 0);
    let relevant = _normalizeDossierProjectsList(testerProjects);

    // Fallback: reciprocal metadata is known from the mutual link, but the projects API
    // did not return the row (stale cache, archived edge case, etc.).
    if (reciprocalOwnedProjectId > 0 && !relevant.some(ownedProject => Number(ownedProject && ownedProject.app_id || 0) === reciprocalOwnedProjectId) && tester) {
        relevant.push({
            app_id: reciprocalOwnedProjectId,
            name: tester.reciprocal_app_name || '',
            package_name: tester.reciprocal_app_package_name || '',
            icon_url: '',
            status: String(tester.reciprocal_app_status || 'active').toLowerCase() || 'active',
            mode: 'mutual',
            created_at: null,
            finished_at: null,
            link_type: 'mutual',
            direction: 'they_test_me',
            linked_my_app_name: '',
            days_left: null,
        });
    }
    if (reciprocalOwnedProjectId > 0) {
        relevant.sort((a, b) => {
            const aId = Number(a && a.app_id || 0);
            const bId = Number(b && b.app_id || 0);
            if (aId === reciprocalOwnedProjectId && bId !== reciprocalOwnedProjectId) return -1;
            if (bId === reciprocalOwnedProjectId && aId !== reciprocalOwnedProjectId) return 1;
            return 0;
        });
    }

    return { reciprocalOwnedProjectId: reciprocalOwnedProjectId, relevant: relevant };
}

function _resolveDossierProjectBlocks(tester, marketCandidate, relevantProjects, focusAppId) {
    const otherProjects = (relevantProjects || []).filter(function(ownedProject) {
        const rowId = String(
            ownedProject && (ownedProject.app_id != null ? ownedProject.app_id : ownedProject.id) || ''
        ).trim();
        return !!rowId && rowId !== '0';
    });

    return {
        linkedState: 'none',
        linkedProject: null,
        otherProjects: otherProjects,
        focusAppId: 0,
    };
}

function _renderDossierOwnedProjectCard(ownedProject, testerId, linkedOwnedProjectId, todayDate, options) {
    options = options || {};
    const displayName = _getDossierProjectDisplayName(ownedProject);
    const safeOwnedName = window.escapeHTML(displayName);
    const linkSubtitle = _buildDossierProjectLinkSubtitle(ownedProject, {
        fallbackLinkType: options.fallbackLinkType,
        fallbackDirection: options.fallbackDirection,
        fallbackLinkedMyAppName: options.fallbackLinkedMyAppName,
    });
    const safeLinkSubtitle = window.escapeHTML(linkSubtitle);
    const isLinkedProject = Number(ownedProject.app_id || 0) === Number(linkedOwnedProjectId || 0);
    const status = String(ownedProject.status || 'active').toLowerCase();
    const isArchivedLike = status === 'completed' || status === 'archived';

    let cardClass = 'dossier-owned-project-card';
    if (isArchivedLike) {
        cardClass += ' is-archived';
    }
    const innerOpen = isArchivedLike
        ? '<div class="' + cardClass + '" style="cursor:default;">'
        : '<button type="button" class="' + cardClass + '" onclick="openTesterOwnedProjectFromDossier(' + testerId + ', ' + Number(ownedProject.app_id) + ')">';
    const archivedChipHtml = isArchivedLike
        ? '<div class="dossier-linked-archived-chip">' + window.escapeHTML(window.t('dossierOwnedProjectCompleted', {}, lang)) + '</div>'
        : '';

    return innerOpen +
        '<div class="dossier-owned-project-card-inner">' +
            renderIcon(displayName, ownedProject.icon_url) +
            '<div class="dossier-owned-project-body">' +
                '<div class="dossier-owned-project-top">' +
                    '<div style="flex:1;min-width:0;">' +
                        '<div class="dossier-owned-project-title notranslate">' + safeOwnedName + '</div>' +
                        '<div class="dossier-owned-project-subtitle notranslate">' + safeLinkSubtitle + '</div>' +
                        archivedChipHtml +
                    '</div>' +
                    (isArchivedLike ? '' : '<div class="dossier-owned-project-arrow">›</div>') +
                '</div>' +
            '</div>' +
        '</div>' +
        (isArchivedLike ? '</div>' : '</button>');
}

function _renderDossierOtherProjectMiniCard(ownedProject, testerId) {
    const displayName = _getDossierProjectDisplayName(ownedProject);
    const safeOwnedName = window.escapeHTML(displayName);
    const linkSubtitle = _buildDossierProjectLinkSubtitle(ownedProject);
    const safeLinkSubtitle = window.escapeHTML(linkSubtitle);
    const linkType = String(ownedProject.link_type || 'none').toLowerCase();
    const daysLeft = ownedProject.days_left;
    const showDaysLeft = linkType !== 'none' && daysLeft != null;
    const daysLeftHtml = showDaysLeft
        ? '<div class="dossier-other-mini-days">' + window.escapeHTML(window.t('dossierLinkDaysLeft', { count: daysLeft }, lang)) + '</div>'
        : '';
    const status = String(ownedProject.status || 'active').toLowerCase();
    const isArchivedLike = status === 'completed' || status === 'archived';
    const isJoinBlocked = _isDossierProjectJoinBlocked(ownedProject);
    const metaChipsHtml = _buildDossierProjectMetaChips(ownedProject);
    let cardStyle = '';
    if (isArchivedLike) {
        cardStyle = ' style="opacity: 0.6; pointer-events: none;"';
    }
    const cardTag = (isArchivedLike || isJoinBlocked)
        ? '<div class="dossier-other-mini-card' + (isArchivedLike ? ' is-archived' : '') + (isJoinBlocked ? ' is-join-blocked' : '') + '"' + cardStyle + '>'
        : '<button type="button" class="dossier-other-mini-card" onclick="openTesterOwnedProjectFromDossier(' + testerId + ', ' + Number(ownedProject.app_id) + ')">';

    return cardTag +
        '<div class="dossier-other-mini-inner">' +
            renderIcon(displayName, ownedProject.icon_url) +
            '<div class="dossier-other-mini-body">' +
                '<div class="dossier-other-mini-title notranslate">' + safeOwnedName + '</div>' +
                '<div class="dossier-other-mini-subtitle notranslate">' + safeLinkSubtitle + '</div>' +
                metaChipsHtml +
                daysLeftHtml +
            '</div>' +
        '</div>' +
        ((isArchivedLike || isJoinBlocked) ? '</div>' : '</button>');
}

async function openDossierModal(username, testerId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const modal = document.getElementById('dossier-modal');
    document.getElementById('dossier-modal-title').innerText = username ? `@${username}` : window.t('idLabel', { id: testerId }, lang);
    document.getElementById('dossier-body').innerHTML = `<p style="text-align:center; color: var(--hint-color);">${t.dossierLoading}</p>`;
    modal.classList.add('active');

    const project = myProjects.find((item) => Number(item.id) === Number(appId));
    const tester = project ? (project.testers || []).find((candidate) => Number(candidate.tester_id) === Number(testerId)) : null;
    const marketCandidate = getMarketCandidateByAppId(appId, testerId);
    const today = getLocalDate();
    const todayDate = new Date(today);

    let testingDay = 0;
    let startDateStr = '';
    let expectedFinish = '';
    let lastCheckStatus = '';
    if (tester) {
        if (tester.start_date) {
            const sd = new Date(tester.start_date);
            testingDay = Math.floor((todayDate - sd) / (1000 * 60 * 60 * 24)) + 1;
            startDateStr = tester.start_date;
            const finishDate = new Date(sd);
            finishDate.setDate(finishDate.getDate() + 13);
            expectedFinish = finishDate.toISOString().split('T')[0];
        }
        if (!tester.last_check_date) {
            lastCheckStatus = t.statusNotOpened;
        } else if (tester.last_check_date === today) {
            lastCheckStatus = t.statusToday;
        } else {
            const diff = Math.floor(Math.abs(todayDate - new Date(tester.last_check_date)) / (1000 * 60 * 60 * 24));
            lastCheckStatus = diff === 1 ? t.statusYesterday : `${diff} ${t.statusDaysAgo}`;
        }
    }

    const tgName = username || '';
    const safeTelegramUsername = escapeInlineJsString(tgName);

    let profile = { karma: 0, completed_tests: 0, total_expected_checkins: 0, total_actual_checkins: 0 };
    try {
        const resp = await fetch(`${API_BASE}/users/${testerId}/profile`);
        if (resp.ok) profile = await resp.json();
    } catch (error) {
        console.error('Dossier fetch error:', error);
    }

    const reciprocalOwnedProjectId = Number(tester && tester.reciprocal_app_id || 0);
    const dossierContextTester = tester || (reciprocalOwnedProjectId > 0
        ? {
            reciprocal_app_id: reciprocalOwnedProjectId,
            reciprocal_app_name: tester && tester.reciprocal_app_name || '',
            reciprocal_app_package_name: tester && tester.reciprocal_app_package_name || '',
            reciprocal_app_status: tester && tester.reciprocal_app_status || 'active',
        }
        : (marketCandidate && marketCandidate.market_kind === 'mutual-return'
            ? { join_type: marketCandidate.join_type || 'invite' }
            : null));
    let testerProjects = [];
    let relations = [];
    try {
        const projectsParams = new URLSearchParams();
        if (Number(userId || 0) > 0) {
            projectsParams.set('viewer_id', String(userId));
        }
        if (reciprocalOwnedProjectId > 0) {
            projectsParams.set('focus_app_id', String(reciprocalOwnedProjectId));
        }
        if (Number(appId || 0) > 0) {
            projectsParams.set('context_app_id', String(appId));
        }
        const projectsQuery = projectsParams.toString();
        const projectsUrl = `${API_BASE}/users/${testerId}/projects` + (projectsQuery ? `?${projectsQuery}` : '');
        const resp = await fetch(projectsUrl);
        let data = {};
        try {
            data = await resp.json();
        } catch (parseError) {
            console.error('Dossier projects JSON parse error:', parseError);
        }
        console.log('[DOSSIER DIAGNOSTICS] RAW API RESPONSE:', resp.status, data);
        if (resp.ok) {
            if (Array.isArray(data)) {
                testerProjects = data;
            } else if (data && typeof data === 'object') {
                testerProjects = Array.isArray(data.projects) ? data.projects : [];
                relations = Array.isArray(data.relations) ? data.relations : [];
            } else {
                testerProjects = [];
                console.warn('[DOSSIER DIAGNOSTICS] Unexpected projects payload shape:', data);
            }
        } else {
            console.warn('[DOSSIER DIAGNOSTICS] projects request failed:', resp.status, projectsUrl);
        }
    } catch (error) {
        console.error('Dossier projects fetch error:', error);
    }
    const dossierOwnerProfile = _resolveDossierOwnerProfile(testerId, appId, tgName, tester, marketCandidate);
    testerProjects = testerProjects.map(function(item) {
        return Object.assign({}, item, dossierOwnerProfile);
    });
    const ownedProjectsResolved = _resolveDossierOwnedProjects(dossierContextTester, testerProjects);
    const relevantTesterProjects = ownedProjectsResolved.relevant.map(function(item) {
        return Object.assign({}, item, dossierOwnerProfile);
    });
    const linkedOwnedProjectId = Number(ownedProjectsResolved.reciprocalOwnedProjectId || 0);
    const dossierBlocks = _resolveDossierProjectBlocks(dossierContextTester, marketCandidate, relevantTesterProjects, linkedOwnedProjectId > 0 ? linkedOwnedProjectId : 0);
    console.log('[DOSSIER DIAGNOSTICS] PROCESSED BLOCKS:', {
        rawCount: testerProjects.length,
        otherCount: dossierBlocks.otherProjects.length,
        linkedState: dossierBlocks.linkedState,
    });
    _dossierProjectsCache[String(testerId)] = relevantTesterProjects;
    _dossierProfilesCache[String(testerId)] = Object.assign({}, profile, dossierOwnerProfile);

    const reliabilityState = getDossierReliabilityState(profile);
    const expected = reliabilityState.expected;
    const actual = reliabilityState.actual;
    const reliabilityPct = reliabilityState.reliabilityPct;
    const reliabilityText = reliabilityState.reliabilityText;
    // Reliability row hidden in dossier global profile until calculation is fixed:
    // expected >= 42 ? t.dossierReliability.replace('{pct}', reliabilityPct) + ' ' + reliabilityText : t.disciplineLabel + ' ' + t.dossierNewbie

    const likesAvailable = project ? (project.likes_max - project.likes_used) : 0;
    const alreadyLiked = project ? (project.likes || []).some((like) => like.tester_id === testerId) : true;
    const canReward = likesAvailable > 0 && !alreadyLiked;
    const canDeleteFromProject = !!tester && !!project && !!appId && testingDay > 0 && testingDay <= 7;
    const canTakeFromShowcase = !!marketCandidate && !project && !marketCandidate.is_own_project
        && marketCandidate.market_kind !== 'mutual-return';
    const takeFromShowcaseDisabled = !!(marketCandidate && marketCandidate.has_pending_offer);
    const takeFromShowcaseIsPrelaunch = !!(marketCandidate && marketCandidate.market_kind === 'mutual-prelaunch');

    let html = '';
    const goldenCountText = (profile.golden_count || 0) > 0
        ? window.t('dossierGoldenCount', { count: profile.golden_count })
        : '';
    html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierGlobalTitle}</div>
        <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
            ${t.dossierExperience.replace('{count}', profile.completed_tests)}
            <br>${t.dossierKarma.replace('{karma}', profile.karma)}
            ${goldenCountText ? '<br><span class="golden-badge">' + window.escapeHTML(goldenCountText) + '</span>' : ''}
        </div>
    </div>`;

    let relationsHtml = '';
    if (relations.length > 0) {
        relationsHtml = '<div class="dossier-relations-list" style="display:flex; flex-direction:column; gap:8px;">';
        relations.forEach(function(rel) {
            let relText = '';
            function formatRelationAppName(name, status) {
                const escapedName = window.escapeHTML(name);
                if (status === 'completed' || status === 'archived') {
                    const tagText = lang === 'ru' ? 'Завершен' : 'Completed';
                    return escapedName + ' <span style="color:#ff9800; font-weight:bold;">(' + tagText + ')</span>';
                }
                return escapedName;
            }
            const myAppFormatted = rel.my_app ? formatRelationAppName(rel.my_app, rel.my_app_status) : '';
            const theirAppFormatted = rel.their_app ? formatRelationAppName(rel.their_app, rel.their_app_status) : '';

            if (rel.type === 'mutual') {
                relText = window.t('dossierRelationMutual', { my_app: myAppFormatted, their_app: theirAppFormatted }, lang);
            } else if (rel.type === 'direct_they_test_me') {
                relText = window.t('dossierRelationTheyTestMe', { my_app: myAppFormatted }, lang);
            } else if (rel.type === 'direct_i_test_them') {
                relText = window.t('dossierRelationITestThem', { their_app: theirAppFormatted }, lang);
            } else if (rel.type === 'contract_they_test_me') {
                relText = window.t('dossierRelationContractTheyTestMe', { my_app: myAppFormatted }, lang);
            } else if (rel.type === 'contract_i_test_them') {
                relText = window.t('dossierRelationContractITestThem', { their_app: theirAppFormatted }, lang);
            }
            if (relText) {
                relationsHtml += '<div class="dossier-relation-item" style="padding:10px 12px; background:var(--secondary-bg-color); border-radius:10px; font-size:13px; font-weight:500; line-height:1.4;">' + relText + '</div>';
            }
        });
        relationsHtml += '</div>';
    } else {
        relationsHtml = '<div class="dossier-owned-project-empty">' + window.escapeHTML(window.t('dossierRelationsEmpty', {}, lang)) + '</div>';
    }

    const otherProjectsHtml = dossierBlocks.otherProjects.length
        ? '<div class="dossier-other-projects-carousel">' + dossierBlocks.otherProjects.map(function(ownedProject) {
            return _renderDossierOtherProjectMiniCard(ownedProject, testerId);
        }).join('') + '</div>'
        : '<div class="dossier-owned-project-empty">' + window.escapeHTML(window.t('dossierOtherProjectsEmpty', {}, lang)) + '</div>';

    html += '<div style="margin-bottom: 16px;">' +
        '<div style="font-weight: 600; margin-bottom: 8px;">' + window.escapeHTML(window.t('dossierLinkedProjectTitle', {}, lang)) + '</div>' +
        relationsHtml +
        '<div style="font-weight: 600; margin: 14px 0 8px;">' + window.escapeHTML(window.t('dossierOtherProjectsTitle', {}, lang)) + '</div>' +
        otherProjectsHtml +
    '</div>';

    if (tester) {
        const sourceMeta = getTesterSourceMeta(tester.join_type);
        const sourceText = window.escapeHTML(sourceMeta.icon + ' ' + sourceMeta.label);
        const actualSkips = Math.max(0, Math.max(0, testingDay - 1) - Number(tester.checkins_count || 0));
        html += `<div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierProjectTitle}</div>
            <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
                ${window.t('dossierDaysInTest', { count: testingDay }, lang)}
                <br>${t.dossierTestingDay.replace('{day}', Math.min(testingDay, 14))}
                <br>${window.t('dossierCheckins', { count: tester.checkins_count || 0 }, lang)}
                <br>${t.dossierMissedDays.replace('{count}', actualSkips)}
                ${startDateStr ? '<br>' + t.dossierStartDate.replace('{date}', startDateStr) : ''}
                ${expectedFinish ? '<br>' + t.dossierExpectedFinish.replace('{date}', expectedFinish) : ''}
                <br>${t.dossierLastCheck.replace('{status}', lastCheckStatus)}
                <br>${t.dossierSource.replace('{source}', sourceText)}
            </div>
        </div>`;
    } else if (marketCandidate && marketCandidate.market_kind === 'mutual-return') {
        const sourceMeta = getTesterSourceMeta(marketCandidate.join_type);
        const sourceText = window.escapeHTML(sourceMeta.icon + ' ' + sourceMeta.label);
        const contextText = window.escapeHTML(window.t('mutualReturnContext', { project: marketCandidate.my_project_name || '' }, lang));
        html += `<div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierProjectTitle}</div>
            <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
                ${window.escapeHTML(window.t('mutualReturnsSectionTitle', {}, lang))}
                <br>${contextText}
                <br>${t.dossierSource.replace('{source}', sourceText)}
            </div>
        </div>`;
    }

    html += `<div>
        <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierActionsTitle}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${tgName ? `<button class="btn" style="width: 100%; background: var(--secondary-bg-color); color: var(--link-color); border: none; font-weight: 600; padding: 10px;" onclick="event.stopPropagation(); tg.openTelegramLink('https://t.me/${safeTelegramUsername}')">${t.dossierBtnTelegram}</button>` : ''}
            ${canTakeFromShowcase ? `<button class="btn ${takeFromShowcaseDisabled ? 'pending disabled' : 'btn-primary'}" style="width: 100%; border: none; font-weight: 600; padding: 10px;" ${takeFromShowcaseDisabled ? 'disabled' : `onclick="closeDossierModal(); ${takeFromShowcaseIsPrelaunch ? `openPrelaunchJoinModal(${appId}, ${Number(marketCandidate.owner_id || 0)}, event)` : `createMutualOffer(${appId}, ${Number(marketCandidate.owner_id || 0)}, event)`}"`}>${window.escapeHTML(window.t(takeFromShowcaseDisabled ? 'offerPending' : 'dossierBtnTakeTest', {}, lang))}</button>` : ''}
            ${canReward ? `<button class="btn" style="width: 100%; background: rgba(255,204,0,0.15); color: #ffcc00; border: none; font-weight: 600; padding: 10px;" onclick="closeDossierModal(); showKarmaPopup(${appId}, ${testerId})">${t.dossierBtnKarma}</button>` : ''}
            ${canDeleteFromProject ? `<button class="btn" style="width: 100%; background: rgba(255,59,48,0.1); color: #ff3b30; border: none; font-weight: 600; padding: 10px;" onclick="closeDossierModal(); openKickTesterModal(${appId}, ${testerId})">${t.dossierBtnDelete}</button>` : ''}
        </div>
    </div>`;

    document.getElementById('dossier-body').innerHTML = html;
}

function closeDossierModal(event) {
    if (event && event.target && event.target.id !== 'dossier-modal') return;
    document.getElementById('dossier-modal').classList.remove('active');
}

function openTimelineStatsSheet(appId) {
    var test = myTests.find(function(t) { return t.id === appId; });
    var modal = document.getElementById('timeline-stats-modal');
    var body = document.getElementById('timeline-stats-body');
    if (!test || !modal || !body) return;
    var timelineMeta = getTestingTimelineMeta(test);
    var progressData = buildGrantProgressSegments(test, timelineMeta.userTestingDay, timelineMeta.expectedTotalDays);

    var sc = progressData.standardCheckins;
    var ss = progressData.standardSkips;
    var oc = progressData.overtimeCheckins;
    var os = progressData.overtimeSkips;
    var totalDone = sc + ss + oc + os;
    var testingDay = timelineMeta.userTestingDay || totalDone || 1;
    var overtimeDays = Math.max(0, totalDone - 14);
    var baseDone = Math.min(14, sc + ss);
    var remainingDays = Math.max(0, progressData.remainingDays);
    var finishDateText = timelineMeta.finishDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');

    body.innerHTML =
        '<div class="timeline-sheet-head">' +
            '<div class="timeline-sheet-title">' + window.escapeHTML(window.t('timelineSheetTitle', {}, lang)) + '</div>' +
            '<div class="timeline-sheet-subtitle">' + window.escapeHTML(test.name || window.t('unknownLabel', {}, lang)) + '</div>' +
        '</div>' +
        progressData.html +
        '<div class="timeline-sheet-grid">' +
            '<div class="timeline-sheet-stat"><span class="timeline-sheet-stat-label">' + window.escapeHTML(window.t('timelineStatsCurrentDayShort', {}, lang)) + '</span><strong>' + testingDay + '</strong></div>' +
            '<div class="timeline-sheet-stat"><span class="timeline-sheet-stat-label">' + window.escapeHTML(window.t('timelineStatsBaseProgress', {}, lang)) + '</span><strong>' + baseDone + '/14</strong></div>' +
            '<div class="timeline-sheet-stat"><span class="timeline-sheet-stat-label">' + window.escapeHTML(window.t('timelineStatsSkipsShort', {}, lang)) + '</span><strong>' + (ss + os) + '</strong></div>' +
            '<div class="timeline-sheet-stat"><span class="timeline-sheet-stat-label">' + window.escapeHTML(window.t('timelineStatsRemainingDaysShort', {}, lang)) + '</span><strong>' + remainingDays + '</strong></div>' +
        '</div>' +
        '<div class="timeline-sheet-facts">' +
            (timelineMeta.isSynced ? '<div class="timeline-sheet-fact">' + window.escapeHTML(window.t('syncOfficialDay', { day: timelineMeta.currentGoogleDay }, lang)) + '</div>' : '') +
            '<div class="timeline-sheet-fact">' + window.escapeHTML(window.t('timelineStatsRemainingDays', { count: remainingDays }, lang)) + '</div>' +
            '<div class="timeline-sheet-fact">' + window.escapeHTML(window.t('timelineStatsFinishDate', { date: finishDateText }, lang)) + '</div>' +
            (overtimeDays > 0 ? '<div class="timeline-sheet-fact">' + window.escapeHTML(window.t('timelineStatsOvertimeDays', { count: overtimeDays }, lang)) + '</div>' : '') +
            (timelineMeta.isSynced && timelineMeta.projectDaysLeft > 0 ? '<div class="timeline-sheet-fact">' + window.escapeHTML(window.t('timelineOvertimeRewardNote', {}, lang)) + '</div>' : '') +
        '</div>';

    modal.classList.add('active');
}

function closeTimelineStatsSheet(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('timeline-stats-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function showTimelineStats(appId) {
    openTimelineStatsSheet(appId);
}

window.showTimelineStats = showTimelineStats;
window.openTimelineStatsSheet = openTimelineStatsSheet;
window.closeTimelineStatsSheet = closeTimelineStatsSheet;

function _getProjectOwnerLinkMeta(project, targetOwnerId, fallbackOwnerAppName) {
    const testers = Array.isArray(project && project.testers) ? project.testers : [];
    const ownerTester = testers.find(function(tester) {
        return Number(tester && tester.tester_id || 0) === Number(targetOwnerId);
    });
    if (!ownerTester) return null;

    let linkedProjectName = String(ownerTester.reciprocal_app_name || ownerTester.reciprocal_app_package_name || '').trim();
    if (!linkedProjectName) {
        const myLinkedTest = (myTests || []).find(function(test) {
            return Number(test && test.owner_id || 0) === Number(targetOwnerId)
                && Number(test.reciprocal_app_id || 0) === Number(project && project.id || 0);
        });
        if (myLinkedTest) {
            linkedProjectName = String(myLinkedTest.name || myLinkedTest.package || '').trim();
        }
    }
    if (!linkedProjectName) {
        linkedProjectName = String(fallbackOwnerAppName || '').trim();
    }

    return {
        linkedProjectName: linkedProjectName || window.t('unknownLabel', {}, lang),
        joinType: String(ownerTester.join_type || '').toLowerCase(),
    };
}

function showProjectSelectModal(projects, targetAppId, targetOwnerId, options) {
    let modal = document.getElementById('project-select-modal');
    if (!modal) return;
    const listEl = document.getElementById('project-select-list');
    const footerEl = document.getElementById('project-select-footer');
    if (!listEl) return;
    const modalTitle = modal.querySelector('h3');
    const isPrelaunch = !!(options && options.is_prelaunch);
    const blockedProjects = options && options.blockedProjects ? options.blockedProjects : {};
    const targetOwnerHasEmail = !!(options && options.targetOwnerHasEmail);
    const fallbackOwnerAppName = options && options.targetAppName ? String(options.targetAppName) : '';

    if (isPrelaunch) {
        if (modalTitle) {
            modalTitle.textContent = window.t('prelaunchJoinModalTitle', {}, lang);
        }
        listEl.innerHTML = `<div class="details-block"><div style="font-size:13px; line-height:1.6; color: var(--hint-color);">${window.escapeHTML(window.t('mutualPrelaunchDesc', {}, lang))}</div></div>`;
        if (footerEl) {
            footerEl.innerHTML = `<button class="btn btn-secondary project-select-direct-btn" style="width: 100%;" onclick="closeProjectSelectModal(); joinMutual(${targetAppId}, true);">${window.escapeHTML(window.t('takeWithoutMutualBtn', {}, lang))}</button>`;
        }
        modal.classList.add('active');
        return;
    }

    if (modalTitle) {
        modalTitle.textContent = window.t('offerSelectProject', {}, lang);
    }
    const availableProjects = Array.isArray(projects) ? projects : [];
    listEl.innerHTML = availableProjects.length ? availableProjects.map(p => {
        const safeName = window.escapeHTML(p.name || window.t('unknownLabel'));
        const ownerLinkMeta = _getProjectOwnerLinkMeta(p, targetOwnerId, fallbackOwnerAppName);
        const targetAlreadyTesting = !!ownerLinkMeta;
        const blockedEntry = blockedProjects[String(p.id)] || null;
        const emailIncompatible = String(p.test_mode || 'google_group') === 'email_list' && !targetOwnerHasEmail;
        const isInBuffer = String(p.status || '').toLowerCase() === 'pending_completion';
        const isArchived = String(p.status || '').toLowerCase() === 'archived';
        const isInactiveStatus = isInBuffer || isArchived;
        const notAcceptingTesters = p.is_accepting_new_testers === false;
        const isDisabled = targetAlreadyTesting || !!blockedEntry || emailIncompatible || isInactiveStatus || notAcceptingTesters;
        const disabledClass = isDisabled ? ' disabled' : '';
        const linkedClass = targetAlreadyTesting ? ' is-owner-linked' : '';
        const badges = [];
        if (targetAlreadyTesting) {
            badges.push(`<span class="meta-chip accent-purple">${window.escapeHTML(window.t('alreadyTestingBadge', {}, lang))}</span>`);
        }
        if (blockedEntry) {
            badges.push(`<span class="meta-chip accent-orange">${window.escapeHTML(window.t('offerProjectLockedBadge', {}, lang))}</span>`);
        }
        if (emailIncompatible && !targetAlreadyTesting && !blockedEntry) {
            badges.push('<span class="project-select-lock">🔒</span>');
        }
        if (isInBuffer && !targetAlreadyTesting && !blockedEntry && !emailIncompatible) {
            badges.push(`<span class="meta-chip accent-yellow">${window.escapeHTML(window.t('offerProjectBufferBadge', {}, lang))}</span>`);
        }
        if (isArchived && !targetAlreadyTesting && !blockedEntry && !emailIncompatible) {
            badges.push(`<span class="meta-chip accent-red">${window.escapeHTML(window.t('offerProjectArchivedBadge', {}, lang))}</span>`);
        }
        if (notAcceptingTesters && !isInBuffer && !isArchived && !targetAlreadyTesting && !blockedEntry && !emailIncompatible) {
            badges.push(`<span class="meta-chip accent-orange">${window.escapeHTML(window.t('offerProjectNotAcceptingBadge', {}, lang))}</span>`);
        }
        const badgeHtml = badges.join('');
        let reasonHtml = '';
        if (targetAlreadyTesting && ownerLinkMeta) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('projectSelectOwnerLinkedDetails', { owner_app: ownerLinkMeta.linkedProjectName }, lang))}</span>`;
        } else if (blockedEntry) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectLockedDetails', { target_app: blockedEntry.target_app_name || window.t('unknownLabel', {}, lang) }, lang))}</span>`;
        } else if (emailIncompatible) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectGroupsOnly', {}, lang))}</span>`;
        } else if (isInBuffer) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectBufferDetails', {}, lang))}</span>`;
        } else if (isArchived) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectArchivedDetails', {}, lang))}</span>`;
        } else if (notAcceptingTesters) {
            reasonHtml = `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectNotAcceptingDetails', {}, lang))}</span>`;
        }

        const clickHandler = isDisabled
            ? 'event.preventDefault(); event.stopPropagation();'
            : `window._selectProjectForOffer(${p.id}); event.stopPropagation();`;

        return `<button class="project-select-item${disabledClass}${linkedClass}" onclick="${clickHandler}">
            <span class="project-select-icon">${renderIcon(p.name || '', p.icon_url)}</span>
            <span class="project-select-text">
                <span class="project-select-name">${safeName}</span>
                ${reasonHtml}
            </span>
            ${badgeHtml}
        </button>`;
    }).join('') : `<div class="details-block"><div style="font-size:13px; color: var(--hint-color);">${window.escapeHTML(window.t('offerNoProjects', {}, lang))}</div></div>`;
    window._selectProjectForOffer = async function(proposerAppId) {
        const selectedProject = availableProjects.find(function(item) { return Number(item.id) === Number(proposerAppId); });
        const proceed = async function() {
            await window.sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, {
                targetAppId: targetAppId,
                targetOwnerId: targetOwnerId,
            });
        };
        // EmailTesterModal: the user's selected project uses manual Email testing → confirm console setup first.
        if (selectedProject && String(selectedProject.test_mode || 'google_group') === 'email_list' && typeof window.openEmailTesterModal === 'function') {
            closeProjectSelectModal();
            window.openEmailTesterModal({
                actionLabel: window.t('emailTesterSendOfferBtn', {}, lang),
                loadEmails: function() {
                    return (typeof fetchOfferEmailPreview === 'function')
                        ? fetchOfferEmailPreview(targetAppId, proposerAppId)
                        : Promise.resolve({ ok: false, emails: [] });
                },
                onConfirm: function() { proceed(); },
            });
            return;
        }
        closeProjectSelectModal();
        await proceed();
    };
    if (footerEl) {
        footerEl.innerHTML = `<button class="btn btn-secondary project-select-direct-btn" style="width: 100%;" onclick="closeProjectSelectModal(); joinDirect(${targetAppId});">${window.escapeHTML(window.t('takeWithoutMutualBtn', {}, lang))}</button>`;
    }
    modal.classList.add('active');
}

function closeProjectSelectModal() {
    const modal = document.getElementById('project-select-modal');
    if (!modal) return;
    modal.classList.remove('active');
    const modalTitle = modal.querySelector('h3');
    if (modalTitle) {
        modalTitle.textContent = window.t('offerSelectProject', {}, lang);
    }
}

function openContractEconomyModal(projectId) {
    const project = (myProjects || []).find(function(item) { return Number(item.id) === Number(projectId); });
    const modal = document.getElementById('contract-economy-modal');
    const body = document.getElementById('contract-economy-body');
    if (!project || !modal || !body) return;

    const needed = Number(project.limit_bounty || 0);
    const testers = Array.isArray(project.testers) ? project.testers : [];
    const joined = testers.filter(function(tester) {
        return String(tester.join_type || '').toLowerCase() === 'bounty';
    }).length;
    const perTester = Number(project.bounty_per_tester || 0);
    const perCheckin = perTester > 0 ? (perTester * 0.65) / 14 : 0;
    const holdBonus = perTester > 0 ? perTester * 0.35 : 0;
    const totalBudget = needed * perTester;

    body.innerHTML = '' +
        `<h3>${window.escapeHTML(window.t('contractEconomicsTitle', {}, lang))}</h3>` +
        `<div class="details-block">` +
            `<div style="font-size:13px; line-height:1.8; color: var(--text-color);">` +
                `<div>${window.escapeHTML(window.t('contractEconomyNeed', { count: needed }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('contractEconomyCurrent', { count: joined }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('contractEconomyPerTester', { amount: formatUiAmount(perTester, 1) }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('contractEconomyPerCheckin', { amount: formatUiAmount(perCheckin, 1) }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('contractEconomyHold', { amount: formatUiAmount(holdBonus, 1) }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('contractEconomyBudget', { amount: formatUiAmount(totalBudget, 1) }, lang))}</div>` +
            `</div>` +
        `</div>` +
        `<button class="btn btn-secondary" style="width:100%;" onclick="closeContractEconomyModal()">${window.escapeHTML(window.t('btnClose', {}, lang))}</button>`;
    modal.classList.add('active');
}

function closeContractEconomyModal(event) {
    const modal = document.getElementById('contract-economy-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
}

function openKarmaSelectPopup(appId, testerId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    _karmaAppId = appId;
    _karmaTesterId = testerId;
    document.getElementById('karma-select-popup').classList.add('active');
}

function closeKarmaSelectPopup(event) {
    if (event && event.target && event.target.id !== 'karma-select-popup') return;
    document.getElementById('karma-select-popup').classList.remove('active');
    _karmaAppId = null;
    _karmaTesterId = null;
}

function confirmKarmaSelect(type) {
    if (_karmaAppId === null || _karmaTesterId === null) return;
    document.getElementById('karma-select-popup').classList.remove('active');
    sendKarmaReward(_karmaAppId, _karmaTesterId, type);
    _karmaAppId = null;
    _karmaTesterId = null;
}

/* === Email-testing interceptors (EmailTesterModal + email-collect gate) === */
var _emailCollectCtx = null;
function _emailCurrentUser() {
    return (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : String((window.App && window.App.userEmail) || '').trim();
}
function openEmailCollectModal(opts) {
    opts = opts || {};
    _emailCollectCtx = opts;
    var modal = document.getElementById('email-collect-modal');
    if (!modal) return;
    var titleEl = document.getElementById('email-collect-title');
    var textEl = document.getElementById('email-collect-text');
    var input = document.getElementById('email-collect-input');
    var errEl = document.getElementById('email-collect-error');
    var saveBtn = document.getElementById('email-collect-save');
    var skipBtn = document.getElementById('email-collect-skip');
    if (titleEl) titleEl.textContent = opts.title || window.t('emailGateOfferTitle', {}, lang);
    if (textEl) textEl.textContent = opts.text || '';
    if (input) input.value = _emailCurrentUser() || '';
    if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }
    if (saveBtn) { saveBtn.textContent = opts.primaryLabel || window.t('emailGateSaveContinue', {}, lang); saveBtn.onclick = _submitEmailCollect; }
    if (skipBtn) {
        if (opts.secondaryLabel) { skipBtn.style.display = ''; skipBtn.textContent = opts.secondaryLabel; skipBtn.onclick = _skipEmailCollect; }
        else { skipBtn.style.display = 'none'; skipBtn.onclick = null; }
    }
    modal.classList.add('active');
    setTimeout(function() { if (input) { try { input.focus(); } catch (e) {} } }, 60);
}
async function _submitEmailCollect() {
    var ctx = _emailCollectCtx || {};
    var input = document.getElementById('email-collect-input');
    var errEl = document.getElementById('email-collect-error');
    var saveBtn = document.getElementById('email-collect-save');
    var value = input ? String(input.value || '').trim() : '';
    if (typeof sanitizeSingleEmailInputValue === 'function') {
        value = sanitizeSingleEmailInputValue(value);
        if (input) input.value = value;
    }
    if (typeof isValidEmail === 'function' && !isValidEmail(value)) {
        var localCode = (typeof getEmailValidationErrorCode === 'function') ? getEmailValidationErrorCode(value) : 'invalid_email_format';
        var localMessage = (typeof getEmailValidationMessage === 'function') ? getEmailValidationMessage(localCode) : window.t('invalidEmail', {}, lang);
        if (errEl) { errEl.textContent = localMessage; errEl.style.display = 'block'; }
        return;
    }
    if (saveBtn) { saveBtn.disabled = true; saveBtn.classList.add('is-locked'); }
    var res = (typeof saveTesterEmail === 'function') ? await saveTesterEmail(value) : { ok: false };
    if (saveBtn) { saveBtn.disabled = false; saveBtn.classList.remove('is-locked'); }
    if (!res || !res.ok) {
        var msg = String(res && res.message || '').trim();
        if (!msg && typeof getEmailValidationMessage === 'function') {
            msg = getEmailValidationMessage(res && res.code);
        }
        if (!msg) msg = window.t('emailSaveFailed', {}, lang);
        if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
        return;
    }
    closeEmailCollectModal();
    if (typeof ctx.onSave === 'function') ctx.onSave(res.email);
}
function _skipEmailCollect() {
    var ctx = _emailCollectCtx || {};
    closeEmailCollectModal();
    if (typeof ctx.onSkip === 'function') ctx.onSkip();
}
function closeEmailCollectModal(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('email-collect-modal');
    if (modal) modal.classList.remove('active');
}

var _emailTesterCtx = null;
var _emailTesterToken = 0;
var _emailTesterPreviewMeta = null;

function _setEmailTesterAccordionOpen(isOpen) {
    var accordion = document.getElementById('email-tester-accordion');
    if (!accordion) return;
    accordion.classList.toggle('open', !!isOpen);
    var head = document.getElementById('email-tester-accordion-toggle');
    if (head) {
        head.setAttribute('aria-expanded', accordion.classList.contains('open') ? 'true' : 'false');
    }
}

function toggleEmailTesterAccordion() {
    var accordion = document.getElementById('email-tester-accordion');
    if (!accordion) return;
    _setEmailTesterAccordionOpen(!accordion.classList.contains('open'));
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function _setEmailTesterFomo(meta) {
    var fomoEl = document.getElementById('email-tester-fomo');
    if (!fomoEl) return;
    var found = Number(meta && meta.found);
    var total = Number(meta && meta.total);
    var visible = !!(meta && meta.isMassInvite && Number.isFinite(found) && Number.isFinite(total));
    if (!visible) {
        fomoEl.style.display = 'none';
        fomoEl.innerHTML = '';
        return;
    }
    fomoEl.style.display = '';
    fomoEl.innerHTML = window.t('emailTesterFomoHtml', {
        found: '<span class="email-tester-fomo-value">' + window.escapeHTML(String(found)) + '</span>',
        total: '<span class="email-tester-fomo-value">' + window.escapeHTML(String(total)) + '</span>'
    }, lang);
}

function _getEmailTesterCopyToastKey() {
    return _emailTesterPreviewMeta && _emailTesterPreviewMeta.isMassInvite ? 'emailTesterCopiedMass' : 'emailTesterCopied';
}

function _setEmailTesterEmails(emails, stateText, meta) {
    var emailsEl = document.getElementById('email-tester-emails');
    var copyBtn = document.getElementById('email-tester-copy');
    var list = Array.isArray(emails) ? emails.filter(Boolean) : [];
    _emailTesterPreviewMeta = meta || null;
    _setEmailTesterFomo(_emailTesterPreviewMeta);
    if (emailsEl) {
        emailsEl.textContent = list.length ? list.join(', ') : (stateText || window.t('emailTesterNoEmails', {}, lang));
    }
    if (copyBtn) {
        copyBtn.style.display = list.length ? '' : 'none';
        copyBtn.onclick = function() {
            var text = list.join(', ');
            if (!text) return;
            if (typeof copyTextWithToast === 'function') copyTextWithToast(text, _getEmailTesterCopyToastKey());
            else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { showToast(window.t(_getEmailTesterCopyToastKey(), {}, lang)); });
        };
    }
}
function openEmailTesterModal(opts) {
    opts = opts || {};
    _emailTesterCtx = opts;
    var token = ++_emailTesterToken;
    var modal = document.getElementById('email-tester-modal');
    if (!modal) return;
    var emails = Array.isArray(opts.emails) ? opts.emails.filter(Boolean) : [];
    var titleEl = document.getElementById('email-tester-title');
    var textEl = document.getElementById('email-tester-text');
    var copyBtn = document.getElementById('email-tester-copy');
    var consoleBtn = document.getElementById('email-tester-console');
    var checkbox = document.getElementById('email-tester-confirm');
    var confirmLabel = document.getElementById('email-tester-confirm-label');
    var step1Title = document.getElementById('email-tester-step1-title');
    var step2Title = document.getElementById('email-tester-step2-title');
    var step3Title = document.getElementById('email-tester-step3-title');
    var hintEl = document.getElementById('email-tester-hint');
    var accordionTitle = document.getElementById('email-tester-accordion-title');
    var infoEl = document.getElementById('email-tester-info');
    var actionBtn = document.getElementById('email-tester-action');
    if (titleEl) titleEl.textContent = window.t('emailTesterModalTitle', {}, lang);
    if (textEl) textEl.textContent = opts.text || window.t('emailTesterModalText', {}, lang);
    if (step1Title) step1Title.textContent = window.t('emailTesterStep1Title', {}, lang);
    if (step2Title) step2Title.textContent = window.t('emailTesterStep2Title', {}, lang);
    if (step3Title) step3Title.textContent = window.t('emailTesterStep3Title', {}, lang);
    if (hintEl) hintEl.textContent = window.t('emailTesterPasteHint', {}, lang);
    if (copyBtn) copyBtn.textContent = window.t('emailTesterCopyBtn', {}, lang);
    if (consoleBtn) consoleBtn.textContent = window.t('emailTesterConsoleBtn', {}, lang);
    if (confirmLabel) confirmLabel.textContent = window.t('emailTesterConfirmLabel', {}, lang);
    if (accordionTitle) accordionTitle.textContent = window.t('emailTesterAutomationToggle', {}, lang);
    if (infoEl) infoEl.textContent = window.t('emailTesterInfo', {}, lang);
    if (checkbox) { checkbox.checked = false; checkbox.onchange = _updateEmailTesterAction; }
    if (actionBtn) {
        actionBtn.textContent = opts.actionLabel || window.t('emailTesterDefaultAction', {}, lang);
        actionBtn.onclick = _confirmEmailTester;
    }
    _emailTesterPreviewMeta = null;
    _setEmailTesterFomo(null);
    _setEmailTesterAccordionOpen(false);
    _updateEmailTesterAction();
    modal.classList.add('active');

    if (typeof opts.loadEmails === 'function') {
        _setEmailTesterEmails([], window.t('emailTesterLoading', {}, lang), null);
        Promise.resolve()
            .then(function() { return opts.loadEmails(); })
            .then(function(res) {
                if (token !== _emailTesterToken) return; // a newer modal opened
                var loaded = (res && Array.isArray(res.emails)) ? res.emails : (Array.isArray(res) ? res : []);
                var meta = null;
                if (res && typeof res.found !== 'undefined' && typeof res.total !== 'undefined') {
                    meta = {
                        isMassInvite: true,
                        found: Number(res.found || 0),
                        total: Number(res.total || 0)
                    };
                }
                _setEmailTesterEmails(loaded, (res && res.ok === false) ? window.t('emailTesterLoadFailed', {}, lang) : null, meta);
            })
            .catch(function() {
                if (token !== _emailTesterToken) return;
                _setEmailTesterEmails([], window.t('emailTesterLoadFailed', {}, lang), null);
            });
    } else {
        _setEmailTesterEmails(emails, null, {
            isMassInvite: !!opts.isMassInvite,
            found: Number(opts.found || 0),
            total: Number(opts.total || 0)
        });
    }
}
function _updateEmailTesterAction() {
    var checkbox = document.getElementById('email-tester-confirm');
    var actionBtn = document.getElementById('email-tester-action');
    if (!actionBtn) return;
    var ok = !!(checkbox && checkbox.checked);
    actionBtn.disabled = !ok;
    if (ok) actionBtn.classList.remove('is-locked'); else actionBtn.classList.add('is-locked');
}
function _confirmEmailTester() {
    var ctx = _emailTesterCtx || {};
    var checkbox = document.getElementById('email-tester-confirm');
    if (!checkbox || !checkbox.checked) return;
    closeEmailTesterModal();
    if (typeof ctx.onConfirm === 'function') ctx.onConfirm();
}
function closeEmailTesterModal(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('email-tester-modal');
    if (modal) modal.classList.remove('active');
    _emailTesterCtx = null;
    _emailTesterPreviewMeta = null;
    _emailTesterToken += 1;
    _setEmailTesterFomo(null);
    _setEmailTesterAccordionOpen(false);
}

/* === Showcase: "My active tests" accordion === */
function _showcaseActiveTestsItems() {
    var tests = Array.isArray(myTests) ? myTests : [];
    return tests.filter(function(test) {
        if (!test || !test.id) return false;
        var progressStatus = String(test.progress_status || 'active').toLowerCase();
        if (progressStatus === 'active') return true;
        var status = String(test.status || '').toLowerCase();
        return status !== 'done';
    });
}
function renderShowcaseActiveTests(force) {
    var section = document.getElementById('showcase-active-tests');
    var listEl = document.getElementById('showcase-active-tests-list');
    var titleEl = document.getElementById('showcase-active-tests-title');
    if (!section || !listEl) return;
    var items = _showcaseActiveTestsItems();
    if (titleEl) titleEl.textContent = window.t('showcaseActiveTestsTitle', { count: items.length }, lang);
    if (!items.length) {
        section.style.display = 'none';
        section.classList.remove('active');
        listEl.innerHTML = '';
        return;
    }
    section.style.display = '';
    listEl.innerHTML = items.map(function(test) {
        var safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        var statusLabel = _showcaseTestStatusLabel(test);
        var ownerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
        var ownerFullName = String(test.owner_full_name || '').trim();
        var ownerHtml = '';
        if (ownerFullName || ownerUsername) {
            var ownerInner = '';
            if (ownerFullName) ownerInner += '<span class="showcase-active-test-owner-name notranslate">' + window.escapeHTML(ownerFullName) + '</span>';
            if (ownerUsername) ownerInner += '<span class="showcase-active-test-owner-nick notranslate">@' + window.escapeHTML(ownerUsername) + '</span>';
            var ownerClickable = ownerUsername
                ? ' role="button" tabindex="0" onclick="event.stopPropagation(); tg.openTelegramLink(\'https://t.me/' + escapeInlineJsString(ownerUsername) + '\')"'
                : '';
            ownerHtml = '<span class="showcase-active-test-owner"' + ownerClickable + '>' + ownerInner + '</span>';
        }
        return '<div class="showcase-active-test-item" onclick="openProjectDetailsModal(' + Number(test.id) + ')">' +
            '<span class="showcase-active-test-icon">' + renderIcon(test.name || '', test.icon_url) + '</span>' +
            '<span class="showcase-active-test-text">' +
                '<span class="showcase-active-test-name notranslate">' + safeName + '</span>' +
                '<span class="showcase-active-test-status">' + window.escapeHTML(statusLabel) + '</span>' +
            '</span>' +
            ownerHtml +
        '</div>';
    }).join('');
}
function _showcaseTestStatusLabel(test) {
    var status = String(test && test.status || '').toLowerCase();
    var key = 'showcaseActiveStatusActive';
    if (status === 'new') key = 'showcaseActiveStatusNew';
    else if (status === 'daily') key = 'showcaseActiveStatusDaily';
    else if (status === 'opened') key = 'showcaseActiveStatusOpened';
    return window.t(key, {}, lang);
}
function toggleShowcaseActiveTests() {
    var section = document.getElementById('showcase-active-tests');
    if (!section) return;
    section.classList.toggle('active');
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

Object.assign(window, {
    openEmailCollectModal,
    closeEmailCollectModal,
    openEmailTesterModal,
    closeEmailTesterModal,
    toggleEmailTesterAccordion,
    renderShowcaseActiveTests,
    toggleShowcaseActiveTests,
    getLangBadge,
    renderFeedCard,
    renderMutualReturns,
    renderMutualFeed,
    switchMarketSubTab,
    renderBountyFeed,
    toggleDetailsWithAnimation,
    calculateReliability,
    showScreenshotCompleteModal,
    closeScreenshotCompleteModal,
    openReportModal,
    closeReportModal,
    setReportMessageLanguage,
    openScreenshotGuardModal,
    closeScreenshotGuardModal,
    confirmScreenshotGuard,
    openIssueReportModal,
    closeIssueReportModal,
    submitIssueReportFromModal,
    insertReportChip,
    openCheckinOptionsModal,
    closeCheckinOptionsModal,
    renderCheckinReviewOptions,
    checkinOptionsScreenshot,
    checkinOptionsIdea,
    checkinOptionsConfirm,
    checkinOptionsOpenReviewStore,
    toggleCheckinReviewCheckbox,
    renderPlayReviewModal,
    togglePlayReviewModalCheckbox,
    toggleProjectDetailsReviewCheckbox,
    openPlayReviewModal,
    openPlayReviewModalFromCheckinOptions,
    closePlayReviewModal,
    openPlayReviewStore,
    openDropTestModal,
    closeDropTestModal,
    openLeaveMutualModal,
    closeLeaveMutualModal,
    toggleLeaveReasonOther,
    closeEarnBustModal,
    openSocialModal,
    closeSocialModal,
    openFeedbackModal,
    closeFeedbackModal,
    showProjectFeedbackModalLoading,
    showProjectFeedbackModalError,
    showProjectFeedbackModal,
    closeProjectFeedbackModal,
    openFeedbackRewardModalUi,
    closeFeedbackRewardModalUi,
    showKarmaInfo,
    closeKarmaInfoModal,
    showReliabilityInfo,
    closeReliabilityInfo,
    showRankPopup,
    showTestDayPopup,
    showNewBadgeToast,
    insertChip,
    showKarmaPopup,
    showCustomAlert,
    showGuestTestsInfoAlert,
    closeCustomAlert,
    triggerGuestShowcaseNavigation,
    showLoading,
    hideLoading,
    showToast,
    showGuestClaimStatusModal,
    closeGuestClaimStatusModal,
    openGuestClaimSupportFromModal,
    openGuestClaimEditFlow,
    showGuestClaimWelcomeScreen,
    closeGuestClaimWelcomeScreen,
    openGuestClaimSupportFromWelcome,
    handleGuestClaimWelcomeContinue,
    handleGuestClaimWelcomeGoToDashboard,
    switchTab,
    toggleAccordion,
    closeBanner,
    renderGuestProjectsSection,
    renderGuestInviteModal,
    renderExternalTrackModal,
    renderGuestTesterDetailsModal,
    openGuestInviteModal,
    openExternalTrackModal,
    openManualExternalAddModal,
    openGuestTesterDetailsModal,
    openGuestLinkRemoveModalFromTest,
    openGuestLinkRemoveModalFromTester,
    closeGuestLinkRemoveModal,
    confirmGuestLinkRemove,
    toggleGuestLinkRemoveOption,
    sendGuestProjectInvite,
    sendExternalTrackInvite,
    sendExternalTrackingProofFromUi,
    sendExternalDailyCheckinFromUi,
    sendExternalScreenshotAndConfirmFromUi,
    sendExternalBugReportFromUi,
    inviteExternalProjectOwnerToPlatform,
    cancelExternalTestingFromUi,
    openExternalCheckinOptionsModal,
    setGuestInviteLanguage,
    setExternalTrackProject,
    setExternalTrackLanguage,
    setExternalTrackStep,
    toggleExternalTrackAcknowledged,
    showExternalTrackInfo,
    showExternalTrackInfoClick,
    openExternalAppLink,
    copyTextWithToast,
    closeGuestInviteModal,
    closeExternalTrackModal,
    closeManualExternalAddModal,
    closeGuestTesterDetailsModal,
    openDossierModal,
    closeDossierModal,
    openTesterOwnedProjectFromDossier,
    resetManualExternalAddForm,
    updateManualExternalTestingDayValue,
    normalizeManualExternalOwnerNicknameInput,
    openTimelineStatsSheet,
    closeTimelineStatsSheet,
    showProjectSelectModal,
    closeProjectSelectModal,
    openContractEconomyModal,
    closeContractEconomyModal,
    openKarmaDistribution,
    closeKarmaDistribution,
    openKarmaSelectPopup,
    closeKarmaSelectPopup,
    confirmKarmaSelect,
    getReliabilityStatusMeta,
    getReliabilityUiState,
    formatReliabilityIndex,
    formatReliabilityDate,
    buildReliabilitySummarySkeleton,
    buildReliabilityGrantText,
    renderReliabilitySummaryWidget,
    getReliabilityAlphaStatusMeta,
    getReliabilityAlphaProjectTabLabel,
    getReliabilityAlphaAvatar,
    getReliabilityAlphaProjects,
    getReliabilityAlphaProjectSourceMeta,
    buildReliabilityAlphaGuideCard,
    buildReliabilityAlphaSkeleton,
    buildReliabilityAlphaProjectCard,
    renderReliabilityAlphaModal,
    renderReliabilityDashboard,
    openReliabilityAlphaModal,
    closeReliabilityAlphaModal,
    openReliabilityDashboard,
    closeReliabilityDashboard,
    setReliabilityDashboardFilter,
    getGuestProjectFreshness,
    openTesterDossier,
    getMarketCandidateByAppId,
    openFeedbackImageSlider,
    closeFeedbackImageSlider,
    feedbackSliderStep,
    feedbackSliderGoTo,
    openFeedbackTopicLink,
    feedbackExpandText,
    feedbackOnImageError,
});

console.log('[DEBUG] ui-market.js END — switchTab=', typeof switchTab, 'showLoading=', typeof showLoading);