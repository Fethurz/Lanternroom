const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const W=+process.env.W||420;const p=await b.newPage({viewport:{width:W,height:900},deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});
await p.route('https://fonts.g**',r=>r.abort());
await p.goto('file://'+path.resolve('out/feral-horse-bench.html'));await p.waitForTimeout(800);
const states=JSON.parse(process.argv[2]);
for(const [name,fill,fat,act,wait] of states){await p.evaluate(([fill,fat])=>{BENCH.setFill(fill);BENCH.setFat(fat);},[fill,fat]);await p.waitForTimeout(2200);
 if(act)await p.evaluate(a=>BENCH[a](),act);await p.waitForTimeout(wait||0);
 await p.locator('#stage').screenshot({path:'out/'+name+'.png'});}
if(process.env.FULL)await p.screenshot({path:'out/page.png',fullPage:true});
console.log('errors',errs);await b.close();})();
