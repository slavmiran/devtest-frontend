const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const language of ['ru', 'en']) for (const width of [360, 390, 430]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            const errors = [], claims = [], syncs = [];
            let fail = true, releaseClaim, releaseSync;
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                window.__API_BASE__ = 'http://fixture.local/api';
                window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 880, language_code: 'en' } }, initData: 'fixture',
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } };
            });
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.pathname.endsWith('/claim_grant')) {
                    claims.push(route.request().postDataJSON());
                    const reply = fail
                        ? { status: 409, json: { status: 'error', code: 'grant_not_ready' } }
                        : { json: { status: 'success', amount: 200 } };
                    if (url.pathname.endsWith('/301/claim_grant')) {
                        return new Promise(resolve => { releaseClaim = resolve; })
                            .then(() => route.fulfill({ json: { status: 'success', amount: 125 } }));
                    }
                    return route.fulfill(reply);
                }
                if (url.pathname === '/api/projects/90/sync') {
                    syncs.push(route.request().postDataJSON());
                    return new Promise(resolve => { releaseSync = resolve; })
                        .then(() => route.fulfill({ json: { status: 'success', last_sync_date: '2026-11-08' } }));
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { events: [], enabled: false } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/');
            await page.addStyleTag({ content: '#no-username-overlay{display:none!important}' });
            await page.evaluate(language => {
                lang = language;
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById('tab-tests').classList.add('active');
                window.getResolvedTestingDay = test => test.testing_days;
                window.loadProjects = async () => {};
                window.grantToasts = [];
                window.showToast = value => window.grantToasts.push(value);
                window.cardExits = 0;
                window.animateTestCardOut = async () => { window.cardExits++; };
                window.actionAnimations = 0;
                const animate = Element.prototype.animate;
                Element.prototype.animate = function(...args) {
                    if (this.id === 'actions-30') window.actionAnimations++;
                    return animate.apply(this, args);
                };
                myTests = [{ id: 30, progress_id: 300, run_iteration: 1, name: 'Invoices: Maker & Generator', package: 'com.example.invoices',
                    owner_id: 11, owner_full_name: 'Roman', owner_username: 'developer', join_type: 'mutual', status: 'daily',
                    app_status: 'active', progress_status: 'active', testing_days: 15, paid_protection_days: 8,
                    start_date: '2026-10-12', daily_timeline: '11111111111111', checkins_count: 14, skips_count: 0,
                    isReadyToClaim: true, grant_claimed: false, control_proof_catchups: [] }];
                renderTests(true);
            }, language);
            assert.equal(await page.locator('#actions-30 button').count(), 1, 'Only the claim action appears while a grant is ready');
            const before = await page.locator('#test-card-30').boundingBox();
            await page.evaluate(() => claimGrant(300, 30));
            assert.equal(await page.locator('#btn-claim-30').isEnabled(), true, 'Rejected claim remains retryable');
            assert.equal(await page.evaluate(() => myTests[0].grant_claimed), false);
            assert.equal(await page.evaluate(() => cardExits), 0);
            fail = false;
            await page.evaluate(() => claimGrant(300, 30));
            const card = page.locator('#test-card-30');
            assert.equal(await card.count(), 1);
            assert.equal(await page.evaluate(() => cardExits), 0, 'Continuing card never runs its exit animation');
            assert.equal(await page.evaluate(() => actionAnimations), 1);
            const after = await card.boundingBox();
            assert(Math.abs(before.y - after.y) < 1, 'The card stays at the same position');
            const play = card.locator('.extension-open-btn');
            const confirm = card.locator('#btn-confirm-30');
            const clip = card.locator('.split-btn-options');
            assert.equal(await play.innerText(), '', 'Open button contains only its icon');
            assert(await play.getAttribute('aria-label'));
            const [p, c, a] = await Promise.all([play.boundingBox(), confirm.boundingBox(), clip.boundingBox()]);
            assert(p.x < c.x && c.x < a.x);
            assert(Math.abs(p.y - c.y) < 1 && Math.abs(c.y - a.y) < 1, 'All three actions share one row');
            assert(a.x + a.width <= width, 'Actions fit a narrow phone');
            assert.equal(await confirm.evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Installed label fits without clipping');
            assert.equal(await page.locator('#btn-claim-30').count(), 0);
            assert(claims.every(body => body.init_data === 'fixture' && body.tester_id === 880));
            await page.evaluate(() => { window.openedPackage = null; window._openStorePackage = (pkg, id) => { openedPackage = { pkg, id }; }; });
            await play.click();
            assert.deepEqual(await page.evaluate(() => openedPackage), { pkg: 'com.example.invoices', id: 30 });
            if (language === 'ru' && width === 360) await card.screenshot({ path: path.resolve(root, '../artifacts/paid-grant-actions-ru-360.png') });
            await page.emulateMedia({ reducedMotion: 'reduce' });
            await page.evaluate(async () => {
                myTests[0].isReadyToClaim = true;
                renderTests(true);
                await claimGrant(300, 30);
            });
            assert.equal(await page.evaluate(() => actionAnimations), 1, 'Reduced-motion skips the transition');
            await page.emulateMedia({ reducedMotion: 'no-preference' });
            await page.evaluate(async () => {
                myTests[0].app_status = 'archived'; myTests[0].isReadyToClaim = true;
                renderTests(true);
                await claimGrant(300, 30);
            });
            assert.equal(await page.evaluate(() => cardExits), 1, 'Closed projects retain normal card removal');
            assert.equal(await card.count(), 0);
            if (width === 360) {
                await page.evaluate(() => {
                    myTests = [31, 32].map(id => ({ id, progress_id: id + 270, run_iteration: 1, name: 'Grant ' + id,
                        package: 'com.example.grant' + id, owner_id: 11, join_type: 'mutual', status: 'daily',
                        app_status: 'active', progress_status: 'active', testing_days: 15, paid_protection_days: 8,
                        start_date: '2026-10-12', daily_timeline: '11111111111111', checkins_count: 14,
                        isReadyToClaim: true, grant_claimed: false, control_proof_catchups: [] }));
                    renderTests(true);
                });
                const beforeBatch = claims.length;
                await page.locator('#btn-claim-31').click();
                await page.locator('#btn-claim-31[aria-busy="true"] .btn-spinner').waitFor();
                await page.evaluate(() => { void claimGrant(301, 31); renderTests(true); });
                assert.equal(await page.locator('#btn-claim-31').isDisabled(), true);
                await page.locator('#btn-claim-32').click();
                await page.locator('#btn-claim-32.is-claimed').waitFor();
                releaseClaim();
                await page.waitForFunction(() => grantToasts.some(text => text.includes('325.0 $BUST')));
                assert.equal(claims.length, beforeBatch + 2);
                assert.equal(await page.locator('#btn-claim-31, #btn-claim-32').count(), 0);

                await page.evaluate(() => {
                    const panel = document.getElementById('admin-settings-panel');
                    window.currentUser = { user_id: userId, is_admin: false };
                    syncAdminSettingsPanel();
                    if (!panel.hidden) throw new Error('Admin panel shown to a regular user');
                    window.currentUser.is_admin = true;
                    syncAdminSettingsPanel();
                    if (panel.hidden || adminFastConfirmEnabled()) throw new Error('Incorrect default admin setting');
                    setAdminFastConfirm(true);
                    if (!adminFastConfirmEnabled()) throw new Error('Admin preference not enabled');
                    setAdminFastConfirm(false);

                    _syncProjectId = 90;
                    myProjects = [{ id: 90, name: 'Sync test' }];
                    visibilityStats = { balance_bust: 1000 };
                    const center = document.getElementById('protection-center');
                    center.classList.add('active');
                    document.getElementById('protection-center-body').innerHTML =
                        '<input id="ppc-slider" type="range" min="1" max="14" value="8" data-platform-day="12">' +
                        '<textarea id="ppc-message-input"></textarea><button id="ppc-submit-btn" type="button" class="ppc-submit-btn" onclick="saveProjectSync()">Sync & Pay</button>';
                });
                await Promise.all([
                    page.waitForRequest(req => req.url().endsWith('/api/projects/90/sync')),
                    page.locator('#ppc-submit-btn').click(),
                ]);
                await page.locator('#ppc-submit-btn[aria-busy="true"] .btn-spinner').waitFor();
                await page.evaluate(() => saveProjectSync());
                assert.equal(await page.locator('#ppc-submit-btn').isDisabled(), true);
                assert.equal(syncs.length, 1);
                releaseSync();
                await page.waitForFunction(() => !document.getElementById('protection-center').classList.contains('active'));
            }
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Paid grants, sync payment and admin settings: RU/EN fixtures passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
