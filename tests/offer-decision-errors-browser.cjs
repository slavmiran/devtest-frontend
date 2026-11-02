const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const [language, width] of [['en', 1280], ['ru', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            let failure = 'offer_expired', writes = 0;
            let counterFailure = '', counterWrites = 0, counterPayload, releaseCounter;
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                window.__API_BASE__ = 'http://fixture.local/api'; localStorage.setItem('lang', language);
                window.Telegram = { WebApp: { initData: 'signed-fixture', platform: 'web',
                    initDataUnsafe: { user: { id: 880, username: 'fixture', language_code: language } },
                    themeParams: {}, colorScheme: 'dark', ready() {}, expand() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } };
            }, language);
            await page.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.pathname === '/api/offers' && route.request().method() === 'POST') {
                    counterWrites++;
                    counterPayload = route.request().postDataJSON();
                    if (counterFailure === 'hold') await new Promise(resolve => { releaseCounter = resolve; });
                    return route.fulfill({ json: counterFailure === 'offer_target_owner_mismatch'
                        ? { status: 'error', code: counterFailure }
                        : { status: 'success', mode: 'pending', offer: { offer_id: 2000 } } });
                }
                if (/^\/api\/offers\/\d+\/accept$/.test(url.pathname)) {
                    writes++;
                    if (failure === 'network') return route.abort('failed');
                    if (failure === 'html') return route.fulfill({ status: 502, contentType: 'text/html', body: '<h1>Bad gateway</h1>' });
                    if (failure === 'invalid-success') return route.fulfill({ status: 503, json: { status: 'success' } });
                    if (failure === '503-expired') return route.fulfill({ status: 503, json: { status: 'error', code: 'offer_expired' } });
                    return route.fulfill({ json: failure
                        ? { status: 'error', code: failure }
                        : { status: 'success', result: { offer_id: 82 } } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', events: [] } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'networkidle' });
            await page.evaluate(language => {
                lang = language; myTests = []; myProjects = [];
                incomingOffers = [{ offer_id: 82, owner_id: 880, proposer_id: 42, target_app_id: 1217, proposer_app_id: 1365,
                    status: 'pending', created_at: new Date().toISOString(), proposer_full_name: 'Ed', proposer_app_name: 'EvoBlob', target_app_name: 'Esnaf Kasa' }];
                Object.assign(App, { runtimeConfigStatus: 'ready', runtimeConfigApiBase: API_BASE });
                window.loadTasks = async () => {}; window.loadIncomingOffers = async () => {};
                window.loadProjects = async () => {}; window.renderTests = () => {};
                window.__renderIncomingOffers = renderIncomingOffers; window.renderIncomingOffers = () => {};
                _offersLoadedOnce = true; _offersInFlight = null;
                bountyApplications = []; _bountyAppsInFlight = null; _bountyAppsLoadedOnce = true;
                document.body.innerHTML = '<section id="offers-section" style="max-width:600px;margin:20px auto"><span id="offers-count"></span><div id="offers-carousel"></div></section>';
                window.__renderIncomingOffers(true);
                window.showToast = () => { throw new Error('Toast unavailable in this host'); };
            }, language);
            let offerId = 82;
            const terminalCodes = ['offer_expired', 'mutual_limit_reached', 'app_not_accepting_new_testers',
                'mutual_target_already_linked', 'mutual_contract_active_conflict', 'offer_forbidden',
                'offer_not_pending', 'offer_not_found', 'offer_app_not_found', 'offer_inactive_app', 'offer_owner_mismatch'];
            for (failure of [...terminalCodes, 'offer_accept_failed', 'html', 'network', 'invalid-success', '503-expired']) {
                await page.evaluate(id => { incomingOffers[0].offer_id = id; window.__renderIncomingOffers(true); }, offerId++);
                const terminal = terminalCodes.includes(failure);
                const before = writes;
                await page.locator('.bounty-app-accept-btn').click();
                await page.waitForFunction(terminal => document.querySelector('.offer-decision-error')?.textContent.length > 0 &&
                    (terminal ? !!document.querySelector('.offer-dismiss-btn') : !document.querySelector('.bounty-app-accept-btn')?.disabled), terminal);
                assert.equal(writes, before + 1);
                assert(await page.locator('.offer-decision-error').isVisible());
                assert(await page.locator('.offer-card').isVisible());
                const text = await page.locator('.offer-decision-error').textContent();
                assert(!text.includes('<h1>') && text.length > 10, 'Never display HTML or an empty failure');
                if (failure === 'offer_expired') assert.match(text, language === 'en' ? /expired/i : /ист[её]к/i);
                if (failure === 'mutual_limit_reached') assert.match(text, language === 'en' ? /limit|slot/i : /лимит|слот/i);
                if (failure === 'app_not_accepting_new_testers') assert.match(text, language === 'en' ? /isolated|not accepting/i : /изолирован|не принимает/i);
                await page.evaluate(() => window.__renderIncomingOffers(true));
                assert.equal(await page.locator('.offer-decision-error').count(), 1,
                    JSON.stringify(await page.evaluate(() => ({ offers: incomingOffers, failures: _offerDecisionErrors }))));
                assert.equal(await page.locator('.offer-decision-error').textContent(), text, 'A background card render must preserve the reason');
                if (terminal) {
                    assert.equal(await page.locator('.bounty-app-accept-btn, .bounty-app-reject-btn').count(), 0);
                    assert.match(await page.locator('.offer-auto-hide').innerText(), /30/);
                    assert.equal(await page.locator('.offer-counter-btn').count(), failure === 'offer_expired' ? 1 : 0);
                    await page.locator('.offer-dismiss-btn').click();
                    await page.evaluate(() => window.__renderIncomingOffers(true));
                    assert.equal(await page.locator('.offer-card').count(), 0, 'Acknowledged refusals stay hidden when the server still returns pending');
                    assert.equal(await page.locator('#offers-section').isVisible(), false, 'No empty inbox header or stale counter after dismissal');
                    await page.evaluate(() => { _dismissedOffersByUser = Object.create(null); window.__renderIncomingOffers(true); });
                    assert.equal(await page.locator('.offer-card').count(), 0, 'Dismissal survives rereading browser storage');
                    assert.equal(await page.evaluate(() => localStorage.getItem('dismissed_mutual_offers_v1_881')), null,
                        'Acknowledgment must not write another account\'s hidden offers');
                } else {
                    assert.equal(await page.locator('.offer-dismiss-btn').count(), 0);
                    assert.equal(await page.locator('.bounty-app-accept-btn').isEnabled(), true);
                }
            }
            await page.locator('.offer-card').screenshot({ path: path.resolve(root, '../artifacts/offer-decision-error-' + language + '.png') });
            await page.evaluate(() => { window.showToast = () => {}; });
            failure = '';
            await page.locator('.bounty-app-accept-btn').click();
            await page.waitForFunction(() => !document.querySelector('.offer-card'));
            await page.evaluate(() => {
                window.renderIncomingOffers = () => window.__renderIncomingOffers(true);
                incomingOffers[0].offer_id = 999;
                incomingOffers[0].created_at = new Date(Date.now() - 6 * 3600000).toISOString();
                const nativeInterval = window.setInterval;
                window.setInterval = callback => { window.__offerTick = callback; return 1; };
                window.__renderIncomingOffers(true);
                window.setInterval = nativeInterval;
                window.__offerTick();
            });
            assert.match(await page.locator('.offer-expire').innerText(), language === 'en' ? /expired/i : /ист[её]к/i);
            assert.equal(await page.locator('.offer-dismiss-btn').count(), 1, 'Timer expiry also offers acknowledgment');
            await page.evaluate(() => {
                window.__expiredOffer = { ...incomingOffers[0] };
                incomingOffers = [];
                window.__renderIncomingOffers(true);
            });
            assert.equal(await page.locator('.offer-counter-btn').count(), 1, 'Polling without the expired offer must preserve its counter-offer actions');
            await page.locator('.offer-card').screenshot({ path: path.resolve(root, '../artifacts/offer-expired-counter-' + language + '.png') });
            counterFailure = 'offer_target_owner_mismatch';
            await page.locator('.offer-counter-btn').click();
            await page.waitForFunction(() => !document.querySelector('.offer-counter-btn').disabled);
            assert.equal(counterWrites, 1);
            assert.equal(counterPayload.owner_id, 42);
            assert.equal(counterPayload.target_app_id, 1365);
            assert.equal(counterPayload.proposer_app_id, 1217);
            assert(counterPayload.init_data, 'Standard authenticated offer endpoint is used');
            assert.equal(await page.locator('.offer-counter-btn').isEnabled(), true, 'Failed counter-offer can be retried');
            counterFailure = 'hold';
            await page.locator('.offer-counter-btn').click();
            await page.waitForFunction(() => document.querySelector('.offer-counter-btn').disabled);
            await page.evaluate(() => { sendExpiredOfferCounter(999); _offerTerminalCards['999'].deadline = Date.now() - 1; _tickOfferDismissals(); window.__renderIncomingOffers(true); });
            assert.equal(counterWrites, 2, 'Double click sends only one counter-offer');
            assert.equal(await page.locator('.offer-card').count(), 1, 'Auto-hide pauses while a counter-offer is in flight');
            await page.waitForTimeout(100);
            releaseCounter();
            await page.waitForFunction(() => !document.querySelector('.offer-card'));
            await page.evaluate(() => {
                incomingOffers = [{ ...window.__expiredOffer, offer_id: 1000 }];
                window.__renderIncomingOffers(true);
                _offerTerminalCards['1000'].deadline = Date.now() + 12000;
                _tickOfferDismissals();
            });
            assert.match(await page.locator('.offer-auto-hide').innerText(), /12/);
            await page.evaluate(() => { window.__renderIncomingOffers(true); });
            assert.match(await page.locator('.offer-auto-hide').innerText(), /12/, 'Redraw must not restart the 30 second countdown');
            await page.evaluate(() => { _offerTerminalCards['1000'].deadline = Date.now() - 1; _tickOfferDismissals(); });
            await page.waitForFunction(() => !document.querySelector('.offer-card'));
            assert.equal(await page.locator('#offers-section').isVisible(), false);
            assert.equal(counterWrites, 2, 'Auto-hide never sends a proposal by itself');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Offer decisions RU/EN: terminal reasons + acknowledgment, account-scoped dismissal, background redraw, timer expiry, HTTP 5xx/network retries and success passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
