import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Ensure native modules are not bundled into the client
  serverExternalPackages: ['@scout/agent', '@xenova/transformers'],
}

export default nextConfig
