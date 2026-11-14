const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const S=1.5,W=1035,H=930;const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});
const d=fs.readFileSync('horse.svg','utf8').match(/ d="([^"]+)"/)[1];
const url=await p.evaluate(({d,S,W,H})=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.scale(S,S);x.fillStyle='#fff';x.fill(new Path2D(d),'evenodd');return c.toDataURL('image/png');},{d,S,W,H});
fs.writeFileSync('body_feralhorse.png',Buffer.from(url.split(',')[1],'base64'));await b.close();})();
