import re, json, base64
src=open('/home/user/Lanternroom/index.html',encoding='utf8').read().replace('\r\n','\n')
def grab(start,end):
    i=src.index(start); j=src.index(end,i); return src[i:j]
eng=grab('function smoothPath(','function rubBody(')+grab('function silSoft(','function silEngine(')+grab('function silFill(','function silPix(')
b64=lambda p,m='image/png':'data:%s;base64,%s'%(m,base64.b64encode(open(p,'rb').read()).decode())
SP=['horse','wolf']
rigs={s:json.load(open('out_%s/rig.json'%s)) for s in SP}
import os
assets={s:{k:b64('out_%s/%s.png'%(s,k)) for k in ('body','fatG','fatD','sdfL','sdfF') if os.path.exists('out_%s/%s.png'%(s,k))} for s in SP}
t=open('bench.src.html',encoding='utf8').read()
t=t.replace('/*RIGS*/null',json.dumps(rigs,separators=(',',':'))).replace('/*ASSETS*/null',json.dumps(assets)).replace('/*ENGINE*/',eng)
import os; os.makedirs('out',exist_ok=True); open('out/feral-horse-bench.html','w',encoding='utf8').write(t); print(len(t))
