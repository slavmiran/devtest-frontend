const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const stage = index.match(/<div id="add-stage-2"[\s\S]*?(?=\s*<div id="add-stage-3")/)[0];
const modals = index.match(/<div id="paid-app-modal"[\s\S]*?(?=\s*<div id="google_translate_element")/)[0];

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const width of [360, 390, 430]) {
            const page = await browser.newPage({ viewport: { width, height: 800 } });
            const errors = [];
            page.on('pageerror', (error) => errors.push(error.message));
            await page.setContent('<!doctype html><html><body style="margin:0;background:#111a26;color:#e8edf7">' + stage + modals + '</body></html>');
            await page.addStyleTag({ path: path.join(root, 'css/wizard.css') });
            await page.addScriptTag({ path: path.join(root, 'i18n/ru.js') });
            await page.addScriptTag({ path: path.join(root, 'i18n/core.js') });
            await page.addScriptTag({ path: path.join(root, 'js/paid-app.js') });
            await page.evaluate(() => {
                window.lang = 'ru';
                window.escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
                window.evaluateAddStages = () => {};
                window.openImageZoom = (src) => { window.zoomed = src; };
                window.showToast = (text) => { window.toast = text; };
            });
            assert.equal(await page.locator('#paid-license-panel').isHidden(), true);
            await page.evaluate(() => PaidAppSetup.setType('add', 'paid', true));
            assert.equal(await page.locator('#paid-license-panel').isVisible(), true);
            assert.equal(await page.locator('#paid-license-guide').evaluate((node) => node.open), true, 'Switching to paid opens the license guide');
            assert.equal(await page.locator('#check-license').isVisible(), true);
            await page.evaluate(() => PaidAppSetup.openPaidGuide(42));
            const src = await page.locator('#paid-app-example').getAttribute('src');
            assert.equal(src, 'images/Test%20card.png');
            await page.evaluate(() => document.getElementById('paid-app-example').click());
            assert.match(await page.evaluate(() => window.zoomed || ''), /Test%20card\.png/);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
            const chips = await page.evaluate(() => PaidAppSetup.chips({ id: 7, app_type: 'paid', instructions: 'Откройте профиль', test_login: 'qa', test_password: 'secret', test_credentials_note: '' }).join(''));
            assert.match(chips, /Платное/);
            assert.match(chips, /Инструкция и вход/);
            assert.doesNotMatch(chips, /secret/);
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Paid app UI: guide, test-card image and chips passed at 360/390/430.');
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
