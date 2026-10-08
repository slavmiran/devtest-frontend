const assert = require('node:assert/strict');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');

(async () => {
    const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        for (const language of ['ru','en']) {
            const page = await browser.newPage({viewport:{width:390,height:1000}});
            const errors = [];
            page.on('pageerror',error => errors.push(error.message));
            page.on('console',message => {if(message.type()==='error') errors.push(message.text());});
            await page.route('http://fixture.local/**',route => route.fulfill({contentType:'text/html',body:'<section id="tab-projects"><div id="projects-list"></div></section><div id="archived-projects-list"></div>'}));
            await page.goto('http://fixture.local/');
            for (const file of ['i18n/ru.js','i18n/en.js','i18n/core.js','ui/ui-helpers.js','ui/ui-projects-pipeline-header.js','ui/ui-projects.js','ui/ui-projects-moderation.js','js/project-results.js','js/project-today.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(language => {
                window.lang = language;
                Object.assign(window.t,language==='ru' ? I18NRU : I18NEN);
                window.API_BASE='/api'; window.App={API_BASE:'/api',state:{}};
                window.visibilityStats=null; window.tg={HapticFeedback:{impactOccurred(){},notificationOccurred(){}}};
                window.getLocalDate=()=> '2026-10-08';
                window.getTelegramInitDataRaw=()=> 'fixture';
                window.renderGuaranteedOrdersSection=()=>{};
                window.renderGuaranteedDraftBanner=()=>{};
                window.getProjectCurrentGoogleDay=()=>14;
                window.buildRunIterationChip=()=>'';
                window.buildProjectFeedbackButton=()=>'';
                window.getLangBadge=()=>'';
                window.fetchWithRetry=async()=>({ok:true,json:async()=>({status:'success',items:[]})});
                window.myProjects=[{id:30,name:'Published App',phase:'live',status:'completed',is_visible:true,
                    created_at:'2026-09-10T12:00:00Z',last_sync_date:'2026-09-24',google_sync_day:14,
                    mode:'mutual',limit_mutual:12,request_reviews:true,target_lang:'ALL',testers:[],results_summary:{}}];
                window.archivedProjects=[{app_id:30,name:'Published App',phase:'live',status:'completed'}];
                localStorage.setItem('hideDeleteReminder','true');
                localStorage.setItem('project_card_collapsed_30','false');
                localStorage.setItem('pc_participants_collapsed_30','0');
                window.ProjectToday.mount=()=>{}; // No background I/O in this render fixture.
                renderProjects(true);
            },language);
            assert.equal(await page.locator('#pipeline-section-live #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-stage-badge--live').innerText(),'Live');
            assert.deepEqual(errors,[]);
            assert.equal(await page.locator('#project-card-30 .pc-participants-title').innerText(),language==='ru'?'Пользователи':'Users');
            assert.equal(await page.locator('#project-card-30 .pc-team-label').count(),0); // expanded team has one heading
            assert.equal(await page.locator('#project-card-30 .pc-results-card').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-metrics-grid').count(),1);
            assert.equal(await page.evaluate(()=>collectPipelineProjectsByPhase().live.length),1);
            assert.deepEqual(errors,[]);
            // Existing testing cards retain their original team label and section.
            await page.evaluate(()=>{myProjects[0].phase='testing';myProjects[0].status='active';renderProjects(true);});
            assert.equal(await page.locator('#pipeline-section-testing #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-participants-title').innerText(),language==='ru'?'Команда':'Team');
            // Publication refresh must bring the archive-backed card into the live dashboard.
            await page.evaluate(async()=>{
                myProjects=[];
                archivedProjects=[{app_id:42,name:'Moderation',phase:'moderation',status:'completed'}];
                document.getElementById('projects-list').replaceChildren(buildModerationCard(Object.assign({id:42},archivedProjects[0])));
                window.apiPipelineRequestLive=async()=>({ok:true});
                window.showToast=()=>{};
                window.loadProjects=async()=>{myProjects=[Object.assign({},archivedProjects[0],{id:42,phase:'live',testers:[],is_visible:true,created_at:'2026-09-10',mode:'mutual'})];};
                await handleModerationRequestLive(42);
            });
            assert.equal(await page.locator('#pipeline-section-live #project-card-42').count(),1);
            assert.equal(await page.locator('.card-moderation').count(),0);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Live cards: shared renderer, RU/EN users labels, grouping, deduplication and publication transition passed');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
