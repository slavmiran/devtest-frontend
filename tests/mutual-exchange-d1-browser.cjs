const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../artifacts/mutual-exchange-d1');
const leg = checkins => ({ leg_status: 'active', metrics: { checkins, testing_days: 5, skips: 3, consecutive_skips: 3 } });
const state = (left, right) => ({ version: 1, left, right });

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    try {
        for (const language of ['ru', 'en']) for (const width of [320, 390]) {
            const page = await browser.newPage({ viewport: { width, height: 850 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => { throw new Error('Unexpected network request: ' + route.request().url()); });
            await page.setContent('<div id="mutual-balance-modal" class="modal-overlay"><div class="modal-content"><h3 id="mutual-balance-title"></h3><div id="mutual-balance-body"></div></div></div>');
            for (const file of ['styles.css', 'css/tokens.css', 'css/base.css', 'css/mutual-balance-modal.css']) {
                await page.addStyleTag({ path: path.join(root, file) });
            }
            for (const file of ['i18n/ru.js', 'i18n/en.js', 'ui/ui-helpers.js', 'js/mutual-exchange-ui.js']) {
                await page.addScriptTag({ path: path.join(root, file) });
            }
            await page.evaluate(language => {
                window.lang = language; window.userId = 880; window.myProjects = [];
                window.t = (key, params = {}) => String((lang === 'ru' ? I18NRU : I18NEN)[key] || key)
                    .replace(/\{(\w+)\}/g, (_, key) => params[key]);
            }, language);

            async function draw(exchange, owner = false, local = false, legacy = {}) {
                await page.evaluate(async ({ exchange, owner, local, legacy }) => {
                    closeMutualBalanceModal();
                    const test = { id: 9, owner_id: 584, owner_username: 'partner', name: 'Partner app',
                        reciprocal_app_name: 'My project', join_type: 'mutual', checkins_count: 11,
                        partner_checkins: 11, partner_progress_status: 'active', progress_status: 'active',
                        exchange_state: exchange, ...legacy };
                    const tester = { tester_id: 584, username: 'partner', checkins_count: 11,
                        join_type: 'mutual', status: 'active', exchange_state: exchange, ...legacy };
                    window.myTests = [test];
                    window.fetch = async () => {
                        if (local) throw new Error('Offline fixture');
                        return { ok: true, json: async () => ({ status: 'success', my_checkins: 11,
                            partner_checkins: 11, partner_progress_status: 'active',
                            exchange_state: exchange, ...legacy }) };
                    };
                    openMutualBalanceModal(9, null, owner ? { context: 'projects', testerId: 584,
                        myAppName: 'My project', theirAppName: 'Partner app', testerSnapshot: tester } : {});
                    await new Promise(resolve => setTimeout(resolve, 0));
                }, { exchange, owner, local, legacy });
                await page.locator('.parity-side-card .parity-side-name').first().waitFor();
            }

            const label = language === 'ru' ? 'D1 ещё не подтверждён' : 'D1 not yet confirmed';
            for (const owner of [false, true]) for (const local of [false, true]) {
                await draw(state(leg(0), leg(2)), owner, local);
                const pendingIndex = owner ? 0 : 1;
                const cards = page.locator('.parity-side-card');
                assert.equal(await cards.nth(pendingIndex).locator('.parity-side-d1-note').innerText(), label);
                assert.equal(await cards.nth(1 - pendingIndex).locator('.parity-side-d1-note').count(), 0);
                assert.equal(await cards.nth(pendingIndex).locator('.parity-chip-row + .parity-side-d1-note').count(), 1);
                const layout = await cards.nth(pendingIndex).locator('.parity-side-d1-note').evaluate(el => {
                    const style = getComputedStyle(el), box = el.getBoundingClientRect(), card = el.parentElement.getBoundingClientRect();
                    return { align: style.textAlign, weight: style.fontWeight, background: style.backgroundColor,
                        font: parseFloat(style.fontSize), centered: Math.abs(box.x + box.width / 2 - card.x - card.width / 2) < 1,
                        fits: el.scrollWidth <= el.clientWidth + 1 };
                });
                assert.deepEqual(layout, { align: 'center', weight: '400', background: 'rgba(0, 0, 0, 0)', font: 12, centered: true, fits: true });
                assert(await page.locator('#mutual-balance-modal .modal-content').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
                if (!local) await page.screenshot({ path: path.join(output, `${language}-${width}-${owner ? 'owner' : 'tester'}.png`) });

                await draw(state(leg(2), leg(0)), owner, local);
                assert.equal(await page.locator('.parity-side-card').nth(1 - pendingIndex).locator('.parity-side-d1-note').innerText(), label,
                    'Each direction uses its own D1 evidence');
                await draw(state(leg(0), leg(0)), owner, local);
                assert.equal(await page.locator('.parity-side-d1-note').count(), 2);
                await draw(state(leg(1), leg(1)), owner, local);
                assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'Existing confirmations hide the note');

                // Neither calendar age, skip counts nor stale flat/local fields may invent D1 state.
                for (const unknown of [undefined, null, '', false, 'invalid', -1]) {
                    await draw(state(leg(unknown), leg(unknown)), owner, local);
                    assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'Unknown counts remain unknown');
                }
                await draw(state({ leg_status: '', metrics: { checkins: 0 } }, {}), owner, local);
                assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'Synthetic zero for an absent leg is unknown');
                await draw(state({ ...leg(0), metrics: { ...leg(0).metrics, last_check_date: '2026-11-07' } }, leg(1)), owner, local);
                assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'Existing check-in date overrides an inconsistent zero');
            }

            await draw(null, false, false, { my_checkins: 0, partner_checkins: 0 });
            assert.equal(await page.locator('.parity-side-d1-note').count(), 2, 'Explicit legacy API counts are supported');
            await draw(null, false, true, { checkins_count: 0, partner_checkins: 0 });
            assert.equal(await page.locator('.parity-side-d1-note').count(), 2, 'Explicit local counts survive offline fallback');
            await draw(null, false, false, { my_checkins: null, partner_checkins: null });
            assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'Missing API data does not fall back to invented zeros');
            await draw(null, false, false, { my_checkins: 1, partner_checkins: 0, partner_progress_status: '' });
            assert.equal(await page.locator('.parity-side-d1-note').count(), 0, 'A missing legacy reciprocal leg remains unknown');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('D1 status: RU/EN at 320/390px; both directions and owner/tester views; API/offline, confirmed and unknown data passed.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
