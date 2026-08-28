/* Phase 3 — tester-facing screenshot proof upload with retry-safe idempotency. */

var _checkinProofUploadState = {
    appId: null,
    progressId: null,
    file: null,
    previewUrl: '',
    idempotencyKey: '',
    controller: null,
    inFlight: false,
    completed: false,
};

function isScreenshotProofUploadEnabled() {
    return !!(window.App && window.App.screenshotProofUploadEnabled === true);
}

function _checkinProofTest(appId) {
    if (typeof window.getMyTestById === 'function') {
        return window.getMyTestById(appId);
    }
    if (typeof myTests !== 'undefined' && Array.isArray(myTests)) {
        return myTests.find(function(item) { return Number(item.id) === Number(appId); }) || null;
    }
    return null;
}

function _checkinProofSessionKey(progressId) {
    var localDate = typeof getLocalDate === 'function'
        ? getLocalDate()
        : new Date().toISOString().slice(0, 10);
    return 'checkinProofUpload:v1:' + String(Number(progressId) || 0) + ':' + localDate;
}

function _newCheckinProofUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }
    var bytes = new Uint8Array(16);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(bytes);
    } else {
        for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.from(bytes).map(function(value) { return value.toString(16).padStart(2, '0'); }).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function _loadOrCreateCheckinProofKey(progressId) {
    var storageKey = _checkinProofSessionKey(progressId);
    try {
        var existing = String(sessionStorage.getItem(storageKey) || '').trim().toLowerCase();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(existing)) {
            return existing;
        }
    } catch (error) {}
    var created = _newCheckinProofUuid();
    try { sessionStorage.setItem(storageKey, created); } catch (error) {}
    return created;
}

function _clearCheckinProofKey(progressId) {
    try { sessionStorage.removeItem(_checkinProofSessionKey(progressId)); } catch (error) {}
}

function _setCheckinProofStatus(message, kind) {
    var element = document.getElementById('checkin-proof-upload-status');
    if (!element) return;
    element.textContent = String(message || '');
    element.classList.toggle('is-error', kind === 'error');
    element.classList.toggle('is-success', kind === 'success');
}

function _syncCheckinProofControls() {
    var submit = document.getElementById('checkin-proof-submit');
    var picker = document.getElementById('checkin-proof-picker');
    var replace = document.getElementById('t-checkinProofReplace');
    var cancel = document.getElementById('t-checkinProofCancel');
    if (submit) {
        submit.disabled = !_checkinProofUploadState.file || _checkinProofUploadState.inFlight || _checkinProofUploadState.completed;
        submit.style.display = _checkinProofUploadState.completed ? 'none' : '';
    }
    if (picker) picker.disabled = _checkinProofUploadState.inFlight || _checkinProofUploadState.completed;
    if (replace) replace.disabled = _checkinProofUploadState.inFlight || _checkinProofUploadState.completed;
    if (cancel) {
        cancel.disabled = false;
        cancel.textContent = window.t('checkinProofCancel', {}, lang);
    }
    var label = document.getElementById('t-checkinProofSubmit');
    if (label) {
        label.textContent = window.t(
            _checkinProofUploadState.inFlight ? 'checkinProofUploading' : 'checkinProofSubmit',
            {},
            lang
        );
    }
}

function _revokeCheckinProofPreview() {
    if (_checkinProofUploadState.previewUrl) {
        try { URL.revokeObjectURL(_checkinProofUploadState.previewUrl); } catch (error) {}
        _checkinProofUploadState.previewUrl = '';
    }
}

function openCheckinProofUploadModal(appId) {
    var test = _checkinProofTest(appId);
    var progressId = Number(test && test.progress_id || 0);
    if (!test || progressId <= 0) {
        if (typeof handleApiError === 'function') handleApiError('progress_not_found');
        return false;
    }

    _revokeCheckinProofPreview();
    _checkinProofUploadState.appId = Number(appId);
    _checkinProofUploadState.progressId = progressId;
    _checkinProofUploadState.file = null;
    _checkinProofUploadState.idempotencyKey = _loadOrCreateCheckinProofKey(progressId);
    _checkinProofUploadState.controller = null;
    _checkinProofUploadState.inFlight = false;
    _checkinProofUploadState.completed = false;

    var fileInput = document.getElementById('checkin-proof-file-input');
    if (fileInput) fileInput.value = '';
    var previewWrap = document.getElementById('checkin-proof-preview-wrap');
    var picker = document.getElementById('checkin-proof-picker');
    if (previewWrap) previewWrap.hidden = true;
    if (picker) picker.hidden = false;

    document.getElementById('t-checkinProofUploadTitle').textContent = window.t('checkinProofUploadTitle', {}, lang);
    document.getElementById('t-checkinProofUploadHint').textContent = window.t('checkinProofUploadHint', {}, lang);
    _setCheckinProofStatus('', '');
    _syncCheckinProofControls();
    var modal = document.getElementById('checkin-proof-upload-modal');
    if (modal) modal.classList.add('active');
    if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
    return true;
}

function closeCheckinProofUploadModal(event) {
    var modal = document.getElementById('checkin-proof-upload-modal');
    if (!modal) return;
    if (event && event.target !== modal) return;
    if (_checkinProofUploadState.controller) {
        try { _checkinProofUploadState.controller.abort(); } catch (error) {}
    }
    _checkinProofUploadState.controller = null;
    _checkinProofUploadState.inFlight = false;
    _revokeCheckinProofPreview();
    _checkinProofUploadState.file = null;
    modal.classList.remove('active');
    if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
}

function chooseCheckinProofFile() {
    if (_checkinProofUploadState.inFlight || _checkinProofUploadState.completed) return;
    var input = document.getElementById('checkin-proof-file-input');
    if (input) input.click();
}

function handleCheckinProofFileSelected(event) {
    if (_checkinProofUploadState.inFlight || _checkinProofUploadState.completed) return;
    var file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    var allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (Number(file.size || 0) <= 0 || allowedTypes.indexOf(String(file.type || '').toLowerCase()) === -1) {
        _setCheckinProofStatus(window.t('invalid_image_type', {}, lang), 'error');
        if (event.target) event.target.value = '';
        return;
    }
    if (Number(file.size || 0) > 5 * 1024 * 1024) {
        _setCheckinProofStatus(window.t('file_too_large', {}, lang), 'error');
        if (event.target) event.target.value = '';
        return;
    }

    _revokeCheckinProofPreview();
    _checkinProofUploadState.file = file;
    _checkinProofUploadState.previewUrl = URL.createObjectURL(file);
    var preview = document.getElementById('checkin-proof-preview');
    var previewWrap = document.getElementById('checkin-proof-preview-wrap');
    var picker = document.getElementById('checkin-proof-picker');
    if (preview) preview.src = _checkinProofUploadState.previewUrl;
    if (previewWrap) previewWrap.hidden = false;
    if (picker) picker.hidden = true;
    _setCheckinProofStatus(window.t('checkinProofReady', {}, lang), '');
    _syncCheckinProofControls();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function _checkinProofErrorMessage(result) {
    var code = result && (result.code || result.detail);
    if (code === 'checkin_already_proved') {
        return window.t('checkinProofAlreadyReceived', {}, lang);
    }
    if (code === 'proof_attach_incomplete') {
        return window.t('checkinProofAttachIncomplete', {}, lang);
    }
    if (typeof window.resolveApiMessage === 'function') {
        return window.resolveApiMessage(result || {}, 'checkinProofUploadFailed', lang);
    }
    return window.t('checkinProofUploadFailed', {}, lang);
}

function _applyScreenshotCheckinResult(appId, result) {
    var checkin = result && result.checkin ? result.checkin : {};
    var test = _checkinProofTest(appId);
    var wasFirstCheckin = Number(test && test.checkins_count || 0) <= 0
        || String(test && test.status || '') === 'new';
    if (test) {
        test.status = 'done';
        test.last_check_date = checkin.last_check_date || (typeof getLocalDate === 'function' ? getLocalDate() : '');
        test.checkins_count = Math.max(0, Number(checkin.checkins_count || test.checkins_count || 0));
        test.skips_count = Math.max(0, Number(checkin.skips_count || 0));
        test.daily_timeline = checkin.daily_timeline || test.daily_timeline || '';
        if (Number(checkin.testing_day || 0) > 0) test.testing_days = Number(checkin.testing_day);
        if (typeof window.recomputeLocalTestState === 'function') {
            try { window.recomputeLocalTestState(test); } catch (error) {}
        }
    }
    if (wasFirstCheckin && !checkin.already_checked_today && typeof markDefaultGroupJoined === 'function') {
        markDefaultGroupJoined({ silent: true, rerender: false });
    }
    if (!checkin.already_checked_today && typeof showCheckinRewardToasts === 'function') {
        showCheckinRewardToasts(checkin);
    }
    if (typeof setFirstDayScreenshotVisible === 'function') setFirstDayScreenshotVisible(appId, false);
    if (typeof setTimerReadyForConfirm === 'function') setTimerReadyForConfirm(appId, false, false, '');
    if (typeof clearActiveTimerForApp === 'function') clearActiveTimerForApp(appId);

    var card = document.getElementById('test-card-' + appId);
    var renderAfter = function() {
        if (typeof setTestsCache === 'function' && typeof myTests !== 'undefined') {
            setTestsCache({ tests: myTests, incoming_offers: incomingOffers, ts: Date.now() });
        }
        if (typeof renderTests === 'function') renderTests(true);
        if (typeof refreshOpenModals === 'function') refreshOpenModals();
    };
    if (card && typeof animateTestCardOut === 'function') {
        animateTestCardOut(card).then(renderAfter);
    } else {
        renderAfter();
    }
    setTimeout(function() {
        if (typeof loadTasks === 'function') loadTasks(true).catch(function() {});
        if (typeof loadProjects === 'function') loadProjects(true).catch(function() {});
    }, 250);
}

async function submitCheckinProofScreenshot() {
    if (_checkinProofUploadState.inFlight || _checkinProofUploadState.completed || !_checkinProofUploadState.file) return;
    var appId = Number(_checkinProofUploadState.appId || 0);
    var progressId = Number(_checkinProofUploadState.progressId || 0);
    if (appId <= 0 || progressId <= 0) return;

    _checkinProofUploadState.inFlight = true;
    _checkinProofUploadState.controller = new AbortController();
    _setCheckinProofStatus(window.t('checkinProofUploadingHint', {}, lang), '');
    _syncCheckinProofControls();

    try {
        var openToken = typeof _getCheckinOpenToken === 'function' ? _getCheckinOpenToken(appId) : '';
        if (!openToken && typeof _requestCheckinOpenToken === 'function') {
            try {
                var tokenPayload = await _requestCheckinOpenToken(appId);
                if (tokenPayload && tokenPayload.token) openToken = String(tokenPayload.token);
            } catch (error) {}
        }

        var form = new FormData();
        form.append('init_data', typeof getTelegramInitDataRaw === 'function'
            ? getTelegramInitDataRaw()
            : String((tg && tg.initData) || ''));
        form.append('open_token', String(openToken || ''));
        form.append('idempotency_key', _checkinProofUploadState.idempotencyKey);
        form.append('file', _checkinProofUploadState.file, _checkinProofUploadState.file.name || 'checkin-proof');

        var response = await fetch(API_BASE + '/testing/' + progressId + '/checkin-proof/screenshot', {
            method: 'POST',
            body: form,
            signal: _checkinProofUploadState.controller.signal,
        });
        var result = null;
        try { result = await response.json(); } catch (error) {}
        if (!response.ok || !result || result.status !== 'success' || !result.proof || result.proof.state !== 'attached') {
            var code = result && result.code;
            if (code === 'checkin_already_proved') {
                _checkinProofUploadState.completed = true;
                _clearCheckinProofKey(progressId);
                closeCheckinProofUploadModal();
                if (typeof showToast === 'function') {
                    showToast(window.t('checkinProofAlreadyReceived', {}, lang));
                }
                setTimeout(function() {
                    if (typeof loadTasks === 'function') loadTasks(true).catch(function() {});
                }, 150);
                return;
            }
            if (code === 'proof_source_conflict' || code === 'invalid_idempotency_key') {
                _clearCheckinProofKey(progressId);
                _checkinProofUploadState.idempotencyKey = _loadOrCreateCheckinProofKey(progressId);
            }
            throw { isApiError: true, payload: result || { code: 'checkinProofUploadFailed' } };
        }

        _checkinProofUploadState.completed = true;
        _clearCheckinProofKey(progressId);
        closeCheckinProofUploadModal();
        _applyScreenshotCheckinResult(appId, result);
        if (typeof showToast === 'function') {
            showToast(window.t('checkinProofSuccess', {}, lang));
        }
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (error) {
        if (error && error.name === 'AbortError') return;
        var payload = error && error.isApiError ? error.payload : { code: 'network_error' };
        _setCheckinProofStatus(_checkinProofErrorMessage(payload), 'error');
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    } finally {
        _checkinProofUploadState.controller = null;
        _checkinProofUploadState.inFlight = false;
        _syncCheckinProofControls();
    }
}

window.isScreenshotProofUploadEnabled = isScreenshotProofUploadEnabled;
window.openCheckinProofUploadModal = openCheckinProofUploadModal;
window.closeCheckinProofUploadModal = closeCheckinProofUploadModal;
window.chooseCheckinProofFile = chooseCheckinProofFile;
window.handleCheckinProofFileSelected = handleCheckinProofFileSelected;
window.submitCheckinProofScreenshot = submitCheckinProofScreenshot;
