// v1.64: following (feed, dot, pop-ups), blog posts, bot updates + "Update my copy", profiles in each person's outfit.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0, nB = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore", "dragon"], voice: "v" }; }) }; }
    if (/customise how the app looks/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { people: hs.map((h, i) => i === 0 ? { handle: h, theme: "star", accent: "#ff6fae", flame: Object.keys({}).length ? "" : "nope", lantern: "", finish: "gold", status: "taking requests!! dm me" } : i === 1 ? { handle: h, theme: "pal:lantern", accent: "", flame: "", lantern: "", finish: "", status: "" } : { handle: h, theme: "pal:ember", accent: "#7fb2ff", flame: "", lantern: "", finish: "", status: `status of ${h}` }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, kind: "character", name: `Bot of ${h} ${Math.random().toString(36).slice(2, 5)}`, tags: ["vore"], summary: "s", appearance: "a", description: "old description", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/short blog posts or announcements/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, title: `WIP from ${h}`, text: `new bot coming soon!! (${++nB})` })) }; }
    if (/updating one of your bots/.test(s)) return { note: "v1.1: added a second opening, fixed her attitude", description: "new improved description", scenario: "", appearance: "", newOpening: "*A second opening.*", tags: ["slowburn"] };
    if (/^You are @(\w+)/.test(s)) return { text: "ty!! more soon" };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  await pg.evaluate(async () => { await commLoad(); await commTick(true); });
  // ---- outfits
  const fit = await pg.evaluate(() => { const us = COMM.users; return { all: us.every(u => u.fit && u.fit.theme), first: us[0].fit, status: us[0].status, keys: us.every(u => FIT_THEMES().includes(u.fit.theme) && (!u.fit.flame || LN_FLAME_BY[u.fit.flame]) && (!u.fit.finish || FIN_BY[u.fit.finish])) }; });
  chk("everyone is dressed with real shop items (bad keys dropped)", fit.all && fit.keys && fit.first.theme === "star" && fit.first.finish === "gold" && fit.first.flame === "");
  chk("…and has a status line in their voice", fit.status === "taking requests!! dm me");
  chk("the outfit prompt offers the catalogue and allows plain defaults", calls.some(c => /customise how the app looks/.test(sysOf(c)) && /pal:lantern/.test(sysOf(c)) && /About a quarter keep everything default/.test(sysOf(c))));
  const u0 = await pg.evaluate(() => COMM.users[0].id), u2 = await pg.evaluate(() => COMM.users[2].id);
  await pg.evaluate(id => { const u = userOf(id); u.sleep = [(Math.floor(localHour(u)) + 8) % 24, (Math.floor(localHour(u)) + 9) % 24]; }, u0);
  // make sure u0 has bots and a blog post
  await pg.evaluate(id => { const u = userOf(id); const p = COMM.posts[0]; p.by = id; p.at = Date.now() - 2 * 864e5; const q = COMM.posts[1]; q.by = id; q.at = Date.now() - 864e5; commSave(); }, u0);
  await pg.evaluate(id => openCommUser(id), u0); await wait(400);
  const pf = await pg.evaluate(() => { const x = document.querySelector(".cm-pfx"); const cs = getComputedStyle(x); return { star: x.classList.contains("st-star"), fx: !!x.querySelector(".sh-fx svg, .sh-fx circle, .sh-fx *"), bg: cs.backgroundColor, lantern: !!x.querySelector(".cm-lan .lantern"), name: getComputedStyle(x.querySelector(".cm-pfn")).backgroundClip || getComputedStyle(x.querySelector(".cm-pfn")).webkitBackgroundClip, status: x.querySelector(".cm-stline")?.textContent, pin: /Pinned/.test(x.textContent) && x.querySelectorAll(".cm-card").length >= 2, follow: !!$("cmFollow"), acc: x.style.getPropertyValue("--accent") }; });
  chk("their profile is in their theme, with its backdrop", pf.star && pf.fx && pf.bg !== "rgba(0, 0, 0, 0)");
  chk("…their lantern as an emblem, their name in their finish, their accent", pf.lantern && pf.name === "text" && pf.acc === "#ff6fae");
  chk("…a status line, a pinned bot and a Follow button", /taking requests/.test(pf.status || "") && pf.pin && pf.follow);
  await pg.evaluate(id => openCommUser(id), await pg.evaluate(() => COMM.users[1].id)); await wait(300);
  chk("someone on defaults gets the plain look", await pg.evaluate(() => { const x = document.querySelector(".cm-pfx"); return ![...x.classList].some(c => /^st-/.test(c)) && !x.querySelector(".sh-fx") && !document.querySelector(".cm-stline"); }));
  // ---- following
  await pg.evaluate(() => openCommunity("feed")); await wait(300);
  chk("Following starts empty with a hint", /Follow people from their profiles/.test(await pg.evaluate(() => cbody().textContent)));
  const fc0 = await pg.evaluate(id => followerCount(userOf(id)), u0);
  await pg.evaluate(() => { Math._r = Math.random; Math.random = () => 0.1; }); // they'll follow back
  await pg.evaluate(id => openCommUser(id), u0); await wait(300); await pg.click("#cmFollow"); await wait(200);
  await pg.evaluate(id => { Math.random = Math._r; COMM.follow[id].at = Date.now() - 60e3; commSave(); }, u0);
  chk("Follow: the button turns to Following and their count goes up", await pg.evaluate(([id, n]) => follows(id) && /Following/.test($("cmFollow").textContent) && followerCount(userOf(id)) === n + 1, [u0, fc0]));
  chk("…and they'll follow you back a little later", await pg.evaluate(id => COMM.fans[id] > Date.now() && !followsMe(id), u0));
  // things they do after you followed them
  await pg.evaluate(async id => { COMM.seen = { at: Date.now() - 2000 }; const p = COMM.posts[2]; p.by = id; p.at = Date.now() - 1000; delete p.popped; const got = await commBlogs(3); const bl = got[0]; bl.by = id; bl.at = Date.now() - 500; commSave(); await commTick(true); }, u0);
  await wait(300);
  const toast1 = await pg.evaluate(() => [...document.querySelectorAll(".dm-toast")].map(x => x.textContent).join(" | "));
  chk("a pop-up when someone you follow posts a new bot (" + toast1.slice(0, 60) + ")", /posted a new bot/.test(toast1));
  // a bot update on a listing you've copied
  const pid = await pg.evaluate(async id => { const p = COMM.posts.find(x => x.by === id && Date.now() - x.at > 864e5 * 1.5); COMM.posts.forEach(x => { if (x !== p) x.at = Math.max(x.at, Date.now() - 3.6e6); }); const w = await commAdd(p); return p.id; }, u0);
  await wait(500);
  const copy = await pg.evaluate(id => { const c = S.chars.find(x => x.fromComm?.post === id); return { id: c.id, desc: c.description, greets: greetingsOf(c).length }; }, pid);
  await pg.evaluate(async cid => { const c = byId(cid); S.charId = cid; S.chat = newChat(c, S.personaId); S.chat.messages.push({ id: "x", role: "user", content: "hello" }); await saveChat(); }, copy.id);
  const msgs0 = await pg.evaluate(() => S.chat.messages.length);
  const got = await pg.evaluate(async () => { const r = (await commUpdates(1)).map(([p, up]) => ({ p: p.id, ver: up.ver, desc: p.card.description, opens: p.card.firstMessages.length, tags: p.tags })); commSave(); return r; });
  chk("a creator updates a listing: new text, an extra opening, tags, v1.1", got.length === 1 && got[0].p === pid && got[0].ver === "1.1" && got[0].desc === "new improved description" && got[0].opens === 2 && got[0].tags.includes("slowburn"));
  chk("the update prompt sees the bot and its comments, and writes a changelog", calls.some(c => /updating one of your bots/.test(sysOf(c)) && /old description/.test(userOf_(c))));
  chk("your copy is left alone until you choose", await pg.evaluate(cid => byId(cid).description === "old description" && copyUpdates(byId(cid)).length === 1, copy.id));
  // the feed
  await pg.evaluate(() => { hubClose(); closeSheet(); commDot(); });
  chk("the Community dot counts the new things", await pg.evaluate(() => +(document.documentElement.classList.contains("wide") ? $("railCommDot") : $("commDot")).textContent >= 3));
  await pg.evaluate(() => openCommunity("feed")); await wait(300);
  const feed = await pg.evaluate(() => cbody().textContent);
  chk("Following lists their new bot, blog post and update, plus your copy's update", /posted a new bot/.test(feed) && /WIP from/.test(feed) && /updated .* to v1\.1/.test(feed) && /can be updated to v1\.1/.test(feed));
  await pg.click("[data-upd]"); await wait(400);
  const after = await pg.evaluate(cid => { const c = byId(cid); return { desc: c.description, greets: greetingsOf(c).length, tags: c.tags, left: copyUpdates(c).length, msgs: S.chat.messages.length }; }, copy.id);
  chk("Update my copy applies the changes and keeps your chat", after.desc === "new improved description" && after.greets === copy.greets + 1 && after.tags.includes("slowburn") && after.left === 0 && after.msgs === msgs0);
  // the listing shows its version and changelog
  await pg.evaluate(id => openPost(id), pid); await wait(300);
  chk("the listing shows Updated · v1.1 with the changelog", /Updated .* · v1\.1/.test(await pg.evaluate(() => cbody().textContent)));
  // blog posts: open, like, comment, the author answers
  const bid = await pg.evaluate(id => COMM.blogs.find(b => b.by === id).id, u0);
  await pg.evaluate(id => openBlog(id), bid); await wait(300);
  const bl0 = await pg.evaluate(id => blogLikes(COMM.blogs.find(b => b.id === id)), bid);
  await pg.click("#cmLike"); await wait(150);
  chk("a blog post opens and can be liked", await pg.evaluate(([id, n]) => blogLikes(COMM.blogs.find(b => b.id === id)) === n + 1 && /new bot coming soon/.test(cbody().textContent), [bid, bl0]));
  // the author usually answers (now and then nobody does, like a real site); here they do
  await pg.fill("#cmText", "can't wait!!"); await pg.evaluate(() => { Math._r = Math.random; Math.random = () => 0.1; }); await pg.click("#cmSend"); await wait(200); await pg.evaluate(() => { Math.random = Math._r; });
  chk("commenting on it asks the author to answer", await pg.evaluate(([id, au]) => COMM.pending.some(p => p.target === "blog:" + id && p.by === au), [bid, u0]));
  await pg.evaluate(() => { COMM.pending.forEach(p => { p.due = Date.now() - 1; }); commSave(); }); await pg.evaluate(() => commTick(true)); await wait(300);
  chk("…and they do", await pg.evaluate(id => (COMM.comments["blog:" + id] || []).some(x => x.toMe && x.text === "ty!! more soon"), bid));
  // they followed back
  await pg.evaluate(id => { COMM.fans[id] = Date.now() - 1000; commSave(); }, u0);
  await pg.evaluate(id => openCommUser(id), u0); await wait(300);
  chk("'Follows you' on their profile once they follow back", /Follows you/.test(await pg.evaluate(() => cbody().textContent)));
  await pg.evaluate(() => openCommunity("feed")); await wait(300);
  chk("…and 'followed you' in the feed", /followed you/.test(await pg.evaluate(() => cbody().textContent)));
  // unfollow: their new things stop showing
  await pg.evaluate(id => commFollow(id, false), u0);
  chk("unfollowing takes them out of the feed", await pg.evaluate(() => !feedItems().some(x => x.kind === "post" || x.kind === "blog" || x.kind === "update")));
  chk("follows and blog posts merge across devices", await pg.evaluate(() => { const a = { ...commBlank(), follow: { x: { v: true, at: 5 } }, blogs: [{ id: "b1", at: 1 }] }, b2 = { ...commBlank(), follow: { x: { v: false, at: 9 } }, blogs: [{ id: "b2", at: 2 }], fans: { y: 3 } }; const m = commMerge(a, b2); return m.follow.x.v === false && m.blogs.length === 2 && m.fans.y === 3; }));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
