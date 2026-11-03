"use client";

import React, { useState } from "react";
import { Compass, Mountain, Navigation, Plane } from "lucide-react";
import { AIRPORT_BY_CODE, LAOS_AIRPORTS } from "@/data/laos-airports";
import { getTranslation, Language } from "@/data/translations";
import { LaosAirport } from "@/types/flight";

interface LaosAirspaceMapProps {
  origin: string;
  destination: string;
  onSelectRoute: (newOrigin: string, newDest: string) => void;
  lang?: Language;
}

function calculateDistanceKm(a: LaosAirport, b: LaosAirport): number {
  const R = 6371;
  const dLat = ((b.coordinates.lat - a.coordinates.lat) * Math.PI) / 180;
  const dLng = ((b.coordinates.lng - a.coordinates.lng) * Math.PI) / 180;
  const lat1 = (a.coordinates.lat * Math.PI) / 180;
  const lat2 = (b.coordinates.lat * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function LaosAirspaceMap({
  origin,
  destination,
  onSelectRoute,
  lang = "lo"
}: LaosAirspaceMapProps) {
  const [clickTarget, setClickTarget] = useState<"destination" | "origin">(
    "destination"
  );
  const t = getTranslation(lang);

  const originAirport = AIRPORT_BY_CODE[origin] ?? LAOS_AIRPORTS[0];
  const destAirport = AIRPORT_BY_CODE[destination] ?? LAOS_AIRPORTS[1];
  const distanceKm = calculateDistanceKm(originAirport, destAirport);

  // Compute curved Bezier control point for the flight path
  const x1 = originAirport.coordinates.mapX;
  const y1 = originAirport.coordinates.mapY;
  const x2 = destAirport.coordinates.mapX;
  const y2 = destAirport.coordinates.mapY;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = midX - dy * 0.22;
  const cy = midY + dx * 0.12 - 18;

  const handleAirportClick = (code: string) => {
    if (clickTarget === "origin") {
      if (code === destination) {
        onSelectRoute(code, origin);
      } else {
        onSelectRoute(code, destination);
      }
      setClickTarget("destination");
    } else {
      if (code === origin) {
        onSelectRoute(destination, code);
      } else {
        onSelectRoute(origin, code);
      }
    }
  };

  return (
    <div className="bg-[#0f245c] text-slate-100 rounded-2xl border border-blue-900/80 shadow-xl overflow-hidden flex flex-col justify-between">
      {/* Header bar - Lao Airlines Royal Navy & Dok Champa Gold */}
      <div className="px-4 py-3.5 border-b border-blue-800/80 flex items-center justify-between bg-[#0a183d]">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#fde047]" />
          <div>
            <h3 className="text-xs font-mono-tabular uppercase tracking-widest text-[#fde047] font-bold">
              {t.radarTitle}
            </h3>
            <p className="text-[11px] text-blue-200">
              {t.radarDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-[#07112b] rounded-lg p-0.5 border border-blue-900 text-[11px] font-mono-tabular">
          <button
            type="button"
            onClick={() => setClickTarget("origin")}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              clickTarget === "origin"
                ? "bg-[#eab308] text-[#0f245c] font-bold shadow-xs"
                : "text-blue-300 hover:text-white"
            }`}
          >
            {t.radarFrom} {origin}
          </button>
          <button
            type="button"
            onClick={() => setClickTarget("destination")}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              clickTarget === "destination"
                ? "bg-[#00aeef] text-white font-bold shadow-xs"
                : "text-blue-300 hover:text-white"
            }`}
          >
            {t.radarTo} {destination}
          </button>
        </div>
      </div>

      {/* SVG Aeronautical Chart of Laos */}
      <div className="relative px-3 py-2 flex-1 flex items-center justify-center">
        <svg
          viewBox="0 0 400 500"
          className="w-full max-h-[390px] select-none"
          role="img"
          aria-label="Interactive domestic air corridor map of Laos"
        >
          <defs>
            <linearGradient id="laosLand" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#13233F" />
              <stop offset="100%" stopColor="#0E1B31" />
            </linearGradient>
            <filter id="glowAmber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Radar grid rings centered around VTE */}
          <circle
            cx="162"
            cy="252"
            r="80"
            fill="none"
            stroke="rgba(148, 163, 184, 0.08)"
            strokeDasharray="3 3"
          />
          <circle
            cx="162"
            cy="252"
            r="160"
            fill="none"
            stroke="rgba(148, 163, 184, 0.08)"
            strokeDasharray="3 3"
          />
          <circle
            cx="162"
            cy="252"
            r="240"
            fill="none"
            stroke="rgba(148, 163, 184, 0.06)"
            strokeDasharray="3 3"
          />

          {/* Stylized Laos National Border Polygon */}
          <path
            d="M 98 42 L 152 35 L 185 68 L 222 85 L 268 102 L 282 142 L 245 178 L 258 228 L 298 288 L 338 356 L 348 425 L 315 472 L 268 465 L 254 415 L 228 362 L 198 302 L 178 272 L 132 262 L 105 225 L 112 178 L 78 156 L 44 122 L 56 85 Z"
            fill="url(#laosLand)"
            stroke="#27406B"
            strokeWidth="1.75"
          />

          {/* Stylized Mekong River Course */}
          <path
            d="M 55 108 Q 95 135 135 152 T 118 225 Q 140 258 175 265 T 248 348 Q 285 405 298 468"
            fill="none"
            stroke="rgba(56, 189, 248, 0.18)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Background domestic air corridors from VTE */}
          {LAOS_AIRPORTS.filter((a) => a.code !== "VTE").map((airport) => (
            <line
              key={`corridor-${airport.code}`}
              x1={162}
              y1={252}
              x2={airport.coordinates.mapX}
              y2={airport.coordinates.mapY}
              stroke="rgba(148, 163, 184, 0.14)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {/* Active Flight Arc Shadow */}
          <path
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke="rgba(245, 158, 11, 0.25)"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Active Animated Flight Arc */}
          <path
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.5"
            className="animate-flight-arc"
            filter="url(#glowAmber)"
          />

          {/* Mid-arc distance badge */}
          <g transform={`translate(${(x1 + x2 + cx) / 3}, ${(y1 + y2 + cy) / 3})`}>
            <rect
              x="-30"
              y="-10"
              width="60"
              height="18"
              rx="5"
              fill="#091120"
              stroke="#F59E0B"
              strokeWidth="1"
            />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              className="fill-amber-300 text-[9px] font-mono-tabular font-semibold"
            >
              {distanceKm} km
            </text>
          </g>

          {/* Airport Nodes */}
          {LAOS_AIRPORTS.map((airport) => {
            const isOrigin = airport.code === origin;
            const isDest = airport.code === destination;
            const isSelected = isOrigin || isDest;

            return (
              <g
                key={airport.code}
                transform={`translate(${airport.coordinates.mapX}, ${airport.coordinates.mapY})`}
                onClick={() => handleAirportClick(airport.code)}
                className="cursor-pointer group"
              >
                {isSelected && (
                  <circle
                    r="13"
                    fill={
                      isOrigin
                        ? "rgba(245, 158, 11, 0.22)"
                        : "rgba(56, 189, 248, 0.22)"
                    }
                  />
                )}
                <circle
                  r={isSelected ? "6.5" : "4.5"}
                  fill={
                    isOrigin
                      ? "#F59E0B"
                      : isDest
                      ? "#38BDF8"
                      : "#334155"
                  }
                  stroke={isSelected ? "#FFFFFF" : "#94A3B8"}
                  strokeWidth={isSelected ? "2" : "1.2"}
                />
                <text
                  x={airport.coordinates.mapX > 220 ? 10 : -10}
                  y="3"
                  textAnchor={airport.coordinates.mapX > 220 ? "start" : "end"}
                  className={`text-[11px] font-mono-tabular font-bold transition ${
                    isOrigin
                      ? "fill-amber-400"
                      : isDest
                      ? "fill-sky-300"
                      : "fill-slate-300 group-hover:fill-white"
                  }`}
                >
                  {airport.code}
                </text>
                <text
                  x={airport.coordinates.mapX > 220 ? 10 : -10}
                  y="14"
                  textAnchor={airport.coordinates.mapX > 220 ? "start" : "end"}
                  className="text-[8.5px] fill-slate-400 pointer-events-none"
                >
                  {airport.city.split(" ")[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Sector Telemetry Summary */}
      <div className="px-4 py-3 bg-[#0a183d] border-t border-blue-900/80 grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-blue-300 block">
            {t.greatCircle}
          </span>
          <span className="font-mono-tabular font-semibold text-white flex items-center gap-1 mt-0.5">
            <Navigation className="w-3 h-3 text-[#fde047]" />
            {distanceKm} km
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-blue-300 block">
            {t.destElevation}
          </span>
          <span className="font-mono-tabular font-semibold text-white flex items-center gap-1 mt-0.5">
            <Mountain className="w-3 h-3 text-[#00aeef]" />
            {destAirport.elevationMeters} m MSL
          </span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-blue-300 block">
            {t.sectorCarriers}
          </span>
          <span className="font-mono-tabular font-semibold text-emerald-300 flex items-center gap-1 mt-0.5">
            <Plane className="w-3 h-3" />
            {
              destAirport.airlines.filter((a) =>
                originAirport.airlines.includes(a)
              ).length
            }{" "}
            {t.flightsCountSuffix}
          </span>
        </div>
      </div>
    </div>
  );
}

