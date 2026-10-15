const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-campaign-wizard');fs.mkdirSync(out,{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(m=>m[1]);
const campaign={id:3,app_id:42,kind:'closed_bridge',status:'active',total_slots:7,free_occupied:0,free_available:7,paid_active:0,overlimit_cost:40,pool_available:0,reserved_bust:0,next_slot:8,next_slot_price:350,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:''};
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try {
 for(const language of ['ru','en'])for(const width of [360,390]){
  const page=await browser.newPage({viewport:{width,height:740}}),errors=[],mutations=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('http://fixture.local/**',route=>{
   if(route.request().method()!=='GET')mutations.push(route.request().url());
   if(new URL(route.request().url()).pathname.endsWith('/campaigns'))return route.fulfill({json:{status:'success',campaigns:[campaign]}});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><section class="tab-content active" id="tab-projects"><div id="projects-list"></div></section></body></html>'});
  });
  await page.goto('http://fixture.local/');
  for(const file of css)if(fs.existsSync(path.join(root,file)))await page.addStyleTag({path:path.join(root,file)});
  await page.addStyleTag({content:'body{padding:8px}#tab-projects{display:block}'});
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/live-campaign-wizard.js','i18n/core.js','ui/ui-helpers.js','js/project-parameters.js','js/live-campaign-draft.js','js/live-campaign-wizard-view.js','js/live-campaign-wizard.js','js/live-campaigns.js','js/app-navigation.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(language=>{
   window.lang=language;window.API_BASE='/api';window.signed='owner-42';window.getTelegramInitDataRaw=()=>window.signed;
   window.confirmations=[];window.confirmAnswer=false;window.showToast=m=>window.lastToast=m;
   window.tg={initData:'fixture',BackButton:{show(){},hide(){},onClick(fn){this.callback=fn;}},showConfirm(message,cb){confirmations.push(message);cb(confirmAnswer);}};
   window.myProjects=[{id:42,phase:'live',name:'Orbit Notes',live_metrics:{source:'devtesthub_live',boundary_available:true,installs:{per_day:10}}}];
   const card=document.createElement('div');card.className='card';card.innerHTML=LiveCampaigns.build(myProjects[0]);document.querySelector('#projects-list').append(card);LiveCampaigns.mount(card,myProjects[0]);initTelegramBackButton();
  },language);
  await page.locator('.lc-create').click();const layer=page.locator('#live-campaign-wizard');await layer.waitFor();
  const next=()=>layer.locator('[data-lcw-action="next"]').click();
  const fit=async()=>{
   assert.equal(await layer.evaluate(el=>el.scrollWidth<=el.clientWidth),true,'No horizontal overflow');
   assert.equal(await layer.locator('.lcw-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Body has no horizontal scroll');
   const box=await layer.boundingBox();assert.equal(Math.round(box.y),0);assert.equal(Math.round(box.height),await page.evaluate(()=>innerHeight));
   assert.equal(await layer.evaluate(el=>{const b=el.querySelector('.lcw-scroll').getBoundingClientRect(),f=el.querySelector('.lcw-footer').getBoundingClientRect();return b.bottom<=f.top+1 && f.bottom<=innerHeight+1;}),true,'Footer never overlaps content');
  };
  await fit();assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),true);
  assert.equal(await layer.locator('[data-lcw-action="back"]').count(),1,'Only header Back on step 1');
  await page.evaluate(()=>tg.BackButton.callback());await layer.waitFor({state:'detached'});assert.equal(await page.evaluate(()=>confirmations.length),0,'Pristine draft closes without confirmation');
  assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('lc-create')),true,'Closing restores focus to the entry button');
  await page.locator('.lc-create').click();await layer.locator('[data-lcw-strategy="aso"]').click();
  assert.match(await layer.locator('[data-lcw-daily]').innerText(),/60/);assert.match(await layer.locator('[data-lcw-total]').innerText(),/840/);
  assert.equal(await layer.locator('[data-lcw-strategy="aso"]').getAttribute('aria-pressed'),'true');
  await layer.locator('[data-lcw-action="close"]').click();assert.equal(await layer.count(),1);assert.equal(await page.evaluate(()=>confirmations.length),1,'Dirty draft asks before exit');
  await page.screenshot({path:path.join(out,`step1-${language}-${width}.png`)});
  await next();await layer.locator('[data-lcw-focus="keywords:-1"]').click();await fit();
  await layer.locator('[data-lcw-focus="link:-1"]').click();
  assert.equal(await layer.locator('.lcw-source').count(),3);
  await next();await layer.locator('[data-lcw-field="checkpoint"][data-value="7"]').click();
  assert.match(await layer.locator('[data-lcw-total]').innerText(),/420/);
  await layer.locator('[data-lcw-field="checkpoint"][data-value="14"]').click();assert.match(await layer.locator('[data-lcw-total]').innerText(),/420/);
  await page.evaluate(()=>tg.BackButton.callback());assert.equal(await layer.locator('[role="progressbar"]').getAttribute('aria-valuenow'),'2');
  await next();assert.equal(await layer.locator('[data-value="7"][data-lcw-field="checkpoint"]').getAttribute('aria-pressed'),'false','Back preserves draft');
  await layer.locator('[data-lcw-field="retention"][data-value="30"]').click();await next();
  assert.equal(await layer.locator('[data-lcw-field="reviews"]').getAttribute('aria-checked'),'true');
  await layer.locator('[data-lcw-field="activity"]').click();await layer.locator('[data-lcw-field="screenshot"]').click();
  await next();await layer.locator('[data-lcw-focus="daily:1"]').click();await layer.locator('[data-lcw-field="duration"][data-value="7"]').click();await fit();
  assert.match(await layer.locator('[data-lcw-total]').innerText(),/1[\s,]?120/);
  assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),true,'No fake launch before pricing API exists');
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.lcwField),'duration');
  await layer.locator('.lcw-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);await fit();
  await page.screenshot({path:path.join(out,`step5-${language}-${width}.png`)});
  await page.setViewportSize({width,height:520});await fit();await page.setViewportSize({width,height:740});
  // Keyboard focus stays inside the dialog, including when content scrolls.
  await layer.locator('[data-lcw-action="close"]').focus();await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>!!document.activeElement.closest('#live-campaign-wizard')),true);
  for(let n=0;n<4;n++)await page.evaluate(()=>tg.BackButton.callback());
  await layer.locator('[data-lcw-strategy="custom"]').click();assert.equal(await layer.locator('[data-lcw-strategy="aso"]').getAttribute('aria-pressed'),'true','Cancelled preset replacement preserves edits');
  await page.evaluate(()=>confirmAnswer=true);await layer.locator('[data-lcw-strategy="custom"]').click();
  assert.match(await layer.locator('[data-lcw-total]').innerText(),/70/);
  await next();for(let n=0;n<10;n++)await layer.locator('[data-lcw-focus="link:-1"]').click();
  assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),true,'All sources off blocks navigation');
  await layer.locator('[data-lcw-focus="web:1"]').click();assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),false);
  // Actor changes cannot carry a previous account’s draft to another account.
  await page.evaluate(()=>{signed='different-owner';tg.BackButton.callback();});await layer.waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.body.style.overflow),'');assert.equal(mutations.length,0,'Draft never writes campaigns, pools or wallet');
  await page.evaluate(()=>{myProjects[0].phase='testing';LiveCampaignWizard.open(42);});assert.equal(await layer.count(),0);
  await page.evaluate(()=>{myProjects[0].phase='live';myProjects[0].live_metrics=null;LiveCampaignWizard.open(42);});await layer.locator('[data-lcw-strategy="aso"]').click();assert.match(await layer.locator('[data-lcw-total]').innerText(),/280/);assert.equal(await layer.locator('.lcw-baseline').textContent().then(x=>/NaN|undefined/.test(x)),false);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Live wizard RU/EN 360/390: full height, real + entry, Telegram Back, confirmation, 5 steps, reactive estimate, preset reset, account isolation, no charges and no overflow passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
