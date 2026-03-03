export const CONFIG = {
    // SurrealDB Configuration
    SURREAL_URL: process.env.SurrealUrl || "ws://localhost:8080/rpc",
    SURREAL_USER: process.env.SurrealUser || "root",
    SURREAL_PASS: process.env.SurrealPass || "root",
    SURREAL_NS: process.env.SurrealNS || "mac_checker",
    SURREAL_DB: process.env.SurrealDB || "mac_checker",

    // Coda Configuration
    CODA_API_TOKEN: process.env.CodaApiToken || "",
    CODA_DOCUMENT_ID: process.env.CodaDocumentId || "",
    CODA_DEVICES_TABLE_ID: process.env.CodaDevicesTableId || "",
    CODA_PEOPLE_TABLE_ID: process.env.CodaPeopleTableId || "",

    // UniFi Configuration
    UNIFI_HOST: process.env.RouterIp || "192.168.1.1",
    UNIFI_PORT: parseInt(process.env.RouterPort || "8443", 10),
    UNIFI_API_KEY: process.env.RouterApiKey || "",

    // Robin Configuration
    ROBIN_ORGANIZATION_ID: process.env.RobinOrganizationId || "",
    ROBIN_EMAIL: process.env.RobinEmail || "",
    ROBIN_PASSWORD: process.env.RobinPassword || "",

    // API Keys
    API_KEYS: (process.env.ApiKeys || "").split(",").filter(key => key.trim() !== ""),
} as const;
