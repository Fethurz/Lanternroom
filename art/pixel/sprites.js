// 16×16 sprites. Most are symmetric: 8-wide left halves, mirrored. Keys: . clear, o outline, b base, s shade, h highlight,
// e dark (eyes, mouth), w white, a accent (pink/red), c second colour, d its shade, g glow
const SPRITES = [
  ["cat", "Cat", "creature", ["........", "..o.....", "..oo....", "..obo...", "..oabo..", "..obbooo", ".obbbbbb", ".obhbbbb", ".obeebbb", ".obewbbb", ".obbbbba", ".osbbbbo", "..osbbbb", "...ossss", "....oooo", "........"]],
  ["wolf", "Wolf", "creature", [".o......", ".oo.....", ".obo....", ".obbo...", ".obabooo", ".obbbbbb", "obbhbbbb", "obbbbbbb", "obeebbbb", "obewbbcc", ".obbbccc", ".osbccce", "..osccco", "...osccc", "....oooo", "........"]],
  ["fox", "Fox", "creature", ["........", ".o......", ".eo.....", ".eeo....", ".obeo...", ".obbbooo", "obbbbbbb", "obhbbbbb", "obeebbbb", "obewbbbb", "owwbbbbb", ".owwwbbb", "..owwwwe", "...owwww", "....oooo", "........"]],
  ["bear", "Bear", "creature", ["........", ".ooo....", "obsbo...", "obsbbooo", ".obbbbbb", "obbhbbbb", "obbbbbbb", "obeebbbb", "obewbbbb", "obbbbccc", "obbbcccc", ".obbccce", ".osbccco", "..osbccc", "...ooooo", "........"]],
  ["bunny", "Bunny", "creature", ["..oo....", ".obao...", ".obao...", ".obao...", ".obao...", ".obbo...", "..obbooo", ".obbbbbb", ".obhbbbb", ".obeebbb", ".obewbbb", ".oabbbba", "..obbbbo", "..osbbbb", "...ooooo", "........"]],
  ["dog", "Dog", "creature", ["........", "...ooooo", "..obbbbb", ".ocbbbbb", "occbhbbb", "occbbbbb", "occeebbb", "occewbbb", "ocdbbwww", ".odbwwwe", ".odbwwwo", "..obwwwa", "...obwwa", "....oooo", "........", "........"]],
  ["frog", "Frog", "creature", ["........", "........", ".ooooo..", "owwwwwo.", "owweewo.", "owweewoo", "obwwwwbb", "obbbbbbb", "obhbbbbb", "obbbbbbb", "oabbbbbb", "obeeeeee", ".obbbbbb", ".osbbbbb", "..oooooo", "........"]],
  ["owl", "Owl", "creature", ["........", ".o......", ".oo.....", ".obooooo", ".obbbbbb", "obcccbbb", "ocweecbb", "oceeecbb", "obcccbba", "obbbbbba", "obbbbbbb", "obhbbhbb", ".obbhbbh", ".obbbbbb", "..oooooo", "........"]],
  ["slime", "Slime", "creature", ["........", "........", "........", "......oo", "....oobb", "...obhhb", "..obhbbb", "..obbbbb", ".obbeebb", ".obbewbb", ".obbbbbb", "obabbbbb", "obbbbbbe", "osbbbbbb", ".ossssss", "..oooooo"]],
  ["ghost", "Ghost", "creature", ["........", ".....ooo", "...oohhh", "..ohhhhh", ".ohhhhhh", ".ohhhhhh", "ohheehhh", "ohheehhh", "ohhhhhhh", "ohaahhhe", "ohhhhhhe", "ohhhhhhh", "ohhhhhhh", "ohhohhho", ".oo.ooo.", "........"]],
  ["skull", "Skull", "creature", ["........", "...ooooo", "..obbbbb", ".obbbbbb", ".obbhbbb", "obbbbbbb", "obeeebbb", "obeeebbb", "obbeebbb", "obbbbbbe", ".obbbbbb", "..osbsbs", "..obsbsb", "...ooooo", "........", "........"]],
  ["demon", "Demon", "creature", [".o......", ".co.....", ".cco....", "..cco...", "..ocbooo", ".obbbbbb", "obbhbbbb", "obbbbbbb", "obggebbb", "obbbbbbb", "obbbbbbb", "obbeeeee", ".obewbbb", "..obbbbb", "...ooooo", "........"]],
  ["alien", "Alien", "creature", ["........", "...ooooo", "..obbbbb", ".obhbbbb", "obbbbbbb", "obbbbbbb", "oeeebbbb", "oeweebbb", "obeeebbb", ".obbbbbb", ".obbbbbb", "..obbbbb", "...obbbe", "....obbb", ".....ooo", "........"]],
  ["robot", "Robot", "creature", [".......o", "......oa", ".......o", ".ooooooo", ".obbbbbb", "obhbbbbb", "obeeeeee", "obegeeee", "obeeeeee", "obbbbbbb", "obsbsbsb", "obbbbbbb", ".ooooooo", "...osbbb", "..oooooo", "........"]],
  ["mushroom", "Mushroom", "creature", ["........", "....oooo", "..oobbbb", ".obbwwbb", ".obwwwbb", "obbbbbww", "obbwbbww", "osbbbbbb", ".oosssss", "...occcc", "...ocecc", "...occcc", "...ocdca", "...odddd", "...ooooo", "........"]],
  ["pumpkin", "Pumpkin", "creature", ["........", "......oc", "..ooooco", ".obbsbbb", "obbsbbbb", "obbsbbbb", "obggsbbb", "obbgsbbb", "obbsbbbg", "obbsbbbb", "obgggggg", "obbgbggb", ".obsbbbb", "..oosbbb", "....oooo", "........"]],
  ["octopus", "Octopus", "creature", ["........", "....oooo", "..oobbbb", ".obhbbbb", ".obbbbbb", "obbbbbbb", "obbeebbb", "obbwebbb", "obbbbbbb", ".obbbbbb", ".obbbbbb", "obboobbo", "obboobbo", "ob.ob.ob", "o..o..o.", "........"]],
  ["dragon", "Dragon", "creature", ["o.......", "oc......", ".oc.....", ".occoooo", "..obbbbb", ".obbbbbb", "obhbbbbb", "obbgobbb", "obbbbbbb", ".obbbccc", ".obccccc", ".obcccec", "..occccc", "...owcwc", "....oooo", "........"]],
  ["knight", "Knight", "person", ["........", "...ooooo", "..obhhbb", ".obhbbbb", ".obbbbbb", "obbbbbbb", "obbsssss", "obseeeee", "obbsbsbs", "obbbbbbb", "obsbsbsb", ".obbbbbb", ".osbbbbb", "..osssss", "...ooooo", "........"]],
  ["wizard", "Wizard", "person", [".......o", "......oc", ".....occ", "....occc", "...occca", "..occccc", "oooooooo", "..obbbbb", "..obebbb", "..obbbbb", ".owwbbbb", ".owwwwww", "..owwwww", "...owwww", "....oooo", "........"]],
  ["girl", "Long hair", "human", ["........", "...ooooo", "..occccc", ".occdccc", ".occcbbb", ".occbbbb", ".occbebb", ".occbebb", ".occabbb", ".occbbbb", ".occbbba", ".occsbbb", ".occcoss", ".occoddd", "..oodddd", "...ooooo"]],
  ["guy", "Short hair", "human", ["........", "...ooooo", "..occccc", ".occdccc", ".ocbbbbb", ".obbbbbb", ".obbebbb", ".obbebbb", "osbbbbbb", ".obbbbbs", ".obbbbbb", ".obbbbbo", "..obbbbb", "...ossss", "..oddddd", ".odddddd"]],
  ["hood", "Hooded", "person", ["....oooo", "...occcc", "..occccc", ".occcccc", ".occdddd", "occdeeee", "occdeeee", "occdegee", "occdeeee", "occdeeee", "occcdeee", "occccddd", "occccccc", "occccccc", "oooooooo", "........"]],
  ["vampire", "Vampire", "human", ["........", "...ooooo", "..occccc", ".occcccc", ".occbbbc", ".ocbbbbb", ".obbbbbb", ".obbgbbb", ".obbbbbb", ".obbbbbs", ".obbbbbe", ".obbbbwb", "..obbbbb", ".oaossss", "oaaodddd", "oooooooo"]],
  ["lantern", "Lantern", "object", ["........", "......oo", ".....o..", "....oooo", "...occcc", "..oooooo", "..oceeee", "..oceeeg", "..oceegw", "..oceegg", "..oceeeg", "..oceeee", "..oooooo", "...occcc", "...ooooo", "........"]]
];
const bad = SPRITES.filter(s => s[3].length !== 16 || s[3].some(r => r.length !== 8 && r.length !== 16)).map(s => s[0] + ":" + s[3].map(r => r.length).join(","));
if (typeof module !== "undefined") module.exports = { SPRITES, bad };
