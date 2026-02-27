import PocketBase, { CollectionModel } from "pocketbase";
import { COLLECTIONS } from "../constants";

async function ensureCollection(pb: PocketBase, name: string, fields: any[]): Promise<CollectionModel | undefined> {
    try {
        const collection = await pb.collections.getOne(name);
        console.log(`✅ Collection '${name}' exists.`);
        return collection;
    } catch {
        console.log(`⏳ Creating '${name}' collection...`);
        try {
            const collection = await pb.collections.create({ name, type: "base", fields });
            console.log(`✅ Collection '${name}' created.`);
            return collection;
        } catch (err: any) {
            console.error(`❌ Failed to create collection '${name}':`, err.message);
            throw err;
        }
    }
}

export async function initCollections(pb: PocketBase) {
    try {
        await ensureCollection(pb, COLLECTIONS.DEVICES, [
            { name: "user", type: "text", required: true, presentable: true },
            { name: "description", type: "text", required: true, presentable: true },
            { name: "mac", type: "text", required: true, presentable: false }
        ]);

        await ensureCollection(pb, COLLECTIONS.DEVICE_LOGS, [
            { name: "device", type: "relation", options: { collectionId: COLLECTIONS.DEVICES, maxSelect: 1 }, required: true },
            { name: "timestamp", type: "date", required: true }
        ]);
    } catch (err) {
        // If one collection fails to create, we stop the initialization
        console.error("❌ Database initialization sequence halted due to an error.");
    }
}
