export type AirlineName = "Lao Airlines" | "Lao Skyway" | "Lanexang Airways";

export type CurrencyCode = "LAK" | "USD";

export type DataSourceTier =
  | "live-api"
  | "playwright-fallback"
  | "verified-schedule";

export interface TaxDetail {
  name: string;
  code?: string;
  amount: number;
}

export interface FareTierOption {
  brandName: string;
  cabinClass: "Economy" | "Business";
  bookingClass: string;
  amount: number; // Total payable amount in selected currency (Base Fare + Taxes)
  baseFare?: number;
  taxAmount?: number;
  currency: CurrencyCode;
  baggageKg: number;
  refundable: boolean;
  taxDetails?: TaxDetail[];
  // Real native dual-currency amounts from airline booking engine
  amountLak?: number;
  amountUsd?: number;
  baseFareLak?: number;
  baseFareUsd?: number;
  taxAmountLak?: number;
  taxAmountUsd?: number;
}

export interface PriceBreakdown {
  amount: number; // Total payable price
  currency: CurrencyCode;
  baseFare?: number;
  taxAmount?: number;
  taxDetails?: TaxDetail[];
}

export interface FlightResult {
  id: string;
  airline: AirlineName;
  airlineLogoUrl?: string;
  flightNumber: string;
  origin: { code: string; name: string };
  destination: { code: string; name: string };
  departureTime: string; // ISO 8601
  arrivalTime: string;   // ISO 8601
  durationMinutes: number;
  price: PriceBreakdown;
  // Authentic native dual-currency pricing from each airline portal
  priceLak?: PriceBreakdown;
  priceUsd?: PriceBreakdown;
  seatAvailable?: number;
  bookingUrl: string; // Direct deep-link to the airline's booking page
  // Availability status
  isAvailable?: boolean;
  soldOut?: boolean;
  // Extended metadata for UI comparison & transparency
  cabinClass?: "Economy" | "Business";
  aircraft?: string;
  fareBrand?: string;
  baggageKg?: number;
  fareTiers?: FareTierOption[];
  dataSource?: DataSourceTier;
  engineName?: string;
}

export interface AirlineAvailabilityInfo {
  airline: AirlineName;
  carrierCode: string;
  hasFlights: boolean;
  flightsCount: number;
  operatingDays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  operatingDaysSummary?: string; // e.g. "Mon, Wed, Fri, Sun" or "Daily"
  status:
    | "available"
    | "no-flights-on-day"
    | "route-not-operated"
    | "sold-out"
    | "error";
  message: string;
  nextAvailableDate?: string;
  closestDates?: string[]; // e.g. ["2026-12-08", "2026-12-11"]
}

export interface AirlineScraper {
  readonly airline: AirlineName;
  readonly carrierCode: string;
  readonly engineName: string;
  searchFlights(
    origin: string,
    dest: string,
    date: string,
    adults: number,
    preferredCurrency?: CurrencyCode
  ): Promise<FlightResult[]>;
  getOperatingScheduleInfo?(
    origin: string,
    dest: string
  ): {
    operatesRoute: boolean;
    daysOfWeek: number[];
    daysSummary: string;
  } | null;
}

export interface AdapterTelemetry {
  airline: AirlineName;
  carrierCode: string;
  engineName: string;
  endpointUrl: string;
  status: "live" | "fallback-schedule" | "fallback-playwright" | "error";
  latencyMs: number;
  flightsFound: number;
  dataSource: DataSourceTier;
  note?: string;
}

export interface MetasearchResponse {
  query: {
    origin: string;
    destination: string;
    date: string;
    adults: number;
    preferredCurrency: CurrencyCode;
  };
  cache: {
    key: string;
    hit: boolean;
    ttlSecondsRemaining: number;
    cachedAt: string;
    expiresAt: string;
    backend: "in-memory-ttl" | "redis";
  };
  exchangeRate: {
    usdToLak: number;
    source: string;
  };
  telemetry: AdapterTelemetry[];
  airlineAvailability?: AirlineAvailabilityInfo[];
  results: FlightResult[];
  summary: {
    totalFlights: number;
    cheapestLak: number | null;
    cheapestUsd: number | null;
    fastestDurationMinutes: number | null;
    airlinesOperating: AirlineName[];
  };
}

export interface LaosAirport {
  code: string;
  name: string;
  city: string;
  nameLao: string;
  province: string;
  region: "Northern" | "Central" | "Southern";
  coordinates: {
    lat: number;
    lng: number;
    mapX: number; // Normalized SVG X (0-400)
    mapY: number; // Normalized SVG Y (0-520)
  };
  airlines: AirlineName[];
  elevationMeters: number;
  highlightTag: string;
}
