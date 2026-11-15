import { apiRequest, ApiClientError } from "./api-client";
import { getApiConfig } from "./api-config";
import type { Dictionary } from "./i18n/dictionaries";

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
function str(v: unknown): string | undefined { return typeof v === "string" ? v : undefined; }
function bool(v: unknown): boolean | undefined { return typeof v === "boolean" ? v : undefined; }
function fmt(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

const def = {
  backend: {
    messages: {
      unconfigured: "API not configured.",
      unconfiguredDetail: "Set the API environment variable (e.g., LUNARIS_API_URL) on the server/Vercel.",
      timeout: "API unreachable (timeout).",
      network: "API unreachable (network/CORS/tunnel failure).",
      invalidHealth: "API responded, but the health check response is invalid.",
      invalidResponseDetail: "Type: parsing/invalid response error (not a network failure)",
      httpError: "API responded with an error ({status}).",
      httpType: "Type: HTTP error{suffix}",
      healthContactFail: "Failed to contact /api/v1/health.",
      unavailable: "API unavailable or unreachable.",
      capsFailed: "API reachable, but capabilities/engines could not be verified{suffix}.",
      capsGetFail: "Failed to obtain /api/v1/capabilities.",
      onlineOperational: "API online and scientific engine available.",
      online: "API online.",
      degraded: "API in degraded state.",
      noEngine: "No scientific engine available according to /api/v1/capabilities.",
      apiState: "API state: {state}",
      ephemerisProvider: "Configured ephemeris provider: {provider}",
      typeTimeout: "Type: timeout",
      typeNetwork: "Type: network error",
      typeHttpWithStatus: "HTTP {status}",
    },
  },
} as unknown as Pick<Dictionary, "backend">;

export async function fetchBackendStatus(t?: Pick<Dictionary, "backend">): Promise<BackendStatus> {
  const m = (t ?? def).backend.messages;
  const checkedAt = new Date().toISOString();
  const cfg = getApiConfig();
  if (!cfg.configured) {
    return {
      api: "unconfigured",
      scientificEngine: "unknown",
      ephemerisProvider: "unknown",
      dem: "unknown",
      message: m.unconfigured,
      details: [m.unconfiguredDetail],
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
        return { api: "offline", scientificEngine: "unavailable", ephemerisProvider: "unavailable", dem: "unavailable", message: m.timeout, details: [e.message, m.typeTimeout], checkedAt };
      }
      if (e.kind === "network") {
        return { api: "offline", scientificEngine: "unavailable", ephemerisProvider: "unavailable", dem: "unavailable", message: m.network, details: [e.message, m.typeNetwork], checkedAt };
      }
      if (e.kind === "invalid_response") {
        return { api: "degraded", scientificEngine: "unknown", ephemerisProvider: "unknown", dem: "unknown", message: m.invalidHealth, details: [e.message, m.invalidResponseDetail], checkedAt };
      }
      const httpInfo = e.status ? fmt(m.typeHttpWithStatus, { status: e.status }) : "HTTP";
      return { api: "degraded", scientificEngine: "unknown", ephemerisProvider: "unknown", dem: "unknown", message: fmt(m.httpError, { status: httpInfo }), details: [e.message, fmt(m.httpType, { suffix: e.status ? ` (${e.status})` : "" })], checkedAt };
    }
    return { api: "offline", scientificEngine: "unavailable", ephemerisProvider: "unavailable", dem: "unavailable", message: m.unavailable, details: [m.healthContactFail], checkedAt };
  }

  try {
    capabilities = await apiRequest<unknown>("/api/v1/capabilities", { timeoutMs: 8000 });
  } catch (e) {
    const msg = e instanceof ApiClientError ? e.message : m.capsGetFail;
    const kindInfo = e instanceof ApiClientError
      ? (e.kind === "timeout" ? ` (${m.typeTimeout.replace(/^Tipo: |^Type: /, "")})` : e.kind === "network" ? ` (${m.typeNetwork.replace(/^Tipo: |^Type: /, "")})` : e.kind === "invalid_response" ? "" : e.status ? ` (${fmt(m.typeHttpWithStatus, { status: e.status })})` : "")
      : "";
    return { api: "degraded", scientificEngine: "unknown", ephemerisProvider: "unknown", dem: "unknown", message: fmt(m.capsFailed, { suffix: kindInfo }), details: [msg], checkedAt, raw: { health } };
  }

  const h = asObj(health);
  const c = asObj(capabilities);

  if (str(h.status) && str(h.status) !== "ok" && str(h.status) !== "healthy") {
    api = "degraded";
    details.push(fmt(m.apiState, { state: str(h.status)! }));
  }

  const engines = Array.isArray(c.engines) ? c.engines : [];
  const features = asObj(c.features);

  let scientificEngine: ComponentState = "unknown";
  if (engines.length > 0) {
    const anyAvailable = engines.some((en) => bool(asObj(en).available) === true);
    scientificEngine = anyAvailable ? "operational" : "unavailable";
    if (!anyAvailable) details.push(m.noEngine);
  }

  let ephemerisProvider: ComponentState = "unknown";
  const cfgEph = str(c.configured_ephemeris_provider);
  if (cfgEph) {
    const f = features.ephemeris ?? features.ephemeris_provider ?? features.horizons;
    if (typeof f === "boolean") ephemerisProvider = f ? "operational" : "unavailable";
    else if (typeof f === "string") ephemerisProvider = /ok|available|enabled|operational/i.test(f) ? "operational" : "unavailable";
    else ephemerisProvider = "operational";
    details.push(fmt(m.ephemerisProvider, { provider: cfgEph }));
  } else {
    const f = features.ephemeris ?? features.ephemeris_provider ?? features.horizons;
    if (typeof f === "boolean") ephemerisProvider = f ? "operational" : "unavailable";
  }

  let dem: ComponentState = "unknown";
  const demFeature = features.dem ?? features.topography ?? features.terrain ?? features.elevation;
  if (typeof demFeature === "boolean") dem = demFeature ? "operational" : "unavailable";
  else if (typeof demFeature === "string") dem = /ok|available|enabled|operational/i.test(demFeature) ? "operational" : "unavailable";
  else if (Array.isArray(demFeature)) dem = demFeature.length ? "operational" : "unavailable";

  const message =
    api === "online" && scientificEngine === "operational"
      ? m.onlineOperational
      : api === "online"
        ? m.online
        : m.degraded;

  return { api, scientificEngine, ephemerisProvider, dem, message, details, checkedAt, raw: { health, capabilities } };
}
