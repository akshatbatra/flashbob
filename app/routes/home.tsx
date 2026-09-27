import type { Route } from "./+types/home";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FlashBob — Live Workspace Mirror for IBM Bob" },
    {
      name: "description",
      content:
        "Mirror your IBM Bob workspace to the cloud in real time. Connect your agent via MCP and let Jev select only the files that matter.",
    },
  ];
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a12] text-white overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-10 h-14 border-b border-white/8 bg-[#0a0a12]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <img src="/flashbob-icon.png" alt="FlashBob" className="w-6 h-6 object-contain" />
          <span className="font-bold text-sm tracking-tight">FlashBob</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/app"
            className="text-xs font-medium px-4 py-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 transition-colors text-white"
          >
            Open App →
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 md:px-10 text-center overflow-hidden">
        {/* Background glow blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/20 blur-[120px]" />
          <div className="absolute top-1/3 -left-24 w-[400px] h-[400px] rounded-full bg-violet-600/15 blur-[100px]" />
          <div className="absolute top-1/2 -right-24 w-[400px] h-[400px] rounded-full bg-sky-600/10 blur-[100px]" />
        </div>

        {/* Pill badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          MCP Streamable HTTP · Powered by Jev
        </div>

        <h1 className="relative text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Your workspace,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400">
            mirrored live
          </span>{" "}
          for your agent
        </h1>

        <p className="relative mt-6 text-base md:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
          FlashBob streams every file save from IBM Bob to the cloud.
          Your AI agent connects over MCP and uses{" "}
          <span className="text-violet-300 font-semibold">Jev</span> to pick
          only the files that are relevant — keeping your context window lean and sharp.
        </p>

        <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition-all text-sm font-semibold shadow-lg shadow-indigo-500/30"
          >
            Open the App
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 hover:border-white/30 text-sm font-medium text-white/70 hover:text-white transition-all"
          >
            How it works
          </a>
        </div>

        {/* Mock app window */}
        <div className="relative mt-20 max-w-4xl mx-auto">
          <div className="rounded-xl border border-white/10 bg-[#111120] overflow-hidden shadow-2xl shadow-black/60">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-[#0d0d1a]">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <div className="flex-1 mx-3 rounded bg-white/5 h-5 text-[10px] text-white/30 font-mono flex items-center px-3">
                flashbob.example.com/app
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                MCP Live
              </div>
            </div>
            {/* App body sketch */}
            <div className="flex h-[300px] md:h-[380px]">
              {/* Sidebar */}
              <div className="w-[220px] shrink-0 border-r border-white/8 flex flex-col">
                <div className="px-3 py-2 border-b border-white/8">
                  <div className="text-[9px] font-semibold text-white/30 uppercase tracking-widest">Workspaces</div>
                </div>
                {[
                  { name: "my-next-app", files: 148, active: true },
                  { name: "api-service", files: 62, active: false },
                  { name: "design-system", files: 91, active: false },
                ].map((ws) => (
                  <div
                    key={ws.name}
                    className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-white/5 ${ws.active ? "bg-indigo-500/10" : ""}`}
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" className={ws.active ? "text-indigo-400" : "text-white/30"}><path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.086a1.5 1.5 0 0 1 1.06.44l.915.914A1.5 1.5 0 0 0 7.62 3.8H10.5A1.5 1.5 0 0 1 12 5.3V10A1.5 1.5 0 0 1 10.5 11.5h-8A1.5 1.5 0 0 1 1 10V3.5Z" stroke="currentColor" strokeWidth="1.2"/></svg>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-medium truncate ${ws.active ? "text-white" : "text-white/50"}`}>{ws.name}</div>
                      <div className="text-[9px] text-white/25">{ws.files} files</div>
                    </div>
                    {ws.active && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                  </div>
                ))}
              </div>
              {/* Main area */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-3 px-4 py-2 border-b border-white/8 bg-[#0d0d1a]/60 text-[9px] text-white/30">
                  <span className="text-white/50">4 Files</span>
                  <span>·</span>
                  <span>2 Dirs</span>
                  <span>·</span>
                  <span>38.4KB</span>
                  <span>·</span>
                  <span className="text-emerald-400">synced just now</span>
                </div>
                <div className="divide-y divide-white/5 flex-1 overflow-hidden">
                  {[
                    { path: "src/app/page.tsx", lang: "typescript", size: "4.2KB", color: "text-sky-400" },
                    { path: "src/components/Button.tsx", lang: "typescript", size: "2.1KB", color: "text-sky-400" },
                    { path: "src/styles/globals.css", lang: "css", size: "1.8KB", color: "text-pink-400" },
                    { path: "package.json", lang: "json", size: "1.2KB", color: "text-purple-400" },
                    { path: "tailwind.config.ts", lang: "typescript", size: "0.9KB", color: "text-sky-400" },
                    { path: "README.md", lang: "markdown", size: "3.1KB", color: "text-white/40" },
                  ].map((f) => (
                    <div key={f.path} className="flex items-center gap-3 px-4 py-2 hover:bg-white/3">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="text-white/20 shrink-0"><path d="M1.5 1h5.086a.5.5 0 0 1 .353.146l2.915 2.915A.5.5 0 0 1 10 4.414V10a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 1 10V1.5a.5.5 0 0 1 .5-.5Z" stroke="currentColor" strokeWidth="1"/></svg>
                      <span className="text-[11px] text-white/55 flex-1 truncate font-mono">{f.path}</span>
                      <span className="text-[9px] text-white/25">{f.size}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 ${f.color}`}>{f.lang}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 inset-x-8 h-20 bg-indigo-600/20 blur-2xl rounded-full pointer-events-none" />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-24 px-6 md:px-10">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-violet-700/10 blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">How it works</div>
            <h2 className="text-3xl md:text-4xl font-bold">Three steps to smarter context</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                num: "01",
                color: "from-sky-500 to-blue-600",
                glow: "shadow-sky-500/20",
                border: "border-sky-500/20",
                title: "Link your folder",
                desc: "Install the FlashBob extension in IBM Bob. Point it at your open workspace. It sends a full file snapshot to FlashBob instantly.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-sky-400"><path d="M2 6A2 2 0 0 1 4 4h4.172a2 2 0 0 1 1.414.586l1.828 1.828A2 2 0 0 0 12.828 7H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Z" stroke="currentColor" strokeWidth="1.5"/></svg>
                ),
              },
              {
                num: "02",
                color: "from-violet-500 to-purple-600",
                glow: "shadow-violet-500/20",
                border: "border-violet-500/20",
                title: "Files sync live",
                desc: "Every save in IBM Bob streams a delta patch here. Your cloud mirror stays up to the second without any polling.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-violet-400"><path d="M4 11a7 7 0 1 1 14 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 4V2M11 20v-2M4.22 4.22l1.42 1.42M16.36 16.36l1.42 1.42M2 11h2M18 11h2M4.22 17.78l1.42-1.42M16.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                ),
              },
              {
                num: "03",
                color: "from-emerald-500 to-teal-600",
                glow: "shadow-emerald-500/20",
                border: "border-emerald-500/20",
                title: "Agent uses MCP",
                desc: "Add the MCP URL to IBM Bob. The agent calls get_relevant_files and Jev scores each file — only the right context gets loaded.",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" className="text-emerald-400"><circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M11 2v3M11 17v3M2 11h3M17 11h3M4.93 4.93l2.12 2.12M14.95 14.95l2.12 2.12M4.93 17.07l2.12-2.12M14.95 7.05l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                ),
              },
            ].map(({ num, color, glow, border, title, desc, icon }) => (
              <div
                key={num}
                className={`relative rounded-2xl border ${border} bg-white/3 p-6 space-y-4 shadow-xl ${glow} hover:-translate-y-1 transition-transform duration-200`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${glow}`}>
                  {icon}
                </div>
                <div className="text-[10px] font-bold text-white/20 tracking-widest">{num}</div>
                <div>
                  <h3 className="font-bold text-base mb-1.5">{title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block text-xs font-semibold uppercase tracking-widest text-violet-400 mb-3">Built for agents</div>
            <h2 className="text-3xl md:text-4xl font-bold">Everything your agent needs</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                accent: "bg-indigo-500",
                title: "Jev-powered relevance",
                desc: "Jev (typesafe/jev-1.13) classifies every file against your agent's current task. Only relevant files are loaded into context.",
              },
              {
                accent: "bg-violet-500",
                title: "MCP Streamable HTTP",
                desc: "One URL. No auth setup. Add it to bob.mcpServers and your agent has 5 live tools: list, search, read, summarise.",
              },
              {
                accent: "bg-sky-500",
                title: "Real-time delta sync",
                desc: "File changes push as SSE patches the instant you hit save. The mirror is never stale — even mid-conversation.",
              },
              {
                accent: "bg-emerald-500",
                title: "Multiple workspaces",
                desc: "Mirror as many folders as you need. Each gets its own live connection, file tree, and MCP context slice.",
              },
              {
                accent: "bg-pink-500",
                title: "In-browser file viewer",
                desc: "Browse the mirrored tree, open any file, and run Jev classifications interactively from the web app.",
              },
              {
                accent: "bg-amber-500",
                title: "Zero infra",
                desc: "Deploy with Docker or to any Node host. No database — state lives in memory, files stream from your editor.",
              },
            ].map(({ accent, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 rounded-xl border border-white/8 bg-white/2 hover:bg-white/4 transition-colors">
                <div className={`w-2 rounded-full ${accent} shrink-0 mt-1`} style={{ minHeight: "2rem" }} />
                <div>
                  <h4 className="font-semibold text-sm mb-1.5">{title}</h4>
                  <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MCP snippet ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6 md:px-10">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div>
            <div className="inline-block text-xs font-semibold uppercase tracking-widest text-sky-400 mb-3">Connect in seconds</div>
            <h2 className="text-3xl md:text-4xl font-bold">One snippet. Done.</h2>
            <p className="mt-4 text-white/50 text-sm leading-relaxed">
              Paste this into your IBM Bob MCP config and your agent is live.
            </p>
          </div>

          <div className="relative rounded-xl border border-white/10 bg-[#111120] overflow-hidden text-left">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 bg-[#0d0d1a]">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-[10px] text-white/30 font-mono">.bob/mcp.json</span>
            </div>
            <pre className="text-[13px] font-mono leading-relaxed p-5 text-indigo-200 overflow-x-auto">{`{
  "mcpServers": {
    "flashbob": {
      "url": "https://flashbob.fly.dev/mcp"
    }
  }
}`}</pre>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {["list_workspaces", "list_files", "get_relevant_files", "get_file_content", "get_workspace_summary"].map((tool) => (
              <div key={tool} className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-[11px] font-mono text-violet-300 text-center">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 md:px-10 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-indigo-600/20 blur-[100px] rounded-full" />
        </div>
        <div className="relative max-w-xl mx-auto space-y-6">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Ready to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              flash your context?
            </span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Open the app, link your first folder, and have your agent reading live code in under a minute.
          </p>
          <Link
            to="/app"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition-all text-sm font-bold shadow-xl shadow-indigo-500/30"
          >
            Open FlashBob
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/8 px-6 md:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/25">
        <div className="flex items-center gap-2">
          <img src="/flashbob-icon.png" alt="FlashBob" className="w-4 h-4 object-contain opacity-50" />
          <span>FlashBob — Live Workspace Mirror</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Powered by Jev · IBM Bob · MCP</span>
        </div>
      </footer>
    </div>
  );
}
