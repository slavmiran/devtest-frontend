window.App = window.App || {};

var tg = window.Telegram.WebApp;
tg.expand();
tg.ready();
window.DEFAULT_GOOGLE_GROUP_URL = 'https://groups.google.com/g/google-play-dev-test';

const initData = tg.initDataUnsafe || {};
const BOT_USERNAME = 'Android12TestersBot';
const WEBAPP_SHORTNAME = 'app';
const BOT_CHAT_URL = `https://t.me/${BOT_USERNAME}`;
window.App.botUsername = BOT_USERNAME;
window.App.webappShortname = WEBAPP_SHORTNAME;
const GUEST_CLAIM_START_PARAM_RE = /^guest_([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})_(\d+)$/i;
const LEAD_INVITE_START_PARAM_RE = /^lead_(\d+)$/i;
const GUEST_CLAIM_SESSION_PREFIX = 'guest_claim_handled_v1:';
const USER_TIMEZONE_STORAGE_KEY = 'user_system_timezone';
const langCode = initData.user?.language_code;
const userId = initData.user?.id || 123456789;
const telegramUsername = String(initData.user?.username || '').trim().replace(/^@+/, '');
var API_BASE = 'https://devtest-backend.onrender.com/api';
const GUEST_PROJECTS_PAGE_SIZE = 5;
const NATIVE_APP_LANGS = ['ru', 'en'];
const RTL_APP_LANGS = ['ar', 'fa', 'he', 'ur'];
const APP_BASE_LANGUAGE_STORAGE_KEY = 'app_language';
const APP_SELECTED_LANGUAGE_STORAGE_KEY = 'app_lang';
const GOOGLE_TRANSLATE_COOKIE_NAME = 'googtrans';
const GOOGLE_TRANSLATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const GOOGLE_TRANSLATE_SYNC_GUARD_KEY = 'google_translate_sync_guard';

function hasTelegramUsername() {
    return telegramUsername.length > 0;
}

function showNoUsernameOverlay() {
    const overlay = document.getElementById('no-username-overlay');
    if (!overlay) {
        return;
    }
    document.body.classList.add('no-username-blocked');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    try {
        tg.expand();
    } catch (error) {}
}

function closeNoUsernameOverlay() {
    try {
        if (tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function') {
            tg.HapticFeedback.impactOccurred('light');
        }
    } catch (error) {}
    try {
        tg.close();
    } catch (error) {}
}

window.App.hasTelegramUsername = hasTelegramUsername;
const AUTO_TRANSLATE_LANGUAGE_OPTIONS = [
    { code: 'am', googleCode: 'am', shortLabel: 'AM', labelKey: 'appLanguageOptionAm' },
    { code: 'ar', googleCode: 'ar', shortLabel: 'AR', labelKey: 'appLanguageOptionAr' },
    { code: 'az', googleCode: 'az', shortLabel: 'AZ', labelKey: 'appLanguageOptionAz' },
    { code: 'bg', googleCode: 'bg', shortLabel: 'BG', labelKey: 'appLanguageOptionBg' },
    { code: 'bn', googleCode: 'bn', shortLabel: 'BN', labelKey: 'appLanguageOptionBn' },
    { code: 'bs', googleCode: 'bs', shortLabel: 'BS', labelKey: 'appLanguageOptionBs' },
    { code: 'ca', googleCode: 'ca', shortLabel: 'CA', labelKey: 'appLanguageOptionCa' },
    { code: 'cs', googleCode: 'cs', shortLabel: 'CS', labelKey: 'appLanguageOptionCs' },
    { code: 'da', googleCode: 'da', shortLabel: 'DA', labelKey: 'appLanguageOptionDa' },
    { code: 'de', googleCode: 'de', shortLabel: 'DE', labelKey: 'appLanguageOptionDe' },
    { code: 'el', googleCode: 'el', shortLabel: 'EL', labelKey: 'appLanguageOptionEl' },
    { code: 'es', googleCode: 'es', shortLabel: 'ES', labelKey: 'appLanguageOptionEs' },
    { code: 'et', googleCode: 'et', shortLabel: 'ET', labelKey: 'appLanguageOptionEt' },
    { code: 'fa', googleCode: 'fa', shortLabel: 'FA', labelKey: 'appLanguageOptionFa' },
    { code: 'fi', googleCode: 'fi', shortLabel: 'FI', labelKey: 'appLanguageOptionFi' },
    { code: 'fr', googleCode: 'fr', shortLabel: 'FR', labelKey: 'appLanguageOptionFr' },
    { code: 'gu', googleCode: 'gu', shortLabel: 'GU', labelKey: 'appLanguageOptionGu' },
    { code: 'he', googleCode: 'he', shortLabel: 'HE', labelKey: 'appLanguageOptionHe' },
    { code: 'hi', googleCode: 'hi', shortLabel: 'HI', labelKey: 'appLanguageOptionHi' },
    { code: 'hr', googleCode: 'hr', shortLabel: 'HR', labelKey: 'appLanguageOptionHr' },
    { code: 'hu', googleCode: 'hu', shortLabel: 'HU', labelKey: 'appLanguageOptionHu' },
    { code: 'hy', googleCode: 'hy', shortLabel: 'HY', labelKey: 'appLanguageOptionHy' },
    { code: 'id', googleCode: 'id', shortLabel: 'ID', labelKey: 'appLanguageOptionId' },
    { code: 'is', googleCode: 'is', shortLabel: 'IS', labelKey: 'appLanguageOptionIs' },
    { code: 'it', googleCode: 'it', shortLabel: 'IT', labelKey: 'appLanguageOptionIt' },
    { code: 'ja', googleCode: 'ja', shortLabel: 'JA', labelKey: 'appLanguageOptionJa' },
    { code: 'ka', googleCode: 'ka', shortLabel: 'KA', labelKey: 'appLanguageOptionKa' },
    { code: 'kk', googleCode: 'kk', shortLabel: 'KK', labelKey: 'appLanguageOptionKk' },
    { code: 'ko', googleCode: 'ko', shortLabel: 'KO', labelKey: 'appLanguageOptionKo' },
    { code: 'lt', googleCode: 'lt', shortLabel: 'LT', labelKey: 'appLanguageOptionLt' },
    { code: 'lv', googleCode: 'lv', shortLabel: 'LV', labelKey: 'appLanguageOptionLv' },
    { code: 'ml', googleCode: 'ml', shortLabel: 'ML', labelKey: 'appLanguageOptionMl' },
    { code: 'mr', googleCode: 'mr', shortLabel: 'MR', labelKey: 'appLanguageOptionMr' },
    { code: 'ms', googleCode: 'ms', shortLabel: 'MS', labelKey: 'appLanguageOptionMs' },
    { code: 'nl', googleCode: 'nl', shortLabel: 'NL', labelKey: 'appLanguageOptionNl' },
    { code: 'no', googleCode: 'no', shortLabel: 'NO', labelKey: 'appLanguageOptionNo' },
    { code: 'pl', googleCode: 'pl', shortLabel: 'PL', labelKey: 'appLanguageOptionPl' },
    { code: 'pt', googleCode: 'pt', shortLabel: 'PT', labelKey: 'appLanguageOptionPt' },
    { code: 'pt-br', googleCode: 'pt', shortLabel: 'BR', labelKey: 'appLanguageOptionPtBr' },
    { code: 'ro', googleCode: 'ro', shortLabel: 'RO', labelKey: 'appLanguageOptionRo' },
    { code: 'sk', googleCode: 'sk', shortLabel: 'SK', labelKey: 'appLanguageOptionSk' },
    { code: 'sl', googleCode: 'sl', shortLabel: 'SL', labelKey: 'appLanguageOptionSl' },
    { code: 'sq', googleCode: 'sq', shortLabel: 'SQ', labelKey: 'appLanguageOptionSq' },
    { code: 'sr', googleCode: 'sr', shortLabel: 'SR', labelKey: 'appLanguageOptionSr' },
    { code: 'sv', googleCode: 'sv', shortLabel: 'SV', labelKey: 'appLanguageOptionSv' },
    { code: 'sw', googleCode: 'sw', shortLabel: 'SW', labelKey: 'appLanguageOptionSw' },
    { code: 'ta', googleCode: 'ta', shortLabel: 'TA', labelKey: 'appLanguageOptionTa' },
    { code: 'te', googleCode: 'te', shortLabel: 'TE', labelKey: 'appLanguageOptionTe' },
    { code: 'th', googleCode: 'th', shortLabel: 'TH', labelKey: 'appLanguageOptionTh' },
    { code: 'tl', googleCode: 'tl', shortLabel: 'TL', labelKey: 'appLanguageOptionTl' },
    { code: 'tr', googleCode: 'tr', shortLabel: 'TR', labelKey: 'appLanguageOptionTr' },
    { code: 'uk', googleCode: 'uk', shortLabel: 'UK', labelKey: 'appLanguageOptionUk' },
    { code: 'ur', googleCode: 'ur', shortLabel: 'UR', labelKey: 'appLanguageOptionUr' },
    { code: 'vi', googleCode: 'vi', shortLabel: 'VI', labelKey: 'appLanguageOptionVi' },
    { code: 'zh-cn', googleCode: 'zh-CN', shortLabel: 'ZH', labelKey: 'appLanguageOptionZhCn' },
    { code: 'zh-tw', googleCode: 'zh-TW', shortLabel: 'ZH', labelKey: 'appLanguageOptionZhTw' }
];

function getDefaultBaseLanguage() {
    var normalizedTelegramLang = String(langCode || '').trim().toLowerCase();
    if (normalizedTelegramLang.startsWith('ru')) {
        return 'ru';
    }
    return Object.keys(initData).length > 0 ? 'en' : 'ru';
}

function normalizeNativeLanguageCode(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return NATIVE_APP_LANGS.includes(normalized) ? normalized : '';
}

function getAutoTranslateLanguageConfig(value) {
    var normalized = String(value || '').trim().toLowerCase();
    for (var index = 0; index < AUTO_TRANSLATE_LANGUAGE_OPTIONS.length; index += 1) {
        if (AUTO_TRANSLATE_LANGUAGE_OPTIONS[index].code === normalized) {
            return AUTO_TRANSLATE_LANGUAGE_OPTIONS[index];
        }
    }
    return null;
}

function normalizeAppLanguage(value) {
    var normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return '';
    if (NATIVE_APP_LANGS.includes(normalized)) return normalized;
    return getAutoTranslateLanguageConfig(normalized) ? normalized : '';
}

function isNativeAppLanguage(value) {
    var normalized = normalizeAppLanguage(value);
    return !!normalized && NATIVE_APP_LANGS.includes(normalized);
}

function isAutoTranslatedLanguage(value) {
    var normalized = normalizeAppLanguage(value);
    return !!normalized && !NATIVE_APP_LANGS.includes(normalized);
}

function getBaseAppLanguage(value) {
    var normalized = normalizeAppLanguage(value);
    if (normalized === 'ru') return 'ru';
    if (normalized) return 'en';
    return getDefaultBaseLanguage();
}

function getServerSafeLanguage(value) {
    return normalizeAppLanguage(value) === 'ru' ? 'ru' : 'en';
}

function applyDocumentLanguageSettings(value) {
    var normalized = normalizeAppLanguage(value) || getDefaultBaseLanguage();
    document.documentElement.setAttribute('lang', normalized);
    document.documentElement.setAttribute('dir', RTL_APP_LANGS.includes(normalized) ? 'rtl' : 'ltr');
}

var appLang = normalizeAppLanguage(localStorage.getItem(APP_SELECTED_LANGUAGE_STORAGE_KEY))
    || normalizeNativeLanguageCode(localStorage.getItem(APP_BASE_LANGUAGE_STORAGE_KEY))
    || getDefaultBaseLanguage();
var lang = getBaseAppLanguage(appLang);
applyDocumentLanguageSettings(appLang);
const t = new Proxy({}, {
    get(_, key) {
        return window.t(key, {}, lang);
    }
});

function getSelectedAppLanguage() {
    return normalizeAppLanguage(appLang) || getBaseAppLanguage(lang);
}

function persistLanguageSelection(nextLanguage) {
    var normalized = normalizeAppLanguage(nextLanguage) || getDefaultBaseLanguage();
    appLang = normalized;
    lang = getBaseAppLanguage(normalized);
    localStorage.setItem(APP_SELECTED_LANGUAGE_STORAGE_KEY, normalized);
    localStorage.setItem(APP_BASE_LANGUAGE_STORAGE_KEY, lang);
    applyDocumentLanguageSettings(normalized);
}

function getLanguageShortLabel(value) {
    var normalized = normalizeAppLanguage(value) || getSelectedAppLanguage();
    if (normalized === 'ru') return 'RU';
    if (normalized === 'en') return 'EN';
    var config = getAutoTranslateLanguageConfig(normalized);
    return config ? config.shortLabel : String(normalized).toUpperCase();
}

function renderAutoTranslateLanguageOptions() {
    var select = document.getElementById('auto-translate-language');
    if (!select) return;

    var selectedLanguage = getSelectedAppLanguage();
    var selectedValue = isAutoTranslatedLanguage(selectedLanguage) ? selectedLanguage : '';
    var fragment = document.createDocumentFragment();
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = window.t('appLanguageAutoTranslatePlaceholder', {}, lang);
    fragment.appendChild(placeholder);

    AUTO_TRANSLATE_LANGUAGE_OPTIONS.forEach(function(optionConfig) {
        var option = document.createElement('option');
        option.value = optionConfig.code;
        option.textContent = window.t(optionConfig.labelKey, {}, lang);
        fragment.appendChild(option);
    });

    select.innerHTML = '';
    select.appendChild(fragment);
    select.value = selectedValue;
}

function getCookieValue(name) {
    var cookieName = String(name || '').trim();
    if (!cookieName) return '';
    var cookies = String(document.cookie || '').split(';');
    for (var index = 0; index < cookies.length; index += 1) {
        var entry = String(cookies[index] || '').trim();
        if (!entry || !entry.startsWith(cookieName + '=')) continue;
        return decodeURIComponent(entry.slice(cookieName.length + 1));
    }
    return '';
}

function getGoogleTranslateCookieValue() {
    return getCookieValue(GOOGLE_TRANSLATE_COOKIE_NAME);
}

function getExpectedGoogleTranslateCookieValue(value) {
    var config = getAutoTranslateLanguageConfig(value);
    return config ? '/en/' + config.googleCode : '';
}

function setGoogleTranslateCookie(value) {
    var cookieValue = getExpectedGoogleTranslateCookieValue(value);
    if (!cookieValue) return;
    document.cookie = GOOGLE_TRANSLATE_COOKIE_NAME + '=' + encodeURIComponent(cookieValue)
        + '; path=/; max-age=' + GOOGLE_TRANSLATE_COOKIE_MAX_AGE_SECONDS + '; SameSite=Lax';
}

function clearGoogleTranslateCookies() {
    var domains = { '': true };
    var hostname = String(window.location.hostname || '').trim();
    if (hostname) {
        domains[hostname] = true;
        domains['.' + hostname] = true;
        var parts = hostname.split('.');
        while (parts.length > 2) {
            parts.shift();
            domains[parts.join('.')] = true;
            domains['.' + parts.join('.')] = true;
        }
    }

    var paths = { '/': true };
    var pathname = String(window.location.pathname || '').trim();
    if (pathname) {
        paths[pathname] = true;
    }

    Object.keys(domains).forEach(function(domain) {
        Object.keys(paths).forEach(function(path) {
            document.cookie = GOOGLE_TRANSLATE_COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; path=' + path
                + (domain ? '; domain=' + domain : '') + '; SameSite=Lax';
        });
    });
}

function hasGoogleTranslateCookie() {
    return !!getGoogleTranslateCookieValue();
}

function requestLanguageRuntimeReload(reason) {
    var guardReason = String(reason || 'language-sync').trim() || 'language-sync';
    try {
        if (sessionStorage.getItem(GOOGLE_TRANSLATE_SYNC_GUARD_KEY) === guardReason) {
            return false;
        }
        sessionStorage.setItem(GOOGLE_TRANSLATE_SYNC_GUARD_KEY, guardReason);
    } catch (error) {}
    window.location.reload();
    return true;
}

function clearLanguageRuntimeReloadGuard() {
    try {
        sessionStorage.removeItem(GOOGLE_TRANSLATE_SYNC_GUARD_KEY);
    } catch (error) {}
}

function getGoogleTranslateIncludedLanguages() {
    var codes = [];
    AUTO_TRANSLATE_LANGUAGE_OPTIONS.forEach(function(optionConfig) {
        if (!codes.includes(optionConfig.googleCode)) {
            codes.push(optionConfig.googleCode);
        }
    });
    return codes.join(',');
}

function sendLanguagePreferenceToServer(targetLanguage) {
    var safeLanguage = normalizeNativeLanguageCode(targetLanguage) || 'en';
    const request = `${API_BASE}/users/${userId}/language`;
    return fetch(request, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: safeLanguage })
    }).catch(() => {});
}

function ensureLanguageRuntimeConsistency() {
    var selectedLanguage = getSelectedAppLanguage();
    var currentCookieValue = getGoogleTranslateCookieValue();
    var expectedCookieValue = isAutoTranslatedLanguage(selectedLanguage)
        ? getExpectedGoogleTranslateCookieValue(selectedLanguage)
        : '';

    if (expectedCookieValue) {
        if (currentCookieValue !== expectedCookieValue) {
            setGoogleTranslateCookie(selectedLanguage);
            return requestLanguageRuntimeReload('set:' + expectedCookieValue);
        }
        clearLanguageRuntimeReloadGuard();
        return false;
    }

    if (currentCookieValue) {
        clearGoogleTranslateCookies();
        return requestLanguageRuntimeReload('clear');
    }

    clearLanguageRuntimeReloadGuard();
    return false;
}

window.googleTranslateElementInit = function () {
    var container = document.getElementById('google_translate_element');
    if (!container || !window.google || !window.google.translate || !window.google.translate.TranslateElement) {
        return;
    }
    if (window.App.googleTranslateInitialized) {
        return;
    }
    new window.google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: getGoogleTranslateIncludedLanguages(),
        autoDisplay: false,
        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
    window.App.googleTranslateInitialized = true;
};

var myTests = [];
var incomingOffers = [];
var myProjects = [];
var mutualSeeking = [];
var mutualPrelaunch = [];
var mutualReturns = [];
var guestProjects = [];
var bountyContracts = [];
var communityEvents = null;
var eventsExpanded = false;
var activeTimerAppId = null;
var _timerEndTimestamp = null;
var _timerIntervalId = null;
var _timerIsScreenshot = false;
var _timerOwnerUsername = '';
var _timerLocalDate = '';
var _timerStorageKey = 'devtest_active_timer';
var _timerReadyStateKey = 'devtest_timer_ready_state_v1';
var _timerReadyState = {};
var _firstDayScreenshotStateKey = 'devtest_firstday_screenshot_state_v1';
var _firstDayScreenshotState = {};
var pendingProjectData = null;
var projectToEdit = null;
var visibilityStats = {};
var _activeRequests = 0;
var _karmaAppId = null;
var _karmaTesterId = null;
var _karmaDistributionProjectId = null;
var _offersTimerId = null;

var _reportAppId = null;
var _reportOwnerUsername = null;
var _issueReportAppId = null;
var _userEmail = '';
var _pendingScreenshotReminderUsername = null;
var _dropTestAppId = null;
var _leaveMutualAppId = null;
var _leaveMutualStats = null;
var _kickTarget = null;
var _overtimeTest = null;
var _syncProjectId = null;
var _socialBonusStatus = 'none';
var _earnGrantCount = 0;
var _earnGrantBust = 0;
var _earnReferralBust = 0;
var _earnGuestInviteCount = 0;
var _earnGuestInviteBust = 0;
var _earnExchangeBust = 0;
var _earnEarlyFinishCount = 0;
var _earnEarlyFinishBust = 0;
var _earnFeedbackCount = 0;
var _earnFeedbackBust = 0;
var _earnPlayReviewCount = 0;
var _earnPlayReviewKarma = 0;
var _feedbackType = 'bug';
var _inviteProjectId = null;
var archivedProjects = [];
var projectToDelete = null;
var _activeProjectFeedbackAppId = null;
var _activeProjectFeedbackItems = [];
var _activeProjectFeedbackArchived = false;
var _feedbackRewardTargetId = null;
var _feedbackRewardBust = 0;
var _feedbackRewardKarma = 0;
var myProjectsLoadError = false;
var marketCache = null;
var MARKET_CACHE_KEY = 'market_cache_v1';
var GUEST_PROJECTS_CACHE_KEY = 'guest_projects_cache_v1';
var _lastFetchTimes = { mutual: 0, bounty: 0, tests: 0, projects: 0, offers: 0, archived: 0, reliabilitySummary: 0, reliabilityBreakdown: 0 };
var MARKET_FETCH_THROTTLE_MS = 15000;
var TESTS_FETCH_THROTTLE_MS = 20000;
var PROJECTS_FETCH_THROTTLE_MS = 30000;
var OFFERS_FETCH_THROTTLE_MS = 15000;
var ARCHIVED_FETCH_THROTTLE_MS = 45000;
var RELIABILITY_FETCH_THROTTLE_MS = 30000;
var SYNC_CONFIRMATION_DELAY_MS = 450;
var _marketInFlight = { mutual: null, bounty: null };
window._marketInFlight = _marketInFlight;
var OFFERS_CACHE_KEY = 'incoming_offers_cache_v1';
var _offersInFlight = null;
var _offersLoadError = false;
var _offersLoadedOnce = false;
var _offersPollId = null;
var _blockedOfferProjectsByOwner = {};

var TESTS_CACHE_KEY = 'tests_cache_v1';
var myTestsCache = null;
var _testsInFlight = null;
var _testsLoadedOnce = false;

var PROJECTS_CACHE_KEY = 'projects_cache_v1';
var myProjectsCache = null;
var _projectsInFlight = null;
var _projectsLoadedOnce = false;
var RELIABILITY_SUMMARY_CACHE_KEY = 'reliability_summary_cache_v1';
var RELIABILITY_BREAKDOWN_CACHE_KEY = 'reliability_breakdown_cache_v1';
var reliabilitySummaryCache = null;
var reliabilityBreakdownCache = null;
var reliabilitySummary = null;
var reliabilityBreakdown = null;
var _reliabilitySummaryInFlight = null;
var _reliabilityBreakdownInFlight = null;
var _reliabilitySummaryLoadedOnce = false;
var _reliabilityBreakdownLoadedOnce = false;
var _reliabilitySummaryLoadError = false;
var _reliabilityBreakdownLoadError = false;

var _pendingActions = new Set();
var _autoAcceptMutualEnabled = false;
var _autoAcceptToggleInFlight = false;
var _pendingInitialHighlightTestId = null;
var _highlightTestTimerId = null;
var _backgroundSyncState = { tests: 0, projects: 0, market: 0 };
var _deferredBootstrapStarted = false;
var _initialRouteHandled = false;
var _marketPollId = null;
var MARKET_POLL_INTERVAL_MS = 5 * 60 * 1000;
var _marketFeedState = {
    mutual: { confirmedEmpty: false, emptyStreak: 0 },
    bounty: { confirmedEmpty: false, emptyStreak: 0 }
};
var _marketRetryTimers = { mutual: null, bounty: null };
var _marketForceSkeleton = false;
var _guestProjectsInFlight = null;
var _guestProjectsLoadedOnce = false;
var _guestProjectsExpanded = false;
var _guestProjectsLoadError = false;
var _guestProjectsVisibleCount = GUEST_PROJECTS_PAGE_SIZE;
var _guestProjectsFilters = { lang: 'ALL', category: 'ALL' };
var _guestProjectsAvailableLangs = [];
var _guestProjectTargetHighlightTimer = null;
var _postSyncToastSuppressionUntil = 0;
var POST_SYNC_TOAST_SUPPRESSION_MS = 8000;

function _startPostSyncToastSuppression(durationMs) {
    var safeDuration = Math.max(0, Number(durationMs || POST_SYNC_TOAST_SUPPRESSION_MS) || POST_SYNC_TOAST_SUPPRESSION_MS);
    _postSyncToastSuppressionUntil = Date.now() + safeDuration;
}

function _isPostSyncToastSuppressed() {
    return Date.now() < Number(_postSyncToastSuppressionUntil || 0);
}

function _showNonCriticalLoaderToast(message, sourceLabel) {
    if (_isPostSyncToastSuppressed()) {
        console.error('Suppressed loader toast during post-sync refresh [' + String(sourceLabel || 'unknown') + ']:', message);
        return false;
    }
    showToast(message);
    return true;
}

function _runBestEffortUiStep(stepLabel, handler) {
    try {
        return typeof handler === 'function' ? handler() : null;
    } catch (error) {
        console.error(String(stepLabel || 'UI step') + ' failed:', error);
        return null;
    }
}

function setMarketForceSkeleton(enabled) {
    _marketForceSkeleton = !!enabled;
    window._marketForceSkeleton = _marketForceSkeleton;
}

window._marketForceSkeleton = _marketForceSkeleton;

function _getStartappParam() {
    var params = new URLSearchParams(window.location.search || '');
    // Prefer explicit URL startapp over Telegram initData.start_param to avoid stale routing.
    return String(params.get('startapp') || initData.start_param || '').trim();
}

function _parseGuestClaimIntent() {
    var rawStartParam = _getStartappParam();
    if (!rawStartParam) return null;

    var match = rawStartParam.match(GUEST_CLAIM_START_PARAM_RE);
    if (!match) return null;

    return {
        rawStartParam: rawStartParam,
        guestAppId: String(match[1] || '').trim(),
        inviterId: Number(match[2] || 0),
    };
}

function _getLeadInviteInviterId() {
    var rawStartParam = _getStartappParam();
    if (!rawStartParam) return 0;
    var match = rawStartParam.match(LEAD_INVITE_START_PARAM_RE);
    if (!match) return 0;
    return Number(match[1] || 0);
}

function _getGuestClaimHandledKey(rawStartParam) {
    return GUEST_CLAIM_SESSION_PREFIX + String(rawStartParam || '');
}

function _isGuestClaimHandled(rawStartParam) {
    try {
        return sessionStorage.getItem(_getGuestClaimHandledKey(rawStartParam)) === '1';
    } catch (error) {
        return false;
    }
}

function _markGuestClaimHandled(rawStartParam) {
    try {
        sessionStorage.setItem(_getGuestClaimHandledKey(rawStartParam), '1');
    } catch (error) {}
}

function _clearStartappQueryParam() {
    try {
        var url = new URL(window.location.href);
        if (!url.searchParams.has('startapp')) return;
        url.searchParams.delete('startapp');

        var nextUrl = url.pathname;
        if (url.searchParams.toString()) {
            nextUrl += '?' + url.searchParams.toString();
        }
        if (url.hash) {
            nextUrl += url.hash;
        }
        window.history.replaceState({}, document.title, nextUrl);
    } catch (error) {}
}

function _parseInitialRouteTarget() {
    var params = new URLSearchParams(window.location.search || '');
    var startParam = _getStartappParam();
    var feedbackProjectId = Number(
        params.get('feedback_project_id') ||
        params.get('project_feedback_id') ||
        params.get('project_id') ||
        params.get('app_id') ||
        0
    );
    var routeKind = '';
    var candidateValues = [
        startParam,
        params.get('route') || '',
        params.get('feedback') || '',
        params.get('tab') || '',
    ];

    for (var index = 0; index < candidateValues.length; index++) {
        var raw = String(candidateValues[index] || '').trim();
        if (!raw) continue;
        var normalized = raw.toLowerCase();
        var feedbackMatch = normalized.match(/(?:project_feedback|feedback|owner_feedback|feedback_project)[_:=.-]?(\d+)?/);
        if (feedbackMatch) {
            routeKind = 'feedback';
            if (!feedbackProjectId && feedbackMatch[1]) {
                feedbackProjectId = Number(feedbackMatch[1] || 0);
            }
            break;
        }
        var editMatch = normalized.match(/^edit[_:](\d+)$/);
        if (editMatch) {
            routeKind = 'edit';
            feedbackProjectId = Number(editMatch[1] || 0);
            break;
        }
        var projectMatch = normalized.match(/^project[_:](\d+)$/);
        if (projectMatch) {
            routeKind = 'project';
            feedbackProjectId = Number(projectMatch[1] || 0);
            break;
        }
        var testsHighlightMatch = normalized.match(/^(?:my_tests_highlight|test)[_:](\d+)$/);
        if (testsHighlightMatch) {
            routeKind = 'tests_highlight';
            feedbackProjectId = Number(testsHighlightMatch[1] || 0);
            break;
        }
        var appFocusMatch = normalized.match(/^app_focus[_:](\d+)$/);
        if (appFocusMatch) {
            routeKind = 'app_focus';
            feedbackProjectId = Number(appFocusMatch[1] || 0);
            break;
        }
        var syncMatch = normalized.match(/^sync[_:](\d+)$/);
        if (syncMatch) {
            routeKind = 'sync';
            feedbackProjectId = Number(syncMatch[1] || 0);
            break;
        }
        if (normalized === 'projects') {
            routeKind = 'projects';
        }
        if (normalized === 'tests') {
            routeKind = 'tests';
        }
        if (normalized === 'market') {
            routeKind = 'market';
        }
        if (normalized === 'add_app' || normalized === 'add-app' || normalized === 'new_project' || normalized === 'new-project') {
            routeKind = 'add_app';
        }
        if (normalized === 'guest_projects' || normalized === 'guestprojects') {
            routeKind = 'guest_projects';
        }
    }

    if (routeKind === 'feedback' || params.get('feedback') === '1') {
        return {
            tab: 'projects',
            openFeedback: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'projects') {
        return {
            tab: 'projects',
            openFeedback: false,
            appId: null,
        };
    }
    if (routeKind === 'tests') {
        return {
            tab: 'tests',
            openFeedback: false,
            appId: null,
        };
    }
    if (routeKind === 'tests_highlight') {
        return {
            tab: 'tests',
            openFeedback: false,
            appId: null,
            highlightTestId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'app_focus') {
        return {
            tab: 'tests',
            openFeedback: false,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
            openAppFocus: feedbackProjectId > 0,
        };
    }
    if (routeKind === 'market') {
        return {
            tab: 'market',
            openFeedback: false,
            appId: null,
        };
    }
    if (routeKind === 'add_app') {
        return {
            tab: 'projects',
            openAdd: true,
            openFeedback: false,
            appId: null,
        };
    }
    if (routeKind === 'guest_projects') {
        return {
            tab: 'market',
            openFeedback: false,
            openGuestProjects: true,
            appId: null,
        };
    }
    if (routeKind === 'sync') {
        return {
            tab: 'projects',
            openSync: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'edit') {
        return {
            tab: 'projects',
            openEdit: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'project') {
        return {
            tab: 'market',
            openProject: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    return null;
}

async function _handleInitialRoute() {
    if (_initialRouteHandled) return;
    _initialRouteHandled = true;

    var route = _parseInitialRouteTarget();
    if (!route) return;

    if (route.openAppFocus && route.appId) {
        try {
            await _focusAppInMiniApp(route.appId);
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial app focus route error:', error);
        }
        return;
    }

    if (route.tab === 'projects') {
        switchTab('projects');
    }
    if (route.tab === 'tests') {
        switchTab('tests');
    }
        if (route.highlightTestId) {
            try {
                _pendingInitialHighlightTestId = Number(route.highlightTestId || 0) || null;
                await loadTasks(true);
                _highlightTestCardWhenReady(_pendingInitialHighlightTestId);
                _clearStartappQueryParam();
            } catch (error) {
                console.error('Initial tests highlight route error:', error);
            }
            return;
        }

    if (route.tab === 'market') {
        switchTab('market');
    }

    // ── Sync route: open sync modal ──
    if (route.openSync && route.appId) {
        try {
            await loadProjects(true);
            if (typeof window.openSyncModal === 'function') {
                window.openSyncModal(route.appId);
            }
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial sync route error:', error);
        }
        return;
    }

    // ── Edit route: open project edit modal ──
    if (route.openEdit && route.appId) {
        try {
            await loadProjects(true);
            openEditModal(route.appId);
        } catch (error) {
            console.error('Initial edit route error:', error);
        }
        return;
    }

    // ── Project route: open market and scroll to project card ──
    if (route.openProject && route.appId) {
        try {
            if (typeof window.loadMarketData === 'function') {
                await window.loadMarketData(true);
            }
            setTimeout(function() {
                var card = document.querySelector('[data-app-id="' + route.appId + '"]');
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('highlight-pulse');
                    setTimeout(function() { card.classList.remove('highlight-pulse'); }, 2000);
                }
            }, 500);
        } catch (error) {
            console.error('Initial project route error:', error);
        }
        return;
    }

    if (route.openGuestProjects) {
        try {
            if (typeof window.loadMarketData === 'function') {
                await window.loadMarketData(true);
            }
            await toggleGuestProjectsAccordion(true);
        } catch (error) {
            console.error('Initial guest projects route error:', error);
        }
        return;
    }

    if (route.openAdd) {
        try {
            openModal();
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial add project route error:', error);
        }
        return;
    }

    if (!route.openFeedback || !route.appId) {
        return;
    }

    try {
        await Promise.allSettled([
            loadProjects(true),
            loadArchivedProjects({ silent: true })
        ]);

        var isArchived = !(myProjects || []).some(function(project) {
            return Number(project.id) === Number(route.appId);
        }) && (archivedProjects || []).some(function(project) {
            return Number(project.app_id) === Number(route.appId);
        });

        await openProjectFeedback(route.appId, isArchived);
    } catch (error) {
        console.error('Initial feedback route error:', error);
    }
}

function _highlightProjectCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('project-card-' + normalizedId) || document.querySelector('[data-project-id="' + normalizedId + '"]');
    if (!card) return false;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-pulse');
    void card.offsetWidth;
    card.classList.add('highlight-pulse');
    setTimeout(function() {
        card.classList.remove('highlight-pulse');
    }, 2200);
    return true;
}

function _highlightArchivedProjectCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('archive-card-' + normalizedId) || document.querySelector('[data-archive-project-id="' + normalizedId + '"]');
    if (!card) return false;

    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('highlight-pulse');
    void card.offsetWidth;
    card.classList.add('highlight-pulse');
    setTimeout(function() {
        card.classList.remove('highlight-pulse');
    }, 2200);
    return true;
}

function openProjectDuplicateSupport() {
    var addModal = document.getElementById('add-modal');
    if (addModal) {
        addModal.classList.remove('active');
    }
    sendFeedback('question');
}

async function _focusAppInMiniApp(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;

    switchTab('tests');
    await loadTasks(true);
    _highlightTestCardWhenReady(normalizedId, 10);

    await new Promise(function(resolve) { setTimeout(resolve, 520); });
    if (_highlightTestCard(normalizedId)) {
        return true;
    }

    switchTab('projects');
    await Promise.allSettled([
        loadProjects(true),
        loadArchivedProjects({ silent: true })
    ]);

    await new Promise(function(resolve) { setTimeout(resolve, 260); });
    if (_highlightProjectCard(normalizedId)) {
        return true;
    }

    var hasArchivedProject = (archivedProjects || []).some(function(item) {
        return Number(item && item.app_id) === normalizedId;
    });
    if (hasArchivedProject) {
        var archiveList = document.getElementById('archive-list');
        if (archiveList && archiveList.classList.contains('is-collapsed') && typeof window.toggleArchive === 'function') {
            window.toggleArchive();
        }
        await new Promise(function(resolve) { setTimeout(resolve, 160); });
        if (_highlightArchivedProjectCard(normalizedId)) {
            return true;
        }
    }

    switchTab('market');
    if (typeof window.loadMarketData === 'function') {
        await window.loadMarketData(true);
    }
    await new Promise(function(resolve) { setTimeout(resolve, 320); });
    var marketCard = document.querySelector('[data-app-id="' + normalizedId + '"]');
    if (marketCard) {
        marketCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        marketCard.classList.add('highlight-pulse');
        setTimeout(function() { marketCard.classList.remove('highlight-pulse'); }, 2200);
        return true;
    }
    return false;
}

async function _handleGuestClaimIntent(intent) {
    if (!intent || !intent.guestAppId || intent.inviterId <= 0) {
        return false;
    }

    if (_isGuestClaimHandled(intent.rawStartParam)) {
        _clearStartappQueryParam();
        return true;
    }

    if (window.ui && typeof window.ui.showLoading === 'function') {
        window.ui.showLoading(window.t('guestClaimLoading', {}, lang));
    }

    var hideLoading = function() {
        if (window.ui && typeof window.ui.hideLoading === 'function') {
            window.ui.hideLoading();
        }
    };

    try {
        var response = await fetchWithRetry(`${API_BASE}/guest-apps/${encodeURIComponent(intent.guestAppId)}/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inviter_id: intent.inviterId,
                init_data: tg.initData || '',
            }),
            timeoutMs: 25000,
        }, 2);

        var payload = null;
        try {
            payload = await response.json();
        } catch (error) {
            payload = null;
        }

        var detail = String(payload && (payload.detail || payload.code) || '').trim();
        var isSuccessPayload = !!(payload && payload.status === 'success');

        if (!response.ok || !isSuccessPayload) {
            if (detail === 'own_link') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                showToast(window.t('guestClaimOwnLinkToast', {}, lang));
                return true;
            }
            if (detail === 'already_claimed') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                showToast(window.t('guestClaimAlreadyClaimedToast', {}, lang));
                return true;
            }
            if (detail === 'not_owner') {
                _markGuestClaimHandled(intent.rawStartParam);
                _clearStartappQueryParam();
                hideLoading();
                if (typeof window.showGuestClaimStatusModal === 'function') {
                    window.showGuestClaimStatusModal({ variant: 'not-owner' });
                } else {
                    showToast(window.t('guestClaimNotOwnerTitle', {}, lang));
                }
                return true;
            }
            if (detail === 'invalid_init_data') {
                hideLoading();
                showToast(window.t('guestClaimAuthErrorToast', {}, lang));
                return true;
            }

            hideLoading();
            if (detail) {
                handleApiError(detail, payload && payload.details ? payload.details : {});
            } else {
                showToast(getApiErrorMessage(payload, 'networkError'));
            }
            return true;
        }

        _markGuestClaimHandled(intent.rawStartParam);
        _clearStartappQueryParam();

        await Promise.allSettled([
            loadTasks(true),
            loadProjects(true),
            loadIncomingOffers({ background: true }),
            loadArchivedProjects({ silent: true })
        ]);

        hideLoading();
        switchTab('tests');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (typeof window.showGuestClaimStatusModal === 'function') {
            window.showGuestClaimStatusModal({
                variant: 'success',
                appId: Number(payload && payload.new_app_id || 0),
            });
        }
        return true;
    } catch (error) {
        console.error('Guest claim intent error:', error);
        hideLoading();
        var message = String(error && error.message || '').trim();
        if (/^HTTP (500|502|503|504|520|522|524)$/.test(message)) {
            handleApiError('database_error');
        } else if (/^HTTP \d+$/.test(message) || message === 'Request timeout') {
            showToast(window.t('networkError', {}, lang));
        } else {
            showToast(getApiErrorMessage(message, 'networkError'));
        }
        return false;
    } finally {
        hideLoading();
    }
}

function hasThrottleWindowPassed(feedKey) {
    return (Date.now() - (_lastFetchTimes[feedKey] || 0)) >= MARKET_FETCH_THROTTLE_MS;
}

function markMarketFetchSuccess(feedKey) {
    _lastFetchTimes[feedKey] = Date.now();
}

function resetMarketFetchThrottle() {
    _lastFetchTimes.mutual = 0;
    _lastFetchTimes.bounty = 0;
}

function isTabCurrentlyActive(tabName) {
    var tab = document.getElementById('tab-' + tabName);
    return !!(tab && tab.classList.contains('active'));
}

function runWhenIdle(task, timeoutMs) {
    if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(function() {
            task();
        }, { timeout: timeoutMs || 1000 });
        return;
    }
    setTimeout(task, Math.min(timeoutMs || 1000, 250));
}

function updateBackgroundSyncUi() {
    var hasAnySync = Object.keys(_backgroundSyncState).some(function(key) {
        return (_backgroundSyncState[key] || 0) > 0;
    });
    var bar = document.getElementById('background-sync-bar');
    if (bar) {
        bar.classList.toggle('hidden', !hasAnySync);
    }

    var testsDot = document.getElementById('nav-sync-tests');
    var projectsDot = document.getElementById('nav-sync-projects');
    var marketDot = document.getElementById('nav-sync-market');
    if (testsDot) testsDot.classList.toggle('hidden', (_backgroundSyncState.tests || 0) === 0);
    if (projectsDot) projectsDot.classList.toggle('hidden', (_backgroundSyncState.projects || 0) === 0);
    if (marketDot) marketDot.classList.toggle('hidden', (_backgroundSyncState.market || 0) === 0);
}

function beginBackgroundSync(scope) {
    _backgroundSyncState[scope] = (_backgroundSyncState[scope] || 0) + 1;
    updateBackgroundSyncUi();
}

function endBackgroundSync(scope) {
    _backgroundSyncState[scope] = Math.max(0, (_backgroundSyncState[scope] || 0) - 1);
    updateBackgroundSyncUi();
}

function scheduleDeferredBootstrap() {
    if (_deferredBootstrapStarted) return;
    _deferredBootstrapStarted = true;

    setTimeout(function() {
        runWhenIdle(function() {
            if (!isTabCurrentlyActive('projects')) {
                loadProjects(true).catch(function() {});
                loadArchivedProjects({ background: true, silent: true }).catch(function() {});
            }
        }, 1200);
    }, 250);

    setTimeout(function() {
        runWhenIdle(function() {
            if (!isTabCurrentlyActive('market')) {
                loadMutualFeed().catch(function() {});
                loadBountyFeed().catch(function() {});
            }
        }, 1600);
    }, 700);
}

function getMarketCache() {
    if (marketCache) return marketCache;
    try {
        const raw = localStorage.getItem(MARKET_CACHE_KEY);
        if (!raw) return null;
        marketCache = JSON.parse(raw);
        return marketCache;
    } catch (e) {
        marketCache = null;
        return null;
    }
}

function hydrateMarketFromCache() {
    const cached = getMarketCache();
    if (!cached) return false;

    if (cached.mutual) {
        mutualSeeking = Array.isArray(cached.mutual.seeking) ? cached.mutual.seeking : [];
        mutualPrelaunch = Array.isArray(cached.mutual.prelaunch) ? cached.mutual.prelaunch : [];
        mutualReturns = Array.isArray(cached.mutual.returns) ? cached.mutual.returns : [];
    }
    if (cached.bounty) {
        bountyContracts = Array.isArray(cached.bounty.contracts) ? cached.bounty.contracts : [];
    }
    return true;
}

function getMarketFeedState(feedKey) {
    return _marketFeedState[feedKey] || { confirmedEmpty: false, emptyStreak: 0 };
}

function normalizeGuestProjectsFilterLang(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'ALL';
    if (raw.toUpperCase() === 'ALL') return 'ALL';
    const normalized = raw.toLowerCase();
    return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized) ? normalized : 'ALL';
}

function normalizeGuestProjectAvailableLangs(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).reduce(function(result, value) {
        const normalized = normalizeGuestProjectsFilterLang(value);
        if (normalized === 'ALL' || seen.has(normalized)) {
            return result;
        }
        seen.add(normalized);
        result.push(normalized);
        return result;
    }, []).sort();
}

function getGuestProjectAvailableLangs() {
    return Array.isArray(_guestProjectsAvailableLangs) ? _guestProjectsAvailableLangs.slice() : [];
}

function setGuestProjectAvailableLangs(values) {
    _guestProjectsAvailableLangs = normalizeGuestProjectAvailableLangs(values);
}

function _guestProjectFiltersMatch(cachedFilters, liveFilters) {
    return normalizeGuestProjectsFilterLang(cachedFilters && cachedFilters.lang) === normalizeGuestProjectsFilterLang(liveFilters && liveFilters.lang)
        && String((cachedFilters && cachedFilters.category) || 'ALL').toUpperCase() === String((liveFilters && liveFilters.category) || 'ALL').toUpperCase();
}

function _applyGuestProjectsPayload(payload) {
    guestProjects = Array.isArray(payload && payload.items) ? payload.items : [];
    setGuestProjectAvailableLangs(payload && payload.available_langs);

    const selectedLang = normalizeGuestProjectsFilterLang(_guestProjectsFilters.lang);
    return selectedLang === 'ALL' || _guestProjectsAvailableLangs.includes(selectedLang);
}

function getGuestProjectsCache() {
    try {
        const raw = localStorage.getItem(GUEST_PROJECTS_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function setGuestProjectsCache(payload) {
    try {
        localStorage.setItem(GUEST_PROJECTS_CACHE_KEY, JSON.stringify(payload || {}));
    } catch (error) {
        console.warn('Failed to cache guest projects:', error);
    }
}

function _buildGuestProjectsUrl() {
    const params = new URLSearchParams();
    params.set('lang', normalizeGuestProjectsFilterLang(_guestProjectsFilters.lang));
    params.set('category', String(_guestProjectsFilters.category || 'ALL').toUpperCase());
    return `${API_BASE}/guest-apps?${params.toString()}`;
}

function getGuestProjectsPageSize() {
    return GUEST_PROJECTS_PAGE_SIZE;
}

function resetGuestProjectsPagination() {
    _guestProjectsVisibleCount = GUEST_PROJECTS_PAGE_SIZE;
}

function isGuestProjectAlreadyTracked(guest) {
    if (!guest) {
        return false;
    }

    var guestId = String(guest.id || '').trim();
    var guestPackageName = String(guest.package_name || guest.name || '').trim().toLowerCase();

    return Array.isArray(myTests) && myTests.some(function(test) {
        if (!test || !test.is_external) {
            return false;
        }

        var trackedGuestId = String(test.external_guest_app_id || '').trim();
        var trackedPackageName = String(test.external_package_name || test.package || '').trim().toLowerCase();
        if (guestId && trackedGuestId && guestId === trackedGuestId) {
            return true;
        }
        return !!guestPackageName && trackedPackageName === guestPackageName;
    });
}

function getFilteredGuestProjects() {
    if (!Array.isArray(guestProjects) || !guestProjects.length) {
        return [];
    }
    return guestProjects.filter(function(guest) {
        return !isGuestProjectAlreadyTracked(guest);
    });
}

function getVisibleGuestProjects() {
    var filteredGuestProjects = getFilteredGuestProjects();
    if (!filteredGuestProjects.length) {
        return [];
    }
    return filteredGuestProjects.slice(0, Math.max(GUEST_PROJECTS_PAGE_SIZE, Number(_guestProjectsVisibleCount || GUEST_PROJECTS_PAGE_SIZE)));
}

function canShowMoreGuestProjects() {
    return getFilteredGuestProjects().length > getVisibleGuestProjects().length;
}

function showMoreGuestProjects() {
    var filteredGuestProjects = getFilteredGuestProjects();
    if (!filteredGuestProjects.length || filteredGuestProjects.length <= _guestProjectsVisibleCount) {
        return;
    }
    _guestProjectsVisibleCount = Math.min(filteredGuestProjects.length, Number(_guestProjectsVisibleCount || GUEST_PROJECTS_PAGE_SIZE) + GUEST_PROJECTS_PAGE_SIZE);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
}

function normalizeGuestInviteLanguage(inviteLang, fallbackLang) {
    const fallback = String(fallbackLang || lang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en';
    const normalized = String(inviteLang || '').trim().toLowerCase();
    return normalized === 'ru' || normalized === 'en' ? normalized : fallback;
}

function getDefaultGuestInviteLanguage(guestLang) {
    const normalizedGuestLang = String(guestLang || '').trim().toUpperCase();
    if (normalizedGuestLang === 'RU' || normalizedGuestLang === 'EN') {
        return normalizedGuestLang.toLowerCase();
    }
    return normalizeGuestInviteLanguage(lang);
}

function buildGuestInviteDeepLink(guestAppId, inviterId, inviteLang, startappValue) {
    const normalizedLang = normalizeGuestInviteLanguage(inviteLang);
    const params = new URLSearchParams();
    params.set('startapp', String(startappValue || `guest_${guestAppId}_${inviterId}`));
    params.set('lang', normalizedLang);
    return `https://t.me/${BOT_USERNAME}/${WEBAPP_SHORTNAME}?${params.toString()}`;
}

function buildExternalClaimStartLink(packageName) {
    var normalizedPackage = String(packageName || '').trim();
    var botUsername = String((window.App && window.App.botUsername) || BOT_USERNAME || 'Android12TestersBot').trim().replace(/^@+/, '');
    return `https://t.me/${botUsername}?start=claim_app_${encodeURIComponent(normalizedPackage)}`;
}

async function startExternalTrackingSession(payload) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    return result;
}

async function submitExternalTrackingProof(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId, local_date: getLocalDate() })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    var test = myTests.find(function(item) { return Number(item.id) === Number(testId); });
    if (test) {
        test.last_check_date = result.last_check_date || getLocalDate();
        test.checkins_count = Number(result.checkins_count || test.checkins_count || 0);
        test.daily_timeline = String(result.daily_timeline || test.daily_timeline || '');
        test.testing_days = Math.max(Number(test.testing_days || 0), Number(result.testing_day || 0));
        recomputeLocalTestState(test);
        persistTestsCacheSnapshot();
        renderTests(true);
    }

    return result;
}

async function submitExternalDailyCheckin(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId, local_date: getLocalDate() })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    var test = myTests.find(function(item) { return Number(item.id) === Number(testId); });
    if (test) {
        test.last_check_date = result.last_check_date || getLocalDate();
        test.testing_days = Math.max(Number(test.testing_days || 0), Number(result.testing_day || 0));
        recomputeLocalTestState(test);
        persistTestsCacheSnapshot();
        renderTests(true);
    }

    return result;
}

async function cancelExternalTracking(progressId, testId) {
    const response = await fetchWithRetry(`${API_BASE}/external-tests/${progressId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tester_id: userId })
    }, 1);
    const result = await response.json();
    if (!response.ok || !result || result.status !== 'success') {
        handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        return null;
    }

    myTests = (Array.isArray(myTests) ? myTests : []).filter(function(item) {
        return Number(item.id) !== Number(testId);
    });
    persistTestsCacheSnapshot();

    const refreshPromises = [];
    if (typeof loadTasks === 'function') {
        refreshPromises.push(loadTasks(true));
    }
    if (typeof loadProjects === 'function') {
        refreshPromises.push(loadProjects(true));
    }
    if (typeof loadGuestApps === 'function') {
        refreshPromises.push(loadGuestApps({ force: true }));
    }
    if (refreshPromises.length) {
        await Promise.allSettled(refreshPromises);
    }
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (window.renderTests) {
        window.renderTests(true);
    }

    return result;
}

function _syncGuestProjectsCache() {
    setGuestProjectsCache({
        filters: Object.assign({}, _guestProjectsFilters),
        items: Array.isArray(guestProjects) ? guestProjects : [],
        available_langs: getGuestProjectAvailableLangs(),
        ts: Date.now(),
    });
}

async function loadGuestApps(options) {
    options = options || {};
    if (_guestProjectsInFlight) {
        return _guestProjectsInFlight;
    }

    const cached = getGuestProjectsCache();
    const filtersMatch = !!(cached && cached.filters && _guestProjectFiltersMatch(cached.filters, _guestProjectsFilters));

    if (!options.force && filtersMatch && Array.isArray(cached.items)) {
        guestProjects = cached.items;
        setGuestProjectAvailableLangs(cached.available_langs);
        resetGuestProjectsPagination();
        _guestProjectsLoadedOnce = true;
        _guestProjectsLoadError = false;
        if (window.renderGuestProjectsSection) {
            window.renderGuestProjectsSection(true);
        }
    }

    const requestPromise = (async function() {
        try {
            const response = await fetchWithRetry(_buildGuestProjectsUrl());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            let data = await response.json();
            let filterStillValid = _applyGuestProjectsPayload(data);
            if (!filterStillValid) {
                _guestProjectsFilters.lang = 'ALL';
                const fallbackResponse = await fetchWithRetry(_buildGuestProjectsUrl());
                if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
                data = await fallbackResponse.json();
                _applyGuestProjectsPayload(data);
            }
            resetGuestProjectsPagination();
            _guestProjectsLoadedOnce = true;
            _guestProjectsLoadError = false;
            _syncGuestProjectsCache();
        } catch (error) {
            console.error('Error loading guest apps:', error);
            _guestProjectsLoadError = true;
            if (!_guestProjectsLoadedOnce) {
                const hasCachedItems = !!(filtersMatch && Array.isArray((cached || {}).items));
                guestProjects = hasCachedItems ? cached.items : [];
                setGuestProjectAvailableLangs(hasCachedItems ? cached.available_langs : []);
                _guestProjectsLoadedOnce = hasCachedItems;
            }
            if (_guestProjectsExpanded && !guestProjects.length) {
                showToast(getApiErrorMessage(error && error.message, 'networkError'));
            }
        } finally {
            if (window.renderGuestProjectsSection) {
                window.renderGuestProjectsSection(true);
            }
        }
    })();

    _guestProjectsInFlight = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_guestProjectsInFlight === requestPromise) {
            _guestProjectsInFlight = null;
        }
    }
}

async function toggleGuestProjectsAccordion(forceExpanded) {
    const nextExpanded = typeof forceExpanded === 'boolean'
        ? forceExpanded
        : !_guestProjectsExpanded;
    _guestProjectsExpanded = !!nextExpanded;
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (_guestProjectsExpanded) {
        await loadGuestApps({ force: !_guestProjectsLoadedOnce });
    }
}

function _clearGuestProjectTargetHighlights() {
    if (_guestProjectTargetHighlightTimer) {
        clearTimeout(_guestProjectTargetHighlightTimer);
        _guestProjectTargetHighlightTimer = null;
    }
    document.querySelectorAll('#guest-projects-list .guest-project-cta-btn.highlight-target').forEach(function(button) {
        button.classList.remove('highlight-target');
    });
}

function _applyGuestProjectTargetHighlights() {
    const section = document.getElementById('guest-projects-section');
    const list = document.getElementById('guest-projects-list');
    const firstCard = list ? list.querySelector('[data-guest-app-id]') : null;
    const targetButtons = list ? Array.from(list.querySelectorAll('.guest-project-cta-btn')) : [];
    const scrollTarget = firstCard || section || list;

    if (!scrollTarget) {
        return false;
    }

    scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!targetButtons.length) {
        _clearGuestProjectTargetHighlights();
        return true;
    }

    _clearGuestProjectTargetHighlights();
    targetButtons.forEach(function(button) {
        button.classList.add('highlight-target');
    });
    _guestProjectTargetHighlightTimer = setTimeout(function() {
        targetButtons.forEach(function(button) {
            button.classList.remove('highlight-target');
        });
        _guestProjectTargetHighlightTimer = null;
    }, 2600);
    return true;
}

function _focusGuestProjectSearchTargets(attempt) {
    const nextAttempt = Number(attempt || 0);
    const list = document.getElementById('guest-projects-list');
    const hasCards = !!(list && list.querySelector('[data-guest-app-id]'));

    if (!hasCards && nextAttempt < 6) {
        setTimeout(function() {
            _focusGuestProjectSearchTargets(nextAttempt + 1);
        }, 140);
        return;
    }

    if (_applyGuestProjectTargetHighlights() && nextAttempt < 2) {
        setTimeout(function() {
            _applyGuestProjectTargetHighlights();
        }, 420 * (nextAttempt + 1));
    }
}

async function openGuestProjectsTesterSearch(projectId) {
    const sourceProjectId = Number(projectId || 0);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        if (typeof window.switchTab === 'function') {
            window.switchTab('market');
        }
        if (typeof window.switchMarketSubTab === 'function') {
            window.switchMarketSubTab('seeking');
        }

        await toggleGuestProjectsAccordion(true);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                _focusGuestProjectSearchTargets(0);
            });
        });
    } catch (error) {
        console.error('Open guest projects tester search failed sourceProject=' + sourceProjectId + ':', error);
        if (typeof window.showToast === 'function') {
            window.showToast(window.t('guestProjectsLoadError', {}, lang));
        }
    }
}

async function updateGuestProjectsFilter(field, value) {
    const normalizedField = String(field || '').trim();
    if (normalizedField !== 'lang' && normalizedField !== 'category') {
        return;
    }
    _guestProjectsFilters[normalizedField] = normalizedField === 'lang'
        ? normalizeGuestProjectsFilterLang(value)
        : String(value || 'ALL').toUpperCase();
    resetGuestProjectsPagination();
    _guestProjectsLoadError = false;
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    if (_guestProjectsExpanded) {
        await loadGuestApps({ force: true });
    }
}

function _scheduleMarketRetry(feedKey, delayMs) {
    if (_marketRetryTimers[feedKey]) return;
    _marketRetryTimers[feedKey] = setTimeout(function() {
        _marketRetryTimers[feedKey] = null;
        if (feedKey === 'mutual') {
            loadMutualFeed().catch(function() {});
        } else {
            loadBountyFeed().catch(function() {});
        }
    }, delayMs || 2500);
}

function resetMarketFeedStates() {
    _marketFeedState.mutual = { confirmedEmpty: false, emptyStreak: 0 };
    _marketFeedState.bounty = { confirmedEmpty: false, emptyStreak: 0 };
}

function _resolveMarketResponse(feedKey, nextCount, hadVisibleData) {
    var state = _marketFeedState[feedKey];
    if (!state) {
        state = { confirmedEmpty: false, emptyStreak: 0 };
        _marketFeedState[feedKey] = state;
    }

    if (nextCount > 0) {
        state.confirmedEmpty = false;
        state.emptyStreak = 0;
        return true;
    }

    state.emptyStreak += 1;
    if (state.emptyStreak < 2) {
        state.confirmedEmpty = false;
        _scheduleMarketRetry(feedKey, hadVisibleData ? 2500 : 1500);
        return false;
    }

    state.confirmedEmpty = true;
    return true;
}

function startMarketPolling() {
    if (_marketPollId) {
        clearInterval(_marketPollId);
    }
    _marketPollId = setInterval(function() {
        if (document.hidden) return;
        loadMutualFeed().catch(function() {});
        loadBountyFeed().catch(function() {});
    }, MARKET_POLL_INTERVAL_MS);
}

function setMarketCache(nextCache) {
    marketCache = nextCache || null;
    try {
        if (marketCache) {
            localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(marketCache));
        } else {
            localStorage.removeItem(MARKET_CACHE_KEY);
        }
    } catch (e) {}
}

function hasMarketCache() {
    const cached = getMarketCache();
    if (!cached) return false;
    const hasMutual = cached.mutual && (
        (Array.isArray(cached.mutual.seeking) && cached.mutual.seeking.length > 0) ||
        (Array.isArray(cached.mutual.prelaunch) && cached.mutual.prelaunch.length > 0) ||
        (Array.isArray(cached.mutual.returns) && cached.mutual.returns.length > 0)
    );
    const hasBounty = cached.bounty && Array.isArray(cached.bounty.contracts) && cached.bounty.contracts.length > 0;
    return !!(hasMutual || hasBounty);
}

function getOffersCache() {
    try {
        var raw = localStorage.getItem(OFFERS_CACHE_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
        return null;
    }
}

function setOffersCache(items) {
    try {
        if (Array.isArray(items)) {
            localStorage.setItem(OFFERS_CACHE_KEY, JSON.stringify(items));
        } else {
            localStorage.removeItem(OFFERS_CACHE_KEY);
        }
    } catch (e) {}
}

function getTestsCache() {
    if (myTestsCache) return myTestsCache;
    try {
        var raw = localStorage.getItem(TESTS_CACHE_KEY);
        if (!raw) return null;
        myTestsCache = JSON.parse(raw);
        return myTestsCache;
    } catch (e) {
        myTestsCache = null;
        return null;
    }
}

function setTestsCache(nextCache) {
    myTestsCache = nextCache || null;
    try {
        if (myTestsCache) {
            localStorage.setItem(TESTS_CACHE_KEY, JSON.stringify(myTestsCache));
        } else {
            localStorage.removeItem(TESTS_CACHE_KEY);
        }
    } catch (e) {}
}

function persistTestsCacheSnapshot() {
    setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
}

function countGrantSkips(app) {
    var timeline = String(app && app.daily_timeline || '');
    if (timeline) {
        return Math.max(0, (timeline.substring(0, 14).match(/[03]/g) || []).length);
    }
    return Math.max(0, Number(app && app.skips_count || 0));
}

function buildCheckpointTestLink(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return '';
    return `https://t.me/${BOT_USERNAME}/${WEBAPP_SHORTNAME}?startapp=app_focus_${normalizedId}`;
}

function getCheckpointJoinSourceLabel(test, messageLang) {
    var resolvedLang = typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(messageLang, lang)
        : lang;
    var joinType = String(test && test.join_type || 'invite').trim().toLowerCase();
    if (joinType === 'mutual') return window.t('testerSourceMutualFull', {}, resolvedLang);
    if (joinType === 'bounty') return window.t('testerSourceBountyFull', {}, resolvedLang);
    if (joinType === 'prelaunch') return window.t('testerSourcePrelaunchFull', {}, resolvedLang);
    if (joinType === 'direct') return window.t('testerSourceDirectFull', {}, resolvedLang);
    return window.t('testerSourceInviteFull', {}, resolvedLang);
}

function getDefaultCheckpointReportLanguage(appId) {
    var test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    var ownerLanguage = String(test && test.owner_language || '').trim().toLowerCase();
    if (ownerLanguage === 'ru' || ownerLanguage === 'en') {
        return ownerLanguage;
    }
    var targetLanguage = String(test && test.target_lang || '').trim().toUpperCase();
    if (targetLanguage === 'RU' || targetLanguage === 'EN') {
        return targetLanguage.toLowerCase();
    }
    return typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(lang, lang)
        : (String(lang || 'en').trim().toLowerCase() === 'ru' ? 'ru' : 'en');
}

function buildCheckpointReportPrefill(appId, messageLang) {
    var resolvedLang = typeof normalizeGuestInviteLanguage === 'function'
        ? normalizeGuestInviteLanguage(messageLang, getDefaultCheckpointReportLanguage(appId))
        : getDefaultCheckpointReportLanguage(appId);
    var prefill = window.t('reportPrefill', {}, resolvedLang);
    var test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    if (!test) {
        return prefill;
    }
    var blocks = [prefill.trim()];
    var testedAppName = String(test.name || test.package || '').trim();
    if (testedAppName) {
        blocks.push(window.t('reportPrefillTestedAppLine', {
            app_name: testedAppName
        }, resolvedLang));
    }

    var reciprocalAppId = Number(test.reciprocal_app_id || 0);
    var reciprocalAppName = String(test.reciprocal_app_name || '').trim();
    if (reciprocalAppId > 0 && reciprocalAppName) {
        blocks.push(window.t('reportPrefillMyAppLinkLine', {
            app_name: reciprocalAppName,
            app_link: buildCheckpointTestLink(reciprocalAppId)
        }, resolvedLang));
    } else {
        blocks.push(window.t('reportPrefillSourceLine', {
            source: getCheckpointJoinSourceLabel(test, resolvedLang)
        }, resolvedLang));
        var fallbackLink = buildCheckpointTestLink(test.id);
        if (fallbackLink && testedAppName) {
            blocks.push(window.t('reportPrefillLinkLine', {
                app_name: testedAppName,
                app_link: fallbackLink,
            }, resolvedLang));
        }
    }
    return blocks.filter(function(item) {
        return String(item || '').trim() !== '';
    }).join('\n\n') + '\n\n';
}

function openOwnerCheckpointChat(ownerUsername, text) {
    var normalizedUsername = String(ownerUsername || '').replace('@', '').trim();
    if (!normalizedUsername) return false;

    var messageText = String(text || '').trim();
    if (messageText) {
        try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                navigator.clipboard.writeText(messageText).then(function() {
                    showToast(window.t('checkpointReportCopied', {
                        username: '@' + normalizedUsername,
                    }, lang));
                }).catch(function() {});
            }
        } catch (error) {}
    }

    const encodedText = encodeURIComponent(messageText);
    try {
        tg.openTelegramLink('https://t.me/' + normalizedUsername + '?text=' + encodedText);
    } catch (error) {
        try {
            tg.openLink('https://t.me/' + normalizedUsername + '?text=' + encodedText);
        } catch (fallbackError) {
            window.location.href = 'https://t.me/' + normalizedUsername + '?text=' + encodedText;
        }
    }
    _pendingScreenshotReminderUsername = normalizedUsername;
    return true;
}

function sendCheckpointScreenshotAndConfirm(appId, ownerUsername) {
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(appId, ownerUsername);
    confirmStart(appId);
    openOwnerCheckpointChat(resolvedOwnerUsername, buildCheckpointReportPrefill(appId));
}

function isValidEmail(value) {
    var email = String(value || '').trim();
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidGoogleGroupUrl(value) {
    var url = String(value || '').trim();
    if (!url) return false;
    return /^https:\/\/groups\.google\.com(?:\/u\/\d+)?\/g\/[A-Za-z0-9._-]+\/?$/.test(url);
}

function hasTestsCache() {
    var cached = getTestsCache();
    return !!(cached && Array.isArray(cached.tests));
}

function getProjectsCache() {
    if (myProjectsCache) return myProjectsCache;
    try {
        var raw = localStorage.getItem(PROJECTS_CACHE_KEY);
        if (!raw) return null;
        myProjectsCache = JSON.parse(raw);
        return myProjectsCache;
    } catch (e) {
        myProjectsCache = null;
        return null;
    }
}

function setProjectsCache(nextCache) {
    myProjectsCache = nextCache || null;
    try {
        if (myProjectsCache) {
            localStorage.setItem(PROJECTS_CACHE_KEY, JSON.stringify(myProjectsCache));
        } else {
            localStorage.removeItem(PROJECTS_CACHE_KEY);
        }
    } catch (e) {}
}

function hasProjectsCache() {
    var cached = getProjectsCache();
    return !!(cached && Array.isArray(cached.projects));
}

function getReliabilitySummaryCache() {
    if (reliabilitySummaryCache) return reliabilitySummaryCache;
    try {
        var raw = localStorage.getItem(RELIABILITY_SUMMARY_CACHE_KEY);
        if (!raw) return null;
        reliabilitySummaryCache = JSON.parse(raw);
        return reliabilitySummaryCache;
    } catch (e) {
        reliabilitySummaryCache = null;
        return null;
    }
}

function setReliabilitySummaryCache(nextCache) {
    reliabilitySummaryCache = nextCache || null;
    try {
        if (reliabilitySummaryCache) {
            localStorage.setItem(RELIABILITY_SUMMARY_CACHE_KEY, JSON.stringify(reliabilitySummaryCache));
        } else {
            localStorage.removeItem(RELIABILITY_SUMMARY_CACHE_KEY);
        }
    } catch (e) {}
}

function getReliabilityBreakdownCache() {
    if (reliabilityBreakdownCache) return reliabilityBreakdownCache;
    try {
        var raw = localStorage.getItem(RELIABILITY_BREAKDOWN_CACHE_KEY);
        if (!raw) return null;
        reliabilityBreakdownCache = JSON.parse(raw);
        return reliabilityBreakdownCache;
    } catch (e) {
        reliabilityBreakdownCache = null;
        return null;
    }
}

function setReliabilityBreakdownCache(nextCache) {
    reliabilityBreakdownCache = nextCache || null;
    try {
        if (reliabilityBreakdownCache) {
            localStorage.setItem(RELIABILITY_BREAKDOWN_CACHE_KEY, JSON.stringify(reliabilityBreakdownCache));
        } else {
            localStorage.removeItem(RELIABILITY_BREAKDOWN_CACHE_KEY);
        }
    } catch (e) {}
}

function rerenderReliabilityUi() {
    if (typeof window.renderReliabilitySummaryWidget === 'function') {
        window.renderReliabilitySummaryWidget(true);
    }
    if (typeof window.renderReliabilityAlphaModal === 'function') {
        window.renderReliabilityAlphaModal();
    } else if (typeof window.renderReliabilityDashboard === 'function') {
        window.renderReliabilityDashboard();
    }
}

function getReliabilityState() {
    return {
        summary: reliabilitySummary,
        breakdown: reliabilityBreakdown,
        summaryLoading: !!_reliabilitySummaryInFlight,
        breakdownLoading: !!_reliabilityBreakdownInFlight,
        summaryLoadedOnce: _reliabilitySummaryLoadedOnce,
        breakdownLoadedOnce: _reliabilityBreakdownLoadedOnce,
        summaryError: _reliabilitySummaryLoadError,
        breakdownError: _reliabilityBreakdownLoadError,
    };
}

async function loadReliabilitySummary(isBackground) {
    if (_reliabilitySummaryInFlight) {
        return _reliabilitySummaryInFlight;
    }

    if (!_reliabilitySummaryLoadedOnce) {
        var cached = getReliabilitySummaryCache();
        if (cached && cached.data) {
            reliabilitySummary = cached.data;
            _reliabilitySummaryLoadedOnce = true;
            _reliabilitySummaryLoadError = false;
            rerenderReliabilityUi();
        }
    }

    if (isBackground && _reliabilitySummaryLoadedOnce && (Date.now() - (_lastFetchTimes.reliabilitySummary || 0)) < RELIABILITY_FETCH_THROTTLE_MS) {
        return;
    }

    var requestPromise = (async function() {
        var shouldMarkBackgroundSync = !!isBackground || _reliabilitySummaryLoadedOnce || !!getReliabilitySummaryCache();
        if (shouldMarkBackgroundSync) beginBackgroundSync('tests');
        _apiStart();
        try {
            var response = await fetchWithRetry(API_BASE + '/tester/' + userId + '/reliability/summary', { timeoutMs: 12000 }, 1);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var payload = await response.json();
            if (payload && payload.status === 'error') throw payload;
            reliabilitySummary = payload || null;
            window.reliabilitySummary = reliabilitySummary;
            setReliabilitySummaryCache({ data: reliabilitySummary, ts: Date.now() });
            _reliabilitySummaryLoadedOnce = true;
            _reliabilitySummaryLoadError = false;
            _lastFetchTimes.reliabilitySummary = Date.now();
            rerenderReliabilityUi();
        } catch (error) {
            console.error('Reliability summary load error:', error);
            if (!reliabilitySummary) {
                var summaryCache = getReliabilitySummaryCache();
                reliabilitySummary = summaryCache && summaryCache.data ? summaryCache.data : null;
                window.reliabilitySummary = reliabilitySummary;
            }
            _reliabilitySummaryLoadedOnce = true;
            _reliabilitySummaryLoadError = true;
            rerenderReliabilityUi();
        } finally {
            _apiEnd();
            if (shouldMarkBackgroundSync) endBackgroundSync('tests');
        }
    })();

    _reliabilitySummaryInFlight = requestPromise;
    rerenderReliabilityUi();

    try {
        await requestPromise;
    } finally {
        if (_reliabilitySummaryInFlight === requestPromise) {
            _reliabilitySummaryInFlight = null;
        }
        rerenderReliabilityUi();
    }
}

async function loadReliabilityBreakdown(isBackground) {
    if (_reliabilityBreakdownInFlight) {
        return _reliabilityBreakdownInFlight;
    }

    if (!_reliabilityBreakdownLoadedOnce) {
        var cached = getReliabilityBreakdownCache();
        if (cached && cached.data) {
            reliabilityBreakdown = cached.data;
            _reliabilityBreakdownLoadedOnce = true;
            _reliabilityBreakdownLoadError = false;
            rerenderReliabilityUi();
        }
    }

    if (isBackground && _reliabilityBreakdownLoadedOnce && (Date.now() - (_lastFetchTimes.reliabilityBreakdown || 0)) < RELIABILITY_FETCH_THROTTLE_MS) {
        return;
    }

    var requestPromise = (async function() {
        var shouldMarkBackgroundSync = !!isBackground || _reliabilityBreakdownLoadedOnce || !!getReliabilityBreakdownCache();
        if (shouldMarkBackgroundSync) beginBackgroundSync('tests');
        _apiStart();
        try {
            var response = await fetchWithRetry(API_BASE + '/tester/' + userId + '/reliability/breakdown', { timeoutMs: 12000 }, 1);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            var payload = await response.json();
            if (payload && payload.status === 'error') throw payload;
            reliabilityBreakdown = payload || null;
            window.reliabilityBreakdown = reliabilityBreakdown;
            setReliabilityBreakdownCache({ data: reliabilityBreakdown, ts: Date.now() });
            _reliabilityBreakdownLoadedOnce = true;
            _reliabilityBreakdownLoadError = false;
            _lastFetchTimes.reliabilityBreakdown = Date.now();
            rerenderReliabilityUi();
        } catch (error) {
            console.error('Reliability breakdown load error:', error);
            if (!reliabilityBreakdown) {
                var breakdownCache = getReliabilityBreakdownCache();
                reliabilityBreakdown = breakdownCache && breakdownCache.data ? breakdownCache.data : null;
                window.reliabilityBreakdown = reliabilityBreakdown;
            }
            _reliabilityBreakdownLoadedOnce = true;
            _reliabilityBreakdownLoadError = true;
            rerenderReliabilityUi();
        } finally {
            _apiEnd();
            if (shouldMarkBackgroundSync) endBackgroundSync('tests');
        }
    })();

    _reliabilityBreakdownInFlight = requestPromise;
    rerenderReliabilityUi();

    try {
        await requestPromise;
    } finally {
        if (_reliabilityBreakdownInFlight === requestPromise) {
            _reliabilityBreakdownInFlight = null;
        }
        rerenderReliabilityUi();
    }
}

async function loadIncomingOffers(options) {
    var opts = options || {};
    var background = !!opts.background;

    if (_offersInFlight) {
        return _offersInFlight;
    }

    var cached = getOffersCache();
    if (!_offersLoadedOnce && Array.isArray(cached)) {
        incomingOffers = cached;
        _offersLoadedOnce = true;
        _offersLoadError = false;
        renderIncomingOffers();
    }

    if (background && _offersLoadedOnce && (Date.now() - (_lastFetchTimes.offers || 0)) < OFFERS_FETCH_THROTTLE_MS) {
        return;
    }

    var shouldMarkBackgroundSync = background || _offersLoadedOnce || Array.isArray(cached);

    var requestPromise = (async function() {
        if (shouldMarkBackgroundSync) {
            beginBackgroundSync('tests');
        }
        _apiStart();
        try {
            var response = await fetchWithRetry(`${API_BASE}/offers/incoming/${userId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            var data = await response.json();
            incomingOffers = data.offers || [];
            setOffersCache(incomingOffers);
            _offersLoadedOnce = true;
            _offersLoadError = false;
            _lastFetchTimes.offers = Date.now();
            renderIncomingOffers();
        } catch (error) {
            console.error('Error loading incoming offers:', error);
            if (!Array.isArray(incomingOffers) || incomingOffers.length === 0) {
                incomingOffers = Array.isArray(cached) ? cached : [];
            }
            _offersLoadedOnce = true;
            _offersLoadError = true;
            renderIncomingOffers();
            if (!background && (!incomingOffers || incomingOffers.length === 0)) {
                _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'incoming_offers');
            }
        } finally {
            _apiEnd();
            if (shouldMarkBackgroundSync) {
                endBackgroundSync('tests');
            }
        }
    })();

    _offersInFlight = requestPromise;
    renderIncomingOffers();

    try {
        await requestPromise;
    } finally {
        if (_offersInFlight === requestPromise) {
            _offersInFlight = null;
        }
        renderIncomingOffers();
    }
}

function startOffersPolling() {
    if (_offersPollId) {
        clearInterval(_offersPollId);
    }
    _offersPollId = setInterval(function() {
        if (!document.hidden) {
            loadIncomingOffers({ background: true }).catch(function() {});
        }
    }, 30000);
}

async function fetchBlockedOfferProjects(targetOwnerId, forceRefresh) {
    var ownerKey = String(targetOwnerId || '');
    if (!ownerKey) return {};
    if (!forceRefresh && _blockedOfferProjectsByOwner[ownerKey]) {
        return _blockedOfferProjectsByOwner[ownerKey];
    }
    try {
        var response = await fetchWithRetry(`${API_BASE}/offers/blocked-projects/${userId}/${targetOwnerId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        var data = await response.json();
        var map = {};
        (data.blocked_projects || []).forEach(function(item) {
            if (!item || typeof item.proposer_app_id === 'undefined' || item.proposer_app_id === null) return;
            map[String(item.proposer_app_id)] = item;
        });
        _blockedOfferProjectsByOwner[ownerKey] = map;
        return map;
    } catch (error) {
        console.error('Error loading blocked offer projects:', error);
        return {};
    }
}

async function fetchWithRetry(url, options, maxRetries) {
    var retries = (typeof maxRetries === 'number') ? maxRetries : 2;
    var retryableStatuses = [408, 425, 429, 500, 502, 503, 504, 520, 522, 524];
    var timeoutMs = options && typeof options.timeoutMs === 'number' ? options.timeoutMs : 15000;
    var baseOptions = Object.assign({}, options || {});
    delete baseOptions.timeoutMs;
    var lastError;
    for (var attempt = 0; attempt <= retries; attempt++) {
        var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        var timeoutId = null;
        try {
            var requestOptions = Object.assign({}, baseOptions);
            if (controller) {
                requestOptions.signal = controller.signal;
                timeoutId = setTimeout(function() {
                    controller.abort();
                }, timeoutMs);
            }

            var response = await fetch(url, requestOptions);
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            if (retryableStatuses.indexOf(response.status) !== -1) {
                lastError = new Error('HTTP ' + response.status);
                if (attempt < retries) {
                    await new Promise(function(res) { setTimeout(res, 1000 * (attempt + 1)); });
                    continue;
                }
                throw lastError;
            }
            return response;
        } catch (err) {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            lastError = err;
            if (err && err.name === 'AbortError') {
                lastError = new Error('Request timeout');
            }
            if (attempt < retries) {
                await new Promise(function(res) { setTimeout(res, 1000 * (attempt + 1)); });
            }
        }
    }
    throw lastError;
}

function loadAllData() {
    // Reset throttles so all data reloads fresh
    _lastFetchTimes.tests = 0;
    _lastFetchTimes.projects = 0;
    _lastFetchTimes.mutual = 0;
    _lastFetchTimes.bounty = 0;
    _lastFetchTimes.offers = 0;
    _lastFetchTimes.archived = 0;
    _lastFetchTimes.reliabilitySummary = 0;
    _lastFetchTimes.reliabilityBreakdown = 0;
    loadTasks().catch(function() {});
    loadReliabilitySummary().catch(function() {});
    loadReliabilityBreakdown().catch(function() {});
    loadIncomingOffers().catch(function() {});
    loadProjects().catch(function() {});
    loadArchivedProjects({ silent: true }).catch(function() {});
    loadMutualFeed().catch(function() {});
    loadBountyFeed().catch(function() {});
}

function _apiStart() {
    _activeRequests++;
    const dot = document.getElementById('loading-dot');
    if (dot) dot.classList.remove('hidden');
}

function _apiEnd() {
    _activeRequests = Math.max(0, _activeRequests - 1);
    if (_activeRequests === 0) {
        const dot = document.getElementById('loading-dot');
        if (dot) dot.classList.add('hidden');
    }
}

function getLocalDate() {
    const date = new Date();
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

function getRuDaysWord(days) {
    const d10 = days % 10;
    const d100 = days % 100;
    if (d10 === 1 && d100 !== 11) return 'день';
    if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'дня';
    return 'дней';
}

function formatEditProjectCreatedAt(project) {
    if (!project || !project.created_at) return '';
    const createdDate = new Date(project.created_at);
    if (Number.isNaN(createdDate.getTime())) return '';

    const msInDay = 1000 * 60 * 60 * 24;
    const todayDate = new Date(getLocalDate());
    const createdOnlyDate = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
    const daysAgo = Math.max(0, Math.floor((todayDate - createdOnlyDate) / msInDay));

    if (lang === 'ru') {
        const formattedDate = new Intl.DateTimeFormat('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(createdDate).replace(/\s?г\.?$/, '');
        return t.editAddedToPlatform
            .replace('{date}', formattedDate)
            .replace('{days}', daysAgo)
            .replace('{days_word}', getRuDaysWord(daysAgo));
    }

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    }).format(createdDate);
    return t.editAddedToPlatform
        .replace('{date}', formattedDate)
        .replace('{days}', daysAgo);
}

function getOfferApiError(message) {
    const code = typeof message === 'string'
        ? message
        : message && typeof message === 'object'
            ? (message.code || message.message)
            : null;
    if (!code) return t.offerActionError;
    if (['offer_forbidden', 'offer_not_pending', 'offer_not_found', 'offer_expired'].includes(code)) {
        return t.offerForbidden;
    }
    if (code === 'offer_already_connected') {
        return t.offerAlreadyConnected;
    }
    return getApiErrorMessage(message, 'offerActionError');
}

function formatAmountValue(value, digits) {
    const numeric = Number(value || 0);
    const precision = typeof digits === 'number' ? digits : 1;
    if (!Number.isFinite(numeric)) return '0';
    const rounded = Number(numeric.toFixed(precision));
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(precision);
}

function formatBustAmount(value) {
    return `${formatAmountValue(value, 1)} $BUST`;
}

function getApiErrorMessage(payload, fallbackKey = 'genericError') {
    if (window.resolveApiMessage) {
        return window.resolveApiMessage(payload, fallbackKey, lang);
    }

    const isNotFoundLike = function(value) {
        const text = String(value || '').trim().toLowerCase();
        return text === 'not found' || text === '404' || text === 'http 404';
    };

    if (payload && typeof payload === 'object') {
        const objectMessage = payload.message || payload.detail;
        if (typeof objectMessage === 'string' && objectMessage.trim() !== '') {
            if (isNotFoundLike(objectMessage)) {
                return t.networkError || t.genericError;
            }
            return objectMessage;
        }
        return t[fallbackKey] || t.genericError;
    }
    if (typeof payload === 'string' && payload.trim() !== '') {
        if (isNotFoundLike(payload)) {
            return t.networkError || t.genericError;
        }
        return payload;
    }
    return t[fallbackKey] || t.genericError;
}

function getProjectApiErrorMessage(message, details = {}) {
    return getApiErrorMessage({ code: message, details }, 'saveProjectError');
}

function _applyTemplateDetails(message, details) {
    var text = String(message || '');
    var safeDetails = details && typeof details === 'object' ? details : {};
    Object.keys(safeDetails).forEach(function(key) {
        var value = safeDetails[key];
        if (value === null || typeof value === 'undefined') {
            value = '';
        }
        text = text.replace(new RegExp('\\{' + key + '\\}', 'g'), String(value));
    });
    return text;
}

function getBackendErrorCode(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return String(payload.code || payload.error_code || payload.message || '').trim();
}

function handleApiError(code, details = {}) {
    var keyMap = {
        ALREADY_OWNED: 'ALREADY_OWNED',
        ALREADY_ACTIVE: 'ALREADY_ACTIVE',
        NEEDS_RESTART: 'NEEDS_RESTART',
        insufficient_bust_balance: 'err_insufficient_bust_balance',
        transaction_failed: 'err_transaction_failed',
        invalid_init_data: 'guestClaimAuthErrorToast',
        grant_not_ready: 'err_grant_not_ready',
        grant_too_many_skips: 'err_grant_too_many_skips',
        grant_already_claimed: 'err_grant_already_claimed',
        invalid_start_date: 'err_grant_unavailable',
        invalid_google_group_url: 'invalid_google_group_url',
        testing_not_found: 'testing_not_found',
        database_error: 'database_error',
        project_pending_completion: 'projectPendingCompletionAlert',
        feedback_not_found: 'feedback_not_found',
        feedback_forbidden: 'feedback_forbidden',
        feedback_already_processed: 'feedback_already_processed',
        feedback_media_missing: 'feedback_media_missing',
        no_reward_selected: 'no_reward_selected',
        invalid_feedback_karma_amount: 'invalid_feedback_karma_amount',
        invalid_feedback_bust_amount: 'invalid_feedback_bust_amount',
        app_archived: 'err_app_archived',
        app_not_found: 'app_not_found',
        already_published: 'already_published',
        not_owner: 'not_owner',
        publish_to_market_failed: 'publish_to_market_failed',
        overtime_reward_unavailable: 'err_overtime_reward_unavailable',
        offer_already_pending: 'err_offer_already_pending',
        offer_target_owner_mismatch: 'err_offer_target_owner_mismatch',
        offer_proposer_owner_mismatch: 'err_offer_proposer_owner_mismatch',
        offer_not_found: 'err_offer_not_found',
        offer_forbidden: 'err_offer_forbidden',
        offer_not_pending: 'err_offer_not_pending',
        offer_expired: 'err_offer_expired',
        offer_app_not_found: 'err_offer_app_not_found',
        offer_inactive_app: 'err_offer_inactive_app',
        offer_owner_mismatch: 'err_offer_owner_mismatch',
        offer_proposer_app_locked_owner: 'err_offer_proposer_app_locked_owner',
        offer_no_available_apps: 'err_offer_no_available_apps',
        offer_accept_failed: 'err_offer_accept_failed',
        offer_create_failed: 'err_offer_create_failed',
        user_not_found: 'err_user_not_found',
        mass_invite_project_unavailable: 'massInviteUnavailable',
        mass_invite_cooldown_active: 'massInviteCooldownActiveError',
        mass_invite_cooldown_not_active: 'massInviteCooldownNotActive',
    };

    var normalizedCode = String(code || '').trim();
    var message = '';

    if (normalizedCode === 'network_error') {
        message = window.t('networkError', {}, lang);
    } else {
        var i18nKey = keyMap[normalizedCode] || 'err_default_api';
        message = window.t(i18nKey, {}, lang);
        message = _applyTemplateDetails(message, details);
    }

    if (!message || message.trim() === '') {
        message = getApiErrorMessage({ code: normalizedCode, details: details }, 'networkError');
    }

    if (window.showToast) {
        window.showToast(message);
    } else if (typeof showToast === 'function') {
        showToast(message);
    } else if (tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
    return message;
}

function getProjectFormConfig(formKey) {
    return formKey === 'edit'
        ? {
            modeInput: 'edit-mode',
            mutualInput: 'edit-limit-mutual',
            bountyInput: 'edit-limit-bounty',
            rewardInput: 'edit-bounty-per-tester',
            mutualPanel: 'edit-mutual-settings',
            bountyPanel: 'edit-bounty-settings',
            calcPerTester: 'edit-calc-per-tester',
            calcDaily: 'edit-calc-daily',
            calcHold: 'edit-calc-hold',
            calcTotal: 'edit-calc-total',
            balanceBadge: 'edit-balance-badge-value',
            modeButtons: {
                mutual: 'edit-mode-mutual',
                bounty: 'edit-mode-bounty',
                hybrid: 'edit-mode-hybrid'
            }
        }
        : {
            modeInput: 'app-mode',
            mutualInput: 'app-limit-mutual',
            bountyInput: 'app-limit-bounty',
            rewardInput: 'app-bounty-per-tester',
            mutualPanel: 'add-mutual-settings',
            bountyPanel: 'add-bounty-settings',
            calcPerTester: 'add-calc-per-tester',
            calcDaily: 'add-calc-daily',
            calcHold: 'add-calc-hold',
            calcTotal: 'add-calc-total',
            balanceBadge: 'add-balance-badge-value',
            modeButtons: {
                mutual: 'add-mode-mutual',
                bounty: 'add-mode-bounty',
                hybrid: 'add-mode-hybrid'
            }
        };
}

function getProjectPricingState(formKey) {
    const config = getProjectFormConfig(formKey);
    const mode = document.getElementById(config.modeInput).value || 'mutual';
    const mutualInput = document.getElementById(config.mutualInput);
    const bountyInput = document.getElementById(config.bountyInput);
    const rewardInput = document.getElementById(config.rewardInput);
    const limitMutual = mutualInput && mutualInput.value !== '' && Number.isFinite(mutualInput.valueAsNumber)
        ? Math.trunc(mutualInput.valueAsNumber)
        : 0;
    const limitBounty = bountyInput && bountyInput.value !== '' && Number.isFinite(bountyInput.valueAsNumber)
        ? Math.trunc(bountyInput.valueAsNumber)
        : 0;
    const bountyPerTester = rewardInput && rewardInput.value !== '' && Number.isFinite(rewardInput.valueAsNumber)
        ? Math.trunc(rewardInput.valueAsNumber)
        : 0;
    return { mode, limitMutual, limitBounty, bountyPerTester };
}

function setProjectMode(formKey, mode) {
    const config = getProjectFormConfig(formKey);
    document.getElementById(config.modeInput).value = mode;
    Object.entries(config.modeButtons).forEach(([key, id]) => {
        document.getElementById(id).classList.toggle('active', key === mode);
    });
    updateProjectPricing(formKey);
}

function updateProjectPricing(formKey) {
    const config = getProjectFormConfig(formKey);
    const state = getProjectPricingState(formKey);
    const showMutual = state.mode === 'mutual' || state.mode === 'hybrid';
    const showBounty = state.mode === 'bounty' || state.mode === 'hybrid';
    const mutualPanel = document.getElementById(config.mutualPanel);
    const bountyPanel = document.getElementById(config.bountyPanel);
    mutualPanel.classList.toggle('active', showMutual);
    bountyPanel.classList.toggle('active', showBounty);

    const rewardPerTester = showBounty ? state.bountyPerTester : 0;
    const dailyShare = rewardPerTester * 0.65;
    const holdBonus = rewardPerTester * 0.35;
    const totalCost = showBounty ? state.limitBounty * rewardPerTester : 0;
    const bustBalance = visibilityStats && typeof visibilityStats.balance_bust !== 'undefined'
        ? visibilityStats.balance_bust
        : 0;

    document.getElementById(config.calcPerTester).innerText = formatBustAmount(rewardPerTester);
    document.getElementById(config.calcDaily).innerText = formatBustAmount(dailyShare);
    document.getElementById(config.calcHold).innerText = formatBustAmount(holdBonus);
    document.getElementById(config.calcTotal).innerText = formatBustAmount(totalCost);
    document.getElementById(config.balanceBadge).innerText = formatBustAmount(bustBalance);
}

function resetProjectForms() {
    document.getElementById('app-mode').value = 'mutual';
    document.getElementById('app-target-lang').value = 'ALL';
    document.getElementById('app-limit-mutual').value = '12';
    document.getElementById('app-limit-bounty').value = '12';
    document.getElementById('app-bounty-per-tester').value = '100';
    document.getElementById('app-request-reviews').checked = true;
    document.getElementById('edit-mode').value = 'mutual';
    document.getElementById('edit-target-lang').value = 'ALL';
    document.getElementById('edit-limit-mutual').value = '12';
    document.getElementById('edit-limit-bounty').value = '12';
    document.getElementById('edit-bounty-per-tester').value = '100';
    document.getElementById('edit-request-reviews').checked = true;
    setProjectMode('add', 'mutual');
    setProjectMode('edit', 'mutual');
    setProjectTargetLang('add', 'ALL');
    setProjectTargetLang('edit', 'ALL');
}

function setProjectTargetLang(formKey, targetLang) {
    const normalized = ['RU', 'EN', 'ALL'].includes(String(targetLang || '').toUpperCase())
        ? String(targetLang).toUpperCase()
        : 'ALL';
    const input = document.getElementById(`${formKey}-target-lang`);
    if (input) {
        input.value = normalized;
    }
    ['ru', 'en', 'all'].forEach((code) => {
        const button = document.getElementById(`${formKey}-target-lang-${code}`);
        if (button) {
            button.classList.toggle('active', code.toUpperCase() === normalized);
        }
    });
}

function validateProjectPricing(formKey) {
    const { mode, limitMutual, limitBounty, bountyPerTester } = getProjectPricingState(formKey);
    if (!['mutual', 'bounty', 'hybrid'].includes(mode)) return t.invalidModeSelection;
    if ((mode === 'mutual' || mode === 'hybrid') && limitMutual < 1) return t.mutualLimitInvalid;
    if ((mode === 'bounty' || mode === 'hybrid') && limitBounty < 1) return t.bountyLimitInvalid;
    if ((mode === 'bounty' || mode === 'hybrid') && bountyPerTester < 100) return t.bountyPerTesterInvalid;
    return null;
}

function buildProjectPricingPayload(formKey) {
    const error = validateProjectPricing(formKey);
    if (error) {
        if (tg.showAlert) tg.showAlert(error);
        else alert(error);
        return null;
    }
    const { mode, limitMutual, limitBounty, bountyPerTester } = getProjectPricingState(formKey);
    return {
        mode,
        limit_mutual: mode === 'bounty' ? 0 : limitMutual,
        limit_bounty: mode === 'bounty' || mode === 'hybrid' ? limitBounty : 0,
        bounty_per_tester: mode === 'bounty' || mode === 'hybrid' ? bountyPerTester : 0
    };
}

function refreshLanguageUi() {
    var selectedLanguage = getSelectedAppLanguage();
    applyDocumentLanguageSettings(selectedLanguage);

    if (window.updateTranslations) {
        window.updateTranslations(lang);
    }

    renderAutoTranslateLanguageOptions();

    updateProjectPricing('add');
    updateProjectPricing('edit');
    renderEditCreatedAtMeta();

    // Update language label in system menu tab
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) {
        langLabel.innerText = getLanguageShortLabel(selectedLanguage);
    }

    // Update active language button in segmented control
    const langBtnRu = document.getElementById('lang-btn-ru');
    const langBtnEn = document.getElementById('lang-btn-en');
    if (langBtnRu && langBtnEn) {
        langBtnRu.classList.toggle('active', selectedLanguage === 'ru');
        langBtnEn.classList.toggle('active', selectedLanguage === 'en');
    }

    const chipTexts = [
        window.t('chipBrowse', {}, lang),
        window.t('chipScreenshot3', {}, lang),
        window.t('chipJustOpen', {}, lang),
        window.t('chipTryFeatures', {}, lang),
        window.t('chipLeaveReview', {}, lang)
    ];
    const renderChips = (containerId, textareaId) => {
        const element = document.getElementById(containerId);
        if (!element) return;
        element.innerHTML = chipTexts
            .map(chipText => `<button type="button" class="chip" onclick="insertChip('${textareaId}', this.dataset.text)" data-text="${chipText.replace(/"/g, '&quot;')}">${chipText}</button>`)
            .join('');
    };
    renderChips('chips-instructions', 'app-instructions');
    renderChips('chips-edit-instructions', 'edit-description');

    const toggleBtn = document.getElementById('events-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = eventsExpanded ? window.t('pulseCollapse', {}, lang) : window.t('pulseExpand', {}, lang);
    }

    const select = document.getElementById('attach-project-select');
    if (select && select.options.length > 0 && !select.value) {
        select.options[0].text = window.t('contactSelectPlaceholder', {}, lang);
    }

    syncAutoAcceptToggleUi();
}

function syncAutoAcceptToggleUi() {
    var toggle = document.getElementById('auto-accept-mutual-toggle');
    if (!toggle) return;
    toggle.checked = !!_autoAcceptMutualEnabled;
    toggle.disabled = !!_autoAcceptToggleInFlight;
}

async function loadUserProfilePreferences() {
    try {
        var response = await fetchWithRetry(API_BASE + '/users/' + userId + '/profile');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var profile = await response.json();
        _autoAcceptMutualEnabled = !!profile.auto_accept_mutual;
        syncAutoAcceptToggleUi();
        window.App.autoAcceptMutual = _autoAcceptMutualEnabled;
    } catch (error) {
        console.error('Profile preferences load error:', error);
        syncAutoAcceptToggleUi();
    }
}

function showAutoAcceptMutualInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('autoAcceptMutualInfoToast', {}, lang));
}

async function handleAutoAcceptMutualToggle(input) {
    if (!input || _autoAcceptToggleInFlight) {
        syncAutoAcceptToggleUi();
        return;
    }

    var previousValue = !!_autoAcceptMutualEnabled;
    var nextValue = !!input.checked;
    if (nextValue === previousValue) {
        syncAutoAcceptToggleUi();
        return;
    }

    _autoAcceptToggleInFlight = true;
    _autoAcceptMutualEnabled = nextValue;
    syncAutoAcceptToggleUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    try {
        var response = await fetch(API_BASE + '/users/me/auto-accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: (tg && tg.initData) ? tg.initData : '', enabled: nextValue })
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            _autoAcceptMutualEnabled = previousValue;
            syncAutoAcceptToggleUi();
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }

        _autoAcceptMutualEnabled = !!result.auto_accept_mutual;
        window.App.autoAcceptMutual = _autoAcceptMutualEnabled;
        syncAutoAcceptToggleUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(_autoAcceptMutualEnabled ? 'autoAcceptMutualEnabledToast' : 'autoAcceptMutualDisabledToast', {}, lang));
    } catch (error) {
        console.error('Auto-accept toggle error:', error);
        _autoAcceptMutualEnabled = previousValue;
        syncAutoAcceptToggleUi();
        handleApiError('network_error');
    } finally {
        _autoAcceptToggleInFlight = false;
        syncAutoAcceptToggleUi();
    }
}

function _ensureTestCardExpanded(card) {
    if (!card) return;
    var doneList = document.getElementById('done-list');
    var doneSection = document.getElementById('done-section');
    if (!doneList || !doneSection || !doneList.contains(card)) return;
    if (!doneSection.classList.contains('active') && typeof window.toggleAccordion === 'function') {
        window.toggleAccordion();
    }
}

function _highlightTestCard(appId) {
    var normalizedId = Number(appId || 0);
    if (!normalizedId) return false;
    var card = document.getElementById('test-card-' + normalizedId);
    if (!card) return false;

    _ensureTestCardExpanded(card);
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.remove('test-card-highlight-pulse');
    void card.offsetWidth;
    card.classList.add('test-card-highlight-pulse');
    if (_highlightTestTimerId) {
        clearTimeout(_highlightTestTimerId);
    }
    _highlightTestTimerId = setTimeout(function() {
        card.classList.remove('test-card-highlight-pulse');
        _highlightTestTimerId = null;
    }, 3600);
    return true;
}

function _highlightTestCardWhenReady(appId, attemptsLeft) {
    var remaining = Number.isFinite(attemptsLeft) ? attemptsLeft : 8;
    if (_highlightTestCard(appId)) {
        _pendingInitialHighlightTestId = null;
        return;
    }
    if (remaining <= 0) return;
    setTimeout(function() {
        _highlightTestCardWhenReady(appId, remaining - 1);
    }, 180);
}

function toggleSystemMenu() {
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        menu.classList.toggle('active');
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function applyLanguage(newLang, options) {
    var normalizedLang = normalizeAppLanguage(newLang);
    var settings = options || {};
    var previousSelectedLanguage = getSelectedAppLanguage();
    var hadAutoTranslate = isAutoTranslatedLanguage(previousSelectedLanguage) || hasGoogleTranslateCookie();

    if (!normalizedLang) {
        refreshLanguageUi();
        return;
    }
    if (!settings.force && normalizedLang === previousSelectedLanguage) {
        refreshLanguageUi();
        return;
    }

    persistLanguageSelection(normalizedLang);

    if (!settings.skipServerSync) {
        sendLanguagePreferenceToServer(getServerSafeLanguage(normalizedLang));
    }

    if (isAutoTranslatedLanguage(normalizedLang)) {
        setGoogleTranslateCookie(normalizedLang);
        refreshLanguageUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        window.location.reload();
        return;
    }

    clearGoogleTranslateCookies();

    if (hadAutoTranslate) {
        refreshLanguageUi();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        window.location.reload();
        return;
    }

    refreshLanguageUi();
    rerenderDynamicUi();
    refreshActiveTabData();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
}

function getUserSystemTimezone() {
    try {
        var resolved = Intl.DateTimeFormat().resolvedOptions().timeZone;
        var normalized = String(resolved || '').trim();
        return normalized || 'UTC';
    } catch (error) {
        console.warn('Timezone detection failed:', error);
        return 'UTC';
    }
}

async function syncUserTimezone(force) {
    var detectedTimezone = getUserSystemTimezone();
    var cachedTimezone = String(localStorage.getItem(USER_TIMEZONE_STORAGE_KEY) || '').trim();
    if (!force && cachedTimezone === detectedTimezone) {
        return;
    }
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/timezone`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ timezone: detectedTimezone })
        });
        if (!response.ok) {
            return;
        }
        localStorage.setItem(USER_TIMEZONE_STORAGE_KEY, detectedTimezone);
    } catch (error) {
        console.warn('Timezone sync failed:', error);
    }
}

async function syncTelegramProfile() {
    if (!tg || !tg.initData || !hasTelegramUsername()) {
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/users/me/profile/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: tg.initData || '' })
        });

        var result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok || !result || result.status !== 'success') {
            if (getBackendErrorCode(result) === 'username_required') {
                showNoUsernameOverlay();
            }
            return false;
        }

        return true;
    } catch (error) {
        console.warn('Telegram profile sync failed:', error);
        return false;
    }
}

function sendFeedback(type) {
    const typeKeyMap = {
        bug: 'feedbackTypeBug',
        idea: 'feedbackTypeIdea',
        question: 'feedbackTypeQuestion'
    };
    _feedbackType = (type === 'idea' || type === 'question') ? type : 'bug';
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        menu.classList.remove('active');
    }
    openFeedbackModal(typeKeyMap[_feedbackType]);
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
}

function _openBotDm() {
    try {
        if (tg.openTelegramLink) {
            tg.openTelegramLink(BOT_CHAT_URL);
            return true;
        }
    } catch (error) {}
    try {
        if (tg.openLink) {
            tg.openLink(BOT_CHAT_URL);
            return true;
        }
    } catch (error) {}
    try {
        window.location.href = BOT_CHAT_URL;
        return true;
    } catch (error) {}
    return false;
}

function redirectToBotDmAndClose() {
    var opened = _openBotDm();
    // Allow Telegram to process deep-link before closing Mini App.
    setTimeout(function() {
        try {
            if (tg.close) tg.close();
        } catch (error) {}
    }, opened ? 700 : 1000);
}

function _loadFirstDayScreenshotState() {
    try {
        var raw = localStorage.getItem(_firstDayScreenshotStateKey);
        if (!raw) {
            _firstDayScreenshotState = {};
            return;
        }
        var parsed = JSON.parse(raw);
        _firstDayScreenshotState = parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
        _firstDayScreenshotState = {};
    }
}

function _persistFirstDayScreenshotState() {
    try {
        localStorage.setItem(_firstDayScreenshotStateKey, JSON.stringify(_firstDayScreenshotState || {}));
    } catch (error) {}
}

function setFirstDayScreenshotVisible(appId, isVisible) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    if (isVisible) {
        _firstDayScreenshotState[key] = true;
    } else {
        delete _firstDayScreenshotState[key];
    }
    _persistFirstDayScreenshotState();
}

function isFirstDayScreenshotVisible(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return false;
    return !!_firstDayScreenshotState[key];
}

function _persistActiveTimer() {
    try {
        if (!activeTimerAppId || !_timerEndTimestamp) {
            localStorage.removeItem(_timerStorageKey);
            return;
        }
        localStorage.setItem(_timerStorageKey, JSON.stringify({
            appId: activeTimerAppId,
            endTimestamp: _timerEndTimestamp,
            isScreenshot: !!_timerIsScreenshot,
            ownerUsername: _timerOwnerUsername || '',
            localDate: _timerLocalDate || getLocalDate(),
        }));
    } catch (error) {
        console.warn('Failed to persist active timer:', error);
    }
}

function _loadTimerReadyState() {
    try {
        var raw = localStorage.getItem(_timerReadyStateKey);
        if (!raw) {
            _timerReadyState = {};
            return;
        }
        var parsed = JSON.parse(raw);
        var today = getLocalDate();
        var nextState = {};
        if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(function(key) {
                var payload = parsed[key];
                if (!payload || typeof payload !== 'object') return;
                if (String(payload.localDate || '') !== today) return;
                nextState[key] = {
                    isScreenshot: !!payload.isScreenshot,
                    ownerUsername: String(payload.ownerUsername || ''),
                    localDate: today,
                };
            });
        }
        _timerReadyState = nextState;
    } catch (error) {
        _timerReadyState = {};
    }
}

function _persistTimerReadyState() {
    try {
        localStorage.setItem(_timerReadyStateKey, JSON.stringify(_timerReadyState || {}));
    } catch (error) {}
}

function setTimerReadyForConfirm(appId, isReady, isScreenshot, ownerUsername) {
    var key = String(Number(appId) || 0);
    if (key === '0') return;
    if (isReady) {
        _timerReadyState[key] = {
            isScreenshot: !!isScreenshot,
            ownerUsername: String(ownerUsername || ''),
            localDate: getLocalDate(),
        };
    } else {
        delete _timerReadyState[key];
    }
    _persistTimerReadyState();
}

function _getTimerReadyPayload(appId) {
    var key = String(Number(appId) || 0);
    if (key === '0') return null;
    var payload = _timerReadyState[key];
    if (!payload || typeof payload !== 'object') return null;
    if (String(payload.localDate || '') !== getLocalDate()) {
        delete _timerReadyState[key];
        _persistTimerReadyState();
        return null;
    }
    return {
        isScreenshot: !!payload.isScreenshot,
        ownerUsername: String(payload.ownerUsername || '')
    };
}

function _applyPersistedReadyTimerButtons() {
    var keys = Object.keys(_timerReadyState || {});
    if (!keys.length) return;
    keys.forEach(function(key) {
        var payload = _timerReadyState[key];
        _setTimerButtonReady(Number(key), !!(payload && payload.isScreenshot), (payload && payload.ownerUsername) || '');
    });
}

function _clearPersistedActiveTimer() {
    _timerLocalDate = '';
    try {
        localStorage.removeItem(_timerStorageKey);
    } catch (error) {
        console.warn('Failed to clear active timer state:', error);
    }
}

function _resolveCheckpointOwnerUsername(appId, ownerUsername) {
    var normalized = String(ownerUsername || '').trim().replace(/^@+/, '');
    if (normalized) {
        return normalized;
    }

    var test = typeof getMyTestById === 'function' ? getMyTestById(appId) : null;
    if (!test) {
        return '';
    }

    return String(test.owner_username || '').trim().replace(/^@+/, '');
}

function _setTimerButtonReady(finishedId, isScreenshot, ownerUsername) {
    const btn = document.getElementById('btn-confirm-' + finishedId);
    if (!btn) return false;
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(finishedId, ownerUsername);

    // Check if test has an unresolved issue — keep button disabled
    var test = myTests.find(function(item) { return Number(item.id) === Number(finishedId); });
    var testingDay = test && typeof window.getUserTestingDay === 'function'
        ? window.getUserTestingDay(test.start_date, test.testing_days)
        : null;
    var isFirstDayScreenshot = !!(isScreenshot && Number(testingDay || 0) === 1);
    if (test && test.issue_reported_at && !test.issue_fixed_at) {
        btn.disabled = true;
        btn.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        btn.style.color = 'var(--hint-color)';
        btn.style.cursor = 'not-allowed';
        btn.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
            ? window.getIssueAwaitingFixLabel(test)
            : window.t('issueAwaitingFix', {}, lang);
        return true;
    }

    btn.disabled = false;
    btn.style.backgroundColor = 'var(--success-color)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    if (isScreenshot) {
        btn.innerText = isFirstDayScreenshot
            ? window.t('screenshotBtn', {}, lang)
            : '✅ ' + window.t('completeControlDayBtn', {}, lang);
        btn.onclick = function() {
            if (isFirstDayScreenshot) {
                handleScreenshotAndConfirm(finishedId, resolvedOwnerUsername || '');
                return;
            }
            openCheckinOptionsModal(finishedId, resolvedOwnerUsername || '');
        };
    } else {
        var existingSplitGroup = btn.parentNode && btn.parentNode.classList && btn.parentNode.classList.contains('split-btn-group')
            ? btn.parentNode
            : null;
        if (existingSplitGroup) {
            btn.className = 'btn btn-success split-btn-main';
            btn.textContent = window.t('confirmTest', {}, lang);
            btn.onclick = function() {
                confirmStart(finishedId);
            };

            var existingOptionsBtn = existingSplitGroup.querySelector('.split-btn-options');
            if (!existingOptionsBtn) {
                existingOptionsBtn = document.createElement('button');
                existingOptionsBtn.className = 'btn btn-success split-btn-options';
                existingSplitGroup.appendChild(existingOptionsBtn);
            }
            existingOptionsBtn.textContent = '📎';
            existingOptionsBtn.title = window.t('checkinOptionsTitle', {}, lang);
            existingOptionsBtn.setAttribute('aria-label', window.t('checkinOptionsTitle', {}, lang));
            existingOptionsBtn.onclick = function() {
                openCheckinOptionsModal(finishedId, resolvedOwnerUsername || '');
            };
            existingSplitGroup.style.flex = '2';
            return true;
        }

        // Replace single button with split button group
        var safeOwner = window.escapeInlineJsString ? window.escapeInlineJsString(resolvedOwnerUsername || '') : (resolvedOwnerUsername || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var splitWrapper = document.createElement('div');
        splitWrapper.className = 'split-btn-group';
        splitWrapper.style.flex = '2';
        splitWrapper.innerHTML =
            '<button id="btn-confirm-' + finishedId + '" class="btn btn-success split-btn-main" onclick="confirmStart(' + finishedId + ')">' +
            window.escapeHTML(window.t('confirmTest', {}, lang)) +
            '</button>' +
            '<button class="btn btn-success split-btn-options" onclick="openCheckinOptionsModal(' + finishedId + ', \'' + safeOwner + '\')" title="' + window.escapeHTML(window.t('checkinOptionsTitle', {}, lang)) + '">' +
            '📎' +
            '</button>';
        btn.parentNode.replaceChild(splitWrapper, btn);
    }
    return true;
}

function _startActiveTimerInterval(id) {
    if (_timerIntervalId) clearInterval(_timerIntervalId);
    _timerIntervalId = setInterval(() => {
        var remaining = Math.ceil((_timerEndTimestamp - Date.now()) / 1000);
        var liveBtn = document.getElementById('btn-confirm-' + id);
        if (remaining <= 0) {
            _syncActiveTimerState();
            return;
        }
        if (liveBtn) {
            liveBtn.innerText = t.timerRemaining.replace('{sec}', remaining);
        }
    }, 1000);
}

function _syncActiveTimerState() {
    if (!activeTimerAppId || !_timerEndTimestamp) return false;
    if (_timerLocalDate && _timerLocalDate !== getLocalDate()) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
        return false;
    }
    if (Date.now() < _timerEndTimestamp) {
        _persistActiveTimer();
        return false;
    }

    const finishedId = activeTimerAppId;
    const wasScreenshot = !!_timerIsScreenshot;
    const savedOwnerUsername = _timerOwnerUsername || '';

    if (!_setTimerButtonReady(finishedId, wasScreenshot, savedOwnerUsername)) {
        // Keep expired timer state until the button is rendered after app restore.
        _persistActiveTimer();
        return false;
    }

    setTimerReadyForConfirm(finishedId, true, wasScreenshot, savedOwnerUsername);

    if (_timerIntervalId) clearInterval(_timerIntervalId);
    _timerIntervalId = null;
    _timerEndTimestamp = null;
    activeTimerAppId = null;
    _timerIsScreenshot = false;
    _timerOwnerUsername = '';
    _timerLocalDate = '';

    _clearPersistedActiveTimer();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    return true;
}

function _loadPersistedActiveTimer() {
    try {
        const raw = localStorage.getItem(_timerStorageKey);
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (!payload || !payload.appId || !payload.endTimestamp) {
            _clearPersistedActiveTimer();
            return;
        }
        activeTimerAppId = Number(payload.appId) || null;
        _timerEndTimestamp = Number(payload.endTimestamp) || null;
        _timerIsScreenshot = !!payload.isScreenshot;
        _timerOwnerUsername = String(payload.ownerUsername || '');
        _timerLocalDate = String(payload.localDate || '');
        _syncActiveTimerState();
    } catch (error) {
        console.warn('Failed to load persisted active timer:', error);
        _clearPersistedActiveTimer();
    }
}

function rerenderDynamicUi() {
    renderEvents(true);
    renderTests(true);
    renderIncomingOffers(true);
    renderProjects(true);
    renderMutualFeed(true);
    renderMutualReturns(null, true);
    renderBountyFeed(true);
    if (window.renderGuestProjectsSection) {
        window.renderGuestProjectsSection(true);
    }
    renderArchivedProjects(true);
    refreshOpenModals();
}

function refreshOpenModals() {
    const earnModal = document.getElementById('earn-bust-modal');
    if (earnModal && earnModal.classList.contains('active')) {
        renderEarnBustDynamic();
    }
    const inviteModal = document.getElementById('invite-modal');
    if (inviteModal && inviteModal.classList.contains('active') && _inviteProjectId) {
        openInviteModal(_inviteProjectId);
    }
    const guestInviteModal = document.getElementById('guest-invite-modal');
    if (guestInviteModal && guestInviteModal.classList.contains('active') && window.renderGuestInviteModal) {
        window.renderGuestInviteModal();
    }
    const reliabilityInfoModal = document.getElementById('reliability-info-modal');
    if (reliabilityInfoModal && reliabilityInfoModal.classList.contains('active') && window.showReliabilityInfo) {
        window.showReliabilityInfo();
    }
    const checkinOptionsModal = document.getElementById('checkin-options-modal');
    if (checkinOptionsModal && checkinOptionsModal.classList.contains('active') && window.renderCheckinReviewOptions) {
        window.renderCheckinReviewOptions();
    }
    const playReviewModal = document.getElementById('play-review-modal');
    if (playReviewModal && playReviewModal.classList.contains('active') && window.renderPlayReviewModal) {
        window.renderPlayReviewModal();
    }
    const projectDetailsModal = document.getElementById('project-details-modal');
    if (projectDetailsModal && projectDetailsModal.classList.contains('active') && window.openProjectDetailsModal) {
        const activeProjectId = Number(projectDetailsModal.dataset.appId || 0);
        if (activeProjectId > 0) {
            window.openProjectDetailsModal(activeProjectId);
        }
    }
    const reliabilityAlphaModal = document.getElementById('reliability-alpha-modal');
    if (reliabilityAlphaModal && reliabilityAlphaModal.classList.contains('active')) {
        if (window.renderReliabilityAlphaModal) {
            window.renderReliabilityAlphaModal();
        } else if (window.renderReliabilityDashboard) {
            window.renderReliabilityDashboard();
        }
    }
}

function refreshActiveTabData() {
    const activeTab = document.querySelector('.tab-content.active');
    const activeTabId = activeTab ? activeTab.id : '';

    if (activeTabId === 'tab-tests') {
        loadTasks().catch(error => console.error('Language refresh tasks error:', error));
        loadEvents().catch(error => console.error('Language refresh events error:', error));
        loadReliabilitySummary(true).catch(error => console.error('Language refresh reliability summary error:', error));
        loadReliabilityBreakdown(true).catch(error => console.error('Language refresh reliability breakdown error:', error));
        return;
    }

    if (activeTabId === 'tab-projects') {
        loadProjects(true).catch(error => console.error('Language refresh projects error:', error));
        loadArchivedProjects().catch(error => console.error('Language refresh archive error:', error));
        return;
    }

    if (activeTabId === 'tab-market') {
        loadMutualFeed().catch(error => console.error('Language refresh mutual error:', error));
        loadBountyFeed().catch(error => console.error('Language refresh bounty error:', error));
        return;
    }
}

function toggleLanguage() {
    applyLanguage(lang === 'ru' ? 'en' : 'ru');
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

async function loadTasks(isBackground) {
    if (_testsInFlight) {
        return _testsInFlight;
    }

    // SWR: render from cache immediately
    if (!_testsLoadedOnce) {
        var cached = getTestsCache();
        if (cached && Array.isArray(cached.tests)) {
            myTests = cached.tests;
            _testsLoadedOnce = true;
            renderTests();
            if (Array.isArray(cached.incoming_offers)) {
                incomingOffers = cached.incoming_offers;
                _offersLoadedOnce = true;
                renderIncomingOffers();
            }
        }
    }

    // Throttle background refreshes
    if (isBackground && _testsLoadedOnce && (Date.now() - (_lastFetchTimes.tests || 0)) < TESTS_FETCH_THROTTLE_MS) {
        return;
    }

    if (!_testsLoadedOnce) {
        showSkeleton('tests-list');
    }

    var requestPromise = _loadTasksImpl({ backgroundSync: !!isBackground || _testsLoadedOnce || hasTestsCache() });
    _testsInFlight = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_testsInFlight === requestPromise) {
            _testsInFlight = null;
        }
    }
}

function _mapTestsFromApi(data) {
    var today = getLocalDate();
    return (data.to_test_today || []).map(function(app) {
        var isExternal = !!app.is_external;
        var mappedId = isExternal ? (-Math.abs(Number(app.progress_id || 0))) : Number(app.app_id || 0);
        var shouldTreatFastTrackFirstDayAsDone = !!(
            isExternal
            && String(app.external_source || '').trim().toLowerCase() === 'fast_track'
            && String(app.start_date || '') === today
            && !String(app.last_check_date || '').trim()
            && Number(app.testing_days || 0) <= 1
        );
        var status = 'new';
        if (app.last_check_date === today) {
            status = 'done';
        } else if (app.last_check_date && app.last_check_date < today) {
            status = 'daily';
        } else if (app.last_check_date === null) {
            status = 'new';
        }
        if (shouldTreatFastTrackFirstDayAsDone) {
            status = 'done';
        }
        var progressStatus = String(app.progress_status || 'active').toLowerCase();
        var appStatus = String(app.app_status || 'active').toLowerCase();
        var isPendingCompletion = !isExternal && appStatus === 'pending_completion';
        var isArchivedOrCompleted = !isExternal && ((appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active');
        var existingTest = myTests.find(function(test) { return Number(test.id) === Number(mappedId); });
        var shouldPreserveLocalDoneToday = !!(
            existingTest
            && existingTest.status === 'done'
            && String(existingTest.last_check_date || '') === today
            && String(app.last_check_date || '') !== today
        );
        if (shouldPreserveLocalDoneToday) {
            status = 'done';
        }
        if (existingTest && existingTest.status === 'opened' && status !== 'done' && !isArchivedOrCompleted && !isPendingCompletion) {
            status = 'opened';
        }
        
        // Computed: archived/completed final-day tests may claim immediately,
        // while active Day 14 done shows "available tomorrow".
        var isTestedToday = status === 'done';
        // For external tests, take the max of the API value and any locally-advanced value so
        // that a proof submission that hasn't propagated to the backend yet doesn't cause the
        // computed field `external_control_day_due` to oscillate between API and local state
        // on every loadTasks() poll (which would force renderTests() on every poll).
        var apiTestingDays = Number(app.testing_days || 0);
        var testingDays = isExternal && existingTest
            ? Math.max(apiTestingDays, Number(existingTest.testing_days || 0))
            : apiTestingDays;
        if (shouldPreserveLocalDoneToday) {
            testingDays = Math.max(testingDays, Number(existingTest.testing_days || 0));
        }
        var skipsCount = countGrantSkips(app);
        if (shouldPreserveLocalDoneToday) {
            skipsCount = Math.max(skipsCount, Number(existingTest.skips_count || 0));
        }
        var resolvedCheckinsCount = shouldPreserveLocalDoneToday
            ? Math.max(Number(app.checkins_count || 0), Number(existingTest.checkins_count || 0))
            : Number(app.checkins_count || 0);
        var resolvedSkipsCount = shouldPreserveLocalDoneToday
            ? Math.max(Number(app.skips_count || 0), Number(existingTest.skips_count || 0))
            : Number(app.skips_count || 0);
        var resolvedDailyTimeline = shouldPreserveLocalDoneToday
            ? (app.daily_timeline || existingTest.daily_timeline || '')
            : (app.daily_timeline || '');
        var resolvedLastCheckDate = shouldPreserveLocalDoneToday
            ? (existingTest.last_check_date || today)
            : (shouldTreatFastTrackFirstDayAsDone ? today : (app.last_check_date || null));
        var canEverClaim = !isExternal && !app.grant_claimed && skipsCount <= 3 && app.progress_id;
        var isGrantAvailableTomorrow = !!(canEverClaim && !isArchivedOrCompleted && !isPendingCompletion && testingDays === 14 && isTestedToday);
        var isReadyToClaim = !!(canEverClaim && (testingDays >= 15 || (isArchivedOrCompleted && testingDays >= 14)));
        // Early finish: archived app qualifies for bonus (>=5 days tested, <=1 skip).
        // Cards that don't meet these criteria are excluded on the backend and skipped here too.
        var isEarlyFinish = !!(isArchivedOrCompleted && !app.grant_claimed && !isReadyToClaim && !isGrantAvailableTomorrow && testingDays >= 5 && skipsCount <= 1);

        if (isArchivedOrCompleted && !isReadyToClaim && !isGrantAvailableTomorrow) {
            status = 'done';
        }        
        return {
            reviewRejected: !!(app && app.rewards_summary && app.rewards_summary.review_rejected),
            id: mappedId,
            real_app_id: Number(app.app_id || 0) || null,
            progress_id: app.progress_id,
            name: app.name,
            package: app.package_name,
            icon_url: app.icon_url,
            google_group_url: app.google_group_url,
            instructions: app.instructions,
            status: status,
            start_date: app.start_date,
            owner_id: Number(app.owner_id || 0),
            owner_username: app.owner_username,
            active_testers_count: app.active_testers_count,
            days_since_publish: app.days_since_publish,
            google_sync_day: app.google_sync_day || 0,
            sync_message: app.sync_message || '',
            last_owner_activity: app.last_owner_activity || null,
            checkins_count: resolvedCheckinsCount,
            skips_count: resolvedSkipsCount,
            last_sync_date: app.last_sync_date || null,
            testing_days: testingDays,
            grant_claimed: !!app.grant_claimed,
            progress_status: app.progress_status || 'active',
            app_status: app.app_status || 'active',
            is_pending_completion: isPendingCompletion,
            join_type: app.join_type || 'invite',
            target_lang: app.target_lang || 'ALL',
            daily_timeline: resolvedDailyTimeline,
            archive_reason: app.archive_reason || null,
            bounty_per_tester: app.bounty_per_tester || 0,
            last_check_date: resolvedLastCheckDate,
            issue_reported_at: app.issue_reported_at || null,
            issue_reason: app.issue_reason || '',
            issue_fixed_at: app.issue_fixed_at || null,
            reciprocal_app_id: app.reciprocal_app_id || null,
            reciprocal_app_name: app.reciprocal_app_name || '',
            run_iteration: Number(app.run_iteration || 1),
            has_clicked_store: existingTest ? !!existingTest.has_clicked_store : false,
            request_reviews: app.request_reviews !== false,
            play_feedback_submitted: !!app.play_feedback_submitted,
            rewards_summary: (app && typeof app.rewards_summary === 'object' && app.rewards_summary)
                ? {
                    checkin_karma: Number(app.rewards_summary.checkin_karma || 0),
                    review_platform_karma: Number(app.rewards_summary.review_platform_karma || 0),
                    owner_karma_good: Number(app.rewards_summary.owner_karma_good || 0),
                    owner_karma_bug: Number(app.rewards_summary.owner_karma_bug || 0),
                    owner_karma_overtime: Number(app.rewards_summary.owner_karma_overtime || 0),
                    owner_karma_total: Number(app.rewards_summary.owner_karma_total || 0),
                    feedback_karma: Number(app.rewards_summary.feedback_karma || 0),
                    feedback_bust: Number(app.rewards_summary.feedback_bust || 0),
                    review_owner_boost_bust: Number(app.rewards_summary.review_owner_boost_bust || 0),
                    review_owner_boost_karma: Number(app.rewards_summary.review_owner_boost_karma || 0),
                    review_owner_boost_count: Number(app.rewards_summary.review_owner_boost_count || 0),
                    review_marked: !!app.rewards_summary.review_marked,
                    review_rejected: !!app.rewards_summary.review_rejected,
                    total_karma: Number(app.rewards_summary.total_karma || 0),
                    total_bust: Number(app.rewards_summary.total_bust || 0),
                }
                : {
                    checkin_karma: 0,
                    review_platform_karma: 0,
                    owner_karma_good: 0,
                    owner_karma_bug: 0,
                    owner_karma_overtime: 0,
                    owner_karma_total: 0,
                    feedback_karma: 0,
                    feedback_bust: 0,
                    review_owner_boost_bust: 0,
                    review_owner_boost_karma: 0,
                    review_owner_boost_count: 0,
                    review_marked: !!app.play_feedback_submitted,
                    review_rejected: false,
                    total_karma: 0,
                    total_bust: 0,
                },
            play_feedback_submitted_pending: (function() {
                if (!!(app && app.rewards_summary && app.rewards_summary.review_rejected)) return false;
                if (existingTest) {
                    return !!(existingTest.play_feedback_submitted_pending || existingTest.play_feedback_submitted);
                }
                return !!app.play_feedback_submitted;
            })(),
            owner_language: app.owner_language || null,
            isTestedToday: isTestedToday,
            isGrantAvailableTomorrow: isGrantAvailableTomorrow,
            isReadyToClaim: isReadyToClaim,
            isEarlyFinish: isEarlyFinish,
            is_external: isExternal,
            external_source: app.external_source || '',
            external_package_name: app.external_package_name || app.package_name || '',
            external_owner_telegram_id: Number(app.external_owner_telegram_id || app.owner_id || 0),
            external_category: app.external_category || 'APP',
            external_guest_app_id: app.external_guest_app_id || '',
            external_last_completed_control_day: Number(app.external_last_completed_control_day || 0),
            external_days_since_last_completed: app.external_days_since_last_completed === null || typeof app.external_days_since_last_completed === 'undefined'
                ? null
                : Number(app.external_days_since_last_completed || 0),
            external_control_day_due: !!(isExternal && isMandatoryScreenshotDay(testingDays)),
        };
    });
}

function recomputeLocalTestState(test) {
    if (!test) return test;
    var today = getLocalDate();
    var nextStatus = 'new';
    if (test.last_check_date === today) {
        nextStatus = 'done';
    } else if (test.last_check_date && test.last_check_date < today) {
        nextStatus = 'daily';
    } else if (test.last_check_date === null) {
        nextStatus = 'new';
    }

    var progressStatus = String(test.progress_status || 'active').toLowerCase();
    var appStatus = String(test.app_status || 'active').toLowerCase();
    var isExternal = !!test.is_external;
    var isPendingCompletion = !isExternal && appStatus === 'pending_completion';
    var isArchivedOrCompleted = !isExternal && ((appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active');
    if (test.status === 'opened' && nextStatus !== 'done' && !isArchivedOrCompleted && !isPendingCompletion) {
        nextStatus = 'opened';
    }

    var isTestedToday = nextStatus === 'done';
    var testingDays = Number(test.testing_days || 0);
    var skipsCount = countGrantSkips(test);
    var canEverClaim = !isExternal && !test.grant_claimed && skipsCount <= 3 && test.progress_id;

    test.isGrantAvailableTomorrow = !!(canEverClaim && !isArchivedOrCompleted && !isPendingCompletion && testingDays === 14 && isTestedToday);
    test.isReadyToClaim = !!(canEverClaim && (testingDays >= 15 || (isArchivedOrCompleted && testingDays >= 14)));
    test.isEarlyFinish = !!(isArchivedOrCompleted && !test.grant_claimed && !test.isReadyToClaim && !test.isGrantAvailableTomorrow && testingDays >= 5 && skipsCount <= 1);
    test.is_pending_completion = isPendingCompletion;
    test.external_control_day_due = !!(isExternal && isMandatoryScreenshotDay(testingDays));

    if (isArchivedOrCompleted && !test.isReadyToClaim && !test.isGrantAvailableTomorrow) {
        nextStatus = 'done';
    }

    test.status = nextStatus;
    return test;
}

function getMyTestById(appId) {
    return (myTests || []).find(function(item) {
        return Number(item.id) === Number(appId);
    }) || null;
}

function canPromptPlayReview(test) {
    if (!test) return false;
    return canTogglePlayReview(test)
        && !test.play_feedback_submitted
        && Number(test.testing_days || 0) >= 7
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function canTogglePlayReview(test) {
    if (!test) return false;
    return !!test.request_reviews
        && String(test.app_status || 'active').toLowerCase() === 'active'
        && String(test.progress_status || 'active').toLowerCase() === 'active';
}

function isPlayReviewMarked(testOrAppId) {
    var test = typeof testOrAppId === 'object'
        ? testOrAppId
        : getMyTestById(testOrAppId);
    if (test && test.rewards_summary && test.rewards_summary.review_rejected) {
        return false;
    }
    return !!(test && (test.play_feedback_submitted || test.play_feedback_submitted_pending));
}

function getPlayReviewUrl(appId) {
    var test = getMyTestById(appId);
    var pkg = String(test && test.package || '').trim();
    if (!pkg) return '';
    return 'https://play.google.com/store/apps/details?id=' + encodeURIComponent(pkg);
}

async function confirmPlayReviewMarking() {
    return new Promise(function(resolve) {
        var modal = document.getElementById('play-review-confirm-modal');
        var title = document.getElementById('t-playReviewConfirmTitle');
        var text = document.getElementById('t-playReviewConfirmText');
        var cancelBtn = document.getElementById('t-playReviewConfirmCancel');
        var sendBtn = document.getElementById('t-playReviewConfirmSend');

        if (!modal || !title || !text || !cancelBtn || !sendBtn) {
            var message = window.t('playReviewConfirmPenalty', {}, lang);
            if (tg && typeof tg.showConfirm === 'function') {
                tg.showConfirm(message, function(ok) { resolve(!!ok); });
                return;
            }
            resolve(confirm(message));
            return;
        }

        title.innerText = window.t('playReviewConfirmModalTitle', {}, lang);
        text.innerText = window.t('playReviewConfirmPenalty', {}, lang);
        cancelBtn.innerText = window.t('playReviewConfirmModalCancel', {}, lang);
        sendBtn.innerText = window.t('playReviewConfirmModalSendDm', {}, lang);

        function cleanup() {
            modal.classList.remove('active');
            modal.onclick = null;
            cancelBtn.onclick = null;
            sendBtn.onclick = null;
        }

        modal.onclick = function(event) {
            if (event && event.target !== modal) return;
            cleanup();
            resolve(false);
        };
        cancelBtn.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
            cleanup();
            resolve(false);
        };
        sendBtn.onclick = function(event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
            cleanup();
            resolve(true);
        };

        modal.classList.add('active');
    });
}

function openPlayReviewOwnerDm(appId) {
    var test = getMyTestById(appId);
    if (!test) return false;
    var ownerUsername = String(test.owner_username || '').trim().replace(/^@+/, '');
    if (!ownerUsername) {
        if (tg && typeof tg.showAlert === 'function') {
            tg.showAlert(window.t('playReviewMissingOwnerLink', {}, lang));
        } else {
            alert(window.t('playReviewMissingOwnerLink', {}, lang));
        }
        return false;
    }
    var message = window.t('playReviewDmTemplate', {
        app_name: String(test.name || window.t('unknownLabel', {}, lang)),
    }, lang);
    var dmUrl = `https://t.me/${ownerUsername}?text=${encodeURIComponent(message)}`;
    try {
        if (tg && typeof tg.openTelegramLink === 'function') {
            tg.openTelegramLink(dmUrl);
        } else if (tg && typeof tg.openLink === 'function') {
            tg.openLink(dmUrl);
        } else {
            window.open(dmUrl, '_blank', 'noopener');
        }
        return true;
    } catch (error) {
        console.error('openPlayReviewOwnerDm error:', error);
        return false;
    }
}

async function setPlayReviewSubmittedPending(appId, nextValue) {
    var test = getMyTestById(appId);
    if (!test) return false;

    var normalized = !!nextValue;
    if (normalized && !canTogglePlayReview(test)) {
        return false;
    }

    if (normalized && !isPlayReviewMarked(test)) {
        var confirmed = await confirmPlayReviewMarking();
        if (!confirmed) {
            refreshOpenModals();
            return false;
        }
        if (!openPlayReviewOwnerDm(appId)) {
            refreshOpenModals();
            return false;
        }
    }

    test.play_feedback_submitted_pending = normalized || !!test.play_feedback_submitted;
    if (test.rewards_summary && normalized) {
        test.rewards_summary.review_rejected = false;
    }
    persistTestsCacheSnapshot();
    if (typeof window.renderTests === 'function') {
        window.renderTests(true);
    }
    refreshOpenModals();
    return true;
}

function _setIssueUiState(id, blocked) {
    var btnConfirm = document.getElementById('btn-confirm-' + id);
    if (!btnConfirm) return;
    if (blocked) {
        var test = myTests.find(function(item) { return Number(item.id) === Number(id); });
        btnConfirm.disabled = true;
        btnConfirm.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
            ? window.getIssueAwaitingFixLabel(test)
            : window.t('issueAwaitingFix', {}, lang);
        btnConfirm.style.backgroundColor = 'rgba(142, 142, 147, 0.2)';
        btnConfirm.style.color = 'var(--hint-color)';
    }
}

function _onStoreLinkClickedForIssueFlow(id) {
    var test = myTests.find(function(item) { return Number(item.id) === Number(id); });
    if (!test) return;
    test.has_clicked_store = true;

    var issueBtn = document.getElementById('btn-issue-' + id);
    if (issueBtn) {
        issueBtn.style.display = 'inline-flex';
        issueBtn.disabled = !!test.issue_reported_at && !test.issue_fixed_at;
        issueBtn.style.opacity = issueBtn.disabled ? '0.55' : '1';
    }

    persistTestsCacheSnapshot();
}

async function _loadTasksImpl(options) {
    var shouldMarkBackgroundSync = !!(options && options.backgroundSync);
    if (shouldMarkBackgroundSync) {
        beginBackgroundSync('tests');
    }
    _apiStart();
    try {
        var response = await fetchWithRetry(API_BASE + '/tasks/' + userId);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        _userEmail = String(data.user_email || '').trim();
        window.App.userEmail = _userEmail;
        var nextTests = _mapTestsFromApi(data);
        var nextOffers = Array.isArray(data.incoming_offers) ? data.incoming_offers : null;

        // Diff: only re-render if changed
        var testsChanged = JSON.stringify(myTests) !== JSON.stringify(nextTests);
        if (testsChanged) {
            myTests = nextTests;
            renderTests();
        }

        if (nextOffers !== null) {
            var offersChanged = JSON.stringify(incomingOffers) !== JSON.stringify(nextOffers);
            if (offersChanged || !_offersLoadedOnce) {
                incomingOffers = nextOffers;
                setOffersCache(incomingOffers);
                _offersLoadedOnce = true;
                _offersLoadError = false;
                renderIncomingOffers();
            }
        }

        // Update cache
        persistTestsCacheSnapshot();
        _testsLoadedOnce = true;
        _lastFetchTimes.tests = Date.now();
        loadReliabilitySummary(true).catch(function() {});

    } catch (error) {
        console.error('Error loading tasks:', error);
        if (_testsLoadedOnce && myTests.length > 0) {
            // Have data from cache, just show error toast
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'tasks');
        } else {
            showRetry('tests-list', 'loadTasks()');
        }
        if (!_offersLoadedOnce) {
            incomingOffers = getOffersCache() || [];
            _offersLoadedOnce = true;
            _offersLoadError = incomingOffers.length === 0;
        }
        renderIncomingOffers();
    } finally {
        _apiEnd();
        if (shouldMarkBackgroundSync) {
            endBackgroundSync('tests');
        }
    }
}

async function loadMutualFeed() {
    if (_marketInFlight.mutual) {
        return _marketInFlight.mutual;
    }

    hydrateMarketFromCache();
    const hasLocalData = Array.isArray(mutualSeeking) && mutualSeeking.length > 0
        || Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0;
    if (!hasThrottleWindowPassed('mutual') && hasLocalData) {
        renderMutualFeed();
        return;
    }

    const requestPromise = _loadMutualFeedImpl({ backgroundSync: hasLocalData || hasMarketCache(), forceSkeleton: _marketForceSkeleton });
    _marketInFlight.mutual = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_marketInFlight.mutual === requestPromise) {
            _marketInFlight.mutual = null;
        }
        renderMutualFeed();
    }
}

async function _loadMutualFeedImpl(options) {
    const cached = getMarketCache();
    const hasMutualCache = !!(cached && cached.mutual);
    const shouldMarkBackgroundSync = !!(options && options.backgroundSync);
    const shouldShowSkeleton = !!(options && options.forceSkeleton);
    const hadVisibleData = (Array.isArray(mutualSeeking) && mutualSeeking.length > 0)
        || (Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0)
        || (Array.isArray(mutualReturns) && mutualReturns.length > 0);

    if (hasMutualCache) {
        mutualSeeking = cached.mutual.seeking || [];
        mutualPrelaunch = cached.mutual.prelaunch || [];
        mutualReturns = cached.mutual.returns || [];
        renderMutualFeed();
        if (window.renderMutualReturns) {
            window.renderMutualReturns(mutualReturns);
        }
    } else if (shouldShowSkeleton) {
        showSkeleton('mutual-seeking-list');
        showSkeleton('mutual-prelaunch-list');
        const returnsContainer = document.getElementById('mutual-returns-container');
        if (returnsContainer) {
            returnsContainer.style.display = '';
            showSkeleton('mutual-returns-list');
        }
    }

    if (shouldMarkBackgroundSync) {
        beginBackgroundSync('market');
    }
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/feed/mutual/${userId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const nextMutual = {
            seeking: data.seeking || [],
            prelaunch: data.prelaunch || [],
            returns: data.returns || [],
        };
        const nextCount = nextMutual.seeking.length + nextMutual.prelaunch.length + nextMutual.returns.length;
        const prevMutual = cached && cached.mutual ? cached.mutual : null;
        const changed = JSON.stringify(prevMutual) !== JSON.stringify(nextMutual);
        const canApply = _resolveMarketResponse('mutual', nextCount, hadVisibleData);

        if (canApply && (!hasMutualCache || changed)) {
            mutualSeeking = nextMutual.seeking;
            mutualPrelaunch = nextMutual.prelaunch;
            mutualReturns = nextMutual.returns;
            renderMutualFeed();
            if (window.renderMutualReturns) {
                window.renderMutualReturns(mutualReturns);
            }
        }

        if (canApply) {
            const nextCache = Object.assign({}, cached || {});
            nextCache.mutual = nextMutual;
            nextCache.ts = Date.now();
            setMarketCache(nextCache);
        }
        markMarketFetchSuccess('mutual');
        window._marketLoadedOnce = true;
    } catch (error) {
        console.error('Error loading mutual feed:', error);
        const hasLocalData = Array.isArray(mutualSeeking) && mutualSeeking.length > 0
            || Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0;
        if (!hasLocalData) {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'mutual_feed');
            showRetry('mutual-seeking-list', 'forceRefreshMarket()');
            showRetry('mutual-prelaunch-list', 'forceRefreshMarket()');
            const returnsContainer = document.getElementById('mutual-returns-container');
            if (returnsContainer) {
                returnsContainer.style.display = '';
                showRetry('mutual-returns-list', 'forceRefreshMarket()');
            }
        } else {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'mutual_feed');
        }
    } finally {
        _apiEnd();
        if (shouldMarkBackgroundSync) {
            endBackgroundSync('market');
        }
    }
}

async function loadBountyFeed() {
    if (_marketInFlight.bounty) {
        return _marketInFlight.bounty;
    }

    hydrateMarketFromCache();
    const hasLocalData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
    if (!hasThrottleWindowPassed('bounty') && hasLocalData) {
        renderBountyFeed();
        return;
    }

    const requestPromise = _loadBountyFeedImpl({ backgroundSync: hasLocalData || hasMarketCache(), forceSkeleton: _marketForceSkeleton });
    _marketInFlight.bounty = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_marketInFlight.bounty === requestPromise) {
            _marketInFlight.bounty = null;
        }
        renderBountyFeed();
    }
}

async function _loadBountyFeedImpl(options) {
    const cached = getMarketCache();
    const hasBountyCache = !!(cached && cached.bounty && Array.isArray(cached.bounty.contracts));
    const shouldMarkBackgroundSync = !!(options && options.backgroundSync);
    const shouldShowSkeleton = !!(options && options.forceSkeleton);
    const hadVisibleData = Array.isArray(bountyContracts) && bountyContracts.length > 0;

    if (hasBountyCache) {
        bountyContracts = cached.bounty.contracts || [];
        renderBountyFeed();
    } else if (shouldShowSkeleton) {
        showSkeleton('bounty-list');
    }

    if (shouldMarkBackgroundSync) {
        beginBackgroundSync('market');
    }
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/feed/bounty/${userId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const nextBounty = {
            contracts: data.contracts || [],
        };
        const nextCount = nextBounty.contracts.length;
        const prevBounty = cached && cached.bounty ? cached.bounty : null;
        const changed = JSON.stringify(prevBounty) !== JSON.stringify(nextBounty);
        const canApply = _resolveMarketResponse('bounty', nextCount, hadVisibleData);

        if (canApply && (!hasBountyCache || changed)) {
            bountyContracts = nextBounty.contracts;
            renderBountyFeed();
        }

        if (canApply) {
            const nextCache = Object.assign({}, cached || {});
            nextCache.bounty = nextBounty;
            nextCache.ts = Date.now();
            setMarketCache(nextCache);
        }
        markMarketFetchSuccess('bounty');
    } catch (error) {
        console.error('Error loading bounty feed:', error);
        const hasLocalData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
        if (!hasLocalData) {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'bounty_feed');
            showRetry('bounty-list', 'forceRefreshMarket()');
        } else {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'bounty_feed');
        }
    } finally {
        _apiEnd();
        if (shouldMarkBackgroundSync) {
            endBackgroundSync('market');
        }
    }
}

async function forceRefreshMarket() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    resetMarketFetchThrottle();
    resetMarketFeedStates();
    setMarketForceSkeleton(true);

    var hasMutualData = (Array.isArray(mutualSeeking) && mutualSeeking.length > 0)
        || (Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0);
    var hasBountyData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
    if (!hasMutualData) {
        showSkeleton('mutual-seeking-list');
        showSkeleton('mutual-prelaunch-list');
    }
    if (!hasBountyData) {
        showSkeleton('bounty-list');
    }
    try {
        await Promise.all([loadMutualFeed(), loadBountyFeed()]);
    } catch (error) {
        console.error('Force refresh market error:', error);
    } finally {
        setMarketForceSkeleton(false);
    }
}

async function loadEvents(retryCount = 0) {
    _apiStart();
    try {
        const response = await fetch(`${API_BASE}/events`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        communityEvents = data.events || [];
        renderEvents();
    } catch (error) {
        console.error('Error loading events:', error);
        if (retryCount < 2) {
            const delay = (retryCount + 1) * 2000;
            setTimeout(() => loadEvents(retryCount + 1), delay);
        } else {
            communityEvents = [];
            renderEvents();
        }
    } finally {
        _apiEnd();
    }
}

async function loadProjects(isBackground) {
    if (_projectsInFlight) {
        return _projectsInFlight;
    }

    // SWR: render from cache immediately
    if (!_projectsLoadedOnce) {
        var cached = getProjectsCache();
        if (cached && Array.isArray(cached.projects)) {
            myProjects = cached.projects;
            visibilityStats = cached.visibilityStats || {};
            _projectsLoadedOnce = true;
            myProjectsLoadError = false;
            renderProjects();
        }
    }

    // Throttle background refreshes
    if (isBackground && _projectsLoadedOnce && (Date.now() - (_lastFetchTimes.projects || 0)) < PROJECTS_FETCH_THROTTLE_MS) {
        return;
    }

    if (!_projectsLoadedOnce && !isBackground) {
        showSkeleton('projects-list');
    }

    var requestPromise = _loadProjectsImpl({ backgroundSync: !!isBackground || _projectsLoadedOnce || hasProjectsCache() });
    _projectsInFlight = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_projectsInFlight === requestPromise) {
            _projectsInFlight = null;
        }
    }
}

async function publishProjectToMarket(projectId) {
    if (!projectId) return null;

    var actionKey = 'publish_market_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    _apiStart();
    try {
        var response = await fetch(`${API_BASE}/projects/${projectId}/publish_to_market`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data && data.details ? data.details : {});
            return null;
        }
        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project) {
            project.published_to_market_at = data.published_to_market_at || new Date().toISOString();
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('invitePublishSuccess', {}, lang));
        if (window.renderProjects) window.renderProjects(true);
        refreshOpenModals();
        return data.topic_link || true;
    } catch (error) {
        console.error('Publish to market error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

function refreshMarketAfterMassInvite() {
    resetMarketFeedStates();
    resetMarketFetchThrottle();
    setMarketCache(null);
}

async function startMassInvite(projectId) {
    if (!projectId) return null;

    var actionKey = 'mass_invite_start_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    var btn = document.getElementById('mass-invite-btn');
    var originalLabel = btn ? btn.textContent : '';
    if (btn) {
        btn.classList.add('is-loading');
        btn.disabled = true;
    }

    _apiStart();
    try {
        var response = await fetch(`${API_BASE}/projects/${projectId}/mass_invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data && data.details ? data.details : {});
            return null;
        }

        var sentCount = Number(data.sent_count || 0);
        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project && sentCount > 0) {
            project.last_mass_invite_at = data.last_mass_invite_at || new Date().toISOString();
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (sentCount > 0) {
            showToast(window.t('massInviteLaunchSuccess', { count: sentCount }, lang));
            renderProjects(true);
            refreshOpenModals();
            await loadProjects(true);
            refreshMarketAfterMassInvite();
            await Promise.all([loadMutualFeed(), loadBountyFeed()]);
        } else {
            showToast(window.t('massInviteNoCandidates', {}, lang));
            await loadProjects(true);
        }
        return data;
    } catch (error) {
        console.error('Mass invite launch error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        if (btn) {
            btn.classList.remove('is-loading');
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function resetMassInviteCooldown(projectId) {
    if (!projectId) return null;

    var actionKey = 'mass_invite_reset_' + projectId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    _apiStart();
    try {
        var response = await fetch(`${API_BASE}/projects/${projectId}/mass_invite/reset_cooldown`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data && data.details ? data.details : {});
            return null;
        }

        var project = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(projectId);
        });
        if (project) {
            project.last_mass_invite_at = null;
        }
        if (typeof data.balance_bust !== 'undefined') {
            visibilityStats.balance_bust = Number(data.balance_bust || 0);
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('massInviteResetSuccess', {}, lang));
        renderProjects(true);
        refreshOpenModals();
        loadProjects(true).catch(function() {});
        return data;
    } catch (error) {
        console.error('Mass invite cooldown reset error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

function _mapProjectsFromApi(data) {
    return (data.projects || []).map(function(project) {
        var testers = Array.isArray(project.testers) ? project.testers : [];
        var hasAccessError = testers.some(function(tester) {
            return !!tester.issue_reported_at && !tester.issue_fixed_at;
        });
        var mappedTesters = testers.map(function(tester) {
            return Object.assign({}, tester, {
                progress_id: Number(tester.progress_id || 0),
                tester_id: Number(tester.tester_id || 0),
                checkins_count: Number(tester.checkins_count || 0),
                skips_count: Number(tester.skips_count || 0),
                is_external: !!tester.is_external,
                is_guest_tester: !!tester.is_guest_tester,
                external_source: tester.external_source || '',
                external_last_completed_control_day: Number(tester.external_last_completed_control_day || 0),
                external_days_since_last_completed: tester.external_days_since_last_completed === null || typeof tester.external_days_since_last_completed === 'undefined'
                    ? null
                    : Number(tester.external_days_since_last_completed || 0),
            });
        });
        return {
            id: project.app_id,
            status: hasAccessError ? 'access_error' : (project.status || 'active'),
            app_status: project.status || 'active',
            name: project.name,
            package: project.package_name,
            icon_url: project.icon_url,
            google_group_url: project.google_group_url,
            instructions: project.instructions || '',
            testers: mappedTesters,
            is_visible: project.is_visible !== false,
            created_at: project.created_at || null,
            likes: project.likes || [],
            likes_used: project.likes_used || 0,
            likes_max: project.likes_max || 1,
            mode: project.mode || 'mutual',
            target_lang: project.target_lang || 'ALL',
            request_reviews: project.request_reviews !== false,
            limit_mutual: project.limit_mutual || 0,
            limit_bounty: project.limit_bounty || 0,
            bounty_per_tester: project.bounty_per_tester || 0,
            google_sync_day: project.google_sync_day || 0,
            sync_message: project.sync_message || '',
            last_sync_date: project.last_sync_date || null,
            last_owner_activity: project.last_owner_activity || null,
            published_to_market_at: project.published_to_market_at || null,
            last_mass_invite_at: project.last_mass_invite_at || null,
            run_iteration: Number(project.run_iteration || 1),
            feedback_new_count: project.feedback_new_count || 0,
            feedback_total_count: project.feedback_total_count || 0,
            guest_testers_count: Number(project.guest_testers_count || 0),
        };
    });
}

function _mapStatsFromApi(data) {
    return {
        ownerKarma: data.karma || 0,
        rank: data.rank || 0,
        total_developers: data.total_developers || 0,
        my_active_tests: data.my_active_tests || 0,
        my_total_tests: data.my_total_tests || 0,
        balance_bust: data.balance_bust || 0,
        top_thresholds: data.top_thresholds || {},
        completed_tests: data.completed_tests || 0,
        total_expected_checkins: data.total_expected_checkins || 0,
        total_actual_checkins: data.total_actual_checkins || 0,
        golden_count: data.golden_count || 0,
        grant_tests_count: data.grant_tests_count || 0,
    };
}

async function _readJsonResponseSafely(response, requestLabel) {
    if (!response) return null;

    var bodyText = '';
    try {
        bodyText = await response.text();
    } catch (error) {
        console.error(String(requestLabel || 'API response') + ' body read failed:', error);
        return null;
    }

    if (!bodyText) {
        return null;
    }

    try {
        return JSON.parse(bodyText);
    } catch (error) {
        console.error(String(requestLabel || 'API response') + ' JSON parse failed:', error, bodyText.slice(0, 400));
        return null;
    }
}

async function _confirmProjectSyncPersistence(appId, expectedDay, expectedMessage) {
    var normalizedAppId = Number(appId || 0);
    var normalizedDay = Number(expectedDay || 0);
    var normalizedMessage = String(expectedMessage || '').trim();
    if (!normalizedAppId || !normalizedDay || !userId) {
        return null;
    }

    await new Promise(function(resolve) {
        setTimeout(resolve, SYNC_CONFIRMATION_DELAY_MS);
    });

    try {
        var response = await fetchWithRetry(API_BASE + '/projects/' + userId, { timeoutMs: 12000 }, 1);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        var data = await _readJsonResponseSafely(response, 'Project sync confirmation');
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid project sync confirmation payload');
        }

        var freshProjects = _mapProjectsFromApi(data);
        var freshStats = _mapStatsFromApi(data);
        var confirmedProject = freshProjects.find(function(project) {
            return Number(project.id) === normalizedAppId;
        });

        if (confirmedProject) {
            var confirmedDay = Number(confirmedProject.google_sync_day || 0);
            var confirmedMessage = String(confirmedProject.sync_message || '').trim();
            if (confirmedDay === normalizedDay && confirmedMessage === normalizedMessage) {
                myProjects = freshProjects;
                visibilityStats = freshStats;
                _projectsLoadedOnce = true;
                myProjectsLoadError = false;
                _lastFetchTimes.projects = Date.now();
                setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
                return confirmedProject;
            }
        }
    } catch (error) {
        console.error('Project sync confirmation check failed:', error);
    }

    return null;
}

function _markPostSyncRefreshCooldown() {
    var now = Date.now();
    _lastFetchTimes.projects = now;
    _lastFetchTimes.tests = now;
    _lastFetchTimes.offers = now;
    _lastFetchTimes.reliabilitySummary = now;
    _lastFetchTimes.reliabilityBreakdown = now;
}

async function _loadProjectsImpl(options) {
    var shouldMarkBackgroundSync = !!(options && options.backgroundSync);
    if (shouldMarkBackgroundSync) {
        beginBackgroundSync('projects');
    }
    _apiStart();
    try {
        var response = await fetchWithRetry(API_BASE + '/projects/' + userId);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var data = await response.json();
        var nextProjects = _mapProjectsFromApi(data);
        var nextStats = _mapStatsFromApi(data);

        // Diff: only re-render if changed
        var projectsChanged = JSON.stringify(myProjects) !== JSON.stringify(nextProjects);
        var statsChanged = JSON.stringify(visibilityStats) !== JSON.stringify(nextStats);

        if (projectsChanged || statsChanged) {
            myProjects = nextProjects;
            visibilityStats = nextStats;
            myProjectsLoadError = false;
            renderProjects();
            if (typeof window.renderTests === 'function' && Array.isArray(myTests) && myTests.length) {
                window.renderTests();
            }
        }

        // Update cache
        setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
        _projectsLoadedOnce = true;
        _lastFetchTimes.projects = Date.now();
        myProjectsLoadError = false;

    } catch (error) {
        console.error('Error loading projects:', error);
        myProjectsLoadError = true;
        if (_projectsLoadedOnce && myProjects.length > 0) {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'projects');
        } else {
            showRetry('projects-list', 'loadProjects()');
        }
    } finally {
        _apiEnd();
        if (shouldMarkBackgroundSync) {
            endBackgroundSync('projects');
        }
    }
}

async function decideOffer(offerId, action, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (!offerId) return;

    try {
        const response = await fetch(`${API_BASE}/offers/${offerId}/${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await Promise.all([loadTasks(), loadIncomingOffers({ background: true })]);
        loadProjects(true).catch(() => {});
    } catch (error) {
        console.error('Offer decision error:', error);
        handleApiError('network_error');
    }
}

function markMutualOfferPendingUi(targetAppId, targetOwnerId, sourceButton) {
    if (sourceButton && sourceButton.classList) {
        sourceButton.textContent = window.t('offerPending');
        sourceButton.classList.add('pending');
        sourceButton.classList.add('disabled');
        sourceButton.disabled = true;
    }

    const selector = 'button[data-offer-target-app="' + targetAppId + '"][data-offer-target-owner="' + targetOwnerId + '"]';
    const relatedButtons = document.querySelectorAll(selector);
    relatedButtons.forEach(function(button) {
        button.textContent = window.t('offerPending');
        button.classList.add('pending');
        button.classList.add('disabled');
        button.disabled = true;
    });
}

async function createMutualOffer(targetAppId, targetOwnerId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var sourceButton = event && event.currentTarget ? event.currentTarget : null;
    if (myProjectsLoadError) {
        if (tg.showAlert) tg.showAlert(window.t('projectsLoadingAlert'));
        else alert(window.t('projectsLoadingAlert'));
        loadProjects(true).catch(function() {});
        return;
    }
    const eligible = typeof window.getAvailableMutualProjectsForOwner === 'function'
        ? window.getAvailableMutualProjectsForOwner(targetOwnerId)
        : myProjects.filter(function(project) {
            return project && (project.mode === 'mutual' || project.mode === 'hybrid') && project.id;
        });
    const blockedProjects = await fetchBlockedOfferProjects(targetOwnerId, true);
    showProjectSelectModal(eligible, targetAppId, targetOwnerId, {
        sourceButton: sourceButton,
        targetAppId: targetAppId,
        targetOwnerId: targetOwnerId,
        blockedProjects: blockedProjects,
    });
}

async function joinDirect(appId) {
    var actionKey = 'joinDirect_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    const rollback = [...mutualSeeking];
    mutualSeeking = mutualSeeking.filter(function(card) { return card.app_id !== appId; });
    renderMutualFeed();
    closeProjectSelectModal();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, allow_over_limit: false, join_type: 'direct' })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            mutualSeeking = rollback;
            renderMutualFeed();
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadMutualFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join direct error:', error);
        mutualSeeking = rollback;
        renderMutualFeed();
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, uiContext) {
    var actionKey = 'sendOffer_' + targetAppId + '_' + proposerAppId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/offers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: targetOwnerId,
                target_app_id: targetAppId,
                proposer_id: userId,
                proposer_app_id: proposerAppId
            }),
            timeoutMs: 20000,
        });

        let result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok) {
            const code = getBackendErrorCode(result) || 'err_default_api';
            const details = result && result.details ? result.details : {};
            handleApiError(code, details);
            return;
        }

        if (!result || result.status !== 'success') {
            const code = getBackendErrorCode(result) || 'err_default_api';
            const details = result && result.details ? result.details : {};
            handleApiError(code, details);
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (result.mode === 'auto_accepted') {
            closeProjectSelectModal();
            showToast(window.t('offerStartedInstantly', {}, lang));
            switchTab('tests');
            await Promise.allSettled([
                loadTasks(true),
                loadProjects(true),
                loadIncomingOffers({ background: true })
            ]);
            return;
        }
        if (uiContext && uiContext.targetOwnerId) {
            var ownerKey = String(uiContext.targetOwnerId);
            var ownerLocks = _blockedOfferProjectsByOwner[ownerKey] || {};
            ownerLocks[String(proposerAppId)] = {
                proposer_app_id: proposerAppId,
                target_app_id: targetAppId,
                target_app_name: '',
                created_at: new Date().toISOString(),
            };
            _blockedOfferProjectsByOwner[ownerKey] = ownerLocks;
        }
        markMutualOfferPendingUi(targetAppId, targetOwnerId, uiContext && uiContext.sourceButton);
        showToast(window.t('offerSentSuccess'));
        closeProjectSelectModal();
    } catch (error) {
        console.error('Create offer error:', error);
        handleApiError('network_error');
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function joinMutual(appId, allowOverLimit = false) {
    var actionKey = 'joinMutual_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    // Optimistic UI: remove card immediately, rollback on error
    const rollback = [...mutualSeeking];
    const rollbackPrelaunch = [...mutualPrelaunch];
    const rollbackReturns = [...mutualReturns];
    mutualSeeking = mutualSeeking.filter(c => c.app_id !== appId);
    mutualPrelaunch = mutualPrelaunch.filter(c => c.app_id !== appId);
    mutualReturns = mutualReturns.filter(c => c.app_id !== appId);
    renderMutualFeed();
    if (window.renderMutualReturns) {
        window.renderMutualReturns(mutualReturns, true);
    }
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, allow_over_limit: allowOverLimit })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            mutualSeeking = rollback;
            mutualPrelaunch = rollbackPrelaunch;
            mutualReturns = rollbackReturns;
            renderMutualFeed();
            if (window.renderMutualReturns) {
                window.renderMutualReturns(mutualReturns, true);
            }
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadMutualFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join mutual error:', error);
        mutualSeeking = rollback;
        mutualPrelaunch = rollbackPrelaunch;
        mutualReturns = rollbackReturns;
        renderMutualFeed();
        if (window.renderMutualReturns) {
            window.renderMutualReturns(mutualReturns, true);
        }
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function joinBounty(appId) {
    var actionKey = 'joinBounty_' + appId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    // Optimistic UI: remove card immediately, rollback on error
    const rollback = [...bountyContracts];
    bountyContracts = bountyContracts.filter(c => c.app_id !== appId);
    renderBountyFeed();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    switchTab('tests');

    try {
        const response = await fetch(`${API_BASE}/feed/bounty/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            bountyContracts = rollback;
            renderBountyFeed();
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        loadTasks(true);
        loadBountyFeed();
        loadProjects(true);
    } catch (error) {
        console.error('Join bounty error:', error);
        bountyContracts = rollback;
        renderBountyFeed();
        if (tg.showAlert) tg.showAlert(t.networkError);
    } finally {
        _pendingActions.delete(actionKey);
    }
}

function startTimer(id, pkg, isScreenshotDay = false, ownerUsername = '') {
    var resolvedOwnerUsername = _resolveCheckpointOwnerUsername(id, ownerUsername);
    // Clean up stale timer (tab suspension / cache restoration scenario)
    if (activeTimerAppId !== null && _timerLocalDate && _timerLocalDate !== getLocalDate()) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
    } else if (activeTimerAppId !== null && _timerEndTimestamp && Date.now() > _timerEndTimestamp + 2000) {
        if (_timerIntervalId) clearInterval(_timerIntervalId);
        _timerIntervalId = null;
        _timerEndTimestamp = null;
        activeTimerAppId = null;
        _timerIsScreenshot = false;
        _timerOwnerUsername = '';
        _clearPersistedActiveTimer();
    }

    if (activeTimerAppId === id) {
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        _onStoreLinkClickedForIssueFlow(id);
        return;
    }

    var readyPayload = _getTimerReadyPayload(id);
    if (readyPayload) {
        _setTimerButtonReady(id, readyPayload.isScreenshot, readyPayload.ownerUsername || resolvedOwnerUsername);
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        _onStoreLinkClickedForIssueFlow(id);
        return;
    }

    if (activeTimerAppId !== null && activeTimerAppId !== id) {
        showCustomAlert(t.antiFraudAlert);
        return;
    }
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);

    const btn = document.getElementById(`btn-confirm-${id}`);
    if (!btn || !btn.disabled) return;

    activeTimerAppId = id;
    _timerEndTimestamp = Date.now() + 15000;
    _timerIsScreenshot = isScreenshotDay;
    _timerOwnerUsername = resolvedOwnerUsername;
    _timerLocalDate = getLocalDate();
    _persistActiveTimer();
    btn.innerText = t.timerRemaining.replace('{sec}', 15);
    _startActiveTimerInterval(id);
}

function _restoreActiveTimer() {
    _applyPersistedReadyTimerButtons();
    if (!activeTimerAppId || !_timerEndTimestamp) return;
    if (_syncActiveTimerState()) return;
    var remaining = Math.ceil((_timerEndTimestamp - Date.now()) / 1000);
    var btn = document.getElementById('btn-confirm-' + activeTimerAppId);
    if (!btn) return;
    if (remaining <= 0) {
        _syncActiveTimerState();
    } else {
        btn.innerText = window.t('timerRemaining', {}, lang).replace('{sec}', remaining);
        _persistActiveTimer();
        _startActiveTimerInterval(activeTimerAppId);
    }
}
window._restoreActiveTimer = _restoreActiveTimer;

function openPlay(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);
    const test = myTests.find(item => item.id === id);
    if (test) {
        test.status = 'opened';
        renderTests();
    }
}

function handleFirstDownload(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    setFirstDayScreenshotVisible(id, true);
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    _onStoreLinkClickedForIssueFlow(id);
    setTimeout(() => {
        const screenshotBox = document.getElementById(`new-screenshot-box-${id}`);
        if (screenshotBox) screenshotBox.style.display = 'block';
    }, 1000);
}

async function handleScreenshotAndConfirm(id, ownerUsername) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    if (window.openScreenshotGuardModal) {
        window.openScreenshotGuardModal(id, ownerUsername);
        return;
    }
    openReportModal(id, ownerUsername);
}

async function submitIssueReport(appId) {
    if (!appId) return;
    var test = myTests.find(function(item) { return Number(item.id) === Number(appId); });
    if (!test) return;

    var reasonEl = document.getElementById('issue-report-text');
    var emailEl = document.getElementById('issue-report-email');
    var reason = reasonEl ? String(reasonEl.value || '').trim() : '';
    var email = emailEl ? String(emailEl.value || '').trim() : '';

    if (email && !isValidEmail(email)) {
        showToast(window.t('reportIssueInvalidEmail', {}, lang));
        if (emailEl && typeof emailEl.focus === 'function') {
            emailEl.focus();
        }
        return;
    }

    try {
        var response = await fetch(`${API_BASE}/projects/${appId}/report_issue`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, issue_reason: reason, email: email })
        });
        var result = await response.json();
        if (!response.ok || !result || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }

        test.issue_reported_at = result.issue_reported_at || new Date().toISOString();
        test.issue_reason = reason;
        test.issue_fixed_at = null;
        _userEmail = String(result.email || email || _userEmail || '').trim();
        window.App.userEmail = _userEmail;
        _setIssueUiState(appId, true);

        var issueBtn = document.getElementById('btn-issue-' + appId);
        if (issueBtn) {
            issueBtn.disabled = true;
            issueBtn.style.opacity = '0.55';
            issueBtn.innerText = typeof window.getIssueAwaitingFixLabel === 'function'
                ? window.getIssueAwaitingFixLabel(test)
                : window.t('issueAwaitingFix', {}, lang);
        }

        persistTestsCacheSnapshot();
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }
        if (window.closeIssueReportModal) window.closeIssueReportModal();
        showToast(window.t('reportIssueSuccess', {}, lang));
    } catch (error) {
        console.error('Report issue error:', error);
        handleApiError('network_error');
    }
}

async function sendReport() {
    const text = document.getElementById('report-text').value.trim();
    const ownerUsername = (_reportOwnerUsername || '').replace('@', '').trim();
    const appId = _reportAppId;

    _reportAppId = null;
    _reportOwnerUsername = null;
    document.getElementById('report-modal').classList.remove('active');

    if (appId) {
        confirmStart(appId);
    }
    if (ownerUsername) {
        openOwnerCheckpointChat(ownerUsername, text);
    }
}

async function toggleVisibility(appId, isVisible) {
    const project = myProjects.find(item => item.id === appId);
    if (!project) return;

    const previousVisibility = project.is_visible;
    project.is_visible = isVisible;
    renderProjects();

    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/toggle_visibility`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_visible: isVisible })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();
        if (result.status && result.status !== 'success' && result.status !== 'ok') {
            throw new Error(getApiErrorMessage(result, 'visibilityUpdateError'));
        }
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        loadProjects(true).catch(() => {});
    } catch (error) {
        console.error('Toggle visibility error:', error);
        project.is_visible = previousVisibility;
        renderProjects();
        showToast(error && error.message && error.message !== '[object Object]' ? error.message : t.visibilityUpdateError);
    }
}

async function confirmDropTest() {
    if (!_dropTestAppId) return;
    try {
        const response = await fetch(`${API_BASE}/tests/${_dropTestAppId}/drop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        closeDropTestModal({ target: document.getElementById('drop-test-modal') });
        await Promise.all([loadTasks(), loadProjects(true)]);
    } catch (error) {
        console.error('Drop test error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function _buildLeaveReasonPayload(prefix, freeformText) {
    var safePrefix = String(prefix || '').trim();
    var safeFreeform = String(freeformText || '').trim();
    if (safePrefix && safeFreeform) {
        return safePrefix + ': ' + safeFreeform;
    }
    return safePrefix || safeFreeform;
}

function _removeLocalTest(appId) {
    myTests = (myTests || []).filter(function(test) {
        return Number(test.id) !== Number(appId);
    });
}

function _handleInactiveCheckinCard(appId, errorCode) {
    var normalizedCode = String(errorCode || '').trim().toLowerCase();
    var alertKey = normalizedCode === 'project_pending_completion'
        ? 'projectPendingCompletionAlert'
        : 'archivedNoCheckinAlert';

    if (normalizedCode === 'project_pending_completion') {
        var pendingTest = getMyTestById(appId);
        if (pendingTest) {
            pendingTest.app_status = 'pending_completion';
            pendingTest.is_pending_completion = true;
            recomputeLocalTestState(pendingTest);
        }
    } else {
        _removeLocalTest(appId);
    }

    persistTestsCacheSnapshot();
    if (typeof window.renderTests === 'function') {
        window.renderTests(true);
    }

    if (tg.showAlert) {
        tg.showAlert(window.t(alertKey, {}, lang));
    } else if (typeof window.showToast === 'function') {
        window.showToast(window.t(alertKey, {}, lang));
    }

    loadTasks(true).catch(function() {});
}

function _removeLocalTesterFromProject(appId, testerId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(appId);
    });
    if (!project || !Array.isArray(project.testers)) {
        return;
    }
    project.testers = project.testers.filter(function(item) {
        return Number(item.tester_id) !== Number(testerId);
    });
}

async function confirmLeaveMutual(isJustified) {
    if (!_leaveMutualAppId) return;

    var reasonSelect = document.getElementById('leave-reason-select');
    var reasonOther = document.getElementById('leave-reason-other');
    var reasonText = reasonSelect ? reasonSelect.value : '';
    var reasonPayload = _buildLeaveReasonPayload(reasonText, reasonOther ? reasonOther.value : '');
    var appId = _leaveMutualAppId;
    var previousTests = Array.isArray(myTests) ? myTests.slice() : [];

    try {
        _removeLocalTest(appId);
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }

        var response = await fetch(`${API_BASE}/tests/${appId}/leave_mutual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                leave_reason: reasonPayload,
                is_justified: !!isJustified,
            })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            var errorCode = getBackendErrorCode(data);
            if (errorCode === 'testing_not_found' || errorCode === 'app_not_found' || errorCode === 'project_pending_completion') {
                closeLeaveMutualModal({ target: document.getElementById('leave-mutual-modal') });
                loadTasks(true).catch(function() {});
                loadProjects(true).catch(function() {});
                return;
            }
            myTests = previousTests;
            if (typeof window.renderTests === 'function') {
                window.renderTests(true);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (data.exit_status === 'abandoned') {
            showToast(window.t('leaveSuccessAbandoned', {
                karma: formatUiAmount(data.karma_burned || 0, 1)
            }, lang));
        } else {
            showToast(window.t('leaveSuccessJustified', {}, lang));
        }

        closeLeaveMutualModal({ target: document.getElementById('leave-mutual-modal') });
        await Promise.all([loadTasks(true), loadProjects(true)]);
    } catch (error) {
        console.error('Leave mutual error:', error);
        myTests = previousTests;
        if (typeof window.renderTests === 'function') {
            window.renderTests(true);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function confirmKickTester() {
    if (!_kickTarget || !_kickTarget.appId || !_kickTarget.testerId) return;

    var reasonSelect = document.getElementById('kick-reason-select');
    var reasonOther = document.getElementById('kick-reason-other');
    var reasonText = reasonSelect ? reasonSelect.value : '';
    var reasonPayload = _buildLeaveReasonPayload(reasonText, reasonOther ? reasonOther.value : '');
    var target = {
        appId: _kickTarget.appId,
        testerId: _kickTarget.testerId,
    };
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(target.appId);
    });
    var previousTesters = project && Array.isArray(project.testers) ? project.testers.slice() : null;

    try {
        _removeLocalTesterFromProject(target.appId, target.testerId);
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }

        var response = await fetch(`${API_BASE}/projects/${target.appId}/kick/${target.testerId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                leave_reason: reasonPayload,
            })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            if (project && previousTesters) {
                project.testers = previousTesters;
            }
            if (typeof window.renderProjects === 'function') {
                window.renderProjects(true);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('kickSuccessMsg', {}, lang));
        closeKickTesterModal({ target: document.getElementById('kick-modal') });
        closeDossierModal();
        await loadProjects(true);
    } catch (error) {
        console.error('Kick tester error:', error);
        if (project && previousTesters) {
            project.testers = previousTesters;
        }
        if (typeof window.renderProjects === 'function') {
            window.renderProjects(true);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function confirmOvertimeLeave() {
    if (!_overtimeTest) return;
    try {
        const response = await fetch(`${API_BASE}/tests/${_overtimeTest.id}/leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        closeOvertimeModal({ target: document.getElementById('overtime-modal') });
        await Promise.all([loadTasks(), loadProjects(true)]);
    } catch (error) {
        console.error('Overtime leave error:', error);
        showToast(getApiErrorMessage(error && error.message, 'loadError'));
    }
}

function renderEarnBustDynamic() {
    const referralCountChip = document.getElementById('earn-referrals-count');
    const referralCount = Number(referralCountChip && referralCountChip.dataset ? referralCountChip.dataset.count || 0 : 0);
    if (referralCountChip) {
        referralCountChip.innerText = `👥 ${window.t('earnReferralCountChip', { count: referralCount }, lang)}`;
    }
    document.getElementById('earn-referral-bust').innerText = `💎 ${formatBustAmount(_earnReferralBust)}`;
    document.getElementById('earn-guest-status').innerHTML = `
        <span class="meta-chip accent-green">🤝 ${window.escapeHTML(window.t('earnGuestInviteCountChip', { count: _earnGuestInviteCount }, lang))}</span>
        <span class="meta-chip accent-blue">💎 ${window.escapeHTML(window.t('earnGuestInviteBustChip', { amount: formatAmountValue(_earnGuestInviteBust, 1) }, lang))}</span>
    `;
    document.getElementById('earn-grant-status').innerHTML = `
        <span class="meta-chip accent-green">🏆 ${window.t('earnGrantTestsLabel', {}, lang)}: ${_earnGrantCount}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnGrantBust)}</span>
    `;
    document.getElementById('earn-early-finish-status').innerHTML = `
        <span class="meta-chip accent-green">⚡ ${window.escapeHTML(window.t('earnEarlyFinishCountChip', { count: _earnEarlyFinishCount }, lang))}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnEarlyFinishBust)}</span>
    `;
    document.getElementById('earn-feedback-status').innerHTML = `
        <span class="meta-chip accent-green">🐞 ${window.t('earnFeedbackCountChip', { count: _earnFeedbackCount }, lang)}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnFeedbackBust)}</span>
    `;
    var playReviewStatus = document.getElementById('earn-play-review-status');
    if (playReviewStatus) {
        playReviewStatus.innerHTML = `
            <span class="meta-chip accent-green">⭐ ${window.escapeHTML(window.t('earnPlayReviewCountChip', { count: _earnPlayReviewCount }, lang))}</span>
            <span class="meta-chip accent-yellow">☯️ ${window.escapeHTML(window.t('earnPlayReviewKarmaChip', { amount: formatAmountValue(_earnPlayReviewKarma, 1) }, lang))}</span>
        `;
    }
    document.getElementById('earn-exchange-status').innerHTML = `<span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnExchangeBust)}</span>`;
    const socialStatus = document.getElementById('earn-social-status');
    if (_socialBonusStatus === 'approved') {
        socialStatus.innerHTML = `<span class="meta-chip accent-green">✅ ${t.earnSocialApproved}</span>`;
    } else if (_socialBonusStatus === 'pending') {
        socialStatus.innerHTML = `<button class="btn btn-secondary" style="width:100%; opacity:0.6;" disabled>⏳ ${t.earnSocialPending}</button>`;
    } else {
        socialStatus.innerHTML = `<button class="btn btn-primary" style="width:100%;" onclick="openSocialModal()">🎁 ${t.earnSocialBtn}</button>`;
    }
}

async function openEarnBustModal() {
    document.getElementById('earn-bust-modal').classList.add('active');
    try {
        const response = await fetch(`${API_BASE}/referral-stats/${userId}`);
        if (!response.ok) return;
        const data = await response.json();
        const referralsCount = Number(data.referrals_count || 0);
        document.getElementById('earn-referrals-count').dataset.count = String(referralsCount);
        document.getElementById('earn-referrals-count').innerText = `👥 ${window.t('earnReferralCountChip', { count: referralsCount }, lang)}`;
        _earnGrantCount = data.grant_tests_count || 0;
        _earnGrantBust = Number(data.grant_bust_earned || 0);
        _earnReferralBust = Number(data.referral_bust_earned || 0);
        _earnGuestInviteCount = Number(data.guest_invites_count || 0);
        _earnGuestInviteBust = Number(data.guest_invites_earned || 0);
        _earnExchangeBust = Number(data.exchange_bust_earned || 0);
        _earnEarlyFinishCount = Number(data.early_finish_count || 0);
        _earnEarlyFinishBust = Number(data.early_finish_bust_earned || 0);
        _earnFeedbackCount = Number(data.feedback_sent_count || 0);
        _earnFeedbackBust = Number(data.feedback_bust_earned || 0);
        _earnPlayReviewCount = Number(data.play_review_count || 0);
        _earnPlayReviewKarma = Number(data.play_review_karma_earned || 0);
        _socialBonusStatus = data.social_bonus_status || 'none';
        renderEarnBustDynamic();
    } catch (error) {
        console.error('Failed to load referral stats:', error);
    }
}

async function initiateProjectFeedback(appId, options) {
    options = options || {};
    try {
        const response = await fetch(`${API_BASE}/feedback/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                app_id: appId,
                checkin_context: options.checkinContext || null,
            })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t(options.checkinContext ? 'feedbackBotRedirectCheckinToast' : 'feedbackBotRedirectToast', {}, lang));
        if (window.closeProjectDetailsModal) {
            window.closeProjectDetailsModal();
        }
        if (options.confirmCheckin && !options.checkinContext) {
            confirmStart(appId);
            _openBotDm();
            return;
        }
        if (options.checkinContext) {
            _openBotDm();
            return;
        }
        setTimeout(redirectToBotDmAndClose, 250);
    } catch (error) {
        console.error('Feedback initiate error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function setFeedbackRewardBust(amount) {
    _feedbackRewardBust = Number(amount || 0);
    const input = document.getElementById('feedback-reward-bust-input');
    if (input) {
        input.value = _feedbackRewardBust > 0 ? String(_feedbackRewardBust) : '';
    }
    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    [5, 10, 25, 50, 100].forEach(function(value) {
        const chip = document.getElementById(`feedback-bust-chip-${value}`);
        if (chip) {
            chip.classList.toggle('is-active', Number(value) === _feedbackRewardBust);
            chip.classList.toggle('is-disabled', Number(value) > balance);
        }
    });
    _updateFeedbackRewardSubmitState();
}

function setFeedbackRewardKarma(amount) {
    _feedbackRewardKarma = Number(amount || 0);
    var project = getFeedbackRewardProject();
    var likesUsed = (project && project.likes_used) || 0;
    var likesMax = (project && project.likes_max) || 1;
    var remaining = Math.max(0, likesMax - likesUsed);
    var mapping = { 0: '0', 1.5: '15', 3: '30' };
    ['0', '15', '30'].forEach(function(code) {
        var chip = document.getElementById('feedback-karma-chip-' + code);
        if (chip) {
            chip.classList.toggle('is-active', code === mapping[_feedbackRewardKarma]);
            if (code !== '0') {
                var chipVal = code === '15' ? 1.5 : 3.0;
                chip.classList.toggle('is-disabled', chipVal > remaining);
            }
        }
    });
    _updateFeedbackRewardSubmitState();
}

function getFeedbackRewardProject() {
    var activeProject = myProjects.find(function(p) { return Number(p.id) === Number(_activeProjectFeedbackAppId); });
    if (activeProject) return activeProject;
    return archivedProjects.find(function(p) { return Number(p.app_id) === Number(_activeProjectFeedbackAppId); }) || null;
}

function getFeedbackRewardItem() {
    return (_activeProjectFeedbackItems || []).find(function(item) {
        return Number(item.id) === Number(_feedbackRewardTargetId);
    }) || null;
}

function getFeedbackRewardProjectAgeDays(project) {
    if (!project || !project.created_at) return null;
    var created = new Date(project.created_at);
    if (Number.isNaN(created.getTime())) return null;
    return Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000) + 1);
}

function buildFeedbackRewardKarmaMeta(project) {
    var likesUsed = Number(project && project.likes_used || 0);
    var likesMax = Number(project && project.likes_max || 1);
    var remaining = Math.max(0, likesMax - likesUsed);
    var ageDays = getFeedbackRewardProjectAgeDays(project);
    var statusLabel = window.t('feedbackRewardKarmaUsage', { used: likesUsed, max: likesMax }, lang);
    var toastText = '';

    if (remaining > 0) {
        toastText = window.t('feedbackRewardKarmaReadyToast', { count: remaining }, lang);
    } else if (ageDays !== null && ageDays < 7) {
        var daysLeft = Math.max(0, 7 - ageDays);
        var unlockDate = new Date();
        unlockDate.setHours(0, 0, 0, 0);
        unlockDate.setDate(unlockDate.getDate() + daysLeft);
        toastText = window.t('feedbackRewardKarmaNextToast', {
            count: daysLeft,
            date: unlockDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US')
        }, lang);
    } else {
        toastText = window.t('feedbackRewardKarmaLimitToast', {}, lang);
    }

    return {
        statusLabel: statusLabel,
        toastText: toastText
    };
}

function updateFeedbackRewardKarmaStatus(project) {
    var karmaEl = document.getElementById('feedback-karma-status');
    if (!karmaEl) return;
    var meta = buildFeedbackRewardKarmaMeta(project);
    karmaEl.textContent = meta.statusLabel;
    karmaEl.dataset.toast = meta.toastText || '';
}

function showFeedbackRewardKarmaInfo() {
    var karmaEl = document.getElementById('feedback-karma-status');
    if (!karmaEl) return;
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    showToast(karmaEl.dataset.toast || window.t('feedbackRewardKarmaLimitToast', {}, lang));
}

async function openProjectFeedback(appId, isArchived) {
    const project = (isArchived ? archivedProjects : myProjects).find(function(item) {
        return Number(item.app_id || item.id) === Number(appId);
    });
    if (!project) return;

    _activeProjectFeedbackAppId = Number(appId);
    _activeProjectFeedbackArchived = !!isArchived;
    _activeProjectFeedbackItems = [];

    if (window.showProjectFeedbackModalLoading) {
        window.showProjectFeedbackModalLoading(project);
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/feedback?owner_id=${userId}`);
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            if (window.showProjectFeedbackModalError) {
                window.showProjectFeedbackModalError(project);
            }
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        _activeProjectFeedbackItems = data.feedback || [];
        if (window.showProjectFeedbackModal) {
            window.showProjectFeedbackModal(project, _activeProjectFeedbackItems);
        }
    } catch (error) {
        console.error('Load project feedback error:', error);
        if (window.showProjectFeedbackModalError) {
            window.showProjectFeedbackModalError(project);
        }
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function sendProjectFeedbackMedia(feedbackId) {
    try {
        const response = await fetch(`${API_BASE}/feedback/${feedbackId}/send_media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackMediaSentToast', {}, lang));
    } catch (error) {
        console.error('Send feedback media error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function openFeedbackRewardModal(appId, feedbackId) {
    _activeProjectFeedbackAppId = Number(appId);
    _feedbackRewardTargetId = Number(feedbackId);
    _feedbackRewardBust = 0;
    _feedbackRewardKarma = 0;

    var project = getFeedbackRewardProject();
    var item = getFeedbackRewardItem();

    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    var balanceEl = document.getElementById('feedback-owner-balance');
    if (balanceEl) balanceEl.textContent = window.t('feedbackRewardBustStatus', { amount: formatBustAmount(balance) }, lang);

    var targetNameEl = document.getElementById('feedback-reward-target-name');
    var targetMetaEl = document.getElementById('feedback-reward-target-meta');
    if (targetNameEl) {
        var fullName = (item && item.tester_full_name) || '';
        var username = item && item.tester_username ? '@' + String(item.tester_username).replace(/^@+/, '') : '';
        var fallback = window.t('idLabel', { id: item && item.tester_id ? item.tester_id : 0 }, lang);
        targetNameEl.textContent = fullName || username || fallback;
    }
    if (targetMetaEl) {
        var usernameText = item && item.tester_username ? '@' + String(item.tester_username).replace(/^@+/, '') : '';
        var fullNameText = (item && item.tester_full_name) || '';
        var parts = [];
        if (fullNameText && usernameText) parts.push(usernameText);
        if (item && item.message_text) parts.push(window.t('feedbackRewardTargetHint', {}, lang));
        targetMetaEl.textContent = parts.join(' • ') || window.t('feedbackRewardTargetHint', {}, lang);
    }

    updateFeedbackRewardKarmaStatus(project);

    if (window.openFeedbackRewardModalUi) {
        window.openFeedbackRewardModalUi();
    }
    setFeedbackRewardBust(0);
    setFeedbackRewardKarma(0);
    const input = document.getElementById('feedback-reward-bust-input');
    const reply = document.getElementById('feedback-reward-reply');
    if (input) {
        input.value = '';
        input.oninput = function() {
            _feedbackRewardBust = Number(input.value || 0);
            [5, 10, 25, 50, 100].forEach(function(value) {
                const chip = document.getElementById(`feedback-bust-chip-${value}`);
                if (chip) {
                    chip.classList.toggle('is-active', Number(value) === _feedbackRewardBust);
                    chip.classList.toggle('is-disabled', Number(value) > balance);
                }
            });
            _updateFeedbackRewardSubmitState();
        };
    }
    if (reply) {
        reply.value = '';
        reply.oninput = function() { _updateFeedbackRewardSubmitState(); };
    }
    _updateFeedbackRewardSubmitState();
}

function closeFeedbackRewardModal() {
    _feedbackRewardTargetId = null;
    _feedbackRewardBust = 0;
    _feedbackRewardKarma = 0;
    if (window.closeFeedbackRewardModalUi) {
        window.closeFeedbackRewardModalUi();
    }
}

function _updateFeedbackRewardSubmitState() {
    var btn = document.getElementById('feedback-reward-submit-btn');
    if (!btn) return;
    var reply = document.getElementById('feedback-reward-reply');
    var hasReply = reply && reply.value && reply.value.trim().length > 0;
    var hasReward = _feedbackRewardBust > 0 || _feedbackRewardKarma > 0;
    var enabled = hasReward || hasReply;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.4';
}

async function submitFeedbackReward() {
    if (!_feedbackRewardTargetId || !_activeProjectFeedbackAppId) return;

    const bustInput = document.getElementById('feedback-reward-bust-input');
    const replyInput = document.getElementById('feedback-reward-reply');
    const bustAmount = Math.max(0, Number((bustInput && bustInput.value) || _feedbackRewardBust || 0));
    const replyText = (replyInput && replyInput.value ? replyInput.value : '').trim();

    // Client-side validation: bust cannot exceed balance
    var balance = (visibilityStats && visibilityStats.balance_bust) || 0;
    if (bustAmount > balance) {
        if (tg && tg.showAlert) tg.showAlert(window.t('feedbackRewardInsufficientBust', {}, lang));
        return;
    }

    // Must have at least reward or reply text
    if (bustAmount <= 0 && _feedbackRewardKarma <= 0 && !replyText) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/feedback/${_feedbackRewardTargetId}/reward`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                bust_amount: bustAmount,
                karma_amount: _feedbackRewardKarma,
                reply_text: replyText,
            })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            handleApiError(getBackendErrorCode(data), data.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackRewardSuccessToast', {}, lang));
        closeFeedbackRewardModal();
        await Promise.all([loadProjects(true), loadArchivedProjects()]);
        await openProjectFeedback(_activeProjectFeedbackAppId, _activeProjectFeedbackArchived);
    } catch (error) {
        console.error('Feedback reward error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function submitSocialLink() {
    const url = document.getElementById('social-url-input').value.trim();
    if (!url.startsWith('http')) return;
    try {
        const response = await fetch(`${API_BASE}/social-bonus/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, url })
        });
        const data = await response.json();
        if (response.ok) {
            _socialBonusStatus = 'pending';
            renderEarnBustDynamic();
            closeSocialModal();
            showToast(t.earnSocialSubmitted || 'Ссылка отправлена!');
        } else {
            showToast(getApiErrorMessage(data, 'socialSubmitError'));
        }
    } catch (error) {
        console.error('Social bonus submit error:', error);
        showToast(getApiErrorMessage(error && error.message, 'socialSubmitError'));
    }
}

async function submitFeedback() {
    const input = document.getElementById('feedback-text-input');
    const rawText = input ? input.value : '';
    const text = (rawText || '').trim();
    if (text.length < 3) {
        showToast(window.t('feedbackValidationError', {}, lang));
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/send_to_topic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                type: _feedbackType,
                text
            })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            showToast(getApiErrorMessage(result, 'genericError'));
            return;
        }
        closeFeedbackModal();
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackBotRedirectToast', {}, lang));
        setTimeout(redirectToBotDmAndClose, 250);
    } catch (error) {
        console.error('Send feedback error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function saveProjectSync() {
    if (!_syncProjectId) return;
    var syncProjectId = Number(_syncProjectId);
    var actionKey = 'project_sync_' + syncProjectId;
    if (_pendingActions.has(actionKey)) return;

    var dayInput = document.getElementById('sync-day-input');
    var messageInput = document.getElementById('sync-message-input');
    var saveBtn = document.getElementById('sync-save-btn');
    var cancelBtn = document.getElementById('sync-cancel-btn');
    if (!dayInput || !messageInput) return;
    const day = Number(dayInput.value);
    const message = String(messageInput.value || '').trim();
    if (!Number.isInteger(day) || day < 1) {
        showToast(t.syncDayInvalid);
        return;
    }

    _pendingActions.add(actionKey);
    if (saveBtn) {
        saveBtn.disabled = true;
    }
    if (cancelBtn) {
        cancelBtn.disabled = true;
    }

    try {
        var localProjectBeforeSync = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(syncProjectId);
        }) || null;
        var localTestBeforeSync = (myTests || []).find(function(item) {
            return Number(item.id) === Number(syncProjectId);
        }) || null;
        var response = null;
        var data = null;
        var requestError = null;
        try {
            response = await fetch(`${API_BASE}/projects/${syncProjectId}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ google_sync_day: day, sync_message: message })
            });
        } catch (error) {
            requestError = error;
        }

        if (response) {
            data = await _readJsonResponseSafely(response, 'Project sync');
        }

        var confirmedProject = null;
        if (requestError || !response || !response.ok || !data || data.status !== 'success') {
            confirmedProject = await _confirmProjectSyncPersistence(syncProjectId, day, message);
            if (!confirmedProject) {
                if (data && typeof data === 'object' && data.status && data.status !== 'success') {
                    handleApiError(getBackendErrorCode(data), data.details || {});
                } else if (requestError) {
                    console.error('Project sync request error:', requestError);
                    showToast(getApiErrorMessage(requestError && requestError.message, 'networkError'));
                } else if (response && !response.ok) {
                    showToast(getApiErrorMessage(data, 'loadError'));
                } else {
                    showToast(getApiErrorMessage(null, 'networkError'));
                }
                return;
            }

            data = {
                status: 'success',
                google_sync_day: confirmedProject.google_sync_day,
                sync_message: confirmedProject.sync_message,
                last_sync_date: confirmedProject.last_sync_date,
                resumed_from_pending: false,
            };
        }

        var today = getLocalDate();
        var resolvedSyncDay = confirmedProject ? Number(confirmedProject.google_sync_day || day) : day;
        var resolvedSyncMessage = confirmedProject ? String(confirmedProject.sync_message || '') : message;
        var resolvedLastSyncDate = confirmedProject
            ? (confirmedProject.last_sync_date || today)
            : (data.last_sync_date || today);
        var resumedFromPending = !!(data && data.resumed_from_pending);
        if (!resumedFromPending && confirmedProject) {
            var wasPendingBeforeSync = !!(
                (localProjectBeforeSync && localProjectBeforeSync.app_status === 'pending_completion')
                || (localTestBeforeSync && localTestBeforeSync.app_status === 'pending_completion')
            );
            resumedFromPending = wasPendingBeforeSync && String(confirmedProject.app_status || '') === 'active';
        }
        _startPostSyncToastSuppression();

        _runBestEffortUiStep('Project sync local project update', function() {
            const project = (myProjects || []).find(function(item) {
                return Number(item.id) === Number(syncProjectId);
            });
            if (!project) return;
            project.google_sync_day = resolvedSyncDay;
            project.sync_message = resolvedSyncMessage;
            project.last_sync_date = resolvedLastSyncDate;
            if (resumedFromPending) {
                project.status = 'active';
                project.app_status = 'active';
            }
        });

        _runBestEffortUiStep('Project sync local test update', function() {
            (myTests || []).forEach(function(test) {
                if (Number(test.id) !== Number(syncProjectId)) return;
                test.google_sync_day = resolvedSyncDay;
                test.sync_message = resolvedSyncMessage;
                test.last_sync_date = resolvedLastSyncDate;
                if (resumedFromPending) {
                    test.app_status = 'active';
                    recomputeLocalTestState(test);
                }
            });
        });

        _runBestEffortUiStep('Project sync cache update', function() {
            setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
            persistTestsCacheSnapshot();
        });
        _markPostSyncRefreshCooldown();
        _runBestEffortUiStep('Project sync render projects', function() { renderProjects(true); });
        _runBestEffortUiStep('Project sync render tests', function() { renderTests(true); });
        _runBestEffortUiStep('Project sync refresh modals', function() { refreshOpenModals(); });

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(t.syncSavedToast);
        _runBestEffortUiStep('Project sync close modal', function() {
            closeSyncModal({ target: document.getElementById('sync-modal') });
        });
    } finally {
        _pendingActions.delete(actionKey);
        if (saveBtn) {
            saveBtn.disabled = false;
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }
}

async function loadArchivedProjects(options) {
    var opts = options || {};
    var background = !!opts.background;
    var silent = !!opts.silent || background;
    var shouldMarkBackgroundSync = background || archivedProjects.length > 0;

    if (background && (Date.now() - (_lastFetchTimes.archived || 0)) < ARCHIVED_FETCH_THROTTLE_MS) {
        return;
    }

    try {
        if (shouldMarkBackgroundSync) {
            beginBackgroundSync('projects');
        }
        const response = await fetch(`${API_BASE}/projects/${userId}/archived`);
        if (!response.ok) return;
        const data = await response.json();
        archivedProjects = (data.archived || []).map(function(project) {
            return Object.assign({}, project, {
                target_lang: project.target_lang || 'ALL',
                run_iteration: Number(project.run_iteration || 1),
                feedback_new_count: project.feedback_new_count || 0,
                feedback_total_count: project.feedback_total_count || 0,
                archive_reason: project.archive_reason || null,
            });
        });
        _lastFetchTimes.archived = Date.now();
        renderArchivedProjects();
    } catch (error) {
        console.error('Archive load error:', error);
        if (!silent) {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
        }
    } finally {
        if (shouldMarkBackgroundSync) {
            endBackgroundSync('projects');
        }
    }
}

async function confirmHardDelete(appId, appName) {
    const confirmed = await new Promise(resolve => {
        const message = t.archiveConfirmDelete.replace('{name}', appName);
        if (tg.showConfirm) {
            tg.showConfirm(message, ok => resolve(ok));
        } else {
            resolve(confirm(message));
        }
    });
    if (!confirmed) return;
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/permanent`, { method: 'DELETE' });
        const data = await response.json();
        if (data.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            archivedProjects = archivedProjects.filter(project => project.app_id !== appId);
            renderArchivedProjects();
        } else {
            showToast(getApiErrorMessage(data, 'hardDeleteError'));
        }
    } catch (error) {
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

function _clearProjectPackageError() {
    var errorEl = document.getElementById('package-error');
    if (!errorEl) return;
    errorEl.innerHTML = '';
    errorEl.style.display = 'none';
}

function _showProjectPackageError(messageKey, options) {
    var errorEl = document.getElementById('package-error');
    if (!errorEl) return;

    var opts = options || {};
    var message = window.t(messageKey, {}, lang);
    var html = '<div>' + window.escapeHTML(message) + '</div>';
    if (opts.actionLabelKey) {
        html += '<button type="button" id="package-error-action-btn" class="btn btn-secondary" style="width:100%; margin-top:10px; background: rgba(255,255,255,0.08); color: var(--text-color); border: 1px solid rgba(255,255,255,0.14);">' + window.escapeHTML(window.t(opts.actionLabelKey, {}, lang)) + '</button>';
    }
    errorEl.innerHTML = html;
    errorEl.style.display = 'block';

    if (opts.actionLabelKey && typeof opts.onAction === 'function') {
        var actionBtn = document.getElementById('package-error-action-btn');
        if (actionBtn) {
            actionBtn.onclick = function(event) {
                event.preventDefault();
                opts.onAction();
            };
        }
    }
}

function _handleProjectCreateConflict(code) {
    var normalizedCode = String(code || '').trim();
    if (normalizedCode === 'ALREADY_OWNED') {
        _showProjectPackageError('ALREADY_OWNED', {
            actionLabelKey: 'projectPackageContactSupportBtn',
            onAction: openProjectDuplicateSupport,
        });
        return true;
    }
    if (normalizedCode === 'ALREADY_ACTIVE' || normalizedCode === 'NEEDS_RESTART') {
        _showProjectPackageError(normalizedCode);
        return true;
    }
    return false;
}

async function restartArchivedProject(appId) {
    var normalizedAppId = Number(appId || 0);
    if (!normalizedAppId || !userId) return null;

    var actionKey = 'restart_archived_' + normalizedAppId;
    if (_pendingActions.has(actionKey)) return null;
    _pendingActions.add(actionKey);

    _apiStart();
    try {
        const response = await fetch(`${API_BASE}/apps/${normalizedAppId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return null;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await loadProjects();
        if (typeof window.switchTab === 'function') {
            window.switchTab('projects');
        }
        if (typeof window.renderArchivedProjects === 'function') {
            window.renderArchivedProjects(true);
        }
        showToast(window.t('archiveRestartSuccess', { count: Number(result.run_iteration || 1) }, lang));
        setTimeout(function() {
            _highlightProjectCard(result.app_id);
        }, 140);
        loadArchivedProjects({ background: true, silent: true }).catch(function() {});
        return result;
    } catch (error) {
        console.error('Restart archived project error:', error);
        handleApiError('network_error');
        return null;
    } finally {
        _apiEnd();
        _pendingActions.delete(actionKey);
    }
}

async function fetchKarmaBreakdown(targetUserId) {
    const resolvedUserId = Number(targetUserId || userId || 0);
    if (!resolvedUserId) {
        return {
            status: 'error',
            code: 'invalid_user_id',
            total: Number((visibilityStats && visibilityStats.ownerKarma) || 0),
            breakdown: []
        };
    }

    try {
        const response = await fetchWithRetry(`${API_BASE}/users/${resolvedUserId}/karma/breakdown`, {
            timeoutMs: 10000
        }, 1);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = await response.json();

        const total = Number(payload && payload.total);
        const safeTotal = Number.isFinite(total)
            ? total
            : Number((visibilityStats && visibilityStats.ownerKarma) || 0);

        const apiBreakdown = payload && Array.isArray(payload.breakdown) ? payload.breakdown : [];
        let normalizedBreakdown = apiBreakdown.map((item) => {
            const sourceType = String(item && item.source_type ? item.source_type : 'unknown').toLowerCase();
            const countRaw = Number(item && item.count);
            const amountRaw = Number(item && (item.amount ?? item.karma ?? item.points));
            return {
                source_type: sourceType,
                count: Number.isFinite(countRaw) ? countRaw : 0,
                amount: Number.isFinite(amountRaw) ? amountRaw : 0,
            };
        }).filter((item) => item.count !== 0 || item.amount !== 0);

        // Backward compatibility for old backend shape: { total, good, bug }
        if (!normalizedBreakdown.length) {
            const goodCount = Number(payload && payload.good);
            const bugCount = Number(payload && payload.bug);
            if (Number.isFinite(goodCount) && goodCount > 0) {
                normalizedBreakdown.push({
                    source_type: 'good',
                    count: goodCount,
                    amount: goodCount * 1.5,
                });
            }
            if (Number.isFinite(bugCount) && bugCount > 0) {
                normalizedBreakdown.push({
                    source_type: 'bug',
                    count: bugCount,
                    amount: bugCount * 3,
                });
            }
        }

        return {
            status: 'success',
            code: null,
            total: safeTotal,
            breakdown: normalizedBreakdown,
        };
    } catch (error) {
        console.error('Karma breakdown load error:', error);
        return {
            status: 'error',
            code: 'network_error',
            total: Number((visibilityStats && visibilityStats.ownerKarma) || 0),
            breakdown: []
        };
    }
}

async function sendKarmaReward(appId, testerId, rewardType) {
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: testerId, type: rewardType })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            showToast(t.karmaToast);
            const project = myProjects.find(item => item.id === appId);
            if (project) {
                if (project.likes) project.likes.push({ tester_id: testerId, type: rewardType });
                project.likes_used = (project.likes_used || 0) + 1;
            }
            renderProjects();
            if (window._karmaDistributionProjectId === appId && window.openKarmaDistribution) {
                window.openKarmaDistribution(appId);
            }
        } else {
            const message = result.code === 'karma_limit_reached'
                ? t.karmaLimitReached
                : getApiErrorMessage(result, 'karmaAlreadyLiked');
            showToast(message);
        }
    } catch (error) {
        console.error('Karma error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function confirmStart(id) {
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

    const actionKey = 'checkin_' + id;
    if (_pendingActions.has(actionKey)) return false;
    _pendingActions.add(actionKey);

    const test = myTests.find(function(item) { return Number(item.id) === Number(id); });
    const shouldSubmitPlayFeedback = !!(test && canTogglePlayReview(test) && !test.play_feedback_submitted && test.play_feedback_submitted_pending);
    if (test) {
        var appStatus = String(test.app_status || 'active').toLowerCase();
        var progressStatus = String(test.progress_status || 'active').toLowerCase();
        var isPendingCompletion = appStatus === 'pending_completion';
        var isArchivedOrCompleted = (appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active';
        if (isPendingCompletion) {
            _pendingActions.delete(actionKey);
            _handleInactiveCheckinCard(id, 'project_pending_completion');
            return false;
        }
        if (isArchivedOrCompleted) {
            // Grant-tomorrow state is invalid for archived/completed projects and can keep stale active cards.
            test.isGrantAvailableTomorrow = false;
            _pendingActions.delete(actionKey);
            _handleInactiveCheckinCard(id, 'app_not_found');
            return false;
        }
    }

    const card = document.getElementById(`test-card-${id}`);
    const btn = document.getElementById(`btn-confirm-${id}`);

    if (btn) {
        btn.innerText = t.confirmed;
        btn.style.backgroundColor = '#2e7d32';
        btn.style.color = '#ffffff';
        btn.disabled = true;
    }

    if (!card) return false;
    card.classList.add('removing');

    try {
        const response = await fetch(`${API_BASE}/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tester_id: userId,
                app_id: id,
                local_date: getLocalDate(),
                play_feedback_submitted: shouldSubmitPlayFeedback,
            })
        });

        let result = null;
        try {
            result = await response.json();
        } catch (parseError) {
            result = null;
        }

        if (!response.ok || !result || result.status !== 'success') {
            card.classList.remove('removing');
            if (btn) {
                btn.innerText = t.confirmStart;
                btn.style.backgroundColor = 'var(--success-color)';
                btn.disabled = false;
            }

            if (result && typeof result === 'object') {
                var errorCode = getBackendErrorCode(result);
                if (errorCode === 'testing_not_found'
                    || errorCode === 'app_not_found'
                    || errorCode === 'test_or_app_not_found'
                    || errorCode === 'project_pending_completion') {
                    _handleInactiveCheckinCard(id, errorCode);
                } else {
                    handleApiError(errorCode, result.details || {});
                }
            } else {
                handleApiError('network_error');
            }
            return false;
        }

        const earnedBust = Number(result.earned_bust || 0);
        const earnedKarma = Number(result.earned_karma || 0);
        const sourceType = String(result.source_type || '').toLowerCase();
        setFirstDayScreenshotVisible(id, false);
        setTimerReadyForConfirm(id, false, false, '');
        if (result.already_checked_today) {
            showToast(t.checkinAlreadyDone);
        } else if (sourceType === 'overtime_checkin' && earnedKarma > 0) {
            showToast(window.t('checkinEarnOvertimeKarma', { amount: formatAmountValue(earnedKarma, 1) }, lang));
        } else if (earnedBust > 0 && earnedKarma > 0) {
            showToast(window.t('checkinEarnBustAndKarma', {
                bust: formatAmountValue(earnedBust, 1),
                karma: formatAmountValue(earnedKarma, 1)
            }, lang));
        } else if (earnedBust > 0) {
            showToast(t.checkinEarnBust.replace('{amount}', formatAmountValue(earnedBust, 1)));
        } else if (earnedKarma > 0) {
            showToast(t.checkinEarnKarma.replace('{amount}', formatAmountValue(earnedKarma, 1)));
        } else {
            showToast(t.successCheckin);
        }

        var updatedTest = myTests.find(function(test) {
            return Number(test.id) === Number(id);
        });
        if (updatedTest) {
            updatedTest.last_check_date = result.last_check_date || getLocalDate();
            updatedTest.checkins_count = Math.max(0, Number(result.checkins_count || updatedTest.checkins_count || 0));
            updatedTest.skips_count = Math.max(0, Number(result.skips_count || 0));
            updatedTest.daily_timeline = result.daily_timeline || updatedTest.daily_timeline || '';
            updatedTest.testing_days = Math.max(Number(updatedTest.testing_days || 0), Number(result.testing_day || 0));
            updatedTest.status = 'done';
            updatedTest.play_feedback_submitted = Object.prototype.hasOwnProperty.call(result, 'play_feedback_submitted')
                ? !!result.play_feedback_submitted
                : (!!updatedTest.play_feedback_submitted || shouldSubmitPlayFeedback);
            updatedTest.play_feedback_submitted_pending = !!updatedTest.play_feedback_submitted;

            // Recalculate isGrantAvailableTomorrow after optimistic update
            var skipsAfter = countGrantSkips(updatedTest);
            var canEverClaim = !updatedTest.grant_claimed && skipsAfter <= 3 && updatedTest.progress_id;
            if (canEverClaim && updatedTest.testing_days === 14) {
                updatedTest.isGrantAvailableTomorrow = true;
                window.tg.showAlert(window.t('grantAvailableTomorrowAlert', {}, lang));
            }
        }

        setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
        renderTests(true);
        refreshOpenModals();

        setTimeout(() => {
            loadTasks(true).catch(function() {});
            loadProjects(true).catch(function() {});
        }, 250);
        return true;
    } catch (error) {
        console.error('Checkin error:', error);
        card.classList.remove('removing');
        if (btn) {
            btn.innerText = t.confirmStart;
            btn.style.backgroundColor = 'var(--success-color)';
            btn.disabled = false;
        }
        handleApiError('network_error');
        return false;
    } finally {
        _pendingActions.delete(actionKey);
    }
}

function handleClaimGrantClick(progressId, appId) {
    const test = myTests.find(function(item) {
        return Number(item.id) === Number(appId);
    });
    const skipsCount = countGrantSkips(test);
    if (skipsCount > 3) {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showToast(window.t('claimGrantMissedToast', { count: skipsCount }, lang));
        return;
    }
    claimGrant(progressId, appId);
}

async function claimGrant(progressId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const btn = document.getElementById(`btn-claim-${appId}`);
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    try {
        const response = await fetch(`${API_BASE}/testing/${progressId}/claim_grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            handleApiError(getBackendErrorCode(result), result.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        const amount = Number(result.amount || 0);
        const test = myTests.find(t => t.id === appId);
        if (test) {
            test.grant_claimed = true;
            test.isReadyToClaim = false;
            test.isGrantAvailableTomorrow = false;
            test.isEarlyFinish = false;
        }
        const isActive = test && test.app_status === 'active';
        if (isActive) {
            showToast(window.t('claimGrantOvertimeToast', { amount: amount.toFixed(1) }));
        } else {
            showToast(window.t('claimGrantToast', { amount: amount.toFixed(1) }));
            myTests = (myTests || []).filter(function(item) {
                return Number(item.id) !== Number(appId);
            });
        }
        if (btn) btn.style.display = 'none';
        persistTestsCacheSnapshot();
        if (window.renderTests) window.renderTests(true);
        loadProjects(true);
    } catch (error) {
        console.error('Claim grant error:', error);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        handleApiError('network_error');
    }
}

async function claimEarlyFinishBonus(progressId, appId) {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    const btn = document.getElementById('btn-early-finish-' + appId);
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
    try {
        const response = await fetch(`${API_BASE}/testing/${progressId}/claim_early_finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const result = await response.json();
        if (!response.ok || result.status !== 'success') {
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            handleApiError(getBackendErrorCode(result), result.details || {});
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        const test = myTests.find(t => Number(t.id) === Number(appId));
        if (test) {
            test.grant_claimed = true;
            test.isReadyToClaim = false;
            test.isGrantAvailableTomorrow = false;
            test.isEarlyFinish = false;
        }
        myTests = (myTests || []).filter(function(item) {
            return Number(item.id) !== Number(appId);
        });
        persistTestsCacheSnapshot();
        if (result.qualified) {
            if (result.already_awarded) {
                showToast(window.t('earlyFinishAlreadyToast', {}, lang));
            } else {
                showToast(window.t('earlyFinishClaimedToast', { amount: result.amount }, lang));
            }
        } else {
            showToast(window.t('earlyFinishNoBonus', {}, lang));
        }
        if (window.renderTests) window.renderTests(true);
    } catch (error) {
        console.error('Claim early finish error:', error);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        handleApiError('network_error');
    }
}

async function deleteTester(appId, testerId, testerName) {
    const confirmed = await new Promise(resolve => {
        const message = t.deleteTesterConfirm.replace('{name}', testerName);
        if (tg.showConfirm) {
            tg.showConfirm(message, ok => resolve(ok));
        } else {
            resolve(confirm(message));
        }
    });
    if (!confirmed) return;
    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/testers/${testerId}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.status === 'ok') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            loadProjects();
        } else if (tg.showAlert) {
            tg.showAlert(getApiErrorMessage(result, 'deleteTesterError'));
        }
    } catch (error) {
        console.error('Delete tester error:', error);
        const message = getApiErrorMessage(error && error.message, 'networkError');
        if (tg.showAlert) tg.showAlert(message);
        else alert(message);
    }
}

async function _postResolveAccessError(projectId, progressId) {
    var response = await fetch(`${API_BASE}/projects/${projectId}/resolve_access_issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_id: userId, progress_id: progressId })
    });
    var result = await response.json();
    return {
        ok: !!(response.ok && result && result.status === 'success'),
        result: result,
    };
}

async function resolveAccessError(projectId, progressId) {
    if (!projectId || !progressId) return;
    var actionKey = 'resolve_access_error_' + projectId + '_' + progressId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
        var request = await _postResolveAccessError(projectId, progressId);
        if (!request.ok) {
            handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
            return;
        }
        _markProjectAccessIssueResolved(projectId, progressId);
        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t('accessOverlayResolveDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Resolve access error failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function resolveAllAccessErrors(projectId, progressIds) {
    if (!projectId || !Array.isArray(progressIds)) return;
    var normalizedIds = Array.from(new Set(progressIds.map(function(id) {
        return Number(id || 0);
    }).filter(function(id) {
        return id > 0;
    })));
    if (!normalizedIds.length) return;

    var actionKey = 'resolve_access_error_all_' + projectId;
    if (_pendingActions.has(actionKey)) return;
    _pendingActions.add(actionKey);

    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

        for (var index = 0; index < normalizedIds.length; index++) {
            var progressId = normalizedIds[index];
            var request = await _postResolveAccessError(projectId, progressId);
            if (!request.ok) {
                handleApiError(getBackendErrorCode(request.result), request.result && request.result.details ? request.result.details : {});
                loadProjects(true).catch(function() {});
                return;
            }
            _markProjectAccessIssueResolved(projectId, progressId);
        }

        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t(normalizedIds.length > 1 ? 'accessOverlayResolveAllDone' : 'accessOverlayResolveDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Resolve all access errors failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

function contactAccessTester(username) {
    var clean = String(username || '').trim().replace(/^@+/, '');
    if (!clean) {
        if (tg.showAlert) tg.showAlert(window.t('accessOverlayNoTesterUsername', {}, lang));
        return;
    }
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    if (tg.openTelegramLink) {
        tg.openTelegramLink(`https://t.me/${clean}`);
    } else {
        window.open(`https://t.me/${clean}`, '_blank');
    }
}

function _syncProjectsUiAfterOptimisticChange() {
    setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
    if (window.renderProjects) window.renderProjects(true);
    refreshOpenModals();
}

function _recomputeProjectAccessErrorState(project) {
    if (!project) return;
    var testers = Array.isArray(project.testers) ? project.testers : [];
    var hasAccessError = testers.some(function(tester) {
        return !!tester.issue_reported_at && !tester.issue_fixed_at;
    });
    if (hasAccessError) {
        project.status = 'access_error';
    } else if (String(project.status || '').toLowerCase() === 'access_error') {
        project.status = 'active';
    }
}

function _markProjectAccessIssueResolved(projectId, progressId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project || !Array.isArray(project.testers)) return false;

    var updated = false;
    project.testers = project.testers.map(function(tester) {
        if (Number(tester.progress_id) !== Number(progressId)) {
            return tester;
        }
        updated = true;
        return Object.assign({}, tester, {
            issue_fixed_at: new Date().toISOString(),
        });
    });
    _recomputeProjectAccessErrorState(project);
    return updated;
}

function _removeProjectAccessTester(projectId, progressId) {
    var project = (myProjects || []).find(function(item) {
        return Number(item.id) === Number(projectId);
    });
    if (!project || !Array.isArray(project.testers)) return false;

    var beforeCount = project.testers.length;
    project.testers = project.testers.filter(function(tester) {
        return Number(tester.progress_id) !== Number(progressId);
    });
    var updated = project.testers.length !== beforeCount;
    _recomputeProjectAccessErrorState(project);
    return updated;
}

async function deleteAccessTester(projectId, progressId, testerLabel) {
    if (!projectId || !progressId) return;
    var actionKey = 'delete_access_tester_' + projectId + '_' + progressId;
    if (_pendingActions.has(actionKey)) return;
    var confirmMessage = window.t('accessOverlayDeleteConfirm', {
        name: testerLabel || window.t('unknownLabel', {}, lang)
    }, lang);
    var confirmed = await new Promise(function(resolve) {
        if (tg.showConfirm) {
            tg.showConfirm(confirmMessage, function(ok) { resolve(!!ok); });
        } else {
            resolve(confirm(confirmMessage));
        }
    });
    if (!confirmed) return;

    _pendingActions.add(actionKey);
    try {
        if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
        var response = await fetch(`${API_BASE}/projects/${projectId}/delete_access_tester`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId, progress_id: progressId })
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return;
        }
        _removeProjectAccessTester(projectId, progressId);
        _syncProjectsUiAfterOptimisticChange();
        showToast(window.t('accessOverlayDeleteDone', {}, lang));
        loadProjects(true).catch(function() {});
    } catch (error) {
        console.error('Delete access tester failed:', error);
        handleApiError('network_error');
    } finally {
        _pendingActions.delete(actionKey);
    }
}

async function confirmDeleteProject() {
    if (!projectToDelete) return;

    const message = document.getElementById('delete-message').value.trim();
    const id = projectToDelete;
    const overtimeSelectedInput = document.querySelector('input[name="delete-overtime-tester"]:checked');
    const selectedOvertimeTester = overtimeSelectedInput ? overtimeSelectedInput.value : '';
    const btn = document.getElementById('t-confirmDeleteBtn');
    const originalText = btn.innerText;
    btn.innerText = '...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/projects/${id}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                overtime_reward_user_id: selectedOvertimeTester ? Number(selectedOvertimeTester) : null,
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

            // Optimistic UI: move project from active to archive immediately
            var deletedProject = myProjects.find(function(p) { return p.id === id; });
            if (deletedProject) {
                myProjects = myProjects.filter(function(p) { return p.id !== id; });
                archivedProjects.unshift({
                    app_id: deletedProject.id,
                    name: deletedProject.name,
                    package_name: deletedProject.package,
                    icon_url: deletedProject.icon_url,
                    target_lang: deletedProject.target_lang || 'ALL',
                    feedback_new_count: deletedProject.feedback_new_count || 0,
                    feedback_total_count: deletedProject.feedback_total_count || 0,
                    archive_reason: null,
                });
                renderProjects();
                renderArchivedProjects();
            }

            closeDeleteModal();
            // Background refresh for accurate data
            loadProjects(true).catch(function() {});
            loadArchivedProjects({ background: true, silent: true }).catch(function() {});
        } else {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        }
    } catch (error) {
        console.error('Delete project error:', error);
        const errorMessage = getApiErrorMessage(error && error.message, 'networkError');
        if (tg.showAlert) tg.showAlert(errorMessage);
        else alert(errorMessage);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function saveProject() {
    _clearProjectPackageError();

    const nameInput = document.getElementById('app-name').value.trim();
    let packageInput = document.getElementById('app-package').value.trim();
    const iconInput = document.getElementById('app-icon').value.trim();
    const instructionsInput = document.getElementById('app-instructions').value.trim();
    const targetLang = (document.getElementById('app-target-lang').value || 'ALL').toUpperCase();
    const requestReviews = !!(document.getElementById('app-request-reviews') && document.getElementById('app-request-reviews').checked);
    const pricingPayload = buildProjectPricingPayload('add');
    if (!pricingPayload) return;

    const isStandard = document.getElementById('seg-standard').classList.contains('active');
    const groupInput = isStandard ? '' : document.getElementById('app-group').value.trim();

    if (!isStandard && groupInput && !isValidGoogleGroupUrl(groupInput)) {
        handleApiError('invalid_google_group_url');
        return;
    }

    if (!packageInput.includes('play.google.com/store/apps/details?id=')) {
        _showProjectPackageError('invalidPlayLink');
        return;
    }
    if (!nameInput || !packageInput) {
        if (tg.showAlert) tg.showAlert(t.fillFields);
        else alert(t.fillFields);
        return;
    }
    if (nameInput.length > 30) {
        if (tg.showAlert) tg.showAlert(t.appNameTooLong);
        else alert(t.appNameTooLong);
        return;
    }

    try {
        if (packageInput.includes('play.google.com')) {
            const url = new URL(packageInput);
            const idParam = url.searchParams.get('id');
            if (idParam) packageInput = idParam;
        }
    } catch (error) {
        console.error('Play URL parse error:', error);
    }

    if (isStandard) {
        pendingProjectData = {
            owner_id: userId,
            name: nameInput,
            package_name: packageInput,
            icon_url: iconInput || null,
            google_group_url: null,
            instructions: instructionsInput || null,
            target_lang: targetLang,
            request_reviews: requestReviews,
            ...pricingPayload
        };
        document.getElementById('email-warning-modal').classList.add('active');
        return;
    }

    await doSaveProject({
        owner_id: userId,
        name: nameInput,
        package_name: packageInput,
        icon_url: iconInput || null,
        google_group_url: groupInput || null,
        instructions: instructionsInput || null,
        target_lang: targetLang,
        request_reviews: requestReviews,
        ...pricingPayload
    });
}

async function confirmEmailWarning() {
    document.getElementById('email-warning-modal').classList.remove('active');
    if (pendingProjectData) {
        await doSaveProject(pendingProjectData);
        pendingProjectData = null;
    }
}

async function _confirmProjectCreationPersistence(projectData) {
    var normalizedPackage = String(projectData && projectData.package_name || '').trim();
    if (!userId || !normalizedPackage) return null;

    try {
        var response = await fetchWithRetry(`${API_BASE}/projects/${userId}`, {
            timeoutMs: 10000
        }, 1);
        if (!response.ok) return null;
        var payload = await response.json();
        var projects = Array.isArray(payload && payload.projects) ? payload.projects : [];
        return projects.find(function(project) {
            return String(project && project.package_name || '').trim() === normalizedPackage;
        }) || null;
    } catch (error) {
        console.warn('Project create persistence check failed:', error);
        return null;
    }
}

async function doSaveProject(projectData) {
    const saveBtn = document.getElementById('t-save');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = '...';
    saveBtn.disabled = true;
    _clearProjectPackageError();
    try {
        var leadInviterId = _getLeadInviteInviterId();
        var response = null;
        var result = null;
        var requestError = null;
        var requestBody = Object.assign({}, projectData, {
            lead_inviter_id: leadInviterId > 0 ? leadInviterId : null,
            init_data: tg.initData || '',
        });

        try {
            response = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            requestError = error;
        }

        if (response) {
            result = await _readJsonResponseSafely(response, 'Project create');
            if (getBackendErrorCode(result) === 'username_required') {
                showNoUsernameOverlay();
                return;
            }
        }

        if (requestError || !response || !response.ok || !result || result.status !== 'success') {
            var confirmedProject = await _confirmProjectCreationPersistence(projectData);
            if (confirmedProject) {
                result = {
                    status: 'success',
                    app_id: Number(confirmedProject.app_id || confirmedProject.id || 0),
                };
            }
        }

        if (result && result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (leadInviterId > 0) {
                _clearStartappQueryParam();
            }
            _clearProjectPackageError();
            closeModal();
            loadProjects();
        } else {
            var backendCode = getBackendErrorCode(result);
            if (backendCode === 'external_tracking_merge_required') {
                var externalCount = Number(result && result.details && result.details.external_testers_count || 0);
                var mergeMessage = window.t('externalMergeProjectConfirm', {
                    count: externalCount,
                    package_name: String(projectData && projectData.package_name || ''),
                }, lang);
                var confirmed = await new Promise(function(resolve) {
                    if (tg.showConfirm) {
                        tg.showConfirm(mergeMessage, function(ok) { resolve(!!ok); });
                    } else {
                        resolve(window.confirm(mergeMessage));
                    }
                });
                if (confirmed) {
                    await doSaveProject(Object.assign({}, projectData, { allow_external_merge: true }));
                }
                return;
            }
            if (_handleProjectCreateConflict(backendCode)) {
                return;
            }
            handleApiError(backendCode, result && result.details ? result.details : {});
        }
    } catch (error) {
        console.error('Save project error:', error);
        handleApiError('network_error');
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

async function saveProjectEdit() {
    if (!projectToEdit) return;
    const name = document.getElementById('edit-name').value.trim();
    const instructions = document.getElementById('edit-description').value.trim();
    const iconUrl = document.getElementById('edit-icon').value.trim();
    const googleGroupUrl = document.getElementById('edit-group').value.trim();
    const targetLang = (document.getElementById('edit-target-lang').value || 'ALL').toUpperCase();
    const requestReviews = !!(document.getElementById('edit-request-reviews') && document.getElementById('edit-request-reviews').checked);
    const pricingPayload = buildProjectPricingPayload('edit');
    if (!pricingPayload) return;

    if (!name) {
        if (tg.showAlert) tg.showAlert(t.fillFields);
        else alert(t.fillFields);
        return;
    }

    if (googleGroupUrl && !isValidGoogleGroupUrl(googleGroupUrl)) {
        handleApiError('invalid_google_group_url');
        return;
    }

    const editBtn = document.getElementById('t-editSave');
    const originalText = editBtn.innerText;
    editBtn.innerText = '...';
    editBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/projects/${projectToEdit}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                instructions: instructions || null,
                icon_url: iconUrl || null,
                google_group_url: googleGroupUrl || window.DEFAULT_GOOGLE_GROUP_URL,
                target_lang: targetLang,
                request_reviews: requestReviews,
                ...pricingPayload
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            closeEditModal();
            loadProjects();
        } else {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
        }
    } catch (error) {
        console.error('Edit project error:', error);
        handleApiError('network_error');
    } finally {
        editBtn.innerText = originalText;
        editBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (ensureLanguageRuntimeConsistency()) {
        return;
    }

    if (localStorage.getItem('hideBanner') === 'true') {
        const banner = document.getElementById('main-banner');
        if (banner) banner.style.display = 'none';
    }

    refreshLanguageUi();
    if (!hasTelegramUsername()) {
        showNoUsernameOverlay();
        return;
    }
    var bootstrapProfileSyncPromise = syncTelegramProfile();
    loadUserProfilePreferences().catch(function() {});

    fetch(`${API_BASE}/users/${userId}/language`)
        .then(response => response.json())
        .then(data => {
            var serverLanguage = normalizeNativeLanguageCode(data.language);
            var selectedLanguage = getSelectedAppLanguage();
            if (isAutoTranslatedLanguage(selectedLanguage)) {
                if (getServerSafeLanguage(selectedLanguage) !== serverLanguage) {
                    sendLanguagePreferenceToServer(getServerSafeLanguage(selectedLanguage));
                }
                return;
            }
            if (serverLanguage && serverLanguage !== lang) {
                applyLanguage(serverLanguage, { skipServerSync: true, force: true });
            }
        })
        .catch(() => {});

    syncUserTimezone(false).catch(() => {});

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _pendingScreenshotReminderUsername !== null) {
            const username = _pendingScreenshotReminderUsername;
            _pendingScreenshotReminderUsername = null;
            setTimeout(() => showScreenshotCompleteModal(username), 300);
        }
        if (!document.hidden) {
            _syncActiveTimerState();
            renderTests(true);
            loadTasks(true).catch(() => {});
            loadIncomingOffers({ background: true }).catch(() => {});
            loadReliabilitySummary(true).catch(() => {});
        }
    });

    window.addEventListener('focus', function() {
        _syncActiveTimerState();
        if (window.renderTests) window.renderTests(true);
    });

    window.addEventListener('pageshow', function() {
        _syncActiveTimerState();
        if (window.renderTests) window.renderTests(true);
    });

    document.addEventListener('pointerdown', (event) => {
        const menu = document.getElementById('system-drop-menu');
        if (!menu || !menu.classList.contains('active')) return;
        if (!menu.contains(event.target)) {
            menu.classList.remove('active');
        }
    });

    _loadFirstDayScreenshotState();
    _loadTimerReadyState();
    _loadPersistedActiveTimer();

    (async function() {
        await bootstrapProfileSyncPromise;
        var guestIntent = _parseGuestClaimIntent();
        if (guestIntent) {
            await _handleGuestClaimIntent(guestIntent);
        }

        loadTasks();
        loadReliabilitySummary();
        loadReliabilityBreakdown(true);
        loadIncomingOffers();
        startOffersPolling();
        startMarketPolling();
        loadEvents();
        scheduleDeferredBootstrap();
        await _handleInitialRoute();
    })().catch(function(error) {
        console.error('Initial bootstrap failed:', error);
    });
});

Object.assign(window, {
    fetchWithRetry,
    markMutualOfferPendingUi,
    loadAllData,
    hasMarketCache,
    hydrateMarketFromCache,
    getMarketFeedState,
    resetMarketFeedStates,
    setMarketForceSkeleton,
    refreshLanguageUi,
    syncAutoAcceptToggleUi,
    applyLanguage,
    showAutoAcceptMutualInfo,
    handleAutoAcceptMutualToggle,
    toggleLanguage,
    loadTasks,
    loadIncomingOffers,
    loadMutualFeed,
    loadGuestApps,
    loadBountyFeed,
    loadEvents,
    loadProjects,
    forceRefreshMarket,
    getLocalDate,
    getRuDaysWord,
    formatEditProjectCreatedAt,
    getOfferApiError,
    decideOffer,
    createMutualOffer,
    sendMutualOffer,
    joinMutual,
    joinDirect,
    joinBounty,
    startTimer,
    openPlay,
    handleFirstDownload,
    handleScreenshotAndConfirm,
    submitIssueReport,
    sendReport,
    toggleVisibility,
    confirmDropTest,
    confirmLeaveMutual,
    confirmKickTester,
    confirmOvertimeLeave,
    openEarnBustModal,
    toggleGuestProjectsAccordion,
    openGuestProjectsTesterSearch,
    updateGuestProjectsFilter,
    showMoreGuestProjects,
    getGuestProjectsPageSize,
    getFilteredGuestProjects,
    getVisibleGuestProjects,
    canShowMoreGuestProjects,
    getGuestProjectAvailableLangs,
    normalizeGuestInviteLanguage,
    getDefaultGuestInviteLanguage,
    buildGuestInviteDeepLink,
    buildExternalClaimStartLink,
    startExternalTrackingSession,
    submitExternalTrackingProof,
    submitExternalDailyCheckin,
    cancelExternalTracking,
    getDefaultCheckpointReportLanguage,
    getDefaultCheckpointReportLanguage,
    buildCheckpointReportPrefill,
    sendCheckpointScreenshotAndConfirm,
    initiateProjectFeedback,
    openProjectFeedback,
    sendProjectFeedbackMedia,
    openFeedbackRewardModal,
    closeFeedbackRewardModal,
    canPromptPlayReview,
    canTogglePlayReview,
    isPlayReviewMarked,
    getPlayReviewUrl,
    setPlayReviewSubmittedPending,
    setFeedbackRewardBust,
    setFeedbackRewardKarma,
    submitFeedbackReward,
    sendFeedback,
    submitFeedback,
    submitSocialLink,
    saveProjectSync,
    loadArchivedProjects,
    loadReliabilitySummary,
    loadReliabilityBreakdown,
    confirmHardDelete,
    fetchKarmaBreakdown,
    sendKarmaReward,
    confirmStart,
    handleClaimGrantClick,
    claimEarlyFinishBonus,
    deleteTester,
    resolveAccessError,
    contactAccessTester,
    deleteAccessTester,
    confirmDeleteProject,
    formatAmountValue,
    formatBustAmount,
    setProjectMode,
    updateProjectPricing,
    setProjectTargetLang,
    getApiErrorMessage,
    startMassInvite,
    resetMassInviteCooldown,
    getReliabilityState,
    rerenderDynamicUi,
    refreshActiveTabData,
    saveProject,
    confirmEmailWarning,
    saveProjectEdit,
    publishProjectToMarket,
    showFeedbackRewardKarmaInfo,
    isFirstDayScreenshotVisible,
    setFirstDayScreenshotVisible
});

Object.assign(window.App, {
    tg,
    API_BASE,
    userId,
    userEmail: _userEmail,
    autoAcceptMutual: _autoAcceptMutualEnabled,
    getState: () => ({
        lang,
        appLang,
        userEmail: _userEmail,
        autoAcceptMutual: _autoAcceptMutualEnabled,
        myTests,
        incomingOffers,
        myProjects,
        mutualSeeking,
        mutualPrelaunch,
        bountyContracts,
        communityEvents,
        eventsExpanded,
        visibilityStats,
        reliabilitySummary,
        reliabilityBreakdown,
        archivedProjects,
        activeProjectFeedbackAppId: _activeProjectFeedbackAppId,
        activeProjectFeedbackItems: _activeProjectFeedbackItems,
    }),
    refreshLanguageUi,
    applyLanguage,
    loadTasks,
    loadProjects,
    loadEvents,
    loadMutualFeed,
    loadBountyFeed,
    loadArchivedProjects,
    loadReliabilitySummary,
    loadReliabilityBreakdown,
    saveProject,
    setProjectTargetLang,
    saveProjectEdit,
    publishProjectToMarket,
    startMassInvite,
    resetMassInviteCooldown,
    joinDirect,
    startExternalTrackingSession,
    submitExternalTrackingProof,
    submitExternalDailyCheckin,
    cancelExternalTracking,
    buildExternalClaimStartLink
});
