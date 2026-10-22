const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const days = Array.from({ length: 14 }, (_, i) => ({ day: i + 1,
    date: '2026-10-' + String(i + 8).padStart(2, '0'),
    active: [10,11,12,13,12,14,15,13,12,14,15,16,14,9][i], team: i < 3 ? 16 : 20, complete: true }));
(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const width of [360, 390]) for (const language of ['ru', 'en']) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            const errors = [];
            let mode = 'normal', requests = 0, writes = 0;
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(({ language }) => {
                window.__API_BASE__ = 'http://fixture.local/api';
                window.Telegram = { WebApp: {
                    initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture',
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                } };
            }, { language });
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (route.request().method() === 'POST') writes++;
                if (url.pathname.endsWith('/activity-history')) {
                    requests++;
                    if (mode === 'error') return route.fulfill({ status: 503, json: { status: 'error' } });
                    return route.fulfill({ json: { status: 'success', app_id: 30, run_iteration: 1,
                        minimum: 12, today: '2026-10-22', days: mode === 'empty' ? [] : mode === 'one' ? days.slice(0, 1)
                            : mode === 'zero' ? days.map(p => ({ ...p, active: 0 })) : mode === 'partial'
                            ? days.map(p => ({ ...p, team: null, complete: false })) : days, partial: mode === 'partial' } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { enabled: false, events: [] } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ contentType: 'application/javascript', body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file));
                const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
                return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            assert.equal(requests, 0, 'History must not be fetched on bootstrap/card polling');
            await page.evaluate(language => {
                lang = language;
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                myProjects = [{ id: 30, run_iteration: 1, name: 'QuickSweep', today_checkins_count: 15,
                    active_testers_count: 20, created_at: '2026-10-08T00:00:00Z', testers: [] }];
                openDailyProgressDetailsModal(30);
            }, language);
            const modal = page.locator('#daily-progress-modal');
            await page.locator('[data-activity-day="14"]').waitFor();
            await page.waitForTimeout(400); // existing sheet opening animation
            assert.equal(requests, 1);
            assert.equal(await modal.locator('.dah-column').count(), 14);
            assert.equal(await modal.locator('.dah-team').count(), 14);
            assert.match(await modal.locator('.dah-summary .pc-ring__count').innerText(), /9\s*\/\s*12/);
            assert.match(await modal.locator('.dah-summary-copy').innerText(), /20/);
            await modal.locator('[data-activity-day="7"]').click();
            assert.match(await modal.locator('.dah-summary .pc-ring__count').innerText(), /15\s*\/\s*12/);
            assert.equal(await modal.locator('[data-activity-day="7"]').getAttribute('aria-pressed'), 'true');
            assert.equal(requests, 1, 'Selecting a day is local and must not reload history');
            assert.equal(await modal.locator('.pc-ring[role="button"]').count(), 0, 'Summary ring must not reopen its own modal');
            await modal.locator('.modal-content').evaluate(el => { el.scrollTop = 0; });
            const geometry = await modal.evaluate(el => {
                const summary = el.querySelector('.dah-summary').getBoundingClientRect();
                const chart = el.querySelector('.dah-chart').getBoundingClientRect();
                const hints = el.querySelector('.dp-sheet__hints').getBoundingClientRect();
                const scroll = el.querySelector('.dah-scroll');
                return { noOverlap: summary.bottom <= chart.top && chart.bottom <= hints.top,
                    bodyOverflow: document.documentElement.scrollWidth > innerWidth,
                    scrollable: scroll.scrollWidth > scroll.clientWidth };
            });
            assert(geometry.noOverlap, JSON.stringify(geometry));
            assert.equal(geometry.bodyOverflow, false);
            assert(geometry.scrollable, 'Long period should scroll inside the chart, not squeeze bars');
            if (process.env.ACTIVITY_SCREENSHOT_DIR && width === 360 && language === 'ru') {
                await page.screenshot({ path: path.join(process.env.ACTIVITY_SCREENSHOT_DIR,
                    path.basename(process.env.ACTIVITY_SCREENSHOT_NAME || 'activity_history_360_ru.png')) });
            }
            await modal.locator('[data-activity-today]').click();
            assert.equal(await modal.locator('.dah-column[aria-pressed="true"]').count(), 0);
            await page.evaluate(() => closeDailyProgressDetailsModal());
            for (const nextMode of ['empty', 'one', 'zero', 'partial', 'error']) {
                mode = nextMode;
                await page.evaluate(() => openDailyProgressDetailsModal(30));
                if (mode === 'empty') {
                    await page.waitForFunction(() => document.querySelector('#daily-activity-history .dah-summary'));
                    assert.equal(await modal.locator('.dah-column').count(), 0);
                } else if (mode === 'one' || mode === 'zero') {
                    await page.locator('.dah-column').first().waitFor();
                    if (mode === 'one') {
                        assert.equal(await modal.locator('.dah-column').count(), 1);
                        assert((await modal.locator('.dah-column').first().boundingBox()).width <= 40);
                    } else {
                        assert.equal(await modal.locator('.dah-active').first().evaluate(el => el.getBoundingClientRect().height), 0);
                    }
                } else if (mode === 'partial') {
                    await page.locator('.dah-column').first().waitFor();
                    assert.equal(await modal.locator('.dah-team').count(), 0);
                    assert.match(await modal.locator('.dah-value').first().innerText(), /≥/);
                } else {
                    await page.waitForFunction(() => document.querySelector('.dah-loading')?.textContent.includes('retry')
                        || document.querySelector('.dah-loading')?.textContent.includes('повтора'));
                    assert.equal(await modal.locator('.dp-sheet__hint').count(), 3, 'An unavailable graph must not break recommendations');
                }
                await page.evaluate(() => closeDailyProgressDetailsModal());
                assert.equal(await modal.evaluate(el => el.classList.contains('active')), false);
            }
            assert.equal(writes, 0);
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Activity history: real index RU/EN 360/390px, layered bars/12-line, tap-linked ring, yesterday/today, inner scroll, empty/partial/error and read-only lazy load passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
