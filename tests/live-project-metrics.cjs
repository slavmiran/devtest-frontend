const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname,'..');
const artifacts = path.resolve(root,'../artifacts/live-metrics');
fs.mkdirSync(artifacts,{recursive:true});
const metrics = {source:'devtesthub_live',as_of:'2026-10-09T12:00:00Z',boundary_available:true,
    reviews:{total:68,rating:4.3,per_day:.5,trend_available:true,trend_percent:-1.2},
    installs:{total:332,per_day:3.5,trend_available:true,trend_percent:3},
    active_users:112,avg_retention_days:23,days_since_update:79,
    keywords:[{keyword:'taxi',installs:44},{keyword:'delivery',installs:14}]};

(async()=>{
    const browser = await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
    try {
        for (const lang of ['ru','en']) for(const width of [360,390,430]) {
            const page = await browser.newPage({viewport:{width,height:900}});
            const errors=[]; let gets=0,posts=0,mode='ready',pendingGet,hold=false,responseMetrics=metrics;
            page.on('pageerror',e=>errors.push(e.message));
            await page.route('http://fixture.local/**',async route=>{
                const url=new URL(route.request().url());
                if(url.pathname.includes('live-metrics')) {
                    gets++; assert.equal(url.searchParams.get('init_data'),'signed-fixture');
                    const data=responseMetrics;
                    if(hold) await new Promise(resolve=>pendingGet=resolve);
                    if(mode==='failure') return route.fulfill({status:503,json:{error:'live_metrics_unavailable'}});
                    return route.fulfill({json:{status:'success',metrics:data}});
                }
                if(url.pathname.includes('live-keywords')) {
                    posts++;const body=route.request().postDataJSON();
                    assert.deepEqual(Object.keys(body).sort(),['init_data','keyword']);
                    assert.equal(body.init_data,'signed-fixture');
                    if(mode==='limit') return route.fulfill({status:409,json:{error:'keyword_limit'}});
                    responseMetrics={...metrics,as_of:'2026-10-09T12:01:00Z',keywords:[{keyword:body.keyword,installs:0}]};
                    return route.fulfill({json:{status:'success',metrics:responseMetrics}});
                }
                return route.fulfill({contentType:'text/html',body:'<section id="tab-projects"><div class="card" style="margin:12px"><div class="pc-state-unified"><div class="live-metrics-slot" data-app-id="42"></div></div></div></section>'});
            });
            await page.goto('http://fixture.local/');
            for (const file of ['css/tokens.css','css/base.css','styles.css','css/project-card-dashboard.css','css/live-project-metrics.css']) await page.addStyleTag({path:path.join(root,file)});
            for (const file of ['ui/ui-helpers.js','js/live-project-metrics.js']) await page.addScriptTag({path:path.join(root,file)});
            await page.evaluate(({lang,metrics})=>{
                window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-fixture';
                window.myProjects=[{id:42,phase:'live',checkins_count:9999,play_store_raw:{score:5,ratings:999999},live_metrics:metrics}];
                window.archivedProjects=[];
                window.paint=()=>document.querySelector('.live-metrics-slot').innerHTML=LiveProjectMetrics.render(myProjects[0]);
                paint();LiveProjectMetrics.mount(document.querySelector('.card'),myProjects[0]);
                window.graphEvents=[];addEventListener('live-metrics:details',e=>graphEvents.push(e.detail));
            },{lang,metrics});
            const assertNoOverflow=async()=>{
                assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
                assert.equal(await page.locator('.live-metrics').evaluate(n=>n.scrollWidth<=n.clientWidth),true);
            };
            await assertNoOverflow(); assert.equal(gets,0);
            assert.match(await page.locator('.live-metric-row').nth(0).innerText(),/68/);
            assert.match(await page.locator('.live-metric-row').nth(1).innerText(),/332/);
            assert.equal(await page.locator('.live-metric-trend.is-down').count(),1);
            assert.equal(await page.locator('.live-metric-trend.is-up').count(),1);
            assert.equal(await page.locator('.live-health-badge.is-excellent').count(),2); // badge + legend
            assert.equal(await page.locator('.live-health-freshness.is-stale').count(),1);
            await page.locator('.live-metrics-legend summary').click();
            await assertNoOverflow();
            assert.equal(await page.locator('.live-metrics-legend-body').isVisible(),true);
            const legend=await page.locator('.live-metrics-legend-body').boundingBox(),surface=await page.locator('.pc-state-unified').boundingBox();
            assert.ok(legend.y+legend.height<=surface.y+surface.height,'Legend must stay visible inside the surface');
            await page.locator('.live-metrics-legend summary').click();
            await page.locator('.live-metrics-more').click();
            assert.deepEqual(await page.evaluate(()=>graphEvents),[{appId:42}]);
            await page.locator('.pc-state-unified').screenshot({path:path.join(artifacts,`metrics-${lang}-${width}.png`)});
            // Exact threshold colors; missing values must remain neutral.
            for(const [days,band] of [[6.9,'risk'],[7,'basic'],[13.9,'basic'],[14,'good'],[20.9,'good'],[21,'excellent'],[30.9,'excellent'],[31,'superb']]) {
                await page.evaluate(days=>{myProjects[0].live_metrics={...myProjects[0].live_metrics,avg_retention_days:days};paint();},days);
                assert.equal(await page.locator('.live-metrics-health > .live-health-badge').nth(0).getAttribute('class'),`live-health-badge is-${band}`);
            }
            for(const [days,band] of [[30,'fresh'],[31,'aging'],[60,'aging'],[61,'stale']]) {
                await page.evaluate(days=>{myProjects[0].live_metrics={...myProjects[0].live_metrics,days_since_update:days};paint();},days);
                assert.match(await page.locator('.live-health-freshness').getAttribute('class'),new RegExp('is-'+band+'$'));
            }
            // Large values and many long keywords can scroll only the keyword rail.
            await page.evaluate(()=>{
                myProjects[0].live_metrics={...myProjects[0].live_metrics,installs:{...myProjects[0].live_metrics.installs,total:999999999,per_day:9999999,trend_percent:12345678},
                    reviews:{...myProjects[0].live_metrics.reviews,total:999999999},active_users:999999999,
                    keywords:Array.from({length:20},(_,i)=>({keyword:'Very long ASO keyword '.repeat(3)+i,installs:99999}))};paint();
            });
            await assertNoOverflow();
            assert.equal(await page.locator('.live-keywords').evaluate(n=>n.scrollWidth>n.clientWidth),true);
            // Unknown internal values must not fall back to Google Play or test checkins.
            responseMetrics={...metrics,reviews:{total:0,rating:null,per_day:0,trend_available:false,trend_percent:100},installs:{total:0,per_day:0,trend_available:false},avg_retention_days:null,days_since_update:null,active_users:0,keywords:[]};
            await page.evaluate(()=>{myProjects[0].live_metrics=null;LiveProjectMetrics.reload(42);});
            await page.waitForFunction(()=>document.querySelectorAll('.live-metric-trend.is-neutral').length===2);
            assert.match(await page.locator('.live-metric-row').first().innerText(),/—.*★/);
            assert.doesNotMatch(await page.locator('.live-metrics').innerText(),/9999/);
            assert.equal(await page.locator('.live-metrics-health .is-unknown').count(),2);
            // Existing GET cannot overwrite a successful keyword save.
            pendingGet=null;hold=true;
            await page.evaluate(()=>LiveProjectMetrics.reload(42));
            while(!pendingGet) await new Promise(resolve=>setTimeout(resolve,10));
            await page.locator('.live-keyword-add').click();
            await page.locator('#live-keyword-input').fill('  <img src=x>   taxi  ');
            await page.locator('#live-keyword-dialog [type="submit"]').click();
            await page.waitForFunction(()=>!document.querySelector('#live-keyword-dialog'));
            hold=false;pendingGet();
            await page.waitForTimeout(100);
            assert.match(await page.locator('.live-keyword-name').innerText(),/<img src=x> taxi/);
            assert.equal(await page.locator('.live-keyword-chip img').count(),0);
            assert.equal(posts,1);
            // Keyword limit error leaves the editor usable.
            mode='limit';await page.locator('.live-keyword-add').click();
            await page.locator('#live-keyword-input').fill('extra');
            await page.locator('#live-keyword-dialog [type="submit"]').click();
            await page.waitForFunction(()=>!document.querySelector('#live-keyword-dialog p').hidden);
            assert.match(await page.locator('#live-keyword-dialog p').innerText(),/20/);
            assert.equal(await page.locator('#live-keyword-dialog [type="submit"]').isDisabled(),false);
            await page.keyboard.press('Escape');
            // Refreshing the Play passport immediately refreshes freshness.
            mode='ready';responseMetrics={...responseMetrics,as_of:'2026-10-09T12:02:00Z',days_since_update:0};
            const before=gets;
            await page.evaluate(()=>dispatchEvent(new CustomEvent('play-store:synced',{detail:{appId:42}})));
            await page.waitForFunction(()=>document.querySelector('.live-health-freshness').classList.contains('is-fresh'));
            assert.equal(gets,before+1);
            // Unavailability is explicit and never replaces an old snapshot with zeros.
            mode='failure';await page.evaluate(()=>LiveProjectMetrics.reload(42));
            await page.waitForFunction(()=>!!document.querySelector('.live-metrics-status button'));
            assert.match(await page.locator('.live-keyword-name').innerText(),/taxi/);
            mode='ready';await page.locator('.live-metrics-status button').click();
            await page.waitForFunction(()=>!document.querySelector('.live-metrics-status button'));
            await assertNoOverflow();assert.deepEqual(errors,[]);await page.close();
        }
        console.log('Live metrics passed: RU/EN 360/390/430, isolation, threshold bands, legend, large values, keywords, GET/POST race, errors and Play refresh.');
    } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
