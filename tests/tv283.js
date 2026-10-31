// v2.8.3: rules for every story (Settings → Stories). They reach every story scene alongside the chat rules (story rules
// last, winning clashes) and every prompt that writes stories: a bot's full story, the story quiz, remixes, a new plot and
// more chapters. Empty = nothing added.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const seen = [], sys = [];
  const tag = "\n[[mood: calm | place: Hall | ambience: indoors | activity: none | hearing: outside]]";
  const scene = t => `${t}\n[[story: ${JSON.stringify({ choices: [{ t: "Stay.", leans: [] }, { t: "Run.", leans: [] }] })}]]${tag}`;
  const ch = n => Array.from({ length: n }, (_, i) => ({ t: "C" + i, goal: "G" + i, scenes: 6 }));
  const { b, pg, errs } = await open({
    width: W,
    stream: body => { seen.push(String(body.messages?.[0]?.content || "")); return scene("**Chapter 1: C0**\n\nThe hall is quiet."); },
    json: body => {
      const s = String(body.messages?.[0]?.content || ""); sys.push(s);
      if (/^You turn a roleplay bot into a full interactive novel/.test(s)) return { title: "T", icon: "📖", blurb: "b", setting: "s", you: "a reader", roles: ["a reader"], pairs: [{ a: "A", b: "B" }], meters: [{ n: "Health", v: 100, max: 100 }], chapters: ch(7) };
      if (/^You plan a new story for/.test(s)) return { chapters: ch(7) };
      if (/^You design a Choice of Games style interactive novel/.test(s)) return { title: "T", you: "a reader", setting: "s", pairs: [{ a: "A", b: "B" }], meters: [{ n: "Gold", v: 10, max: 0 }], chapters: ch(7) };
      if (/^You plan the next chapters/.test(s)) return { chapters: ch(3) };
      if (/^You remix an interactive story/.test(s)) return { changes: ["x"], story: { roles: ["a thief"] } };
      return { summary: "x", facts: [] };
    }
  });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.8.3 or later", await pg.evaluate(() => { const v = VERSION.split(" ")[0].split(".").map(Number); return v[0] * 1e6 + v[1] * 1e3 + (v[2] || 0) >= 2008003; }));
  // the Settings tab, used like a person would
  const ui = await pg.evaluate(async () => {
    $("btnSettings").click(); await new Promise(r => setTimeout(r, 300));
    const tab = document.querySelector('.set-tabs [data-k="stories"]'); const label = tab?.textContent; tab.click(); await new Promise(r => setTimeout(r, 100));
    const panel = document.querySelector('.set-panel[data-k="stories"]');
    const txt = panel.textContent, hidden = document.querySelector('.set-panel[data-k="chats"]').hidden;
    const wrap = panel.querySelector(".rtabs");
    const add = async t => { wrap.querySelector('[data-i="add"]').click(); await new Promise(r => setTimeout(r, 50)); const ed = wrap.querySelector("textarea"); ed.value = t; ed.dispatchEvent(new Event("input")); };
    await add("Never end a scene on a question aimed at the reader."); await add("Put every line of dialogue in quotes on its own line.");
    const tabs = [...wrap.querySelectorAll(".tab")].map(x => x.textContent);
    S.settings.globalInstr = "Keep replies vivid."; $("sGlobal").value = "Keep replies vivid.";
    await $("sSave").onclick(); await new Promise(r => setTimeout(r, 300));
    return { label, txt, hidden, tabs, saved: S.settings.storyRules, inChats: !!document.querySelector('.set-panel[data-k="chats"] #sStoryRules') };
  });
  chk(`Settings has a Stories tab (${ui.label})`, ui.label === "Stories" && ui.hidden && /Rules for every story/.test(ui.txt) && !ui.inChats);
  chk(`rules are added one per tab (${ui.tabs.join(" | ")})`, ui.tabs.length === 3 && ui.tabs[2] === "+ New rule");
  chk("saving keeps both rules", ui.saved === "Never end a scene on a question aimed at the reader.\n\nPut every line of dialogue in quotes on its own line.");
  // a story scene gets both the chat rules and the story rules, story rules after
  await pg.evaluate(async () => {
    closeSheet();
    const def = { title: "Road", you: "a thief", roles: ["a thief"], setting: "A road.", pairs: [{ a: "Bold", b: "Careful" }], meters: [{ k: "m0", n: "Health", v: 100, max: 100 }], chapters: [1, 2, 3].map(i => ({ t: "C" + i, goal: "G" + i, scenes: 6 })) };
    S.chars.push({ ...blankChar("world"), id: "trd", name: "Road", description: "A long road.", storyDef: def }); await saveChars();
    storySetup(packOf("bot:trd"), null); await new Promise(r => setTimeout(r, 150)); $("stGo").click();
    for (let i = 0; i < 200 && !(S.chat?.story && S.chat.messages.length && !S.busy); i++) await new Promise(r => setTimeout(r, 50));
  });
  const sc = seen.find(s => /# The user's rules for every story/.test(s)) || "";
  chk("a story scene gets the story rules", /Never end a scene on a question aimed at the reader\.\n\nPut every line of dialogue in quotes/.test(sc));
  chk("…and still the chat rules, with the story rules after them", /# The user's instructions for every chat[\s\S]*Keep replies vivid\.[\s\S]*# The user's rules for every story/.test(sc));
  // every prompt that writes stories
  await pg.evaluate(async () => {
    const fake = { ...S.chat, story: JSON.parse(JSON.stringify(S.chat.story)) }; // the run started above
    leaveChat();
    await storyDefFor(byId("trd"));
    await storyPlan(STORY_PACKS.dragon, null);
    await storyPlan(null, byId("trd"));
    const save = window.saveChat; window.saveChat = async () => {}; try { await storyExtend(fake); } finally { window.saveChat = save; }
    await remixPlan(packOf("bot:trd"), "make it longer");
    await sqStoryDef({ name: "W", description: "d", cast: [], firstMessages: ["o"], lore: [] }, { kind: "story", q: {} }, "req").catch(() => {});
  });
  const has = re => sys.some(s => re.test(s) && /The user's rules for every story[\s\S]*Never end a scene on a question/.test(s));
  chk("a bot's full story is written to them", has(/^You turn a roleplay bot/));
  chk("a new plot for a classic story", has(/^You plan a new story for/));
  chk("a one-off story from a bot", has(/^You design a Choice of Games style interactive novel/));
  chk("more chapters", has(/^You plan the next chapters/));
  chk("remixes", has(/^You remix an interactive story/));
  chk("the story quiz", has(/^You turn a world bot into a full interactive novel/));
  // empty rules add nothing
  const none = await pg.evaluate(async () => { S.settings.storyRules = ""; return storyRulesAsk() === ""; });
  chk("no rules, nothing added", none);
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
