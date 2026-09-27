import type { Route } from "./+types/workspace.file";
import { Link, useLoaderData, useFetcher, useRevalidator } from "react-router";
import { getWorkspace } from "~/lib/store.server";
import { classifyFile } from "~/lib/jev.server";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  ArrowLeft,
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

function JevPanel({ workspaceId, filePath }: { workspaceId: string; filePath: string }) {
  const fetcher = useFetcher<typeof action>();
  const [task, setTask] = useState("");
  type ActionResult =
    | { ok: true; path: string; task: string; isRelevant: boolean; probability: number; score: number }
    | { error: string };
  const fetcherData = fetcher.data as ActionResult | undefined;
  const result = fetcherData && "ok" in fetcherData ? fetcherData : null;
  const error = fetcherData && "error" in fetcherData ? fetcherData.error : null;
  const loading = fetcher.state !== "idle";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <BrainCircuit size={13} className="text-primary" />
        <span className="text-xs font-semibold">Jev Relevance</span>
        <Badge className="text-[10px] ml-auto bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 px-1.5 py-0">
          jev-1.13
        </Badge>
      </div>

      <div className="px-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Describe a task and Jev will classify whether this file is relevant to it.
        </p>

        <fetcher.Form method="post" className="space-y-2">
          <Input
            name="task"
            placeholder="e.g. Add dark mode toggle…"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            className="text-xs h-7"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || !task.trim()}
            className="w-full text-xs h-7 gap-1.5"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <BrainCircuit size={11} />}
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
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              ) : (
                <XCircle size={14} className="text-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium">
                {result.isRelevant ? "Relevant" : "Not relevant"}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Relevance</span>
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

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Importance</span>
                <span className="font-mono font-medium text-foreground">{result.score.toFixed(2)} / 2</span>
              </div>
              <div className="flex gap-1">
                {IMPORTANCE_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${result.score >= i ? "bg-primary" : "bg-muted"}`}
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

    </div>
  );
}

function CodeBlock({ content, language }: { content: string; language: string }) {
  const lines = content.split("\n");
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card shrink-0">
        <FileCode size={12} className="text-primary/70" />
        <span className="text-xs font-medium text-muted-foreground">{language}</span>
        <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {lines.length} lines
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-accent/20 transition-colors">
                <td className="select-none text-right text-muted-foreground/40 px-4 py-0 w-12 text-[10px] leading-5 align-top">
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

  useEffect(() => {
    const es = new EventSource(`/api/sync/stream?workspaceId=${workspace.id}`);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (
          (data.event === "snapshot" || data.event === "patch") &&
          (data.changes as string[]).some((c) => c.includes(file.path))
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
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <header className="h-11 shrink-0 border-b border-border bg-card flex items-center px-4 gap-1.5 text-xs text-muted-foreground overflow-x-auto">
        <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1 shrink-0">
          <img src="/flashbob-icon.png" alt="FlashBob" className="w-4 h-4 object-contain" />
          FlashBob
        </Link>
        <ChevronRight size={10} className="shrink-0 text-muted-foreground/40" />
        <Link to={`/workspace/${workspace.id}`} className="hover:text-foreground transition-colors shrink-0">
          {workspace.name}
        </Link>
        <ChevronRight size={10} className="shrink-0 text-muted-foreground/40" />
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <ChevronRight size={10} className="text-muted-foreground/40" />}
            <span className={i === pathParts.length - 1 ? "text-foreground font-medium" : ""}>
              {part}
            </span>
          </span>
        ))}
        <div className="ml-auto flex items-center gap-3 shrink-0 pl-3">
          <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 px-1.5 py-0">
            {file.language}
          </Badge>
          <span className="text-[10px]">{formatSize(file.size)}</span>
          <span className="text-[10px] flex items-center gap-0.5">
            <Clock size={9} />
            {timeAgo(file.mtime)}
          </span>
          <Link
            to={`/workspace/${workspace.id}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
          </Link>
        </div>
      </header>

      {/* Content — code + sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Code viewer */}
        <div className="flex-1 min-w-0 border-r border-border overflow-hidden">
          <CodeBlock content={file.content} language={file.language} />
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto bg-card/30">
          <JevPanel workspaceId={workspace.id} filePath={file.path} />

          {/* File meta */}
          <div className="mx-4 mt-2 border-t border-border pt-3 pb-4 space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">File Info</p>
            {[
              { label: "Language", value: file.language },
              { label: "Size", value: formatSize(file.size) },
              { label: "Lines", value: `${file.content.split("\n").length}` },
              { label: "Modified", value: timeAgo(file.mtime) },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
