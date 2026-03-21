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
        const text = window.escapeHTML(lang === 'ru' ? eventItem.text_ru : eventItem.text_en);
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
    const created = new Date(createdAt || '');
    if (Number.isNaN(created.getTime())) return t.offerExpired;
    const expireAt = created.getTime() + (3 * 60 * 60 * 1000);
    const leftMs = expireAt - Date.now();
    if (leftMs <= 0) return t.offerExpired;
    const totalSec = Math.floor(leftMs / 1000);
    const hh = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mm = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSec % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
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

function renderCompactMeta(daysSincePublish, activeTestersCount, isNew, userTestingDay) {
    const parts = [];
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

    const pending = (incomingOffers || []).filter((offer) => offer.status === 'pending');
    countEl.innerText = t.offersCount.replace('{count}', pending.length);

    if (!pending.length) {
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
        const expireText = remain === window.t('offerExpired', {}, lang)
            ? window.t('offerExpired', {}, lang)
            : window.t('offerExpiresIn', { time: remain }, lang);
        const targetAppName = offer.target_app_name || window.t('unknownLabel', {}, lang);
        const proposerAppName = offer.proposer_app_name || window.t('unknownLabel', {}, lang);

        return `
            <div class="offer-card">
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
        const timerEls = section.querySelectorAll('.offer-expire');
        const pendingOffers = (incomingOffers || []).filter(o => o.status === 'pending');
        timerEls.forEach((el, i) => {
            if (!pendingOffers[i]) return;
            const remain = formatOfferRemaining(pendingOffers[i].created_at);
            const text = remain === window.t('offerExpired', {}, lang)
                ? window.t('offerExpired', {}, lang)
                : window.t('offerExpiresIn', { time: remain }, lang);
            el.textContent = text;
        });
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
        card.className = 'card';
        card.id = `test-card-${test.id}`;
        const userTestingDay = getUserTestingDay(test.start_date);
        const safePackage = escapeInlineJsString(test.package);
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');

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
            actionsHtml = `
                <div class="done-text">
                    ${t.doneTodayText}
                </div>
            `;
        }

        const headerActions = [];
        if (test.status !== 'done') {
            headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="openDropTestModal(${test.id}, event)">🗑️</button>`);
        }
        const trailingHtml = headerActions.length
            ? `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">${headerActions.join('')}</div>`
            : '';

        let cardContent = `
            <div class="card-header">
                <div class="card-header-link" ${test.status === 'new' ? '' : `onclick="openProjectDetailsModal(${test.id})"`}>
                    ${renderIcon(test.name, test.icon_url)}
                    <div class="card-info">
                        <div class="card-title">${safeName}</div>
                        <div class="card-subtitle">${safePackageLabel}</div>
                    </div>
                </div>
                ${trailingHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay)}
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
            card.onclick = () => tg.openLink(`https://play.google.com/store/apps/details?id=${test.package}`);
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
        card.className = 'card';
        card.id = `test-card-${test.id}`;
        const userTestingDay = getUserTestingDay(test.start_date);
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');

        const actionsHtml = `
            <div class="done-text">
                ${t.doneTodayText}
            </div>
        `;

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
            <div class="card-header">
                ${renderIcon(test.name, test.icon_url)}
                <div class="card-info">
                    <div class="card-title">${safeName}</div>
                    <div class="card-subtitle">${safePackageLabel}</div>
                </div>
                ${ownerBtnHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay)}
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
        card.onclick = () => tg.openLink(`https://play.google.com/store/apps/details?id=${test.package}`);
        doneList.appendChild(card);
        doneCount++;
    });

    document.getElementById('done-count').innerText = doneCount;
    document.getElementById('done-section').style.display = doneCount > 0 ? 'block' : 'none';
}

function getLangBadge(targetLang) {
    const langCode = String(targetLang || 'ALL').toUpperCase();
    if (langCode === 'RU') return '<span class="lang-badge">🇷🇺</span>';
    if (langCode === 'EN') return '<span class="lang-badge">🇬🇧</span>';
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
    let clickAction = `joinMutual(${item.app_id}, false)`;
    if (kind === 'mutual-prelaunch') {
        buttonText = window.t('prelaunchJoinBtn', {}, lang);
        clickAction = `joinMutual(${item.app_id}, true)`;
    }
    if (kind === 'bounty') {
        buttonText = window.t('bountyTakeBtn', {}, lang);
        clickAction = `joinBounty(${item.app_id})`;
    }

    return `
        <div class="market-card">
            <div class="market-top">
                <div>
                    <div class="card-title">${window.escapeHTML(item.name || window.t('unknownLabel', {}, lang))}</div>
                    <div class="market-owner" onclick="openTesterDossier('${safeOwner}', ${item.owner_id}, ${item.app_id}); event.stopPropagation();">${ownerDisplay}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${langBadge}
                    <span class="meta-chip accent-yellow">☯️ ${item.owner_karma || 0}</span>
                </div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;">
                <span class="meta-chip">👥 ${item.mutual_testers_count ?? item.bounty_testers_count ?? 0}</span>
                ${kindChip}
                ${bountyChip}
            </div>
            <button class="btn btn-primary" onclick="${clickAction}">${buttonText}</button>
        </div>
    `;
}

function renderMutualFeed() {
    const seekingEl = document.getElementById('mutual-seeking-list');
    const prelaunchEl = document.getElementById('mutual-prelaunch-list');
    if (!seekingEl || !prelaunchEl) return;

    if (!mutualSeeking.length) {
        seekingEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        seekingEl.innerHTML = mutualSeeking.map((item) => renderFeedCard(item, 'mutual-seeking')).join('');
    }

    if (!mutualPrelaunch.length) {
        prelaunchEl.innerHTML = `<p class="no-testers">${t.mutualEmpty}</p>`;
    } else {
        prelaunchEl.innerHTML = mutualPrelaunch.map((item) => renderFeedCard(item, 'mutual-prelaunch')).join('');
    }
}

function switchMutualSubTab(tab) {
    const seekingPanel = document.getElementById('mutual-subtab-seeking');
    const prelaunchPanel = document.getElementById('mutual-subtab-prelaunch');
    const seekingBtn = document.getElementById('mutual-sub-seeking');
    const prelaunchBtn = document.getElementById('mutual-sub-prelaunch');
    const seekingDesc = document.getElementById('mutual-seeking-desc');
    const prelaunchDesc = document.getElementById('mutual-prelaunch-desc');
    if (tab === 'seeking') {
        seekingPanel.style.display = '';
        prelaunchPanel.style.display = 'none';
        seekingBtn.classList.add('active');
        prelaunchBtn.classList.remove('active');
        if (seekingDesc) seekingDesc.style.display = '';
        if (prelaunchDesc) prelaunchDesc.style.display = 'none';
    } else {
        seekingPanel.style.display = 'none';
        prelaunchPanel.style.display = '';
        seekingBtn.classList.remove('active');
        prelaunchBtn.classList.add('active');
        if (seekingDesc) seekingDesc.style.display = 'none';
        if (prelaunchDesc) prelaunchDesc.style.display = '';
    }
}

function renderBountyFeed() {
    const bountyEl = document.getElementById('bounty-list');
    if (!bountyEl) return;
    if (!bountyContracts.length) {
        bountyEl.innerHTML = `<p class="no-testers" style="margin-top: 10px;">${t.bountyEmpty}</p>`;
        return;
    }
    bountyEl.innerHTML = bountyContracts.map((item) => renderFeedCard(item, 'bounty')).join('');
}

function renderShowcase() {
    const neededPanel = document.getElementById('showcase-needed');
    const prelaunchPanel = document.getElementById('showcase-prelaunch');
    const neededCount = document.getElementById('needed-count');
    const prelaunchCount = document.getElementById('prelaunch-count');
    const prelaunchBtn = document.getElementById('prelaunch-tab-btn');
    const neededBtn = document.getElementById('needed-tab-btn');
    const availableTitle = document.getElementById('t-availableTitle');
    if (!neededPanel || !prelaunchPanel) return;

    neededCount.textContent = showcaseTestersNeeded.length;
    prelaunchCount.textContent = showcasePreLaunch.length;
    if (neededBtn) {
        neededBtn.innerHTML = `${t.tabTestersNeeded} (<span id="needed-count">${showcaseTestersNeeded.length}</span>)`;
    }
    if (prelaunchBtn) {
        prelaunchBtn.innerHTML = `${t.tabPreLaunch} (<span id="prelaunch-count">${showcasePreLaunch.length}</span>)`;
    }
    if (availableTitle) {
        availableTitle.innerText = t.availableTitle;
    }

    if (showcaseLoadError) {
        neededPanel.innerHTML = `
            <div class="retry-container" style="padding: 20px 8px;">
                <button class="retry-btn" onclick="loadTasks();">${t.retryBtn}</button>
            </div>
        `;
        prelaunchPanel.innerHTML = '';
        prelaunchBtn.style.display = 'none';
        prelaunchPanel.style.display = 'none';
        return;
    }

    if (showcasePreLaunch.length > 0) {
        prelaunchBtn.style.display = '';
        prelaunchPanel.style.display = '';
    } else {
        prelaunchBtn.style.display = 'none';
        prelaunchPanel.style.display = 'none';
    }

    if (showcaseTestersNeeded.length === 0) {
        neededPanel.innerHTML = `<p class="no-testers" style="text-align: center; margin-top: 16px;">${t.noAvailable}</p>`;
    } else {
        neededPanel.innerHTML = showcaseTestersNeeded.map(renderCompactCard).join('');
    }

    prelaunchPanel.innerHTML = showcasePreLaunch.length > 0
        ? showcasePreLaunch.map(renderCompactCard).join('')
        : '';
}

function renderCompactCard(app) {
    const ownerDisplay = window.escapeHTML(app.owner_full_name || (app.owner_username ? '@' + app.owner_username : window.t('unknownLabel', {}, lang)));
    const ownerUsername = escapeInlineJsString(app.owner_username || '');
    const escapeText = (text) => String(text || '').replace(/'/g, "\\'");
    const testersTooltip = escapeText(window.t('chipTooltipTesters', { count: app.active_testers_count || 0 }, lang));
    const daysValue = app.days_since_publish || 1;
    const daysTooltip = escapeText(window.t('chipTooltipDays', { days: daysValue }, lang));

    let badges = '';
    if (app.owner_karma) {
        badges += '<button class="meta-chip accent-yellow" onclick="showShowcaseKarmaInfo(' + (app.owner_karma || 0) + '); event.stopPropagation();">☯️ ' + app.owner_karma + '</button>';
    }
    badges += '<button class="meta-chip accent-blue" onclick="showToast(\'' + testersTooltip + '\'); event.stopPropagation();">👥 ' + (app.active_testers_count || 0) + '</button>';
    if (app.is_new) {
        badges += '<button class="meta-chip accent-green" onclick="showToast(\'' + daysTooltip + '\'); event.stopPropagation();">🆕</button>';
    } else if (app.days_since_publish) {
        badges += '<button class="meta-chip" onclick="showToast(\'' + daysTooltip + '\'); event.stopPropagation();">' + t.daysShort.replace('{days}', app.days_since_publish) + '</button>';
    }

    let instructionHtml = '';
    if (app.instructions) {
        instructionHtml = `
            <details class="compact-instruction" onclick="event.stopPropagation();">
                <summary onclick="event.stopPropagation();">
                    <span class="compact-instruction-arrow">▶</span>
                    ${t.instructionAccordion}
                </summary>
                <div class="compact-instruction-body">${escapeHtmlWithBreaks(app.instructions)}</div>
            </details>
        `;
    }

    return `
        <div class="compact-card">
            <div class="compact-card-main">
                <div class="compact-card-icon">
                    ${renderIcon(app.name || window.t('unknownLabel', {}, lang), app.icon_url)}
                </div>
                <div class="compact-card-center">
                    <div class="compact-card-clickable" onclick="openContactModal('${ownerUsername}')">
                        <div class="compact-card-name">${window.escapeHTML(app.name || window.t('unknownLabel', {}, lang))}</div>
                        <div class="compact-card-owner">${ownerDisplay} 💬</div>
                    </div>
                    <div class="compact-card-badges">${badges}</div>
                    ${instructionHtml}
                </div>
                <div class="compact-card-right">
                    <button class="compact-test-btn" onclick="takeAppToTest(${app.app_id})">${window.t('testBtnShort', {}, lang)}</button>
                </div>
            </div>
        </div>
    `;
}

function switchShowcaseTab(tab) {
    document.querySelectorAll('.showcase-tab').forEach((el) => el.classList.toggle('active', el.dataset.tab === tab));
    const snap = document.getElementById('showcase-snap');
    const target = document.getElementById(tab === 'prelaunch' ? 'showcase-prelaunch' : 'showcase-needed');
    if (snap && target) snap.scrollTo({ left: target.offsetLeft, behavior: 'smooth' });
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

function renderProjects() {
    const container = document.getElementById('projects-list');
    container.innerHTML = '';

    if (visibilityStats) {
        const reliability = calculateReliability(visibilityStats.total_expected_checkins, visibilityStats.total_actual_checkins);
        const expLine = t.experienceLabel.replace('{count}', visibilityStats.completed_tests) + ' ' + t.completedTestsSuffix;
        const reliabilityValue = reliability.percent !== null
            ? `${reliability.text} (${reliability.percent}%)`
            : `${reliability.text}`;
        const reliabilityValueStyle = reliability.percent !== null
            ? 'cursor:pointer; text-decoration: underline; text-decoration-style: dotted;'
            : 'cursor:pointer; text-decoration: none;';

        const dashHtml = `
            <div class="dashboard-block">
                <div class="dashboard-row">
                    <span class="dashboard-label dashboard-title">${t.visibilityTitle}</span>
                    <button class="meta-chip accent-yellow" onclick="showKarmaInfo()">☯️ ${visibilityStats.ownerKarma}</button>
                </div>
                <div class="dashboard-row">
                    <span class="dashboard-label">⚡ ${t.activeTestsLabel}: ${visibilityStats.my_active_tests}</span>
                </div>
                <div class="dashboard-row" onclick="openEarnBustModal()" style="cursor:pointer;">
                    <span class="dashboard-label" style="font-size: 18px; font-weight: 800; color: var(--link-color);">${t.bustBalanceLabel.replace('{amount}', formatBustAmount(visibilityStats.balance_bust || 0))}</span>
                </div>
                <div class="dashboard-row">
                    <span class="dashboard-label">${expLine}</span>
                </div>
                <div class="dashboard-row">
                    <span class="dashboard-label" style="color: ${reliability.color};">${t.disciplineLabel} <span onclick="showReliabilityInfo()" style="${reliabilityValueStyle}">${reliabilityValue} </span></span>
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
        reminder.style.cssText = 'background-color: rgba(255, 204, 0, 0.2); color: var(--text-color); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.4; display: flex; align-items: flex-start; gap: 8px;';
        reminder.innerHTML = `<span style="flex: 1;">${t.deleteReminder}</span><button onclick="this.parentElement.remove(); localStorage.setItem('hideDeleteReminder','true');" style="background: none; border: none; font-size: 18px; cursor: pointer; color: var(--hint-color); flex-shrink: 0; padding: 0; line-height: 1;">✕</button>`;
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

        const appDays = project.created_at ? (Math.floor((todayDate - new Date(project.created_at)) / (1000 * 60 * 60 * 24)) + 1) : 0;
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

            if (visibilityStats.rank) {
                badges += `<button class="meta-chip accent-blue" onclick="showRankPopup()">🏆 #${visibilityStats.rank}</button>`;
            }

            if (likesAvailable > 0) {
                const karmaChipText = t.karmaAvailable.replace('{count}', likesAvailable);
                badges += `<button class="meta-chip accent-yellow" onclick="showKarmaChipInfo()">${karmaChipText}</button>`;
            }

            return badges;
        })();

        const appProgressHtml = (() => {
            if (appDays <= 0) return '';
            const day = Math.min(appDays, 14);
            const pct = Math.min(100, Math.round((day / 14) * 100));
            let barColor = 'var(--link-color)';
            if (day >= 14) barColor = '#34c759';
            else if (day >= 12) barColor = '#ff9500';
            const label = day >= 14 ? t.progressComplete : t.progressLabel.replace('{day}', day);
            return `
                <div class="app-progress">
                    <div class="app-progress-bar"><div class="app-progress-fill" style="width: ${pct}%; background: ${barColor};"></div></div>
                    <span class="app-progress-label" style="color: ${barColor};">${label}</span>
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
            ${appProgressHtml}
            ${quotaSummaryHtml}
            <div class="testers-section">
                <div class="testers-title">${t.testersList} (${project.testers ? project.testers.length : 0})</div>
                ${testersHtml}
            </div>
            <div class="action-row" style="margin-top: 16px;">
                <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="openInviteModal(${project.id})">
                    🔗 ${t.inviteLink}
                </button>
                <button class="btn btn-secondary" style="flex: 1; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="openSyncModal(${project.id})">
                    ${t.syncBtn}
                </button>
                <button class="btn" style="flex: 1; background-color: rgba(255, 59, 48, 0.1); color: #ff3b30;" onclick="openDeleteModal(${project.id})">
                    🗑 ${t.deleteProject}
                </button>
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

    const isSynced = isProjectSynced(test);
    const message = isSynced
        ? t.overtimeScenarioB
            .replace('{day}', String(test.google_sync_day || 0))
            .replace('{message}', test.sync_message || '-')
        : t.overtimeScenarioA;
    document.getElementById('t-overtimeModalText').innerText = message;
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
    if (!project) return;
    _syncProjectId = projectId;
    document.getElementById('sync-day-input').value = project.google_sync_day || '';
    document.getElementById('sync-message-input').value = project.sync_message || '';
    document.getElementById('sync-modal').classList.add('active');
}

function closeSyncModal(event) {
    if (event && event.target !== document.getElementById('sync-modal')) return;
    document.getElementById('sync-modal').classList.remove('active');
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
        html += `
            <div class="card archive-card">
                <div class="card-header archive-card-header">
                    ${renderIcon(archiveName, project.icon_url)}
                    <div class="card-info">
                        <div class="card-title">${safeArchiveName}</div>
                        <div class="card-subtitle">${safeArchivePackage}</div>
                    </div>
                </div>
                <div class="archive-meta-row">
                    <span class="archive-meta-chip">${modeLabel}</span>
                    <span class="archive-meta-chip">👥 ${project.total_testers}</span>
                    <span class="archive-meta-chip">✅ ${project.total_checkins}</span>
                </div>
                <button class="btn archive-delete-btn"
                    onclick="confirmHardDelete(${project.app_id}, '${escapeInlineJsString(archiveName)}')">
                    ${t.archiveDeletePermanent}
                </button>
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

function showKarmaInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showCustomAlert(t.karmaInfoText);
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

function showKarmaChipInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showCustomAlert(t.karmaLimitInfoText || t.karmaChipInfoText);
}

function showShowcaseKarmaInfo(karma) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const msg = t.showcaseKarmaInfo.replace('{karma}', karma);
    if (tg.showAlert) tg.showAlert(msg);
    else alert(msg);
}

function showTestDayPopup(day) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const msg = t.testDayExplain.replace('{days}', day);
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

function showKarmaPopup(appId, testerId) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    _karmaAppId = appId;
    _karmaTesterId = testerId;
    document.getElementById('karma-modal').classList.add('active');
}

function closeKarmaModal(event) {
    if (event && event.target && event.target.id !== 'karma-modal') return;
    document.getElementById('karma-modal').classList.remove('active');
    _karmaAppId = null;
    _karmaTesterId = null;
}

function selectKarmaReward(type) {
    if (_karmaAppId === null || _karmaTesterId === null) return;
    document.getElementById('karma-modal').classList.remove('active');
    sendKarmaReward(_karmaAppId, _karmaTesterId, type);
    _karmaAppId = null;
    _karmaTesterId = null;
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
    document.querySelectorAll('.nav-item').forEach((element) => element.classList.remove('active'));
    navElement.classList.add('active');

    document.querySelectorAll('.tab-content').forEach((element) => element.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    if (tabId === 'mutual') {
        loadMutualFeed();
    }
    if (tabId === 'bounty') {
        loadBountyFeed();
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
    html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${t.dossierGlobalTitle}</div>
        <div style="padding: 10px 12px; background: var(--secondary-bg-color); border-radius: 10px; font-size: 13px; line-height: 1.8;">
            ${t.dossierExperience.replace('{count}', profile.completed_tests)}
            <br>${expected >= 42 ? t.dossierReliability.replace('{pct}', reliabilityPct) + ' ' + reliabilityText : t.disciplineLabel + ' ' + t.dossierNewbie}
            <br>${t.dossierKarma.replace('{karma}', profile.karma)}
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
    document.getElementById('delete-modal').classList.add('active');
    document.getElementById('delete-message').focus();
}

function closeDeleteModal(event) {
    if (event && event.target !== document.getElementById('delete-modal')) return;
    document.getElementById('delete-modal').classList.remove('active');

    setTimeout(() => {
        document.getElementById('delete-message').value = '';
        projectToDelete = null;
    }, 300);
}

function openModal() {
    document.getElementById('add-modal').classList.add('active');
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
    const userTestingDayRaw = getUserTestingDay(test.start_date);
    const userTestingDay = typeof userTestingDayRaw === 'number' && userTestingDayRaw > 0 ? userTestingDayRaw : 1;
    const normalizedDay = Math.min(userTestingDay, 14);
    const skipped = Number.isFinite(Number(test.missed_days)) ? Number(test.missed_days) : 0;
    const availableSkips = Math.max(0, 3 - skipped);
    const remainingDays = Math.max(0, 14 - normalizedDay);
    const ownerActive = getOwnerActiveStatus(test.last_owner_activity);
    const boostAmount = Number.isFinite(Number(test.owner_boost_reward))
        ? Number(test.owner_boost_reward)
        : (Number.isFinite(Number(test.boost_reward)) ? Number(test.boost_reward) : 1000);
    const ownerKarma = Number.isFinite(Number(test.owner_karma)) ? Number(test.owner_karma) : 0;

    var segments = [];
    for (var i = 1; i <= 14; i++) {
        var cls = 'grant-segment';
        if (i < normalizedDay) cls += ' filled';
        else if (i === normalizedDay) cls += ' filled current';
        segments.push('<div class="' + cls + '"></div>');
    }

    var syncHtml = '';
    if ((test.google_sync_day || 0) > 1) {
        const startDate = new Date(test.start_date || '');
        let factDateText = '—';
        if (!Number.isNaN(startDate.getTime())) {
            const endDate = new Date(startDate.getTime());
            endDate.setDate(endDate.getDate() + 13);
            factDateText = window.escapeHTML(endDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US'));
        }
        syncHtml = '<div class="details-block">' +
            '<div style="font-size:14px;font-weight:700;color:#34c759;margin-bottom:6px;">' + window.t('syncDoneText', {}, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);">' + window.t('fact_end_date', { date: factDateText }, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('days_left_count', { count: remainingDays }, lang) + '</div>' +
        '</div>';
    }

    var instructionsHtml = '<div class="details-block"><div class="detail-section-title">' + window.t('devInfo', {}, lang) + '</div>' +
        '<div class="detail-instruction-body">' + (test.instructions ? escapeHtmlWithBreaks(test.instructions) : '—') + '</div></div>';

    body.innerHTML =
        '<div class="detail-header">' +
            renderIcon(test.name || '', test.icon_url) +
            '<div class="card-info">' +
                '<div class="card-title">' + safeName + '</div>' +
                '<div class="card-subtitle">' + safePackage + '</div>' +
            '</div>' +
        '</div>' +

        '<div class="details-block">' +
            '<div class="detail-badge">👑 ' + window.t('golden_tester', {}, lang) + '</div>' +
            '<div class="grant-progress-container">' + segments.join('') + '</div>' +
            '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:13px;color:var(--hint-color);">' +
                '<span>' + window.t('grantProgressText', { day: normalizedDay }, lang) + '</span>' +
                '<span>' + window.t('availableSkips', { skips: availableSkips }, lang) + '</span>' +
            '</div>' +
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
            '<div style="font-size:13px;color:var(--hint-color);margin-top:10px;">' + window.t('ownerBoostsText', { amount: boostAmount }, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('ownerKarmaText', { karma: ownerKarma }, lang) + '</div>' +
            '<div style="font-size:13px;color:var(--hint-color);margin-top:4px;">' + window.t('detail_testers_label', { count: test.active_testers_count || 0 }, lang) + '</div>' +
        '</div>' +

        instructionsHtml +

        '<div class="detail-actions">' +
            '<button class="btn" style="background:var(--button-color);color:var(--button-text-color);" onclick="closeProjectDetailsModal(); openContactModal(\'' + safeOwnerUsername + '\')">' + window.t('detail_contact_btn', {}, lang) + '</button>' +
            '<button class="btn" style="background:rgba(142,142,147,0.18);color:var(--text-color);" onclick="closeProjectDetailsModal(); openContactModal(\'' + safeOwnerUsername + '\')">' + window.t('detail_suggest_btn', {}, lang) + '</button>' +
            '<button class="btn" style="background:rgba(255,59,48,0.14);color:#ff4d4f;" onclick="closeProjectDetailsModal(); openDropTestModal(' + test.id + ')">' + window.t('detail_leave_btn', {}, lang) + '</button>' +
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
    getScreenshotReminderHtml,
    renderCompactMeta,
    openTelegramProfile,
    renderIncomingOffers,
    renderTests,
    renderCompletedTests,
    getLangBadge,
    renderFeedCard,
    renderMutualFeed,
    switchMutualSubTab,
    renderBountyFeed,
    renderShowcase,
    renderCompactCard,
    switchShowcaseTab,
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
    renderArchivedProjects,
    toggleArchive,
    showScreenshotDayAlert,
    showVisibilityToast,
    showKarmaInfo,
    showReliabilityInfo,
    closeReliabilityInfo,
    showRankPopup,
    showKarmaChipInfo,
    showShowcaseKarmaInfo,
    showTestDayPopup,
    showNewBadgeToast,
    insertChip,
    showKarmaPopup,
    closeKarmaModal,
    selectKarmaReward,
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
});