import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  // UI routes
  index("routes/home.tsx"),
  route("workspace/:id", "routes/workspace.tsx"),
  route("workspace/:id/file/*", "routes/workspace.file.tsx"),

  // Sync API
  route("api/sync", "routes/api.sync.ts"),
  route("api/sync/stream", "routes/api.sync.stream.ts"),

  // MCP server (handles GET, POST, DELETE via loader/action)
  route("mcp", "routes/mcp.ts"),
] satisfies RouteConfig;
