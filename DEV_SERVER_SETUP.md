# Development Server Setup Guide

## Issue: Dev Server Not Running

If you're seeing the error "http://localhost:5174/v2 is down", follow these steps:

## Quick Fix

### 1. Clean and Reinstall Dependencies

The node_modules may be corrupted. Run:

```bash
rm -rf node_modules package-lock.json
npm install
```

### 2. Create .env File

Create a `.env` file in the root directory with the following content:

```env
# Supabase Configuration (optional for local development)
VITE_SUPABASE_URL=https://placeholder.supabase.co
VITE_SUPABASE_ANON_KEY=placeholder-key
```

Note: Replace with your actual Supabase credentials if you have them, or use these placeholder values for local development.

### 3. Start the Dev Server

```bash
npm run dev
```

### 4. Access the Application

The server runs on **port 5173** (not 5174). Access it at:

- Main page: http://localhost:5173/
- V2 page: http://localhost:5173/v2

## Common Issues

### Wrong Port
- The Vite dev server runs on **port 5173** by default
- If you're trying to access port 5174, change to port 5173

### Missing Dependencies
- If you see module errors, run `npm install`
- Make sure you're using Node.js version 18 or higher

### Supabase Errors
- The app will show warnings about missing Supabase environment variables
- These can be ignored for local development with the placeholder values above
- Some features requiring database access won't work without real Supabase credentials

## Verifying Your Setup

After starting the server, you should see output like:

```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

## Additional Commands

- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`

## Need Help?

If you're still having issues:
1. Check that Node.js and npm are installed: `node --version` and `npm --version`
2. Ensure you're in the project root directory
3. Check for any error messages in the terminal
4. Verify that port 5173 is not already in use by another application
