const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
const response = (body, ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => body });
const storage = new Map();
const nodes = new Map(['proof-ping-master-toggle', 'settings-proof-ping-toggle', 'auto-accept-mutual-toggle'].map(id =>
    [id, { checked: true, disabled: false, setAttribute() {} }]));
const context = {
    console, Number, String, Math, JSON, Object, Array, Set, Map, Date,
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    document: { readyState: 'loading', addEventListener() {}, getElementById: id => nodes.get(id) || null, querySelectorAll: () => [] },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    myProjects: [], myTests: [], visibilityStats: {}, myProjectsCache: null, PROJECTS_CACHE_KEY: 'projects',
    userId: 1, API_BASE: '/api', lang: 'ru', t: key => key, tg: { initData: 'fixture' }, App: {},
    _autoAcceptMutualEnabled: false, _autoAcceptMutualAvailable: true, _autoAcceptToggleInFlight: false,
    _defaultGroupJoined: true, _defaultGroupJoinedReady: true,
};
context.window = context;
vm.createContext(context);
for (const file of ['js/app-api.js', 'js/app-actions.js', 'js/proof-ping.js', 'js/app-features.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
context.showToast = () => {};
context.handleApiError = () => {};
context.applyDeviceInfoFromProfile = () => {};
context._persistDefaultGroupJoined = () => {};
context.syncDefaultGroupJoinedUi = () => {};
const writes = [], reads = [];
context.fetch = (url, options) => {
    const request = deferred();
    writes.push({ ...request, url, body: JSON.parse(options.body) });
    return request.promise;
};
context.fetchWithRetry = () => {
    const request = deferred();
    reads.push(request);
    return request.promise;
};
const data = enabled => ({ projects: [{ app_id: 30, status: 'active', proof_ping_enabled: enabled }] });
const map = (enabled, revision = context.ProofPing.captureProjectRevision()) => context._mapProjectsFromApi(data(enabled), revision);
const profile = (enabled, master = false) => ({ auto_accept_mutual: enabled, auto_accept_available: true, proof_ping_master_enabled: master });

(async () => {
    storage.set('pc_ping_pending_30', '1'); // Left behind by a previous page's interrupted save.
    context.myProjects = map(false);
    assert.equal(context.ProofPing.isEnabled(context.myProjects[0]), false, 'Mapper must keep the DB false value after reload');
    context.myProjects = map(true);
    const beforeWrite = context.ProofPing.captureProjectRevision();
    const saving = context.pcProofPingToggle(30, { checked: false });
    const duringWrite = context.ProofPing.captureProjectRevision();
    context.myProjects = map(true, beforeWrite);
    assert.equal(context.myProjects[0].proof_ping_enabled, false, 'Old poll must not overwrite an in-flight save');
    assert.match(context.ProofPing.blockHtml(context.myProjects[0]), /disabled aria-busy="true"/);
    await context.pcProofPingToggle(30, { checked: true });
    assert.equal(writes.length, 1, 'Repeated tap cannot start a conflicting write');
    writes[0].resolve(response({ status: 'success', proof_ping_enabled: false }));
    await saving;
    assert.equal(map(true, beforeWrite)[0].proof_ping_enabled, false);
    assert.equal(map(true, duringWrite)[0].proof_ping_enabled, false, 'A poll started during POST is stale too');
    assert.equal(JSON.parse(storage.get('projects')).projects[0].proof_ping_enabled, false, 'Cache must save confirmed preference');
    assert.equal(map(false)[0].proof_ping_enabled, false);
    assert.equal(map(true)[0].proof_ping_enabled, true, 'A genuinely fresh external change must still apply');

    const failedWrite = context.pcProofPingToggle(30, { checked: true });
    writes[1].resolve(response({ status: 'error' }, false));
    await failedWrite;
    assert.equal(context.ProofPing.isEnabled(context.myProjects[0]), false, 'Failed save rolls back and unlocks controls');
    assert.doesNotMatch(context.ProofPing.blockHtml(context.myProjects[0]), /disabled aria-busy="true"/);

    const oldProfile = context.loadUserProfilePreferences();
    const mutualSave = context.handleAutoAcceptMutualToggle({ checked: true });
    const duringProfile = context.loadUserProfilePreferences();
    writes[2].resolve(response({ status: 'success', auto_accept_mutual: true, auto_accept_available: true }));
    await mutualSave;
    reads[1].resolve(response(profile(false)));
    await duringProfile;
    reads[0].resolve(response(profile(false)));
    await oldProfile;
    assert.equal(context._autoAcceptMutualEnabled, true, 'Old profiles cannot undo explicit enable');
    assert.equal(nodes.get('auto-accept-mutual-toggle').checked, true);
    const unknownProfile = context.loadUserProfilePreferences();
    reads[2].resolve(response({ auto_accept_mutual: null, auto_accept_available: null }));
    await unknownProfile;
    assert.equal(context._autoAcceptMutualEnabled, true, 'Unknown preference is not false');

    const older = context.loadUserProfilePreferences();
    const newer = context.loadUserProfilePreferences();
    reads[4].resolve(response(profile(false)));
    await newer;
    reads[3].resolve(response(profile(true)));
    await older;
    assert.equal(context._autoAcceptMutualEnabled, false, 'A fresh policy disable applies; late reads do not resurrect it');

    const masterRead = context.ProofPing.captureMasterRevision();
    const masterSave = context.pcProofPingMasterToggle({ checked: false });
    context.ProofPing.applyMasterFromProfile(true, masterRead);
    assert.equal(context.ProofPing.isMasterEnabled(), false);
    assert.equal(nodes.get('proof-ping-master-toggle').disabled, true);
    writes[3].resolve(response({ status: 'success', proof_ping_master_enabled: false }));
    await masterSave;
    context.ProofPing.applyMasterFromProfile(true, masterRead);
    context.ProofPing.applyMasterFromProfile(undefined);
    assert.equal(context.ProofPing.isMasterEnabled(), false);
    assert.equal(nodes.get('proof-ping-master-toggle').disabled, false);
    console.log('Preference state: mapping, stale polls, overlapping taps, cache, rollback, auto-accept profile races and unknown reads passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
