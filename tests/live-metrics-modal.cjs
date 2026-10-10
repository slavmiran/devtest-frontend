const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-analytics');
fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/live-analytics.json'),'utf8'));
const clone=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome'});
 try {
  for(const lang of ['ru','en'])for(const width of [360,390,430]){
   const page=await browser.newPage({viewport:{width,height:844}});
   let data=clone(base),mode='ok',gets=0,hold=false,pending;const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('http://fixture.local/**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('/live-metrics/analytics')){
     assert.equal(route.request().method(),'GET');assert.equal(url.searchParams.get('init_data'),'signed-fixture');gets++;
     const payload=clone(data),failure=mode==='error',forbidden=mode==='forbidden';if(hold)await new Promise(r=>pending=r);
     try{await route.fulfill(forbidden?{status:403,json:{error:'not_owner'}}:failure?{status:503,json:{error:'live_metrics_unavailable'}}:{json:{status:'success',analytics:payload}});}catch(_){/* request aborted on close */}
     return;
    }
    await route.fulfill({contentType:'text/html',body:'<button id="opener">Metrics</button>'});
   });
   await page.goto('http://fixture.local/');
   for(const file of ['css/tokens.css','css/base.css','styles.css','css/live-metrics-modal.css'])await page.addStyleTag({path:path.join(root,file)});
   for(const file of ['ui/ui-helpers.js','js/live-project-metrics.js','js/live-metrics-modal.js','js/app-navigation.js'])await page.addScriptTag({path:path.join(root,file)});
   await page.evaluate(lang=>{window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-fixture';window.myProjects=[{id:42,name:'Orbit Notes <img src=x>'},{id:43,name:'Second app'}];window.archivedProjects=[];document.getElementById('opener').onclick=e=>LiveProjectMetrics.details(42,e);},lang);
   await page.click('#opener');await page.waitForFunction(()=>document.querySelector('.la-score-ring strong')?.textContent==='82');
   const assertWidth=async()=>{
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await page.locator('.live-analytics-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth),true);
    const box=await page.locator('.live-analytics-page').boundingBox();assert.equal(box.width,width);assert.equal(box.height,844);
    for(const el of await page.locator('.la-track').all()){
     const all=await el.boundingBox(),negative=await el.locator('.la-negative').boundingBox();assert.ok(Math.abs(negative.width/all.width-.3)<.005);
    }
   };
   await assertWidth();assert.equal(await page.locator('.la-chart-row').count(),4);
   assert.equal(await page.locator('.la-over').count(),1);
   assert.equal(await page.locator('.la-check.is-unknown').count(),2);
   assert.equal(await page.locator('.la-topbar img').count(),0);
   assert.match(await page.locator('.la-cohorts').innerText(),/85/);
   await page.evaluate(()=>document.querySelector('.la-topbar > div > span').textContent='Orbit Notes'); // Clean presentation after verifying escaping.
   await page.screenshot({path:path.join(out,`analytics-${lang}-${width}.png`)});
   await page.locator('#la-method summary').click();assert.equal(await page.locator('#la-method li').count(),5);
   await page.locator('[data-series="reviews"]').click();assert.equal(await page.locator('[data-series="reviews"]').getAttribute('aria-pressed'),'true');
   await page.locator('#la-method summary').click();
   // Example is explicitly labeled and cannot fetch/write or replace actual cache.
   const before=gets;await page.locator('#la-demo').click();assert.equal(await page.locator('#la-demo-note').isVisible(),true);assert.equal(gets,before);
   assert.equal(await page.locator('.la-score-ring strong').innerText(),'82');
   await page.locator('#la-actual').click();assert.equal(await page.locator('#la-demo-note').isVisible(),false);
   // Inclusive source threshold, negative momentum, capped over-duration, stale build.
   data=clone(base);data.install_velocity.dominant_source_warning=true;data.install_velocity.sources_breakdown={key_percent:80,link_percent:10,browser_percent:10,unknown_percent:0};
   data.install_velocity.trend_wma_percent=-100;data.retention.avg_days=90;data.retention.d30_target_percent=300;data.retention.toxic_dropoffs_d1_d3=3;
   data.update_freshness={days_since_update:90,status:'stale',lifecycle_percent:-100};data.risk_triggers[0].status='warning';data.risk_triggers[1].status='warning';
   await page.locator('#la-refresh').click();await page.waitForFunction(()=>!!document.querySelector('.la-source-stack.is-warning'));
   assert.equal(await page.locator('.la-check.is-risk').count(),2);await assertWidth();
   assert.equal(await page.locator('.la-chart-row').nth(1).locator('.la-positive .la-fill').getAttribute('style'),'width:100%');
   assert.equal(await page.locator('.la-chart-row').nth(3).locator('.la-negative > span').getAttribute('style'),'width:100%');
   await page.evaluate(()=>document.querySelector('.live-analytics-scroll').scrollTop=0);
   await page.screenshot({path:path.join(out,`analytics-risk-${lang}-${width}.png`)});
   for(const [days,signal] of [[31,96.7],[60,0]]){
    data.update_freshness={days_since_update:days,status:'aging',lifecycle_percent:signal};
    await page.locator('#la-refresh').click();await page.waitForFunction(()=>!!document.querySelector('.la-chart-row:last-child .la-badge.is-watch'));
    await assertWidth();
   }
   // No activity, no attributed sources, no score or green security claims.
   data=clone(base);data.health_score=null;data.health_status='insufficient_data';data.coverage_percent=0;data.data_status='no_activity';
   data.install_velocity={total:0,per_day:0,trend_wma_percent:0,trend_available:false,sources_breakdown:{key_percent:null,link_percent:null,browser_percent:null,unknown_percent:null},source_sample_ready:false};
   data.retention={avg_days:null,d30_target_percent:null,early_uninstalls_count:0,toxic_dropoffs_d1_d3:0,d7:{percent:null,eligible:0},d30:{percent:null,eligible:0}};
   data.reviews_health={target_baseline_count:null,actual_reviews_count:0,baseline_ratio_percent:null,velocity_trend_percent:0,trend_available:false};
   data.update_freshness={days_since_update:null,status:'unknown',lifecycle_percent:null};data.risk_triggers.forEach(c=>c.status='unknown');
   data.components.forEach(c=>{c.points=null;c.available=false;});
   await page.locator('#la-refresh').click();await page.waitForFunction(()=>document.querySelector('.la-score-ring strong').textContent==='—');
   assert.equal(await page.locator('.la-check.is-good').count(),0);assert.equal(await page.locator('.la-empty h2').count(),1);await assertWidth();
   await page.screenshot({path:path.join(out,`analytics-empty-${lang}-${width}.png`)});
   // Error preserves the last real snapshot; explicit refresh recovers.
   mode='error';await page.locator('#la-refresh').click();await page.waitForFunction(()=>!document.getElementById('la-error').hidden);
   assert.equal(await page.locator('.la-score-ring strong').innerText(),'—');
   mode='ok';data=clone(base);await page.locator('#la-refresh').click();await page.waitForFunction(()=>document.querySelector('.la-score-ring strong').textContent==='82');
   await page.evaluate(()=>handleAppBack());assert.equal(await page.locator('#live-analytics-modal').count(),0);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'opener');
   // Instant cached reopen while the API is held, then a different project.
   hold=true;pending=null;await page.click('#opener');assert.equal(await page.locator('.la-score-ring strong').innerText(),'82');
   while(!pending)await new Promise(r=>setTimeout(r,10));const releaseOld=pending;
   hold=false;data=clone(base);data.health_score=60;data.health_status='watch';await page.evaluate(()=>LiveMetricsAnalytics.open(43));releaseOld();
   await page.waitForFunction(()=>document.querySelector('.la-score-ring strong')?.textContent==='60');assert.equal(await page.locator('.la-score-ring.is-watch').count(),1);
   mode='forbidden';await page.locator('#la-refresh').click();await page.waitForFunction(()=>!document.getElementById('la-error').hidden);
   assert.equal(await page.locator('.la-score-ring').count(),0); // Access loss clears the private cache.
   // Keyboard trap and Escape close.
   await page.locator('#la-back').focus();await page.keyboard.press('Shift+Tab');assert.notEqual(await page.evaluate(()=>document.activeElement.id),'opener');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#live-analytics-modal').count(),0);assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('Analytics passed: RU/EN 360/390/430, 30:70 axes, over-duration, negative trends, sources, unknown checks, demo separation, cache/errors, focus and Back.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
