import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'build',
  images: {
    unoptimized: true,
  },
  // Disable server-side features that conflict with static export
  reactStrictMode: true,
}

export default nextConfig
