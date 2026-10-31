// v2.9.2: three times the scenes a chapter (18), each scene about half as long; old 6-scene stories and runs stretch once
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W, json: () => ({}), stream: () => "x" });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.9.2 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009002; }));
  const r = await pg.evaluate(async () => {
    const all = Object.values(STORY_PACKS).flatMap(p => [p.chapters || [], ...Object.values(p.eras || {}).map(e => e.chapters)]).flat()
      .concat(Object.values(STORY_PRESETS).flatMap(p => [p.chapters || [], ...Object.values(p.eras || {}).map(e => e.chapters)]).flat());
    // a bot with an old 6-scene story (and an era) gets 18 once; a later 6 stays
    const c = { ...blankChar("world"), id: "old1", name: "Old", storyDef: { title: "Old", chapters: [{ t: "A", goal: "a", scenes: 6 }, { t: "B", goal: "b", scenes: 4 }], eras: { x: { n: "X", chapters: [{ t: "C", goal: "c", scenes: 6 }] } } } };
    S.chars.push(c); await applyStoryPresets();
    const mig = [c.storyDef.chapters[0].scenes, c.storyDef.chapters[1].scenes, c.storyDef.eras.x.chapters[0].scenes, c.storyDef.s18];
    c.storyDef.chapters[0].scenes = 6; await applyStoryPresets(); const again = c.storyDef.chapters[0].scenes;
    // a run in chapter 2 (8 scenes written): chapter 1 keeps 6, chapter 2 on get 18, the place in the story stays
    const msgs = []; for (let i = 0; i < 8; i++) { msgs.push({ id: "a" + i, role: "assistant", content: "scene " + i }); msgs.push({ id: "u" + i, role: "user", content: "pick", st: { leans: [] } }); }
    msgs.pop();
    const run = { messages: msgs, story: { pack: "dragon", title: "T", you: "a dragon", setting: "s", pairs: [{ a: "A", b: "B", v: 50 }], meters: [], chapters: [1, 2, 3].map(i => ({ t: "C" + i, goal: "g", scenes: 6 })), opts: { length: "standard" } } };
    const before = storyState(run); storyStretch(run); const after = storyState(run);
    const ended = { messages: msgs, story: { ...JSON.parse(JSON.stringify(run.story)), s18: 0, obit: { at: 1 }, chapters: [1, 2].map(i => ({ t: "C" + i, goal: "g", scenes: 6 })) } };
    delete ended.story.s18; storyStretch(ended);
    const sys = storyMessages(blankChar("world"), { ...run, messages: msgs }, msgs.length)[0].content;
    return { all: all.length, bad: all.filter(x => x.scenes !== 18).length, mig, again, before: [before.ch, before.step], after: [after.ch, after.step], chs: run.story.chapters.map(x => x.scenes), flag: run.story.s18, ended: ended.story.chapters.map(x => x.scenes), sys };
  });
  chk(`every built-in and preset chapter is 18 scenes (${r.all} chapters, ${r.bad} not)`, r.all >= 180 && r.bad === 0);
  chk(`a bot's old story: 6 → 18, other counts kept, eras too, marked (${r.mig})`, r.mig.join() === "18,4,18,1");
  chk(`only once: a 6 set later stays (${r.again})`, r.again === 6);
  chk(`an old run in chapter 2 stays in the same place (${r.before} → ${r.after}) and its chapters become ${r.chs}`, r.before.join() === "1,2" && r.after.join() === "1,2" && r.chs.join() === "6,18,18" && r.flag === 1);
  chk(`an ended run is left alone (${r.ended})`, r.ended.join() === "6,6");
  chk("the scene prompt asks for short scenes (1-3 paragraphs, 150-250 words) and says scene 3 of 18", /1-3 short paragraphs/.test(r.sys) && /150-250 words/.test(r.sys) && /scene 3 of 18/.test(r.sys) && !/2-5 short paragraphs/.test(r.sys));
  const q = await pg.evaluate(() => QZ_STORY.find(x => x.id === "chapters").hint);
  chk(`the story quiz says 18 scenes (${q})`, /18/.test(q));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
