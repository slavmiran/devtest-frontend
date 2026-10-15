const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.setContent('<main id="fixture"></main>');
        for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'ui/ui-tests.js', 'js/app-features.js']) {
            await page.addScriptTag({ path: path.join(root, file) });
        }
        await page.evaluate(() => {
            window.links = [];
            window.tg = { openTelegramLink: url => links.push(url), showAlert() {} };
            Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
        });
        for (const language of ['ru', 'en']) for (const mode of ['google_group', 'custom_google_group', 'email_list']) {
            await page.evaluate(({ language, mode }) => {
                window.lang = language;
                document.getElementById('fixture').innerHTML = renderIncomingAccessIssue({
                    access_issue: true, access_issue_app_id: 40, access_issue_mode: mode,
                    access_issue_owner_username: 'sobir_0990',
                    access_issue_contact_username: 'GiuFu',
                    access_issue_reporter_username: 'GiuFu', access_issue_tester_username: 'GiuFu',
                }, language);
            }, { language, mode });
            assert.equal(await page.locator('.incoming-access-issue__contact').innerText(), '@sobir_0990');
            await page.locator('.incoming-access-issue__contact').click();
            assert.equal(await page.evaluate(() => links.at(-1)), 'https://t.me/sobir_0990');
        }
        await page.evaluate(() => {
            document.getElementById('fixture').innerHTML = renderIncomingAccessIssue({
                access_issue: true, access_issue_reporter_username: 'GiuFu', access_issue_tester_username: 'GiuFu',
            }, 'en');
        });
        assert.equal(await page.locator('.incoming-access-issue__contact').count(), 0, 'An old cached reporter must never become the setup contact');
        await page.evaluate(() => {
            document.getElementById('fixture').innerHTML = renderIncomingAccessIssue({
                access_issue: true, access_issue_contact_username: 'market_owner', access_issue_mode: 'email_list',
            }, 'ru');
        });
        await page.locator('.incoming-access-issue__contact').click();
        assert.equal(await page.evaluate(() => links.at(-1)), 'https://t.me/market_owner');
        assert.deepEqual(errors, []);
        console.log('Access help: owner contact, actual Telegram click, RU/EN, all setup modes, cached reporter rejection and market compatibility passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
