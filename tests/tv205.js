// v2.5: stories from a bot tagged vore start with "Vore can happen" ticked; built-in packs and an explicit storyDef.vore keep theirs.
const open = require("./base.js");
(async () => {
  const W = +(process.env.W || 390);
  const { b, pg, errs } = await open({ width: W });
  const chk = (m, v) => console.log((v ? "PASS " : "FAIL ") + m);
  chk("version 2.5 or later", await pg.evaluate(() => ((v => v[0] * 1000 + +v[1])(VERSION.split(" ")[0].split("."))) >= 2005));
  const r = await pg.evaluate(async () => {
    const def = { title: "T", you: "you", setting: "s", pairs: [], meters: [], chapters: [{ t: "One", goal: "g", scenes: 3 }] };
    const mk = (id, tags, extra = {}) => ({ ...blankChar("world"), id, name: id, description: "d", tags, ...extra });
    S.chars.push(mk("tvoreA", ["fatal vore", "horror"], { storyDef: def }), mk("tvoreB", ["horror"], { storyDef: def }), mk("tvoreC", ["vore"], { storyDef: { ...def, vore: false } }), mk("tvoreD", ["Oral Vore"]), mk("tvoreE", ["devoured by plot"]));
    await saveChars();
    const ticked = async (pk, bot) => { storySetup(pk, bot); await new Promise(r => setTimeout(r, 120)); const v = $("stVore").checked, rows = !!document.querySelector('[data-vw="voreWho"]'); closeSheet(); return { v, rows }; };
    return {
      packVore: await ticked(packOf("bot:tvoreA"), null), packPlain: await ticked(packOf("bot:tvoreB"), null), packOff: await ticked(packOf("bot:tvoreC"), null),
      oneOff: await ticked(null, byId("tvoreD")), oneOffPlain: await ticked(null, byId("tvoreE")), builtIn: await ticked(packOf("monhun"), null)
    };
  });
  chk("a vore-tagged bot's story starts with vore ticked and its who-may-eat-you rows", r.packVore.v && r.packVore.rows);
  chk("a bot without a vore tag starts unticked", !r.packPlain.v && !r.packPlain.rows);
  chk("a story that says vore: false stays unticked", !r.packOff.v);
  chk("a one-off story from a vore-tagged bot (any case) starts ticked", r.oneOff.v);
  chk("'devoured' is not a vore tag", !r.oneOffPlain.v);
  chk("built-in packs keep their own setting", !r.builtIn.v);
  chk("no sideways scroll", await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  chk("no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""), !errs.length);
  await b.close();
})();
