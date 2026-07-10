const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mdStyleClipboard", {
  writeRich(payload) {
    return ipcRenderer.invoke("clipboard:write-rich", {
      html: String(payload?.html || ""),
      text: String(payload?.text || ""),
    });
  },
  writeText(text) {
    return ipcRenderer.invoke("clipboard:write-text", String(text || ""));
  },
});

contextBridge.exposeInMainWorld("mdStyleStorage", {
  loadLibrary() {
    return ipcRenderer.invoke("library:load");
  },
  saveLibrary(payload) {
    return ipcRenderer.invoke("library:save", {
      state: payload?.state || payload,
    });
  },
  createSnapshot(payload, reason = "manual") {
    return ipcRenderer.invoke("library:snapshot", {
      state: payload?.state || payload,
      reason:String(reason || "manual"),
    });
  },
});
