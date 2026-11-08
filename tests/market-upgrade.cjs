const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {marketFixture}=require('./fixtures/live-market-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/market-upgrade-20261103/onboarding');fs.mkdirSync(out,{recursive:true});
function decorate(row){return {...row,package_name:'com.example.notes',icon_url:'https://cdn.fixture/icon.svg',
 passport:{title:row.name,category:'Productivity',content_type:'app',app_size_text:'24 MB',description:'Plan notes. <script>Never execute</script>',rating:4.6,ratings:120,
 screenshots_preview:['https://cdn.fixture/screen.svg']},owner_public:{username:'developer',reliability_index:94,karma:26.9,contribution_score:57,bugs_count:3,ideas_count:2,play_reviews_count:4,five_screens_count:5,text_reports_count:6,video_reports_count:7},owner_activity:{status:'online',hours_ago:2}};}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const lang of ['ru','en'])for(const width of [360,390,430]){
  let verification='preview',codeChecks=0;const request={id:'9c544c17-edec-4507-97fd-a260e499872b',package_name:'com.example.owned',state:verification,developer:'Studio Notes',email_masked:'d***r@example.com',token:'DTH-123456',passport:{title:'Verified Notes',category:'Productivity',icon_url:'https://cdn.fixture/icon.svg',description:'Full passport preview'}};
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[],queries=[],feedReads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(lang=>{window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:lang}},themeParams:{},colorScheme:'dark',expand(){},ready(){},onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(fn){window.tgBack=fn;},offClick(){}}}};},lang);
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='cdn.fixture')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="260"><rect width="160" height="260" rx="20" fill="#37b9a2"/><text x="32" y="140" fill="white" font-size="40">N</text></svg>'});
   if(url.pathname==='/api/live-ownership/preview'){assert.equal(route.request().postDataJSON().value,'com.example.owned');return route.fulfill({json:{status:'success',result:request}});}
   if(url.pathname==='/api/live-ownership')return route.fulfill({json:{status:'success',result:{requests:verification==='admin_pending'?[{...request,state:verification}]:[],admin:false}}});
   if(url.pathname.startsWith('/api/live-ownership/')){let result={state:verification};if(url.pathname.endsWith('/verify')){codeChecks++;result={error:'verification_wrong_code'};}if(url.pathname.endsWith('/alternative')){verification='admin_pending';result={...request,state:verification};}return route.fulfill({json:{status:'success',result}});}
   if(url.pathname==='/api/live-market/snapshot'){
    queries.push(Object.fromEntries(url.searchParams));const data=marketFixture(40,url.searchParams,true);
    const league={};for(let tier=1;tier<=5;tier++){league[String(tier)]=data.ranking.filter(p=>p.scoring.tier===tier).slice(0,10);if(tier<=2)league[String(tier)]=[{...decorate(marketFixture(40,new URLSearchParams(),true).ranking[0]),app_id:9000+tier,own:false,scoring:{...marketFixture(40,new URLSearchParams(),true).ranking[0].scoring,market_score:1050-tier*200,tier}}];}
    data.league_previews=league;data.league_totals=Object.fromEntries(Object.entries(league).map(([k,v])=>[k,v.length]));
    if(url.searchParams.get('tier_group')){data.ranking=league[url.searchParams.get('tier_group')]||[];data.queue=data.ranking.filter(p=>!p.own);}
    if(url.searchParams.has('app_id'))data.ranking=[decorate({...marketFixture(40,new URLSearchParams(),true).ranking[1],app_id:Number(url.searchParams.get('app_id'))})];
    for(const k of ['ranking','queue','radar'])data[k]=data[k].map(decorate);const dormant={...decorate({...marketFixture(40,new URLSearchParams(),true).ranking[0],app_id:8888,own:false,name:'Dormant Notes'}),last_seen_at:new Date(Date.now()-8*86400000).toISOString(),owner_activity:{status:'away',hours_ago:192}};data.inactive_previews=[dormant];data.inactive_total=1;data.phase1_sandbox.own_projects[0].team=11;if(url.searchParams.get('inactive_only'))data.ranking=[dormant];
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
  assert.equal(await page.locator('[data-mk-project="app:8888"]').count(),1);assert.equal(await page.locator('.mk-inactive').evaluate(n=>n.open),false);
  await page.locator('.mk-inactive>summary').click();await page.waitForSelector('.mk-inactive .mk-card');await fits();await page.screenshot({path:path.join(out,`inactive-${lang}-${width}.png`)});
  await page.locator('.mk-radar-capsule [data-mk-radar-pick]').click();await page.locator('.lm-sheet [data-mk-pick="7"]').click();await page.waitForFunction(()=>document.querySelector('.mk-radar-capsule>summary').textContent.includes('11/12'));assert.match(await page.locator('.mk-radar-capsule>summary').innerText(),/11\/12/);await page.locator('.mk-radar-symbol').click();assert.equal(await page.locator('.lm-density-bar').count(),0);await fits();await page.screenshot({path:path.join(out,`closed-radar-${lang}-${width}.png`)});
  await page.locator('[data-mk-shelf="3"] .mk-card:not(.is-own)').first().click();await page.waitForSelector('.lm-sheet');assert.equal(await page.locator('[data-lm-proposer]').count(),0,'The About sheet no longer asks for a project before the action');await page.keyboard.press('Escape');
  await page.evaluate(()=>LiveProjectAdd.open());await page.waitForSelector('[data-la-link]');await page.locator('[data-la-link]').fill('https://play.google.com/store/apps/details?id=com.example.owned&hl=ru&pcampaignid=test');await page.locator('[data-la=preview]').click();await page.waitForSelector('[data-la=confirm]');await fits();await page.screenshot({path:path.join(out,`passport-preview-${lang}-${width}.png`)});
  assert.equal(await page.locator('[data-la-alternatives]').isVisible(),false);await page.locator('[data-la=not-mine]').click();assert.equal(await page.locator('[data-la=other-link]').isVisible(),true);await page.locator('[data-la=other-link]').click();assert.equal(await page.locator('[data-la-link]').count(),1);assert.equal(await page.locator('[data-la-link]').inputValue(),'com.example.owned');await page.locator('[data-la=preview]').click();await page.waitForSelector('[data-la=confirm]');assert.equal(await page.locator('.lm-centered-dialog').count(),1);
  await page.locator('[data-la=confirm]').click();await page.waitForSelector('[data-la-code]');assert.match(await page.locator('.lm-sheet').last().innerText(),/d\*\*\*r@example.com/);await page.locator('[data-la-code]').fill('000000');await page.locator('[data-la=verify]').click();await page.waitForFunction(()=>document.querySelector('.lm-centered-dialog [role=alert]')?.textContent);assert.equal(codeChecks,1);await fits();await page.screenshot({path:path.join(out,`verification-${lang}-${width}.png`)});
  await page.locator('.la-alternative>summary').click();assert.match(await page.locator('.la-alternative code').innerText(),/DTH-123456/);await page.locator('[data-la=alternative]').click();await page.waitForFunction(()=>!document.querySelector('[data-la-code]'));assert.equal(verification,'admin_pending');await fits();await page.screenshot({path:path.join(out,`pending-${lang}-${width}.png`)});await page.keyboard.press('Escape');
  await fits();assert.doesNotMatch(await page.locator('body').innerText(),/undefined|NaN/);assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Market upgrade: RU/EN × 360/390/430; dormant carousel, Closed team capsule, full passport, masked email, wrong code and admin-pending verification passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
