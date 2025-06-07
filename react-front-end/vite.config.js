import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Keep this if you're using it for Tailwind integration

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()], // Keep your existing plugins
  server: {
    proxy: {
      '/api': { // Any requests starting with /api (e.g., /api/hello)
        target: 'http://127.0.0.1:8000', // Forward them to your Flask backend
        changeOrigin: true, // Necessary for virtual hosted sites
        secure: false, // Set to true if your backend is HTTPS
      },
    },
  },
})