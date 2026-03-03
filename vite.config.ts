import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// @ts-ignore: ignoring missing typings for basic-ssl
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: true,     // Expone a la red local (celular puede acceder)
    port: 5173,
    proxy: {
      '/socket': {
        target: 'ws://localhost:3000',
        ws: true,
      }
    }
  },
})
