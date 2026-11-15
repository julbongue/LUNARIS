import type { AnalysisRequest, EphemerisPoint, EphemerisResponse, Location } from "@/lib/models";
import { catalogById } from "@/lib/data-catalog";

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function solarModel(lat: number, tHours: number, seed: number) {
  const rng = mulberry32(seed + Math.floor(tHours));
  const phase = (tHours / (24 * 29.53)) * Math.PI * 2;
  const diurnal = Math.cos((tHours / 24) * Math.PI * 2 - (lat * Math.PI) / 180);
  const decl = 1.54 * Math.sin(phase);
  const base = (90 - Math.abs(lat) + decl) * diurnal;
  const elev = clamp(base + (rng() - 0.5) * 2, -90, 90);
  const az = ((tHours / 24) * 360 + 180 + lat * 0.3) % 360;
  return { elev, az };
}

export function generateForLocation(location: Location, req: AnalysisRequest): EphemerisResponse {
  const start = new Date(req.intervalStart + "T00:00:00Z");
  const end = new Date(req.intervalEnd + "T23:59:59Z");
  const stepMs = Math.max(1, req.stepHours) * 3600 * 1000;
  const points: EphemerisPoint[] = [];

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return {
      locationId: location.id,
      name: location.name,
      color: location.color,
      source: "unavailable",
      quality: null,
      provenance: ["Intervalo temporal inválido."],
      points: [],
      note: "Intervalo temporal inválido; não foi possível gerar série.",
    };
  }

  const seedBase = hashString(location.id);
  let t = start.getTime();
  let idx = 0;
  const limit = 500;
  while (t <= end.getTime() && idx < limit) {
    const tHours = idx * req.stepHours;
    const { elev, az } = solarModel(location.latitude, tHours, seedBase);
    const earthVisible = Math.abs(location.longitude) <= 95; // aproximação lado visível
    const earthElev = earthVisible ? clamp(45 - Math.abs(location.latitude) * 0.25 + Math.sin(tHours / 12) * 4, -10, 70) : null;
    const earthVis = earthElev == null ? 0 : earthElev > 0 ? 1 : 0;
    const solarVis = elev > 0 ? 1 : elev > -2 ? 0.2 : 0;
    const horizonOcc = clamp(0.05 + (location.altitudeM ? 0.02 : 0) + Math.abs(Math.sin(tHours / 7)) * 0.08, 0, 0.4);
    const commWindow = earthVis > 0.5 && horizonOcc < 0.25;

    points.push({
      instant: new Date(t).toISOString(),
      solarElevationDeg: Number(elev.toFixed(2)),
      solarAzimuthDeg: Number(((az + 360) % 360).toFixed(2)),
      earthElevationDeg: earthElev == null ? null : Number(earthElev.toFixed(2)),
      earthAzimuthDeg: earthVisible ? Number((((location.longitude + 180) % 360)).toFixed(2)) : null,
      earthVisibility: earthVis,
      solarVisibility: solarVis,
      commWindow,
      distanceKm: null,
      horizonOcclusion: Number(horizonOcc.toFixed(3)),
      illuminationCondition: elev > 0 ? "iluminado" : elev > -6 ? "crepúsculo" : "sombra",
      source: "mock",
      quality: 0.45,
    });
    t += stepMs;
    idx++;
  }

  return {
    locationId: location.id,
    name: location.name,
    color: location.color,
    source: "mock",
    quality: 0.45,
    provenance: [
      "Série temporal sintética gerada no frontend para prototipagem (offline).",
      "Não representa medições nem efemérides validadas.",
    ],
    points,
    note: "Dados mock: usar apenas para validação de interface e fluxo.",
  };
}

export function resolveLocation(id: string): Location | undefined {
  return catalogById(id);
}
