import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // Landing page
  index("routes/home.tsx"),

  // App UI (under /app)
  route("app", "routes/app.home.tsx"),
  route("app/workspace/:id", "routes/app.workspace.tsx"),
  route("app/workspace/:id/file/*", "routes/app.workspace.file.tsx"),

  // Sync API
  route("api/sync", "routes/api.sync.ts"),
  route("api/sync/stream", "routes/api.sync.stream.ts"),

  // MCP server (handles GET, POST, DELETE via loader/action)
  route("mcp", "routes/mcp.ts"),
] satisfies RouteConfig;
