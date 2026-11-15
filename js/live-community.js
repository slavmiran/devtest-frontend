/* Share the existing country chart and the Platform Snapshot counters. */
(function () {
    'use strict';
    var cache;
    var pending;
    var cachedAt = 0;
    function t(key, values) { return window.t(key, values || {}, window.lang); }
    function e(value) { return window.escapeHTML(String(value ?? '')); }
    function n(value) { return Number(value).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US'); }
    function load() {
        if (cache && Date.now() - cachedAt < 300000) return Promise.resolve(cache);
        if (!pending) {
            var signed = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : '';
            if (!signed) return Promise.resolve(null);
            var base = String(window.API_BASE || '/api').replace(/\/$/, '');
            pending = Promise.allSettled([
                Promise.resolve().then(function () { return ShowcaseGeo.getStats(); }),
                fetch(base + '/live-community/snapshot?init_data=' + encodeURIComponent(signed)).then(function (response) {
                    if (!response.ok) throw Error('snapshot unavailable');
                    return response.json();
                })
            ]).then(function (results) {
                var data = {geo: results[0].value, counters: results[1].value};
                if (data.geo && data.counters) { cache = data; cachedAt = Date.now(); }
                return data;
            }).finally(function () { pending = null; });
        }
        return pending;
    }
    function mount(root, compact) {
        if (!root) return;
        root.textContent = t('growthCommunityLoading');
        load().then(function (data) {
            if (!root.isConnected) return;
            if (!data || !data.geo && !data.counters) { root.hidden = true; return; }
            var geo = data.geo;
            var counters = data.counters;
            var countries = geo && Array.isArray(geo.countries) ? geo.countries.filter(function (row) {
                return ShowcaseGeo.country(row.country_code || row.code);
            }).sort(function (a,b) { return b.total_count - a.total_count; }) : [];
            var flags = countries.slice(0,6).map(function (row) {
                return ShowcaseGeo.country(row.country_code || row.code).flag;
            }).join(' ');
            var lines = geo ? [t('growthCommunityPeople', {active:n(geo.total_active), total:n(geo.total_registered), countries:n(countries.length)})] : [];
            if (counters) [['released','growthReleased'],['checkins_30d','growthCheckins'],['bugs','growthBugs'],['ideas','growthIdeas']].forEach(function (item) {
                if (Number.isFinite(counters[item[0]])) lines.push(t(item[1], {n:n(counters[item[0]])}));
            });
            root.hidden = false;
            root.classList.toggle('lc-community-compact', !!compact);
            root.innerHTML = (compact ? '' : '<strong>🌍 ' + e(t('growthCommunity')) + '</strong>') +
                '<div class="lc-community-metrics">' + lines.map(function (line) { return '<span>' + e(line) + '</span>'; }).join('') + '</div>' +
                (flags ? '<span class="lc-community-flags">' + e(flags) + '</span>' : '') +
                (!compact && countries.length ? '<details><summary>' + e(t('growthCountries')) +
                '</summary><ul>' + countries.map(function (row) {
                    var code = row.country_code || row.code;
                    return '<li>' + e(ShowcaseGeo.countryLabel(ShowcaseGeo.country(code))) + ' · ' + n(row.total_count) + '</li>';
                }).join('') + '</ul></details>' : '');
        });
    }
    window.LiveCommunity = {mount:mount};
})();
