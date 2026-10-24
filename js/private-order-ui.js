/* Private-order onboarding and staff tools. No polling or recurring background work. */
(function () {
    'use strict';
    function text(key, vars) { return getProjectUiText(key, key, vars || {}); }
    function escape(value) { return window.escapeHTML(String(value || '')); }
    function remember(order) {
        var rows = Array.isArray(window._gtActiveOrdersCache) ? window._gtActiveOrdersCache.slice() : [];
        var index = rows.findIndex(function(row) { return Number(row.id) === Number(order.id); });
        if (index < 0) rows.unshift(order);
        else rows[index] = Object.assign({}, rows[index], order);
        window._gtActiveOrdersCache = rows;
        window._gtActiveOrdersCacheAt = Date.now();
    }
    function close(id, focusId) {
        var overlay = document.getElementById(id);
        if (overlay) overlay.remove();
        var card = document.querySelector('#tab-projects [data-gt-order-id="' + Number(focusId) + '"]');
        if (card) { card.setAttribute('tabindex', '-1'); card.focus({ preventScroll: true }); }
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    }
    function dialog(id, order, title, body, primary, submit) {
        close(id);
        var overlay = document.createElement('div');
        overlay.id = id;
        overlay.className = 'modal-overlay private-order-overlay active';
        overlay.innerHTML = '<form class="private-order-dialog" role="dialog" aria-modal="true" aria-labelledby="' + id + '-title">' +
            '<header class="private-order-dialog__header"><div><div class="private-order-dialog__code">' + escape(order.public_code) + '</div>' +
            '<h2 id="' + id + '-title">' + escape(title) + '</h2></div><button type="button" class="private-order-dialog__close" aria-label="' + escape(text('gtDialogClose')) + '">×</button></header>' +
            '<div class="private-order-dialog__body">' + body + '</div><footer class="private-order-dialog__footer">' +
            '<p class="private-order-dialog__error" role="alert" hidden></p><button type="submit" class="btn btn-primary">' + escape(primary) + '</button></footer></form>';
        var dismiss = function() { close(id, order.id); };
        overlay.onclick = function(event) { if (event.target === overlay) dismiss(); };
        overlay.querySelector('.private-order-dialog__close').onclick = dismiss;
        overlay.querySelector('form').onsubmit = function(event) { event.preventDefault(); submit(overlay, dismiss); };
        overlay.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(); }
            if (event.key === 'Tab') {
                var nodes = overlay.querySelectorAll('button:not(:disabled), input:not(:disabled)');
                var first = nodes[0], last = nodes[nodes.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
            }
        });
        document.body.appendChild(overlay);
        overlay.querySelector('[type="submit"]').focus({ preventScroll: true });
        if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
        return overlay;
    }

    window.showPrivateOrderConfirmation = function(order) {
        var user = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user || {};
        var name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        var body = '<p class="private-order-dialog__greeting">' + escape(name ? text('gtAcceptedHello', { name: name }) : text('gtAcceptedHelloFallback')) + '</p>' +
            '<p>' + escape(text('gtAcceptedIntro', { app: order.app_name, code: order.public_code })) + '</p>' +
            '<div class="private-order-dialog__status">' + escape(text('gtAcceptedChecking')) + '</div>' +
            '<p>' + escape(text('gtAcceptedAccess')) + '</p>' +
            '<section class="private-order-dialog__guarantee"><h3>' + escape(text('gtGuaranteeTitle')) + '</h3>' +
            '<p>' + escape(text('gtGuaranteeWait')) + '</p><p>' + escape(text('gtGuaranteeEarly')) + '</p>' +
            '<p>' + escape(text('gtGuaranteeRefund')) + '</p></section>' +
            '<p class="private-order-dialog__reassurance">' + escape(text('gtAcceptedReassurance')) + '</p>';
        dialog('private-order-confirmation', order, text('gtAcceptedTitle'), body, text('gtAcceptedContinue'), function(_, dismiss) { dismiss(); });
    };

    window.openProjectsTab = async function(options) {
        options = options || {};
        if (options.order) remember(options.order); // Canonical POST response: no extra GET before first paint.
        var tab = document.getElementById('tab-projects');
        if (!tab || !tab.classList.contains('active')) window.switchTab('projects');
        else if (typeof window.reconcileProjectsView === 'function') window.reconcileProjectsView();
        else renderProjects(true);
        if (options.focusOrderId) await window.focusGuaranteedTestOrder(options.focusOrderId, { highlightMs: 3000, confirmation: !!options.confirmation });
        if (options.confirmation && options.order && document.getElementById('tab-projects').classList.contains('active')) {
            window.showPrivateOrderConfirmation(options.order);
        }
    };

    window.openPrivateOrderDayModal = function(orderId) {
        var order = getGuaranteedOrderById(orderId);
        if (!order || order.can_adjust_day !== true || order.status !== 'in_progress') return;
        var meta = getGuaranteedOrderCardMeta(order);
        var body = '<p>' + escape(order.app_name) + '</p><label class="private-order-day-label" for="private-order-day-input">' + escape(text('gtDayNew')) + '</label>' +
            '<div class="private-order-day-control"><input id="private-order-day-input" type="number" inputmode="numeric" min="1" max="15" step="1" required value="' + (meta.day || 1) + '"><span>/ 15</span></div>' +
            '<p class="private-order-day-preview" aria-live="polite"></p>' +
            '<p class="private-order-dialog__quiet">' + escape(text('gtDayQuiet')) + '</p>';
        var busy = false;
        var modal = dialog('private-order-day', order, text('gtAdjustDay'), body, text('gtDayApply'), async function(overlay, dismiss) {
            if (busy) return;
            var input = overlay.querySelector('input'), day = Number(input.value);
            if (!Number.isInteger(day) || day < 1 || day > 15 || !input.reportValidity()) return;
            busy = true;
            var button = overlay.querySelector('[type="submit"]'), error = overlay.querySelector('[role="alert"]');
            button.disabled = true; button.textContent = text('gtDaySaving'); input.disabled = true; error.hidden = true;
            var controller = new AbortController(), timeout = setTimeout(function() { controller.abort(); }, 15000);
            try {
                var response = await fetch(((window.App && window.App.API_BASE) || window.API_BASE || '') + '/admin/private-orders/' + Number(order.id) + '/set-day', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
                    body: JSON.stringify({ new_day: day, init_data: typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : (window.Telegram.WebApp.initData || '') })
                });
                var payload = await response.json();
                if (!response.ok || payload.status !== 'success' || Number((payload.order || {}).id) !== Number(order.id)) throw new Error(payload.code || 'order_update_failed');
                remember(payload.order);
                var card = document.querySelector('#tab-projects [data-gt-order-id="' + Number(order.id) + '"]');
                if (card) card.outerHTML = buildGuaranteedOrderCardHtml(getGuaranteedOrderById(order.id));
                dismiss();
                if (typeof showToast === 'function') showToast(text('gtDaySaved'));
            } catch (_) {
                error.textContent = text('gtDayFailed'); error.hidden = false;
            } finally {
                clearTimeout(timeout); busy = false; button.disabled = false; button.textContent = text('gtDayApply'); input.disabled = false;
            }
        });
        function preview() {
            var day = Number(modal.querySelector('input').value);
            var date = Number.isInteger(day) && day >= 1 && day <= 15
                ? formatGuaranteedOrderDate(new Date(Date.now() + (15 - day) * 86400000).toISOString().slice(0, 10)) : '—';
            modal.querySelector('.private-order-day-preview').textContent = text('gtDayDatePreview', { date: date });
        }
        modal.querySelector('input').addEventListener('input', preview);
        preview();
    };
})();
