import type { Route } from "./+types/home";
import { Link, useLoaderData } from "react-router";
import { getAllWorkspaces } from "~/lib/store.server";
import { Badge } from "~/components/ui/badge";
import {
  FolderOpen,
  Files,
  Clock,
  ArrowRight,
  Copy,
  CheckCheck,
  Plug,
  CloudUpload,
} from "lucide-react";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FlashBob" },
    { name: "description", content: "Live workspace mirror via MCP." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const workspaces = getAllWorkspaces().map((ws) => ({
    id: ws.id,
    name: ws.name,
    rootPath: ws.rootPath,
    fileCount: ws.fileCount,
    linkedAt: ws.linkedAt,
    lastSync: ws.lastSync,
  }));

  const baseUrl = new URL(request.url).origin;
  return { workspaces, baseUrl };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      aria-label="Copy"
    >
      {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
    </button>
  );
}

function CodeLine({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs bg-muted/60 border border-border rounded px-3 py-2">
      <span className="flex-1 break-all text-foreground/80 select-all">{value}</span>
      <CopyButton text={value} />
    </div>
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

export default function Home() {
  const { workspaces, baseUrl } = useLoaderData<typeof loader>();
  const syncUrl = `${baseUrl}/api/sync`;
  const mcpUrl = `${baseUrl}/mcp`;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="h-11 shrink-0 border-b border-border bg-card flex items-center px-4 gap-3">
        <img src="/flashbob-icon.png" alt="FlashBob" className="w-5 h-5 object-contain" />
        <span className="text-sm font-semibold tracking-tight">FlashBob</span>
        <span className="text-muted-foreground text-xs hidden sm:block">Live Workspace Mirror</span>
        <div className="ml-auto">
          <Badge className="text-xs gap-1.5 bg-emerald-500/15 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            MCP Live
          </Badge>
        </div>
      </header>

      {/* Body — two-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: workspaces */}
        <div className="flex flex-col w-full max-w-sm shrink-0 border-r border-border bg-card/40 overflow-y-auto">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Workspaces
            </span>
            {workspaces.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {workspaces.length}
              </Badge>
            )}
          </div>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 px-6 py-12 text-center">
              <FolderOpen size={28} className="text-muted-foreground/50" />
              <p className="text-sm font-medium">No workspaces linked</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Install the FlashBob extension in IBM Bob and link a folder to see it here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 group transition-colors"
                >
                  <FolderOpen size={15} className="text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{ws.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{ws.rootPath}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Files size={10} />
                        {ws.fileCount} files
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(ws.lastSync)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-muted-foreground/40 group-hover:text-foreground transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right panel: connection details */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endpoints</h2>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <CloudUpload size={13} className="text-primary" />
                  Extension Sync
                </div>
                <p className="text-[11px] text-muted-foreground">Configure this URL in the FlashBob IBM Bob extension settings.</p>
                <CodeLine value={syncUrl} />
                <p className="text-[10px] text-muted-foreground">
                  <span className="font-medium text-foreground">POST</span> — snapshot &amp; delta patches ·{" "}
                  <span className="font-medium text-foreground">GET</span> — list workspaces
                </p>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <Plug size={13} className="text-violet-600" />
                  MCP Server
                </div>
                <p className="text-[11px] text-muted-foreground">Add this to your IBM Bob MCP configuration to connect the agent.</p>
                <CodeLine value={mcpUrl} />
                <div className="text-[10px] text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">Available tools:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["list_workspaces", "get_relevant_files", "get_file_content", "list_files", "get_workspace_summary"].map((t) => (
                      <code key={t} className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{t}</code>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Bob MCP Config</h2>
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Add this to <code className="bg-muted px-1 rounded">.bob/mcp.json</code> or <code className="bg-muted px-1 rounded">bob.mcpServers</code> in your settings.
              </p>
              <div className="relative">
                <pre className="text-xs bg-muted/50 border border-border rounded p-3 overflow-x-auto leading-relaxed">{`{
  "flashbob": {
    "url": "${mcpUrl}",
    "transport": "streamable-http"
  }
}`}</pre>
                <div className="absolute top-2.5 right-2.5">
                  <CopyButton text={`{\n  "flashbob": {\n    "url": "${mcpUrl}",\n    "transport": "streamable-http"\n  }\n}`} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
