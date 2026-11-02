const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const language of ['en', 'ru']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Bangkok' });
            const errors = []; let savedReason = null, posted = 0;
            page.on('pageerror', error => errors.push(error.message));
            await page.clock.install({ time: new Date('2026-11-02T03:25:00Z') });
            await page.route('http://fixture.local/**', route => {
                const request = route.request(), url = new URL(request.url());
                if (url.pathname === '/api/user/blacklist/2' && request.method() === 'POST') {
                    const payload = request.postDataJSON();
                    assert.equal(payload.init_data, 'signed-fixture');
                    savedReason = payload.reason; posted++;
                    return route.fulfill({ json: { status: 'success', created: true, reason: savedReason } });
                }
                if (url.pathname === '/api/user/blacklist') return route.fulfill({ json: { status: 'success', show_blocked_projects: true,
                    items: savedReason === null ? [] : [{ id: 2, username: 'owner', first_name: 'Owner', reason: savedReason }],
                    blocked_by: [{ owner_id: 2, reason: 'Missed <img src=x onerror=alert(1)> reports' }] } });
                return route.fulfill({ contentType: 'text/html', body: '<div id="feed"></div><div id="blacklist-modal" class="modal-overlay"><div id="blacklist-body"></div></div>' });
            });
            await page.goto('http://fixture.local/');
            for (const file of ['i18n/ru.js','i18n/en.js','i18n/core.js','ui/ui-helpers.js','ui/ui-tests.js','ui/ui-market.js','js/user-blacklist.js','js/smart-ping.js'])
                await page.addScriptTag({ path: path.join(root, file) });
            for (const file of ['css/tokens.css','css/base.css','styles.css','css/blacklist-modal.css','css/project-card-dashboard.css'])
                await page.addStyleTag({ path: path.join(root, file) });
            await page.evaluate(language => {
                window.lang = language; window.currentLang = language; Object.assign(window.t, language === 'en' ? I18NEN : I18NRU);
                window.API_BASE = '/api'; window.userId = 1; window.App = { userId: 1 };
                window.myTests = []; window.incomingOffers = []; window.myProjects = [];
                window._blockedOfferProjectsByOwner = {}; window._blockedOfferProjectsFetchedAt = {};
                window.isProjectSynced = () => false; window.getLangBadge = () => ''; window.isOwnerBlockedByMe = () => false;
                window.showToast = () => {}; window.withInitData = data => ({ ...data, init_data: 'signed-fixture' });
                window.getTelegramInitDataRaw = () => 'signed-fixture';
                window.item = { app_id: 42, owner_id: 2, name: 'Blocked owner project', owner_username: 'owner', blocked_by_owner: true, limit_mutual: 12 };
                document.getElementById('feed').innerHTML = renderFeedCard(item, 'mutual-seeking');
            }, language);
            assert.equal(await page.locator('.market-owner-block').count(), 1);
            assert.equal(await page.locator('#feed .btn-primary:not(:disabled)').count(), 0, 'Blocked owner cannot be joined');
            await page.locator('.market-owner-block').click();
            await page.waitForSelector('.blacklist-reason-overlay');
            assert.match(await page.locator('.blacklist-reason-overlay').innerText(), /Missed <img src=x onerror=alert\(1\)> reports/);
            assert.equal(await page.locator('.blacklist-reason-overlay img').count(), 0, 'Reason text is escaped');
            await page.locator('.blacklist-reason-overlay button').click();
            await page.evaluate(() => { window.blockPromise = blockUserOnBlacklist(2, 'Owner'); });
            await page.locator('[data-reason-key="blacklistReasonReports"]').click();
            assert((await page.locator('#blacklist-reason-input').inputValue()).length > 3);
            assert.equal(await page.locator('#blacklist-reason-input').getAttribute('maxlength'), '500');
            await page.locator('#blacklist-reason-input').fill('Custom reason <b>shared</b>');
            await page.locator('.blacklist-reason-overlay').screenshot({ path: path.resolve(root, '../artifacts/blacklist-reason-' + language + '.png') });
            await page.locator('[data-confirm]').click();
            assert.equal(await page.evaluate(() => window.blockPromise), true);
            assert.equal(posted, 1); assert.equal(savedReason, 'Custom reason <b>shared</b>');
            await page.evaluate(() => ensureUserBlacklistLoaded(true));
            assert.match(await page.locator('.blacklist-row__reason').innerText(), /Custom reason <b>shared<\/b>/);
            assert.equal(await page.locator('.blacklist-row__reason b').count(), 0);
            await page.evaluate(() => {
                myProjects = [{ id: 30, name: 'Project', testers: [], smart_ping_sent_at: '2026-11-01T10:13:00Z' }];
                SmartPing.setLastPing(30, { sentAt: '2026-11-01T10:13:00Z', count: 4 });
                SmartPing.open(30);
            });
            assert.match(await page.locator('.smart-ping-sheet__last-status').innerText(), language === 'en' ? /yesterday at 17:13/ : /вчера в 17:13/);
            await page.evaluate(() => { SmartPing.close(true); myProjects[0].smart_ping_sent_at = '2026-11-02 02:13:00'; SmartPing.open(30); });
            assert.match(await page.locator('.smart-ping-sheet__last-status').innerText(), language === 'en' ? /today at 09:13/ : /сегодня в 09:13/);
            assert.equal(await page.evaluate(() => SmartPing.getLastPing(30).count), 0, 'Newer server history wins over stale local count');
            await page.evaluate(() => { SmartPing.close(true); myProjects[0].smart_ping_sent_at = '2026-11-03T03:00:00Z'; localStorage.removeItem('pc_smart_ping_last_30'); SmartPing.open(30); });
            assert.equal(await page.locator('.smart-ping-sheet__last-status:visible').count(), 0, 'Do not claim a future ping happened today');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Blacklist and Smart Ping RU/EN: incoming badge, shared reason/chips, escaped text, signed writes, correct yesterday/today/UTC/cache/future handling passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
