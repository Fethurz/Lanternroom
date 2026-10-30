// v2.7: a story pack's own setup options (storyDef.options): shown in story setup, `when` hides an option until another
// has a matching value, the picks are saved on the run (story.picks), told to the narrator and shown in Stats.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const seen = [];
  const tag = "\n[[mood: calm | place: Lair | ambience: cave | activity: none | hearing: outside]]";
  const scene = t => `${t}\n[[story: ${JSON.stringify({ choices: [{ t: "Stay.", leans: [] }, { t: "Run.", leans: [] }] })}]]${tag}`;
  const { b, pg, errs } = await open({ width: W, stream: body => { seen.push(String(body.messages?.[0]?.content || "")); return scene("**Chapter 1: The Glade**\n\nA wounded dragon lifts its head."); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.7 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 2007));
  const r = await pg.evaluate(async () => {
    const def = { title: "Dragon", you: "a traveller", roles: ["a traveller"], setting: "A wounded dragon.", pairs: [{ a: "Kind", b: "Cold" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [{ t: "The Glade", goal: "Meet the dragon.", scenes: 6 }],
      options: [
        { id: "sex", n: "The dragon", hint: "Their sex, in every form.", choices: [["male", "Male", "The dragon is male."], ["female", "Female", "The dragon is female."], ["futa", "Futa", "The dragon is a futa."]] },
        { id: "build", n: "Their look", when: { id: "sex", in: ["female", "futa"] }, choices: [["mature", "Mature", "Gorgeous and maturely feminine."], ["soft", "Softer", "Softer and youthful-looking, clearly adult."]] }] };
    S.chars.push({ ...blankChar("world"), id: "tdrag", name: "Dragon World", description: "d", tags: ["vore"], storyDef: def }); await saveChars();
    const tabs = () => [...document.querySelectorAll("[data-opt]")].map(x => x.dataset.opt + ":" + x.textContent + (x.classList.contains("on") ? "*" : ""));
    storySetup(packOf("bot:tdrag"), null); await new Promise(r => setTimeout(r, 150));
    const first = tabs();
    document.querySelector('[data-opt="sex"][data-v="futa"]').click(); await new Promise(r => setTimeout(r, 80));
    const second = tabs();
    document.querySelector('[data-opt="build"][data-v="soft"]').click(); await new Promise(r => setTimeout(r, 80));
    $("stGo").click();
    for (let i = 0; i < 200 && !(S.chat?.story && S.chat.messages.length && !S.busy); i++) await new Promise(r => setTimeout(r, 50));
    const picks = S.chat?.story?.picks || [];
    openStoryStats(); await new Promise(r => setTimeout(r, 120)); const stats = document.querySelector(".st-picks")?.textContent || ""; closeSheet();
    const plain = (() => { const o = { pick: { sex: "male", build: "mature" } }; return storyPicks(packOf("bot:tdrag"), o).map(p => p.v).join(); })();
    return { first, second, picks, stats, plain, optsKept: Object.keys(S.chat.story.opts).includes("pick") };
  });
  chk(`setup shows the first option with its default, the second hidden (${r.first.join(" | ")})`, r.first.join() === "sex:Male*,sex:Female,sex:Futa");
  chk(`picking futa shows the look option (${r.second.join(" | ")})`, r.second.includes("build:Mature*") && r.second.includes("build:Softer") && r.second.includes("sex:Futa*"));
  chk(`the run keeps the picks (${r.picks.map(p => p.v).join(", ")})`, r.picks.map(p => p.v).join() === "futa,soft" && /futa/.test(r.picks[0].rule));
  chk("the narrator is told the picks", seen.some(s => /# Chosen for this run/.test(s) && /The dragon: Futa\. The dragon is a futa\./.test(s) && /Their look: Softer\. Softer and youthful-looking/.test(s)));
  chk(`Stats show the picks (${r.stats})`, /The dragon: Futa/.test(r.stats) && /Their look: Softer/.test(r.stats));
  chk("a hidden option isn't picked (male → no look)", r.plain === "male");
  chk("picks aren't duplicated into the run's options", !r.optsKept);
  chk("stories without options are unchanged", await pg.evaluate(async () => { storySetup(packOf("monhun"), null); await new Promise(r => setTimeout(r, 100)); const n = document.querySelectorAll("[data-opt]").length; closeSheet(); return n === 0; }));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
