window.App = window.App || {};

var tg = window.Telegram.WebApp;
tg.expand();
tg.ready();
window.DEFAULT_GOOGLE_GROUP_URL = 'https://groups.google.com/g/google-play-dev-test';

const initData = tg.initDataUnsafe || {};
const BOT_USERNAME = 'Android12TestersBot';
const BOT_CHAT_URL = `https://t.me/${BOT_USERNAME}`;
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
var mutualReturns = [];
var bountyContracts = [];
var communityEvents = null;
var eventsExpanded = false;
var activeTimerAppId = null;
var _timerEndTimestamp = null;
var _timerIntervalId = null;
var _timerIsScreenshot = false;
var _timerOwnerUsername = '';
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
var _pendingScreenshotReminderUsername = null;
var _contactOwnerUsername = '';
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
var _earnExchangeBust = 0;
var _earnEarlyFinishBust = 0;
var _earnFeedbackCount = 0;
var _earnFeedbackBust = 0;
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
var _lastFetchTimes = { mutual: 0, bounty: 0, tests: 0, projects: 0, offers: 0, archived: 0, reliabilitySummary: 0, reliabilityBreakdown: 0 };
var MARKET_FETCH_THROTTLE_MS = 15000;
var TESTS_FETCH_THROTTLE_MS = 20000;
var PROJECTS_FETCH_THROTTLE_MS = 30000;
var OFFERS_FETCH_THROTTLE_MS = 15000;
var ARCHIVED_FETCH_THROTTLE_MS = 45000;
var RELIABILITY_FETCH_THROTTLE_MS = 30000;
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

function setMarketForceSkeleton(enabled) {
    _marketForceSkeleton = !!enabled;
    window._marketForceSkeleton = _marketForceSkeleton;
}

window._marketForceSkeleton = _marketForceSkeleton;

function _parseInitialRouteTarget() {
    var params = new URLSearchParams(window.location.search || '');
    var startParam = String(initData.start_param || params.get('startapp') || '').trim();
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
        if (normalized === 'projects') {
            routeKind = 'projects';
        }
        if (normalized === 'market') {
            routeKind = 'market';
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
    if (routeKind === 'market') {
        return {
            tab: 'market',
            openFeedback: false,
            appId: null,
        };
    }
    if (routeKind === 'edit') {
        return {
            tab: 'projects',
            openEdit: true,
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

    if (route.tab === 'projects') {
        switchTab('projects');
    }
    if (route.tab === 'market') {
        switchTab('market');
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
                showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
        app_not_found: 'app_not_found',
        already_published: 'already_published',
        not_owner: 'not_owner',
        publish_to_market_failed: 'publish_to_market_failed',
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
    document.getElementById('edit-mode').value = 'mutual';
    document.getElementById('edit-target-lang').value = 'ALL';
    document.getElementById('edit-limit-mutual').value = '12';
    document.getElementById('edit-limit-bounty').value = '12';
    document.getElementById('edit-bounty-per-tester').value = '100';
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
            ownerUsername: _timerOwnerUsername || ''
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
        _timerReadyState = parsed && typeof parsed === 'object' ? parsed : {};
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
            ownerUsername: String(ownerUsername || '')
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
    try {
        localStorage.removeItem(_timerStorageKey);
    } catch (error) {
        console.warn('Failed to clear active timer state:', error);
    }
}

function _setTimerButtonReady(finishedId, isScreenshot, ownerUsername) {
    const btn = document.getElementById('btn-confirm-' + finishedId);
    if (!btn) return false;

    btn.disabled = false;
    btn.style.backgroundColor = 'var(--success-color)';
    btn.style.color = '#fff';
    btn.style.cursor = 'pointer';
    if (isScreenshot) {
        btn.innerText = '💬 ' + t.screenshotBtn;
        btn.onclick = function() { handleScreenshotAndConfirm(finishedId, ownerUsername || ''); };
    } else {
        btn.innerText = t.confirmStart;
        btn.onclick = function() { confirmStart(finishedId); };
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
    const reliabilityInfoModal = document.getElementById('reliability-info-modal');
    if (reliabilityInfoModal && reliabilityInfoModal.classList.contains('active') && window.showReliabilityInfo) {
        window.showReliabilityInfo();
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
        var status = 'new';
        if (app.last_check_date === today) {
            status = 'done';
        } else if (app.last_check_date && app.last_check_date < today) {
            status = 'daily';
        } else if (app.last_check_date === null) {
            status = 'new';
        }
        var existingTest = myTests.find(function(test) { return test.id === app.app_id; });
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
            status: status,
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
            join_type: app.join_type || 'invite',
            target_lang: app.target_lang || 'ALL',
            daily_timeline: app.daily_timeline || '',
            archive_reason: app.archive_reason || null,
            bounty_per_tester: app.bounty_per_tester || 0,
        };
    });
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
        setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
        _testsLoadedOnce = true;
        _lastFetchTimes.tests = Date.now();
        loadReliabilitySummary(true).catch(function() {});

    } catch (error) {
        console.error('Error loading tasks:', error);
        if (_testsLoadedOnce && myTests.length > 0) {
            // Have data from cache, just show error toast
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
            showRetry('bounty-list', 'forceRefreshMarket()');
        } else {
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
        return {
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
            target_lang: project.target_lang || 'ALL',
            limit_mutual: project.limit_mutual || 0,
            limit_bounty: project.limit_bounty || 0,
            bounty_per_tester: project.bounty_per_tester || 0,
            google_sync_day: project.google_sync_day || 0,
            sync_message: project.sync_message || '',
            last_sync_date: project.last_sync_date || null,
            published_to_market_at: project.published_to_market_at || null,
            last_mass_invite_at: project.last_mass_invite_at || null,
            feedback_new_count: project.feedback_new_count || 0,
            feedback_total_count: project.feedback_total_count || 0,
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
    };
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
            showToast(getApiErrorMessage(error && error.message, 'networkError'));
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
    var sourceButton = event && event.currentTarget ? event.currentTarget : null;
    if (myProjectsLoadError) {
        if (tg.showAlert) tg.showAlert(window.t('projectsLoadingAlert'));
        else alert(window.t('projectsLoadingAlert'));
        loadProjects(true).catch(function() {});
        return;
    }
    const eligible = myProjects.filter(p => (p.mode === 'mutual' || p.mode === 'hybrid') && p.id);
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
    // Clean up stale timer (tab suspension / cache restoration scenario)
    if (activeTimerAppId !== null && _timerEndTimestamp && Date.now() > _timerEndTimestamp + 2000) {
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
        return;
    }

    var readyPayload = _getTimerReadyPayload(id);
    if (readyPayload) {
        _setTimerButtonReady(id, readyPayload.isScreenshot, readyPayload.ownerUsername);
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
    _timerEndTimestamp = Date.now() + 15000;
    _timerIsScreenshot = isScreenshotDay;
    _timerOwnerUsername = ownerUsername;
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
    document.getElementById('earn-grant-status').innerHTML = `
        <span class="meta-chip accent-green">🏆 ${window.t('earnGrantTestsLabel', {}, lang)}: ${_earnGrantCount}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnGrantBust)}</span>
    `;
    document.getElementById('earn-early-finish-status').innerHTML = `<span class="meta-chip accent-orange">💎 ${formatBustAmount(_earnEarlyFinishBust)}</span>`;
    document.getElementById('earn-feedback-status').innerHTML = `
        <span class="meta-chip accent-green">🐞 ${window.t('earnFeedbackCountChip', { count: _earnFeedbackCount }, lang)}</span>
        <span class="meta-chip accent-blue">💎 ${formatBustAmount(_earnFeedbackBust)}</span>
    `;
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
        _earnExchangeBust = Number(data.exchange_bust_earned || 0);
        _earnEarlyFinishBust = Number(data.early_finish_bust_earned || 0);
        _earnFeedbackCount = Number(data.feedback_sent_count || 0);
        _earnFeedbackBust = Number(data.feedback_bust_earned || 0);
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

var _syncActivityInterval = null;

async function pingOwnerActivity(projectId) {
    var btn = document.getElementById('activity-ping-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '\u23f3...';
    }

    try {
        var response = await fetch(API_BASE + '/projects/' + projectId + '/ping_activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: userId })
        });
        var data = await response.json();
        if (!response.ok || data.status !== 'success') {
            showToast(getApiErrorMessage(data, 'activityPingError'));
            if (btn) { btn.disabled = false; btn.textContent = window.t('activityConfirmBtn'); }
            return;
        }

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(window.t('activityPingSuccess'));

        var proj = myProjects.find(function(p) { return p.id === projectId; });
        if (proj) {
            proj.last_owner_activity = data.last_owner_activity || new Date().toISOString();
        }

        _startActivityCountdown(btn, 24 * 60 * 60 * 1000);
        renderProjects(true);
    } catch (error) {
        console.error('Ping activity error:', error);
        showToast(window.t('activityPingError'));
        if (btn) { btn.disabled = false; btn.textContent = window.t('activityConfirmBtn'); }
    }
}

function _startActivityCountdown(btn, msRemaining) {
    if (_syncActivityInterval) clearInterval(_syncActivityInterval);
    if (!btn) return;

    function update() {
        msRemaining -= 1000;
        if (msRemaining <= 0) {
            clearInterval(_syncActivityInterval);
            _syncActivityInterval = null;
            btn.disabled = false;
            btn.className = 'btn btn-success';
            btn.style.opacity = '1';
            btn.style.fontSize = '16px';
            btn.style.padding = '14px';
            btn.textContent = window.t('activityConfirmBtn');
            return;
        }
        var h = Math.floor(msRemaining / 3600000);
        var m = Math.floor((msRemaining % 3600000) / 60000);
        var s = Math.floor((msRemaining % 60000) / 1000);
        var timeStr = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        btn.textContent = window.t('activityConfirmedBtn', { time: timeStr });
        btn.disabled = true;
        btn.style.opacity = '0.6';
    }

    update();
    _syncActivityInterval = setInterval(update, 1000);
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

        setTimeout(() => {
            card.style.display = 'none';
            loadTasks(true);
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
    const targetLang = (document.getElementById('app-target-lang').value || 'ALL').toUpperCase();
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
            target_lang: targetLang,
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
    const googleGroupUrl = document.getElementById('edit-group').value.trim();
    const targetLang = (document.getElementById('edit-target-lang').value || 'ALL').toUpperCase();
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
                google_group_url: googleGroupUrl || window.DEFAULT_GOOGLE_GROUP_URL,
                target_lang: targetLang,
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

    fetch(`${API_BASE}/users/${userId}/language`)
        .then(response => response.json())
        .then(data => {
            if (data.language && data.language !== lang) {
                applyLanguage(data.language);
            }
        })
        .catch(() => {});

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && _pendingScreenshotReminderUsername !== null) {
            const username = _pendingScreenshotReminderUsername;
            _pendingScreenshotReminderUsername = null;
            setTimeout(() => showScreenshotCompleteModal(username), 300);
        }
        if (!document.hidden) {
            _syncActiveTimerState();
            renderTests(true);
            loadTasks(false).catch(() => {});
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
    loadTasks();
    loadReliabilitySummary();
    loadReliabilityBreakdown(true);
    loadIncomingOffers();
    startOffersPolling();
    startMarketPolling();
    loadEvents();
    _loadPersistedActiveTimer();
    scheduleDeferredBootstrap();
    _handleInitialRoute().catch(function(error) {
        console.error('Initial route handler failed:', error);
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
    applyLanguage,
    toggleLanguage,
    loadTasks,
    loadIncomingOffers,
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
    joinDirect,
    joinBounty,
    startTimer,
    openPlay,
    handleFirstDownload,
    handleScreenshotAndConfirm,
    sendReport,
    sendContactMessage,
    toggleVisibility,
    confirmDropTest,
    confirmLeaveMutual,
    confirmKickTester,
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
    pingOwnerActivity,
    loadArchivedProjects,
    loadReliabilitySummary,
    loadReliabilityBreakdown,
    confirmHardDelete,
    fetchKarmaBreakdown,
    sendKarmaReward,
    confirmStart,
    deleteTester,
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
    joinDirect
});
