// v1.73: a big site with a quiet crowd (member and online counts), 144 active people with more variety, 4x the pace.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i} ${Math.random().toString(36).slice(2, 6)}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const tick = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true); });
  await pg.evaluate(async () => { await commLoad(); }); await tick();
  chk("the first visit still starts with 36 people", await pg.evaluate(() => COMM.users.length === 36));
  for (let i = 0; i < 12; i++) await tick();
  const pp = await pg.evaluate(() => ({ n: COMM.users.length, styles: new Set(COMM.users.map(u => u.style)).size, places: new Set(COMM.users.map(u => u.place)).size, roles: new Set(COMM.users.map(u => u.role)).size, focus: new Set(COMM.users.map(u => u.focus)).size, handles: new Set(COMM.users.map(u => u.handle)).size }));
  chk(`then more each check until 300 (v1.77: 24 a check; ${pp.n})`, pp.n >= 300 && pp.n <= 302 && pp.handles === pp.n);
  chk(`…with much more variety (${pp.styles} typing styles, ${pp.places} places, ${pp.roles} roles, ${pp.focus} favourite things)`, pp.styles >= 34 && pp.places >= 50 && pp.roles >= 16 && pp.focus >= 28);
  await tick();
  chk("it stops at 300 (newcomers only trickle in after)", await pg.evaluate(() => COMM.users.length <= 302));
  const site = await pg.evaluate(() => { const now = Date.now(); return { born: COMM.born, m: commMembers(now), m30: commMembers(now + 30 * 864e5), on: commOnlineNow(now), on2: commOnlineNow(now), hrs: Array.from({ length: 24 }, (_, h) => commOnlineNow(now + h * 3.6e6)) }; });
  chk(`the site has thousands of members (${site.m}) and grows slowly (${site.m30} in a month)`, site.m >= 9000 && site.m < 120000 && site.m30 > site.m && site.m30 < site.m * 1.15);
  chk(`a few percent are online now (${site.on}), steady from look to look, busier at some hours (${Math.min(...site.hrs)}–${Math.max(...site.hrs)})`, site.on === site.on2 && site.on > site.m * 0.02 && site.on < site.m * 0.1 && Math.max(...site.hrs) > Math.min(...site.hrs) * 1.4);
  const old = await pg.evaluate(() => { const oldest = Math.min(...COMM.users.map(u => u.at)); return COMM.born < oldest; });
  chk("the site is older than its oldest member", old);
  chk("two devices keep the earliest site birthday", await pg.evaluate(() => commMerge({ born: 50 }, { born: 20 }).born === 20 && commMerge({}, { born: 7 }).born === 7));
  await pg.evaluate(() => openCommunity("home")); await pg.waitForTimeout(300);
  chk("Home shows the member and online counts", await pg.evaluate(() => /members · .* online now/.test(document.querySelector("#hubBody .hub-site")?.textContent || "")));
  chk("big like counts fit the site (no bot has more likes than members)", await pg.evaluate(() => COMM.posts.every(p => postLikes(p) < commMembers())));
  chk("the pace (v1.77): busy = 64 bots, 300 comments, 42 posts, 16 updates a day", await pg.evaluate(() => { const r = COMM_RATES.busy; return r.posts === 64 && r.comments === 300 && r.blogs === 42 && r.updates === 16 && COMM_RATES.quiet.posts === 16; }));
  await pg.evaluate(() => hubClose());
  await pg.evaluate(() => $("btnSettings").click()); await pg.waitForTimeout(400);
  chk("Settings describes the new pace", await pg.evaluate(() => /about 64 bots and 300 comments a day/.test($("sCommLvl")?.innerHTML || "")));
  await pg.evaluate(() => closeSheet());
  chk("up to 260 listings are kept", await pg.evaluate(() => { const keep = COMM.posts; COMM.posts = Array.from({ length: 300 }, (_, i) => ({ ...keep[0], id: "fake" + i, at: Date.now() - i * 6e4 })); commTrim(); const n = COMM.posts.length; COMM.posts = keep; return n === 260; }));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
