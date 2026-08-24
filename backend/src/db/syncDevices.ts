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

    try {
        const results = await db.query<[DbUser[]]>(`SELECT id, name, robinId FROM ${COLLECTIONS.USERS}`);
        const dbUsers = results[0];
        const dbByName = new Map(dbUsers.map(u => [u.name, u]));
        const codaByName = new Map(codaPeople.map(p => [p.name, p]));

        const toCreate = codaPeople.filter(p => !dbByName.has(p.name));
        const toUpdate = codaPeople.filter(p => {
            const ex = dbByName.get(p.name);
            return ex && ex.robinId !== p.robinId;
        });
        const toDelete = dbUsers.filter(u => !codaByName.has(u.name));

        if (toCreate.length) {
            logger.info(`➕ Creating ${toCreate.length} new user(s): ${toCreate.map(p => p.name).join(', ')}`);
            const created = await db.query<[any[]]>(
                `INSERT INTO ${COLLECTIONS.USERS} $data`,
                { data: toCreate.map(p => ({ name: p.name, robinId: p.robinId })) }
            );
            // Add newly created users to the lookup map
            for (const u of (created[0] ?? [])) {
                dbByName.set(u.name, u);
            }
        }

        for (const p of toUpdate) {
            const ex = dbByName.get(p.name)!;
            logger.info(`🔄 Updating user: ${p.name}`);
            await db.query(`UPDATE ${ex.id} MERGE $data`, { data: { robinId: p.robinId } });
        }

        if (toDelete.length) {
            logger.info(`🗑️ Deleting ${toDelete.length} removed user(s): ${toDelete.map(u => u.name).join(', ')}`);
            const ids = toDelete.map(u => u.id);
            await db.query(`DELETE ${COLLECTIONS.USERS} WHERE id IN $ids`, { ids });
        }

        // Build name → record id map for device sync
        const userMap = new Map<string, string>();
        for (const p of codaPeople) {
            const record = dbByName.get(p.name);
            if (record) userMap.set(p.name, record.id);
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
        const dbByMac = new Map(dbDevices.map(d => [d.mac.toLowerCase(), d]));

        const toCreate: typeof codaDevices = [];
        const toUpdate: Array<{ id: string; data: object }> = [];

        for (const codaDevice of codaDevices) {
            const mac = codaDevice.mac.toLowerCase();
            const existing = dbByMac.get(mac);
            const userRecordId = userMap.get(codaDevice.user);

            if (!userRecordId) {
                logger.warn(`⚠️ User ${codaDevice.user} not found for device ${codaDevice.mac}, skipping.`);
                dbByMac.delete(mac);
                continue;
            }

            if (existing?.ignored) {
                logger.info(`⏩ Skipping ignored device: ${codaDevice.user}->${codaDevice.description} (${codaDevice.mac})`);
                dbByMac.delete(mac);
                continue;
            }

            const data = { user: userRecordId, description: codaDevice.description, mac: codaDevice.mac, ignored: false };

            if (!existing) {
                toCreate.push(codaDevice);
            } else {
                const changed = existing.user !== userRecordId || existing.description !== codaDevice.description || existing.mac !== codaDevice.mac;
                if (changed) toUpdate.push({ id: existing.id, data });
                dbByMac.delete(mac);
            }
        }

        // Remaining entries in dbByMac were not in Coda — delete non-ignored ones
        const toDelete = [...dbByMac.values()].filter(d => !d.ignored);

        if (toCreate.length) {
            logger.info(`➕ Creating ${toCreate.length} new device(s)`);
            await db.query(
                `INSERT INTO ${COLLECTIONS.DEVICES} $data`,
                {
                    data: toCreate.map(d => ({
                        user: userMap.get(d.user),
                        description: d.description,
                        mac: d.mac,
                        ignored: false,
                    }))
                }
            );
        }

        // Updates still need to be individual (each has a different id + different fields)
        for (const { id, data } of toUpdate) {
            logger.info(`🔄 Updating device: ${id}`);
            await db.query(`UPDATE ${id} MERGE $data`, { data });
        }

        if (toDelete.length) {
            logger.info(`🗑️ Deleting ${toDelete.length} removed device(s)`);
            const ids = toDelete.map(d => d.id);
            await db.query(`DELETE ${COLLECTIONS.DEVICES} WHERE id IN $ids`, { ids });
        }

        logger.info("✅ Sync complete.");
    } catch (err: any) {
        logger.error("❌ Failed to sync devices:", err);
    }
}
