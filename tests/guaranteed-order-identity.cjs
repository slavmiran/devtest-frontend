const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const packageName = 'com.slavmiran.quickchat';

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    let checks = 0;
    try {
        for (const [language, width] of [['ru', 360], ['en', 390]]) {
            const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true,
                timezoneId: language === 'en' ? 'America/Los_Angeles' : 'Asia/Bangkok' });
            const errors = [], requests = [], patches = [];
            await page.emulateMedia({ reducedMotion: language === 'en' ? 'reduce' : 'no-preference' });
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
                if (route.request().method() === 'PATCH' && url.pathname.endsWith('/set-day')) {
                    const body = route.request().postDataJSON(); patches.push(body);
                    if (patches.length === 1) return route.fulfill({ status: 409, json: { status: 'error', code: 'order_changed' } });
                    return route.fulfill({ json: { status: 'success', order: {
                        id: 61, public_code: 'GT-27267', user_id: 999, coordinator_id: 880, app_name: 'Staff project', status: 'in_progress', can_adjust_day: true, is_coordinator: true,
                        started_at: new Date(Date.now() - (body.new_day - 1) * 86400000).toISOString(),
                        completion_date: new Date(Date.now() + (15 - body.new_day) * 86400000).toISOString().slice(0, 10),
                    } } });
                }
                if (url.pathname.startsWith('/api/')) {
                    requests.push(url.pathname);
                    return route.fulfill({ json: { status: 'success', orders: [], enabled: false, events: [] } });
                }
                if (url.hostname !== 'fixture.local') return route.fulfill({ body: '' });
                const file = path.resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
                assert(file.startsWith(root + path.sep) && fs.existsSync(file), file);
                return route.fulfill({ contentType: ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
            });
            await page.goto('http://fixture.local/', { waitUntil: 'load' });
            await page.evaluate(({ language, packageName }) => {
                lang = language; updateTranslations(language);
                document.body.classList.remove('no-username-blocked');
                document.getElementById('no-username-overlay').classList.remove('active');
                window.App.userId = 880;
                myProjects = [{ id: 12, name: 'QuickChat', package: packageName, testers: [] }];
                archivedProjects = []; visibilityStats = {};
                window.loadMutualFeed = async () => [];
                window.originalReconcileProjects = window.reconcileProjectsView;
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.getElementById('tab-projects').classList.add('active');
                window.testOrder = { id: 26, public_code: 'GT-25832', app_name: 'New test', status: 'pending', user_id: 880,
                    testing_link: 'https://play.google.com/apps/testing/' + packageName + 'testforbuy' };
                window.setOrders = orders => {
                    _gtActiveOrdersCache = orders;
                    _gtActiveOrdersCacheAt = Date.now();
                    const container = document.getElementById('projects-list');
                    container.innerHTML = '<div style="height:950px">Project dashboard</div>';
                    renderGuaranteedOrdersSection(container);
                };
            }, { language, packageName });

            const results = await page.evaluate(packageName => {
                const project = myProjects[0], link = 'https://play.google.com/apps/testing/' + packageName;
                const order = (fields = {}) => Object.assign({}, testOrder, { testing_link: link }, fields);
                const matches = candidate => !!findActiveGuaranteedOrderForProject(project, [candidate]);
                const cases = [
                    [testOrder, false], // The exact production incident.
                    [order({ app_name: project.name, testing_link: link + 'testforbuy' }), false],
                    [order({ notes: 'app_id=12; package=' + packageName, testing_link: link + 'testforbuy' }), false],
                    [order({ testing_link: '', notes: 'app_id=123' }), false],
                    [order({ testing_link: '', notes: 'app_id=12' }), true],
                    [order({ testing_link: '', notes: 'package=' + packageName + 'testforbuy' }), false],
                    [order({ testing_link: '', notes: 'package=' + packageName }), true],
                    [order({ testing_link: link + '/?hl=en#android' }), true],
                    [order({ testing_link: 'https://play.google.com/store/apps/details?hl=en&id=' + packageName }), true],
                    [order({ testing_link: link.replace('quickchat', 'Quickchat') }), false],
                    [order({ testing_link: link.replace('play.google.com', 'play.google.com.evil.test') }), false],
                    [order({ status: 'completed' }), false], [order({ status: 'cancelled' }), false],
                    [order({ archived_at: '2026-10-23' }), false], [order({ status: 'unknown' }), false],
                    [order({ is_coordinator: true, user_id: 999 }), false],
                    [order({ is_coordinator: true, user_id: 880 }), true],
                    ...['awaiting_payment', 'pending', 'paid', 'in_progress'].map(status => [order({ status }), true]),
                ];
                return cases.map(([candidate, expected]) => ({ expected, actual: matches(candidate), candidate }));
            }, packageName);
            for (const result of results) { assert.equal(result.actual, result.expected, JSON.stringify(result.candidate)); checks++; }

            // Wrong package: the normal CTA still starts a separate order.
            await page.evaluate(() => {
                setOrders([testOrder]);
                window.startedWizard = null;
                window.showGuaranteedTestWizardStep1 = options => { startedWizard = options; };
                openAttractTestersSheet(12);
            });
            assert.equal(await page.locator('#attract-gt-slot.attract-sheet-item--gt-active').count(), 0);
            await page.locator('#attract-gt-slot').click();
            await page.waitForFunction(() => startedWizard && startedWizard.projectId === 12);
            checks++;

            // Correct package: same grey presentation, but real keyboard/tap action.
            await page.evaluate(packageName => {
                window.correctOrder = Object.assign({}, testOrder, { id: 27, public_code: 'GT-25873', app_name: 'QuickChat',
                    testing_link: 'https://play.google.com/apps/testing/' + packageName });
                setOrders([testOrder, correctOrder]);
                openAttractTestersSheet(12);
            }, packageName);
            const requestCount = requests.length;
            assert.equal(await page.locator('#attract-gt-slot').evaluate(el => el.tagName), 'BUTTON');
            assert.equal(await page.locator('#attract-gt-slot').evaluate(el => getComputedStyle(el).pointerEvents), 'auto');
            await page.locator('#attract-gt-slot').screenshot({ path: path.resolve(root, '../artifacts/private-order-entry-' + language + '-' + width + '.png') });
            await page.locator('#attract-gt-slot').click();
            const correctCard = page.locator('#tab-projects [data-gt-order-id="27"]');
            await page.waitForFunction(() => document.activeElement.matches('[data-gt-order-id="27"]'));
            assert(await correctCard.evaluate(el => el.classList.contains('guaranteed-order-card--focused')));
            assert.equal(await page.locator('#attract-testers-sheet-overlay.is-active').count(), 0);
            assert.equal(requests.length, requestCount, 'Opening a cached order must not make extra API requests');
            await correctCard.screenshot({ path: path.resolve(root, '../artifacts/private-order-card-' + language + '-' + width + '.png') });
            checks++;

            // Scroll-idle/deferred dashboard repaint: focus must survive delayed insertion.
            await page.evaluate(() => {
                document.querySelector('#projects-list .guaranteed-orders-section').remove();
                window.reconcileProjectsView = () => setTimeout(() => renderGuaranteedOrdersSection(document.getElementById('projects-list')), 100);
                focusGuaranteedTestOrder(27);
            });
            await page.waitForFunction(() => document.activeElement.matches('[data-gt-order-id="27"]'));
            checks++;

            // Long app names/links must stay inside the modal on narrow devices.
            await page.evaluate(() => openHandsFreeOrderStatusModal(Object.assign({}, testOrder, {
                app_name: 'VeryLongAppName'.repeat(15), testing_link: testOrder.testing_link + 'extremelylong'.repeat(20),
            })));
            const bounds = await page.locator('.gtw-order-status-card').evaluate(card => {
                const rect = card.getBoundingClientRect();
                return { width: rect.width, right: rect.right, viewport: innerWidth, scroll: card.scrollWidth, client: card.clientWidth };
            });
            assert(bounds.right <= width && bounds.scroll <= bounds.client + 1, JSON.stringify(bounds));
            assert.equal(await page.locator('#gtw-order-status-code').evaluate(el => el.previousElementSibling.textContent), language === 'ru' ? 'Заказ' : 'Order');
            await page.locator('.gtw-order-status-card').screenshot({ path: path.resolve(root, '../artifacts/private-order-status-' + language + '-' + width + '.png') });
            checks++;

            // A cache invalidated after paint must give a response, not a dead tap.
            const readsBeforeRecovery = requests.filter(url => url.endsWith('/guaranteed-test-orders/mine')).length;
            await page.evaluate(() => {
                window.orderToasts = []; showToast = text => orderToasts.push(text);
                invalidateGuaranteedOrdersCache();
                focusGuaranteedTestOrder(27);
            });
            await page.waitForFunction(() => orderToasts.length === 1);
            assert.equal(requests.filter(url => url.endsWith('/guaranteed-test-orders/mine')).length, readsBeforeRecovery + 1);
            checks++;
            // Post-payment uses the saved response, preserving the card even
            // while the dashboard data is cached / scheduled to paint later.
            await page.evaluate(async () => {
                closeHandsFreeOrderStatusModal();
                window.reconcileProjectsView = window.originalReconcileProjects;
                myProjects = []; archivedProjects = [];
                window.loadProjects = async () => {};
                window.loadArchivedProjects = async () => {};
                document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
                document.getElementById('tab-tests').classList.add('active');
                Object.assign(Telegram.WebApp.initDataUnsafe.user, { first_name: 'Alex <Safe>', last_name: 'Test' });
                await openProjectsTab({ focusOrderId: 51, confirmation: true, order: {
                    id: 51, public_code: 'GT-26857', user_id: 880, app_name: 'A long <App> name', status: 'pending',
                } });
            });
            const confirmation = page.locator('#private-order-confirmation');
            await confirmation.waitFor({ state: 'visible' });
            assert((await confirmation.textContent()).includes('Alex <Safe> Test'));
            assert((await confirmation.textContent()).includes('Production'));
            assert.equal(await confirmation.locator('script, img').count(), 0);
            const modalBounds = await confirmation.locator('.private-order-dialog').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, height: el.getBoundingClientRect().height, viewport: innerHeight }));
            assert(modalBounds.scroll <= modalBounds.width + 1 && modalBounds.height < modalBounds.viewport);
            await confirmation.screenshot({ path: path.resolve(root, '../artifacts/private-order-onboarding-' + language + '-' + width + '.png') });
            await confirmation.locator('[type="submit"]').click();
            assert.equal(await confirmation.count(), 0);
            assert(await page.evaluate(() => document.activeElement.matches('[data-gt-order-id="51"]')));
            await page.evaluate(() => { showPrivateOrderConfirmation(getGuaranteedOrderById(51)); handleAppBack(); });
            assert.equal(await confirmation.count(), 0, 'Telegram Back closes the confirmation without leaving projects');
            assert(await page.evaluate(() => document.getElementById('tab-projects').classList.contains('active')));
            checks++;

            await page.evaluate(() => {
                window.ownerOrder = { id: 61, public_code: 'GT-27267', user_id: 880, coordinator_id: 777, coordinator_name: 'Assigned curator', coordinator_username: 'curator', app_name: 'Staff project', status: 'in_progress', can_adjust_day: false,
                    started_at: new Date(Date.now() - 2 * 86400000).toISOString(), completion_date: '2026-11-01' };
                setOrders([ownerOrder]);
                window.contactLinks = []; Telegram.WebApp.openTelegramLink = url => contactLinks.push(url);
            });
            assert.equal(await page.locator('.guaranteed-order-card__badge--editable').count(), 0);
            assert.match(await page.locator('.guaranteed-order-action').textContent(), /Assigned curator.*@curator/);
            await page.locator('.guaranteed-order-action').click();
            assert.equal(await page.evaluate(() => contactLinks[0]), 'https://t.me/curator');
            await page.evaluate(() => openPrivateOrderDayModal(61));
            assert.equal(await page.locator('#private-order-day').count(), 0, 'Owner cannot open the staff editor');
            checks++;

            await page.evaluate(() => setOrders([Object.assign({}, ownerOrder, { user_id: 999, coordinator_id: 880, can_adjust_day: true, is_coordinator: true })]));
            await page.locator('.guaranteed-order-card__badge--editable').click();
            await page.locator('#private-order-day-input').fill('16');
            await page.locator('#private-order-day [type="submit"]').click();
            assert.equal(patches.length, 0);
            await page.locator('#private-order-day-input').fill('10');
            assert((await page.locator('.private-order-day-preview').textContent()).includes(language === 'ru' ? 'Расчётный финиш' : 'Estimated completion'));
            await page.locator('#private-order-day [type="submit"]').click();
            await page.locator('#private-order-day [role="alert"]').waitFor({ state: 'visible' });
            assert.equal(await page.locator('#private-order-day-input').inputValue(), '10');
            await page.locator('#private-order-day').screenshot({ path: path.resolve(root, '../artifacts/private-order-day-' + language + '-' + width + '.png') });
            await page.locator('#private-order-day [type="submit"]').click();
            await page.waitForFunction(() => !document.getElementById('private-order-day'));
            assert.equal(patches.length, 2);
            assert.equal(patches[1].new_day, 10);
            assert.equal(patches[1].init_data, 'fixture');
            assert((await page.locator('[data-gt-order-id="61"]').textContent()).includes(language === 'ru' ? 'День 10 из 15' : 'Day 10 of 15'));
            const fill = await page.locator('.guaranteed-order-card__progress-fill').evaluate(el => el.style.width);
            assert.equal(fill, '67%');
            if (language === 'en') assert.match(await page.evaluate(() => formatGuaranteedOrderDate('2026-11-01')), /Nov.*01/);
            checks++;
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log(`Private order identity/navigation: ${checks} checks passed (RU 360px / EN 390px, exact packages, statuses, CTA, deferred focus, no extra requests, long URLs).`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
