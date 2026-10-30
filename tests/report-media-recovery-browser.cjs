const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome', args: ['--unsafely-treat-insecure-origin-as-secure=http://fixture.local'] });
    try {
        for (const [language, width] of [['ru', 360], ['en', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [], submissions = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                window.__API_BASE__ = 'http://fixture.local/api'; localStorage.setItem('lang', language);
                window.Telegram = { WebApp: { initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture', themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {}, BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} } } };
            }, language);
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.pathname.endsWith('/checkin-proof/report')) {
                    const body = route.request().postDataBuffer().toString('latin1');
                    submissions.push((body.match(/name="idempotency_key"\r\n\r\n([^\r]+)/) || [])[1]);
                    return route.fulfill(submissions.length === 1
                        ? { status: 409, json: { status: 'error', code: 'duplicate_screenshot_in_run', details: { testing_day: 2, duplicate_indices: [1, 4] } } }
                        : { json: { status: 'success', proof: { state: 'attached', media_count: 5 }, checkin: { checkins_count: 5, last_check_date: '2026-10-24' } } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { status: 'success', events: [], acceptance_rate_pct: 75 } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(language => {
                lang = language;
                document.body.classList.remove('no-username-blocked'); document.getElementById('no-username-overlay').classList.remove('active');
                Object.assign(App, { runtimeConfigStatus: 'ready', runtimeConfigApiBase: API_BASE, screenshotProofUploadEnabled: true });
                window.getResolvedTestingDay = test => test.testing_days;
                myTests = [{ id: 30, progress_id: 300, run_iteration: 1, name: 'Media recovery', testing_days: 6, status: 'daily', app_status: 'active', progress_status: 'active', start_date: '2026-10-18', checkins_count: 4, control_proof_catchups: [] }];
                window.loadTasks = async () => {}; window.loadProjects = async () => {}; window.renderTests = () => {};
                window._getCheckinOpenToken = () => 'fixture-open';
                openReportModal(30, 'developer');
            }, language);
            const images = await page.evaluate(() => Array.from({ length: 8 }, (_, index) => {
                const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 360;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = `rgb(${25 + index * 15},95,130)`; ctx.fillRect(0, 0, 240, 360);
                ctx.fillStyle = '#f5f7fb'; ctx.font = '16px sans-serif'; ctx.fillText('Private account ' + index, 10, 165);
                return canvas.toDataURL('image/png').split(',')[1];
            }));
            const file = index => ({ name: 'screen-' + index + '.png', mimeType: 'image/png', buffer: Buffer.from(images[index], 'base64') });
            const pick = async values => {
                await page.locator('#checkin-proof-file-input').setInputFiles(values);
                await page.waitForFunction(() => !_checkinProofUploadState.checkingFiles);
            };
            const names = () => page.evaluate(() => _checkinProofUploadState.files.map(file => file.name));

            const retained = await page.evaluate(async () => {
                const canvas = document.createElement('canvas'); canvas.width = 1258; canvas.height = 2560;
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                const source = new File([blob], 'galaxy-screen.png', { type: 'image/png', lastModified: 1234 });
                const expected = Array.from(new Uint8Array(await source.arrayBuffer()));
                await handleCheckinProofFileSelected({ target: { files: [source], value: 'selected' } });
                const retained = _checkinProofUploadState.files[0];
                // Android's picker owns the source; the queued copy must not depend on it.
                const independent = retained !== source;
                const bytes = Array.from(new Uint8Array(await retained.arrayBuffer()));
                _resetCheckinProofSelection(); initUnifiedReport(myTests[0], {});
                const NativeImage = window.Image;
                window.Image = function () {
                    const image = new NativeImage();
                    Object.defineProperty(image, 'src', { set() { queueMicrotask(() => image.onerror && image.onerror()); } });
                    return image;
                };
                try { await handleCheckinProofFileSelected({ target: { files: [source], value: 'selected' } }); }
                finally { window.Image = NativeImage; }
                const acceptedDespitePreviewFailure = _checkinProofUploadState.files.length;
                const alert = document.getElementById('checkin-proof-upload-alert').textContent;
                _resetCheckinProofSelection(); initUnifiedReport(myTests[0], {});
                return { independent, bytesPreserved: JSON.stringify(expected) === JSON.stringify(bytes), acceptedDespitePreviewFailure, alert };
            });
            assert(retained.independent, 'Queue owns an immutable byte copy, not the Android picker File');
            assert(retained.bytesPreserved, 'Snapshot must not recompress or change exact duplicate fingerprints');
            assert.equal(retained.acceptedDespitePreviewFailure, 1, 'Preview decode failure is not evidence of invalid dimensions; server validates bytes');
            assert.equal(retained.alert, '');

            const readFailure = await page.evaluate(async () => {
                const NativeReader = window.FileReader;
                window.FileReader = function () { this.readAsArrayBuffer = () => { throw new DOMException('Provider unavailable', 'NotReadableError'); }; };
                try {
                    const source = new File(['unavailable'], 'cloud.png', { type: 'image/png' });
                    await handleCheckinProofFileSelected({ target: { files: [source], value: 'selected' } });
                    return { count: _checkinProofUploadState.files.length, busy: _checkinProofUploadState.checkingFiles,
                        alert: document.getElementById('checkin-proof-upload-alert').textContent,
                        expected: window.t('report_media_read_failed', {}, lang) };
                } finally { window.FileReader = NativeReader; }
            });
            assert.equal(readFailure.count, 0); assert.equal(readFailure.busy, false);
            assert(readFailure.alert.includes(readFailure.expected) && !readFailure.alert.includes('20:1'), 'Unreadable provider files have a distinct error and do not poison the queue');

            const decodeTimeout = await page.evaluate(async () => {
                const NativeImage = window.Image, nativeTimeout = window.setTimeout;
                window.Image = function () {};
                window.setTimeout = (callback, delay) => nativeTimeout(callback, delay === 10000 ? 1 : delay);
                try { return await _checkinProofImageDimensionsValid(new File(['valid-header-checked-by-server'], 'screen.png', { type: 'image/png' })); }
                finally { window.Image = NativeImage; window.setTimeout = nativeTimeout; }
            });
            assert.equal(decodeTimeout, null, 'Decoder timeout cannot prove that an image exceeds dimensions');
            await page.evaluate(() => _setCheckinProofAlert(''));

            const proxyFailure = await page.evaluate(async () => {
                const NativeXHR = window.XMLHttpRequest; let attempts = 0;
                window.XMLHttpRequest = function () {
                    this.upload = {}; this.open = () => {}; this.getResponseHeader = () => null;
                    this.send = () => { attempts++; this.status = 503; this.responseText = '<html>Service unavailable</html>'; queueMicrotask(() => this.onload()); };
                };
                try {
                    const sent = await _postCheckinProofScreenshot('/fixture-upload', new FormData(), () => {});
                    return { attempts, status: sent.response.status, code: sent.result.code, retryable: sent.retryable };
                } finally { window.XMLHttpRequest = NativeXHR; }
            });
            assert.deepEqual(proxyFailure, { attempts: 2, status: 503, code: 'report_server_response_invalid', retryable: true }, 'HTML proxy errors preserve HTTP status instead of becoming network failures');

            const otherResponses = await page.evaluate(async () => {
                const nativeFetch = window.fetch;
                const results = [];
                try {
                    for (const [status, body, retryAfter] of [
                        [413, '<html>Too large</html>'], [200, 'null'], [200, '{}'], [200, '{"status":"success"}'],
                        [503, '<html>Unavailable</html>', '60'], [429, '{"code":"telegram_rate_limited","details":{"retry_after":90,"retryable":true}}', '90'],
                    ]) {
                        let attempts = 0; const forms = [], form = new FormData();
                        form.append('idempotency_key', '42c17279-f1aa-4a0d-aab7-0dc3afac15c4');
                        window.fetch = async (url, options) => {
                            attempts++; forms.push(options.body);
                            return { ok: status === 200, status, headers: { get: () => retryAfter || null }, json: async () => JSON.parse(body) };
                        };
                        const sent = await _postCheckinProofScreenshot('/fixture-upload', form);
                        results.push({ attempts, status: sent.response.status, code: sent.result.code, retryable: sent.retryable, sameForm: forms.every(value => value === form) });
                    }
                } finally { window.fetch = nativeFetch; }
                return results;
            });
            assert.deepEqual(otherResponses, [
                { attempts: 1, status: 413, code: 'file_too_large', retryable: false, sameForm: true },
                ...Array(3).fill({ attempts: 2, status: 200, code: 'report_server_response_invalid', retryable: true, sameForm: true }),
                { attempts: 1, status: 503, code: 'report_server_response_invalid', retryable: true, sameForm: true },
                { attempts: 1, status: 429, code: 'telegram_rate_limited', retryable: true, sameForm: true },
            ], 'Malformed successes retain UUID/form; long Retry-After keeps the draft without an immediate repeat; a 413 is not retried');

            await pick([file(0)]);
            const draftRecovery = await page.evaluate(async () => {
                const s = _checkinProofUploadState, originalPost = _postCheckinProofScreenshot, originalToast = showToast;
                const messages = [], job = { appId: 30, progressId: 300, actor: String(userId), initData: 'fixture',
                    files: s.files.slice(), fingerprints: s.fingerprints.slice(), idempotencyKey: s.idempotencyKey,
                    submissionMode: s.submissionMode, catchupRequested: s.catchupRequested, reportKind: 'screenshot', note: 'Keep my note' };
                _postCheckinProofScreenshot = async () => ({ response: { ok: false, status: 503 }, result: { code: 'report_server_response_invalid' }, retryable: true });
                window.showToast = message => messages.push(message);
                try {
                    closeReportModal(); await _runCheckinProofUploadJob(job); openReportModal(30, 'developer');
                    return { count: s.files.length, sameKey: s.idempotencyKey === job.idempotencyKey,
                        sameBytes: s.files[0] === job.files[0], note: document.getElementById('unified-report-note').value,
                        message: messages[0], expected: window.t('report_server_response_invalid', {}, lang) };
                } finally {
                    _postCheckinProofScreenshot = originalPost; window.showToast = originalToast;
                    _checkinProofRetryDrafts.clear(); _resetCheckinProofSelection(); initUnifiedReport(myTests[0], {});
                }
            });
            assert.equal(draftRecovery.count, 1); assert(draftRecovery.sameKey && draftRecovery.sameBytes);
            assert.equal(draftRecovery.note, 'Keep my note'); assert(draftRecovery.message.includes(draftRecovery.expected));

            await pick(images.slice(0, 7).map((_, index) => file(index)));
            assert.deepEqual(await names(), [0, 1, 2, 3, 4].map(index => file(index).name));
            assert.match(await page.locator('#checkin-proof-upload-alert').innerText(), /\(2\)/);
            await pick([file(5), file(6)]);
            assert.equal((await names()).length, 5, 'A full selection is kept, not cleared');
            await page.evaluate(() => { removeCheckinProofFile(4); removeCheckinProofFile(3); removeCheckinProofFile(2); });
            await pick([2, 3, 4, 5, 6].map(file));
            assert.deepEqual(await names(), [0, 1, 2, 3, 4].map(index => file(index).name), 'Fill the three free slots before skipping excess');

            await page.evaluate(() => { _resetCheckinProofSelection(); initUnifiedReport(myTests[0], {}); });
            await pick([file(0), { ...file(0), name: 'same-bytes.png' }, { name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('pdf') }, ...[1, 2, 3, 4, 5].map(file)]);
            assert.deepEqual(await names(), [0, 1, 2, 3, 4].map(index => file(index).name), 'Skip duplicates/bad files and fill with subsequent valid media');
            await page.locator('#unified-report-note').fill('Keep this comment and the valid screenshots');
            await page.locator('#checkin-proof-submit').click();
            await page.waitForFunction(() => !isScreenshotProofUploadPending(30));
            assert.equal(submissions.length, 1);
            await page.evaluate(() => openReportModal(30, 'developer'));
            assert.equal(await page.locator('.checkin-proof-preview-item').count(), 5);
            assert.equal(await page.locator('.checkin-proof-preview-item.is-invalid').count(), 2);
            assert(await page.locator('.checkin-proof-preview-item').nth(1).evaluate(el => el.classList.contains('is-invalid')));
            assert(await page.locator('.checkin-proof-preview-item').nth(4).evaluate(el => el.classList.contains('is-invalid')));
            assert.equal(await page.locator('#unified-report-note').inputValue(), 'Keep this comment and the valid screenshots');
            await page.waitForTimeout(550);
            assert(await page.locator('#checkin-proof-submit').isDisabled(), 'The periodic sync must not re-enable an invalid album');
            await page.evaluate(() => { submitCheckinProofScreenshot(); openReportImageEditor(1); });
            assert.equal(submissions.length, 1, 'Known used media cannot be sent blindly again');
            assert.equal(await page.locator('.report-editor').count(), 0, 'Do not offer annotation as a way around a used-file rejection');
            await page.locator('#report-modal').screenshot({ path: path.resolve(root, '../artifacts/report-used-media-' + language + '.png') });
            await page.evaluate(() => removeCheckinProofFile(0));
            assert(await page.locator('.checkin-proof-preview-item').nth(0).evaluate(el => el.classList.contains('is-invalid')), 'Flags follow file fingerprints when positions shift');
            await page.evaluate(() => { removeCheckinProofFile(0); removeCheckinProofFile(2); });
            assert.deepEqual(await names(), [file(2).name, file(3).name], 'Valid files survive correction');
            await pick([file(1)]);
            assert.equal(await page.locator('.is-invalid.checkin-proof-preview-item').count(), 1, 'A known used file is marked if selected again');
            await page.evaluate(() => removeCheckinProofFile(2));
            await pick([file(5), file(6), file(7)]);
            assert.equal(await page.locator('.is-invalid.checkin-proof-preview-item').count(), 0);
            assert(await page.locator('#checkin-proof-submit').isEnabled());
            await page.locator('#checkin-proof-submit').click();
            await page.waitForFunction(() => !isScreenshotProofUploadPending(30));
            assert.equal(submissions.length, 2);
            assert(submissions.every(Boolean) && submissions[0] !== submissions[1], 'A changed album uses a new idempotency key');

            await page.evaluate(() => { myTests[0].last_check_date = '2026-10-23'; myTests[0].status = 'daily'; openReportModal(30, 'developer'); });
            await pick([file(0)]);
            await page.locator('.checkin-proof-preview-edit').click();
            const canvas = page.locator('.report-editor canvas');
            const original = await canvas.evaluate(el => el.toDataURL());
            const outside = await canvas.evaluate(el => Array.from(el.getContext('2d').getImageData(2, 2, 1, 1).data));
            await page.locator('[data-tool="cover"]').click();
            assert(await page.locator('.report-editor__settings').isHidden());
            const rect = await canvas.boundingBox();
            await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height * .7); await page.mouse.down();
            await page.mouse.move(rect.x + rect.width * .2, rect.y + rect.height * .25, { steps: 8 }); await page.mouse.up();
            await page.waitForTimeout(50);
            const colors = await canvas.evaluate(el => {
                const pixels = el.getContext('2d').getImageData(80, 120, 60, 60).data, colors = new Set();
                for (let index = 0; index < pixels.length; index += 4) colors.add(Array.from(pixels.slice(index, index + 4)).join(','));
                return [...colors].sort();
            });
            assert.deepEqual(colors, ['40,46,56,255', '75,85,99,255'], 'The entire rectangle is an opaque checkerboard, not a stroke or blurred source');
            assert.deepEqual(await canvas.evaluate(el => Array.from(el.getContext('2d').getImageData(2, 2, 1, 1).data)), outside);
            const redacted = await canvas.evaluate(el => el.toDataURL());
            await page.locator('[data-action="undo"]').click();
            await page.waitForFunction(original => document.querySelector('.report-editor canvas').toDataURL() === original, original);
            await page.locator('[data-action="redo"]').click();
            await page.waitForFunction(redacted => document.querySelector('.report-editor canvas').toDataURL() === redacted, redacted);
            await page.locator('.report-editor').screenshot({ path: path.resolve(root, '../artifacts/report-redaction-' + language + '.png') });
            await page.locator('[data-action="done"]').click();
            await page.waitForFunction(() => !document.querySelector('.report-editor') && !_checkinProofUploadState.checkingFiles);
            assert.match(await page.evaluate(() => _checkinProofUploadState.files[0].name), /-marked\.jpg$/);
            await page.locator('.checkin-proof-preview-edit').click();
            assert(await page.locator('[data-action="undo"]').isDisabled(), 'Exported mask is flattened into the file; reopening cannot undo it');
            const savedPixel = await page.locator('.report-editor canvas').evaluate(el => Array.from(el.getContext('2d').getImageData(100, 150, 1, 1).data));
            assert.equal(savedPixel[3], 255);
            assert(savedPixel[0] < 95 && savedPixel[1] < 110 && savedPixel[2] < 125, 'The saved JPEG still contains the mask, not the original private text');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Report media RU/EN: fill five slots, skip extras/invalid/duplicates, precise used-file recovery, safe retry, opaque rectangular redaction, undo/redo and flattened export passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
