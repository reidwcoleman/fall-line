import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.GH_PAGES ? '/fall-line/' : '/',
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
