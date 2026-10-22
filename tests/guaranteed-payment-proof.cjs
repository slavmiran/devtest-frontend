const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');

(async () => {
    const browser = await chromium.launch({headless: true, channel: 'chrome'});
    let scenarios = 0;
    async function fixture(language, method = 'crypto', options = {}) {
        const page = await browser.newPage({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
        const calls = {uploads: [], orders: [], proofs: [], errors: []};
        page.on('pageerror', error => calls.errors.push(error.message));
        await page.route('**/*', async route => {
            const request = route.request(), url = new URL(request.url());
            if (url.pathname === '/api/upload-icon') {
                calls.uploads.push(request.postDataBuffer());
                if (options.upload) return options.upload(route, calls.uploads.length);
                return route.fulfill({json: {status: 'success', url: '/telegram-media/receipt_' + calls.uploads.length}});
            }
            if (url.pathname === '/api/guaranteed-test-orders' && request.method() === 'POST') {
                calls.orders.push(request.postDataJSON());
                if (options.order) return options.order(route, calls.orders.length);
                return route.fulfill({json: {status: 'success', order: {id: 51, public_code: 'GT-51'}}});
            }
            if (/\/guaranteed-test-orders\/\d+\/attach-proof$/.test(url.pathname)) {
                calls.proofs.push({url: url.pathname, body: request.postDataJSON()});
                if (options.attach) return options.attach(route, calls.proofs.length);
                return route.fulfill({json: {status: 'success', order: {id: 51, public_code: 'GT-51'}}});
            }
            if (url.pathname.endsWith('/guaranteed-test-orders/mine')) return route.fulfill({json: {status: 'success', orders: []}});
            return route.fulfill({contentType: 'text/html', body: '<html><body></body></html>'});
        });
        await page.goto('http://fixture.local/');
        await page.evaluate(({language}) => {
            window.lang = language;
            window.App = {userId: 77, API_BASE: '/api'}; // Also exercise App-only API base discovery.
            window.Telegram = {WebApp: {initData: 'fixture-auth', initDataUnsafe: {user: {id: 77}}, openTelegramLink() {}, openLink() {}}};
            window.toasts = [];
            window.showToast = text => toasts.push(text);
        }, {language});
        await page.addScriptTag({path: path.join(root, 'js/guaranteed-test-wizard.js')});
        await page.evaluate(({method, exchange}) => {
            Object.assign(gtwWizardState, {appName: 'Receipt fixture', testingLink: 'https://play.google.com/apps/testing/com.fixture',
                paymentMethod: method, paymentExchange: exchange, paymentStep1Done: true, fiatOrderId: method === 'rub' ? 51 : null});
            showGuaranteedTestWizardPayment({keepState: true});
            if (method === 'crypto') document.querySelector('[data-exchange="' + exchange + '"]').click();
            else document.getElementById('gtw-method-' + method).click();
        }, {method, exchange: options.exchange || 'binance'});
        return {page, calls};
    }
    async function select(page, name = 'receipt.png') {
        await page.locator('#gtw-flow-file').setInputFiles({name, mimeType: 'image/png', buffer: png});
    }
    async function uploaded(page) {
        await page.waitForFunction(() => !!gtwWizardState.paymentScreenshotUrl && !document.getElementById('gtw-flow-submit-btn').disabled);
    }
    async function submit(page) {
        await page.evaluate(() => document.getElementById('gtw-flow-submit-btn').click());
    }
    try {
        for (const language of ['en', 'ru']) {
            const methods = ['binance', 'bybit', 'okx', 'htx', 'gate'].map(exchange => ({method: 'crypto', exchange})).concat([{method: 'paypal'}, {method: 'rub'}]);
            for (const {method, exchange} of methods) {
                const {page, calls} = await fixture(language, method, {exchange});
                await select(page); await uploaded(page); await submit(page);
                await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
                assert.equal(calls.uploads.length, 1);
                assert(calls.uploads[0].includes(Buffer.from('fixture-auth')), 'Upload uses Telegram-only initData fallback');
                if (method === 'rub') {
                    assert.equal(calls.proofs[0].body.proof_url, '/telegram-media/receipt_1');
                    assert.equal(calls.proofs[0].body.init_data, 'fixture-auth');
                } else {
                    assert.equal(calls.orders[0].payment_method, method);
                    assert.equal(calls.orders[0].app_name, 'Receipt fixture');
                    assert.equal(calls.orders[0].init_data, 'fixture-auth');
                    assert.match(calls.orders[0].notes, /proof=\/telegram-media\/receipt_1/);
                }
                assert.deepEqual(calls.errors, []);
                await page.close(); scenarios++;
            }

            { // A failed upload is not a missing file; retry keeps the selected receipt.
                const {page, calls} = await fixture(language, 'crypto', {upload: (route, count) => route.fulfill({
                    status: count === 1 ? 503 : 200,
                    json: count === 1 ? {status: 'error', code: 'proof_upload_failed'} : {status: 'success', url: '/telegram-media/retried'}
                })});
                await select(page);
                await page.waitForFunction(() => toasts.length > 0 && !document.getElementById('gtw-flow-submit-btn').disabled);
                const messages = await page.evaluate(() => toasts);
                assert(messages.every(text => !/first|Сначала/.test(text)), 'Transport errors must not ask for a missing screenshot');
                assert.equal(await page.evaluate(() => gtwWizardState.paymentScreenshotFile.name), 'receipt.png');
                assert(!await page.locator('.preview-title').textContent().then(text => /uploaded|загружен/i.test(text)));
                await submit(page);
                await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
                assert.equal(calls.uploads.length, 2); assert.equal(calls.orders.length, 1);
                await page.close(); scenarios++;
            }

            { // Real uploaded references survive draft restoration; File/blob references do not.
                const {page, calls} = await fixture(language);
                await select(page); await uploaded(page);
                assert.equal(await page.evaluate(() => JSON.parse(localStorage.dt_gt_wizard_draft).payment_screenshot_url), '/telegram-media/receipt_1');
                await page.evaluate(() => resumeGuaranteedTestWizardFromDraft());
                assert.equal(await page.evaluate(() => gtwWizardState.paymentScreenshotFile), null);
                await page.evaluate(() => document.querySelector('[data-exchange="binance"]').click());
                await submit(page);
                await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
                assert.equal(calls.uploads.length, 1, 'A successful upload is reused after reopening the draft');
                await page.close(); scenarios++;
            }

            {
                const {page, calls} = await fixture(language);
                await page.evaluate(() => {
                    persistGuaranteedTestWizardDraft();
                    const draft = JSON.parse(localStorage.dt_gt_wizard_draft);
                    draft.payment_screenshot_url = 'blob:http://fixture.local/lost-local-file';
                    localStorage.dt_gt_wizard_draft = JSON.stringify(draft);
                    resumeGuaranteedTestWizardFromDraft();
                    document.querySelector('[data-exchange="binance"]').click();
                });
                assert.equal(await page.locator('#gtw-flow-submit-btn').isDisabled(), true);
                assert.equal(await page.locator('.preview-title').count(), 0, 'A stale draft must not show a green uploaded badge');
                assert.equal(calls.orders.length, 0);
                await page.close(); scenarios++;
            }
        }

        { // Request fiat requisites first, then attach the receipt to that exact order.
            const {page, calls} = await fixture('en', 'rub');
            await page.evaluate(() => {
                Object.assign(gtwWizardState, {fiatOrderId: null, paymentStep1Done: false, fiatCurrency: 'TRY', fiatBankName: 'Fixture Bank'});
                document.getElementById('gtw-method-rub').click();
                document.getElementById('gtw-flow-open-tg-btn').click();
            });
            await page.waitForFunction(() => gtwWizardState.fiatOrderId === 51 && gtwWizardState.paymentStep1Done);
            assert.equal(calls.orders[0].create_mode, 'requisites');
            assert.equal(calls.orders[0].init_data, 'fixture-auth');
            await select(page); await uploaded(page); await submit(page);
            await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
            assert.equal(calls.proofs[0].url, '/api/guaranteed-test-orders/51/attach-proof');
            assert.equal(calls.uploads.length, 1);
            await page.close(); scenarios++;
        }

        { // Network failure keeps the file available for a retry.
            const {page, calls} = await fixture('en', 'crypto', {upload: (route, count) => count === 1 ? route.abort('failed') : route.fulfill({json: {status: 'success', url: '/telegram-media/retry_network'}})});
            await select(page);
            await page.waitForFunction(() => toasts.length > 0 && !document.getElementById('gtw-flow-submit-btn').disabled);
            assert((await page.evaluate(() => toasts)).every(text => !/first/.test(text)));
            await submit(page);
            await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
            assert.equal(calls.uploads.length, 2);
            await page.close(); scenarios++;
        }

        { // A draft is not a cross-account receipt cache.
            const {page} = await fixture('en');
            await select(page); await uploaded(page);
            assert.equal(await page.evaluate(() => { App.userId = 88; return getGuaranteedTestWizardDraft(); }), null);
            await page.close(); scenarios++;
        }

        {
            const {page, calls} = await fixture('en');
            await page.locator('#gtw-flow-file').setInputFiles({name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1)});
            assert.equal(calls.uploads.length, 0);
            assert((await page.evaluate(() => toasts)).some(text => /5 MB/.test(text)));
            assert.equal(await page.locator('#gtw-flow-submit-btn').isDisabled(), true);
            await page.close(); scenarios++;
        }

        { // While the upload is in-flight, never show success or enable submission.
            let release;
            const {page, calls} = await fixture('en', 'crypto', {upload: route => new Promise(resolve => { release = async () => {
                await route.fulfill({json: {status: 'success', url: '/telegram-media/uploaded'}}); resolve();
            }; })});
            await select(page);
            await page.waitForFunction(() => document.querySelector('.preview-title')?.textContent.includes('Uploading'));
            assert.equal(await page.locator('#gtw-flow-submit-btn').isDisabled(), true);
            await page.evaluate(() => document.getElementById('gtw-flow-remove-screenshot').click());
            await release();
            await page.waitForTimeout(50);
            assert.equal(await page.evaluate(() => gtwWizardState.paymentScreenshotUrl), '', 'Late upload cannot restore a removed file');
            assert.equal(calls.orders.length, 0);
            await page.close(); scenarios++;
        }

        { // A failed order request reuses its uploaded proof; double clicks cannot create two orders.
            const {page, calls} = await fixture('en', 'crypto', {order: (route, count) => route.fulfill({
                status: count === 1 ? 503 : 200,
                json: count === 1 ? {status: 'error'} : {status: 'success', order: {id: 51, public_code: 'GT-51'}}
            })});
            await select(page); await uploaded(page); await submit(page);
            await page.waitForFunction(() => toasts.length > 0 && !document.getElementById('gtw-flow-submit-btn').disabled);
            await page.evaluate(() => {
                const button = document.getElementById('gtw-flow-submit-btn');
                button.dispatchEvent(new Event('click')); button.dispatchEvent(new Event('click'));
            });
            await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
            assert.equal(calls.orders.length, 2); assert.equal(calls.uploads.length, 1);
            await page.close(); scenarios++;
        }

        {
            const {page, calls} = await fixture('en', 'crypto', {order: route => route.fulfill({json: {
                status: 'error', code: 'order_already_active', details: {id: 51, status: 'awaiting_payment', public_code: 'GT-51'}
            }})});
            await select(page); await uploaded(page); await submit(page);
            await page.waitForFunction(() => toasts.some(text => /GT-51/.test(text)));
            assert.equal(calls.proofs[0].body.proof_url, '/telegram-media/receipt_1');
            assert.equal(calls.uploads.length, 1);
            await page.close(); scenarios++;
        }
        for (const method of ['crypto', 'rub']) {
            const invalidResponse = route => route.fulfill({json: {}});
            const {page} = await fixture('en', method, method === 'rub' ? {attach: invalidResponse} : {order: invalidResponse});
            await select(page); await uploaded(page); await submit(page);
            await page.waitForFunction(() => toasts.length > 0 && !document.getElementById('gtw-flow-submit-btn').disabled);
            assert((await page.evaluate(() => toasts)).every(text => !/GT-51/.test(text)), 'Malformed 200 response cannot finish an order');
            assert.equal(await page.evaluate(() => gtwWizardState.paymentScreenshotUrl), '/telegram-media/receipt_1');
            assert(await page.evaluate(() => !!localStorage.dt_gt_wizard_draft), 'Retry must retain the draft and receipt');
            await page.close(); scenarios++;
        }
        console.log(`Private Testing payment proof: ${scenarios} browser scenarios passed (RU/EN, crypto/PayPal/fiat, upload errors, drafts, races, retries, duplicate order).`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
