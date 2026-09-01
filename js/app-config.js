/* Phase 5.1 — js/app-config.js (structural split from app.js, lines 1-1108) */
/* TG init, constants, language system, state vars, route parsing */

window.App = window.App || {};
window.App.checkinProofMode = window.App.checkinProofMode || 'off';
window.App.screenshotProofUploadEnabled = window.App.screenshotProofUploadEnabled === true;
window.App.testingControlEnabled = window.App.testingControlEnabled === true;
window.App.checkinProofGalleryEnabled = window.App.checkinProofGalleryEnabled === true;

var tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

function _closeTopTelegramBackTarget() {
    var proofPreviewModal = document.getElementById('checkin-proof-preview-modal');
    if (proofPreviewModal && proofPreviewModal.classList.contains('active')) {
        if (typeof closeCheckinProofPreview === 'function') closeCheckinProofPreview();
        else proofPreviewModal.classList.remove('active');
        return true;
    }

    var dossierModal = document.getElementById('dossier-modal');
    if (dossierModal && dossierModal.classList.contains('active')) {
        if (typeof closeDossierModal === 'function') {
            closeDossierModal();
        } else {
            dossierModal.classList.remove('active');
        }
        return true;
    }

    var protectionCenter = document.getElementById('protection-center');
    if (protectionCenter && protectionCenter.classList.contains('active')) {
        if (typeof closeProtectionCenter === 'function') {
            closeProtectionCenter();
        } else {
            protectionCenter.classList.remove('active');
        }
        return true;
    }

    var attractSheet = document.getElementById('attract-testers-sheet-overlay');
    if (attractSheet && attractSheet.classList.contains('active')) {
        if (typeof closeAttractTestersSheet === 'function') {
            closeAttractTestersSheet();
        } else {
            attractSheet.classList.remove('active');
        }
        return true;
    }

    var activitySheet = document.getElementById('pc-activity-sheet');
    if (activitySheet && activitySheet.classList.contains('active')) {
        if (typeof pcCloseActivitySheet === 'function') pcCloseActivitySheet();
        else activitySheet.classList.remove('active');
        return true;
    }

    var activeModals = document.querySelectorAll('.modal-overlay.active');
    if (activeModals.length) {
        var topModal = activeModals[activeModals.length - 1];
        if (
            topModal.id === 'checkin-proof-upload-modal'
            && typeof window.closeCheckinProofUploadModal === 'function'
        ) {
            window.closeCheckinProofUploadModal();
            return true;
        }
        topModal.classList.remove('active');
        return true;
    }

    return false;
}

function syncTelegramBackButton() {
    if (!tg || !tg.BackButton) return;
    var protectionCenter = document.getElementById('protection-center');
    var attractSheet = document.getElementById('attract-testers-sheet-overlay');
    var shouldShow = (protectionCenter && protectionCenter.classList.contains('active'))
        || (attractSheet && attractSheet.classList.contains('active'))
        || document.querySelectorAll('.modal-overlay.active').length > 0;
    if (shouldShow) {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

function initTelegramBackButton() {
    if (!tg || !tg.BackButton || tg.BackButton._devtestBound) return;
    tg.BackButton.onClick(function() {
        if (!_closeTopTelegramBackTarget()) {
            tg.BackButton.hide();
        } else {
            syncTelegramBackButton();
        }
    });
    tg.BackButton._devtestBound = true;

    var watchSelectors = '.modal-overlay, .protection-center-view, #attract-testers-sheet-overlay';
    document.querySelectorAll(watchSelectors).forEach(function(element) {
        if (typeof MutationObserver === 'undefined') return;
        var observer = new MutationObserver(function() {
            syncTelegramBackButton();
        });
        observer.observe(element, { attributes: true, attributeFilter: ['class'] });
    });

    syncTelegramBackButton();
}

window.syncTelegramBackButton = syncTelegramBackButton;
window.initTelegramBackButton = initTelegramBackButton;
window.DEFAULT_GOOGLE_GROUP_URL = 'https://groups.google.com/g/google-play-dev-test';

const initData = tg.initDataUnsafe || {};
const TELEGRAM_RUNTIME_BOT_USERNAME = String(
    (initData.receiver && initData.receiver.username)
    || (initData.chat && initData.chat.username)
    || ''
).trim().replace(/^@+/, '');
const BOT_USERNAME = String(
    window.__BOT_USERNAME__
    || TELEGRAM_RUNTIME_BOT_USERNAME
    || window.App.botUsername
    || 'Android12TestersBot'
).trim().replace(/^@+/, '');
const WEBAPP_SHORTNAME = 'app';
const BOT_CHAT_URL = `https://t.me/${BOT_USERNAME}`;
window.App.botUsername = BOT_USERNAME;
window.App.webappShortname = WEBAPP_SHORTNAME;
const RU_INTERFACE_LANGUAGE_CODES = ['ru', 'by', 'kz', 'kg', 'md', 'am', 'az', 'tj', 'uz', 'tm'];
const GUEST_CLAIM_START_PARAM_RE = /^(?:guest_|claim_)([a-zA-Z0-9.\-_]+)_(\d+)$/i;
const MUTUAL_INVITE_START_PARAM_RE = /^ref_mutual_(\d+)_(\d+)$/i;
const MUTUAL_DIRECT_START_PARAM_RE = /^mutual_(\d+)$/i;
const LEAD_INVITE_START_PARAM_RE = /^lead_(\d+)$/i;
const GUEST_CLAIM_SESSION_PREFIX = 'guest_claim_handled_v1:';
const USER_TIMEZONE_STORAGE_KEY = 'user_system_timezone';
const langCode = initData.user?.language_code;
const userId = initData.user?.id || 123456789;
// DEBUG: set true to test WebApp without Telegram @username (revert before release).
const DEBUG_BYPASS_USERNAME_GATE = false;
const telegramUsername = DEBUG_BYPASS_USERNAME_GATE
    ? (String(initData.user?.username || '').trim().replace(/^@+/, '') || 'tester_no_name')
    : String(initData.user?.username || '').trim().replace(/^@+/, '');
const API_BASE_OVERRIDE = String(window.__API_BASE__ || '').trim();
const PRODUCTION_API_BASE = 'https://devtest-backend.onrender.com/api';
// Optional local hint from js/env-config.js. Vercel does NOT need redeploy on tunnel restart:
// it discovers the live URL from staging Supabase (published by local backend on start).
const TEST_API_BASE_HINT = String(window.__TEST_API_BASE__ || '').trim();
// Staging publishable discovery (anon can only SELECT key=test_api_base).
const TEST_API_DISCOVERY_URL = 'https://fksbrckitigxehxxfaru.supabase.co/rest/v1/dev_runtime_config?key=eq.test_api_base&select=value&limit=1';
const TEST_API_DISCOVERY_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrc2JyY2tpdGlneGVoeHhmYXJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4ODgxMjYsImV4cCI6MjA5NTQ2NDEyNn0.9VAo0mcz-PuRuNJn9bNYUOkMD42PfEM58puzY_n836g';

function _isTestFrontendHost() {
    var host = String(window.location.hostname || '').toLowerCase();
    if (!host) return false;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.endsWith('.vercel.app') || host === 'vercel.app') return true;
    if (String(window.__FRONTEND_ENV__ || '').trim().toLowerCase() === 'test') return true;
    return false;
}

function _normalizeApiBase(value) {
    var base = String(value || '').trim().replace(/\/+$/, '');
    if (!base) return '';
    return /\/api$/i.test(base) ? base : (base + '/api');
}

function _applyResolvedApiBase(nextBase) {
    API_BASE = _normalizeApiBase(nextBase) || '';
    window.API_BASE = API_BASE;
    if (window.App) window.App.API_BASE = API_BASE;
    window.API_USES_TUNNEL = /trycloudflare\.com|ngrok/i.test(API_BASE);
    window.API_USES_NGROK = window.API_USES_TUNNEL;
    console.info('[DevTest] API_BASE =', API_BASE || '(empty)', _isTestFrontendHost() ? '(test)' : '(production)');
    return API_BASE;
}

function _resolveApiBaseSync() {
    if (API_BASE_OVERRIDE) {
        return _normalizeApiBase(API_BASE_OVERRIDE);
    }
    if (_isTestFrontendHost()) {
        return _normalizeApiBase(TEST_API_BASE_HINT);
    }
    return PRODUCTION_API_BASE;
}

let API_BASE = _resolveApiBaseSync();
window.API_USES_TUNNEL = /trycloudflare\.com|ngrok/i.test(API_BASE);
window.API_USES_NGROK = window.API_USES_TUNNEL;
window.API_BASE = API_BASE;
if (window.App) window.App.API_BASE = API_BASE;
console.info('[DevTest] API_BASE (initial) =', API_BASE || '(empty)', _isTestFrontendHost() ? '(test)' : '(production)');
window.FEEDBACK_PUBLIC_LINK_BASE = (window.App && window.App.publicGroupUrl) || 'https://t.me/googleplay_console_12testers';

async function resolveTestApiBase() {
    if (API_BASE_OVERRIDE) {
        return _applyResolvedApiBase(API_BASE_OVERRIDE);
    }
    if (!_isTestFrontendHost()) {
        return _applyResolvedApiBase(PRODUCTION_API_BASE);
    }

    var discovered = '';
    try {
        var response = await fetch(TEST_API_DISCOVERY_URL, {
            method: 'GET',
            headers: {
                apikey: TEST_API_DISCOVERY_ANON_KEY,
                Authorization: 'Bearer ' + TEST_API_DISCOVERY_ANON_KEY,
                Accept: 'application/json',
            },
            cache: 'no-store',
        });
        if (response.ok) {
            var rows = await response.json();
            if (Array.isArray(rows) && rows[0] && rows[0].value) {
                discovered = _normalizeApiBase(rows[0].value);
            }
        } else {
            console.warn('[DevTest] test API discovery HTTP', response.status);
        }
    } catch (err) {
        console.warn('[DevTest] test API discovery failed:', err && err.message ? err.message : err);
    }

    if (discovered) {
        return _applyResolvedApiBase(discovered);
    }

    var fallback = _normalizeApiBase(TEST_API_BASE_HINT);
    if (!fallback) {
        console.error(
            '[DevTest] No test API base. Start local backend with WEBHOOK_URL set '
            + '(it publishes the tunnel pointer to staging).'
        );
    }
    return _applyResolvedApiBase(fallback);
}
window.resolveTestApiBase = resolveTestApiBase;

/** Signed Telegram WebApp initData for backend auth. Prefer over initDataUnsafe. */
function getTelegramInitDataRaw() {
    try {
        var raw = (typeof tg !== 'undefined' && tg && tg.initData)
            || (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData)
            || '';
        return String(raw || '').trim();
    } catch (_) {
        return '';
    }
}
window.getTelegramInitDataRaw = getTelegramInitDataRaw;

function withInitData(payload) {
    var body = Object.assign({}, payload || {});
    body.init_data = getTelegramInitDataRaw();
    return body;
}
window.withInitData = withInitData;

const _nativeFetch = window.fetch.bind(window);

function _resolveFetchRequestUrl(input) {
    if (typeof input === 'string') {
        return input;
    }
    if (input && typeof input.url === 'string') {
        return input.url;
    }
    return '';
}

window.fetch = function(input, init) {
    var requestUrl = _resolveFetchRequestUrl(input);
    // Legacy ngrok interstitial bypass only — Cloudflare Tunnel does not need it.
    var usesNgrok = /ngrok/i.test(API_BASE || '');
    if (!usesNgrok || !API_BASE || requestUrl.indexOf(API_BASE) !== 0) {
        return _nativeFetch(input, init);
    }

    var request = new Request(input, init);
    var headers = new Headers(request.headers || undefined);
    headers.set('ngrok-skip-browser-warning', 'true');

    return _nativeFetch(new Request(request, { headers: headers }));
};

function _normalizeBotUsername(rawValue) {
    var normalized = String(rawValue || '').trim().replace(/^@+/, '');
    return normalized || BOT_USERNAME;
}

async function loadRuntimeConfig() {
    try {
        var response = await fetch(`${API_BASE}/runtime-config`);
        if (!response.ok) {
            return;
        }
        var payload = await response.json();
        var runtimeBotUsername = _normalizeBotUsername(
            TELEGRAM_RUNTIME_BOT_USERNAME
            || (payload && payload.bot_username)
            || (window.App && window.App.botUsername)
            || BOT_USERNAME
        );
        if (runtimeBotUsername) {
            window.App.botUsername = runtimeBotUsername;
        }
        var runtimeShortname = String((payload && payload.webapp_shortname) || '').trim().replace(/^\/+|\/+$/g, '');
        if (runtimeShortname) {
            window.App.webappShortname = runtimeShortname;
        }
        var runtimeGroupUrl = String((payload && payload.public_group_url) || '').trim().replace(/\/+$/, '');
        if (runtimeGroupUrl) {
            window.App.publicGroupUrl = runtimeGroupUrl;
            window.FEEDBACK_PUBLIC_LINK_BASE = runtimeGroupUrl;
        }
        var runtimeGroupId = String((payload && payload.frontend_group_id) || '').trim();
        if (runtimeGroupId) {
            window.App.frontendGroupId = runtimeGroupId;
        }
        window.App.checkinProofMode = String((payload && payload.checkin_proof_mode) || 'off').trim().toLowerCase();
        window.App.screenshotProofUploadEnabled = !!(payload && payload.screenshot_proof_upload_enabled === true);
        window.App.testingControlEnabled = !!(payload && payload.testing_control_enabled === true);
        window.App.checkinProofGalleryEnabled = !!(payload && payload.checkin_proof_gallery_enabled === true);
    } catch (error) {
        console.warn('Runtime config fetch failed:', error);
    }
}

const GUEST_PROJECTS_PAGE_SIZE = 5;
const NATIVE_APP_LANGS = ['ru', 'en'];
const RTL_APP_LANGS = ['ar', 'fa', 'he', 'ur'];
const APP_BASE_LANGUAGE_STORAGE_KEY = 'app_language';
const APP_SELECTED_LANGUAGE_STORAGE_KEY = 'app_lang';
const GOOGLE_TRANSLATE_COOKIE_NAME = 'googtrans';
const GOOGLE_TRANSLATE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const GOOGLE_TRANSLATE_SYNC_GUARD_KEY = 'google_translate_sync_guard';

function hasTelegramUsername() {
    if (DEBUG_BYPASS_USERNAME_GATE) {
        return true;
    }
    return telegramUsername.length > 0;
}

function showNoUsernameOverlay() {
    if (DEBUG_BYPASS_USERNAME_GATE) {
        return;
    }
    var overlay = document.getElementById('no-username-overlay');
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

function resolveInterfaceLanguage(languageCode) {
    var normalized = String(languageCode || '').trim().toLowerCase();
    if (!normalized) {
        return 'en';
    }
    var primary = normalized.replace(/_/g, '-').split('-')[0];
    return RU_INTERFACE_LANGUAGE_CODES.indexOf(primary) >= 0 ? 'ru' : 'en';
}

function getDefaultBaseLanguage() {
    if (Object.keys(initData).length === 0) {
        return 'ru';
    }
    return resolveInterfaceLanguage(langCode);
}

function applyInterfaceLanguageFromServer(serverLanguage) {
    var normalized = normalizeNativeLanguageCode(serverLanguage);
    if (!normalized) {
        return false;
    }
    var selectedLanguage = getSelectedAppLanguage();
    if (isAutoTranslatedLanguage(selectedLanguage)) {
        if (getServerSafeLanguage(selectedLanguage) !== normalized) {
            sendLanguagePreferenceToServer(getServerSafeLanguage(selectedLanguage));
        }
        return true;
    }
    if (normalized !== lang) {
        applyLanguage(normalized, { skipServerSync: true, force: true });
    }
    return true;
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
        body: JSON.stringify(withInitData({ language: safeLanguage }))
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
var _checkinOpenTokenState = {};
var _firstDayScreenshotStateKey = 'devtest_firstday_screenshot_state_v1';
var _firstDayScreenshotState = {};
var _customGroupJoinedStateKey = 'devtest_custom_group_joined_v1';
var _customGroupJoinedState = {};
var _customGroupWaitStateKey = 'devtest_custom_group_wait_v1';
var _customGroupWaitState = {};
var _customGroupWaitTimerId = null;
var CUSTOM_GROUP_ACCESS_WAIT_MS = 15 * 60 * 1000;
var pendingProjectData = null;
var projectToEdit = null;
var _transferProjectId = null;
var _transferTargetUser = null;
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
var _earnRetentionBust = 0;
var _earnEarlyFinishCount = 0;
var _earnEarlyFinishBust = 0;
var _earnFeedbackCount = 0;
var _earnFeedbackBust = 0;
var _earnPlayReviewCount = 0;
var _earnPlayReviewBust = 0;
var _earnSprintJoined = 0;
var _earnSprintBust = 0;
var _feedbackType = 'bug';
var _inviteProjectId = null;
var archivedProjects = [];
var projectToDelete = null;
var _activeProjectFeedbackAppId = null;
var _activeProjectFeedbackItems = [];
var _activeProjectFeedbackArchived = false;
var _activeProjectFeedbackFullLoaded = false;
var _activeProjectFeedbackPartial = false;
var _activeProjectFeedbackLoadSeq = 0;
var _feedbackRewardTargetId = null;
var _feedbackRewardBust = 0;
var _feedbackRewardKarma = 0;
var _pendingFeedbackCheckinAppIds = {};
try {
    var _savedPendingFeedback = localStorage.getItem('pending_feedback_checkins_v1');
    if (_savedPendingFeedback) {
        _pendingFeedbackCheckinAppIds = JSON.parse(_savedPendingFeedback) || {};
    }
} catch (e) {
    console.error('Failed to load pending feedback checkins from localStorage:', e);
}
var myProjectsLoadError = false;
var marketCache = null;
var MARKET_CACHE_KEY = 'market_cache_v1';
var GUEST_PROJECTS_CACHE_KEY = 'guest_projects_cache_v2';
var EXTERNAL_COUNTS_CACHE_KEY = 'external_counts_cache_v2';
var _lastFetchTimes = { mutual: 0, bounty: 0, tests: 0, projects: 0, offers: 0, archived: 0, reliabilitySummary: 0, reliabilityBreakdown: 0 };
var MARKET_FETCH_THROTTLE_MS = 15000;
var TESTS_FETCH_THROTTLE_MS = 20000;
var PROJECTS_FETCH_THROTTLE_MS = 30000;
var OFFERS_FETCH_THROTTLE_MS = 15000;
var ARCHIVED_FETCH_THROTTLE_MS = 45000;
var RELIABILITY_FETCH_THROTTLE_MS = 30000;
var EXTERNAL_COUNTS_CACHE_TTL_MS = 10 * 60 * 1000;
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
var _autoAcceptMutualAvailable = false;
var _autoAcceptToggleInFlight = false;
var _defaultGroupJoined = false;
var _defaultGroupJoinedInFlight = false;
var _defaultGroupJoinedReady = false;
var _defaultGroupJoinedStorageKey = 'devtest_default_group_joined_v1';
var _openAccessProblemAppIds = new Set();
var _attachDeviceInfoToBugs = false;
var _deviceInfo = '';
var _deviceInfoIsManual = false;
var _deviceInfoLoaded = false;
var _deviceProfileComplete = false;
var _deviceProfileRewardClaimed = false;
var _deviceProfileBustEarned = 0;
var _deviceProfileBannerReady = false;
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
var _guestProjectsExpanded = true;
var _guestProjectsLoadError = false;
var _externalCountsInFlight = null;
var _externalCountsLoadedOnce = false;
var _externalCounts = { leads_count: 0, guest_projects_count: 0, updated_at: 0 };
var _guestProjectsVisibleCount = GUEST_PROJECTS_PAGE_SIZE;
var _guestProjectsFilters = { lang: 'ALL', category: 'ALL' };
var _guestProjectsAvailableLangs = [];
var _guestProjectTargetHighlightTimer = null;
var _postSyncToastSuppressionUntil = 0;
var POST_SYNC_TOAST_SUPPRESSION_MS = 8000;

function _bindLegacyAppState() {
    if (!window.App || typeof window.App.bindStateProperty !== 'function') {
        return;
    }
    window.App.bindStateProperty('appLang', function () { return appLang; }, function (value) { appLang = value; });
    window.App.bindStateProperty('lang', function () { return lang; }, function (value) { lang = value; });
    window.App.bindStateProperty('myTests', function () { return myTests; }, function (value) { myTests = value; });
    window.App.bindStateProperty('incomingOffers', function () { return incomingOffers; }, function (value) { incomingOffers = value; });
    window.App.bindStateProperty('myProjects', function () { return myProjects; }, function (value) { myProjects = value; });
    window.App.bindStateProperty('mutualSeeking', function () { return mutualSeeking; }, function (value) { mutualSeeking = value; });
    window.App.bindStateProperty('mutualPrelaunch', function () { return mutualPrelaunch; }, function (value) { mutualPrelaunch = value; });
    window.App.bindStateProperty('mutualReturns', function () { return mutualReturns; }, function (value) { mutualReturns = value; });
    window.App.bindStateProperty('guestProjects', function () { return guestProjects; }, function (value) { guestProjects = value; });
    window.App.bindStateProperty('bountyContracts', function () { return bountyContracts; }, function (value) { bountyContracts = value; });
    window.App.bindStateProperty('communityEvents', function () { return communityEvents; }, function (value) { communityEvents = value; });
    window.App.bindStateProperty('eventsExpanded', function () { return eventsExpanded; }, function (value) { eventsExpanded = value; });
    window.App.bindStateProperty('activeTimerAppId', function () { return activeTimerAppId; }, function (value) { activeTimerAppId = value; });
    window.App.bindStateProperty('_timerEndTimestamp', function () { return _timerEndTimestamp; }, function (value) { _timerEndTimestamp = value; });
    window.App.bindStateProperty('_timerIntervalId', function () { return _timerIntervalId; }, function (value) { _timerIntervalId = value; });
    window.App.bindStateProperty('_timerIsScreenshot', function () { return _timerIsScreenshot; }, function (value) { _timerIsScreenshot = value; });
    window.App.bindStateProperty('_timerOwnerUsername', function () { return _timerOwnerUsername; }, function (value) { _timerOwnerUsername = value; });
    window.App.bindStateProperty('_timerLocalDate', function () { return _timerLocalDate; }, function (value) { _timerLocalDate = value; });
    window.App.bindStateProperty('_timerStorageKey', function () { return _timerStorageKey; }, function (value) { _timerStorageKey = value; });
    window.App.bindStateProperty('_timerReadyStateKey', function () { return _timerReadyStateKey; }, function (value) { _timerReadyStateKey = value; });
    window.App.bindStateProperty('_timerReadyState', function () { return _timerReadyState; }, function (value) { _timerReadyState = value; });
    window.App.bindStateProperty('_firstDayScreenshotStateKey', function () { return _firstDayScreenshotStateKey; }, function (value) { _firstDayScreenshotStateKey = value; });
    window.App.bindStateProperty('_firstDayScreenshotState', function () { return _firstDayScreenshotState; }, function (value) { _firstDayScreenshotState = value; });
    window.App.bindStateProperty('_customGroupJoinedStateKey', function () { return _customGroupJoinedStateKey; }, function (value) { _customGroupJoinedStateKey = value; });
    window.App.bindStateProperty('_customGroupJoinedState', function () { return _customGroupJoinedState; }, function (value) { _customGroupJoinedState = value; });
    window.App.bindStateProperty('_customGroupWaitStateKey', function () { return _customGroupWaitStateKey; }, function (value) { _customGroupWaitStateKey = value; });
    window.App.bindStateProperty('_customGroupWaitState', function () { return _customGroupWaitState; }, function (value) { _customGroupWaitState = value; });
    window.App.bindStateProperty('_customGroupWaitTimerId', function () { return _customGroupWaitTimerId; }, function (value) { _customGroupWaitTimerId = value; });
    window.App.bindStateProperty('pendingProjectData', function () { return pendingProjectData; }, function (value) { pendingProjectData = value; });
    window.App.bindStateProperty('projectToEdit', function () { return projectToEdit; }, function (value) { projectToEdit = value; });
    window.App.bindStateProperty('_transferProjectId', function () { return _transferProjectId; }, function (value) { _transferProjectId = value; });
    window.App.bindStateProperty('_transferTargetUser', function () { return _transferTargetUser; }, function (value) { _transferTargetUser = value; });
    window.App.bindStateProperty('visibilityStats', function () { return visibilityStats; }, function (value) { visibilityStats = value; });
    window.App.bindStateProperty('_activeRequests', function () { return _activeRequests; }, function (value) { _activeRequests = value; });
    window.App.bindStateProperty('_karmaAppId', function () { return _karmaAppId; }, function (value) { _karmaAppId = value; });
    window.App.bindStateProperty('_karmaTesterId', function () { return _karmaTesterId; }, function (value) { _karmaTesterId = value; });
    window.App.bindStateProperty('_karmaDistributionProjectId', function () { return _karmaDistributionProjectId; }, function (value) { _karmaDistributionProjectId = value; });
    window.App.bindStateProperty('_offersTimerId', function () { return _offersTimerId; }, function (value) { _offersTimerId = value; });
    window.App.bindStateProperty('_reportAppId', function () { return _reportAppId; }, function (value) { _reportAppId = value; });
    window.App.bindStateProperty('_reportOwnerUsername', function () { return _reportOwnerUsername; }, function (value) { _reportOwnerUsername = value; });
    window.App.bindStateProperty('_issueReportAppId', function () { return _issueReportAppId; }, function (value) { _issueReportAppId = value; });
    window.App.bindStateProperty('_userEmail', function () { return _userEmail; }, function (value) { _userEmail = value; });
    window.App.bindStateProperty('_pendingScreenshotReminderUsername', function () { return _pendingScreenshotReminderUsername; }, function (value) { _pendingScreenshotReminderUsername = value; });
    window.App.bindStateProperty('_dropTestAppId', function () { return _dropTestAppId; }, function (value) { _dropTestAppId = value; });
    window.App.bindStateProperty('_leaveMutualAppId', function () { return _leaveMutualAppId; }, function (value) { _leaveMutualAppId = value; });
    window.App.bindStateProperty('_leaveMutualStats', function () { return _leaveMutualStats; }, function (value) { _leaveMutualStats = value; });
    window.App.bindStateProperty('_kickTarget', function () { return _kickTarget; }, function (value) { _kickTarget = value; });

    // Canonical writers so IIFE modules (termination-sheet) update the same lexical vars
    // that confirmDropTest / confirmLeaveMutual / confirmKickTester read.
    function setLeaveMutualAppId(appId) {
        _leaveMutualAppId = Number(appId || 0) || null;
        window._leaveMutualAppId = _leaveMutualAppId;
    }
    function setDropTestAppId(appId) {
        _dropTestAppId = Number(appId || 0) || null;
        window._dropTestAppId = _dropTestAppId;
    }
    function setKickTarget(appId, testerId) {
        var aid = Number(appId || 0);
        var tid = Number(testerId || 0);
        _kickTarget = (aid > 0 && tid > 0) ? { appId: aid, testerId: tid } : null;
        window._kickTarget = _kickTarget;
    }
    window.setLeaveMutualAppId = setLeaveMutualAppId;
    window.setDropTestAppId = setDropTestAppId;
    window.setKickTarget = setKickTarget;
    window.App.bindStateProperty('_overtimeTest', function () { return _overtimeTest; }, function (value) { _overtimeTest = value; });
    window.App.bindStateProperty('_syncProjectId', function () { return _syncProjectId; }, function (value) { _syncProjectId = value; });
    window.App.bindStateProperty('_socialBonusStatus', function () { return _socialBonusStatus; }, function (value) { _socialBonusStatus = value; });
    window.App.bindStateProperty('_earnGrantCount', function () { return _earnGrantCount; }, function (value) { _earnGrantCount = value; });
    window.App.bindStateProperty('_earnGrantBust', function () { return _earnGrantBust; }, function (value) { _earnGrantBust = value; });
    window.App.bindStateProperty('_earnReferralBust', function () { return _earnReferralBust; }, function (value) { _earnReferralBust = value; });
    window.App.bindStateProperty('_earnGuestInviteCount', function () { return _earnGuestInviteCount; }, function (value) { _earnGuestInviteCount = value; });
    window.App.bindStateProperty('_earnGuestInviteBust', function () { return _earnGuestInviteBust; }, function (value) { _earnGuestInviteBust = value; });
    window.App.bindStateProperty('_earnExchangeBust', function () { return _earnExchangeBust; }, function (value) { _earnExchangeBust = value; });
    window.App.bindStateProperty('_earnRetentionBust', function () { return _earnRetentionBust; }, function (value) { _earnRetentionBust = value; });
    window.App.bindStateProperty('_earnEarlyFinishCount', function () { return _earnEarlyFinishCount; }, function (value) { _earnEarlyFinishCount = value; });
    window.App.bindStateProperty('_earnEarlyFinishBust', function () { return _earnEarlyFinishBust; }, function (value) { _earnEarlyFinishBust = value; });
    window.App.bindStateProperty('_earnFeedbackCount', function () { return _earnFeedbackCount; }, function (value) { _earnFeedbackCount = value; });
    window.App.bindStateProperty('_earnFeedbackBust', function () { return _earnFeedbackBust; }, function (value) { _earnFeedbackBust = value; });
    window.App.bindStateProperty('_earnPlayReviewCount', function () { return _earnPlayReviewCount; }, function (value) { _earnPlayReviewCount = value; });
    window.App.bindStateProperty('_earnPlayReviewBust', function () { return _earnPlayReviewBust; }, function (value) { _earnPlayReviewBust = value; });
    window.App.bindStateProperty('_earnSprintJoined', function () { return _earnSprintJoined; }, function (value) { _earnSprintJoined = value; });
    window.App.bindStateProperty('_earnSprintBust', function () { return _earnSprintBust; }, function (value) { _earnSprintBust = value; });
    window.App.bindStateProperty('_feedbackType', function () { return _feedbackType; }, function (value) { _feedbackType = value; });
    window.App.bindStateProperty('_inviteProjectId', function () { return _inviteProjectId; }, function (value) { _inviteProjectId = value; });
    window.App.bindStateProperty('archivedProjects', function () { return archivedProjects; }, function (value) { archivedProjects = value; });
    window.App.bindStateProperty('projectToDelete', function () { return projectToDelete; }, function (value) { projectToDelete = value; });
    window.App.bindStateProperty('_activeProjectFeedbackAppId', function () { return _activeProjectFeedbackAppId; }, function (value) { _activeProjectFeedbackAppId = value; });
    window.App.bindStateProperty('_activeProjectFeedbackItems', function () { return _activeProjectFeedbackItems; }, function (value) { _activeProjectFeedbackItems = value; });
    window.App.bindStateProperty('_activeProjectFeedbackArchived', function () { return _activeProjectFeedbackArchived; }, function (value) { _activeProjectFeedbackArchived = value; });
    window.App.bindStateProperty('_activeProjectFeedbackFullLoaded', function () { return _activeProjectFeedbackFullLoaded; }, function (value) { _activeProjectFeedbackFullLoaded = value; });
    window.App.bindStateProperty('_activeProjectFeedbackPartial', function () { return _activeProjectFeedbackPartial; }, function (value) { _activeProjectFeedbackPartial = value; });
    window.App.bindStateProperty('_activeProjectFeedbackLoadSeq', function () { return _activeProjectFeedbackLoadSeq; }, function (value) { _activeProjectFeedbackLoadSeq = value; });
    window.App.bindStateProperty('_feedbackRewardTargetId', function () { return _feedbackRewardTargetId; }, function (value) { _feedbackRewardTargetId = value; });
    window.App.bindStateProperty('_feedbackRewardBust', function () { return _feedbackRewardBust; }, function (value) { _feedbackRewardBust = value; });
    window.App.bindStateProperty('_feedbackRewardKarma', function () { return _feedbackRewardKarma; }, function (value) { _feedbackRewardKarma = value; });
    window.App.bindStateProperty('myProjectsLoadError', function () { return myProjectsLoadError; }, function (value) { myProjectsLoadError = value; });
    window.App.bindStateProperty('marketCache', function () { return marketCache; }, function (value) { marketCache = value; });
    window.App.bindStateProperty('MARKET_CACHE_KEY', function () { return MARKET_CACHE_KEY; }, function (value) { MARKET_CACHE_KEY = value; });
    window.App.bindStateProperty('GUEST_PROJECTS_CACHE_KEY', function () { return GUEST_PROJECTS_CACHE_KEY; }, function (value) { GUEST_PROJECTS_CACHE_KEY = value; });
    window.App.bindStateProperty('EXTERNAL_COUNTS_CACHE_KEY', function () { return EXTERNAL_COUNTS_CACHE_KEY; }, function (value) { EXTERNAL_COUNTS_CACHE_KEY = value; });
    window.App.bindStateProperty('_lastFetchTimes', function () { return _lastFetchTimes; }, function (value) { _lastFetchTimes = value; });
    window.App.bindStateProperty('MARKET_FETCH_THROTTLE_MS', function () { return MARKET_FETCH_THROTTLE_MS; }, function (value) { MARKET_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('TESTS_FETCH_THROTTLE_MS', function () { return TESTS_FETCH_THROTTLE_MS; }, function (value) { TESTS_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('PROJECTS_FETCH_THROTTLE_MS', function () { return PROJECTS_FETCH_THROTTLE_MS; }, function (value) { PROJECTS_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('OFFERS_FETCH_THROTTLE_MS', function () { return OFFERS_FETCH_THROTTLE_MS; }, function (value) { OFFERS_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('ARCHIVED_FETCH_THROTTLE_MS', function () { return ARCHIVED_FETCH_THROTTLE_MS; }, function (value) { ARCHIVED_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('RELIABILITY_FETCH_THROTTLE_MS', function () { return RELIABILITY_FETCH_THROTTLE_MS; }, function (value) { RELIABILITY_FETCH_THROTTLE_MS = value; });
    window.App.bindStateProperty('EXTERNAL_COUNTS_CACHE_TTL_MS', function () { return EXTERNAL_COUNTS_CACHE_TTL_MS; }, function (value) { EXTERNAL_COUNTS_CACHE_TTL_MS = value; });
    window.App.bindStateProperty('SYNC_CONFIRMATION_DELAY_MS', function () { return SYNC_CONFIRMATION_DELAY_MS; }, function (value) { SYNC_CONFIRMATION_DELAY_MS = value; });
    window.App.bindStateProperty('_marketInFlight', function () { return _marketInFlight; }, function (value) { _marketInFlight = value; });
    window.App.bindStateProperty('OFFERS_CACHE_KEY', function () { return OFFERS_CACHE_KEY; }, function (value) { OFFERS_CACHE_KEY = value; });
    window.App.bindStateProperty('_offersInFlight', function () { return _offersInFlight; }, function (value) { _offersInFlight = value; });
    window.App.bindStateProperty('_offersLoadError', function () { return _offersLoadError; }, function (value) { _offersLoadError = value; });
    window.App.bindStateProperty('_offersLoadedOnce', function () { return _offersLoadedOnce; }, function (value) { _offersLoadedOnce = value; });
    window.App.bindStateProperty('_offersPollId', function () { return _offersPollId; }, function (value) { _offersPollId = value; });
    window.App.bindStateProperty('_blockedOfferProjectsByOwner', function () { return _blockedOfferProjectsByOwner; }, function (value) { _blockedOfferProjectsByOwner = value; });
    window.App.bindStateProperty('TESTS_CACHE_KEY', function () { return TESTS_CACHE_KEY; }, function (value) { TESTS_CACHE_KEY = value; });
    window.App.bindStateProperty('myTestsCache', function () { return myTestsCache; }, function (value) { myTestsCache = value; });
    window.App.bindStateProperty('_testsInFlight', function () { return _testsInFlight; }, function (value) { _testsInFlight = value; });
    window.App.bindStateProperty('_testsLoadedOnce', function () { return _testsLoadedOnce; }, function (value) { _testsLoadedOnce = value; });
    window.App.bindStateProperty('PROJECTS_CACHE_KEY', function () { return PROJECTS_CACHE_KEY; }, function (value) { PROJECTS_CACHE_KEY = value; });
    window.App.bindStateProperty('myProjectsCache', function () { return myProjectsCache; }, function (value) { myProjectsCache = value; });
    window.App.bindStateProperty('_projectsInFlight', function () { return _projectsInFlight; }, function (value) { _projectsInFlight = value; });
    window.App.bindStateProperty('_projectsLoadedOnce', function () { return _projectsLoadedOnce; }, function (value) { _projectsLoadedOnce = value; });
    window.App.bindStateProperty('RELIABILITY_SUMMARY_CACHE_KEY', function () { return RELIABILITY_SUMMARY_CACHE_KEY; }, function (value) { RELIABILITY_SUMMARY_CACHE_KEY = value; });
    window.App.bindStateProperty('RELIABILITY_BREAKDOWN_CACHE_KEY', function () { return RELIABILITY_BREAKDOWN_CACHE_KEY; }, function (value) { RELIABILITY_BREAKDOWN_CACHE_KEY = value; });
    window.App.bindStateProperty('reliabilitySummaryCache', function () { return reliabilitySummaryCache; }, function (value) { reliabilitySummaryCache = value; });
    window.App.bindStateProperty('reliabilityBreakdownCache', function () { return reliabilityBreakdownCache; }, function (value) { reliabilityBreakdownCache = value; });
    window.App.bindStateProperty('reliabilitySummary', function () { return reliabilitySummary; }, function (value) { reliabilitySummary = value; });
    window.App.bindStateProperty('reliabilityBreakdown', function () { return reliabilityBreakdown; }, function (value) { reliabilityBreakdown = value; });
    window.App.bindStateProperty('_reliabilitySummaryInFlight', function () { return _reliabilitySummaryInFlight; }, function (value) { _reliabilitySummaryInFlight = value; });
    window.App.bindStateProperty('_reliabilityBreakdownInFlight', function () { return _reliabilityBreakdownInFlight; }, function (value) { _reliabilityBreakdownInFlight = value; });
    window.App.bindStateProperty('_reliabilitySummaryLoadedOnce', function () { return _reliabilitySummaryLoadedOnce; }, function (value) { _reliabilitySummaryLoadedOnce = value; });
    window.App.bindStateProperty('_reliabilityBreakdownLoadedOnce', function () { return _reliabilityBreakdownLoadedOnce; }, function (value) { _reliabilityBreakdownLoadedOnce = value; });
    window.App.bindStateProperty('_reliabilitySummaryLoadError', function () { return _reliabilitySummaryLoadError; }, function (value) { _reliabilitySummaryLoadError = value; });
    window.App.bindStateProperty('_reliabilityBreakdownLoadError', function () { return _reliabilityBreakdownLoadError; }, function (value) { _reliabilityBreakdownLoadError = value; });
    window.App.bindStateProperty('_pendingActions', function () { return _pendingActions; }, function (value) { _pendingActions = value; });
    window.App.bindStateProperty('_autoAcceptMutualEnabled', function () { return _autoAcceptMutualEnabled; }, function (value) { _autoAcceptMutualEnabled = value; });
    window.App.bindStateProperty('_autoAcceptMutualAvailable', function () { return _autoAcceptMutualAvailable; }, function (value) { _autoAcceptMutualAvailable = value; });
    window.App.bindStateProperty('_autoAcceptToggleInFlight', function () { return _autoAcceptToggleInFlight; }, function (value) { _autoAcceptToggleInFlight = value; });
    window.App.bindStateProperty('_defaultGroupJoined', function () { return _defaultGroupJoined; }, function (value) { _defaultGroupJoined = value; });
    window.App.bindStateProperty('_defaultGroupJoinedInFlight', function () { return _defaultGroupJoinedInFlight; }, function (value) { _defaultGroupJoinedInFlight = value; });
    window.App.bindStateProperty('_defaultGroupJoinedReady', function () { return _defaultGroupJoinedReady; }, function (value) { _defaultGroupJoinedReady = value; });
    window.App.bindStateProperty('_openAccessProblemAppIds', function () { return _openAccessProblemAppIds; }, function (value) { _openAccessProblemAppIds = value; });
    window.App.bindStateProperty('_pendingInitialHighlightTestId', function () { return _pendingInitialHighlightTestId; }, function (value) { _pendingInitialHighlightTestId = value; });
    window.App.bindStateProperty('_highlightTestTimerId', function () { return _highlightTestTimerId; }, function (value) { _highlightTestTimerId = value; });
    window.App.bindStateProperty('_backgroundSyncState', function () { return _backgroundSyncState; }, function (value) { _backgroundSyncState = value; });
    window.App.bindStateProperty('_deferredBootstrapStarted', function () { return _deferredBootstrapStarted; }, function (value) { _deferredBootstrapStarted = value; });
    window.App.bindStateProperty('_initialRouteHandled', function () { return _initialRouteHandled; }, function (value) { _initialRouteHandled = value; });
    window.App.bindStateProperty('_marketPollId', function () { return _marketPollId; }, function (value) { _marketPollId = value; });
    window.App.bindStateProperty('MARKET_POLL_INTERVAL_MS', function () { return MARKET_POLL_INTERVAL_MS; }, function (value) { MARKET_POLL_INTERVAL_MS = value; });
    window.App.bindStateProperty('_marketFeedState', function () { return _marketFeedState; }, function (value) { _marketFeedState = value; });
    window.App.bindStateProperty('_marketRetryTimers', function () { return _marketRetryTimers; }, function (value) { _marketRetryTimers = value; });
    window.App.bindStateProperty('_marketForceSkeleton', function () { return _marketForceSkeleton; }, function (value) { _marketForceSkeleton = value; });
    window.App.bindStateProperty('_guestProjectsInFlight', function () { return _guestProjectsInFlight; }, function (value) { _guestProjectsInFlight = value; });
    window.App.bindStateProperty('_guestProjectsLoadedOnce', function () { return _guestProjectsLoadedOnce; }, function (value) { _guestProjectsLoadedOnce = value; });
    window.App.bindStateProperty('_guestProjectsExpanded', function () { return _guestProjectsExpanded; }, function (value) { _guestProjectsExpanded = value; });
    window.App.bindStateProperty('_guestProjectsLoadError', function () { return _guestProjectsLoadError; }, function (value) { _guestProjectsLoadError = value; });
    window.App.bindStateProperty('_externalCountsInFlight', function () { return _externalCountsInFlight; }, function (value) { _externalCountsInFlight = value; });
    window.App.bindStateProperty('_externalCountsLoadedOnce', function () { return _externalCountsLoadedOnce; }, function (value) { _externalCountsLoadedOnce = value; });
    window.App.bindStateProperty('_externalCounts', function () { return _externalCounts; }, function (value) { _externalCounts = value; });
    window.App.bindStateProperty('_guestProjectsVisibleCount', function () { return _guestProjectsVisibleCount; }, function (value) { _guestProjectsVisibleCount = value; });
    window.App.bindStateProperty('_guestProjectsFilters', function () { return _guestProjectsFilters; }, function (value) { _guestProjectsFilters = value; });
    window.App.bindStateProperty('_guestProjectsAvailableLangs', function () { return _guestProjectsAvailableLangs; }, function (value) { _guestProjectsAvailableLangs = value; });
    window.App.bindStateProperty('_guestProjectTargetHighlightTimer', function () { return _guestProjectTargetHighlightTimer; }, function (value) { _guestProjectTargetHighlightTimer = value; });
    window.App.bindStateProperty('_postSyncToastSuppressionUntil', function () { return _postSyncToastSuppressionUntil; }, function (value) { _postSyncToastSuppressionUntil = value; });
    window.App.bindStateProperty('POST_SYNC_TOAST_SUPPRESSION_MS', function () { return POST_SYNC_TOAST_SUPPRESSION_MS; }, function (value) { POST_SYNC_TOAST_SUPPRESSION_MS = value; });
}

_bindLegacyAppState();

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
    var searchParams = new URLSearchParams(window.location.search || '');
    var hashString = (window.location.hash || '').replace(/^#/, '');
    var hashParams = new URLSearchParams(hashString.indexOf('?') !== -1 ? hashString.substring(hashString.indexOf('?') + 1) : hashString);
    var tg = window.Telegram && window.Telegram.WebApp;

    // dtview is our custom param name that Telegram won't intercept
    var val = searchParams.get('dtview') ||
              searchParams.get('startapp') ||
              searchParams.get('tgWebAppStartParam') ||
              searchParams.get('start_param') ||
              hashParams.get('dtview') ||
              hashParams.get('startapp') ||
              hashParams.get('tgWebAppStartParam') ||
              hashParams.get('start_param') ||
              (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
              (typeof initData !== 'undefined' && initData && initData.start_param) ||
              '';

    return String(val).trim();
}

function showTgDeeplinkLoader(kind) {
    try {
        if (kind) window.__tgDeeplinkLoaderKind = String(kind);
        document.documentElement.classList.add('tg-deeplink-loading');
        var el = document.getElementById('tg-deeplink-loader');
        if (el) {
            el.style.display = 'flex';
            el.setAttribute('aria-hidden', 'false');
        }
    } catch (error) {}
}

function hideTgDeeplinkLoader(kind) {
    try {
        var activeKind = window.__tgDeeplinkLoaderKind || '';
        if (kind && activeKind && activeKind !== kind) return;
        document.documentElement.classList.remove('tg-deeplink-loading');
        var el = document.getElementById('tg-deeplink-loader');
        if (el) {
            el.style.display = 'none';
            el.setAttribute('aria-hidden', 'true');
        }
        window.__tgDeeplinkLoaderKind = null;
    } catch (error) {}
}


window.showTgDeeplinkLoader = showTgDeeplinkLoader;
window.hideTgDeeplinkLoader = hideTgDeeplinkLoader;

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

function _parseMutualInviteIntent() {
    var rawStartParam = _getStartappParam();
    if (!rawStartParam) return null;

    var refMatch = rawStartParam.match(MUTUAL_INVITE_START_PARAM_RE);
    if (refMatch) {
        return {
            rawStartParam: rawStartParam,
            inviterId: Number(refMatch[1] || 0),
            targetAppId: Number(refMatch[2] || 0),
        };
    }

    var directMatch = rawStartParam.match(MUTUAL_DIRECT_START_PARAM_RE);
    if (directMatch) {
        return {
            rawStartParam: rawStartParam,
            inviterId: 0,
            targetAppId: Number(directMatch[1] || 0),
        };
    }

    return null;
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

function _openGuaranteedTestOfferWhenReady(maxAttempts, intervalMs) {
    var attemptsLeft = Number(maxAttempts || 0);
    var waitMs = Number(intervalMs || 0);

    if (attemptsLeft <= 0) attemptsLeft = 30;
    if (waitMs <= 0) waitMs = 100;

    function tryOpen() {
        if (typeof window.showGuaranteedTestOfferModal === 'function') {
            window.showGuaranteedTestOfferModal();
            return true;
        }
        return false;
    }

    if (tryOpen()) {
        return true;
    }

    var pollId = setInterval(function () {
        attemptsLeft -= 1;
        if (tryOpen()) {
            clearInterval(pollId);
            return;
        }
        if (attemptsLeft <= 0) {
            clearInterval(pollId);
            console.warn('Guaranteed test modal opener is not ready yet.');
        }
    }, waitMs);

    return false;
}

function _openGuaranteedFiatUploadWhenReady(orderId, maxAttempts, intervalMs) {
    var attemptsLeft = Number(maxAttempts || 0);
    var waitMs = Number(intervalMs || 0);
    var targetOrderId = Number(orderId || 0) || null;
    var inFlight = false;

    if (attemptsLeft <= 0) attemptsLeft = 40;
    if (waitMs <= 0) waitMs = 100;

    function tryOpen() {
        if (inFlight) return;
        if (typeof window.openGuaranteedFiatUploadFromOrder !== 'function') return;
        inFlight = true;
        Promise.resolve(window.openGuaranteedFiatUploadFromOrder(targetOrderId))
            .then(function (ok) {
                inFlight = false;
                if (ok) {
                    clearInterval(pollId);
                    return;
                }
                attemptsLeft -= 1;
                if (attemptsLeft <= 0) {
                    clearInterval(pollId);
                    console.warn('Guaranteed fiat upload deep link failed to open.');
                }
            })
            .catch(function (error) {
                inFlight = false;
                attemptsLeft -= 1;
                console.error('Guaranteed fiat upload deep link error:', error);
                if (attemptsLeft <= 0) clearInterval(pollId);
            });
    }

    tryOpen();
    var pollId = setInterval(function () {
        if (attemptsLeft <= 0) {
            clearInterval(pollId);
            return;
        }
        tryOpen();
    }, waitMs);

    return false;
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
    var routeExtraId = 0;
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
        var controlMatch = normalized.match(/^control[_:](\d+)(?:[_:](\d+))?$/);
        if (controlMatch) {
            routeKind = 'control';
            feedbackProjectId = Number(controlMatch[1] || 0);
            routeExtraId = Number(controlMatch[2] || 0);
            break;
        }
        var feedbackExactMatch = normalized.match(/^feedback[_:](\d+)(?:[_:](\d+))?$/);
        if (feedbackExactMatch) {
            routeKind = 'feedback';
            feedbackProjectId = Number(feedbackExactMatch[1] || 0);
            routeExtraId = Number(feedbackExactMatch[2] || 0);
            break;
        }
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
        var manageMatch = normalized.match(/^(?:manage|owner)[_:](\d+)$/);
        if (manageMatch) {
            routeKind = 'manage_project';
            feedbackProjectId = Number(manageMatch[1] || 0);
            break;
        }
        var testsHighlightMatch = normalized.match(/^(?:my_tests_highlight|test)[_:](\d+)$/);
        if (testsHighlightMatch) {
            routeKind = 'tests_highlight';
            feedbackProjectId = Number(testsHighlightMatch[1] || 0);
            break;
        }
        var bountyAppMatch = normalized.match(/^(?:bounty_app|bountyapp|incoming_bounty)[_:](\d+)$/);
        if (bountyAppMatch) {
            routeKind = 'bounty_app_highlight';
            feedbackProjectId = Number(bountyAppMatch[1] || 0);
            break;
        }
        var dossierMatch = normalized.match(/^dossier[_:](\d+)(?:[_:](\d+))?$/);
        if (dossierMatch) {
            routeKind = 'dossier';
            feedbackProjectId = Number(dossierMatch[1] || 0);
            routeExtraId = Number(dossierMatch[2] || 0);
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
        if (normalized === 'invite_links' || normalized === 'invitelinks') {
            routeKind = 'invite_links';
        }
        if (normalized === 'contribution_history' || normalized === 'contribution-history' || normalized === 'contribution_claim' || normalized === 'contribution-claim') {
            routeKind = 'contribution_history';
            break;
        }
        if (normalized === 'contribution' || normalized === 'sprint' || normalized === 'contribution_pool') {
            routeKind = 'contribution';
            break;
        }
        if (normalized === 'guaranteed_test' || normalized === 'guaranteed-test' || normalized === 'guaranteed_pass' || normalized === 'guaranteed-pass' || normalized === 'closed_test_help' || normalized === 'guaranteed' || normalized === 'order_gt') {
            routeKind = 'guaranteed_test';
            break;
        }
        if (normalized.indexOf('gt_upload_') === 0 || normalized.indexOf('gt-upload-') === 0) {
            routeKind = 'gt_upload';
            var uploadRaw = normalized.replace('gt_upload_', '').replace('gt-upload-', '');
            feedbackProjectId = parseInt(uploadRaw, 10) || 0;
            break;
        }
    }

    if (routeKind === 'feedback' || params.get('feedback') === '1') {
        return {
            tab: 'projects',
            openFeedback: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
            focusFeedbackId: routeExtraId > 0 ? routeExtraId : null,
        };
    }
    if (routeKind === 'control') {
        return {
            tab: 'projects',
            openTestingControl: true,
            appId: feedbackProjectId > 0 ? feedbackProjectId : null,
            focusProgressId: routeExtraId > 0 ? routeExtraId : null,
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
    if (routeKind === 'bounty_app_highlight') {
        return {
            tab: 'tests',
            openFeedback: false,
            appId: null,
            highlightBountyApplicationId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'dossier') {
        return {
            tab: 'tests',
            openFeedback: false,
            appId: routeExtraId > 0 ? routeExtraId : null,
            openDossierUserId: feedbackProjectId > 0 ? feedbackProjectId : null,
            openDossierAppId: routeExtraId > 0 ? routeExtraId : null,
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
    if (routeKind === 'invite_links') {
        return {
            tab: 'projects',
            openFeedback: false,
            openInviteLinks: true,
            appId: null,
        };
    }
    if (routeKind === 'contribution') {
        return {
            tab: 'projects',
            openFeedback: false,
            openContribution: true,
            contributionTab: 'current',
            appId: null,
        };
    }
    if (routeKind === 'contribution_history') {
        return {
            tab: 'projects',
            openFeedback: false,
            openContribution: true,
            contributionTab: 'history',
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
    if (routeKind === 'manage_project') {
        return {
            tab: 'projects',
            expandProjectId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    if (routeKind === 'guaranteed_test') {
        return {
            tab: 'market',
            openGuaranteedTest: true,
            appId: null,
        };
    }
    if (routeKind === 'gt_upload') {
        return {
            tab: 'projects',
            openGuaranteedUpload: true,
            gtOrderId: feedbackProjectId > 0 ? feedbackProjectId : null,
        };
    }
    return null;
}

async function _handleInitialRoute() {
    if (_initialRouteHandled) return;
    _initialRouteHandled = true;

    var route = _parseInitialRouteTarget();
    if (!route) return;

    if (route.openGuaranteedTest) {
        try {
            // Open offer immediately (no async API gate) — mirrors openAdd → openModal().
            _openGuaranteedTestOfferWhenReady(40, 100);
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial guaranteed test route error:', error);
        }
        return;
    }

    if (route.openGuaranteedUpload) {
        try {
            _openGuaranteedFiatUploadWhenReady(route.gtOrderId, 40, 100);
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial guaranteed upload route error:', error);
        }
        return;
    }

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
    if (route.openTestingControl && route.appId) {
        try {
            showTgDeeplinkLoader('control');
            await Promise.allSettled([
                loadProjects(true),
                loadArchivedProjects({ silent: true })
            ]);
            if (window.App && window.App.testingControlEnabled && typeof window.openTestingControl === 'function') {
                var isArchivedControlProject = !(myProjects || []).some(function(project) {
                    return Number(project.id) === Number(route.appId);
                }) && (archivedProjects || []).some(function(project) {
                    return Number(project.app_id) === Number(route.appId);
                });
                await window.openTestingControl(route.appId, {
                    archived: isArchivedControlProject,
                    focusProgressId: route.focusProgressId,
                });
            }
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial Testing Control route error:', error);
        } finally {
            hideTgDeeplinkLoader('control');
        }
        return;
    }
        if (route.highlightTestId) {
            try {
                _pendingInitialHighlightTestId = Number(route.highlightTestId || 0) || null;
                await loadTasks(false);
                _highlightTestCardWhenReady(_pendingInitialHighlightTestId, 24);
                _clearStartappQueryParam();
            } catch (error) {
                console.error('Initial tests highlight route error:', error);
            }
            return;
        }
        if (route.highlightBountyApplicationId) {
            try {
                if (typeof focusIncomingBountyApplication === 'function') {
                    await focusIncomingBountyApplication(route.highlightBountyApplicationId);
                } else {
                    switchTab('tests');
                    if (typeof loadBountyApplications === 'function') {
                        await loadBountyApplications();
                    }
                    if (typeof highlightBountyApplicationWhenReady === 'function') {
                        highlightBountyApplicationWhenReady(route.highlightBountyApplicationId, 16);
                    }
                }
                _clearStartappQueryParam();
            } catch (error) {
                console.error('Initial bounty application highlight route error:', error);
            }
            return;
        }
        if (route.openDossierUserId) {
            try {
                switchTab('tests');
                var dossierUserId = Number(route.openDossierUserId || 0);
                var dossierAppId = Number(route.openDossierAppId || route.appId || 0);
                try {
                    if (typeof loadIncomingOffers === 'function') {
                        await loadIncomingOffers({ background: false });
                    } else if (typeof loadBountyApplications === 'function') {
                        await loadBountyApplications({ background: false });
                    }
                } catch (preloadError) {
                    console.warn('Dossier route preload failed:', preloadError);
                }
                if (typeof openTesterDossier === 'function') {
                    openTesterDossier('', dossierUserId, dossierAppId);
                } else if (typeof openDossierModal === 'function') {
                    openDossierModal('', dossierUserId, dossierAppId);
                }
                _clearStartappQueryParam();
            } catch (error) {
                console.error('Initial dossier route error:', error);
            }
            return;
        }

    if (route.tab === 'market') {
        switchTab('market');
    }

    // ── Sync route: open Project Protection Center ──
    if (route.openSync && route.appId) {
        try {
            await loadProjects(true, true);
            if (typeof window.openProtectionCenter === 'function') {
                window.openProtectionCenter(route.appId);
            } else if (typeof window.openSyncModal === 'function') {
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
            await loadProjects(true, true);
            openEditModal(route.appId, { focusSetup: true });
        } catch (error) {
            console.error('Initial edit route error:', error);
        }
        return;
    }

    // ── Manage route: open owner's project card on "My Projects" ──
    if (route.expandProjectId) {
        try {
            switchTab('projects');
            await loadProjects(true, true);
            if (typeof _expandProjectCardWhenReady === 'function') {
                _expandProjectCardWhenReady(route.expandProjectId);
            }
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial manage project route error:', error);
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

    if (route.openInviteLinks) {
        try {
            await loadProjects(true, true);
            var candidate = Array.isArray(myProjects) && myProjects.length ? myProjects[0] : null;
            var candidateId = Number(candidate && candidate.id || 0);
            if (candidateId > 0 && typeof openInviteModal === 'function') {
                openInviteModal(candidateId);
            } else {
                openModal();
            }
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial invite links route error:', error);
        }
        return;
    }

    if (route.openContribution) {
        try {
            showTgDeeplinkLoader('contribution');
            switchTab('projects');
            if (typeof window.showContributionInfo === 'function') {
                await window.showContributionInfo({
                    tab: route.contributionTab === 'history' ? 'history' : 'current',
                });
            }
            _clearStartappQueryParam();
        } catch (error) {
            console.error('Initial contribution route error:', error);
        } finally {
            hideTgDeeplinkLoader('contribution');
        }
        return;
    }

    if (!route.openFeedback || !route.appId) {
        if (window.__tgDeeplinkLoaderKind === 'feedback') {
            hideTgDeeplinkLoader('feedback');
        }
        return;
    }

    try {
        showTgDeeplinkLoader('feedback');
        await Promise.allSettled([
            loadProjects(true),
            loadArchivedProjects({ silent: true })
        ]);

        var isArchived = !(myProjects || []).some(function(project) {
            return Number(project.id) === Number(route.appId);
        }) && (archivedProjects || []).some(function(project) {
            return Number(project.app_id) === Number(route.appId);
        });

        await openProjectFeedback(route.appId, isArchived, { focusFeedbackId: route.focusFeedbackId });
    } catch (error) {
        console.error('Initial feedback route error:', error);
        hideTgDeeplinkLoader('feedback');
    }
}
