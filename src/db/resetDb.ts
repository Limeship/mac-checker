import { Surreal } from "surrealdb";
import { database } from "./database";
import { COLLECTIONS } from "../constants";
import { initCollections } from "./initDb";

export async function resetDb() {
    console.log(`🚀 Starting database reset...`);
    let db: Surreal;
    try {
        await database.connect();
        db = database.getInstance();
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
