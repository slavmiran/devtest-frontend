const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const [language, width] of [['ru', 360], ['en', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [], gets = [], posts = [], waitingPosts = new Map(), waitingReads = [];
            let holdRead = false;
            const ticket = (id, app_id, type = 'bug') => ({ id, app_id, tester_id: id + 500,
                tester_username: 'tester' + id, tester_full_name: 'Tester ' + id, type, status: 'pending',
                message_text: 'Useful feedback ' + id, created_at: '2026-10-23T01:00:00Z',
                contribution_lifetime_score: 7, project_karma_available: true, thanks_available: true,
                special_available: true, thanks_max: 4, thanks_used: 0, special_max: 2, special_used: 0 });
            const rows = { 30: [ticket(101, 30), ticket(102, 30, 'idea'), ticket(103, 30),
                ticket(104, 30, 'google_play_review'), ticket(105, 30)], 40: [ticket(201, 40)], 50: [], 60: [] };
            page.on('pageerror', error => errors.push(error.message));
            await page.addInitScript(language => {
                window.__API_BASE__ = 'http://fixture.local/api';
                window.Telegram = { WebApp: {
                    initDataUnsafe: { user: { id: 880, language_code: language } }, initData: 'fixture',
                    themeParams: {}, colorScheme: 'dark', expand() {}, ready() {}, onEvent() {}, offEvent() {},
                    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} },
                } };
            }, language);
            await page.route('**/*', async route => {
                const url = new URL(route.request().url());
                const read = url.pathname.match(/\/projects\/(\d+)\/feedback$/);
                const write = url.pathname.match(/\/feedback\/(\d+)\/(reward|reject|reject-play-review)$/);
                if (read) {
                    const scope = url.searchParams.get('status') || 'all';
                    gets.push({ app: Number(read[1]), scope });
                    const snapshot = rows[read[1]].filter(row => scope === 'all' || row.status === 'pending').map(row => ({ ...row }));
                    if (holdRead) {
                        holdRead = false;
                        await new Promise(resolve => waitingReads.push(resolve));
                    }
                    return route.fulfill({ json: { status: 'success', feedback: snapshot, scope } });
                }
                if (write) {
                    const id = Number(write[1]), kind = write[2], body = route.request().postDataJSON();
                    posts.push({ id, kind, body });
                    const mode = await new Promise(resolve => waitingPosts.set(id, resolve));
                    waitingPosts.delete(id);
                    if (mode === 'error') return route.fulfill({ status: 409, json: { status: 'error', code: 'insufficient_bust_balance' } });
                    const row = Object.values(rows).flat().find(row => row.id === id);
                    Object.assign(row, kind === 'reward' ? { status: 'accepted', reward_bust: body.bust_amount,
                        reward_karma: body.karma_amount, developer_reply: body.reply_text }
                        : { status: 'rejected', rejection_reason: body.reason });
                    if (mode === 'lost') return route.abort('failed');
                    return route.fulfill({ json: { status: 'success', result: { ...row } } });
                }
                if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { enabled: false, events: [] } });
                if (url.hostname !== 'fixture.local') return route.fulfill({ contentType: 'application/javascript', body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file));
                const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
                return route.fulfill({ contentType: types[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(language => {
                lang = language; updateTranslations(language);
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                myProjects = [30, 40, 50, 60].map(id => ({ id, name: 'Project ' + id, testers: [],
                    feedback_new_count: id === 30 ? 5 : 1, feedback_total_count: id === 30 ? 5 : 1 }));
                archivedProjects = []; visibilityStats = { balance_bust: 1000 };
                window.toasts = []; showToast = value => toasts.push(value);
                window.projectRefreshes = 0; loadProjects = async () => { projectRefreshes++; };
            }, language);
            const waitPost = async id => {
                await page.waitForFunction(id => isFeedbackProcessing(_activeProjectFeedbackAppId, id), id);
                while (!waitingPosts.has(id)) await new Promise(resolve => setTimeout(resolve, 10));
            };
            const waitRewardDone = () => page.waitForFunction(() => !_feedbackRewardSubmitting);
            const reward = async (id, reply = 'Thanks for the report', bust = 5) => {
                await page.evaluate(id => openFeedbackRewardModal(_activeProjectFeedbackAppId, id), id);
                await page.locator('#feedback-reward-reply').fill(reply);
                await page.evaluate(bust => { setFeedbackRewardBust(bust); setFeedbackRewardKarma(1); }, bust);
                await page.locator('#feedback-reward-submit-btn').click();
                await page.waitForFunction(() => !document.getElementById('feedback-reward-modal').classList.contains('active'), null, { timeout: 1000 });
                await waitPost(id);
            };
            await page.evaluate(() => openProjectFeedback(30, false));
            assert.equal(await page.locator('.fb-card').count(), 5);
            assert.deepEqual(gets, [{ app: 30, scope: 'open' }], 'First paint must not also fetch the entire history');
            await page.evaluate(() => { closeProjectFeedbackModal(); return openProjectFeedback(30, false); });
            assert.equal(gets.length, 1, 'Fresh reopen must reuse the session cache');

            holdRead = true;
            await page.evaluate(() => {
                window.lateRead = fetchProjectFeedbackPayload(30, 'all');
                window.sameRead = fetchProjectFeedbackPayload(30, 'all');
            });
            await page.waitForTimeout(50);
            assert.equal(gets.length, 2, 'Identical concurrent reads are shared');
            await reward(101);
            assert.equal(await page.locator('.fb-card[data-feedback-id="101"][aria-busy="true"]').count(), 1);
            assert(await page.locator('.fb-card[data-feedback-id="101"] .fb-saving-note').isVisible());
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 101).status), 'pending', 'Do not show success before the server commits');
            await page.evaluate(() => { openFeedbackRewardModal(30, 101); submitFeedbackReward(); });
            assert.equal(posts.length, 1, 'Pending ticket cannot be submitted twice');
            await page.evaluate(() => openFeedbackRewardModal(30, 102));
            await page.locator('#feedback-reward-reply').fill('Next draft must survive the previous response');
            assert(await page.locator('#feedback-reward-submit-btn').isDisabled(), 'Do not overlap financial reward submissions');
            waitingPosts.get(101)('success');
            await waitRewardDone();
            assert.equal(await page.locator('#feedback-reward-modal.active').count(), 1);
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Next draft must survive the previous response');
            assert(await page.locator('#feedback-reward-submit-btn').isEnabled());
            assert.equal(posts[0].body.reply_text, 'Thanks for the report');
            assert.equal(posts[0].body.bust_amount, 5);
            assert.equal(posts[0].body.karma_amount, 1);
            assert.equal(await page.evaluate(() => projectRefreshes), 1, 'One post-commit refresh, not two');
            waitingReads.shift()();
            assert.equal(await page.evaluate(async () => (await lateRead).feedback.find(row => row.id === 101).status), 'accepted', 'Stale reads cannot resurrect processed tickets');
            await page.evaluate(() => closeFeedbackRewardModal());

            await reward(103, 'Keep this failed reply', 10);
            waitingPosts.get(103)('error');
            await waitRewardDone();
            assert.equal(await page.locator('.fb-card[data-feedback-id="103"][aria-busy="true"]').count(), 0);
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 103).status), 'pending');
            await page.evaluate(() => openFeedbackRewardModal(30, 103));
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Keep this failed reply');
            assert.equal(await page.evaluate(() => _feedbackRewardBust), 10);
            await page.locator('#feedback-reward-submit-btn').click();
            await waitPost(103);
            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(40, false); openFeedbackRewardModal(40, 201); });
            await page.locator('#feedback-reward-reply').fill('Other project draft');
            waitingPosts.get(103)('success');
            await waitRewardDone();
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Other project draft');
            assert.equal(await page.evaluate(() => _feedbackRewardTargetId), 201);
            assert.equal(await page.evaluate(() => getProjectFeedbackSession(30).items.find(row => row.id === 103).status), 'accepted');
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems[0].status), 'pending');
            await page.evaluate(async () => { closeFeedbackRewardModal(); closeProjectFeedbackModal(); await openProjectFeedback(30, false); });

            await page.evaluate(() => openFeedbackRejectModal(102, 30));
            await page.locator('.feedback-reject-chip[data-reason="duplicate"]').click();
            await page.locator('#feedback-reject-submit-btn').click();
            await waitPost(102);
            assert.equal(await page.locator('#feedback-reject-modal.active').count(), 0);
            waitingPosts.get(102)('error');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 102));
            await page.evaluate(() => openFeedbackRejectModal(102, 30));
            assert.equal(await page.evaluate(() => _feedbackRejectState.reason), 'duplicate');
            await page.locator('#feedback-reject-submit-btn').click();
            await waitPost(102);
            await page.evaluate(() => { openFeedbackRejectModal(105, 30); selectFeedbackRejectReason('spam'); });
            waitingPosts.get(102)('success');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 102));
            assert.equal(await page.locator('#feedback-reject-modal.active').count(), 1, 'Old success must not close the next decision');
            assert.equal(await page.evaluate(() => _feedbackRejectState.reason), 'spam');
            await page.evaluate(() => closeFeedbackRejectModal());

            await page.evaluate(() => openPlayReviewRejectModal(104, 30));
            await page.locator('.play-review-reject-chip[data-reason="not_found"]').click();
            await page.locator('#play-review-reject-submit-btn').click();
            await waitPost(104);
            assert.equal(await page.locator('#play-review-reject-modal.active').count(), 0);
            waitingPosts.get(104)('error');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 104));
            await page.evaluate(() => openPlayReviewRejectModal(104, 30));
            assert.equal(await page.evaluate(() => _playReviewRejectState.reason), 'not_found');
            await page.locator('#play-review-reject-submit-btn').click();
            await waitPost(104);
            waitingPosts.get(104)('success');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 104));

            await reward(105, 'Saved despite lost response', 0);
            const beforeLost = posts.length;
            waitingPosts.get(105)('lost');
            await waitRewardDone();
            assert.equal(posts.length, beforeLost, 'Lost reply must trigger a read, not another reward POST');
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 105).status), 'accepted');

            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(50, false); closeProjectFeedbackModal(); await openProjectFeedback(50, false); });
            assert.equal(gets.filter(get => get.app === 50).length, 1, 'Empty queues are cached too');
            await page.evaluate(() => { toggleFeedbackUnprocessedOnly(false); toggleFeedbackUnprocessedOnly(false); });
            await page.waitForFunction(() => _activeProjectFeedbackFullLoaded);
            assert.equal(gets.filter(get => get.app === 50 && get.scope === 'all').length, 1);
            await page.evaluate(() => { toggleFeedbackUnprocessedOnly(true); toggleFeedbackUnprocessedOnly(false); });
            assert.equal(gets.filter(get => get.app === 50 && get.scope === 'all').length, 1, 'An empty complete history must not be refetched');
            holdRead = true;
            await page.evaluate(() => { window.closedLoad = openProjectFeedback(60, false); });
            while (!waitingReads.length) await new Promise(resolve => setTimeout(resolve, 10));
            await page.evaluate(() => closeProjectFeedbackModal());
            waitingReads.shift()();
            await page.evaluate(() => closedLoad);
            assert.equal(await page.locator('#project-feedback-modal.active').count(), 0, 'Late loading response must not reopen a closed center');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Feedback RU/EN 360/390: lazy history, shared reads/cache, immediate decision close, pending state, immutable requests, drafts, cross-project responses, stale reads and lost-reply reconciliation passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
