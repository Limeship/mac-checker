import fs from "fs";
import { Surreal } from "surrealdb";
import { database } from "./database";
import { COLLECTIONS } from "../constants";
import { CONFIG } from "../config";
import { DbDevice } from "../types/db";
import { logger } from "../utils/logger";

const NEDB_FILE = "/data/devices.db";

export async function migrateDb() {
    logger.info("🚀 Starting migration...");
    try {
        await database.connect();
        const db = database.getInstance();
        logger.info("✅ Connected to SurrealDB.");

        if (!fs.existsSync(NEDB_FILE)) {
            const LOCAL_NEDB_FILE = "./data/devices.db";
            if (fs.existsSync(LOCAL_NEDB_FILE)) {
                logger.info(`Found local db at ${LOCAL_NEDB_FILE}`);
                await processLines(LOCAL_NEDB_FILE, db);
            } else {
                logger.info(`ℹ️ No NeDB file found at ${NEDB_FILE} or ${LOCAL_NEDB_FILE}. Skipping migration.`);
                return;
            }
        } else {
            await processLines(NEDB_FILE, db);
        }
    } catch (e: any) {
        logger.error("❌ Migration failed:", e);
        process.exit(1);
    }
}

async function processLines(filePath: string, db: Surreal) {
    logger.info(`⏳ Starting migration from ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    let count = 0;
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const record = JSON.parse(line);
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
                logger.warn(`⚠️ Skipping log entry - device with mac ${record.mac} not found in DB.`);
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
                logger.info(`... migrated ${count} records`);
            }
        } catch (e: any) {
            logger.error(`❌ Error migrating line: ${line}`, e);
        }
    }

    logger.info(`✅ Migration complete. ${count} records imported.`);
    await database.close();
}

if (require.main === module) {
    migrateDb().then(() => process.exit(0)).catch(e => {
        logger.error("Fatal error during migration:", e);
        process.exit(1);
    });
}
