const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const language of ['ru', 'en']) {
            const page = await browser.newPage({ viewport: { width: 390, height: 850 }, timezoneId: 'Asia/Bangkok' });
            const errors = []; page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(() => {
                const NativeDate = Date;
                window.fixtureNow = NativeDate.parse('2026-10-12T05:00:00Z');
                window.Date = class extends NativeDate {
                    constructor(...args) { super(...(args.length ? args : [window.fixtureNow])); }
                    static now() { return window.fixtureNow; }
                };
            });
            await page.route('http://fixture.local/**', route => route.fulfill({ contentType: 'text/html', body: '<main id="fixture"></main>' }));
            await page.goto('http://fixture.local/');
            for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'js/project-today.js']) {
                await page.addScriptTag({ path: path.join(root, file) });
            }
            await page.evaluate(language => {
                window.lang = language; window.currentLang = language;
                Object.assign(window.t, language === 'ru' ? I18NRU : I18NEN);
                window.getLocalDate = () => {
                    const d = new Date();
                    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                };
                window.App = {};
                window.fetch = () => { throw new Error('Unexpected network or award'); };
                window.project = {
                    id: 712, name: 'QuickChat', status: 'active', run_iteration: 5, reward_owner_local_date: '2026-10-12',
                    testers: [{ tester_id: 188310857, progress_id: 11419, username: 'mksaint13', full_name: 'mksaint13',
                        start_date: '2026-09-28', last_check_date: '2026-10-12', checkins_count: 15 }],
                    reward_history: [{ id: 'feedback:1104', tester_id: 188310857, run_iteration: 5, kind: 'feedback',
                        feedback_id: 1104, feedback_type: 'google_play_review_tipped', karma_amount: 1.5,
                        reward_local_date: '2026-10-12', created_at: '2026-10-12T01:34:03Z' }],
                };
                window.myProjects = [project];
                ProjectToday.setParticipantsCollapsed(712, false);
                localStorage.setItem('pc_activity_prefs_v2_712', JSON.stringify({ filter: 'contribution', touched: true }));
                window.draw = () => { document.getElementById('fixture').innerHTML = ProjectToday.buildSection(project); };
                window.setRows = rows => {
                    ProjectToday.invalidate(712);
                    localStorage.setItem('pc_activity_cache_v2_712', JSON.stringify({ date: getLocalDate(), loadedAt: Date.now(), control: [], others: rows }));
                    draw();
                };
                window.row = { testerId: 188310857, tester: project.testers[0], proofType: 'bug', proofId: 77,
                    feedbackId: 1104, feedbackStatus: 'pending', feedbackText: 'Actual report', received: true,
                    createdAt: '2026-10-12T01:05:00Z', imageCount: 0 };
                draw();
            }, language);
            const count = () => page.evaluate(() => ProjectToday.activityCounts(project).contribution.length);
            assert.equal(await count(), 0, 'Late acceptance/reward alone cannot resurface mksaint13');
            await page.evaluate(() => { project.reward_history[0].kind = 'general'; project.reward_history[0].type = 'good'; draw(); });
            assert.equal(await count(), 0, 'General thanks alone is not a new contribution');

            await page.evaluate(() => setRows([row]));
            assert.equal(await count(), 1, 'New report belongs in today even before processing');
            assert.equal(await page.locator('.pc-activity-timeline-step.is-pending').count(), 1);
            for (const status of ['accepted', 'rejected']) {
                await page.evaluate(status => {
                    ProjectToday.getCacheEntry(712).others[0].feedbackStatus = status;
                    draw();
                }, status);
                assert.equal(await count(), 1, 'Processing during submission day does not hide the tester');
                assert.equal(await page.locator('.pc-activity-timeline-step.is-completed').count(), 1);
            }
            await page.evaluate(() => { window.fixtureNow = Date.parse('2026-10-13T05:00:00Z'); draw(); });
            assert.equal(await count(), 0, 'Yesterday contribution disappears without reload, even from an in-memory cache');
            await page.evaluate(() => {
                Object.assign(project.reward_history[0], { reward_local_date: '2026-10-13', created_at: '2026-10-13T05:00:00Z' });
                project.reward_owner_local_date = '2026-10-13'; draw();
            });
            assert.equal(await count(), 0, 'Processing yesterday report today must not add it again');
            await page.evaluate(() => {
                setRows([{ ...row, proofId: 78, feedbackId: 1105, proofType: 'idea', feedbackStatus: 'pending', createdAt: '2026-10-13T01:00:00Z' }, row]);
            });
            assert.equal(await count(), 1, 'Actual new contribution by the same tester appears normally');
            assert.equal(await page.locator('.pc-activity-timeline-step').count(), 1, 'Old reason does not accompany the new one');
            await page.evaluate(() => setRows([{ ...row, createdAt: '2026-10-13T02:00:00Z', contributionCreatedAt: '2026-10-12T01:05:00Z' }]));
            assert.equal(await count(), 0, 'Original feedback submission date wins over a newer proof/detail timestamp');
            await page.evaluate(() => setRows([{ ...row, createdAt: '2026-10-12T20:00:00Z' }]));
            assert.equal(await count(), 1, 'UTC date prefix may be yesterday while the owner local date is today');
            await page.evaluate(() => setRows([{ ...row, proofType: 'screenshot', feedbackId: 0, imageCount: 3, createdAt: '2026-10-13T02:00:00Z' }]));
            assert.equal(await count(), 1, 'New screenshot series remains a valuable contribution');
            await page.evaluate(() => { ProjectToday.getCacheEntry(712).others[0].imageCount = 1; draw(); });
            assert.equal(await count(), 0, 'An ordinary single-image check-in is not extra contribution');
            assert.equal(await page.evaluate(() => pcRewardEntriesForTester(project, 188310857).length), 1, 'Reward history remains intact');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Contribution: submission-day membership, same-day processing, no reward-only resurrection, memory-cache rollover, new contribution, original timestamps, timezone and preserved history passed in RU/EN');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
