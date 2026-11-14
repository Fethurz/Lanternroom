# python3 mk.py <species>: the mask, the fat maps and the rig for one feral body, from species/<name>.json (all numbers there are
# in the drawing's own units; the rig is (point - origin) * scale)
import numpy as np, json, sys, math, os, subprocess
from PIL import Image
C=json.load(open('species/%s.json'%sys.argv[1])); S=C['scale']; OX,OY=C['origin']; W=round(C['size'][0]*S); H=round(C['size'][1]*S)
out='out_'+C['name']; os.makedirs(out,exist_ok=True); GY=C['ground']
subprocess.run(['node','mkmask2.js',C['svg'],str(OX),str(OY),str(S),str(W),str(H),out+'/body.png',json.dumps(C.get('extra',[]))],check=True)
a=np.asarray(Image.open(out+'/body.png'))[:,:,3].astype(np.float32)/255; inside=a>0.5
t=lambda p:[round((p[0]-OX)*S,1),round((p[1]-OY)*S,1)]
extra={}
if 'morph' in C:
    # ---- a second drawing at full weight: every weight between is the blend of the two outlines' distance fields.
    # The rump of the fat drawing is lifted out as its own soft part (the cheek), so it can wobble; under it the body keeps the lean shape
    from PIL import ImageDraw
    subprocess.run(['node','mkmask2.js',C['morph']['svg'],str(OX),str(OY),str(S),str(W),str(H),out+'/fat.png','[]'],check=True)
    subprocess.run(['node','mkcontour.js',C['svg'],out+'/lean_contour.json'],check=True); subprocess.run(['node','mkcontour.js',C['morph']['svg'],out+'/fat_contour.json'],check=True)
    LC=json.load(open(out+'/lean_contour.json')); FC=json.load(open(out+'/fat_contour.json')); K=C['cheek']
    near=lambda P,q:min(range(len(P)),key=lambda k:math.hypot(P[k][0]-q[0],P[k][1]-q[1]))
    def run(P,q0,q1):   # the outline between two points, the short way round
        i,j=near(P,q0),near(P,q1); n=len(P); fwd=[P[(i+k)%n] for k in range((j-i)%n+1)]; back=[P[(i-k)%n] for k in range((i-j)%n+1)]
        return fwd if len(fwd)<=len(back) else back
    def even(pts,k,end=False):
        cum=[0]
        for p,q in zip(pts,pts[1:]): cum.append(cum[-1]+math.hypot(q[0]-p[0],q[1]-p[1]))
        o=[]; j=0; m=k-1 if end else k
        for i in range(k):
            s_=cum[-1]*i/m
            while j<len(cum)-2 and cum[j+1]<s_: j+=1
            u=(s_-cum[j])/max(1e-9,cum[j+1]-cum[j]); p,q=pts[j],pts[j+1]; o.append((p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u))
        return o
    line=lambda p,q,k:[(p[0]+(q[0]-p[0])*i/k,p[1]+(q[1]-p[1])*i/k) for i in range(k)]
    NA,NL,NB,NC=140,10,50,30
    fA=even(run(FC,*K['fatA2']),NA,True); fB=even(run(FC,*K['fatB']),NB,True); fAs=even(run(FC,*K['fatA']),NA,True)   # the cheek starts a little forward of where the body hands over to it, so the two overlap and no notch shows
    fat=fA+line(fA[-1],fB[0],NL+1)[1:]+fB+line(fB[-1],fA[0],NC+1)[1:-1]
    lA=even(run(LC,*K['leanA2']),NA,True); lB=line(K['leanLink'],K['leanTip'],NB-1)+[tuple(K['leanTip'])]
    lean=lA+line(lA[-1],lB[0],NL+1)[1:]+lB+line(lB[-1],lA[0],NC+1)[1:-1]
    assert len(fat)==len(lean), (len(fat),len(lean))
    ss=lambda u:(lambda v:v*v*(3-2*v))(max(0,min(1,u)))
    n=len(fat); iB0=NA+NL; iB1=NA+NL+NB   # loose everywhere but the inner front edge; the two ends where it joins the body ease to still
    mob=[ss((i-10)/18) if i<NA else 1 if i<iB0 else ss((iB1-1-i)/22) if i<iB1 else 0 for i in range(n)]
    seam=[1 if iB0<=i<iB1 else 0 for i in range(n)]
    extra['cheek']={'lean':[t(p) for p in lean],'fat':[t(p) for p in fat],'mob':[round(m,3) for m in mob],'seam':seam,'crease':K['crease']*S}
    # the body at full weight: the fat drawing, but lean inside the cheek's own region (a little short of its inner edge, so no seam shows)
    sub=fAs+line(fAs[-1],fB[0],NL+1)[1:]+fB+[(p[0]+10,p[1]) for p in line(fB[-1],fAs[0],NC+1)[1:-1]]
    ras=lambda poly:np.asarray((lambda im:(ImageDraw.Draw(im).polygon([tuple(t(p)) for p in poly],fill=255),im)[1])(Image.new('L',(W,H),0)))>127
    inpoly=ras(sub); fa=np.asarray(Image.open(out+'/fat.png'))[:,:,3]>127
    under=ras(K['under']+[(K['under'][-1][0],2000),(K['under'][0][0],2000)])   # under the lean back line the fat drawing's own hips and thighs stay; only the bulge above it is the cheek's
    fa=fa|ras(fB+[(p[0],p[1]+16) for p in reversed(fB)])                        # the drawn crease is filled in here: the bench draws it itself, so it can grow and move with the cheek
    fatbody=np.where(inpoly,inside|(fa&under),fa)
    def sdf(m):   # signed distance to the outline: negative inside
        pd=np.pad(m,1,constant_values=False); pe=np.pad(m,1,constant_values=True)
        ein=m&~(pe[:-2,1:-1]&pe[2:,1:-1]&pe[1:-1,:-2]&pe[1:-1,2:]); ey,ex=np.nonzero(ein); ex=ex.astype(np.float32); ey=ey.astype(np.float32)
        yy,xx=np.mgrid[0:H,0:W]; xx=xx.ravel().astype(np.float32); yy=yy.ravel().astype(np.float32); d=np.empty(len(xx),np.float32)
        for i in range(0,len(xx),2500):
            dx=xx[i:i+2500,None]-ex[None,:]; dy=yy[i:i+2500,None]-ey[None,:]; d[i:i+2500]=np.sqrt((dx*dx+dy*dy).min(1))
        d=d.reshape(H,W); return np.where(m,-d-0.5,d-0.5)
    for nm,m in (('sdfL',inside),('sdfF',fatbody)):
        v=np.clip(sdf(m)*64+32768,0,65535).astype(np.uint16); im=np.zeros((H,W,3),np.uint8); im[:,:,0]=v>>8; im[:,:,1]=v&255
        Image.fromarray(im).save(out+'/%s.png'%nm,optimize=True)
    extra['morph']={'enc':64}; gmax=0
else:
    # ---- fat: alpha = f*G*gmax/255 - D + 0.5. Each pixel keeps the outline point that reaches it first: that point's growth (G) and the distance to it (D)
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
P=C['belly']; NBL=240; frames=[]
for e in [0,0.2,0.4,0.6,0.8,1]:   # the belly: a sagging circle, its top hidden inside the barrel
    Dp=P['depth']*e**P['depthPow']; aa=P['a'][0]+P['a'][1]*e; bb=aa*P['round']; yc=P['under']+Dp-bb
    frames.append([t((P['cx']+aa*math.sin(2*math.pi*i/NBL), yc-bb*math.cos(2*math.pi*i/NBL))) for i in range(NBL)])
n=C['neck']; butt=None
if 'butt' in C:
    T=C['butt']; butt={'tip':t(T['tip']),'c0':t(T['c0']),'r0':T['r0']*S,'c1':t(T['c1']),'r1':T['r1']*S,'fold':T['fold']}
    if 'seamArc' in T: butt['seamArc']=T['seamArc']
rig={'name':C['name'],'label':C['label'],'w':W,'h':H,'ground':(GY-OY)*S,'view':C['view'],
 'belly':{'frames':frames,'rootY':(P['mob'][0]-OY)*S,'looseY':(P['mob'][1]-OY)*S},
 'butt':butt,'near':[[t(p) for p in poly] for poly in C['near']],'rear':[t(p) for p in C['rear']] if 'rear' in C else None,
 'neck':{'piv':t(n['piv']),'r0':n['r0']*S,'r1':n['r1']*S,'rmax':n['rmax']*S,'a0':n['a0'],'a1':n['a1'],'mouth':t(n['mouth'])},
 'fat':{'gmax':gmax,'ds':1}}
rig.update(extra)
json.dump(rig,open(out+'/rig.json','w'),separators=(',',':')); print(C['name'],W,H,'gmax',round(gmax,1))
