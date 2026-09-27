# FlashBob

FlashBob integrates **Jev** — a newly launched decision model by TypeSafe — with IBM Bob to eliminate context bloat and reduce Bobcoins usage.

Instead of feeding every file in your workspace to the agent, FlashBob uses Jev to intelligently decide which files are actually relevant to the current task, then exposes only those through an MCP server that IBM Bob connects to directly.

**Live at:** `https://flashbob.fly.dev`

---

## The Problem It Solves

IBM Bob Agent works best when its context window contains only what matters for the current task. Dumping an entire project into context:
- Wastes Bobcoins on tokens the agent doesn't need
- Pushes actually relevant content further from the model's attention
- Slows down responses as context size grows

FlashBob fixes this by running Jev classification on every file before any content reaches the agent.

---

## How Jev Works Here

Jev (`typesafe/jev-1.13`) is a decision model accessed via the [OpenRouter Decisions API](https://openrouter.ai/api/alpha/decisions). For each file in your workspace, FlashBob asks Jev two questions:

- **`is_relevant`** (noul) — probability (0–1) that this file relates to the current task
- **`importance`** (score) — `0` skip / `1` helpful context / `2` critical, cannot complete task without it

Results are cached per task+file for 5 minutes. The `get_relevant_files` MCP tool runs this classification across all files in parallel, then returns only the files above the relevance threshold — sorted by importance score — for the agent to load.

---

## MCP Integration with IBM Bob

FlashBob exposes an MCP server at `https://flashbob.fly.dev/mcp`. Add it to your project's `.bob/mcp.json`:

```json
{
  "mcpServers": {
    "flashbob": {
      "url": "https://flashbob.fly.dev/mcp"
    }
  }
}
```

### MCP Tools

| Tool | What it does |
|------|-------------|
| `get_relevant_files` | **Core tool.** Runs Jev classification against a task description and returns only the relevant files, ranked by importance. Keeps agent context lean. |
| `get_file_content` | Retrieves the live mirrored content of a specific file. |
| `list_files` | Lists all file paths in a workspace with language and size metadata. |
| `get_workspace_summary` | High-level stats: file count by language, total size, file tree. Useful for orientation. |
| `list_workspaces` | Lists all workspaces currently mirrored in FlashBob. |

The typical agent flow is: `list_workspaces` → `get_relevant_files` (with the task description) → `get_file_content` for the files Jev marks as critical.

---

## Dashboard & Jev Interface

The web UI at `https://flashbob.fly.dev` shows all synced workspaces. Each workspace view displays the mirrored file tree with language tags, sizes, and sync timestamps — and serves as the Jev query interface where you can inspect which files Jev considers relevant to a given task before the agent ever sees them.

---

## Mirroring a Workspace

Mirroring pushes your project to the cloud so your workspace context lives at a stable URL, not locked to your local machine. Switch to a different laptop, open a browser anywhere, or hand off to a colleague, and the same project context is instantly available to IBM Bob without re-uploading or reconfiguring anything.

Point the script at any directory on your machine:

```bash
node /path/to/flashbob/scripts/sync-to-flashbob.mjs --url https://flashbob.fly.dev --root /path/to/your/project
```

The script walks your project tree, skips binaries and lock files, and POSTs a snapshot to `/api/sync`. A stable workspace ID is derived from your machine hostname and project path, so re-running always patches the same workspace. Pass `--id` on subsequent runs to update it in place:

```bash
node scripts/sync-to-flashbob.mjs --url https://flashbob.fly.dev --id <workspaceId>
```

### Live Syncing (Watch Mode)

For continuous syncing while you edit, use Node's built-in `--watch` flag to re-run the script automatically whenever a file changes:

```bash
node --watch --watch-path /path/to/your/project scripts/sync-to-flashbob.mjs --url https://flashbob.fly.dev --id <workspaceId>
```

Each save triggers a fresh snapshot POST. Because the sync sends a full snapshot, this is best suited for smaller projects or short editing sessions. For large workspaces, prefer running the sync manually at key checkpoints instead.

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:5173
```

Set `OPENROUTER_API_KEY` in your environment to enable live Jev classification. Without it, all files are returned as relevant (safe fallback).

---

## Deployment

Docker:

```bash
docker build -t flashbob .
docker run -p 3000:3000 flashbob
```

---

Built with ❤️ by Conquerors
