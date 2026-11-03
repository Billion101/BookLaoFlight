"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  Globe,
  PlaneTakeoff,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users
} from "lucide-react";
import {
  AIRPORT_BY_CODE,
  convertCurrency,
  LAOS_AIRPORTS,
  POPULAR_LAOS_ROUTES,
  USD_TO_LAK_RATE
} from "@/data/laos-airports";
import { getTranslation, Language } from "@/data/translations";
import {
  AirlineName,
  CurrencyCode,
  FlightResult,
  MetasearchResponse
} from "@/types/flight";
import {
  FlightTicketCard,
  formatMoneyDisplay,
  formatTimeHHMM
} from "./FlightTicketCard";
import { AirlineLogo } from "./AirlineLogo";
import { LaosAirspaceMap } from "./LaosAirspaceMap";

interface MetasearchPortalProps {
  initialData: MetasearchResponse;
}

type SortOption = "departure" | "price" | "duration";

function addDays(baseDateStr: string, offsetDays: number): string {
  const [y, m, d] = baseDateStr.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return dt.toISOString().slice(0, 10);
}

function formatShortDateChip(dateStr: string): {
  dow: string;
  dayMonth: string;
} {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC"
  });
  const dayMonth = dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
  return { dow, dayMonth };
}

export function MetasearchPortal({ initialData }: MetasearchPortalProps) {
  const [language, setLanguage] = useState<Language>("lo");
  const t = getTranslation(language);

  const [origin, setOrigin] = useState(initialData.query.origin);
  const [destination, setDestination] = useState(initialData.query.destination);
  const [date, setDate] = useState(initialData.query.date);
  const [adults, setAdults] = useState(initialData.query.adults);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>(
    initialData.query.preferredCurrency
  );

  const [data, setData] = useState<MetasearchResponse>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<SortOption>("price");

  const executeSearch = useCallback(
    async (
      nextOrigin: string,
      nextDest: string,
      nextDate: string,
      nextAdults: number,
      bypassCache: boolean = false,
      overrideCurrency?: CurrencyCode
    ) => {
      const activeCurrency = overrideCurrency ?? displayCurrency;
      if (nextOrigin === nextDest) {
        setErrorMsg(t.differentAirportsError);
        return;
      }
      setErrorMsg(null);
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          origin: nextOrigin,
          dest: nextDest,
          date: nextDate,
          adults: String(nextAdults),
          currency: activeCurrency,
          ...(bypassCache ? { bypassCache: "true" } : {})
        });
        const res = await fetch(`/api/flights/search?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Search failed with status ${res.status}`);
        }
        const json = (await res.json()) as MetasearchResponse;
        setData(json);
      } catch (err) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : t.searchFailedError
        );
      } finally {
        setIsLoading(false);
      }
    },
    [displayCurrency, t.differentAirportsError, t.searchFailedError]
  );

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setDisplayCurrency(newCurrency);
    executeSearch(origin, destination, date, adults, false, newCurrency);
  };

  const handleSwapAirports = () => {
    const prevOrigin = origin;
    const prevDest = destination;
    setOrigin(prevDest);
    setDestination(prevOrigin);
    executeSearch(prevDest, prevOrigin, date, adults, false);
  };

  const handleRouteSelect = (newOrigin: string, newDest: string) => {
    setOrigin(newOrigin);
    setDestination(newDest);
    executeSearch(newOrigin, newDest, date, adults, false);
  };

  const handleDateSelect = (newDate: string) => {
    setDate(newDate);
    executeSearch(origin, destination, newDate, adults, false);
  };

  const dateRibbon = useMemo(() => {
    return [-2, -1, 0, 1, 2, 3, 4].map((offset) => addDays(date, offset));
  }, [date]);

  const filteredAndSortedFlights = useMemo(() => {
    return [...data.results].sort((a, b) => {
      if (sortBy === "price") {
        const lakA = convertCurrency(
          a.price.amount,
          a.price.currency,
          "LAK",
          USD_TO_LAK_RATE
        );
        const lakB = convertCurrency(
          b.price.amount,
          b.price.currency,
          "LAK",
          USD_TO_LAK_RATE
        );
        return lakA - lakB;
      }
      if (sortBy === "duration") {
        return a.durationMinutes - b.durationMinutes;
      }
      return (
        new Date(a.departureTime).getTime() -
        new Date(b.departureTime).getTime()
      );
    });
  }, [data.results, sortBy]);

  const cheapestFlightId = useMemo(() => {
    if (filteredAndSortedFlights.length === 0) return null;
    let minFlight: FlightResult = filteredAndSortedFlights[0];
    let minLak = convertCurrency(
      minFlight.price.amount,
      minFlight.price.currency,
      "LAK",
      USD_TO_LAK_RATE
    );
    for (const f of filteredAndSortedFlights) {
      const lak = convertCurrency(
        f.price.amount,
        f.price.currency,
        "LAK",
        USD_TO_LAK_RATE
      );
      if (lak < minLak) {
        minLak = lak;
        minFlight = f;
      }
    }
    return minFlight.id;
  }, [filteredAndSortedFlights]);

  const fastestFlightId = useMemo(() => {
    if (filteredAndSortedFlights.length === 0) return null;
    let fastest = filteredAndSortedFlights[0];
    for (const f of filteredAndSortedFlights) {
      if (f.durationMinutes < fastest.durationMinutes) {
        fastest = f;
      }
    }
    return fastest.id;
  }, [filteredAndSortedFlights]);

  const [expandedAirlines, setExpandedAirlines] = useState<Record<string, boolean>>({});

  const toggleAirlineExpand = (airline: string) => {
    setExpandedAirlines((prev) => ({
      ...prev,
      [airline]: !prev[airline]
    }));
  };

  const airlineFlightGroups = useMemo(() => {
    const groupsMap = new Map<AirlineName, FlightResult[]>();

    for (const flight of filteredAndSortedFlights) {
      const existing = groupsMap.get(flight.airline) ?? [];
      existing.push(flight);
      groupsMap.set(flight.airline, existing);
    }

    return Array.from(groupsMap.entries()).map(([airline, flights]) => {
      // In price sort: first flight is cheapest.
      // In departure sort: first flight is earliest.
      // In duration sort: first flight is fastest.
      const primaryFlight = flights[0];
      const additionalFlights = flights.slice(1);
      return {
        airline,
        primaryFlight,
        additionalFlights
      };
    });
  }, [filteredAndSortedFlights]);

  const originInfo = AIRPORT_BY_CODE[origin];
  const destInfo = AIRPORT_BY_CODE[destination];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Aviation Dispatch Hero Console - Lao Airlines Royal Navy & Dok Champa Gold */}
      <header className="bg-gradient-to-r from-[#19398a] via-[#152e72] to-[#0f245c] text-white border-b-4 border-[#eab308] relative overflow-hidden shadow-lg">
        {/* Subtle Dok Champa ambient light */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 right-1/4 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-7 relative z-10">
          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/15">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#eab308] to-[#fde047] text-[#19398a] flex items-center justify-center font-display font-bold shadow-lg shadow-amber-500/25 border border-amber-300/60">
                <PlaneTakeoff className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white drop-shadow-xs">
                    {t.appName}
                  </span>
                </div>
                <p className="text-[11px] text-blue-100/80 mt-0.5">
                  {t.portalDesc}
                </p>
              </div>
            </div>

            {/* Language & Currency Switcher Controls */}
            <div className="flex items-center gap-2.5">
              {/* Language Switcher */}
              <div className="inline-flex rounded-xl bg-[#0f245c]/90 p-0.5 border border-blue-300/30 font-mono-tabular text-[11px]">
                <button
                  type="button"
                  onClick={() => setLanguage("lo")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    language === "lo"
                      ? "bg-[#eab308] text-[#0f245c] shadow-xs"
                      : "text-blue-100 hover:text-white"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>ພາສາລາວ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage("en")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    language === "en"
                      ? "bg-[#eab308] text-[#0f245c] shadow-xs"
                      : "text-blue-100 hover:text-white"
                  }`}
                >
                  <span>English</span>
                </button>
              </div>

              {/* Currency Switcher */}
              <div className="inline-flex rounded-xl bg-[#0f245c]/90 p-0.5 border border-blue-300/30 font-mono-tabular text-[11px]">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange("LAK")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    displayCurrency === "LAK"
                      ? "bg-[#eab308] text-[#0f245c] shadow-xs"
                      : "text-blue-100 hover:text-white"
                  }`}
                >
                  {t.currencyLak}
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyChange("USD")}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    displayCurrency === "USD"
                      ? "bg-[#eab308] text-[#0f245c] shadow-xs"
                      : "text-blue-100 hover:text-white"
                  }`}
                >
                  {t.currencyUsd}
                </button>
              </div>
            </div>
          </div>

          {/* Route Headline */}
          <div className="mt-5 mb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-tabular uppercase tracking-widest text-[#fde047] mb-1 font-bold">
                <Sparkles className="w-3 h-3" />
                <span>{t.headlineMatrix}</span>
              </div>
              <h1 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2 drop-shadow-xs">
                <span>
                  {language === "lo" ? originInfo?.nameLao : originInfo?.city || origin}{" "}
                  <span className="text-[#fde047] font-mono-tabular">
                    ({origin})
                  </span>
                </span>
                <span className="text-blue-200">→</span>
                <span>
                  {language === "lo" ? destInfo?.nameLao : destInfo?.city || destination}{" "}
                  <span className="text-white font-mono-tabular">
                    ({destination})
                  </span>
                </span>
              </h1>
              <p className="text-[11px] text-blue-100/80 mt-0.5">
                {t.headlineSub}
              </p>
            </div>

            {/* Quick Route Selector Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {POPULAR_LAOS_ROUTES.map((route) => {
                const isActive =
                  route.origin === origin && route.destination === destination;
                return (
                  <button
                    key={route.label}
                    type="button"
                    onClick={() =>
                      handleRouteSelect(route.origin, route.destination)
                    }
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono-tabular font-bold border transition cursor-pointer ${
                      isActive
                        ? "bg-[#eab308] text-[#0f245c] border-[#eab308] shadow-xs"
                        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                    }`}
                    title={route.tagline}
                  >
                    {route.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Dispatch Form Bar - Lao Airlines White Ticket Booking Console */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeSearch(origin, destination, date, adults, false);
            }}
            className="bg-white text-slate-900 border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
          >
            {/* Origin Select (3 cols) */}
            <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#19398a] focus-within:bg-blue-50/30 transition">
              <label
                htmlFor="origin-select"
                className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold"
              >
                {t.originLabel}
              </label>
              <select
                id="origin-select"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="mt-1 w-full bg-transparent text-slate-900 font-display font-bold text-sm focus:outline-none cursor-pointer"
              >
                {LAOS_AIRPORTS.map((ap) => (
                  <option
                    key={`orig-${ap.code}`}
                    value={ap.code}
                    className="bg-white text-slate-900"
                  >
                    {ap.code} — {language === "lo" ? ap.nameLao : ap.city} ({language === "lo" ? ap.city : ap.nameLao})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button (1 col) */}
            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleSwapAirports}
                className="w-10 h-10 rounded-xl bg-blue-50 hover:bg-[#19398a] hover:text-white text-[#19398a] border border-blue-200 flex items-center justify-center transition cursor-pointer shadow-xs"
                title={t.swapAirports}
              >
                <ArrowLeftRight className="w-4 h-4" />
              </button>
            </div>

            {/* Destination Select (3 cols) */}
            <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#19398a] focus-within:bg-blue-50/30 transition">
              <label
                htmlFor="dest-select"
                className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold"
              >
                {t.destLabel}
              </label>
              <select
                id="dest-select"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="mt-1 w-full bg-transparent text-slate-900 font-display font-bold text-sm focus:outline-none cursor-pointer"
              >
                {LAOS_AIRPORTS.map((ap) => (
                  <option
                    key={`dest-${ap.code}`}
                    value={ap.code}
                    className="bg-white text-slate-900"
                  >
                    {ap.code} — {language === "lo" ? ap.nameLao : ap.city} ({language === "lo" ? ap.city : ap.nameLao})
                  </option>
                ))}
              </select>
            </div>

            {/* Departure Date (2 cols) */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-[#19398a] focus-within:bg-blue-50/30 transition">
              <label
                htmlFor="date-input"
                className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold flex items-center gap-1"
              >
                <Calendar className="w-3 h-3 text-[#19398a]" />
                <span>{t.travelDateLabel}</span>
              </label>
              <input
                id="date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-transparent text-slate-900 font-mono-tabular font-bold text-sm focus:outline-none cursor-pointer"
              />
            </div>

            {/* Adults Count (1 col) */}
            <div className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus-within:border-[#19398a] focus-within:bg-blue-50/30 transition">
              <label
                htmlFor="adults-select"
                className="block text-[10px] font-mono-tabular uppercase tracking-wider text-[#19398a] font-bold flex items-center gap-1"
              >
                <Users className="w-3 h-3 text-[#19398a]" />
                <span>{t.passengersLabel}</span>
              </label>
              <select
                id="adults-select"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value, 10))}
                className="mt-1 w-full bg-transparent text-slate-900 font-mono-tabular font-bold text-sm focus:outline-none cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n} className="bg-white text-slate-900">
                    {n} {t.paxUnit}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Submit CTA (2 cols) */}
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-full min-h-[54px] rounded-xl bg-[#19398a] hover:bg-[#132c6d] text-white font-display font-bold text-sm px-4 py-3 flex items-center justify-center gap-2 shadow-lg shadow-[#19398a]/25 transition disabled:opacity-60 cursor-pointer"
              >
                <Search className="w-4 h-4 text-[#fde047]" />
                <span>{isLoading ? t.searchingButton : t.searchButton}</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-100 text-xs font-medium">
              {errorMsg}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Grid: Left Airspace Map & Filters (4 cols) + Right Flight Comparison Results (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Laos Airspace Map (Desktop Only - hidden on mobile) */}
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-6">
            <LaosAirspaceMap
              origin={origin}
              destination={destination}
              onSelectRoute={handleRouteSelect}
              lang={language}
            />
          </aside>

          {/* Right Column: 7-Day Date Strip, Summary Metrics, and Flight Cards */}
          <section className="w-full lg:col-span-8 space-y-4">
            {/* 7-Day Interactive Date Strip */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-2 shadow-sm grid grid-cols-7 gap-1.5">
              {dateRibbon.map((d) => {
                const { dow, dayMonth } = formatShortDateChip(d);
                const isSelected = d === date;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDateSelect(d)}
                    className={`py-2 px-1 rounded-xl font-mono-tabular text-center transition cursor-pointer ${
                      isSelected
                        ? "bg-[#19398a] text-white font-bold shadow-md border-b-2 border-[#eab308]"
                        : "hover:bg-blue-50/60 text-slate-700"
                    }`}
                  >
                    <div className={`text-[10px] uppercase font-bold ${isSelected ? "text-[#fde047]" : "text-slate-500"}`}>{dow}</div>
                    <div className="text-xs font-bold mt-0.5">{dayMonth}</div>
                  </button>
                );
              })}
            </div>

            {/* Summary KPI Strip & Sort Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-5 sm:gap-6 flex-wrap">
                <div>
                  <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 block font-semibold">
                    {t.availableFlights}
                  </span>
                  <span className="text-base font-mono-tabular font-bold text-[#19398a]">
                    {filteredAndSortedFlights.length} {t.slotsOf}{" "}
                    {data.summary.totalFlights} {t.slotsSuffix}
                  </span>
                </div>

                {data.summary.cheapestLak !== null &&
                  data.summary.cheapestUsd !== null && (
                    <div className="pl-4 sm:pl-5 border-l border-slate-200">
                      <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 block font-semibold">
                        {t.lowestFare}
                      </span>
                      <span className="text-base font-mono-tabular font-bold text-[#19398a]">
                        {displayCurrency === "LAK"
                          ? formatMoneyDisplay(data.summary.cheapestLak, "LAK")
                          : formatMoneyDisplay(data.summary.cheapestUsd, "USD")}
                      </span>
                    </div>
                  )}

                {data.summary.fastestDurationMinutes !== null && (
                  <div className="pl-4 sm:pl-5 border-l border-slate-200">
                    <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-slate-400 block font-semibold">
                      {t.fastestFlight}
                    </span>
                    <span className="text-base font-mono-tabular font-bold text-slate-800">
                      {data.summary.fastestDurationMinutes} {t.minsSuffix}
                    </span>
                  </div>
                )}
              </div>

              {/* Sort Selector */}
              <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#19398a] ml-2" />
                <span className="text-[11px] font-semibold text-slate-500 pl-1">{t.sortBy}</span>
                {(
                  [
                    { id: "price", label: t.cheapest },
                    { id: "departure", label: t.earliest },
                    { id: "duration", label: t.fastest }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSortBy(opt.id)}
                    className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      sortBy === opt.id
                        ? "bg-[#19398a] text-white font-bold shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Flight Cards List */}
            <div className="space-y-4">
              {airlineFlightGroups.length > 0 ? (
                airlineFlightGroups.map((group) => {
                  const isExpanded = expandedAirlines[group.airline] === true;
                  const firstAddPrice = group.additionalFlights[0]
                    ? displayCurrency === "USD"
                      ? group.additionalFlights[0].priceUsd?.amount ?? group.additionalFlights[0].price.amount
                      : group.additionalFlights[0].priceLak?.amount ?? group.additionalFlights[0].price.amount
                    : 0;

                  return (
                    <div key={group.airline} className="space-y-3">
                      {/* Primary (Cheapest/Selected) Flight Card for this Airline */}
                      <FlightTicketCard
                        flight={group.primaryFlight}
                        displayCurrency={displayCurrency}
                        adults={adults}
                        isCheapest={group.primaryFlight.id === cheapestFlightId}
                        isFastest={group.primaryFlight.id === fastestFlightId}
                        lang={language}
                      />

                      {/* Expandable Additional Choices for this Airline */}
                      {group.additionalFlights.length > 0 && (
                        <div className="pt-0.5">
                          {!isExpanded ? (
                            <button
                              type="button"
                              onClick={() => toggleAirlineExpand(group.airline)}
                              className="w-full py-2.5 px-4 bg-white hover:bg-blue-50/50 border border-dashed border-slate-300 hover:border-[#19398a]/50 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer group"
                            >
                              <div className="flex items-center gap-2.5">
                                <AirlineLogo airline={group.airline} size="sm" />
                                <span className="text-slate-800 font-bold group-hover:text-[#19398a]">
                                  {language === "lo"
                                    ? `+ ${t.viewMoreFlights} ${group.additionalFlights.length} ຖ້ຽວບິນຈາກ ${group.airline}`
                                    : `+ ${t.viewMoreFlights} ${group.airline} (${group.additionalFlights.length} more)`}
                                </span>
                                <span className="hidden sm:inline text-[11px] font-mono-tabular text-slate-500">
                                  ({group.additionalFlights.map((f) => `${f.flightNumber} · ${formatTimeHHMM(f.departureTime)}`).join(", ")})
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[#19398a] font-bold font-mono-tabular">
                                <span className="text-[11px] text-slate-500 font-normal">
                                  {t.fromPrice}{" "}
                                  <strong className="text-[#19398a] font-bold">
                                    {formatMoneyDisplay(firstAddPrice, displayCurrency)}
                                  </strong>
                                </span>
                                <ChevronDown className="w-4 h-4 text-[#19398a] transition-transform group-hover:translate-y-0.5" />
                              </div>
                            </button>
                          ) : (
                            <div className="space-y-3 pt-1 sm:pl-3 border-l-2 border-[#19398a]/20">
                              <div className="flex items-center justify-between px-1 text-xs text-slate-500 font-medium">
                                <span className="font-semibold text-slate-700">
                                  {t.additionalFlightsFrom} {group.airline} ({group.additionalFlights.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleAirlineExpand(group.airline)}
                                  className="text-[#19398a] hover:text-[#0f245c] hover:underline font-bold flex items-center gap-1 cursor-pointer py-1 px-2.5 rounded-lg bg-blue-50 border border-blue-200/60"
                                >
                                  <span>{t.showLess}</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {group.additionalFlights.map((flight) => (
                                <FlightTicketCard
                                  key={flight.id}
                                  flight={flight}
                                  displayCurrency={displayCurrency}
                                  adults={adults}
                                  isCheapest={flight.id === cheapestFlightId}
                                  isFastest={flight.id === fastestFlightId}
                                  lang={language}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-bold text-slate-900">
                      {t.noFlightsTitle} {date} ({origin} → {destination})
                    </div>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto mt-1">
                      {t.noFlightsDesc}
                    </p>
                  </div>

                  {/* Per-carrier Operating Schedule Cards */}
                  {data.airlineAvailability && data.airlineAvailability.length > 0 && (
                    <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left pt-1">
                      {data.airlineAvailability.map((info) => (
                        <div
                          key={info.airline}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col justify-between gap-1.5"
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center justify-between">
                              <span>{info.airline}</span>
                              <span className="text-[10px] font-mono-tabular font-bold text-slate-500">
                                {info.carrierCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                              {info.operatingDaysSummary
                                ? `${t.operatesDays} ${info.operatingDaysSummary}`
                                : info.message}
                            </div>
                          </div>
                          {info.closestDates && info.closestDates.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-200 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-mono-tabular">{t.closestDatesLabel}</span>
                              {info.closestDates.slice(0, 2).map((cd) => (
                                <button
                                  key={cd}
                                  type="button"
                                  onClick={() => handleDateSelect(cd)}
                                  className="px-2 py-0.5 rounded bg-white border border-slate-300 text-[10.5px] font-mono-tabular font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  {cd.slice(5)} →
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 7-Day Ribbon Quick Jumps */}
                  <div className="pt-2">
                    <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-400 block mb-2">
                      {t.checkSurroundingDates}
                    </span>
                    <div className="flex flex-wrap justify-center gap-2">
                      {dateRibbon
                        .filter((d) => d !== date)
                        .slice(0, 4)
                        .map((altDate) => {
                          const { dow, dayMonth } = formatShortDateChip(altDate);
                          return (
                            <button
                              key={altDate}
                              type="button"
                              onClick={() => handleDateSelect(altDate)}
                              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-mono-tabular font-semibold cursor-pointer transition shadow-xs"
                            >
                              {dow}, {dayMonth} →
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Client Consumer Portal Footer - Lao Airlines Royal Navy & Champa Gold */}
      <footer className="bg-[#0f245c] text-blue-100/90 border-t-4 border-[#eab308] mt-12 py-7 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-white tracking-wide">{t.appName}</span>
              <span className="text-[#fde047]">•</span>
              <span className="text-blue-200">{t.footerTitle}</span>
            </div>
            <p className="text-[11px] text-blue-300/80">{t.footerSubtitle}</p>
          </div>
          <div className="flex items-center gap-3 justify-center text-blue-200 text-xs">
            <span className="font-semibold text-white">QV • LK • 5A</span>
            <span>•</span>
            <span className="text-[#fde047] font-bold">2026 Sabaidee Sky</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

