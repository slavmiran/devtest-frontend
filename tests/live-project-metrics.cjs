const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const artifacts = path.resolve(root,process.env.LIVE_TEST_ARTIFACTS || '../artifacts/live-metrics-cleanup');
fs.mkdirSync(artifacts,{recursive:true});

const metrics = {source:'devtesthub_live',as_of:'2026-10-09T12:00:00Z',boundary_available:true,health_score:88,
    reviews:{total:68,rating:4.3,criteria:[4.6,4.0,4.3],per_day:.5,trend_available:true,trend_percent:-1.2},
    installs:{total:332,per_day:3.5,trend_available:true,trend_percent:3},
    engagement:{available:true,score:85,discipline_percent:84,active_testers:12,hours_since_last_report:6},
    active_users:12,avg_retention_days:23,days_since_update:79,early_exit_impact:{points_lost:17},
    storefront:{country:'TH',countries:{TH:{score:4.7,ratings:238,ratings_delta:4,installs:500,next_installs:1000,state:'stale'},
        GB:{score:null,ratings:12345678901,installs:500000000,next_installs:1000000000,state:'fresh'}}},
    keywords:[{keyword:'Legacy only',installs:44}]};

(async()=>{
    const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
    try {
        for (const lang of ['ru','en']) for (const width of [360,390,430]) {
            const page = await browser.newPage({viewport:{width,height:800}});
            const errors=[]; let gets=0,responseMetrics=metrics,failed=false;
            page.on('pageerror',e=>errors.push(e.message));
            await page.route('http://fixture.local/**',route=>{
                const url=new URL(route.request().url());
                if (url.pathname.endsWith('/live-metrics')) {
                    gets++; assert.equal(url.searchParams.get('init_data'),'signed-fixture');
                    return route.fulfill(failed ? {status:503,json:{error:'unavailable'}} : {json:{status:'success',metrics:responseMetrics}});
                }
                assert.ok(!url.pathname.includes('/live-keywords'),'The card must never mutate keywords');
                return route.fulfill({contentType:'text/html',body:'<section id="tab-projects"><div class="card" style="margin:12px"><div class="pc-state-unified"><div class="live-metrics-slot" data-app-id="42"></div></div></div></section>'});
            });
            await page.goto('http://fixture.local/');
            for (const file of ['css/tokens.css','css/base.css','styles.css','css/project-card-dashboard.css','css/project-parameters.css','css/live-campaign-pace.css','css/live-project-metrics.css'])
                await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaign-pace.js','i18n/live-guidance.js','i18n/core.js','ui/ui-helpers.js','js/live-market-ui.js','js/live-radar-layers.js','js/live-project-metrics.js','js/live-campaign-learning.js'])
                await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(({lang,metrics})=>{
                window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-fixture';
                window.myProjects=[{id:42,phase:'live',checkins_count:9999,live_metrics:metrics,
                    live_market_score:{rank:17,tier:3,market_score:567,rank_delta:2},
                    live_tier_event:{id:9,from_tier:4,to_tier:3,score:567},
                    live_campaign_rows:[{keywords:[{keyword:'taxi',installs:44},{keyword:'delivery',installs:0}]},
                        {keywords:[{keyword:'Taxi',installs:2}]},{status:'archived',keywords:[{keyword:'hidden',installs:9}]}]}];
                window.archivedProjects=[];
                window.paint=()=>document.querySelector('.live-metrics-slot').innerHTML=LiveProjectMetrics.render(myProjects[0]);
                paint();LiveProjectMetrics.mount(document.querySelector('.card'),myProjects[0]);
                window.graphEvents=[];addEventListener('live-metrics:details',e=>graphEvents.push(e.detail));
            },{lang,metrics});
            const card=page.locator('.live-metrics');
            const assertClean=async()=>{
                assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
                assert.equal(await card.evaluate(n=>n.scrollWidth<=n.clientWidth),true);
                assert.doesNotMatch(await card.innerText(),/^\s*—\s*$|Снимок устарел|outdated snapshot|stale snapshot|snapshot is stale|Legacy only|9999/im);
                assert.equal(await card.locator('.live-keyword-add').count(),0);
                const rows=await card.locator('.live-metric-row').all();
                assert.equal((await rows[0].boundingBox()).height,(await rows[1].boundingBox()).height);
            };
            await assertClean(); assert.equal(gets,0);
            assert.match(await card.locator('.lm-result-tile').first().innerText(),/#17.*Tier 3[\s\S]*567[\s\S]*\+2/);
            assert.match(await card.locator('.lm-result-tile').last().innerText(),/88 \/ 100/);
            assert.equal(await card.locator('.lm-result-events [data-lr-tier-ack],.lm-result-events .lm-early-chip').count(),2);
            await card.locator('.lm-early-chip').click();assert.equal(await card.locator('.lm-early-body').isVisible(),true);
            await card.locator('[data-lm-early-close]').click();
            assert.match(await card.locator('.lrdr-store-chip').first().innerText(),/Google Play \(TH\)[\s\S]*\+4/);
            assert.equal(await card.locator('.lrdr-mini span').count(),3);
            assert.deepEqual(await card.locator('.live-keyword-installs').allTextContents(),['46','0']);
            assert.equal(await card.locator('.live-metrics-more').count(),0);
            await card.locator('[data-lm-health]').click();
            assert.deepEqual(await page.evaluate(()=>graphEvents),[{appId:42}]);
            await page.evaluate(()=>document.activeElement.blur());
            await card.screenshot({path:path.join(artifacts,'metrics-'+lang+'-'+width+'.png')});
            await card.locator('.lm-guide-link').click();
            await page.locator('#lcp-topic-rank').waitFor();
            await page.keyboard.press('Escape');
            assert.equal(await card.locator('.lm-guide-link').evaluate(el=>el===document.activeElement),true);
            await card.locator('.live-health-freshness').click();
            assert.ok(await page.locator('#lcp-topic-release').isVisible());
            await page.keyboard.press('Escape');
            await page.evaluate(()=>LiveRadarLayers.setCountry(42,'GB'));
            assert.match(await card.locator('.lrdr-store-chip').first().innerText(),/Google Play \(GB\)/);
            await assertClean();
            await page.evaluate(()=>LiveRadarLayers.setCountry(42,'TH'));
            for (const [days,band] of [[0,'fresh'],[30,'fresh'],[31,'aging'],[60,'aging'],[61,'stale']]) {
                await page.evaluate(days=>{myProjects[0].live_metrics={...myProjects[0].live_metrics,days_since_update:days};paint();},days);
                assert.match(await card.locator('.live-health-freshness').getAttribute('class'),new RegExp('is-'+band+'$'));
                assert.match(await card.locator('.live-health-freshness strong').innerText(),new RegExp(days+ (lang==='ru'?' дн. назад':'d ago')));
                await assertClean();
            }
            // A campaign edit repaints the rail from the owner campaign list, and legacy ASO entries stay hidden.
            await page.evaluate(()=>{
                myProjects[0].live_campaign_rows=[{keywords:Array.from({length:20},(_,i)=>({keyword:'Long search phrase '.repeat(4)+i,installs:1000000}))}];
                LiveProjectMetrics.repaint(42);
            });
            assert.equal(await card.locator('.live-keywords').evaluate(el=>el.scrollWidth>el.clientWidth),true);
            await assertClean();
            await page.evaluate(()=>{
                myProjects[0].live_campaign_rows=[];myProjects[0].live_market_score.rank_delta=0;
                LiveProjectMetrics.repaint(42);
            });
            assert.equal(await card.locator('.live-metrics-aso').count(),0);
            assert.equal(await card.locator('.lm-result-link').count(),2);

            responseMetrics={...metrics,as_of:'2026-10-09T12:01:00Z',health_score:null,reviews:{total:0,rating:null,per_day:0,criteria:[null,null,null]},
                installs:{total:0,per_day:0},avg_retention_days:null,days_since_update:null,storefront:null,
                engagement:{available:false,active_testers:0,discipline_percent:null}};
            await page.evaluate(()=>LiveProjectMetrics.reload(42));
            await card.getByText(lang==='ru'?'Нет оценок в Хабе':'No Hub ratings yet',{exact:true}).waitFor();
            assert.equal(await card.locator('.live-metric-card-speed-val').first().innerText(),'0');
            assert.equal(await card.locator('.live-metric-trend').count(),0);
            assert.equal(await card.locator('.lrdr-mini').count(),0);
            await assertClean();
            await card.screenshot({path:path.join(artifacts,'metrics-empty-'+lang+'-'+width+'.png')});

            failed=true;await page.evaluate(()=>LiveProjectMetrics.reload(42));await card.locator('.live-metrics-status button').waitFor();
            failed=false;responseMetrics={...metrics,as_of:'2026-10-09T12:02:00Z',health_score:60};
            await card.locator('.live-metrics-status button').click();
            await card.locator('.lm-score-status.is-watch').waitFor();
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Live metrics passed (RU/EN 360/390/430): layout, guide links, freshness, campaigns, empty state and recovery.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
