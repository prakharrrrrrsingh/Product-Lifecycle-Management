import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 8080,
    // Proxy all /api calls to the ASP.NET Core backend.
    // secure: false accepts the self-signed dev certificate.
    proxy: {
      '/api': {
        target: 'https://localhost:7110',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    // Default dist/ for standalone builds.
    // Use `npm run build:deploy` to output into the .NET wwwroot instead.
    outDir: 'dist',
  },
})
