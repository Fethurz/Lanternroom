// v1.58: badges, points, shop purchases, what's worn and the daily bot sync between two devices (fake account server)
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  // ---- a tiny stand-in for the Supabase kv table, shared by both "devices"
  const rows = new Map(); let tick = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++tick * 1000).toISOString();
  const fake = async r => {
    const req = r.request(), u = new URL(req.url());
    if (!u.pathname.startsWith("/rest/v1/kv")) return r.fulfill({ status: 404, body: "" });
    if (req.method() === "POST") {
      const out = [];
      for (const x of JSON.parse(req.postData() || "[]")) {
        const cur = rows.get(x.key);
        if (cur && (+x.base_at || 0) < cur.client_at) continue;   // another device saved first: refused, like the kv_touch trigger
        rows.set(x.key, { key: x.key, value: x.value, deleted: x.deleted, client_at: x.client_at, updated_at: stamp() }); out.push({ key: x.key, client_at: x.client_at });
      }
      return r.fulfill({ status: 201, body: JSON.stringify(out), headers: { "content-type": "application/json" } });
    }
    let list = [...rows.values()].sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
    const gt = u.searchParams.get("updated_at"); if (gt) list = list.filter(x => x.updated_at > gt.slice(3));
    const kin = u.searchParams.get("key"); if (kin) { const ks = JSON.parse("[" + kin.slice(4, -1) + "]"); list = list.filter(x => ks.includes(x.key)); }
    return r.fulfill({ status: 200, body: JSON.stringify(list), headers: { "content-type": "application/json" } });
  };
  const dev = async () => { const d = await open({ width: W }); await d.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake); return d; };
  const A = await dev(), B = await dev();
  const login = pg => pg.evaluate(() => { Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: {}, dirty: [], pulled: "1970-01-01T00:00:00Z" }; Sync.save(); });
  // both devices are already logged in and each earned/bought things with v1.57, when badges stayed on the device
  await login(A.pg); await login(B.pg);
  const old = (pg, ach, daily) => pg.evaluate(async ([ach, daily]) => { Sync.applying = true; await Store.set("ach", { ...achBlank(), ...ach }); if (daily) await Store.set("daily", daily); Sync.applying = false; ACHS = null; await achLoad(); }, [ach, daily]);
  await old(A.pg, { got: { first_swallow: { at: 10, bot: null }, vore_wedged: { at: 11, bot: null } }, shop: { owned: { "flame:candle": 20 }, wear: { flame: "candle" }, wearAt: 100 } }, { day: "2026-10-23", status: "kept", kind: "character", tags: [], card: { name: "Daisy" }, at: 5 });
  await old(B.pg, { got: { nat20: { at: 12, bot: null } }, shop: { owned: { "theme:star": 30 }, wear: { theme: "star" }, wearAt: 200 } }, null);
  // the update arrives: each device restarts (boot sends what it has once), then they sync back and forth
  for (const d of [A, B]) { await d.pg.evaluate(() => { localStorage.setItem("lr_sync", JSON.stringify(Sync.st)); }); await d.pg.reload(); await d.pg.evaluate(() => BOOTED); await d.pg.waitForTimeout(800); }
  const round = async () => { for (const d of [A, B, A, B]) { await d.pg.evaluate(async () => { await Sync.push(); await Sync.pull(); await Sync.push(); }); await d.pg.waitForTimeout(250); } };
  await round();
  const st = pg => pg.evaluate(() => ({ got: Object.keys(ACHS.got).sort().join(","), owned: Object.keys(ACHS.shop.owned).sort().join(","), wear: JSON.stringify(ACHS.shop.wear), pts: achPoints(), star: document.documentElement.classList.contains("st-star"), daily: DAILY.cur?.card?.name || "" }));
  const a1 = await st(A.pg), b1 = await st(B.pg);
  console.log("A", JSON.stringify(a1)); console.log("B", JSON.stringify(b1));
  chk("old badges from both devices end up on both", a1.got === b1.got && /first_swallow/.test(a1.got) && /nat20/.test(a1.got) && /vore_wedged/.test(b1.got));
  chk("purchases from both devices are on both", a1.owned === "flame:candle,theme:star" && b1.owned === a1.owned);
  chk("points are the same on both", a1.pts.bal === b1.pts.bal && a1.pts.earned === b1.pts.earned && a1.pts.spent === 350);
  chk("each device's worn things merge: A's flame and B's theme on both", a1.wear === b1.wear && /candle/.test(a1.wear) && /star/.test(a1.wear) && a1.star && b1.star);
  chk("the daily bot reaches the other device", b1.daily === "Daisy");
  // ---- live: A changes clothes, B earns a badge while A has the trophy page open
  await A.pg.evaluate(() => { for (const a of ACH.filter(a => a.s || a.nw).slice(0, 40)) ACHS.got[a.k] = { at: 5, bot: null }; shopBuy(SHOP_BY["bubble:pixel"]); shopWear("bubble", "pixel"); shopWear("theme", ""); openTrophies(); });
  await B.pg.evaluate(() => { achGrant("nat1"); });
  await B.pg.waitForTimeout(500); await A.pg.waitForTimeout(500);
  await round();
  const a2 = await A.pg.evaluate(() => ({ nat1: !!ACHS.got.nat1, big: document.querySelector(".ach-sum .ach-big")?.textContent || "", n: Object.keys(ACHS.got).filter(k => ACH_BY[k]).length }));
  const b2 = await B.pg.evaluate(() => ({ pixel: document.documentElement.classList.contains("sb-pixel"), star: document.documentElement.classList.contains("st-star"), owned: !!ACHS.shop.owned["bubble:pixel"], bal: achPoints().bal }));
  const aBal = await A.pg.evaluate(() => achPoints().bal);
  chk("a badge earned on B shows on A, and A's open trophy page updates", a2.nat1 && a2.big.startsWith(String(a2.n)));
  chk("A's new bubble and taking the theme off reach B", b2.pixel && !b2.star && b2.owned);
  chk("points still match after live changes", aBal === b2.bal);
  const errs = [...A.errs, ...B.errs]; chk("no page errors", errs.length === 0); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await A.b.close(); await B.b.close();
})();
