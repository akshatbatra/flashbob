import type { Route } from "./+types/app.workspace";
import { Link, useLoaderData, useRevalidator } from "react-router";
import { getWorkspace } from "~/lib/store.server";
import { Badge } from "~/components/ui/badge";
import {
  FolderOpen,
  File,
  ArrowLeft,
  Clock,
  Files,
  RefreshCw,
  ChevronRight,
  Database,
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

  const files = Array.from(ws.files.values())
    .map((f) => ({
      path: f.path,
      language: f.language,
      size: f.size,
      mtime: f.mtime,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

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
  if (groups["(root)"].length === 0) delete groups["(root)"];
  return groups;
}

export default function WorkspacePage() {
  const { workspace, files } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [syncFlash, setSyncFlash] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  const totalSize = files.reduce((a, f) => a + f.size, 0);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="h-11 shrink-0 border-b border-border bg-card flex items-center px-4 gap-2">
        <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors mr-1">
          <ArrowLeft size={15} />
        </Link>
        <img src="/flashbob-icon.png" alt="FlashBob" className="w-4 h-4 object-contain" />
        <Link to="/app" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          FlashBob
        </Link>
        <ChevronRight size={11} className="text-muted-foreground/40" />
        <span className="text-xs font-medium text-foreground truncate">{workspace.name}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground hidden sm:block truncate max-w-[260px]">
            {workspace.rootPath}
          </span>
          <Badge
            className={`text-xs gap-1.5 transition-colors ${
              syncFlash
                ? "bg-amber-500/15 text-amber-700 border-amber-300"
                : "bg-emerald-500/15 text-emerald-700 border-emerald-300"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full inline-block transition-colors ${syncFlash ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-pulse"}`}
            />
            {syncFlash ? "Syncing…" : "Live"}
          </Badge>
        </div>
      </header>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-border bg-card/30 flex items-center gap-0 divide-x divide-border overflow-x-auto">
        {[
          { icon: <Files size={11} />, label: "Files", value: workspace.fileCount },
          { icon: <FolderOpen size={11} />, label: "Dirs", value: dirs.length },
          { icon: <Database size={11} />, label: "Size", value: formatSize(totalSize) },
          {
            icon: <RefreshCw size={11} />,
            label: "Synced",
            value: timeAgo(workspace.lastSync),
          },
        ].map(({ icon, label, value }) => (
          <div key={label} className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground shrink-0">
            <span className="text-muted-foreground/60">{icon}</span>
            <span className="text-foreground font-medium">{value}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <FolderOpen size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No files synced yet. Make sure the extension is running.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {dirs.map((dir) => (
              <div key={dir}>
                {dir !== "(root)" && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 text-xs text-muted-foreground font-medium sticky top-0">
                    <FolderOpen size={11} className="text-primary/60" />
                    {dir}
                    <span className="ml-auto text-[10px] text-muted-foreground/60">
                      {groups[dir].length} files
                    </span>
                  </div>
                )}
                {groups[dir].map((f) => {
                  const displayPath =
                    dir === "(root)" ? f.path : f.path.slice(dir.length + 1);
                  return (
                    <Link
                      key={f.path}
                      to={`/app/workspace/${workspace.id}/file/${encodeURIComponent(f.path)}`}
                      className="flex items-center gap-3 px-4 py-2 hover:bg-primary/5 transition-colors group"
                    >
                      <File size={12} className="text-muted-foreground/50 shrink-0" />
                      <span className="text-sm flex-1 truncate">{displayPath}</span>
                      <span className="text-[10px] text-muted-foreground hidden sm:block">{formatSize(f.size)}</span>
                      <LanguageBadge lang={f.language} />
                      <span className="text-[10px] text-muted-foreground hidden md:flex items-center gap-0.5">
                        <Clock size={9} />
                        {timeAgo(f.mtime)}
                      </span>
                      <ChevronRight size={11} className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
