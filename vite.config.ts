/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Testene våre kjører i Node (ingen nettleser trengs for ren logikk).
    environment: 'node',
    // Alle tester kjører som om vi er i Norge, uansett hvor maskinen står.
    env: { TZ: 'Europe/Oslo' },
  },
})
