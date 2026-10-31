// v2.8.2: the restore repro. A device holding the full bot list, marked as changed, starts the app while the account has an
// older, shorter list from another device. The fake account accepts every upsert, like the real one (kv_touch's insert step
// clears base_at), so the app itself must check versions, wait for storage, merge (union) and never send its list as deleted.
// Then a second device with the stale short list makes a change: it must not shrink the account either.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const rows = new Map(), posts = []; let tick = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++tick * 1000).toISOString();
  const fake = async r => {
    const req = r.request(), u = new URL(req.url());
    if (!u.pathname.startsWith("/rest/v1/kv")) return r.fulfill({ status: 404, body: "" });
    if (req.method() === "POST") {
      const out = [];
      for (const x of JSON.parse(req.postData() || "[]")) {
        posts.push({ key: x.key, deleted: x.deleted, n: Array.isArray(x.value) ? x.value.length : x.value === null ? "null" : typeof x.value, base: x.base_at });
        // like the real account: an upsert is always accepted (the insert step of kv_touch clears base_at), stamped "now"
        const at = 1e12 + ++tick;
        rows.set(x.key, { key: x.key, value: x.value, deleted: x.deleted, client_at: at, updated_at: stamp() }); out.push({ key: x.key, client_at: at });
      }
      return r.fulfill({ status: 201, body: JSON.stringify(out), headers: { "content-type": "application/json" } });
    }
    let list = [...rows.values()].sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
    const gt = u.searchParams.get("updated_at"); if (gt) list = list.filter(x => x.updated_at > gt.slice(3));
    const kin = u.searchParams.get("key"); if (kin) { const ks = JSON.parse("[" + kin.slice(4, -1) + "]"); list = list.filter(x => ks.includes(x.key)); }
    return r.fulfill({ status: 200, body: JSON.stringify(list), headers: { "content-type": "application/json" } });
  };
  const A = await open({ width: W }); await A.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake);
  const bots = n => Array.from({ length: n }, (_, i) => ({ id: "bot" + i, name: "Bot " + i, kind: "character" }));
  // the account: the phone's old 5-bot list, newer than what this device last saw
  rows.set("chars", { key: "chars", value: bots(5), deleted: false, client_at: 2000, updated_at: stamp() });
  rows.set("settings", { key: "settings", value: { theme: "lantern" }, deleted: false, client_at: 2000, updated_at: stamp() });
  // this device: all 8 bots, last saw the account's version 1000, now marked as changed (exactly how the restore was done)
  await A.pg.evaluate(async b => {
    Sync.applying = true; await Store.set("chars", b); Sync.applying = false;
    const st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: { chars: 1000, settings: 1000 }, dirty: ["chars", "settings"], edits: { chars: Date.now(), settings: Date.now() + 1 }, pulled: "2026-01-01T00:00:00.500Z" };
    localStorage.setItem("lr_sync", JSON.stringify(st));
  }, bots(8));
  await A.pg.reload(); await A.pg.evaluate(() => BOOTED);
  await A.pg.waitForTimeout(6000);
  const loc = await A.pg.evaluate(async () => ({ n: ((await Store.get("chars")) || []).length, mem: S.chars.length, dirty: Sync.st.dirty }));
  const acc = rows.get("chars");
  console.log("posts:", JSON.stringify(posts));
  chk(`the device never sends its list as deleted`, !posts.some(p => p.deleted));
  chk(`the account ends with all 8 (${acc.deleted ? "DELETED" : (acc.value || []).length})`, !acc.deleted && (acc.value || []).length === 8);
  chk(`the device keeps all 8 (${loc.n}, in memory ${loc.mem})`, loc.n === 8 && loc.mem === 8);
  chk("settings aren't deleted", !rows.get("settings").deleted);
  // the phone: still holding the old 5-bot list and believing it's current, it changes a bot
  const P = await open({ width: W }); await P.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake);
  const verNow = rows.get("chars").client_at;
  await P.pg.evaluate(async ([b, ver]) => {
    Sync.applying = true; await Store.set("chars", b); Sync.applying = false;
    Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: { chars: 1000 }, dirty: [], pulled: new Date(Date.now() + 1e10).toISOString() }; Sync.save();
    S.chars = await Store.get("chars"); S.chars[0].name = "Edited on the phone"; await saveChars(); await Sync.push(); await new Promise(r => setTimeout(r, 1500));
  }, [bots(5), verNow]);
  await P.pg.waitForTimeout(1500);
  const acc2 = rows.get("chars").value || [];
  chk(`a stale phone's change is merged, the account keeps all 8 (${acc2.length})`, acc2.length === 8 && acc2.some(c => c.name === "Edited on the phone"));
  chk(`the phone ends with all 8 (${await P.pg.evaluate(() => S.chars.length)})`, (await P.pg.evaluate(() => S.chars.length)) === 8);
  chk("still nothing sent as deleted", !posts.some(p => p.deleted));
  chk("version 2.8.2 or later", await A.pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2008002; }));
  const errs = [...A.errs, ...P.errs];
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await A.b.close(); await P.b.close();
})();
