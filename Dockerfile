# Base image resmi Bun
FROM oven/bun:1

WORKDIR /app

# Install curl-impersonate untuk bypass TLS bot detection Cloudflare
RUN apt-get update && apt-get install -y curl tar ca-certificates && \
    mkdir -p /tmp/curl-imp && \
    curl -fsSL https://github.com/lexiforest/curl-impersonate/releases/download/v2.3.0/curl-impersonate-v2.3.0.x86_64-linux-gnu.tar.gz | tar -xz -C /tmp/curl-imp && \
    cp /tmp/curl-imp/* /usr/local/bin/ 2>/dev/null || true && \
    chmod +x /usr/local/bin/curl* && \
    rm -rf /tmp/curl-imp /var/lib/apt/lists/*

# Salin konfigurasi dependency monorepo untuk optimasi Docker layer caching
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/scrapper/package.json ./apps/scrapper/
COPY packages/db/package.json ./packages/db/

# Install dependencies monorepo
RUN bun install --frozen-lockfile

# Salin source code project
COPY . .

# Environment configuration
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start command untuk backend API
CMD ["bun", "run", "start:api"]
