const { app, BrowserWindow, Menu, shell, ipcMain, clipboard } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

function canOpenExternal(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch (_) {
    return false;
  }
}
function isAppFile(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "file:") return false;
    const target = path.normalize(decodeURIComponent(parsed.pathname));
    const appRoot = path.normalize(path.join(__dirname, ".."));
    const relative = path.relative(appRoot, target);
    return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
  } catch (_) {
    return false;
  }
}

function libraryPath() {
  return path.join(app.getPath("userData"), "md-style-library.json");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1240,
    minHeight: 780,
    title: "MD Style",
    backgroundColor: "#F2F0EA",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile(path.join(__dirname, "..", "index.html"));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (canOpenExternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isAppFile(url)) return;
    event.preventDefault();
    if (canOpenExternal(url)) shell.openExternal(url);
  });
}

ipcMain.handle("clipboard:write-rich", (_event, payload) => {
  const html = String(payload?.html || "");
  const text = String(payload?.text || "");
  clipboard.write({ html, text });
  return true;
});

ipcMain.handle("clipboard:write-text", (_event, text) => {
  clipboard.writeText(String(text || ""));
  return true;
});

ipcMain.handle("library:load", async () => {
  try {
    const raw = await fs.readFile(libraryPath(), "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error("本地备份无法读取");
  }
});

ipcMain.handle("library:save", async (_event, payload) => {
  const body = {
    version: 1,
    savedAt: new Date().toISOString(),
    state: payload?.state || payload,
  };
  await fs.mkdir(app.getPath("userData"), { recursive: true });
  await fs.writeFile(libraryPath(), JSON.stringify(body, null, 2), "utf8");
  return true;
});

function createMenu() {
  const template = [
    {
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "视图",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  createMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
