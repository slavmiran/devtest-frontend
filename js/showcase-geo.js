(function () {
    var STATS_KEY_PREFIX = 'showcase_geo_stats_v2_';
    var SCOPE_KEY = 'showcase_geo_scope_v1';
    var FREQUENT = ['RU', 'KZ', 'BY', 'VN', 'US', 'TR', 'UA', 'TH', 'ID', 'IN', 'UZ'];
    var profile = null;
    var statsByScope = { all: null, active: null };
    var scope = 'all';
    var saving = false;
    var profileLoaded = false;

    function langCode() {
        return (typeof lang !== 'undefined' && lang) ? lang : 'ru';
    }

    function tr(key, params) {
        if (typeof window.t === 'function') return window.t(key, params || {}, langCode());
        return key;
    }

    function esc(value) {
        if (typeof window.escapeHTML === 'function') return window.escapeHTML(String(value || ''));
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
        });
    }

    function catalog() {
        return Array.isArray(window.COUNTRY_CATALOG) ? window.COUNTRY_CATALOG : [];
    }

    function byCode(code) {
        var wanted = String(code || '').toUpperCase();
        var rows = catalog();
        for (var i = 0; i < rows.length; i += 1) {
            if (rows[i].code === wanted) return rows[i];
        }
        return null;
    }

    function displayName(item) {
        if (!item) return '';
        if (langCode() === 'ru') return item.name_ru || item.name || item.country_code || '';
        return item.name_en || item.name || item.country_code || '';
    }

    function countryCountLabel(count) {
        var value = Math.abs(Number(count) || 0);
        var mod100 = value % 100;
        var mod10 = value % 10;
        if (langCode() === 'ru') {
            if (mod100 > 10 && mod100 < 20) return tr('geoAllCountries', { count: value });
            if (mod10 === 1) return tr('geoAllCountriesOne', { count: value });
            if (mod10 >= 2 && mod10 <= 4) return tr('geoAllCountriesFew', { count: value });
            return tr('geoAllCountries', { count: value });
        }
        return tr(value === 1 ? 'geoAllCountriesOne' : 'geoAllCountries', { count: value });
    }

    function normalizeScope(value) {
        return String(value || '').toLowerCase() === 'active' ? 'active' : 'all';
    }

    function currentStats() {
        return statsByScope[scope];
    }

    function readSavedScope() {
        try {
            return normalizeScope(sessionStorage.getItem(SCOPE_KEY) || 'all');
        } catch (error) {
            return 'all';
        }
    }

    function writeSavedScope(value) {
        try { sessionStorage.setItem(SCOPE_KEY, value); } catch (error) {}
    }

    function readStatsCache(forScope) {
        try {
            var raw = sessionStorage.getItem(STATS_KEY_PREFIX + forScope);
            var parsed = raw ? JSON.parse(raw) : null;
            return Array.isArray(parsed) ? parsed : null;
        } catch (error) {
            return null;
        }
    }

    function writeStatsCache(forScope, rows) {
        try {
            sessionStorage.setItem(STATS_KEY_PREFIX + forScope, JSON.stringify(rows));
        } catch (error) {}
    }

    function clearStatsCache() {
        try {
            sessionStorage.removeItem(STATS_KEY_PREFIX + 'all');
            sessionStorage.removeItem(STATS_KEY_PREFIX + 'active');
        } catch (error) {}
        statsByScope.all = null;
        statsByScope.active = null;
    }

    function parseStatsPayload(payload) {
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.countries)) return payload.countries;
        return null;
    }

    function initData() {
        return typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
    }

    function apiBase() {
        return typeof API_BASE === 'string' ? API_BASE : '';
    }

    function selectedPlay() {
        var code = String((profile && profile.google_play_country) || '').toUpperCase();
        if (!code) return null;
        return (profile && profile.google_play) || byCode(code) || { code: code, name: code, name_ru: code, flag: '' };
    }

    function detectedCountry() {
        var code = String((profile && profile.detected_country) || '').toUpperCase();
        if (!code) return null;
        return (profile && profile.detected) || byCode(code) || { code: code, name: code, name_ru: code, flag: '' };
    }

    function rowHtml(item) {
        var percent = Math.max(0, Math.min(100, Number(item.percent) || 0));
        var name = displayName(item);
        return '<div class="showcase-geo-row">' +
            '<div class="showcase-geo-row__label"><span class="showcase-geo-row__flag">' + esc(item.flag || '') + '</span>' +
            '<span class="showcase-geo-row__name">' + esc(name) + '</span></div>' +
            '<div class="showcase-geo-row__bar" aria-hidden="true"><span style="width:' + percent + '%"></span></div>' +
            '<div class="showcase-geo-row__meta">' + esc(percent + '% (' + (item.count || 0) + ')') + '</div>' +
            '</div>';
    }

    function plaqueHtml() {
        if (!profileLoaded) {
            return '<div class="showcase-geo-skeleton" aria-hidden="true"><span></span></div>';
        }
        var play = selectedPlay();
        if (play) {
            return '<button type="button" class="showcase-geo-me" onclick="ShowcaseGeo.openPicker()">' +
                '<span class="showcase-geo-me__copy">📍 ' + esc(tr('geoPlayCountryLabel')) + ': <strong>' +
                esc((play.flag ? play.flag + ' ' : '') + displayName(play)) + '</strong> ▾ (' + esc(tr('geoPlayCountryChange')) + ')</span>' +
                '</button>';
        }
        return '<button type="button" class="showcase-geo-me is-empty" onclick="ShowcaseGeo.openPicker()">' +
            '<span class="showcase-geo-me__copy">📍 ' + esc(tr('geoPlayCountryEmpty')) + '</span>' +
            '<span class="showcase-geo-me__action">' + esc(tr('geoPlayCountryPick')) + '</span>' +
            '</button>';
    }

    function scopeToggleHtml() {
        return '<div class="showcase-geo-scope" role="tablist">' +
            '<button type="button" class="showcase-geo-scope__btn' + (scope === 'all' ? ' is-on' : '') + '" onclick="ShowcaseGeo.setScope(\'all\')">' +
                esc(tr('geoScopeAll')) +
            '</button>' +
            '<button type="button" class="showcase-geo-scope__btn' + (scope === 'active' ? ' is-on' : '') + '" onclick="ShowcaseGeo.setScope(\'active\')">' +
                esc(tr('geoScopeActive')) +
            '</button>' +
            '</div>';
    }

    function renderWidget() {
        var root = document.getElementById('showcase-geo-widget');
        if (!root) return;
        var rows = currentStats();
        var body = rows === null
            ? '<div class="showcase-geo-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>'
            : (rows.length
                ? '<div class="showcase-geo-rows">' + rows.slice(0, 5).map(rowHtml).join('') + '</div>'
                : '<p class="showcase-geo-sheet__hint">' + esc(tr('geoListEmpty')) + '</p>');
        root.innerHTML =
            '<div class="showcase-geo-widget__head">' +
                '<div class="showcase-geo-widget__title"><span aria-hidden="true">🌍</span><span id="showcase-geo-title">' + esc(tr('geoWidgetTitle')) + '</span></div>' +
                '<button type="button" class="showcase-geo-widget__all" onclick="ShowcaseGeo.openCommunityList()">' +
                    esc(countryCountLabel(rows ? rows.length : 0)) +
                '</button>' +
            '</div>' +
            scopeToggleHtml() +
            body +
            plaqueHtml();
    }

    function renderCommunityList() {
        var body = document.getElementById('showcase-geo-list-body');
        if (!body) return;
        var rows = currentStats();
        var list = Array.isArray(rows) && rows.length
            ? '<div class="showcase-geo-rows">' + rows.map(rowHtml).join('') + '</div>'
            : (rows === null
                ? '<div class="showcase-geo-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>'
                : '<p class="showcase-geo-sheet__hint">' + esc(tr('geoListEmpty')) + '</p>');
        body.innerHTML = scopeToggleHtml() + list;
    }

    function countryLabel(item) {
        if (!item) return '';
        return (item.flag ? item.flag + ' ' : '') + displayName(item);
    }

    function markChoice(code) {
        var wanted = String(code || '').toUpperCase();
        var nodes = document.querySelectorAll('[data-geo-code]');
        for (var i = 0; i < nodes.length; i += 1) {
            var on = String(nodes[i].getAttribute('data-geo-code') || '').toUpperCase() === wanted;
            nodes[i].classList.toggle('is-selected', on);
            nodes[i].classList.toggle('is-pressed', on);
        }
        var currentNode = document.getElementById('showcase-geo-current');
        var item = byCode(wanted);
        if (currentNode && item) {
            currentNode.hidden = false;
            currentNode.innerHTML =
                '<span>' + esc(tr('geoCurrentCountry')) + '</span>' +
                '<strong>' + esc(countryLabel(item)) + '</strong>';
        }
    }

    function haptic(kind) {
        try {
            if (window.tg && window.tg.HapticFeedback) {
                if (kind === 'success' && window.tg.HapticFeedback.notificationOccurred) {
                    window.tg.HapticFeedback.notificationOccurred('success');
                } else if (window.tg.HapticFeedback.impactOccurred) {
                    window.tg.HapticFeedback.impactOccurred('light');
                }
            }
        } catch (error) {}
    }

    function renderPicker(query) {
        var play = selectedPlay();
        var detected = detectedCountry();
        var selected = play ? String(play.code || '').toUpperCase() : '';
        var currentNode = document.getElementById('showcase-geo-current');
        var detectedNode = document.getElementById('showcase-geo-detected');
        var frequentNode = document.getElementById('showcase-geo-frequent');
        var listNode = document.getElementById('showcase-geo-options');
        var needle = String(query || '').trim().toLowerCase();
        if (currentNode) {
            if (play) {
                currentNode.hidden = false;
                currentNode.innerHTML =
                    '<span>' + esc(tr('geoCurrentCountry')) + '</span>' +
                    '<strong>' + esc(countryLabel(play)) + '</strong>';
            } else {
                currentNode.hidden = true;
                currentNode.innerHTML = '';
            }
        }
        if (detectedNode) {
            var detectedCode = detected ? String(detected.code || '').toUpperCase() : '';
            if (detected && detectedCode !== selected) {
                var label = countryLabel(detected);
                detectedNode.hidden = false;
                detectedNode.innerHTML =
                    '<p>📍 ' + esc(tr('geoDetectedQuickAction', { country: label })) + '</p>' +
                    '<button type="button" class="btn btn-primary" data-geo-code="' + esc(detectedCode) + '" onclick="ShowcaseGeo.useDetected()">' +
                        esc(tr('geoUseDetectedBtn', { country: label })) +
                    '</button>';
            } else {
                detectedNode.hidden = true;
                detectedNode.innerHTML = '';
            }
        }
        if (frequentNode) {
            frequentNode.innerHTML = FREQUENT.map(function (code) {
                var item = byCode(code);
                if (!item) return '';
                var selectedClass = code === selected ? ' is-selected' : '';
                return '<button type="button" class="showcase-geo-chip' + selectedClass + '" data-geo-code="' + code + '" onclick="ShowcaseGeo.choose(\'' + code + '\')">' +
                    esc(countryLabel(item)) + '</button>';
            }).join('');
        }
        if (!listNode) return;
        var rows = catalog().filter(function (item) {
            if (!needle) return true;
            return String(item.name || '').toLowerCase().indexOf(needle) >= 0
                || String(item.name_ru || '').toLowerCase().indexOf(needle) >= 0
                || String(item.code || '').toLowerCase().indexOf(needle) >= 0;
        }).sort(function (left, right) {
            return displayName(left).localeCompare(displayName(right), langCode() === 'ru' ? 'ru' : 'en');
        });
        listNode.innerHTML = rows.map(function (item) {
            var selectedClass = item.code === selected ? ' is-selected' : '';
            return '<button type="button" class="showcase-geo-option' + selectedClass + '" data-geo-code="' + item.code + '" onclick="ShowcaseGeo.choose(\'' + item.code + '\')">' +
                '<span>' + esc(item.flag || '') + '</span>' +
                '<span>' + esc(displayName(item)) + '</span>' +
                '<span class="showcase-geo-option__code">' + esc(item.code) + '</span>' +
                '</button>';
        }).join('') || '<p class="showcase-geo-sheet__hint">' + esc(tr('geoListEmpty')) + '</p>';
        if (selected && !needle) {
            var selectedRow = listNode.querySelector('.showcase-geo-option.is-selected');
            if (selectedRow) {
                var top = selectedRow.offsetTop - Math.max(0, (listNode.clientHeight - selectedRow.offsetHeight) / 2);
                listNode.scrollTop = Math.max(0, top);
            }
        }
    }

    async function loadProfile() {
        try {
            var response = await fetch(apiBase() + '/users/me?init_data=' + encodeURIComponent(initData()));
            if (!response.ok) return;
            var payload = await response.json();
            if (!payload || payload.status !== 'success') return;
            profile = payload;
            if (window.App) {
                window.App.googlePlayCountry = payload.google_play_country || null;
                window.App.detectedCountry = payload.detected_country || null;
            }
        } finally {
            profileLoaded = true;
            renderWidget();
        }
    }

    async function loadStats(force) {
        var forScope = scope;
        if (!force) {
            var cached = statsByScope[forScope] || readStatsCache(forScope);
            if (cached) {
                statsByScope[forScope] = cached;
                renderWidget();
                renderCommunityList();
                return;
            }
        }
        if (statsByScope[forScope] === null) {
            renderWidget();
            renderCommunityList();
        }
        var response = await fetch(apiBase() + '/stats/countries?scope=' + encodeURIComponent(forScope) + '&init_data=' + encodeURIComponent(initData()));
        if (!response.ok) {
            if (statsByScope[forScope] === null) statsByScope[forScope] = [];
            renderWidget();
            renderCommunityList();
            return;
        }
        var rows = parseStatsPayload(await response.json());
        if (!rows) {
            if (statsByScope[forScope] === null) statsByScope[forScope] = [];
            renderWidget();
            renderCommunityList();
            return;
        }
        statsByScope[forScope] = rows;
        writeStatsCache(forScope, rows);
        if (scope !== forScope) return;
        renderWidget();
        renderCommunityList();
    }

    function setScope(next) {
        var normalized = normalizeScope(next);
        if (normalized === scope) return;
        scope = normalized;
        writeSavedScope(scope);
        haptic('impact');
        renderWidget();
        renderCommunityList();
        loadStats(false).catch(function () {});
    }

    async function choose(code) {
        var normalized = String(code || '').toUpperCase();
        var item = byCode(normalized);
        if (!normalized || !item || saving) return;
        var previous = profile;
        saving = true;
        haptic('impact');
        markChoice(normalized);
        var sheet = document.querySelector('#showcase-geo-picker-modal .showcase-geo-sheet');
        if (sheet) sheet.classList.add('is-busy');
        profile = Object.assign({}, profile || {}, {
            google_play_country: normalized,
            google_play: item,
        });
        renderWidget();
        try {
            var response = await fetch(apiBase() + '/users/me/google-play-country', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(typeof withInitData === 'function'
                    ? withInitData({ country_code: normalized })
                    : { country_code: normalized, init_data: initData() }),
            });
            var payload = await response.json().catch(function () { return {}; });
            if (!response.ok || payload.status !== 'success') throw new Error(payload.code || 'save_failed');
            profile.google_play_country = payload.google_play_country || normalized;
            if (payload.detected_country) profile.detected_country = payload.detected_country;
            if (window.App) window.App.googlePlayCountry = profile.google_play_country;
            clearStatsCache();
            await new Promise(function (resolve) { setTimeout(resolve, 180); });
            closePicker();
            haptic('success');
            if (typeof showToast === 'function') showToast(tr('geoSavedToast'));
            await loadStats(true);
        } catch (error) {
            profile = previous;
            renderWidget();
            renderPicker((document.getElementById('showcase-geo-search') || {}).value || '');
            if (typeof showToast === 'function') showToast(tr('geoSaveError'));
        } finally {
            saving = false;
            if (sheet) sheet.classList.remove('is-busy');
        }
    }

    function openModal(id) {
        var modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    }

    function closeModal(id) {
        var modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    function openPicker() {
        var input = document.getElementById('showcase-geo-search');
        if (input) input.value = '';
        renderPicker('');
        openModal('showcase-geo-picker-modal');
    }

    function closePicker(event) {
        if (event && event.target && event.target.id !== 'showcase-geo-picker-modal') return;
        closeModal('showcase-geo-picker-modal');
    }

    function openCommunityList() {
        renderCommunityList();
        openModal('showcase-geo-list-modal');
    }

    function closeCommunityList(event) {
        if (event && event.target && event.target.id !== 'showcase-geo-list-modal') return;
        closeModal('showcase-geo-list-modal');
    }

    function mount() {
        var root = document.getElementById('showcase-geo-widget');
        if (!root || root.getAttribute('data-ready') === '1') {
            renderWidget();
            return;
        }
        root.setAttribute('data-ready', '1');
        scope = readSavedScope();
        statsByScope.all = readStatsCache('all');
        statsByScope.active = readStatsCache('active');
        renderWidget();
        loadProfile().catch(function () {});
        loadStats(false).catch(function () {});
    }

    window.ShowcaseGeo = {
        mount: mount,
        setScope: setScope,
        openPicker: openPicker,
        closePicker: closePicker,
        openCommunityList: openCommunityList,
        closeCommunityList: closeCommunityList,
        choose: choose,
        useDetected: function () {
            var detected = detectedCountry();
            if (detected) choose(detected.code);
        },
        filterPicker: function (value) { renderPicker(value); },
        _profile: function () { return profile; },
        _stats: function () { return currentStats(); },
        _scope: function () { return scope; },
    };
})();
