# Multi-stage build for Fly.io
# This builds the app with environment variables available

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Fly.io secrets are available as environment variables during build
# They're automatically injected by Fly.io, but we need to verify they're set
# Vite will read VITE_* prefixed env vars and embed them at build time

# Build the app (Vite will use VITE_* env vars automatically from Fly.io secrets)
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
