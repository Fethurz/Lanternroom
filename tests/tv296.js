// v2.9.6: stories never put the scene picture behind their text (owner: too hard to read); ordinary chats still do
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W, json: () => ({ plan: "x" }), stream: () => `You walk the boardwalk.\n[[story: {"choices": [{"t": "Climb the fence.", "leans": []}, {"t": "Wait.", "leans": []}]}]]\n[[mood: calm | place: Boardwalk | ambience: forest | activity: none | hearing: outside]]` });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.9.6 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009006; }));
  const r = await pg.evaluate(async () => {
    S.settings.backgrounds = true;
    const def = { title: "Bg Test", icon: "🌲", blurb: "x", you: "an adult tourist", roles: ["an adult tourist"], setting: "A forest tour.", pairs: [{ a: "Bold", b: "Careful" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [1, 2].map(i => ({ t: "C" + i, goal: "Survive " + i, scenes: 18 })) };
    const c = { ...blankChar("world"), id: "bg1", name: "Bg Test", description: "A forest.", scenario: "A forest tour.", storyDef: def };
    S.chars.push(c); await saveChars();
    const pk = packOf("bot:bg1") || allPacks().find(p => p.id === "bot:bg1");
    await storyBegin(pk, null, { mode: "classic", content: "clean", vore: true, length: "standard", role: "an adult tourist", era: "", danger: "real", voreWho: "all", voreKind: "", pick: {} }, { name: "Sam", pron: "", color: "" });
    for (let i = 0; i < 60 && S.busy; i++) await new Promise(r => setTimeout(r, 100));
    S.chat.place = "Boardwalk"; updateStage();
    const sc = $("scene"), story = { url: sc.dataset.url, on: sc.classList.contains("on"), isStory: !!S.chat.story, place: S.chat.place };
    // an ordinary chat with a place still asks for its picture
    const w = S.chars.find(x => !x.storyDef && x.kind === "character") || S.chars[0];
    await openChat(w.id); S.chat.place = "Tavern"; updateStage();
    const plain = { url: sc.dataset.url, isStory: !!S.chat.story };
    return { story, plain };
  });
  chk(`a story with a place shows no scene picture (${JSON.stringify(r.story)})`, r.story.isStory && r.story.place && !r.story.url && !r.story.on);
  chk(`an ordinary chat with a place still loads its picture (${JSON.stringify(r.plain)})`, !r.plain.isStory && !!r.plain.url);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
