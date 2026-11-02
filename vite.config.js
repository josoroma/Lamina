import { defineConfig } from 'vite';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Every *.html in the project root is an entry (app, lab workbench, harness pages).
const root = import.meta.dirname;
const input = Object.fromEntries(
  readdirSync(root)
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), resolve(root, f)])
);

export default defineConfig({
  base: './',
  server: { port: 5173, strictPort: true, host: '127.0.0.1' },
  preview: { port: 4173, strictPort: true, host: '127.0.0.1' },
  build: {
    target: 'es2022',
    outDir: 'dist',
    rollupOptions: { input },
    chunkSizeWarningLimit: 2000,
  },
  worker: { format: 'es' },
});
