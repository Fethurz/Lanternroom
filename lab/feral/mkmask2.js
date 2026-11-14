// node mkmask2.js <svg> <ox> <oy> <scale> <W> <H> <out.png> [ellipses json]: every coloured path of the drawing as one white mask
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const [svgF,ox,oy,S,W,H,out,ex]=process.argv.slice(2);const svg=fs.readFileSync(svgF,'utf8');
const ds=[...svg.matchAll(/<path[^>]*?fill="(#[0-9A-Fa-f]+)"[^>]*?\sd="([^"]+)"/g)].filter(m=>!/^#[C-F].[C-F].[C-F]./i.test(m[1])).map(m=>m[2].replace(/\s+/g,' '));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+W,height:+H}});
const url=await p.evaluate(({ds,ox,oy,S,W,H,ex})=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.scale(S,S);x.translate(-ox,-oy);x.fillStyle='#fff';
 for(const d of ds)x.fill(new Path2D(d),'evenodd');for(const e of ex){x.beginPath();x.ellipse(e[0],e[1],e[2],e[3],0,0,7);x.fill();}return c.toDataURL('image/png');},{ds,ox:+ox,oy:+oy,S:+S,W:+W,H:+H,ex:JSON.parse(ex||'[]')});
fs.writeFileSync(out,Buffer.from(url.split(',')[1],'base64'));console.log(ds.length,'paths');await b.close();})();
