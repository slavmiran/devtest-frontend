/* Full-height Google Play passport. GET reads the cache; only POST scrapes. */
(function () {
    'use strict';
    var current = null, timer = null, savedOverflow = '', previousFocus = null;
    var cache = new Map(), syncing = new Set(), versions = new Map();
    var copy = {
        ru: {
            title: 'Паспорт Google Play', details: 'Подробнее', balance: 'Баланс', day: 'день',
            refresh: 'Обновить данные', obtain: 'Получить данные', loading: 'Загрузка…', updating: 'Обновляем…',
            cooldown: 'Обновление через {h}ч {m}м', busy: 'Данные обновляются. Повторная проверка через {h}ч {m}м',
            empty: 'Данные ещё не загружены, нажмите «Получить данные».', error: 'Не удалось загрузить данные. Попробуйте ещё раз.',
            marketError: 'Google Play временно недоступен. Сохранённые данные не изменены.',
            missing: 'Приложение не найдено в Google Play для региона Россия.', unknown: 'Не указано в Google Play',
            developer: 'Разработчик', app: 'Открыть в Google Play', reviews: 'отзывов', ratings: 'оценок', installs: 'скачиваний',
            size: 'Размер', android: 'Мин. Android', age: 'Возрастной рейтинг', summary: 'Краткое описание',
            screenshots: 'Скриншоты', screenshot: 'Скриншот', description: 'О приложении', more: 'Развернуть полностью', less: 'Свернуть',
            updates: 'Версия и обновления', version: 'Версия', updated: 'Обновлено', released: 'Дата релиза', news: 'Что нового',
            monetization: 'Монетизация', ads: 'Содержит рекламу', noAds: 'Без рекламы', iap: 'Встроенные покупки',
            noIap: 'Нет встроенных покупок', price: 'Стоимость установки', free: 'Бесплатно',
            safety: 'Безопасность данных', collected: 'Собираемые данные', shared: 'Передаваемые данные',
            noCollected: 'Разработчик заявил, что данные не собираются.', noShared: 'Разработчик заявил, что данные не передаются.',
            safetyMissing: 'Сведения о безопасности данных недоступны.', privacy: 'Политика конфиденциальности',
            safetyTip: '1. Чем меньше запросов, тем лучше продвижение!\n2. Раздел потребуется обновить, если вы измените порядок обработки пользовательских данных в приложении. Информация, предоставленная в форме «Безопасность данных», всегда должна быть полной и достоверной.',
            saved: 'Данные обновлены', close: 'Назад', retry: 'Повторить загрузку',
        },
        en: {
            title: 'Google Play passport', details: 'Details', balance: 'Balance', day: 'day',
            refresh: 'Refresh data', obtain: 'Get data', loading: 'Loading…', updating: 'Updating…',
            cooldown: 'Refresh in {h}h {m}m', busy: 'Updating data. Check again in {h}h {m}m',
            empty: 'No data yet. Press “Get data”.', error: 'Could not load data. Please try again.',
            marketError: 'Google Play is temporarily unavailable. Saved data has been preserved.',
            missing: 'The app was not found on Google Play in Russia.', unknown: 'Not provided by Google Play',
            developer: 'Developer', app: 'Open in Google Play', reviews: 'reviews', ratings: 'ratings', installs: 'downloads',
            size: 'Size', android: 'Min. Android', age: 'Age rating', summary: 'Summary',
            screenshots: 'Screenshots', screenshot: 'Screenshot', description: 'About this app', more: 'Read more', less: 'Show less',
            updates: 'Version and updates', version: 'Version', updated: 'Updated', released: 'Released', news: 'What’s new',
            monetization: 'Monetization', ads: 'Contains ads', noAds: 'No ads', iap: 'In-app purchases',
            noIap: 'No in-app purchases', price: 'Installation price', free: 'Free',
            safety: 'Data safety', collected: 'Collected data', shared: 'Shared data',
            noCollected: 'The developer declares that no data is collected.', noShared: 'The developer declares that no data is shared.',
            safetyMissing: 'Data safety information is unavailable.', privacy: 'Privacy policy',
            safetyTip: '1. Fewer data requests help promotion!\n2. Update this section whenever you change how your app handles user data. Information in the Data safety form must always be complete and accurate.',
            saved: 'Data updated', close: 'Back', retry: 'Retry loading',
        },
    };
    function text(key) { return copy[window.lang === 'ru' ? 'ru' : 'en'][key]; }
    function esc(value) { return window.escapeHTML(String(value == null ? '' : value)); }
    function value(item) { return item == null || item === '' ? text('unknown') : String(item); }
    function number(item) { return item == null ? text('unknown') : Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US'); }
    function compact(item) {
        return Number(item).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { notation: 'compact', maximumSignificantDigits: 3 });
    }
    function available(item) {
        return item != null && String(item).trim() !== '' && !/^(varies with device|зависит от устройства|не указано.*|not provided.*)$/i.test(String(item).trim());
    }
    function metric(kind, item, label, tooltip) {
        return '<div class="play-passport-metric" data-metric="' + kind + '"' + (tooltip ? ' title="' + esc(tooltip) + '"' : '') + '><strong>' + item + '</strong><span>' + esc(label) + '</span></div>';
    }
    function amount(item) { return Math.max(0, Number(item) || 0).toLocaleString(window.lang === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: 2 }); }
    function safeUrl(raw, kind) {
        try {
            var url = new URL(raw);
            if (url.protocol !== 'https:') return '';
            if (kind === 'market' && url.hostname !== 'play.google.com') return '';
            if (kind === 'image' && !(url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com'))) return '';
            return url.href;
        } catch (_) { return ''; }
    }
    function link(raw, label, kind) {
        var url = safeUrl(raw, kind);
        return url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(label) + ' ↗</a>' : '';
    }
    function date(raw) {
        if (!raw) return text('unknown');
        var parsed = new Date(typeof raw === 'number' ? raw * 1000 : raw);
        return isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString(window.lang === 'ru' ? 'ru-RU' : 'en-US');
    }
    function getProject(id) {
        return (window.myProjects || []).concat(window.archivedProjects || []).find(function (p) { return Number(p.id || p.app_id) === id; }) || {};
    }
    function initialData(project) {
        var at = Date.parse(project.play_store_synced_at || '');
        return {
            play_store_raw: project.play_store_raw || null,
            play_store_synced_at: project.play_store_synced_at || null,
            retry_after_seconds: isNaN(at) ? 0 : Math.max(0, Math.ceil((at + 72 * 3600000 - Date.now()) / 1000)),
            sync_retry_after_seconds: 0,
        };
    }
    function remember(id, data) {
        var entry = Object.assign({}, data, { receivedAt: Date.now() });
        cache.set(id, entry);
        (window.myProjects || []).concat(window.archivedProjects || []).forEach(function (p) {
            if (Number(p.id || p.app_id) === id) {
                p.play_store_raw = data.play_store_raw;
                p.play_store_synced_at = data.play_store_synced_at;
            }
        });
        return entry;
    }
    function remaining(entry, key) {
        return Math.max(0, Math.ceil(Number(entry[key] || 0) - (Date.now() - entry.receivedAt) / 1000));
    }
    function updateControls() {
        if (!current) return;
        var button = document.getElementById('play-passport-refresh');
        var hint = document.getElementById('play-passport-timer');
        var entry = current.data, cooldown = remaining(entry, 'retry_after_seconds');
        var lease = remaining(entry, 'sync_retry_after_seconds'), busy = syncing.has(current.id);
        button.disabled = current.loading || busy || cooldown > 0 || lease > 0;
        button.setAttribute('aria-busy', String(busy || current.loading));
        var label = busy ? text('updating') : current.loading ? text('loading') : text(entry.play_store_raw ? 'refresh' : 'obtain');
        button.setAttribute('aria-label', label); button.title = label;
        button.textContent = busy || current.loading ? '…' : '↻';
        var seconds = cooldown || lease, minutes = Math.ceil(seconds / 60);
        var fullHint = seconds ? text(cooldown ? 'cooldown' : 'busy').replace('{h}', Math.floor(minutes / 60)).replace('{m}', minutes % 60) : '';
        hint.textContent = seconds ? Math.floor(minutes / 60) + (window.lang === 'ru' ? 'ч ' : 'h ') + minutes % 60 + (window.lang === 'ru' ? 'м' : 'm') : '';
        hint.title = fullHint; hint.setAttribute('aria-label', fullHint);
        hint.hidden = !seconds;
        if (!lease && Number(entry.sync_retry_after_seconds) > 0 && !busy && !current.loading) {
            // Another worker may have finished. Read its snapshot when the
            // lease expires instead of leaving this screen on an old cache.
            entry.sync_retry_after_seconds = 0;
            readCache(current);
        }
    }
    function section(title, body, modifier) { return '<section class="play-passport-section ' + (modifier || '') + '"><h2>' + esc(title) + '</h2>' + body + '</section>'; }
    function row(title, item) { return '<div class="play-passport-row"><span>' + esc(title) + '</span><strong>' + esc(value(item)) + '</strong></div>'; }
    function safetyEntries(entries, empty) {
        if (!Array.isArray(entries)) return '<p class="play-passport-muted">' + esc(text('safetyMissing')) + '</p>';
        if (!entries.length) return '<p class="play-passport-muted">' + esc(text(empty)) + '</p>';
        var groups = new Map();
        entries.forEach(function (entry) {
            var type = String(entry.type || entry.data || text('unknown'));
            if (!groups.has(type)) groups.set(type, []);
            if (entry.data && entry.data !== type) groups.get(type).push(entry.data);
        });
        return '<ul class="play-passport-safety-list">' + Array.from(groups, function (pair) {
            return '<li><strong>' + esc(pair[0]) + '</strong>' + (pair[1].length ? '<span>' + esc(Array.from(new Set(pair[1])).join(', ')) + '</span>' : '') + '</li>';
        }).join('') + '</ul>';
    }
    function renderContent() {
        if (!current) return;
        var node = document.getElementById('play-passport-content'), data = current.data.play_store_raw;
        if (!data) {
            node.innerHTML = '<div class="play-passport-empty"><span aria-hidden="true">📄</span><h2>' + esc(current.project.name || text('title')) + '</h2><p>' + esc(current.loading ? text('loading') : text('empty')) + '</p></div>';
            return;
        }
        var categories = [data.genre].concat((data.categories || []).map(function (c) { return c.name; })).filter(Boolean);
        var icon = safeUrl(data.icon, 'image') || safeUrl(current.project.icon_url);
        var images = (data.screenshots || []).map(function (url, i) {
            url = safeUrl(url, 'image');
            return url ? '<img src="' + esc(url) + '" loading="lazy" decoding="async" alt="' + esc(text('screenshot')) + ' ' + (i + 1) + '">' : '';
        }).join('');
        var appUrl = data.url || ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(current.project.package_name || current.project.package || data.appId || ''));
        var safety = data.data_safety;
        var safetyBody = '<details class="play-passport-info"><summary aria-label="' + esc(text('safety')) + '">ⓘ</summary><p>' + esc(text('safetyTip')) + '</p></details>';
        if (safety) {
            safetyBody += '<h3>' + esc(text('collected')) + '</h3>' + safetyEntries(safety.collectedData, 'noCollected') +
                '<h3>' + esc(text('shared')) + '</h3>' + safetyEntries(safety.sharedData, 'noShared');
            (safety.securityPractices || []).forEach(function (p) {
                safetyBody += '<p><strong>' + esc(p.practice || '') + '</strong><br>' + esc(p.description || '') + '</p>';
            });
            safetyBody += link(safety.privacyPolicyUrl || data.privacyPolicy, text('privacy'));
        } else safetyBody += '<p>' + esc(text('safetyMissing')) + '</p>';
        var ads = typeof data.containsAds === 'boolean' ? data.containsAds : data.adSupported;
        var price = data.free === true || data.price === 0 ? text('free') : data.price != null ? [data.price, data.currency].filter(Boolean).join(' ') : null;
        var iap = data.offersIAP === false ? text('noIap') : data.inAppProductPrice || (data.offersIAP === true ? text('iap') : null);
        var ratingCount = data.ratings != null ? data.ratings : data.reviews;
        var ratingLabel = text(data.ratings != null ? 'ratings' : 'reviews');
        var score = data.scoreText || (data.score != null ? Number(data.score).toFixed(1) : null);
        var locale = data.storeLocale && data.storeLocale.country || 'ru';
        var metrics = available(score) ? metric('rating', esc(score) + ' <span class="play-passport-star" aria-hidden="true">★</span>',
            ratingCount != null ? compact(ratingCount) + ' ' + ratingLabel : ratingLabel,
            (ratingCount != null ? number(ratingCount) + ' ' + ratingLabel + ' · ' : '') + 'Google Play · ' + String(locale).toUpperCase()) : '';
        var installs = data.minInstalls != null ? compact(data.minInstalls) + '+' : data.installs;
        if (available(installs)) metrics += metric('installs', esc(installs), text('installs'));
        if (available(data.size)) metrics += metric('size', esc(data.size), text('size'));
        if (available(data.contentRating)) metrics += metric('age', '<span class="play-passport-age">' + esc(data.contentRating) + '</span>', text('age'));
        node.innerHTML = '<div class="play-passport-hero">' +
            (icon ? '<img class="play-passport-icon" src="' + esc(icon) + '" alt="">' : '<div class="play-passport-icon play-passport-icon-fallback">📱</div>') +
            '<div><h1 class="notranslate">' + esc(data.title || current.project.name) + '</h1><p class="play-passport-muted">' + esc(Array.from(new Set(categories)).join(' · ') || text('unknown')) + '</p>' +
            link(data.developerUrl, data.developer || text('developer'), 'market') + '</div></div>' +
            '<div class="play-passport-metrics" tabindex="0" aria-label="Google Play">' + metrics + '</div>' +
            '<div class="play-passport-links">' + link(appUrl, text('app'), 'market') + '</div>' +
            section(text('summary'), '<p>' + esc(value(data.summary)) + '</p>') +
            section(text('screenshots'), images ? '<div class="play-passport-carousel" tabindex="0" aria-label="' + esc(text('screenshots')) + '">' + images + '</div>' : '<p class="play-passport-muted">' + esc(text('unknown')) + '</p>') +
            section(text('description'), '<p id="play-passport-description" class="play-passport-description is-collapsed">' + esc(value(data.description)) + '</p>' + (data.description ? '<button type="button" id="play-passport-expand" class="play-passport-text-button" aria-expanded="false">' + esc(text('more')) + '</button>' : '')) +
            section(text('updates'), row(text('version'), data.version) + row(text('updated'), date(data.updated || data.lastUpdatedOn)) + row(text('released'), date(data.released)) +
                (available(data.androidVersionText) ? row(text('android'), data.androidVersionText) : '') + '<h3>' + esc(text('news')) + '</h3><p>' + esc(value(data.recentChangesText || data.recentChanges)) + '</p>') +
            section(text('monetization'), '<p>' + esc(typeof ads === 'boolean' ? text(ads ? 'ads' : 'noAds') : text('unknown')) + '</p>' + row(text('iap'), iap) + row(text('price'), price)) +
            section(text('safety'), safetyBody, 'play-passport-section--safety') +
            '<p class="play-passport-footnote">' + esc(text('saved')) + ': ' + esc(date(current.data.play_store_synced_at)) + '</p>';
        var expand = document.getElementById('play-passport-expand');
        if (expand) expand.onclick = function () {
            var collapsed = document.getElementById('play-passport-description').classList.toggle('is-collapsed');
            expand.textContent = text(collapsed ? 'more' : 'less');
            expand.setAttribute('aria-expanded', String(!collapsed));
        };
    }
    function showError(key, retry) {
        var node = document.getElementById('play-passport-error');
        node.textContent = text(key); node.hidden = false;
        var button = document.getElementById('play-passport-retry');
        button.hidden = !retry;
    }
    function endpoint(id, suffix) { return String(window.API_BASE || '/api').replace(/\/$/, '') + '/apps/' + id + '/' + suffix; }
    async function readCache(state) {
        state.loading = true; updateControls();
        var version = versions.get(state.id) || 0;
        try {
            var response = await fetch(endpoint(state.id, 'play-store-data') + '?init_data=' + encodeURIComponent(window.getTelegramInitDataRaw()), { cache: 'no-store' });
            var data = await response.json();
            if (!response.ok) throw new Error('HTTP ' + response.status);
            if (version === (versions.get(state.id) || 0)) state.data = remember(state.id, data);
            if (current === state) { renderContent(); document.getElementById('play-passport-error').hidden = true; }
        } catch (_) {
            if (current === state) showError('error', true);
        } finally {
            state.loading = false;
            if (current === state) { renderContent(); updateControls(); }
        }
    }
    async function sync() {
        if (!current || document.getElementById('play-passport-refresh').disabled) return;
        var id = current.id;
        syncing.add(id); updateControls(); document.getElementById('play-passport-error').hidden = true;
        try {
            var response = await fetch(endpoint(id, 'sync-play-store'), {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ init_data: window.getTelegramInitDataRaw() }),
            });
            var data = await response.json();
            if (response.status === 429) {
                var entry = cache.get(id) || initialData(getProject(id));
                var field = data.error === 'sync_in_progress' ? 'sync_retry_after_seconds' : 'retry_after_seconds';
                entry = Object.assign({}, entry, {
                    retry_after_seconds: remaining(entry, 'retry_after_seconds'),
                    sync_retry_after_seconds: remaining(entry, 'sync_retry_after_seconds'),
                });
                entry[field] = Number(data.retry_after_seconds || 1); entry.receivedAt = Date.now();
                cache.set(id, entry);
            } else if (!response.ok) {
                if (current && current.id === id) showError(data.error === 'play_store_not_found' ? 'missing' : 'marketError', false);
                return;
            } else {
                remember(id, data);
                window.dispatchEvent(new CustomEvent('play-store:synced', { detail: { appId: id } }));
            }
            versions.set(id, (versions.get(id) || 0) + 1);
            if (current && current.id === id) { current.data = cache.get(id); renderContent(); }
        } catch (_) {
            if (current && current.id === id) showError('marketError', false);
        } finally {
            syncing.delete(id); updateControls();
        }
    }
    function close() {
        if (!current) return;
        document.getElementById('play-store-passport').remove();
        clearInterval(timer); timer = null; current = null;
        document.body.style.overflow = savedOverflow;
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
    }
    function open(id, event) {
        if (event) event.stopPropagation();
        if (current) close();
        id = Number(id); if (!id) return;
        previousFocus = document.activeElement;
        savedOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
        var project = getProject(id);
        if (cache.has(id) && (Date.parse(project.play_store_synced_at || '') || 0) > (Date.parse(cache.get(id).play_store_synced_at || '') || 0)) {
            remember(id, initialData(project));
        }
        var entry = cache.get(id) || remember(id, initialData(project));
        current = { id: id, project: project, data: entry, loading: true };
        var overlay = document.createElement('div');
        overlay.id = 'play-store-passport'; overlay.className = 'modal-overlay active';
        overlay.innerHTML = '<div class="play-passport-page" role="dialog" aria-modal="true" aria-labelledby="play-passport-title">' +
            '<header class="play-passport-topbar"><button type="button" id="play-passport-back" aria-label="' + esc(text('close')) + '">‹</button><strong id="play-passport-title">' + esc(text('title')) + '</strong>' +
            '<div class="play-passport-controls"><button type="button" id="play-passport-refresh"></button><span id="play-passport-timer" role="status"></span></div></header>' +
            '<div class="play-passport-scroll"><div class="play-passport-error" id="play-passport-error" role="alert" hidden></div><button type="button" id="play-passport-retry" hidden>' + esc(text('retry')) + '</button><main id="play-passport-content"></main></div></div>';
        document.body.appendChild(overlay);
        overlay.onclick = function (e) { if (e.target === overlay) close(); };
        document.getElementById('play-passport-back').onclick = close;
        document.getElementById('play-passport-refresh').onclick = sync;
        document.getElementById('play-passport-retry').onclick = function () { if (current) readCache(current); };
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
            if (e.key !== 'Tab') return;
            var focusables = Array.from(overlay.querySelectorAll('button:not(:disabled), a, summary, [tabindex="0"]')).filter(function (n) { return !n.hidden && n.getClientRects().length; });
            var first = focusables[0], last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
        renderContent(); updateControls(); document.getElementById('play-passport-back').focus();
        timer = setInterval(updateControls, 1000);
        readCache(current);
    }
    window.renderLiveProjectBalance = function (project) {
        return '<span class="live-project-balance">' + esc(text('balance')) + ': <strong>' + esc(amount(project.live_balance_bust)) + ' $BUST</strong><span> · ' + esc(amount(project.live_daily_burn_bust)) + ' $BUST/' + esc(text('day')) + '</span></span>';
    };
    window.renderPlayStoreDetailsButton = function (id) {
        return '<button type="button" class="live-project-details" onclick="openPlayStorePassport(' + Number(id) + ', event)">📄 ' + esc(text('details')) + ' ›</button>';
    };
    window.openPlayStorePassport = open;
    window.closePlayStorePassport = close;
})();
