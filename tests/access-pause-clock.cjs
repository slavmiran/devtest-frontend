const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console, lang: 'en', visibilityStats: { ownerKarma: 20 },
    document: { addEventListener() {}, getElementById() { return null; } },
    addEventListener() {}, getLocalDate: () => '2026-10-20', t: key => key, escapeHTML: value => String(value),
    parseLocalDateOnly: value => value ? new Date(value + 'T00:00:00') : null });
context.window = context;
vm.runInContext(fs.readFileSync(path.join(root, 'ui/ui-tests.js'), 'utf8'), context);
const api = fs.readFileSync(path.join(root, 'js/app-api.js'), 'utf8');
const normalize = api.slice(api.indexOf('function _normalizeCachedTests('), api.indexOf('\nfunction getTestsCache('));
vm.runInContext(normalize, context);
for (const language of ['en', 'ru']) {
    context.lang = language;
    for (const test of [
        { start_date: '2026-10-06', testing_days: 13, access_pause_days: 2,
          last_check_date: '2026-10-17', checkins_count: 12, skips_count: 0,
          daily_timeline: '111111111111', issue_reported_at: '2026-10-18T01:32:33Z' },
        { start_date: '2026-10-12', testing_days: 8, access_pause_days: 1,
          last_check_date: '2026-10-20', checkins_count: 6, skips_count: 2,
          daily_timeline: '01111101', issue_reported_at: null },
    ]) {
        const [normalized] = context._normalizeCachedTests([test]);
        assert.equal(normalized.testing_days, test.testing_days, 'Cache must not rewind to the unpaused calendar');
        assert.equal(context.getResolvedTestingDay(normalized), test.testing_days);
        const grant = context.getGrantEstimateData(normalized);
        assert.equal(grant.skips, test.skips_count);
        assert.equal(grant.total, test.skips_count === 0 ? 200 : 150);
        const progress = context.buildGrantProgressSegments(normalized, normalized.testing_days, 14);
        assert.equal((progress.baseSegmentsHtml.match(/standard-skip/g) || []).length, test.skips_count);
    }
}
assert.match(api, /getUserTestingDay\(app.start_date, app.testing_days\)/);
assert.match(api, /access_pause_days: Number\(app.access_pause_days/);
console.log('access-pause clock, grant and timeline: RU/EN passed');
