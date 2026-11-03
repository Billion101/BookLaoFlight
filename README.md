# SABAIDEE SKY • Laos Domestic Flight Metasearch Engine

Fullstack Flight Metasearch Engine aggregating and comparing domestic flights in Laos across all three operating carriers:
1. **Lao Airlines (`QV`)** — [https://laoairlines.com](https://laoairlines.com) (`Sabre Digital Experience QVDX` + `WordPress AJAX Route Matrix`)
2. **Lao Skyway (`LK`)** — [https://www.laoskyway.com](https://www.laoskyway.com) (`Intelisys Amelia RESTv1` + `Amelia Public Schedules API`)
3. **Lanexang Airways (`5A`)** — [https://lxairways.com](https://lxairways.com) (`Avantik MyBravo PSS Availability Engine`)

---

## Architecture Overview

- **Backend API:** Node.js + TypeScript + **Hono** (`src/server/api/hono-app.ts`), mounted both in Next.js App Router (`/api/[[...route]]/route.ts`) and runnable as a standalone server (`src/server/standalone.ts`).
- **Scraping & Fetching Engine:**
  - **Tier 1 (HTTP Impersonation):** `BrowserHttpClient` (`src/server/http/browser-client.ts`) powered by `axios` with rotating Chrome/macOS `Sec-Ch-Ua` headers, automatic domain cookie jar (`SSWGID`, `CID`, `ASP.NET_SessionID`), and custom TLS handling for regional certificate chains.
  - **Tier 2 (Headless Browser Fallback):** `fetchWithPlaywrightFallback` (`src/server/http/playwright-fallback.ts`) using `playwright-core` to intercept XHR/GraphQL responses when `ENABLE_PLAYWRIGHT_FALLBACK=true`.
  - **Tier 3 (Verified Schedule & Tariff Engine):** Official 2026/2027 published domestic timetables and fare families (`Champa Saver / Economy Flex / Silk Business`, `Skyway BASE / FLEXI`, `Xang Classic / Xang Plus / Xang Full Flex`) ensuring 100% route availability even when an upstream PSS blocks headless requests or has seasonal windows closed.
- **Caching:** `FlightSearchCache` (`src/server/cache/flight-cache.ts`) caches aggregated search results by `origin-dest-date` for **15 minutes (`900,000` ms)** with hit/miss telemetry and a `bypassCache=true` live-refresh mode.
- **Frontend UI:** Next.js 15 + Tailwind CSS v4 + Lucide Icons (`src/components/MetasearchPortal.tsx`, `LaosAirspaceMap.tsx`, `AdapterTelemetryBar.tsx`, `FlightTicketCard.tsx`).

---

## Reverse-Engineered Airline Endpoints

| Airline | Code | Booking Engine | Upstream Endpoint / Mechanism | Deep-Link Format |
| :--- | :--- | :--- | :--- | :--- |
| **Lao Airlines** | `QV` | Sabre Digital Experience (`QVDX`) | `POST https://laoairlines.com/wp-admin/admin-ajax.php` (`action=change_goingto`) + `https://booking.laoairlines.com/dx/QVDX/` (`sabre['cid']` session handshake & `/api/graphql`) | `https://booking.laoairlines.com/dx/QVDX/#/flight-selection?class=Economy&locale=en-US&pointOfSale=LA&ADT=1&CHD=0&INF=0&origin=VTE&destination=LPQ&journeyType=one-way&date=MM-DD-YYYY` |
| **Lao Skyway** | `LK` | Intelisys Amelia (`RESTv1`) | `GET https://laoskyway-api.intelisys.ca/RESTv1/travelOptions?cityPair=VTE-XKH&departure=YYYY-MM-DD&currency=LAK&daysAfterDeparture=6&adultCount=1&childCount=0&infantCount=0` | `https://m.laoskyway.com/direct-flight-search?cityPair=VTE-XKH&departure=YYYY-MM-DD&currency=LAK&adultCount=1&childCount=0&infantCount=0&language=en&expandInterlineSearch=true` |
| **Lanexang Airways** | `5A` | Avantik MyBravo PSS | `GET https://lxw_mybravo.avantik.io/en/Home/Availability/{origin}/{dest}/{YYYYMMDD}/NR/{adults}/0/0/0/LAK/False/0/B2C` (parses embedded `var data = [...]` JSON & `.flightcard` DOM) | `https://lxw_mybravo.avantik.io/en/Home/Availability/VTE/BOR/YYYYMMDD/NR/1/0/0/0/LAK/False/0/B2C` |

---

## Getting Started

```bash
# Install dependencies
npm install

# Run fullstack development server (Next.js + Hono API at http://localhost:3000)
npm run dev

# Or run standalone Hono backend server (http://localhost:4000)
npm run dev:api

# Run TypeScript check and Vitest suite
npm run typecheck
npm test
```

