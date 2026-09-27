import type { Route } from "./+types/workspace.file";
import { Link, useLoaderData, useFetcher, useRevalidator } from "react-router";
import { getWorkspace } from "~/lib/store.server";
import { classifyFile } from "~/lib/jev.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ArrowLeft,
  Zap,
  ChevronRight,
  Clock,
  BrainCircuit,
  CheckCircle2,
  XCircle,
  Loader2,
  FileCode,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `File — FlashBob` },
    { name: "description", content: `Live mirrored file in workspace ${params.id}` },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const ws = getWorkspace(params.id!);
  if (!ws) throw new Response("Workspace not found", { status: 404 });

  const filePath = decodeURIComponent(params["*"] ?? "");
  const file = ws.files.get(filePath);
  if (!file) throw new Response("File not found", { status: 404 });

  return {
    workspace: { id: ws.id, name: ws.name },
    file: {
      path: file.path,
      content: file.content,
      language: file.language,
      size: file.size,
      mtime: file.mtime,
    },
  };
}

/** Server action: run Jev classification for a given task */
export async function action({ request, params }: Route.ActionArgs) {
  const ws = getWorkspace(params.id!);
  if (!ws) return Response.json({ error: "Workspace not found" }, { status: 404 });

  const filePath = decodeURIComponent(params["*"] ?? "");
  const file = ws.files.get(filePath);
  if (!file) return Response.json({ error: "File not found" }, { status: 404 });

  const formData = await request.formData();
  const task = formData.get("task") as string;
  if (!task?.trim()) {
    return Response.json({ error: "Task is required" }, { status: 400 });
  }

  try {
    const relevance = await classifyFile(file, task.trim());
    return Response.json({
      ok: true,
      path: file.path,
      task: relevance.task,
      isRelevant: relevance.isRelevant,
      probability: relevance.probability,
      score: relevance.score,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Jev classification failed";
    return Response.json({ error: msg }, { status: 500 });
  }
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

const IMPORTANCE_LABELS = ["Not needed", "Helpful context", "Critical"];

function JevPanel({
  workspaceId,
  filePath,
}: {
  workspaceId: string;
  filePath: string;
}) {
  const fetcher = useFetcher<typeof action>();
  const [task, setTask] = useState("");
  type ActionResult = { ok: true; path: string; task: string; isRelevant: boolean; probability: number; score: number } | { error: string };
  const fetcherData = fetcher.data as ActionResult | undefined;
  const result = fetcherData && "ok" in fetcherData ? fetcherData : null;
  const error = fetcherData && "error" in fetcherData ? fetcherData.error : null;
  const loading = fetcher.state !== "idle";

  return (
    <div className="border border-border rounded-xl p-5 space-y-4 bg-card">
      <div className="flex items-center gap-2">
        <BrainCircuit size={15} className="text-muted-foreground" />
        <h3 className="text-sm font-semibold">Jev Relevance Check</h3>
        <Badge variant="secondary" className="text-[10px] ml-auto">
          typesafe/jev-1.13
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground">
        Describe a task and Jev will classify whether this file is relevant to it.
      </p>

      <fetcher.Form method="post" className="space-y-3">
        <Input
          name="task"
          placeholder="e.g. Add dark mode toggle to the settings page"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="text-xs h-8"
        />
        <Button
          type="submit"
          size="sm"
          disabled={loading || !task.trim()}
          className="w-full text-xs h-7 gap-1.5"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <BrainCircuit size={12} />
          )}
          {loading ? "Classifying…" : "Classify with Jev"}
        </Button>
      </fetcher.Form>

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            {result.isRelevant ? (
              <CheckCircle2 size={16} className="text-green-500 shrink-0" />
            ) : (
              <XCircle size={16} className="text-muted-foreground shrink-0" />
            )}
            <span className="text-sm font-medium">
              {result.isRelevant ? "Relevant" : "Not relevant"}
            </span>
          </div>

          {/* Probability bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Relevance probability</span>
              <span className="font-mono font-medium text-foreground">
                {(result.probability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.probability >= 0.7
                    ? "bg-green-500"
                    : result.probability >= 0.4
                    ? "bg-yellow-500"
                    : "bg-muted-foreground/40"
                }`}
                style={{ width: `${result.probability * 100}%` }}
              />
            </div>
          </div>

          {/* Importance score */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Importance</span>
              <span className="font-mono font-medium text-foreground">
                {result.score.toFixed(2)} / 2
              </span>
            </div>
            <div className="flex gap-1">
              {IMPORTANCE_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    result.score >= i
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                  title={label}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {IMPORTANCE_LABELS[Math.round(result.score)] ?? IMPORTANCE_LABELS[0]}
            </p>
          </div>

          <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
            Task: <span className="text-foreground italic">"{result.task}"</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CodeBlock({ content, language }: { content: string; language: string }) {
  const lines = content.split("\n");
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/60 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode size={13} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {lines.length} lines
        </span>
      </div>
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-accent/20 transition-colors">
                <td className="select-none text-right text-muted-foreground/50 px-4 py-0 w-12 text-[10px] leading-5 align-top">
                  {i + 1}
                </td>
                <td className="px-4 py-0 text-foreground whitespace-pre leading-5 align-top">
                  {line || " "}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function WorkspaceFile() {
  const { workspace, file } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  // Re-fetch when SSE fires a change for this workspace
  useEffect(() => {
    const es = new EventSource(`/api/sync/stream?workspaceId=${workspace.id}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (
          (data.event === "snapshot" || data.event === "patch") &&
          (data.changes as string[]).some(
            (c) => c.includes(file.path),
          )
        ) {
          revalidator.revalidate();
        }
      } catch {
        // ignore
      }
    };
    return () => es.close();
  }, [workspace.id, file.path]);

  const pathParts = file.path.split("/");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Zap size={11} />
              FlashBob
            </Link>
            <ChevronRight size={10} />
            <Link
              to={`/workspace/${workspace.id}`}
              className="hover:text-foreground transition-colors"
            >
              {workspace.name}
            </Link>
            <ChevronRight size={10} />
            {pathParts.map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} />}
                <span className={i === pathParts.length - 1 ? "text-foreground font-medium" : ""}>
                  {part}
                </span>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-3">
            <Link
              to={`/workspace/${workspace.id}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <h1 className="font-medium text-sm truncate">{file.path}</h1>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {file.language}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span>{formatSize(file.size)}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {timeAgo(file.mtime)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Code viewer */}
          <CodeBlock content={file.content} language={file.language} />

          {/* Sidebar */}
          <div className="space-y-4">
            <JevPanel workspaceId={workspace.id} filePath={file.path} />

            <div className="border border-border rounded-xl p-4 space-y-3 bg-card text-xs">
              <p className="font-medium">File Info</p>
              <div className="space-y-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Language</span>
                  <span className="text-foreground font-mono">{file.language}</span>
                </div>
                <div className="flex justify-between">
                  <span>Size</span>
                  <span className="text-foreground font-mono">{formatSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lines</span>
                  <span className="text-foreground font-mono">
                    {file.content.split("\n").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last modified</span>
                  <span className="text-foreground">{timeAgo(file.mtime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
