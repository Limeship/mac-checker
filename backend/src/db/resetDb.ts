import { Surreal } from "surrealdb";
import { database } from "./database";
import { COLLECTIONS } from "../constants";
import { initCollections } from "./initDb";
import { logger } from "../utils/logger";

export async function resetDb() {
    logger.info("🚀 Starting database reset...");
    let db: Surreal;
    try {
        await database.connect();
        db = database.getInstance();
        logger.info("✅ Authenticated.");
    } catch (e: any) {
        logger.error("❌ Failed to authenticate with SurrealDB:", e);
        process.exit(1);
    }

    try {
        logger.info(`⏳ Removing table '${COLLECTIONS.DEVICE_LOGS}'...`);
        await db.query(`REMOVE TABLE ${COLLECTIONS.DEVICE_LOGS}`);
        logger.info(`✅ Table '${COLLECTIONS.DEVICE_LOGS}' removed.`);
    } catch (e) {
        logger.info(`ℹ️ Table '${COLLECTIONS.DEVICE_LOGS}' does not exist or already removed.`);
    }

    try {
        logger.info(`⏳ Removing table '${COLLECTIONS.DEVICES}'...`);
        await db.query(`REMOVE TABLE ${COLLECTIONS.DEVICES}`);
        logger.info(`✅ Table '${COLLECTIONS.DEVICES}' removed.`);
    } catch (e) {
        logger.info(`ℹ️ Table '${COLLECTIONS.DEVICES}' does not exist or already removed.`);
    }

    logger.info("⏳ Re-initializing tables...");
    await initCollections(db);
    logger.info("✅ Database reset complete!");
    await database.close();
}

if (require.main === module) {
    resetDb().then(() => process.exit(0)).catch(e => {
        logger.error("Fatal error during reset:", e);
        process.exit(1);
    });
}
