// v1.98: choices always arrive (fallback call, mid-chat toggle, retry button), pop-ups tuck away while typing on phones,
// being inside sticks until you're let out, stricter chest/shop/about-to-eat triggers, casual community talk (worn phrases,
// emoji cap, no block gossip), lasting memories, and promises kept with the whole conversation (incl. profile changes).
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const sysOf = b => String(b.messages?.[0]?.content || ""), usrOf = b => String(b.messages?.[1]?.content || "");
  const seen = { ch: [], posts: [], prof: [], dm: [] };
  let nU = 0, dmReply = () => ({ messages: ["ok"], interest: 5, leaving: false, promises: [], remember: [] });
  const json = body => {
    const s = sysOf(body), u = usrOf(body);
    if (/You write the choices for the next move/.test(s)) { seen.ch.push(body); return { choices: [{ t: "*I step closer.*", risky: false }, { t: '"Make me."', risky: true }, { t: "*I wait.*" }] }; }
    if (/You invent the regulars/.test(s)) { const n = [...u.matchAll(/^(\d+)\. /gm)].length || 12; return { users: Array.from({ length: n }, (_, i) => { const k = ++nU; return { slot: i + 1, name: `Person ${k}`, handle: `p${k}`, bio: `Bio ${k}.`, taste: ["vore"], voice: "v" }; }) }; }
    if (/write new bot listings/.test(s)) { seen.posts.push(body); const hs = [...u.matchAll(/- @(\S+) \(/g)].map(m => m[1]); return { posts: hs.map((h, i) => ({ by: h, source: "", kind: "character", name: /told people/.test(u) ? "Mossbelly the Swamp Wyrm" : `Bot ${h} ${Date.now() % 100000} ${i}`, tags: ["vore"], summary: "A swamp wyrm.", appearance: "a", description: "d", scenario: "sc", firstMessage: "*Hi.*" })) }; }
    if (/editing your own profile because you said you would/.test(s)) { seen.prof.push(body); return { bio: "I make soft vore bots. Dating @me now and very happy about it.", pin: "", picture: "" }; }
    if (/private messages with/.test(s)) { seen.dm.push(body); return dmReply(body); }
    if (/write the comments people leave/.test(s)) return { comments: [] };
    return { summary: "x", facts: [] };
  };
  const Q = [];
  const tag = x => `\n[[mood: calm | place: Room | ambience: indoors | activity: ${x.act || "none"} | harm: none | hearing: ${x.hear || "outside"}]]`;
  const { b, pg, errs, calls } = await open({ width: W, json, stream: () => { const x = Q.shift() || {}; return (x.text || "*The scene goes on.*") + tag(x); } });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  const send = async (x, text = "go on") => { Q.push(x); const n = await pg.evaluate(() => S.chat.messages.length); await pg.fill("#input", text); await pg.evaluate(() => send()); await pg.waitForFunction(k => S.chat.messages.length >= k + 2 && !S.busy, n, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(400); };
  chk("version 1.98 or later", await pg.evaluate(() => +VERSION.split(" ")[0].split(".")[1] >= 98));

  // ---------- 1. choices
  await pg.evaluate(async () => { S.chars[0].choices = true; await openChat(S.chars[0].id); });
  await pg.waitForTimeout(600);
  await send({ text: "*She tilts her head.* \"Well?\"" });
  const c1 = await pg.evaluate(() => ({ n: S.chat.messages.at(-1).choices?.length || 0, bar: document.querySelectorAll("#choiceBar .choice").length }));
  chk(`a reply without a choices line still gets choices (${c1.n}, ${c1.bar} shown)`, c1.n === 3 && c1.bar === 3 && seen.ch.length === 1);
  // choices mode switched on mid-chat: the current reply gets them
  await pg.evaluate(async () => { S.chars[0].choices = false; S.chat.choices = false; await saveChat(); renderChoices(); });
  await send({ text: "*She waits for you.*" });
  const off = await pg.evaluate(() => S.chat.messages.at(-1).choices?.length || 0);
  chk("with choices off, no extra call", off === 0 && seen.ch.length === 1);
  await pg.click("#btnMore");
  await pg.waitForTimeout(300);
  const hasOpt = await pg.evaluate(() => !!document.getElementById("oChoices"));
  if (hasOpt) await pg.click("#oChoices"); else await pg.evaluate(async () => { S.chat.choices = true; await fillChoices(S.chat.messages.at(-1)); });
  await pg.waitForFunction(() => (S.chat.messages.at(-1).choices?.length || 0) > 0, null, { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(300);
  const c2 = await pg.evaluate(() => ({ n: S.chat.messages.at(-1).choices?.length || 0, bar: document.querySelectorAll("#choiceBar .choice").length, saved: !!S.chat.messages.at(-1).choicesBusy }));
  chk(`switching choices on mid-chat gives the current reply choices (${c2.n})`, c2.n === 3 && c2.bar === 3 && !c2.saved);
  // a reply with none shows a button to get them
  const btn = await pg.evaluate(() => { const l = S.chat.messages.at(-1); const keep = l.choices; l.choices = null; renderChoices(); const t = document.querySelector("#chGet")?.textContent || ""; l.choices = keep; renderChoices(); return t; });
  chk("a reply with no choices shows ↻ Get choices", /Get choices/.test(btn));

  // ---------- 2. pop-ups while typing
  const pop = await pg.evaluate(() => { S.chat.pendingGame = { kind: "duel", short: "You won the duel", text: "x" }; drawGames(sceneNow()); composerOpen(true); const on = $("chat").classList.contains("typing-now"); const wrap = getComputedStyle($("gameNow")).flexWrap; composerOpen(false); const off = $("chat").classList.contains("typing-now"); S.chat.pendingGame = null; drawGames(sceneNow()); return { on, off, wrap }; });
  chk(`typing marks the chat so phones tuck the pop-ups away (one row: ${pop.wrap})`, pop.on && !pop.off && pop.wrap === "nowrap");
  const css = await pg.evaluate(() => [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } }).some(r => /pointer: ?coarse/.test(r.conditionText || r.media?.mediaText || "") && /typing-now #gameNow/.test(r.cssText)));
  chk("the phone rule hides them while typing", css);

  // ---------- 3. scene context
  const ctx = await pg.evaluate(() => {
    const save = S.chat.messages; const A = (content, extra = {}) => ({ id: uid(), role: "assistant", content, ...extra }), U = t => ({ id: uid(), role: "user", content: t });
    S.chat.messages = [A("*Her maw closes and she swallows you whole.*", { hear: "inside", act: "vore" }), U("I squirm."), A("*She pats her belly and hums to herself, walking on.*", { hear: "outside", act: "none" })];
    const still = sceneNow();
    S.chat.messages.push(U("I push."), A("*With a wet heave she spits you out onto the grass.*", { hear: "outside", act: "none" }));
    const out = sceneNow();
    S.chat.messages = [A("*She smiles at you, eyes bright.*", { hear: "outside", act: "none", vore: { type: "oral", stage: "before", prey: [{ you: true }], pred: {} } })];
    const look = voreState();
    S.chat.messages = [A("*She opens her jaws wide over you, ready to swallow you whole.*", { hear: "outside", act: "swallow", vore: { type: "oral", stage: "before", prey: [{ you: true }], pred: {} } })];
    const real = voreState();
    S.chat.messages = save;
    return { still, out, look: !!look, real: !!real, chestA: chestWords.test("Her chest heaves as she laughs."), chestB: chestWords.test("A battered chest sits in the corner."), shopA: shopWords.test("Who knows what's in store for you."), shopB: shopWords.test("The merchant lays out his wares.") };
  });
  chk(`still inside after a reply that forgot to say so (${ctx.still.hear}, ${ctx.still.act})`, ctx.still.hear === "inside" && ctx.still.act === "vore");
  chk(`spat out → outside (${ctx.out.hear})`, ctx.out.hear === "outside");
  chk("a smile is no 'about to be eaten' picture", !ctx.look && ctx.real);
  chk("'her chest heaves' offers no treasure chest; a battered chest does", !ctx.chestA && ctx.chestB);
  chk("'in store for you' isn't a shop; a merchant's wares are", !ctx.shopA && ctx.shopB);
  const pr = await pg.evaluate(() => { S.chat.messages.push({ id: uid(), role: "assistant", content: "*Her maw closes and she swallows you whole.*", hear: "inside", act: "vore" }, { id: uid(), role: "user", content: "hi" }); const p = buildPrompt(char(), S.chat, S.chat.messages.length); S.chat.messages.splice(-2); return JSON.stringify(p); });
  chk("the prompt tells the AI you're still inside", /still inside a body/.test(pr));

  // ---------- 4. community talk
  const idle = () => pg.evaluate(async () => { while (COMM_BUSY || DM_BUSY) await new Promise(r => setTimeout(r, 50)); });
  await pg.evaluate(async () => { await commLoad(); }); await idle(); await pg.evaluate(async () => { await commTick(true); }); await idle();
  const talk = await pg.evaluate(() => {
    const t = cmTidy("omg 😍😍😍 this is so good 🔥🔥 ✨ 💀 lol");
    const k = Object.keys(COMM.comments)[0] || "bot:x"; COMM.comments[k] = COMM.comments[k] || [];
    for (let i = 0; i < 5; i++) COMM.comments[k].push({ id: uid(), by: COMM.users[i].id, text: `honestly the vibes are immaculate on this one ${i}`, at: Date.now() });
    CM_WORN.at = 0; const v = commVoice();
    return { t, worn: /vibes are immaculate/.test(v), casual: /casually/.test(v) && /emoji rarely/i.test(v) && /blocking/.test(v) };
  });
  const emo = [...talk.t.matchAll(/\p{Extended_Pictographic}/gu)].length;
  chk(`emoji capped (${talk.t})`, emo === 2);
  chk("worn-out site phrases are named to the writers", talk.worn);
  chk("casual-talk rule in the prompts (and never mention blocking)", talk.casual);

  // ---------- 5. memories and promises
  const uid0 = await pg.evaluate(() => { const u = COMM.users[3], h = Math.floor(localHour(u)); u.sleep = [(h + 8) % 24, (h + 10) % 24]; return u.id; });
  dmReply = () => ({ messages: ["yes!! we're officially dating now", "putting it in my bio rn"], interest: 9, leaving: false,
    promises: [{ kind: "profile", about: "add to my bio that I'm dating them", bot: "", when: "now" }, { kind: "bot", about: "a swamp wyrm bot", bot: "Mossbelly", when: "soon" }],
    remember: ["We are dating (since today)."] });
  const m1 = await pg.evaluate(async id => {
    COMM.dms[id] = { msgs: [], read: 0 }; dmSend(id, "will you be my girlfriend? also make the swamp wyrm we talked about: green, slimy, gentle, slurps me up whole");
    const q = COMM.dmq.find(x => x.user === id); q.due = Date.now() + 300; q.typingAt = Date.now() - 1000;
    while (DM_BUSY) await new Promise(r => setTimeout(r, 50)); await dmPump(); await new Promise(r => setTimeout(r, 900)); await dmPump();
    const prs = COMM.promises.filter(x => x.by === id);
    return { mem: memOf(id).map(m => m.t), prs: prs.map(p => ({ kind: p.kind, when: p.when, ctx: p.ctx, due: p.due - Date.now() })), knows: dmKnows(userOf(id)) };
  }, uid0);
  chk("the DM prompt asks what to remember", /"remember"/.test(sysOf(seen.dm.at(-1))));
  chk(`dating is remembered (${m1.mem.join("; ")})`, m1.mem.some(t => /dating/.test(t)));
  chk("and fed back to them in what they know", /dating/.test(m1.knows) && /never forget/.test(m1.knows));
  const prof = m1.prs.find(p => p.kind === "profile"), bot = m1.prs.find(p => p.kind === "bot");
  chk(`"putting it in my bio rn" becomes a profile promise due right away (${prof ? Math.round(prof.due / 1000) : "?"} s)`, prof && prof.when === "now" && prof.due < 3 * 60e3);
  chk("the promise keeps the conversation", bot && /slimy, gentle/.test(bot.ctx));
  const kept = await pg.evaluate(async id => {
    for (const p of COMM.promises.filter(x => x.by === id)) p.due = Date.now() - 1000;
    while (COMM_BUSY) await new Promise(r => setTimeout(r, 50)); await commKeepPromises(); await commKeepPromises();
    const u = userOf(id); return { bio: u.bio, done: COMM.promises.filter(x => x.by === id && x.done && !x.failed).map(x => x.kind), hist: (u.hist || []).some(h => h.what === "bio") };
  }, uid0);
  chk(`the bio really changes (${kept.bio})`, /Dating/.test(kept.bio) && kept.hist && kept.done.includes("profile"));
  chk("the profile edit saw the conversation and the memory", seen.prof.length && /girlfriend/.test(usrOf(seen.prof.at(-1))) && /dating/i.test(usrOf(seen.prof.at(-1))));
  chk("the promised bot is written with the whole conversation", kept.done.includes("bot") && seen.posts.some(p => /slimy, gentle/.test(usrOf(p))));
  const mg = await pg.evaluate(() => { const a = { mem: { x: [{ id: "1", t: "a", at: 1 }] } }, b = { mem: { x: [{ id: "2", t: "b", at: 2 }], y: [{ id: "3", t: "c", at: 3 }] } }; const m = commMerge(a, b); return (m.mem.x || []).length + (m.mem.y || []).length; });
  chk("memories merge between devices", mg === 3);
  const sx = await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  chk("no sideways scroll", sx);
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
