import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// De 'vitest/config' para que el campo `test` tenga tipo.
export default defineConfig({
    // El sitio vive en /cifrado-cesar-atbash/, no en la raiz.
  base: '/cifrado-cesar-atbash/',

  plugins: [react()],

  test: {
        // core/ no usa DOM.
    environment: 'node',
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
  },
})
