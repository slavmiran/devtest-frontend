const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-campaign-wizard');fs.mkdirSync(out,{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(m=>m[1]);
const bridge={id:3,app_id:42,kind:'closed_bridge',status:'active',total_slots:7,free_occupied:0,free_available:7,paid_active:0,overlimit_cost:40,pool_available:0,reserved_bust:0,next_slot:8,next_slot_price:350,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:''};
const listing={title:'Orbit Budget Planner',genre:'Finance',summary:'Family budget and travel expenses',description:'Plan your family budget. Track daily expenses and manage travel costs.'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQ0AAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const language of ['ru','en'])for(const width of [360,390]){
  const page=await browser.newPage({viewport:{width,height:740}}),errors=[],posts=[],slotKeys=new Set();
  let campaigns=[structuredClone(bridge)],limit=3,nextId=10,failSave=false;
  const capacity=()=>({active:campaigns.filter(c=>c.kind!=='closed_bridge'&&c.status==='active').length,limit,next_slot:limit+1,next_price:(limit-1)*1000});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://fixture.local/**',async route=>{
   const url=new URL(route.request().url()),request=route.request(),method=request.method(),body=method==='GET'?null:request.postDataJSON();
   const ok=json=>route.fulfill({json:{status:'success',...json}});
   if(url.pathname.endsWith('/campaigns')&&method==='GET')return ok({campaigns,capacity:capacity(),pace:{needed:1,policies:[]},hud:{last_screenshot_at:new Date(Date.now()-2*3600000).toISOString(),on_schedule_percent:75,active_testers:4}});
   if(url.pathname.endsWith('/campaigns')&&method==='POST'){
    posts.push(body);if(failSave)return route.fulfill({status:503,json:{status:'error',code:'unavailable'}});
    const c={id:nextId++,app_id:42,kind:'custom',status:body.status,revision:1,name:body.definition.name,definition:body.definition,confirmed_installs:0,pool_available:0,keywords:body.definition.keywords.map((k,i)=>({...k,id:i+1,enabled:true,installs:0}))};campaigns.push(c);return ok({campaign:c});
   }
   if(url.pathname.endsWith('/active-slot')){if(!slotKeys.has(body.request_key)){assert.equal(body.expected_price,(limit-1)*1000);assert.equal(body.expected_slot,limit+1);slotKeys.add(body.request_key);limit++;}return ok({capacity:capacity()});}
   if(url.pathname.endsWith('/contracts')){const c=campaigns.find(c=>c.id===3);c.contracts={enabled:body.enabled,limit:body.limit,reward:body.reward,hired:0,funded_budget:body.limit*body.reward,unassigned_budget:body.limit*body.reward};c.revision++;return ok({campaign:c});}
   const toggle=url.pathname.match(/\/campaigns\/(\d+)\/keywords\/(\d+)$/),status=url.pathname.match(/\/campaigns\/(\d+)\/growth-status$/);
   if(toggle){const c=campaigns.find(c=>c.id===Number(toggle[1])),k=c.keywords.find(k=>k.id===Number(toggle[2]));k.enabled=body.enabled;c.revision++;return ok({campaign:c});}
   if(status){const c=campaigns.find(c=>c.id===Number(status[1]));if(body.status==='active'&&c.status!=='active'&&capacity().active>=limit)return route.fulfill({status:409,json:{status:'error',code:'active_campaign_limit'}});c.status=body.status;c.revision++;return ok({campaign:c});}
   if(url.pathname.endsWith('/live-metrics/analytics'))return ok({analytics:{source:'devtesthub_live',is_demo:false,install_velocity:{per_day:10,source_counts:{link:90,browser:5,key:5,unknown:0}},reviews_health:{per_day:.5},retention:{avg_days:23}}});
   if(url.pathname.endsWith('/play-store-data'))return ok({play_store_raw:listing});
   return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><section class="tab-content active" id="tab-projects"><div id="projects-list"></div></section></body></html>'});
  });
  await page.goto('http://fixture.local/');
  for(const file of css)if(fs.existsSync(path.join(root,file)))await page.addStyleTag({path:path.join(root,file)});
  await page.addStyleTag({content:'body{padding:8px}#tab-projects{display:block}'});
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/live-campaign-wizard.js','i18n/live-campaign-pace.js','i18n/core.js','ui/ui-helpers.js','js/project-parameters.js','js/project-contract-pricing.js','js/live-campaign-keywords.js','js/live-campaign-traffic.js','js/live-campaign-pace.js','js/live-campaign-pace-view.js','js/live-campaign-learning.js','js/live-campaign-draft.js','js/live-campaign-wizard-media.js','js/live-campaign-wizard-view.js','js/live-campaign-sources-view.js','js/live-campaign-entry.js','js/live-campaign-wizard.js','js/live-campaign-growth-card.js','js/live-campaign-wallet.js','js/live-campaigns.js','js/app-navigation.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(({language,index})=>{
   const ref=new DOMParser().parseFromString(index,'text/html').querySelector('#add-bounty-settings');const holder=document.createElement('div');holder.hidden=true;holder.appendChild(ref);document.body.appendChild(holder);
   window.lang=language;window.API_BASE='/api';window.signed='owner-42';window.getTelegramInitDataRaw=()=>signed;
   window.confirmations=[];window.confirmAnswer=false;window.showToast=m=>window.lastToast=m;
   window.tg={initData:'fixture',BackButton:{show(){},hide(){},onClick(fn){this.callback=fn;}},showConfirm(message,cb){confirmations.push(message);cb(confirmAnswer);},openLink(url){window.openedUrl=url;}};
   window.myProjects=[{id:42,phase:'live',name:'Internal project name',live_metrics:{source:'devtesthub_live',boundary_available:true,installs:{per_day:10}}}];
   window.revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.copiedQuery=value}});
   const card=document.createElement('div');card.className='card';card.innerHTML=LiveCampaigns.build(myProjects[0]);document.querySelector('#projects-list').append(card);LiveCampaigns.mount(card,myProjects[0]);initTelegramBackButton();
  },{language,index});
  const layer=page.locator('#live-campaign-wizard'),open=()=>page.locator('.lc-create').click();
  const field=f=>layer.locator('[data-lcw-input="'+f+'"]'),next=()=>layer.locator('[data-lcw-action="next"]').click();
  const choose=v=>layer.locator('[data-lcw-field="source"][data-value="'+v+'"]').click();
  const fit=async()=>{
   assert.equal(await layer.evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Fullscreen has no horizontal overflow');
   assert.equal(await layer.locator('.lcw-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Content has no horizontal overflow');
   if(await layer.locator('.lcw-footer').isVisible()){
    assert.equal(await layer.locator('.lcw-estimate-line').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Compact estimate fits');
    assert.equal(await layer.evaluate(el=>{const b=el.querySelector('.lcw-scroll').getBoundingClientRect(),f=el.querySelector('.lcw-footer').getBoundingClientRect();return b.bottom<=f.top+1&&f.bottom<=innerHeight+1;}),true,'Footer never overlaps body');
   }
  };
  await open();await layer.waitFor();await page.waitForFunction(()=>document.querySelector('.lcw-hud-proof').textContent.includes('75'));
  assert.equal(await layer.locator('.lcw-footer').isVisible(),false);assert.equal(await layer.locator('[data-lcw-action="next"]').count(),0);
  assert.match(await layer.locator('.lcw-hud-grid strong').last().innerText(),/^23 /);
  await fit();await page.screenshot({path:path.join(out,'entry-'+language+'-'+width+'.png'),animations:'disabled'});
  await page.evaluate(()=>tg.BackButton.callback());await layer.waitFor({state:'detached'});
  await open();await layer.locator('[data-lcw-action="manual"]').click();await fit();
  assert.match(await layer.locator('#lcw-title').innerText(),/1.*4/);assert.equal(await layer.locator('.lcw-footer [data-lcw-action="back"]').count(),0);
  await layer.locator('.lcw-heading').click();assert.equal(await layer.locator('[data-step="2"]').isDisabled(),true);
  await page.evaluate(()=>tg.BackButton.callback());assert.equal(await layer.locator('#lcw-outline').isVisible(),false);
  await page.evaluate(()=>tg.BackButton.callback());assert.equal(await layer.locator('[data-lcw-action="manual"]').isVisible(),true);
  await layer.locator('[data-lcw-action="manual"]').click();await choose('web');await field('webQuery').fill('Orbit android budget');
  await layer.locator('[data-lcw-action="web-search"]').click();assert.equal(await page.evaluate(()=>copiedQuery),'Orbit android budget');assert.match(await page.evaluate(()=>openedUrl),/^https:\/\/www.google.com\/search\?q=Orbit/);
  await field('webQuery').fill('');assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),true);
  await choose('keywords');assert.equal(await layer.locator('[data-lcw-action="next"]').isDisabled(),true);
  await field('manualKey').fill('family budget');await field('manualKey').press('Enter');
  await field('manualKey').fill('travel taxi');await layer.locator('[data-lcw-action="add-key"]').click();
  await field('manualKey').fill(' TRAVEL  TAXI ');await layer.locator('[data-lcw-action="add-key"]').click();assert.equal(await layer.locator('[data-keyword-row]').count(),2);
  assert.equal(await layer.locator('[data-lcw-input="keywordInstalls"]').count(),0,'No per-key quotas');
  await layer.locator('.lcw-passport-ref summary').first().click();assert.match(await layer.locator('.lcw-listing').innerText(),/Orbit Budget Planner/);
  await field('position').first().fill('12 · blue icon');
  await layer.locator('[data-lcw-file="keyword:k1"]').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:png});
  await layer.locator('.lcw-attachment figure').waitFor();await fit();await page.screenshot({path:path.join(out,'source-'+language+'-'+width+'.png'),animations:'disabled'});
  await next();await field('retention').fill('35');await field('retention').dispatchEvent('change');assert.equal(await layer.locator('[data-lcw-field="checkpoint"][data-value="35"]').count(),1);
  await layer.locator('[data-lcw-field="retention"][data-value="14"]').click();await next();
  await layer.locator('[data-lcw-field="reviews"]').click();await next();
  await field('name').fill('Summer ASO');
  assert.equal(await layer.locator('[data-lcw-field="paced"]').count(),2);
  for(const hours of [6,18,24,36,48]){await layer.locator('[data-lcw-field="pauseHours"][data-value="'+hours+'"]').click();await fit();}
  assert.equal(await layer.locator('.lcp-equalizer').getAttribute('data-zone'),'buffer');
  assert.equal(await layer.locator('.lcp-equalizer input').evaluate(el=>{el.value='18';el.dispatchEvent(new Event('input',{bubbles:true}));el.value='48';el.dispatchEvent(new Event('input',{bubbles:true}));return el.isConnected;}),true,'Dragging the equalizer keeps the same native range alive');
  assert.equal(await layer.locator('.lcw-counter [data-lcw-input="pauseHours"]').inputValue(),'48');
  await layer.locator('[data-lcw-field="rampDays"][data-value="14"]').click();assert.equal(await layer.locator('.lcp-ramp-chart>div').count(),14);
  await layer.locator('[data-lcw-action="learn"]').first().click();await page.locator('#live-campaign-learning').waitFor();
  assert.equal(await page.locator('#live-campaign-learning .lcp-learning').evaluate(el=>{const b=el.getBoundingClientRect();return !!document.elementFromPoint(b.x+b.width/2,b.y+Math.min(100,b.height/2)).closest('#live-campaign-learning');}),true,'Learning opens above the fullscreen wizard');
  await page.screenshot({path:path.join(out,'learning-'+language+'-'+width+'.png'),animations:'disabled'});
  await page.evaluate(()=>tg.BackButton.callback());assert.equal(await page.locator('#live-campaign-learning').count(),0);assert.match(await layer.locator('#lcw-title').innerText(),/4/);
  await field('target').fill('53');
  await layer.locator('[data-lcw-field="paced"][data-value="false"]').click();assert.equal(await field('target').inputValue(),'53');
  await layer.locator('[data-lcw-field="paced"][data-value="true"]').click();
  await page.setViewportSize({width,height:520});await fit();await page.setViewportSize({width,height:740});
  assert.match(await layer.locator('[data-lcw-installs]').innerText(),/53/);await fit();await layer.locator('.lcw-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);await page.screenshot({path:path.join(out,'pace-'+language+'-'+width+'.png'),animations:'disabled'});
  await layer.locator('.lcw-heading').click();assert.equal(await layer.locator('[data-lcw-action="step"]').count(),4);
  await layer.locator('[data-step="1"]').click();assert.equal(await layer.locator('[data-keyword-row]').count(),2);
  await layer.locator('.lcw-heading').click();await layer.locator('[data-step="4"]').click();
  failSave=true;await layer.locator('[data-lcw-action="save"]').click();await page.waitForFunction(()=>document.querySelector('[data-lcw-action="save"]:not(:disabled)'));
  assert.equal(await layer.isVisible(),true);const failedKey=posts.at(-1).request_key;
  failSave=false;await layer.locator('[data-lcw-action="save"]').click();await layer.waitFor({state:'detached'});
  assert.equal(posts.at(-1).request_key,failedKey,'Retry preserves idempotency key');assert.equal(posts.at(-1).definition.volume.totalInstalls,53);assert.equal(posts.at(-1).definition.web.query,'');assert.equal(posts.at(-1).definition.keywords[0].screenshot.data_base64,png.toString('base64'));
  await page.locator('.lc-growth').waitFor();assert.equal(await page.evaluate(()=>revoked.length>0),true);
  const growth=page.locator('[data-campaign-id="10"]');await growth.locator('[data-growth-keys] summary').click();
  await growth.locator('[data-lc-action="keyword"]').first().click();await page.waitForFunction(()=>document.querySelector('[data-campaign-id="10"] [data-lc-action="keyword"][aria-checked="false"]'));
  assert.equal(await growth.locator('[data-lc-action="keyword"][aria-checked="true"]').isDisabled(),true,'Last enabled keyword cannot be switched off');
  assert.equal(await growth.locator('[data-growth-keys]').getAttribute('open'),'','Pool remains expanded after update');
  await open();await layer.locator('[data-lcw-template="aso"]').click();assert.match(await layer.locator('#lcw-title').innerText(),/1.*4/);await next();await next();await next();assert.equal(await layer.locator('[data-lcw-field="rampDays"][data-value="7"]').getAttribute('aria-pressed'),'true');await layer.locator('[data-lcw-action="save"]').click();await layer.waitFor({state:'detached'});await page.locator('[data-campaign-id="11"]').waitFor();assert.equal(posts.at(-1).status,'active');
  const activate=async id=>{await page.locator('[data-campaign-id="'+id+'"] [data-lc-action="status"]').click();await page.locator('[data-lc-status="active"]').click();await page.waitForFunction(()=>!document.querySelector('#live-campaign-wallet-modal').classList.contains('active'));};
  await activate(11);await open();await layer.locator('[data-lcw-template="retention"]').click();await next();await next();await next();await layer.locator('[data-lcw-action="save"]').click();await layer.waitFor({state:'detached'});await page.locator('[data-campaign-id="12"]').waitFor();await activate(12);
  await page.locator('[data-lc-action="buy-active"]').waitFor();assert.equal(capacity().active,3);assert.equal(limit,3);
  await page.evaluate(()=>confirmAnswer=true);await page.locator('[data-lc-action="buy-active"]').click();await page.waitForFunction(()=>!document.querySelector('[data-lc-action="buy-active"]'));assert.equal(limit,4);assert.equal(slotKeys.size,1);
  assert.equal(await page.locator('.lc-section').evaluate(el=>el.scrollWidth<=el.clientWidth),true,'Several campaign cards fit mobile width');
  await page.screenshot({path:path.join(out,'campaigns-'+language+'-'+width+'.png'),fullPage:true,animations:'disabled'});
  await open();await layer.locator('[data-lcw-action="manual"]').click();await choose('web');await field('webQuery').fill('unsaved');
  await page.evaluate(()=>confirmAnswer=false);await layer.locator('[data-lcw-action="close"]').click();assert.equal(await layer.isVisible(),true);
  await page.evaluate(()=>confirmAnswer=true);await layer.locator('[data-lcw-action="close"]').click();await layer.waitFor({state:'detached'});
  await page.locator('[data-lc-action="learn"]').click();await page.locator('[data-learn-close]').click();
  await page.locator('[data-lc-action="contracts-toggle"]').click();const editor=page.locator('.lc-contract-editor');await editor.waitFor();
  await editor.locator('[data-contract-field="limit"]').fill('8');await editor.locator('[data-contract-field="reward"]').fill('100');
  await page.evaluate(()=>dispatchEvent(new CustomEvent('live-campaigns:refresh',{detail:{appId:42}})));await page.waitForTimeout(300);
  assert.equal(await editor.locator('[data-contract-field="limit"]').inputValue(),'8','Pace refresh preserves unsubmitted contract terms');
  assert.match(await editor.locator('[data-contract-result="daily"]').innerText(),/65/);assert.match(await editor.locator('[data-contract-result="hold"]').innerText(),/35/);assert.match(await editor.locator('[data-contract-result="total"]').innerText(),/800/);
  await page.locator('[data-lc-action="contract-save"]').click();await page.waitForFunction(()=>document.querySelector('[data-lc-action="contracts-toggle"]').getAttribute('aria-checked')==='true');
  assert.equal(await page.locator('.lc-section').evaluate(el=>el.scrollWidth<=el.clientWidth),true);assert.equal(await editor.locator('[data-i18n="calculatorTitle"]').textContent(),language==='ru'?'Калькулятор $BUST':'$BUST calculator');await page.locator('[data-contract-details] summary').click();await page.screenshot({path:path.join(out,'contracts-'+language+'-'+width+'.png'),fullPage:true});
  await page.locator('[data-lc-action="contracts-toggle"]').click();await page.waitForFunction(()=>document.querySelector('[data-lc-action="contracts-toggle"]').getAttribute('aria-checked')==='false');
  if(!await page.locator('[data-lc-action="contract-withdraw"]').isVisible())await page.locator('[data-contract-details] summary').click();
  await page.locator('[data-lc-action="contract-withdraw"]').click();await page.waitForFunction(()=>!document.querySelector('[data-lc-action="contract-withdraw"]'));
  assert.equal(campaigns[0].contracts.limit,0,'Return unassigned budget after disabling Contracts');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('RU/EN 360/390: entry HUD, four steps, source isolation, media persistence, retry identity, templates, keyword guards, active capacity and slot purchase passed.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
