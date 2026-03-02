FROM oven/bun:1-alpine

WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source files
COPY src ./src

# Expose Hono server port
EXPOSE 3000

# Default env values
ENV SurrealUrl=ws://surrealdb:8000/rpc
ENV SurrealUser=root
ENV SurrealPass=root
ENV SurrealNS=mac_checker
ENV SurrealDB=mac_checker

ENV CodaApiToken=your_token_here
ENV CodaDocumentId=your_doc_id
ENV CodaDevicesTableId=your_table_id
ENV CodaPeopleTableId=your_res_doc_id

ENV RouterIp=192.168.1.1
ENV RouterPort=8443
ENV RouterUser=admin
ENV RouterPassword=password

ENV RobinOrganizationId=your_org_id
ENV RobinEmail=your_email
ENV RobinPassword=your_password

ENV ApiKeys=sample_key_1,sample_key_2

# Command to run the app
CMD ["bun", "src/index.ts"]
