const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../artifacts/qa-ecosystem-20261104/browser');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});
for(const lang of ['ru','en'])for(const width of [360,390,430]){
 const page=await browser.newPage({viewport:{width,height:860}}),commands=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const state={enabled:true,generation:1,restoration_conflicts:0,objects:[
  {key:'flagship',kind:'app',id:'321',name:'[QA] Firefox',phase:'live'},
  {key:'task:ready',kind:'leg',id:'123',state:'READY',day:1},
  {key:'task:queued',kind:'leg',id:'124',state:'SCHEDULED_COOLDOWN',day:1},
  {key:'keyword:waiting',kind:'leg',id:'125',state:'KEYWORD_ASSIST_PENDING',day:1},
  {key:'contract_daily:task',kind:'leg',id:'126',state:'INSTALLED',day:2}]};
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/qa-ecosystem'){
   const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'content-type'};
   if(route.request().method()==='OPTIONS')return route.fulfill({headers,body:''});
   if(route.request().method()==='POST'){const body=route.request().postDataJSON();commands.push(body);if(body.action==='pause')state.paused=true;if(body.action==='resume')state.paused=false;return route.fulfill({headers,json:{status:'success',result:body.action==='advance_to'?{day:body.data.day||7,receipt:{buffer_released:body.data.day===3?38:0}}:{ok:true}}});}
   return route.fulfill({headers,json:{status:'success',result:state}});
  }
  if(url.hostname==='qa.local'){const file=path.resolve(root,'.'+url.pathname);assert(file.startsWith(root+path.sep));return route.fulfill({contentType:({'.js':'application/javascript','.css':'text/css'})[path.extname(file)]||'text/plain',body:fs.readFileSync(file)});}
  return route.fulfill({body:''});
 });
 await page.goto('about:blank');await page.setContent('<meta name="viewport" content="width=device-width, initial-scale=1"><div id="system-drop-menu"><div id="hud-settings"><div class="system-drop-content"></div></div></div>');
 await page.addScriptTag({path:path.join(root,'i18n/ru.js')});await page.addScriptTag({path:path.join(root,'i18n/en.js')});await page.addScriptTag({path:path.join(root,'i18n/core.js')});
 await page.evaluate(lang=>{window.lang=lang;window.escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));window.API_BASE='http://qa.local/api';window.getTelegramInitDataRaw=()=> 'signed-test';window.Swal={fire:async()=>({isConfirmed:true})};},lang);
 await page.addStyleTag({path:path.join(root,'css/qa-ecosystem.css')});
 // Same modal structure and shared sheet implementation as the production UI.
 await page.addStyleTag({content:'body{margin:0;background:#0e141c;color:#eef4fc;font:14px Arial}.modal-overlay{position:fixed;inset:0;display:flex;align-items:end;background:#0009}.lm-sheet{box-sizing:border-box;width:100%;max-height:90vh;overflow:auto;background:#151e29;border-radius:20px 20px 0 0;padding:16px}.lm-sheet-header{display:flex;justify-content:space-between}.lm-sheet-header h2{font-size:19px}.lm-sheet-body{padding:8px}.lm-action{border:1px solid #3a506b;border-radius:10px;background:#1d3048;color:inherit}'});
 await page.addScriptTag({path:path.join(root,'js/live-market-ui.js')});await page.addScriptTag({path:path.join(root,'js/qa-ecosystem.js')});
 await page.evaluate(()=>QAEcosystem.discover());await page.locator('#qa-ecosystem-open').click();await page.waitForSelector('[data-qa-action=resources]');
 const fits=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.qa-panel')].every(n=>n.scrollWidth<=n.clientWidth+1)),'No horizontal overflow');
 await fits();await page.screenshot({path:path.join(out,`panel-${lang}-${width}.png`)});
 for(const action of ['resources','incoming','incoming_pro','incoming_closed','partner_d1','report','ready','advance','day3','day7','day12','day13','finish','early_tester','early_owner','keyword_extend','restore_case','refresh_dates','refresh_all','pause','resume','tier']){
  await page.locator('[data-qa-action='+action+']').click();await page.waitForFunction(()=>document.querySelector('[data-qa-action=resources]')?.disabled===false);await fits();
 }
 assert.equal(commands.length,22);assert(commands.every(c=>c.init_data==='signed-test'&&/^[a-f0-9-]{36}$/.test(c.request_key)));
 assert.deepEqual(commands.filter(c=>c.action==='advance_to').map(c=>c.data.day),[3,7,12,13,0]);
 assert(!commands.some(c=>['disable','reset','seed'].includes(c.action)),'No bulk-delete/reset command');
 assert(commands.some(c=>c.action==='incoming'&&c.key==='pro'));assert(!commands.some(c=>'actor_id' in c||'owner_id' in c));
 await page.keyboard.press('Escape');assert.equal(await page.locator('.lm-sheet-overlay').count(),0);assert.deepEqual(errors,[]);
 await page.close();
}
await browser.close();console.log('QA controller: RU/EN 360/390/430, commands, signed payloads, Escape and overflow OK');
})().catch(e=>{console.error(e);process.exit(1)});
