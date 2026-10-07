const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
const slice = (file, from, until) => {
    const text = source(file);
    return text.slice(text.indexOf(from), text.indexOf(until, text.indexOf(from)));
};
const payload = enabled => ({ screenshot_proof_upload_enabled: enabled,
    testing_control_enabled: true, checkin_proof_gallery_enabled: true, bot_username: 'TestBot' });
function fixture(fetch) {
    const calls = { dm: 0, legacy: 0, upload: 0, guest: 0, renders: 0, fetch: 0 };
    const c = { App: {runtimeConfigStatus: 'unknown'}, API_BASE: 'https://test.invalid/api',
        BOT_USERNAME: 'TestBot', TELEGRAM_RUNTIME_BOT_USERNAME: '', lang: 'ru',
        _normalizeBotUsername: name => name || 'TestBot',
        console: {warn() {}}, AbortController,
        setTimeout: (fn, ms) => setTimeout(fn, ms < 1000 ? 0 : ms), clearTimeout,
        fetch: async (...args) => { calls.fetch++; return fetch(...args); },
        myTests: [{id: 42, owner_username: 'owner'}],
        t: key => key, showToast() {}, renderTests() {calls.renders++;},
        isTabCurrentlyActive: () => true,
        confirmStart() {calls.legacy++;}, openOwnerCheckpointChat() {calls.dm++;},
        _resolveCheckpointOwnerUsername: () => 'owner', buildCheckpointReportPrefill: () => '',
        openCheckinProofUploadModal() {calls.upload++;},
        sendExternalScreenshotAndConfirmFromUi() {calls.guest++;},
        getResolvedTestingDay: () => 4, isMandatoryScreenshotDay: () => true,
        escapeHTML: text => String(text), escapeInlineJsString: text => text };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(slice('js/app-config.js', 'var _runtimeConfigRequest', 'var GUEST_PROJECTS_PAGE_SIZE'), c);
    vm.runInContext(slice('js/checkin-proof-upload.js', 'function isScreenshotProofUploadEnabled', 'function _checkinProofSessionKey'), c);
    vm.runInContext(slice('js/app-actions.js', 'async function sendCheckpointScreenshotAndConfirm', 'function _isAutoAcceptMutualAvailable'), c);
    vm.runInContext(slice('js/app-actions.js', 'async function sendReport()', 'function renderEarnBustDynamic'), c);
    vm.runInContext(slice('ui/ui-market.js', 'async function openReportModal(', 'function closeReportModal('), c);
    vm.runInContext(slice('ui/ui-tests.js', 'function getScreenshotReminderHtml', '/** Tags a chip'), c);
    return {c, calls};
}
async function main() {
    let release;
    const delayed = new Promise(resolve => {release = resolve;});
    let {c, calls} = fixture(() => delayed);
    const first = c.loadRuntimeConfig();
    assert.strictEqual(c.loadRuntimeConfig(), first, 'concurrent loads must share one request');
    const action = c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.dm, 0); assert.equal(calls.legacy, 0); assert.equal(calls.upload, 0);
    const loadingHtml = c.getScreenshotReminderHtml(c.myTests[0]);
    assert(!loadingHtml.includes('openTelegramProfile')); assert(!loadingHtml.includes('checkpointScheduleText<'));
    release({ok: true, json: async () => payload(true)});
    await action; await first;
    assert.equal(calls.fetch, 1); assert.equal(calls.upload, 1); assert.equal(calls.dm, 0);
    assert(calls.renders > 0, 'cached cards must refresh when config arrives');
    assert(c.getScreenshotReminderHtml(c.myTests[0]).includes('openTodayCheckinReport'));

    ({c, calls} = fixture(async () => ({ok: false, status: 503})));
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.fetch, 3); assert.equal(c.App.runtimeConfigStatus, 'error');
    assert.equal(calls.legacy + calls.dm + calls.upload, 0, 'failure must not fall back to DM/check-in');
    c._reportAppId = 42; c._reportOwnerUsername = 'owner';
    c.document = {getElementById: () => ({value: 'draft report'})};
    await c.sendReport();
    assert.equal(c._reportAppId, 42, 'failed readiness must preserve the existing draft');
    assert.equal(await c.openReportModal(43, 'other'), false);
    assert.equal(c._reportAppId, 42, 'failed modal open must not replace existing form state');
    c.fetch = async () => ({ok: true, json: async () => payload(true)});
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.upload, 1, 'next click must recover from failure');
    c.fetch = async () => {throw new Error('disconnected');};
    await c.loadRuntimeConfig();
    assert.equal(c.App.runtimeConfigStatus, 'ready');
    assert.equal(c.App.screenshotProofUploadEnabled, true, 'refresh failure must preserve confirmed mode');

    let count = 0;
    ({c, calls} = fixture(async () => ++count === 1 ? {ok: false, status: 503} : {ok: true, json: async () => payload(true)}));
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.fetch, 2); assert.equal(calls.upload, 1);

    ({c, calls} = fixture(async () => ({ok: true, json: async () => ({})})));
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(c.App.runtimeConfigStatus, 'error'); assert.equal(calls.dm, 0);

    ({c, calls} = fixture(async () => ({ok: true, json: async () => payload(false)})));
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.legacy, 1); assert.equal(calls.dm, 1, 'explicit legacy mode remains supported');

    ({c, calls} = fixture(async () => {throw new Error('must not load for guest');}));
    c.myTests[0].is_external = true;
    const guest = c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.guest, 1, 'guest DM must stay synchronous'); await guest;
    assert.equal(calls.fetch, 0);

    ({c, calls} = fixture((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')), {once: true});
    })));
    c.setTimeout = (fn, ms) => setTimeout(fn, ms >= 5000 ? 2 : 0);
    await c.sendCheckpointScreenshotAndConfirm(42, 'owner');
    assert.equal(calls.fetch, 3); assert.equal(calls.dm + calls.legacy, 0, 'timeouts must fail closed');
    console.log('Runtime proof readiness: 11 scenarios passed');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
