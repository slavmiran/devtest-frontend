/* Paid closed-test apps and account credentials. Reuses the access-issue freeze. */
(function () {
    'use strict';

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
            test_credentials_note: clip(field(scope, 'test-credentials-note') && field(scope, 'test-credentials-note').value, 300)
        };
    }
    function paintType(scope) {
        var type = appType(scope);
        document.querySelectorAll('[data-app-type-scope="' + scope + '"]').forEach(function (button) {
            button.setAttribute('aria-pressed', String(button.dataset.appType === type));
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
        if (input) input.value = type === 'paid' ? 'paid' : 'free';
        paintType(scope);
        var guide = document.getElementById(idFor(scope, 'paid-license-guide'));
        if (fromUser && previous !== 'paid' && type === 'paid' && guide) guide.open = true;
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
        var box = field(scope, 'check-license');
        if (box) box.checked = data.app_type === 'paid';
        paintType(scope);
        var guide = document.getElementById(idFor(scope, 'paid-license-guide'));
        if (guide) guide.open = data.app_type === 'paid';
    }
    function resetAdd() {
        fill('add', { app_type: 'free' });
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
    function chips(test) {
        if (!test || test.is_external) return [];
        var parts = [];
        if (String(test.app_type || '') === 'paid') {
            parts.push('<button type="button" class="meta-chip paid-app-chip" onclick="event.stopPropagation(); PaidAppSetup.openPaidGuide(' + Number(test.id) + ')">' + esc(t('paidAppChip')) + '</button>');
        }
        var instructions = String(test.instructions || '').trim();
        var hasCredentials = !!(String(test.test_login || '').trim() || String(test.test_password || '').trim() || String(test.test_credentials_note || '').trim());
        if (instructions || hasCredentials) {
            var key = hasCredentials ? (instructions ? 'credentialAndGuideChip' : 'credentialChip') : 'instructionChip';
            parts.push('<button type="button" class="meta-chip paid-credential-chip" onclick="event.stopPropagation(); PaidAppSetup.openCredentials(' + Number(test.id) + ')">' + esc(t(key)) + '</button>');
        }
        return parts;
    }
    function row(label, value) {
        if (!String(value || '').trim()) return '';
        return '<div class="paid-secret-row"><div><span>' + esc(label) + '</span><strong></strong></div><button type="button" onclick="PaidAppSetup.copy(this)">' + esc(t('copyCredential')) + '</button></div>';
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
        body.textContent = t('paidAppGuideBody');
        if (image) {
            image.src = 'images/Test%20card.png';
            image.alt = t('paidAppExampleAlt');
        }
        var report = document.getElementById('paid-app-report');
        if (report) report.dataset.appId = String(appId || '');
        modal.classList.add('active');
    }
    function openCredentials(appId) {
        var test = testById(appId);
        var modal = document.getElementById('paid-credentials-modal');
        var instructions = document.getElementById('paid-credentials-instructions');
        var secrets = document.getElementById('paid-credentials-secrets');
        if (!test || !modal || !secrets) return;
        var text = String(test.instructions || '').trim();
        if (instructions) {
            instructions.hidden = !text;
            instructions.querySelector('p').textContent = text;
        }
        var values = [
            [t('testLoginLabel'), test.test_login],
            [t('testPasswordLabel'), test.test_password],
            [t('testCredentialsNoteLabel'), test.test_credentials_note]
        ].filter(function (item) { return String(item[1] || '').trim(); });
        secrets.hidden = !values.length;
        secrets.innerHTML = values.map(function (item) { return row(item[0], item[1]); }).join('');
        Array.from(secrets.children).forEach(function (node, index) { fillRow(node, values[index][1]); });
        modal.classList.add('active');
    }
    function close(id, event) {
        var modal = document.getElementById(id);
        if (!modal) return;
        if (event && event.target !== modal) return;
        modal.classList.remove('active');
    }
    function reportPaid(appId) {
        close('paid-app-modal');
        if (typeof window.openIssueReportModal === 'function') window.openIssueReportModal(appId, 'paid_license_misconfigured');
    }
    document.addEventListener('click', function (event) {
        var typeButton = event.target.closest('[data-app-type-scope]');
        if (typeButton) {
            setType(typeButton.dataset.appTypeScope, typeButton.dataset.appType, true);
            return;
        }
        var copy = event.target.closest('[data-paid-copy]');
        if (copy) {
            var value = copy.parentElement && copy.parentElement.dataset.copyValue || '';
            var done = function () {
                if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                if (typeof showToast === 'function') showToast(t('credentialCopied'));
            };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done).catch(done);
            else done();
            return;
        }
        var report = event.target.closest('#paid-app-report');
        if (report && !report.onclick) reportPaid(Number(report.dataset.appId || 0));
    });

    window.PaidAppSetup = {
        setType: setType,
        fill: fill,
        resetAdd: resetAdd,
        payload: payload,
        licenseReady: licenseReady,
        sync: paintType,
        chips: chips,
        openPaidGuide: openPaidGuide,
        openCredentials: openCredentials,
        report: reportPaid,
        copy: function (button) {
            var value = button && button.parentElement && button.parentElement.dataset.copyValue || '';
            var done = function () {
                if (window.tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                if (typeof showToast === 'function') showToast(t('credentialCopied'));
            };
            if (value && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done).catch(done);
            else done();
        },
        close: close
    };
})();
