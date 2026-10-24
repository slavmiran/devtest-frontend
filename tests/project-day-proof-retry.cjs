const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {
    console: { error() {}, warn() {}, log() {} }, Number, String, Math, JSON, Object, Array, Set, Map, Date,
    document: { getElementById: () => null }, window: null, App: {},
    FormData: class { constructor() { this.items = []; } append(...args) { this.items.push(args); } },
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
    sessionStorage: { removeItem() {} }, tg: { initData: 'fixture' }, lang: 'ru', API_BASE: '/api',
    incomingOffers: [], myTests: [], getLocalDate: () => '2026-10-12',
    getTelegramInitDataRaw: () => 'fixture', _getCheckinOpenToken: () => 'open-token',
};
context.window = context;
vm.createContext(context);
for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'js/app-actions.js', 'js/checkin-proof-upload.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
for (const name of ['markDefaultGroupJoined', 'showCheckinRewardToasts', 'setFirstDayScreenshotVisible',
    'setTimerReadyForConfirm', 'clearActiveTimerForApp', 'setTestsCache', 'refreshOpenModals', 'recomputeLocalTestState']) context[name] = () => {};
const notices = [];
context.showToast = message => notices.push(message);
context._getCheckinOpenToken = () => 'open-token';
context.renderTests = () => {};
context.loadTasks = () => Promise.resolve();
context.loadProjects = () => Promise.resolve();
const job = { appId: 1193, progressId: 13008, idempotencyKey: '508fdf3e-12fa-4ff7-8622-228734a408e3', files: [{ name: 'one.png', type: 'image/png' }], submissionMode: 'standard' };
const accepted = { status: 'success', proof: { state: 'attached', media_count: 1 }, checkin: { last_check_date: '2026-10-12', checkins_count: 1 } };
const response = (status, result) => ({ ok: status < 400, status, json: async () => result });
function reset() {
    context.myTests = [{ id: 1193, progress_id: 13008, status: 'opened', checkins_count: 0 }];
    context._checkinProofPendingAppIds[1193] = true;
    notices.length = 0;
    context.renderTests = () => {};
}

(async () => {
    reset();
    const bodies = [];
    context.fetch = async (url, options) => {
        bodies.push(options.body);
        assert.equal(context.isScreenshotProofUploadPending(1193), true, 'Card remains pending throughout automatic retry');
        if (bodies.length === 1) throw new TypeError('Failed to fetch');
        return response(200, accepted);
    };
    await context._runCheckinProofUploadJob(job);
    assert.equal(bodies.length, 2);
    assert.equal(bodies[0], bodies[1], 'Retries reuse the same FormData, UUID, token and files');
    assert.equal(bodies[0].items.find(x => x[0] === 'idempotency_key')[1], job.idempotencyKey);
    assert.equal(context.myTests[0].status, 'done');
    assert.equal(notices.length, 0, 'Recovered network failure must not ask for a manual second upload');

    for (const failure of [response(503, { code: 'proof_attach_incomplete', details: { retryable: true } }),
        { ok: true, status: 200, json: async () => { throw new SyntaxError('truncated response'); } }]) {
        reset(); let calls = 0;
        context.fetch = async () => ++calls === 1 ? failure : response(200, accepted);
        await context._runCheckinProofUploadJob(job);
        assert.equal(calls, 2); assert.equal(context.myTests[0].status, 'done');
    }
    for (const failure of [response(409, { code: 'duplicate_screenshot_in_run' }),
        response(503, { code: 'proof_content_hash_storage_not_ready' }),
        { ...response(429, { code: 'rate_limited' }), headers: { get: () => '120' } }]) {
        reset(); let calls = 0;
        context.fetch = async () => { calls++; return failure; };
        await context._runCheckinProofUploadJob(job);
        assert.equal(calls, 1, 'Business/schema rejection must not auto-retry');
        assert.notEqual(context.myTests[0].status, 'done');
    }
    reset(); let calls = 0;
    context.fetch = async () => { calls++; throw new TypeError('offline'); };
    await context._runCheckinProofUploadJob(job);
    assert.equal(calls, 2, 'Only one automatic retry is allowed');
    assert.equal(context.isScreenshotProofUploadPending(1193), false);
    assert.match(notices[0], /Ошибка сети/);
    assert.doesNotMatch(notices[0], /network_error/);

    reset(); calls = 0;
    context.fetch = async () => { calls++; return response(200, accepted); };
    context.renderTests = () => { throw new Error('local render failure'); };
    await context._runCheckinProofUploadJob(job);
    assert.equal(calls, 1, 'A UI failure after attachment must not resend files');
    assert.equal(context.myTests[0].status, 'done');
    assert.match(notices[0], /Отчёт сохранён/);
    assert.doesNotMatch(notices[0], /Ошибка сети|повторите отправку/);
    console.log('Screenshot retry: same UUID/files, pending stability, disconnect, truncated JSON, transient API, business rejection, retry limit and post-save UI failure passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
