const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const width of [360, 390]) for (const language of ['ru', 'en']) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            const errors = [];
            let writes = 0;
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                window.Telegram = { WebApp: {
                    initDataUnsafe: { user: { id: 880, language_code: 'en' } },
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                } };
            });
            await page.route('**/*', route => {
                const request = route.request(), url = new URL(request.url());
                if (!['GET', 'HEAD'].includes(request.method())) writes++;
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { enabled: false, events: [] } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ contentType: 'application/javascript', body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file));
                const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
                return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(language => {
                lang = language;
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                visibilityStats = null;
                myProjects = [{ id: 30, name: 'QuickSweep - Screenshot Tool', mode: 'mutual', status: 'active',
                    limit_mutual: 50, today_checkins_count: 16, active_testers_count: 44,
                    created_at: '2026-10-10T00:00:00Z', google_sync_day: 7, last_sync_date: '2026-10-22',
                    testers: [{ tester_id: 554, join_type: 'mutual', reciprocal_app_id: 1203, reciprocal_app_name: 'CryptoVPN' }] }];
                incomingOffers = [];
                myTests = [
                    { id: 1203, name: 'CryptoVPN', owner_id: 554, owner_username: 'developer',
                        status: 'done', progress_status: 'active', join_type: 'mutual', reciprocal_app_id: 30 },
                    { id: 1205, name: 'Direct app', status: 'daily', progress_status: 'active', join_type: 'direct' },
                    { id: 1206, name: 'Invited app', status: 'done', progress_status: 'active', join_type: 'invite' },
                    { id: 1207, name: 'Contract app', status: 'opened', progress_status: 'active', join_type: 'bounty' },
                ];
                mutualSeeking = [
                    { app_id: 1203, name: 'CryptoVPN', owner_id: 554, owner_username: 'developer', limit_mutual: 12 },
                    { app_id: 1204, name: 'wgfytunnel', owner_id: 554, owner_username: 'developer', limit_mutual: 12 },
                    ...myTests.slice(1).map(test => ({ app_id: test.id, name: test.name, owner_id: 700, limit_mutual: 12 })),
                ];
                mutualPrelaunch = [mutualSeeking[0]];
                bountyContracts = [{ app_id: 1207, name: 'Contract app', owner_id: 700 }];
                _blockedOfferProjectsByOwner = {}; _blockedOfferProjectsFetchedAt = {};
                // This sheet is read-only; no production network calls or mutations are allowed.
                window.fetchBlockedOfferProjects = async () => ({});
                window.getMarketFeedState = () => ({ confirmedEmpty: true });
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById('tab-projects').classList.add('active');
                renderProjects(true);
            }, language);
            const activity = page.locator('#project-card-30 .pc-metric-card--google');
            assert.match(await activity.innerText(), language === 'en' ? /Total\s*36%/ : /Всего\s*36%/);
            assert.equal(await activity.locator('.pc-ring__done').innerText(), '16');
            const activityColors = await activity.evaluate(el => ({
                current: getComputedStyle(el.querySelector('.pc-ring__done')).color,
                percent: getComputedStyle(el.querySelector('.pc-metric-footer__value')).color,
                denominator: getComputedStyle(el.querySelector('.pc-ring__count')).color,
                overflow: el.scrollWidth > el.clientWidth + 1,
            }));
            assert.equal(activityColors.current, activityColors.percent);
            assert.notEqual(activityColors.current, activityColors.denominator, 'Only the current count is accented');
            assert.equal(activityColors.overflow, false);
            if (process.env.SHOWCASE_SCREENSHOT_DIR && language === 'en' && width === 390) {
                await activity.screenshot({ path: path.join(process.env.SHOWCASE_SCREENSHOT_DIR, 'total_today_activity_390_en.png') });
            }
            // Numerator and percentage stay consistent below the minimum and at 100% too.
            const colorsMatch = await page.evaluate(() => [0, 4, 12, 16, 44].every(done => {
                const project = { ...myProjects[0], today_checkins_count: done };
                const wrapper = document.createElement('div');
                wrapper.innerHTML = buildProjectDailyProgressRingHtml(project, { compactLabel: true });
                const expected = getProjectDailyProgressMeta(project).teamActivityColor;
                const probe = document.createElement('span'); probe.style.color = expected;
                return wrapper.querySelector('.pc-ring__done').style.color === probe.style.color;
            }));
            assert(colorsMatch);

            await page.evaluate(() => {
                document.getElementById('tab-projects').classList.remove('active');
                document.getElementById('tab-market').classList.add('active');
                renderMutualFeed(true); renderBountyFeed(true);
                document.getElementById('showcase-active-tests').classList.add('active');
            });
            assert.equal(await page.locator('#mutual-seeking-list .market-card').count(), 1, 'Only the other app remains in recruitment');
            assert.equal(await page.locator('#mutual-prelaunch-list .market-card, #bounty-list .market-card').count(), 0);
            assert.equal(await page.locator('#showcase-active-tests-list .showcase-active-test-item').count(), 4);
            assert.equal(await page.evaluate(() => mutualSeeking.length), 5, 'Rendering must not mutate the feed cache');
            const button = page.locator('#mutual-seeking-list .market-card[data-app-id="1204"] .btn');
            assert.equal(await button.innerText(), language === 'en' ? '🤝 Your exchange' : '🤝 Ваша взаимка');
            assert.doesNotMatch(await button.innerText(), /Details|Подробнее/);
            await button.click();
            const modal = page.locator('#project-select-modal');
            await page.waitForTimeout(400);
            assert.match(await modal.locator('.project-select-overview').innerText(), language === 'en'
                ? /wgfytunnel.*another app by this developer.*different app/s : /wgfytunnel.*ещё одно приложение.*другим приложением/s);
            assert.match(await modal.locator('.project-select-info').innerText(), /QuickSweep - Screenshot Tool\s+.*CryptoVPN/s);
            assert.equal(await modal.locator('.project-select-pair strong').innerText(), 'CryptoVPN');
            assert.equal(await modal.locator('#project-select-list button, #project-select-footer button').count(), 0);
            assert.equal(await modal.evaluate(el => el.querySelector('.modal-content').scrollWidth > el.querySelector('.modal-content').clientWidth + 1), false);
            if (process.env.SHOWCASE_SCREENSHOT_DIR && language === 'en' && width === 390) {
                await page.screenshot({ path: path.join(process.env.SHOWCASE_SCREENSHOT_DIR, 'showcase_existing_exchange_390_en.png') });
            }

            // The loaded task is enough to identify the pair while the roster is absent.
            await page.evaluate(async () => {
                closeProjectSelectModal(); myProjects[0].testers = []; renderMutualFeed(true);
                await openMutualExchangeDetails(1204, 554);
            });
            assert.equal(await modal.locator('.project-select-pair strong').innerText(), 'CryptoVPN');
            // With another free project, legitimate 2↔2 exchanges must still be possible.
            await page.evaluate(() => {
                closeProjectSelectModal();
                myProjects.push({ id: 31, name: 'QuickPaste', mode: 'mutual', status: 'active', limit_mutual: 12, testers: [] });
                renderMutualFeed(true);
                showProjectSelectModal(myProjects, 1204, 554, {});
            });
            assert.match(await button.getAttribute('onclick'), /createMutualOffer/);
            assert.equal(await modal.locator('#project-select-list button:not(:disabled)').count(), 1);
            // Direct participation and archived history are not made-up mutual pairs.
            const noFalsePair = await page.evaluate(() => {
                myTests = [];
                const direct = _getProjectOwnerLinkMeta({ id: 30, testers: [{ tester_id: 554, join_type: 'direct',
                    reciprocal_app_name: 'Stale name without a link' }] }, 554);
                const archived = _getProjectOwnerLinkMeta({ ...myProjects[0], status: 'archived', testers: [{
                    tester_id: 554, reciprocal_app_id: 1203, reciprocal_app_name: 'CryptoVPN' }] }, 554);
                return !direct.linkedProjectName && !archived;
            });
            assert(noFalsePair);
            assert.equal(writes, 0);
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Showcase/activity: real index RU/EN 360/390px, Total today/count color, no duplicate tests, exact app pair, task/roster fallback, direct/history safety and valid 2↔2 passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
