/**
 * telegram-mock.js — изолированная среда для тестирования WebApp вне Telegram.
 *
 * НАЗНАЧЕНИЕ:
 *   Позволяет открывать DevTest Hub в обычном браузере (localhost, staging, preview)
 *   и подставлять фейкового пользователя Telegram, не трогая app-config.js / app.js.
 *
 * БЕЗОПАСНОСТЬ:
 *   На продакшн-домене slavmiran.github.io скрипт немедленно завершает работу
 *   и НИЧЕГО не инжектит. Мок активен только на непродакшн-хостах.
 *
 * ПОДКЛЮЧЕНИЕ (index.html):
 *   1) telegram-web-app.js  — официальный SDK Telegram
 *   2) js/telegram-mock.js  — ЭТОТ файл (до app-config.js!)
 *   3) js/app-config.js     — основное приложение уже видит мок-данные
 */
(function telegramMockBootstrap() {
    'use strict';

    // -------------------------------------------------------------------------
    // ШАГ 1. Определяем текущий хост страницы.
    // window.location.hostname — только имя домена без протокола и пути.
    // Примеры: "localhost", "127.0.0.1", "my-preview.vercel.app", "slavmiran.github.io"
    // -------------------------------------------------------------------------
    var hostname = String((window.location && window.location.hostname) || '').toLowerCase();

    // -------------------------------------------------------------------------
    // ШАГ 2. Флаг продакшна.
    // Если домен содержит slavmiran.github.io — это публичный прод, мок ЗАПРЕЩЁН.
    // includes(), а не ===, чтобы сработало и для поддоменов вроде www.slavmiran.github.io.
    // -------------------------------------------------------------------------
    var IS_PRODUCTION = hostname.indexOf('slavmiran.github.io') !== -1;

    // -------------------------------------------------------------------------
    // ШАГ 3. Жёсткий выход на продакшне.
    // return внутри IIFE полностью останавливает скрипт: ни флаги, ни Telegram-объект
    // не будут изменены. Прод остаётся под настоящей Telegram-авторизацией.
    // -------------------------------------------------------------------------
    if (IS_PRODUCTION) {
        return;
    }

    // -------------------------------------------------------------------------
    // ШАГ 4. Сигнал для app-config.js: пропустить блокировку «нет @username».
    // app-config читает window.DEBUG_BYPASS_USERNAME_GATE === true (без тест-кода внутри себя).
    // На проде этот флаг никогда не выставляется, потому что скрипт уже завершился выше.
    // -------------------------------------------------------------------------
    window.DEBUG_BYPASS_USERNAME_GATE = true;

    // -------------------------------------------------------------------------
    // ШАГ 4b. Локальный API для mock-режима.
    // app-config.js по умолчанию шлёт запросы на прод Render (devtest-backend.onrender.com).
    // Локальный uvicorn с ALLOW_MOCK_AUTH=True иначе никогда не получит эти запросы → 401 на проде.
    // Приоритет: window.__API_BASE__ (уже задан) → ?api_base= → localStorage → 127.0.0.1:8000/api
    // -------------------------------------------------------------------------
    function resolveMockApiBase() {
        if (window.__API_BASE__) {
            return String(window.__API_BASE__).trim().replace(/\/+$/, '');
        }
        try {
            var params = new URLSearchParams(window.location.search || '');
            var fromQuery = params.get('api_base') || params.get('apiBase');
            if (fromQuery) {
                return String(fromQuery).trim().replace(/\/+$/, '');
            }
        } catch (queryErr) { /* ignore */ }
        try {
            var fromStorage = localStorage.getItem('devtest_api_base');
            if (fromStorage) {
                return String(fromStorage).trim().replace(/\/+$/, '');
            }
        } catch (storageErr) { /* ignore */ }
        var mockPort = Number(window.__MOCK_API_PORT__ || 8000);
        if (!mockPort || mockPort <= 0) {
            mockPort = 8000;
        }
        return 'http://127.0.0.1:' + String(mockPort) + '/api';
    }

    if (!window.__API_BASE__) {
        window.__API_BASE__ = resolveMockApiBase();
    }

    // -------------------------------------------------------------------------
    // ШАГ 5. Константы мок-пользователя (единый профиль для ИИ-агентов и QA).
    // id: 999999999 — заведомо «тестовый» ID, не пересекается с реальными юзерами.
    // -------------------------------------------------------------------------
    var MOCK_USER_ID = 999999999;
    var MOCK_FIRST_NAME = 'AI Agent';
    var MOCK_USERNAME = 'ai_agent_tester';
    var MOCK_LANGUAGE_CODE = 'en';

    // -------------------------------------------------------------------------
    // ШАГ 6. Объект user в формате Telegram WebApp initDataUnsafe.user.
    // Структура совпадает с тем, что отдаёт настоящий Telegram Mini App SDK.
    // -------------------------------------------------------------------------
    var mockUser = {
        id: MOCK_USER_ID,
        first_name: MOCK_FIRST_NAME,
        username: MOCK_USERNAME,
        language_code: MOCK_LANGUAGE_CODE,
        is_bot: false,
        allows_write_to_pm: true
    };

    // -------------------------------------------------------------------------
    // ШАГ 7. Сырые initData — query-string для API, которые шлют tg.initData на бэкенд.
    // Формат: user=<urlencoded JSON>&auth_date=<unix>&hash=<подпись>
    // hash здесь — заглушка; на проде бэкенд проверяет HMAC по BOT_TOKEN.
    // На тестовом стенде нужен отдельный bypass или тестовый бэкенд — иначе 401 invalid_init_data.
    // Строка не пустая, чтобы фронт не падал на «init_data required» до ответа сервера.
    // -------------------------------------------------------------------------
    var authDate = Math.floor(Date.now() / 1000);
    var userJson = JSON.stringify(mockUser);
    var mockInitDataRaw = 'user=' + encodeURIComponent(userJson)
        + '&auth_date=' + String(authDate)
        + '&hash=mock_dev_only_not_for_production';

    // -------------------------------------------------------------------------
    // ШАГ 8. Разбор initDataUnsafe — объект, который читает app-config.js (userId, username, язык).
    // -------------------------------------------------------------------------
    var mockInitDataUnsafe = {
        user: mockUser,
        auth_date: authDate,
        hash: 'mock_dev_only_not_for_production',
        query_id: 'mock_query_id_dev',
        start_param: ''
    };

    // -------------------------------------------------------------------------
    // ШАГ 9. Гарантируем наличие глобального namespace Telegram.
    // Официальный telegram-web-app.js обычно уже создал window.Telegram до нас;
    // если скрипт грузится без SDK — создаём пустую оболочку, чтобы не было TypeError.
    // -------------------------------------------------------------------------
    if (!window.Telegram) {
        window.Telegram = {};
    }

    // -------------------------------------------------------------------------
    // ШАГ 10. Берём существующий WebApp от SDK или создаём заглушку.
    // Не затираем методы SDK (expand, ready, BackButton) — только дополняем данные авторизации.
    // -------------------------------------------------------------------------
    var webApp = window.Telegram.WebApp || {};

    // -------------------------------------------------------------------------
    // ШАГ 11. Инжект мок-данных в WebApp.
    // initDataUnsafe — для чтения профиля на фронте.
    // initData — для POST/GET с init_data на бэкенд.
    // -------------------------------------------------------------------------
    webApp.initDataUnsafe = mockInitDataUnsafe;
    webApp.initData = mockInitDataRaw;

    // -------------------------------------------------------------------------
    // ШАГ 12. Минимальные no-op заглушки, если SDK не подгрузился (чистый браузер).
    // app-config.js вызывает expand() и ready() при старте — без них будет исключение.
    // -------------------------------------------------------------------------
    if (typeof webApp.expand !== 'function') {
        webApp.expand = function noopExpand() {};
    }
    if (typeof webApp.ready !== 'function') {
        webApp.ready = function noopReady() {};
    }
    if (!webApp.BackButton) {
        webApp.BackButton = {
            isVisible: false,
            show: function noopShow() { this.isVisible = true; },
            hide: function noopHide() { this.isVisible = false; },
            onClick: function noopOnClick() {},
            offClick: function noopOffClick() {}
        };
    }
    if (typeof webApp.close !== 'function') {
        webApp.close = function noopClose() {};
    }
    if (typeof webApp.openTelegramLink !== 'function') {
        webApp.openTelegramLink = function noopOpenLink(url) {
            try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (e) { /* ignore */ }
        };
    }

    // -------------------------------------------------------------------------
    // ШАГ 13. Публикуем WebApp обратно в глобальный объект Telegram.
    // -------------------------------------------------------------------------
    window.Telegram.WebApp = webApp;

    // -------------------------------------------------------------------------
    // ШАГ 14. Маркер для отладки в DevTools (не влияет на бизнес-логику).
    // -------------------------------------------------------------------------
    window.__TELEGRAM_MOCK_ACTIVE__ = true;
    window.__TELEGRAM_MOCK_USER__ = {
        id: MOCK_USER_ID,
        username: MOCK_USERNAME,
        first_name: MOCK_FIRST_NAME
    };

    // -------------------------------------------------------------------------
    // ШАГ 15. Лог только вне продакшна — видно, что мок включился и с каким профилем.
    // -------------------------------------------------------------------------
    if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info(
            '[telegram-mock] Active on host "%s". Mock user: @%s (id=%s). API_BASE=%s',
            hostname,
            MOCK_USERNAME,
            MOCK_USER_ID,
            window.__API_BASE__ || '(not set)'
        );
        console.info(
            '[telegram-mock] initData preview: %s',
            (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData)
                ? String(window.Telegram.WebApp.initData).slice(0, 120) + '...'
                : '(empty)'
        );
    }
})();