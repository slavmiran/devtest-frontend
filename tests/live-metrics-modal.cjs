const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,process.env.LIVE_TEST_ARTIFACTS || '../artifacts/live-metrics-cleanup');
fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/live-analytics.json'),'utf8'));
base.storefront={country:'TH',countries:{TH:{score:4.7,ratings:238,ratings_delta:4,installs:500,next_installs:1000,state:'stale'},
    GB:{score:4.3,ratings:12345678901,installs:500000000,next_installs:1000000000,state:'fresh'}}};
base.project_feedback={total:68,rated:61,criteria:[4.6,4.0,4.3],rating:4.3,detailed_text_count:26,scenarios_completed:18,
    distribution:{countries:[{code:'GB',installed:330,responded:23,rating:4.5},{code:'unknown',installed:2,responded:1}],
        devices:[{code:'phone',installed:332,responded:24}]}};
base.engagement={available:true,discipline_percent:87,hours_since_last_report:6,active_testers:12};
base.market={thermal:{T_t:85,K_thermal:.912,L_floor:2,U_opt:5},
    thermal_week:base.daily.slice(-7).map((row,i)=>({day:row.day,C_t:i===6?7:2+i%3,L_floor:2,U_opt:5}))};
base.action_summary.signals=base.action_summary.signals.filter(signal=>signal.code==='REVIEW_TREND_DOWN');
const clone=x=>JSON.parse(JSON.stringify(x));

(async()=>{
    const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
    try {
        for(const lang of ['ru','en'])for(const width of [360,390,430]){
            const height=width===360?640:width===390?700:844;
            const page=await browser.newPage({viewport:{width,height}});
            let data=clone(base),mode='ok',gets=0;const errors=[];
            page.on('pageerror',e=>errors.push(e.message));
            await page.route('http://fixture.local/**',route=>{
                const url=new URL(route.request().url());
                if(url.pathname.includes('/live-metrics/analytics')){
                    assert.equal(route.request().method(),'GET');
                    assert.equal(url.searchParams.get('init_data'),'signed-fixture');
                    gets++;
                    return route.fulfill(mode==='forbidden'?{status:403,json:{error:'not_owner'}}:
                        mode==='error'?{status:503,json:{error:'unavailable'}}:{json:{status:'success',analytics:data}});
                }
                return route.fulfill({contentType:'text/html',body:'<button id="opener">Metrics</button>'});
            });
            await page.goto('http://fixture.local/');
            for(const file of ['css/tokens.css','css/base.css','styles.css','css/project-parameters.css','css/live-campaign-pace.css','css/live-project-metrics.css','css/live-market.css','css/live-metrics-modal.css'])
                await page.addStyleTag({path:path.join(root,file)});
            for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaign-pace.js','i18n/live-guidance.js','i18n/core.js','ui/ui-helpers.js','js/live-market-ui.js','js/live-guidance-routing.js','js/live-guidance.js','js/live-radar-layers.js','js/live-project-metrics.js','js/live-metrics-modal.js','js/live-campaign-learning.js','js/app-navigation.js'])
                await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(lang=>{
                window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-fixture';
                window.myProjects=[{id:42,phase:'live',name:'Orbit Notes <img src=x>'}];window.archivedProjects=[];
                window.switchTab=()=>{};window.ProjectFeedback={openSettings:id=>{window.openedFeedbackSettings=id;}};
                document.getElementById('opener').onclick=e=>LiveProjectMetrics.details(42,e);
            },lang);
            await page.click('#opener');
            const pulse=page.locator('.live-analytics-page'),review=pulse.locator('#la-feedback');
            const refresh=async()=>{
                await pulse.locator('#la-refresh').click();
                await pulse.locator('#la-refresh').evaluate(el=>new Promise(resolve=>{
                    if(!el.disabled)return resolve();
                    const observer=new MutationObserver(()=>{if(!el.disabled){observer.disconnect();resolve();}});
                    observer.observe(el,{attributes:true,attributeFilter:['disabled']});
                }));
            };
            const clean=async()=>{
                assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
                assert.equal(await pulse.locator('.live-analytics-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth),true);
                assert.doesNotMatch(await pulse.innerText(),/^\s*—\s*$|\bWMA\b|\bOVER\b|L_floor|U_opt|P_3d|Привижионал/m);
                assert.equal(await pulse.locator('#la-tree-view,#la-detailed-view,.la-track').count(),0);
            };
            await pulse.locator('.la-score-ring strong').waitFor();
            assert.equal(await pulse.locator('.la-score-ring strong').innerText(),'95');
            assert.equal(await pulse.locator('.la-metric').count(),6); // Five indicators and the separate pace chart.
            assert.equal(await pulse.locator('.la-topbar img').count(),0);
            assert.ok(await pulse.locator('.la-actions + [data-metric="installs"]').count());
            assert.match(await pulse.locator('.la-cohorts').innerText(),/90%/);
            assert.equal(await pulse.locator('[data-metric="retention"] progress').getAttribute('value'),'100');
            assert.equal(await review.locator('.lrdr-criterion').count(),3);
            assert.match(await review.locator('.lrdr-private header').innerText(),/4[,.]3 ★/);
            assert.equal(await review.locator('#la-geo').getAttribute('open'),null);
            assert.match(await review.locator('.lrdr-public').innerText(),lang==='ru'?/Снимок устарел/:/Outdated snapshot/);
            assert.equal(await pulse.locator('.la-week-chart circle').count(),7);
            assert.match(await pulse.locator('[data-metric="rhythm"]').innerText(),/×0[,.]912/);
            await clean();
            await page.evaluate(()=>{document.querySelector('.la-topbar span').textContent='Orbit Notes';document.activeElement.blur();});
            await page.screenshot({path:path.join(out,'pulse-'+lang+'-'+width+'.png')});
            await review.scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(out,'pulse-feedback-'+lang+'-'+width+'.png')});
            await pulse.locator('[data-metric="rhythm"]').scrollIntoViewIfNeeded();
            await page.screenshot({path:path.join(out,'pulse-rhythm-'+lang+'-'+width+'.png')});

            await review.locator('#la-geo summary').click();
            const before=gets;
            await review.locator('select').selectOption('GB');
            assert.equal(gets,before);
            assert.equal(await review.locator('#la-geo').getAttribute('open'),'');
            assert.equal(await review.locator('.lrdr-distribution-list li').count(),3);
            await clean();
            await pulse.locator('[data-lm-learn]').click();
            const guide=page.locator('#live-campaign-learning');
            assert.equal(await guide.locator('.lcp-learning-topics > section').count(),5);
            assert.equal(await guide.locator('a[href^="https://"]').count(),3);
            assert.doesNotMatch(await guide.innerText(),/lcpEvidence|lcpGooglePolicy|pulseLearn/);
            assert.equal(await guide.locator('.lcp-learning-topics').evaluate(n=>n.scrollWidth<=n.clientWidth),true);
            await page.screenshot({path:path.join(out,'guide-'+lang+'-'+width+'.png')});
            await page.evaluate(()=>handleAppBack());
            assert.equal(await guide.count(),0);
            assert.equal(await pulse.locator('[data-lm-learn]').evaluate(el=>el===document.activeElement),true);

            data=clone(base);data.health_score=60;data.calibration_status='early';data.action_summary.signals=[];
            data.install_velocity.sources_breakdown={key_percent:0,browser_percent:20,link_percent:78,unknown_percent:2};
            data.retention.d30={percent:null,eligible:0};data.update_freshness.days_since_update=60;
            await refresh();
            assert.equal(await pulse.locator('.la-score-ring strong').innerText(),'60');
            assert.equal(await pulse.locator('.la-score-ring.is-watch').count(),1);
            assert.equal(await pulse.locator('.la-calibration').count(),1);
            assert.equal(await pulse.locator('.la-actions').count(),0);
            assert.equal(await pulse.locator('.la-cohorts .la-readings > div').count(),4);
            assert.match(await pulse.locator('.la-cohorts').innerText(),lang==='ru'?/Рано считать/:/Too early/);
            assert.equal(await pulse.locator('.la-release-scale .is-aging[aria-current]').count(),1);
            await clean();
            await pulse.locator('.live-analytics-scroll').evaluate(el=>el.scrollTop=0);
            await page.screenshot({path:path.join(out,'pulse-early-'+lang+'-'+width+'.png')});

            data=clone(base);data.health_score=null;data.data_status='no_activity';data.action_summary.signals=[];
            data.install_velocity={total:0,per_day:0,trend_available:false};
            data.retention={avg_days:null};data.reviews_health={actual_reviews_count:0};
            data.project_feedback={total:0,rating:null,criteria:[null,null,null]};data.storefront=null;
            data.engagement={discipline_percent:null,active_testers:0};data.update_freshness={days_since_update:null};
            await refresh();
            assert.equal(await pulse.locator('.la-score-ring').count(),0);
            assert.equal(await pulse.locator('.la-source-stack').count(),0);
            assert.equal(await pulse.locator('progress').count(),0);
            assert.equal(await review.locator('.lrdr-criterion,#la-geo').count(),0);
            assert.equal(await pulse.locator('.la-week-chart').count(),0);
            await clean();
            await pulse.locator('.live-analytics-scroll').evaluate(el=>el.scrollTop=0);
            await page.screenshot({path:path.join(out,'pulse-empty-'+lang+'-'+width+'.png')});

            mode='error';await refresh();assert.equal(await pulse.locator('#la-error').isVisible(),true);
            assert.equal(await pulse.locator('.la-metric').count(),6);
            mode='ok';data=clone(base);await refresh();assert.equal(await pulse.locator('.la-score-ring strong').innerText(),'95');
            mode='forbidden';await refresh();assert.equal(await pulse.locator('.la-metric').count(),0);
            await page.keyboard.press('Escape');assert.equal(await pulse.count(),0);
            assert.equal(await page.evaluate(()=>document.activeElement.id),'opener');
            assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
            mode='ok';await page.click('#opener');
            await pulse.locator('[data-signal="REVIEW_TREND_DOWN"] [data-live-action="reviews"]').click();
            assert.equal(await page.evaluate(()=>window.openedFeedbackSettings),42);
            assert.equal(await pulse.count(),0);
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Pulse passed (RU/EN 360/390/430): five indicators, pace chart, empty/calibration/mature states, regions, guide, actions, access and Back.');
    }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
