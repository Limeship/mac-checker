import fs from "fs";
import readline from "readline";
import PocketBase from "pocketbase";
import dotenv from "dotenv";
import type { DeviceLog } from "./job";

dotenv.config();

const PB_URL = process.env.PB_URL || "http://localhost:8090";
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "admin@example.com";
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "change_me_12345";
const NEDB_FILE = "/data/devices.db"; // path inside docker or adjust for local

export async function migrateDb() {
    const pb = new PocketBase(PB_URL);

    console.log(`🚀 Connecting to PocketBase at ${PB_URL}`);
    try {
        await pb.admins.authWithPassword(PB_ADMIN_EMAIL, PB_ADMIN_PASSWORD);
        console.log("✅ Authenticated as admin.");
    } catch (e: any) {
        console.error("❌ Failed to authenticate with PocketBase:", e.message);
        console.error("Make sure PocketBase is running and the admin account exists.");
        process.exit(1);
    }

    // Ensure the collection exists
    try {
        await pb.collections.getOne("device_logs");
        console.log("✅ Collection 'device_logs' exists.");
    } catch (e) {
        console.log("⏳ Creating 'device_logs' collection...");
        try {
            await pb.collections.create({
                name: "device_logs",
                type: "base",
                schema: [
                    { name: "user", type: "text", required: true },
                    { name: "description", type: "text", required: true },
                    { name: "mac", type: "text", required: true },
                    { name: "timestamp", type: "date", required: true }
                ]
            });
            console.log("✅ Collection created.");
        } catch (err: any) {
            console.error("❌ Failed to create collection:", err.message);
            process.exit(1);
        }
    }

    if (!fs.existsSync(NEDB_FILE)) {
        // also check local data path since we might run locally
        const LOCAL_NEDB_FILE = "./data/devices.db";
        if (fs.existsSync(LOCAL_NEDB_FILE)) {
            console.log(`Found local db at ${LOCAL_NEDB_FILE}`);
            return processLines(LOCAL_NEDB_FILE, pb);
        } else {
            console.log(`ℹ️ No NeDB file found at ${NEDB_FILE} or ${LOCAL_NEDB_FILE}. Skipping migration.`);
            return;
        }
    }

    await processLines(NEDB_FILE, pb);
}

async function processLines(filePath: string, pb: PocketBase) {
    console.log(`⏳ Starting migration from ${filePath}...`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let count = 0;
    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const record = JSON.parse(line);
            // NeDB schema: { user, description, mac, timestamp: { $$date: timestamp } } 
            // OR timestamp could be string depending on how it was saved.
            let timestamp: Date | string = record.timestamp;
            if (timestamp && typeof timestamp === "object" && "$$date" in (timestamp as any)) {
                timestamp = new Date((timestamp as any).$$date);
            } else if (timestamp) {
                timestamp = new Date(timestamp as string | number);
            }

            // Create record in PB
            const data = {
                user: record.user,
                description: record.description,
                mac: record.mac,
                timestamp: timestamp instanceof Date ? timestamp.toISOString() : undefined
            };

            await pb.collection("device_logs").create(data);
            count++;
            if (count % 100 === 0) {
                console.log(`... migrated ${count} records`);
            }
        } catch (e: any) {
            console.error(`❌ Error migrating line: ${line}`, e.message);
        }
    }

    console.log(`✅ Migration complete. ${count} records imported.`);
}

if (require.main === module) {
    migrateDb().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
