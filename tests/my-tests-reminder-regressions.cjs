const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const styles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(m=>m[1]);
const bellMarkup = html.slice(html.indexOf('    <div id="bell-remind-overlay"'),html.indexOf('    <!-- Project Protection Center'));
const testsCode = fs.readFileSync(path.join(root,'ui/ui-tests.js'),'utf8');
const scrollCode = testsCode.slice(testsCode.indexOf('function getPageScrollY'),testsCode.indexOf('function getOpenControlProofCatchups'));
const output = path.resolve(root,'../artifacts/my-tests-reminder');

(async()=>{
    fs.mkdirSync(output,{recursive:true});
    const browser = await chromium.launch({headless:true,channel:'chrome'});
    try {
        const scroll = await browser.newPage({viewport:{width:390,height:720}});
        await scroll.setContent('<body style="margin:0"><div id="tab-tests"><div id="tests-list"><div class="card" id="test-card-1" style="height:600px"></div><div class="card" id="test-card-2" style="height:600px"></div></div><div id="pending-release-list" style="height:400px"></div><div id="done-list" style="height:1800px"></div></div></body>');
        await scroll.addScriptTag({content:'window.activeTab="tests";function isTabVisible(name){return activeTab===name;}\n'+scrollCode});
        await scroll.evaluate(()=>{
            window.scrollTo(0,480);rememberTestsScrollForResume();window.saved=getTestsScrollResumeToken();
            window.scrollTo(0,1600);restoreTestsScrollAfterResume(saved);
        });
        await scroll.evaluate(()=>new Promise(requestAnimationFrame));
        assert.equal(await scroll.evaluate(()=>window.scrollY),480,'Store return restores its own position');
        await scroll.evaluate(()=>{window.scrollTo(0,950);restoreTestsScrollAfterResume(saved);});
        assert.equal(await scroll.evaluate(()=>window.scrollY),950,'A consumed resume cannot fire again');
        await scroll.evaluate(()=>{
            activeTab='projects';window.scrollTo(0,1700);rememberTestsScrollForResume();
            activeTab='tests';window.scrollTo(0,400);restoreTestsScrollAfterResume();
        });
        assert.equal(await scroll.evaluate(()=>window.scrollY),400,'Other tabs cannot seed the tests scroll');
        await scroll.evaluate(()=>{
            rememberTestsScrollForResume();window.oldToken=getTestsScrollResumeToken();
            document.dispatchEvent(new WheelEvent('wheel'));window.scrollTo(0,1100);
            restoreTestsScrollAfterResume(oldToken);
        });
        assert.equal(await scroll.evaluate(()=>window.scrollY),1100,'Late refresh respects newer manual scrolling');
        await scroll.evaluate(()=>{
            rememberTestsScrollForResume();window.newToken=getTestsScrollResumeToken();
            window.scrollTo(0,1500);restoreTestsScrollAfterResume(oldToken);
        });
        assert.equal(await scroll.evaluate(()=>window.scrollY),1500,'Old promises cannot consume a newer resume');
        await scroll.evaluate(()=>restoreTestsScrollAfterResume(newToken));
        assert.equal(await scroll.evaluate(()=>window.scrollY),1100);
        await scroll.evaluate(()=>{
            document.dispatchEvent(new WheelEvent('wheel'));window.scrollTo(0,480);
            const anchor=captureTestsViewportAnchor();
            document.getElementById('pending-release-list').append(document.getElementById('test-card-1'));
            restoreTestsViewportAnchor(anchor);
        });
        assert.equal(await scroll.evaluate(()=>window.scrollY),480,'A card moving into Buffer cannot pull the page down');
        await scroll.close();

        for (const language of ['ru','en']) for (const width of [320,390]) {
            const page = await browser.newPage({viewport:{width,height:900}});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            await page.route('http://fixture.local/**',r=>r.fulfill({contentType:'text/html',body:'<html><body>'+bellMarkup+'<div id="fixture"></div><div id="tab-tests"><div id="pending-release-section" class="pending-release-section"><button class="ts-section-head ts-section-head--buffer pending-release-section__header" onclick="this.parentElement.classList.toggle(\'is-collapsed\')">Buffer</button></div><div id="done-section" class="accordion active"><button class="ts-section-head ts-section-head--done" onclick="this.parentElement.classList.toggle(\'active\')">Done</button></div></div></body></html>'}));
            await page.goto('http://fixture.local/');
            for (const file of styles) if(fs.existsSync(path.join(root,file))) await page.addStyleTag({path:path.join(root,file)});
            await page.addStyleTag({content:'body{margin:0;background:#0e131b;color:#eff4fb;font-family:system-ui}*{box-sizing:border-box}'});
            for (const file of ['i18n/ru.js','i18n/en.js','ui/ui-helpers.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(language=>{
                window.lang=language;window.t=(key,params={})=>{
                    let value=(lang==='ru'?I18NRU:I18NEN)[key]||key;
                    for(const [k,v] of Object.entries(params))value=value.split('{'+k+'}').join(v);
                    return value;
                };
                window.API_BASE='http://fixture.local/api';window.App={testingControlEnabled:true};
                window.sent=[];window.openOwnerCheckpointChat=(...args)=>{sent.push(args);return true;};
                window.showToast=()=>{};window.getLocalDate=()=> '2026-10-18';
                window.tg={openTelegramLink:()=>{},HapticFeedback:{selectionChanged(){}}};
                const assessment={riskScore:3,yesterday:{risk:true,text:'Yesterday missed'},skips:{risk:true,text:'3 skips'},
                    rhythm:{risk:false,text:'19:00'},profile:{risk:true,reliability:8,karma:-15.7}};
                window.myProjects=[{id:101,name:'QuickSweep',testers:[
                    {tester_id:10,username:'first_tester',full_name:'First Tester',current_day:7,activityAssessment:assessment},
                    {tester_id:11,username:'second_tester',full_name:'Second Tester',current_day:4,activityAssessment:{...assessment,riskScore:0,
                        yesterday:{risk:false,text:'OK'},skips:{risk:false,text:'0 skips'},profile:{risk:false,reliability:100,karma:10}}},
                ]}];
            },language);
            for(const file of ['js/project-today.js','js/mutual-exchange-ui.js'])await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(()=>{
                document.getElementById('fixture').innerHTML=controlActivitySignalChipHtml(101,{
                    testerId:10,tester:myProjects[0].testers[0],activityAssessment:myProjects[0].testers[0].activityAssessment,
                });
                pcOpenTesterControlActivitySheet(101,10);
            });
            const sharedDetails=await page.locator('#pc-tester-activity-dialog .pc-activity-cards-grid').innerHTML();
            await page.evaluate(()=>{document.getElementById('pc-tester-activity-dialog').remove();openBellRemindPreview({testerId:10,username:'first_tester',fullName:'First Tester',remindAppId:101,remindAppName:'QuickSweep',remindReason:'control',controlDay:7,messageLang:'en'});});
            assert.equal(await page.locator('.bell-remind-assessment').getAttribute('open'),null);
            assert.equal(await page.locator('.bell-remind-cancel-btn').count(),0);
            assert.equal(await page.locator('.bell-remind-assessment .pc-smart-bell__dot').count(),4);
            assert.equal(await page.locator('.bell-remind-assessment .pc-smart-bell__dot.is-lit').count(),3);
            assert.equal(await page.locator('.bell-remind-assessment__count').innerText(),'3/4');
            if(language==='en')assert.equal(await page.locator('.pc-control-signal-chip__main').innerText(),'3 signals');
            await page.waitForTimeout(350); // Let the existing bottom-sheet entrance settle.
            await page.screenshot({path:path.join(output,`${language}-${width}-collapsed.png`)});
            await page.locator('.bell-remind-assessment__toggle').click();
            assert.equal(await page.locator('.bell-remind-assessment .pc-activity-cards-grid').innerHTML(),sharedDetails,'Details use the existing renderer');
            assert.equal(await page.evaluate(()=>sent.length),0,'Expanding must never send');
            assert.equal(await page.locator('.bell-remind-assessment button').count(),0,'No duplicate send action inside assessment');
            await page.waitForTimeout(350);
            await page.screenshot({path:path.join(output,`${language}-${width}-expanded.png`)});
            assert(await page.locator('#bell-remind-overlay .modal-content').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'No horizontal overflow');
            await page.locator('#t-bellRemindBtnDm').click();
            assert.equal(await page.evaluate(()=>sent[0][0]),'first_tester');
            await page.evaluate(()=>openBellRemindPreview({testerId:11,username:'second_tester',remindAppId:101,remindAppName:'QuickSweep'}));
            assert.equal(await page.locator('.bell-remind-assessment').getAttribute('open'),null);
            assert.equal(await page.locator('.bell-remind-assessment__count').innerText(),'0/4');
            assert.equal(await page.locator('.bell-remind-assessment .pc-smart-bell__dot.is-lit').count(),0);
            await page.evaluate(()=>closeBellRemindOverlay());
            for(const selector of ['.ts-section-head--buffer','.ts-section-head--done']){
                await page.locator(selector).click();
                const style=await page.locator(selector).evaluate(el=>({outline:getComputedStyle(el).outlineStyle,transition:getComputedStyle(el).transitionProperty,border:getComputedStyle(el).borderTopColor}));
                assert.equal(style.outline,'none');assert(!style.transition.includes('border-color'));
                assert.notEqual(style.border,'rgb(255, 255, 255)','Collapse never interpolates through a white border');
            }
            await page.keyboard.press('Tab');
            await page.locator('.ts-section-head--buffer').focus();
            assert(await page.locator('.ts-section-head--buffer').evaluate(el=>el.matches(':focus-visible') && getComputedStyle(el).outlineWidth==='2px'),'Keyboard focus remains visible');
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Passed: resume scroll ownership/races/section moves, shared RU/EN assessment accordion, no accidental sends, sequential testers, primary DM and non-flashing headers (320/390px).');
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
