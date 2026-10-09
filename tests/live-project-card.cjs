const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const artifacts = path.resolve(root, '../artifacts/play-store-passport');
fs.mkdirSync(artifacts, {recursive:true});

(async () => {
    const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        for (const language of ['ru','en']) {
            const page = await browser.newPage({viewport:{width:360,height:1000}});
            const errors = [];
            page.on('pageerror',error => errors.push(error.message));
            page.on('console',message => {if(message.type()==='error') errors.push(message.text());});
            await page.route('http://fixture.local/**',route => {
                const pathname = new URL(route.request().url()).pathname;
                if (pathname.startsWith('/images/Icons/')) return route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(path.join(root, pathname))});
                return route.fulfill({contentType:'text/html',body:'<section id="tab-projects"><div id="projects-list"></div></section><div id="archived-projects-list"></div>'});
            });
            await page.goto('http://fixture.local/');
            for (const file of ['css/tokens.css','css/base.css','styles.css','css/project-card-dashboard.css','css/play-store-passport.css','css/live-project-metrics.css']) await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['i18n/ru.js','i18n/en.js','i18n/core.js','ui/ui-helpers.js','ui/ui-projects-pipeline-header.js','js/play-store-passport.js','js/live-project-metrics.js','ui/ui-projects.js','ui/ui-projects-moderation.js','js/project-results.js','js/project-today.js']) await page.addScriptTag({path:path.join(root,file)});
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
                    mode:'mutual',limit_mutual:12,request_reviews:true,target_lang:'ALL',testers:[],results_summary:{},live_balance_bust:137.5,protection_bust_pool:999,
                    live_metrics:{source:'devtesthub_live',as_of:new Date().toISOString(),boundary_available:true, reviews:{total:68,rating:4.3,per_day:.5,trend_available:true,trend_percent:-1.2},installs:{total:332,per_day:3.5,trend_available:true,trend_percent:3},active_users:112,avg_retention_days:23,days_since_update:79,keywords:[{keyword:'taxi',installs:44},{keyword:'delivery',installs:14}]}}];
                window.archivedProjects=[{app_id:30,name:'Published App',phase:'live',status:'completed'}];
                localStorage.setItem('hideDeleteReminder','true');
                localStorage.setItem('project_card_collapsed_30','false');
                localStorage.setItem('pc_participants_collapsed_30','0');
                window.ProjectToday.mount=()=>{}; // No background I/O in this render fixture.
                renderProjects(true);
            },language);
            assert.equal(await page.locator('#pipeline-section-live #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-stage-badge--live').count(),0);
            assert.match(await page.locator('#project-card-30 .live-project-balance').innerText(), /137[,.]5 \$BUST/);
            assert.equal(await page.locator('#project-card-30 .live-project-details').count(),1);
            await page.locator('#project-card-30 .card-header').screenshot({path:path.join(artifacts, 'live-header-' + language + '-360.png')});
            assert.deepEqual(errors,[]);
            assert.equal(await page.locator('#project-card-30 .pc-participants-title').count(),0); // Phase 1 roster is not a Live metric
            assert.equal(await page.locator('#project-card-30 .pc-team-label').count(),0);
            assert.equal(await page.locator('#project-card-30 .pc-results-card').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-metrics-grid').count(),0);
            assert.equal(await page.locator('#project-card-30 .live-metrics').count(),1);
            assert.equal(await page.locator('#project-card-30 .live-phase1-history-label').count(),1);
            await page.locator('#project-card-30 .pc-state-unified').screenshot({path:path.join(artifacts, 'live-metrics-' + language + '-360.png')});
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            assert.equal(await page.evaluate(()=>collectPipelineProjectsByPhase().live.length),1);
            assert.deepEqual(errors,[]);
            // Existing testing cards retain their original team label and section.
            await page.evaluate(()=>{myProjects[0].phase='testing';myProjects[0].status='active';renderProjects(true);});
            assert.equal(await page.locator('#pipeline-section-testing #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .live-metrics').count(),0);
            assert.equal(await page.locator('#project-card-30 .pc-metrics-grid').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-participants-title').innerText(),language==='ru'?'Команда':'Team');
            // Publication refresh must bring the archive-backed card into the live dashboard.
            await page.evaluate(async()=>{
                myProjects=[];
                archivedProjects=[{app_id:42,name:'Moderation',phase:'moderation',status:'archived'}];
                document.getElementById('projects-list').replaceChildren(buildModerationCard(Object.assign({id:42},archivedProjects[0])));
                window.apiPipelineRequestLive=async()=>({ok:true});
                window.showToast=()=>{};
                window.loadProjects=async(background,force)=>{
                    window.publicationRefreshOptions={background,force};
                    if (!force) throw new Error('Publication refresh must bypass throttle');
                    myProjects=[Object.assign({},archivedProjects[0],{id:42,phase:'live',testers:[],is_visible:true,created_at:'2026-09-10',mode:'mutual'})];
                };
                await handleModerationRequestLive(42);
            });
            assert.equal(await page.locator('#pipeline-section-live #project-card-42').count(),1);
            assert.deepEqual(await page.evaluate(()=>publicationRefreshOptions),{background:true,force:true});
            assert.equal(await page.locator('.card-moderation').count(),0);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Live cards: shared renderer, RU/EN users labels, grouping, deduplication and publication transition passed');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
