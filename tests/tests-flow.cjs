const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, '../artifacts/tests-flow-20261105');
fs.mkdirSync(out, { recursive: true });
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tab = index.match(/<div id="tab-tests"[\s\S]*?(?=\s*<!-- TAB 3)/)[0];
const styles = [...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map((match) => match[1]);

function fixture(mode) {
    const at = '2026-11-05T02:00:00Z';
    const terms = { duration_days: 14, install_source: 'link', control_days: [1, 7, 14], reviews: { mode: 'off' }, queue_definition: { activity: { enabled: false } } };
    const leg = (id, mine) => ({ id, mine, app_id: mine ? 200 : 100, state: 'READY', timezone: 'Asia/Bangkok', unlock_at: at, install_due_at: '2026-11-06T00:20:00Z', install_window_seconds: 86400, sla_active_seconds: 6000, terms: structuredClone(terms), dropoff_risk: { cancel_allowed: false } });
    const row = { offer_id: 7, owner_id: 1, proposer_id: 2, target_app_id: 100, proposer_app_id: 200, target_app_name: 'Firefox', proposer_app_name: 'OneNote', status: 'accepted', as_of: at, project_phases: [{ app_id: 100, name: 'Firefox', phase: 'live', market: { tier: 2 } }, { app_id: 200, name: 'OneNote', phase: 'live', market: { tier: 3 } }], partner: { app_id: 200, name: 'OneNote', package_name: 'com.example.onenote', phase: 'live', market: { tier: 3 }, owner: { username: 'dev_mira', reliability_index: 94, contribution_score: 57 } }, deal: { revision: 1, can_accept: false, asymmetric: false, balancing_bust: 0, target: { ...terms, campaign_id: 5 }, proposer: { ...terms, campaign_id: 6 } }, legs: [leg(20, true), leg(10, false)] };
    if (mode === 'incoming') { row.status = 'pending'; row.legs = []; row.deal.can_accept = true; }
    if (mode === 'queued') { row.legs[0].state = 'SCHEDULED_COOLDOWN'; row.legs[0].unlock_at = '2026-11-05T04:59:58Z'; }
    if (mode === 'waiting_partner') { row.legs[0].state = 'INSTALLED'; row.legs[0].confirmed_at = at; row.legs[1].sla_active_seconds = 86401; row.legs[1].dropoff_risk.cancel_allowed = true; }
    return row;
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const lang of ['ru', 'en']) {
            for (const width of [360, 390, 430]) {
                const page = await browser.newPage({ viewport: { width, height: 860 } });
                const errors = [];
                let current = fixture('incoming');
                page.on('pageerror', (err) => errors.push(err.message));
                await page.route('http://tasks.test/**', async (route) => {
                    const url = new URL(route.request().url());
                    if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', result: url.pathname === '/api/live-exchanges' ? [current] : [] } });
                    return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#0e141b;color:#e8edf7">' + tab + '<article id="test-card-200" class="card"><div class="lx-partner-slot" data-partner-slot="200"></div>Daily</article></body></html>' });
                });
                await page.goto('http://tasks.test/');
                for (const file of styles) {
                    const full = path.join(root, file);
                    if (fs.existsSync(full)) await page.addStyleTag({ path: full });
                }
                for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'js/live-market-ui.js', 'js/live-deal-ui.js', 'js/live-queue-ui.js', 'js/live-exchanges.js', 'js/live-contracts.js', 'ui/ui-tests.js']) {
                    await page.addScriptTag({ path: path.join(root, file) });
                }
                await page.evaluate((language) => {
                    window.lang = language;
                    window.API_BASE = '/api';
                    window.getTelegramInitDataRaw = () => 'signed-test';
                    window.tg = { initDataUnsafe: { user: { id: 1 } }, HapticFeedback: { selectionChanged() {}, impactOccurred() {} } };
                    window.myTests = [];
                    window.refreshMyTestsNow = async () => {};
                    window.renderIncomingOffers = function() {};
                    localStorage.removeItem('dth.tests.filter');
                    LiveExchanges.mount();
                }, lang);
                const place = async (mode) => {
                    current = fixture(mode);
                    await page.evaluate(() => LiveExchanges.load(true));
                    await page.waitForFunction(() => !document.querySelector('#tests-queue-section [data-lx-refresh]').disabled);
                    await page.evaluate(() => { if (typeof paintLivePartnerBanners === 'function') paintLivePartnerBanners(); });
                };
                await place('incoming');
                assert.equal(await page.locator('#live-incoming-carousel .lx-card').count(), 1, 'Incoming offer stays in the offers carousel');
                assert.equal(await page.locator('#install-queue-scroll .lx-card').count(), 0);
                assert.equal(await page.locator('#tests-queue-section').evaluate((node) => node.classList.contains('is-filter-hidden')), true);
                await place('queued');
                assert.equal(await page.locator('#install-queue-scroll .lx-card').count(), 1, 'Cooldown stays in the install queue');
                assert.equal(await page.locator('#install-queue-scroll .is-ready').count(), 0);
                assert.equal(await page.locator('#tests-list .lx-card').count(), 0);
                await place('ready');
                const ready = page.locator('#install-queue-scroll .lx-card.is-ready');
                assert.equal(await ready.count(), 1, 'Ready install stays in the queue and is highlighted');
                assert.match(await ready.innerText(), lang === 'ru' ? /можно устанавливать/ : /can install/);
                const box = await ready.evaluate((node) => ({ card: node.getBoundingClientRect().width, view: innerWidth }));
                assert.ok(box.card < box.view - 24, 'Queue card peeks the next item instead of filling the screen');
                await place('waiting_partner');
                assert.equal(await page.locator('#install-queue-scroll .lx-card, #live-incoming-carousel .lx-card').count(), 0, 'Installed exchange does not stay above the task list');
                assert.equal(await page.locator('[data-partner-slot="200"] .lx-partner-banner').count(), 1, 'Partner wait is a banner inside the task card');
                assert.equal(await page.locator('[data-partner-slot="200"] [data-lx-action="cancel"]').count(), 1);
                await page.evaluate(() => document.querySelector('[data-tests-filter="today"]').click());
                assert.equal(await page.locator('#tests-queue-section').evaluate((node) => node.classList.contains('is-filter-hidden')), true, 'Today hides a cooldown-only queue');
                await place('ready');
                await page.evaluate(() => document.querySelector('[data-tests-filter="today"]').click());
                assert.equal(await page.locator('#tests-queue-section.is-filter-hidden').count(), 0, 'Today keeps a ready install visible');
                await page.evaluate(() => document.querySelector('[data-tests-filter="offers"]').click());
                assert.equal(await page.locator('#tests-today-wrap').evaluate((node) => node.classList.contains('is-filter-hidden')), true);
                const filters = await page.locator('.tests-filter-track button').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().width));
                assert.ok(filters.every((item) => item < width * 0.92), 'Filter chips stay content-sized and scroll instead of stretching');
                assert.ok(filters.reduce((sum, item) => sum + item, 0) > width, 'Filter track overflows into a horizontal strip');
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No page overflow');
                await page.screenshot({ path: path.join(out, `flow-${lang}-${width}.png`), fullPage: true });
                assert.deepEqual(errors, []);
                await page.close();
            }
        }
        console.log('Tests flow: offers, queue, ready highlight, partner banner and filters passed RU/EN × 360/390/430.');
    } finally {
        await browser.close();
    }
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
