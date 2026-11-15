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
  if (!cfg.configured) {
    return {
      api: "unconfigured",
      scientificEngine: "unknown",
      ephemerisProvider: "unknown",
      dem: "unknown",
      message: "API não configurada.",
      details: ["Configure a variável de ambiente da API (ex.: LUNARIS_API_URL) no servidor/Vercel."],
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
    if (e instanceof ApiClientError) {
      if (e.kind === "timeout") {
        return {
          api: "offline",
          scientificEngine: "unavailable",
          ephemerisProvider: "unavailable",
          dem: "unavailable",
          message: "API inacessível (tempo limite excedido).",
          details: [e.message, e.status ? `HTTP ${e.status}` : "Tipo: timeout"],
          checkedAt,
        };
      }
      if (e.kind === "network") {
        return {
          api: "offline",
          scientificEngine: "unavailable",
          ephemerisProvider: "unavailable",
          dem: "unavailable",
          message: "API inacessível (falha de rede/CORS/tunnel).",
          details: [e.message, "Tipo: erro de rede"],
          checkedAt,
        };
      }
      if (e.kind === "invalid_response") {
        return {
          api: "degraded",
          scientificEngine: "unknown",
          ephemerisProvider: "unknown",
          dem: "unknown",
          message: "API respondeu, mas a resposta do health check é inválida.",
          details: [e.message, "Tipo: erro de parsing/resposta inválida (não é falha de rede)"],
          checkedAt,
        };
      }
      // HTTP errors: o servidor respondeu -> não é "offline/rede"
      const httpInfo = e.status ? `HTTP ${e.status}` : "erro HTTP";
      return {
        api: "degraded",
        scientificEngine: "unknown",
        ephemerisProvider: "unknown",
        dem: "unknown",
        message: `API respondeu com erro (${httpInfo}).`,
        details: [e.message, `Tipo: erro HTTP${e.status ? ` (${e.status})` : ""}`],
        checkedAt,
      };
    }
    return {
      api: "offline",
      scientificEngine: "unavailable",
      ephemerisProvider: "unavailable",
      dem: "unavailable",
      message: "API indisponível ou inacessível.",
      details: ["Falha ao contactar /api/v1/health."],
      checkedAt,
    };
  }

  try {
    capabilities = await apiRequest<unknown>("/api/v1/capabilities", { timeoutMs: 8000 });
  } catch (e) {
    // API responde health mas capabilities falhou
    const msg = e instanceof ApiClientError ? e.message : "Falha ao obter /api/v1/capabilities.";
    const kindInfo = e instanceof ApiClientError
      ? (e.kind === "timeout" ? " (timeout)" : e.kind === "network" ? " (falha de rede)" : e.kind === "invalid_response" ? " (resposta inválida)" : e.status ? ` (HTTP ${e.status})` : "")
      : "";
    return {
      api: "degraded",
      scientificEngine: "unknown",
      ephemerisProvider: "unknown",
      dem: "unknown",
      message: `API acessível, mas capacidades/motores não puderam ser verificadas${kindInfo}.`,
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
