"use client";

import React, { useState } from "react";
import { AirlineName } from "@/types/flight";

interface AirlineLogoProps {
  airline: AirlineName;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "w-12 h-8",
  md: "w-16 h-10",
  lg: "w-24 h-12"
};

/**
 * Official airline brand logos downloaded directly from their official websites:
 * 1. Lao Airlines (QV) - https://laoairlines.com/wp-content/uploads/2020/10/logo-laoairlines.png
 * 2. Lao Skyway (LK) - https://www.laoskyway.com/assets/imgs/lsw-logo.png
 * 3. Lanexang Airways (5A) - https://lxairways.com/wp-content/uploads/2025/05/New-Logo-1.png
 */
const AIRLINE_OFFICIAL_ASSETS: Record<
  AirlineName,
  {
    primary: string;
    fallbackIcon: string;
    alt: string;
    code: string;
    border: string;
  }
> = {
  "Lao Airlines": {
    primary: "/airlines/laoairlines.png",
    fallbackIcon: "/airlines/laoairlines_square.png",
    alt: "Lao Airlines",
    code: "QV",
    border: "border-blue-200"
  },
  "Lao Skyway": {
    primary: "/airlines/laoskyway.png",
    fallbackIcon: "/airlines/laoskyway_square.png",
    alt: "Lao Skyway",
    code: "LK",
    border: "border-rose-200"
  },
  "Lanexang Airways": {
    primary: "/airlines/lxairways.png",
    fallbackIcon: "/airlines/lxairways_icon.png",
    alt: "Lanexang Airways",
    code: "5A",
    border: "border-emerald-200"
  }
};

export function AirlineLogo({
  airline,
  className = "",
  size = "lg"
}: AirlineLogoProps) {
  const asset = AIRLINE_OFFICIAL_ASSETS[airline] || AIRLINE_OFFICIAL_ASSETS["Lao Airlines"];
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.lg;
  const [imgSrc, setImgSrc] = useState(asset.primary);

  return (
    <div
      className={`${sizeClass} rounded-xl bg-white border ${asset.border} shadow-xs flex items-center justify-center p-1.5 shrink-0 overflow-hidden ${className}`}
      title={`${asset.alt} (${asset.code})`}
    >
      <img
        src={imgSrc}
        alt={asset.alt}
        className="w-full h-full object-contain select-none"
        loading="lazy"
        onError={() => {
          if (imgSrc !== asset.fallbackIcon) {
            setImgSrc(asset.fallbackIcon);
          }
        }}
      />
    </div>
  );
}

/**
 * Airport IATA Emblem Badge
 * Displays the authentic airport IATA badge with terminal identifier
 */
export function AirportBadge({
  code,
  city,
  type = "origin",
  className = ""
}: {
  code: string;
  city?: string;
  type?: "origin" | "dest";
  className?: string;
}) {
  return (
    <span
      className={`font-mono-tabular font-bold text-xs text-slate-800 ${className}`}
      title={`${code} Airport (${city || ""})`}
    >
      <span>{code}</span>
    </span>
  );
}


