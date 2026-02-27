import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
    // PocketBase Configuration
    PB_URL: process.env.PB_URL || "http://localhost:8090",
    PB_ADMIN_EMAIL: process.env.PB_ADMIN_EMAIL || "admin@example.com",
    PB_ADMIN_PASSWORD: process.env.PB_ADMIN_PASSWORD || "change_me_12345",

    // Coda Configuration
    CODA_API_KEY: process.env.CODA_API_KEY || "",
    CODA_DOC_ID: process.env.CODA_DOC_ID || "",
    CODA_TABLE_ID: process.env.CODA_TABLE_ID || "",
    CODA_UPLOADS_TABLE_ID: process.env.CODA_UPLOADS_TABLE_ID || "",

    // UniFi Configuration
    UNIFI_HOST: process.env.UNIFI_HOST || "192.168.1.1",
    UNIFI_USERNAME: process.env.UNIFI_USERNAME || "admin",
    UNIFI_PASSWORD: process.env.UNIFI_PASSWORD || "password",
    UNIFI_PORT: parseInt(process.env.UNIFI_PORT || "8443", 10),
    UNIFI_SITE: process.env.UNIFI_SITE || "default",
} as const;
