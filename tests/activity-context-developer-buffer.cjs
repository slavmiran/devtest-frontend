const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '../artifacts/activity-context');
const projectsCode = fs.readFileSync(path.join(root, 'ui/ui-projects.js'), 'utf8');
const dayCode = projectsCode.slice(projectsCode.indexOf('        let dayMain;'), projectsCode.indexOf('        const isPaidDaysActive'));

(async () => {
    fs.mkdirSync(output, {recursive:true});
    const browser = await chromium.launch({headless:true, channel:'chrome'});
    try {
        for (const language of ['ru', 'en']) for (const width of [360,390]) {
            const page = await browser.newPage({viewport:{width,height:900}});
            const errors=[];
            page.on('pageerror',error=>errors.push(error.message));
            await page.addInitScript(()=>{
                window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:'en'}},themeParams:{},colorScheme:'dark',
                    expand(){},ready(){},onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};
            });
            await page.route('**/*',route=>{
                const url=new URL(route.request().url());
                if(url.hostname!=='fixture.local')return route.fulfill({contentType:'application/javascript',body:''});
                const file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
                assert(file.startsWith(root+path.sep));
                if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
                return route.fulfill({contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html',body:fs.readFileSync(file)});
            });
            await page.goto('http://fixture.local/');
            await page.addStyleTag({content:'#no-username-overlay{display:none!important}'});
            await page.evaluate(language=>{
                lang=language;App.testingControlEnabled=true;
                window.getLocalDate=()=> '2026-10-19';window.getLocalDateIso=()=> '2026-10-19';
                const assessment={riskScore:3,yesterday:{risk:true,text:'Miss'},skips:{risk:true,text:'3 skips'},
                    rhythm:{risk:false,text:'19:00'},profile:{risk:true,reliability:6,karma:3.1}};
                window.rohan={tester_id:10,username:'the_rohan',full_name:'Rohan',current_day:5,checkins_count:2,
                    consecutive_skips:3,skips_count:3,activityAssessment:assessment};
                myProjects=[{id:101,name:'My reciprocal app',testers:[rohan]}];
                myTests=[{id:199,app_id:199,name:'Family organizer',owner_id:10,owner_username:'the_rohan',owner_full_name:'Rohan',
                    reciprocal_app_id:101,reciprocal_app_name:'My reciprocal app',testing_days:5,checkins_count:2,skips_count:0,
                    start_date:'2026-10-15',last_check_date:'2026-10-18',join_type:'mutual',progress_status:'active',google_sync_day:0,
                    owner_reliability_index:6,owner_karma:3.1,package:'com.example.app',mode:'mutual'}];
                window.fetchWithRetry=async url=>{
                    if(String(url).includes('/projects/880')) return new Promise(resolve=>{window.finishAssessmentRequest=resolve;});
                    return {ok:true,json:async()=>({status:'success'})};
                };
                window.fetch=async()=>({ok:true,json:async()=>({status:'success',partner_id:10,partner_username:'the_rohan',
                    partner_full_name:'Rohan',partner_app_id:101,partner_app_name:'My reciprocal app',
                    my_testing_days:5,partner_testing_days:5,partner_consecutive_skips:3,partner_skips:3})});
                window.tg.HapticFeedback={impactOccurred(){},selectionChanged(){}};
            },language);
            await page.evaluate(()=>openMutualBalanceModal(199));
            await page.waitForFunction(()=>document.getElementById('mutual-balance-body').textContent.includes('Rohan'));
            await page.evaluate(()=>openBellRemindPreview());
            assert.equal(await page.locator('.bell-remind-assessment__count').innerText(),'3/4','My Tests uses partner on reciprocal app');
            await page.evaluate(()=>{closeBellRemindOverlay();myProjects=[];openBellRemindPreview({testerId:10,remindAppId:101,username:'the_rohan'});});
            await page.waitForFunction(()=>typeof finishAssessmentRequest==='function');
            await page.evaluate(()=>finishAssessmentRequest({ok:true,json:async()=>({projects:[{app_id:101,name:'My reciprocal app',testers:[rohan]}]})}));
            await page.waitForFunction(()=>document.querySelector('.bell-remind-assessment__count').textContent==='3/4');
            await page.locator('.bell-remind-assessment__toggle').click();
            assert.equal(await page.locator('.bell-remind-assessment .pc-activity-card').count(),4);
            await page.screenshot({path:path.join(output,`${language}-${width}-assessment.png`)});
            // A stale async response cannot repaint a different tester or closed sheet.
            await page.evaluate(()=>{closeBellRemindOverlay();openBellRemindPreview({testerId:10,remindAppId:101});});
            await page.evaluate(()=>{closeBellRemindOverlay();finishAssessmentRequest({ok:true,json:async()=>({projects:[{id:101,testers:[rohan]}]})});});
            await page.waitForTimeout(50);
            assert.equal(await page.locator('#bell-remind-assessment').innerHTML(),'');

            const attention=await page.evaluate(()=>{
                const base={join_type:'mutual',reciprocal_app_id:199,start_date:'2026-10-16',testing_days:4,
                    checkins_count:1,last_check_date:'2026-10-16',consecutive_skips:2};
                const project={id:101,status:'active',testers:[
                    {...base,tester_id:20,consecutive_skips:99,exchange_state:{version:1,is_broken:false,left:{leg_status:'active',metrics:{consecutive_skips:2}},right:{leg_status:'active'}}},
                    {...base,tester_id:21,consecutive_skips:3},
                    {...base,tester_id:22,testing_days:5,start_date:'2026-10-15',last_check_date:'2026-10-15',catchup_proof:{requestable_missed_days:[4]}},
                ]};
                return ProjectToday.collectAttention(project).map(item=>({id:item.testerId,codes:item.reasons.map(r=>r.code)}));
            });
            assert(!attention.some(item=>item.id===20),'Two skips plus current control day are not attention');
            assert(attention.some(item=>item.id===21&&item.codes.includes('skips')),'Three closed skips remain actionable');
            assert(attention.some(item=>item.id===22&&item.codes.includes('missed_control')),'Actual missed proof remains actionable');

            await page.evaluate(()=>{
                closeMutualBalanceModal();
                window.dossierCalls=[];window.openTesterDossier=(...args)=>dossierCalls.push(args);
                openProjectDetailsModal(199);
            });
            const dossier=page.locator('.detail-owner-block .bounty-app-dossier-btn');
            assert.equal(await dossier.count(),1);
            assert.equal(await dossier.locator('svg').count(),1);
            assert(await page.locator('.detail-owner-row').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
            await dossier.scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(output,`${language}-${width}-developer.png`)});
            await dossier.click();
            assert.deepEqual(await page.evaluate(()=>dossierCalls[0]),['the_rohan',10,101]);

            for(const pending of [false,true]) for(const consumed of [0,1,24]) {
                await page.evaluate(({dayCode,pending,consumed})=>{
                    const html=new Function('isPendingCompletion','hasSync','currentGoogleDay','platformDays','project',dayCode+';return dayValueHtml;')(pending,true,14,19,{consumed_pending_hours:consumed});
                    document.getElementById('project-details-body').innerHTML='<div id="buffer-day-fixture">'+html+'</div>';
                },{dayCode,pending,consumed});
                assert.equal(await page.locator('#buffer-day-fixture .pc-metric-day__value--buffer').count(),pending?1:0);
                if(pending) assert(await page.locator('#buffer-day-fixture .pc-metric-day__value').evaluate(el=>{
                    const probe=document.createElement('span');probe.style.color='var(--stage-buffer, #ffb84d)';el.parentElement.append(probe);
                    const matches=getComputedStyle(el).color===getComputedStyle(probe).color;probe.remove();return matches;
                }),'Day number uses the actual buffer theme color');
            }
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Passed RU/EN 360/390px: reciprocal assessment, lazy roster load, late-response guard, dossier action, immediate buffer color, 2/3 attention threshold.');
    }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
