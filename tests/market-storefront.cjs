const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {marketFixture}=require('./fixtures/live-market-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/market-storefront-20261102');fs.mkdirSync(out,{recursive:true});
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
  assert.equal(await page.locator('.mk-shelf').count(),5);assert.equal(await page.locator('.mk-card.is-priority[data-mk-project="app:42"]').count(),1);assert(await page.locator('.mk-card.is-own:not(.is-priority)').count()>0);assert(await page.locator('.mk-card').first().isVisible());
  assert((await page.locator('.mk-card').first().boundingBox()).y<700,'Apps on the first screen');
  const peek=await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>({w:n.clientWidth,page:n.firstElementChild.offsetWidth,total:n.scrollWidth}));
  assert(peek.page<peek.w*.95&&peek.page>peek.w*.8&&peek.total>peek.w,'Visible next-column peek');
  await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>n.scrollTo({left:n.firstElementChild.offsetWidth+12}));await page.waitForTimeout(200);assert(await page.locator('[data-mk-shelf=sandbox] .mk-carousel').evaluate(n=>n.scrollLeft>0));
  assert.equal(await page.locator('#showcase-active-tests').evaluate(n=>n.parentElement.id),'tab-market');
  await fits();await page.screenshot({path:path.join(out,`market-${lang}-${width}.png`),fullPage:true});
  await page.locator('.mk-radar-capsule>summary').click();assert.equal(await page.locator('.mk-radar-capsule .lm-factor').count(),6);
  assert(await page.locator('[data-lm-radar]').isVisible());await fits();await page.screenshot({path:path.join(out,`radar-${lang}-${width}.png`)});
  await page.locator('.mk-radar-capsule>summary').click();
  await page.locator('[data-mk-shelf=live] .mk-card').first().click();await page.waitForSelector('.lm-sheet .mk-passport');
  assert.equal(await page.locator('.mk-gallery img').count(),1);assert.equal(await page.locator('.mk-contribution>div span').count(),6);
  await page.locator('.mk-contribution>summary').click();await fits();await page.screenshot({path:path.join(out,`about-${lang}-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.lm-sheet').count(),0);
  await page.locator('[data-mk-shelf=sandbox] .mk-card').first().click();assert(await page.locator('.lm-sheet .market-card').count()>0,'Original Closed interaction card reused');await page.keyboard.press('Escape');
  await page.locator('[data-mk-all=sandbox]').click();await page.waitForSelector('.mk-full-list');assert.equal(await page.locator('.mk-shelf').count(),0);
  assert(await page.locator('.mk-full-list .mk-card').count()>=9);await page.locator('[data-mk-project="guest:4c3e5189-c424-4929-ab2e-63adf648cd39"]').click();assert.equal(await page.locator('.lm-sheet .guest-market-card').count(),1,'UUID guests retain their existing invitation handler');await page.evaluate(()=>handleAppBack());assert.equal(await page.locator('.lm-sheet').count(),0,'Telegram Back closes About without changing participation');await page.locator('[data-mk-project="guest:4c3e5189-c424-4929-ab2e-63adf648cd39"]').click();await page.locator('.lm-sheet .guest-project-cta-btn:not(.guest-project-cta-fast)').click();await page.waitForSelector('#guest-invite-modal.active');assert.equal(await page.locator('.lm-sheet').count(),0,'About must hand off before the original invitation modal');await page.evaluate(()=>closeGuestInviteModal());await fits();
  await page.locator('[data-mk-search]').fill('Orbit Notes 100');await page.waitForTimeout(600);assert.equal(await page.locator('[data-mk-search]').inputValue(),'Orbit Notes 100');
  assert.equal(await page.locator('[data-mk-search]').evaluate(n=>n===document.activeElement),true,'Search focus survives server render');assert(queries.some(q=>q.search==='Orbit Notes 100'));
  await page.locator('[data-mk-search]').fill('');await page.waitForTimeout(600);
  await page.locator('[data-mk-section=live]').click();await page.locator('[data-mk-league=leaders]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.tier_group==='leaders'));
  await page.locator('[data-mk-geo]').click();await page.waitForTimeout(300);assert(queries.some(q=>q.country==='TH'));
  await page.evaluate(()=>{window.capturedToasts=[];window.showToast=text=>capturedToasts.push(text);showCheckinRewardToasts({already_checked_today:true,earned_contribution:2});showCheckinRewardToasts({already_checked_today:true,earned_contribution:0});});
  const receipts=await page.evaluate(()=>capturedToasts);assert.match(receipts[0],/\+2/);assert.doesNotMatch(receipts[1],/\+2/);
  await page.evaluate(async()=>{resetMarketFetchThrottle();await Promise.all([loadMutualFeed(),loadBountyFeed(),loadGuestApps({force:true})]);});assert(feedReads.some(p=>p.includes('/feed/mutual/'))&&feedReads.some(p=>p.includes('/feed/bounty/'))&&feedReads.includes('/api/guest-apps'));
  await fits();assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Market storefront: real index RU/EN × 360/390/430; collapsed Radar, five shelves, peek, metadata, owner, six contribution categories, original Closed actions, filters/query/caret, About sheet/Escape and overflow passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
