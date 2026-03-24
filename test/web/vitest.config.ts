import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const configDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(configDir, '../..');

export default defineConfig({
  root: repoRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@client': path.join(repoRoot, 'apps/web/client'),
    },
  },
  test: {
    name: 'web-unit',
    globals: true,
    environment: 'jsdom',
    include: ['test/web/unit/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: [path.join(configDir, 'vitest.setup.ts')],
    env: {
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3000',
    },
  },
});
