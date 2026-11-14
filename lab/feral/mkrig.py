# the feral horse's rig: the belly outline at six fill levels (same points in each), looseness, crease, the neck's bend, the mouth
import json, math
S=1.5
B=json.load(open('belly.json'))
def bez(p0,c1,c2,p3,n=300):
    return [((1-t)**3*p0[0]+3*(1-t)**2*t*c1[0]+3*(1-t)*t*t*c2[0]+t**3*p3[0],(1-t)**3*p0[1]+3*(1-t)**2*t*c1[1]+3*(1-t)*t*t*c2[1]+t**3*p3[1]) for t in [i/n for i in range(n+1)]]
def even(pts,k):   # k points evenly along a curve (the end point left for the next piece)
    cum=[0]
    for a,b in zip(pts,pts[1:]): cum.append(cum[-1]+math.hypot(b[0]-a[0],b[1]-a[1]))
    out=[]; j=0
    for i in range(k):
        s=cum[-1]*i/k
        while j<len(cum)-2 and cum[j+1]<s: j+=1
        t=(s-cum[j])/max(1e-9,cum[j+1]-cum[j]); a,b=pts[j],pts[j+1]; out.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    return out
P=B['shape']; NL,NR,Y0=P['neckL'],P['neckR'],P['y0']; CNT=[36,54,54,36,60]
def outline(e):
    D=P['depth']*e**P['depthPow']; b=e**P['bulgePow']; xL=NL[0]-P['bulgeL']*b; xR=NR[0]+P['bulgeR']*b; xb=P['bottomX']; yb=Y0+D
    L=(xL,Y0+0.5*D); R=(xR,Y0+0.52*D); Bm=(xb,yb)
    segs=[(NL,(NL[0]-18*b,NL[1]+0.124*D),(xL,Y0+0.32*D),L),
          (L,(xL,Y0+0.8*D),(xb-0.51*(xb-xL),yb),Bm),
          (Bm,(xb+0.54*(xR-xb),yb),(xR,Y0+0.81*D),R),
          (R,(xR,Y0+0.32*D),(NR[0]+28*b,NR[1]+0.115*D),NR),
          (NR,tuple(P['topC'][0]),tuple(P['topC'][1]),NL)]
    out=[]
    for s,k in zip(segs,CNT): out+=even(bez(*s),k)
    return out
E_=[0,0.2,0.4,0.6,0.8,1]; frames=[outline(e) for e in E_]; full=frames[-1]
ss=lambda u:(lambda v:v*v*(3-2*v))(max(0,min(1,u)))
m0,m1=B['mob']; ntop=sum(CNT[:4])
mob=[0 if i>=ntop else round(ss((y-m0)/(m1-m0)),3) for i,(x,y) in enumerate(full)]
r=lambda ps:[[round(x*S,1),round(y*S,1)] for x,y in ps]
fm=json.load(open('fatmeta.json')); n=B['neck']
# the rump: a round cheek that grows with weight, loose at the back and underneath, joined at the hip
T=B['butt']; NB=160
def cheek(o):
    out=[]
    for i in range(NB):
        a=2*math.pi*i/NB; k=1+T['heavy'][0]*math.cos(a-math.radians(T['heavy'][1])); out.append((o['c'][0]+o['rx']*k*math.cos(a),o['c'][1]+o['ry']*k*math.sin(a)))
    return out
ux,uy=T['u']; bmob=[round(ss(math.cos(2*math.pi*i/NB)*ux+math.sin(2*math.pi*i/NB)*uy+0.55),3) for i in range(NB)]
bseam=[1 if T['seam'][0]<=360*i/NB<=T['seam'][1] else 0 for i in range(NB)]
fx0,fx1,fmin=B['dropFade']; dropw=[round(1-(1-fmin)*ss((x-fx0)/(fx1-fx0)),3) for x,y in full]
rig={'w':1110,'h':930,'ground':B['ground']*S,'belly':{'frames':[r(f) for f in frames],'mob':mob,'dropw':dropw,'seam':[1 if m>0.12 else 0 for m in mob]},
 'neck':{'piv':[n['piv'][0]*S,n['piv'][1]*S],'r0':n['r0']*S,'r1':n['r1']*S,'rmax':n['rmax']*S,'a0':n['a0'],'a1':n['a1'],'mouth':[n['mouth'][0]*S,n['mouth'][1]*S]},
 'butt':{'lean':r(cheek(T['lean'])),'fat':r(cheek(T['fat'])),'mob':bmob,'seam':bseam},'near':[r(p) for p in B['near']],
 'fat':{'gmax':fm['gmax'],'ds':fm['ds'],'drop':B['fatDrop']*S}}
json.dump(rig,open('feral.json','w'),separators=(',',':')); print(len(json.dumps(rig)))
