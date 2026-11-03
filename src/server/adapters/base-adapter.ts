import { getAirportInfo } from "@/data/laos-airports";
import {
  AirlineName,
  CurrencyCode,
  FlightResult,
  PriceBreakdown
} from "@/types/flight";

/**
 * Formats a YYYY-MM-DD date and HH:mm time (e.g. "9:30" or "14:05") into
 * an ISO 8601 timestamp in Laos Standard Time (UTC+07:00).
 */
export function buildLaosIsoTimestamp(
  dateStr: string,
  timeStr: string
): string {
  const cleanDate = dateStr.trim().slice(0, 10);
  const parts = timeStr.trim().replace(/\s+/g, "").split(":");
  const hh = (parts[0] ?? "00").padStart(2, "0");
  const mm = (parts[1] ?? "00").padStart(2, "0");
  return `${cleanDate}T${hh}:${mm}:00+07:00`;
}

/**
 * Computes flight duration in minutes between two ISO 8601 timestamps.
 */
export function calculateDurationMinutes(
  departureIso: string,
  arrivalIso: string
): number {
  const depMs = new Date(departureIso).getTime();
  const arrMs = new Date(arrivalIso).getTime();
  if (Number.isNaN(depMs) || Number.isNaN(arrMs)) {
    return 60;
  }
  const diff = Math.round((arrMs - depMs) / 60000);
  return diff > 0 ? diff : diff + 24 * 60;
}

/**
 * Parses duration strings such as "1hr00min", "0h 45m", or "50m" into minutes.
 */
export function parseDurationString(raw?: string | null): number | null {
  if (!raw) return null;
  const hrMatch = raw.match(/(\d+)\s*(?:hr|h|hour)/i);
  const minMatch = raw.match(/(\d+)\s*(?:min|m)/i);
  if (!hrMatch && !minMatch) return null;
  const hours = hrMatch ? parseInt(hrMatch[1], 10) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  const total = hours * 60 + mins;
  return total > 0 ? total : null;
}

/**
 * Parses numeric strings with commas or currency symbols (e.g. "1,820,000").
 */
export function parseAmountSmart(
  raw: string | number | null | undefined
): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw || typeof raw !== "string") return 0;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === "N/A") return 0;
  const cleaned = trimmed.replace(/[^0-9.-]/g, "");
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Returns day-of-week index (0 = Sun, 1 = Mon, ..., 6 = Sat) for YYYY-MM-DD.
 */
export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return new Date().getDay();
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Summarizes an array of day-of-week numbers into a human-friendly string.
 * e.g. [0, 1, 2, 3, 4, 5, 6] -> "Daily"
 *      [0, 3, 5] -> "Sun, Wed, Fri"
 */
export function formatDaysOfWeekSummary(days: number[]): string {
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  if (unique.length === 7) return "Daily";
  if (unique.length === 0) return "No scheduled days";
  return unique.map((d) => DAY_NAMES[d] ?? `Day${d}`).join(", ");
}

/**
 * Returns closest YYYY-MM-DD dates around targetDate that fall on one of daysOfWeek.
 */
export function getClosestOperatingDates(
  targetDate: string,
  daysOfWeek: number[],
  maxResults: number = 3
): string[] {
  if (daysOfWeek.length === 0) return [];
  const [y, m, d] = targetDate.split("-").map((v) => parseInt(v, 10));
  const results: string[] = [];
  // Search forward and backward within a 14-day window
  for (let offset = 1; offset <= 10; offset++) {
    // Check next day
    const nextDt = new Date(Date.UTC(y, m - 1, d + offset));
    if (daysOfWeek.includes(nextDt.getUTCDay())) {
      const iso = nextDt.toISOString().slice(0, 10);
      if (!results.includes(iso)) results.push(iso);
    }
    // Check previous day if not past
    const prevDt = new Date(Date.UTC(y, m - 1, d - offset));
    if (daysOfWeek.includes(prevDt.getUTCDay())) {
      const iso = prevDt.toISOString().slice(0, 10);
      if (!results.includes(iso)) results.push(iso);
    }
    if (results.length >= maxResults) break;
  }
  return results.sort();
}

/**
 * Formats YYYY-MM-DD into Sabre QVDX's required MM-DD-YYYY format.
 */
export function formatSabreDate(dateStr: string): string {
  const parts = dateStr.trim().split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[1]}-${parts[2]}-${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats YYYY-MM-DD into Avantik's required YYYYMMDD format.
 */
export function formatAvantikDate(dateStr: string): string {
  return dateStr.trim().replace(/-/g, "");
}

/**
 * Deterministic seat availability generator based on flight number + date
 * when an upstream schedule endpoint does not expose exact remaining seat count.
 */
export function estimateSeatAvailability(
  flightNumber: string,
  dateStr: string
): number {
  const seed = `${flightNumber}-${dateStr}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1000;
  }
  return 4 + (hash % 19); // Between 4 and 22 seats
}

function normalizePriceBreakdown(
  pb?: PriceBreakdown | null
): PriceBreakdown | undefined {
  if (!pb || typeof pb.amount !== "number") return undefined;
  return {
    amount: Math.round(pb.amount),
    currency: pb.currency,
    baseFare:
      typeof pb.baseFare === "number" ? Math.round(pb.baseFare) : undefined,
    taxAmount:
      typeof pb.taxAmount === "number" ? Math.round(pb.taxAmount) : undefined,
    taxDetails: pb.taxDetails
  };
}

export function normalizeFlightResult(
  partial: Omit<FlightResult, "origin" | "destination"> & {
    originCode: string;
    destCode: string;
    originName?: string;
    destName?: string;
  }
): FlightResult {
  const originInfo = getAirportInfo(partial.originCode);
  const destInfo = getAirportInfo(partial.destCode);
  return {
    id: partial.id,
    airline: partial.airline as AirlineName,
    airlineLogoUrl: partial.airlineLogoUrl,
    flightNumber: partial.flightNumber,
    origin: {
      code: originInfo.code,
      name: partial.originName || originInfo.name
    },
    destination: {
      code: destInfo.code,
      name: partial.destName || destInfo.name
    },
    departureTime: partial.departureTime,
    arrivalTime: partial.arrivalTime,
    durationMinutes: partial.durationMinutes,
    price: {
      amount: Math.round(partial.price.amount),
      currency: partial.price.currency as CurrencyCode,
      baseFare:
        typeof partial.price.baseFare === "number"
          ? Math.round(partial.price.baseFare)
          : undefined,
      taxAmount:
        typeof partial.price.taxAmount === "number"
          ? Math.round(partial.price.taxAmount)
          : undefined,
      taxDetails: partial.price.taxDetails
    },
    priceLak: normalizePriceBreakdown(partial.priceLak),
    priceUsd: normalizePriceBreakdown(partial.priceUsd),
    seatAvailable: partial.seatAvailable,
    bookingUrl: partial.bookingUrl,
    isAvailable: partial.isAvailable ?? (partial.seatAvailable ? partial.seatAvailable > 0 : true),
    soldOut: partial.soldOut ?? (partial.seatAvailable === 0),
    cabinClass: partial.cabinClass,
    aircraft: partial.aircraft,
    fareBrand: partial.fareBrand,
    baggageKg: partial.baggageKg,
    fareTiers: partial.fareTiers,
    dataSource: partial.dataSource,
    engineName: partial.engineName
  };
}
