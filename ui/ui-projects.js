/* Phase 4.3 — ui/ui-projects.js (structural split from ui.js) */

function _isProjectSyncedSafe(project) {
    try {
        if (typeof window.isProjectSynced === 'function') {
            return !!window.isProjectSynced(project);
        }
    } catch (e) {}
    var syncDay = Number(project && project.google_sync_day || 0);
    return Number.isFinite(syncDay) && syncDay >= 1 && !!(project && project.last_sync_date);
}

var GOOGLE_CLOSED_TEST_QUOTA = 12;

function getProjectDailyProgressMeta(project) {
    const today = typeof getLocalDate === 'function' ? getLocalDate() : '';
    const testers = Array.isArray(project && project.testers) ? project.testers : [];
    let countDone = 0;
    testers.forEach(function (tester) {
        if (tester.is_left_soft) return;
        if (tester.is_guest_tester || tester.is_external) {
            var controlMeta = typeof getExternalTesterControlMeta === 'function'
                ? getExternalTesterControlMeta(tester)
                : { tone: '' };
            if (controlMeta.tone === 'green') countDone += 1;
            return;
        }
        if (tester.last_check_date === today) countDone += 1;
    });
    const presentCount = testers.filter(function (tester) {
        return !tester.is_left_soft;
    }).length;
    const targetCheckins = Math.min(presentCount, GOOGLE_CLOSED_TEST_QUOTA);
    const dailyPercentage = targetCheckins > 0 ? (countDone / targetCheckins) * 100 : 0;
    const displayPercentage = Math.round(dailyPercentage);
    const isOverachieved = dailyPercentage > 100;
    const ringDegrees = Math.round(Math.min(dailyPercentage, 100) * 3.6);
    const ringGradientMid = Math.round(ringDegrees * 0.55);
    const ringOverMidA = Math.round(ringDegrees * 0.45);
    const ringStyle = displayPercentage <= 0
        ? '--pc-ring-deg: 0deg;'
        : isOverachieved
            ? `--pc-ring-deg: ${ringDegrees}deg; --pc-ring-bg: conic-gradient(from -90deg, #af52de 0deg, #ff9500 ${ringOverMidA}deg, #ff2d55 ${ringDegrees}deg, rgba(255,255,255,0.07) ${ringDegrees}deg 360deg);`
            : `--pc-ring-deg: ${ringDegrees}deg; --pc-ring-bg: conic-gradient(from -90deg, #34c759 0deg, #30b0c7 ${ringGradientMid}deg, #2ecbd6 ${ringDegrees}deg, rgba(255,255,255,0.07) ${ringDegrees}deg 360deg);`;
    return {
        countDone: countDone,
        presentCount: presentCount,
        targetCheckins: targetCheckins,
        displayPercentage: displayPercentage,
        isOverachieved: isOverachieved,
        ringStyle: ringStyle,
    };
}

function buildProjectDailyProgressRingHtml(project) {
    const meta = getProjectDailyProgressMeta(project);
    const uiLang = typeof lang !== 'undefined' ? lang : 'ru';
    return `<div class="pc-ring${meta.isOverachieved ? ' is-over' : ''}${meta.displayPercentage === 0 ? ' is-zero' : ''}" style="${meta.ringStyle}" role="img" aria-label="${window.escapeHTML(window.t('pcDayProgressLabel', {}, uiLang))} ${meta.displayPercentage}%">
        <span class="pc-ring__value">${meta.displayPercentage}%</span>
        ${meta.isOverachieved ? `<span class="pc-ring__caption">${window.escapeHTML(window.t('pcOverchargeLabel', {}, uiLang))}</span>` : ''}
    </div>`;
}

window.getProjectDailyProgressMeta = getProjectDailyProgressMeta;
window.buildProjectDailyProgressRingHtml = buildProjectDailyProgressRingHtml;

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

function buildProjectCardSubtitle(project) {
    if (!project) return '<div class="card-subtitle notranslate"></div>';
    const isEmail = String(project.test_mode || 'google_group') === 'email_list';
    const hasReviews = project.request_reviews !== false;
    const packageName = project.package || project.package_name || '';
    const chips = [];

    if (isEmail) {
        chips.push(`<span class="pc-subtitle-chip">${window.escapeHTML(window.t('emailTestModeChip', {}, lang))}</span>`);
    }
    if (hasReviews) {
        chips.push(`<span class="pc-subtitle-chip">${window.escapeHTML(window.t('pcCardSubtitleReviews', {}, lang))}</span>`);
    }

    if (chips.length) {
        return `<div class="card-subtitle card-subtitle--chips notranslate">${chips.join('')}</div>`;
    }
    if (packageName) {
        return `<div class="card-subtitle notranslate">${window.escapeHTML(packageName)}</div>`;
    }
    return '<div class="card-subtitle notranslate"></div>';
}



function renderProjects(force) {
    if (!force && !isTabVisible('projects')) return;
    if (typeof window.syncHomeScreenUi === 'function') {
        window.syncHomeScreenUi();
    }
    const container = document.getElementById('projects-list');
    container.innerHTML = '';

    if (visibilityStats) {
        let reliabilityValue = '';
        let isNewbie = true;
        let statusText = '';
        let metricClass = 'metric-card-success';
        if (typeof visibilityStats.reliability_index !== 'undefined' && visibilityStats.reliability_index !== null) {
            const score = Number(visibilityStats.reliability_index);
            const status = visibilityStats.reliability_status || 'newbie';
            isNewbie = (status === 'newbie');
            reliabilityValue = isNewbie ? window.t('reliabilityDashStatus_newbie', {}, lang) : String(Math.round(score));
            statusText = isNewbie ? '' : window.t('reliabilityDashStatus_' + status, {}, lang);
            if (isNewbie) metricClass = 'metric-card-neutral';
            else if (status === 'bad') metricClass = 'metric-card-danger';
            else if (status === 'minimal') metricClass = 'metric-card-warning';
            else if (status === 'basic') metricClass = 'metric-card-success';
            else if (status === 'active') metricClass = 'metric-card-success';
            else if (status === 'expert') metricClass = 'metric-card-success';
        } else {
            const reliability = calculateReliability(visibilityStats.total_expected_checkins, visibilityStats.total_actual_checkins);
            isNewbie = (reliability.percent === null);
            reliabilityValue = isNewbie ? reliability.text : String(reliability.percent);
            statusText = isNewbie ? '' : reliability.text;
            if (isNewbie) metricClass = 'metric-card-neutral';
            else if (reliability.percent >= 80) metricClass = 'metric-card-success';
            else if (reliability.percent >= 65) metricClass = 'metric-card-warning';
            else metricClass = 'metric-card-danger';
        }
        const goldenCount = Number(visibilityStats.golden_count || 0);
        const totalGrants = Number(visibilityStats.grant_tests_count || 0);
        const completedTests = Number(visibilityStats.completed_tests || 0);
        const activeTests = Number(visibilityStats.my_active_tests || 0);
        const seasonCached = (visibilityStats && visibilityStats.contribution_season) || {};
        const seasonReady = !!(seasonCached && (seasonCached.ends_at || seasonCached.season_number != null || seasonCached._loaded));
        const seasonRankRaw = seasonCached.rank;
        const seasonRank = seasonRankRaw != null ? Number(seasonRankRaw) : null;
        const hasSeasonRank = !!(seasonRank && seasonRank > 0);
        let contributionPrimary = '—';
        if (seasonReady && hasSeasonRank) {
            contributionPrimary = '#' + Math.round(seasonRank);
        }
        let contributionTimer = '';
        const endsAtMs = Date.parse(String(seasonCached.ends_at || ''));
        if (Number.isFinite(endsAtMs)) {
            // Match modal countdown: full days remaining via floor (not ceil).
            const daysLeft = Math.max(0, Math.floor((endsAtMs - Date.now()) / 86400000));
            contributionTimer = window.t('metricSprintDaysLeft', { days: daysLeft }, lang) || ('Осталось ' + daysLeft + ' дн.');
        }
        const balanceAmount = (typeof formatUiAmount === 'function')
            ? formatUiAmount(visibilityStats.balance_bust || 0, 1)
            : String(Math.round(Number(visibilityStats.balance_bust || 0) * 10) / 10);
        const projectsList = (typeof myProjects !== 'undefined' && Array.isArray(myProjects)) ? myProjects : ((visibilityStats && visibilityStats.projects) || []);
        const reservedBust = projectsList.reduce(function(acc, p) {
            if (!p) return acc;
            const status = String(p.status || p.app_status || 'active').toLowerCase();
            if (status === 'completed' || status === 'archived') return acc;
            const mode = String(p.mode || 'mutual').toLowerCase();
            if (mode !== 'bounty' && mode !== 'hybrid') return acc + Number(p.protection_bust_pool || 0);
            const limit = Number(p.limit_bounty || 0);
            const rate = Number(p.bounty_per_tester || 0);
            const protection = Number(p.protection_bust_pool || 0);
            return acc + (limit * rate) + protection;
        }, 0);
        const reservedBustFormatted = (typeof formatUiAmount === 'function')
            ? formatUiAmount(reservedBust, 1)
            : String(Math.round(Number(reservedBust || 0) * 10) / 10);
        const achievementsLine = window.escapeHTML(
            formatDeveloperAchievements(completedTests, goldenCount, totalGrants, activeTests)
        );
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
                    <button type="button" class="metric-card metric-card-clickable ${metricClass}" onclick="showReliabilityInfo()">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricReliabilityV2', {}, lang)}</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-value">
                            ${window.escapeHTML(reliabilityValue)}${!isNewbie ? ' %' : ''}
                            ${statusText ? `<span class="metric-value-status" style="font-size: 11px; opacity: 0.85; font-weight: normal; margin-left: 4px;">(${window.escapeHTML(statusText)})</span>` : ''}
                        </div>
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
                            <span class="metric-label">${window.t('metricBalanceBust', {}, lang) || 'Баланс'} $BUST</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-bust-body">
                            <div class="metric-value">${window.escapeHTML(balanceAmount)} <span class="metric-value-mark">💎</span></div>
                            ${reservedBust > 0 ? `<div class="metric-bust-reserved">${window.escapeHTML(reservedBustFormatted)} ${window.t('metricBustReservedLabel', {}, lang) || 'в резерве'}</div>` : ''}
                        </div>
                    </button>
                    <button type="button" class="metric-card metric-card-clickable metric-card-neutral metric-card-sprint" onclick="showContributionInfo()">
                        <div class="metric-card-top">
                            <span class="metric-label">${window.t('metricSprintPositionLabel', {}, lang) || (lang === 'ru' ? 'Позиция в Спринте' : 'Sprint position')}</span>
                            <span class="metric-chevron">›</span>
                        </div>
                        <div class="metric-sprint-body">
                            <div class="metric-value metric-value--sprint">${window.escapeHTML(contributionPrimary)}</div>
                            ${contributionTimer ? `<div class="metric-sprint-timer">${window.escapeHTML(contributionTimer)}</div>` : ''}
                        </div>
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', dashHtml);

        // Soft-prefetch current sprint once per session so the widget is stable (no text jump).
        if (!window.__contribSeasonPrefetch && typeof window.fetchContributionCurrent === 'function') {
            window.__contribSeasonPrefetch = true;
            window.fetchContributionCurrent().then(function(result) {
                if (!result || result.status !== 'success' || !result.season) {
                    if (visibilityStats) {
                        visibilityStats.contribution_season = Object.assign({}, visibilityStats.contribution_season || {}, {
                            _loaded: true,
                        });
                    }
                    return;
                }
                if (typeof window._cacheContributionSeasonSnapshot === 'function') {
                    window._cacheContributionSeasonSnapshot(result);
                } else if (visibilityStats) {
                    const me = result.me || {};
                    const season = result.season || {};
                    visibilityStats.contribution_season = {
                        rank: me.rank != null ? Number(me.rank) : null,
                        score: Number(me.contribution_score || 0),
                        season_number: season.season_number != null ? Number(season.season_number) : null,
                        ends_at: season.ends_at || null,
                        gap_to_top5: Number(result.gap_to_top5 || 0),
                        _loaded: true,
                    };
                    visibilityStats.contribution = {
                        contribution_score: Number(me.contribution_score || 0),
                        bugs_count: Number(me.bugs_count || 0),
                        ideas_count: Number(me.ideas_count || 0),
                        play_reviews_count: Number(me.play_reviews_count || 0),
                    };
                    visibilityStats.contribution_score = Number(me.contribution_score || 0);
                }
                try { renderProjects(true); } catch (_) { /* ignore */ }
            }).catch(function() { /* ignore */ });
        }
    }

    renderGuaranteedOrdersSection(container);
    renderGuaranteedDraftBanner(container);

    if (myProjects.length === 0) {
        container.insertAdjacentHTML('beforeend', `
            <div class="empty-state">
                <div class="empty-icon">📂</div>
                <p>${t.emptyProjects}</p>
            </div>
        `);
        return;
    }

    container.insertAdjacentHTML(
        'beforeend',
        '<h2 class="guaranteed-orders-section__title projects-mutual-section-title">' +
            window.escapeHTML(getProjectUiText('mutualOrdersSectionTitle', 'Mutual testing')) +
        '</h2>'
    );

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

    myProjects.forEach((project, index) => {
        try {
        const card = document.createElement('div');
        const isInactive = !project.is_visible;
        const projectStatus = String(project.app_status || project.status || 'active').toLowerCase();
        const isPendingCompletion = projectStatus === 'pending_completion';
        const safeProjectName = window.escapeHTML(project.name || window.t('unknownLabel', {}, lang));
        const projectCardSubtitleHtml = buildProjectCardSubtitle(project);

        const platformDays = getProjectPlatformDay(project.created_at);
        const syncDay = Number(project.google_sync_day || 0);
        const normalizedSyncDay = Number.isFinite(syncDay) ? syncDay : 0;
        const rawGoogleDay = _isProjectSyncedSafe(project)
            ? getProjectCurrentGoogleDay(project, platformDays)
            : platformDays;
        const currentGoogleDay = Math.max(1, Number.isFinite(rawGoogleDay) ? rawGoogleDay : 1);

        const isOvertime = platformDays > 14;
        const needsSyncAttention = isPendingCompletion || (platformDays >= 7 && normalizedSyncDay < 1);
        const hasNewFeedback = (project.feedback_new_count || 0) > 0;
        const requiresAttention = needsSyncAttention || hasNewFeedback;
        let cardClass = isInactive ? 'card card-inactive' : 'card';
        if (!isInactive && !isOvertime && !isPendingCompletion) cardClass += ' card-stage-active';
        if (isOvertime) cardClass += ' card-overtime card-stage-protection';
        if (isPendingCompletion) cardClass += ' card-pending-release card-stage-buffer';
        const pendingIssueTesters = (project.testers || []).filter((tester) => !!tester.issue_reported_at && !tester.issue_fixed_at);
        const hasAccessOverlay = project.status === 'access_error' && pendingIssueTesters.length > 0;

        const collapsedVal = localStorage.getItem('project_card_collapsed_' + project.id);
        // Card collapse hides the dashboard below the state strip; tester roster has its own toggle.
        const isCollapsed = collapsedVal !== null ? (collapsedVal === 'true') : true;
        if (isCollapsed) cardClass += ' card-collapsed';
        const testersCollapsedVal = localStorage.getItem('project_testers_collapsed_' + project.id);
        const isTestersCollapsed = testersCollapsedVal !== null ? (testersCollapsedVal === 'true') : true;
        if (isTestersCollapsed) cardClass += ' card-testers-collapsed';

        card.className = cardClass + (hasAccessOverlay ? ' card-has-access-issue' : '');
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
        const activeRegularTesters = regularTesters.filter(function(tester) {
            return !tester.is_left_soft;
        });
        const leftSoftCount = regularTesters.filter(function(tester) {
            return !!tester.is_left_soft;
        }).length;
        const guestTesterCount = Math.max(Number(project.guest_testers_count || 0), guestTesters.length);

        let testersHtml = '';
        let testerRowsHtml = '';
        // Roster signals surfaced in the collapsed "All testers" summary.
        let attentionCount = 0;
        let mutualDebtCount = 0;
        let brokenLinkCount = 0;
        if (regularTesters.length > 0) {
            regularTesters.forEach((tester) => {
                const joinType = String(tester.join_type || 'invite').toLowerCase();
                const reciprocalAppId = Number(tester.reciprocal_app_id || 0);
                const isMutualLike = joinType === 'mutual' || joinType === 'prelaunch';
                const partnerProgressStatus = String(tester.reciprocal_partner_progress_status || '').toLowerCase();
                const isPartnerLeft = partnerProgressStatus === 'abandoned'
                    || partnerProgressStatus === 'justified_exit'
                    || partnerProgressStatus === 'kicked_by_owner'
                    || partnerProgressStatus === 'canceled_neutral'
                    || partnerProgressStatus === 'dropped';
                const isBrokenReciprocal = isMutualLike && (reciprocalAppId <= 0 || !!tester.is_broken_reciprocal || isPartnerLeft);
                const isLeftSoft = !!tester.is_left_soft;
                if (isBrokenReciprocal
                    && !isLeftSoft
                    && typeof isBrokenTesterDismissed === 'function'
                    && isBrokenTesterDismissed(project.id, tester.tester_id)) {
                    return;
                }

                let nameHtml = '';
                let cleanUsername = '';
                const isContractTester = joinType === 'bounty';
                const isInviteLikeTester = joinType === 'direct' || joinType === 'invite';
                const isMutualDebt = isMutualLike && !!tester.is_mutual_debt;
                let testerPrefixHtml = '';
                if (isMutualDebt) {
                    testerPrefixHtml = '<span class="tester-debt-prefix" title="' + window.escapeHTML(window.t('linkedBadgeDebt', {}, lang)) + '">🫵</span>';
                } else if (isBrokenReciprocal) {
                    testerPrefixHtml = '<span class="tester-broken-prefix" style="margin-right:2px;" title="' + window.escapeHTML(window.t('barterChipBroken', {}, lang) || '💔 Взаимка') + '">💔</span>';
                } else if (isContractTester) {
                    testerPrefixHtml = '<span class="tester-contract-prefix">💎</span>';
                } else if (isInviteLikeTester) {
                    testerPrefixHtml = '<span class="tester-invite-prefix">🔗</span>';
                }
                let testerDay = 0;
                if (tester.testing_days != null && Number(tester.testing_days) > 0) {
                    testerDay = Number(tester.testing_days);
                } else if (tester.start_date) {
                    if (typeof getUserTestingDay === 'function') {
                        testerDay = getUserTestingDay(tester.start_date, tester.testing_days);
                    } else {
                        const startDt = new Date(tester.start_date);
                        if (!Number.isNaN(startDt.getTime())) {
                            testerDay = Math.max(1, Math.floor((todayDate - startDt) / (1000 * 60 * 60 * 24)) + 1);
                        }
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
                if (isLeftSoft) {
                    statusHtml = `<span class="tester-status is-left-soft">${window.escapeHTML(window.t('testerLeftSoftStatus', {}, lang))}</span>`;
                } else {
                    let testerStatusClass = 'is-red';
                    let testerStatusIcon = '🔴';
                    let testerStatusText = t.statusNotOpened;
                    if (!tester.last_check_date) {
                        // keep default red / not opened
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
                        } else {
                            testerStatusClass = 'is-red';
                            testerStatusIcon = '🔴';
                            testerStatusText = `${daysDiff} ${t.statusDaysAgo}`;
                        }
                    }
                    statusHtml = `<span class="tester-status ${testerStatusClass}">${testerStatusIcon} ${window.escapeHTML(testerStatusText)}</span>`;
                }

                const consecutiveSkips = (typeof calculateConsecutiveSkips === 'function')
                    ? calculateConsecutiveSkips(tester)
                    : 0;
                if (!isLeftSoft) {
                    if (consecutiveSkips >= 3) attentionCount++;
                    if (isMutualDebt) mutualDebtCount++;
                    if (isBrokenReciprocal) brokenLinkCount++;
                }
                let warningHtml = '';
                if (!isLeftSoft && consecutiveSkips >= 3) {
                    warningHtml = `<span class="tester-icon-action tester-warn-action" role="button" tabindex="0" title="${window.escapeHTML(window.t('kickTesterConsecutiveSkips', { count: consecutiveSkips }, lang))}" onclick="event.stopPropagation(); openTesterLinkStatusFromRow(${Number(project.id)}, ${Number(tester.tester_id)}, event)">⚠️</span>`;
                }

                let brokenHtml = '';

                let screenshotDayHtml = '';
                if (!isLeftSoft && isMandatoryScreenshotDay(testerDay)) {
                    screenshotDayHtml = `<span class="tester-icon-action" onclick="event.stopPropagation(); showScreenshotDayAlert()">📸</span>`;
                }

                let karmaHtml = '';
                const alreadyLiked = (project.likes || []).some((like) => like.tester_id === tester.tester_id);
                if (!isLeftSoft && alreadyLiked) {
                    karmaHtml = '<span class="tester-icon-action tester-icon-muted" title="☯️">+☯️</span>';
                }

                const joinTypeLabel = isMutualDebt
                    ? window.t('linkedBadgeDebt', {}, lang)
                    : (isContractTester
                    ? window.t('linkedBadgeBounty', {}, lang)
                    : (isInviteLikeTester
                        ? window.t('linkedBadgeDirect', {}, lang)
                        : (isMutualLike ? window.t('linkedBadgeMutual', {}, lang) : '')));

                let rowHtml = '';
                if (isLeftSoft) {
                    const leftLabel = tester.username
                        ? `@${window.escapeHTML(String(tester.username).replace(/^@+/, ''))}`
                        : (tester.full_name
                            ? window.escapeHTML(tester.full_name)
                            : window.escapeHTML(window.t('idLabel', { id: tester.tester_id }, lang)));
                    const leftDayHtml = testerDay > 0
                        ? `<span class="tester-day-badge">[${window.escapeHTML(String(testerDay))}]</span>`
                        : '';
                    rowHtml = `
                    <li class="tester-row-left-soft">
                        <div class="tester-row-main">
                            <span class="tester-name">${leftDayHtml}<span class="tester-left-prefix" aria-hidden="true">💔</span><span class="tester-primary-label notranslate">${leftLabel}</span></span>
                        </div>
                        <div class="tester-row-meta">
                            <button type="button" class="tester-leave-chip" onclick="event.stopPropagation(); openLeftTesterLinkStatus(${Number(project.id)}, ${Number(tester.tester_id)}, event)">${window.escapeHTML(window.t('testerLeftChip', {}, lang))}</button>
                        </div>
                    </li>
                    `;
                } else {
                    const archiveBtnHtml = '';
                    const chevronHtml = '<span class="tester-chevron">›</span>';
                    const rowClick = `onclick="openDossierModal('${escapeInlineJsString(cleanUsername)}', ${tester.tester_id}, ${project.id})" style="cursor: pointer;"`;
                    rowHtml = `
                    <li ${rowClick}>
                        <div class="tester-row-main">
                            ${nameHtml}
                            ${screenshotDayHtml}
                            ${warningHtml}
                            ${brokenHtml}
                            ${karmaHtml}
                        </div>
                        <div class="tester-row-meta">
                            ${statusHtml}
                            ${archiveBtnHtml}
                            ${chevronHtml}
                        </div>
                    </li>
                `;
                }
                testerRowsHtml += rowHtml;
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
            testersHtml = `<ul class="tester-list">${testerRowsHtml}</ul>`;
        } else {
            testersHtml = `<p class="no-testers">${t.noTesters}</p>`;
        }

        const pendingIssueProgressIds = pendingIssueTesters
            .map(function(tester) {
                return Number(tester.progress_id || 0);
            })
            .filter(function(progressId) {
                return progressId > 0;
            });
        const affectedCount = pendingIssueTesters.length;
        const affectedCountKey = affectedCount === 1
            ? 'accessOverlayAffectedOne'
            : (affectedCount >= 2 && affectedCount <= 4 ? 'accessOverlayAffectedFew' : 'accessOverlayAffectedMany');
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
            return `
                <div class="access-error-tester-row">
                    <div class="access-error-tester-main">
                        <div class="access-error-tester-name notranslate">${window.escapeHTML(testerLabel)}</div>
                        <div class="access-error-tester-meta">${window.escapeHTML(window.t('accessOverlayTesterReported', {}, lang))}</div>
                    </div>
                    <div class="access-error-tester-actions">
                        <button type="button" class="btn btn-secondary" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); contactAccessTester('${safeTesterUsernameInline}'); event.stopPropagation();">${window.escapeHTML(window.t('accessOverlayWriteBtn', {}, lang))}</button>
                        <button type="button" class="btn" style="background: rgba(255,59,48,0.12); color:#ff6b63; border:1px solid rgba(255,59,48,0.35);" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('medium'); deleteAccessTester(${project.id}, ${Number(tester.progress_id || 0)}, '${safeDeleteNameInline}'); event.stopPropagation();">${window.escapeHTML(window.t('accessOverlayDeleteBtn', {}, lang))}</button>
                    </div>
                    <div class="access-error-tester-hint">${window.escapeHTML(window.t('accessOverlayDeleteHint', {}, lang))}</div>
                </div>
            `;
        }).join('');
        const accessGuideUrl = 'https://telegra.ph/Action-Required-Add-Testing-Group-to-Start-Closed-Testing-06-04';
        const accessOverlayHtml = hasAccessOverlay ? `
            <div class="access-error-overlay" onclick="event.stopPropagation();">
                <div class="access-error-panel" onclick="event.stopPropagation();">
                    <div class="access-error-head">
                        <span class="access-error-head__icon">!</span>
                        <div>
                            <div class="access-error-title">${window.escapeHTML(window.t('accessOverlayTitle', {}, lang))}</div>
                            <div class="access-error-subtitle">${window.escapeHTML(window.t(affectedCountKey, { count: affectedCount }, lang))}</div>
                        </div>
                    </div>
                    <div class="access-error-continuity">${window.escapeHTML(window.t('accessOverlayIntro', {}, lang))}</div>
                    <div class="access-error-deadline">
                        <span>⏳</span>
                        <strong>${window.escapeHTML(window.t('accessOverlayTesterCountdown', {
                            time_left: getIssueRemovalCountdownText((pendingIssueTesters.slice().sort(function(a, b) {
                                return String(a.issue_reported_at || '').localeCompare(String(b.issue_reported_at || ''));
                            })[0] || {}).issue_reported_at) || window.t('issueCountdownExpired', {}, lang)
                        }, lang))}</strong>
                    </div>
                    <a class="access-error-link" href="${accessGuideUrl}" onclick="event.stopPropagation(); window.open('${accessGuideUrl}', '_blank'); return false;">
                        <span class="access-error-link__icon">📖</span>
                        <span>
                            <strong>${window.escapeHTML(window.t('accessOverlayGuideLink', {}, lang))}</strong>
                            <small>${window.escapeHTML(window.t('accessOverlayGuideHint', {}, lang))}</small>
                        </span>
                        <span class="access-error-link__arrow">›</span>
                    </a>
                    <details class="access-error-details">
                        <summary>${window.escapeHTML(window.t('accessOverlayDetailsSummary', {}, lang))}</summary>
                        <div class="access-error-details__body">
                            <p>${window.escapeHTML(window.t('accessOverlayRestrictionsIntro', {}, lang))}</p>
                            <ul>
                                <li>${window.escapeHTML(window.t('accessOverlayRestrictionTake', {}, lang))}</li>
                                <li>${window.escapeHTML(window.t('accessOverlayRestrictionInvite', {}, lang))}</li>
                                <li>${window.escapeHTML(window.t('accessOverlayRestrictionOffers', {}, lang))}</li>
                            </ul>
                            <div class="access-error-tester-list">${accessIssueRowsHtml}</div>
                        </div>
                    </details>
                    <div class="access-error-resolve-copy">${window.escapeHTML(window.t('accessOverlayResolveHint', {}, lang))}</div>
                    <div class="access-error-actions">
                        <button type="button" class="btn btn-primary" onclick="if(window.tg&&window.tg.HapticFeedback)window.tg.HapticFeedback.impactOccurred('light'); resolveAllAccessErrors(${project.id}, ${JSON.stringify(pendingIssueProgressIds)}); event.stopPropagation();">${window.escapeHTML(resolveAllLabel)}</button>
                    </div>
                </div>
            </div>
        ` : '';

        const visibilityBadge = (() => {
            let badges = '';

            const runIterationChip = buildRunIterationChip(project);
            if (runIterationChip) badges += runIterationChip;

            if (project.target_lang && project.target_lang !== 'ALL') {
                badges += getLangBadge(project.target_lang);
            }
            if (_isProjectSyncedSafe(project)) {
                // Fallback for legacy projects that may use purchased_protection_days instead of paid_protection_days
                const extraPaid = Number(project.paid_protection_days || project.purchased_protection_days || 0);
                const protectedText = extraPaid > 0
                    ? window.t('ppcProtectedBadgeDays', { days: extraPaid }, lang)
                    : window.t('ppcProtectedBadge', {}, lang);
                badges += `<span class="meta-chip accent-protection">${window.escapeHTML(protectedText)}</span>`;
            }

            return badges;
        })();

        const projectProgressHtml = (() => {
            if (!_isProjectSyncedSafe(project)) {
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
            const testers = activeRegularTesters;
            const mutualCount = testers.filter((tester) => String(tester.join_type || 'invite').toLowerCase() !== 'bounty').length;
            const bountyCount = testers.filter((tester) => String(tester.join_type || '').toLowerCase() === 'bounty').length;
            if (project.mode === 'mutual' || project.mode === 'hybrid') {
                chips.push(`<span class="card-summary-chip">${window.escapeHTML(window.t('mutualChipLabel', { current: mutualCount, target: project.limit_mutual || 0 }, lang))}</span>`);
            }
            if (project.mode === 'bounty' || project.mode === 'hybrid') {
                chips.push(`<span class="card-summary-chip accent-purple" style="cursor: pointer;" onclick="openContractEconomyModal(${project.id}); event.stopPropagation();">${window.escapeHTML(window.t('contractChipLabel', { current: bountyCount, target: project.limit_bounty || 0, price: formatUiAmount(project.bounty_per_tester || 0, 1) }, lang))}</span>`);
            }
            if (guestTesterCount > 0) {
                chips.push(`<span class="card-summary-chip accent-blue">👽 ${window.escapeHTML(window.t('projectGuestCountChip', { count: guestTesterCount }, lang))}</span>`);
            }
            if (!chips.length) return '';
            return `<div class="card-summary-chips" onclick="event.stopPropagation();">${chips.join('')}</div>`;
        })();

        const karmaBonusChipHtml = (() => {
            if (platformDays < 14 || activeRegularTesters.length < 5) return '';
            return `<button class="meta-chip accent-green" onclick="showToast('${escapeInlineJsString(t.deleteKarmaBonus)}')">${t.deleteKarmaBonusChip}</button>`;
        })();
        const hasSync = _isProjectSyncedSafe(project);
        const extraPaidDays = Number(project.paid_protection_days || project.purchased_protection_days || 0);
        const bufferHoursLeft = isPendingCompletion
            ? Math.min(48, Math.max(0, 48 - Number(project.consumed_pending_hours || 0)))
            : 0;

        /* ── Closed test block: day + testers + recruitment ── */
        const calendarIconHtml = `
            <svg class="pc-cal__icon" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.11-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm2-7H5V6h14v2z"/>
            </svg>`;
        const closedTestChartIconHtml = `
            <svg class="pc-closed__glyph" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 17l5.5-6 3.5 3.5L20 6"/>
            </svg>`;
        const attractPeopleIconHtml = `
            <svg class="pc-cta__glyph" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>`;

        let count_done = 0;
        let count_waiting = 0;
        allProjectTesters.forEach((tester) => {
            if (tester.is_left_soft) {
                return;
            }
            if (tester.is_guest_tester || tester.is_external) {
                var controlMeta = getExternalTesterControlMeta(tester);
                if (controlMeta.tone === 'green') {
                    count_done++;
                } else {
                    count_waiting++;
                }
            } else {
                if (tester.last_check_date === today) {
                    count_done++;
                } else {
                    count_waiting++;
                }
            }
        });

        const totalTesters = activeRegularTesters.length + guestTesters.length;
        const googleQuota = GOOGLE_CLOSED_TEST_QUOTA;
        const regularTesterCount = activeRegularTesters.length;
        const testersNeeded = Math.max(0, googleQuota - regularTesterCount);
        const testersReserve = Math.max(0, regularTesterCount - googleQuota);
        const testersNote = regularTesterCount < googleQuota
            ? window.t('pcTestersNeedMore', { count: testersNeeded }, lang)
            : regularTesterCount === googleQuota
                ? window.t('pcTestersMinimumReached', {}, lang)
                : window.t('pcTestersReserve', { count: testersReserve }, lang);
        const testersNoteKind = regularTesterCount < googleQuota ? 'need' : (regularTesterCount === googleQuota ? 'ok' : 'reserve');

        const extraDaysRunning = extraPaidDays > 0 && (hasSync ? currentGoogleDay > 14 : platformDays > 14);
        const closedTestStage = isPendingCompletion
            ? 'buffer'
            : extraDaysRunning
                ? 'extension'
                : hasSync
                    ? 'active'
                    : (regularTesterCount >= googleQuota ? 'need_sync' : 'recruiting');
        const closedTestStageLabel = closedTestStage === 'buffer'
            ? window.t('pcStatusBuffer', {}, lang)
            : closedTestStage === 'extension'
                ? window.t('pcStatusExtension', {}, lang)
                : closedTestStage === 'active'
                    ? window.t('pcStatusActiveTest', {}, lang)
                    : closedTestStage === 'need_sync'
                        ? window.t('pcStatusNeedSync', {}, lang)
                        : window.t('pcStatusRecruiting', {}, lang);

        const dayMain = hasSync ? currentGoogleDay : platformDays;
        const dayKicker = hasSync
            ? window.t('pcGooglePlayLabel', {}, lang)
            : window.t('pcDayWord', {}, lang);
        const emphasizeSync = !hasSync && platformDays >= 7 && regularTesterCount < googleQuota;
        const daySecondaryHtml = !hasSync
            ? `<button type="button" class="pc-day-sync${emphasizeSync ? ' is-emphasis' : ''}" onclick="event.stopPropagation(); openProtectionCenter(${project.id});">${window.escapeHTML(window.t('pcSyncNotConfigured', {}, lang))}</button>`
            : Number(currentGoogleDay) !== Number(platformDays)
                ? `<span class="pc-day-hub">${window.escapeHTML(window.t('pcHubDay', { day: platformDays }, lang))}</span>`
                : `<span class="pc-day-ok">${window.escapeHTML(window.t('pcSyncConfigured', {}, lang))}</span>`;
        const bufferLineParts = [
            isPendingCompletion && bufferHoursLeft > 0
                ? window.t('pcBufferLineHours', { hours: bufferHoursLeft }, lang)
                : window.t('pcBufferLine', {}, lang),
        ];
        if (extraPaidDays > 0) {
            bufferLineParts.push(window.t('pcExtensionLine', { days: extraPaidDays }, lang));
        }

        const mutualCount = activeRegularTesters.filter((tester) => String(tester.join_type || 'invite').toLowerCase() !== 'bounty').length;
        const bountyCount = activeRegularTesters.filter((tester) => String(tester.join_type || '').toLowerCase() === 'bounty').length;
        const recruitParts = [];
        if (project.mode === 'mutual' || project.mode === 'hybrid') {
            const mutualTarget = Number(project.limit_mutual || 0);
            const mutualFilled = mutualTarget > 0 && mutualCount >= mutualTarget;
            recruitParts.push(window.t('pcRecruitMutual', { current: mutualCount, target: mutualTarget }, lang) + (mutualFilled ? ' ✓' : ''));
        }
        if (project.mode === 'bounty' || project.mode === 'hybrid') {
            const bountyTarget = Number(project.limit_bounty || 0);
            const bountyFilled = bountyTarget > 0 && bountyCount >= bountyTarget;
            recruitParts.push(window.t('pcRecruitContracts', { current: bountyCount, target: bountyTarget }, lang) + (bountyFilled ? ' ✓' : ''));
        }
        const recruitRowHtml = recruitParts.length
            ? `<button type="button" class="pc-recruit" onclick="openEditModal(${project.id}, { focusRecruitment: true }); event.stopPropagation();">
                    <span class="pc-recruit__label">${window.escapeHTML(window.t('pcRecruitLabel', {}, lang))}</span>
                    <span class="pc-recruit__items">${window.escapeHTML(recruitParts.join(' · '))}</span>
                    <span class="pc-recruit__chev" aria-hidden="true">›</span>
                </button>`
            : '';

        const attractIsPrimary = regularTesterCount < 15;
        const attractBtnHtml = `
            <button type="button" class="pc-cta ${attractIsPrimary ? 'pc-cta--primary' : 'pc-cta--neutral'} pc-cta--testers" onclick="openAttractTestersSheet(${project.id}); event.stopPropagation();">
                ${attractPeopleIconHtml}
                ${window.escapeHTML(window.t('attractTestersTitle', {}, lang))}
            </button>`;

        const stateBlockHtml = `
            <section class="pc-state-unified">
                <div class="pc-closed-head">
                    <div class="pc-closed-head__title">
                        ${closedTestChartIconHtml}
                        <span>${window.escapeHTML(window.t('pcClosedTestTitle', {}, lang))}</span>
                    </div>
                    <span class="pc-stage-badge pc-stage-badge--${closedTestStage}">${window.escapeHTML(closedTestStageLabel)}</span>
                </div>
                <div class="pc-state-top">
                    <div class="pc-state-day">
                        <button type="button" class="pc-cal" aria-label="${window.escapeHTML(window.t('pcLifecycleTitle', {}, lang))}" onclick="event.stopPropagation(); openProjectLifecycleModal(${project.id});">
                            ${calendarIconHtml}
                            <span class="pc-cal__dot" aria-hidden="true">+</span>
                        </button>
                        <div class="pc-state-day__copy">
                            <span class="pc-day-value" aria-label="${window.escapeHTML(window.t('pcDayOf', { day: dayMain, total: 14 }, lang))}">
                                <span class="pc-day-word">${window.escapeHTML(dayKicker)}</span><span class="pc-day-num">${window.escapeHTML(String(dayMain))}</span><span class="pc-day-total">&nbsp;/&nbsp;14</span>
                            </span>
                            ${daySecondaryHtml}
                            <button type="button" class="pc-day-meta" onclick="event.stopPropagation(); openProjectLifecycleModal(${project.id});">${window.escapeHTML(bufferLineParts.join(' · '))}</button>
                        </div>
                    </div>
                    <div class="pc-state-testers">
                        <span class="pc-testers-label">${window.escapeHTML(window.t('pcTestersShortLabel', {}, lang))}</span>
                        <div class="pc-testers-metric">
                            <span class="pc-tester-ratio" aria-label="${window.escapeHTML(String(regularTesterCount) + ' / ' + String(googleQuota))}">
                                <span class="pc-tester-ratio__current">${window.escapeHTML(String(regularTesterCount))}</span><span class="pc-tester-ratio__slash">&nbsp;/&nbsp;</span><span class="pc-tester-ratio__quota">${window.escapeHTML(String(googleQuota))}</span>
                            </span>
                            <span class="pc-tester-note pc-tester-note--${testersNoteKind}">${window.escapeHTML(testersNote)}</span>
                        </div>
                        ${attractBtnHtml}
                    </div>
                </div>
                ${recruitRowHtml}
            </section>
        `;

        /* ── Block 4: collapsed summary of the full tester roster ── */
        const allTestersRowHtml = (() => {
            if (!allProjectTesters.length) return '';
            const parts = [];
            if (count_done > 0) {
                parts.push(`<span><span class="is-ok">${window.escapeHTML(String(count_done))}</span> ${window.escapeHTML(window.t('pcSummaryTodaySuffix', {}, lang))}</span>`);
            }
            if (attentionCount > 0) {
                parts.push(`<span><span class="is-warn">${window.escapeHTML(String(attentionCount))}</span> ${window.escapeHTML(window.t('pcSummaryNeedsAttentionSuffix', {}, lang))}</span>`);
            }
            if (mutualDebtCount > 0) {
                parts.push(`<span><span class="is-debt">${window.escapeHTML(String(mutualDebtCount))}</span> ${window.escapeHTML(window.t('pcSummaryMutualDebtSuffix', {}, lang))}</span>`);
            }
            if (brokenLinkCount > 0) {
                parts.push(`<span><span class="is-broken">${window.escapeHTML(String(brokenLinkCount))}</span> ${window.escapeHTML(window.t('pcSummaryBrokenLinksSuffix', {}, lang))}</span>`);
            }
            const summary = parts.length
                ? `<span class="pc-alltesters__summary">${parts.join(' · ')}</span>`
                : `<span class="pc-alltesters__summary">${window.escapeHTML(window.t('pcAllTestersHint', {}, lang))}</span>`;
            return `
                <button type="button" class="pc-alltesters" onclick="toggleProjectTestersList(${project.id}, event)">
                    <span class="pc-alltesters__mark" aria-hidden="true">👥</span>
                    <span class="pc-alltesters__body">
                        <span class="pc-alltesters__title">${window.escapeHTML(window.t('pcAllTestersTitle', {}, lang))}<span class="pc-alltesters__count">${window.escapeHTML(String(totalTesters))}</span></span>
                        ${summary}
                    </span>
                    <span class="pc-alltesters__chev${isTestersCollapsed ? '' : ' is-open'}" aria-hidden="true">›</span>
                </button>
            `;
        })();

        /* ── Remaining actions: feedback stays here after attract moved into testers ── */
        const actionsHtml = `
            <div class="pc-actions">
                ${buildProjectFeedbackButton(project.id, project.feedback_total_count || 0, project.feedback_new_count || 0, false, 'margin: 0; min-height: 46px; border-radius: 13px; font-size: 13.5px; font-weight: 700; display: flex; align-items: center; justify-content: center; background: var(--bg-surface-2); color: var(--text-secondary); border: 1px solid var(--border-subtle);')}
            </div>
        `;

        /* ── Footer chips: Guest and language stay here; recruitment moved up ── */
        const footerChipsHtml = (() => {
            const chips = [];
            if (guestTesterCount > 0) {
                chips.push(`<span class="pc-fchip">👽 ${window.escapeHTML(window.t('projectGuestCountChip', { count: guestTesterCount }, lang))}</span>`);
            }
            if (project.target_lang && project.target_lang !== 'ALL') {
                chips.push(getLangBadge(project.target_lang));
            }
            if (!chips.length) return '';
            return `<div class="pc-footer" onclick="event.stopPropagation();">${chips.join('')}</div>`;
        })();

        const todaySectionHtml = (typeof window.ProjectToday !== 'undefined' && window.ProjectToday)
            ? window.ProjectToday.buildSection(project)
            : '';

        const controlPendingToday = activeRegularTesters.filter((tester) => {
            return !tester.is_left_soft
                && isMandatoryScreenshotDay(Number(tester.testing_days || 0))
                && tester.last_check_date !== today;
        }).length;
        const cardRequiresAttention = requiresAttention || controlPendingToday > 0;

        const visibilityMeta = getProjectVisibilityMeta(project);
        const visibilitySubText = (() => {
            if (visibilityMeta.mode === 'isolated') return window.t('settingsVisibilityIsolated', {}, lang) || 'Полная изоляция';
            if (visibilityMeta.mode === 'hidden_manual') return window.t('settingsVisibilityPrivate', {}, lang) || 'Скрыто из витрины';
            return window.t('settingsVisibilityPublic', {}, lang) || 'Публичный';
        })();

        card.innerHTML = `
            <div class="card-header" onclick="toggleProjectSettingsDrawer(${project.id}, event)" style="cursor: pointer; user-select: none;">
                <div class="project-avatar-container">
                    ${renderIcon(project.name || window.t('unknownLabel', {}, lang), project.icon_url)}
                    <div class="project-visibility-badge-overlay ${visibilityMeta.mode}" onclick="openVisibilityModeModal(${project.id}, event)">
                        ${visibilityMeta.buttonIcon}
                    </div>
                </div>
                <div class="card-info">
                    <div class="card-title notranslate">${safeProjectName}</div>
                    ${projectCardSubtitleHtml}
                </div>
                <div class="project-header-actions">
                    <button type="button" class="project-icon-btn" onclick="event.stopPropagation(); toggleProjectSettingsDrawer(${project.id}, event)">⚙️</button>
                </div>
            </div>
            
            <div id="settings-drawer-${project.id}" class="project-settings-drawer" onclick="event.stopPropagation();">
                <div class="drawer-item" onclick="openVisibilityModeModal(${project.id}, event)" style="cursor: pointer;">
                    <div class="drawer-item-left">
                        <div class="drawer-item-icon-box visibility">
                            <span>${visibilityMeta.buttonIcon}</span>
                        </div>
                        <div class="drawer-item-text-group">
                            <span class="drawer-item-title">${window.escapeHTML(window.t('settingsVisibilityTitle', {}, lang))}</span>
                            <span class="drawer-item-subtitle">${window.escapeHTML(visibilitySubText)}</span>
                        </div>
                    </div>
                    <span class="drawer-chevron">›</span>
                </div>
                <div class="drawer-item" onclick="openEditModal(${project.id}); toggleProjectSettingsDrawer(${project.id}, event);" style="cursor: pointer;">
                    <div class="drawer-item-left">
                        <div class="drawer-item-icon-box edit">
                            <span>✏️</span>
                        </div>
                        <span class="drawer-item-title">${window.escapeHTML(window.t('kebabEdit', {}, lang))}</span>
                    </div>
                    <span class="drawer-chevron">›</span>
                </div>
                <div class="drawer-item is-danger" onclick="openDeleteModal(${project.id}); toggleProjectSettingsDrawer(${project.id}, event);" style="cursor: pointer;">
                    <div class="drawer-item-left">
                        <div class="drawer-item-icon-box danger">
                            <span>🗑️</span>
                        </div>
                        <span class="drawer-item-title">${window.escapeHTML(window.t('kebabArchive', {}, lang))}</span>
                    </div>
                    <span class="drawer-chevron">›</span>
                </div>
            </div>

            ${accessOverlayHtml}

            <!-- STATE STRIP (always visible, even when card is collapsed) -->
            <div class="card-collapsed-zone">
                ${visibilityMeta.hint ? `<div class="visibility-hint ${visibilityMeta.mode === 'isolated' ? 'is-critical' : ''}">${window.escapeHTML(visibilityMeta.hint)}</div>` : ''}
                ${updateTipHtml}
                ${stateBlockHtml}
            </div>

            <!-- DASHBOARD BODY (hidden when card is collapsed) -->
            <div class="pc-dashboard-body">
                ${todaySectionHtml}

                <div id="pc-roster-source-${project.id}" class="pc-roster-source" hidden>
                    <div class="testers-section">
                        ${leftSoftCount > 0 || guestTesters.length > 0 ? `<div class="testers-title-row" style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                            <div class="testers-title">${window.escapeHTML(t.testersList)}${leftSoftCount > 0 ? `<span class="testers-count-delta" title="${window.escapeHTML(window.t('testerLeftSoftCountHint', { count: leftSoftCount }, lang))}">−${window.escapeHTML(String(leftSoftCount))}</span>` : ''}${guestTesters.length > 0 ? `<span class="testers-breakdown">${window.escapeHTML(String(activeRegularTesters.length))}+${window.escapeHTML(String(guestTesters.length))}</span>` : ''}</div>
                        </div>` : ''}
                        ${testersHtml}
                    </div>
                </div>

                ${actionsHtml}
                ${platformDays >= 15 ? `
                    <button type="button" class="pc-finish-link" onclick="openDeleteModal(${project.id}); event.stopPropagation();">
                        ${window.escapeHTML(window.t('pcFinishTestingLink', {}, lang))}
                    </button>
                ` : ''}
                ${footerChipsHtml}
            </div>

            <div class="card-footer pc-collapse-handle" onclick="toggleProjectCard(${project.id}, event)">
                <div class="card-expand-handle-circle">
                    <span class="card-expand-chevron ${isCollapsed ? 'is-collapsed' : ''}">
                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </span>
                    ${cardRequiresAttention ? `<div class="footer-notification-dot"></div>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
        if (window.ProjectToday) window.ProjectToday.mount(card, project);
        } catch (e) {
            console.error('Project card render error:', e);
            if (window.reportSystemError) window.reportSystemError('renderProjects: ' + e.message, e.stack);
        }
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

    const isSynced = _isProjectSyncedSafe(test);
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

function openKickTesterModal(appId, testerId, event, options) {
    if (typeof window.openTerminationSheet === 'function') {
        if (event && typeof event === 'object' && !event.preventDefault && (event.forceUnlink != null || event.unlinkReciprocal != null)) {
            options = event;
            event = null;
        }
        options = options || {};
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        var project = (myProjects || []).find(function(item) { return Number(item.id) === Number(appId); });
        var tester = project ? (project.testers || []).find(function(candidate) { return Number(candidate.tester_id) === Number(testerId); }) : null;
        return window.openTerminationSheet({
            mode: 'kick',
            appId: Number(appId || 0),
            projectId: Number(appId || 0),
            testerId: Number(testerId || 0),
            joinType: (tester && tester.join_type) || options.joinType || 'invite',
            testerUsername: (tester && tester.username) || options.testerUsername || '',
            testerFullName: (tester && tester.full_name) || options.testerFullName || '',
            forceUnlink: options.forceUnlink === true,
            unlinkReciprocal: options.unlinkReciprocal,
        });
    }
    console.warn('openTerminationSheet is not available');
}

function closeKickTesterModal(event) {
    if (typeof window.closeTerminationSheet === 'function') {
        return window.closeTerminationSheet(event);
    }
}

function toggleKickReasonOther() {
    if (typeof window.toggleTermUnlinkHint === 'function') {
        // reason note always visible in unified sheet
    }
    var other = document.getElementById('term-reason-other') || document.getElementById('kick-reason-other');
    if (other) other.style.display = 'block';
}

function toggleKickUnlinkHint() {
    if (typeof window.toggleTermUnlinkHint === 'function') {
        return window.toggleTermUnlinkHint();
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// PROJECT PROTECTION CENTER — Full-Screen View
// Replaces the old sync-modal popup with a full-screen slide-in view.
// ─────────────────────────────────────────────────────────────────────────────

// Pricing table: index = extra paid days (1–8), value = cumulative $BUST cost
const _PPC_PRICING = [0, 50, 120, 210, 320, 450, 600, 770, 960];

/**
 * Formats a Date object to "DD MMM, HH:MM" or relative "TODAY/TOMORROW at HH:MM"
 * @param {Date} date - date to format
 * @param {string} lang - language code ('ru' or others)
 * @returns {string} formatted date string
 */
function formatArchiveDate(date, lang, dateOnly = false) {
    if (!date || Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    if (targetDate.getTime() === today.getTime()) {
        return dateOnly
            ? (lang === 'ru' ? 'СЕГОДНЯ' : 'TODAY')
            : (lang === 'ru' ? `СЕГОДНЯ в ${timeStr}` : `TODAY at ${timeStr}`);
    } else if (targetDate.getTime() === tomorrow.getTime()) {
        return dateOnly
            ? (lang === 'ru' ? 'ЗАВТРА' : 'TOMORROW')
            : (lang === 'ru' ? `ЗАВТРА в ${timeStr}` : `TOMORROW at ${timeStr}`);
    } else {
        const day = date.getDate();
        let monthStr = '';
        if (lang === 'ru') {
            const monthsRu = ['янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];
            monthStr = monthsRu[date.getMonth()];
            return dateOnly ? `${day} ${monthStr}` : `${day} ${monthStr}, ${timeStr}`;
        } else {
            const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            monthStr = monthsEn[date.getMonth()];
            return dateOnly ? `${day} ${monthStr}` : `${day} ${monthStr}, ${timeStr}`;
        }
    }
}

/**
 * Switch tabs in the Project Protection Center tabbed card.
 * Handles styling toggles and content visibility.
 */
function _ppcSwitchTab(btn, tabName) {
    const section = btn.closest('.ppc-center-section');
    if (!section) return;

    // Toggle active button class
    section.querySelectorAll('.ppc-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Toggle tab content visibility
    const rewardContent = section.querySelector('.reward-content');
    const bufferContent = section.querySelector('.buffer-content');

    if (tabName === 'reward') {
        if (rewardContent) rewardContent.style.display = 'block';
        if (bufferContent) bufferContent.style.display = 'none';
        section.classList.remove('tab-buffer');
        section.classList.add('tab-reward');
    } else {
        if (rewardContent) rewardContent.style.display = 'none';
        if (bufferContent) bufferContent.style.display = 'block';
        section.classList.remove('tab-reward');
        section.classList.add('tab-buffer');
    }
}
window._ppcSwitchTab = _ppcSwitchTab;

/**
 * Calculates the $BUST cost for the protection gap.
 * @param {number} gapDays - (platformDay - googleDay), already clamped to 0-10
 * @param {number} alreadyPaidDays - days already covered by paid protection
 * @returns {number} $BUST cost (0 if within free buffer)
 */
function _calcProtectionCost(gapDays, alreadyPaidDays) {
    // Gap 0-2: free Pending Release buffer
    const extraDays = Math.max(0, gapDays - 2);
    if (extraDays <= 0) return 0;
    const targetLevel = Math.min(8, extraDays);
    const currentLevel = Math.min(8, Math.max(0, alreadyPaidDays || 0));
    if (targetLevel <= currentLevel) return 0;
    return _PPC_PRICING[targetLevel] - _PPC_PRICING[currentLevel];
}

/**
 * Geometry of the free Safety Buffer on the PPC slider.
 * Home slot = [platformDay − remainingDays … platformDay].
 * - thumb left of home: solid amber tail glued to the thumb
 * - thumb inside home: muted under green / solid after thumb
 * - thumb right of platform day: muted amber rides under the green tip
 */
function _ppcBufferGeometry(googleDay, platformDay, remainingBufferHours, sliderMin, sliderMax) {
    const sliderRange = sliderMax - sliderMin;
    const dayToFraction = (day) => sliderRange > 0
        ? Math.max(0, Math.min(1, (day - sliderMin) / sliderRange))
        : 1;

    const remainingDays = Math.max(0, remainingBufferHours / 24);
    if (remainingDays < 0.001 || sliderRange <= 0) {
        return { visible: false, attached: false, startF: 0, endF: 0, revealPct: 100 };
    }

    const homeStart = platformDay - remainingDays;
    const homeEnd = platformDay;
    let bandStart;
    let bandEnd;
    let revealPct;
    let attached = false;

    if (googleDay + 1e-9 >= homeEnd) {
        // Past platform day to the right — muted buffer follows the thumb
        bandStart = googleDay - remainingDays;
        bandEnd = googleDay;
        revealPct = 100;
    } else if (googleDay + 1e-9 >= homeStart) {
        bandStart = homeStart;
        bandEnd = homeEnd;
        const span = bandEnd - bandStart;
        const covered = Math.max(0, Math.min(span, googleDay - bandStart));
        revealPct = span > 0 ? (covered / span) * 100 : 100;
    } else {
        attached = true;
        bandStart = googleDay;
        bandEnd = googleDay + remainingDays;
        revealPct = 0;
    }

    const startF = dayToFraction(bandStart);
    const endF = dayToFraction(bandEnd);
    return {
        visible: (endF - startF) > 0.001,
        attached,
        startF,
        endF,
        revealPct: Math.max(0, Math.min(100, revealPct))
    };
}

/** Paints the Safety Buffer band from current slider geometry. */
function _ppcUpdateBufferBand(slider, track, googleDay, platformDay, remainingBufferHours) {
    if (!slider || !track) return;
    const band = track.querySelector('.ppc-buffer-band');
    if (!band) return;

    const geo = _ppcBufferGeometry(
        googleDay,
        platformDay,
        remainingBufferHours,
        Number(slider.min),
        Number(slider.max)
    );

    band.style.setProperty('--ppc-buffer-start', geo.startF.toFixed(4));
    band.style.setProperty('--ppc-buffer-end', geo.endF.toFixed(4));
    track.style.setProperty('--ppc-buffer-reveal', geo.revealPct.toFixed(2) + '%');
    band.classList.toggle('is-visible', geo.visible);
    band.classList.toggle('is-attached', geo.visible && geo.attached);
    band.setAttribute('aria-hidden', geo.visible ? 'false' : 'true');
}

/**
 * Preview copy for the buffer legend — models the gap, does not spend buffer.
 * @returns {{ main: string, modeledHours: number, attached: boolean }}
 */
function _ppcBufferPreviewCopy(T, gapDays, remainingBufferHours) {
    const remainingDays = remainingBufferHours / 24;
    const usedHours = Math.min(gapDays * 24, remainingBufferHours);
    const modeledHours = Math.max(0, Math.round(remainingBufferHours - usedHours));
    const attached = gapDays > remainingDays + 1e-9;

    let main;
    if (gapDays <= 0) {
        main = T('ppcBufferPreviewFull', { hours: remainingBufferHours });
    } else if (!attached) {
        main = T('ppcBufferPreviewInside', { hours: modeledHours, total: remainingBufferHours });
    } else {
        main = T('ppcBufferPreviewAttached', { hours: remainingBufferHours });
    }
    return { main, modeledHours, attached };
}

/** Updates all live-calculation UI elements in State #1 after slider/tip changes. */
function _ppcUpdateCalculations() {
    const slider = document.getElementById('ppc-slider');
    const tipEl = document.getElementById('ppc-tip-value');
    if (!slider) return;

    const googleDay = Number(slider.value);
    const platformDay = Number(slider.getAttribute('data-platform-day') || 0);
    const alreadyPaid = Number(slider.getAttribute('data-already-paid') || 0);
    const balance = Number(slider.getAttribute('data-balance') || 0);
    const consumedPendingHours = Number(slider.getAttribute('data-consumed-pending-hours') || 0);

    const gap = Math.max(0, platformDay - googleDay);
    const protectionCost = _calcProtectionCost(gap, alreadyPaid);
    const tipAmount = tipEl ? Number(tipEl.textContent) || 0 : 0;
    const totalCost = protectionCost + tipAmount;
    const insufficient = totalCost > balance;

    // Update slider fill %
    const sliderMin = Number(slider.min);
    const sliderMax = Number(slider.max);
    const sliderRange = sliderMax - sliderMin;
    const sliderPct = sliderRange > 0 ? ((googleDay - sliderMin) / sliderRange) * 100 : 0;
    slider.style.setProperty('--ppc-slider-pct', sliderPct.toFixed(1) + '%');
    const sliderTrack = slider.closest('.ppc-slider-track');
    if (sliderTrack) {
        sliderTrack.style.setProperty('--ppc-slider-pct', sliderPct.toFixed(1) + '%');
        sliderTrack.style.setProperty('--ppc-slider-f', (sliderPct / 100).toFixed(4));
    }

    // Update big day display
    const dayDisplay = document.getElementById('ppc-slider-day-value');
    if (dayDisplay) dayDisplay.textContent = googleDay;

    // Math Logic for States
    const remainingBuffer = Math.max(0, 48 - consumedPendingHours);
    _ppcUpdateBufferBand(slider, sliderTrack, googleDay, platformDay, remainingBuffer);
    const requiredBuffer = gap * 24;
    const T = (key, vars) => window.t(key, vars || {}, lang) || key;
    const preview = _ppcBufferPreviewCopy(T, gap, remainingBuffer);

    // Live buffer legend (preview — does not spend buffer)
    const legendMain = document.getElementById('ppc-buffer-legend-main');
    if (legendMain) legendMain.textContent = preview.main;

    let state = 'A';
    if (gap > 2) {
        state = 'C';
    } else if (remainingBuffer < requiredBuffer) {
        state = 'B';
    }

    // Update Smart Status Block
    const statusBlock = document.getElementById('ppc-status-block');
    if (statusBlock) {
        let html = '';
        if (state === 'A') {
            statusBlock.className = 'ppc-status-block state-safe';
            const fillPct = Math.round((preview.modeledHours / 48) * 100);
            html = `
                <div class="ppc-status-title">${window.escapeHTML(T('ppcStateASafeTitle'))}</div>
                <div class="ppc-status-text">${window.escapeHTML(T('ppcStateASafeText'))}</div>
                <div class="ppc-status-buffer">
                    <div class="ppc-status-buffer-text">${window.escapeHTML(T('ppcStateASafeBuffer', { hours: preview.modeledHours }))}</div>
                    <div class="ppc-status-progress-bar">
                        <div class="ppc-status-progress-fill" style="width: ${fillPct}%;"></div>
                    </div>
                </div>
            `;
        } else if (state === 'B') {
            statusBlock.className = 'ppc-status-block state-warning';
            const fillPct = Math.round((preview.modeledHours / 48) * 100);
            html = `
                <div class="ppc-status-title">${window.escapeHTML(T('ppcStateBWarningTitle'))}</div>
                <div class="ppc-status-text">${window.escapeHTML(T('ppcStateBWarningText'))}</div>
                <div class="ppc-status-buffer">
                    <div class="ppc-status-buffer-text">${window.escapeHTML(T('ppcStateBWarningBuffer', { hours: preview.modeledHours }))}</div>
                    <div class="ppc-status-progress-bar">
                        <div class="ppc-status-progress-fill" style="width: ${fillPct}%;"></div>
                    </div>
                </div>
            `;
        } else {
            statusBlock.className = 'ppc-status-block state-required';
            const extraDays = Math.max(0, gap - 2);
            const bufferDays = remainingBuffer / 24;
            const totalLife = Math.round((14 + bufferDays + extraDays) * 10) / 10;
            const lifeDetailHtml = [
                window.escapeHTML(T('ppcStateCLifeBase', { days: 14 })),
                `<span class="ppc-life-buffer">${window.escapeHTML(T('ppcStateCLifeBuffer', { hours: remainingBuffer }))}</span>`,
                `<span class="ppc-life-paid">${window.escapeHTML(T('ppcStateCLifePaid', { days: extraDays }))}</span>`
            ].join(' + ');
            html = `
                <div class="ppc-status-title">${window.escapeHTML(T('ppcStateCRequiredTitle'))}</div>
                <div class="ppc-status-text">${window.escapeHTML(T('ppcStateCRequiredText'))}</div>
                <div class="ppc-status-cost-block">
                    <div class="ppc-status-cost-days">${window.escapeHTML(T('ppcGapCostLabel', { days: extraDays }))}</div>
                    <div class="ppc-status-cost-amount">${totalCost} $BUST</div>
                </div>
                <div class="ppc-status-life">
                    <div class="ppc-status-life-label">${window.escapeHTML(T('ppcStateCLifeLabel'))}</div>
                    <div class="ppc-status-life-total"><em>${window.escapeHTML(String(totalLife))}</em> <span class="ppc-status-life-unit">${window.escapeHTML(T('ppcStateCLifeTotalUnit'))}</span></div>
                    <div class="ppc-status-life-detail">${lifeDetailHtml}</div>
                </div>
            `;
        }
        statusBlock.innerHTML = html;
    }

    // Auto-expand/collapse $BUST purchase block
    const purchaseBlock = document.getElementById('ppc-purchase-block');
    if (purchaseBlock) {
        if (state === 'C') {
            purchaseBlock.style.display = 'block';
        } else {
            purchaseBlock.style.display = 'none';
        }
    }

    // Update totals
    const totalEl = document.getElementById('ppc-total-value');
    const insufficientNote = document.getElementById('ppc-insufficient-note');
    const submitBtn = document.getElementById('ppc-submit-btn');

    if (totalEl) {
        totalEl.textContent = totalCost + ' $BUST';
        if (insufficient) {
            totalEl.classList.add('insufficient');
        } else {
            totalEl.classList.remove('insufficient');
        }
    }
    if (insufficientNote) {
        if (insufficient) {
            insufficientNote.classList.add('visible');
        } else {
            insufficientNote.classList.remove('visible');
        }
    }
    if (submitBtn) {
        submitBtn.disabled = insufficient;
        let btnText = '';
        if (totalCost === 0) {
            btnText = window.t('ppcSyncFreeBtn', {}, lang) || '🛡 Synchronize';
        } else if (protectionCost === 0 && tipAmount > 0) {
            btnText = window.t('ppcAddPoolBtn', {}, lang) || '🛡 Add to Pool';
        } else {
            btnText = window.t('ppcSyncBtn', {}, lang) || '🛡 Synchronize & Pay';
        }
        submitBtn.textContent = btnText;
    }
}

/** Changes the tip counter value by `delta` (step of 5). */
function _ppcChangeTip(delta) {
    const el = document.getElementById('ppc-tip-value');
    if (!el) return;
    const current = Number(el.textContent) || 0;
    const next = Math.max(0, current + delta);
    el.textContent = String(next);
    _ppcUpdateCalculations();
}

/** Adds `amount` to the tip counter. */
function _ppcAddTip(amount) {
    const el = document.getElementById('ppc-tip-value');
    if (!el) return;
    const current = Number(el.textContent) || 0;
    el.textContent = String(current + amount);
    _ppcUpdateCalculations();
}

/** Builds State #1 HTML — Not Synchronized. */
function _renderProtectionCenterState1(project, platformDay) {
    const t = window.App ? (typeof window.t === 'function' ? {} : {}) : {};
    const T = (key, vars) => window.t(key, vars || {}, lang) || key;
    const balance = (visibilityStats && typeof visibilityStats.balance_bust !== 'undefined')
        ? Number(visibilityStats.balance_bust || 0)
        : 0;
    const alreadyPaid = Number(project.paid_protection_days || project.purchased_protection_days || 0); // backend field, 0 by default

    // Slider bounds: min = max(1, platformDay-10) up to 14, max = 14
    const sliderMax = 14;
    const sliderMin = Math.min(14, Math.max(1, platformDay - 10));
    
    // Default to current synced Google Day or platformDay
    const hasExistingSync = _isProjectSyncedSafe(project);
    const currentGoogleDay = hasExistingSync ? getProjectCurrentGoogleDay(project, platformDay) : Math.min(14, platformDay);
    const sliderDefault = Math.max(sliderMin, Math.min(sliderMax, currentGoogleDay));

    // Tick labels for the slider
    const tickLabels = [];
    for (let d = sliderMin; d <= sliderMax; d++) {
        if (d === sliderMin || d === sliderMax || d === platformDay) {
            tickLabels.push(`<span>${d}</span>`);
        } else if ((sliderMax - sliderMin) <= 10) {
            tickLabels.push(`<span>${d}</span>`);
        } else {
            tickLabels.push(`<span></span>`);
        }
    }
    // Compute pct for initial render
    const sliderRange = sliderMax - sliderMin;
    const initPct = sliderRange > 0 ? ((sliderDefault - sliderMin) / sliderRange) * 100 : 100;
    const initFraction = sliderRange > 0 ? (sliderDefault - sliderMin) / sliderRange : 1;

    // Initial Safety Buffer band (home slot under green, revealed as thumb moves left)
    const consumedBufferHours = Math.max(0, Number(project.consumed_pending_hours || 0));
    const remainingBufferHours = Math.max(0, Math.min(48, 48 - consumedBufferHours));
    const initGap = Math.max(0, platformDay - sliderDefault);
    const initBufferGeo = _ppcBufferGeometry(
        sliderDefault,
        platformDay,
        remainingBufferHours,
        sliderMin,
        sliderMax
    );
    const initPreview = _ppcBufferPreviewCopy(T, initGap, remainingBufferHours);

    const initCost = _calcProtectionCost(initGap, alreadyPaid);
    const initIsFree = initCost === 0;

    return `
        <p class="ppc-subtitle">${window.escapeHTML(T('ppcSubtitleNotSynced'))}</p>

        <div class="ppc-actions-row">
            <a href="https://play.google.com/console/" target="_blank" class="ppc-btn-console" onclick="if(window.tg&&window.tg.openLink)window.tg.openLink('https://play.google.com/console/'); return false;">
                ▶ ${window.escapeHTML(T('ppcOpenConsoleBtn'))}
            </a>
            <button type="button" class="ppc-btn-howworks" onclick="toggleTestingDayInstructions()">
                ${window.escapeHTML(T('ppcHowWorksBtn'))}
            </button>
        </div>

        <div id="testing-day-instructions" class="ppc-instructions-accordion">
            <p>${window.escapeHTML(T('ppcTestingDayInstructionsText'))}</p>
            <img src="images/Testing_day.png" alt="Testing Day Screenshot">
        </div>

        <!-- Slider Card -->
        <div class="ppc-card">
            <div class="ppc-card-title">${window.escapeHTML(T('ppcSliderLabel'))}</div>
            <div class="ppc-slider-wrapper">
                <div class="ppc-slider-day-display">
                    <div style="display:flex;align-items:flex-end;gap:6px;">
                        <span class="ppc-slider-day-value" id="ppc-slider-day-value">${sliderDefault}</span>
                        <span class="ppc-slider-day-unit">/ 14</span>
                    </div>
                    <div class="ppc-platform-badge">${window.escapeHTML(T('ppcPlatformDayLabel', { day: platformDay }))}</div>
                </div>
                <div
                    class="ppc-slider-track"
                    id="ppc-slider-track"
                    style="--ppc-slider-pct: ${initPct.toFixed(1)}%; --ppc-slider-f: ${initFraction.toFixed(4)}; --ppc-buffer-reveal: ${initBufferGeo.revealPct.toFixed(2)}%;"
                >
                    <div class="ppc-slider-track-base"></div>
                    <div class="ppc-slider-track-fill"></div>
                    <div
                        class="ppc-buffer-band${initBufferGeo.visible ? ' is-visible' : ''}${initBufferGeo.attached ? ' is-attached' : ''}"
                        style="--ppc-buffer-start: ${initBufferGeo.startF.toFixed(4)}; --ppc-buffer-end: ${initBufferGeo.endF.toFixed(4)};"
                        aria-hidden="${initBufferGeo.visible ? 'false' : 'true'}"
                    ></div>
                    <input
                        type="range"
                        id="ppc-slider"
                        class="ppc-slider"
                        min="${sliderMin}"
                        max="${sliderMax}"
                        step="1"
                        value="${sliderDefault}"
                        data-platform-day="${platformDay}"
                        data-already-paid="${alreadyPaid}"
                        data-balance="${balance}"
                        data-consumed-pending-hours="${project.consumed_pending_hours || 0}"
                        oninput="_ppcUpdateCalculations()"
                    />
                </div>
                <div class="ppc-slider-tick-row">
                    ${tickLabels.join('')}
                </div>
                <div class="ppc-slider-buffer-legend">
                    <div class="ppc-slider-buffer-legend-row">
                        <span class="ppc-slider-buffer-swatch"></span>
                        <span id="ppc-buffer-legend-main">${window.escapeHTML(initPreview.main)}</span>
                    </div>
                </div>
            </div>

            <!-- Smart Status Block -->
            <div id="ppc-status-block"></div>

            <!-- purchase block containing Tip Counter + Finance Summary -->
            <div id="ppc-purchase-block" style="display: none; margin-top: 14px;">
                <!-- Tip Counter -->
                <div class="ppc-tip-section" id="ppc-tip-section" style="display:block;">
                    <div class="ppc-tip-label">${window.escapeHTML(T('ppcTipLabel'))}</div>
                    <div class="ppc-tip-hint">${window.escapeHTML(T('ppcTipHint'))}</div>
                    <div class="ppc-tip-row">
                        <div class="ppc-tip-counter">
                            <button class="ppc-tip-btn" type="button" onclick="_ppcChangeTip(-5)">−</button>
                            <span class="ppc-tip-value" id="ppc-tip-value">0</span>
                            <button class="ppc-tip-btn" type="button" onclick="_ppcChangeTip(5)">+</button>
                        </div>
                        <div class="ppc-tip-chips">
                            <button class="ppc-tip-chip" type="button" onclick="_ppcAddTip(10)">+10</button>
                            <button class="ppc-tip-chip" type="button" onclick="_ppcAddTip(50)">+50</button>
                            <button class="ppc-tip-chip" type="button" onclick="_ppcAddTip(100)">+100</button>
                        </div>
                    </div>
                </div>

                <!-- Finance Summary -->
                <div class="ppc-finance-block">
                    <div class="ppc-balance-row">
                        <span>${window.escapeHTML(T('ppcBalanceCaption'))}</span>
                        <span class="ppc-balance-value">${window.escapeHTML(formatBustAmount ? formatBustAmount(balance) : (String(balance) + ' $BUST'))}</span>
                    </div>
                    <div class="ppc-total-row">
                        <span>${window.escapeHTML(T('ppcTotalCostLabel'))}</span>
                        <span class="ppc-total-value${initCost > balance ? ' insufficient' : ''}" id="ppc-total-value">${initCost} $BUST</span>
                    </div>
                    <div class="ppc-insufficient-note${initCost > balance ? ' visible' : ''}" id="ppc-insufficient-note">
                        ${window.escapeHTML(T('ppcInsufficientFunds'))}
                    </div>
                </div>
            </div>

            <!-- Message -->
            <textarea
                id="ppc-message-input"
                class="ppc-message-input"
                rows="3"
                placeholder="${window.escapeHTML(T('ppcMessagePlaceholder'))}"
            >${window.escapeHTML(hasExistingSync ? (project.sync_message || '') : '')}</textarea>

            <!-- Submit -->
            <button
                id="ppc-submit-btn"
                class="ppc-submit-btn"
                type="button"
                ${initCost > balance ? 'disabled' : ''}
                onclick="saveProjectSync()"
            >${initCost === 0 ? window.escapeHTML(T('ppcSyncFreeBtn')) : window.escapeHTML(T('ppcSyncBtn'))}</button>
        </div>
    `;
}

/** Builds State #2 HTML — Project Protected. */
function _renderProtectionCenterState2(project, platformDay, googleDay) {
    const T = (key, vars) => window.t(key, vars || {}, lang) || key;
    const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
    const leftDays = Math.max(0, 14 - googleDay);

    const extraPaid = Number(project.paid_protection_days || project.purchased_protection_days || 0);
    const protectionTotal = Math.max(0, leftDays + extraPaid);

    // Exact completion timestamp — FIXED (does not drift on page refresh)
    const isPendingCompletion = String(project.app_status || project.status || '').toLowerCase() === 'pending_completion';
    const createdTime = project.created_at ? new Date(project.created_at).getTime() : Date.now();
    const consumedPendingHours = Number(project.consumed_pending_hours || 0);
    const pendingStartedAt = project.pending_completion_started_at ? new Date(project.pending_completion_started_at).getTime() : null;

    let archiveDate;
    let remainingBufferHours;
    if (isPendingCompletion && pendingStartedAt) {
        // IN buffer: deadline is FIXED — pending_completion_started_at + 48h
        const remainingMs = Math.max(0, (pendingStartedAt + 48 * 60 * 60 * 1000) - Date.now());
        remainingBufferHours = Math.min(48, Math.max(0, Math.ceil(remainingMs / (60 * 60 * 1000))));
        archiveDate = new Date(pendingStartedAt + 48 * 60 * 60 * 1000);
    } else {
        // NOT in buffer yet: deadline is in the future — created_at + 14d + extraPaid + 48h
        remainingBufferHours = 48;
        const bufferStartTime = createdTime + (14 * 24 * 60 * 60 * 1000) + (extraPaid * 24 * 60 * 60 * 1000);
        archiveDate = new Date(bufferStartTime + (48 * 60 * 60 * 1000));
    }

    const activeProtectionText = lang === 'ru'
        ? `${extraPaid} дн. + ${remainingBufferHours}ч`
        : `${extraPaid}d + ${remainingBufferHours}h`;
    const archiveDateStr = formatArchiveDate(archiveDate, lang);

    // Last sync note
    const lastSyncDate = parseLocalDateOnly(project.last_sync_date);
    const updatedDaysAgo = lastSyncDate ? getDayDiffFromToday(lastSyncDate) : 0;
    const syncNoteStale = updatedDaysAgo >= 7;

    // Lifecycle timeline phases
    const phases = [];
    
    if (extraPaid > 0) {
        // Phase 1: Active Testing (Days 1-14)
        phases.push({
            emoji: '🟢',
            name: T('ppcTimelineActive'),
            days: lang === 'ru' ? 'Дни 1–14' : 'Days 1–14',
            dotColor: 'green',
            isCurrent: platformDay <= 14,
            isPast: platformDay > 14
        });

        // Phase 2: Extended Protection (Days 15 to 14 + extraPaid)
        phases.push({
            emoji: '🛡',
            name: T('ppcTimelineExtra'),
            days: lang === 'ru' ? `Дни 15–${14 + extraPaid}` : `Days 15–${14 + extraPaid}`,
            dotColor: 'blue',
            isCurrent: platformDay > 14 && platformDay <= (14 + extraPaid),
            isPast: platformDay > (14 + extraPaid)
        });

        // Phase 3: Safety Buffer (occupies exactly 48h AFTER extended protection ends)
        phases.push({
            emoji: '⏳',
            name: T('ppcTimelinePending'),
            days: lang === 'ru' ? `Дни ${15 + extraPaid}–${16 + extraPaid}` : `Days ${15 + extraPaid}–${16 + extraPaid}`,
            dotColor: 'yellow',
            isCurrent: isPendingCompletion || (platformDay > (14 + extraPaid) && platformDay <= (16 + extraPaid)),
            isPast: platformDay > (16 + extraPaid) && !isPendingCompletion
        });

        // Phase 4: Archive
        phases.push({
            emoji: '🏁',
            name: T('ppcTimelineArchive'),
            days: archiveDateStr,
            dotColor: 'archive',
            isCurrent: platformDay > (16 + extraPaid) && !isPendingCompletion,
            isPast: false
        });
    } else {
        // Phase 1: Active Testing (Days 1-14)
        phases.push({
            emoji: '🟢',
            name: T('ppcTimelineActive'),
            days: lang === 'ru' ? 'Дни 1–14' : 'Days 1–14',
            dotColor: 'green',
            isCurrent: platformDay <= 14,
            isPast: platformDay > 14
        });

        // Phase 2: Safety Buffer (Days 15-16, 48h)
        phases.push({
            emoji: '⏳',
            name: T('ppcTimelinePending'),
            days: lang === 'ru' ? 'Дни 15–16' : 'Days 15–16',
            dotColor: 'yellow',
            isCurrent: isPendingCompletion || (platformDay > 14 && platformDay <= 16),
            isPast: platformDay > 16 && !isPendingCompletion
        });

        // Phase 3: Archive
        phases.push({
            emoji: '🏁',
            name: T('ppcTimelineArchive'),
            days: archiveDateStr,
            dotColor: 'archive',
            isCurrent: platformDay > 16 && !isPendingCompletion,
            isPast: false
        });
    }

    let timelineHtml = '';
    phases.forEach((phase, i) => {
        const isCurrentClass = phase.isCurrent ? ' current' : '';
        const connectorFilled = phase.isPast ? ' filled' : '';
        if (i > 0) {
            timelineHtml += `<div class="ppc-timeline-connector${connectorFilled}"></div>`;
        }
        timelineHtml += `
            <div class="ppc-timeline-phase${isCurrentClass}" style="width:115px;">
                <div class="ppc-phase-dot ${phase.isCurrent ? phase.dotColor : ''}${phase.isCurrent ? ' current' : ''}"></div>
                <div class="ppc-phase-label-wrap">
                    <span class="ppc-phase-emoji">${phase.emoji}</span>
                    <span class="ppc-phase-name">${window.escapeHTML(phase.name)}</span>
                    <span class="ppc-phase-days">${window.escapeHTML(phase.days)}</span>
                </div>
            </div>
        `;
    });

    // Reward pool
    const poolAmount = Number(project.protection_bust_pool || 0);
    // Remaining days of protection
    const remainingDays = platformDay < 15
        ? extraPaid
        : Math.max(0, (14 + extraPaid) - platformDay + 1);

    // Daily pool: poolAmount / remainingDays (if remainingDays > 0)
    const dailyPoolAmount = remainingDays > 0 ? (poolAmount / remainingDays) : 0;
    const dailyPoolAmountFormatted = typeof formatUiAmount === 'function' ? formatUiAmount(dailyPoolAmount, 1) : dailyPoolAmount.toFixed(1);

    const rewardText = (poolAmount > 0 && dailyPoolAmount > 0)
        ? T('ppcRewardPerTesterDay', { amount: dailyPoolAmountFormatted })
        : T('ppcRewardPerTesterDayZero');
    const subtitleText = T('ppcRewardPoolSubtitle', { days: extraPaid, remaining: remainingDays });

    // Pending release attention
    const pendingHtml = isPendingCompletion
        ? `<div style="background:rgba(255,149,0,0.1);border:1px solid rgba(255,149,0,0.3);border-radius:12px;padding:12px;margin-bottom:14px;font-size:12px;line-height:1.5;color:#ffb84d;font-weight:600;">${window.escapeHTML(window.t('pendingReleaseOwnerSyncHint', {}, lang))}</div>`
        : '';

    // Safety Buffer Calculations
    const bufferStart = (isPendingCompletion && pendingStartedAt)
        ? new Date(pendingStartedAt)
        : new Date(createdTime + (14 * 24 * 60 * 60 * 1000) + (extraPaid * 24 * 60 * 60 * 1000));
    const equatorDate = new Date(bufferStart.getTime() + (24 * 60 * 60 * 1000));
    const bufferStartStr = formatArchiveDate(bufferStart, lang);
    const equatorStr = formatArchiveDate(equatorDate, lang, true);
    const dynamicConsumedHours = 48 - remainingBufferHours;
    const bufferFillPercent = Math.min(100, Math.max(0, (dynamicConsumedHours / 48) * 100));

    let cardHtml = '';
    if (extraPaid === 0) {
        // Scenario A: No protection days purchased. Show Safety Buffer timeline card only.
        cardHtml = `
            <div class="ppc-buffer-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                    <div class="ppc-buffer-card-title" style="margin-bottom: 0;">
                        ⏳ <span>${window.escapeHTML(lang === 'ru' ? 'Буфер безопасности' : 'Safety Buffer')}</span>
                    </div>
                    <div class="ppc-reward-pool-amount-wrap">
                        <div class="ppc-reward-pool-amount" style="color: var(--stage-buffer); font-size: 18px; font-weight: 800;">
                            ${remainingBufferHours <= 0 
                                ? window.escapeHTML(T('ppcBufferAwaitingArchiving'))
                                : window.escapeHTML(T('ppcBufferRemainingHours', { hours: remainingBufferHours }))}
                        </div>
                        ${remainingBufferHours > 0 ? `
                        <div class="ppc-reward-pool-status" style="background: var(--stage-buffer-surface); color: var(--stage-buffer); border-color: var(--stage-buffer-border); font-size: 11px;">
                            ${window.escapeHTML(T('ppcBufferRemainingLabel'))}
                        </div>
                        ` : ''}
                    </div>
                </div>
                <div class="ppc-buffer-desc" style="font-size: 12px; line-height: 1.5; color: var(--hint-color); margin-bottom: 12px;">
                    ${window.escapeHTML(T('ppcBufferTabDesc'))}
                </div>
                <div class="ppc-buffer-timeline-wrapper">
                    <div class="ppc-buffer-bar-container">
                        <div class="ppc-buffer-bar-fill" style="width: ${bufferFillPercent}%;"></div>
                    </div>
                    <div class="ppc-buffer-ticks">
                        <div class="ppc-buffer-tick-item start">
                            <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Старт' : 'Start')}</div>
                            <div class="ppc-buffer-tick-time">${window.escapeHTML(bufferStartStr)}</div>
                        </div>
                        <div class="ppc-buffer-tick-item equator">
                            <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Экватор (24ч)' : 'Equator (24h)')}</div>
                            <div class="ppc-buffer-tick-time">${window.escapeHTML(equatorStr)}</div>
                        </div>
                        <div class="ppc-buffer-tick-item end">
                            <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Архив (48ч)' : 'Archive (48h)')}</div>
                            <div class="ppc-buffer-tick-time">${window.escapeHTML(archiveDateStr)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Scenario B: Protection days purchased. Show Segmented Tabs Card.
        cardHtml = `
            <div class="ppc-center-section tab-reward">
                <div class="ppc-segmented-tabs">
                    <button type="button" class="ppc-tab-btn active" data-tab="reward" onclick="window._ppcSwitchTab(this, 'reward')">
                        🛡 ${window.escapeHTML(lang === 'ru' ? 'Пул наград' : 'Reward Pool')}
                    </button>
                    <button type="button" class="ppc-tab-btn" data-tab="buffer" onclick="window._ppcSwitchTab(this, 'buffer')">
                        ⏳ ${window.escapeHTML(lang === 'ru' ? 'Буфер безопасности' : 'Safety Buffer')}
                    </button>
                </div>

                <div class="ppc-tabbed-card">
                    <!-- Tab 1: Reward Pool Content -->
                    <div class="ppc-tab-content reward-content">
                        <div class="ppc-reward-pool-header" style="margin-bottom: 12px;">
                            <div class="ppc-reward-pool-label-left" style="color: var(--reward);">${window.escapeHTML(T('ppcRewardPoolLeftLabel'))}</div>
                            <div class="ppc-reward-pool-amount-wrap">
                                <div class="ppc-reward-pool-amount" style="color: var(--reward); font-size: 18px; font-weight: 800;">${window.escapeHTML(T('ppcRewardPoolAmount', { amount: poolAmount }))}</div>
                                <div class="ppc-reward-pool-status" style="background: var(--reward-surface); color: var(--reward); border-color: var(--reward-border); font-size: 11px;">${window.escapeHTML(T('ppcRewardPoolLocked'))}</div>
                            </div>
                        </div>
                        <div class="ppc-reward-pool-desc" style="font-size: 12px; line-height: 1.5; color: var(--hint-color);">${window.escapeHTML(T('ppcRewardPoolDesc'))}</div>

                        <div style="margin-top: 16px; display: flex; align-items: flex-end; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                <div class="ppc-reward-per-tester-day" style="font-size: 13px; color: var(--hint-color); font-weight: 600;">
                                    ${window.escapeHTML(rewardText)}
                                </div>
                                <div class="ppc-reward-pool-details-subtitle" style="font-size: 11px; color: var(--hint-color); font-weight: 400; opacity: 0.8;">
                                    ${window.escapeHTML(subtitleText)}
                                </div>
                            </div>
                            <button type="button" class="ppc-add-pool-btn" style="margin-top: 0; flex-shrink: 0;" onclick="openPpcTopUpModal()">
                                ${lang === 'ru' ? '+ Пополнить пул' : '+ Add to Pool'}
                            </button>
                        </div>
                    </div>

                    <!-- Tab 2: Safety Buffer Content -->
                    <div class="ppc-tab-content buffer-content" style="display: none;">
                        <div class="ppc-reward-pool-header" style="margin-bottom: 12px;">
                            <div class="ppc-reward-pool-label-left" style="color: var(--stage-buffer);">${window.escapeHTML(T('ppcBufferRemainingLeftLabel'))}</div>
                            <div class="ppc-reward-pool-amount-wrap">
                                <div class="ppc-reward-pool-amount" style="color: var(--stage-buffer); font-size: 18px; font-weight: 800;">
                                    ${remainingBufferHours <= 0 
                                        ? window.escapeHTML(T('ppcBufferAwaitingArchiving'))
                                        : window.escapeHTML(T('ppcBufferRemainingHours', { hours: remainingBufferHours }))}
                                </div>
                                ${remainingBufferHours > 0 ? `
                                <div class="ppc-reward-pool-status" style="background: var(--stage-buffer-surface); color: var(--stage-buffer); border-color: var(--stage-buffer-border); font-size: 11px;">
                                    ${window.escapeHTML(T('ppcBufferRemainingLabel'))}
                                </div>
                                ` : ''}
                            </div>
                        </div>
                        <div class="ppc-buffer-desc" style="font-size: 12px; line-height: 1.5; color: var(--hint-color); margin-bottom: 12px;">
                            ${window.escapeHTML(T('ppcBufferTabDesc'))}
                        </div>
                        <div class="ppc-buffer-timeline-wrapper">
                            <div class="ppc-buffer-bar-container">
                                <div class="ppc-buffer-bar-fill" style="width: ${bufferFillPercent}%;"></div>
                            </div>
                            <div class="ppc-buffer-ticks">
                                <div class="ppc-buffer-tick-item start">
                                    <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Старт' : 'Start')}</div>
                                    <div class="ppc-buffer-tick-time">${window.escapeHTML(bufferStartStr)}</div>
                                </div>
                                <div class="ppc-buffer-tick-item equator">
                                    <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Экватор (24ч)' : 'Equator (24h)')}</div>
                                    <div class="ppc-buffer-tick-time">${window.escapeHTML(equatorStr)}</div>
                                </div>
                                <div class="ppc-buffer-tick-item end">
                                    <div class="ppc-buffer-tick-label">${window.escapeHTML(lang === 'ru' ? 'Архив (48ч)' : 'Archive (48h)')}</div>
                                    <div class="ppc-buffer-tick-time">${window.escapeHTML(archiveDateStr)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <!-- Protected Hero -->
        <div class="ppc-protected-hero">
            <div class="ppc-shield-icon">🛡</div>
            <div class="ppc-protected-title">${window.escapeHTML(project.name || project.package_name || project.package || ('App ' + project.id))}</div>
            <div class="ppc-protected-subtitle">${window.escapeHTML(T('ppcSubtitleProtected'))}</div>
        </div>

        ${pendingHtml}

        <div class="ppc-sync-note${syncNoteStale ? ' stale' : ''}">
            ${lastSyncDate ? window.escapeHTML(T('ppcLastSyncedAt', { date: lastSyncDate.toLocaleDateString(locale), days: updatedDaysAgo })) : ''}
        </div>

        <!-- Status Metrics Card -->
        <div class="ppc-card">
            <div class="ppc-metrics-grid">
                <div class="ppc-metric-item">
                    <div class="ppc-metric-label">${window.escapeHTML(T('ppcPlatformDayCardLabel'))}</div>
                    <div class="ppc-metric-value blue">${platformDay}<span style="font-size:13px;font-weight:500;color:var(--hint-color);">/24</span></div>
                </div>
                <div class="ppc-metric-item">
                    <div class="ppc-metric-label">${window.escapeHTML(T('ppcGoogleDayCardLabel'))}</div>
                    <div class="ppc-metric-value green">${googleDay}<span style="font-size:13px;font-weight:500;color:var(--hint-color);">/14</span></div>
                </div>
                <div class="ppc-metric-item">
                    <div class="ppc-metric-label">${window.escapeHTML(T('ppcActiveProtectionLabel'))}</div>
                    <div class="ppc-metric-value green" style="font-size:15px;">${activeProtectionText}</div>
                </div>
                <div class="ppc-metric-item">
                    <div class="ppc-metric-label">${window.escapeHTML(T('ppcArchiveDateLabel'))}</div>
                    <div class="ppc-metric-value hint" style="font-size:15px;">${archiveDateStr}</div>
                </div>
            </div>
        </div>

        <!-- Lifecycle Timeline Card -->
        <div class="ppc-card">
            <div class="ppc-card-title" style="display:flex; justify-content:space-between; align-items:center;">
                <span>${lang === 'ru' ? 'Жизненный цикл проекта' : 'Project Lifecycle'}</span>
                <span style="font-size:10px; font-weight:500; color:var(--hint-color); text-transform:none; letter-spacing:0; opacity:0.8; display:flex; align-items:center; gap:3px;">
                    ${lang === 'ru' ? 'листайте' : 'swipe'} ↔
                </span>
            </div>
            <div class="ppc-timeline-wrap">
                <div class="ppc-timeline">
                    ${timelineHtml}
                </div>
            </div>
        </div>

        ${cardHtml}

        <!-- Sync message (if any) -->
        ${project.sync_message ? `
            <div class="ppc-card" style="margin-bottom:14px;">
                <div class="ppc-card-title">${window.escapeHTML(window.t('syncMessageLabel', {}, lang))}</div>
                <div style="font-size:13px;line-height:1.55;color:var(--text-color);">${escapeHtmlWithBreaks(project.sync_message)}</div>
            </div>
        ` : ''}

        <!-- Update sync button -->
        <button type="button" class="ppc-submit-btn" style="background:rgba(255,255,255,0.07);color:var(--text-color);box-shadow:none;border:1px solid rgba(255,255,255,0.12);" onclick="_ppcSwitchToEditMode()">
            ${window.escapeHTML(T('ppcUpdateSyncBtn'))}
        </button>
    `;
}

/** Switches from State #2 view to State #1 edit mode. */
function _ppcSwitchToEditMode() {
    if (!_syncProjectId) return;
    const project = myProjects.find(item => Number(item.id) === Number(_syncProjectId));
    if (!project) return;
    const platformDay = getProjectPlatformDay(project.created_at);
    const body = document.getElementById('protection-center-body');
    if (body) body.innerHTML = _renderProtectionCenterState1(project, platformDay);
    _ppcUpdateCalculations();
}

/** Opens the dedicated Top-Up Pool bottom-sheet modal. */
function openPpcTopUpModal() {
    if (!_syncProjectId) return;
    const project = myProjects.find(item => Number(item.id) === Number(_syncProjectId));
    if (!project) return;
    const T = (key, vars) => window.t(key, vars || {}, lang) || key;
    const balance = (visibilityStats && typeof visibilityStats.balance_bust !== 'undefined')
        ? Number(visibilityStats.balance_bust || 0)
        : 0;
    const poolAmount = Number(project.protection_bust_pool || 0);

    // Remove existing topup modal if any
    const existing = document.getElementById('ppc-topup-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ppc-topup-modal';
    overlay.className = 'ppc-topup-overlay';
    overlay.setAttribute('onclick', 'closePpcTopUpModal()');

    overlay.innerHTML = `
        <div class="ppc-topup-sheet" onclick="event.stopPropagation()">
            <div class="ppc-topup-handle"></div>
            <div class="ppc-topup-title">🛡 ${window.escapeHTML(T('ppcTopupModalTitle'))}</div>
            <div class="ppc-topup-desc">${window.escapeHTML(T('ppcTopupModalDesc'))}</div>

            <div class="ppc-topup-pool-row">
                <span class="ppc-topup-pool-label">${window.escapeHTML(T('ppcTopupCurrentPool'))}</span>
                <span class="ppc-topup-pool-value notranslate">${poolAmount} $BUST</span>
            </div>

            <div class="ppc-topup-counter-row">
                <button type="button" class="ppc-topup-step-btn" onclick="_ppcTopupChangeTip(-5)">−</button>
                <div class="ppc-topup-counter-wrap">
                    <span class="ppc-topup-value notranslate" id="ppc-topup-amount">0</span>
                    <span class="ppc-topup-unit">$BUST</span>
                </div>
                <button type="button" class="ppc-topup-step-btn" onclick="_ppcTopupChangeTip(5)">+</button>
            </div>

            <div class="ppc-topup-chips">
                <button type="button" class="ppc-topup-chip" onclick="_ppcTopupAddTip(10)">+10</button>
                <button type="button" class="ppc-topup-chip" onclick="_ppcTopupAddTip(50)">+50</button>
                <button type="button" class="ppc-topup-chip" onclick="_ppcTopupAddTip(100)">+100</button>
            </div>

            <div class="ppc-topup-balance-row" id="ppc-topup-balance-row">
                <span>${window.escapeHTML(T('ppcTopupBalance'))}</span>
                <span class="notranslate" id="ppc-topup-balance-val">${balance.toFixed(1)} $BUST</span>
            </div>

            <button type="button" class="ppc-topup-submit" id="ppc-topup-submit-btn" onclick="savePpcTopUp()" disabled>
                ${window.escapeHTML(T('ppcTopupConfirmBtn'))}
            </button>
            <button type="button" class="ppc-topup-cancel" onclick="closePpcTopUpModal()">
                ${window.escapeHTML(T('btnCancel'))}
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
}

/** Closes the Top-Up Pool modal. */
function closePpcTopUpModal() {
    const overlay = document.getElementById('ppc-topup-modal');
    if (!overlay) return;
    overlay.classList.remove('active');
    setTimeout(() => overlay.remove(), 280);
}

/** Steps the top-up amount by delta (multiples of 5, min 0). */
function _ppcTopupChangeTip(delta) {
    const el = document.getElementById('ppc-topup-amount');
    if (!el) return;
    const current = Number(el.textContent) || 0;
    const next = Math.max(0, current + delta);
    el.textContent = String(next);
    _ppcTopupUpdateState();
}

/** Adds a fixed amount to the top-up counter. */
function _ppcTopupAddTip(amount) {
    const el = document.getElementById('ppc-topup-amount');
    if (!el) return;
    const current = Number(el.textContent) || 0;
    el.textContent = String(current + amount);
    _ppcTopupUpdateState();
}

/** Updates balance display and submit button state for the top-up modal. */
function _ppcTopupUpdateState() {
    const amountEl = document.getElementById('ppc-topup-amount');
    const balanceEl = document.getElementById('ppc-topup-balance-val');
    const submitBtn = document.getElementById('ppc-topup-submit-btn');
    if (!amountEl) return;
    const tipAmount = Number(amountEl.textContent) || 0;
    const balance = (visibilityStats && typeof visibilityStats.balance_bust !== 'undefined')
        ? Number(visibilityStats.balance_bust || 0)
        : 0;
    const remaining = balance - tipAmount;
    if (balanceEl) {
        balanceEl.textContent = remaining.toFixed(1) + ' $BUST';
        balanceEl.style.color = remaining < 0 ? '#ff3b30' : '';
    }
    if (submitBtn) {
        submitBtn.disabled = tipAmount <= 0 || remaining < 0;
    }
}

/**
 * Opens the Project Protection Center full-screen view for the given project.
 * Replaces the old openSyncModal().
 */
function openProtectionCenter(projectId) {
    const project = myProjects.find(item => Number(item.id) === Number(projectId));
    const view = document.getElementById('protection-center');
    const body = document.getElementById('protection-center-body');
    const headerTitle = document.getElementById('ppc-header-title');

    if (!project || !view || !body) return;

    _syncProjectId = Number(projectId);

    if (headerTitle) headerTitle.textContent = window.t('ppcTitle', {}, lang) || 'Project Protection Center';

    // Compute platform day
    const platformDay = getProjectPlatformDay(project.created_at);

    const isSynced = _isProjectSyncedSafe(project);
    const googleDay = isSynced ? getProjectCurrentGoogleDay(project, platformDay) : 0;

    // Show loading spinner briefly then render
    body.innerHTML = `<div class="ppc-spinner"><div class="ppc-spinner-ring"></div></div>`;

    // Slide in
    view.classList.add('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();

    // Hide bottom nav while open
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = 'none';

    // Render content after a microtask (let slide animation start first)
    setTimeout(() => {
        if (isSynced) {
            body.innerHTML = _renderProtectionCenterState2(project, platformDay, googleDay);
        } else {
            body.innerHTML = _renderProtectionCenterState1(project, platformDay);
            _ppcUpdateCalculations();
        }
    }, 60);
}

/**
 * Closes the Project Protection Center.
 * Replaces the old closeSyncModal().
 */
function closeProtectionCenter() {
    const view = document.getElementById('protection-center');
    const body = document.getElementById('protection-center-body');
    if (view) view.classList.remove('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();

    // Restore bottom nav
    const bottomNav = document.querySelector('.bottom-nav');
    if (bottomNav) bottomNav.style.display = '';

    _syncProjectId = null;

    // Clear body after animation completes
    setTimeout(() => {
        if (body && view && !view.classList.contains('active')) {
            body.innerHTML = '';
        }
    }, 380);
}

// Legacy aliases for any remaining callers
function openSyncModal(projectId) { openProtectionCenter(projectId); }
function closeSyncModal(event) {
    // Only close if called without event (direct call) or backdrop click pattern
    if (!event || event.target === document.getElementById('sync-modal')) {
        closeProtectionCenter();
    }
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

    function paintArchive(gtArchivedOrders) {
        const gtOrders = Array.isArray(gtArchivedOrders) ? gtArchivedOrders : [];
        const totalCount = visibleArchivedProjects.length + gtOrders.length;
        if (totalCount === 0) {
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
                    <span class="archive-toggle-label">${t.archiveTitle} (${totalCount})</span>
                    <span class="archive-toggle-arrow">▼</span>
                </button>
                <div id="archive-list" class="archive-list is-collapsed">
        `;
        if (gtOrders.length) {
            html +=
                '<div class="guaranteed-orders-section archive-gt-orders">' +
                    '<h3 class="guaranteed-orders-section__title">' +
                        window.escapeHTML(getProjectUiText('gtOrdersSectionTitle', 'Private Testing')) +
                    '</h3>' +
                    '<div class="guaranteed-orders-section__list">' +
                        gtOrders.map(function (order) {
                            return buildGuaranteedOrderCardHtml(order, { archived: true });
                        }).join('') +
                    '</div>' +
                '</div>';
        }
        visibleArchivedProjects.forEach((project) => {
            const modeLabel = project.mode === 'bounty' ? t.modeBounty : project.mode === 'hybrid' ? t.modeHybrid : t.modeMutual;
            const archiveName = project.name || window.t('unknownLabel', {}, lang);
            const safeArchiveName = window.escapeHTML(archiveName);
            const archiveSubtitleHtml = buildProjectCardSubtitle(project);
            const langBadge = (project.target_lang && project.target_lang !== 'ALL') ? getLangBadge(project.target_lang) : '';
            const afkChip = project.archive_reason === 'afk' ? '<span class=\"meta-chip accent-red\">' + t.archivedAfkOwnerChip + '</span>' : '';
            const isBlocked = !!(project.is_blocked || project.blocked_at || project.archive_reason === 'policy_blocked');
            const blockedChip = isBlocked
                ? '<span class="archive-meta-chip archive-meta-chip-blocked">' + window.escapeHTML(window.t('appRemovedFromPublication', {}, lang)) + '</span>'
                : '';
            const runIterationChip = buildRunIterationChip(project, 'archive-meta-chip');
            html += `
                <div class="card archive-card" id="archive-card-${project.app_id}" data-archive-project-id="${project.app_id}">
                    <div class="card-header archive-card-header">
                        ${renderIcon(archiveName, project.icon_url)}
                        <div class="card-info">
                            <div class="card-title notranslate">${safeArchiveName}</div>
                            ${archiveSubtitleHtml}
                        </div>
                        ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;">${langBadge}</div>` : ''}
                    </div>
                    <div class="archive-meta-row">
                        <span class="archive-meta-chip">${modeLabel}</span>
                        ${runIterationChip}
                        ${afkChip}
                        ${blockedChip}
                        <span class="archive-meta-chip">👥 ${project.total_testers}</span>
                        <span class="archive-meta-chip">✅ ${project.total_checkins}</span>
                        <span class="archive-meta-chip">🆕 ${project.feedback_new_count || 0}</span>
                    </div>
                    ${isBlocked ? `
                    <div class="archive-blocked-note">${window.escapeHTML(window.t('blockedAppActionForbidden', {}, lang))}</div>
                    <div style="margin-top: 10px;">${buildProjectFeedbackButton(project.app_id, project.feedback_total_count || 0, project.feedback_new_count || 0, true)}</div>
                    ` : `
                    <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                        ${typeof window.buildTestingControlEntryButton === 'function' ? window.buildTestingControlEntryButton(project.app_id, true) : ''}
                        <button class="btn btn-secondary" style="width: 100%; background-color: rgba(52, 199, 89, 0.12); color: var(--text-color); border: 1px solid rgba(52, 199, 89, 0.24);" onclick="openRestartArchivedModal(${project.app_id})">
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
                    `}
                </div>`;
        });
        html += `
                </div>
            </div>
        `;
        section.innerHTML = html;
    }

    paintArchive(_gtArchivedOrdersCache || []);
    loadArchivedGuaranteedOrders(!!force).then(function (orders) {
        if (!document.getElementById('archive-section')) return;
        paintArchive(orders);
    }).catch(function () {
        paintArchive(_gtArchivedOrdersCache || []);
    });
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
    var message = typeof window.tInternalCheckinCopy === 'function'
        ? window.tInternalCheckinCopy('screenshotDayOwnerAlert', 'screenshotDayOwnerAlertProof')
        : t.screenshotDayOwnerAlert;
    if (tg.showAlert) tg.showAlert(message);
    else alert(message);
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
    var lastSentCount = Math.max(0, Number(project && project.last_mass_invite_sent_count || 0));

    return {
        isEligibleMode: isEligibleMode,
        activeMutualTesters: activeMutualTesters,
        neededSlots: neededSlots,
        maxRecipients: maxRecipients,
        remainingMs: remainingMs,
        isCooldownActive: remainingMs > 0,
        isAvailable: isEligibleMode && maxRecipients > 0,
        lastSentCount: lastSentCount,
    };
}

async function handleMassInviteAction(projectId) {
    var project = myProjects.find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project) return;
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }

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
        tg.openTelegramLink((window.App && window.App.publicGroupUrl || 'https://t.me/googleplay_console_12testers') + '/2');
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
    const titleEl = document.getElementById('t-deleteModalTitle');
    const labelEl = document.getElementById('t-deleteMessageLabel');
    const messageEl = document.getElementById('delete-message');
    const confirmBtnEl = document.getElementById('t-confirmDeleteBtn');
    let infoHtml = '';

    if (project) {
        const todayDate = new Date(getLocalDate());
        const daysOnPlatform = project.created_at
            ? Math.floor((todayDate.getTime() - new Date(project.created_at).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        const platformDays = typeof getProjectPlatformDay === 'function'
            ? getProjectPlatformDay(project.created_at)
            : Math.max(1, daysOnPlatform + 1);
        const rawGoogleDay = (_isProjectSyncedSafe(project)
            && typeof getProjectCurrentGoogleDay === 'function')
            ? getProjectCurrentGoogleDay(project, platformDays)
            : platformDays;
        const currentProjectDay = Math.max(1, Number.isFinite(Number(rawGoogleDay)) ? Number(rawGoogleDay) : 1);
        const isEarlyStop = currentProjectDay < 14;
        const testers = project.testers || [];
        const uniqueTestersCount = new Set(testers.map((tr) => tr.tester_id)).size;
        const projectLikes = project.likes || [];
        const canGetOwnerBonus = daysOnPlatform >= 14 && uniqueTestersCount >= 5;

        if (titleEl) {
            titleEl.textContent = window.t(isEarlyStop ? 'deleteModalTitleEarly' : 'deleteModalTitleFinal', {}, lang);
        }
        if (labelEl) {
            labelEl.textContent = window.t(isEarlyStop ? 'deleteMessageLabelEarly' : 'deleteMessageLabelFinal', {}, lang);
        }
        if (messageEl) {
            // Field hint lives in the label; clear placeholder to avoid duplicate text.
            messageEl.placeholder = '';
        }
        if (confirmBtnEl) {
            confirmBtnEl.textContent = window.t(isEarlyStop ? 'confirmDeleteBtnEarly' : 'confirmDeleteBtnFinal', {}, lang);
        }

        infoHtml += '<div class="delete-info-block">' + window.escapeHTML(
            window.t(isEarlyStop ? 'deleteModalDescEarly' : 'deleteModalDescFinal', {}, lang)
        ) + '</div>';
        if (canGetOwnerBonus) {
            infoHtml += '<div class="delete-chip-row"><span class="meta-chip accent-green">' + window.escapeHTML(t.deleteBonusChip) + '</span></div>';
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

window.addWizardState = window.addWizardState || { focusStep: 1, unlockedStep: 1 };

function _syncWizardStepSubtitle(step) {
    const subtitle = document.getElementById('wizard-step-subtitle');
    if (!subtitle) return;
    const key = 'wizardStepSubtitle' + (step === 2 || step === 3 ? step : 1);
    // Keep data-i18n in sync so a language switch re-renders the right step.
    subtitle.dataset.i18n = key;
    if (window.t) subtitle.textContent = window.t(key, {}, window.currentLang);
}

function _getWizardUnlockedStep() {
    return Math.max(1, Math.min(3, Number((window.addWizardState && window.addWizardState.unlockedStep) || 1)));
}

function _extractPackageNameFromPlayInput() {
    const raw = (document.getElementById('app-package').value || '').trim();
    if (!raw) return '';
    try {
        if (raw.includes('play.google.com')) {
            const parsed = new URL(raw).searchParams.get('id');
            if (parsed) return parsed.trim();
        }
    } catch (e) { /* noop */ }
    return raw;
}

function _setWizardContinueLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
        if (!btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
        btn.textContent = '...';
        btn.disabled = true;
        btn.classList.add('is-loading');
    } else {
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
        btn.disabled = false;
        btn.classList.remove('is-loading');
    }
}

async function _checkPackageDuplicate(packageName) {
    const normalized = String(packageName || '').trim();
    if (!normalized) return 'invalid_play_link';

    const localProjects = (typeof myProjects !== 'undefined' ? myProjects : []) || [];
    const hasLocalLive = localProjects.some(function (project) {
        const pkg = String((project && (project.package || project.package_name)) || '').trim();
        if (pkg !== normalized) return false;
        const status = String((project && project.status) || 'active').toLowerCase();
        return status === 'active' || status === 'pending' || !status;
    });
    if (hasLocalLive) return 'ALREADY_ACTIVE';

    const apiBase = (window.App && window.App.API_BASE) || window.API_BASE || '';
    const userId = (window.App && window.App.userId) || window.userId || 0;
    const initData = (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '';

    try {
        const response = await fetch(apiBase + '/projects/check-package', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                package_name: normalized,
                init_data: initData,
            }),
        });
        const result = await response.json();
        if (result && result.status === 'ok') return null;
        if (typeof getBackendErrorCode === 'function') {
            return getBackendErrorCode(result) || 'database_error';
        }
        return (result && (result.code || result.error_code)) || 'database_error';
    } catch (e) {
        console.error('Package duplicate check failed:', e);
        return 'network_error';
    }
}

function _getSavedUserTesterEmail() {
    const fromHelper = (typeof getCurrentUserEmail === 'function') ? getCurrentUserEmail() : '';
    const fromApp = String((window.App && window.App.userEmail) || '').trim();
    const fromState = String((window.App && window.App.state && window.App.state._userEmail) || '').trim();
    return String(fromHelper || fromApp || fromState || '').trim();
}

function _syncEditEmailTestersBoxVisibility() {
    const editEmailBox = document.getElementById('edit-add-email-testers-box');
    if (!editEmailBox) return;
    const savedEmail = _getSavedUserTesterEmail();
    const acceptsBox = document.getElementById('edit-app-accepts-email-testers');
    const testerEmail = document.getElementById('edit-app-tester-email');

    if (savedEmail) {
        editEmailBox.style.display = 'none';
        editEmailBox.classList.remove('is-expanded');
        if (acceptsBox) acceptsBox.checked = true;
        if (testerEmail) testerEmail.value = savedEmail;
        return;
    }

    editEmailBox.style.removeProperty('display');
    if (acceptsBox) acceptsBox.checked = true;
    if (testerEmail) testerEmail.value = '';
    editEmailBox.classList.add('is-expanded');
    _updateEditTesterEmailValidIcon();
}

function _syncAddEmailTestersBoxVisibility() {
    const addEmailBox = document.getElementById('add-email-testers-box');
    if (!addEmailBox) return;
    const savedEmail = _getSavedUserTesterEmail();
    if (savedEmail) {
        addEmailBox.style.display = 'none';
        const acceptsBox = document.getElementById('app-accepts-email-testers');
        const testerEmail = document.getElementById('app-tester-email');
        if (acceptsBox) acceptsBox.checked = true;
        if (testerEmail) testerEmail.value = savedEmail;
        return;
    }
    addEmailBox.style.removeProperty('display');
}

function _resolveWizardIconUrl(iconUrl) {
    if (typeof resolveIconUrl === 'function') return resolveIconUrl(iconUrl);
    return iconUrl || '';
}

function _applyMainIconPreview(url, hasIcon) {
    const picker = document.getElementById('app-icon-picker');
    const preview = document.getElementById('app-icon-preview');
    const placeholder = document.getElementById('app-icon-placeholder');
    if (!picker || !preview) return;

    picker.classList.toggle('has-icon', hasIcon);
    if (hasIcon && url) {
        preview.onerror = function () { onAppIconPreviewError(); };
        preview.onload = function () {
            preview.style.display = 'block';
            preview.style.visibility = 'visible';
            picker.classList.add('has-icon');
            if (placeholder) placeholder.style.display = 'none';
        };
        preview.src = url;
        preview.style.display = 'block';
        preview.style.visibility = 'visible';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        preview.onload = null;
        preview.onerror = null;
        preview.removeAttribute('src');
        preview.style.display = 'none';
        preview.style.visibility = '';
        if (placeholder) placeholder.style.display = '';
    }
}

function _preloadIconUrl(url) {
    if (window.API_USES_NGROK && url && url.indexOf('telegram-media') !== -1 && typeof fetchNgrokSafeImageUrl === 'function') {
        return fetchNgrokSafeImageUrl(url).then(function (safeUrl) {
            return new Promise(function (resolve) {
                if (!safeUrl) { resolve(false); return; }
                const img = new Image();
                img.onload = function () { resolve(true); };
                img.onerror = function () { resolve(false); };
                img.src = safeUrl;
            });
        });
    }
    return new Promise(function (resolve) {
        if (!url) { resolve(false); return; }
        const img = new Image();
        img.onload = function () { resolve(true); };
        img.onerror = function () { resolve(false); };
        img.src = url;
    });
}

function _updateAddPlayLinkValidationUi() {
    const input = document.getElementById('app-package');
    if (!input) return;
    const value = (input.value || '').trim();
    const currentPackage = typeof _extractPackageNameFromPlayInput === 'function'
        ? String(_extractPackageNameFromPlayInput() || '').trim()
        : value;

    if (!value) {
        input.classList.remove('field-error');
        if (typeof _clearProjectPackageError === 'function') _clearProjectPackageError();
        if (typeof _clearPackageConflictState === 'function') _clearPackageConflictState();
        return;
    }

    if (typeof _packageConflictState === 'object' && _packageConflictState && _packageConflictState.packageName) {
        if (currentPackage !== _packageConflictState.packageName) {
            if (typeof _clearPackageConflictState === 'function') _clearPackageConflictState();
        } else if (typeof _setPackageConflictReopenVisible === 'function') {
            _setPackageConflictReopenVisible(true);
        }
    }

    if (isAddPlayLinkValid()) {
        input.classList.remove('field-error');
        // Keep conflict reopen chip if this package still conflicts; only clear invalid-link errors.
        if (!_packageConflictState || !_packageConflictState.packageName || currentPackage !== _packageConflictState.packageName) {
            if (typeof _clearProjectPackageError === 'function') _clearProjectPackageError();
        }
        return;
    }

    input.classList.add('field-error');
    if (typeof _showProjectPackageError === 'function') {
        _showProjectPackageError('invalidPlayLink');
    }
}

function _revokeAppIconBlobUrl() {
    const flow = window.addProjectFlow;
    if (flow && flow.iconBlobUrl) {
        try { URL.revokeObjectURL(flow.iconBlobUrl); } catch (e) { /* noop */ }
        flow.iconBlobUrl = null;
    }
}

function _ensureOptionalSettingsExpanded() {
    const card = document.getElementById('wizard-optional-card');
    if (!card) return;
    card.classList.add('is-expanded');
    const head = card.querySelector('.wizard-optional-card__head');
    if (head) head.setAttribute('aria-expanded', 'true');
}

function _scrollWizardToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const body = document.getElementById('wizard-body');
    if (body) {
        const header = document.querySelector('.wizard-header');
        const headerH = header ? header.offsetHeight : 0;
        const top = section.offsetTop - headerH - 8;
        body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
    if (typeof section.scrollIntoView === 'function') {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateWizardProgress() {
    const unlocked = _getWizardUnlockedStep();
    const focusStep = (window.addWizardState && window.addWizardState.focusStep) || 1;

    [1, 2, 3].forEach(function (step) {
        const item = document.querySelector('.wizard-progress__item[data-wizard-step="' + step + '"]');
        const dot = document.getElementById('wizard-dot-' + step);
        if (!item || !dot) return;

        const isComplete = step < unlocked;
        const isCurrent = step === focusStep;

        item.classList.toggle('is-complete', isComplete && !isCurrent);
        item.classList.toggle('is-current', isCurrent);

        if (isComplete && !isCurrent) {
            dot.textContent = '✓';
        } else {
            dot.textContent = String(step);
        }
    });

    const line1 = document.getElementById('wizard-line-1');
    const line2 = document.getElementById('wizard-line-2');
    if (line1) line1.classList.toggle('is-complete', unlocked >= 2);
    if (line2) line2.classList.toggle('is-complete', unlocked >= 3);

    _syncWizardStepSubtitle(focusStep);

    document.querySelectorAll('.wizard-section').forEach(function (el) {
        el.classList.remove('wizard-section--current');
    });
    const currentSection = document.getElementById('add-stage-' + focusStep);
    if (currentSection) currentSection.classList.add('wizard-section--current');
}

async function wizardContinue(step) {
    if (step === 1) {
        if (!isAddPlayLinkValid()) return;
        const btn = document.getElementById('add-continue-1');
        _setWizardContinueLoading(btn, true);
        if (typeof _clearProjectPackageError === 'function') _clearProjectPackageError();

        try {
            const packageName = _extractPackageNameFromPlayInput();
            const conflictCode = await _checkPackageDuplicate(packageName);
            if (conflictCode) {
                if (typeof _handleProjectCreateConflict === 'function') {
                    _handleProjectCreateConflict(conflictCode);
                } else if (typeof _showProjectPackageError === 'function') {
                    _showProjectPackageError(conflictCode);
                }
                _markAddFieldError(document.getElementById('app-package'));
                return;
            }
            window.addWizardState.unlockedStep = 2;
            window.addWizardState.focusStep = 2;
            evaluateAddStages();
            updateWizardProgress();
            _scrollWizardToSection('add-stage-2');
        } finally {
            _setWizardContinueLoading(btn, false);
        }
        return;
    }
    if (step === 2) {
        if (!isAddStage2Complete()) return;
        window.addWizardState.unlockedStep = 3;
        window.addWizardState.focusStep = 3;
        _ensureOptionalSettingsExpanded();
        evaluateAddStages();
        updateWizardProgress();
        _scrollWizardToSection('add-stage-3');
    }
}

function toggleWizardOptionalCard() {
    const card = document.getElementById('wizard-optional-card');
    if (!card) return;
    const willExpand = !card.classList.contains('is-expanded');
    card.classList.toggle('is-expanded', willExpand);
    const head = card.querySelector('.wizard-optional-card__head');
    if (head) head.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
}

function syncAppIconPickerUi() {
    const iconInput = document.getElementById('app-icon');
    const picker = document.getElementById('app-icon-picker');
    const preview = document.getElementById('app-icon-preview');
    const placeholder = document.getElementById('app-icon-placeholder');
    const removeBtn = document.getElementById('icon-picker-remove-btn');
    const pickerPreviewWrap = document.getElementById('icon-picker-preview-wrap');
    const pickerPreviewImg = document.getElementById('icon-picker-preview-img');
    const pickerPreviewName = document.getElementById('icon-picker-preview-name');
    const playValidIcon = document.getElementById('play-link-valid-icon');

    if (playValidIcon) {
        playValidIcon.classList.toggle('is-visible', isAddPlayLinkValid());
    }

    const rawUrl = iconInput ? (iconInput.value || '').trim() : '';
    const blobUrl = window.addProjectFlow && window.addProjectFlow.iconBlobUrl;
    const url = _resolveWizardIconUrl(blobUrl || rawUrl);
    const hasIcon = !!url;

    _applyMainIconPreview(url, hasIcon);
    if (removeBtn) removeBtn.style.display = hasIcon ? '' : 'none';

    if (pickerPreviewWrap && pickerPreviewImg) {
        if (hasIcon) {
            pickerPreviewWrap.style.display = 'flex';
            pickerPreviewImg.onerror = function () {
                if (window.addProjectFlow && window.addProjectFlow.iconBlobUrl) return;
                pickerPreviewWrap.style.display = 'none';
                pickerPreviewImg.removeAttribute('src');
            };
            pickerPreviewImg.src = url;
        } else {
            pickerPreviewWrap.style.display = 'none';
            pickerPreviewImg.removeAttribute('src');
        }
    }
    if (pickerPreviewName) {
        const appName = (document.getElementById('app-name').value || '').trim();
        pickerPreviewName.textContent = appName || 'App';
    }
}

function onAppIconInput() {
    syncAppIconPickerUi();
}

function onAppIconPreviewError() {
    if (window.addProjectFlow && window.addProjectFlow.iconBlobUrl) return;
    const preview = document.getElementById('app-icon-preview');
    if (preview) {
        preview.removeAttribute('src');
        preview.style.display = 'none';
    }
    const picker = document.getElementById('app-icon-picker');
    if (picker) picker.classList.remove('has-icon');
}

async function onAppIconFileSelected(fileInput) {
    const file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return;

    _revokeAppIconBlobUrl();
    if (!window.addProjectFlow) window.addProjectFlow = {};
    const blobUrl = URL.createObjectURL(file);
    window.addProjectFlow.iconBlobUrl = blobUrl;
    syncAppIconPickerUi();
    closeIconPickerSheet();

    let uploadOk = false;
    try {
        if (typeof handleIconUpload === 'function') {
            await handleIconUpload(fileInput, 'app-icon');
            uploadOk = !!(document.getElementById('app-icon') && (document.getElementById('app-icon').value || '').trim());
        }
    } catch (e) {
        console.error('Icon upload failed:', e);
    }

    if (uploadOk) {
        const serverUrl = _resolveWizardIconUrl((document.getElementById('app-icon').value || '').trim());
        const loaded = await _preloadIconUrl(serverUrl);
        if (loaded) {
            _revokeAppIconBlobUrl();
        }
    }
    syncAppIconPickerUi();
}

function openIconPickerSheet() {
    const overlay = document.getElementById('icon-picker-overlay');
    if (!overlay) return;
    iconPickerShowMenu();
    syncAppIconPickerUi();
    overlay.classList.add('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
}

function closeIconPickerSheet(event) {
    if (event && event.target !== document.getElementById('icon-picker-overlay')) return;
    const overlay = document.getElementById('icon-picker-overlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    iconPickerShowMenu();
    syncAppIconPickerUi();
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
}

function iconPickerShowMenu() {
    const menu = document.getElementById('icon-picker-menu');
    const linkPanel = document.getElementById('icon-picker-link-panel');
    const linkInput = document.getElementById('icon-picker-link-input');
    if (menu) menu.style.display = '';
    if (linkPanel) linkPanel.style.display = 'none';
    if (linkInput) linkInput.value = '';
}

function iconPickerShowLinkInput() {
    const menu = document.getElementById('icon-picker-menu');
    const linkPanel = document.getElementById('icon-picker-link-panel');
    const linkInput = document.getElementById('icon-picker-link-input');
    const iconInput = document.getElementById('app-icon');
    if (menu) menu.style.display = 'none';
    if (linkPanel) linkPanel.style.display = 'block';
    if (linkInput && iconInput) linkInput.value = iconInput.value || '';
    if (linkInput) linkInput.focus();
}

function iconPickerApplyLink() {
    const linkInput = document.getElementById('icon-picker-link-input');
    const iconInput = document.getElementById('app-icon');
    if (!linkInput || !iconInput) return;
    iconInput.value = (linkInput.value || '').trim();
    onAppIconInput();
    closeIconPickerSheet();
}

function iconPickerUpload() {
    const fileInput = document.getElementById('app-icon-file');
    if (fileInput) fileInput.click();
}

function iconPickerRemove() {
    const iconInput = document.getElementById('app-icon');
    const fileInput = document.getElementById('app-icon-file');
    _revokeAppIconBlobUrl();
    if (iconInput) iconInput.value = '';
    if (fileInput) fileInput.value = '';
    onAppIconInput();
    closeIconPickerSheet();
}

function onAddAppNameInput() {
    const input = document.getElementById('app-name');
    const counter = document.getElementById('app-name-counter');
    if (input && counter) {
        counter.textContent = String((input.value || '').length) + '/30';
    }
    syncAppIconPickerUi();
    evaluateAddStages();
}

function togglePlayLinkHelpAccordion() {
    const btn = document.getElementById('play-link-help-btn');
    const accordion = document.getElementById('play-link-help-accordion');
    if (!accordion || !btn) return;
    const isHidden = accordion.style.display === 'none' || !accordion.style.display;
    if (isHidden) {
        accordion.style.display = 'block';
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('is-open');
    } else {
        accordion.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-open');
    }
}

function openModal() {
    window.addWizardState.focusStep = 1;
    window.addWizardState.unlockedStep = 1;
    document.getElementById('add-modal').classList.add('active');
    document.body.classList.add('wizard-open');
    resetAddFlow();
    renderGroupSection();
    setProjectTargetLang('add', 'ALL');
    updateProjectPricing('add');
    syncAppIconPickerUi();
    onAddAppNameInput();
    _syncAddEmailTestersBoxVisibility();

    evaluateAddStages();
    updateWizardProgress();
    const wizardBody = document.getElementById('wizard-body');
    if (wizardBody) wizardBody.scrollTop = 0;
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    document.getElementById('app-name').focus();
}

function getProjectUiText(key, fallback, params) {
    var activeLang = (typeof lang !== 'undefined' && lang)
        ? lang
        : (window.currentLang || 'en');
    if (typeof window.t === 'function') {
        var translated = window.t(key, params || {}, activeLang);
        if (translated && translated !== key) return translated;
    }
    return fallback;
}

function refreshAddProjectChooserTexts(overlay) {
    if (!overlay) return;
    var closeBtn = overlay.querySelector('.add-project-chooser-close');
    if (closeBtn) {
        closeBtn.setAttribute('aria-label', getProjectUiText('addProjectChooserClose', 'Close'));
    }
    var titleEl = overlay.querySelector('.add-project-chooser-title');
    if (titleEl) {
        titleEl.textContent = getProjectUiText('addProjectChooserTitle', 'Testing format');
    }

    var sec1Header = overlay.querySelector('.add-project-chooser-section--closed .add-project-chooser-section-title');
    if (sec1Header) {
        sec1Header.textContent = getProjectUiText('section_closed_testing', 'ЗАКРЫТОЕ ТЕСТИРОВАНИЕ (14 ДНЕЙ)');
    }

    var sec2Header = overlay.querySelector('.add-project-chooser-section--growth .add-project-chooser-section-title');
    if (sec2Header) {
        sec2Header.textContent = getProjectUiText('section_growth', 'МАСШТАБИРОВАНИЕ И РОСТ');
    }

    var mutual = overlay.querySelector('.add-project-chooser-option--mutual');
    if (mutual) {
        var mutualTitle = mutual.querySelector('.add-project-chooser-option-title');
        var mutualTag = mutual.querySelector('.add-project-chooser-option-tag');
        var mutualDesc = mutual.querySelector('.add-project-chooser-option-desc');
        if (mutualTitle) mutualTitle.textContent = getProjectUiText('addProjectChooserMutualTitle', 'Mutual exchange');
        if (mutualTag) mutualTag.textContent = getProjectUiText('addProjectChooserMutualTag', 'Free');
        if (mutualDesc) mutualDesc.textContent = getProjectUiText('addProjectChooserMutualDesc', 'Test other apps and get tests in return.');
    }

    var privateOpt = overlay.querySelector('.add-project-chooser-option--private');
    if (privateOpt) {
        var privateTitle = privateOpt.querySelector('.add-project-chooser-option-title');
        var privateTag = privateOpt.querySelector('.add-project-chooser-option-tag');
        var privateDesc = privateOpt.querySelector('.add-project-chooser-option-desc');
        if (privateTitle) privateTitle.textContent = getProjectUiText('addProjectChooserPrivateTitle', 'Private Testing');
        if (privateTag) privateTag.textContent = getProjectUiText('addProjectChooserPrivateTag', '$20');
        if (privateDesc) privateDesc.textContent = getProjectUiText('addProjectChooserPrivateDesc', '12+ devices for 14 days without your involvement. Result guarantee.');
    }

    var boostOpt = overlay.querySelector('.add-project-chooser-option--boost');
    if (boostOpt) {
        var boostTitle = boostOpt.querySelector('.add-project-chooser-option-title');
        var boostBadge = boostOpt.querySelector('.add-project-chooser-option-tag');
        var boostDesc = boostOpt.querySelector('.add-project-chooser-option-desc');
        if (boostTitle) boostTitle.textContent = getProjectUiText('promo_card_title', 'Буст в Google Play');
        if (boostBadge) boostBadge.textContent = getProjectUiText('promo_card_badge', 'Скоро');
        if (boostDesc) boostDesc.textContent = getProjectUiText('promo_card_desc', 'Привлекайте пользователей, улучшайте позиции и развивайте опубликованный проект.');
    }
}

function ensureAddProjectChooser() {
    var overlay = document.getElementById('add-project-chooser-overlay');
    if (overlay && overlay.getAttribute('data-chooser') === 'v5') {
        refreshAddProjectChooserTexts(overlay);
        return overlay;
    }
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);

    var mutualIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="17 1 21 5 17 9"></polyline>' +
            '<path d="M3 11V9a4 4 0 0 1 4-4h14"></path>' +
            '<polyline points="7 23 3 19 7 15"></polyline>' +
            '<path d="M21 13v2a4 4 0 0 1-4 4H3"></path>' +
        '</svg>';
    var privateIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>' +
            '<polyline points="9 12 11 14 15 10"></polyline>' +
        '</svg>';
    var trendingIcon =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>' +
            '<polyline points="17 6 23 6 23 12"></polyline>' +
        '</svg>';
    var chevron =
        '<svg class="add-project-chooser-option-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<polyline points="9 18 15 12 9 6"></polyline>' +
        '</svg>';

    function optionHtml(variant, icon, titleKey, tagKey, descKey) {
        return '<button type="button" class="add-project-chooser-option add-project-chooser-option--' + variant + '">' +
            '<span class="add-project-chooser-option-icon">' + icon + '</span>' +
            '<span class="add-project-chooser-option-body">' +
                '<span class="add-project-chooser-option-head">' +
                    '<span class="add-project-chooser-option-title" data-i18n="' + titleKey + '"></span>' +
                    '<span class="add-project-chooser-option-tag" data-i18n="' + tagKey + '"></span>' +
                '</span>' +
                '<span class="add-project-chooser-option-desc" data-i18n="' + descKey + '"></span>' +
            '</span>' +
            chevron +
        '</button>';
    }

    var div = document.createElement('div');
    div.innerHTML =
        '<div id="add-project-chooser-overlay" class="add-project-chooser-overlay" style="display:none;" data-chooser="v5" role="dialog" aria-modal="true">' +
            '<div class="add-project-chooser-card">' +
                '<button type="button" class="add-project-chooser-close" data-i18n-aria-label="addProjectChooserClose" aria-label="">×</button>' +
                '<h3 class="add-project-chooser-title" data-i18n="addProjectChooserTitle"></h3>' +
                '<div class="add-project-chooser-content">' +
                    '<div class="add-project-chooser-section add-project-chooser-section--closed">' +
                        '<div class="add-project-chooser-section-title" data-i18n="section_closed_testing">ЗАКРЫТОЕ ТЕСТИРОВАНИЕ (14 ДНЕЙ)</div>' +
                        '<div class="add-project-chooser-options">' +
                            optionHtml(
                                'mutual', mutualIcon,
                                'addProjectChooserMutualTitle',
                                'addProjectChooserMutualTag',
                                'addProjectChooserMutualDesc'
                            ) +
                            optionHtml(
                                'private', privateIcon,
                                'addProjectChooserPrivateTitle',
                                'addProjectChooserPrivateTag',
                                'addProjectChooserPrivateDesc'
                            ) +
                        '</div>' +
                    '</div>' +
                    '<div class="add-project-chooser-section add-project-chooser-section--growth">' +
                        '<div class="add-project-chooser-section-title" data-i18n="section_growth">МАСШТАБИРОВАНИЕ И РОСТ</div>' +
                        '<div class="add-project-chooser-options">' +
                            optionHtml(
                                'boost', trendingIcon,
                                'promo_card_title',
                                'promo_card_badge',
                                'promo_card_desc'
                            ) +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(div.firstElementChild);
    overlay = document.getElementById('add-project-chooser-overlay');
    if (!overlay) return null;

    refreshAddProjectChooserTexts(overlay);

    overlay.addEventListener('click', function (event) {
        if (event.target === overlay) closeAddProjectChooser();
    });
    overlay.querySelector('.add-project-chooser-close').addEventListener('click', closeAddProjectChooser);
    overlay.querySelector('.add-project-chooser-option--mutual').addEventListener('click', function () {
        closeAddProjectChooser(function () { openModal(); });
    });
    overlay.querySelector('.add-project-chooser-option--private').addEventListener('click', function () {
        closeAddProjectChooser(function () {
            if (typeof window.showGuaranteedTestOfferModal === 'function') {
                window.showGuaranteedTestOfferModal();
            }
        });
    });
    var boostBtn = overlay.querySelector('.add-project-chooser-option--boost');
    if (boostBtn) {
        boostBtn.addEventListener('click', function () {
            if (typeof tg !== 'undefined' && tg && tg.HapticFeedback) {
                tg.HapticFeedback.impactOccurred('light');
            }
            if (typeof showToast === 'function') {
                showToast(getProjectUiText('promo_card_toast', 'App promotion and growth features are under development and will be available soon!'));
            }
        });
    }
    return overlay;
}

function openAddProjectChooser() {
    var overlay = ensureAddProjectChooser();
    if (!overlay) return;
    refreshAddProjectChooserTexts(overlay);
    overlay.style.display = 'flex';
    overlay.classList.remove('is-closing');
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
}
window.openAddProjectChooser = openAddProjectChooser;

function closeAddProjectChooser(afterClose) {
    var overlay = document.getElementById('add-project-chooser-overlay');
    if (!overlay || overlay.style.display === 'none') {
        if (typeof afterClose === 'function') afterClose();
        return;
    }
    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');
    setTimeout(function () {
        if (!overlay.classList.contains('is-closing')) return;
        overlay.style.display = 'none';
        overlay.classList.remove('is-closing');
        if (typeof afterClose === 'function') afterClose();
    }, 180);
}
window.closeAddProjectChooser = closeAddProjectChooser;

function closeModal(event) {
    if (event && event.target !== document.getElementById('add-modal')) return;
    closeIconPickerSheet();
    document.getElementById('add-modal').classList.remove('active');
    document.body.classList.remove('wizard-open');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();

    setTimeout(() => {
        document.getElementById('app-name').value = '';
        document.getElementById('app-package').value = '';
        document.getElementById('app-group').value = '';
        document.getElementById('app-icon').value = '';
        document.getElementById('app-instructions').value = '';
        document.getElementById('package-error').innerHTML = '';
        document.getElementById('package-error').style.display = 'none';
        if (typeof _clearPackageConflictState === 'function') _clearPackageConflictState();
        if (typeof closePackageConflictModal === 'function') {
            var conflictModal = document.getElementById('package-conflict-modal');
            if (conflictModal) conflictModal.classList.remove('active');
        }
        window.addWizardState.focusStep = 1;
        window.addWizardState.unlockedStep = 1;
        _revokeAppIconBlobUrl();
        resetAddFlow();
        switchGroupTab('standard');
        resetProjectForms();
        syncAppIconPickerUi();
        onAddAppNameInput();
        _syncAddEmailTestersBoxVisibility();
        evaluateAddStages();
    }, 300);
}

function resetAddFlow() {
    _clearAddSetupChecklistTimer();
    _revokeAppIconBlobUrl();
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
    const helpAccordion = document.getElementById('play-link-help-accordion');
    const helpBtn = document.getElementById('play-link-help-btn');
    if (helpAccordion) helpAccordion.style.display = 'none';
    if (helpBtn) { helpBtn.setAttribute('aria-expanded', 'false'); helpBtn.classList.remove('is-open'); }
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
    const emailBtn = document.getElementById('seg-email');

    if (tab === 'email') {
        openEmailTestingModal();
        return;
    }

    if (window.addProjectFlow) window.addProjectFlow.emailMode = false;
    if (stdBtn) stdBtn.classList.toggle('active', tab === 'standard');
    if (custBtn) custBtn.classList.toggle('active', tab === 'custom');
    if (emailBtn) emailBtn.classList.remove('active');
    renderGroupSection();
    evaluateAddStages();
}

function renderGroupSection() {
    const emailMode = !!(window.addProjectFlow && window.addProjectFlow.emailMode);
    const isStandard = document.getElementById('seg-standard') && document.getElementById('seg-standard').classList.contains('active');
    const isCustom = document.getElementById('seg-custom') && document.getElementById('seg-custom').classList.contains('active');
    const segControl = document.getElementById('group-seg-control');
    const stdBlock = document.getElementById('group-standard-block');
    const custBlock = document.getElementById('group-custom-block');
    const emailBlock = document.getElementById('group-email-block');
    const banner = document.getElementById('email-mode-banner');
    const toggleBtn = document.getElementById('use-email-testing-btn');
    const stdBtn = document.getElementById('seg-standard');
    const custBtn = document.getElementById('seg-custom');
    const emailBtn = document.getElementById('seg-email');

    if (toggleBtn) toggleBtn.style.display = 'none';

    if (emailMode) {
        if (segControl) segControl.style.display = '';
        if (stdBtn) stdBtn.classList.remove('active');
        if (custBtn) custBtn.classList.remove('active');
        if (emailBtn) emailBtn.classList.add('active');
        if (stdBlock) stdBlock.style.display = 'none';
        if (custBlock) custBlock.style.display = 'none';
        if (emailBlock) emailBlock.style.display = '';
        if (banner) banner.style.display = 'none';
        return;
    }

    if (segControl) segControl.style.display = '';
    if (emailBtn) emailBtn.classList.remove('active');
    if (banner) banner.style.display = 'none';
    if (emailBlock) emailBlock.style.display = 'none';
    if (stdBlock) stdBlock.style.display = isStandard ? '' : 'none';
    if (custBlock) custBlock.style.display = isCustom ? '' : 'none';
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
    _updateAddPlayLinkValidationUi();
    if (window.addWizardState && window.addWizardState.unlockedStep > 1) {
        window.addWizardState.unlockedStep = 1;
        window.addWizardState.focusStep = 1;
    }
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

    const unlocked = _getWizardUnlockedStep();
    stage2.classList.toggle('active', unlocked >= 2);
    stage3.classList.toggle('active', unlocked >= 3);

    stage2.classList.toggle('wizard-section--locked', unlocked < 2);
    stage3.classList.toggle('wizard-section--locked', unlocked < 3);

    syncAppIconPickerUi();
    _syncAddEmailTestersBoxVisibility();
    updateWizardProgress();
    updateAddSaveButtonState();
}

function updateAddSaveButtonState() {
    const saveBtn = document.getElementById('t-save');
    const continue1 = document.getElementById('add-continue-1');
    const continue2 = document.getElementById('add-continue-2');
    const unlocked = _getWizardUnlockedStep();
    const ready = unlocked >= 3 && isAddPlayLinkValid() && isAddStage2Complete() && isAddStage3Valid();

    if (saveBtn) saveBtn.classList.toggle('is-locked', !ready);
    if (continue1) continue1.classList.toggle('is-locked', !isAddPlayLinkValid());
    if (continue2) continue2.classList.toggle('is-locked', !isAddStage2Complete());
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

function openEmailTestingModal(target) {
    window._emailModeTarget = target || 'add';
    document.getElementById('email-testing-modal').classList.add('active');
}

function closeEmailTestingModal(event) {
    if (event && event.target !== document.getElementById('email-testing-modal')) return;
    document.getElementById('email-testing-modal').classList.remove('active');
}

function confirmEmailTesting() {
    document.getElementById('email-testing-modal').classList.remove('active');
    if (window._emailModeTarget === 'edit') {
        setEditAccessTab('email_list');
    } else {
        if (window.addProjectFlow) window.addProjectFlow.emailMode = true;
        const stdBtn = document.getElementById('seg-standard');
        const custBtn = document.getElementById('seg-custom');
        const emailBtn = document.getElementById('seg-email');
        if (stdBtn) stdBtn.classList.remove('active');
        if (custBtn) custBtn.classList.remove('active');
        if (emailBtn) emailBtn.classList.add('active');
        renderGroupSection();
        evaluateAddStages();
    }
}

function exitEmailTestingMode() {
    if (window.addProjectFlow) window.addProjectFlow.emailMode = false;
    switchGroupTab('standard');
}

function onEditAcceptsEmailTestersChange() {
    const acceptsBox = document.getElementById('edit-app-accepts-email-testers');
    const emailBox = document.getElementById('edit-add-email-testers-box');
    if (emailBox) {
        emailBox.classList.toggle('is-expanded', !!(acceptsBox && acceptsBox.checked));
    }
    if (acceptsBox && acceptsBox.checked) {
        const testerEmail = document.getElementById('edit-app-tester-email');
        if (testerEmail && !testerEmail.value) {
            const prefill = (typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : '') || (window.App && window.App.userEmail) || '';
            if (prefill) testerEmail.value = prefill;
        }
    }
    _updateEditTesterEmailValidIcon();
}

function _updateEditTesterEmailValidIcon() {
    const input = document.getElementById('edit-app-tester-email');
    const icon = document.getElementById('edit-tester-email-valid-icon');
    if (!input || !icon) return;
    if (typeof sanitizeSingleEmailInputValue === 'function') {
        input.value = sanitizeSingleEmailInputValue(input.value);
    }
    const value = (input.value || '').trim();
    const isValid = isValidEmail(value);
    icon.classList.toggle('is-visible', isValid);
}

function onEditTesterEmailInput() {
    _updateEditTesterEmailValidIcon();
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
var _editModalRestartMode = false;

function isEditModalRestartMode() {
    return !!_editModalRestartMode;
}

function _mapArchivedProjectForEdit(archived) {
    if (!archived) return null;
    return {
        id: Number(archived.app_id || 0),
        name: archived.name || '',
        package: archived.package_name || '',
        instructions: archived.instructions || '',
        icon_url: archived.icon_url || '',
        google_group_url: archived.google_group_url || '',
        mode: archived.mode || 'mutual',
        target_lang: archived.target_lang || 'ALL',
        limit_mutual: archived.limit_mutual || 12,
        limit_bounty: archived.limit_bounty || 12,
        bounty_per_tester: archived.bounty_per_tester || 100,
        request_reviews: archived.request_reviews !== false,
        test_mode: archived.test_mode || 'google_group',
        accepts_email_testers: !!archived.accepts_email_testers,
        is_setup_completed: true,
    };
}

function _applyEditModalRestartChrome(isRestart) {
    var titleEl = document.getElementById('t-editProjectTitle');
    var hintEl = document.getElementById('t-editModeHint');
    var saveBtn = document.getElementById('t-editSave');
    var transferBtn = document.querySelector('#edit-project-modal .transfer-trigger-btn');
    var createdAtEl = document.getElementById('edit-created-at');

    if (titleEl) {
        titleEl.textContent = isRestart
            ? window.t('archiveRestartSettingsTitle', {}, lang)
            : window.t('editProjectTitle', {}, lang);
    }
    if (hintEl) {
        hintEl.textContent = isRestart
            ? window.t('archiveRestartModeHint', {}, lang)
            : window.t('editModeHint', {}, lang);
    }
    if (saveBtn) {
        saveBtn.textContent = isRestart
            ? window.t('archiveRestartConfirmBtn', {}, lang)
            : window.t('save', {}, lang);
    }
    if (transferBtn) {
        transferBtn.style.display = isRestart ? 'none' : '';
    }
    if (createdAtEl && isRestart) {
        createdAtEl.textContent = window.t('archiveRestartSettingsIntro', {}, lang);
        createdAtEl.style.opacity = '1';
    }
}

function openRestartArchivedModal(appId) {
    var archived = (archivedProjects || []).find(function(item) {
        return Number(item.app_id) === Number(appId);
    });
    if (!archived) {
        showToast(window.t('app_not_found', {}, lang));
        return;
    }
    if (archived.is_blocked || archived.blocked_at || archived.archive_reason === 'policy_blocked') {
        showToast(window.t('blockedAppActionForbidden', {}, lang));
        return;
    }
    var project = _mapArchivedProjectForEdit(archived);
    if (!project || !project.id) return;
    openEditModal(project.id, { restartMode: true, project: project });
}

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

function openEditModal(projectId, options) {
    options = options || {};
    const project = options.project || myProjects.find((item) => item.id === projectId);
    if (!project) return;
    _editModalRestartMode = !!options.restartMode;
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

    _syncEditEmailTestersBoxVisibility();
    onEditAcceptsEmailTestersChange();

    syncEditAppIconPreview();
    updateEditNameCounter();
    setProjectMode('edit', project.mode || 'mutual');
    setProjectTargetLang('edit', project.target_lang || 'ALL');
    renderEditAccessSetup();
    updateProjectPricing('edit');
    if (!_editModalRestartMode) {
        renderEditCreatedAtMeta();
    }
    _applyEditModalRestartChrome(_editModalRestartMode);
    _editSaveAndCloseRequested = false;
    markEditModalSavedState();
    document.getElementById('edit-project-modal').classList.add('active');

    if (options && options.focusSetup) {
        setTimeout(function() {
            var groupLabel = document.getElementById('t-editGroup');
            var viewCard = document.getElementById('edit-access-view-card');
            if (groupLabel) groupLabel.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (viewCard) {
                viewCard.classList.add('highlight-pulse');
                setTimeout(function() {
                    viewCard.classList.remove('highlight-pulse');
                }, 4000);
            }
        }, 300);
    }
    if (options && options.focusRecruitment) {
        setTimeout(function() {
            var recruitCard = document.getElementById('edit-recruitment-card');
            if (!recruitCard) return;
            recruitCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            recruitCard.classList.add('highlight-pulse');
            setTimeout(function() {
                recruitCard.classList.remove('highlight-pulse');
            }, 4000);
        }, 300);
    }
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
        _editModalRestartMode = false;
        _applyEditModalRestartChrome(false);
        if (window.editProjectFlow) window.editProjectFlow.emailMode = false;
        renderEditAccessSetup();
        resetProjectForms();
        renderEditCreatedAtMeta();
    }, 300);
}

function syncEditAppIconPreview() {
    var iconInput = document.getElementById('edit-icon');
    var preview = document.getElementById('edit-icon-preview');
    var picker = document.getElementById('edit-icon-picker');
    if (!iconInput || !preview || !picker) return;
    var url = (iconInput.value || '').trim();
    if (url) {
        if (typeof resolveIconUrl === 'function') url = resolveIconUrl(url);
        preview.src = url;
        preview.style.display = 'block';
        picker.classList.add('has-icon');
    } else {
        preview.removeAttribute('src');
        preview.style.display = 'none';
        picker.classList.remove('has-icon');
    }
}

function onEditIconPreviewError() {
    var preview = document.getElementById('edit-icon-preview');
    if (preview) {
        preview.removeAttribute('src');
        preview.style.display = 'none';
    }
    var picker = document.getElementById('edit-icon-picker');
    if (picker) picker.classList.remove('has-icon');
}

function updateEditNameCounter() {
    var nameInput = document.getElementById('edit-name');
    var counter = document.getElementById('edit-name-counter');
    if (!nameInput || !counter) return;
    counter.textContent = (nameInput.value || '').length + '/30';
}

function copyEditPackageName() {
    var pkgInput = document.getElementById('edit-package');
    if (!pkgInput) return;
    var val = (pkgInput.value || '').trim();
    if (!val) return;
    try {
        navigator.clipboard.writeText(val).then(function() {
            if (typeof window.showToast === 'function') {
                window.showToast(window.t('packageCopiedToast', {}, lang) || 'Пакет скопирован');
            }
        }).catch(function() {});
    } catch (e) {}
}

window.syncEditAppIconPreview = syncEditAppIconPreview;
window.onEditIconPreviewError = onEditIconPreviewError;
window.updateEditNameCounter = updateEditNameCounter;
window.copyEditPackageName = copyEditPackageName;

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
        var changeBtn = document.getElementById('edit-access-change-btn');
        if (changeBtn && typeof projectToEdit !== 'undefined' && projectToEdit) {
            var project = myProjects.find(function(item) { return item.id === projectToEdit; });
            var isSetupCompleted = project ? project.is_setup_completed !== false : true;
            if (!isSetupCompleted) {
                changeBtn.textContent = window.t ? window.t('btnFinishSetup', {}, lang) : 'Завершить настройку';
                changeBtn.classList.remove('btn-secondary');
                changeBtn.classList.add('btn-primary');
            } else {
                changeBtn.textContent = window.t ? window.t('editAccessChangeBtn', {}, lang) : 'Изменить';
                changeBtn.classList.remove('btn-primary');
                changeBtn.classList.add('btn-secondary');
            }
        }
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
    openEmailTestingModal('edit');
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
var _ownerDetailProfileCache = {};
var _ownerDetailProfileInflight = {};
var OWNER_DETAIL_PROFILE_TTL_MS = 5 * 60 * 1000;

function getOwnerDetailProfileCached(ownerId) {
    const key = String(Number(ownerId || 0) || '');
    if (!key || key === '0') return null;
    const entry = _ownerDetailProfileCache[key];
    if (entry && entry.profile && typeof entry.profile === 'object') {
        return entry.profile;
    }
    if (typeof _dossierProfilesCache !== 'undefined' && _dossierProfilesCache[key]) {
        return _dossierProfilesCache[key];
    }
    return null;
}

function isOwnerDetailProfileFresh(ownerId) {
    const key = String(Number(ownerId || 0) || '');
    const entry = _ownerDetailProfileCache[key];
    if (!entry || !entry.profile) return false;
    return (Date.now() - Number(entry.fetchedAt || 0)) < OWNER_DETAIL_PROFILE_TTL_MS;
}

function setOwnerDetailProfileCache(ownerId, profile) {
    const key = String(Number(ownerId || 0) || '');
    if (!key || key === '0' || !profile || typeof profile !== 'object') return;
    _ownerDetailProfileCache[key] = { profile: profile, fetchedAt: Date.now() };
    if (typeof _dossierProfilesCache !== 'undefined') {
        _dossierProfilesCache[key] = Object.assign({}, _dossierProfilesCache[key] || {}, profile);
    }
}

function applyOwnerProfileIdentityToTest(test, profileData) {
    if (!test || !profileData) return;
    if (profileData.full_name) test.owner_full_name = profileData.full_name;
    if (profileData.username) test.owner_username = profileData.username;
    if (profileData.avatar_url) test.owner_avatar_url = profileData.avatar_url;
    if (typeof profileData.karma !== 'undefined') test.owner_karma = profileData.karma;
    if (typeof profileData.avg_handle_hours !== 'undefined') {
        test.owner_avg_handle_hours = profileData.avg_handle_hours;
    }
}

function applyOwnerProfileToOpenDetailsModal(profileData, test, ownerId) {
    if (!profileData || !test) return;
    applyOwnerProfileIdentityToTest(test, profileData);

    const currentModal = document.getElementById('project-details-modal');
    if (!currentModal || !currentModal.classList.contains('active') || String(currentModal.dataset.appId) !== String(test.id)) {
        return;
    }

    const updatedDispName = test.owner_full_name || (test.owner_username ? '@' + String(test.owner_username).replace(/^@+/, '') : '');
    const updatedMainName = updatedDispName || window.t('idLabel', { id: ownerId }, lang);
    const updatedSubName = (test.owner_full_name && test.owner_username) ? '@' + String(test.owner_username).replace(/^@+/, '') : '';

    const avatarEl = document.getElementById('detail-owner-avatar');
    if (avatarEl) {
        const updatedLetter = updatedMainName.replace(/^@+/, '').charAt(0).toUpperCase();
        let newInner = '';
        if (test.owner_avatar_url) {
            newInner += '<img src="' + window.escapeHTML(test.owner_avatar_url) + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" style="display:block; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">';
        }
        newInner += '<span style="' + (test.owner_avatar_url ? 'display:none;' : 'display:flex; justify-content:center; align-items:center; width:100%; height:100%; color:#fff; font-weight:700;') + '">' + window.escapeHTML(updatedLetter) + '</span>';
        avatarEl.innerHTML = newInner;
    }

    const nameEl = document.getElementById('detail-owner-name');
    if (nameEl) nameEl.textContent = updatedMainName;

    const rowTextContainer = nameEl ? nameEl.parentElement : null;
    if (rowTextContainer) {
        let usernameEl = document.getElementById('detail-owner-username');
        if (updatedSubName) {
            if (!usernameEl) {
                usernameEl = document.createElement('div');
                usernameEl.id = 'detail-owner-username';
                usernameEl.className = 'detail-owner-username notranslate';
                usernameEl.style.fontSize = '13px';
                usernameEl.style.color = 'var(--tg-theme-link-color, var(--link-color, #3390ec))';
                usernameEl.style.fontWeight = '500';
                rowTextContainer.insertBefore(usernameEl, document.getElementById('detail-owner-status'));
            }
            usernameEl.textContent = updatedSubName;
        } else if (usernameEl) {
            usernameEl.remove();
        }
    }

    updateOwnerDetailMetricsFromProfile(profileData, test);
}

function fetchOwnerDetailProfile(ownerId, options) {
    options = options || {};
    const force = !!options.force;
    const key = String(Number(ownerId || 0) || '');
    if (!key || key === '0') return Promise.resolve(null);

    if (!force && isOwnerDetailProfileFresh(ownerId)) {
        return Promise.resolve(getOwnerDetailProfileCached(ownerId));
    }
    if (_ownerDetailProfileInflight[key]) {
        return _ownerDetailProfileInflight[key];
    }

    _ownerDetailProfileInflight[key] = fetch(API_BASE + '/users/' + ownerId + '/profile')
        .then(function(resp) {
            if (!resp.ok) throw new Error('profile_http_' + resp.status);
            return resp.json();
        })
        .then(function(profileData) {
            setOwnerDetailProfileCache(ownerId, profileData);
            return profileData;
        })
        .catch(function(err) {
            console.error('Failed to fetch developer profile in details modal:', err);
            return getOwnerDetailProfileCached(ownerId);
        })
        .finally(function() {
            delete _ownerDetailProfileInflight[key];
        });

    return _ownerDetailProfileInflight[key];
}

function _ownerDetailReliabilityMetric(profile) {
    const state = (typeof getDossierReliabilityState === 'function')
        ? getDossierReliabilityState(profile || {})
        : { isNewbie: true, reliabilityPct: 0, reliabilityText: window.t('dossierNewbie', {}, lang) || '—' };
    const status = String((profile && profile.reliability_status) || (state.isNewbie ? 'newbie' : '') || '').toLowerCase();
    let metricClass = 'metric-card-neutral';
    if (!state.isNewbie) {
        if (status === 'bad' || state.reliabilityPct < 65) metricClass = 'metric-card-danger';
        else if (status === 'minimal' || state.reliabilityPct < 80) metricClass = 'metric-card-warning';
        else metricClass = 'metric-card-success';
    }
    const value = state.isNewbie
        ? (window.t('reliabilityDashStatus_newbie', {}, lang) || state.reliabilityText || '—')
        : (String(state.reliabilityPct) + ' %');
    const statusText = state.isNewbie ? '' : (window.t('reliabilityDashStatus_' + status, {}, lang) || state.reliabilityText || '');
    return { value: value, statusText: statusText, metricClass: metricClass };
}

function _ownerDetailSprintValue(profile) {
    const rankRaw = profile && profile.season_rank;
    const rank = rankRaw != null ? Number(rankRaw) : null;
    if (rank && rank > 0) {
        return window.t('metricSprintPosition', { rank: Math.round(rank) }, lang) || ('#' + Math.round(rank));
    }
    return '—';
}

function _ownerDetailSlaCell(hoursRaw) {
    const sla = (typeof window.formatOwnerSlaDisplay === 'function')
        ? window.formatOwnerSlaDisplay(hoursRaw)
        : { label: '—', tone: '', hasValue: false };
    const icon = (typeof window.getMaterialAcuteIconSvg === 'function')
        ? window.getMaterialAcuteIconSvg('detail-owner-sla-icon')
        : '<span aria-hidden="true">⏱</span>';
    const toneClass = sla.tone === 'slow'
        ? ' detail-owner-sla--slow'
        : (sla.tone === 'fast' ? ' detail-owner-sla--fast' : '');
    const toast = window.t('feedbackSlaChipToast', {}, lang)
        || (lang === 'ru' ? 'Скорость обработки отзывов/фидбэков' : 'Review/feedback processing speed');
    return {
        html: '<button type="button" class="metric-card metric-card-clickable metric-card-neutral detail-owner-sla-card' + toneClass + '" onclick="event.stopPropagation(); showToast(\'' +
            String(toast).replace(/'/g, "\\'") + '\')">' +
            '<div class="metric-card-top"><span class="metric-label">' + window.escapeHTML(window.t('detailOwnerProcessingSpeed', {}, lang) || (lang === 'ru' ? 'Скорость обработки' : 'Processing speed')) + '</span></div>' +
            '<div class="metric-value detail-owner-sla-value">' + icon + '<span>' + window.escapeHTML(sla.label) + '</span></div>' +
        '</button>',
    };
}

function buildOwnerDetailMetricsHtml(profile, test) {
    profile = profile || {};
    test = test || {};
    const reliability = _ownerDetailReliabilityMetric(profile);
    const karmaRaw = typeof profile.karma !== 'undefined' ? profile.karma
        : (typeof test.owner_karma !== 'undefined' ? test.owner_karma : test.ownerKarma);
    const karma = Number.isFinite(Number(karmaRaw)) ? Number(karmaRaw) : 0;
    const karmaText = (typeof formatUiAmount === 'function') ? formatUiAmount(karma, 1) : String(karma);
    const sprintValue = _ownerDetailSprintValue(profile);
    const hoursRaw = (profile.avg_handle_hours != null && profile.avg_handle_hours !== '')
        ? profile.avg_handle_hours
        : (test.owner_avg_handle_hours != null ? test.owner_avg_handle_hours : test.avg_handle_hours);
    const slaCell = _ownerDetailSlaCell(hoursRaw);

    const bugs = Number(profile.bugs_count || 0);
    const ideas = Number(profile.ideas_count || 0);
    const reviews = Number(profile.play_reviews_count || 0);
    const completedTests = profile.completed_tests;
    const completedLabel = (completedTests == null || completedTests === '')
        ? '—'
        : String(Number(completedTests) || 0);
    const activeTesters = Number(test.active_testers_count || 0);

    const statusTextHtml = reliability.statusText
        ? '<span class="metric-value-status" style="font-size: 11px; opacity: 0.85; font-weight: normal; margin-left: 4px;">(' + window.escapeHTML(reliability.statusText) + ')</span>'
        : '';

    return '' +
        '<div class="detail-owner-meta-line" id="detail-owner-meta-line">' +
            window.escapeHTML(window.t('detailOwnerTestsLabel', { count: completedLabel }, lang) || ((lang === 'ru' ? 'Тестирует: ' : 'Tests: ') + completedLabel)) +
            ' · ' +
            window.escapeHTML(window.t('detail_testers_label', { count: activeTesters }, lang)) +
        '</div>' +
        '<div class="metrics-grid detail-owner-metrics-grid" id="detail-owner-metrics-grid">' +
            '<div class="metric-card ' + reliability.metricClass + '" id="detail-owner-metric-reliability">' +
                '<div class="metric-card-top"><span class="metric-label">' + window.escapeHTML(window.t('metricReliabilityV2', {}, lang) || window.t('metricReliability', {}, lang)) + '</span></div>' +
                '<div class="metric-value" id="detail-owner-reliability-value">' + window.escapeHTML(reliability.value) + statusTextHtml + '</div>' +
            '</div>' +
            '<div class="metric-card metric-card-gold" id="detail-owner-metric-karma">' +
                '<div class="metric-card-top"><span class="metric-label">' + window.escapeHTML(window.t('metricKarma', {}, lang)) + '</span></div>' +
                '<div class="metric-value" id="detail-owner-karma-value">' + window.escapeHTML(karmaText) + ' <span class="metric-value-mark">☯️</span></div>' +
            '</div>' +
            '<div class="metric-card metric-card-neutral metric-card-sprint" id="detail-owner-metric-sprint">' +
                '<div class="metric-card-top"><span class="metric-label">' + window.escapeHTML(window.t('metricSprintPositionLabel', {}, lang) || (lang === 'ru' ? 'Место в спринте' : 'Sprint place')) + '</span></div>' +
                '<div class="metric-value metric-value--sprint" id="detail-owner-sprint-value">' + window.escapeHTML(sprintValue) + '</div>' +
            '</div>' +
            slaCell.html +
        '</div>' +
        '<div class="detail-owner-contrib" id="detail-owner-contrib">' +
            '<div class="detail-owner-contrib-title">' + window.escapeHTML(window.t('detailOwnerCommunityTitle', {}, lang) || (lang === 'ru' ? 'Вклад в сообщество за все время' : 'Community contribution (all time)')) + '</div>' +
            '<div class="detail-owner-contrib-row">' +
                '<span class="detail-owner-contrib-item" id="detail-owner-bugs">' + window.escapeHTML(window.t('detailOwnerBugsShort', { count: bugs }, lang) || ('🐞 ' + (lang === 'ru' ? 'Баги' : 'Bugs') + ' ' + bugs)) + '</span>' +
                '<span class="detail-owner-contrib-item" id="detail-owner-ideas">' + window.escapeHTML(window.t('detailOwnerIdeasShort', { count: ideas }, lang) || ('💡 ' + (lang === 'ru' ? 'Идей' : 'Ideas') + ' ' + ideas)) + '</span>' +
                '<span class="detail-owner-contrib-item" id="detail-owner-reviews">' + window.escapeHTML(window.t('detailOwnerReviewsShort', { count: reviews }, lang) || ('⭐️ ' + (lang === 'ru' ? 'Отзывы' : 'Reviews') + ' ' + reviews)) + '</span>' +
            '</div>' +
        '</div>';
}

function updateOwnerDetailMetricsFromProfile(profile, test) {
    profile = profile || {};
    test = test || {};
    const grid = document.getElementById('detail-owner-metrics-grid');
    const contrib = document.getElementById('detail-owner-contrib');
    const meta = document.getElementById('detail-owner-meta-line');
    if (!grid && !contrib && !meta) return;

    const reliability = _ownerDetailReliabilityMetric(profile);
    const reliabilityCard = document.getElementById('detail-owner-metric-reliability');
    const reliabilityValueEl = document.getElementById('detail-owner-reliability-value');
    if (reliabilityCard) {
        reliabilityCard.className = 'metric-card ' + reliability.metricClass;
    }
    if (reliabilityValueEl) {
        const statusTextHtml = reliability.statusText
            ? ' <span class="metric-value-status" style="font-size: 11px; opacity: 0.85; font-weight: normal; margin-left: 4px;">(' + window.escapeHTML(reliability.statusText) + ')</span>'
            : '';
        reliabilityValueEl.innerHTML = window.escapeHTML(reliability.value) + statusTextHtml;
    }

    const karmaRaw = typeof profile.karma !== 'undefined' ? profile.karma : test.owner_karma;
    const karma = Number.isFinite(Number(karmaRaw)) ? Number(karmaRaw) : 0;
    const karmaEl = document.getElementById('detail-owner-karma-value');
    if (karmaEl) {
        const karmaText = (typeof formatUiAmount === 'function') ? formatUiAmount(karma, 1) : String(karma);
        karmaEl.innerHTML = window.escapeHTML(karmaText) + ' <span class="metric-value-mark">☯️</span>';
    }

    const sprintEl = document.getElementById('detail-owner-sprint-value');
    if (sprintEl) {
        sprintEl.textContent = _ownerDetailSprintValue(profile);
    }

    const hoursRaw = (profile.avg_handle_hours != null && profile.avg_handle_hours !== '')
        ? profile.avg_handle_hours
        : (test.owner_avg_handle_hours != null ? test.owner_avg_handle_hours : test.avg_handle_hours);
    const slaWrap = grid ? grid.querySelector('.detail-owner-sla-card') : null;
    if (slaWrap && grid) {
        const tmp = document.createElement('div');
        tmp.innerHTML = _ownerDetailSlaCell(hoursRaw).html;
        const next = tmp.firstElementChild;
        if (next) slaWrap.replaceWith(next);
    }

    const bugs = Number(profile.bugs_count || 0);
    const ideas = Number(profile.ideas_count || 0);
    const reviews = Number(profile.play_reviews_count || 0);
    const bugsEl = document.getElementById('detail-owner-bugs');
    const ideasEl = document.getElementById('detail-owner-ideas');
    const reviewsEl = document.getElementById('detail-owner-reviews');
    if (bugsEl) bugsEl.textContent = window.t('detailOwnerBugsShort', { count: bugs }, lang) || ('🐞 Баги ' + bugs);
    if (ideasEl) ideasEl.textContent = window.t('detailOwnerIdeasShort', { count: ideas }, lang) || ('💡 Идей ' + ideas);
    if (reviewsEl) reviewsEl.textContent = window.t('detailOwnerReviewsShort', { count: reviews }, lang) || ('⭐️ Отзывы ' + reviews);

    if (meta) {
        const completedLabel = String(Number(profile.completed_tests || 0) || 0);
        const activeTesters = Number(test.active_testers_count || 0);
        meta.textContent =
            (window.t('detailOwnerTestsLabel', { count: completedLabel }, lang) || ((lang === 'ru' ? 'Тестирует: ' : 'Tests: ') + completedLabel)) +
            ' · ' +
            (window.t('detail_testers_label', { count: activeTesters }, lang));
    }
}

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
    const ownerIdForProfile = Number(test.owner_id || 0);
    const cachedOwnerProfile = getOwnerDetailProfileCached(ownerIdForProfile) || null;
    if (cachedOwnerProfile) {
        applyOwnerProfileIdentityToTest(test, cachedOwnerProfile);
    }
    const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
    const ownerAvatarUrl = String(test.owner_avatar_url || '').trim();
    const nameForHash = test.owner_username || test.owner_full_name || '?';
    const avatarHue = ((Number(test.owner_id || 0) * 73 + 17) % 360);
    const letter = nameForHash.replace(/^@+/, '').charAt(0).toUpperCase();

    const ownerAvatarHtml = '<div id="detail-owner-avatar" class="avatar" style="background-color: hsl(' + avatarHue + ', 55%, 38%); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; border-radius: 50%; width: 52px; height: 52px; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; user-select: none;">' +
        (ownerAvatarUrl ? '<img src="' + window.escapeHTML(ownerAvatarUrl) + '" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" style="display:block; width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">' : '') +
        '<span style="' + (ownerAvatarUrl ? 'display:none;' : 'display:flex; justify-content:center; align-items:center; width:100%; height:100%; color:#fff; font-weight:700;') + '">' + window.escapeHTML(letter) + '</span>' +
    '</div>';

    const dispName = test.owner_full_name || (test.owner_username ? '@' + test.owner_username.replace(/^@+/, '') : '');
    const mainName = dispName || window.t('idLabel', { id: test.owner_id || 0 }, lang);
    const subName = (test.owner_full_name && test.owner_username) ? '@' + test.owner_username.replace(/^@+/, '') : '';
    const subNameHtml = subName
        ? '<div id="detail-owner-username" class="detail-owner-username notranslate" style="font-size: 13px; color: var(--tg-theme-link-color, var(--link-color, #3390ec)); font-weight: 500;">' + window.escapeHTML(subName) + '</div>'
        : '';
    const timelineMeta = getTestingTimelineMeta(test);
    const userTestingDay = timelineMeta.userTestingDay;
    const skips = Number(test.skips_count || 0);
    const totalCheckins = Number(test.checkins_count || 0);
    const daysSinceCreated = Number(test.days_since_publish || 0);
    const left = _isProjectSyncedSafe(test)
        ? Math.max(0, 14 - getProjectSyncStartDay(test))
        : Math.max(0, 14 - daysSinceCreated);
    const potential = totalCheckins + left;
    const ownerActivity = getOwnerActivityMeta(test.last_owner_activity);
    const ownerKarmaRaw = (cachedOwnerProfile && typeof cachedOwnerProfile.karma !== 'undefined')
        ? cachedOwnerProfile.karma
        : (test && typeof test.owner_karma !== 'undefined' ? test.owner_karma : test.ownerKarma);
    const ownerKarma = Number.isFinite(Number(ownerKarmaRaw)) ? Number(ownerKarmaRaw) : 0;
    const hasPlayReviewRequest = !!test.request_reviews;
    const rewardsSummary = (test && test.rewards_summary && typeof test.rewards_summary === 'object') ? test.rewards_summary : {};
    const playReviewStatus = typeof window.getPlayReviewStatus === 'function'
        ? window.getPlayReviewStatus(test)
        : String(test.play_review_status || (test.play_feedback_submitted ? 'pending' : 'none')).toLowerCase();
    const reviewRejected = playReviewStatus === 'rejected' || !!rewardsSummary.review_rejected;
    const reviewConfirmed = playReviewStatus === 'approved';
    const reviewPending = playReviewStatus === 'pending';
    const reviewPlatformKarma = Number(rewardsSummary.review_platform_karma || 0);
    const reviewOwnerBoostBust = Number(rewardsSummary.review_owner_boost_bust || 0);
    const reviewOwnerBoostKarma = Number(rewardsSummary.review_owner_boost_karma || 0);
    const hasGuestOrigin = hasGuestLinkRelationship(test);

    let currentGoogleDay = timelineMeta.currentGoogleDay;
    let projectDaysLeft = timelineMeta.projectDaysLeft;
    let expectedTotalDays = timelineMeta.expectedTotalDays;
    let overtimeDays = timelineMeta.overtimeDays;
    const progressData = buildGrantProgressSegments(test, userTestingDay, expectedTotalDays, { hideOvertimeRow: timelineMeta.isSynced });
    const isIssueBlocked = !!test.issue_reported_at && !test.issue_fixed_at;
    const showIssueActionInDetails = test.status !== 'new' && test.status !== 'done';

    const syncHtml = (() => {
        if (!timelineMeta.isSynced) return '';
        const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
        const poolAmount = Number(test.protection_bust_pool || 0);
        const finishDateText = window.escapeHTML(formatDdMmYyyy(timelineMeta.finishDate));
        
        const isPendingCompletion = String(test.app_status || test.status || '').toLowerCase() === 'pending_completion';
        const isKickedSoft = !!(test.is_kicked_soft || String(test.progress_status || '').toLowerCase() === 'kicked_by_owner');
        const createdTime = test.created_at ? new Date(test.created_at).getTime() : Date.now();
        const pendingStartedAt = test.pending_completion_started_at ? new Date(test.pending_completion_started_at).getTime() : null;
        const MAX_BUFFER_MS = 48 * 60 * 60 * 1000;

        // Active countdown only with a real pending_completion_started_at.
        // Never invent multi-day "remaining" from created_at + 14d.
        let remainingMs = 0;
        let bufferStart;
        let bufferEndTime;
        if (isPendingCompletion && pendingStartedAt && Number.isFinite(pendingStartedAt)) {
            bufferStart = new Date(pendingStartedAt);
            bufferEndTime = pendingStartedAt + MAX_BUFFER_MS;
            remainingMs = Math.min(MAX_BUFFER_MS, Math.max(0, bufferEndTime - Date.now()));
        } else {
            bufferStart = new Date(createdTime + (14 * 24 * 60 * 60 * 1000) + (extraPaid * 24 * 60 * 60 * 1000));
            bufferEndTime = bufferStart.getTime() + MAX_BUFFER_MS;
            remainingMs = 0;
        }
        const remainingTotalMinutes = Math.floor(remainingMs / (60 * 1000));
        const remainingHours = Math.floor(remainingTotalMinutes / 60);
        const remainingMinutes = remainingTotalMinutes % 60;
        
        const consumedMs = Math.max(0, Date.now() - bufferStart.getTime());
        const consumedHours = consumedMs / (60 * 60 * 1000);
        const bufferFillPercent = isPendingCompletion && pendingStartedAt
            ? Math.min(100, Math.max(0, (consumedHours / 48) * 100))
            : 0;

        const isInSafetyBuffer = !isKickedSoft && (
            isPendingCompletion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid)
        );

        // Helper formatters
        const formatBufferTimeWithDayOfWeek = (dateVal) => {
            if (!dateVal || Number.isNaN(dateVal.getTime())) return '';
            const hours = String(dateVal.getHours()).padStart(2, '0');
            const minutes = String(dateVal.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            const todayVal = parseLocalDateOnly(getLocalDate()) || new Date();
            const todayOnly = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate());
            const targetDateOnly = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
            const diffDays = Math.round((targetDateOnly.getTime() - todayOnly.getTime()) / (24 * 60 * 60 * 1000));
            
            if (diffDays === 0) {
                return lang === 'ru' ? `сегодня в ${timeStr}` : `today at ${timeStr}`;
            } else if (diffDays === 1) {
                return lang === 'ru' ? `завтра в ${timeStr}` : `tomorrow at ${timeStr}`;
            } else {
                const day = dateVal.getDate();
                const monthsRu = ['янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];
                const daysRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
                const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                
                if (lang === 'ru') {
                    return `${daysRu[dateVal.getDay()]}, ${day} ${monthsRu[dateVal.getMonth()]} в ${timeStr}`;
                } else {
                    return `${daysEn[dateVal.getDay()]}, ${day} ${monthsEn[dateVal.getMonth()]} at ${timeStr}`;
                }
            }
        };

        const formatArchiveDeadline = (dateVal) => {
            if (!dateVal || Number.isNaN(dateVal.getTime())) return '';
            const hours = String(dateVal.getHours()).padStart(2, '0');
            const minutes = String(dateVal.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;
            
            const day = dateVal.getDate();
            const monthsRu = ['янв.', 'фев.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сен.', 'окт.', 'ноя.', 'дек.'];
            const daysRu = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
            const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            
            const todayVal = parseLocalDateOnly(getLocalDate()) || new Date();
            const todayOnly = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate());
            const targetDateOnly = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
            const diffDays = Math.round((targetDateOnly.getTime() - todayOnly.getTime()) / (24 * 60 * 60 * 1000));
            
            let relativePrefix = '';
            if (diffDays === 0) {
                relativePrefix = lang === 'ru' ? 'сегодня' : 'today';
            } else if (diffDays === 1) {
                relativePrefix = lang === 'ru' ? 'завтра' : 'tomorrow';
            } else {
                relativePrefix = lang === 'ru' ? `через ${diffDays} дн.` : `in ${diffDays} days`;
            }
            
            if (lang === 'ru') {
                return `${relativePrefix} (${daysRu[dateVal.getDay()]}, ${day} ${monthsRu[dateVal.getMonth()]} в ${timeStr})`;
            } else {
                return `${relativePrefix} (${daysEn[dateVal.getDay()]}, ${day} ${monthsEn[dateVal.getMonth()]} at ${timeStr})`;
            }
        };

        const todayVal = parseLocalDateOnly(getLocalDate()) || new Date();
        const todayOnly = new Date(todayVal.getFullYear(), todayVal.getMonth(), todayVal.getDate());
        const bufferStartOnly = new Date(bufferStart.getFullYear(), bufferStart.getMonth(), bufferStart.getDate());
        const daysToBuffer = Math.max(0, Math.round((bufferStartOnly.getTime() - todayOnly.getTime()) / (24 * 60 * 60 * 1000)));

        const activationText = isInSafetyBuffer || daysToBuffer <= 0
            ? (lang === 'ru' ? 'Активирован' : 'Active')
            : formatBufferTimeWithDayOfWeek(bufferStart);

        const archiveDeadlineText = formatArchiveDeadline(new Date(bufferEndTime));

        // ── Unified project lifecycle: Testing → Extended Protection → Safety Buffer → Archive ──
        const hasProtection = extraPaid > 0;
        const lastPaidDay = 14 + extraPaid;

        let currentStage;
        if (isInSafetyBuffer) currentStage = 'buffer';
        else if (hasProtection && userTestingDay >= 15) currentStage = 'protection';
        else currentStage = 'testing';

        const stageOrder = hasProtection
            ? ['testing', 'protection', 'buffer', 'archive']
            : ['testing', 'buffer', 'archive'];
        const currentIndex = stageOrder.indexOf(currentStage);
        const stageState = (name) => {
            const idx = stageOrder.indexOf(name);
            if (idx < currentIndex) return 'done';
            if (idx === currentIndex) return 'active';
            return 'upcoming';
        };

        const stageMeta = {
            testing: { cls: 'stage-active', icon: '🧪', title: window.t('lifecycleTestingTitle', {}, lang) },
            protection: { cls: 'stage-protection', icon: '🛡', title: window.t('ppcTimelineExtra', {}, lang) },
            buffer: { cls: 'stage-buffer', icon: '⏳', title: window.t('ppcTimelinePending', {}, lang) },
            archive: { cls: 'stage-archive', icon: '🏁', title: window.t('ppcTimelineArchive', {}, lang) },
        };

        const hasLiveBufferCountdown = !!(isPendingCompletion && pendingStartedAt && Number.isFinite(pendingStartedAt));
        const bufferActiveStatus = hasLiveBufferCountdown
            ? ((remainingHours <= 0 && remainingMinutes <= 0)
                ? window.t('ppcBufferAwaitingArchiving', {}, lang)
                : (lang === 'ru' ? `${remainingHours}ч ${remainingMinutes}м` : `${remainingHours}h ${remainingMinutes}m`))
            : window.t('lifecycleBuffer48', {}, lang);

        const stageStatusText = (name) => {
            const st = stageState(name);
            if (name === 'testing') {
                return st === 'done'
                    ? window.t('lifecycleStatusDone', {}, lang)
                    : window.t('grantProgressText', { day: Math.min(userTestingDay, 14) }, lang);
            }
            if (name === 'protection') {
                if (st === 'done') return window.t('lifecycleStatusDone', {}, lang);
                if (st === 'active') return window.t('ppcDaysLeft', { count: Math.max(0, lastPaidDay - Math.max(14, userTestingDay)) }, lang);
                return window.t('lifecycleProtectionPaid', { count: extraPaid }, lang);
            }
            if (name === 'buffer') {
                if (st === 'done') return window.t('lifecycleStatusDone', {}, lang);
                if (st === 'active') return bufferActiveStatus;
                return window.t('lifecycleBuffer48', {}, lang);
            }
            return window.t('lifecycleArchiveAuto', {}, lang);
        };

        const bufferRemainingText = hasLiveBufferCountdown
            ? ((remainingHours <= 0 && remainingMinutes <= 0)
                ? window.t('ppcBufferAwaitingArchiving', {}, lang)
                : (lang === 'ru' ? `Осталось: ${remainingHours} ч. ${remainingMinutes} мин.` : `Remaining: ${remainingHours}h ${remainingMinutes}m`))
            : window.t('lifecycleBuffer48', {}, lang);
        const bufferProgressHtml = (isInSafetyBuffer && hasLiveBufferCountdown)
            ? '<div class="lifecycle-buffer-progress">' +
                '<div class="lifecycle-buffer-progress-head">' +
                    '<span>' + window.escapeHTML(lang === 'ru' ? 'Прогресс буфера' : 'Buffer progress') + '</span>' +
                    '<span class="lifecycle-buffer-progress-val">' + window.escapeHTML(bufferRemainingText) + '</span>' +
                '</div>' +
                '<div class="ppc-buffer-bar-container"><div class="ppc-buffer-bar-fill" style="width:' + bufferFillPercent + '%;"></div></div>' +
              '</div>'
            : '';
        const bufferDatesHtml =
            '<div class="lifecycle-meta-line">' + window.escapeHTML(lang === 'ru' ? `Активация: ${activationText}` : `Activation: ${activationText}`) + '</div>' +
            '<div class="lifecycle-meta-line">' + window.escapeHTML(lang === 'ru' ? `Завершение: ${archiveDeadlineText}` : `Completion: ${archiveDeadlineText}`) + '</div>';
        const bufferWarningHtml = '<div class="protection-warning-inset" style="margin-top:8px;">' +
            window.escapeHTML(lang === 'ru' ? '⚠️ Не удаляйте приложение! Держите его установленным для финализации.' : '⚠️ Do not uninstall the app! Keep it installed for finalization.') +
        '</div>';

        const protectionDayChips = (() => {
            let chips = '';
            for (let d = 15; d <= lastPaidDay; d++) {
                let s = 'upcoming';
                if (d < userTestingDay) s = 'done';
                else if (d === userTestingDay) s = 'current';
                chips += '<span class="lifecycle-day-chip ' + s + '">' + window.escapeHTML(window.t('lifecycleDayShort', { day: d }, lang)) + '</span>';
            }
            return '<div class="lifecycle-day-chips">' + chips + '</div>';
        })();

        const stageContentHtml = (name) => {
            if (name === 'testing') {
                return '<div class="grant-progress-container timeline-row-track is-primary lifecycle-testing-track">' + (progressData.baseSegmentsHtml || '') + '</div>';
            }
            if (name === 'protection') {
                return protectionDayChips +
                    '<div class="lifecycle-stage-desc">' + window.escapeHTML(window.t('lifecycleProtectionDesc', {}, lang)) + '</div>';
            }
            if (name === 'buffer') {
                let html = '<div class="lifecycle-stage-desc">' + window.escapeHTML(window.t('lifecycleBufferDesc', {}, lang)) + '</div>';
                if (stageState('buffer') === 'active') {
                    html += bufferProgressHtml + bufferDatesHtml + bufferWarningHtml;
                } else {
                    html += bufferDatesHtml;
                }
                return html;
            }
            return '<div class="lifecycle-stage-desc">' + window.escapeHTML(window.t('lifecycleArchiveDesc', {}, lang)) + '</div>';
        };

        const stagesHtml = stageOrder.map((name, i) => {
            const meta = stageMeta[name];
            const st = stageState(name);
            const nodeInner = st === 'done' ? '✓' : meta.icon;
            const isLast = i === stageOrder.length - 1;
            return '<div class="lifecycle-stage ' + meta.cls + ' is-' + st + (isLast ? ' is-last' : '') + '">' +
                '<div class="lifecycle-rail"><span class="lifecycle-node">' + nodeInner + '</span></div>' +
                '<div class="lifecycle-stage-content">' +
                    '<div class="lifecycle-stage-head">' +
                        '<span class="lifecycle-stage-title">' + window.escapeHTML(meta.title) + '</span>' +
                        '<span class="lifecycle-stage-status">' + window.escapeHTML(stageStatusText(name)) + '</span>' +
                    '</div>' +
                    stageContentHtml(name) +
                '</div>' +
            '</div>';
        }).join('');

        const rewardCardsHtml = (hasProtection && poolAmount > 0)
            ? '<div class="lifecycle-rewards">' +
                '<div class="lifecycle-rewards-title">✨ ' + window.escapeHTML(window.t('lifecycleRewardsHeader', {}, lang)) + '</div>' +
                '<div class="ppc-rewards-split-container">' +
                    '<div class="ppc-reward-split-card bust-pool">' +
                        '<span class="ppc-reward-split-emoji">💎</span>' +
                        '<div class="ppc-reward-split-info">' +
                            '<span class="ppc-reward-split-value notranslate">' + poolAmount + ' $BUST</span>' +
                            '<span class="ppc-reward-split-label">' + window.escapeHTML(window.t('ppcRewardSplitBustLabel', {}, lang)) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="ppc-reward-split-card karma-boost">' +
                        '<span class="ppc-reward-split-emoji">☯️</span>' +
                        '<div class="ppc-reward-split-info">' +
                            '<span class="ppc-reward-split-value notranslate">+0.5</span>' +
                            '<span class="ppc-reward-split-label">' + window.escapeHTML(window.t('ppcRewardSplitKarmaLabel', {}, lang)) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="ppc-reward-split-footer">' + window.escapeHTML(window.t('lifecycleRewardsSubtext', {}, lang)) + '</div>' +
              '</div>'
            : '';

        const summaryMeta = stageMeta[currentStage];
        const summaryStatus = stageStatusText(currentStage);
        let summaryHint;
        if (currentStage === 'buffer') {
            summaryHint = window.t('lifecycleSummaryNoCheckins', {}, lang);
        } else if (currentStage === 'protection') {
            summaryHint = poolAmount > 0
                ? '💎 ' + poolAmount + ' $BUST · ☯️ +0.5'
                : window.t('lifecycleSummaryOneTap', {}, lang);
        } else {
            summaryHint = hasProtection
                ? '🛡 ' + window.t('lifecycleProtectionPaid', { count: extraPaid }, lang)
                : window.t('lifecycleSummaryKeepApp', {}, lang);
        }

        const startOpen = currentStage === 'protection' || currentStage === 'buffer';

        return '<details class="protection-details-card lifecycle-card ' + summaryMeta.cls + '" id="protection-details-accordion"' + (startOpen ? ' open' : '') + '>' +
            '<summary class="protection-details-summary lifecycle-summary">' +
                '<div class="lifecycle-summary-main">' +
                    '<div class="lifecycle-summary-row">' +
                        '<span class="lifecycle-summary-badge ' + summaryMeta.cls + '">' + summaryMeta.icon + ' ' + window.escapeHTML(summaryMeta.title) + '</span>' +
                        '<span class="lifecycle-summary-status">' + window.escapeHTML(summaryStatus) + '</span>' +
                        (timelineMeta.isLastDay
                            ? '<button type="button" class="meta-chip sync-last-day-chip" onclick="showSyncLastDayNotice(event)">' + window.escapeHTML(window.t('syncLastDayChip', {}, lang)) + '</button>'
                            : '') +
                        '<span class="grant-dashboard-lost-arrow" aria-hidden="true">›</span>' +
                    '</div>' +
                    '<div class="lifecycle-summary-hint">' + window.escapeHTML(summaryHint) + '</div>' +
                '</div>' +
            '</summary>' +
            '<div class="protection-accordion-content lifecycle-body">' +
                '<div class="lifecycle-official-day">' + window.escapeHTML(window.t('syncOfficialDay', { day: currentGoogleDay }, lang)) + '</div>' +
                '<div class="lifecycle-track">' + stagesHtml + '</div>' +
                rewardCardsHtml +
                '<div class="lifecycle-lag-note">' + window.escapeHTML(window.t('syncLagNote', {}, lang)) + '</div>' +
            '</div>' +
        '</details>';
    })();

    const detailRunIterationChip = typeof buildRunIterationChip === 'function'
        ? buildRunIterationChip(test, 'meta-chip')
        : '';
    const progressFooterHtml = '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--hint-color);margin-top:10px;">' +
        '<span>' + window.escapeHTML(window.t('grantProgressText', { day: userTestingDay }, lang)) + '</span>' +
        detailRunIterationChip +
        (!timelineMeta.isSynced
            ? (progressData.remainingDays > 0
                ? '<span>' + window.escapeHTML(window.t('timelineApproxRemaining', { count: progressData.remainingDays }, lang)) + '</span>'
                : '<span>' + window.escapeHTML(window.t('timelineNoRemaining', {}, lang)) + '</span>')
            : '') +
        (!timelineMeta.isSynced && overtimeDays > 0
            ? '<button type="button" class="detail-overtime-banner detail-overtime-chip" onclick="showToast(\'' + escapeInlineJsString(window.t('overtimeChipToast', {}, lang)) + '\')">' + window.escapeHTML(window.t('detailOvertimeReward', {}, lang)) + '</button>'
            : '') +
    '</div>';
    const timelinePanelHtml = '<div class="grant-progress-panel" style="width: 100%; text-align: left;">' +
        progressData.html +
        progressFooterHtml +
    '</div>';

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
    // Show contract economics only for testers on this project via bounty/contract,
    // not for mutual/barter seats on hybrid (Combo) apps.
    var isContractTester = String(test.join_type || '').toLowerCase() === 'bounty';
    if (isContractTester && Number(test.bounty_per_tester || 0) > 0) {
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
        var reviewActionHtml = '';
        if (!reviewConfirmed) {
            var reviewActionLabel = reviewPending
                ? ('⏳ ' + window.escapeHTML(window.t('playReviewDetailsPendingChip', {}, lang)))
                : (reviewRejected
                    ? (window.escapeHTML(lang === 'ru' ? 'Отправить повторно' : 'Resubmit'))
                    : window.escapeHTML(window.t('playReviewDetailsOpenBtn', {}, lang)));
            reviewActionHtml = '<button class="btn btn-secondary" style="width:100%; margin-top:10px; background-color: rgba(255,204,0,0.12); color: var(--text-color); border: 1px solid rgba(255,204,0,0.24);" onclick="openPlayReviewModal(' + Number(test.id) + ', event)">' +
                    reviewActionLabel +
                '</button>';
        }
        var reviewRewardHtml = reviewRewardParts.length
            ? '<div style="font-size:13px; line-height:1.55; color: var(--hint-color); margin-top: 8px;">' + reviewRewardParts.join('<br>') + '</div>'
            : '<div style="font-size:13px; line-height:1.55; color: var(--hint-color); margin-top: 8px;">' + window.escapeHTML(window.t(reviewPending || reviewConfirmed ? 'playReviewDetailsNoRewardYet' : 'playReviewDetailsStartHint', {}, lang)) + '</div>';
        playReviewRequestHtml = '<div class="details-block">' +
            '<div class="detail-section-title">⭐ ' + window.escapeHTML(window.t('playReviewDetailsTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px; line-height:1.65; color: var(--text-color); margin-top: 6px;">' + window.escapeHTML(window.t('playReviewDetailsText', {}, lang)) + '</div>' +
            '<div style="margin-top:8px; display:flex; gap:6px; flex-wrap:wrap;">' + reviewStatusHtml + '</div>' +
            reviewActionHtml +
            reviewRewardHtml +
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
    const skipIndicator = typeof buildGrantSkipDots === 'function'
        ? buildGrantSkipDots(currentSkips)
        : Array.from({ length: 3 }, function(_, index) {
            if (index === 0) return currentSkips > 0 ? '<span class="skip-dot used"></span>' : '<span class="skip-dot available"></span>';
            if (index === 1) return currentSkips > 1 ? '<span class="skip-dot used"></span>' : '<span class="skip-dot available"></span>';
            if (currentSkips === 3) return '<span class="skip-dot warning" title="3-й пропуск">⚠️</span>';
            if (currentSkips >= 4) return '<span class="skip-dot used"></span>';
            return '<span class="skip-dot available"></span>';
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
                '<div class="grant-dashboard-skips-row">' +
                    '<span class="grant-skip-text">' + window.escapeHTML(window.t('grantSkipsLabel', { used: currentSkips, max: 3 }, lang)) + '</span>' +
                    '<span class="grant-dashboard-skips">' + skipIndicator + '</span>' +
                '</div>' +
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

        (timelineMeta.isSynced
            ? ''
            : '<div class="details-block">' + timelinePanelHtml + '</div>') +

        syncHtml +

        '<div class="details-block detail-owner-block">' +
            '<div class="detail-section-title">' + window.t('detail_owner_label', {}, lang) + '</div>' +
            '<div class="detail-owner-row" style="display: flex; align-items: center; gap: 12px;">' +
                ownerAvatarHtml +
                '<div style="min-width: 0; display: flex; flex-direction: column; gap: 2px;">' +
                    '<div id="detail-owner-name" class="detail-owner-name notranslate" style="font-weight: 700; font-size: 18px; color: #ffffff; line-height: 1.2; word-break: break-word;">' + window.escapeHTML(mainName) + '</div>' +
                    subNameHtml +
                    '<div id="detail-owner-status" class="detail-owner-status ' + ownerActivity.detailClass + '" style="cursor:pointer;" onclick="showOwnerLastSeenToast(\'' + escapeInlineJsString(test.last_owner_activity || '') + '\')">' +
                        window.escapeHTML(getOwnerDetailStatusText(test.last_owner_activity)) +
                    '</div>' +
                '</div>' +
            '</div>' +
            buildOwnerDetailMetricsHtml(cachedOwnerProfile || {
                karma: ownerKarma,
                avg_handle_hours: (test.owner_avg_handle_hours != null ? test.owner_avg_handle_hours : test.avg_handle_hours),
            }, test) +
        '</div>' +

        googleGroupHtml +

        instructionsHtml +

        economicsHtml +

        playReviewRequestHtml +

        rewardsByAppHtml +

        '<div class="detail-actions">' +
            '<button class="btn" style="background:var(--button-color);color:var(--button-text-color);" onclick="closeProjectDetailsModal(); openTelegramProfile(\'' + safeOwnerUsername + '\')">' + window.t('detail_contact_btn', {}, lang) + '</button>' +
            mutualOfferButtonHtml +
            '<div style="display:flex;gap:8px;width:100%;">' +
            '<button class="btn" style="flex:1;background:rgba(142,142,147,0.18);color:var(--text-color);" onclick="closeProjectDetailsModal(); initiateProjectFeedback(' + test.id + ', { feedbackType: \'bug\' })">' + window.t('detail_report_bug_btn', {}, lang) + '</button>' +
            '<button class="btn" style="flex:1;background:rgba(142,142,147,0.18);color:var(--text-color);" onclick="closeProjectDetailsModal(); initiateProjectFeedback(' + test.id + ', { feedbackType: \'idea\' })">' + window.t('detail_suggest_idea_btn', {}, lang) + '</button>' +
            '</div>' +
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
                    : '<button class="btn" style="background:rgba(255,59,48,0.14);color:#ff4d4f;" onclick="closeProjectDetailsModal(); openLeaveOrDropFromTest(' + test.id + ')">' + window.t('detail_leave_btn', {}, lang) + '</button>')) +
        '</div>';

    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.dataset.appId = String(Number(test.id) || '');
        modal.classList.add('active');

        // Owner dossier: use session cache immediately; refresh network only when stale.
        const ownerId = Number(test.owner_id || 0);
        if (ownerId > 0 && !isOwnerDetailProfileFresh(ownerId)) {
            fetchOwnerDetailProfile(ownerId).then(function(profileData) {
                if (!profileData) return;
                applyOwnerProfileToOpenDetailsModal(profileData, test, ownerId);
            });
        }

        // Accordion & Overtime row synchronizer for days 1-14
        const accordion = document.getElementById('protection-details-accordion');
        const overtimeRow = document.querySelector('.timeline-row-overtime');
        if (accordion && overtimeRow) {
            // Initially sync visibility based on whether the accordion is open
            if (!accordion.open) {
                overtimeRow.style.display = 'none';
                overtimeRow.style.maxHeight = '0px';
                overtimeRow.style.opacity = '0';
            } else {
                overtimeRow.style.display = 'block';
                overtimeRow.style.maxHeight = '120px';
                overtimeRow.style.opacity = '1';
            }

            accordion.addEventListener('toggle', () => {
                if (accordion.open) {
                    overtimeRow.style.display = 'block';
                    overtimeRow.style.maxHeight = '0px';
                    overtimeRow.style.opacity = '0';
                    overtimeRow.style.overflow = 'hidden';
                    overtimeRow.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
                    // trigger reflow
                    overtimeRow.offsetHeight;
                    overtimeRow.style.maxHeight = '120px';
                    overtimeRow.style.opacity = '1';
                } else {
                    overtimeRow.style.transition = 'max-height 0.25s ease, opacity 0.25s ease';
                    overtimeRow.style.maxHeight = '0px';
                    overtimeRow.style.opacity = '0';
                    setTimeout(() => {
                        if (!accordion.open) {
                            overtimeRow.style.display = 'none';
                        }
                    }, 250);
                }
            });
        } else if (overtimeRow) {
            // If day 15+, keep overtime row fully visible
            overtimeRow.style.display = 'block';
            overtimeRow.style.maxHeight = '';
            overtimeRow.style.opacity = '';
        }
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

// --- Collapsible Cards & Kebab Dropdowns Helper Functions ---
function toggleProjectCard(projectId, event) {
    if (event) {
        event.stopPropagation();
    }
    const card = document.getElementById('project-card-' + projectId);
    if (!card) return;
    const isCollapsed = card.classList.contains('card-collapsed');
    
    // Find the expand bar chevron inside this card
    const chevron = card.querySelector('.card-expand-chevron');
    
    if (isCollapsed) {
        card.classList.remove('card-collapsed');
        localStorage.setItem('project_card_collapsed_' + projectId, 'false');
        if (chevron) chevron.classList.remove('is-collapsed');
    } else {
        card.classList.add('card-collapsed');
        localStorage.setItem('project_card_collapsed_' + projectId, 'true');
        if (chevron) chevron.classList.add('is-collapsed');
    }
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function toggleProjectTestersList(projectId, event) {
    if (event) {
        event.stopPropagation();
    }
    const card = document.getElementById('project-card-' + projectId);
    if (!card) return;
    const isCollapsed = card.classList.contains('card-testers-collapsed');
    const chevron = card.querySelector('.pc-alltesters__chev');
    if (isCollapsed) {
        card.classList.remove('card-testers-collapsed');
        localStorage.setItem('project_testers_collapsed_' + projectId, 'false');
        if (chevron) chevron.classList.add('is-open');
    } else {
        card.classList.add('card-testers-collapsed');
        localStorage.setItem('project_testers_collapsed_' + projectId, 'true');
        if (chevron) chevron.classList.remove('is-open');
    }
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

/**
 * Explains the whole project lifecycle: main test → paid extension → safety
 * buffer → archive. Rendered as a timeline so the owner can see where the
 * project currently stands instead of reading a wall of text.
 */
function openProjectLifecycleModal(projectId, event) {
    if (event) {
        event.stopPropagation();
    }
    const project = (myProjects || []).find((item) => Number(item.id) === Number(projectId));
    const modal = document.getElementById('project-lifecycle-modal');
    const titleEl = document.getElementById('project-lifecycle-title');
    const bodyEl = document.getElementById('project-lifecycle-body');
    const actionBtn = document.getElementById('project-lifecycle-action');
    if (!modal || !titleEl || !bodyEl || !actionBtn || !project) return;

    const platformDay = typeof getProjectPlatformDay === 'function' ? getProjectPlatformDay(project.created_at) : 0;
    const hasSync = _isProjectSyncedSafe(project);
    const currentDay = hasSync && typeof getProjectCurrentGoogleDay === 'function'
        ? getProjectCurrentGoogleDay(project, platformDay)
        : platformDay;
    const extraPaidDays = Number(project.paid_protection_days || project.purchased_protection_days || 0);
    const isPending = String(project.status || '').toLowerCase() === 'pending_completion';
    const bufferHoursLeft = isPending
        ? Math.min(48, Math.max(0, 48 - Number(project.consumed_pending_hours || 0)))
        : 0;
    const lastMainDay = 14 + extraPaidDays;

    const esc = window.escapeHTML;
    const tr = (key, params) => window.t(key, params || {}, lang);

    let stage = 'main';
    if (isPending) stage = 'buffer';
    else if (extraPaidDays > 0 && currentDay > 14) stage = 'extended';

    const order = ['main', 'extended', 'buffer', 'archive'];
    const stageIndex = order.indexOf(stage);

    const stages = [
        {
            id: 'main',
            glyph: '🧪',
            title: tr('pcLifecycleMainTitle'),
            meta: tr('pcLifecycleMainMeta', { day: Math.min(currentDay, 14), total: 14 }),
            desc: tr('pcLifecycleMainDesc'),
        },
        {
            id: 'extended',
            glyph: '🛡',
            title: tr('pcLifecycleExtendedTitle'),
            meta: extraPaidDays > 0
                ? tr('pcLifecycleExtendedMetaPaid', { days: extraPaidDays })
                : tr('pcLifecycleExtendedMetaEmpty'),
            desc: tr('pcLifecycleExtendedDesc'),
            chips: extraPaidDays > 0
                ? Array.from({ length: extraPaidDays }, (_, i) => tr('pcLifecycleDayChip', { day: 15 + i }))
                : [],
            muted: extraPaidDays === 0,
        },
        {
            id: 'buffer',
            glyph: '⏳',
            title: tr('pcLifecycleBufferTitle'),
            meta: bufferHoursLeft > 0 ? tr('pcBufferHoursShort', { hours: bufferHoursLeft }) : tr('pcBufferBadge'),
            desc: tr('pcLifecycleBufferDesc'),
        },
        {
            id: 'archive',
            glyph: '🏁',
            title: tr('pcLifecycleArchiveTitle'),
            meta: tr('pcLifecycleArchiveMeta'),
            desc: tr('pcLifecycleArchiveDesc'),
        },
    ];

    const dots = [];
    for (let day = 1; day <= lastMainDay; day += 1) {
        let cls = 'pc-lc-dot';
        if (day <= currentDay) cls += ' is-done';
        if (day === currentDay) cls += ' is-current';
        if (day > 14) cls += ' is-paid';
        dots.push(`<span class="${cls}"></span>`);
    }

    titleEl.textContent = tr('pcLifecycleTitle');

    bodyEl.innerHTML = `
        <p class="pc-lc-intro">${esc(tr('pcLifecycleIntro'))}</p>
        <div class="pc-lc-track" role="img" aria-label="${esc(tr('pcLifecycleMainMeta', { day: currentDay, total: 14 }))}">
            <div class="pc-lc-track__head">
                <span class="pc-lc-track__label">${esc(tr('pcLifecycleTrackLabel'))}</span>
                <span class="pc-lc-track__value">${esc(tr('pcLifecycleMainMeta', { day: Math.min(currentDay, lastMainDay), total: lastMainDay }))}</span>
            </div>
            <div class="pc-lc-dots">${dots.join('')}<span class="pc-lc-buffer-cap" aria-hidden="true"></span></div>
            <div class="pc-lc-legend">
                <span><i class="pc-lc-key is-done"></i>${esc(tr('pcLifecycleLegendDone'))}</span>
                <span><i class="pc-lc-key is-paid"></i>${esc(tr('pcLifecycleLegendPaid'))}</span>
                <span><i class="pc-lc-key"></i>${esc(tr('pcLifecycleLegendLeft'))}</span>
                <span><i class="pc-lc-key is-buffer"></i>${esc(tr('pcLifecycleLegendBuffer'))}</span>
            </div>
        </div>
        <ol class="pc-lc-steps">
            ${stages.map((item, index) => {
                const state = index < stageIndex ? 'is-past' : (index === stageIndex ? 'is-active' : 'is-future');
                return `
                <li class="pc-lc-step ${state}${item.muted ? ' is-muted' : ''}">
                    <span class="pc-lc-step__glyph" aria-hidden="true">${item.glyph}</span>
                    <div class="pc-lc-step__body">
                        <div class="pc-lc-step__head">
                            <span class="pc-lc-step__title">${esc(item.title)}</span>
                            <span class="pc-lc-step__meta">${esc(item.meta)}</span>
                        </div>
                        ${item.chips && item.chips.length
                            ? `<div class="pc-lc-step__chips">${item.chips.map((chip) => `<span class="pc-lc-chip">${esc(chip)}</span>`).join('')}</div>`
                            : ''}
                        <p class="pc-lc-step__desc">${esc(item.desc)}</p>
                    </div>
                </li>`;
            }).join('')}
        </ol>
        <ol class="pc-lc-steps pc-lc-steps--aside" aria-label="${esc(tr('pcLifecycleRestartTitle'))}">
            <li class="pc-lc-step is-standalone is-future">
                <span class="pc-lc-step__glyph" aria-hidden="true">🔄</span>
                <div class="pc-lc-step__body">
                    <div class="pc-lc-step__head">
                        <span class="pc-lc-step__title">${esc(tr('pcLifecycleRestartTitle'))}</span>
                        <span class="pc-lc-step__meta">${esc(tr('pcLifecycleRestartMeta'))}</span>
                    </div>
                    <p class="pc-lc-step__desc">${esc(tr('pcLifecycleRestartDesc'))}</p>
                </div>
            </li>
        </ol>
        <div class="pc-lc-note">${esc(hasSync ? tr('pcLifecycleSyncedNote') : tr('pcLifecycleUnsyncedNote'))}</div>
    `;

    actionBtn.textContent = hasSync ? tr('pcLifecycleActionSynced') : tr('pcLifecycleActionUnsynced');
    actionBtn.onclick = function (clickEvent) {
        clickEvent.stopPropagation();
        closeProjectLifecycleModal();
        openProtectionCenter(projectId);
    };
    modal.dataset.projectId = String(projectId);
    modal.classList.add('active');
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function closeProjectLifecycleModal(event) {
    if (event && event.target !== event.currentTarget) return;
    const modal = document.getElementById('project-lifecycle-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.dataset.projectId = '';
    }
}

function toggleProjectSettingsDrawer(projectId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const drawer = document.getElementById('settings-drawer-' + projectId);
    if (!drawer) return;
    const isActive = drawer.classList.contains('active');
    
    // Close all settings drawers first
    document.querySelectorAll('.project-settings-drawer').forEach((el) => {
        el.classList.remove('active');
    });
    
    if (!isActive) {
        drawer.classList.add('active');
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
        setTimeout(() => {
            document.addEventListener('click', closeAllDrawersOnOutsideClick);
        }, 0);
    } else {
        document.removeEventListener('click', closeAllDrawersOnOutsideClick);
    }
}

function closeAllSettingsDrawers() {
    document.querySelectorAll('.project-settings-drawer').forEach((el) => {
        el.classList.remove('active');
    });
    document.removeEventListener('click', closeAllDrawersOnOutsideClick);
}

function closeAllDrawersOnOutsideClick(event) {
    if (!event.target.closest('.project-settings-drawer') && !event.target.closest('.project-icon-btn') && !event.target.closest('.card-header')) {
        closeAllSettingsDrawers();
    }
}

async function toggleProjectVisibility(projectId, isChecked) {
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
    const mode = isChecked ? 'public' : 'hidden_manual';
    try {
        if (typeof window.setProjectVisibilityMode === 'function') {
            const result = await window.setProjectVisibilityMode(projectId, mode);
            if (result) {
                showToast(window.t('visibilityModeSaved', {}, lang));
                
                // Update project visibility indicator badge overlay on avatar
                const card = document.getElementById('project-card-' + projectId);
                if (card) {
                    const overlay = card.querySelector('.project-visibility-badge-overlay');
                    if (overlay) {
                        const project = myProjects.find(p => p.id === projectId);
                        if (project) {
                            project.is_visible = isChecked;
                            const meta = getProjectVisibilityMeta(project);
                            overlay.className = 'project-visibility-badge-overlay ' + meta.mode;
                            overlay.textContent = meta.buttonIcon;
                            
                            // Dim or undim the card
                            if (isChecked) {
                                card.classList.remove('card-inactive');
                            } else {
                                card.classList.add('card-inactive');
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error(e);
        showToast('Error toggling visibility');
    }
}

function getGuestProjectsCount() {
    if (typeof _externalCounts !== 'undefined' && _externalCounts && typeof _externalCounts.guest_projects_count !== 'undefined') {
        return Math.max(0, Number(_externalCounts.guest_projects_count));
    }
    return 0;
}

function getLeadsRadarCount() {
    var candidates = [
        window.__guestTestsLeadsCount,
        typeof _externalCounts !== 'undefined' && _externalCounts && _externalCounts.leads_count,
        window.visibilityStats && window.visibilityStats.leads_count,
        window.visibilityStats && window.visibilityStats.raw_leads_count,
    ];
    for (var i = 0; i < candidates.length; i++) {
        var parsed = Number(candidates[i]);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return 0;
}

window.toggleProjectVisibility = toggleProjectVisibility;
window.toggleProjectSettingsDrawer = toggleProjectSettingsDrawer;

// --- Attract Testers Bottom Sheet Helper Functions ---
var _gtActiveOrdersCache = null;
var _gtActiveOrdersCacheAt = 0;
var _gtArchivedOrdersCache = null;
var _gtArchivedOrdersCacheAt = 0;
var _gtStatusModalOrder = null;

function invalidateGuaranteedOrdersCache() {
    _gtActiveOrdersCache = null;
    _gtActiveOrdersCacheAt = 0;
    _gtArchivedOrdersCache = null;
    _gtArchivedOrdersCacheAt = 0;
}
window.invalidateGuaranteedOrdersCache = invalidateGuaranteedOrdersCache;

function formatGuaranteedOrderDate(value) {
    var timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) return '—';
    try {
        return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(new Date(timestamp));
    } catch (_) {
        return new Date(timestamp).toLocaleDateString();
    }
}

function getGuaranteedOrderCardMeta(order) {
    var status = String((order && order.status) || '').toLowerCase();
    var startedAt = Date.parse(String((order && order.started_at) || ''));
    var completionDate = formatGuaranteedOrderDate(order && order.completion_date);
    var now = Date.now();

    if (status === 'awaiting_payment') {
        return {
            variant: 'pending',
            badge: getProjectUiText('gtStatusAwaitingPayment', 'Awaiting payment details'),
            hint: getProjectUiText('gtHintAwaitingPayment', 'Payment details were requested. After you pay, attach the receipt and submit the order.')
        };
    }
    if (status === 'pending') {
        return {
            variant: 'pending',
            badge: getProjectUiText('gtStatusPending', 'Payment verification'),
            hint: getProjectUiText('gtHintPending', 'Your request was received. Please wait while payment and access settings are verified.')
        };
    }
    if (status === 'paid') {
        return {
            variant: 'pending',
            badge: getProjectUiText('gtStatusPaid', 'Preparing the team'),
            hint: getProjectUiText('gtHintPaid', 'Payment and settings are verified. We are forming your tester group.')
        };
    }
    if (status === 'completed') {
        return {
            variant: 'done',
            day: 14,
            badge: getProjectUiText('gtStatusCompleted', 'Completed'),
            hint: getProjectUiText('gtHintCompleted', 'Your private testing cycle has been completed.')
        };
    }
    if (status === 'in_progress' && Number.isFinite(startedAt) && (now - startedAt) >= 43200000) {
        var day = Math.min(14, Math.max(1, Math.floor((now - startedAt) / 86400000) + 1));
        return {
            variant: 'active',
            day: day,
            badge: getProjectUiText('gtStatusTestingDay', 'Day {day} of 14', { day: day }),
            hint: getProjectUiText('gtHintTesting', 'Testing is underway. Estimated completion: {completion_date}.', { completion_date: completionDate })
        };
    }
    if (status === 'in_progress') {
        return {
            variant: 'active',
            badge: getProjectUiText('gtStatusCollecting', 'Collecting testers'),
            hint: getProjectUiText('gtHintCollecting', 'We are collecting the team of testers for your app.')
        };
    }
    return {
        variant: 'pending',
        badge: getProjectUiText('gtStatusProcessing', 'Processing order'),
        hint: getProjectUiText('gtHintProcessing', 'We are checking the details of your private testing order.')
    };
}

function renderGuaranteedDraftBanner(container) {
    if (!container) return;
    var existing = container.querySelector('.gt-draft-banner');
    if (existing) existing.remove();

    var draft = null;
    if (typeof window.getGuaranteedTestWizardDraft === 'function') {
        draft = window.getGuaranteedTestWizardDraft();
    }
    if (!draft || !String(draft.app_name || '').trim()) return;

    var step = Number(draft.step || 1);
    var isPayment = step >= 3;
    var banner = document.createElement('div');
    banner.className = 'gt-draft-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML =
        '<div class="gt-draft-banner__body">' +
            '<p class="gt-draft-banner__text">' +
                window.escapeHTML(getProjectUiText(
                    isPayment ? 'gtDraftBannerPayment' : 'gtDraftBannerSetup',
                    isPayment
                        ? 'You have an unfinished paid testing order'
                        : 'You have an unfinished private testing setup'
                )) +
            '</p>' +
            '<div class="gt-draft-banner__actions">' +
                '<button type="button" class="gt-draft-banner__resume">' +
                    window.escapeHTML(getProjectUiText(
                        isPayment ? 'gtDraftBannerFinishPayment' : 'gtDraftBannerContinue',
                        isPayment ? 'Finish payment' : 'Continue setup'
                    )) +
                '</button>' +
                '<button type="button" class="gt-draft-banner__dismiss">' +
                    window.escapeHTML(getProjectUiText('gtDraftBannerDismiss', '✖ Reset')) +
                '</button>' +
            '</div>' +
        '</div>';

    var resumeBtn = banner.querySelector('.gt-draft-banner__resume');
    var dismissBtn = banner.querySelector('.gt-draft-banner__dismiss');
    if (resumeBtn) {
        resumeBtn.addEventListener('click', function () {
            if (typeof window.resumeGuaranteedTestWizardFromDraft === 'function') {
                window.resumeGuaranteedTestWizardFromDraft();
            }
        });
    }
    if (dismissBtn) {
        dismissBtn.addEventListener('click', function () {
            if (typeof window.clearGuaranteedTestWizardDraft === 'function') {
                window.clearGuaranteedTestWizardDraft();
            }
            banner.remove();
        });
    }

    container.insertBefore(banner, container.firstChild);
}
window.renderGuaranteedDraftBanner = renderGuaranteedDraftBanner;

function buildGuaranteedOrderCardHtml(order, options) {
    options = options || {};
    var meta = getGuaranteedOrderCardMeta(order);
    var id = Number(order && order.id);
    if (!Number.isFinite(id) || id <= 0) return '';
    var isCompleted = String(order.status || '').toLowerCase() === 'completed';
    var isArchivedView = !!options.archived;
    var publicCode = String((order && order.public_code) || '').trim();
    if (!publicCode && id > 0) {
        // Must stay in sync with backend format_guaranteed_order_public_code
        publicCode = 'GT-' + (24766 + id * 41);
    }

    var isCoordinator = !!(order && order.is_coordinator);
    var ownerName = String((order && order.owner_name) || '').trim();
    var ownerUsername = String((order && order.owner_username) || '').trim().replace(/^@+/, '');
    var ownerLabel = [ownerName, ownerUsername ? '@' + ownerUsername : ''].filter(Boolean).join(' ')
        || getProjectUiText('gtContactOwnerFallback', 'Contact owner');
    var coordinatorChip = isCoordinator
        ? '<span class="guaranteed-order-card__coordinator-chip">' +
            window.escapeHTML(getProjectUiText('gtManagedBadge', '🛡 In management')) +
          '</span>'
        : '';

    var actions =
        '<button type="button" class="btn btn-secondary guaranteed-order-action" onclick="' +
            (isCoordinator ? 'openGuaranteedOrderOwnerChat(' : 'openGuaranteedOrderSupport(') + id + ')">' +
            window.escapeHTML(isCoordinator ? ownerLabel : getProjectUiText('gtContactManager', 'Contact manager')) +
        '</button>';
    if (isCompleted && !isArchivedView && !isCoordinator) {
        actions +=
            '<button type="button" class="btn btn-primary guaranteed-order-action" onclick="archiveGuaranteedTestOrder(' + id + ')">' +
                window.escapeHTML(getProjectUiText('gtArchive', 'Archive')) +
            '</button>';
    }

    var progress = '';
    if (Number.isFinite(meta.day) && meta.day > 0) {
        var percent = Math.max(4, Math.min(100, Math.round((meta.day / 14) * 100)));
        progress =
            '<div class="guaranteed-order-card__progress">' +
                '<div class="guaranteed-order-card__progress-track">' +
                    '<div class="guaranteed-order-card__progress-fill" style="width: ' + percent + '%;"></div>' +
                '</div>' +
                '<span class="guaranteed-order-card__progress-label">' +
                    window.escapeHTML(getProjectUiText('gtProgressLabel', 'Day {day} of 14', { day: meta.day })) +
                '</span>' +
            '</div>';
    }

    var codeRow = publicCode
        ? ('<p class="guaranteed-order-card__code">' +
            window.escapeHTML(getProjectUiText('gtOrderCode', 'Order ' + publicCode, { code: publicCode })) +
          '</p>')
        : '';

    var hasArchiveAction = isCompleted && !isArchivedView && !isCoordinator;
    var actionsClass = 'guaranteed-order-card__actions' + (hasArchiveAction ? '' : ' guaranteed-order-card__actions--single');

    return (
        '<article class="guaranteed-order-card guaranteed-order-card--' + (meta.variant || 'pending') + (isArchivedView ? ' guaranteed-order-card--archived' : '') + '" data-gt-order-id="' + id + '">' +
            '<div class="guaranteed-order-card__top">' +
                '<h3 class="guaranteed-order-card__name">' + window.escapeHTML(String(order.app_name || getProjectUiText('unknownLabel', 'Unknown app'))) + '</h3>' +
                '<div class="guaranteed-order-card__badges">' +
                    coordinatorChip +
                    '<span class="guaranteed-order-card__badge">' + window.escapeHTML(meta.badge) + '</span>' +
                '</div>' +
            '</div>' +
            codeRow +
            '<p class="guaranteed-order-card__hint">' + window.escapeHTML(meta.hint) + '</p>' +
            progress +
            '<dl class="guaranteed-order-card__dates">' +
                '<div><dt>' + window.escapeHTML(getProjectUiText('gtStartDate', 'Start')) + '</dt><dd>' + window.escapeHTML(formatGuaranteedOrderDate(order.started_at)) + '</dd></div>' +
                '<div><dt>' + window.escapeHTML(getProjectUiText('gtEstimatedEnd', 'Estimated end')) + '</dt><dd>' + window.escapeHTML(formatGuaranteedOrderDate(order.completion_date)) + '</dd></div>' +
            '</dl>' +
            '<div class="' + actionsClass + '">' + actions + '</div>' +
        '</article>'
    );
}

function renderGuaranteedOrdersSection(container) {
    if (!container) return;
    var section = document.createElement('section');
    section.className = 'guaranteed-orders-section';
    section.setAttribute('aria-live', 'polite');
    container.appendChild(section);

    loadVisibleGuaranteedOrders(false).then(function (orders) {
        if (!container.contains(section) || !Array.isArray(orders) || !orders.length) {
            section.remove();
            return;
        }
        var cards = orders.map(function (order) {
            return buildGuaranteedOrderCardHtml(order, { archived: false });
        }).join('');
        if (!cards) {
            section.remove();
            return;
        }
        section.innerHTML =
            '<h2 class="guaranteed-orders-section__title">' +
                window.escapeHTML(getProjectUiText('gtOrdersSectionTitle', 'Private Testing')) +
            '</h2>' +
            '<div class="guaranteed-orders-section__list">' + cards + '</div>';
    }).catch(function () {
        section.remove();
    });
}

async function loadVisibleGuaranteedOrders(forceRefresh) {
    var now = Date.now();
    if (!forceRefresh && _gtActiveOrdersCache && (now - _gtActiveOrdersCacheAt) < 30000) {
        return _gtActiveOrdersCache;
    }
    try {
        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || '';
        var initData = (typeof getTelegramInitDataRaw === 'function')
            ? getTelegramInitDataRaw()
            : ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '');
        var resp = await fetch(apiBase + '/guaranteed-test-orders/mine?init_data=' + encodeURIComponent(initData));
        var data = await resp.json();
        if (data && data.status === 'success' && Array.isArray(data.orders)) {
            _gtActiveOrdersCache = data.orders;
            _gtActiveOrdersCacheAt = now;
            return _gtActiveOrdersCache;
        }
    } catch (e) {
        console.warn('Failed to load guaranteed orders:', e);
    }
    return _gtActiveOrdersCache || [];
}

async function loadArchivedGuaranteedOrders(forceRefresh) {
    var now = Date.now();
    if (!forceRefresh && _gtArchivedOrdersCache && (now - _gtArchivedOrdersCacheAt) < 30000) {
        return _gtArchivedOrdersCache;
    }
    try {
        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || '';
        var initData = (typeof getTelegramInitDataRaw === 'function')
            ? getTelegramInitDataRaw()
            : ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '');
        var resp = await fetch(apiBase + '/guaranteed-test-orders/archived?init_data=' + encodeURIComponent(initData));
        var data = await resp.json();
        if (data && data.status === 'success' && Array.isArray(data.orders)) {
            _gtArchivedOrdersCache = data.orders;
            _gtArchivedOrdersCacheAt = now;
            return _gtArchivedOrdersCache;
        }
    } catch (e) {
        console.warn('Failed to load archived guaranteed orders:', e);
    }
    return _gtArchivedOrdersCache || [];
}

// Compatibility for existing project-level private-testing actions.
var fetchActiveGuaranteedOrders = loadVisibleGuaranteedOrders;

function getGuaranteedOrderById(orderId) {
    var active = Array.isArray(_gtActiveOrdersCache) ? _gtActiveOrdersCache : [];
    var archived = Array.isArray(_gtArchivedOrdersCache) ? _gtArchivedOrdersCache : [];
    var all = active.concat(archived);
    return all.find(function (order) { return Number(order && order.id) === Number(orderId); }) || null;
}

function openGuaranteedOrderSupport(orderId) {
    _gtStatusModalOrder = getGuaranteedOrderById(orderId);
    if (typeof window.openHandsFreeSupportChat === 'function') {
        window.openHandsFreeSupportChat();
    }
}
window.openGuaranteedOrderSupport = openGuaranteedOrderSupport;

function openGuaranteedOrderOwnerChat(orderId) {
    var order = getGuaranteedOrderById(orderId);
    if (!order || !order.is_coordinator) return;

    var username = String(order.owner_username || '').trim().replace(/^@+/, '');
    var ownerId = Number(order.user_id);
    var targetUrl = username
        ? 'https://t.me/' + encodeURIComponent(username)
        : (Number.isFinite(ownerId) && ownerId > 0 ? 'tg://user?id=' + ownerId : '');
    if (!targetUrl) return;

    try {
        if (targetUrl.indexOf('https://') === 0 && window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(targetUrl);
        } else if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            window.Telegram.WebApp.openLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    } catch (error) {
        window.open(targetUrl, '_blank');
    }
}
window.openGuaranteedOrderOwnerChat = openGuaranteedOrderOwnerChat;

async function archiveGuaranteedTestOrder(orderId) {
    var id = Number(orderId);
    if (!Number.isFinite(id) || id <= 0) return;
    var initData = (typeof getTelegramInitDataRaw === 'function')
        ? getTelegramInitDataRaw()
        : ((window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) || '');
    if (!initData) {
        if (typeof showToast === 'function') showToast(getProjectUiText('gtArchiveFailed', 'Could not archive the order. Please reopen the app and try again.'));
        return;
    }
    try {
        var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || '';
        var response = await fetch(apiBase + '/guaranteed-test-orders/' + id + '/archive', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: initData })
        });
        var payload = {};
        try { payload = await response.json(); } catch (_) {}
        if (!response.ok || (payload && payload.status === 'error')) {
            throw new Error('guaranteed_order_archive_failed');
        }
        invalidateGuaranteedOrdersCache();
        if (typeof showToast === 'function') showToast(getProjectUiText('gtArchiveSuccess', 'Order moved to archive.'));
        renderProjects(true);
        try { renderArchivedProjects(true); } catch (_) { /* ignore */ }
    } catch (error) {
        console.warn('Failed to archive guaranteed order:', error);
        if (typeof showToast === 'function') showToast(getProjectUiText('gtArchiveFailed', 'Could not archive the order. Please try again.'));
    }
}
window.archiveGuaranteedTestOrder = archiveGuaranteedTestOrder;

function findActiveGuaranteedOrderForProject(project, orders) {
    if (!project || !Array.isArray(orders) || !orders.length) return null;
    var projectId = String(project.id || '');
    var pkg = String(project.package || project.package_name || '').trim().toLowerCase();
    var name = String(project.name || '').trim().toLowerCase();

    for (var i = 0; i < orders.length; i++) {
        var order = orders[i] || {};
        var status = String(order.status || '').toLowerCase();
        // `/mine` now includes completed non-archived orders for the dashboard;
        // they must not block a new private-testing order for the same app.
        if (status === 'completed' || status === 'archived') continue;
        var notes = String(order.notes || '');
        var link = String(order.testing_link || '').toLowerCase();
        var orderName = String(order.app_name || '').trim().toLowerCase();
        if (projectId && notes.indexOf('app_id=' + projectId) !== -1) return order;
        if (pkg && (link.indexOf(pkg) !== -1 || notes.toLowerCase().indexOf('package=' + pkg) !== -1)) return order;
        if (name && orderName === name) return order;
    }
    return null;
}

function getGuaranteedOrderStatusLabel(order) {
    var status = String((order && order.status) || '').toLowerCase();
    if (status === 'in_progress') {
        return lang === 'ru' ? 'В работе' : 'In progress';
    }
    if (status === 'paid') {
        return lang === 'ru' ? 'Оплата получена' : 'Paid';
    }
    return lang === 'ru' ? 'На исполнении' : 'Processing';
}

function openHandsFreeOrderStatusModal(order) {
    _gtStatusModalOrder = order || null;
    ensureHandsFreeStatusModal();
    var overlay = document.getElementById('gtw-order-status-overlay');
    if (!overlay || !order) return;

    var code = String(order.public_code || ('GT-' + (10000 + Number(order.id || 0))));
    var statusLabel = getGuaranteedOrderStatusLabel(order);
    var titleEl = document.getElementById('gtw-order-status-title');
    var codeEl = document.getElementById('gtw-order-status-code');
    var appEl = document.getElementById('gtw-order-status-app');
    var statusEl = document.getElementById('gtw-order-status-value');
    var linkEl = document.getElementById('gtw-order-status-link');

    if (titleEl) titleEl.textContent = lang === 'ru' ? 'Заявка на исполнении' : 'Order in progress';
    if (codeEl) codeEl.textContent = '#' + code;
    if (appEl) appEl.textContent = String(order.app_name || '—');
    if (statusEl) statusEl.textContent = statusLabel;
    if (linkEl) linkEl.textContent = String(order.testing_link || '—');

    overlay.style.display = 'flex';
}
window.openHandsFreeOrderStatusModal = openHandsFreeOrderStatusModal;

function closeHandsFreeOrderStatusModal(event) {
    var overlay = document.getElementById('gtw-order-status-overlay');
    if (!overlay) return;
    if (event && event.target && event.target !== overlay && event.target.id !== 'gtw-order-status-close') return;
    overlay.style.display = 'none';
}
window.closeHandsFreeOrderStatusModal = closeHandsFreeOrderStatusModal;

function openHandsFreeSupportChat() {
    var order = _gtStatusModalOrder || {};
    var code = String(order.public_code || '');
    var text = code
        ? ('Support request for order #' + code)
        : 'Support request for Private Testing order';
    var targetUrl = 'https://t.me/garantXchange?text=' + encodeURIComponent(text);
    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
        window.Telegram.WebApp.openTelegramLink(targetUrl);
    } else {
        window.open(targetUrl, '_blank');
    }
}
window.openHandsFreeSupportChat = openHandsFreeSupportChat;

function ensureHandsFreeStatusModal() {
    if (document.getElementById('gtw-order-status-overlay')) return;
    var note = (typeof lang !== 'undefined' && lang === 'ru')
        ? 'Повторная заявка недоступна, пока текущая в работе. По вопросам — напишите в поддержку.'
        : 'A new order cannot be placed while this one is active. Contact support if you need help.';
    var supportLabel = (typeof lang !== 'undefined' && lang === 'ru') ? 'СВЯЗАТЬСЯ С ПОДДЕРЖКОЙ' : 'CONTACT SUPPORT';
    var closeLabel = (typeof lang !== 'undefined' && lang === 'ru') ? 'Закрыть' : 'Close';
    var div = document.createElement('div');
    div.innerHTML =
        '<div id="gtw-order-status-overlay" class="gtw-order-status-overlay" style="display:none;" onclick="closeHandsFreeOrderStatusModal(event)">' +
            '<div class="gtw-order-status-card" onclick="event.stopPropagation()">' +
                '<h3 id="gtw-order-status-title" class="gtw-order-status-title">Order in progress</h3>' +
                '<div class="gtw-order-status-row"><span>Order</span><strong id="gtw-order-status-code">—</strong></div>' +
                '<div class="gtw-order-status-row"><span>App</span><strong id="gtw-order-status-app">—</strong></div>' +
                '<div class="gtw-order-status-row"><span>Status</span><strong id="gtw-order-status-value">—</strong></div>' +
                '<div class="gtw-order-status-link" id="gtw-order-status-link">—</div>' +
                '<p class="gtw-order-status-note">' + note + '</p>' +
                '<button type="button" class="gtw-continue-btn" onclick="openHandsFreeSupportChat()">' + supportLabel + '</button>' +
                '<button type="button" class="gtw-payment-flow-cancel" id="gtw-order-status-close" onclick="closeHandsFreeOrderStatusModal(event)">' + closeLabel + '</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(div.firstElementChild);
}

async function openAttractTestersSheet(projectId) {
    const project = myProjects.find((p) => p.id === projectId);
    if (!project) return;

    const overlay = document.getElementById('attract-testers-sheet-overlay');
    const content = document.getElementById('attract-testers-sheet-content');
    if (!overlay || !content) return;

    const massInviteMeta = getProjectMassInviteMeta(project);
    const guestCount = getGuestProjectsCount();
    const leadsCount = getLeadsRadarCount();
    const testersList = Array.isArray(project.testers) ? project.testers : [];
    const manualCount = testersList.filter(t => t.join_type === 'manual').length;

    const activeOrders = await fetchActiveGuaranteedOrders(false);
    const activeGtOrder = findActiveGuaranteedOrderForProject(project, activeOrders);
    let handsFreeItemHtml = '';
    if (activeGtOrder) {
        const orderPayload = encodeURIComponent(JSON.stringify(activeGtOrder));
        const statusLabel = window.escapeHTML(getGuaranteedOrderStatusLabel(activeGtOrder));
        const code = window.escapeHTML(String(activeGtOrder.public_code || ''));
        const subtitle = lang === 'ru'
            ? ('Заявка #' + code + ' уже в работе. Повторная отправка недоступна.')
            : ('Order #' + code + ' is already in progress. Resubmit is locked.');
        handsFreeItemHtml =
            '<div class="attract-sheet-item attract-sheet-item--gt-active" onclick="closeAttractTestersSheet(); openHandsFreeOrderStatusModal(JSON.parse(decodeURIComponent(\'' + orderPayload + '\')));">' +
                '<div class="attract-sheet-item-icon">🛡️</div>' +
                '<div class="attract-sheet-item-info">' +
                    '<div class="attract-sheet-item-title-row">' +
                        '<div class="attract-sheet-item-title">' + window.escapeHTML(window.t('attractHandsFreeTitle', {}, lang)) + '</div>' +
                        '<span class="attract-sheet-item-badge accent-yellow">' + statusLabel + '</span>' +
                    '</div>' +
                    '<div class="attract-sheet-item-subtitle">' + window.escapeHTML(subtitle) + '</div>' +
                '</div>' +
                '<span class="attract-sheet-item-chevron">›</span>' +
            '</div>';
    } else {
        handsFreeItemHtml =
            '<div class="attract-sheet-item" onclick="closeAttractTestersSheet(); openHandsFreeTestingWizard(' + projectId + ');">' +
                '<div class="attract-sheet-item-icon">🛡️</div>' +
                '<div class="attract-sheet-item-info">' +
                    '<div class="attract-sheet-item-title">' + window.escapeHTML(window.t('attractHandsFreeTitle', {}, lang)) + '</div>' +
                    '<div class="attract-sheet-item-subtitle">' + window.escapeHTML(window.t('attractHandsFreeSubtitle', {}, lang)) + '</div>' +
                '</div>' +
                '<span class="attract-sheet-item-chevron">›</span>' +
            '</div>';
    }

    content.innerHTML = `
        <!-- Item 1: Mass Invite -->
        <div class="attract-sheet-item" onclick="closeAttractTestersSheet(); openMassInviteModal(${projectId});">
            <div class="attract-sheet-item-icon">📨</div>
            <div class="attract-sheet-item-info">
                <div class="attract-sheet-item-title-row">
                    <div class="attract-sheet-item-title">${window.escapeHTML(window.t('attractMassInviteTitle', {}, lang))}</div>
                    <span class="attract-sheet-item-badge accent-green">${window.escapeHTML(window.t('badgeAvailable', { count: massInviteMeta.maxRecipients }, lang))}</span>
                </div>
                <div class="attract-sheet-item-subtitle">${window.escapeHTML(window.t('attractMassInviteSubtitle', {}, lang))}</div>
            </div>
            <span class="attract-sheet-item-chevron">›</span>
        </div>

        <!-- Item 2: Guest Projects -->
        <div class="attract-sheet-item" onclick="closeAttractTestersSheet(); openGuestProjectsTesterSearch(${projectId});">
            <div class="attract-sheet-item-icon">👽</div>
            <div class="attract-sheet-item-info">
                <div class="attract-sheet-item-title-row">
                    <div class="attract-sheet-item-title">${window.escapeHTML(window.t('attractGuestTitle', {}, lang))}</div>
                    <span class="attract-sheet-item-badge accent-blue">${window.escapeHTML(window.t('badgeWaiting', { count: guestCount }, lang))}</span>
                </div>
                <div class="attract-sheet-item-subtitle">${window.escapeHTML(window.t('attractGuestSubtitle', {}, lang))}</div>
            </div>
            <span class="attract-sheet-item-chevron">›</span>
        </div>

        <!-- Item 3: Leads Radar -->
        <div class="attract-sheet-item" onclick="closeAttractTestersSheet(); handleLeadsRadarAction();">
            <div class="attract-sheet-item-icon">📡</div>
            <div class="attract-sheet-item-info">
                <div class="attract-sheet-item-title-row">
                    <div class="attract-sheet-item-title">${window.escapeHTML(window.t('attractLeadsTitle', {}, lang))}</div>
                    <span class="attract-sheet-item-badge accent-yellow">${window.escapeHTML(window.t('badgeNew', { count: leadsCount }, lang))}</span>
                </div>
                <div class="attract-sheet-item-subtitle">${window.escapeHTML(window.t('attractLeadsSubtitle', {}, lang))}</div>
            </div>
            <span class="attract-sheet-item-chevron">›</span>
        </div>

        <!-- Item 4: Add manually -->
        <div class="attract-sheet-item" onclick="closeAttractTestersSheet(); openManualExternalAddModal(${projectId}, event);">
            <div class="attract-sheet-item-icon">➕</div>
            <div class="attract-sheet-item-info">
                <div class="attract-sheet-item-title-row">
                    <div class="attract-sheet-item-title">${window.escapeHTML(window.t('attractManualTitle', {}, lang))}</div>
                    <span class="attract-sheet-item-badge accent-blue">${window.escapeHTML(window.t('badgeManualAdded', { count: manualCount }, lang))}</span>
                </div>
                <div class="attract-sheet-item-subtitle">${window.escapeHTML(window.t('attractManualSubtitle', {}, lang))}</div>
            </div>
            <span class="attract-sheet-item-chevron">›</span>
        </div>

        <!-- Item 5: Invites & Exchange -->
        <div class="attract-sheet-item" onclick="closeAttractTestersSheet(); openInviteModal(${projectId});">
            <div class="attract-sheet-item-icon">🔗</div>
            <div class="attract-sheet-item-info">
                <div class="attract-sheet-item-title">${window.escapeHTML(window.t('attractInviteTitle', {}, lang))}</div>
                <div class="attract-sheet-item-subtitle">${window.escapeHTML(window.t('attractInviteSubtitle', {}, lang))}</div>
            </div>
            <span class="attract-sheet-item-chevron">›</span>
        </div>

        <!-- Item 6: Private Testing -->
        ${handsFreeItemHtml}
    `;

    overlay.classList.add('is-active');
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.impactOccurred('light');
}

function closeAttractTestersSheet(event) {
    const overlay = document.getElementById('attract-testers-sheet-overlay');
    if (!overlay) return;
    if (event && event.target !== overlay) return;
    overlay.classList.remove('is-active');
}

function handleLeadsRadarAction() {
    if (window.tg) {
        if (typeof window.tg.sendData === 'function') {
            window.tg.sendData('/leads');
            window.tg.close();
        } else {
            window.tg.close();
        }
    } else {
        alert('Leads radar action (/leads) triggered.');
    }
}

function openHandsFreeTestingWizard(projectId) {
    var project = myProjects.find(function (item) { return item.id === projectId; });
    fetchActiveGuaranteedOrders(false).then(function (orders) {
        var active = findActiveGuaranteedOrderForProject(project, orders);
        if (active) {
            openHandsFreeOrderStatusModal(active);
            return;
        }
        if (typeof window.showGuaranteedTestWizardStep1 === 'function') {
            window.showGuaranteedTestWizardStep1({ projectId: projectId });
            return;
        }
        if (typeof window.showGuaranteedTestOfferModal === 'function') {
            window.showGuaranteedTestOfferModal();
        }
    });
}

let _massInviteProjectId = null;
let _massInviteInterval = null;

function openMassInviteModal(projectId) {
    if (typeof assertOwnerCanTakeForeignTests === 'function' && !assertOwnerCanTakeForeignTests()) {
        return;
    }
    const project = myProjects.find((item) => item.id === projectId);
    if (!project) return;
    
    // Close Action Sheet first if open
    closeAttractTestersSheet();
    
    if (project.is_setup_completed === false) {
        const title = window.t ? window.t('massInviteSetupIncompleteTitle', {}, lang) : 'Настройка не завершена';
        const message = window.t ? window.t('massInviteSetupIncompleteAlert', {}, lang) : 'Настройка не завершена. Для запуска массовой рассылки необходимо настроить доступ для тестеров.';
        const btnSetupText = window.t ? window.t('btnFinishSetup', {}, lang) : 'Завершить настройку';
        const btnCancelText = window.t ? window.t('btnCancel', {}, lang) : (lang === 'ru' ? 'Отмена' : 'Cancel');
        
        if (tg.showPopup) {
            tg.showPopup({
                title: title,
                message: message,
                buttons: [
                    { id: 'setup', type: 'default', text: btnSetupText },
                    { id: 'cancel', type: 'cancel', text: btnCancelText }
                ]
            }, function(buttonId) {
                if (buttonId === 'setup') {
                    openEditModal(projectId, { focusSetup: true });
                }
            });
        } else {
            const confirmed = confirm(message);
            if (confirmed) {
                openEditModal(projectId, { focusSetup: true });
            }
        }
        return;
    }
    
    _massInviteProjectId = projectId;
    const modal = document.getElementById('mass-invite-modal');
    if (!modal) return;
    
    renderMassInviteModalContent();
    modal.classList.add('active');

    // Refresh offer statuses from server, then re-render once.
    refreshMassInviteSessionQuietly(projectId).then(function() {
        if (_massInviteProjectId === projectId) renderMassInviteModalContent();
    }).catch(function() {});

    // Tick only timers — do not remount candidate cards every second.
    if (_massInviteInterval) clearInterval(_massInviteInterval);
    _massInviteInterval = setInterval(updateMassInviteModalTimers, 1000);
}

function closeMassInviteModal(event) {
    const modal = document.getElementById('mass-invite-modal');
    if (event && event.target !== modal && event.target !== document.getElementById('t-massInviteClose')) return;
    if (modal) modal.classList.remove('active');
    if (_massInviteInterval) {
        clearInterval(_massInviteInterval);
        _massInviteInterval = null;
    }
    _massInviteProjectId = null;
}

function _getMassInviteSessionForProject(projectId, project) {
    var session = null;
    if (typeof MassInviteSession !== 'undefined' && MassInviteSession.load) {
        session = MassInviteSession.load(projectId);
    }
    if (session && Array.isArray(session.candidates) && session.candidates.length) {
        return session;
    }
    // Soft fallback: project may know sent_count but not candidate list (pre-WOW blasts).
    var fallbackCount = Math.max(0, Number(project && project.last_mass_invite_sent_count || 0));
    if (!session && fallbackCount > 0 && project && project.last_mass_invite_at) {
        return {
            app_id: Number(projectId),
            sent_at: project.last_mass_invite_at,
            sent_count: fallbackCount,
            candidates: [],
            stats: { sent: fallbackCount, accepted: 0, rejected: 0, pending: 0, expired: 0, failed: 0 },
        };
    }
    return session;
}

function updateMassInviteModalTimers() {
    if (!_massInviteProjectId) return;
    var project = myProjects.find(function(p) { return p.id === _massInviteProjectId; });
    if (!project) return;
    var meta = getProjectMassInviteMeta(project);

    var cooldownTimeEl = document.getElementById('mi-cooldown-time');
    if (cooldownTimeEl && meta.isCooldownActive) {
        cooldownTimeEl.textContent = formatMassInviteRemaining(meta.remainingMs);
    }

    var session = _getMassInviteSessionForProject(_massInviteProjectId, project);
    var responseEl = document.getElementById('mi-session-response-timer');
    if (responseEl && typeof MassInviteCards !== 'undefined' && MassInviteCards.formatResponseTimerText) {
        var text = MassInviteCards.formatResponseTimerText(session, lang);
        responseEl.textContent = text;
        var closed = window.t && text === window.t('massInviteSessionWindowClosed', {}, lang);
        responseEl.classList.toggle('is-done', !!closed || !text);
    }
}

async function refreshMassInviteSessionQuietly(projectId) {
    if (!projectId) return null;
    if (typeof MassInviteSession === 'undefined' || !MassInviteSession.refreshFromServer) return null;
    if (typeof API_BASE === 'undefined' || typeof userId === 'undefined') return null;
    try {
        return await MassInviteSession.refreshFromServer(projectId, userId, API_BASE);
    } catch (e) {
        console.warn('Mass invite session refresh failed', e);
        return null;
    }
}

function renderMassInviteModalContent() {
    const modalBody = document.getElementById('mass-invite-modal-body');
    if (!modalBody || !_massInviteProjectId) return;

    const project = myProjects.find((p) => p.id === _massInviteProjectId);
    if (!project) return;

    const isIsolated = getProjectVisibilityMeta(project).mode === 'isolated';
    const massInviteMeta = getProjectMassInviteMeta(project);
    const session = _getMassInviteSessionForProject(project.id, project);

    let launchBtnLabel = window.t('massInviteLaunchBtn', {}, lang);
    let launchBtnClass = 'btn btn-primary mass-invite-btn';
    let launchBtnAttrs = `onclick="handleMassInviteAction(${project.id})"`;

    if (isIsolated) {
        launchBtnLabel = window.t('inviteIsolationDisabledBtn', {}, lang);
        launchBtnClass = 'btn btn-secondary mass-invite-btn is-disabled';
        launchBtnAttrs = 'disabled';
    } else if (!massInviteMeta.isAvailable) {
        launchBtnLabel = window.t('massInviteUnavailableBtn', {}, lang);
        launchBtnClass = 'btn btn-secondary mass-invite-btn is-disabled';
        launchBtnAttrs = 'disabled';
    } else if (massInviteMeta.isCooldownActive) {
        launchBtnClass = 'btn btn-secondary mass-invite-btn is-disabled';
        launchBtnAttrs = 'disabled';
    }

    let sessionBlockHtml = '';
    if (!isIsolated && typeof MassInviteCards !== 'undefined' && MassInviteCards.renderSessionBlock) {
        sessionBlockHtml = MassInviteCards.renderSessionBlock(session, {
            sourceAppId: project.id,
            lang: lang,
            fallbackSentCount: massInviteMeta.lastSentCount,
        });
    }

    let cooldownBlockHtml = '';
    if (!isIsolated && massInviteMeta.isCooldownActive) {
        const remainingTime = formatMassInviteRemaining(massInviteMeta.remainingMs);
        cooldownBlockHtml = `
            <div class="mass-invite-cooldown-container">
                <div class="mass-invite-timer" id="mi-cooldown-timer">
                    <span class="mass-invite-cooldown-label">${window.escapeHTML(window.t('massInviteCooldownRemainingLabel', {}, lang))}</span>
                    <span class="mass-invite-cooldown-time" id="mi-cooldown-time">${window.escapeHTML(remainingTime)}</span>
                </div>
                <div class="mass-invite-hint" style="font-size: 12px; color: var(--hint-color); margin-bottom: 12px;">
                    ${window.escapeHTML(window.t('massInviteCooldownManualHint', {}, lang))}
                </div>
                <button type="button" class="btn mass-invite-btn is-locked" style="width: 100%;" onclick="triggerResetCooldown(${project.id})">
                    ${window.escapeHTML(window.t('massInviteResetCostHint', {}, lang))}
                </button>
            </div>
        `;
    }

    const limitHintHtml = !isIsolated && massInviteMeta.isAvailable
        ? `<div class="mass-invite-hint" style="text-align:center; margin-top: 8px; font-size: 12px; color: var(--hint-color);">${window.escapeHTML(window.t('massInviteLimitHint', { count: massInviteMeta.maxRecipients }, lang))}</div>`
        : '';

    const infoDesc = !isIsolated && !massInviteMeta.isAvailable
        ? window.t('massInviteUnavailableNote', {}, lang)
        : window.t('massInviteBlockDesc', {}, lang);

    modalBody.innerHTML = `
        <div class="mass-invite-card" style="background: var(--secondary-bg-color); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div class="mass-invite-title" style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">${window.escapeHTML(window.t('massInviteBlockTitle', {}, lang))}</div>
            <div class="mass-invite-desc" style="font-size: 13px; color: var(--hint-color); margin-bottom: 16px; line-height: 1.4;">${window.escapeHTML(infoDesc)}</div>

            <button id="mass-invite-btn" class="${launchBtnClass}" style="width: 100%;" ${launchBtnAttrs}>${window.escapeHTML(launchBtnLabel)}</button>
            ${limitHintHtml}

            ${sessionBlockHtml}
            ${cooldownBlockHtml}
        </div>
    `;
}

async function triggerResetCooldown(projectId) {
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
    renderMassInviteModalContent();
}

function toggleTestingDayInstructions() {
    const el = document.getElementById('testing-day-instructions');
    const btn = document.querySelector('.ppc-btn-howworks');
    if (!el) return;
    el.classList.toggle('expanded');
    if (btn) btn.classList.toggle('active');
}

window.openMassInviteModal = openMassInviteModal;
window.closeMassInviteModal = closeMassInviteModal;
window.triggerResetCooldown = triggerResetCooldown;
window.renderMassInviteModalContent = renderMassInviteModalContent;
window.updateMassInviteModalTimers = updateMassInviteModalTimers;
window.toggleTestingDayInstructions = toggleTestingDayInstructions;

async function dismissLeftTesterRow(appId, testerId) {
    var safeAppId = Number(appId || 0);
    var safeTesterId = Number(testerId || 0);
    if (safeAppId <= 0 || safeTesterId <= 0) return;
    try {
        var response = await fetch(API_BASE + '/projects/' + safeAppId + '/testers/' + safeTesterId + '/dismiss_left', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(withInitData({})),
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (typeof _removeLocalTesterFromProject === 'function') {
            _removeLocalTesterFromProject(safeAppId, safeTesterId);
        } else {
            var project = (myProjects || []).find(function(item) {
                return Number(item.id) === safeAppId;
            });
            if (project && Array.isArray(project.testers)) {
                project.testers = project.testers.filter(function(item) {
                    return Number(item.tester_id) !== safeTesterId;
                });
            }
        }
        if (window.tg && window.tg.HapticFeedback) {
            window.tg.HapticFeedback.notificationOccurred('success');
        }
        showToast(window.t('testerLeftSoftArchiveDone', {}, lang));
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }
    } catch (error) {
        console.error('Dismiss left tester error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}
window.dismissLeftTesterRow = dismissLeftTesterRow;

(function initProjectsScrollPerf() {
    var scrollEndTimer = null;
    function markProjectsScrolling() {
        var tab = document.getElementById('tab-projects');
        if (!tab || !tab.classList.contains('active')) return;
        document.documentElement.classList.add('projects-scrolling');
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(function() {
            document.documentElement.classList.remove('projects-scrolling');
        }, 140);
    }
    window.addEventListener('scroll', markProjectsScrolling, { passive: true });
    window.addEventListener('touchmove', markProjectsScrolling, { passive: true });
})();
