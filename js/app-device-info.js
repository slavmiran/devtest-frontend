/* Device info detection and settings for bug reports. */

var _browserDeviceInfoCache = null;
var _deviceInfoSaveTimer = null;
var _deviceInfoToggleInFlight = false;

function invalidateBrowserDeviceInfoCache() {
    _browserDeviceInfoCache = null;
}

function polishDeviceModel(modelLabel) {
    var model = String(modelLabel || '').trim();
    if (!model) return '';
    if (/^SM-[A-Z0-9]+$/i.test(model)) return 'Samsung (' + model + ')';
    if (/^Pixel\b/i.test(model)) return model;
    return model;
}

function parseDeviceInfoFromBrowser() {
    if (_browserDeviceInfoCache) {
        return _browserDeviceInfoCache;
    }

    var ua = String(navigator.userAgent || '');
    var tgPlatform = (window.tg && tg.platform) ? String(tg.platform).toLowerCase() : '';
    var screenW = Math.max(0, Number(window.screen && window.screen.width) || 0);
    var screenH = Math.max(0, Number(window.screen && window.screen.height) || 0);
    var resolution = screenW && screenH ? (screenW + ' x ' + screenH) : '';

    var osLabel = '';
    var modelLabel = '';
    var androidMatch = ua.match(/Android\s+([\d.]+)/i);
    if (androidMatch) {
        osLabel = 'Android ' + String(androidMatch[1] || '').replace(/\.0$/, '');
        var buildMatch = ua.match(/;\s*([^;()]+?)\s+Build\//i);
        if (buildMatch) {
            modelLabel = String(buildMatch[1] || '').trim();
        }
    } else {
        var iosMatch = ua.match(/(?:iPhone|iPad|iPod).*?OS\s+([\d_]+)/i);
        if (iosMatch) {
            osLabel = 'iOS ' + String(iosMatch[1] || '').replace(/_/g, '.');
            modelLabel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
        } else if (tgPlatform === 'android') {
            osLabel = 'Android';
        } else if (tgPlatform === 'ios') {
            osLabel = 'iOS';
            modelLabel = 'iPhone';
        } else if (tgPlatform) {
            osLabel = tgPlatform.charAt(0).toUpperCase() + tgPlatform.slice(1);
        }
    }

    modelLabel = polishDeviceModel(modelLabel);
    var parts = [];
    if (osLabel) parts.push(osLabel);
    if (modelLabel) parts.push(modelLabel);
    if (resolution) parts.push(resolution);

    _browserDeviceInfoCache = {
        line: parts.join(' • '),
        os: osLabel,
        model: modelLabel,
        resolution: resolution,
    };
    return _browserDeviceInfoCache;
}

function syncDeviceInfoUi() {
    var toggle = document.getElementById('attach-device-info-toggle');
    var input = document.getElementById('device-info-input');
    var refreshBtn = document.getElementById('device-info-refresh-btn');
    if (toggle) {
        toggle.checked = !!_attachDeviceInfoToBugs;
        toggle.disabled = !!_deviceInfoToggleInFlight;
    }
    if (input) {
        input.value = String(_deviceInfo || '');
        input.disabled = !_attachDeviceInfoToBugs;
    }
    if (refreshBtn) {
        refreshBtn.disabled = !_attachDeviceInfoToBugs || !!_deviceInfoToggleInFlight;
    }
}

async function saveDeviceInfoSettings(patch) {
    patch = patch || {};
    try {
        var response = await fetch(API_BASE + '/users/me/device-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({
                init_data: (tg && tg.initData) ? tg.initData : '',
            }, patch)),
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return false;
        }
        _attachDeviceInfoToBugs = !!result.attach_device_info_to_bugs;
        _deviceInfo = String(result.device_info || '');
        _deviceInfoIsManual = !!result.device_info_is_manual;
        window.App.attachDeviceInfoToBugs = _attachDeviceInfoToBugs;
        window.App.deviceInfo = _deviceInfo;
        syncDeviceInfoUi();
        return true;
    } catch (error) {
        console.error('Device info settings save error:', error);
        handleApiError('network_error');
        return false;
    }
}

function scheduleManualDeviceInfoSave() {
    if (_deviceInfoSaveTimer) {
        clearTimeout(_deviceInfoSaveTimer);
    }
    _deviceInfoSaveTimer = setTimeout(function() {
        _deviceInfoSaveTimer = null;
        var input = document.getElementById('device-info-input');
        var nextValue = input ? String(input.value || '').trim().slice(0, 256) : '';
        if (nextValue === String(_deviceInfo || '')) return;
        _deviceInfo = nextValue;
        saveDeviceInfoSettings({
            device_info: nextValue,
            device_info_is_manual: true,
        });
    }, 500);
}

function onDeviceInfoInput() {
    scheduleManualDeviceInfoSave();
}

async function handleAttachDeviceInfoToggle(input) {
    if (!input || _deviceInfoToggleInFlight) {
        syncDeviceInfoUi();
        return;
    }
    var previousValue = !!_attachDeviceInfoToBugs;
    var nextValue = !!input.checked;
    if (nextValue === previousValue) {
        syncDeviceInfoUi();
        return;
    }
    _deviceInfoToggleInFlight = true;
    _attachDeviceInfoToBugs = nextValue;
    syncDeviceInfoUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var ok = await saveDeviceInfoSettings({ attach_device_info_to_bugs: nextValue });
    if (!ok) {
        _attachDeviceInfoToBugs = previousValue;
    }
    _deviceInfoToggleInFlight = false;
    syncDeviceInfoUi();
}

async function refreshDeviceInfoFromBrowser() {
    if (_deviceInfoToggleInFlight) return;
    invalidateBrowserDeviceInfoCache();
    var parsed = parseDeviceInfoFromBrowser();
    _deviceInfoToggleInFlight = true;
    syncDeviceInfoUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var ok = await saveDeviceInfoSettings({
        device_info: parsed.line || '',
        device_info_is_manual: false,
    });
    _deviceInfoToggleInFlight = false;
    syncDeviceInfoUi();
    if (ok) {
        showToast(window.t('deviceInfoRefreshedToast', {}, lang));
    }
}

async function ensureDeviceInfoSynced(force) {
    if (!_attachDeviceInfoToBugs) return;
    if (_deviceInfoIsManual && _deviceInfo && !force) return;
    if (_deviceInfo && !force) return;
    var parsed = parseDeviceInfoFromBrowser();
    if (!parsed.line) return;
    await saveDeviceInfoSettings({
        device_info: parsed.line,
        device_info_is_manual: false,
    });
}

function applyDeviceInfoFromProfile(profile) {
    profile = profile || {};
    _attachDeviceInfoToBugs = profile.attach_device_info_to_bugs !== false;
    _deviceInfo = String(profile.device_info || '');
    _deviceInfoIsManual = !!profile.device_info_is_manual;
    _deviceInfoLoaded = true;
    window.App.attachDeviceInfoToBugs = _attachDeviceInfoToBugs;
    window.App.deviceInfo = _deviceInfo;
    syncDeviceInfoUi();
}

function showAttachDeviceInfoInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('attachDeviceInfoInfoToast', {}, lang));
}

function populateDeviceInfoSettings() {
    syncDeviceInfoUi();
    if (!_deviceInfoLoaded) return;
    if (!_deviceInfo && _attachDeviceInfoToBugs && !_deviceInfoIsManual) {
        var parsed = parseDeviceInfoFromBrowser();
        if (parsed.line) {
            var input = document.getElementById('device-info-input');
            if (input) input.value = parsed.line;
        }
    }
}
