// v1.83: every season has its own limited shop items (flame, lantern, theme, bubbles, finish), badges and Home decorations
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W, season: true });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 1.83 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1083));
  const cat = await pg.evaluate(() => SEASONS.map(x => ({ k: x.k, items: (x.items || []).length, ok: (x.items || []).every(id => SHOP_BY[id]?.season === x.k), cats: [...new Set((x.items || []).map(id => id.split(":")[0]))].length, badges: ACH.filter(a => a.season === x.k).length })));
  chk(`every season has 5 items, one of each kind (${cat.map(c => c.k + ":" + c.items).join(" ")})`, cat.every(c => c.items === 5 && c.ok && c.cats === 5));
  chk(`every season has its 6 badges (${cat.map(c => c.badges).join(",")})`, cat.every(c => c.badges === 6));
  const base = await pg.evaluate(() => SHOP.filter(x => !x.season).reduce((a, x) => a + x.price, 0));
  chk(`the year-round shop is unchanged (${base})`, base === 14150);
  const draw = await pg.evaluate(async () => {
    const out = [];
    for (const x of SEASONS) for (const id of x.items) { const it = SHOP_BY[id], [c, k] = id.split(":"); let html = "";
      if (c === "flame") html = lanternSVG("", { flame: k }); else if (c === "lantern") html = lanternSVG("", { lantern: k }); else html = shopSample(it);
      const d = document.createElement("div"); d.innerHTML = html; document.body.appendChild(d); const r = d.getBoundingClientRect(); const ok = /<svg|class=/.test(html) && r.height > 10 && !d.querySelector("parsererror"); d.remove(); if (!ok) out.push(id); }
    return out;
  });
  chk(`all 30 seasonal items draw (${draw.join(", ") || "none broken"})`, !draw.length);
  for (const k of ["winter", "newyear", "valentine", "spring", "summer", "anniv"]) {
    const r = await pg.evaluate(async k => {
      SEASON_FORCE = { k }; const sn = SEASON_BY[k]; const ids = sn.items;
      for (let i = 0; i < 80; i++) ACHS.got["pad" + i] = ACHS.got["pad" + i] || { at: 1 }; for (const kk of Object.keys(ACH_BY).slice(0, 160)) ACHS.got[kk] = ACHS.got[kk] || { at: 1 };
      openTrophies(null, "shop"); const seen = []; for (const c of ["flame", "lantern", "theme", "bubble", "finish"]) { SHOP_CAT = c; openTrophies(null, "shop"); await new Promise(r => setTimeout(r, 20)); const t = $("sheetBody").textContent; seen.push(ids.filter(id => id.startsWith(c)).every(id => t.includes(SHOP_BY[id].n))); }
      const banner = /items are in/.test($("sheetBody").textContent);
      const bought = ids.map(id => shopBuy(SHOP_BY[id])).every(Boolean);
      const [th] = ids.filter(i => i.startsWith("theme:")).map(i => i.split(":")[1]), [bu] = ids.filter(i => i.startsWith("bubble:")).map(i => i.split(":")[1]);
      shopWear("theme", th); shopWear("bubble", bu); await new Promise(r => setTimeout(r, 30));
      const h = document.documentElement, fx = $("stFx")?.innerHTML || "";
      const res = { seen: seen.every(Boolean), banner, bought, theme: h.classList.contains("st-" + th) && fx.length > 50, bubble: h.classList.contains("sb-" + bu), costume: !!ACHS.got[k + "_costume"] };
      shopWear("theme", ""); shopWear("bubble", "");
      seasonBadge("trick"); res.trick = !!ACHS.got[k + "_trick"];
      closeSheet(); renderHome(); await new Promise(r => setTimeout(r, 30)); res.deco = ($("seasonFx")?.innerHTML || "").length > 100; res.greet = /Happy/.test($("tagline")?.textContent || "");
      SEASON_FORCE = { k: "off" }; const out = SHOP_BY[ids[0]]; res.refuse = !seasonItemOk(out);
      return res;
    }, k);
    chk(`${k}: its items are in the shop with a banner, can be bought, and its theme and bubbles work`, r.seen && r.banner && r.bought && r.theme && r.bubble);
    chk(`${k}: wearing one earns its badge; chatting earns another; Home is decorated`, r.costume && r.trick && r.deco && r.greet && r.refuse);
  }
  const wide = await pg.evaluate(async () => { SEASON_FORCE = { k: "winter" }; SHOP_CAT = "bubble"; openTrophies(null, "shop"); await new Promise(r => setTimeout(r, 40)); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
