// v1.57: badge points, rarity medals, ladders, the new badges, and the Lantern Shop (buy, try on, wear, wardrobe)
const open = require("./base.js");
const fs = require("fs");
(async () => {
  const W = +(process.env.W || 390), OUT = process.env.OUT || "";
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
  const { b, pg, errs } = await open({ width: W, stream: () => "*She leans in.* \"Hungry?\"\n[[mood: calm | place: Room | ambience: indoors | activity: none | harm: none | hearing: outside]]" });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const shot = async n => { if (OUT) await pg.screenshot({ path: `${OUT}/${n}-${W}.png` }); };
  await pg.evaluate(() => achLoad()); await wait(200);

  // ---- the catalogue and the badge budget
  const cat = await pg.evaluate(() => {
    const by = c => SHOP.filter(x => x.cat === c).length, shop = SHOP.reduce((a, x) => a + x.price, 0);
    const pot = ACH.reduce((a, x) => a + rarPts(achRarity(x)), 0);
    return { f: by("flame"), l: by("lantern"), t: by("theme"), b: by("bubble"), fi: by("finish"), shop, pot, n: ACH.length, lad: ACH.filter(a => a.lv).length, dup: ACH.length - new Set(ACH.map(a => a.k)).size, rare: ACH.filter(a => achRarity(a) === "rare").length };
  });
  console.log("catalogue", JSON.stringify(cat));
  chk("shop has 17 flames, 12 lanterns, 12 themes, 15 bubbles, 16 finishes", cat.f === 17 && cat.l === 12 && cat.t === 12 && cat.b === 15 && cat.fi === 16);
  chk("shop totals 14,150", cat.shop === 14150);
  chk("badges alone pay a little over the whole shop", cat.pot >= cat.shop * 1.05 && cat.pot <= cat.shop * 1.2);
  chk("75 ladder steps, no duplicate keys", cat.lad === 75 && cat.dup === 0);
  chk("some badges are rare", cat.rare >= 20);
  const rar = await pg.evaluate(() => [achRarity(ACH_BY.first_swallow), achRarity(ACH_BY.wiggle), achRarity(ACH_BY.vore_wedged), achRarity(ACH_BY.lad_talk_3), achRarity({ k: "bot:x", own: true })]);
  chk("rarity: common, rare, secret, ladder III, bot", rar.join() === "common,rare,secret,l3,bot");

  // ---- back pay: badges earned before count straight away
  const pay = await pg.evaluate(() => { ACHS.got = {}; ACHS.bots = {}; ACHS.custom = []; ACHS.shop = { owned: {}, wear: {}, wearAt: 0 };
    ACHS.got.first_swallow = { at: 1, bot: "a" }; ACHS.got.wiggle = { at: 1, bot: "a" }; ACHS.got.vore_wedged = { at: 1, bot: "a" }; ACHS.bots.b = { vore_wedged: 2, "bot:z": 3 }; ACHS.custom = [{ id: "q", name: "Q" }];
    return achPoints(); });
  chk("back pay: 10 + 25 + 50 + 5 (story badge on a 2nd bot) + 20 (bot badge) + 40 (one-off) = 150", pay.earned === 150 && pay.bal === 150);

  // ---- ladders: first pass is quiet, later steps toast
  const lad = await pg.evaluate(async () => { ACHS.n.ladInit = 0; ACHS.n.total = 1200; ACH_Q.length = 0; document.querySelectorAll(".ach-toast").forEach(x => x.remove()); achLadders();
    const quiet = !document.querySelector(".ach-toast"); const got = !!ACHS.got.lad_talk_1 && !!ACHS.got.lad_talk_2 && !ACHS.got.lad_talk_3;
    ACHS.n.total = 3000; achLadders(); await new Promise(r => setTimeout(r, 120)); const t = document.querySelector(".ach-toast"); return { quiet, got, toast: !!t && /Storyteller III/.test(t.textContent) && /\+40 points/.test(t.textContent), medal: !!t?.querySelector(".ach-medal.md-l3") }; });
  chk("ladders grant I and II from old progress without toasts", lad.quiet && lad.got);
  chk("a new ladder step toasts with its points and level medal", lad.toast && lad.medal);
  await pg.evaluate(() => { document.querySelectorAll(".ach-toast").forEach(x => x.remove()); ACH_Q.length = 0; });

  // plenty of points to shop with
  await pg.evaluate(() => { for (const a of ACH.filter(a => a.s || a.nw).slice(0, 120)) ACHS.got[a.k] = { at: 5, bot: null }; achSave(); });
  const bal0 = await pg.evaluate(() => achPoints().bal);

  // ---- trophy page: medals by rarity, points, shop tab
  await pg.evaluate(() => openTrophies()); await wait(300);
  const tp = await pg.evaluate(() => ({ pts: /points/.test(document.querySelector(".ach-sum").textContent), shopTab: !!document.querySelector('.ach-tabs [data-t="shop"]'), wear: !!document.querySelector('.ach-tabs [data-t="wear"]'), lad: !!document.querySelector('.ach-tabs [data-t="Ladders"]'), md: ["common", "rare", "secret", "l1"].every(r => document.querySelector(".ach-md.md-" + r)), tags: !!document.querySelector(".ach-pts.rp-secret") }));
  chk("trophy page shows points, Shop, Wardrobe and Ladders tabs", tp.pts && tp.shopTab && tp.wear && tp.lad);
  chk("rows have rarity medals and point tags", tp.md && tp.tags);
  await pg.click('.ach-tabs [data-t="Ladders"]'); await wait(200);
  chk("ladder rows show progress", /3,000 \/ 3,000|\/ 8,000/.test(await pg.textContent("#sheetBody")));
  await shot("01-ladders");
  await pg.click('.ach-tabs [data-t="shop"]'); await wait(300);
  chk("shop opens on flames with 17 items", await pg.$$eval(".ls-item", x => x.length) === 17 && !!await pg.$(".ls-item .lantern .lnf"));
  await shot("02-shop-flames");
  // buy a flame (two taps: the confirm)
  const fId = "flame:will-o-wisps";
  await pg.click(`.ls-item[data-id="${fId}"] [data-buy]`); await wait(100); await pg.click(`.ls-item[data-id="${fId}"] [data-buy]`); await wait(300);
  const bought = await pg.evaluate(id => ({ own: !!ACHS.shop.owned[id], spent: achPoints().spent }), fId);
  chk("buying spends 100 points", bought.own && bought.spent === 100);
  await pg.click(`.ls-item[data-id="${fId}"] [data-wear]`); await wait(300);
  chk("wearing the flame puts it in the logo lantern", await pg.evaluate(() => ACHS.shop.wear.flame === "will-o-wisps" && !!document.querySelector("#logoLantern .lnf")));
  // every category draws and the page never scrolls sideways
  for (const c of ["lantern", "theme", "bubble", "finish"]) { await pg.click(`.shop-cats [data-cat="${c}"]`); await wait(300); await shot("03-shop-" + c); }
  const wide = await pg.evaluate(() => { const s = document.querySelector("#sheetBody"); return s.scrollWidth - s.clientWidth; });
  chk("shop never scrolls sideways", wide <= 1);
  // buy + wear one of each other kind through the functions
  const worn = await pg.evaluate(() => { for (const id of ["lantern:jack-o-lantern", "theme:star", "bubble:pixel", "finish:gold"]) { const it = SHOP_BY[id]; shopBuy(it); shopWear(it.cat, it.key); }
    const h = document.documentElement, cs = getComputedStyle(h);
    return { lb: !!document.querySelector("#logoLantern .lantern.lb"), st: h.classList.contains("st-star"), bg: cs.getPropertyValue("--bg").trim(), sb: h.classList.contains("sb-pixel") && h.classList.contains("sb-any"), sf: h.classList.contains("sf-on") && h.classList.contains("sf-a-shine"), spent: achPoints().spent }; });
  chk("lantern body replaces the logo lantern", worn.lb);
  chk("shop theme replaces the palette", worn.st && worn.bg === "#07061a");
  chk("bubble and finish classes are on", worn.sb && worn.sf);
  chk("all four bought", worn.spent === 100 + 200 + 250 + 150 + 300);
  const fin = await pg.evaluate(() => { const btn = document.createElement("button"); btn.className = "btn primary"; document.body.appendChild(btn); const bg = getComputedStyle(btn).backgroundImage; btn.remove(); return bg; });
  chk("finish paints primary buttons in gold", /gradient/.test(fin) && /247, 215, 116|f7d774/i.test(fin));
  const shopBadge = await pg.evaluate(() => !!ACHS.got.shop_first && !!ACHS.got.shop_dress && !!ACHS.got.shop_full);
  chk("shop badges: first buy, three slots, all five slots", shopBadge);

  // ---- the chat wears it all
  await pg.evaluate(async () => { closeSheet(); await openChat(S.chars[0].id); }); await wait(700);
  await pg.fill("#input", "hi"); await pg.evaluate(() => send()); await pg.waitForFunction(() => !S.busy && S.chat.messages.some(m => m.role === "assistant"), null, { timeout: 15000 }).catch(() => {}); await wait(500);
  const ch = await pg.evaluate(() => { const m = document.querySelector("#msgs .msg.assistant:not(.img)"), cs = m && getComputedStyle(m); return { fx: (document.querySelector("#stFx")?.innerHTML || "").includes("twinkle"), font: cs?.fontFamily || "", border: cs?.borderTopWidth, chatBg: getComputedStyle(document.querySelector("#chat")).backgroundImage }; });
  chk("starlit sky moves behind the chat", ch.fx && /radial-gradient/.test(ch.chatBg));
  chk("pixel bubbles win over the theme's messages", /VT323/.test(ch.font) && parseFloat(ch.border) >= 2.5); if (!/VT323/.test(ch.font) || parseFloat(ch.border) < 2.5) console.log(JSON.stringify(ch).slice(0, 300));
  await shot("04-chat-star-pixel-gold");
  // finish the flame option
  await pg.evaluate(() => { const sh = shopOf(); sh.wear = { ...sh.wear, finFlame: true }; applyCosmetics(); });
  chk("finish the flame sets the flame colours", await pg.evaluate(() => document.documentElement.style.getPropertyValue("--fl-core") === "#fff3b0"));

  // ---- try-on: wears it for a moment, Back returns to the shop and takes it off
  await pg.evaluate(() => { const sh = shopOf(); sh.wear = {}; applyCosmetics(); openTrophies(null, "shop"); SHOP_CAT = "theme"; }); await wait(200);
  await pg.click('.shop-cats [data-cat="theme"]'); await wait(300);
  await pg.click('.ls-item[data-id="theme:maw"] [data-try]'); await wait(300);
  const tr = await pg.evaluate(() => ({ bar: !document.getElementById("tryBar").hidden, on: document.documentElement.classList.contains("st-maw"), owned: !!ACHS.shop.owned["theme:maw"] }));
  chk("Preview wears it with a bar on top, without buying", tr.bar && tr.on && !tr.owned);
  await shot("05-tryon-maw");
  await pg.click("#tbStop"); await wait(400);
  const tr2 = await pg.evaluate(() => ({ off: !document.documentElement.classList.contains("st-maw"), shop: !!document.querySelector(".shop-grid"), bar: document.getElementById("tryBar").hidden }));
  chk("Back to the shop takes it off and reopens the shop", tr2.off && tr2.shop && tr2.bar);

  // ---- wardrobe
  await pg.click('.ach-tabs [data-t="wear"]'); await wait(300);
  chk("wardrobe lists owned things per slot", await pg.$$eval(".wd-slot", x => x.length) === 5 && /Will-o'-wisps/.test(await pg.textContent("#sheetBody")));
  await pg.click('.wd-it[data-cat="theme"][data-key="star"]'); await wait(300);
  chk("tap in the wardrobe to wear", await pg.evaluate(() => document.documentElement.classList.contains("st-star")));
  await shot("06-wardrobe");
  await pg.click('.wd-it[data-cat="theme"][data-key=""]'); await wait(300);
  chk("Default takes it off", await pg.evaluate(() => !document.documentElement.classList.contains("st-star") && !ACHS.shop.wear.theme));

  // ---- two devices: owned items union, the later outfit wins
  const mg = await pg.evaluate(() => { const a = { shop: { owned: { "flame:candle": 5 }, wear: { flame: "candle" }, wearAt: 10 } }, c = { shop: { owned: { "theme:sea": 7 }, wear: { theme: "sea" }, wearAt: 20 } }; const o = achMerge(a, c).shop; return Object.keys(o.owned).length === 2 && o.wear.theme === "sea" && o.wear.flame === "candle"; });
  chk("sync merges purchases and each worn slot", mg);

  // ---- every flame and lantern draws in every place it shows
  const draws = await pg.evaluate(() => SHOP.filter(x => x.cat === "flame" || x.cat === "lantern").every(it => { const h = lanternSVG("seq", it.cat === "flame" ? { flame: it.key } : { lantern: it.key }); return /^<svg class="lantern/.test(h) && !/undefined/.test(h); }));
  chk("all 29 flames and lanterns draw", draws);

  // ---- achievements off hides points and the shop
  await pg.evaluate(() => { closeSheet(); S.settings.achOn = false; openTrophies(); }); await wait(200);
  chk("achievements off hides the shop", !await pg.$('.ach-tabs [data-t="shop"]') && !/points/.test(await pg.textContent(".ach-sum")));
  await pg.evaluate(() => { S.settings.achOn = true; closeSheet(); });

  chk("no page errors", errs.length === 0); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
