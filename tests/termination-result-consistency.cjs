const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const language of ['ru', 'en']) for (const width of [320, 390, 430]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [];
            page.on('pageerror', e => errors.push(e.message));
            await page.setContent('<div id="termination-sheet"><h3 id="term-title"></h3><p id="term-subtitle"></p><div id="term-body"></div></div>');
            for (const file of ['css/tokens.css', 'css/base.css', 'styles.css', 'css/mutual-balance-modal.css']) {
                await page.addStyleTag({ path: path.join(root, file) });
            }
            for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'js/termination-sheet.js']) {
                await page.addScriptTag({ path: path.join(root, file) });
            }
            await page.evaluate(language => {
                window.lang = language; window.currentLang = language;
                window.myTests = []; window.myProjects = [];
                window.API_BASE = 'https://fixture.local'; window.userId = 1;
                window.fixtureTest = { id: 1, name: 'Previous project with a long name', package_name: 'com.example.previous' };
                showTerminationResult({ mode: 'leave', appId: 1, test: fixtureTest });
            }, language);
            await page.locator('#term-comp-btn-1').evaluate(el => el.classList.add('is-clicked'));
            await page.evaluate(() => { closeTerminationResult(); beginTerminationSubmit(); });
            assert.equal(await page.locator('#term-progress-overlay .term-progress-spinner').count(), 1);
            assert.equal(await page.locator('#term-progress-overlay .term-comp-app-box').count(), 0);
            assert(!await page.locator('#term-progress-overlay').innerText().then(t => t.includes('Previous project')));
            await page.evaluate(() => showTerminationResult({ mode: 'leave', appId: 2,
                test: { id: 2, name: 'Current project with a long name / Текущее приложение', package_name: 'com.example.current' } }));
            const main = await page.locator('.term-comp-app-main').boundingBox();
            const btn = await page.locator('#term-comp-btn-2').boundingBox();
            const box = await page.locator('.term-comp-app-box').boundingBox();
            assert(main && btn && box);
            assert(btn.y >= main.y + main.height + 5, `${language}/${width}: button overlaps app`);
            assert(btn.x >= box.x && btn.x + btn.width <= box.x + box.width + 1);
            assert.equal(await page.locator('#term-comp-btn-2.is-clicked').count(), 0);
            assert.equal(await page.locator('#term-comp-app-box-1').count(), 0);
            assert((await page.locator('.term-comp-app-title').textContent()).includes('Current project'));
            // A late response/error for a previous sheet must not overwrite the next one.
            await page.evaluate(() => {
                closeTerminationResult();
                window.pendingStats = [];
                window.fetch = () => new Promise((resolve, reject) => pendingStats.push({ resolve, reject }));
                window.firstOpen = openTerminationSheet({ mode: 'leave', appId: 10 });
                closeTerminationResult();
                window.secondOpen = openTerminationSheet({ mode: 'leave', appId: 11 });
            });
            await page.evaluate(async () => {
                pendingStats[0].reject(new Error('old request failed'));
                await firstOpen;
            });
            assert(!(await page.locator('#term-body').innerText()).includes('old request'));
            await page.evaluate(async () => {
                pendingStats[1].resolve({ ok: false, json: async () => ({ status: 'error', code: 'stats_not_available' }) });
                await secondOpen;
            });
            assert.equal(errors.length, 0, errors.join('\n'));
            await page.close();
        }
        console.log('Termination: RU/EN 320/390/430, separate app/button geometry, sequential results, clean progress and stale response protection passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
