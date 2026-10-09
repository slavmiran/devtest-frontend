/* ============================================================
   ui/ui-projects-moderation.js
   Sprint 2 — Pipeline Frontend: Moderation Card Renderer
   Pure rendering helper — no business logic here.
   Depends on: app-api.js (apiPipelineRequestLive, apiPipelineRequestRetest,
               apiPipelineDeleteProject), ui-projects.js (renderProjects,
               renderIcon), project-results.js (buildProjectResultsBlock),
               i18n globals
   ============================================================ */

/**
 * Render the entire "🛂 На модерации" section into `container`.
 * If `moderationProjects` is empty, nothing is injected (no empty headers).
 *
 * @param {HTMLElement} container   The #projects-list DOM node.
 * @param {Array}       moderationProjects  Projects with phase === 'moderation'.
 */
function renderModerationSection(container, moderationProjects) {
    if (!moderationProjects || moderationProjects.length === 0) return;

    const sectionWrap = document.createElement('div');
    sectionWrap.id = 'pipeline-section-moderation';
    sectionWrap.className = 'pipeline-section';
    container.appendChild(sectionWrap);

    // Section header
    const headerEl = document.createElement('div');
    headerEl.className = 'moderation-section-header';
    headerEl.textContent = window.t('moderationSectionTitle', {}, lang);
    sectionWrap.appendChild(headerEl);

    moderationProjects.forEach(function(project) {
        try {
            const card = buildModerationCard(project);
            sectionWrap.appendChild(card);
        } catch (err) {
            console.error('[ui-projects-moderation] card render error for app', project.id, err);
            if (window.reportSystemError) window.reportSystemError('renderModerationSection: ' + err.message, err.stack);
        }
    });
}

/**
 * Build a single moderation card DOM element.
 * @param {Object} project  Mapped project object from myProjects.
 * @returns {HTMLElement}
 */
function buildModerationCard(project) {
    var card = document.createElement('div');
    card.className = 'card card-moderation';
    card.id = 'project-card-' + project.id;
    card.setAttribute('data-project-id', String(project.id));
    card.setAttribute('data-project-phase', 'moderation');
    if (typeof projectNeedsPipelineAttention === 'function' && projectNeedsPipelineAttention(project)) {
        card.setAttribute('data-project-has-alert', 'true');
    } else if (Number(project.feedback_new_count || 0) > 0) {
        card.setAttribute('data-project-has-alert', 'true');
    }

    var safeProjectName = window.escapeHTML(project.name || window.t('unknownLabel', {}, lang));

    // Info block text
    var infoText = window.t('moderationInfoText', {}, lang);

    var liveLabel    = window.t('moderationBtnLive', {}, lang);
    var retestLabel  = window.t('moderationBtnRetest', {}, lang);
    var deleteLabel  = window.t('moderationBtnDelete', {}, lang);
    var supportLabel = window.t('moderationSupportLink', {}, lang);
    var actionsTitle = window.t('moderationActionsTitle', {}, lang);
    var resultsHtml = typeof window.buildProjectResultsBlock === 'function'
        ? window.buildProjectResultsBlock(project)
        : '';

    // Tester list for this card (read-only, compact)
    var testerListHtml = _buildModerationTesterList(project);

    card.innerHTML = `
        <section class="pc-state-unified moderation-overview">
            <div class="card-header">
                <div class="project-avatar-container">
                    ${renderIcon(project.name || window.t('unknownLabel', {}, lang), project.icon_url)}
                </div>
                <div class="card-info">
                    <div class="card-title notranslate">${safeProjectName}</div>
                    <div class="card-subtitle"><span class="pc-stage-badge moderation-stage-badge">${window.escapeHTML(window.t('moderationStepModeration', {}, lang))}</span></div>
                </div>
            </div>
            <div class="moderation-timeline">
            <section class="moderation-phase is-done">
                ${_buildModerationPhaseHeading(1, 'moderationStepTesting', 'moderationTestingDone')}
                <div class="pc-results-block-slot moderation-results">${resultsHtml}</div>
                ${testerListHtml}
            </section>
            <section class="moderation-phase is-current" aria-current="step">
                ${_buildModerationPhaseHeading(2, 'moderationStepModeration', 'moderationCurrentStep')}
                <div class="moderation-info-block">
                    <div class="moderation-info-title">${window.escapeHTML(window.t('moderationInfoTitle', {}, lang))}</div>
                    <span class="moderation-duration">${window.escapeHTML(window.t('moderationDuration', {}, lang))}</span>
                    <div class="moderation-info-text">${window.escapeHTML(infoText)}</div>
                    <div class="moderation-return-hint">${window.escapeHTML(window.t('moderationReturnHint', {}, lang))}</div>
                </div>
        <section class="moderation-decision-panel" aria-label="${window.escapeHTML(actionsTitle)}">
            <div class="moderation-decision-heading">${window.escapeHTML(actionsTitle)}</div>
            <div class="moderation-actions">
                <button
                    type="button"
                    class="btn-moderation-live"
                    id="moderation-live-btn-${project.id}"
                    onclick="handleModerationRequestLive(${project.id}, event)"
                >
                    <span class="moderation-button-copy"><span>${window.escapeHTML(liveLabel)}</span><small>${window.escapeHTML(window.t('moderationLiveSubtitle', {}, lang))}</small></span><span aria-hidden="true">↗</span>
                </button>

                <div class="moderation-error-block" id="moderation-error-${project.id}">
                    <div class="moderation-error-text" id="moderation-error-text-${project.id}">
                        ${window.escapeHTML(window.t('moderationLiveError', {}, lang))}
                    </div>
                    <a
                        href="javascript:void(0)"
                        class="moderation-support-link"
                        onclick="handleModerationContactSupport(event)"
                    >${window.escapeHTML(supportLabel)}</a>
                    <div class="moderation-error-hint">
                        ${lang === 'ru' 
                            ? 'Если Google отклонил заявку, ниже можно запустить повторное тестирование.'
                            : 'If Google rejected the submission, you can restart testing below.'}
                    </div>
                </div>

                <button
                    type="button"
                    class="btn-moderation-retest"
                    id="moderation-retest-btn-${project.id}"
                    onclick="handleModerationRequestRetest(${project.id}, event)"
                >
                    <span class="moderation-button-copy"><span>${window.escapeHTML(retestLabel)}</span><small>${window.escapeHTML(window.t('moderationRetestSubtitle', {}, lang))}</small></span><span aria-hidden="true">↶</span>
                </button>
            </div>
        </section>
            </section>
            <section class="moderation-phase is-upcoming">
                ${_buildModerationPhaseHeading(3, 'moderationGrowthTitle', 'moderationNextStep')}
                <p class="moderation-growth-text">${window.escapeHTML(window.t('moderationGrowthText', {}, lang))}</p>
            </section>
            </div>
                <button
                    type="button"
                    class="btn-moderation-delete"
                    onclick="handleModerationDeleteProject(${project.id}, event)"
                >
                    🗑️ ${window.escapeHTML(deleteLabel)}
                </button>
        </section>
    `;

    return card;
}

/** Build the 3-step pipeline indicator HTML. */
function _buildModerationPhaseHeading(number, titleKey, statusKey) {
    return `
        <div class="moderation-phase-heading">
            <span class="moderation-phase-number" aria-hidden="true">${number}</span>
            <div><span class="moderation-phase-status">${window.escapeHTML(window.t(statusKey, {}, lang))}</span>
            <h3>${window.escapeHTML(window.t(titleKey, {}, lang))}</h3></div>
        </div>
    `;
}

/** Render a compact tester list for the moderation card (dev needs to read bug-reports). */
function _buildModerationTesterList(project) {
    var testers = Array.isArray(project.testers)
        ? project.testers.filter(function(t) { return !t.is_guest_tester && !t.is_external; })
        : [];
    if (testers.length === 0) return '';

    var rows = testers.map(function(tester) {
        var rawUsername = String(tester.username || '').trim().replace(/^@+/, '');
        var label = rawUsername
            ? '<span class="notranslate">@' + window.escapeHTML(rawUsername) + '</span>'
            : '<span>' + window.t('idLabel', { id: tester.tester_id }, lang) + '</span>';
        return '<li class="moderation-tester">' + label + '</li>';
    }).join('');

    return `
        <details class="moderation-testers">
            <summary>${window.escapeHTML(window.t('testersList', {}, lang))} (${testers.length})</summary>
            <ul class="moderation-testers-list">${rows}</ul>
        </details>
    `;
}

/* ── Event handlers (wired to onclick attributes above) ────── */

/**
 * Handler: "🚀 Приложение в релизе" button.
 * Calls backend, handles 200 (→ live) and 400 (→ error message + support link).
 */
async function handleModerationRequestLive(projectId, event) {
    if (event) event.stopPropagation();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    var btn = document.getElementById('moderation-live-btn-' + projectId);
    var retestBtn = document.getElementById('moderation-retest-btn-' + projectId);
    var errorBlock = document.getElementById('moderation-error-' + projectId);
    var errorTextEl = document.getElementById('moderation-error-text-' + projectId);

    if (!btn) return;

    // Reset error
    if (errorBlock) errorBlock.classList.remove('is-visible');

    // Loading state
    var originalHtml = btn.innerHTML;
    var checkingLabel = window.t('moderationCheckingLabel', {}, lang);
    btn.disabled = true;
    if (retestBtn) retestBtn.disabled = true;
    btn.innerHTML = '<span class="btn-loader"></span> ' + window.escapeHTML(checkingLabel);

    try {
        var result = await apiPipelineRequestLive(projectId);

        if (result && result.ok) {
            // ✅ Success: update local state and re-render
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            var successMsg = window.t('moderationLiveSuccess', {}, lang);
            showToast(successMsg);

            // Optimistic: update phase in myProjects
            var proj = (myProjects || []).find(function(p) { return Number(p.id) === Number(projectId); });
            if (proj) proj.phase = 'live';
            var archived = (typeof archivedProjects !== 'undefined' ? archivedProjects : []).find(function(p) {
                return Number(p.app_id || p.id) === Number(projectId);
            });
            if (archived) {
                archived.phase = 'live';
                if (!proj) myProjects.push(Object.assign({}, archived, {
                    id: Number(projectId), app_status: archived.status,
                    package: archived.package_name || archived.package || '', testers: archived.testers || [],
                }));
            }
            if (window.renderProjects) window.renderProjects(true);

            // Moderation cards normally originate from the archive. Reload the
            // dashboard so the published project arrives with its full roster.
            if (typeof loadProjects === 'function') {
                try {
                    // A fetch started before publication may still contain the old phase.
                    if (typeof _projectsInFlight !== 'undefined' && _projectsInFlight) {
                        try { await _projectsInFlight; } catch (_) {}
                    }
                    await loadProjects(true, true);
                }
                catch (refreshError) { console.warn('[moderation] Published project refresh failed:', refreshError); }
            }

            // Full re-render to move card to live section
            if (window.renderProjects) window.renderProjects(true);

        } else {
            // ❌ 400 / backend error: show inline error
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
            var errMsg = (result && result.message) || window.t('moderationLiveError', {}, lang);
            if (errorTextEl) errorTextEl.textContent = errMsg;
            if (errorBlock) errorBlock.classList.add('is-visible');

            btn.disabled = false;
            if (retestBtn) retestBtn.disabled = false;
            btn.innerHTML = originalHtml;
        }

    } catch (err) {
        console.error('[moderation] handleModerationRequestLive error:', err);
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        var networkErrMsg = window.t('moderationLiveError', {}, lang);
        if (errorTextEl) errorTextEl.textContent = networkErrMsg;
        if (errorBlock) errorBlock.classList.add('is-visible');

        btn.disabled = false;
        if (retestBtn) retestBtn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

/**
 * Handler: "🔄 Нужен ретест" button.
 * Confirms, then calls backend → on success moves project back to 'testing'.
 */
/**
 * Helper to display custom SweetAlert2 popup when trying to retest an already live app.
 */
function showAppAlreadyPublishedModal(projectId) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '🎉 Приложение уже в Google Play!',
            text: 'Мы проверили маркет и нашли ваш проект. Модерация успешно пройдена, поэтому ретест больше не доступен (для опубликованных приложений существуют другие механики продвижения). Хотите перевести проект в фазу Live прямо сейчас?',
            icon: 'success',
            showCancelButton: true,
            confirmButtonText: '🚀 Перевести в Live',
            cancelButtonText: 'Отмена',
            confirmButtonColor: '#0a84ff',
            cancelButtonColor: '#8e8e93',
            background: '#1c1c1e',
            color: '#ffffff'
        }).then(function(res) {
            if (res.isConfirmed) {
                handleModerationRequestLive(projectId, null);
            }
        });
    } else {
        var confirmMsg = 'Мы проверили маркет и нашли ваш проект. Модерация успешно пройдена, поэтому ретест больше не доступен. Хотите перевести проект в фазу Live прямо сейчас?';
        if (confirm(confirmMsg)) {
            handleModerationRequestLive(projectId, null);
        }
    }
}

/**
 * Handler: "🔄 Нужен ретест" button.
 * Confirms, then calls backend → on success moves project back to 'testing'.
 */
async function handleModerationRequestRetest(projectId, event) {
    if (event) event.stopPropagation();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    var confirmMsg = window.t('moderationRetestConfirm', {}, lang);
    var confirmed = await new Promise(function(resolve) {
        if (tg && tg.showConfirm) {
            tg.showConfirm(confirmMsg, function(ok) { resolve(!!ok); });
        } else {
            resolve(confirm(confirmMsg));
        }
    });
    if (!confirmed) return;

    var btn = document.getElementById('moderation-retest-btn-' + projectId);
    var liveBtn = document.getElementById('moderation-live-btn-' + projectId);
    var originalHtml = btn ? btn.innerHTML : '';

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '... ';
    }
    if (liveBtn) liveBtn.disabled = true;

    try {
        var result = await apiPipelineRequestRetest(projectId);
        if (result && result.ok) {
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            showToast(window.t('moderationRetestSuccess', {}, lang));

            // Immediately remove the moderation card so the UI doesn't flicker
            // while we wait for the server refresh. After Bug #1 fix, moderation
            // projects live in `archivedProjects`, not `myProjects`.
            if (Array.isArray(archivedProjects)) {
                archivedProjects = archivedProjects.filter(function(p) {
                    return Number(p.app_id) !== Number(projectId);
                });
            }
            if (window.renderProjects) window.renderProjects(true);
            if (window.renderArchivedProjects) window.renderArchivedProjects();

            // Force-refresh active projects from server so the restarted project
            // (now status='active', phase='testing', created_at=now) appears with
            // the correct Day 1 counter and reset progress bar.
            if (typeof loadProjects === 'function') {
                loadProjects(true).then(function() {
                    if (window.renderProjects) window.renderProjects(true);
                }).catch(function(e) {
                    console.error('[moderation] retest loadProjects refresh failed:', e);
                });
            }
        } else {
            var errMsg = (result && result.message) || window.t('moderationRetestError', {}, lang);
            if (errMsg === 'app_already_published') {
                showAppAlreadyPublishedModal(projectId);
            } else {
                showToast(errMsg);
            }
            if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
            if (liveBtn) liveBtn.disabled = false;
        }
    } catch (err) {
        console.error('[moderation] handleModerationRequestRetest error:', err);
        var errMsg = (err && (err.message || err.detail)) || '';
        if (errMsg === 'app_already_published') {
            showAppAlreadyPublishedModal(projectId);
        } else {
            showToast(window.t('moderationRetestError', {}, lang));
        }
        if (btn) { btn.disabled = false; btn.innerHTML = originalHtml; }
        if (liveBtn) liveBtn.disabled = false;
    }
}

/**
 * Handler: "🗑️ Удалить проект" link.
 * Confirms, calls backend, removes card from DOM and myProjects state.
 */
async function handleModerationDeleteProject(projectId, event) {
    if (event) event.stopPropagation();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    var confirmMsg = window.t('moderationDeleteConfirm', {}, lang);
    var confirmed = await new Promise(function(resolve) {
        if (tg && tg.showConfirm) {
            tg.showConfirm(confirmMsg, function(ok) { resolve(!!ok); });
        } else {
            resolve(confirm(confirmMsg));
        }
    });
    if (!confirmed) return;

    try {
        var result = await apiPipelineDeleteProject(projectId);
        if (result && result.ok) {
            if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            showToast(window.t('moderationDeleteSuccess', {}, lang));

            // Remove from state
            if (Array.isArray(myProjects)) {
                myProjects = myProjects.filter(function(p) { return Number(p.id) !== Number(projectId); });
            }

            if (window.renderProjects) window.renderProjects(true);
        } else {
            var errMsg = (result && result.message) || window.t('moderationDeleteError', {}, lang);
            showToast(errMsg);
        }
    } catch (err) {
        console.error('[moderation] handleModerationDeleteProject error:', err);
        showToast(window.t('moderationDeleteError', {}, lang));
    }
}

/**
 * Handler: "💬 Написать в поддержку" link under error block.
 * Reuses existing sendFeedback('bug') which calls openFeedbackModal().
 */
function handleModerationContactSupport(event) {
    if (event) event.stopPropagation();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    // Reuse the existing "💬 Обратная связь" modal (sendFeedback calls openFeedbackModal internally)
    if (typeof sendFeedback === 'function') {
        sendFeedback('bug');
    } else if (typeof openFeedbackModal === 'function') {
        openFeedbackModal('feedbackTypeBug');
    }
}

/* ── Export to window scope ──────────────────────────────── */
window.renderModerationSection        = renderModerationSection;
window.handleModerationRequestLive    = handleModerationRequestLive;
window.handleModerationRequestRetest  = handleModerationRequestRetest;
window.handleModerationDeleteProject  = handleModerationDeleteProject;
window.handleModerationContactSupport = handleModerationContactSupport;
window.handleModerationLive           = handleModerationRequestLive;
