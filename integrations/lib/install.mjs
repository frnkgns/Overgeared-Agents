// Install engine for OA runtime artifacts (spec section 4 / Milestone A + D).
//
// Properties required by the spec:
//   - idempotent: re-running changes nothing when content is unchanged;
//   - conflict-aware: never silently overwrite a file OA does not own or a file
//     the user edited after OA wrote it;
//   - reversible: every write is recorded in a manifest with a content hash and
//     can be uninstalled without deleting user files or whole directories;
//   - preflighted: conflicts are detected for every artifact before the first
//     write, so a failed run does not leave an undocumented partial install.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

export const MANIFEST_NAME = "oa-manifest.json";

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const toPosix = (p) => p.split("\\").join("/");

export function readManifest(root) {
  const path = join(root, MANIFEST_NAME);
  if (!existsSync(path)) return { files: [], previous: new Map() };
  try {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const previous = new Map((manifest.files ?? []).map((f) => [f.path, f.sha256]));
    return { files: manifest.files ?? [], previous, manifest };
  } catch (err) {
    throw new Error(`corrupt manifest at ${toPosix(relative(process.cwd(), path))}: ${err.message}`);
  }
}

export function install({ root, owner, target, files, force = false, check = false }) {
  const { previous } = readManifest(root);
  const plan = [];
  const conflicts = [];

  for (const file of files) {
    const rel = toPosix(file.relPath);
    const dest = join(root, file.relPath);
    const buf = Buffer.from(file.content);
    const hash = sha256(buf);

    if (existsSync(dest)) {
      const current = sha256(readFileSync(dest));
      const prior = previous.get(rel);
      if (prior === undefined) {
        conflicts.push({ rel, reason: "unowned existing file", file });
        continue;
      }
      if (current !== prior) {
        conflicts.push({ rel, reason: "owned file modified after export", file });
        continue;
      }
    }
    plan.push({ path: rel, kind: file.kind, sha256: hash, source: file.source ?? null, content: buf });
  }

  const errors = [];
  const notes = [];

  if (conflicts.length && !force) {
    for (const c of conflicts) {
      errors.push(`conflict: ${c.rel} (${c.reason}); rerun with --force to back up and reclaim`);
    }
    return { owned: plan, errors, notes, conflicts, dir: root, written: false };
  }
  if (check) return { owned: plan, errors, notes, conflicts, dir: root, written: false };

  const owned = [...plan];
  if (conflicts.length && force) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupRoot = join(root, "oa-backups", stamp);
    for (const c of conflicts) {
      const dest = join(root, c.rel);
      const backup = join(backupRoot, c.rel);
      mkdirSync(dirname(backup), { recursive: true });
      writeFileSync(backup, readFileSync(dest));
      notes.push(`backed up ${c.rel} -> ${toPosix(relative(root, backup))}`);
    }
  }
  for (const c of conflicts) {
    const dest = join(root, c.rel);
    const buf = Buffer.from(c.file.content);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    owned.push({ path: c.rel, kind: "reclaimed", sha256: sha256(buf), source: c.file.source ?? null });
  }
  for (const p of plan) {
    const dest = join(root, p.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, p.content);
  }

  mkdirSync(root, { recursive: true });
  const manifest = {
    formatVersion: 2,
    owner,
    target,
    exportedAt: new Date().toISOString(),
    files: owned.map(({ content, ...rest }) => rest),
  };
  const manifestPath = join(root, MANIFEST_NAME);
  const tmp = `${manifestPath}.tmp`;
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(tmp, manifestPath);

  return { owned, errors, notes, conflicts, dir: root, written: true };
}

export function uninstall({ root }) {
  const manifestPath = join(root, MANIFEST_NAME);
  if (!existsSync(manifestPath)) {
    return { removed: [], preserved: [], errors: ["no OA manifest found; nothing to uninstall"] };
  }
  const { files } = readManifest(root);
  const removed = [];
  const preserved = [];
  const errors = [];

  for (const file of files) {
    const dest = join(root, file.path);
    if (!existsSync(dest)) continue;
    const current = sha256(readFileSync(dest));
    if (current !== file.sha256) {
      preserved.push(file.path);
      continue;
    }
    rmSync(dest);
    removed.push(file.path);
    pruneEmpty(dirname(dest), root);
  }

  rmSync(manifestPath);

  if (preserved.length) {
    errors.push(
      `${preserved.length} file(s) preserved because they changed after export (uninstall never deletes user edits)`,
    );
  }
  return { removed, preserved, errors };
}

function pruneEmpty(dir, stop) {
  let cur = dir;
  while (cur !== stop && cur.startsWith(stop)) {
    let entries;
    try {
      entries = readdirSync(cur);
    } catch {
      return;
    }
    if (entries.length > 0) return;
    try {
      rmdirSync(cur);
    } catch {
      return;
    }
    cur = dirname(cur);
  }
}
