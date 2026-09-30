import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://nomotonyc.github.io/nyc-data-general/, so asset URLs
// must be prefixed with the repo name rather than assuming a domain root.
export default defineConfig({
  plugins: [react()],
  base: '/nyc-data-general/',
})
