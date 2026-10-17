// shared harness: serves the repo at http://local/lr/, mocks DeepSeek
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const ROOT = "/home/claude/lanternroom";
module.exports = async function open({ width = 390, json, stream } = {}) {
  const b = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const pg = await b.newPage({ viewport: { width, height: 900 } });
  const errs = []; const calls = [];
  pg.on("pageerror", e => errs.push("pageerror: " + e.message));
  pg.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text())) errs.push("console: " + m.text()); });
  await pg.route("**/*", async r => {
    const u = new URL(r.request().url());
    if (u.host === "local") {
      const p = decodeURIComponent(u.pathname.replace(/^\/lr\/?/, "")) || "index.html"; const f = path.join(ROOT, p);
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: "" });
      const ct = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".ogg": "audio/ogg", ".png": "image/png", ".svg": "image/svg+xml" }[path.extname(f)] || "application/octet-stream";
      return r.fulfill({ status: 200, body: fs.readFileSync(f), headers: { "content-type": ct } });
    }
    if (u.host === "api.deepseek.com") {
      const body = JSON.parse(r.request().postData() || "{}"); calls.push(body);
      if (body.stream) { const txt = stream ? stream(body) : "Hi.\n[[mood: calm | place: Room | ambience: indoors | activity: none | harm: none | hearing: outside]]"; const parts = txt.match(/[\s\S]{1,40}/g).map(c => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`).join("") + "data: [DONE]\n\n"; return r.fulfill({ status: 200, body: parts, headers: { "content-type": "text/event-stream" } }); }
      const out = json ? json(body) : { summary: "x", facts: [] };
      return r.fulfill({ status: 200, body: JSON.stringify({ choices: [{ message: { content: typeof out === "string" ? out : JSON.stringify(out) } }] }), headers: { "content-type": "application/json" } });
    }
    return r.abort();
  });
  await pg.goto("http://local/lr/index.html"); await pg.evaluate(() => BOOTED);
  await pg.evaluate(async () => { S.settings.apiKey = "sk-test"; await saveSettings(); });
  return { b, pg, errs, calls };
};
