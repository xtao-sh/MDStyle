import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createLibraryStorage } = require("../electron/library-storage.js");
const root = await fs.mkdtemp(path.join(os.tmpdir(), "md-style-storage-"));
let clock = Date.parse("2026-07-10T00:00:00.000Z");
const storage = createLibraryStorage(root, { now:() => clock++ });

try {
  await Promise.all([
    storage.save({ state:{ docs:[{ id:"first" }] }, savedAt:"2026-07-10T01:00:00.000Z", revision:1 }),
    storage.save({ state:{ docs:[{ id:"second" }] }, savedAt:"2026-07-10T01:01:00.000Z", revision:2 }),
  ]);
  const saved = JSON.parse(await fs.readFile(storage.target, "utf8"));
  assert.equal(saved.state.docs[0].id, "second", "queued saves must preserve invocation order");
  assert.equal(saved.version, 2, "file storage must write a versioned envelope");
  assert.equal(saved.savedAt, "2026-07-10T01:01:00.000Z", "file storage must preserve the browser save timestamp");
  assert.equal(saved.revision, 2, "file storage must preserve the browser save revision");

  const snapshotPath = await storage.snapshot({ state:{ docs:[{ id:"before-import" }] }, savedAt:"2026-07-10T01:02:00.000Z", revision:3 }, "before-import");
  const snapshots = await fs.readdir(path.join(root, "library-snapshots"));
  assert.equal(snapshots.length, 1, "explicit snapshots must be written separately");
  assert.match(snapshots[0], /before-import\.json$/);
  assert.equal(path.basename(snapshotPath), snapshots[0]);

  const recoveryPoints = await storage.listRecoveryPoints();
  const snapshotPoint = recoveryPoints.find(point => point.id === `snapshot:${snapshots[0]}`);
  assert.ok(snapshotPoint, "explicit snapshots must appear in recovery history");
  assert.equal(snapshotPoint.documentCount, 1);
  assert.equal(snapshotPoint.savedAt, "2026-07-10T01:02:00.000Z");
  const restoredSnapshot = await storage.loadRecoveryPoint(snapshotPoint.id);
  assert.equal(restoredSnapshot.state.docs[0].id, "before-import", "selected recovery points must load their original state");
  await assert.rejects(storage.loadRecoveryPoint("snapshot:../outside.json"), /无效的恢复点/);

  await fs.writeFile(storage.target, "{broken", "utf8");
  const recovered = await storage.load();
  assert.equal(recovered.state.docs[0].id, "first", "corrupt primary data must fall back to a rotated backup");
} finally {
  await fs.rm(root, { recursive:true, force:true });
}

console.log("storage tests passed");
