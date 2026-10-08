const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');

(async () => {
    const browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://fixture.local/**', route => route.fulfill({contentType:'text/html', body:'<div id="projects-list"></div><div id="project-feedback-modal" class="active"></div>'}));
        await page.goto('http://fixture.local/');
        await page.evaluate(() => {
            window.lang = 'ru';
            window.t = key => key;
            window.escapeHTML = value => String(value || '');
            window.renderIcon = () => '';
            window.myProjects = [];
            window.archivedProjects = [{app_id:42, name:'Completed run', phase:'moderation', status:'completed',
                feedback_new_count:3, bugs_total_count:2, bugs_new_count:1, ideas_total_count:2, ideas_new_count:1,
                reviews_total_count:2, reviews_new_count:1, results_summary:{models_count:1, countries_count:1}}];
            window._activeProjectFeedbackLoadSeq = 0;
            window._activeProjectFeedbackAppId = 0;
            window._activeProjectFeedbackArchived = false;
            window._activeProjectFeedbackItems = [];
            window._projectFeedbackStatusFilter = 'all';
            window.isOpenFeedbackStatus = value => value === 'pending';
            window.showToast = value => {throw new Error(value);};
        });
        for (const file of ['js/app-actions.js','js/project-results.js','ui/ui-projects-moderation.js']) {
            await page.addScriptTag({path:path.join(root,file)});
        }
        await page.evaluate(() => {
            window.requests = [];
            window.opens = [];
            const items = ['bug','idea','google_play'].flatMap((type,index) => [
                {id:index*2+1, type, status:'pending'}, {id:index*2+2, type, status:'closed'}
            ]);
            window.fetchProjectFeedbackPayload = async (appId,scope) => {
                requests.push({appId,scope});
                return {feedback:scope === 'open' ? items.filter(item => item.status === 'pending') : items};
            };
            window.showProjectFeedbackModal = (project,feedback,meta) => opens.push({
                appId:project.app_id || project.id, feedback, meta, archived:_activeProjectFeedbackArchived
            });
            window.showProjectFeedbackModalLoading = () => {};
            document.getElementById('projects-list').appendChild(buildModerationCard(Object.assign({id:42},archivedProjects[0])));
        });
        for (const [tile,type] of [['bugs','bug'],['ideas','idea'],['reviews','google_play']]) {
            await page.evaluate(() => {window.opens=[]; window._projectFeedbackSessionCache=Object.create(null);});
            await page.locator('.pc-results-tile--'+tile).click();
            await page.waitForFunction(() => opens.length > 0);
            const opened = await page.evaluate(() => opens[0]);
            assert.equal(opened.appId,42);
            assert.equal(opened.archived,true);
            assert.equal(opened.meta.typeFilter,type);
            assert.equal(opened.meta.preferUnprocessed,true);
            assert(opened.feedback.some(item => item.type === type && item.status === 'pending'));
        }
        await page.evaluate(() => {window.opens=[];});
        await page.locator('.pc-results-feedback-link').click();
        await page.waitForFunction(() => opens.length > 0);
        let opened = await page.evaluate(() => opens[0]);
        assert.equal(opened.meta.typeFilter,'all');
        assert.equal(opened.meta.preferUnprocessed,false);
        assert.equal(opened.feedback.length,6,'All feedback includes processed tickets');
        await page.evaluate(async () => {
            opens=[];
            await openProjectResultsFeedback(42,'bug',0,false);
        });
        opened = await page.evaluate(() => opens[0]);
        assert.equal(opened.meta.typeFilter,'bug');
        assert.equal(opened.meta.preferUnprocessed,false);
        assert(opened.feedback.some(item => item.type === 'bug' && item.status === 'closed'));
        // A stale archive flag must also work after the project returns to testing.
        await page.evaluate(async () => {
            myProjects=[Object.assign({id:42},archivedProjects[0],{status:'active',phase:'testing'})];
            archivedProjects=[];
            opens=[];
            await openProjectFeedback(42,true,{preferUnprocessed:false});
        });
        assert.equal(await page.evaluate(() => opens[0].archived),false);
        assert.deepEqual(errors,[]);
        console.log('Moderation feedback: category clicks, pending/processed tickets, all feedback, cache and stale flags passed');
    } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
