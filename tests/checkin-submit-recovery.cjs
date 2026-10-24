const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const actions = fs.readFileSync(path.join(root, 'js/app-actions.js'), 'utf8');
const source = actions.slice(actions.indexOf('async function confirmStart('), actions.indexOf('function handleClaimGrantClick('));
const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });
function fixture() {
    let day = '2026-10-22';
    const errors = [], requests = [];
    const row = { id: 30, progress_id: 300, run_iteration: 1, status: 'opened',
        app_status: 'active', progress_status: 'active', checkins_count: 2, testing_days: 5 };
    const ready = { localDate: day, openToken: 'original-token', progressId: 300, readyAtMs: 100, expiresAtMs: 999999 };
    const c = { console: { error() {} }, Number, String, Math, JSON, Object, Array, Set, Map, Date, AbortController,
        setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
        myTests: [row], incomingOffers: [], userId: 88, API_BASE: '/api', lang: 'en', tg: {},
        t: { confirmed: 'done', checkinAlreadyDone: 'already', successCheckin: 'saved' },
        _pendingActions: new Set(), _timerReadyState: { '30': ready },
        getLocalDate: () => day, getTelegramInitDataRaw: () => 'signed',
        document: { getElementById: id => id === 'test-card-30' ? {} : null },
        withInitData: x => x, canTogglePlayReview: () => false,
        _getCheckinOpenToken: () => 'original-token',
        _requestCheckinOpenToken: async () => { throw new Error('Must reuse the open token'); },
        setFirstDayScreenshotVisible() {}, clearActiveTimerForApp() {},
        setTimerReadyForConfirm(id, enabled) { if (!enabled) delete c._timerReadyState[id]; },
        invalidateCheckinOpenToken(id) { delete c._timerReadyState[id]; },
        _persistTimerReadyState() {}, animateTestCardOut: async () => {},
        setTestsCache() {}, renderTests() {}, refreshOpenModals() {},
        getBackendErrorCode: x => x.code, handleApiError: code => errors.push(code),
        showToast() {}, showCheckinRewardToasts() {},
        rememberConfirmedTestCheckin(test) { test.confirmed_checkin_view_date = day; },
        countGrantSkips: () => 0, loadTasks: async () => {}, loadProjects: async () => {},
        recomputeLocalTestState(test) { test.status = test.last_check_date === day ? 'done' : 'daily'; },
    };
    c.window = c;
    vm.createContext(c);
    vm.runInContext(fs.readFileSync(path.join(root, 'js/checkin-recovery.js'), 'utf8'), c);
    vm.runInContext(source, c);
    return { c, row, ready, errors, requests, setDay: x => { day = x; } };
}
async function finish(c) {
    await c.confirmStart(30);
    for (let i = 0; i < 30 && c._pendingActions.size; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(c._pendingActions.size, 0, 'Pending action must always be released');
}
(async () => {
    let f = fixture();
    f.c.fetch = async (url, options) => {
        f.requests.push([url, options]);
        if (options.method === 'POST') throw new TypeError('lost response');
        return response({ to_test_today: [{ app_id: 30, progress_id: 300, run_iteration: 1,
            last_check_date: '2026-10-22', testing_days: 5, checkins_count: 3, skips_count: 2 }] });
    };
    await finish(f.c);
    assert.equal(f.row.status, 'done');
    assert.equal(f.row.checkins_count, 3);
    assert.equal(f.requests.filter(x => x[1].method === 'POST').length, 1);
    assert.deepEqual(f.errors, []);

    for (const mode of ['offline', 'unavailable', 'day_boundary_moved']) {
        f = fixture();
        f.c.fetch = async (url, options) => {
            if (mode === 'offline') throw new TypeError('offline');
            if (options.method !== 'POST') return response({ to_test_today: [] });
            return response({ status: 'error', code: mode }, mode === 'unavailable' ? 503 : 200);
        };
        await finish(f.c);
        assert.equal(f.row.status, 'opened');
        assert.equal(f.row.checkins_count, 2);
        if (mode === 'day_boundary_moved') assert.equal(f.c._timerReadyState['30'], undefined);
        else assert.equal(f.c._timerReadyState['30'].openToken, 'original-token', 'Keep token/date/deadline, not just a ready boolean');
    }
    f = fixture();
    f.c.fetch = async () => response({ status: 'success', checkins_count: 3 });
    f.c.showCheckinRewardToasts = () => { throw new Error('UI rendering failure'); };
    await finish(f.c);
    assert.equal(f.row.status, 'done', 'UI failure must not roll back a confirmed server save');
    assert.deepEqual(f.errors, []);

    f = fixture();
    f.c.fetch = async () => { f.setDay('2026-10-23'); return response({ status: 'success', last_check_date: '2026-10-22' }); };
    await finish(f.c);
    assert.equal(f.row.status, 'daily', 'Yesterday reply must not hide today task');
    assert.equal(f.row.confirmed_checkin_view_date, undefined);
    console.log('Actual confirmStart: saved/lost reply, exact timer/token restore, explicit day-boundary rejection, post-save UI failure and late yesterday response passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
