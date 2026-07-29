/* =========================================================
   GUARANTEED CLOSED TEST OFFER MODAL (JS MODULE)
   ========================================================= */

(function () {
    'use strict';

    function createGuaranteedTestOfferHTML() {
        return `
        <div id="guaranteed-test-offer-overlay" class="gto-overlay" style="display: none;">
            <div class="gto-header">
                <button type="button" class="gto-close-btn" id="gto-close-btn" aria-label="Close">&times;</button>
                <h1 class="gto-header-title">Leave Closed Testing to Us</h1>
                <p class="gto-header-subtitle">DEVTESTHUB PRIVATE TESTING</p>
            </div>
            <div class="gto-container">
                <div class="gto-card">
                    <div class="gto-card-top">
                        <div class="gto-pill-badge">
                            <svg class="gto-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>14-DAY CONTINUOUS TESTING</span>
                        </div>
                        <div class="gto-group-icon-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                    </div>

                    <h2 class="gto-main-title">Closed Testing for Production Access</h2>

                    <div class="gto-price-section">
                        <span class="gto-price-label">Just</span>
                        <span class="gto-price-value">20 USD</span>
                    </div>

                    <div class="gto-benefits-list">
                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <div class="gto-benefit-text">12+ Testers will test your app until you get production access.</div>
                        </div>

                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                            <div class="gto-benefit-text">Only real physical devices are used</div>
                        </div>

                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"></path>
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                            </svg>
                            <div class="gto-benefit-text">If you fail to get production access we will refund your money</div>
                        </div>
                    </div>

                    <button type="button" class="gto-cta-btn" id="gto-cta-btn">ADD YOUR APP</button>
                </div>
            </div>
        </div>
        `;
    }

    function ensureModalInDOM() {
        var overlay = document.getElementById('guaranteed-test-offer-overlay');
        if (!overlay) {
            if (!document.body) {
                return null;
            }
            var div = document.createElement('div');
            div.innerHTML = createGuaranteedTestOfferHTML();
            document.body.appendChild(div.firstElementChild);
            overlay = document.getElementById('guaranteed-test-offer-overlay');
            bindEvents(overlay);
        }
        return overlay;
    }

    function bindEvents(overlay) {
        var closeBtn = document.getElementById('gto-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideGuaranteedTestOfferModal);
        }

        var ctaBtn = document.getElementById('gto-cta-btn');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', handleOrderSubmission);
        }
    }

    function handleOrderSubmission() {
        if (typeof window.showGuaranteedTestWizardStep1 === 'function') {
            window.showGuaranteedTestWizardStep1();
        } else {
            var targetUrl = "https://t.me/garantXchange";
            if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
                window.Telegram.WebApp.openTelegramLink(targetUrl);
            } else {
                window.open(targetUrl, '_blank');
            }
        }
    }

    function showGuaranteedTestOfferModal() {
        var overlay = ensureModalInDOM();
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.zIndex = '99999';
        } else {
            setTimeout(showGuaranteedTestOfferModal, 50);
        }
    }

    function hideGuaranteedTestOfferModal() {
        var overlay = document.getElementById('guaranteed-test-offer-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    function checkGuaranteedTestRouting() {
        try {
            var searchParams = new URLSearchParams(window.location.search || '');
            var hashString = (window.location.hash || '').replace(/^#/, '');
            var hashParams = new URLSearchParams(hashString.indexOf('?') !== -1 ? hashString.substring(hashString.indexOf('?') + 1) : hashString);
            var tg = window.Telegram && window.Telegram.WebApp;

            var rawParam = String(
                searchParams.get('dtview') ||
                searchParams.get('startapp') ||
                searchParams.get('tgWebAppStartParam') ||
                searchParams.get('start_param') ||
                searchParams.get('tab') ||
                searchParams.get('route') ||
                hashParams.get('dtview') ||
                hashParams.get('startapp') ||
                hashParams.get('tgWebAppStartParam') ||
                hashParams.get('start_param') ||
                (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ||
                ''
            ).trim().toLowerCase();

            if (
                rawParam === 'guaranteed_test' ||
                rawParam === 'guaranteed-test' ||
                rawParam === 'guaranteed_pass' ||
                rawParam === 'guaranteed-pass' ||
                rawParam === 'closed_test_help' ||
                rawParam === 'guaranteed' ||
                rawParam === 'order_gt'
            ) {
                showGuaranteedTestOfferModal();
            }
        } catch (e) {}
    }

    window.showGuaranteedTestOfferModal = showGuaranteedTestOfferModal;
    window.hideGuaranteedTestOfferModal = hideGuaranteedTestOfferModal;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkGuaranteedTestRouting);
    } else {
        checkGuaranteedTestRouting();
    }
})();
