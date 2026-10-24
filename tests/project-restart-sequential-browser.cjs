const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const phase2 = process.argv.includes('--phase2');
const sources = new Map();
const temporary = phase2 ? fs.mkdtempSync(path.join(os.tmpdir(), 'restart-phase2-')) : null;
const changed = new Set(['ui/ui-projects.js', 'css/wizard.css']);
// Override the base when checking an already committed fix against an older Phase-2.
const mergeBase = process.env.RESTART_MERGE_BASE || 'HEAD';
function source(file) {
    if (sources.has(file)) return sources.get(file);
    let content;
    if (!phase2) content = fs.readFileSync(path.join(root, file));
    else {
        content = execFileSync('git', ['show', 'Phase-2_front:' + file], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
        if (changed.has(file)) {
            // Exercise an actual three-way forward merge without touching either branch.
            const ours = path.join(temporary, 'phase2');
            const base = path.join(temporary, 'base');
            const theirs = path.join(temporary, 'dev');
            fs.writeFileSync(ours, content.toString().replace(/\r\n/g, '\n'));
            fs.writeFileSync(base, execFileSync('git', ['show', mergeBase + ':' + file], { cwd: root, maxBuffer: 8 * 1024 * 1024 }).toString().replace(/\r\n/g, '\n'));
            fs.writeFileSync(theirs, fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n'));
            try {
                content = execFileSync('git', ['merge-file', '-p', ours, base, theirs], { maxBuffer: 8 * 1024 * 1024 });
            } catch (error) {
                throw new Error('Phase-2 merge conflict in ' + file + ':\n' + String(error.stdout).match(/<<<<<<<[\s\S]*?>>>>>>>[^\n]*/g)?.join('\n'));
            }
        }
    }
    sources.set(file, content);
    return content;
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const language of ['ru', 'en']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 850 } });
            const errors = [], requests = [];
            let failNext = false, hold = false, release;
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                window.__API_BASE__ = 'http://fixture.local/api';
                window.Telegram = { WebApp: {
                    initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture',
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                } };
            }, language);
            await page.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (/\/apps\/\d+\/restart$/.test(url.pathname) || url.pathname === '/api/pipeline/request-retest') {
                    requests.push({ url: url.pathname, body: route.request().postDataJSON() });
                    if (hold) await new Promise(resolve => { release = resolve; });
                    const failed = failNext;
                    failNext = false;
                    return route.fulfill({ status: failed ? 500 : 200, json: failed
                        ? { status: 'error', code: 'restart_failed' }
                        : { status: 'success', app_id: Number(url.pathname.split('/').at(-2)), run_iteration: 2 } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { enabled: false, events: [] } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ contentType: 'application/javascript', body: '' });
                const file = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
                assert(path.resolve(root, file).startsWith(root + path.sep));
                const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
                return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: source(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(language => {
                lang = language;
                updateTranslations(language);
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                visibilityStats = { balance_bust: 10000 };
                archivedProjects = [31, 32, 33, 34].map(app_id => ({ app_id, name: 'Archived ' + app_id,
                    package_name: 'com.fixture.app' + app_id, mode: 'mutual', limit_mutual: 12,
                    test_mode: 'google_group', google_group_url: 'https://groups.google.com/g/google-play-dev-test' }));
                myProjects = [{ id: 99, name: 'Active project', package: 'com.fixture.active', mode: 'mutual',
                    is_setup_completed: true, google_group_url: 'https://groups.google.com/g/google-play-dev-test' }];
                // Keep list refreshes local; use the real editor, validation, submit and restart request.
                loadProjects = async () => {};
                loadArchivedProjects = async () => {};
                switchTab = () => {};
                renderArchivedProjects = () => {};
                renderProjects = () => {};
                _highlightProjectCard = () => {};
                showToast = () => {};
                window.apiErrors = [];
                handleApiError = code => apiErrors.push(code);
                saveEmailProjectsPreference = async () => ({ ok: true });
            }, language);
            const open = async id => {
                await page.evaluate(id => openRestartArchivedModal(id), id);
                await page.locator('#edit-project-modal.active').waitFor();
                assert.equal(await page.locator('#t-editSave').isEnabled(), true, 'Each project must have a usable restart button');
                assert.equal(await page.locator('#t-editCancel').isEnabled(), true, 'Cancel must not retain the previous restart lock');
            };
            const waitClosed = async () => {
                await page.waitForFunction(() => !document.querySelector('#edit-project-modal').classList.contains('active'));
                await page.waitForFunction(() => projectToEdit === null);
            };
            for (const id of [31, 32]) {
                await open(id);
                await page.locator('#t-editSave').click();
                await waitClosed();
                assert.equal(await page.locator('#t-editSave').getAttribute('aria-busy'), null, 'Success must release the shared button');
                assert.equal(await page.locator('#t-editSave').getAttribute('data-processing-lock'), null);
                assert.equal(requests.at(-1).url, '/api/apps/' + id + '/restart');
                assert.equal(requests.at(-1).body.name, 'Archived ' + id);
            }
            assert.equal(requests.length, 2);
            // An ordinary settings dialog uses the same DOM controls.
            await page.evaluate(() => openEditModal(99));
            assert.equal(await page.locator('#t-editSave').isEnabled(), true);
            assert.equal(await page.locator('#t-editCancel').isEnabled(), true);
            await page.locator('#t-editCancel').click();
            await waitClosed();

            failNext = true;
            await open(33);
            await page.locator('#t-editSave').click();
            await page.waitForFunction(() => apiErrors.length === 1 && !document.getElementById('t-editSave').disabled);
            assert.equal(await page.locator('#edit-project-modal.active').count(), 1, 'A failed request leaves settings open for retry');
            hold = true;
            await page.locator('#t-editSave').click();
            await page.waitForFunction(() => document.getElementById('t-editSave').classList.contains('is-processing'));
            await page.evaluate(() => { saveProjectEdit(); saveProjectEdit(); });
            await page.waitForTimeout(80);
            assert.equal(requests.length, 4, 'While pending, extra submissions must not restart twice');
            release();
            hold = false;
            await waitClosed();
            // Closing animation cleanup must not clear the next project's settings.
            await open(34);
            await page.evaluate(() => { closeEditModal(null, { force: true }); openRestartArchivedModal(34); });
            await page.waitForTimeout(350);
            assert.equal(await page.evaluate(() => projectToEdit), 34);
            assert.equal(await page.locator('#edit-name').inputValue(), 'Archived 34');
            await page.locator('#t-editSave').click();
            await waitClosed();
            assert.equal(requests.length, 5);
            if (phase2) {
                await page.evaluate(() => {
                    archivedProjects.push(...[81, 82].map(app_id => ({ app_id, name: 'Moderation ' + app_id,
                        phase: 'moderation', run_iteration: 3, mode: 'hybrid', limit_mutual: 12,
                        limit_bounty: 2, bounty_per_tester: 200, min_android_version: 11,
                        test_mode: 'google_group', google_group_url: 'https://groups.google.com/g/google-play-dev-test' })));
                });
                // Phase-2 routes moderation retest through its own confirmation and signed API.
                for (const id of [81, 82]) {
                    await page.evaluate(id => handleModerationRequestRetest(id), id);
                    assert.equal(await page.locator('#t-editSave').isEnabled(), true);
                    assert.equal(await page.locator('#t-editCancel').isEnabled(), true);
                    assert.equal(await page.evaluate(() => getEditModalRetestContext().expectedRun), 3);
                    await page.locator('#t-editSave').click();
                    await page.locator('#moderation-retest-modal.active').waitFor();
                    assert(await page.evaluate(() => Number(getComputedStyle(document.getElementById('moderation-retest-modal')).zIndex)
                        > Number(getComputedStyle(document.getElementById('edit-project-modal')).zIndex)), 'Phase-2 confirmation must be above settings');
                    assert.match(await page.locator('.moderation-retest-sheet__cost').innerText(), /400/);
                    // The editor cannot be closed behind an in-progress moderation confirmation.
                    await page.evaluate(() => closeEditModal(null, { force: true }));
                    assert.equal(await page.locator('#edit-project-modal.active').count(), 1);
                    assert.equal(await page.locator('#t-editSave').isDisabled(), true);
                    await page.locator('.retest-cancel').click();
                    await page.waitForFunction(() => !document.getElementById('t-editSave').disabled);
                    assert.equal(requests.length, id === 81 ? 5 : 6, 'Cancelling must not submit a retest');
                    await page.locator('#t-editSave').click();
                    await page.locator('#moderation-retest-modal.active').waitFor();
                    await page.locator('.retest-confirm').click();
                    await waitClosed();
                    assert.equal(requests.at(-1).url, '/api/pipeline/request-retest');
                    assert.equal(requests.at(-1).body.app_id, id);
                    assert.equal(requests.at(-1).body.expected_run_iteration, 3);
                    assert.equal(requests.at(-1).body.init_data, 'fixture');
                    assert.equal(requests.at(-1).body.min_android_version, 11);
                    assert.equal(requests.at(-1).body.limit_bounty, 2);
                    assert.equal(await page.evaluate(() => getEditModalRetestContext()), null);
                    assert.equal(await page.evaluate(() => moderationRetestPending.size), 0);
                }
                assert.equal(requests.length, 7);
            }
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log((phase2 ? 'Phase-2 forward merge' : 'Dev') + ': real index RU/EN, sequential restarts, normal settings, failure/retry, duplicate clicks and rapid reopen passed');
    } finally {
        await browser.close();
        if (temporary) fs.rmSync(temporary, { recursive: true });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
