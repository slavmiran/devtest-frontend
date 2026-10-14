const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-campaigns');fs.mkdirSync(out,{recursive:true});
function fixture(){return {id:3,app_id:42,kind:'closed_bridge',status:'active',base_slots:7,purchased_slots:0,total_slots:7,occupied_slots:7,free_occupied:7,free_available:0,paid_active:0,overlimit_cost:40,pool_available:160,reserved_bust:0,allow_wallet_spending:false,affordable_overlimit:4,unlimited_without_charges:false,next_slot:8,next_slot_price:350,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:'Use the main feature <img src=x>',additional_reports:[],metrics:{installs:332,reviews:68,active_users:23,avg_days:14.5}};}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const lang of ['ru','en'])for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let c=fixture(),fail=false,hold=false,pending,mutations=[],keys=new Set();
  await page.route('http://fixture.local/**',async route=>{const request=route.request(),url=new URL(request.url());if(url.pathname.includes('/campaigns')){
   if(request.method()==='GET'){assert.equal(url.searchParams.get('init_data'),'signed-fixture');await route.fulfill({json:{status:'success',campaigns:[c]}});return;}
   const body=request.postDataJSON();assert.equal(body.init_data,'signed-fixture');mutations.push({url:url.pathname,body});
   if(hold)await new Promise(r=>pending=r);
   if(fail){await route.fulfill({status:503,json:{status:'error',code:'failed'}});return;}
   if(url.pathname.endsWith('/pool')){assert.match(body.request_key,/^[0-9a-f-]{36}$/);if(!keys.has(body.request_key)){c.pool_available+=body.amount;keys.add(body.request_key);}if(typeof body.allow_wallet_spending==='boolean')c.allow_wallet_spending=body.allow_wallet_spending;}
   if(url.pathname.endsWith('/buy-slot')){assert.equal(body.expected_slot,c.next_slot);assert.equal(body.expected_price,c.next_slot_price);c.total_slots++;c.next_slot++;c.next_slot_price=500;}
   if(url.pathname.endsWith('/status'))c.status=body.status;
   if(url.pathname.endsWith('/settings')){assert.deepEqual(body.control_days,[1,7,14]);assert.equal(body.duration_days,14);assert.equal(body.install_source,'link');Object.assign(c,body);c.overlimit_cost=20;c.affordable_overlimit=8;}
   c.revision++;await route.fulfill({json:{status:'success',campaign:c}});return;
  }await route.fulfill({contentType:'text/html',body:'<div id="projects-list"></div>'});});
  await page.goto('http://fixture.local/');for(const file of ['css/tokens.css','css/base.css','styles.css','css/project-parameters.css','css/live-campaigns.css'])if(fs.existsSync(path.join(root,file)))await page.addStyleTag({path:path.join(root,file)});
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/core.js','ui/ui-helpers.js','js/live-campaigns.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(lang=>{window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-fixture';window.showToast=message=>window.lastToast=message;const p={id:42,phase:'live',name:'Orbit Notes',is_visible:true};const card=document.createElement('div');card.className='card';card.innerHTML=LiveCampaigns.build(p);document.querySelector('#projects-list').append(card);LiveCampaigns.mount(card,p);},lang);
  await page.waitForFunction(()=>!!document.querySelector('.lc-buy'));
  const fits=async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('.lc-section').evaluate(el=>el.scrollWidth<=el.clientWidth),true);};
  await fits();assert.equal(await page.locator('.lc-campaign form img').count(),0);assert.equal(await page.locator('.lc-day input:checked').count(),4);
  await page.screenshot({path:path.join(out,`campaign-${lang}-${width}.png`)});
  await page.locator('.lc-params summary').click();await page.locator('[name="day"][value="4"]').uncheck();await page.locator('[name="day"][value="10"]').uncheck();
  await page.locator('[name="additional_reports"]').fill('Check offline mode\nAttach a screenshot');await page.locator('[data-lc-action="save"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget > strong').textContent.includes('20'));
  await fits();assert.equal(await page.locator('.lc-params').getAttribute('open'),'');
  await page.screenshot({path:path.join(out,`campaign-settings-${lang}-${width}.png`),fullPage:true});
  await page.locator('[data-lc-wallet]').check();await page.waitForFunction(()=>document.querySelector('[data-lc-wallet]').checked&&!document.querySelector('[data-lc-wallet]').disabled);
  await page.locator('.lc-pool summary').click();await page.locator('[name="pool-amount"]').fill('60');fail=true;await page.locator('[data-lc-action="deposit"]').click();await page.waitForFunction(()=>!document.querySelector('[data-lc-action="deposit"]').disabled);
  const failedKey=mutations.at(-1).body.request_key;
  fail=false;await page.locator('[name="pool-amount"]').fill('60');await page.locator('[data-lc-action="deposit"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget b').textContent.includes('220'));assert.equal(mutations.at(-1).body.request_key,failedKey);
  page.once('dialog',dialog=>{assert.match(dialog.message(),/350/);dialog.accept();});await page.locator('.lc-buy').click();await page.waitForFunction(()=>document.querySelector('.lc-buy').textContent.includes('500'));
  await page.locator('.lc-params summary').click();await page.locator('[data-lc-action="status"]').click();await page.waitForSelector('.lc-paused');assert.equal(await page.locator('.lc-paused').getAttribute('open'),null);
  await page.locator('.lc-paused summary').first().click();await page.locator('[data-lc-action="status"]').click();await page.waitForFunction(()=>!document.querySelector('.lc-paused'));
  await page.evaluate(()=>{const holder=document.createElement('div');holder.id='badges';holder.innerHTML=LiveCampaigns.marketBadges({live_bridge:{control_days:[1,7,14]}});document.body.append(holder);});
  await page.locator('[data-lc-hint="days"]').click();assert.match(await page.evaluate(()=>window.lastToast),/1 · 7 · 14/);
  const quick=await page.evaluate(()=>{const test={id:42,live_bridge:{control_days:[1,7,14],additional_reports:['<img src=x>']}};return {normal:LiveCampaigns.normalActions(test,4),isControl:LiveCampaigns.isControl(test,4),reports:LiveCampaigns.reports(test)};});
  assert.equal(quick.isControl,false);assert.ok(quick.normal.includes('confirmStart'));assert.ok(quick.normal.includes('openCheckinOptionsModal'));assert.ok(!quick.normal.includes('startTimer'));assert.ok(!quick.reports.includes('<img'));
  await fits();assert.deepEqual(errors,[]);await page.close();
 }console.log('Campaigns passed: RU/EN 360/390/430, settings, free checkpoints, pause, prices, immutable request keys, escaping, badges and timer-free paperclip flow.');
}finally{await browser.close();}})().catch(err=>{console.error(err);process.exitCode=1;});
