const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    try {
        for (const width of [360, 430]) for (const language of ['ru','en']) {
            const page = await browser.newPage({ viewport:{width,height:850} });
            const errors=[];
            page.on('pageerror', e => errors.push(e.message));
            await page.addInitScript(({language}) => {
                window.__API_BASE__='http://fixture.local/api'; localStorage.setItem('lang',language);
                window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:language}},initData:'fixture',themeParams:{},colorScheme:'dark',expand(){},ready(){},onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};
            },{language});
            await page.route('**/*', route => {
                const url=new URL(route.request().url());
                if(url.pathname.startsWith('/api/')) return route.fulfill({json:{status:'success',events:[],acceptance_rate_pct:75}});
                if(url.hostname!=='fixture.local') return route.fulfill({contentType:'application/javascript',body:''});
                const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
                assert(file.startsWith(root+path.sep)&&fs.existsSync(file));
                return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
            });
            await page.goto('http://fixture.local/',{waitUntil:'load'});
            await page.evaluate(language => {
                lang=language; document.body.classList.remove('no-username-blocked'); document.getElementById('no-username-overlay').classList.remove('active');
                window.App.runtimeConfigStatus='ready'; window.App.runtimeConfigApiBase=API_BASE; window.App.screenshotProofUploadEnabled=true;
                window.getResolvedTestingDay=test=>test.testing_days;
                myTests=[{id:30,progress_id:300,run_iteration:1,name:'Picture Drop Solitaire',testing_days:6,status:'daily',app_status:'active',progress_status:'active',start_date:'2026-10-18',checkins_count:4,request_reviews:true,
                    control_proof_catchups:[{id:8,missed_testing_day:4,state:'requested'}]}];
                const before=performance.now(); openCheckinOptionsModal(30,'developer');
                window.openDuration=performance.now()-before;
            },language);
            assert(await page.locator('#report-modal').evaluate(el=>el.classList.contains('active')),'Open is synchronous');
            assert(await page.evaluate(()=>openDuration<100),'No network barrier');
            assert(!(await page.locator('#checkin-options-modal').evaluate(el=>el.classList.contains('active'))));
            assert((await page.locator('#unified-report-catchup').innerText()).includes('4'));
            await page.locator('[data-report-kind="bug"]').click();
            await page.locator('#unified-report-note').fill('A detailed bug description that explains the problem');
            assert(await page.locator('#checkin-proof-submit').isDisabled(),'Catch-up needs media even on a normal day');
            await page.locator('#checkin-proof-file-input').setInputFiles({name:'screen.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJtEAAAAASUVORK5CYII=','base64')});
            await page.waitForFunction(()=>_checkinProofUploadState.files.length===1&&!_checkinProofUploadState.checkingFiles);
            assert(!(await page.locator('#checkin-proof-submit').isDisabled()));
            await page.locator('[data-report-kind="idea"]').click();
            assert.equal(await page.locator('#unified-report-note').inputValue(),'A detailed bug description that explains the problem');
            assert.equal(await page.locator('.checkin-proof-preview-item').count(),1);
            await page.locator('.checkin-proof-preview-edit').click();
            assert(await page.locator('.report-editor').isVisible());
            await page.locator('.report-editor [data-action="cancel"]').click();
            const geometry=await page.locator('#report-modal .modal-content').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth}));
            assert(!geometry.overflow&&geometry.width<=width,'No horizontal clipping');
            if(width===430&&language==='ru') {
                await page.waitForTimeout(350);
                await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-ru.png')});
            }
            await page.evaluate(()=>{closeReportModal(); myTests[0].testing_days=7; openReportModal(30,'developer');});
            assert(await page.locator('#unified-report-plain').isHidden(),'Control day has no plain check-in');
            assert((await page.locator('#unified-report-catchup').innerText()).includes(language==='ru'?'не закроет':'does not close'));
            // Review is independent: returning must keep the selected report and text.
            await page.locator('#unified-report-note').fill('Keep this draft while looking at the review');
            await page.locator('#unified-report-review').click();
            assert(await page.locator('#play-review-modal').evaluate(el=>el.classList.contains('active')));
            await page.evaluate(()=>closePlayReviewModal());
            assert.equal(await page.locator('#unified-report-note').inputValue(),'Keep this draft while looking at the review');
            await page.evaluate(()=>{closeReportModal(); myTests[0].testing_days=8; myTests[0].control_proof_catchups=[];
                myTests[0].screenshot_boost_campaign={enabled:true,reward_bust:3,pool_remaining:80,run_iteration:1}; openReportModal(30,'developer');});
            assert(await page.locator('#report-screenshot-boost').isVisible());
            const sampleImages=await page.evaluate(()=>[0,1,2].map(index=>{
                const canvas=document.createElement('canvas'); canvas.width=240; canvas.height=360;
                const ctx=canvas.getContext('2d'); ctx.fillStyle=['#173b4c','#34503f','#383858'][index]; ctx.fillRect(0,0,240,360);
                ctx.fillStyle='#e3eaf2'; ctx.font='bold 19px sans-serif'; ctx.fillText('Picture Drop',22,45);
                ctx.font='14px sans-serif'; ctx.fillText('Level '+(index+12),22,72);
                for(let y=0;y<3;y++)for(let x=0;x<3;x++){ctx.fillStyle=['#87b3aa','#e3c38d','#92a9c7'][(x+y+index)%3];ctx.fillRect(22+x*67,100+y*67,58,58);}
                return canvas.toDataURL('image/png').split(',')[1];
            }));
            await page.locator('#checkin-proof-file-input').setInputFiles(sampleImages.map((data,index)=>({name:'screen'+index+'.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')})));
            await page.waitForFunction(()=>_checkinProofUploadState.files.length===3&&!_checkinProofUploadState.checkingFiles);
            assert((await page.locator('#unified-report-series').innerText()).includes(language==='ru'?'0,1':'0.1'));
            assert(!(await page.locator('#checkin-proof-submit').isDisabled()),'Three photos enable the default screenshot submission');
            assert.equal(await page.locator('#report-screenshot-boost .screenshot-boost-offer__gift').innerText(),'🎁','Mode rendering must not overwrite the bonus icon');
            if(width===430&&language==='ru') {
                await page.waitForTimeout(350);
                await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-screenshot-ru.png')});
            }
            await page.locator('[data-report-kind="bug"]').click();
            await page.locator('#unified-report-note').fill(language==='ru'?'После завершения уровня кнопка «Далее» не отвечает. При повторном запуске всё работает.':'The Next button stops responding after completing the level. Restarting fixes it.');
            if(width===430&&language==='ru') { await page.waitForTimeout(350); await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-bug-ru.png')}); }
            await page.setViewportSize({width,height:460});
            await page.locator('#unified-report-note').focus();
            const submitRect=await page.locator('#checkin-proof-submit').boundingBox();
            assert(submitRect.y>=0&&submitRect.y+submitRect.height<=460,'CTA remains above the reduced viewport/keyboard');
            await page.setViewportSize({width,height:850});
            if(width===430&&language==='ru') {
                const originalKey=await page.evaluate(()=>_checkinProofUploadState.idempotencyKey);
                await page.locator('.checkin-proof-preview-edit').first().click();
                await page.locator('.report-editor [data-tool="arrow"]').click();
                const canvas=await page.locator('.report-editor canvas').boundingBox();
                await page.mouse.move(canvas.x+canvas.width*.2,canvas.y+canvas.height*.3);
                await page.mouse.down();
                await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.6,{steps:5});
                await page.mouse.up();
                await page.locator('.report-editor [data-action="done"]').click();
                await page.waitForFunction(()=>!document.querySelector('.report-editor')&&!_checkinProofUploadState.checkingFiles);
                assert.equal(await page.evaluate(()=>_checkinProofUploadState.files.length),3);
                assert((await page.evaluate(()=>_checkinProofUploadState.files[0].name)).endsWith('-marked.jpg'));
                assert.notEqual(await page.evaluate(()=>_checkinProofUploadState.idempotencyKey),originalKey);
            }
            await page.evaluate(()=>{closeReportModal(); myTests[0].testing_days=15; myTests[0].app_status='pending_completion';
                myTests[0].control_proof_catchups=[{id:8,missed_testing_day:4,state:'requested'},{id:9,missed_testing_day:7,state:'requested'}];
                openReportModal(30,'developer',{submissionMode:'buffer_catchup',catchupRequested:true});});
            assert(await page.locator('#unified-report-plain').isHidden());
            assert((await page.locator('#unified-report-catchup').innerText()).includes('Buffer'));
            await page.close();
            assert.deepEqual(errors,[]);
        }
    } finally { await browser.close(); }
    console.log('Unified report: synchronous open, RU/EN 360/430px, formats, media/notes, marker, control/catch-up/Buffer passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
