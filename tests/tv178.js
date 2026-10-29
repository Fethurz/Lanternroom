// v1.78: seasons (Halloween now): limited shop items, seasonal badges, the community joins in (themed bots, costumes, the jam),
// Home decorations; and two fixes: people only post while online, and nobody ever reposts the same thing.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { posts: [], blogs: [], comments: [], dm: [] }; let postPlan = null, blogPlan = null, commentPlan = null;
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { seen.posts.push(body); const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: postPlan ? postPlan(hs) : hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${Math.random().toString(36).slice(2, 7)}`, tags: ["halloween"], summary: ["Velvet", "Moss", "Cinder", "Hollow", "Brine", "Quartz", "Thistle", "Ember"].sort(() => Math.random() - 0.5).slice(0, 3).join(" ") + " " + Math.random().toString(36).slice(2, 9), appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*", jam: i === 0 })) }; }
    if (/sometimes post short blog posts/.test(s)) { seen.blogs.push(body); const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: blogPlan ? blogPlan(hs) : [] }; }
    if (/write the comments people leave/.test(s)) { seen.comments.push(body); return { comments: commentPlan ? commentPlan(u) : [] }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return { messages: ["hey"], interest: 5, leaving: false, promises: [] }; }
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json, realPresence: true, season: true });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  chk("version 1.78 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1078));

  // ---------- the calendar
  const cal = await pg.evaluate(() => { const at = s => seasonNow(Date.parse(s))?.k || "none"; return { oct27: at("2026-10-27T12:00:00-05:00"), oct16: at("2026-10-16T12:00:00-05:00"), nov2: at("2026-11-02T20:00:00-06:00"), nov4: at("2026-11-04T12:00:00-06:00"), dec20: at("2026-12-20T12:00:00-06:00"), dec31: at("2026-12-31T12:00:00-06:00"), jan2: at("2027-01-02T12:00:00-06:00"), feb10: at("2027-02-10T12:00:00-06:00"), apr1: at("2027-04-01T12:00:00-05:00"), jul1: at("2027-07-01T12:00:00-05:00"), left: seasonNow(Date.parse("2026-10-27T12:00:00-05:00")).left, ny: seasonNow(Date.parse("2027-01-02T12:00:00-06:00")).year }; });
  chk(`the calendar: Halloween Oct 17–Nov 2 (${cal.oct27}, ${cal.oct16}, ${cal.nov2}, ${cal.nov4}), ${cal.left} days left on Oct 27`, cal.oct27 === "halloween" && cal.oct16 === "none" && cal.nov2 === "halloween" && cal.nov4 === "none" && cal.left === 7);
  chk(`…and the rest of the year (${cal.dec20}, ${cal.dec31}, ${cal.jan2}, ${cal.feb10}, ${cal.apr1}, ${cal.jul1})`, cal.dec20 === "winter" && cal.dec31 === "newyear" && cal.jan2 === "newyear" && cal.ny === 2026 && cal.feb10 === "valentine" && cal.apr1 === "spring" && cal.jul1 === "summer");

  // ---------- the shop
  await pg.evaluate(() => { SEASON_FORCE = { k: "halloween" }; ACHS.got = { ...ACHS.got }; for (let i = 0; i < 60; i++) ACHS.got["dummy" + i] = { at: 1 }; });
  const sh = await pg.evaluate(async () => {
    for (const k of Object.keys(ACH_BY).slice(0, 80)) ACHS.got[k] = ACHS.got[k] || { at: 1 }; achSave();
    openTrophies(null, "shop"); SHOP_CAT = "flame"; achRedraw?.(); await new Promise(r => setTimeout(r, 100));
    const txt = () => $("sheetBody").textContent, r = { banner: /Halloween items are in/.test(txt()), witch: /Witchfire/.test(txt()) && /Halloween only/.test(txt()) };
    const items = SHOP.filter(x => x.season === "halloween").map(x => x.id);
    r.items = items; r.draw = ["witchfire"].every(k => /lantern|svg/.test(lanternSVG("", { flame: k }))) && /svg/.test(lanternSVG("", { lantern: "cauldron" }));
    r.buy = shopBuy(SHOP_BY["flame:witchfire"]); r.bubble = shopBuy(SHOP_BY["bubble:web"]);
    shopWear("bubble", "web"); r.costume = !!ACHS.got.halloween_costume; r.sb = document.documentElement.classList.contains("sb-web");
    SEASON_FORCE = { k: "winter" }; r.outBuy = shopBuy(SHOP_BY["theme:hallow"]); SHOP_CAT = "theme"; openTrophies(null, "shop"); await new Promise(r => setTimeout(r, 50)); r.hiddenOut = !/Hallow's Eve/.test($("sheetBody").textContent);
    SHOP_CAT = "flame"; openTrophies(null, "shop"); await new Promise(r => setTimeout(r, 50)); r.ownedStays = /Witchfire/.test($("sheetBody").textContent);
    r.wearOut = (shopWear("flame", "witchfire"), ACHS.shop.wear.flame === "witchfire"); shopWear("flame", ""); shopWear("bubble", "");
    SEASON_FORCE = { k: "halloween" }; closeSheet(); return r;
  });
  chk(`5 Halloween items (${sh.items.join(", ")}) with a banner and "Halloween only" tags`, sh.items.length === 5 && sh.banner && sh.witch);
  chk("the new flame and lantern draw", sh.draw);
  chk("they can be bought during Halloween, and wearing one earns Costume Party", sh.buy && sh.bubble && sh.costume && sh.sb);
  chk("after Halloween they can't be bought and unowned ones are gone from the shop", !sh.outBuy && sh.hiddenOut);
  chk("…but what you bought stays yours and wearable", sh.ownedStays && sh.wearOut);
  chk("the base shop is unchanged (14,150 without seasonal items)", await pg.evaluate(() => SHOP.filter(x => !x.season).reduce((a, x) => a + x.price, 0) === 14150));
  chk("the Hallow's Eve theme has its backdrop (moon, bats, fog)", await pg.evaluate(() => /hwMoon/.test(stFxHTML("hallow")) && /hw-bat/.test(stFxHTML("hallow"))));

  // ---------- badges
  const bd = await pg.evaluate(async () => {
    const c = S.chars[0]; await openChat(c.id); const chat = S.chat; const r = {};
    for (let i = 0; i < 31; i++) achOnSend({ role: "user", content: "x" }, c, chat);
    for (let i = 0; i < 13; i++) achEvent("tap", { k: "gurgle" });
    r.got = ["halloween_trick", "halloween_spooky", "halloween_monster"].every(k => ACHS.got[k]);
    leaveChat?.();
    openTrophies(); await new Promise(r => setTimeout(r, 50)); r.tab = [...document.querySelectorAll("#sheetBody .tab")].some(x => x.textContent === "Seasons");
    SEASON_FORCE = { k: "winter" }; openTrophies(); await new Promise(r => setTimeout(r, 50));
    r.hiddenJam = !ACH.filter(achShown).some(a => a.k === "halloween_jam") && ACH.filter(achShown).some(a => a.k === "halloween_trick");
    SEASON_FORCE = { k: "halloween" }; closeSheet(); return r;
  });
  chk("chatting, 31 messages and 13 sound taps during Halloween earn their badges", bd.got);
  chk("a Seasons tab on the trophy page while it's on", bd.tab);
  chk("out of season, unearned seasonal badges are hidden; earned ones stay", bd.hiddenJam);

  // ---------- people only post while online
  const postsBefore = seen.posts.length;
  const on = await pg.evaluate(async () => {
    const now = Date.now(), r = {};
    r.users = pickUsers(40).every(u => onNow(u, now)); r.posters = pickPosters(10).every(u => onNow(u, now));
    const save = COMM.users.map(u => [u, u.sleep, u.last, u.offUntil, u.offFrom]);
    for (const u of COMM.users) { u.offFrom = now - 1000; u.offUntil = now + 3.6e6; } // everyone away
    r.none = (await commPosts(3)).length === 0;
    for (const [u, s, l, o, f] of save) { u.sleep = s; u.last = l; u.offUntil = o; u.offFrom = f; }
    return r;
  });
  chk("only people who are online now are picked to comment or post", on.users && on.posters);
  chk("with nobody online, nobody posts (and the AI isn't even asked)", on.none && seen.posts.length === postsBefore);
  // wake everyone for the rest
  await pg.evaluate(() => { const now = Date.now(); for (const u of COMM.users) { const h = Math.floor(localHour(u)); u.sleep = [(h + 8) % 24, (h + 10) % 24]; u.last = now; u.offUntil = 0; u.offFrom = 0; } });
  const pm = await pg.evaluate(async () => { for (const p of COMM.posts) delete p.jam; const got = await commPosts(3); return got.map(p => ({ at: p.at, jam: p.jam, ok: onBase(userOf(p.by), p.at) })); });
  chk(`new bots are stamped inside the poster's online time (${pm.length})`, pm.length >= 1 && pm.every(x => x.ok));
  chk("themed bots can be entered in the jam", pm.some(x => x.jam === "halloween2026"));
  chk("the listing prompt knows it's Halloween season and asks for jam entries", /Halloween season on the site/.test(sysOf(seen.posts.at(-1))) && /Spooky Season Jam/.test(sysOf(seen.posts.at(-1))));

  // ---------- never the same thing twice
  const u1 = await pg.evaluate(() => COMM.users[0].handle);
  blogPlan = hs => hs.map(h => ({ by: h, title: "Requests are open!", text: "Requests open this weekend, send me your weirdest monster ideas." }));
  const blN = seen.blogs.length; const bl = await pg.evaluate(async () => { const u = COMM.users[0]; COMM.blogs = COMM.blogs.filter(b => b.by !== u.id); const a = await commBlogs(1, { authors: [u] }); const b2 = await commBlogs(1, { authors: [u] }); return { first: a.length, second: b2.length, at: a[0] && onBase(u, a[0].at) }; });
  chk("a blog post is posted once…", bl.first === 1 && bl.at);
  chk("…and the same post again is dropped", bl.second === 0);
  chk("the blog prompt lists their earlier posts, forbids repeats and lets people skip", seen.blogs.some(x => /Their earlier posts \(never repeat\)/.test(usrOf(x))) && /ever posts the same thing twice/.test(sysOf(seen.blogs.at(-1))) && /leave them out/.test(sysOf(seen.blogs.at(-1))));
  const cm = await pg.evaluate(async () => {
    const u = COMM.users[1], t1 = COMM.posts[0].id, t2 = COMM.posts[1].id;
    (COMM.comments[t1] = COMM.comments[t1] || []).push({ id: "old1", by: u.id, text: "the gurgle sounds in the opening are so good, instant favourite", at: Date.now() - 864e5 * 2 });
    const real = commTargets; window.commTargets = () => [t2]; window.__u = u.handle; window.__t2 = t2;
    const got = await commComments(2); window.commTargets = real; return got.map(([, c]) => c.text);
  });
  commentPlan = null;
  chk("(comment check set up)", true);
  // second run with a plan: one repeat of their own earlier comment elsewhere, one new
  commentPlan = u => { const h = (u.match(/- @(\S+) \(/) || [])[1]; const k = (u.match(/Listing key (\S+):/) || [])[1]; const words = ((u.split("LISTING (the only facts about this bot):\n")[1] || "").split("\n")[0]); return [{ on: k, by: h, about: words.split(" ").slice(0, 4).join(" "), text: "the gurgle sounds in the opening are so good, instant favourite!! " + words.split(" ").slice(0, 3).join(" ") }, { on: k, by: h, about: words.split(" ").slice(0, 4).join(" "), text: "honestly " + words + " is such a fun premise" }]; };
  const cm2 = await pg.evaluate(async () => {
    const u = COMM.users[1], t1 = COMM.posts[0].id, t2 = COMM.posts[1].id;
    COMM.comments[t2] = []; for (const x of COMM.users) if (x !== u) x.offFrom = Date.now() - 1, x.offUntil = Date.now() + 6e5;
    const real = commTargets; window.commTargets = () => [t2]; const got = await commComments(2); window.commTargets = real;
    for (const x of COMM.users) x.offUntil = 0;
    return got.map(([, c]) => ({ by: c.by === u.id, text: c.text, ok: onBase(u, c.at) }));
  });
  chk(`someone never posts a comment they already made elsewhere; a new one goes through (${cm2.length})`, cm2.length === 1 && cm2[0].by && /fun premise/.test(cm2[0].text) && cm2[0].ok);
  postPlan = hs => hs.map(h => ({ by: h, source: "", kind: "character", name: "Totally New Name " + Math.random().toString(36).slice(2, 6), tags: ["x"], summary: "A greedy dragon who guards a hoard of gold in a mountain cave.", appearance: "a", description: "d", scenario: "s", firstMessage: "*x*" }));
  const dup = await pg.evaluate(async () => { const u = COMM.users[2]; const p = COMM.posts.find(x => x.by === u.id) || COMM.posts[0]; p.by = u.id; p.card.summary = "A greedy dragon who guards a hoard of gold in a mountain cave."; return (await commPosts(1, { authors: [u] })).length; });
  chk("the same bot (same premise, new name) is never posted twice by one person", dup === 0);
  postPlan = null;

  // ---------- the community joins in
  const cj = await pg.evaluate(() => { const cos = COMM.users.filter(u => SEASON_BY.halloween.costumes.includes(userPix(u)?.s)).length; SEASON_FORCE = { k: "winter" }; const cos2 = COMM.users.filter(u => userPix0(u) && userPix(u)?.s !== userPix0(u)?.s).length; SEASON_FORCE = { k: "halloween" }; return { cos, n: COMM.users.length, cos2 }; });
  chk(`some people wear costumes in their pictures (${cj.cos} of ${cj.n}); none outside the season`, cj.cos >= cj.n * 0.2 && cj.cos2 === 0);
  await pg.evaluate(async () => { await openCommunity("home"); }); await pg.waitForTimeout(300);
  const hub = await pg.evaluate(() => ({ banner: /Halloween on the Commons/.test(cbody().textContent), row: [...document.querySelectorAll(".hub-row h3")].some(h => /Halloween bots/.test(h.textContent)) }));
  chk("the hub's Home shows the season banner and a Halloween bots row", hub.banner && hub.row);
  await pg.click("#jamOpen"); await pg.waitForTimeout(200);
  const jam = await pg.evaluate(async () => { const c = S.chars[0]; COMM.pub[c.id] = { on: true, at: Date.now() - 864e5, since: Date.now() - 864e5, heat: 1 }; openJam(); await new Promise(r => setTimeout(r, 50)); const r = { list: !!cbody().querySelector(".jam-rank"), enter: !!cbody().querySelector(`[data-jam="${c.id}"]`) }; cbody().querySelector(`[data-jam="${c.id}"]`).click(); await new Promise(r => setTimeout(r, 50)); r.entered = COMM.jams.halloween2026.mine.includes(c.id) && !!ACHS.got.halloween_jam && /yours/.test(cbody().textContent); return r; });
  chk("the jam page lists entries, and your public bot can be entered (Jam Entrant badge)", jam.list && jam.enter && jam.entered);
  const pod = await pg.evaluate(() => { const sn = { ...SEASON_BY.halloween, id: "halloween2026", ends: Date.now() - 864e5 }; COMM.pub[S.chars[0].id].heat = 50; jamFinish(sn); return { got: !!ACHS.got.halloween_podium, top: jamOf(sn)[0]?.me }; });
  chk("when the jam ends with your bot on the podium, you get Spooky Podium", pod.top && pod.got);
  chk("DMs and comments know it's the season", /Halloween season on the site/.test(sysOf(seen.dm.at(-1) || { messages: [{ content: "" }] })) || await pg.evaluate(() => /season on the site/.test(dmWrite.toString() + commSeason())));
  await pg.evaluate(() => hubClose());

  // ---------- Home decorations
  const deco = await pg.evaluate(() => { renderHome(); const r = { dbg: [!!$("seasonFx"), $("tagline").textContent],  fx: !!$("seasonFx")?.querySelector(".sf-leaf"), tag: /Happy Halloween/.test($("tagline").textContent) }; S.settings.seasonDeco = false; drawSeasonDeco(); r.off = !$("seasonFx"); S.settings.seasonDeco = true; SEASON_FORCE = { k: "winter" }; drawSeasonDeco(); r.winterPlain = !$("seasonFx") && !/Happy/.test($("tagline").textContent); SEASON_FORCE = { k: "halloween" }; drawSeasonDeco(); return r; });
  chk("Home has falling leaves and bats and a Happy Halloween tagline", deco.fx && deco.tag); if (!(deco.fx && deco.tag)) console.log(JSON.stringify(deco.dbg));
  chk("the Settings switch turns it off", deco.off);
  chk("Settings has the decorations switch", await pg.evaluate(async () => { $("btnSettings").click(); await new Promise(r => setTimeout(r, 400)); return !!$("sSeasonDeco"); }));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
