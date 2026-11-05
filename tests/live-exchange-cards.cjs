const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-exchange-cards-20261105');fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="\.\/([^"?]+)/g)].map(x=>x[1]);
function fixture(mode){
 const at='2026-11-05T02:00:00Z',terms={duration_days:14,install_source:'link',control_days:[1,7,14],reviews:{mode:'off'},queue_definition:{activity:{enabled:false}}};
 const leg=(id,mine)=>({id,mine,app_id:mine?200:100,state:'READY',timezone:'Asia/Bangkok',unlock_at:at,install_due_at:'2026-11-06T00:20:00Z',install_window_seconds:86400,sla_active_seconds:6000,terms:structuredClone(terms),dropoff_risk:{cancel_allowed:false}});
 const r={offer_id:7,owner_id:1,proposer_id:2,target_app_id:100,proposer_app_id:200,target_app_name:'Firefox',proposer_app_name:'OneNote',status:'accepted',as_of:at,project_phases:[{app_id:100,name:'Firefox',phase:'live',market:{tier:2}},{app_id:200,name:'OneNote',phase:'live',market:{tier:3}}],partner:{app_id:200,name:'OneNote',package_name:'com.example.onenote',phase:'live',market:{tier:3},owner:{username:'dev_mira',reliability_index:94,contribution_score:57}},deal:{revision:1,can_accept:false,asymmetric:false,balancing_bust:0,target:{...terms,campaign_id:5},proposer:{...terms,campaign_id:6}},legs:[leg(20,true),leg(10,false)]};
 if(mode==='incoming'){r.status='pending';r.legs=[];r.deal.can_accept=true;}
 if(mode==='queued'){r.legs[0].state='SCHEDULED_COOLDOWN';r.legs[0].unlock_at='2026-11-05T04:59:58Z';}
 if(mode==='ready'){r.legs[1].state='INSTALLED';r.legs[1].confirmed_at=at;}
 if(mode==='waiting_partner'||mode==='peer_queued'||mode==='complete'||mode==='expired_peer'||mode==='assist'){
  r.legs[0].state='INSTALLED';r.legs[0].confirmed_at=at;r.legs[0].install_due_at='2026-11-04T11:01:00Z';
 }
 if(mode==='peer_queued'){r.legs[1].state='SCHEDULED_COOLDOWN';r.legs[1].unlock_at='2026-11-05T04:59:58Z';r.legs[1].early_start_allowed=true;r.legs[1].early_start_owner=true;}
 if(mode==='complete'){r.legs[1].state='INSTALLED';r.legs[1].confirmed_at=at;}
 if(mode==='expired_peer'){r.legs[1].sla_active_seconds=86401;r.legs[1].dropoff_risk.cancel_allowed=true;}
 if(mode==='assist')r.legs[1].state='KEYWORD_ASSIST_PENDING';
 if(mode==='bridge'){r.project_phases[1].phase='testing';r.partner.phase='testing';r.partner.day=4;r.legs[0].terms.control_days=[1,4,7,10,14];r.legs[1].terms.control_days=[1];}
 if(mode==='pro'){r.status='pending';r.legs=[];r.deal.can_accept=true;r.deal.revision=2;r.deal.asymmetric=true;r.deal.balancing_from='proposer';r.deal.balancing_bust=80;r.deal.target={...terms,duration_days:21,install_source:'keywords',control_days:[1,8,14,21],review_mode:'required',activity:{enabled:true,title:'Знакомство / Explore',instructions:'Complete the first action'}};}
 return r;
}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});
try{for(const lang of ['ru','en'])for(const width of [360,390,430]){
 const page=await browser.newPage({viewport:{width,height:1000}}),errors=[],posts=[];let current=fixture('incoming'),failAccept=false;
 page.on('pageerror',err=>errors.push(err.message));
 await page.route('http://exchange.test/**',async route=>{const req=route.request(),u=new URL(req.url());
  if(u.pathname.startsWith('/api/')){if(req.method()==='POST')posts.push({path:u.pathname,body:req.postDataJSON()});if(failAccept&&u.pathname.endsWith('/accept')){failAccept=false;return route.fulfill({status:409,json:{code:'revision_changed'}});}return route.fulfill({json:{status:'success',result:u.pathname==='/api/live-exchanges'?[current]:current}});}
  if(u.pathname.startsWith('/icon/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="'+(u.pathname.includes('firefox')?'#ed704c':'#8747b7')+'"/><text x="32" y="44" text-anchor="middle" font-family="sans-serif" font-size="40" fill="white">'+(u.pathname.includes('firefox')?'F':'N')+'</text></svg>'});
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:10px;background:#0e141b;color:#e8edf7;font-family:Arial"><section id="tab-tests" class="active"><div id="live-exchanges-slot"></div><article id="test-card-200">Daily task</article></section></body></html>'});
 });
 await page.goto('http://exchange.test/');for(const f of styles)await page.addStyleTag({path:path.join(root,f)});
 for(const f of ['i18n/ru.js','i18n/en.js','i18n/live-campaign-wizard.js','i18n/core.js','ui/ui-helpers.js','js/live-market-ui.js','js/live-deal-ui.js','js/live-queue-ui.js','js/live-exchanges.js'])await page.addScriptTag({path:path.join(root,f)});
 await page.evaluate(lang=>{window.lang=lang;window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed-test';window.tg={initDataUnsafe:{user:{id:1}}};window.myProjects=[{id:100,name:'Firefox',phase:'live',icon_url:'http://exchange.test/icon/firefox.svg'}];window.myTests=[{id:200,name:'OneNote',icon_url:'http://exchange.test/icon/note.svg'}];window.refreshMyTestsNow=async()=>{};window.openCheckinProofUploadModal=id=>window.uploadedApp=id;window.LiveCampaigns={requestKey:()=>crypto.randomUUID()};LiveExchanges.mount();},lang);
 const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.lx-card,.lx-comparison')].every(el=>el.scrollWidth<=el.clientWidth+1)),'No horizontal overflow');
 async function state(mode){current=fixture(mode);await page.evaluate(()=>LiveExchanges.load(true));await page.waitForFunction(()=>!document.querySelector('[data-lx-refresh]').disabled);await fit();}
 for(const mode of ['incoming','queued','ready','waiting_partner']){
  await state(mode);const card=page.locator('.lx-card-v2');assert.equal(await page.locator('[data-lx-detail]').count(),0);
  assert.equal(await card.locator('h3').count(),2);assert.equal((await card.innerText()).match(/Firefox/g).length,1);assert.equal((await card.innerText()).match(/OneNote/g).length,1);
  assert.equal(await page.locator('[data-lx-clock]').count(),mode==='incoming'?0:1,'One current timer');
  assert.doesNotMatch(await card.innerText(),/Редакция|Revision|Активное время ответственности|Active responsibility|undefined|NaN/);
  assert.equal(await card.locator('.lx-equal').count(),1,'Symmetric terms have one shared strip');
  if(mode==='incoming')assert.equal(await page.locator('[data-lx-action=accept]').count(),1);
  if(mode==='queued'){assert.equal(await page.locator('[data-lx-action=start]').count(),0);assert.match(await page.locator('[data-lx-clock]').innerText(),/02:59:5\d/);}
  if(mode==='ready'){assert.equal(await page.locator('.lx-partner-installed').count(),1);assert.match(await page.locator('[data-lx-clock]').innerText(),/22.*20/);await page.locator('[data-lq-hint]').click();assert.equal(await page.locator('.lm-sheet-overlay').count(),1);await page.keyboard.press('Escape');}
  if(mode==='waiting_partner'){assert.equal(await page.locator('[data-lx-action=start],[data-lx-action=proof]').count(),0);assert.doesNotMatch(await card.innerText(),/11:01/);}
  await page.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();});
  await card.screenshot({path:path.join(out,mode+'-'+lang+'-'+width+'.png')});
 }
 await state('bridge');assert.match(await page.locator('.lx-terms-reason').innerText(),/Live/);assert.equal(await page.locator('.lx-term.is-different[data-lx-term=checkpoints]').count(),2);assert.match(await page.locator('.lx-phase').last().innerText(),/4\/14/);
 await state('pro');assert.equal(await page.locator('.lx-counter-badge').count(),1);assert.match(await page.locator('.lx-payment').innerText(),/80.*BUST/);assert.match(await page.locator('.lx-payment').innerText(),lang==='ru'?/вам/:/to you/);await fit();
 current.deal.balancing_from='target';await page.evaluate(()=>LiveExchanges.load(true));assert.match(await page.locator('.lx-payment').innerText(),lang==='ru'?/Ваша доплата/:/Your payment/);current.deal.balancing_from='proposer';
 await page.locator('[data-lx-action=accept]').click();await page.waitForFunction(()=>!document.querySelector('[data-lx-action=accept]')?.disabled);assert.equal(posts.at(-1).body.revision,2);assert.equal(posts.at(-1).body.init_data,'signed-test');assert(!('actor_id' in posts.at(-1).body));
 failAccept=true;await page.locator('[data-lx-action=accept]').click();await page.waitForFunction(()=>!document.querySelector('[data-lx-action=accept]').disabled);assert((await page.locator('[data-lx-error]').innerText()).length>0,'Action error survives final render');await page.evaluate(()=>LiveExchanges.load(true));assert((await page.locator('[data-lx-error]').innerText()).length>0,'Polling keeps action error visible');await page.locator('[data-lx-action=accept]').click();await page.waitForFunction(()=>!document.querySelector('[data-lx-action=accept]').disabled);assert.equal(await page.locator('[data-lx-error]').innerText(),'','Successful retry clears action error');
 await state('peer_queued');assert.equal(await page.locator('[data-lq-early][data-lq-owner="1"]').count(),1);assert.equal(await page.locator('[data-lx-clock]').count(),1);current.legs[1].early_start_owner=false;await page.evaluate(()=>LiveExchanges.load(true));assert.equal(await page.locator('[data-lq-early]').count(),0,'Tester cannot release partner queue');
 await state('assist');assert.equal(await page.locator('[data-lx-clock]').count(),0,'Keyword assistance pauses installation SLA');
 await state('expired_peer');assert.equal(await page.locator('[data-lx-action=cancel]').count(),1);
 await state('complete');assert.equal(await page.locator('.lx-card-v2').count(),0,'Both installed: use ordinary task cards');assert(await page.evaluate(()=>LiveExchanges.managed(7)),'Legacy hooks still own completed startup');
 current.status='completed';await page.evaluate(()=>LiveExchanges.load(true));assert.equal(await page.locator('.lx-card-v2:visible').count(),0);assert.match(await page.locator('.lx-stage').textContent(),lang==='ru'?/Обмен завершён/:/Exchange completed/,'Finished history is not cancellation');
 await state('queued');await page.evaluate(()=>{window.savedDateNow=Date.now;Date.now=()=>savedDateNow()+86400000;});await page.waitForTimeout(1100);assert.match(await page.locator('[data-lx-clock]').innerText(),/02:59:5\d/,'Device date cannot change the server countdown');await page.evaluate(()=>Date.now=savedDateNow);
 await state('ready');current.legs[0].state='STARTED';await page.evaluate(()=>LiveExchanges.load(true));await page.locator('[data-lx-action=proof]').click();assert.equal(await page.evaluate(()=>uploadedApp),200,'Proof opens the canonical D1 upload');
 await page.locator('.lx-more summary').click();await page.evaluate(()=>LiveExchanges.load(true));assert(await page.locator('.lx-more').evaluate(el=>el.open),'Polling keeps expanded details');
 await page.evaluate(()=>LiveExchanges.detail(7));assert.equal(await page.locator('.lm-sheet-overlay').count(),0,'Deep link focuses the real card');
 assert.deepEqual(errors,[]);await page.close();
}}
finally{await browser.close();}
console.log('Exchange cards: four states × RU/EN × 360/390/430, one clock, Bridge/PRO, owner-only early start, canonical proof and preserved hooks passed.');
})().catch(e=>{console.error(e);process.exit(1);});
