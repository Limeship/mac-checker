# Stage 1: Build
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json tsconfig.json ./
RUN npm install

# Copy source files
COPY src ./src

# Compile TypeScript to JavaScript
RUN npm run build

# Stage 2: Production image
FROM node:22-alpine AS production

WORKDIR /app

# Copy only necessary files from build stage
COPY package*.json ./
COPY --from=build /app/dist ./dist
RUN npm install --production

# Create volume directory
RUN mkdir -p /data
VOLUME ["/data"]

# Default env values
ENV CodaToken=token
ENV RouterIp=123
ENV RouterUser=admin    
ENV RouterPassword=password
ENV CodaDeviceDocumentId=documentId
ENV CodaDeviceTableId=tableId
ENV CodaResultDocumentId=documentId
ENV CodaResultTableId=tableId


# Command to run the app
CMD ["node", "dist/index.js"]

