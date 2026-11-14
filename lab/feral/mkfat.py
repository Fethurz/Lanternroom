# fat map for the feral horse, in the app's scheme: alpha = f*G*sc - D/ds + 0.5
# D = distance outside the body; G = D/T where T = the weight at which a pixel gets covered (variable-radius growth of the outline)
import numpy as np, json, sys
from PIL import Image
S=1.5
a=np.asarray(Image.open('body_feralhorse.png'))[:,:,3].astype(np.float32)/255
H,W=a.shape; inside=a>0.5
# boundary pixels (inside with an outside 4-neighbour), not on the picture's edge
pad=np.pad(inside,1,constant_values=True)
edge=inside&~(pad[:-2,1:-1]&pad[2:,1:-1]&pad[1:-1,:-2]&pad[1:-1,2:])
by,bx=np.nonzero(edge); keep=(bx>1)&(bx<W-3); by,bx=by[keep],bx[keep]
# growth at full weight on each outline point: smooth blobs (horse coords x,y, sigma x, sigma y, px)
BL=json.load(open('fatblobs.json'))
hx,hy=bx/S,by/S
g=np.full(len(bx),BL['base'],np.float32)
for x,y,sx,sy,amp in BL['blobs']: g+=amp*np.exp(-((hx-x)/sx)**2/2-((hy-y)/sy)**2/2)
GY=BL['ground']; g*=np.clip((GY-12-hy)/25,0,1)            # nothing on the hooves
for x0,y0,x1,y1 in BL.get('zero',[]): g[(hx>x0)&(hx<x1)&(hy>y0)&(hy<y1)]=0
g*=S
gmax=float(g.max())+1e-6
ys,xs=np.nonzero(~inside)
D=np.zeros(len(xs),np.float32); Gv=np.zeros(len(xs),np.float32)
bxf,byf,gi=bx.astype(np.float32),by.astype(np.float32),1/np.maximum(g,1e-3)
CH=3000
for i in range(0,len(xs),CH):
    dx=xs[i:i+CH,None]-bxf[None,:]; dy=ys[i:i+CH,None]-byf[None,:]; d=np.sqrt(dx*dx+dy*dy)
    k=(d*gi[None,:]).argmin(1); r=np.arange(len(k))
    D[i:i+CH]=d[r,k]; Gv[i:i+CH]=g[k]          # the outline point that reaches this pixel first: its growth, and the distance to it
far=D>254; D[far]=255; Gv[far]=0
Gv[ys>GY*S]=0                                              # never below the ground
Gm=np.zeros((H,W),np.float32); Dm=np.zeros((H,W),np.float32); Gm[ys,xs]=Gv; Dm[ys,xs]=D; Gm[inside]=Gm.max()
gmax=float(Gm.max())
Image.fromarray(np.clip(Gm/gmax*255+0.5,0,255).astype(np.uint8)).save('fatG_feralhorse.png',optimize=True)
Image.fromarray(np.clip(Dm+0.5,0,255).astype(np.uint8)).save('fat_feralhorse.png',optimize=True)
json.dump({'gmax':gmax,'ds':1},open('fatmeta.json','w')); print('gmax',gmax,len(bx),len(xs))
