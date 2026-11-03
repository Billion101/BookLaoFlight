import { serve } from "@hono/node-server";
import { honoApp } from "@/server/api/hono-app";

const port = parseInt(process.env.API_PORT || "4000", 10);

console.log(
  `[Laos Flight Metasearch API] Starting Hono server on http://localhost:${port}/api/flights/health`
);

serve({
  fetch: honoApp.fetch,
  port
});

