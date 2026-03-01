import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";

export async function initCollections(db: Surreal) {
    console.log("⏳ Initializing SurrealDB tables...");
    try {
        await db.query(`
            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.DEVICES} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS user ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE FIELD IF NOT EXISTS description ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE FIELD IF NOT EXISTS mac ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE FIELD IF NOT EXISTS robinId ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE INDEX IF NOT EXISTS mac_idx ON TABLE ${COLLECTIONS.DEVICES} COLUMNS mac UNIQUE;

            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.DEVICE_LOGS} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS device ON TABLE ${COLLECTIONS.DEVICE_LOGS} TYPE record<${COLLECTIONS.DEVICES}>;
            DEFINE FIELD IF NOT EXISTS timestamp ON TABLE ${COLLECTIONS.DEVICE_LOGS} TYPE datetime;
        `);
        console.log("✅ SurrealDB tables initialized.");
    } catch (err: any) {
        console.error("❌ Failed to initialize SurrealDB tables:", err.message);
        throw err;
    }
}
