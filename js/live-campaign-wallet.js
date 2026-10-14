/* A compact campaign wallet uses the existing project editor and option-sheet styles. */
(function () {
    'use strict';
    var context = null, trigger = null, busy = false;
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
        if (trigger && trigger.isConnected) trigger.focus({ preventScroll: true });
        trigger = null; syncBack();
    }
    function show(adapter, control, html) {
        if (busy || !adapter.get()) return;
        context = adapter; trigger = control;
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
            if (ok && dismiss) close();
            if (!ok) {
                var error = modal().querySelector('[data-lc-wallet-error]');
                if (error) { error.hidden = false; error.textContent = tr('lcFailed'); }
                var wallet = modal().querySelector('[data-lc-wallet-toggle]'); if (wallet) wallet.checked = adapter.get().allow_wallet_spending;
            }
        } finally { pending(false); }
    }
    function open(adapter, control) {
        var c = adapter.get(); if (!c) return;
        show(adapter, control,
            '<header class="project-instructions-sheet__head"><div><h3 id="live-campaign-wallet-title">' + esc(tr('lcPoolEdit')) + '</h3><p>' +
            esc(tr('lcWalletSummary', { pool: c.pool_available, reserved: c.reserved_bust || 0 })) + '</p></div></header>' +
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
