window.App = window.App || {};

window.escapeHTML = function (value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

function escapeInlineJsString(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r/g, '\\r')
        .replace(/\n/g, '\\n');
}

function escapeHtmlWithBreaks(value) {
    return window.escapeHTML(value).replace(/\r?\n/g, '<br>');
}

function showSkeleton(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const isProjects = containerId === 'projects-list';
    let html = '';
    const count = isProjects ? 2 : 3;
    for (let index = 0; index < count; index++) {
        html += `<div class="skeleton-card">
            <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div class="skeleton skeleton-avatar"></div>
                <div style="flex: 1;">
                    <div class="skeleton skeleton-line medium"></div>
                    <div class="skeleton skeleton-line short" style="margin-bottom: 0;"></div>
                </div>
            </div>`;
        if (isProjects) {
            html += `<div class="skeleton skeleton-line long"></div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(142,142,147,0.2);">
                <div class="skeleton skeleton-line short" style="margin-bottom: 8px;"></div>
                <div class="skeleton skeleton-line medium"></div>
                <div class="skeleton skeleton-line medium"></div>
            </div>`;
        } else {
            html += `<div class="skeleton skeleton-line long"></div>`;
        }
        html += `<div class="skeleton skeleton-btn"></div></div>`;
    }
    container.innerHTML = html;
}

function showRetry(containerId, retryFn) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="retry-container">
            <p style="color: var(--hint-color); margin-bottom: 12px;">${t.loadError}</p>
            <button class="retry-btn" onclick="${retryFn}">${t.retryBtn}</button>
        </div>
    `;
}

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

function formatTimeAgo(dateStr) {
    if (!dateStr) return t.timeJustNow;
    const eventDate = new Date(dateStr);
    if (Number.isNaN(eventDate.getTime())) return t.timeJustNow;
    const diffMs = Date.now() - eventDate.getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));
    if (minutes < 1) return t.timeJustNow;
    if (minutes < 60) return t.timeMinAgo.replace('{count}', minutes);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t.timeHourAgo.replace('{count}', hours);
    const days = Math.floor(hours / 24);
    return t.timeDayAgo.replace('{count}', days);
}

function parseLocalDateOnly(dateValue) {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
        return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
    }
    const str = String(dateValue);
    const datePart = str.includes('T') ? str.split('T')[0] : str;
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && parts.every((value) => Number.isFinite(value))) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function getDayDiffFromToday(dateValue) {
    const source = parseLocalDateOnly(dateValue);
    if (!source) return 0;
    const today = parseLocalDateOnly(getLocalDate());
    return Math.max(0, Math.floor((today - source) / (1000 * 60 * 60 * 24)));
}

function renderEvents() {
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
        const text = window.escapeHTML(
            (lang === 'ru' ? eventItem.text_ru : (eventItem.text_en || eventItem.text_ru)) || ''
        );
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

function getAvatar(name) {
    const colors = ['#f5625d', '#f5b55d', '#5df562', '#5dcbf5', '#5d62f5', '#cb5df5'];
    let hash = 0;
    for (let index = 0; index < name.length; index++) {
        hash = name.charCodeAt(index) + ((hash << 5) - hash);
    }
    const color = colors[Math.abs(hash) % colors.length];
    const letter = name.charAt(0).toUpperCase();
    return `<div class="avatar" style="background-color: ${color}">${window.escapeHTML(letter)}</div>`;
}

function renderIcon(name, iconUrl) {
    if (iconUrl) {
        const firstLetter = name.charAt(0).toUpperCase().replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<img src="${window.escapeHTML(iconUrl)}" class="avatar" style="object-fit: cover;" onerror="this.onerror=null; this.outerHTML='<div class=\\'avatar\\' style=\\'background-color: #8e8e93;\\'>${firstLetter}</div>';">`;
    }
    return getAvatar(name);
}

function formatOfferRemaining(createdAt) {
    let rawValue = createdAt;
    if (rawValue instanceof Date) {
        rawValue = rawValue.toISOString();
    }
    let normalized = String(rawValue || '').trim();
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) {
        normalized = normalized.replace(' ', 'T');
    }
    if (normalized && !/([zZ]|[+\-]\d{2}:\d{2})$/.test(normalized)) {
        normalized += 'Z';
    }
    let created = new Date(normalized || '');
    if (Number.isNaN(created.getTime()) && createdAt) {
        created = new Date(createdAt);
    }
    if (Number.isNaN(created.getTime())) return null;
    const expiresAt = new Date(created.getTime() + (3 * 60 * 60 * 1000));
    if (Date.now() > expiresAt.getTime()) return null;
    const leftMs = Math.max(0, expiresAt.getTime() - Date.now());
    const totalMinutes = Math.floor(leftMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return {
        expiresAt,
        hours,
        minutes,
    };
}

function getProjectLanguageToast(targetLang) {
    const langCode = String(targetLang || 'ALL').toUpperCase();
    if (langCode === 'RU') return window.t('projectLanguageToastRu', {}, lang);
    if (langCode === 'EN') return window.t('projectLanguageToastEn', {}, lang);
    return window.t('projectLanguageToastAll', {}, lang);
}

function formatUiAmount(value, digits) {
    const numeric = Number(value || 0);
    const precision = typeof digits === 'number' ? digits : 1;
    if (!Number.isFinite(numeric)) return '0';
    const rounded = Number(numeric.toFixed(precision));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(precision);
}

function getCurrentUserKarmaValue() {
    const raw = visibilityStats && typeof visibilityStats.ownerKarma !== 'undefined'
        ? Number(visibilityStats.ownerKarma)
        : 0;
    return Number.isFinite(raw) ? raw : 0;
}

function getGrantEstimateData(test) {
    const skips = Math.max(0, Number(test && test.skips_count || 0));
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

function renderGrantPreviewChip(test) {
    const grant = getGrantEstimateData(test);
    const chipClass = grant.eligible ? 'meta-chip accent-yellow grant-chip' : 'meta-chip grant-chip grant-chip-lost';
    const label = grant.eligible
        ? window.t('grantChipEligible', { amount: formatUiAmount(grant.total, 1) }, lang)
        : window.t('grantChipLost', {}, lang);
    return `<button type="button" class="${chipClass}" onclick="showGrantBreakdownAlertById(${test.id}, event)">${window.escapeHTML(label)}</button>`;
}

function getTestingTimelineMeta(test) {
    var today = parseLocalDateOnly(getLocalDate()) || new Date();
    var userTestingDayRaw = getUserTestingDay(test.start_date);
    var userTestingDay = typeof userTestingDayRaw === 'number' && userTestingDayRaw > 0 ? userTestingDayRaw : 1;
    var currentGoogleDay = 0;
    var projectDaysLeft = 0;
    var expectedTotalDays = Math.max(14, userTestingDay);
    var overtimeDays = 0;
    var isSynced = (test.google_sync_day || 0) > 1;

    if (isSynced) {
        var syncDiffDays = test.last_sync_date ? getDayDiffFromToday(test.last_sync_date) : 0;
        currentGoogleDay = Number(test.google_sync_day || 0) + syncDiffDays;
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
    };
}

function buildGrantProgressSegments(test, userTestingDay, expectedTotalDays) {
    var timeline = test.daily_timeline || '';
    var renderTimeline = timeline;
    var totalDays = Math.max(expectedTotalDays || 14, userTestingDay || 0, 1);
    var standardCheckins = 0, standardSkips = 0, overtimeCheckins = 0, overtimeSkips = 0;
    var pendingDay = null;
    if ((test.last_check_date || '') !== getLocalDate() && timeline.length < totalDays) {
        pendingDay = Math.max(1, Math.min(totalDays, Math.max(userTestingDay || 1, timeline.length + 1)));
    }

    function getDayState(dayNum) {
        var ch = renderTimeline[dayNum - 1] || '';
        var cls = 'remaining';
        if (ch === '1') { cls = 'standard-checkin'; standardCheckins++; }
        else if (ch === '0') { cls = 'standard-skip'; standardSkips++; }
        else if (ch === '2') { cls = 'overtime-checkin'; overtimeCheckins++; }
        else if (ch === '3') { cls = 'overtime-skip'; overtimeSkips++; }
        if (!ch && pendingDay === dayNum) {
            cls += ' current-pending';
        }
        return '<div class="grant-segment ' + cls + '" data-day="' + dayNum + '"></div>';
    }

    if (!timeline) {
        var totalCheckins = Math.max(0, Number(test.checkins_count || 0));
        var standardElapsed = Math.min(14, Math.max(0, userTestingDay || 0));
        standardCheckins = Math.min(14, totalCheckins);
        standardSkips = Math.max(0, standardElapsed - standardCheckins);
        var overtimeElapsed = Math.max(0, (userTestingDay || 0) - 14);
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

    var overtimeSegments = [];
    for (var overtimeDay = 15; overtimeDay <= totalDays; overtimeDay++) {
        overtimeSegments.push(getDayState(overtimeDay));
    }

    var remainingDays = Math.max(0, totalDays - timeline.length);
    var html = '<div class="timeline-compact">' +
        '<div class="timeline-row">' +
            '<div class="timeline-row-head">' +
                '<span class="timeline-row-title">' + window.escapeHTML(window.t('timelinePrimaryTitle', {}, lang)) + '</span>' +
                '<span class="timeline-row-range">1-14</span>' +
            '</div>' +
            '<div class="grant-progress-container timeline-row-track is-primary">' + baseSegments.join('') + '</div>' +
        '</div>' +
        (overtimeSegments.length
            ? '<div class="timeline-row timeline-row-overtime">' +
                '<div class="timeline-row-head">' +
                    '<span class="timeline-row-title">' + window.escapeHTML(window.t('timelineOvertimeTitle', {}, lang)) + '</span>' +
                    '<span class="timeline-row-range">15-' + totalDays + '</span>' +
                '</div>' +
                '<div class="grant-progress-container timeline-row-track is-overtime">' + overtimeSegments.join('') + '</div>' +
                '<div class="timeline-row-note">' + window.escapeHTML(window.t('timelineOvertimeRewardNote', {}, lang)) + '</div>' +
            '</div>'
            : '') +
    '</div>';

    return {
        html: html,
        standardCheckins: standardCheckins,
        standardSkips: standardSkips,
        overtimeCheckins: overtimeCheckins,
        overtimeSkips: overtimeSkips,
        remainingDays: remainingDays,
        totalDays: totalDays,
    };
}

function openTesterDossier(username, testerId, appId) {
    return openDossierModal(username || '', testerId, appId || 0);
}

function getUserTestingDay(startDate) {
    if (!startDate) return null;
    const startedAt = new Date(startDate);
    if (Number.isNaN(startedAt.getTime())) return null;
    const today = new Date(getLocalDate());
    return Math.floor((today - startedAt) / (1000 * 60 * 60 * 24)) + 1;
}

function isMandatoryScreenshotDay(testingDay) {
    return [1, 7, 14].includes(testingDay);
}

function getOwnerActiveStatus(lastOwnerActivity) {
    if (!lastOwnerActivity) return false;
    const dt = new Date(lastOwnerActivity);
    if (Number.isNaN(dt.getTime())) return false;
    const diffMs = Date.now() - dt.getTime();
    return diffMs <= (12 * 60 * 60 * 1000);
}

function isProjectSynced(test) {
    return (test.google_sync_day || 0) > 1;
}

function getScreenshotReminderHtml(test) {
    const testingDay = getUserTestingDay(test.start_date);
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
    const joinType = String(test && test.join_type || '').toLowerCase();
    if (joinType === 'bounty') {
        return `<span class="meta-chip accent-purple">💎 ${window.escapeHTML(window.t('testSourceBounty', {}, lang))}</span>`;
    }
    if (joinType === 'prelaunch') {
        return `<span class="meta-chip accent-blue">🚀 ${window.escapeHTML(window.t('testSourcePrelaunch', {}, lang))}</span>`;
    }
    if (joinType === 'mutual') {
        return `<span class="meta-chip accent-green">🤝 ${window.escapeHTML(window.t('testSourceMutual', {}, lang))}</span>`;
    }
    if (joinType === 'invite') {
        return `<span class="meta-chip">🔗 ${window.escapeHTML(window.t('testSourceInvite', {}, lang))}</span>`;
    }
    return '';
}

function renderCompactMeta(daysSincePublish, activeTestersCount, isNew, userTestingDay, test) {
    const parts = [];
    if (test) {
        const sourceChip = getTestSourceChip(test);
        if (sourceChip) {
            parts.push(sourceChip);
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
    if (typeof activeTestersCount === 'number') {
        const testerLabel = t.testersShort.replace('{count}', activeTestersCount);
        const tooltip = t.chipTooltipTesters.replace('{count}', activeTestersCount);
        parts.push(`<button class="meta-chip" onclick="event.stopPropagation(); showToast('${tooltip.replace(/'/g, "\\'")}')">${testerLabel}</button>`);
    }
    if (typeof userTestingDay === 'number' && userTestingDay > 0) {
        const dayText = t.myTestDayShort.replace('{days}', userTestingDay);
        const isScreenshot = [1, 7, 14].includes(userTestingDay);
        const screenshotIcon = isScreenshot ? ' 📸' : '';
        const chipClass = isScreenshot ? 'meta-chip accent-orange' : 'meta-chip accent-blue';
        parts.push(`<button class="${chipClass}" onclick="event.stopPropagation(); showTestDayPopup(${userTestingDay})">${dayText}${screenshotIcon}</button>`);
    }
    if (isNew) {
        parts.unshift(`<button class="meta-chip accent-green">${t.newBadge}</button>`);
    }
    if (test) {
        const ownerActive = getOwnerActiveStatus(test.last_owner_activity);
        const ownerChip = ownerActive
            ? `<button class="meta-chip accent-green" onclick="event.stopPropagation(); showToast('${(t.ownerOnlineText || '').replace(/'/g, "\\'")}')">${t.ownerOnlineText}</button>`
            : `<button class="meta-chip accent-red" onclick="event.stopPropagation(); showToast('${(t.ownerOfflineText || '').replace(/'/g, "\\'")}')">${t.ownerOfflineText}</button>`;
        parts.push(ownerChip);
        if (isProjectSynced(test)) {
            parts.push(`<button class="meta-chip accent-green" onclick="event.stopPropagation(); showToast('${(t.syncDoneText || '').replace(/'/g, "\\'")}')">${t.syncDoneText}</button>`);
        }
    }
    if (parts.length === 0) {
        return '';
    }
    return `<div style="margin-bottom: 12px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">${parts.join('')}</div>`;
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
        if (isLoading) {
            section.style.display = '';
            showSkeleton('offers-carousel');
            return;
        }
        if (_offersLoadError) {
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
                return;
            }
            if (expireEl) {
                const leftTimeText = window.t('offerTimeLeftValue', { hours: remain.hours, minutes: remain.minutes }, lang);
                expireEl.textContent = window.t('offerTimeLeft', { time: leftTimeText }, lang);
            }
        });

        if (hasExpired) {
            renderIncomingOffers();
        }
    }, 1000);
}

function renderTests() {
    const activeList = document.getElementById('tests-list');
    const doneList = document.getElementById('done-list');
    activeList.innerHTML = '';
    doneList.innerHTML = '';

    let activeCount = 0;
    let doneCount = 0;

    myTests.forEach((test) => {
        const card = document.createElement('div');
        card.className = test.status === 'done' ? 'card card-done' : 'card';
        card.id = `test-card-${test.id}`;
        const userTestingDay = getUserTestingDay(test.start_date);
        const safePackage = escapeInlineJsString(test.package);
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');
        const langBadge = (test.target_lang && test.target_lang !== 'ALL') ? getLangBadge(test.target_lang) : '';

        let actionsHtml = '';
        if (test.status === 'new') {
            const groupUrl = test.google_group_url || 'https://groups.google.com/g/google-play-dev-test';
            const safeGroupUrl = escapeInlineJsString(groupUrl);
            actionsHtml = `
                <div class="first-day-actions">
                    <div class="first-day-row">
                        <button class="btn first-day-btn" style="flex: 1;" onclick="tg.openLink('${safeGroupUrl}', { try_browser: 'chrome' }); if(tg.HapticFeedback) tg.HapticFeedback.selectionChanged();">${t.joinGroup}</button>
                        <button class="btn-icon first-day-copy" style="width: 44px; min-height: 44px; font-size: 18px;" onclick="copyGroupUrl('${safeGroupUrl}')">📋</button>
                    </div>
                    <button class="btn first-day-btn" style="width: 100%;" onclick="handleFirstDownload(${test.id}, '${safePackage}')">
                        ${t.downloadPlay}
                    </button>
                    <div id="new-screenshot-box-${test.id}" style="display: none;">
                        <button id="btn-confirm-${test.id}" class="btn btn-success first-day-btn" style="width: 100%;" onclick="handleScreenshotAndConfirm(${test.id}, '${safeOwnerUsername}')">
                            💬 3. ${t.screenshotBtn}
                        </button>
                        <div style="color: #ff3b30; font-size: 13px; margin-top: 8px; text-align: center;">
                            ${t.screenshotWarning}
                        </div>
                    </div>
                </div>
            `;
        } else if (test.status === 'daily' || test.status === 'opened') {
            const testingDay = getUserTestingDay(test.start_date) || 999;
            const isScreenshotDay = isMandatoryScreenshotDay(testingDay);

            if (isScreenshotDay) {
                actionsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-secondary" style="width: 100%; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', true, '${safeOwnerUsername}')">
                            ${t.openBtn}
                        </button>
                        <button id="btn-confirm-${test.id}" class="btn" style="width: 100%; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                            💬 ${t.screenshotBtn}
                        </button>
                        <div style="color: #ff3b30; font-size: 13px; text-align: center;">
                            ${t.screenshotWarning}
                        </div>
                    </div>
                `;
            } else {
                actionsHtml = `
                    <div class="action-row">
                        <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', false, '')">
                            ${t.openBtn}
                        </button>
                        <button id="btn-confirm-${test.id}" class="btn" style="flex: 2; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                            ${t.confirmStart}
                        </button>
                    </div>
                `;
            }
        } else if (test.status === 'done') {
            actionsHtml = '';
        }

        const headerActions = [];
        if (test.status !== 'done') {
            if (userTestingDay >= 15) {
                headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #30d158;" onclick="openOvertimeModal(${test.id}, event)">🔄</button>`);
            } else {
                headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="openDropTestModal(${test.id}, event)">🗑️</button>`);
            }
        }
        const trailingHtml = headerActions.length
            ? `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">${headerActions.join('')}</div>`
            : '';

        // Кнопка "Забрать Грант" — если testing_days >= 14 и грант не забран и пропусков <= 3
        let claimHtml = '';
        const testDays = test.testing_days || getUserTestingDay(test.start_date) || 0;
        if (testDays >= 14 && !test.grant_claimed && (test.skips_count || 0) <= 3 && test.progress_id) {
            claimHtml = `
                <button id="btn-claim-${test.id}" class="btn btn-claim-grant" onclick="claimGrant(${test.progress_id}, ${test.id})">
                    🎁 ${window.t('claimGrantBtn')}
                </button>
            `;
        }
        const grantChipHtml = ''; // Grant chip moved to project details modal

        const doneBadgeHtml = test.status === 'done'
            ? '<div class="done-status-pill">' + window.escapeHTML(t.doneTodayText) + '</div><div class="done-watermark">' + window.escapeHTML(window.t('doneWatermarkText', {}, lang)) + '</div>'
            : '';

        let cardContent = `
            ${doneBadgeHtml}
            <div class="card-header">
                <div class="card-header-link" ${test.status === 'new' ? '' : `onclick="openProjectDetailsModal(${test.id})"`}>
                    ${renderIcon(test.name, test.icon_url)}
                    <div class="card-info">
                        <div class="card-title">${safeName}</div>
                        <div class="card-subtitle">${safePackageLabel}</div>
                    </div>
                </div>
                ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;">${langBadge}</div>` : ''}
                ${trailingHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay, test)}
            ${grantChipHtml}
            ${claimHtml}
            <div id="actions-${test.id}">
                ${actionsHtml}
            </div>
        `;

        if (test.status === 'done') {
            const reminderHtml = getScreenshotReminderHtml(test);
            if (reminderHtml) {
                cardContent += reminderHtml;
            }
            card.innerHTML = cardContent;
            card.style.cursor = 'pointer';
            card.onclick = () => window.openProjectDetailsModal(test.id);
            doneList.appendChild(card);
            doneCount++;
        } else {
            card.innerHTML = cardContent;
            activeList.appendChild(card);
            activeCount++;
        }
    });

    document.getElementById('done-count').innerText = doneCount;
    document.getElementById('done-section').style.display = doneCount > 0 ? 'block' : 'none';

    if (activeCount === 0) {
        activeList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎉</div>
                <h3>${t.emptyTests}</h3>
                <p>${t.emptyTestsDesc}</p>
            </div>
        `;
    }
}

function renderCompletedTests(completedTests) {
    const doneList = document.getElementById('done-list');
    doneList.innerHTML = '';

    let doneCount = 0;

    completedTests.forEach((test) => {
        const card = document.createElement('div');
        card.className = 'card card-done';
        card.id = `test-card-${test.id}`;
        const userTestingDay = getUserTestingDay(test.start_date);
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');

        const actionsHtml = '';

        const headerActions = [];
        if (test.owner_username) {
            headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent;" onclick="return openTelegramProfile('${safeOwnerUsername}', event)">💬</button>`);
        }
        headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="openDropTestModal(${test.id}, event)">🗑️</button>`);
        const ownerBtnHtml = `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">${headerActions.join('')}</div>`;

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
            <div class="card-header">
                ${renderIcon(test.name, test.icon_url)}
                <div class="card-info">
                    <div class="card-title">${safeName}</div>
                    <div class="card-subtitle">${safePackageLabel}</div>
                </div>
                ${ownerBtnHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay, test)}
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
        card.style.cursor = 'pointer';
        card.onclick = () => window.openProjectDetailsModal(test.id);
        doneList.appendChild(card);
        doneCount++;
    });

    document.getElementById('done-count').innerText = doneCount;
    document.getElementById('done-section').style.display = doneCount > 0 ? 'block' : 'none';
}

function getLangBadge(targetLang) {
    const langCode = String(targetLang || 'ALL').toUpperCase();
    if (langCode === 'RU') return `<button type="button" class="lang-badge" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('RU'))}')">🇷🇺</button>`;
    if (langCode === 'EN') return `<button type="button" class="lang-badge" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('EN'))}')">🇬🇧</button>`;
    return '';
}

function renderFeedCard(item, kind) {
    const ownerDisplay = window.escapeHTML(item.owner_full_name || (item.owner_username ? '@' + item.owner_username : window.t('idLabel', { id: item.owner_id }, lang)));
    const safeOwner = escapeInlineJsString(item.owner_username || '');
    const langBadge = (item.target_lang && item.target_lang !== 'ALL') ? getLangBadge(item.target_lang) : '';
    const bountyChip = kind === 'bounty'
        ? `<span class="meta-chip accent-purple">💎 ${item.bounty_per_tester || 0} $BUST</span>`
        : '';
    const kindChip = kind === 'mutual-seeking'
        ? `<span class="meta-chip accent-green">👨‍💻 ${window.t('tabTestersNeeded', {}, lang)}</span>`
        : (kind === 'mutual-prelaunch'
            ? `<span class="meta-chip accent-blue">${window.t('tabPreLaunch', {}, lang)}</span>`
            : '');

    let buttonText = window.t('mutualJoinBtn', {}, lang);
    let clickAction = `createMutualOffer(${item.app_id}, ${item.owner_id}, event)`;
    let buttonClass = 'btn btn-primary';
    let buttonDisabledAttr = '';
    let buttonExtraAttrs = `data-offer-target-app="${item.app_id}" data-offer-target-owner="${item.owner_id}"`;
    const isOwnProject = !!item.is_own_project;

    const hasPendingOffer = !!item.has_pending_offer;
    const hasIncomingFromOwner = (incomingOffers || []).some((offer) => {
        if (!offer || offer.status !== 'pending') return false;
        if (Number(offer.proposer_id) !== Number(item.owner_id)) return false;
        return true;
    });

    if (kind === 'mutual-seeking' && hasIncomingFromOwner) {
        buttonText = window.t('offerWaitingAnswer', {}, lang);
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
        clickAction = `joinMutual(${item.app_id}, true)`;
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
        <div class="market-card${isOwnProject ? ' market-card-own' : ''}">
            <div class="market-top">
                <div>
                    <div class="card-title">${window.escapeHTML(item.name || window.t('unknownLabel', {}, lang))}</div>
                    <div class="market-owner" onclick="openTesterDossier('${safeOwner}', ${item.owner_id}, ${item.app_id}); event.stopPropagation();">${ownerDisplay}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${isOwnProject ? `<span class="meta-chip own-project-chip">${window.t('ownProjectBadge', {}, lang)}</span>` : ''}
                    ${langBadge}
                    <span class="meta-chip accent-yellow">☯️ ${item.owner_karma || 0}</span>
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                <span class="meta-chip">👥 ${item.mutual_testers_count ?? item.bounty_testers_count ?? 0}</span>
                ${kindChip}
                ${bountyChip}
            </div>
            <button class="${buttonClass}" ${buttonDisabledAttr} ${buttonExtraAttrs} onclick="${clickAction}">${buttonText}</button>
        </div>
    `;
}

function renderMutualReturns(apps) {
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
    if ((!apps || apps.length === 0) && isLoading) {
        container.style.display = '';
        showSkeleton('mutual-returns-list');
        return;
    }

    if (!apps || apps.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = '';
    list.innerHTML = apps.map(app => {
        const ownerUsername = (app.owner_username || '').replace('@', '');
        const safeOwnerUsername = escapeInlineJsString(ownerUsername);
        const displayOwner = window.escapeHTML(ownerUsername ? '@' + ownerUsername : window.t('idLabel', { id: app.owner_id }, lang));
        const appName = window.escapeHTML(app.name || window.t('unknownLabel', {}, lang));
        const myProjectNameRaw = app.my_project_name || '';
        const contextText = window.escapeHTML(window.t('mutualReturnContext', { project: myProjectNameRaw }, lang));
        const hasPendingOffer = !!app.has_pending_offer;
        const returnBtnText = window.escapeHTML(window.t(hasPendingOffer ? 'offerPending' : 'mutualReturnBtn', {}, lang));
        const btnClass = hasPendingOffer ? 'btn pending disabled' : 'btn btn-primary';
        const btnDisabled = hasPendingOffer ? 'disabled' : '';
        const btnClick = hasPendingOffer
            ? 'void(0)'
            : `if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); window.createMutualOffer(${app.app_id}, ${app.owner_id}, event);`;
        return `
            <div class="horizontal-card">
                <div style="font-size:12px; color:var(--hint-color); margin-bottom:8px; line-height:1.4;">
                    <button class="tester-link" style="background:none;border:none;padding:0;font-size:12px;cursor:pointer;color:var(--link-color);" onclick="openTesterDossier('${safeOwnerUsername}', ${app.owner_id}, ${app.app_id}); event.stopPropagation();">${displayOwner}</button><span>${contextText}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                    ${renderIcon(app.name || '', app.icon_url)}
                    <div class="card-title" style="font-size:14px;">${appName}</div>
                </div>
                <button class="${btnClass}" ${btnDisabled} style="width:100%;" data-offer-target-app="${app.app_id}" data-offer-target-owner="${app.owner_id}" onclick="${btnClick}">${returnBtnText}</button>
            </div>
        `;
    }).join('');
}

function renderMutualFeed() {
    const seekingEl = document.getElementById('mutual-seeking-list');
    const prelaunchEl = document.getElementById('mutual-prelaunch-list');
    if (!seekingEl || !prelaunchEl) return;

    const isLoading = !!(window._marketInFlight && (window._marketInFlight.mutual));

    if (!mutualSeeking.length) {
        if (isLoading) showSkeleton('mutual-seeking-list');
        else seekingEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        seekingEl.innerHTML = mutualSeeking.map((item) => renderFeedCard(item, 'mutual-seeking')).join('');
    }

    if (!mutualPrelaunch.length) {
        if (isLoading) showSkeleton('mutual-prelaunch-list');
        else prelaunchEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        prelaunchEl.innerHTML = mutualPrelaunch.map((item) => renderFeedCard(item, 'mutual-prelaunch')).join('');
    }
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

function renderBountyFeed() {
    const bountyEl = document.getElementById('bounty-list');
    if (!bountyEl) return;
    const isLoading = !!(window._marketInFlight && (window._marketInFlight.bounty));
    if (!bountyContracts.length) {
        if (isLoading) showSkeleton('bounty-list');
        else bountyEl.innerHTML = `<p class="no-testers" style="margin-top: 10px;">${t.bountyEmpty}</p>`;
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

function formatDeveloperAchievements(completedTests, goldenCount) {
    const testsWord = pluralizeTestWord(completedTests);
    if (goldenCount > 0) {
        return window.t('developerAchievementsWithGrant', {
            tests_count: completedTests,
            tests_word: testsWord,
            grants_count: goldenCount,
            grants_word: pluralizeGrantWord(goldenCount),
            grant_tag: window.t('developerGrantTag', {}, lang)
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
    if (newCount > 0) return '';
    if (totalCount > 0) return ' <span class="feedback-btn-badge feedback-btn-badge-total">' + window.escapeHTML(String(totalCount)) + '</span>';
    return '';
}

function buildProjectFeedbackButton(projectId, feedbackTotalCount, feedbackNewCount, isArchived) {
    const totalCount = Number(feedbackTotalCount || 0);
    const newCount = Number(feedbackNewCount || 0);
    const accentClass = newCount > 0 ? ' btn-feedback-alert' : '';
    const badgeHtml = newCount > 0
        ? ''
        : (totalCount > 0
            ? '<span class="feedback-btn-badge feedback-btn-badge-total">' + window.escapeHTML(String(totalCount)) + '</span>'
            : '');
    return '<button class="btn btn-secondary project-feedback-btn' + accentClass + '" style="width: 100%; margin-bottom: 8px; background-color: rgba(10, 132, 255, 0.12); color: var(--text-color); border: 1px solid rgba(10, 132, 255, 0.22);" onclick="openProjectFeedback(' + projectId + ', ' + (isArchived ? 'true' : 'false') + ')">' +
        '<span class="project-feedback-btn-inner">' + window.escapeHTML(window.t('projectFeedbackButtonShort', {}, lang)) + badgeHtml + '</span>' +
    '</button>';
}

function formatCompactSyncLabel(project) {
    var syncDate = parseLocalDateOnly(project && project.last_sync_date);
    var dateLabel = syncDate
        ? syncDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: '2-digit' })
        : '--.--';
    return window.t('syncBtnCompact', { date: dateLabel }, lang);
}

function renderProjects() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';

    if (visibilityStats) {
        const reliability = calculateReliability(visibilityStats.total_expected_checkins, visibilityStats.total_actual_checkins);
        const reliabilityValue = reliability.percent !== null ? String(reliability.percent) : reliability.text;
        const goldenCount = Number(visibilityStats.golden_count || 0);
        const completedTests = Number(visibilityStats.completed_tests || 0);
        const activeTests = Number(visibilityStats.my_active_tests || 0);
        const achievementsLine = window.escapeHTML(formatDeveloperAchievements(completedTests, goldenCount));
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
        card.className = isInactive ? 'card card-inactive' : 'card';
        const safeProjectName = window.escapeHTML(project.name || window.t('unknownLabel', {}, lang));
        const safeProjectPackage = window.escapeHTML(project.package || '');

        const createdDate = project.created_at ? new Date(project.created_at) : null;
        const createdValid = !!(createdDate && !Number.isNaN(createdDate.getTime()));
        const rawPlatformDays = createdValid ? (Math.floor((todayDate - createdDate) / (1000 * 60 * 60 * 24)) + 1) : 1;
        const platformDays = Math.max(1, Number.isFinite(rawPlatformDays) ? rawPlatformDays : 1);
        const syncDiffDays = project.last_sync_date ? getDayDiffFromToday(project.last_sync_date) : 0;
        const syncDay = Number(project.google_sync_day || 0);
        const normalizedSyncDay = Number.isFinite(syncDay) ? syncDay : 0;
        const rawGoogleDay = normalizedSyncDay > 1
            ? normalizedSyncDay + Math.max(0, syncDiffDays)
            : platformDays;
        const currentGoogleDay = Math.max(1, Number.isFinite(rawGoogleDay) ? rawGoogleDay : 1);
        const likesAvailable = project.likes_max - project.likes_used;

        let testersHtml = '';
        if (project.testers && project.testers.length > 0) {
            testersHtml = '<ul class="tester-list">';
            project.testers.forEach((tester) => {
                let nameHtml = '';
                let cleanUsername = '';
                if (tester.username) {
                    cleanUsername = tester.username.replace('@', '');
                    nameHtml = `<a href="javascript:void(0);" onclick="return openTelegramProfile('${escapeInlineJsString(cleanUsername)}', event)" class="tester-link">@${window.escapeHTML(cleanUsername)}</a>`;
                } else {
                    nameHtml = `<span class="tester-id">${window.t('idLabel', { id: tester.tester_id }, lang)}</span>`;
                }

                let statusHtml = '';
                let showBell = false;
                if (!tester.last_check_date) {
                    statusHtml = `<span style="color: #ff3b30; font-weight: 500; font-size: 13px;">🔴 ${t.statusNotOpened}</span>`;
                    showBell = true;
                } else if (tester.last_check_date === today) {
                    statusHtml = `<span style="color: #34c759; font-weight: 500; font-size: 13px;">🟢 ${t.statusToday}</span>`;
                } else {
                    const daysDiff = getDaysDiff(tester.last_check_date);
                    if (daysDiff === 1) {
                        statusHtml = `<span style="color: #ffcc00; font-weight: 500; font-size: 13px;">🟡 ${t.statusYesterday}</span>`;
                    } else {
                        statusHtml = `<span style="color: #ff3b30; font-weight: 500; font-size: 13px;">🔴 ${daysDiff} ${t.statusDaysAgo}</span>`;
                        showBell = true;
                    }
                }

                let bellHtml = '';
                if (showBell && cleanUsername) {
                    const msg = t.bellNotifyMsg.replace('{name}', project.name || window.t('unknownLabel', {}, lang));
                    bellHtml = `<a href="javascript:void(0);" onclick="tg.openTelegramLink('https://t.me/${escapeInlineJsString(cleanUsername)}?text=${escapeInlineJsString(encodeURIComponent(msg))}')" style="text-decoration: none; font-size: 16px;">🔔</a>`;
                }

                let screenshotDayHtml = '';
                if (tester.start_date) {
                    const startDt = new Date(tester.start_date);
                    const testerDay = Math.floor((todayDate - startDt) / (1000 * 60 * 60 * 24)) + 1;
                    if ([1, 7, 14].includes(testerDay)) {
                        screenshotDayHtml = `<span onclick="showScreenshotDayAlert()" style="cursor: pointer; font-size: 16px;">📸</span>`;
                    }
                }

                let karmaHtml = '';
                if (likesAvailable > 0) {
                    const alreadyLiked = (project.likes || []).some((like) => like.tester_id === tester.tester_id);
                    karmaHtml = alreadyLiked
                        ? '<span style="font-size: 14px; opacity: 0.4;" title="☯️">+☯️</span>'
                        : `<span onclick="showKarmaPopup(${project.id}, ${tester.tester_id})" style="cursor: pointer; font-size: 14px;">+☯️</span>`;
                } else {
                    const alreadyLiked = (project.likes || []).some((like) => like.tester_id === tester.tester_id);
                    if (alreadyLiked) {
                        karmaHtml = '<span style="font-size: 14px; opacity: 0.4;" title="☯️">+☯️</span>';
                    }
                }

                const chevronHtml = '<span style="font-size: 18px; opacity: 0.35; flex-shrink: 0;">›</span>';

                testersHtml += `
                    <li onclick="openDossierModal('${escapeInlineJsString(cleanUsername)}', ${tester.tester_id}, ${project.id})" style="cursor: pointer;">
                        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;" onclick="event.stopPropagation()">
                            ${nameHtml}
                            ${screenshotDayHtml}
                            ${bellHtml}
                            ${karmaHtml}
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; flex-shrink: 0;">
                            ${statusHtml}
                            ${chevronHtml}
                        </div>
                    </li>
                `;
            });
            testersHtml += '</ul>';
        } else {
            testersHtml = `<p class="no-testers">${t.noTesters}</p>`;
        }

        const visibilityBadge = (() => {
            let badges = '';

            const statusChip = (() => {
                if (!project.is_visible) {
                    return `<button class="meta-chip" style="background: rgba(142,142,147,0.15);" onclick="showToast('${escapeInlineJsString(t.visibilityManualToast)}')">🚫 ${t.statusHiddenManual}</button>`;
                }
                const mode = project.mode || 'mutual';
                if (mode === 'bounty') {
                    return `<button class="meta-chip accent-purple" onclick="void(0)">${t.modeBounty}</button>`;
                }
                if (mode === 'hybrid') {
                    return `<button class="meta-chip accent-orange" onclick="void(0)">${t.modeHybrid}</button>`;
                }
                return `<button class="meta-chip accent-green" onclick="void(0)">${t.modeMutual}</button>`;
            })();
            if (statusChip) badges += statusChip;

            if (likesAvailable > 0) {
                const karmaChipText = t.karmaAvailable.replace('{count}', likesAvailable);
                badges += `<button class="meta-chip accent-yellow" onclick="openKarmaDistribution(${project.id})">${karmaChipText}</button>`;
            }

            if (project.target_lang && project.target_lang !== 'ALL') {
                badges += getLangBadge(project.target_lang);
            }

            return badges;
        })();

        const projectProgressHtml = (() => {
            if ((project.google_sync_day || 0) <= 1) {
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
            if (project.mode === 'mutual' || project.mode === 'hybrid') {
                chips.push(`<span class="meta-chip">🤝 ${project.limit_mutual || 0}</span>`);
            }
            if (project.mode === 'bounty' || project.mode === 'hybrid') {
                chips.push(`<span class="meta-chip accent-purple">💎 ${project.limit_bounty || 0} × ${formatBustAmount(project.bounty_per_tester || 0)}</span>`);
                chips.push(`<span class="meta-chip accent-blue">${t.calcTotalCost}: ${formatBustAmount((project.limit_bounty || 0) * (project.bounty_per_tester || 0))}</span>`);
            }
            if (!chips.length) return '';
            return `<div style="margin: 8px 0 10px; display: flex; gap: 6px; flex-wrap: wrap;">${chips.join('')}</div>`;
        })();

        const karmaBonusChipHtml = (() => {
            if (platformDays < 14 || !project.testers || project.testers.length < 5) return '';
            return `<button class="meta-chip accent-green" onclick="showToast('${escapeInlineJsString(t.deleteKarmaBonus)}')">${t.deleteKarmaBonusChip}</button>`;
        })();

        const hasSync = (project.google_sync_day || 0) > 1;
        const syncActionHtml = hasSync
            ? `<div class="action-row" style="margin-top: 0; margin-bottom: 10px;">
                    <button class="btn btn-secondary" style="flex: 1; background-color: rgba(52, 199, 89, 0.12); color: var(--text-color); border: 1px solid rgba(52, 199, 89, 0.22);" onclick="openSyncModal(${project.id})">${window.escapeHTML(formatCompactSyncLabel(project))}</button>
                    <button class="btn btn-secondary" style="flex: 1; background-color: rgba(10, 132, 255, 0.12); color: var(--text-color); border: 1px solid rgba(10, 132, 255, 0.22);" onclick="openProjectFeedback(${project.id}, false)">
                        ${window.escapeHTML(window.t('projectFeedbackButtonShort', {}, lang))}${buildProjectFeedbackBadge(project.feedback_total_count || 0, project.feedback_new_count || 0)}
                    </button>
                </div>`
            : `<button class="btn btn-secondary" style="width: 100%; margin-bottom: 10px; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="openSyncModal(${project.id})">
                    ${t.syncBtnLong}
                </button>
                ${buildProjectFeedbackButton(project.id, project.feedback_total_count || 0, project.feedback_new_count || 0, false)}`;

        card.innerHTML = `
            <div class="card-header" style="margin-bottom: 8px;">
                ${renderIcon(project.name || window.t('unknownLabel', {}, lang), project.icon_url)}
                <div class="card-info">
                    <div class="card-title">${safeProjectName}</div>
                    <div class="card-subtitle">${safeProjectPackage}</div>
                </div>
                <div class="project-header-actions">
                    <button class="project-icon-btn" onclick="openEditModal(${project.id})">✏️</button>
                    ${project.is_visible
                        ? `<button class="project-icon-btn eye-on" onclick="toggleVisibility(${project.id}, false)">👁️</button>`
                        : `<button class="project-icon-btn eye-off" onclick="toggleVisibility(${project.id}, true)">🚫</button>`}
                </div>
            </div>
            <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${visibilityBadge}
            </div>
            ${project.is_visible === false ? `<div class="visibility-hint">${t.inviteLinkAlways}</div>` : ''}
            ${projectProgressHtml}
            ${quotaSummaryHtml}
            <div style="margin-bottom: 8px; display: flex; gap: 6px; flex-wrap: wrap;">${karmaBonusChipHtml}</div>
            <div class="testers-section">
                <div class="testers-title">${t.testersList} (${project.testers ? project.testers.length : 0})</div>
                ${testersHtml}
            </div>
            <div style="margin-top: 16px;">
                ${syncActionHtml}
                <div class="action-row" style="margin-top: 10px;">
                    <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="openInviteModal(${project.id})">
                        🔗 ${t.inviteLink}
                    </button>
                    <button class="btn" style="flex: 1; background-color: rgba(255, 59, 48, 0.1); color: #ff3b30;" onclick="openDeleteModal(${project.id})">
                        🗑 ${t.deleteProject}
                    </button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
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

function openReportModal(appId, ownerUsername) {
    _reportAppId = appId;
    _reportOwnerUsername = ownerUsername;
    const textarea = document.getElementById('report-text');
    textarea.value = t.reportPrefill;
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

function openContactModal(ownerUsername) {
    _contactOwnerUsername = ownerUsername;
    const textarea = document.getElementById('contact-text');
    textarea.value = t.contactPrefill;
    document.getElementById('attach-project-container').style.display = 'none';
    const select = document.getElementById('attach-project-select');
    select.innerHTML = '<option value="">' + window.escapeHTML(t.contactSelectProject) + '</option>'
        + myProjects.map((project) => '<option value="' + project.id + '">' + window.escapeHTML(project.name || window.t('unknownLabel', {}, lang)) + '</option>').join('');
    document.getElementById('contact-modal').classList.add('active');
}

function closeContactModal(event) {
    if (event && event.target !== document.getElementById('contact-modal')) return;
    document.getElementById('contact-modal').classList.remove('active');
}

function resetContactText() {
    document.getElementById('contact-text').value = t.contactPrefill;
}

function toggleAttachProject() {
    const container = document.getElementById('attach-project-container');
    container.style.display = container.style.display === 'none' ? 'block' : 'none';
}

function onProjectSelected() {
    const select = document.getElementById('attach-project-select');
    const selectedId = select.value;
    if (selectedId) {
        const textarea = document.getElementById('contact-text');
        const link = 'https://t.me/Android12TestersBot?start=app_' + selectedId;
        if (!textarea.value.includes(link)) {
            textarea.value += '\n\n🔗 ' + link;
        }
    }
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

function openSyncModal(projectId) {
    const project = myProjects.find((item) => item.id === projectId);
    const modal = document.getElementById('sync-modal');
    const body = document.getElementById('sync-modal-body');
    if (!project || !modal || !body) return;

    _syncProjectId = projectId;
    const hasSync = (project.google_sync_day || 0) > 1;
    let isEditMode = !hasSync;

    const renderModalContent = () => {
        const liveProject = myProjects.find((item) => item.id === projectId) || project;
        const currentSyncDay = Number(liveProject.google_sync_day || 0);
        const syncDiffDays = liveProject.last_sync_date ? getDayDiffFromToday(liveProject.last_sync_date) : 0;
        const currentGoogleDay = currentSyncDay > 1 ? currentSyncDay + syncDiffDays : 0;
        const leftDays = Math.max(0, 14 - currentGoogleDay);
        const today = parseLocalDateOnly(getLocalDate()) || new Date();
        const finishDate = new Date(today);
        finishDate.setDate(finishDate.getDate() + leftDays);
        const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
        const lastSyncDate = parseLocalDateOnly(liveProject.last_sync_date);
        const updatedDaysAgo = lastSyncDate ? getDayDiffFromToday(lastSyncDate) : 0;

        if (!isEditMode && hasSync) {
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

            body.innerHTML = `
                <h3 style="margin-bottom:12px;">${window.escapeHTML(window.t('syncModalTitle', {}, lang))}</h3>
                <div style="font-size:12px; margin-bottom:10px; ${updatedStyle}">${window.escapeHTML(updatedText)}</div>
                <div class="grant-progress-container">${segments.join('')}</div>
                <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:12px;color:var(--hint-color);">
                    <span>${window.escapeHTML(window.t('projectGoogleDayLabel', { day: currentGoogleDay }, lang))}</span>
                    <span>${window.escapeHTML(window.t('googleDaysLeft', { count: leftDays }, lang))}</span>
                </div>
                <div class="details-block" style="margin-top:10px;">
                    <div style="font-size:13px;color:var(--hint-color);">${window.escapeHTML(window.t('syncEstimatedFinish', { date: finishDate.toLocaleDateString(locale) }, lang))}</div>
                </div>
                ${syncMessageHtml}
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
                if (hasSync) {
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
                <div class="card-title">${safeName}</div>
                <div class="card-subtitle">${window.escapeHTML(window.t('projectFeedbackTitle', {}, lang))}</div>
            </div>
        </div>
        <div class="feedback-modal-summary">
            <span class="meta-chip accent-blue">💬 ${window.t('projectFeedbackTotalChip', { count: totalCount }, lang)}</span>
            <span class="meta-chip accent-green">🆕 ${window.t('projectFeedbackNewChip', { count: newCount }, lang)}</span>
        </div>
    `;
}

function renderProjectFeedbackCards(project, items) {
    if (!items || !items.length) {
        return `<div class="feedback-empty">${window.escapeHTML(window.t('projectFeedbackEmpty', {}, lang))}</div>`;
    }
    const projectId = Number(project && (project.id || project.app_id) || 0);
    return `<div class="feedback-list">${items.map(function(item) {
        const username = (item.tester_username || '').replace('@', '');
        const safeUsername = escapeInlineJsString(username);
        const fullName = window.escapeHTML(item.tester_full_name || '');
        const usernameLabel = username ? '@' + window.escapeHTML(username) : '';
        const primaryAuthor = fullName || usernameLabel || window.escapeHTML(window.t('idLabel', { id: item.tester_id }, lang));
        const secondaryAuthor = fullName && usernameLabel ? usernameLabel : '';
        const authorInnerHtml = `<span class="feedback-card-author-main">${primaryAuthor}</span>${secondaryAuthor ? `<span class="feedback-card-author-sub">${secondaryAuthor}</span>` : ''}`;
        const authorHtml = username
            ? `<a href="javascript:void(0);" class="feedback-card-author" onclick="return openTelegramProfile('${safeUsername}', event)">${authorInnerHtml}</a>`
            : `<span class="feedback-card-author">${authorInnerHtml}</span>`;
        const textHtml = item.message_text
            ? escapeHtmlWithBreaks(item.message_text)
            : `<span style="color: var(--hint-color);">${window.escapeHTML(window.t('projectFeedbackNoText', {}, lang))}</span>`;
        const rewardBust = Number(item.reward_bust || 0);
        const rewardKarma = Number(item.reward_karma || 0);
        const rewardSummary = item.status === 'processed'
            ? `<div class="feedback-modal-summary" style="margin-top: 10px;">
                    ${rewardBust > 0 ? `<span class="meta-chip accent-purple">💎 ${formatBustAmount(rewardBust)}</span>` : ''}
                    ${rewardKarma > 0 ? `<span class="meta-chip accent-yellow">☯️ ${rewardKarma.toFixed(1)}</span>` : ''}
                    <span class="meta-chip">${window.escapeHTML(window.t('projectFeedbackProcessedBadge', {}, lang))}</span>
               </div>`
            : '';
        const replyHtml = item.developer_reply
            ? `<div class="feedback-card-reply">${window.escapeHTML(window.t('feedbackRewardReplyCard', {}, lang))}: ${escapeHtmlWithBreaks(item.developer_reply)}</div>`
            : '';
        return `
            <div class="feedback-card ${item.status === 'new' ? 'is-new' : ''}">
                <div class="feedback-card-header">
                    <div>${authorHtml}</div>
                    <div class="feedback-card-date">${window.escapeHTML(formatFeedbackDate(item.created_at))}</div>
                </div>
                <div class="feedback-card-text">${textHtml}</div>
                <div class="feedback-card-actions">
                    ${item.tg_file_id ? `<button class="btn btn-secondary" style="width:auto;" onclick="sendProjectFeedbackMedia(${item.id})">🖼 ${window.escapeHTML(window.t('projectFeedbackViewScreenshotBtn', {}, lang))}</button>` : ''}
                    ${item.status === 'new' ? `<button class="btn btn-primary" style="width:auto;" onclick="openFeedbackRewardModal(${projectId}, ${item.id})">🎁 ${window.escapeHTML(window.t('projectFeedbackRewardBtn', {}, lang))}</button>` : ''}
                </div>
                ${rewardSummary}
                ${replyHtml}
            </div>
        `;
    }).join('')}</div>`;
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

function renderArchivedProjects() {
    const section = document.getElementById('archive-section');
    if (!section) return;
    if (archivedProjects.length === 0) {
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
                <span class="archive-toggle-label">${t.archiveTitle} (${archivedProjects.length})</span>
                <span class="archive-toggle-arrow">▼</span>
            </button>
            <div id="archive-list" class="archive-list is-collapsed">
    `;
    archivedProjects.forEach((project) => {
        const modeLabel = project.mode === 'bounty' ? t.modeBounty : project.mode === 'hybrid' ? t.modeHybrid : t.modeMutual;
        const archiveName = project.name || window.t('unknownLabel', {}, lang);
        const safeArchiveName = window.escapeHTML(archiveName);
        const safeArchivePackage = window.escapeHTML(project.package_name || '');
        const langBadge = (project.target_lang && project.target_lang !== 'ALL') ? getLangBadge(project.target_lang) : '';
        const afkChip = project.archive_reason === 'afk' ? '<span class=\"meta-chip accent-red\">' + t.archivedAfkOwnerChip + '</span>' : '';
        html += `
            <div class="card archive-card">
                <div class="card-header archive-card-header">
                    ${renderIcon(archiveName, project.icon_url)}
                    <div class="card-info">
                        <div class="card-title">${safeArchiveName}</div>
                        <div class="card-subtitle">${safeArchivePackage}</div>
                    </div>
                    ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;">${langBadge}</div>` : ''}
                </div>
                <div class="archive-meta-row">
                    <span class="archive-meta-chip">${modeLabel}</span>
                    ${afkChip}
                    <span class="archive-meta-chip">👥 ${project.total_testers}</span>
                    <span class="archive-meta-chip">✅ ${project.total_checkins}</span>
                    <span class="archive-meta-chip">🆕 ${project.feedback_new_count || 0}</span>
                </div>
                <div class="action-row" style="margin-top: 10px;">
                    <div style="flex: 1;">${buildProjectFeedbackButton(project.app_id, project.feedback_total_count || 0, project.feedback_new_count || 0, true)}</div>
                    <button class="btn archive-delete-btn" style="flex: 1;"
                        onclick="confirmHardDelete(${project.app_id}, '${escapeInlineJsString(archiveName)}')">
                        ${t.archiveDeletePermanent}
                    </button>
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

function getKarmaSourceLabel(sourceType) {
    const normalized = String(sourceType || '').toLowerCase();
    const keyMap = {
        checkin: 'karmaSrc_checkin',
        overtime_checkin: 'karmaSrc_overtime_checkin',
        good_test: 'karmaSrc_good_test',
        bug_report: 'karmaSrc_bug_report',
        overtime_reward: 'karmaSrc_overtime_reward',
        owner_bonus: 'karmaSrc_owner_bonus',
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

function openKarmaDistribution(projectId) {
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

    const likesAvailable = Math.max(0, (project.likes_max || 0) - (project.likes_used || 0));
    const testers = project.testers || [];
    if (!testers.length) {
        body.innerHTML = `<h3>${window.escapeHTML(t.karmaDistributionTitle)}</h3><p style="color:var(--hint-color);">${window.escapeHTML(t.karmaDistNoTesters)}</p>`;
        document.getElementById('karma-distribution-modal').classList.add('active');
        return;
    }

    const rowsHtml = testers.map((tester) => {
        const testerDay = tester.start_date ? (getDayDiffFromToday(tester.start_date) + 1) : 0;
        const actualSkips = Math.max(0, (testerDay - 1) - (tester.checkins_count || 0));
        const liked = (project.likes || []).find((like) => like.tester_id === tester.tester_id);
        const name = tester.username
            ? '@' + window.escapeHTML(tester.username.replace('@', ''))
            : window.escapeHTML(window.t('idLabel', { id: tester.tester_id }));
        const stats = window.escapeHTML(window.t('karmaDistributionTesterStats', {
            day: testerDay,
            checkins: tester.checkins_count || 0,
            skips: actualSkips,
        }));
        const amountByType = liked ? (liked.type === 'bug' ? '3.0' : liked.type === 'overtime' ? '2.0' : '1.5') : '';
        const actionHtml = liked
            ? `<span class="karma-dist-btn disabled">${window.escapeHTML(window.t('karmaDistributionUsed', { amount: amountByType }))}</span>`
            : likesAvailable <= 0
                ? '<span class="karma-dist-btn disabled">+☯️</span>'
                : `<button class="karma-dist-btn" onclick="event.stopPropagation(); openKarmaSelectPopup(${projectId}, ${tester.tester_id})">+☯️</button>`;

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
        <div>${rowsHtml}</div>
        <button class="btn btn-secondary" style="width:100%;margin-top:14px;" onclick="closeKarmaDistribution()">${window.escapeHTML(t.inviteClose)}</button>
    `;

    document.getElementById('karma-distribution-modal').classList.add('active');
}

function closeKarmaDistribution(event) {
    if (event && event.target && event.target.id !== 'karma-distribution-modal') return;
    document.getElementById('karma-distribution-modal').classList.remove('active');
    window._karmaDistributionProjectId = null;
}

function showKarmaPopup(appId, testerId) {
    openKarmaSelectPopup(appId, testerId);
}

function showCustomAlert(text) {
    const overlay = document.getElementById('custom-alert-overlay');
    document.getElementById('custom-alert-text').innerText = text;
    overlay.classList.add('active');
}

function closeCustomAlert(event) {
    if (event && event.target && event.target.id !== 'custom-alert-overlay') {
        return;
    }
    document.getElementById('custom-alert-overlay').classList.remove('active');
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

    if (finalTab === 'market') {
        var hasMutualData = Array.isArray(mutualSeeking) && mutualSeeking.length > 0
            || Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0;
        var hasBountyData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
        if (!hasMutualData) {
            showSkeleton('mutual-seeking-list');
            showSkeleton('mutual-prelaunch-list');
        }
        if (!hasBountyData) {
            showSkeleton('bounty-list');
        }
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
    }

    if (finalTab === 'projects') {
        if (window.loadProjects) {
            window.loadProjects(true).catch(function() {});
        }
    }

    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function toggleAccordion() {
    const accordion = document.getElementById('done-section');
    const content = document.getElementById('done-list');

    if (content.classList.contains('active')) {
        content.classList.remove('active');
        accordion.classList.remove('active');
    } else {
        content.classList.add('active');
        accordion.classList.add('active');
    }
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function closeBanner() {
    const banner = document.getElementById('main-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('hideBanner', 'true');
}

function openInviteModal(projectId) {
    _inviteProjectId = projectId;
    const project = myProjects.find((item) => item.id === projectId);
    if (!project) return;

    const link = `https://t.me/Android12TestersBot?start=app_${project.id}`;
    const instrLine = project.instructions ? `\n${t.inviteDescLabel}${project.instructions}` : '';

    const block1Text = t.inviteBlock1Text.replace('{name}', project.name).replace('{instr}', instrLine).replace('{link}', link);
    const block2Text = t.inviteBlock2Text.replace('{name}', project.name).replace('{link}', link);
    const block3Text = link;

    const cardStyle = 'background: var(--secondary-bg-color); border-radius: 12px; padding: 14px; margin-bottom: 12px;';
    const titleStyle = 'font-size: 15px; font-weight: 600; margin-bottom: 10px;';
    const preStyle = 'font-family: monospace; font-size: 12px; color: var(--hint-color); white-space: pre-wrap; word-break: break-word; max-height: 150px; overflow-y: auto; margin-bottom: 12px; line-height: 1.4;';

    const body = document.getElementById('invite-modal-body');
    body.innerHTML = `
        <div style="${cardStyle}">
            <div style="${titleStyle}">${t.inviteBlock1Title}</div>
            <div style="${preStyle}">${window.escapeHTML(block1Text)}</div>
            <button class="btn btn-primary" onclick="copyAndAction('${escapeForAttr(block1Text)}', 'exchange')">${t.inviteBlock1Btn}</button>
        </div>
        <div style="${cardStyle}">
            <div style="${titleStyle}">${t.inviteBlock2Title}</div>
            <div style="${preStyle}">${window.escapeHTML(block2Text)}</div>
            <button class="btn" style="width: 100%; background: rgba(51,144,236,0.12); color: var(--link-color); border: none;" onclick="copyAndAction('${escapeForAttr(block2Text)}', 'saved')">${t.inviteBlock2Btn}</button>
        </div>
        <div style="${cardStyle}">
            <div style="${titleStyle}">${t.inviteBlock3Title}</div>
            <div style="${preStyle}">${window.escapeHTML(block3Text)}</div>
            <button class="btn" style="width: 100%; background: rgba(51,144,236,0.12); color: var(--link-color); border: none;" onclick="copyAndAction('${escapeForAttr(block3Text)}', 'saved')">${t.inviteBlock3Btn}</button>
        </div>
    `;

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
    if (target === 'exchange') {
        tg.openTelegramLink('https://t.me/googleplay_console_12testers/2');
    } else {
        tg.openTelegramLink('https://t.me/share/url?text=' + encodeURIComponent(decoded));
    }
}

function closeInviteModal(event) {
    if (event && event.target !== document.getElementById('invite-modal')) return;
    document.getElementById('invite-modal').classList.remove('active');
    _inviteProjectId = null;
}

async function openDossierModal(username, testerId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const modal = document.getElementById('dossier-modal');
    document.getElementById('dossier-modal-title').innerText = username ? `@${username}` : window.t('idLabel', { id: testerId }, lang);
    document.getElementById('dossier-body').innerHTML = `<p style="text-align:center; color: var(--hint-color);">${t.dossierLoading}</p>`;
    modal.classList.add('active');

    const project = myProjects.find((item) => item.id === appId);
    const tester = project ? (project.testers || []).find((candidate) => candidate.tester_id === testerId) : null;
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

    let profile = { karma: 0, completed_tests: 0, total_expected_checkins: 0, total_actual_checkins: 0 };
    try {
        const resp = await fetch(`${API_BASE}/users/${testerId}/profile`);
        if (resp.ok) profile = await resp.json();
    } catch (error) {
        console.error('Dossier fetch error:', error);
    }

    let reliabilityText = t.dossierNewbie;
    const expected = profile.total_expected_checkins || 0;
    const actual = profile.total_actual_checkins || 0;
    let reliabilityPct = 0;
    if (expected >= 42) {
        reliabilityPct = Math.round((actual / expected) * 100);
        if (reliabilityPct >= 95) reliabilityText = t.reliabilityExcellent;
        else if (reliabilityPct >= 80) reliabilityText = t.reliabilityGood;
        else if (reliabilityPct >= 65) reliabilityText = t.reliabilityRisky;
        else reliabilityText = t.reliabilityUnreliable;
    }

    const likesAvailable = project ? (project.likes_max - project.likes_used) : 0;
    const alreadyLiked = project ? (project.likes || []).some((like) => like.tester_id === testerId) : true;
    const canReward = likesAvailable > 0 && !alreadyLiked;
    const canDeleteFromProject = !!tester && !!project && !!appId;
    const tgName = username || '';
    const safeTelegramUsername = escapeInlineJsString(tgName);
    const safeDeleteName = escapeInlineJsString(tgName || String(testerId));

    let html = '';
    const goldenCountText = (profile.golden_count || 0) > 0
        ? window.t('dossierGoldenCount', { count: profile.golden_count })
        : '';
    html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierGlobalTitle}</div>
        <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
            ${t.dossierExperience.replace('{count}', profile.completed_tests)}
            <br>${expected >= 42 ? t.dossierReliability.replace('{pct}', reliabilityPct) + ' ' + reliabilityText : t.disciplineLabel + ' ' + t.dossierNewbie}
            <br>${t.dossierKarma.replace('{karma}', profile.karma)}
            ${goldenCountText ? '<br><span class="golden-badge">' + window.escapeHTML(goldenCountText) + '</span>' : ''}
        </div>
    </div>`;

    if (tester) {
        html += `<div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierProjectTitle}</div>
            <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
                ${t.dossierTestingDay.replace('{day}', Math.min(testingDay, 14))}
                ${startDateStr ? '<br>' + t.dossierStartDate.replace('{date}', startDateStr) : ''}
                ${expectedFinish ? '<br>' + t.dossierExpectedFinish.replace('{date}', expectedFinish) : ''}
                <br>${t.dossierLastCheck.replace('{status}', lastCheckStatus)}
            </div>
        </div>`;
    }

    html += `<div>
        <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierActionsTitle}</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
            ${tgName ? `<button class="btn" style="width: 100%; background: var(--secondary-bg-color); color: var(--link-color); border: none; font-weight: 600; padding: 10px;" onclick="event.stopPropagation(); tg.openTelegramLink('https://t.me/${safeTelegramUsername}')">${t.dossierBtnTelegram}</button>` : ''}
            ${canReward ? `<button class="btn" style="width: 100%; background: rgba(255,204,0,0.15); color: #ffcc00; border: none; font-weight: 600; padding: 10px;" onclick="closeDossierModal(); showKarmaPopup(${appId}, ${testerId})">${t.dossierBtnKarma}</button>` : ''}
            ${canDeleteFromProject ? `<button class="btn" style="width: 100%; background: rgba(255,59,48,0.1); color: #ff3b30; border: none; font-weight: 600; padding: 10px;" onclick="closeDossierModal(); deleteTester(${appId}, ${testerId}, '${safeDeleteName}')">${t.dossierBtnDelete}</button>` : ''}
        </div>
    </div>`;

    document.getElementById('dossier-body').innerHTML = html;
}

function closeDossierModal(event) {
    if (event && event.target && event.target.id !== 'dossier-modal') return;
    document.getElementById('dossier-modal').classList.remove('active');
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
            const overtimeCheckins = Math.max(0, (tr.checkins_count || 0) - 14);
            const alreadyRewarded = projectLikes.some((like) => like.tester_id === tr.tester_id);
            return { ...tr, overtimeCheckins, alreadyRewarded };
        }).filter((tr) => tr.overtimeCheckins > 0);

        if (overtimeTesters.length > 0) {
            const totalOvertimeDays = overtimeTesters.reduce((acc, item) => acc + item.overtimeCheckins, 0);
            const optionsHtml = ['<option value="">' + window.escapeHTML(t.deleteOvertimeSelectNone) + '</option>']
                .concat(overtimeTesters.filter((tr) => !tr.alreadyRewarded).map((tr) => {
                    const label = tr.username ? '@' + window.escapeHTML(tr.username.replace('@', '')) : window.escapeHTML(window.t('idLabel', { id: tr.tester_id }));
                    return '<option value="' + tr.tester_id + '">' + label + '</option>';
                }))
                .join('');
            const listHtml = overtimeTesters.map((tr) => {
                const name = tr.username ? '@' + window.escapeHTML(tr.username.replace('@', '')) : window.escapeHTML(window.t('idLabel', { id: tr.tester_id }));
                return '<div class="delete-overtime-item">' +
                    '<div>' +
                        '<div class="delete-overtime-item-name">' + name + '</div>' +
                        '<div class="delete-overtime-item-meta">' + window.escapeHTML(window.t('deleteOvertimeTesterStats', { count: tr.overtimeCheckins })) + '</div>' +
                        (tr.alreadyRewarded
                            ? '<div class="delete-overtime-item-meta">' + window.escapeHTML(window.t('deleteOvertimeAlreadyRewarded')) + '</div>'
                            : '') +
                    '</div>' +
                    '<span class="meta-chip accent-purple">' + window.escapeHTML(window.t('deleteOvertimeDayChip', { count: tr.overtimeCheckins })) + '</span>' +
                '</div>';
            }).join('');

            infoHtml += '<div class="delete-info-block overtime">' +
                '<div style="font-weight:600;margin-bottom:6px;">' + window.escapeHTML(t.deleteOvertimeTitle) + '</div>' +
                '<div style="color:var(--hint-color);">' + window.escapeHTML(t.deleteOvertimeDesc) + '</div>' +
                '<div style="margin-top:8px;font-size:12px;color:var(--hint-color);">' + window.escapeHTML(window.t('deleteOvertimeSummary', { count: totalOvertimeDays })) + '</div>' +
                '<select id="delete-overtime-tester" class="form-input delete-overtime-select">' + optionsHtml + '</select>' +
                '<div class="delete-overtime-list">' + listHtml + '</div>' +
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

function openModal() {
    document.getElementById('add-modal').classList.add('active');
    setProjectTargetLang('add', 'ALL');
    updateProjectPricing('add');
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
        document.getElementById('package-error').style.display = 'none';
        switchGroupTab('standard');
        resetProjectForms();
    }, 300);
}

function switchGroupTab(tab) {
    const stdBtn = document.getElementById('seg-standard');
    const custBtn = document.getElementById('seg-custom');
    const stdBlock = document.getElementById('group-standard-block');
    const custBlock = document.getElementById('group-custom-block');
    if (tab === 'standard') {
        stdBtn.classList.add('active');
        custBtn.classList.remove('active');
        stdBlock.style.display = '';
        custBlock.style.display = 'none';
    } else {
        stdBtn.classList.remove('active');
        custBtn.classList.add('active');
        stdBlock.style.display = 'none';
        custBlock.style.display = '';
    }
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

function openEditModal(projectId) {
    const project = myProjects.find((item) => item.id === projectId);
    if (!project) return;
    projectToEdit = projectId;
    document.getElementById('edit-name').value = project.name || '';
    document.getElementById('edit-description').value = project.instructions || '';
    document.getElementById('edit-icon').value = project.icon_url || '';
    document.getElementById('edit-package').value = project.package || '';
    document.getElementById('edit-group').value = project.google_group_url || 'https://groups.google.com/g/google-play-dev-test';
    document.getElementById('edit-limit-mutual').value = String(project.limit_mutual || 12);
    document.getElementById('edit-limit-bounty').value = String(project.limit_bounty || 12);
    document.getElementById('edit-bounty-per-tester').value = String(project.bounty_per_tester || 100);
    setProjectMode('edit', project.mode || 'mutual');
    setProjectTargetLang('edit', project.target_lang || 'ALL');
    updateProjectPricing('edit');
    renderEditCreatedAtMeta();
    document.getElementById('edit-project-modal').classList.add('active');
}

function closeEditModal(event) {
    if (event && event.target !== document.getElementById('edit-project-modal')) return;
    document.getElementById('edit-project-modal').classList.remove('active');
    setTimeout(() => {
        projectToEdit = null;
        resetProjectForms();
        renderEditCreatedAtMeta();
    }, 300);
}

function copyEmail() {
    navigator.clipboard.writeText('google-play-dev-test@googlegroups.com').then(() => {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (tg.showAlert) tg.showAlert(t.copied);
        else alert(t.copied);
    }).catch((error) => {
        console.error('Failed to copy text: ', error);
    });
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

    const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
    const safePackage = window.escapeHTML(test.package || '');
    const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
    const displayOwner = window.escapeHTML(test.owner_username ? '@' + test.owner_username : window.t('unknownLabel', {}, lang));
    const timelineMeta = getTestingTimelineMeta(test);
    const userTestingDay = timelineMeta.userTestingDay;
    const skips = Number(test.skips_count || 0);
    const totalCheckins = Number(test.checkins_count || 0);
    const daysSinceCreated = Number(test.days_since_publish || 0);
    const left = (test.google_sync_day || 0) > 1
        ? Math.max(0, 14 - Number(test.google_sync_day || 0))
        : Math.max(0, 14 - daysSinceCreated);
    const potential = totalCheckins + left;
    const ownerActive = getOwnerActiveStatus(test.last_owner_activity);
    const ownerKarma = Number.isFinite(Number(test.owner_karma)) ? Number(test.owner_karma) : 0;

    let currentGoogleDay = timelineMeta.currentGoogleDay;
    let projectDaysLeft = timelineMeta.projectDaysLeft;
    let expectedTotalDays = timelineMeta.expectedTotalDays;
    let overtimeDays = timelineMeta.overtimeDays;
    const progressData = buildGrantProgressSegments(test, userTestingDay, expectedTotalDays);

    const syncHtml = (() => {
        if (!timelineMeta.isSynced) return '';
        const finishDateText = window.escapeHTML(timelineMeta.finishDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US'));
        return '<div class="details-block">' +
            '<div style="font-size:14px;font-weight:700;color:#34c759;margin-bottom:6px;">' + window.escapeHTML(window.t('projectSyncedTitle', {}, lang)) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);">' + window.escapeHTML(window.t('syncOfficialDay', { day: currentGoogleDay }, lang)) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.escapeHTML(window.t('syncEstimatedFinish', { date: finishDateText }, lang)) + '</div>' +
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

    const grant = getGrantEstimateData(test);
    const currentSkips = Math.max(0, Number(test.skips_count || 0));
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

    if (grant.eligible) {
        grantDashboardHtml = '<div class="grant-dashboard-block">' +
            '<div class="grant-dashboard-header">' +
                '<div class="grant-dashboard-heading">' +
                    '<div class="grant-dashboard-title">' + window.escapeHTML(window.t('grantGoldTesterTitle', {}, lang)) + '</div>' +
                    '<div class="grant-dashboard-subtitle">' + window.escapeHTML(window.t('grantDashboardSubtitle', {}, lang)) + '</div>' +
                '</div>' +
                '<div class="grant-dashboard-total">' + window.escapeHTML(window.t('grantTotalEstimateValue', { amount: formatBustAmount(grant.total) }, lang)) + '</div>' +
            '</div>' +
            '<div class="grant-dashboard-skips-row">' +
                '<span class="grant-skip-text">' + window.escapeHTML(window.t('grantSkipsLabel', { used: currentSkips, max: 3 }, lang)) + '</span>' +
                '<span class="grant-dashboard-skips">' + skipIndicator + '</span>' +
            '</div>' +
            '<div class="grant-reward-grid">' +
                '<div class="grant-reward-card">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantBaseLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value">' + window.escapeHTML(window.t('grantBaseValue', { amount: formatBustAmount(50) }, lang)) + '</div>' +
                    '<div class="grant-reward-status is-active">' + window.escapeHTML(window.t('grantCardActive', {}, lang)) + '</div>' +
                '</div>' +
                '<div class="grant-reward-card' + perfectCardClass + '">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantPerfectLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value">' + perfectValue + '</div>' +
                    '<div class="grant-reward-status ' + (currentSkips > 0 ? 'is-burned' : 'is-active') + '">' + window.escapeHTML(perfectStatus) + '</div>' +
                '</div>' +
                '<div class="grant-reward-card">' +
                    '<div class="grant-reward-label">' + window.escapeHTML(window.t('grantKarmaBonusLabel', {}, lang)) + '</div>' +
                    '<div class="grant-reward-value">' + window.escapeHTML(window.t('grantKarmaValue', { amount: formatBustAmount(grant.karmaBonus) }, lang)) + '</div>' +
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
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantBaseLabel', {}, lang)) + '</div><div class="grant-reward-value"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantBaseValue', { amount: formatBustAmount(50) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantPerfectLabel', {}, lang)) + '</div><div class="grant-reward-value"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantPerfectValue', { amount: formatBustAmount(50) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                    '<div class="grant-reward-card grant-reward-card-burned"><div class="grant-reward-label">' + window.escapeHTML(window.t('grantKarmaBonusLabel', {}, lang)) + '</div><div class="grant-reward-value"><span class="grant-burned-text">' + window.escapeHTML(window.t('grantKarmaValue', { amount: formatBustAmount(grant.karmaBonus) }, lang)) + '</span></div><div class="grant-reward-status is-burned">' + window.escapeHTML(window.t('grantCardBurned', {}, lang)) + '</div></div>' +
                '</div>' +
            '</div>' +
        '</details>';
    }

    body.innerHTML =
        '<div class="detail-header">' +
            renderIcon(test.name || '', test.icon_url) +
            '<div class="card-info">' +
                '<div class="card-title">' + safeName + '</div>' +
                '<div class="card-subtitle">' + safePackage + '</div>' +
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
                    '<div class="detail-owner-name">' + displayOwner + '</div>' +
                    '<div class="detail-owner-status ' + (ownerActive ? 'online' : 'offline') + '">' +
                        (ownerActive ? window.t('ownerOnlineText', {}, lang) : window.t('ownerOfflineText', {}, lang)) +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('ownerKarmaText', { karma: ownerKarma }, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('detail_testers_label', { count: test.active_testers_count || 0 }, lang) + '</div>' +
        '</div>' +

        instructionsHtml +

        '<div class="detail-actions">' +
            '<button class="btn" style="background:var(--button-color);color:var(--button-text-color);" onclick="closeProjectDetailsModal(); openContactModal(\'' + safeOwnerUsername + '\')">' + window.t('detail_contact_btn', {}, lang) + '</button>' +
            '<button class="btn" style="background:rgba(142,142,147,0.18);color:var(--text-color);" onclick="closeProjectDetailsModal(); initiateProjectFeedback(' + test.id + ')">' + window.t('detail_suggest_btn', {}, lang) + '</button>' +
            '<button class="btn" style="background:rgba(52,199,89,0.14);color:#34c759;" onclick="tg.openLink(\'https://play.google.com/store/apps/details?id=' + window.escapeHTML(test.package || '') + '\')">' + window.t('openGooglePlay', {}, lang) + '</button>' +
            (userTestingDay >= 15
                ? '<button class="btn" style="background:rgba(52,199,89,0.14);color:#34c759;" onclick="closeProjectDetailsModal(); openOvertimeModal(' + test.id + ')">' + window.t('finish_project', {}, lang) + '</button>'
                : '<button class="btn" style="background:rgba(255,59,48,0.14);color:#ff4d4f;" onclick="closeProjectDetailsModal(); openDropTestModal(' + test.id + ')">' + window.t('detail_leave_btn', {}, lang) + '</button>') +
        '</div>';

    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeProjectDetailsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openTimelineStatsSheet(appId) {
    var test = myTests.find(function(t) { return t.id === appId; });
    var modal = document.getElementById('timeline-stats-modal');
    var body = document.getElementById('timeline-stats-body');
    if (!test || !modal || !body) return;
    var timelineMeta = getTestingTimelineMeta(test);
    var progressData = buildGrantProgressSegments(test, timelineMeta.userTestingDay, timelineMeta.expectedTotalDays);

    var tl = test.daily_timeline || '';
    var sc = 0, ss = 0, oc = 0, os = 0;
    for (var i = 0; i < tl.length; i++) {
        if (tl[i] === '1') sc++;
        else if (tl[i] === '0') ss++;
        else if (tl[i] === '2') oc++;
        else if (tl[i] === '3') os++;
    }

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

function showProjectSelectModal(projects, targetAppId, targetOwnerId, options) {
    let modal = document.getElementById('project-select-modal');
    if (!modal) return;
    const listEl = document.getElementById('project-select-list');
    if (!listEl) return;
    const blockedProjects = options && options.blockedProjects ? options.blockedProjects : {};
    listEl.innerHTML = projects.map(p => {
        const safeName = window.escapeHTML(p.name || window.t('unknownLabel'));
        const targetAlreadyTesting = (p.testers || []).some(tester => Number(tester.tester_id) === Number(targetOwnerId));
        const blockedEntry = blockedProjects[String(p.id)] || null;
        const isDisabled = targetAlreadyTesting || !!blockedEntry;
        const disabledClass = isDisabled ? ' disabled' : '';
        const badges = [];
        if (targetAlreadyTesting) {
            badges.push(`<span class="meta-chip accent-purple">${window.escapeHTML(window.t('alreadyTestingBadge', {}, lang))}</span>`);
        }
        if (blockedEntry) {
            badges.push(`<span class="meta-chip accent-orange">${window.escapeHTML(window.t('offerProjectLockedBadge', {}, lang))}</span>`);
        }
        const badgeHtml = badges.join('');
        const reasonHtml = blockedEntry
            ? `<span class="project-select-reason">${window.escapeHTML(window.t('offerProjectLockedDetails', { target_app: blockedEntry.target_app_name || window.t('unknownLabel', {}, lang) }, lang))}</span>`
            : '';

        const clickHandler = isDisabled
            ? 'event.preventDefault(); event.stopPropagation();'
            : `window._selectProjectForOffer(${p.id}); event.stopPropagation();`;

        return `<button class="project-select-item${disabledClass}" onclick="${clickHandler}">
            <span class="project-select-icon">${renderIcon(p.name || '', p.icon_url)}</span>
            <span class="project-select-text">
                <span class="project-select-name">${safeName}</span>
                ${reasonHtml}
            </span>
            ${badgeHtml}
        </button>`;
    }).join('');
    window._selectProjectForOffer = async function(proposerAppId) {
        closeProjectSelectModal();
        await window.sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, {
            targetAppId: targetAppId,
            targetOwnerId: targetOwnerId,
        });
    };
    modal.classList.add('active');
}

function closeProjectSelectModal() {
    const modal = document.getElementById('project-select-modal');
    if (modal) modal.classList.remove('active');
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

Object.assign(window, {
    showSkeleton,
    showRetry,
    renderEditCreatedAtMeta,
    formatTimeAgo,
    renderEvents,
    toggleEventsExpanded,
    getAvatar,
    renderIcon,
    formatOfferRemaining,
    openTesterDossier,
    getUserTestingDay,
    isMandatoryScreenshotDay,
    getOwnerActiveStatus,
    isProjectSynced,
    showGrantBreakdownAlertById,
    getScreenshotReminderHtml,
    renderCompactMeta,
    openTelegramProfile,
    renderIncomingOffers,
    renderTests,
    renderCompletedTests,
    getLangBadge,
    renderFeedCard,
    renderMutualReturns,
    renderMutualFeed,
    switchMarketSubTab,
    renderBountyFeed,
    toggleDetailsWithAnimation,
    calculateReliability,
    renderProjects,
    showScreenshotCompleteModal,
    closeScreenshotCompleteModal,
    openReportModal,
    closeReportModal,
    insertReportChip,
    openContactModal,
    closeContactModal,
    resetContactText,
    toggleAttachProject,
    onProjectSelected,
    openDropTestModal,
    closeDropTestModal,
    openOvertimeModal,
    closeOvertimeModal,
    overtimeContactOwner,
    openSyncModal,
    closeSyncModal,
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
    renderArchivedProjects,
    toggleArchive,
    showScreenshotDayAlert,
    showVisibilityToast,
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
    closeCustomAlert,
    showToast,
    switchTab,
    toggleAccordion,
    closeBanner,
    openInviteModal,
    escapeForAttr,
    copyAndAction,
    closeInviteModal,
    openDossierModal,
    closeDossierModal,
    openDeleteModal,
    closeDeleteModal,
    openModal,
    closeModal,
    switchGroupTab,
    closeEmailWarningModal,
    showReadonlyAlert,
    openEditModal,
    closeEditModal,
    escapeHTML: window.escapeHTML,
    copyEmail,
    openProjectDetailsModal,
    closeProjectDetailsModal,
    openTimelineStatsSheet,
    closeTimelineStatsSheet,
    showProjectSelectModal,
    closeProjectSelectModal,
    openKarmaDistribution,
    closeKarmaDistribution,
    openKarmaSelectPopup,
    closeKarmaSelectPopup,
    confirmKarmaSelect,
});