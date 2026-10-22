const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const c = { console, Number, String, Math, JSON, Object, Array, Set, Map, Date, AbortController,
    document: { getElementById: () => null, querySelectorAll: () => [] },
    setTimeout: fn => { fn(); return 1; }, clearTimeout() {}, sessionStorage: { removeItem() {} },
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} },
    userId: 88, getLocalDate: () => '2026-10-22', getTelegramInitDataRaw: () => 'signed',
    API_BASE: '/api', lang: 'en', tg: {}, incomingOffers: [], myTests: [],
    FormData: class { append() {} },
};
c.window = c;
vm.createContext(c);
for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'js/checkin-recovery.js', 'js/checkin-proof-upload.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, { filename: file });
}
const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
const identity = { actor: '88', appId: 30, progressId: 300, run: 1, date: '2026-10-22' };
const saved = { app_id: 30, progress_id: 300, run_iteration: 1, last_check_date: identity.date,
    checkins_count: 3, skips_count: 2, daily_timeline: '101', testing_days: 5 };
(async () => {
    c.DeployStatus = { refresh() { throw new Error('Optional observer crashed'); } };
    for (const failure of ['disconnect', 'truncated', 'unavailable', 'db']) {
        const calls = [];
        c.fetch = async (url, options) => {
            calls.push([url, options]);
            if (calls.length > 1) return reply({ to_test_today: [saved] });
            if (failure === 'disconnect') throw new TypeError('offline');
            if (failure === 'truncated') return { ok: true, status: 200, json: async () => { throw new Error('json'); } };
            return reply({ code: 'database_error' }, failure === 'unavailable' ? 503 : 200);
        };
        const result = await (await c.fetchCheckinWithRecovery('/api/checkin', { method: 'POST' }, identity)).json();
        assert.equal(result.status, 'success');
        assert.equal(result.already_checked_today, true);
        assert.equal(result.earned_bust, 0);
        assert.equal(result.checkins_count, 3);
        assert.equal(calls.filter(x => x[1].method === 'POST').length, 1, 'Never repeat a write for recovery');
    }
    for (const mismatch of [{ progress_id: 301 }, { run_iteration: 2 }, { app_id: 31 }, { last_check_date: '2026-10-21' }]) {
        c.fetch = async (url) => {
            if (url === '/api/checkin') throw new TypeError('offline');
            return reply({ to_test_today: [{ ...saved, ...mismatch }] });
        };
        await assert.rejects(c.fetchCheckinWithRecovery('/api/checkin', {}, identity), /offline/);
    }
    let calls = 0;
    c.fetch = async () => { calls++; return reply({ status: 'error', code: 'day_boundary_moved' }); };
    assert.equal((await (await c.fetchCheckinWithRecovery('/api/checkin', {}, identity)).json()).code, 'day_boundary_moved');
    assert.equal(calls, 1, 'Business errors retain their original semantics');
    c.userId = 89; calls = 0;
    c.fetch = async () => { calls++; throw new TypeError('offline'); };
    await assert.rejects(c.fetchCheckinWithRecovery('/api/checkin', {}, identity));
    assert.equal(calls, 1, 'Do not reconcile across accounts');
    c.userId = 88;

    c.myTests = [{ id: 30, progress_id: 300, run_iteration: 1 }];
    c.loadTasks = async () => {};
    c.showToast = () => {};
    const file = { name: 'report.png', size: 1, type: 'image/png' };
    const job = { appId: 30, progressId: 300, files: [file], fingerprints: ['sha256:one'],
        submissionMode: 'standard', catchupRequested: false, idempotencyKey: 'same-uuid',
        draftKey: c._proofDraftKey(300, 'standard') };
    await c._runCheckinProofUploadJob(job); // both automatic attempts fail offline
    Object.assign(c._checkinProofUploadState, { appId: 30, progressId: 300,
        submissionMode: 'standard', catchupRequested: false });
    assert.equal(c.restoreCheckinProofRetryDraft(), true);
    assert.equal(c._checkinProofUploadState.files[0], file, 'Restore the original File, not a placeholder');
    assert.equal(c._checkinProofUploadState.idempotencyKey, 'same-uuid');
    assert.equal(c._checkinProofUploadState.fingerprints[0], 'sha256:one');
    c.myTests[0].run_iteration = 2;
    assert.equal(c.restoreCheckinProofRetryDraft(), false, 'Retest must not restore a previous run draft');
    c.myTests[0].run_iteration = 1;
    c.userId = 89;
    assert.equal(c.restoreCheckinProofRetryDraft(), false);
    c.userId = 88; c.getLocalDate = () => '2026-10-23';
    assert.equal(c.restoreCheckinProofRetryDraft(), false, 'Do not send a yesterday draft as today');
    console.log('Deploy recovery: observer failure isolation, lost/truncated/503/DB reply, one write only, authoritative confirmation, account/day/run identity and original screenshot/UUID restore passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
