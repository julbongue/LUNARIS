import type {
  AnalysisRequest,
  DataQualityInfo,
  DataSource,
  EphemerisPoint,
  EphemerisResponse,
  Location,
  LocationInput,
} from "@/lib/models";
import { CATALOG_LOCATIONS, pickColor } from "@/lib/data-catalog";
import { getApiConfig } from "@/lib/api-config";
import { apiRequest, toUserErrorMessage } from "@/lib/api-client";

export function isApiConfigured(): boolean {
  return getApiConfig().configured;
}

export async function listLocations(): Promise<Location[]> {
  if (!isApiConfigured()) {
    // Sem backend configurado: expor catálogo local como referência de navegação (não resultados científicos).
    return CATALOG_LOCATIONS.map((l) => ({ ...l }));
  }
  try {
    const data = await apiRequest<unknown>("/api/v1/sites", { timeoutMs: 15000 });
    const d = asObj(data);
    const sites = Array.isArray(d.sites) ? d.sites : [];
    if (sites.length) {
      return sites.map((s, i) => mapBackendSite(s, i));
    }
  } catch {
    // fallback para catálogo local de referência
  }
  return CATALOG_LOCATIONS.map((l) => ({ ...l }));
}

function mapBackendSite(s: unknown, i: number): Location {
  const so = asObj(s);
  const lat = numOrNull(so.latitude_deg) ?? 0;
  const lon = numOrNull(so.longitude_deg) ?? 0;
  return {
    id: String(so.id ?? `site-${i}`),
    name: String(so.name ?? `Site ${i + 1}`),
    latitude: lat,
    longitude: lon,
    coordinateSystem: "planetocentric",
    altitudeM: numOrNull(so.elevation_m) ?? undefined,
    color: pickColor(i),
    source: "real",
    notes: typeof so.description === "string" ? so.description : undefined,
  };
}

export async function createLocalLocation(input: LocationInput): Promise<Location> {
  const lat = Number(input.latitude);
  const lon = Number(input.longitude);
  const altitudeM = input.altitudeM ? Number(input.altitudeM) : undefined;
  return {
    id: (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `loc-${Date.now()}`),
    name: input.name.trim() || "Local sem nome",
    latitude: isFinite(lat) ? lat : 0,
    longitude: isFinite(lon) ? lon : 0,
    coordinateSystem: input.coordinateSystem,
    altitudeM: altitudeM != null && isFinite(altitudeM) ? altitudeM : undefined,
    color: input.color || pickColor(0),
    source: "mock",
    notes: "Local definido pelo utilizador (não persistido no backend).",
    createdAt: new Date().toISOString(),
  };
}

export async function analyzeLocations(
  locations: Location[],
  req: AnalysisRequest,
): Promise<EphemerisResponse[]> {
  if (locations.length === 0) return [];

  if (!isApiConfigured()) {
    const reason = "API não configurada (NEXT_PUBLIC_API_URL). Configure a URL do backend/tunnel.";
    return locations.map((loc) => unavailable(loc, reason));
  }

  return Promise.all(
    locations.map(async (loc) => {
      try {
        const payload = buildAnalysisRequest(loc, req);
        const data = await apiRequest<unknown>("/api/v1/analysis", {
          method: "POST",
          json: payload,
          timeoutMs: 45000,
        });
        return normalizeAnalysisResult(loc, data);
      } catch (e) {
        return unavailable(loc, toUserErrorMessage(e));
      }
    }),
  );
}

function buildAnalysisRequest(loc: Location, req: AnalysisRequest) {
  const start = new Date(req.intervalStart + "T00:00:00Z").toISOString();
  const end = new Date(req.intervalEnd + "T23:59:59Z").toISOString();
  const site: Record<string, unknown> = {
    type: "coordinates",
    name: loc.name,
    latitude_deg: loc.latitude,
    longitude_deg: loc.longitude,
  };
  if (loc.altitudeM != null && Number.isFinite(loc.altitudeM)) {
    site.elevation_m = loc.altitudeM;
  }
  return {
    start_time: start,
    stop_time: end,
    step_minutes: Math.max(1, Math.round(req.stepHours * 60)),
    site,
    thresholds: {
      sun_elevation_deg: 0,
      earth_elevation_deg: 5,
    },
    include_samples: true,
    coordinate_system: loc.coordinateSystem === "planetographic" ? "planetographic" : "planetocentric",
    reference_frame: "selenographic",
    terrain_availability: "none",
    horizon_reference: "geometric",
  };
}

function normalizeAnalysisResult(loc: Location, data: unknown): EphemerisResponse {
  const d = asObj(data);
  const samples = Array.isArray(d.samples) ? d.samples : [];
  const caveats = Array.isArray(d.caveats) ? d.caveats.filter((x): x is string => typeof x === "string") : [];
  const sources = Array.isArray(d.sources)
    ? d.sources.map((s) => {
        const so = asObj(s);
        return typeof so.name === "string" ? so.name : null;
      }).filter((x): x is string => Boolean(x))
    : [];
  const model = asObj(d.model);
  const modelName = typeof model.name === "string" ? model.name : undefined;
  const modelVersion = typeof model.version === "string" ? model.version : undefined;
  const provenance = [
    ...(modelName ? [`Modelo: ${modelName}${modelVersion ? ` ${modelVersion}` : ""}`] : []),
    ...sources.map((s) => `Fonte: ${s}`),
    ...caveats,
  ];

  const points: EphemerisPoint[] = samples.map((s) => mapSample(s));
  const source: DataSource = points.length > 0 ? "real" : "unavailable";

  const qualityObj = asObj(d.quality);
  const qEngine = typeof qualityObj.engine_name === "string";
  const quality = qEngine ? 0.8 : (points.length ? 0.7 : null);
  const siteObj = asObj(d.site);

  return {
    locationId: loc.id,
    name: typeof siteObj.name === "string" ? siteObj.name : loc.name,
    color: loc.color,
    source,
    quality,
    provenance: provenance.length ? provenance : undefined,
    points,
    note: provenance[0] || (points.length ? "Análise recebida do backend." : "Backend não devolveu amostras para o intervalo selecionado."),
  };
}

function mapSample(s: unknown): EphemerisPoint {
  const so = asObj(s);
  const sunElev = numOrNull(so.sun_elevation_deg);
  const earthElev = numOrNull(so.earth_elevation_deg);
  const sunAbove = typeof so.sun_above_threshold === "boolean" ? so.sun_above_threshold : null;
  const earthAbove = typeof so.earth_above_threshold === "boolean" ? so.earth_above_threshold : null;

  const solarVisibility = sunAbove != null ? (sunAbove ? 1 : 0) : (sunElev != null ? (sunElev > 0 ? 1 : 0) : null);
  const earthVisibility = earthAbove != null ? (earthAbove ? 1 : 0) : (earthElev != null ? (earthElev > 0 ? 1 : 0) : null);

  let illumination: string | null = null;
  if (sunElev != null) {
    if (sunElev > 0.5) illumination = "iluminado";
    else if (sunElev >= -0.5) illumination = "terminador/crepúsculo";
    else illumination = "sombra";
  }

  return {
    instant: typeof so.timestamp === "string" ? so.timestamp : "",
    solarElevationDeg: sunElev,
    solarAzimuthDeg: numOrNull(so.sun_azimuth_deg),
    earthElevationDeg: earthElev,
    earthAzimuthDeg: numOrNull(so.earth_azimuth_deg),
    earthVisibility,
    solarVisibility,
    commWindow: earthAbove,
    distanceKm: null,
    horizonOcclusion: null,
    illuminationCondition: illumination,
    source: "real",
    quality: null,
  };
}

function unavailable(loc: Location, reason: string): EphemerisResponse {
  return {
    locationId: loc.id,
    name: loc.name,
    color: loc.color,
    source: "unavailable",
    quality: null,
    provenance: [reason],
    points: [],
    note: `Dados indisponíveis: ${reason}`,
  };
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : (v == null ? NaN : Number(v));
  return Number.isFinite(n) ? n : null;
}

export async function getDataQuality(locationId: string): Promise<DataQualityInfo> {
  if (!isApiConfigured()) {
    return {
      locationId,
      source: "unavailable",
      quality: null,
      provenance: ["API não configurada."],
      notes: "Defina NEXT_PUBLIC_API_URL para obter dados do backend.",
    };
  }
  return {
    locationId,
    source: "real",
    quality: null,
    provenance: ["Qualidade/proveniência detalhada disponível na resposta de /api/v1/analysis (model, sources, caveats, quality)."],
    notes: "Consultar metadados devolvidos pelo backend por análise.",
  };
}

// Compatibilidade com chamadas existentes na UI
export function getBackendMode(): "offline" | "live" {
  return isApiConfigured() ? "live" : "offline";
}
