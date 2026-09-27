#!/usr/bin/env node
/**
 * sync-to-flashbob.mjs
 *
 * Cross-platform (Node >= 18) script that mirrors the current workspace to a
 * running FlashBob server via POST /api/sync.
 *
 * Usage:
 *   node flashbob/scripts/sync-to-flashbob.mjs [options]
 *
 * Options:
 *   --url <url>        FlashBob base URL  (default: http://localhost:5173)
 *   --root <path>      Workspace root to mirror (default: cwd)
 *   --name <name>      Workspace display name (default: root folder basename)
 *   --id <id>          Workspace ID to reuse (optional; auto-assigned on first run)
 *   --ignore <glob>    Extra glob patterns to ignore, comma-separated
 *
 * On success the assigned workspaceId is printed so you can pass --id on the
 * next run to patch rather than recreate the workspace.
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, relative, basename } from "node:path";
import { parseArgs } from "node:util";

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const { values: args } = parseArgs({
  options: {
    url:    { type: "string", default: "http://localhost:5173" },
    root:   { type: "string", default: process.cwd() },
    name:   { type: "string" },
    id:     { type: "string" },
    ignore: { type: "string", default: "" },
  },
  strict: false,
});

const FLASHBOB_URL   = args.url.replace(/\/$/, "");
const WORKSPACE_ROOT = args.root;
const WORKSPACE_NAME = args.name ?? basename(WORKSPACE_ROOT);
const WORKSPACE_ID   = args.id ?? undefined;

// ---------------------------------------------------------------------------
// Patterns that are never useful to mirror
// ---------------------------------------------------------------------------
const IGNORE_DIRS = new Set([
  "node_modules", ".git", ".svn", ".hg",
  "dist", "build", "out", ".next", ".nuxt", ".output",
  ".vite", ".turbo", ".cache", "__pycache__", ".pytest_cache",
  "coverage", ".nyc_output",
]);

const IGNORE_EXTENSIONS = new Set([
  // binaries / media
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico",
  "woff", "woff2", "ttf", "otf", "eot",
  "mp3", "mp4", "wav", "ogg", "mov", "avi",
  "zip", "gz", "tar", "bz2", "7z", "rar",
  "exe", "dll", "so", "dylib", "bin", "wasm",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  // lock files (large, low signal)
  "lock",
]);

const IGNORE_FILENAMES = new Set([
  "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
  ".DS_Store", "Thumbs.db",
]);

// Extra patterns from --ignore flag (simple substring match on relative path)
const EXTRA_IGNORE = args.ignore
  ? args.ignore.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

// Max file size to include (bytes). Files larger than this are skipped.
const MAX_FILE_BYTES = 512 * 1024; // 512 KB

// ---------------------------------------------------------------------------
// Walk the directory tree
// ---------------------------------------------------------------------------
function walk(dir, root, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files; // permission denied etc.
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") && !entry.name.startsWith(".env")) {
      // skip hidden except .env* files which are useful context
      if (entry.isDirectory()) continue;
      if (entry.name !== ".env" && !entry.name.startsWith(".env.")) continue;
    }

    const fullPath = join(dir, entry.name);
    const relPath  = relative(root, fullPath).replace(/\\/g, "/"); // normalise Windows paths

    if (EXTRA_IGNORE.some((p) => relPath.includes(p))) continue;

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(fullPath, root, files);
    } else if (entry.isFile()) {
      const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
      if (IGNORE_EXTENSIONS.has(ext)) continue;
      if (IGNORE_FILENAMES.has(entry.name)) continue;

      let stat;
      try { stat = statSync(fullPath); } catch { continue; }
      if (stat.size > MAX_FILE_BYTES) continue;

      let content;
      try {
        content = readFileSync(fullPath, "utf8");
      } catch {
        continue; // binary or unreadable — skip
      }

      files.push({ path: relPath, content, mtime: stat.mtimeMs });
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log(`\n🔍  Scanning  ${WORKSPACE_ROOT}`);
const files = walk(WORKSPACE_ROOT, WORKSPACE_ROOT);
console.log(`📦  Found     ${files.length} files`);

const payload = {
  workspaceId:   WORKSPACE_ID,
  workspaceName: WORKSPACE_NAME,
  rootPath:      WORKSPACE_ROOT,
  type:          "snapshot",
  files,
};

console.log(`🚀  POSTing snapshot to ${FLASHBOB_URL}/api/sync …\n`);

const res = await fetch(`${FLASHBOB_URL}/api/sync`, {
  method:  "POST",
  headers: { "Content-Type": "application/json" },
  body:    JSON.stringify(payload),
});

if (!res.ok) {
  const text = await res.text();
  console.error(`❌  HTTP ${res.status}: ${text}`);
  process.exit(1);
}

const json = await res.json();
console.log(`✅  Synced ${json.fileCount} files`);
console.log(`🆔  workspaceId: ${json.workspaceId}`);
console.log(`\n   View: ${FLASHBOB_URL}/workspace/${json.workspaceId}\n`);
