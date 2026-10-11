const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const timezoneId of ['Asia/Almaty', 'Asia/Bangkok', 'America/Los_Angeles', 'Pacific/Kiritimati', 'UTC']) {
            const page = await browser.newPage({ timezoneId });
            await page.route('http://fixture.local/**', route => route.fulfill({ contentType: 'text/html', body: '' }));
            await page.goto('http://fixture.local/');
            await page.clock.install({ time: new Date('2026-10-11T23:16:00Z') });
            for (const file of ['ui/ui-helpers.js', 'ui/ui-tests.js']) await page.addScriptTag({ path: path.join(root, file) });
            await page.evaluate(() => {
                window.getLocalDate = () => {
                    const now = new Date();
                    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
                };
                window.fixture = { created_at: '2026-10-11 21:58:51.747329+00', google_sync_day: 1, last_sync_date: '2026-10-11T21:58:51.857384' };
            });
            assert.equal(await page.evaluate(() => getProjectPlatformDay(fixture)), 1, timezoneId);
            assert.equal(await page.evaluate(() => getProjectCurrentGoogleDay(fixture, 2)), 1, timezoneId);
            assert.equal(await page.evaluate(() => parseLocalDateOnly('2026-10-12').getDate()), 12, 'Tester date-only records must retain their local day');
            assert.equal(await page.evaluate(() => getProjectCurrentGoogleDay({ google_sync_day: 5, last_sync_date: fixture.last_sync_date }, 99)), 5);
            await page.clock.setFixedTime(new Date('2026-10-12T00:05:00Z'));
            assert.equal(await page.evaluate(() => getProjectPlatformDay(fixture)), 2, 'Advance only on server calendar boundary');
            assert.equal(await page.evaluate(() => getProjectPlatformDay(new Date(fixture.created_at.replace(' ', 'T').replace(/\+00$/, '+00:00')))), 2);
            assert.equal(await page.evaluate(() => getProjectCurrentGoogleDay({ google_sync_day: 5, last_sync_date: fixture.last_sync_date }, 99)), 6);
            assert.equal(await page.evaluate(() => getProjectPlatformDay({ ...fixture, restarted_at: '2026-10-12T00:02:00+00:00' })), 1, 'Retest starts from its own timestamp');
            assert.equal(await page.evaluate(() => getProjectPlatformDay('not-a-date')), 1);
            await page.close();
        }
        console.log('Project day: Almaty/Bangkok/Los Angeles/Kiritimati/UTC, real production timestamp, UTC rollover, console sync, local tester dates and retest passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
