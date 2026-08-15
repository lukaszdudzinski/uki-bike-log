/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

import packageJson from './package.json';

// https://vite.dev/config/
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(packageJson.version),
  },
  base: '/uki-bike-log/',
  plugins: [
    react()
  ],
  test: {
    environment: 'jsdom',
    exclude: ['node_modules', 'e2e'],
  }
});
