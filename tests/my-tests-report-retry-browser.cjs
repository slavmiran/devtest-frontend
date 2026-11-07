const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const rawTest = { app_id: 30, progress_id: 300, run_iteration: 1, name: 'Report retry fixture', package_name: 'example.fixture',
    owner_id: 11, owner_username: 'developer', join_type: 'mutual', app_status: 'active', progress_status: 'active',
    testing_days: 6, start_date: '2026-11-02', last_check_date: '2026-11-06', checkins_count: 5,
    daily_timeline: '11111', skips_count: 0, control_proof_catchups: [] };
const saved = { status: 'success', proof: { state: 'attached', media_count: 1 },
    checkin: { last_check_date: '2026-11-07', checkins_count: 6, daily_timeline: '111111', testing_day: 6 } };

function multipart(request) {
    const body = request.postDataBuffer().toString('latin1');
    const field = name => (body.match(new RegExp('name="' + name + '"\\r\\n\\r\\n([^\\r]*)')) || [])[1];
    const file = body.match(/name="files"; filename="([^"]+)"\r\nContent-Type: ([^\r]+)\r\n\r\n([\s\S]*?)\r\n--/);
    return { uuid: field('idempotency_key'), note: field('report_text'), kind: field('report_kind'),
        day: field('expected_day'), run: field('expected_run'), start: field('expected_start'),
        file: file && { name: file[1], type: file[2], hash: crypto.createHash('sha256').update(Buffer.from(file[3], 'latin1')).digest('hex') } };
}

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--unsafely-treat-insecure-origin-as-secure=http://fixture.local'] });
    try {
        for (const [language, width] of [['ru', 360], ['en', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 850 }, hasTouch: true, serviceWorkers: 'block' });
            const errors = [], requests = [], heldReports = [], heldTasks = [];
            let mode = 'offline', payload = saved, status = 200, holdTasks = true;
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                window.__API_BASE__ = 'http://fixture.local/api'; localStorage.setItem('lang', language);
                window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 880, username: 'fixture_tester', language_code: language } },
                    initData: 'fixture', themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } };
            }, language);
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                // Exercise the real UI modules, without delayed app bootstrap overwriting fixtures.
                if (url.pathname === '/app.js') return route.fulfill({ body: '', contentType: 'application/javascript' });
                if (url.pathname.endsWith('/checkin-proof/report')) {
                    requests.push(multipart(route.request()));
                    if (mode === 'offline') return route.abort('failed');
                    if (mode === 'held') { heldReports.push(route); return; }
                    return route.fulfill({ status, json: payload });
                }
                if (url.pathname.startsWith('/api/tasks/')) {
                    if (holdTasks) { heldTasks.push(route); return; }
                    return route.fulfill({ json: { to_test_today: [rawTest] } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', events: [], warnings: [], acceptance_rate_pct: 75 } });
                // Every request is intercepted; no real backend, DB, Telegram or CDN is contacted.
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                let body = fs.readFileSync(file);
                if (url.pathname === '/js/app-config.js') {
                    // Production captures an immutable Telegram account per page. Allow a simulated
                    // account switch here so a late reply's actor guard is also covered in-browser.
                    assert(body.toString().includes('const userId ='));
                    body = Buffer.from(body.toString().replace('const userId =', 'let userId ='));
                }
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(({ language, rawTest }) => {
                lang = language;
                document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById('tab-tests').classList.add('active');
                Object.assign(App, { runtimeConfigStatus: 'ready', runtimeConfigApiBase: API_BASE, screenshotProofUploadEnabled: true });
                window.DeployStatus = null;
                window.__viewDate = '2026-11-07'; window.getLocalDate = () => __viewDate;
                window.__messages = []; window.showToast = text => __messages.push(text);
                window.loadProjects = async () => {}; window._getCheckinOpenToken = () => 'fixture-open';
                window.__animationCalls = 0;
                window.animateTestCardOut = () => { __animationCalls++; return new Promise(() => {}); };
                window.__rawTest = rawTest;
                window.__reset = overrides => {
                    userId = 880; __viewDate = '2026-11-07'; __messages = [];
                    _checkinProofRetryDrafts.clear(); _checkinProofPendingAppIds = {};
                    myTests = [];
                    myTests = _mapTestsFromApi({ to_test_today: [{ ...__rawTest, ...overrides }] });
                    _testsLoadedOnce = true; _lastFetchTimes.tests = 0;
                    renderTests(true);
                };
                __reset({});
                // Generate an actual local PNG; file selection, hashing and FormData remain real.
                const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 360;
                const ctx = canvas.getContext('2d'); ctx.fillStyle = '#215466'; ctx.fillRect(0, 0, 240, 360);
                window.__png = canvas.toDataURL('image/png').split(',')[1];
            }, { language, rawTest });
            const image = { name: 'fresh-screen.png', mimeType: 'image/png', buffer: Buffer.from(await page.evaluate(() => __png), 'base64') };
            const expectedHash = crypto.createHash('sha256').update(image.buffer).digest('hex');
            const settled = () => page.waitForFunction(() => _checkinProofActiveJobs === 0);
            const prepare = async (options = {}) => {
                await page.evaluate(options => openCheckinProofUploadModal(30, options), options);
                await page.locator('#checkin-proof-file-input').setInputFiles(image);
                await page.waitForFunction(() => !_checkinProofUploadState.checkingFiles && _checkinProofUploadState.files.length === 1);
                await page.locator('#unified-report-note').fill('Keep this report note');
            };
            const submit = async () => {
                assert(await page.locator('#checkin-proof-submit').isEnabled());
                await page.locator('#checkin-proof-submit').tap();
            };
            const activeCard = () => page.locator('#tests-list #test-card-30');
            const doneCard = () => page.locator('#done-list #test-card-30');

            await prepare();
            const original = await page.evaluate(() => {
                window.__originalFile = _checkinProofUploadState.files[0];
                return _checkinProofUploadState.idempotencyKey;
            });
            await submit(); await settled();
            assert.equal(requests.length, 2, 'Only one automatic replay precedes the quiet retry mark');
            assert.deepEqual(requests[0], requests[1], 'Automatic retry preserves UUID, metadata and file bytes');
            const retry = activeCard().locator('.test-report-retry');
            assert(await retry.isVisible());
            assert.equal((await retry.innerText()).replace(/\s+/g, ' '), language === 'ru' ? '↻ Отчёт не отправлен · Повторить' : '↻ Report not sent · Retry');
            const box = await retry.boundingBox();
            assert(box.height <= 48 && box.x >= 0 && box.x + box.width <= width, 'Quiet mark fits one small mobile row');
            assert.equal(await retry.evaluate(el => getComputedStyle(el).animationName), 'none');
            await retry.tap();
            assert.deepEqual(await page.evaluate(() => ({ sameFile: _checkinProofUploadState.files[0] === __originalFile,
                uuid: _checkinProofUploadState.idempotencyKey, note: document.getElementById('unified-report-note').value })),
            { sameFile: true, uuid: original, note: 'Keep this report note' });
            mode = 'success';
            await submit(); await settled();
            assert.equal(await activeCard().count(), 0, 'Accepted report moves immediately, without animation/refresh completion');
            assert.equal(await doneCard().count(), 1);
            assert.equal(await page.evaluate(() => __animationCalls), 0);
            assert.deepEqual(requests[2], requests[0], 'Manual retry sends the original draft unchanged');
            assert.equal(requests[2].file.hash, expectedHash);
            assert.equal(await page.locator('.test-report-retry').count(), 0);
            await page.waitForFunction(() => !!_testsInFlight);
            assert(heldTasks.length, 'Refresh is deliberately still awaiting a stale task snapshot');
            holdTasks = false;
            for (const route of heldTasks.splice(0)) await route.fulfill({ json: { to_test_today: [rawTest] } });
            await page.waitForFunction(() => !_testsInFlight);
            assert.equal(await activeCard().count(), 0, 'Real loadTasks mapper must not resurrect the accepted card');
            assert.equal(await doneCard().count(), 1);
            // The mapper/refresh has been exercised above. Keep subsequent isolation cases
            // independent of scheduled refreshes from previously completed jobs.
            await page.evaluate(() => { window.loadTasks = () => new Promise(() => {}); });

            // A confirmed server save survives a local render failure without asking to resend.
            await page.evaluate(() => __reset({}));
            await prepare();
            await page.evaluate(() => {
                window.__realRender = renderTests;
                window.renderTests = function(force) {
                    if (myTests[0].status === 'done') { window.renderTests = __realRender; throw new Error('fixture post-save render failure'); }
                    return __realRender(force);
                };
            });
            const beforeConfirmed = requests.length;
            await submit(); await settled();
            assert.equal(requests.length, beforeConfirmed + 1);
            assert.equal(await doneCard().count(), 1);
            assert.equal(await page.locator('.test-report-retry').count(), 0);
            assert.equal(await page.evaluate(() => _checkinProofRetryDrafts.size), 0);
            assert.match(await page.evaluate(() => __messages.join('\n')), language === 'ru' ? /Отчёт сохранён/ : /Report saved/);
            assert.doesNotMatch(await page.evaluate(() => __messages.join('\n')), /Повторить|повторите отправку|try sending|Retry/);

            for (const terminal of ['already', 'report-only']) {
                await page.evaluate(() => __reset({})); await prepare();
                status = terminal === 'already' ? 409 : 200;
                payload = terminal === 'already' ? { status: 'error', code: 'checkin_already_proved' }
                    : { ...saved, report_only: true, checkin: { already_checked_today: true } };
                await submit(); await settled();
                assert.equal(await activeCard().count(), 0, terminal + ' is an authoritative daily confirmation');
                assert.equal(await doneCard().count(), 1);
            }

            // Buffer and a standalone ticket do not imply today's daily check-in.
            for (const bufferMode of ['job', 'result', 'already', 'standalone']) {
                await page.evaluate(() => __reset({ control_proof_catchups: [{ id: 8, missed_testing_day: 4 }] }));
                await prepare(bufferMode === 'job' || bufferMode === 'already' ? { submissionMode: 'buffer_catchup', catchupRequested: true } : {});
                status = bufferMode === 'already' ? 409 : 200;
                payload = bufferMode === 'already' ? { status: 'error', code: 'checkin_already_proved' }
                    : { ...saved, report_only: true, buffer_catchup_only: bufferMode === 'result',
                        catchup: { missed_testing_day: 4 }, checkin: bufferMode === 'standalone' ? {} : { already_checked_today: true } };
                await submit(); await settled();
                assert.equal(await activeCard().count(), 1, bufferMode + ' must not complete the daily task');
                assert.notEqual(await page.evaluate(() => myTests[0].confirmed_checkin_view_date), '2026-11-07');
                assert.equal(await page.locator('.test-report-retry').count(), 0);
            }

            await page.evaluate(() => __reset({ testing_days: 15, app_status: 'pending_completion',
                is_pending_completion: true, control_proof_catchups: [{ id: 8, missed_testing_day: 4 }] }));
            await prepare({ submissionMode: 'buffer_catchup', catchupRequested: true });
            status = 200; payload = { ...saved, buffer_catchup_only: true, catchup: { missed_testing_day: 4 }, checkin: {} };
            await submit(); await settled();
            assert.equal(await page.locator('#pending-release-list #test-card-30').count(), 1, 'Real day-15 Buffer card remains available');
            assert.equal(await page.evaluate(() => myTests[0].control_proof_catchups.length), 0, 'Buffer removes only the fulfilled request');
            assert.notEqual(await page.evaluate(() => myTests[0].confirmed_checkin_view_date), '2026-11-07');

            // A form opened before midnight must not become a new-day submission implicitly.
            await page.evaluate(() => __reset({})); await prepare();
            const beforeMidnight = requests.length;
            await page.evaluate(() => { __viewDate = '2026-11-08'; });
            await submit(); await settled();
            assert.equal(requests.length, beforeMidnight, 'An old form is not posted for the new day');
            assert.equal(await activeCard().count(), 1);

            // Hold a real HTTP reply while the visible identity changes, including rejection.
            for (const change of ['date', 'day', 'progress', 'run', 'start', 'actor', 'missing']) {
                for (const outcome of ['success', 'already', 'offline']) {
                    await page.evaluate(() => __reset({})); await prepare();
                    mode = 'held'; const count = requests.length;
                    await submit(); await page.waitForFunction(() => _checkinProofActiveJobs === 1);
                    while (!heldReports.length) await new Promise(resolve => setTimeout(resolve, 10));
                    await page.evaluate(change => {
                        if (change === 'date') __viewDate = '2026-11-08';
                        if (change === 'day') myTests[0].testing_days = 7;
                        if (change === 'progress') myTests[0].progress_id = 301;
                        if (change === 'run') myTests[0].run_iteration = 2;
                        if (change === 'start') myTests[0].start_date = '2026-11-03';
                        if (change === 'actor') userId = 881;
                        if (change === 'missing') myTests = [];
                        renderTests(true);
                        window.__newPending = { appId: 30, progressId: myTests[0]?.progress_id || 301, actor: String(userId),
                            expectedRun: myTests[0]?.run_iteration, expectedDay: myTests[0]?.testing_days,
                            expectedStart: myTests[0]?.start_date, viewDate: __viewDate };
                        _checkinProofPendingAppIds[30] = __newPending;
                    }, change);
                    const route = heldReports.shift();
                    if (outcome === 'offline') { mode = 'offline'; await route.abort('failed'); }
                    else await route.fulfill(outcome === 'already' ? { status: 409, json: { status: 'error', code: 'checkin_already_proved' } } : { json: saved });
                    await settled();
                    assert.equal(await doneCard().count(), 0, `${change}/${outcome}: old reply must not complete the new card`);
                    if (change !== 'missing') assert.equal(await activeCard().count(), 1);
                    assert.equal(await page.evaluate(() => _checkinProofRetryDrafts.size), 0, 'Stale failure must not create a retry draft');
                    assert.equal(await page.evaluate(() => _checkinProofPendingAppIds[30] === __newPending), true, 'Old job cannot unlock a new upload');
                    assert.equal(await page.evaluate(() => __messages.length), 0, 'No stale result toast in the new context');
                    assert(requests.length >= count + 1);
                }
            }
            assert.deepEqual(errors, []);
            await page.close();
            console.log(`My Tests reports ${language}/${width}: real render, retry draft/files/note/UUID, immediate completion, stale tasks, post-save UI exception, Buffer and 21 late identity/reply combinations passed`);
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
