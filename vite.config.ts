import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost'  // Makes it work at http://localhost:5173
  },
  build: {
    // Ensure no HMR in production
    sourcemap: false, // Disable sourcemaps for production
  },
});
