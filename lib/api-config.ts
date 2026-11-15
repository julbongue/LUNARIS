export interface ApiConfig {
  baseUrl: string; // "" = same-origin (proxy via Next.js rewrite)
  configured: boolean;
  mode: "proxy" | "direct" | "unconfigured";
}

export function getApiConfig(): ApiConfig {
  // Por padrão usamos chamadas relativas (/api/v1/...) e o Next.js faz rewrite/proxy
  // para o backend com base em LUNARIS_API_URL/API_URL (server-side, sem NEXT_PUBLIC_).
  // Isto evita CORS e não expõe a URL do backend no bundle do cliente.
  return { baseUrl: "", configured: true, mode: "proxy" };
}

export function buildApiUrl(path: string): string {
  const { baseUrl } = getApiConfig();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!baseUrl) return p; // relative (same-origin proxy)
  return `${baseUrl.replace(/\/+$/, "")}${p}`;
}
