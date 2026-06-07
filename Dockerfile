# FuelPro Dockerfile - Production Ready
# Multi-stage build for optimized image size

# ─── Build Stage ───
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the app
RUN npm run build

# ─── Production Stage ───
FROM node:20-alpine AS production

# Add labels
LABEL maintainer="FuelPro <support@fuelpro.app>"
LABEL description="FuelPro - Professional Fuel Management System"
LABEL version="1.0.0"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

WORKDIR /app

# Copy built assets
COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
COPY --from=builder --chown=nodeuser:nodejs /app/package.json ./
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodeuser:nodejs /app/api ./api

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodeuser

# Start server
CMD ["node", "api/server.js"]

# ─── Development Stage ───
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 3000 5173

CMD ["npm", "run", "dev"]

# ─── Builder Tool for Reconstruction ───
FROM alpine:latest AS rebuilder

RUN apk add --no-cache \
    curl \
    jq \
    && curl -fsSL https://reproducible-builds.org/reproducible-builds/rp.net/2024-01-01_reproducible_builds.pub | gpg --import && \
    echo "trusted-owner=$(curl -s https://reproducible-builds.org/key)"

# Build argument for version
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF

LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="fuelpro" \
      org.label-schema.version=$VERSION \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/leonnovic/FUEL_APP_MOBILE" \
      org.label-schema.schema-version="1.0"