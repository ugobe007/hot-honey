import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure no HMR in production
    sourcemap: false, // Disable sourcemaps for production
  },
});
