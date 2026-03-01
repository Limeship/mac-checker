import { Surreal } from "surrealdb";
import { getDevicesFromCoda, getPeopleFromCoda, type Device, type People } from "../coda/getDevicesFromCoda";
import { COLLECTIONS } from "../constants";

export async function syncDevices(db: Surreal) {
    console.log("⏳ Syncing devices from Coda to SurrealDB...");
    let codaDevices: Device[];
    try {
        codaDevices = await getDevicesFromCoda();
    } catch (err: any) {
        console.error("❌ Failed to get devices from Coda:", err.message);
        return;
    }
    let codePeople: People[];
    try {
        codePeople = await getPeopleFromCoda();
    } catch (err: any) {
        console.error("❌ Failed to get people from Coda:", err.message);
        return;
    }
    try {
        // Fetch existing devices from SurrealDB
        const results = await db.query<[Device[]]>(`SELECT * FROM ${COLLECTIONS.DEVICES}`);
        const dbDevices = results[0];
        const dbDevicesMap = new Map(dbDevices.map(d => [d.mac.toLowerCase(), d]));

        // Check for inserts and updates
        for (const codaDevice of codaDevices) {
            const mac = codaDevice.mac.toLowerCase();
            const person = codePeople.find(p => p.name === codaDevice.user);
            const existingRecord: any = dbDevicesMap.get(mac);

            if (!existingRecord) {
                console.log(`➕ Adding new device to SurrealDB: ${codaDevice.user} (${codaDevice.mac})`);
                await db.query(`CREATE ${COLLECTIONS.DEVICES} CONTENT $data`, {
                    data: codaDevice
                });
            } else {
                if (existingRecord.user !== codaDevice.user || existingRecord.description !== codaDevice.description || existingRecord.mac !== codaDevice.mac || existingRecord.robinId !== person?.robinId) {
                    console.log(`🔄 Updating device in SurrealDB: ${codaDevice.user} (${codaDevice.mac})`);
                    await db.query(`UPDATE ${existingRecord.id} MERGE $data`, {
                        data: { ...codaDevice, robinId: person?.robinId }
                    });
                }
                dbDevicesMap.delete(mac); // Remove from map so we know what's left
            }
        }

        // Delete records no longer in Coda (the ones remaining in the map)
        for (const [mac, record] of dbDevicesMap.entries()) {
            const r = record as any;
            console.log(`🗑️ Deleting device from SurrealDB (not in Coda): ${r.user} (${r.mac})`);
            await db.query(`DELETE ${r.id}`);
        }
        console.log("✅ Device sync complete.");

    } catch (err: any) {
        console.error("❌ Failed to sync devices with SurrealDB:", err.message);
    }
}



function mapPeopleToDevices(people: People[], devices: Device[]) {
    const result: Device[] = [];
    for (const person of people) {
        const device = devices.find(d => d.user === person.name);
        if (device) {
            result.push({
                user: person.name,
                description: device.description,
                mac: device.mac
            });
        }
    }
    return result;
}