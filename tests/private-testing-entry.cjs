const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const tokens = ['guaranteed_test', 'guaranteed-test', 'guaranteed_pass', 'guaranteed-pass', 'closed_test_help', 'guaranteed', 'order_gt'];
const playLink = pkg => 'https://play.google.com/apps/testing/' + pkg;

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    let checks = 0;
    const failures = [];
    async function fixture(language, options = {}) {
        const page = await browser.newPage({ viewport: { width: language === 'ru' ? 360 : 390, height: 844 }, isMobile: true, hasTouch: true });
        const state = { orders: options.orders || [], reads: 0, cancels: [], errors: [], cancelOk: true };
        page.on('pageerror', error => state.errors.push(error.message));
        await page.addInitScript(({ language, sdk }) => {
            window.__API_BASE__ = 'http://fixture.local/api';
            window.Telegram = { WebApp: {
                // Hold normal bootstrap at the username gate: the test resumes
                // its real initial-route handler after the user enters the wizard.
                initDataUnsafe: { user: { id: 880, language_code: language }, start_param: sdk || '' }, initData: 'fixture',
                themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
            } };
        }, { language, sdk: options.sdk });
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith('/guaranteed-test-orders/mine')) {
                state.reads++;
                return route.fulfill({ json: { status: 'success', orders: state.orders } });
            }
            if (/\/guaranteed-test-orders\/\d+\/cancel$/.test(url.pathname)) {
                state.cancels.push(url.pathname);
                return route.fulfill({ status: state.cancelOk ? 200 : 503, json: { status: state.cancelOk ? 'success' : 'error' } });
            }
            if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', enabled: false, events: [] } });
            if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
            assert(file.startsWith(root + path.sep), file);
            if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        await page.goto('http://fixture.local/' + (options.route || ''), { waitUntil: 'load' });
        await page.evaluate(language => {
            lang = language; updateTranslations(language);
            document.body.classList.remove('no-username-blocked');
            document.getElementById('no-username-overlay').classList.remove('active');
        }, language);
        return { page, state };
    }
    async function scenario(name, run) {
        try { await run(); checks++; }
        catch (error) { failures.push(name + ': ' + error.message); }
    }
    async function gateFixture(language, draft, order) {
        const fixtureResult = await fixture(language, { orders: [Object.assign({ id: 77, user_id: 880, status: 'awaiting_payment' }, order)] });
        await fixtureResult.page.evaluate(draft => {
            localStorage.setItem('dt_gt_wizard_draft', JSON.stringify(Object.assign({ actor_id: 880, step: 2, timestamp: Date.now() }, draft)));
            showGuaranteedTestOfferModal();
        }, draft);
        await fixtureResult.page.locator('#gto-cta-btn').click();
        await fixtureResult.page.locator('[data-gate-key="order-77"]').waitFor({ state: 'visible' });
        return fixtureResult;
    }
    try {
        for (const language of ['ru', 'en']) {
            for (const [index, token] of tokens.entries()) {
                await scenario(language + ' late bootstrap ' + token, async () => {
                    const { page, state } = await fixture(language, index % 2 ? { sdk: token } : { route: '?startapp=' + token });
                    try {
                        assert(await page.locator('#guaranteed-test-offer-overlay').isVisible());
                        await page.locator('#gto-cta-btn').click();
                        await page.locator('#gtw-app-name-input').fill('Draft survives bootstrap');
                        await page.evaluate(() => _handleInitialRoute());
                        assert.equal(await page.locator('#guaranteed-test-offer-overlay').isVisible(), false, 'The delayed bootstrap must not cover the wizard');
                        assert.equal(await page.locator('#gtw-app-name-input').inputValue(), 'Draft survives bootstrap');
                        // Deduplication applies only to automatic entry, not Back or explicit reopening.
                        await page.locator('#gtw-step1-back-btn').click();
                        assert(await page.locator('#guaranteed-test-offer-overlay').isVisible());
                        await page.locator('#gto-close-btn').click();
                        await page.evaluate(() => showGuaranteedTestOfferModal());
                        assert(await page.locator('#guaranteed-test-offer-overlay').isVisible());
                        assert.deepEqual(state.errors, []);
                    } finally { await page.close(); }
                });
            }

            await scenario(language + ' dismissed offer stays dismissed', async () => {
                const { page } = await fixture(language, { route: '?dtview=guaranteed_test' });
                try {
                    await page.locator('#gto-close-btn').click();
                    await page.evaluate(() => _handleInitialRoute());
                    assert.equal(await page.locator('#guaranteed-test-offer-overlay').isVisible(), false);
                } finally { await page.close(); }
            });

            await scenario(language + ' simultaneous waiters open only once', async () => {
                const { page } = await fixture(language);
                try {
                    const opens = await page.evaluate(async () => {
                        const show = window.showGuaranteedTestOfferModal;
                        let opens = 0;
                        window.showGuaranteedTestOfferModal = undefined;
                        _openGuaranteedTestOfferWhenReady(20, 10);
                        _openGuaranteedTestOfferWhenReady(20, 10);
                        await new Promise(resolve => setTimeout(resolve, 20));
                        window.showGuaranteedTestOfferModal = () => { opens++; show(); };
                        await new Promise(resolve => setTimeout(resolve, 80));
                        return opens;
                    });
                    assert.equal(opens, 1);
                    assert(await page.locator('#guaranteed-test-offer-overlay').isVisible());
                } finally { await page.close(); }
            });

            await scenario(language + ' route aliases and transports', async () => {
                const { page } = await fixture(language);
                try {
                    const results = await page.evaluate(tokens => {
                        const results = [];
                        for (const token of tokens) for (const source of ['startapp', 'dtview', 'tgWebAppStartParam', 'start_param', 'hash', 'sdk', 'route', 'tab']) {
                            Telegram.WebApp.initDataUnsafe.start_param = '';
                            history.replaceState({}, '', source === 'hash' ? '/#tgWebAppStartParam=' + token : source === 'sdk' ? '/' : '/?' + source + '=' + token);
                            if (source === 'sdk') Telegram.WebApp.initDataUnsafe.start_param = token;
                            const route = _parseInitialRouteTarget();
                            results.push({ token, source, ok: !!(route && route.openGuaranteedTest) });
                        }
                        return results;
                    }, tokens);
                    results.forEach(result => { assert(result.ok, JSON.stringify(result)); checks++; });
                } finally { await page.close(); }
            });

            const identityCases = [
                { name: 'same name different package', draft: { app_name: 'Same Name', testing_link: playLink('com.example.one') }, order: { app_name: 'Same Name', testing_link: playLink('com.example.onetest') }, separate: true },
                { name: 'same name no identity', draft: { app_name: 'Same Name' }, order: { app_name: 'Same Name' }, separate: true },
                { name: 'package case matters', draft: { app_name: 'Same Name', testing_link: playLink('com.example.One') }, order: { app_name: 'Same Name', testing_link: playLink('com.example.one') }, separate: true },
                { name: 'host suffix is not Play', draft: { app_name: 'Same Name', testing_link: playLink('com.example.one').replace('play.google.com', 'play.google.com.evil.test') }, order: { app_name: 'Same Name', testing_link: playLink('com.example.one') }, separate: true },
                { name: 'same package renamed app', draft: { app_name: 'Old Name', testing_link: 'https://play.google.com/store/apps/details?hl=en&id=com.example.one' }, order: { app_name: 'New Name', testing_link: playLink('com.example.one') + '/?hl=ru#android' }, separate: false },
                { name: 'legacy package in notes', draft: { app_name: 'Old Name', testing_link: playLink('com.example.one') }, order: { app_name: 'New Name', notes: 'package=com.example.one' }, separate: false },
                { name: 'exact linked order without package', draft: { app_name: 'Old Name', fiat_order_id: 77 }, order: { app_name: 'New Name' }, separate: false },
                { name: 'changed package overrides stale order ID', draft: { app_name: 'Same Name', fiat_order_id: 77, testing_link: playLink('com.example.one') }, order: { app_name: 'Same Name', testing_link: playLink('com.example.two') }, separate: true },
                { name: 'different explicit order ID', draft: { app_name: 'Same Name', fiat_order_id: 78, testing_link: playLink('com.example.one') }, order: { app_name: 'Same Name', testing_link: playLink('com.example.one') }, separate: true },
            ];
            for (const item of identityCases) {
                await scenario(language + ' ' + item.name, async () => {
                    const { page, state } = await gateFixture(language, Object.assign({ payment_screenshot_url: '/telegram-media/saved-receipt' }, item.draft), item.order);
                    try {
                        assert.equal(await page.locator('[data-gate-key="draft"]').count(), item.separate ? 1 : 0);
                        await page.locator('[data-gate-key="order-77"] [data-action="delete"]').click();
                        await page.waitForFunction(() => !document.querySelector('[data-gate-key="order-77"]'));
                        const saved = await page.evaluate(() => getGuaranteedTestWizardDraft());
                        if (item.separate) {
                            assert.equal(saved.app_name, item.draft.app_name);
                            assert.equal(saved.testing_link, item.draft.testing_link);
                            assert.equal(saved.payment_screenshot_url, '/telegram-media/saved-receipt');
                            assert(await page.locator('[data-gate-key="draft"]').isVisible());
                            await page.locator('[data-gate-key="draft"] [data-action="continue"]').click();
                            assert(await page.locator('#guaranteed-test-wizard-step2-overlay').isVisible());
                            assert.equal(await page.evaluate(() => gtwWizardState.testingLink), item.draft.testing_link || '');
                        } else { assert.equal(saved, null); }
                        assert.equal(state.cancels.length, 1);
                        assert.deepEqual(state.errors, []);
                    } finally { await page.close(); }
                });
            }

            await scenario(language + ' failed cancellation preserves draft', async () => {
                const { page, state } = await gateFixture(language, { app_name: 'Same Name', testing_link: playLink('com.example.one') }, { app_name: 'Same Name', testing_link: playLink('com.example.two') });
                try {
                    state.cancelOk = false;
                    await page.locator('[data-gate-key="order-77"] [data-action="delete"]').click();
                    await page.waitForFunction(() => !document.querySelector('[data-gate-key="order-77"] [data-action="delete"]').disabled);
                    assert.equal(await page.locator('.gtw-start-gate-item').count(), 2);
                    assert.equal((await page.evaluate(() => getGuaranteedTestWizardDraft())).testing_link, playLink('com.example.one'));
                } finally { await page.close(); }
            });
        }
        assert.deepEqual(failures, [], failures.join('\n'));
        console.log(`Private Testing entry: ${checks} checks passed (RU/EN, aliases, delayed bootstrap, explicit reopen, exact draft identity, safe cancellation and resume).`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
