/* The owner sees platform events and independently cached public Play storefronts. */
(function () {
    'use strict';
    var selected = new Map();
    var criteria = [['🎨','lrdrUsability'], ['⚡','lrdrStability'], ['💡','lrdrValue']];
    function t(key, data) { return window.t(key, data || {}, window.lang); }
    function e(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function n(value, digits) {
        return value == null ? '—' : Number(value).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US',
            {maximumFractionDigits: digits == null ? 0 : digits});
    }
    function country(code) {
        if (!code || code === 'unknown') return t('lrdrUnknown');
        try { return new Intl.DisplayNames([window.lang || 'en'], {type:'region'}).of(code) || code; }
        catch (_) { return code; }
    }
    function view(id, data) {
        var rows = data && data.countries || {};
        var code = selected.get(id) || data && (data.reference_country || data.country) || Object.keys(rows)[0];
        return {code: code, label: code && code !== 'unknown' ? 'Google Play (' + code + ')' : 'Google Play', row: rows[code], rows: rows};
    }
    function delta(row) {
        return row && row.ratings_delta > 0 ? '<span class="lrdr-delta" title="'+e(t('lrdrDelta'))+'">+'+e(n(row.ratings_delta))+'</span>' : '';
    }
    function rating(row, detailed) {
        if (row.state === 'missing') return e(t('lrdrUnavailable'));
        var score = row.score == null ? e(t('lrdrNoScore')) : e(n(row.score,1))+' ★';
        return score + (row.ratings == null ? '' : ' <span class="lrdr-rating-count">'+e(detailed || row.score == null ? t('lrdrRatings',{n:n(row.ratings)}) : '('+n(row.ratings)+')')+'</span>');
    }
    function downloads(row) {
        return e(n(row.installs)+'+') + (row.next_installs == null ? '' : ' <span>→ '+e(n(row.next_installs)+'+')+'</span>');
    }
    function compact(id, data, type) {
        var gp = view(id, data), row = gp.row;
        var available = row && (row.state === 'missing' || type === 'rating' || row.installs != null);
        var value = !available ? e(t('lrdrRefresh')) : type === 'rating' || row.state === 'missing' ? rating(row,false)+delta(row) : downloads(row);
        var action = !available || row.state !== 'fresh' ? 'passport' : 'pulse';
        return '<button type="button" class="lrdr-store-chip" data-lrdr-open="'+action+'" data-lrdr-id="'+Number(id)+'"' +
            ' title="'+e(t(action === 'passport' ? 'lrdrPortal' : 'lrdrRegion'))+'"><span class="lrdr-store-label">🌐 '+e(gp.label)+'</span>'+
            '<span class="lrdr-store-value">'+value+'</span></button>';
    }
    function mini(values) {
        if (!values || !values.some(function (value) { return value != null; })) return '';
        return '<div class="lrdr-mini">'+criteria.map(function (item, index) {
            return values[index] == null ? '' : '<span title="'+e(t(item[1]))+'">'+item[0]+' '+e(n(values[index],1))+'</span>';
        }).join('')+'</div>';
    }
    function options(gp) {
        return Array.from(new Set([gp.code].concat(Object.keys(gp.rows)))).filter(function (code) {
            return code && (code === gp.code || gp.rows[code].score != null);
        }).map(function (code) {
            return '<option value="'+e(code)+'"'+(gp.code === code ? ' selected' : '')+'>'+e(country(code)+(code === 'unknown' ? '' : ' · '+code))+'</option>';
        }).join('');
    }
    function publicPanel(id, data, canOpen) {
        var gp = view(id,data), row = gp.row, entries = options(gp);
        return '<div class="lrdr-public"><div class="lrdr-public-head"><strong>🌐 '+e(t('lrdrPublic'))+'</strong>'+
            (entries ? '<select data-lrdr-country data-lrdr-id="'+Number(id)+'" aria-label="'+e(t('lrdrRegion'))+'">'+entries+'</select>' : '')+'</div>'+
            '<p>'+ (row ? rating(row,true)+delta(row) : e(t('lrdrRefresh')))+'</p>'+
            (row && row.installs != null ? '<p>'+e(t('lrdrDownloadStep'))+' <strong>'+e(n(row.installs)+'+')+'</strong>'+
                (row.next_installs == null ? '' : ' → '+e(t('lrdrGoal',{n:n(row.next_installs)})))+'</p>' : '')+
            (row && row.state === 'stale' ? '<small>'+e(t('lrdrOld'))+'</small>' : '')+
            (row && row.synced_at ? '<small>'+e(t('lrdrSnapshot',{date:new Date(row.synced_at).toLocaleDateString(window.lang)}))+'</small>' : '')+
            (canOpen ? '<button type="button" class="lrdr-link" data-passport>'+e(t('lrdrPortal'))+' ↗</button>' : '')+
            '<small>'+e(t('lrdrCoverage'))+'</small></div>';
    }
    function distribution(rows, type) {
        return '<section class="lrdr-distribution-list"><h4>'+e(t(type === 'countries' ? 'lrdrRegion' : 'lrdrDevices'))+'</h4>'+
            (rows.length ? '<ul>'+rows.map(function (row) {
                var label = type === 'countries' ? country(row.code) : t('lrdrDevice_'+row.code);
                return '<li><strong>'+e(label)+'</strong><span>'+e(t('lrdrDistributionCounts',{i:n(row.installed), r:n(row.responded)}))+
                    (row.rating != null ? ' · '+e(n(row.rating,1))+' ★' : '')+'</span></li>';
            }).join('')+'</ul>' : '<p>'+e(t('lrdrEmpty'))+'</p>')+'</section>';
    }
    function feedback(id, data, canOpen) {
        var responses = data.project_feedback || {total:data.reviews_health?.actual_reviews_count || 0,rating:data.reviews_health?.rating};
        var geo = responses.distribution || {};
        var countries = geo.countries || [], devices = geo.devices || [];
        var observed = countries.reduce(function (sum,row) { return sum + (Number(row.installed) || 0); }, 0);
        return '<section class="la-metric lrdr-feedback" id="la-feedback"><h2>⭐ '+e(t('lrdrPulseTitle'))+'</h2>'+
            '<div class="lrdr-private"><header><strong>DevTestHub</strong><span>'+e(
                (responses.rating > 0 ? n(responses.rating,1)+' ★ · ' : '')+
                t(responses.total ? 'lrdrResponses' : 'lmNoRatings',{n:n(responses.total || 0)}))+'</span></header>' +
            criteria.map(function (item, index) {
                var value = responses.criteria && responses.criteria[index];
                return value == null ? '' : '<div class="lrdr-criterion"><span>'+item[0]+' '+e(t(item[1]))+'</span><strong>'+e(n(value,1))+'</strong>'+
                    '<progress max="100" value="'+(Number(value)*20)+'" aria-label="'+e(t(item[1]))+'"></progress></div>';
            }).join('')+(data.project_feedback ? '<p>'+e(t('lrdrTextScenarios',{texts:n(responses.detailed_text_count || 0), scenarios:n(responses.scenarios_completed || 0)}))+'</p>' : '')+'</div>'+
            publicPanel(id, data.storefront, canOpen)+
            (countries.length || devices.length ? '<details id="la-geo" class="lrdr-geo"><summary>'+e(t('lrdrGeo')+
                (observed ? ' ('+n(observed)+')' : ''))+'</summary><p>'+e(t('lrdrGeoHelp'))+'</p>'+
                distribution(countries,'countries')+distribution(devices,'devices')+'</details>' : '')+'</section>';
    }
    function setCountry(id, code) {
        selected.set(Number(id), code);
        window.dispatchEvent(new CustomEvent('live-storefront:country',{detail:{appId:Number(id)}}));
    }
    window.LiveRadarLayers = {compact:compact, mini:mini, feedback:feedback, publicPanel:publicPanel, setCountry:setCountry,
        country:country, text:t, escape:e};
})();
