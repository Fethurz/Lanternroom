// node shot.js '[["name","horse|wolf",fill,fat,act,wait]]'  act: belch | gulp | bounce | drag:x1,y1,x2,y2 (rig px)
const {chromium}=require('playwright');const path=require('path');
(async()=>{const b=await chromium.launch();const W=+process.env.W||420;const p=await b.newPage({viewport:{width:W,height:900},deviceScaleFactor:2});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});
await p.route('https://fonts.g**',r=>r.abort());
await p.goto('file://'+path.resolve('out/feral-horse-bench.html'));await p.waitForTimeout(800);
let cur='';
for(const [name,sp,fill,fat,act,wait] of JSON.parse(process.argv[2])){
 if(sp!==cur){cur=sp;await p.evaluate(s=>BENCH.setSpecies(s),sp);await p.waitForTimeout(500);}
 await p.evaluate(([fill,fat])=>{BENCH.setFill(fill);BENCH.setFat(fat);},[fill,fat]);await p.waitForTimeout(2200);
 if(act&&act.startsWith('drag:')){const [x1,y1,x2,y2]=act.slice(5).split(',').map(Number);const P=(x,y)=>p.evaluate(([x,y])=>BENCH.client(x,y),[x,y]);
  await p.mouse.move(...await P(x1,y1));await p.mouse.down();for(let i=1;i<=12;i++){await p.mouse.move(...await P(x1+(x2-x1)*i/12,y1+(y2-y1)*i/12));await p.waitForTimeout(16);}
  await p.locator('#stage').screenshot({path:'out/'+name+'.png'});await p.mouse.up();continue;}
 if(act)await p.evaluate(a=>BENCH[a](),act);await p.waitForTimeout(wait||0);
 await p.locator('#stage').screenshot({path:'out/'+name+'.png'});}
if(process.env.FULL)await p.screenshot({path:'out/page.png',fullPage:true});
console.log('errors',errs);await b.close();})();
