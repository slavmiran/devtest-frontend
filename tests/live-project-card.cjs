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
        for (const language of ['ru','en']) for (const width of [360,390,430]) {
            const page = await browser.newPage({viewport:{width,height:1000}});
            const errors = [];
            page.on('pageerror',error => errors.push(error.message));
            page.on('console',message => {if(message.type()==='error') errors.push(message.text());});
            await page.route('http://fixture.local/**',route => {
                const pathname = new URL(route.request().url()).pathname;
                if (pathname.endsWith('/campaigns')) return route.fulfill({json:{status:'success',project_control:{revision:1,pool_available:160,policy:{paced:false},parameters:{request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:''},allocations:[]},campaigns:[{kind:'closed_bridge',id:99,app_id:30,status:'active',total_slots:7,occupied_slots:8,free_occupied:7,free_available:0,paid_active:1,next_slot:8,next_slot_price:350,pool_available:160,reserved_bust:40,overlimit_cost:40,affordable_overlimit:4,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:'',additional_reports:[]}]}});
                if (pathname.startsWith('/images/Icons/')) return route.fulfill({contentType:'image/svg+xml',body:fs.readFileSync(path.join(root, pathname))});
                return route.fulfill({contentType:'text/html',body:'<section id="tab-projects"><div id="projects-list"></div></section><div id="archived-projects-list"></div>'});
            });
            await page.goto('http://fixture.local/');
            const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(match=>match[1]);
            for (const file of styles) if(fs.existsSync(path.join(root,file))) await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/live-campaign-wizard.js','i18n/live-campaign-pace.js','i18n/live-campaign-edit.js','i18n/live-project-control.js','i18n/core.js','ui/ui-helpers.js','ui/ui-projects-pipeline-header.js','js/play-store-passport.js','js/live-project-metrics.js','js/project-parameters.js','js/live-campaign-wallet.js','js/live-campaign-controls.js','js/live-project-control.js','js/live-campaign-growth-card.js','js/live-campaigns.js','ui/ui-projects.js','ui/ui-projects-moderation.js','js/project-results.js','js/project-today.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(language => {
                window.lang = language;
                window.currentLang = language;
                Object.assign(window.t,language==='ru' ? I18NRU : I18NEN);
                window.API_BASE='/api'; window.App={API_BASE:'/api',state:{}};
                window.visibilityStats=null; window.tg={HapticFeedback:{impactOccurred(){},notificationOccurred(){}}};
                window.getLocalDate=()=> '2026-10-08';
                window.getTelegramInitDataRaw=()=> 'fixture';
                window.renderGuaranteedOrdersSection=()=>{};
                window.renderGuaranteedDraftBanner=()=>{};
                window.getProjectCurrentGoogleDay=()=>14;
                window.isMandatoryScreenshotDay=day=>[1,4,7,10,14].includes(day);
                window.buildRunIterationChip=()=>'';
                window.buildProjectFeedbackButton=()=>'';
                window.getLangBadge=()=>'';
                window.fetchWithRetry=async()=>({ok:true,json:async()=>({status:'success',items:[]})});
                window.myProjects=[{id:30,name:'Published App',phase:'live',status:'completed',is_visible:true,
                    created_at:'2026-09-10T12:00:00Z',last_sync_date:'2026-09-24',google_sync_day:14,
                    mode:'mutual',limit_mutual:12,request_reviews:true,target_lang:'ALL',bugs_new_count:1,bugs_total_count:1,testers:[{tester_id:77,username:'live_tester',join_type:'mutual',is_live_tester:true,connection_type:'live',progress_id:777,current_day:4,testing_days:4,last_check_date:'2026-10-07',status:'active'}, {tester_id:78,username:'phase_one_only',join_type:'mutual',progress_id:778,current_day:14,status:'active'}],results_summary:{},live_balance_bust:137.5,protection_bust_pool:999,
                    live_metrics:{source:'devtesthub_live',as_of:new Date().toISOString(),boundary_available:true, reviews:{total:68,rating:4.3,per_day:.5,trend_available:true,trend_percent:-1.2},installs:{total:332,per_day:3.5,trend_available:true,trend_percent:3},active_users:112,avg_retention_days:23,days_since_update:79,keywords:[{keyword:'taxi',installs:44},{keyword:'delivery',installs:14}]}}];
                window.archivedProjects=[{app_id:30,name:'Published App',phase:'live',status:'completed'}];
                localStorage.setItem('hideDeleteReminder','true');
                localStorage.setItem('project_card_collapsed_30','false');
                localStorage.setItem('pc_participants_collapsed_30','0');
                localStorage.setItem('live_results_open_30','0'); // A legacy fold preference must no longer hide results.
                window.ProjectToday.mount=()=>{}; // No background I/O in this render fixture.
                renderProjects(true);
            },language);
            await page.waitForSelector('#project-card-30 .lc-campaign').catch(e=>{console.error(errors);throw e;});
            assert.equal(await page.evaluate(()=>{const card=document.querySelector('#project-card-30').getBoundingClientRect(), block=document.querySelector('[data-live-campaigns]').getBoundingClientRect();return block.left-card.left>=12 && card.right-block.right>=12;}),true,'Campaign block has side insets inside the actual project card');
            assert.equal(await page.locator('.lc-section').evaluate(el=>{const s=getComputedStyle(el);return parseFloat(s.borderTopWidth)>=1&&parseFloat(s.paddingLeft)>=10&&parseFloat(s.paddingRight)>=10;}),true,'One shared frame and inner padding unite the campaign controls');
            assert.equal(await page.locator('.lc-section [data-lc-action="learn"]').count(),0,'Learning lives in the campaign wizard header');
            assert.equal(await page.locator('.lc-section-head h3').innerText(),language==='ru'?'Текущие Компании':'Current campaigns');
            assert.equal((await page.locator('.pc-project-params__toggle').first().innerText()).includes('NaN'),false,'Missing report settings must not produce NaN');
            assert.equal(await page.locator('#project-card-30 [data-lc-card]').getAttribute('open'),null);
            assert.match(await page.locator('#project-card-30 [data-lc-card]>summary').innerText(),/7 \/ 7/);
            await page.locator('#project-card-30').screenshot({path:path.join(artifacts,'live-card-campaigns-'+language+'-'+width+'.png')});
            assert.equal(await page.locator('#pipeline-section-live #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-stage-badge--live').count(),0);
            assert.equal(await page.locator('#project-card-30 .live-project-balance').count(),0);
            assert.ok(await page.locator('#project-card-30 .live-project-status').innerText());
            assert.equal(await page.locator('#project-card-30 .live-project-details').count(),1);
            await page.locator('#project-card-30 .card-header').screenshot({path:path.join(artifacts, 'live-header-' + language + '-'+width+'.png')});
            assert.deepEqual(errors,[]);
            assert.equal(await page.locator('#project-card-30 .pc-participants-title').count(),1);
            assert.equal(await page.locator('#project-card-30 .tester-live-prefix').count(),1);
            assert.equal(await page.locator('#project-card-30').innerText().then(x=>x.includes('@phase_one_only')),false,'Phase 1 testers stay out of Live roster');
            assert.equal(await page.locator('#project-card-30 .pc-team-label').count(),0);
            assert.equal(await page.locator('#project-card-30 .pc-results-card').count(),1);
            assert.equal(await page.locator('#project-card-30 .pc-metrics-grid').count(),0);
            assert.equal(await page.locator('#project-card-30 .live-metrics').count(),1);
            assert.equal(await page.locator('#project-card-30 [data-live-campaigns]').count(),1);
            assert.equal(await page.evaluate(()=>{const a=document.querySelector('.live-metrics-slot'),b=document.querySelector('[data-live-campaigns]');return !!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);}),true);
            assert.equal(await page.locator('#project-card-30 [data-live-results],#project-card-30 .lpc-results-fold').count(),0,'No redundant results accordion');
            const results=page.locator('#project-card-30 .pc-results-block-slot>.pc-results-card--live');
            assert.equal(await results.isVisible(),true,'Results are shown without expanding another section');
            assert.equal(await results.evaluate(el=>{const s=getComputedStyle(el);return parseFloat(s.marginLeft)>=12&&parseFloat(s.marginRight)>=12&&parseFloat(s.paddingLeft)>=12&&parseFloat(s.marginBottom)>=14;}),true,'Results keep their outer and inner spacing');
            assert.equal(await results.locator('.pc-results-title').innerText(),language==='ru'?'Пользовательский опыт и покрытие':'User experience and coverage');
            assert.equal(await results.locator('.pc-results-subtitle').evaluate(el=>getComputedStyle(el).whiteSpace),'normal','The history scope is readable without truncation');
            await page.locator('#project-card-30 .lc-section').screenshot({path:path.join(artifacts,'live-campaign-section-'+language+'-'+width+'.png')});
            await results.screenshot({path:path.join(artifacts,'live-results-'+language+'-'+width+'.png')});
            await page.locator('#project-card-30 .pc-state-unified').screenshot({path:path.join(artifacts, 'live-metrics-' + language + '-'+width+'.png')});
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
            assert.equal(await page.evaluate(()=>collectPipelineProjectsByPhase().live.length),1);
            assert.deepEqual(errors,[]);
            await page.evaluate(()=>toggleProjectCard(30));
            assert.equal(await page.locator('#project-card-30>.pc-dashboard-body').evaluate(el=>el.getBoundingClientRect().height),0,'Fully folded Live card cannot retain users/results height');
            assert.equal(await results.isVisible(),false);
            assert.equal(await page.locator('#project-card-30 .pc-results-collapsed').isVisible(),true,'Reuse Closed Test compact new-result badges');
            assert.equal(await page.locator('#project-card-30 .pc-team-collapsed-bar').isVisible(),true,'Reuse Closed Test compact activity tabs');
            await page.locator('#project-card-30').screenshot({path:path.join(artifacts,'live-folded-'+language+'-'+width+'.png')});
            await page.evaluate(()=>renderProjects(true));
            assert.equal(await page.locator('#project-card-30').evaluate(el=>el.classList.contains('card-collapsed')),true,'Fold survives render');
            await page.evaluate(()=>toggleProjectCard(30));
            assert.equal(await results.isVisible(),true);
            assert.equal(await page.evaluate(()=>localStorage.getItem('pc_participants_collapsed_30')),'0','Card folding preserves participant preferences');
            // Existing testing cards retain their original team label and section.
            await page.evaluate(()=>{myProjects[0].phase='testing';myProjects[0].status='active';renderProjects(true);});
            assert.equal(await page.locator('#pipeline-section-testing #project-card-30').count(),1);
            assert.equal(await page.locator('#project-card-30 .live-metrics').count(),0);
            assert.equal(await page.locator('#project-card-30 [data-live-campaigns]').count(),0);
            assert.equal(await page.locator('#project-card-30 .pc-results-card--live').count(),0);
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
