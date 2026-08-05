# Build stage
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Serve stage — minimal Bun static server with /api proxy
FROM oven/bun:1-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.ts ./
EXPOSE 8080
CMD ["bun", "server.ts"]
