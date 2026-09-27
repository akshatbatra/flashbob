import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Allow the Fly.io app origin and any VS Code / extension origins that POST
  // to actions. Without this, React Router's CSRF guard rejects requests whose
  // Origin header doesn't exactly match request.url, producing a sanitized
  // "Unexpected Server Error" on the client.
  allowedActionOrigins: [
    "flashbob.fly.dev",
    "*.fly.dev",
  ],
} satisfies Config;
