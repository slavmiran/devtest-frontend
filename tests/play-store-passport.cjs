const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const artifacts = path.resolve(root, '../artifacts/play-store-passport');
fs.mkdirSync(artifacts, { recursive: true });

const raw = {
    title: 'Orbit Notes', appId: 'com.example.orbit', genre: 'Продуктивность',
    categories: [{ name: 'Заметки' }], scoreText: '4.8', ratings: 798958, reviews: 142, installs: '100 000+', minInstalls: 100000,
    icon: 'https://play-lh.googleusercontent.com/icon',
    developer: 'Orbit Studio', developerUrl: 'https://play.google.com/store/apps/dev?id=12345',
    url: 'https://play.google.com/store/apps/details?id=com.example.orbit',
    size: '24 МБ', androidVersionText: '8.0 и выше', contentRating: '3+',
    summary: 'Идеи, списки и заметки — всё под рукой.',
    description: 'Сохраняйте идеи, пока они свежие.\n\n' + 'Организуйте заметки и списки в одном месте. '.repeat(40) + '<img src=x onerror="window.injected=true">',
    screenshots: [1, 2, 3, 4].map(i => 'https://play-lh.googleusercontent.com/screen' + i),
    version: '2.4.1', updated: 1791417600, released: '2025-06-10', recentChangesText: 'Новые папки и поиск.\nИсправлена синхронизация.',
    containsAds: false, offersIAP: true, inAppProductPrice: '59 ₽ – 499 ₽', price: 0, free: true,
    data_safety: { collectedData: [{ type: 'Личная информация', data: 'Адрес электронной почты' }, { type: 'Действия в приложении', data: 'Взаимодействия с приложением' }],
        sharedData: [], securityPractices: [{ practice: 'Данные шифруются при передаче', description: 'Защищённое соединение' }], privacyPolicyUrl: 'https://example.com/privacy' },
};
const snapshot = { status: 'success', play_store_raw: raw, play_store_synced_at: new Date().toISOString(), retry_after_seconds: 259200, sync_retry_after_seconds: 0 };

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const language of ['ru', 'en']) {
            for (const width of [360, 390, 430]) {
                const page = await browser.newPage({ viewport: { width, height: 844 } });
                const errors = []; let gets = 0, posts = 0, mode = 'cached', hold = false, pendingGet, pendingPost;
                page.on('pageerror', e => errors.push(e.message));
                await page.route('http://fixture.local/**', async route => {
                    const url = route.request().url();
                    if (url.includes('play-store-data')) {
                        gets++;
                        assert.equal(new URL(url).searchParams.get('init_data'), 'signed-fixture');
                        if (hold) await new Promise(resolve => { pendingGet = resolve; });
                        if (mode === 'lease') {
                            mode = 'cached';
                            await route.fulfill({ json: { play_store_raw: null, retry_after_seconds: 0, sync_retry_after_seconds: 1 } });
                            return;
                        }
                        const data = mode === 'empty' ? { play_store_raw: null, play_store_synced_at: null, retry_after_seconds: 0 } : mode === 'expired' ? { ...snapshot, retry_after_seconds: 0 } : snapshot;
                        await route.fulfill({ json: data }); return;
                    }
                    if (url.includes('sync-play-store')) {
                        posts++;
                        assert.equal(route.request().method(), 'POST');
                        assert.equal(route.request().postDataJSON().init_data, 'signed-fixture');
                        if (mode === 'race') { await route.fulfill({ status: 429, json: { error: 'cooldown', retry_after_seconds: 2 } }); return; }
                        if (mode === 'fail') { await route.fulfill({ status: 502, json: { error: 'play_store_unavailable' } }); return; }
                        if (mode === 'slow') await new Promise(resolve => { pendingPost = resolve; });
                        await route.fulfill({ json: snapshot }); return;
                    }
                    await route.fulfill({ contentType: 'text/html', body: '<button id="opener">Open</button><section id="tab-projects" class="tab-content active"></section>' });
                });
                await page.route('https://play-lh.googleusercontent.com/**', route => route.fulfill({ contentType: 'image/svg+xml', body:
                    '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="320"><rect width="180" height="320" fill="#1b2440"/><rect x="15" y="45" width="150" height="50" rx="12" fill="#4c8dff"/><rect x="15" y="110" width="150" height="50" rx="12" fill="#283650"/><text x="20" y="30" fill="white" font-size="16">Orbit Notes</text></svg>' }));
                await page.goto('http://fixture.local/');
                for (const file of ['css/tokens.css', 'css/base.css', 'styles.css', 'css/play-store-passport.css']) await page.addStyleTag({ path: path.join(root, file) });
                for (const file of ['ui/ui-helpers.js', 'js/play-store-passport.js', 'js/app-navigation.js']) await page.addScriptTag({ path: path.join(root, file) });
                await page.evaluate(({ language, snapshot }) => {
                    window.lang = language; window.API_BASE = '/api'; window.getTelegramInitDataRaw = () => 'signed-fixture';
                    window.myProjects = [{ id: 42, name: 'Orbit Notes', package: 'com.example.orbit', live_balance_bust: 137.5,
                        protection_bust_pool: 999, ...snapshot }];
                    window.archivedProjects = [];
                    document.getElementById('opener').onclick = e => openPlayStorePassport(42, e);
                    document.getElementById('tab-projects').innerHTML = '<div class="card"><div class="card-header"><div class="card-info"><div class="card-title">Orbit Notes</div><div class="card-subtitle card-subtitle--live">' + renderLiveProjectBalance(myProjects[0]) + '</div></div><div class="project-header-actions project-header-actions--live"><button class="project-icon-btn">⚙</button>' + renderPlayStoreDetailsButton(42) + '</div></div></div>';
                }, { language, snapshot });
                assert.match(await page.locator('.live-project-balance').innerText(), /137[,.]5 \$BUST/);
                assert.doesNotMatch(await page.locator('.live-project-balance').innerText(), /999/);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
                // Cached passport is already visible while a GET is still waiting.
                hold = true;
                await page.click('#opener');
                await page.waitForFunction(() => document.querySelector('#play-passport-content h1')?.textContent === 'Orbit Notes');
                assert.equal(posts, 0);
                assert.equal(await page.locator('#play-passport-refresh').isDisabled(), true);
                await page.waitForFunction(() => document.querySelector('#play-passport-refresh').textContent.includes('…'));
                while (!pendingGet) await new Promise(resolve => setTimeout(resolve, 10));
                hold = false; pendingGet();
                await page.waitForFunction(() => !document.querySelector('#play-passport-refresh').textContent.includes('…'));
                assert.match(await page.locator('#play-passport-timer').innerText(), /72/);
                assert.match(await page.locator('#play-passport-timer').getAttribute('aria-label'), language === 'ru' ? /Обновление через/ : /Refresh in/);
                const header = await page.locator('.play-passport-topbar').boundingBox();
                assert.ok(header.height <= 60, 'Compact header must fit one row');
                for (const selector of ['#play-passport-title', '#play-passport-refresh', '#play-passport-timer']) {
                    const box = await page.locator(selector).boundingBox();
                    assert.ok(box.y >= header.y && box.y + box.height <= header.y + header.height);
                }
                assert.deepEqual(await page.locator('.play-passport-metric').evaluateAll(nodes => nodes.map(n => n.dataset.metric)), ['rating', 'installs', 'size', 'age']);
                assert.match(await page.locator('[data-metric="rating"]').innerText(), /799/);
                assert.doesNotMatch(await page.locator('[data-metric="rating"]').innerText(), /142/);
                assert.match(await page.locator('[data-metric="rating"]').getAttribute('title'), /798.*958/);
                if (width === 360) assert.equal(await page.locator('.play-passport-metrics').evaluate(n => n.scrollWidth > n.clientWidth), true);
                const bounds = await page.locator('.play-passport-page').boundingBox();
                assert.equal(bounds.y, 0); assert.equal(bounds.height, 844); assert.equal(bounds.width, width);
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
                assert.equal(await page.locator('.play-passport-carousel img').count(), 4);
                assert.equal(await page.locator('#play-passport-description img').count(), 0);
                assert.equal(await page.evaluate(() => window.injected), undefined);
                assert.equal(await page.locator('a[href^="https://play.google.com"]').count(), 2);
                await page.locator('#play-passport-expand').click();
                assert.equal(await page.locator('#play-passport-expand').getAttribute('aria-expanded'), 'true');
                await page.locator('#play-passport-expand').click();
                await page.locator('.play-passport-info summary').click();
                assert.equal(await page.locator('.play-passport-info').getAttribute('open'), '');
                await page.locator('.play-passport-info summary').click();
                await page.evaluate(() => document.querySelector('.play-passport-scroll').scrollTop = 0);
                await page.screenshot({ path: path.join(artifacts, 'passport-' + language + '-' + width + '.png') });
                await page.evaluate(() => handleAppBack());
                assert.equal(await page.locator('#play-store-passport').count(), 0);
                assert.equal(await page.evaluate(() => document.body.style.overflow), '');
                // Empty state and first successful fetch.
                mode = 'empty';
                await page.evaluate(() => { myProjects.push({ id: 43, name: 'New app' }); openPlayStorePassport(43); });
                await page.waitForFunction(() => !document.querySelector('#play-passport-refresh').disabled);
                assert.match(await page.locator('.play-passport-empty').innerText(), language === 'ru' ? /ещё не загружены/ : /No data yet/);
                await page.click('#play-passport-refresh');
                await page.waitForFunction(() => !!document.querySelector('#play-passport-content h1'));
                assert.equal(posts, 1);
                await page.evaluate(() => closePlayStorePassport());
                // Server 429 beats an apparently expired client cache.
                mode = 'expired'; await page.evaluate(() => openPlayStorePassport(42));
                await page.waitForFunction(() => !document.querySelector('#play-passport-refresh').disabled);
                mode = 'race'; await page.click('#play-passport-refresh');
                await page.waitForFunction(() => document.querySelector('#play-passport-timer').textContent !== '');
                assert.equal(await page.locator('#play-passport-refresh').isDisabled(), true);
                await page.waitForFunction(() => !document.querySelector('#play-passport-refresh').disabled);
                // Failure keeps all old content visible and retry available.
                mode = 'fail'; await page.click('#play-passport-refresh');
                await page.waitForFunction(() => !document.querySelector('#play-passport-error').hidden);
                assert.equal(await page.locator('#play-passport-content h1').innerText(), 'Orbit Notes');
                assert.equal(await page.locator('#play-passport-refresh').isDisabled(), false);
                // Closing/reopening during POST must not lose the result.
                mode = 'slow'; await page.click('#play-passport-refresh');
                while (!pendingPost) await new Promise(resolve => setTimeout(resolve, 10));
                await page.evaluate(() => closePlayStorePassport());
                mode = 'expired'; await page.evaluate(() => openPlayStorePassport(42));
                assert.equal(await page.locator('#play-passport-refresh').isDisabled(), true);
                pendingPost();
                await page.waitForFunction(() => document.querySelector('#play-passport-timer').textContent.includes('72'));
                await page.keyboard.press('Escape');
                assert.equal(await page.locator('#play-store-passport').count(), 0);
                // A sync in another worker is read from DB when its lease ends.
                const getsBeforeLease = gets, postsBeforeLease = posts;
                mode = 'lease';
                await page.evaluate(() => { myProjects.push({ id: 44, name: 'Other worker' }); openPlayStorePassport(44); });
                await page.waitForFunction(() => document.querySelector('#play-passport-timer').textContent !== '');
                await page.waitForFunction(() => document.querySelector('#play-passport-content h1')?.textContent === 'Orbit Notes');
                assert.equal(gets, getsBeforeLease + 2);
                assert.equal(posts, postsBeforeLease);
                await page.evaluate(() => closePlayStorePassport());
                // Missing size / Android are omitted; cached textual date remains usable.
                const sparseRaw = { ...raw, size: null, androidVersionText: 'Varies with device', updated: null, lastUpdatedOn: '22 июл. 2026 г.' };
                pendingGet = null; hold = true;
                await page.evaluate(sparseRaw => {
                    myProjects.push({ id: 45, name: 'Sparse app', play_store_raw: sparseRaw });
                    openPlayStorePassport(45);
                }, sparseRaw);
                assert.deepEqual(await page.locator('.play-passport-metric').evaluateAll(nodes => nodes.map(n => n.dataset.metric)), ['rating', 'installs', 'age']);
                assert.equal(await page.locator('.play-passport-row').filter({ hasText: language === 'ru' ? 'Мин. Android' : 'Min. Android' }).count(), 0);
                assert.match(await page.locator('.play-passport-row').filter({ hasText: language === 'ru' ? 'Обновлено' : 'Updated' }).innerText(), /22 июл. 2026/);
                while (!pendingGet) await new Promise(resolve => setTimeout(resolve, 10));
                hold = false; pendingGet(); pendingGet = null;
                await page.waitForFunction(() => !document.querySelector('#play-passport-refresh').textContent.includes('…'));
                await page.evaluate(() => closePlayStorePassport());
                assert.deepEqual(errors, []);
                assert.ok(gets >= 4);
                await page.close();
            }
        }
        console.log('Passport passed: RU/EN at 360/390/430px, instant cache, empty state, 429 countdown, errors, POST reopen, HTML escaping and Back.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
