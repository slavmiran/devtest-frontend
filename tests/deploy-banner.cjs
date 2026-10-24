const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
let now = 0, next = 1, status = { enabled: true, state: 'complete', deploy_id: 'dep-old' };
const timers = new Map(), classes = new Set(), events = {};
function node() { return { hidden: false, dataset: {}, style: {}, offsetHeight: 80, setAttribute() {} }; }
const nodes = [];
const c = { console, Promise, Number, String, Math, Date, AbortController, API_BASE: '/api', lang: 'en',
    setTimeout(fn, delay) { const id = next++; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
    t: key => key,
    document: { readyState: 'complete', hidden: false, createElement: node,
        documentElement: { style: { setProperty() {} }, classList: { add: x => classes.add(x), remove: x => classes.delete(x) } },
        body: { prepend(...items) { nodes.push(...items); } }, addEventListener(name, fn) { events[name] = fn; } },
    addEventListener(name, fn) { events[name] = fn; },
    fetch: async () => ({ ok: true, json: async () => status }),
};
c.window = c;
vm.createContext(c);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/deploy-status.js'), 'utf8'), c);
const flush = () => new Promise(resolve => setImmediate(resolve));
async function poll(value) { await flush(); status = value; await c.DeployStatus.refresh(); await flush(); }
async function tick(ms) {
    now += ms;
    for (const [id, item] of [...timers]) if (item.at <= now) { timers.delete(id); item.fn(); }
    await flush();
}
(async () => {
    await flush();
    const banner = nodes[1];
    assert.equal(banner.hidden, true, 'Do not announce a historical live release');
    await poll({ enabled: true, state: 'updating', deploy_id: 'dep-new', valid_for_seconds: 1 });
    assert.equal(banner.dataset.state, 'updating');
    assert(classes.has('deploy-banner-visible'));
    await tick(1100);
    assert.equal(banner.hidden, true, 'Stale evidence hides quietly without checking/failed text');
    await poll({ enabled: true, state: 'complete', deploy_id: 'dep-new' });
    assert.equal(banner.dataset.state, 'complete');
    await poll({ enabled: true, state: 'unknown' });
    assert.equal(banner.dataset.state, 'complete', 'A warming-up instance cannot undo verified completion');
    await poll({ enabled: true, state: 'complete', deploy_id: 'dep-new' });
    await tick(10001);
    assert.equal(banner.hidden, false, 'Availability stays visible for at least a minute');
    await tick(50000);
    assert.equal(banner.hidden, true, 'Repeated polls must not cancel the completion hide timer');
    await poll({ enabled: true, state: 'updating', deploy_id: 'dep-new', valid_for_seconds: 45 });
    assert.equal(banner.hidden, true, 'Old instance cannot reopen a completed deploy');
    await poll({ enabled: true, state: 'updating', deploy_id: 'dep-next', valid_for_seconds: 45 });
    assert.equal(banner.hidden, false);
    await poll({ enabled: true, state: 'failed', deploy_id: 'dep-next' });
    assert.equal(banner.hidden, true, 'An older backend technical failure must not render a third state');
    await poll({ enabled: false });
    assert.equal(banner.hidden, true);
    assert(!classes.has('deploy-banner-visible'));
    assert.equal(typeof events.focus, 'function');
    assert.equal(typeof events.visibilitychange, 'function');
    assert([...timers.values()].some(item => item.at === now + 60000), 'Idle/disabled polling uses one minute');
    console.log('Deploy banner: only two messages, quiet expiry/failure, 60s completion, idle polling, stale-instance guard and disabled mode passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
