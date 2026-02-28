# =============================================
# Production-ready Dockerfile for CursorCode AI Web
# Turborepo + Next.js + Prisma Compatible
# =============================================

# ==================== BASE ====================
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# ==================== BUILDER ====================
FROM base AS builder

# Copy root files (monorepo aware)
COPY ../../package.json ../../package-lock.json ./
COPY ../../turbo.json ./

# Copy full monorepo
COPY ../../ ./

# Install all workspace deps
RUN npm ci

# Build only web app
RUN npx turbo run build --filter=@cursorcode/web

# ==================== RUNNER ====================
FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Create non-root user
RUN addgroup -S nodejs -g 1001
RUN adduser -S nextjs -u 1001
USER nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
