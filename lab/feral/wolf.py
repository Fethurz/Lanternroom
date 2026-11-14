# the feral wolf's outline, drawn to sit beside the owner's horse: points clockwise from the nose in the horse's 690x620 space
# (ground y=607). Each point: x, y, and how round the corner is there (1 smooth, 0 a sharp point)
import json,sys
P=[
 (8,236,.3),(60,222,.5),(92,208,.3),(112,176,.6),                     # squared nose, straight muzzle top, a sharp stop, brow
 (118,160,.3),(138,70,0),(172,138,.2),                                # near ear
 (176,134,.2),(204,84,0),(220,154,.4),                                # far ear, peeking out behind it
 (240,172,.5),(266,188,1),(296,198,1),                                # scruff, withers
 (360,210,1),(440,214,1),(510,210,1),(552,204,1),                     # back, loin, croup
 (584,206,.8),(630,222,1),(674,262,1),(712,318,1),(738,386,1),(744,468,.15),   # bushy tail hanging down and back: upper edge to the tip
 (722,442,.9),(698,408,1),(674,366,1),(656,326,1),(640,290,.6),(626,264,.3),  # the tail's under edge back up to its root
 (636,300,1),(642,340,1),(644,372,1),(650,398,1),(664,430,.8),        # rump under the tail, back of thigh, hock
 (654,470,1),(644,530,1),(640,576,1),(648,592,.7),(646,607,.3),       # near hind: back of the lower leg, heel pad
 (578,607,.3),(566,597,.5),(578,581,.7),(602,570,1),(610,510,1),(616,456,1),   # paw: toes, knuckle, then the front of the lower leg
 (600,424,1),(576,398,1),(560,384,.6),                                # front of thigh up to the gap between the hind legs
 (548,402,1),(546,440,1),(540,468,1),(512,512,1),(486,556,1),(476,580,1),(480,594,.7),(478,607,.3),   # far hind, back edge down
 (410,607,.3),(398,597,.5),(410,581,.7),(436,566,1),(468,512,1),(486,468,1),(480,420,1),(468,386,.8), # far hind paw, front edge up
 (450,372,1),(410,386,1),(362,406,1),(328,414,.7),                    # tuck, belly, deep chest, elbow
 (326,462,1),(326,530,1),(326,576,1),(334,592,.7),(332,607,.3),       # near front leg: back edge, heel pad
 (262,607,.3),(250,597,.5),(262,581,.7),(288,568,1),(292,520,1),(286,484,.5),   # paw, front edge up to the gap between the front legs
 (264,500,.6),(246,548,1),(236,578,1),(240,593,.7),(238,607,.3),      # far front leg, reaching forward: back edge
 (168,607,.3),(156,597,.5),(168,581,.7),(194,568,1),(206,510,1),(212,450,1),   # paw, front edge
 (200,398,1),(184,356,1),                                             # chest front
 (176,336,.4),(160,340,0),(160,314,.3),(138,322,0),(134,296,.3),      # two ruff points under the neck
 (112,290,.3),(60,282,.5),(14,268,.4),(4,256,.3),                     # jaw corner, straight lower jaw, chin, nose
]
def path(P):
    n=len(P); d="M%.1f %.1f"%(P[0][0],P[0][1])
    for i in range(n):
        p0,p1,p2,p3=P[(i-1)%n],P[i],P[(i+1)%n],P[(i+2)%n]
        c1=(p1[0]+(p2[0]-p0[0])/6*p1[2],p1[1]+(p2[1]-p0[1])/6*p1[2]); c2=(p2[0]-(p3[0]-p1[0])/6*p2[2],p2[1]-(p3[1]-p1[1])/6*p2[2])
        d+="C%.1f %.1f %.1f %.1f %.1f %.1f"%(c1[0],c1[1],c2[0],c2[1],p2[0],p2[1])
    return d+"Z"
open('wolf.svg','w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 770 620"><path fill="#e8a95b" fill-rule="evenodd" d="%s"/></svg>\n'%path(P))
