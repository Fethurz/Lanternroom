// node mkcontour.js <svg> <out.json>: the silhouette's outline as 8000 points evenly along its length (the longest coloured path)
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [svgF,out]=process.argv.slice(2);const svg=fs.readFileSync(svgF,'utf8');
const ds=[...svg.matchAll(/<path[^>]*?fill="(#[0-9A-Fa-f]+)"[^>]*?\sd="([^"]+)"/g)].filter(m=>!/^#[C-F].[C-F].[C-F]./i.test(m[1])).map(m=>m[2].replace(/\s+/g,' ')).sort((a,b)=>b.length-a.length);
const b=await chromium.launch();const p=await b.newPage();
const pts=await p.evaluate(d=>{const e=document.createElementNS('http://www.w3.org/2000/svg','path');e.setAttribute('d',d);const L=e.getTotalLength(),o=[];for(let i=0;i<8000;i++){const q=e.getPointAtLength(L*i/8000);o.push([+q.x.toFixed(2),+q.y.toFixed(2)]);}return o;},ds[0]);
fs.writeFileSync(out,JSON.stringify(pts));await b.close();})();
