window.App = window.App || {};

var tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const initData = tg.initDataUnsafe || {};
const langCode = initData.user?.language_code;
const userId = initData.user?.id || 123456789;
var API_BASE = 'https://devtest-backend.onrender.com/api';

var lang = localStorage.getItem('app_language') || (Object.keys(initData).length > 0 ? (langCode === 'ru' ? 'ru' : 'en') : 'ru');
const t = new Proxy({}, {
    get(_, key) {
        return window.t(key, {}, lang);
    }
});

var myTests = [];
var incomingOffers = [];
var myProjects = [];
var mutualSeeking = [];
var mutualPrelaunch = [];
var bountyContracts = [];
var communityEvents = null;
var eventsExpanded = false;
var activeTimerAppId = null;
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
var _pendingScreenshotReminderUsername = null;
var _contactOwnerUsername = '';
var _dropTestAppId = null;
var _overtimeTest = null;
var _syncProjectId = null;
var _socialBonusStatus = 'none';
var _earnGrantCount = 0;
var _earnGrantBust = 0;
var _earnReferralBust = 0;
var _earnExchangeBust = 0;
var _earnEarlyFinishBust = 0;
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
var _lastFetchTimes = { mutual: 0, bounty: 0 };
var MARKET_FETCH_THROTTLE_MS = 15000;
var _marketInFlight = { mutual: null, bounty: null };

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
        Array.isArray(cached.mutual.seeking) ||
        Array.isArray(cached.mutual.prelaunch) ||
        Array.isArray(cached.mutual.returns)
    );
    const hasBounty = cached.bounty && Array.isArray(cached.bounty.contracts);
    return !!(hasMutual || hasBounty);
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
    loadTasks().catch(function() {});
    loadProjects().catch(function() {});
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

function formatBustAmount(value) {
    const numeric = Number(value || 0);
    return `${numeric.toFixed(1)} $BUST`;
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
        insufficient_bust_balance: 'err_insufficient_bust_balance',
        transaction_failed: 'err_transaction_failed',
        testing_not_found: 'testing_not_found',
        feedback_not_found: 'feedback_not_found',
        feedback_forbidden: 'feedback_forbidden',
        feedback_already_processed: 'feedback_already_processed',
        feedback_media_missing: 'feedback_media_missing',
        no_reward_selected: 'no_reward_selected',
        invalid_feedback_karma_amount: 'invalid_feedback_karma_amount',
        invalid_feedback_bust_amount: 'invalid_feedback_bust_amount',
        app_archived: 'err_app_archived',
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
        offer_accept_failed: 'err_offer_accept_failed',
        offer_create_failed: 'err_offer_create_failed',
        user_not_found: 'err_user_not_found',
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
    document.getElementById('app-limit-mutual').value = '12';
    document.getElementById('app-limit-bounty').value = '12';
    document.getElementById('app-bounty-per-tester').value = '100';
    document.getElementById('edit-mode').value = 'mutual';
    document.getElementById('edit-limit-mutual').value = '12';
    document.getElementById('edit-limit-bounty').value = '12';
    document.getElementById('edit-bounty-per-tester').value = '100';
    setProjectMode('add', 'mutual');
    setProjectMode('edit', 'mutual');
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
    if (window.updateTranslations) {
        window.updateTranslations(lang);
    }

    updateProjectPricing('add');
    updateProjectPricing('edit');
    renderEditCreatedAtMeta();

    // Update language label in system menu tab
    const langLabel = document.getElementById('current-lang-label');
    if (langLabel) {
        langLabel.innerText = lang === 'ru' ? 'RU' : 'EN';
    }

    // Update active language button in segmented control
    const langBtnRu = document.getElementById('lang-btn-ru');
    const langBtnEn = document.getElementById('lang-btn-en');
    if (langBtnRu && langBtnEn) {
        langBtnRu.classList.toggle('active', lang === 'ru');
        langBtnEn.classList.toggle('active', lang === 'en');
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
}

function toggleSystemMenu() {
    const menu = document.getElementById('system-drop-menu');
    if (menu) {
        menu.classList.toggle('active');
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

function applyLanguage(newLang) {
    if (!['ru', 'en'].includes(newLang) || newLang === lang) return;
    lang = newLang;
    localStorage.setItem('app_language', lang);

    const request = `${API_BASE}/users/${userId}/language`;
    fetch(request, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang })
    }).catch(() => {});

    refreshLanguageUi();
    rerenderDynamicUi();
    refreshActiveTabData();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
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

function rerenderDynamicUi() {
    renderEvents();
    renderTests();
    renderIncomingOffers();
    renderProjects();
    renderMutualFeed();
    renderBountyFeed();
    renderArchivedProjects();
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
}

function refreshActiveTabData() {
    const activeTab = document.querySelector('.tab-content.active');
    const activeTabId = activeTab ? activeTab.id : '';

    if (activeTabId === 'tab-tests') {
        loadTasks().catch(error => console.error('Language refresh tasks error:', error));
        loadEvents().catch(error => console.error('Language refresh events error:', error));
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

async function loadTasks() {
    showSkeleton('tests-list');
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/tasks/${userId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const today = getLocalDate();
        myTests = (data.to_test_today || []).map(app => {
            let status = 'new';
            if (app.last_check_date === today) {
                status = 'done';
            } else if (app.last_check_date && app.last_check_date < today) {
                status = 'daily';
            } else if (app.last_check_date === null) {
                status = 'new';
            }
            const existingTest = myTests.find(test => test.id === app.app_id);
            if (existingTest && existingTest.status === 'opened' && status !== 'done') {
                status = 'opened';
            }
            return {
                id: app.app_id,
                progress_id: app.progress_id,
                name: app.name,
                package: app.package_name,
                icon_url: app.icon_url,
                google_group_url: app.google_group_url,
                instructions: app.instructions,
                status,
                start_date: app.start_date,
                owner_username: app.owner_username,
                active_testers_count: app.active_testers_count,
                days_since_publish: app.days_since_publish,
                google_sync_day: app.google_sync_day || 0,
                sync_message: app.sync_message || '',
                last_owner_activity: app.last_owner_activity || null,
                checkins_count: app.checkins_count || 0,
                skips_count: app.skips_count || 0,
                last_sync_date: app.last_sync_date || null,
                testing_days: app.testing_days || 0,
                grant_claimed: !!app.grant_claimed,
                app_status: app.app_status || 'active',
            };
        });

        incomingOffers = data.incoming_offers || [];
        renderIncomingOffers();
        renderTests();

    } catch (error) {
        console.error('Error loading tasks:', error);
        showRetry('tests-list', 'loadTasks()');
        incomingOffers = [];
        renderIncomingOffers();
    } finally {
        _apiEnd();
    }
}

async function loadMutualFeed() {
    if (_marketInFlight.mutual) {
        return _marketInFlight.mutual;
    }

    const hasLocalData = Array.isArray(mutualSeeking) && mutualSeeking.length > 0
        || Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0;
    if (!hasThrottleWindowPassed('mutual') && hasLocalData) {
        renderMutualFeed();
        return;
    }

    const requestPromise = _loadMutualFeedImpl();
    _marketInFlight.mutual = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_marketInFlight.mutual === requestPromise) {
            _marketInFlight.mutual = null;
        }
    }
}

async function _loadMutualFeedImpl() {
    const cached = getMarketCache();
    const hasMutualCache = !!(cached && cached.mutual);

    if (hasMutualCache) {
        mutualSeeking = cached.mutual.seeking || [];
        mutualPrelaunch = cached.mutual.prelaunch || [];
        renderMutualFeed();
        if (window.renderMutualReturns) {
            window.renderMutualReturns(cached.mutual.returns || []);
        }
    } else {
        showSkeleton('mutual-seeking-list');
        showSkeleton('mutual-prelaunch-list');
        const returnsContainer = document.getElementById('mutual-returns-container');
        if (returnsContainer) {
            returnsContainer.style.display = '';
            showSkeleton('mutual-returns-list');
        }
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
        const prevMutual = cached && cached.mutual ? cached.mutual : null;
        const changed = JSON.stringify(prevMutual) !== JSON.stringify(nextMutual);

        if (!hasMutualCache || changed) {
            mutualSeeking = nextMutual.seeking;
            mutualPrelaunch = nextMutual.prelaunch;
            renderMutualFeed();
            if (window.renderMutualReturns) {
                window.renderMutualReturns(nextMutual.returns);
            }
        }

        const nextCache = Object.assign({}, cached || {});
        nextCache.mutual = nextMutual;
        setMarketCache(nextCache);
        markMarketFetchSuccess('mutual');
    } catch (error) {
        console.error('Error loading mutual feed:', error);
        const hasLocalData = Array.isArray(mutualSeeking) && mutualSeeking.length > 0
            || Array.isArray(mutualPrelaunch) && mutualPrelaunch.length > 0;
        if (!hasLocalData) {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
            showRetry('mutual-seeking-list', 'forceRefreshMarket()');
            showRetry('mutual-prelaunch-list', 'forceRefreshMarket()');
            const returnsContainer = document.getElementById('mutual-returns-container');
            if (returnsContainer) {
                returnsContainer.style.display = '';
                showRetry('mutual-returns-list', 'forceRefreshMarket()');
            }
        } else {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
        }
    } finally {
        _apiEnd();
    }
}

async function loadBountyFeed() {
    if (_marketInFlight.bounty) {
        return _marketInFlight.bounty;
    }

    const hasLocalData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
    if (!hasThrottleWindowPassed('bounty') && hasLocalData) {
        renderBountyFeed();
        return;
    }

    const requestPromise = _loadBountyFeedImpl();
    _marketInFlight.bounty = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_marketInFlight.bounty === requestPromise) {
            _marketInFlight.bounty = null;
        }
    }
}

async function _loadBountyFeedImpl() {
    const cached = getMarketCache();
    const hasBountyCache = !!(cached && cached.bounty && Array.isArray(cached.bounty.contracts));

    if (hasBountyCache) {
        bountyContracts = cached.bounty.contracts || [];
        renderBountyFeed();
    } else {
        showSkeleton('bounty-list');
    }

    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/feed/bounty/${userId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const nextBounty = {
            contracts: data.contracts || [],
        };
        const prevBounty = cached && cached.bounty ? cached.bounty : null;
        const changed = JSON.stringify(prevBounty) !== JSON.stringify(nextBounty);

        if (!hasBountyCache || changed) {
            bountyContracts = nextBounty.contracts;
            renderBountyFeed();
        }

        const nextCache = Object.assign({}, cached || {});
        nextCache.bounty = nextBounty;
        setMarketCache(nextCache);
        markMarketFetchSuccess('bounty');
    } catch (error) {
        console.error('Error loading bounty feed:', error);
        const hasLocalData = Array.isArray(bountyContracts) && bountyContracts.length > 0;
        if (!hasLocalData) {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
            showRetry('bounty-list', 'forceRefreshMarket()');
        } else {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
        }
    } finally {
        _apiEnd();
    }
}

async function forceRefreshMarket() {
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    resetMarketFetchThrottle();
    showSkeleton('mutual-seeking-list');
    showSkeleton('mutual-prelaunch-list');
    showSkeleton('bounty-list');
    try {
        await Promise.all([loadMutualFeed(), loadBountyFeed()]);
    } catch (error) {
        console.error('Force refresh market error:', error);
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

async function loadProjects(isBackground = false) {
    if (!isBackground) {
        showSkeleton('projects-list');
    }
    _apiStart();
    try {
        const response = await fetchWithRetry(`${API_BASE}/projects/${userId}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        const projectsList = data.projects || [];
        myProjects = projectsList.map(project => ({
            id: project.app_id,
            name: project.name,
            package: project.package_name,
            icon_url: project.icon_url,
            google_group_url: project.google_group_url,
            instructions: project.instructions || '',
            testers: project.testers || [],
            is_visible: project.is_visible !== false,
            created_at: project.created_at || null,
            likes: project.likes || [],
            likes_used: project.likes_used || 0,
            likes_max: project.likes_max || 1,
            mode: project.mode || 'mutual',
            limit_mutual: project.limit_mutual || 0,
            limit_bounty: project.limit_bounty || 0,
            bounty_per_tester: project.bounty_per_tester || 0,
            google_sync_day: project.google_sync_day || 0,
            sync_message: project.sync_message || '',
            last_sync_date: project.last_sync_date || null,
            feedback_new_count: project.feedback_new_count || 0,
            feedback_total_count: project.feedback_total_count || 0,
        }));

        visibilityStats = {
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
        };

        myProjectsLoadError = false;
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        myProjectsLoadError = true;
        if (!isBackground) {
            showRetry('projects-list', 'loadProjects()');
        }
    } finally {
        _apiEnd();
        loadArchivedProjects().catch(() => {});
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
        await loadTasks();
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
    var sourceButton = event && event.currentTarget ? event.currentTarget : null;
    if (myProjectsLoadError) {
        if (tg.showAlert) tg.showAlert(window.t('projectsLoadingAlert'));
        else alert(window.t('projectsLoadingAlert'));
        loadProjects(true).catch(function() {});
        return;
    }
    const eligible = myProjects.filter(p => (p.mode === 'mutual' || p.mode === 'hybrid') && p.id);
    if (eligible.length === 0) {
        if (tg.showAlert) tg.showAlert(window.t('offerNoProjects'));
        else alert(window.t('offerNoProjects'));
        return;
    }
    if (eligible.length === 1) {
        await sendMutualOffer(targetAppId, targetOwnerId, eligible[0].id, {
            sourceButton: sourceButton,
            targetAppId: targetAppId,
            targetOwnerId: targetOwnerId,
        });
        return;
    }
    showProjectSelectModal(eligible, targetAppId, targetOwnerId, {
        sourceButton: sourceButton,
        targetAppId: targetAppId,
        targetOwnerId: targetOwnerId,
    });
}

async function sendMutualOffer(targetAppId, targetOwnerId, proposerAppId, uiContext) {
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
        markMutualOfferPendingUi(targetAppId, targetOwnerId, uiContext && uiContext.sourceButton);
        showToast(window.t('offerSentSuccess'));
        closeProjectSelectModal();
    } catch (error) {
        console.error('Create offer error:', error);
        handleApiError('network_error');
    } finally {
        _apiEnd();
    }
}

async function joinMutual(appId, allowOverLimit = false) {
    try {
        const response = await fetch(`${API_BASE}/feed/mutual/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId, allow_over_limit: allowOverLimit })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await Promise.all([loadTasks(), loadMutualFeed(), loadProjects(true)]);
    } catch (error) {
        console.error('Join mutual error:', error);
        if (tg.showAlert) tg.showAlert(t.networkError);
    }
}

async function joinBounty(appId) {
    try {
        const response = await fetch(`${API_BASE}/feed/bounty/${appId}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tester_id: userId })
        });
        const result = await response.json();
        if (result.status !== 'success') {
            if (tg.showAlert) tg.showAlert(getApiErrorMessage(result, 'networkError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        await Promise.all([loadTasks(), loadBountyFeed(), loadProjects(true)]);
    } catch (error) {
        console.error('Join bounty error:', error);
        if (tg.showAlert) tg.showAlert(t.networkError);
    }
}

function startTimer(id, pkg, isScreenshotDay = false, ownerUsername = '') {
    if (activeTimerAppId === id) {
        tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
        return;
    }
    if (activeTimerAppId !== null && activeTimerAppId !== id) {
        showCustomAlert(t.antiFraudAlert);
        return;
    }
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);

    const btn = document.getElementById(`btn-confirm-${id}`);
    if (!btn || !btn.disabled) return;

    activeTimerAppId = id;
    let timeLeft = 15;
    btn.innerText = t.timerRemaining.replace('{sec}', timeLeft);

    const timerId = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            clearInterval(timerId);
            activeTimerAppId = null;
            btn.disabled = false;
            btn.style.backgroundColor = 'var(--success-color)';
            btn.style.color = '#fff';
            btn.style.cursor = 'pointer';
            if (isScreenshotDay) {
                btn.innerText = '💬 ' + t.screenshotBtn;
                btn.onclick = () => handleScreenshotAndConfirm(id, ownerUsername);
            } else {
                btn.innerText = t.confirmStart;
                btn.onclick = () => confirmStart(id);
            }
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            btn.innerText = t.timerRemaining.replace('{sec}', timeLeft);
        }
    }, 1000);
}

function openPlay(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    const test = myTests.find(item => item.id === id);
    if (test) {
        test.status = 'opened';
        renderTests();
    }
}

function handleFirstDownload(id, pkg) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    tg.openLink(`https://play.google.com/store/apps/details?id=${pkg}`);
    setTimeout(() => {
        const screenshotBox = document.getElementById(`new-screenshot-box-${id}`);
        if (screenshotBox) screenshotBox.style.display = 'block';
    }, 1000);
}

async function handleScreenshotAndConfirm(id, ownerUsername) {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    openReportModal(id, ownerUsername);
}

async function sendReport() {
    const text = document.getElementById('report-text').value.trim();
    const ownerUsername = (_reportOwnerUsername || '').replace('@', '').trim();
    const appId = _reportAppId;

    _reportAppId = null;
    _reportOwnerUsername = null;
    document.getElementById('report-modal').classList.remove('active');

    if (ownerUsername) {
        const encodedText = encodeURIComponent(text);
        try {
            tg.openTelegramLink('https://t.me/' + ownerUsername + '?text=' + encodedText);
        } catch (error) {
            try {
                tg.openLink('https://t.me/' + ownerUsername + '?text=' + encodedText);
            } catch (fallbackError) {
                window.location.href = 'https://t.me/' + ownerUsername + '?text=' + encodedText;
            }
        }
        _pendingScreenshotReminderUsername = ownerUsername;
    }

    if (appId) {
        confirmStart(appId);
    }
}

function sendContactMessage() {
    if (!_contactOwnerUsername) {
        showToast(t.usernameUnavailable);
        return;
    }
    const text = document.getElementById('contact-text').value.trim();
    if (text) {
        try {
            tg.openTelegramLink('https://t.me/' + _contactOwnerUsername + '?text=' + encodeURIComponent(text));
        } catch (error) {
            window.location.href = 'https://t.me/' + _contactOwnerUsername + '?text=' + encodeURIComponent(text);
        }
    }
    closeContactModal({ target: document.getElementById('contact-modal') });
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
    document.getElementById('earn-referral-bust').innerText = `💎 ${formatBustAmount(_earnReferralBust)} $BUST`;
    document.getElementById('earn-grant-status').innerHTML = `
        <span class="meta-chip accent-green">🏆 ${window.t('earnGrantTestsLabel', {}, lang)}: ${_earnGrantCount}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnGrantBust)} $BUST</span>
    `;
    document.getElementById('earn-early-finish-status').innerHTML = `<span class="meta-chip accent-orange">💎 ${formatBustAmount(_earnEarlyFinishBust)} $BUST</span>`;
    document.getElementById('earn-exchange-status').innerHTML = `<span class="meta-chip accent-purple">💎 ${formatBustAmount(_earnExchangeBust)} $BUST</span>`;
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
        _earnExchangeBust = Number(data.exchange_bust_earned || 0);
        _earnEarlyFinishBust = Number(data.early_finish_bust_earned || 0);
        _socialBonusStatus = data.social_bonus_status || 'none';
        renderEarnBustDynamic();
    } catch (error) {
        console.error('Failed to load referral stats:', error);
    }
}

async function initiateProjectFeedback(appId) {
    try {
        const response = await fetch(`${API_BASE}/feedback/initiate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, app_id: appId })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'genericError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('feedbackBotRedirectToast', {}, lang));
        if (window.closeProjectDetailsModal) {
            window.closeProjectDetailsModal();
        }
        setTimeout(function() {
            try {
                tg.close();
            } catch (error) {
                console.warn('Failed to close WebApp for feedback flow:', error);
            }
        }, 250);
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
    [5, 10, 25, 50, 100].forEach(function(value) {
        const chip = document.getElementById(`feedback-bust-chip-${value}`);
        if (chip) {
            chip.classList.toggle('is-active', Number(value) === _feedbackRewardBust);
        }
    });
}

function setFeedbackRewardKarma(amount) {
    _feedbackRewardKarma = Number(amount || 0);
    const mapping = { 0: '0', 1.5: '15', 3: '30' };
    ['0', '15', '30'].forEach(function(code) {
        const chip = document.getElementById(`feedback-karma-chip-${code}`);
        if (chip) {
            chip.classList.toggle('is-active', code === mapping[_feedbackRewardKarma]);
        }
    });
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
                }
            });
        };
    }
    if (reply) {
        reply.value = '';
    }
}

function closeFeedbackRewardModal() {
    _feedbackRewardTargetId = null;
    _feedbackRewardBust = 0;
    _feedbackRewardKarma = 0;
    if (window.closeFeedbackRewardModalUi) {
        window.closeFeedbackRewardModalUi();
    }
}

async function submitFeedbackReward() {
    if (!_feedbackRewardTargetId || !_activeProjectFeedbackAppId) return;

    const bustInput = document.getElementById('feedback-reward-bust-input');
    const replyInput = document.getElementById('feedback-reward-reply');
    const bustAmount = Math.max(0, Number((bustInput && bustInput.value) || _feedbackRewardBust || 0));
    const replyText = (replyInput && replyInput.value ? replyInput.value : '').trim();

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
        showToast(window.t('feedbackSentToast', {}, lang));
    } catch (error) {
        console.error('Send feedback error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
    }
}

async function saveProjectSync() {
    if (!_syncProjectId) return;
    const day = Number(document.getElementById('sync-day-input').value);
    const message = document.getElementById('sync-message-input').value || '';
    if (!Number.isInteger(day) || day < 1) {
        showToast(t.syncDayInvalid);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${_syncProjectId}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ google_sync_day: day, sync_message: message })
        });
        const data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'loadError'));
            return;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(t.syncSavedToast);
        await Promise.all([loadProjects(true), loadTasks()]);
        closeSyncModal({ target: document.getElementById('sync-modal') });
    } catch (error) {
        console.error('Project sync error:', error);
        showToast(getApiErrorMessage(error && error.message, 'loadError'));
    }
}

async function loadArchivedProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects/${userId}/archived`);
        if (!response.ok) return;
        const data = await response.json();
        archivedProjects = (data.archived || []).map(function(project) {
            return Object.assign({}, project, {
                feedback_new_count: project.feedback_new_count || 0,
                feedback_total_count: project.feedback_total_count || 0,
            });
        });
        renderArchivedProjects();
    } catch (error) {
        console.error('Archive load error:', error);
        showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
            body: JSON.stringify({ tester_id: userId, app_id: id, local_date: getLocalDate() })
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
                handleApiError(getBackendErrorCode(result), result.details || {});
            } else {
                handleApiError('network_error');
            }
            return false;
        }

        const earnedBust = Number(result.earned_bust || 0);
        const earnedKarma = Number(result.earned_karma || 0);
        if (result.already_checked_today) {
            showToast(t.checkinAlreadyDone);
        } else if (earnedBust > 0) {
            showToast(t.checkinEarnBust.replace('{amount}', earnedBust.toFixed(1)));
        } else if (earnedKarma > 0) {
            showToast(t.checkinEarnKarma.replace('{amount}', earnedKarma.toFixed(1)));
        } else {
            showToast(t.successCheckin);
        }

        setTimeout(() => {
            card.style.display = 'none';
            loadTasks();
            loadProjects(true);
        }, 800);
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
    }
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
        const isActive = test && test.app_status === 'active';
        if (isActive) {
            showToast(window.t('claimGrantOvertimeToast', { amount: amount.toFixed(1) }));
        } else {
            showToast(window.t('claimGrantToast', { amount: amount.toFixed(1) }));
        }
        if (btn) btn.style.display = 'none';
        loadProjects(true);
    } catch (error) {
        console.error('Claim grant error:', error);
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

async function confirmDeleteProject() {
    if (!projectToDelete) return;

    const message = document.getElementById('delete-message').value.trim();
    const id = projectToDelete;
    const overtimeSelect = document.getElementById('delete-overtime-tester');
    const selectedOvertimeTester = overtimeSelect ? overtimeSelect.value : '';
    const btn = document.getElementById('t-confirmDeleteBtn');
    const originalText = btn.innerText;
    btn.innerText = '...';
    btn.disabled = true;

    try {
        if (selectedOvertimeTester) {
            const rewardResponse = await fetch(`${API_BASE}/projects/${id}/like`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tester_id: Number(selectedOvertimeTester), type: 'overtime' })
            });
            const rewardResult = await rewardResponse.json();
            if (rewardResult.status !== 'success') {
                const rewardMessage = rewardResult.code === 'karma_limit_reached'
                    ? t.karmaLimitReached
                    : getApiErrorMessage(rewardResult, 'karmaAlreadyLiked');
                showToast(rewardMessage);
                return;
            }
        }

        const response = await fetch(`${API_BASE}/projects/${id}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            closeDeleteModal();
            loadProjects();
        } else if (tg.showAlert) {
            tg.showAlert(getApiErrorMessage(result, 'deleteProjectError'));
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
    document.getElementById('package-error').style.display = 'none';

    const nameInput = document.getElementById('app-name').value.trim();
    let packageInput = document.getElementById('app-package').value.trim();
    const iconInput = document.getElementById('app-icon').value.trim();
    const instructionsInput = document.getElementById('app-instructions').value.trim();
    const pricingPayload = buildProjectPricingPayload('add');
    if (!pricingPayload) return;

    const isStandard = document.getElementById('seg-standard').classList.contains('active');
    const groupInput = isStandard ? '' : document.getElementById('app-group').value.trim();

    if (!packageInput.includes('play.google.com/store/apps/details?id=')) {
        document.getElementById('package-error').innerText = t.invalidPlayLink;
        document.getElementById('package-error').style.display = 'block';
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

async function doSaveProject(projectData) {
    const saveBtn = document.getElementById('t-save');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = '...';
    saveBtn.disabled = true;
    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            closeModal();
            loadProjects();
        } else {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
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
    const pricingPayload = buildProjectPricingPayload('edit');
    if (!pricingPayload) return;

    if (!name) {
        if (tg.showAlert) tg.showAlert(t.fillFields);
        else alert(t.fillFields);
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
    if (localStorage.getItem('hideBanner') === 'true') {
        const banner = document.getElementById('main-banner');
        if (banner) banner.style.display = 'none';
    }

    refreshLanguageUi();

    if (!localStorage.getItem('app_language')) {
        fetch(`${API_BASE}/users/${userId}/language`)
            .then(response => response.json())
            .then(data => {
                if (data.language && data.language !== lang) {
                    applyLanguage(data.language);
                }
            })
            .catch(() => {});
    }

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _pendingScreenshotReminderUsername !== null) {
            const username = _pendingScreenshotReminderUsername;
            _pendingScreenshotReminderUsername = null;
            setTimeout(() => showScreenshotCompleteModal(username), 300);
        }
    });

    document.addEventListener('pointerdown', (event) => {
        const menu = document.getElementById('system-drop-menu');
        if (!menu || !menu.classList.contains('active')) return;
        if (!menu.contains(event.target)) {
            menu.classList.remove('active');
        }
    });

    loadTasks();
    loadEvents();
    loadProjects();
    loadMutualFeed();
    loadBountyFeed();
});

Object.assign(window, {
    fetchWithRetry,
    markMutualOfferPendingUi,
    loadAllData,
    hasMarketCache,
    refreshLanguageUi,
    applyLanguage,
    toggleLanguage,
    loadTasks,
    loadMutualFeed,
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
    joinBounty,
    startTimer,
    openPlay,
    handleFirstDownload,
    handleScreenshotAndConfirm,
    sendReport,
    sendContactMessage,
    toggleVisibility,
    confirmDropTest,
    confirmOvertimeLeave,
    openEarnBustModal,
    initiateProjectFeedback,
    openProjectFeedback,
    sendProjectFeedbackMedia,
    openFeedbackRewardModal,
    closeFeedbackRewardModal,
    setFeedbackRewardBust,
    setFeedbackRewardKarma,
    submitFeedbackReward,
    sendFeedback,
    submitFeedback,
    submitSocialLink,
    saveProjectSync,
    loadArchivedProjects,
    confirmHardDelete,
    fetchKarmaBreakdown,
    sendKarmaReward,
    confirmStart,
    deleteTester,
    confirmDeleteProject,
    formatBustAmount,
    setProjectMode,
    updateProjectPricing,
    getApiErrorMessage,
    rerenderDynamicUi,
    refreshActiveTabData,
    saveProject,
    confirmEmailWarning,
    saveProjectEdit
});

Object.assign(window.App, {
    tg,
    API_BASE,
    userId,
    getState: () => ({
        lang,
        myTests,
        incomingOffers,
        myProjects,
        mutualSeeking,
        mutualPrelaunch,
        bountyContracts,
        communityEvents,
        eventsExpanded,
        visibilityStats,
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
    saveProject,
    saveProjectEdit
});
