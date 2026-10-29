// v1.79: lounges (public topic rooms where whoever's around keeps talking) and group chats (private, with people you know)
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0; const seen = { room: [] }; let roomPlan = null;
  const TASTE = [["vore", "belly"], ["fantasy", "rpg"], ["romance"], ["horror", "monster"]];
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: TASTE[k % 4], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${Math.random().toString(36).slice(2, 7)}`, tags: ["vore"], summary: "A " + Math.random().toString(36).slice(2, 12) + " thing " + Math.random().toString(36).slice(2, 9), appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/You write the next messages in/.test(s)) { seen.room.push(body); const hs = [...u.matchAll(/^- @(\S+) \(/gm)].map(m => m[1]); return roomPlan ? roomPlan(hs, u, s) : { messages: hs.slice(0, 3).map((h, i) => ({ by: h, text: `line ${i} from ${h} about ${Math.random().toString(36).slice(2, 9)} and ${Math.random().toString(36).slice(2, 9)}`, re: null })) }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/sometimes post short blog posts/.test(s)) return { posts: [] };
    if (/private messages with/.test(s)) return { messages: ["hey"], interest: 5, leaving: false, promises: [] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY || ROOM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  const now = (k, kind) => pg.evaluate(([k, kind]) => { for (const q of COMM.rq.filter(x => x.room === k && (!kind || x.kind === kind))) { if (q.parts?.length) { const d = Date.now() + 100 - q.parts[0].at; for (const p of q.parts) p.at += d; } else { q.due = Date.now() + 100; q.typingAt = Date.now() - 1000; } } }, [k, kind]);
  const pump = () => pg.evaluate(async () => { while (ROOM_BUSY) await new Promise(r => setTimeout(r, 30)); await roomPump(); while (ROOM_BUSY) await new Promise(r => setTimeout(r, 30)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  await pg.evaluate(async () => { await commTick(true); }); await idle();
  chk("version 1.79 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1079));
  // keep the 3-minute heartbeat out of the way
  await pg.evaluate(() => { window.commTick = async () => {}; });

  // ---------- who hangs out where
  const who = await pg.evaluate(() => {
    const L = loungeList(), gen = COMM.users.filter(u => inLounge(u, loungeOf("general"))), vore = COMM.users.filter(u => inLounge(u, loungeOf("vore")));
    return { n: L.length, ids: L.map(r => r.id), people: COMM.users.length, gen: gen.length, vore: vore.length, voreTaste: vore.filter(u => u.taste.includes("vore")).length, same: COMM.users.every(u => inLounge(u, loungeOf("rp")) === inLounge(u, loungeOf("rp"))) };
  });
  chk(`8 lounges outside a season (${who.ids.join(", ")})`, who.n === 8 && who.ids.includes("general") && who.ids.includes("vore") && who.ids.includes("offtopic"));
  chk(`a good share of people hang out in #general (${who.gen} of ${who.people})`, who.gen > who.people * 0.25 && who.gen < who.people * 0.7);
  chk(`#vore is mostly people into vore (${who.voreTaste} of ${who.vore})`, who.vore > 3 && who.voreTaste / who.vore > 0.7);
  chk("who hangs out where is steady", who.same);
  const sea = await pg.evaluate(() => { SEASON_FORCE = { k: "halloween" }; const r = loungeList().map(x => x.n); SEASON_FORCE = { k: "off" }; return r; });
  chk(`a seasonal lounge in season (${sea[0]})`, sea[0] === "spooky-season" && sea.length === 9);

  // ---------- the Messages tab
  const tab = await pg.evaluate(async () => {
    openCommunity(); hubTab("dms"); await new Promise(r => setTimeout(r, 50));
    const chats = /New group/.test($("hubBody").textContent);
    $("hubBody").querySelector('[data-msub="lounges"]').click(); await new Promise(r => setTimeout(r, 50));
    const rows = [...$("hubBody").querySelectorAll(".rm-row")].map(x => x.textContent);
    return { chats, rows: rows.length, gen: rows.some(t => /#general/.test(t) && /here/.test(t)) };
  });
  chk("Messages has Chats (with New group) and Lounges", tab.chats && tab.rows === 8);
  chk("each lounge says how many people are in it", tab.gen);

  // ---------- opening a lounge: what was said while you were away
  roomPlan = hs => ({ messages: [{ by: hs[0], text: "anyone tried the new swamp wyrm bot", re: null }, { by: hs[1], text: "yeah the gurgles are unreal", re: 1 }, { by: hs[2], text: "i only do fantasy stuff lol", re: null }, { by: "nobody_here", text: "i should not be here at all", re: null }, { by: hs[1], text: "yeah the gurgles are unreal", re: null }] });
  const cu = await pg.evaluate(async () => {
    openRoom("general"); await new Promise(r => setTimeout(r, 50));
    const q = COMM.rq.find(x => x.room === "general" && x.kind === "catch");
    return { q: !!q, from: q && (Date.now() - q.from) / 3.6e6, to: q && (Date.now() - q.to) / 1000, title: $("hubHead").textContent };
  });
  chk(`a lounge you haven't been in fills in what was said meanwhile (from ${cu.from?.toFixed(1)} h ago)`, cu.q && cu.from > 2.9 && cu.from < 3.1 && cu.to >= 19);
  chk("the page is titled #general", /#general/.test(cu.title));
  await pump(); await pump();
  const got = await pg.evaluate(() => { const r = COMM.rooms.general; return { n: r.msgs.length, texts: r.msgs.map(m => m.text), past: r.msgs.every(m => m.at < Date.now() - 10e3), re: !!r.msgs.find(m => /unreal/.test(m.text))?.re, shown: $("hubBody").querySelectorAll(".rm-m").length, reLine: /↪/.test($("hubBody").textContent) }; });
  chk(`it arrives as earlier messages (${got.n}) and shows`, got.n === 3 && got.past && got.shown === 3);
  chk("only people who are here may write, and nobody says the same thing twice", !got.texts.some(t => /should not be here/.test(t)) && got.texts.filter(t => /unreal/.test(t)).length === 1);
  chk("a reply shows what it answers", got.re && got.reLine);
  const p0 = seen.room.at(-1);
  chk("the prompt: people here with their bots, the room, a real chat, no repeats, adults, you're just a member", /#general lounge/.test(sysOf(p0)) && /People here right now/.test(usrOf(p0)) && /Their bots:/.test(usrOf(p0)) && /Never repeat something already said/.test(sysOf(p0)) && /just another member/.test(sysOf(p0)) && /fully grown, mature being/.test(sysOf(p0)) && /never say or hint that anyone is an AI/.test(sysOf(p0)));
  const keep = await pg.evaluate(() => { const q = COMM.rq.filter(x => x.room === "general" && !x.parts); return { n: q.length, kind: q[0]?.kind, in: q[0] && (q[0].due - Date.now()) / 1000 }; });
  chk(`while you're in it, the room keeps talking (next in ${Math.round(keep.in)} s)`, keep.n === 1 && keep.kind === "chat" && keep.in > 5 && keep.in < 500);

  // ---------- saying something: people answer within seconds
  roomPlan = (hs, u) => { const ln = (u.match(/just wrote line (\d+)/) || [])[1]; return { messages: [{ by: hs[0], text: "@me lol same, the gurgles got me too", re: +ln }, { by: hs[1], text: "welcome in btw " + Math.random().toString(36).slice(2, 9), re: null }] }; };
  const say = await pg.evaluate(async () => {
    $("rmIn").value = "the swamp wyrm is my favourite"; $("rmSend").click(); await new Promise(r => setTimeout(r, 30));
    const q = COMM.rq.find(x => x.room === "general" && x.kind === "reply");
    return { kind: q?.kind, in: q && (q.due - Date.now()) / 1000, mine: COMM.rooms.general.msgs.at(-1).by === "me", badge: !!ACHS.got.lounge_hi };
  });
  chk(`your message turns the next stretch into answers, due in ${say.in?.toFixed(0)} s`, say.kind === "reply" && say.in > 0 && say.in < 60 && say.mine);
  chk("badge: Pull Up a Chair", say.badge);
  await pg.evaluate(() => { const me = COMM.rooms.general.msgs.at(-1); me.at -= 10e3; const q = COMM.rq.find(x => x.room === "general" && x.kind === "reply"); if (q.parts) { const d = Date.now() + 200 - q.parts[0].at; for (const p of q.parts) p.at += d; } else { q.due = Date.now() + 200; q.typingAt = Date.now() - 1000; } });
  await pump(); await pg.waitForTimeout(400); await pump(); await pg.evaluate(() => ROOM_VIEW?.());
  const ans = await pg.evaluate(() => { const r = COMM.rooms.general, me = r.msgs.filter(m => m.by === "me").at(-1), a = r.msgs.find(m => /got me too/.test(m.text)); return { a: !!a, re: a?.re === me.id, tome: a && roomToMe(a, "general"), hl: !!$("hubBody").querySelector(".rm-m.tome"), u: usrOf => 0 }; });
  chk("someone answers your line, marked as a reply to you and highlighted", ans.a && ans.re && ans.tome && ans.hl);
  chk("the reply prompt names your line", /just wrote line \d+/.test(usrOf(seen.room.at(-1))));
  // texts arrive one after another
  const later = await pg.evaluate(() => { const r = COMM.rooms.general.msgs, a = r.find(m => /got me too/.test(m.text)), w = r.find(m => /welcome in/.test(m.text)); const p = COMM.rq.find(x => x.room === "general" && x.parts?.length)?.parts[0]; return a && (w || p) ? ((w || p).at - a.at) / 1000 : -1; });
  chk(`the second answer comes a few seconds later (${later.toFixed(1)} s)`, later > 1 && later < 45);

  // ---------- away from the room: answers to you light up the count; other chatter doesn't
  const away = await pg.evaluate(async () => {
    hubTab("home"); await new Promise(r => setTimeout(r, 30));
    const r = COMM.rooms.general, me = r.msgs.filter(m => m.by === "me").at(-1), t = Date.now(), pB = COMM.users.find(u => inLounge(u, loungeOf("general")));
    r.msgs.push({ id: uid(), by: pB.id, text: "unrelated chatter " + t, at: t, got: t }, { id: uid(), by: pB.id, text: "@" + myHandle() + " you around?", at: t + 1, got: t + 1 }, { id: uid(), by: pB.id, text: "replying to you", at: t + 2, got: t + 2, re: me.id });
    const n = roomUnread(); commDot(); hubNav();
    const chatQueued = COMM.rq.some(x => x.room === "general" && x.kind === "chat" && !x.parts);
    return { n, nav: $("hubNav").querySelector('[data-ht="dms"] .hub-n')?.textContent, chatQueued };
  });
  chk(`only mentions and replies to you count as unread in a lounge (${away.n})`, away.n === 2);
  chk("…and show on the Messages tab", away.nav === "2");
  const drop = await pg.evaluate(async () => { const before = COMM.rq.filter(x => x.room === "general" && x.kind === "chat" && !x.parts).length; for (const q of COMM.rq) if (q.room === "general" && !q.parts) { q.due = Date.now(); q.typingAt = Date.now() - 1000; } return before; });
  const callsBefore = seen.room.length; await pump();
  chk("after you leave, its idle chatter stops (no AI call for it)", seen.room.length === callsBefore && await pg.evaluate(() => !COMM.rq.some(x => x.room === "general" && x.kind === "chat" && !x.parts)));

  // ---------- group chats
  roomPlan = (hs, u) => /just made this group chat and added them/.test(u) ? { messages: [{ by: hs[0], text: "oh hey whats this for", re: null }, { by: hs[1] || hs[0], text: "a group chat?? finally", re: null }] } : { messages: [{ by: hs[0], text: "lol yes " + Math.random().toString(36).slice(2, 8), re: null }] };
  const g1 = await pg.evaluate(async () => {
    const us = COMM.users.filter(u => !asleepAt(u, Date.now())).slice(0, 3);
    for (const u of us) commFollow(u.id, true);
    hubTab("dms"); HUB.msub = "chats"; hubTab("dms"); await new Promise(r => setTimeout(r, 30)); $("grpNew").click(); await new Promise(r => setTimeout(r, 50));
    const box = [...$("hubBody").querySelectorAll("[data-pk]")], n = box.length, dis0 = $("ngMake").disabled;
    for (const id of us.slice(0, 2).map(u => u.id)) { const x = $("hubBody").querySelector(`[data-pk="${id}"]`); x.checked = true; x.dispatchEvent(new Event("change")); }
    $("ngName").value = "Swamp Club"; const dis1 = $("ngMake").disabled; $("ngMake").click(); await new Promise(r => setTimeout(r, 60));
    const g = Object.values(COMM.groups).at(-1);
    return { n, dis0, dis1, g: g && { name: g.name, members: g.members.length }, title: $("hubHead").textContent, sys: /You made the group/.test($("hubBody").textContent), join: COMM.rq.some(x => x.room === "g:" + g.id && x.kind === "join"), badge: !!ACHS.got.group_made, key: "g:" + g.id };
  });
  chk(`New group lists people you know (${g1.n}) and needs 2`, g1.n >= 3 && g1.dis0 && !g1.dis1);
  chk(`the group is made and opens (${g1.g?.name}, ${g1.g?.members} others)`, g1.g?.name === "Swamp Club" && g1.g.members === 2 && /Swamp Club/.test(g1.title) && g1.sys);
  chk("…members react to being added, and the badge", g1.join && g1.badge);
  await now(g1.key); await pump(); await now(g1.key); await pg.waitForTimeout(300); await pump(); await now(g1.key); await pg.waitForTimeout(300); await pump();
  const g2 = await pg.evaluate(k => ({ texts: COMM.rooms[k].msgs.map(m => m.text), shown: /whats this for/.test($("hubBody").textContent) }), g1.key);
  chk("…and their hellos arrive in the group", g2.texts.some(t => /whats this for/.test(t)) && g2.shown);
  chk("the group prompt names the group and its members", /private group chat called "Swamp Club"/.test(sysOf(seen.room.at(-1))));
  const g3 = await pg.evaluate(async k => {
    const g = groupOf(k.slice(2)), now = Date.now();
    for (const id of g.members) { const u = userOf(id), h = Math.floor(localHour(u)); u.sleep = [h, (h + 6) % 24]; } // everyone asleep
    roomSend(k, "night owls?"); const q = COMM.rq.find(x => x.room === k && !x.parts);
    return { wait: q && (q.due - now) / 3.6e6 };
  }, g1.key);
  chk(`with nobody online, the group answers when someone comes on (${g3.wait?.toFixed(1)} h)`, g3.wait > 3);
  const g4 = await pg.evaluate(async k => {
    for (const id of groupOf(k.slice(2)).members) { const u = userOf(id), h = Math.floor(localHour(u)); u.sleep = [(h + 8) % 24, (h + 10) % 24]; }
    hubTab("dms"); HUB.msub = "chats"; hubTab("dms"); await new Promise(r => setTimeout(r, 30));
    const row = $("hubBody").querySelector(`[data-room="${k}"]`);
    const t = Date.now(), m0 = groupOf(k.slice(2)).members[0]; COMM.rooms[k].msgs.push({ id: uid(), by: m0, text: "u there", at: t, got: t });
    const un = roomUnread(); hubTab("dms"); const row2 = $("hubBody").querySelector(`[data-room="${k}"]`);
    return { row: !!row, un, bold: row2?.classList.contains("un"), dot: row2?.querySelector(".dm-n")?.textContent };
  }, g1.key);
  chk("the group is in Chats, and its new messages count as unread", g4.row && g4.un >= 1 && g4.bold && g4.dot === "1");
  // group info: rename, add, leave
  const g5 = await pg.evaluate(async k => {
    openRoom(k); await new Promise(r => setTimeout(r, 30)); $("rmInfo").click(); await new Promise(r => setTimeout(r, 30));
    const info = /Members · 3/.test($("hubBody").textContent);
    $("giName").value = "Bog Buddies"; $("giName").dispatchEvent(new Event("change"));
    $("giAdd").click(); await new Promise(r => setTimeout(r, 30));
    const box = $("hubBody").querySelector("[data-pk]"); box.checked = true; box.dispatchEvent(new Event("change")); $("ngMake").click(); await new Promise(r => setTimeout(r, 60));
    const g = groupOf(k.slice(2));
    return { dbg: JSON.stringify({ head: $("hubHead").textContent, rm: !!$("hubBody").querySelector(".rm-list .rm-m"), rq: COMM.rq.filter(x => x.room === k).map(x => x.kind), body: $("hubBody").textContent.slice(0, 200) }), info, name: g.name, n: g.members.length, back: /Bog Buddies/.test($("hubHead").textContent) && !!$("hubBody").querySelector(".rm-list .rm-m"), join: COMM.rq.some(x => x.room === k && x.kind === "join" && x.added) || COMM.done.length > 0, sys: /You added/.test($("hubBody").textContent) };
  }, g1.key);
  await now(g1.key, "join"); await pump();
  const addP = seen.room.some(b => /just added @\S+ to the group/.test(usrOf(b)));
  chk("Group info: rename and add someone (back in the chat, and the newcomer says hi)", g5.info && g5.name === "Bog Buddies" && g5.n === 3 && g5.back && addP && g5.sys);
  const g6 = await pg.evaluate(async k => {
    $("rmInfo").click(); await new Promise(r => setTimeout(r, 30)); $("giLeave").click(); $("giLeave").click(); await new Promise(r => setTimeout(r, 30));
    const g = groupOf(k.slice(2)); HUB.msub = "chats"; hubTab("dms");
    return { left: !!g.left, gone: !$("hubBody").querySelector(`[data-room="${k}"]`), un: roomUnread() };
  }, g1.key);
  chk("leaving a group takes it off the list", g6.left && g6.gone);

  // ---------- someone adds you to their group
  roomPlan = (hs, u) => /just made this group chat \(/.test(u) ? { name: "wyrm enjoyers", messages: [{ by: hs[0], text: "made a gc for us vore freaks", re: null }, { by: hs[1] || hs[0], text: "hiii", re: null }] } : { messages: [] };
  const inv = await pg.evaluate(async () => {
    const u = COMM.users.find(x => !asleepAt(x, Date.now()) && x.taste.includes("vore") && !COMM.dms[x.id]?.msgs.length) || COMM.users.find(x => x.taste.includes("vore"));
    COMM.dms[u.id] = { msgs: Array.from({ length: 7 }, (_, i) => ({ id: uid(), from: i % 2 ? "me" : "them", text: "msg " + i, at: Date.now() - 864e5 + i * 6e4 })), read: Date.now() };
    for (const g of Object.values(COMM.groups)) g.at = 1;
    COMM.grpNext = Date.now() - 1; const made = groupMaybeInvite(); const g = Object.values(COMM.groups).find(x => x.by === u.id);
    return { made, g: g && { members: g.members.length, has: g.members.includes(u.id) }, key: g && "g:" + g.id, open: g && COMM.rq.some(x => x.room === "g:" + g.id && x.kind === "open"), badge: !!ACHS.got.group_added, next: (COMM.grpNext - Date.now()) / 3.6e6 };
  });
  chk(`someone you DM a lot makes a group with you and their friends (${inv.g?.members} people)`, inv.made && inv.g?.has && inv.g.members >= 2 && inv.open && inv.next > 19);
  chk("badge: Plus One", inv.badge);
  await pg.evaluate(() => hubTab("home"));
  await now(inv.key); await pump(); await now(inv.key); await pg.waitForTimeout(300); await pump(); await now(inv.key); await pg.waitForTimeout(300); await pump();
  const inv2 = await pg.evaluate(k => ({ name: groupOf(k.slice(2)).name, texts: COMM.rooms[k].msgs.map(m => m.text), toast: [...document.querySelectorAll(".dm-toast")].some(x => /wyrm enjoyers|vore freaks|hiii/.test(x.textContent)) }), inv.key);
  chk(`…names it (${inv2.name}) and says why, with a pop-up`, inv2.name === "wyrm enjoyers" && inv2.texts.some(t => /vore freaks/.test(t)) && inv2.toast);
  chk("the opener prompt says who started it", /just made this group chat \(/.test(usrOf(seen.room.at(-1))));

  // ---------- Home shows the busiest lounges; blocked people vanish; DMs and rooms come back after visiting a profile
  const home = await pg.evaluate(async () => { hubTab("home"); await new Promise(r => setTimeout(r, 30)); const c = [...$("hubBody").querySelectorAll(".rm-strip [data-room]")]; if (c[0]) { c[0].click(); await new Promise(r => setTimeout(r, 40)); } return { n: c.length, opened: !!$("hubBody").querySelector(".rm-mark") }; });
  chk(`Home shows the liveliest lounges (${home.n}) and opens them`, home.n >= 1 && home.opened);
  const blk = await pg.evaluate(async () => {
    openRoom("general"); await new Promise(r => setTimeout(r, 40));
    const m = COMM.rooms.general.msgs.find(x => x.by !== "me" && x.by !== "sys"), before = $("hubBody").querySelectorAll(".rm-m").length;
    commBlock(m.by, true); openRoom("general"); await new Promise(r => setTimeout(r, 40));
    const after = $("hubBody").querySelectorAll(".rm-m").length, cast = roomCast("general").some(u => u.id === m.by); commBlock(m.by, false); return { before, after, cast };
  });
  chk(`a blocked person's lines disappear and they're not "here" (${blk.before} → ${blk.after})`, blk.after < blk.before && !blk.cast);
  const back = await pg.evaluate(async () => {
    openRoom("general"); await new Promise(r => setTimeout(r, 40));
    $("hubBody").querySelector(".rm-m.them [data-u]").click(); await new Promise(r => setTimeout(r, 40)); hubBack(); await new Promise(r => setTimeout(r, 60));
    const room = $("hubBody").querySelectorAll(".rm-list .rm-m").length, live = ROOM_OPEN === "general";
    const u = COMM.users.find(x => COMM.dms[x.id]?.msgs.length); openDM(u.id); await new Promise(r => setTimeout(r, 40)); $("dmWho").click(); await new Promise(r => setTimeout(r, 40)); hubBack(); await new Promise(r => setTimeout(r, 60));
    return { room, live, dm: $("hubBody").querySelectorAll(".dm-list .dm-m").length };
  });
  chk("coming back from a profile, the lounge and a DM are drawn again", back.room > 0 && back.live && back.dm > 0);

  // ---------- merging two devices' copies; Mark all as read
  const mg = await pg.evaluate(() => {
    const A = commMerge(commBlank(), { rooms: { general: { msgs: [{ id: "a", by: "x", text: "1", at: 1 }], read: 5 } }, groups: { g1: { id: "g1", name: "Old", members: [], at: 1 } } });
    const B = commMerge(A, { rooms: { general: { msgs: [{ id: "b", by: "y", text: "2", at: 2 }], read: 9 } }, groups: { g1: { id: "g1", name: "New", members: [], at: 2 } }, rq: [{ id: "q", room: "general", due: 1 }] });
    commMarkRead(); return { n: B.rooms.general.msgs.length, read: B.rooms.general.read, name: B.groups.g1.name, rq: B.rq.length, un: roomUnread() };
  });
  chk("two devices' rooms and groups merge", mg.n === 2 && mg.read === 9 && mg.name === "New" && mg.rq === 1);
  chk("Mark all as read clears lounges and groups too", mg.un === 0);
  const wide = await pg.evaluate(async () => { openRoom("general"); await new Promise(r => setTimeout(r, 40)); return document.documentElement.scrollWidth <= innerWidth + 1; });
  chk("no sideways scroll", wide);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
