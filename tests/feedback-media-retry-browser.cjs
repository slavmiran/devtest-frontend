const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="200"><rect width="100" height="200" fill="#3390ec"/></svg>';

(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        const page = await browser.newPage();
        const errors = [], attempts = {};
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://fixture.local/**', route => {
            const url = new URL(route.request().url());
            if (url.pathname.includes('/telegram-media/')) {
                const name = url.pathname.split('/').pop();
                attempts[name] = (attempts[name] || 0) + 1;
                if (name === 'missing' || attempts[name] === 1) return route.fulfill({ status: 502, body: 'Temporary media failure' });
                return route.fulfill({ contentType: 'image/svg+xml', body: picture });
            }
            return route.fulfill({ contentType: 'text/html', body: '<div id="project-feedback-body"></div>' });
        });
        await page.goto('http://fixture.local/');
        for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'ui/ui-market.js']) await page.addScriptTag({ path: path.join(root, file) });
        await page.addStyleTag({ path: path.join(root, 'css/feedback-center.css') });
        await page.evaluate(() => {
            window.lang = 'en'; window.API_BASE = 'http://fixture.local/api'; window.userId = 1;
            window.myProjects = []; window.archivedProjects = [];
            window._projectFeedbackTypeFilter = 'all'; window._projectFeedbackStatusFilter = 'all';
            document.getElementById('project-feedback-body').innerHTML = renderProjectFeedbackCards({ id: 30 }, [{
                id: 101, tester_id: 2, tester_username: 'tester', type: 'bug', status: 'pending',
                message_text: 'Feedback with screenshots', created_at: new Date().toISOString(),
                media_urls: ['/telegram-media/thumb'],
            }]);
        });
        await page.locator('.fb-inbox-row').click();
        const thumb = page.locator('.fb-media-thumb img');
        await page.waitForFunction(() => document.querySelector('.fb-media-thumb img').dataset.feedbackRetries === '1');
        assert.equal(await page.locator('.fb-media-mock').count(), 0, 'First failure keeps loading instead of declaring the image unavailable');
        await page.waitForFunction(() => { const img = document.querySelector('.fb-media-thumb img'); return img.complete && img.naturalWidth > 0; });
        assert.equal(attempts.thumb, 2);
        assert.equal(await page.locator('.fb-media-thumb.is-media-loading').count(), 0);
        assert.equal(await thumb.isVisible(), true);

        await page.evaluate(() => { feedbackMediaRegistry[101] = [API_BASE + '/telegram-media/full']; openFeedbackImageSlider(101, 0); });
        assert.equal(await page.locator('.fb-slider-stage.is-media-loading').count(), 1, 'Fullscreen has a loading state');
        await page.waitForFunction(() => { const img = document.querySelector('.fb-slider-image'); return img && img.complete && img.naturalWidth > 0; });
        assert.equal(attempts.full, 2);
        assert.equal(await page.locator('.fb-slider-fallback').isVisible(), false);
        assert.equal(await page.locator('.fb-slider-stage.is-media-loading').count(), 0);

        await page.evaluate(() => { feedbackMediaRegistry[101] = [API_BASE + '/telegram-media/hydrated']; openFeedbackImageSlider(101, 0); });
        await page.waitForFunction(() => document.querySelector('.fb-slider-image').dataset.feedbackRetries === '1');
        await page.evaluate(picture => { document.querySelector('.fb-slider-image').src = 'data:image/svg+xml,' + encodeURIComponent(picture); }, picture);
        await page.waitForFunction(() => document.querySelector('.fb-slider-image').naturalWidth > 0);
        await page.waitForTimeout(650);
        assert.equal(attempts.hydrated, 1, 'Pending retry cannot replace an already hydrated image');

        await page.evaluate(() => { feedbackMediaRegistry[101] = [API_BASE + '/telegram-media/missing']; openFeedbackImageSlider(101, 0); });
        await page.waitForFunction(() => document.querySelector('.fb-slider-fallback').style.display === 'flex');
        assert.equal(attempts.missing, 3, 'Retries are bounded');
        await page.waitForTimeout(600);
        assert.equal(attempts.missing, 3);
        await page.evaluate(picture => { document.querySelector('.fb-slider-image').src = 'data:image/svg+xml,' + encodeURIComponent(picture); }, picture);
        await page.waitForFunction(() => document.querySelector('.fb-slider-image').naturalWidth > 0);
        assert.equal(await page.locator('.fb-slider-image').isVisible(), true, 'Late successful hydration restores a hidden image');
        assert.equal(await page.locator('.fb-slider-fallback').isVisible(), false);

        await page.evaluate(() => { feedbackMediaRegistry[101] = [API_BASE + '/telegram-media/closed']; openFeedbackImageSlider(101, 0); });
        await page.waitForFunction(() => document.querySelector('.fb-slider-image').dataset.feedbackRetries === '1');
        await page.evaluate(() => closeFeedbackImageSlider());
        await page.waitForTimeout(800);
        assert.equal(attempts.closed, 1, 'Closing the viewer cancels pending retry work');
        assert.equal(await page.locator('#feedback-image-overlay').count(), 0);
        assert.deepEqual(errors, []);
        console.log('Feedback media: first-load thumbnail/fullscreen recovery, visible loading, bounded errors, late hydration and closed-viewer cancellation passed');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
