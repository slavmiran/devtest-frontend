/* Signed API fixtures exercise the real editor, task and Feedback Center modules. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'C:/Users/moska/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.LIVE_TEST_ARTIFACTS||path.resolve(root,'../artifacts/scenario-builder-v2'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lQ0AAAAASUVORK5CYII=','base64');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{for(const language of ['ru','en'])for(const width of [360,390,430]){
  const page=await browser.newPage({viewport:{width,height:940}}),errors=[],posts=[];
  let branch, task={progress_id:22,session_id:7,campaign_id:20,app_id:42,owner:false,state:'held',economy_version:2,
   open:true,round:1,rounds:2,round_day:2,proof_steps:[],scenario:{enabled:true,title:'Note workflow',economy_version:2,
    assigned_day:2,open_day:2,iterations_count:2,iterations_interval_days:2,proof_mode:'screenshot',steps:[
    {text:'Create a note',require_proof:true,quick_copy:'Test note',
     question:{prompt:'Was the note saved?',kind:'choice',options:['Yes','No']}},
    {text:'Read the result',question:{prompt:'What appeared?',kind:'text'}}]}};
  page.on('pageerror',err=>errors.push(err.message));
  await page.addInitScript(language=>{window.Telegram={WebApp:{initDataUnsafe:{user:{id:880,language_code:language}},
   themeParams:{},colorScheme:'dark',expand(){},ready(){},onEvent(){},offEvent(){},
   BackButton:{show(){},hide(){},onClick(){},offClick(){}}}};},language);
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url()),pathname=url.pathname;
   if(url.protocol==='blob:'||url.protocol==='data:')return route.continue();
   if(pathname.startsWith('/api/')){
    const ok=result=>route.fulfill({json:{status:'success',result}});
    if(pathname.includes('/proof/')&&req.method()==='POST'){posts.push({path:pathname});return ok({});}
    if(req.method()!=='GET')posts.push({path:pathname,body:req.postDataJSON()});
    if(pathname.endsWith('/live-device-brands'))return ok(req.method()==='PATCH'?req.postDataJSON():{mode:'any',brands:[]});
    if(pathname==='/api/live-campaigns/20/scenario-branches'){branch=req.postDataJSON().activity;return ok({id:21});}
    if(pathname==='/api/live-scenarios')return ok([task]);
    if(pathname==='/api/feedback/9/thread')return ok({id:9,app_id:42,type:'scenario',status:'pending',
     role:'owner',body:'Note workflow',comments:[]});
    if(pathname.endsWith('/rounds/1/submit')){task={...task,round:2,round_day:4,open:false,proof_steps:[]};return ok({round:1});}
    if(pathname==='/api/live-scenarios/feedback/9/rounds')return ok([{round:1,day:2,answers:{'1':{prompt:'Was it saved?',answer:'Yes',correct:true}},
     proofs:[{step:1,mime:'image/png'},{step:0,mime:'image/png'}]}]);
    if(pathname.includes('/rounds/1/proof/'))return route.fulfill({contentType:'image/png',body:png});
    return ok([]);
   }
   if(url.hostname!=='fixture.local')return route.fulfill({contentType:'application/javascript',body:''});
   const file=path.resolve(root,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
   assert(file.startsWith(root+path.sep));
   return route.fulfill({contentType:({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://fixture.local/',{waitUntil:'load'});
  await page.waitForSelector('#no-username-overlay.active');
  await page.evaluate(language=>{
   document.getElementById('no-username-overlay').remove();window.lang=language;window.API_BASE='/api';
   window.userId=880;window.getTelegramInitDataRaw=()=> 'signed-fixture';
   window.myProjects=[{id:42,app_id:42,name:'Orbit Notes',phase:'live',status:'active'}];window.myTests=[];
  },language);
  async function fits(){
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No page overflow');
   const widths=await page.locator('.lm-sheet:visible,.lse-editor:visible,.lr-task:visible').evaluateAll(nodes=>nodes.map(el=>({name:el.className,scroll:el.scrollWidth,width:el.clientWidth})));
   assert(widths.every(row=>row.scroll<=row.width+1),JSON.stringify(widths));
  }
  assert.equal(await page.evaluate(()=>{
   var activity={enabled:false,instructions:''};
   var button=document.createElement('button');button.dataset.lcwAction='done';
   LiveScenarioEditor.click(activity,button,{});
   return !('steps' in activity);
  }),true,'Unrelated wizard buttons preserve a disabled scenario');
  assert.deepEqual(await page.evaluate(async()=>{
   var a={enabled:true,instructions:''};LiveScenarioEditor.body(a,14);a.enabled=false;
   return LiveScenarioEditor.serialize(a,async()=>null);
  }),[],'A disabled unfinished draft does not send an invalid blank step');
  await page.evaluate(()=>LiveScenarioUI.create(20,42,14));
  const layer=page.locator('.lm-sheet').last(), editor=layer.locator('.lse-editor');
  await editor.waitFor();
  assert.equal(await editor.locator('[data-lse-field="description"]').count(),0);
  assert.equal(await editor.locator('[data-lse-field="quick_copy"]').count(),0);
  assert.equal(await editor.locator('[data-lcw-file]').count(),0);
  await editor.locator('[data-lse-import-text]').evaluate(el=>el.closest('details').open=true);
  await editor.locator('[data-lse-import-text]').fill(language==='ru'?'1. Создать заметку\n2. Открыть заметку\n3. Изменить заметку\n4. Сохранить результат':'1. Create a note\n2. Open the note\n3. Edit the note\n4. Save the result');
  await editor.locator('[data-lse-import]').click();
  assert.equal(await editor.locator('.lse-step').count(),4);
  assert.equal(await editor.locator('[data-lse-field="description"]').count(),0);
  await fits();
  await page.screenshot({path:path.join(out,'builder-compact-'+language+'-'+width+'.png')});
  const first=()=>editor.locator('.lse-step').first();
  await first().locator('[data-lse-option="require_proof"]').click();
  await first().locator('[data-lse-option="question"]').click();
  await first().locator('[data-lse-question="prompt"]').fill(language==='ru'?'Заметка сохранилась?':'Was the note saved?');
  await first().locator('[data-lse-question="kind"]').selectOption('choice');
  await first().locator('[data-lse-question="0"]').fill(language==='ru'?'Да':'Yes');
  await first().locator('[data-lse-question="1"]').fill(language==='ru'?'Нет':'No');
  await first().locator('[data-lse-question="correct_index"]').selectOption('0');
  await editor.locator('[data-lse-setting="iterations_count"]').selectOption('2');
  await editor.locator('[data-lse-setting="iterations_interval_days"]').selectOption('3');
  await editor.locator('[data-lse-setting="owner_bonus_bust"]').fill('30');
  assert.match(await editor.locator('[data-lse-fee]').innerText(),/1[,.]70/);
  assert.match(await editor.locator('[data-lse-reward]').innerText(),/70/);
  await fits();
  await first().scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'builder-artifacts-'+language+'-'+width+'.png')});
  await editor.locator('[data-lse-setting="owner_bonus_bust"]').fill('301');
  assert.equal(await layer.locator('[data-lrs-save]').isDisabled(),true);
  await editor.locator('[data-lse-bonus="15"]').click();
  assert.match(await editor.locator('[data-lse-reward]').innerText(),/55/);
  await editor.locator('[data-lse-setting="open_day"]').selectOption('14');
  assert.equal(await layer.locator('[data-lrs-save]').isDisabled(),true);
  await editor.locator('[data-lse-setting="open_day"]').selectOption('2');
  await editor.locator('[data-lse-setting="owner_bonus_bust"]').scrollIntoViewIfNeeded();
  await fits();
  await page.screenshot({path:path.join(out,'builder-economy-'+language+'-'+width+'.png')});
  await layer.locator('[data-lrs-save]').click();
  await layer.waitFor({state:'detached'});
  assert.equal(branch.iterations_count,2);assert.equal(branch.iterations_interval_days,3);
  assert.equal(branch.owner_bonus_bust,15);assert.equal(branch.steps[0].require_proof,true);
  assert.equal(branch.steps[0].question.correct_index,0);assert.equal(branch.steps.length,4);
  assert.equal(branch.steps[1].description,'');
  await page.evaluate(()=>LiveScenarioUI.brandSettings(42));
  await page.locator('[data-lrs-brands] select').waitFor();
  await page.locator('[data-lrs-brands] select').selectOption('allow');
  assert.equal(await page.locator('[data-lrs-brands] button').isDisabled(),true);
  await page.locator('[data-lrs-brands] input[value="samsung"]').check();
  await fits();
  await page.screenshot({path:path.join(out,'device-brands-'+language+'-'+width+'.png')});
  await page.locator('[data-lrs-brands] button').click();
  assert.equal(posts.at(-1).body.mode,'allow');
  await page.evaluate(()=>{
   document.getElementById('tab-tests').classList.add('active');
   const card=document.createElement('article');card.id='test-card-42';card.className='card';card.style.margin='12px';card.style.padding='12px';
   document.getElementById('tab-tests').append(card);
   return LiveScenarioUI.mount();
  });
  const host=page.locator('[data-lrs-task="22"]');
  await host.locator('[data-lrs-round-submit]').waitFor();
  await host.locator('[data-lrs-round-submit]').click();
  assert.equal(posts.some(row=>row.path.endsWith('/submit')),false);
  await host.locator('[data-lrs-answer="1"][value="0"]').check();
  await host.locator('textarea[data-lrs-answer="2"]').fill(language==='ru'?'Заметка открылась':'The note appeared');
  await host.locator('[data-lrs-round-submit]').click();
  assert.equal(posts.some(row=>row.path.endsWith('/submit')),false);
  for(const step of [1,0]){
   await host.locator('[data-lrs-proof-step="'+step+'"]').setInputFiles({name:'proof.png',mimeType:'image/png',buffer:png});
   await host.locator('[data-lrs-proof-step="'+step+'"][data-lrs-proof-saved]').waitFor();
  }
  await fits();await host.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'tester-scenario-'+language+'-'+width+'.png')});
  await host.locator('[data-lrs-round-submit]').click();
  await host.locator('[data-lrs-round-submit]').waitFor({state:'detached'});
  const submitted=posts.find(row=>row.path.endsWith('/rounds/1/submit'));
  assert.equal(submitted.body.answers['1'],0);assert.equal(typeof submitted.body.answers['2'],'string');
  assert.match(await host.innerText(),/D4/);
  await page.evaluate(()=>{
   var button=document.createElement('button');button.dataset.pfOpenTicket='9';document.body.append(button);button.click();button.remove();
  });
  await page.locator('[data-pf-thread-host] [data-pf-close="accepted"]').waitFor();
  assert.equal(await page.locator('[data-pf-close="rejected"]').count(),1);
  await page.locator('[data-lrs-evidence] summary').click();
  await page.locator('[data-lrs-evidence] figure').first().waitFor();
  assert.equal(await page.locator('[data-lrs-evidence] figure').count(),2);
  await fits();
  await page.screenshot({path:path.join(out,'scenario-evidence-'+language+'-'+width+'.png')});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Scenario Builder 2.0 passed: RU/EN × 360/390/430, compact import, proof/question price, schedule, validation, project brands, tester uploads, answers and owner evidence.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
