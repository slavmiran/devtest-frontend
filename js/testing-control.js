/* Phase 5 — owner Testing Control, lazy screenshot Gallery, secure preview. */

(function () {
    'use strict';

    var state = {
        appId: 0,
        archived: false,
        project: null,
        items: [],
        nextCursor: null,
        loading: false,
        focusProgressId: 0,
        activeTab: 'testers',
        galleryItems: [],
        galleryNextCursor: null,
        galleryLoading: false,
        galleryFilters: { days: [], brands: [], models: [], android_versions: [] },
        gallerySelected: { day: '', brand: '', model: '', android_version: '' },
        thumbnailObserver: null,
        previewProofId: 0,
        previewMode: '',
        previewMediaCache: new Map(),
        previewMediaCacheBytes: 0,
    };

    var PREVIEW_CACHE_MAX_ITEMS = 3;
    var PREVIEW_CACHE_MAX_BYTES = 12 * 1024 * 1024;

    function enabled() {
        return !!(window.App && window.App.testingControlEnabled === true);
    }

    function galleryEnabled() {
        return !!(enabled() && window.App && window.App.checkinProofGalleryEnabled === true);
    }

    function text(key, fallback, params) {
        if (typeof window.t === 'function') {
            var translated = window.t(key, params || {}, typeof lang !== 'undefined' ? lang : undefined);
            if (translated && translated !== key) return translated;
        }
        return fallback;
    }

    function escape(value) {
        return window.escapeHTML ? window.escapeHTML(String(value == null ? '' : value)) : String(value == null ? '' : value);
    }

    function secureMediaUrl(path) {
        var value = String(path || '').trim();
        if (!value) return '';
        if (/^https:\/\//i.test(value)) return value;
        var base = String(API_BASE || '').replace(/\/api\/?$/i, '').replace(/\/$/, '');
        return base + (value.charAt(0) === '/' ? value : '/' + value);
    }

    function clearPreviewMediaCache() {
        state.previewMediaCache.forEach(function (item) {
            if (item && item.url) URL.revokeObjectURL(item.url);
        });
        state.previewMediaCache.clear();
        state.previewMediaCacheBytes = 0;
    }

    function previewMediaCacheGet(proofId) {
        var key = Number(proofId || 0);
        var item = state.previewMediaCache.get(key);
        if (!item) return '';
        if (item.expiresAt && item.expiresAt <= Date.now()) {
            state.previewMediaCache.delete(key);
            state.previewMediaCacheBytes -= Number(item.bytes || 0);
            URL.revokeObjectURL(item.url);
            return '';
        }
        state.previewMediaCache.delete(key);
        state.previewMediaCache.set(key, item);
        return item.url;
    }

    function previewMediaCachePut(proofId, blob, expiresAt) {
        var key = Number(proofId || 0);
        var bytes = Number(blob && blob.size || 0);
        if (key <= 0 || !blob || bytes <= 0 || bytes > PREVIEW_CACHE_MAX_BYTES) return '';
        var existing = state.previewMediaCache.get(key);
        if (existing) {
            state.previewMediaCacheBytes -= Number(existing.bytes || 0);
            URL.revokeObjectURL(existing.url);
        }
        var item = {
            url: URL.createObjectURL(blob),
            bytes: bytes,
            expiresAt: Number(expiresAt || 0),
        };
        state.previewMediaCache.delete(key);
        state.previewMediaCache.set(key, item);
        state.previewMediaCacheBytes += bytes;
        while (state.previewMediaCache.size > PREVIEW_CACHE_MAX_ITEMS || state.previewMediaCacheBytes > PREVIEW_CACHE_MAX_BYTES) {
            var oldest = state.previewMediaCache.entries().next().value;
            if (!oldest) break;
            state.previewMediaCache.delete(oldest[0]);
            state.previewMediaCacheBytes -= Number(oldest[1].bytes || 0);
            URL.revokeObjectURL(oldest[1].url);
        }
        return item.url;
    }

    function renderTabs() {
        if (!galleryEnabled()) return '';
        return '<div class="testing-control-tabs" role="tablist">' +
            '<button type="button" class="testing-control-tab' + (state.activeTab === 'testers' ? ' is-active' : '') + '" onclick="setTestingControlTab(\'testers\')">' + escape(text('testingControlTestersTab', 'Testers')) + '</button>' +
            '<button type="button" class="testing-control-tab' + (state.activeTab === 'gallery' ? ' is-active' : '') + '" onclick="setTestingControlTab(\'gallery\')">' + escape(text('testingControlGalleryTab', 'Gallery')) + '</button>' +
        '</div>';
    }

    function renderHeader() {
        var project = state.project || {};
        var appName = String(project.name || '').trim() || text('unknownLabel', 'Project');
        return '<div class="testing-control-header">' +
                '<button type="button" class="testing-control-back" onclick="closeTestingControl()" aria-label="' + escape(text('back', 'Back')) + '">‹</button>' +
                '<div class="testing-control-heading">' +
                    '<div class="testing-control-title">' + escape(appName) + '</div>' +
                    '<div class="testing-control-subtitle">' + escape(text('testingControlTitle', 'Testing Control')) + '</div>' +
                '</div>' +
                '<span class="testing-control-run">R' + Number(project.run_iteration || 1) + '</span>' +
            '</div>' + renderTabs();
    }

    function projectFromCache(appId) {
        var active = (typeof myProjects !== 'undefined' ? myProjects : []).find(function (item) {
            return Number(item && (item.id || item.app_id)) === Number(appId);
        });
        if (active) return { project: active, archived: false };
        var archived = (typeof archivedProjects !== 'undefined' ? archivedProjects : []).find(function (item) {
            return Number(item && (item.app_id || item.id)) === Number(appId);
        });
        return archived ? { project: archived, archived: true } : null;
    }

    function buildTestingControlEntryButton(appId, isArchived) {
        if (!enabled()) return '';
        return '<button type="button" class="btn btn-secondary testing-control-entry" ' +
            'onclick="openTestingControl(' + Number(appId || 0) + ', { archived: ' + (!!isArchived) + ' }); event.stopPropagation();">' +
            '<span class="testing-control-entry__icon" aria-hidden="true">◎</span>' +
            '<span>' + escape(text('testingControlEntry', 'Testing Control')) + '</span>' +
        '</button>';
    }

    function proofLabel(type) {
        var labels = {
            screenshot: text('testingControlProofScreenshot', 'Screenshot'),
            bug: text('testingControlProofBug', 'Bug'),
            idea: text('testingControlProofIdea', 'Idea'),
            play_review: text('testingControlProofReview', 'Play Review'),
            legacy: text('testingControlProofLegacy', 'Proof was not recorded'),
            unavailable: text('testingControlProofUnavailable', 'Proof unavailable'),
        };
        return labels[type] || labels.unavailable;
    }

    function proofGlyph(type) {
        return ({ screenshot: '▣', bug: 'B', idea: 'I', play_review: 'R', legacy: '·', unavailable: '!' })[type] || '!';
    }

    function stateLabel(day) {
        var stateName = String(day && day.state || 'future');
        if (stateName === 'checked' || stateName === 'checked_overtime') return text('testingControlStateChecked', 'Checked');
        if (stateName === 'skipped' || stateName === 'skipped_overtime') return text('testingControlStateSkipped', 'Skipped');
        if (stateName === 'pending') return text('testingControlStatePending', 'Pending');
        if (stateName === 'paused') return text('testingControlStatePaused', 'Paused');
        return text('testingControlStateFuture', 'Upcoming');
    }

    function renderDay(day, appId) {
        var proof = day && day.proof;
        var proofType = String(proof && proof.type || '');
        var stateName = String(day && day.state || 'future');
        var classes = 'testing-control-day is-' + escape(stateName);
        if (proofType) classes += ' has-proof proof-' + escape(proofType);
        var title = text('testingControlDayAria', 'Day {day}: {state}', {
            day: Number(day && day.day || 0),
            state: stateLabel(day),
        });
        var action = '';
        if (proof && proofType !== 'legacy') {
            action = ' onclick="openTestingControlProof(' + Number(appId || 0) + ', ' + Number(proof.id || 0) + ')"';
        }
        return '<button type="button" class="' + classes + '" title="' + escape(title) + '"' + action + '>' +
            '<span class="testing-control-day__number">' + Number(day && day.day || 0) + '</span>' +
            (proofType ? '<span class="testing-control-day__proof" aria-label="' + escape(proofLabel(proofType)) + '">' + escape(proofGlyph(proofType)) + '</span>' : '') +
        '</button>';
    }

    function deviceLine(device) {
        var parts = ['android_version', 'brand', 'model'].map(function (key) {
            return String(device && device[key] || '').trim();
        }).filter(Boolean);
        return parts.join(' • ');
    }

    function testerLabel(item) {
        var tester = item && item.tester || {};
        var fullName = String(tester.name || '').trim();
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        return fullName || (username ? '@' + username : text('idLabel', 'ID {id}', { id: Number(tester.id || 0) }));
    }

    function testerSubLabel(item) {
        var tester = item && item.tester || {};
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        var fullName = String(tester.name || '').trim();
        if (fullName && username) return '@' + username;
        return text('testingControlStarted', 'Started {date}', { date: item.start_date || '—' });
    }

    function avatarHtml(item) {
        var tester = item && item.tester || {};
        var avatarUrl = String(tester.avatar_url || '').trim();
        if (avatarUrl) {
            return '<img class="testing-control-avatar" src="' + escape(avatarUrl) + '" loading="lazy" alt="">';
        }
        var label = testerLabel(item).replace(/^@/, '').trim();
        return '<span class="testing-control-avatar testing-control-avatar--fallback">' + escape((label.charAt(0) || '?').toUpperCase()) + '</span>';
    }

    function renderTester(item) {
        var tester = item && item.tester || {};
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        var safeUsername = typeof escapeInlineJsString === 'function' ? escapeInlineJsString(username) : username.replace(/'/g, "\\'");
        var timeline = (item.timeline || []).map(function (day) {
            return renderDay(day, state.appId);
        }).join('');
        var device = deviceLine(item.device);
        var currentDay = Number(item.current_day || 0);
        var dayChip = currentDay > 0
            ? '<span class="testing-control-current-day">' + escape(text('testingControlCurrentDay', 'Day {day}', { day: currentDay })) + '</span>'
            : '';
        return '<article class="testing-control-tester" data-progress-id="' + Number(item.progress_id || 0) + '">' +
            '<button type="button" class="testing-control-tester__head" onclick="openDossierModal(\'' + safeUsername + '\', ' + Number(tester.id || 0) + ', ' + Number(state.appId || 0) + ')">' +
                avatarHtml(item) +
                '<span class="testing-control-tester__identity">' +
                    '<span class="testing-control-tester__name notranslate">' + escape(testerLabel(item)) + '</span>' +
                    '<span class="testing-control-tester__sub notranslate">' + escape(testerSubLabel(item)) + '</span>' +
                '</span>' +
                dayChip +
                '<span class="testing-control-chevron">›</span>' +
            '</button>' +
            (device ? '<div class="testing-control-device">' + escape(device) + '</div>' : '') +
            '<div class="testing-control-timeline" role="list" aria-label="' + escape(text('testingControlTimeline', 'Check-in timeline')) + '">' + timeline + '</div>' +
            (Number(item.timeline_overflow_count || 0) > 0
                ? '<div class="testing-control-overflow">+' + Number(item.timeline_overflow_count) + '</div>'
                : '') +
        '</article>';
    }

    function renderTesters() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        var itemsHtml = state.items.length
            ? state.items.map(renderTester).join('')
            : '<div class="testing-control-empty">' + escape(text('testingControlEmpty', 'No testers in this run yet.')) + '</div>';
        var loadMore = state.nextCursor
            ? '<button type="button" class="btn btn-secondary testing-control-more" onclick="loadMoreTestingControl()">' + escape(text('testingControlLoadMore', 'Load more')) + '</button>'
            : '';
        body.innerHTML = renderHeader() +
            '<div id="testing-control-proof-meta" class="testing-control-proof-meta" hidden></div>' +
            '<div class="testing-control-list">' + itemsHtml + '</div>' +
            loadMore;
    }

    function render() {
        if (state.activeTab === 'gallery' && galleryEnabled()) {
            renderGallery();
            return;
        }
        renderTesters();
    }

    function renderLoading() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        body.innerHTML = renderHeader() +
            '<div class="testing-control-loading" role="status"><span></span><span></span><span></span></div>';
    }

    function renderError() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        body.innerHTML = renderHeader() +
            '<div class="testing-control-error">' +
                '<div>' + escape(text('testingControlLoadError', 'Could not load testing progress.')) + '</div>' +
                '<button type="button" class="btn btn-secondary" onclick="retryTestingControl()">' + escape(text('retry', 'Retry')) + '</button>' +
            '</div>';
    }

    function filterOptions(values, selected, emptyLabel) {
        var options = '<option value="">' + escape(emptyLabel) + '</option>';
        (values || []).forEach(function (value) {
            var normalized = String(value == null ? '' : value);
            options += '<option value="' + escape(normalized) + '"' + (normalized === String(selected || '') ? ' selected' : '') + '>' + escape(normalized) + '</option>';
        });
        return options;
    }

    function galleryTesterLabel(item) {
        var tester = item && item.tester || {};
        var name = String(tester.name || '').trim();
        var username = String(tester.username || '').trim().replace(/^@+/, '');
        return name || (username ? '@' + username : text('idLabel', 'ID {id}', { id: Number(tester.id || 0) }));
    }

    function galleryDateLabel(value) {
        var date = new Date(String(value || ''));
        if (!Number.isFinite(date.getTime())) return '';
        try {
            return date.toLocaleString(typeof lang !== 'undefined' && lang === 'ru' ? 'ru-RU' : 'en-US', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });
        } catch (_) {
            return String(value || '').slice(0, 16).replace('T', ' ');
        }
    }

    function renderGalleryCard(item) {
        var proofId = Number(item && item.proof_id || 0);
        var media = item && item.media || {};
        var device = deviceLine(item && item.device);
        var dimensions = media.width && media.height ? media.width + '×' + media.height : '';
        var detail = [device, dimensions, galleryDateLabel(item && item.created_at)].filter(Boolean).join(' • ');
        return '<article class="testing-control-gallery-card" data-proof-id="' + proofId + '">' +
            '<button type="button" class="testing-control-gallery-image" onclick="openCheckinProofPreview(' + proofId + ')">' +
                '<span class="testing-control-gallery-placeholder">' + escape(text('testingControlGalleryImageLoading', 'Loading preview…')) + '</span>' +
                '<img alt="" data-proof-thumb="' + proofId + '" data-src="' + escape(secureMediaUrl(item.thumbnail_url)) + '" onload="this.closest(\'.testing-control-gallery-card\').classList.add(\'is-loaded\')" onerror="this.closest(\'.testing-control-gallery-card\').classList.add(\'is-error\')">' +
            '</button>' +
            '<button type="button" class="testing-control-gallery-retry" onclick="retryTestingControlThumbnail(' + proofId + '); event.stopPropagation();">' + escape(text('retry', 'Retry')) + '</button>' +
            '<div class="testing-control-gallery-meta">' +
                '<strong>' + escape(galleryTesterLabel(item)) + '</strong>' +
                '<span>' + escape(text('testingControlCurrentDay', 'Day {day}', { day: Number(item.testing_day || 0) })) + '</span>' +
                (detail ? '<small>' + escape(detail) + '</small>' : '') +
            '</div>' +
        '</article>';
    }

    function renderGalleryFilters() {
        var filters = state.galleryFilters || {};
        var selected = state.gallerySelected || {};
        var controls = [];
        if ((filters.days || []).length) {
            controls.push('<select aria-label="' + escape(text('testingControlFilterDay', 'Day')) + '" onchange="setTestingControlGalleryFilter(\'day\', this.value)">' +
                filterOptions(filters.days, selected.day, text('testingControlAllDays', 'All days')) + '</select>');
        }
        if ((filters.brands || []).length) {
            controls.push('<select aria-label="' + escape(text('testingControlFilterBrand', 'Brand')) + '" onchange="setTestingControlGalleryFilter(\'brand\', this.value)">' +
                filterOptions(filters.brands, selected.brand, text('testingControlAllBrands', 'All brands')) + '</select>');
        }
        if ((filters.models || []).length) {
            controls.push('<select aria-label="' + escape(text('testingControlFilterModel', 'Model')) + '" onchange="setTestingControlGalleryFilter(\'model\', this.value)">' +
                filterOptions(filters.models, selected.model, text('testingControlAllModels', 'All models')) + '</select>');
        }
        if ((filters.android_versions || []).length) {
            controls.push('<select aria-label="' + escape(text('testingControlFilterAndroid', 'Android')) + '" onchange="setTestingControlGalleryFilter(\'android_version\', this.value)">' +
                filterOptions(filters.android_versions, selected.android_version, text('testingControlAllAndroid', 'All Android versions')) + '</select>');
        }
        return controls.length ? '<div class="testing-control-gallery-filters">' + controls.join('') + '</div>' : '';
    }

    function disconnectThumbnailObserver() {
        if (state.thumbnailObserver) state.thumbnailObserver.disconnect();
        state.thumbnailObserver = null;
    }

    function observeThumbnails() {
        disconnectThumbnailObserver();
        var images = Array.prototype.slice.call(document.querySelectorAll('#testing-control-body img[data-proof-thumb]'));
        function loadImage(image) {
            if (!image || image.src) return;
            var source = String(image.dataset.src || '');
            if (source) image.src = source;
        }
        if (!('IntersectionObserver' in window)) {
            images.forEach(loadImage);
            return;
        }
        state.thumbnailObserver = new IntersectionObserver(function (entries, observer) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                observer.unobserve(entry.target);
                loadImage(entry.target);
            });
        }, { root: document.getElementById('testing-control-body'), rootMargin: '160px 0px' });
        images.forEach(function (image) { state.thumbnailObserver.observe(image); });
    }

    function renderGallery() {
        var body = document.getElementById('testing-control-body');
        if (!body) return;
        var itemsHtml = state.galleryItems.length
            ? state.galleryItems.map(renderGalleryCard).join('')
            : '<div class="testing-control-gallery-empty">' +
                '<span class="testing-control-gallery-empty__mark" aria-hidden="true">▣</span>' +
                '<strong>' + escape(text('testingControlGalleryEmpty', 'No screenshots in this run yet.')) + '</strong>' +
                '<small>' + escape(text('testingControlGalleryEmptyHint', 'Screenshot proofs will appear here after testers send them.')) + '</small>' +
            '</div>';
        var loadMore = state.galleryNextCursor
            ? '<button type="button" class="btn btn-secondary testing-control-more" onclick="loadMoreTestingControlGallery()">' + escape(text('testingControlLoadMore', 'Load more')) + '</button>'
            : '';
        body.innerHTML = renderHeader() + renderGalleryFilters() +
            '<div class="testing-control-gallery-grid' + (state.galleryItems.length ? '' : ' is-empty') + '">' + itemsHtml + '</div>' + loadMore;
        observeThumbnails();
    }

    async function requestGalleryPage(cursor) {
        var selected = state.gallerySelected || {};
        var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var params = [
            'limit=24',
            'init_data=' + encodeURIComponent(initData),
        ];
        ['day', 'brand', 'model', 'android_version'].forEach(function (key) {
            if (selected[key]) params.push(encodeURIComponent(key) + '=' + encodeURIComponent(selected[key]));
        });
        if (cursor) params.push('cursor=' + encodeURIComponent(cursor));
        var url = API_BASE + '/projects/' + Number(state.appId) + '/testing-control/screenshots?' + params.join('&');
        var response = await fetchWithRetry(url, { timeoutMs: 25000 }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success') {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return payload;
    }

    async function loadGalleryPage(options) {
        options = options || {};
        if (state.galleryLoading) return;
        state.galleryLoading = true;
        if (!options.append) renderLoading();
        try {
            var payload = await requestGalleryPage(options.append ? state.galleryNextCursor : '');
            state.project = payload.project || state.project;
            state.galleryItems = options.append ? state.galleryItems.concat(payload.items || []) : (payload.items || []);
            state.galleryNextCursor = payload.next_cursor || null;
            if (!options.append && payload.filters) state.galleryFilters = payload.filters;
            renderGallery();
        } catch (error) {
            console.error('Testing Control gallery load failed:', error);
            if (!options.append) renderError();
            else if (typeof showToast === 'function') showToast(text('testingControlGalleryLoadError', 'Could not load screenshots.'));
        } finally {
            state.galleryLoading = false;
        }
    }

    async function requestMediaTicket(proofId, variant) {
        var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var response = await fetchWithRetry(API_BASE + '/checkin-proofs/' + Number(proofId || 0) + '/media-ticket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: initData, variant: variant }),
            timeoutMs: 20000,
        }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success' || !payload.url) {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return {
            url: secureMediaUrl(payload.url),
            expiresAt: Number(payload.expires_at || 0) * 1000,
        };
    }

    async function requestProofDetails(proofId) {
        var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var response = await fetchWithRetry(
            API_BASE + '/checkin-proofs/' + Number(proofId || 0) + '/details?init_data=' + encodeURIComponent(initData),
            { timeoutMs: 20000 },
            1
        );
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success' || !payload.proof) {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return payload.proof;
    }

    async function loadPreviewMediaSource(proofId) {
        var cached = previewMediaCacheGet(proofId);
        if (cached) return cached;
        var ticket = await requestMediaTicket(proofId, 'full');
        var response = await fetchWithRetry(ticket.url, { timeoutMs: 25000, cache: 'force-cache' }, 1);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var mediaType = String(response.headers.get('content-type') || '').toLowerCase();
        if (mediaType.indexOf('image/') !== 0) throw new Error('invalid_media_type');
        var blob = await response.blob();
        if (!blob.size || blob.size > PREVIEW_CACHE_MAX_BYTES) throw new Error('invalid_media_size');
        var source = previewMediaCachePut(proofId, blob, ticket.expiresAt);
        if (!source) throw new Error('media_cache_failed');
        return source;
    }

    async function setTestingControlTab(tab) {
        var target = tab === 'gallery' && galleryEnabled() ? 'gallery' : 'testers';
        if (state.activeTab === target) return;
        state.activeTab = target;
        closeTestingControlProofMeta();
        if (target === 'gallery' && !state.galleryItems.length) {
            await loadGalleryPage({ append: false });
        } else {
            render();
        }
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    }

    async function setTestingControlGalleryFilter(key, value) {
        if (!Object.prototype.hasOwnProperty.call(state.gallerySelected, key)) return;
        state.gallerySelected[key] = String(value || '');
        state.galleryItems = [];
        state.galleryNextCursor = null;
        await loadGalleryPage({ append: false });
    }

    async function retryTestingControlThumbnail(proofId) {
        var card = document.querySelector('.testing-control-gallery-card[data-proof-id="' + Number(proofId || 0) + '"]');
        var image = card && card.querySelector('img[data-proof-thumb]');
        if (!card || !image) return;
        card.classList.remove('is-error', 'is-loaded');
        image.removeAttribute('src');
        try {
            var ticket = await requestMediaTicket(proofId, 'thumbnail');
            image.dataset.src = ticket.url;
            image.src = ticket.url;
        } catch (error) {
            card.classList.add('is-error');
        }
    }

    async function requestPage(cursor) {
        var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
        var url = API_BASE + '/projects/' + Number(state.appId) + '/testing-control/testers?limit=50&init_data=' + encodeURIComponent(initData);
        if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
        var response = await fetchWithRetry(url, { timeoutMs: 25000 }, 1);
        var payload = await response.json().catch(function () { return {}; });
        if (!response.ok || payload.status !== 'success') {
            throw new Error((payload && (payload.code || payload.message)) || ('HTTP ' + response.status));
        }
        return payload;
    }

    async function loadPage(options) {
        options = options || {};
        if (state.loading) return;
        state.loading = true;
        if (!options.append) renderLoading();
        try {
            var payload = await requestPage(options.append ? state.nextCursor : '');
            state.project = payload.project || state.project;
            state.items = options.append ? state.items.concat(payload.items || []) : (payload.items || []);
            state.nextCursor = payload.next_cursor || null;

            if (state.focusProgressId > 0 && !state.items.some(function (item) {
                return Number(item.progress_id) === Number(state.focusProgressId);
            })) {
                var guard = 0;
                while (state.nextCursor && guard < 9) {
                    guard += 1;
                    var next = await requestPage(state.nextCursor);
                    state.items = state.items.concat(next.items || []);
                    state.nextCursor = next.next_cursor || null;
                    if (state.items.some(function (item) {
                        return Number(item.progress_id) === Number(state.focusProgressId);
                    })) break;
                }
            }
            render();
            focusTesterWhenReady();
        } catch (error) {
            console.error('Testing Control load failed:', error);
            if (!options.append) renderError();
            else if (typeof showToast === 'function') showToast(text('testingControlLoadError', 'Could not load testing progress.'));
        } finally {
            state.loading = false;
        }
    }

    function focusTesterWhenReady() {
        if (state.focusProgressId <= 0) return;
        setTimeout(function () {
            var card = document.querySelector('.testing-control-tester[data-progress-id="' + Number(state.focusProgressId) + '"]');
            if (!card) return;
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('is-focused');
            setTimeout(function () { card.classList.remove('is-focused'); }, 2200);
        }, 80);
    }

    async function openTestingControl(appId, options) {
        options = options || {};
        if (!enabled()) return false;
        var safeAppId = Number(appId || 0);
        if (safeAppId <= 0) return false;
        var cached = projectFromCache(safeAppId);
        state.appId = safeAppId;
        state.archived = Object.prototype.hasOwnProperty.call(options, 'archived') ? !!options.archived : !!(cached && cached.archived);
        state.project = cached && cached.project || { name: text('testingControlTitle', 'Testing Control') };
        state.items = [];
        state.nextCursor = null;
        state.focusProgressId = Number(options.focusProgressId || 0);
        state.activeTab = options.tab === 'gallery' && galleryEnabled() ? 'gallery' : 'testers';
        state.galleryItems = [];
        state.galleryNextCursor = null;
        state.galleryFilters = { days: [], brands: [], models: [], android_versions: [] };
        state.gallerySelected = { day: '', brand: '', model: '', android_version: '' };
        var modal = document.getElementById('testing-control-modal');
        if (!modal) return false;
        modal.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        if (state.activeTab === 'gallery') await loadGalleryPage({ append: false });
        else await loadPage({ append: false });
        return true;
    }

    function closeTestingControl(event) {
        var modal = document.getElementById('testing-control-modal');
        if (event && event.target !== modal) return;
        if (modal) modal.classList.remove('active');
        closeCheckinProofPreview();
        clearPreviewMediaCache();
        disconnectThumbnailObserver();
        state.focusProgressId = 0;
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }

    function findProof(proofId) {
        var safeId = Number(proofId || 0);
        for (var i = 0; i < state.items.length; i++) {
            var timeline = state.items[i].timeline || [];
            for (var j = 0; j < timeline.length; j++) {
                var proof = timeline[j].proof;
                if (proof && Number(proof.id || 0) === safeId) {
                    return { proof: proof, day: timeline[j].day, item: state.items[i] };
                }
            }
        }
        return null;
    }

    function findGalleryProof(proofId) {
        var safeId = Number(proofId || 0);
        return state.galleryItems.find(function (item) {
            return Number(item && item.proof_id || 0) === safeId;
        }) || null;
    }

    function previewMeta(proofId) {
        var galleryItem = findGalleryProof(proofId);
        if (galleryItem) {
            return {
                title: galleryTesterLabel(galleryItem),
                subtitle: [
                    text('testingControlCurrentDay', 'Day {day}', { day: Number(galleryItem.testing_day || 0) }),
                    deviceLine(galleryItem.device),
                ].filter(Boolean).join(' • '),
            };
        }
        var found = findProof(proofId);
        return found ? {
            title: testerLabel(found.item),
            subtitle: [
                text('testingControlCurrentDay', 'Day {day}', { day: Number(found.day || 0) }),
                deviceLine(found.item && found.item.device),
            ].filter(Boolean).join(' • '),
        } : { title: proofLabel('screenshot'), subtitle: '' };
    }

    async function openCheckinProofPreview(proofId) {
        var safeProofId = Number(proofId || 0);
        if (!galleryEnabled() || safeProofId <= 0) return;
        var modal = document.getElementById('checkin-proof-preview-modal');
        var body = document.getElementById('checkin-proof-preview-body');
        if (!modal || !body) return;
        state.previewProofId = safeProofId;
        state.previewMode = 'screenshot';
        var meta = previewMeta(safeProofId);
        body.innerHTML = '<div class="checkin-proof-preview-loading"><span></span><span></span><span></span></div>';
        var title = document.getElementById('checkin-proof-preview-title');
        var subtitle = document.getElementById('checkin-proof-preview-subtitle');
        if (title) title.textContent = meta.title;
        if (subtitle) subtitle.textContent = meta.subtitle;
        modal.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        try {
            var source = await loadPreviewMediaSource(safeProofId);
            if (state.previewProofId !== safeProofId || !modal.classList.contains('active')) return;
            body.innerHTML = '<img class="checkin-proof-preview-image" alt="" src="' + escape(source) + '">';
            var image = body.querySelector('img');
            if (image) image.onerror = function () { renderPreviewError(safeProofId); };
        } catch (error) {
            renderPreviewError(safeProofId);
        }
    }

    function renderPreviewError(proofId) {
        if (Number(state.previewProofId) !== Number(proofId)) return;
        var body = document.getElementById('checkin-proof-preview-body');
        if (!body) return;
        body.innerHTML = '<div class="checkin-proof-preview-error">' +
            '<span>' + escape(text('testingControlMediaUnavailable', 'Image is temporarily unavailable.')) + '</span>' +
            '<button type="button" class="btn btn-secondary" onclick="' +
                (state.previewMode === 'feedback' ? 'openTestingControlFeedbackPreview' : 'openCheckinProofPreview') +
                '(' + Number(proofId || 0) + ')">' + escape(text('retry', 'Retry')) + '</button>' +
        '</div>';
    }

    function feedbackStatusLabel(status) {
        var normalized = String(status || '').trim().toLowerCase();
        var keys = {
            pending: 'testingControlFeedbackStatusPending',
            new: 'testingControlFeedbackStatusPending',
            processing: 'testingControlFeedbackStatusProcessing',
            accepted: 'testingControlFeedbackStatusAccepted',
            approved: 'testingControlFeedbackStatusAccepted',
            processed: 'testingControlFeedbackStatusAccepted',
            tipped: 'testingControlFeedbackStatusAccepted',
            rewarded: 'testingControlFeedbackStatusAccepted',
            rejected: 'testingControlFeedbackStatusRejected',
            expired: 'testingControlFeedbackStatusRejected',
        };
        return keys[normalized]
            ? text(keys[normalized], normalized)
            : (normalized || text('testingControlFeedbackStatusPending', 'Pending'));
    }

    function feedbackPreviewCard(proofId, feedback) {
        var type = String(feedback && feedback.type || 'unavailable');
        var data = feedback && feedback.feedback || {};
        var message = String(data.message_text || '').trim();
        return '<section class="checkin-proof-preview-feedback-card">' +
            '<div class="checkin-proof-preview-feedback-card__top">' +
                '<span class="checkin-proof-preview-feedback-card__type">' + escape(proofLabel(type)) + '</span>' +
                '<span class="checkin-proof-preview-feedback-card__status">' + escape(feedbackStatusLabel(data.status)) + '</span>' +
            '</div>' +
            (message ? '<p>' + escape(message) + '</p>' : '<p class="is-muted">' + escape(text('testingControlFeedbackNoMessage', 'No text description was added.')) + '</p>') +
            '<button type="button" class="btn btn-secondary checkin-proof-preview-feedback-card__open" onclick="openFeedbackFromProofPreview(' + Number(data.id || 0) + ')">' +
                escape(text('testingControlFeedbackOpen', 'Open feedback')) +
            '</button>' +
        '</section>';
    }

    async function openTestingControlFeedbackPreview(proofId) {
        var safeProofId = Number(proofId || 0);
        if (!galleryEnabled() || safeProofId <= 0) return;
        var modal = document.getElementById('checkin-proof-preview-modal');
        var body = document.getElementById('checkin-proof-preview-body');
        if (!modal || !body) return;
        var found = findProof(safeProofId);
        var meta = previewMeta(safeProofId);
        state.previewProofId = safeProofId;
        state.previewMode = 'feedback';
        body.innerHTML = '<div class="checkin-proof-preview-loading"><span></span><span></span><span></span></div>';
        var title = document.getElementById('checkin-proof-preview-title');
        var subtitle = document.getElementById('checkin-proof-preview-subtitle');
        if (title) title.textContent = meta.title;
        if (subtitle) {
            subtitle.textContent = [meta.subtitle, proofLabel(found && found.proof && found.proof.type)].filter(Boolean).join(' • ');
        }
        modal.classList.add('active');
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        try {
            var details = await requestProofDetails(safeProofId);
            if (state.previewProofId !== safeProofId || !modal.classList.contains('active')) return;
            var mediaHtml = '';
            if (details.feedback && details.feedback.has_media) {
                var source = await loadPreviewMediaSource(safeProofId);
                if (state.previewProofId !== safeProofId || !modal.classList.contains('active')) return;
                mediaHtml = '<img class="checkin-proof-preview-image checkin-proof-preview-image--feedback" alt="" src="' + escape(source) + '">';
            } else {
                mediaHtml = '<div class="checkin-proof-preview-no-media" aria-hidden="true">▣</div>';
            }
            body.innerHTML = '<div class="checkin-proof-preview-content">' + mediaHtml + feedbackPreviewCard(safeProofId, details) + '</div>';
            var image = body.querySelector('img');
            if (image) image.onerror = function () { renderPreviewError(safeProofId); };
        } catch (error) {
            renderPreviewError(safeProofId);
        }
    }

    function openFeedbackFromProofPreview(feedbackId) {
        var safeFeedbackId = Number(feedbackId || 0);
        if (safeFeedbackId <= 0 || typeof openProjectFeedback !== 'function') return;
        closeCheckinProofPreview();
        closeTestingControl();
        openProjectFeedback(Number(state.appId || 0), state.archived, { focusFeedbackId: safeFeedbackId });
    }

    function closeCheckinProofPreview(event) {
        var modal = document.getElementById('checkin-proof-preview-modal');
        if (event && event.target !== modal) return;
        var body = document.getElementById('checkin-proof-preview-body');
        if (body) {
            var image = body.querySelector('img');
            if (image) image.removeAttribute('src');
            body.innerHTML = '';
        }
        if (modal) modal.classList.remove('active');
        state.previewProofId = 0;
        state.previewMode = '';
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }

    function openTestingControlProof(appId, proofId) {
        var found = findProof(proofId);
        if (!found) return;
        var proof = found.proof || {};
        var type = String(proof.type || 'unavailable');
        var feedbackId = Number(proof.source_feedback_id || 0);
        if (type === 'screenshot' && Number(proof.id || 0) > 0 && galleryEnabled()) {
            openCheckinProofPreview(Number(proof.id));
            return;
        }
        if ((type === 'bug' || type === 'idea' || type === 'play_review') && feedbackId > 0) {
            openTestingControlFeedbackPreview(Number(proof.id));
            return;
        }

        var meta = document.getElementById('testing-control-proof-meta');
        if (!meta) return;
        var media = proof.media || {};
        var dimensions = media.width && media.height ? media.width + '×' + media.height : '';
        var device = deviceLine(found.item && found.item.device);
        var lines = [
            '<strong>' + escape(proofLabel(type)) + ' · ' + escape(text('testingControlCurrentDay', 'Day {day}', { day: found.day })) + '</strong>',
            device ? '<span>' + escape(device) + '</span>' : '',
            dimensions ? '<span>' + escape(dimensions) + '</span>' : '',
            '<span>' + escape(text('testingControlScreenshotPhase5', 'Preview will be available in Gallery.')) + '</span>',
        ].filter(Boolean);
        meta.innerHTML = '<button type="button" class="testing-control-proof-meta__close" onclick="closeTestingControlProofMeta()">×</button>' + lines.join('');
        meta.hidden = false;
        meta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function closeTestingControlProofMeta() {
        var meta = document.getElementById('testing-control-proof-meta');
        if (meta) meta.hidden = true;
    }

    window.buildTestingControlEntryButton = buildTestingControlEntryButton;
    window.openTestingControl = openTestingControl;
    window.closeTestingControl = closeTestingControl;
    window.retryTestingControl = function () {
        return state.activeTab === 'gallery' ? loadGalleryPage({ append: false }) : loadPage({ append: false });
    };
    window.loadMoreTestingControl = function () { return loadPage({ append: true }); };
    window.loadMoreTestingControlGallery = function () { return loadGalleryPage({ append: true }); };
    window.setTestingControlTab = setTestingControlTab;
    window.setTestingControlGalleryFilter = setTestingControlGalleryFilter;
    window.retryTestingControlThumbnail = retryTestingControlThumbnail;
    window.openTestingControlProof = openTestingControlProof;
    window.closeTestingControlProofMeta = closeTestingControlProofMeta;
    window.openCheckinProofPreview = openCheckinProofPreview;
    window.openTestingControlFeedbackPreview = openTestingControlFeedbackPreview;
    window.openFeedbackFromProofPreview = openFeedbackFromProofPreview;
    window.closeCheckinProofPreview = closeCheckinProofPreview;
})();
