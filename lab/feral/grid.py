import sys
from PIL import Image
names=sys.argv[2:]; cols=int(sys.argv[1]); ims=[Image.open('out/%s.png'%n) for n in names]
w=max(i.width for i in ims); h=max(i.height for i in ims); rows=(len(ims)+cols-1)//cols
W=Image.new('RGB',(w*cols,h*rows),(21,16,28))
for k,i in enumerate(ims): W.paste(i,((k%cols)*w,(k//cols)*h))
sc=min(1,1500/W.width); W.resize((int(W.width*sc),int(W.height*sc))).save('out/row.png')
