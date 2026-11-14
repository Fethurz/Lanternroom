# the feral wolf's outline, drawn to sit beside the owner's horse: points clockwise from the nose in the horse's 690x620 space
# (ground y=607). Each point: x, y, and how round the corner is there (1 smooth, 0 a sharp point)
import json,sys
P=[
 (10,252,.5),(20,234,1),(56,220,1),(86,196,1),(102,170,1),            # nose, muzzle top, stop, brow
 (108,150,.5),(134,74,0),(166,140,.4),                                # near ear
 (170,136,.4),(196,88,0),(212,156,.7),                                # far ear, peeking out behind it
 (236,174,1),(262,188,1),(292,198,1),                                 # scruff, withers
 (360,210,1),(440,214,1),(510,210,1),(552,204,1),                     # back, loin, croup
 (574,192,.7),(584,150,1),(600,104,1),(628,62,1),(662,36,1),(688,26,.2),   # bushy tail, carried up: front edge to the tip
 (692,70,1),(686,118,1),(668,164,1),(644,202,1),(630,226,.7),         # tail, back edge down to the root
 (640,258,1),(646,310,1),(640,356,1),(650,398,1),(664,430,.8),        # rump, back of thigh, hock
 (654,470,1),(646,530,1),(646,580,1),(648,604,.4),                    # near hind: back of the lower leg, heel
 (598,606,.4),(590,594,.8),(606,566,1),(612,510,1),(616,456,1),       # paw, front of the lower leg
 (600,424,1),(576,398,1),(560,384,.6),                                # front of thigh up to the gap between the hind legs
 (548,402,1),(546,440,1),(540,468,1),(512,512,1),(486,560,1),(476,590,1),(480,604,.4),   # far hind, back edge down
 (430,606,.4),(424,594,.8),(444,560,1),(470,512,1),(486,468,1),(480,420,1),(468,386,.8), # far hind paw, front edge up
 (450,372,1),(410,386,1),(362,406,1),(328,414,.7),                    # tuck, belly, deep chest, elbow
 (326,462,1),(326,530,1),(328,584,1),(332,604,.4),                    # near front leg: back edge
 (284,606,.4),(278,594,.8),(292,566,1),(292,520,1),(286,484,.5),      # paw, front edge up to the gap between the front legs
 (278,500,.6),(270,556,1),(268,590,1),(270,604,.4),                   # far front leg: back edge
 (218,606,.4),(212,594,.8),(228,566,1),(228,500,1),(218,444,1),       # paw, front edge
 (198,398,1),(176,350,1),(162,312,1),(154,294,.8),                    # chest front, neck front
 (132,308,0),(126,282,.8),(92,286,1),(50,282,1),(20,272,.8),          # cheek ruff point, jaw, chin
]
def path(P):
    n=len(P); d="M%.1f %.1f"%(P[0][0],P[0][1])
    for i in range(n):
        p0,p1,p2,p3=P[(i-1)%n],P[i],P[(i+1)%n],P[(i+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/6*p1[2],p1[1]+(p2[1]-p0[1])/6*p1[2]); c2=(p2[0]-(p3[0]-p1[0])/6*p2[2],p2[1]-(p3[1]-p1[1])/6*p2[2])
        d+="C%.1f %.1f %.1f %.1f %.1f %.1f"%(c1[0],c1[1],c2[0],c2[1],p2[0],p2[1])
    return d+"Z"
open('wolf.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 690 620"><path fill="#e8a95b" fill-rule="evenodd" d="%s"/></svg>\n'%path(P))
