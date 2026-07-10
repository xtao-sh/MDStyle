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
    storage.save({ state:{ docs:[{ id:"first" }] } }),
    storage.save({ state:{ docs:[{ id:"second" }] } }),
  ]);
  const saved = JSON.parse(await fs.readFile(storage.target, "utf8"));
  assert.equal(saved.state.docs[0].id, "second", "queued saves must preserve invocation order");

  await storage.snapshot({ state:{ docs:[{ id:"before-import" }] } }, "before-import");
  const snapshots = await fs.readdir(path.join(root, "library-snapshots"));
  assert.equal(snapshots.length, 1, "explicit snapshots must be written separately");
  assert.match(snapshots[0], /before-import\.json$/);

  await fs.writeFile(storage.target, "{broken", "utf8");
  const recovered = await storage.load();
  assert.equal(recovered.state.docs[0].id, "first", "corrupt primary data must fall back to a rotated backup");
} finally {
  await fs.rm(root, { recursive:true, force:true });
}

console.log("storage tests passed");
