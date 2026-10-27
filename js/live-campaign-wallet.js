/* A compact campaign wallet uses the existing project editor and option-sheet styles. */
(function () {
    'use strict';
    var context = null, trigger = null, triggerSelector = null, busy = false;
    function tr(key, vars) { return window.t(key, vars || {}, typeof lang === 'undefined' ? 'en' : lang); }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function syncBack() { if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton(); }
    function modal() {
        var node = document.getElementById('live-campaign-wallet-modal');
        if (!node) {
            document.body.insertAdjacentHTML('beforeend', '<div id="live-campaign-wallet-modal" class="modal-overlay project-instructions-overlay">' +
                '<section class="project-instructions-sheet" role="dialog" aria-modal="true" aria-labelledby="live-campaign-wallet-title">' +
                '<div class="project-instructions-sheet__handle" aria-hidden="true"></div><div data-lc-wallet-body></div></section></div>');
            node = document.getElementById('live-campaign-wallet-modal');
            node.onclick = function (event) { if (event.target === node) close(); };
            node.addEventListener('keydown', function (event) {
                if (event.key === 'Escape') { event.preventDefault(); close(); }
                if (event.key !== 'Tab') return;
                var list = Array.from(node.querySelectorAll('button:not(:disabled),input:not(:disabled)'));
                if (!list.length) return;
                if (event.shiftKey && document.activeElement === list[0]) { event.preventDefault(); list[list.length - 1].focus(); }
                else if (!event.shiftKey && document.activeElement === list[list.length - 1]) { event.preventDefault(); list[0].focus(); }
            });
        }
        return node;
    }
    function close() {
        modal().classList.remove('active'); context = null;
        var focus = trigger && trigger.isConnected ? trigger : triggerSelector && document.querySelector(triggerSelector);
        if (focus && !focus.disabled) focus.focus({ preventScroll: true });
        trigger = null; triggerSelector = null; syncBack();
    }
    function show(adapter, control, html) {
        if (busy || !adapter.get()) return;
        context = adapter; trigger = control;
        var section = control && control.closest('[data-live-campaigns]');
        triggerSelector = section && control.dataset.lcAction === 'project-pool' ? '[data-live-campaigns="'+Number(section.dataset.liveCampaigns)+'"] [data-lc-action="project-pool"]' : null;
        var node = modal(); node.querySelector('[data-lc-wallet-body]').innerHTML = html;
        node.classList.add('active'); syncBack();
        var focus = node.querySelector('input,button'); if (focus) focus.focus({ preventScroll: true });
    }
    function pending(value) {
        busy = value;
        modal().querySelectorAll('button,input').forEach(function (node) { node.disabled = value; });
    }
    async function change(data, dismiss) {
        var adapter = context; if (!adapter || busy || !adapter.get()) return;
        pending(true);
        try {
            var ok = await adapter.change(data);
            if (adapter !== context) return;
            if (!adapter.get()) { close(); return; }
            updateBalances(adapter);
            if (ok && dismiss) close();
            if (!ok) {
                var error = modal().querySelector('[data-lc-wallet-error]');
                if (error) { error.hidden = false; error.textContent = tr('lcFailed'); }
                var wallet = modal().querySelector('[data-lc-wallet-toggle]'); if (wallet) wallet.checked = adapter.get().allow_wallet_spending;
            }
        } finally { pending(false); }
    }
    function formatAmount(value) {
        return typeof value === 'number' && Number.isFinite(value)
            ? value.toLocaleString(typeof lang !== 'undefined' && lang === 'ru' ? 'ru-RU' : 'en-US') + ' $BUST' : '—';
    }
    function updateBalances(adapter) {
        var c = adapter.get(); if (!c) return;
        [['main','wallet_balance'],['pool','pool_available'],['reserved','reserved_bust']].forEach(function(pair){
            var node=modal().querySelector('[data-lc-wallet-'+pair[0]+']');if(node)node.textContent=formatAmount(c[pair[1]]);
        });
    }
    function open(adapter, control) {
        var c = adapter.get(); if (!c) return;
        show(adapter, control,
            '<header class="project-instructions-sheet__head"><div><h3 id="live-campaign-wallet-title">' + esc(tr('lcPoolEdit')) + '</h3></div></header>' +
            '<dl class="lc-wallet-balances"><div class="lc-wallet-balances__main"><dt>'+esc(tr('lcMainWalletBalance'))+'</dt><dd data-lc-wallet-main>'+esc(formatAmount(c.wallet_balance))+'</dd></div>'+
            '<div><dt>'+esc(tr('lcPool'))+'</dt><dd data-lc-wallet-pool>'+esc(formatAmount(c.pool_available))+'</dd></div><div><dt>'+esc(tr('lcReservedLabel'))+'</dt><dd data-lc-wallet-reserved>'+esc(formatAmount(c.reserved_bust))+'</dd></div></dl>' +
            '<label class="project-email-settings-field"><span>' + esc(tr('lcAmount')) + '</span><input data-lc-wallet-amount type="number" min="1" max="1000000" step="1" inputmode="numeric"></label>' +
            '<label class="project-email-settings-switch"><span><strong>' + esc(tr('lcWallet')) + '</strong><small>' + esc(tr('lcWalletHint')) + '</small></span>' +
            '<input data-lc-wallet-toggle type="checkbox"' + (c.allow_wallet_spending ? ' checked' : '') + '><i aria-hidden="true"></i></label>' +
            '<p class="project-instructions-error" data-lc-wallet-error role="alert" hidden></p>' +
            '<div class="lc-wallet-actions"><button type="button" class="btn btn-primary" data-lc-wallet-deposit>' + esc(tr('lcDeposit')) + '</button>' +
            '<button type="button" class="btn btn-secondary" data-lc-wallet-withdraw>' + esc(tr('lcWithdraw')) + '</button></div>' +
            '<button type="button" class="btn btn-secondary" data-lc-wallet-close>' + esc(tr('lcClose')) + '</button>');
        var node = modal();
        node.querySelector('[data-lc-wallet-toggle]').onchange = function () { change({ amount: 0, allow_wallet_spending: this.checked }, false); };
        ['deposit', 'withdraw'].forEach(function (action) {
            node.querySelector('[data-lc-wallet-' + action + ']').onclick = function () {
                var value = Number(node.querySelector('[data-lc-wallet-amount]').value);
                if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000) {
                    var error = node.querySelector('[data-lc-wallet-error]'); error.hidden = false; error.textContent = tr('lcInvalidAmount'); return;
                }
                change({ amount: action === 'deposit' ? value : -value }, true);
            };
        });
        node.querySelector('[data-lc-wallet-close]').onclick = close;
    }
    function openStatus(adapter, control) {
        var c = adapter.get(); if (!c) return;
        show(adapter, control, '<header class="project-instructions-sheet__head"><div><h3 id="live-campaign-wallet-title">' + esc(tr('lcStatusTitle')) +
            '</h3><p>' + esc(tr('lcPauseHint')) + '</p></div></header><div class="android-version-picker-list">' + ['active', 'paused'].map(function (value) {
                var selected = c.status === value;
                return '<button class="android-version-option' + (selected ? ' is-selected' : '') + '" type="button" aria-pressed="' + selected + '" data-lc-status="' + value + '">' +
                    '<span>' + esc(tr(value === 'active' ? 'lcActive' : 'lcOff')) + '</span><span class="android-version-option__mark">' + (selected ? '✓' : '') + '</span></button>';
            }).join('') + '</div>');
        modal().querySelectorAll('[data-lc-status]').forEach(function (button) { button.onclick = function () { change(button.dataset.lcStatus, true); }; });
    }
    window.LiveCampaignWallet = { open: open, close: close, openStatus: openStatus };
})();
