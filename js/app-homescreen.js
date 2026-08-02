/* Telegram Mini App — Add to Home Screen (Bot API 8.0+). */
/* Settings widget + My Projects promo banner. */

var HOMESCREEN_BANNER_DISMISSED_KEY = 'devtesthub_homescreen_banner_dismissed';
var _homeScreenStatus = 'unsupported';
var _homeScreenInitialized = false;
var _homeScreenStatusCheckInFlight = false;

function _getTelegramWebApp() {
    return (window.Telegram && window.Telegram.WebApp) || (typeof tg !== 'undefined' ? tg : null);
}

function _isHomeScreenBannerDismissed() {
    try {
        return localStorage.getItem(HOMESCREEN_BANNER_DISMISSED_KEY) === 'true';
    } catch (e) {
        return false;
    }
}

function _normalizeHomeScreenStatus(status) {
    var value = String(status || '').toLowerCase();
    if (value === 'added' || value === 'missed' || value === 'unknown' || value === 'unsupported') {
        return value;
    }
    return 'unsupported';
}

/** Confirmed on home screen — Telegram can track it. */
function _isHomeScreenConfirmedAdded(status) {
    return status === 'added';
}

/** User can (re)add: missing, or device cannot tell (always keep CTA). */
function _canPromptHomeScreenAdd(status) {
    return status === 'missed' || status === 'unknown';
}

function _shouldShowHomeScreenBanner(status) {
    return status === 'missed' && !_isHomeScreenBannerDismissed();
}

function _homeScreenMetaKey(status) {
    if (status === 'added') return 'homeScreenShortcutMetaAdded';
    if (status === 'missed') return 'homeScreenShortcutMetaMissed';
    if (status === 'unknown') return 'homeScreenShortcutMetaUnknown';
    return 'homeScreenShortcutMetaMissed';
}

function syncHomeScreenUi() {
    var status = _normalizeHomeScreenStatus(_homeScreenStatus);
    var row = document.getElementById('homescreen-shortcut-row');
    var btn = document.getElementById('homescreen-shortcut-btn');
    var statusEl = document.getElementById('homescreen-shortcut-status');
    var label = document.getElementById('homescreen-shortcut-label');
    var meta = document.getElementById('homescreen-shortcut-meta');
    var banner = document.getElementById('homescreen-promo-banner');
    var bannerText = document.getElementById('homescreen-promo-banner-text');
    var bannerBtn = document.getElementById('homescreen-promo-banner-btn');
    var uiLang = (typeof lang !== 'undefined' && lang) ? lang : 'en';

    if (label) label.textContent = window.t('homeScreenShortcutLabel', {}, uiLang);
    if (meta) meta.textContent = window.t(_homeScreenMetaKey(status), {}, uiLang);
    if (bannerText) bannerText.textContent = window.t('homeScreenBannerText', {}, uiLang);
    if (bannerBtn) bannerBtn.textContent = window.t('homeScreenBannerAdd', {}, uiLang);

    if (row) {
        if (status === 'unsupported') {
            row.hidden = true;
        } else {
            row.hidden = false;
            var isAdded = _isHomeScreenConfirmedAdded(status);
            var canAdd = _canPromptHomeScreenAdd(status);
            if (btn) {
                // unknown → always show action; added → only when Telegram confirms
                btn.hidden = !canAdd;
                btn.disabled = !canAdd;
                btn.setAttribute('aria-label', window.t('homeScreenShortcutAdd', {}, uiLang));
                btn.title = window.t('homeScreenShortcutAdd', {}, uiLang);
            }
            if (statusEl) {
                statusEl.hidden = !isAdded;
                statusEl.setAttribute('aria-label', window.t('homeScreenShortcutAdded', {}, uiLang));
                statusEl.title = window.t('homeScreenShortcutAdded', {}, uiLang);
            }
        }
    }

    if (banner) {
        var showBanner = _shouldShowHomeScreenBanner(status);
        banner.hidden = !showBanner;
        banner.classList.toggle('is-visible', showBanner);
    }
}

function refreshHomeScreenStatus(options) {
    var settings = options || {};
    var webApp = _getTelegramWebApp();
    if (!webApp || typeof webApp.checkHomeScreenStatus !== 'function') {
        _homeScreenStatus = 'unsupported';
        syncHomeScreenUi();
        return;
    }
    if (_homeScreenStatusCheckInFlight && !settings.force) {
        return;
    }
    _homeScreenStatusCheckInFlight = true;
    try {
        webApp.checkHomeScreenStatus(function(status) {
            _homeScreenStatusCheckInFlight = false;
            _homeScreenStatus = _normalizeHomeScreenStatus(status);
            syncHomeScreenUi();
            if (typeof settings.onDone === 'function') {
                settings.onDone(_homeScreenStatus);
            }
        });
    } catch (error) {
        _homeScreenStatusCheckInFlight = false;
        console.error('checkHomeScreenStatus error:', error);
        _homeScreenStatus = 'unsupported';
        syncHomeScreenUi();
    }
}

function addDevTestHubToHomeScreen() {
    var webApp = _getTelegramWebApp();
    if (webApp && webApp.HapticFeedback) {
        try { webApp.HapticFeedback.impactOccurred('light'); } catch (e) {}
    }
    if (!webApp || typeof webApp.addToHomeScreen !== 'function') {
        return;
    }
    try {
        webApp.addToHomeScreen();
    } catch (error) {
        console.error('addToHomeScreen error:', error);
    }
    // Re-check soon: some clients never fire homeScreenAdded / can't track install.
    setTimeout(function() {
        refreshHomeScreenStatus({ force: true });
    }, 700);
}

function dismissHomeScreenBanner() {
    try {
        localStorage.setItem(HOMESCREEN_BANNER_DISMISSED_KEY, 'true');
    } catch (e) {}
    var webApp = _getTelegramWebApp();
    if (webApp && webApp.HapticFeedback) {
        try { webApp.HapticFeedback.selectionChanged(); } catch (e) {}
    }
    syncHomeScreenUi();
}

function _onHomeScreenAdded() {
    try {
        localStorage.setItem(HOMESCREEN_BANNER_DISMISSED_KEY, 'true');
    } catch (e) {}
    var uiLang = (typeof lang !== 'undefined' && lang) ? lang : 'en';
    var message = window.t('homeScreenAddedToast', {}, uiLang);
    if (typeof window.showToast === 'function') {
        window.showToast(message);
    } else if (typeof showToast === 'function') {
        showToast(message);
    }
    var webApp = _getTelegramWebApp();
    if (webApp && webApp.HapticFeedback) {
        try { webApp.HapticFeedback.notificationOccurred('success'); } catch (e) {}
    }
    // Trust a fresh status check — if device reports `unknown`, keep the Add button.
    refreshHomeScreenStatus({
        force: true,
        onDone: function(status) {
            if (status === 'unsupported' || status === 'unknown') {
                // Event fired but install can't be tracked → still allow re-add.
                syncHomeScreenUi();
            }
        }
    });
}

function initHomeScreenPromo() {
    if (_homeScreenInitialized) {
        refreshHomeScreenStatus({ force: true });
        return;
    }
    _homeScreenInitialized = true;

    var webApp = _getTelegramWebApp();
    if (!webApp) {
        _homeScreenStatus = 'unsupported';
        syncHomeScreenUi();
        return;
    }

    if (typeof webApp.onEvent === 'function') {
        try {
            webApp.onEvent('homeScreenAdded', _onHomeScreenAdded);
            // Bot API also emits homeScreenChecked with { status } on some clients.
            webApp.onEvent('homeScreenChecked', function(payload) {
                var next = payload && payload.status != null ? payload.status : payload;
                if (next != null) {
                    _homeScreenStatus = _normalizeHomeScreenStatus(next);
                    syncHomeScreenUi();
                }
            });
        } catch (e) {
            console.warn('homeScreen event subscribe failed:', e);
        }
    }

    refreshHomeScreenStatus({ force: true });
}
