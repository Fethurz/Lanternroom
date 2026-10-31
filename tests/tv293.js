// v2.9.3: an old device's untouched bots never beat the account's newer ones in a merge. The PC program opened with an old
// bot list, v2.9.2's story change edited it before the sync brought the account's, and the merge then kept the PC's copy of
// every bot (losing 13 new portraits; only the brand-new Joanne came through).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const rows = new Map(); let tick = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++tick * 1000).toISOString();
  const fake = async r => {
    const req = r.request(), u = new URL(req.url());
    if (!u.pathname.startsWith("/rest/v1/kv")) return r.fulfill({ status: 404, body: "" });
    if (req.method() === "POST") {
      const out = [];
      for (const x of JSON.parse(req.postData() || "[]")) {
        const cur = rows.get(x.key);
        if (cur && (+x.base_at || 0) < cur.client_at) continue;
        rows.set(x.key, { key: x.key, value: x.value, deleted: x.deleted, client_at: x.client_at, updated_at: stamp() }); out.push({ key: x.key, client_at: x.client_at });
      }
      return r.fulfill({ status: 201, body: JSON.stringify(out), headers: { "content-type": "application/json" } });
    }
    let list = [...rows.values()].sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
    const gt = u.searchParams.get("updated_at"); if (gt) list = list.filter(x => x.updated_at > gt.slice(3));
    const kin = u.searchParams.get("key"); if (kin) { const ks = JSON.parse("[" + kin.slice(4, -1) + "]"); list = list.filter(x => ks.includes(x.key)); }
    const sel = u.searchParams.get("select"); if (sel === "key,client_at") list = list.map(x => ({ key: x.key, client_at: x.client_at }));
    return r.fulfill({ status: 200, body: JSON.stringify(list), headers: { "content-type": "application/json" } });
  };
  const d = await open({ width: W }); await d.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake);
  const pg = d.pg;
  const blank = await pg.evaluate(() => { const c = blankChar("character"); delete c.id; delete c.seed; return c; });
  const story = { title: "S", chapters: [{ t: "A", goal: "a", scenes: 6 }, { t: "B", goal: "b", scenes: 6 }] };
  const bot = (id, pic, extra) => ({ ...blank, id, seed: 1, name: "Bot " + id, description: "d", customPortrait: pic || "", ...(extra || {}) });
  const T = Date.now(), put = (key, value, at) => rows.set(key, { key, value, deleted: false, client_at: T + at, updated_at: stamp() });
  put("chars", [bot("a", "data:image/jpeg;base64,OLD"), bot("b"), bot("s", "", { storyDef: { ...story, s18: 1 } })], 1000); put("seeded", true, 1000);
  await pg.evaluate(() => { Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: {}, dirty: [], pulled: "1970-01-01T00:00:00Z" }; Sync.save(); });
  chk("version 2.9.3 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009003; }));
  await pg.evaluate(async () => { await Sync.pull(); for (let i = 0; i < 60 && Sync.busy; i++) await new Promise(r => setTimeout(r, 100)); });
  chk("the device takes the account's bots and remembers how each looked", await pg.evaluate(() => S.chars.map(c => c.id).join() === "a,b,s" && Object.keys(Sync.st.isig?.chars || {}).length === 3));

  // 1) another device adds a portrait to a and a new bot j; this device (not having seen it) edits only b, later
  put("chars", [bot("a", "data:image/jpeg;base64,NEW"), bot("b"), bot("s", "", { storyDef: { ...story, s18: 1 } }), bot("j", "data:image/jpeg;base64,JJJ")], 2000);
  const r1 = await pg.evaluate(async () => {
    Sync.healed = Date.now();
    const b = S.chars.find(c => c.id === "b"); b.description = "edited here"; await saveChars();
    await Sync.push(); for (let i = 0; i < 60 && (Sync.busy || Sync.pushing); i++) await new Promise(r => setTimeout(r, 100));
    const g = id => S.chars.find(c => c.id === id) || {};
    return { a: g("a").customPortrait, b: g("b").description, j: !!g("j").id, n: S.chars.length };
  });
  const acc = rows.get("chars").value, ga = id => acc.find(c => c.id === id) || {};
  chk(`the merge keeps the account's newer portrait on the bot this device didn't touch (${r1.a})`, r1.a === "data:image/jpeg;base64,NEW");
  chk(`and this device's own edit to b, plus the new bot j (${JSON.stringify(r1)})`, r1.b === "edited here" && r1.j && r1.n === 4);
  chk(`the account ends with both changes (${ga("a").customPortrait}, ${ga("b").description}, j ${!!ga("j").id})`, ga("a").customPortrait === "data:image/jpeg;base64,NEW" && ga("b").description === "edited here" && !!ga("j").id);

  // 2) both sides change the same bot: the newer edit wins it, as before
  put("chars", acc.map(c => c.id === "b" ? { ...c, description: "older edit elsewhere" } : c), Date.now() - T);
  await pg.waitForTimeout(20);
  const r2 = await pg.evaluate(async () => {
    const b = S.chars.find(c => c.id === "b"); b.description = "newer edit here"; await saveChars();
    await Sync.push(); for (let i = 0; i < 60 && (Sync.busy || Sync.pushing); i++) await new Promise(r => setTimeout(r, 100));
    return S.chars.find(c => c.id === "b").description;
  });
  chk(`a bot changed on both sides goes to the newer edit (${r2})`, r2 === "newer edit here");

  // 3) the PC's case: an old copy with a story still at 6 scenes; the account has a new portrait. At start the story change
  // must wait for the sync, so the portrait arrives and the story still becomes 18 scenes
  await pg.evaluate(async () => {
    const old = (await Store.get("chars")).map(c => c.id === "s" ? { ...c, customPortrait: "", storyDef: { title: "S", chapters: [{ t: "A", goal: "a", scenes: 6 }, { t: "B", goal: "b", scenes: 6 }] } } : c);
    Sync.applying = true; await Store.set("chars", old); Sync.applying = false;
    Sync.idsSet("chars", old); Sync.st.ver.chars = 1; Sync.st.dirty = []; Sync.st.pulled = "2030-01-01T00:00:00Z"; Sync.save();
  });
  const cur = rows.get("chars").value;
  put("chars", cur.map(c => c.id === "s" ? { ...c, customPortrait: "data:image/jpeg;base64,SSS", storyDef: { title: "S", chapters: [{ t: "A", goal: "a", scenes: 6 }, { t: "B", goal: "b", scenes: 6 }] } } : c), 3000);
  await pg.reload(); await pg.evaluate(() => BOOTED);
  const r3 = await pg.evaluate(async () => {
    for (let i = 0; i < 80 && (Sync.busy || Sync.pushing || S.chars.find(c => c.id === "s")?.storyDef?.s18 !== 1); i++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 500));
    const s = S.chars.find(c => c.id === "s"); return { pic: s.customPortrait, s18: s.storyDef?.s18, sc: s.storyDef?.chapters.map(x => x.scenes).join() };
  });
  await pg.waitForTimeout(1500);
  const sa = rows.get("chars").value.find(c => c.id === "s");
  chk(`an old device at start gets the account's portrait and still turns its story to 18 scenes (${JSON.stringify(r3)})`, r3.pic === "data:image/jpeg;base64,SSS" && r3.s18 === 1 && r3.sc === "18,18");
  chk(`and the account keeps the portrait (${sa.customPortrait}, scenes ${sa.storyDef.chapters.map(x => x.scenes)})`, sa.customPortrait === "data:image/jpeg;base64,SSS");
  chk("no page errors" + (d.errs.length ? ": " + d.errs.slice(0, 3).join(" | ") : ""), !d.errs.length);
  await d.b.close();
})();
