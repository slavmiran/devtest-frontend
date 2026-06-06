/* Phase 4.3 — ui/ui-projects.js (structural split from ui.js) */
function getProjectVisibilityMeta(project) {
    var mode = typeof window.getProjectVisibilityMode === 'function'
        ? window.getProjectVisibilityMode(project)
        : ((project && project.is_visible === false) ? 'hidden_manual' : 'public');

    if (mode === 'isolated') {
        return {
            mode: 'isolated',
            label: window.t('visibilityIsolated', {}, lang),
            hint: window.t('visibilityIsolatedHint', {}, lang),
            buttonClass: 'eye-locked',
            buttonIcon: '🔒',
            chipClass: ' accent-red',
        };
    }

    if (mode === 'hidden_manual') {
        return {
            mode: 'hidden_manual',
            label: window.t('visibilityPrivate', {}, lang),
            hint: window.t('inviteLinkAlways', {}, lang),
            buttonClass: 'eye-off',
            buttonIcon: '🙈',
            chipClass: '',
        };
    }

    return {
        mode: 'public',
        label: window.t('visibilityPublic', {}, lang),
        hint: '',
        buttonClass: 'eye-on',
        buttonIcon: '👁️',
        chipClass: ' accent-green',
    };
}

function buildProjectModeChip(project) {
    var mode = project.mode || 'mutual';
    if (mode === 'bounty') {
        return `<button class="meta-chip accent-purple" onclick="void(0)">${window.escapeHTML(t.modeBounty)}</button>`;
    }
    if (mode === 'hybrid') {
        return `<button class="meta-chip accent-orange" onclick="void(0)">${window.escapeHTML(t.modeHybrid)}</button>`;
    }
    return `<button class="meta-chip accent-green" onclick="void(0)">${window.escapeHTML(t.modeMutual)}</button>`;
}

function buildEmailTestModeChip(project) {
    if (!project || String(project.test_mode || 'google_group') !== 'email_list') return '';
    const label = window.t('emailTestModeChip', {}, lang);
    return `<button type="button" class="meta-chip accent-orange" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(window.t('emailTestModeChipToast', {}, lang))}')">⚠️ ${window.escapeHTML(label)}</button>`;
}



function renderProjects(force) {
    if (!force && !isTabVisible('projects')) return;
    const container = document.getElementById('projects-list');
    container.innerHTML = '';

    if (visibilityStats) {
        const reliability = calculateReliability(visibilityStats.total_expected_checkins, visibilityStats.total_actual_checkins);
        const reliabilityValue = reliability.percent !== null ? String(reliability.percent) : reliability.text;
        const goldenCount = Number(visibilityStats.golden_count || 0);
        const totalGrants = Number(visibilityStats.grant_tests_count || 0);
        const completedTests = Number(visibilityStats.completed_tests || 0);
        const activeTests = Number(visibilityStats.my_active_tests || 0);
        const achievementsLine = window.escapeHTML(formatDeveloperAchievements(completedTests, goldenCount, totalGrants));
        const initData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) || {};
        const tgUser = initData.user || {};
        const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ').trim();
        const devName = window.escapeHTML(fullName || tgUser.first_name || window.t('unknownLabel', {}, lang));
        const devUsername = tgUser.username ? '@' + window.escapeHTML(tgUser.username) : '';

        const dashHtml = `
            <div class="developer-widget">
                <div class="developer-widget-kicker">${window.t('developerWidgetTitle', {}, lang)}</div>
                <div class="developer-widget-header">
                    <div class="developer-widget-info">
                        <div class="developer-widget-name-line">
                            <span class="developer-widget-name">${devName}</span>
                            ${devUsername ? '<span class="developer-widget-username">(' + devUsername + ')</span>' : ''}
                        </div>
                        <div class="developer-widget-stats-line">${achievementsLine}</div>
                    </div>
                </div>
                <div class="metrics-grid">
                    <button type="button" class="metric-card metric-card-clickable metric-card-success" onclick="showReliabilityInfo()">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricReliabilityV2', {}, lang)}</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-value">${window.escapeHTML(reliabilityValue)}${reliability.percent !== null ? ' %' : ''} ${reliability.percent !== null ? '<span class="metric-value-mark">✓✓</span>' : ''}</div>
                    </button>
                    <button type="button" class="metric-card metric-card-clickable metric-card-gold" onclick="showKarmaInfo()">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricKarma', {}, lang)}</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-value">${formatUiAmount(visibilityStats.ownerKarma || 0, 1)} <span class="metric-value-mark">☯️</span></div>
                    </button>
                    <button type="button" class="metric-card metric-card-clickable metric-card-primary" onclick="openEarnBustModal()">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricBalanceBust', {}, lang)}</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-value">${formatBustAmount(visibilityStats.balance_bust || 0)} <span class="metric-value-mark">💎</span></div>
                    </button>
                    <div class="metric-card metric-card-neutral">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricActiveTests', {}, lang)}</span>
                        </div>
                        <div class="metric-value">${window.escapeHTML(activeTests + ' ' + pluralizeTestWord(activeTests))} <span class="metric-value-mark">⚡</span></div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', dashHtml);
    }

    if (myProjects.length === 0) {
        container.insertAdjacentHTML('beforeend', `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <p>${t.emptyProjects}</p>
            </div>
        `);
        return;
    }

    if (localStorage.getItem('hideDeleteReminder') !== 'true') {
        const reminder = document.createElement('div');
        reminder.style.cssText = 'background-color: rgba(52, 199, 89, 0.15); color: var(--text-color); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.4; display: flex; align-items: flex-start; gap: 8px;';
        reminder.innerHTML = `<span style="flex: 1;">${t.deleteReminderPositive}</span><button onclick="this.parentElement.remove(); localStorage.setItem('hideDeleteReminder','true');" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--hint-color); flex-shrink: 0; padding: 0; line-height: 1;">✕</button>`;
        container.appendChild(reminder);
    }

    const today = getLocalDate();
    const todayDate = new Date(today);

    function getDaysDiff(dateStr) {
        if (!dateStr) return null;
        const checkDate = new Date(dateStr);
        const diffTime = Math.abs(todayDate - checkDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    myProjects.forEach((project) => {
        const card = document.createElement('div');
        const isInactive = !project.is_visible;
        const projectStatus = String(project.app_status || project.status || 'active').toLowerCase();
        const isPendingCompletion = projectStatus === 'pending_completion';
        const safeProjectName = window.escapeHTML(project.name || window.t('unknownLabel', {}, lang));
        const safeProjectPackage = window.escapeHTML(project.package || '');

        const createdDate = project.created_at ? new Date(project.created_at) : null;
        const createdValid = !!(createdDate && !Number.isNaN(createdDate.getTime()));
        const rawPlatformDays = createdValid ? (Math.floor((todayDate - createdDate) / (1000 * 60 * 60 * 24)) + 1) : 1;
        const platformDays = Math.max(1, Number.isFinite(rawPlatformDays) ? rawPlatformDays : 1);
        const syncDay = Number(project.google_sync_day || 0);
        const normalizedSyncDay = Number.isFinite(syncDay) ? syncDay : 0;
        const rawGoogleDay = isProjectSynced(project)
            ? getProjectCurrentGoogleDay(project, platformDays)
            : platformDays;
        const currentGoogleDay = Math.max(1, Number.isFinite(rawGoogleDay) ? rawGoogleDay : 1);
        const likesAvailable = project.likes_max - project.likes_used;

        const isOvertime = platformDays > 14;
        const needsSyncAttention = isPendingCompletion || (platformDays >= 7 && normalizedSyncDay < 1);
        let cardClass = isInactive ? 'card card-inactive' : 'card';
        if (isOvertime) cardClass += ' card-overtime';
        if (isPendingCompletion) cardClass += ' card-pending-release';
        const pendingIssueTesters = (project.testers || []).filter((tester) => !!tester.issue_reported_at && !tester.issue_fixed_at);
        const hasAccessOverlay = project.status === 'access_error' && pendingIssueTesters.length > 0;
        card.className = cardClass + (hasAccessOverlay ? ' card-access-error-locked' : '');
        card.id = `project-card-${project.id}`;
        card.setAttribute('data-project-id', String(project.id));
        const showUpdateTip = projectStatus === 'active' && platformDays >= 3 && !isProjectUpdateTipDismissed(project.id);
        const updateTipHtml = showUpdateTip
            ? `<div id="update-tip-${project.id}" class="project-update-tip"><div class="project-update-tip__text">${window.escapeHTML(window.t('projectUpdateTipText', {}, lang))}</div><button type="button" class="project-update-tip__close" onclick="dismissProjectUpdateTip(${project.id}, event)" aria-label="${window.escapeHTML(window.t('btnClose', {}, lang))}">✕</button></div>`
            : '';

        const allProjectTesters = Array.isArray(project.testers) ? project.testers : [];
        const guestTesters = allProjectTesters.filter(function(tester) {
            return !!tester.is_guest_tester || !!tester.is_external;
        });
        const regularTesters = allProjectTesters.filter(function(tester) {
            return !tester.is_guest_tester && !tester.is_external;
        });
        const guestTesterCount = Math.max(Number(project.guest_testers_count || 0), guestTesters.length);

        let testersHtml = '';
        const testerActionsCtaHtml = `
            <li class="tester-list-cta-actions-item" onclick="event.stopPropagation();">
                <div class="tester-cta-actions">
                    <button type="button" class="btn tester-cta-action-btn" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); openGuestProjectsTesterSearch(${project.id}); event.stopPropagation();">${window.escapeHTML(window.t('projectFindTestersCta', {}, lang))}</button>
                    <button type="button" class="btn tester-cta-action-btn" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); openManualExternalAddModal(${project.id}, event); event.stopPropagation();">${window.escapeHTML(window.t('projectManualExternalCta', {}, lang))}</button>
                </div>
            </li>
        `;
        let testerRowsHtml = '';
        if (regularTesters.length > 0) {
            regularTesters.forEach((tester) => {
                let nameHtml = '';
                let cleanUsername = '';
                const isContractTester = String(tester.join_type || '').toLowerCase() === 'bounty';
                const testerPrefixHtml = isContractTester ? '<span class="tester-contract-prefix">💎</span>' : '';
                let testerDay = 0;
                if (tester.start_date) {
                    const startDt = new Date(tester.start_date);
                    if (!Number.isNaN(startDt.getTime())) {
                        testerDay = Math.max(1, Math.floor((todayDate - startDt) / (1000 * 60 * 60 * 24)) + 1);
                    }
                }
                const testerDayHtml = testerDay > 0
                    ? `<span class="tester-day-badge">[${window.escapeHTML(String(testerDay))}]</span>`
                    : '';
                if (tester.username) {
                    cleanUsername = tester.username.replace('@', '');
                    nameHtml = `<span class="tester-name">${testerDayHtml}${testerPrefixHtml}<span class="tester-primary-label notranslate">@${window.escapeHTML(cleanUsername)}</span></span>`;
                } else if (tester.full_name) {
                    nameHtml = `<span class="tester-name">${testerDayHtml}${testerPrefixHtml}<span class="tester-primary-label">${window.escapeHTML(tester.full_name)}</span></span>`;
                } else {
                    nameHtml = `<span class="tester-name">${testerDayHtml}${testerPrefixHtml}<span class="tester-id">${window.t('idLabel', { id: tester.tester_id }, lang)}</span></span>`;
                }

                let statusHtml = '';
                let showBell = false;
                let testerStatusClass = 'is-red';
                let testerStatusIcon = '🔴';
                let testerStatusText = t.statusNotOpened;
                if (!tester.last_check_date) {
                    showBell = true;
                } else if (tester.last_check_date === today) {
                    testerStatusClass = 'is-green';
                    testerStatusIcon = '🟢';
                    testerStatusText = t.statusToday;
                } else {
                    const daysDiff = getDaysDiff(tester.last_check_date);
                    if (daysDiff === 1) {
                        testerStatusClass = 'is-yellow';
                        testerStatusIcon = '🟡';
                        testerStatusText = t.statusYesterday;
                    } else if (daysDiff >= 2 && daysDiff <= 3) {
                        testerStatusClass = 'is-orange';
                        testerStatusIcon = '🟠';
                        testerStatusText = `${daysDiff} ${t.statusDaysAgo}`;
                        showBell = false;
                    } else {
                        testerStatusClass = 'is-red';
                        testerStatusIcon = '🔴';
                        testerStatusText = `${daysDiff} ${t.statusDaysAgo}`;
                        showBell = true;
                    }
                }
                statusHtml = `<span class="tester-status ${testerStatusClass}">${testerStatusIcon} ${window.escapeHTML(testerStatusText)}</span>`;

                let bellHtml = '';
                if (showBell && cleanUsername) {
                    const deepLink = buildTesterReminderDeepLink(project.id);
                    const msg = window.t('bellNotifyMsg', {
                        app_name: project.name || window.t('unknownLabel', {}, lang),
                        deep_link: deepLink,
                    }, lang);
                    bellHtml = `<a href="javascript:void(0);" onclick="event.stopPropagation(); tg.openTelegramLink('https://t.me/${escapeInlineJsString(cleanUsername)}?text=${escapeInlineJsString(encodeURIComponent(msg))}'); return false;" class="tester-icon-action">🔔</a>`;
                }

                let screenshotDayHtml = '';
                if (isMandatoryScreenshotDay(testerDay)) {
                    screenshotDayHtml = `<span class="tester-icon-action" onclick="event.stopPropagation(); showScreenshotDayAlert()">📸</span>`;
                }

                let karmaHtml = '';
                if (likesAvailable > 0) {
                    const alreadyLiked = (project.likes || []).some((like) => like.tester_id === tester.tester_id);
                    karmaHtml = alreadyLiked
                        ? '<span class="tester-icon-action tester-icon-muted" title="☯️">+☯️</span>'
                        : `<span class="tester-icon-action" onclick="event.stopPropagation(); showKarmaPopup(${project.id}, ${tester.tester_id})">+☯️</span>`;
                } else {
                    const alreadyLiked = (project.likes || []).some((like) => like.tester_id === tester.tester_id);
                    if (alreadyLiked) {
                        karmaHtml = '<span class="tester-icon-action tester-icon-muted" title="☯️">+☯️</span>';
                    }
                }

                const chevronHtml = '<span class="tester-chevron">›</span>';

                testerRowsHtml += `
                    <li onclick="openDossierModal('${escapeInlineJsString(cleanUsername)}', ${tester.tester_id}, ${project.id})" style="cursor: pointer;">
                        <div class="tester-row-main">
                            ${nameHtml}
                            ${screenshotDayHtml}
                            ${bellHtml}
                            ${karmaHtml}
                        </div>
                        <div class="tester-row-meta">
                            ${statusHtml}
                            ${chevronHtml}
                        </div>
                    </li>
                `;
            });
        }

        if (guestTesters.length > 0) {
            guestTesters.forEach(function(tester) {
                var cleanUsername = String(tester.username || '').trim().replace(/^@+/, '');
                var testerLabel = cleanUsername
                    ? '@' + cleanUsername
                    : window.t('idLabel', { id: Number(tester.tester_id || 0) }, lang);
                var guestOriginType = getGuestOriginType(tester.external_source);
                var guestListPrefix = guestOriginType === 'manual' ? '✍️' : '👽';
                var controlMeta = getExternalTesterControlMeta(tester);
                var currentDay = getExternalCurrentTestingDay(tester);
                var isControlToday = controlMeta.tone === 'green';
                var testerDayHtml = currentDay > 0
                    ? `<span class="tester-day-badge">[${window.escapeHTML(String(Number(currentDay || 0)))}]</span>`
                    : '';
                var screenshotDayHtml = isControlToday
                    ? `<span class="tester-icon-action" onclick="event.stopPropagation(); showScreenshotDayAlert()">📸</span>`
                    : '';
                var statusLabel = controlMeta.label;
                testerRowsHtml += `
                    <li onclick="openGuestTesterDetailsModal(${project.id}, ${Number(tester.progress_id || 0)}, event)" style="cursor: pointer;">
                        <div class="tester-row-main">
                            <span class="tester-name">${testerDayHtml}<span class="tester-guest-prefix">${window.escapeHTML(guestListPrefix)}</span><span class="tester-primary-label notranslate">${window.escapeHTML(testerLabel)}</span></span>
                            ${screenshotDayHtml}
                        </div>
                        <div class="tester-row-meta">
                            <span class="tester-status is-${window.escapeHTML(controlMeta.tone)}">${window.escapeHTML(statusLabel)}</span>
                            <span class="tester-chevron">›</span>
                        </div>
                    </li>
                `;
            });
        }

        if (testerRowsHtml) {
            testersHtml = `<ul class="tester-list">${testerRowsHtml}${testerActionsCtaHtml}</ul>`;
        } else {
            testersHtml = `<p class="no-testers">${t.noTesters}</p><ul class="tester-list tester-list-cta-only">${testerActionsCtaHtml}</ul>`;
        }

        const pendingIssueProgressIds = pendingIssueTesters
            .map(function(tester) {
                return Number(tester.progress_id || 0);
            })
            .filter(function(progressId) {
                return progressId > 0;
            });
        const resolveAllLabel = pendingIssueProgressIds.length > 1
            ? window.t('accessOverlayResolveAllBtn', {}, lang)
            : window.t('accessOverlayResolveBtn', {}, lang);
        const accessIssueRowsHtml = pendingIssueTesters.map(function(tester) {
            const testerUsernameRaw = String(tester.username || '').trim().replace(/^@+/, '');
            const testerLabel = testerUsernameRaw
                ? '@' + testerUsernameRaw
                : window.t('idLabel', { id: Number(tester.tester_id || 0) }, lang);
            const safeTesterUsernameInline = escapeInlineJsString(testerUsernameRaw);
            const safeDeleteNameInline = escapeInlineJsString(testerLabel);
            const countdownText = getIssueRemovalCountdownText(tester.issue_reported_at) || window.t('issueCountdownExpired', {}, lang);
            return `
                <div class="access-error-tester-row">
                    <div class="access-error-tester-main">
                        <div class="access-error-tester-name notranslate">${window.escapeHTML(testerLabel)}</div>
                        <div class="access-error-tester-meta">${window.escapeHTML(window.t('accessOverlayTesterCountdown', { time_left: countdownText }, lang))}</div>
                    </div>
                    <div class="access-error-tester-actions">
                        <button type="button" class="btn btn-secondary" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); contactAccessTester('${safeTesterUsernameInline}'); event.stopPropagation();">${window.escapeHTML(window.t('accessOverlayWriteBtn', {}, lang))}</button>
                        <button type="button" class="btn" style="background: rgba(255,59,48,0.12); color:#ff6b63; border:1px solid rgba(255,59,48,0.35);" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('medium'); deleteAccessTester(${project.id}, ${Number(tester.progress_id || 0)}, '${safeDeleteNameInline}'); event.stopPropagation();">${window.escapeHTML(window.t('accessOverlayDeleteBtn', {}, lang))}</button>
                    </div>
                </div>
            `;
        }).join('');
        const accessGuideUrl = 'https://t.me/googleplay_console_12testers/1/527';
        const accessOverlayHtml = hasAccessOverlay ? `
            <div class="access-error-overlay" onclick="event.stopPropagation();">
                <div class="access-error-panel" onclick="event.stopPropagation();">
                    <div class="access-error-title">🚨 <b>${window.escapeHTML(window.t('accessOverlayTitle', {}, lang))}</b></div>
                    <div class="access-error-text">${window.escapeHTML(window.t('accessOverlayIntro', {}, lang))}</div>
                    <div class="access-error-text">${window.escapeHTML(window.t('accessOverlayAffectedCount', { count: pendingIssueTesters.length }, lang))}</div>
                    <a class="access-error-link" href="${accessGuideUrl}" onclick="event.stopPropagation(); window.open('${accessGuideUrl}', '_blank'); return false;">${window.escapeHTML(window.t('accessOverlayGuideLink', {}, lang))}</a>
                    <div class="access-error-tester-list">${accessIssueRowsHtml}</div>
                    <div class="access-error-text">${window.escapeHTML(window.t('accessOverlayResolveHint', {}, lang))}</div>
                    <div class="access-error-actions">
                        <button type="button" class="btn btn-primary" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); resolveAllAccessErrors(${project.id}, ${JSON.stringify(pendingIssueProgressIds)}); event.stopPropagation();">${window.escapeHTML(resolveAllLabel)}</button>
                    </div>
                </div>
            </div>
        ` : '';

        const visibilityBadge = (() => {
            let badges = '';
            const visibilityMeta = getProjectVisibilityMeta(project);

            const statusChip = `<button type="button" class="meta-chip${visibilityMeta.chipClass}" onclick="openVisibilityModeModal(${project.id}, event)">${window.escapeHTML(visibilityMeta.label)}</button>`;
            if (statusChip) badges += statusChip;

            badges += buildProjectModeChip(project);
            badges += buildEmailTestModeChip(project);

            const runIterationChip = buildRunIterationChip(project);
            if (runIterationChip) badges += runIterationChip;

            if (likesAvailable > 0) {
                const karmaChipText = t.karmaAvailable.replace('{count}', likesAvailable);
                badges += `<button class="meta-chip accent-yellow" onclick="openKarmaDistribution(${project.id})">${karmaChipText}</button>`;
            }

            if (project.target_lang && project.target_lang !== 'ALL') {
                badges += getLangBadge(project.target_lang);
            }

            if (isPendingCompletion) {
                badges += `<button class="meta-chip accent-red" onclick="showPendingReleaseInfo()">${window.escapeHTML(window.t('pendingReleaseChip', {}, lang))}</button>`;
            }

            if (guestTesterCount > 0) {
                badges += `<button class="meta-chip accent-blue" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(window.t('projectGuestCountToast', { count: guestTesterCount }, lang))}')">👽 ${window.escapeHTML(window.t('projectGuestCountChip', { count: guestTesterCount }, lang))}</button>`;
            }

            return badges;
        })();

        const projectProgressHtml = (() => {
            if (!isProjectSynced(project)) {
                const day = Math.min(platformDays, 14);
                const pct = Math.min(100, Math.round((day / 14) * 100));
                return `
                    <div class="progress-container" style="margin-bottom: 12px;">
                        <div class="progress-bar"><div class="progress-fill" style="width: ${pct}%;"></div></div>
                        <span>${t.progressLabel.replace('{day}', day)}</span>
                    </div>
                `;
            }

            const segments = [];
            for (let index = 1; index <= 14; index++) {
                segments.push(`<div class="grant-segment ${index <= Math.min(currentGoogleDay, 14) ? 'filled' : ''}"></div>`);
            }
            return `
                <div style="margin-bottom: 12px;">
                    <div class="grant-progress-container">${segments.join('')}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:12px;">
                        <span>${window.t('projectGoogleDayLabel', { day: currentGoogleDay })}</span>
                        <span onclick="window.showCustomAlert(window.t('platformDaysInfo'))" style="color:var(--hint-color); cursor:pointer;">[${platformDays}]</span>
                    </div>
                </div>
            `;
        })();

        const quotaSummaryHtml = (() => {
            const chips = [];
            const testers = regularTesters;
            const mutualCount = testers.filter((tester) => String(tester.join_type || 'invite').toLowerCase() !== 'bounty').length;
            const bountyCount = testers.filter((tester) => String(tester.join_type || '').toLowerCase() === 'bounty').length;
            if (project.mode === 'mutual' || project.mode === 'hybrid') {
                chips.push(`<span class="meta-chip">${window.escapeHTML(window.t('mutualChipLabel', { current: mutualCount, target: project.limit_mutual || 0 }, lang))}</span>`);
            }
            if (project.mode === 'bounty' || project.mode === 'hybrid') {
                chips.push(`<button type="button" class="meta-chip accent-purple" onclick="openContractEconomyModal(${project.id}); event.stopPropagation();">${window.escapeHTML(window.t('contractChipLabel', { current: bountyCount, target: project.limit_bounty || 0, price: formatUiAmount(project.bounty_per_tester || 0, 1) }, lang))}</button>`);
            }
            if (!chips.length) return '';
            return `<div style="margin: 8px 0 10px; display: flex; gap: 6px; flex-wrap: wrap;">${chips.join('')}</div>`;
        })();

        const karmaBonusChipHtml = (() => {
            if (platformDays < 14 || regularTesters.length < 5) return '';
            return `<button class="meta-chip accent-green" onclick="showToast('${escapeInlineJsString(t.deleteKarmaBonus)}')">${t.deleteKarmaBonusChip}</button>`;
        })();

        const hasSync = isProjectSynced(project);
        const overtimeBadgeHtml = isOvertime ? `<span class="meta-chip accent-red" style="font-weight:600;">${window.t('overtimeBadge', {}, lang)}</span>` : '';
        const syncBtnStyle = needsSyncAttention
            ? 'flex: 1; background-color: rgba(255, 149, 0, 0.2); color: #ff9500; border: 1px solid rgba(255, 149, 0, 0.4); animation: pulse-attention 2s infinite;'
            : 'flex: 1; background-color: rgba(52, 199, 89, 0.12); color: var(--text-color); border: 1px solid rgba(52, 199, 89, 0.22);';
        const syncActionHtml = hasSync
            ? `<div class="action-row" style="margin-top: 0; margin-bottom: 10px;">
                <button class="btn btn-secondary" style="${syncBtnStyle}" onclick="openSyncModal(${project.id})">${window.escapeHTML(formatCompactSyncLabel(project))}</button>
                    ${buildProjectFeedbackButton(project.id, project.feedback_total_count || 0, project.feedback_new_count || 0, false, 'flex: 1; margin-bottom: 0; background-color: rgba(10, 132, 255, 0.12); color: var(--text-color); border: 1px solid rgba(10, 132, 255, 0.22);')}
                </div>`
            : `<button class="btn btn-secondary" style="width: 100%; margin-bottom: 10px; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="openSyncModal(${project.id})">
                    ${t.syncBtnLong}
                </button>
                ${buildProjectFeedbackButton(project.id, project.feedback_total_count || 0, project.feedback_new_count || 0, false)}`;

        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 8px;">
                ${renderIcon(project.name || window.t('unknownLabel', {}, lang), project.icon_url)}
                <div class="card-info">
                    <div class="card-title notranslate">${safeProjectName}</div>
                    <div class="card-subtitle notranslate">${safeProjectPackage}</div>
                </div>
                <div class="project-header-actions">
                    <button class="project-icon-btn" onclick="openEditModal(${project.id})">✏️</button>
                    <button class="project-icon-btn ${getProjectVisibilityMeta(project).buttonClass}" onclick="openVisibilityModeModal(${project.id}, event)">${window.escapeHTML(getProjectVisibilityMeta(project).buttonIcon)}</button>
                </div>
            </div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${visibilityBadge}
            </div>
            ${getProjectVisibilityMeta(project).hint ? `<div class="visibility-hint ${getProjectVisibilityMeta(project).mode === 'isolated' ? 'is-critical' : ''}">${window.escapeHTML(getProjectVisibilityMeta(project).hint)}</div>` : ''}
            ${updateTipHtml}
            ${overtimeBadgeHtml ? `<div style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap;">${overtimeBadgeHtml}</div>` : ''}
            ${projectProgressHtml}
            ${quotaSummaryHtml}
            <div style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap;">${karmaBonusChipHtml}</div>
            <div class="testers-section">
                <div class="testers-title">${t.testersList} (${allProjectTesters.length})${guestTesters.length > 0 ? `<span class="testers-breakdown">${window.escapeHTML(String(regularTesters.length))}+${window.escapeHTML(String(guestTesters.length))}</span>` : ''}</div>
                ${testersHtml}
            </div>
            <div style="margin-top: 16px;">
                ${syncActionHtml}
                <div class="action-row" style="margin-top: 10px;">
                    <button class="btn ${project.published_to_market_at ? 'btn-secondary' : 'btn-primary'}" style="flex: 1; ${project.published_to_market_at ? 'background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);' : ''}" onclick="openInviteModal(${project.id})">
                        ${project.published_to_market_at ? '🔗 ' + t.inviteLink : t.inviteLinkNextStep}
                    </button>
                    <button class="btn" style="flex: 1; background-color: rgba(255, 59, 48, 0.1); color: #ff3b30;" onclick="openDeleteModal(${project.id})">
                        🗑 ${t.deleteProject}
                    </button>
                </div>
            </div>
            ${accessOverlayHtml}
        `;
        container.appendChild(card);
    });
}

function openOvertimeModal(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const test = myTests.find((item) => item.id === appId);
    if (!test) return;
    _overtimeTest = test;
    const timelineMeta = getTestingTimelineMeta(test);
    const finishDateText = timelineMeta.finishDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US');

    const isSynced = isProjectSynced(test);
    const message = isSynced
        ? t.overtimeScenarioB
            .replace('{day}', String(test.google_sync_day || 0))
            .replace('{message}', test.sync_message || '-')
        : t.overtimeScenarioA;
    const extra = isSynced
        ? '\n\n' + window.t('overtimeExtendedNotice', {
            count: Math.max(0, timelineMeta.projectDaysLeft),
            date: finishDateText
        }, lang)
        : '\n\n' + window.t('overtimeRewardsSafeNotice', {}, lang);
    document.getElementById('t-overtimeModalText').innerText = message + extra;
    document.getElementById('overtime-modal').classList.add('active');
}

function closeOvertimeModal(event) {
    if (event && event.target !== document.getElementById('overtime-modal')) return;
    document.getElementById('overtime-modal').classList.remove('active');
    _overtimeTest = null;
}

function overtimeContactOwner() {
    if (!_overtimeTest || !_overtimeTest.owner_username) return;
    openTelegramProfile(_overtimeTest.owner_username);
}

function openKickTesterModal(appId, testerId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const modal = document.getElementById('kick-modal');
    const body = document.getElementById('kick-modal-body');
    const reasonSelect = document.getElementById('kick-reason-select');
    const reasonOther = document.getElementById('kick-reason-other');
    if (!modal || !body) return;

    const project = myProjects.find(function(item) { return Number(item.id) === Number(appId); });
    const tester = project ? (project.testers || []).find(function(candidate) { return Number(candidate.tester_id) === Number(testerId); }) : null;
    if (!project || !tester) return;

    const testingDays = tester.start_date ? getUserTestingDay(tester.start_date) : 0;
    const skipsCount = Math.max(0, Number(tester.skips_count || 0));
    const joinType = String(tester.join_type || 'invite').toLowerCase();
    if (testingDays > 7) {
        if (tg.showAlert) tg.showAlert(window.t('kickBlockedDesc', {}, lang));
        else showToast(window.t('kickBlockedDesc', {}, lang));
        return;
    }

    const bountyPerTester = Number(project.bounty_per_tester || 0);
    const holdBonus = bountyPerTester > 0 ? bountyPerTester * 0.35 : 0;
    const dailyPool = bountyPerTester > 0 ? bountyPerTester * 0.65 : 0;
    const rewardPerCheckin = dailyPool > 0 ? dailyPool / 14 : 0;
    const dailyBurn = Math.max(0, dailyPool - (Number(tester.checkins_count || 0) * rewardPerCheckin));
    const isDisciplinaryKick = skipsCount >= 3;
    const isBountyJoin = joinType === 'bounty' && bountyPerTester > 0;
    const joinTypeLabelKey = joinType === 'bounty'
        ? 'kickJoinTypeBounty'
        : joinType === 'mutual'
            ? 'kickJoinTypeMutual'
            : 'kickJoinTypeInvite';

    // Grace period: 24h from join date, 0 checkins
    const checkinCount = Number(tester.checkins_count || 0);
    let graceTimerHtml = '';
    let _kickGraceEnd = 0;
    if (checkinCount === 0 && tester.start_date) {
        const joinDate = new Date(tester.start_date + 'T00:00:00');
        _kickGraceEnd = joinDate.getTime() + 24 * 60 * 60 * 1000;
        const graceRemainingMs = Math.max(0, _kickGraceEnd - Date.now());
        if (graceRemainingMs > 0) {
            const hours = Math.floor(graceRemainingMs / 3600000);
            const minutes = Math.floor((graceRemainingMs % 3600000) / 60000);
            const timeStr = String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
            graceTimerHtml =
                `<div class="details-block" style="border-color: rgba(52,199,89,0.3); text-align: center;">` +
                    `<div id="kick-grace-timer" style="font-size: 18px; font-weight: 700; color: #34c759;">` +
                        `⏳ ${window.escapeHTML(window.t('kickGraceTimer', { time: timeStr }, lang))}` +
                    `</div>` +
                    `<div style="font-size: 11px; line-height: 1.5; color: var(--hint-color); margin-top: 8px;">` +
                        `${window.escapeHTML(window.t('kickGraceExplanation', {}, lang))}` +
                    `</div>` +
                `</div>`;
        }
    }

    const verdictBodyKey = isBountyJoin
        ? (isDisciplinaryKick ? 'kickVerdictBountySafe' : 'kickVerdictBountyUnsafe')
        : (isDisciplinaryKick ? 'kickVerdictNonBountySafe' : 'kickVerdictNonBountyUnsafe');
    const verdictTone = isDisciplinaryKick ? 'rgba(52,199,89,0.22)' : 'rgba(255,149,0,0.24)';
    const verdictHtml = `<div class="details-block" style="border-color: ${verdictTone};">
            <div class="detail-section-title">${window.escapeHTML(window.t('kickVerdictTitle', {}, lang))}</div>
            <div style="font-size:13px; line-height:1.6; color: var(--text-color);">${window.escapeHTML(window.t(verdictBodyKey, {}, lang))}</div>
        </div>`;

    const ownerEffects = [];
    if (isBountyJoin) {
        ownerEffects.push(window.t(isDisciplinaryKick ? 'kickOwnerBountyHoldReturned' : 'kickOwnerBountyHoldBurned', { amount: formatUiAmount(holdBonus, 1) }, lang));
        ownerEffects.push(window.t('kickOwnerBountyDailyBurn', { amount: formatUiAmount(dailyBurn, 1) }, lang));
    } else {
        ownerEffects.push(window.t(joinType === 'mutual' ? 'kickOwnerNoMoneyMutual' : 'kickOwnerNoMoneyInvite', {}, lang));
    }
    ownerEffects.push(window.t(isDisciplinaryKick ? 'kickOwnerReliabilitySafe' : 'kickOwnerReliabilityRisk', {}, lang));

    const testerEffects = [
        window.t('kickTesterEffectAccess', {}, lang),
        window.t(isDisciplinaryKick ? 'kickTesterEffectJustified' : 'kickTesterEffectNeutral', {}, lang)
    ];

    const scenarioHtml = `<div class="details-block">
            <div class="detail-section-title">${window.escapeHTML(window.t('kickScenarioTitle', {}, lang))}</div>
            <div style="font-size:13px; line-height:1.6; color: var(--text-color);">${window.escapeHTML(window.t(joinTypeLabelKey, {}, lang))}</div>
        </div>`;

    const ownerEffectsHtml = `<div class="details-block">
            <div class="detail-section-title">${window.escapeHTML(window.t('kickOwnerEffectsTitle', {}, lang))}</div>
            <div style="font-size:13px; line-height:1.6; color: var(--text-color); display:flex; flex-direction:column; gap:8px;">${ownerEffects.map(function(line) {
                return `<div>• ${window.escapeHTML(line)}</div>`;
            }).join('')}</div>
        </div>`;

    const testerEffectsHtml = `<div class="details-block">
            <div class="detail-section-title">${window.escapeHTML(window.t('kickTesterEffectsTitle', {}, lang))}</div>
            <div style="font-size:13px; line-height:1.6; color: var(--text-color); display:flex; flex-direction:column; gap:8px;">${testerEffects.map(function(line) {
                return `<div>• ${window.escapeHTML(line)}</div>`;
            }).join('')}</div>
        </div>`;

    _kickTarget = { appId: appId, testerId: testerId };
    if (reasonSelect) reasonSelect.value = 'no_response';
    if (reasonOther) {
        reasonOther.value = '';
        reasonOther.style.display = 'none';
    }
    body.innerHTML = '' +
        graceTimerHtml +
        verdictHtml +
        scenarioHtml +
        ownerEffectsHtml +
        testerEffectsHtml +
        `<div class="details-block">` +
            `<div class="detail-section-title">${window.escapeHTML(window.t('kickTesterStats', {}, lang))}</div>` +
            `<div style="font-size:13px; line-height:1.7; color: var(--text-color);">` +
                `<div>${window.escapeHTML(window.t('kickTesterDays', { days: testingDays }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('kickTesterSkips', { skips: skipsCount }, lang))}</div>` +
                `<div>${window.escapeHTML(window.t('kickTesterCheckins', { checkins: checkinCount }, lang))}</div>` +
            `</div>` +
        `</div>`;
    modal.classList.add('active');

    // Live countdown for grace period
    if (_kickGraceEnd > Date.now()) {
        var _kickGraceInterval = setInterval(function() {
            var el = document.getElementById('kick-grace-timer');
            if (!el || !modal.classList.contains('active')) {
                clearInterval(_kickGraceInterval);
                return;
            }
            var rem = Math.max(0, _kickGraceEnd - Date.now());
            if (rem <= 0) {
                clearInterval(_kickGraceInterval);
                el.textContent = '⏳ ' + window.t('kickGraceExpired', {}, lang);
                return;
            }
            var h = Math.floor(rem / 3600000);
            var m = Math.floor((rem % 3600000) / 60000);
            el.textContent = '⏳ ' + window.t('kickGraceTimer', { time: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }, lang);
        }, 60000);
    }
}

function closeKickTesterModal(event) {
    const modal = document.getElementById('kick-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _kickTarget = null;
}

function toggleKickReasonOther() {
    const select = document.getElementById('kick-reason-select');
    const other = document.getElementById('kick-reason-other');
    if (!select || !other) return;
    other.style.display = select.value === 'other' ? 'block' : 'none';
    if (select.value !== 'other') {
        other.value = '';
    }
}

function openSyncModal(projectId) {
    const project = myProjects.find((item) => item.id === projectId);
    const modal = document.getElementById('sync-modal');
    const body = document.getElementById('sync-modal-body');
    if (!project || !modal || !body) return;

    _syncProjectId = projectId;
    const projectHasSync = isProjectSynced(project);
    let isEditMode = !projectHasSync;

    const renderModalContent = () => {
        const liveProject = myProjects.find((item) => item.id === projectId) || project;
        const liveHasSync = isProjectSynced(liveProject);
        const currentSyncDay = getProjectSyncStartDay(liveProject);
        const currentGoogleDay = liveHasSync ? getProjectCurrentGoogleDay(liveProject, 0) : 0;
        const leftDays = Math.max(0, 14 - currentGoogleDay);
        const timelineMeta = {
            isLastDay: liveHasSync && leftDays === 0,
        };
        const today = parseLocalDateOnly(getLocalDate()) || new Date();
        const finishDate = new Date(today);
        finishDate.setDate(finishDate.getDate() + leftDays);
        const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
        const lastSyncDate = parseLocalDateOnly(liveProject.last_sync_date);
        const updatedDaysAgo = lastSyncDate ? getDayDiffFromToday(lastSyncDate) : 0;

        if (!isEditMode && liveHasSync) {
            const segments = [];
            for (let index = 1; index <= 14; index++) {
                segments.push(`<div class="grant-segment ${index <= Math.min(currentGoogleDay, 14) ? 'filled' : ''}"></div>`);
            }

            const updatedStyle = updatedDaysAgo >= 7 ? 'color:#ff9500;' : 'color:var(--hint-color);';
            const updatedText = window.t('syncUpdatedAt', {
                date: lastSyncDate ? lastSyncDate.toLocaleDateString(locale) : '-',
                days: updatedDaysAgo,
            });

            const syncMessageHtml = liveProject.sync_message
                ? `<div class="details-block" style="margin-top:10px;"><div class="detail-section-title">${window.escapeHTML(window.t('syncMessageLabel', {}, lang))}</div><div style="font-size:13px;line-height:1.5;">${escapeHtmlWithBreaks(liveProject.sync_message)}</div></div>`
                : `<div class="details-block" style="margin-top:10px;color:var(--hint-color);">${window.escapeHTML(window.t('syncNoMessage', {}, lang))}</div>`;

            const syncAttentionHtml = String(liveProject.app_status || liveProject.status || 'active').toLowerCase() === 'pending_completion'
                ? `<div style="background: rgba(255, 149, 0, 0.12); border: 1px solid rgba(255, 149, 0, 0.28); border-radius: 12px; padding: 12px; margin-top: 12px; font-size: 12px; line-height: 1.5; color: #ffb84d; font-weight: 600;">${window.escapeHTML(window.t('pendingReleaseOwnerSyncHint', {}, lang))}</div>`
                : '';

            body.innerHTML = `
                <h3 style="margin-bottom:12px;">${window.escapeHTML(window.t('syncModalTitle', {}, lang))}</h3>
                <div style="font-size:12px; margin-bottom:10px; ${updatedStyle}">${window.escapeHTML(updatedText)}</div>
                <div class="grant-progress-container">${segments.join('')}</div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--hint-color);">
                    <span>${window.escapeHTML(window.t('projectGoogleDayLabel', { day: currentGoogleDay }, lang))}</span>
                    <span>${window.escapeHTML(window.t('googleDaysLeft', { count: leftDays }, lang))}</span>
                </div>
                <div class="details-block${timelineMeta.isLastDay ? ' sync-last-day-block' : ''}" style="margin-top:10px;${timelineMeta.isLastDay ? 'cursor:pointer;' : ''}"${timelineMeta.isLastDay ? ' onclick="showSyncLastDayNotice(event)"' : ''}>
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
                        <div style="font-size:13px;color:var(--hint-color);">${window.escapeHTML(window.t('syncEstimatedFinish', { date: formatDdMmYyyy(finishDate) }, lang))}</div>
                        ${timelineMeta.isLastDay ? '<button type="button" class="meta-chip accent-red sync-last-day-chip" onclick="showSyncLastDayNotice(event)">' + window.escapeHTML(window.t('syncLastDayChip', {}, lang)) + '</button>' : ''}
                    </div>
                </div>
                ${syncMessageHtml}
                ${syncAttentionHtml}
                <button id="sync-switch-edit-btn" class="btn btn-primary" style="width:100%;margin-top:12px;">${window.escapeHTML(window.t('syncUpdateDataBtn', {}, lang))}</button>
                <button id="sync-close-btn" class="btn btn-secondary" style="width:100%;margin-top:8px;">${window.escapeHTML(window.t('btnCancel', {}, lang))}</button>
            `;

            const switchBtn = document.getElementById('sync-switch-edit-btn');
            if (switchBtn) {
                switchBtn.onclick = () => {
                    isEditMode = true;
                    renderModalContent();
                };
            }
            const closeBtn = document.getElementById('sync-close-btn');
            if (closeBtn) closeBtn.onclick = () => closeSyncModal();
            return;
        }

        body.innerHTML = `
            <h3 style="margin-bottom:12px;">${window.escapeHTML(window.t('syncModalTitle', {}, lang))}</h3>
            <label style="display:block; margin-bottom: 6px; font-size: 13px; color: var(--hint-color);">${window.escapeHTML(window.t('syncDayLabel', {}, lang))}</label>
            <input id="sync-day-input" class="form-input" type="number" min="1" step="1" style="margin-bottom: 12px;" />
            <label style="display:block; margin-bottom: 6px; font-size: 13px; color: var(--hint-color);">${window.escapeHTML(window.t('syncMessageLabel', {}, lang))}</label>
            <textarea id="sync-message-input" class="form-input" rows="4" style="resize: vertical; margin-bottom: 12px;" placeholder="${window.escapeHTML(window.t('syncMessagePlaceholder', {}, lang))}"></textarea>
            <div class="action-row" style="margin-top: 0;">
                <button id="sync-cancel-btn" class="btn btn-secondary" style="flex: 1;">${window.escapeHTML(window.t('btnCancel', {}, lang))}</button>
                <button id="sync-save-btn" class="btn btn-primary" style="flex: 1;">${window.escapeHTML(window.t('syncSaveBtn', {}, lang))}</button>
            </div>
        `;

        const dayInput = document.getElementById('sync-day-input');
        const messageInput = document.getElementById('sync-message-input');
        if (dayInput) dayInput.value = currentSyncDay > 0 ? String(currentSyncDay) : '';
        if (messageInput) messageInput.value = liveProject.sync_message || '';

        const cancelBtn = document.getElementById('sync-cancel-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => {
                if (liveHasSync) {
                    isEditMode = false;
                    renderModalContent();
                    return;
                }
                closeSyncModal();
            };
        }
        const saveBtn = document.getElementById('sync-save-btn');
        if (saveBtn) saveBtn.onclick = () => saveProjectSync();
    };

    renderModalContent();
    modal.classList.add('active');
}

function closeSyncModal(event) {
    if (event && event.target !== document.getElementById('sync-modal')) return;
    const modal = document.getElementById('sync-modal');
    const body = document.getElementById('sync-modal-body');
    if (modal) modal.classList.remove('active');
    if (body) body.innerHTML = '';
    _syncProjectId = null;
}

function renderArchivedProjects(force) {
    if (!force && !isTabVisible('projects')) return;
    const section = document.getElementById('archive-section');
    if (!section) return;
    const activePackages = new Set((myProjects || []).map(function(project) {
        return String(project.package || '').trim().toLowerCase();
    }).filter(Boolean));
    const visibleArchivedProjects = (archivedProjects || []).filter(function(project) {
        const packageName = String(project.package_name || '').trim().toLowerCase();
        return !packageName || !activePackages.has(packageName);
    });
    if (visibleArchivedProjects.length === 0) {
        section.innerHTML = `
            <div class="archive-shell is-empty">
                <button type="button" class="archive-toggle" onclick="toggleArchive()">
                    <span class="archive-toggle-label">${t.archiveTitle} (0)</span>
                    <span class="archive-toggle-arrow">▼</span>
                </button>
            </div>
        `;
        return;
    }
    let html = `
        <div class="archive-shell">
            <button type="button" class="archive-toggle" onclick="toggleArchive()" id="archive-toggle">
                <span class="archive-toggle-label">${t.archiveTitle} (${visibleArchivedProjects.length})</span>
                <span class="archive-toggle-arrow">▼</span>
            </button>
            <div id="archive-list" class="archive-list is-collapsed">
    `;
    visibleArchivedProjects.forEach((project) => {
        const modeLabel = project.mode === 'bounty' ? t.modeBounty : project.mode === 'hybrid' ? t.modeHybrid : t.modeMutual;
        const archiveName = project.name || window.t('unknownLabel', {}, lang);
        const safeArchiveName = window.escapeHTML(archiveName);
        const safeArchivePackage = window.escapeHTML(project.package_name || '');
        const langBadge = (project.target_lang && project.target_lang !== 'ALL') ? getLangBadge(project.target_lang) : '';
        const afkChip = project.archive_reason === 'afk' ? '<span class=\"meta-chip accent-red\">' + t.archivedAfkOwnerChip + '</span>' : '';
        const runIterationChip = buildRunIterationChip(project, 'archive-meta-chip');
        html += `
            <div class="card archive-card" id="archive-card-${project.app_id}" data-archive-project-id="${project.app_id}">
                <div class="card-header archive-card-header">
                    ${renderIcon(archiveName, project.icon_url)}
                    <div class="card-info">
                        <div class="card-title notranslate">${safeArchiveName}</div>
                        <div class="card-subtitle notranslate">${safeArchivePackage}</div>
                    </div>
                    ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;">${langBadge}</div>` : ''}
                </div>
                <div class="archive-meta-row">
                    <span class="archive-meta-chip">${modeLabel}</span>
                    ${runIterationChip}
                    ${afkChip}
                    <span class="archive-meta-chip">👥 ${project.total_testers}</span>
                    <span class="archive-meta-chip">✅ ${project.total_checkins}</span>
                    <span class="archive-meta-chip">🆕 ${project.feedback_new_count || 0}</span>
                </div>
                <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                    <button class="btn btn-secondary" style="width: 100%; background-color: rgba(52, 199, 89, 0.12); color: var(--text-color); border: 1px solid rgba(52, 199, 89, 0.24);" onclick="restartArchivedProject(${project.app_id})">
                        ${window.escapeHTML(t.archiveRestartBtn)}
                    </button>
                    <button class="btn btn-secondary archive-transfer-btn" style="width: 100%;" onclick="openProjectTransferModal(${project.app_id})">
                        ${window.escapeHTML(t.transferOwnershipBtn)}
                    </button>
                    <div class="action-row" style="margin-top: 0;">
                        <div style="flex: 1;">${buildProjectFeedbackButton(project.app_id, project.feedback_total_count || 0, project.feedback_new_count || 0, true)}</div>
                        <button class="btn archive-delete-btn" style="flex: 1;"
                            onclick="confirmHardDelete(${project.app_id}, '${escapeInlineJsString(archiveName)}')">
                            ${t.archiveDeletePermanent}
                        </button>
                    </div>
                </div>
            </div>`;
    });
    html += `
            </div>
        </div>
    `;
    section.innerHTML = html;
}

function toggleArchive() {
    const list = document.getElementById('archive-list');
    const toggle = document.getElementById('archive-toggle');
    if (!list) return;
    const isCollapsed = list.classList.contains('is-collapsed');
    list.classList.toggle('is-collapsed', !isCollapsed);
    if (toggle) {
        toggle.classList.toggle('is-open', isCollapsed);
        const arrow = toggle.querySelector('.archive-toggle-arrow');
        if (arrow) {
            arrow.textContent = isCollapsed ? '▲' : '▼';
        }
    }
}

function copyGroupUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (tg.showAlert) tg.showAlert(t.copied);
    }).catch((error) => console.error('Copy failed', error));
}

function showScreenshotDayAlert() {
    if (tg.showAlert) tg.showAlert(t.screenshotDayOwnerAlert);
    else alert(t.screenshotDayOwnerAlert);
}

function showVisibilityToast() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(t.visibilityHint);
}

function renderVisibilityModeModal() {
    const body = document.getElementById('visibility-mode-modal-body');
    const hint = document.getElementById('visibility-mode-modal-hint');
    if (!body) return;

    const project = myProjects.find(function(item) {
        return Number(item.id) === Number(_visibilityModalProjectId || 0);
    });
    if (!project) {
        body.innerHTML = '';
        if (hint) hint.innerText = '';
        return;
    }

    const safeProjectName = String(project.name || window.t('unknownLabel', {}, lang));
    const currentMode = getProjectVisibilityMeta(project).mode;
    const options = [
        {
            mode: 'public',
            icon: '🌍',
            title: window.t('visibilityModePublicTitle', {}, lang),
            desc: window.t('visibilityModePublicDesc', {}, lang),
            tone: 'is-public'
        },
        {
            mode: 'hidden_manual',
            icon: '🙈',
            title: window.t('visibilityModeHiddenTitle', {}, lang),
            desc: window.t('visibilityModeHiddenDesc', {}, lang),
            tone: 'is-hidden'
        },
        {
            mode: 'isolated',
            icon: '🔒',
            title: window.t('visibilityModeIsolatedTitle', {}, lang),
            desc: window.t('visibilityModeIsolatedDesc', {}, lang),
            tone: 'is-isolated'
        }
    ];

    if (hint) {
        hint.innerText = window.t('visibilityModalHint', { name: safeProjectName }, lang);
    }

    body.innerHTML = options.map(function(option) {
        const isActive = option.mode === currentMode;
        const isDisabled = _visibilityModalSubmitting || isActive;
        const footerText = _visibilityModalSubmitting && isActive
            ? window.t('visibilityModeUpdating', {}, lang)
            : (isActive ? window.t('visibilityModeCurrent', {}, lang) : window.t('visibilityModeApply', {}, lang));
        return `
            <button
                type="button"
                class="visibility-option-card ${option.tone}${isActive ? ' is-active' : ''}"
                onclick="applyVisibilityModeFromModal('${option.mode}')"
                ${isDisabled ? 'disabled' : ''}
            >
                <div class="visibility-option-card__head">
                    <div class="visibility-option-card__title">${window.escapeHTML(option.icon + ' ' + option.title)}</div>
                    ${isActive ? `<span class="visibility-option-card__badge">${window.escapeHTML(window.t('visibilityModeCurrentBadge', {}, lang))}</span>` : ''}
                </div>
                <div class="visibility-option-card__desc">${window.escapeHTML(option.desc)}</div>
                <div class="visibility-option-card__footer">${window.escapeHTML(footerText)}</div>
            </button>
        `;
    }).join('');
}

function openVisibilityModeModal(projectId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    _visibilityModalProjectId = Number(projectId || 0);
    _visibilityModalSubmitting = false;
    renderVisibilityModeModal();
    const modal = document.getElementById('visibility-mode-modal');
    if (modal) modal.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeVisibilityModeModal(event) {
    const modal = document.getElementById('visibility-mode-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    modal.classList.remove('active');
    _visibilityModalProjectId = 0;
    _visibilityModalSubmitting = false;
}

async function applyVisibilityModeFromModal(mode) {
    if (_visibilityModalSubmitting || !_visibilityModalProjectId || typeof window.setProjectVisibilityMode !== 'function') {
        return;
    }
    _visibilityModalSubmitting = true;
    renderVisibilityModeModal();
    try {
        const result = await window.setProjectVisibilityMode(_visibilityModalProjectId, mode);
        if (result) {
            showToast(window.t('visibilityModeSaved', {}, lang));
            closeVisibilityModeModal();
        }
    } finally {
        _visibilityModalSubmitting = false;
        const modal = document.getElementById('visibility-mode-modal');
        if (modal && modal.classList.contains('active')) {
            renderVisibilityModeModal();
        }
    }
}

function formatMassInviteRemaining(remainingMs) {
    var safeMs = Math.max(0, Number(remainingMs || 0));
    var totalSeconds = Math.ceil(safeMs / 1000);
    var hours = Math.floor(totalSeconds / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function getProjectMassInviteMeta(project) {
    var mode = String(project && project.mode || 'mutual').toLowerCase();
    var isEligibleMode = mode === 'mutual' || mode === 'hybrid';
    var testers = Array.isArray(project && project.testers) ? project.testers : [];
    var activeMutualTesters = testers.filter(function(tester) {
        return String(tester && tester.join_type || 'invite').toLowerCase() !== 'bounty';
    }).length;
    var limitMutual = Math.max(0, Number(project && project.limit_mutual || 0));
    var neededSlots = Math.max(0, limitMutual - activeMutualTesters);
    var maxRecipients = neededSlots > 0 ? neededSlots * 2 : 0;
    var parsedLastInvite = Date.parse(project && project.last_mass_invite_at ? project.last_mass_invite_at : '');
    var remainingMs = Number.isFinite(parsedLastInvite)
        ? Math.max(0, (parsedLastInvite + 24 * 60 * 60 * 1000) - Date.now())
        : 0;

    return {
        isEligibleMode: isEligibleMode,
        activeMutualTesters: activeMutualTesters,
        neededSlots: neededSlots,
        maxRecipients: maxRecipients,
        remainingMs: remainingMs,
        isCooldownActive: remainingMs > 0,
        isAvailable: isEligibleMode && maxRecipients > 0,
    };
}

async function handleMassInviteAction(projectId) {
    var project = myProjects.find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project) return;

    var meta = getProjectMassInviteMeta(project);
    if (!meta.isAvailable && !meta.isCooldownActive) {
        showToast(window.t('massInviteUnavailable', {}, lang));
        return;
    }

    if (meta.isCooldownActive) {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        var confirmed = await new Promise(function(resolve) {
            var message = window.t('massInviteResetConfirm', {}, lang);
            if (tg.showConfirm) {
                tg.showConfirm(message, function(ok) { resolve(!!ok); });
            } else {
                resolve(confirm(message));
            }
        });
        if (!confirmed) return;
        await window.resetMassInviteCooldown(projectId);
        return;
    }

    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    _launchMassInviteWithEmailGate(project, projectId);
}

function _launchMassInviteWithEmailGate(project, projectId) {
    var run = function() { window.startMassInvite(projectId); };

    // EmailTesterModal: the project itself uses manual Email testing → confirm console setup before blasting.
    if (project && String(project.test_mode || 'google_group') === 'email_list' && typeof window.openEmailTesterModal === 'function') {
        window.openEmailTesterModal({
            actionLabel: window.t('emailTesterMassInviteBtn', {}, lang),
            loadEmails: function() {
                return (typeof fetchMassInvitePreviewEmails === 'function')
                    ? fetchMassInvitePreviewEmails(projectId)
                    : Promise.resolve({ ok: false, emails: [] });
            },
            onConfirm: run,
        });
        return;
    }

    // Interceptor (Task 3): no tester email → invite the user to add one so manual-mode testers can be reached.
    var currentEmail = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : String((window.App && window.App.userEmail) || '').trim();
    if (!currentEmail && typeof window.openEmailCollectModal === 'function') {
        window.openEmailCollectModal({
            title: window.t('emailGateMassTitle', {}, lang),
            text: window.t('emailGateMassText', {}, lang),
            primaryLabel: window.t('emailGateSaveLaunchBtn', {}, lang),
            secondaryLabel: window.t('emailGateSkipGroupsBtn', {}, lang),
            onSave: run,
            onSkip: run,
        });
        return;
    }

    run();
}

function openInviteModal(projectId) {
    const previousProjectId = _inviteProjectId;
    _inviteProjectId = projectId;
    if (previousProjectId !== projectId) {
        _inviteMode = 'mutual';
    }
    const project = myProjects.find((item) => item.id === projectId);
    if (!project) return;
    const visibilityMeta = getProjectVisibilityMeta(project);
    const isIsolated = visibilityMeta.mode === 'isolated';
    const isPublished = true;
    const massInviteMeta = getProjectMassInviteMeta(project);

    const inviteBotUsername = String((window.App && window.App.botUsername) || window.__BOT_USERNAME__ || 'Android12TestersBot').trim().replace(/^@+/, '');
    const buildInviteLink = (mode) => `https://t.me/${inviteBotUsername}?start=${mode === 'mutual' ? 'mutual' : 'app'}_${project.id}`;
    const instrLine = project.instructions ? `\n${t.inviteDescLabel}${project.instructions}` : '';
    const getBlock1Text = (mode) => t.inviteBlock1Text.replace('{name}', project.name).replace('{instr}', instrLine).replace('{link}', buildInviteLink(mode));
    const getBlock2Text = (mode) => {
        const templateKey = mode === 'mutual' ? 'inviteBlock2Text' : 'inviteBlock2TextDirect';
        return window.t(templateKey, { name: project.name, link: buildInviteLink(mode) }, lang);
    };
    const getBlock3Text = (mode) => buildInviteLink(mode);
    const buildCopyButtonHtml = (text) => {
        const baseStyle = 'width:42px;height:42px;font-size:18px;border-radius:12px;flex-shrink:0;';
        if (isIsolated) {
            return `<button class="btn-icon" style="${baseStyle} opacity:0.45; cursor:not-allowed;" disabled>🔒</button>`;
        }
        return `<button class="btn-icon" style="${baseStyle}" onclick="copyAndAction('${escapeForAttr(text)}', 'saved')">📋</button>`;
    };
    const buildActionButtonHtml = (text, label) => {
        const baseStyle = 'width: 100%; background: rgba(51,144,236,0.12); color: var(--link-color); border: none;';
        if (isIsolated) {
            return `<button class="btn" style="${baseStyle} opacity:0.45; cursor:not-allowed;" disabled>${window.escapeHTML(window.t('inviteIsolationDisabledBtn', {}, lang))}</button>`;
        }
        return `<button class="btn" style="${baseStyle}" onclick="copyAndAction('${escapeForAttr(text)}', 'saved')">${window.escapeHTML(label)}</button>`;
    };
    const massInviteButtonLabel = isIsolated
        ? window.t('inviteIsolationDisabledBtn', {}, lang)
        : (massInviteMeta.isAvailable
        ? window.t('massInviteLaunchBtn', {}, lang)
        : window.t('massInviteUnavailableBtn', {}, lang));
    const massInviteLimitHintHtml = !isIsolated && massInviteMeta.isAvailable
        ? `<div class="mass-invite-hint" style="text-align:center;">${window.escapeHTML(window.t('massInviteLimitHint', { count: massInviteMeta.maxRecipients }, lang))}</div>`
        : '';
    const massInviteCooldownHtml = isIsolated
        ? `<div class="mass-invite-hint">${window.escapeHTML(window.t('inviteIsolationMassInviteHint', {}, lang))}</div>`
        : (massInviteMeta.isCooldownActive
        ? `<div class="mass-invite-subhint">${window.escapeHTML(window.t('massInviteCooldownRemaining', { time: formatMassInviteRemaining(massInviteMeta.remainingMs) }, lang))}</div>
           <div class="mass-invite-hint">${window.escapeHTML(window.t('massInviteResetCostHint', {}, lang))}</div>
           <div class="mass-invite-hint">${window.escapeHTML(window.t('massInviteCooldownManualHint', {}, lang))}</div>`
        : (!massInviteMeta.isAvailable
            ? `<div class="mass-invite-hint">${window.escapeHTML(window.t('massInviteUnavailableNote', {}, lang))}</div>`
            : ''));
    const massInviteButtonClass = isIsolated
        ? 'btn btn-secondary mass-invite-btn is-disabled'
        : (massInviteMeta.isCooldownActive
        ? 'btn mass-invite-btn is-locked'
        : massInviteMeta.isAvailable
            ? 'btn btn-primary mass-invite-btn'
            : 'btn btn-secondary mass-invite-btn is-disabled');
    const massInviteButtonAttrs = !isIsolated && (massInviteMeta.isCooldownActive || massInviteMeta.isAvailable)
        ? `onclick="handleMassInviteAction(${project.id})"`
        : 'disabled';

    const cardStyle = 'background: var(--secondary-bg-color); border-radius: 12px; padding: 14px; margin-bottom: 12px;';
    const titleStyle = 'font-size: 15px; font-weight: 600; margin-bottom: 10px;';
    const preStyle = 'font-family: monospace; font-size: 12px; color: var(--hint-color); white-space: pre-wrap; word-break: break-word; max-height: 150px; overflow-y: auto; margin-bottom: 12px; line-height: 1.4;';

    const body = document.getElementById('invite-modal-body');

    function renderInviteModalContent() {
        const block1Text = getBlock1Text(_inviteMode);
        const block2Text = getBlock2Text(_inviteMode);
        const block3Text = getBlock3Text(_inviteMode);
        const mutualTabActive = _inviteMode === 'mutual';
        const block2Title = mutualTabActive ? t.inviteBlock2Title : t.inviteBlock2TitleDirect;
        const isolationBannerHtml = isIsolated
            ? `<div class="invite-isolated-banner"><div class="invite-isolated-banner__title">${window.escapeHTML(window.t('inviteIsolationBannerTitle', {}, lang))}</div><div class="invite-isolated-banner__text">${window.escapeHTML(window.t('inviteIsolationBannerText', {}, lang))}</div></div>`
            : '';
        body.innerHTML = `
        ${isolationBannerHtml}
        <div style="${cardStyle}">
            <div style="${titleStyle}">${t.inviteBlock1Title}</div>
            <div style="${preStyle}">${window.escapeHTML(block1Text)}</div>
            <div style="display:flex;gap:8px;">
                <button class="btn" id="invite-publish-btn" style="flex:1; background: rgba(52,199,89,0.15); color: #34c759;" disabled>${window.escapeHTML(t.invitePublishedBtn)}</button>
                ${buildCopyButtonHtml(block1Text)}
            </div>
        </div>
        <div class="mass-invite-card">
            <div class="mass-invite-title">${window.escapeHTML(window.t('massInviteBlockTitle', {}, lang))}</div>
            <div class="mass-invite-desc">${window.escapeHTML(window.t('massInviteBlockDesc', {}, lang))}</div>
            <button id="mass-invite-btn" class="${massInviteButtonClass}" style="width: 100%;" ${massInviteButtonAttrs}>${window.escapeHTML(massInviteButtonLabel)}</button>
            ${massInviteLimitHintHtml}
            ${massInviteCooldownHtml}
        </div>
        <div style="display:flex;gap:8px;margin:12px 0 10px;">
            <button class="btn ${mutualTabActive ? 'btn-primary' : ''}" style="flex:1; ${mutualTabActive ? '' : 'background: var(--secondary-bg-color); color: var(--text-color);'}" onclick="window.setInviteMode('mutual')">${window.escapeHTML(window.t('inviteModeMutualTab', {}, lang))}</button>
            <button class="btn ${!mutualTabActive ? 'btn-primary' : ''}" style="flex:1; ${!mutualTabActive ? '' : 'background: var(--secondary-bg-color); color: var(--text-color);'}" onclick="window.setInviteMode('direct')">${window.escapeHTML(window.t('inviteModeDirectTab', {}, lang))}</button>
        </div>
        <div style="${cardStyle}">
            <div style="${titleStyle}">${window.escapeHTML(block2Title)}</div>
            <div style="${preStyle}">${window.escapeHTML(block2Text)}</div>
            ${buildActionButtonHtml(block2Text, t.inviteBlock2Btn)}
        </div>
        <div style="${cardStyle}">
            <div style="${titleStyle}">${t.inviteBlock3Title}</div>
            <div style="${preStyle}">${window.escapeHTML(block3Text)}</div>
            ${buildActionButtonHtml(block3Text, t.inviteBlock3Btn)}
        </div>
    `;
    }

    renderInviteModalContent();

    document.getElementById('t-inviteModalTitle').innerText = t.inviteModalTitle;
    document.getElementById('t-inviteClose').innerText = t.inviteClose;
    document.getElementById('invite-modal').classList.add('active');
}

function escapeForAttr(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
}

function copyAndAction(text, target) {
    const decoded = text.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
    navigator.clipboard.writeText(decoded).catch((error) => console.error('Copy failed', error));
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast(window.t('inviteCopied', {}, lang));
    if (target === 'exchange') {
        tg.openTelegramLink('https://t.me/googleplay_console_12testers/2');
    } else if (target === 'share') {
        tg.openTelegramLink('https://t.me/share/url?text=' + encodeURIComponent(decoded));
    }
}

async function publishProjectToMarketAction(projectId) {
    if (!projectId) return;
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('already_published', {}, lang));
}

function setInviteMode(mode) {
    _inviteMode = mode === 'direct' ? 'direct' : 'mutual';
    if (_inviteProjectId) {
        openInviteModal(_inviteProjectId);
    }
}

function closeInviteModal(event) {
    if (event && event.target !== document.getElementById('invite-modal')) return;
    document.getElementById('invite-modal').classList.remove('active');
    _inviteProjectId = null;
    _inviteMode = 'mutual';
}

function openDeleteModal(id) {
    projectToDelete = id;
    const project = myProjects.find(p => p.id === id);
    const infoEl = document.getElementById('delete-dynamic-info');
    let infoHtml = '';

    if (project) {
        const todayDate = new Date(getLocalDate());
        const daysOnPlatform = project.created_at
            ? Math.floor((todayDate.getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        const testers = project.testers || [];
        const uniqueTestersCount = new Set(testers.map((tr) => tr.tester_id)).size;
        const projectLikes = project.likes || [];
        const canGetOwnerBonus = daysOnPlatform >= 14 && uniqueTestersCount >= 5;

        if (canGetOwnerBonus) {
            infoHtml += '<div class="delete-info-block bonus">' + window.escapeHTML(t.deleteCongratsTitle) + '</div>';
            infoHtml += '<div class="delete-chip-row"><span class="meta-chip accent-green">' + window.escapeHTML(t.deleteBonusChip) + '</span></div>';
        } else {
            infoHtml += '<div class="delete-info-block">' + window.escapeHTML(t.deleteThanksOnly) + '</div>';
        }

        const overtimeTesters = testers.map((tr) => {
            const overtimeStats = getTesterOvertimeStats(tr);
            const testerRewardTypes = projectLikes
                .filter((like) => like.tester_id === tr.tester_id)
                .map((like) => String(like.type || '').toLowerCase())
                .filter(Boolean);
            const alreadyRewarded = testerRewardTypes.includes('overtime');
            const rewardHistoryLabels = testerRewardTypes
                .filter((type) => type !== 'overtime')
                .map((type) => {
                    if (type === 'good') return window.t('deleteRewardTypeGood', {}, lang);
                    if (type === 'bug') return window.t('deleteRewardTypeBug', {}, lang);
                    return window.t('deleteRewardTypeGeneric', {}, lang);
                })
                .join(' • ');
            return {
                ...tr,
                overtimeCheckins: overtimeStats.overtimeCheckins,
                overtimeSkips: overtimeStats.overtimeSkips,
                overtimeDays: overtimeStats.overtimeDays,
                alreadyRewarded,
                rewardHistoryLabels,
            };
        }).filter((tr) => tr.overtimeCheckins > 0);

        if (overtimeTesters.length > 0) {
            const totalOvertimeDays = overtimeTesters.reduce((acc, item) => acc + (item.overtimeDays || 0), 0);
            const radioHtml = ['<label class="delete-overtime-radio">' +
                '<input type="radio" name="delete-overtime-tester" value="" checked>' +
                '<span class="delete-overtime-radio-body">' +
                    '<span class="delete-overtime-item-name">' + window.escapeHTML(window.t('deleteOvertimeSelectNone', {}, lang)) + '</span>' +
                '</span>' +
            '</label>']
                .concat(overtimeTesters.map((tr) => {
                const name = tr.username ? '@' + window.escapeHTML(tr.username.replace('@', '')) : window.escapeHTML(window.t('idLabel', { id: tr.tester_id }));
                return '<label class="delete-overtime-radio' + (tr.alreadyRewarded ? ' is-disabled' : '') + '">' +
                    '<input type="radio" name="delete-overtime-tester" value="' + tr.tester_id + '"' + (tr.alreadyRewarded ? ' disabled' : '') + '>' +
                    '<span class="delete-overtime-radio-body">' +
                        '<span class="delete-overtime-item-name">' + name + '</span>' +
                        '<span class="delete-overtime-item-meta">' + window.escapeHTML(window.t('deleteOvertimeTesterStats', { checkins: tr.overtimeCheckins, skips: tr.overtimeSkips }, lang)) + '</span>' +
                        (tr.rewardHistoryLabels
                            ? '<span class="delete-overtime-item-meta">' + window.escapeHTML(window.t('deleteRewardHistory', { types: tr.rewardHistoryLabels }, lang)) + '</span>'
                            : '') +
                        (tr.alreadyRewarded
                            ? '<span class="delete-overtime-item-meta">' + window.escapeHTML(window.t('deleteOvertimeAlreadyRewarded', {}, lang)) + '</span>'
                            : '') +
                    '</span>' +
                    '<span class="meta-chip accent-purple">' + window.escapeHTML(window.t('deleteOvertimeDayChip', { count: tr.overtimeDays || tr.overtimeCheckins }, lang)) + '</span>' +
                '</label>';
            })).join('');

            infoHtml += '<div class="delete-info-block overtime">' +
                '<div style="font-weight:600;margin-bottom:6px;">' + window.escapeHTML(t.deleteOvertimeTitle) + '</div>' +
                '<div style="color:var(--hint-color);">' + window.escapeHTML(t.deleteOvertimeDesc) + '</div>' +
                '<div style="margin-top:8px;font-size:12px;color:var(--hint-color);">' + window.escapeHTML(window.t('deleteOvertimeSummary', { count: totalOvertimeDays })) + '</div>' +
                '<div class="delete-overtime-radio-list">' + radioHtml + '</div>' +
            '</div>';
        }
    }

    infoEl.innerHTML = infoHtml;
    document.getElementById('delete-modal').classList.add('active');
    document.getElementById('delete-message').focus();
}

function closeDeleteModal(event) {
    if (event && event.target !== document.getElementById('delete-modal')) return;
    document.getElementById('delete-modal').classList.remove('active');

    setTimeout(() => {
        document.getElementById('delete-message').value = '';
        document.getElementById('delete-dynamic-info').innerHTML = '';
        projectToDelete = null;
    }, 300);
}

/* ── Add Project: Progressive Disclosure state & helpers ───── */
window.addProjectFlow = window.addProjectFlow || {
    emailCopied: false,
    isEmailCopied: false,
    isConsoleOpened: false,
    isChecklistRevealed: false,
    setupFocusStage: 'copy',
    emailMode: false
};
window.editProjectFlow = window.editProjectFlow || { emailMode: false };
window.editAccessFlow = window.editAccessFlow || {
    uiMode: 'view',
    mode: 'standard_group',
    initialMode: 'standard_group',
    currentGroupUrl: '',
    initialGroupUrl: '',
    isEmailCopied: false,
    isConsoleOpened: false,
    isChecklistRevealed: false,
    setupFocusStage: 'copy',
    checklist: { email: false, countries: false, review: false },
    migrationWarnShown: false
};

var _addSetupChecklistTimer = null;
var _editSetupChecklistTimer = null;

function _clearAddSetupChecklistTimer() {
    if (_addSetupChecklistTimer) {
        clearTimeout(_addSetupChecklistTimer);
        _addSetupChecklistTimer = null;
    }
}

function _clearEditSetupChecklistTimer() {
    if (_editSetupChecklistTimer) {
        clearTimeout(_editSetupChecklistTimer);
        _editSetupChecklistTimer = null;
    }
}

function _scheduleAddChecklistReveal() {
    _clearAddSetupChecklistTimer();
    _addSetupChecklistTimer = setTimeout(function () {
        _addSetupChecklistTimer = null;
        var flow = window.addProjectFlow || {};
        if (flow.isEmailCopied && !flow.isChecklistRevealed) {
            flow.isChecklistRevealed = true;
            syncStandardGroupUiState();
            evaluateAddStages();
        }
    }, 5000);
}

function _scheduleEditChecklistReveal() {
    _clearEditSetupChecklistTimer();
    _editSetupChecklistTimer = setTimeout(function () {
        _editSetupChecklistTimer = null;
        var flow = window.editAccessFlow || {};
        if (flow.isEmailCopied && !flow.isChecklistRevealed) {
            flow.isChecklistRevealed = true;
            syncEditStandardGroupUiState();
            updateEditSaveButtonState();
        }
    }, 5000);
}

window.AccessSetupManager = window.AccessSetupManager || {
    _defaultGroupUrl: function() {
        return String(window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
    },
    _standardEmail: function() {
        return 'google-play-dev-test@googlegroups.com';
    },
    _normalizeGroupUrl: function(url) {
        return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
    },
    isDefaultGroup: function(url) {
        return this._normalizeGroupUrl(url) === this._normalizeGroupUrl(this._defaultGroupUrl());
    },
    initEdit: function(project) {
        var testMode = String(project && project.test_mode || 'google_group').toLowerCase();
        var groupUrl = String(project && project.google_group_url || '').trim();
        var mode = 'standard_group';
        if (testMode === 'email_list') mode = 'email_list';
        else if (groupUrl && !this.isDefaultGroup(groupUrl)) mode = 'custom_group';
        window.editAccessFlow = {
            uiMode: 'view',
            mode: mode,
            initialMode: mode,
            currentGroupUrl: mode === 'custom_group' ? groupUrl : '',
            initialGroupUrl: groupUrl,
            isEmailCopied: false,
            isConsoleOpened: false,
            isChecklistRevealed: false,
            setupFocusStage: 'copy',
            checklist: { email: false, countries: false, review: false },
            migrationWarnShown: false
        };
        _clearEditSetupChecklistTimer();
        if (window.editProjectFlow) {
            window.editProjectFlow.emailMode = mode === 'email_list';
        }
    },
    getEditFlow: function() {
        return window.editAccessFlow || {};
    },
    isChecklistComplete: function() {
        var flow = this.getEditFlow();
        var checklist = flow.checklist || {};
        return !!(checklist.email && checklist.countries && checklist.review);
    },
    isChecklistVisible: function() {
        var flow = this.getEditFlow();
        return flow.mode === 'standard_group';
    },
    canSaveEdit: function() {
        var flow = this.getEditFlow();
        if (flow.uiMode !== 'edit') return true;
        if (flow.mode === 'standard_group') return this.isChecklistComplete();
        return true;
    },
    getEditPayload: function() {
        var flow = this.getEditFlow();
        var mode = flow.mode || 'standard_group';
        if (mode === 'email_list') {
            return {
                test_mode: 'email_list',
                google_group_url: null,
                canSave: this.canSaveEdit(),
                mode: mode,
                uiMode: flow.uiMode || 'view'
            };
        }
        if (mode === 'custom_group') {
            return {
                test_mode: 'google_group',
                google_group_url: String(flow.currentGroupUrl || '').trim(),
                canSave: this.canSaveEdit(),
                mode: mode,
                uiMode: flow.uiMode || 'view'
            };
        }
        return {
            test_mode: 'google_group',
            google_group_url: this._defaultGroupUrl(),
            canSave: this.canSaveEdit(),
            mode: mode,
            uiMode: flow.uiMode || 'view'
        };
    },
    serializeEdit: function() {
        var flow = this.getEditFlow();
        return {
            uiMode: flow.uiMode || 'view',
            mode: flow.mode || 'standard_group',
            currentGroupUrl: String(flow.currentGroupUrl || ''),
            isEmailCopied: !!flow.isEmailCopied,
            isConsoleOpened: !!flow.isConsoleOpened,
            checklist: {
                email: !!(flow.checklist && flow.checklist.email),
                countries: !!(flow.checklist && flow.checklist.countries),
                review: !!(flow.checklist && flow.checklist.review),
            }
        };
    }
};

function openModal() {
    document.getElementById('add-modal').classList.add('active');
    resetAddFlow();
    renderGroupSection();
    setProjectTargetLang('add', 'ALL');
    updateProjectPricing('add');

    // Item 10: if the user already has a saved tester email, pre-enable the opt-in and prefill it.
    const savedEmail = (typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : '') || (window.App && window.App.userEmail) || '';
    if (savedEmail) {
        const acceptsBox = document.getElementById('app-accepts-email-testers');
        const testerEmail = document.getElementById('app-tester-email');
        if (acceptsBox) acceptsBox.checked = true;
        if (testerEmail) testerEmail.value = savedEmail;
        onAcceptsEmailTestersChange();
    }

    evaluateAddStages();
    document.getElementById('app-name').focus();
}

function closeModal(event) {
    if (event && event.target !== document.getElementById('add-modal')) return;
    document.getElementById('add-modal').classList.remove('active');

    setTimeout(() => {
        document.getElementById('app-name').value = '';
        document.getElementById('app-package').value = '';
        document.getElementById('app-group').value = '';
        document.getElementById('app-icon').value = '';
        document.getElementById('app-instructions').value = '';
        document.getElementById('package-error').innerHTML = '';
        document.getElementById('package-error').style.display = 'none';
        resetAddFlow();
        switchGroupTab('standard');
        resetProjectForms();
        evaluateAddStages();
    }, 300);
}

function resetAddFlow() {
    _clearAddSetupChecklistTimer();
    window.addProjectFlow = {
        emailCopied: false,
        isEmailCopied: false,
        isConsoleOpened: false,
        isChecklistRevealed: false,
        setupFocusStage: 'copy',
        emailMode: false,
        namePromptShown: false
    };

    const nameHint = document.getElementById('app-name-hint');
    if (nameHint) { nameHint.style.display = 'none'; nameHint.textContent = ''; }
    const validIcon = document.getElementById('tester-email-valid-icon');
    if (validIcon) validIcon.classList.remove('is-valid');
    const testerEmailInput = document.getElementById('app-tester-email');
    if (testerEmailInput) testerEmailInput.classList.remove('input-valid');

    ['check-email', 'check-countries', 'check-review'].forEach((id) => {
        const box = document.getElementById(id);
        if (box) {
            box.checked = false;
            box.disabled = true;
        }
    });
    const checklist = document.getElementById('setup-checklist');
    if (checklist) checklist.classList.remove('unlocked');

    const accordion = document.getElementById('setup-accordion');
    if (accordion) accordion.classList.remove('open');

    const acceptsBox = document.getElementById('app-accepts-email-testers');
    if (acceptsBox) acceptsBox.checked = false;
    const emailBox = document.getElementById('add-email-testers-box');
    if (emailBox) emailBox.classList.remove('is-expanded');
    const testerEmail = document.getElementById('app-tester-email');
    if (testerEmail) testerEmail.value = '';

    _clearAddFieldErrors();
    syncStandardGroupUiState();
}

function switchGroupTab(tab) {
    const stdBtn = document.getElementById('seg-standard');
    const custBtn = document.getElementById('seg-custom');
    if (window.addProjectFlow) window.addProjectFlow.emailMode = false;
    if (tab === 'custom') {
        stdBtn.classList.remove('active');
        custBtn.classList.add('active');
    } else {
        stdBtn.classList.add('active');
        custBtn.classList.remove('active');
    }
    renderGroupSection();
    evaluateAddStages();
}

function renderGroupSection() {
    const emailMode = !!(window.addProjectFlow && window.addProjectFlow.emailMode);
    const isStandard = document.getElementById('seg-standard').classList.contains('active');
    const segControl = document.getElementById('group-seg-control');
    const stdBlock = document.getElementById('group-standard-block');
    const custBlock = document.getElementById('group-custom-block');
    const banner = document.getElementById('email-mode-banner');
    const toggleBtn = document.getElementById('use-email-testing-btn');

    if (emailMode) {
        if (segControl) segControl.style.display = 'none';
        if (stdBlock) stdBlock.style.display = 'none';
        if (custBlock) custBlock.style.display = 'none';
        if (toggleBtn) toggleBtn.style.display = 'none';
        if (banner) banner.style.display = 'flex';
        return;
    }

    if (segControl) segControl.style.display = '';
    if (toggleBtn) toggleBtn.style.display = '';
    if (banner) banner.style.display = 'none';
    if (stdBlock) stdBlock.style.display = isStandard ? '' : 'none';
    if (custBlock) custBlock.style.display = isStandard ? 'none' : '';
    syncStandardGroupUiState();
}

function isAddPlayLinkValid() {
    const value = (document.getElementById('app-package').value || '').trim();
    return value.includes('play.google.com/store/apps/details?id=');
}

function isAddChecklistComplete() {
    return ['check-email', 'check-countries', 'check-review'].every((id) => {
        const box = document.getElementById(id);
        return box && box.checked;
    });
}

function isAddStage2Complete() {
    if (window.addProjectFlow && window.addProjectFlow.emailMode) return true;
    const isStandard = document.getElementById('seg-standard').classList.contains('active');
    if (isStandard) {
        const isEmailCopied = !!(window.addProjectFlow && window.addProjectFlow.isEmailCopied);
        if (!isEmailCopied) return false;
        return isAddChecklistComplete();
    }
    return isValidGoogleGroupUrl((document.getElementById('app-group').value || '').trim());
}

function isAddStage3Valid() {
    const acceptsBox = document.getElementById('app-accepts-email-testers');
    if (acceptsBox && acceptsBox.checked) {
        return isValidEmail((document.getElementById('app-tester-email').value || '').trim());
    }
    return true;
}

function onAddPlayLinkInput() {
    _clearProjectPackageError();
    evaluateAddStages();
}

function onAddChecklistChange() {
    _clearAddFieldErrors();
    if (window.addProjectFlow && isAddChecklistComplete()) {
        window.addProjectFlow.setupFocusStage = 'done';
    }
    syncStandardGroupUiState();
    evaluateAddStages();
}

function onAcceptsEmailTestersChange() {
    const acceptsBox = document.getElementById('app-accepts-email-testers');
    const emailBox = document.getElementById('add-email-testers-box');
    if (emailBox) {
        emailBox.classList.toggle('is-expanded', !!(acceptsBox && acceptsBox.checked));
    }
    if (acceptsBox && acceptsBox.checked) {
        const testerEmail = document.getElementById('app-tester-email');
        if (testerEmail && !testerEmail.value) {
            const prefill = (typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : '') || (window.App && window.App.userEmail) || '';
            if (prefill) testerEmail.value = prefill;
        }
    }
    _updateTesterEmailValidIcon();
    evaluateAddStages();
}

function _updateTesterEmailValidIcon() {
    const input = document.getElementById('app-tester-email');
    const icon = document.getElementById('tester-email-valid-icon');
    if (!input || !icon) return;
    if (typeof sanitizeSingleEmailInputValue === 'function') {
        input.value = sanitizeSingleEmailInputValue(input.value);
    }
    const value = (input.value || '').trim();
    const valid = !!value && (typeof isValidEmail === 'function') && isValidEmail(value);
    icon.classList.toggle('is-valid', valid);
    input.classList.toggle('input-valid', valid);
}

function onTesterEmailInput() {
    _updateTesterEmailValidIcon();
    evaluateAddStages();
}

function evaluateAddStages() {
    const stage2 = document.getElementById('add-stage-2');
    const stage3 = document.getElementById('add-stage-3');
    if (!stage2 || !stage3) return;

    const playValid = isAddPlayLinkValid();
    stage2.classList.toggle('active', playValid);

    const stage2Done = playValid && isAddStage2Complete();
    stage3.classList.toggle('active', stage2Done);

    updateAddSaveButtonState();
}

function updateAddSaveButtonState() {
    const saveBtn = document.getElementById('t-save');
    if (!saveBtn) return;
    // Name is now optional (item 6): it falls back to the package name on save.
    const ready = isAddPlayLinkValid() && isAddStage2Complete() && isAddStage3Valid();
    saveBtn.classList.toggle('is-locked', !ready);
}

function toggleSetupAccordion() {
    const accordion = document.getElementById('setup-accordion');
    if (!accordion) return;
    const willOpen = !accordion.classList.contains('open');
    accordion.classList.toggle('open', willOpen);
    const head = accordion.querySelector('.setup-accordion-head');
    if (head) {
        head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }
    if (willOpen && window.addProjectFlow) {
        window.addProjectFlow.setupFocusStage = 'console';
        syncStandardGroupUiState();
    }
}

function toggleEditSetupAccordion() {
    const accordion = document.getElementById('edit-setup-accordion');
    if (!accordion) return;
    const willOpen = !accordion.classList.contains('open');
    accordion.classList.toggle('open', willOpen);
    const head = accordion.querySelector('.setup-accordion-head');
    if (head) {
        head.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }
    if (willOpen && window.editAccessFlow) {
        window.editAccessFlow.setupFocusStage = 'console';
        syncEditStandardGroupUiState();
        updateEditSaveButtonState();
    }
}

var _imageZoomState = { scale: 1, tx: 0, ty: 0, startDist: 0, startScale: 1, lastX: 0, lastY: 0, panning: false, pointers: {} };

function _applyImageZoomTransform() {
    const img = document.getElementById('image-zoom-img');
    if (!img) return;
    const s = _imageZoomState;
    s.scale = Math.max(1, Math.min(s.scale, 6));
    if (s.scale <= 1) { s.tx = 0; s.ty = 0; }
    img.style.transform = 'translate3d(' + s.tx + 'px,' + s.ty + 'px,0) scale(' + s.scale + ')';
    img.style.cursor = s.scale > 1 ? 'grab' : 'zoom-in';
}

function _resetImageZoom() {
    _imageZoomState = { scale: 1, tx: 0, ty: 0, startDist: 0, startScale: 1, lastX: 0, lastY: 0, panning: false, pointers: {} };
    _applyImageZoomTransform();
}

function openImageZoom(src, alt) {
    const modal = document.getElementById('image-zoom-modal');
    const img = document.getElementById('image-zoom-img');
    if (!modal || !img) return;
    img.src = String(src || '');
    img.alt = String(alt || '');
    modal.classList.add('active');
    _resetImageZoom();
    if (!img._zoomBound) {
        img._zoomBound = true;
        const s = _imageZoomState;
        const dist = function (a, b) { return Math.hypot(a.x - b.x, a.y - b.y); };
        img.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            img.setPointerCapture && img.setPointerCapture(e.pointerId);
            s.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            const ids = Object.keys(s.pointers);
            if (ids.length === 2) {
                s.startDist = dist(s.pointers[ids[0]], s.pointers[ids[1]]);
                s.startScale = s.scale;
            } else if (ids.length === 1) {
                s.panning = s.scale > 1;
                s.lastX = e.clientX; s.lastY = e.clientY;
            }
        });
        img.addEventListener('pointermove', function (e) {
            if (!s.pointers[e.pointerId]) return;
            s.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
            const ids = Object.keys(s.pointers);
            if (ids.length === 2) {
                const d = dist(s.pointers[ids[0]], s.pointers[ids[1]]);
                if (s.startDist > 0) { s.scale = s.startScale * (d / s.startDist); _applyImageZoomTransform(); }
            } else if (ids.length === 1 && s.panning) {
                s.tx += e.clientX - s.lastX;
                s.ty += e.clientY - s.lastY;
                s.lastX = e.clientX; s.lastY = e.clientY;
                _applyImageZoomTransform();
            }
        });
        const onUp = function (e) {
            delete s.pointers[e.pointerId];
            if (Object.keys(s.pointers).length < 2) s.startDist = 0;
            if (Object.keys(s.pointers).length === 0) s.panning = false;
        };
        img.addEventListener('pointerup', onUp);
        img.addEventListener('pointercancel', onUp);
        img.addEventListener('dblclick', function (e) {
            e.preventDefault();
            s.scale = s.scale > 1 ? 1 : 2.5;
            _applyImageZoomTransform();
        });
        img.addEventListener('wheel', function (e) {
            e.preventDefault();
            s.scale += e.deltaY < 0 ? 0.3 : -0.3;
            _applyImageZoomTransform();
        }, { passive: false });
    }
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeImageZoom(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('image-zoom-modal');
    const img = document.getElementById('image-zoom-img');
    _resetImageZoom();
    if (img) {
        img.style.transform = '';
        img.src = '';
        img.alt = '';
    }
    if (modal) modal.classList.remove('active');
}

function openEmailTestingModal() {
    document.getElementById('email-testing-modal').classList.add('active');
}

function closeEmailTestingModal(event) {
    if (event && event.target !== document.getElementById('email-testing-modal')) return;
    document.getElementById('email-testing-modal').classList.remove('active');
}

function confirmEmailTesting() {
    document.getElementById('email-testing-modal').classList.remove('active');
    if (window.addProjectFlow) window.addProjectFlow.emailMode = true;
    renderGroupSection();
    evaluateAddStages();
}

function exitEmailTestingMode() {
    if (window.addProjectFlow) window.addProjectFlow.emailMode = false;
    switchGroupTab('standard');
}

function _clearAddFieldErrors() {
    document.querySelectorAll('#add-modal .field-error').forEach((el) => el.classList.remove('field-error'));
}

function _markAddFieldError(el) {
    if (!el) return;
    el.classList.add('field-error');
    if (typeof el.focus === 'function') {
        try { el.focus(); } catch (e) { /* noop */ }
    }
}

function _markChecklistErrors() {
    [
        ['check-email', 'checklist-item-email'],
        ['check-countries', 'checklist-item-countries'],
        ['check-review', 'checklist-item-review'],
    ].forEach(([boxId, itemId]) => {
        const box = document.getElementById(boxId);
        const item = document.getElementById(itemId);
        if (item && box && !box.checked) {
            item.classList.add('field-error');
        }
    });
}

function closeEmailWarningModal(event) {
    if (event && event.target !== document.getElementById('email-warning-modal')) return;
    document.getElementById('email-warning-modal').classList.remove('active');
    pendingProjectData = null;
}

function showReadonlyAlert() {
    if (tg.showAlert) tg.showAlert(t.readonlyFieldAlert);
    else alert(t.readonlyFieldAlert);
}

var _editModalSnapshot = null;
var _editSaveAndCloseRequested = false;

function _captureEditModalSnapshot() {
    return {
        name: (document.getElementById('edit-name') || {}).value || '',
        description: (document.getElementById('edit-description') || {}).value || '',
        icon: (document.getElementById('edit-icon') || {}).value || '',
        group: (document.getElementById('edit-group') || {}).value || '',
        mode: (document.getElementById('edit-mode') || {}).value || 'mutual',
        targetLang: (document.getElementById('edit-target-lang') || {}).value || 'ALL',
        limitMutual: String((document.getElementById('edit-limit-mutual') || {}).value || ''),
        limitBounty: String((document.getElementById('edit-limit-bounty') || {}).value || ''),
        bountyPerTester: String((document.getElementById('edit-bounty-per-tester') || {}).value || ''),
        requestReviews: !!(document.getElementById('edit-request-reviews') && document.getElementById('edit-request-reviews').checked),
        emailMode: !!(window.editProjectFlow && window.editProjectFlow.emailMode),
        accessSetup: (window.AccessSetupManager && typeof window.AccessSetupManager.serializeEdit === 'function')
            ? window.AccessSetupManager.serializeEdit()
            : {}
    };
}

function _isEditModalDirty() {
    if (!_editModalSnapshot) return false;
    return JSON.stringify(_captureEditModalSnapshot()) !== JSON.stringify(_editModalSnapshot);
}

function markEditModalSavedState() {
    _editModalSnapshot = _captureEditModalSnapshot();
}

function _openEditUnsavedModal() {
    var overlay = document.getElementById('edit-unsaved-modal');
    if (!overlay) return;
    overlay.classList.add('active');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function closeEditUnsavedModal(event) {
    var overlay = document.getElementById('edit-unsaved-modal');
    if (!overlay) return;
    if (event && event.target && event.target !== overlay) return;
    overlay.classList.remove('active');
}

function requestEditSaveAndClose() {
    _editSaveAndCloseRequested = true;
    closeEditUnsavedModal();
    if (typeof saveProjectEdit === 'function') {
        saveProjectEdit();
    }
}

function consumeEditSaveAndCloseRequest() {
    var requested = !!_editSaveAndCloseRequested;
    _editSaveAndCloseRequested = false;
    return requested;
}

function discardEditAndClose() {
    closeEditUnsavedModal();
    closeEditModal(null, { force: true });
}

function openEditModal(projectId) {
    const project = myProjects.find((item) => item.id === projectId);
    if (!project) return;
    projectToEdit = projectId;
    document.getElementById('edit-name').value = project.name || '';
    document.getElementById('edit-description').value = project.instructions || '';
    document.getElementById('edit-icon').value = project.icon_url || '';
    document.getElementById('edit-package').value = project.package || '';
    if (window.AccessSetupManager && typeof window.AccessSetupManager.initEdit === 'function') {
        window.AccessSetupManager.initEdit(project);
    }
    document.getElementById('edit-limit-mutual').value = String(project.limit_mutual || 12);
    document.getElementById('edit-limit-bounty').value = String(project.limit_bounty || 12);
    document.getElementById('edit-bounty-per-tester').value = String(project.bounty_per_tester || 100);
    document.getElementById('edit-request-reviews').checked = project.request_reviews !== false;
    setProjectMode('edit', project.mode || 'mutual');
    setProjectTargetLang('edit', project.target_lang || 'ALL');
    renderEditAccessSetup();
    updateProjectPricing('edit');
    renderEditCreatedAtMeta();
    _editSaveAndCloseRequested = false;
    markEditModalSavedState();
    document.getElementById('edit-project-modal').classList.add('active');
}

function renderEditGroupSection() {
    renderEditAccessSetup();
}

function exitEditEmailTestingMode() {
    if (window.editAccessFlow) {
        window.editAccessFlow.mode = 'standard_group';
        window.editAccessFlow.isEmailCopied = false;
        window.editAccessFlow.isConsoleOpened = false;
        window.editAccessFlow.isChecklistRevealed = false;
        window.editAccessFlow.setupFocusStage = 'copy';
        window.editAccessFlow.checklist = { email: false, countries: false, review: false };
    }
    _clearEditSetupChecklistTimer();
    if (window.editProjectFlow) {
        window.editProjectFlow.emailMode = false;
    }
    renderEditAccessSetup();
}

function closeEditModal(event) {
    if (event && event.target !== document.getElementById('edit-project-modal')) return;
    var forceClose = !!(arguments[1] && arguments[1].force);
    if (!forceClose && _isEditModalDirty()) {
        _openEditUnsavedModal();
        return;
    }
    document.getElementById('edit-project-modal').classList.remove('active');
    setTimeout(() => {
        projectToEdit = null;
        _editModalSnapshot = null;
        _editSaveAndCloseRequested = false;
        if (window.editProjectFlow) window.editProjectFlow.emailMode = false;
        renderEditAccessSetup();
        resetProjectForms();
        renderEditCreatedAtMeta();
    }, 300);
}

function resetEditGoogleGroupToDefault() {
    if (window.editAccessFlow) {
        window.editAccessFlow.mode = 'standard_group';
        window.editAccessFlow.currentGroupUrl = '';
        window.editAccessFlow.isEmailCopied = false;
        window.editAccessFlow.isConsoleOpened = false;
        window.editAccessFlow.isChecklistRevealed = false;
        window.editAccessFlow.setupFocusStage = 'copy';
        window.editAccessFlow.checklist = { email: false, countries: false, review: false };
    }
    _clearEditSetupChecklistTimer();
    renderEditAccessSetup();
}

function _getEditAccessViewMeta() {
    var flow = window.editAccessFlow || {};
    if (flow.mode === 'email_list') {
        return {
            title: '✉️ ' + window.t('accessViewEmailMode', {}, lang),
            value: '',
            canCopy: false,
        };
    }
    if (flow.mode === 'custom_group') {
        return {
            title: '🔗 ' + window.t('accessViewCustomMode', {}, lang),
            value: String(flow.currentGroupUrl || flow.initialGroupUrl || '').trim(),
            canCopy: true,
        };
    }
    return {
        title: '👥 ' + window.t('accessViewStandardMode', {}, lang),
        value: (window.AccessSetupManager && typeof window.AccessSetupManager._defaultGroupUrl === 'function')
            ? window.AccessSetupManager._defaultGroupUrl()
            : 'https://groups.google.com/g/google-play-dev-test',
        canCopy: true,
    };
}

function updateEditSaveButtonState() {
    var btn = document.getElementById('t-editSave');
    if (!btn) return;
    var canSave = true;
    if (window.AccessSetupManager && typeof window.AccessSetupManager.canSaveEdit === 'function') {
        canSave = !!window.AccessSetupManager.canSaveEdit();
    }
    btn.disabled = !canSave;
    btn.classList.toggle('is-locked', !canSave);
}

function renderEditAccessSetup() {
    var flow = window.editAccessFlow || {};
    var viewCard = document.getElementById('edit-access-view-card');
    var editShell = document.getElementById('edit-access-edit-shell');
    var inEditMode = flow.uiMode === 'edit';
    if (viewCard) viewCard.style.display = inEditMode ? 'none' : '';
    if (editShell) editShell.style.display = inEditMode ? '' : 'none';

    var viewMeta = _getEditAccessViewMeta();
    var viewTitle = document.getElementById('edit-access-view-title');
    var viewValue = document.getElementById('edit-access-view-value');
    var quickCopyBtn = document.getElementById('edit-access-quick-copy-btn');
    if (viewTitle) viewTitle.textContent = viewMeta.title;
    if (viewValue) {
        viewValue.textContent = viewMeta.value || '';
        viewValue.style.display = viewMeta.value ? '' : 'none';
    }
    if (quickCopyBtn) quickCopyBtn.style.display = viewMeta.canCopy ? '' : 'none';

    if (!inEditMode) {
        updateEditSaveButtonState();
        return;
    }

    var mode = flow.mode || 'standard_group';
    var segStandard = document.getElementById('edit-seg-standard');
    var segCustom = document.getElementById('edit-seg-custom');
    if (segStandard) segStandard.classList.toggle('active', mode === 'standard_group');
    if (segCustom) segCustom.classList.toggle('active', mode === 'custom_group');

    var segControl = document.getElementById('edit-group-seg-control');
    var standardBlock = document.getElementById('edit-group-standard-block');
    var customBlock = document.getElementById('edit-group-custom-block');
    var emailBanner = document.getElementById('edit-email-mode-banner');
    var emailToggle = document.getElementById('edit-use-email-testing-btn');
    var isEmailMode = mode === 'email_list';

    if (segControl) segControl.style.display = isEmailMode ? 'none' : '';
    if (standardBlock) standardBlock.style.display = (!isEmailMode && mode === 'standard_group') ? '' : 'none';
    if (customBlock) customBlock.style.display = (!isEmailMode && mode === 'custom_group') ? '' : 'none';
    if (emailBanner) emailBanner.style.display = isEmailMode ? 'flex' : 'none';
    if (emailToggle) emailToggle.style.display = isEmailMode ? 'none' : '';

    var customInput = document.getElementById('edit-group');
    if (customInput && mode === 'custom_group') {
        customInput.value = String(flow.currentGroupUrl || '');
    }

    if (mode === 'standard_group') {
        syncEditStandardGroupUiState();
    }

    updateEditSaveButtonState();
}

function enterEditAccessMode() {
    if (!window.editAccessFlow) return;
    var flow = window.editAccessFlow;
    flow.uiMode = 'edit';
    if (flow.initialMode === 'email_list' || flow.mode === 'email_list') {
        flow.mode = 'standard_group';
    }
    flow.isEmailCopied = false;
    flow.isConsoleOpened = false;
    flow.isChecklistRevealed = false;
    flow.setupFocusStage = 'copy';
    flow.checklist = { email: false, countries: false, review: false };
    _clearEditSetupChecklistTimer();
    if (window.editProjectFlow) {
        window.editProjectFlow.emailMode = false;
    }
    renderEditAccessSetup();
}

function cancelEditAccessMode() {
    var flow = window.editAccessFlow || {};
    flow.uiMode = 'view';
    flow.mode = flow.initialMode || 'standard_group';
    flow.currentGroupUrl = flow.mode === 'custom_group' ? String(flow.initialGroupUrl || '') : '';
    flow.isEmailCopied = false;
    flow.isConsoleOpened = false;
    flow.isChecklistRevealed = false;
    flow.setupFocusStage = 'copy';
    flow.checklist = { email: false, countries: false, review: false };
    _clearEditSetupChecklistTimer();
    if (window.editProjectFlow) {
        window.editProjectFlow.emailMode = flow.mode === 'email_list';
    }
    renderEditAccessSetup();
}

function setEditAccessTab(mode) {
    if (!window.editAccessFlow) return;
    var nextMode = mode || 'standard_group';
    var flow = window.editAccessFlow;
    if (nextMode === 'standard_group' && flow.mode !== 'standard_group' && flow.initialMode !== 'standard_group' && !flow.migrationWarnShown) {
        flow.migrationWarnShown = true;
        var warnText = window.t('editAccessMigrationWarning', {}, lang);
        if (typeof window.showToast === 'function') window.showToast(warnText);
        else if (tg && typeof tg.showAlert === 'function') tg.showAlert(warnText);
        else alert(warnText);
    }
    flow.mode = nextMode;
    if (nextMode !== 'custom_group') {
        flow.currentGroupUrl = '';
    }
    flow.isEmailCopied = false;
    flow.isConsoleOpened = false;
    flow.isChecklistRevealed = false;
    flow.setupFocusStage = 'copy';
    flow.checklist = { email: false, countries: false, review: false };
    _clearEditSetupChecklistTimer();
    if (window.editProjectFlow) {
        window.editProjectFlow.emailMode = nextMode === 'email_list';
    }
    renderEditAccessSetup();
}

function onEditAccessGroupInput() {
    if (!window.editAccessFlow) return;
    var input = document.getElementById('edit-group');
    window.editAccessFlow.currentGroupUrl = String((input && input.value) || '').trim();
    updateEditSaveButtonState();
}

function copyEditAccessValue() {
    var viewMeta = _getEditAccessViewMeta();
    var value = String(viewMeta.value || '').trim();
    if (!value) return;
    try {
        navigator.clipboard.writeText(value).then(function() {
            if (typeof window.showToast === 'function') window.showToast(window.t('emailCopiedToast', {}, lang));
        }).catch(function() {});
    } catch (e) {}
}

function copyEditAccessStandardEmail() {
    var value = (window.AccessSetupManager && window.AccessSetupManager._standardEmail)
        ? window.AccessSetupManager._standardEmail()
        : 'google-play-dev-test@googlegroups.com';
    var _done = function () {
        if (window.editAccessFlow) {
            window.editAccessFlow.isEmailCopied = true;
            window.editAccessFlow.setupFocusStage = 'help';
        }
        _scheduleEditChecklistReveal();
        syncEditStandardGroupUiState();
        updateEditSaveButtonState();
        if (typeof window.showToast === 'function') window.showToast(window.t('emailCopiedToast', {}, lang));
    };
    try {
        navigator.clipboard.writeText(value).then(_done).catch(_done);
    } catch (e) {
        _done();
    }
}

function onEditAccessConsoleClick() {
    if (window.editAccessFlow) {
        window.editAccessFlow.isConsoleOpened = true;
        window.editAccessFlow.isChecklistRevealed = true;
        window.editAccessFlow.setupFocusStage = 'checklist';
    }
    _clearEditSetupChecklistTimer();
    syncEditStandardGroupUiState();
    updateEditSaveButtonState();
    var targetUrl = 'https://play.google.com/console/';
    try {
        if (tg && typeof tg.openLink === 'function') {
            tg.openLink(targetUrl);
            return;
        }
    } catch (e) {}
    try {
        window.open(targetUrl, '_blank', 'noopener');
    } catch (e) {}
}

function onEditAccessChecklistChange(item, checked) {
    if (!window.editAccessFlow) return;
    if (!window.editAccessFlow.checklist) {
        window.editAccessFlow.checklist = { email: false, countries: false, review: false };
    }
    window.editAccessFlow.checklist[item] = !!checked;
    if (window.AccessSetupManager && window.AccessSetupManager.isChecklistComplete()) {
        window.editAccessFlow.setupFocusStage = 'done';
    }
    syncEditStandardGroupUiState();
    updateEditSaveButtonState();
}

function enableEditEmailTestingMode() {
    setEditAccessTab('email_list');
}

function copyEmail() {
    const _toast = function () {
        const msg = window.t('emailCopiedToast', {}, lang);
        if (typeof window.showToast === 'function') window.showToast(msg);
    };
    const _done = function () {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        unlockSetupChecklist();
        _toast();
    };
    try {
        navigator.clipboard.writeText('google-play-dev-test@googlegroups.com').then(_done).catch((error) => {
            console.error('Failed to copy text: ', error);
            _done();
        });
    } catch (e) {
        _done();
    }
}

function onSetupConsoleClick() {
    const targetUrl = 'https://play.google.com/console/';
    if (window.addProjectFlow) {
        window.addProjectFlow.isConsoleOpened = true;
        window.addProjectFlow.isChecklistRevealed = true;
        window.addProjectFlow.setupFocusStage = 'checklist';
    }
    _clearAddSetupChecklistTimer();
    syncStandardGroupUiState();
    evaluateAddStages();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    try {
        if (tg && typeof tg.openLink === 'function') {
            tg.openLink(targetUrl);
            return;
        }
    } catch (e) {
        console.error('Failed to open Play Console via tg.openLink', e);
    }
    try {
        window.open(targetUrl, '_blank', 'noopener');
    } catch (e) {
        console.error('Failed to open Play Console link', e);
    }
}

function syncStandardGroupUiState() {
    const flow = window.addProjectFlow || {};
    const isEmailCopied = !!flow.isEmailCopied;
    const isConsoleOpened = !!flow.isConsoleOpened;
    const isChecklistRevealed = !!flow.isChecklistRevealed;
    const focusStage = flow.setupFocusStage || (isEmailCopied ? 'help' : 'copy');
    const isStandard = !!(document.getElementById('seg-standard') && document.getElementById('seg-standard').classList.contains('active'));
    const isEmailMode = !!flow.emailMode;
    const inStandardFlow = isStandard && !isEmailMode;

    const copyBtn = document.getElementById('setup-email-copy-btn');
    const copyIcon = document.getElementById('setup-email-copy-icon');
    if (copyBtn) {
        copyBtn.classList.toggle('is-done', isEmailCopied);
        copyBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'copy');
    }
    if (copyIcon) copyIcon.textContent = isEmailCopied ? '✅' : '📋';

    const actionsReveal = document.getElementById('setup-actions-reveal');
    if (actionsReveal) {
        actionsReveal.classList.toggle('is-open', inStandardFlow && isEmailCopied);
    }

    const helpBtn = document.querySelector('#setup-actions-reveal .setup-help-btn');
    if (helpBtn) {
        helpBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'help');
    }

    const consoleBtn = document.getElementById('setup-console-btn');
    const consoleBtnLabel = document.getElementById('setup-console-btn-label');
    if (consoleBtn) {
        consoleBtn.classList.toggle('is-opened', isConsoleOpened);
        consoleBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'console');
    }
    if (consoleBtnLabel) {
        consoleBtnLabel.textContent = window.t(isConsoleOpened ? 'goToPlayConsoleOpened' : 'publicGroupOpenConsoleBtn', {}, lang);
    }

    const checklistReveal = document.getElementById('setup-checklist-reveal');
    if (checklistReveal) {
        checklistReveal.classList.toggle('is-open', inStandardFlow && isChecklistRevealed);
    }

    ['check-email', 'check-countries', 'check-review'].forEach(function (id) {
        const box = document.getElementById(id);
        if (!box) return;
        box.disabled = !(inStandardFlow && isChecklistRevealed);
    });

    const checklistComplete = isAddChecklistComplete();
    if (checklistComplete && flow.setupFocusStage === 'checklist') {
        flow.setupFocusStage = 'done';
    }
    const activeFocusStage = flow.setupFocusStage || focusStage;

    const checklist = document.getElementById('setup-checklist');
    if (checklist) {
        checklist.classList.toggle('unlocked', inStandardFlow && isChecklistRevealed);
        checklist.classList.toggle(
            'setup-checklist-pulse',
            inStandardFlow && isChecklistRevealed && activeFocusStage === 'checklist' && !checklistComplete
        );
    }

    const lockHint = document.getElementById('setup-checklist-lock');
    if (lockHint) lockHint.style.display = (inStandardFlow && isChecklistRevealed) ? 'none' : '';
}

function syncEditStandardGroupUiState() {
    var flow = window.editAccessFlow || {};
    var isEmailCopied = !!flow.isEmailCopied;
    var isConsoleOpened = !!flow.isConsoleOpened;
    var isChecklistRevealed = !!flow.isChecklistRevealed;
    var focusStage = flow.setupFocusStage || (isEmailCopied ? 'help' : 'copy');
    var inStandardFlow = flow.mode === 'standard_group';

    var copyBtn = document.getElementById('edit-setup-email-copy-btn');
    var copyIcon = document.getElementById('edit-setup-email-copy-icon');
    if (copyBtn) {
        copyBtn.classList.toggle('is-done', isEmailCopied);
        copyBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'copy');
    }
    if (copyIcon) copyIcon.textContent = isEmailCopied ? '✅' : '📋';

    var actionsReveal = document.getElementById('edit-setup-actions-reveal');
    if (actionsReveal) {
        actionsReveal.classList.toggle('is-open', inStandardFlow && isEmailCopied);
    }

    var helpBtn = document.querySelector('#edit-setup-actions-reveal .setup-help-btn');
    if (helpBtn) {
        helpBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'help');
    }

    var consoleBtn = document.getElementById('edit-setup-console-btn');
    var consoleBtnLabel = document.getElementById('edit-setup-console-btn-label');
    if (consoleBtn) {
        consoleBtn.classList.toggle('is-opened', isConsoleOpened);
        consoleBtn.classList.toggle('setup-pulse-accent', inStandardFlow && focusStage === 'console');
    }
    if (consoleBtnLabel) {
        consoleBtnLabel.textContent = window.t(isConsoleOpened ? 'goToPlayConsoleOpened' : 'publicGroupOpenConsoleBtn', {}, lang);
    }

    var checklistReveal = document.getElementById('edit-setup-checklist-reveal');
    if (checklistReveal) {
        checklistReveal.classList.toggle('is-open', inStandardFlow && isChecklistRevealed);
    }

    ['edit-check-email', 'edit-check-countries', 'edit-check-review'].forEach(function (id) {
        var box = document.getElementById(id);
        if (!box) return;
        if (id === 'edit-check-email') box.checked = !!(flow.checklist && flow.checklist.email);
        if (id === 'edit-check-countries') box.checked = !!(flow.checklist && flow.checklist.countries);
        if (id === 'edit-check-review') box.checked = !!(flow.checklist && flow.checklist.review);
        box.disabled = !(inStandardFlow && isChecklistRevealed);
    });

    var checklistComplete = !!(window.AccessSetupManager && window.AccessSetupManager.isChecklistComplete());
    if (checklistComplete && flow.setupFocusStage === 'checklist') {
        flow.setupFocusStage = 'done';
    }
    var activeFocusStage = flow.setupFocusStage || focusStage;

    var checklist = document.getElementById('edit-setup-checklist');
    if (checklist) {
        checklist.classList.toggle('unlocked', inStandardFlow && isChecklistRevealed);
        checklist.classList.toggle(
            'setup-checklist-pulse',
            inStandardFlow && isChecklistRevealed && activeFocusStage === 'checklist' && !checklistComplete
        );
    }
}

function unlockSetupChecklist() {
    if (window.addProjectFlow) {
        window.addProjectFlow.emailCopied = true;
        window.addProjectFlow.isEmailCopied = true;
        window.addProjectFlow.setupFocusStage = 'help';
    }
    _scheduleAddChecklistReveal();
    syncStandardGroupUiState();
    evaluateAddStages();
}

document.addEventListener('click', (event) => {
    const summary = event.target.closest('details > summary');
    if (!summary) return;
    event.preventDefault();
    event.stopPropagation();
    toggleDetailsWithAnimation(summary.parentElement);
});

/* ── Project Details Modal ────────────────────────── */
function openProjectDetailsModal(appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    const test = myTests.find(function (t) { return t.id === appId; });
    if (!test) return;

    const body = document.getElementById('project-details-body');
    if (!body) return;

    if (test.is_external) {
        renderExternalProjectDetailsModal(test, body);
        var externalModal = document.getElementById('project-details-modal');
        if (externalModal) {
            externalModal.dataset.appId = String(Number(test.id) || '');
            externalModal.classList.add('active');
        }
        return;
    }

    const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
    const safePackage = window.escapeHTML(test.package || '');
    const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
    const displayOwner = window.escapeHTML(test.owner_username ? '@' + test.owner_username : window.t('unknownLabel', {}, lang));
    const timelineMeta = getTestingTimelineMeta(test);
    const userTestingDay = timelineMeta.userTestingDay;
    const skips = Number(test.skips_count || 0);
    const totalCheckins = Number(test.checkins_count || 0);
    const daysSinceCreated = Number(test.days_since_publish || 0);
    const left = isProjectSynced(test)
        ? Math.max(0, 14 - getProjectSyncStartDay(test))
        : Math.max(0, 14 - daysSinceCreated);
    const potential = totalCheckins + left;
    const ownerActivity = getOwnerActivityMeta(test.last_owner_activity);
    const ownerKarmaRaw = test && typeof test.owner_karma !== 'undefined' ? test.owner_karma : test.ownerKarma;
    const ownerKarma = Number.isFinite(Number(ownerKarmaRaw)) ? Number(ownerKarmaRaw) : 0;
    const hasPlayReviewRequest = !!test.request_reviews;
    const rewardsSummary = (test && test.rewards_summary && typeof test.rewards_summary === 'object') ? test.rewards_summary : {};
    const reviewRejected = !!rewardsSummary.review_rejected;
    const reviewConfirmed = !reviewRejected && !!(test.play_feedback_submitted || rewardsSummary.review_marked);
    const reviewPending = !reviewRejected && !reviewConfirmed && !!test.play_feedback_submitted_pending;
    const reviewMarked = reviewConfirmed || reviewPending;
    const reviewPlatformKarma = Number(rewardsSummary.review_platform_karma || 0);
    const reviewOwnerBoostBust = Number(rewardsSummary.review_owner_boost_bust || 0);
    const reviewOwnerBoostKarma = Number(rewardsSummary.review_owner_boost_karma || 0);
    const hasGuestOrigin = hasGuestLinkRelationship(test);

    let currentGoogleDay = timelineMeta.currentGoogleDay;
    let projectDaysLeft = timelineMeta.projectDaysLeft;
    let expectedTotalDays = timelineMeta.expectedTotalDays;
    let overtimeDays = timelineMeta.overtimeDays;
    const progressData = buildGrantProgressSegments(test, userTestingDay, expectedTotalDays);
    const isIssueBlocked = !!test.issue_reported_at && !test.issue_fixed_at;
    const showIssueActionInDetails = test.status !== 'new' && test.status !== 'done';

    const syncHtml = (() => {
        if (!timelineMeta.isSynced) return '';
        const finishDateText = window.escapeHTML(formatDdMmYyyy(timelineMeta.finishDate));
        return '<div class="details-block' + (timelineMeta.isLastDay ? ' sync-last-day-block' : '') + '"' + (timelineMeta.isLastDay ? ' onclick="showSyncLastDayNotice(event)" style="cursor:pointer;"' : '') + '>' +
            '<div style="font-size:14px;font-weight:700;color:#34c759;margin-bottom:6px;">' + window.escapeHTML(window.t('projectSyncedTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);">' + window.escapeHTML(window.t('syncOfficialDay', { day: currentGoogleDay }, lang)) + '</div>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:4px;">' +
                '<div style="font-size:13px;color:var(--hint-color);">' + window.escapeHTML(window.t('syncEstimatedFinish', { date: finishDateText }, lang)) + '</div>' +
                (timelineMeta.isLastDay
                    ? '<button type="button" class="meta-chip accent-red sync-last-day-chip" onclick="showSyncLastDayNotice(event)">' + window.escapeHTML(window.t('syncLastDayChip', {}, lang)) + '</button>'
                    : '') +
            '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.escapeHTML(window.t('timelineApproxRemaining', { count: progressData.remainingDays }, lang)) + '</div>' +
            (overtimeDays > 0
                ? '<div style="font-size:13px;color:#ffd460;margin-top:8px;">' + window.escapeHTML(window.t('syncOvertimeBanner', {}, lang)) + '</div>'
                : '') +
            '<div style="font-size:12px;color:var(--hint-color);margin-top:4px;opacity:0.8;">' + window.escapeHTML(window.t('syncLagNote', {}, lang)) + '</div>' +
        '</div>';
    })();

    const progressFooterHtml = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--hint-color);margin-top:10px;">' +
        '<span>' + window.escapeHTML(window.t('grantProgressText', { day: userTestingDay }, lang)) + '</span>' +
        (progressData.remainingDays > 0
            ? '<span>' + window.escapeHTML(window.t('timelineApproxRemaining', { count: progressData.remainingDays }, lang)) + '</span>'
            : '<span>' + window.escapeHTML(window.t('timelineNoRemaining', {}, lang)) + '</span>') +
        (overtimeDays > 0
            ? '<button type="button" class="detail-overtime-banner detail-overtime-chip" onclick="showToast(\'' + escapeInlineJsString(window.t('overtimeChipToast', {}, lang)) + '\')">' + window.escapeHTML(window.t('detailOvertimeReward', {}, lang)) + '</button>'
            : '') +
    '</div>';
    const timelinePanelHtml = '<button type="button" class="grant-progress-hitbox" onclick="openTimelineStatsSheet(' + test.id + ')">' +
        progressData.html +
        progressFooterHtml +
    '</button>';

    var instructionsHtml = '<div class="details-block"><div class="detail-section-title">' + window.t('devInfo', {}, lang) + '</div>' +
        '<div class="detail-instruction-body">' + (test.instructions ? escapeHtmlWithBreaks(test.instructions) : '—') + '</div></div>';

    var googleGroupHtml = '';
    var _groupUrl = test.google_group_url || '';
    if (_groupUrl) {
        googleGroupHtml = '<div class="details-block">' +
            '<div class="detail-section-title">' + window.t('detailGoogleGroup', {}, lang) + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div class="notranslate" style="flex:1;font-size:13px;color:var(--link-color);cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" onclick="tg.openLink(\'' + window.escapeInlineJsString(_groupUrl) + '\')">' + window.escapeHTML(_groupUrl) + '</div>' +
                '<button class="btn-icon" style="width:32px;height:32px;font-size:14px;border-radius:8px;flex-shrink:0;" onclick="event.stopPropagation();navigator.clipboard.writeText(\'' + window.escapeInlineJsString(_groupUrl) + '\');if(tg.HapticFeedback)tg.HapticFeedback.notificationOccurred(\'success\');showToast(\'' + escapeInlineJsString(window.t('detailGoogleGroupCopied', {}, lang)) + '\')">📋</button>' +
            '</div>' +
        '</div>';
    }
    var economicsHtml = '';
    if (Number(test.bounty_per_tester || 0) > 0) {
        var perTester = Number(test.bounty_per_tester || 0);
        var dailyReward = perTester * 0.65 / 14;
        var holdBonus = perTester * 0.35;
        economicsHtml = '<div class="details-block">' +
            '<div class="detail-section-title">' + window.escapeHTML(window.t('contractEconomicsTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px; line-height:1.7; color: var(--text-color);">' +
                '<div>' + window.escapeHTML(window.t('contractDailyReward', { amount: formatUiAmount(dailyReward, 1) }, lang)) + '</div>' +
                '<div style="margin-top:6px;">' + window.escapeHTML(window.t('contractHoldBonus', { amount: formatUiAmount(holdBonus, 1) }, lang)) + '</div>' +
                '<div style="margin-top:6px; color: var(--hint-color);">' + window.escapeHTML(window.t('contractEarlyFinishNote', {}, lang)) + '</div>' +
            '</div>' +
        '</div>';
    }

    var playReviewRequestHtml = '';
    if (hasPlayReviewRequest) {
        var reviewStatusHtml = reviewRejected
            ? '<span class="meta-chip accent-red">❌ ' + window.escapeHTML(window.t('playReviewDetailsRejectedChip', {}, lang)) + '</span>'
            : (reviewConfirmed
                ? '<span class="meta-chip accent-green">✅ ' + window.escapeHTML(window.t('playReviewDetailsCompletedChip', {}, lang)) + '</span>'
                : (reviewPending
                    ? '<span class="meta-chip accent-yellow">⏳ ' + window.escapeHTML(window.t('playReviewDetailsPendingChip', {}, lang)) + '</span>'
                    : '<span class="meta-chip">⭐ ' + window.escapeHTML(window.t('playReviewDetailsNotSubmittedChip', {}, lang)) + '</span>'));
        var reviewRewardParts = [];
        if (reviewPlatformKarma > 0) {
            reviewRewardParts.push(window.escapeHTML(window.t('playReviewDetailsPlatformReward', { amount: formatAmountValue(reviewPlatformKarma, 1) }, lang)));
        }
        if (reviewOwnerBoostBust > 0 || reviewOwnerBoostKarma > 0) {
            reviewRewardParts.push(window.escapeHTML(window.t('playReviewDetailsOwnerReward', {
                bust: formatAmountValue(reviewOwnerBoostBust, 1),
                karma: formatAmountValue(reviewOwnerBoostKarma, 1),
            }, lang)));
        }
        var reviewRejectedHtml = reviewRejected
            ? '<div style="font-size:13px; line-height:1.55; color:#ff6b6b; margin-top: 8px;">' + window.escapeHTML(window.t('playReviewRejectedWarning', {}, lang)) + '</div>'
            : '';
        var reviewCheckboxHtml = '<label class="review-checkbox-row review-checkbox-row-modal" style="margin: 14px 0 0;">' +
            '<input type="checkbox" ' + (reviewMarked ? 'checked ' : '') + (reviewConfirmed ? 'disabled ' : '') + 'onchange="toggleProjectDetailsReviewCheckbox(this, ' + Number(test.id) + ')">' +
            '<span>' + window.escapeHTML(window.t('playReviewCheckboxLabel', {}, lang)) + '</span>' +
        '</label>' +
        '<div style="font-size:12px; color: var(--hint-color); margin-top: 4px;">' + window.escapeHTML(window.t('playReviewRequiresScreenshotHint', {}, lang)) + '</div>';
        var reviewRewardHtml = reviewRewardParts.length
            ? '<div style="font-size:13px; line-height:1.55; color: var(--hint-color); margin-top: 8px;">' + reviewRewardParts.join('<br>') + '</div>'
            : '<div style="font-size:13px; line-height:1.55; color: var(--hint-color); margin-top: 8px;">' + window.escapeHTML(window.t(reviewPending || reviewConfirmed ? 'playReviewDetailsNoRewardYet' : 'playReviewDetailsStartHint', {}, lang)) + '</div>';
        playReviewRequestHtml = '<div class="details-block">' +
            '<div class="detail-section-title">⭐ ' + window.escapeHTML(window.t('playReviewDetailsTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px; line-height:1.65; color: var(--text-color); margin-top: 6px;">' + window.escapeHTML(window.t('playReviewDetailsText', {}, lang)) + '</div>' +
            '<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">' + reviewStatusHtml + '</div>' +
            reviewCheckboxHtml +
            reviewRewardHtml +
            reviewRejectedHtml +
            '<button class="btn btn-secondary" style="width:100%; margin-top:10px; background-color: rgba(52,199,89,0.12); color: var(--text-color); border: 1px solid rgba(52,199,89,0.24);" onclick="openPlayReviewStoreByAppId(' + Number(test.id) + ', event)">' +
                window.escapeHTML(window.t('playReviewDetailsOpenBtn', {}, lang)) +
            '</button>' +
        '</div>';
    }

    var rewardsByAppHtml = '';
    var checkinKarma = Number(rewardsSummary.checkin_karma || 0);
    var ownerKarmaTotal = Number(rewardsSummary.owner_karma_total || 0);
    var feedbackKarma = Number(rewardsSummary.feedback_karma || 0);
    var feedbackBust = Number(rewardsSummary.feedback_bust || 0);
    var totalKarma = Number(rewardsSummary.total_karma || 0);
    var totalBust = Number(rewardsSummary.total_bust || 0);
    var rewardsRows = [];
    if (checkinKarma > 0) {
        rewardsRows.push('<div class="dashboard-row"><span class="dashboard-label">' + window.escapeHTML(window.t('appRewardsCheckinKarma', {}, lang)) + '</span><span class="dashboard-label" style="font-weight:700;">+' + window.escapeHTML(formatAmountValue(checkinKarma, 1)) + ' ☯️</span></div>');
    }
    if (ownerKarmaTotal > 0) {
        rewardsRows.push('<div class="dashboard-row"><span class="dashboard-label">' + window.escapeHTML(window.t('appRewardsOwnerKarma', {}, lang)) + '</span><span class="dashboard-label" style="font-weight:700;">+' + window.escapeHTML(formatAmountValue(ownerKarmaTotal, 1)) + ' ☯️</span></div>');
    }
    if (feedbackKarma > 0 || feedbackBust > 0) {
        rewardsRows.push('<div class="dashboard-row"><span class="dashboard-label">' + window.escapeHTML(window.t('appRewardsFeedback', {}, lang)) + '</span><span class="dashboard-label notranslate" style="font-weight:700;">+' + window.escapeHTML(formatAmountValue(feedbackKarma, 1)) + ' ☯️ / +' + window.escapeHTML(formatAmountValue(feedbackBust, 1)) + ' $BUST</span></div>');
    }
    if (reviewOwnerBoostBust > 0 || reviewOwnerBoostKarma > 0) {
        rewardsRows.push('<div class="dashboard-row"><span class="dashboard-label">' + window.escapeHTML(window.t('appRewardsReviewBoost', {}, lang)) + '</span><span class="dashboard-label notranslate" style="font-weight:700;">+' + window.escapeHTML(formatAmountValue(reviewOwnerBoostKarma, 1)) + ' ☯️ / +' + window.escapeHTML(formatAmountValue(reviewOwnerBoostBust, 1)) + ' $BUST</span></div>');
    }
    if (reviewPlatformKarma > 0) {
        rewardsRows.push('<div class="dashboard-row"><span class="dashboard-label">' + window.escapeHTML(window.t('appRewardsReviewPlatform', {}, lang)) + '</span><span class="dashboard-label" style="font-weight:700;">+' + window.escapeHTML(formatAmountValue(reviewPlatformKarma, 1)) + ' ☯️</span></div>');
    }
    if (rewardsRows.length > 0) {
        rewardsByAppHtml = '<div class="details-block">' +
            '<div class="detail-section-title">🎁 ' + window.escapeHTML(window.t('appRewardsTitle', {}, lang)) + '</div>' +
            rewardsRows.join('') +
            '<div class="notranslate" style="margin-top:8px; font-size:13px; color:var(--hint-color);">' + window.escapeHTML(window.t('appRewardsTotals', { karma: formatAmountValue(totalKarma, 1), bust: formatAmountValue(totalBust, 1) }, lang)) + '</div>' +
        '</div>';
    }

    const grant = getGrantEstimateData(test);
    const currentSkips = Math.max(0, Number(grant.skips || 0));
    const skipIndicator = Array.from({ length: 3 }, function(_, index) {
        return index < currentSkips
            ? '<span class="skip-dot used"></span>'
            : '<span class="skip-dot available"></span>';
    }).join('');
    const perfectCardClass = currentSkips > 0 ? ' grant-reward-card-burned' : '';
    const perfectValueLabel = window.t('grantPerfectValue', { amount: formatBustAmount(50) }, lang);
    const perfectValue = currentSkips > 0 ? '<span class="grant-burned-text">' + window.escapeHTML(perfectValueLabel) + '</span>' : window.escapeHTML(perfectValueLabel);
    const perfectStatus = currentSkips > 0 ? window.t('grantCardBurned', {}, lang) : window.t('grantCardActive', {}, lang);
    let grantDashboardHtml = '';
    var mutualOfferButtonHtml = canProposeMutualFromTest(test)
        ? '<button class="btn" style="background:rgba(10,132,255,0.16);color:#63adff;border:1px solid rgba(10,132,255,0.32);" onclick="closeProjectDetailsModal(); createMutualOffer(' + Number(test.id || 0) + ', ' + Number(test.owner_id || 0) + ', event)">' + window.escapeHTML(window.t('proposeMutualBtn', {}, lang)) + '</button>'
        : '';

    if (grant.eligible) {
        grantDashboardHtml = '<div class="grant-dashboard-block">' +
            '<div class="grant-dashboard-header">' +
                '<div class="grant-dashboard-heading">' +
                    '<div class="grant-dashboard-title">' + window.escapeHTML(window.t('grantGoldTesterTitle', {}, lang)) + '</div>' +
                    '<div class="grant-dashboard-subtitle">' + window.escapeHTML(window.t('grantDashboardSubtitle', {}, lang)) + '</div>' +
                '</div>' +
                '<div class="grant-dashboard-total notranslate">' + window.escapeHTML(window.t('grantTotalEstimateValue', { amount: formatBustAmount(grant.total) }, lang)) + '</div>' +
            '</div>' +
            '<div class="grant-dashboard-skips-row">' +
                '<span class="grant-skip-text">' + window.escapeHTML(window.t('grantSkipsLabel', { used: currentSkips, max: 3 }, lang)) + '</span>' +
                '<span class="grant-dashboard-skips">' + skipIndicator + '</span>' +
            '</div>' +
            '<div class="grant-reward-grid">' +
                '<div class="grant-reward-card">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantBaseLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value notranslate">' + window.escapeHTML(window.t('grantBaseValue', { amount: formatBustAmount(50) }, lang)) + '</div>' +
                    '<div class="grant-reward-status is-active">' + window.escapeHTML(window.t('grantCardActive', {}, lang)) + '</div>' +
                '</div>' +
                '<div class="grant-reward-card' + perfectCardClass + '">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantPerfectLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value notranslate">' + perfectValue + '</div>' +
                    '<div class="grant-reward-status ' + (currentSkips > 0 ? 'is-burned' : 'is-active') + '">' + window.escapeHTML(perfectStatus) + '</div>' +
                '</div>' +
                '<div class="grant-reward-card">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantKarmaBonusLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value notranslate">' + window.escapeHTML(window.t('grantKarmaValue', { amount: formatBustAmount(grant.karmaBonus) }, lang)) + '</div>' +
                    '<div class="grant-reward-status is-active">' + window.escapeHTML(window.t('grantCardActive', {}, lang)) + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    } else {
        grantDashboardHtml = '<details class="grant-dashboard-block grant-dashboard-block-lost">' +
            '<summary class="grant-dashboard-lost-summary">' +
                '<span class="grant-dashboard-lost-icon">🏆</span>' +
                '<span class="grant-dashboard-lost-title">' + window.escapeHTML(window.t('grantGoldTesterTitle', {}, lang)) + '</span>' +
                '<span class="grant-dashboard-lost-arrow">›</span>' +
            '</summary>' +
            '<div class="grant-dashboard-lost-body">' +
                '<div class="grant-dashboard-subtitle">' + window.escapeHTML(window.t('grantLostLabel', {}, lang)) + '</div>' +
                '<div class="grant-reward-grid grant-reward-grid-lost">' +
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantBaseLabel', {}, lang)) + '</div><div class="grant-reward-value notranslate"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantBaseValue', { amount: formatBustAmount(50) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantPerfectLabel', {}, lang)) + '</div><div class="grant-reward-value notranslate"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantPerfectValue', { amount: formatBustAmount(50) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantKarmaBonusLabel', {}, lang)) + '</div><div class="grant-reward-value notranslate"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantKarmaValue', { amount: formatBustAmount(grant.karmaBonus) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                '</div>' +
            '</div>' +
        '</details>';
    }

    body.innerHTML =
        '<div class="detail-header">' +
            renderIcon(test.name || '', test.icon_url) +
            '<div class="card-info">' +
                '<div class="card-title notranslate">' + safeName + '</div>' +
                '<div class="card-subtitle notranslate">' + safePackage + '</div>' +
            '</div>' +
        '</div>' +

        grantDashboardHtml +

        '<div class="details-block">' +
            timelinePanelHtml +
        '</div>' +

        syncHtml +

        '<div class="details-block">' +
            '<div class="detail-section-title">' + window.t('detail_owner_label', {}, lang) + '</div>' +
            '<div class="detail-owner-row">' +
                getAvatar(test.owner_username || '?') +
                '<div>' +
                    '<div class="detail-owner-name notranslate">' + displayOwner + '</div>' +
                    '<div class="detail-owner-status ' + ownerActivity.detailClass + '" style="cursor:pointer;" onclick="showOwnerLastSeenToast(\'' + escapeInlineJsString(test.last_owner_activity || '') + '\')">' +
                        window.escapeHTML(getOwnerDetailStatusText(test.last_owner_activity)) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('ownerKarmaText', { karma: ownerKarma }, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('detail_testers_label', { count: test.active_testers_count || 0 }, lang) + '</div>' +
        '</div>' +

        googleGroupHtml +

        instructionsHtml +

        economicsHtml +

        playReviewRequestHtml +

        rewardsByAppHtml +

        '<div class="detail-actions">' +
            '<button class="btn" style="background:var(--button-color);color:var(--button-text-color);" onclick="closeProjectDetailsModal(); openTelegramProfile(\'' + safeOwnerUsername + '\')">' + window.t('detail_contact_btn', {}, lang) + '</button>' +
            mutualOfferButtonHtml +
            '<button class="btn" style="background:rgba(142,142,147,0.18);color:var(--text-color);" onclick="closeProjectDetailsModal(); initiateProjectFeedback(' + test.id + ')">' + window.t('detail_suggest_btn', {}, lang) + '</button>' +
            '<button class="btn" style="background:rgba(52,199,89,0.14);color:#34c759;" onclick="tg.openLink(\'https://play.google.com/store/apps/details?id=' + window.escapeHTML(test.package || '') + '\')">' + window.t('openGooglePlay', {}, lang) + '</button>' +
            (showIssueActionInDetails
                ? (isIssueBlocked
                    ? '<button class="btn" style="background:rgba(142,142,147,0.18);color:var(--hint-color);cursor:not-allowed;" disabled>' + getIssueAwaitingFixLabel(test) + '</button>'
                    : '<button class="btn" style="background:rgba(255,59,48,0.12);color:#ff6b63;border:1px solid rgba(255,59,48,0.35);" onclick="closeProjectDetailsModal(); openIssueReportModal(' + test.id + ')">' + window.t('reportIssueBtnLabel', {}, lang) + '</button>')
                : '') +
            (userTestingDay >= 15
                ? '<button class="btn" style="background:rgba(52,199,89,0.14);color:#34c759;" onclick="closeProjectDetailsModal(); openOvertimeModal(' + test.id + ')">' + window.t('finish_project', {}, lang) + '</button>'
                : (hasGuestOrigin
                    ? '<button class="btn" style="background:rgba(255,59,48,0.14);color:#ff4d4f;" onclick="openGuestLinkRemoveModalFromTest(' + test.id + ', event)">' + window.t('guestLinkRemoveBtn', {}, lang) + '</button>'
                    : '<button class="btn" style="background:rgba(255,59,48,0.14);color:#ff4d4f;" onclick="closeProjectDetailsModal(); ' + (isMutualExitFlow(test) ? 'openLeaveMutualModal(' + test.id + ')' : 'openDropTestModal(' + test.id + ')') + '">' + window.t('detail_leave_btn', {}, lang) + '</button>')) +
        '</div>';

    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.dataset.appId = String(Number(test.id) || '');
        modal.classList.add('active');
    }
}

function closeProjectDetailsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.dataset.appId = '';
        modal.classList.remove('active');
    }
}

