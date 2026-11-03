import React from "react";
import { MetasearchPortal } from "@/components/MetasearchPortal";
import { globalMetasearchService } from "@/server/services/metasearch.service";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Default tomorrow's date in YYYY-MM-DD
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  // Pre-fetch initial domestic search (VTE -> XKH default) on the server
  const initialData = await globalMetasearchService.searchAllAirlines({
    origin: "VTE",
    destination: "XKH",
    date: tomorrow,
    adults: 1,
    currency: "LAK"
  });

  return <MetasearchPortal initialData={initialData} />;
}

