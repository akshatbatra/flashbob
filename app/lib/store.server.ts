/**
 * Server-side singleton: workspace mirror store.
 * Lives for the lifetime of the Node process.
 * All API routes and MCP handlers share this instance.
 */

export interface MirroredFile {
  path: string;           // relative path within workspace, e.g. "src/index.ts"
  content: string;
  mtime: number;          // unix ms
  size: number;
  language: string;       // inferred from extension
  /** Jev relevance cache: keyed by task description */
  relevanceCache: Map<string, JevRelevance>;
}

export interface JevRelevance {
  task: string;
  isRelevant: boolean;
  probability: number;    // 0–1, Jev noul answer
  score: number;          // 0–2 Jev score answer (importance level)
  cachedAt: number;       // unix ms
}

export interface Workspace {
  id: string;
  name: string;           // folder basename shown in UI
  rootPath: string;       // absolute path on the client machine (informational)
  linkedAt: number;       // unix ms
  lastSync: number;       // unix ms of most recent sync
  fileCount: number;
  files: Map<string, MirroredFile>;
  /** SSE response controllers for live UI push */
  uiSubscribers: Set<ReadableStreamDefaultController>;
}

/** Global registry of all linked workspaces */
const workspaces = new Map<string, Workspace>();

export function getWorkspace(id: string): Workspace | undefined {
  return workspaces.get(id);
}

export function getAllWorkspaces(): Workspace[] {
  return Array.from(workspaces.values());
}

export function createWorkspace(id: string, name: string, rootPath: string): Workspace {
  const ws: Workspace = {
    id,
    name,
    rootPath,
    linkedAt: Date.now(),
    lastSync: 0,
    fileCount: 0,
    files: new Map(),
    uiSubscribers: new Set(),
  };
  workspaces.set(id, ws);
  return ws;
}

export function upsertFile(
  workspaceId: string,
  path: string,
  content: string,
  mtime: number,
): MirroredFile | null {
  const ws = workspaces.get(workspaceId);
  if (!ws) return null;

  const existing = ws.files.get(path);
  const file: MirroredFile = {
    path,
    content,
    mtime,
    size: content.length,
    language: inferLanguage(path),
    relevanceCache: existing?.relevanceCache ?? new Map(),
  };
  ws.files.set(path, file);
  ws.fileCount = ws.files.size;
  ws.lastSync = Date.now();
  return file;
}

export function deleteFile(workspaceId: string, path: string): boolean {
  const ws = workspaces.get(workspaceId);
  if (!ws) return false;
  const deleted = ws.files.delete(path);
  if (deleted) ws.fileCount = ws.files.size;
  return deleted;
}

/** Push a SSE event to all UI subscribers for a workspace */
export function broadcastToUI(workspaceId: string, event: object): void {
  const ws = workspaces.get(workspaceId);
  if (!ws) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const encoder = new TextEncoder();
  for (const ctrl of ws.uiSubscribers) {
    try {
      ctrl.enqueue(encoder.encode(data));
    } catch {
      ws.uiSubscribers.delete(ctrl);
    }
  }
}

function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rb: "ruby", go: "go", rs: "rust", java: "java",
    cs: "csharp", cpp: "cpp", c: "c", h: "c",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", html: "html", css: "css",
    sh: "bash", bash: "bash", zsh: "bash",
    sql: "sql", graphql: "graphql",
  };
  return map[ext] ?? "plaintext";
}
