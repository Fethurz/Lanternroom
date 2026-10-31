// v2.8.1: a device that can't save the account's newer copy (storage full or limited) never counts it as had, so its own
// next change is merged instead of overwriting the account; a list that would drop several of the account's bots is merged
// too (deliberate deletions still go through); a failed save is reported. Two devices on a fake account server.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const rows = new Map(), accepted = []; let tick = 0;
  const stamp = () => new Date(Date.UTC(2026, 0, 1) + ++tick * 1000).toISOString();
  const fake = async r => {
    const req = r.request(), u = new URL(req.url());
    if (!u.pathname.startsWith("/rest/v1/kv")) return r.fulfill({ status: 404, body: "" });
    if (req.method() === "POST") {
      const out = [];
      for (const x of JSON.parse(req.postData() || "[]")) {
        const cur = rows.get(x.key);
        if (cur && (+x.base_at || 0) < cur.client_at) continue; // refused, like the kv_touch trigger
        rows.set(x.key, { key: x.key, value: x.value, deleted: x.deleted, client_at: x.client_at, updated_at: stamp() }); out.push({ key: x.key, client_at: x.client_at });
        if (x.key === "chars") accepted.push((x.value || []).length);
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
  for (const d of [A, B]) await d.pg.evaluate(() => {
    Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: {}, dirty: [], pulled: "1970-01-01T00:00:00Z" }; Sync.save();
    // the phone's storage: refuses a bot list longer than 5 while __full is on (a full disk, or a browser with ~5 MB)
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, k) { if (k === "chars" && window.__full && Array.isArray(v) && v.length > 5) throw new DOMException("full", "QuotaExceededError"); return put.call(this, v, k); };
    window.__toasts = []; const t = window.toast; window.toast = (m, ...r) => { window.__toasts.push(String(m)); return t(m, ...r); };
  });
  const settle = async (...ds) => { for (let i = 0; i < 3; i++) for (const d of ds) { await d.pg.evaluate(async () => { await Sync.push(); await Sync.pull(); await Sync.push(); }); await d.pg.waitForTimeout(250); } };
  const server = () => (rows.get("chars")?.value || []).map(c => c.name);
  // A (the PC) makes five bots; both devices get them
  await A.pg.evaluate(async () => { S.chars = [1, 2, 3, 4, 5].map(i => ({ ...blankChar("character"), id: "bot" + i, name: "Bot " + i })); await saveChars(); });
  await settle(A, B);
  chk(`both devices have the five bots (${(await B.pg.evaluate(() => S.chars.length))})`, (await B.pg.evaluate(() => S.chars.map(c => c.id).join())) === "bot1,bot2,bot3,bot4,bot5");
  // the phone's storage fills up; A adds two more bots
  await B.pg.evaluate(() => { window.__full = true; });
  await A.pg.evaluate(async () => { S.chars.push({ ...blankChar("world"), id: "bot6", name: "The Deepwild" }, { ...blankChar("world"), id: "bot7", name: "Matchmade" }); await saveChars(); await Sync.push(); });
  const verBefore = await B.pg.evaluate(() => Sync.st.ver.chars);
  await B.pg.evaluate(async () => { await Sync.pull(); });
  const b1 = await B.pg.evaluate(() => ({ ver: Sync.st.ver.chars, n: S.chars.length, fail: Store.lastFail?.k, toast: window.__toasts.join(" | ") }));
  chk("the phone can't save the bigger list, so it doesn't count it as had", b1.ver === verBefore && b1.n === 5);
  chk(`the phone says so (${b1.toast.slice(0, 90)}…)`, b1.fail === "chars" && /couldn't save your bots/.test(b1.toast) && /won't overwrite/.test(b1.toast));
  // the phone changes a bot (like re-applying story presets after an update): it must not overwrite the account
  await B.pg.evaluate(async () => { S.chars[0].name = "Bot 1 (edited on the phone)"; await saveChars(); await Sync.push(); await new Promise(r => setTimeout(r, 600)); });
  await B.pg.waitForTimeout(500);
  chk(`the account keeps all seven bots (${server().length}; accepted lists: ${accepted.join(",")})`, server().length === 7 && server().includes("The Deepwild") && server().includes("Matchmade") && Math.min(...accepted.slice(1)) === 7);
  chk("the phone stops refetching while it can't save", await B.pg.evaluate(() => !!(Sync.stuck || {}).chars));
  // space is freed: the phone's change is merged in and it gets everything
  await B.pg.evaluate(() => { window.__full = false; Sync.stuck = {}; });
  await settle(B, A);
  const fin = { s: server(), b: await B.pg.evaluate(() => S.chars.map(c => c.name)), a: await A.pg.evaluate(() => S.chars.map(c => c.name)) };
  chk(`after freeing space both devices and the account have all seven, with the phone's edit (${fin.s.join(", ")})`, fin.s.length === 7 && fin.s.includes("Bot 1 (edited on the phone)") && fin.b.length === 7 && fin.a.length === 7 && fin.a.includes("Bot 1 (edited on the phone)"));
  // a device whose saved list lost two of the account's bots (any cause) merges instead of sending it
  await A.pg.evaluate(async () => { await Store.set("chars", (await Store.get("chars")).slice(0, 5)); await Sync.push(); await new Promise(r => setTimeout(r, 600)); });
  await A.pg.waitForTimeout(400);
  chk(`a list missing two of the account's bots is merged, not sent (${server().length})`, server().length === 7 && (await A.pg.evaluate(async () => (await Store.get("chars")).length)) === 7);
  // deleting two bots on purpose still works
  await A.pg.evaluate(async () => { for (const id of ["bot6", "bot7"]) { S.chars = S.chars.filter(x => x.id !== id); Sync.forget(id); } await saveChars(); await Sync.push(); });
  await settle(A, B);
  chk(`deliberate deletions go through (${server().length}, phone ${await B.pg.evaluate(() => S.chars.length)})`, server().length === 5 && (await B.pg.evaluate(() => S.chars.length)) === 5);
  // Settings → Account says where this device keeps its data, and any failed save
  const line = await B.pg.evaluate(async () => { Store.lastFail = { k: "chars", size: 3.8 * 1048576, at: Date.now() }; const d = document.createElement("div"); document.body.append(d); drawAccount(d); await new Promise(r => setTimeout(r, 300)); const t = d.querySelector("#acStore")?.textContent || ""; d.remove(); return t; });
  chk(`Account shows the storage line (${line})`, /browser database/.test(line) && /Couldn't save your bots \(3\.8 MB\)/.test(line));
  chk("version 2.8.1 or later", await A.pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2008001; }));
  const errs = [...A.errs, ...B.errs]; chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await A.b.close(); await B.b.close();
})();
