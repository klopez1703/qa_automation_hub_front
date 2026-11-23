import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy evita problemas de CORS en desarrollo: todo lo que el frontend
// pida a /api se reenvía al backend en localhost:4000.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: ['.tunnelmole.net', 'localhost'], 
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
