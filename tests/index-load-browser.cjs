const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const fixtureOrigin = 'http://fixture.local';

function serveFixture(route, language) {
    const url = new URL(route.request().url());
    if (url.origin !== fixtureOrigin) {
        return route.fulfill({ contentType: 'application/javascript', body: '' });
    }
    if (url.pathname === '/api/users/me/profile/sync') {
        return route.fulfill({ json: { status: 'success', user_id: 880, username: 'test_user', interface_language: language } });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: {} });
    const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
    assert(file.startsWith(root + path.sep), 'Only workspace assets may be served');
    assert(fs.existsSync(file), 'Missing entry point asset: ' + file);
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
    return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
}

async function checkIndex(browser, { language, width, username }) {
    const page = await browser.newPage({ viewport: { width, height: 860 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        await page.addInitScript(({ language, username, fixtureOrigin }) => {
            window.__API_BASE__ = fixtureOrigin + '/api';
            window.Telegram = { WebApp: {
                initData: 'signed-fixture',
                initDataUnsafe: { user: { id: 880, language_code: language, username } },
                themeParams: {}, colorScheme: 'dark',
                expand() {}, ready() {}, onEvent() {}, offEvent() {},
                HapticFeedback: { selectionChanged() {} },
                BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
            } };
        }, { language, username, fixtureOrigin });
        await page.route('**/*', route => serveFixture(route, language));
        await page.goto(fixtureOrigin, { waitUntil: 'load' });
        assert.doesNotMatch(await page.locator('body').innerText(), /Updated upstream|Stashed changes|<<<<<<<|>>>>>>>/);
        assert.equal(await page.evaluate(() => typeof getExistingMutualTargetLink), 'function');
        assert.equal(await page.evaluate(() => typeof createMutualOffer), 'function');
        assert.deepEqual(errors, [], 'Real index script order must load without syntax or global redeclaration errors');
        if (!username) {
            await page.locator('#no-username-overlay.active').waitFor({ timeout: 5000 });
            return;
        }
        await page.waitForFunction(() => window.currentUser?.username === 'test_user', undefined, { timeout: 5000 });
        for (const [tab, label] of [['projects', 'tabProjects'], ['market', 'navMarket'], ['tests', 'tabTests']]) {
            const item = page.locator('.bottom-nav .nav-item').filter({ has: page.locator(`[data-i18n="${label}"]`) });
            await item.tap({ timeout: 5000 });
            assert.equal(await page.locator('.tab-content.active').getAttribute('id'), `tab-${tab}`);
            assert.equal(await page.locator('.bottom-nav .nav-item.active [data-i18n]').getAttribute('data-i18n'), label);
        }
        assert.deepEqual(errors, [], 'Tapping through all bottom tabs must not throw');
    } finally {
        await page.close();
    }
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        await checkIndex(browser, { language: 'ru', width: 390 });
        for (const language of ['ru', 'en']) {
            for (const width of [360, 390, 430]) {
                await checkIndex(browser, { language, width, username: 'test_user' });
            }
        }
        console.log('Real index load, username gate, and all bottom tabs passed in RU/EN at 360/390/430 px');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
