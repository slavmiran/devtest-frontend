/* Telegram Mini App — Add to Home Screen (Bot API 8.0+). */
/* Settings widget + My Projects promo banner. */

var HOMESCREEN_BANNER_DISMISSED_KEY = 'devtesthub_homescreen_banner_dismissed';
var _homeScreenStatus = 'unsupported';
var _homeScreenInitialized = false;

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

function _canPromptHomeScreenAdd(status) {
    return status === 'missed' || status === 'unknown';
}

function _shouldShowHomeScreenBanner(status) {
    return status === 'missed' && !_isHomeScreenBannerDismissed();
}

function syncHomeScreenUi() {
    var status = _homeScreenStatus || 'unsupported';
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
    if (meta) meta.textContent = window.t('homeScreenShortcutMeta', {}, uiLang);
    if (bannerText) bannerText.textContent = window.t('homeScreenBannerText', {}, uiLang);
    if (bannerBtn) bannerBtn.textContent = window.t('homeScreenBannerAdd', {}, uiLang);

    if (row) {
        if (status === 'unsupported') {
            row.hidden = true;
        } else {
            row.hidden = false;
            var isAdded = status === 'added';
            if (btn) {
                btn.hidden = isAdded;
                btn.disabled = isAdded;
                btn.textContent = window.t('homeScreenShortcutAdd', {}, uiLang);
            }
            if (statusEl) {
                statusEl.hidden = !isAdded;
                statusEl.textContent = window.t('homeScreenShortcutAdded', {}, uiLang);
            }
            // unknown/missed → Add; added → Added; unsupported handled above
            if (!isAdded && !_canPromptHomeScreenAdd(status) && btn) {
                btn.hidden = true;
            }
        }
    }

    if (banner) {
        var showBanner = _shouldShowHomeScreenBanner(status);
        banner.hidden = !showBanner;
        banner.classList.toggle('is-visible', showBanner);
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
    _homeScreenStatus = 'added';
    try {
        localStorage.setItem(HOMESCREEN_BANNER_DISMISSED_KEY, 'true');
    } catch (e) {}
    syncHomeScreenUi();
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
}

function initHomeScreenPromo() {
    if (_homeScreenInitialized) {
        syncHomeScreenUi();
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
        } catch (e) {
            console.warn('homeScreenAdded subscribe failed:', e);
        }
    }

    if (typeof webApp.checkHomeScreenStatus !== 'function') {
        _homeScreenStatus = 'unsupported';
        syncHomeScreenUi();
        return;
    }

    try {
        webApp.checkHomeScreenStatus(function(status) {
            _homeScreenStatus = status || 'unsupported';
            syncHomeScreenUi();
        });
    } catch (error) {
        console.error('checkHomeScreenStatus error:', error);
        _homeScreenStatus = 'unsupported';
        syncHomeScreenUi();
    }
}
