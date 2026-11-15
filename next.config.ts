import type { NextConfig } from "next"

function normalizeBaseUrl(value?: string): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/+$/, "")
}

const backendUrl = normalizeBaseUrl(
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
