# Build stage
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json bun.lock .npmrc ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Serve stage — minimal Bun static server with /api proxy
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.ts ./
EXPOSE 8080
CMD ["bun", "server.ts"]
