# Build stage
FROM oven/bun:latest AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Serve stage — minimal Bun static server with /api proxy
FROM oven/bun:latest
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.ts ./
EXPOSE 8080
CMD ["bun", "server.ts"]
