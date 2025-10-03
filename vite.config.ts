<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure no HMR in production
    sourcemap: false, // Disable sourcemaps for production
  },
});
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost'  // ← This makes it work at http://localhost:5173
  }
})
>>>>>>> f0520b7 (Initial commit)
