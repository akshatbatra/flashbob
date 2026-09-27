/**
 * /mcp — Streamable HTTP MCP endpoint.
 *
 * The WebStandardStreamableHTTPServerTransport handles GET (SSE), POST
 * (JSON-RPC), and DELETE (session teardown) on a single route.
 *
 * IBM Bob / VS Code connects to this URL in its MCP client config:
 *   { "url": "https://your-app.com/mcp" }
 *
 * Stateless per-request mode: a fresh transport + server is created for
 * each request. State is in the global store (store.server.ts), not in
 * the transport session.
 */

import type { Route } from "./+types/mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "~/lib/mcp.server";

async function handleMcp(request: Request): Promise<Response> {
  // Add CORS headers so IBM Bob (potentially on a different origin) can connect
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, mcp-session-id, Last-Event-ID, mcp-protocol-version, Authorization",
    "Access-Control-Expose-Headers": "mcp-session-id, mcp-protocol-version",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  const server = createMcpServer();
  await server.connect(transport);

  const response = await transport.handleRequest(request);

  // Merge CORS headers into the transport response
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders)) {
    headers.set(k, v);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function loader({ request }: Route.LoaderArgs) {
  return handleMcp(request);
}

export async function action({ request }: Route.ActionArgs) {
  return handleMcp(request);
}
