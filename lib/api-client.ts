import { buildApiUrl, getApiConfig } from "./api-config";

export type ApiErrorKind =
  | "config"
  | "network"
  | "timeout"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "unprocessable"
  | "rate_limited"
  | "server"
  | "unavailable"
  | "invalid_response";

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;
  url?: string;
  detail?: string;
  constructor(message: string, opts: { kind: ApiErrorKind; status?: number; url?: string; detail?: string }) {
    super(message);
    this.name = "ApiClientError";
    this.kind = opts.kind;
    this.status = opts.status;
    this.url = opts.url;
    this.detail = opts.detail;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  timeoutMs?: number;
  json?: unknown;
}

export type ApiErrorMessages = {
  config: string;
  timeout: string;
  network: string;
  unauthorized: string;
  forbidden: string;
  notFound: string;
  unprocessable: string;
  rateLimited: string;
  unavailable: string;
  server: string;
  invalidResponse: string;
  badRequest: string;
  unknown: string;
  unexpected: string;
};

const DEFAULT_API_ERROR_MESSAGES: ApiErrorMessages = {
  config: "API not configured (set the API environment variable on the server/Vercel).",
  timeout: "Timeout while contacting the backend (tunnel/API may be unavailable).",
  network: "Could not contact the backend. Check the Cloudflare Tunnel, the API URL, and the connection.",
  unauthorized: "Unauthorized access to the API (401).",
  forbidden: "Access denied by the API (403).",
  notFound: "Resource not found in the API (404).",
  unprocessable: "Invalid request for the API (422).",
  rateLimited: "API request limit exceeded (429).",
  unavailable: "API/engine temporarily unavailable (503).",
  server: "API server error ({status}).",
  invalidResponse: "Invalid response received from the API.",
  badRequest: "Error communicating with the API ({status}).",
  unknown: "unknown",
  unexpected: "Unexpected error.",
};

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 400) return "bad_request";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 422) return "unprocessable";
  if (status === 429) return "rate_limited";
  if (status === 503) return "unavailable";
  if (status >= 500) return "server";
  return "bad_request";
}

function format(msg: string, vars: Record<string, string | number>) {
  return msg.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function userMessage(kind: ApiErrorKind, status?: number, detail?: string, messages: ApiErrorMessages = DEFAULT_API_ERROR_MESSAGES): string {
  switch (kind) {
    case "config":
      return messages.config;
    case "timeout":
      return messages.timeout;
    case "network":
      return messages.network;
    case "unauthorized":
      return messages.unauthorized;
    case "forbidden":
      return messages.forbidden;
    case "not_found":
      return messages.notFound;
    case "unprocessable":
      return detail || messages.unprocessable;
    case "rate_limited":
      return messages.rateLimited;
    case "unavailable":
      return messages.unavailable;
    case "server":
      return format(messages.server, { status: status ?? 500 });
    case "invalid_response":
      return messages.invalidResponse;
    case "bad_request":
    default:
      return detail || format(messages.badRequest, { status: status ?? messages.unknown });
  }
}

function sanitizeDetail(input: unknown): string | undefined {
  if (typeof input === "string") {
    return input.length > 300 ? `${input.slice(0, 300)}…` : input;
  }
  return undefined;
}

async function parseErrorDetail(res: Response): Promise<string | undefined> {
  const ct = res.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await res.json();
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        if (typeof b.detail === "string") return sanitizeDetail(b.detail);
        if (Array.isArray(b.detail)) {
          const msgs = b.detail.map((d) => {
            if (d && typeof d === "object" && "msg" in (d as Record<string, unknown>)) {
              return String((d as Record<string, unknown>).msg);
            }
            return null;
          }).filter(Boolean);
          if (msgs.length) return sanitizeDetail(msgs.join("; "));
        }
        if (typeof b.message === "string") return sanitizeDetail(b.message);
        if (typeof b.error === "string") return sanitizeDetail(b.error);
      }
    } else {
      const text = await res.text();
      if (text) return sanitizeDetail(text.replace(/\s+/g, " ").trim());
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { configured } = getApiConfig();
  if (!configured) {
    throw new ApiClientError(userMessage("config"), { kind: "config" });
  }

  let url: string;
  try {
    url = buildApiUrl(path);
  } catch (e) {
    throw new ApiClientError(userMessage("config"), { kind: "config", detail: e instanceof Error ? e.message : undefined });
  }

  const { timeoutMs = 30000, json, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit = {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
      },
      body: json !== undefined ? JSON.stringify(json) : undefined,
      signal: controller.signal,
    };
    const res = await fetch(url, init);
    if (!res.ok) {
      const detail = await parseErrorDetail(res);
      const kind = kindFromStatus(res.status);
      throw new ApiClientError(userMessage(kind, res.status, detail), { kind, status: res.status, url, detail });
    }
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") || "";
    if (ct && !ct.includes("application/json")) {
      throw new ApiClientError(userMessage("invalid_response"), { kind: "invalid_response", status: res.status, url });
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof ApiClientError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiClientError(userMessage("timeout"), { kind: "timeout", url });
    }
    throw new ApiClientError(userMessage("network"), { kind: "network", url, detail: e instanceof Error ? e.message : undefined });
  } finally {
    clearTimeout(timeout);
  }
}

export function toUserErrorMessage(err: unknown, messages?: ApiErrorMessages): string {
  const m = messages ?? DEFAULT_API_ERROR_MESSAGES;
  if (err instanceof ApiClientError) return userMessage(err.kind, err.status, err.detail, m);
  if (err instanceof Error) return err.message || m.unexpected;
  return m.unexpected;
}
