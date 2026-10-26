// v1.61: one daily bot per day for the whole account, the day turning at 12:00 noon Chicago time.
// Two "devices" share a fake account server (like tsync158); each one's AI names its bot after itself.
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
      for (const x of JSON.parse(req.postData() || "[]")) { const cur = rows.get(x.key); if (cur && (+x.base_at || 0) < cur.client_at) continue; rows.set(x.key, { key: x.key, value: x.value, deleted: x.deleted, client_at: x.client_at, updated_at: stamp() }); out.push({ key: x.key, client_at: x.client_at }); }
      return r.fulfill({ status: 201, body: JSON.stringify(out), headers: { "content-type": "application/json" } });
    }
    let list = [...rows.values()].sort((a, b) => a.updated_at < b.updated_at ? -1 : 1);
    const gt = u.searchParams.get("updated_at"); if (gt) list = list.filter(x => x.updated_at > gt.slice(3));
    const kin = u.searchParams.get("key"); if (kin) { const ks = JSON.parse("[" + kin.slice(4, -1) + "]"); list = list.filter(x => ks.includes(x.key)); }
    return r.fulfill({ status: 200, body: JSON.stringify(list), headers: { "content-type": "application/json" } });
  };
  const made = { A: 0, B: 0 };
  const card = who => body => { const s = String(body.messages?.[0]?.content || "") + String(body.messages?.[1]?.content || ""); if (/Today's bot/.test(s)) { made[who]++; return { name: `From ${who} ${made[who]}`, summary: "s", tags: ["vore"], appearance: "a", description: "d", scenario: "sc", firstMessages: ["*Hi.*"], startPlace: "p", instructions: "", lore: [], badges: [] }; } return { summary: "x", facts: [] }; };
  const dev = async who => { const d = await open({ width: W, json: card(who) }); await d.pg.route("https://kttzglvsaxvzcbzfwfju.supabase.co/**", fake); return d; };
  const A = await dev("A"), B = await dev("B");
  const login = pg => pg.evaluate(() => { Sync.st = { refresh: "r", access: "a", exp: Date.now() + 1e9, uid: "u1", email: "x", ver: {}, dirty: [], pulled: "1970-01-01T00:00:00Z" }; Sync.save(); });
  await login(A.pg); await login(B.pg);
  const round = async () => { for (const d of [A, B, A, B]) { await d.pg.evaluate(async () => { await Sync.push(); await Sync.pull(); await Sync.push(); }); await d.pg.waitForTimeout(200); } };
  const reset = async () => { rows.clear(); for (const d of [A, B]) await d.pg.evaluate(async () => { Sync.applying = true; await Store.del("daily"); Sync.applying = false; DAILY.cur = null; DAILY.busy = false; Sync.st.ver = {}; Sync.st.dirty = []; Sync.st.pulled = "1970-01-01T00:00:00Z"; }); made.A = made.B = 0; };
  const cur = pg => pg.evaluate(async () => ({ name: (await Store.get("daily"))?.card?.name || "", status: (await Store.get("daily"))?.status || "", day: (await Store.get("daily"))?.day || "" }));

  // ---- the noon boundary, in Chicago time (CDT now, CST after Nov 1)
  const days = await A.pg.evaluate(() => [Date.UTC(2026, 9, 26, 16, 59), Date.UTC(2026, 9, 26, 17, 1), Date.UTC(2026, 10, 2, 17, 59), Date.UTC(2026, 10, 2, 18, 1)].map(t => dailyDay(t)));
  chk("day turns at 12:00 noon CDT: " + days.slice(0, 2).join(" → "), days[0] === "2026-10-25" && days[1] === "2026-10-26");
  chk("…and at 12:00 noon CST after the clocks change: " + days.slice(2).join(" → "), days[2] === "2026-11-01" && days[3] === "2026-11-02");
  const nx = await A.pg.evaluate(() => { const t = Date.UTC(2026, 9, 26, 15, 0), n = dailyNextAt(t); return { mins: Math.round((n - t) / 60000) }; });
  chk("next refresh is at noon (" + nx.mins + " min after 10:00 CDT)", Math.abs(nx.mins - 120) <= 1);

  // ---- A makes today's; B opens later and shows the same one instead of making its own
  await A.pg.evaluate(() => dailyMake()); await round();
  await B.pg.evaluate(() => { DAILY_CHECK = 0; return dailyMake(); }); await round();
  const a1 = await cur(A.pg), b1 = await cur(B.pg);
  chk(`another device opening later gets the same bot (A: ${a1.name}, B: ${b1.name})`, a1.name === "From A 1" && b1.name === "From A 1" && made.B === 0);
  // reopening, coming back to the app, the 10-minute check: still that one
  for (let i = 0; i < 3; i++) { await B.pg.evaluate(() => { DAILY_CHECK = 0; dailyTick(); }); await A.pg.evaluate(() => { DAILY_CHECK = 0; dailyTick(); }); await B.pg.waitForTimeout(600); await round(); }
  await B.pg.reload(); await B.pg.evaluate(() => BOOTED); await B.pg.waitForTimeout(4000); await round();
  chk(`returning to the app or restarting doesn't make another (made: A ${made.A}, B ${made.B})`, made.A === 1 && made.B === 0 && (await cur(B.pg)).name === "From A 1" && (await cur(A.pg)).name === "From A 1");

  // ---- while A is still writing it, B waits instead of starting a second
  await reset();
  await A.pg.evaluate(async () => { Sync.applying = false; const d = { day: dailyDay(), status: "making", kind: "character", tags: [], at: Date.now() }; await Store.set("daily", d); await Sync.push(); });
  await B.pg.evaluate(() => dailyMake()); await round();
  chk("a device sees another is making today's and waits", made.B === 0 && (await cur(B.pg)).status === "making");
  // a claim left behind by a device that closed mid-way is taken over after 10 minutes
  await A.pg.evaluate(async () => { const d = await Store.get("daily"); d.at = Date.now() - 11 * 60e3; await Store.set("daily", d); await Sync.push(); }); await round();
  await B.pg.evaluate(() => dailyMake()); await round();
  chk("an old abandoned claim is taken over", made.B === 1 && (await cur(B.pg)).name === "From B 1" && (await cur(A.pg)).name === "From B 1");

  // ---- both make one at the very same moment: they settle on the same bot
  await reset();
  await Promise.all([A.pg.evaluate(() => dailyMake()), B.pg.evaluate(() => dailyMake())]);
  await round(); await round();
  const a3 = await cur(A.pg), b3 = await cur(B.pg);
  chk(`a tie settles on one bot everywhere (A: ${a3.name}, B: ${b3.name})`, a3.name && a3.name === b3.name);
  chk("merge rule: same progress → the one made first", await A.pg.evaluate(() => dailyNewer({ day: "d", status: "new", at: 5, card: { name: "first" } }, { day: "d", status: "new", at: 9, card: { name: "second" } }).card.name === "first" && dailyNewer({ day: "d", status: "new", at: 9, card: { name: "late" } }, { day: "d", status: "new", at: 5, card: { name: "early" } }).card.name === "early"));

  // ---- a bot saved with the old midnight date (a day "ahead" of the noon day) still counts as today's
  await reset();
  await A.pg.evaluate(async () => { Sync.applying = true; const t = Date.now() + 36 * 3600e3, ahead = dailyDay(t); await Store.set("daily", { day: ahead, status: "new", kind: "character", tags: [], card: { name: "Old format", tags: [] }, at: Date.now() }); Sync.applying = false; await dailyMake(); renderHome(); });
  await A.pg.waitForTimeout(400);
  chk("updating doesn't throw away today's bot", made.A === 0 && (await cur(A.pg)).name === "Old format" && /Old format/.test(await A.pg.textContent("#daily")));
  // after Keep, the banner says when the next one comes
  await A.pg.evaluate(async () => { const d = await Store.get("daily"); d.status = "kept"; await Store.set("daily", d); await dailyLoad(); drawDaily(); });
  chk("after keeping, Home says when the next bot comes", /Next bot at/.test(await A.pg.textContent("#daily")));
  const errs = [...A.errs, ...B.errs]; chk("no page errors", errs.length === 0); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await A.b.close(); await B.b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
