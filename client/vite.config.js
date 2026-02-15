import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Plugin to generate version.json on build
const versionPlugin = () => ({
  name: 'version-plugin',
  buildStart() {
    // Generate version for dev mode
    const version = {
      buildTime: new Date().toISOString(),
      version: Date.now().toString()
    }
    fs.writeFileSync(
      path.resolve(__dirname, 'public/version.json'),
      JSON.stringify(version, null, 2)
    )
  },
  writeBundle() {
    // Generate version for production build
    const version = {
      buildTime: new Date().toISOString(),
      version: Date.now().toString()
    }
    fs.writeFileSync(
      path.resolve(__dirname, 'dist/version.json'),
      JSON.stringify(version, null, 2)
    )
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5174,
    strictPort: true, // Fail if port is already in use (don't auto-increment)
  },
})
