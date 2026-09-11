import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// `defineConfig` se importa de 'vitest/config' y no de 'vite' para que el campo
// `test` sea parte del tipo de la configuracion. Sirve igual para `vite build`.
export default defineConfig({
  // El sitio no vive en la raiz del dominio, sino en
  // https://harimduenas.github.io/cifrado-cesar-atbash/
  // Sin esta linea los assets se piden a la raiz, dan 404 y la pagina sale en
  // blanco. Es el error clasico de Vite + GitHub Pages.
  base: '/cifrado-cesar-atbash/',

  plugins: [react()],

  test: {
    // El motor de cifrado es JS puro sin DOM, asi que no hace falta jsdom.
    environment: 'node',
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
  },
})
