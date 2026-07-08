/* Phase 4.1 — ui/ui-helpers.js (structural split from ui.js) */
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
var _externalTrackLang = null;
var _externalTrackStep = 1;
var _guestTesterProjectId = 0;
var _guestTesterProgressId = 0;
var _guestLinkRemoveState = null;
var _reportMessageLang = null;
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
/**
 * Normalize pipeline phase for dashboard project rows (API, cache, or in-memory).
 * Post-test statuses (`completed`, `pending_completion`) map to moderation unless
 * phase is explicitly `live`. This recovers rows where older mappers defaulted
 * `phase` to `'testing'` even though the project already left active testing.
 */
function normalizeProjectPhase(project) {
    if (!project || typeof project !== 'object') return 'testing';
    var phase = String(project.phase == null ? '' : project.phase).trim().toLowerCase();
    var status = String(project.app_status || project.status || '').trim().toLowerCase();

    if (phase === 'moderation' || phase === 'live') {
        return phase;
    }
    if (status === 'completed' || status === 'pending_completion') {
        return 'moderation';
    }
    if (phase === 'testing' || phase === '') {
        return 'testing';
    }
    return phase || 'testing';
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

function getProjectPlatformDay(createdAt) {
    return Math.max(1, getDayDiffFromToday(createdAt) + 1);
}
const GUEST_LANGUAGE_META = {
    ar: { flag: '🇦🇪', label: 'Arabic' },
    am: { flag: '🇦🇲', label: 'Armenian' },
    az: { flag: '🇦🇿', label: 'Azerbaijani' },
    by: { flag: '🇧🇾', label: 'Belarusian' },
    de: { flag: '🇩🇪', label: 'German' },
    en: { flag: '🇬🇧', label: 'English' },
    es: { flag: '🇪🇸', label: 'Spanish' },
    fa: { flag: '🇮🇷', label: 'Persian' },
    fr: { flag: '🇫🇷', label: 'French' },
    hi: { flag: '🇮🇳', label: 'Hindi' },
    id: { flag: '🇮🇩', label: 'Indonesian' },
    it: { flag: '🇮🇹', label: 'Italian' },
    ja: { flag: '🇯🇵', label: 'Japanese' },
    kg: { flag: '🇰🇬', label: 'Kyrgyz' },
    ko: { flag: '🇰🇷', label: 'Korean' },
    kz: { flag: '🇰🇿', label: 'Kazakh' },
    md: { flag: '🇲🇩', label: 'Moldavian' },
    ms: { flag: '🇲🇾', label: 'Malay' },
    nl: { flag: '🇳🇱', label: 'Dutch' },
    pl: { flag: '🇵🇱', label: 'Polish' },
    pt: { flag: '🇵🇹', label: 'Portuguese' },
    'pt-br': { flag: '🇧🇷', label: 'Portuguese (Brazil)' },
    ru: { flag: '🇷🇺', label: 'Russian' },
    th: { flag: '🇹🇭', label: 'Thai' },
    tj: { flag: '🇹🇯', label: 'Tajik' },
    tm: { flag: '🇹🇲', label: 'Turkmen' },
    tr: { flag: '🇹🇷', label: 'Turkish' },
    uk: { flag: '🇺🇦', label: 'Ukrainian' },
    ur: { flag: '🇵🇰', label: 'Urdu' },
    uz: { flag: '🇺🇿', label: 'Uzbek' },
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
        community_link: (window.App && window.App.publicGroupUrl) || 'https://t.me/googleplay_console_12testers',
    }, inviteLang);
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

function resolveIconUrl(iconUrl) {
    if (!iconUrl || typeof iconUrl !== 'string') return '';
    var trimmed = iconUrl.trim();
    if (!trimmed) return '';
    if (trimmed.indexOf('blob:') === 0 || /^https?:\/\//i.test(trimmed)) return trimmed;
    var path = trimmed;
    if (path.indexOf('telegram-media') !== -1) {
        if (path.indexOf('/telegram-media') !== 0) {
            path = path.indexOf('telegram-media') === 0 ? '/' + path : path;
        }
        var base = (window.App && window.App.API_BASE) || window.API_BASE || '';
        base = String(base).replace(/\/+$/, '');
        return base ? base + (path.indexOf('/') === 0 ? path : '/' + path) : path;
    }
    return trimmed;
}
window.resolveIconUrl = resolveIconUrl;

var _ngrokTelegramMediaCache = new Map();

function fetchNgrokSafeImageUrl(url) {
    if (!url || typeof url !== 'string') return Promise.resolve(url);
    if (!window.API_USES_NGROK || url.indexOf('telegram-media') === -1) {
        return Promise.resolve(url);
    }
    if (_ngrokTelegramMediaCache.has(url)) {
        return Promise.resolve(_ngrokTelegramMediaCache.get(url));
    }
    return fetch(url).then(function (resp) {
        if (!resp.ok) return url;
        return resp.blob();
    }).then(function (blobOrUrl) {
        if (typeof blobOrUrl === 'string') return blobOrUrl;
        var blobUrl = URL.createObjectURL(blobOrUrl);
        _ngrokTelegramMediaCache.set(url, blobUrl);
        return blobUrl;
    }).catch(function () {
        return url;
    });
}
window.fetchNgrokSafeImageUrl = fetchNgrokSafeImageUrl;

function hydrateTelegramMediaImages(root) {
    if (!window.API_USES_NGROK) return;
    var scope = root || document;
    var imgs = scope.querySelectorAll('img[src*="telegram-media"]');
    imgs.forEach(function (img) {
        if (!img || img.dataset.ngrokMediaHydrated === '1') return;
        var src = img.getAttribute('src');
        if (!src || src.indexOf('telegram-media') === -1) return;
        img.dataset.ngrokMediaHydrated = '1';
        fetchNgrokSafeImageUrl(src).then(function (safeUrl) {
            if (safeUrl && safeUrl !== src) {
                img.src = safeUrl;
            }
        });
    });
}
window.hydrateTelegramMediaImages = hydrateTelegramMediaImages;

function _startTelegramMediaNgrokHydrator() {
    if (!window.API_USES_NGROK || window.__telegramMediaNgrokHydratorStarted) return;
    window.__telegramMediaNgrokHydratorStarted = true;
    hydrateTelegramMediaImages(document);
    if (!document.body) return;
    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            mutation.addedNodes.forEach(function (node) {
                if (!node || node.nodeType !== 1) return;
                if (node.tagName === 'IMG') {
                    hydrateTelegramMediaImages(node.parentNode || document);
                    return;
                }
                if (typeof node.querySelectorAll === 'function') {
                    hydrateTelegramMediaImages(node);
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _startTelegramMediaNgrokHydrator);
} else {
    _startTelegramMediaNgrokHydrator();
}

function renderIcon(name, iconUrl) {
    if (iconUrl) {
        var src = resolveIconUrl(iconUrl);
        const firstLetter = name.charAt(0).toUpperCase().replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return '<img src="' + window.escapeHTML(src) + '" class="avatar" style="object-fit: cover;" loading="lazy" decoding="async" onerror="this.onerror=null; this.outerHTML=\'<div class=\\\'avatar\\\' style=\\\'background-color: #8e8e93;\\\'>' + firstLetter + '</div>\';">';
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