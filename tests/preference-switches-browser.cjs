const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://fixture.local/**', route => route.fulfill({ contentType: 'text/html', body:
            '<div id="card"></div><div data-pc-ping-drawer="30" class="is-on"><button class="pc-quick-tile__toggle" onclick="pcProofPingToggleDot(30,this)">Notifications</button></div>' +
            '<label><input id="proof-ping-master-toggle" type="checkbox" checked onchange="pcProofPingMasterToggle(this)">Master</label><input id="settings-proof-ping-toggle" type="checkbox" checked>' }));
        await page.goto('http://fixture.local/');
        await page.evaluate(() => {
            window.myProjects = []; window.visibilityStats = {}; window.PROJECTS_CACHE_KEY = 'fixture-projects';
            window.API_BASE = '/api'; window.tg = { initData: 'fixture' }; window.App = {};
            window.pendingRequests = [];
            window.fetch = () => new Promise(resolve => pendingRequests.push(resolve));
        });
        for (const file of ['js/app-api.js', 'js/proof-ping.js']) await page.addScriptTag({ path: path.join(root, file) });
        await page.evaluate(() => {
            window.renderFixture = enabled => {
                myProjects = _mapProjectsFromApi({ projects: [{ app_id: 30, name: 'Fixture', proof_ping_enabled: enabled }] },
                    window.readRevision == null ? ProofPing.captureProjectRevision() : readRevision);
                document.getElementById('card').innerHTML = ProofPing.blockHtml(myProjects[0]);
            };
            renderFixture(true);
            window.readRevision = ProofPing.captureProjectRevision();
        });
        await page.locator('#card .pc-dotswitch').click();
        assert.equal(await page.locator('#card .pc-dotswitch').getAttribute('aria-checked'), 'false');
        assert.equal(await page.locator('#card .pc-dotswitch').isDisabled(), true);
        assert.equal(await page.locator('.pc-quick-tile__toggle').isDisabled(), true, 'Mirrored drawer control must also be busy');
        await page.evaluate(() => renderFixture(true)); // Old poll returns while saving.
        assert.equal(await page.locator('#card .pc-dotswitch').getAttribute('aria-checked'), 'false');
        assert.equal(await page.locator('#card .pc-dotswitch').isDisabled(), true);
        await page.evaluate(() => pendingRequests.shift()({ ok: true, json: async () => ({ status: 'success', proof_ping_enabled: false }) }));
        await page.waitForFunction(() => !document.querySelector('#card .pc-dotswitch').disabled);
        await page.evaluate(() => renderFixture(true)); // Old poll returns after saving.
        assert.equal(await page.locator('#card .pc-dotswitch').getAttribute('aria-checked'), 'false');
        assert.equal(await page.locator('.pc-quick-tile__toggle').getAttribute('aria-checked'), 'false');
        const cached = await page.evaluate(() => JSON.parse(localStorage.getItem(PROJECTS_CACHE_KEY)).projects[0].proof_ping_enabled);
        assert.equal(cached, false);
        await page.locator('#proof-ping-master-toggle').uncheck();
        assert.equal(await page.locator('#settings-proof-ping-toggle').isChecked(), false);
        assert.equal(await page.locator('#proof-ping-master-toggle').isDisabled(), true);
        await page.evaluate(() => pendingRequests.shift()({ ok: true, json: async () => ({ status: 'success', proof_ping_master_enabled: false }) }));
        await page.waitForFunction(() => !document.getElementById('proof-ping-master-toggle').disabled);
        assert.equal(await page.locator('#settings-proof-ping-toggle').isChecked(), false);
        assert.deepEqual(errors, []);
        console.log('Browser switches: click, mirrored controls, slow save, stale rerenders, cache and master switch passed');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
