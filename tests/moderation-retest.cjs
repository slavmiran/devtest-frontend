const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../artifacts/moderation-retest');
const apiSource = fs.readFileSync(path.join(root, 'js/app-api.js'), 'utf8')
    .match(/async function apiPipelineRequestRetest[\s\S]*?\r?\n}\r?\n/)[0];
const apiFile = fs.readFileSync(path.join(root, 'js/app-api.js'), 'utf8');
const saveSource = apiFile.match(/async function saveProjectEdit[\s\S]*?\r?\n}\r?\n/)[0];
const restartSource = apiFile.slice(apiFile.indexOf('function _buildRestartSettingsPayload()'));
const features = fs.readFileSync(path.join(root, 'js/app-features.js'), 'utf8');
const pricingSource = features.slice(features.indexOf('function getProjectFormConfig('), features.indexOf('function refreshLanguageUi('));

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({headless:true, channel:'chrome'});
    try {
        for (const language of ['ru','en']) for (const width of [360,390]) {
            const page = await browser.newPage({viewport:{width,height:820}});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('http://fixture.local/**', route => route.fulfill({contentType:'text/html',body:
                '<html><body style="margin:0;background:#0e1116;font-family:system-ui;color:#fff"><button id="moderation-retest-btn-42">Retest</button><button id="moderation-live-btn-42">Live</button></body></html>'}));
            await page.goto('http://fixture.local/');
            await page.evaluate(html => {
                const doc = new DOMParser().parseFromString(html, 'text/html');
                for (const id of ['edit-project-modal','edit-unsaved-modal']) document.body.appendChild(doc.getElementById(id));
            },fs.readFileSync(path.join(root,'index.html'),'utf8'));
            for (const file of ['css/tokens.css','styles.css','css/wizard.css','css/pipeline-moderation.css']) await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['i18n/ru.js','i18n/en.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.addScriptTag({path:path.join(root,'ui/ui-projects.js')});
            await page.addScriptTag({path:path.join(root,'js/project-contract-pricing.js')});
            await page.addScriptTag({content:pricingSource});
            await page.evaluate(language => {
                window.lang=language;
                window.t=(key,params={}) => {
                    let text=(language==='ru'?I18NRU:I18NEN)[key] || key;
                    for (const [name,value] of Object.entries(params)) text=text.split('{'+name+'}').join(value);
                    return text;
                };
                Object.assign(window.t,language==='ru'?I18NRU:I18NEN);
                window.tg={initData:'signed-init-data',showConfirm:()=>{throw Error('Native confirm must not be used');}};
                window.confirm=()=>{throw Error('Native confirm must not be used');};
                window.API_BASE='http://fixture.local/api';window.userId=10;window.projectToEdit=null;
                window.visibilityStats={balance_bust:1000};window.formatBustAmount=n=>String(n);
                window.AccessSetupManager={initEdit(){},getEditPayload:()=>({canSave:true,mode:'custom_group',test_mode:'google_group',google_group_url:'https://groups.google.com/g/testers'}),canSaveEdit:()=>true};
                window.isValidGoogleGroupUrl=()=>true;
                window._resolveTesterEmailForSave=async()=>({ok:true,email:''});
                window._persistEditEmailPreference=async()=>({ok:true});
                window.handleApiError=code=>toasts.push(code);window._saveProjectAlert=code=>toasts.push(code);
                for (const name of ['_syncEditEmailTestersBoxVisibility','onEditAcceptsEmailTestersChange','renderEditAccessSetup','syncEditAppIconPreview','updateEditNameCounter','renderEditCreatedAtMeta','resetProjectForms']) window[name]=()=>{};
                window.setMinAndroidVersion=(form,value)=>document.getElementById(form+'-min-android-version').value=String(value);
                window.normalizeMinAndroidVersion=value=>Number(value||0);
                window.myProjects=[];
                window.archivedProjects=[{app_id:42,name:'QuickPaste <script>',run_iteration:3,mode:'hybrid',limit_mutual:12,limit_bounty:3,bounty_per_tester:100,min_android_version:11,instructions:'Original instructions'},
                    {app_id:43,name:'Other project',run_iteration:1,mode:'mutual',limit_bounty:0,bounty_per_tester:0}];
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
            await page.addScriptTag({content:saveSource+'\n'+restartSource});
            await page.addScriptTag({path:path.join(root,'ui/ui-projects-moderation.js')});
            const settings=async id => {
                await page.evaluate(id=>{window.activeRetest=handleModerationRequestRetest(id);},id);
                await page.locator('#edit-project-modal.active').waitFor();
                assert.equal(await page.locator('#moderation-retest-modal').count(),0,'Retest opens the existing editor first');
            };
            const confirm=async()=>{
                await page.locator('#t-editSave').click();
                await page.locator('#moderation-retest-modal').waitFor();
            };
            const open=async id=>{await settings(id);await confirm();};
            await settings(42);
            assert.equal(await page.locator('#edit-name').inputValue(),'QuickPaste <script>');
            assert.equal(await page.locator('#edit-min-android-version').inputValue(),'11');
            assert.equal(await page.evaluate(()=>calls.length),0);
            await page.locator('#edit-name').fill('Edited project');
            await page.locator('#edit-limit-bounty').fill('2');
            await page.locator('#edit-bounty-per-tester').fill('200');
            await page.screenshot({path:path.join(output,`settings-${language}-${width}.png`)});
            await confirm();
            assert.match(await page.locator('#moderation-retest-description').innerText(),/14/);
            assert.match(await page.locator('.moderation-retest-sheet__cost').innerText(),/400 \$BUST/);
            assert.equal(await page.locator('.moderation-retest-sheet__project').innerText(),'Edited project');
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
            assert.equal(await page.locator('#edit-name').inputValue(),'Edited project','Cancel confirmation retains editor changes');
            await page.evaluate(()=>closeEditModal());
            await page.locator('#edit-unsaved-modal.active').waitFor();
            await page.evaluate(()=>discardEditAndClose());
            await page.waitForFunction(()=>projectToEdit===null);
            await open(43);
            assert.equal(await page.locator('.moderation-retest-sheet__project').innerText(),'Other project');
            assert(await page.locator('.moderation-retest-sheet__cost').isHidden());
            assert.equal(await page.locator('#edit-limit-bounty').inputValue(),'0','Stored zero quotas are preserved');
            await page.keyboard.press('Escape');
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            // Shared Telegram Back navigation closes overlays by removing .active.
            await open(42);
            await page.evaluate(()=>document.getElementById('moderation-retest-modal').classList.remove('active'));
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            await settings(42);
            await page.locator('#edit-description').fill('');
            await page.evaluate(()=>setMinAndroidVersion('edit',12));
            await page.locator('#edit-request-reviews').uncheck();
            await confirm();
            await page.evaluate(()=>{handleModerationRequestRetest(42);});
            assert.equal(await page.locator('[role=dialog]').count(),1);
            await page.locator('.retest-confirm').click();
            await page.waitForFunction(()=>moderationRetestPending.size===0);
            assert.equal(await page.evaluate(()=>calls.length),1);
            assert.equal(await page.evaluate(()=>calls[0].body.expected_run_iteration),3);
            assert.equal(await page.evaluate(()=>calls[0].body.init_data),'signed-init-data');
            assert.equal(await page.evaluate(()=>calls[0].body.min_android_version),12);
            assert.equal(await page.evaluate(()=>calls[0].body.instructions),'');
            assert.equal(await page.evaluate(()=>calls[0].body.request_reviews),false);
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
            assert.equal(await page.locator('#edit-project-modal.active').count(),0,'Success closes the editor');
            assert.equal(await page.evaluate(()=>archivedProjects.some(p=>p.app_id===42)),false);
            assert.equal(await page.evaluate(()=>archivedProjects[0].app_id),43);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Retest RU/EN 360/390px: standard editor, settings + atomic restart, updated reserve, cancel/Back, identity, errors, retry, double clicks and forced refresh passed');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
