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
P=B['shape']; NBL=240
def outline(e):
    # a sagging circle: its top sits hidden inside the barrel, the rest hangs. A light meal shows as a round shallow arc;
    # a big one hangs right out, with sides that bulge over the legs. Never a straight edge anywhere
    D=P['depth']*e**P['depthPow']; a=P['a'][0]+P['a'][1]*e; b=a*P['round']; yc=P['under']+D-b
    return [(P['cx']+a*math.sin(2*math.pi*i/NBL), yc-b*math.cos(2*math.pi*i/NBL)) for i in range(NBL)]
E_=[0,0.2,0.4,0.6,0.8,1]; frames=[outline(e) for e in E_]; full=frames[-1]
ss=lambda u:(lambda v:v*v*(3-2*v))(max(0,min(1,u)))
m0,m1=B['mob']; ntop=NBL
mob=[0 if i>=ntop else round(ss((y-m0)/(m1-m0)),3) for i,(x,y) in enumerate(full)]
r=lambda ps:[[round(x*S,1),round(y*S,1)] for x,y in ps]
fm=json.load(open('fatmeta.json')); n=B['neck']
T=B['butt']; h=lambda p:[p[0]*S,p[1]*S]
fx0,fx1,fmin=B['dropFade']; dropw=[round(1-(1-fmin)*ss((x-fx0)/(fx1-fx0)),3) for x,y in full]
rig={'w':1110,'h':930,'ground':B['ground']*S,'belly':{'frames':[r(f) for f in frames],'mob':mob,'dropw':dropw,'rootY':m0*S,'looseY':m1*S,'seam':[1 if m>0.12 else 0 for m in mob]},
 'neck':{'piv':[n['piv'][0]*S,n['piv'][1]*S],'r0':n['r0']*S,'r1':n['r1']*S,'rmax':n['rmax']*S,'a0':n['a0'],'a1':n['a1'],'mouth':[n['mouth'][0]*S,n['mouth'][1]*S]},
 'butt':{'tip':h(T['tip']),'c0':h(T['c0']),'r0':T['r0']*S,'c1':h(T['c1']),'r1':T['r1']*S,'fold':T['fold']},'near':[r(p) for p in B['near']],'rear':r(B['rear']),
 'fat':{'gmax':fm['gmax'],'ds':fm['ds'],'drop':B['fatDrop']*S}}
json.dump(rig,open('feral.json','w'),separators=(',',':')); print(len(json.dumps(rig)))
