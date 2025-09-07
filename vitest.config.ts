import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './apps/frontend/src'),
      '@scout/agent': path.resolve(__dirname, './packages/agent/src'),
      '@scout/memory': path.resolve(__dirname, './packages/memory/src'),
    },
  },
})
