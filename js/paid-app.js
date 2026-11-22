/* Paid closed-test apps, owner comments, and account login details. */
(function () {
    'use strict';

    var KEY_ICON_PATHS = '<path d="M12.4 2.7a2.5 2.5 0 0 1 3.4 0l5.5 5.5a2.5 2.5 0 0 1 0 3.4l-3.7 3.7a2.5 2.5 0 0 1-3.4 0L8.7 9.8a2.5 2.5 0 0 1 0-3.4z"/><path d="m14 7 3 3"/><path d="m9.4 10.6-6.814 6.814A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814"/>';
    function keyIcon(className) {
        return '<svg class="' + (className || 'key-square-icon') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + KEY_ICON_PATHS + '</svg>';
    }
    function keyMarkHtml() {
        return '<span class="account-access-card__mark" aria-hidden="true">' + keyIcon('account-access-card__key') + '</span>';
    }

    function t(key) {
        return window.t(key, {}, window.lang || (typeof lang !== 'undefined' ? lang : 'ru'));
    }
    function esc(value) {
        return window.escapeHTML(String(value == null ? '' : value));
    }
    function idFor(scope, name) {
        return (scope === 'edit' ? 'edit-' : '') + name;
    }
    function field(scope, name) {
        return document.getElementById(idFor(scope, name));
    }
    function clip(value, max) {
        return String(value || '').trim().slice(0, max);
    }
    function appType(scope) {
        var input = field(scope, 'app-type');
        return input && input.value === 'paid' ? 'paid' : 'free';
    }
    function commentVisible(scope) {
        var box = field(scope, 'owner-comment-visible');
        return !box || !!box.checked;
    }
    function standardMode(scope) {
        if (scope === 'edit') {
            var flow = window.AccessSetupManager && AccessSetupManager.getEditFlow && AccessSetupManager.getEditFlow();
            if (flow && flow.mode) return flow.mode === 'standard_group';
            return !(window.editProjectFlow && window.editProjectFlow.emailMode);
        }
        if (window.addProjectFlow && window.addProjectFlow.emailMode) return false;
        var standard = document.getElementById('seg-standard');
        return !standard || standard.classList.contains('active');
    }
    function payload(scope) {
        return {
            app_type: appType(scope),
            test_login: clip(field(scope, 'test-login') && field(scope, 'test-login').value, 150),
            test_password: clip(field(scope, 'test-password') && field(scope, 'test-password').value, 150),
            test_credentials_note: clip(field(scope, 'test-credentials-note') && field(scope, 'test-credentials-note').value, 300),
            owner_comment_visible: commentVisible(scope)
        };
    }
    var licenseScope = 'add';
    var LICENSE_GUIDE_URL = 'https://t.me/googleplay_console_12testers/31/82651';
    var TESTER_GROUP_EMAIL = 'google-play-dev-test@googlegroups.com';
    function paintType(scope) {
        var type = appType(scope);
        document.querySelectorAll('[data-app-type-scope="' + scope + '"]').forEach(function (button) {
            var on = button.dataset.appType === type;
            button.setAttribute('aria-pressed', String(on));
            button.classList.toggle('active', on);
            button.classList.toggle('selected-free', on && type === 'free');
            button.classList.toggle('selected-paid', on && type === 'paid');
        });
        var panel = document.getElementById(idFor(scope, 'paid-license-panel'));
        if (panel) panel.hidden = type !== 'paid';
        var note = document.getElementById(idFor(scope, 'paid-license-note'));
        if (note) note.hidden = type !== 'paid' || standardMode(scope);
        var box = field(scope, 'check-license');
        if (box) box.disabled = type !== 'paid';
    }
    function setType(scope, type, fromUser) {
        var input = field(scope, 'app-type');
        var previous = input ? input.value : 'free';
        var next = type === 'paid' ? 'paid' : 'free';
        if (input) input.value = next;
        if (fromUser && next !== 'paid') {
            var box = field(scope, 'check-license');
            if (box) box.checked = false;
        }
        paintType(scope);
        if (fromUser && previous !== 'paid' && next === 'paid') openLicenseModal(scope);
        if (fromUser && window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
        if (scope === 'add' && typeof evaluateAddStages === 'function') evaluateAddStages();
        if (scope === 'edit' && typeof updateEditSaveButtonState === 'function') updateEditSaveButtonState();
    }
    function fill(scope, project) {
        var data = project || {};
        var input = field(scope, 'app-type');
        if (input) input.value = data.app_type === 'paid' ? 'paid' : 'free';
        ['test-login', 'test-password', 'test-credentials-note'].forEach(function (name) {
            var node = field(scope, name);
            var key = name.replace(/-/g, '_');
            if (node) node.value = data[key] || '';
        });
        var visible = field(scope, 'owner-comment-visible');
        if (visible) visible.checked = data.owner_comment_visible !== false;
        var box = field(scope, 'check-license');
        if (box) box.checked = data.app_type === 'paid';
        paintType(scope);
        foldCredentials(scope, !hasScopeCredentials(scope));
    }
    function hasScopeCredentials(scope) {
        return !!(clip(field(scope, 'test-login') && field(scope, 'test-login').value, 150)
            || clip(field(scope, 'test-password') && field(scope, 'test-password').value, 150)
            || clip(field(scope, 'test-credentials-note') && field(scope, 'test-credentials-note').value, 300));
    }
    function foldCredentials(scope, folded) {
        var body = document.getElementById(idFor(scope, 'credentials-body'));
        var toggle = document.getElementById(idFor(scope, 'credentials-toggle'));
        if (body) body.hidden = !!folded;
        if (toggle) toggle.setAttribute('aria-expanded', String(!folded));
    }
    function toggleCredentials(scope) {
        var body = document.getElementById(idFor(scope, 'credentials-body'));
        foldCredentials(scope, !(body && body.hidden));
    }
    function resetAdd() {
        fill('add', { app_type: 'free', owner_comment_visible: true });
        var box = document.getElementById('check-license');
        if (box) box.checked = false;
    }
    function licenseReady(scope) {
        if (appType(scope) !== 'paid') return true;
        var box = field(scope, 'check-license');
        return !!(box && box.checked);
    }
    function testById(appId) {
        return (Array.isArray(window.myTests) ? window.myTests : []).find(function (item) {
            return Number(item && (item.id || item.app_id) || 0) === Number(appId || 0);
        }) || null;
    }
    function hasCredentials(item) {
        return !!(item && (String(item.test_login || '').trim() || String(item.test_password || '').trim() || String(item.test_credentials_note || '').trim()));
    }
    function hasComment(item) {
        return !!(item && (String(item.instructions || '').trim() || hasCredentials(item)));
    }
    function shown(item) {
        return !!(item && item.owner_comment_visible !== false && hasComment(item));
    }
    function publicNote(item) {
        if (!item || item.owner_comment_visible === false) return '';
        return String(item.instructions || '').trim();
    }
    function chips(test) {
        if (!test || test.is_external) return [];
        var parts = [];
        if (String(test.app_type || '') === 'paid') {
            parts.push('<button type="button" class="meta-chip paid-app-chip" onclick="event.stopPropagation(); PaidAppSetup.openPaidGuide(' + Number(test.id) + ')">' + esc(t('paidAppChip')) + '</button>');
        }
        if (shown(test)) {
            var instructions = String(test.instructions || '').trim();
            var secrets = hasCredentials(test);
            var label = secrets
                ? (instructions ? t('credentialAndGuideChip') : t('credentialChip'))
                : t('instructionChip');
            var prefix = secrets ? ('<span class="meta-chip__key">' + keyIcon('meta-chip__key-icon') + '</span>') : '';
            parts.push('<button type="button" class="meta-chip paid-credential-chip' + (secrets ? ' has-key' : '') + '" onclick="event.stopPropagation(); PaidAppSetup.openCredentials(' + Number(test.id) + ')">' + prefix + esc(label) + '</button>');
        }
        return parts;
    }
    function row(label) {
        return '<div class="owner-note-secret"><div><span>' + esc(label) + '</span><strong></strong></div><button type="button" onclick="PaidAppSetup.copy(this)">' + esc(t('copyCredential')) + '</button></div>';
    }
    function fillRow(node, value) {
        var strong = node.querySelector('strong');
        if (strong) strong.textContent = value;
        node.dataset.copyValue = value;
    }
    function openPaidGuide(appId) {
        var modal = document.getElementById('paid-app-modal');
        var body = document.getElementById('paid-app-modal-body');
        var image = document.getElementById('paid-app-example');
        if (!modal || !body) return;
        body.innerHTML =
            '<div class="paid-guide-block">' +
                '<p class="paid-guide-block__lead">' + esc(t('paidAppGuideBodyLead')) + '</p>' +
                '<p class="paid-guide-block__card">' + esc(t('paidAppGuideBodyCard')) + '</p>' +
                '<p class="paid-guide-block__ok">' + esc(t('paidAppGuideBodyOk')) + '</p>' +
                '<p class="paid-guide-block__fail">' + esc(t('paidAppGuideBodyFail')) + '</p>' +
            '</div>';
        if (image) {
            image.src = 'images/Test%20card.png';
            image.alt = t('paidAppExampleAlt');
        }
        var report = document.getElementById('paid-app-report');
        if (report) {
            report.dataset.appId = String(appId || '');
            report.innerHTML = '<span class="paid-app-report__icon" aria-hidden="true">⚠️</span><span class="paid-app-report__copy"><strong>' + esc(t('paidSetupReportTitle')) + '</strong><small>' + esc(t('paidSetupReportHint')) + '</small></span>';
        }
        modal.classList.add('active');
    }
    function openCredentials(appId) {
        var test = testById(appId);
        var modal = document.getElementById('paid-credentials-modal');
        var title = document.getElementById('paid-credentials-title');
        var caption = document.getElementById('paid-credentials-caption');
        var instructions = document.getElementById('paid-credentials-instructions');
        var secrets = document.getElementById('paid-credentials-secrets');
        if (!test || !modal || !secrets || !shown(test)) return;
        var text = String(test.instructions || '').trim();
        var values = [
            [t('testLoginLabel'), test.test_login],
            [t('testPasswordLabel'), test.test_password],
            [t('testCredentialsNoteLabel'), test.test_credentials_note]
        ].filter(function (item) { return String(item[1] || '').trim(); });
        if (title) {
            title.textContent = values.length
                ? (text ? t('credentialsModalTitle') : t('credentialsOnlyTitle'))
                : t('ownerCommentTitle');
        }
        if (caption) caption.hidden = !(text && values.length);
        if (instructions) {
            instructions.hidden = !text;
            var paragraph = instructions.querySelector('.owner-note-copy__text');
            if (paragraph) paragraph.textContent = text;
        }
        secrets.hidden = !values.length;
        secrets.innerHTML = values.map(function (item) { return row(item[0]); }).join('');
        Array.from(secrets.children).forEach(function (node, index) { fillRow(node, values[index][1]); });
        modal.classList.add('active');
    }
    function close(id, event) {
        var modal = document.getElementById(id);
        if (!modal) return;
        if (event && event.target !== modal) return;
        modal.classList.remove('active');
    }
    function openLicenseModal(scope) {
        licenseScope = scope === 'edit' ? 'edit' : 'add';
        var modal = document.getElementById('mutual-license-modal');
        if (modal) modal.classList.add('is-open');
    }
    function closeLicenseModal() {
        var modal = document.getElementById('mutual-license-modal');
        if (modal) modal.classList.remove('is-open');
    }
    function confirmLicense() {
        var box = field(licenseScope, 'check-license');
        if (box) {
            box.checked = true;
            box.dispatchEvent(new Event('change'));
        }
        closeLicenseModal();
        if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
    }
    function cancelLicense(event) {
        if (event && event.target && event.target.id !== 'mutual-license-modal') return;
        closeLicenseModal();
        setType(licenseScope, 'free', false);
        var box = field(licenseScope, 'check-license');
        if (box) box.checked = false;
    }
    function openLicenseGuide() {
        var tg = window.Telegram && window.Telegram.WebApp;
        if (tg && typeof tg.openTelegramLink === 'function') tg.openTelegramLink(LICENSE_GUIDE_URL);
        else if (tg && typeof tg.openLink === 'function') tg.openLink(LICENSE_GUIDE_URL);
        else window.open(LICENSE_GUIDE_URL, '_blank');
    }
    function copyEmail(button) {
        var done = function () {
            if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (typeof showToast === 'function') showToast(t('credentialCopied'));
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(TESTER_GROUP_EMAIL).then(done).catch(done);
        else done();
        if (button) button.blur();
    }
    function reportPaid(appId) {
        close('paid-app-modal');
        if (typeof window.openIssueReportModal === 'function') window.openIssueReportModal(appId, 'paid_license_misconfigured');
    }
    function copyValue(button) {
        var value = button && button.parentElement && button.parentElement.dataset.copyValue || '';
        var done = function () {
            if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            if (typeof showToast === 'function') showToast(t('credentialCopied'));
        };
        if (value && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done).catch(done);
        else done();
    }
    document.addEventListener('click', function (event) {
        var typeButton = event.target.closest('[data-app-type-scope]');
        if (typeButton && !typeButton.getAttribute('onclick')) {
            setType(typeButton.dataset.appTypeScope, typeButton.dataset.appType, true);
        }
    });

    window.PaidAppSetup = {
        setType: setType,
        fill: fill,
        resetAdd: resetAdd,
        payload: payload,
        licenseReady: licenseReady,
        sync: paintType,
        shown: shown,
        hasComment: hasComment,
        hasCredentials: hasCredentials,
        publicNote: publicNote,
        keyIcon: keyIcon,
        keyMarkHtml: keyMarkHtml,
        chips: chips,
        toggleCredentials: toggleCredentials,
        openLicenseGuide: openLicenseGuide,
        confirmLicense: confirmLicense,
        cancelLicense: cancelLicense,
        copyEmail: copyEmail,
        openPaidGuide: openPaidGuide,
        openCredentials: openCredentials,
        report: reportPaid,
        copy: copyValue,
        close: close
    };
})();
