import PocketBase from "pocketbase";
import { COLLECTIONS } from "../constants";
import { initCollections } from "./initDb";
import { CONFIG } from "../config";

export async function resetDb() {
    const pb = new PocketBase(CONFIG.PB_URL);

    console.log(`🚀 Connecting to PocketBase at ${CONFIG.PB_URL}`);
    try {
        await pb.admins.authWithPassword(CONFIG.PB_ADMIN_EMAIL, CONFIG.PB_ADMIN_PASSWORD);
        console.log("✅ Authenticated as admin.");
    } catch (e: any) {
        console.error("❌ Failed to authenticate with PocketBase:", e.message);
        console.error("Make sure PocketBase is running and the admin account exists.");
        process.exit(1);
    }

    // Delete device logs first (since it depends on devices via the relation)
    try {
        const logsCollection = await pb.collections.getOne(COLLECTIONS.DEVICE_LOGS);
        console.log(`⏳ Deleting collection '${COLLECTIONS.DEVICE_LOGS}'...`);
        await pb.collections.delete(logsCollection.id);
        console.log(`✅ Collection '${COLLECTIONS.DEVICE_LOGS}' deleted.`);
    } catch (e) {
        console.log(`ℹ️ Collection '${COLLECTIONS.DEVICE_LOGS}' does not exist or already deleted.`);
    }

    // Delete devices
    try {
        const devicesCollection = await pb.collections.getOne(COLLECTIONS.DEVICES);
        console.log(`⏳ Deleting collection '${COLLECTIONS.DEVICES}'...`);
        await pb.collections.delete(devicesCollection.id);
        console.log(`✅ Collection '${COLLECTIONS.DEVICES}' deleted.`);
    } catch (e) {
        console.log(`ℹ️ Collection '${COLLECTIONS.DEVICES}' does not exist or already deleted.`);
    }

    console.log("⏳ Re-initializing collections...");
    await initCollections(pb);
    console.log("✅ Database reset complete!");
}

if (require.main === module) {
    resetDb().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
