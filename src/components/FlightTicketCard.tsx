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

export function formatTimeHHMM(isoString: string): string {
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

function getCleanCityName(name: string): string {
  return name.split("(")[0].replace(/Intl|Airport|Domestic/gi, "").trim();
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

  // Dual-currency amounts
  const isDisplayUsd = displayCurrency === "USD";
  const displayPriceObj = isDisplayUsd
    ? flight.priceUsd ?? flight.price
    : flight.priceLak ?? flight.price;
  const secondaryPriceObj = isDisplayUsd
    ? flight.priceLak ?? flight.price
    : flight.priceUsd ?? flight.price;

  const unitAmountInDisplay =
    displayPriceObj?.amount ?? flight.price.amount;

  const secondaryCurrency: CurrencyCode = isDisplayUsd ? "LAK" : "USD";
  const unitAmountInSecondary =
    secondaryPriceObj?.amount ?? flight.price.amount;

  const totalForPassengers = unitAmountInDisplay * adults;

  const baseFareInDisplay = displayPriceObj.baseFare ?? null;
  const taxAmountInDisplay = displayPriceObj.taxAmount ?? null;

  const isSoldOut = flight.soldOut === true || flight.seatAvailable === 0;

  const originCity = getCleanCityName(flight.origin.name);
  const destCity = getCleanCityName(flight.destination.name);

  return (
    <article
      className={`bg-white rounded-2xl border border-slate-200/90 border-l-4 ${theme.accentBorder} shadow-xs hover:shadow-md transition-all overflow-hidden ${
        isSoldOut ? "opacity-75 bg-slate-50/70" : ""
      }`}
    >
      <div className="p-3.5 sm:p-5 space-y-3">
        {/* Row 1: Carrier info + Status badge */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <AirlineLogo
              airline={flight.airline}
              size="sm"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg p-0.5 shrink-0"
            />
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">
                {flight.airline}
              </span>
              <span className="text-slate-400 font-mono-tabular text-xs">·</span>
              <span className="font-mono-tabular text-xs font-semibold text-slate-600">
                {flight.flightNumber}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isSoldOut ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 font-mono-tabular">
                <XCircle className="w-3.5 h-3.5" />
                <span>{t.soldOutBadge}</span>
              </span>
            ) : (
              <>
                {isCheapest && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 font-mono-tabular">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t.bestFareBadge}</span>
                  </span>
                )}
                {isFastest && !isCheapest && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-600 font-mono-tabular">
                    <Clock className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t.fastestSectorBadge}</span>
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Row 2: Flight Journey Timings & Path */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-1">
          {/* Departure */}
          <div className="text-left shrink-0 min-w-[70px] sm:min-w-[90px]">
            <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
              {formatTimeHHMM(flight.departureTime)}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-mono-tabular text-xs font-bold text-slate-800">
                {flight.origin.code}
              </span>
              <span className="text-slate-300 font-normal">·</span>
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                {originCity}
              </span>
            </div>
          </div>

          {/* Center Flight Corridor Runway */}
          <div className="flex-1 flex flex-col items-center px-1 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-mono-tabular text-slate-500 font-semibold flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatDuration(flight.durationMinutes)}
            </span>

            <div className="w-full max-w-[160px] sm:max-w-[200px] flex items-center gap-1 relative">
              <div className="w-1.5 h-1.5 rounded-full border-2 border-slate-300 bg-white" />
              <div className="flex-1 h-[1.5px] bg-slate-200 relative">
                <Plane className="w-3.5 h-3.5 text-amber-500 absolute left-1/2 -top-[6px] -translate-x-1/2 rotate-90" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full border-2 border-slate-700 bg-slate-700" />
            </div>

            <span className="text-[9.5px] sm:text-[10px] font-mono-tabular uppercase tracking-wider text-emerald-700 font-bold mt-1">
              {t.nonStopDirect}
            </span>
          </div>

          {/* Arrival */}
          <div className="text-right shrink-0 min-w-[70px] sm:min-w-[90px] flex flex-col items-end">
            <div className="font-mono-tabular text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
              {formatTimeHHMM(flight.arrivalTime)}
            </div>
            <div className="flex items-center gap-1 mt-1 justify-end">
              <span className="text-[11px] text-slate-500 font-medium truncate max-w-[80px] sm:max-w-[120px]">
                {destCity}
              </span>
              <span className="text-slate-300 font-normal">·</span>
              <span className="font-mono-tabular text-xs font-bold text-slate-800">
                {flight.destination.code}
              </span>
            </div>
          </div>
        </div>

        {/* Row 3: Compact Metadata Bar (Aircraft, Baggage, Seats left) */}
        <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-500 py-0.5 flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            {flight.aircraft && (
              <span className="flex items-center gap-1 text-slate-600">
                ✈ <span>{flight.aircraft}</span>
              </span>
            )}
            {flight.aircraft && flight.baggageKg && (
              <span className="text-slate-300">·</span>
            )}
            {flight.baggageKg && (
              <span className="flex items-center gap-1 text-slate-600">
                <Briefcase className="w-3 h-3 text-slate-400" />
                <span>{flight.baggageKg} kg</span>
              </span>
            )}
            {typeof flight.seatAvailable === "number" && (
              <>
                <span className="text-slate-300">·</span>
                <span
                  className={`flex items-center gap-1 font-semibold ${
                    flight.seatAvailable <= 4 ? "text-rose-600 font-bold" : "text-slate-600"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>
                    {flight.seatAvailable === 0
                      ? t.zeroSeats
                      : `${flight.seatAvailable} ${t.seatsLeft}`}
                  </span>
                </span>
              </>
            )}
          </div>
          {flight.fareBrand && (
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate max-w-[110px] sm:max-w-none">
              {flight.fareBrand.split(" ")[0]}
            </span>
          )}
        </div>

        {/* Row 4: Clean Price & Action Footer */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2.5">
          {/* Price & Tax Inclusion Guarantee */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tabular text-xl sm:text-2xl font-bold text-[#19398a] tracking-tight leading-none">
                {formatMoneyDisplay(unitAmountInDisplay, displayCurrency)}
              </span>
              {adults > 1 && (
                <span className="text-[10px] font-mono-tabular text-slate-500 font-semibold">
                  / {t.paxUnit}
                </span>
              )}
            </div>
            <div className="text-[10.5px] font-mono-tabular text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span>≈ {formatMoneyDisplay(unitAmountInSecondary, secondaryCurrency)}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-emerald-700 font-medium">
                {t.taxesIncluded}
              </span>
            </div>
          </div>

          {/* Action CTAs: Details Drawer Toggle + Book Direct Button */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {flight.fareTiers && flight.fareTiers.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFares(!showFares)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <span>{t.details}</span>
                {flight.fareTiers.length > 1 && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono-tabular font-bold">
                    {flight.fareTiers.length}
                  </span>
                )}
                {showFares ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>
            )}

            {isSoldOut ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-1.5 rounded-xl bg-slate-200 text-slate-500 text-xs font-semibold cursor-not-allowed whitespace-nowrap"
              >
                {t.soldOutButton}
              </button>
            ) : (
              <a
                href={flight.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-white text-xs font-bold inline-flex items-center justify-center gap-1 shadow-xs transition whitespace-nowrap ${theme.buttonBg}`}
              >
                <span>{t.bookDirect}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Fare Families & Tax Breakdown Drawer */}
      {showFares && flight.fareTiers && (
        <div className="px-4 py-3.5 bg-slate-50/90 border-t border-slate-200/80 space-y-3">
          <div className="text-xs font-mono-tabular uppercase tracking-wider text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold flex items-center gap-2 text-[#19398a]">
              <AirlineLogo airline={flight.airline} size="sm" className="w-6 h-6 rounded" />
              <span>{t.fareFamiliesTitle} {flight.flightNumber}</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {t.officialBooking}
            </span>
          </div>

          {/* Itemized Fare + Tax Summary Banner */}
          {baseFareInDisplay !== null && taxAmountInDisplay !== null && (
            <div className="flex items-center justify-between text-xs font-mono-tabular py-2 border-b border-slate-200/80 text-slate-700 flex-wrap gap-2">
              <span className="font-medium flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>{t.fare}: <strong className="text-slate-900">{formatMoneyDisplay(baseFareInDisplay, displayCurrency)}</strong></span>
                <span className="text-slate-300">•</span>
                <span>{t.tax}: <strong className="text-slate-900">{formatMoneyDisplay(taxAmountInDisplay, displayCurrency)}</strong></span>
              </span>
              <span className="font-bold text-[#19398a]">
                {t.allIn}: {formatMoneyDisplay(unitAmountInDisplay, displayCurrency)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {flight.fareTiers.map((tier) => {
              const tierTotalAmt = isDisplayUsd
                ? tier.amountUsd ?? tier.amount
                : tier.amountLak ?? tier.amount;

              const tierBaseAmt = isDisplayUsd
                ? tier.baseFareUsd ?? (typeof tier.baseFare === "number" ? tier.baseFare : null)
                : tier.baseFareLak ?? (typeof tier.baseFare === "number" ? tier.baseFare : null);

              const tierTaxAmt = isDisplayUsd
                ? tier.taxAmountUsd ?? (typeof tier.taxAmount === "number" ? tier.taxAmount : null)
                : tier.taxAmountLak ?? (typeof tier.taxAmount === "number" ? tier.taxAmount : null);

              return (
                <div
                  key={`${flight.id}-${tier.brandName}`}
                  className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs flex flex-col justify-between gap-2 hover:border-[#19398a]/40 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {tier.brandName}
                      </span>
                      <span className="text-[11px] font-mono-tabular text-slate-500 font-medium">
                        {t.classPrefix} {tier.bookingClass}
                      </span>
                    </div>

                    <div className="font-mono-tabular text-base font-bold text-[#19398a] mt-1">
                      {formatMoneyDisplay(tierTotalAmt, displayCurrency)}
                    </div>

                    {tierBaseAmt !== null && tierTaxAmt !== null && (
                      <div className="text-[10px] font-mono-tabular text-slate-500 mt-0.5">
                        {t.baseFarePrefix} {formatMoneyDisplay(tierBaseAmt, displayCurrency)} + {t.tax}{" "}
                        {formatMoneyDisplay(tierTaxAmt, displayCurrency)}
                      </div>
                    )}

                    {/* Detailed itemized tax breakdown list */}
                    {tier.taxDetails && tier.taxDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
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
                              className="flex items-center justify-between text-[10px] text-slate-600 font-mono-tabular"
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

                    <div className="text-[10.5px] text-slate-600 mt-2 space-y-0.5 font-mono-tabular">
                      <div>✓ {tier.baggageKg} kg</div>
                      <div>
                        {tier.refundable ? `✓ ${t.refundable}` : `✗ ${t.nonRefundable}`}
                      </div>
                    </div>
                  </div>

                  <a
                    href={flight.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 rounded-lg bg-[#5cb85c] hover:bg-[#4cae4c] text-white text-xs font-bold text-center transition block shadow-xs mt-2"
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
