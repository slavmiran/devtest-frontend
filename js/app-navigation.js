/* Unified Back navigation for Telegram Mini App and standalone-browser fallback. */
(function () {
    'use strict';

    var START_TAB = 'tests';
    var backOpenSequence = 0;
    var backObserver = null;
    var syncScheduled = false;
    var browserFallbackBound = false;
    var browserFallbackArmed = false;
    var browserFallbackHandling = false;
    var BROWSER_ROOT_KEY = '__devtestBackRootV1';
    var BROWSER_GUARD_KEY = '__devtestBackGuardV1';

    var SPECIAL_LAYER_IDS = [
        'protection-center',
        'attract-testers-sheet-overlay',
        'add-project-chooser-overlay',
        'dossier-hybrid-join-overlay',
        'guest-claim-welcome-overlay',
        'guaranteed-test-offer-overlay',
        'guaranteed-test-wizard-step1-overlay',
        'guaranteed-test-wizard-step2-overlay',
        'guaranteed-test-wizard-payment-overlay',
        'gtw-payment-flow-overlay',
        'gtw-license-guide-overlay',
        'gtw-license-modal-overlay',
        'gtw-crypto-exit-overlay',
        'gtw-start-gate-overlay'
    ];

    function getTelegramWebApp() {
        return (window.Telegram && window.Telegram.WebApp) || window.tg || null;
    }

    function getActiveAppTab() {
        var activeContent = document.querySelector('.tab-content.active[id^="tab-"]');
        if (activeContent && activeContent.id) return activeContent.id.replace(/^tab-/, '');

        var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-item'));
        var activeIndex = navItems.findIndex(function (item) { return item.classList.contains('active'); });
        return ['tests', 'projects', 'market'][activeIndex] || START_TAB;
    }

    function isElementDisplayed(element) {
        if (!element || element.hidden || element.getAttribute('aria-hidden') === 'true') return false;
        if (element.style && element.style.display === 'none') return false;
        if (typeof window.getComputedStyle === 'function') {
            var style = window.getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
        }
        return true;
    }

    function isBackLayerCandidate(element) {
        if (!element || element.nodeType !== 1) return false;
        if (element.classList.contains('modal-overlay')) return true;
        return SPECIAL_LAYER_IDS.indexOf(element.id) !== -1;
    }

    function isBackLayerOpen(element) {
        if (!isBackLayerCandidate(element)) return false;
        if (element.classList.contains('modal-overlay')) {
            return element.classList.contains('active') && !element.hidden;
        }
        if (element.id === 'protection-center') return element.classList.contains('active');
        if (element.id === 'attract-testers-sheet-overlay') return element.classList.contains('is-active');
        if (element.id === 'add-project-chooser-overlay') return element.classList.contains('is-open') && isElementDisplayed(element);
        if (element.id === 'dossier-hybrid-join-overlay') return element.classList.contains('is-active') && isElementDisplayed(element);
        if (element.id === 'guest-claim-welcome-overlay') return element.classList.contains('active');
        if (element.id === 'gtw-payment-flow-overlay') return element.classList.contains('is-open');
        if (element.id === 'gtw-crypto-exit-overlay' || element.id === 'gtw-start-gate-overlay') {
            return element.classList.contains('is-open') && isElementDisplayed(element);
        }
        return isElementDisplayed(element);
    }

    function getBackLayerCandidates() {
        var result = Array.prototype.slice.call(document.querySelectorAll('.modal-overlay'));
        SPECIAL_LAYER_IDS.forEach(function (id) {
            var element = document.getElementById(id);
            if (element && result.indexOf(element) === -1) result.push(element);
        });
        return result;
    }

    function updateBackLayerState(element) {
        if (!isBackLayerCandidate(element)) return;
        var isOpen = isBackLayerOpen(element);
        if (isOpen && !element.__devtestBackOpen) {
            element.__devtestBackOpen = true;
            element.__devtestBackSequence = ++backOpenSequence;
        } else if (!isOpen && element.__devtestBackOpen) {
            element.__devtestBackOpen = false;
            element.__devtestBackSequence = 0;
        }
    }

    function refreshBackLayerStates() {
        getBackLayerCandidates().forEach(updateBackLayerState);
    }

    function getTopBackLayer() {
        refreshBackLayerStates();
        var openLayers = getBackLayerCandidates().filter(isBackLayerOpen);
        if (!openLayers.length) return null;
        return openLayers.reduce(function (top, current) {
            if (!top) return current;
            var topSequence = Number(top.__devtestBackSequence || 0);
            var currentSequence = Number(current.__devtestBackSequence || 0);
            if (currentSequence !== topSequence) return currentSequence > topSequence ? current : top;

            var topZ = parseInt(window.getComputedStyle(top).zIndex, 10) || 0;
            var currentZ = parseInt(window.getComputedStyle(current).zIndex, 10) || 0;
            if (currentZ !== topZ) return currentZ > topZ ? current : top;
            return (top.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING) ? current : top;
        }, null);
    }

    function callGlobal(name) {
        var fn = window[name];
        if (typeof fn !== 'function') return false;
        fn();
        return true;
    }

    function closeSpecialLayer(element) {
        if (!element) return false;
        var id = element.id;
        if (id === 'pc-activity-sheet') return callGlobal('pcCloseActivitySheet');
        if (id === 'protection-center') return callGlobal('closeProtectionCenter');
        if (id === 'attract-testers-sheet-overlay') return callGlobal('closeAttractTestersSheet');
        if (id === 'add-project-chooser-overlay') return callGlobal('closeAddProjectChooser');
        if (id === 'dossier-hybrid-join-overlay') return callGlobal('closeDossierHybridJoinChooser');
        if (id === 'guest-claim-welcome-overlay') return callGlobal('closeGuestClaimWelcomeScreen');
        if (id === 'checkin-proof-upload-modal') return callGlobal('closeCheckinProofUploadModal');
        if (id === 'guaranteed-test-offer-overlay') return callGlobal('hideGuaranteedTestOfferModal');
        if (id.indexOf('guaranteed-test-wizard-') === 0 || id.indexOf('gtw-') === 0) {
            var wizardBack = window.handleGuaranteedTestWizardBack;
            return typeof wizardBack === 'function' && wizardBack() === true;
        }
        return false;
    }

    function dispatchOverlayClose(element) {
        if (!element) return false;
        if (closeSpecialLayer(element)) return true;

        var hasClickHandler = typeof element.onclick === 'function' || !!element.getAttribute('onclick');
        var sequenceBefore = backOpenSequence;
        element.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true, view: window }));
        refreshBackLayerStates();
        if (hasClickHandler || !isBackLayerOpen(element) || backOpenSequence > sequenceBefore) return true;

        // Malformed/legacy overlays must not trap the user. Keep this as a last-resort only;
        // all stateful application overlays are expected to close through their own handler.
        console.warn('Back navigation fallback closed an overlay without a close handler:', element.id || element.className);
        element.classList.remove('active', 'is-active', 'is-open');
        if (element.style && element.style.display === 'flex') element.style.display = 'none';
        return true;
    }

    function switchToStartTab() {
        if (typeof window.switchTab !== 'function') return false;
        window.switchTab(START_TAB);
        return true;
    }

    function handleAppBack(options) {
        options = options || {};
        var topLayer = getTopBackLayer();
        if (topLayer) {
            dispatchOverlayClose(topLayer);
            refreshBackLayerStates();
            scheduleTelegramBackSync();
            return true;
        }

        if (getActiveAppTab() !== START_TAB && switchToStartTab()) {
            scheduleTelegramBackSync();
            return true;
        }

        if (options.source === 'telegram') {
            var webApp = getTelegramWebApp();
            if (webApp && webApp.BackButton) webApp.BackButton.hide();
        }
        return false;
    }

    function hasInternalBackTarget() {
        return !!getTopBackLayer() || getActiveAppTab() !== START_TAB;
    }

    function syncTelegramBackButton() {
        var webApp = getTelegramWebApp();
        if (!webApp || !webApp.BackButton) return;
        if (hasInternalBackTarget()) webApp.BackButton.show();
        else webApp.BackButton.hide();
    }

    function scheduleTelegramBackSync() {
        if (syncScheduled) return;
        syncScheduled = true;
        Promise.resolve().then(function () {
            syncScheduled = false;
            syncTelegramBackButton();
        });
    }

    function scanAddedBackLayers(node) {
        if (!node || node.nodeType !== 1) return;
        if (isBackLayerCandidate(node)) updateBackLayerState(node);
        if (node.querySelectorAll) {
            node.querySelectorAll('.modal-overlay').forEach(updateBackLayerState);
            SPECIAL_LAYER_IDS.forEach(function (id) {
                var child = node.querySelector('#' + id);
                if (child) updateBackLayerState(child);
            });
        }
    }

    function containsBackLayerCandidate(node) {
        if (!node || node.nodeType !== 1) return false;
        if (isBackLayerCandidate(node)) return true;
        if (!node.querySelector) return false;
        if (node.querySelector('.modal-overlay')) return true;
        return SPECIAL_LAYER_IDS.some(function (id) {
            return !!node.querySelector('#' + id);
        });
    }

    function observeBackLayers() {
        if (backObserver || typeof MutationObserver === 'undefined' || !document.documentElement) return;
        backObserver = new MutationObserver(function (records) {
            var touched = false;
            records.forEach(function (record) {
                if (record.type === 'attributes' && isBackLayerCandidate(record.target)) {
                    updateBackLayerState(record.target);
                    touched = true;
                }
                if (record.type === 'childList') {
                    Array.prototype.forEach.call(record.addedNodes || [], function (node) {
                        scanAddedBackLayers(node);
                        if (containsBackLayerCandidate(node)) {
                            touched = true;
                        }
                    });
                }
            });
            if (touched) scheduleTelegramBackSync();
        });
        backObserver.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
        });
    }

    function initTelegramBackButton() {
        var webApp = getTelegramWebApp();
        observeBackLayers();
        refreshBackLayerStates();
        if (webApp && webApp.BackButton && !webApp.BackButton._devtestBound) {
            webApp.BackButton.onClick(function () {
                handleAppBack({ source: 'telegram' });
                syncTelegramBackButton();
            });
            webApp.BackButton._devtestBound = true;
        }
        syncTelegramBackButton();
    }

    function isRealTelegramRuntime() {
        var webApp = getTelegramWebApp();
        return !!(webApp && typeof webApp.initData === 'string' && webApp.initData.length > 0);
    }

    function copyHistoryState(extra) {
        var current = window.history && window.history.state;
        var next = current && typeof current === 'object' ? Object.assign({}, current) : {};
        return Object.assign(next, extra || {});
    }

    function pushBrowserBackGuard() {
        if (!window.history || typeof window.history.pushState !== 'function') return;
        if (window.history.state && window.history.state[BROWSER_GUARD_KEY]) {
            browserFallbackArmed = true;
            return;
        }
        var guardState = copyHistoryState();
        guardState[BROWSER_GUARD_KEY] = true;
        delete guardState[BROWSER_ROOT_KEY];
        window.history.pushState(guardState, document.title, window.location.href);
        browserFallbackArmed = true;
    }

    function onBrowserPopState(event) {
        if (!browserFallbackArmed || browserFallbackHandling) return;
        if (!event.state || !event.state[BROWSER_ROOT_KEY]) return;
        browserFallbackHandling = true;
        var consumed = handleAppBack({ source: 'popstate' });
        if (consumed) {
            pushBrowserBackGuard();
            browserFallbackHandling = false;
            return;
        }

        browserFallbackArmed = false;
        window.setTimeout(function () {
            browserFallbackHandling = false;
            if (window.history && typeof window.history.back === 'function') window.history.back();
        }, 0);
    }

    function initBrowserBackFallback() {
        if (!browserFallbackBound) {
            window.addEventListener('popstate', onBrowserPopState);
            browserFallbackBound = true;
        }
        if (isRealTelegramRuntime() || browserFallbackArmed) return;
        if (!window.history || typeof window.history.replaceState !== 'function') return;

        var rootState = copyHistoryState();
        rootState[BROWSER_ROOT_KEY] = true;
        delete rootState[BROWSER_GUARD_KEY];
        window.history.replaceState(rootState, document.title, window.location.href);
        pushBrowserBackGuard();
    }

    window.handleAppBack = handleAppBack;
    window.syncTelegramBackButton = syncTelegramBackButton;
    window.initTelegramBackButton = initTelegramBackButton;
    window.initBrowserBackFallback = initBrowserBackFallback;
    window.getActiveAppTab = getActiveAppTab;
})();
