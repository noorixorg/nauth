FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ============================================================================
# Production Image
# ============================================================================
FROM node:22-alpine

WORKDIR /app

RUN addgroup -S express && adduser -S express -G express

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY resources/ ./resources/
COPY maxmind/ ./maxmind/

RUN chown -R express:express /app
USER express

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
