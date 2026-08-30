/* Screenshot proof upload: 1..5 images, retry-safe identity, non-blocking queue. */

var CHECKIN_PROOF_MAX_FILES = 5;
var CHECKIN_PROOF_UPLOAD_CONCURRENCY = 2;
var _checkinProofUploadState = { appId: null, progressId: null, files: [], previewUrls: [], idempotencyKey: '' };
var _checkinProofPendingAppIds = {};
var _checkinProofUploadQueue = [];
var _checkinProofActiveJobs = 0;

function isScreenshotProofUploadEnabled() {
    return !!(window.App && window.App.screenshotProofUploadEnabled === true);
}

function isInternalScreenshotProofUploadEnabled(test) {
    if (test && (test.is_external === true || test.is_guest === true || String(test.flow || '') === 'external')) return false;
    return isScreenshotProofUploadEnabled();
}

function tInternalCheckinCopy(legacyKey, proofKey, params, language) {
    return window.t(isScreenshotProofUploadEnabled() ? proofKey : legacyKey, params || {}, language || lang);
}

function _checkinProofTest(appId) {
    if (typeof window.getMyTestById === 'function') return window.getMyTestById(appId);
    if (typeof myTests !== 'undefined' && Array.isArray(myTests)) {
        return myTests.find(function(item) { return Number(item.id) === Number(appId); }) || null;
    }
    return null;
}

function _checkinProofSessionKey(progressId) {
    var localDate = typeof getLocalDate === 'function' ? getLocalDate() : new Date().toISOString().slice(0, 10);
    return 'checkinProofUpload:v1:' + String(Number(progressId) || 0) + ':' + localDate;
}

function _newCheckinProofUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    if (window.crypto && typeof window.crypto.getRandomValues === 'function') window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = Array.from(bytes).map(function(value) { return value.toString(16).padStart(2, '0'); }).join('');
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join('-');
}

function _loadOrCreateCheckinProofKey(progressId) {
    var storageKey = _checkinProofSessionKey(progressId);
    try {
        var existing = String(sessionStorage.getItem(storageKey) || '').trim().toLowerCase();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(existing)) return existing;
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

function _revokeCheckinProofPreviews() {
    (_checkinProofUploadState.previewUrls || []).forEach(function(url) {
        try { URL.revokeObjectURL(url); } catch (error) {}
    });
    _checkinProofUploadState.previewUrls = [];
}

function _renderCheckinProofPreviews() {
    var grid = document.getElementById('checkin-proof-preview-grid');
    var wrap = document.getElementById('checkin-proof-preview-wrap');
    var picker = document.getElementById('checkin-proof-picker');
    if (!grid || !wrap) return;
    grid.innerHTML = '';
    _checkinProofUploadState.previewUrls.forEach(function(url, index) {
        var item = document.createElement('div');
        item.className = 'checkin-proof-preview-item';
        var image = document.createElement('img');
        image.src = url;
        image.alt = window.t('checkinProofPreviewAlt', {}, lang);
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'checkin-proof-preview-remove';
        remove.setAttribute('aria-label', window.t('checkinProofRemove', {}, lang));
        remove.textContent = '×';
        remove.onclick = function() { removeCheckinProofFile(index); };
        item.appendChild(image);
        item.appendChild(remove);
        grid.appendChild(item);
    });
    if (_checkinProofUploadState.files.length < CHECKIN_PROOF_MAX_FILES) {
        var add = document.createElement('button');
        add.type = 'button';
        add.className = 'checkin-proof-preview-add';
        add.onclick = chooseCheckinProofFile;
        var plus = document.createElement('span');
        plus.textContent = '+';
        var label = document.createElement('small');
        label.textContent = window.t('checkinProofAdd', {}, lang);
        add.appendChild(plus);
        add.appendChild(label);
        grid.appendChild(add);
    }
    wrap.hidden = _checkinProofUploadState.files.length === 0;
    if (picker) picker.hidden = _checkinProofUploadState.files.length > 0;
}

function _syncCheckinProofControls() {
    var submit = document.getElementById('checkin-proof-submit');
    if (submit) submit.disabled = _checkinProofUploadState.files.length < 1;
    var label = document.getElementById('t-checkinProofSubmit');
    if (label) label.textContent = window.t('checkinProofSubmit', {}, lang);
}

function _resetCheckinProofSelection() {
    _revokeCheckinProofPreviews();
    _checkinProofUploadState.files = [];
    var input = document.getElementById('checkin-proof-file-input');
    if (input) input.value = '';
    _renderCheckinProofPreviews();
    _syncCheckinProofControls();
}

function openCheckinProofUploadModal(appId) {
    var safeAppId = Number(appId || 0);
    if (isScreenshotProofUploadPending(safeAppId)) return false;
    var test = _checkinProofTest(safeAppId);
    var progressId = Number(test && test.progress_id || 0);
    if (!test || progressId <= 0) {
        if (typeof handleApiError === 'function') handleApiError('progress_not_found');
        return false;
    }
    _resetCheckinProofSelection();
    _checkinProofUploadState.appId = safeAppId;
    _checkinProofUploadState.progressId = progressId;
    _checkinProofUploadState.idempotencyKey = _loadOrCreateCheckinProofKey(progressId);
    document.getElementById('t-checkinProofUploadTitle').textContent = window.t('checkinProofUploadTitle', {}, lang);
    document.getElementById('t-checkinProofUploadHint').textContent = window.t('checkinProofUploadHint', {}, lang);
    document.getElementById('t-checkinProofVisibilityNote').textContent = window.t('checkinProofVisibilityNote', {}, lang);
    _setCheckinProofStatus('', '');
    var modal = document.getElementById('checkin-proof-upload-modal');
    if (modal) modal.classList.add('active');
    if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
    return true;
}

function closeCheckinProofUploadModal(event) {
    var modal = document.getElementById('checkin-proof-upload-modal');
    if (!modal || (event && event.target !== modal)) return;
    _resetCheckinProofSelection();
    modal.classList.remove('active');
    if (typeof window.syncTelegramBackButton === 'function') window.syncTelegramBackButton();
}

function _setCheckinProofBackgroundCard(appId, isPending) {
    var safeAppId = Number(appId || 0);
    if (safeAppId <= 0) return;
    if (isPending) _checkinProofPendingAppIds[safeAppId] = true;
    else delete _checkinProofPendingAppIds[safeAppId];
    if (typeof renderTests === 'function') renderTests(true);
}

function isScreenshotProofUploadPending(appId) {
    return !!_checkinProofPendingAppIds[Number(appId || 0)];
}

function chooseCheckinProofFile() {
    var input = document.getElementById('checkin-proof-file-input');
    if (input) input.click();
}

function handleCheckinProofFileSelected(event) {
    var selected = Array.from(event && event.target && event.target.files || []);
    if (!selected.length) return;
    if (_checkinProofUploadState.files.length + selected.length > CHECKIN_PROOF_MAX_FILES) {
        var warning = window.t('checkinProofTooMany', { max: CHECKIN_PROOF_MAX_FILES }, lang);
        _setCheckinProofStatus(warning, 'error');
        if (typeof showToast === 'function') showToast(warning);
        if (event.target) event.target.value = '';
        return;
    }
    var allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    for (var i = 0; i < selected.length; i += 1) {
        if (Number(selected[i].size || 0) <= 0 || allowedTypes.indexOf(String(selected[i].type || '').toLowerCase()) === -1) {
            _setCheckinProofStatus(window.t('invalid_image_type', {}, lang), 'error');
            if (event.target) event.target.value = '';
            return;
        }
        if (Number(selected[i].size || 0) > 5 * 1024 * 1024) {
            _setCheckinProofStatus(window.t('file_too_large', {}, lang), 'error');
            if (event.target) event.target.value = '';
            return;
        }
    }
    selected.forEach(function(file) {
        _checkinProofUploadState.files.push(file);
        _checkinProofUploadState.previewUrls.push(URL.createObjectURL(file));
    });
    if (event.target) event.target.value = '';
    _renderCheckinProofPreviews();
    _setCheckinProofStatus(window.t('checkinProofReady', { count: _checkinProofUploadState.files.length }, lang), '');
    _syncCheckinProofControls();
    if (tg && tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function removeCheckinProofFile(index) {
    var safeIndex = Number(index);
    if (!Number.isInteger(safeIndex) || safeIndex < 0 || safeIndex >= _checkinProofUploadState.files.length) return;
    var url = _checkinProofUploadState.previewUrls[safeIndex];
    try { if (url) URL.revokeObjectURL(url); } catch (error) {}
    _checkinProofUploadState.files.splice(safeIndex, 1);
    _checkinProofUploadState.previewUrls.splice(safeIndex, 1);
    _renderCheckinProofPreviews();
    _setCheckinProofStatus(_checkinProofUploadState.files.length
        ? window.t('checkinProofReady', { count: _checkinProofUploadState.files.length }, lang)
        : '', '');
    _syncCheckinProofControls();
}

function _checkinProofErrorMessage(result) {
    var code = result && (result.code || result.detail);
    if (code === 'checkin_already_proved') return window.t('checkinProofAlreadyReceived', {}, lang);
    if (code === 'proof_attach_incomplete') return window.t('checkinProofAttachIncomplete', {}, lang);
    if (typeof window.resolveApiMessage === 'function') return window.resolveApiMessage(result || {}, 'checkinProofUploadFailed', lang);
    return window.t('checkinProofUploadFailed', {}, lang);
}

function _applyScreenshotCheckinResult(appId, result) {
    var checkin = result && result.checkin ? result.checkin : {};
    var test = _checkinProofTest(appId);
    var wasFirstCheckin = Number(test && test.checkins_count || 0) <= 0 || String(test && test.status || '') === 'new';
    if (test) {
        delete _checkinProofPendingAppIds[Number(appId || 0)];
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
    if (!checkin.already_checked_today && typeof showCheckinRewardToasts === 'function') showCheckinRewardToasts(checkin);
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
    if (card && typeof animateTestCardOut === 'function') animateTestCardOut(card).then(renderAfter);
    else renderAfter();
    setTimeout(function() {
        if (typeof loadTasks === 'function') loadTasks(true).catch(function() {});
        if (typeof loadProjects === 'function') loadProjects(true).catch(function() {});
    }, 250);
}

async function _runCheckinProofUploadJob(job) {
    try {
        var openToken = typeof _getCheckinOpenToken === 'function' ? _getCheckinOpenToken(job.appId) : '';
        if (!openToken && typeof _requestCheckinOpenToken === 'function') {
            try {
                var tokenPayload = await _requestCheckinOpenToken(job.appId);
                if (tokenPayload && tokenPayload.token) openToken = String(tokenPayload.token);
            } catch (error) {}
        }
        var form = new FormData();
        form.append('init_data', typeof getTelegramInitDataRaw === 'function' ? getTelegramInitDataRaw() : String((tg && tg.initData) || ''));
        form.append('open_token', String(openToken || ''));
        form.append('idempotency_key', job.idempotencyKey);
        job.files.forEach(function(file, index) {
            form.append('files', file, file.name || ('checkin-proof-' + (index + 1)));
        });
        var response = await fetch(API_BASE + '/testing/' + job.progressId + '/checkin-proof/screenshot', { method: 'POST', body: form });
        var result = null;
        try { result = await response.json(); } catch (error) {}
        if (!response.ok || !result || result.status !== 'success' || !result.proof || result.proof.state !== 'attached') {
            var code = result && result.code;
            if (code === 'checkin_already_proved') {
                _clearCheckinProofKey(job.progressId);
                _setCheckinProofBackgroundCard(job.appId, false);
                if (typeof showToast === 'function') showToast(window.t('checkinProofAlreadyReceived', {}, lang));
                setTimeout(function() { if (typeof loadTasks === 'function') loadTasks(true).catch(function() {}); }, 150);
                return;
            }
            if (code === 'proof_source_conflict' || code === 'invalid_idempotency_key') _clearCheckinProofKey(job.progressId);
            throw { isApiError: true, payload: result || { code: 'checkinProofUploadFailed' } };
        }
        _clearCheckinProofKey(job.progressId);
        _applyScreenshotCheckinResult(job.appId, result);
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (error) {
        var payload = error && error.isApiError ? error.payload : { code: 'network_error' };
        _setCheckinProofBackgroundCard(job.appId, false);
        if (typeof showToast === 'function') {
            showToast(_checkinProofErrorMessage(payload) + '\n' + window.t('checkinProofBackgroundRetry', {}, lang), 5000);
        }
        setTimeout(function() { if (typeof loadTasks === 'function') loadTasks(true).catch(function() {}); }, 300);
        if (tg && tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
    }
}

function _drainCheckinProofUploadQueue() {
    while (_checkinProofActiveJobs < CHECKIN_PROOF_UPLOAD_CONCURRENCY && _checkinProofUploadQueue.length) {
        var job = _checkinProofUploadQueue.shift();
        _checkinProofActiveJobs += 1;
        _runCheckinProofUploadJob(job).finally(function() {
            _checkinProofActiveJobs = Math.max(0, _checkinProofActiveJobs - 1);
            _drainCheckinProofUploadQueue();
        });
    }
}

function submitCheckinProofScreenshot() {
    if (!_checkinProofUploadState.files.length) return;
    var appId = Number(_checkinProofUploadState.appId || 0);
    var progressId = Number(_checkinProofUploadState.progressId || 0);
    if (appId <= 0 || progressId <= 0 || isScreenshotProofUploadPending(appId)) return;
    _setCheckinProofBackgroundCard(appId, true);
    _checkinProofUploadQueue.push({
        appId: appId,
        progressId: progressId,
        files: _checkinProofUploadState.files.slice(0, CHECKIN_PROOF_MAX_FILES),
        idempotencyKey: _checkinProofUploadState.idempotencyKey,
    });
    closeCheckinProofUploadModal();
    _drainCheckinProofUploadQueue();
}

window.isScreenshotProofUploadEnabled = isScreenshotProofUploadEnabled;
window.isInternalScreenshotProofUploadEnabled = isInternalScreenshotProofUploadEnabled;
window.tInternalCheckinCopy = tInternalCheckinCopy;
window.openCheckinProofUploadModal = openCheckinProofUploadModal;
window.closeCheckinProofUploadModal = closeCheckinProofUploadModal;
window.chooseCheckinProofFile = chooseCheckinProofFile;
window.handleCheckinProofFileSelected = handleCheckinProofFileSelected;
window.removeCheckinProofFile = removeCheckinProofFile;
window.submitCheckinProofScreenshot = submitCheckinProofScreenshot;
window.isScreenshotProofUploadPending = isScreenshotProofUploadPending;
