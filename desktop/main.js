// Lanternroom Windows program: a small Electron window that always loads the live site.
// Built into "Install Lanternroom.cmd" by desktop/mkinstaller.py (see CLAUDE.md, "Windows program").
const { app, BrowserWindow, shell, session } = require("electron");
const path = require("path"), fs = require("fs");

const SITE = "https://fethurz.github.io/Lanternroom/";
const ORIGIN = new URL(SITE).origin;

// sounds keep playing when the window is covered, minimised or in the background (v1.42)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-features", "CalculateNativeWinOcclusion");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");

app.setName("Lanternroom");
if (process.platform === "win32") app.setAppUserModelId("Fethurz.Lanternroom");

// one window only: opening it again brings the existing one forward
if (!app.requestSingleInstanceLock()) { app.quit(); return; }
let win = null;
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });

// remember where the window was and how big
const stateFile = () => path.join(app.getPath("userData"), "window.json");
function loadState() { try { return JSON.parse(fs.readFileSync(stateFile(), "utf8")); } catch { return { width: 1280, height: 860 }; } }
function saveState() {
  if (!win || win.isDestroyed()) return;
  try { fs.writeFileSync(stateFile(), JSON.stringify({ ...(win.isMaximized() || win.isFullScreen() ? loadState() : win.getBounds()), maximized: win.isMaximized() })); } catch {}
}

const isOurs = u => { try { return new URL(u).origin === ORIGIN; } catch { return false; } };
const external = u => { if (/^https?:|^mailto:/i.test(u)) shell.openExternal(u); };

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    x: st.x, y: st.y, width: st.width || 1280, height: st.height || 860, minWidth: 360, minHeight: 500,
    title: "Lanternroom", backgroundColor: "#15111c", autoHideMenuBar: true, show: false,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true, spellcheck: true },
  });
  win.setMenuBarVisibility(false);
  if (st.maximized) win.maximize();
  win.once("ready-to-show", () => win.show());
  for (const e of ["resize", "move", "close"]) win.on(e, saveState);
  win.on("closed", () => { win = null; });

  // other websites open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (isOurs(url)) return { action: "allow" }; external(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!isOurs(url)) { e.preventDefault(); external(url); } });

  // F11 full screen, Ctrl + / Ctrl - / Ctrl 0 zoom, Ctrl R or F5 reload
  win.webContents.on("before-input-event", (e, i) => {
    if (i.type !== "keyDown") return;
    const k = i.key, wc = win.webContents;
    if (k === "F11") { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (k === "F5" || (i.control && k.toLowerCase() === "r")) { wc.reloadIgnoringCache(); e.preventDefault(); }
    else if (i.control && (k === "=" || k === "+")) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); e.preventDefault(); }
    else if (i.control && k === "-") { wc.setZoomLevel(wc.getZoomLevel() - 0.5); e.preventDefault(); }
    else if (i.control && k === "0") { wc.setZoomLevel(0); e.preventDefault(); }
  });

  // if the site can't be reached (offline), show a small retry page
  win.webContents.on("did-fail-load", (e, code, desc, url, main) => {
    if (!main || code === -3) return;
    win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`<body style="background:#15111c;color:#eee;font:16px sans-serif;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><p>Lanternroom can't reach the internet right now.</p><button onclick="location.href='${SITE}'" style="font:inherit;padding:10px 22px;border-radius:20px;border:0;background:#e8a95b;color:#15111c;cursor:pointer">Try again</button></div></body>`));
  });

  win.loadURL(SITE);
}

app.whenReady().then(() => {
  // camera and microphone (for taking pictures in chats), notifications, clipboard
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb, details) => cb(isOurs(details.requestingUrl || wc.getURL()) && ["media", "notifications", "clipboard-read", "clipboard-sanitized-write", "fullscreen"].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm, origin) => isOurs(origin) && ["media", "notifications", "clipboard-read", "clipboard-sanitized-write", "fullscreen"].includes(perm));
  createWindow();
});
app.on("window-all-closed", () => app.quit());
