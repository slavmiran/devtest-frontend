/* Phase 4.2 — ui/ui-tests.js (structural split from ui.js, lines 50–2331) */
function renderEditCreatedAtMeta() {
    const metaEl = document.getElementById('edit-created-at');
    if (!metaEl) return;
    if (!projectToEdit) {
        metaEl.textContent = '';
        return;
    }
    const project = myProjects.find((item) => item.id === projectToEdit);
    metaEl.textContent = formatEditProjectCreatedAt(project);
}

function getIssueRemovalDeadline(issueReportedAt) {
    if (!issueReportedAt) return null;
    var issueDate = new Date(issueReportedAt);
    if (Number.isNaN(issueDate.getTime())) return null;
    return new Date(issueDate.getTime() + (72 * 60 * 60 * 1000));
}

function getIssueRemovalCountdownText(issueReportedAt) {
    var deadline = getIssueRemovalDeadline(issueReportedAt);
    if (!deadline) return '';

    var remainingMs = deadline.getTime() - Date.now();
    if (remainingMs <= 0) {
        return window.t('issueCountdownExpired', {}, lang);
    }
    if (remainingMs < (60 * 60 * 1000)) {
        return window.t('issueCountdownLessThanHour', {}, lang);
    }

    var totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
    var days = Math.floor(totalHours / 24);
    var hours = totalHours % 24;
    if (days > 0) {
        return window.t('issueCountdownDaysHours', {
            days: days,
            hours: hours,
        }, lang);
    }
    return window.t('issueCountdownHoursOnly', {
        hours: Math.max(1, totalHours),
    }, lang);
}

function getIssueAwaitingFixLabel(test) {
    var countdownText = getIssueRemovalCountdownText(test && test.issue_reported_at);
    if (!countdownText) {
        return window.t('issueAwaitingFix', {}, lang);
    }
    return window.t('issueAwaitingFixCountdown', {
        time_left: countdownText,
    }, lang);
}

function getResolvedTestingDay(test) {
    if (test && test.is_external && typeof isExternalContinueModeEnabled === 'function' && isExternalContinueModeEnabled(test)) {
        return 14;
    }
    var serverTestingDays = Number(test && test.testing_days || 0);
    if (Number.isFinite(serverTestingDays) && serverTestingDays > 0) {
        return serverTestingDays;
    }
    return getUserTestingDay(test && test.start_date);
}

function isTestedToday(test) {
    if (!test || !test.last_check_date) return false;
    try {
        const lastCheckDate = parseLocalDateOnly(test.last_check_date);
        if (!lastCheckDate) return false;
        const today = parseLocalDateOnly(getLocalDate());
        if (!today) return false;
        // Compare dates without time component (both dates are at 00:00:00 due to parseLocalDateOnly)
        return lastCheckDate.getTime() === today.getTime();
    } catch (e) {
        return false;
    }
}

function formatDdMmYyyy(dateValue) {
    const value = dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (Number.isNaN(value.getTime())) return '—';
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());
    return day + '/' + month + '/' + year;
}

function showSyncLastDayNotice(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const message = window.t('syncLastDayAlert', {}, lang);
    if (tg.showAlert) {
        tg.showAlert(message);
    } else if (window.showCustomAlert) {
        window.showCustomAlert(message);
    } else {
        alert(message);
    }
}

function getTesterOvertimeStats(tester) {
    var overtimeCheckins = Number(tester && tester.overtime_checkins);
    var overtimeSkips = Number(tester && tester.overtime_skips);
    var overtimeDays = Number(tester && tester.overtime_days);

    if (Number.isFinite(overtimeCheckins) && Number.isFinite(overtimeSkips) && Number.isFinite(overtimeDays)) {
        return {
            overtimeCheckins: Math.max(0, overtimeCheckins),
            overtimeSkips: Math.max(0, overtimeSkips),
            overtimeDays: Math.max(0, overtimeDays),
        };
    }

    var timeline = String(tester && tester.daily_timeline || '');
    if (timeline) {
        var overtimeTimeline = timeline.slice(14);
        return {
            overtimeCheckins: (overtimeTimeline.match(/2/g) || []).length,
            overtimeSkips: (overtimeTimeline.match(/3/g) || []).length,
            overtimeDays: overtimeTimeline.length,
        };
    }

    var totalCheckins = Math.max(0, Number(tester && tester.checkins_count || 0));
    var testingDay = getUserTestingDay(tester && tester.start_date);
    var hasCheckedToday = (tester && tester.last_check_date || '') === getLocalDate();
    var realizedDays = Math.max(0, testingDay - (hasCheckedToday ? 0 : 1));
    var overtimeRealized = Math.max(0, realizedDays - 14);
    var fallbackCheckins = Math.max(0, totalCheckins - 14);
    return {
        overtimeCheckins: fallbackCheckins,
        overtimeSkips: Math.max(0, overtimeRealized - fallbackCheckins),
        overtimeDays: overtimeRealized,
    };
}

function renderEvents() {
    if (!arguments[0] && !isTabVisible('tests')) return;
    const listEl = document.getElementById('events-list');
    const toggleEl = document.getElementById('events-toggle');
    if (!listEl || !toggleEl) return;

    if (communityEvents === null) {
        listEl.innerHTML = `<div class="event-time">${t.pulseLoading}</div>`;
        toggleEl.style.display = 'none';
        return;
    }

    if (!communityEvents) {
        listEl.innerHTML = `<div class="event-time">${t.pulseEmpty}</div>`;
        toggleEl.style.display = 'none';
        return;
    }

    const visibleEvents = eventsExpanded ? communityEvents : communityEvents.slice(0, 2);
    listEl.className = eventsExpanded ? 'events-list expanded' : 'events-list';

    if (!communityEvents.length) {
        listEl.innerHTML = `<div class="event-time">${t.pulseEmpty}</div>`;
        toggleEl.style.display = 'none';
        return;
    }

    listEl.innerHTML = visibleEvents.map((eventItem) => {
        const rawText = (lang === 'ru' ? eventItem.text_ru : (eventItem.text_en || eventItem.text_ru)) || '';
        const text = sanitizePulseEventHtml(rawText);
        return `
            <div class="event-item">
                <div class="event-time">${formatTimeAgo(eventItem.created_at)}</div>
                <div class="event-text">${text}</div>
            </div>
        `;
    }).join('');

    toggleEl.style.display = communityEvents.length > 2 ? '' : 'none';
    toggleEl.innerText = eventsExpanded ? t.pulseCollapse : t.pulseExpand;
}

function toggleEventsExpanded() {
    eventsExpanded = !eventsExpanded;
    renderEvents();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function getProjectLanguageToast(targetLang) {
    const langCode = String(targetLang || 'ALL').toUpperCase();
    if (langCode === 'RU') return window.t('projectLanguageToastRu', {}, lang);
    if (langCode === 'EN') return window.t('projectLanguageToastEn', {}, lang);
    return window.t('projectLanguageToastAll', {}, lang);
}

function isMutualExitFlow(test) {
    const joinType = String(test && test.join_type || '').toLowerCase();
    return joinType === 'mutual' || joinType === 'prelaunch';
}

function getCurrentUserKarmaValue() {
    const raw = visibilityStats && typeof visibilityStats.ownerKarma !== 'undefined'
        ? Number(visibilityStats.ownerKarma)
        : 0;
    return Number.isFinite(raw) ? raw : 0;
}

function getFinalizedGrantSkips(test) {
    // Count skips from daily_timeline (days 1-14 only) as source of truth
    if (test && test.daily_timeline) {
        const timeline = String(test.daily_timeline || '');
        // Only count baseline period (days 1-14)
        const baselinePeriod = timeline.substring(0, 14);
        // '0' = standard skip, '3' = overtime skip (but shouldn't exist in days 1-14)
        // Count occurrences of skip characters
        const skipCount = (baselinePeriod.match(/[03]/g) || []).length;
        return Math.max(0, skipCount);
    }
    // Fallback to skips_count if no timeline
    return Math.max(0, Number(test && test.skips_count || 0));
}

function getGrantEstimateData(test) {
    const skips = getFinalizedGrantSkips(test);
    const karma = getCurrentUserKarmaValue();
    const base = 50;
    const karmaBonus = Math.min(Math.max(0, karma * 5), 100);
    const perfectBonus = skips === 0 ? 50 : 0;
    const eligible = skips <= 3;
    return {
        base,
        karma,
        karmaBonus,
        perfectBonus,
        skips,
        eligible,
        total: eligible ? Math.min(base + karmaBonus + perfectBonus, 200) : 0,
    };
}

function showGrantBreakdownAlertById(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const test = myTests.find(function(item) { return Number(item.id) === Number(appId); });
    if (!test) return;

    const grant = getGrantEstimateData(test);
    const message = grant.eligible
        ? window.t('grantBreakdownEligible', {
            base: formatUiAmount(grant.base, 1),
            karma: formatUiAmount(grant.karma, 1),
            karma_bonus: formatUiAmount(grant.karmaBonus, 1),
            perfect_bonus: formatUiAmount(grant.perfectBonus, 1),
            total: formatUiAmount(grant.total, 1),
            skips: grant.skips,
        }, lang)
        : window.t('grantBreakdownLost', {
            skips: grant.skips,
        }, lang);

    if (tg.showAlert) {
        tg.showAlert(message);
    } else if (window.showCustomAlert) {
        window.showCustomAlert(message);
    } else {
        showToast(message);
    }
}

function getTestingTimelineMeta(test) {
    var today = parseLocalDateOnly(getLocalDate()) || new Date();
    var userTestingDayRaw = getResolvedTestingDay(test);
    var userTestingDay = typeof userTestingDayRaw === 'number' && userTestingDayRaw > 0 ? userTestingDayRaw : 1;
    var currentGoogleDay = 0;
    var projectDaysLeft = 0;
    var expectedTotalDays = Math.max(14, userTestingDay);
    var overtimeDays = 0;
    var isSynced = isProjectSynced(test);

    if (isSynced) {
        currentGoogleDay = getProjectCurrentGoogleDay(test, 0);
        projectDaysLeft = Math.max(0, 14 - currentGoogleDay);
        expectedTotalDays = userTestingDay + projectDaysLeft;
        overtimeDays = Math.max(0, expectedTotalDays - 14);
    }

    var finishDate = new Date(today.getTime() + (projectDaysLeft * 24 * 60 * 60 * 1000));
    return {
        today: today,
        userTestingDay: userTestingDay,
        currentGoogleDay: currentGoogleDay,
        projectDaysLeft: projectDaysLeft,
        expectedTotalDays: expectedTotalDays,
        overtimeDays: overtimeDays,
        isSynced: isSynced,
        finishDate: finishDate,
        isLastDay: isSynced && projectDaysLeft === 0,
    };
}

function buildGrantProgressSegments(test, userTestingDay, expectedTotalDays, options) {
    options = options || {};
    var timeline = test.daily_timeline || '';
    var renderTimeline = timeline;
    var totalDays = Math.max(expectedTotalDays || 14, userTestingDay || 0, 1);
    var standardCheckins = 0, standardSkips = 0, overtimeCheckins = 0, overtimeSkips = 0;
    var currentDay = null;
    var currentDayState = '';
    var hasCheckedToday = isTestedToday(test);  // ← Use normalized date comparison

    if (!hasCheckedToday && userTestingDay > 0 && renderTimeline.length >= userTestingDay) {
        var unresolvedMarker = renderTimeline[userTestingDay - 1] || '';
        if (unresolvedMarker === '0' || unresolvedMarker === '3') {
            renderTimeline = renderTimeline.slice(0, userTestingDay - 1) + renderTimeline.slice(userTestingDay);
        }
    }

    if (userTestingDay > 0 && userTestingDay <= totalDays) {
        currentDay = Math.max(1, Math.min(totalDays, userTestingDay || 1));
        currentDayState = hasCheckedToday ? 'completed' : 'pending';
    }

    function getDayState(dayNum) {
        const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
        const isBufferDay = dayNum > 14 + extraPaid;
        var ch = renderTimeline[dayNum - 1] || '';
        
        // Fallback: if user is on Day 15+, ensure all days 1-14 are colored
        if (dayNum <= 14 && userTestingDay > 14) {
            if (ch !== '0') {
                ch = '1';
            }
        }
        
        var cls = 'remaining';
        if (isBufferDay) {
            cls = 'buffer-pause';
        } else {
            if (ch === '1') { cls = 'standard-checkin'; standardCheckins++; }
            else if (ch === '0') { cls = 'standard-skip'; standardSkips++; }
            else if (ch === '2') { cls = 'overtime-checkin'; overtimeCheckins++; }
            else if (ch === '3') { cls = 'overtime-skip'; overtimeSkips++; }
        }
        if (currentDay === dayNum) {
            if (currentDayState === 'completed') {
                cls += ' current-completed';
            } else if (currentDayState === 'pending') {
                cls += ' current-pending';
                cls += dayNum > 14 ? ' current-pending-overtime' : ' current-pending-base';
            }
        }
        return '<div class="grant-segment ' + cls + '" data-day="' + dayNum + '"></div>';
    }

    if (!timeline) {
        var totalCheckins = Math.max(0, Number(test.checkins_count || 0));
        var resolvedElapsed = Math.max(0, (userTestingDay || 0) - (hasCheckedToday ? 0 : 1));
        var standardElapsed = Math.min(14, resolvedElapsed);
        standardCheckins = Math.min(14, totalCheckins);
        standardSkips = Math.max(0, standardElapsed - standardCheckins);
        var overtimeElapsed = Math.max(0, resolvedElapsed - 14);
        overtimeCheckins = Math.max(0, totalCheckins - 14);
        overtimeSkips = Math.max(0, overtimeElapsed - overtimeCheckins);
        renderTimeline = ''
            + '1'.repeat(standardCheckins)
            + '0'.repeat(standardSkips)
            + '2'.repeat(overtimeCheckins)
            + '3'.repeat(overtimeSkips);
    }

    var baseSegments = [];
    for (var day = 1; day <= 14; day++) {
        baseSegments.push(getDayState(day));
    }

    const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
    const lastPaidDay = 14 + extraPaid;

    var overtimeSegments = [];
    for (var overtimeDay = 15; overtimeDay <= lastPaidDay; overtimeDay++) {
        var cls = 'future';
        if (currentDay === null || overtimeDay < currentDay) {
            cls = 'past';
        } else if (currentDay === overtimeDay) {
            cls = 'current';
        }
        overtimeSegments.push('<span class="grant-shield ' + cls + '" data-day="' + overtimeDay + '">🛡️</span>');
    }

    const isPendingCompletion = String(test.app_status || test.status || '').toLowerCase() === 'pending_completion';
    const isInSafetyBuffer = isPendingCompletion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);

    const createdTime = test.created_at ? new Date(test.created_at).getTime() : Date.now();
    const pendingStartedAt = test.pending_completion_started_at ? new Date(test.pending_completion_started_at).getTime() : null;
    const bufferStart = (isPendingCompletion && pendingStartedAt)
        ? new Date(pendingStartedAt)
        : new Date(createdTime + (14 * 24 * 60 * 60 * 1000) + (extraPaid * 24 * 60 * 60 * 1000));
    const bufferEndTime = bufferStart.getTime() + (48 * 60 * 60 * 1000);
    const remainingMs = Math.max(0, bufferEndTime - Date.now());
    const remainingTotalMinutes = Math.floor(remainingMs / (60 * 1000));
    const remainingHours = Math.floor(remainingTotalMinutes / 60);
    const remainingMinutes = remainingTotalMinutes % 60;

    let bufferBadgeHtml = '';
    if (isProjectSynced(test) || userTestingDay >= 15 || extraPaid > 0) {
        if (isInSafetyBuffer) {
            const timeText = lang === 'ru' 
                ? `⏳ Осталось ${remainingHours}ч ${remainingMinutes}м` 
                : `⏳ Remaining ${remainingHours}h ${remainingMinutes}m`;
            bufferBadgeHtml = '<span class="timeline-buffer-badge active">' + timeText + '</span>';
        } else {
            const timeText = lang === 'ru' ? '+⏳ 48ч' : '+⏳ 48h';
            bufferBadgeHtml = '<span class="timeline-buffer-badge inactive">' + timeText + '</span>';
        }
    }

    var remainingDays = Math.max(0, totalDays - renderTimeline.length);
    const showOvertimeRow = !options.hideOvertimeRow && (extraPaid > 0 || isInSafetyBuffer || userTestingDay >= 15 || isProjectSynced(test));
    const rangeText = lastPaidDay > 14 ? '15-' + lastPaidDay : '15+';

    const noteText = extraPaid > 0
        ? (lang === 'ru' 
            ? 'Награда за чекин: +0.5 ☯️ Кармы и доля из фонда💎$BUST' 
            : 'Reward for check-in: +0.5 ☯️ Karma and a share of the 💎$BUST pool')
        : window.t('timelineOvertimeRewardNote', {}, lang);

    var html = '<div class="timeline-compact">' +
        '<div class="timeline-row">' +
            '<div class="timeline-row-head">' +
                '<span class="timeline-row-title">' + window.escapeHTML(window.t('timelinePrimaryTitle', {}, lang)) + '</span>' +
                '<span class="timeline-row-range">1-14</span>' +
            '</div>' +
            '<div class="grant-progress-container timeline-row-track is-primary">' + baseSegments.join('') + '</div>' +
        '</div>' +
        (showOvertimeRow
            ? '<div class="timeline-row timeline-row-overtime">' +
                '<div class="timeline-row-head">' +
                    '<span class="timeline-row-title">' + window.escapeHTML(window.t('timelineOvertimeTitle', {}, lang)) + '</span>' +
                    '<span class="timeline-row-range">' + rangeText + '</span>' +
                '</div>' +
                '<div class="grant-progress-container timeline-row-track is-overtime" style="display: flex; align-items: center; gap: 8px;">' + 
                    overtimeSegments.join('') + 
                    bufferBadgeHtml + 
                '</div>' +
                '<div class="timeline-row-note">' + window.escapeHTML(noteText) + '</div>' +
            '</div>'
            : '') +
    '</div>';

    return {
        html: html,
        baseSegmentsHtml: baseSegments.join(''),
        standardCheckins: standardCheckins,
        standardSkips: standardSkips,
        overtimeCheckins: overtimeCheckins,
        overtimeSkips: overtimeSkips,
        remainingDays: remainingDays,
        totalDays: totalDays,
        currentDay: currentDay,
        currentDayState: currentDayState,
    };
}

function getUserTestingDay(startDate, explicitTestingDays) {
    var resolvedTestingDays = Number(explicitTestingDays || 0);
    if (Number.isFinite(resolvedTestingDays) && resolvedTestingDays > 0) {
        return resolvedTestingDays;
    }
    if (!startDate) return null;
    const startedAt = new Date(startDate);
    if (Number.isNaN(startedAt.getTime())) return null;
    const today = new Date(getLocalDate());
    return Math.floor((today - startedAt) / (1000 * 60 * 60 * 24)) + 1;
}

function isMandatoryScreenshotDay(testingDay) {
    return [1, 4, 7, 10, 14].includes(testingDay);
}

function isScreenshotOnlyControlDay(testingDay) {
    return Number(testingDay || 0) === 1;
}

function getOwnerActiveStatus(lastOwnerActivity) {
    return getOwnerActivityMeta(lastOwnerActivity).tone === 'online';
}

function getOwnerActivityMeta(lastOwnerActivity) {
    if (!lastOwnerActivity) {
        return {
            tone: 'offline',
            chipClass: 'accent-red',
            detailClass: 'offline',
            label: window.t('ownerInactiveText', {}, lang),
        };
    }
    const dt = new Date(lastOwnerActivity);
    if (Number.isNaN(dt.getTime())) {
        return {
            tone: 'offline',
            chipClass: 'accent-red',
            detailClass: 'offline',
            label: window.t('ownerInactiveText', {}, lang),
        };
    }
    const diffMs = Date.now() - dt.getTime();
    if (diffMs < (24 * 60 * 60 * 1000)) {
        return {
            tone: 'online',
            chipClass: 'accent-green',
            detailClass: 'online',
            label: window.t('ownerActiveRecentText', {}, lang),
        };
    }
    if (diffMs < (72 * 60 * 60 * 1000)) {
        return {
            tone: 'warm',
            chipClass: 'accent-yellow',
            detailClass: 'warm',
            label: window.t('ownerSeen13DaysText', {}, lang),
        };
    }
    return {
        tone: 'offline',
        chipClass: 'accent-red',
        detailClass: 'offline',
        label: window.t('ownerInactiveText', {}, lang),
    };
}

function getOwnerDetailStatusText(lastOwnerActivity) {
    if (!lastOwnerActivity) {
        return window.t('ownerStatusUnknownText', {}, lang);
    }
    const dt = new Date(lastOwnerActivity);
    if (Number.isNaN(dt.getTime())) {
        return window.t('ownerStatusUnknownText', {}, lang);
    }
    const dayMs = 24 * 60 * 60 * 1000;
    const diffMs = Math.max(0, Date.now() - dt.getTime());
    if (diffMs < dayMs) {
        return window.t('ownerStatusRecentText', {}, lang);
    }
    const diffDays = Math.max(1, Math.floor(diffMs / dayMs));
    if (diffDays <= 3) {
        return window.t('ownerStatusFewDaysText', {}, lang);
    }
    return window.t('ownerStatusLastSeenDaysText', { count: diffDays }, lang);
}

function getRewardsChipLabel(rewardsSummary) {
    const rewardsKarma = Number(rewardsSummary && rewardsSummary.total_karma || 0);
    const rewardsBust = Number(rewardsSummary && rewardsSummary.total_bust || 0);
    if (rewardsKarma <= 0 && rewardsBust <= 0) {
        return '';
    }
    if (rewardsKarma > 0 && rewardsBust > 0) {
        return window.t('appRewardsChipLabel', {
            karma: formatAmountValue(rewardsKarma, 1),
            bust: formatAmountValue(rewardsBust, 1),
        }, lang);
    }
    if (rewardsKarma > 0) {
        return window.t('appRewardsChipKarmaOnly', {
            karma: formatAmountValue(rewardsKarma, 1),
        }, lang);
    }
    return window.t('appRewardsChipBustOnly', {
        bust: formatAmountValue(rewardsBust, 1),
    }, lang);
}

function getOwnerLastSeenToastText(lastOwnerActivity) {
    if (!lastOwnerActivity) {
        return window.t('ownerLastSeenUnknown', {}, lang);
    }
    const dt = new Date(lastOwnerActivity);
    if (Number.isNaN(dt.getTime())) {
        return window.t('ownerLastSeenUnknown', {}, lang);
    }
    const diffMs = Math.max(0, Date.now() - dt.getTime());
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
        return window.t('ownerLastSeenJustNow', {}, lang);
    }
    if (diffHours < 24) {
        return window.t('ownerLastSeenHoursAgo', { count: diffHours }, lang);
    }
    return window.t('ownerLastSeenDaysAgo', { count: Math.max(1, diffDays) }, lang);
}

function showOwnerLastSeenToast(lastOwnerActivity) {
    try {
        if (window.tg && window.tg.HapticFeedback && typeof window.tg.HapticFeedback.impactOccurred === 'function') {
            window.tg.HapticFeedback.impactOccurred('light');
        }
    } catch (e) {}
    showToast(getOwnerLastSeenToastText(lastOwnerActivity));
}

function getProjectSyncStartDay(test) {
    var syncDay = Number(test && test.google_sync_day || 0);
    return Number.isFinite(syncDay) && syncDay >= 1 ? syncDay : 0;
}

function hasManualProjectSync(test) {
    var lastSyncDate = parseLocalDateOnly(test && test.last_sync_date);
    if (!(lastSyncDate && !Number.isNaN(lastSyncDate.getTime()))) {
        return false;
    }
    var createdAt = parseLocalDateOnly(test && test.created_at);
    if (createdAt && lastSyncDate < createdAt) {
        return false;
    }
    return true;
}

function hasMeaningfulProjectSync(test) {
    if (getProjectSyncStartDay(test) < 1 || !hasManualProjectSync(test)) {
        return false;
    }
    if (test && test.sync_message && String(test.sync_message).trim()) {
        return true;
    }
    if (getProjectSyncStartDay(test) > 1) {
        return true;
    }
    var createdAt = parseLocalDateOnly(test && test.created_at);
    var lastSyncDate = parseLocalDateOnly(test && test.last_sync_date);
    if (createdAt && lastSyncDate && createdAt.getTime() !== lastSyncDate.getTime()) {
        return true;
    }
    return !!(test && test.sync_notification_sent);
}

function isProjectSynced(test) {
    return hasMeaningfulProjectSync(test);
}

function buildTestOwnerSubtitle(test) {
    if (!test || typeof test !== 'object') return '';
    var username = String(test.owner_username || '').trim().replace(/^@+/, '');
    var fullName = String(test.owner_full_name || '').trim();
    if (fullName && username) {
        return window.t('testCardOwnerSubtitle', { name: fullName, username: username }, lang);
    }
    if (username) {
        return window.t('testCardOwnerUsernameOnly', { username: username }, lang);
    }
    return fullName;
}

function getProjectCurrentGoogleDay(test, fallbackDay) {
    var syncDay = getProjectSyncStartDay(test);
    if (!syncDay) {
        var fallback = Number(fallbackDay || 0);
        return Number.isFinite(fallback) ? Math.max(0, fallback) : 0;
    }

    var syncDiffDays = test && test.last_sync_date ? getDayDiffFromToday(test.last_sync_date) : 0;
    return syncDay + Math.max(0, syncDiffDays);
}

function isProjectUpdateTipDismissed(appId) {
    const key = 'update_tip_dismissed_' + String(Number(appId) || 0);
    if (key.endsWith('_0')) {
        return true;
    }
    try {
        return localStorage.getItem(key) === 'true';
    } catch (error) {
        return false;
    }
}

function dismissProjectUpdateTip(appId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const normalizedId = Number(appId) || 0;
    if (!normalizedId) {
        return false;
    }
    try {
        localStorage.setItem('update_tip_dismissed_' + String(normalizedId), 'true');
    } catch (error) {}
    const banner = document.getElementById('update-tip-' + normalizedId);
    if (banner) {
        banner.remove();
    }
    try {
        if (window.tg && window.tg.HapticFeedback && typeof window.tg.HapticFeedback.impactOccurred === 'function') {
            window.tg.HapticFeedback.impactOccurred('light');
        }
    } catch (error) {}
    return false;
}

function getScreenshotReminderHtml(test) {
    const testingDay = getResolvedTestingDay(test);
    if (!isMandatoryScreenshotDay(testingDay)) {
        return '';
    }

    const safeReminderText = (t.screenshotReminderText || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const dmButton = test.owner_username
        ? `<button class="btn btn-secondary" style="width: 100%; background-color: var(--button-color, #007aff); color: var(--button-text-color, #fff); border: none;" onclick="return openTelegramProfile('${test.owner_username}', event)">${t.screenshotReminderBtn}</button>`
        : '';

    return `
        <div class="screenshot-reminder">
            <div class="screenshot-reminder-title" style="cursor: pointer;" onclick="event.stopPropagation(); showToast('${safeReminderText}')">${t.screenshotReminderTitle}</div>
            ${dmButton}
        </div>
    `;
}

function getTestSourceChip(test) {
    if (test && (test.accepts_email_testers || String(test.test_mode || '').toLowerCase() === 'email_list')) {
        const label = window.t('emailTestBadge', {}, lang);
        return `<span class="meta-chip accent-orange" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(window.t('emailTestModeChipToast', {}, lang))}')">✉️ ${window.escapeHTML(label)}</span>`;
    }
    const joinType = String(test && test.join_type || '').toLowerCase();
    if (joinType === 'bounty') {
        const bountyVal = test && test.bounty_per_tester ? Number(test.bounty_per_tester) : 0;
        return `<span class="meta-chip accent-purple" style="cursor: pointer;" onclick="openBountyInfoModal(${test.id}, event)">💎 ${window.escapeHTML(window.t('testSourceBounty', {}, lang))} +${bountyVal}</span>`;
    }
    if (joinType === 'prelaunch') {
        return `<span class="meta-chip accent-blue">🚀 ${window.escapeHTML(window.t('testSourcePrelaunch', {}, lang))}</span>`;
    }
    if (joinType === 'mutual') {
        return `<span class="meta-chip accent-green">🤝 ${window.escapeHTML(window.t('testSourceMutual', {}, lang))}</span>`;
    }
    if (joinType === 'direct' || joinType === 'invite') {
        return `<span class="meta-chip">🔗 ${window.escapeHTML(window.t('testSourceInvite', {}, lang))}</span>`;
    }
    return '';
}

function getTesterSourceMeta(joinType) {
    const normalized = String(joinType || 'invite').toLowerCase();
    if (normalized === 'bounty') {
        return { icon: '💎', label: window.t('testerSourceBountyFull', {}, lang) };
    }
    if (normalized === 'mutual') {
        return { icon: '🤝', label: window.t('testerSourceMutualFull', {}, lang) };
    }
    if (normalized === 'prelaunch') {
        return { icon: '🚀', label: window.t('testerSourcePrelaunchFull', {}, lang) };
    }
    if (normalized === 'direct' || normalized === 'invite') {
        return { icon: '🔗', label: window.t('testerSourceInviteNoMutualFull', {}, lang) };
    }
    return { icon: '🔗', label: window.t('testerSourceInviteNoMutualFull', {}, lang) };
}

function buildRunIterationChip(item, className) {
    const normalizedIteration = Number((item && item.run_iteration) || 1);
    if (!Number.isFinite(normalizedIteration) || normalizedIteration <= 1) {
        return '';
    }
    if (!item || typeof isProjectSynced !== 'function' || !isProjectSynced(item)) {
        return '';
    }
    return `<span class="${className || 'meta-chip accent-blue'}">${window.escapeHTML(window.t('projectRunIterationChip', { count: normalizedIteration }, lang))}</span>`;
}

function _isMutualOfferProjectCandidate(project) {
    if (!project || !project.id) return false;
    var mode = String(project.mode || '').toLowerCase();
    if (mode !== 'mutual' && mode !== 'hybrid') return false;
    var projectStatus = String(project.status || 'active').toLowerCase();
    return projectStatus !== 'archived';
}

function getMutualOfferProjectChoicesForOwner(targetOwnerId) {
    var normalizedTargetOwnerId = Number(targetOwnerId || 0);
    var normalizedUserId = Number(userId || 0);
    var projects = Array.isArray(myProjects) ? myProjects : [];

    if (!normalizedTargetOwnerId || !normalizedUserId || normalizedTargetOwnerId === normalizedUserId) {
        return [];
    }

    return projects.filter(_isMutualOfferProjectCandidate);
}

function getAvailableMutualProjectsForOwner(targetOwnerId) {
    var normalizedTargetOwnerId = Number(targetOwnerId || 0);
    if (!normalizedTargetOwnerId) return [];

    return getMutualOfferProjectChoicesForOwner(targetOwnerId).filter(function(project) {
        var testers = Array.isArray(project.testers) ? project.testers : [];
        var activeMutualTesters = testers.filter(function(tester) {
            return String(tester && tester.join_type || 'invite').toLowerCase() !== 'bounty';
        }).length;
        var limitMutual = Math.max(1, Number(project.limit_mutual || 0));
        if (activeMutualTesters >= limitMutual) {
            return false;
        }

        return !testers.some(function(tester) {
            return Number(tester && tester.tester_id || 0) === normalizedTargetOwnerId;
        });
    });
}

function canProposeMutualFromTest(test) {
    var targetOwnerId = Number(test && test.owner_id || 0);
    var joinType = String(test && test.join_type || '').toLowerCase();
    var appStatus = String(test && test.app_status || 'active').toLowerCase();

    if (!targetOwnerId || targetOwnerId === Number(userId || 0)) {
        return false;
    }
    if (joinType === 'mutual' || appStatus === 'archived') {
        return false;
    }
    if (Number(test && test.reciprocal_app_id || 0) > 0) {
        return false;
    }

    return getAvailableMutualProjectsForOwner(targetOwnerId).length > 0;
}

function buildProposeMutualChip(test) {
    if (!canProposeMutualFromTest(test)) {
        return '';
    }

    return `<button class="meta-chip accent-blue" onclick="createMutualOffer(${Number(test.id || 0)}, ${Number(test.owner_id || 0)}, event)">${window.escapeHTML(window.t('proposeMutualBtn', {}, lang))}</button>`;
}

function renderCompactMeta(daysSincePublish, activeTestersCount, isNew, userTestingDay, test, options) {
    options = options || {};
    var showTestersCount = options.showTestersCount !== false;
    const parts = [];
    if (test) {
        const sourceChip = getTestSourceChip(test);
        if (sourceChip) {
            parts.push(sourceChip);
        }
        const proposeMutualChip = buildProposeMutualChip(test);
        if (proposeMutualChip) {
            parts.push(proposeMutualChip);
        }
        const runIterationChip = buildRunIterationChip(test);
        if (runIterationChip) {
            parts.push(runIterationChip);
        }
        if (test.app_status === 'archived') {
            var archiveLabel = test.archive_reason === 'afk' ? t.archivedAfkBadge : t.archivedBadge;
            var archiveToast = test.archive_reason === 'afk' ? (t.archivedAfkToast || '').replace(/'/g, "\\'") : '';
            var archiveOnclick = archiveToast ? "event.stopPropagation(); showToast('" + archiveToast + "')" : 'event.stopPropagation()';
            parts.push('<button class="meta-chip accent-red" onclick="' + archiveOnclick + '">' + archiveLabel + '</button>');
        }
    }
    if (typeof daysSincePublish === 'number' && daysSincePublish >= 0) {
        const dayLabel = t.daysShort.replace('{days}', daysSincePublish);
        const tooltip = t.chipTooltipDays.replace('{days}', daysSincePublish);
        parts.push(`<button class="meta-chip" onclick="event.stopPropagation(); showToast('${tooltip.replace(/'/g, "\\'")}')">${dayLabel}</button>`);
    }
    if (showTestersCount && typeof activeTestersCount === 'number') {
        const testerLabel = t.testersShort.replace('{count}', activeTestersCount);
        const tooltip = t.chipTooltipTesters.replace('{count}', activeTestersCount);
        parts.push(`<button class="meta-chip" onclick="event.stopPropagation(); showToast('${tooltip.replace(/'/g, "\\'")}')">${testerLabel}</button>`);
    }
    if (typeof userTestingDay === 'number' && userTestingDay > 0) {
        const dayText = t.myTestDayShort.replace('{days}', userTestingDay);
        const isScreenshot = isMandatoryScreenshotDay(userTestingDay);
        const screenshotIcon = isScreenshot ? ' 📸' : '';
        const chipClass = isScreenshot ? 'meta-chip accent-orange' : 'meta-chip accent-blue';
        parts.push(`<button class="${chipClass}" onclick="event.stopPropagation(); showTestDayPopup(${userTestingDay})">${dayText}${screenshotIcon}</button>`);
    }
    if (isNew) {
        parts.unshift(`<button class="meta-chip accent-green">${t.newBadge}</button>`);
    }
    if (test) {
        const reviewStatus = typeof window.getPlayReviewStatus === 'function'
            ? window.getPlayReviewStatus(test)
            : String(test.play_review_status || 'none').toLowerCase();
        const canShowReviewChip = !!(
            test.request_reviews
            && Number(userTestingDay || 0) >= 7
            && String(test.progress_status || 'active').toLowerCase() === 'active'
        );
        if (canShowReviewChip) {
            let reviewLabel = window.t('playReviewChip', {}, lang);
            let reviewClass = 'meta-chip accent-yellow';
            if (reviewStatus === 'pending') {
                reviewLabel = '⭐️ ' + window.t('playReviewDetailsPendingChip', {}, lang);
                reviewClass = 'meta-chip accent-blue';
            } else if (reviewStatus === 'approved') {
                reviewLabel = '⭐️ ' + window.t('playReviewDetailsCompletedChip', {}, lang);
                reviewClass = 'meta-chip accent-green';
            } else if (reviewStatus === 'rejected') {
                reviewLabel = '⭐️ ' + window.t('playReviewDetailsRejectedChip', {}, lang);
                reviewClass = 'meta-chip accent-red';
            }
            parts.push(`<button class="${reviewClass}" onclick="openPlayReviewModal(${Number(test.id)}, event)">${window.escapeHTML(reviewLabel)}</button>`);
        }
        const rewardsSummary = (test.rewards_summary && typeof test.rewards_summary === 'object') ? test.rewards_summary : null;
        const rewardChipLabel = getRewardsChipLabel(rewardsSummary);
        if (rewardChipLabel) {
            const rewardLabel = window.escapeHTML(rewardChipLabel);
            parts.push(`<button class="meta-chip accent-green notranslate" onclick="event.stopPropagation(); openProjectDetailsModal(${Number(test.id)})">${rewardLabel}</button>`);
        }
        if (isProjectSynced(test)) {
            const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
            const userTestingDayRaw = getResolvedTestingDay(test);
            const userTestingDay = typeof userTestingDayRaw === 'number' && userTestingDayRaw > 0 ? userTestingDayRaw : 1;
            const isPendingCompletion = !!test.is_pending_completion;
            const isInSafetyBuffer = isPendingCompletion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);

            if (userTestingDay >= 15) {
                if (!isInSafetyBuffer) {
                    const protectedText = lang === 'ru' ? '🛡 Защищён' : '🛡 Protected';
                    parts.push(`<button class="meta-chip accent-protection" onclick="event.stopPropagation(); showToast('${(t.syncDoneText || '').replace(/'/g, "\\'")}')">${protectedText}</button>`);
                }
            }
        }
    }
    if (Array.isArray(options.extraParts)) {
        options.extraParts.forEach(function(part) {
            if (part) {
                parts.push(part);
            }
        });
    }
    if (parts.length === 0) {
        return '';
    }
    return `<div style="margin-bottom: 12px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">${parts.join('')}</div>`;
}

function isRegularTestingPhaseCard(test) {
    if (!test || !!test.is_external) {
        return false;
    }
    const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
    const userTestingDay = getResolvedTestingDay(test);
    const isPendingCompletion = !!test.is_pending_completion;
    const isInSafetyBuffer = isPendingCompletion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);
    if (isInSafetyBuffer) {
        return false;
    }
    const day = typeof userTestingDay === 'number' ? userTestingDay : 0;
    return day >= 1 && day <= 14;
}

function renderTestCardDetailsButton(testId) {
    const ariaLabel = window.escapeHTML(window.t('testCardDetailsBtnAria', {}, lang));
    return `<button type="button" class="btn-icon test-card-details-btn" aria-label="${ariaLabel}" onclick="openProjectDetailsModal(${Number(testId)}); event.stopPropagation();">🔍</button>`;
}

function openTelegramProfile(username, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const cleanUsername = (username || '').replace('@', '').trim();
    if (!cleanUsername) {
        return false;
    }
    const url = `https://t.me/${cleanUsername}`;
    try {
        tg.openTelegramLink(url);
    } catch (error) {
        try {
            tg.openLink(url);
        } catch (fallbackError) {
            window.location.href = url;
        }
    }
    return true;
}

function renderIncomingOffers() {
    if (!arguments[0] && !isTabVisible('tests')) {
        if (_offersTimerId) {
            clearInterval(_offersTimerId);
            _offersTimerId = null;
        }
        return;
    }
    const section = document.getElementById('offers-section');
    const countEl = document.getElementById('offers-count');
    const carousel = document.getElementById('offers-carousel');
    if (!section || !countEl || !carousel) return;

    if (_offersTimerId) {
        clearInterval(_offersTimerId);
        _offersTimerId = null;
    }

    const pending = (incomingOffers || []).filter((offer) => !!offer && offer.status === 'pending');
    const isLoading = !!_offersInFlight;
    countEl.innerText = t.offersCount.replace('{count}', pending.length);

    if (!pending.length) {
        if (isLoading && !_offersLoadedOnce) {
            section.style.display = '';
            showSkeleton('offers-carousel');
            return;
        }
        if (_offersLoadError && !_offersLoadedOnce) {
            section.style.display = '';
            showRetry('offers-carousel', 'loadIncomingOffers()');
            return;
        }
        section.style.display = 'none';
        carousel.innerHTML = '';
        return;
    }

    section.style.display = '';
    carousel.innerHTML = pending.map((offer) => {
        const username = (offer.proposer_username || '').replace(/@/g, '');
        const safeUsername = escapeInlineJsString(username);
        const displayName = window.escapeHTML(username
            ? `@${username}`
            : (offer.proposer_full_name || window.t('idLabel', { id: offer.proposer_id }, lang)));
        const remain = formatOfferRemaining(offer.created_at);
        const leftTimeText = window.t('offerTimeLeftValue', { hours: remain ? remain.hours : 0, minutes: remain ? remain.minutes : 0 }, lang);
        const expireText = remain ? window.t('offerTimeLeft', { time: leftTimeText }, lang) : window.t('offerTimeUnknown', {}, lang);
        const targetAppName = offer.target_app_name || window.t('unknownLabel', {}, lang);
        const proposerAppName = offer.proposer_app_name || window.t('unknownLabel', {}, lang);

        return `
            <div class="offer-card" data-offer-id="${offer.offer_id}">
                <div class="offer-top">
                    <button class="offer-user" onclick="openTesterDossier('${safeUsername}', ${offer.proposer_id}, ${offer.target_app_id}); event.stopPropagation();">${displayName}</button>
                    <span class="meta-chip accent-yellow">☯️ ${offer.proposer_karma || 0}</span>
                </div>
                <div class="offer-sub">${window.escapeHTML(window.t('offerForApp', { target_app: targetAppName }, lang))}</div>
                <div class="offer-sub">${window.escapeHTML(window.t('offerWithApp', { proposer_app: proposerAppName }, lang))}</div>
                <div class="offer-expire">${expireText}</div>
                <div class="action-row" style="margin-top: 10px;">
                    <button class="btn btn-success" style="flex: 1;" onclick="decideOffer(${offer.offer_id}, 'accept', event)">${window.t('offerAcceptBtn', {}, lang)}</button>
                    <button class="btn" style="flex: 1; background-color: rgba(255,59,48,0.12); color: #ff3b30;" onclick="decideOffer(${offer.offer_id}, 'reject', event)">${window.t('offerRejectBtn', {}, lang)}</button>
                </div>
            </div>
        `;
    }).join('');

    _offersTimerId = setInterval(() => {
        const section = document.getElementById('offers-section');
        if (!section || section.style.display === 'none') {
            clearInterval(_offersTimerId);
            _offersTimerId = null;
            return;
        }
        let hasExpired = false;
        pending.forEach((offer) => {
            const card = section.querySelector(`.offer-card[data-offer-id="${offer.offer_id}"]`);
            if (!card) return;
            const expireEl = card.querySelector('.offer-expire');
            const remain = formatOfferRemaining(offer.created_at);
            if (!remain) {
                hasExpired = true;
                if (expireEl) {
                    expireEl.textContent = window.t('offerTimeUnknown', {}, lang);
                }
                return;
            }
            if (expireEl) {
                const leftTimeText = window.t('offerTimeLeftValue', { hours: remain.hours, minutes: remain.minutes }, lang);
                expireEl.textContent = window.t('offerTimeLeft', { time: leftTimeText }, lang);
            }
        });

        if (hasExpired) {
            clearInterval(_offersTimerId);
            _offersTimerId = null;
        }
    }, 1000);
}

function formatKarmaValue(value) {
    var safe = Number(value);
    if (!Number.isFinite(safe)) return '0.0';
    return safe.toFixed(1);
}

function getExternalCurrentTestingDay(record) {
    var explicitDay = Number(record && record.testing_days || 0) || 0;
    if (explicitDay > 0) {
        return Math.max(1, explicitDay);
    }

    if (record && record.start_date) {
        var computedDay = Number(getUserTestingDay(record.start_date) || 0);
        if (computedDay > 0) {
            return Math.max(1, computedDay);
        }
    }

    var lastCompletedDay = Number(record && record.external_last_completed_control_day || 0) || 0;
    return Math.max(1, lastCompletedDay || 1);
}

function isExternalControlDayDue(test) {
    if (!test || !test.is_external) {
        return false;
    }
    return isMandatoryScreenshotDay(getExternalCurrentTestingDay(test));
}

function getExternalDisplayTestingDay(record) {
    return getExternalCurrentTestingDay(record);
}

function renderExternalPost14ChoiceBlock(test) {
    if (!test) {
        return '';
    }
    var actualDay = getExternalCurrentTestingDay(test);
    return `
        <div class="external-post14-banner">
            <div class="external-post14-title">${window.escapeHTML(window.t('externalProjectPost14Banner', { day: actualDay }, lang))}</div>
            <div class="external-post14-subtitle">${window.escapeHTML(window.t('externalProjectPost14Hint', {}, lang))}</div>
            <div class="action-row external-tests-actions external-tests-actions-post14">
                <button type="button" class="btn btn-secondary" onclick="cancelExternalTestingFromUi(${Number(test.id || 0)}, event)">
                    ${window.escapeHTML(window.t('externalProjectFinishTestBtn', {}, lang))}
                </button>
                <button type="button" class="btn" onclick="activateExternalContinueModeFromUi(${Number(test.id || 0)}, event)">
                    ${window.escapeHTML(window.t('externalProjectContinueBtn', {}, lang))}
                </button>
            </div>
        </div>
    `;
}

function getNextExternalControlDayMeta(test) {
    var controlDays = [1, 4, 7, 10, 14];
    var currentDay = getExternalCurrentTestingDay(test);
    var lastCompletedDay = Number(test && test.external_last_completed_control_day || 0);
    var nextControlDay = 0;

    if (isMandatoryScreenshotDay(currentDay) && lastCompletedDay < currentDay) {
        return {
            currentDay: currentDay,
            nextControlDay: currentDay,
            daysLeft: 0,
        };
    }

    controlDays.some(function(day) {
        if (day > currentDay) {
            nextControlDay = day;
            return true;
        }
        return false;
    });

    return {
        currentDay: currentDay,
        nextControlDay: nextControlDay,
        daysLeft: nextControlDay > 0 ? Math.max(0, nextControlDay - currentDay) : 0,
    };
}

var _externalContinueModeState = null;
var _externalContinueModeStorageKey = 'devtest_external_continue_mode_v1';

function _loadExternalContinueModeState() {
    if (_externalContinueModeState && typeof _externalContinueModeState === 'object') {
        return _externalContinueModeState;
    }
    try {
        var raw = localStorage.getItem(_externalContinueModeStorageKey);
        var parsed = raw ? JSON.parse(raw) : {};
        _externalContinueModeState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        _externalContinueModeState = {};
    }
    return _externalContinueModeState;
}

function _persistExternalContinueModeState() {
    try {
        var state = _loadExternalContinueModeState();
        if (!state || !Object.keys(state).length) {
            localStorage.removeItem(_externalContinueModeStorageKey);
            return;
        }
        localStorage.setItem(_externalContinueModeStorageKey, JSON.stringify(state));
    } catch (error) {}
}

function getExternalContinueModeKey(test) {
    var progressId = Number(test && test.progress_id || 0);
    var startDate = String(test && test.start_date || '').trim();
    if (progressId <= 0 || !startDate) return '';
    return String(progressId) + ':' + startDate;
}

function syncExternalContinueModeState() {
    if (typeof _testsLoadedOnce !== 'undefined' && !_testsLoadedOnce) {
        return;
    }
    var state = _loadExternalContinueModeState();
    var tests = Array.isArray(myTests) ? myTests : [];
    if (!tests.length) {
        return;
    }
    var validKeys = {};
    var didChange = false;

    tests.forEach(function(test) {
        if (!test || !test.is_external) return;
        var key = getExternalContinueModeKey(test);
        if (!key) return;
        validKeys[key] = true;
    });

    Object.keys(state).forEach(function(key) {
        if (!validKeys[key]) {
            delete state[key];
            didChange = true;
        }
    });

    if (didChange) {
        _persistExternalContinueModeState();
    }
}

function isExternalContinueModeEnabled(test) {
    if (!test || !test.is_external) return false;
    var meta = getNextExternalControlDayMeta(test);
    if (meta.nextControlDay) return false;
    var key = getExternalContinueModeKey(test);
    if (!key) return false;
    return !!_loadExternalContinueModeState()[key];
}

function setExternalContinueModeEnabled(test, enabled) {
    var key = getExternalContinueModeKey(test);
    if (!key) return;
    var state = _loadExternalContinueModeState();
    if (enabled) {
        state[key] = true;
    } else {
        delete state[key];
    }
    _persistExternalContinueModeState();
}

function activateExternalContinueModeFromUi(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    var test = getExternalProjectTest(testId);
    if (!test || !getExternalStatusPresentation(test).isPostControlWindow) return;

    setExternalContinueModeEnabled(test, true);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    renderTests(true);
}

function getExternalStatusPresentation(test) {
    var meta = getNextExternalControlDayMeta(test);
    var isDoneToday = String(test && test.status || '') === 'done';
    var lastCheckDate = String(test && test.last_check_date || '').trim();
    var statusText = '';
    var substatusText = '';

    if (isDoneToday) {
        statusText = window.t('externalProjectCheckedTodayBtn', {}, lang);
        substatusText = meta.nextControlDay
            ? window.t('externalTestsNextControlDay', { day: meta.nextControlDay, count: meta.daysLeft }, lang)
            : window.t('externalTestsAllControlsDone', {}, lang);
    } else if (test && isExternalControlDayDue(test)) {
        statusText = window.t('externalTestsControlDayDue', { day: meta.currentDay }, lang);
        substatusText = lastCheckDate
            ? window.t('externalTestsLastCheckin', { date: formatDdMmYyyy(lastCheckDate) }, lang)
            : '';
    } else if (meta.nextControlDay) {
        statusText = window.t('externalTestsNextControlDay', { day: meta.nextControlDay, count: meta.daysLeft }, lang);
        substatusText = lastCheckDate
            ? window.t('externalTestsLastCheckin', { date: formatDdMmYyyy(lastCheckDate) }, lang)
            : '';
    } else {
        statusText = window.t('externalTestsAllControlsDone', {}, lang);
        substatusText = lastCheckDate
            ? window.t('externalTestsLastCheckin', { date: formatDdMmYyyy(lastCheckDate) }, lang)
            : '';
    }

    return {
        meta: meta,
        statusText: statusText,
        substatusText: substatusText,
        isDoneToday: isDoneToday,
        isPostControlWindow: !meta.nextControlDay,
    };
}

function isExternalNormalCheckinDay(test) {
    if (!test || String(test.status || '') === 'done') {
        return false;
    }
    return !isExternalControlDayDue(test);
}

function getExternalConfirmButtonClasses(test, includeSplitMain) {
    var classes = ['btn', 'external-tests-confirm-btn'];
    if (includeSplitMain !== false) {
        classes.push('split-btn-main');
    }
    if (String(test && test.status || '') === 'done') {
        classes.push('is-tested');
    } else if (isExternalNormalCheckinDay(test)) {
        classes.push('external-tests-confirm-ready');
    }
    return classes.join(' ');
}

function renderExternalContinuedActions(test, safePackageInline, ownerUsername) {
    if (!test || String(test.status || '') === 'done') {
        return '';
    }
    var safeOwner = escapeInlineJsString(ownerUsername || '');
    return `
        <div class="action-row external-tests-actions" id="external-test-actions-${Number(test.id || 0)}">
            <button class="btn btn-secondary external-tests-open-btn" onclick="event.stopPropagation(); startTimer(${Number(test.id || 0)}, '${safePackageInline}', false, '')">
                ${window.escapeHTML(t.openBtn)}
            </button>
            <div class="split-btn-group external-tests-confirm-group" onclick="event.stopPropagation();">
                <button id="btn-confirm-${Number(test.id || 0)}" class="${getExternalConfirmButtonClasses(test)}" onclick="sendExternalDailyCheckinFromUi(${Number(test.id || 0)}, event)">
                    ${window.escapeHTML(window.t('externalProjectCheckinBtn', {}, lang))}
                </button>
                <button type="button" class="btn external-tests-attach-btn split-btn-options" onclick="openExternalCheckinOptionsModal(${Number(test.id || 0)}, '${safeOwner}', event)" aria-label="${window.escapeHTML(window.t('externalProjectAttachmentAria', {}, lang))}">${window.escapeHTML(window.t('externalProjectAttachmentBtn', {}, lang))}</button>
            </div>
        </div>
    `;
}

function renderExternalGuestTestsSection() {
    var section = document.getElementById('external-tests-section');
    var countNode = document.getElementById('external-tests-count');
    var titleNode = document.getElementById('t-externalTestsSectionTitle');
    var infoLinkNode = document.getElementById('t-externalTestsInfoLink');
    var scrollWrap = document.getElementById('external-tests-scroll-wrap');
    var list = document.getElementById('external-tests-list');

    if (!section || !countNode || !list) {
        return 0;
    }

    if (titleNode) titleNode.textContent = window.t('externalTestsSectionTitle', {}, lang);
    if (infoLinkNode) infoLinkNode.textContent = window.t('guestTestsInfoLink', {}, lang);

    var externalTests = (Array.isArray(myTests) ? myTests : []).filter(function(test) {
        return !!test
            && !!test.is_external
            && shouldKeepExternalTestInVoluntarySection(test)
            && String(test.progress_status || 'active').toLowerCase() === 'active';
    });
    externalTests = externalTests.filter(function(test) {
        return String(test.status || '') !== 'done';
    }).concat(externalTests.filter(function(test) {
        return String(test.status || '') === 'done';
    }));

    if (!externalTests.length) {
        section.style.display = 'none';
        countNode.textContent = '0';
        list.innerHTML = '';
        return 0;
    }

    section.style.display = 'block';
    countNode.textContent = String(externalTests.length);
    list.classList.toggle('single-row', externalTests.length <= 2);
    list.classList.toggle('single-card', externalTests.length === 1);
    if (scrollWrap) {
        scrollWrap.classList.toggle('is-single', externalTests.length === 1);
    }
    list.innerHTML = externalTests.map(function(test) {
        var statusMeta = getExternalStatusPresentation(test);
        var meta = statusMeta.meta;
        var isDoneToday = statusMeta.isDoneToday;
        var isContinuedExternal = isExternalContinueModeEnabled(test);
        var showPost14Choice = statusMeta.isPostControlWindow && !isContinuedExternal && !isDoneToday;
        var displayDay = getExternalDisplayTestingDay(test);
        var safeName = window.escapeHTML(test.name || test.package || window.t('unknownLabel', {}, lang));
        var safePackage = window.escapeHTML(test.package || test.external_package_name || '');
        var safePackageInline = escapeInlineJsString(test.package || test.external_package_name || '');
        var ownerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
        var safeOwnerUsernameInline = escapeInlineJsString(ownerUsername);
        var ownerLabel = ownerUsername
            ? '@' + ownerUsername
            : window.t('guestInviteOwnerMissing', {}, lang);
        var ownerLabelHtml = ownerUsername
            ? `<button type="button" class="external-tests-owner external-tests-owner-link notranslate" onclick="return openTelegramProfile('${safeOwnerUsernameInline}', event)">${window.escapeHTML(ownerLabel)}</button>`
            : `<div class="external-tests-owner">${window.escapeHTML(ownerLabel)}</div>`;
        var dayChipHtml = `<span class="meta-chip">${window.escapeHTML(window.t('externalTrackDayLabel', { day: displayDay }, lang))}</span>`;
        var originChipHtml = (!!test.is_external && !!String(test.external_source || '').trim())
            ? renderGuestOriginChip(test.external_source)
            : '';
        var primaryActionLabel = statusMeta.isPostControlWindow && !isContinuedExternal
            ? window.t('externalProjectContinueBtn', {}, lang)
            : window.t('externalProjectCheckinBtn', {}, lang);
        var primaryActionClick = statusMeta.isPostControlWindow && !isContinuedExternal
            ? `activateExternalContinueModeFromUi(${Number(test.id || 0)}, event)`
            : `sendExternalDailyCheckinFromUi(${Number(test.id || 0)}, event)`;
        var actionsHtml = '';
        if (!isDoneToday) {
            if (showPost14Choice) {
                actionsHtml = renderExternalPost14ChoiceBlock(test);
            } else if (isContinuedExternal) {
                actionsHtml = renderExternalContinuedActions(test, safePackageInline, ownerUsername);
            } else {
                var attachButtonHtml = `<button type="button" class="btn external-tests-attach-btn split-btn-options" onclick="openExternalCheckinOptionsModal(${Number(test.id || 0)}, '${escapeInlineJsString(ownerUsername)}', event)" aria-label="${window.escapeHTML(window.t('externalProjectAttachmentAria', {}, lang))}">${window.escapeHTML(window.t('externalProjectAttachmentBtn', {}, lang))}</button>`;
                actionsHtml = `
                    <div class="action-row external-tests-actions" id="external-test-actions-${Number(test.id || 0)}">
                        <button class="btn btn-secondary external-tests-open-btn" onclick="event.stopPropagation(); startTimer(${Number(test.id || 0)}, '${safePackageInline}', false, '')">
                            ${window.escapeHTML(t.openBtn)}
                        </button>
                        <div class="split-btn-group external-tests-confirm-group" onclick="event.stopPropagation();">
                            <button id="btn-confirm-${Number(test.id || 0)}" class="${getExternalConfirmButtonClasses(test)}" onclick="${primaryActionClick}">
                                ${window.escapeHTML(primaryActionLabel)}
                            </button>
                            ${attachButtonHtml}
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="card card-external-tracking external-tests-card${isDoneToday ? ' is-tested' : ''}" id="external-test-card-${Number(test.id || 0)}">
                <div class="card-header external-tests-card-header" onclick="openProjectDetailsModal(${test.id})" style="cursor: pointer; user-select: none;">
                    <div class="card-header-main">
                        ${renderTestAvatarWithPhaseBadge(test, lang)}
                        <div class="card-info" onclick="openProjectDetailsModal(${test.id}); event.stopPropagation();" style="cursor: pointer;">
                            <div class="card-title notranslate">${safeName}</div>
                            <div class="card-subtitle notranslate">${safePackage}</div>
                        </div>
                    </div>
                    <div onclick="event.stopPropagation();" style="display: flex; align-items: center;">
                        ${renderTestCardDetailsButton(test.id)}
                    </div>
                </div>
                <div class="external-tests-topline">
                    ${ownerLabelHtml}
                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end;">${originChipHtml}${dayChipHtml}</div>
                </div>
                ${showPost14Choice ? '' : `<div class="external-tests-status">${window.escapeHTML(statusMeta.statusText)}</div>`}
                ${showPost14Choice ? '' : `<div class="external-tests-substatus">${window.escapeHTML(statusMeta.substatusText)}</div>`}
                ${actionsHtml}
            </div>
        `;
    }).join('');

    return externalTests.length;
}

function renderTests(force) {
    if (!force && !isTabVisible('tests')) return;
    syncExternalContinueModeState();
    const activeList = document.getElementById('tests-list');
    const doneList = document.getElementById('done-list');
    const pendingSection = document.getElementById('pending-release-section');
    const pendingList = document.getElementById('pending-release-list');
    const pendingCountNode = document.getElementById('pending-release-count');
    const pendingScrollWrap = document.getElementById('pending-release-scroll-wrap');
    activeList.innerHTML = '';
    doneList.innerHTML = '';
    if (pendingList) pendingList.innerHTML = '';

    let activeCount = 0;
    let doneCount = 0;
    let pendingCount = 0;
    const externalGuestTestsCount = renderExternalGuestTestsSection();

    myTests.forEach((test) => {
        const isExternal = !!test.is_external;
        const hasGuestOrigin = hasGuestLinkRelationship(test);
        const showGuestOriginChip = shouldShowGuestOriginChip(test);
        const isPendingCompletion = !!test.is_pending_completion;
        
        const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
        const userTestingDay = getResolvedTestingDay(test);
        const isInSafetyBuffer = isPendingCompletion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);
        
        const isPendingForTester = isInSafetyBuffer;
        const isArchivedOrCompleted = !isExternal && String(test.app_status || 'active').toLowerCase() !== 'active' && !isInSafetyBuffer;
        // Skip archived cards with no actionable state (no grant, no early finish bonus).
        // This prevents cards from hanging in My Tests when neither reward applies.
        const isArchivedWithNoAction = isArchivedOrCompleted
            && !test.isReadyToClaim
            && !test.isGrantAvailableTomorrow
            && !test.isEarlyFinish;
        if (isArchivedWithNoAction) return;
        if (isExternal && shouldKeepExternalTestInVoluntarySection(test)) return;

        const card = document.createElement('div');
        
        // Determine if test should go to active or done list:
        // - If isReadyToClaim or isGrantAvailableTomorrow: keep in active list
        // - Else if status='done' AND day < 14: go to done list
        // - Else if status='done' AND day >= 14 without claim states: go to done list
        // - If isReadyToClaim: keep in active list
        // - If isGrantAvailableTomorrow: move to done list (grant pending)
        // - Else if status='done': go to done list
        // - Else: go to active list
        const shouldShowInPendingList = isInSafetyBuffer;
        const shouldShowInActiveList = !shouldShowInPendingList && (test.isReadyToClaim || test.isEarlyFinish || (test.status !== 'done' && !test.isGrantAvailableTomorrow));
        const shouldShowInDoneList = !shouldShowInPendingList && !test.isEarlyFinish && (test.isGrantAvailableTomorrow || (test.status === 'done' && !test.isReadyToClaim));
        
        if (shouldShowInPendingList) {
            card.className = 'card card-pending-release pending-release-carousel-card horizontal-card';
        } else {
            card.className = shouldShowInDoneList ? 'card card-done' : 'card';
            if (isExternal) {
                card.className += ' card-external-tracking';
            }
            if (isPendingForTester) {
                card.className += ' card-pending-release';
            }
            if (isTestFeedbackCheckinPending(test.id) && shouldShowInActiveList) {
                card.className += ' card-feedback-pending';
            }
        }
        card.id = `test-card-${test.id}`;
        const safePackage = escapeInlineJsString(test.package || test.external_package_name || '');
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || test.package || window.t('unknownLabel', {}, lang));
        const safeOwnerSubtitle = window.escapeHTML(buildTestOwnerSubtitle(test));
        const langBadge = (test.target_lang && test.target_lang !== 'ALL') ? getLangBadge(test.target_lang) : '';
        const shouldShowIssueOnCard = test.status === 'new' && !!test.has_clicked_store;
        const issueBtnDisplay = shouldShowIssueOnCard ? 'inline-flex' : 'none';
        const isIssueBlocked = !!test.issue_reported_at && !test.issue_fixed_at;
        const issueBtnText = isIssueBlocked ? getIssueAwaitingFixLabel(test) : ('🚨 ' + window.t('reportIssueBtnLabel', {}, lang));
        const issueBtnHtml = `<button id="btn-issue-${test.id}" class="btn" style="display:${issueBtnDisplay}; width:100%; margin-top:8px; background:rgba(255,59,48,0.12); color:#ff6b63; border:1px solid rgba(255,59,48,0.35);" onclick="openIssueReportModal(${test.id})" ${isIssueBlocked ? 'disabled' : ''}>${issueBtnText}</button>`;
        const pendingReleaseButtonHtml = `
            <button type="button" class="btn btn-secondary pending-release-chip" style="width: 100%; margin-bottom: 12px;" onclick="showPendingReleaseInfo()">
                ${window.escapeHTML(window.t('pendingReleaseChip', {}, lang))}
            </button>
        `;

        // === ACTION BUTTONS LOGIC ===
        let actionsHtml = '';
        const isFeedbackCheckinPending = typeof isTestFeedbackCheckinPending === 'function' && isTestFeedbackCheckinPending(test.id);
        const feedbackPendingBtnLabel = (typeof getFeedbackCheckinPendingLabel === 'function' ? getFeedbackCheckinPendingLabel() : window.t('feedbackCheckinPendingBtn', {}, lang));
        const feedbackPendingBtnStyle = 'background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;';
        
        if (isExternal) {
            var isContinuedExternal = isExternalContinueModeEnabled(test);
            if (isContinuedExternal) {
                actionsHtml = renderExternalContinuedActions(test, safePackage, safeOwnerUsername);
            } else {
                var externalTestingDay = getExternalCurrentTestingDay(test);
                var isExternalScreenshotOnlyDay = isScreenshotOnlyControlDay(externalTestingDay);
                var externalConfirmLabel = isExternalScreenshotOnlyDay
                    ? window.t('screenshotBtn', {}, lang)
                    : '✅ ' + window.t('completeControlDayBtn', {}, lang);
                var externalWarningText = window.t(isExternalScreenshotOnlyDay ? 'firstDayScreenshotWarning' : 'screenshotWarning', {}, lang);
                actionsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-secondary" style="width: 100%; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', true, '${safeOwnerUsername}', 10)">
                            ${t.openBtn}
                        </button>
                        <button id="btn-confirm-${test.id}" class="btn" style="width: 100%; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                            ${isIssueBlocked ? getIssueAwaitingFixLabel(test) : window.escapeHTML(externalConfirmLabel)}
                        </button>
                        <div style="color: #ff3b30; font-size: 13px; text-align: center;">
                            ${window.escapeHTML(externalWarningText)}
                        </div>
                    </div>
                `;
            }
        }
        // State A: grant available now (Day >= 15)
        else if (test.isReadyToClaim) {
            const testingDay = userTestingDay || 999;
            const isScreenshotDay = isMandatoryScreenshotDay(testingDay);
            const isArchivedClaimCard = isArchivedOrCompleted
                || String(test.progress_status || 'active').toLowerCase() !== 'active';
            
            let secondaryActions = '';
            if (isPendingForTester) {
                secondaryActions = pendingReleaseButtonHtml;
            } else if (!isArchivedClaimCard) {
                secondaryActions = `
                    <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', ${isScreenshotDay ? 'true' : 'false'}, '${isScreenshotDay ? safeOwnerUsername : ''}')">
                        🔗 ${t.openBtn}
                    </button>
                `;
                
                if (isScreenshotDay) {
                    secondaryActions += `
                        <button id="btn-confirm-${test.id}" class="btn" style="flex: 1; ${isIssueBlocked ? 'background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;' : ''}" ${isIssueBlocked ? 'disabled' : ''} onclick="openCheckinOptionsModal(${test.id}, '${safeOwnerUsername}')">
                            ${isIssueBlocked ? getIssueAwaitingFixLabel(test) : '✅ ' + window.t('completeControlDayBtn', {}, lang)}
                        </button>
                    `;
                } else {
                    secondaryActions += `
                        <button id="btn-confirm-${test.id}" class="btn" style="flex: 2; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                            ${isIssueBlocked ? getIssueAwaitingFixLabel(test) : t.confirmStart}
                        </button>
                    `;
                }
            }
            
            const grantSkipsCount = String(test.daily_timeline || '')
                ? Math.max(0, (String(test.daily_timeline || '').substring(0, 14).match(/[03]/g) || []).length)
                : Math.max(0, Number(test.skips_count || 0));
            const grantMissedClass = grantSkipsCount > 3 ? ' btn-missed-grant' : '';
            actionsHtml = `
                <button id="btn-claim-${test.id}" class="btn btn-claim-grant${grantMissedClass}" style="width: 100%; margin-bottom: 12px; font-size: 16px; font-weight: 600; padding: 14px 16px; gap: 8px;" onclick="handleClaimGrantClick(${test.progress_id}, ${test.id})">
                    🎁 ${window.t('claimGrantBtn')}
                </button>
                ${secondaryActions ? `<div class="action-row" style="gap: 8px;">${secondaryActions}</div>` : ''}
            `;
        } else if (isPendingForTester) {
            actionsHtml = pendingReleaseButtonHtml;
        } else if (test.isGrantAvailableTomorrow) {
            actionsHtml = `
                <button id="btn-claim-${test.id}" class="btn btn-claim-grant" style="width: 100%; margin-bottom: 12px; font-size: 16px; font-weight: 600; padding: 14px 16px; gap: 8px; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                    ${window.t('claimGrantTomorrowBtn', {}, lang)}
                </button>
            `;
        // State C: archived app — Early Finish Bonus card
        } else if (test.isEarlyFinish) {
            const efDays = Number(test.testing_days || 0);
            const efSkips = Number(test.skips_count || 0);
            const qualifies = efDays >= 5 && efSkips <= 1;
            const efDaysLabel = window.t('earlyFinishDays', { days: efDays }, lang);
            const efSkipsLabel = efSkips === 0
                ? window.t('earlyFinishPerfect', {}, lang)
                : window.t('earlyFinishSkips', { count: efSkips }, lang);
            const efBonusNote = qualifies
                ? `<div class="early-finish-bonus-badge notranslate">+25 $BUST</div>`
                : '';
            actionsHtml = `
                <div class="early-finish-banner">
                    <div class="early-finish-header">
                        <span class="early-finish-icon">🏁</span>
                        <span class="early-finish-title">${window.t('earlyFinishCardTitle', {}, lang)}</span>
                        ${efBonusNote}
                    </div>
                    <div class="early-finish-desc">${window.t('earlyFinishCardDesc', { days: efDays }, lang)}</div>
                    <div class="early-finish-meta">${efDaysLabel}&nbsp;&nbsp;·&nbsp;&nbsp;${efSkipsLabel}</div>
                    <button id="btn-early-finish-${test.id}" class="btn btn-early-finish" onclick="claimEarlyFinishBonus(${test.progress_id}, ${test.id})">
                        ⭐ ${window.t('earlyFinishClaimBtn', {}, lang)}
                    </button>
                </div>
            `;
        }
        // State B: status = 'new' OR status = 'daily'/'opened' without ready to claim
        else if (test.status === 'new') {
            const groupUrl = test.google_group_url || 'https://groups.google.com/g/google-play-dev-test';
            const safeGroupUrl = escapeInlineJsString(groupUrl);
            const shouldShowScreenshotAction = window.isFirstDayScreenshotVisible ? window.isFirstDayScreenshotVisible(test.id) : false;
            const hintHtml = renderCheckinRewardHint(test, 1, lang);

            let groupActionHtml = '';
            if (test.test_mode === 'email_list') {
                const badgeTitle = lang === 'ru' ? '📧 Тестирование по Email' : '📧 Testing by Email';
                const badgeSubtitle = lang === 'ru'
                    ? 'Разработчик должен был уже добавить ваш email в Play Console. Просто скачайте приложение.'
                    : 'The developer should have already added your email in the Play Console. Just download the app.';
                groupActionHtml = `
                    <div class="email-testing-badge" style="background: rgba(0, 122, 255, 0.1); border: 1px solid rgba(0, 122, 255, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 12px; text-align: center;">
                        <div style="font-weight: bold; color: var(--accent-color, #007aff); font-size: 14px; margin-bottom: 4px;">${badgeTitle}</div>
                        <div style="font-size: 12px; color: var(--hint-color, #8e8e93); line-height: 1.3;">${badgeSubtitle}</div>
                    </div>
                `;
            } else {
                groupActionHtml = `
                    <div class="first-day-row">
                        <button class="btn first-day-btn" style="flex: 1;" onclick="try { tg.openLink('${safeGroupUrl}', { try_browser: 'chrome' }); } catch(err) { console.error('Failed to open group link:', err); } if(tg.HapticFeedback) tg.HapticFeedback.selectionChanged();">${t.joinGroup}</button>
                        <button class="btn-icon first-day-copy" style="width: 44px; min-height: 44px; font-size: 18px;" onclick="copyGroupUrl('${safeGroupUrl}')">📋</button>
                    </div>
                `;
            }

            actionsHtml = `
                <div class="first-day-actions">
                    ${groupActionHtml}
                    <button class="btn first-day-btn" style="width: 100%;" onclick="handleFirstDownload(${test.id}, '${safePackage}')">
                        ${t.downloadPlay}
                    </button>
                    <div id="new-screenshot-box-${test.id}" style="display: ${shouldShowScreenshotAction ? 'block' : 'none'};">
                        <button id="btn-confirm-${test.id}" class="btn btn-success first-day-btn" style="width: 100%;" onclick="handleScreenshotAndConfirm(${test.id}, '${safeOwnerUsername}')">
                            ${window.escapeHTML(window.t('screenshotBtn', {}, lang))}
                        </button>
                        <div style="color: #ff3b30; font-size: 13px; margin-top: 8px; text-align: center;">
                            ${window.escapeHTML(window.t('firstDayScreenshotWarning', {}, lang))}
                        </div>
                    </div>
                </div>
                ${issueBtnHtml}
                ${hintHtml}
            `;
        } else if (test.status === 'daily' || test.status === 'opened') {
            const testingDay = userTestingDay || 999;
            if (testingDay >= 15) {
                const hintHtml = renderCheckinRewardHint(test, testingDay, lang);
                // Do NOT show the karma-only hint when pool is empty — it promises a "Protection Bonus" that doesn't exist


                actionsHtml = `
                    <div class="action-row">
                        <div class="split-btn-group" style="width: 100%; flex: 1;">
                            <button id="btn-confirm-${test.id}" class="btn ${isFeedbackCheckinPending ? '' : 'btn-success split-btn-main'}" style="${isFeedbackCheckinPending ? 'flex: 1; width: 100%; ' + feedbackPendingBtnStyle : ''}" ${isFeedbackCheckinPending ? 'disabled data-feedback-pending="1"' : `onclick="confirmStart(${test.id})"`}>
                                ${window.escapeHTML(isFeedbackCheckinPending ? feedbackPendingBtnLabel : (window.t('appInstalledBtnLabel', {}, lang) || '✅ App Installed'))}
                            </button>
                            ${isFeedbackCheckinPending ? '' : `<button class="btn btn-success split-btn-options" onclick="openCheckinOptionsModal(${test.id}, '${safeOwnerUsername}')" title="${window.escapeHTML(window.t('checkinOptionsTitle', {}, lang))}">
                                📎
                            </button>`}
                        </div>
                    </div>
                    ${hintHtml}
                `;
            } else {
                const isScreenshotDay = isMandatoryScreenshotDay(testingDay);
                const isScreenshotOnlyDay = isScreenshotOnlyControlDay(testingDay);
                const screenshotBtnText = isScreenshotOnlyDay
                    ? window.t('screenshotBtn', {}, lang)
                    : '✅ ' + window.t('completeControlDayBtn', {}, lang);
                const screenshotWarningText = window.t(isScreenshotOnlyDay ? 'firstDayScreenshotWarning' : 'screenshotWarning', {}, lang);

                if (isScreenshotDay) {
                    const confirmLabel = isFeedbackCheckinPending
                        ? feedbackPendingBtnLabel
                        : (isIssueBlocked ? getIssueAwaitingFixLabel(test) : screenshotBtnText);
                    actionsHtml = `
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-secondary" style="width: 100%; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', true, '${safeOwnerUsername}')">
                                ${t.openBtn}
                            </button>
                            <button id="btn-confirm-${test.id}" class="btn" style="width: 100%; ${feedbackPendingBtnStyle}" disabled ${isFeedbackCheckinPending ? 'data-feedback-pending="1"' : ''}>
                                ${window.escapeHTML(confirmLabel)}
                            </button>
                            <div style="color: #ff3b30; font-size: 13px; text-align: center;">
                                ${window.escapeHTML(screenshotWarningText)}
                            </div>
                        </div>
                    `;
                } else if (isFeedbackCheckinPending) {
                    actionsHtml = `
                        <div class="action-row">
                            <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', false, '${safeOwnerUsername}')">
                                ${t.openBtn}
                            </button>
                            <button id="btn-confirm-${test.id}" class="btn" style="flex: 2; ${feedbackPendingBtnStyle}" disabled data-feedback-pending="1">
                                ${window.escapeHTML(feedbackPendingBtnLabel)}
                            </button>
                        </div>
                    `;
                } else {
                    actionsHtml = `
                        <div class="action-row">
                            <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', false, '${safeOwnerUsername}')">
                                ${t.openBtn}
                            </button>
                            <button id="btn-confirm-${test.id}" class="btn" style="flex: 2; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                                ${isIssueBlocked ? getIssueAwaitingFixLabel(test) : t.confirmStart}
                            </button>
                        </div>
                    `;
                }

                const hintHtml = renderCheckinRewardHint(test, testingDay, lang);
                actionsHtml += hintHtml;
            }
        } else if (test.status === 'done' && !test.isReadyToClaim) {
            // Done without claim opportunity (already claimed or ineligible)
            actionsHtml = '';
        }

        const headerActions = [];
        if (isExternal) {
            if (safeOwnerUsername) {
                headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent;" onclick="return openTelegramProfile('${safeOwnerUsername}', event)">💬</button>`);
            }
            headerActions.push(renderTestCardDetailsButton(test.id));
        } else {
            headerActions.push(renderTestCardDetailsButton(test.id));
        }
        const trailingHtml = headerActions.length
            ? `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;" onclick="event.stopPropagation();">${headerActions.join('')}</div>`
            : '';

        const doneBadgeHtml = test.status === 'done' && !test.isReadyToClaim
            ? '<div class="done-status-pill">' + window.escapeHTML(t.doneTodayText) + '</div><div class="done-watermark">' + window.escapeHTML(window.t('doneWatermarkText', {}, lang)) + '</div>'
            : '';
        const externalMetaChips = [];
        if (isExternal) {
            externalMetaChips.push(`<span class="meta-chip accent-blue">${window.escapeHTML(window.t('externalGuestMainListChip', {}, lang))}</span>`);
        }
        if (showGuestOriginChip) {
            externalMetaChips.push(renderGuestOriginChip(test.external_source));
        }
        const cardHeaderMainHtml = `
            <div class="card-header-main">
                ${renderTestAvatarWithPhaseBadge(test, lang)}
                <div class="card-info" onclick="openProjectDetailsModal(${test.id}); event.stopPropagation();" style="cursor: pointer;">
                    <div class="card-title notranslate">${safeName}</div>
                    <div class="card-subtitle notranslate">${safeOwnerSubtitle}</div>
                </div>
            </div>`;

        let cardContent = `
            ${doneBadgeHtml}
            <div class="card-header" onclick="openProjectDetailsModal(${test.id})" style="cursor: pointer; user-select: none;">
                ${cardHeaderMainHtml}
                ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;" onclick="event.stopPropagation()">${langBadge}</div>` : ''}
                ${trailingHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay, test, { showTestersCount: false, extraParts: externalMetaChips })}
            <div id="actions-${test.id}">
                ${actionsHtml}
            </div>
        `;

        if (shouldShowInDoneList) {
            const reminderHtml = getScreenshotReminderHtml(test);
            if (reminderHtml) {
                cardContent += reminderHtml;
            }
            card.innerHTML = cardContent;
            doneList.appendChild(card);
            doneCount++;
        } else if (shouldShowInPendingList) {
            card.innerHTML = cardContent;
            if (pendingList) pendingList.appendChild(card);
            pendingCount++;
        } else if (shouldShowInActiveList) {
            card.innerHTML = cardContent;
            activeList.appendChild(card);
            activeCount++;
        }
    });

    if (pendingCountNode) pendingCountNode.innerText = pendingCount;
    if (pendingSection) pendingSection.style.display = pendingCount > 0 ? 'block' : 'none';
    if (pendingScrollWrap) pendingScrollWrap.classList.toggle('is-single', pendingCount <= 1);

    _updateDoneSectionVisibility(doneCount);

    if (activeCount === 0 && pendingCount === 0 && externalGuestTestsCount === 0) {
        activeList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h3>${t.emptyTests}</h3>
                <p>${t.emptyTestsDesc}</p>
            </div>
        `;
    }

    if (window._restoreActiveTimer) window._restoreActiveTimer();
    if (typeof reapplyAllFeedbackCheckinPendingUi === 'function') reapplyAllFeedbackCheckinPendingUi();
}

function renderCompletedTests(completedTests) {
    const doneList = document.getElementById('done-list');
    doneList.innerHTML = '';

    let doneCount = 0;

    completedTests.forEach((test) => {
        const card = document.createElement('div');
        card.className = 'card card-done';
        card.id = `test-card-${test.id}`;
        const userTestingDay = getResolvedTestingDay(test);
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || test.package || window.t('unknownLabel', {}, lang));
        const safeOwnerSubtitle = window.escapeHTML(buildTestOwnerSubtitle(test));

        const actionsHtml = '';

        const headerActions = [];
        if (test.owner_username) {
            headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent;" onclick="return openTelegramProfile('${safeOwnerUsername}', event)">💬</button>`);
        }
        if (isRegularTestingPhaseCard(test)) {
            headerActions.push(renderTestCardDetailsButton(test.id));
        }
        headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="${isMutualExitFlow(test) ? `openLeaveMutualModal(${test.id}, event)` : `openDropTestModal(${test.id}, event)`}">🗑️</button>`);
        const ownerBtnHtml = `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;" onclick="event.stopPropagation();">${headerActions.join('')}</div>`;

        let devInfoHtml = '';
        if (test.instructions) {
            devInfoHtml = `
                <details class="dev-instruction" onclick="event.stopPropagation();">
                    <summary>${t.devInfo} <span class="details-arrow">▼</span></summary>
                    <div class="dev-instruction-body">${escapeHtmlWithBreaks(test.instructions)}</div>
                </details>
            `;
        }

        let cardContent = `
            <div class="done-status-pill">${window.escapeHTML(t.doneTodayText)}</div>
            <div class="done-watermark">${window.escapeHTML(window.t('doneWatermarkText', {}, lang))}</div>
            <div class="card-header" onclick="openProjectDetailsModal(${test.id})" style="cursor: pointer; user-select: none;">
                <div class="card-header-main">
                    ${renderTestAvatarWithPhaseBadge(test, lang)}
                    <div class="card-info" onclick="openProjectDetailsModal(${test.id}); event.stopPropagation();" style="cursor: pointer;">
                        <div class="card-title notranslate">${safeName}</div>
                        <div class="card-subtitle notranslate">${safeOwnerSubtitle}</div>
                    </div>
                </div>
                ${ownerBtnHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay, test, { showTestersCount: false })}
            ${devInfoHtml}
            <div id="actions-${test.id}">
                ${actionsHtml}
            </div>
        `;

        const reminderHtml = getScreenshotReminderHtml(test);
        if (reminderHtml) {
            cardContent += reminderHtml;
        }

        card.innerHTML = cardContent;
        doneList.appendChild(card);
        doneCount++;
    });

    _updateDoneSectionVisibility(doneCount);
}

function _updateDoneSectionVisibility(doneCount) {
    var doneSection = document.getElementById('done-section');
    if (!doneSection) return;
    var countNode = document.getElementById('done-count');
    if (countNode) countNode.innerText = String(doneCount || 0);
    var testsTab = document.getElementById('tab-tests');
    var isTestsActive = !!(testsTab && testsTab.classList.contains('active'));
    doneSection.style.display = (isTestsActive && doneCount > 0) ? 'block' : 'none';
}

Object.assign(window, {
    renderEditCreatedAtMeta,
    renderEvents,
    toggleEventsExpanded,
    getUserTestingDay,
    isMandatoryScreenshotDay,
    getOwnerActiveStatus,
    isProjectSynced,
    showGrantBreakdownAlertById,
    getScreenshotReminderHtml,
    dismissProjectUpdateTip,
    renderCompactMeta,
    openTelegramProfile,
    renderIncomingOffers,
    renderTests,
    renderCompletedTests,
    activateExternalContinueModeFromUi,
    showOwnerLastSeenToast,
    getAvailableMutualProjectsForOwner,
    getMutualOfferProjectChoicesForOwner,
    isExternalNormalCheckinDay,
    getExternalConfirmButtonClasses,
});

function renderCheckinRewardHint(test, testingDay, lang) {
    const isBounty = test.join_type === 'bounty';
    const isOvertime = testingDay >= 15;
    const karmaVal = isOvertime ? '0.5' : '0.1';
    
    if (isOvertime) {
        const calculatedBust = typeof test.exact_daily_reward !== 'undefined' ? Number(test.exact_daily_reward) : 0;
        if (calculatedBust > 0) {
            const calculatedBustFormatted = typeof formatUiAmount === 'function' ? formatUiAmount(calculatedBust, 1) : calculatedBust.toFixed(1);
            return `<div class="notranslate" style="text-align:center;margin-top:6px;font-size:12px;color:var(--hint-color);">${window.escapeHTML(window.t('testerCheckinHintBoth', { bust: calculatedBustFormatted, karma: karmaVal }, lang))}</div>`;
        } else {
            return `<div class="notranslate" style="text-align:center;margin-top:6px;font-size:12px;color:var(--hint-color);">${window.escapeHTML(window.t('testerCheckinHintKarma', { karma: karmaVal }, lang))}</div>`;
        }
    } else {
        if (isBounty && test.bounty_per_tester > 0) {
            const calculatedBust = typeof test.exact_daily_reward !== 'undefined' ? Number(test.exact_daily_reward) : (test.bounty_per_tester * 0.65 / 14);
            const calculatedBustFormatted = typeof formatUiAmount === 'function' ? formatUiAmount(calculatedBust, 1) : calculatedBust.toFixed(1);
            return `<div class="notranslate" style="text-align:center;margin-top:6px;font-size:12px;color:var(--hint-color);">${window.escapeHTML(window.t('testerCheckinHintBoth', { bust: calculatedBustFormatted, karma: karmaVal }, lang))}</div>`;
        } else {
            return '';
        }
    }
}

function openBountyInfoModal(testId, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const test = myTests.find(item => item.id === testId);
    if (!test) return;
    
    const bounty = Number(test.bounty_per_tester || 0);
    const checkinsReward = Math.round(bounty * 0.65);
    const holdReward = Math.round(bounty * 0.35);

    const T = (key, vars) => window.t(key, vars || {}, lang) || key;

    // Update title
    const titleText = T('bountyModalTitle', { total: bounty });
    const titleTextEl = document.getElementById('bounty-modal-title-text');
    if (titleTextEl) titleTextEl.textContent = titleText;

    // Update checkins reward
    const checkinsValEl = document.getElementById('bounty-modal-checkins-value');
    if (checkinsValEl) checkinsValEl.textContent = `${checkinsReward} $BUST`;

    // Update hold reward
    const holdValEl = document.getElementById('bounty-modal-hold-value');
    if (holdValEl) holdValEl.textContent = `${holdReward} $BUST`;

    // Show modal
    const modal = document.getElementById('bounty-info-modal');
    if (modal) {
        modal.classList.add('active');
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function closeBountyInfoModal(event) {
    if (event) {
        event.stopPropagation();
    }
    const modal = document.getElementById('bounty-info-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

let _currentInfoModalTest = null;

function renderTestAvatarWithPhaseBadge(test, lang) {
    const userTestingDay = getResolvedTestingDay(test);
    const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
    const isInSafetyBuffer = !!test.is_pending_completion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);
    
    let phaseClass = '';
    let phaseIcon = '';
    
    if (isInSafetyBuffer) {
        phaseClass = 'buffer-phase';
        phaseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px; display: block;">
            <path d="M5 2h14M5 22h14M19 2v6a7 7 0 0 1-4.22 6.4L12 16l-2.78-1.6A7 7 0 0 1 5 8V2Z"/>
            <path d="M5 22v-6a7 7 0 0 1 4.22-6.4L12 8l2.78 1.6A7 7 0 0 1 19 14v6Z"/>
        </svg>`;
    } else if (userTestingDay >= 15) {
        phaseClass = 'protection-phase';
        phaseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px; display: block;">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>`;
    } else {
        phaseClass = 'active-phase';
        phaseIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width: 10px; height: 10px; display: block;">
            <path d="M10 2v8L4.36 20.62a1 1 0 0 0 .86 1.38h13.56a1 1 0 0 0 .86-1.38L14 10V2Z"/>
            <path d="M8.5 2h7M10 10h4M8.5 15h7"/>
        </svg>`;
    }
    
    return `
        <div class="project-avatar-container" onclick="openPhaseInfoModal(${test.id}, event); event.stopPropagation();" style="cursor: pointer; user-select: none;">
            ${renderIcon(test.name || test.package || window.t('unknownLabel', {}, lang), test.icon_url)}
            <div class="project-phase-badge-overlay ${phaseClass}">
                ${phaseIcon}
            </div>
        </div>
    `;
}

function openPhaseInfoModal(testId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const test = myTests.find(item => item.id === testId);
    if (!test) return;
    
    _currentInfoModalTest = test;
    
    const userTestingDay = getResolvedTestingDay(test);
    const extraPaid = Number(test.paid_protection_days || test.purchased_protection_days || 0);
    const isInSafetyBuffer = !!test.is_pending_completion || (userTestingDay >= 15 && userTestingDay > 14 + extraPaid);
    
    let titleEmoji = '';
    let titleText = '';
    let bodyText = '';
    let showRewards = false;
    let showLeaveLink = false;
    
    if (isInSafetyBuffer) {
        // Buffer phase
        titleEmoji = '⏳';
        titleText = window.t('ppcModalBufferTitle', {}, lang) || (lang === 'ru' ? 'Буфер безопасности ⏳' : 'Safety Buffer ⏳');
        // Clean out trailing emoji if translated key has it
        titleText = titleText.replace(/⏳/g, '').trim();
        bodyText = window.t('ppcModalBufferText', {}, lang) || (lang === 'ru'
            ? 'Пожалуйста, не удаляйте приложение, пока владелец официально не завершит проект. Как только это произойдет, вы получите уведомление, а приложение исчезнет из списка активных тестов.'
            : 'Please do not delete the app until the owner officially completes the project. Once that happens, you will receive a notification, and the app will disappear from the list of active tests.');
        showRewards = false;
        showLeaveLink = false;
    } else if (userTestingDay >= 15) {
        // Protection phase
        titleEmoji = '🛡️';
        titleText = window.t('ppcModalProtectionTitle', {}, lang) || (lang === 'ru' ? 'Проект под защитой 🛡️' : 'Project under protection 🛡️');
        titleText = titleText.replace(/🛡️/g, '').trim();
        bodyText = window.t('ppcModalProtectionText', {}, lang) || (lang === 'ru'
            ? 'Тестирование продолжается из-за рассинхронизации дней с Google Play. Владелец указал реальные дни тестирования. Не удаляйте приложение, иначе сбросится весь прогресс и вы потеряете награды!'
            : 'Testing continues due to synchronization discrepancy with Google Play. The owner has specified the actual testing days. Do not delete the app, otherwise all progress will be reset and you will lose your rewards!');
        showRewards = true;
        showLeaveLink = true;
        
        // Calculate reward pool share
        const estimatedShare = typeof test.exact_daily_reward !== 'undefined' ? Number(test.exact_daily_reward) : 0;
        const shareFormatted = typeof formatUiAmount === 'function' ? formatUiAmount(estimatedShare, 1) : estimatedShare.toFixed(1);
        
        const rewardValue = `${shareFormatted} BUST / ${lang === 'ru' ? 'день' : 'day'}`;
        const rewardValEl = document.getElementById('ppc-phase-modal-reward-value');
        if (rewardValEl) rewardValEl.innerText = rewardValue;
        
        // Karma bonus label
        const karmaBonusLabelEl = document.querySelector('#ppc-phase-info-modal .karma-boost .ppc-reward-split-label');
        if (karmaBonusLabelEl) {
            karmaBonusLabelEl.innerText = window.t('ppcModalKarmaBonus', {}, lang) || (lang === 'ru' ? 'Повышенная карма + 0,5' : 'Increased karma +0.5');
        }
    } else {
        // Active phase (days 1-14)
        titleEmoji = '🧪';
        titleText = window.t('ppcModalActiveTitle', {}, lang) || (lang === 'ru' ? 'Активная фаза тестирования' : 'Active testing phase');
        titleText = titleText.replace(/🧪/g, '').trim();
        bodyText = window.t('ppcModalActiveText', {}, lang) || (lang === 'ru'
            ? 'Проект находится в основной фазе. Тестируйте приложение, ищите баги и предлагайте идеи! За качественный фидбек вы можете заработать дополнительную карму ☯️ (+1.5 или +3) и неограниченное количество💎$BUST.'
            : 'The project is in the primary phase. Test the app, look for bugs, and suggest ideas! For high-quality feedback, you can earn extra karma ☯️ (+1.5 or +3) and unlimited 💎$BUST.');
        showRewards = false;
        showLeaveLink = false;
    }
    
    // Populate modal DOM
    const titleEl = document.getElementById('ppc-phase-modal-title');
    const textEl = document.getElementById('ppc-phase-modal-text');
    const rewardsContainer = document.getElementById('ppc-phase-rewards-container');
    const leaveLinkContainer = document.getElementById('ppc-phase-leave-link-container');
    const okBtnEl = document.getElementById('ppc-phase-modal-ok-btn');
    
    if (titleEl) {
        titleEl.innerHTML = `${titleEmoji} <span id="ppc-phase-modal-title-text">${window.escapeHTML(titleText)}</span>`;
    }
    if (textEl) {
        textEl.innerText = bodyText;
    }
    if (rewardsContainer) {
        rewardsContainer.style.display = showRewards ? 'flex' : 'none';
    }
    if (leaveLinkContainer) {
        leaveLinkContainer.style.display = showLeaveLink ? 'block' : 'none';
    }
    if (okBtnEl) {
        if (userTestingDay >= 15 && !isInSafetyBuffer) {
            okBtnEl.innerText = window.t('ppcModalProtectionOk', {}, lang) || (lang === 'ru' ? 'Понятно, продолжаю тест' : 'Understood, continuing test');
        } else {
            okBtnEl.innerText = window.t('ppcModalBufferOk', {}, lang) || (lang === 'ru' ? 'Понятно' : 'Understood');
        }
    }
    
    const modal = document.getElementById('ppc-phase-info-modal');
    if (modal) modal.classList.add('active');
}

function closePhaseInfoModal(event) {
    if (event && event.target !== document.getElementById('ppc-phase-info-modal')) return;
    const modal = document.getElementById('ppc-phase-info-modal');
    if (modal) modal.classList.remove('active');
}

function ppcPhaseModalLeave(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const test = _currentInfoModalTest;
    closePhaseInfoModal();
    if (!test) return;
    
    // Call the original leave modal trigger
    if (typeof isMutualExitFlow === 'function' && isMutualExitFlow(test)) {
        if (typeof openLeaveMutualModal === 'function') openLeaveMutualModal(test.id, event);
    } else {
        if (typeof openDropTestModal === 'function') openDropTestModal(test.id, event);
    }
}

// Expose functions globally
window.openPhaseInfoModal = openPhaseInfoModal;
window.closePhaseInfoModal = closePhaseInfoModal;
window.ppcPhaseModalLeave = ppcPhaseModalLeave;
// Fallback compatibility aliases
window.openProtectionInfoModal = openPhaseInfoModal;
window.closeProtectionInfoModal = closePhaseInfoModal;
window.ppcProtectionModalLeave = ppcPhaseModalLeave;
window.openBufferInfoModal = openPhaseInfoModal;
window.closeBufferInfoModal = closePhaseInfoModal;
window.renderTestAvatarWithPhaseBadge = renderTestAvatarWithPhaseBadge;
window.openBountyInfoModal = openBountyInfoModal;
window.closeBountyInfoModal = closeBountyInfoModal;
