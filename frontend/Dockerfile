# ==========================================
# フロントエンド本番用 Dockerfile
# マルチステージビルドによる最適化
# ==========================================

# ============================
# 1. Build Stage
# ============================
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
# COPY ./package.json ./package-lock.json ./
COPY . .
# COPY package.json ./
RUN npm ci

# Copy source
COPY . .

# 環境変数
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ARG NEXT_PUBLIC_ENV 
ENV NEXT_PUBLIC_ENV=${NEXT_PUBLIC_ENV}
ARG INTERNAL_API_URL
ENV INTERNAL_API_URL=${INTERNAL_API_URL}

# Build Next.js (App Router)
RUN npm run build

# ============================
# 2. Production Stage
# ============================
FROM node:20-alpine AS runner

WORKDIR /app

# ENV NODE_ENV=production

# Copy only necessary build artifacts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/public ./public

# Expose Next.js port
EXPOSE 3000

CMD ["npm", "start"]
