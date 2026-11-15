import { apiRequest, ApiClientError } from "./api-client";
import { getApiConfig } from "./api-config";

export type BackendHealthState = "online" | "offline" | "unconfigured" | "degraded" | "unknown";
export type ComponentState = "operational" | "unavailable" | "unknown";

export interface BackendStatus {
  api: BackendHealthState;
  scientificEngine: ComponentState;
  ephemerisProvider: ComponentState;
  dem: ComponentState;
  message: string;
  details: string[];
  checkedAt: string;
  raw?: { health?: unknown; capabilities?: unknown };
}

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function bool(v: unknown): boolean | undefined {
  return typeof v === "boolean" ? v : undefined;
}

export async function fetchBackendStatus(): Promise<BackendStatus> {
  const checkedAt = new Date().toISOString();
  const cfg = getApiConfig();
  if (!cfg.configured || !cfg.baseUrl) {
    return {
      api: "unconfigured",
      scientificEngine: "unknown",
      ephemerisProvider: "unknown",
      dem: "unknown",
      message: "API não configurada. Defina NEXT_PUBLIC_API_URL.",
      details: ["Configure NEXT_PUBLIC_API_URL (ex.: URL do Cloudflare Tunnel) no ambiente."],
      checkedAt,
    };
  }

  let health: unknown;
  let capabilities: unknown;
  let api: BackendHealthState = "online";
  const details: string[] = [];

  try {
    health = await apiRequest<unknown>("/api/v1/health", { timeoutMs: 8000 });
  } catch (e) {
    const msg = e instanceof ApiClientError ? e.message : "Falha ao contactar /api/v1/health.";
    return {
      api: "offline",
      scientificEngine: "unavailable",
      ephemerisProvider: "unavailable",
      dem: "unavailable",
      message: "API indisponível ou inacessível.",
      details: [msg],
      checkedAt,
    };
  }

  try {
    capabilities = await apiRequest<unknown>("/api/v1/capabilities", { timeoutMs: 8000 });
  } catch (e) {
    // API responde health mas capabilities falhou: estado degradado/desconhecido
    const msg = e instanceof ApiClientError ? e.message : "Falha ao obter /api/v1/capabilities.";
    return {
      api: "degraded",
      scientificEngine: "unknown",
      ephemerisProvider: "unknown",
      dem: "unknown",
      message: "API acessível, mas capacidades/motores não puderam ser verificadas.",
      details: [msg],
      checkedAt,
      raw: { health },
    };
  }

  const h = asObj(health);
  const c = asObj(capabilities);

  if (str(h.status) && str(h.status) !== "ok" && str(h.status) !== "healthy") {
    api = "degraded";
    details.push(`Estado da API: ${str(h.status)}`);
  }

  const engines = Array.isArray(c.engines) ? c.engines : [];
  const features = asObj(c.features);

  // Scientific engine: configured/available engines
  let scientificEngine: ComponentState = "unknown";
  if (engines.length > 0) {
    const anyAvailable = engines.some((en) => bool(asObj(en).available) === true);
    scientificEngine = anyAvailable ? "operational" : "unavailable";
    if (!anyAvailable) details.push("Nenhum motor científico disponível segundo /api/v1/capabilities.");
  } else if (str(c.configured_engine)) {
    scientificEngine = "unknown";
  }

  // Ephemeris provider
  let ephemerisProvider: ComponentState = "unknown";
  const cfgEph = str(c.configured_ephemeris_provider);
  if (cfgEph) {
    const f = features.ephemeris ?? features.ephemeris_provider ?? features.horizons;
    if (typeof f === "boolean") ephemerisProvider = f ? "operational" : "unavailable";
    else if (typeof f === "string") ephemerisProvider = /ok|available|enabled|operational/i.test(f) ? "operational" : "unavailable";
    else ephemerisProvider = "operational"; // configurado e API saudável; sem sinal contrário
    details.push(`Provider de efemérides configurado: ${cfgEph}`);
  } else {
    const f = features.ephemeris ?? features.ephemeris_provider ?? features.horizons;
    if (typeof f === "boolean") ephemerisProvider = f ? "operational" : "unavailable";
  }

  // DEM / topography
  let dem: ComponentState = "unknown";
  const demFeature = features.dem ?? features.topography ?? features.terrain ?? features.elevation;
  if (typeof demFeature === "boolean") dem = demFeature ? "operational" : "unavailable";
  else if (typeof demFeature === "string") dem = /ok|available|enabled|operational/i.test(demFeature) ? "operational" : "unavailable";
  else if (Array.isArray(demFeature)) dem = demFeature.length ? "operational" : "unavailable";
  else {
    // tentar inferir por string de terrain/topography capabilities
    dem = "unknown";
  }

  const message =
    api === "online" && scientificEngine === "operational"
      ? "API online e motor científico disponível."
      : api === "online"
        ? "API online."
        : "API em estado degradado.";

  return {
    api,
    scientificEngine,
    ephemerisProvider,
    dem,
    message,
    details,
    checkedAt,
    raw: { health, capabilities },
  };
}
