"use client";

import React, { useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Clock,
  Info,
  Plane,
  Receipt,
  Sparkles,
  Users,
  XCircle
} from "lucide-react";
import { convertCurrency, USD_TO_LAK_RATE } from "@/data/laos-airports";
import { getTranslation, Language } from "@/data/translations";
import { CurrencyCode, FlightResult } from "@/types/flight";
import { AirlineLogo, AirportBadge } from "./AirlineLogo";

interface FlightTicketCardProps {
  flight: FlightResult;
  displayCurrency: CurrencyCode;
  adults: number;
  isCheapest: boolean;
  isFastest: boolean;
  lang?: Language;
}

const AIRLINE_THEME: Record<
  FlightResult["airline"],
  {
    accentBorder: string;
    badgeBg: string;
    badgeText: string;
    buttonBg: string;
    code: string;
  }
> = {
  "Lao Airlines": {
    accentBorder: "border-l-[#19398a]",
    badgeBg: "bg-[#19398a]/10 border-[#19398a]/20",
    badgeText: "text-[#19398a]",
    buttonBg: "bg-[#5cb85c] hover:bg-[#4cae4c]", // Authentic Lao Airlines green CTA
    code: "QV"
  },
  "Lao Skyway": {
    accentBorder: "border-l-rose-600",
    badgeBg: "bg-rose-50 border-rose-200",
    badgeText: "text-rose-800",
    buttonBg: "bg-[#19398a] hover:bg-[#0f245c]",
    code: "LK"
  },
  "Lanexang Airways": {
    accentBorder: "border-l-emerald-600",
    badgeBg: "bg-emerald-50 border-emerald-200",
    badgeText: "text-emerald-800",
    buttonBg: "bg-[#19398a] hover:bg-[#0f245c]",
    code: "5A"
  }
};

function formatTimeHHMM(isoString: string): string {
  const match = isoString.match(/T(\d{2}:\d{2})/);
  if (match?.[1]) return match[1];
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h 00m`;
  return `${h}h ${m}m`;
}

export function formatMoneyDisplay(
  amount: number,
  currency: CurrencyCode
): string {
  if (currency === "LAK") {
    return `₭${Math.round(amount).toLocaleString("en-US")}`;
  }
  return `$${Math.round(amount).toLocaleString("en-US")}`;
}

export function FlightTicketCard({
  flight,
  displayCurrency,
  adults,
  isCheapest,
  isFastest,
  lang = "lo"
}: FlightTicketCardProps) {
  const [showFares, setShowFares] = useState(false);
  const theme = AIRLINE_THEME[flight.airline];
  const t = getTranslation(lang);

  const carrierTagline =
    flight.airline === "Lao Airlines"
      ? t.carrierTaglineQV
      : flight.airline === "Lao Skyway"
      ? t.carrierTaglineLK
      : t.carrierTagline5A;

  // Authentic dual-currency selection directly from upstream airline engine
  const isDisplayUsd = displayCurrency === "USD";
  const displayPriceObj = isDisplayUsd
    ? flight.priceUsd ?? flight.price
    : flight.priceLak ?? flight.price;
  const secondaryPriceObj = isDisplayUsd
    ? flight.priceLak ?? flight.price
    : flight.priceUsd ?? flight.price;

  const unitAmountInDisplay =
    displayPriceObj.amount ??
    convertCurrency(flight.price.amount, flight.price.currency, displayCurrency, USD_TO_LAK_RATE);

  const secondaryCurrency: CurrencyCode = isDisplayUsd ? "LAK" : "USD";
  const unitAmountInSecondary =
    secondaryPriceObj.amount ??
    convertCurrency(flight.price.amount, flight.price.currency, secondaryCurrency, USD_TO_LAK_RATE);

  const totalForPassengers = unitAmountInDisplay * adults;

  const baseFareInDisplay = displayPriceObj.baseFare ?? null;
  const taxAmountInDisplay = displayPriceObj.taxAmount ?? null;

  const isSoldOut = flight.soldOut === true || flight.seatAvailable === 0;

  return (
    <article
      className={`bg-white rounded-2xl border border-slate-200/90 border-l-4 ${theme.accentBorder} shadow-sm hover:shadow-md transition-all overflow-hidden ${
        isSoldOut ? "opacity-75 bg-slate-50/70" : ""
      }`}
    >
      {/* Top highlight ribbon with Lao Airlines Royal Navy (Client-Facing Only) */}
      {(isCheapest || isFastest || isSoldOut) && (
        <div className="px-4 py-1.5 bg-[#19398a] text-white text-[11px] font-mono-tabular flex items-center justify-between border-b border-[#eab308]/40">
          <div className="flex items-center gap-2">
            {isSoldOut ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white font-bold">
                <XCircle className="w-3 h-3" />
                {t.officialSiteSoldOut}
              </span>
            ) : (
              <>
                {isCheapest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#f59e0b] text-[#0f245c] font-bold">
                    <Sparkles className="w-3 h-3" />
                    {t.bestFareBadge}
                  </span>
                )}
                {isFastest && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#00aeef] text-white font-bold">
                    <Clock className="w-3 h-3" />
                    {t.fastestSectorBadge}
                  </span>
                )}
              </>
            )}
          </div>
          <span className="text-amber-300 font-semibold text-[10px]">
            {flight.airline}
          </span>
        </div>
      )}

      {/* Main Ticket Body */}
      <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Column 1: Carrier & Aircraft Info (4 cols) */}
        <div className="lg:col-span-4 flex items-start gap-3.5">
          <AirlineLogo airline={flight.airline} size="lg" />

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-900 text-base">
                {flight.airline}
              </h3>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono-tabular text-xs font-bold text-slate-800">
                {flight.flightNumber}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">{carrierTagline}</p>

            <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px] font-mono-tabular text-slate-600">
              {flight.aircraft && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  ✈ {flight.aircraft}
                </span>
              )}
              {flight.baggageKg && (
                <span className="inline-flex items-center gap-1 text-slate-600">
                  <Briefcase className="w-3 h-3" />
                  {flight.baggageKg} {t.baggageKg}
                </span>
              )}
              {typeof flight.seatAvailable === "number" && (
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
                    flight.seatAvailable <= 4
                      ? "text-rose-600 font-bold"
                      : "text-slate-500"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  {flight.seatAvailable === 0
                    ? t.zeroSeats
                    : `${flight.seatAvailable} ${t.seatsLeft}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Flight Timing & Duration Runway (4 cols) */}
        <div className="lg:col-span-4 flex items-center justify-between gap-3 px-2">
          {/* Departure Airport */}
          <div className="text-left min-w-[75px]">
            <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatTimeHHMM(flight.departureTime)}
            </div>
            <div className="mt-0.5">
              <AirportBadge code={flight.origin.code} city={flight.origin.name} type="origin" />
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[95px] mt-0.5 font-medium">
              {flight.origin.name}
            </div>
          </div>

          {/* Runway Segment Visual */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] font-mono-tabular text-slate-500 flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3" />
              {formatDuration(flight.durationMinutes)}
            </span>

            <div className="w-full flex items-center gap-1 relative">
              <div className="w-2 h-2 rounded-full border-2 border-slate-400 bg-white" />
              <div className="flex-1 h-[2px] bg-gradient-to-r from-slate-300 via-amber-400 to-slate-300 relative">
                <Plane className="w-3.5 h-3.5 text-amber-600 absolute left-1/2 -top-[6px] -translate-x-1/2 rotate-90" />
              </div>
              <div className="w-2 h-2 rounded-full border-2 border-slate-900 bg-slate-900" />
            </div>

            <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-emerald-700 font-semibold mt-1">
              {t.nonStopDirect}
            </span>
          </div>

          {/* Arrival Airport */}
          <div className="text-right min-w-[75px] flex flex-col items-end">
            <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {formatTimeHHMM(flight.arrivalTime)}
            </div>
            <div className="mt-0.5">
              <AirportBadge code={flight.destination.code} city={flight.destination.name} type="dest" />
            </div>
            <div className="text-[11px] text-slate-500 truncate max-w-[95px] mt-0.5 font-medium">
              {flight.destination.name}
            </div>
          </div>
        </div>

        {/* Column 3: Price, Tax Breakdown, and Booking Action (4 cols) */}
        <div className="lg:col-span-4 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <div className="text-left lg:text-right">
            <div className="text-[11px] font-mono-tabular uppercase tracking-wider text-slate-500">
              {flight.fareBrand || t.headlineMatrix}
            </div>

            <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#19398a] tracking-tight">
              {formatMoneyDisplay(unitAmountInDisplay, displayCurrency)}
            </div>

            {/* Base Fare + Taxes/Surcharges Breakdown Pill */}
            {baseFareInDisplay !== null && taxAmountInDisplay !== null && (
              <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#19398a]/5 border border-[#19398a]/20 text-[10.5px] font-mono-tabular text-[#19398a] font-medium">
                <Receipt className="w-3 h-3 text-[#19398a]" />
                <span>
                  {t.fare} {formatMoneyDisplay(baseFareInDisplay, displayCurrency)} + {t.tax}{" "}
                  {formatMoneyDisplay(taxAmountInDisplay, displayCurrency)}
                </span>
              </div>
            )}

            <div className="text-xs font-mono-tabular text-slate-500 mt-0.5">
              ≈ {formatMoneyDisplay(unitAmountInSecondary, secondaryCurrency)}
              {adults > 1 && (
                <span className="ml-1 text-slate-700 font-semibold">
                  • Total {formatMoneyDisplay(totalForPassengers, displayCurrency)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-auto lg:w-full justify-end">
            {flight.fareTiers && flight.fareTiers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFares(!showFares)}
                className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{t.fareAndTaxDetails} ({flight.fareTiers.length})</span>
                {showFares ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {isSoldOut ? (
              <button
                type="button"
                disabled
                className="px-4 py-2.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-semibold cursor-not-allowed"
              >
                {t.soldOutButton}
              </button>
            ) : (
              <a
                href={flight.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm transition ${theme.buttonBg}`}
              >
                <span>{t.bookDirect}</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Fare Families & Tax Breakdown Drawer */}
      {showFares && flight.fareTiers && (
        <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-200/80 space-y-3">
          <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold flex items-center gap-2 text-[#19398a]">
              <AirlineLogo airline={flight.airline} size="sm" />
              <span>{t.fareFamiliesTitle} {flight.flightNumber}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {t.officialBooking}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {flight.fareTiers.map((tier) => {
              const tierTotalAmt = isDisplayUsd
                ? tier.amountUsd ?? convertCurrency(tier.amount, tier.currency, "USD", USD_TO_LAK_RATE)
                : tier.amountLak ?? convertCurrency(tier.amount, tier.currency, "LAK", USD_TO_LAK_RATE);

              const tierBaseAmt = isDisplayUsd
                ? tier.baseFareUsd ?? (typeof tier.baseFare === "number" ? convertCurrency(tier.baseFare, tier.currency, "USD", USD_TO_LAK_RATE) : null)
                : tier.baseFareLak ?? (typeof tier.baseFare === "number" ? convertCurrency(tier.baseFare, tier.currency, "LAK", USD_TO_LAK_RATE) : null);

              const tierTaxAmt = isDisplayUsd
                ? tier.taxAmountUsd ?? (typeof tier.taxAmount === "number" ? convertCurrency(tier.taxAmount, tier.currency, "USD", USD_TO_LAK_RATE) : null)
                : tier.taxAmountLak ?? (typeof tier.taxAmount === "number" ? convertCurrency(tier.taxAmount, tier.currency, "LAK", USD_TO_LAK_RATE) : null);

              return (
                <div
                  key={`${flight.id}-${tier.brandName}`}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs flex flex-col justify-between gap-2.5 hover:border-[#19398a]/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {tier.brandName}
                      </span>
                      <span className="text-[10px] font-mono-tabular px-1.5 py-0.5 rounded bg-[#19398a]/10 text-[#19398a] font-bold">
                        {t.classPrefix} {tier.bookingClass}
                      </span>
                    </div>

                    <div className="font-mono-tabular text-lg font-bold text-[#19398a] mt-1">
                      {formatMoneyDisplay(tierTotalAmt, displayCurrency)}
                    </div>

                    {tierBaseAmt !== null && tierTaxAmt !== null && (
                      <div className="text-[10.5px] font-mono-tabular text-slate-500 mt-0.5">
                        {t.baseFarePrefix} {formatMoneyDisplay(tierBaseAmt, displayCurrency)} + {t.tax}{" "}
                        {formatMoneyDisplay(tierTaxAmt, displayCurrency)}
                      </div>
                    )}

                    {/* Detailed itemized tax breakdown list */}
                    {tier.taxDetails && tier.taxDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                        <div className="text-[9.5px] font-mono-tabular uppercase tracking-wider text-slate-400">
                          {t.itemizedTaxesTitle}
                        </div>
                        {tier.taxDetails.map((tax) => {
                          const itemTaxAmt = isDisplayUsd
                            ? tier.currency === "USD" ? tax.amount : Math.round((tax.amount / USD_TO_LAK_RATE) * 100) / 100
                            : tier.currency === "LAK" ? tax.amount : Math.round(tax.amount * USD_TO_LAK_RATE);
                          return (
                            <div
                              key={tax.name}
                              className="flex items-center justify-between text-[10.5px] text-slate-600 font-mono-tabular"
                            >
                              <span className="truncate pr-1">{tax.name}:</span>
                              <span className="font-semibold shrink-0">
                                {formatMoneyDisplay(itemTaxAmt, displayCurrency)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="text-[11px] text-slate-600 mt-2 space-y-0.5 font-mono-tabular">
                      <div>✓ {tier.baggageKg} {t.baggageKg}</div>
                      <div>
                        {tier.refundable ? `✓ ${t.refundable}` : `✗ ${t.nonRefundable}`}
                      </div>
                    </div>
                  </div>

                  <a
                    href={flight.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 rounded-lg bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-bold text-center transition block shadow-sm"
                  >
                    {t.selectBrand} {tier.brandName.split(" ")[0]} ➔
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
