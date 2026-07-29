/* =========================================================
   GUARANTEED CLOSED TEST WIZARD - 3-SCREEN MODULE
   Step 1 of 2: App Details
   Step 2 of 2: Testing Link
   Final Step: Payment (+ stepper flow per method)
   ========================================================= */

(function () {
    'use strict';

    var SETUP_LICENSE_GUIDE_URL = "https://t.me/googleplay_console_12testers/31/2885";
    var GENERAL_TESTING_GUIDE_URL = "https://telegra.ph/Action-Required-Add-Testing-Group-to-Start-Closed-Testing-06-04";
    var TESTER_GROUP_EMAIL = "google-play-dev-test@googlegroups.com";
    var PAYPAL_EMAIL = "pay.hubstation@gmail.com";
    var TELEGRAM_SUPPORT = "garantxchange";
    var PAYPAL_OPEN_URL = "https://www.paypal.com/myaccount/transfer/homepage/pay";

    var CRYPTO_EXCHANGES = [
        { id: 'binance', name: 'Binance', label: 'ID', value: '967321648', initials: 'BN', logo: './images/Binance.webp' },
        { id: 'bybit', name: 'ByBit', label: 'UID', value: '30291060', initials: 'BY', logo: './images/Bybit.webp' },
        { id: 'okx', name: 'OKX', label: 'UID', value: '323906492761830368', initials: 'OK', logo: './images/OKX.webp' },
        { id: 'htx', name: 'HTX', label: 'UID', value: '442101593', initials: 'HT', logo: './images/HTX.webp' },
        { id: 'gate', name: 'Gate', label: 'UID', value: '8536355', initials: 'GT', logo: './images/Gate.webp' }
    ];

    var wizardState = {
        step: 1,
        appName: '',
        appType: 'free',
        licenseTestingConfirmed: false,
        testingLink: '',
        paymentMethod: null,
        paymentExchange: null,
        paymentStep1Done: false,
        paymentScreenshotUrl: '',
        paymentScreenshotFile: null,
        prefillProject: null,
        detailsConfirmed: false,
        linkConfirmed: false,
        prefillStep1Active: false,
        prefillStep2Active: false,
        consoleChecklist: { email: false, countries: false, review: false }
    };

    function getDefaultWizardState() {
        return {
            step: 1,
            appName: '',
            appType: 'free',
            licenseTestingConfirmed: false,
            testingLink: '',
            paymentMethod: null,
            paymentExchange: null,
            paymentStep1Done: false,
            paymentScreenshotUrl: '',
            paymentScreenshotFile: null,
            prefillProject: null,
            detailsConfirmed: false,
            linkConfirmed: false,
            prefillStep1Active: false,
            prefillStep2Active: false,
            consoleChecklist: { email: false, countries: false, review: false }
        };
    }

    function projectUsesStandardGoogleGroup(project) {
        if (!project) return false;
        var testMode = String(project.test_mode || 'google_group').toLowerCase();
        if (testMode === 'email_list') return false;
        var groupUrl = String(project.google_group_url || '').trim();
        if (window.AccessSetupManager && typeof window.AccessSetupManager.isDefaultGroup === 'function') {
            if (!groupUrl) return true;
            return window.AccessSetupManager.isDefaultGroup(groupUrl);
        }
        var defaultUrl = 'https://groups.google.com/g/google-play-dev-test';
        var normalize = function (url) {
            return String(url || '').trim().replace(/\/+$/, '').toLowerCase();
        };
        return normalize(groupUrl || defaultUrl) === normalize(defaultUrl);
    }

    function shouldShowProjectConsoleChecklist() {
        return !!(wizardState.prefillProject && projectUsesStandardGoogleGroup(wizardState.prefillProject));
    }

    function resetWizardState(keepPrefill) {
        var prefill = keepPrefill ? wizardState.prefillProject : null;
        var next = getDefaultWizardState();
        if (prefill) {
            next.prefillProject = prefill;
            applyProjectPrefillToState(next, prefill);
        }
        Object.keys(next).forEach(function (key) {
            wizardState[key] = next[key];
        });
    }

    function buildTestingLinkFromPackage(packageName) {
        var pkg = String(packageName || '').trim();
        if (!pkg) return '';
        return 'https://play.google.com/apps/testing/' + pkg;
    }

    function applyProjectPrefillToState(state, project) {
        if (!project) return;
        state.appName = String(project.name || '').trim();
        state.testingLink = buildTestingLinkFromPackage(project.package || project.package_name || '');
        state.prefillProject = project;
        state.detailsConfirmed = false;
        state.linkConfirmed = false;
        state.prefillStep1Active = true;
        state.prefillStep2Active = true;
        state.consoleChecklist = { email: false, countries: false, review: false };
    }

    function applyProjectPrefill(project) {
        applyProjectPrefillToState(wizardState, project);
    }

    function setPrefillStep1Active(active) {
        if (!wizardState.prefillProject) {
            wizardState.prefillStep1Active = false;
            return;
        }
        wizardState.prefillStep1Active = !!active;
        if (wizardState.prefillStep1Active) {
            wizardState.appName = String(wizardState.prefillProject.name || '').trim();
            wizardState.detailsConfirmed = false;
            var input = document.getElementById('gtw-app-name-input');
            if (input) input.value = wizardState.appName;
        }
    }

    function setPrefillStep2Active(active) {
        if (!wizardState.prefillProject) {
            wizardState.prefillStep2Active = false;
            return;
        }
        wizardState.prefillStep2Active = !!active;
        if (wizardState.prefillStep2Active) {
            wizardState.testingLink = buildTestingLinkFromPackage(wizardState.prefillProject.package || wizardState.prefillProject.package_name || '');
            wizardState.linkConfirmed = false;
            var input = document.getElementById('gtw-link-input');
            if (input) input.value = wizardState.testingLink;
            updateLinkVerificationUI();
        }
    }

    function syncPrefillToggleUI(step, active) {
        var badge = document.getElementById('gtw-prefill-badge-step' + step);
        var hint = document.getElementById('gtw-prefill-hint-step' + step);
        if (badge) {
            badge.textContent = active ? 'Auto-fill from project' : 'Manual input';
        }
        if (hint) {
            hint.textContent = active
                ? 'Project defaults are applied'
                : 'You are editing fields manually';
        }
    }

    function isValidTestingLink(url) {
        var value = String(url || '').trim();
        if (!value || !/^https?:\/\//i.test(value)) return false;
        if (/play\.google\.com\/apps\/testing\//i.test(value)) return true;
        if (/play\.google\.com\/store\/apps\/details/i.test(value) && /[?&]id=[\w.]+/i.test(value)) return true;
        return false;
    }

    function normalizeTestingLink(url) {
        var value = String(url || '').trim();
        if (/play\.google\.com\/store\/apps\/details/i.test(value)) {
            var match = value.match(/[?&]id=([\w.]+)/i);
            if (match && match[1]) {
                return 'https://play.google.com/apps/testing/' + match[1];
            }
        }
        return value;
    }

    function getPaymentAmount(method) {
        if (method === 'paypal' || method === 'rub') return 23;
        return 20;
    }

    /* =========================================================
       STEP 1 OF 2 HTML (App Details)
       ========================================================= */

    function createWizardStep1HTML() {
        return `
        <div id="guaranteed-test-wizard-step1-overlay" class="gtw-overlay" style="display: none;">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-step1-back-btn" aria-label="Back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">Private Testing ($20)</h1>
                <p class="gtw-header-subtitle">STEP 1 OF 2</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step active"></div>
                    <div class="gtw-progress-step inactive"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-prefill-row" id="gtw-prefill-row-step1" style="display: none;">
                    <span class="gtw-prefill-hint" id="gtw-prefill-hint-step1"></span>
                    <button type="button" id="gtw-prefill-badge-step1" class="gtw-prefill-badge">Auto-fill from project</button>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-app-name-input">APP NAME (REQUIRED)</label>
                    <div class="gtw-input-wrapper">
                        <input type="text" id="gtw-app-name-input" class="gtw-input" placeholder="e.g. Twitter X" autocomplete="off" />
                        <button type="button" class="gtw-paste-btn" id="gtw-paste-appname-btn" title="Paste from clipboard">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                    </div>
                    <div class="gtw-helper-text" id="gtw-appname-helper">Please enter your app name.</div>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label">IS YOUR APP FREE OR PAID?</label>
                    <div class="gtw-type-grid">
                        <div class="gtw-type-card selected-free" id="gtw-type-free" data-type="free">
                            <svg class="gtw-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="9 12 11.5 14.5 15.5 9.5"></polyline>
                            </svg>
                            <span class="gtw-type-title">Free App</span>
                        </div>

                        <div class="gtw-type-card" id="gtw-type-paid" data-type="paid">
                            <svg class="gtw-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="1" x2="12" y2="23"></line>
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            <span class="gtw-type-title">Paid App</span>
                        </div>
                    </div>

                    <div id="gtw-inline-license-block" class="gtw-inline-card" style="display: none;">
                        <h3 class="gtw-inline-title">Setup License Testing</h3>
                        <p class="gtw-inline-subtitle">This configuration allows testers to download your paid app for free.</p>
                        <p class="gtw-inline-desc">
                            Testers cannot install paid apps for free unless they are added to <strong>License Testing</strong>. This allows our team to download and test your app without creating a sale.
                        </p>
                        <ul class="gtw-inline-list">
                            <li>Go to <strong>Settings &rarr; License testing</strong></li>
                            <li>Select <strong>Google Groups</strong> as tester type</li>
                            <li>Add <strong>${TESTER_GROUP_EMAIL}</strong></li>
                            <li>Keep <strong>RESPOND_NORMALLY</strong> &amp; Save</li>
                        </ul>
                        <button type="button" class="gtw-inline-guide-btn" id="gtw-inline-guide-btn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            <span>View Setup Guide</span>
                        </button>
                    </div>
                </div>

                <label class="gtw-confirm-row" id="gtw-details-confirm-row" style="display: none;">
                    <input type="checkbox" id="gtw-details-confirm-checkbox" />
                    <span class="gtw-confirm-label-wrap">
                        <span class="gtw-confirm-label">I confirm the <strong>app name</strong> and <strong>type</strong> are correct for this order.</span>
                        <span class="gtw-confirm-warning" id="gtw-details-confirm-warning" style="display: none;">⚠️ Please confirm the prefilled app details.</span>
                    </span>
                </label>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-step1-continue-btn">CONTINUE</button>
                </div>
            </div>

            <div id="gtw-license-modal-overlay" class="gtw-modal-overlay" style="display: none;">
                <div class="gtw-modal-card">
                    <h3 class="gtw-modal-title">Setup License Testing</h3>
                    <p class="gtw-modal-desc">This configuration allows testers to download your paid app for free.</p>
                    <div class="gtw-modal-steps">
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">1</span>
                            <span class="gtw-step-text">Go to <strong>Settings &rarr; License testing</strong></span>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">2</span>
                            <span class="gtw-step-text">Select <strong>Google Groups</strong> as tester type</span>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">3</span>
                            <div class="gtw-step-content">
                                <span class="gtw-step-text">Add our tester group email:</span>
                                <div class="gtw-copy-box">
                                    <span class="gtw-copy-email" id="gtw-modal-email">${TESTER_GROUP_EMAIL}</span>
                                    <button type="button" class="gtw-copy-btn" id="gtw-modal-copy-btn" title="Copy email">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="gtw-modal-step">
                            <span class="gtw-step-num">4</span>
                            <span class="gtw-step-text">Keep <strong>RESPOND_NORMALLY</strong> &amp; Save</span>
                        </div>
                    </div>
                    <button type="button" class="gtw-guide-btn" id="gtw-modal-guide-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        <span>VIEW SETUP GUIDE</span>
                    </button>
                    <div class="gtw-modal-actions">
                        <button type="button" class="gtw-modal-cancel-btn" id="gtw-modal-cancel-btn">CANCEL</button>
                        <button type="button" class="gtw-modal-confirm-btn" id="gtw-modal-confirm-btn">I UNDERSTAND</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function createLicenseGuideOverlayHTML() {
        return `
        <div id="gtw-license-guide-overlay" class="gtw-guide-page-overlay" style="display: none;">
            <div class="gtw-guide-page">
                <button type="button" class="gtw-guide-page-close" id="gtw-license-guide-close" aria-label="Close">&times;</button>
                <h2 class="gtw-guide-page-title">Step-by-Step Setup for License Testing</h2>
                <p class="gtw-guide-page-subtitle">For paid apps or in-app purchases, configure License Testing so testers can install without real charges.</p>

                <div class="gtw-guide-page-steps">
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">1</span>
                        <div class="gtw-guide-page-content">
                            <strong>Open Google Play Console</strong>
                            <p>Go to your app dashboard in Play Console.</p>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">2</span>
                        <div class="gtw-guide-page-content">
                            <strong>Settings → License testing</strong>
                            <p>Open license testing settings from the left sidebar.</p>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">3</span>
                        <div class="gtw-guide-page-content">
                            <strong>Choose Google Groups</strong>
                            <p>Select <strong>Google Groups</strong> (not Email lists) for tester type.</p>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">4</span>
                        <div class="gtw-guide-page-content">
                            <strong>Add Google Group email</strong>
                            <p>Enter our testing group email and press Enter:</p>
                            <div class="gtw-copy-box">
                                <span class="gtw-copy-email">${TESTER_GROUP_EMAIL}</span>
                                <button type="button" class="gtw-copy-btn" id="gtw-license-guide-copy-btn" title="Copy email">Copy</button>
                            </div>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">5</span>
                        <div class="gtw-guide-page-content">
                            <strong>Keep license response default</strong>
                            <p>Under License response, keep <strong>RESPOND_NORMALLY</strong>.</p>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">6</span>
                        <div class="gtw-guide-page-content">
                            <strong>Save changes</strong>
                            <p>Click <strong>Save changes</strong> at the bottom of the page.</p>
                        </div>
                    </div>
                    <div class="gtw-guide-page-step">
                        <span class="gtw-guide-page-num">7</span>
                        <div class="gtw-guide-page-content">
                            <strong>Share opt-in link with testers</strong>
                            <p>After closed testing is approved, copy the opt-in link from <strong>Closed testing → Testers → How testers join your test</strong>.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function createExchangePickerHTML() {
        return CRYPTO_EXCHANGES.map(function (ex) {
            return `
                <div class="gtw-exchange-pick-row" data-exchange="${ex.id}" role="button" tabindex="0">
                    <div class="gtw-exchange-pick-left">
                        <div class="gtw-exchange-icon">
                            <img src="${ex.logo}" alt="${ex.name}" class="gtw-exchange-logo" onerror="this.style.display='none'; this.parentNode.classList.add('is-fallback'); this.parentNode.textContent='${ex.initials}';" />
                        </div>
                        <span class="gtw-exchange-pick-name">${ex.name}</span>
                    </div>
                    <span class="gtw-exchange-pick-chevron">›</span>
                </div>
            `;
        }).join('');
    }

    /* =========================================================
       STEP 2 OF 2 HTML (Testing Link)
       ========================================================= */

    function createWizardStep2HTML() {
        return `
        <div id="guaranteed-test-wizard-step2-overlay" class="gtw-overlay gtw-step2-overlay" style="display: none;">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-step2-back-btn" aria-label="Back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">Private Testing ($20)</h1>
                <p class="gtw-header-subtitle">STEP 2 OF 2</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step inactive"></div>
                    <div class="gtw-progress-step active"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-prefill-row" id="gtw-prefill-row-step2" style="display: none;">
                    <span class="gtw-prefill-hint" id="gtw-prefill-hint-step2"></span>
                    <button type="button" id="gtw-prefill-badge-step2" class="gtw-prefill-badge">Auto-fill from project</button>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-link-input">PASTE YOUR TESTING LINK</label>
                    <div class="gtw-input-wrapper">
                        <input type="url" id="gtw-link-input" class="gtw-input" placeholder="https://play.google.com/apps/testing/com.example.app" autocomplete="off" />
                        <button type="button" class="gtw-clear-btn" id="gtw-clear-link-btn" title="Clear" style="display: none;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <button type="button" class="gtw-paste-btn" id="gtw-paste-link-btn" title="Paste from clipboard">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                    </div>
                    <div class="gtw-helper-text" id="gtw-link-helper">Paste the "Join on Android" link you copied from Play Console.</div>
                    <div id="gtw-link-verification" class="gtw-link-verification" style="display: none;">
                        <div class="gtw-link-verification-head">
                            <span class="gtw-link-verification-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2.4l2.15 1.76 2.73-.36 1.35 2.4 2.54 1.09-.36 2.74L22.16 12l-1.75 2.15.36 2.73-2.4 1.35-1.09 2.54-2.74-.36L12 21.6l-2.15-1.76-2.73.36-1.35-2.4-2.54-1.09.36-2.74L1.84 12l1.75-2.15-.36-2.73 2.4-1.35 1.09-2.54 2.74.36L12 2.4z" fill="currentColor" opacity=".22"/>
                                    <path d="M12 2.4l2.15 1.76 2.73-.36 1.35 2.4 2.54 1.09-.36 2.74L22.16 12l-1.75 2.15.36 2.73-2.4 1.35-1.09 2.54-2.74-.36L12 21.6l-2.15-1.76-2.73.36-1.35-2.4-2.54-1.09.36-2.74L1.84 12l1.75-2.15-.36-2.73 2.4-1.35 1.09-2.54 2.74.36L12 2.4z" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8.2 12.2l2.4 2.3 5.2-5.2" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </span>
                            <span class="gtw-link-verification-label">LINK VERIFICATION</span>
                        </div>
                        <div class="gtw-link-verification-url" id="gtw-link-verification-url"></div>
                        <p class="gtw-link-verification-note">Please confirm your Package ID or URL carefully before submitting. Errors may delay your testing cycle.</p>
                        <label class="gtw-confirm-row gtw-confirm-row--inside" id="gtw-link-confirm-row" style="display: none;">
                            <input type="checkbox" id="gtw-link-confirm-checkbox" />
                            <span class="gtw-confirm-label-wrap">
                                <span class="gtw-confirm-label">I confirm this testing link is correct.</span>
                                <span class="gtw-confirm-warning" id="gtw-link-confirm-warning" style="display: none;">⚠️ Please confirm the prefilled testing link.</span>
                            </span>
                        </label>
                    </div>
                </div>

                <div id="gtw-step2-project-checklist" class="gtw-setup-checklist" style="display: none;">
                    <p class="gtw-setup-checklist-lead">Confirm your Play Console is already configured for this project:</p>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-email" />
                        <span>
                            <strong>I added DevTestHub Google Group email in Play Console</strong>
                            <small>Selected: Google Groups</small>
                            <small>Added: ${TESTER_GROUP_EMAIL}</small>
                        </span>
                    </label>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-countries" />
                        <span><strong>I selected all countries</strong></span>
                    </label>
                    <label class="gtw-checklist-item">
                        <input type="checkbox" id="gtw-check-console-review" />
                        <span><strong>I sent changes for review</strong></span>
                    </label>
                </div>

                <div id="gtw-step2-instructions-accordion" class="gtw-step2-accordion">
                    <button type="button" class="gtw-step2-accordion-head" id="gtw-step2-accordion-head" style="display: none;" aria-expanded="false">
                        <span>❓ How to set up</span>
                        <span class="gtw-step2-accordion-arrow" aria-hidden="true">▼</span>
                    </button>
                    <div class="gtw-step2-accordion-panel" id="gtw-step2-instructions-panel">
                        <div class="gtw-instructions-list" id="gtw-step2-instructions-list">
                            <div class="gtw-card-item">
                                <div class="gtw-card-icon-badge gtw-badge-green">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="8.5" cy="7" r="4"></circle>
                                        <line x1="20" y1="8" x2="20" y2="14"></line>
                                        <line x1="17" y1="11" x2="23" y2="11"></line>
                                    </svg>
                                </div>
                                <div class="gtw-card-content">
                                    <h4 class="gtw-card-title">1. Add Testers</h4>
                                    <p class="gtw-card-text">Go to <strong>Closed Testing &rarr; Testers</strong> and add this Google Group:</p>
                                    <div class="gtw-copy-box" style="margin-top: 4px;">
                                        <span class="gtw-copy-email">${TESTER_GROUP_EMAIL}</span>
                                        <button type="button" class="gtw-copy-btn" id="gtw-card-copy-btn" title="Copy email">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div class="gtw-card-item">
                                <div class="gtw-card-icon-badge gtw-badge-blue">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="2" y1="12" x2="22" y2="12"></line>
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                    </svg>
                                </div>
                                <div class="gtw-card-content">
                                    <h4 class="gtw-card-title">2. Enable Countries</h4>
                                    <p class="gtw-card-text">In <strong>Countries/regions</strong> section, enable <strong>all countries</strong> to allow testers worldwide.</p>
                                </div>
                            </div>

                            <div class="gtw-card-item">
                                <div class="gtw-card-icon-badge gtw-badge-amber">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                </div>
                                <div class="gtw-card-content">
                                    <h4 class="gtw-card-title">3. Send for Review</h4>
                                    <p class="gtw-card-text">Click <strong>"Send X changes for review"</strong> button in your Play Console to submit your app.</p>
                                    <div class="gtw-note-box">
                                        💡 While waiting for review, you can submit the app here - review usually takes only a few minutes.
                                    </div>
                                </div>
                            </div>

                            <div class="gtw-card-item">
                                <div class="gtw-card-icon-badge gtw-badge-purple">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                    </svg>
                                </div>
                                <div class="gtw-card-content">
                                    <h4 class="gtw-card-title">4. Copy Testing Link</h4>
                                    <p class="gtw-card-text">Find <strong>"How testers join your test"</strong> section and copy the <strong>"Join on Android"</strong> link.</p>
                                </div>
                            </div>
                        </div>

                        <div class="gtw-guide-card" id="gtw-general-testing-guide">
                            <div class="gtw-guide-card-left">
                                <div class="gtw-guide-icon-badge">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                    </svg>
                                </div>
                                <div class="gtw-guide-card-info">
                                    <div class="gtw-guide-card-title">Testing Guide</div>
                                    <div class="gtw-guide-card-desc">Need help? View the general setup guide.</div>
                                </div>
                            </div>
                            <svg class="gtw-guide-external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-proceed-payment-btn">PROCEED TO PAYMENT</button>
                </div>
            </div>
        </div>
        `;
    }

    /* =========================================================
       FINAL STEP HTML (Payment Screen)
       ========================================================= */

    function createWizardPaymentHTML() {
        return `
        <div id="guaranteed-test-wizard-payment-overlay" class="gtw-overlay" style="display: none;">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-payment-back-btn" aria-label="Back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">Private Testing ($20)</h1>
                <p class="gtw-header-subtitle">FINAL STEP</p>
            </div>

            <div class="gtw-body">
                <div class="gtw-plan-card">
                    <div class="gtw-plan-label">YOUR TESTING PLAN</div>
                    <h2 class="gtw-plan-title">Production Access Sprint</h2>
                    <div class="gtw-plan-price-row">
                        <span class="gtw-plan-price">$20</span>
                        <span class="gtw-plan-subtitle">from (crypto)</span>
                    </div>
                    <div class="gtw-plan-features">
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>12 real testers</strong> added within 12 hours</span>
                        </div>
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>14-day coverage</strong> for your closed test</span>
                        </div>
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>Production guidance</strong> and form answers</span>
                        </div>
                    </div>
                    <div class="gtw-guarantee-box">
                        <svg class="gtw-guarantee-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <polyline points="9 12 11 14 15 10"></polyline>
                        </svg>
                        <div>
                            <h4 class="gtw-guarantee-title">Access guarantee</h4>
                            <p class="gtw-guarantee-text">Support continues until your app is ready for production review.</p>
                        </div>
                    </div>
                </div>

                <div class="gtw-form-group">
                    <label class="gtw-label">CHOOSE PAYMENT METHOD</label>
                    <div class="gtw-payment-methods">
                        <div class="gtw-method-card" id="gtw-method-crypto" data-method="crypto">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">Crypto Transfer</span>
                                            <span class="gtw-method-badge gtw-badge-rec">RECOMMENDED</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price">$20</span>
                            </div>
                            <p class="gtw-method-action-hint">Select an exchange to continue</p>
                            <div class="gtw-exchange-picker" id="gtw-exchange-picker">
                                ${createExchangePickerHTML()}
                            </div>
                        </div>

                        <div class="gtw-method-card" id="gtw-method-paypal" data-method="paypal">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">PayPal</span>
                                            <span class="gtw-method-badge gtw-badge-fee">+ processing fee</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price">$23</span>
                            </div>
                            <p class="gtw-method-action-hint">Tap to open payment steps</p>
                        </div>

                        <div class="gtw-method-card" id="gtw-method-rub" data-method="rub">
                            <div class="gtw-method-header">
                                <div class="gtw-method-left">
                                    <div class="gtw-method-radio"></div>
                                    <div class="gtw-method-info">
                                        <div class="gtw-method-title-row">
                                            <span class="gtw-method-title">RUB Transfer</span>
                                            <span class="gtw-method-badge gtw-badge-fee">+ service fee</span>
                                        </div>
                                    </div>
                                </div>
                                <span class="gtw-method-price">$23</span>
                            </div>
                            <p class="gtw-method-action-hint">Tap to open payment steps</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-pay-btn" disabled>SELECT PAYMENT METHOD</button>
                </div>
            </div>
        </div>

        <div id="gtw-payment-flow-overlay" class="gtw-payment-flow-overlay" aria-hidden="true">
            <div class="gtw-payment-flow-sheet" id="gtw-payment-flow-sheet"></div>
        </div>
        `;
    }

    function ensureWizardInDOM() {
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (!overlay1) {
            var div1 = document.createElement('div');
            div1.innerHTML = createWizardStep1HTML();
            document.body.appendChild(div1.firstElementChild);
            bindStep1Events();
        }

        if (!document.getElementById('gtw-license-guide-overlay')) {
            var divGuide = document.createElement('div');
            divGuide.innerHTML = createLicenseGuideOverlayHTML();
            document.body.appendChild(divGuide.firstElementChild);
            bindLicenseGuideEvents();
        }

        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (!overlay2) {
            var div2 = document.createElement('div');
            div2.innerHTML = createWizardStep2HTML();
            document.body.appendChild(div2.firstElementChild);
            bindStep2Events();
        }

        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (!overlayPay) {
            var divPay = document.createElement('div');
            divPay.innerHTML = createWizardPaymentHTML();
            while (divPay.firstElementChild) {
                document.body.appendChild(divPay.firstElementChild);
            }
            bindPaymentEvents();
        }
    }

    function syncStep1FormFromState() {
        var input = document.getElementById('gtw-app-name-input');
        if (input) input.value = wizardState.appName || '';
        updateTypeSelectorUI(wizardState.appType);
        if (wizardState.appType === 'paid') showInlineLicenseTestingBlock();
        else hideInlineLicenseTestingBlock();

        var hasPrefill = !!wizardState.prefillProject;
        var badge = document.getElementById('gtw-prefill-badge-step1');
        var row = document.getElementById('gtw-prefill-row-step1');
        var confirmRow = document.getElementById('gtw-details-confirm-row');
        var confirmBox = document.getElementById('gtw-details-confirm-checkbox');
        if (row) row.style.display = hasPrefill ? 'flex' : 'none';
        if (badge) {
            badge.classList.toggle('is-inactive', hasPrefill && !wizardState.prefillStep1Active);
        }
        syncPrefillToggleUI(1, !!wizardState.prefillStep1Active);
        if (confirmRow) confirmRow.style.display = hasPrefill ? 'flex' : 'none';
        if (confirmBox) confirmBox.checked = !!wizardState.detailsConfirmed;
        var warn = document.getElementById('gtw-details-confirm-warning');
        if (warn) warn.style.display = 'none';
    }

    function syncStep2FormFromState() {
        var linkInput = document.getElementById('gtw-link-input');
        if (linkInput) linkInput.value = wizardState.testingLink || '';
        var hasPrefill = !!wizardState.prefillProject;
        var badge = document.getElementById('gtw-prefill-badge-step2');
        var row = document.getElementById('gtw-prefill-row-step2');
        var confirmRow = document.getElementById('gtw-link-confirm-row');
        var confirmBox = document.getElementById('gtw-link-confirm-checkbox');
        if (row) row.style.display = hasPrefill ? 'flex' : 'none';
        if (badge) {
            badge.classList.toggle('is-inactive', hasPrefill && !wizardState.prefillStep2Active);
        }
        syncPrefillToggleUI(2, !!wizardState.prefillStep2Active);
        if (confirmRow) confirmRow.style.display = hasPrefill ? 'flex' : 'none';
        if (confirmBox) confirmBox.checked = !!wizardState.linkConfirmed;
        var warn = document.getElementById('gtw-link-confirm-warning');
        if (warn) warn.style.display = 'none';
        syncStep2LayoutMode();
        updateLinkVerificationUI();
    }

    function syncStep2LayoutMode() {
        var useChecklist = shouldShowProjectConsoleChecklist();
        var checklistEl = document.getElementById('gtw-step2-project-checklist');
        var accordion = document.getElementById('gtw-step2-instructions-accordion');
        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        var panel = document.getElementById('gtw-step2-instructions-panel');

        if (checklistEl) checklistEl.style.display = useChecklist ? 'block' : 'none';
        if (accordionHead) accordionHead.style.display = useChecklist ? 'flex' : 'none';

        if (accordion) {
            if (useChecklist) {
                accordion.classList.add('is-collapsible');
                accordion.classList.remove('is-open');
                if (accordionHead) accordionHead.setAttribute('aria-expanded', 'false');
            } else {
                accordion.classList.remove('is-collapsible');
                accordion.classList.add('is-open');
                if (accordionHead) accordionHead.setAttribute('aria-expanded', 'true');
            }
        }

        if (panel) {
            panel.style.display = useChecklist ? 'none' : 'block';
        }

        if (useChecklist) {
            var emailBox = document.getElementById('gtw-check-console-email');
            var countriesBox = document.getElementById('gtw-check-console-countries');
            var reviewBox = document.getElementById('gtw-check-console-review');
            if (emailBox) emailBox.checked = !!wizardState.consoleChecklist.email;
            if (countriesBox) countriesBox.checked = !!wizardState.consoleChecklist.countries;
            if (reviewBox) reviewBox.checked = !!wizardState.consoleChecklist.review;
        }
    }

    function toggleStep2InstructionsAccordion() {
        var accordion = document.getElementById('gtw-step2-instructions-accordion');
        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        var panel = document.getElementById('gtw-step2-instructions-panel');
        if (!accordion || !panel || !accordion.classList.contains('is-collapsible')) return;

        var willOpen = !accordion.classList.contains('is-open');
        accordion.classList.toggle('is-open', willOpen);
        panel.style.display = willOpen ? 'block' : 'none';
        if (accordionHead) accordionHead.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    /* =========================================================
       EVENT BINDINGS
       ========================================================= */

    function bindStep1Events() {
        var backBtn = document.getElementById('gtw-step1-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardStep1();
                if (typeof window.showGuaranteedTestOfferModal === 'function') {
                    window.showGuaranteedTestOfferModal();
                }
            });
        }

        var freeCard = document.getElementById('gtw-type-free');
        var paidCard = document.getElementById('gtw-type-paid');
        if (freeCard) freeCard.addEventListener('click', handleTapFreeApp);
        if (paidCard) paidCard.addEventListener('click', handleTapPaidApp);

        var pasteBtn = document.getElementById('gtw-paste-appname-btn');
        var input = document.getElementById('gtw-app-name-input');
        if (pasteBtn && input) {
            pasteBtn.addEventListener('click', function () {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(function (text) {
                        if (text) {
                            input.value = text.trim();
                            wizardState.detailsConfirmed = false;
                            clearAppnameError();
                        }
                    }).catch(function () {});
                }
            });
        }

        if (input) {
            input.addEventListener('input', function () {
                wizardState.appName = String(input.value || '');
                wizardState.detailsConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep1Active = false;
                clearAppnameError();
                syncStep1FormFromState();
            });
        }

        var prefillBadgeStep1 = document.getElementById('gtw-prefill-badge-step1');
        if (prefillBadgeStep1) {
            prefillBadgeStep1.addEventListener('click', function () {
                setPrefillStep1Active(!wizardState.prefillStep1Active);
                syncStep1FormFromState();
            });
        }

        var detailsConfirm = document.getElementById('gtw-details-confirm-checkbox');
        if (detailsConfirm) {
            detailsConfirm.addEventListener('change', function () {
                wizardState.detailsConfirmed = !!detailsConfirm.checked;
                var warningStep1 = document.getElementById('gtw-details-confirm-warning');
                if (warningStep1) warningStep1.style.display = 'none';
            });
        }

        var continueBtn = document.getElementById('gtw-step1-continue-btn');
        if (continueBtn) continueBtn.addEventListener('click', handleStep1Continue);

        var modalCancelBtn = document.getElementById('gtw-modal-cancel-btn');
        if (modalCancelBtn) modalCancelBtn.addEventListener('click', handleCancelLicenseTesting);

        var modalConfirmBtn = document.getElementById('gtw-modal-confirm-btn');
        if (modalConfirmBtn) modalConfirmBtn.addEventListener('click', handleConfirmLicenseTesting);

        var modalGuideBtn = document.getElementById('gtw-modal-guide-btn');
        if (modalGuideBtn) modalGuideBtn.addEventListener('click', handleOpenLicenseSetupGuide);

        var inlineGuideBtn = document.getElementById('gtw-inline-guide-btn');
        if (inlineGuideBtn) inlineGuideBtn.addEventListener('click', handleOpenLicenseSetupGuide);

        var modalCopyBtn = document.getElementById('gtw-modal-copy-btn');
        if (modalCopyBtn) {
            modalCopyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, modalCopyBtn);
            });
        }
    }

    function bindLicenseGuideEvents() {
        var closeBtn = document.getElementById('gtw-license-guide-close');
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (closeBtn) closeBtn.addEventListener('click', closeLicenseGuideModal);
        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeLicenseGuideModal();
            });
        }
        var copyBtn = document.getElementById('gtw-license-guide-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, copyBtn);
            });
        }
    }

    function openLicenseGuideModal() {
        ensureWizardInDOM();
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    function closeLicenseGuideModal() {
        var overlay = document.getElementById('gtw-license-guide-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    function bindStep2Events() {
        var backBtn = document.getElementById('gtw-step2-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardStep2();
                showGuaranteedTestWizardStep1();
            });
        }

        var pasteLinkBtn = document.getElementById('gtw-paste-link-btn');
        var clearLinkBtn = document.getElementById('gtw-clear-link-btn');
        var linkInput = document.getElementById('gtw-link-input');
        if (pasteLinkBtn && linkInput) {
            pasteLinkBtn.addEventListener('click', function () {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(function (text) {
                        if (text) {
                            linkInput.value = text.trim();
                            wizardState.linkConfirmed = false;
                            if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                            clearLinkError();
                            updateLinkVerificationUI();
                            syncStep2FormFromState();
                        }
                    }).catch(function () {});
                }
            });
        }

        if (clearLinkBtn && linkInput) {
            clearLinkBtn.addEventListener('click', function () {
                linkInput.value = '';
                wizardState.testingLink = '';
                wizardState.linkConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                clearLinkError();
                updateLinkVerificationUI();
                linkInput.focus();
                syncStep2FormFromState();
            });
        }

        if (linkInput) {
            linkInput.addEventListener('input', function () {
                wizardState.testingLink = String(linkInput.value || '');
                wizardState.linkConfirmed = false;
                if (wizardState.prefillProject) wizardState.prefillStep2Active = false;
                clearLinkError();
                updateLinkVerificationUI();
                syncStep2FormFromState();
            });
        }

        var prefillBadgeStep2 = document.getElementById('gtw-prefill-badge-step2');
        if (prefillBadgeStep2) {
            prefillBadgeStep2.addEventListener('click', function () {
                setPrefillStep2Active(!wizardState.prefillStep2Active);
                syncStep2FormFromState();
            });
        }

        var linkConfirm = document.getElementById('gtw-link-confirm-checkbox');
        if (linkConfirm) {
            linkConfirm.addEventListener('change', function () {
                wizardState.linkConfirmed = !!linkConfirm.checked;
                var warningStep2 = document.getElementById('gtw-link-confirm-warning');
                if (warningStep2) warningStep2.style.display = 'none';
                updateLinkVerificationUI();
            });
        }

        ['email', 'countries', 'review'].forEach(function (key) {
            var box = document.getElementById('gtw-check-console-' + key);
            if (box) {
                box.addEventListener('change', function () {
                    wizardState.consoleChecklist[key] = !!box.checked;
                    clearLinkError();
                });
            }
        });

        var accordionHead = document.getElementById('gtw-step2-accordion-head');
        if (accordionHead) {
            accordionHead.addEventListener('click', toggleStep2InstructionsAccordion);
        }

        var cardCopyBtn = document.getElementById('gtw-card-copy-btn');
        if (cardCopyBtn) {
            cardCopyBtn.addEventListener('click', function () {
                copyTextWithFeedback(TESTER_GROUP_EMAIL, cardCopyBtn);
            });
        }

        var generalGuideCard = document.getElementById('gtw-general-testing-guide');
        if (generalGuideCard) {
            generalGuideCard.addEventListener('click', handleOpenGeneralTestingGuide);
        }

        var paymentBtn = document.getElementById('gtw-proceed-payment-btn');
        if (paymentBtn) {
            paymentBtn.addEventListener('click', handleProceedToPayment);
        }
    }

    function bindPaymentEvents() {
        var backBtn = document.getElementById('gtw-payment-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardPayment();
                showGuaranteedTestWizardStep2();
            });
        }

        var cryptoCard = document.getElementById('gtw-method-crypto');
        var paypalCard = document.getElementById('gtw-method-paypal');
        var rubCard = document.getElementById('gtw-method-rub');

        if (cryptoCard) {
            cryptoCard.addEventListener('click', function (e) {
                if (e.target.closest('.gtw-exchange-pick-row')) return;
                selectPaymentMethod('crypto');
            });
        }
        if (paypalCard) {
            paypalCard.addEventListener('click', function () {
                selectPaymentMethod('paypal');
                openPaymentFlow('paypal');
            });
        }
        if (rubCard) {
            rubCard.addEventListener('click', function () {
                selectPaymentMethod('rub');
                openPaymentFlow('rub');
            });
        }

        var exchangeRows = document.querySelectorAll('.gtw-exchange-pick-row');
        exchangeRows.forEach(function (row) {
            row.addEventListener('click', function (e) {
                e.stopPropagation();
                var exchangeId = row.getAttribute('data-exchange');
                selectPaymentMethod('crypto');
                wizardState.paymentExchange = exchangeId;
                openPaymentFlow('crypto', exchangeId);
            });
        });

        var payBtn = document.getElementById('gtw-pay-btn');
        if (payBtn) {
            payBtn.addEventListener('click', function () {
                if (wizardState.paymentMethod === 'crypto' && wizardState.paymentExchange) {
                    openPaymentFlow('crypto', wizardState.paymentExchange);
                }
            });
        }

        var flowOverlay = document.getElementById('gtw-payment-flow-overlay');
        if (flowOverlay) {
            flowOverlay.addEventListener('click', function (e) {
                if (e.target === flowOverlay) closePaymentFlow();
            });
        }
    }

    /* =========================================================
       PAYMENT FLOW (stepper like play review)
       ========================================================= */

    function getExchangeById(id) {
        return CRYPTO_EXCHANGES.find(function (ex) { return ex.id === id; }) || null;
    }

    function resetPaymentFlowState() {
        wizardState.paymentStep1Done = false;
        wizardState.paymentScreenshotUrl = '';
        wizardState.paymentScreenshotFile = null;
    }

    function openPaymentFlow(method, exchangeId) {
        wizardState.paymentMethod = method;
        if (method === 'crypto') {
            wizardState.paymentExchange = exchangeId || wizardState.paymentExchange;
        }
        resetPaymentFlowState();
        renderPaymentFlow();
        var overlay = document.getElementById('gtw-payment-flow-overlay');
        if (overlay) {
            overlay.classList.add('is-open');
            overlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closePaymentFlow() {
        var overlay = document.getElementById('gtw-payment-flow-overlay');
        if (overlay) {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
        }
    }

    function markPaymentStep1Done() {
        wizardState.paymentStep1Done = true;
        renderPaymentFlow();
    }

    function renderPaymentFlow() {
        var sheet = document.getElementById('gtw-payment-flow-sheet');
        if (!sheet) return;

        var method = wizardState.paymentMethod;
        var amount = getPaymentAmount(method);
        var step1Done = !!wizardState.paymentStep1Done;
        var step2Done = !!wizardState.paymentScreenshotUrl;
        var step1Class = step1Done ? 'is-done' : 'is-active';
        var step2Class = step2Done ? 'is-done' : (step1Done ? 'is-active' : 'is-locked');
        var step1Num = step1Done
            ? '<svg class="step-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '1';
        var step2Num = step2Done
            ? '<svg class="step-check-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
            : '2';

        var title = 'Payment';
        var subtitle = 'Complete the steps below, then submit your order.';
        var step1Title = '';
        var step1Desc = '';
        var step1Actions = '';

        if (method === 'crypto') {
            var exchange = getExchangeById(wizardState.paymentExchange);
            var exName = exchange ? exchange.name : 'Exchange';
            title = 'Crypto Transfer — ' + exName;
            subtitle = 'Send $' + amount + ' via internal transfer on ' + exName + '.';
            step1Title = 'Internal transfer on ' + exName;
            step1Desc = 'Copy the ' + (exchange ? exchange.label : 'ID') + ' below and send an internal transfer inside ' + exName + ' (not on-chain).';
            if (exchange) {
                step1Actions = `
                    <div class="gtw-credential-row">
                        <div class="gtw-credential-icon-wrap">
                            <img src="${exchange.logo}" alt="${exchange.name}" class="gtw-exchange-logo" onerror="this.style.display='none'; this.parentNode.classList.add('is-fallback'); this.parentNode.textContent='${exchange.initials}';" />
                        </div>
                        <div class="gtw-credential-box">
                            <span class="gtw-credential-value">${exchange.label}: ${exchange.value}</span>
                            <button type="button" class="gtw-copy-action-btn" id="gtw-flow-copy-btn">Copy</button>
                        </div>
                    </div>
                `;
            }
        } else if (method === 'paypal') {
            title = 'PayPal Transfer';
            subtitle = 'Send $' + amount + ' to our PayPal account.';
            step1Title = 'Copy PayPal email & pay';
            step1Desc = 'Copy the email, then open PayPal and complete the payment.';
            step1Actions = `
                <div class="gtw-credential-box">
                    <span class="gtw-credential-value">${PAYPAL_EMAIL}</span>
                    <button type="button" class="gtw-copy-action-btn" id="gtw-flow-copy-btn">Copy</button>
                </div>
                <button type="button" class="gtw-open-external-btn" id="gtw-flow-open-paypal-btn">
                    <span>Open PayPal</span>
                    <svg class="gtw-external-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </button>
            `;
        } else if (method === 'rub') {
            title = 'RUB Transfer';
            subtitle = 'Send $' + amount + ' equivalent via RUB transfer.';
            step1Title = 'Get transfer details';
            step1Desc = 'Open Telegram support to receive RUB transfer details, then return here.';
            step1Actions = `
                <button type="button" class="gtw-open-external-btn" id="gtw-flow-open-tg-btn">
                    Open @${TELEGRAM_SUPPORT}
                </button>
            `;
        }

        var uploadHtml = '';
        if (step2Done) {
            uploadHtml = `
                <div class="play-review-screenshot-preview">
                    <div class="preview-success-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div class="preview-info">
                        <div class="preview-title">Screenshot uploaded</div>
                        <div class="preview-subtitle">Tap ✕ to replace</div>
                    </div>
                    <button type="button" class="preview-remove-btn" id="gtw-flow-remove-screenshot">✕</button>
                </div>
            `;
        } else {
            var lockedClass = step1Done ? '' : ' is-locked';
            uploadHtml = `
                <div class="play-review-upload-zone${lockedClass}" id="gtw-flow-upload-zone">
                    <input type="file" id="gtw-flow-file" accept="image/*" style="display: none;">
                    <div class="upload-zone-content">
                        <svg class="upload-zone-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span class="upload-zone-text">Upload payment screenshot</span>
                    </div>
                </div>
            `;
        }

        var canSubmit = step1Done && step2Done;

        sheet.innerHTML = `
            <h2 class="gtw-payment-flow-title">${title}</h2>
            <p class="gtw-payment-flow-subtitle">${subtitle}</p>

            <div class="play-review-steps">
                <div class="review-step step-1 ${step1Class}">
                    <div class="review-step-num-container">
                        <div class="review-step-line"></div>
                        <div class="review-step-num">${step1Num}</div>
                    </div>
                    <div class="review-step-content">
                        <div class="review-step-title">${step1Title}</div>
                        <div class="review-step-desc">${step1Desc}</div>
                        ${step1Actions}
                    </div>
                </div>

                <div class="review-step step-2 ${step2Class}">
                    <div class="review-step-num-container">
                        <div class="review-step-num">${step2Num}</div>
                    </div>
                    <div class="review-step-content">
                        <div class="review-step-title">Upload payment screenshot</div>
                        <div class="review-step-desc">Attach proof of your completed transfer.</div>
                        ${uploadHtml}
                    </div>
                </div>
            </div>

            <div class="gtw-payment-flow-footer">
                <button type="button" class="gtw-continue-btn" id="gtw-flow-submit-btn" ${canSubmit ? '' : 'disabled'}>
                    SUBMIT ORDER ($${amount})
                </button>
                <button type="button" class="gtw-payment-flow-cancel" id="gtw-flow-cancel-btn">Cancel</button>
            </div>
        `;

        bindPaymentFlowEvents();
    }

    function bindPaymentFlowEvents() {
        var copyBtn = document.getElementById('gtw-flow-copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', function () {
                var textToCopy = PAYPAL_EMAIL;
                if (wizardState.paymentMethod === 'crypto') {
                    var exchange = getExchangeById(wizardState.paymentExchange);
                    if (exchange) textToCopy = exchange.value;
                }
                copyTextWithFeedback(textToCopy, copyBtn);
                if (wizardState.paymentMethod === 'crypto') {
                    markPaymentStep1Done();
                    handleCryptoCopyExitHint();
                }
            });
        }

        var openPaypalBtn = document.getElementById('gtw-flow-open-paypal-btn');
        if (openPaypalBtn) {
            openPaypalBtn.addEventListener('click', function () {
                openExternalUrl(PAYPAL_OPEN_URL);
                markPaymentStep1Done();
            });
        }

        var openTgBtn = document.getElementById('gtw-flow-open-tg-btn');
        if (openTgBtn) {
            openTgBtn.addEventListener('click', function () {
                openTelegramContact('RUB payment details requested for guaranteed testing order');
                markPaymentStep1Done();
            });
        }

        var uploadZone = document.getElementById('gtw-flow-upload-zone');
        var fileInput = document.getElementById('gtw-flow-file');
        if (uploadZone && fileInput && wizardState.paymentStep1Done) {
            uploadZone.addEventListener('click', function () {
                fileInput.click();
            });
            fileInput.addEventListener('change', function () {
                var file = fileInput.files && fileInput.files[0];
                if (!file) return;
                wizardState.paymentScreenshotFile = file;
                wizardState.paymentScreenshotUrl = URL.createObjectURL(file);
                renderPaymentFlow();
            });
        }

        var removeBtn = document.getElementById('gtw-flow-remove-screenshot');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                wizardState.paymentScreenshotFile = null;
                wizardState.paymentScreenshotUrl = '';
                renderPaymentFlow();
            });
        }

        var cancelBtn = document.getElementById('gtw-flow-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', closePaymentFlow);

        var submitBtn = document.getElementById('gtw-flow-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', function () {
                handleExecutePayment();
            });
        }
    }

    /* =========================================================
       HANDLERS & CONTROLLERS
       ========================================================= */

    function handleTapFreeApp() {
        wizardState.appType = 'free';
        wizardState.licenseTestingConfirmed = false;
        closeLicenseTestingModal();
        hideInlineLicenseTestingBlock();
        updateTypeSelectorUI('free');
    }

    function handleTapPaidApp() {
        openLicenseTestingModal();
    }

    function openLicenseTestingModal() {
        var modalOverlay = document.getElementById('gtw-license-modal-overlay');
        if (modalOverlay) modalOverlay.style.display = 'flex';
    }

    function closeLicenseTestingModal() {
        var modalOverlay = document.getElementById('gtw-license-modal-overlay');
        if (modalOverlay) modalOverlay.style.display = 'none';
    }

    function handleCancelLicenseTesting() {
        closeLicenseTestingModal();
        wizardState.appType = 'free';
        wizardState.licenseTestingConfirmed = false;
        hideInlineLicenseTestingBlock();
        updateTypeSelectorUI('free');
    }

    function handleConfirmLicenseTesting() {
        closeLicenseTestingModal();
        wizardState.appType = 'paid';
        wizardState.licenseTestingConfirmed = true;
        showInlineLicenseTestingBlock();
        updateTypeSelectorUI('paid');
    }

    function showInlineLicenseTestingBlock() {
        var inlineBlock = document.getElementById('gtw-inline-license-block');
        if (inlineBlock) inlineBlock.style.display = 'block';
    }

    function hideInlineLicenseTestingBlock() {
        var inlineBlock = document.getElementById('gtw-inline-license-block');
        if (inlineBlock) inlineBlock.style.display = 'none';
    }

    function updateTypeSelectorUI(type) {
        var freeCard = document.getElementById('gtw-type-free');
        var paidCard = document.getElementById('gtw-type-paid');

        if (freeCard) {
            freeCard.classList.toggle('selected-free', type === 'free');
            freeCard.classList.remove('selected-paid');
        }
        if (paidCard) {
            paidCard.classList.toggle('selected-paid', type === 'paid');
            paidCard.classList.remove('selected-free');
        }
    }

    function clearAppnameError() {
        var helper = document.getElementById('gtw-appname-helper');
        if (helper) {
            helper.textContent = 'Please enter your app name.';
            helper.classList.remove('error');
        }
    }

    function handleStep1Continue() {
        var input = document.getElementById('gtw-app-name-input');
        var appName = String(input ? input.value : '').trim();

        if (!appName) {
            var helper = document.getElementById('gtw-appname-helper');
            if (helper) {
                helper.textContent = '⚠️ App name is required to continue.';
                helper.classList.add('error');
            }
            if (input) input.focus();
            return;
        }

        if (wizardState.prefillProject && wizardState.prefillStep1Active && !wizardState.detailsConfirmed) {
            var warningStep1 = document.getElementById('gtw-details-confirm-warning');
            if (warningStep1) warningStep1.style.display = 'inline';
            return;
        }

        if (wizardState.appType === 'paid' && !wizardState.licenseTestingConfirmed) {
            openLicenseTestingModal();
            return;
        }

        wizardState.appName = appName;
        wizardState.step = 2;

        hideGuaranteedTestWizardStep1();
        showGuaranteedTestWizardStep2();
    }

    function clearLinkError() {
        var helper = document.getElementById('gtw-link-helper');
        if (helper) {
            helper.textContent = 'Paste the "Join on Android" link you copied from Play Console.';
            helper.classList.remove('error');
        }
    }

    function updateLinkVerificationUI() {
        var linkInput = document.getElementById('gtw-link-input');
        var clearBtn = document.getElementById('gtw-clear-link-btn');
        var block = document.getElementById('gtw-link-verification');
        var urlEl = document.getElementById('gtw-link-verification-url');
        var raw = String(linkInput ? linkInput.value : '').trim();
        var normalized = normalizeTestingLink(raw);

        if (clearBtn) clearBtn.style.display = raw ? 'flex' : 'none';

        if (block && urlEl) {
            if (raw && isValidTestingLink(normalized)) {
                urlEl.textContent = normalized;
                block.style.display = 'block';
            } else {
                urlEl.textContent = '';
                block.style.display = 'none';
            }
            block.classList.toggle('is-confirmed', !!wizardState.linkConfirmed);
        }
    }

    function handleProceedToPayment() {
        var linkInput = document.getElementById('gtw-link-input');
        var link = normalizeTestingLink(String(linkInput ? linkInput.value : '').trim());

        if (!link) {
            var helperEmpty = document.getElementById('gtw-link-helper');
            if (helperEmpty) {
                helperEmpty.textContent = '⚠️ Testing link is required to proceed.';
                helperEmpty.classList.add('error');
            }
            updateLinkVerificationUI();
            if (linkInput) linkInput.focus();
            return;
        }

        if (!isValidTestingLink(link)) {
            var helperInvalid = document.getElementById('gtw-link-helper');
            if (helperInvalid) {
                helperInvalid.textContent = '⚠️ Enter a valid Play Console testing link (play.google.com/apps/testing/…).';
                helperInvalid.classList.add('error');
            }
            updateLinkVerificationUI();
            if (linkInput) linkInput.focus();
            return;
        }

        if (wizardState.prefillProject && wizardState.prefillStep2Active && !wizardState.linkConfirmed) {
            var warningStep2 = document.getElementById('gtw-link-confirm-warning');
            if (warningStep2) warningStep2.style.display = 'inline';
            return;
        }

        if (shouldShowProjectConsoleChecklist()) {
            var checklist = wizardState.consoleChecklist || {};
            if (!checklist.email || !checklist.countries || !checklist.review) {
                var helperChecklist = document.getElementById('gtw-link-helper');
                if (helperChecklist) {
                    helperChecklist.textContent = '⚠️ Please confirm all Play Console setup checkboxes, including the standard DevTestHub Google Group.';
                    helperChecklist.classList.add('error');
                }
                return;
            }
        }

        if (linkInput) linkInput.value = link;
        wizardState.testingLink = link;
        updateLinkVerificationUI();

        hideGuaranteedTestWizardStep2();
        showGuaranteedTestWizardPayment();
    }

    function selectPaymentMethod(method) {
        wizardState.paymentMethod = method;

        var cryptoCard = document.getElementById('gtw-method-crypto');
        var paypalCard = document.getElementById('gtw-method-paypal');
        var rubCard = document.getElementById('gtw-method-rub');
        var payBtn = document.getElementById('gtw-pay-btn');

        if (cryptoCard) {
            cryptoCard.classList.toggle('selected', method === 'crypto');
            cryptoCard.classList.toggle('selected-crypto', method === 'crypto');
        }
        if (paypalCard) paypalCard.classList.toggle('selected', method === 'paypal');
        if (rubCard) rubCard.classList.toggle('selected', method === 'rub');

        if (payBtn) {
            if (method === 'crypto') {
                payBtn.disabled = !wizardState.paymentExchange;
                payBtn.textContent = wizardState.paymentExchange ? 'CONTINUE WITH EXCHANGE' : 'SELECT EXCHANGE';
            } else {
                payBtn.disabled = false;
                payBtn.textContent = 'OPEN PAYMENT STEPS ($' + getPaymentAmount(method) + ')';
            }
        }
    }

    function handleExecutePayment() {
        submitGuaranteedOrderAndOpenTelegram().catch(function () {});
    }

    async function uploadPaymentScreenshot() {
        var file = wizardState.paymentScreenshotFile;
        if (!file) return '';

        var apiBase = (typeof API_BASE !== 'undefined' ? API_BASE : '') || (window.App && window.App.API_BASE) || '';
        var formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', String((window.App && window.App.userId) || window.userId || 0));
        if (typeof withInitData === 'function') {
            var payload = withInitData({});
            formData.append('init_data', payload.init_data || '');
        } else if (typeof getTelegramInitDataRaw === 'function') {
            formData.append('init_data', getTelegramInitDataRaw());
        }

        try {
            var resp = await fetch(apiBase + '/upload-icon', {
                method: 'POST',
                body: formData
            });
            var data = await resp.json();
            if (data && data.status === 'success' && data.url) {
                return String(data.url);
            }
        } catch (e) {
            console.error('Payment screenshot upload failed:', e);
        }
        return '';
    }

    async function submitGuaranteedOrderAndOpenTelegram() {
        var method = wizardState.paymentMethod;
        if (!method) return;

        var submitBtn = document.getElementById('gtw-flow-submit-btn');
        var originalBtnText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'PROCESSING...';
        }

        try {
            var amountUsd = getPaymentAmount(method);
            var proofUrl = await uploadPaymentScreenshot();
            var exchange = getExchangeById(wizardState.paymentExchange);
            var notesParts = [];
            if (wizardState.prefillProject && wizardState.prefillProject.id) {
                notesParts.push('app_id=' + String(wizardState.prefillProject.id));
                var pkg = String(wizardState.prefillProject.package || wizardState.prefillProject.package_name || '').trim();
                if (pkg) notesParts.push('package=' + pkg);
            }
            if (exchange) notesParts.push('exchange=' + exchange.name);
            if (proofUrl) notesParts.push('proof=' + proofUrl);

            var response = await fetch((typeof API_BASE !== 'undefined' ? API_BASE : '') + '/guaranteed-test-orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withInitData({
                    app_name: wizardState.appName,
                    app_type: wizardState.appType,
                    testing_link: wizardState.testingLink,
                    payment_method: method,
                    amount_usd: amountUsd,
                    notes: notesParts.length ? notesParts.join('; ') : null
                }))
            });
            var payload = {};
            try {
                payload = await response.json();
            } catch (_) {}
            if (!response.ok || payload.status === 'error') {
                throw new Error((payload && (payload.code || payload.detail || payload.message)) || 'order_create_failed');
            }

            var order = payload.order || {};
            var publicCode = String(order.public_code || ('GT-' + (10000 + Number(order.id || 0))));
            if (typeof window.invalidateGuaranteedOrdersCache === 'function') {
                window.invalidateGuaranteedOrdersCache();
            }

            closePaymentFlow();
            hideGuaranteedTestWizardPayment();
            hideGuaranteedTestWizardStep2();
            hideGuaranteedTestWizardStep1();
            if (typeof showToast === 'function') {
                showToast('Order ' + publicCode + ' submitted. Check Telegram for confirmation.');
            }
        } catch (error) {
            console.error('Guaranteed order submit failed:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to create order. Please try again.');
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText || 'SUBMIT ORDER';
            }
        }
    }

    function openTelegramContact(text) {
        var targetUrl = 'https://t.me/' + TELEGRAM_SUPPORT + '?text=' + encodeURIComponent(text);
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    }

    function handleOpenLicenseSetupGuide() {
        openLicenseGuideModal();
    }

    function handleOpenGeneralTestingGuide() {
        openExternalUrl(GENERAL_TESTING_GUIDE_URL);
    }

    function openExternalUrl(url) {
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openLink === 'function') {
            window.Telegram.WebApp.openLink(url);
        } else {
            window.open(url, '_blank');
        }
    }

    function copyTextWithFeedback(text, btnEl) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (btnEl) {
                    var originalText = btnEl.textContent;
                    btnEl.textContent = 'Copied!';
                    btnEl.style.color = '#30D158';
                    setTimeout(function () {
                        btnEl.textContent = originalText;
                        btnEl.style.color = '';
                    }, 1500);
                }
            }).catch(function () {});
        }
    }

    function handleCryptoCopyExitHint() {
        var exchange = getExchangeById(wizardState.paymentExchange);
        var exName = exchange ? exchange.name : 'selected exchange';
        if (typeof showToast === 'function') {
            showToast('Copied. Make transfer in ' + exName + ', then return and upload screenshot.');
        }
        try {
            var tg = window.Telegram && window.Telegram.WebApp;
            if (tg && typeof tg.showPopup === 'function') {
                tg.showPopup({
                    title: 'Transfer in ' + exName,
                    message: 'ID copied. Please complete transfer inside ' + exName + ' and come back to upload payment screenshot.',
                    buttons: [
                        { id: 'later', type: 'cancel', text: 'Stay here' },
                        { id: 'close', type: 'default', text: 'Go to Telegram' }
                    ]
                }, function (buttonId) {
                    if (buttonId === 'close' && typeof tg.close === 'function') {
                        if (typeof tg.openTelegramLink === 'function') {
                            try { tg.openTelegramLink('https://t.me/saved'); } catch (_) {}
                        }
                        tg.close();
                    }
                });
            } else if (tg && typeof tg.close === 'function') {
                tg.close();
            }
        } catch (_) {}
    }

    function resolveProjectById(projectId) {
        if (!projectId) return null;
        var projects = (typeof myProjects !== 'undefined' ? myProjects : []) || [];
        return projects.find(function (p) { return Number(p.id) === Number(projectId); }) || null;
    }

    /* =========================================================
       PUBLIC EXPORTS & DISPLAY CONTROLLERS
       ========================================================= */

    function showGuaranteedTestWizardStep1(options) {
        options = options || {};
        if (typeof window.hideGuaranteedTestOfferModal === 'function') {
            window.hideGuaranteedTestOfferModal();
        }

        if (!options.keepState) {
            resetWizardState(false);
        }

        if (options.projectId) {
            var project = resolveProjectById(options.projectId);
            if (project) applyProjectPrefill(project);
        }

        ensureWizardInDOM();
        syncStep1FormFromState();
        syncStep2FormFromState();

        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep1() {
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'none';
    }

    function showGuaranteedTestWizardStep2() {
        ensureWizardInDOM();
        syncStep2FormFromState();
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep2() {
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'none';
    }

    function showGuaranteedTestWizardPayment() {
        ensureWizardInDOM();
        wizardState.paymentMethod = null;
        wizardState.paymentExchange = null;
        var payBtn = document.getElementById('gtw-pay-btn');
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = 'SELECT PAYMENT METHOD';
        }
        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (overlayPay) overlayPay.style.display = 'flex';
    }

    function hideGuaranteedTestWizardPayment() {
        closePaymentFlow();
        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (overlayPay) overlayPay.style.display = 'none';
    }

    window.showGuaranteedTestWizardStep1 = showGuaranteedTestWizardStep1;
    window.hideGuaranteedTestWizardStep1 = hideGuaranteedTestWizardStep1;
    window.showGuaranteedTestWizardStep2 = showGuaranteedTestWizardStep2;
    window.hideGuaranteedTestWizardStep2 = hideGuaranteedTestWizardStep2;
    window.showGuaranteedTestWizardPayment = showGuaranteedTestWizardPayment;
    window.hideGuaranteedTestWizardPayment = hideGuaranteedTestWizardPayment;
    window.gtwWizardState = wizardState;
})();
