import PocketBase from "pocketbase";
import { getDevicesFromCoda, type Device } from "../coda/getDevicesFromCoda";
import { COLLECTIONS } from "../constants";

export async function syncDevicesToPb(pb: PocketBase) {
    console.log("⏳ Syncing devices from Coda to PocketBase...");
    let codaDevices: Device[];
    try {
        codaDevices = await getDevicesFromCoda();
    } catch (err: any) {
        console.error("❌ Failed to get devices from Coda:", err.message);
        return;
    }

    try {
        const pbDevicesResult = await pb.collection(COLLECTIONS.DEVICES).getFullList();
        const pbDevicesMap = new Map(pbDevicesResult.map(d => [d.mac.toLowerCase(), d]));

        // Check for inserts and updates
        for (const codaDevice of codaDevices) {
            const mac = codaDevice.mac.toLowerCase();
            const existingRecord = pbDevicesMap.get(mac);

            if (!existingRecord) {
                console.log(`➕ Adding new device to PB: ${codaDevice.user} (${codaDevice.mac})`);
                await pb.collection(COLLECTIONS.DEVICES).create(codaDevice);
            } else {
                if (existingRecord.user !== codaDevice.user || existingRecord.description !== codaDevice.description) {
                    console.log(`🔄 Updating device in PB: ${codaDevice.user} (${codaDevice.mac})`);
                    await pb.collection(COLLECTIONS.DEVICES).update(existingRecord.id, {
                        ...codaDevice
                    });
                }
                pbDevicesMap.delete(mac); // Remove from map so we know what's left
            }
        }

        // Delete records no longer in Coda (the ones remaining in the map)
        for (const [mac, record] of pbDevicesMap.entries()) {
            console.log(`🗑️ Deleting device from PB (not in Coda): ${record.user} (${record.mac})`);
            await pb.collection(COLLECTIONS.DEVICES).delete(record.id);
        }
        console.log("✅ Device sync complete.");

    } catch (err: any) {
        console.error("❌ Failed to sync devices with PocketBase:", err.message);
    }
}
