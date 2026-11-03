import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  LAOS_AIRPORTS,
  POPULAR_LAOS_ROUTES,
  USD_TO_LAK_RATE
} from "@/data/laos-airports";
import { globalFlightCache } from "@/server/cache/flight-cache";
import { globalMetasearchService } from "@/server/services/metasearch.service";
import { CurrencyCode } from "@/types/flight";

export const honoApp = new Hono().basePath("/api");

honoApp.use("*", cors());

/**
 * GET /api/flights/search
 * Query params: origin, dest, date (YYYY-MM-DD), adults, currency (LAK|USD), bypassCache (true|false)
 */
honoApp.get("/flights/search", async (c) => {
  const origin = (c.req.query("origin") || "VTE").toUpperCase();
  const dest = (
    c.req.query("dest") ||
    c.req.query("destination") ||
    "LPQ"
  ).toUpperCase();
  const date =
    c.req.query("date") || new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const adults = parseInt(c.req.query("adults") || "1", 10) || 1;
  const currency = (c.req.query("currency") || "LAK").toUpperCase() as CurrencyCode;
  const bypassCache = c.req.query("bypassCache") === "true";

  if (origin === dest) {
    return c.json(
      {
        error: "Origin and destination airports cannot be identical."
      },
      400
    );
  }

  const response = await globalMetasearchService.searchAllAirlines({
    origin,
    destination: dest,
    date,
    adults,
    currency: currency === "USD" ? "USD" : "LAK",
    bypassCache
  });

  return c.json(response);
});

/**
 * GET /api/flights/airports
 * Returns all domestic Laos airports, popular routes, and official exchange rate.
 */
honoApp.get("/flights/airports", (c) => {
  return c.json({
    airports: LAOS_AIRPORTS,
    popularRoutes: POPULAR_LAOS_ROUTES,
    usdToLakRate: USD_TO_LAK_RATE
  });
});

/**
 * GET /api/flights/cache
 * Inspects the 15-minute TTL cache statistics and active keys.
 */
honoApp.get("/flights/cache", (c) => {
  return c.json(globalFlightCache.getStats());
});

/**
 * DELETE /api/flights/cache
 * Flushes the flight search cache.
 */
honoApp.delete("/flights/cache", (c) => {
  globalFlightCache.clear();
  return c.json({
    cleared: true,
    stats: globalFlightCache.getStats()
  });
});

/**
 * GET /api/flights/health
 * Health check endpoint reporting adapter status.
 */
honoApp.get("/flights/health", (c) => {
  return c.json({
    status: "ok",
    service: "Sabaidee Sky — Laos Domestic Flight Metasearch API",
    adapters: [
      {
        airline: "Lao Airlines",
        carrierCode: "QV",
        engine: "Sabre Digital Experience (QVDX)"
      },
      {
        airline: "Lao Skyway",
        carrierCode: "LK",
        engine: "Intelisys Amelia RESTv1"
      },
      {
        airline: "Lanexang Airways",
        carrierCode: "5A",
        engine: "Avantik MyBravo PSS"
      }
    ],
    cacheStats: globalFlightCache.getStats()
  });
});

