import { Surreal } from "surrealdb";
import { codaService, type Device, type People } from "../services/coda.service";
import { COLLECTIONS } from "../constants";
import { DbUser, DbDevice } from "../types/db";
import { logger } from "../utils/logger";

export async function syncDevices(db: Surreal) {
    logger.info("⏳ Syncing users and devices from Coda to SurrealDB...");

    const userMap = await syncUsers(db);
    if (!userMap) return;

    await syncDevicesInternal(db, userMap);
}

async function syncUsers(db: Surreal): Promise<Map<string, string> | null> {
    let codaPeople: People[];
    try {
        codaPeople = await codaService.getPeople();
    } catch (err: any) {
        logger.error("❌ Failed to get people from Coda:", err);
        return null;
    }

    const userMap = new Map<string, string>(); // name -> record id

    try {
        const results = await db.query<[DbUser[]]>(`SELECT id, name, robinId FROM ${COLLECTIONS.USERS}`);
        const dbUsers = results[0];
        const dbUsersMap = new Map(dbUsers.map(u => [u.name, u]));

        for (const person of codaPeople) {
            const existingUser = dbUsersMap.get(person.name);
            if (!existingUser) {
                logger.info(`➕ Adding new user: ${person.name}`);
                const [newUser] = await db.query<[any]>(`CREATE ${COLLECTIONS.USERS} CONTENT $data`, {
                    data: { name: person.name, robinId: person.robinId }
                });
                userMap.set(person.name, newUser[0].id);
            } else {
                if (existingUser.robinId !== person.robinId) {
                    logger.info(`🔄 Updating user: ${person.name}`);
                    await db.query(`UPDATE ${existingUser.id} MERGE $data`, {
                        data: { robinId: person.robinId }
                    });
                }
                userMap.set(person.name, existingUser.id);
                dbUsersMap.delete(person.name);
            }
        }
        for (const [name, record] of dbUsersMap.entries()) {
            logger.info(`🗑️ Deleting user: ${record.name} (${record.robinId})`);
            await db.query(`DELETE ${record.id}`);
        }
        return userMap;
    } catch (err: any) {
        logger.error("❌ Failed to sync users:", err);
        return null;
    }
}

async function syncDevicesInternal(db: Surreal, userMap: Map<string, string>) {
    let codaDevices: Device[];
    try {
        codaDevices = await codaService.getDevices();
    } catch (err: any) {
        logger.error("❌ Failed to get devices from Coda:", err);
        return;
    }

    try {
        const results = await db.query<[DbDevice[]]>(`SELECT id, user, description, mac, ignored FROM ${COLLECTIONS.DEVICES}`);
        const dbDevices = results[0];
        const dbDevicesMap = new Map(dbDevices.map(d => [d.mac.toLowerCase(), d]));

        for (const codaDevice of codaDevices) {
            const mac = codaDevice.mac.toLowerCase();
            const existingDevice = dbDevicesMap.get(mac);
            const userRecordId = userMap.get(codaDevice.user);

            if (!userRecordId) {
                logger.warn(`⚠️ User ${codaDevice.user} not found for device ${codaDevice.mac}, skipping device sync.`);
                continue;
            }

            if (existingDevice && existingDevice.ignored) {
                logger.info(`⏩ Skipping update for ignored device: ${codaDevice.user}->${codaDevice.description} (${codaDevice.mac})`);
                dbDevicesMap.delete(mac);
                continue;
            }

            const deviceData = {
                user: userRecordId,
                description: codaDevice.description,
                mac: codaDevice.mac,
                ignored: false
            };

            if (!existingDevice) {
                logger.info(`➕ Adding new device: ${codaDevice.user}->${codaDevice.description} (${codaDevice.mac})`);
                await db.query(`CREATE ${COLLECTIONS.DEVICES} CONTENT $data`, {
                    data: deviceData
                });
            } else {
                if (existingDevice.user !== userRecordId || existingDevice.description !== codaDevice.description || existingDevice.mac !== codaDevice.mac) {
                    logger.info(`🔄 Updating device: ${codaDevice.user}->${codaDevice.description} (${codaDevice.mac})`);
                    await db.query(`UPDATE ${existingDevice.id} MERGE $data`, {
                        data: deviceData
                    });
                }
                dbDevicesMap.delete(mac);
            }
        }

        for (const [mac, record] of dbDevicesMap.entries()) {
            if (record.ignored) {
                logger.info(`⏩ Skipping deletion of ignored device: ${record.description} (${record.mac})`);
                continue;
            }
            logger.info(`🗑️ Deleting device: ${record.description} (${record.mac})`);
            await db.query(`DELETE ${record.id}`);
        }

        logger.info("✅ Sync complete.");
    } catch (err: any) {
        logger.error("❌ Failed to sync devices:", err);
    }
}
