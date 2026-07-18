const { app, BrowserWindow, Menu, shell, ipcMain, clipboard } = require("electron");
const path = require("node:path");
const { createLibraryStorage } = require("./library-storage");

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

let libraryStorage;
function getLibraryStorage() {
  if (!libraryStorage) libraryStorage = createLibraryStorage(app.getPath("userData"));
  return libraryStorage;
}
function requireTrustedIpc(event) {
  if (!isAppFile(event.senderFrame?.url || "")) throw new Error("不允许的应用请求");
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 760,
    minHeight: 600,
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

ipcMain.handle("clipboard:write-rich", (event, payload) => {
  requireTrustedIpc(event);
  const html = String(payload?.html || "");
  const text = String(payload?.text || "");
  clipboard.write({ html, text });
  return true;
});

ipcMain.handle("clipboard:write-text", (event, text) => {
  requireTrustedIpc(event);
  clipboard.writeText(String(text || ""));
  return true;
});

ipcMain.handle("library:load", async (event) => {
  requireTrustedIpc(event);
  try {
    return await getLibraryStorage().load();
  } catch (error) {
    throw new Error("本地备份无法读取");
  }
});

ipcMain.handle("library:save", async (event, payload) => {
  requireTrustedIpc(event);
  return getLibraryStorage().save(payload);
});

ipcMain.handle("library:snapshot", async (event, payload) => {
  requireTrustedIpc(event);
  await getLibraryStorage().snapshot(payload, payload?.reason || "manual");
  return true;
});

ipcMain.handle("library:list-recovery", async (event) => {
  requireTrustedIpc(event);
  return getLibraryStorage().listRecoveryPoints();
});

ipcMain.handle("library:load-recovery", async (event, id) => {
  requireTrustedIpc(event);
  return getLibraryStorage().loadRecoveryPoint(id);
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
