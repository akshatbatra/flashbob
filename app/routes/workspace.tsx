import type { Route } from "./+types/workspace";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { getWorkspace } from "~/lib/store.server";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  FolderOpen,
  File,
  ArrowLeft,
  Clock,
  Zap,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `Workspace — FlashBob` },
    { name: "description", content: `Live file mirror for workspace ${params.id}` },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const ws = getWorkspace(params.id!);
  if (!ws) {
    throw new Response("Workspace not found", { status: 404 });
  }

  // Build file tree
  const files = Array.from(ws.files.values())
    .map((f) => ({
      path: f.path,
      language: f.language,
      size: f.size,
      mtime: f.mtime,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  // Compute directory structure
  const dirs = new Set<string>();
  for (const f of files) {
    const parts = f.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join("/"));
    }
  }

  return {
    workspace: {
      id: ws.id,
      name: ws.name,
      rootPath: ws.rootPath,
      fileCount: ws.fileCount,
      linkedAt: ws.linkedAt,
      lastSync: ws.lastSync,
    },
    files,
  };
}

function LanguageBadge({ lang }: { lang: string }) {
  const colors: Record<string, string> = {
    typescript: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    javascript: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    python: "bg-green-500/10 text-green-600 dark:text-green-400",
    rust: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    go: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    json: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    markdown: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    css: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    html: "bg-red-500/10 text-red-600 dark:text-red-400",
  };
  const cls = colors[lang] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${cls}`}>
      {lang}
    </span>
  );
}

function timeAgo(ts: number): string {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatSize(chars: number): string {
  if (chars < 1024) return `${chars}B`;
  return `${(chars / 1024).toFixed(1)}KB`;
}

/** Group files by top-level directory for the tree view */
function groupByDir(files: { path: string; language: string; size: number; mtime: number }[]) {
  const groups: Record<string, typeof files> = { "(root)": [] };
  for (const f of files) {
    const slash = f.path.indexOf("/");
    if (slash === -1) {
      groups["(root)"].push(f);
    } else {
      const dir = f.path.slice(0, slash);
      groups[dir] = groups[dir] ?? [];
      groups[dir].push(f);
    }
  }
  // Remove empty root group
  if (groups["(root)"].length === 0) delete groups["(root)"];
  return groups;
}

export default function WorkspacePage() {
  const { workspace, files } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [syncFlash, setSyncFlash] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Live SSE subscription for file change events
  useEffect(() => {
    const es = new EventSource(`/api/sync/stream?workspaceId=${workspace.id}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "snapshot" || data.event === "patch") {
          setSyncFlash(true);
          setTimeout(() => setSyncFlash(false), 800);
          revalidator.revalidate();
        }
      } catch {
        // ignore parse errors
      }
    };

    return () => {
      es.close();
    };
  }, [workspace.id]);

  const groups = groupByDir(files);
  const dirs = Object.keys(groups).sort((a, b) =>
    a === "(root)" ? -1 : b === "(root)" ? 1 : a.localeCompare(b),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-1">
            <Link
              to="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <Zap size={12} className="text-primary-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">FlashBob</span>
            </div>
            <ChevronRight size={12} className="text-muted-foreground" />
            <span className="text-sm font-medium">{workspace.name}</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xs text-muted-foreground truncate flex-1">
              {workspace.rootPath}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`text-xs gap-1 transition-colors ${syncFlash ? "border-green-500 text-green-600" : ""}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full inline-block transition-colors ${syncFlash ? "bg-green-400" : "bg-green-500"}`}
                />
                {syncFlash ? "Syncing…" : "Live"}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <RefreshCw size={10} />
                {timeAgo(workspace.lastSync)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Files", value: workspace.fileCount },
            { label: "Directories", value: dirs.length },
            {
              label: "Total Size",
              value: formatSize(files.reduce((a, f) => a + f.size, 0)),
            },
            {
              label: "Last Sync",
              value: timeAgo(workspace.lastSync),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="border border-border rounded-lg p-4 bg-card text-center"
            >
              <p className="text-lg font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* File tree */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Files</h3>

          {files.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
              <FolderOpen size={28} className="mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No files synced yet. Make sure the extension is running.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
              {dirs.map((dir) => (
                <div key={dir}>
                  {dir !== "(root)" && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 text-xs text-muted-foreground font-medium">
                      <FolderOpen size={12} />
                      {dir}
                      <span className="ml-auto text-[10px]">
                        {groups[dir].length} files
                      </span>
                    </div>
                  )}
                  {groups[dir].map((f) => {
                    const displayPath =
                      dir === "(root)"
                        ? f.path
                        : f.path.slice(dir.length + 1);
                    return (
                      <Link
                        key={f.path}
                        to={`/workspace/${workspace.id}/file/${encodeURIComponent(f.path)}`}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors group"
                      >
                        <File
                          size={13}
                          className="text-muted-foreground shrink-0"
                        />
                        <span className="text-sm flex-1 truncate">
                          {displayPath}
                        </span>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {formatSize(f.size)}
                        </span>
                        <LanguageBadge lang={f.language} />
                        <span className="text-[10px] text-muted-foreground hidden md:block">
                          <Clock size={9} className="inline mr-0.5" />
                          {timeAgo(f.mtime)}
                        </span>
                        <ChevronRight
                          size={12}
                          className="text-muted-foreground group-hover:text-foreground transition-colors"
                        />
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground">
          FlashBob — Live mirror for{" "}
          <span className="font-medium text-foreground">{workspace.name}</span>
        </div>
      </footer>
    </div>
  );
}
