import fs from "fs";
import readline from "readline";
import { Surreal } from "surrealdb";
import { database } from "./database";
import { COLLECTIONS } from "../constants";
import { CONFIG } from "../config";
import { DbDevice } from "../types/db";

const NEDB_FILE = "/data/devices.db";

export async function migrateDb() {
    console.log(`🚀 Starting migration...`);
    try {
        await database.connect();
        const db = database.getInstance();
        console.log("✅ Connected to SurrealDB.");

        if (!fs.existsSync(NEDB_FILE)) {
            const LOCAL_NEDB_FILE = "./data/devices.db";
            if (fs.existsSync(LOCAL_NEDB_FILE)) {
                console.log(`Found local db at ${LOCAL_NEDB_FILE}`);
                await processLines(LOCAL_NEDB_FILE, db);
            } else {
                console.log(`ℹ️ No NeDB file found at ${NEDB_FILE} or ${LOCAL_NEDB_FILE}. Skipping migration.`);
                return;
            }
        } else {
            await processLines(NEDB_FILE, db);
        }
    } catch (e: any) {
        console.error("❌ Migration failed:", e.message);
        process.exit(1);
    }
}

async function processLines(filePath: string, db: Surreal) {
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
            console.log(record);
            let timestamp: Date | string = record.timestamp;
            if (timestamp && typeof timestamp === "object" && "$$date" in (timestamp as any)) {
                timestamp = new Date((timestamp as any).$$date);
            } else if (timestamp) {
                timestamp = new Date(timestamp as string | number);
            }


            // Find the referenced device
            const results = await db.query<[DbDevice[]]>(
                `SELECT id, user, description, mac FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
                { mac: record.mac }
            );
            const dbDevice = results[0][0];

            if (!dbDevice) {
                console.warn(`⚠️ Skipping log entry - device with mac ${record.mac} not found in DB.`);
                continue;
            }

            // Create record in SurrealDB
            await db.query(`CREATE ${COLLECTIONS.DEVICE_LOGS} CONTENT $data`, {
                data: {
                    device: dbDevice.id,
                    timestamp: timestamp instanceof Date ? timestamp : undefined
                }
            });

            count++;
            if (count % 100 === 0) {
                console.log(`... migrated ${count} records`);
            }
        } catch (e: any) {
            console.error(`❌ Error migrating line: ${line}`, e.message);
        }
    }

    console.log(`✅ Migration complete. ${count} records imported.`);
    await db.close();
}

if (require.main === module) {
    migrateDb().then(() => process.exit(0)).catch(e => {
        console.error(e);
        process.exit(1);
    });
}
