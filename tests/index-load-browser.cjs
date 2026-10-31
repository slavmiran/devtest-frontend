const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
      for(const language of ['ru','en'])for(const width of [360,390,430]){
        const page = await browser.newPage({viewport:{width,height:860}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        // The username gate prevents bootstrap API calls; all external traffic
        // is intercepted too. This loads the real branch entry point safely.
        await page.addInitScript((language) => {
            window.Telegram = { WebApp: {
                initDataUnsafe: { user: { id: 880, language_code: language } },
                themeParams: {}, colorScheme: 'dark',
                expand() {}, ready() {}, onEvent() {}, offEvent() {},
                BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
            } };
        },language);
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'fixture.local') {
                return route.fulfill({ contentType: 'application/javascript', body: '' });
            }
            const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
            assert(file.startsWith(root + path.sep), 'Only workspace assets may be served');
            assert(fs.existsSync(file), 'Missing entry point asset: ' + file);
            const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
            return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
        });
        await page.goto('http://fixture.local/', { waitUntil: 'load' });
        await page.waitForFunction(() => document.getElementById('no-username-overlay').classList.contains('active'));
        assert.doesNotMatch(await page.locator('body').innerText(), /Updated upstream|Stashed changes|<<<<<<<|>>>>>>>/);
        assert.equal(await page.evaluate(() => typeof getExistingMutualTargetLink), 'function');
        assert.equal(await page.evaluate(() => typeof createMutualOffer), 'function');
        assert.deepEqual(errors, [], 'Real index script order must load without syntax or global redeclaration errors');
        await page.close();
      }
        console.log('RU/EN 360/390/430 index browser load: real DEV HTML, full script order, username gate and no visible conflict markers passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
