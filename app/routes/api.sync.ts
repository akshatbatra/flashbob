/**
 * POST /api/sync
 *
 * Receives file snapshots and delta patches from the IBM Bob extension.
 *
 * Body shape:
 * {
 *   workspaceId: string,
 *   workspaceName: string,
 *   rootPath: string,
 *   type: "snapshot" | "patch",
 *   files: Array<{
 *     path: string,
 *     content: string,
 *     mtime: number,
 *     deleted?: boolean
 *   }>
 * }
 *
 * On "snapshot": replaces all files for that workspace.
 * On "patch": upserts or deletes individual files.
 */

import type { Route } from "./+types/api.sync";
import {
  createWorkspace,
  getWorkspace,
  upsertFile,
  deleteFile,
  broadcastToUI,
  getAllWorkspaces,
} from "~/lib/store.server";
import { v4 as uuidv4 } from "uuid";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: {
    workspaceId?: string;
    workspaceName: string;
    rootPath: string;
    type: "snapshot" | "patch";
    files: Array<{
      path: string;
      content: string;
      mtime: number;
      deleted?: boolean;
    }>;
  };

  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { workspaceName, rootPath, type, files } = body;
  let workspaceId = body.workspaceId;

  if (!workspaceName || !rootPath || !type || !Array.isArray(files)) {
    return new Response("Missing required fields", { status: 400 });
  }

  // Auto-create workspace if first sync or ID missing
  let ws = workspaceId ? getWorkspace(workspaceId) : undefined;
  if (!ws) {
    workspaceId = uuidv4();
    ws = createWorkspace(workspaceId, workspaceName, rootPath);
  }

  if (type === "snapshot") {
    // Clear existing files and replace with snapshot
    ws.files.clear();
  }

  const wsId = workspaceId!;
  const changes: string[] = [];
  for (const f of files) {
    if (f.deleted) {
      deleteFile(wsId, f.path);
      changes.push(`delete:${f.path}`);
    } else {
      upsertFile(wsId, f.path, f.content, f.mtime);
      changes.push(`upsert:${f.path}`);
    }
  }

  // Broadcast to all UI subscribers watching this workspace
  broadcastToUI(workspaceId!, {
    event: type,
    workspaceId,
    fileCount: ws.fileCount,
    changes,
    timestamp: Date.now(),
  });

  return Response.json({
    ok: true,
    workspaceId,
    fileCount: ws.fileCount,
  });
}

/**
 * GET /api/sync — return all workspaces (used by extension to discover existing links)
 */
export async function loader({ request }: Route.LoaderArgs) {
  const workspaces = getAllWorkspaces().map((ws) => ({
    id: ws.id,
    name: ws.name,
    rootPath: ws.rootPath,
    linkedAt: ws.linkedAt,
    lastSync: ws.lastSync,
    fileCount: ws.fileCount,
  }));
  return Response.json({ workspaces });
}
