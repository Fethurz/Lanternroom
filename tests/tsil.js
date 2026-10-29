// v1.53 pred silhouettes: species picked, the right state per stage and vore type, drawn in the accent colour, gulp/belch/
// struggle reactions, rubbing on the picture, the rub pad moving it, weight from digested prey and burning it off,
// the usual-weight slider, breast vore hidden, the scene panel on wide screens, the switch
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390), wide = W >= 1180;
  const Q = [];
  const tag = x => `\n[[mood: hungry | place: Den | ambience: cave | activity: ${x.act || "none"} | harm: none | hearing: ${x.hear || "outside"}${x.vore ? " | vore: " + x.vore : ""}]]`;
  const { b, pg, errs, calls } = await open({ width: W, stream: () => { const x = Q.shift() || {}; return (x.text || "The scene goes on.") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const send = async (x, text = "go on") => { if (x) Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(400); await pg.evaluate(() => updateAmbience()); await pg.waitForTimeout(500); };
  const cur = () => pg.evaluate(() => SIL.cur && { ...SIL.cur });
  const cvSel = wide ? "#side canvas.sil-cv" : "#voreCard canvas.sil-cv";
  // how much of the picture is painted, and whether it's in the accent colour
  const paint = () => pg.evaluate(sel => {
    const cv = document.querySelector(sel); if (!cv || !cv.width) return { n: 0 };
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data, acc = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim().replace("#", "");
    const ar = parseInt(acc.slice(0, 2), 16), ag = parseInt(acc.slice(2, 4), 16), ab = parseInt(acc.slice(4, 6), 16);
    let n = 0, a = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 250) { n++; if (Math.abs(d[i] - ar) < 6 && Math.abs(d[i + 1] - ag) < 6 && Math.abs(d[i + 2] - ab) < 6) a++; }
    return { n, a, total: cv.width * cv.height };
  }, cvSel);

  // species picked for figures nobody drew yet
  const sp = await pg.evaluate(() => ["feral dragon", "anthro cheetah", "orca", "centaur", "minotaur", "harpy", "mermaid", "elf", "kobold", "bunny girl", "wolf", "deer"].map(silSpecies).join());
  chk("species map: " + sp, sp === "lizard,wolf,shark,horse,cow,bird,fish,human,lizard,wolf,wolf,horse");

  await pg.evaluate(async () => { const c = S.chars[0]; c.appearance = "A tall anthro fox woman with a bushy tail."; c.description = "She is a vixen."; await saveChars(); await openChat(c.id); });
  await pg.waitForTimeout(600);

  // 1) before: the empty body, a fox uses the wolf figure, she has breasts
  await send({ text: "Wren opens her jaws wide over you, ready to swallow you whole.", vore: "type=oral; stage=before; digest=0; pred=anthro fox, female, large; prey=you, human, male, small" });
  let c = await cur(); chk(`before: ${JSON.stringify(c)}`, c && c.mode === "empty" && c.species === "wolf" && c.female);
  await pg.waitForTimeout(800);
  let p = await paint(); chk(`drawn in the accent colour (${p.a}/${p.n} of ${p.total})`, p.n > p.total * 0.05 && p.a > p.n * 0.9);
  chk(wide ? "wide: card hidden, panel shows it" : "card shows", wide ? await pg.evaluate(() => $("voreCard").hidden && !!document.querySelector("#side canvas.sil-cv")) : await pg.evaluate(() => !$("voreCard").hidden));

  // 2) inside: the full belly, and the new reply sets off a gulp
  const p0 = p.n;
  await send({ text: "Wren swallows you down; you land in her stomach.", act: "vore", vore: "type=oral; stage=inside; digest=0; pred=anthro fox, female, large; prey=you, human, male, small" });
  c = await cur(); chk("inside: full belly", c?.mode === "full");
  const moved = await pg.evaluate(() => SIL.e.belly.d.some(q => Math.hypot(q.x, q.y) > 0.5) || Math.hypot(SIL.e.belly.ox, SIL.e.belly.oy) > 0.5);
  chk("gulp moved the belly", moved);
  await pg.waitForTimeout(400); p = await paint(); chk(`full belly paints more (${p0} -> ${p.n})`, p.n > p0 * 1.15);

  // 3) a burp in the reply: the head tilts back and gas puffs out
  await send({ text: "Wren lets out a deep, rumbling belch.", act: "vore", vore: "type=oral; stage=digesting; digest=30; pred=anthro fox, female, large; prey=you, human, male, small" });
  await pg.waitForTimeout(500);
  const burp = await pg.evaluate(() => ({ a: SIL.e.head.a, puffs: SIL.e.puffs.length }));
  chk(`belch: head ${burp.a.toFixed(3)}, ${burp.puffs} puffs`, burp.a > 0.02 && burp.puffs > 0);

  // 4) struggling prey kicks
  await send({ text: "The rabbit thrashes and kicks inside her.", act: "struggle", vore: "type=oral; stage=digesting; digest=35; pred=anthro fox, female, large; prey=feral rabbit, female, small" });
  chk("struggle on", (await cur())?.struggle === true);

  // 5) rubbing straight on the picture: sounds and the "You rubbed" chip; a tap still shrinks the card
  const plays = []; await pg.exposeFunction("__pk", k => plays.push(k)); await pg.evaluate(() => { const o = playKey; window.playKey = (...a) => { __pk(a[0]); return o(...a); }; });
  const box = await pg.evaluate(sel => { const cv = document.querySelector(sel); cv.scrollIntoView?.({ block: "nearest" }); const r = cv.getBoundingClientRect(), B = SIL.e.belly, M = SIL.meta; return { x: r.left + B.cx * r.width / M.w, y: r.top + B.cy * r.width / M.w, r: B.ry * r.width / M.w * 0.6 }; }, cvSel);
  await pg.mouse.move(box.x, box.y); await pg.mouse.down();
  for (let i = 0; i <= 80; i++) { const a = i / 8; await pg.mouse.move(box.x + Math.cos(a) * box.r, box.y + Math.sin(a) * box.r); await pg.waitForTimeout(25); }
  const during = await pg.evaluate(() => !!SIL.hand); await pg.mouse.up(); await pg.waitForTimeout(300);
  const rub = await pg.evaluate(() => S.chat.pendingRub);
  chk(`rub on the picture: ${JSON.stringify(rub)}, sounds ${plays.join(" ")}`, during && rub?.part === "belly" && rub.amt > 0 && plays.length > 0);
  chk("rubbing didn't shrink the card", !(await pg.evaluate(() => S.settings.voreMin)));
  if (!wide) {
    await pg.click("#voreCard .vg-body"); await pg.waitForTimeout(200); chk("tap shrinks the card", await pg.evaluate(() => S.settings.voreMin && !!document.querySelector("#voreCard .vg-icon")));
    await pg.click("#voreCard .vg-icon"); await pg.waitForTimeout(200); chk("tap brings it back", await pg.evaluate(() => !S.settings.voreMin && !!document.querySelector("#voreCard canvas.sil-cv")));
  }
  await pg.evaluate(async () => { S.chat.pendingRub = null; await saveChat(); drawRubChip(); });
  // the rub pad's hand moves the picture too
  const pad = await pg.evaluate(() => { silPadHand("belly", 20, 10, 6, 2, 100); return !!SIL.padHand && SIL.padHand.reach > 0; });
  chk("rub pad hand reaches the picture", pad); await pg.evaluate(() => { SIL.padHand = null; });

  // 6) digested: the empty body again, the meal adds weight; the prompt carries the number
  await send({ text: "Wren pats her softer, rounder middle; you're gone.", vore: "type=oral; stage=after; digest=100; pred=anthro fox, female, large; prey=you, human, male, small" });
  c = await cur(); const g = await pg.evaluate(() => S.chat.gain);
  chk(`after: empty body, gain ${g}, fat ${c?.fat}`, c?.mode === "empty" && g === 12 && Math.abs(c.fat - 0.12) < 1e-6);   // a small human into a large pred: 30 x 0.6/1.45
  await pg.waitForTimeout(400); p = await paint(); chk(`weight shows (${p.n} > ${p0})`, p.n > p0 * 1.03);
  await send({ text: "Wren sleeps it off." });
  chk("the prompt carries the weight", /right now 12/.test(calls.filter(x => x.stream).at(-1).messages[0].content));
  chk("a meal only counts once", (await pg.evaluate(() => S.chat.gain)) === 12);
  await send({ text: "Over the next week Wren works the weight off with long runs." });
  chk("burned off: gain " + await pg.evaluate(() => S.chat.gain), (await pg.evaluate(() => S.chat.gain)) === 0);
  await send({ text: "Weeks later she's hungry again.", vore: "type=oral; stage=after; digest=100; pred=anthro fox, female, large; prey=you, human, male, small; gain=55, belly" });
  chk("the story's own gain wins", (await pg.evaluate(() => S.chat.gain)) === 55);

  chk("bigger prey adds more: " + await pg.evaluate(() => [silMealGain(parseVore('type=oral; stage=after; pred=anthro wolf, female, large; prey=you, human, male, large')), silMealGain(parseVore('type=oral; stage=after; pred=anthro wolf, female, large; prey=you, human, male, tiny + feral rabbit, female, tiny'))].join()), await pg.evaluate(() => silMealGain(parseVore('type=oral; stage=after; pred=anthro wolf, female, large; prey=you, human, male, large')) === 30 && silMealGain(parseVore('type=oral; stage=after; pred=anthro wolf, female, large; prey=you, human, male, tiny + feral rabbit, female, tiny')) === 10));
  chk("gas is soft green", (await cur())?.puff === "176,222,150");
  // 7) cock vore on a female pred: the herm with cock and nuts; breast vore waits for its bench
  await send({ text: "Her cock swallows you into her heavy balls.", act: "vore", vore: "type=cock; stage=inside; digest=0; pred=anthro fox, female, large; prey=you, human, male, small" });
  c = await cur(); chk(`cock vore: ${c?.mode}, female ${c?.female}`, c?.mode === "cock" && c.female);
  await pg.waitForTimeout(400); p = await paint(); chk("cock state drawn", p.n > p0 * 0.9);
  await send({ text: "You sink into her breast.", act: "vore", vore: "type=breast; stage=inside; digest=0; pred=anthro fox, female, large; prey=you, human, male, small" });
  chk("breast vore: no picture yet", await pg.evaluate(() => !SIL.cur && $("voreCard").hidden && !document.querySelector("#side canvas.sil-cv")));

  // 8) the usual weight in the editor
  await pg.evaluate(() => editChar(char())); await pg.waitForTimeout(400);
  chk("editor has Usual weight", await pg.evaluate(() => !!$("cWeight")));
  await pg.evaluate(() => { $("cWeight").value = 40; $("cWeight").dispatchEvent(new Event("input", { bubbles: true })); }); await pg.click("#cSave"); await pg.waitForTimeout(500);
  chk("usual weight saved", await pg.evaluate(() => S.chars[0].weight === 40));
  await pg.evaluate(async () => { S.chat.gain = 0; await saveChat(); }); await pg.waitForTimeout(200);
  await send({ text: "Wren gulps you down again.", act: "vore", vore: "type=oral; stage=inside; digest=0; pred=anthro fox, female, large; prey=you, human, male, small" });
  c = await cur(); chk(`usual weight shows (fat ${c?.fat})`, Math.abs((c?.fat || 0) - 0.4 - (await pg.evaluate(() => S.chat.gain)) / 100) < 1e-6);

  // 9) the switch
  await pg.evaluate(async () => { S.settings.voreGfx = false; await saveSettings(); updateAmbience(); }); await pg.waitForTimeout(300);
  chk("switch off: hidden", await pg.evaluate(() => $("voreCard").hidden && !SIL.cur));
  await send({ text: "Her belly gurgles." });
  chk("switch off: no vore field in prompt", !/vore: type=/.test(calls.filter(x => x.stream).at(-1).messages[0].content));
  console.log("ERRORS:", errs.length ? errs.join("\n") : "none"); await b.close();
})().catch(e => { console.error(e); process.exit(1); });
