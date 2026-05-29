window.App = window.App || {};
window.ui = window.ui || {};

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

var _reliabilityDashboardFilter = 'projects';
var _inviteProjectId = null;
var _inviteMode = 'mutual';
var _visibilityModalProjectId = 0;
var _visibilityModalSubmitting = false;
var _guestInviteGuestId = null;
var _guestInviteSending = false;
var _guestInviteLang = null;
var _externalTrackGuestId = null;
var _externalTrackSending = false;
var _externalTrackProjectId = 0;
var _externalTrackAcknowledged = false;
var _guestTesterProjectId = 0;
var _guestTesterProgressId = 0;
var _guestLinkRemoveState = null;
var _reportMessageLang = null;

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

function showMarketLoading(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<p class="no-testers">${t.pulseLoading}</p>`;
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

function getDayDiffFromToday(dateValue) {
    const source = parseLocalDateOnly(dateValue);
    if (!source) return 0;
    const today = parseLocalDateOnly(getLocalDate());
    return Math.max(0, Math.floor((today - source) / (1000 * 60 * 60 * 24)));
}

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

const GUEST_LANGUAGE_META = {
    ar: { flag: '🇦🇪', label: 'Arabic' },
    az: { flag: '🇦🇿', label: 'Azerbaijani' },
    de: { flag: '🇩🇪', label: 'German' },
    en: { flag: '🇬🇧', label: 'English' },
    es: { flag: '🇪🇸', label: 'Spanish' },
    fa: { flag: '🇮🇷', label: 'Persian' },
    fr: { flag: '🇫🇷', label: 'French' },
    hi: { flag: '🇮🇳', label: 'Hindi' },
    id: { flag: '🇮🇩', label: 'Indonesian' },
    it: { flag: '🇮🇹', label: 'Italian' },
    ja: { flag: '🇯🇵', label: 'Japanese' },
    ko: { flag: '🇰🇷', label: 'Korean' },
    ms: { flag: '🇲🇾', label: 'Malay' },
    nl: { flag: '🇳🇱', label: 'Dutch' },
    pl: { flag: '🇵🇱', label: 'Polish' },
    pt: { flag: '🇵🇹', label: 'Portuguese' },
    'pt-br': { flag: '🇧🇷', label: 'Portuguese (Brazil)' },
    ru: { flag: '🇷🇺', label: 'Russian' },
    th: { flag: '🇹🇭', label: 'Thai' },
    tr: { flag: '🇹🇷', label: 'Turkish' },
    uk: { flag: '🇺🇦', label: 'Ukrainian' },
    ur: { flag: '🇵🇰', label: 'Urdu' },
    vi: { flag: '🇻🇳', label: 'Vietnamese' },
    'zh-cn': { flag: '🇨🇳', label: 'Chinese (Simplified)' },
    'zh-tw': { flag: '🇹🇼', label: 'Chinese (Traditional)' },
};

function normalizeGuestLanguageCode(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'ALL';
    if (raw.toUpperCase() === 'ALL') return 'ALL';
    const normalized = raw.toLowerCase();
    return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized) ? normalized : 'ALL';
}

function getGuestLanguageMeta(value) {
    const normalized = normalizeGuestLanguageCode(value);
    if (normalized === 'ALL') {
        const allLabel = window.t('guestFilterLangAll', {}, lang);
        return {
            code: 'ALL',
            shortCode: 'ALL',
            flag: '',
            label: allLabel,
            optionLabel: allLabel,
            badgeLabel: 'ALL',
        };
    }

    const meta = GUEST_LANGUAGE_META[normalized] || null;
    const shortCode = normalized.toUpperCase();
    const label = meta ? meta.label : shortCode;
    const flag = meta ? meta.flag : '';
    return {
        code: normalized,
        shortCode: shortCode,
        flag: flag,
        label: label,
        optionLabel: flag ? `${flag} ${label}` : shortCode,
        badgeLabel: flag ? `${flag} ${shortCode}` : shortCode,
    };
}

function getGuestLanguageDisplayParts(languageValue, userLangValue) {
    const parts = [];
    const seen = new Set();
    [languageValue, userLangValue].forEach(function(value) {
        const meta = getGuestLanguageMeta(value);
        if (meta.code === 'ALL' || seen.has(meta.code)) return;
        seen.add(meta.code);
        parts.push(meta);
    });
    return parts;
}

function renderGuestLanguageBadge(languageValue, userLangValue) {
    const parts = getGuestLanguageDisplayParts(languageValue, userLangValue);
    if (!parts.length) return '';

    const title = parts.map(function(meta) {
        return meta.flag ? `${meta.flag} ${meta.label}` : meta.label;
    }).join(' | ');
    const badgeLabel = parts.map(function(meta) {
        return meta.badgeLabel;
    }).join(' | ');

    return `<span class="lang-badge notranslate" style="cursor:default;" title="${window.escapeHTML(title)}">${window.escapeHTML(badgeLabel)}</span>`;
}

function renderGuestLanguageFilterOptions(select, selectedValue) {
    if (!select) return;

    const explicitOptions = typeof window.getGuestProjectAvailableLangs === 'function'
        ? window.getGuestProjectAvailableLangs()
        : [];
    const fallbackOptions = Array.isArray(guestProjects)
        ? guestProjects.reduce(function(result, item) {
            if (!item) return result;
            result.push(item.language || item.lang, item.user_lang);
            return result;
        }, [])
        : [];
    const sourceOptions = explicitOptions.length ? explicitOptions : fallbackOptions;
    const seen = new Set();
    const normalizedOptions = [];

    sourceOptions.forEach(function(value) {
        const normalized = normalizeGuestLanguageCode(value);
        if (normalized === 'ALL' || seen.has(normalized)) return;
        seen.add(normalized);
        normalizedOptions.push(normalized);
    });

    const optionsHtml = [`<option value="ALL">${window.escapeHTML(window.t('guestFilterLangAll', {}, lang))}</option>`];
    normalizedOptions.forEach(function(code) {
        const meta = getGuestLanguageMeta(code);
        optionsHtml.push(`<option value="${window.escapeHTML(meta.code)}">${window.escapeHTML(meta.optionLabel)}</option>`);
    });
    select.innerHTML = optionsHtml.join('');

    const requestedValue = normalizeGuestLanguageCode(selectedValue);
    select.value = requestedValue !== 'ALL' && normalizedOptions.includes(requestedValue)
        ? requestedValue
        : 'ALL';
}

function resolveGuestInviteLanguage(guest) {
    if (!_guestInviteLang) {
        _guestInviteLang = typeof window.getDefaultGuestInviteLanguage === 'function'
            ? window.getDefaultGuestInviteLanguage(guest && (guest.language || guest.lang))
            : 'en';
    }
    if (typeof window.normalizeGuestInviteLanguage === 'function') {
        _guestInviteLang = window.normalizeGuestInviteLanguage(_guestInviteLang, lang);
    }
    return _guestInviteLang;
}

function getGuestDisplayName(guest) {
    return String((guest && (guest.name || guest.package_name)) || '').trim();
}

function getGuestInvitePreviewText(guest, inviteLang, inviteLink) {
    return window.t('guestInviteMessageTemplate', {
        app_name: getGuestDisplayName(guest),
        invite_link: String(inviteLink || '').trim(),
        community_link: 'https://t.me/googleplay_console_12testers',
    }, inviteLang);
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

function sanitizePulseEventHtml(value) {
    var raw = String(value || '');
    if (!raw) return '';

    var template = document.createElement('template');
    template.innerHTML = raw;
    var allowedTags = {
        A: true,
        B: true,
        STRONG: true,
        I: true,
        EM: true,
        BR: true,
        CODE: true,
    };
    var allowedHrefPattern = /^(https:\/\/t\.me\/[A-Za-z0-9_]+(?:[/?].*)?|tg:\/\/user\?id=\d+)$/i;

    function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createTextNode('');
        }

        var tagName = String(node.tagName || '').toUpperCase();
        if (!allowedTags[tagName]) {
            var fragment = document.createDocumentFragment();
            Array.from(node.childNodes || []).forEach(function(child) {
                fragment.appendChild(sanitizeNode(child));
            });
            return fragment;
        }

        var element = document.createElement(tagName.toLowerCase());
        if (tagName === 'A') {
            var href = String(node.getAttribute('href') || '');
            if (allowedHrefPattern.test(href)) {
                element.setAttribute('href', href);
                element.setAttribute('target', '_blank');
                element.setAttribute('rel', 'noopener noreferrer');
            }
        }

        Array.from(node.childNodes || []).forEach(function(child) {
            element.appendChild(sanitizeNode(child));
        });

        if (tagName === 'A' && !element.getAttribute('href')) {
            return document.createTextNode(element.textContent || '');
        }

        return element;
    }

    var container = document.createElement('div');
    Array.from(template.content.childNodes || []).forEach(function(child) {
        container.appendChild(sanitizeNode(child));
    });
    return container.innerHTML;
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
        return `<img src="${window.escapeHTML(iconUrl)}" class="avatar" style="object-fit: cover;" loading="lazy" decoding="async" onerror="this.onerror=null; this.outerHTML='<div class=\\'avatar\\' style=\\'background-color: #8e8e93;\\'>${firstLetter}</div>';">`;
    }
    return getAvatar(name);
}

function isTabVisible(tabName) {
    const tab = document.getElementById(`tab-${tabName}`);
    return !!(tab && tab.classList.contains('active'));
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
    const expiresAt = new Date(created.getTime() + (5 * 60 * 60 * 1000));
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

function formatLastActiveLabel(rawValue) {
    if (!rawValue) return window.t('unknownLabel', {}, lang);
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return String(rawValue);
    return parsed.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
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

function buildGrantProgressSegments(test, userTestingDay, expectedTotalDays) {
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
        var ch = renderTimeline[dayNum - 1] || '';
        var cls = 'remaining';
        if (ch === '1') { cls = 'standard-checkin'; standardCheckins++; }
        else if (ch === '0') { cls = 'standard-skip'; standardSkips++; }
        else if (ch === '2') { cls = 'overtime-checkin'; overtimeCheckins++; }
        else if (ch === '3') { cls = 'overtime-skip'; overtimeSkips++; }
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

    var overtimeSegments = [];
    for (var overtimeDay = 15; overtimeDay <= totalDays; overtimeDay++) {
        overtimeSegments.push(getDayState(overtimeDay));
    }

    var remainingDays = Math.max(0, totalDays - renderTimeline.length);
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
        currentDay: currentDay,
        currentDayState: currentDayState,
    };
}

function openTesterDossier(username, testerId, appId) {
    return openDossierModal(username || '', testerId, appId || 0);
}

function getMarketCandidateByAppId(appId) {
    const normalizedAppId = Number(appId || 0);
    if (!normalizedAppId) return null;

    const returnsCandidate = (Array.isArray(mutualReturns) ? mutualReturns : []).find(function(item) {
        return Number(item && item.app_id) === normalizedAppId;
    });
    if (returnsCandidate) {
        return Object.assign({ market_kind: 'mutual-return' }, returnsCandidate);
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

function getProjectPlatformDay(test) {
    var createdAt = test && test.created_at ? new Date(test.created_at) : null;
    if (!(createdAt && !Number.isNaN(createdAt.getTime()))) {
        return 0;
    }
    var today = parseLocalDateOnly(getLocalDate()) || new Date();
    return Math.max(1, Math.floor((today - createdAt) / (1000 * 60 * 60 * 24)) + 1);
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
    if (normalized === 'direct') {
        return { icon: '🚀', label: window.t('testerSourceDirectFull', {}, lang) };
    }
    return { icon: '🚀', label: window.t('testerSourceInviteFull', {}, lang) };
}

function renderTesterSourceIndicator(joinType) {
    const sourceMeta = getTesterSourceMeta(joinType);
    const toastText = window.t('testerSourceToast', { source: sourceMeta.label }, lang);
    return `<button type="button" style="background:none; border:none; padding:0; margin:0; color:var(--hint-color); font-size:15px; cursor:pointer; line-height:1;" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(toastText)}')">${sourceMeta.icon}</button>`;
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

function getAvailableMutualProjectsForOwner(targetOwnerId) {
    var normalizedTargetOwnerId = Number(targetOwnerId || 0);
    var normalizedUserId = Number(userId || 0);
    var projects = Array.isArray(myProjects) ? myProjects : [];

    if (!normalizedTargetOwnerId || !normalizedUserId || normalizedTargetOwnerId === normalizedUserId) {
        return [];
    }

    return projects.filter(function(project) {
        if (!project || !project.id) {
            return false;
        }

        var mode = String(project.mode || '').toLowerCase();
        if (mode !== 'mutual' && mode !== 'hybrid') {
            return false;
        }

        var projectStatus = String(project.status || 'active').toLowerCase();
        if (projectStatus === 'archived') {
            return false;
        }

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
        const canShowReviewChip = typeof window.canPromptPlayReview === 'function' ? window.canPromptPlayReview(test) : false;
        if (canShowReviewChip) {
            const reviewLabel = window.escapeHTML(window.t('playReviewChip', {}, lang));
            const reviewClass = 'meta-chip accent-yellow';
            parts.push(`<button class="${reviewClass}" onclick="openPlayReviewModal(${Number(test.id)}, event)">${reviewLabel}</button>`);
        }
        const rewardsSummary = (test.rewards_summary && typeof test.rewards_summary === 'object') ? test.rewards_summary : null;
        const rewardChipLabel = getRewardsChipLabel(rewardsSummary);
        if (rewardChipLabel) {
            const rewardLabel = window.escapeHTML(rewardChipLabel);
            parts.push(`<button class="meta-chip accent-green notranslate" onclick="event.stopPropagation(); openProjectDetailsModal(${Number(test.id)})">${rewardLabel}</button>`);
        }
        if (isProjectSynced(test)) {
            parts.push(`<button class="meta-chip accent-green" onclick="event.stopPropagation(); showToast('${(t.syncDoneText || '').replace(/'/g, "\\'")}')">${t.syncDoneText}</button>`);
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

function formatKarmaValue(value) {
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
    var nextControlDay = 0;

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

function highlightExternalTestActionRow(testId) {
    var actionRow = document.getElementById('external-test-actions-' + Number(testId || 0));
    if (!actionRow) return false;

    actionRow.classList.remove('highlight-target');
    void actionRow.offsetWidth;
    actionRow.classList.add('highlight-target');
    if (window._externalTestsActionHighlightTimer) {
        clearTimeout(window._externalTestsActionHighlightTimer);
    }
    window._externalTestsActionHighlightTimer = setTimeout(function() {
        actionRow.classList.remove('highlight-target');
        window._externalTestsActionHighlightTimer = null;
    }, 2600);
    return true;
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
                <button id="btn-confirm-${Number(test.id || 0)}" class="btn external-tests-confirm-btn split-btn-main" onclick="sendExternalDailyCheckinFromUi(${Number(test.id || 0)}, event)">
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
                            <button id="btn-confirm-${Number(test.id || 0)}" class="btn external-tests-confirm-btn split-btn-main" onclick="${primaryActionClick}">
                                ${window.escapeHTML(primaryActionLabel)}
                            </button>
                            ${attachButtonHtml}
                        </div>
                    </div>
                `;
            }
        }

        return `
            <div class="card card-external-tracking external-tests-card${isDoneToday ? ' is-tested' : ''}" id="external-test-card-${Number(test.id || 0)}" onclick="openProjectDetailsModal(${Number(test.id || 0)})">
                <div class="card-header external-tests-card-header">
                    ${renderIcon(test.name || test.package || window.t('unknownLabel', {}, lang), test.icon_url)}
                    <div class="card-info">
                        <div class="card-title notranslate">${safeName}</div>
                        <div class="card-subtitle notranslate">${safePackage}</div>
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
        const isPendingForTester = isPendingCompletion && Number(test.testing_days || 0) >= 15;
        const isArchivedOrCompleted = !isExternal && String(test.app_status || 'active').toLowerCase() !== 'active' && !isPendingCompletion;
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
        const shouldShowInPendingList = isPendingCompletion;
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
        }
        card.id = `test-card-${test.id}`;
        const userTestingDay = getResolvedTestingDay(test);
        const safePackage = escapeInlineJsString(test.package || test.external_package_name || '');
        const safeOwnerUsername = escapeInlineJsString(test.owner_username || '');
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');
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
        } else if (isPendingCompletion) {
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
            actionsHtml = `
                <div class="first-day-actions">
                    <div class="first-day-row">
                        <button class="btn first-day-btn" style="flex: 1;" onclick="tg.openLink('${safeGroupUrl}', { try_browser: 'chrome' }); if(tg.HapticFeedback) tg.HapticFeedback.selectionChanged();">${t.joinGroup}</button>
                        <button class="btn-icon first-day-copy" style="width: 44px; min-height: 44px; font-size: 18px;" onclick="copyGroupUrl('${safeGroupUrl}')">📋</button>
                    </div>
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
            `;
        } else if (test.status === 'daily' || test.status === 'opened') {
            const testingDay = userTestingDay || 999;
            const isScreenshotDay = isMandatoryScreenshotDay(testingDay);
            const isScreenshotOnlyDay = isScreenshotOnlyControlDay(testingDay);
            const screenshotBtnText = isScreenshotOnlyDay
                ? window.t('screenshotBtn', {}, lang)
                : '✅ ' + window.t('completeControlDayBtn', {}, lang);
            const screenshotWarningText = window.t(isScreenshotOnlyDay ? 'firstDayScreenshotWarning' : 'screenshotWarning', {}, lang);

            if (isScreenshotDay) {
                actionsHtml = `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn btn-secondary" style="width: 100%; background-color: var(--secondary-bg-color); color: var(--text-color); border: 1px solid rgba(142, 142, 147, 0.2);" onclick="startTimer(${test.id}, '${safePackage}', true, '${safeOwnerUsername}')">
                            ${t.openBtn}
                        </button>
                        <button id="btn-confirm-${test.id}" class="btn" style="width: 100%; background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;" disabled>
                            ${isIssueBlocked ? getIssueAwaitingFixLabel(test) : screenshotBtnText}
                        </button>
                        <div style="color: #ff3b30; font-size: 13px; text-align: center;">
                            ${window.escapeHTML(screenshotWarningText)}
                        </div>
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

            // Bounty daily reward hint
            if (test.join_type === 'bounty' && test.bounty_per_tester > 0) {
                var dailyReward = (test.bounty_per_tester * 0.65 / 14).toFixed(1);
                actionsHtml += '<div class="notranslate" style="text-align:center;margin-top:6px;font-size:12px;color:var(--hint-color);">' + window.t('bountyDailyReward', { amount: dailyReward }, lang) + '</div>';
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
        } else if (test.status !== 'done' && !test.isReadyToClaim && !isPendingForTester) {
            if (userTestingDay >= 15) {
                headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #30d158;" onclick="openOvertimeModal(${test.id}, event)">🔄</button>`);
            } else {
                headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="${hasGuestOrigin ? `openGuestLinkRemoveModalFromTest(${test.id}, event)` : (isMutualExitFlow(test) ? `openLeaveMutualModal(${test.id}, event)` : `openDropTestModal(${test.id}, event)`)}">🗑️</button>`);
            }
        }
        const trailingHtml = headerActions.length
            ? `<div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">${headerActions.join('')}</div>`
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
        const cardHeaderLinkStart = `<div class="card-header-link" onclick="openProjectDetailsModal(${test.id})">`;

        let cardContent = `
            ${doneBadgeHtml}
            <div class="card-header">
                ${cardHeaderLinkStart}
                    ${renderIcon(test.name, test.icon_url)}
                    <div class="card-info">
                        <div class="card-title notranslate">${safeName}</div>
                        <div class="card-subtitle notranslate">${safePackageLabel}</div>
                    </div>
                </div>
                ${langBadge ? `<div style="display:flex; align-items:center; gap:6px; margin-left: 8px;">${langBadge}</div>` : ''}
                ${trailingHtml}
            </div>
            ${renderCompactMeta(null, test.active_testers_count, false, userTestingDay, test, { showTestersCount: false, extraParts: externalMetaChips })}
            <div id="actions-${test.id}">
                ${actionsHtml}
            </div>
        `;

        if (isExternal) {
            card.style.cursor = 'pointer';
            card.onclick = function(event) {
                if (event && event.target && typeof event.target.closest === 'function') {
                    var interactiveTarget = event.target.closest('.card-header-link, button, a, input, select, textarea, label, summary, details');
                    if (interactiveTarget) {
                        return;
                    }
                }
                window.openProjectDetailsModal(test.id);
            };
        }

        if (shouldShowInDoneList) {
            const reminderHtml = getScreenshotReminderHtml(test);
            if (reminderHtml) {
                cardContent += reminderHtml;
            }
            card.innerHTML = cardContent;
            if (!isExternal) {
                card.style.cursor = 'pointer';
                card.onclick = () => window.openProjectDetailsModal(test.id);
            }
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

    document.getElementById('done-count').innerText = doneCount;
    document.getElementById('done-section').style.display = doneCount > 0 ? 'block' : 'none';

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
        const safeName = window.escapeHTML(test.name || window.t('unknownLabel', {}, lang));
        const safePackageLabel = window.escapeHTML(test.package || '');

        const actionsHtml = '';

        const headerActions = [];
        if (test.owner_username) {
            headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent;" onclick="return openTelegramProfile('${safeOwnerUsername}', event)">💬</button>`);
        }
        headerActions.push(`<button class="btn-icon" style="width: 36px; height: 36px; font-size: 16px; border: none; background: transparent; color: #ff3b30;" onclick="${isMutualExitFlow(test) ? `openLeaveMutualModal(${test.id}, event)` : `openDropTestModal(${test.id}, event)`}">🗑️</button>`);
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
                    <div class="card-title notranslate">${safeName}</div>
                    <div class="card-subtitle notranslate">${safePackageLabel}</div>
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
    if (langCode === 'RU') return `<button type="button" class="lang-badge notranslate" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('RU'))}')">🇷🇺</button>`;
    if (langCode === 'EN') return `<button type="button" class="lang-badge notranslate" onclick="event.stopPropagation(); showToast('${escapeInlineJsString(getProjectLanguageToast('EN'))}')">🇬🇧</button>`;
    return '';
}

function renderFeedCard(item, kind) {
    const ownerDisplay = window.escapeHTML(item.owner_full_name || (item.owner_username ? '@' + item.owner_username : window.t('idLabel', { id: item.owner_id }, lang)));
    const safeOwner = escapeInlineJsString(item.owner_username || '');
    const langBadge = (item.target_lang && item.target_lang !== 'ALL') ? getLangBadge(item.target_lang) : '';
    const syncChip = isProjectSynced(item)
        ? `<span class="meta-chip accent-green">${window.escapeHTML(formatCompactSyncLabel(item))}</span>`
        : '';
    const bountyChip = kind === 'bounty'
        ? `<span class="meta-chip accent-purple notranslate">💎 ${item.bounty_per_tester || 0} $BUST</span>`
        : '';
    const kindChip = kind === 'mutual-seeking'
        ? `<span class="meta-chip accent-green">👨‍💻 ${window.t('tabTestersNeeded', {}, lang)}</span>`
        : (kind === 'mutual-prelaunch'
            ? `<span class="meta-chip accent-blue">${window.t('tabPreLaunch', {}, lang)}</span>`
            : '');
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
    list.innerHTML = items.map(app => {
        const ownerUsername = (app.owner_username || '').replace('@', '');
        const safeOwnerUsername = escapeInlineJsString(ownerUsername);
        const displayOwner = window.escapeHTML(ownerUsername ? '@' + ownerUsername : window.t('idLabel', { id: app.owner_id }, lang));
        const appName = window.escapeHTML(app.name || window.t('unknownLabel', {}, lang));
        const myProjectNameRaw = app.my_project_name || '';
        const contextText = window.escapeHTML(window.t('mutualReturnContext', { project: myProjectNameRaw }, lang));
        const sourceMeta = getTesterSourceMeta(app.join_type);
        const sourceBadge = `<span class="mutual-return-source-badge" title="${window.escapeHTML(sourceMeta.label)}">${window.escapeHTML(sourceMeta.icon + ' ' + sourceMeta.label)}</span>`;
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
            : `if(tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium'); openTesterDossier('${safeOwnerUsername}', ${app.owner_id}, ${app.app_id}); event.stopPropagation();`;
        return `
            <div class="horizontal-card mutual-return-card">
                <div style="font-size:12px; color:var(--hint-color); margin-bottom:8px; line-height:1.4;">
                    <button class="tester-link notranslate" style="background:none;border:none;padding:0;font-size:12px;cursor:pointer;color:var(--link-color);" onclick="openTesterDossier('${safeOwnerUsername}', ${app.owner_id}, ${app.app_id}); event.stopPropagation();">${displayOwner}</button><span class="notranslate">${contextText}</span>
                </div>
                <div class="mutual-return-card-head">
                    ${renderIcon(app.name || '', app.icon_url)}
                    <div class="mutual-return-card-main">
                        <div class="card-title mutual-return-card-title notranslate">${appName}</div>
                        ${sourceBadge}
                    </div>
                </div>
                <button class="${btnClass}" ${btnDisabled} style="width:100%;" data-offer-target-app="${app.app_id}" data-offer-target-owner="${app.owner_id}" onclick="${btnClick}">${returnBtnText}</button>
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
                    <div class="market-owner notranslate">${window.escapeHTML(ownerUsername ? '@' + ownerUsername : window.t('guestInviteOwnerMissing', {}, lang))}</div>
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

        const inviteStartapp = String(data.startapp || `guest_${guest.id}_${userId}`).trim();
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

    body.innerHTML = `
        <div class="external-track-hero">
            <div class="external-track-hero-badge">${window.escapeHTML(window.t('externalTrackBadge', {}, lang))}</div>
            <div class="external-track-hero-title notranslate">${safePackageName}</div>
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
    var selectedProject = getSelectedExternalTrackProject();
    _externalTrackProjectId = selectedProject ? Number(selectedProject.id || 0) : 0;
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
}

function setExternalTrackProject(projectId, event) {
    if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
    }
    _externalTrackProjectId = Number(projectId || 0);
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    updateExternalTrackSubmitState();
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
    var selectedProjectId = Number(elements.select && elements.select.value || 0);
    _externalTrackProjectId = selectedProjectId;
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
            ? window.buildExternalClaimStartLink(guest.package_name || guest.name || '')
            : '';
        var myGroupLink = String(selectedProject.google_group_url || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test').trim();
        var myPackage = String(selectedProject.package || selectedProject.package_name || '').trim();
        var myPlayLink = myPackage ? ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(myPackage)) : '';
        var messageText = window.t('externalTrackInviteMessageTemplate', {
            app_name: getGuestDisplayName(guest) || window.t('unknownLabel', {}, lang),
            claim_link: claimLink,
            play_link: myPlayLink,
            group_link: myGroupLink,
        }, lang);

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
        invite_link: buildProjectInviteStartLink(project.id),
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
            ? window.buildExternalClaimStartLink(test.external_package_name || test.package || '')
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
            ? window.buildExternalClaimStartLink(packageName)
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
            ? window.buildExternalClaimStartLink(test.external_package_name || test.package || '')
            : '',
    }, lang);
    copyTextWithToast(messageText, 'externalTrackCopied');
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    openTelegramPrefilledMessage(cleanOwnerUsername, messageText);
}

async function _confirmExternalTestingCancel(test) {
    if (!test || typeof window.cancelExternalTracking !== 'function') return;
    var result = await window.cancelExternalTracking(test.progress_id, test.id);
    if (!result) return;

    closeProjectDetailsModal();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast(window.t('externalProjectCancelSuccess', {}, lang));
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
                    <button class="btn external-tests-confirm-btn ${statusMeta.isPostControlWindow && !isContinuedExternal ? '' : 'split-btn-main'}" style="${primaryActionDisabled ? 'background-color: rgba(142, 142, 147, 0.2); color: var(--hint-color); cursor: not-allowed;' : ''}" ${primaryActionDisabled ? 'disabled' : ''} onclick="${primaryActionClick}">
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
        const primaryAuthor = fullName || usernameLabel || window.escapeHTML(window.t('idLabel', { id: item.tester_id }, lang));
        const secondaryAuthor = fullName && usernameLabel ? usernameLabel : '';
        const authorInnerHtml = `<span class="feedback-card-author-main notranslate">${primaryAuthor}</span>${secondaryAuthor ? `<span class="feedback-card-author-sub notranslate">${secondaryAuthor}</span>` : ''}`;
        const authorHtml = username
            ? `<a href="javascript:void(0);" class="feedback-card-author" onclick="return openTelegramProfile('${safeUsername}', event)">${authorInnerHtml}</a>`
            : `<span class="feedback-card-author">${authorInnerHtml}</span>`;
        const textHtml = isReviewTicket
            ? `<span class="feedback-review-ticket">⭐ ${window.escapeHTML(window.t('projectFeedbackReviewTicketText', {}, lang))}</span>`
            : (item.message_text
                ? escapeHtmlWithBreaks(item.message_text)
                : `<span style="color: var(--hint-color);">${window.escapeHTML(window.t('projectFeedbackNoText', {}, lang))}</span>`);
        const rewardBust = Number(item.reward_bust || 0);
        const rewardKarma = Number(item.reward_karma || 0);
        const statusBadge = item.status === 'rejected'
            ? window.escapeHTML(window.t('projectFeedbackRejectedBadge', {}, lang))
            : window.escapeHTML(window.t('projectFeedbackProcessedBadge', {}, lang));
        const rewardSummary = item.status !== 'new'
            ? `<div class="feedback-modal-summary" style="margin-top: 10px;">
                    ${rewardBust > 0 ? `<span class="meta-chip accent-purple notranslate">💎 ${formatBustAmount(rewardBust)}</span>` : ''}
                    ${rewardKarma > 0 ? `<span class="meta-chip accent-yellow notranslate">☯️ ${rewardKarma.toFixed(1)}</span>` : ''}
                    <span class="meta-chip">${statusBadge}</span>
               </div>`
            : '';
        const replyHtml = item.developer_reply
            ? `<div class="feedback-card-reply">${window.escapeHTML(window.t('feedbackRewardReplyCard', {}, lang))}: ${escapeHtmlWithBreaks(item.developer_reply)}</div>`
            : '';
        return `
            <div class="feedback-card ${item.status === 'new' ? 'is-new' : ''}${item.status === 'rejected' ? ' is-rejected' : ''}">
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
            : tester.full_name
                ? window.escapeHTML(tester.full_name)
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
    await window.startMassInvite(projectId);
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
    var safeOwnerUsername = escapeInlineJsString(project.owner_username || '');
    var ownerDisplay = window.escapeHTML(project.owner_username ? '@' + String(project.owner_username).replace('@', '') : window.t('idLabel', { id: testerId }, lang));
    var createdDate = project.created_at ? new Date(project.created_at) : null;
    var todayDate = new Date(getLocalDate());
    var platformDays = createdDate && !Number.isNaN(createdDate.getTime())
        ? Math.max(1, Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 1;
    var currentGoogleDay = isProjectSynced(project) ? getProjectCurrentGoogleDay(project, platformDays) : platformDays;
    var leftDays = Math.max(0, 14 - currentGoogleDay);
    var finishDate = new Date(todayDate);
    finishDate.setDate(finishDate.getDate() + leftDays);
    var hasSync = isProjectSynced(project);
    var ownerActivity = getOwnerActivityMeta(project.last_owner_activity);
    var reliabilityState = getDossierReliabilityState(profile || {});
    var reliabilityLine = reliabilityState.expected >= 42
        ? window.t('dossierOwnerReliability', { pct: reliabilityState.reliabilityPct, status: reliabilityState.reliabilityText }, lang)
        : window.t('dossierOwnerReliabilityNewbie', {}, lang);
    var takeAction = String(project.mode || 'mutual').toLowerCase() === 'bounty'
        ? 'closeProjectDetailsModal(); joinBounty(' + Number(project.app_id) + ')'
        : 'closeProjectDetailsModal(); joinMutual(' + Number(project.app_id) + ', false)';
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
                getAvatar(project.owner_username || '?') +
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
            '<button class="btn" style="background:rgba(0,122,255,0.16);color:var(--button-color);" onclick="' + takeAction + '">' + window.escapeHTML(window.t('dossierBtnTakeTest', {}, lang)) + '</button>' +
        '</div>';

    var modal = document.getElementById('project-details-modal');
    if (modal) {
        modal.dataset.appId = '';
        modal.classList.add('active');
    }
}

async function openDossierModal(username, testerId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    const modal = document.getElementById('dossier-modal');
    document.getElementById('dossier-modal-title').innerText = username ? `@${username}` : window.t('idLabel', { id: testerId }, lang);
    document.getElementById('dossier-body').innerHTML = `<p style="text-align:center; color: var(--hint-color);">${t.dossierLoading}</p>`;
    modal.classList.add('active');

    const project = myProjects.find((item) => item.id === appId);
    const tester = project ? (project.testers || []).find((candidate) => candidate.tester_id === testerId) : null;
    const marketCandidate = getMarketCandidateByAppId(appId);
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

    let testerProjects = [];
    try {
        const resp = await fetch(`${API_BASE}/users/${testerId}/projects`);
        if (resp.ok) {
            const data = await resp.json();
            testerProjects = Array.isArray(data && data.projects) ? data.projects : [];
        }
    } catch (error) {
        console.error('Dossier projects fetch error:', error);
    }
    testerProjects = testerProjects.map(function(item) {
        return Object.assign({}, item, { owner_username: tgName || '' });
    });
    _dossierProjectsCache[String(testerId)] = testerProjects;
    _dossierProfilesCache[String(testerId)] = profile;

    const reliabilityState = getDossierReliabilityState(profile);
    const expected = reliabilityState.expected;
    const actual = reliabilityState.actual;
    const reliabilityPct = reliabilityState.reliabilityPct;
    const reliabilityText = reliabilityState.reliabilityText;

    const likesAvailable = project ? (project.likes_max - project.likes_used) : 0;
    const alreadyLiked = project ? (project.likes || []).some((like) => like.tester_id === testerId) : true;
    const canReward = likesAvailable > 0 && !alreadyLiked;
    const canDeleteFromProject = !!tester && !!project && !!appId && testingDay > 0 && testingDay <= 7;
    const canTakeFromShowcase = !!marketCandidate && !project && !marketCandidate.is_own_project;
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
            <br>${expected >= 42 ? t.dossierReliability.replace('{pct}', reliabilityPct) + ' ' + reliabilityText : t.disciplineLabel + ' ' + t.dossierNewbie}
            <br>${t.dossierKarma.replace('{karma}', profile.karma)}
            ${goldenCountText ? '<br><span class="golden-badge">' + window.escapeHTML(goldenCountText) + '</span>' : ''}
        </div>
    </div>`;

    html += `<div style="margin-bottom: 16px;">
        <div style="font-weight: 600; margin-bottom: 8px;">${window.escapeHTML(window.t('dossierOwnedProjectsTitle', {}, lang))}</div>
        ${testerProjects.length
            ? '<div class="dossier-owned-projects-list">' + testerProjects.map((ownedProject) => {
                const safeOwnedName = window.escapeHTML(ownedProject.name || window.t('unknownLabel', {}, lang));
                const safeOwnedPackage = window.escapeHTML(ownedProject.package_name || '');
                const alreadyTestingOwned = (myTests || []).some((test) => Number(test.id) === Number(ownedProject.app_id));
                const createdAt = ownedProject.created_at ? new Date(ownedProject.created_at) : null;
                const platformDays = createdAt && !Number.isNaN(createdAt.getTime())
                    ? Math.max(1, Math.floor((todayDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                    : 1;
                const currentGoogleDayOwned = isProjectSynced(ownedProject) ? getProjectCurrentGoogleDay(ownedProject, platformDays) : platformDays;
                const leftDaysOwned = Math.max(0, 14 - currentGoogleDayOwned);
                return `<button type="button" class="dossier-owned-project-card" onclick="openTesterOwnedProjectFromDossier(${testerId}, ${Number(ownedProject.app_id)})">
                    <div class="dossier-owned-project-card-inner">
                        ${renderIcon(ownedProject.name || '', ownedProject.icon_url)}
                        <div class="dossier-owned-project-body">
                            <div class="dossier-owned-project-top">
                                <div style="flex:1;min-width:0;">
                                    <div class="dossier-owned-project-title notranslate">${safeOwnedName}</div>
                                    <div class="dossier-owned-project-subtitle notranslate">${safeOwnedPackage}</div>
                                </div>
                                <div class="dossier-owned-project-arrow">›</div>
                            </div>
                            <div class="dossier-owned-project-meta">
                                <span class="meta-chip accent-blue">${window.escapeHTML(getProjectModeText(ownedProject.mode))}</span>
                                <span class="meta-chip">${window.escapeHTML(window.t('dossierOwnedProjectEta', { count: leftDaysOwned }, lang))}</span>
                                ${alreadyTestingOwned ? '<span class="meta-chip accent-green">' + window.escapeHTML(window.t('dossierOwnedProjectAlreadyTesting', {}, lang)) + '</span>' : ''}
                            </div>
                        </div>
                    </div>
                </button>`;
            }).join('') + '</div>'
            : `<div class="dossier-owned-project-empty">${window.escapeHTML(window.t('dossierOwnedProjectsEmpty', {}, lang))}</div>`}
    </div>`;

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
            ${canTakeFromShowcase ? `<button class="btn ${takeFromShowcaseDisabled ? 'pending disabled' : 'btn-primary'}" style="width: 100%; border: none; font-weight: 600; padding: 10px;" ${takeFromShowcaseDisabled ? 'disabled' : `onclick="closeDossierModal(); joinMutual(${appId}, ${takeFromShowcaseIsPrelaunch ? 'true' : 'false'})"`}>${window.escapeHTML(window.t(takeFromShowcaseDisabled ? 'offerPending' : 'dossierBtnTakeTest', {}, lang))}</button>` : ''}
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
        document.getElementById('package-error').innerHTML = '';
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
    document.getElementById('edit-group').value = project.google_group_url || window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test';
    document.getElementById('edit-limit-mutual').value = String(project.limit_mutual || 12);
    document.getElementById('edit-limit-bounty').value = String(project.limit_bounty || 12);
    document.getElementById('edit-bounty-per-tester').value = String(project.bounty_per_tester || 100);
    document.getElementById('edit-request-reviews').checked = project.request_reviews !== false;
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

function resetEditGoogleGroupToDefault() {
    var input = document.getElementById('edit-group');
    if (!input) return;
    input.value = window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test';
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
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

function showProjectSelectModal(projects, targetAppId, targetOwnerId, options) {
    let modal = document.getElementById('project-select-modal');
    if (!modal) return;
    const listEl = document.getElementById('project-select-list');
    const footerEl = document.getElementById('project-select-footer');
    if (!listEl) return;
    const blockedProjects = options && options.blockedProjects ? options.blockedProjects : {};
    const availableProjects = Array.isArray(projects) ? projects : [];
    listEl.innerHTML = availableProjects.length ? availableProjects.map(p => {
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
    }).join('') : `<div class="details-block"><div style="font-size:13px; color: var(--hint-color);">${window.escapeHTML(window.t('offerNoProjects', {}, lang))}</div></div>`;
    window._selectProjectForOffer = async function(proposerAppId) {
        closeProjectSelectModal();
        await window.sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, {
            targetAppId: targetAppId,
            targetOwnerId: targetOwnerId,
        });
    };
    if (footerEl) {
        footerEl.innerHTML = `<button class="btn btn-secondary" style="width: 100%;" onclick="joinDirect(${targetAppId})">${window.escapeHTML(window.t('takeWithoutMutualBtn', {}, lang))}</button>`;
    }
    modal.classList.add('active');
}

function closeProjectSelectModal() {
    const modal = document.getElementById('project-select-modal');
    if (modal) modal.classList.remove('active');
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
    dismissProjectUpdateTip,
    renderCompactMeta,
    openTelegramProfile,
    renderIncomingOffers,
    renderTests,
    renderReliabilitySummaryWidget,
    renderReliabilityDashboard,
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
    activateExternalContinueModeFromUi,
    openDropTestModal,
    closeDropTestModal,
    openLeaveMutualModal,
    closeLeaveMutualModal,
    toggleLeaveReasonOther,
    openOvertimeModal,
    closeOvertimeModal,
    overtimeContactOwner,
    openKickTesterModal,
    closeKickTesterModal,
    toggleKickReasonOther,
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
    renderVisibilityModeModal,
    openVisibilityModeModal,
    closeVisibilityModeModal,
    applyVisibilityModeFromModal,
    showKarmaInfo,
    closeKarmaInfoModal,
    openReliabilityAlphaModal,
    closeReliabilityAlphaModal,
    renderReliabilityAlphaModal,
    openReliabilityDashboard,
    closeReliabilityDashboard,
    setReliabilityDashboardFilter,
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
    showOwnerLastSeenToast,
    switchTab,
    toggleAccordion,
    closeBanner,
    handleMassInviteAction,
    renderGuestProjectsSection,
    renderGuestInviteModal,
    renderExternalTrackModal,
    renderGuestTesterDetailsModal,
    openInviteModal,
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
    setInviteMode,
    toggleExternalTrackAcknowledged,
    showExternalTrackInfo,
    showExternalTrackInfoClick,
    openExternalAppLink,
    copyTextWithToast,
    escapeForAttr,
    copyAndAction,
    publishProjectToMarketAction,
    closeGuestInviteModal,
    closeExternalTrackModal,
    closeManualExternalAddModal,
    closeGuestTesterDetailsModal,
    closeInviteModal,
    openDossierModal,
    closeDossierModal,
    openTesterOwnedProjectFromDossier,
    openDeleteModal,
    closeDeleteModal,
    openModal,
    closeModal,
    resetManualExternalAddForm,
    updateManualExternalTestingDayValue,
    normalizeManualExternalOwnerNicknameInput,
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
    getAvailableMutualProjectsForOwner,
    showProjectSelectModal,
    closeProjectSelectModal,
    openContractEconomyModal,
    closeContractEconomyModal,
    openKarmaDistribution,
    closeKarmaDistribution,
    openKarmaSelectPopup,
    closeKarmaSelectPopup,
    confirmKarmaSelect,
});

Object.assign(window.ui, {
    showLoading,
    hideLoading,
    showGuestTestsInfoAlert,
    triggerGuestShowcaseNavigation,
});