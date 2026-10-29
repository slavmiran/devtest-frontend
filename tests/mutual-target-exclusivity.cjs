const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        const page = await browser.newPage();
        const errors = []; page.on('pageerror', e => errors.push(e.message));
        await page.route('http://fixture.local/**', route => route.fulfill({ contentType: 'text/html', body:
            '<div id="feed"></div><div id="project-select-modal"><h3>Select</h3><div id="project-select-list"></div><div id="project-select-footer"></div></div>' }));
        await page.goto('http://fixture.local/');
        for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'ui/ui-tests.js', 'ui/ui-market.js', 'js/app-actions.js']) {
            await page.addScriptTag({ path: path.join(root, file) });
        }
        await page.evaluate(() => {
            window.lang = 'en'; Object.assign(window.t, I18NEN); window.userId = 880;
            window.tg = {}; window.myProjectsLoadError = false; window.myTests = []; window.incomingOffers = [];
            window._blockedOfferProjectsByOwner = {}; window._blockedOfferProjectsFetchedAt = {};
            window.notices = []; window.showToast = message => notices.push(message);
            window.fetch = () => { throw new Error('Unexpected write'); };
            window.isProjectSynced = () => false; window.getLangBadge = () => '';
            window.isOwnerBlockedByMe = () => false;
            window.myProjects = [
                { id: 645, name: 'QuickPaste', status: 'active', mode: 'mutual', limit_mutual: 12,
                  testers: [{ tester_id: 554, join_type: 'mutual', reciprocal_app_id: 1203, reciprocal_app_name: 'VibeSync' }] },
                { id: 1225, name: 'QuickSweep', status: 'active', mode: 'mutual', limit_mutual: 12, testers: [] },
            ];
            window.item = { app_id: 1203, owner_id: 554, name: 'VibeSync', limit_mutual: 12 };
            window.draw = () => { document.getElementById('feed').innerHTML = renderFeedCard(item, 'mutual-seeking'); };
            draw(); showProjectSelectModal(myProjects, 1203, 554, {});
        });
        assert.equal(await page.locator('#feed button[disabled]').count(), 0, 'Reserved target offers an informational sheet, not an acceptance action');
        assert.match(await page.locator('#feed button').innerText(), /Your exchange/);
        assert.match(await page.locator('#feed button').getAttribute('onclick'), /openMutualExchangeDetails/);
        assert.equal(await page.locator('#project-select-list button:disabled').count(), 2, 'QuickSweep cannot reuse the QuickPaste counter-test');
        assert.equal(await page.locator('#project-select-footer .project-select-direct-btn').count(), 0);
        await page.evaluate(async () => { await createMutualOffer(1203, 554); await sendMutualOffer(1203, 554, 1225); });
        assert.equal(await page.evaluate(() => notices.length), 2, 'Direct action calls must not bypass the client guard');

        await page.evaluate(() => { item.app_id = 1204; draw(); showProjectSelectModal(myProjects, 1204, 554, {}); });
        assert.equal(await page.locator('#feed button[disabled]').count(), 0, 'Another target project of the SAME developer remains eligible');
        assert.equal(await page.locator('#project-select-list button:not(:disabled)').count(), 1);

        await page.evaluate(() => {
            item.app_id = 1203;
            myProjects[0].testers = [{ tester_id: 554, join_type: 'direct', reciprocal_app_id: null }];
            draw(); showProjectSelectModal(myProjects, 1203, 554, {});
        });
        assert.equal(await page.locator('#feed button[disabled]').count(), 0, 'Voluntary direct testing is not a made-up mutual relationship');
        const directRow = await page.locator('#project-select-list button').first().innerText();
        assert.match(directRow, /already testing your project/);
        assert.doesNotMatch(directRow, /VibeSync|Linked to owner's project/);

        await page.evaluate(() => {
            myTests = [{ id: 1203, owner_id: 554, status: 'done', progress_status: 'active', join_type: 'mutual', app_status: 'active' }];
            draw();
        });
        assert.match(await page.locator('#feed button').getAttribute('onclick'), /openMutualExchangeDetails/, 'A completed daily task still reserves its active mutual leg');
        await page.evaluate(() => {
            incomingOffers = [{ offer_id: 82, owner_id: 880, proposer_id: 554, proposer_app_id: 1203, target_app_id: 1225, status: 'pending' }];
            draw();
        });
        assert.match(await page.locator('#feed button').getAttribute('onclick'), /openMutualExchangeDetails/, 'Second pending acceptance offers details instead of acceptance');
        await page.evaluate(async () => { await decideOffer(82, 'accept'); });
        assert.equal(await page.evaluate(() => notices.length), 3);
        await page.evaluate(() => {
            incomingOffers = []; myTests[0].join_type = 'invite'; myTests[0].reciprocal_app_id = null; draw();
        });
        assert.equal(await page.locator('#feed button[disabled]').count(), 0, 'Invite-to-mutual upgrade remains available');
        await page.evaluate(() => { myTests[0].join_type = 'mutual'; myTests[0].progress_status = 'completed'; draw(); });
        assert.equal(await page.locator('#feed button[disabled]').count(), 0, 'Terminal history alone does not reserve a new exchange');

        await page.evaluate(() => {
            myProjects[0].testers = [{ tester_id: 554, join_type: 'mutual', reciprocal_app_id: 1203, reciprocal_app_name: 'VibeSync' }];
            myTests = [{ id: 1203, owner_id: 554, join_type: 'mutual', reciprocal_app_id: 645, progress_status: 'active' }];
            window.getMarketCandidateByAppId = () => item;
            window.reads = 0;
            window.fetchBlockedOfferProjects = async () => { reads++; return {}; };
            draw();
        });
        await page.locator('#feed button').click();
        await page.waitForSelector('#project-select-modal.project-select-readonly.active');
        assert.equal(await page.locator('#project-select-list .project-select-info').count(), 2);
        assert.match(await page.locator('#project-select-modal h3').innerText(), /Your exchanges/);
        assert.match(await page.locator('.project-select-info').first().innerText(), /Your app\s+QuickPaste\s+You are testing\s+VibeSync/);
        assert.match(await page.locator('.project-select-info').last().innerText(), /already paired with your project “QuickPaste”/);
        assert.equal(await page.locator('#project-select-list button, #project-select-footer button').count(), 0);
        await page.evaluate(async () => { await _selectProjectForOffer(1225); });
        assert.equal(await page.evaluate(() => notices.length), 3, 'Inspection must not send a proposal or invoke the send guard');

        await page.evaluate(() => {
            closeProjectSelectModal(); myTests = [];
            myProjects[0].testers = [{ tester_id: 554, join_type: 'direct', reciprocal_app_id: null }];
            _blockedOfferProjectsByOwner['554'] = { '1225': { target_app_name: 'Other partner project', reason_code: 'already_used' } };
            _blockedOfferProjectsFetchedAt['554'] = Date.now();
            draw();
        });
        assert.match(await page.locator('#feed button').innerText(), /Why unavailable\?/);
        await page.locator('#feed button').click();
        assert.match(await page.locator('.project-select-info').first().innerText(), /Direct participation/);
        assert.doesNotMatch(await page.locator('.project-select-info').first().innerText(), /Linked to owner's project/);
        assert.match(await page.locator('.project-select-info').last().innerText(), /Other partner project/);

        await page.evaluate(() => {
            closeProjectSelectModal();
            window.fetchBlockedOfferProjects = () => new Promise(resolve => { window.finishDetailsRead = () => resolve({}); });
        });
        await page.locator('#feed button').click();
        await page.evaluate(() => { closeProjectSelectModal(); finishDetailsRead(); });
        await page.waitForFunction(() => !document.getElementById('project-select-modal').classList.contains('active'));
        assert.equal(await page.locator('#project-select-modal').getAttribute('class'), '');
        await page.evaluate(() => {
            _blockedOfferProjectsByOwner = {}; myProjects[0].testers = [];
            showProjectSelectModal(myProjects, 1204, 554, {});
        });
        assert.equal(await page.locator('#project-select-list button:not(:disabled)').count(), 2, 'Normal proposal selection remains interactive after closing inspection');
        // A completed partner leg belongs to the former exchange, even when
        // my own test is still active and the same app id has been restarted.
        for (const language of ['ru', 'en']) {
            await page.evaluate(language => {
                lang = language;
                myProjects[1].run_iteration = 2;
                myProjects[1].created_at = '2026-10-28T07:32:06Z';
                myTests = [{ id: 1203, name: 'CryptoVPN', owner_id: 554, join_type: 'mutual',
                    progress_status: 'active', app_status: 'active', reciprocal_app_id: 1225,
                    reciprocal_app_status: 'completed', partner_progress_status: 'completed', partner_active: false,
                    partner_start_date: '2026-10-11' }];
                draw(); showProjectSelectModal(myProjects, 1204, 554, {});
            }, language);
            assert(await page.locator('#project-select-list button').last().isEnabled(), 'Old CryptoVPN exchange must not reserve the restarted QuickSweep');
            assert.doesNotMatch(await page.locator('#project-select-list').innerText(), /CryptoVPN/);
            assert.equal(await page.evaluate(() => getExistingMutualTargetLink(1203, 554) !== null), true, 'My active CryptoVPN leg still cannot fund another exchange');
            const selected = await page.evaluate(async () => {
                const original = window.sendMutualOffer, calls = [];
                window.sendMutualOffer = async (...args) => calls.push(args.slice(0, 3));
                try { await window._selectProjectForOffer(1225); } finally { window.sendMutualOffer = original; }
                return calls;
            });
            assert.deepEqual(selected, [[1204, 554, 1225]], 'The new proposal uses the chosen target and restarted source project');
            for (const state of [{ reciprocal_app_status: 'completed' }, { partner_progress_status: 'completed' }, { partner_active: false }]) {
                await page.evaluate(state => {
                    Object.assign(myTests[0], { reciprocal_app_status: '', partner_progress_status: '', partner_active: undefined }, state);
                    showProjectSelectModal(myProjects, 1204, 554, {});
                }, state);
                assert(await page.locator('#project-select-list button').last().isEnabled(), 'Any explicit terminal partner signal overrides a stale reciprocal app id');
            }
            await page.evaluate(() => {
                Object.assign(myTests[0], { reciprocal_app_status: 'active', partner_progress_status: 'active', partner_active: true });
                showProjectSelectModal(myProjects, 1204, 554, {});
            });
            assert(await page.locator('#project-select-list button').last().isDisabled(), 'A genuinely active reciprocal leg remains reserved');
            await page.evaluate(() => {
                Object.assign(myTests[0], { reciprocal_app_status: 'completed', partner_progress_status: 'completed', partner_active: false });
                myProjects[1].testers = [{ tester_id: 554, join_type: 'mutual', progress_status: 'active', reciprocal_app_id: 1204, reciprocal_app_name: 'New exchange' }];
                showProjectSelectModal(myProjects, 1204, 554, {});
            });
            assert(await page.locator('#project-select-list button').last().isDisabled(), 'The current project roster remains authoritative');
            await page.evaluate(() => {
                myProjects[1].testers = [];
                Object.assign(myTests[0], { reciprocal_app_status: 'active', partner_progress_status: 'active', partner_active: true,
                    exchange_state: { version: 1, right: { leg_status: 'completed' } } });
                showProjectSelectModal(myProjects, 1204, 554, {});
            });
            assert(await page.locator('#project-select-list button').last().isEnabled(), 'The canonical completed leg overrides stale flat fields');
            await page.evaluate(() => {
                Object.assign(myTests[0], { reciprocal_app_status: 'completed', partner_progress_status: 'completed', partner_active: false,
                    exchange_state: { version: 1, right: { leg_status: 'active' } } });
                showProjectSelectModal(myProjects, 1204, 554, {});
            });
            assert(await page.locator('#project-select-list button').last().isDisabled(), 'The canonical active leg remains reserved');
        }
        assert.deepEqual(errors, []);
        console.log('Mutual target: exclusivity, valid 2↔2, direct participation, clickable read-only overview, actual paired names, pending reasons, late reads and normal selection passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
