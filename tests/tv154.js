// v1.54: stricter scene guesses, explicit + format prompt rules, the reply format fix, fainter actions,
// app badges once per account, and the box dropping after sending on phones.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const Q = [];
  const tag = x => `\n[[mood: calm | place: Room | ambience: indoors | activity: ${x.act || "none"} | harm: none | hearing: outside]]`;
  const { b, pg, errs, calls } = await open({ width: W, stream: () => { const x = Q.shift() || {}; return (x.text || "*The scene goes on.*") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const send = async (x, text = "go on") => { Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(300); };
  await pg.evaluate(async () => { await openChat(S.chars[0].id); });
  await pg.waitForTimeout(600);

  // ---- scene guesses for replies without a label
  const guess = await pg.evaluate(() => {
    const g = t => guessAct([{ role: "user", content: "hi" }, { role: "assistant", content: t }]);
    return {
      no: ["He was swallowed by darkness as the door shut.", "She swallows nervously and looks away.", "He gulps down his ale.", "Consumed by rage, he thrusts his sword forward.",
        "She rides her horse through the gate.", "She licks her lips and smiles.", "He kisses her hand politely.", "They struggle against the guards in the fight.",
        "He chews his bread slowly.", "Oh shit, the bridge is out.", "She pounds on the door."].map(t => [t, g(t)]),
      yes: [["Her maw opens wide and she swallows him whole, his legs sliding down her throat.", "swallow"], ["He thrusts his cock into her pussy.", "sex"],
        ["She kisses him deeply on the lips.", "kiss"], ["He licks her neck slowly.", "lick"]].map(([t, w]) => [t, g(t), w])
    };
  });
  for (const [t, a] of guess.no) chk(`no scene: "${t}" → ${a}`, a === "none");
  for (const [t, a, w] of guess.yes) chk(`scene: "${t}" → ${a}`, a === w);
  const inside = await pg.evaluate(() => guessAct([{ role: "assistant", content: "Her maw closes and she swallows you whole, sliding down her throat." }, { role: "user", content: "I kick." }, { role: "assistant", content: "Your kicks bulge out her stomach as you squirm inside, the belly walls clenching." }]));
  chk("struggle inside a stomach → " + inside, inside === "struggle");
  const rub = await pg.evaluate(() => { S.chat.messages.push({ id: uid(), role: "assistant", content: "*After dinner his belly is full and round.*" }); const r = rubParts({ act: "none", hear: "outside" }); S.chat.messages.pop(); return r.length; });
  chk("a full belly after dinner offers no rub", rub === 0);

  // ---- the prompt
  await send({ text: 'She smiles at you. "Hello there." [sfx=gurgle]***Glrrb***[/sfx]' });
  const sys = JSON.stringify(calls.filter(c => c.stream).at(-1).messages);
  chk("prompt: strict activity rules", /LITERALLY, PHYSICALLY/.test(sys) && /When unsure, use none/.test(sys));
  chk("prompt: explicit detail", /Be explicit/.test(sys) && /never fade out/.test(sys));
  chk("prompt: closed asterisks, speech in quotes", /closed \*asterisks\*/.test(sys));
  // ---- the format fix on the new reply
  const last = await pg.evaluate(() => S.chat.messages.at(-1).content);
  chk("reply fixed: " + last, last === '*She smiles at you.* "Hello there." [sfx=gurgle]***Glrrb***[/sfx]');
  const col = await pg.evaluate(() => { const e = document.querySelector("#msgs .msg.assistant em.act"); return e ? getComputedStyle(e).color : ""; });
  chk("actions fainter (" + col + ")", /0\.6\)|\/ 0\.6\)/.test(col));

  // ---- badges: app badges once for the account
  const bd = await pg.evaluate(async () => {
    const toasts = () => document.querySelectorAll(".ach-toast").length + ACH_Q.length;
    ACHS.n.taps = 499; const before = toasts();
    S.charId = "botA"; achEvent("tap", { k: "gulp" });
    const afterA = toasts();
    S.charId = "botB"; achEvent("tap", { k: "gulp" });
    const afterB = toasts();
    achEvent("made", { from: "quiz", id: "q1" }); const q1 = toasts();
    achEvent("made", { from: "quiz", id: "q2" }); const q2 = toasts();
    const m = achMerge({ bots: { x: { soundboard: 1, first_pred: 2 } } }, {});
    return { a: afterA - before, b: afterB - afterA, q: q2 - q1, shelfB: Object.keys(ACHS.bots.botB || {}), merged: Object.keys(m.bots.x) };
  });
  chk("500 taps badge once (bot A " + bd.a + ", bot B " + bd.b + ")", bd.a >= 1 && bd.b === 0 && !bd.shelfB.includes("soundboard"));
  chk("quiz badge only for the first quiz bot", bd.q === 0);
  chk("app badges dropped from bot shelves on merge", bd.merged.join() === "first_pred");
  await pg.evaluate(() => { S.charId = S.chars[0].id; });

  // ---- after sending on a phone: the box drops and the keyboard closes
  await pg.evaluate(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /pointer:\s*fine/.test(q) ? { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); });
  await pg.focus("#input"); await pg.fill("#input", "phone message");
  chk("box open while typing", await pg.evaluate(() => $("composer").classList.contains("open")));
  Q.push({}); const n = await pg.evaluate(() => S.chat.messages.length);
  await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(300);
  chk("box dropped after sending", await pg.evaluate(() => !$("composer").classList.contains("open") && document.activeElement !== $("input")));
  chk("scrolled to the bottom", await pg.evaluate(() => { const b = $("msgs"); return b.scrollHeight - b.scrollTop - b.clientHeight < 80; }));

  chk("no page errors " + errs.join(" | "), errs.length === 0);
  await b.close();
})();
