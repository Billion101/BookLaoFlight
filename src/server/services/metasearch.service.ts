import { convertCurrency, USD_TO_LAK_RATE } from "@/data/laos-airports";
import { getClosestOperatingDates, getDayOfWeek } from "@/server/adapters/base-adapter";
import { LaoAirlinesAdapter } from "@/server/adapters/lao-airlines.adapter";
import { LaoSkywayAdapter } from "@/server/adapters/lao-skyway.adapter";
import { LXAirwaysAdapter } from "@/server/adapters/lx-airways.adapter";
import {
  FLIGHT_CACHE_TTL_MS,
  FlightSearchCache,
  globalFlightCache
} from "@/server/cache/flight-cache";
import {
  AdapterTelemetry,
  AirlineAvailabilityInfo,
  AirlineName,
  CurrencyCode,
  FlightResult,
  MetasearchResponse
} from "@/types/flight";

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  date: string;
  adults?: number;
  currency?: CurrencyCode;
  bypassCache?: boolean;
}

export class FlightMetasearchService {
  private readonly laoAirlines = new LaoAirlinesAdapter();
  private readonly laoSkyway = new LaoSkywayAdapter();
  private readonly lxAirways = new LXAirwaysAdapter();

  constructor(private readonly cache: FlightSearchCache = globalFlightCache) {}

  public async searchAllAirlines(
    params: SearchFlightsParams
  ): Promise<MetasearchResponse> {
    const origin = params.origin.trim().toUpperCase();
    const destination = params.destination.trim().toUpperCase();
    const date = params.date.trim().slice(0, 10);
    const adults = Math.max(1, Math.min(9, params.adults ?? 1));
    const preferredCurrency: CurrencyCode =
      params.currency === "USD" ? "USD" : "LAK";

    const cacheKey = FlightSearchCache.buildKey(
      origin,
      destination,
      date,
      adults
    );

    const adapterDefinitions = [
      {
        adapter: this.laoAirlines,
        endpointUrl:
          "https://booking.laoairlines.com/dx/QVDX/#/flight-selection"
      },
      {
        adapter: this.laoSkyway,
        endpointUrl:
          "https://laoskyway-api.intelisys.ca/RESTv1/travelOptions"
      },
      {
        adapter: this.lxAirways,
        endpointUrl:
          "https://lxw_mybravo.avantik.io/en/Home/Availability"
      }
    ];

    if (!params.bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        // Compute availability info for cached view
        const airlineAvailability: AirlineAvailabilityInfo[] = adapterDefinitions.map(
          ({ adapter }) => {
            const flightsForAirline = cached.results.filter(
              (r) => r.airline === adapter.airline
            );
            const schedInfo = adapter.getOperatingScheduleInfo?.(origin, destination);
            return this.buildAirlineAvailabilityItem(
              adapter.airline,
              adapter.carrierCode,
              flightsForAirline.length,
              date,
              origin,
              destination,
              schedInfo
            );
          }
        );

        return this.buildResponse({
          origin,
          destination,
          date,
          adults,
          preferredCurrency,
          cacheKey,
          cacheHit: true,
          cachedAt: cached.cachedAt,
          expiresAt: cached.expiresAt,
          results: cached.results,
          telemetry: cached.telemetry,
          airlineAvailability
        });
      }
    }

    // Parallel execution across all 3 airline adapters passing preferred currency
    const settled = await Promise.all(
      adapterDefinitions.map(async ({ adapter, endpointUrl }) => {
        const start = performance.now();
        try {
          const flights = await adapter.searchFlights(
            origin,
            destination,
            date,
            adults,
            preferredCurrency
          );
          const latencyMs = Math.round(performance.now() - start);
          const dataSource = adapter.lastDataSource;
          const status: AdapterTelemetry["status"] =
            dataSource === "live-api"
              ? "live"
              : dataSource === "playwright-fallback"
              ? "fallback-playwright"
              : "fallback-schedule";

          const telemetry: AdapterTelemetry = {
            airline: adapter.airline,
            carrierCode: adapter.carrierCode,
            engineName: adapter.engineName,
            endpointUrl,
            status,
            latencyMs,
            flightsFound: flights.length,
            dataSource,
            note: adapter.lastStatusNote
          };

          const schedInfo = adapter.getOperatingScheduleInfo?.(origin, destination);
          const availability = this.buildAirlineAvailabilityItem(
            adapter.airline,
            adapter.carrierCode,
            flights.length,
            date,
            origin,
            destination,
            schedInfo
          );

          return { flights, telemetry, availability };
        } catch (err) {
          const latencyMs = Math.round(performance.now() - start);
          const telemetry: AdapterTelemetry = {
            airline: adapter.airline,
            carrierCode: adapter.carrierCode,
            engineName: adapter.engineName,
            endpointUrl,
            status: "error",
            latencyMs,
            flightsFound: 0,
            dataSource: "verified-schedule",
            note: err instanceof Error ? err.message : "Adapter timeout"
          };

          const schedInfo = adapter.getOperatingScheduleInfo?.(origin, destination);
          const availability = this.buildAirlineAvailabilityItem(
            adapter.airline,
            adapter.carrierCode,
            0,
            date,
            origin,
            destination,
            schedInfo
          );

          return { flights: [] as FlightResult[], telemetry, availability };
        }
      })
    );

    const allResults = settled.flatMap((item) => item.flights);
    const telemetry = settled.map((item) => item.telemetry);
    const airlineAvailability = settled.map((item) => item.availability);

    // Sort default by departure time ascending
    allResults.sort(
      (a, b) =>
        new Date(a.departureTime).getTime() -
        new Date(b.departureTime).getTime()
    );

    const cachedEntry = this.cache.set(
      cacheKey,
      allResults,
      telemetry,
      FLIGHT_CACHE_TTL_MS
    );

    return this.buildResponse({
      origin,
      destination,
      date,
      adults,
      preferredCurrency,
      cacheKey,
      cacheHit: false,
      cachedAt: cachedEntry.cachedAt,
      expiresAt: cachedEntry.expiresAt,
      results: allResults,
      telemetry,
      airlineAvailability
    });
  }

  private buildAirlineAvailabilityItem(
    airline: AirlineName,
    carrierCode: string,
    flightsFound: number,
    date: string,
    origin: string,
    destination: string,
    schedInfo?: { operatesRoute: boolean; daysOfWeek: number[]; daysSummary: string } | null
  ): AirlineAvailabilityInfo {
    const dow = getDayOfWeek(date);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    if (flightsFound > 0) {
      return {
        airline,
        carrierCode,
        hasFlights: true,
        flightsCount: flightsFound,
        operatingDays: schedInfo?.daysOfWeek,
        operatingDaysSummary: schedInfo?.daysSummary,
        status: "available",
        message: `${flightsFound} flight(s) available on this date`
      };
    }

    if (schedInfo && !schedInfo.operatesRoute) {
      return {
        airline,
        carrierCode,
        hasFlights: false,
        flightsCount: 0,
        status: "route-not-operated",
        message: `Does not operate non-stop service between ${origin} and ${destination}`
      };
    }

    if (schedInfo && schedInfo.operatesRoute) {
      const closestDates = getClosestOperatingDates(date, schedInfo.daysOfWeek);
      return {
        airline,
        carrierCode,
        hasFlights: false,
        flightsCount: 0,
        operatingDays: schedInfo.daysOfWeek,
        operatingDaysSummary: schedInfo.daysSummary,
        status: "no-flights-on-day",
        message: `No flights scheduled on ${dayNames[dow]}s (Operates: ${schedInfo.daysSummary})`,
        closestDates
      };
    }

    return {
      airline,
      carrierCode,
      hasFlights: false,
      flightsCount: 0,
      status: "sold-out",
      message: "No flight slots available on this date"
    };
  }

  private buildResponse(args: {
    origin: string;
    destination: string;
    date: string;
    adults: number;
    preferredCurrency: CurrencyCode;
    cacheKey: string;
    cacheHit: boolean;
    cachedAt: number;
    expiresAt: number;
    results: FlightResult[];
    telemetry: AdapterTelemetry[];
    airlineAvailability?: AirlineAvailabilityInfo[];
  }): MetasearchResponse {
    const now = Date.now();
    const lakAmounts = args.results.map((r) =>
      r.priceLak?.amount ??
      convertCurrency(r.price.amount, r.price.currency, "LAK", USD_TO_LAK_RATE)
    );
    const usdAmounts = args.results.map((r) =>
      r.priceUsd?.amount ??
      convertCurrency(r.price.amount, r.price.currency, "USD", USD_TO_LAK_RATE)
    );
    const durations = args.results.map((r) => r.durationMinutes);
    const airlinesOperating = Array.from(
      new Set(args.results.map((r) => r.airline))
    ) as AirlineName[];

    return {
      query: {
        origin: args.origin,
        destination: args.destination,
        date: args.date,
        adults: args.adults,
        preferredCurrency: args.preferredCurrency
      },
      cache: {
        key: args.cacheKey,
        hit: args.cacheHit,
        ttlSecondsRemaining: Math.max(
          0,
          Math.round((args.expiresAt - now) / 1000)
        ),
        cachedAt: new Date(args.cachedAt).toISOString(),
        expiresAt: new Date(args.expiresAt).toISOString(),
        backend: process.env.REDIS_URL ? "redis" : "in-memory-ttl"
      },
      exchangeRate: {
        usdToLak: USD_TO_LAK_RATE,
        source: "Lao Skyway Intelisys RESTv1 (/RESTv1/currencies)"
      },
      telemetry: args.telemetry,
      airlineAvailability: args.airlineAvailability,
      results: args.results,
      summary: {
        totalFlights: args.results.length,
        cheapestLak: lakAmounts.length > 0 ? Math.min(...lakAmounts) : null,
        cheapestUsd: usdAmounts.length > 0 ? Math.min(...usdAmounts) : null,
        fastestDurationMinutes:
          durations.length > 0 ? Math.min(...durations) : null,
        airlinesOperating
      }
    };
  }
}

export const globalMetasearchService = new FlightMetasearchService();
