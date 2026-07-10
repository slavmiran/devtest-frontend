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

function getTelegramPlatformLabel() {
    var tgPlatform = (window.tg && tg.platform) ? String(tg.platform).toLowerCase() : '';
    var labels = {
        android: 'Android',
        ios: 'iOS',
        macos: 'macOS',
        windows: 'Windows',
        linux: 'Linux',
        web: 'Telegram Web',
        weba: 'Telegram Web',
        tdesktop: 'Telegram Desktop',
    };
    return labels[tgPlatform] || '';
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
        } else if (/Windows NT/i.test(ua)) {
            var winMatch = ua.match(/Windows NT\s+([\d.]+)/i);
            osLabel = winMatch ? ('Windows ' + String(winMatch[1] || '').replace(/\.0$/, '')) : 'Windows';
            modelLabel = getTelegramPlatformLabel() || 'PC';
        } else if (/Mac OS X/i.test(ua)) {
            var macMatch = ua.match(/Mac OS X\s+([\d_]+)/i);
            osLabel = macMatch ? ('macOS ' + String(macMatch[1] || '').replace(/_/g, '.')) : 'macOS';
            modelLabel = getTelegramPlatformLabel() || 'Mac';
        } else if (/Linux/i.test(ua)) {
            osLabel = 'Linux';
            modelLabel = getTelegramPlatformLabel() || 'PC';
        } else if (tgPlatform === 'android') {
            osLabel = 'Android';
        } else if (tgPlatform === 'ios') {
            osLabel = 'iOS';
            modelLabel = 'iPhone';
        } else {
            osLabel = getTelegramPlatformLabel();
            modelLabel = osLabel ? '' : 'Unknown device';
        }
    }

    modelLabel = polishDeviceModel(modelLabel);
    _browserDeviceInfoCache = {
        line: buildDeviceInfoLine(osLabel, modelLabel, resolution),
        os: osLabel,
        model: modelLabel,
        resolution: resolution,
    };
    return _browserDeviceInfoCache;
}

function buildDeviceInfoLine(osLabel, modelLabel, resolution) {
    var parts = [];
    if (String(osLabel || '').trim()) parts.push(String(osLabel).trim());
    if (String(modelLabel || '').trim()) parts.push(String(modelLabel).trim());
    if (String(resolution || '').trim()) parts.push(String(resolution).trim());
    return parts.join(' • ');
}

function parseDeviceInfoParts(line) {
    var raw = String(line || '').trim();
    if (!raw) {
        return { os: '', model: '', resolution: '' };
    }
    var parts = raw.split('•').map(function(part) { return String(part || '').trim(); }).filter(Boolean);
    if (parts.length >= 3) {
        return {
            os: parts[0],
            model: parts.slice(1, -1).join(' • '),
            resolution: parts[parts.length - 1],
        };
    }
    if (parts.length === 2) {
        var second = parts[1];
        if (/\d+\s*x\s*\d+/i.test(second)) {
            return { os: parts[0], model: '', resolution: second };
        }
        return { os: parts[0], model: second, resolution: '' };
    }
    return { os: parts[0], model: '', resolution: '' };
}

function getDeviceInfoPreviewText() {
    if (!_attachDeviceInfoToBugs) {
        return window.t('deviceInfoDisabledHint', {}, lang);
    }
    if (String(_deviceInfo || '').trim()) {
        return String(_deviceInfo).trim();
    }
    var parsed = parseDeviceInfoFromBrowser();
    if (parsed.line) {
        return parsed.line;
    }
    return window.t('deviceInfoNotDetected', {}, lang);
}

function syncDeviceInfoUi() {
    var toggle = document.getElementById('attach-device-info-toggle');
    var previewBtn = document.getElementById('device-info-preview-btn');
    var previewText = document.getElementById('device-info-preview-text');
    if (toggle) {
        toggle.checked = !!_attachDeviceInfoToBugs;
        toggle.disabled = !!_deviceInfoToggleInFlight;
    }
    if (previewBtn) {
        previewBtn.disabled = !_attachDeviceInfoToBugs || !!_deviceInfoToggleInFlight;
        previewBtn.classList.toggle('is-disabled', !_attachDeviceInfoToBugs);
    }
    if (previewText) {
        previewText.textContent = getDeviceInfoPreviewText();
    }
}

function syncDeviceInfoModalFields() {
    var parts = parseDeviceInfoParts(_deviceInfo);
    if (!parts.os && !parts.model && !parts.resolution && _attachDeviceInfoToBugs && !_deviceInfoIsManual) {
        var parsed = parseDeviceInfoFromBrowser();
        parts = {
            os: parsed.os || '',
            model: parsed.model || '',
            resolution: parsed.resolution || '',
        };
    }
    var osInput = document.getElementById('device-info-os-input');
    var modelInput = document.getElementById('device-info-model-input');
    var resolutionInput = document.getElementById('device-info-resolution-input');
    if (osInput) osInput.value = parts.os || '';
    if (modelInput) modelInput.value = parts.model || '';
    if (resolutionInput) resolutionInput.value = parts.resolution || '';
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
        syncDeviceInfoModalFields();
        return true;
    } catch (error) {
        console.error('Device info settings save error:', error);
        handleApiError('network_error');
        return false;
    }
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
    syncDeviceInfoModalFields();
    if (ok) {
        showToast(window.t('deviceInfoRefreshedToast', {}, lang));
    }
}

function openDeviceInfoEditorModal() {
    if (!_attachDeviceInfoToBugs || _deviceInfoToggleInFlight) return;
    var modal = document.getElementById('device-info-modal');
    if (!modal) return;
    syncDeviceInfoModalFields();
    modal.classList.add('active');
    if (typeof syncTelegramBackButton === 'function') {
        syncTelegramBackButton();
    }
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function closeDeviceInfoEditorModal(event) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) {
        return;
    }
    var modal = document.getElementById('device-info-modal');
    if (modal) {
        modal.classList.remove('active');
    }
    if (typeof syncTelegramBackButton === 'function') {
        syncTelegramBackButton();
    }
}

async function saveDeviceInfoFromModal() {
    if (_deviceInfoToggleInFlight) return;
    var osInput = document.getElementById('device-info-os-input');
    var modelInput = document.getElementById('device-info-model-input');
    var resolutionInput = document.getElementById('device-info-resolution-input');
    var nextLine = buildDeviceInfoLine(
        osInput ? osInput.value : '',
        modelInput ? modelInput.value : '',
        resolutionInput ? resolutionInput.value : ''
    ).slice(0, 256);
    if (!nextLine) {
        showToast(window.t('deviceInfoEmptyError', {}, lang));
        return;
    }
    _deviceInfoToggleInFlight = true;
    syncDeviceInfoUi();
    var ok = await saveDeviceInfoSettings({
        device_info: nextLine,
        device_info_is_manual: true,
    });
    _deviceInfoToggleInFlight = false;
    syncDeviceInfoUi();
    if (ok) {
        closeDeviceInfoEditorModal();
        showToast(window.t('deviceInfoSavedToast', {}, lang));
    }
}

async function ensureDeviceInfoSynced(force) {
    if (!_attachDeviceInfoToBugs) return;
    if (_deviceInfoIsManual && _deviceInfo && !force) return;
    if (_deviceInfo && !force) return;
    try {
        var parsed = parseDeviceInfoFromBrowser();
        if (!parsed.line) return;
        await saveDeviceInfoSettings({
            device_info: parsed.line,
            device_info_is_manual: false,
        });
    } catch (error) {
        console.warn('Device info sync skipped:', error);
    }
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
            _deviceInfo = parsed.line;
            syncDeviceInfoUi();
        }
    }
}
