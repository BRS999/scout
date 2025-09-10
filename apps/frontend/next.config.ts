import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // Ensure native modules are not bundled into the client
  serverExternalPackages: [
    '@scout/cron',
    '@mastra/fastembed',
    'onnxruntime-node',
    'tokenizers',
    '@anush008/tokenizers-darwin-universal',
    '@anush008/tokenizers',
  ],
}

export default nextConfig
