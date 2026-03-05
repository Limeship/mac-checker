import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";
import { logger } from "../utils/logger";

export async function initCollections(db: Surreal) {
    logger.info("⏳ Initializing SurrealDB tables...");
    try {
        await db.query(`
            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.USERS} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS name ON TABLE ${COLLECTIONS.USERS} TYPE string;
            DEFINE FIELD IF NOT EXISTS robinId ON TABLE ${COLLECTIONS.USERS} TYPE string;
            DEFINE INDEX IF NOT EXISTS name_idx ON TABLE ${COLLECTIONS.USERS} COLUMNS name UNIQUE;

            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.DEVICES} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS user ON TABLE ${COLLECTIONS.DEVICES} TYPE record<${COLLECTIONS.USERS}>;
            DEFINE FIELD IF NOT EXISTS description ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE FIELD IF NOT EXISTS mac ON TABLE ${COLLECTIONS.DEVICES} TYPE string;
            DEFINE FIELD IF NOT EXISTS ignored ON TABLE ${COLLECTIONS.DEVICES} TYPE bool;
            DEFINE INDEX IF NOT EXISTS mac_idx ON TABLE ${COLLECTIONS.DEVICES} COLUMNS mac UNIQUE;

            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.DEVICE_LOGS} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS device ON TABLE ${COLLECTIONS.DEVICE_LOGS} TYPE record<${COLLECTIONS.DEVICES}>;
            DEFINE FIELD IF NOT EXISTS timestamp ON TABLE ${COLLECTIONS.DEVICE_LOGS} TYPE datetime;

            DEFINE TABLE IF NOT EXISTS ${COLLECTIONS.ROBIN_LOGS} SCHEMALESS;
            DEFINE FIELD IF NOT EXISTS user ON TABLE ${COLLECTIONS.ROBIN_LOGS} TYPE record<${COLLECTIONS.USERS}>;
            DEFINE FIELD IF NOT EXISTS start ON TABLE ${COLLECTIONS.ROBIN_LOGS} TYPE datetime;
            DEFINE FIELD IF NOT EXISTS end ON TABLE ${COLLECTIONS.ROBIN_LOGS} TYPE datetime;
        `);
        logger.info("✅ SurrealDB tables initialized.");
    } catch (err: any) {
        logger.error("❌ Failed to initialize SurrealDB tables:", err);
        throw err;
    }
}
