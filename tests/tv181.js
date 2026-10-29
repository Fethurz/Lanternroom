// v1.81: community stats (followers and likes over time, your bots, top fans, your activity, the site) and Your Year
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  let nU = 0;
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map(h => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${Math.random().toString(36).slice(2, 7)}`, tags: ["vore", "belly"], summary: "A " + Math.random().toString(36).slice(2, 12) + " thing " + Math.random().toString(36).slice(2, 9), appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    if (/sometimes post short blog posts/.test(s)) return { posts: [] };
    if (/You write site news on/.test(s)) return { title: "t" + Math.random(), text: "x" + Math.random() };
    if (/You write the next messages in/.test(s)) return { messages: [] };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY || ROOM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  await pg.evaluate(() => { window.commTick = async () => {}; });
  chk("version 1.81 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 1081));

  // made-up history: bots with chats this year and last year, badges, counters, a public bot with fans and comments, DMs
  const setup = await pg.evaluate(async () => {
    const now = Date.now(), Y = new Date().getFullYear(), lastYear = new Date(Y - 1, 5, 1).getTime(), mk = (name, tags, t) => ({ id: Math.random().toString(36).slice(2, 10) + t.toString(36), kind: "character", name, tags, description: "d", firstMessage: "*hi*" });
    const A = mk("Mossbelly", ["vore", "dragon"], now - 20 * 864e5), B = mk("Velvet", ["romance", "vampire"], now - 40 * 864e5), C = mk("Old Gus", ["vore"], lastYear);
    S.chars.push(A, B, C); await saveChars();
    await Store.set("chats:" + A.id, [{ id: "c1", personaId: S.personaId, created: now - 10 * 864e5, updated: now - 864e5, count: 340 }, { id: "c2", personaId: S.personaId, created: now - 5 * 864e5, updated: now, count: 60 }]);
    await Store.set("chats:" + B.id, [{ id: "c3", personaId: S.personaId, created: now - 30 * 864e5, updated: now - 2 * 864e5, count: 120 }]);
    await Store.set("chats:" + C.id, [{ id: "c4", personaId: S.personaId, created: lastYear, updated: lastYear + 864e5, count: 999 }]);
    const d = n => new Date(now - n * 864e5).toISOString().slice(0, 10);
    ACHS.days = [...new Set([...(ACHS.days || []), d(1), d(2), d(3), d(4), d(9), `${Y - 1}-06-01`])];
    ACHS.got = { ...ACHS.got, first_swallow: { at: now - 3 * 864e5 }, toot: { at: now - 864e5 }, [Object.keys(ACH_BY).find(k => ACH_BY[k].nw)]: { at: now - 2 * 864e5 }, shop_first: { at: lastYear } };
    ACHS.n.meals = { [A.id]: 7 }; ACHS.n.rubs = 140; ACHS.n.taps = 88; ACHS.n.dice = 31; ACHS.ch = { ...ACHS.ch, c1: { nat20: 3 } };
    // community
    await commPublish(A, true); COMM.pub[A.id].since = now - 12 * 864e5; COMM.pub[A.id].heat = 1.2;
    const [u1, u2, u3] = COMM.users;
    COMM.fans = { [u1.id]: now - 8 * 864e5, [u2.id]: now - 2 * 864e5 };
    COMM.comments["bot:" + A.id] = [1, 2, 3].map(i => ({ id: "k" + i, by: u2.id, text: "love it " + i, at: now - i * 3.6e6 })).concat([{ id: "k9", by: u1.id, text: "nice", at: now - 3.6e6 }]);
    COMM.dms[u3.id] = { msgs: Array.from({ length: 14 }, (_, i) => ({ id: "m" + i, from: i % 2 ? "me" : "them", text: "hey " + i, at: now - (20 - i) * 3.6e6 })), read: now };
    COMM.rooms = { general: { msgs: [{ id: "r1", by: "me", text: "hi all", at: now - 3.6e6 }], read: now } };
    commSave(); return { A: A.id, u1: u1.id, u2: u2.id, u3: u3.id };
  });

  // ---------- numbers over time
  const ot = await pg.evaluate(() => { const now = Date.now(), L = [], F = []; for (let i = 14; i >= 0; i--) { L.push(likesAt(now - i * 864e5)); F.push(followersAt(now - i * 864e5)); } return { L, F, mf: myFollowers(), up: L.every((v, i) => !i || v >= L[i - 1]) && F.every((v, i) => !i || v >= F[i - 1]), before: likesAt(now - 13 * 864e5) }; });
  chk(`likes and followers can be worked out for any past day and only grow (${ot.L[0]} → ${ot.L.at(-1)} likes, ${ot.F[0]} → ${ot.F.at(-1)} followers)`, ot.up && ot.L.at(-1) > 0 && ot.F.at(-1) === ot.mf && ot.before === 0);

  // ---------- the Stats page
  const st = await pg.evaluate(async () => {
    openCommunity(); hubTab("you"); await new Promise(r => setTimeout(r, 40)); $("meStats").click(); await new Promise(r => setTimeout(r, 60));
    const t = $("hubBody").textContent, figs = $("hubBody").querySelectorAll(".sc-fig"), fans = [...$("hubBody").querySelectorAll(".st-page .listrow[data-u]")].map(x => x.dataset.u);
    const svg = figs[0].querySelector("svg"), r = svg.getBoundingClientRect(); svg.dispatchEvent(new PointerEvent("pointermove", { clientX: r.left + r.width * 0.6, clientY: r.top + 20, bubbles: true }));
    const tip = figs[0].querySelector(".sc-tip"), cross = !figs[0].querySelector(".sc-hov").hidden;
    return { title: $("hubHead").textContent, figs: figs.length, line: !!figs[0].querySelector(".sc-line")?.getAttribute("d"), label: figs[0].querySelector("svg").getAttribute("aria-label"), tip: !tip.hidden && /followers/.test(tip.textContent), cross,
      tiles: /followers/.test(t) && /likes on your bots/.test(t) && /this week/.test(t), bot: /Mossbelly/.test($("hubBody").querySelector(".st-table")?.textContent || ""), fans, why: $("hubBody").querySelector(".st-page .listrow[data-u] .sub")?.textContent,
      act: /lounge messages/.test(t) && /texts sent/.test(t), site: /members/.test(t) && /online now/.test(t) && /new bots this week/.test(t), cre: /Top creators this week/.test(t), tags: /Trending tags this week/.test(t) && /vore · /.test(t) };
  });
  chk("Stats opens from your profile", /Stats/.test(st.title));
  chk("tiles: followers, likes, chats, comments, with this week's change", st.tiles);
  chk("two line charts (followers, likes) with a description for screen readers", st.figs === 2 && st.line && /Followers: /.test(st.label));
  chk("touching a chart shows a crosshair and the day's value", st.tip && st.cross);
  chk("your bots table", st.bot);
  chk(`top fans: the person who comments most comes first (${st.why})`, st.fans[0] === setup.u2 && /3 comments on your things/.test(st.why) && /follows you/.test(st.why));
  chk("what you've done, and the site: members, online, new bots, top creators, trending tags", st.act && st.site && st.cre && st.tags);
  const act = await pg.evaluate(() => myActivity());
  chk(`your activity counts (${act.texts} texts, ${act.lounge} lounge)`, act.texts === 7 && act.lounge === 1 && act.talked[0][1] === 14);

  // ---------- Your Year
  const yd = await pg.evaluate(async () => { const d = await yearData(); return { msgs: d.msgs, chats: d.chats, top: d.bots[0]?.c.name, n: d.bots.length, tags: d.tags, days: d.days, best: d.best, badges: d.badges, rarest: d.rarest?.n, made: d.made.map(c => c.name), meals: d.meals, nat20: d.nat20, friend: d.comm?.friend?.u.id, slides: yearSlides(d).length }; });
  chk(`this year's messages and new chats (${yd.msgs}, ${yd.chats}), last year's left out`, yd.msgs === 520 && yd.chats === 3);
  chk(`favourite bot and tags (${yd.top}; ${yd.tags.join(", ")})`, yd.top === "Mossbelly" && yd.n === 2 && yd.tags[0] === "vore" && yd.tags.includes("romance"));
  chk(`days played and the longest streak (${yd.days}, ${yd.best})`, yd.days >= 5 && yd.best >= 4);
  chk(`badges this year with the rarest (${yd.badges}, ${yd.rarest})`, yd.badges >= 3 && !!yd.rarest);
  chk(`bots made this year (${yd.made.join(", ")})`, yd.made.includes("Mossbelly") && yd.made.includes("Velvet") && !yd.made.includes("Old Gus"));
  chk(`play numbers (${yd.meals} swallowed, ${yd.nat20} nat 20s) and who you talked to most`, yd.meals === 7 && yd.nat20 === 3 && yd.friend === setup.u3);
  const yr = await pg.evaluate(async () => {
    $("stYear").click(); while (!$("yearPop")?._slides) await new Promise(r => setTimeout(r, 30));
    const p = $("yearPop"), n = p._slides.length, first = /Your \d{4} so far/.test(p.textContent), bars = p.querySelectorAll(".yr-bars i").length;
    p.querySelector(".yr-next").click(); const second = p.textContent; p.querySelector(".yr-next").click(); const third = p.textContent;
    p.querySelector(".yr-prev").click(); const back = p.textContent === second;
    const r = p.getBoundingClientRect(); p.dispatchEvent(new PointerEvent("pointerdown", { clientX: r.width * 0.8, bubbles: true })); p.dispatchEvent(new PointerEvent("pointerup", { clientX: r.width * 0.2, bubbles: true }));
    const swiped = p.textContent === third, on = p.querySelectorAll(".yr-bars i.done").length; await new Promise(r => setTimeout(r, 350));
    const texts = [p.textContent]; for (let i = 0; i < n + 2 && $("yearPop"); i++) { $("yearPop").querySelector(".yr-next").click(); if ($("yearPop")) texts.push($("yearPop").textContent); }
    return { n, first, bars, second: /520/.test(second) && /messages/.test(second), third: /Mossbelly/.test(third), back, swiped, on, all: texts.join(" | "), closed: !$("yearPop"), badge: !!ACHS.got.year_review, wide: document.documentElement.scrollWidth <= innerWidth + 1 };
  });
  chk(`Your Year opens from Stats with ${yr.n} slides and a progress bar for each`, yr.first && yr.bars === yr.n && yr.n >= 8);
  chk("tap right for next, left to go back, swipe to move on", yr.second && yr.third && yr.back && yr.swiped && yr.on === 2);
  if (!yr.closed || !/You made/.test(yr.all)) console.log(yr.all.slice(0, 1500), yr.closed, yr.badge);
  chk("slides: tags, bots made, along the way, badges, Lantern Commons", /What you were into/.test(yr.all) && /You made/.test(yr.all) && /Along the way/.test(yr.all) && /You earned/.test(yr.all) && /On Lantern Commons/.test(yr.all) && /You talked most with/.test(yr.all));
  chk("the last tap closes it, and the badge", yr.closed && yr.badge);
  const keys = await pg.evaluate(async () => {
    openYear(); while (!$("yearPop")?._slides) await new Promise(r => setTimeout(r, 30));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" })); const arrow = $("yearPop").querySelectorAll(".yr-bars i.done").length === 1;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); const esc1 = !$("yearPop") && HUB.open;
    hubClose(); $("btnSettings").click(); await new Promise(r => setTimeout(r, 60));
    const btn = $("sYear"); btn.click(); while (!$("yearPop")?._slides) await new Promise(r => setTimeout(r, 30));
    return { arrow, esc1, fromSettings: !!$("yearPop"), state: history.state?.lr === "in" };
  });
  chk("arrow keys move, Esc closes it and leaves the community open", keys.arrow && keys.esc1);
  chk("it also opens from Settings", keys.fromSettings);
  await pg.goBack(); await pg.waitForTimeout(200);
  chk("the phone's back button closes it", await pg.evaluate(() => !$("yearPop") && !$("sheet").hidden));
  const empty = await pg.evaluate(async () => { const d = await yearData(2019); const s = yearSlides(d); return s.length; });
  chk("an empty year still makes a short story (intro and ending)", empty === 2);
  chk("no page errors", !errs.length); if (errs.length) console.log(errs.slice(0, 5).join("\n"));
  await b.close();
})();
