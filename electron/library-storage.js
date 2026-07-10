const fs = require("node:fs/promises");
const path = require("node:path");

const MAX_LIBRARY_BYTES = 25 * 1024 * 1024;
const SNAPSHOT_LIMIT = 10;
const BACKUP_LIMIT = 3;
const BACKUP_INTERVAL_MS = 5 * 60 * 1000;

function createLibraryStorage(userDataPath, options = {}) {
  const now = options.now || (() => Date.now());
  const target = path.join(userDataPath, "md-style-library.json");
  const snapshotDir = path.join(userDataPath, "library-snapshots");
  let writeQueue = Promise.resolve();
  let lastBackupAt = 0;

  function serialize(payload) {
    const body = {
      version: 1,
      savedAt: new Date(now()).toISOString(),
      state: payload?.state || payload,
    };
    const content = JSON.stringify(body, null, 2);
    if (Buffer.byteLength(content, "utf8") > MAX_LIBRARY_BYTES) {
      throw new Error("文档库超过 25 MB，无法安全保存");
    }
    return content;
  }

  function enqueue(task) {
    const current = writeQueue.then(task);
    writeQueue = current.catch(() => undefined);
    return current;
  }

  async function atomicWrite(filename, content) {
    await fs.mkdir(path.dirname(filename), { recursive: true });
    const temp = `${filename}.${process.pid}.${now()}.tmp`;
    try {
      await fs.writeFile(temp, content, "utf8");
      await fs.rename(temp, filename);
    } finally {
      await fs.rm(temp, { force: true }).catch(() => undefined);
    }
  }

  function backupPath(index) {
    return path.join(userDataPath, `md-style-library.backup-${index}.json`);
  }

  async function rotateBackups() {
    if (now() - lastBackupAt < BACKUP_INTERVAL_MS) return;
    try {
      await fs.access(target);
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (let index = BACKUP_LIMIT; index >= 2; index--) {
      await fs.rename(backupPath(index - 1), backupPath(index)).catch(error => {
        if (error.code !== "ENOENT") throw error;
      });
    }
    await fs.copyFile(target, backupPath(1));
    lastBackupAt = now();
  }

  async function save(payload) {
    const content = serialize(payload);
    return enqueue(async () => {
      await rotateBackups();
      await atomicWrite(target, content);
      return true;
    });
  }

  async function load() {
    const candidates = [target, ...Array.from({ length: BACKUP_LIMIT }, (_, index) => backupPath(index + 1))];
    let lastError = null;
    for (const filename of candidates) {
      try {
        return JSON.parse(await fs.readFile(filename, "utf8"));
      } catch (error) {
        if (error.code !== "ENOENT") lastError = error;
      }
    }
    if (lastError) throw new Error("本地备份无法读取");
    return null;
  }

  async function snapshot(payload, reason = "manual") {
    const content = serialize(payload);
    return enqueue(async () => {
      await fs.mkdir(snapshotDir, { recursive: true });
      const stamp = new Date(now()).toISOString().replace(/[:.]/g, "-");
      const safeReason = String(reason || "manual").replace(/[^a-z0-9_-]/gi, "-").slice(0, 32);
      const filename = path.join(snapshotDir, `${stamp}-${safeReason}.json`);
      await atomicWrite(filename, content);
      const entries = (await fs.readdir(snapshotDir, { withFileTypes: true }))
        .filter(entry => entry.isFile() && entry.name.endsWith(".json"))
        .map(entry => entry.name)
        .sort()
        .reverse();
      await Promise.all(entries.slice(SNAPSHOT_LIMIT).map(name => fs.rm(path.join(snapshotDir, name), { force: true })));
      return filename;
    });
  }

  return { load, save, snapshot, target };
}

module.exports = { createLibraryStorage, MAX_LIBRARY_BYTES };
