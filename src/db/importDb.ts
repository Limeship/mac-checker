import fs from "fs";
import readline from "readline";
import { Surreal } from "surrealdb";
import { COLLECTIONS } from "../constants";
import { CONFIG } from "../config";

const NEDB_FILE = "/data/devices.db";

export async function migrateDb() {
    const db = new Surreal();

    console.log(`🚀 Connecting to SurrealDB at ${CONFIG.SURREAL_URL}`);
    try {
        await db.connect(CONFIG.SURREAL_URL);
        await db.signin({
            username: CONFIG.SURREAL_USER,
            password: CONFIG.SURREAL_PASS,
        });
        await db.use({ namespace: CONFIG.SURREAL_NS, database: CONFIG.SURREAL_DB });
        console.log("✅ Connected to SurrealDB.");
    } catch (e: any) {
        console.error("❌ Failed to connect to SurrealDB:", e.message);
        process.exit(1);
    }

    if (!fs.existsSync(NEDB_FILE)) {
        const LOCAL_NEDB_FILE = "./data/devices.db";
        if (fs.existsSync(LOCAL_NEDB_FILE)) {
            console.log(`Found local db at ${LOCAL_NEDB_FILE}`);
            return processLines(LOCAL_NEDB_FILE, db);
        } else {
            console.log(`ℹ️ No NeDB file found at ${NEDB_FILE} or ${LOCAL_NEDB_FILE}. Skipping migration.`);
            return;
        }
    }

    await processLines(NEDB_FILE, db);
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
            let timestamp: Date | string = record.timestamp;
            if (timestamp && typeof timestamp === "object" && "$$date" in (timestamp as any)) {
                timestamp = new Date((timestamp as any).$$date);
            } else if (timestamp) {
                timestamp = new Date(timestamp as string | number);
            }

            // Find the referenced device
            const results = await db.query<[any[]]>(
                `SELECT * FROM ${COLLECTIONS.DEVICES} WHERE mac = $mac`,
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
                    timestamp: timestamp instanceof Date ? timestamp.toISOString() : undefined
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
