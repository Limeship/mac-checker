import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files from both frontend dir and project root
  const rootEnv = loadEnv(mode, resolve(__dirname, '..'), '')
  const localEnv = loadEnv(mode, process.cwd(), '')
  const env = { ...rootEnv, ...localEnv, ...process.env }

  // Support API_KEY or the first key in comma-separated ApiKeys
  const apiKey = env.API_KEY || (env.ApiKeys ? env.ApiKeys.split(',')[0].trim() : '')
  const backendUrl = env.BACKEND_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        },
      },
    },
  }
})
