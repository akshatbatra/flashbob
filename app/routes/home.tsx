import type { Route } from "./+types/home";
import { Link, useLoaderData, useFetcher } from "react-router";
import { getAllWorkspaces } from "~/lib/store.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  FolderOpen,
  Plug,
  Files,
  Clock,
  ArrowRight,
  Copy,
  CheckCheck,
  Zap,
  Link2,
  CloudUpload,
} from "lucide-react";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FlashBob — Live Workspace Mirror" },
    {
      name: "description",
      content:
        "Mirror your IBM Bob workspace to the cloud and expose it via MCP for smarter, Jev-powered context selection.",
    },
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
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Copy"
    >
      {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
    </button>
  );
}

function CodeLine({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs bg-muted rounded px-3 py-2 group">
      <span className="flex-1 break-all text-foreground">{value}</span>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">FlashBob</h1>
              <p className="text-xs text-muted-foreground">Live Workspace Mirror</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              MCP Live
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">
            Workspace Mirrors
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            Link a folder open in IBM Bob to sync its files here live. Your agent connects
            via MCP and uses{" "}
            <span className="font-medium text-foreground">Jev</span> to select
            only the relevant context — keeping execution tokens free.
          </p>
        </div>

        {/* How it works steps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Link2 size={18} />,
              step: "1",
              title: "Link Folder",
              desc: "Point the FlashBob extension at your open workspace. It sends a file snapshot to this app.",
            },
            {
              icon: <CloudUpload size={18} />,
              step: "2",
              title: "Live Sync",
              desc: "Every file save in IBM Bob streams a delta patch here. Your mirror stays current in real time.",
            },
            {
              icon: <Plug size={18} />,
              step: "3",
              title: "Connect MCP",
              desc: "Add the MCP URL to Bob. The agent calls get_relevant_files and Jev selects the right context.",
            },
          ].map(({ icon, step, title, desc }) => (
            <div
              key={step}
              className="border border-border rounded-xl p-5 space-y-3 bg-card"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {step}
                </span>
                <span className="text-muted-foreground">{icon}</span>
              </div>
              <div>
                <p className="font-medium text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Connection details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CloudUpload size={15} />
                Extension Sync Endpoint
              </CardTitle>
              <CardDescription className="text-xs">
                Configure this URL in the FlashBob IBM Bob extension settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeLine value={syncUrl} />
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">POST</span> — initial snapshot &amp; delta patches
                <br />
                <span className="font-medium text-foreground">GET</span> — list all linked workspaces
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Plug size={15} />
                MCP Server URL
              </CardTitle>
              <CardDescription className="text-xs">
                Add this to your IBM Bob MCP configuration to connect the agent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeLine value={mcpUrl} />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Available tools:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li><code className="text-foreground">list_workspaces</code></li>
                  <li><code className="text-foreground">get_relevant_files</code> — powered by Jev</li>
                  <li><code className="text-foreground">get_file_content</code></li>
                  <li><code className="text-foreground">list_files</code></li>
                  <li><code className="text-foreground">get_workspace_summary</code></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Workspace list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              Linked Workspaces
              {workspaces.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {workspaces.length}
                </Badge>
              )}
            </h3>
          </div>

          {workspaces.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center space-y-3">
              <FolderOpen size={32} className="mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">No workspaces linked yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Install the FlashBob extension in IBM Bob and link a folder to see it here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/workspace/${ws.id}`}
                  className="group border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-accent/30 transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderOpen
                        size={16}
                        className="text-muted-foreground shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{ws.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ws.rootPath}
                        </p>
                      </div>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-muted-foreground group-hover:text-foreground transition-colors shrink-0 mt-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Files size={12} />
                      {ws.fileCount} files
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      synced {timeAgo(ws.lastSync)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Bob MCP config snippet */}
        <Card className="bg-muted/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">IBM Bob MCP Configuration</CardTitle>
            <CardDescription className="text-xs">
              Add this block to your <code>.bob/mcp.json</code> or VS Code{" "}
              <code>settings.json</code> under{" "}
              <code>bob.mcpServers</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="text-xs bg-background border border-border rounded-lg p-4 overflow-x-auto text-foreground leading-relaxed">
{`{
  "flashbob": {
    "url": "${mcpUrl}",
    "transport": "streamable-http"
  }
}`}
              </pre>
              <div className="absolute top-3 right-3">
                <CopyButton
                  text={`{\n  "flashbob": {\n    "url": "${mcpUrl}",\n    "transport": "streamable-http"\n  }\n}`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-muted-foreground flex items-center justify-between">
          <span>FlashBob — powered by Jev · TypeSafe · OpenRouter</span>
          <span>MCP Streamable HTTP</span>
        </div>
      </footer>
    </div>
  );
}
