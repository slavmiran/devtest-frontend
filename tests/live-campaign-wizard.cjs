const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.LIVE_TEST_ARTIFACTS||path.resolve(root,'../artifacts/live-corridor-20261027/wizard'));fs.mkdirSync(out,{recursive:true});
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=[...index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(m=>m[1]);
const bridge={id:3,app_id:42,kind:'closed_bridge',status:'active',total_slots:7,free_occupied:0,free_available:7,paid_active:0,overlimit_cost:40,pool_available:0,reserved_bust:0,next_slot:8,next_slot_price:350,revision:1,control_days:[1,4,7,10,14],request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:''};
const listing={title:'Orbit Budget Planner',genre:'Finance',summary:'Family budget and travel expenses',description:'Plan your family budget. Track daily expenses and manage travel costs.'};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQ0AAAAASUVORK5CYII=','base64');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const language of ['ru','en'])for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:850}}),errors=[],posts=[],edits=[],slotKeys=new Set();
  let campaigns=[structuredClone(bridge)],limit=3,nextId=10,failSave=false,failEdit=false,loseResponse=false,geoFailure=false;
  let projectControl={revision:1,pool_available:0,allow_wallet_spending:false,thermal_phase:{code:'stabilizing',B_t:10,L_floor:3,U_opt:20,today_installs_utc:1,stabilization_days_remaining:5,peak_window_days_remaining:1,trend_percent:40},corridor:{day:'2026-10-27',B_t:10,L_floor:3,U_opt:20},auto_daily_cost_bust:0,policy:{mode:'manual',paced:true,dailyInstalls:4,pauseHours:24,rampDays:0,allowContractsDuringPause:true},parameters:{request_reviews:true,target_lang:'ALL',min_android_version:0,instructions:''},allocations:[{campaign_id:3,kind:'closed_bridge',status:'active',limit:1}]};
  const capacity=()=>({active:campaigns.filter(c=>c.kind!=='closed_bridge'&&c.status==='active').length,limit,next_slot:limit+1,next_price:(limit-1)*1000});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://fixture.local/**',async route=>{
   const url=new URL(route.request().url()),request=route.request(),method=request.method(),body=method==='GET'?null:request.postDataJSON();
   const ok=json=>route.fulfill({json:{status:'success',...json}});
   if(url.pathname.endsWith('/live-community/snapshot'))throw Error('Campaign builder must not load community metrics');
   if(url.pathname.endsWith('/project-feedback-settings'))return ok({result:{impression:{mode:'voluntary',bonus:50,day:null},mutual_campaigns:0}});
   if(url.pathname.endsWith('/review-credits'))return ok({wallet:{available:22.25}});
   if(url.pathname.endsWith('/priority')){const c=campaigns.find(c=>url.pathname.includes('/'+c.id+'/'));assert.ok(c);c.route_priority=body.enabled;return ok({});}
   if(url.pathname.endsWith('/stats/countries'))return geoFailure?route.fulfill({status:503,json:{status:'error'}}):ok({countries:[{country_code:'RU',name_ru:'Россия',name_en:'Russia',flag:'🇷🇺',total_count:100,active_count:40},{country_code:'KZ',name_ru:'Казахстан',name_en:'Kazakhstan',flag:'🇰🇿',total_count:6,active_count:2},{country_code:'TH',name_ru:'Таиланд',name_en:'Thailand',flag:'🇹🇭',total_count:20,active_count:0},{country_code:'US',name_ru:'США',name_en:'United States',flag:'🇺🇸',total_count:10,active_count:1},{country_code:'VN',name_ru:'Вьетнам',name_en:'Vietnam',flag:'🇻🇳',total_count:9,active_count:2}],total_registered:145,total_active:45});
   if(url.pathname.endsWith('/users/me/google-play-country'))throw Error('Campaign GEO must not change the owner profile');
   if(url.pathname.endsWith('/campaigns')&&method==='GET')return ok({campaigns,project_control:{...projectControl,allocations:campaigns.map(c=>({campaign_id:c.id,kind:c.kind,name:c.name,status:c.status,source:c.definition&&c.definition.source,limit:c.cycle_limit||null}))},capacity:capacity(),pace:{needed:1,policies:[]},hud:{last_screenshot_at:new Date(Date.now()-2*3600000).toISOString(),on_schedule_percent:75,active_testers:4}});
   if(url.pathname.endsWith('/campaigns')&&method==='POST'){
    posts.push(body);if(failSave)return route.fulfill({status:503,json:{status:'error',code:'unavailable'}});
    const replay=campaigns.find(c=>c.create_token===body.request_key);if(replay)return ok({campaign:replay});
    assert.ok(body.project_control);projectControl.policy=body.project_control.policy;projectControl.revision++;const c={id:nextId++,app_id:42,kind:'custom',create_token:body.request_key,status:body.status,revision:1,name:body.definition.name,definition:body.definition,cycle_limit:body.project_control.own_limit,confirmed_installs:0,keywords:body.definition.keywords.map((k,i)=>({...k,id:i+1,enabled:k.enabled!==false,asset_id:k.screenshot?9:null,installs:0}))};c.definition=structuredClone(c.definition);(c.definition.activity.steps||[]).forEach(s=>{if(s.media)s.media.asset={asset_id:8};});campaigns.push(c);if(loseResponse){loseResponse=false;return route.fulfill({status:503,json:{status:'error',code:'unavailable'}});}return ok({campaign:c});
   }
   const editing=url.pathname.match(/\/campaigns\/(\d+)\/definition$/);
   if(editing){edits.push(body);if(failEdit)return route.fulfill({status:503,json:{status:'error',code:'unavailable'}});const c=campaigns.find(c=>c.id===Number(editing[1]));assert.equal(body.revision,c.revision);c.definition=structuredClone(body.definition);(c.definition.activity.steps||[]).forEach(s=>{if(s.media)s.media.asset={asset_id:8};});c.name=body.definition.name;c.keywords=body.definition.keywords.map((k,i)=>({...k,id:i+1,enabled:k.enabled,asset_id:k.screenshot&&k.screenshot.asset_id,installs:0}));c.revision++;return ok({campaign:c});}
   if(url.pathname.includes('/assets/'))return route.fulfill({contentType:'image/png',body:png});
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
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/live-campaign-wizard.js','i18n/live-campaign-pace.js','i18n/live-campaign-edit.js','i18n/live-campaign-geo.js','i18n/live-project-control.js','i18n/live-guidance.js','i18n/live-smart-pro.js','i18n/live-pace-forecast.js','i18n/core.js','ui/ui-helpers.js','js/project-parameters.js','js/project-contract-pricing.js','js/live-campaign-keywords.js','js/live-campaign-traffic.js','js/live-market-ui.js','js/project-feedback.js','js/live-contracts.js','js/review-credits.js','js/live-pace-forecast.js','js/live-manual-plan.js','js/live-campaign-pace.js','js/live-campaign-pace-view.js','js/live-campaign-learning.js','js/live-scenario-editor.js','js/live-campaign-draft.js','js/live-campaign-wizard-media.js','js/live-campaign-wizard-view.js','js/country-catalog.js','js/showcase-geo.js','js/live-campaign-geo.js','js/live-campaign-sources-view.js','js/live-community.js','js/live-campaign-entry.js','js/live-campaign-wizard.js','js/live-campaign-growth-card.js','js/live-campaign-wallet.js','js/live-campaign-controls.js','js/live-project-control.js','js/live-campaign-growth-card.js','js/live-campaigns.js','js/app-navigation.js'])await page.addScriptTag({path:path.join(root,file)});
  await page.evaluate(({language,index})=>{
   const ref=new DOMParser().parseFromString(index,'text/html').querySelector('#add-bounty-settings');const holder=document.createElement('div');holder.hidden=true;holder.appendChild(ref);document.body.appendChild(holder);
   const dom=new DOMParser().parseFromString(index,'text/html');['showcase-geo-picker-modal','showcase-geo-list-modal'].forEach(id=>document.body.appendChild(dom.getElementById(id)));
   window.lang=language;window.API_BASE='/api';window.signed='owner-42';window.getTelegramInitDataRaw=()=>signed;
   window.confirmations=[];window.confirmAnswer=false;window.showToast=m=>window.lastToast=m;
   window.tg={initData:'fixture',BackButton:{show(){},hide(){},onClick(fn){this.callback=fn;}},showConfirm(message,cb){confirmations.push(message);cb(confirmAnswer);},openLink(url){window.openedUrl=url;}};
   window.myProjects=[{id:42,phase:'live',name:'Internal project name',live_metrics:{source:'devtesthub_live',boundary_available:true,installs:{per_day:10}}}];
   window.revoked=[];const revoke=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
   Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.copiedQuery=value}});
   const card=document.createElement('div');card.className='card';card.innerHTML=LiveCampaigns.build(myProjects[0]);document.querySelector('#projects-list').append(card);LiveCampaigns.mount(card,myProjects[0]);initTelegramBackButton();
  },{language,index});
  const layer=page.locator('#live-campaign-wizard'),canvas=layer.locator('.lcw-scroll'),drawer=layer.locator('.bp-sheet');
  const field=f=>drawer.locator('[data-lcw-input="'+f+'"]');
  const block=id=>canvas.locator('[data-lcw-action="step"][data-step="'+id+'"]').click();
  const done=()=>drawer.locator('footer [data-lcw-action="done"]').click();
  const save=()=>layer.locator('[data-lcw-action="save"]').click();
  const screenshot=async name=>{
   const viewport=page.viewportSize();
   await page.setViewportSize({...viewport,height:960});
   await (await drawer.isVisible()?drawer.locator('.bp-sheet-body'):canvas).evaluate(el=>el.scrollTop=0);
   await page.screenshot({path:path.join(out,name+'-'+language+'-'+width+'.png'),animations:'disabled'});
   await page.setViewportSize(viewport);
  };
  const fit=async()=>{
   for(const item of [layer,canvas,...await drawer.locator('.bp-sheet-body').all()]){
    assert.equal(await item.evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,'Screen remains inside the viewport');
   }
   assert.equal(await layer.locator('.gtw-header').evaluate(el=>{
    const title=el.querySelector('.lcw-header-center').getBoundingClientRect(),buttons=el.querySelector('.lcw-header-actions').getBoundingClientRect();
    return title.right<=buttons.left+1&&buttons.right<=innerWidth;
   }),true);
   if(await drawer.isVisible())assert.equal(await drawer.locator('h2').evaluate(el=>{
    const box=el.getBoundingClientRect();
    return !!document.elementFromPoint(box.x+5,box.y+5)?.closest('.bp-sheet');
   }),true,'Sheet header stays above the canvas header');
  };

  await page.locator('[data-lc-action=create]').click();
  await layer.locator('[data-bp-wallet]').getByText(/22[.,]3|22[.,]25/).waitFor();
  assert.equal(await canvas.locator('.bp-node').count(),4);
  assert.equal(await canvas.locator('.lc-community').count(),0);
  assert.equal(await canvas.locator('[data-lcw-field="preferredSource"]').count(),0);
  await fit();await screenshot('blueprint_initial');
  await layer.locator('.lcw-learn-btn').click();
  await page.locator('#live-campaign-learning').waitFor();
  await page.evaluate(()=>tg.BackButton.callback());
  await page.locator('#live-campaign-learning').waitFor({state:'detached'});
  await canvas.locator('[data-lcw-template="aso"]').click();
  assert.equal(posts.length,0,'Templates only fill the draft');
  assert.equal(await canvas.locator('.bp-node').count(),4);
  await canvas.locator('[data-lcw-template="retention"]').click();
  assert.match(await canvas.locator('.bp-timeline').innerText(),/D28/);
  await canvas.locator('[data-lcw-template="custom"]').click();
  await canvas.locator('[data-lcw-template="deep"]').click();

  await block(1);
  assert.equal(await layer.locator('.lcw-page').evaluate(el=>el.inert),true);
  await drawer.locator('[data-lcw-field="allowedSource"][data-value="keywords"]').click();
  assert.equal(await drawer.locator('[data-lcw-action="next"]').isDisabled(),true);
  await field('manualKey').fill('family budget');await field('manualKey').press('Enter');
  assert.equal(await drawer.locator('[data-keyword-row]').count(),1);
  await drawer.locator('[data-lcw-file="keyword:k1"]').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:png});
  await drawer.locator('.lcw-attachment figure').waitFor();
  await drawer.locator('[data-lcw-action="geo"]').click();
  await page.locator('#showcase-geo-picker-modal.active').waitFor();
  await page.locator('#showcase-geo-search').fill('KZ');
  await page.locator('#showcase-geo-options [data-geo-code="KZ"]').click();
  await done();
  assert.match(await canvas.innerText(),/Казахстан|Kazakhstan/);
  const keywordDefault=canvas.locator('[data-lcw-field="preferredSource"][data-value="keywords"]');
  await keywordDefault.click();
  assert.equal(await keywordDefault.getAttribute('aria-pressed'),'true');

  await block(3);
  await field('scenarioTitle').fill(language==='ru'?'Проверка бюджета':'Budget workflow');
  await field('scenarioLimit').fill('8');
  await drawer.locator('[data-lse-field="text"]').first().fill(language==='ru'?'Создать семейный бюджет':'Create a family budget');
  await fit();await screenshot('blueprint_scenario');
  await drawer.locator('[data-lcw-action="next"]').click();
  await drawer.locator('[data-pf-campaign-mutual]').check();
  assert.equal(await drawer.locator('[data-pf-field]').count(),0,'Campaigns cannot override project mode, bonus or opening day');
  await done();

  await block(2);
  await drawer.locator('[data-lcw-range="7:28"]').click();
  await drawer.locator('[data-lcw-field="retention"][data-value="21"]').click();
  assert.equal(await field('retention').inputValue(),'21');
  assert.match(await drawer.locator('[data-bp-timeline]').innerText(),/D17.*|D21/);
  await fit();
  await drawer.locator('[data-bp-timeline]').scrollIntoViewIfNeeded();
  await screenshot('blueprint_timeline');
  await page.evaluate(()=>tg.BackButton.callback());
  await drawer.waitFor({state:'hidden'});
  await canvas.locator('[data-lcw-field="retention"][data-value="28"]').click();
  assert.match(await canvas.locator('.bp-timeline').innerText(),/D24[\s\S]*D28/);

  await block(4);
  await field('name').fill('Orbit QA');
  await drawer.locator('[data-ct-enable]').click();
  await drawer.locator('[data-ct-field="daily_rate_bust"]').fill('18');
  await done();
  await canvas.locator('[data-lcw-field="routePriority"]').click();
  await fit();await screenshot('blueprint_configured');
  assert.equal(await layer.locator('.rv-config-summary,.lcw-growth-wallet').count(),0);
  failSave=true;
  await save();await layer.locator('.lcw-footer [role="alert"]').waitFor();
  failSave=false;await save();await layer.waitFor({state:'detached'});
  assert.equal(posts.length,2);
  assert.equal(posts[0].request_key,posts[1].request_key);
  const d=posts[1].definition;
  assert.deepEqual(d.preferred_track,{source:'keywords',days:28});
  assert.equal(d.impression_mutual,true);
  assert.equal(d.impression,undefined);
  assert.equal(d.reviews.enabled,false);
  assert.equal(d.activity.title,language==='ru'?'Проверка бюджета':'Budget workflow');
  assert.equal(d.activity.execution_limit,8);
  assert.equal(d.contracts.daily_rate_bust,18);
  assert.equal(campaigns.find(row=>row.name==='Orbit QA').route_priority,true);
  await page.evaluate(()=>LiveCampaignWizard.edit(42,myProjects[0].live_campaign_rows.find(c=>c.name==='Orbit QA')));
  await layer.waitFor();
  assert.equal(await canvas.locator('.bp-template-rail').count(),0);
  assert.equal(await canvas.locator('[data-lcw-field="preferredSource"][data-value="keywords"]').getAttribute('aria-pressed'),'true');
  await canvas.locator('[data-lcw-field="routePriority"]').click();
  await save();await layer.waitFor({state:'detached'});
  assert.equal(edits.length,1);
  assert.equal(campaigns.find(row=>row.name==='Orbit QA').route_priority,false);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Campaign blueprint passed: RU/EN 360/390/430, all editors, sources, track timeline, timing, media, save/retry and priority.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
