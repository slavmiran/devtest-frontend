const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/live-card-unload');fs.mkdirSync(out,{recursive:true});
const metrics={source:'devtesthub_live',boundary_available:true,as_of:'2026-11-10T02:00:00Z',reviews:{total:0,rating:null,per_day:0,trend_percent:0,trend_available:false},installs:{total:32,per_day:1.1,trend_percent:85.7,trend_available:true},active_users:6,avg_retention_days:4,days_since_update:22,keywords:[],calibration:{working_sample_installs:20},health_score:74,health_delta:-6,early_exit_impact:{points_lost:12},pace_signals:{below_floor:true,below_floor_days:3,deficit_installs:3,trend_percent:-44,recovery_installs:8,completed_through:'2026-11-04',slices:[]}};
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let slots=7,bought=0;
  await page.route('http://card.test/**',route=>{const url=new URL(route.request().url());
   if(url.pathname.endsWith('/campaigns')&&route.request().method()==='GET')return route.fulfill({json:{status:'success',project_control:{revision:1,pool_available:160,wallet_balance:900,policy:{mode:'manual',paced:true,dailyInstalls:4,pauseHours:24,rampDays:0},parameters:{request_reviews:false,target_lang:'ALL',min_android_version:0,instructions:''},tier_event:{id:9,from_tier:2,to_tier:3,score:592},allocations:[]},pace:{paced:true,quota:5,admitted:2,accepting:true},capacity:{active:1,limit:3},campaigns:[{id:3,kind:'closed_bridge',status:'active',revision:1,control_days:[1,4,7,10,14],overlimit_cost:40,total_slots:slots,free_occupied:1,next_slot:slots+1,next_slot_price:700,request_reviews:false,target_lang:'ALL',min_android_version:0,instructions:'',additional_reports:[]}]}});
   if(url.pathname.endsWith('/buy-slot')){bought++;slots++;return route.fulfill({json:{status:'success',campaign:{id:3,kind:'closed_bridge',status:'active',revision:2,control_days:[1,4,7,10,14],overlimit_cost:40,total_slots:slots,free_occupied:1,next_slot:null,next_slot_price:0,wallet_balance:200,request_reviews:false,target_lang:'ALL',min_android_version:0,instructions:'',additional_reports:[]}}});}
   return route.fulfill({contentType:'text/html',body:'<main id="projects-list"></main><div id="pipeline-header"></div>'});
  });
  await page.goto('http://card.test/');
  for(const file of ['i18n/ru.js','i18n/en.js','i18n/live-campaigns.js','i18n/live-campaign-wizard.js','i18n/live-campaign-pace.js','i18n/live-campaign-edit.js','i18n/live-project-control.js','i18n/core.js','ui/ui-helpers.js','js/live-market-ui.js','js/live-pace-signals.js','js/live-project-metrics.js','js/project-parameters.js','js/project-contract-pricing.js','js/live-campaign-wallet.js','js/live-campaign-controls.js','js/live-project-control.js','js/live-campaign-growth-card.js','js/live-campaigns.js','ui/ui-projects-pipeline-header.js','js/project-workspace.js'])await page.addScriptTag({path:path.join(root,file)});
  for(const file of ['styles.css','css/project-parameters.css','css/live-campaigns.css','css/live-project-metrics.css','css/project-workspace.css'])await page.addStyleTag({path:path.join(root,file)});
  await page.addStyleTag({content:'body{margin:0;background:#111a26;color:#eff4fb}#projects-list{padding:8px}'});
  await page.evaluate(metrics=>{
   window.lang='ru';Object.assign(window.t,I18NRU);window.API_BASE='/api';window.getTelegramInitDataRaw=()=> 'signed';window.userId=7;window.confirm=()=>{throw Error('native confirm');};window.showToast=text=>{window.lastToast=text;};window.Telegram={WebApp:{HapticFeedback:{notificationOccurred(kind){window.haptic=kind;}}}};window.visibilityStats={balance_bust:900};
   window.myProjects=[{id:42,phase:'live',name:'[QA] VLC',live_market_score:{rank:12,tier:3,market_score:592,rank_delta:-2,score_delta:-18},live_metrics:metrics}];
   window.currentLang='ru';const card=document.createElement('article');card.className='card';card.id='project-card-42';card.innerHTML='<div class="card-header"><div class="card-subtitle">'+LiveProjectControl.statusHTML(myProjects[0])+'</div></div><div class="live-metrics-slot" data-app-id="42"></div>'+LiveCampaigns.build(myProjects[0]);
   document.getElementById('projects-list').append(card);card.querySelector('.live-metrics-slot').innerHTML=LiveProjectMetrics.render(myProjects[0]);LiveProjectMetrics.mount(card,myProjects[0]);LiveCampaigns.mount(card,myProjects[0]);
  },metrics);
  await page.locator('.lm-tier-line').waitFor();await page.locator('[data-lps-toggle]').waitFor();
  assert.equal(await page.locator('.lps-signal').count(),0);
  assert.equal(await page.locator('text=Уточняем статус проекта').count(),0);
  assert.equal(await page.locator('text=По завершённым UTC').count(),0);
  assert.match(await page.locator('.live-project-status').innerText(),/Темп ниже нормы/);
  assert.equal(await page.locator('[data-market-radar]').count(),0);
  assert.match(await page.locator('.lm-result-tile').first().innerText(),/#12 · Tier 3/);
  assert.match(await page.locator('.lm-result-tile').nth(1).innerText(),/74 \/ 100/);
  await page.locator('.lm-early-chip').click();
  assert.match(await page.locator('.lm-early-body').innerText(),/48 часов/);
  assert.equal(await page.evaluate(()=>/Дополнительная поправка/.test(window.lastToast||'')),false);
  await page.locator('[data-lm-early-close]').click();
  assert.equal(await page.locator('.lm-early-body').isHidden(),true);
  await page.locator('[data-lps-toggle]').click();
  assert.match(await page.locator('[data-lps-detail]').innerText(),/снизился на 44%/);
  assert.equal(await page.locator('[data-lps-detail] [data-lc-action="showcase"]').count(),1);
  assert.match(await page.locator('.lm-tier-line').innerText(),/Tier 2/);
  const fit=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);assert.equal(fit,true);
  await page.screenshot({path:path.join(out,`live-card-${width}.png`),fullPage:true});
  await page.locator('[data-campaign-id="3"] > summary, [data-campaign-id="3"] summary').first().click();
  await page.locator('[data-lc-action="buy"]').click();
  await page.locator('#lc-slot-sheet').waitFor();
  assert.match(await page.locator('.lc-slot-sheet').innerText(),/Ёмкость проекта: 7/);
  assert.equal(/контрольные дни/.test(await page.locator('.lc-slot-sheet').innerText()),false);
  await page.screenshot({path:path.join(out,`slot-sheet-${width}.png`)});
  if(width===390){await page.locator('[data-slot-buy]').click();await page.waitForFunction(()=>window.haptic==='success');assert.equal(bought,1);await page.locator('.lc-slot-plus').waitFor();await page.locator('.lc-slot-line').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'slot-success-390.png')});}
  else await page.locator('[data-slot-cancel]').click();
  assert.equal(errors.join('\n'),'');
 }
 const focus=await browser.newPage({viewport:{width:390,height:860}});
 await focus.route('http://card.test/**',route=>route.fulfill({contentType:'text/html',body:'<div id="pipeline-header"></div><main id="projects-list"></main>'}));
 await focus.goto('http://card.test/');
 for(const file of ['i18n/ru.js','i18n/en.js','i18n/core.js','ui/ui-helpers.js','ui/ui-projects-pipeline-header.js','js/project-workspace.js'])await focus.addScriptTag({path:path.join(root,file)});
 await focus.addStyleTag({path:path.join(root,'css/project-workspace.css')});
 await focus.addStyleTag({content:'body{margin:0;background:#111a26;color:#eff4fb}'});
 await focus.evaluate(()=>{
  window.lang='ru';window.currentLang='ru';window.userId=7;window.Telegram={WebApp:{initDataUnsafe:{user:{id:7}}}};localStorage.clear();
  window.myProjects=[{id:1,name:'Closed Notes',phase:'testing',status:'active',testers:[]},{id:7,name:'Предпродакшен VLC',phase:'moderation',status:'completed',feedback_new_count:2,results_summary:{text_reports:[{id:4,text:'Кнопка не жмётся'}],video_reports:[]},testers:[]}];
  const list=document.getElementById('projects-list');
  list.innerHTML='<section id="pipeline-section-testing"></section><section id="pipeline-section-moderation"></section><section id="pipeline-section-live"></section>';
  list.querySelector('#pipeline-section-testing').innerHTML='<article class="card" id="project-card-1" data-project-id="1" data-project-phase="testing"><h3 class="card-title">Closed Notes</h3></article>';
  list.querySelector('#pipeline-section-moderation').innerHTML='<article class="card card-moderation" id="project-card-7" data-project-id="7" data-project-phase="moderation"><h3 class="card-title">Предпродакшен VLC</h3></article>';
  localStorage.setItem('dth.projects.workspace.v1:7',JSON.stringify({pins:['1'],view:'cards',phases:[],restCollapsed:false,moderation:{}}));
  ProjectWorkspace.sync();
 });
 await focus.waitForSelector('#projects-focus-section #project-card-7');
 assert.equal(await focus.locator('#projects-focus-section #project-card-1').count(),1,'Pinned closed test stays in focus under five projects');
 assert.match(await focus.locator('#project-card-7').innerText(),/Новый фидбек|💬/);
 await focus.screenshot({path:path.join(out,'focus-moderation-390.png'),fullPage:true});
 await focus.locator('#project-card-1').evaluate(node=>node.insertAdjacentHTML('beforeend','<button type="button" data-pp-pin="1">pin</button>'));
 await focus.locator('[data-pp-pin="1"]').click();
 assert.equal(await focus.locator('#projects-focus-section #project-card-7').count(),1,'Unread moderation feedback opens focus without a pin');
 assert.equal(await focus.locator('#projects-focus-section #project-card-1').count(),0);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1);});
