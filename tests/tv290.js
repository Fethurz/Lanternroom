// v2.9: stories read like Choice of Games. One scene per page (earlier scenes a tap back), the choices at the end of the
// page (pick one, then Next), no bubble for your pick (only a check result marks the top of the next page), the scene is
// asked to play your pick out as it happens, and every spoken line sits in its own edged block.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const seen = [];
  const tag = "\n[[mood: calm | place: Gate | ambience: indoors | activity: none | hearing: outside]]";
  const choices = [{ t: "Rush the stairs.", leans: [{ side: "Bold", amt: 2 }] }, { t: "Ask him who sent him.", leans: [{ side: "Careful", amt: 1 }], check: { stat: "Bold", need: 20 } }, { t: "Knock him out.", leans: [] }];
  const text = n => `${n === 1 ? "**Chapter 1: C1**\n\n" : ""}Scene ${n}. The guard backs into the wall, hands raised. "Easy! I'm only paid to watch the door," he says. "Nothing more." You lower the blade an inch and glance at the sign that reads "Hollow" above the arch.\n\n"Then tell me who pays you."\n\nHis eyes flick to the stairs, and for a long moment the only sound is the rain hammering on the old roof above you both.`;
  let n = 0;
  const { b, pg, errs } = await open({
    width: W,
    stream: body => { seen.push(body.messages); n++; return `${text(n)}\n[[story: ${JSON.stringify({ choices })}]]${tag}`; },
    json: () => ({ summary: "x", facts: [] })
  });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.9 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009000; }));
  await pg.evaluate(async () => {
    const def = { title: "Gate", you: "a thief", roles: ["a thief"], setting: "A gate.", pairs: [{ a: "Bold", b: "Careful" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [1, 2, 3].map(i => ({ t: "C" + i, goal: "G" + i, scenes: 6 })) };
    S.chars.push({ ...blankChar("world"), id: "tgate", name: "Gate", description: "A gate.", storyDef: def }); await saveChars();
    storySetup(packOf("bot:tgate"), null); await new Promise(r => setTimeout(r, 150)); $("stGo").click();
    for (let i = 0; i < 200 && !(S.chat?.story && S.chat.messages.length && !S.busy); i++) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 200));
  });
  // the page
  const p1 = await pg.evaluate(() => {
    const box = $("msgs"), sc = box.querySelector(".st-scene"), cs = sc && getComputedStyle(sc), pk = $("stPick");
    return { page: $("chat").classList.contains("story-pg"), scenes: box.querySelectorAll(".st-scene").length, bg: cs?.backgroundColor, border: cs?.borderTopWidth,
      chap: box.querySelector(".st-chap")?.textContent, says: [...box.querySelectorAll(".st-say")].map(x => x.textContent), nars: [...box.querySelectorAll(".st-nar")].map(x => x.textContent),
      edge: box.querySelector(".st-say") && getComputedStyle(box.querySelector(".st-say")).borderLeftWidth, pickLast: box.lastElementChild === pk, afterScene: !!(sc && pk && (sc.compareDocumentPosition(pk) & 4)),
      bar: $("choiceBar").hidden, opts: [...pk.querySelectorAll(".st-opt")].map(x => x.textContent), next: $("stNext")?.disabled, nav: !!box.querySelector(".st-nav"), composer: getComputedStyle($("composer")).display };
  });
  chk("a story is a page, not a chat: no bubble around the scene", p1.page && p1.scenes === 1 && /rgba\(0, 0, 0, 0\)|transparent/.test(p1.bg) && p1.border === "0px");
  chk(`the chapter title is a heading (${p1.chap})`, p1.chap === "Chapter 1: C1");
  chk(`spoken lines get their own edged blocks, speech tags stay with them (${p1.says.join(" | ")})`, p1.says.length === 2 && /^"Easy! I'm only paid to watch the door," he says\. "Nothing more\."$/.test(p1.says[0]) && p1.says[1] === '"Then tell me who pays you."' && parseFloat(p1.edge) >= 2);
  chk(`narration is its own paragraphs, a quoted name stays in the prose (${p1.nars.length})`, p1.nars.length === 3 && /^Scene 1\. The guard backs/.test(p1.nars[0]) && /You lower the blade.*"Hollow" above the arch\.$/.test(p1.nars[1]) && /His eyes flick/.test(p1.nars[2]));
  const tg = await pg.evaluate(() => { const d = document.createElement("div"); d.innerHTML = storyFmt('"Who sent you?" you ask, low and even, and something in your voice makes him sag. He looks away.\n\nShe crosses to the fire. Then she leans close and says, "Run."'); return { says: [...d.querySelectorAll(".st-say")].map(x => x.textContent), nars: [...d.querySelectorAll(".st-nar")].map(x => x.textContent) }; });
  chk(`a sentence that carries on after a line, and a lead-in ending in a comma, stay with the line (${tg.says.join(" | ")})`, tg.says[0] === '"Who sent you?" you ask, low and even, and something in your voice makes him sag.' && tg.says[1] === 'Then she leans close and says, "Run."' && tg.nars.join("|") === "He looks away.|She crosses to the fire.");
  chk(`the choices sit at the end of the page, after the scene (${p1.opts.length})`, p1.pickLast && p1.afterScene && p1.bar && p1.opts.length === 3 && p1.composer === "none");
  chk("Next waits for a pick; the first page has no Earlier button", p1.next === true && !p1.nav);
  // tapping a choice only selects it
  const sel = await pg.evaluate(async () => {
    const o = () => [...document.querySelectorAll("#stPick .st-opt")], n0 = S.chat.messages.length;
    o()[0].click(); await new Promise(r => setTimeout(r, 150)); const a = { n: S.chat.messages.length - n0, on: o().map(x => x.getAttribute("aria-checked")), next: $("stNext").disabled };
    o()[1].click(); await new Promise(r => setTimeout(r, 150)); const c = { on: o().map(x => x.getAttribute("aria-checked")), busy: S.busy, n: S.chat.messages.length - n0 };
    window.rand01 = () => 0.5; $("stNext").click();
    for (let i = 0; i < 200 && (S.busy || S.chat.messages.length < n0 + 2); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 250));
    return { a, c, sent: S.chat.messages.at(-2) };
  });
  chk("tapping a choice selects it without sending, and Next lights up", sel.a.n === 0 && sel.a.on.join() === "true,false,false" && sel.a.next === false);
  chk("tapping another moves the selection", sel.c.on.join() === "false,true,false" && sel.c.n === 0 && !sel.c.busy);
  chk(`Next sends the selected choice (${sel.sent?.content})`, sel.sent?.role === "user" && sel.sent.content === "Ask him who sent him." && sel.sent.st?.check?.ok === true);
  // the next page
  const p2 = await pg.evaluate(() => {
    const box = $("msgs");
    return { users: box.querySelectorAll(".msg.user").length, scenes: [...box.querySelectorAll(".st-scene")].map(x => x.textContent.slice(0, 8)), div: box.querySelector(".st-div")?.textContent, divFirst: box.querySelector(".st-div") && box.querySelector(".st-div").compareDocumentPosition(box.querySelector(".st-scene")) & 4,
      nav: box.querySelector('[data-stnav="prev"]')?.textContent, top: box.scrollTop, opts: document.querySelectorAll("#stPick .st-opt").length, sel: document.querySelectorAll('#stPick .st-opt[aria-checked="true"]').length };
  });
  chk(`no bubble for your pick; the page holds only the new scene (${p2.scenes.join(", ")})`, p2.users === 0 && p2.scenes.length === 1 && p2.scenes[0] === "Scene 2." && p2.opts === 3 && p2.sel === 0);
  chk(`only the check result marks the top of the page (${p2.div})`, p2.div === "✓ Bold" && !!p2.divFirst);
  chk(`the new page starts at its top, with Earlier scenes (${p2.nav})`, p2.top === 0 && /Earlier scenes/.test(p2.nav || ""));
  const sys = seen.at(-1)[0].content, last = seen.at(-1).at(-1).content;
  chk("the scene is told to play the pick out as it happens, never recapping it", /opens by playing it out as it happens/.test(sys) && /Never announce or recap the choice/.test(sys) && /^\[The reader chose: Ask him who sent him\.\] Play it out at the start of this scene, as it happens\./.test(last));
  chk("…and to give every spoken line its own paragraph", /Every spoken line gets its own paragraph/.test(sys));
  // rereading earlier scenes
  const back = await pg.evaluate(async () => {
    const box = $("msgs"); box.querySelector('[data-stnav="prev"]').click(); await new Promise(r => setTimeout(r, 100));
    const a = { scene: box.querySelector(".st-scene")?.textContent.slice(0, 30), nav: box.querySelector(".st-nav")?.textContent, pick: $("stPick").textContent, opts: document.querySelectorAll("#stPick .st-opt").length };
    box.querySelector('[data-stnav="next"]').click(); await new Promise(r => setTimeout(r, 100));
    const b = { scene: box.querySelector(".st-scene")?.textContent.slice(0, 8), opts: document.querySelectorAll("#stPick .st-opt").length };
    box.querySelector('[data-stnav="prev"]').click(); await new Promise(r => setTimeout(r, 100)); $("stNow").click(); await new Promise(r => setTimeout(r, 100));
    return { a, b, c: { scene: box.querySelector(".st-scene")?.textContent.slice(0, 8), opts: document.querySelectorAll("#stPick .st-opt").length } };
  });
  chk(`Earlier shows the first scene with no choices (${back.a.nav})`, /Chapter 1: C1Scene 1/.test(back.a.scene) && /Scene 1 of 2/.test(back.a.nav) && back.a.opts === 0 && /Back to the current scene/.test(back.a.pick));
  chk("Later and Back to the current scene return to the choices", back.b.scene === "Scene 2." && back.b.opts === 3 && back.c.scene === "Scene 2." && back.c.opts === 3);
  // the scene's menu still works, and a new version keeps the page
  const menu = await pg.evaluate(async () => {
    document.querySelector(".st-scene .mact").click(); await new Promise(r => setTimeout(r, 100));
    const acts = [...document.querySelectorAll(".st-scene .acts button")].map(x => x.textContent);
    document.querySelector('.st-scene .acts [data-act="reroll"]').click();
    for (let i = 0; i < 200 && (S.busy || S.chat.messages.at(-1).alts?.length < 2); i++) await new Promise(r => setTimeout(r, 50)); await new Promise(r => setTimeout(r, 200));
    return { acts, alts: S.chat.messages.at(-1).alts?.length, scenes: document.querySelectorAll(".st-scene").length, opts: document.querySelectorAll("#stPick .st-opt").length, div: document.querySelector(".st-div")?.textContent };
  });
  chk(`the scene's ⋯ menu still works (${menu.acts.join(", ")})`, menu.acts.includes("Edit") && menu.acts.includes("New version"));
  chk("a new version of the scene stays on its page with the check mark and choices", menu.alts === 2 && menu.scenes === 1 && menu.opts === 3 && menu.div === "✓ Bold");
  // ordinary chats are unchanged
  const plain = await pg.evaluate(async () => { leaveChat(); const c = S.chars.find(x => !x.storyDef && !x.storyPack && x.kind === "character"); await openChat(c.id); await new Promise(r => setTimeout(r, 200)); return { page: $("chat").classList.contains("story-pg"), pick: !!$("stPick"), bubbles: document.querySelectorAll("#msgs .msg").length }; });
  chk("ordinary chats keep their bubbles", !plain.page && !plain.pick && plain.bubbles >= 1);
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
