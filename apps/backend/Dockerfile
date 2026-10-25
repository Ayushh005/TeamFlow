# ==========================================
# Stage 1: Build & Dependencies
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code and build
COPY src ./src
RUN npm run build

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl/wget for health checks
RUN apk add --no-cache wget

# Create non-root application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
COPY prisma ./prisma/

# Install only production dependencies
RUN npm ci --omit=dev && npx prisma generate

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist

# Create storage directory and ensure appuser owns /app
RUN mkdir -p /app/storage/uploads && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

EXPOSE 3000

CMD ["node", "dist/src/main"]
