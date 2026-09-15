import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Test-only entry point: never reads local deployment credentials or loads Google.
export default defineConfig({
  root: fileURLToPath(new URL('../', import.meta.url)),
  envDir: fileURLToPath(new URL('./fixtures', import.meta.url)),
  plugins: [react()],
  resolve: { alias: { '@vis.gl/react-google-maps': fileURLToPath(new URL('./fixtures/maps.tsx', import.meta.url)) } },
  define: {
    'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify('test-placeholder'),
    'import.meta.env.VITE_API_URL': JSON.stringify('http://127.0.0.1:4178/api/v1'),
  },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
});
