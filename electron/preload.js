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
      savedAt:String(payload?.savedAt || ""),
      revision:Number(payload?.revision || 0),
    });
  },
  createSnapshot(payload, reason = "manual") {
    return ipcRenderer.invoke("library:snapshot", {
      state: payload?.state || payload,
      savedAt:String(payload?.savedAt || ""),
      revision:Number(payload?.revision || 0),
      reason:String(reason || "manual"),
    });
  },
  listRecoveryPoints() {
    return ipcRenderer.invoke("library:list-recovery");
  },
  loadRecoveryPoint(id) {
    return ipcRenderer.invoke("library:load-recovery", String(id || ""));
  },
});
