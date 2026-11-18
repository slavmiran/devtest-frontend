/* Owner preferences shared by mutual offers and contract applications. */
(function () {
    'use strict';
    var defaults = { reliability: null, allow_newbies: true, completed_tests: null, karma: null,
        feedback_required: false, android: null, avoid_device_duplicates: false };
    var presets = { all: defaults, basic: Object.assign({}, defaults, { reliability: 75, karma: 0 }),
        strict: Object.assign({}, defaults, { reliability: 85, completed_tests: 5, allow_newbies: false }) };
    var choices = { reliability: [null, 60, 75, 85, 95], completed_tests: [null, 1, 5, 15],
        karma: [null, 0, 10, 30], android: [null, 10, 12, 13] };
    var state = { actor: 0, rules: null, projects: [], loading: false, saving: false, draft: null, generation: 0 };
    function t(key, params) { return window.t('autoFilter_' + key, params || {}, lang); }
    function esc(value) { return window.escapeHTML(String(value)); }
    function count(rules) { return Object.keys(defaults).filter(function (key) { return rules[key] !== defaults[key]; }).length; }
    function same(a, b) { return Object.keys(defaults).every(function (key) { return a[key] === b[key]; }); }
    function enabled() {
        return (typeof _autoAcceptMutualEnabled !== 'undefined' && _autoAcceptMutualEnabled)
            || !!window._autoAcceptBountyEnabled;
    }
    function sync() {
        var section = document.getElementById('auto-accept-section');
        if (!section) return;
        if (state.actor !== Number(userId)) {
            close();
            var previous = document.getElementById('auto-accept-filter-controls');
            if (previous) delete previous.dataset.attempted;
            state = { actor: Number(userId), rules: null, projects: [], loading: false, saving: false,
                draft: null, generation: state.generation + 1 };
        }
        var block = document.getElementById('auto-accept-filter-controls');
        if (!block) {
            block = document.createElement('div');
            block.id = 'auto-accept-filter-controls';
            block.className = 'auto-filter-controls';
            section.querySelector('.system-setting-copy-wrap').appendChild(block);
        }
        block.hidden = !enabled();
        if (block.hidden) return;
        if (!state.rules) {
            block.innerHTML = '<button type="button" class="auto-filter-configure" onclick="AutoAcceptFilters.load()">' +
                esc(t(state.loading ? 'loading' : 'error')) + '</button>';
            if (!state.loading && !block.dataset.attempted) { block.dataset.attempted = '1'; load(); }
            return;
        }
        var n = count(state.rules);
        block.innerHTML = '<div class="auto-filter-title">' + esc(t('title')) + '</div><div class="auto-filter-chips">' +
            Object.keys(presets).map(function (key) {
                return '<button type="button" aria-pressed="' + same(state.rules, presets[key]) + '" ' +
                    (state.saving ? 'disabled ' : '') + 'onclick="AutoAcceptFilters.preset(\'' + key + '\')">' + esc(t(key)) + '</button>';
            }).join('') + '</div><button type="button" class="auto-filter-configure" onclick="AutoAcceptFilters.open()" ' +
            (state.saving ? 'disabled' : '') + '>⚙️ ' + esc(t('custom')) + (n ? ' · ' + n : '') + '</button>';
    }
    async function request(filters) {
        var response = await fetch(API_BASE + '/users/me/auto-accept-filters', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init_data: getTelegramInitDataRaw(), filters: filters == null ? null : filters }),
        });
        var payload = await response.json();
        if (!response.ok || payload.status !== 'success' || !payload.filters) throw new Error('filters_unavailable');
        return payload;
    }
    async function load() {
        if (state.loading || state.saving) return;
        var generation = state.generation, actor = Number(userId);
        state.loading = true;
        sync();
        try {
            var result = await request();
            if (generation !== state.generation || actor !== Number(userId)) return;
            state.rules = result.filters;
            state.projects = result.projects || [];
        } catch (_) {
            if (generation === state.generation && actor === Number(userId)) showToast(t('error'));
        } finally {
            if (generation === state.generation && actor === Number(userId)) { state.loading = false; sync(); }
        }
    }
    function close() {
        var modal = document.getElementById('auto-filter-modal');
        if (modal) { modal.remove(); document.body.style.overflow = ''; }
        state.draft = null;
    }
    function open() {
        if (!state.rules || state.saving) return;
        close();
        state.draft = Object.assign({}, state.rules);
        var modal = document.createElement('div');
        modal.id = 'auto-filter-modal';
        modal.className = 'modal-overlay auto-filter-overlay active';
        modal.innerHTML = '<section class="auto-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="auto-filter-heading">' +
            '<header><h3 id="auto-filter-heading" tabindex="-1">' + esc(t('title')) + '</h3>' +
            '<button type="button" data-close aria-label="' + esc(t('close')) + '">×</button></header>' +
            '<p class="auto-filter-hint">' + esc(t('hint')) + '</p><div data-fields></div>' +
            '<footer><button type="button" class="btn btn-secondary" data-reset>' + esc(t('reset')) + '</button>' +
            '<button type="button" class="btn btn-primary" data-save>' + esc(t('save')) + '</button></footer></section>';
        modal.addEventListener('click', function (event) {
            if (event.target === modal || event.target.closest('[data-close]')) close();
            var chip = event.target.closest('[data-filter-key]');
            if (chip && !state.saving) {
                state.draft[chip.dataset.filterKey] = chip.dataset.value === '' ? null : Number(chip.dataset.value);
                paint();
            }
            if (event.target.closest('[data-reset]') && !state.saving) { state.draft = Object.assign({}, defaults); paint(); }
            if (event.target.closest('[data-save]') && !state.saving) save(state.draft);
        });
        modal.addEventListener('change', function (event) {
            if (event.target.dataset.toggle && !state.saving) state.draft[event.target.dataset.toggle] = event.target.checked;
        });
        modal.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { event.preventDefault(); close(); }
            if (event.key === 'Tab') {
                var buttons = Array.from(modal.querySelectorAll('button:not(:disabled),input:not(:disabled)'));
                var next = event.shiftKey ? buttons[buttons.length - 1] : buttons[0];
                if (document.activeElement === (event.shiftKey ? buttons[0] : buttons[buttons.length - 1])) {
                    event.preventDefault(); next.focus();
                }
            }
        });
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';
        paint();
        modal.querySelector('h3').focus();
    }
    function paint() {
        var modal = document.getElementById('auto-filter-modal');
        if (!modal || !state.draft) return;
        var projects = state.projects.filter(function (project) { return Number(project.min_android_version) > 0; });
        var androidLocked = projects.length > 0 && projects.length === state.projects.length;
        var inheritedAndroid = androidLocked && projects.every(function (project) {
            return Number(project.min_android_version) === Number(projects[0].min_android_version);
        }) ? Number(projects[0].min_android_version) : null;
        var fields = Object.keys(defaults).map(function (key) {
            if (!choices[key]) return '<label class="auto-filter-toggle"><span>' + esc(t(key)) + '</span>' +
                '<input type="checkbox" role="switch" data-toggle="' + key + '"' + (state.draft[key] ? ' checked' : '') + '></label>' +
                (key === 'avoid_device_duplicates' ? '<p class="auto-filter-help">' + esc(t('deviceInfo')) + '</p>' : '');
            var android = key === 'android';
            return '<fieldset><legend>' + esc(t(key)) + '</legend><div class="auto-filter-chips">' +
                choices[key].map(function (value) {
                    var label = value == null ? t(android ? 'anyAndroid' : 'any')
                        : android ? t('androidThreshold', { n: value }) : t('threshold', { n: value }) + (key === 'reliability' ? '%' : '');
                    return '<button type="button" data-filter-key="' + key + '" data-value="' + (value == null ? '' : value) +
                        '" aria-pressed="' + ((android && androidLocked ? inheritedAndroid : state.draft[key]) === value) + '"' + (android && androidLocked ? ' disabled' : '') + '>' + esc(label) + '</button>';
                }).join('') + '</div>' + (android ? '<p class="auto-filter-help">' + esc(t('androidInfo')) + '</p>' +
                    projects.map(function (project) { return '<div class="auto-filter-inherited">🔒 ' + esc(project.name) + ' · Android ' +
                        Number(project.min_android_version) + '+ · ' + esc(t('inherited')) + '</div>'; }).join('') : '') + '</fieldset>';
        }).join('');
        modal.querySelector('[data-fields]').innerHTML = fields;
        modal.querySelectorAll('button,input').forEach(function (button) { button.disabled = state.saving || button.disabled; });
        modal.querySelector('[data-reset]').disabled = state.saving;
        modal.querySelector('[data-save]').disabled = state.saving;
        modal.querySelector('[data-close]').disabled = false;
        modal.querySelector('[data-save]').textContent = t(state.saving ? 'saving' : 'save');
    }
    async function save(rules) {
        if (state.saving) return;
        var generation = state.generation, actor = Number(userId);
        state.saving = true; sync(); paint();
        try {
            var result = await request(rules);
            if (generation !== state.generation || actor !== Number(userId)) return;
            state.rules = result.filters; state.projects = result.projects || [];
            close(); showToast(t('saved'));
        } catch (_) {
            if (generation === state.generation && actor === Number(userId)) showToast(t('error'));
        } finally {
            if (generation === state.generation && actor === Number(userId)) { state.saving = false; sync(); paint(); }
        }
    }
    function reasonsHtml(reasons) {
        if (!Array.isArray(reasons) || !reasons.length) return '';
        return '<details class="auto-filter-reasons"><summary>⚠️ ' + esc(t('manual')) + ' · ' + reasons.length +
            '</summary><ul>' + reasons.map(function (reason) {
                var params = Object.assign({}, reason.params);
                Object.keys(params).forEach(function (key) { if (params[key] == null) params[key] = '—'; });
                return '<li>' + esc(t(reason.code + 'Reason', params)) + '</li>';
            }).join('') + '</ul></details>';
    }
    window.AutoAcceptFilters = { sync: sync, load: load, open: open, close: close,
        preset: function (name) { if (presets[name]) save(Object.assign({}, presets[name])); }, reasonsHtml: reasonsHtml };
})();
