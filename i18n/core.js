(function () {
    const DEFAULT_LANG = 'en';

    const DICT = {
        ru: window.I18NRU || window.I18N_RU || {},
        en: window.I18NEN || window.I18N_EN || {},
    };



    function validateKeys() {
        const languages = Object.keys(DICT);
        const base = languages[0];
        const baseKeys = Object.keys(DICT[base]).sort();
        languages.slice(1).forEach((lang) => {
            const keys = Object.keys(DICT[lang]).sort();
            const missing = baseKeys.filter((key) => !keys.includes(key));
            const extra = keys.filter((key) => !baseKeys.includes(key));
            if (missing.length || extra.length) {
                console.error(`I18N key mismatch for ${lang}. Missing: ${missing.join(', ')}. Extra: ${extra.join(', ')}`);
            }
        });
    }

    function getMap(lang) {
        return DICT[lang] || DICT[DEFAULT_LANG];
    }

    function interpolate(value, params) {
        if (typeof value !== 'string') return value;
        return value.replace(/\{(\w+)\}/g, (_, key) => {
            if (Object.prototype.hasOwnProperty.call(params, key)) {
                return params[key];
            }
            return `{${key}}`;
        });
    }

    window.I18NRU = DICT.ru;
    window.I18NEN = DICT.en;
    window.I18N_RU = DICT.ru;
    window.I18N_EN = DICT.en;

    validateKeys();

    window.I18N_DICT = DICT;
    window.currentLang = window.currentLang || DEFAULT_LANG;
    window.t = function (key, params, lang) {
        const value = getMap(lang || window.currentLang)[key] ?? DICT[DEFAULT_LANG][key];
        if (typeof value === 'undefined') return key;
        return interpolate(value, params || {});
    };
    window.resolveApiMessage = function (payload, fallbackKey, lang) {
        const targetLang = lang || window.currentLang;
        const defaultKey = fallbackKey || 'genericError';
        const details = payload && typeof payload === 'object' && !Array.isArray(payload)
            ? (payload.details || {})
            : {};
        const code = typeof payload === 'string'
            ? payload
            : payload && typeof payload === 'object'
                ? (payload.code || payload.message)
                : null;

        if (typeof code === 'string') {
            const localized = getMap(targetLang)[code] ?? DICT[DEFAULT_LANG][code];
            if (typeof localized !== 'undefined') {
                return interpolate(localized, details);
            }
            if (code.trim()) {
                return code;
            }
        }

        if (payload && typeof payload === 'object' && typeof payload.detail === 'string' && payload.detail.trim()) {
            return payload.detail;
        }

        return window.t(defaultKey, {}, targetLang);
    };
    window.updateTranslations = function (lang) {
        window.currentLang = DICT[lang] ? lang : DEFAULT_LANG;

        document.querySelectorAll('[data-i18n]').forEach((element) => {
            element.textContent = window.t(element.dataset.i18n, {}, window.currentLang);
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
            element.placeholder = window.t(element.dataset.i18nPlaceholder, {}, window.currentLang);
        });

        document.querySelectorAll('[data-i18n-html]').forEach((element) => {
            element.innerHTML = window.t(element.dataset.i18nHtml, {}, window.currentLang);
        });

        document.querySelectorAll('[data-i18n-title]').forEach((element) => {
            element.title = window.t(element.dataset.i18nTitle, {}, window.currentLang);
        });
    };
})();