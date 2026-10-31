// v2.9.1: a device that missed a change (a pull cut short, a save that failed) fetches it again. The PC program kept an
// old bot list after the account got new portraits: it had fetched the row, never stored it, and its bookmark moved past.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  // ---- a tiny stand-in for the Supabase kv table (as in tsync158)
  const rows = new Map(); let tick = 0, gets = 0;
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
    gets++;
    let list = [...rows.values()].sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
    const gt = u.searchParams.get("updated_at"); if (gt) list = list.filter(x => x.updated_at > gt.slice(3));
    const kin = u.searchParams.get("key"); if (kin) { const ks = JSON.parse("[" + kin.slice(4, -1) + "]"); list = list.filter(x => ks.includes(x.key)); }
    if (u.searchParams.get("select") === "key,client_at") list = list.map(x => ({ key: x.key, client_at: x.client_at }));
    return r.fulfill({ status: 200, body: JSON.stringify(list), headers: { "content-type": "application/json" } });
  };
  const d = await open({ width: W }); await d.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake);
  const pg = d.pg;
  // whole bots, as the app saves them (a bare test object gets filled in at start and saved again; real bots don't)
  const blank = await pg.evaluate(() => { const c = blankChar("character"); delete c.id; delete c.seed; return c; });
  const bot = (id, pic) => ({ ...blank, id, seed: 1, name: "Bot " + id, description: "d", customPortrait: pic || "" });
  const T = Date.now(), put = (key, value, at) => rows.set(key, { key, value, deleted: false, client_at: T + at, updated_at: stamp() });
  put("chars", [bot("a"), bot("b")], 1000); put("seeded", true, 1000);
  const login = () => pg.evaluate(() => { Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: {}, dirty: [], pulled: "1970-01-01T00:00:00Z" }; Sync.save(); });
  await login();
  chk("version 2.9.1 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2009001; }));
  await pg.evaluate(() => Sync.pull());
  chk("the device takes the account's bots", await pg.evaluate(() => S.chars.map(c => c.id).join(",") === "a,b"));

  // 1) another device adds portraits; this device's save of them fails once
  put("chars", [bot("a", "data:image/jpeg;base64,AAA"), bot("b", "data:image/jpeg;base64,BBB"), bot("j")], 2000);
  const r1 = await pg.evaluate(async () => {
    for (let i = 0; i < 40 && Sync.busy; i++) await new Promise(r => setTimeout(r, 100)); // the first pull's check may still be running
    Sync.healed = Date.now(); const real = Store.set; Store.set = async function (k, v) { if (k === "chars") { storeFailed(k, 9); return false; } return real.call(this, k, v); };
    try { await Sync.pull(); } finally { Store.set = real; }
    return { pics: S.chars.filter(c => c.customPortrait).length, miss: !!Sync.st.miss?.chars, ver: Sync.st.ver.chars };
  });
  chk(`a failed save is noted and not counted as had (${JSON.stringify(r1)})`, r1.pics === 0 && r1.miss && r1.ver === T + 1000);
  const r2 = await pg.evaluate(async () => { Sync.healed = 0; await Sync.pull(); for (let i = 0; i < 40 && Sync.busy; i++) await new Promise(r => setTimeout(r, 100)); return { pics: S.chars.filter(c => c.customPortrait).length, n: S.chars.length, ver: Sync.st.ver.chars, miss: !!Sync.st.miss?.chars }; });
  chk(`the check fetches it again and the portraits arrive (${JSON.stringify(r2)})`, r2.pics === 2 && r2.n === 3 && r2.ver === T + 2000 && !r2.miss);

  // 2) a pull cut short: the app closes while the bot list is being saved
  put("chars", [bot("a", "data:image/jpeg;base64,AAA"), bot("b", "data:image/jpeg;base64,BBB"), bot("j", "data:image/jpeg;base64,JJJ")], 3000);
  const before = await pg.evaluate(() => Sync.st.pulled);
  await pg.evaluate(() => { Store.set = () => new Promise(() => {}); Sync.healed = Date.now(); Sync.pull(); });
  await pg.waitForTimeout(400);
  const mid = await pg.evaluate(() => JSON.parse(localStorage.getItem("lr_sync")).pulled);
  chk("the bookmark doesn't move while the rows are still being saved", mid === before);
  await pg.reload(); await pg.evaluate(() => BOOTED); await pg.waitForTimeout(1500);
  const r3 = await pg.evaluate(async () => { for (let i = 0; i < 40 && Sync.busy; i++) await new Promise(r => setTimeout(r, 100)); await Sync.pull(); return { j: !!S.chars.find(c => c.id === "j")?.customPortrait, ver: Sync.st.ver.chars }; });
  chk(`after reopening, the cut-short row arrives (${JSON.stringify(r3)})`, r3.j && r3.ver === T + 3000);

  // 3) a device stuck like the PC program: its bookmark is already past the row, its copy is old
  put("chars", [bot("a", "data:image/jpeg;base64,AAA2"), bot("b", "data:image/jpeg;base64,BBB"), bot("j", "data:image/jpeg;base64,JJJ")], 4000);
  await pg.evaluate(async () => { Sync.st.pulled = "2030-01-01T00:00:00Z"; Sync.save(); });
  await pg.reload(); await pg.evaluate(() => BOOTED); await pg.waitForTimeout(2500);
  const r4 = await pg.evaluate(async () => { for (let i = 0; i < 40 && Sync.busy; i++) await new Promise(r => setTimeout(r, 100)); return { a: S.chars.find(c => c.id === "a")?.customPortrait, ver: Sync.st.ver.chars }; });
  chk(`a device whose bookmark skipped the row gets it on its next start (${JSON.stringify(r4)})`, r4.a === "data:image/jpeg;base64,AAA2" && r4.ver === T + 4000);

  // 4) when nothing is missing, the check fetches no rows
  const g0 = gets;
  const r5 = await pg.evaluate(async () => { Sync.healed = 0; await Sync.heal(); return true; });
  chk(`an up-to-date check only asks for the list of versions (${gets - g0} request)`, r5 && gets - g0 === 1);
  chk("no page errors" + (d.errs.length ? ": " + d.errs.slice(0, 3).join(" | ") : ""), !d.errs.length);
  await d.b.close();
})();
