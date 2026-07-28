/* =========================================================
   GUARANTEED CLOSED TEST WIZARD - 3-SCREEN MODULE
   Step 1 of 2: App Details
   Step 2 of 2: Testing Link
   Final Step: Payment
   ========================================================= */

(function () {
    'use strict';

    var SETUP_LICENSE_GUIDE_URL = "https://t.me/googleplay_console_12testers/31/2885";
    var GENERAL_TESTING_GUIDE_URL = "https://telegra.ph/Action-Required-Add-Testing-Group-to-Start-Closed-Testing-06-04";
    var TESTER_GROUP_EMAIL = "closedtesthelp@googlegroups.com";
    var PAYPAL_EMAIL = "pay.hubstation@gmail.com";
    var TELEGRAM_SUPPORT = "garantxchange";

    var wizardState = {
        step: 1,
        appName: '',
        appType: 'free', // 'free' or 'paid'
        licenseTestingConfirmed: false,
        testingLink: '',
        paymentMethod: null // 'crypto', 'paypal', 'rub'
    };

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
                <h1 class="gtw-header-title">App Details</h1>
                <p class="gtw-header-subtitle">STEP 1 OF 2</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step active"></div>
                    <div class="gtw-progress-step inactive"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-app-name-input">APP NAME (REQUIRED)</label>
                    <div class="gtw-input-wrapper">
                        <input type="text" id="gtw-app-name-input" class="gtw-input" placeholder="e.g. FitTrack Pro" autocomplete="off" />
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

                    <!-- INLINE SETUP LICENSE TESTING CARD -->
                    <div id="gtw-inline-license-block" class="gtw-inline-card" style="display: none;">
                        <h3 class="gtw-inline-title">Setup License Testing</h3>
                        <p class="gtw-inline-subtitle">This configuration allows testers to download your paid app for free.</p>
                        <p class="gtw-inline-desc">
                            Testers cannot install paid apps for free unless they are added to <strong>License Testing</strong>. This allows our team to download and test your app without creating a sale.
                        </p>
                        <ul class="gtw-inline-list">
                            <li>Go to <strong>Settings &rarr; License testing</strong></li>
                            <li>Select <strong>Google Groups</strong> as tester type</li>
                            <li>Add <strong>ClosedTestHelp@googlegroups.com</strong></li>
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
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-step1-continue-btn">CONTINUE</button>
                </div>
            </div>

            <!-- MODAL: SETUP LICENSE TESTING -->
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

    /* =========================================================
       STEP 2 OF 2 HTML (Testing Link)
       ========================================================= */

    function createWizardStep2HTML() {
        return `
        <div id="guaranteed-test-wizard-step2-overlay" class="gtw-overlay" style="display: none;">
            <div class="gtw-header">
                <button type="button" class="gtw-back-btn" id="gtw-step2-back-btn" aria-label="Back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 class="gtw-header-title">Testing Link</h1>
                <p class="gtw-header-subtitle">STEP 2 OF 2</p>
                <div class="gtw-progress-bar">
                    <div class="gtw-progress-step inactive"></div>
                    <div class="gtw-progress-step active"></div>
                </div>
            </div>

            <div class="gtw-body">
                <div class="gtw-form-group">
                    <label class="gtw-label" for="gtw-link-input">PASTE YOUR TESTING LINK</label>
                    <div class="gtw-input-wrapper">
                        <input type="url" id="gtw-link-input" class="gtw-input" placeholder="https://play.google.com/apps/testing/com.example.app" autocomplete="off" />
                        <button type="button" class="gtw-paste-btn" id="gtw-paste-link-btn" title="Paste from clipboard">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            </svg>
                        </button>
                    </div>
                    <div class="gtw-helper-text" id="gtw-link-helper">Paste the "Join on Android" link you copied from Play Console.</div>
                </div>

                <div class="gtw-instructions-list">
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
                <h1 class="gtw-header-title">Payment</h1>
                <p class="gtw-header-subtitle">FINAL STEP</p>
            </div>

            <div class="gtw-body">
                <!-- PLAN CARD -->
                <div class="gtw-plan-card">
                    <div class="gtw-plan-label">YOUR TESTING PLAN</div>
                    <h2 class="gtw-plan-title">Production Access Sprint</h2>
                    <div class="gtw-plan-price-row">
                        <span class="gtw-plan-price">$20</span>
                        <span class="gtw-plan-subtitle">one-time payment</span>
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
                        <div class="gtw-feature-item">
                            <svg class="gtw-feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span><strong>Extended testing</strong> when Google needs more time</span>
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

                <!-- PAYMENT METHOD SELECTION -->
                <div class="gtw-form-group">
                    <label class="gtw-label">CHOOSE PAYMENT METHOD</label>
                    <div class="gtw-payment-methods">

                        <!-- METHOD 1: CRYPTO -->
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
                            <div class="gtw-method-details">
                                <p class="gtw-method-desc">Send the payment via internal transfer on any supported exchange. Use the ID/UID below and then tap Pay.</p>
                                <div class="gtw-exchanges-list">
                                    <!-- Binance -->
                                    <div class="gtw-exchange-row">
                                        <div class="gtw-exchange-left">
                                            <div class="gtw-exchange-icon">BN</div>
                                            <div class="gtw-exchange-meta">
                                                <span class="gtw-exchange-name">Binance</span>
                                                <span class="gtw-exchange-id">ID: 967321648</span>
                                            </div>
                                        </div>
                                        <button type="button" class="gtw-row-copy-btn" data-copy="967321648">Copy</button>
                                    </div>
                                    <!-- ByBit -->
                                    <div class="gtw-exchange-row">
                                        <div class="gtw-exchange-left">
                                            <div class="gtw-exchange-icon">BY</div>
                                            <div class="gtw-exchange-meta">
                                                <span class="gtw-exchange-name">ByBit</span>
                                                <span class="gtw-exchange-id">UID: 30291060</span>
                                            </div>
                                        </div>
                                        <button type="button" class="gtw-row-copy-btn" data-copy="30291060">Copy</button>
                                    </div>
                                    <!-- OKX -->
                                    <div class="gtw-exchange-row">
                                        <div class="gtw-exchange-left">
                                            <div class="gtw-exchange-icon">OK</div>
                                            <div class="gtw-exchange-meta">
                                                <span class="gtw-exchange-name">OKX</span>
                                                <span class="gtw-exchange-id">UID: 323906492761830368</span>
                                            </div>
                                        </div>
                                        <button type="button" class="gtw-row-copy-btn" data-copy="323906492761830368">Copy</button>
                                    </div>
                                    <!-- HTX -->
                                    <div class="gtw-exchange-row">
                                        <div class="gtw-exchange-left">
                                            <div class="gtw-exchange-icon">HT</div>
                                            <div class="gtw-exchange-meta">
                                                <span class="gtw-exchange-name">HTX</span>
                                                <span class="gtw-exchange-id">UID: 442101593</span>
                                            </div>
                                        </div>
                                        <button type="button" class="gtw-row-copy-btn" data-copy="442101593">Copy</button>
                                    </div>
                                    <!-- Gate -->
                                    <div class="gtw-exchange-row">
                                        <div class="gtw-exchange-left">
                                            <div class="gtw-exchange-icon">GT</div>
                                            <div class="gtw-exchange-meta">
                                                <span class="gtw-exchange-name">Gate</span>
                                                <span class="gtw-exchange-id">UID: 8536355</span>
                                            </div>
                                        </div>
                                        <button type="button" class="gtw-row-copy-btn" data-copy="8536355">Copy</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- METHOD 2: PAYPAL -->
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
                            <div class="gtw-method-details">
                                <p class="gtw-method-desc">Send the payment to the PayPal address below.</p>
                                <div class="gtw-copy-box">
                                    <span class="gtw-copy-email">${PAYPAL_EMAIL}</span>
                                    <button type="button" class="gtw-copy-btn" id="gtw-paypal-copy-btn" title="Copy PayPal email">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- METHOD 3: RUB TRANSFER -->
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
                                <span class="gtw-method-price">$22</span>
                            </div>
                            <div class="gtw-method-details">
                                <p class="gtw-method-desc">For RUB payments, continue in Telegram to get transfer details.</p>
                                <button type="button" class="gtw-open-tg-btn" id="gtw-rub-tg-btn">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <line x1="22" y1="2" x2="11" y2="13"></line>
                                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                    </svg>
                                    <span>Open @${TELEGRAM_SUPPORT}</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <div class="gtw-fixed-footer">
                <div class="gtw-footer-content">
                    <button type="button" class="gtw-continue-btn" id="gtw-pay-btn" disabled>PAY $20</button>
                </div>
            </div>
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
            document.body.appendChild(divPay.firstElementChild);
            bindPaymentEvents();
        }
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
                            clearAppnameError();
                        }
                    }).catch(function () {});
                }
            });
        }

        if (input) input.addEventListener('input', clearAppnameError);

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

    function bindStep2Events() {
        var backBtn = document.getElementById('gtw-step2-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function () {
                hideGuaranteedTestWizardStep2();
                showGuaranteedTestWizardStep1();
            });
        }

        var pasteLinkBtn = document.getElementById('gtw-paste-link-btn');
        var linkInput = document.getElementById('gtw-link-input');
        if (pasteLinkBtn && linkInput) {
            pasteLinkBtn.addEventListener('click', function () {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(function (text) {
                        if (text) {
                            linkInput.value = text.trim();
                            clearLinkError();
                        }
                    }).catch(function () {});
                }
            });
        }

        if (linkInput) linkInput.addEventListener('input', clearLinkError);

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

        if (cryptoCard) cryptoCard.addEventListener('click', function () { selectPaymentMethod('crypto'); });
        if (paypalCard) paypalCard.addEventListener('click', function () { selectPaymentMethod('paypal'); });
        if (rubCard) rubCard.addEventListener('click', function () { selectPaymentMethod('rub'); });

        var paypalCopyBtn = document.getElementById('gtw-paypal-copy-btn');
        if (paypalCopyBtn) {
            paypalCopyBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                copyTextWithFeedback(PAYPAL_EMAIL, paypalCopyBtn);
            });
        }

        var rubTgBtn = document.getElementById('gtw-rub-tg-btn');
        if (rubTgBtn) {
            rubTgBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openTelegramContact("RUB Payment details requested");
            });
        }

        // Exchange Row Copy Buttons
        var rowCopyBtns = document.querySelectorAll('.gtw-row-copy-btn');
        rowCopyBtns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var textToCopy = btn.getAttribute('data-copy');
                if (textToCopy) {
                    copyTextWithFeedback(textToCopy, btn);
                }
            });
        });

        var payBtn = document.getElementById('gtw-pay-btn');
        if (payBtn) {
            payBtn.addEventListener('click', handleExecutePayment);
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

    function handleProceedToPayment() {
        var linkInput = document.getElementById('gtw-link-input');
        var link = String(linkInput ? linkInput.value : '').trim();

        if (!link) {
            var helper = document.getElementById('gtw-link-helper');
            if (helper) {
                helper.textContent = '⚠️ Testing link is required to proceed.';
                helper.classList.add('error');
            }
            if (linkInput) linkInput.focus();
            return;
        }

        wizardState.testingLink = link;

        hideGuaranteedTestWizardStep2();
        showGuaranteedTestWizardPayment();
    }

    function selectPaymentMethod(method) {
        wizardState.paymentMethod = method;

        var cryptoCard = document.getElementById('gtw-method-crypto');
        var paypalCard = document.getElementById('gtw-method-paypal');
        var rubCard = document.getElementById('gtw-method-rub');
        var payBtn = document.getElementById('gtw-pay-btn');

        if (cryptoCard) cryptoCard.classList.toggle('selected', method === 'crypto');
        if (paypalCard) paypalCard.classList.toggle('selected', method === 'paypal');
        if (rubCard) rubCard.classList.toggle('selected', method === 'rub');

        if (payBtn) {
            payBtn.disabled = false;
            if (method === 'crypto') payBtn.textContent = 'PAY $20 (CRYPTO)';
            else if (method === 'paypal') payBtn.textContent = 'PAY $23 (PAYPAL)';
            else if (method === 'rub') payBtn.textContent = 'CONTINUE IN TELEGRAM';
        }
    }

    function handleExecutePayment() {
        submitGuaranteedOrderAndOpenTelegram().catch(function () {});
    }

    async function submitGuaranteedOrderAndOpenTelegram() {
        var method = wizardState.paymentMethod;
        if (!method) {
            return;
        }

        var payBtn = document.getElementById('gtw-pay-btn');
        var originalBtnText = payBtn ? payBtn.textContent : '';
        if (payBtn) {
            payBtn.disabled = true;
            payBtn.textContent = 'PROCESSING...';
        }

        try {
            var amountUsd = 20;
            if (method === 'paypal') amountUsd = 23;
            else if (method === 'rub') amountUsd = 22;

            var response = await fetch(`${API_BASE}/guaranteed-test-orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(withInitData({
                    app_name: wizardState.appName,
                    app_type: wizardState.appType,
                    testing_link: wizardState.testingLink,
                    payment_method: method,
                    amount_usd: amountUsd
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
            var orderId = Number(order.id || 0);
            var summaryText = `Order Request (#GT-${orderId || 'NEW'}):\nApp: ${wizardState.appName}\nType: ${wizardState.appType.toUpperCase()}\nLink: ${wizardState.testingLink}\nMethod: ${String(method).toUpperCase()}\nAmount: $${amountUsd.toFixed(2)}`;
            openTelegramContact(summaryText);
        } catch (error) {
            console.error('Guaranteed order submit failed:', error);
            if (typeof showToast === 'function') {
                showToast('Failed to create order. Please try again.');
            }
            if (payBtn) {
                payBtn.disabled = false;
                payBtn.textContent = originalBtnText || 'PAY';
            }
            return;
        }
    }

    function openTelegramContact(text) {
        var targetUrl = `https://t.me/${TELEGRAM_SUPPORT}?text=${encodeURIComponent(text)}`;
        if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.openTelegramLink === 'function') {
            window.Telegram.WebApp.openTelegramLink(targetUrl);
        } else {
            window.open(targetUrl, '_blank');
        }
    }

    function handleOpenLicenseSetupGuide() {
        openExternalUrl(SETUP_LICENSE_GUIDE_URL);
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

    /* =========================================================
       PUBLIC EXPORTS & DISPLAY CONTROLLERS
       ========================================================= */

    function showGuaranteedTestWizardStep1() {
        if (typeof window.hideGuaranteedTestOfferModal === 'function') {
            window.hideGuaranteedTestOfferModal();
        }
        ensureWizardInDOM();
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep1() {
        var overlay1 = document.getElementById('guaranteed-test-wizard-step1-overlay');
        if (overlay1) overlay1.style.display = 'none';
    }

    function showGuaranteedTestWizardStep2() {
        ensureWizardInDOM();
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'flex';
    }

    function hideGuaranteedTestWizardStep2() {
        var overlay2 = document.getElementById('guaranteed-test-wizard-step2-overlay');
        if (overlay2) overlay2.style.display = 'none';
    }

    function showGuaranteedTestWizardPayment() {
        ensureWizardInDOM();
        var overlayPay = document.getElementById('guaranteed-test-wizard-payment-overlay');
        if (overlayPay) overlayPay.style.display = 'flex';
    }

    function hideGuaranteedTestWizardPayment() {
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
