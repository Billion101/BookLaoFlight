import { USD_TO_LAK_RATE } from "@/data/laos-airports";
import {
  buildLaosIsoTimestamp,
  calculateDurationMinutes,
  estimateSeatAvailability,
  formatDaysOfWeekSummary,
  getDayOfWeek,
  normalizeFlightResult
} from "@/server/adapters/base-adapter";
import { BrowserHttpClient } from "@/server/http/browser-client";
import { fetchWithPlaywrightFallback } from "@/server/http/playwright-fallback";
import {
  AirlineScraper,
  CurrencyCode,
  DataSourceTier,
  FareTierOption,
  FlightResult,
  PriceBreakdown,
  TaxDetail
} from "@/types/flight";

export const LK_AIRPORT_TAX_LAK = 20000;
export const LK_AIRPORT_TAX_USD = 1;

interface IntelisysCurrencyAmount {
  baseAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: {
    code?: string;
  };
}

interface IntelisysFareCharge {
  description?: string;
  chargeType?: {
    code?: string;
    description?: string;
  };
  currencyAmounts?: IntelisysCurrencyAmount[];
}

interface IntelisysFareOption {
  fareValidity?: {
    valid?: boolean;
    soldOut?: boolean;
  };
  bookingCode?: {
    code?: string;
  };
  cabinClass?: {
    code?: string;
    description?: string;
  };
  fareType?: {
    identifier?: string;
    description?: string;
  };
  availability?: number;
  fareCharges?: IntelisysFareCharge[];
}

interface IntelisysFlightLeg {
  airlineCode?: {
    code?: string;
  };
  flightNumber?: string;
  aircraftModel?: {
    identifier?: string;
    name?: string;
  };
  departure?: {
    localScheduledTime?: string;
    airport?: {
      code?: string;
      name?: string;
    };
  };
  arrival?: {
    localScheduledTime?: string;
    airport?: {
      code?: string;
      name?: string;
    };
  };
  availability?: number;
}

interface IntelisysTravelOption {
  departureDate?: string;
  enRouteHours?: number;
  flights?: IntelisysFlightLeg[];
  fareOptions?: IntelisysFareOption[];
}

interface LaoSkywayPublishedFlight {
  flightNumber: string;
  origin: string;
  destination: string;
  depTime: string;
  arrTime: string;
  aircraft: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  baseLakFare: number;
  baseUsdFare: number;
  flexiLakFare: number;
  flexiUsdFare: number;
}

/**
 * Published Lao Skyway (LK) Domestic Network Schedule & Official Dual-Currency Tariffs
 * Extracted from Intelisys Amelia NGI Engine & Official LK Schedule.
 * Currently active domestic routes: VTE-XKH (Daily) and VTE-NEU (Sun, Mon, Wed, Fri).
 */
const LK_DOMESTIC_PUBLISHED_SCHEDULE: LaoSkywayPublishedFlight[] = [
  // Vientiane (VTE) <-> Xieng Khouang (XKH) - Daily
  {
    flightNumber: "LK212",
    origin: "VTE",
    destination: "XKH",
    depTime: "12:15",
    arrTime: "12:50",
    aircraft: "XIAN MA60",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    baseLakFare: 1230000,
    baseUsdFare: 59,
    flexiLakFare: 1330000,
    flexiUsdFare: 64
  },
  {
    flightNumber: "LK213",
    origin: "XKH",
    destination: "VTE",
    depTime: "13:20",
    arrTime: "13:55",
    aircraft: "XIAN MA60",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    baseLakFare: 1230000,
    baseUsdFare: 59,
    flexiLakFare: 1330000,
    flexiUsdFare: 64
  },

  // Vientiane (VTE) <-> Sam Neua (NEU) - Sun, Mon, Wed, Fri
  {
    flightNumber: "LK402",
    origin: "VTE",
    destination: "NEU",
    depTime: "07:30",
    arrTime: "08:35",
    aircraft: "XIAN MA60",
    daysOfWeek: [0, 1, 3, 5],
    baseLakFare: 1730000,
    baseUsdFare: 83,
    flexiLakFare: 1980000,
    flexiUsdFare: 95
  },
  {
    flightNumber: "LK403",
    origin: "NEU",
    destination: "VTE",
    depTime: "09:05",
    arrTime: "10:10",
    aircraft: "XIAN MA60",
    daysOfWeek: [0, 1, 3, 5],
    baseLakFare: 1730000,
    baseUsdFare: 83,
    flexiLakFare: 1980000,
    flexiUsdFare: 95
  }
];

export class LaoSkywayAdapter implements AirlineScraper {
  public readonly airline = "Lao Skyway" as const;
  public readonly carrierCode = "LK";
  public readonly engineName = "Intelisys Amelia RESTv1";
  public readonly logoUrl = "https://www.laoskyway.com/favicon.ico";

  private http = new BrowserHttpClient("https://www.laoskyway.com/");
  public lastDataSource: DataSourceTier = "live-api";
  public lastStatusNote = "Intelisys RESTv1 travelOptions live query";

  /**
   * Builds the authentic Lao Skyway Intelisys NGI direct flight search URL
   * matching https://flight-search-widget.intelisys.ca/v/2.1.0/lib.js
   * Lao Skyway uses data-prop-use-ptc="on", which requires `passengerCounts=ADT:N`
   * to directly land on Step 2 (/search-result) without prompting "Solitary Passenger is required".
   */
  public static buildBookingDeepLink(
    origin: string,
    dest: string,
    date: string,
    adults: number,
    currency: CurrencyCode = "LAK"
  ): string {
    const params = new URLSearchParams({
      cityPair: `${origin.toUpperCase()}-${dest.toUpperCase()}`,
      departure: date,
      currency,
      passengerCounts: `ADT:${adults}`,
      adultCount: String(adults),
      childCount: "0",
      infantCount: "0",
      language: "en",
      expandInterlineSearch: "true"
    });
    return `https://m.laoskyway.com/direct-flight-search?${params.toString()}`;
  }

  public async searchFlights(
    origin: string,
    dest: string,
    date: string,
    adults: number,
    preferredCurrency: CurrencyCode = "LAK"
  ): Promise<FlightResult[]> {
    const cleanOrigin = origin.trim().toUpperCase();
    const cleanDest = dest.trim().toUpperCase();
    const cityPair = `${cleanOrigin}-${cleanDest}`;
    const bookingUrl = LaoSkywayAdapter.buildBookingDeepLink(
      cleanOrigin,
      cleanDest,
      date,
      adults,
      preferredCurrency
    );

    // 1. Live Intelisys RESTv1 travelOptions endpoint
    try {
      const apiUrl = `https://laoskyway-api.intelisys.ca/RESTv1/travelOptions?cityPair=${cityPair}&departure=${date}&currency=${preferredCurrency}&daysAfterDeparture=6&adultCount=${adults}&childCount=0&infantCount=0`;
      const response = await this.http.get<IntelisysTravelOption[]>(apiUrl, {
        headers: {
          Accept: "application/json"
        },
        timeout: 6000
      });

      if (
        response.status === 200 &&
        Array.isArray(response.data)
      ) {
        this.lastDataSource = "live-api";

        // Upstream Intelisys confirmed 0 flights for this route (e.g. unoperated route like VTE-LPQ)
        if (response.data.length === 0) {
          this.lastStatusNote = "Intelisys RESTv1 Live: Sorry, no flight(s) found";
          return [];
        }

        // Strictly match flights operating on the EXACT requested date
        const exactMatches = response.data.filter(
          (opt) =>
            opt.departureDate === date &&
            Array.isArray(opt.flights) &&
            opt.flights.length > 0
        );

        if (exactMatches.length > 0) {
          const parsedLive = this.parseIntelisysOptions(
            exactMatches,
            cleanOrigin,
            cleanDest,
            date,
            bookingUrl,
            preferredCurrency
          );

          if (parsedLive.length > 0) {
            this.lastStatusNote = `Intelisys RESTv1 Live (${parsedLive.length} flight(s) on ${date})`;
            return parsedLive;
          }
        }

        // Live API returned flight options for the surrounding week but none on this specific date
        this.lastStatusNote = `Intelisys RESTv1 Live: No flight on ${date}`;
        return [];
      }
    } catch {
      // Fall through to Playwright fallback or published schedule
    }

    // 2. Optional Playwright Headless Fallback
    const pwResult = await fetchWithPlaywrightFallback({
      targetUrl: bookingUrl,
      urlPattern: /RESTv1\/travelOptions/i,
      timeoutMs: 8000
    });

    if (pwResult && pwResult.interceptedJsonPayloads.length > 0) {
      for (const payload of pwResult.interceptedJsonPayloads) {
        if (Array.isArray(payload)) {
          this.lastDataSource = "playwright-fallback";

          if (payload.length === 0) {
            this.lastStatusNote = "Playwright Intelisys: Sorry, no flight(s) found";
            return [];
          }

          const exactMatches = (payload as IntelisysTravelOption[]).filter(
            (opt) =>
              opt.departureDate === date &&
              Array.isArray(opt.flights) &&
              opt.flights.length > 0
          );
          if (exactMatches.length > 0) {
            const parsed = this.parseIntelisysOptions(
              exactMatches,
              cleanOrigin,
              cleanDest,
              date,
              bookingUrl,
              preferredCurrency
            );
            if (parsed.length > 0) {
              this.lastStatusNote = `Playwright Intelisys RESTv1 (${parsed.length} flight(s) on ${date})`;
              return parsed;
            }
          }

          this.lastStatusNote = `Playwright Intelisys RESTv1: No flight on ${date}`;
          return [];
        }
      }
    }

    // 3. Published Lao Skyway Domestic Schedule & Tariff Engine
    // Strictly filter by day-of-week: do not force flights onto days they do not operate
    const dow = getDayOfWeek(date);
    const scheduled = LK_DOMESTIC_PUBLISHED_SCHEDULE.filter(
      (item) =>
        item.origin === cleanOrigin &&
        item.destination === cleanDest &&
        item.daysOfWeek.includes(dow)
    );

    if (scheduled.length === 0) {
      const operatesRoute = LK_DOMESTIC_PUBLISHED_SCHEDULE.some(
        (item) => item.origin === cleanOrigin && item.destination === cleanDest
      );
      this.lastDataSource = "verified-schedule";
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      this.lastStatusNote = operatesRoute
        ? `No flights scheduled on ${dayNames[dow]}`
        : `Route ${cleanOrigin}-${cleanDest} not operated by Lao Skyway`;
      return [];
    }

    this.lastDataSource = "verified-schedule";
    this.lastStatusNote =
      "Intelisys RESTv1 Timetable • Published LK Dual-Currency Schedule";

    return scheduled.map((item) => {
      const departureTime = buildLaosIsoTimestamp(date, item.depTime);
      const arrivalTime = buildLaosIsoTimestamp(date, item.arrTime);
      const durationMinutes = calculateDurationMinutes(
        departureTime,
        arrivalTime
      );

      // Authentic Lao Skyway Tariffs in LAK and USD
      const baseLak = item.baseLakFare;
      const taxLak = LK_AIRPORT_TAX_LAK;
      const totalLak = baseLak + taxLak;

      const baseUsd = item.baseUsdFare;
      const taxUsd = LK_AIRPORT_TAX_USD;
      const totalUsd = baseUsd + taxUsd;

      const flexBaseLak = item.flexiLakFare;
      const flexTotalLak = flexBaseLak + taxLak;
      const flexBaseUsd = item.flexiUsdFare;
      const flexTotalUsd = flexBaseUsd + taxUsd;

      const taxDetailsLak: TaxDetail[] = [
        { name: "Airport Tax", code: "AT", amount: taxLak }
      ];
      const taxDetailsUsd: TaxDetail[] = [
        { name: "Airport Tax", code: "AT", amount: taxUsd }
      ];

      const fareTiers: FareTierOption[] = [
        {
          brandName: "Skyway BASE (B)",
          cabinClass: "Economy",
          bookingClass: "B",
          amount: preferredCurrency === "USD" ? totalUsd : totalLak,
          baseFare: preferredCurrency === "USD" ? baseUsd : baseLak,
          taxAmount: preferredCurrency === "USD" ? taxUsd : taxLak,
          currency: preferredCurrency,
          baggageKg: 15,
          refundable: false,
          taxDetails: preferredCurrency === "USD" ? taxDetailsUsd : taxDetailsLak,
          amountLak: totalLak,
          amountUsd: totalUsd,
          baseFareLak: baseLak,
          baseFareUsd: baseUsd,
          taxAmountLak: taxLak,
          taxAmountUsd: taxUsd
        },
        {
          brandName: "Skyway FLEXI (Y)",
          cabinClass: "Economy",
          bookingClass: "Y",
          amount: preferredCurrency === "USD" ? flexTotalUsd : flexTotalLak,
          baseFare: preferredCurrency === "USD" ? flexBaseUsd : flexBaseLak,
          taxAmount: preferredCurrency === "USD" ? taxUsd : taxLak,
          currency: preferredCurrency,
          baggageKg: 20,
          refundable: true,
          taxDetails: preferredCurrency === "USD" ? taxDetailsUsd : taxDetailsLak,
          amountLak: flexTotalLak,
          amountUsd: flexTotalUsd,
          baseFareLak: flexBaseLak,
          baseFareUsd: flexBaseUsd,
          taxAmountLak: taxLak,
          taxAmountUsd: taxUsd
        }
      ];

      const priceLak: PriceBreakdown = {
        amount: totalLak,
        currency: "LAK",
        baseFare: baseLak,
        taxAmount: taxLak,
        taxDetails: taxDetailsLak
      };

      const priceUsd: PriceBreakdown = {
        amount: totalUsd,
        currency: "USD",
        baseFare: baseUsd,
        taxAmount: taxUsd,
        taxDetails: taxDetailsUsd
      };

      const price: PriceBreakdown = preferredCurrency === "USD" ? priceUsd : priceLak;

      return normalizeFlightResult({
        id: `LK-${item.flightNumber}-${date}`,
        airline: "Lao Skyway",
        airlineLogoUrl: this.logoUrl,
        flightNumber: item.flightNumber,
        originCode: cleanOrigin,
        destCode: cleanDest,
        departureTime,
        arrivalTime,
        durationMinutes,
        price,
        priceLak,
        priceUsd,
        seatAvailable: estimateSeatAvailability(item.flightNumber, date),
        bookingUrl,
        isAvailable: true,
        soldOut: false,
        cabinClass: "Economy",
        aircraft: item.aircraft,
        fareBrand: "Skyway BASE (15kg)",
        baggageKg: 15,
        fareTiers,
        dataSource: this.lastDataSource,
        engineName: this.engineName
      });
    });
  }

  public getOperatingScheduleInfo(
    origin: string,
    dest: string
  ): { operatesRoute: boolean; daysOfWeek: number[]; daysSummary: string } | null {
    const cleanOrigin = origin.trim().toUpperCase();
    const cleanDest = dest.trim().toUpperCase();
    const matching = LK_DOMESTIC_PUBLISHED_SCHEDULE.filter(
      (item) => item.origin === cleanOrigin && item.destination === cleanDest
    );
    if (matching.length === 0) {
      return { operatesRoute: false, daysOfWeek: [], daysSummary: "Not operated" };
    }
    const allDays = Array.from(new Set(matching.flatMap((m) => m.daysOfWeek))).sort((a, b) => a - b);
    return {
      operatesRoute: true,
      daysOfWeek: allDays,
      daysSummary: formatDaysOfWeekSummary(allDays)
    };
  }

  private parseIntelisysOptions(
    options: IntelisysTravelOption[],
    origin: string,
    dest: string,
    requestedDate: string,
    bookingUrl: string,
    preferredCurrency: CurrencyCode = "LAK"
  ): FlightResult[] {
    const results: FlightResult[] = [];
    const seenFlightNums = new Set<string>();

    for (const option of options) {
      const leg = option.flights?.[0];
      if (!leg) continue;

      const carrier = leg.airlineCode?.code || "LK";
      const rawNum = leg.flightNumber || "200";
      const flightNumber = `${carrier}${rawNum}`;

      if (seenFlightNums.has(flightNumber)) continue;
      seenFlightNums.add(flightNumber);

      // Extract HH:mm from "YYYY-MM-DD HH:mm:ss"
      const depTimePart =
        leg.departure?.localScheduledTime?.split(" ")[1]?.slice(0, 5) ||
        "12:15";
      const arrTimePart =
        leg.arrival?.localScheduledTime?.split(" ")[1]?.slice(0, 5) || "12:50";

      const departureTime = buildLaosIsoTimestamp(requestedDate, depTimePart);
      const arrivalTime = buildLaosIsoTimestamp(requestedDate, arrTimePart);
      const durationMinutes = option.enRouteHours
        ? Math.max(25, Math.round(option.enRouteHours * 60))
        : calculateDurationMinutes(departureTime, arrivalTime);

      const fareTiers: FareTierOption[] = [];
      for (const fo of option.fareOptions ?? []) {
        if (fo.fareValidity?.soldOut) continue;
        let totalNative = 0;
        let baseFareNative = 0;
        let taxAmountNative = 0;
        let detectedCurrency: CurrencyCode = preferredCurrency;
        const taxDetails: TaxDetail[] = [];

        for (const charge of fo.fareCharges ?? []) {
          const amt = charge.currencyAmounts?.[0]?.totalAmount ?? 0;
          totalNative += amt;
          const chargeCurr = charge.currencyAmounts?.[0]?.currency?.code;
          if (chargeCurr === "USD" || chargeCurr === "LAK") {
            detectedCurrency = chargeCurr;
          }

          if (charge.chargeType?.code === "FA") {
            const base = charge.currencyAmounts?.[0]?.baseAmount ?? amt;
            const tax = charge.currencyAmounts?.[0]?.taxAmount ?? 0;
            baseFareNative += base;
            taxAmountNative += tax;
            if (tax > 0) {
              taxDetails.push({
                name: "Government Tax (10%)",
                code: "VAT",
                amount: Math.round(tax)
              });
            }
          } else {
            taxAmountNative += amt;
            taxDetails.push({
              name: charge.description || "Airport Passenger Charge",
              code: charge.chargeType?.code,
              amount: Math.round(amt)
            });
          }
        }

        if (totalNative > 0) {
          const brand = fo.fareType?.description || "BASE";
          const code = fo.bookingCode?.code || "B";

          // Calculate dual currency values
          const isUsd = detectedCurrency === "USD";
          const amountUsd = isUsd
            ? Math.round(totalNative * 100) / 100
            : Math.round((totalNative / USD_TO_LAK_RATE) * 100) / 100;
          const amountLak = isUsd
            ? Math.round(totalNative * USD_TO_LAK_RATE)
            : Math.round(totalNative);

          const baseFareUsd = isUsd
            ? Math.round(baseFareNative * 100) / 100
            : Math.round((baseFareNative / USD_TO_LAK_RATE) * 100) / 100;
          const baseFareLak = isUsd
            ? Math.round(baseFareNative * USD_TO_LAK_RATE)
            : Math.round(baseFareNative);

          const taxAmountUsd = isUsd
            ? Math.round(taxAmountNative * 100) / 100
            : Math.round((taxAmountNative / USD_TO_LAK_RATE) * 100) / 100;
          const taxAmountLak = isUsd
            ? Math.round(taxAmountNative * USD_TO_LAK_RATE)
            : Math.round(taxAmountNative);

          fareTiers.push({
            brandName: `Skyway ${brand} (${code})`,
            cabinClass: "Economy",
            bookingClass: code,
            amount: preferredCurrency === "USD" ? amountUsd : amountLak,
            baseFare: preferredCurrency === "USD" ? baseFareUsd : baseFareLak,
            taxAmount: preferredCurrency === "USD" ? taxAmountUsd : taxAmountLak,
            currency: preferredCurrency,
            baggageKg: brand === "FLEXI" ? 20 : 15,
            refundable: brand === "FLEXI",
            taxDetails,
            amountLak,
            amountUsd,
            baseFareLak,
            baseFareUsd,
            taxAmountLak,
            taxAmountUsd
          });
        }
      }

      fareTiers.sort((a, b) => a.amount - b.amount);
      const cheapest = fareTiers[0];
      if (!cheapest) continue;

      const priceLak: PriceBreakdown = {
        amount: cheapest.amountLak ?? Math.round(cheapest.amount * USD_TO_LAK_RATE),
        currency: "LAK",
        baseFare: cheapest.baseFareLak,
        taxAmount: cheapest.taxAmountLak,
        taxDetails: cheapest.taxDetails
      };

      const priceUsd: PriceBreakdown = {
        amount: cheapest.amountUsd ?? Math.round((cheapest.amount / USD_TO_LAK_RATE) * 100) / 100,
        currency: "USD",
        baseFare: cheapest.baseFareUsd,
        taxAmount: cheapest.taxAmountUsd,
        taxDetails: cheapest.taxDetails
      };

      const price: PriceBreakdown = preferredCurrency === "USD" ? priceUsd : priceLak;

      results.push(
        normalizeFlightResult({
          id: `LK-LIVE-${flightNumber}-${requestedDate}`,
          airline: "Lao Skyway",
          airlineLogoUrl: this.logoUrl,
          flightNumber,
          originCode: origin,
          destCode: dest,
          departureTime,
          arrivalTime,
          durationMinutes,
          price,
          priceLak,
          priceUsd,
          seatAvailable: leg.availability ?? 9,
          bookingUrl,
          isAvailable: true,
          soldOut: false,
          cabinClass: "Economy",
          aircraft: leg.aircraftModel?.name || "XIAN MA60",
          fareBrand: cheapest.brandName,
          baggageKg: cheapest.baggageKg,
          fareTiers,
          dataSource: "live-api",
          engineName: this.engineName
        })
      );
    }

    return results;
  }
}
