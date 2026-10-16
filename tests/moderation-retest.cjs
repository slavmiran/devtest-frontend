const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../artifacts/moderation-retest');
const apiSource = fs.readFileSync(path.join(root, 'js/app-api.js'), 'utf8')
    .match(/async function apiPipelineRequestRetest[\s\S]*?\r?\n}\r?\n/)[0];

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({headless:true, channel:'chrome'});
    try {
        for (const language of ['ru','en']) for (const width of [320,390]) {
            const page = await browser.newPage({viewport:{width,height:820}});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('http://fixture.local/**', route => route.fulfill({contentType:'text/html',body:
                '<html><body style="margin:0;background:#0e1116;font-family:system-ui;color:#fff"><button id="moderation-retest-btn-42">Retest</button><button id="moderation-live-btn-42">Live</button></body></html>'}));
            await page.goto('http://fixture.local/');
            for (const file of ['styles.css','css/pipeline-moderation.css']) await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['i18n/ru.js','i18n/en.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(language => {
                window.lang=language;
                window.t=(key,params={}) => {
                    let text=(language==='ru'?I18NRU:I18NEN)[key] || key;
                    for (const [name,value] of Object.entries(params)) text=text.split('{'+name+'}').join(value);
                    return text;
                };
                window.tg={initData:'signed-init-data',showConfirm:()=>{throw Error('Native confirm must not be used');}};
                window.confirm=()=>{throw Error('Native confirm must not be used');};
                window.API_BASE='http://fixture.local/api';window.userId=10;
                window.myProjects=[];
                window.archivedProjects=[{app_id:42,name:'QuickPaste <script>',run_iteration:3,mode:'hybrid',limit_bounty:3,bounty_per_tester:100},
                    {app_id:43,name:'Other project',run_iteration:1,mode:'mutual'}];
                window.calls=[];window.toasts=[];window.refreshes=[];window.reply='error';
                window.fetch=async (url,options) => {
                    calls.push({url,body:JSON.parse(options.body)});
                    if (window.blockFetch) await new Promise(resolve=>window.releaseFetch=resolve);
                    return {ok:reply==='success',json:async()=>reply==='success'
                        ? {status:'success',run_iteration:4,created_at:'2026-10-16T01:00:00Z'}
                        : {detail:reply==='published'?'app_already_published':'insufficient_bust_balance'}};
                };
                window.showToast=value=>toasts.push(value);
                window.renderProjects=()=>{};window.renderArchivedProjects=()=>{};
                window.loadProjects=async (...args)=>refreshes.push(args);
            },language);
            await page.addScriptTag({content:apiSource});
            await page.addScriptTag({path:path.join(root,'ui/ui-projects-moderation.js')});
            const open=async id => {
                await page.evaluate(id=>{window.activeRetest=handleModerationRequestRetest(id);},id);
                await page.locator('#moderation-retest-modal').waitFor();
            };
            await open(42);
            assert.match(await page.locator('#moderation-retest-description').innerText(),/14/);
            assert.match(await page.locator('.moderation-retest-sheet__cost').innerText(),/300 \$BUST/);
            assert.equal(await page.locator('.moderation-retest-sheet__project').innerText(),'QuickPaste <script>');
            assert.equal(await page.locator('#moderation-retest-modal script').count(),0);
            assert.equal(await page.locator('[role=dialog]').count(),1);
            const bounds = await page.locator('[role=dialog]').evaluate(el=>{
                const box=el.getBoundingClientRect();
                return {left:box.left,right:box.right,top:box.top,overflow:el.scrollWidth>el.clientWidth};
            });
            assert(bounds.left>=0 && bounds.right<=width+1 && bounds.top>=0 && !bounds.overflow);
            await page.screenshot({path:path.join(output,`${language}-${width}.png`)});
            await page.locator('.retest-cancel').click();
            assert.equal(await page.evaluate(()=>calls.length),0);
            await open(43);
            assert.equal(await page.locator('.moderation-retest-sheet__project').innerText(),'Other project');
            assert(await page.locator('.moderation-retest-sheet__cost').isHidden());
            await page.keyboard.press('Escape');
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            // Shared Telegram Back navigation closes overlays by removing .active.
            await open(42);
            await page.evaluate(()=>document.getElementById('moderation-retest-modal').classList.remove('active'));
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            await open(42);
            await page.evaluate(()=>{handleModerationRequestRetest(42);});
            assert.equal(await page.locator('[role=dialog]').count(),1);
            await page.locator('.retest-confirm').click();
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            assert.equal(await page.evaluate(()=>calls.length),1);
            assert.equal(await page.evaluate(()=>calls[0].body.expected_run_iteration),3);
            assert.equal(await page.evaluate(()=>calls[0].body.init_data),'signed-init-data');
            assert.match(await page.evaluate(()=>calls[0].url),/\/api\/pipeline\/request-retest$/);
            assert(!(await page.evaluate(()=>toasts[0])).includes('insufficient_bust_balance'));
            assert(!(await page.locator('#moderation-retest-btn-42').isDisabled()));
            await page.evaluate(()=>{reply='published';});
            await open(42);
            await page.locator('.retest-confirm').click();
            await page.waitForFunction(()=>document.querySelector('#moderation-retest-title')?.textContent === t('moderationPublishedTitle'));
            assert.equal(await page.locator('.moderation-retest-sheet__summary').count(),0);
            assert(await page.locator('.moderation-retest-sheet__cost').isHidden());
            await page.locator('.retest-cancel').click();
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            // Retry uses the same source run; duplicate clicks while HTTP is
            // pending must not submit another restart.
            await page.evaluate(()=>{reply='success';blockFetch=true;});
            await open(42);
            await page.locator('.retest-confirm').click();
            await page.waitForFunction(()=>calls.length===3);
            await page.evaluate(()=>{handleModerationRequestRetest(42);});
            assert.equal(await page.evaluate(()=>calls.length),3);
            await page.evaluate(()=>releaseFetch());
            await page.waitForFunction(()=>moderationRetestPending.size===0 && refreshes.length===1);
            assert.deepEqual(await page.evaluate(()=>refreshes[0]),[true,true]);
            assert.equal(await page.evaluate(()=>archivedProjects.some(p=>p.app_id===42)),false);
            assert.equal(await page.evaluate(()=>archivedProjects[0].app_id),43);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Retest RU/EN 320/390px: layout, accurate copy, paid reserve, cancel/Back, identity, error details, retry, double clicks and forced refresh passed');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
