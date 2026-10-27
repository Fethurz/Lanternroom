// v1.69: your own community profile (bio, status, pinned bot, your Wardrobe look, blog posts people react to),
// only people who know you react to you, and people only say true things about their own bots.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), userOf_ = b => String(b.messages?.[1]?.content || "");
  let nU = 0, blogMode = "claim";
  const json = body => {
    const s = sysOf(body), u = userOf_(body);
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: `Bot ${h} ${i}`, tags: ["vore"], summary: "s", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/customise how the app looks/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { people: hs.map(h => ({ handle: h, theme: "pal:lantern", status: "just posted my new bot!! go check it" })) }; }
    if (/short blog posts or announcements/.test(s)) { const hs = [...u.matchAll(/- @(\w+)/g)].map(m => m[1]); return { posts: hs.map(h => blogMode === "claim" ? { by: h, title: "NEW BOT", text: "just dropped a new bot, go check it out!!" } : { by: h, title: "requests open", text: "taking a couple of requests this week" }) }; }
    if (/write the comments people leave/.test(s)) { const lst = k => ((u.split("## Listing key " + k + ":")[1] || "").split("LISTING (the only facts about this bot):\n")[1] || "").split("\n")[0].split(" ").slice(0, 6).join(" "); const hs = [...u.matchAll(/- @(\w+) \(/g)].map(m => m[1]), ks = [...u.matchAll(/Listing key (\S+):/g)].map(m => m[1]); const only = (u.match(/may comment on this post: @(\w+)/) || [])[1]; return { comments: ks.map((k, i) => ({ on: k, by: only && u.split("## Listing key " + k)[1]?.split("## Listing key")[0]?.includes("Only these people") ? only : hs[i % hs.length], about: lst(k), text: "love this! " + lst(k) + " " + i })) }; }
    if (/^You are @(\w+)/.test(s)) return { text: "ty!!" };
    return { summary: "x", facts: [] };
  };
  const { b, pg, errs, calls } = await open({ width: W, json });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const wait = ms => pg.waitForTimeout(ms);
  const tick = () => pg.evaluate(async () => { while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commTick(true); });
  await pg.evaluate(async () => { await commLoad(); }); await tick();

  // ---- truth
  const bl = calls.find(c => /short blog posts or announcements/.test(sysOf(c)));
  const blogs0 = await pg.evaluate(() => COMM.blogs.map(b => ({ by: b.by, text: b.text, recent: commUserPosts(userOf(b.by) || { id: "" }).some(p => Date.now() - p.at < 3 * 864e5) })));
  chk("a post claiming a new bot is dropped unless they really posted one lately", blogs0.every(x => !/just dropped a new bot/.test(x.text) || x.recent));
  if (bl) chk("the blog prompt lists each person's real bots with dates and says only true things", /Their bots: ("|none yet \(they have never posted a bot\))/.test(userOf_(bl)) && /Never claim a new bot/.test(sysOf(bl)));
  else console.log("PASS (no blog round ran yet)");
  const st = await pg.evaluate(() => COMM.users.map(u => ({ s: u.status || "", has: commUserPosts(u).some(p => Date.now() - p.at < 3 * 864e5) })));
  chk("v1.76: nobody has a status any more", st.every(x => !x.s));
  chk("the outfit prompt asks for no status", calls.some(c => /customise how the app looks/.test(sysOf(c)) && !/"status"/.test(sysOf(c))));
  chk("claimOk: true claims pass, false ones don't", await pg.evaluate(() => { const u = COMM.users.find(x => !commUserPosts(x).length); const v = COMM.posts[0] && userOf(COMM.posts[0].by); return !claimOk(u, "just made a new bot!") && claimOk(u, "working on a WIP, out soon") && (!v || claimOk(v, "just posted my new bot")); }));

  // ---- your profile
  await pg.evaluate(async () => { S.chars[0].pub = true; await commPublish(S.chars[0], true); openCommunity("you"); }); await wait(300);
  chk("You is your own profile page (name, @handle, stats, Edit, New post, Activity)", await pg.evaluate(() => !!document.querySelector("#hubBody .cm-pfx") && /@\w+ · you/.test(cbody().textContent) && !!$("meEdit") && !!$("mePost") && !!$("hubActB") && /followers/.test(cbody().textContent)));
  await pg.click("#meEdit"); await wait(200);
  await pg.fill("#cmMe", "Lanternlover"); await pg.fill("#meBio", "I make cozy vore bots and the odd dragon. Requests sometimes open.");
  await pg.selectOption("#mePin", await pg.evaluate(() => S.chars[0].id)); await pg.click("#meSave"); await wait(300);
  const me = await pg.evaluate(() => ({ ...COMM.me, title: HUB.cur?.title, txt: cbody().textContent }));
  chk("Edit profile saves name, bio and pinned bot and goes back", me.name === "Lanternlover" && !me.status && !(await pg.$("#meStatus")) && /cozy vore bots/.test(me.bio) && me.pin && me.title === "__tab");
  chk("…shown on your profile with the pin", /cozy vore bots/.test(me.txt) && /Pinned/.test(me.txt));
  await pg.evaluate(async () => { ACHS.shop.owned["theme:star"] = Date.now(); ACHS.shop.wear.theme = "star"; hubTab("you"); }); await wait(200);
  chk("your profile wears your Wardrobe theme", await pg.evaluate(() => document.querySelector("#hubBody .cm-pfx").classList.contains("st-star")));
  await pg.click("#mePost"); await wait(200);
  await pg.fill("#npTitle", "Requests open"); await pg.fill("#npText", "Taking two requests this week, vore or dragons."); await pg.click("#npGo"); await wait(300);
  const post = await pg.evaluate(() => { const x = COMM.blogs.find(b => b.by === "me"); return x && { id: x.id, title: HUB.cur?.title, back: HUB.stack.length, del: !!$("npDel") }; });
  chk("New post publishes it and opens it (you can delete your own)", post && post.title === "Requests open" && post.del);
  await pg.click("#hubBack"); await wait(200);
  chk("…back on your profile it's listed under Posts", /Requests open/.test(await pg.evaluate(() => cbody().textContent)));

  // ---- only people who know you react
  const noAud = await pg.evaluate(() => { COMM.fans = {}; COMM.dms = {}; Object.keys(COMM.comments).forEach(t => { if (t.startsWith("bot:")) delete COMM.comments[t]; }); return { aud: myAudience().length, targets: Array.from({ length: 30 }, () => commTargets(3)).flat().filter(t => t === "blog:" + COMM.blogs.find(b => b.by === "me").id).length }; });
  chk("nobody knows you yet: nobody comments on your post", noAud.aud === 0 && noAud.targets === 0);
  const fan = await pg.evaluate(() => { const u = COMM.users[5]; COMM.fans[u.id] = Date.now() - 1000; commSave(); return u.id; });
  const withAud = await pg.evaluate(() => { const id = "blog:" + COMM.blogs.find(b => b.by === "me").id; return Array.from({ length: 30 }, () => commTargets(3)).flat().filter(t => t === id).length; });
  chk("someone follows you: your post can get comments", withAud > 0);
  const made = await pg.evaluate(async () => { const id = "blog:" + COMM.blogs.find(b => b.by === "me").id; for (let i = 0; i < 25; i++) { await commComments(3); if ((COMM.comments[id] || []).length) break; } return (COMM.comments[id] || []).map(x => x.by); });
  const aud = await pg.evaluate(() => myAudience().map(u => u.id)); chk("…and only people who know you write them", made.length > 0 && made.every(id => aud.includes(id)) && aud.includes(fan));
  chk("the comment prompt says who knows you", calls.some(c => /write the comments people leave/.test(sysOf(c)) && /Only these people know Lanternlover/.test(userOf_(c))));
  chk("knowsMe explains how (follows)", await pg.evaluate(id => /follow them/.test(knowsMe(userOf(id))), fan));
  // replying on your own post asks someone who knows you, never "me"
  const sched = await pg.evaluate(() => { const id = "blog:" + COMM.blogs.find(b => b.by === "me").id; const c = { id: uid(), by: "me", text: "thanks!", at: Date.now(), replyTo: (COMM.comments[id] || [])[0]?.id || "" }; (COMM.comments[id] = COMM.comments[id] || []).push(c); COMM.pending = []; commSchedule(id, c); return COMM.pending.map(p => p.by); });
  chk("your reply on your own post gets an answer from someone who knows you", sched.length >= 1 && !sched.includes("me"));
  // DMs know your profile
  chk("people you message know your bio and posts", await pg.evaluate(id => /cozy vore bots/.test(dmKnows(userOf(id))) && /Requests open/.test(dmKnows(userOf(id))), fan));
  // your name in comments opens your profile
  await pg.evaluate(() => openBlog(COMM.blogs.find(b => b.by === "me").id)); await wait(300);
  await pg.click(".cm-who[data-me]"); await wait(200);
  chk("tapping your name in a thread opens your profile", await pg.evaluate(() => HUB.tab === "you" && !!$("meEdit")));
  await pg.evaluate(() => hubClose());

  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors (" + errs.length + ")", errs.length === 0); if (errs.length) console.log(errs.join("\n"));
  await b.close();
})().catch(e => { console.log("FAIL crashed: " + e.stack); process.exit(1); });
