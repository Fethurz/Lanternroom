// v1.80: site news and drama: staff announcements, creator drama told over days by the people in it, suspensions and bans
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { news: [], room: [], dm: [] }; let newsPlan = null;
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore", k % 2 ? "belly" : "dragon"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${Math.random().toString(36).slice(2, 7)}`, tags: ["vore"], summary: "A " + Math.random().toString(36).slice(2, 12) + " thing " + Math.random().toString(36).slice(2, 9), appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/You write site news on/.test(s)) { seen.news.push(body); if (newsPlan) return newsPlan(s, u); const k = Math.random().toString(36).slice(2, 8); return { title: `Post ${k}`, text: `Body text ${k} ${Math.random().toString(36).slice(2, 12)} and more words ${Math.random().toString(36).slice(2, 12)}.` }; }
    if (/You write the next messages in/.test(s)) { seen.room.push(body); return { messages: [] }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return { messages: ["hey"], interest: 5, leaving: false, promises: [] }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/sometimes post short blog posts/.test(s)) return { posts: [] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY || ROOM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  await pg.evaluate(async () => { await commTick(true); }); await idle();
  // bans and quitting take people offline; the test's stand-in for "online" has to know that too
  await pg.evaluate(() => { window.commTick = async () => {}; window.onNow = (u, t = Date.now()) => !!u && !blocked(u.id) && !asleepAt(u, t) && !isBanned(u, t) && !(u.offUntil && t >= u.offFrom && t < u.offUntil); for (const u of COMM.users) { const h = Math.floor(localHour(u)); u.sleep = [(h + 8) % 24, (h + 10) % 24]; } });
  chk("version 1.80 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 80));

  // ---------- the staff
  const st = await pg.evaluate(() => ({ n: STAFF.length, found: !!userOf("staff_wick"), inCrowd: COMM.users.some(u => u.staff), pick: pickUsers(50).some(u => u.staff), lounges: loungeList().some(r => roomCast(r.id).some(u => u.staff)) }));
  chk("three staff accounts, outside the crowd (never picked to comment, post or chat)", st.n === 3 && st.found && !st.inCrowd && !st.pick && !st.lounges);

  // ---------- staff announcements
  const sch = await pg.evaluate(async () => { COMM.newsNext = {}; await newsTick(); const N = COMM.newsNext, now = Date.now(); return { staff: (N.staff - now) / 60e3, drama: (N.drama - now) / 3.6e6, ban: (N.ban - now) / 864e5 }; });
  chk(`the first announcement comes soon, drama within a day, a ban after a few days (${sch.staff.toFixed(0)} min, ${sch.drama.toFixed(1)} h, ${sch.ban.toFixed(1)} d)`, sch.staff > 8 && sch.staff < 12 && sch.drama > 5 && sch.drama < 25 && sch.ban > 1.9 && sch.ban < 5.1);
  newsPlan = () => ({ title: "New: bot folders", text: "You can now sort your saved bots into folders! Find it under Saved. Let us know what you think." });
  const sp = await pg.evaluate(async () => {
    COMM.newsNext.staff = Date.now() - 1; await newsTick();
    const b = COMM.blogs.find(x => x.news === "staff"), N = COMM.newsNext;
    return { b: b && { by: b.by, topic: b.topic, title: b.title, heat: b.heat }, next: (N.staff - Date.now()) / 864e5, toast: [...document.querySelectorAll(".dm-toast")].some(x => /bot folders/.test(x.textContent)) };
  });
  chk(`a staff member posts an announcement (${sp.b?.title}, ${sp.b?.topic})`, sp.b && /^staff_/.test(sp.b.by) && sp.b.topic && sp.b.heat >= 1.5);
  chk(`…with a pop-up, and the next one in 1.5-4 days (${sp.next.toFixed(1)})`, sp.toast && sp.next > 1.4 && sp.next < 4.1);
  const p0 = seen.news.at(-1);
  chk("the staff prompt: staff voice, real member count, never repeat, adults", /on the site's staff/.test(sysOf(p0)) && /Members: /.test(usrOf(p0)) && /never repeat them/.test(usrOf(p0)) && /fully grown, mature being/.test(sysOf(p0)));
  const dup = await pg.evaluate(async () => { const n = COMM.blogs.filter(x => x.news === "staff").length; await newsStaffPost(); return COMM.blogs.filter(x => x.news === "staff").length - n; });
  chk("the same announcement is never posted twice", dup === 0);
  const home = await pg.evaluate(async () => {
    openCommunity(); hubTab("home"); await new Promise(r => setTimeout(r, 40));
    const t = $("hubBody").textContent, badge = $("hubNav").querySelector('[data-ht="home"] .hub-n')?.textContent;
    if (!$("newsAll")) return { dbg: t.slice(0, 400), n: newsOf().length, blogs: COMM.blogs.length }; $("newsAll").click(); await new Promise(r => setTimeout(r, 40)); const page = $("hubHead").textContent, rows = $("hubBody").querySelectorAll(".cm-blog").length; hubNav();
    return { sec: /Site news/.test(t) && /bot folders/.test(t), pill: /📣 Announcement/.test(t) && /✦ Staff/.test(t), badge, page, rows, after: $("hubNav").querySelector('[data-ht="home"] .hub-n')?.textContent || "" };
  });
  if (home.dbg) console.log(JSON.stringify(home)); chk("Home shows Site news with the Staff pill and the staff mark", home.sec && home.pill);
  chk(`an unread count on Home (${home.badge}) that the news page clears`, home.badge === "1" && /Site news/.test(home.page) && home.rows === 1 && home.after === "");
  const sprof = await pg.evaluate(async () => { $("hubBody").querySelector(".cm-blog").click(); await new Promise(r => setTimeout(r, 40)); const t = $("hubBody").textContent; window.__t = t; $("hubBody").querySelector("[data-u]").click(); await new Promise(r => setTimeout(r, 40)); return { post: /folders/.test(t) && /Comments/.test(t), prof: /✦ Staff/.test($("hubBody").textContent) && /Posts · 1/.test($("hubBody").textContent), dbg: window.__t.slice(0, 400) }; }); if (!sprof.prof || !sprof.post) console.log(JSON.stringify(sprof));
  chk("the announcement opens with comments; a staff profile lists their posts", sprof.post && sprof.prof);

  // ---------- a drama arc: a reposted bot, a denial, a suspension
  newsPlan = (s, u) => /moderation notice/.test(u) ? { title: "Suspension: reposting", text: "After reviewing the reports, the account is suspended for reposting another creator's bot without credit." } : /Call out/.test(u) ? { title: "someone stole my bot", text: "so @x literally reposted my bot with the names changed. i'm so done." } : /Respond to/.test(u) ? { title: "about the callout", text: "i didn't copy anyone, similar ideas happen, stop dogpiling me" } : { title: "t " + Math.random(), text: "x " + Math.random() };
  const arc = await pg.evaluate(async () => {
    const a = (() => { for (const x of COMM.arcs) x.done = x.done || Date.now(); return arcStart() || (() => { const us = COMM.users.filter(x => !x.ban && onNow(x)); const arc = { id: uid(), kind: "quit", a: us[0].id, b: us[1].id, c: us[2].id, step: 0, next: 0, at: Date.now() }; COMM.arcs.push(arc); return arc; })(); })(); a.kind = "steal"; a.end = "ban"; a.next = Date.now() - 1; if (!a.b) a.b = COMM.users.find(u => u.id !== a.a && commUserPosts(u).length).id;
    const r = { kind: a.kind, a: a.a, b: a.b, bot: COMM.posts.find(p => p.id === a.bot)?.by === a.a };
    await arcStep(a); r.s1 = COMM.blogs.find(x => x.arc === a.id && x.by === a.a)?.title; r.n1 = (a.next - Date.now()) / 3.6e6;
    a.next = Date.now() - 1; await arcStep(a); r.s2 = COMM.blogs.find(x => x.arc === a.id && x.by === a.b)?.title;
    a.next = Date.now() - 1; await arcStep(a); const ban = COMM.blogs.find(x => x.arc === a.id && x.news === "ban");
    const ub = userOf(a.b); r.ban = !!ban && /^staff_/.test(ban.by); r.banned = isBanned(ub); r.days = (ub.ban.until - Date.now()) / 864e5; r.done = !!a.done; r.id = a.id;
    return r;
  });
  chk(`a drama arc picks two creators and the first one's own bot (${arc.kind})`, arc.a && arc.b && arc.a !== arc.b && arc.bot);
  chk(`step 1: the callout from the creator (${arc.s1}), the next step hours later (${arc.n1.toFixed(1)} h)`, arc.s1 === "someone stole my bot" && arc.n1 > 2.9 && arc.n1 < 14.1);
  chk(`step 2: the accused answers (${arc.s2})`, arc.s2 === "about the callout");
  chk(`the staff step in and suspend them (${arc.days.toFixed(1)} days)`, arc.ban && arc.banned && arc.days > 2 && arc.days < 16 && arc.done);
  const pr = seen.news.filter(x => /Respond to/.test(usrOf(x))).at(-1);
  chk("each step is written knowing what was posted before", /What has happened so far/.test(usrOf(pr)) && /someone stole my bot/.test(usrOf(pr)) && /The bot at the centre of it/.test(usrOf(pr)));
  const eff = await pg.evaluate(async id => {
    const u = userOf(id), mine = COMM.posts.filter(p => p.by === id);
    hubTab("home"); await new Promise(r => setTimeout(r, 30)); const rows = hubRows().flatMap(r => r[2]).some(p => p.by === id);
    openCommUser(id); await new Promise(r => setTimeout(r, 30)); const prof = $("hubBody").textContent;
    COMM.dms[id] = { msgs: [], read: 0 }; dmSend(id, "hey are you ok"); const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() - 1; q.typingAt = Date.now() - 1000;
    while (DM_BUSY) await new Promise(r => setTimeout(r, 30)); await dmPump();
    return { dbg: JSON.stringify({ rows, cup: commUserPosts(u).length, on: isOnline(u), base: onBase(u, Date.now()), wins: dmWins(u) }), posts: mine.length, hidden: !rows && !commUserPosts(u).length, offline: !isOnline(u), note: /suspended until/.test(prof) && /reposting another creator's bot/.test(prof), dmWait: (COMM.dmq.find(x => x.user === id)?.due - u.ban.until) / 3.6e6 };
  }, arc.b);
  if (!eff.hidden || !eff.offline) console.log(eff.dbg);
  chk(`while suspended their bots are hidden (${eff.posts}) and they're offline`, eff.posts >= 1 && eff.hidden && eff.offline);
  chk("their profile says they're suspended and why", eff.note);
  chk(`a DM to them waits until the suspension ends (${eff.dmWait.toFixed(1)} h after)`, eff.dmWait > 0.9 && eff.dmWait < 21.1);
  const lift = await pg.evaluate(id => { const u = userOf(id); const was = u.ban.until; u.ban.until = Date.now() - 1; const r = { live: commUserPosts(u).length > 0, on: !isBanned(u) }; u.ban.until = was; return r; }, arc.b);
  chk("when it ends, their bots come back", lift.live && lift.on);
  // a step waits for its person to be on
  const wait = await pg.evaluate(async () => {
    const a = (() => { for (const x of COMM.arcs) x.done = x.done || Date.now(); return arcStart() || (() => { const us = COMM.users.filter(x => !x.ban && onNow(x)); const arc = { id: uid(), kind: "quit", a: us[0].id, b: us[1].id, c: us[2].id, step: 0, next: 0, at: Date.now() }; COMM.arcs.push(arc); return arc; })(); })(); a.kind = "callout"; a.end = "fizzle"; if (!a.b) a.b = COMM.users.find(u => u.id !== a.a && !u.ban).id; a.next = Date.now() - 1; const u = userOf(a.a), h = Math.floor(localHour(u)); u.sleep = [h, (h + 6) % 24];
    const n = COMM.blogs.length; await arcStep(a); const r = { none: COMM.blogs.length === n, step: a.step, later: (a.next - Date.now()) / 60e3 }; u.sleep = [(h + 8) % 24, (h + 10) % 24];
    a.next = Date.now() - 1; await arcStep(a); r.wrote = COMM.blogs.length === n + 1; a.done = Date.now(); return r;
  });
  chk(`a step waits while its person is asleep (${wait.later.toFixed(0)} min), then happens`, wait.none && wait.step === 0 && wait.later > 15 && wait.wrote);
  // quitting: off the site, maybe back later
  newsPlan = (s, u) => /quitting the site/.test(u) ? { title: "i'm done", text: "deleting nothing but i'm leaving. too much drama. bye" } : /You're back/.test(u) ? { title: "ok i'm back", text: "missed you guys tbh" } : { title: "t " + Math.random(), text: "x " + Math.random() };
  const q1 = await pg.evaluate(async () => {
    const a = (() => { for (const x of COMM.arcs) x.done = x.done || Date.now(); return arcStart() || (() => { const us = COMM.users.filter(x => !x.ban && onNow(x)); const arc = { id: uid(), kind: "quit", a: us[0].id, b: us[1].id, c: us[2].id, step: 0, next: 0, at: Date.now() }; COMM.arcs.push(arc); return arc; })(); })(); a.kind = "quit"; a.end = "back"; a.b = null; a.next = Date.now() - 1; await arcStep(a); const u = userOf(a.a);
    const r = { post: COMM.blogs.some(x => x.arc === a.id && x.title === "i'm done"), off: !onNow(u, Date.now() + 120e3), days: (u.offUntil - Date.now()) / 864e5, nextAfter: a.next > u.offUntil };
    u.offUntil = Date.now() - 1; a.next = Date.now() - 1; await arcStep(a); r.back = COMM.blogs.some(x => x.arc === a.id && x.title === "ok i'm back"); r.done = !!a.done; return r;
  });
  if (!q1.nextAfter || !q1.off) console.log(JSON.stringify(q1));
  chk(`someone quits: a goodbye post and gone for days (${q1.days.toFixed(1)})`, q1.post && q1.off && q1.days > 1.9 && q1.days < 6.1 && q1.nextAfter);
  chk("…and comes back with a comeback post", q1.back && q1.done);
  // a ban outside any drama
  newsPlan = () => ({ title: "Moderation update " + Math.random().toString(36).slice(2, 6), text: "An account was suspended for spamming bot links in other people's comments. " + Math.random() });
  const rb = await pg.evaluate(async () => {
    const f = COMM.users.find(u => !u.ban); commFollow(f.id, true);
    const pre = new Set(COMM.users.filter(u => u.ban).map(u => u.id)); let follow = false, n = 0; for (let i = 0; i < 6; i++) { const b = await newsBan(); if (b) n++; if (f.ban) follow = true; }
    const bans = COMM.users.filter(u => u.ban && !pre.has(u.id));
    return { dbg: JSON.stringify({ users: COMM.users.length, cre: creatorsOf().length, banned: COMM.users.filter(u => u.ban).length }), n, follow, bans: bans.length, perm: bans.some(u => !u.ban.until), why: bans.every(u => BAN_WHY.includes(u.ban.why)) };
  });
  if (rb.n !== 6) console.log(rb.dbg);
  chk(`random suspensions and bans with a reason (${rb.n}), never someone you follow`, rb.n === 6 && rb.bans === 6 && rb.why && !rb.follow);

  // ---------- people know: lounges, DMs, comments
  const kn = await pg.evaluate(async () => {
    const f = newsFact(); COMM.rooms = {}; COMM.rq = []; openRoom("general"); while (ROOM_BUSY) await new Promise(r => setTimeout(r, 30)); await roomPump(); while (ROOM_BUSY) await new Promise(r => setTimeout(r, 30));
    const u = COMM.users.find(x => !x.ban && !x.staff); return { f, dm: dmKnows(u) };
  });
  chk("people know the news: it's in lounge prompts and in what DM partners know", /Site news and drama lately/.test(kn.f) && /Site news and drama lately/.test(usrOf(seen.room.at(-1))) && /Site news and drama lately/.test(kn.dm));
  const tg = await pg.evaluate(() => { let n = 0; for (let i = 0; i < 60; i++) if (commTargets(3).some(t => t.startsWith("blog:") && COMM.blogs.find(b => "blog:" + b.id === t)?.news)) n++; return n; });
  chk(`news posts draw comments (picked in ${tg} of 60 rounds)`, tg >= 20);
  const pop = await pg.evaluate(async () => {
    const d = COMM.blogs.find(x => x.news === "drama"); openBlog(d.id); await new Promise(r => setTimeout(r, 40));
    $("cmText").value = "this is so messy lol"; $("cmSend").click(); await new Promise(r => setTimeout(r, 40)); return !!ACHS.got.popcorn;
  });
  chk("badge: Grab the Popcorn", pop);
  const filt = await pg.evaluate(async () => { openNews(); await new Promise(r => setTimeout(r, 30)); const all = $("hubBody").querySelectorAll(".cm-blog").length; $("hubBody").querySelector('[data-nf="ban"]').click(); await new Promise(r => setTimeout(r, 30)); const bans = [...$("hubBody").querySelectorAll(".cm-blog")].every(x => /Moderation/.test(x.textContent)); $("hubBody").querySelector('[data-nf="drama"]').click(); await new Promise(r => setTimeout(r, 30)); const dr = $("hubBody").querySelectorAll(".cm-blog").length; return { all, bans, dr }; });
  chk(`the news page filters staff, hot topics and moderation (${filt.all}, ${filt.dr} hot)`, filt.all >= 10 && filt.bans && filt.dr >= 4);
  const mg = await pg.evaluate(() => { const A = commMerge(commBlank(), { arcs: [{ id: "x", step: 0 }], newsNext: { staff: 5 }, newsSeen: 3 }); const B = commMerge(A, { arcs: [{ id: "x", step: 2 }, { id: "y" }], newsNext: { staff: 9, ban: 2 }, newsSeen: 1 }); return { n: B.arcs.length, step: B.arcs.find(a => a.id === "x").step, st: B.newsNext.staff, ban: B.newsNext.ban, seen: B.newsSeen }; });
  chk("two devices' arcs and schedules merge", mg.n === 2 && mg.step === 2 && mg.st === 9 && mg.ban === 2 && mg.seen === 3);
  const wide = await pg.evaluate(async () => { openNews(); await new Promise(r => setTimeout(r, 40)); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
