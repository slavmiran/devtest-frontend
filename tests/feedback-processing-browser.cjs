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
                ticket(104, 30, 'google_play_review'), ticket(105, 30)], 40: [ticket(201, 40)], 50: [], 60: [],
                70: [ticket(301, 70), ticket(302, 70), ticket(303, 70), ticket(304, 70)], 80: [ticket(401, 80)] };
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
                myProjects = [30, 40, 50, 60, 70, 80].map(id => ({ id, name: 'Project ' + id, testers: [],
                    feedback_new_count: id === 30 ? 5 : 1, feedback_total_count: id === 30 ? 5 : 1,
                    bugs_new_count: id === 30 ? 3 : 1, bugs_total_count: id === 30 ? 3 : 1,
                    ideas_new_count: id === 30 ? 1 : 0, ideas_total_count: id === 30 ? 1 : 0,
                    reviews_new_count: id === 30 ? 1 : 0, reviews_total_count: id === 30 ? 1 : 0,
                    results_summary: { bugs_new_count: id === 30 ? 3 : 1, ideas_new_count: id === 30 ? 1 : 0,
                        reviews_new_count: id === 30 ? 1 : 0 } }));
                document.getElementById('projects-list').innerHTML = myProjects.map(project =>
                    '<article id="project-card-' + project.id + '" class="card card-testers-collapsed"><input class="unrelated-draft" value="Keep card state"><div class="pc-results-block-slot"></div><div class="pc-results-collapsed-slot"></div></article>'
                ).join('');
                myProjects.forEach(project => ProjectResults.refreshCard(project.id));
                window.projectApiSnapshot = JSON.parse(JSON.stringify(myProjects)).map(project => ({ ...project, app_id: project.id }));
                window.projectsReadRevision = _feedbackCommitRevision;
                archivedProjects = []; visibilityStats = { balance_bust: 1000 };
                window.toasts = []; showToast = value => toasts.push(value);
                window.projectRefreshes = 0; loadProjects = async () => { projectRefreshes++; };
            }, language);
            const waitPost = async id => {
                await page.waitForFunction(id => isFeedbackProcessing(_activeProjectFeedbackAppId, id), id);
                for (let attempt = 0; attempt < 500 && !waitingPosts.has(id); attempt++) await new Promise(resolve => setTimeout(resolve, 10));
                assert(waitingPosts.has(id), 'Expected request for ticket ' + id);
            };
            const waitRewardDone = (id, app = 30) => page.waitForFunction(({ id, app }) => !isFeedbackProcessing(app, id), { id, app });
            const reward = async (id, reply = 'Thanks for the report', bust = 5, karma = 1) => {
                await page.evaluate(id => openFeedbackRewardModal(_activeProjectFeedbackAppId, id), id);
                await page.locator('#feedback-reward-reply').fill(reply);
                await page.evaluate(({ bust, karma }) => { setFeedbackRewardBust(bust); setFeedbackRewardKarma(karma); }, { bust, karma });
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
            const firstCard = page.locator('.fb-card[data-feedback-id="101"]');
            await firstCard.locator('.fb-inbox-date').click();
            assert(await firstCard.evaluate(card => card.classList.contains('fb-card--expanded')));
            await reward(101);
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--bugs .pc-results-tile__val').innerText(), '+3', 'Results keep the pending count until the server confirms');
            assert.equal(await page.locator('.fb-card[data-feedback-id="101"][aria-busy="true"]').count(), 1);
            assert(await page.locator('.fb-card[data-feedback-id="101"] .fb-saving-note').isVisible());
            assert(await firstCard.evaluate(card => card.classList.contains('fb-card--collapsed') && !card.classList.contains('fb-card--expanded')), 'Submitting a decision collapses the card to the existing inbox row');
            assert(await firstCard.locator('.fb-saving-spinner').isVisible(), 'The compact card has a visible processing indicator');
            assert.match(await firstCard.locator('.fb-saving-note').innerText(), language === 'ru' ? /Обработка/ : /Processing/);
            await page.locator('#project-feedback-modal').screenshot({ path: path.resolve(root, '../artifacts/feedback-processing-collapsed-' + language + '.png') });
            await firstCard.locator('.fb-inbox-date').click();
            assert(await firstCard.evaluate(card => card.classList.contains('fb-card--expanded')), 'Pending cards can still be opened');
            await page.evaluate(() => { syncFeedbackProcessingCards(); syncFeedbackProcessingCards(); });
            assert(await firstCard.evaluate(card => card.classList.contains('fb-card--expanded')), 'Status sync must not collapse a card the user reopened');
            assert(await firstCard.locator('.fb-saving-spinner').isVisible(), 'Processing stays visible in expanded view');
            assert.equal(await firstCard.locator('.fb-saving-note').count(), 1, 'Repeated sync does not duplicate the status');
            assert(await firstCard.locator('.fb-action-btn--accept').isDisabled());
            assert(await firstCard.locator('.fb-action-btn--reject').isDisabled());
            await page.locator('#project-feedback-modal').screenshot({ path: path.resolve(root, '../artifacts/feedback-processing-expanded-' + language + '.png') });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 101).status), 'pending', 'Do not show success before the server commits');
            await page.evaluate(() => { openFeedbackRewardModal(30, 101); submitFeedbackReward(); });
            assert.equal(posts.length, 1, 'Pending ticket cannot be submitted twice');
            await page.evaluate(() => openFeedbackRewardModal(30, 102));
            await page.locator('#feedback-reward-reply').fill('Next draft must survive the previous response');
            assert(await page.locator('#feedback-reward-submit-btn').isEnabled(), 'Another ticket must remain submittable while the previous one is pending');
            assert.equal(await page.locator('#feedback-reward-submit-btn.btn-loading').count(), 0, 'Another ticket must not inherit the old spinner');
            waitingPosts.get(101)('success');
            await waitRewardDone(101);
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--bugs .pc-results-tile__val').innerText(), '+2', 'Results counters update immediately, without a dashboard GET');
            assert.equal(await page.locator('#project-card-30 .pc-results-collapsed__metric.is-bugs strong').innerText(), '+2');
            assert.equal(await page.locator('#project-card-40 .pc-results-collapsed__metric.is-bugs strong').innerText(), '+1', 'Other project counts do not change');
            assert.equal(await page.locator('#project-card-30 .unrelated-draft').inputValue(), 'Keep card state');
            assert(await page.locator('#project-card-30').evaluate(card => card.classList.contains('card-testers-collapsed')), 'Updating Results does not rebuild the card');
            const lateSnapshot = await page.evaluate(() => {
                const mapped = _mapProjectsFromApi({ projects: projectApiSnapshot }, undefined, projectsReadRevision);
                return mapped.find(project => project.id === 30);
            });
            assert.equal(lateSnapshot.bugs_new_count, 2, 'A late dashboard read cannot restore the old +3 badge');
            assert.equal(lateSnapshot.feedback_new_count, 4);
            assert.equal(lateSnapshot.results_summary.bugs_new_count, 2);
            assert.equal(lateSnapshot.bugs_total_count, 3, 'Historical totals are not reduced');
            const alreadyCommittedSnapshot = await page.evaluate(() => {
                const response = JSON.parse(JSON.stringify(projectApiSnapshot));
                response[0].bugs_new_count = 2; response[0].feedback_new_count = 4;
                response[0].results_summary.bugs_new_count = 2;
                return _mapProjectsFromApi({ projects: response }, undefined, projectsReadRevision)[0];
            });
            assert.equal(alreadyCommittedSnapshot.bugs_new_count, 2, 'An overlapping read may already contain the decision: never subtract it twice');
            assert.equal(await firstCard.locator('.fb-saving-note').count(), 0, 'Processing indicator clears only after success');
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
            await waitRewardDone(103);
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--bugs .pc-results-tile__val').innerText(), '+2', 'A rejected save must not remove the pending highlight');
            assert.equal(await page.locator('.fb-card[data-feedback-id="103"][aria-busy="true"]').count(), 0);
            assert.equal(await page.locator('.fb-card[data-feedback-id="103"] .fb-saving-note').count(), 0, 'Failed saves clear the indicator and retain the pending ticket');
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 103).status), 'pending');
            await page.evaluate(() => openFeedbackRewardModal(30, 103));
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Keep this failed reply');
            assert.equal(await page.evaluate(() => _feedbackRewardBust), 10);
            await page.locator('#feedback-reward-submit-btn').click();
            await waitPost(103);
            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(40, false); openFeedbackRewardModal(40, 201); });
            await page.locator('#feedback-reward-reply').fill('Other project draft');
            waitingPosts.get(103)('success');
            await waitRewardDone(103);
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Other project draft');
            assert.equal(await page.evaluate(() => _feedbackRewardTargetId), 201);
            assert.equal(await page.evaluate(() => getProjectFeedbackSession(30).items.find(row => row.id === 103).status), 'accepted');
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--bugs .pc-results-tile__val').innerText(), '+1', 'The original project updates even while another center is open');
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems[0].status), 'pending');
            await page.evaluate(async () => { closeFeedbackRewardModal(); closeProjectFeedbackModal(); await openProjectFeedback(30, false); });

            await page.evaluate(() => openFeedbackRejectModal(102, 30));
            await page.locator('.feedback-reject-chip[data-reason="duplicate"]').click();
            await page.locator('#feedback-reject-submit-btn').click();
            await waitPost(102);
            assert.equal(await page.locator('#feedback-reject-modal.active').count(), 0);
            assert(await page.locator('.fb-card[data-feedback-id="102"]').evaluate(card => card.classList.contains('fb-card--collapsed')));
            assert(await page.locator('.fb-card[data-feedback-id="102"] .fb-saving-spinner').isVisible(), 'Reject decisions use the same pending indicator');
            waitingPosts.get(102)('error');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 102));
            await page.evaluate(() => openFeedbackRejectModal(102, 30));
            assert.equal(await page.evaluate(() => _feedbackRejectState.reason), 'duplicate');
            await page.locator('#feedback-reject-submit-btn').click();
            await waitPost(102);
            await page.evaluate(() => { openFeedbackRejectModal(105, 30); selectFeedbackRejectReason('spam'); });
            waitingPosts.get(102)('success');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 102));
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--ideas.has-new').count(), 0, 'Final processed recommendation loses its highlight');
            assert.equal(await page.locator('#project-card-30 .pc-results-collapsed__metric.is-ideas').count(), 0, 'The collapsed card no longer lists the processed recommendation as new');
            assert.equal(await page.locator('#feedback-reject-modal.active').count(), 1, 'Old success must not close the next decision');
            assert.equal(await page.evaluate(() => _feedbackRejectState.reason), 'spam');
            await page.evaluate(() => closeFeedbackRejectModal());

            await page.evaluate(() => openPlayReviewRejectModal(104, 30));
            await page.locator('.play-review-reject-chip[data-reason="not_found"]').click();
            await page.locator('#play-review-reject-submit-btn').click();
            await waitPost(104);
            assert.equal(await page.locator('#play-review-reject-modal.active').count(), 0);
            assert(await page.locator('.fb-card[data-feedback-id="104"] .fb-saving-spinner').isVisible(), 'Review rejection has the same pending indicator');
            waitingPosts.get(104)('error');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 104));
            await page.evaluate(() => openPlayReviewRejectModal(104, 30));
            assert.equal(await page.evaluate(() => _playReviewRejectState.reason), 'not_found');
            await page.locator('#play-review-reject-submit-btn').click();
            await waitPost(104);
            waitingPosts.get(104)('success');
            await page.waitForFunction(() => !isFeedbackProcessing(30, 104));
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--reviews.has-new').count(), 0, 'Review rejection clears its new counter too');

            await reward(105, 'Saved despite lost response', 0);
            const beforeLost = posts.length;
            waitingPosts.get(105)('lost');
            await waitRewardDone(105);
            assert.equal(posts.length, beforeLost, 'Lost reply must trigger a read, not another reward POST');
            assert.equal(await page.evaluate(() => _activeProjectFeedbackItems.find(row => row.id === 105).status), 'accepted');
            assert.equal(await page.locator('#project-card-30 .pc-results-tile.has-new').count(), 0, 'Lost-response reconciliation also clears pending highlights');
            assert.equal(await page.locator('#project-card-30 .pc-results-collapsed').count(), 0, 'Collapsed Results disappear when there are no new findings');
            assert.equal(await page.locator('#project-card-30 .pc-results-tile--bugs .pc-results-tile__val').innerText(), '3', 'History remains in the expanded Results');
            const afterRepeatedCommit = await page.evaluate(() => {
                const revision = _feedbackCommitRevision;
                completeFeedbackProcessing(30, 105, 'accepted', { reward_bust: 0 });
                const fresh = JSON.parse(JSON.stringify(myProjects)).map(project => ({ ...project, app_id: project.id }));
                fresh[0].bugs_new_count = 1; fresh[0].feedback_new_count = 1;
                fresh[0].results_summary.bugs_new_count = 1;
                return { revisionUnchanged: revision === _feedbackCommitRevision,
                    fresh: _mapProjectsFromApi({ projects: fresh }, undefined, revision)[0] };
            });
            assert(afterRepeatedCommit.revisionUnchanged, 'Repeat settlement is not a second counter event');
            assert.equal(afterRepeatedCommit.fresh.bugs_new_count, 1, 'A fresh read with a newly arrived report is authoritative');
            assert.equal(await page.evaluate(() => myProjects.find(project => project.id === 30).bugs_new_count), 0);

            // Multiple decisions can leave the shared modal immediately. Financial
            // mutations retain their old order in the background, not in the UI.
            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(70, false); });
            await reward(301, 'First financial decision', 20);
            await page.evaluate(() => openFeedbackRewardModal(70, 302));
            assert(await page.locator('#feedback-reward-submit-btn').isDisabled(), 'An empty form stays disabled, without inheriting a spinner');
            assert.equal(await page.locator('#feedback-reward-submit-btn.btn-loading').count(), 0);
            await page.locator('#feedback-reward-reply').fill('Second immutable financial decision');
            await page.evaluate(() => { setFeedbackRewardBust(15); setFeedbackRewardKarma(0); });
            assert(await page.locator('#feedback-reward-submit-btn').isEnabled());
            await page.locator('#feedback-reward-submit-btn').click();
            assert.equal(await page.locator('#feedback-reward-modal.active').count(), 0);
            assert(await page.evaluate(() => isFeedbackProcessing(70, 302)));
            assert(await page.locator('.fb-card[data-feedback-id="302"] .fb-saving-spinner').isVisible(), 'Queued decisions show processing before their network turn');
            assert.equal(posts.filter(post => post.id === 302).length, 0, 'Second financial mutation waits in the background');
            await page.evaluate(() => { openFeedbackRewardModal(70, 302); submitFeedbackReward(); });
            assert.equal(await page.locator('#feedback-reward-modal.active').count(), 0, 'The same queued ticket cannot be opened twice');

            await reward(303, 'Reply-only decision does not wait for money', 0, 0);
            assert(waitingPosts.has(301) && waitingPosts.has(303), 'Reply-only POST runs while another reward POST is pending');
            assert.equal(await page.locator('.fb-card[aria-busy="true"]').count(), 3);
            assert.equal(await page.locator('.fb-card[data-feedback-id="304"][aria-busy="true"]').count(), 0);
            await page.evaluate(() => openFeedbackRewardModal(70, 304));
            await page.locator('#feedback-reward-reply').fill('Fourth draft survives all previous responses');
            await page.evaluate(() => { setFeedbackRewardBust(7); setFeedbackRewardKarma(0); });
            waitingPosts.get(303)('success');
            await waitRewardDone(303, 70);
            waitingPosts.get(301)('error');
            await waitRewardDone(301, 70);
            await waitPost(302);
            const secondRequest = posts.find(post => post.id === 302);
            assert.equal(secondRequest.body.reply_text, 'Second immutable financial decision');
            assert.equal(secondRequest.body.bust_amount, 15);
            assert.equal(secondRequest.body.karma_amount, 0);
            waitingPosts.get(302)('success');
            await waitRewardDone(302, 70);
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Fourth draft survives all previous responses');
            assert.equal(await page.evaluate(() => _feedbackRewardBust), 7);
            assert(await page.locator('#feedback-reward-submit-btn').isEnabled());
            assert.equal(await page.locator('#feedback-reward-submit-btn.btn-loading').count(), 0);

            await page.evaluate(() => { closeFeedbackRewardModal(); openFeedbackRewardModal(70, 301); });
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'First financial decision');
            assert.equal(await page.evaluate(() => _feedbackRewardBust), 20);
            await page.evaluate(() => { submitFeedbackReward(); submitFeedbackReward(); });
            await waitPost(301);
            assert.equal(posts.filter(post => post.id === 301).length, 2, 'Only one retry can be sent for the failed ticket');
            waitingPosts.get(301)('lost');
            await waitRewardDone(301, 70);
            assert.equal(posts.filter(post => post.id === 301).length, 2, 'A lost reward response is never replayed');

            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(80, false); });
            await reward(401, 'Other project financial decision', 5);
            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(70, false); });
            await reward(304, 'Another project can close a reply-only ticket too', 0, 0);
            assert(waitingPosts.has(401) && waitingPosts.has(304));
            await page.evaluate(async () => { closeProjectFeedbackModal(); await openProjectFeedback(40, false); openFeedbackRewardModal(40, 201); });
            await page.locator('#feedback-reward-reply').fill('Third project draft');
            waitingPosts.get(401)('success');
            await waitRewardDone(401, 80);
            assert(await page.evaluate(() => isFeedbackProcessing(70, 304)), 'One result cannot clear another ticket lock');
            waitingPosts.get(304)('success');
            await waitRewardDone(304, 70);
            assert.equal(await page.locator('#feedback-reward-reply').inputValue(), 'Third project draft');
            assert(await page.locator('#feedback-reward-submit-btn').isEnabled());
            await page.evaluate(() => closeFeedbackRewardModal());

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
        console.log('Feedback RU/EN 360/390: immediate expanded/collapsed Results counters, category highlights, no double decrement or stale badge restoration, preserved history/card state, collapse on submit, independent/queued decisions, financial ordering, concurrent replies, drafts, cross-project responses and lost-reply reconciliation passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
