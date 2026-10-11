const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
    const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        const page=await browser.newPage({viewport:{width:390,height:900}});
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('http://fixture.local/**',route=>route.fulfill({contentType:'text/html',body:'<div id="feed"></div><div id="project-coverage-modal"><div id="project-coverage-body"></div></div>'}));
        await page.goto('http://fixture.local/');
        for(const file of ['i18n/ru.js','i18n/en.js','i18n/core.js','ui/ui-helpers.js','ui/ui-tests.js','ui/ui-market.js','js/project-results.js']) await page.addScriptTag({path:path.join(root,file)});
        await page.addStyleTag({path:path.join(root,'css/project-results.css')});
        await page.addStyleTag({content:'.coverage-cockpit-countries__list{width:220px;overflow:auto;display:flex}.coverage-country-pill{flex-shrink:0}.coverage-body{height:850px;overflow:auto}'});
        await page.evaluate(()=>{
            window.lang='en'; window.currentLang='en'; Object.assign(window.t,I18NEN);
            window.userId=1; window.myTests=[]; window.incomingOffers=[];
            window.myProjects=[{id:30,mode:'mutual',status:'active',testers:[],limit_mutual:12}];
            window._blockedOfferProjectsByOwner={}; window._blockedOfferProjectsFetchedAt={};
            window.isProjectSynced=()=>false; window.getLangBadge=()=>'';
            window.isOwnerBlockedByMe=()=>false;
            window.item={app_id:42,owner_id:2,name:'Published candidate',owner_username:'owner',limit_mutual:14,mutual_testers_count:13};
            window.myTests=[{id:42,join_type:'mutual',app_status:'active',progress_status:'active'}];
            document.getElementById('feed').innerHTML=renderFeedCard(item,'mutual-seeking');
        });
        assert.equal(await page.locator('#feed button[disabled]').count(),1);
        assert.match(await page.locator('#feed button').innerText(),/Already testing/);
        await page.evaluate(()=>{
            myTests=[];
            _blockedOfferProjectsByOwner['2']={'30':{reason_code:'already_used'}};
            _blockedOfferProjectsFetchedAt['2']=Date.now();
            document.getElementById('feed').innerHTML=renderFeedCard(item,'mutual-seeking');
        });
        assert.equal(await page.locator('#feed button[disabled]').count(),1);
        assert.match(await page.locator('#feed button').innerText(),/No project available/);
        await page.evaluate(()=>{
            myProjects.push({id:31,mode:'mutual',status:'active',testers:[],limit_mutual:12});
            document.getElementById('feed').innerHTML=renderFeedCard(item,'mutual-seeking');
        });
        assert.equal(await page.locator('#feed button[disabled]').count(),0,'One available proposer must keep mutual enabled');
        await page.evaluate(()=>{
            myProjects.pop(); _blockedOfferProjectsFetchedAt['2']=Date.now()-31000;
            document.getElementById('feed').innerHTML=renderFeedCard(item,'mutual-seeking');
        });
        assert.equal(await page.locator('#feed button[disabled]').count(),0,'Expired lock cache cannot disable indefinitely');
        await page.evaluate(()=>{
            window.API_BASE='/api'; window.tg={HapticFeedback:{impactOccurred(){}}};
            window.getTelegramInitDataRaw=()=>'';
            window.fetchWithRetry=async()=>({ok:true,json:async()=>({status:'ok',coverage:{
                app_id:30,name:'Coverage',current_iteration:1,models:[],android_versions:[],archived_screenshots:[],
                stats:{countries_count:8,models_count:0},
                countries:['RU','VN','RS','US','TH','IN','GB','TR'].map(code=>({code,name:code,name_ru:code,testers_count:1,models:[]})),
                testers_without_device:[{tester_id:11,username:'turkish_tester',full_name:'Tester from Turkey',country_code:'TR'}]
            }})});
        });
        await page.evaluate(()=>openProjectCoverage(30));
        await page.waitForSelector('.coverage-country-pill[data-country="TR"]',{state:'attached'});
        await page.evaluate(()=>{
            document.querySelector('.coverage-distribution').open=true;
            document.querySelector('.coverage-cockpit-countries__list').scrollLeft=9999;
        });
        const before=await page.locator('.coverage-cockpit-countries__list').evaluate(element=>element.scrollLeft);
        assert(before>0);
        await page.locator('.coverage-country-pill[data-country="TR"]').click();
        const scroll=await page.locator('.coverage-cockpit-countries__list').evaluate(element=>({left:element.scrollLeft,max:element.scrollWidth-element.clientWidth}));
        assert.equal(scroll.left,Math.min(before,scroll.max),'Keep the prior position, clamped only if the strip becomes shorter');
        assert(scroll.left>0,'Country strip must not jump to its beginning');
        assert.match(await page.locator('.coverage-unknown-device').innerText(),/Tester from Turkey.*turkish_tester.*Device details unavailable/s);
        assert.equal(await page.locator('.coverage-dimension-empty').count(),0,'No false empty-device message for an actual participant');
        await page.evaluate(()=>selectCoverageAndroid(14));
        assert.equal(await page.locator('.coverage-unknown-device').count(),0,'Unknown devices must not invent an Android version');
        assert.deepEqual(errors,[]);
        console.log('Market and coverage: disabled/status CTA, eligible choice, expired cache, unknown tester and country scroll passed');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
