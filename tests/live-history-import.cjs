const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-history');fs.mkdirSync(out,{recursive:true});
const base=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/live-analytics.json'),'utf8'));
const dictionary={window:{I18NRU:{},I18NEN:{}}};vm.runInNewContext(fs.readFileSync(path.join(root,'i18n/live-history.js'),'utf8'),dictionary);
assert.deepEqual(Object.keys(dictionary.window.I18NRU).sort(),Object.keys(dictionary.window.I18NEN).sort());
for(const [key,value] of Object.entries(dictionary.window.I18NRU))assert.deepEqual((value.match(/\{\w+\}/g)||[]).sort(),(dictionary.window.I18NEN[key].match(/\{\w+\}/g)||[]).sort(),key);
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const lang of ['ru','en'])for(const width of [360,390]){
  const page=await browser.newPage({viewport:{width,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let imported=null,posts=0,gets=0,commits=0,mode='ok';
  let options=[{from_run_number:2,run_numbers:[2,3,4],runs_count:3,installs:20,reviews:4,avg_retention_days:22,observed_only_count:2,date_only_count:3,unrated_reviews:4,excluded_sessions:1,preview_token:'a'.repeat(32)},
   {from_run_number:3,run_numbers:[3,4],runs_count:2,installs:12,reviews:2,avg_retention_days:28,observed_only_count:1,date_only_count:2,unrated_reviews:2,excluded_sessions:1,preview_token:'b'.repeat(32)}];
  const history=()=>({available:!imported,imported,options:imported?[]:options});
  const metrics=()=>({source:'devtesthub_live',as_of:new Date().toISOString(),boundary_available:true,history_import:history(),reviews:{total:imported?imported.reviews:0,rating:null,per_day:0},installs:{total:imported?imported.installs:0,per_day:0,per_day_28d:.5,baseline:{available:true,days:28,per_day:.5}},active_users:0,avg_retention_days:imported?28:null,keywords:[]});
  await page.route('http://fixture.local/**',async route=>{const url=new URL(route.request().url());
   if(url.pathname.endsWith('/live-history-import')){
    if(route.request().method()==='GET'){gets++;assert.equal(url.searchParams.get('init_data'),'signed');return route.fulfill({json:{status:'success',history:history()}});}
    posts++;const body=route.request().postDataJSON();assert.equal(body.from_run_number,3);assert.equal(body.init_data,'signed');assert.equal(Object.hasOwn(body,'installs'),false);
    if(mode==='changed'){options[1]={...options[1],installs:13,preview_token:'c'.repeat(32)};mode='ok';return route.fulfill({status:409,json:{error:'history_preview_changed'}});}
    assert.equal(body.preview_token,'c'.repeat(32));
    if(!imported){commits++;imported={...options[1],imported_at:'2026-10-19T10:00:00Z',live_activated_at:base.live_activated_at};}
    if(mode==='lost'){mode='ok';return route.fulfill({status:503,json:{error:'lost_response'}});}
    return route.fulfill({json:{status:'success',history:{...history(),replayed:posts>2}}});
   }
   if(url.pathname.endsWith('/live-metrics/analytics')){const data=structuredClone(base);data.history_import=history();data.install_velocity.baseline={available:true,days:28,per_day:.5};data.install_velocity.per_day=0;data.install_velocity.per_day_28d=.5;data.install_velocity.sources_breakdown={link_percent:100,key_percent:0,browser_percent:0,unknown_percent:0};data.install_velocity.dominant_source_warning=true;data.action_summary={status:'attention',signals:[{code:'SOURCE_IMBALANCE',channel:'link',percent:100}]};return route.fulfill({json:{analytics:data}});}
   if(url.pathname.endsWith('/live-metrics'))return route.fulfill({json:{metrics:metrics()}});
   return route.fulfill({contentType:'text/html',body:'<main><div class="live-metrics-slot" data-app-id="42"></div></main>'});
  });
  await page.goto('http://fixture.local/');
  for(const file of ['css/tokens.css','css/base.css','styles.css','css/live-project-metrics.css','css/live-metrics-modal.css','css/live-history-import.css'])await page.addStyleTag({path:path.join(root,file)});
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-history.js','i18n/core.js','ui/ui-helpers.js','js/live-history-import.js','js/live-project-metrics.js','js/live-metrics-modal.js','js/app-navigation.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(({lang,metrics})=>{window.lang=lang;window.API_BASE='/api';window.userId=100;window.getTelegramInitDataRaw=()=> 'signed';window.showToast=()=>{};window.myProjects=[{id:42,name:'History app',live_metrics:metrics}];window.archivedProjects=[];window.accidental=0;const slot=document.querySelector('.live-metrics-slot');slot.onclick=()=>accidental++;slot.innerHTML=LiveProjectMetrics.render(myProjects[0]);},{lang,metrics:metrics()});
  assert.equal(await page.locator('[data-lh-banner]').count(),1);
  assert.equal(await page.locator('.lh-banner-actions button').count(),2);
  assert.equal(await page.locator('.lh-banner-actions [data-lh-open]').isEnabled(),true);
  assert.equal(await page.locator('.lh-banner-actions [data-lh-open]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(76, 141, 255)');
  assert.match(await page.locator('.lh-pace-note').first().innerText(),/28/);
  await page.screenshot({path:path.join(out,`banner-${lang}-${width}.png`)});
  await page.locator('.lh-banner-actions [data-lh-open]').click();await page.locator('#lh-run').waitFor();
  await page.locator('[data-lh-action=close]').first().click();
  assert.equal(await page.locator('[data-lh-banner]').count(),1,'Cancelling the sheet leaves the offer available');
  await page.locator('.lh-banner-actions [data-lh-dismiss]').click();assert.equal(await page.evaluate(()=>accidental),0);
  await page.evaluate(()=>document.querySelector('.live-metrics-slot').innerHTML=LiveProjectMetrics.render(myProjects[0]));
  assert.equal(await page.locator('[data-lh-banner]').count(),0,'Dismissal survives rerender');
  assert.equal(await page.evaluate(()=>localStorage.getItem('live-history-hidden:100:42')),'1');
  await page.evaluate(()=>{localStorage.removeItem('live-history-hidden:100:42');document.querySelector('.live-metrics-slot').innerHTML=LiveProjectMetrics.render(myProjects[0]);});
  await page.locator('.lh-close[data-lh-dismiss]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('live-history-hidden:100:42')),'1','The cross uses the same dismissal');
  assert.equal(posts,0,'Neither dismissal imports any data');
  await page.locator('.live-metrics-more').click();await page.locator('[data-lh-open]').waitFor();
  assert.match(await page.locator('[data-signal=SOURCE_IMBALANCE]').innerText(),/100/);
  await page.locator('#la-demo').click();assert.equal(await page.locator('[data-lh-open]').count(),0,'Demo cannot import');
  await page.locator('#la-actual').click();await page.locator('[data-lh-open]').click();await page.locator('#lh-run').waitFor();
  assert.equal(await page.locator('#lh-run option').first().isDisabled(),true);
  await page.locator('#lh-run').selectOption('3');assert.match(await page.locator('.lh-summary').innerText(),/28/);
  assert.equal(await page.locator('.lh-totals>div').count(),3,'Only installs, reviews and retention are metrics');
  assert.equal(await page.locator('.lh-sources .lh-runs span').count(),2);
  assert.equal(await page.locator('.lh-sources').evaluate(el=>!!el.nextElementSibling?.matches('.lh-summary')),true,'Runs are the source above the derived totals');
  assert.equal(await page.locator('.lh-accuracy').evaluate(el=>el.open),false);
  assert.equal(await page.locator('.lh-estimate').isVisible(),true,'Lower-bound retention is disclosed without expanding');
  assert.doesNotMatch(await page.locator('.lh-notice').innerText(),/может|\bmay\b/i);
  await page.screenshot({path:path.join(out,`choose-${lang}-${width}.png`)});
  await page.locator('.lh-accuracy>summary').click();assert.equal(await page.locator('.lh-accuracy li').count(),4);
  await page.setViewportSize({width,height:480});
  await page.locator('.lh-body').evaluate(el=>el.scrollTop=el.scrollHeight);
  const compact=await page.locator('.lh-dialog').evaluate(el=>{const header=el.querySelector('header').getBoundingClientRect(),body=el.querySelector('.lh-body'),footer=el.querySelector('footer').getBoundingClientRect();return {top:header.top,bottom:footer.bottom,scrolls:body.scrollHeight>body.clientHeight};});
  assert(compact.top>=0&&Math.abs(compact.bottom-480)<1&&compact.scrolls,'Header/footer stay reachable in a short viewport');
  await page.setViewportSize({width,height:760});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#live-history-modal').count(),0);assert.equal(await page.locator('#live-analytics-modal').count(),1);
  await page.locator('[data-lh-open]').click();await page.locator('#lh-run').waitFor();
  await page.evaluate(()=>handleAppBack());assert.equal(await page.locator('#live-history-modal').count(),0);assert.equal(await page.locator('#live-analytics-modal').count(),1);
  await page.locator('[data-lh-open]').click();await page.locator('#lh-run').waitFor();await page.locator('#lh-run').selectOption('3');
  await page.locator('[data-lh-action=preview]').click();await page.locator('[data-lh-action=submit]').waitFor();assert.equal(posts,0,'Preview is not an import');assert(gets>=4);
  await page.locator('[data-lh-action=back]').click();assert.equal(await page.locator('#lh-run').inputValue(),'3');
  await page.locator('[data-lh-action=preview]').click();await page.locator('[data-lh-action=submit]').waitFor();
  mode='changed';await page.locator('[data-lh-action=submit]').click();await page.locator('#lh-run').waitFor();assert.equal(await page.locator('[data-lh-action=submit]').count(),0);assert.equal(commits,0);
  await page.locator('[data-lh-action=preview]').click();await page.locator('[data-lh-action=submit]').waitFor();
  const bounds=await page.locator('.lh-dialog').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth};});assert(bounds.left>=0&&bounds.right<=width&&Math.abs(bounds.bottom-760)<1&&!bounds.overflow,'Sheet is attached to the bottom, without horizontal overflow');
  assert.equal(await page.locator('.lh-once').isVisible(),true,'One-time confirmation stays explicit');
  await page.screenshot({path:path.join(out,`confirm-${lang}-${width}.png`)});
  mode='lost';await page.locator('[data-lh-action=submit]').click();await page.locator('.lh-error').waitFor();assert.equal(commits,1);
  await page.locator('[data-lh-action=submit]').click();await page.waitForSelector('#live-history-modal',{state:'detached'});assert.equal(commits,1,'Lost response retry cannot import twice');
  await page.locator('.lh-passport').waitFor();assert.equal(await page.locator('[data-lh-open]').count(),0);
  await page.locator('.lh-passport>summary').click();assert.match(await page.locator('.lh-passport').innerText(),/#3/);
  await page.locator('#la-demo').click();assert.equal(await page.locator('.lh-passport').count(),0);await page.locator('#la-actual').click();
  assert.equal(await page.locator('.lh-passport').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('History RU/EN 360/390: localized two-action banner, both persistent dismissals, bottom sheet + short viewport, source/totals hierarchy, accuracy disclosure, actual-only audit, Run1, fresh confirmation, stale history, lost response retry, pace and Back passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
