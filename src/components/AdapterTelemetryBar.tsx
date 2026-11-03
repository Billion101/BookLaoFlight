"use client";

import React from "react";
import {
  Activity,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Server,
  ShieldCheck
} from "lucide-react";
import { AdapterTelemetry, MetasearchResponse } from "@/types/flight";

interface AdapterTelemetryBarProps {
  telemetry: AdapterTelemetry[];
  cacheInfo?: MetasearchResponse["cache"];
  isLoading: boolean;
  onForceRefresh: () => void;
}

const CARRIER_BADGE_STYLES: Record<string, string> = {
  "Lao Airlines": "bg-[#19398a]/15 text-[#19398a] border-[#19398a]/30 font-bold",
  "Lao Skyway": "bg-rose-500/15 text-rose-700 border-rose-300 font-bold",
  "Lanexang Airways": "bg-emerald-500/15 text-emerald-700 border-emerald-300 font-bold"
};

export function AdapterTelemetryBar({
  telemetry,
  cacheInfo,
  isLoading,
  onForceRefresh
}: AdapterTelemetryBarProps) {
  const formatTtl = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${String(secs).padStart(2, "0")}s`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#19398a] text-[#fde047] shadow-xs">
            <Activity className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-xs font-mono-tabular uppercase tracking-wider font-bold text-[#19398a]">
              Parallel Airline Adapter Pipeline (3 Engines)
            </h2>
            <p className="text-xs text-slate-500">
              Concurrent HTTP impersonation • Playwright headless fallback •
              15-minute route-date cache
            </p>
          </div>
        </div>

        {cacheInfo && (
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono-tabular font-medium border ${
                cacheInfo.hit
                  ? "bg-amber-50 text-amber-900 border-amber-300"
                  : "bg-emerald-50 text-emerald-900 border-emerald-300"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>
                CACHE {cacheInfo.hit ? "HIT" : "MISS"} ({cacheInfo.key})
              </span>
              <span className="text-slate-400">•</span>
              <Clock className="w-3 h-3" />
              <span>TTL {formatTtl(cacheInfo.ttlSecondsRemaining)}</span>
            </div>

            <button
              type="button"
              onClick={onForceRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#19398a] hover:bg-[#132c6d] text-white disabled:opacity-50 transition cursor-pointer shadow-xs"
              title="Bypass 15-minute cache and trigger fresh parallel scrape"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>Force Live Re-Scrape</span>
            </button>
          </div>
        )}
      </div>

      {/* 3-Channel Adapter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {telemetry.map((item) => {
          const isLive = item.dataSource === "live-api";
          const badgeClass =
            CARRIER_BADGE_STYLES[item.airline] ||
            "bg-slate-100 text-slate-700 border-slate-300";

          return (
            <div
              key={item.airline}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 flex flex-col justify-between gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono-tabular font-bold border ${badgeClass}`}
                  >
                    {item.carrierCode}
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900 leading-tight">
                      {item.airline}
                    </div>
                    <div className="text-[11px] font-mono-tabular text-slate-500 flex items-center gap-1">
                      <Server className="w-3 h-3" />
                      {item.engineName}
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono-tabular font-semibold ${
                    isLive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {isLive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      LIVE API
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 text-sky-600" />
                      SCHEDULE+TARIFF
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-600 pt-1.5 border-t border-slate-200/60">
                <span className="truncate max-w-[200px]" title={item.note}>
                  {item.note}
                </span>
                <span className="font-semibold text-slate-900 shrink-0 ml-2">
                  {item.flightsFound} flights • {item.latencyMs}ms
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

