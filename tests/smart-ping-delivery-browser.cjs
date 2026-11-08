// Offline contract regression: queue != delivery; only GET may settle a receipt.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const language of ['ru', 'en']) for (const width of [390, 360]) {
            const page = await browser.newPage({ viewport: { width, height: 840 } });
            const errors = [], writes = [], reads = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.clock.install({ time: new Date('2026-11-07T03:00:00Z') });
            let postMode = 'ok', getMode = 'queued', latest = null, holdGet, releaseGet, cooldownAt;
            const receipt = (id = 700, state = 'completed', overrides = {}) => ({
                id, state, sent_at: '2026-11-07T03:00:00Z', requested_count: 7, sent_count: 2,
                total_cost: 70, charged_cost: 20, refunded_cost: 50, balance_bust: state === 'queued' ? 930 : 980,
                results: state === 'queued' ? [] : [
                    { tester_id: 101, status: 'sent' }, { tester_id: 102, status: 'catchup' },
                    { tester_id: 103, status: 'unavailable' }, { tester_id: 104, status: 'failed' },
                    { tester_id: 105, status: 'uncertain' }, { tester_id: 106, status: 'rate_limited' },
                    { tester_id: 107, status: 'not_attempted' },
                ], ...overrides,
            });
            await page.route('**/*', async route => {
                const req = route.request(), url = new URL(req.url());
                assert.equal(url.hostname, 'fixture.local', 'No real service request');
                if (url.pathname === '/api/project/smart-ping') {
                    assert.equal(req.method(), 'POST');
                    writes.push(req.postDataJSON());
                    assert.equal(writes.at(-1).init_data, 'signed-fixture');
                    if (postMode === 'lost') return route.abort('failed');
                    if (postMode === 'html') return route.fulfill({ status: 502, contentType: 'text/html', body: '<script>window.INJECTED=1</script>' });
                    if (postMode === 'reject') return route.fulfill({ json: { status: 'error', code: '<img src=x onerror=window.INJECTED=1>' } });
                    if (postMode === 'cooldown') return route.fulfill({ json: { status: 'error', code: 'smart_ping_cooldown', details: { sent_at: cooldownAt } } });
                    return route.fulfill({ json: { status: 'success', delivery_id: 700, sent_at: '2026-11-07T03:00:00Z',
                        charged_count: 7, total_cost: 70, balance_bust: 930, tester_ids: [101, 102, 103, 104, 105, 106, 107] } });
                }
                if (/^\/api\/project\/\d+\/smart-ping\/(\d+|latest)$/.test(url.pathname)) {
                    reads.push(url.pathname);
                    assert.equal(req.method(), 'GET');
                    assert.equal(url.searchParams.get('init_data'), 'signed-fixture');
                    if (holdGet) {
                        const held = holdGet; holdGet = null;
                        await new Promise(resolve => { releaseGet = resolve; });
                        return route.fulfill({ json: { status: 'success', delivery: held } }).catch(() => {});
                    }
                    if (getMode === 'html') return route.fulfill({ status: 503, contentType: 'text/html', body: '<img src=x onerror=window.INJECTED=1>' });
                    if (getMode === 'error') return route.fulfill({ json: { status: 'error', delivery: receipt() } });
                    if (getMode === 'invalid-success') return route.fulfill({ status: 503, json: { status: 'success', delivery: receipt() } });
                    return route.fulfill({ json: { status: 'success', delivery: url.pathname.endsWith('latest') ? latest : receipt(Number(url.pathname.split('/').at(-1)), getMode) } });
                }
                if (url.pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body><div id="bell-remind-overlay" hidden></div></body>' });
                throw new Error('Unexpected request: ' + req.method() + ' ' + url.pathname);
            });
            await page.goto('http://fixture.local/');
            for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'js/project-today.js', 'js/smart-ping.js'])
                await page.addScriptTag({ path: path.join(root, file) });
            for (const file of ['css/tokens.css', 'css/base.css', 'css/smart-ping.css'])
                await page.addStyleTag({ path: path.join(root, file) });
            await page.addStyleTag({ content: 'body{margin:0;background:#0d1117;font-family:Arial,sans-serif}.modal-overlay{display:none}' });
            await page.evaluate(language => {
                window.lang = language; window.API_BASE = '/api'; window.userId = 42;
                window.visibilityStats = { balance_bust: 1000 };
                window.getTelegramInitDataRaw = () => 'signed-fixture';
                window.previewCalls = []; window.toasts = [];
                // Real pcRemindTester is loaded. Mock only the presentation
                // boundary so no Telegram/bot/DB calls can be performed.
                window.openBellRemindPreview = data => {
                    previewCalls.push({ testerId: data.testerId, appId: data.remindAppId, reason: data.remindReason });
                    document.getElementById('bell-remind-overlay').hidden = false;
                    document.getElementById('bell-remind-overlay').textContent = 'Manual reminder preview';
                };
                window.showToast = value => toasts.push(value);
                window.myProjects = [1, 2].map(id => ({ id, name: 'Fixture', testers: Array.from({ length: 7 }, (_, i) => ({
                    tester_id: 101 + i, username: i === 2 ? '' : 'tester' + (101 + i),
                    full_name: i === 2 ? '<img src=x onerror=window.INJECTED=1> Name' : 'Name ' + i,
                    status: 'active', current_day: 5,
                })) }));
                window.ProjectToday = {
                    collectAttention: project => project.testers.map(tester => ({ tester, reasons: [{ code: 'not_opened', days: 5 }] })),
                    activityCounts: () => ({ controlRows: [] }), invalidate() {},
                };
                SmartPing.open(1);
            }, language);
            const state = value => page.locator('.smart-ping-result[data-state="' + value + '"]');
            const open = app => page.evaluate(app => SmartPing.open(app), app);
            const close = () => page.locator('.smart-ping-sheet__close').click();
            const pending = () => page.evaluate(() => JSON.parse(localStorage.getItem('pc_smart_ping_pending_42_1')));
            const notified = () => page.evaluate(() => [101,102,103,104,105,106,107].map(id => SmartPing.isTesterPinged(1,id)));

            await page.locator('.smart-ping-sheet__send').click();
            await state('queued').waitFor();
            assert.equal(await state('queued').locator('h4').innerText(), language === 'ru' ? 'Рассылаем уведомления' : 'Sending notifications');
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('pc_smart_ping_pending_42_1')).deliveryId === 700);
            assert.equal((await pending()).deliveryId, 700);
            assert.deepEqual(await notified(), [false,false,false,false,false,false,false], 'Queue is not notified');
            assert.equal(await page.evaluate(() => SmartPing.getLastPing(1)), null);
            assert.match(await page.locator('.smart-ping-result__reserve').innerText(), /70.0 \$BUST/);
            assert.equal(writes.length, 1);
            await page.clock.runFor(900);
            assert.equal(await page.locator('#smart-ping-modal').count(), 1, 'No 700ms auto close');
            await close();
            const stoppedReads = reads.length;
            await page.clock.runFor(10000);
            assert.equal(reads.length, stoppedReads, 'Polling canceled on close');
            // Reopen (including a new script instance, simulating reload) only
            // reads the persisted receipt; no new debit/request is posted.
            await page.addScriptTag({ path: path.join(root, 'js/smart-ping.js') });
            await open(1);
            await state('queued').waitFor();
            assert.equal(writes.length, 1);
            getMode = 'completed';
            await page.clock.runFor(2600);
            await state('completed').waitFor();
            assert.deepEqual(await notified(), [true,true,false,false,false,false,false]);
            assert.equal(await pending(), null);
            assert.deepEqual(await page.evaluate(() => SmartPing.getLastPing(1).testerIds), [101,102]);
            assert.equal(await page.evaluate(() => SmartPing.getLastPing(1).count), 2);
            assert.equal(await page.evaluate(() => visibilityStats.balance_bust), 980);
            assert.deepEqual(await page.locator('.smart-ping-result__metric strong').allTextContents(), ['2','5']);
            assert.deepEqual(await page.locator('.smart-ping-result__money dd').allTextContents(), ['20.0 $BUST','50.0 $BUST']);
            assert.equal(await page.locator('[data-result-tester="101"] p').innerText(), language === 'ru' ? 'Уведомление отправлено.' : 'Notification sent.');
            assert.match(await page.locator('[data-result-tester="102"] p').innerText(), language === 'ru' ? /Дозапрос.*создан/ : /follow-up report request was created/);
            assert.equal(await page.locator('[data-smart-ping-action="manual"]').count(), 5);
            assert.match(await page.locator('[data-result-tester="103"]').innerText(), /<img src=x/);
            assert.equal(await page.locator('.smart-ping-result img, .smart-ping-result script').count(), 0);
            assert.equal(await page.evaluate(() => window.INJECTED), undefined);
            assert.match(await page.locator('[data-result-tester="105"]').innerText(), language === 'ru' ? /могло дойти.*возвращена/ : /may have arrived.*refunded/);
            assert.match(await page.locator('[data-result-tester="106"]').innerText(), language === 'ru' ? /частоту/ : /sending rate/);
            assert.match(await page.locator('[data-result-tester="107"]').innerText(), language === 'ru' ? /не была выполнена/ : /not attempted/);
            assert.equal(await page.evaluate(() => previewCalls.length), 0, 'Never auto-open/send a personal reminder');
            await page.clock.runFor(20000);
            assert.equal(await state('completed').count(), 1, 'Receipt stays until closed');
            assert.equal(await page.evaluate(() => document.querySelector('.smart-ping-sheet').scrollWidth <= innerWidth), true);
            await page.locator('.smart-ping-sheet').screenshot({ path: path.resolve(root, '../artifacts/smart-ping-result-' + language + '-' + width + '.png') });
            // The legacy preview helper can send when its markup is missing.
            // Smart Ping must never enter that path.
            await page.evaluate(() => document.getElementById('bell-remind-overlay').remove());
            await page.locator('[data-smart-ping-action="manual"][data-tester-id="103"]').click();
            assert.equal(await page.evaluate(() => previewCalls.length), 0);
            assert.equal(await state('completed').count(), 1);
            await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<div id="bell-remind-overlay" hidden></div>'));
            await page.locator('[data-smart-ping-action="manual"][data-tester-id="103"]').click();
            assert.deepEqual(await page.evaluate(() => previewCalls), [{ testerId: 103, appId: 1, reason: 'not_opened' }]);
            assert.equal(writes.length, 1, 'Manual preview does not post/send');
            assert.equal(await page.locator('#bell-remind-overlay:visible').count(), 1);
            await open(1);
            assert.equal(await page.locator('.smart-ping-row.is-notified').count(), 2, 'Only confirmed recipients get a notified badge');
            assert.equal(await page.locator('.smart-ping-row__notified-chip').count(), 2);
            await close();

            // A reopened sheet can load results using only the project timestamp.
            await page.evaluate(() => localStorage.removeItem('pc_smart_ping_last_1'));
            latest = receipt();
            await open(1);
            const lastResult = page.getByRole('button', { name: language === 'ru' ? /Последний пинг/ : /Last ping/ });
            getMode = 'html';
            await lastResult.click();
            await page.waitForFunction(() => toasts.some(value => value.includes(lang === 'ru' ? 'Не удалось загрузить итоги' : 'Could not load the results')));
            assert.equal(await lastResult.isVisible(), true);
            getMode = 'completed';
            await lastResult.press('Enter');
            await state('completed').waitFor();
            assert.equal(reads.at(-1), '/api/project/1/smart-ping/latest');
            assert.deepEqual(await page.locator('.smart-ping-result__money dd').allTextContents(), ['20.0 $BUST','50.0 $BUST']);
            assert.equal(await pending(), null, 'Opening past results does not start an attempt');
            assert.equal(writes.length, 1, 'Opening past results does not send again');
            await page.locator('.smart-ping-sheet__send').click();

            // No exact success IDs in old history must not mark everybody.
            await page.evaluate(() => {
                SmartPing.setLastPing(2, { sentAt: new Date().toISOString(), count: 7, testerIds: [101,102,103,104,105,106,107] });
                window.oldHistoryNotified = SmartPing.isTesterPinged(2, 101);
            });
            assert.equal(await page.evaluate(() => oldHistoryNotified), false);
            await open(2);
            await lastResult.click();
            await page.waitForFunction(() => toasts.some(value => value.includes(lang === 'ru' ? 'Подробный отчёт' : 'Detailed results are unavailable')));
            assert.equal(await state('completed').count(), 0, 'An older receipt does not replace the latest timestamp');
            assert.equal(writes.length, 1);
            await close();

            // Lost POST: accept only a timestamp matching this attempt; recover
            // by GET latest and then settle without sending again.
            await page.evaluate(() => { localStorage.removeItem('pc_smart_ping_last_1'); delete myProjects[0].smart_ping_sent_at; });
            postMode = 'lost'; latest = receipt(701, 'queued', { sent_at: new Date(await page.evaluate(() => Date.now())).toISOString() });
            getMode = 'queued'; await open(1);
            await page.locator('.smart-ping-sheet__send').click();
            await page.waitForFunction(() => JSON.parse(localStorage.getItem('pc_smart_ping_pending_42_1')).deliveryId === 701);
            assert.equal(writes.length, 2);
            await close();
            // A failed GET cannot show a success-shaped body or allow another POST.
            getMode = 'invalid-success'; await open(1); await state('status-error').waitFor();
            assert.equal(await page.locator('[data-smart-ping-action="check"]').count(), 1);
            assert.equal((await pending()).deliveryId, 701);
            assert.equal(writes.length, 2);
            getMode = 'html'; await page.locator('[data-smart-ping-action="check"]').click();
            await state('status-error').waitFor();
            assert.equal(await page.locator('.smart-ping-result img').count(), 0);
            getMode = 'error'; await page.locator('[data-smart-ping-action="check"]').click();
            await state('status-error').waitFor();
            assert.deepEqual(await notified(), [false,false,false,false,false,false,false]);
            await close();

            // Actor/app scoping and late response cancellation.
            getMode = 'queued'; await page.evaluate(() => { userId = 43; SmartPing.open(1); });
            assert.equal(await page.locator('.smart-ping-result').count(), 0);
            await close(); await page.evaluate(() => { userId = 42; });
            holdGet = receipt(701); await open(1);
            await page.waitForTimeout(20);
            await open(2); if (releaseGet) releaseGet();
            assert.equal(await page.locator('.smart-ping-result').count(), 0, 'Canceled result cannot replace another app');
            assert.equal((await pending()).deliveryId, 701);
            await close();

            // Bounded polling keeps the receipt recoverable. A later GET after
            // a worker restart can return a settled result, with no client refund.
            await open(1); await state('queued').waitFor();
            await page.clock.fastForward(16 * 60000);
            await state('status-error').waitFor();
            const boundedReads = reads.length;
            await page.clock.runFor(10000);
            assert.equal(reads.length, boundedReads);
            await close();
            getMode = 'completed'; await open(1); await state('completed').waitFor();
            assert.equal(await pending(), null);
            assert.equal(writes.length, 2);
            await close();

            // Lost reply with an OLD latest receipt persists until the user
            // explicitly abandons the attempt. No automatic retry/debit.
            await page.evaluate(() => {
                localStorage.removeItem('pc_smart_ping_pending_42_1');
                localStorage.removeItem('pc_smart_ping_last_1'); delete myProjects[0].smart_ping_sent_at;
            });
            await page.addScriptTag({ path: path.join(root, 'js/smart-ping.js') });
            postMode = 'html'; latest = receipt(650, 'completed', { sent_at: '2026-11-06T02:00:00Z' });
            getMode = 'queued'; await open(1); await page.locator('.smart-ping-sheet__send').click();
            await state('not-found').waitFor();
            assert.equal(writes.length, 3);
            assert.equal((await pending()).deliveryId, null);
            await close(); await open(1); await state('not-found').waitFor();
            assert.equal(writes.length, 3);
            assert.equal(await page.evaluate(() => window.INJECTED), undefined);
            // Failed status reads are not evidence of absence. No abandon
            // action until another successful null/old lookup.
            getMode = 'error'; await page.locator('[data-smart-ping-action="check"]').click();
            await state('status-error').waitFor();
            assert.equal(await page.locator('[data-smart-ping-action="back"]').count(), 0);
            assert.equal((await pending()).deliveryId, null);
            getMode = 'queued'; await page.locator('[data-smart-ping-action="check"]').click();
            await state('not-found').waitFor();
            assert.match(await page.locator('.smart-ping-result__intro').innerText(), language === 'ru' ? /6-часовой интервал/ : /six-hour cooldown/);
            await page.locator('[data-smart-ping-action="back"]').click();
            assert.equal(await pending(), null, 'Explicit back clears durable and in-memory pending');
            assert.equal(writes.length, 3, 'Back must not send');
            await close();
            await open(1);
            assert.equal(await page.locator('.smart-ping-result').count(), 0, 'Reopen does not revive abandoned pending');
            assert.equal(writes.length, 3);

            // A POST that never arrived + latest:null gets the same deliberate
            // exit without claiming it was refunded, delivered or charged.
            postMode = 'lost'; latest = null;
            await page.locator('.smart-ping-sheet__send').click();
            await state('not-found').waitFor();
            assert.equal(writes.length, 4);
            assert.equal((await pending()).deliveryId, null);
            assert.equal(await page.locator('.smart-ping-result__money').count(), 0);
            assert.equal(await page.locator('.smart-ping-row__notified-chip').count(), 0);
            await page.locator('[data-smart-ping-action="back"]').click();
            assert.equal(await pending(), null);
            assert.equal(writes.length, 4);
            await close();

            // Explicit status:error is a rejection, not delivered or queued.
            postMode = 'reject'; await open(1); await page.locator('.smart-ping-sheet__send').click();
            await state('rejected').waitFor();
            assert.equal(await pending(), null);
            assert.equal(await page.locator('.smart-ping-result img, .smart-ping-result script').count(), 0);
            assert.equal(await page.evaluate(() => window.INJECTED), undefined);
            await page.locator('[data-smart-ping-action="back"]').click();
            assert.equal(await page.locator('.smart-ping-sheet__filters:visible').count(), 1);

            // Only another explicit Send can POST. The server cooldown remains
            // authoritative if the original request actually committed.
            assert.equal(writes.length, 5);
            postMode = 'cooldown'; cooldownAt = new Date(await page.evaluate(() => Date.now())).toISOString();
            await page.locator('.smart-ping-sheet__send').click();
            await state('rejected').waitFor();
            assert.equal(writes.length, 6);
            await page.locator('[data-smart-ping-action="back"]').click();
            assert.equal(await pending(), null);
            assert.equal(await page.locator('.smart-ping-sheet__send').isDisabled(), true);
            assert.deepEqual(errors, []);
            await page.close();
            console.log('Smart Ping offline receipt ' + language + '/' + width + ': queue, refunds, manual preview, recovery, cancellation, errors and safe rendering passed');
        }
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
