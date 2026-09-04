import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0', // vizibil în preview-ul sandbox-ului / rețeaua locală
    port: 5173,
    allowedHosts: true, // acceptă host-ul de preview din sandbox
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
