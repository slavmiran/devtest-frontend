/* Read-only UI smoke against the real local Test API. No bot token is exposed. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),backend=path.resolve(root,'../devtest-backend'),out=path.resolve(root,'../artifacts/qa-ecosystem-20261104/live-browser');
fs.mkdirSync(out,{recursive:true});
const python=path.resolve(root,'../.venv/Scripts/python.exe');
// Only a short-lived signed init_data leaves Python; the Test secret stays there.
const auth=execFileSync(python,['-c',`from dotenv import dotenv_values
import hmac,hashlib,time,json
from urllib.parse import urlencode
v=dotenv_values('.env')
assert v['SUPABASE_URL']=='https://fksbrckitigxehxxfaru.supabase.co'
p={'auth_date':str(int(time.time())),'user':json.dumps({'id':8808373218,'username':'SlavMiran','first_name':'QA'},separators=(',',':'))}
k=hmac.new(b'WebAppData',v['BOT_TOKEN'].encode(),hashlib.sha256).digest()
p['hash']=hmac.new(k,'\\n'.join(x+'='+p[x] for x in sorted(p)).encode(),hashlib.sha256).hexdigest()
print(urlencode(p))`],{cwd:backend,encoding:'utf8'}).trim();
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});
try{for(const language of (process.env.QA_LIVE_LANGS||'ru,en').split(','))for(const width of (process.env.QA_LIVE_WIDTHS||'360,390,430').split(',').map(Number)){
 const page=await browser.newPage({viewport:{width,height:860}}),errors=[],apiErrors=[],network=[];
 page.on('pageerror',e=>errors.push(e.stack||e.message));
 page.on('response',r=>{if(r.url().includes('/api/')&&r.status()>=500)apiErrors.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('requestfailed',r=>{if(r.url().includes('/api/'))network.push(new URL(r.url()).pathname+':'+r.failure().errorText);});
 await page.addInitScript(({auth,language})=>{
  if(window.top!==window)return;
  localStorage.setItem('lang',language);localStorage.setItem('hideBanner','true');window.__API_BASE__='http://fixture.local/api';
  window.Telegram={WebApp:{initData:auth,initDataUnsafe:{user:{id:8808373218,username:'SlavMiran',first_name:'QA',language_code:language}},themeParams:{},colorScheme:'dark',platform:'tdesktop',version:'8.0',ready(){},expand(){},onEvent(){},offEvent(){},enableClosingConfirmation(){},disableClosingConfirmation(){},HapticFeedback:{selectionChanged(){},impactOccurred(){},notificationOccurred(){}},BackButton:{show(){},hide(){},onClick(){},offClick(){}},MainButton:{hide(){},show(){}},openTelegramLink(){},openLink(){}}};
 },{auth,language});
 await page.route('**/*',async route=>{const u=new URL(route.request().url());
  if(u.hostname==='fixture.local'&&u.pathname.startsWith('/api/')){
   if(route.request().method()!=='GET')return route.fulfill({json:{status:'success',success:true}});
   // Same-origin proxy avoids Chrome's private-network policy for a fixture host.
   // Every GET still executes the real signed Test API, with no response fixtures.
   try{const response=await route.fetch({url:'http://127.0.0.1:8001'+u.pathname+u.search,timeout:90000});return await route.fulfill({response});}
   catch(_){if(!page.isClosed())network.push(u.pathname+':proxy request failed');return route.abort('failed').catch(()=>{});}
  }
  if(u.hostname==='fixture.local'){
   const file=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));assert(file.startsWith(root+path.sep));
   if(!fs.existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({contentType:({'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  }
  if(u.hostname==='telegram.org')return route.fulfill({body:''});
  if(u.hostname==='127.0.0.1'&&route.request().method()!=='GET'&&route.request().method()!=='OPTIONS'){
   // Bootstrap profile/timezone writes are not part of a read-only screenshot run.
   return route.fulfill({headers:{'Access-Control-Allow-Origin':'*'},json:{status:'success',success:true}});
  }
  return route.continue();
 });
 await page.goto('http://fixture.local/',{waitUntil:'load'});
 await page.evaluate(()=>switchTab('projects'));
 try{await page.waitForSelector('#project-card-1238',{timeout:60000});}
 catch(err){await page.screenshot({path:path.join(out,`failure-${language}-${width}.png`)});console.error('Runtime errors:',errors,'API:',apiErrors,'Network:',network);console.error('Page state:',(await page.locator('body').innerText()).slice(0,300));throw err;}
 await page.evaluate(()=>document.documentElement.scrollTop=0);await page.screenshot({path:path.join(out,`projects-${language}-${width}.png`)});
 await page.evaluate(()=>switchTab('market'));await page.waitForSelector('.mk-card',{timeout:60000});
 await page.screenshot({path:path.join(out,`market-${language}-${width}.png`)});
 await page.evaluate(()=>SmartTopBar.open('settings'));await page.evaluate(()=>QAEcosystem.discover());
 await page.locator('#qa-ecosystem-open').click();await page.waitForSelector('[data-qa-key]');
 assert.equal(await page.locator('[data-qa-key] option').count()>8,true);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow');
 await page.screenshot({path:path.join(out,`qa-${language}-${width}.png`)});
 assert.deepEqual(apiErrors,[],'Native Test GET errors');if(errors.length)console.error('Runtime errors:',errors);assert.deepEqual(errors,[],'Full index runtime');await page.unrouteAll({behavior:'ignoreErrors'});await page.close();
}}
finally{await browser.close();}
console.log('Real Test API + full index: RU/EN 360/390/430 read-only screenshots OK');
})().catch(e=>{console.error(e.message);process.exit(1);});
