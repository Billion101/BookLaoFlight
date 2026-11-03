import { handle } from "hono/vercel";
import { honoApp } from "@/server/api/hono-app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handle(honoApp);
export const POST = handle(honoApp);
export const DELETE = handle(honoApp);

