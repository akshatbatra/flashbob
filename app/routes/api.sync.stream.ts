/**
 * GET /api/sync/stream?workspaceId=...
 *
 * Server-Sent Events stream.
 * The UI subscribes to this to receive live file change events
 * without polling.
 */

import type { Route } from "./+types/api.sync.stream";
import { getWorkspace } from "~/lib/store.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId");

  if (!workspaceId) {
    return new Response("Missing workspaceId", { status: 400 });
  }

  const ws = getWorkspace(workspaceId);
  if (!ws) {
    return new Response("Workspace not found", { status: 404 });
  }

  let controller!: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      ws.uiSubscribers.add(ctrl);

      // Send initial "connected" heartbeat
      const encoder = new TextEncoder();
      ctrl.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ event: "connected", workspaceId })}\n\n`,
        ),
      );
    },
    cancel() {
      ws.uiSubscribers.delete(controller);
    },
  });

  // Keep-alive ping every 20 seconds to prevent proxy timeouts
  const pingInterval = setInterval(() => {
    try {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`: ping\n\n`));
    } catch {
      clearInterval(pingInterval);
    }
  }, 20_000);

  // Clean up interval when client disconnects
  request.signal.addEventListener("abort", () => {
    clearInterval(pingInterval);
    ws.uiSubscribers.delete(controller);
    try {
      controller.close();
    } catch {
      // already closed
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
