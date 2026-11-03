import { describe, expect, it } from "vitest";
import { LaoAirlinesAdapter } from "@/server/adapters/lao-airlines.adapter";
import { LaoSkywayAdapter } from "@/server/adapters/lao-skyway.adapter";
import { LXAirwaysAdapter } from "@/server/adapters/lx-airways.adapter";
import { honoApp } from "@/server/api/hono-app";
import {
  FLIGHT_CACHE_TTL_MS,
  FlightSearchCache
} from "@/server/cache/flight-cache";
import { FlightMetasearchService } from "@/server/services/metasearch.service";
import { FlightResult } from "@/types/flight";

function assertValidFlightResult(flight: FlightResult) {
  expect(typeof flight.id).toBe("string");
  expect(["Lao Airlines", "Lao Skyway", "Lanexang Airways"]).toContain(
    flight.airline
  );
  expect(typeof flight.flightNumber).toBe("string");
  expect(flight.origin.code).toMatch(/^[A-Z]{3}$/);
  expect(flight.destination.code).toMatch(/^[A-Z]{3}$/);
  // ISO 8601 format check
  expect(flight.departureTime).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/
  );
  expect(flight.arrivalTime).toMatch(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+07:00$/
  );
  expect(flight.durationMinutes).toBeGreaterThan(0);
  expect(flight.price.amount).toBeGreaterThan(0);
  expect(["LAK", "USD"]).toContain(flight.price.currency);
  expect(flight.bookingUrl).toMatch(/^https:\/\//);
}

describe("Laos Domestic Flight Metasearch Engine", () => {
  it("LaoAirlinesAdapter normalizes flights and builds Sabre QVDX deep-links", async () => {
    const adapter = new LaoAirlinesAdapter();
    const results = await adapter.searchFlights("VTE", "LPQ", "2026-11-05", 2);

    expect(results.length).toBeGreaterThan(0);
    for (const flight of results) {
      assertValidFlightResult(flight);
      expect(flight.airline).toBe("Lao Airlines");
      expect(flight.bookingUrl).toContain(
        "https://booking.laoairlines.com/dx/QVDX/#/flight-selection"
      );
      expect(flight.bookingUrl).toContain("origin=VTE");
      expect(flight.bookingUrl).toContain("destination=LPQ");
      expect(flight.bookingUrl).toContain("date=11-05-2026");
      expect(flight.bookingUrl).toContain("ADT=2");
    }
  });

  it("LaoSkywayAdapter normalizes flights and builds Intelisys NGI deep-links", async () => {
    const adapter = new LaoSkywayAdapter();
    const results = await adapter.searchFlights("VTE", "XKH", "2026-11-04", 1);

    expect(results.length).toBeGreaterThan(0);
    for (const flight of results) {
      assertValidFlightResult(flight);
      expect(flight.airline).toBe("Lao Skyway");
      expect(flight.bookingUrl).toContain(
        "https://m.laoskyway.com/direct-flight-search"
      );
      expect(flight.bookingUrl).toContain("cityPair=VTE-XKH");
    }
  });

  it("LXAirwaysAdapter parses embedded Avantik MyBravo JSON and builds B2C deep-links", async () => {
    const adapter = new LXAirwaysAdapter();
    const mockAvantikHtml = `
      <script>
      function pushDataHTML(pos) {
        var data = [{"position_date":0,"departure_date":"20261104","fareOfFlights":[{"departure_date":"Wednesday 04 Nov 2026","departure_date_rcd":"2026-11-04T00:00:00","flight_id":"{35838179-79BB}","flight_number":"282","airline_rcd":"5A","planned_departure_time":"9:30","planned_arrival_time":"10:30","aircraft_rcd":"ATR72500","departure_airport_name":"Vientiane","arrival_airport_name":"Bokeo","origin_rcd":"VTE","destination_rcd":"BOR","duration":"1hr00min","Nbusiness_fare":"2,020,000","Nbusiness_booking_class":"Y","Ncurrency_business":"LAK","Neconomic_fare":"1,820,000","Neconomic_booking_class":"S","Ncurrency_economic":"LAK","Nlowest_fare":"1,620,000","Nlowest_booking_class":"P","Ncurrency_lowest":"LAK"}]}];
      }
      </script>
    `;

    const bookingUrl = LXAirwaysAdapter.buildBookingDeepLink(
      "VTE",
      "BOR",
      "2026-11-04",
      1,
      "LAK"
    );
    expect(bookingUrl).toBe(
      "https://lxw_mybravo.avantik.io/en/Home/Availability/VTE/BOR/20261104/NR/1/0/0/0/LAK/False/0/B2C"
    );

    const parsed = adapter.parseAvantikAvailabilityHtml(
      mockAvantikHtml,
      "VTE",
      "BOR",
      "2026-11-04",
      "20261104",
      bookingUrl
    );

    expect(parsed).toHaveLength(1);
    assertValidFlightResult(parsed[0]);
    expect(parsed[0].flightNumber).toBe("5A282");
    expect(parsed[0].price.amount).toBe(1620000 + 240000); // 1,860,000 LAK (Base + Tax)
    expect(parsed[0].price.baseFare).toBe(1620000); // 1,620,000 LAK Base
    expect(parsed[0].price.taxAmount).toBe(240000);  // 240,000 LAK Airport Tax + Fuel Surcharge
    expect(parsed[0].price.currency).toBe("LAK");
    expect(parsed[0].durationMinutes).toBe(60);
  });

  it("FlightSearchCache & MetasearchService cache results by origin-dest-date for 15 minutes", async () => {
    const cache = new FlightSearchCache();
    const service = new FlightMetasearchService(cache);

    const first = await service.searchAllAirlines({
      origin: "VTE",
      destination: "BOR",
      date: "2026-11-05",
      adults: 1,
      currency: "LAK"
    });

    expect(first.cache.hit).toBe(false);
    expect(first.cache.key).toBe("VTE-BOR-2026-11-05");
    expect(first.results.length).toBeGreaterThanOrEqual(3);
    expect(first.telemetry).toHaveLength(3);

    const second = await service.searchAllAirlines({
      origin: "VTE",
      destination: "BOR",
      date: "2026-11-05",
      adults: 1,
      currency: "LAK"
    });

    expect(second.cache.hit).toBe(true);
    expect(second.cache.ttlSecondsRemaining).toBeGreaterThan(800);
    expect(FLIGHT_CACHE_TTL_MS).toBe(15 * 60 * 1000);
  });

  it("Hono API /api/flights/search and /api/flights/airports return valid JSON", async () => {
    const airportsRes = await honoApp.request("/api/flights/airports");
    expect(airportsRes.status).toBe(200);
    const airportsJson = await airportsRes.json();
    expect(airportsJson.airports.length).toBeGreaterThanOrEqual(9);

    const searchRes = await honoApp.request(
      "/api/flights/search?origin=VTE&dest=LPQ&date=2026-11-06&adults=1&currency=LAK"
    );
    expect(searchRes.status).toBe(200);
    const searchJson = await searchRes.json();
    expect(searchJson.results.length).toBeGreaterThan(0);
    expect(searchJson.telemetry).toHaveLength(3);
    expect(searchJson.airlineAvailability).toHaveLength(3);
  });

  it("handles non-operating days accurately without fabricating flights on inactive dates", async () => {
    const lxAdapter = new LXAirwaysAdapter();
    // 2026-12-10 is a Thursday. Lanexang does NOT operate VTE-XKH on Thursdays (5A operates Tue, Wed, Fri, Sun).
    const lxFlights = await lxAdapter.searchFlights("VTE", "XKH", "2026-12-10", 1, "LAK");
    expect(lxFlights).toHaveLength(0);

    const schedInfo = lxAdapter.getOperatingScheduleInfo("VTE", "XKH");
    expect(schedInfo?.operatesRoute).toBe(true);
    expect(schedInfo?.daysOfWeek).toEqual([0, 2, 3, 5]); // Sun, Tue, Wed, Fri
    expect(schedInfo?.daysSummary).toBe("Sun, Tue, Wed, Fri");

    const lkAdapter = new LaoSkywayAdapter();
    // Lao Skyway does NOT operate VTE-LPQ (Intelisys live API returns 200 OK with []).
    const lkLpqFlights = await lkAdapter.searchFlights("VTE", "LPQ", "2026-11-04", 1, "LAK");
    expect(lkLpqFlights).toHaveLength(0);

    const lkLpqSched = lkAdapter.getOperatingScheduleInfo("VTE", "LPQ");
    expect(lkLpqSched?.operatesRoute).toBe(false);

    // Lao Skyway DOES operate VTE-XKH daily
    const lkXkhSched = lkAdapter.getOperatingScheduleInfo("VTE", "XKH");
    expect(lkXkhSched?.operatesRoute).toBe(true);
    expect(lkXkhSched?.daysOfWeek).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(lkXkhSched?.daysSummary).toBe("Daily");
  });

  it("supports genuine dual-currency pricing in USD and LAK directly from airline portals", async () => {
    const lxAdapter = new LXAirwaysAdapter();
    // 2026-12-09 is Wednesday. Lanexang flies 5A188 (VTE-XKH).
    const [lakFlights, usdFlights] = await Promise.all([
      lxAdapter.searchFlights("VTE", "XKH", "2026-12-09", 1, "LAK"),
      lxAdapter.searchFlights("VTE", "XKH", "2026-12-09", 1, "USD")
    ]);

    expect(lakFlights.length).toBeGreaterThan(0);
    expect(usdFlights.length).toBeGreaterThan(0);

    const lakFlight = lakFlights[0];
    const usdFlight = usdFlights[0];

    // Check LAK amounts matching authentic Lanexang portal
    expect(lakFlight.price.currency).toBe("LAK");
    expect(lakFlight.price.amount).toBe(1080000); // 840k base + 240k tax
    expect(lakFlight.price.baseFare).toBe(840000);
    expect(lakFlight.price.taxAmount).toBe(240000);

    // Check USD amounts matching authentic Lanexang portal
    expect(usdFlight.price.currency).toBe("USD");
    expect(usdFlight.price.amount).toBe(51); // $39 base + $12 tax
    expect(usdFlight.price.baseFare).toBe(39);
    expect(usdFlight.price.taxAmount).toBe(12);

    // Both currencies should be embedded on each result
    expect(lakFlight.priceUsd?.amount).toBe(51);
    expect(usdFlight.priceLak?.amount).toBe(1080000);
  });
});

