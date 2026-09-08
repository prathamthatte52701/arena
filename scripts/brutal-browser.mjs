import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_PATH || 'C:/Users/Pratham/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs').href);
import fs from 'node:fs';
const base = process.argv[2] || 'http://localhost:3000';
const output = process.argv[3] || 'docs/brutal-qa/browser-dev.json';
await (async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROME || 'C:/Users/Pratham/.cache/puppeteer/chrome/win64-150.0.7871.24/chrome-win64/chrome.exe',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 let failureInjection=false;
 const report={base,errors:[],warnings:[],routes:[],performance:[],entrances:[],failures:[],soak:{},assetFailure:[]};
 page.on('pageerror',e=>report.errors.push({url:page.url(),message:e.message}));
 page.on('console',e=>{if(e.type()==='error')report.errors.push({url:page.url(),message:e.text(),location:e.location(),failureInjection});if(e.type()==='warning')report.warnings.push(e.text());});
 const ready=async(path)=>{await page.goto(base+path);await page.waitForTimeout(1700);};
 const snapshot=()=>page.evaluate(()=>({url:location.pathname,canvases:document.querySelectorAll('canvas').length,text:document.body.innerText.slice(-1000)}));
 try{
 for(let i=0;i<20;i++){const route=['/','/3d-sandbox','/3d-match','/entrance','/backstage'][i%5];await ready(route);report.routes.push(await snapshot());if(await page.locator('canvas').count()!==(route==='/'?5:1))report.failures.push('Canvas count: '+route);}
 for(const route of ['/3d-sandbox','/3d-match','/entrance','/backstage']){
 await ready(route);const samples=await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();let previous=start;const deltas=[];function frame(now){deltas.push(now-previous);previous=now;if(now-start>=5000){resolve({durationMs:now-start,averageFps:1000*deltas.length/(now-start),minimumFps:1000/Math.max(...deltas)});}else requestAnimationFrame(frame);}requestAnimationFrame(frame);}));report.performance.push({route,...samples});}
 await ready('/3d-match?qaClose=1&qaFreezeCpu=1&qaMomentum=1');
 const health=()=>page.locator('[data-testid="match-combat-health"]').innerText();
 report.soak.healthBefore=await health();await page.keyboard.press('g');await page.waitForTimeout(700);await page.waitForFunction(()=>document.querySelector('[data-testid="match-sync-state"]')?.textContent.startsWith('FREE'));report.soak.healthFirst=await health();await page.keyboard.press('g');await page.waitForTimeout(700);await page.waitForFunction(()=>document.querySelector('[data-testid="match-sync-state"]')?.textContent.startsWith('FREE'));report.soak.healthSecond=await health();
 const start=Date.now();for(let i=0;i<60;i++){await page.keyboard.press(['j','k','g','h','u','c','t'][i%7]);await page.keyboard.down(i%2?'w':'d');await page.waitForTimeout(100);await page.keyboard.up(i%2?'w':'d');await page.waitForTimeout(250);}report.soak.durationMs=Date.now()-start;report.soak.snapshot=await snapshot();
 await page.keyboard.down('Space');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(350);report.soak.blur=await snapshot();await page.keyboard.up('Space');
 for(const name of ['RHEA','CHYNA','CHARLOTTE','BIANCA']){await ready('/entrance');await page.getByRole('button',{name:new RegExp('^'+name)}).click();await page.waitForTimeout(500);await page.getByRole('button',{name:'SKIP ENTRANCE →'}).click();await page.waitForTimeout(500);report.entrances.push({identity:name,skip:await snapshot()});}
 failureInjection=true;for(const path of ['/3d-sandbox','/3d-match','/entrance','/backstage']){await page.route('**/models/development/humanoid.glb',r=>r.fulfill({status:404,body:'QA missing asset'}));await ready(path);report.assetFailure.push(await snapshot());await page.unroute('**/models/development/humanoid.glb');}
 }catch(e){report.failures.push(e.stack);}finally{fs.writeFileSync(output,JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({output,errors:report.errors.length,failures:report.failures,routeCycles:report.routes.length,performance:report.performance}));}
})();
