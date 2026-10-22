/* Advisory only: never reloads, blocks a write, closes a form or aborts an upload. */
(function () {
    'use strict';
    var timer, expiry, busy = false, banner, spacer, seen = '', lastState = '', completed = '';
    function hide() {
        if (banner) banner.hidden = true;
        if (spacer) spacer.hidden = true;
        document.documentElement.classList.remove('deploy-banner-visible');
        document.documentElement.style.setProperty('--deploy-banner-height', '0px');
    }
    function render(state) {
        if (!banner) return;
        var language = typeof lang === 'string' ? lang : 'en';
        var key = 'deployStatus_' + state;
        banner.textContent = window.t(key, {}, language);
        banner.dataset.state = state;
        banner.hidden = false;
        spacer.hidden = false;
        document.documentElement.classList.add('deploy-banner-visible');
        document.documentElement.style.setProperty('--deploy-banner-height', banner.offsetHeight + 'px');
        spacer.style.height = banner.offsetHeight + 'px';
    }
    function accept(value) {
        if (!value || !value.enabled) { clearTimeout(expiry); seen = ''; lastState = ''; hide(); return; }
        var state = value.state;
        if (state === 'updating' && value.deploy_id) {
            if (completed === value.deploy_id) return; // Ignore a stale old instance after verified success.
            seen = value.deploy_id;
            completed = '';
        } else if (seen && completed === seen && state === 'unknown') {
            return; // A warming-up instance cannot undo verified terminal evidence.
        } else if (!seen || (value.deploy_id && value.deploy_id !== seen)) {
            clearTimeout(expiry); hide(); return;
        }
        if (state === 'complete' || state === 'failed') {
            if (completed === seen) return; // Polls must not repeatedly re-show a terminal banner.
            clearTimeout(expiry);
            completed = seen;
            render(state);
            expiry = setTimeout(function () { hide(); seen = ''; }, state === 'complete' ? 10000 : 30000);
        } else {
            clearTimeout(expiry);
            state = state === 'updating' ? state : 'unknown';
            render(state);
            expiry = setTimeout(function () { if (seen) render('unknown'); },
                Math.max(1, Math.min(45, Number(value.valid_for_seconds) || 1)) * 1000);
        }
        if (state !== lastState && typeof loadEvents === 'function') {
            Promise.resolve().then(function () { return loadEvents(); }).catch(function () {});
        }
        lastState = state;
    }
    async function refresh() {
        if (busy || document.hidden || typeof API_BASE === 'undefined') return;
        clearTimeout(timer);
        busy = true;
        var delay = 10000;
        var controller = new AbortController();
        var timeout = setTimeout(function () { controller.abort(); }, 3500);
        try {
            var response = await fetch(API_BASE + '/deploy-status', {
                signal: controller.signal, cache: 'no-store',
            });
            if (!response.ok) { delay = 30000; return; }
            var value = await response.json();
            accept(value);
            delay = value.enabled ? 10000 : 60000;
        } catch (error) {
            // The expiry timer changes a stale warning to "status unknown".
            delay = 15000;
        } finally {
            clearTimeout(timeout);
            busy = false;
            timer = setTimeout(refresh, delay);
        }
    }
    function init() {
        spacer = document.createElement('div');
        spacer.hidden = true;
        spacer.setAttribute('aria-hidden', 'true');
        banner = document.createElement('div');
        banner.id = 'deploy-status-banner';
        banner.hidden = true;
        banner.setAttribute('role', 'status');
        banner.setAttribute('aria-live', 'polite');
        document.body.prepend(spacer, banner);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('online', refresh);
        window.addEventListener('resize', function () { if (banner && !banner.hidden) render(banner.dataset.state); });
        refresh();
    }
    window.DeployStatus = { refresh: refresh };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
