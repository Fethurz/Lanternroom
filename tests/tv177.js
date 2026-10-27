// v1.77: people keep their promises (bots, updates, posts, checking out your bot / following you), blocking, a much more active
// site (300 people, far more online at once), adding your own person (hidden in Settings), texts-in-a-row as a personal habit,
// instant replies when someone's hooked, and no more waking up just to say goodnight again.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { dm: [], posts: [], blogs: [], upd: [], fill: [], check: [] }; let dmReply = () => ({ messages: ["ok"], interest: 5, leaving: false, promises: [] });
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { seen.posts.push(body); const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: /promised|told people/.test(u) ? "Mossbelly the Swamp Wyrm" : `Bot ${h} ${Date.now() % 100000} ${i}`, tags: ["vore"], summary: "A swamp wyrm.", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/sometimes post short blog posts/.test(s)) { seen.blogs.push(body); const h = (u.match(/- @(\S+) \(/) || [])[1]; return { posts: [{ by: h, title: "Requests are open!", text: "Requests open for the weekend, send me your weirdest ideas." }] }; }
    if (/updating one of your bots/.test(s)) { seen.upd.push(body); return { note: "added a swamp bath opening", newOpening: "*The wyrm sinks into the bog.*" }; }
    if (/You complete a new member/.test(s)) { seen.fill.push(body); return { name: "AI name", handle: "aihandle", voice: "AI voice", style: "AI style", taste: ["ai"], focus: "ai focus", fandoms: [], bio: "An AI bio that is fine." }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return dmReply(body); }
    if (/you'd check out their bot/.test(s)) { seen.check.push(body); return { text: "tried your bot, the gurgles got me" }; }
    if (/^You are @/.test(s)) return { text: "haha sure", dm: false, promises: [{ kind: "post", about: "post that requests are open this weekend", bot: "", when: "soon" }] };
    if (/write the comments people leave/.test(s)) return { comments: [] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  chk("version 1.77", await pg.evaluate(() => VERSION.startsWith("1.77")));

  // ---------- 3. a much more active site
  const act = await pg.evaluate(async () => {
    const before = COMM.users.length; while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true); while (COMM_BUSY) await new Promise(r => setTimeout(r, 50));
    const t0 = Date.now(); let on = 0, n = 0; for (let k = 0; k < 48; k++) { const t = t0 + k * 30 * 60e3; for (const u of COMM.users) { if (asleepAt(u, t)) continue; n++; if (onBase(u, t)) on++; } }
    return { people: COMM_PEOPLE, grew: COMM.users.length - before, awakeOn: on / n, site: commOnlineNow() / commMembers() };
  });
  chk(`300 active people, 24 more each check (+${act.grew})`, act.people === 300 && act.grew === 24);
  chk(`awake people are online far more often (${Math.round(act.awakeOn * 100)}% of the time)`, act.awakeOn > 0.35);
  chk(`more of the quiet crowd online at once (${(act.site * 100).toFixed(1)}%)`, act.site >= 0.06);

  // ---------- 1. promises from DMs
  const u0 = await pg.evaluate(() => COMM.users[2].id);
  dmReply = () => ({ messages: ["omg yes", "i'm gonna make a swamp wyrm bot that slurps you up, gimme a bit"], interest: 9, leaving: false, promises: [{ kind: "bot", about: "a swamp wyrm bot that slurps you up whole", bot: "Mossbelly", when: "today" }] });
  const p1 = await pg.evaluate(async id => {
    const u = userOf(id); COMM.dms[id] = { msgs: [], read: 0 }; dmSend(id, "you should make a swamp wyrm bot"); const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() + 500; q.typingAt = Date.now() - 1000;
    while (DM_BUSY) await new Promise(r => setTimeout(r, 50)); await dmPump(); await new Promise(r => setTimeout(r, 900)); await dmPump();
    const pr = COMM.promises.find(x => x.by === id);
    return { pr, hours: pr ? (pr.due - Date.now()) / 3.6e6 : 0, interest: COMM.dms[id].interest };
  }, u0);
  chk(`saying "I'm gonna make a bot" in DMs is written down with when they'll do it (${p1.hours.toFixed(1)} h)`, p1.pr && p1.pr.kind === "bot" && p1.hours > 0.5 && p1.hours < 48);
  chk("the DM prompt asks for promises, interest, and their texts-in-a-row habit", /"promises"/.test(sysOf(seen.dm.at(-1))) && /"interest"/.test(sysOf(seen.dm.at(-1))) && /How you send texts/.test(sysOf(seen.dm.at(-1))));
  chk(`how hooked they are is kept (${p1.interest})`, p1.interest === 9);
  const kept = await pg.evaluate(async id => {
    const pr = COMM.promises.find(x => x.by === id); pr.due = Date.now() - 1000; while (COMM_BUSY) await new Promise(r => setTimeout(r, 50));
    const n = await commKeepPromises(); const p = COMM.posts.find(x => x.promise === pr.id);
    return { n, done: !!pr.done, post: p && { by: p.by, name: p.card.name }, toast: !!document.querySelector(".dm-toast"), fact: dmKnows(userOf(id)) };
  }, u0);
  chk(`…and later they really post it (${kept.post?.name})`, kept.n === 1 && kept.done && kept.post?.by === u0);
  chk("…made from what they said", /swamp wyrm bot that slurps you up/.test(usrOf(seen.posts.at(-1))));
  chk("…with a pop-up that the bot they told you about is up", kept.toast);
  chk("…and they know they did it when you talk again", /Things you said you'd do/.test(kept.fact) && /done/.test(kept.fact) && /Mossbelly/.test(kept.fact));
  // update, post, check-out/follow
  const others = await pg.evaluate(async id => {
    const u = userOf(id), c = S.chars[0]; COMM.pub[c.id] = { on: true, at: Date.now() - 864e5, since: Date.now() - 864e5, heat: 1 };
    commPromise(u, [{ kind: "update", about: "add a swamp bath opening to Mossbelly", bot: "Mossbelly", when: "soon" }, { kind: "post", about: "say requests are open", bot: "", when: "soon" }, { kind: "check", about: `try ${c.name} and follow them`, bot: c.name, when: "soon" }], "dm");
    for (const p of COMM.promises) if (!p.done) p.due = Date.now() - 1000;
    while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commKeepPromises(); await commKeepPromises();
    const P = COMM.promises.filter(x => x.by === id);
    return { kinds: P.filter(x => x.done && !x.failed).map(x => x.kind), upd: COMM.posts.find(x => x.by === id && x.card.name === "Mossbelly the Swamp Wyrm")?.updates?.length || 0, blog: COMM.blogs.some(x => x.by === id && /Requests/.test(x.title)), comment: (COMM.comments["bot:" + c.id] || []).some(x => x.by === id), follows: followsMe(id) };
  }, u0);
  chk(`an update promise updates their bot (${others.upd} update)`, others.kinds.includes("update") && others.upd >= 1 && /swamp bath/.test(sysOf(seen.upd.at(-1))));
  chk("a post promise becomes a post", others.kinds.includes("post") && others.blog && /Writes the post they said they'd write/.test(usrOf(seen.blogs.at(-1))));
  chk("\"I'll check out your bot and follow you\" → a comment on your bot and a follow", others.kinds.includes("check") && others.comment && others.follows);
  const cp = await pg.evaluate(async () => { const t = COMM.posts[0].id, u = userOf(COMM.posts[0].by), mine = { id: uid(), by: "me", text: "requests open?", at: Date.now() }; (COMM.comments[t] = COMM.comments[t] || []).push(mine); COMM.promises = COMM.promises.filter(x => x.by !== u.id || x.done); await commAnswer({ id: uid(), target: t, replyTo: mine.id, by: u.id, due: Date.now() }); return COMM.promises.some(x => x.by === u.id && x.kind === "post" && x.from === "comment"); });
  chk("promises made in comment replies are kept too", cp);

  // ---------- 5/6. texts in a row, hooked replies
  const burst = await pg.evaluate(async () => {
    const u = COMM.users[5]; u.burst = 0.1; dmReply = null; return true;
  });
  dmReply = () => ({ messages: ["a", "b", "c", "d", "e"], interest: 6, leaving: false, promises: [] });
  const nb = await pg.evaluate(async () => { const u = COMM.users[5]; const out = await dmWrite(u, { kind: "reply", due: Date.now() }); u.burst = 0.9; const out2 = await dmWrite(u, { kind: "reply", due: Date.now() }); return [out.length, out2.length]; });
  chk(`a one-message person sends at most 2 even when the writer gives 5; a rapid texter can send 5 (${nb.join(" / ")})`, nb[0] <= 2 && nb[1] === 5);
  chk("their habit is in the prompt", /almost always send one message/.test(sysOf(seen.dm.at(-2))) && /a few short texts in a row/.test(sysOf(seen.dm.at(-1))));
  const hot = await pg.evaluate(() => {
    const u = COMM.users[6], now = Date.now(), d = dmOf(u.id); u.speed = "medium"; u.offUntil = 0;
    const set = it => { d.msgs = [{ id: uid(), from: "them", text: "haha", at: now - 60e3 }]; d.leftAt = 0; d.run = { start: now - 6e5, last: now - 60e3, until: now + 40 * 60e3, bed: now + 5 * 3.6e6, ext: 0 }; d.interest = it; d.intAt = now - 60e3; };
    const med = it => { const a = []; for (let i = 0; i < 31; i++) { set(it); a.push((dmDelay(u, now).due - now) / 1000); } return a.sort((x, y) => x - y)[15]; };
    return { hooked: med(9), normal: med(5), bored: med(2) };
  });
  chk(`hooked people answer within seconds (median ${Math.round(hot.hooked)} s), normal ${Math.round(hot.normal)} s, bored ${Math.round(hot.bored)} s`, hot.hooked < 45 && hot.hooked < hot.normal && hot.normal < hot.bored);

  // ---------- 7. no goodnight after waking up
  dmReply = () => ({ messages: ["morning!! sorry passed out"], interest: 6, leaving: false, promises: [] });
  const gn = await pg.evaluate(async () => {
    const now = Date.now(), u = COMM.users.find(x => !asleepAt(x, now) && nextSleep(x, now) - now > 3 * 3.6e6) || COMM.users[7], d = dmOf(u.id), night = now - 8 * 3.6e6; u.offUntil = 0;
    d.msgs = [{ id: uid(), from: "me", text: "night?", at: night - 6e5 }, { id: uid(), from: "them", text: "ok gn!!", at: night }, { id: uid(), from: "me", text: "gn!", at: night + 60e3 }];
    d.leftAt = night; d.run = { start: night - 3.6e6, last: night, until: night, bed: night + 10 * 60e3, ext: 0 };
    await dmWrite(u, { kind: "reply", due: now }); return { run: d.run.bed > now };
  });
  const gp = sysOf(seen.dm.at(-1));
  chk("a reply after a night's sleep starts a fresh sitting with tonight's bedtime", gn.run);
  chk("…and is told to pick the conversation back up, never to say goodnight again", /picking the conversation back up/.test(gp) && /never say goodbye or goodnight again/.test(gp) && !/log off in a few minutes/.test(gp) && !/past when you'd normally be asleep/.test(gp));

  // ---------- 2. blocking
  const bu = await pg.evaluate(() => COMM.users[3].id);
  await pg.evaluate(async id => { const p = COMM.posts.find(x => x.by !== id); COMM.posts.unshift({ ...p, id: "bp1", by: id, card: { ...p.card, name: "Blocked Bot" }, at: Date.now() }); (COMM.comments[COMM.posts[1].id] = COMM.comments[COMM.posts[1].id] || []).push({ id: "bc1", by: id, text: "annoying comment here", at: Date.now() }); COMM.dms[id] = { msgs: [{ id: "bd1", from: "them", text: "hey", at: Date.now() }], read: 0 }; COMM.dmq.push({ id: "bq1", user: id, kind: "open", due: Date.now() + 6e5, typingAt: Date.now() + 5e5 }); commSave(); await openCommunity("home"); openCommUser(id); }, bu);
  await pg.click("#cmBlock"); await pg.click("#cmBlock"); await pg.waitForTimeout(200);
  const bl = await pg.evaluate(async id => {
    const r = { on: blocked(id), page: /You blocked this person/.test(cbody().textContent) && !!$("cmUnblock") };
    hubTab("home"); r.rows = !/Blocked Bot/.test(cbody().textContent) && !hubRows().some(x => x[2].some(p => p.by === id));
    openPost(COMM.posts[1].id); r.comment = !/annoying comment here/.test(cbody().textContent);
    hubTab("dms"); r.dms = !cbody().querySelector(`[data-dm="${id}"]`) && dmUnread() === 0 || !Object.keys(COMM.dms).filter(vis).includes(id);
    r.queue = !COMM.dmq.some(x => x.user === id);
    commSchedule(COMM.posts.find(p => p.by === id).id, { id: "x", by: "me", text: "hi", replyTo: "" }); r.noReply = !COMM.pending.some(x => x.by === id);
    openDM(id); r.dmPage = !$("dmIn") && !!$("dmUnblock");
    r.gossip = /complaining that/.test(commBlogs.toString());
    return r;
  }, bu);
  chk("Block (two taps) on a profile blocks them and the profile says so", bl.on && bl.page);
  chk("their bots disappear from the rows, their comments from threads", bl.rows && bl.comment);
  chk("their DMs are hidden, what they were about to send is dropped, they can't reply to you", bl.dms && bl.queue && bl.noReply);
  chk("their DM page has no box, just Unblock", bl.dmPage);
  chk("people can notice (someone may mention the drama)", bl.gossip);
  const ub = await pg.evaluate(id => { commBlock(id, false); const k = dmKnows(userOf(id)); hubTab("home"); return { back: hubRows().some(x => x[2].some(p => p.by === id)), knows: /blocked you .* and unblocked you/.test(k) }; }, bu);
  chk("unblocking brings everything back, and they know they were blocked", ub.back && ub.knows);

  // ---------- 4. adding your own person (hidden in Settings)
  await pg.evaluate(() => hubClose());
  await pg.evaluate(() => $("btnSettings").click()); await pg.waitForTimeout(500);
  const hid = await pg.evaluate(() => { const d = document.querySelector(".cm-adv"); return !!d && !d.open && !!$("sCommAdd"); });
  chk("Settings keeps it tucked away under More community options", hid);
  await pg.evaluate(async () => { await commLoad(); openAddPerson(); document.querySelector("#sheetBody details.gen-sec").open = true; }); await pg.waitForTimeout(200);
  await pg.fill("#apName", "Grub"); await pg.fill("#apVoice", "Grumpy, secretly sweet, obsessed with frogs."); await pg.fill("#apAge", "16"); await pg.click("#apGo"); await pg.waitForTimeout(200);
  chk("under 18 is refused", await pg.evaluate(() => !COMM.users.some(u => u.name === "Grub")));
  await pg.fill("#apAge", "27"); await pg.selectOption("#apSpeed", "fast"); await pg.selectOption("#apBurst", "0.85"); await pg.click("#apGo"); await pg.waitForTimeout(800);
  const added = await pg.evaluate(() => { const u = COMM.users.find(x => x.name === "Grub"); return u && { custom: u.custom, voice: u.voice, age: u.age, speed: u.speed, burst: u.burst, handle: u.handle, bio: u.bio, style: u.style, tz: u.tz != null, fit: !!u.fit, list: /Grub/.test($("sheetBody").textContent) }; });
  chk("your person joins with what you wrote kept exactly", added && added.custom && added.voice === "Grumpy, secretly sweet, obsessed with frogs." && added.age === 27 && added.speed === "fast" && added.burst === 0.85 && added.tz && added.fit);
  chk("…and the blanks filled in by the AI to match", added && added.handle === "aihandle" && /AI bio/.test(added.bio) && added.style === "AI style" && /Missing \(invent\)/.test(usrOf(seen.fill.at(-1))) && /Grumpy, secretly sweet/.test(usrOf(seen.fill.at(-1))));
  chk("…and is listed under People you added", added?.list);
  chk("their personality reaches the community prompts", await pg.evaluate(() => { const u = COMM.users.find(x => x.name === "Grub"); return /Personality: Grumpy/.test(`Types: ${u.style || u.voice}${u.custom && u.voice && u.style ? `. Personality: ${u.voice}` : ""}`) && /u\.custom && u\.voice/.test(commComments.toString()); }));
  await pg.evaluate(() => { const u = COMM.users.find(x => x.name === "Grub"); openAddPerson(u.id); }); await pg.waitForTimeout(200);
  await pg.fill("#apVoice", "Now very cheerful."); await pg.click("#apGo"); await pg.waitForTimeout(600);
  chk("Edit changes them in place", await pg.evaluate(() => COMM.users.filter(x => x.name === "Grub").length === 1 && COMM.users.find(x => x.name === "Grub").voice === "Now very cheerful."));
  await pg.evaluate(() => { const b = document.querySelector("[data-rm]"); b.click(); b.click(); }); await pg.waitForTimeout(200);
  chk("Remove takes them off the site", await pg.evaluate(() => !COMM.users.some(x => x.name === "Grub")));
  await pg.evaluate(id => { commBlock(id, true); openBlockedList(); }, bu); await pg.waitForTimeout(150);
  chk("Blocked people lists them with Unblock", await pg.evaluate(() => !!document.querySelector("[data-ub]")));
  await pg.click("[data-ub]"); await pg.waitForTimeout(150);
  chk("…which works", await pg.evaluate(id => !blocked(id), bu));
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
