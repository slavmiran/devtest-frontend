const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const [language, width] of [['ru', 360], ['en', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                localStorage.setItem('lang', language);
                window.__API_BASE__ = 'http://fixture.local/api';
                window.__telegramEvents = {};
                window.Telegram = { WebApp: {
                    initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture', themeParams: {}, colorScheme: 'dark', viewportStableHeight: 0,
                    expand() {}, ready() {},
                    onEvent(name, callback) { (window.__telegramEvents[name] ||= []).push(callback); }, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                } };
                window.__emitTelegram = name => (window.__telegramEvents[name] || []).forEach(callback => callback({ isStateStable: true }));
            }, language);
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', events: [], acceptance_rate_pct: 75 } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(language => {
                lang = language;
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                Object.assign(App, { runtimeConfigStatus: 'ready', runtimeConfigApiBase: API_BASE, screenshotProofUploadEnabled: true });
                window.getResolvedTestingDay = test => test.testing_days;
                myTests = [{ id: 30, progress_id: 300, run_iteration: 1, name: 'Viewport regression', testing_days: 14,
                    status: 'daily', app_status: 'active', progress_status: 'active', start_date: '2026-10-16', checkins_count: 13, request_reviews: true }];
                document.documentElement.style.setProperty('--tg-viewport-stable-height', '0px');
                openReportModal(30, 'developer');
            }, language);

            async function assertExpanded(message) {
                await page.waitForTimeout(350);
                const dimensions = await page.locator('#report-modal').evaluate(modal => {
                    const sheet = modal.querySelector('.report-modal-sheet'), body = modal.querySelector('.unified-report-body');
                    return { active: modal.classList.contains('active'), height: sheet.getBoundingClientRect().height,
                        bodyHeight: body.clientHeight, maxHeight: getComputedStyle(sheet).maxHeight };
                });
                assert(dimensions.active && dimensions.height > 300 && dimensions.bodyHeight > 80, message + ': ' + JSON.stringify(dimensions));
                assert(await page.locator('#t-reportModalTitle').isVisible(), 'Report heading is visible');
                assert(await page.locator('#checkin-proof-picker').isVisible(), 'Media picker is visible');
            }

            await assertExpanded('Zero Telegram stable height must not collapse the form');
            await page.evaluate(() => {
                closeReportModal();
                document.documentElement.style.setProperty('--tg-viewport-stable-height', '1px');
                Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 0 });
                Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, value: NaN });
                openReportModal(30, 'developer');
            });
            await assertExpanded('Reopen during a transient zero viewport uses usable geometry');
            for (const height of [NaN, Infinity, 1]) {
                await page.evaluate(height => {
                    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: height });
                    window.visualViewport.dispatchEvent(new Event('resize'));
                }, height);
                await assertExpanded('Invalid visual viewport does not poison the open sheet');
            }
            await page.evaluate(() => {
                Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 390 });
                Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, value: 80 });
                document.getElementById('unified-report-note').focus();
                window.visualViewport.dispatchEvent(new Event('resize'));
            });
            await page.waitForTimeout(350);
            const keyboard = await page.locator('#checkin-proof-submit').boundingBox();
            assert(keyboard.y >= 80 && keyboard.y + keyboard.height <= 470, 'Submit remains inside the visual viewport with the keyboard open');
            await page.locator('#unified-report-note').fill('Keep this report while returning from another app');
            await page.evaluate(() => {
                document.getElementById('unified-report-note').blur();
                delete window.visualViewport.height;
                delete window.visualViewport.offsetTop;
                window.__emitTelegram('activated');
            });
            await assertExpanded('Telegram activation restores the sheet without a browser resize');
            assert.equal(await page.locator('#unified-report-note').inputValue(), 'Keep this report while returning from another app');
            await page.evaluate(() => {
                Telegram.WebApp.viewportStableHeight = 450;
                window.__emitTelegram('viewportChanged');
            });
            await page.waitForTimeout(350);
            const partial = await page.locator('#report-modal .report-modal-sheet').boundingBox();
            assert(partial.height > 250 && partial.y + partial.height <= 450, 'A valid partial Telegram viewport is still respected');
            await page.evaluate(() => { Telegram.WebApp.viewportStableHeight = 0; window.__emitTelegram('viewportChanged'); });
            for (const event of ['viewportChanged', 'resize', 'pageshow', 'visibilitychange']) {
                await page.evaluate(event => {
                    Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 390 });
                    window.visualViewport.dispatchEvent(new Event('resize'));
                    delete window.visualViewport.height;
                    if (event === 'viewportChanged') window.__emitTelegram(event);
                    else if (event === 'visibilitychange') document.dispatchEvent(new Event(event));
                    else window.dispatchEvent(new Event(event));
                }, event);
                await assertExpanded('Recovery after ' + event);
            }
            await page.evaluate(() => {
                window.__savedVisualViewport = window.visualViewport;
                Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined });
                window.dispatchEvent(new Event('resize'));
            });
            await assertExpanded('Layout viewport supports WebViews without VisualViewport');
            await page.evaluate(() => Object.defineProperty(window, 'visualViewport', { configurable: true, value: window.__savedVisualViewport }));
            await page.evaluate(() => {
                Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 390 });
                window.visualViewport.dispatchEvent(new Event('resize'));
                delete window.visualViewport.height; // Deliberately omit the host's restoration event.
            });
            await page.waitForFunction(() => document.getElementById('report-modal').style.height === '850px');
            await assertExpanded('The existing form timer repairs a missed viewport restoration event');
            await page.evaluate(() => {
                closeReportModal();
                openReportModal(30, 'developer');
                closeReportModal();
                openReportModal(30, 'developer');
            });
            await assertExpanded('Rapid close/reopen remains usable');
            const listeners = await page.evaluate(() => Object.fromEntries(['activated', 'viewportChanged'].map(name => [name, (__telegramEvents[name] || []).length])));
            assert.deepEqual(listeners, { activated: 1, viewportChanged: 1 }, 'Viewport handlers bind only once');
            await page.evaluate(() => {
                closeReportModal();
                myTests[0].is_external = true;
                openReportModal(30, 'developer');
                window.__emitTelegram('activated');
            });
            assert(await page.locator('#report-legacy-block').isVisible(), 'External reports retain their legacy form');
            assert.equal(await page.locator('#report-modal').evaluate(modal => modal.style.height), '', 'Internal viewport overrides do not leak into external reports');
            assert.deepEqual(errors, []);
            await page.close();
            console.log('Report viewport ' + language + ' ' + width + ': zero/invalid heights, keyboard, resume and reopen passed');
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
