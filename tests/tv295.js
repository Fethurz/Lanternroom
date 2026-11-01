// v2.9.5: the reader's chosen role and companions override the setting and lore (the Deepwild kept giving you your sister),
// and choices are strict: real odds on checks, side checks never below 30, more checked choices, failures that stick
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  let lastSys = "";
  const { b, pg, errs } = await open({ width: W, json: () => ({ plan: "x" }), stream: body => { lastSys = String(body.messages?.[0]?.content || ""); return `You walk the boardwalk with your partner.\n[[story: {"choices": [{"t": "Climb the fence.", "leans": [], "check": {"stat": "Bold", "need": 20}}, {"t": "Wait.", "leans": []}]}]]\n[[mood: calm | place: Boardwalk | ambience: forest | activity: none | hearing: outside]]`; } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.9.5 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009005; }));
  const o = await pg.evaluate(() => ({ even: storyOdds(50, 50, "real"), hard: storyOdds(50, 65, "real"), easy: storyOdds(50, 35, "real"), brutal: storyOdds(50, 50, "brutal"), story: storyOdds(50, 50, "story"), top: storyOdds(100, 10, "real"), bottom: storyOdds(0, 95, "brutal") }));
  const r2 = x => Math.round(x * 100) / 100;
  chk(`real odds: even ${r2(o.even)}, 15 short ${r2(o.hard)}, 15 over ${r2(o.easy)}`, Math.abs(o.even - 0.45) < 0.01 && Math.abs(o.hard - 0.16) < 0.02 && Math.abs(o.easy - 0.74) < 0.02);
  chk(`brutal is harsher (${r2(o.brutal)}), story kinder (${r2(o.story)}), never certain (${r2(o.top)} / ${r2(o.bottom)})`, o.brutal < o.even && o.story > o.even && o.top <= 0.9 && o.bottom >= 0.03);
  // a Deepwild-like world bot whose card and setting say "sister", and a run where the reader picked a partner
  const run = await pg.evaluate(async () => {
    const def = { title: "Deepwild Test", icon: "🌲", blurb: "x", you: "an adult tourist on a tour with your sister", roles: ["an adult tourist on a tour with your sister", "an adult tourist on a tour with your partner"], setting: "A guided tour of the buffer zone with your sister, who booked the trip.", pairs: [{ a: "Bold", b: "Careful" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [1, 2, 3].map(i => ({ t: "C" + i, goal: "Survive " + i, scenes: 18 })) };
    const c = { ...blankChar("world"), id: "dw1", name: "Deepwild Test", description: "You are on the tour with your sister.", scenario: "{{user}} and their sister take the tour.", storyDef: def };
    S.chars.push(c); await saveChars();
    const pk = packOf("bot:dw1") || allPacks().find(p => p.id === "bot:dw1");
    await storyBegin(pk, null, { mode: "classic", content: "clean", vore: true, length: "standard", role: "an adult tourist on a tour with your partner", era: "", danger: "real", voreWho: "all", voreKind: "", pick: {} }, { name: "Sam", pron: "", color: "" });
    for (let i = 0; i < 60 && S.busy; i++) await new Promise(r => setTimeout(r, 100));
    const sc = S.chat.messages.find(m => m.role === "assistant");
    return { you: S.chat.story.you, choices: sc?.choices?.map(x => x.st?.check?.need ?? null) };
  });
  const iSet = lastSys.indexOf("# Setting"), iLore = lastSys.indexOf("# The world's own lore"), iWho = lastSys.indexOf("# Who the reader is in this run");
  chk(`the run keeps the picked role (${run.you})`, /partner/.test(run.you));
  chk(`the scene prompt says who the reader is AFTER the setting and the lore, and that it overrides them (setting ${iSet}, lore ${iLore}, who ${iWho})`, iWho > iSet && iWho > iLore && /overrides the setting, the lore/.test(lastSys) && /with your partner/.test(lastSys.slice(iWho)) && /a sister when the reader chose a partner/.test(lastSys));
  chk(`a side check asking for 20 is raised to 30 (${JSON.stringify(run.choices)})`, run.choices?.[0] === 30 && run.choices?.[1] === null);
  chk("the prompt asks for a check on every risky choice, 30-90", /on every choice that involves risk/.test(lastSys) && /"need": 30-90/.test(lastSys) && !/about one check per scene/.test(lastSys));
  chk("the danger rules forbid unearned ways out and let unchecked reckless choices go badly", /never hand the reader a way out they didn't earn/.test(lastSys) && /reckless, foolish or overconfident choices go badly/.test(lastSys));
  const f = await pg.evaluate(() => ({ fail: storyNote({ st: { check: { stat: "Bold", ok: false } } }), win: storyNote({ st: { check: { stat: "Bold", ok: true } } }) }));
  chk("a failed check tells the narrator the failure sticks, with no way out", /FAILURE/.test(f.fail) && /consequences stick/.test(f.fail) && /never turn the failure into a success/.test(f.fail) && /SUCCESS/.test(f.win));
  // picking an even check many times passes about 45% of the time
  const rate = await pg.evaluate(() => { let ok = 0; const N = 4000; for (let i = 0; i < N; i++) if (rand01() < storyOdds(50, 50, "real")) ok++; return ok / N; });
  chk(`an even check passes about 45% of the time (${r2(rate)})`, rate > 0.41 && rate < 0.49);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
