/* Project requirements: compact metrics footer and focused settings actions. */
(function () {
    'use strict';

    var expanded = new Set();
    var changes = new Map();
    var emailPending = false;
    var languageProjectKey = '';
    var languageTrigger = null;
    var CHEVRON = '<svg viewBox="0 0 10 6" fill="none" aria-hidden="true"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var ICONS = {
        reviews: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>',
        language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18z"/>',
        android: '<path d="m7 6-2-3m12 3 2-3M4 14v-3a8 8 0 0 1 16 0v3zM8 9h.01M16 9h.01M7 14v6m10-6v6M4 17h16"/>',
        email: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 6 8 7 8-7"/>',
        camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
    };

    function text(key, params) {
        return window.t(key, params || {}, typeof lang !== 'undefined' ? lang : 'en');
    }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function projectKey(project) {
        return Number(project.id || project.app_id || 0) + ':' + Math.max(1, Number(project.run_iteration || 1));
    }
    function projects() { return typeof myProjects !== 'undefined' && Array.isArray(myProjects) ? myProjects : []; }
    function projectById(id) { return projects().find(function (project) { return Number(project.id || project.app_id) === Number(id); }); }
    function projectByKey(key) { return projects().find(function (project) { return projectKey(project) === key; }); }
    function userEmail() {
        return String(typeof getCurrentUserEmail === 'function' ? getCurrentUserEmail() : (window.App && window.App.userEmail || '')).trim();
    }
    function emailOn(project) { return !!userEmail() || project.accepts_email_testers === true; }
    function androidVersion(project) {
        return typeof normalizeMinAndroidVersion === 'function' ? normalizeMinAndroidVersion(project.min_android_version) : Number(project.min_android_version || 0);
    }
    function language(project) {
        var code = String(project.target_lang || 'ALL').toUpperCase();
        return ['RU', 'EN'].includes(code) ? code : 'ALL';
    }
    function boostMeta(project) {
        var campaign = project.screenshot_boost_campaign || {};
        var reward = Math.max(0, Number(campaign.reward_bust || 0));
        var pool = Math.max(0, Number(campaign.pool_remaining || 0));
        return { reward: reward, pool: pool, on: campaign.enabled === true && reward > 0 && pool > 0, reports: reward > 0 ? Math.floor((pool + 1e-8) / reward) : 0 };
    }
    function amount(value) { return typeof formatScreenshotBoostAmount === 'function' ? formatScreenshotBoostAmount(value) : String(value); }
    function plural(count, one, few, many) {
        if (typeof lang === 'undefined' || lang !== 'ru') return text(count === 1 ? one : many, { count: count });
        var mod100 = count % 100;
        var mod10 = count % 10;
        return text(mod100 >= 11 && mod100 <= 19 ? many : mod10 === 1 ? one : mod10 >= 2 && mod10 <= 4 ? few : many, { count: count });
    }
    function activeCount(project) {
        return Number(project.request_reviews !== false) + Number(language(project) !== 'ALL') + Number(androidVersion(project) > 0)
            + Number(emailOn(project)) + Number(boostMeta(project).on) + Number(project.test_mode === 'email_list');
    }
    function icon(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>'; }
    function pending(project, field) {
        var change = changes.get(projectKey(project) + ':' + field);
        return !!(change && change.pending) || (field === 'accepts_email_testers' && emailPending);
    }
    function tile(project, field, label, value, iconName, on, action, toggle) {
        var busy = pending(project, field);
        return '<button type="button" class="pc-project-param' + (on ? ' is-active' : '') + '" data-project-param="' + field + '" onclick="' + action + '"' +
            (toggle ? ' role="switch" aria-checked="' + on + '"' : ' aria-haspopup="dialog"') + ' aria-label="' + esc(text(label) + ': ' + value) + '"' + (busy ? ' disabled aria-busy="true"' : '') + '>' +
            '<span class="pc-project-param__label">' + icon(iconName) + '<span>' + esc(text(label)) + '</span></span>' +
            '<span class="pc-project-param__value' + (toggle ? ' pc-project-param__value--state' : '') + '">' + esc(value) + '</span>' +
            (!toggle ? '<span class="pc-project-param__edit" aria-hidden="true">' + CHEVRON + '</span>' : '') + '</button>';
    }
    function content(project) {
        var id = Number(project.id || project.app_id);
        var open = expanded.has(projectKey(project));
        var count = activeCount(project);
        var version = androidVersion(project);
        var code = language(project);
        var boost = boostMeta(project);
        var toggleLabel = text(open ? 'pcParamsCollapse' : 'pcParamsExpand');
        var languageValue = code === 'RU' ? '🇷🇺 RU' : code === 'EN' ? '🇬🇧 EN' : 'ALL';
        var onLabel = text('pcParamsOn');
        var offLabel = text('pcParamsOff');
        var countLabel = plural(count, 'pcParamsCountOne', 'pcParamsCountFew', 'pcParamsCountMany');
        var boostValue = boost.reward > 0 ? '+' + amount(boost.reward) + ' $BUST' : offLabel;
        var boostStatus = !boost.on ? text(boost.pool <= 0 && boost.reward > 0 ? 'pcParamsBoostEmpty' : 'pcParamsBoostOff') : '';
        return '<div class="pc-project-params__head">' +
            '<button type="button" class="pc-project-params__toggle" onclick="ProjectParameters.toggle(' + id + ',event)" aria-expanded="' + open + '" aria-controls="project-parameters-body-' + id + '" title="' + esc(toggleLabel) + '">' +
                '<span class="pc-project-params__title">' + esc(text('pcParamsTitle')) + '</span>' +
                '<span class="pc-project-params__count" title="' + esc(text('pcParamsCountHint')) + '"><i aria-hidden="true"></i>' + esc(countLabel) + '</span>' +
                '<span class="pc-project-params__chevron" aria-hidden="true">' + CHEVRON + '</span>' +
            '</button>' +
            '<span class="pc-ping-slot" data-pc-ping-slot="' + id + '">' +
                '<button type="button" class="telegram-community-chip pc-ping-mini" data-pc-ping-mini="' + id + '" onclick="event.stopPropagation(); if(typeof pcProofPingOpenCommunity===\'function\'){pcProofPingOpenCommunity(event);}else if(typeof openCommunityChat===\'function\'){openCommunityChat(event);}" aria-label="' + esc(text('pulseChat')) + '" title="' + esc(text('pulseChat')) + '">' +
                    '<svg class="telegram-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l-.313 4.674c.459 0 .661-.21.918-.46l2.204-2.143 4.585 3.387c.845.466 1.455.226 1.666-.784l3.007-14.167c.309-1.238-.473-1.8-1.471-1.317z"/></svg>' +
                '</button>' +
            '</span>' +
        '</div>' +
        '<div class="pc-project-params__body" id="project-parameters-body-' + id + '"' + (open ? '' : ' inert aria-hidden="true"') + '><div class="pc-project-params__clip"><div class="pc-project-params__content">' +
            '<div class="pc-project-params__grid">' +
                tile(project, 'request_reviews', 'pcParamsReviews', project.request_reviews !== false ? onLabel : offLabel, 'reviews', project.request_reviews !== false, 'ProjectParameters.toggleReviews(' + id + ',event)', true) +
                tile(project, 'target_lang', 'pcParamsLanguage', languageValue, 'language', code !== 'ALL', 'ProjectParameters.openLanguage(' + id + ',event)', false) +
                tile(project, 'min_android_version', 'pcParamsAndroid', version > 0 ? 'Android ' + version + '+' : text('pcParamsAndroidAny'), 'android', version > 0, 'ProjectParameters.openAndroid(' + id + ',event)', false) +
                tile(project, 'accepts_email_testers', 'pcParamsEmail', emailOn(project) ? onLabel : offLabel, 'email', emailOn(project), 'ProjectParameters.toggleEmail(' + id + ',event)', true) +
            '</div>' +
            '<button type="button" class="pc-project-boost' + (boost.on ? ' is-active' : '') + '" data-project-param="screenshot_boost_campaign" onclick="openScreenshotBoostSettings(' + id + ',event)" aria-haspopup="dialog">' +
                '<span class="pc-project-boost__heading"><span class="pc-project-boost__label">' + icon('camera') + esc(text('pcParamsBoost')) + '</span><span class="pc-project-boost__reward">' + esc(boostValue) + '</span></span>' +
                '<span class="pc-project-boost__details"><span>' + esc(text('pcParamsBoostPool', { amount: amount(boost.pool) })) + '</span>' +
                    (boost.on ? '<span>' + esc(plural(boost.reports, 'pcParamsReportsOne', 'pcParamsReportsFew', 'pcParamsReportsMany')) + '</span>' : '<span class="pc-project-boost__status">' + esc(boostStatus) + '</span>') +
                '</span><span class="pc-project-boost__chevron" aria-hidden="true">' + CHEVRON + '</span>' +
            '</button>' +
            (project.test_mode === 'email_list' ? '<button type="button" class="pc-project-params__access" onclick="event.stopPropagation(); openEditModal(' + id + ',{focusSetup:true})">' + icon('email') + '<span>' + esc(text('pcParamsEmailAccess')) + '</span>' + CHEVRON + '</button>' : '') +
        '</div></div></div>';
    }
    function build(project) {
        return '<section class="pc-project-params' + (expanded.has(projectKey(project)) ? ' is-expanded' : '') + '" id="project-parameters-' + Number(project.id || project.app_id) + '" aria-label="' + esc(text('pcParamsTitle')) + '">' + content(project) + '</section>';
    }
    function stop(event) { if (event) { event.preventDefault(); event.stopPropagation(); } }
    function toggle(id, event) {
        stop(event);
        var project = projectById(id);
        var panel = document.getElementById('project-parameters-' + Number(id));
        if (!project || !panel) return;
        var open = !panel.classList.contains('is-expanded');
        if (open) expanded.add(projectKey(project)); else expanded.delete(projectKey(project));
        panel.classList.toggle('is-expanded', open);
        panel.querySelector('.pc-project-params__toggle').setAttribute('aria-expanded', String(open));
        panel.querySelector('.pc-project-params__toggle').title = text(open ? 'pcParamsCollapse' : 'pcParamsExpand');
        var body = panel.querySelector('.pc-project-params__body');
        body.inert = !open;
        if (open) body.removeAttribute('aria-hidden'); else body.setAttribute('aria-hidden', 'true');
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    }
    function update(project) {
        var panel = document.getElementById('project-parameters-' + Number(project.id || project.app_id));
        if (!panel) return;
        var focusKey = panel.contains(document.activeElement) ? document.activeElement.getAttribute('data-project-param') : null;
        panel.classList.toggle('is-expanded', expanded.has(projectKey(project)));
        panel.innerHTML = content(project);
        if (focusKey) {
            var target = panel.querySelector('[data-project-param="' + focusKey + '"]');
            if (target && !target.disabled) target.focus({ preventScroll: true });
        }
    }
    function cache() {
        if (typeof setProjectsCache === 'function') setProjectsCache({ projects: projects(), visibilityStats: typeof visibilityStats !== 'undefined' ? visibilityStats : null, ts: Date.now() });
    }
    function remember(project, field, value, isPending) {
        changes.set(projectKey(project) + ':' + field, { key: projectKey(project), field: field, value: value, at: Date.now(), pending: !!isPending });
    }
    function recordSaved(project, field) {
        remember(project, field, project[field], false);
        update(project);
    }
    // Only responses that began before a local save may carry the old setting.
    function reconcile(records, requestedAt) {
        changes.forEach(function (change, key) {
            var project = records.find(function (item) { return projectKey(item) === change.key; });
            if (!project) return;
            if (change.pending || change.at >= requestedAt) project[change.field] = change.value;
            else changes.delete(key);
        });
        return records;
    }
    async function save(id, field, value, options) {
        options = options || {};
        var project = projectById(id);
        if (!project || pending(project, field)) return false;
        var key = projectKey(project);
        var previous = project[field];
        remember(project, field, options.defer ? previous : value, true);
        if (!options.defer) project[field] = value;
        if (field === 'accepts_email_testers') emailPending = true;
        projects().forEach(update);
        try {
            var apiBase = (window.App && window.App.API_BASE) || window.API_BASE || (typeof API_BASE !== 'undefined' ? API_BASE : '');
            var initData = typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : ((window.tg && window.tg.initData) || '');
            var payload = Object.assign({}, options.extra || {}, { init_data: initData });
            payload[field] = value;
            var response = await fetch(String(apiBase).replace(/\/+$/, '') + '/projects/' + Number(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            var result = await response.json().catch(function () { return {}; });
            if (!response.ok || result.status !== 'success') throw new Error(result.code || result.message || 'save_failed');
            var current = projectByKey(key);
            if (current) {
                current[field] = value;
                remember(current, field, value, false);
            }
            if (options.onSuccess) options.onSuccess();
            return true;
        } catch (_) {
            changes.delete(key + ':' + field);
            var current = projectByKey(key);
            if (current) current[field] = previous;
            if (typeof showToast === 'function') showToast(text('pcParamsSaveError'));
            return false;
        } finally {
            if (field === 'accepts_email_testers') emailPending = false;
            cache();
            projects().forEach(update);
        }
    }
    function toggleReviews(id, event) {
        stop(event);
        var project = projectById(id);
        if (project) return save(id, 'request_reviews', project.request_reviews === false);
    }
    function openAndroid(id, event) {
        stop(event);
        var project = projectById(id);
        if (!project || pending(project, 'min_android_version') || typeof openAndroidVersionPicker !== 'function') return;
        var key = projectKey(project);
        openAndroidVersionPicker('project', { value: androidVersion(project), onSelect: function (value) {
            var current = projectByKey(key);
            if (current && androidVersion(current) !== value) save(id, 'min_android_version', value);
        } });
    }
    function openLanguage(id, event) {
        stop(event);
        var project = projectById(id);
        var modal = document.getElementById('project-language-modal');
        if (!project || !modal || pending(project, 'target_lang')) return;
        languageProjectKey = projectKey(project);
        languageTrigger = event && event.currentTarget || document.activeElement;
        document.getElementById('project-language-title').textContent = text('projectLanguageLabel');
        document.getElementById('project-language-hint').textContent = text('projectLanguageHint');
        document.getElementById('project-language-options').innerHTML = ['RU', 'EN', 'ALL'].map(function (code) {
            var selected = language(project) === code;
            return '<button type="button" class="android-version-option' + (selected ? ' is-selected' : '') + '" aria-pressed="' + selected + '" onclick="ProjectParameters.selectLanguage(\'' + code + '\')"><span>' + esc(text('projectLanguage' + (code === 'RU' ? 'Ru' : code === 'EN' ? 'En' : 'All'))) + '</span><span class="android-version-option__mark" aria-hidden="true">' + (selected ? '✓' : '') + '</span></button>';
        }).join('');
        modal.classList.add('active');
        modal.querySelector('.is-selected').focus({ preventScroll: true });
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }
    function closeLanguage(event) {
        var modal = document.getElementById('project-language-modal');
        if (!modal || !modal.classList.contains('active') || (event && event.target !== modal)) return;
        modal.classList.remove('active');
        if (languageTrigger && document.body.contains(languageTrigger)) languageTrigger.focus({ preventScroll: true });
        languageTrigger = null;
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }
    function selectLanguage(code) {
        if (!['RU', 'EN', 'ALL'].includes(code)) return;
        var project = projectByKey(languageProjectKey);
        closeLanguage();
        if (project && language(project) !== code) return save(project.id || project.app_id, 'target_lang', code);
    }
    function syncEmail(email) {
        window.App = window.App || {};
        window.App.userEmail = email;
        if (window.App.state) window.App.state._userEmail = email;
        if (typeof _userEmail !== 'undefined') _userEmail = email;
        projects().forEach(function (project) {
            project.accepts_email_testers = !!email;
            remember(project, 'accepts_email_testers', !!email, false);
            update(project);
        });
        if (typeof syncSettingsEmailRowUi === 'function') syncSettingsEmailRowUi();
        cache();
    }
    async function toggleEmail(id, event) {
        stop(event);
        var project = projectById(id);
        if (!project || emailPending) return;
        if (emailOn(project)) {
            var confirmed = await new Promise(function (resolve) {
                if (window.tg && typeof window.tg.showConfirm === 'function') window.tg.showConfirm(text('pcParamsEmailDisableConfirm'), resolve);
                else resolve(window.confirm(text('pcParamsEmailDisableConfirm')));
            });
            if (!confirmed || emailPending) return;
            return save(id, 'accepts_email_testers', false, { defer: true, onSuccess: function () { syncEmail(''); } });
        }
        var key = projectKey(project);
        if (typeof openEmailCollectModal === 'function') {
            openEmailCollectModal({
                title: text('pcParamsEmailTitle'), text: text('pcParamsEmailHint'), primaryLabel: text('pcParamsEmailEnable'),
                onSave: function (email) {
                    syncEmail(email);
                    if (projectByKey(key)) save(id, 'accepts_email_testers', true, { extra: { tester_email: email } });
                },
            });
        }
    }
    document.addEventListener('keydown', function (event) {
        var modal = document.getElementById('project-language-modal');
        if (!modal || !modal.classList.contains('active')) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeLanguage(); }
        if (event.key === 'Tab') {
            var buttons = Array.from(modal.querySelectorAll('button:not(:disabled)'));
            var index = buttons.indexOf(document.activeElement);
            if (index < 0 || (!event.shiftKey && index === buttons.length - 1) || (event.shiftKey && index === 0)) {
                event.preventDefault();
                buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
            }
        }
    });
    window.ProjectParameters = { build: build, update: update, recordSaved: recordSaved, toggle: toggle, toggleReviews: toggleReviews, openAndroid: openAndroid, openLanguage: openLanguage, closeLanguage: closeLanguage, selectLanguage: selectLanguage, toggleEmail: toggleEmail, reconcile: reconcile };
})();
