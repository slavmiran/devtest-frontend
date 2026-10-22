const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const section = fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<details id="mutual-isolated-section"[\s\S]*?<\/details>/)[0];
(async () => {
    const browser = await chromium.launch({headless:true, channel:process.env.PLAYWRIGHT_CHANNEL || 'chrome'});
    try {
        for (const language of ['ru', 'en']) for (const width of [360, 390, 430]) {
            const page = await browser.newPage({viewport:{width, height:844}}), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('http://fixture.local/**', route => route.fulfill({contentType:'text/html', body:
                `<div class="container"><div id="mutual-seeking-list"></div>${section}<div id="mutual-prelaunch-list"></div></div>`}));
            await page.goto('http://fixture.local/');
            for (const file of ['css/tokens.css', 'css/base.css', 'styles.css', 'css/live-market.css']) await page.addStyleTag({path:path.join(root, file)});
            for (const file of ['i18n/ru.js', 'i18n/en.js', 'i18n/core.js', 'ui/ui-helpers.js', 'ui/ui-market.js', 'js/app-api.js']) await page.addScriptTag({path:path.join(root, file)});
            await page.evaluate(language => {
                window.lang=language; window.currentLang=language; Object.assign(window.t, language==='ru'?I18NRU:I18NEN);
                document.querySelectorAll('[data-i18n]').forEach(el => el.textContent=t(el.dataset.i18n, {}, lang));
                window.mutualSeeking=[]; window.mutualPrelaunch=[]; window.mutualIsolated=[]; window.mutualReturns=[];
                window.marketCache=null; window.MARKET_CACHE_KEY='isolated-fixture'; window._marketInFlight={};
                window._lastFetchTimes={}; window._marketLoadedOnce=false; window.API_BASE='/api'; window.userId=11;
                window._apiStart=()=>{}; window._apiEnd=()=>{}; window.isTabVisible=()=>true;
                window.renderGuestProjectsSection=()=>{}; window.renderShowcaseActiveTests=()=>{};
                window.showMarketLoading=()=>{}; window.getMarketFeedState=()=>({confirmedEmpty:true});
                window.renderMutualReturns=()=>{}; window._resolveMarketResponse=()=>{};
                window._showNonCriticalLoaderToast=()=>{throw Error('Unexpected load failure');};
                window.payload={seeking:[], prelaunch:[], isolated:[
                    {app_id:1, name:'Travel Diary · Extended testing', day:16, visibility_mode:'hidden_from_showcase', showcase_read_only:true},
                    {app_id:2, name:'Fully isolated extended testing project', day:35, is_own_project:true, visibility_mode:'full_isolation', showcase_read_only:true}
                ]};
                window.fetchWithRetry=async()=>({ok:true,json:async()=>JSON.parse(JSON.stringify(payload))});
            }, language);
            await page.evaluate(() => _loadMutualFeedImpl({}));
            assert.equal(await page.locator('#mutual-isolated-section[hidden]').count(), 0);
            assert.equal(await page.locator('#mutual-isolated-count').innerText(), '2');
            await page.click('#mutual-isolated-section > summary');
            assert.equal(await page.locator('.market-card-isolated:visible').count(), 2);
            assert.equal(await page.locator('#mutual-isolated-list button, #mutual-isolated-list a, #mutual-isolated-list [onclick]').count(), 0, 'No hidden way to join via a dossier or CTA');
            const escaped=await page.evaluate(()=>renderFeedCard({app_id:3,name:'<img src=x onerror=alert(1)>',showcase_read_only:true},'mutual-seeking'));
            assert(escaped.includes('&lt;img') && !escaped.includes('<img'), 'Read-only overrides normal offer branches and escapes title');
            assert.match(await page.locator('#mutual-isolated-list').innerText(), language==='ru' ? /Скрыт с витрины[\s\S]*Полная изоляция/ : /Hidden from showcase[\s\S]*Full isolation/);
            assert.equal(await page.evaluate(() => mutualSeeking.length+mutualPrelaunch.length), 0);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth), true);
            if (width===390) {
                const artifacts=path.resolve(root, '..', 'artifacts', 'live-market-phase1');
                fs.mkdirSync(artifacts, {recursive:true});
                await page.screenshot({path:path.join(artifacts, `isolated-${language}-390.png`), fullPage:true});
            }
            await page.evaluate(() => {mutualIsolated=[]; hydrateMarketFromCache(); renderMutualFeed(true);});
            assert.equal(await page.locator('.market-card-isolated').count(), 2, 'Cache restores read-only group');
            await page.evaluate(() => {payload.isolated=[]; return _loadMutualFeedImpl({});});
            assert.equal(await page.locator('#mutual-isolated-section[hidden]').count(), 1, 'Refresh clears stale hidden cards');
            await page.evaluate(() => {marketCache={mutual:{seeking:[],prelaunch:[]}}; mutualIsolated=[{app_id:99}]; hydrateMarketFromCache();renderMutualFeed(true);});
            assert.equal(await page.evaluate(() => mutualIsolated.length), 0, 'Old cache without isolated is supported');
            assert.deepEqual(errors, []);
            console.log(`Isolated Phase1 ${language} ${width}: no actions/overflow, labels, XSS, cache and refresh passed`);
            await page.close();
        }
    } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
