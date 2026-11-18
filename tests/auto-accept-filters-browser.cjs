const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, '../artifacts/auto-accept-filters-20261118');
fs.mkdirSync(out, { recursive: true });
const defaults = { reliability: null, allow_newbies: true, completed_tests: null, karma: null,
    feedback_required: false, android: null, avoid_device_duplicates: false };
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const language of ['ru', 'en']) for (const width of [320, 360, 390, 430]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            let saved = { ...defaults };
            const errors = [], writes = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                localStorage.setItem('lang', language);
                window.__API_BASE__ = 'http://fixture.local/api';
                window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 880, language_code: 'en' } }, initData: 'fixture',
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } };
            }, language);
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.pathname === '/api/users/me/auto-accept-filters') {
                    const body = route.request().postDataJSON();
                    assert.equal(body.init_data, 'fixture');
                    if (body.filters) { saved = body.filters; writes.push(saved); }
                    return route.fulfill({ json: { status: 'success', filters: saved,
                        projects: [{ app_id: 1, name: 'Project Android 12', min_android_version: 12 }] } });
                }
                if (url.pathname.includes('coverage')) return route.fulfill({ status: 503, json: { detail: 'Fixture unavailable' } });
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { events: [], enabled: false } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/');
            await page.addStyleTag({ content: '#no-username-overlay{display:none!important}' });
            await page.evaluate(language => {
                lang = language; window.currentLang = language; window.showToast = () => {};
                _autoAcceptMutualEnabled = false; window._autoAcceptBountyEnabled = false;
                AutoAcceptFilters.sync();
            }, language);
            assert(await page.locator('#auto-accept-filter-controls').isHidden());
            await page.evaluate(() => { _autoAcceptMutualEnabled = true; AutoAcceptFilters.sync(); });
            await page.waitForSelector('#auto-accept-filter-controls .auto-filter-chips', { state: 'attached' });
            await page.evaluate(() => AutoAcceptFilters.open());
            const sheet = page.locator('.auto-filter-sheet');
            assert(await sheet.isVisible());
            assert(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth));
            const footer = await sheet.locator('footer').boundingBox();
            assert(footer.y >= 0 && footer.y + footer.height <= 900, 'Save and reset stay visible while filters scroll');
            assert.equal(await sheet.locator('[data-filter-key="android"]:disabled').count(), 4);
            assert.match(await sheet.locator('.auto-filter-inherited').innerText(), /Android 12/);
            await sheet.locator('[data-filter-key="reliability"][data-value="75"]').click();
            await sheet.locator('[data-filter-key="karma"][data-value="0"]').click();
            await page.screenshot({ path: path.join(out, 'sheet-' + language + '-' + width + '.png') });
            await sheet.locator('[data-save]').click();
            await page.waitForSelector('#auto-filter-modal', { state: 'detached' });
            assert.equal(writes.at(-1).reliability, 75);
            assert.equal(writes.at(-1).karma, 0);
            await page.evaluate(() => AutoAcceptFilters.open());
            await sheet.locator('[data-reset]').click();
            await sheet.locator('[data-save]').click();
            await page.waitForSelector('#auto-filter-modal', { state: 'detached' });
            assert.deepEqual(writes.at(-1), defaults);
            await page.evaluate(() => {
                const host = document.createElement('div'); host.id = 'fixture-reasons'; host.style.padding = '16px';
                host.innerHTML = AutoAcceptFilters.reasonsHtml([
                    { code: 'karma', params: { actual: -5, threshold: 0 } },
                    { code: 'device', params: { device: '<img src=x> Samsung SM-S928B' } }]);
                document.body.prepend(host);
            });
            const details = page.locator('#fixture-reasons details');
            assert.equal(await details.getAttribute('open'), null);
            await details.locator('summary').click();
            assert.equal(await details.locator('li').count(), 2);
            assert.equal(await details.locator('img').count(), 0);
            assert(await details.evaluate(el => el.scrollWidth <= el.clientWidth));
            await details.screenshot({ path: path.join(out, 'reasons-' + language + '-' + width + '.png') });
            await page.evaluate(() => {
                document.getElementById('fixture-reasons').remove();
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById('tab-tests').classList.add('active');
                const reasons = [{ code: 'karma', params: { actual: -5, threshold: 0 } }];
                incomingOffers = [{ offer_id: 82, owner_id: 880, proposer_id: 42, target_app_id: 11, proposer_app_id: 12,
                    status: 'pending', created_at: new Date().toISOString(), proposer_full_name: 'Ed',
                    proposer_app_name: 'EvoBlob', target_app_name: 'My project', auto_accept_reasons: reasons }];
                bountyApplications = [{ application_id: 83, owner_id: 880, applicant_id: 43, app_id: 11,
                    status: 'pending', created_at: new Date().toISOString(), applicant_full_name: 'Tester',
                    app_name: 'My project', auto_accept_reasons: reasons }];
                _offersLoadedOnce = _bountyAppsLoadedOnce = true;
                _offersInFlight = _bountyAppsInFlight = null;
                renderIncomingOffers(); renderBountyApplications(true);
            });
            for (const selector of ['#offers-carousel', '#bounty-apps-carousel']) {
                const accordion = page.locator(selector + ' details.auto-filter-reasons');
                assert.equal(await accordion.count(), 1);
                assert.equal(await accordion.getAttribute('open'), null);
                await accordion.locator('summary').click();
                assert(await accordion.locator('li').isVisible());
                assert(await accordion.evaluate(el => el.scrollWidth <= el.clientWidth));
                await accordion.locator('summary').click();
            }
            await page.evaluate(() => openProjectCoverage(1, null, { forceReload: true }));
            await page.waitForSelector('.coverage-error-state');
            assert((await page.locator('.coverage-error-state').innerText()).includes(language === 'ru' ? 'Не удалось' : 'Failed to load'));
            const header = await page.locator('#project-coverage-body .coverage-header').boundingBox();
            const icon = await page.locator('.coverage-error-state > div').first().boundingBox();
            assert(icon.y - (header.y + header.height) >= 20, 'Error icon has space below the sticky header');
            await page.screenshot({ path: path.join(out, 'coverage-error-' + language + '-' + width + '.png') });
            assert.equal(await page.evaluate(() => reportCopy('catchupDaily').includes('$BUST')), false);
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Auto-accept filters, collapsed reasons and coverage error: RU/EN at 320, 360, 390, 430px passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
