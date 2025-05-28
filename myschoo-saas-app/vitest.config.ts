/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts', // Path to your setup file
    css: true, // If your components import CSS files
    // Optionally, configure coverage
    // coverage: {
    //   reporter: ['text', 'json', 'html'],
    // },
  },
});
