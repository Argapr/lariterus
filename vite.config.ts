import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: Number(process.env.PORT) || 8099 },
  build: { target: 'es2020', outDir: 'dist' },
});
