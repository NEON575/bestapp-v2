import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@bestapp/shared': path.resolve(rootDir, '../../packages/shared/src'),
      '@bestapp/ui': path.resolve(rootDir, '../../packages/ui/src'),
      '@': path.resolve(rootDir, './src')
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
