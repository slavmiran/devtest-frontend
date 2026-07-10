/* Device info detection and settings for bug reports (structured JSON v2). */

var _browserDeviceInfoCache = null;
var _deviceInfoToggleInFlight = false;
var DEVICE_INFO_VERSION = 2;

var DEVICE_FIELD_DEFS = [
    { key: 'os_version', i18n: 'deviceInfoOsLabel', placeholder: 'deviceInfoOsPlaceholder', required: true },
    { key: 'device_model', i18n: 'deviceInfoModelLabel', placeholder: 'deviceInfoModelPlaceholder', required: true, highlightIfMissing: true },
    { key: 'model_code', i18n: 'deviceInfoModelCodeLabel', placeholder: 'deviceInfoModelCodePlaceholder' },
    { key: 'brand', i18n: 'deviceInfoBrandLabel', placeholder: 'deviceInfoBrandPlaceholder' },
    { key: 'manufacturer', i18n: 'deviceInfoManufacturerLabel', placeholder: 'deviceInfoManufacturerPlaceholder' },
    { key: 'gpu', i18n: 'deviceInfoGpuLabel', placeholder: 'deviceInfoGpuPlaceholder' },
    { key: 'gpu_renderer', i18n: 'deviceInfoGpuRendererLabel', placeholder: 'deviceInfoGpuRendererPlaceholder' },
    { key: 'ram', i18n: 'deviceInfoRamLabel', placeholder: 'deviceInfoRamPlaceholder', required: true },
    { key: 'cpu_architecture', i18n: 'deviceInfoCpuArchLabel', placeholder: 'deviceInfoCpuArchPlaceholder' },
    { key: 'screen_resolution', i18n: 'deviceInfoResolutionLabel', placeholder: 'deviceInfoResolutionPlaceholder', required: true },
    { key: 'screen_density', i18n: 'deviceInfoDensityLabel', placeholder: 'deviceInfoDensityPlaceholder' },
    { key: 'language', i18n: 'deviceInfoLanguageLabel', placeholder: 'deviceInfoLanguagePlaceholder' },
    { key: 'region', i18n: 'deviceInfoRegionLabel', placeholder: 'deviceInfoRegionPlaceholder' },
    { key: 'device_type', i18n: 'deviceInfoTypeLabel', placeholder: 'deviceInfoTypePlaceholder' },
    { key: 'hardware_cores', i18n: 'deviceInfoCoresLabel', placeholder: 'deviceInfoCoresPlaceholder' },
    { key: 'storage_total', i18n: 'deviceInfoStorageTotalLabel', placeholder: 'deviceInfoStorageTotalPlaceholder' },
    { key: 'storage_free', i18n: 'deviceInfoStorageFreeLabel', placeholder: 'deviceInfoStorageFreePlaceholder' },
];

function invalidateBrowserDeviceInfoCache() {
    _browserDeviceInfoCache = null;
}

function isKnownDeviceValue(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return normalized && normalized !== 'unknown' && normalized !== 'n/a' && normalized !== '—' && normalized !== '-';
}

function polishDeviceModel(modelLabel) {
    var model = String(modelLabel || '').trim();
    if (!model) return '';
    model = model.replace(/^SAMSUNG\s+/i, '').trim();
    if (/^SM-[A-Z0-9]+$/i.test(model)) return 'Samsung (' + model + ')';
    if (/^Pixel\b/i.test(model)) return model;
    return model;
}

function extractAndroidModelFromUa(ua) {
    var buildMatch = ua.match(/;\s*([^;()]+?)\s+Build\//i);
    if (buildMatch) return String(buildMatch[1] || '').trim();
    var parenMatch = ua.match(/Android\s+[\d.]+\s*;\s*([^)]+)\)/i);
    if (!parenMatch) return '';
    var segment = String(parenMatch[1] || '').trim();
    var parts = segment.split(';').map(function(part) { return String(part || '').trim(); }).filter(Boolean);
    var candidates = parts.filter(function(part) {
        return !/^(linux|k|mobile|wv|android|armv\d+|aarch64|arm64|x86_64|x86|wow64)$/i.test(part);
    });
    return candidates.length ? candidates[candidates.length - 1] : '';
}

function inferBrandFromModel(modelLabel, modelCode) {
    var source = String(modelCode || modelLabel || '').trim();
    if (!source) return '';
    if (/^SM-/i.test(source) || /samsung/i.test(source)) return 'Samsung';
    if (/^Pixel\b/i.test(source) || /google/i.test(source)) return 'Google';
    if (/^Redmi\b|^POCO\b|^Mi\s/i.test(source) || /xiaomi/i.test(source)) return 'Xiaomi';
    if (/^moto\b/i.test(source) || /motorola/i.test(source)) return 'Motorola';
    if (/^ONEPLUS/i.test(source) || /oneplus/i.test(source)) return 'OnePlus';
    if (/^HUAWEI/i.test(source) || /huawei/i.test(source)) return 'Huawei';
    if (/^OPPO/i.test(source) || /oppo/i.test(source)) return 'OPPO';
    if (/^vivo/i.test(source)) return 'vivo';
    if (/^RMX/i.test(source) || /realme/i.test(source)) return 'Realme';
    return '';
}

function getTelegramPlatformLabel() {
    var tgPlatform = (window.tg && tg.platform) ? String(tg.platform).toLowerCase() : '';
    var labels = {
        android: 'Android', ios: 'iOS', macos: 'macOS', windows: 'Windows',
        linux: 'Linux', web: 'Telegram Web', weba: 'Telegram Web', tdesktop: 'Telegram Desktop',
    };
    return labels[tgPlatform] || '';
}

function getWebGlRenderer() {
    try {
        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return { gpu: '', gpu_renderer: '' };
        var debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return { gpu: '', gpu_renderer: '' };
        var renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').trim();
        var vendor = String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').trim();
        var gpu = '';
        if (/adreno/i.test(renderer)) {
            var adrenoMatch = renderer.match(/Adreno[^\s,)]*/i);
            gpu = adrenoMatch ? adrenoMatch[0] : 'Adreno';
        } else if (/mali/i.test(renderer)) {
            var maliMatch = renderer.match(/Mali[^\s,)]*/i);
            gpu = maliMatch ? maliMatch[0] : 'Mali';
        } else if (/powervr/i.test(renderer)) {
            gpu = 'PowerVR';
        } else if (renderer) {
            gpu = renderer.split(',')[0].trim().slice(0, 64);
        }
        return { gpu: gpu, gpu_renderer: renderer || vendor };
    } catch (error) {
        return { gpu: '', gpu_renderer: '' };
    }
}

function getRamLabel() {
    var mem = Number(navigator.deviceMemory || 0);
    if (mem > 0) return mem + ' GB';
    return '';
}

function getCpuArchitecture(ua) {
    ua = String(ua || navigator.userAgent || '');
    if (/aarch64|arm64|armv8/i.test(ua)) return 'ARM64';
    if (/armv7|armv6/i.test(ua)) return 'ARMv7';
    if (/x86_64|win64|wow64|amd64/i.test(ua)) return 'x86_64';
    if (/i686|x86/i.test(ua)) return 'x86';
    if (navigator.userAgentData && navigator.userAgentData.platform === 'Android') return 'ARM64';
    return '';
}

function getScreenDensityLabel() {
    var dpr = Number(window.devicePixelRatio || 0);
    var screenW = Math.max(0, Number(window.screen && window.screen.width) || 0);
    if (!dpr) return '';
    var dpi = Math.round(dpr * 160);
    var bucket = dpr >= 3.5 ? 'xxxhdpi' : dpr >= 2.5 ? 'xxhdpi' : dpr >= 1.75 ? 'xhdpi' : dpr >= 1.25 ? 'hdpi' : 'mdpi';
    var physical = screenW && dpr ? Math.round(screenW * dpr) : 0;
    return bucket + ' / ' + dpi + ' dpi' + (physical ? ' (~' + physical + 'px)' : '');
}

function getDeviceTypeLabel(ua, tgPlatform) {
    ua = String(ua || '');
    tgPlatform = String(tgPlatform || '').toLowerCase();
    if (/iPad|Tablet|Tab\b/i.test(ua)) return 'Tablet';
    if (/Fold|flip/i.test(ua)) return 'Foldable';
    if (tgPlatform === 'android' || tgPlatform === 'ios' || /Mobile/i.test(ua)) return 'Phone';
    if (tgPlatform === 'tdesktop' || tgPlatform === 'web' || tgPlatform === 'weba') return 'Desktop';
    return '';
}

function getLocaleParts() {
    var locale = String(navigator.language || '').trim();
    if (!locale) return { language: '', region: '' };
    var parts = locale.split('-');
    return {
        language: locale,
        region: parts.length > 1 ? String(parts[parts.length - 1] || '').toUpperCase() : '',
    };
}

function parseLegacyDeviceLine(line) {
    var raw = String(line || '').trim();
    if (!raw || raw.charAt(0) === '{') return {};
    var parts = raw.split('•').map(function(part) { return String(part || '').trim(); }).filter(Boolean);
    var data = {};
    if (!parts.length) return data;
    data.os_version = parts[0];
    if (parts.length === 2) {
        if (/\d+\s*x\s*\d+/i.test(parts[1])) data.screen_resolution = parts[1];
        else data.device_model = parts[1];
    } else if (parts.length >= 3) {
        data.device_model = parts.slice(1, -1).join(' • ');
        data.screen_resolution = parts[parts.length - 1];
    }
    return data;
}

function parseDeviceInfoData(rawValue) {
    var raw = String(rawValue || '').trim();
    if (!raw) return { v: DEVICE_INFO_VERSION };
    if (raw.charAt(0) === '{') {
        try {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                parsed.v = DEVICE_INFO_VERSION;
                return parsed;
            }
        } catch (error) {}
    }
    var legacy = parseLegacyDeviceLine(raw);
    legacy.v = DEVICE_INFO_VERSION;
    return legacy;
}

function serializeDeviceInfoData(data) {
    data = data || {};
    var payload = { v: DEVICE_INFO_VERSION };
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var value = String(data[def.key] || '').trim();
        if (value) payload[def.key] = value.slice(0, 256);
    });
    return JSON.stringify(payload);
}

function getPublicModelOrGpu(data) {
    data = data || {};
    if (isKnownDeviceValue(data.device_model)) return String(data.device_model).trim();
    if (isKnownDeviceValue(data.gpu)) return String(data.gpu).trim();
    if (isKnownDeviceValue(data.gpu_renderer)) return String(data.gpu_renderer).trim();
    return '';
}

function buildPublicDeviceLine(data) {
    data = data || {};
    var parts = [];
    if (isKnownDeviceValue(data.os_version)) parts.push(String(data.os_version).trim());
    var modelOrGpu = getPublicModelOrGpu(data);
    if (modelOrGpu) parts.push(modelOrGpu);
    if (isKnownDeviceValue(data.ram)) parts.push(String(data.ram).trim());
    if (isKnownDeviceValue(data.screen_resolution)) parts.push(String(data.screen_resolution).trim());
    return parts.join(' • ');
}

function deviceModelIsMissing(data) {
    return !isKnownDeviceValue((data || {}).device_model);
}

function getActiveDeviceInfoData() {
    var stored = parseDeviceInfoData(_deviceInfo);
    if (_deviceInfoIsManual || Object.keys(stored).some(function(key) {
        return key !== 'v' && isKnownDeviceValue(stored[key]);
    })) {
        return stored;
    }
    var detected = _browserDeviceInfoCache || _parseDeviceInfoFromBrowserSync();
    return Object.assign({}, detected, stored);
}

function _parseDeviceInfoFromBrowserSync() {
    var ua = String(navigator.userAgent || '');
    var tgPlatform = (window.tg && tg.platform) ? String(tg.platform).toLowerCase() : '';
    var screenW = Math.max(0, Number(window.screen && window.screen.width) || 0);
    var screenH = Math.max(0, Number(window.screen && window.screen.height) || 0);
    var resolution = screenW && screenH ? (screenW + ' x ' + screenH) : '';
    var localeParts = getLocaleParts();
    var webgl = getWebGlRenderer();

    var osLabel = '';
    var modelRaw = '';
    var androidMatch = ua.match(/Android\s+([\d.]+)/i);
    if (androidMatch) {
        osLabel = 'Android ' + String(androidMatch[1] || '').replace(/\.0$/, '');
        modelRaw = extractAndroidModelFromUa(ua);
    } else {
        var iosMatch = ua.match(/(?:iPhone|iPad|iPod).*?OS\s+([\d_]+)/i);
        if (iosMatch) {
            osLabel = 'iOS ' + String(iosMatch[1] || '').replace(/_/g, '.');
            modelRaw = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
        } else if (/Windows NT/i.test(ua)) {
            var winMatch = ua.match(/Windows NT\s+([\d.]+)/i);
            osLabel = winMatch ? ('Windows ' + String(winMatch[1] || '').replace(/\.0$/, '')) : 'Windows';
            modelRaw = getTelegramPlatformLabel() || 'PC';
        } else if (/Mac OS X/i.test(ua)) {
            var macMatch = ua.match(/Mac OS X\s+([\d_]+)/i);
            osLabel = macMatch ? ('macOS ' + String(macMatch[1] || '').replace(/_/g, '.')) : 'macOS';
            modelRaw = getTelegramPlatformLabel() || 'Mac';
        } else if (/Linux/i.test(ua)) {
            osLabel = 'Linux';
            modelRaw = getTelegramPlatformLabel() || 'PC';
        } else if (tgPlatform === 'android') {
            osLabel = 'Android';
        } else if (tgPlatform === 'ios') {
            osLabel = 'iOS';
            modelRaw = 'iPhone';
        } else {
            osLabel = getTelegramPlatformLabel();
        }
    }

    var modelCode = modelRaw;
    var deviceModel = polishDeviceModel(modelRaw);
    var brand = inferBrandFromModel(deviceModel, modelCode);

    return {
        v: DEVICE_INFO_VERSION,
        os_version: osLabel,
        device_model: deviceModel,
        model_code: modelCode,
        brand: brand,
        manufacturer: brand,
        gpu: webgl.gpu,
        gpu_renderer: webgl.gpu_renderer,
        ram: getRamLabel(),
        cpu_architecture: getCpuArchitecture(ua),
        screen_resolution: resolution,
        screen_density: getScreenDensityLabel(),
        language: localeParts.language,
        region: localeParts.region,
        device_type: getDeviceTypeLabel(ua, tgPlatform),
        hardware_cores: navigator.hardwareConcurrency ? String(navigator.hardwareConcurrency) : '',
        storage_total: navigator.storage && navigator.storage.estimate ? '' : '',
        storage_free: '',
    };
}

async function enrichDeviceInfoFromClientHints(parsed) {
    parsed = parsed || _parseDeviceInfoFromBrowserSync();
    if (!navigator.userAgentData || typeof navigator.userAgentData.getHighEntropyValues !== 'function') {
        return parsed;
    }
    try {
        var hints = await navigator.userAgentData.getHighEntropyValues(['model', 'platformVersion', 'platform', 'architecture']);
        var next = Object.assign({}, parsed);
        if (hints.model && !isKnownDeviceValue(next.device_model)) {
            next.model_code = String(hints.model || '').trim();
            next.device_model = polishDeviceModel(next.model_code);
            if (!next.brand) next.brand = inferBrandFromModel(next.device_model, next.model_code);
            if (!next.manufacturer) next.manufacturer = next.brand;
        }
        if (hints.platformVersion && /^Android\b/i.test(String(next.os_version || ''))) {
            next.os_version = 'Android ' + String(hints.platformVersion || '').replace(/\.0$/, '');
        }
        if (hints.architecture && !isKnownDeviceValue(next.cpu_architecture)) {
            next.cpu_architecture = String(hints.architecture || '').trim();
        }
        return next;
    } catch (error) {
        return parsed;
    }
}

async function getBestDeviceInfoFromBrowser() {
    invalidateBrowserDeviceInfoCache();
    var parsed = _parseDeviceInfoFromBrowserSync();
    if (navigator.storage && typeof navigator.storage.estimate === 'function') {
        try {
            var estimate = await navigator.storage.estimate();
            var quotaGb = estimate.quota ? (estimate.quota / (1024 * 1024 * 1024)) : 0;
            var usageGb = estimate.usage ? (estimate.usage / (1024 * 1024 * 1024)) : 0;
            if (quotaGb > 0) parsed.storage_total = quotaGb.toFixed(1) + ' GB';
            if (usageGb >= 0 && quotaGb > 0) parsed.storage_free = Math.max(0, quotaGb - usageGb).toFixed(1) + ' GB free';
        } catch (error) {}
    }
    var enriched = await enrichDeviceInfoFromClientHints(parsed);
    _browserDeviceInfoCache = enriched;
    return enriched;
}

function getDeviceInfoPreviewText() {
    var data = getActiveDeviceInfoData();
    var line = buildPublicDeviceLine(data);
    if (line) return line;
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
        previewBtn.disabled = !!_deviceInfoToggleInFlight;
        previewBtn.classList.remove('is-disabled');
        previewBtn.classList.toggle('device-info-preview--model-missing', deviceModelIsMissing(getActiveDeviceInfoData()));
    }
    if (previewText) {
        previewText.textContent = getDeviceInfoPreviewText();
    }
}

function renderDeviceInfoModalFields() {
    var root = document.getElementById('device-info-fields-root');
    if (!root) return;
    var data = getActiveDeviceInfoData();
    var modelMissing = deviceModelIsMissing(data);
    root.innerHTML = DEVICE_FIELD_DEFS.map(function(def) {
        var value = String(data[def.key] || '');
        var isMissing = !isKnownDeviceValue(value);
        var rowClass = 'device-info-field-row';
        if (isMissing) rowClass += ' device-info-field-row--missing';
        if (def.highlightIfMissing && modelMissing) rowClass += ' device-info-field-row--attention';
        var label = window.t(def.i18n, {}, lang);
        var placeholder = window.t(def.placeholder, {}, lang);
        var hint = '';
        if (def.highlightIfMissing && modelMissing) {
            hint = '<div class="device-info-field-hint">' + window.escapeHTML(window.t('deviceInfoModelMissingHint', {}, lang)) + '</div>';
        } else if (isMissing) {
            hint = '<div class="device-info-field-hint">' + window.escapeHTML(window.t('deviceInfoFieldMissingHint', {}, lang)) + '</div>';
        }
        return '<div class="' + rowClass + '">' +
            '<label class="device-info-field-label" for="device-info-field-' + def.key + '">' + window.escapeHTML(label) + '</label>' +
            '<input type="text" id="device-info-field-' + def.key + '" class="form-input device-info-field-input" data-device-field="' + def.key + '" maxlength="256" value="' + window.escapeHTML(value) + '" placeholder="' + window.escapeHTML(placeholder) + '">' +
            hint +
        '</div>';
    }).join('');
}

function readDeviceInfoFromModal() {
    var data = { v: DEVICE_INFO_VERSION };
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var input = document.getElementById('device-info-field-' + def.key);
        data[def.key] = input ? String(input.value || '').trim() : '';
    });
    return data;
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
        renderDeviceInfoModalFields();
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
    if (!ok) _attachDeviceInfoToBugs = previousValue;
    _deviceInfoToggleInFlight = false;
    syncDeviceInfoUi();
}

async function refreshDeviceInfoFromBrowser() {
    if (_deviceInfoToggleInFlight) return;
    _deviceInfoToggleInFlight = true;
    syncDeviceInfoUi();
    if (tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    var parsed = await getBestDeviceInfoFromBrowser();
    var ok = await saveDeviceInfoSettings({
        device_info: serializeDeviceInfoData(parsed),
        device_info_is_manual: false,
    });
    _deviceInfoToggleInFlight = false;
    syncDeviceInfoUi();
    renderDeviceInfoModalFields();
    if (ok) showToast(window.t('deviceInfoRefreshedToast', {}, lang));
}

function openDeviceInfoEditorModal() {
    if (_deviceInfoToggleInFlight) return;
    var settingsMenu = document.getElementById('system-drop-menu');
    if (settingsMenu) settingsMenu.classList.remove('active');
    var modal = document.getElementById('device-info-modal');
    if (!modal) return;
    renderDeviceInfoModalFields();
    modal.classList.add('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function closeDeviceInfoEditorModal(event) {
    if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
    var modal = document.getElementById('device-info-modal');
    if (modal) modal.classList.remove('active');
    if (typeof syncTelegramBackButton === 'function') syncTelegramBackButton();
}

async function saveDeviceInfoFromModal() {
    if (_deviceInfoToggleInFlight) return;
    var data = readDeviceInfoFromModal();
    if (!buildPublicDeviceLine(data)) {
        showToast(window.t('deviceInfoEmptyError', {}, lang));
        return;
    }
    _deviceInfoToggleInFlight = true;
    syncDeviceInfoUi();
    var ok = await saveDeviceInfoSettings({
        device_info: serializeDeviceInfoData(data),
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
        var parsed = await getBestDeviceInfoFromBrowser();
        if (!buildPublicDeviceLine(parsed)) return;
        await saveDeviceInfoSettings({
            device_info: serializeDeviceInfoData(parsed),
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
    if (!_deviceInfo && !_deviceInfoIsManual) {
        getBestDeviceInfoFromBrowser().then(function(parsed) {
            if (buildPublicDeviceLine(parsed)) {
                _deviceInfo = serializeDeviceInfoData(parsed);
                syncDeviceInfoUi();
            }
        }).catch(function() {});
    }
}

function formatDeviceInfoForCopy(item, project) {
    item = item || {};
    project = project || {};
    var data = item.device_info && typeof item.device_info === 'object' ? item.device_info : parseDeviceInfoData(item.device_info_public_line || item.device_info || '');
    var lines = [];
    lines.push(String(item.message_text || '').trim());
    lines.push('');
    lines.push(window.t('feedbackCopyDeviceHeader', {}, lang));
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var value = String(data[def.key] || '').trim();
        if (isKnownDeviceValue(value)) {
            lines.push(window.t(def.i18n, {}, lang) + ': ' + value);
        }
    });
    if (project.name) {
        lines.push('');
        lines.push(window.t('projectLabel', { name: project.name }, lang) || ('Project: ' + project.name));
    }
    return lines.join('\n');
}

function copyFeedbackCardContent(itemId, projectId) {
    var items = (typeof _activeProjectFeedbackItems !== 'undefined' ? _activeProjectFeedbackItems : []) || [];
    var item = items.find(function(row) { return Number(row.id) === Number(itemId); });
    var project = (typeof getProjectById === 'function') ? getProjectById(projectId) : null;
    if (!item) return false;
    var text = formatDeviceInfoForCopy(item, project);
    var done = false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast(window.t('feedbackCopySuccessToast', {}, lang));
        }).catch(function() {
            showToast(window.t('feedbackCopyErrorToast', {}, lang));
        });
        return true;
    }
    try {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        done = document.execCommand('copy');
        document.body.removeChild(textarea);
    } catch (error) {}
    showToast(window.t(done ? 'feedbackCopySuccessToast' : 'feedbackCopyErrorToast', {}, lang));
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred(done ? 'success' : 'error');
    return done;
}

function renderFeedbackDeviceInfoBlock(item) {
    if (!item || String(item.type || '').toLowerCase() !== 'bug') return '';
    var data = item.device_info && typeof item.device_info === 'object'
        ? item.device_info
        : parseDeviceInfoData(item.device_info_public_line || '');
    var rows = DEVICE_FIELD_DEFS.map(function(def) {
        var value = String(data[def.key] || '').trim();
        var rowClass = 'fb-device-row';
        if (!isKnownDeviceValue(value)) rowClass += ' fb-device-row--missing';
        if (def.key === 'device_model' && deviceModelIsMissing(data)) rowClass += ' fb-device-row--attention';
        return '<div class="' + rowClass + '">' +
            '<span class="fb-device-label">' + window.escapeHTML(window.t(def.i18n, {}, lang)) + '</span>' +
            '<span class="fb-device-value">' + window.escapeHTML(isKnownDeviceValue(value) ? value : window.t('deviceInfoUnknownValue', {}, lang)) + '</span>' +
        '</div>';
    }).join('');
    var publicLine = buildPublicDeviceLine(data);
    var header = publicLine
        ? '<div class="fb-device-public">' + window.escapeHTML(publicLine) + '</div>'
        : '';
    return '<div class="fb-device-block">' +
        '<div class="fb-device-title">' + window.escapeHTML(window.t('feedbackDeviceInfoTitle', {}, lang)) + '</div>' +
        header +
        '<div class="fb-device-grid">' + rows + '</div>' +
    '</div>';
}
