/* =========================================================
   GUARANTEED CLOSED TEST OFFER MODAL (JS MODULE)
   ========================================================= */

(function () {
    'use strict';

    var COPY = {
        headerTitle: ['Private Testing', 'Приватное тестирование'],
        headerSubtitle: ['Closed testing, handled for you', 'Закрытое тестирование под ключ'],
        badge: ['14 days of continuous testing', '14 дней непрерывного тестирования'],
        title: ['Google Play access without your involvement', 'Доступ в Google Play без вашего участия'],
        lead: [
            'We assemble the tester team, run the full 14-day cycle and bring your app to the production review.',
            'Мы собираем команду тестировщиков, ведем полный 14-дневный цикл и доводим приложение до заявки на production.'
        ],
        price: ['$20', '$20'],
        priceNote: ['one-time payment for one app', 'разовый платеж за одно приложение'],
        includedLabel: ['What is included', 'Что входит'],
        benefit1Title: ['12+ real testers', '12+ реальных тестировщиков'],
        benefit1Text: [
            'They keep testing your app until you get production access.',
            'Работают с приложением, пока вы не получите доступ к production.'
        ],
        benefit2Title: ['Only physical devices', 'Только живые устройства'],
        benefit2Text: [
            'No emulators and no device farms — testing runs on real phones.',
            'Никаких эмуляторов и ферм — тестирование идет на реальных телефонах.'
        ],
        benefit3Title: ['Money-back guarantee', 'Гарантия возврата'],
        benefit3Text: [
            'If production access is not granted, we refund the payment.',
            'Если доступ к production не получен, мы вернем оплату.'
        ],
        footnote: [
            'Official price $20. Crypto — $20. PayPal / bank — $20 + $3 fee.',
            'Официальная цена $20. Крипто — $20. PayPal / банк — $20 + комиссия $3.'
        ],
        cta: ['Add your app', 'Добавить приложение'],
        close: ['Close', 'Закрыть']
    };

    function isRu() {
        var lang = String(
            window.currentLang ||
            (document.documentElement && document.documentElement.lang) ||
            'en'
        ).toLowerCase();
        return lang.indexOf('ru') === 0;
    }

    function t(key) {
        var pair = COPY[key];
        if (!pair) return '';
        return isRu() ? pair[1] : pair[0];
    }

    function createGuaranteedTestOfferHTML() {
        return `
        <div id="guaranteed-test-offer-overlay" class="gto-overlay" style="display: none;">
            <div class="gto-header">
                <button type="button" class="gto-close-btn" id="gto-close-btn" aria-label="${t('close')}">&times;</button>
                <h1 class="gto-header-title">${t('headerTitle')}</h1>
                <p class="gto-header-subtitle">${t('headerSubtitle')}</p>
            </div>
            <div class="gto-container">
                <div class="gto-card">
                    <div class="gto-card-top">
                        <div class="gto-group-icon-badge">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div class="gto-pill-badge">
                            <svg class="gto-pill-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>${t('badge')}</span>
                        </div>
                    </div>

                    <h2 class="gto-main-title">${t('title')}</h2>
                    <p class="gto-lead">${t('lead')}</p>

                    <div class="gto-price-section">
                        <span class="gto-price-value">${t('price')}</span>
                        <p class="gto-price-label">${t('priceNote')}</p>
                    </div>

                    <p class="gto-section-label">${t('includedLabel')}</p>
                    <div class="gto-benefits-list">
                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <div class="gto-benefit-text"><strong>${t('benefit1Title')}</strong>${t('benefit1Text')}</div>
                        </div>

                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                                <line x1="12" y1="18" x2="12.01" y2="18"></line>
                            </svg>
                            <div class="gto-benefit-text"><strong>${t('benefit2Title')}</strong>${t('benefit2Text')}</div>
                        </div>

                        <div class="gto-benefit-item">
                            <svg class="gto-benefit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                <polyline points="9 12 11 14 15 10"></polyline>
                            </svg>
                            <div class="gto-benefit-text"><strong>${t('benefit3Title')}</strong>${t('benefit3Text')}</div>
                        </div>
                    </div>

                    <p class="gto-footnote">${t('footnote')}</p>
                </div>
            </div>
            <div class="gto-footer">
                <div class="gto-footer-content">
                    <button type="button" class="gto-cta-btn" id="gto-cta-btn">${t('cta')}</button>
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
            closeBtn.addEventListener('click', function () {
                hideGuaranteedTestOfferModal();
                // Explicit close of the offer abandons the flow → drop draft.
                if (typeof window.clearGuaranteedTestWizardDraft === 'function') {
                    window.clearGuaranteedTestWizardDraft();
                }
            });
        }

        var ctaBtn = document.getElementById('gto-cta-btn');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', handleOrderSubmission);
        }
    }

    function openGuaranteedWizardFromOffer() {
        if (typeof window.showGuaranteedTestWizardStep1 === 'function') {
            window.showGuaranteedTestWizardStep1();
            return;
        }
        var targetUrl = "https://t.me/garantXchange";
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    }

    function handleOrderSubmission() {
        // Gate drafts / awaiting-payment here (on CTA), not when opening the offer page.
        // Deep links must open the offer immediately — same reliability as startapp=add_app.
        if (typeof window.guardGuaranteedPrivateTestStart === 'function') {
            window.guardGuaranteedPrivateTestStart(openGuaranteedWizardFromOffer);
            return;
        }
        openGuaranteedWizardFromOffer();
    }

    function showGuaranteedTestOfferModal() {
        var overlay = ensureModalInDOM();
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.zIndex = '99999';
        } else {
            setTimeout(function () { showGuaranteedTestOfferModal(); }, 50);
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
