import type { NextConfig } from "next"

function normalizeBackendBaseUrl(value?: string): string | null {
  if (!value) return null
  let trimmed = value.trim()
  if (!trimmed) return null
  if (!/^https?:\/\//i.test(trimmed)) trimmed = `https://${trimmed}`
  trimmed = trimmed.replace(/\/+$/, "")
  // Evitar duplicação se alguém configurar .../api/v1 como base
  trimmed = trimmed.replace(/\/api\/v1$/i, "")
  return trimmed.replace(/\/+$/, "")
}

const backendUrl = normalizeBackendBaseUrl(
  process.env.LUNARIS_API_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
)

const nextConfig: NextConfig = {
  async rewrites() {
    if (!backendUrl) return []
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
