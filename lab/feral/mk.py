# python3 mk.py <species>: the mask, the fat maps and the rig for one feral body, from species/<name>.json (all numbers there are
# in the drawing's own units; the rig is (point - origin) * scale)
import numpy as np, json, sys, math, os, subprocess
from PIL import Image
C=json.load(open('species/%s.json'%sys.argv[1])); S=C['scale']; OX,OY=C['origin']; W=round(C['size'][0]*S); H=round(C['size'][1]*S)
out='out_'+C['name']; os.makedirs(out,exist_ok=True)
subprocess.run(['node','mkmask2.js',C['svg'],str(OX),str(OY),str(S),str(W),str(H),out+'/body.png',json.dumps(C.get('extra',[]))],check=True)
# ---- fat: alpha = f*G*gmax/255 - D + 0.5. Each pixel keeps the outline point that reaches it first: that point's growth (G) and the distance to it (D)
a=np.asarray(Image.open(out+'/body.png'))[:,:,3].astype(np.float32)/255; inside=a>0.5
pad=np.pad(inside,1,constant_values=True)
edge=inside&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
by,bx=np.nonzero(edge); keep=(bx>1)&(bx<W-3); by,bx=by[keep],bx[keep]
F=C['fat']; hx,hy=bx/S+OX,by/S+OY; GY=C['ground']
g=np.full(len(bx),F['base'],np.float32)
for x,y,sx,sy,amp in F['blobs']: g+=amp*np.exp(-((hx-x)/sx)**2/2-((hy-y)/sy)**2/2)
g*=np.clip((GY-12-hy)/25,0,1)
for x0,y0,x1,y1 in F.get('zero',[]): g[(hx>x0)&(hx<x1)&(hy>y0)&(hy<y1)]=0
g*=S
ys,xs=np.nonzero(~inside); D=np.zeros(len(xs),np.float32); Gv=np.zeros(len(xs),np.float32)
bxf,byf,gi=bx.astype(np.float32),by.astype(np.float32),1/np.maximum(g,1e-3)
for i in range(0,len(xs),3000):
    dx=xs[i:i+3000,None]-bxf[None,:]; dy=ys[i:i+3000,None]-byf[None,:]; d=np.sqrt(dx*dx+dy*dy)
    k=(d*gi[None,:]).argmin(1); r=np.arange(len(k)); D[i:i+3000]=d[r,k]; Gv[i:i+3000]=g[k]
far=D>254; D[far]=255; Gv[far]=0; Gv[ys>(GY-OY)*S]=0
Gm=np.zeros((H,W),np.float32); Dm=np.zeros((H,W),np.float32); Gm[ys,xs]=Gv; Dm[ys,xs]=D; Gm[inside]=Gm.max(); gmax=float(Gm.max())
Image.fromarray(np.clip(Gm/gmax*255+0.5,0,255).astype(np.uint8)).save(out+'/fatG.png',optimize=True)
Image.fromarray(np.clip(Dm+0.5,0,255).astype(np.uint8)).save(out+'/fatD.png',optimize=True)
# ---- rig
t=lambda p:[round((p[0]-OX)*S,1),round((p[1]-OY)*S,1)]
P=C['belly']; NBL=240; frames=[]
for e in [0,0.2,0.4,0.6,0.8,1]:   # the belly: a sagging circle, its top hidden inside the barrel
    Dp=P['depth']*e**P['depthPow']; aa=P['a'][0]+P['a'][1]*e; bb=aa*P['round']; yc=P['under']+Dp-bb
    frames.append([t((P['cx']+aa*math.sin(2*math.pi*i/NBL), yc-bb*math.cos(2*math.pi*i/NBL))) for i in range(NBL)])
T=C['butt']; n=C['neck']; butt={'tip':t(T['tip']),'c0':t(T['c0']),'r0':T['r0']*S,'c1':t(T['c1']),'r1':T['r1']*S,'fold':T['fold']}
if 'seamArc' in T: butt['seamArc']=T['seamArc']
rig={'name':C['name'],'label':C['label'],'w':W,'h':H,'ground':(GY-OY)*S,'view':C['view'],
 'belly':{'frames':frames,'rootY':(P['mob'][0]-OY)*S,'looseY':(P['mob'][1]-OY)*S},
 'butt':butt,'near':[[t(p) for p in poly] for poly in C['near']],'rear':[t(p) for p in C['rear']],
 'neck':{'piv':t(n['piv']),'r0':n['r0']*S,'r1':n['r1']*S,'rmax':n['rmax']*S,'a0':n['a0'],'a1':n['a1'],'mouth':t(n['mouth'])},
 'fat':{'gmax':gmax,'ds':1}}
json.dump(rig,open(out+'/rig.json','w'),separators=(',',':')); print(C['name'],W,H,'gmax',round(gmax,1))
