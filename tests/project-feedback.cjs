/* Real Mini App rendering with signed API fixtures. No Telegram messages are sent. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.resolve(process.env.LIVE_TEST_ARTIFACTS || path.join(root, '../artifacts/project-feedback'));
fs.mkdirSync(out, {recursive:true});

(async () => {
    const browser = await chromium.launch({headless:true, channel:'chrome'});
    try {
        const reference = await browser.newPage({viewport:{width:240,height:340}});
        await reference.setContent(`<body style="margin:0;background:#edf3ff;color:#19284a;padding:18px;font:14px system-ui">
            <strong style="color:#2856b2">● Orbit Notes</strong><h1>Today</h1>
            <p style="padding:12px;background:#d6e4ff;border-radius:10px">✓ Check the welcome screen</p>
            <p style="padding:12px;background:white;border-radius:10px">Explore saved notes</p>
            <p style="padding:12px;background:white;border-radius:10px">Review the layout</p></body>`);
        const screenshot = await reference.screenshot();
        await reference.close();
        for (const lang of ['ru','en']) for (const width of [360,390,430]) {
            const page = await browser.newPage({viewport:{width,height:1430}});
            let tester = true, request, routePayload;
            let ticket = {id:7,app_id:42,type:'project_impression',status:'pending',role:'tester',body:'Onboarding was clear, but the large-text layout hid an action.',scores:[5,4,5],comments:[
                {id:8,author_role:'owner',body:'Could you share which screen hid the action?',has_media:false},
                {id:9,author_role:'tester',body:'The review settings screen, with the largest Android font size.',has_media:false},
            ]};
            const history = [
                {day:1,kind:'screenshot',proof_id:21,count:1,text:'Installed from Google Play. The welcome screen loaded.'},
                {day:4,kind:'screenshot',proof_id:22,count:3,text:'Checked the main flow and saved three screenshots.'},
                {day:6,kind:'bug',text:'The action moved off-screen when I increased the font size.'},
                {day:8,kind:'idea',text:'Keep the primary button under the heading.'},
                {day:9,kind:'scenario',text:'Completed the accessibility steps.'},
            ];
            const errors=[];
            page.on('pageerror', error=>errors.push(error.message));
            await page.addInitScript(locale=>{
                window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:locale}},
                    colorScheme:'dark',themeParams:{},ready(){},expand(){},onEvent(){},offEvent(){},
                    BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};
            },lang);
            await page.route('**/*',route=>{
                const req=route.request(), url=new URL(req.url()), p=url.pathname;
                const ok=result=>route.fulfill({json:{status:'success',result}});
                if (p==='/api/my-feedback-threads') return ok({tickets:[{...ticket,status:'needs_reply',message_text:ticket.body}],tasks:{42:{stage:'open',day:10,mode:'voluntary',bonus:75}}});
                if (p==='/api/apps/42/project-impression'){
                    if (req.method()==='POST') {request=req.postDataJSON();return ok(7);}
                    return ok({task:{stage:'open',day:10,mode:'voluntary',bonus:75},history});
                }
                if (p==='/api/feedback/7/thread'){
                    if (req.method()==='POST') {
                        assert.match(req.postData(),/layout still clips/);
                        ticket={...ticket,status:'pending',comments:ticket.comments.concat({id:10,author_role:'tester',body:'The layout still clips on a narrow screen.',has_media:false})};
                    }
                    return ok({...ticket,role:tester?'tester':'owner'});
                }
                if (p==='/api/apps/42/project-feedback-settings')return ok({
                    impression:{mode:'voluntary',bonus:75,day:null},
                    telegram:{chat_id:-1001234567890,title:'Orbit Notes QA',topics:{reports:71,private:72,updates:0}}
                });
                if (p==='/api/apps/42/feedback-telegram-route'){routePayload=req.postDataJSON();return ok({});}
                if (/\/media-ticket$/.test(p))return route.fulfill({json:{status:'success',url:'/qa-proof.png'}});
                if (p==='/qa-proof.png')return route.fulfill({contentType:'image/png',body:screenshot});
                if (p.startsWith('/api/'))return route.fulfill({json:{status:'success',result:[],projects:[],tests:[]}});
                if(url.hostname!=='fixture.local')return route.fulfill({contentType:'application/javascript',body:''});
                const file=path.resolve(root,'.'+decodeURIComponent(p==='/'?'/index.html':p));
                if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
                return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||
                    'application/octet-stream',body:fs.readFileSync(file)});
            });
            await page.goto('http://fixture.local/',{waitUntil:'load'});
            await page.waitForSelector('#no-username-overlay.active');
            await page.evaluate(locale=>{
                document.querySelector('#no-username-overlay').remove();
                window.API_BASE='/api';window.lang=locale;window.getTelegramInitDataRaw=()=> 'signed-fixture';
                window.showToast=()=>{};
                Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.qaClipboard=value}});
                const active=document.querySelector('.tab-content.active');
                if(active) active.classList.remove('active');
                const tab=document.querySelector('#tab-tests');
                tab.classList.add('active');
                const card=document.createElement('article');card.className='card';card.id='test-card-42';
                card.innerHTML='<h3>Orbit Notes</h3>';tab.append(card);
                ProjectFeedback.mountCard(card,42);ProjectFeedback.refreshCards(true);
            },lang);
            const fits=async () => assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+
                1 && Array.from(document.querySelectorAll('.lm-sheet,.pf-layout,.pf-thread')).filter(node=>node.clientWidth).
                    every(node=>node.scrollWidth<=node.clientWidth+1)),true);
            await page.locator('[data-pf-impression="42"]').click();
            await page.locator('.pf-score').first().waitFor();
            assert.equal(await page.locator('.pf-score').count(),3);
            for (const [index,value] of [[0,5],[1,4],[2,5]]) {
                await page.locator('[data-pf-criterion="'+index+'"][data-pf-score="'+value+'"]').click();
            }
            assert.match(await page.locator('[data-pf-average]').innerText(),/4[.,]7/);
            await page.locator('input[name=bonus]').check();
            await page.locator('.pf-impression textarea').fill('Too short');
            assert.equal(await page.locator('[data-pf-submit]').isDisabled(),true);
            await page.locator('.pf-impression textarea').fill('The navigation mostly made sense. On the review screen, I enlarged the font and the primary button was clipped.');
            await page.locator('.pf-history summary').click();
            await page.locator('.pf-thumb img').first().waitFor();
            await page.waitForFunction(()=>document.querySelector('.pf-thumb img').naturalWidth>1);
            await page.locator('.pf-history [data-pf-copy]').first().click();
            assert.match(await page.evaluate(()=>window.qaClipboard),/Installed from Google Play/);
            await fits();
            await page.locator('.lm-sheet').last().screenshot({path:path.join(out,`impression-${lang}-${width}.png`)});
            await page.locator('[data-pf-submit]').click();
            await page.locator('.pf-compose').waitFor();
            assert.deepEqual(request.scores,[5,4,5]);assert.equal(request.claim_bonus,true);
            await page.locator('.pf-compose textarea').fill('The layout still clips on a narrow screen.');
            await page.locator('.pf-compose button').click();
            await page.locator('.pf-message').filter({hasText:'still clips'}).waitFor();
            await fits();
            await page.locator('.lm-sheet').last().screenshot({path:path.join(out,`tester-thread-${lang}-${width}.png`)});
            await page.evaluate(()=>LiveMarketUI.closeTop());
            tester=false;
            await page.evaluate(row=>{
                const modal=document.querySelector('#project-feedback-modal');modal.classList.add('active');
                const owner=modal.querySelector('#project-feedback-body');
                owner.innerHTML='<div class="modal-header"><h2>'+window.t('pfThread',{},window.lang)+'</h2></div>'+renderProjectFeedbackCards({id:42,name:'Orbit Notes'},[{...row,message_text:row.body,
                    tester_username:'orbit_tester',tester_full_name:'Orbit Tester',tester_id:880,created_at:new Date().toISOString()}]);
            },ticket);
            const owner=page.locator('#project-feedback-body');
            assert.equal(await page.evaluate(()=>feedbackMatchesTypeFilter('bug','project_impression')),false);
            await owner.locator('.fb-inbox-row').click();
            await owner.locator('.pf-thread-embed summary').click();
            await owner.locator('[data-pf-close=accepted]').waitFor();
            assert.doesNotMatch(await owner.locator('.fb-micro-line').textContent(),/Принято|Accepted/);
            await fits();
            await owner.locator('.fb-card').screenshot({path:path.join(out,`owner-inbox-${lang}-${width}.png`)});
            await page.evaluate(()=>{
                document.querySelector('#project-feedback-body').innerHTML=ProjectFeedback.ownerBanner(42);
            });
            await owner.locator('[data-pf-route]').click();
            await page.locator('input[name=updates]').waitFor();
            assert.equal(await page.locator('input[name=updates]').inputValue(),'0');
            await fits();
            await page.locator('.lm-sheet').last().screenshot({path:path.join(out,`telegram-routing-${lang}-${width}.png`)});
            await page.locator('.lm-sheet form button:not([type])').click();
            await page.locator('input[name=updates]').waitFor({state:'detached'});
            assert.deepEqual(routePayload.topics,{reports:71,private:72,updates:0});
            assert.equal(routePayload.init_data,'signed-fixture');
            assert.deepEqual(errors,[]);
            await page.close();
        }
        console.log('Project feedback · RU/EN at 360, 390 and 430 px');
    } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
