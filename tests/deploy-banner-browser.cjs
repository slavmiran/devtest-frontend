const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const width of [360, 390]) {
            for (const language of ['ru', 'en']) {
                const page = await browser.newPage({ viewport: { width, height: 800 } });
                const errors = [];
                let status = { enabled: true, state: 'updating', deploy_id: 'dep-fixture', valid_for_seconds: 45 };
                let posts = 0;
                page.on('pageerror', error => errors.push(error.message));
                await page.addInitScript(({ language }) => {
                    window.__API_BASE__ = 'http://fixture.local/api';
                    localStorage.setItem('lang', language);
                    window.Telegram = { WebApp: {
                        initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture',
                        themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                    } };
                }, { language });
                await page.route('**/*', route => {
                    const url = new URL(route.request().url());
                    if (route.request().method() === 'POST') posts++;
                    if (url.pathname === '/api/deploy-status') return route.fulfill({ json: status });
                    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { events: [] } });
                    if (url.hostname !== 'fixture.local') return route.fulfill({ contentType: 'application/javascript', body: '' });
                    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                    assert(file.startsWith(root + path.sep) && fs.existsSync(file));
                    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
                    return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
                });
                await page.goto('http://fixture.local/', { waitUntil: 'load' });
                await page.waitForFunction(() => !document.getElementById('deploy-status-banner').hidden);
                await page.evaluate(async language => {
                    lang = language;
                    document.body.classList.remove('no-username-blocked');
                    document.getElementById('no-username-overlay').classList.remove('active');
                    window.App.runtimeConfigStatus = 'ready';
                    window.App.runtimeConfigApiBase = API_BASE;
                    window.App.screenshotProofUploadEnabled = true;
                    myTests = [{ id: 30, progress_id: 300, run_iteration: 1, name: 'QuickSweep',
                        testing_days: 4, status: 'daily', app_status: 'active', progress_status: 'active',
                        start_date: '2026-10-19', owner_username: 'developer', checkins_count: 2 }];
                    await openReportModal(30, 'developer');
                }, language);
                await page.locator('#report-modal.active').waitFor();
                await page.waitForTimeout(400); // existing bottom-sheet transition
                const geometry = await page.evaluate(() => {
                    const banner = document.getElementById('deploy-status-banner').getBoundingClientRect();
                    const sheet = document.querySelector('#report-modal .modal-content').getBoundingClientRect();
                    const button = document.getElementById('checkin-proof-submit').getBoundingClientRect();
                    return { bannerBottom: banner.bottom, sheetTop: sheet.top, buttonTop: button.top,
                        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
                        selected: _checkinProofUploadState.files.length };
                });
                assert(geometry.sheetTop >= geometry.bannerBottom, JSON.stringify(geometry));
                assert(geometry.buttonTop >= geometry.bannerBottom);
                assert.equal(geometry.horizontalOverflow, false);
                if (process.env.DEPLOY_SCREENSHOT_DIR && width === 360 && language === 'ru') {
                    await page.screenshot({ path: path.join(process.env.DEPLOY_SCREENSHOT_DIR, 'deploy_banner_report_360.png') });
                }
                await page.evaluate(() => { document.getElementById('report-text').value = 'Keep this draft'; });
                status = { enabled: true, state: 'complete', deploy_id: 'dep-fixture' };
                await page.evaluate(() => window.DeployStatus.refresh());
                assert.equal(await page.locator('#deploy-status-banner').getAttribute('data-state'), 'complete');
                assert.equal(await page.locator('#report-text').inputValue(), 'Keep this draft');
                assert(await page.locator('#report-modal').evaluate(el => el.classList.contains('active')));
                assert.equal(posts, 0, 'Observing an update must not cause a business write');
                assert.deepEqual(errors, [], 'Full real index and report UI must remain functional');
                await page.close();
            }
        }
        console.log('Deploy browser: real index + report sheet, RU/EN at 360/390px, no overlap/overflow, draft retained on completion, no writes passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
