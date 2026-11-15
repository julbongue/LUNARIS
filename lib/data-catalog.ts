import type { Location } from "@/lib/models";

export const CATALOG_LOCATIONS: Location[] = [
  {
    id: "shackleton",
    name: "Shackleton Crater",
    latitude: -89.9,
    longitude: 0.0,
    coordinateSystem: "meanEarth",
    altitudeM: undefined,
    color: "#E89A55",
    source: "real",
    notes: "Região do polo sul lunar, referência de exploração.",
  },
  {
    id: "tranquillitatis",
    name: "Mare Tranquillitatis",
    latitude: 8.5,
    longitude: 31.4,
    coordinateSystem: "meanEarth",
    altitudeM: undefined,
    color: "#8FAFC7",
    source: "real",
    notes: "Região equatorial do lado visível da Lua.",
  },
  {
    id: "tycho",
    name: "Tycho Crater",
    latitude: -43.3,
    longitude: -11.2,
    coordinateSystem: "meanEarth",
    altitudeM: undefined,
    color: "#D5D2C9",
    source: "real",
    notes: "Cratera proeminente no hemisfério sul.",
  },
  {
    id: "malapert",
    name: "Malapert Massif",
    latitude: -85.99,
    longitude: 2.93,
    coordinateSystem: "meanEarth",
    color: "#F1F0EB",
    source: "real",
    notes: "Maciço próximo ao polo sul.",
  },
  {
    id: "nobile",
    name: "Nobile Crater",
    latitude: -85.2,
    longitude: 53.5,
    coordinateSystem: "meanEarth",
    color: "#85847F",
    source: "real",
    notes: "Cratera na região polar sul.",
  },
  {
    id: "aristarchus",
    name: "Aristarchus Plateau",
    latitude: 23.7,
    longitude: -47.4,
    coordinateSystem: "meanEarth",
    color: "#E89A55",
    source: "real",
    notes: "Região geologicamente diversa no lado visível.",
  },
];

export const PALETTE = ["#E89A55", "#8FAFC7", "#D5D2C9", "#85847F", "#F1F0EB", "#172B40"] as const;

export function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function catalogById(id: string): Location | undefined {
  return CATALOG_LOCATIONS.find((l) => l.id === id);
}
