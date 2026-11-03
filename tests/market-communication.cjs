const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {marketFixture}=require('./fixtures/live-market-fixture.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/market-actions-20261102');fs.mkdirSync(out,{recursive:true});
function decorate(row){return {...row,package_name:'com.example.notes',icon_url:'https://cdn.fixture/icon.svg',
 passport:{title:row.name,category:'Productivity',content_type:'app',app_size_text:'24 MB',description:'Plan notes. <script>Never execute</script>',rating:4.6,ratings:120,
 screenshots_preview:['https://cdn.fixture/screen.svg']},owner_public:{username:'developer',reliability_index:94,karma:26.9,contribution_score:57,bugs_count:3,ideas_count:2,play_reviews_count:4,five_screens_count:5,text_reports_count:6,video_reports_count:7},owner_activity:{status:'online',hours_ago:2}};}
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 for(const lang of (process.env.MARKET_LOCALE?[process.env.MARKET_LOCALE]:['ru','en']))for(const width of (process.env.MARKET_WIDTH?[Number(process.env.MARKET_WIDTH)]:[360,390,430])){
  let topic={post:{revision:1,showcase_message_id:50,showcase_custom_pitch:'',showcase_has_media:true},post_url:'https://t.me/c/3920364371/1408/50',wallet_balance:1000,is_public:true},bumpCalls=[],earlyCalls=[],saveCalls=[],bumpFails=true;
  const makeLeg=(id,mine,owner)=>({id,app_id:mine?100:42,mine,state:'SCHEDULED_COOLDOWN',blocked_reason:'pace',timezone:'Asia/Bangkok',install_window_hours:48,unlock_at:new Date(Date.now()+3*3600000).toISOString(),install_due_at:new Date(Date.now()+51*3600000).toISOString(),early_start_allowed:true,early_start_owner:owner,terms:mine?{install_source:'link',duration_days:14,control_days:[1,7,14]}:null,package_name:'com.example.notes',sla_active_seconds:0,risk_active_seconds:0,dropoff_risk:{status:'waiting_system'}});
  const exchange={offer_id:5,owner_id:880,proposer_id:881,target_app_id:42,proposer_app_id:100,target_app_name:'My Notes',proposer_app_name:'Partner Notes',status:'accepted',as_of:new Date().toISOString(),legs:[makeLeg(10,true,false),makeLeg(11,false,true)],partner:{app_id:100,name:'Partner Notes',phase:'live',package_name:'com.example.notes',market:{tier:3,rank:12,score:450},category:'Tools',app_size_text:'24 MB',owner:{user_id:881,karma:26,reliability_index:94,completed_full_cycles:7,contribution_score:57,bugs_count:1,ideas_count:2,play_reviews_count:3,five_screens_count:4,text_reports_count:5,video_reports_count:6}},partner_terms:{install_source:'link',duration_days:14,reviews:{mode:'voluntary'}}};
  const page=await browser.newPage({viewport:{width,height:844}}),errors=[],queries=[],feedReads=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(lang=>{window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:lang}},themeParams:{},colorScheme:'dark',expand(){},ready(){},onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(fn){window.tgBack=fn;},offClick(){}}}};},lang);
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='cdn.fixture')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="260"><rect width="160" height="260" rx="20" fill="#37b9a2"/><text x="32" y="140" fill="white" font-size="40">N</text></svg>'});
   if(url.pathname==='/api/live-market/snapshot'){
    queries.push(Object.fromEntries(url.searchParams));const data=marketFixture(40,url.searchParams,true);
    const league={leaders:[{...decorate(marketFixture(40,new URLSearchParams(),true).ranking[0]),scoring:{...marketFixture(40,new URLSearchParams(),true).ranking[0].scoring,market_score:850,tier:1}}],flow:data.ranking.filter(p=>p.scoring.tier===3).slice(0,6),start:data.ranking.filter(p=>p.scoring.tier>=4).slice(0,6)};
    data.league_previews=league;data.league_totals={leaders:1,flow:league.flow.length,start:league.start.length};
    if(url.searchParams.get('tier_group')){data.ranking=league[url.searchParams.get('tier_group')]||[];data.queue=data.ranking.filter(p=>!p.own);}
    if(url.searchParams.has('app_id'))data.ranking=[decorate({...marketFixture(40,new URLSearchParams(),true).ranking[1],app_id:Number(url.searchParams.get('app_id'))})];
    for(const k of ['ranking','queue','radar'])data[k]=data[k].map(decorate);
    if(url.searchParams.get('search'))for(const k of ['ranking','queue'])data[k]=data[k].filter(p=>p.name.toLowerCase().includes(url.searchParams.get('search').toLowerCase()));
    return route.fulfill({json:data});
   }
   if(/^\/api\/(feed\/(mutual|bounty)\/|guest-apps$)/.test(url.pathname)){feedReads.push(url.pathname);assert.equal(url.searchParams.get('init_data'),'signed-fixture','Legacy market reads must carry the signed actor');}
   if(url.pathname==='/api/live-exchanges')return route.fulfill({json:{status:'success',result:[{...exchange,as_of:new Date().toISOString()}]}});
   if(url.pathname==='/api/apps/42/live-queue')return route.fulfill({json:{status:'success',result:exchange.legs.filter(l=>!l.mine&&['SCHEDULED_COOLDOWN','READY'].includes(l.state)).map(l=>({leg:l,kind:'exchange',tester_name:'@partner',as_of:new Date().toISOString()}))}});
   if(url.pathname==='/api/live-contracts')return route.fulfill({json:{status:'success',result:[]}});
   if(/\/live-exchange-legs\/\d+\/early$/.test(url.pathname)){const body=route.request().postDataJSON();earlyCalls.push(body);assert.equal(body.init_data,'signed-fixture');assert.equal(body.confirm,true);const l=exchange.legs.find(l=>l.id===Number(url.pathname.split('/')[3]));l.state=l.mine?'STARTED':'READY';l.early_start_allowed=false;return route.fulfill({json:{status:'success',result:{leg:l,started:l.mine}}});}
   if(url.pathname==='/api/apps/42/live-topic/banner')return route.fulfill({json:{status:'success',result:{asset_id:'9c544c17-edec-4507-97fd-a260e499872b',image_url:'/fixture-banner.png'}}});
   if(url.pathname==='/fixture-banner.png')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')});
   if(url.pathname==='/api/apps/42/live-topic/bump'){const body=route.request().postDataJSON();bumpCalls.push(body);if(bumpFails){bumpFails=false;return route.fulfill({status:503,json:{code:'topic_unavailable'}});}topic={...topic,wallet_balance:900,post:{...topic.post,showcase_message_id:51,showcase_last_bump_at:new Date().toISOString()},post_url:'https://t.me/c/3920364371/1408/51'};return route.fulfill({json:{status:'success',result:topic}});}
   if(url.pathname==='/api/apps/42/live-topic'){if(route.request().method()==='POST'){const body=route.request().postDataJSON();saveCalls.push(body);topic.post={...topic.post,revision:2,showcase_custom_pitch:body.pitch,showcase_image_file_id:body.asset_id,showcase_custom_image_url:'/fixture-banner.png'};}return route.fulfill({json:{status:'success',result:topic}});}
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
  const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
  await page.evaluate(()=>{document.querySelectorAll('.tab-content').forEach(n=>n.classList.remove('active'));document.getElementById('tab-tests').classList.add('active');LiveExchanges.mount();});
  await page.waitForSelector('[data-lq-early="10"]');
  assert.equal(await page.locator('.lp-contribution>div span').count(),6);assert(await page.locator('.lp-partner a[href*="play.google.com"]').isVisible());
  const text=await page.locator('.lq-window').first().innerText();assert.match(text,/Asia\/Bangkok/);assert.doesNotMatch(text,/{hours}|{date}|undefined|NaN/);assert.equal(await page.locator('[data-lx-action=start]').count(),0);
  const before=await page.locator('[data-lq-clock="10"]').textContent();await page.waitForFunction(before=>document.querySelector('[data-lq-clock="10"]')?.textContent!==before,before,{timeout:5000});
  await page.locator('.lx-section').scrollIntoViewIfNeeded();await fits();await page.screenshot({path:path.join(out,`queue-${lang}-${width}.png`)});
  await page.locator('[data-lq-early="10"]').click();assert.equal(earlyCalls.length,0,'No early action before explicit consent');await page.screenshot({path:path.join(out,`early-confirm-${lang}-${width}.png`)});await page.locator('[data-lq-wait]').click();assert.equal(earlyCalls.length,0);
  await page.locator('[data-lq-early="10"]').click();await page.locator('[data-lq-confirm]').click();await page.waitForSelector('.lm-sheet a[href*="play.google.com"]');assert.equal(earlyCalls.length,1);await page.keyboard.press('Escape');
  await page.waitForSelector('[data-lq-early="11"]');await page.evaluate(()=>LiveQueueUI.ownerQueue(42));await page.waitForSelector('.lm-sheet [data-lq-early="11"]');assert.match(await page.locator('.lm-sheet').innerText(),/@partner/);await page.locator('.lm-sheet [data-lq-early="11"]').click();assert.match(await page.locator('.lm-sheet').last().innerText(),lang==='ru'?/самостоятельно/:/themselves/);await page.locator('[data-lq-confirm]').click();await page.waitForFunction(()=>!document.querySelector('[data-lq-early="11"]'));assert.equal(earlyCalls.length,2);assert.equal(await page.locator('.lm-sheet').count(),1,'Owner stays in participant queue; no installer opens');await page.keyboard.press('Escape');
  await page.evaluate(()=>LiveTopic.open(42));await page.waitForSelector('[data-mtp-pitch]');assert.match(await page.locator('.mtp-wallet').innerText(),/1[ ,\u00a0]?000/);await fits();assert.doesNotMatch(await page.locator('.mtp-status a').evaluate(a=>getComputedStyle(a).color),/rgba.*0\.14/,'Link remains readable, not the neutral border token');await page.screenshot({path:path.join(out,`topic-${lang}-${width}.png`)});
  await page.locator('[data-mtp-pitch]').fill('Notes, reminders and a calmer daily routine.');
  await page.locator('[data-mtp-file]').setInputFiles({name:'banner.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')});await page.waitForSelector('[data-mtp-preview] img');await page.locator('[data-mtp-save]').click();await page.waitForFunction(()=>document.querySelector('[data-mtp-pitch]')?.value.includes('calmer'));assert.equal(saveCalls.length,1);assert.equal(saveCalls[0].image_mode,'custom');assert.equal(saveCalls[0].revision,1);assert.match(saveCalls[0].request_key,/^[a-f0-9-]{36}$/);
  await page.locator('[data-mtp-confirm-bump]').click();await page.locator('[data-mtp-pay]').click();await page.waitForFunction(()=>document.querySelector('.mtp-actions~[role=alert]')?.textContent);assert.equal(topic.wallet_balance,1000);
  await page.locator('[data-mtp-confirm-bump]').click();await page.locator('[data-mtp-pay]').click();await page.waitForFunction(()=>document.querySelector('[data-mtp-confirm-bump]')?.disabled);assert.equal(bumpCalls.length,2);assert.equal(bumpCalls[0].request_key,bumpCalls[1].request_key,'Ambiguous HTTP retry preserves idempotency key');assert.match(await page.locator('.mtp-wallet').innerText(),/900/);await fits();await page.screenshot({path:path.join(out,`topic-saved-${lang}-${width}.png`)});
  await page.keyboard.press('Escape');assert.equal(await page.locator('.lm-sheet').count(),0);
  await page.evaluate(()=>LiveMarket.openFromLink(9999));await page.waitForSelector('.lm-sheet .mk-passport');assert(queries.some(q=>q.app_id==='9999'),'Deep links resolve outside the first thirty projects');await page.evaluate(()=>handleAppBack());assert.equal(await page.locator('.lm-sheet').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('Market actions: RU/EN × 360/390/430; queued 48h dates/countdown, explicit early consent/tester vs owner, six partner categories/Play URL, owner post/banner/edit/bump UUID recovery/deep-link/Back passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
