export interface ApiConfig {
  baseUrl: string | null;
  configured: boolean;
}

function normalizeBaseUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

export function getApiConfig(): ApiConfig {
  const envUrl = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (envUrl) return { baseUrl: envUrl, configured: true };

  // Compatibilidade legada (config anterior do projeto)
  const legacyBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  const legacyMode = process.env.NEXT_PUBLIC_API_BACKEND;
  if (legacyMode === "live" && legacyBase) {
    return { baseUrl: legacyBase, configured: true };
  }

  // Sem URL configurada: não assumir localhost em produção/Vercel.
  // Em desenvolvimento local, permitir fallback explícito para conveniência.
  if (process.env.NODE_ENV === "development") {
    return { baseUrl: "http://127.0.0.1:8000", configured: true };
  }
  return { baseUrl: null, configured: false };
}

export function buildApiUrl(path: string): string {
  const { baseUrl } = getApiConfig();
  if (!baseUrl) {
    throw new Error("API não configurada: defina NEXT_PUBLIC_API_URL.");
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${p}`;
}
