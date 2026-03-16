import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
  proxy: {
    '/api': {
      target: import.meta.env.VITE_API_URL || 'http://localhost:8000',
      changeOrigin: true,
    }
  }
}
})
