import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path is set for the GitHub Pages project site
// (https://<user>.github.io/domain-opportunity-engine/).
export default defineConfig({
  plugins: [react()],
  base: '/domain-opportunity-engine/',
})
