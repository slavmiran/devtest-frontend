const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
let now = 1000000, day = '2026-10-22', readyCalls = 0, fetches = 0;
const storage = new Map();
const c = { console, Number, String, Math, JSON, Object, Array, Set, Map,
    Date: class extends Date { static now() { return now; } },
    document: { getElementById: () => null, querySelector: () => null },
    localStorage: { getItem: k => storage.get(k) || null, setItem: (k,v) => storage.set(k,v) },
    _timerReadyStateKey: 'ready', _timerReadyState: {}, _checkinOpenTokenState: {},
    activeTimerAppId: null, myTests: [{ id: 30, progress_id: 300, run_iteration: 1, testing_days: 7 }],
    userId: 88, API_BASE: '/api', tg: { openLink() {} }, getLocalDate: () => day,
    withInitData: x => x, getBackendErrorCode: x => x.code, handleApiError() {},
    isMandatoryScreenshotDay: n => [1,4,7,10,14].includes(n),
};
c.window = c;
vm.createContext(c);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/app-actions.js'), 'utf8'), c);
c._syncActiveTimerState = () => false;
c._setTimerButtonReady = () => { readyCalls++; };
c._onStoreLinkClickedForIssueFlow = () => {};
c._resolveCheckpointOwnerUsername = () => 'owner';
const mature = () => ({ token: 'original-signed-token', readyAtMs: now - 1, expiresAtMs: 0,
    progressId: 300, localDate: day, actorUserId: '88', runIteration: 1 });
(async () => {
    c._checkinOpenTokenState['30'] = mature();
    c.fetch = async () => { fetches++; throw new Error('A completed timer must not request another token'); };
    await c._startTimerAsync(30, 'app.package', true, 'owner');
    assert.equal(readyCalls, 1);
    assert.equal(c.activeTimerAppId, null, 'No second countdown after a failed submission/rerender');
    assert.equal(c._timerReadyState['30'].openToken, 'original-signed-token');
    assert.equal((await c._requestCheckinOpenToken(30)).token, 'original-signed-token');
    assert.equal(fetches, 0);
    c._timerReadyState = {};
    c._checkinOpenTokenState['30'] = { ...mature(), readyAtMs: now + 2000 };
    c.document.getElementById = () => ({ disabled: true });
    c.t = { timerRemaining: '{sec} seconds' };
    c._persistActiveTimer = () => {};
    c._setConfirmButtonLabel = () => {};
    c._startActiveTimerInterval = () => {};
    await c._startTimerAsync(30, 'app.package', true, 'owner');
    assert(c._timerEndTimestamp - now <= 2000, 'An interrupted initial wait resumes its remainder, not another 15 seconds');
    c.activeTimerAppId = null;
    c.document.getElementById = () => null;
    c._checkinOpenTokenState['30'] = mature();
    c._getTimerReadyPayload(30);
    c._timerReadyState = {}; c._checkinOpenTokenState = {};
    c._loadTimerReadyState();
    assert.equal(c._getCheckinOpenToken(30), 'original-signed-token', 'Reload restores the completed session');

    for (const mismatch of [{ localDate: '2026-10-21' }, { runIteration: 2 }, { progressId: 301 },
        { actorUserId: '89' }, { expiresAtMs: now - 1 }]) {
        c._timerReadyState = {}; c._checkinOpenTokenState['30'] = { ...mature(), ...mismatch };
        assert.equal(c._getTimerReadyPayload(30), null, JSON.stringify(mismatch));
    }
    c._timerReadyState = {}; c._checkinOpenTokenState['30'] = {
        ...mature(), readyAtMs: 115000, serverNowMs: 100000, receivedAtMs: now,
    };
    assert.equal(c._getTimerReadyPayload(30), null, 'Phone clock skew must not waive the initial test');
    now += 15001;
    assert(c._getTimerReadyPayload(30), 'The already completed wait is recovered using server clock offset');

    c._timerReadyState = {}; c._checkinOpenTokenState = {};
    let release;
    c.fetch = () => { fetches++; return new Promise(resolve => { release = resolve; }); };
    const first = c._requestCheckinOpenToken(30), second = c._requestCheckinOpenToken(30);
    assert.equal(fetches, 1, 'Concurrent Open + retry share a request, not two fresh 15-second sessions');
    c._timerReadyState['30'] = { localDate: day, isScreenshot: true, progressId: 300 };
    release({ ok: true, json: async () => ({ status: 'success', required: true, token: 'late-signed-token',
        ready_at_ms: now - 1, progress_id: 300, server_now_ms: now }) });
    await Promise.all([first, second]);
    assert.equal(c._timerReadyState['30'].openToken, 'late-signed-token', 'Late Open response is persisted into the ready state');

    c._timerReadyState = {}; c._checkinOpenTokenState = {};
    const late = c._requestCheckinOpenToken(30);
    day = '2026-10-23';
    release({ ok: true, json: async () => ({ status: 'success', token: 'yesterday', progress_id: 300 }) });
    assert.equal(await late, null);
    assert.equal(c._checkinOpenTokenState['30'], undefined);
    console.log('Timer retry: no second 15s countdown, signed token reuse, reload, concurrent/late Open, server-clock offset, day/run/actor/participation/expiry guards passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
