const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {marketFixture}=require('./fixtures/live-market-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/market-upgrade-20261103/market');fs.mkdirSync(out,{recursive:true});
function decorate(row){return {...row,package_name:'com.example.notes',icon_url:'https://cdn.fixture/icon.svg',
 passport:{title:row.name,category:'Productivity',content_type:'app',app_size_text:'24 MB',description:'Plan notes. <script>Never execute</script>',rating:4.6,ratings:120,
 screenshots_preview:['https://cdn.fixture/screen.svg']},owner_public:{username:'developer',reliability_index:94,karma:26.9,contribution_score:57,bugs_count:3,ideas_count:2,play_reviews_count:4,five_screens_count:5,text_reports_count:6,video_reports_count:7},owner_activity:{status:'online',hours_ago:2}};}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const lang of ['ru','en'])for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[],queries=[],feedReads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(lang=>{window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:lang}},themeParams:{},colorScheme:'dark',expand(){},ready(){},onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(fn){window.tgBack=fn;},offClick(){}}}};},lang);
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='cdn.fixture')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="260"><rect width="160" height="260" rx="20" fill="#37b9a2"/><text x="32" y="140" fill="white" font-size="40">N</text></svg>'});
   if(url.pathname==='/api/live-market/snapshot'){
    queries.push(Object.fromEntries(url.searchParams));const data=marketFixture(40,url.searchParams,true);
    const league={};for(let tier=1;tier<=5;tier++){league[String(tier)]=data.ranking.filter(p=>p.scoring.tier===tier).slice(0,10);if(tier<=2)league[String(tier)]=[{...decorate(marketFixture(40,new URLSearchParams(),true).ranking[0]),app_id:9000+tier,own:false,scoring:{...marketFixture(40,new URLSearchParams(),true).ranking[0].scoring,market_score:1050-tier*200,tier}}];}
    data.league_previews=league;data.league_totals=Object.fromEntries(Object.entries(league).map(([k,v])=>[k,v.length]));
    if(url.searchParams.get('tier_group')){data.ranking=league[url.searchParams.get('tier_group')]||[];data.queue=data.ranking.filter(p=>!p.own);}
    if(url.searchParams.has('app_id'))data.ranking=[decorate({...marketFixture(40,new URLSearchParams(),true).ranking[1],app_id:Number(url.searchParams.get('app_id'))})];
    for(const k of ['ranking','queue','radar'])data[k]=data[k].map(decorate);
    if(url.searchParams.get('search'))for(const k of ['ranking','queue'])data[k]=data[k].filter(p=>p.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase()));
    return route.fulfill({json:data});
   }
   if(/^\/api\/(feed\/(mutual|bounty)\/|guest-apps$)/.test(url.pathname)){feedReads.push(url.pathname);assert.equal(url.searchParams.get('init_data'),'signed-fixture','Legacy market reads must carry the signed actor');}
   if(url.pathname.startsWith('/api/'))return route.fulfill({json:{status:'success',projects:[],tests:[],result:[],countries:[]}});
   if(url.hostname!=='fixture.local')return route.fulfill({contentType:'application/javascript',body:''});
   const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));assert(file.startsWith(root+path.sep));
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://fixture.local/',{waitUntil:'load'});
  await page.waitForSelector('#no-username-overlay.active');
  await page.evaluate(lang=>{
   document.getElementById('no-username-overlay').classList.remove('active');document.getElementById('no-username-overlay').style.display='none';
   window.lang=lang;window.API_BASE='/api';window.userId=880;window.getTelegramInitDataRaw=()=> 'signed-fixture';
   window.myProjects=[{id:42,name:'My Notes',phase:'live',status:'active'},{id:110,name:'Other Notes',phase:'live',status:'active'}];window.myTests=[];
   const make=(id,extra={})=>({id,app_id:id,name:'Closed Notes '+id,package_name:'com.example.notes',owner_id:881,owner_full_name:'Developer',owner_username:'developer',status:'active',phase:'testing',current_day:11,limit_mutual:12,mutual_testers_count:4,target_lang:'ALL',test_mode:'google_group',...extra});
   window.mutualSeeking=Array.from({length:9},(_,i)=>make(1000+i));window.mutualReturns=[make(1020)];window.mutualPrelaunch=[make(1021)];window.mutualIsolated=[make(1022,{showcase_read_only:true})];window.bountyContracts=[make(1030,{bounty_per_tester:160,limit_bounty:3})];window.guestProjects=[{id:'4c3e5189-c424-4929-ab2e-63adf648cd39',name:'Guest Notes',package_name:'com.example.guest',owner_username:'guest',owner_telegram_id:882,category:'game'}];
   document.querySelectorAll('.tab-content').forEach(n=>n.classList.remove('active'));document.getElementById('tab-market').classList.add('active');
   window.ShowcaseGeo.openPicker=o=>o.onChoose('TH');LiveMarket.mount(true);
  },lang);
  await page.waitForSelector('.mk-shelf .mk-card');
  await page.waitForFunction(()=>!document.querySelector('.mk-empty[role=status]'));
  const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
  assert.equal(await page.locator('#live-market-legacy').evaluate(n=>n.tagName),'DIV');
  assert.equal(await page.locator('.mk-radar-capsule').getAttribute('open'),null);
  const rect=await page.locator('.mk-radar-capsule').boundingBox();assert(rect.height<=70);
  assert.equal(await page.locator('.mk-shelf').count(),9);assert.equal(await page.locator('.mk-card.is-priority[data-mk-project="app:42"]').count(),1);assert(await page.locator('.mk-card.is-own:not(.is-priority)').count()>0);assert(await page.locator('.mk-card').first().isVisible());
  assert((await page.locator('.mk-card').first().boundingBox()).y<700,'Apps on the first screen');
  const peek=await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>({w:n.clientWidth,page:n.firstElementChild.offsetWidth,total:n.scrollWidth}));
  assert(peek.page<peek.w*.95&&peek.page>peek.w*.8&&peek.total>peek.w,'Visible next-column peek');
  await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>n.scrollTo({left:n.firstElementChild.offsetWidth+12}));await page.waitForTimeout(200);assert(await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>n.scrollLeft>0));
  assert.equal(await page.locator('#showcase-active-tests').evaluate(n=>n.parentElement.id),'tab-market');
  const shelfOrder=await page.locator('#market-storefront > [data-mk-shelf], #market-storefront > .mk-live-leagues').evaluateAll(nodes=>nodes.map(n=>n.dataset.mkShelf||'live-leagues'));
  assert.deepEqual(shelfOrder,['returns','recommended','contracts','sandbox','live-leagues']);
  const pillBox=await page.locator('.mk-own-pills button').first().boundingBox();assert(pillBox.height<=36,'Project pills stay compact');
  assert.equal(await page.locator('[data-mk-shelf=recommended] .mk-page').first().locator('.mk-card').count(),4);
  const pillStyle=await page.locator('.mk-own-pills button').first().evaluate(el=>{const cs=getComputedStyle(el),r=el.getBoundingClientRect();return {w:r.width,h:r.height,display:cs.display,height:cs.height,minHeight:cs.minHeight,padding:cs.padding,whiteSpace:cs.whiteSpace};});
  assert(pillStyle.h<=36&&pillStyle.whiteSpace==='nowrap',JSON.stringify(pillStyle));
  await page.locator('[data-mk-shelf=recommended]>header').evaluate(n=>n.scrollIntoView({block:'center'}));
  await page.locator('[data-mk-rec-info]').click();await page.waitForSelector('.lm-sheet .mk-rec-info');await page.keyboard.press('Escape');
  await page.locator('[data-mk-rec-tab=closed]').click();await page.locator('[data-mk-rec-tab=all]').click();
  await page.locator('[data-mk-shelf=recommended]>header').evaluate(n=>n.scrollIntoView({block:'center'}));
  await page.screenshot({path:path.join(out,`recommended-${lang}-${width}.png`)});
  await page.evaluate(()=>scrollTo(0,0));
  await fits();await page.screenshot({path:path.join(out,`market-${lang}-${width}.png`),fullPage:true});
  await page.locator('.mk-radar-symbol').click();assert.equal(await page.locator('.mk-radar-capsule .lm-factor').count(),6);
  assert.equal(await page.locator('[data-lm-radar],.mk-priority-select').count(),0);await fits();await page.screenshot({path:path.join(out,`radar-${lang}-${width}.png`)});
  await page.locator('.mk-radar-symbol').click();
  await page.locator('[data-mk-shelf="3"] .mk-card').first().click();await page.waitForSelector('.lm-sheet .mk-passport');
  assert.equal(await page.locator('.mk-gallery img').count(),1);assert.equal(await page.locator('.mk-contribution>div span').count(),6);
  assert(await page.locator('.lm-sheet .lr-task-card').count()>0);assert.doesNotMatch(await page.locator('.lm-sheet').innerText(),/①|②|③|④|⑤|Все страны кампании|All campaign countries/);
  await page.locator('.lm-sheet .lm-task').first().screenshot({path:path.join(out,`task-card-${lang}-${width}.png`)});
  await page.locator('.mk-contribution>summary').click();await fits();await page.screenshot({path:path.join(out,`about-${lang}-${width}.png`)});
  await page.locator('.mk-shot').click();await page.waitForSelector('#feedback-image-overlay .fb-slider-image');assert.equal(await page.locator('.lm-sheet').count(),1);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('feedback-image-overlay'));assert.equal(await page.locator('.lm-sheet').count(),1,'Closing a screenshot returns to the open About sheet');
  await page.keyboard.press('Escape');assert.equal(await page.locator('.lm-sheet').count(),0);
  await page.locator('[data-mk-shelf=sandbox] .mk-card').first().click();assert(await page.locator('.lm-sheet .market-card').count()>0,'Original Closed interaction card reused');await page.keyboard.press('Escape');
  await page.locator('[data-mk-all=sandbox]').click();await page.waitForSelector('.mk-full-list');assert.equal(await page.locator('.mk-shelf').count(),0);
  assert(await page.locator('.mk-full-list .mk-card').count()>=9);await page.locator('[data-mk-project="guest:4c3e5189-c424-4929-ab2e-63adf648cd39"]').click();assert.equal(await page.locator('.lm-sheet .guest-market-card').count(),1,'UUID guests retain their existing invitation handler');await page.evaluate(()=>handleAppBack());assert.equal(await page.locator('.lm-sheet').count(),0,'Telegram Back closes About without changing participation');await page.locator('[data-mk-project="guest:4c3e5189-c424-4929-ab2e-63adf648cd39"]').click();await page.locator('.lm-sheet .guest-project-cta-btn:not(.guest-project-cta-fast)').click();await page.waitForSelector('#guest-invite-modal.active');assert.equal(await page.locator('.lm-sheet').count(),0,'About must hand off before the original invitation modal');await page.evaluate(()=>closeGuestInviteModal());await fits();
  await page.evaluate(()=>scrollTo(0,0));await page.locator('[data-mk-search]').fill('Orbit Notes 100');await page.waitForTimeout(600);assert.equal(await page.locator('[data-mk-search]').inputValue(),'Orbit Notes 100');
  assert.equal(await page.locator('[data-mk-search]').evaluate(n=>n===document.activeElement),true,'Search focus survives server render');assert(queries.some(q=>q.search==='Orbit Notes 100'));
  await page.locator('[data-mk-search]').fill('');await page.waitForTimeout(600);
  await page.locator('[data-mk-section=live]').click();await page.locator('[data-mk-league-all="1"]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.tier==='1'));
  await page.locator('[data-mk-geo]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.country==='TH'));
  await page.locator('.mk-filter-hub').click();await page.locator('[data-mk-author-choice="reliability"][data-mk-value="95"]').click();await page.locator('[data-mk-author-apply]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.min_reliability==='95'));
  await page.locator('[data-mk-menu=reviews]').click();await page.locator('[data-mk-choice=not_required]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.review_filter==='not_required'));
  await page.locator('.mk-controls').screenshot({path:path.join(out,`filters-active-${lang}-${width}.png`)});
  await page.locator('[data-mk-clear-all]').click();
  await page.evaluate(()=>{window.capturedToasts=[];window.showToast=text=>capturedToasts.push(text);showCheckinRewardToasts({already_checked_today:true,earned_contribution:2});showCheckinRewardToasts({already_checked_today:true,earned_contribution:0});});
  const receipts=await page.evaluate(()=>capturedToasts);assert.match(receipts[0],/\+2/);assert.doesNotMatch(receipts[1],/\+2/);
  await page.evaluate(async()=>{resetMarketFetchThrottle();await Promise.all([loadMutualFeed(),loadBountyFeed(),loadGuestApps({force:true})]);});assert(feedReads.some(p=>p.includes('/feed/mutual/'))&&feedReads.some(p=>p.includes('/feed/bounty/'))&&feedReads.includes('/api/guest-apps'));
  await fits();assert.doesNotMatch(await page.locator('body').innerText(),/undefined|NaN/);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Market storefront: real index RU/EN × 360/390/430; collapsed Radar, five league shelves and four thematic shelves, peek, metadata, owner, six contribution categories, original Closed actions, filters/query/caret, About sheet/Escape and overflow passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
