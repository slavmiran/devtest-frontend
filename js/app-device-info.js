/* Test device profile for bug reports and ideas — 3 manual fields + optional Android auto-detect. */

var _deviceInfoSaveInFlight = false;
var DEVICE_INFO_VERSION = 3;
var DEVICE_PROFILE_REWARD_AMOUNT = 30;

var DEVICE_FIELD_DEFS = [
    { key: 'android_version', i18n: 'deviceInfoAndroidLabel', placeholder: 'deviceInfoAndroidPlaceholder', required: true, autoDetect: true },
    { key: 'brand', i18n: 'deviceInfoBrandLabel', placeholder: 'deviceInfoBrandPlaceholder', required: true },
    { key: 'model', i18n: 'deviceInfoModelLabel', placeholder: 'deviceInfoModelPlaceholder', required: true },
];

function isKnownDeviceValue(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return normalized && normalized !== 'unknown' && normalized !== 'n/a' && normalized !== '—' && normalized !== '-';
}

function normalizeAndroidVersion(value) {
    var raw = String(value || '').trim();
    if (!raw) return '';
    if (/^(android|андроид)\b/i.test(raw)) {
        var match = raw.match(/(\d+(?:\.\d+)*)/);
        return match ? ('Android ' + match[1].replace(/\.0$/, '')) : raw;
    }
    if (/^\d+(?:\.\d+)*$/.test(raw)) {
        return 'Android ' + raw.replace(/\.0$/, '');
    }
    return raw;
}

function migrateLegacyDeviceData(data) {
    data = data || {};
    var migrated = { v: DEVICE_INFO_VERSION };
    var androidVersion = normalizeAndroidVersion(data.android_version || data.os_version);
    if (isKnownDeviceValue(androidVersion)) migrated.android_version = androidVersion;
    var brand = String(data.brand || data.manufacturer || '').trim();
    if (isKnownDeviceValue(brand)) migrated.brand = brand;
    var model = String(data.model || data.model_code || data.device_model || '').trim();
    if (isKnownDeviceValue(model)) migrated.model = model;
    return migrated;
}

function parseDeviceInfoData(rawValue) {
    var raw = String(rawValue || '').trim();
    if (!raw) return { v: DEVICE_INFO_VERSION };
    if (raw.charAt(0) === '{') {
        try {
            var parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                if (Number(parsed.v || 0) < DEVICE_INFO_VERSION) {
                    return migrateLegacyDeviceData(parsed);
                }
                parsed.v = DEVICE_INFO_VERSION;
                if (parsed.android_version) parsed.android_version = normalizeAndroidVersion(parsed.android_version);
                return parsed;
            }
        } catch (error) {}
    }
    return migrateLegacyDeviceData(parseLegacyDeviceLine(raw));
}

function parseLegacyDeviceLine(line) {
    var raw = String(line || '').trim();
    if (!raw) return {};
    var parts = raw.split('•').map(function(part) { return String(part || '').trim(); }).filter(Boolean);
    if (!parts.length) return {};
    var data = { os_version: parts[0] };
    if (parts.length >= 3) {
        data.brand = parts[1];
        data.model = parts[parts.length - 1];
    } else if (parts.length === 2) {
        data.model = parts[1];
    }
    return data;
}

function serializeDeviceInfoData(data) {
    data = parseDeviceInfoData(data && typeof data === 'object' ? JSON.stringify(data) : data);
    var payload = { v: DEVICE_INFO_VERSION };
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var value = String(data[def.key] || '').trim();
        if (def.key === 'android_version') value = normalizeAndroidVersion(value);
        if (isKnownDeviceValue(value)) payload[def.key] = value.slice(0, 256);
    });
    return JSON.stringify(payload);
}

function isDeviceProfileComplete(data) {
    data = parseDeviceInfoData(data && typeof data === 'object' ? JSON.stringify(data) : (data || _deviceInfo));
    return DEVICE_FIELD_DEFS.every(function(def) {
        var value = def.key === 'android_version'
            ? normalizeAndroidVersion(data[def.key])
            : String(data[def.key] || '').trim();
        return isKnownDeviceValue(value);
    });
}

function buildPublicDeviceLine(data) {
    data = parseDeviceInfoData(data && typeof data === 'object' ? JSON.stringify(data) : data);
    if (!isDeviceProfileComplete(data)) return '';
    return [
        normalizeAndroidVersion(data.android_version),
        String(data.brand || '').trim(),
        String(data.model || '').trim(),
    ].join(' • ');
}

function getStoredDeviceInfoData() {
    return parseDeviceInfoData(_deviceInfo);
}

function detectAndroidVersionFromBrowser() {
    var ua = String(navigator.userAgent || '');
    var androidMatch = ua.match(/Android\s+([\d.]+)/i);
    if (androidMatch) {
        return normalizeAndroidVersion('Android ' + String(androidMatch[1] || '').replace(/\.0$/, ''));
    }
    var tgPlatform = (window.tg && tg.platform) ? String(tg.platform).toLowerCase() : '';
    if (tgPlatform === 'android') return 'Android';
    return '';
}

function getDeviceProfilePreviewText() {
    var line = buildPublicDeviceLine(getStoredDeviceInfoData());
    if (line) return line;
    return window.t('deviceProfilePreviewEmpty', {}, lang);
}

function syncDeviceProfileUi() {
    var previewBtn = document.getElementById('device-info-preview-btn');
    var previewText = document.getElementById('device-info-preview-text');
    if (previewBtn) {
        previewBtn.disabled = !!_deviceInfoSaveInFlight;
        previewBtn.classList.toggle('device-info-preview--incomplete', !isDeviceProfileComplete());
    }
    if (previewText) {
        previewText.textContent = getDeviceProfilePreviewText();
    }
    syncDeviceProfileBanner();
    if (typeof renderEarnBustDynamic === 'function') {
        renderEarnBustDynamic();
    }
}

function syncDeviceProfileBanner() {
    var banner = document.getElementById('device-profile-banner');
    if (!banner) return;
    if (!_deviceProfileBannerReady) {
        banner.classList.remove('is-visible');
        return;
    }
    if (isDeviceProfileComplete() || localStorage.getItem('hideDeviceProfileBanner') === 'true') {
        banner.classList.remove('is-visible');
        return;
    }
    banner.classList.add('is-visible');
}

function closeDeviceProfileBanner() {
    localStorage.setItem('hideDeviceProfileBanner', 'true');
    syncDeviceProfileBanner();
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
}

function openDeviceProfileFromPrompt() {
    if (typeof closeEarnBustModal === 'function') {
        closeEarnBustModal();
    }
    var settingsMenu = document.getElementById('system-drop-menu');
    if (settingsMenu) settingsMenu.classList.remove('active');
    openDeviceInfoEditorModal();
}

function parseTelegramAndBrowserDeviceInfo() {
    var ua = String(navigator.userAgent || '');
    var result = {
        android_version: '',
        brand: '',
        model: '',
        source: 'browser',
    };

    // 1. Check Telegram-Android pattern: Telegram-Android/{app_version} ({manufacturer} {model}; Android {android_version}; SDK {sdk_version}; {performance_class})
    var tgMatch = ua.match(/Telegram-Android\/[\d\.]+\s*\(([^;]+);\s*Android\s*([^;]+);(?:\s*SDK\s*(\d+);?)?\s*([^)]*)\)/i);
    if (tgMatch) {
        result.source = 'telegram';
        var devicePart = (tgMatch[1] || '').trim();
        var osPart = (tgMatch[2] || '').trim();
        if (osPart) {
            result.android_version = normalizeAndroidVersion('Android ' + osPart);
        }
        if (devicePart) {
            var spaceIdx = devicePart.indexOf(' ');
            if (spaceIdx > 0) {
                result.brand = devicePart.slice(0, spaceIdx).trim();
                result.model = devicePart.slice(spaceIdx + 1).trim();
            } else {
                result.brand = devicePart;
            }
        }
    }

    // 2. Fallback to standard Android UA
    if (!result.android_version) {
        var androidMatch = ua.match(/Android\s+([\d\.]+)/i);
        if (androidMatch) {
            result.android_version = normalizeAndroidVersion('Android ' + androidMatch[1]);
        }
    }

    if (!result.model) {
        var modelMatch = ua.match(/\(Linux;\s*Android[^;]+;\s*([^;)]+)\s*Build/i);
        if (modelMatch) {
            var rawDevice = modelMatch[1].trim();
            var mSpaceIdx = rawDevice.indexOf(' ');
            if (mSpaceIdx > 0 && !result.brand) {
                result.brand = rawDevice.slice(0, mSpaceIdx).trim();
                result.model = rawDevice.slice(mSpaceIdx + 1).trim();
            } else {
                result.model = rawDevice;
            }
        }
    }

    return result;
}

function applyDetectedField(key, value) {
    var input = document.getElementById('device-info-field-' + key);
    if (!input) return;
    input.value = value;
    var row = input.closest('.device-info-field-row');
    if (row) {
        row.classList.remove('device-info-field-row--missing');
        input.classList.add('device-field-flash-success');
        setTimeout(function() { input.classList.remove('device-field-flash-success'); }, 600);
    }
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.selectionChanged();
    showToast(window.t('deviceDetectedAppliedToast', {}, lang), 1000);
}
window.applyDetectedField = applyDetectedField;

function applyAllDetectedFields() {
    var detected = parseTelegramAndBrowserDeviceInfo();
    if (detected.android_version) {
        var inputVer = document.getElementById('device-info-field-android_version');
        if (inputVer) inputVer.value = detected.android_version;
    }
    if (detected.brand) {
        var inputBrand = document.getElementById('device-info-field-brand');
        if (inputBrand) inputBrand.value = detected.brand;
    }
    if (detected.model) {
        var inputModel = document.getElementById('device-info-field-model');
        if (inputModel) inputModel.value = detected.model;
    }
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var input = document.getElementById('device-info-field-' + def.key);
        var row = input ? input.closest('.device-info-field-row') : null;
        if (row && input && input.value) {
            row.classList.remove('device-info-field-row--missing');
            input.classList.add('device-field-flash-success');
            setTimeout(function() { input.classList.remove('device-field-flash-success'); }, 600);
        }
    });
    if (window.tg && window.tg.HapticFeedback) window.tg.HapticFeedback.notificationOccurred('success');
    showToast(window.t('deviceDetectedAppliedToast', {}, lang), 1500);
}
window.applyAllDetectedFields = applyAllDetectedFields;

function renderDeviceInfoModalFields() {
    var root = document.getElementById('device-info-fields-root');
    var detectedRoot = document.getElementById('device-info-detected-root');
    if (!root) return;
    var data = getStoredDeviceInfoData();
    var detected = parseTelegramAndBrowserDeviceInfo();

    if (detectedRoot) {
        var hasDetected = detected.android_version || detected.brand || detected.model;
        if (hasDetected) {
            detectedRoot.innerHTML =
                '<div class="device-detected-panel">' +
                    '<div class="device-detected-head">' +
                        '<span class="device-detected-badge">⚡ ' + window.escapeHTML(window.t('deviceDetectedTitle', {}, lang)) + '</span>' +
                        '<button type="button" class="device-detected-apply-all" onclick="applyAllDetectedFields()">' + window.escapeHTML(window.t('deviceDetectedApplyAll', {}, lang)) + '</button>' +
                    '</div>' +
                    '<div class="device-detected-chips">' +
                        (detected.android_version ? '<button type="button" class="device-chip" onclick="applyDetectedField(\'android_version\', \'' + window.escapeHTML(detected.android_version) + '\')">📱 <b>' + window.escapeHTML(detected.android_version) + '</b></button>' : '') +
                        (detected.brand ? '<button type="button" class="device-chip" onclick="applyDetectedField(\'brand\', \'' + window.escapeHTML(detected.brand) + '\')">🏷️ <b>' + window.escapeHTML(detected.brand) + '</b></button>' : '') +
                        (detected.model ? '<button type="button" class="device-chip" onclick="applyDetectedField(\'model\', \'' + window.escapeHTML(detected.model) + '\')">📟 <b>' + window.escapeHTML(detected.model) + '</b></button>' : '') +
                    '</div>' +
                '</div>';
        } else {
            detectedRoot.innerHTML = '';
        }
    }

    root.innerHTML = DEVICE_FIELD_DEFS.map(function(def) {
        var value = def.key === 'android_version'
            ? normalizeAndroidVersion(data[def.key])
            : String(data[def.key] || '').trim();
        var isMissing = !isKnownDeviceValue(value);
        var rowClass = 'device-info-field-row';
        if (isMissing) rowClass += ' device-info-field-row--missing';
        var label = window.t(def.i18n, {}, lang);
        var placeholder = window.t(def.placeholder, {}, lang);
        var autoBtn = def.autoDetect
            ? '<button type="button" class="device-info-auto-btn" onclick="detectAndroidVersionInModal()" aria-label="' + window.escapeHTML(window.t('deviceInfoAndroidAutoBtn', {}, lang)) + '">' + window.escapeHTML(window.t('deviceInfoAndroidAutoBtn', {}, lang)) + '</button>'
            : '';
        return '<div class="' + rowClass + '">' +
            '<div class="device-info-field-head">' +
                '<label class="device-info-field-label" for="device-info-field-' + def.key + '">' + window.escapeHTML(label) + ' <span style="color:var(--danger,#ff453a);">*</span></label>' +
                autoBtn +
            '</div>' +
            '<input type="text" id="device-info-field-' + def.key + '" class="form-input device-info-field-input" data-device-field="' + def.key + '" maxlength="256" value="' + window.escapeHTML(value) + '" placeholder="' + window.escapeHTML(placeholder) + '" oninput="this.closest(\'.device-info-field-row\') && this.closest(\'.device-info-field-row\').classList.remove(\'device-info-field-row--missing\')">' +
        '</div>';
    }).join('');
}

function readDeviceInfoFromModal() {
    var data = { v: DEVICE_INFO_VERSION };
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var input = document.getElementById('device-info-field-' + def.key);
        var value = input ? String(input.value || '').trim() : '';
        if (def.key === 'android_version') value = normalizeAndroidVersion(value);
        data[def.key] = value;
    });
    return data;
}

function detectAndroidVersionInModal() {
    var input = document.getElementById('device-info-field-android_version');
    if (!input) return;
    var detected = detectAndroidVersionFromBrowser();
    if (!detected) {
        showToast(window.t('deviceInfoAndroidAutoFailed', {}, lang));
        return;
    }
    input.value = detected;
    var row = input.closest('.device-info-field-row');
    if (row) row.classList.remove('device-info-field-row--missing');
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('deviceInfoAndroidAutoDone', {}, lang));
}

async function saveDeviceInfoSettings(patch) {
    patch = patch || {};
    try {
        var response = await fetch(API_BASE + '/users/me/device-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.assign({
                init_data: (tg && tg.initData) ? tg.initData : '',
                device_info_is_manual: true,
            }, patch)),
        });
        var result = await response.json();
        if (!response.ok || result.status !== 'success') {
            handleApiError(getBackendErrorCode(result), result && result.details ? result.details : {});
            return null;
        }
        _deviceInfo = String(result.device_info || '');
        _deviceProfileComplete = !!result.device_profile_complete;
        _deviceProfileRewardClaimed = !!result.device_profile_reward_claimed;
        _deviceInfoIsManual = !!result.device_info_is_manual;
        _attachDeviceInfoToBugs = _deviceProfileComplete;
        window.App.deviceInfo = _deviceInfo;
        window.App.deviceProfileComplete = _deviceProfileComplete;
        window.App.deviceProfileRewardClaimed = _deviceProfileRewardClaimed;
        window.App.attachDeviceInfoToBugs = _attachDeviceInfoToBugs;
        syncDeviceProfileUi();
        renderDeviceInfoModalFields();
        if (typeof loadUserBalance === 'function' && Number(result.bust_rewarded || 0) > 0) {
            loadUserBalance().catch(function() {});
        }
        return result;
    } catch (error) {
        console.error('Device profile save error:', error);
        handleApiError('network_error');
        return null;
    }
}

function openDeviceInfoEditorModal() {
    if (_deviceInfoSaveInFlight) return;
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

async function clearDeviceInfoFromModal() {
    if (_deviceInfoSaveInFlight) return;
    _deviceInfoSaveInFlight = true;
    syncDeviceProfileUi();

    DEVICE_FIELD_DEFS.forEach(function(def) {
        var input = document.getElementById('device-info-field-' + def.key);
        if (input) input.value = '';
    });

    var result = await saveDeviceInfoSettings({
        device_info: '',
        device_info_is_manual: false,
    });
    _deviceInfoSaveInFlight = false;
    syncDeviceProfileUi();
    if (!result) return;
    closeDeviceInfoEditorModal();
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast(window.t('deviceInfoClearedToast', {}, lang));
}
window.clearDeviceInfoFromModal = clearDeviceInfoFromModal;

async function saveDeviceInfoFromModal() {
    if (_deviceInfoSaveInFlight) return;
    var data = readDeviceInfoFromModal();

    // Check all 3 fields strictly
    var hasMissing = false;
    DEVICE_FIELD_DEFS.forEach(function(def) {
        var input = document.getElementById('device-info-field-' + def.key);
        var row = input ? input.closest('.device-info-field-row') : null;
        var value = def.key === 'android_version'
            ? normalizeAndroidVersion(data[def.key])
            : String(data[def.key] || '').trim();
        var isMissing = !isKnownDeviceValue(value);
        if (row) {
            row.classList.toggle('device-info-field-row--missing', isMissing);
            if (isMissing) {
                row.classList.remove('device-info-field-row--shake');
                void row.offsetWidth; // force reflow
                row.classList.add('device-info-field-row--shake');
            }
        }
        if (isMissing) hasMissing = true;
    });

    if (hasMissing) {
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showToast(window.t('deviceProfileIncompleteError', {}, lang));
        return;
    }

    _deviceInfoSaveInFlight = true;
    syncDeviceProfileUi();
    var result = await saveDeviceInfoSettings({
        device_info: serializeDeviceInfoData(data),
    });
    _deviceInfoSaveInFlight = false;
    syncDeviceProfileUi();
    if (!result) return;
    closeDeviceInfoEditorModal();
    if (Number(result.bust_rewarded || 0) > 0) {
        showToast(window.t('deviceProfileRewardToast', { amount: DEVICE_PROFILE_REWARD_AMOUNT }, lang));
    } else if (result.reward_error) {
        showToast(window.t('deviceProfileRewardPendingToast', {}, lang));
    } else {
        showToast(window.t('deviceInfoSavedToast', {}, lang));
    }
}

function applyDeviceInfoFromProfile(profile) {
    profile = profile || {};
    _deviceInfo = String(profile.device_info || '');
    _deviceInfoIsManual = !!profile.device_info_is_manual;
    _deviceProfileComplete = profile.device_profile_complete !== undefined
        ? !!profile.device_profile_complete
        : isDeviceProfileComplete(_deviceInfo);
    _deviceProfileRewardClaimed = !!profile.device_profile_reward_claimed;
    _attachDeviceInfoToBugs = _deviceProfileComplete;
    _deviceInfoLoaded = true;
    _deviceProfileBannerReady = true;
    window.App.deviceInfo = _deviceInfo;
    window.App.deviceProfileComplete = _deviceProfileComplete;
    window.App.deviceProfileRewardClaimed = _deviceProfileRewardClaimed;
    window.App.attachDeviceInfoToBugs = _attachDeviceInfoToBugs;
    syncDeviceProfileUi();
}

function showDeviceProfileInfo() {
    if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    showToast(window.t('deviceProfileMenuInfoToast', {}, lang));
}

function populateDeviceInfoSettings() {
    syncDeviceProfileUi();
}

function formatDeviceInfoForCopy(item, project) {
    item = item || {};
    project = project || {};
    var publicLine = String(item.device_info_public_line || '').trim();
    if (!publicLine && item.device_info && typeof item.device_info === 'object') {
        publicLine = buildPublicDeviceLine(item.device_info);
    }
    if (!publicLine) {
        publicLine = buildPublicDeviceLine(parseDeviceInfoData(item.device_info || ''));
    }
    var lines = [String(item.message_text || '').trim()];
    if (publicLine) {
        lines.push('');
        lines.push(publicLine);
    }
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
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast(window.t('feedbackCopySuccessToast', {}, lang));
        }).catch(function() {
            showToast(window.t('feedbackCopyErrorToast', {}, lang));
        });
        return true;
    }
    var done = false;
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
    var feedbackType = String((item && item.type) || '').toLowerCase();
    if (!item || (feedbackType !== 'bug' && feedbackType !== 'idea')) return '';
    var publicLine = String(item.device_info_public_line || '').trim();
    if (!publicLine) {
        var data = item.device_info && typeof item.device_info === 'object'
            ? item.device_info
            : parseDeviceInfoData(item.device_info || '');
        publicLine = buildPublicDeviceLine(data);
    }
    if (!publicLine) return '';
    var safeLine = window.escapeHTML(publicLine);
    var safeAttr = safeLine.replace(/"/g, '&quot;');
    return '<button type="button" class="fb-device-line" title="' + (window.t('feedbackCopyDeviceHint', {}, lang) || 'Copy device info') + '" onclick="copyFeedbackDeviceLine(this)">' + safeLine + '</button>';
}

function copyFeedbackDeviceLine(btnEl) {
    var text = (btnEl && (btnEl.textContent || btnEl.innerText) || '').trim();
    if (!text) return false;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            showToast(window.t('feedbackCopySuccessToast', {}, lang) || 'Copied');
        }).catch(function() {
            showToast(window.t('feedbackCopyErrorToast', {}, lang) || 'Copy failed');
        });
        return true;
    }
    showToast(window.t('feedbackCopyErrorToast', {}, lang) || 'Copy failed');
    return false;
}
window.copyFeedbackDeviceLine = copyFeedbackDeviceLine;
window.isDeviceProfileComplete = isDeviceProfileComplete;
window.openDeviceInfoEditorModal = openDeviceInfoEditorModal;
