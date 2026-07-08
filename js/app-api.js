/* Phase 5.2 — js/app-api.js (structural split from app.js) */
/* fetch/cache/throttle/in-flight/polling + project CRUD & visibility API */
/* Depends on globals from js/app-config.js (state, cache keys, constants). */
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

function normalizeGuestProjectsFilterLang(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'ALL';
    if (raw.toUpperCase() === 'ALL') return 'ALL';
    const normalized = raw.toLowerCase();
    return /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(normalized) ? normalized : 'ALL';
}

function normalizeGuestProjectAvailableLangs(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).reduce(function(result, value) {
        const normalized = normalizeGuestProjectsFilterLang(value);
        if (normalized === 'ALL' || seen.has(normalized)) {
            return result;
        }
        seen.add(normalized);
        result.push(normalized);
        return result;
    }, []).sort();
}

function getGuestProjectAvailableLangs() {
    return Array.isArray(_guestProjectsAvailableLangs) ? _guestProjectsAvailableLangs.slice() : [];
}

function setGuestProjectAvailableLangs(values) {
    _guestProjectsAvailableLangs = normalizeGuestProjectAvailableLangs(values);
}

function _guestProjectFiltersMatch(cachedFilters, liveFilters) {
    return normalizeGuestProjectsFilterLang(cachedFilters && cachedFilters.lang) === normalizeGuestProjectsFilterLang(liveFilters && liveFilters.lang)
        && String((cachedFilters && cachedFilters.category) || 'ALL').toUpperCase() === String((liveFilters && liveFilters.category) || 'ALL').toUpperCase();
}

function _applyGuestProjectsPayload(payload) {
    guestProjects = Array.isArray(payload && payload.items) ? payload.items : [];
    setGuestProjectAvailableLangs(payload && payload.available_langs);

    const selectedLang = normalizeGuestProjectsFilterLang(_guestProjectsFilters.lang);
    return selectedLang === 'ALL' || _guestProjectsAvailableLangs.includes(selectedLang);
}

function getGuestProjectsCache() {
    try {
        const raw = localStorage.getItem(GUEST_PROJECTS_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function setGuestProjectsCache(payload) {
    try {
        localStorage.setItem(GUEST_PROJECTS_CACHE_KEY, JSON.stringify(payload || {}));
    } catch (error) {
        console.warn('Failed to cache guest projects:', error);
    }
}

function getExternalCountsCache() {
    try {
        const raw = localStorage.getItem(EXTERNAL_COUNTS_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function setExternalCountsCache(payload) {
    try {
        localStorage.setItem(EXTERNAL_COUNTS_CACHE_KEY, JSON.stringify(payload || {}));
    } catch (error) {
        console.warn('Failed to cache external counts:', error);
    }
}

function _normalizeExternalCountsPayload(payload, fallbackPayload) {
    const fallback = fallbackPayload || {};
    var guestCount = Math.max(0, Number((payload && payload.guest_projects_count) || 0));
    var leadsCount = Math.max(0, Number((payload && payload.leads_count) || 0));
    var fallbackGuestCount = Math.max(0, Number(fallback.guest_projects_count || 0));
    var fallbackLeadsCount = Math.max(0, Number(fallback.leads_count || 0));
    var updatedAt = Math.max(0, Number((payload && payload.updated_at) || 0));

    if (guestCount <= 0 && fallbackGuestCount > 0) {
        guestCount = fallbackGuestCount;
    }
    if (leadsCount <= 0 && fallbackLeadsCount > 0) {
        leadsCount = fallbackLeadsCount;
    }

    return {
        guest_projects_count: guestCount,
        leads_count: leadsCount,
        updated_at: updatedAt || Date.now(),
    };
}

function _applyExternalCountsPayload(payload, fallbackPayload) {
    _externalCounts = _normalizeExternalCountsPayload(payload, fallbackPayload);
    window.__guestTestsLeadsCount = Number(_externalCounts.leads_count || 0);
    if (Number(_externalCounts.guest_projects_count || 0) > 0 || Number(_externalCounts.leads_count || 0) > 0) {
        _externalCountsLoadedOnce = true;
        setExternalCountsCache(_externalCounts);
    }
    return Object.assign({}, _externalCounts);
}

function _hydrateExternalCountsFromCache() {
    const cached = getExternalCountsCache();
    if (!cached) {
        return false;
    }
    _applyExternalCountsPayload(cached, _externalCounts);
    return _externalCountsLoadedOnce;
}

function getExternalCounts() {
    return Object.assign({}, _externalCounts);
}

async function loadExternalCounts(options) {
    options = options || {};
    const force = !!options.force;
    const allowCachedFallback = options.allowCachedFallback !== false;

    if (!_externalCountsLoadedOnce && allowCachedFallback) {
        _hydrateExternalCountsFromCache();
    }

    const hasUsableCounts = Number(_externalCounts.guest_projects_count || 0) > 0 || Number(_externalCounts.leads_count || 0) > 0;
    const isFresh = (Date.now() - Number(_externalCounts.updated_at || 0)) < EXTERNAL_COUNTS_CACHE_TTL_MS;
    if (!force && hasUsableCounts && isFresh) {
        return getExternalCounts();
    }

    if (_externalCountsInFlight) {
        return _externalCountsInFlight;
    }

    const requestPromise = (async function() {
        try {
            const response = await fetchWithRetry(`${API_BASE}/external-counts`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (!data || data.status !== 'success') {
                throw new Error('Invalid external counts response');
            }
            _applyExternalCountsPayload(data, _externalCounts);
        } catch (error) {
            console.error('Error loading external counts:', error);
            if (!_externalCountsLoadedOnce && allowCachedFallback) {
                _hydrateExternalCountsFromCache();
            }
        }
        return getExternalCounts();
    })();

    _externalCountsInFlight = requestPromise;
    try {
        return await requestPromise;
    } finally {
        if (_externalCountsInFlight === requestPromise) {
            _externalCountsInFlight = null;
        }
    }
}

function _buildGuestProjectsUrl() {
    const params = new URLSearchParams();
    params.set('lang', normalizeGuestProjectsFilterLang(_guestProjectsFilters.lang));
    params.set('category', String(_guestProjectsFilters.category || 'ALL').toUpperCase());
    return `${API_BASE}/guest-apps?${params.toString()}`;
}

function getGuestProjectsPageSize() {
    return GUEST_PROJECTS_PAGE_SIZE;
}

function _syncGuestProjectsCache() {
    setGuestProjectsCache({
        filters: Object.assign({}, _guestProjectsFilters),
        items: Array.isArray(guestProjects) ? guestProjects : [],
        available_langs: getGuestProjectAvailableLangs(),
        ts: Date.now(),
    });
}

async function loadGuestApps(options) {
    options = options || {};
    if (_guestProjectsInFlight) {
        return _guestProjectsInFlight;
    }

    const cached = getGuestProjectsCache();
    const filtersMatch = !!(cached && cached.filters && _guestProjectFiltersMatch(cached.filters, _guestProjectsFilters));

    if (!options.force && filtersMatch && Array.isArray(cached.items)) {
        guestProjects = cached.items;
        setGuestProjectAvailableLangs(cached.available_langs);
        resetGuestProjectsPagination();
        _guestProjectsLoadedOnce = true;
        _guestProjectsLoadError = false;
        if (window.renderGuestProjectsSection) {
            window.renderGuestProjectsSection(true);
        }
    }

    const requestPromise = (async function() {
        try {
            const response = await fetchWithRetry(_buildGuestProjectsUrl());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            let data = await response.json();
            let filterStillValid = _applyGuestProjectsPayload(data);
            if (!filterStillValid) {
                _guestProjectsFilters.lang = 'ALL';
                const fallbackResponse = await fetchWithRetry(_buildGuestProjectsUrl());
                if (!fallbackResponse.ok) throw new Error(`HTTP ${fallbackResponse.status}`);
                data = await fallbackResponse.json();
                _applyGuestProjectsPayload(data);
            }
            resetGuestProjectsPagination();
            _guestProjectsLoadedOnce = true;
            _guestProjectsLoadError = false;
            _syncGuestProjectsCache();
        } catch (error) {
            console.error('Error loading guest apps:', error);
            _guestProjectsLoadError = true;
            if (!_guestProjectsLoadedOnce) {
                const hasCachedItems = !!(filtersMatch && Array.isArray((cached || {}).items));
                guestProjects = hasCachedItems ? cached.items : [];
                setGuestProjectAvailableLangs(hasCachedItems ? cached.available_langs : []);
                _guestProjectsLoadedOnce = hasCachedItems;
            }
            if (_guestProjectsExpanded && !guestProjects.length) {
                showToast(getApiErrorMessage(error && error.message, 'networkError'));
            }
        } finally {
            if (window.renderGuestProjectsSection) {
                window.renderGuestProjectsSection(true);
            }
        }
    })();

    _guestProjectsInFlight = requestPromise;
    try {
        await requestPromise;
    } finally {
        if (_guestProjectsInFlight === requestPromise) {
            _guestProjectsInFlight = null;
        }
    }
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

function persistTestsCacheSnapshot() {
    setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
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
                _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'incoming_offers');
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
        ALREADY_OWNED: 'ALREADY_OWNED',
        ALREADY_ACTIVE: 'ALREADY_ACTIVE',
        NEEDS_RESTART: 'NEEDS_RESTART',
        insufficient_bust_balance: 'err_insufficient_bust_balance',
        transaction_failed: 'err_transaction_failed',
        invalid_init_data: 'guestClaimAuthErrorToast',
        invalid_play_link: 'invalidPlayLink',
        grant_not_ready: 'err_grant_not_ready',
        grant_too_many_skips: 'err_grant_too_many_skips',
        grant_already_claimed: 'err_grant_already_claimed',
        invalid_start_date: 'err_grant_unavailable',
        invalid_google_group_url: 'invalid_google_group_url',
        manual_external_owner_missing: 'manualExternalInvalidOwnerUsername',
        user_already_registered: 'manualExternalOwnerAlreadyRegisteredAlert',
        testing_not_found: 'testing_not_found',
        database_error: 'database_error',
        project_pending_completion: 'projectPendingCompletionAlert',
        external_source_project_invalid: 'external_source_project_invalid',
        guest_app_not_found: 'guest_app_not_found',
        guest_claim_wrong_owner: 'guest_claim_wrong_owner',
        guest_app_forbidden: 'guest_app_forbidden',
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
        overtime_reward_unavailable: 'err_overtime_reward_unavailable',
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
        offer_no_available_apps: 'err_offer_no_available_apps',
        offer_accept_failed: 'err_offer_accept_failed',
        offer_create_failed: 'err_offer_create_failed',
        user_not_found: 'err_user_not_found',
        transfer_self_forbidden: 'err_transfer_self_forbidden',
        transfer_generate_failed: 'err_transfer_generate_failed',
        transfer_failed: 'err_transfer_failed',
        transfer_not_found: 'err_transfer_not_found',
        transfer_expired: 'err_transfer_expired',
        transfer_already_used: 'err_transfer_already_used',
        transfer_wrong_recipient: 'err_transfer_wrong_recipient',
        transfer_sender_not_owner: 'err_transfer_sender_not_owner',
        transfer_app_unavailable: 'err_transfer_app_unavailable',
        bot_is_blocked: 'err_bot_is_blocked',
        mass_invite_project_unavailable: 'massInviteUnavailable',
        mass_invite_cooldown_active: 'massInviteCooldownActiveError',
        mass_invite_cooldown_not_active: 'massInviteCooldownNotActive',
        invalid_email_commas: 'invalidEmailCommas',
        invalid_email_spaces: 'invalidEmailSpaces',
        invalid_email_format: 'invalidEmail',
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

function _emptyTestRewardsSummary() {
    return {
        checkin_karma: 0,
        review_platform_karma: 0,
        owner_karma_good: 0,
        owner_karma_bug: 0,
        owner_karma_overtime: 0,
        owner_karma_total: 0,
        feedback_karma: 0,
        feedback_bust: 0,
        review_owner_boost_bust: 0,
        review_owner_boost_karma: 0,
        review_owner_boost_count: 0,
        review_marked: false,
        review_rejected: false,
        total_karma: 0,
        total_bust: 0,
    };
}

function _findFeedItemForOptimisticJoin(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return null;
    var pools = [mutualSeeking, mutualPrelaunch, bountyContracts];
    for (var i = 0; i < pools.length; i++) {
        var pool = pools[i];
        if (!Array.isArray(pool)) continue;
        var found = pool.find(function(item) {
            return Number(item && item.app_id) === normalizedId;
        });
        if (found) return found;
    }
    if (typeof window.getMarketCandidateByAppId === 'function') {
        return window.getMarketCandidateByAppId(normalizedId);
    }
    return null;
}

function _buildOptimisticMyTestFromFeedItem(feedItem, options) {
    options = options || {};
    var appId = Number((feedItem && feedItem.app_id) || options.appId || 0);
    if (appId <= 0) return null;
    var today = getLocalDate();
    var isBounty = !!options.isBounty;
    var joinType = String(options.join_type || (isBounty ? 'bounty' : 'mutual')).toLowerCase();
    return {
        reviewRejected: false,
        id: appId,
        real_app_id: appId,
        progress_id: null,
        name: (feedItem && feedItem.name) || '',
        package: (feedItem && feedItem.package_name) || '',
        icon_url: (feedItem && feedItem.icon_url) || '',
        google_group_url: (feedItem && feedItem.google_group_url) || '',
        instructions: (feedItem && feedItem.instructions) || '',
        status: 'new',
        start_date: today,
        owner_id: Number((feedItem && feedItem.owner_id) || 0),
        owner_username: (feedItem && feedItem.owner_username) || '',
        owner_full_name: (feedItem && feedItem.owner_full_name) || '',
        owner_karma: Number((feedItem && feedItem.owner_karma) || 0),
        active_testers_count: Number((feedItem && feedItem.mutual_testers_count) || (feedItem && feedItem.bounty_testers_count) || 0),
        days_since_publish: (feedItem && feedItem.days_since_publish) || null,
        created_at: (feedItem && feedItem.created_at) || null,
        google_sync_day: Number((feedItem && feedItem.google_sync_day) || 0),
        sync_message: (feedItem && feedItem.sync_message) || '',
        sync_notification_sent: false,
        last_owner_activity: (feedItem && feedItem.last_owner_activity) || null,
        checkins_count: 0,
        skips_count: 0,
        last_sync_date: (feedItem && feedItem.last_sync_date) || null,
        testing_days: 1,
        grant_claimed: false,
        progress_status: 'active',
        app_status: 'active',
        is_pending_completion: false,
        join_type: joinType,
        target_lang: (feedItem && feedItem.target_lang) || 'ALL',
        daily_timeline: '',
        archive_reason: null,
        bounty_per_tester: Number((feedItem && feedItem.bounty_per_tester) || 0),
        last_check_date: null,
        issue_reported_at: null,
        issue_reason: '',
        issue_fixed_at: null,
        reciprocal_app_id: null,
        reciprocal_app_name: '',
        reciprocal_app_status: '',
        reciprocal_app_package_name: '',
        reciprocal_app_play_store_url: '',
        run_iteration: 1,
        play_store_url: '',
        has_clicked_store: false,
        request_reviews: true,
        play_feedback_submitted: false,
        rewards_summary: _emptyTestRewardsSummary(),
        play_feedback_submitted_pending: false,
        owner_language: null,
        isTestedToday: false,
        isGrantAvailableTomorrow: false,
        isReadyToClaim: false,
        isEarlyFinish: false,
        is_external: false,
        external_source: '',
        external_package_name: '',
        external_owner_telegram_id: 0,
        external_category: 'APP',
        external_guest_app_id: '',
        external_source_app_id: null,
        added_by_tester_id: 0,
        external_last_completed_control_day: 0,
        external_days_since_last_completed: null,
        external_control_day_due: false,
        mode: isBounty ? 'bounty' : ((feedItem && feedItem.mode) || 'mutual'),
        test_mode: (feedItem && feedItem.test_mode) || 'google_group',
    };
}

function applyOptimisticMyTestJoin(appId, options) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;
    var feedItem = _findFeedItemForOptimisticJoin(normalizedId) || { app_id: normalizedId };
    var optimisticRow = _buildOptimisticMyTestFromFeedItem(feedItem, Object.assign({ appId: normalizedId }, options || {}));
    if (!optimisticRow) return;
    var alreadyExists = (myTests || []).some(function(test) {
        return Number(test && test.id) === normalizedId;
    });
    if (!alreadyExists) {
        myTests = [optimisticRow].concat(Array.isArray(myTests) ? myTests : []);
    }
    _testsLoadedOnce = true;
    _lastFetchTimes.tests = 0;
    persistTestsCacheSnapshot();
    if (typeof renderTests === 'function') {
        renderTests(true);
    }
}

function refreshMyTestsNow() {
    _lastFetchTimes.tests = 0;
    return loadTasks(false);
}

function removeOptimisticMyTest(appId) {
    var normalizedId = Number(appId || 0);
    if (normalizedId <= 0) return;
    myTests = (Array.isArray(myTests) ? myTests : []).filter(function(test) {
        return Number(test && test.id) !== normalizedId;
    });
    persistTestsCacheSnapshot();
    if (typeof renderTests === 'function') {
        renderTests(true);
    }
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
        var isExternal = !!app.is_external;
        var mappedId = isExternal ? (-Math.abs(Number(app.progress_id || 0))) : Number(app.app_id || 0);
        var shouldTreatFastTrackFirstDayAsDone = !!(
            isExternal
            && String(app.external_source || '').trim().toLowerCase() === 'fast_track'
            && String(app.start_date || '') === today
            && !String(app.last_check_date || '').trim()
            && Number(app.testing_days || 0) <= 1
        );
        var status = 'new';
        if (app.last_check_date === today) {
            status = 'done';
        } else if (app.last_check_date && app.last_check_date < today) {
            status = 'daily';
        } else if (app.last_check_date === null) {
            status = 'new';
        }
        if (shouldTreatFastTrackFirstDayAsDone) {
            status = 'done';
        }
        var progressStatus = String(app.progress_status || 'active').toLowerCase();
        var appStatus = String(app.app_status || 'active').toLowerCase();
        var isPendingCompletion = !isExternal && appStatus === 'pending_completion';
        var isArchivedOrCompleted = !isExternal && ((appStatus !== 'active' && !isPendingCompletion) || progressStatus !== 'active');
        var existingTest = myTests.find(function(test) { return Number(test.id) === Number(mappedId); });
        var shouldPreserveLocalDoneToday = !!(
            existingTest
            && existingTest.status === 'done'
            && String(existingTest.last_check_date || '') === today
            && String(app.last_check_date || '') !== today
        );
        if (shouldPreserveLocalDoneToday) {
            status = 'done';
        }
        if (existingTest && existingTest.status === 'opened' && status !== 'done' && !isArchivedOrCompleted && !isPendingCompletion) {
            status = 'opened';
        }
        
        // Computed: archived/completed final-day tests may claim immediately,
        // while active Day 14 done shows "available tomorrow".
        var isTestedToday = status === 'done';
        // For external tests, take the max of the API value and any locally-advanced value so
        // that a proof submission that hasn't propagated to the backend yet doesn't cause the
        // computed field `external_control_day_due` to oscillate between API and local state
        // on every loadTasks() poll (which would force renderTests() on every poll).
        var apiTestingDays = Number(app.testing_days || 0);
        var testingDays = isExternal && existingTest
            ? Math.max(apiTestingDays, Number(existingTest.testing_days || 0))
            : apiTestingDays;
        if (shouldPreserveLocalDoneToday) {
            testingDays = Math.max(testingDays, Number(existingTest.testing_days || 0));
        }
        var skipsCount = countGrantSkips(app);
        if (shouldPreserveLocalDoneToday) {
            skipsCount = Math.max(skipsCount, Number(existingTest.skips_count || 0));
        }
        var resolvedCheckinsCount = shouldPreserveLocalDoneToday
            ? Math.max(Number(app.checkins_count || 0), Number(existingTest.checkins_count || 0))
            : Number(app.checkins_count || 0);
        var resolvedSkipsCount = shouldPreserveLocalDoneToday
            ? Math.max(Number(app.skips_count || 0), Number(existingTest.skips_count || 0))
            : Number(app.skips_count || 0);
        var resolvedDailyTimeline = shouldPreserveLocalDoneToday
            ? (app.daily_timeline || existingTest.daily_timeline || '')
            : (app.daily_timeline || '');
        var resolvedLastCheckDate = shouldPreserveLocalDoneToday
            ? (existingTest.last_check_date || today)
            : (shouldTreatFastTrackFirstDayAsDone ? today : (app.last_check_date || null));
        var isAppClosed = !isExternal && (appStatus !== 'active' && !isPendingCompletion);
        var isTestClosed = !isExternal && (progressStatus !== 'active');
        var actualCheckins = testingDays - skipsCount;
        var canEverClaim = !isExternal && !app.grant_claimed && skipsCount <= 3 && app.progress_id;

        var isGrantAvailableTomorrow = !!(canEverClaim && !isArchivedOrCompleted && !isPendingCompletion && testingDays === 14 && isTestedToday);
        var isReadyToClaim = !!(canEverClaim && (testingDays >= 15 || (isArchivedOrCompleted && testingDays >= 14)));
        var isEarlyFinish = !!((isAppClosed || isTestClosed) && !app.grant_claimed && !isReadyToClaim && !isGrantAvailableTomorrow && testingDays < 14 && actualCheckins >= 3 && skipsCount <= 3);

        if (isArchivedOrCompleted && !isReadyToClaim && !isGrantAvailableTomorrow) {
            status = 'done';
        }        
        return {
            reviewRejected: !!(app && app.rewards_summary && app.rewards_summary.review_rejected),
            id: mappedId,
            real_app_id: Number(app.app_id || 0) || null,
            progress_id: app.progress_id,
            name: app.name,
            package: app.package_name,
            icon_url: app.icon_url,
            google_group_url: app.google_group_url,
            instructions: app.instructions,
            status: status,
            start_date: app.start_date,
            owner_id: Number(app.owner_id || 0),
            owner_username: app.owner_username,
            owner_full_name: app.owner_full_name || '',
            owner_avatar_url: app.owner_avatar_url || null,
            owner_karma: Number(app.owner_karma || 0),
            active_testers_count: app.active_testers_count,
            eligible_testers_count: Number(app.eligible_testers_count || 0),
            days_since_publish: app.days_since_publish,
            created_at: app.created_at || null,
            google_sync_day: app.google_sync_day || 0,
            sync_message: app.sync_message || '',
            sync_notification_sent: !!app.sync_notification_sent,
            last_owner_activity: app.last_owner_activity || null,
            checkins_count: resolvedCheckinsCount,
            skips_count: resolvedSkipsCount,
            last_sync_date: app.last_sync_date || null,
            testing_days: testingDays,
            exact_daily_reward: typeof app.exact_daily_reward !== 'undefined' ? Number(app.exact_daily_reward) : 0,
            grant_claimed: !!app.grant_claimed,
            progress_status: app.progress_status || 'active',
            app_status: app.app_status || 'active',
            is_pending_completion: isPendingCompletion,
            join_type: app.join_type || 'invite',
            target_lang: app.target_lang || 'ALL',
            test_mode: app.test_mode === 'email_list' ? 'email_list' : 'google_group',
            is_setup_completed: app.is_setup_completed !== false,
            daily_timeline: resolvedDailyTimeline,
            archive_reason: app.archive_reason || null,
            bounty_per_tester: app.bounty_per_tester || 0,
            paid_protection_days: Number(app.purchased_protection_days || app.paid_protection_days || 0),
            protection_bust_pool: Number(app.protection_bust_pool || 0),
            consumed_pending_hours: Number(app.consumed_pending_hours || 0),
            pending_completion_started_at: app.pending_completion_started_at || null,
            last_check_date: resolvedLastCheckDate,
            issue_reported_at: app.issue_reported_at || null,
            issue_reason: app.issue_reason || '',
            issue_fixed_at: app.issue_fixed_at || null,
            reciprocal_app_id: app.reciprocal_app_id || null,
            reciprocal_app_name: app.reciprocal_app_name || '',
            reciprocal_app_status: app.reciprocal_app_status || '',
            reciprocal_app_package_name: app.reciprocal_app_package_name || '',
            reciprocal_app_play_store_url: app.reciprocal_app_play_store_url || '',
            run_iteration: Number(app.run_iteration || 1),
            play_store_url: app.play_store_url || '',
            has_clicked_store: existingTest ? !!existingTest.has_clicked_store : false,
            request_reviews: app.request_reviews !== false,
            play_feedback_submitted: !!app.play_feedback_submitted,
            play_review_status: String(app.play_review_status || (app.play_feedback_submitted ? 'pending' : 'none')).toLowerCase(),
            play_review_screenshot_url: app.play_review_screenshot_url || '',
            rewards_summary: (app && typeof app.rewards_summary === 'object' && app.rewards_summary)
                ? {
                    checkin_karma: Number(app.rewards_summary.checkin_karma || 0),
                    review_platform_karma: Number(app.rewards_summary.review_platform_karma || 0),
                    owner_karma_good: Number(app.rewards_summary.owner_karma_good || 0),
                    owner_karma_bug: Number(app.rewards_summary.owner_karma_bug || 0),
                    owner_karma_overtime: Number(app.rewards_summary.owner_karma_overtime || 0),
                    owner_karma_total: Number(app.rewards_summary.owner_karma_total || 0),
                    feedback_karma: Number(app.rewards_summary.feedback_karma || 0),
                    feedback_bust: Number(app.rewards_summary.feedback_bust || 0),
                    review_owner_boost_bust: Number(app.rewards_summary.review_owner_boost_bust || 0),
                    review_owner_boost_karma: Number(app.rewards_summary.review_owner_boost_karma || 0),
                    review_owner_boost_count: Number(app.rewards_summary.review_owner_boost_count || 0),
                    review_marked: !!app.rewards_summary.review_marked,
                    review_rejected: !!app.rewards_summary.review_rejected,
                    total_karma: Number(app.rewards_summary.total_karma || 0),
                    total_bust: Number(app.rewards_summary.total_bust || 0),
                }
                : {
                    checkin_karma: 0,
                    review_platform_karma: 0,
                    owner_karma_good: 0,
                    owner_karma_bug: 0,
                    owner_karma_overtime: 0,
                    owner_karma_total: 0,
                    feedback_karma: 0,
                    feedback_bust: 0,
                    review_owner_boost_bust: 0,
                    review_owner_boost_karma: 0,
                    review_owner_boost_count: 0,
                    review_marked: !!app.play_feedback_submitted,
                    review_rejected: false,
                    total_karma: 0,
                    total_bust: 0,
                },
            play_feedback_submitted_pending: (function() {
                if (!!(app && app.rewards_summary && app.rewards_summary.review_rejected)) return false;
                if (existingTest) {
                    return !!(existingTest.play_feedback_submitted_pending || existingTest.play_feedback_submitted);
                }
                return !!app.play_feedback_submitted;
            })(),
            owner_language: app.owner_language || null,
            isTestedToday: isTestedToday,
            isGrantAvailableTomorrow: isGrantAvailableTomorrow,
            isReadyToClaim: isReadyToClaim,
            isEarlyFinish: isEarlyFinish,
            is_external: isExternal,
            external_source: app.external_source || '',
            external_package_name: app.external_package_name || app.package_name || '',
            external_owner_telegram_id: Number(app.external_owner_telegram_id || app.owner_id || 0),
            external_category: app.external_category || 'APP',
            external_guest_app_id: app.external_guest_app_id || '',
            external_source_app_id: Number(app.external_source_app_id || 0) || null,
            added_by_tester_id: Number(app.added_by_tester_id || 0),
            external_last_completed_control_day: Number(app.external_last_completed_control_day || 0),
            external_days_since_last_completed: app.external_days_since_last_completed === null || typeof app.external_days_since_last_completed === 'undefined'
                ? null
                : Number(app.external_days_since_last_completed || 0),
            external_control_day_due: !!(isExternal && isMandatoryScreenshotDay(testingDays)),
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
        _userEmail = String(data.user_email || '').trim();
        window.App.userEmail = _userEmail;
        var nextTests = _mapTestsFromApi(data);
        var nextOffers = Array.isArray(data.incoming_offers) ? data.incoming_offers : null;

        // Diff: only re-render if changed
        var testsChanged = JSON.stringify(myTests) !== JSON.stringify(nextTests);
        if (testsChanged) {
            myTests = nextTests;
            var pendingHandled = typeof clearCompletedPendingFeedbackCheckins === 'function'
                && clearCompletedPendingFeedbackCheckins();
            if (!pendingHandled) {
                renderTests();
                if (typeof window.renderShowcaseActiveTests === 'function') window.renderShowcaseActiveTests(true);
            }
        } else if (typeof clearCompletedPendingFeedbackCheckins === 'function') {
            clearCompletedPendingFeedbackCheckins();
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
        persistTestsCacheSnapshot();
        _testsLoadedOnce = true;
        _lastFetchTimes.tests = Date.now();
        loadReliabilitySummary(true).catch(function() {});

    } catch (error) {
        console.error('Error loading tasks:', error);
        if (_testsLoadedOnce && myTests.length > 0) {
            // Have data from cache, just show error toast
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'tasks');
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

        mutualSeeking = nextMutual.seeking;
        mutualPrelaunch = nextMutual.prelaunch;
        mutualReturns = nextMutual.returns;
        renderMutualFeed();
        if (window.renderMutualReturns) {
            window.renderMutualReturns(mutualReturns);
        }

        _resolveMarketResponse('mutual', nextCount, hadVisibleData);

        if (!hasMutualCache || changed) {
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
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'mutual_feed');
            showRetry('mutual-seeking-list', 'forceRefreshMarket()');
            showRetry('mutual-prelaunch-list', 'forceRefreshMarket()');
            const returnsContainer = document.getElementById('mutual-returns-container');
            if (returnsContainer) {
                returnsContainer.style.display = '';
                showRetry('mutual-returns-list', 'forceRefreshMarket()');
            }
        } else {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'mutual_feed');
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
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'bounty_feed');
            showRetry('bounty-list', 'forceRefreshMarket()');
        } else {
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'bounty_feed');
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

async function loadProjects(isBackground, force) {
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
    if (isBackground && !force && _projectsLoadedOnce && (Date.now() - (_lastFetchTimes.projects || 0)) < PROJECTS_FETCH_THROTTLE_MS) {
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

function _mapProjectsFromApi(data) {
    return (data.projects || []).map(function(project) {
        var testers = Array.isArray(project.testers) ? project.testers : [];
        var hasAccessError = testers.some(function(tester) {
            return !!tester.issue_reported_at && !tester.issue_fixed_at;
        });
        var isAcceptingNewTesters = project.is_accepting_new_testers !== false;
        var visibilityMode = 'public';
        if (project.is_visible === false && !isAcceptingNewTesters) {
            visibilityMode = 'isolated';
        } else if (project.is_visible === false) {
            visibilityMode = 'hidden_manual';
        }
        var mappedTesters = testers.map(function(tester) {
            return Object.assign({}, tester, {
                progress_id: Number(tester.progress_id || 0),
                tester_id: Number(tester.tester_id || 0),
                avatar_url: tester.avatar_url || null,
                tester_avatar_url: tester.avatar_url || null,
                checkins_count: Number(tester.checkins_count || 0),
                skips_count: Number(tester.skips_count || 0),
                is_external: !!tester.is_external,
                is_guest_tester: !!tester.is_guest_tester,
                external_source: tester.external_source || '',
                external_package_name: tester.external_package_name || '',
                external_guest_app_id: tester.external_guest_app_id || '',
                external_last_completed_control_day: Number(tester.external_last_completed_control_day || 0),
                external_days_since_last_completed: tester.external_days_since_last_completed === null || typeof tester.external_days_since_last_completed === 'undefined'
                    ? null
                    : Number(tester.external_days_since_last_completed || 0),
                reciprocal_app_id: Number(tester.reciprocal_app_id || 0) || null,
                reciprocal_app_name: tester.reciprocal_app_name || '',
                reciprocal_app_status: tester.reciprocal_app_status || '',
                reciprocal_app_package_name: tester.reciprocal_app_package_name || '',
            });
        });
        return {
            id: project.app_id,
            status: hasAccessError ? 'access_error' : (project.status || 'active'),
            app_status: project.status || 'active',
            name: project.name,
            package: project.package_name,
            icon_url: project.icon_url,
            google_group_url: project.google_group_url,
            instructions: project.instructions || '',
            testers: mappedTesters,
            is_visible: project.is_visible !== false,
            is_accepting_new_testers: isAcceptingNewTesters,
            visibility_mode: visibilityMode,
            created_at: project.created_at || null,
            likes: project.likes || [],
            likes_used: project.likes_used || 0,
            likes_max: project.likes_max || 1,
            mode: project.mode || 'mutual',
            test_mode: project.test_mode === 'email_list' ? 'email_list' : 'google_group',
            accepts_email_testers: !!project.accepts_email_testers,
            target_lang: project.target_lang || 'ALL',
            request_reviews: project.request_reviews !== false,
            limit_mutual: project.limit_mutual || 0,
            limit_bounty: project.limit_bounty || 0,
            bounty_per_tester: project.bounty_per_tester || 0,
            google_sync_day: project.google_sync_day || 0,
            sync_message: project.sync_message || '',
            is_setup_completed: project.is_setup_completed !== false,
            last_sync_date: project.last_sync_date || null,
            sync_notification_sent: !!project.sync_notification_sent,
            last_owner_activity: project.last_owner_activity || null,
            published_to_market_at: project.published_to_market_at || null,
            last_mass_invite_at: project.last_mass_invite_at || null,
            last_mass_invite_sent_count: Number(project.last_mass_invite_sent_count || 0),
            run_iteration: Number(project.run_iteration || 1),
            feedback_new_count: project.feedback_new_count || 0,
            feedback_total_count: project.feedback_total_count || 0,
            guest_testers_count: Number(project.guest_testers_count || 0),
            paid_protection_days: Number(project.purchased_protection_days || project.paid_protection_days || 0),
            protection_bust_pool: Number(project.protection_bust_pool || 0),
            consumed_pending_hours: Number(project.consumed_pending_hours || 0),
            pending_completion_started_at: project.pending_completion_started_at || null,
            phase: project.phase || 'testing',
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
        grant_tests_count: data.grant_tests_count || 0,
    };
}

async function _readJsonResponseSafely(response, requestLabel) {
    if (!response) return null;

    var bodyText = '';
    try {
        bodyText = await response.text();
    } catch (error) {
        console.error(String(requestLabel || 'API response') + ' body read failed:', error);
        return null;
    }

    if (!bodyText) {
        return null;
    }

    try {
        return JSON.parse(bodyText);
    } catch (error) {
        console.error(String(requestLabel || 'API response') + ' JSON parse failed:', error, bodyText.slice(0, 400));
        return null;
    }
}

async function _confirmProjectSyncPersistence(appId, expectedDay, expectedMessage) {
    var normalizedAppId = Number(appId || 0);
    var normalizedDay = Number(expectedDay || 0);
    var normalizedMessage = String(expectedMessage || '').trim();
    if (!normalizedAppId || !normalizedDay || !userId) {
        return null;
    }

    await new Promise(function(resolve) {
        setTimeout(resolve, SYNC_CONFIRMATION_DELAY_MS);
    });

    try {
        var response = await fetchWithRetry(API_BASE + '/projects/' + userId, { timeoutMs: 12000 }, 1);
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        var data = await _readJsonResponseSafely(response, 'Project sync confirmation');
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid project sync confirmation payload');
        }

        var freshProjects = _mapProjectsFromApi(data);
        var freshStats = _mapStatsFromApi(data);
        var confirmedProject = freshProjects.find(function(project) {
            return Number(project.id) === normalizedAppId;
        });

        if (confirmedProject) {
            var confirmedDay = Number(confirmedProject.google_sync_day || 0);
            var confirmedMessage = String(confirmedProject.sync_message || '').trim();
            if (confirmedDay === normalizedDay && confirmedMessage === normalizedMessage) {
                myProjects = freshProjects;
                visibilityStats = freshStats;
                _projectsLoadedOnce = true;
                myProjectsLoadError = false;
                _lastFetchTimes.projects = Date.now();
                setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
                return confirmedProject;
            }
        }
    } catch (error) {
        console.error('Project sync confirmation check failed:', error);
    }

    return null;
}

function _markPostSyncRefreshCooldown() {
    var now = Date.now();
    _lastFetchTimes.projects = now;
    _lastFetchTimes.tests = now;
    _lastFetchTimes.offers = now;
    _lastFetchTimes.reliabilitySummary = now;
    _lastFetchTimes.reliabilityBreakdown = now;
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
            _showNonCriticalLoaderToast(getApiErrorMessage(error && error.message, 'networkError'), 'projects');
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

function getProjectVisibilityMode(project) {
    var explicitMode = String(project && project.visibility_mode || '').trim().toLowerCase();
    if (explicitMode === 'full_isolation') {
        return 'isolated';
    }
    if (explicitMode === 'hidden_from_showcase') {
        return 'hidden_manual';
    }
    if (explicitMode === 'visible') {
        return 'public';
    }
    if (explicitMode === 'isolated' || explicitMode === 'hidden_manual' || explicitMode === 'public') {
        return explicitMode;
    }
    if (project && project.is_visible === false && project.is_accepting_new_testers === false) {
        return 'isolated';
    }
    if (project && project.is_visible === false) {
        return 'hidden_manual';
    }
    return 'public';
}

function _applyProjectVisibilityMode(project, nextMode) {
    if (!project) return 'public';
    var normalizedMode = String(nextMode || '').trim().toLowerCase();
    if (normalizedMode !== 'isolated' && normalizedMode !== 'hidden_manual') {
        normalizedMode = 'public';
    }
    project.visibility_mode = normalizedMode;
    project.is_visible = normalizedMode === 'public';
    project.is_accepting_new_testers = normalizedMode !== 'isolated';
    return normalizedMode;
}

function _snapshotProjectVisibility(project) {
    return {
        is_visible: !!(project && project.is_visible),
        is_accepting_new_testers: !(project && project.is_accepting_new_testers === false),
        visibility_mode: getProjectVisibilityMode(project),
    };
}

function _restoreProjectVisibility(project, snapshot) {
    if (!project || !snapshot) return;
    project.is_visible = !!snapshot.is_visible;
    project.is_accepting_new_testers = snapshot.is_accepting_new_testers !== false;
    project.visibility_mode = String(snapshot.visibility_mode || '').trim().toLowerCase() || getProjectVisibilityMode(project);
}

async function setProjectVisibilityMode(appId, nextMode) {
    const project = myProjects.find(function(item) { return Number(item.id) === Number(appId); });
    if (!project) return null;

    const previousState = _snapshotProjectVisibility(project);
    const normalizedMode = _applyProjectVisibilityMode(project, nextMode);
    _syncProjectsUiAfterOptimisticChange();

    try {
        const response = await fetch(`${API_BASE}/projects/${appId}/toggle_visibility`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                owner_id: userId,
                visibility_mode: normalizedMode,
            })
        });
        const result = await _readJsonResponseSafely(response, 'Project visibility update');
        if (!response.ok || !result || result.status !== 'success') {
            throw new Error(getApiErrorMessage(result, 'visibilityUpdateError'));
        }
        _applyProjectVisibilityMode(project, result.visibility_mode || normalizedMode);
        if (typeof result.is_visible !== 'undefined') {
            project.is_visible = result.is_visible !== false;
        }
        if (typeof result.is_accepting_new_testers !== 'undefined') {
            project.is_accepting_new_testers = result.is_accepting_new_testers !== false;
        }
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
        _syncProjectsUiAfterOptimisticChange();
        loadProjects(true).catch(function() {});
        return result;
    } catch (error) {
        console.error('Set project visibility mode error:', error);
        _restoreProjectVisibility(project, previousState);
        _syncProjectsUiAfterOptimisticChange();
        showToast(error && error.message && error.message !== '[object Object]' ? error.message : t.visibilityUpdateError);
        return null;
    }
}

async function toggleVisibility(appId, isVisible) {
    return setProjectVisibilityMode(appId, isVisible ? 'public' : 'hidden_manual');
}

async function saveProjectSync() {
    if (!_syncProjectId) return;
    var syncProjectId = Number(_syncProjectId);
    var actionKey = 'project_sync_' + syncProjectId;
    if (_pendingActions.has(actionKey)) return;

    // Read from new PPC form elements (with fallbacks to old IDs for legacy safety)
    var sliderEl = document.getElementById('ppc-slider');
    var messageInputEl = document.getElementById('ppc-message-input') || document.getElementById('sync-message-input');
    var tipEl = document.getElementById('ppc-tip-value');
    var saveBtn = document.getElementById('ppc-submit-btn') || document.getElementById('sync-save-btn');

    if (!sliderEl || !messageInputEl) {
        // Fallback: old sync-day-input path
        var dayInputLegacy = document.getElementById('sync-day-input');
        if (!dayInputLegacy) return;
        var dayLegacy = Number(dayInputLegacy.value);
        if (!Number.isInteger(dayLegacy) || dayLegacy < 1) {
            showToast(t.syncDayInvalid);
            return;
        }
    }

    var day = sliderEl ? Number(sliderEl.value) : 0;
    var message = String(messageInputEl ? messageInputEl.value || '' : '').trim();
    var tipAmount = tipEl ? Math.max(0, Number(tipEl.textContent) || 0) : 0;

    if (!Number.isInteger(day) || day < 1) {
        showToast(t.syncDayInvalid);
        return;
    }

    // Calculate protection_cost to include in the payload
    var platformDay = sliderEl ? Number(sliderEl.getAttribute('data-platform-day') || 0) : day;
    var alreadyPaid = sliderEl ? Number(sliderEl.getAttribute('data-already-paid') || 0) : 0;
    var gap = Math.max(0, platformDay - day);
    var protectionCost = 0;
    if (typeof _calcProtectionCost === 'function') {
        protectionCost = _calcProtectionCost(gap, alreadyPaid);
    }

    _pendingActions.add(actionKey);
    if (saveBtn) {
        saveBtn.disabled = true;
    }

    try {
        var localProjectBeforeSync = (myProjects || []).find(function(item) {
            return Number(item.id) === Number(syncProjectId);
        }) || null;
        var localTestBeforeSync = (myTests || []).find(function(item) {
            return Number(item.id) === Number(syncProjectId);
        }) || null;
        var currentGoogleDay = localProjectBeforeSync ? Number(localProjectBeforeSync.google_sync_day || 0) : 0;
        var isTopup = (day === currentGoogleDay && tipAmount > 0 && protectionCost === 0);
        var response = null;
        var data = null;
        var requestError = null;
        try {
            if (isTopup) {
                response = await fetch(`${API_BASE}/projects/${syncProjectId}/topup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        owner_id: Number(userId),
                        tip_amount: tipAmount,
                    })
                });
            } else {
                response = await fetch(`${API_BASE}/projects/${syncProjectId}/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        google_sync_day: day,
                        sync_message: message,
                        protection_cost: protectionCost,
                        tip_amount: tipAmount,
                    })
                });
            }
        } catch (error) {
            requestError = error;
        }

        if (response) {
            data = await _readJsonResponseSafely(response, isTopup ? 'Project topup' : 'Project sync');
        }

        var confirmedProject = null;
        if (requestError || !response || !response.ok || !data || data.status !== 'success') {
            if (isTopup) {
                if (data && typeof data === 'object' && data.status && data.status !== 'success') {
                    handleApiError(getBackendErrorCode(data), data.details || {});
                } else if (requestError) {
                    console.error('Project topup request error:', requestError);
                    showToast(getApiErrorMessage(requestError && requestError.message, 'networkError'));
                } else if (response && !response.ok) {
                    showToast(getApiErrorMessage(data, 'loadError'));
                } else {
                    showToast(getApiErrorMessage(null, 'networkError'));
                }
                return;
            }

            confirmedProject = await _confirmProjectSyncPersistence(syncProjectId, day, message);
            if (!confirmedProject) {
                if (data && typeof data === 'object' && data.status && data.status !== 'success') {
                    handleApiError(getBackendErrorCode(data), data.details || {});
                } else if (requestError) {
                    console.error('Project sync request error:', requestError);
                    showToast(getApiErrorMessage(requestError && requestError.message, 'networkError'));
                } else if (response && !response.ok) {
                    showToast(getApiErrorMessage(data, 'loadError'));
                } else {
                    showToast(getApiErrorMessage(null, 'networkError'));
                }
                return;
            }

            data = {
                status: 'success',
                google_sync_day: confirmedProject.google_sync_day,
                sync_message: confirmedProject.sync_message,
                last_sync_date: confirmedProject.last_sync_date,
                sync_notification_sent: !!confirmedProject.sync_notification_sent,
                resumed_from_pending: false,
            };
        }

        var today = getLocalDate();
        var resolvedSyncDay = confirmedProject ? Number(confirmedProject.google_sync_day || day) : day;
        var resolvedSyncMessage = confirmedProject ? String(confirmedProject.sync_message || '') : message;
        var resolvedLastSyncDate = confirmedProject
            ? (confirmedProject.last_sync_date || today)
            : (data.last_sync_date || today);
        var resolvedSyncNotificationSent = confirmedProject
            ? !!confirmedProject.sync_notification_sent
            : (data.sync_notification_sent !== false);
        var resumedFromPending = !!(data && data.resumed_from_pending);
        if (!resumedFromPending && confirmedProject) {
            var wasPendingBeforeSync = !!(
                (localProjectBeforeSync && localProjectBeforeSync.app_status === 'pending_completion')
                || (localTestBeforeSync && localTestBeforeSync.app_status === 'pending_completion')
            );
            resumedFromPending = wasPendingBeforeSync && String(confirmedProject.app_status || '') === 'active';
        }
        _startPostSyncToastSuppression();

        var totalCharged = isTopup ? tipAmount : (protectionCost + tipAmount);
        if (totalCharged > 0 && visibilityStats && typeof visibilityStats.balance_bust !== 'undefined') {
            visibilityStats.balance_bust = Math.max(0, visibilityStats.balance_bust - totalCharged);
        }

        _runBestEffortUiStep('Project sync local project update', function() {
            const project = (myProjects || []).find(function(item) {
                return Number(item.id) === Number(syncProjectId);
            });
            if (!project) return;
            if (!isTopup) {
                project.google_sync_day = resolvedSyncDay;
                project.sync_message = resolvedSyncMessage;
                project.last_sync_date = resolvedLastSyncDate;
                project.sync_notification_sent = resolvedSyncNotificationSent;
                if (resumedFromPending) {
                    project.status = 'active';
                    project.app_status = 'active';
                }
            }
            if (data && typeof data.protection_bust_pool !== 'undefined') {
                project.protection_bust_pool = Number(data.protection_bust_pool || 0);
            }
            if (data && typeof data.purchased_protection_days !== 'undefined') {
                project.purchased_protection_days = Number(data.purchased_protection_days || 0);
            }
        });

        _runBestEffortUiStep('Project sync local test update', function() {
            (myTests || []).forEach(function(test) {
                if (Number(test.id) !== Number(syncProjectId)) return;
                if (!isTopup) {
                    test.google_sync_day = resolvedSyncDay;
                    test.sync_message = resolvedSyncMessage;
                    test.last_sync_date = resolvedLastSyncDate;
                    test.sync_notification_sent = resolvedSyncNotificationSent;
                    if (resumedFromPending) {
                        test.app_status = 'active';
                        recomputeLocalTestState(test);
                    }
                }
                if (data && typeof data.protection_bust_pool !== 'undefined') {
                    test.protection_bust_pool = Number(data.protection_bust_pool || 0);
                }
                if (data && typeof data.purchased_protection_days !== 'undefined') {
                    test.purchased_protection_days = Number(data.purchased_protection_days || 0);
                }
            });
        });

        _runBestEffortUiStep('Project sync cache update', function() {
            setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
            persistTestsCacheSnapshot();
        });
        _markPostSyncRefreshCooldown();
        _runBestEffortUiStep('Project sync render projects', function() { renderProjects(true); });
        _runBestEffortUiStep('Project sync render tests', function() { renderTests(true); });
        _runBestEffortUiStep('Project sync refresh modals', function() { refreshOpenModals(); });

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        showToast(isTopup ? (t.ppcTopupSuccessToast || 'Protection pool topped up successfully!') : t.syncSavedToast);
        loadProjects(true).catch(function() {});

        _runBestEffortUiStep('Project sync close view', function() {
            if (typeof closeProtectionCenter === 'function') {
                closeProtectionCenter();
            } else if (typeof closeSyncModal === 'function') {
                closeSyncModal();
            }
        });
    } finally {
        _pendingActions.delete(actionKey);
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }
}

async function savePpcTopUp() {
    if (!_syncProjectId) return;
    var syncProjectId = Number(_syncProjectId);
    var actionKey = 'project_topup_' + syncProjectId;
    if (_pendingActions.has(actionKey)) return;

    var amountEl = document.getElementById('ppc-topup-amount');
    var submitBtn = document.getElementById('ppc-topup-submit-btn');
    if (!amountEl) return;

    var tipAmount = Math.max(0, Number(amountEl.textContent) || 0);
    if (tipAmount <= 0) return;

    _pendingActions.add(actionKey);
    if (submitBtn) submitBtn.disabled = true;

    try {
        var response = await fetch(API_BASE + '/projects/' + syncProjectId + '/topup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner_id: Number(userId), tip_amount: tipAmount })
        });

        var data = null;
        try { data = await response.json(); } catch(e) {}

        if (!response.ok || !data || data.status !== 'success') {
            if (data && data.status && data.status !== 'success') {
                handleApiError(getBackendErrorCode(data), data.details || {});
            } else {
                showToast(getApiErrorMessage(null, 'networkError'));
            }
            return;
        }

        // Debit balance locally
        if (visibilityStats && typeof visibilityStats.balance_bust !== 'undefined') {
            visibilityStats.balance_bust = Math.max(0, visibilityStats.balance_bust - tipAmount);
        }

        // Update protection_bust_pool in local project/test caches
        _runBestEffortUiStep('Topup local project update', function() {
            var project = (myProjects || []).find(function(item) { return Number(item.id) === syncProjectId; });
            if (project && typeof data.protection_bust_pool !== 'undefined') {
                project.protection_bust_pool = Number(data.protection_bust_pool || 0);
            }
        });
        _runBestEffortUiStep('Topup local test update', function() {
            (myTests || []).forEach(function(test) {
                if (Number(test.id) !== syncProjectId) return;
                if (typeof data.protection_bust_pool !== 'undefined') {
                    test.protection_bust_pool = Number(data.protection_bust_pool || 0);
                }
            });
        });
        _runBestEffortUiStep('Topup cache update', function() {
            setProjectsCache({ projects: myProjects, visibilityStats: visibilityStats, ts: Date.now() });
            persistTestsCacheSnapshot();
        });
        _runBestEffortUiStep('Topup render projects', function() { renderProjects(true); });
        _runBestEffortUiStep('Topup render tests', function() { renderTests(true); });
        _runBestEffortUiStep('Topup refresh modals', function() { refreshOpenModals(); });

        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        if (typeof closePpcTopUpModal === 'function') closePpcTopUpModal();
        showToast(t.ppcTopupSuccessToast || 'Protection pool topped up!');

        loadProjects(true).catch(function() {});
    } finally {
        _pendingActions.delete(actionKey);
        if (submitBtn) submitBtn.disabled = false;
    }
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
                run_iteration: Number(project.run_iteration || 1),
                feedback_new_count: project.feedback_new_count || 0,
                feedback_total_count: project.feedback_total_count || 0,
                archive_reason: project.archive_reason || null,
            });
        });
        _lastFetchTimes.archived = Date.now();
        renderArchivedProjects();
        // Pipeline: archived payload may contain phase === 'moderation' projects that
        // belong on the main screen's moderation panel, not in the archive list.
        // renderProjects() reads `archivedProjects` too, so it must re-run whenever
        // this data changes, otherwise the moderation panel never appears until some
        // unrelated action happens to trigger a re-render.
        if (typeof renderProjects === 'function') renderProjects(true);
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

async function confirmDeleteProject() {
    if (!projectToDelete) return;

    const message = document.getElementById('delete-message').value.trim();
    const id = projectToDelete;
    const overtimeSelectedInput = document.querySelector('input[name="delete-overtime-tester"]:checked');
    const selectedOvertimeTester = overtimeSelectedInput ? overtimeSelectedInput.value : '';
    const btn = document.getElementById('t-confirmDeleteBtn');
    const originalText = btn.innerText;
    btn.innerText = '...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/projects/${id}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                overtime_reward_user_id: selectedOvertimeTester ? Number(selectedOvertimeTester) : null,
            })
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
        } else {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
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

function _saveProjectAlert(message) {
    if (tg.showAlert) tg.showAlert(message);
    else alert(message);
}

async function saveProject() {
    _clearProjectPackageError();
    _clearAddFieldErrors();

    const nameInput = document.getElementById('app-name').value.trim();
    let packageInput = document.getElementById('app-package').value.trim();
    const iconInput = document.getElementById('app-icon').value.trim();
    const instructionsInput = document.getElementById('app-instructions').value.trim();
    const targetLang = (document.getElementById('app-target-lang').value || 'ALL').toUpperCase();
    const requestReviews = !!(document.getElementById('app-request-reviews') && document.getElementById('app-request-reviews').checked);

    const emailMode = !!(window.addProjectFlow && window.addProjectFlow.emailMode);
    const isStandard = document.getElementById('seg-standard').classList.contains('active');
    const acceptsBox = document.getElementById('app-accepts-email-testers');
    const acceptsEmailTesters = !!(acceptsBox && acceptsBox.checked);
    const testerEmailInput = (document.getElementById('app-tester-email').value || '').trim();

    // ── Stage 1: valid Google Play link (name is optional) ──
    if (!packageInput.includes('play.google.com/store/apps/details?id=')) {
        _markAddFieldError(document.getElementById('app-package'));
        _showProjectPackageError('invalidPlayLink');
        _focusAddError(document.getElementById('app-package'));
        return;
    }

    // Derive the package id early so it can serve as a name fallback (item 6).
    let packageIdForName = packageInput;
    try {
        if (packageInput.includes('play.google.com')) {
            const parsedId = new URL(packageInput).searchParams.get('id');
            if (parsedId) packageIdForName = parsedId;
        }
    } catch (e) { /* noop */ }

    let finalName = nameInput;
    if (!finalName) {
        const nameEl = document.getElementById('app-name');
        const hintEl = document.getElementById('app-name-hint');
        if (!(window.addProjectFlow && window.addProjectFlow.namePromptShown)) {
            // First save attempt without a name: focus the field and ask to confirm the fallback.
            if (window.addProjectFlow) window.addProjectFlow.namePromptShown = true;
            if (hintEl) {
                hintEl.textContent = window.t('appNameOptionalHint', { package: packageIdForName }, lang);
                hintEl.style.display = '';
            }
            _focusAddError(nameEl);
            return;
        }
        // Acknowledged: fall back to the package id as the project name.
        finalName = packageIdForName;
    }
    if (finalName.length > 30) {
        _markAddFieldError(document.getElementById('app-name'));
        _saveProjectAlert(t.appNameTooLong);
        _focusAddError(document.getElementById('app-name'));
        return;
    }

    // ── Stage 2: access setup ──
    let groupUrl = null;
    if (emailMode) {
        groupUrl = null;
    } else if (isStandard) {
        if (!isAddChecklistComplete()) {
            _markChecklistErrors();
            _saveProjectAlert(window.t('completeChecklistError', {}, lang));
            _focusAddError(document.querySelector('#setup-checklist .field-error') || document.getElementById('setup-checklist'));
            return;
        }
        groupUrl = window.DEFAULT_GOOGLE_GROUP_URL || 'https://groups.google.com/g/google-play-dev-test';
    } else {
        const customUrl = (document.getElementById('app-group').value || '').trim();
        if (!customUrl) {
            _markAddFieldError(document.getElementById('app-group'));
            _saveProjectAlert(window.t('customGroupRequired', {}, lang));
            _focusAddError(document.getElementById('app-group'));
            return;
        }
        if (!isValidGoogleGroupUrl(customUrl)) {
            _markAddFieldError(document.getElementById('app-group'));
            handleApiError('invalid_google_group_url');
            _focusAddError(document.getElementById('app-group'));
            return;
        }
        groupUrl = customUrl;
    }

    // ── Stage 3: optional tester email ──
    if (acceptsEmailTesters) {
        if (!testerEmailInput) {
            _markAddFieldError(document.getElementById('app-tester-email'));
            _saveProjectAlert(window.t('testerEmailRequired', {}, lang));
            _focusAddError(document.getElementById('app-tester-email'));
            return;
        }
        if (!isValidEmail(testerEmailInput)) {
            _markAddFieldError(document.getElementById('app-tester-email'));
            _saveProjectAlert(window.t('invalidEmail', {}, lang));
            _focusAddError(document.getElementById('app-tester-email'));
            return;
        }
    }

    const pricingPayload = buildProjectPricingPayload('add');
    if (!pricingPayload) return;

    try {
        if (packageInput.includes('play.google.com')) {
            const url = new URL(packageInput);
            const idParam = url.searchParams.get('id');
            if (idParam) packageInput = idParam;
        }
    } catch (error) {
        console.error('Play URL parse error:', error);
    }

    // Item 8: keep the client-side email state in sync so the Mass Invite gate
    // does not re-prompt for an email the user just saved during project creation.
    if (acceptsEmailTesters && testerEmailInput) {
        try {
            window.App.userEmail = testerEmailInput;
            if (window.App && window.App.state) window.App.state._userEmail = testerEmailInput;
        } catch (e) { /* noop */ }
    }

    await doSaveProject({
        owner_id: userId,
        name: finalName,
        package_name: packageInput,
        icon_url: iconInput || null,
        google_group_url: groupUrl,
        instructions: instructionsInput || null,
        target_lang: targetLang,
        request_reviews: requestReviews,
        test_mode: emailMode ? 'email_list' : 'google_group',
        is_setup_completed: (emailMode || (groupUrl && groupUrl !== 'https://groups.google.com/g/google-play-dev-test')) ? true : false,
        accepts_email_testers: acceptsEmailTesters,
        tester_email: acceptsEmailTesters ? testerEmailInput : null,
        ...pricingPayload
    });
}

function _focusAddError(el) {
    if (!el) return;
    try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) { /* noop */ }
    setTimeout(function () {
        try { if (typeof el.focus === 'function') el.focus({ preventScroll: true }); } catch (e2) { /* noop */ }
    }, 250);
}

async function confirmEmailWarning() {
    document.getElementById('email-warning-modal').classList.remove('active');
    if (pendingProjectData) {
        await doSaveProject(pendingProjectData);
        pendingProjectData = null;
    }
}

async function _confirmProjectCreationPersistence(projectData) {
    var normalizedPackage = String(projectData && projectData.package_name || '').trim();
    if (!userId || !normalizedPackage) return null;

    try {
        var response = await fetchWithRetry(`${API_BASE}/projects/${userId}`, {
            timeoutMs: 10000
        }, 1);
        if (!response.ok) return null;
        var payload = await response.json();
        var projects = Array.isArray(payload && payload.projects) ? payload.projects : [];
        return projects.find(function(project) {
            return String(project && project.package_name || '').trim() === normalizedPackage;
        }) || null;
    } catch (error) {
        console.warn('Project create persistence check failed:', error);
        return null;
    }
}

async function doSaveProject(projectData) {
    const saveBtn = document.getElementById('t-save');
    const originalText = saveBtn.innerText;
    saveBtn.innerText = '...';
    saveBtn.disabled = true;
    _clearProjectPackageError();
    try {
        var leadInviterId = _getLeadInviteInviterId();
        var response = null;
        var result = null;
        var requestError = null;
        var requestBody = Object.assign({}, projectData, {
            lead_inviter_id: leadInviterId > 0 ? leadInviterId : null,
            init_data: tg.initData || '',
        });

        try {
            response = await fetch(`${API_BASE}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });
        } catch (error) {
            requestError = error;
        }

        if (response) {
            result = await _readJsonResponseSafely(response, 'Project create');
            if (getBackendErrorCode(result) === 'username_required') {
                showNoUsernameOverlay();
                return;
            }
        }

        if (requestError || !response || !response.ok || !result || result.status !== 'success') {
            var confirmedProject = await _confirmProjectCreationPersistence(projectData);
            if (confirmedProject) {
                result = {
                    status: 'success',
                    app_id: Number(confirmedProject.app_id || confirmedProject.id || 0),
                };
            }
        }

        if (result && result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (leadInviterId > 0) {
                _clearStartappQueryParam();
            }
            _clearProjectPackageError();
            closeModal();
            loadProjects();
        } else {
            var backendCode = getBackendErrorCode(result);
            if (backendCode === 'external_tracking_merge_required') {
                var externalCount = Number(result && result.details && result.details.external_testers_count || 0);
                var mergeMessage = window.t('externalMergeProjectConfirm', {
                    count: externalCount,
                    package_name: String(projectData && projectData.package_name || ''),
                }, lang);
                var confirmed = await new Promise(function(resolve) {
                    if (tg.showConfirm) {
                        tg.showConfirm(mergeMessage, function(ok) { resolve(!!ok); });
                    } else {
                        resolve(window.confirm(mergeMessage));
                    }
                });
                if (confirmed) {
                    await doSaveProject(Object.assign({}, projectData, { allow_external_merge: true }));
                }
                return;
            }
            if (_handleProjectCreateConflict(backendCode)) {
                return;
            }
            handleApiError(backendCode, result && result.details ? result.details : {});
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
    const accessPayload = (window.AccessSetupManager && typeof window.AccessSetupManager.getEditPayload === 'function')
        ? window.AccessSetupManager.getEditPayload()
        : null;
    const accessMode = accessPayload ? String(accessPayload.mode || '') : '';
    const fallbackEditEmailMode = !!(window.editProjectFlow && window.editProjectFlow.emailMode);
    const fallbackGroupUrl = fallbackEditEmailMode ? '' : document.getElementById('edit-group').value.trim();
    const editEmailMode = accessPayload ? (String(accessPayload.test_mode || '') === 'email_list') : fallbackEditEmailMode;
    const googleGroupUrl = accessPayload
        ? String(accessPayload.google_group_url || '').trim()
        : fallbackGroupUrl;
    const targetLang = (document.getElementById('edit-target-lang').value || 'ALL').toUpperCase();
    const requestReviews = !!(document.getElementById('edit-request-reviews') && document.getElementById('edit-request-reviews').checked);
    const pricingPayload = buildProjectPricingPayload('edit');
    if (!pricingPayload) return;

    if (!name) {
        if (tg.showAlert) tg.showAlert(t.fillFields);
        else alert(t.fillFields);
        return;
    }

    if (accessPayload && !accessPayload.canSave) {
        _saveProjectAlert(window.t('completeChecklistError', {}, lang));
        if (typeof window.updateEditSaveButtonState === 'function') {
            window.updateEditSaveButtonState();
        }
        return;
    }

    const acceptsBox = document.getElementById('edit-app-accepts-email-testers');
    const acceptsEmailTesters = !!(acceptsBox && acceptsBox.checked);
    const testerEmailInput = (document.getElementById('edit-app-tester-email').value || '').trim();

    if (acceptsEmailTesters) {
        if (!testerEmailInput) {
            _saveProjectAlert(window.t('testerEmailRequired', {}, lang));
            return;
        }
        if (!isValidEmail(testerEmailInput)) {
            _saveProjectAlert(window.t('invalidEmail', {}, lang));
            return;
        }
    }

    if (accessMode === 'custom_group' && !googleGroupUrl) {
        _saveProjectAlert(window.t('customGroupRequired', {}, lang));
        return;
    }

    if (!editEmailMode && googleGroupUrl && !isValidGoogleGroupUrl(googleGroupUrl)) {
        handleApiError('invalid_google_group_url');
        return;
    }

    const resolvedGoogleGroupUrl = editEmailMode
        ? null
        : (accessMode === 'custom_group'
            ? googleGroupUrl
            : (window.DEFAULT_GOOGLE_GROUP_URL || googleGroupUrl));

    if (acceptsEmailTesters && testerEmailInput) {
        try {
            window.App.userEmail = testerEmailInput;
            if (window.App && window.App.state) window.App.state._userEmail = testerEmailInput;
        } catch (e) { /* noop */ }
    }

    const editBtn = document.getElementById('t-editSave');
    const originalText = editBtn.innerText;
    editBtn.innerText = '...';
    editBtn.disabled = true;

    const project = (myProjects || []).find(item => Number(item.id) === Number(projectToEdit));
    let isSetupCompleted = project ? !!project.is_setup_completed : false;
    if (window.AccessSetupManager) {
        var flow = window.AccessSetupManager.getEditFlow();
        if (flow.uiMode === 'edit') {
            if (flow.mode === 'email_list' || flow.mode === 'custom_group') {
                isSetupCompleted = true;
            } else if (flow.mode === 'standard_group') {
                isSetupCompleted = window.AccessSetupManager.isChecklistComplete();
            }
        }
    }

    try {
        const response = await fetch(`${API_BASE}/projects/${projectToEdit}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                instructions: instructions || null,
                icon_url: iconUrl || null,
                google_group_url: resolvedGoogleGroupUrl,
                test_mode: editEmailMode ? 'email_list' : 'google_group',
                target_lang: targetLang,
                request_reviews: requestReviews,
                accepts_email_testers: acceptsEmailTesters,
                tester_email: acceptsEmailTesters ? testerEmailInput : null,
                is_setup_completed: isSetupCompleted,
                ...pricingPayload
            })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (typeof window.markEditModalSavedState === 'function') {
                window.markEditModalSavedState();
            }
            if (typeof window.closeEditUnsavedModal === 'function') {
                window.closeEditUnsavedModal();
            }
            if (typeof window.consumeEditSaveAndCloseRequest === 'function') {
                window.consumeEditSaveAndCloseRequest();
            }
            closeEditModal(null, { force: true });
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
        if (typeof window.updateEditSaveButtonState === 'function') {
            window.updateEditSaveButtonState();
        }
    }
}

/* ── Pipeline API wrappers (Sprint 2) ─────────────────────────────────────── */

/**
 * Ask backend to check Google Play and, if published, transition project → 'live'.
 * Returns { ok: true } on 2xx success, or { ok: false, message: string } on 4xx/error.
 */
async function apiPipelineRequestLive(appId) {
    try {
        var url = `${API_BASE}/api/pipeline/request-live`.replace('/api/api/', '/api/');
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: Number(appId), owner_id: Number(userId) })
        });
        var data = await response.json();
        if (response.ok && data.status === 'success') {
            return { ok: true, data: data };
        }
        var msg = (data && (data.message || data.error)) || null;
        return { ok: false, message: msg };
    } catch (err) {
        console.error('[apiPipelineRequestLive] network error:', err);
        return { ok: false, message: null };
    }
}

/**
 * Ask backend to perform a Soft Reset: transition project 'moderation' → 'testing'.
 * Returns { ok: true } on success, or { ok: false, message: string } on error.
 */
async function apiPipelineRequestRetest(appId) {
    try {
        var url = `${API_BASE}/api/pipeline/request-retest`.replace('/api/api/', '/api/');
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: Number(appId), owner_id: Number(userId) })
        });
        var data = await response.json();
        if (response.ok && data.status === 'success') {
            return { ok: true, data: data };
        }
        var msg = (data && (data.message || data.error)) || null;
        return { ok: false, message: msg };
    } catch (err) {
        console.error('[apiPipelineRequestRetest] network error:', err);
        return { ok: false, message: null };
    }
}

/**
 * Ask backend to delete/abandon the project that is currently in moderation.
 * Returns { ok: true } on success, or { ok: false, message: string } on error.
 */
async function apiPipelineDeleteProject(appId) {
    try {
        var url = `${API_BASE}/api/pipeline/delete-project`.replace('/api/api/', '/api/');
        var response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: Number(appId), owner_id: Number(userId) })
        });
        var data = await response.json();
        if (response.ok && data.status === 'success') {
            return { ok: true, data: data };
        }
        var msg = (data && (data.message || data.error)) || null;
        return { ok: false, message: msg };
    } catch (err) {
        console.error('[apiPipelineDeleteProject] network error:', err);
        return { ok: false, message: null };
    }
}

window.apiPipelineRequestLive   = apiPipelineRequestLive;
window.apiPipelineRequestRetest = apiPipelineRequestRetest;
window.apiPipelineDeleteProject = apiPipelineDeleteProject;
