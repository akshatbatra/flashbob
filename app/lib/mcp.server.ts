/**
 * FlashBob MCP Server definition.
 *
 * Tools exposed to IBM Bob / VS Code agents:
 *
 *  1. list_workspaces         — list all linked workspace mirrors
 *  2. list_files              — list all file paths in a workspace
 *  3. get_relevant_files      — ask Jev to rank files by relevance to a task
 *  4. get_file_content        — get the live content of a specific file
 *  5. get_workspace_summary   — high-level stats about a workspace
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAllWorkspaces, getWorkspace } from "./store.server";
import { classifyWorkspace } from "./jev.server";

/** Build a fresh McpServer with all tools registered */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "flashbob-mirror",
    version: "1.0.0",
  });

  // ── Tool 1: list_workspaces ──────────────────────────────────────────────
  server.registerTool(
    "list_workspaces",
    {
      title: "List Workspaces",
      description:
        "List all workspace folders currently mirrored in FlashBob. " +
        "Returns id, name, file count, and last sync time.",
    },
    async () => {
      const workspaces = getAllWorkspaces();
      const list = workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        rootPath: ws.rootPath,
        fileCount: ws.fileCount,
        linkedAt: new Date(ws.linkedAt).toISOString(),
        lastSync: ws.lastSync ? new Date(ws.lastSync).toISOString() : null,
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(list, null, 2) }],
      };
    },
  );

  // ── Tool 2: list_files ───────────────────────────────────────────────────
  server.registerTool(
    "list_files",
    {
      title: "List Files",
      description:
        "List all file paths currently mirrored for a workspace. " +
        "Returns path, language, size, and last modified time.",
      inputSchema: {
        workspaceId: z.string().describe("The workspace ID returned by list_workspaces"),
      },
    },
    async ({ workspaceId }) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) {
        return {
          content: [{ type: "text" as const, text: `Workspace '${workspaceId}' not found.` }],
          isError: true,
        };
      }
      const files = Array.from(ws.files.values()).map((f) => ({
        path: f.path,
        language: f.language,
        sizeChars: f.size,
        mtime: new Date(f.mtime).toISOString(),
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify(files, null, 2) }],
      };
    },
  );

  // ── Tool 3: get_relevant_files ───────────────────────────────────────────
  server.registerTool(
    "get_relevant_files",
    {
      title: "Get Relevant Files",
      description:
        "Use Jev (TypeSafe decision model) to classify which files in a workspace " +
        "are relevant to a given task. Returns files ranked by relevance probability " +
        "and importance score. Only files with relevance >= threshold are returned. " +
        "This saves agent context by pre-selecting only what matters.",
      inputSchema: {
        workspaceId: z.string().describe("The workspace ID returned by list_workspaces"),
        task: z.string().describe(
          "Description of the task the agent needs to perform. " +
          "Be specific — the more detail, the better Jev's classification.",
        ),
        threshold: z.number().optional().describe(
          "Minimum relevance probability (0–1) to include a file. Default 0.5.",
        ),
      },
    },
    async ({ workspaceId, task, threshold }) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) {
        return {
          content: [{ type: "text" as const, text: `Workspace '${workspaceId}' not found.` }],
          isError: true,
        };
      }

      const minProb = threshold ?? 0.5;
      const allFiles = Array.from(ws.files.values());

      if (allFiles.length === 0) {
        return {
          content: [{ type: "text" as const, text: "No files in this workspace yet." }],
        };
      }

      const relevanceMap = await classifyWorkspace(allFiles, task);

      const relevant = allFiles
        .map((f) => {
          const r = relevanceMap.get(f.path);
          return {
            path: f.path,
            language: f.language,
            sizeChars: f.size,
            relevanceProbability: r?.probability ?? 0,
            importanceScore: r?.score ?? 0,
            isRelevant: r?.isRelevant ?? false,
          };
        })
        .filter((f) => f.relevanceProbability >= minProb)
        .sort(
          (a, b) =>
            b.importanceScore - a.importanceScore ||
            b.relevanceProbability - a.relevanceProbability,
        );

      return {
        content: [
          {
            type: "text" as const,
            text:
              `Found ${relevant.length} relevant files out of ${allFiles.length} total (threshold: ${minProb}):\n\n` +
              JSON.stringify(relevant, null, 2),
          },
        ],
      };
    },
  );

  // ── Tool 4: get_file_content ─────────────────────────────────────────────
  server.registerTool(
    "get_file_content",
    {
      title: "Get File Content",
      description:
        "Get the live mirrored content of a specific file in a workspace. " +
        "Content reflects the most recent sync from the IBM Bob editor.",
      inputSchema: {
        workspaceId: z.string().describe("The workspace ID returned by list_workspaces"),
        path: z.string().describe("The file path relative to the workspace root"),
      },
    },
    async ({ workspaceId, path }) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) {
        return {
          content: [{ type: "text" as const, text: `Workspace '${workspaceId}' not found.` }],
          isError: true,
        };
      }
      const file = ws.files.get(path);
      if (!file) {
        return {
          content: [{ type: "text" as const, text: `File '${path}' not found in workspace.` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text" as const,
            text: `// ${file.path} (${file.language}, ${file.size} chars, synced ${new Date(file.mtime).toISOString()})\n\n${file.content}`,
          },
        ],
      };
    },
  );

  // ── Tool 5: get_workspace_summary ────────────────────────────────────────
  server.registerTool(
    "get_workspace_summary",
    {
      title: "Get Workspace Summary",
      description:
        "Get a high-level summary of a mirrored workspace: file count by language, " +
        "total size, file tree structure. Useful for orientation before diving in.",
      inputSchema: {
        workspaceId: z.string().describe("The workspace ID returned by list_workspaces"),
      },
    },
    async ({ workspaceId }) => {
      const ws = getWorkspace(workspaceId);
      if (!ws) {
        return {
          content: [{ type: "text" as const, text: `Workspace '${workspaceId}' not found.` }],
          isError: true,
        };
      }

      const files = Array.from(ws.files.values());
      const byLanguage: Record<string, number> = {};
      let totalChars = 0;
      const tree: string[] = [];

      for (const f of files) {
        byLanguage[f.language] = (byLanguage[f.language] ?? 0) + 1;
        totalChars += f.size;
        tree.push(f.path);
      }

      tree.sort();

      const summary = {
        id: ws.id,
        name: ws.name,
        rootPath: ws.rootPath,
        fileCount: ws.fileCount,
        totalChars,
        lastSync: ws.lastSync ? new Date(ws.lastSync).toISOString() : null,
        byLanguage,
        fileTree: tree,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }],
      };
    },
  );

  return server;
}
