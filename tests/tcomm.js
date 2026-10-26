// v1.62: the made-up community: users, their bots, likes, comments, replies that answer back, the owner's public bots.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nUsers = 0;
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || +(u.match(/Invent (\d+)/) || [0, 3])[1]; return { users: Array.from({ length: n }, () => { const i = ++nUsers; return { name: `User ${i}`, handle: `user_${i}`, bio: `Bio of user ${i}.`, taste: i % 2 ? ["vore", "dragon"] : ["romance", "fantasy"], voice: "lowercase, lots of emoji" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, kind: i === 1 ? "world" : "character", name: `Bot ${h}-${Math.random().toString(36).slice(2, 6)}`, tags: ["vore", "dragon"], summary: `A bot by ${h}.`, appearance: "Big and scaly.", description: "Grumpy but kind.", scenario: "A cave. {{user}} arrives.", firstMessage: "*The dragon yawns.* \"Hello, {{user}}.\"", cast: i === 1 ? [{ name: "Cave", type: "location", details: "Dark." }] : undefined })) }; }
    if (/write the comments people leave/.test(s)) { const ks = [...u.matchAll(/Listing key (\S+):/g)].map(m => m[1]), hs = [...u.matchAll(/- @(\w+):/g)].map(m => m[1]); const n = +(u.match(/Write (\d+) new comments/) || [0, 2])[1]; return { comments: Array.from({ length: n }, (_, i) => ({ on: ks[i % ks.length], by: hs[i % hs.length], text: `comment ${i} on ${ks[i % ks.length]} 🔥`, replyTo: "" })) }; }
    if (/^You are @(\w+)/.test(s)) { const h = s.match(/^You are @(\w+)/)[1]; return { text: `thanks!! from ${h}` }; }
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const until = (fn, arg, t = 15000) => pg.waitForFunction(fn, arg, { timeout: t }).catch(() => {});
  const openComm = () => pg.evaluate(() => (document.documentElement.classList.contains("wide") ? $("railComm") : $("btnComm")).click());
  const commCalls = () => calls.filter(c => /Lantern Commons/.test(sysOf(c)));

  chk("Home (or the PC rail) has a Community button", await pg.evaluate(() => !$("btnComm").hidden && !$("railComm").hidden));
  // first visit: people and a page of bots appear
  await openComm();
  await until(() => COMM && COMM.posts.length >= 6 && document.querySelectorAll(".cm-card").length >= 6, null, 30000); await wait(300);
  const s1 = await pg.evaluate(() => ({ users: COMM.users.length, posts: COMM.posts.length, cards: document.querySelectorAll(".cm-card").length, label: /made-up|made up|written by the AI|invented/i.test($("sheetBody").textContent) }));
  chk(`first visit makes 36 regulars and a page of bots (${s1.users} users, ${s1.posts} bots)`, s1.users === 36 && s1.posts === 6 && s1.cards === 6);
  chk("nothing in the community says it's made up", !s1.label);
  chk("every community prompt keeps the adults line", commCalls().length >= 3 && commCalls().every(c => /fully grown, mature being/.test(sysOf(c))));
  chk("listings follow the owner's own tags", commCalls().some(c => /write new bot listings/.test(sysOf(c)) && /Popular tags on the site right now/.test(userOf_(c))));
  // counts are the same every time and grow with age
  const st = await pg.evaluate(() => { const a = commStats("x", 1, Date.now() - 36e5), a2 = commStats("x", 1, Date.now() - 36e5), old = commStats("x", 1, Date.now() - 864e5 * 3), hot = commStats("x", 3, Date.now() - 864e5 * 3); return { same: a.likes === a2.likes && a.chats === a2.chats, grows: old.likes > a.likes, hot: hot.likes > old.likes, fresh: commStats("x", 1, Date.now()).likes }; });
  chk("likes and chats grow with age and heat, the same on every device", st.same && st.grows && st.hot && st.fresh === 0);
  // Popular is sorted by likes, New by time
  await pg.evaluate(() => { COMM.posts.forEach((p, i) => { p.at = Date.now() - (i + 1) * 8 * 36e5; }); });
  await pg.click('.cm-tabs [data-t="popular"]'); await wait(200);
  chk("Popular puts the most liked first", await pg.evaluate(() => { const ls = [...document.querySelectorAll(".cm-card .cm-like")].map(x => +x.textContent.replace(/[^\d.k]/g, "").replace("k", "e3")); return ls.every((v, i) => !i || ls[i - 1] >= v); }));
  await pg.click('.cm-tabs [data-t="new"]'); await wait(200);
  chk("New puts the newest first", await pg.evaluate(() => { const ids = [...document.querySelectorAll(".cm-card")].map(x => x.dataset.post), at = ids.map(id => COMM.posts.find(p => p.id === id).at); return at.every((v, i) => !i || at[i - 1] >= v); }));
  // a like adds one
  const pid = await pg.evaluate(() => document.querySelector(".cm-card").dataset.post);
  const before = await pg.evaluate(id => postLikes(COMM.posts.find(p => p.id === id)), pid);
  await pg.click(`.cm-card [data-like="${pid}"]`); await wait(150);
  chk("a heart adds your like", await pg.evaluate(([id, b4]) => postLikes(COMM.posts.find(p => p.id === id)) === b4 + 1 && document.querySelector(`[data-like="${id}"]`).classList.contains("on"), [pid, before]));
  // the listing
  await pg.click(`.cm-card[data-post="${pid}"] .cm-sum`); await wait(300);
  chk("a listing opens with its poster, tags, counts and comments", await pg.evaluate(() => !!$("cmAdd") && !!$("cmChat") && /Comments ·/.test($("sheetBody").textContent) && !!document.querySelector(".cm-by-big")));
  // now and then nobody answers a comment, like on a real site; here the poster does
  await pg.fill("#cmText", "love this dragon!!"); await pg.evaluate(() => { Math._r = Math.random; Math.random = () => 0.1; }); await pg.click("#cmSend"); await wait(200); await pg.evaluate(() => { Math.random = Math._r; });
  const pend = await pg.evaluate(id => ({ mine: (COMM.comments[id] || []).filter(x => x.by === "me").length, pending: COMM.pending.filter(p => p.target === id), author: COMM.posts.find(p => p.id === id).by }), pid);
  chk("your comment is posted and someone will answer after a while (their speed; later if they're asleep)", pend.mine === 1 && pend.pending.length >= 1 && pend.pending.every(p => p.due - Date.now() > 30e3));
  chk("…shown as writing a reply", /writing a reply/.test(await pg.textContent("#sheetBody")));
  // time passes: the reply lands
  await pg.evaluate(() => { COMM.pending.forEach(p => { p.due = Date.now() - 1; }); return Store.set("comm", COMM); });
  await pg.evaluate(() => commTick(true)); await wait(300);
  const rep = await pg.evaluate(id => { const l = COMM.comments[id], mine = l.find(x => x.by === "me"); return { replies: l.filter(x => x.replyTo === mine.id).map(x => ({ by: userOf(x.by)?.handle, text: x.text, toMe: x.toMe })), pending: COMM.pending.length }; }, pid);
  chk(`the reply answers you in their own name (${rep.replies.map(r => r.by).join(",")})`, rep.replies.length >= 1 && rep.replies.every(r => r.toMe && /thanks!! from user_\d+/.test(r.text)) && rep.pending === 0);
  chk("the reply's prompt is written as that user, about your comment", calls.some(c => /^You are @user_\d+/.test(sysOf(c)) && /love this dragon/.test(userOf_(c))));
  await pg.evaluate(id => openPost(id), pid); await wait(300);
  chk("the reply sits indented under your comment", await pg.evaluate(() => { const cs = [...document.querySelectorAll(".cm-c")]; const me = cs.findIndex(x => x.classList.contains("me")); return me >= 0 && cs[me + 1] && getComputedStyle(cs[me + 1]).marginLeft !== getComputedStyle(cs[me]).marginLeft; }));
  // replying to someone's comment asks them to answer
  await pg.evaluate(() => document.querySelector(".cm-c:not(.me) [data-rp]").click()); await wait(100);
  const target = await pg.evaluate(() => [...document.querySelectorAll(".cm-c:not(.me) [data-rp]")][0].dataset.rp);
  await pg.fill("#cmText", "haha same"); await pg.click("#cmSend"); await wait(200);
  chk("a reply to someone asks that person to answer", await pg.evaluate(([id, t]) => { const mine = COMM.comments[id].filter(x => x.by === "me").at(-1), whom = COMM.comments[id].find(x => x.id === t).by; return mine.replyTo === t && COMM.pending.some(p => p.replyTo === mine.id && p.by === whom); }, [pid, target]));
  // add to my bots and chat
  await pg.click("#cmAdd"); await until(() => S.chars.some(c => c.fromComm)); await wait(400);
  const added = await pg.evaluate(id => { const c = S.chars.find(x => x.fromComm?.post === id); return c && { name: c.name, by: c.fromComm.by, open: greetingsOf(c).length, added: COMM.posts.find(p => p.id === id).added === c.id }; }, pid);
  chk("Add to my bots makes a copy credited to its poster", added && /^@user_/.test(added.by) && added.open === 1 && added.added);
  const chatsBefore = await pg.evaluate(id => postChats(COMM.posts.find(p => p.id === id)), pid);
  await pg.click("#cmChat"); await until(() => !$("chat").hidden); await wait(400);
  chk("Chat opens it and counts your chat", await pg.evaluate(([id, n]) => !$("chat").hidden && char()?.fromComm?.post === id && postChats(COMM.posts.find(p => p.id === id)) === n + 1, [pid, chatsBefore]));
  await pg.evaluate(() => leaveChat()); await wait(200);
  // the owner's bot goes public
  const wren = await pg.evaluate(() => S.chars.find(c => !c.fromComm).id);
  await pg.evaluate(id => openProfile(id), wren); await wait(300);
  chk("a bot's profile has the public switch", !!await pg.$("#pfPub"));
  await pg.check("#pfPub"); await wait(400);
  chk("making it public shows its likes, chats and comments", await pg.evaluate(id => !!pubOf(byId(id)) && !!$("pfCm"), wren));
  await pg.evaluate(async id => { COMM.pub[id].since = Date.now() - 2 * 864e5; await Store.set("comm", COMM); }, wren);
  chk("it gathers likes and chats over time", await pg.evaluate(id => pubStats(byId(id)).likes > 0 && pubStats(byId(id)).chats > 0, wren));
  // comments arrive on it, and the Home button shows a dot
  await pg.evaluate(async () => { COMM.seen = { at: Date.now() - 1000 }; COMM.tickC = Date.now() - 864e5; for (let i = 0; i < 3; i++) { await commComments(4); } await Store.set("comm", COMM); commDot(); });
  const pubC = await pg.evaluate(id => { const d = document.documentElement.classList.contains("wide") ? $("railCommDot") : $("commDot"); return { n: commN("bot:" + id), dot: !d.hidden && +d.textContent > 0 }; }, wren);
  chk(`people comment on your public bot (${pubC.n}) and Home shows a dot`, pubC.n > 0 && pubC.dot);
  chk("the comment prompt gets your bot's summary and opening", calls.some(c => /write the comments people leave/.test(sysOf(c)) && /Listing key bot:/.test(userOf_(c)) && /Opening:/.test(userOf_(c))));
  await pg.evaluate(() => closeSheet()); await openComm(); await wait(300);
  chk("opening the community clears the dot", await pg.evaluate(() => $("commDot").hidden && $("railCommDot").hidden));
  await pg.click('.cm-tabs [data-t="yours"]'); await wait(200);
  chk("Yours lists the public bot with its numbers", await pg.evaluate(id => !!document.querySelector(`.cm-mine[data-id="${id}"]`) && /♥/.test(document.querySelector(`.cm-mine[data-id="${id}"]`).textContent), wren));
  await pg.fill("#cmMe", "Lanternlover"); await pg.dispatchEvent("#cmMe", "change"); await wait(100);
  chk("your community name is used for your comments", await pg.evaluate(() => meName() === "Lanternlover"));
  // people
  await pg.click('.cm-tabs [data-t="people"]'); await wait(200);
  await pg.click(".cm-user"); await wait(300);
  chk("a user's page shows their bio, followers and bots", await pg.evaluate(() => /followers/.test($("sheetBody").textContent) && /Bio of user/.test($("sheetBody").textContent) && document.querySelectorAll(".cm-card").length >= 1));
  // the pace: a day away on Busy brings more bots, a few per check
  const nb = await pg.evaluate(() => COMM.posts.length);
  await pg.evaluate(async () => { COMM.tickP = Date.now() - 864e5; await Store.set("comm", COMM); await commTick(true); });
  chk("time away brings new bots at the chosen pace", await pg.evaluate(n => COMM.posts.length === n + 3, nb));
  // a redraw never wipes what you're typing
  await pg.evaluate(id => openPost(id), pid); await wait(200); await pg.fill("#cmText", "half-written");
  await pg.evaluate(() => commRedraw()); await wait(100);
  chk("new activity doesn't wipe a comment you're typing", await pg.inputValue("#cmText") === "half-written");
  await pg.evaluate(() => closeSheet());
  // another device's copy merges in
  const mg = await pg.evaluate(() => { const a = { ...commBlank(), users: [{ id: "u1", name: "A" }], posts: [{ id: "p1", at: 1 }], comments: { p1: [{ id: "c1", at: 1 }] }, liked: { p1: { v: true, at: 5 } } }, b2 = { ...commBlank(), users: [{ id: "u2", name: "B" }], posts: [{ id: "p2", at: 2 }], comments: { p1: [{ id: "c2", at: 2 }] }, liked: { p1: { v: false, at: 9 } } }; const m = commMerge(a, b2); return m.users.length === 2 && m.posts.length === 2 && m.comments.p1.length === 2 && m.liked.p1.v === false; });
  chk("two devices' communities merge (newer like wins)", mg);
  chk("the community syncs", await pg.evaluate(() => Sync.synced("comm") && !Sync.listKey("comm")));
  // switched off: no button, no activity
  const nCalls = calls.length;
  await pg.evaluate(async () => { S.settings.commOn = false; await saveSettings(); commDot(); COMM.tickP = Date.now() - 864e5; await commTick(true); });
  chk("switching it off hides the button and stops activity", await pg.evaluate(() => $("btnComm").hidden && $("railComm").hidden) && calls.length === nCalls);
  await pg.evaluate(async () => { S.settings.commOn = true; S.settings.apiKey = ""; await saveSettings(); COMM.tickP = Date.now() - 864e5; await commTick(true); });
  chk("no key, no calls", calls.length === nCalls);
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
