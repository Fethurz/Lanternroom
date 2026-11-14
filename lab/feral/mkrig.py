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
P=B['shape']; NL,NR=P['neckL'],P['neckR']; NH,NT=180,60
def outline(e):
    # the hanging part: always one smooth round curve from root to root. A light sag is a shallow arc; as it fills the sides
    # swell out past the root and the bottom rounds into a heavy sack, a little heavier toward the back
    D=P['depth']*e**P['depthPow']; beta=P['bulge']*e**P['bulgePow']; k=2/P['n']
    xc=(NL[0]+NR[0])/2; a=(NR[0]-NL[0])/2; hang=[]
    for i in range(801):   # a full, slightly squared-off half ellipse: curved at every point, never flat and never pointed
        t=math.pi*i/800; st=math.sin(t); ct=math.cos(t); y0=NL[1]+(NR[1]-NL[1])*(1-ct)/2
        hang.append((xc-a*math.copysign(abs(ct)**k,ct)*(1+beta*st)+P['skew']*D*st*st, y0+D*st**k))
    return even(hang,NH)+even(bez(NR,tuple(P['topC'][0]),tuple(P['topC'][1]),NL),NT)
E_=[0,0.2,0.4,0.6,0.8,1]; frames=[outline(e) for e in E_]; full=frames[-1]
ss=lambda u:(lambda v:v*v*(3-2*v))(max(0,min(1,u)))
m0,m1=B['mob']; ntop=NH
mob=[0 if i>=ntop else round(ss((y-m0)/(m1-m0)),3) for i,(x,y) in enumerate(full)]
r=lambda ps:[[round(x*S,1),round(y*S,1)] for x,y in ps]
fm=json.load(open('fatmeta.json')); n=B['neck']
# the rump: a round cheek that grows with weight, loose at the back and underneath, joined at the hip
T=B['butt']; NB=168
# one round cheek, high on the back end. Only the part that sticks out behind the body is loose; where it sits inside the
# body it never moves. The crease is the short fold under it, where it meets the back of the thigh
cheek=lambda o:[(o['c'][0]+o['r']*math.cos(2*math.pi*i/NB),o['c'][1]+o['r']*math.sin(2*math.pi*i/NB)) for i in range(NB)]
c0,c1=T['mobCos']; bmob=[round(ss((math.cos(2*math.pi*i/NB)-c0)/(c1-c0)),3) for i in range(NB)]
bseam=[1 if T['seam'][0]<=360*i/NB<=T['seam'][1] else 0 for i in range(NB)]
fx0,fx1,fmin=B['dropFade']; dropw=[round(1-(1-fmin)*ss((x-fx0)/(fx1-fx0)),3) for x,y in full]
rig={'w':1110,'h':930,'ground':B['ground']*S,'belly':{'frames':[r(f) for f in frames],'mob':mob,'dropw':dropw,'seam':[1 if m>0.12 else 0 for m in mob]},
 'neck':{'piv':[n['piv'][0]*S,n['piv'][1]*S],'r0':n['r0']*S,'r1':n['r1']*S,'rmax':n['rmax']*S,'a0':n['a0'],'a1':n['a1'],'mouth':[n['mouth'][0]*S,n['mouth'][1]*S]},
 'butt':{'lean':r(cheek(T['lean'])),'fat':r(cheek(T['fat'])),'mob':bmob,'seam':bseam},'near':[r(p) for p in B['near']],
 'fat':{'gmax':fm['gmax'],'ds':fm['ds'],'drop':B['fatDrop']*S}}
json.dump(rig,open('feral.json','w'),separators=(',',':')); print(len(json.dumps(rig)))
