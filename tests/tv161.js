// v1.61: windows close only with ✕; finishes paint the whole app, in four parts switched in the Wardrobe.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  // ---- 1. tapping or dragging outside a window never closes it
  for (const [name, fn] of [["a window with no typing", () => openTrophies()], ["Settings", () => $("btnSettings").click()], ["a persona editor", () => editPersona({ id: uid(), name: "", description: "" }, true)]]) {
    await pg.evaluate(fn); await wait(300);
    const box = await pg.evaluate(() => { const r = document.querySelector("#sheet .panel").getBoundingClientRect(); return { top: r.top }; });
    await pg.mouse.click(W / 2, Math.max(5, box.top / 2)); await wait(200);
    await pg.mouse.move(W / 2, Math.max(5, box.top / 2)); await pg.mouse.down(); await pg.mouse.move(W / 2, box.top + 80, { steps: 5 }); await pg.mouse.up(); await wait(200);
    await pg.mouse.move(W / 2, box.top + 60); await pg.mouse.down(); await pg.mouse.move(W / 2, Math.max(5, box.top / 2), { steps: 5 }); await pg.mouse.up(); await wait(200);
    chk(`${name}: a tap or drag outside leaves it open`, await pg.evaluate(() => !$("sheet").hidden));
    await pg.click("#sheetClose"); await wait(250);
    chk(`${name}: ✕ closes it`, await pg.evaluate(() => $("sheet").hidden || !!$("sheetConfirm")));
    await pg.evaluate(() => { if ($("scClose")) $("scClose").click(); closeSheet(); });
  }
  // the sound panel: its own ✕, not taps elsewhere
  await pg.evaluate(async () => openChat(S.chars[0].id)); await wait(500);
  await pg.click("#btnAmb"); await wait(200);
  await pg.mouse.click(W / 2, 600); await wait(200);
  chk("the sound panel stays open after tapping the chat", await pg.evaluate(() => !$("ambPop").hidden));
  await pg.click("#apX"); await wait(150);
  chk("its ✕ closes it", await pg.evaluate(() => $("ambPop").hidden));
  await pg.click("#btnAmb"); await wait(150); await pg.click("#btnAmb"); await wait(150);
  chk("the 🔊 button still opens and closes it", await pg.evaluate(() => $("ambPop").hidden));
  await pg.evaluate(() => leaveChat());

  // ---- 3. finishes everywhere
  await pg.evaluate(() => { const sh = shopOf(); sh.owned["finish:gold"] = 1; sh.owned["finish:obsidian"] = 1; shopWear("finish", "gold"); renderHome(); });
  await wait(400);
  const cls = await pg.evaluate(() => [...document.documentElement.classList].filter(c => /^sfp-/.test(c)).sort().join(","));
  chk("wearing a finish turns on all four parts: " + cls, cls === "sfp-bar,sfp-ctl,sfp-glow,sfp-txt");
  const look = () => pg.evaluate(() => {
    const cs = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null; };
    return {
      primary: cs("#btnNewChar")?.backgroundImage || "", plain: cs("#btnBooks")?.borderTopColor || "", tabOn: cs("#homeTabs button.on")?.backgroundImage || "",
      title: cs(".tagline")?.backgroundClip || cs(".tagline")?.webkitBackgroundClip || "", name: cs("#charList .char-card .name")?.webkitTextFillColor || "",
      body: cs("body")?.backgroundImage || "", metal: getComputedStyle(document.documentElement).getPropertyValue("--lm-a").trim(), flame: getComputedStyle(document.documentElement).getPropertyValue("--fl-core").trim(),
      cardTop: cs("#charList .char-card")?.borderTopColor || ""
    };
  });
  const g = await look();
  chk("buttons: the main button wears the gold, the plain ones a gold edge", /gradient/.test(g.primary) && g.plain !== "rgb(58, 52, 73)");
  chk("tabs: the chosen tab wears it", /gradient/.test(g.tabOn));
  chk("text: titles and names are painted", g.title === "text" && /rgba\(0, 0, 0, 0\)|transparent/.test(g.name));
  chk("glows: background glow, lantern metal and flame", /radial-gradient/.test(g.body) && g.metal === "#6e4a0c" && g.flame === "#fff3b0");
  await pg.evaluate(async () => openChat(S.chars[0].id)); await wait(400);
  await pg.fill("#input", "*I wave.*"); await pg.evaluate(() => send()); await pg.waitForFunction(() => !S.busy); await wait(300);
  const bub = await pg.evaluate(() => { const u = [...document.querySelectorAll("#msgs .msg.user")].at(-1); const a = document.querySelector("#avatar"); return { bg: getComputedStyle(u).backgroundImage, ring: getComputedStyle(u).boxShadow, av: getComputedStyle(a).borderTopColor }; });
  chk("bubbles: your message bubble is tinted and ringed", /gradient/.test(bub.bg) && /inset/.test(bub.ring));
  chk("glows: the portrait ring takes the finish", bub.av !== "rgb(232, 169, 91)");
  await pg.evaluate(() => leaveChat());
  // each switch takes its part away, and only that part
  await pg.evaluate(() => openTrophies(null, "wear")); await wait(400);
  chk("the Wardrobe shows the four switches", (await pg.$$('.wd-parts [data-fp]')).length === 4 && /Where the finish shows/.test(await pg.textContent("#sheetBody")));
  await pg.evaluate(() => { const x = document.querySelector('[data-fp="ctl"]'); x.checked = false; x.dispatchEvent(new Event("change")); }); await wait(200);
  const off1 = await pg.evaluate(() => ({ ctl: document.documentElement.classList.contains("sfp-ctl"), txt: document.documentElement.classList.contains("sfp-txt"), bg: getComputedStyle($("btnNewChar")).backgroundImage }));
  chk("Buttons off: buttons go back to normal, text keeps the finish", !off1.ctl && off1.txt && !/#f7d774|247, 215, 116/.test(off1.bg));
  await pg.evaluate(() => { const x = document.querySelector('[data-fp="glow"]'); x.checked = false; x.dispatchEvent(new Event("change")); }); await wait(200);
  chk("Glows off: the lantern's own metal and flame come back", await pg.evaluate(() => !document.documentElement.style.getPropertyValue("--lm-a") && !document.documentElement.style.getPropertyValue("--fl-core") && !document.documentElement.classList.contains("sfp-glow")));
  chk("switches are saved with the outfit (and its time, for sync)", await pg.evaluate(() => { const sh = shopOf(); return sh.wear.finParts.ctl === false && sh.wear.finParts.glow === false && sh.wear.finParts.txt === true && sh.wearT.finParts > 0; }));
  // the same switches carry over to another finish
  await pg.evaluate(() => shopWear("finish", "obsidian")); await wait(200);
  chk("one set of switches for any finish", await pg.evaluate(() => !document.documentElement.classList.contains("sfp-ctl") && document.documentElement.classList.contains("sfp-txt")));
  // every finish's text colours are bright enough to read on the dark background
  const dim = await pg.evaluate(() => FINISHES.map(f => { const c = finCols(f); const ls = (c.text.match(/#[0-9a-f]{6}/g) || []).map(h => OKLAB.to(h)[0]); return [f.key, Math.min(...ls), OKLAB.to(c.mid)[0]]; }).filter(([, l, m]) => l < 0.73 || m < 0.6));
  chk("all 16 finishes give readable text (" + (dim.map(x => x[0]).join(",") || "none dim") + ")", dim.length === 0);
  // outfits from two devices: the newer switch setting wins
  const mg = await pg.evaluate(() => { const a = achBlank(), b2 = achBlank(); a.shop.wear = { finish: "gold", finParts: { ctl: false } }; a.shop.wearT = { finish: 5, finParts: 9 }; b2.shop.wear = { finish: "gold", finParts: { ctl: true } }; b2.shop.wearT = { finish: 5, finParts: 3 }; return achMerge(a, b2).shop.wear.finParts.ctl; });
  chk("sync keeps the newer switch setting", mg === false);
  await pg.evaluate(() => { shopWear("finish", ""); }); await wait(150);
  chk("taking the finish off clears every part", await pg.evaluate(() => ![...document.documentElement.classList].some(c => /^sf/.test(c))));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
