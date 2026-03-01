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
ENV SurrealUrl=ws://surrealdb:8000/rpc
ENV SurrealUser=root
ENV SurrealPass=root
ENV SurrealNS=mac_checker
ENV SurrealDB=mac_checker

ENV RouterIp=192.168.1.1
ENV RouterPort=8443
ENV RouterUser=admin
ENV RouterPassword=password

ENV CodaApiToken=your_token_here
ENV CodaDocumentId=your_doc_id
ENV CodaDevicesTableId=your_table_id
ENV CodaPeopleTableId=your_res_doc_id

# Command to run the app
CMD ["node", "dist/index.js"]
