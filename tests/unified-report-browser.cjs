const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
(async () => {
    const browser = await chromium.launch({ headless: true, channel: 'chrome', args:['--unsafely-treat-insecure-origin-as-secure=http://fixture.local'] });
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
                    owner_full_name:'Giuseppe',owner_username:'developer',owner_pending_open:4,owner_accepted_total:0,
                    control_proof_catchups:[{id:8,missed_testing_day:4,state:'requested'}]}];
                const before=performance.now(); openCheckinOptionsModal(30,'developer');
                window.openDuration=performance.now()-before;
            },language);
            assert(await page.locator('#report-modal').evaluate(el=>el.classList.contains('active')),'Open is synchronous');
            assert(await page.evaluate(()=>openDuration<100),'No network barrier');
            assert(!(await page.locator('#checkin-options-modal').evaluate(el=>el.classList.contains('active'))));
            assert((await page.locator('#unified-report-catchup').innerText()).includes('4'));
            assert(await page.locator('#unified-report-info').isVisible(),'Reward information is visible before media selection');
            assert(await page.locator('#unified-report-review-option').isHidden(),'No empty alternative-action divider before review eligibility');
            assert(await page.locator('#unified-report-info-details').isHidden(),'Bonus starts as one compact row');
            assert.equal(await page.locator('.report-info-toggle').getAttribute('aria-expanded'),'false');
            assert.equal(await page.locator('#unified-report-info').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
            await page.locator('.report-info-toggle').click();
            assert(await page.locator('#unified-report-info-details').isVisible(),'Can expand before selecting any media');
            await page.waitForTimeout(550);
            assert.equal(await page.locator('.report-info-toggle').getAttribute('aria-expanded'),'true','Timer sync must not undo manual expansion');
            await page.locator('.report-info-toggle').press('Enter');
            assert(await page.locator('#unified-report-info-details').isHidden());
            assert.equal(await page.locator('#unified-report-close').count(),0,'No upper-right close cross');
            assert(await page.locator('#unified-report-info').evaluate(el=>el.compareDocumentPosition(document.querySelector('.unified-report-formats')) & Node.DOCUMENT_POSITION_FOLLOWING),'Karma is above the formats');
            assert.equal(await page.locator('#unified-report-info .report-info-progress i').count(),5);
            assert.equal(await page.locator('#unified-report-info .is-filled').count(),0);
            assert.equal(await page.locator('#unified-report-note').evaluate(el=>getComputedStyle(el).resize),'none');
            const formats=await page.locator('.unified-report-formats button').evaluateAll(buttons=>buttons.map(button=>({top:button.getBoundingClientRect().top,height:button.getBoundingClientRect().height})));
            assert(formats.every(format=>Math.abs(format.height-44)<.5&&Math.abs(format.top-formats[0].top)<.5),'Format buttons are one equal-height row: '+JSON.stringify(formats));
            assert.equal(await page.locator('.unified-report-formats small').count(),0);
            await page.locator('[data-report-kind="bug"]').click();
            assert.equal(await page.locator('#unified-report-count').innerText(),'24');
            await page.locator('#unified-report-note').fill('a'.repeat(24));
            assert.equal(await page.locator('#unified-report-count').innerText(),'');
            await page.locator('#unified-report-note').fill('a'.repeat(1001));
            assert((await page.locator('#unified-report-count').innerText()).includes('−1'));
            assert(await page.locator('#checkin-proof-submit').isDisabled());
            await page.locator('#unified-report-note').fill('A detailed bug description that explains the problem');
            assert(await page.locator('#checkin-proof-submit').isDisabled(),'Catch-up needs media even on a normal day');
            await page.locator('#checkin-proof-file-input').setInputFiles({name:'screen.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJtEAAAAASUVORK5CYII=','base64')});
            await page.waitForFunction(()=>_checkinProofUploadState.files.length===1&&!_checkinProofUploadState.checkingFiles);
            assert(await page.locator('#unified-report-info-details').isVisible(),'First selected photo automatically expands the bonus');
            await page.locator('.report-info-toggle').click();
            await page.waitForTimeout(550);
            assert(await page.locator('#unified-report-info-details').isHidden(),'Manual collapse stays collapsed while a file is attached');
            await page.locator('.report-info-toggle').click();
            assert(!(await page.locator('#checkin-proof-submit').isDisabled()));
            assert(await page.locator('#unified-report-single-hint').isVisible());
            await page.evaluate(()=>{window.__duplicateToasts=[];window.__originalShowToast=showToast;window.showToast=(...args)=>window.__duplicateToasts.push(args);});
            await page.locator('#checkin-proof-file-input').setInputFiles({name:'same.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jJtEAAAAASUVORK5CYII=','base64')});
            await page.waitForFunction(()=>!_checkinProofUploadState.checkingFiles);
            assert(await page.locator('#checkin-proof-upload-alert').isVisible());
            assert.equal(await page.evaluate(()=>__duplicateToasts.length),0,'Selected duplicate is inline only, without a toast');
            await page.evaluate(()=>window.showToast=window.__originalShowToast);
            await page.locator('[data-report-kind="idea"]').click();
            assert.equal(await page.locator('#unified-report-note').inputValue(),'A detailed bug description that explains the problem');
            assert.equal(await page.locator('.checkin-proof-preview-item').count(),1);
            await page.locator('.checkin-proof-preview-edit').click();
            await page.locator('.report-editor').waitFor({state:'visible'});
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
            assert(await page.locator('#checkin-proof-submit').isDisabled(),'A control-day report needs media');
            assert(await page.locator('#unified-report-review-option').isVisible());
            assert(!(await page.locator('#unified-report-review').isDisabled()),'Review entry is active without report media or a mature timer');
            assert(await page.locator('#unified-report-review').evaluate(el=>!!el.closest('.checkin-proof-upload-actions')),'Review and report are alternative footer actions');
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'не закроет досдачу':'not a make-up'));
            const reviewRect=await page.locator('#unified-report-review').boundingBox();
            const primaryRect=await page.locator('#checkin-proof-submit').boundingBox();
            assert(reviewRect.height>=60&&reviewRect.y>=primaryRect.y+primaryRect.height,'Distinct review action follows the main report button');
            assert((await page.locator('#unified-report-catchup').innerText()).includes(language==='ru'?'не закроет':'does not close'));
            // Review is independent: returning must keep the selected report and text.
            await page.locator('#unified-report-note').fill('Keep this draft while looking at the review');
            await page.locator('#unified-report-review').click();
            assert(await page.locator('#play-review-modal').evaluate(el=>el.classList.contains('active')));
            await page.evaluate(()=>closePlayReviewModal());
            assert.equal(await page.locator('#unified-report-note').inputValue(),'Keep this draft while looking at the review');
            await page.evaluate(()=>{closeReportModal(); myTests[0].testing_days=8; myTests[0].control_proof_catchups=[];
                myTests[0].screenshot_boost_campaign={enabled:true,reward_bust:3,pool_remaining:80,run_iteration:1}; openReportModal(30,'developer');});
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'день будет зачтён':'complete today'));
            await page.evaluate(()=>{myTests[0].play_review_status='pending';syncUnifiedReport();});
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'На проверке':'Awaiting owner'));
            assert((await page.locator('#unified-report-review-title').innerText()).includes(language==='ru'?'на проверке':'awaiting approval'));
            assert(await page.locator('.unified-report-review-divider').isHidden(),'A read-only status is not an alternative check-in action');
            assert((await page.locator('#unified-report-review').boundingBox()).height<=36,'Pending review takes one compact line');
            await page.evaluate(()=>{myTests[0].play_review_status='approved';syncUnifiedReport();});
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'подтверждён':'confirmed'));
            assert((await page.locator('#unified-report-review-title').innerText()).includes(language==='ru'?'зачтён':'confirmed'));
            assert((await page.locator('#unified-report-review').boundingBox()).height<=36,'Approved review never keeps the large call-to-action card');
            assert(await page.locator('.unified-report-review-icon').isHidden());
            assert(await page.locator('.unified-report-review-arrow').isHidden());
            await page.locator('#unified-report-review').click();
            assert(await page.locator('#play-review-modal').evaluate(el=>el.classList.contains('active')),'Compact status still opens review details');
            await page.evaluate(()=>closePlayReviewModal());
            await page.evaluate(()=>{myTests[0].play_review_status='rejected';syncUnifiedReport();});
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'Отклонён':'Rejected'));
            assert((await page.locator('#unified-report-review').boundingBox()).height>=60,'Rejected review can be resubmitted and keeps the full action card');
            assert(await page.locator('.unified-report-review-divider').isVisible());
            assert(await page.locator('.unified-report-review-icon').isVisible());
            await page.evaluate(()=>{myTests[0].play_review_status='none';myTests[0].last_check_date=getLocalDate();syncUnifiedReport();});
            assert((await page.locator('#unified-report-review-hint').innerText()).includes(language==='ru'?'День уже зачтён':'Today is complete'));
            await page.evaluate(()=>{delete myTests[0].last_check_date;syncUnifiedReport();});
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
            const mediaAmounts=await page.evaluate(()=>{
                const s=_checkinProofUploadState,saved=s.files;
                const outputs=[];
                for(const [photos,videos,kind] of [[4,0,'screenshot'],[5,0,'screenshot'],[0,1,'screenshot'],[0,5,'screenshot'],[3,1,'screenshot'],[4,1,'screenshot'],[3,0,'bug'],[4,1,'idea']]){
                    s.files=[...Array.from({length:photos},()=>new File(['photo'],'photo.png',{type:'image/png'})),...Array.from({length:videos},()=>new File(['video'],'video.mp4',{type:'video/mp4'}))];
                    setUnifiedReportKind(kind); outputs.push(document.querySelector('#unified-report-series .checkin-proof-bonus-chip').innerText.trim());
                }
                s.files=saved;setUnifiedReportKind('screenshot');return outputs;
            });
            const decimal=language==='ru'?',':'.';
            assert.deepEqual(mediaAmounts,['0.2','0.3','0.3','0.3','0.4','0.5','0.6','1.0'].map(amount=>(language==='ru'?'Бонус: +':'Bonus: +')+amount.replace('.',decimal)));
            // It is the card's signed Open timer, not a second timer started by this sheet.
            await page.evaluate(()=>{
                _checkinOpenTokenState['30']={token:'fixture-open',progressId:300,runIteration:1,actorUserId:String(userId),localDate:getLocalDate(),readyAtMs:Date.now()+15000,expiresAtMs:Date.now()+60000};
                activeTimerAppId=30;_timerEndTimestamp=_checkinOpenTokenState['30'].readyAtMs;syncUnifiedReport();
            });
            assert((await page.locator('#unified-report-plain').innerText()).includes('15'));
            assert(await page.locator('#unified-report-plain').isDisabled());
            await page.evaluate(()=>{_checkinOpenTokenState['30'].readyAtMs=Date.now()-1;_timerEndTimestamp=Date.now()-1;syncUnifiedReport();});
            assert(!(await page.locator('#unified-report-plain').isDisabled()));
            assert(!(await page.locator('#unified-report-plain').evaluate(el=>el.classList.contains('is-waiting'))));
            if(width===430&&language==='ru') {
                await page.waitForTimeout(350);
                await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-screenshot-ru.png')});
            }
            await page.locator('[data-report-kind="bug"]').click();
            await page.locator('#unified-report-note').fill(language==='ru'?'После завершения уровня кнопка «Далее» не отвечает. При повторном запуске всё работает.':'The Next button stops responding after completing the level. Restarting fixes it.');
            if(width===430&&language==='ru') { await page.waitForTimeout(350); await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-bug-ru.png')}); }
            await page.setViewportSize({width,height:460});
            await page.locator('#unified-report-note').focus();
            await page.waitForTimeout(150);
            const submitRect=await page.locator('#checkin-proof-submit').boundingBox();
            assert(submitRect.y>=0&&submitRect.y+submitRect.height<=460,'CTA remains above the reduced viewport/keyboard');
            const field=await page.locator('#unified-report-note').boundingBox();
            const scrollBody=await page.locator('.unified-report-body').boundingBox();
            assert(field.y>=scrollBody.y-1&&field.y+field.height<=scrollBody.y+scrollBody.height+1,'Whole focused field is above the keyboard, inside the scroll area');
            assert(await page.locator('#report-modal-heading').evaluate(el=>el.parentElement.classList.contains('unified-report-body')),'Heading is in the scrolling body');
            await page.locator('.unified-report-body').evaluate(el=>el.scrollTop=el.scrollHeight);
            const scrolled=await page.locator('.unified-report-body').evaluate(el=>document.getElementById('report-modal-heading').getBoundingClientRect().bottom<el.getBoundingClientRect().top);
            assert(scrolled,'Header scrolls away instead of consuming the keyboard viewport');
            await page.setViewportSize({width,height:850});
            // Mobile Safari-style keyboard: layout viewport stays tall, visual viewport shrinks.
            await page.locator('#unified-report-note').focus();
            await page.evaluate(()=>{Object.defineProperty(window.visualViewport,'height',{configurable:true,value:390});window.visualViewport.dispatchEvent(new Event('resize'));});
            await page.waitForTimeout(150);
            const keyboardField=await page.locator('#unified-report-note').boundingBox();
            assert(keyboardField.y>=0&&keyboardField.y+keyboardField.height<=390,'VisualViewport overlay keyboard never covers the focused field');
            assert(await page.locator('#unified-report-review').isVisible(),'Review remains reachable with the keyboard open');
            assert(await page.locator('#unified-report-review-hint').isHidden(),'Compact keyboard layout makes room for the focused input');
            await page.evaluate(()=>{delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));document.getElementById('unified-report-note').blur();});
            if(width===430&&language==='ru') {
                const originalKey=await page.evaluate(()=>_checkinProofUploadState.idempotencyKey);
                await page.locator('.checkin-proof-preview-edit').first().click();
                const initialCanvas=await page.locator('.report-editor canvas').evaluate(el=>el.toDataURL());
                assert(await page.locator('.report-editor [data-action="undo"]').isDisabled());
                assert(await page.locator('.report-editor [data-action="redo"]').isDisabled());
                await page.locator('.report-editor [data-tool="arrow"]').click();
                await page.locator('.report-editor [data-color="#59ce8a"]').click();
                await page.locator('.report-editor input[type="range"]').evaluate(el=>{el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}));});
                const canvas=await page.locator('.report-editor canvas').boundingBox();
                const stage=await page.locator('.report-editor__stage').boundingBox();
                assert(Math.abs(canvas.height-stage.height)<2||Math.abs(canvas.width-stage.width)<2,'Canvas fills the available area while preserving its aspect ratio');
                await page.mouse.move(canvas.x+canvas.width*.2,canvas.y+canvas.height*.3);
                await page.mouse.down();
                await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.6,{steps:5});
                await page.mouse.up();
                await page.waitForFunction(base=>document.querySelector('.report-editor canvas').toDataURL()!==base,initialCanvas);
                const markedCanvas=await page.locator('.report-editor canvas').evaluate(el=>el.toDataURL());
                await page.locator('.report-editor [data-action="undo"]').click();
                await page.waitForFunction(base=>document.querySelector('.report-editor canvas').toDataURL()===base,initialCanvas);
                assert(await page.locator('.report-editor [data-action="undo"]').isDisabled());
                await page.locator('.report-editor [data-action="redo"]').click();
                await page.waitForFunction(marked=>document.querySelector('.report-editor canvas').toDataURL()===marked,markedCanvas);
                assert(await page.locator('.report-editor [data-action="redo"]').isDisabled());
                // A new stroke after Undo must discard the redo branch.
                await page.locator('.report-editor [data-action="undo"]').click();
                await page.locator('.report-editor [data-tool="cover"]').click();
                assert(await page.locator('.report-editor input[type="range"]').isDisabled());
                const coverCanvas = await page.locator('.report-editor canvas').boundingBox();
                await page.mouse.move(coverCanvas.x+coverCanvas.width*.25,coverCanvas.y+coverCanvas.height*.4); await page.mouse.down();
                await page.mouse.move(coverCanvas.x+coverCanvas.width*.75,coverCanvas.y+coverCanvas.height*.6,{steps:5}); await page.mouse.up();
                assert(await page.locator('.report-editor [data-action="redo"]').isDisabled());
                await page.waitForTimeout(50);
                const privatePixel=await page.locator('.report-editor canvas').evaluate(el=>Array.from(el.getContext('2d').getImageData(Math.floor(el.width*.5),Math.floor(el.height*.5),1,1).data));
                assert([[40,46,56,255],[75,85,99,255]].some(value=>JSON.stringify(value)===JSON.stringify(privatePixel)), 'Redaction is an opaque pattern, not a coloured marker or source-dependent blur');
                await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-editor-ru.png')});
                await page.locator('.report-editor [data-action="done"]').click();
                await page.waitForFunction(()=>!document.querySelector('.report-editor')&&!_checkinProofUploadState.checkingFiles);
                assert.equal(await page.evaluate(()=>_checkinProofUploadState.files.length),3);
                assert((await page.evaluate(()=>_checkinProofUploadState.files[0].name)).endsWith('-marked.jpg'));
                assert.notEqual(await page.evaluate(()=>_checkinProofUploadState.idempotencyKey),originalKey);
                await page.locator('.checkin-proof-preview-edit').first().click();
                await page.evaluate(()=>handleAppBack({source:'telegram'}));
                assert.equal(await page.locator('.report-editor').count(),0,'Telegram Back closes only the editor');
                assert(await page.locator('#report-modal').evaluate(el=>el.classList.contains('active')),'The report and its media survive editor Back');
            }
            await page.evaluate(()=>{closeReportModal(); myTests[0].testing_days=15; myTests[0].app_status='pending_completion';
                myTests[0].control_proof_catchups=[{id:8,missed_testing_day:4,state:'requested'},{id:9,missed_testing_day:7,state:'requested'}];
                openReportModal(30,'developer',{submissionMode:'buffer_catchup',catchupRequested:true});});
            assert(await page.locator('#unified-report-plain').isHidden());
            assert(await page.locator('#unified-report-review-option').isHidden(),'No review option in Buffer/catch-up-only flow');
            assert((await page.locator('#unified-report-catchup').innerText()).includes('Buffer'));
            assert.equal(await page.locator('#unified-report-info .is-earned').count(),0,'Buffer never advertises a daily photo-series payout');
            await page.evaluate(()=>{closeReportModal(); Object.assign(myTests[0],{testing_days:5,app_status:'active',control_proof_catchups:[],request_reviews:false,screenshot_boost_campaign:null});openReportModal(30,'developer');});
            await page.waitForTimeout(350);
            const sheet=await page.locator('#report-modal .report-modal-sheet').boundingBox();
            assert(sheet.height<850*.84,'Empty ordinary form hugs content instead of stretching to 92vh');
            const gap=await page.locator('.checkin-proof-upload-actions').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('.unified-report-body').getBoundingClientRect().bottom);
            assert(gap<=16,'No empty spacer before the submit action');
            if(width===430&&language==='ru') await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-empty-ru.png')});
            await page.locator('#report-developer-toggle').click();
            assert.equal(await page.locator('#report-developer-toggle').getAttribute('aria-expanded'),'true');
            assert((await page.locator('#report-developer-summary').innerText()).includes('Giuseppe'));
            assert.equal(await page.locator('#report-developer-body .checkin-dev-accordion__row').count(),3);
            assert.equal(await page.locator('#report-developer-body .checkin-dev-accordion__row').last().locator('strong').innerText(),'4');
            if(width===430&&language==='ru') {await page.waitForTimeout(250); await page.screenshot({path:path.resolve(root,'../artifacts/unified-report-owner-ru.png')});}
            // The original external/legacy host keeps working after the heading moved.
            await page.evaluate(()=>{closeReportModal();window.App.screenshotProofUploadEnabled=false;openReportModal(30,'developer');});
            assert(await page.locator('#report-modal-heading').evaluate(el=>el.parentElement.classList.contains('report-modal-sheet')));
            await page.close();
            assert.deepEqual(errors,[]);
        }
    } finally { await browser.close(); }
    console.log('Unified report: synchronous open, RU/EN 360/430px, formats, media/notes, marker, control/catch-up/Buffer passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
