import { CurrencyCode, LaosAirport } from "@/types/flight";

/**
 * Official exchange rate fetched from Lao Skyway Intelisys RESTv1 currencies API
 * (1 / 0.000047973135 = 20,845 LAK per 1 USD)
 */
export const USD_TO_LAK_RATE = 20845;

export const LAOS_AIRPORTS: LaosAirport[] = [
  {
    code: "VTE",
    name: "Wattay International Airport",
    city: "Vientiane",
    nameLao: "ນະຄອນຫຼວງວຽງຈັນ",
    province: "Vientiane Prefecture",
    region: "Central",
    coordinates: { lat: 17.9883, lng: 102.5633, mapX: 162, mapY: 252 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 172,
    highlightTag: "National Hub"
  },
  {
    code: "LPQ",
    name: "Luang Prabang International Airport",
    city: "Luang Prabang",
    nameLao: "ຫຼວງພະບາງ",
    province: "Luang Prabang",
    region: "Northern",
    coordinates: { lat: 19.8973, lng: 102.1608, mapX: 145, mapY: 148 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 291,
    highlightTag: "UNESCO Heritage"
  },
  {
    code: "PKZ",
    name: "Pakse International Airport",
    city: "Pakse",
    nameLao: "ປາກເຊ",
    province: "Champasak",
    region: "Southern",
    coordinates: { lat: 15.1321, lng: 105.7814, mapX: 302, mapY: 438 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 101,
    highlightTag: "Bolaven & 4000 Islands"
  },
  {
    code: "BOR",
    name: "Bokeo International Airport",
    city: "Bokeo (Tonpheung)",
    nameLao: "ບໍ່ແກ້ວ",
    province: "Bokeo",
    region: "Northern",
    coordinates: { lat: 20.3442, lng: 100.1235, mapX: 62, mapY: 112 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 385,
    highlightTag: "Golden Triangle SEZ"
  },
  {
    code: "XKH",
    name: "Xieng Khouang Airport",
    city: "Phonsavan (Xieng Khouang)",
    nameLao: "ຊຽງຂວາງ",
    province: "Xieng Khouang",
    region: "Northern",
    coordinates: { lat: 19.45, lng: 103.1583, mapX: 204, mapY: 176 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 1050,
    highlightTag: "Plain of Jars"
  },
  {
    code: "NEU",
    name: "Nong Khang Airport",
    city: "Sam Neua (Hua Phan)",
    nameLao: "ຊຳເໜືອ (ຫົວພັນ)",
    province: "Houaphanh",
    region: "Northern",
    coordinates: { lat: 20.4167, lng: 104.0667, mapX: 248, mapY: 122 },
    airlines: ["Lao Airlines", "Lao Skyway", "Lanexang Airways"],
    elevationMeters: 1120,
    highlightTag: "Viengxay Caves"
  },
  {
    code: "LXG",
    name: "Luang Namtha Airport",
    city: "Luang Namtha",
    nameLao: "ຫຼວງນ້ຳທາ",
    province: "Luang Namtha",
    region: "Northern",
    coordinates: { lat: 20.9606, lng: 101.4025, mapX: 108, mapY: 78 },
    airlines: ["Lao Airlines", "Lao Skyway"],
    elevationMeters: 600,
    highlightTag: "Nam Ha Eco-Trek"
  },
  {
    code: "ZVK",
    name: "Savannakhet Airport",
    city: "Savannakhet",
    nameLao: "ສະຫວັນນະເຂດ",
    province: "Savannakhet",
    region: "Central",
    coordinates: { lat: 16.5567, lng: 104.76, mapX: 256, mapY: 348 },
    airlines: ["Lao Airlines", "Lao Skyway"],
    elevationMeters: 155,
    highlightTag: "Mekong Trade Corridor"
  },
  {
    code: "ODY",
    name: "Oudomxay Airport",
    city: "Muang Xay (Oudomxay)",
    nameLao: "ອຸດົມໄຊ",
    province: "Oudomxay",
    region: "Northern",
    coordinates: { lat: 20.6825, lng: 101.9936, mapX: 136, mapY: 98 },
    airlines: ["Lao Skyway"],
    elevationMeters: 635,
    highlightTag: "Northern Crossroads"
  }
];

export const AIRPORT_BY_CODE: Record<string, LaosAirport> = Object.fromEntries(
  LAOS_AIRPORTS.map((airport) => [airport.code, airport])
);

export function getAirportInfo(code: string): { code: string; name: string } {
  const normalized = code.trim().toUpperCase();
  const found = AIRPORT_BY_CODE[normalized];
  return {
    code: normalized,
    name: found ? `${found.city} (${found.name})` : normalized
  };
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  usdToLak: number = USD_TO_LAK_RATE
): number {
  if (from === to) return Math.round(amount);
  if (from === "USD" && to === "LAK") {
    return Math.round((amount * usdToLak) / 1000) * 1000;
  }
  return Math.round(amount / usdToLak);
}

export const POPULAR_LAOS_ROUTES: Array<{
  origin: string;
  destination: string;
  label: string;
  tagline: string;
}> = [
  {
    origin: "VTE",
    destination: "XKH",
    label: "VTE → XKH",
    tagline: "Plain of Jars Highland Hop"
  },
  {
    origin: "VTE",
    destination: "LPQ",
    label: "VTE → LPQ",
    tagline: "Capital to UNESCO Heritage"
  },
  {
    origin: "VTE",
    destination: "PKZ",
    label: "VTE → PKZ",
    tagline: "Southern Mekong & Champasak"
  },
  {
    origin: "VTE",
    destination: "BOR",
    label: "VTE → BOR",
    tagline: "Golden Triangle Express (3 Carriers)"
  },
  {
    origin: "VTE",
    destination: "XKH",
    label: "VTE → XKH",
    tagline: "Plain of Jars Highland Hop"
  },
  {
    origin: "VTE",
    destination: "NEU",
    label: "VTE → NEU",
    tagline: "Nong Khang Mountain Runway"
  },
  {
    origin: "LPQ",
    destination: "PKZ",
    label: "LPQ → PKZ",
    tagline: "North-to-South Direct Link"
  }
];

