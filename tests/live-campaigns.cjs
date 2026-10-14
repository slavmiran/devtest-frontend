const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-campaigns');fs.mkdirSync(out,{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(m=>m[1]);
const languageModal=index.match(/<div id="project-language-modal"[\s\S]*?(?=\s*<!-- Project card: lifecycle)/)[0];
function fixture(id=3){return {id,app_id:42,kind:'closed_bridge',status:'active',total_slots:7,free_occupied:0,free_available:7,paid_active:0,overlimit_cost:40,pool_available:160,reserved_bust:0,allow_wallet_spending:false,next_slot:8,next_slot_price:350,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:'Use the main feature <img src=x>',additional_reports:[]};}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const language of ['ru','en'])for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let c=fixture(),other={...fixture(4),kind:'custom',name:'Discovery',status:'paused'},boost={enabled:true,reward_bust:2,pool_remaining:34,reward_control_days:false,reward_protection_days:false},fail=false,conflict=false,requests=[],keys=new Set();
  await page.route('http://fixture.local/**',async route=>{let req=route.request(),url=new URL(req.url());
   if(url.pathname.endsWith('/screenshot-boost')){
    if(req.method()==='POST'){let data=req.postDataJSON();requests.push({path:url.pathname,data});boost={...boost,enabled:data.enabled,reward_bust:data.reward_bust,pool_remaining:data.pool_bust};}
    return route.fulfill({json:{status:'success',campaign:boost,balance_bust:1000,purchased_protection_days:0}});
   }
   if(url.pathname.includes('/campaigns')){
    if(req.method()==='GET')return route.fulfill({json:{status:'success',campaigns:[c,other]}});
    let data=req.postDataJSON();assert.equal(data.init_data,'signed-fixture');requests.push({path:url.pathname,data});
    if(fail)return route.fulfill({status:503,json:{status:'error',code:'failed'}});
    if(conflict){conflict=false;c.revision++;return route.fulfill({status:409,json:{status:'error',code:'campaign_conflict'}});}
    const target=url.pathname.includes('/4/')?other:c;
    if(url.pathname.endsWith('/settings')){
     assert.equal(data.revision,target.revision);assert.equal(data.duration_days,14);assert.equal(data.install_source,'link');Object.assign(target,data);target.overlimit_cost=(target.control_days.length-1)*10;
    }
    if(url.pathname.endsWith('/pool')){assert.match(data.request_key,/^[0-9a-f-]{36}$/);if(!keys.has(data.request_key)){target.pool_available+=data.amount;keys.add(data.request_key);}if(typeof data.allow_wallet_spending==='boolean')target.allow_wallet_spending=data.allow_wallet_spending;}
    if(url.pathname.endsWith('/status'))target.status=data.status;
    if(url.pathname.endsWith('/buy-slot')){assert.equal(data.expected_price,350);target.next_slot=9;target.next_slot_price=500;target.total_slots=8;}
    target.revision++;return route.fulfill({json:{status:'success',campaign:target}});
   }
   return route.fulfill({contentType:'text/html',body:'<main id="projects-list"></main>'+languageModal+'<div id="android-version-picker-overlay" class="android-version-picker-overlay modal-overlay"><div class="android-version-picker-sheet"><div id="android-version-picker-title"></div><div id="android-version-picker-list"></div></div></div><div id="screenshot-boost-modal" class="modal-overlay screenshot-boost-modal"><div class="modal-content screenshot-boost-sheet"><div id="screenshot-boost-modal-body"></div></div></div>'});
  });
  await page.goto('http://fixture.local/');for(const file of css)if(fs.existsSync(path.join(root,file)))await page.addStyleTag({path:path.join(root,file)});
  await page.addStyleTag({content:'body{padding:8px;background:#111a26;color:#eff4fb}#projects-list{width:100%}.card{width:100%}'});
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/core.js','ui/ui-helpers.js','ui/ui-tests.js','ui/ui-projects.js','js/project-parameters.js','js/live-campaign-wallet.js','js/live-campaigns.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(({language,boost})=>{window.lang=language;window.API_BASE='/api';window.App={API_BASE:'/api'};window.visibilityStats={balance_bust:1000};window.getLocalDate=()=> '2026-10-14';window.getTelegramInitDataRaw=()=> 'signed-fixture';window.tg={HapticFeedback:{selectionChanged(){},impactOccurred(){},notificationOccurred(){}}};window.showToast=x=>window.lastToast=x;window.renderProjects=()=>{};window.myProjects=[{id:42,phase:'live',name:'Orbit Notes',run_iteration:1,request_reviews:false,target_lang:'RU',instructions:'Old project instructions',screenshot_boost_campaign:boost}];let card=document.createElement('div');card.className='card';card.innerHTML=LiveCampaigns.build(myProjects[0]);document.querySelector('#projects-list').append(card);LiveCampaigns.mount(card,myProjects[0]);}, {language,boost});
  const card=page.locator('[data-campaign-id="3"]');await card.locator('.lc-buy').waitFor();
  const fit=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await fit();assert.equal(await card.locator('textarea,input,select,form').count(),0);assert.equal(await card.locator('.lc-pool').count(),0);assert.ok(await card.boundingBox().then(b=>b.height<290));
  await page.screenshot({path:path.join(out,`compact-${language}-${width}.png`)});
  await card.locator('.pc-project-params__toggle').click();await card.locator('.pc-project-param[data-project-param="target_lang"]').waitFor();
  assert.equal(await card.locator('.pc-project-params__grid > .pc-project-param').count(),6);assert.equal(await card.locator('.lc-checkpoint[aria-pressed="true"]').count(),5);assert.equal(await card.locator('[data-day="1"]').isDisabled(),true);
  assert.match(await card.locator('[data-project-param="screenshot_boost_campaign"]').innerText(),/34\$/);assert.ok(await card.boundingBox().then(b=>b.height<610));await fit();
  await page.waitForFunction(()=>{const p=document.querySelector('[data-campaign-id="3"] .pc-project-params__body'),c=p.querySelector('.pc-project-params__content');return Math.abs(p.getBoundingClientRect().height-c.getBoundingClientRect().height)<2;});
  await page.screenshot({path:path.join(out,`expanded-${language}-${width}.png`)});
  await card.locator('[data-day="4"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget>strong').textContent.includes('30'));
  await card.locator('[data-day="10"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget>strong').textContent.includes('20'));
  await card.locator('[data-day="14"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget>strong').textContent.includes('10'));
  const countBefore=requests.length;await card.locator('[data-day="7"]').click();assert.equal(requests.length,countBefore,'Cannot remove the last paid checkpoint');assert.deepEqual(c.control_days,[1,7]);
  assert.equal(await page.evaluate(()=>lastToast),await page.evaluate(()=>window.t('lcMinimumCheckpoint',{},window.lang)));
  await card.locator('[data-day="14"]').click();await page.waitForFunction(()=>document.querySelector('.lc-budget>strong').textContent.includes('20'));
  assert.equal(await card.locator('.pc-project-params').getAttribute('class').then(x=>x.includes('is-expanded')),true);
  await card.locator('[data-project-param="target_lang"]').click();await page.locator('#project-language-options button').nth(1).click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="3"] [data-project-param="target_lang"]').textContent.includes('EN'));
  await card.locator('[data-project-param="min_android_version"]').click();await page.locator('#android-version-picker-list button').last().click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="3"] [data-project-param="min_android_version"]').textContent.includes('15'));
  await card.locator('[data-project-param="request_reviews"]').click();assert.equal(await page.locator('#project-language-hint').textContent(),await page.evaluate(()=>window.t('requestReviewsHint',{},window.lang)));await page.locator('#project-language-options button').last().click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="3"] [data-project-param="request_reviews"]').textContent.includes(window.t('pcParamsOff',{},window.lang)));
  await card.locator('[data-project-param="instructions"]').click();await page.locator('#project-instructions-input').fill('Updated campaign <img src=x>');await page.locator('#project-instructions-save').click();await page.waitForFunction(()=>!document.querySelector('#project-instructions-modal').classList.contains('active'));assert.equal(await card.locator('img').count(),0);
  const unchanged=await page.evaluate(()=>({reviews:myProjects[0].request_reviews,language:myProjects[0].target_lang,instructions:myProjects[0].instructions}));assert.deepEqual(unchanged,{reviews:false,language:'RU',instructions:'Old project instructions'});assert.equal(requests.some(r=>r.path==='/api/projects/42'),false,'Campaign parameters must not PUT project settings');
  await card.locator('[data-project-param="screenshot_boost_campaign"]').click();await page.waitForFunction(()=>!!window._screenshotBoostSettingsLoaded);assert.equal(await page.locator('#screenshot-boost-control-days').isDisabled(),true);await page.locator('#screenshot-boost-reward').fill('3');await page.locator('#screenshot-boost-save').click();await page.waitForFunction(()=>!document.querySelector('#screenshot-boost-modal').classList.contains('active'));assert.match(await card.locator('[data-project-param="screenshot_boost_campaign"]').innerText(),/3\$/);
  await card.locator('[data-lc-action="pool"]').click();await page.locator('#live-campaign-wallet-modal .project-email-settings-switch').click();await page.waitForFunction(()=>!!document.querySelector('.lc-wallet-badge'));await page.waitForFunction(()=>!document.querySelector('[data-lc-wallet-toggle]').disabled);
  await page.locator('[data-lc-wallet-amount]').fill('60');fail=true;await page.locator('[data-lc-wallet-deposit]').click();await page.waitForFunction(()=>!document.querySelector('[data-lc-wallet-deposit]').disabled);let failedKey=requests.at(-1).data.request_key;
  fail=false;await page.locator('[data-lc-wallet-deposit]').click();await page.waitForFunction(()=>!document.querySelector('#live-campaign-wallet-modal').classList.contains('active'));assert.equal(requests.at(-1).data.request_key,failedKey);assert.equal(c.pool_available,220);
  await card.locator('[data-lc-action="status"]').click();await page.locator('[data-lc-status="paused"]').click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="3"] .lc-status').textContent.includes(window.t('lcOff',{},window.lang)));assert.equal(await page.locator('.lc-paused [data-campaign-id="3"]').count(),0);assert.equal(await page.locator('.lc-paused [data-campaign-id="4"]').count(),1);
  await card.locator('[data-lc-action="status"]').click();await page.locator('[data-lc-status="active"]').click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="3"] .lc-status').classList.contains('is-on'));
  page.once('dialog',d=>d.accept());await card.locator('.lc-buy').click();await page.waitForFunction(()=>document.querySelector('.lc-buy').textContent.includes('500'));
  fail=true;await card.locator('[data-day="7"]').click();await page.waitForFunction(()=>!document.querySelector('[data-campaign-id="3"] [data-day="7"]').disabled);assert.ok(c.control_days.includes(7));fail=false;
  conflict=true;await card.locator('[data-day="7"]').click();await page.waitForFunction(()=>!document.querySelector('[data-campaign-id="3"] [data-day="7"]').disabled);assert.ok(c.control_days.includes(7),'Conflict refresh must retain server terms');
  const offers=await page.evaluate(()=>{const t={id:42,run_iteration:1,status:'daily',app_status:'active',checkins_count:2,last_check_date:'2026-10-12',screenshot_boost_campaign:{enabled:true,reward_bust:3,pool_remaining:34,reward_control_days:false},live_bridge:{control_days:[1,7,14]}};return {ordinary:getScreenshotBoostOffer(t,4),required:getScreenshotBoostOffer(t,7),expired:getScreenshotBoostOffer(t,15)};});assert.equal(offers.ordinary.reward,3);assert.equal(offers.required,null);assert.equal(offers.expired,null);
  await page.screenshot({path:path.join(out,`final-${language}-${width}.png`)});await fit();assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Campaign shared parameters passed: RU/EN 360/390/430, compact frames, same selectors/editor/report budget, instant checkpoint saves, pause stays visible, pool retry UUID, conflicts and project isolation.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
