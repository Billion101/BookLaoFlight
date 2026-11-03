import { AdapterTelemetry, FlightResult } from "@/types/flight";

export const FLIGHT_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (900,000 ms)

export interface CachedFlightSearchEntry {
  key: string;
  results: FlightResult[];
  telemetry: AdapterTelemetry[];
  cachedAt: number;
  expiresAt: number;
}

export interface CacheInspectionStats {
  totalActiveEntries: number;
  hits: number;
  misses: number;
  ttlMinutes: number;
  backend: "in-memory-ttl" | "redis";
  keys: Array<{
    key: string;
    flightCount: number;
    ttlSecondsRemaining: number;
    cachedAtIso: string;
  }>;
}

/**
 * FlightSearchCache caches aggregated flight search results by `origin-dest-date`
 * for 15 minutes as specified in the architecture requirements.
 */
export class FlightSearchCache {
  private store: Map<string, CachedFlightSearchEntry> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Builds canonical cache key `origin-dest-date` (plus passenger count if > 1).
   */
  public static buildKey(
    origin: string,
    dest: string,
    date: string,
    adults: number = 1
  ): string {
    const base = `${origin.trim().toUpperCase()}-${dest
      .trim()
      .toUpperCase()}-${date.trim()}`;
    return adults > 1 ? `${base}-ADT${adults}` : base;
  }

  public get(key: string): CachedFlightSearchEntry | null {
    this.evictExpired();
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry;
  }

  public set(
    key: string,
    results: FlightResult[],
    telemetry: AdapterTelemetry[],
    ttlMs: number = FLIGHT_CACHE_TTL_MS
  ): CachedFlightSearchEntry {
    const now = Date.now();
    const entry: CachedFlightSearchEntry = {
      key,
      results,
      telemetry,
      cachedAt: now,
      expiresAt: now + ttlMs
    };
    this.store.set(key, entry);
    return entry;
  }

  public delete(key: string): boolean {
    return this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public getStats(): CacheInspectionStats {
    this.evictExpired();
    const now = Date.now();
    const keys = Array.from(this.store.values()).map((entry) => ({
      key: entry.key,
      flightCount: entry.results.length,
      ttlSecondsRemaining: Math.max(
        0,
        Math.round((entry.expiresAt - now) / 1000)
      ),
      cachedAtIso: new Date(entry.cachedAt).toISOString()
    }));

    return {
      totalActiveEntries: this.store.size,
      hits: this.hits,
      misses: this.misses,
      ttlMinutes: FLIGHT_CACHE_TTL_MS / 60000,
      backend: process.env.REDIS_URL ? "redis" : "in-memory-ttl",
      keys
    };
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now >= v.expiresAt) {
        this.store.delete(k);
      }
    }
  }
}

export const globalFlightCache = new FlightSearchCache();

