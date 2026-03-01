import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";
import { initCollections } from "./initDb";
import { CONFIG } from "../config";

export async function resetDb() {
    const db = new Surreal();

    console.log(`🚀 Connecting to SurrealDB at ${CONFIG.SURREAL_URL}`);
    try {
        await db.connect(CONFIG.SURREAL_URL);
        await db.signin({
            username: CONFIG.SURREAL_USER,
            password: CONFIG.SURREAL_PASS,
        });
        await db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
        console.log("✅ Authenticated.");
    } catch (e: any) {
        console.error("❌ Failed to authenticate with SurrealDB:", e.message);
        process.exit(1);
    }

    try {
        console.log(`⏳ Removing table '${COLLECTIONS.DEVICE_LOGS}'...`);
        await db.query(`REMOVE TABLE ${COLLECTIONS.DEVICE_LOGS}`);
        console.log(`✅ Table '${COLLECTIONS.DEVICE_LOGS}' removed.`);
    } catch (e) {
        console.log(`ℹ️ Table '${COLLECTIONS.DEVICE_LOGS}' does not exist or already removed.`);
    }

    try {
        console.log(`⏳ Removing table '${COLLECTIONS.DEVICES}'...`);
        await db.query(`REMOVE TABLE ${COLLECTIONS.DEVICES}`);
        console.log(`✅ Table '${COLLECTIONS.DEVICES}' removed.`);
    } catch (e) {
        console.log(`ℹ️ Table '${COLLECTIONS.DEVICES}' does not exist or already removed.`);
    }

    console.log("⏳ Re-initializing tables...");
    await initCollections(db);
    console.log("✅ Database reset complete!");
    await db.close();
}

if (require.main === module) {
    resetDb().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
